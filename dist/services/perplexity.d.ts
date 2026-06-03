import type { LoggerLike } from '../types.js';
export interface ViralTopic {
    title: string;
    platform: string;
    viewCount?: number;
    url: string;
    engagement?: number;
}
export declare class PerplexityClient {
    private logger;
    private enabled;
    private apiKey;
    private model;
    constructor(logger: LoggerLike);
    search(query: string): Promise<{
        content: string;
        sources: string[];
        costMs: number;
    }>;
    /**
     * Get REAL viral YouTube video URLs for a niche.
     * Uses citations (actual source URLs) from Perplexity's web search.
     */
    getTrendingTopics(niche: string, count: number): Promise<ViralTopic[]>;
    /**
     * If pipe parsing and citations fail, directly ask Perplexity for YouTube URLs
     */
    private fallbackYouTubeSearch;
    private extractYouTubeUrls;
    private parsePipeResponse;
    private urlToTitle;
    private getSearchQueries;
    private normalizePlatform;
    private parseViews;
    private getFallbackContent;
}
export default PerplexityClient;
//# sourceMappingURL=perplexity.d.ts.map