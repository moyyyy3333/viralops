import { VideoGenerator } from './src/services/videoGenerator.js';
const gen = new VideoGenerator({ info: console.log, warn: console.warn, error: console.error, debug: console.log, child: () => ({ info(){}, warn(){}, error(){}, debug(){}, child: () => ({}) }) });
const video = gen.generateShort("Andrew Tate says: Success is not a goal, it's a lifestyle. The matrix wants you weak.", 10);
console.log('Generated:', video.path);
console.log('Duration:', video.duration, 's');
console.log('Caption:', video.caption);
const fs = await import('fs');
console.log('File size:', (fs.statSync(video.path).size / 1024).toFixed(0), 'KB');
console.log('Exists:', fs.existsSync(video.path));
