import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { writeFile } from 'fs/promises';
import type { LoggerLike } from '../types.js';

export class FileStorage {
  constructor(private logger: LoggerLike) {}

  async ensureDir(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  }

  async save(path: string, data: Buffer | string): Promise<void> {
    await this.ensureDir(dirname(path));
    await writeFile(path, data);
    this.logger.debug(`File saved: ${path}`);
  }
}
