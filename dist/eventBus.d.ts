import type { EventBusLike, LoggerLike } from './types.js';
type Handler = (data: Record<string, unknown>) => void;
export declare class AgentEventBus implements EventBusLike {
    private logger;
    private handlers;
    constructor(logger: LoggerLike);
    emit(event: string, data: Record<string, unknown>): void;
    on(event: string, handler: Handler): void;
    off(event: string, handler: Handler): void;
}
export declare const Events: {
    readonly PIPELINE_START: "pipeline:start";
    readonly PIPELINE_COMPLETE: "pipeline:complete";
    readonly PIPELINE_ERROR: "pipeline:error";
    readonly AGENT_START: (id: string) => string;
    readonly AGENT_COMPLETE: (id: string) => string;
    readonly AGENT_ERROR: (id: string) => string;
    readonly AGENT_PROGRESS: (id: string) => string;
};
export {};
//# sourceMappingURL=eventBus.d.ts.map