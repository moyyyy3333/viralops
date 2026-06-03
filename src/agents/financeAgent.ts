import { StripeService } from '../services/stripe.js';
import type { AgentContext, FinancialReport, Agent, Platform } from '../types.js';

export class FinanceAgent implements Agent {
  id = 'finance' as const;
  name = 'Finance Agent';
  color = '#118AB2';
  private stripe: StripeService;

  constructor() {
    const stubLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, child: () => stubLogger } as any;
    this.stripe = new StripeService(stubLogger);
  }

  async execute(input: unknown, context: AgentContext): Promise<FinancialReport> {
    const { runId, platform } = input as { runId: string; platform: Platform };
    const { logger, claude, costTracker, eventBus } = context;

    logger.info('Finance Agent: analyzing revenue');
    const startTime = Date.now();

    const balance = await this.stripe.getBalance();
    logger.info(`Balance: $${balance.available.toFixed(2)} available`);

    const transactions = await this.stripe.getRecentTransactions(20);
    logger.info(`Retrieved ${transactions.length} transactions`);

    const payouts = await this.stripe.getPayouts(5);

    const platformTotals: Record<string, { revenue: number; count: number }> = {};
    let totalRevenue = 0;

    for (const tx of transactions) {
      if (tx.status === 'succeeded') {
        totalRevenue += tx.amount;
        const p = tx.platform || 'other';
        platformTotals[p] = platformTotals[p] || { revenue: 0, count: 0 };
        platformTotals[p].revenue += tx.amount;
        platformTotals[p].count++;
      }
    }

    let analysis = '';
    if (claude.complete) {
      try {
        const prompt = `Analyze: Total Revenue $${totalRevenue.toFixed(2)}, Available $${balance.available.toFixed(2)}. Platforms: ${Object.entries(platformTotals).map(([p, d]) => `${p}: $${d.revenue.toFixed(2)}`).join(', ')}. 2-3 sentence insight + 1 recommendation.`;
        const { content, tokensUsed, costMs } = await claude.complete(prompt);
        analysis = content;
        costTracker.trackAgent('finance', tokensUsed, costMs);
      } catch {
        analysis = `Revenue across ${Object.keys(platformTotals).length} platforms. Consider increasing content on top performer.`;
      }
    } else {
      analysis = `Revenue across ${Object.keys(platformTotals).length} platforms. Consider increasing content on top performer.`;
    }

    const platformBreakdown = Object.entries(platformTotals).map(([name, data]) => ({
      platform: name as Platform,
      revenue: data.revenue,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0,
    }));

    const pendingPayouts = payouts.filter((p) => p.status === 'in_transit' || p.status === 'pending').reduce((s, p) => s + p.amount, 0);

    const report: FinancialReport = {
      runId, totalRevenue, platformBreakdown, pendingPayouts,
      lastPayoutDate: payouts[0]?.arrivalDate,
      transactions: transactions.map((tx) => ({
        id: tx.id, amount: tx.amount, platform: (tx.platform || 'other') as Platform,
        type: tx.description?.toLowerCase().includes('payout') ? 'payout' as const : 'payment' as const,
        date: tx.created,
      })),
    };

    logger.info(`Finance complete: $${totalRevenue.toFixed(2)} total | ${analysis}`);

    eventBus.emit('finance:update', { totalRevenue, platforms: platformBreakdown.length, analysis });

    await context.db.logAgentEvent(context.runId, 'finance', 'info',
      `Revenue: $${totalRevenue.toFixed(2)} across ${platformBreakdown.length} platforms`,
      { totalRevenue, platformCount: platformBreakdown.length, analysis }
    );

    await context.db.insert('transactions', {
      run_id: runId, platform: platform || 'all', amount: totalRevenue,
      type: 'summary', created_at: new Date().toISOString(),
    });

    return report;
  }
}

export default FinanceAgent;
