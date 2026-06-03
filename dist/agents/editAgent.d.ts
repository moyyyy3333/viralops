import type { AgentContext, EditedVideo, Agent } from '../types.js';
export declare class EditAgent implements Agent {
    id: "edit";
    name: string;
    color: string;
    private ffmpeg;
    private videoGen;
    constructor();
    execute(input: unknown, context: AgentContext): Promise<EditedVideo[]>;
}
export default EditAgent;
//# sourceMappingURL=editAgent.d.ts.map