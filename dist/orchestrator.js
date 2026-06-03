import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import logger from './logger.js';
import { AgentEventBus, Events } from './eventBus.js';
import { CostTracker } from './costTracker.js';
import { SupabaseDB } from './db.js';
import { ClaudeClient } from './claude.js';
import { withRetry, CircuitBreaker } from './utils/retry.js';
import { FileStorage } from './utils/fileStorage.js';
// Agent imports
import { ResearchAgent } from './agents/researchAgent.js';
import { ClipAgent } from './agents/clipAgent.js';
import { EditAgent } from './agents/editAgent.js';
import { PostAgent } from './agents/postAgent.js';
import { FinanceAgent } from './agents/financeAgent.js';
// ── Pipeline Orchestrator ──
export class PipelineOrchestrator {
    eventBus;
    costTracker;
    db;
    claude;
    fileStorage;
    circuitBreakers = new Map();
    agents = {
        research: new ResearchAgent(),
        clip: new ClipAgent(),
        edit: new EditAgent(),
        post: new PostAgent(),
        finance: new FinanceAgent(),
    };
    currentRun = null;
    constructor() {
        this.eventBus = new AgentEventBus(logger);
        this.costTracker = new CostTracker(logger);
        this.db = new SupabaseDB(logger);
        this.claude = new ClaudeClient(logger);
        this.fileStorage = new FileStorage(logger);
        // Circuit breakers for each agent
        for (const agentId of Object.keys(this.agents)) {
            this.circuitBreakers.set(agentId, new CircuitBreaker(agentId, 3, 60000, logger));
        }
        this.setupEventListeners();
    }
    // ── Main Pipeline Execution ──
    async runPipeline(options = {}) {
        const niche = options.niche ?? config.defaultNiche;
        const runId = uuidv4();
        const startTime = Date.now();
        logger.info('=== VIRALOPS PIPELINE STARTING ===', { runId, niche });
        this.currentRun = {
            id: runId,
            status: 'running',
            niche,
            startedAt: new Date(),
            tasks: [],
            totalCostMs: 0,
            totalTokens: 0,
            metadata: { platforms: options.platforms ?? ['all'], dryRun: options.dryRun ?? false },
        };
        this.eventBus.emit(Events.PIPELINE_START, { runId, niche, timestamp: Date.now() });
        try {
            // Save run to DB
            await this.db.insert('pipeline_runs', {
                id: runId,
                status: 'running',
                niche,
                started_at: new Date().toISOString(),
                metadata: this.currentRun.metadata,
            });
            // ── Phase 1: Research (always first) ──
            logger.info('[Phase 1/5] Research Agent — discovering viral content...');
            const topics = await this.executeAgent('research', {
                niche,
                count: 5,
                topics: config.contentTopics,
            }, runId);
            if (!topics || topics.length === 0) {
                throw new Error('Research Agent found no viral topics');
            }
            logger.info(`Found ${topics.length} viral topics`, {
                topics: topics.map((t) => t.title),
            });
            // ── Phase 2: Clip (parallel with Phase 3 prep) ──
            logger.info('[Phase 2/5] Clip Agent — downloading & extracting segments...');
            const segments = await this.executeAgent('clip', {
                topics: topics.slice(0, 3),
                maxSegments: 3,
            }, runId);
            if (!segments || segments.length === 0) {
                throw new Error('Clip Agent produced no segments');
            }
            // ── Phase 3: Edit (sequential after clip) ──
            logger.info('[Phase 3/5] Edit Agent — editing & captioning videos...');
            const editedVideos = await this.executeAgent('edit', {
                segments,
                platforms: options.platforms ?? ['tiktok', 'twitter', 'youtube'],
                style: 'viral hooks',
            }, runId);
            // ── Phase 4+5: Post + Finance (parallel) ──
            logger.info('[Phase 4+5] Post Agent + Finance Agent (parallel)...');
            const [postResults, financeReport] = await Promise.all([
                editedVideos && editedVideos.length > 0
                    ? this.executeAgent('post', {
                        videos: editedVideos,
                        dryRun: options.dryRun ?? false,
                    }, runId)
                    : Promise.resolve([]),
                this.executeAgent('finance', {
                    runId,
                    platform: 'all',
                }, runId),
            ]);
            // ── Pipeline Complete ──
            const totalDuration = Date.now() - startTime;
            this.currentRun.status = 'complete';
            this.currentRun.completedAt = new Date();
            this.currentRun.totalCostMs = totalDuration;
            await this.db.update('pipeline_runs', runId, {
                status: 'complete',
                completed_at: new Date().toISOString(),
                total_cost_ms: totalDuration,
            });
            this.eventBus.emit(Events.PIPELINE_COMPLETE, {
                runId,
                duration: totalDuration,
                topics: topics.length,
                segments: segments?.length ?? 0,
                videos: editedVideos?.length ?? 0,
                posts: postResults?.length ?? 0,
            });
            // Print cost summary
            logger.info(this.costTracker.getSummary());
            logger.info('=== PIPELINE COMPLETE ===', { runId, duration: `${(totalDuration / 1000).toFixed(1)}s` });
            return this.currentRun;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            logger.error('Pipeline failed', { error: err.message, runId });
            if (this.currentRun) {
                this.currentRun.status = 'error';
                this.currentRun.errorMessage = err.message;
                this.currentRun.completedAt = new Date();
            }
            await this.db.update('pipeline_runs', runId, {
                status: 'error',
                error_message: err.message,
                completed_at: new Date().toISOString(),
            });
            this.eventBus.emit(Events.PIPELINE_ERROR, { runId, error: err.message });
            throw err;
        }
    }
    // ── Agent Execution ──
    async executeAgent(agentId, input, runId) {
        const taskId = uuidv4();
        const startTime = Date.now();
        const task = {
            id: taskId,
            agentId,
            runId,
            priority: this.getAgentPriority(agentId),
            payload: input,
            status: 'running',
            retries: 0,
            maxRetries: config.defaultRetryCount,
            costMs: 0,
            tokensUsed: 0,
            createdAt: new Date(),
            startedAt: new Date(),
        };
        this.currentRun?.tasks.push(task);
        this.eventBus.emit(Events.AGENT_START(agentId), { taskId, runId, agentId });
        const agentLogger = logger.child({ agent: agentId, taskId, runId });
        const context = {
            runId,
            taskId,
            logger: agentLogger,
            claude: this.claude,
            db: this.db,
            eventBus: this.eventBus,
            costTracker: this.costTracker,
        };
        const circuitBreaker = this.circuitBreakers.get(agentId);
        try {
            const result = await withRetry(() => circuitBreaker.execute(() => this.agents[agentId].execute(input, context)), { maxRetries: config.defaultRetryCount }, agentLogger);
            const duration = Date.now() - startTime;
            task.status = 'complete';
            task.completedAt = new Date();
            task.costMs = duration;
            task.result = result;
            await this.db.update('tasks', taskId, {
                status: 'complete',
                completed_at: new Date().toISOString(),
                cost_ms: duration,
                result: task.result,
            });
            this.eventBus.emit(Events.AGENT_COMPLETE(agentId), { taskId, runId, agentId, duration });
            agentLogger.info(`✓ ${agentId} agent completed in ${(duration / 1000).toFixed(1)}s`);
            return result;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            task.status = 'failed';
            task.error = err.message;
            task.completedAt = new Date();
            await this.db.update('tasks', taskId, {
                status: 'failed',
                error: err.message,
                completed_at: new Date().toISOString(),
            });
            this.eventBus.emit(Events.AGENT_ERROR(agentId), { taskId, runId, agentId, error: err.message });
            agentLogger.error(`✗ ${agentId} agent failed: ${err.message}`);
            throw error;
        }
    }
    getAgentPriority(agentId) {
        const priorities = {
            research: 1,
            clip: 2,
            edit: 3,
            post: 4,
            finance: 5,
        };
        return priorities[agentId];
    }
    // ── Status & Monitoring ──
    getCurrentRun() {
        return this.currentRun;
    }
    getCostReport() {
        return this.costTracker.getReport();
    }
    async getRecentLogs(runId, limit = 50) {
        if (runId) {
            return this.db.getRecentLogs(runId, limit);
        }
        return [];
    }
    // ── Event Listeners ──
    setupEventListeners() {
        this.eventBus.on(Events.PIPELINE_START, (data) => {
            logger.info(`Pipeline started: ${data.runId}`, data);
        });
        this.eventBus.on(Events.PIPELINE_COMPLETE, (data) => {
            logger.info(`Pipeline complete: ${data.runId}`, data);
        });
        for (const agentId of Object.keys(this.agents)) {
            this.eventBus.on(Events.AGENT_PROGRESS(agentId), (data) => {
                logger.debug(`[${agentId}] ${data.message}`, data);
            });
        }
    }
}
export default PipelineOrchestrator;
//# sourceMappingURL=orchestrator.js.map