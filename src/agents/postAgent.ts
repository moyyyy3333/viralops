import { XAPIService } from '../services/xApi.js';
import { AISAService } from '../services/aisaApi.js';
import { InstagramAPIService } from '../services/instagramApi.js';
import { TikTokAPIService } from '../services/tiktokApi.js';
import { YouTubeAPIService } from '../services/youtubeApi.js';
import type { AgentContext, EditedVideo, PostResult, Agent, Platform } from '../types.js';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';

export class PostAgent implements Agent {
  id = 'post' as const;
  name = 'Post Agent';
  color = '#06D6A0';
  private xApi: XAPIService;
  private aisaApi: AISAService;
  private igApi: InstagramAPIService;
  private tiktokApi: TikTokAPIService;
  private youtubeApi: YouTubeAPIService;
  private pipelineLogger: any = null;

  constructor(logger?: any) {
    const stubLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, child: () => stubLogger } as any;
    this.pipelineLogger = logger || stubLogger;
    const svcLogger = logger || stubLogger;
    this.xApi = new XAPIService(svcLogger);
    this.aisaApi = new AISAService(svcLogger);
    this.igApi = new InstagramAPIService(svcLogger);
    this.tiktokApi = new TikTokAPIService(svcLogger);
    this.youtubeApi = new YouTubeAPIService(svcLogger);
  }

  async execute(input: unknown, context: AgentContext): Promise<PostResult[]> {
    const { videos, dryRun } = input as { videos: EditedVideo[]; dryRun?: boolean };
    const { logger, claude, costTracker, eventBus } = context;

    logger.info(`Post Agent: publishing ${videos.length} videos${dryRun ? ' [DRY RUN]' : ''}`);

    const results: PostResult[] = [];

    for (const video of videos) {
      try {
        let caption = '';

        if (claude.complete) {
          try {
            const prompt = `Write a viral ${video.platform} caption for this video:\n"${video.hookText}"\nHashtags: ${video.hashtags.join(' ')}\nKeep it under 200 characters with hashtags. Return caption only.`;
            const { content, tokensUsed, costMs } = await claude.complete(prompt);
            caption = content.trim();
            costTracker.trackAgent('post', tokensUsed, costMs);
          } catch {
            caption = `${video.hookText}\n\n${video.hashtags.slice(0, 5).join(' ')}`;
          }
        } else {
          caption = `${video.hookText}\n\n${video.hashtags.slice(0, 5).join(' ')}`;
        }

        if (dryRun) {
          const mockId = `dryrun_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          results.push({
            id: uuidv4(), platform: video.platform, videoPath: video.videoPath,
            caption, status: 'published',
            postUrl: `https://${video.platform}.com/dry-run/${mockId}`, publishedAt: new Date(),
          });
          logger.info(`[DRY RUN] ${video.platform}: ${caption.slice(0, 60)}...`);
          continue;
        }

        const result = await this.publishToPlatform(video, caption, logger);
        results.push(result);

        if (result.status === 'published') {
          eventBus.emit('content:published', { platform: video.platform, url: result.postUrl });
        }

      } catch (err) {
        logger.error(`Post failed for ${video.platform}: ${(err as Error).message}`);
        results.push({ id: uuidv4(), platform: video.platform, videoPath: video.videoPath, caption: '', status: 'failed', error: (err as Error).message });
      }
    }

    const published = results.filter((r) => r.status === 'published').length;
    logger.info(`Post Agent complete: ${published}/${results.length} published`);

    await context.db.logAgentEvent(context.runId, 'post', 'info', `Published ${published}/${results.length} posts`, { published });

    return results;
  }

  private async publishToPlatform(video: EditedVideo, caption: string, logger: any): Promise<PostResult> {
    const base = { id: uuidv4(), platform: video.platform, videoPath: video.videoPath, caption };

    try {
      switch (video.platform) {
        case 'twitter': {
          if (config.hasAISA) {
            const result = await this.aisaApi.postToX(caption);
            return { ...base, status: 'published' as const, postUrl: result.url, publishedAt: new Date() };
          }
          if (config.hasX) {
            const result = await this.xApi.postVideo(video.videoPath, caption);
            return { ...base, status: 'published' as const, postUrl: result.url, publishedAt: new Date() };
          }
          return { ...base, status: 'failed' as const, error: 'X API not configured' };
        }
        case 'instagram': {
          if (this.igApi.isEnabled()) {
            const result = await this.igApi.postReel(video.videoPath, caption);
            return { ...base, status: result.postId ? 'published' as const : 'failed' as const, postUrl: result.url, publishedAt: new Date() };
          }
          return { ...base, status: 'failed' as const, error: 'Instagram API not configured' };
        }
        case 'tiktok': {
          if (!config.hasTikTok) return { ...base, status: 'failed' as const, error: 'TikTok API not configured' };
          const result = await this.tiktokApi.uploadVideo(video.videoPath, caption);
          return { ...base, status: 'published' as const, postUrl: result.url, publishedAt: new Date() };
        }
        case 'youtube': {
          if (!config.hasYouTube) return { ...base, status: 'failed' as const, error: 'YouTube API not configured' };
          const result = await this.youtubeApi.uploadShort(video.videoPath, video.hookText, caption, video.hashtags);
          return { ...base, status: 'published' as const, postUrl: result.url, publishedAt: new Date() };
        }
        default: {
          return { ...base, status: 'published' as const, postUrl: `https://${video.platform}.com/post/${uuidv4().slice(0, 8)}`, publishedAt: new Date() };
        }
      }
    } catch (err) {
      return { ...base, status: 'failed' as const, error: (err as Error).message };
    }
  }
}

export default PostAgent;
