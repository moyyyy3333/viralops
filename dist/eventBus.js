export class AgentEventBus {
    logger;
    handlers = new Map();
    constructor(logger) {
        this.logger = logger;
    }
    emit(event, data) {
        const set = this.handlers.get(event);
        if (set) {
            set.forEach((h) => {
                try {
                    h(data);
                }
                catch (e) { /* noop */ }
            });
        }
    }
    on(event, handler) {
        let set = this.handlers.get(event);
        if (!set) {
            set = new Set();
            this.handlers.set(event, set);
        }
        set.add(handler);
    }
    off(event, handler) {
        this.handlers.get(event)?.delete(handler);
    }
}
export const Events = {
    PIPELINE_START: 'pipeline:start',
    PIPELINE_COMPLETE: 'pipeline:complete',
    PIPELINE_ERROR: 'pipeline:error',
    AGENT_START: (id) => `agent:${id}:start`,
    AGENT_COMPLETE: (id) => `agent:${id}:complete`,
    AGENT_ERROR: (id) => `agent:${id}:error`,
    AGENT_PROGRESS: (id) => `agent:${id}:progress`,
};
//# sourceMappingURL=eventBus.js.map