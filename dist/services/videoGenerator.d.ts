import type { LoggerLike } from '../types.js';
interface GeneratedVideo {
    path: string;
    duration: number;
    caption: string;
}
/**
 * Generates real YouTube Shorts using FFmpeg
 * Creates text-overlay vertical videos without needing source clips
 */
export declare class VideoGenerator {
    private logger;
    private font;
    constructor(logger: LoggerLike);
    /**
     * Generate a YouTube Short from a quote/topic
     */
    generateShort(quote: string, durationSec?: number): GeneratedVideo;
    /**
     * Generate a batch of Shorts from topics
     */
    generateBatch(topics: string[], durationSec?: number): GeneratedVideo[];
    private extractQuotes;
    private wrapText;
    private buildDrawtext;
    private buildSubtitleDrawtext;
}
export default VideoGenerator;
//# sourceMappingURL=videoGenerator.d.ts.map