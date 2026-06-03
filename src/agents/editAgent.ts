import { FFmpegService } from '../services/ffmpeg.js';
import { VideoGenerator } from '../services/videoGenerator.js';
import type { AgentContext, EditedVideo, VideoSegment, Agent, Platform } from '../types.js';
import { v4 as uuidv4 } from 'uuid';
import { FileStorage } from '../utils/fileStorage.js';
import { existsSync, statSync } from 'fs';

export class EditAgent implements Agent {
  id = 'edit' as const;
  name = 'Edit Agent';
  color = '#8B5CF6';
  private ffmpeg: FFmpegService;
  private videoGen: VideoGenerator;

  constructor() {
    const stubLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, child: () => stubLogger } as any;
    this.ffmpeg = new FFmpegService(stubLogger);
    this.videoGen = new VideoGenerator(stubLogger);
  }

  async execute(input: unknown, context: AgentContext): Promise<EditedVideo[]> {
    const { segments, platforms, style } = input as { segments: VideoSegment[]; platforms: string[]; style?: string };
    const { logger, claude, costTracker, eventBus, runId } = context;

    logger.info(`Edit Agent: editing ${segments.length} segments for ${platforms.length} platforms`);

    const editedVideos: EditedVideo[] = [];
    const fileStorage = new FileStorage(logger);
    const outputDir = await fileStorage.ensureDir(`runs/${runId}/edited`);
    const ffmpegAvailable = await this.ffmpeg.checkInstalled();

    for (const segment of segments) {
      for (const platform of platforms) {
        try {
          // Generate captions + hook with Claude
          let hookText = '';
          let captions: string[] = [];
          let hashtags: string[] = [];

          if (claude.complete) {
            try {
              const prompt = `Write viral content for ${platform}:\nHook (first 3s, attention-grabbing):\nVideo: "${segment.title}"\nDuration: ${segment.duration}s\nRespond as JSON: {"hook": string, "captions": string[], "hashtags": string[]}`;
              const { data, tokensUsed, costMs } = await claude.parseJSON<{ hook: string; captions: string[]; hashtags: string[] }>(prompt);
              hookText = data.hook; captions = data.captions; hashtags = data.hashtags;
              costTracker.trackAgent('edit', tokensUsed, costMs);
            } catch {
              hookText = segment.viralMoments[0] || 'Must watch!';
              captions = [hookText]; hashtags = ['#viral', '#fyp', `#${platform}`];
            }
          } else {
            hookText = segment.viralMoments[0] || 'Must watch!';
            captions = [hookText]; hashtags = ['#viral', '#fyp', `#${platform}`];
          }

          // Process video
          const outputFilename = `${segment.id}_${platform}.mp4`;
          const outputPath = `${outputDir}/${outputFilename}`;
          let finalPath = segment.videoPath || outputPath;
          let fileSize = 0;

          if (ffmpegAvailable && segment.videoPath) {
            try {
              const result = await this.ffmpeg.processVideo({
                inputPath: segment.videoPath, outputPath,
                startTime: segment.startTime, endTime: segment.endTime,
                addCaptions: true, captionText: captions.join('\\n'), hookText,
              });
              finalPath = result.outputPath; fileSize = result.fileSize;
            } catch (err) {
              logger.warn(`FFmpeg failed on source clip: ${(err as Error).message}`);
            }
          }

          // If no real video file was produced (mock path or FFmpeg failed),
          // generate a real Short from scratch using the text content
          if (!finalPath || !existsSync(finalPath)) {
            try {
              const quote = segment.viralMoments?.[0] || hookText || segment.title;
              logger.info(`No real video source — generating Short from text: "${quote.slice(0, 50)}..."`);
              const gen = this.videoGen.generateShort(quote, Math.min(segment.duration || 15, 30));
              finalPath = gen.path;
              fileSize = statSync(finalPath).size;
              logger.info(`Generated real video: ${finalPath} (${(fileSize / 1024 / 1024).toFixed(1)}MB)`);
            } catch (genErr) {
              logger.warn(`VideoGenerator also failed: ${(genErr as Error).message}`);
            }
          }

          const aspectRatios: Record<string, string> = { tiktok: '9:16', instagram: '9:16', youtube: '16:9', twitter: '1:1' };

          editedVideos.push({
            id: uuidv4(), segmentId: segment.id, platform: platform as Platform,
            videoPath: finalPath, thumbnailPath: segment.thumbnailPath || `${outputDir}/${segment.id}_thumb.jpg`,
            duration: segment.duration, fileSize, captionsBurned: ffmpegAvailable,
            hookText, hashtags, aspectRatio: aspectRatios[platform] || '9:16',
          });

          eventBus.emit('agent:edit:progress', { message: `Edited ${segment.title} → ${platform}` });

        } catch (err) {
          logger.warn(`Edit failed for ${platform}: ${(err as Error).message}`);
        }
      }
    }

    logger.info(`Edit Agent complete: ${editedVideos.length} videos`);
    await context.db.logAgentEvent(context.runId, 'edit', 'info', `Created ${editedVideos.length} edited videos`, { videos: editedVideos.map((v) => ({ platform: v.platform, duration: v.duration })) });

    return editedVideos;
  }
}

export default EditAgent;
