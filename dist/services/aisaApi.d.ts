import type { LoggerLike } from '../types.js';
export declare class AISAService {
    private logger;
    private enabled;
    private apiKey;
    constructor(logger: LoggerLike);
    postToX(text: string): Promise<{
        postId: string;
        url: string;
    }>;
    isEnabled(): boolean;
}
export default AISAService;
//# sourceMappingURL=aisaApi.d.ts.map