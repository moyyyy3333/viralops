import { config } from './config.js';
import type { ClaudeClientLike, LoggerLike } from './types.js';

export class DeepSeekClient implements ClaudeClientLike {
  private baseUrl = 'https://api.deepseek.com/v1';
  public enabled: boolean;

  constructor(private logger: LoggerLike) {
    this.enabled = !!config.deepseekApiKey;
    if (this.enabled) {
      this.logger.info('DeepSeek client initialized');
    } else {
      this.logger.warn('DeepSeek not configured — AI agents will use fallbacks');
    }
  }

  async complete(
    prompt: string,
    systemPrompt?: string,
    options?: { model?: string; maxTokens?: number }
  ): Promise<{ content: string; tokensUsed: number; costMs: number }> {
    const start = Date.now();
    if (!this.enabled) {
      return { content: '[MOCK] DeepSeek offline', tokensUsed: 0, costMs: Date.now() - start };
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.deepseekApiKey}`,
      },
      body: JSON.stringify({
        model: options?.model ?? config.deepseekModel ?? 'deepseek-chat',
        max_tokens: options?.maxTokens ?? 4096,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`DeepSeek API error (${response.status}): ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    const tokensUsed = (data.usage?.total_tokens ?? 0);

    return { content, tokensUsed, costMs: Date.now() - start };
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

export default DeepSeekClient;
