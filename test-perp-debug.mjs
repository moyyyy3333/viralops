import { PerplexityClient } from './src/services/perplexity.js';

const logger = { info: console.log, warn: console.warn, error: console.error, debug: console.log, child: () => logger };
const p = new PerplexityClient(logger);

const result = await p['search']('Find 5 specific, currently trending YouTube video URLs about "andrew tate motivation" that are viral RIGHT NOW.');

console.log('=== CONTENT (first 300 chars) ===');
console.log(result.content.slice(0, 300));
console.log('\n=== CITATIONS (first 3) ===');
console.log(JSON.stringify(result.sources.slice(0, 3), null, 2));
console.log('\n=== PIPES IN CONTENT? ===');
console.log(result.content.includes('|'));
