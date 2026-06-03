import { spawnSync } from 'child_process';
import { randomUUID } from 'crypto';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';
import type { LoggerLike } from '../types.js';

const OUTPUT_DIR = path.join(process.env.HOME || '/tmp', 'viralops-output');

interface GeneratedVideo {
  path: string;
  duration: number;
  caption: string;
}

/**
 * Generates real YouTube Shorts using FFmpeg
 * Creates text-overlay vertical videos without needing source clips
 */
export class VideoGenerator {
  private font: string;

  constructor(private logger: LoggerLike) {
    // Find available font for drawtext
    const candidates = [
      '/System/Library/Fonts/Helvetica.ttc',
      '/System/Library/Fonts/HelveticaNeue.ttc',
      '/System/Library/Fonts/Arial.ttf',
      '/System/Library/Fonts/SFNSDisplay.ttf',
    ];
    this.font = candidates.find(f => existsSync(f)) || '/System/Library/Fonts/HelveticaNeue.ttc';
    
    // Ensure output dir exists
    if (!existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR, { recursive: true });
    }
  }

  /**
   * Generate a YouTube Short from a quote/topic
   */
  generateShort(quote: string, durationSec: number = 15): GeneratedVideo {
    const id = randomUUID().slice(0, 8);
    const outputPath = path.join(OUTPUT_DIR, `short_${id}.mp4`);
    const width = 1080;
    const height = 1920;

    // Split long quotes, wrap text
    const wrapped = this.wrapText(quote, 25);

    // Build filter string
    const topBar = `drawbox=x=0:y=0:w=${width}:h=6:color=#ff6b35@0.9:t=fill`;
    const bottomBar = `drawbox=x=0:y=${height - 140}:w=${width}:h=140:color=#1a1a2e@0.7:t=fill`;
    const quoteFilter = this.buildDrawtext(wrapped, width, height);
    const brandFilter = this.buildSubtitleDrawtext(width, height);
    const fadeFilter = `fade=t=in:st=0:d=0.5,fade=t=out:st=${durationSec - 0.5}:d=0.5`;
    
    const filterStr = `${topBar},${bottomBar},${quoteFilter},${brandFilter},${fadeFilter}`;

    const result = spawnSync('ffmpeg', [
      '-y',
      '-f', 'lavfi',
      '-i', `color=c=#0a0a0a:s=${width}x${height}:d=${durationSec}:r=30`,
      '-vf', filterStr,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      outputPath,
    ], { timeout: 30000, stdio: 'pipe' });

    if (result.status !== 0) {
      const stderr = result.stderr?.toString() || 'unknown error';
      this.logger.error('Video generation failed', { error: stderr.slice(0, 300) });
      throw new Error(`FFmpeg error: ${stderr.slice(0, 200)}`);
    }

    this.logger.info(`Generated Short: ${outputPath} (${durationSec}s)`);
    return {
      path: outputPath,
      duration: durationSec,
      caption: quote.slice(0, 200),
    };
  }

  /**
   * Generate a batch of Shorts from topics
   */
  generateBatch(
    topics: string[],
    durationSec: number = 15
  ): GeneratedVideo[] {
    const videos: GeneratedVideo[] = [];

    for (const topic of topics) {
      // Generate multiple variations per topic
      const quotes = this.extractQuotes(topic);
      for (const quote of quotes) {
        try {
          const video = this.generateShort(quote, durationSec);
          videos.push(video);
        } catch (err) {
          this.logger.warn('Failed to generate video for quote', {
            quote: quote.slice(0, 50),
          });
        }
      }
    }

    return videos;
  }

  private extractQuotes(topic: string): string[] {
    // Extract quotes or create from topic
    const lines = topic.split('\n').filter((l) => l.trim());
    if (lines.length >= 3) {
      return lines.slice(0, 3).map((l) => l.trim().replace(/^[-*]\s*/, ''));
    }
    // If it's a long string, split into sentences
    const sentences = topic
      .split(/[.!?]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15 && s.length < 200);
    if (sentences.length >= 2) {
      return sentences.slice(0, 3);
    }
    // Fallback: just use the topic
    return [topic.slice(0, 180)];
  }

  private wrapText(text: string, maxLen: number): string {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).trim().length > maxLen) {
        if (current) lines.push(current.trim());
        current = word;
      } else {
        current = (current + ' ' + word).trim();
      }
    }
    if (current) lines.push(current.trim());
    return lines.join('\n');
  }

  private buildDrawtext(
    text: string,
    width: number,
    height: number
  ): string {
    const lines = text.split('\n');
    const lineCount = lines.length;
    const fontSize = lineCount <= 3 ? 72 : 56;
    const yPos = Math.floor(height / 2) - (lineCount * Math.floor(fontSize * 1.3)) / 2;

    // Use textfile to avoid shell escaping issues
    const textFilePath = path.join(OUTPUT_DIR, `_text_${randomUUID().slice(0, 4)}.txt`);
    writeFileSync(textFilePath, text, 'utf-8');

    return [
      `drawtext=textfile=${textFilePath}`,
      `fontfile=${this.font}`,
      `fontsize=${fontSize}`,
      `fontcolor=white`,
      `x=(w-text_w)/2`,
      `y=${yPos}`,
      `line_spacing=20`,
      `borderw=2`,
      `bordercolor=black@0.6`,
    ].join(':');
  }

  private buildSubtitleDrawtext(width: number, height: number): string {
    return [
      'drawtext=text=viralops.ai',
      `fontfile=${this.font}`,
      'fontsize=24',
      'fontcolor=white@0.4',
      'x=(w-text_w)/2',
      `y=${height - 90}`,
    ].join(':');
  }
}

export default VideoGenerator;
