import type { PipelineRun } from './types.js';
export declare class PipelineOrchestrator {
    private eventBus;
    private costTracker;
    private db;
    private claude;
    private fileStorage;
    private circuitBreakers;
    private agents;
    private currentRun;
    constructor();
    runPipeline(options?: {
        niche?: string;
        platforms?: string[];
        dryRun?: boolean;
    }): Promise<PipelineRun>;
    private executeAgent;
    private getAgentPriority;
    getCurrentRun(): PipelineRun | null;
    getCostReport(): {
        totalTokens: number;
        totalDurationMs: number;
        perAgent: Record<string, {
            tokens: number;
            durationMs: number;
            apiCalls: number;
        }>;
        perService: Record<string, number>;
    };
    getRecentLogs(runId?: string, limit?: number): Promise<Record<string, unknown>[]>;
    private setupEventListeners;
}
export default PipelineOrchestrator;
//# sourceMappingURL=orchestrator.d.ts.map