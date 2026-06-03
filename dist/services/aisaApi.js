import { config } from '../config.js';
const AISA_API = 'https://api.aisa.one';
export class AISAService {
    logger;
    enabled;
    apiKey;
    constructor(logger) {
        this.logger = logger;
        this.apiKey = config.aisaApiKey || '';
        this.enabled = !!this.apiKey;
    }
    async postToX(text) {
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
            const data = await resp.json();
            if (resp.status === 200 && data.code === 200) {
                const tweetId = data.data?.tweet_id || `aisa_${Date.now()}`;
                this.logger.info(`AISA posted to X: ${tweetId} (${(Date.now() - start).toFixed(0)}ms)`);
                return { postId: tweetId, url: `https://twitter.com/i/web/status/${tweetId}` };
            }
            this.logger.warn(`AISA X post failed: ${resp.status} ${JSON.stringify(data).slice(0, 200)}`);
            return { postId: `failed_${Date.now()}`, url: '' };
        }
        catch (err) {
            this.logger.error(`AISA X post error: ${err.message}`);
            return { postId: `error_${Date.now()}`, url: '' };
        }
    }
    isEnabled() {
        return this.enabled;
    }
}
export default AISAService;
//# sourceMappingURL=aisaApi.js.map