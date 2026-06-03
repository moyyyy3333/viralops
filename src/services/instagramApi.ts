import type { LoggerLike } from '../types.js';

/**
 * Instagram Graph API — Content Publishing
 * Requires:
 * 1. Meta App at https://developers.facebook.com
 * 2. Facebook Page connected to Instagram Business/Creator account
 * 3. Access token with instagram_basic + instagram_content_publish + pages_show_list
 *
 * Setup:
 *   npx tsx src/index.ts instagram-auth
 */
export class InstagramAPIService {
  private enabled: boolean;
  private accessToken: string = '';
  private igUserId: string = '';
  private pageId: string = '';

  constructor(private logger: LoggerLike) {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || '';
    this.igUserId = process.env.INSTAGRAM_USER_ID || '';
    this.enabled = !!(this.accessToken && this.igUserId);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Sets credentials after OAuth (used by auth command)
   */
  setCredentials(accessToken: string, igUserId: string, pageId: string): void {
    this.accessToken = accessToken;
    this.igUserId = igUserId;
    this.pageId = pageId;
    this.enabled = true;
  }

  /**
   * Post a Reel / video to Instagram
   */
  async postReel(videoPath: string, caption: string): Promise<{ postId: string; url: string }> {
    if (!this.enabled) {
      this.logger.info('Instagram API not configured — returning mock');
      return { postId: `mock_${Date.now()}`, url: `https://instagram.com/reel/mock_${Date.now()}` };
    }

    try {
      // Step 1: Upload video via URL (or direct)
      const mediaResp = await fetch(
        `https://graph.facebook.com/v21.0/${this.igUserId}/media`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            media_type: 'VIDEO',
            video_url: videoPath,
            caption: caption.slice(0, 2200),
            share_to_feed: true,
          }),
        }
      );

      const mediaData = await mediaResp.json() as Record<string, unknown>;

      if (!mediaData.id) {
        this.logger.error('Instagram media creation failed', { error: mediaData });
        return { postId: '', url: '' };
      }

      const creationId = mediaData.id as string;

      // Step 2: Wait a few seconds for processing, then publish
      await new Promise(r => setTimeout(r, 5000));

      const publishResp = await fetch(
        `https://graph.facebook.com/v21.0/${this.igUserId}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ creation_id: creationId }),
        }
      );

      const publishData = await publishResp.json() as Record<string, unknown>;

      if (publishData.id) {
        const postId = publishData.id as string;
        this.logger.info(`Instagram Reel posted: ${postId}`);
        return { postId, url: `https://instagram.com/reel/${postId}` };
      }

      this.logger.error('Instagram publish failed', { error: publishData });
      return { postId: '', url: '' };
    } catch (err) {
      this.logger.error('Instagram API error', { error: (err as Error).message });
      return { postId: '', url: '' };
    }
  }

  /**
   * Returns the Meta OAuth URL for Instagram
   */
  getAuthUrl(): string {
    // Default Meta App ID — replace with user's app
    const appId = process.env.INSTAGRAM_APP_ID || '';
    const redirectUri = 'http://localhost:5102/ig-callback';
    const scope = 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement';
    return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&response_type=token`;
  }
}

export default InstagramAPIService;
