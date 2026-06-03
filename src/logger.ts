import pino from 'pino';
import { config } from './config.js';
import type { LoggerLike } from './types.js';

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

class PinoWrapper implements LoggerLike {
  constructor(private logger: pino.Logger) {}

  info(msg: string, meta?: Record<string, unknown>): void {
    this.logger.info(meta ?? {}, msg);
  }
  warn(msg: string, meta?: Record<string, unknown>): void {
    this.logger.warn(meta ?? {}, msg);
  }
  error(msg: string, meta?: Record<string, unknown>): void {
    this.logger.error(meta ?? {}, msg);
  }
  debug(msg: string, meta?: Record<string, unknown>): void {
    this.logger.debug(meta ?? {}, msg);
  }
  child(bindings: Record<string, unknown>): LoggerLike {
    return new PinoWrapper(this.logger.child(bindings));
  }
}

export const logger = new PinoWrapper(baseLogger);
export default logger;
