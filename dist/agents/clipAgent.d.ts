import type { AgentContext, VideoSegment, Agent } from '../types.js';
export declare class ClipAgent implements Agent {
    id: "clip";
    name: string;
    color: string;
    private ytdlp;
    constructor();
    execute(input: unknown, context: AgentContext): Promise<VideoSegment[]>;
    private fallbackMoments;
}
export default ClipAgent;
//# sourceMappingURL=clipAgent.d.ts.map