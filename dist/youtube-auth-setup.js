#!/usr/bin/env node
import { google } from "googleapis";
import { createServer } from "http";
import { writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const TOKEN_CACHE = join(__dirname, "..", ".youtube-tokens.json");
const CLIENT_ID = "YOUTUBE_CLIENT_ID_REMOVED";
const CLIENT_SECRET = "YOUTUBE_CLIENT_SECRET_REMOVED";
const PORT = 5101;
const redirectUri = "http://localhost:" + PORT + "/oauth2callback";
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, redirectUri);
const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/youtube.readonly"],
    prompt: "consent",
});
const server = createServer(async (req, res) => {
    if (!req.url)
        return;
    const url = new URL(req.url, "http://localhost:" + PORT);
    if (url.pathname === "/oauth2callback") {
        const code = url.searchParams.get("code");
        const error = url.searchParams.get("error");
        if (error) {
            res.writeHead(400).end("Error");
            console.log(error);
            server.close();
            process.exit(1);
            return;
        }
        if (!code) {
            res.writeHead(400).end("No code");
            return;
        }
        try {
            const { tokens } = await oauth2Client.getToken(code);
            if (tokens.access_token) {
                await writeFile(TOKEN_CACHE, JSON.stringify({ access_token: tokens.access_token, refresh_token: tokens.refresh_token || "", expiry_date: tokens.expiry_date || 0 }, null, 2));
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end("<h2>OK! YouTube Authorized</h2><p>" + (tokens.refresh_token ? "Refresh token saved" : "No refresh token") + "</p>");
                console.log('SUCCESS: YouTube OAuth tokens saved');
            }
            else {
                res.writeHead(400).end(JSON.stringify(tokens));
                console.log('FAIL:', JSON.stringify(tokens));
            }
        }
        catch (err) {
            res.writeHead(500).end(err.message);
            console.log('ERROR:', err.message);
        }
        finally {
            server.close();
            setTimeout(() => process.exit(0), 2000);
        }
    }
    else {
        res.writeHead(200).end("<h3>Waiting...</h3>");
    }
});
server.listen(PORT, () => { console.log(''); console.log('URL: ' + authUrl); console.log(''); });
setTimeout(() => { server.close(); process.exit(0); }, 180000);
//# sourceMappingURL=youtube-auth-setup.js.map