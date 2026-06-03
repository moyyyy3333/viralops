import { YTDLPService } from './src/services/ytdlp.js';
import { isYouTubeUrl } from './src/utils/validators.js';

const logger = { info: console.log, warn: (...args) => console.log('WARN:', ...args), error: console.log, debug: console.log, child: () => logger };

const urls = [
  'https://www.youtube.com/watch?v=_H_KkFqWFfA',
  'https://www.youtube.com/watch?v=kkeKdO7XAtY',
  'https://www.youtube.com/watch?v=0Q8TLN82XDY',
];

const yt = new YTDLPService(logger);

for (const url of urls) {
  console.log('\n=== Testing URL:', url);
  console.log('isYouTubeUrl:', isYouTubeUrl(url));
  
  try {
    const info = await yt.getVideoInfo(url);
    console.log('getVideoInfo OK:', info.title, '|', info.duration + 's');
  } catch (e) {
    console.log('getVideoInfo FAILED:', e.message.slice(0, 100));
  }
  
  try {
    const dl = await yt.downloadVideo(url, '/tmp/test_dl_test', { maxDuration: 30 });
    console.log('downloadVideo OK:', dl.videoPath, dl.duration + 's');
  } catch (e) {
    console.log('downloadVideo FAILED:', e.message.slice(0, 100));
  }
}
