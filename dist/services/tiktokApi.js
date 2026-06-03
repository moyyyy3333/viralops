import { config } from '../config.js';
export class TikTokAPIService {
    logger;
    enabled;
    clientKey;
    clientSecret;
    constructor(logger) {
        this.logger = logger;
        this.enabled = config.hasTikTok;
        this.clientKey = config.tiktokClientKey;
        this.clientSecret = config.tiktokClientSecret;
    }
    async uploadVideo(videoPath, caption) {
        if (!this.enabled) {
            const mockId = `mock_${Date.now()}`;
            return { postId: mockId, url: `https://tiktok.com/@user/video/${mockId}` };
        }
        // TikTok Publishing API flow: get access token → upload → publish
        try {
            const accessToken = await this.getAccessToken();
            // Step 1: Init upload
            const initRes = await fetch('https://open-api.tiktok.com/share/video/upload/', {
                method: 'POST',
                headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ source_info: { source: 'PULL_FROM_URL', url: videoPath }, title: caption.slice(0, 2200) }),
            });
            const init = await initRes.json();
            const postId = init.data?.share_id || `tt_${Date.now()}`;
            return { postId, url: `https://tiktok.com/@user/video/${postId}` };
        }
        catch (error) {
            this.logger.error('TikTok upload failed', { error: error.message });
            const mockId = `fallback_${Date.now()}`;
            return { postId: mockId, url: `https://tiktok.com/@user/video/${mockId}` };
        }
    }
    async getAccessToken() {
        // In production: implement proper OAuth 2.0 flow
        // For now, return a placeholder
        return 'placeholder_token';
    }
}
export default TikTokAPIService;
//# sourceMappingURL=tiktokApi.js.map