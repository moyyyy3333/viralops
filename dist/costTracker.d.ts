import type { AgentType, CostTrackerLike, LoggerLike } from './types.js';
export declare class CostTracker implements CostTrackerLike {
    private logger;
    private agentCosts;
    private serviceCosts;
    private startTime;
    constructor(logger: LoggerLike);
    trackAgent(agentId: AgentType, tokensUsed: number, durationMs: number): void;
    trackAPICall(service: string, costMs: number): void;
    getReport(): {
        totalTokens: number;
        totalDurationMs: number;
        perAgent: Record<string, {
            tokens: number;
            durationMs: number;
            apiCalls: number;
        }>;
        perService: Record<string, number>;
    };
    getSummary(): string;
    reset(): void;
}
export default CostTracker;
//# sourceMappingURL=costTracker.d.ts.map