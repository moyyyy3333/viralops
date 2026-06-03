const { PerplexityClient } = require('./src/services/perplexity.js');
const logger = { info: console.log, warn: console.warn, error: console.error, debug: console.log, child: () => logger };
const p = new PerplexityClient(logger);

async function main() {
  const topics = await p.getTrendingTopics('andrew tate joe rogan motivation', 3);
  console.log('Topics:');
  for (const t of topics) {
    console.log('  -', t.title);
    console.log('    URL:', t.url);
    console.log('    Views:', t.viewCount);
    console.log('    YouTube?', (t.url.includes('youtube.com/watch?v=') || t.url.includes('youtu.be/')) ? 'YES' : 'NO');
  }
}
main();
