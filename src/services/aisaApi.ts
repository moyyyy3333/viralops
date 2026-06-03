import { config } from '../config.js';
import type { LoggerLike } from '../types.js';

const AISA_API = 'https://api.aisa.one';

export class AISAService {
  private enabled: boolean;
  private apiKey: string;

  constructor(private logger: LoggerLike) {
    this.apiKey = config.aisaApiKey || '';
    this.enabled = !!this.apiKey;
  }

  async postToX(text: string): Promise<{ postId: string; url: string }> {
    if (!this.enabled) {
      const mockId = `mock_${Date.now()}`;
      return { postId: mockId, url: `https://twitter.com/i/web/status/${mockId}` };
    }

    const start = Date.now();
    try {
      const resp = await fetch(`${AISA_API}/apis/v1/twitter/post_twitter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ content: text, aisa_api_key: this.apiKey }),
        signal: AbortSignal.timeout(15000),
      });

      const data = await resp.json() as Record<string, unknown>;

      if (resp.status === 200 && (data as any).code === 200) {
        const tweetId = (data as any).data?.tweet_id || `aisa_${Date.now()}`;
        this.logger.info(`AISA posted to X: ${tweetId} (${(Date.now() - start).toFixed(0)}ms)`);
        return { postId: tweetId, url: `https://twitter.com/i/web/status/${tweetId}` };
      }

      this.logger.warn(`AISA X post failed: ${resp.status} ${JSON.stringify(data).slice(0, 200)}`);
      return { postId: `failed_${Date.now()}`, url: '' };
    } catch (err) {
      this.logger.error(`AISA X post error: ${(err as Error).message}`);
      return { postId: `error_${Date.now()}`, url: '' };
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

export default AISAService;
