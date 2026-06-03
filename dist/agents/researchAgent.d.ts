import type { AgentContext, ViralTopic, Agent } from '../types.js';
export declare class ResearchAgent implements Agent {
    id: "research";
    name: string;
    color: string;
    private perplexity;
    constructor();
    execute(input: unknown, context: AgentContext): Promise<ViralTopic[]>;
    private heuristicScore;
    private extractTags;
}
export default ResearchAgent;
//# sourceMappingURL=researchAgent.d.ts.map