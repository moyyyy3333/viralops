export class CostTracker {
    logger;
    agentCosts = new Map();
    serviceCosts = new Map();
    startTime = Date.now();
    constructor(logger) {
        this.logger = logger;
    }
    trackAgent(agentId, tokensUsed, durationMs) {
        const existing = this.agentCosts.get(agentId) ?? { tokens: 0, durationMs: 0, apiCalls: 0 };
        this.agentCosts.set(agentId, {
            tokens: existing.tokens + tokensUsed,
            durationMs: existing.durationMs + durationMs,
            apiCalls: existing.apiCalls + 1,
        });
        this.logger.debug(`Cost tracked: ${agentId}`, { tokensUsed, durationMs });
    }
    trackAPICall(service, costMs) {
        const existing = this.serviceCosts.get(service) ?? 0;
        this.serviceCosts.set(service, existing + costMs);
    }
    getReport() {
        const perAgent = {};
        for (const [id, cost] of this.agentCosts) {
            perAgent[id] = { ...cost };
        }
        const perService = {};
        for (const [svc, cost] of this.serviceCosts) {
            perService[svc] = cost;
        }
        const totalTokens = Array.from(this.agentCosts.values()).reduce((s, c) => s + c.tokens, 0);
        const totalDurationMs = Array.from(this.agentCosts.values()).reduce((s, c) => s + c.durationMs, 0);
        return { totalTokens, totalDurationMs, perAgent, perService };
    }
    getSummary() {
        const report = this.getReport();
        const totalSeconds = (Date.now() - this.startTime) / 1000;
        const lines = [
            '=== Cost Report ===',
            `Total time: ${totalSeconds.toFixed(1)}s`,
            `Total Claude tokens: ${report.totalTokens.toLocaleString()}`,
            `Agent compute time: ${(report.totalDurationMs / 1000).toFixed(1)}s`,
            '',
            'Per-Agent Breakdown:',
        ];
        for (const [id, cost] of Object.entries(report.perAgent)) {
            lines.push(`  ${id}: ${cost.tokens.toLocaleString()} tokens | ${(cost.durationMs / 1000).toFixed(1)}s | ${cost.apiCalls} calls`);
        }
        lines.push('');
        lines.push('External Services:');
        for (const [svc, ms] of Object.entries(report.perService)) {
            lines.push(`  ${svc}: ${(ms / 1000).toFixed(1)}s`);
        }
        return lines.join('\n');
    }
    reset() {
        this.agentCosts.clear();
        this.serviceCosts.clear();
        this.startTime = Date.now();
    }
}
export default CostTracker;
//# sourceMappingURL=costTracker.js.map