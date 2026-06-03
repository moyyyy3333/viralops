import type { LoggerLike } from '../types.js';
interface RetryOptions {
    maxRetries?: number;
    delayMs?: number;
    backoff?: number;
}
export declare function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions, logger?: LoggerLike): Promise<T>;
export declare class CircuitBreaker {
    private name;
    private threshold;
    private timeoutMs;
    private logger?;
    private failures;
    private lastFailureTime;
    private state;
    constructor(name: string, threshold: number, timeoutMs: number, logger?: LoggerLike);
    execute<T>(fn: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
}
export {};
//# sourceMappingURL=retry.d.ts.map