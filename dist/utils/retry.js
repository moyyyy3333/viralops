export async function withRetry(fn, options = {}, logger) {
    const { maxRetries = 3, delayMs = 1000, backoff = 2 } = options;
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
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
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
// ── Circuit Breaker ──
export class CircuitBreaker {
    name;
    threshold;
    timeoutMs;
    logger;
    failures = 0;
    lastFailureTime = null;
    state = 'closed';
    constructor(name, threshold, timeoutMs, logger) {
        this.name = name;
        this.threshold = threshold;
        this.timeoutMs = timeoutMs;
        this.logger = logger;
    }
    async execute(fn) {
        if (this.state === 'open') {
            if (Date.now() - (this.lastFailureTime ?? 0) > this.timeoutMs) {
                this.state = 'half-open';
                this.logger?.info(`Circuit breaker '${this.name}' entering half-open`);
            }
            else {
                throw new Error(`Circuit breaker '${this.name}' is OPEN`);
            }
        }
        try {
            const result = await fn();
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        this.failures = 0;
        this.state = 'closed';
    }
    onFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();
        if (this.failures >= this.threshold) {
            this.state = 'open';
            this.logger?.warn(`Circuit breaker '${this.name}' is now OPEN`);
        }
    }
}
//# sourceMappingURL=retry.js.map