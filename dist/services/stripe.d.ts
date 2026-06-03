import type { LoggerLike } from '../types.js';
export declare class StripeService {
    private logger;
    private client;
    private enabled;
    constructor(logger: LoggerLike);
    getBalance(): Promise<{
        available: number;
        pending: number;
        currency: string;
    }>;
    getRecentTransactions(limit?: number): Promise<Array<{
        id: string;
        amount: number;
        currency: string;
        status: string;
        description: string;
        created: Date;
        platform?: string;
    }>>;
    getPayouts(limit?: number): Promise<Array<{
        id: string;
        amount: number;
        status: string;
        arrivalDate: Date;
    }>>;
    createPayout(amount: number, currency?: string): Promise<{
        id: string;
        status: string;
    }>;
}
export default StripeService;
//# sourceMappingURL=stripe.d.ts.map