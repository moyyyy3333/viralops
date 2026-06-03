import type { EventBusLike, LoggerLike } from './types.js';

type Handler = (data: Record<string, unknown>) => void;

export class AgentEventBus implements EventBusLike {
  private handlers: Map<string, Set<Handler>> = new Map();

  constructor(private logger: LoggerLike) {}

  emit(event: string, data: Record<string, unknown>): void {
    const set = this.handlers.get(event);
    if (set) {
      set.forEach((h) => {
        try { h(data); } catch (e) { /* noop */ }
      });
    }
  }

  on(event: string, handler: Handler): void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
  }

  off(event: string, handler: Handler): void {
    this.handlers.get(event)?.delete(handler);
  }
}

export const Events = {
  PIPELINE_START: 'pipeline:start',
  PIPELINE_COMPLETE: 'pipeline:complete',
  PIPELINE_ERROR: 'pipeline:error',
  AGENT_START: (id: string) => `agent:${id}:start`,
  AGENT_COMPLETE: (id: string) => `agent:${id}:complete`,
  AGENT_ERROR: (id: string) => `agent:${id}:error`,
  AGENT_PROGRESS: (id: string) => `agent:${id}:progress`,
} as const;
