#!/usr/bin/env node
// YouTube OAuth — generates URL + starts local server on :5101
import { createServer } from 'http';
import { writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_CACHE = join(__dirname, '..', '.youtube-tokens.json');

// Using http://localhost (standard for Desktop OAuth clients)
// If this is a Web app client, add: http://localhost:5101/oauth2callback in Google Cloud Console
const CLIENT_ID = 'YOUTUBE_CLIENT_ID_REMOVED';
const CLIENT_SECRET = '***';
const REDIRECT_URI = 'http://localhost:5101/oauth2callback';
const ALT_REDIRECT = 'http://localhost/oauth2callback';
const PORT = 5101;

const server = createServer(async (req, res) => {
  if (!req.url) return;
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/oauth2callback') {
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end(`<h2>❌ Auth failed: ${error}</h2><p>Close and try again.</p>`);
      console.log('❌ Auth error:', error);
      return;
    }

    if (!code) {
      res.writeHead(400, { 'Content-Type': 'text/html' });
      res.end('<h2>❌ No auth code received</h2>');
      return;
    }

    try {
      const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResp.json();

      if (tokens.access_token) {
        await writeFile(TOKEN_CACHE, JSON.stringify({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || '',
          saved_at: new Date().toISOString(),
        }, null, 2));

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`<h2>✅ YouTube Authorized!</h2>
          <p>Access token saved.</p>
          <p>Refresh token: ${tokens.refresh_token ? '✅ Saved' : '⚠️ Not received'}</p>
          <p>Close this tab.</p>`);
        console.log('✅ YouTube OAuth success!', tokens.refresh_token ? 'with refresh token' : 'NO refresh token');
      } else {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h2>❌ Token exchange failed</h2><pre>${JSON.stringify(tokens, null, 2)}</pre>`);
        console.log('❌ Token exchange failed:', tokens);
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h2>❌ Error: ${err.message}</h2>`);
      console.log('❌ Error:', err.message);
    } finally {
      server.close();
      setTimeout(() => process.exit(0), 2000);
    }
  } else {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<h3>YouTube OAuth callback server running</h3>
      <p>If you see a code in the URL bar, paste it here:</p>
      <form method="GET" action="/oauth2callback">
        <input name="code" size="80" placeholder="Paste code here">
        <button type="submit">Submit</button>
      </form>`);
  }
});

server.listen(PORT, () => {
  console.log(`\n  🎬 YouTube OAuth — waiting on http://localhost:${PORT}`);
  console.log('');
  console.log('  🔴 STEP 1: Go to https://console.cloud.google.com/apis/credentials');
  console.log('  🔴 STEP 2: Click your OAuth 2.0 Client ID');
  console.log('  🔴 STEP 3: Under "Authorized redirect URIs" add:');
  console.log('    http://localhost:5101/oauth2callback');
  console.log('  🔴 STEP 4: Click Save');
  console.log('');
  console.log('  ✅ Then open this URL in your browser:');
  console.log(`  https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly')}&access_type=offline&prompt=consent`);
  console.log('');
  console.log('  Waiting for callback...');
});

setTimeout(() => {
  console.log('\n  ⏰ Timeout. Restart with: npx tsx src/youtube-oauth-server.ts');
  server.close();
  process.exit(0);
}, 180000);
