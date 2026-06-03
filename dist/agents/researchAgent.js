import { PerplexityClient } from '../services/perplexity.js';
import { v4 as uuidv4 } from 'uuid';
import { withRetry } from '../utils/retry.js';
export class ResearchAgent {
    id = 'research';
    name = 'Research Agent';
    color = '#FF6B35';
    perplexity;
    constructor() {
        const stubLogger = { info: () => { }, warn: () => { }, error: () => { }, debug: () => { }, child: () => stubLogger };
        this.perplexity = new PerplexityClient(stubLogger);
    }
    async execute(input, context) {
        const { niche, count, topics } = input;
        const { logger, claude, costTracker, eventBus } = context;
        logger.info(`Researching viral content in niche: "${niche}"`);
        const effectiveNiche = niche || 'viral culture';
        const desiredCount = Math.min(Math.max(count || 5, 1), 10);
        let perplexityResult;
        try {
            perplexityResult = await withRetry(() => this.perplexity.getTrendingTopics(effectiveNiche, desiredCount), { maxRetries: 3 }, logger);
        }
        catch {
            perplexityResult = this.perplexity['getMockTopics'](effectiveNiche, desiredCount);
        }
        logger.info(`Found ${perplexityResult.length} raw topics`);
        if (perplexityResult.length === 0) {
            logger.warn('No topics discovered');
            return [];
        }
        const viralTopics = [];
        for (let i = 0; i < perplexityResult.length; i++) {
            const topic = perplexityResult[i];
            try {
                let viralScore = 50;
                let sentiment = 'neutral';
                let tags = this.extractTags(topic.title);
                if (claude.complete) {
                    try {
                        const prompt = `Analyze this content topic for viral potential. Title: "${topic.title}" Platform: ${topic.platform} Views: ${topic.viewCount ?? 'unknown'}. Score viral potential 1-100, sentiment (positive/neutral/negative), and 3-5 tags. Respond as JSON: {"viralScore": number, "sentiment": string, "tags": string[]}`;
                        const { data, tokensUsed, costMs } = await claude.parseJSON(prompt);
                        viralScore = Math.min(100, Math.max(1, Math.round(data.viralScore)));
                        sentiment = ['positive', 'neutral', 'negative'].includes(data.sentiment) ? data.sentiment : 'neutral';
                        tags = data.tags?.slice(0, 5) || tags;
                        costTracker.trackAgent('research', tokensUsed, costMs);
                    }
                    catch {
                        // Heuristic fallback
                        viralScore = this.heuristicScore(topic.title, topic.viewCount);
                    }
                }
                else {
                    viralScore = this.heuristicScore(topic.title, topic.viewCount);
                }
                viralTopics.push({
                    id: uuidv4(),
                    title: topic.title,
                    sourceUrl: topic.url,
                    platform: topic.platform,
                    viewCount: topic.viewCount,
                    engagementRate: topic.engagement,
                    viralScore,
                    sentiment,
                    tags,
                    discoveredAt: new Date(),
                });
                eventBus.emit('agent:research:progress', { message: `Scored: ${topic.title} (${viralScore})` });
            }
            catch (err) {
                logger.warn(`Failed to analyze "${topic.title}": ${err.message}`);
            }
        }
        viralTopics.sort((a, b) => b.viralScore - a.viralScore);
        logger.info(`Research complete: ${viralTopics.length} topics scored`);
        await context.db.logAgentEvent(context.runId, 'research', 'info', `Discovered ${viralTopics.length} viral topics`, { topics: viralTopics.map((t) => ({ title: t.title, score: t.viralScore })) });
        return viralTopics;
    }
    heuristicScore(title, views) {
        let score = 50;
        if (views && views > 0)
            score = Math.min(95, 30 + Math.log10(views) * 8);
        const boost = ['viral', 'trending', 'shocking', 'reveals', 'destroys', 'breaks', 'insane', 'mind-blowing'];
        for (const kw of boost) {
            if (title.toLowerCase().includes(kw)) {
                score += 8;
                break;
            }
        }
        return Math.min(100, score);
    }
    extractTags(title) {
        const stop = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'myself', 'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'it', 'its', 'they', 'them', 'what', 'which', 'who', 'whom']);
        const words = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 3 && !stop.has(w));
        return [...new Set(words)].slice(0, 5).map((w) => w.charAt(0).toUpperCase() + w.slice(1));
    }
}
export default ResearchAgent;
//# sourceMappingURL=researchAgent.js.map