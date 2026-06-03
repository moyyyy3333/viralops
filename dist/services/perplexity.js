import { config } from '../config.js';
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
export class PerplexityClient {
    logger;
    enabled;
    apiKey;
    model;
    constructor(logger) {
        this.logger = logger;
        this.enabled = config.hasPerplexity;
        this.apiKey = config.perplexityApiKey;
        this.model = config.perplexityModel;
    }
    async search(query) {
        if (!this.enabled) {
            return { content: this.getFallbackContent(query), sources: [], costMs: 0 };
        }
        const start = Date.now();
        try {
            const response = await fetch(PERPLEXITY_API_URL, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{ role: 'user', content: query }],
                }),
            });
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Perplexity API ${response.status}: ${errorText}`);
            }
            const data = (await response.json());
            return {
                content: data.choices[0]?.message?.content ?? '',
                sources: data.citations ?? [],
                costMs: Date.now() - start,
            };
        }
        catch (error) {
            this.logger.error('Perplexity search failed', { error: error.message });
            return { content: this.getFallbackContent(query), sources: [], costMs: Date.now() - start };
        }
    }
    /**
     * Get REAL viral YouTube video URLs for a niche.
     * Uses citations (actual source URLs) from Perplexity's web search.
     */
    async getTrendingTopics(niche, count) {
        const prompt = `Find ${count} specific, currently trending YouTube video URLs about "${niche}" that are viral RIGHT NOW. 

Return format (one per line):
TITLE | YouTube | VIEW_COUNT | FULL_YOUTUBE_URL

Requirements:
- Each URL must be a real YouTube watch URL starting with https://www.youtube.com/watch?v= or https://youtu.be/
- Include only videos that currently exist and are trending
- Check the most recent Joe Rogan Experience episodes, Andrew Tate clips, or viral motivation shorts on YouTube
- VIEW_COUNT should be the approximate view count (e.g. 5.2M, 450K, 1.1B)
- Platform is always "YouTube"

Example:
Joe Rogan Experience #2215 - Elon Musk Discusses AI | YouTube | 45M | https://www.youtube.com/watch?v=dQw4w9WgXcQ`;
        const { content, sources } = await this.search(prompt);
        // Extract YouTube URLs from citations (these are REAL verified URLs from search)
        const realUrls = this.extractYouTubeUrls(sources);
        // Parse pipe-delimited lines from response
        const parsed = this.parsePipeResponse(content, sources);
        // Merge parsed data with real URLs from citations
        // If parsed has no real URLs but citations do, build topics from citations
        if (realUrls.length > 0 && parsed.length < count) {
            this.logger.info(`Found ${realUrls.length} real YouTube URLs in citations`);
            for (const url of realUrls) {
                if (parsed.length >= count)
                    break;
                // Extract title from URL or use generic
                const title = this.urlToTitle(url);
                if (!parsed.find(t => t.url === url)) {
                    parsed.push({
                        title,
                        platform: 'YouTube',
                        url,
                        viewCount: undefined,
                        engagement: undefined,
                    });
                }
            }
        }
        // If we have real results, use them
        if (parsed.length > 0 && parsed.some(t => t.url.startsWith('https://www.youtube.com/') || t.url.startsWith('https://youtu.be/') || t.url.startsWith('https://youtube.com/'))) {
            return parsed.slice(0, count);
        }
        // Fallback: search YouTube directly via Perplexity
        return this.fallbackYouTubeSearch(niche, count);
    }
    /**
     * If pipe parsing and citations fail, directly ask Perplexity for YouTube URLs
     */
    async fallbackYouTubeSearch(niche, count) {
        const prompt = `List ${count} specific, real YouTube video URLs about "${niche}" that are currently trending or viral.

For EACH video, give me the ACTUAL working YouTube URL (like https://www.youtube.com/watch?v=ACTUAL_VIDEO_ID).

Format: TITLE | PLATFORM | VIEWS | URL`;
        const { content, sources } = await this.search(prompt);
        // First try to use citations (real URLs from Perplexity's search)
        const realUrls = this.extractYouTubeUrls(sources);
        if (realUrls.length > 0) {
            return realUrls.slice(0, count).map(url => ({
                title: this.urlToTitle(url),
                platform: 'YouTube',
                url,
                viewCount: undefined,
                engagement: undefined,
            }));
        }
        // Then try pipe parsing
        const parsed = this.parsePipeResponse(content, sources);
        if (parsed.length > 0) {
            return parsed.slice(0, count);
        }
        // Final fallback: YouTube search URLs (at least these are real pages)
        const searchQueries = this.getSearchQueries(niche, count);
        return searchQueries.map((q, i) => ({
            title: q,
            platform: 'YouTube',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
            viewCount: undefined,
            engagement: undefined,
        }));
    }
    extractYouTubeUrls(citations) {
        const urls = [];
        for (let c of citations) {
            // Strip trailing citation markers like [2], [3], etc.
            c = c.replace(/\[\d+\]$/, '');
            if (c.startsWith('https://www.youtube.com/watch?v=') ||
                c.startsWith('https://youtu.be/') ||
                c.startsWith('https://youtube.com/watch?v=')) {
                urls.push(c);
            }
            // Also check www.youtube.com/shorts/
            if (c.includes('youtube.com/shorts/')) {
                urls.push(c);
            }
        }
        return [...new Set(urls)]; // dedupe
    }
    parsePipeResponse(content, sources) {
        const topics = [];
        const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0 && (l.includes('|') || l.includes('https://')));
        for (let i = 0; i < lines.length; i++) {
            const parts = lines[i].split('|').map(p => p.trim());
            let title = '';
            let platform = 'YouTube';
            let viewCount;
            let url = '';
            if (parts.length >= 4) {
                title = parts[0].replace(/^\d+[\.\)]\s*/, '').trim();
                platform = this.normalizePlatform(parts[1]);
                viewCount = this.parseViews(parts[2]);
                url = parts[3] && parts[3].startsWith('http') ? parts[3].replace(/\[\d+\]$/, '') : '';
            }
            else if (parts.length >= 3) {
                title = parts[0].replace(/^\d+[\.\)]\s*/, '').trim();
                platform = this.normalizePlatform(parts[1]);
                url = parts[2] && parts[2].startsWith('http') ? parts[2].replace(/\[\d+\]$/, '') : '';
            }
            else if (parts.length >= 2) {
                title = parts[0].replace(/^\d+[\.\)]\s*/, '').trim();
                url = parts[1] && parts[1].startsWith('http') ? parts[1].replace(/\[\d+\]$/, '') : '';
            }
            // If no URL from pipe, try sources array
            if (!url && i < sources.length) {
                url = sources[i].replace(/\[\d+\]$/, '');
            }
            // If still no URL but we have a title, create YouTube search URL
            if (!url && title) {
                url = `https://www.youtube.com/results?search_query=${encodeURIComponent(title.slice(0, 60))}`;
            }
            if (title && url) {
                topics.push({ title, platform, viewCount, url, engagement: viewCount ? Math.round(viewCount * 0.05) : undefined });
            }
        }
        return topics;
    }
    urlToTitle(url) {
        // Extract the best title from URL or provide meaningful fallback
        try {
            const u = new URL(url);
            if (u.pathname.includes('/shorts/')) {
                const id = u.pathname.split('/shorts/')[1] || '';
                return `YouTube Short ${id.slice(0, 8)}`;
            }
            if (u.searchParams.has('v')) {
                const v = u.searchParams.get('v') || '';
                return `YouTube video ${v.slice(0, 8)}`;
            }
        }
        catch { }
        return `Trending video (${url.slice(0, 40)}...)`;
    }
    getSearchQueries(niche, count) {
        const base = niche.toLowerCase();
        const queries = [
            `${base} viral clip today`,
            `trending ${base} youtube short`,
            `viral ${base} motivation clip`,
            `best ${base} moment podcast`,
            `${base} compilation`,
        ];
        return queries.slice(0, count);
    }
    normalizePlatform(raw) {
        const p = raw.toLowerCase();
        if (p.includes('tiktok'))
            return 'TikTok';
        if (p.includes('youtube') || p.includes('yt'))
            return 'YouTube';
        if (p.includes('instagram') || p.includes('ig'))
            return 'Instagram';
        if (p.includes('twitter') || p.includes('x'))
            return 'Twitter';
        if (p.includes('reddit'))
            return 'Reddit';
        return 'YouTube';
    }
    parseViews(val) {
        const cleaned = val.toLowerCase().replace(/,/g, '').replace(/[^0-9.kmb]/g, '');
        const suffix = cleaned.slice(-1);
        const num = parseFloat(cleaned);
        if (isNaN(num))
            return undefined;
        const mult = { k: 1e3, m: 1e6, b: 1e9 };
        return suffix in mult ? Math.round(num * mult[suffix]) : Math.round(num);
    }
    getFallbackContent(query) {
        return `No Perplexity key configured. Search: ${query}`;
    }
}
export default PerplexityClient;
//# sourceMappingURL=perplexity.js.map