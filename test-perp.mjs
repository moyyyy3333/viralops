import { PerplexityClient } from './src/services/perplexity.js';
import { config } from './src/config.js';
const logger = { info: console.log, warn: console.warn, error: console.error, debug: console.log, child: () => logger };
const p = new PerplexityClient(logger);
console.log('hasKey:', config.hasPerplexity);
const result = await p.getTrendingTopics('andrew tate joe rogan', 3);
console.log('Results:', JSON.stringify(result, null, 2));
