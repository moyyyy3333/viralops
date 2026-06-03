import { google } from "googleapis";
import { readFile, writeFile } from "fs/promises";
import { createReadStream } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { LoggerLike } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// Resolve token path relative to project root (handles tsx __dirname quirks)
const PROJECT_ROOT = join(__dirname, "..", "..");
const TOKEN_CACHE = join(PROJECT_ROOT, ".youtube-tokens.json");
const AISA_API = "https://api.aisa.one";

export class YouTubeAPIService {
  private enabled: boolean;
  private clientId: string;
  private clientSecret: string;
  private auth: any = null;
  private youtube: any = null;

  constructor(private logger: LoggerLike) {
    this.clientId = process.env.YOUTUBE_CLIENT_ID || "";
    this.clientSecret = process.env.YOUTUBE_CLIENT_SECRET || "YOUTUBE_CLIENT_SECRET_REMOVED";
    this.enabled = !!(this.clientId && this.clientSecret);
    this.initAuth();
  }

  private async initAuth() {
    try {
      const fs = await import("fs");
      if (fs.existsSync(TOKEN_CACHE)) {
        const data = JSON.parse(await readFile(TOKEN_CACHE, "utf8"));
        const redirectUri = "http://localhost:5101/oauth2callback";
        const { google } = await import("googleapis");
        this.auth = new google.auth.OAuth2(this.clientId, this.clientSecret, redirectUri);
        this.auth.setCredentials(data);
        this.youtube = google.youtube({ version: "v3", auth: this.auth });
        this.logger.info("YouTube auth loaded from cached tokens");
      } else {
        this.logger.warn("No YouTube tokens cached - run youtube-auth first");
      }
    } catch (err) {
      this.logger.warn("YouTube auth init failed: " + (err as Error).message);
    }
  }

  private async ensureAuth() {
    if (!this.auth || !this.youtube) {
      await this.initAuth();
    }
    if (!this.auth || !this.youtube) return false;
    try {
      const tokens = this.auth.credentials;
      if (tokens.expiry_date && Date.now() > tokens.expiry_date - 60000) {
        this.logger.info("YouTube token expired, refreshing...");
        const { credentials } = await this.auth.refreshAccessToken();
        await writeFile(TOKEN_CACHE, JSON.stringify(credentials, null, 2));
        this.auth.setCredentials(credentials);
        this.logger.info("YouTube token refreshed");
      }
      return true;
    } catch {
      return false;
    }
  }

  async uploadShort(videoPath: string, title: string, description: string, tags: string[]): Promise<{ videoId: string; url: string }> {
    if (!(await this.ensureAuth())) {
      return { videoId: "", url: "" };
    }

    try {
      // Sanitize: strip newlines, non-ASCII arrows, emoji-like glyphs
      const cleanTitle = title.replace(/[\n\r]/g, " ").replace(/[\u2190-\u21FF\u25A0-\u25FF\u2600-\u27BF]/g, "").slice(0, 100);
      const cleanDesc = description.replace(/[\n\r]/g, " ").replace(/[\u2190-\u21FF\u25A0-\u25FF\u2600-\u27BF]/g, "").slice(0, 5000);

      const fullDesc = cleanDesc + "\n\n" + tags.slice(0, 15).join(" ");

      const res = await this.youtube.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title: cleanTitle,
            description: fullDesc.slice(0, 5000),
            categoryId: "22",
          },
          status: {
            privacyStatus: "public",
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: createReadStream(videoPath),
          mimeType: "video/mp4",
        },
      });

      const videoId = res.data.id;
      this.logger.info("YouTube Short uploaded: " + videoId);
      return { videoId, url: "https://youtube.com/shorts/" + videoId };
    } catch (err) {
      this.logger.error("YouTube upload failed: " + (err as Error).message);
      return { videoId: "", url: "" };
    }
  }
}

export default YouTubeAPIService;
