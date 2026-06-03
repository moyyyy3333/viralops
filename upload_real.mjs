import { google } from 'googleapis';
import { readFileSync, createReadStream, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = '/Users/mymac/Downloads/viralops-agents/.env';
const tokenPath = '/Users/mymac/Downloads/viralops-agents/.youtube-tokens.json';
const videoPath = '/tmp/e2e_test/uJKBMEdMH9E_trimmed.mp4';

const env = readFileSync(envPath, 'utf-8');
const matchId = env.match(/YOUTUBE_CLIENT_ID=(.+)/);
const matchSecret = env.match(/YOUTUBE_CLIENT_SECRET=(.+)/);
if (!matchId || !matchSecret) { console.log('Missing creds'); process.exit(1); }

const oauth2 = new google.auth.OAuth2(
  matchId[1].trim(),
  matchSecret[1].trim(),
  'http://localhost:5101/oauth2callback'
);

const tokens = JSON.parse(readFileSync(tokenPath, 'utf-8'));
oauth2.setCredentials(tokens);

const youtube = google.youtube({ version: 'v3', auth: oauth2 });

// Upload real trimmed clip
if (existsSync(videoPath)) {
  const size = (await import('fs')).statSync(videoPath).size;
  console.log('Uploading:', videoPath, `(${Math.round(size/1024/1024)}MB)`);
  
  try {
    const res = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: 'Get Angry. Get Rich. - Andrew Tate',
          description: 'Real clip automatically downloaded and posted by ViralOps AI pipeline.',
          categoryId: '22',
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: createReadStream(videoPath),
        mimeType: 'video/mp4',
      },
    });
    console.log('SUCCESS! Video ID:', res.data.id);
    console.log('URL:', 'https://youtube.com/shorts/' + res.data.id);
  } catch (err) {
    console.log('UPLOAD FAILED:', err.message);
    if (err.response?.data?.error?.errors) {
      console.log('ERROR DETAILS:', JSON.stringify(err.response.data.error.errors, null, 2));
    }
    if (err.response?.data?.error?.message) {
      console.log('ERROR MESSAGE:', err.response.data.error.message);
    }
  }
} else {
  console.log('Video not found at:', videoPath);
}

// Check channels/playlists available
try {
  const channels = await youtube.channels.list({
    part: ['id', 'snippet', 'statistics'],
    mine: true,
  });
  const items = channels.data.items || [];
  console.log('\n=== CHANNELS ON THIS ACCOUNT ===');
  for (const c of items) {
    console.log(`- ${c.snippet?.title} (${c.id}) | Subs: ${c.statistics?.subscriberCount || 0} | Videos: ${c.statistics?.videoCount || 0}`);
  }
  
  // Try creating a brand channel via the API
  // Actually, the API doesn't support creating channels directly via OAuth
  // But we can check if manageable channels exist
  
  // List subscriptions/channel sections to find more
  try {
    const subs = await youtube.subscriptions.list({
      part: ['snippet'],
      mine: true,
      maxResults: 10,
    });
    console.log('\nSubscriptions count:', subs.data.pageInfo?.totalResults || 0);
  } catch {}
} catch (err) {
  console.log('CHANNEL LIST FAILED:', err.message);
}
