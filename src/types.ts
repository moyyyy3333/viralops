// ────────────────────────────────────────────────
// ViralOps Agent System — Core Types
// ────────────────────────────────────────────────

export type AgentType = 'research' | 'clip' | 'edit' | 'post' | 'finance';

export type Platform = 'twitter' | 'tiktok' | 'instagram' | 'youtube' | 'all';

export type TaskStatus = 'pending' | 'running' | 'complete' | 'failed' | 'retrying';

export type PipelineStatus = 'idle' | 'running' | 'paused' | 'error' | 'complete';

export interface Task {
  id: string;
  agentId: AgentType;
  runId: string;
  priority: number;
  payload: Record<string, unknown>;
  status: TaskStatus;
  retries: number;
  maxRetries: number;
  result?: Record<string, unknown>;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  costMs: number;
  tokensUsed: number;
}

export interface PipelineRun {
  id: string;
  status: PipelineStatus;
  niche: string;
  startedAt: Date;
  completedAt?: Date;
  tasks: Task[];
  totalCostMs: number;
  totalTokens: number;
  errorMessage?: string;
  metadata: Record<string, unknown>;
}

// ── Agent Outputs ──

export interface ViralTopic {
  id: string;
  title: string;
  sourceUrl: string;
  platform: string;
  viewCount?: number;
  engagementRate?: number;
  viralScore: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  tags: string[];
  discoveredAt: Date;
}

export interface VideoSegment {
  id: string;
  sourceUrl: string;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  thumbnailPath?: string;
  videoPath?: string;
  transcript?: string;
  viralMoments: string[];
  confidence: number;
}

export interface EditedVideo {
  id: string;
  segmentId: string;
  platform: Platform;
  videoPath: string;
  thumbnailPath: string;
  duration: number;
  fileSize: number;
  captionsBurned: boolean;
  hookText: string;
  hashtags: string[];
  aspectRatio: string;
}

export interface PostResult {
  id: string;
  platform: Platform;
  postUrl?: string;
  videoPath: string;
  caption: string;
  status: 'published' | 'failed' | 'scheduled';
  metrics?: {
    views?: number;
    likes?: number;
    shares?: number;
  };
  publishedAt?: Date;
  error?: string;
}

export interface FinancialReport {
  runId: string;
  totalRevenue: number;
  platformBreakdown: Array<{
    platform: Platform;
    revenue: number;
    percentage: number;
  }>;
  pendingPayouts: number;
  lastPayoutDate?: Date;
  transactions: Array<{
    id: string;
    amount: number;
    platform: Platform;
    type: 'payment' | 'payout' | 'fee';
    date: Date;
  }>;
}

// ── Agent Interfaces ──

export interface AgentContext {
  runId: string;
  taskId: string;
  logger: LoggerLike;
  claude: ClaudeClientLike;
  db: DBLike;
  eventBus: EventBusLike;
  costTracker: CostTrackerLike;
}

export interface Agent {
  id: AgentType;
  name: string;
  color: string;
  execute(input: unknown, context: AgentContext): Promise<unknown>;
}

// ── Service Interfaces ──

export interface LoggerLike {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
  debug(msg: string, meta?: Record<string, unknown>): void;
  child(bindings: Record<string, unknown>): LoggerLike;
}

export interface ClaudeClientLike {
  enabled: boolean;
  complete(prompt: string, systemPrompt?: string, options?: { model?: string; maxTokens?: number }): Promise<{
    content: string;
    tokensUsed: number;
    costMs: number;
  }>;
  parseJSON<T>(prompt: string, systemPrompt?: string): Promise<{
    data: T;
    tokensUsed: number;
    costMs: number;
  }>;
}

export interface DBLike {
  insert(table: string, data: Record<string, unknown>): Promise<{ id: string }>;
  update(table: string, id: string, data: Record<string, unknown>): Promise<void>;
  select(table: string, query?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  logAgentEvent(runId: string, agentId: AgentType, level: string, message: string, meta?: Record<string, unknown>): Promise<void>;
}

export interface EventBusLike {
  emit(event: string, data: Record<string, unknown>): void;
  on(event: string, handler: (data: Record<string, unknown>) => void): void;
  off(event: string, handler: (data: Record<string, unknown>) => void): void;
}

export interface CostTrackerLike {
  trackAgent(agentId: AgentType, tokensUsed: number, durationMs: number): void;
  trackAPICall(service: string, costMs: number): void;
  getReport(): {
    totalTokens: number;
    totalDurationMs: number;
    perAgent: Record<string, { tokens: number; durationMs: number }>;
    perService: Record<string, number>;
  };
  getSummary(): string;
}
