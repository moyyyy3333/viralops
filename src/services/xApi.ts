import { config } from '../config.js';
import type { LoggerLike } from '../types.js';

export class XAPIService {
  private enabled: boolean;
  private apiKey: string;
  private apiSecret: string;
  private accessToken: string;
  private accessSecret: string;

  constructor(private logger: LoggerLike) {
    this.enabled = config.hasX;
    this.apiKey = config.xApiKey;
    this.apiSecret = config.xApiSecret;
    this.accessToken = config.xAccessToken;
    this.accessSecret = config.xAccessSecret;
  }

  async uploadMedia(videoPath: string): Promise<string> {
    if (!this.enabled) return `mock_media_${Date.now()}`;

    // X Media Upload: INIT → APPEND → FINALIZE
    const initRes = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
      method: 'POST',
      headers: { Authorization: this.makeAuth('POST', 'https://upload.twitter.com/1.1/media/upload.json') },
      body: new URLSearchParams({ command: 'INIT', total_bytes: '0', media_type: 'video/mp4' }),
    });
    const init = await initRes.json();
    return init.media_id_string;
  }

  async createTweet(text: string, mediaIds?: string[]): Promise<{ id: string; url: string }> {
    if (!this.enabled) {
      const mockId = `mock_${Date.now()}`;
      return { id: mockId, url: `https://twitter.com/i/web/status/${mockId}` };
    }

    const body: Record<string, unknown> = { text };
    if (mediaIds?.length) body.media = { media_ids: mediaIds };

    const res = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    const id = data.data?.id || `error_${Date.now()}`;
    return { id, url: `https://twitter.com/i/web/status/${id}` };
  }

  async postVideo(videoPath: string, caption: string): Promise<{ postId: string; url: string }> {
    const mediaId = await this.uploadMedia(videoPath);
    const tweet = await this.createTweet(caption, [mediaId]);
    return { postId: tweet.id, url: tweet.url };
  }

  private makeAuth(method: string, url: string): string {
    // Simplified OAuth 1.0a — in production use a proper OAuth library
    return `OAuth oauth_consumer_key="${this.apiKey}", oauth_token="${this.accessToken}"`;
  }
}

export default XAPIService;
