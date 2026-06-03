// End-to-end test: Perplexity → yt-dlp → YouTube upload
import { PerplexityClient } from './src/services/perplexity.js';
import { YTDLPService } from './src/services/ytdlp.js';
import { YouTubeAPIService } from './src/services/youtubeApi.js';
import { existsSync } from 'fs';

const logger = { info: console.log, warn: (...a) => console.log('WARN:', ...a), error: console.log, debug: console.log, child: () => logger };

const perplexity = new PerplexityClient(logger);
const ytdlp = new YTDLPService(logger);

// Step 1: Get real trending YouTube URLs
console.log('\n=== Step 1: Perplexity research ===');
const topics = await perplexity.getTrendingTopics('andrew tate motivation', 3);
console.log(`Found ${topics.length} topics:`);
for (const t of topics) {
  console.log(`  "${t.title}"`);
  console.log(`  URL: ${t.url}`);
  console.log(`  Views: ${t.viewCount}`);
  console.log(`  Is real YT? ${t.url.includes('youtube.com/watch?v=') || t.url.includes('youtu.be/') ? 'YES' : 'NO'}\n`);
}

if (topics.length === 0) {
  console.log('NO TOPICS FOUND - exiting');
  process.exit(1);
}

// Step 2: Download the first video
const firstUrl = topics[0].url;
if (!firstUrl.includes('youtube.com/watch?v=') && !firstUrl.includes('youtu.be/')) {
  console.log('First URL is not a real YouTube video URL:', firstUrl);
  process.exit(1);
}

console.log(`\n=== Step 2: Download ${firstUrl} ===`);
const dl = await ytdlp.downloadVideo(firstUrl, '/tmp/e2e_test', { maxDuration: 15 });
console.log(`Downloaded: ${dl.videoPath}`);
console.log(`File exists: ${existsSync(dl.videoPath)}`);

if (!existsSync(dl.videoPath)) {
  console.log('DOWNLOAD FAILED');
  process.exit(1);
}

// Step 3: Upload to YouTube
console.log('\n=== Step 3: Upload to YouTube ===');
const yt = new YouTubeAPIService(logger);
await new Promise(r => setTimeout(r, 1000));

const result = await yt.uploadShort(
  dl.videoPath,
  `Auto-Generated: ${topics[0].title.slice(0, 50)}`,
  `Auto-generated clip from trending YouTube video. Research via Perplexity AI. Download via yt-dlp. Upload via YouTube API. #shorts #viral #automation`,
  ['shorts', 'viral', 'automation', 'motivation']
);

console.log('\n=== FINAL RESULT ===');
console.log(JSON.stringify(result, null, 2));
if (result.videoId) {
  console.log('✅ SUCCESS! URL:', result.url);
} else {
  console.log('❌ FAILED');
}
