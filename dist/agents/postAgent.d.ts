import type { AgentContext, PostResult, Agent } from '../types.js';
export declare class PostAgent implements Agent {
    id: "post";
    name: string;
    color: string;
    private xApi;
    private aisaApi;
    private igApi;
    private tiktokApi;
    private youtubeApi;
    private pipelineLogger;
    constructor(logger?: any);
    execute(input: unknown, context: AgentContext): Promise<PostResult[]>;
    private publishToPlatform;
}
export default PostAgent;
//# sourceMappingURL=postAgent.d.ts.map