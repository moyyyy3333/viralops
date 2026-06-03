import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';
export class SupabaseDB {
    logger;
    client = null;
    enabled;
    constructor(logger) {
        this.logger = logger;
        this.enabled = config.hasSupabase;
        if (this.enabled) {
            this.client = createClient(config.supabaseUrl, config.supabaseServiceKey);
            this.logger.info('Supabase DB connected');
        }
        else {
            this.logger.warn('Supabase not configured — running in local-only mode');
        }
    }
    async insert(table, data) {
        if (!this.enabled || !this.client) {
            const id = crypto.randomUUID();
            this.logger.debug(`[LOCAL] Insert into ${table}`, { id });
            return { id };
        }
        const { data: result, error } = await this.client
            .from(table)
            .insert(data)
            .select('id')
            .single();
        if (error) {
            this.logger.error(`DB insert failed: ${table}`, { error: error.message });
            throw error;
        }
        return { id: result.id };
    }
    async update(table, id, data) {
        if (!this.enabled || !this.client)
            return;
        const { error } = await this.client.from(table).update(data).eq('id', id);
        if (error) {
            this.logger.error(`DB update failed: ${table}`, { error: error.message });
            throw error;
        }
    }
    async select(table, query) {
        if (!this.enabled || !this.client)
            return [];
        let dbQuery = this.client.from(table).select('*');
        if (query) {
            for (const [key, value] of Object.entries(query)) {
                dbQuery = dbQuery.eq(key, value);
            }
        }
        const { data, error } = await dbQuery;
        if (error) {
            this.logger.error(`DB select failed: ${table}`, { error: error.message });
            return [];
        }
        return (data ?? []);
    }
    async logAgentEvent(runId, agentId, level, message, meta) {
        if (!this.enabled)
            return;
        await this.insert('agent_logs', {
            run_id: runId,
            agent_id: agentId,
            level,
            message,
            metadata: meta ?? {},
            created_at: new Date().toISOString(),
        });
    }
    async getRecentLogs(runId, limit = 50) {
        if (!this.enabled || !this.client)
            return [];
        const { data, error } = await this.client
            .from('agent_logs')
            .select('*')
            .eq('run_id', runId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error)
            return [];
        return (data ?? []);
    }
}
export default SupabaseDB;
//# sourceMappingURL=db.js.map