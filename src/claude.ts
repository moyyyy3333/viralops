import { Anthropic } from '@anthropic-ai/sdk';
import { config } from './config.js';
import type { ClaudeClientLike, LoggerLike } from './types.js';

export class ClaudeClient implements ClaudeClientLike {
  private client: Anthropic | null = null;
  public enabled: boolean;

  constructor(private logger: LoggerLike) {
    this.enabled = config.hasAnthropic;
    if (this.enabled) {
      this.client = new Anthropic({ apiKey: config.anthropicApiKey });
      this.logger.info('Claude client initialized');
    } else {
      this.logger.warn('Claude not configured — AI agents will use fallbacks');
    }
  }

  async complete(
    prompt: string,
    systemPrompt?: string,
    options?: { model?: string; maxTokens?: number }
  ): Promise<{ content: string; tokensUsed: number; costMs: number }> {
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
      .filter((c): c is Anthropic.TextBlock => c.type === 'text')
      .map((c) => c.text)
      .join('');
    return {
      content: text,
      tokensUsed: response.usage?.input_tokens ?? 0 + (response.usage?.output_tokens ?? 0),
      costMs: Date.now() - start,
    };
  }

  async parseJSON<T>(
    prompt: string,
    systemPrompt?: string
  ): Promise<{ data: T; tokensUsed: number; costMs: number }> {
    const result = await this.complete(
      prompt + '\nRespond with valid JSON only.',
      systemPrompt,
    );
    const data = JSON.parse(result.content) as T;
    return { data, tokensUsed: result.tokensUsed, costMs: result.costMs };
  }
}

export default ClaudeClient;
