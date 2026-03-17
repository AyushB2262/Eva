import { supabase } from './supabase';
import { pipeline } from '@xenova/transformers';

const STORE_NAME = 'memories';

// Singleton for embedding pipeline
let embedPipeline: any = null;

async function getEmbedder() {
    if (!embedPipeline) {
        embedPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return embedPipeline;
}

export async function rememberFact(fact: string, userId: string): Promise<string> {
    if (!userId) return "User ID missing. Cannot store memory.";
    try {
        const embedder = await getEmbedder();
        const output = await embedder(fact, { pooling: 'mean', normalize: true });
        const vector = Array.from(output.data);

        const { error } = await supabase.from(STORE_NAME).insert({
            user_id: userId,
            fact,
            vector,
            timestamp: new Date().toISOString()
        });

        if (error) throw error;
        
        console.log(`[Supabase] Memory stored for user ${userId}`);
        return `Successfully remembered: "${fact}"`;
    } catch (err: any) {
        console.error("[Supabase] Storage failed:", err);
        return `Failed to remember: ${err.message}`;
    }
}

export async function recallFact(query: string, userId: string): Promise<string> {
    if (!userId) return "User ID missing. Cannot recall memory.";
    try {
        const embedder = await getEmbedder();
        const queryOutput = await embedder(query, { pooling: 'mean', normalize: true });
        const queryVector = Array.from(queryOutput.data);

        // Call the pgvector RPC function
        const { data, error } = await supabase.rpc('match_memories', {
            query_embedding: queryVector,
            match_threshold: 0.3,
            match_count: 5,
            p_user_id: userId
        });

        if (error) throw error;

        if (!data || data.length === 0) {
            return "I don't find any relevant memories in the cloud.";
        }

        return `Found relevant memories:\n- ${data.map((m: any) => m.fact).join('\n- ')}`;
    } catch (err: any) {
        console.error("[Supabase] Recall failed:", err);
        return `Failed to recall: ${err.message}`;
    }
}

export async function logSession(userId: string, sessionId: string, role: 'user' | 'eva', content: string) {
    if (!userId) return;
    try {
        await supabase.from('session_logs').insert({
            user_id: userId,
            session_id: sessionId,
            role,
            content,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        console.error("[Supabase] Logging failed:", e);
    }
}

export async function getPersonaPreferences(userId: string): Promise<string> {
    if (!userId) return "";
    try {
        const { data, error } = await supabase
            .from(STORE_NAME)
            .select('fact')
            .eq('user_id', userId)
            .or('fact.ilike.%prefer%,fact.ilike.%always%,fact.ilike.%never%');

        if (error) throw error;
        if (!data || data.length === 0) return "";

        const rules = data.map((m: any) => m.fact).join(' ');
        return `\n\nUSER PREFERENCES (ADHERE TO THESE STRICTLY): ${rules}`;
    } catch (e) {
        return "";
    }
}
