import { PerplexityClient } from './src/services/perplexity.js';

const logger = { info: console.log, warn: console.warn, error: (...args) => console.log('ERR:', ...args), debug: console.log, child: () => logger };
const p = new PerplexityClient(logger);

async function main() {
  const topics = await p.getTrendingTopics('andrew tate joe rogan motivation', 3);
  console.log('=== Results ===');
  for (const t of topics) {
    console.log('Topic:', t.title);
    console.log('  URL:', t.url);
    console.log('  Views:', t.viewCount);
    const isRealYT = t.url.includes('youtube.com/watch?v=') || t.url.includes('youtu.be/');
    console.log('  Is real YT URL?', isRealYT ? '✅' : '❌');
  }
}
main().catch(e => console.error('CRASH:', e));
