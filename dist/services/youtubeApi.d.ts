import type { LoggerLike } from "../types.js";
export declare class YouTubeAPIService {
    private logger;
    private enabled;
    private clientId;
    private clientSecret;
    private auth;
    private youtube;
    constructor(logger: LoggerLike);
    private initAuth;
    private ensureAuth;
    uploadShort(videoPath: string, title: string, description: string, tags: string[]): Promise<{
        videoId: string;
        url: string;
    }>;
}
export default YouTubeAPIService;
//# sourceMappingURL=youtubeApi.d.ts.map