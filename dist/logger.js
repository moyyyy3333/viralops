import pino from 'pino';
import { config } from './config.js';
const baseLogger = pino({
    level: config.logLevel,
    transport: process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname',
                messageFormat: '{msg} {if agent}[{agent}]{end}',
            },
        }
        : undefined,
    base: {
        app: 'viralops',
        version: '1.0.0',
    },
});
class PinoWrapper {
    logger;
    constructor(logger) {
        this.logger = logger;
    }
    info(msg, meta) {
        this.logger.info(meta ?? {}, msg);
    }
    warn(msg, meta) {
        this.logger.warn(meta ?? {}, msg);
    }
    error(msg, meta) {
        this.logger.error(meta ?? {}, msg);
    }
    debug(msg, meta) {
        this.logger.debug(meta ?? {}, msg);
    }
    child(bindings) {
        return new PinoWrapper(this.logger.child(bindings));
    }
}
export const logger = new PinoWrapper(baseLogger);
export default logger;
//# sourceMappingURL=logger.js.map