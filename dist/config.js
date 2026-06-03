import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
dotenv.config();
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
function env(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined && defaultValue === undefined) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value ?? defaultValue;
}
function envBool(key, defaultValue = false) {
    const value = process.env[key];
    if (value === undefined)
        return defaultValue;
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}
function envInt(key, defaultValue) {
    const value = process.env[key];
    if (value === undefined)
        return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
}
export const config = {
    // Anthropic
    anthropicApiKey: env('ANTHROPIC_API_KEY', ''),
    anthropicModel: env('ANTHROPIC_MODEL', 'claude-3-5-sonnet-20241022'),
    anthropicMaxTokens: envInt('ANTHROPIC_MAX_TOKENS', 4096),
    // Perplexity
    perplexityApiKey: env('PERPLEXITY_API_KEY', ''),
    perplexityModel: env('PERPLEXITY_MODEL', 'sonar-pro'),
    // Supabase
    supabaseUrl: env('SUPABASE_URL', ''),
    supabaseServiceKey: env('SUPABASE_SERVICE_KEY', ''),
    // Stripe
    stripeSecretKey: env('STRIPE_SECRET_KEY', ''),
    // X / Twitter
    xApiKey: env('X_API_KEY', ''),
    xApiSecret: env('X_API_SECRET', ''),
    xAccessToken: env('X_ACCESS_TOKEN', ''),
    xAccessSecret: env('X_ACCESS_SECRET', ''),
    // YouTube
    youtubeApiKey: env('YOUTUBE_API_KEY', ''),
    youtubeClientId: env('YOUTUBE_CLIENT_ID', ''),
    youtubeClientSecret: env('YOUTUBE_CLIENT_SECRET', ''),
    // AISA (for X/Twitter posting)
    aisaApiKey: env('AISA_API_KEY', ''),
    // TikTok
    tiktokClientKey: env('TIKTOK_CLIENT_KEY', ''),
    tiktokClientSecret: env('TIKTOK_CLIENT_SECRET', ''),
    // Pipeline
    maxConcurrentAgents: envInt('MAX_CONCURRENT_AGENTS', 3),
    defaultRetryCount: envInt('DEFAULT_RETRY_COUNT', 3),
    logLevel: env('LOG_LEVEL', 'info'),
    outputDir: env('OUTPUT_DIR', join(rootDir, 'output')),
    defaultNiche: env('DEFAULT_NICHE', 'viral culture'),
    contentTopics: env('CONTENT_TOPICS', 'podcasts,motivation,AI,entrepreneurship').split(','),
    // Derived
    rootDir,
    hasAnthropic: !!env('ANTHROPIC_API_KEY', ''),
    hasPerplexity: !!env('PERPLEXITY_API_KEY', ''),
    hasSupabase: !!(env('SUPABASE_URL', '') && env('SUPABASE_SERVICE_KEY', '')),
    hasStripe: !!env('STRIPE_SECRET_KEY', ''),
    hasX: !!(env('X_API_KEY', '') && env('X_ACCESS_TOKEN', '')),
    hasYouTube: !!(env('YOUTUBE_CLIENT_ID', '') && env('YOUTUBE_CLIENT_SECRET', '')),
    hasAISA: !!env('AISA_API_KEY', ''),
    hasTikTok: !!(env('TIKTOK_CLIENT_KEY', '') && env('TIKTOK_CLIENT_SECRET', '')),
};
// Freeze config to prevent mutations
Object.freeze(config);
export default config;
//# sourceMappingURL=config.js.map