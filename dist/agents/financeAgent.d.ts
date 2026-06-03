import type { AgentContext, FinancialReport, Agent } from '../types.js';
export declare class FinanceAgent implements Agent {
    id: "finance";
    name: string;
    color: string;
    private stripe;
    constructor();
    execute(input: unknown, context: AgentContext): Promise<FinancialReport>;
}
export default FinanceAgent;
//# sourceMappingURL=financeAgent.d.ts.map