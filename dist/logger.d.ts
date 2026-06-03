import pino from 'pino';
import type { LoggerLike } from './types.js';
declare class PinoWrapper implements LoggerLike {
    private logger;
    constructor(logger: pino.Logger);
    info(msg: string, meta?: Record<string, unknown>): void;
    warn(msg: string, meta?: Record<string, unknown>): void;
    error(msg: string, meta?: Record<string, unknown>): void;
    debug(msg: string, meta?: Record<string, unknown>): void;
    child(bindings: Record<string, unknown>): LoggerLike;
}
export declare const logger: PinoWrapper;
export default logger;
//# sourceMappingURL=logger.d.ts.map