import type { LoggerLike } from '../types.js';
export declare class TikTokAPIService {
    private logger;
    private enabled;
    private clientKey;
    private clientSecret;
    constructor(logger: LoggerLike);
    uploadVideo(videoPath: string, caption: string): Promise<{
        postId: string;
        url: string;
    }>;
    private getAccessToken;
}
export default TikTokAPIService;
//# sourceMappingURL=tiktokApi.d.ts.map