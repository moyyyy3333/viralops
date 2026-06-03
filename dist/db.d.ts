import type { AgentType, DBLike, LoggerLike } from './types.js';
export declare class SupabaseDB implements DBLike {
    private logger;
    private client;
    private enabled;
    constructor(logger: LoggerLike);
    insert(table: string, data: Record<string, unknown>): Promise<{
        id: string;
    }>;
    update(table: string, id: string, data: Record<string, unknown>): Promise<void>;
    select(table: string, query?: Record<string, unknown>): Promise<Record<string, unknown>[]>;
    logAgentEvent(runId: string, agentId: AgentType, level: string, message: string, meta?: Record<string, unknown>): Promise<void>;
    getRecentLogs(runId: string, limit?: number): Promise<Record<string, unknown>[]>;
}
export default SupabaseDB;
//# sourceMappingURL=db.d.ts.map