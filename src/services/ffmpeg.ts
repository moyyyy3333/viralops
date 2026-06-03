import { spawn } from 'child_process';
import fs from 'fs';
import type { LoggerLike } from '../types.js';

export interface FFmpegOptions {
  inputPath: string;
  outputPath: string;
  startTime?: number;
  endTime?: number;
  width?: number;
  height?: number;
  addCaptions?: boolean;
  captionText?: string;
  hookText?: string;
  backgroundBlur?: boolean;
}

export class FFmpegService {
  constructor(private logger: LoggerLike) {}

  async checkInstalled(): Promise<boolean> {
    try {
      await fs.promises.access('/Users/mymac/.local/bin/ffmpeg');
      return true;
    } catch {
      return new Promise((resolve) => {
        const proc = spawn('ffmpeg', ['-version']);
        proc.on('close', (code) => resolve(code === 0));
        proc.on('error', () => resolve(false));
      });
    }
  }

  async extractSegment(options: FFmpegOptions): Promise<{ outputPath: string; duration: number; fileSize: number }> {
    const args = ['-y', '-i', options.inputPath];

    if (options.startTime !== undefined) args.push('-ss', String(options.startTime));
    if (options.endTime !== undefined) {
      const duration = options.endTime - (options.startTime || 0);
      args.push('-t', String(duration));
    }

    args.push('-c', 'copy', '-avoid_negative_ts', 'make_zero', options.outputPath);

    const { exitCode } = await this.runFFmpeg(args);
    if (exitCode !== 0) throw new Error(`FFmpeg segment extraction failed`);

    const fileSize = await this.getFileSize(options.outputPath);
    const videoDuration = options.endTime && options.startTime
      ? options.endTime - options.startTime
      : await this.getVideoDuration(options.outputPath);

    return { outputPath: options.outputPath, duration: videoDuration, fileSize };
  }

  async formatForPlatform(inputPath: string, outputPath: string, platform: 'tiktok' | 'youtube' | 'twitter' | 'instagram'): Promise<{ outputPath: string; width: number; height: number }> {
    const dimensions: Record<string, [number, number]> = {
      tiktok: [1080, 1920],
      instagram: [1080, 1920],
      youtube: [1920, 1080],
      twitter: [1080, 1080],
    };
    const [w, h] = dimensions[platform] || [1080, 1920];

    const vf = `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:black`;
    const { exitCode } = await this.runFFmpeg([
      '-y', '-i', inputPath, '-vf', vf, '-c:a', 'copy', outputPath,
    ]);

    if (exitCode !== 0) throw new Error(`FFmpeg format failed for ${platform}`);
    return { outputPath, width: w, height: h };
  }

  async burnCaptions(inputPath: string, outputPath: string, captions: string[]): Promise<string> {
    if (captions.length === 0) return inputPath;

    const drawtexts = captions.map((cap, i) => {
      const escaped = this.escapeDrawtext(cap);
      const yPos = 50 + i * 60;
      return `drawtext=text='${escaped}':fontsize=36:fontcolor=white:x=(w-text_w)/2:y=h*0.85-${yPos}:box=1:boxcolor=black@0.6:boxborderw=4`;
    }).join(',');

    const { exitCode } = await this.runFFmpeg([
      '-y', '-i', inputPath, '-vf', drawtexts, '-c:a', 'copy', outputPath,
    ]);

    if (exitCode !== 0) throw new Error('FFmpeg caption burn failed');
    return outputPath;
  }

  async addHookOverlay(inputPath: string, outputPath: string, hookText: string): Promise<string> {
    const escaped = this.escapeDrawtext(hookText);
    const vf = `drawtext=text='${escaped}':fontsize=48:fontcolor=yellow:x=(w-text_w)/2:y=h*0.15:box=1:boxcolor=black@0.7:boxborderw=6:enable='lte(t,3)'`;

    const { exitCode } = await this.runFFmpeg([
      '-y', '-i', inputPath, '-vf', vf, '-c:a', 'copy', outputPath,
    ]);

    if (exitCode !== 0) throw new Error('FFmpeg hook overlay failed');
    return outputPath;
  }

  async processVideo(options: FFmpegOptions): Promise<{ outputPath: string; duration: number; fileSize: number }> {
    let currentPath = options.inputPath;
    let isTemp = false;

    try {
      // Step 1: Extract segment
      if (options.startTime !== undefined && options.endTime !== undefined) {
        const segPath = options.outputPath.replace('.mp4', '_seg.mp4');
        await this.extractSegment({ ...options, outputPath: segPath });
        currentPath = segPath;
        isTemp = true;
      }

      // Step 2: Add captions
      if (options.addCaptions && options.captionText) {
        const capPath = options.outputPath.replace('.mp4', '_cap.mp4');
        await this.burnCaptions(currentPath, capPath, options.captionText.split('\\n').filter(Boolean));
        if (isTemp && currentPath !== options.inputPath) { /* could delete temp */ }
        currentPath = capPath;
        isTemp = true;
      }

      // Step 3: Add hook
      if (options.hookText) {
        const hookPath = options.outputPath.replace('.mp4', '_hook.mp4');
        await this.addHookOverlay(currentPath, hookPath, options.hookText);
        currentPath = hookPath;
        isTemp = true;
      }

      // Final: copy to output path
      const final = await this.extractSegment({ inputPath: currentPath, outputPath: options.outputPath });
      return final;

    } catch (error) {
      throw error;
    }
  }

  private async runFFmpeg(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const proc = spawn('/Users/mymac/.local/bin/ffmpeg', args, { timeout: 300000 });
      let stdout = '';
      let stderr = '';
      proc.stdout?.on('data', (d) => stdout += d);
      proc.stderr?.on('data', (d) => stderr += d);
      proc.on('close', (code) => resolve({ exitCode: code ?? 0, stdout, stderr }));
      proc.on('error', (err) => reject(err));
    });
  }

  private async getFileSize(path: string): Promise<number> {
    const { stat } = await import('fs/promises');
    try { const s = await stat(path); return s.size; } catch { return 0; }
  }

  private async getVideoDuration(path: string): Promise<number> {
    return new Promise((resolve) => {
      const proc = spawn('/Users/mymac/.local/bin/ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', path]);
      let out = '';
      proc.stdout?.on('data', (d) => out += d);
      proc.on('close', () => resolve(parseFloat(out) || 0));
      proc.on('error', () => resolve(0));
    });
  }

  private escapeDrawtext(text: string): string {
    return text.replace(/'/g, "'\\''").replace(/:/g, '\\:').replace(/\n/g, ' ').slice(0, 100);
  }
}

export default FFmpegService;
