import type { LoggerLike } from '../types.js';
export declare class FileStorage {
    private logger;
    constructor(logger: LoggerLike);
    ensureDir(path: string): Promise<void>;
    save(path: string, data: Buffer | string): Promise<void>;
}
//# sourceMappingURL=fileStorage.d.ts.map