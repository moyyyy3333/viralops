import type { LoggerLike } from '../types.js';

interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  backoff?: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
  logger?: LoggerLike,
): Promise<T> {
  const { maxRetries = 3, delayMs = 1000, backoff = 2 } = options;
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        const wait = delayMs * Math.pow(backoff, attempt);
        logger?.warn(`Retry ${attempt + 1}/${maxRetries} after ${wait}ms: ${lastError.message}`);
        await sleep(wait);
      }
    }
  }
  throw lastError;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Circuit Breaker ──

export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private name: string,
    private threshold: number,
    private timeoutMs: number,
    private logger?: LoggerLike,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - (this.lastFailureTime ?? 0) > this.timeoutMs) {
        this.state = 'half-open';
        this.logger?.info(`Circuit breaker '${this.name}' entering half-open`);
      } else {
        throw new Error(`Circuit breaker '${this.name}' is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.state = 'open';
      this.logger?.warn(`Circuit breaker '${this.name}' is now OPEN`);
    }
  }
}
