import type { ClaudeClientLike, LoggerLike } from './types.js';
export declare class ClaudeClient implements ClaudeClientLike {
    private logger;
    private client;
    enabled: boolean;
    constructor(logger: LoggerLike);
    complete(prompt: string, systemPrompt?: string, options?: {
        model?: string;
        maxTokens?: number;
    }): Promise<{
        content: string;
        tokensUsed: number;
        costMs: number;
    }>;
    parseJSON<T>(prompt: string, systemPrompt?: string): Promise<{
        data: T;
        tokensUsed: number;
        costMs: number;
    }>;
}
export default ClaudeClient;
//# sourceMappingURL=claude.d.ts.map