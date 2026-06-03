import { spawn } from 'child_process';
import fs from 'fs';
import { config } from '../config.js';
import type { LoggerLike } from '../types.js';

export class YTDLPService {
  constructor(private logger: LoggerLike) {}

  private async binaryOnPath(): Promise<boolean> {
    const locations = ['yt-dlp', '/Users/mymac/.local/bin/yt-dlp', '/usr/local/bin/yt-dlp', '/opt/homebrew/bin/yt-dlp'];
    for (const loc of locations) {
      try {
        await fs.promises.access(loc);
        return true;
      } catch {}
    }
    return false;
  }

  private async resolveBinary(): Promise<string> {
    const locations = ['yt-dlp', '/Users/mymac/.local/bin/yt-dlp', '/usr/local/bin/yt-dlp', '/opt/homebrew/bin/yt-dlp'];
    for (const loc of locations) {
      try {
        await fs.promises.access(loc);
        return loc;
      } catch {}
    }
    return 'yt-dlp';
  }

  async downloadVideo(url: string, outputDir: string, opts?: { maxDuration?: number }): Promise<{
    videoPath: string; title: string; duration: number; thumbnail?: string;
  }> {
    const binary = await this.resolveBinary();
    if (binary === 'yt-dlp') {
      const onPath = await this.binaryOnPath();
      if (!onPath) {
        this.logger.warn('yt-dlp not installed — returning mock data');
        return { videoPath: `${outputDir}/mock_video.mp4`, title: 'Mock Video', duration: 600 };
      }
    }

    const safeId = url.match(/[\w-]{10,12}/)?.[0] || Math.random().toString(36).slice(2, 8);

    this.logger.info(`yt-dlp: downloading ${url}`);
    return new Promise((resolve, reject) => {
      const args = [
        '--extractor-args', 'youtube:player_client=android',
        '-f', '18', // 360p h264+aac — good for Shorts
        '--restrict-filenames',
        '-o', `${outputDir}/${safeId}.%(ext)s`,
        '--no-warnings', url,
      ];

      // Note: --download-sections disabled (yt-dlp bug with android client)
      // FFmpeg handles trimming in Edit Agent

      const proc = spawn(binary, args, { timeout: 120000, env: { ...process.env, PATH: `${process.env.PATH || ''}:/Users/mymac/.local/bin` } });
      let stdout = '';
      let stderr = '';
      proc.stdout?.on('data', (d) => { stdout += d; });
      proc.stderr?.on('data', (d) => { stderr += d; });

      proc.on('close', async (code) => {
        if (code !== 0) {
          reject(new Error(`yt-dlp exit ${code}: ${stderr.slice(0, 500)}`));
          return;
        }
        
        const fullPath = `${outputDir}/${safeId}.mp4`;
        
        // Get metadata from a separate quick call
        let title = 'Unknown';
        let duration = 600;
        try {
          const info = await this.getVideoInfo(url);
          title = info.title;
          duration = info.duration;
        } catch {}

        // Trim to first 60s for Shorts (smaller file, faster upload)
        const trimmedPath = `${outputDir}/${safeId}_trimmed.mp4`;
        try {
          const { spawnSync } = await import('child_process');
          const result = spawnSync('/Users/mymac/.local/bin/ffmpeg', [
            '-y', '-i', fullPath,
            '-t', '60',
            '-c', 'copy',
            '-avoid_negative_ts', 'make_zero',
            trimmedPath,
          ], { timeout: 30000, stdio: 'pipe' });
          if (result.status === 0) {
            this.logger.info('Trimmed video to 60s for Shorts upload');
            resolve({
              videoPath: trimmedPath,
              title,
              duration: 60,
            });
            return;
          }
        } catch {}
        
        // Fallback: use full file
        resolve({
          videoPath: fullPath,
          title,
          duration,
        });
      });

      proc.on('error', (err) => reject(err));
    });
  }

  async getVideoInfo(url: string): Promise<{
    title: string; duration: number; uploader: string; viewCount: number;
    description: string; uploadDate: string;
  }> {
    const binary = await this.resolveBinary();
    if (binary === 'yt-dlp') {
      const onPath = await this.binaryOnPath();
      if (!onPath) {
        return { title: 'Unknown', duration: 600, uploader: 'Unknown', viewCount: 0, description: '', uploadDate: '' };
      }
    }

    return new Promise((resolve, reject) => {

      const proc = spawn(binary, ['--extractor-args', 'youtube:player_client=android', '--dump-json', '--no-download', url], { timeout: 60000, env: { ...process.env, PATH: `${process.env.PATH || ''}:/Users/mymac/.local/bin` } });
      let stdout = '';
      proc.stdout?.on('data', (d) => { stdout += d; });
      proc.on('close', () => {
        try {
          const info = JSON.parse(stdout);
          resolve({
            title: info.title || 'Unknown',
            duration: info.duration || 0,
            uploader: info.uploader || 'Unknown',
            viewCount: info.view_count || 0,
            description: info.description || '',
            uploadDate: info.upload_date || '',
          });
        } catch {
          reject(new Error('Failed to parse yt-dlp JSON output'));
        }
      });
      proc.on('error', (err) => reject(err));
    });
  }

  async extractAudio(videoPath: string, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('ffmpeg', ['-y', '-i', videoPath, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', outputPath], { timeout: 120000, env: { ...process.env, PATH: `${process.env.PATH || ''}:/Users/mymac/.local/bin` } });
      proc.on('close', (code) => {
        if (code === 0) resolve(outputPath);
        else reject(new Error(`ffmpeg audio extract failed with code ${code}`));
      });
      proc.on('error', (err) => reject(err));
    });
  }
}

export default YTDLPService;
