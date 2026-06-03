import { Anthropic } from '@anthropic-ai/sdk';
import { config } from './config.js';
export class ClaudeClient {
    logger;
    client = null;
    enabled;
    constructor(logger) {
        this.logger = logger;
        this.enabled = config.hasAnthropic;
        if (this.enabled) {
            this.client = new Anthropic({ apiKey: config.anthropicApiKey });
            this.logger.info('Claude client initialized');
        }
        else {
            this.logger.warn('Claude not configured — AI agents will use fallbacks');
        }
    }
    async complete(prompt, systemPrompt, options) {
        const start = Date.now();
        if (!this.enabled || !this.client) {
            return { content: '[MOCK] Claude offline', tokensUsed: 0, costMs: Date.now() - start };
        }
        const response = await this.client.messages.create({
            model: options?.model ?? config.anthropicModel,
            max_tokens: options?.maxTokens ?? config.anthropicMaxTokens,
            system: systemPrompt ?? '',
            messages: [{ role: 'user', content: prompt }],
        });
        const text = response.content
            .filter((c) => c.type === 'text')
            .map((c) => c.text)
            .join('');
        return {
            content: text,
            tokensUsed: response.usage?.input_tokens ?? 0 + (response.usage?.output_tokens ?? 0),
            costMs: Date.now() - start,
        };
    }
    async parseJSON(prompt, systemPrompt) {
        const result = await this.complete(prompt + '\nRespond with valid JSON only.', systemPrompt);
        const data = JSON.parse(result.content);
        return { data, tokensUsed: result.tokensUsed, costMs: result.costMs };
    }
}
export default ClaudeClient;
//# sourceMappingURL=claude.js.map