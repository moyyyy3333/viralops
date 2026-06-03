import type { LoggerLike } from '../types.js';
export interface FFmpegOptions {
    inputPath: string;
    outputPath: string;
    startTime?: number;
    endTime?: number;
    width?: number;
    height?: number;
    addCaptions?: boolean;
    captionText?: string;
    hookText?: string;
    backgroundBlur?: boolean;
}
export declare class FFmpegService {
    private logger;
    constructor(logger: LoggerLike);
    checkInstalled(): Promise<boolean>;
    extractSegment(options: FFmpegOptions): Promise<{
        outputPath: string;
        duration: number;
        fileSize: number;
    }>;
    formatForPlatform(inputPath: string, outputPath: string, platform: 'tiktok' | 'youtube' | 'twitter' | 'instagram'): Promise<{
        outputPath: string;
        width: number;
        height: number;
    }>;
    burnCaptions(inputPath: string, outputPath: string, captions: string[]): Promise<string>;
    addHookOverlay(inputPath: string, outputPath: string, hookText: string): Promise<string>;
    processVideo(options: FFmpegOptions): Promise<{
        outputPath: string;
        duration: number;
        fileSize: number;
    }>;
    private runFFmpeg;
    private getFileSize;
    private getVideoDuration;
    private escapeDrawtext;
}
export default FFmpegService;
//# sourceMappingURL=ffmpeg.d.ts.map