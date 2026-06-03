import Stripe from 'stripe';
import { config } from '../config.js';
import type { LoggerLike } from '../types.js';

export class StripeService {
  private client: Stripe | null = null;
  private enabled: boolean;

  constructor(private logger: LoggerLike) {
    this.enabled = config.hasStripe;
    if (this.enabled) {
      this.client = new Stripe(config.stripeSecretKey, { apiVersion: '2024-06-20' });
      this.logger.info('Stripe client initialized');
    } else {
      this.logger.warn('Stripe not configured — mock mode');
    }
  }

  async getBalance(): Promise<{ available: number; pending: number; currency: string }> {
    if (!this.enabled || !this.client) {
      return { available: 1847.50, pending: 420.00, currency: 'usd' };
    }
    const balance = await this.client.balance.retrieve();
    return {
      available: balance.available.reduce((s, b) => s + b.amount, 0) / 100,
      pending: balance.pending.reduce((s, b) => s + b.amount, 0) / 100,
      currency: balance.available[0]?.currency || 'usd',
    };
  }

  async getRecentTransactions(limit = 20): Promise<Array<{
    id: string; amount: number; currency: string; status: string;
    description: string; created: Date; platform?: string;
  }>> {
    if (!this.enabled || !this.client) {
      return Array.from({ length: limit }, (_, i) => ({
        id: `pi_mock_${i}`,
        amount: [29.99, 49.99, 99.00, 12.50, 199.00][i % 5],
        currency: 'usd', status: 'succeeded',
        description: ['Platform subscription', 'Video monetization', 'Ad revenue', 'Tip', 'Course sale'][i % 5],
        created: new Date(Date.now() - i * 86400000),
        platform: ['tiktok', 'youtube', 'twitter', 'instagram', 'stripe'][i % 5],
      }));
    }

    const charges = await this.client.charges.list({ limit });
    return charges.data.map((charge) => ({
      id: charge.id,
      amount: charge.amount / 100,
      currency: charge.currency,
      status: charge.status,
      description: charge.description || 'Payment',
      created: new Date(charge.created * 1000),
      platform: charge.metadata?.platform,
    }));
  }

  async getPayouts(limit = 10): Promise<Array<{
    id: string; amount: number; status: string; arrivalDate: Date;
  }>> {
    if (!this.enabled || !this.client) {
      return [{ id: 'po_mock_1', amount: 1247.00, status: 'in_transit', arrivalDate: new Date(Date.now() + 2 * 86400000) }];
    }
    const payouts = await this.client.payouts.list({ limit });
    return payouts.data.map((p) => ({
      id: p.id, amount: p.amount / 100, status: p.status,
      arrivalDate: new Date(p.arrival_date * 1000),
    }));
  }

  async createPayout(amount: number, currency = 'usd'): Promise<{ id: string; status: string }> {
    if (!this.enabled || !this.client) {
      return { id: `po_${Date.now()}`, status: 'pending' };
    }
    const payout = await this.client.payouts.create({ amount: Math.round(amount * 100), currency });
    return { id: payout.id, status: payout.status };
  }
}

export default StripeService;
