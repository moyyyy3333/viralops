import type { LoggerLike } from '../types.js';
export declare class YTDLPService {
    private logger;
    constructor(logger: LoggerLike);
    private binaryOnPath;
    private resolveBinary;
    downloadVideo(url: string, outputDir: string, opts?: {
        maxDuration?: number;
    }): Promise<{
        videoPath: string;
        title: string;
        duration: number;
        thumbnail?: string;
    }>;
    getVideoInfo(url: string): Promise<{
        title: string;
        duration: number;
        uploader: string;
        viewCount: number;
        description: string;
        uploadDate: string;
    }>;
    extractAudio(videoPath: string, outputPath: string): Promise<string>;
}
export default YTDLPService;
//# sourceMappingURL=ytdlp.d.ts.map