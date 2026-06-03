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
export declare class InstagramAPIService {
    private logger;
    private enabled;
    private accessToken;
    private igUserId;
    private pageId;
    constructor(logger: LoggerLike);
    isEnabled(): boolean;
    /**
     * Sets credentials after OAuth (used by auth command)
     */
    setCredentials(accessToken: string, igUserId: string, pageId: string): void;
    /**
     * Post a Reel / video to Instagram
     */
    postReel(videoPath: string, caption: string): Promise<{
        postId: string;
        url: string;
    }>;
    /**
     * Returns the Meta OAuth URL for Instagram
     */
    getAuthUrl(): string;
}
export default InstagramAPIService;
//# sourceMappingURL=instagramApi.d.ts.map