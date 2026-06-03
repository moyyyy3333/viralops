import type { LoggerLike } from '../types.js';
export declare class XAPIService {
    private logger;
    private enabled;
    private apiKey;
    private apiSecret;
    private accessToken;
    private accessSecret;
    constructor(logger: LoggerLike);
    uploadMedia(videoPath: string): Promise<string>;
    createTweet(text: string, mediaIds?: string[]): Promise<{
        id: string;
        url: string;
    }>;
    postVideo(videoPath: string, caption: string): Promise<{
        postId: string;
        url: string;
    }>;
    private makeAuth;
}
export default XAPIService;
//# sourceMappingURL=xApi.d.ts.map