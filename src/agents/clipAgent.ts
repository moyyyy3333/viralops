import { YTDLPService } from '../services/ytdlp.js';
import type { AgentContext, VideoSegment, ViralTopic, Agent } from '../types.js';
import { v4 as uuidv4 } from 'uuid';
import { existsSync } from 'fs';
import { isYouTubeUrl } from '../utils/validators.js';
import { FileStorage } from '../utils/fileStorage.js';

export class ClipAgent implements Agent {
  id = 'clip' as const;
  name = 'Clip Agent';
  color = '#FFD23F';
  private ytdlp: YTDLPService;

  constructor() {
    const stubLogger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {}, child: () => stubLogger } as any;
    this.ytdlp = new YTDLPService(stubLogger);
  }

  async execute(input: unknown, context: AgentContext): Promise<VideoSegment[]> {
    const { topics, maxSegments } = input as { topics: ViralTopic[]; maxSegments: number };
    const { logger, claude, costTracker, eventBus, runId } = context;

    logger.info(`Clip Agent: processing ${topics.length} topics, max ${maxSegments} segments`);

    const allSegments: VideoSegment[] = [];
    const fileStorage = new FileStorage(logger);

    for (const topic of topics) {
      if (allSegments.length >= maxSegments) break;

      try {
        logger.info(`Processing: ${topic.title}`);

        let title = topic.title;
        let duration = 600;

        if (isYouTubeUrl(topic.sourceUrl)) {
          try {
            const info = await this.ytdlp.getVideoInfo(topic.sourceUrl);
            title = info.title;
            duration = info.duration;
          } catch {
            logger.warn('Could not get video info, using defaults');
          }
        }

        // Use Claude to identify viral moments, or fallback
        let moments: Array<{ startTime: number; endTime: number; description: string; confidence: number }> = [];

        if (claude.complete) {
          try {
            const prompt = `Given this video:\nTitle: "${title}"\nDuration: ${duration}s\nTopic: ${topic.title}\nViral Score: ${topic.viralScore}/100\n\nIdentify ${Math.min(3, maxSegments - allSegments.length)} viral-worthy clip segments (30-90s each). Provide startTime, endTime, description, confidence (1-100) as JSON array.`;
            const { data, tokensUsed, costMs } = await claude.parseJSON<typeof moments>(prompt);
            moments = data.filter((m) => m.endTime - m.startTime >= 15 && m.endTime - m.startTime <= 180);
            costTracker.trackAgent('clip', tokensUsed, costMs);
          } catch {
            moments = this.fallbackMoments(duration, Math.min(2, maxSegments - allSegments.length));
          }
        } else {
          moments = this.fallbackMoments(duration, Math.min(2, maxSegments - allSegments.length));
        }

        const outputDir = await fileStorage.ensureDir(`runs/${runId}`);
        const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);

        for (const m of moments) {
          const segmentPath = `${outputDir}/${safeTitle}_${m.startTime}-${m.endTime}.mp4`;
          let actualPath = segmentPath;

          // Try to download the real video segment
          if (isYouTubeUrl(topic.sourceUrl)) {
            try {
              const dl = await this.ytdlp.downloadVideo(topic.sourceUrl, outputDir, { maxDuration: Math.min(m.endTime - m.startTime + 10, 90) });
              const downloadedPath = dl.videoPath;
              if (existsSync(downloadedPath)) {
                actualPath = downloadedPath;
                logger.info(`Downloaded real clip: ${downloadedPath}`);
              }
            } catch (dlErr) {
              logger.warn(`yt-dlp download failed for ${topic.sourceUrl}: ${(dlErr as Error).message}`);
            }
          }

          allSegments.push({
            id: uuidv4(),
            sourceUrl: topic.sourceUrl,
            title: `${safeTitle} — ${m.description.slice(0, 50)}`,
            startTime: m.startTime,
            endTime: m.endTime,
            duration: m.endTime - m.startTime,
            videoPath: actualPath,
            thumbnailPath: `${outputDir}/${safeTitle}_${m.startTime}.jpg`,
            transcript: '',
            viralMoments: [m.description],
            confidence: m.confidence,
          });
        }

        eventBus.emit('agent:clip:progress', { message: `Created ${moments.length} segments for ${title}` });

      } catch (err) {
        logger.warn(`Failed topic "${topic.title}": ${(err as Error).message}`);
      }
    }

    logger.info(`Clip Agent complete: ${allSegments.length} segments`);
    await context.db.logAgentEvent(context.runId, 'clip', 'info', `Created ${allSegments.length} segments`, { segments: allSegments.map((s) => ({ title: s.title, duration: s.duration })) });

    return allSegments;
  }

  private fallbackMoments(duration: number, count: number): Array<{ startTime: number; endTime: number; description: string; confidence: number }> {
    const moments: typeof this.fallbackMoments extends () => infer R ? R : never = [];
    const segDur = Math.min(60, Math.floor(duration / (count + 1)));
    for (let i = 0; i < count; i++) {
      const start = Math.floor(duration * (i + 1) / (count + 1));
      moments.push({ startTime: start, endTime: start + segDur, description: `Viral moment ${i + 1}`, confidence: 65 + i * 10 });
    }
    return moments;
  }
}

export default ClipAgent;
