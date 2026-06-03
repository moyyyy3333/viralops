import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { writeFile } from 'fs/promises';
export class FileStorage {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    async ensureDir(path) {
        await mkdir(path, { recursive: true });
    }
    async save(path, data) {
        await this.ensureDir(dirname(path));
        await writeFile(path, data);
        this.logger.debug(`File saved: ${path}`);
    }
}
//# sourceMappingURL=fileStorage.js.map