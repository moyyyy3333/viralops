// Upload the downloaded REAL clip to Twitter + delete bad Shorts
import { AISAService } from './src/services/aisaApi.js';
import { existsSync } from 'fs';

const logger = { info: console.log, warn: console.log, error: console.log, debug: () => {}, child: () => logger };

// Upload the real downloaded clip to Twitter
const aisa = new AISAService(logger);

const videoPath = '/tmp/e2e_test/uJKBMEdMH9E.mp4';
if (!existsSync(videoPath)) {
  console.log('Video not found at', videoPath);
  process.exit(1);
}

console.log('Video file size:', Math.round((await import('fs')).statSync(videoPath).size / 1024 / 1024), 'MB');

if (aisa.isConfigured()) {
  console.log('Uploading real video clip to Twitter...');
  const result = await aisa.postVideo(
    videoPath,
    'Real Andrew Tate clip — auto-downloaded by ViralOps AI pipeline. Perplexity research → yt-dlp download → AISA post. No humans involved. #automation #viral'
  );
  console.log('Twitter result:', JSON.stringify(result, null, 2));
} else {
  console.log('AISA not configured');
}
