import type { AgentType, CostTrackerLike, LoggerLike } from './types.js';

interface AgentCost {
  tokens: number;
  durationMs: number;
  apiCalls: number;
}

export class CostTracker implements CostTrackerLike {
  private agentCosts: Map<string, AgentCost> = new Map();
  private serviceCosts: Map<string, number> = new Map();
  private startTime = Date.now();

  constructor(private logger: LoggerLike) {}

  trackAgent(agentId: AgentType, tokensUsed: number, durationMs: number): void {
    const existing = this.agentCosts.get(agentId) ?? { tokens: 0, durationMs: 0, apiCalls: 0 };
    this.agentCosts.set(agentId, {
      tokens: existing.tokens + tokensUsed,
      durationMs: existing.durationMs + durationMs,
      apiCalls: existing.apiCalls + 1,
    });
    this.logger.debug(`Cost tracked: ${agentId}`, { tokensUsed, durationMs });
  }

  trackAPICall(service: string, costMs: number): void {
    const existing = this.serviceCosts.get(service) ?? 0;
    this.serviceCosts.set(service, existing + costMs);
  }

  getReport() {
    const perAgent: Record<string, { tokens: number; durationMs: number; apiCalls: number }> = {};
    for (const [id, cost] of this.agentCosts) {
      perAgent[id] = { ...cost };
    }
    const perService: Record<string, number> = {};
    for (const [svc, cost] of this.serviceCosts) {
      perService[svc] = cost;
    }
    const totalTokens = Array.from(this.agentCosts.values()).reduce((s, c) => s + c.tokens, 0);
    const totalDurationMs = Array.from(this.agentCosts.values()).reduce((s, c) => s + c.durationMs, 0);
    return { totalTokens, totalDurationMs, perAgent, perService };
  }

  getSummary(): string {
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

  reset(): void {
    this.agentCosts.clear();
    this.serviceCosts.clear();
    this.startTime = Date.now();
  }
}

export default CostTracker;
