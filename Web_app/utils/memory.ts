import { openDB } from 'idb';
import { pipeline } from '@xenova/transformers';
import { supabase } from './supabase';

const DB_NAME = 'eva-memory';
const STORE_NAME = 'memories';

// Singleton for embedding pipeline
let embedPipeline: any = null;

async function getEmbedder() {
    if (!embedPipeline) {
        embedPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return embedPipeline;
}

async function getDB() {
    return openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        },
    });
}

/**
 * Stores a fact in the cloud (Supabase) and locally (IndexedDB).
 */
export async function rememberFact(fact: string, userId?: string, supabaseToken?: string): Promise<string> {
    try {
        const embedder = await getEmbedder();
        const output = await embedder(fact, { pooling: 'mean', normalize: true });
        const vector = Array.from(output.data);

        // 1. Local Storage (Always keep a copy)
        const db = await getDB();
        await db.add(STORE_NAME, {
            fact,
            vector,
            timestamp: new Date().toISOString()
        });

        // 2. Cloud Storage (If authenticated)
        if (userId && supabaseToken) {
            const client = await getAuthenticatedClient(supabaseToken);
            const { error } = await client
                .from('memories')
                .insert({
                    user_id: userId,
                    content: fact,
                    category: 'fact'
                });
            
            if (error) {
                console.warn("[Memory] Supabase storage failed, but local copy saved:", error.message);
                return `Remembered locally, but cloud sync failed: ${error.message}`;
            }
            console.log(`[Memory] Fact synced to cloud for user ${userId}`);
            return `Successfully remembered in your cloud brain: "${fact}"`;
        }

        console.log(`[Memory] Fact stored locally: ${fact}`);
        return `Successfully remembered: "${fact}" (Offline mode)`;
    } catch (err: any) {
        console.error("[Memory] Storage failed:", err);
        return `Failed to remember: ${err.message}`;
    }
}

/**
 * Recalls relevant facts from the cloud or local storage.
 */
export async function recallFact(query: string, userId?: string, supabaseToken?: string): Promise<string> {
    try {
        const embedder = await getEmbedder();
        const queryOutput = await embedder(query, { pooling: 'mean', normalize: true });
        const queryVector = Array.from(queryOutput.data) as number[];

        let candidates: any[] = [];

        // 1. Try Cloud First
        if (userId && supabaseToken) {
            const client = await getAuthenticatedClient(supabaseToken);
            const { data, error } = await client
                .from('memories')
                .select('content, category')
                .eq('user_id', userId)
                .limit(50);
            
            if (!error && data) {
                // Since this version of Supabase-js + free tier doesn't support vector search easily without pgvector extensions, 
                // we'll fetch recently stored facts and filter them visually or we could implement a basic search.
                // However, let's prioritize local embeddings for precision.
                console.log("[Memory] Fetched cloud candidates for matching.");
                candidates = data.map(d => ({ fact: d.content }));
            }
        }

        // 2. Fetch all local memories to find matches
        const db = await getDB();
        const localMemories = await db.getAll(STORE_NAME);
        
        // Merge (distinct by content)
        const allMemories = [...localMemories];
        candidates.forEach(c => {
            if (!allMemories.find(m => m.fact === c.fact)) {
                allMemories.push(c);
            }
        });

        if (allMemories.length === 0) {
            return "I don't have any memories stored yet.";
        }

        // 3. Local Cosine Similarity (Precise matching)
        // Note: For cloud memories without vectors stored, we embed them on the fly (limited to 5 for performance)
        const scored = await Promise.all(allMemories.map(async (m) => {
            if (!m.vector) {
                const output = await embedder(m.fact, { pooling: 'mean', normalize: true });
                m.vector = Array.from(output.data);
            }
            const score = dotProduct(queryVector, m.vector);
            return { ...m, score };
        }));

        const results = scored
            .filter(m => m.score > 0.4)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

        if (results.length === 0) {
            return "I don't find any relevant memories in your brain.";
        }

        return `Found relevant memories:\n- ${results.map(m => m.fact).join('\n- ')}`;
    } catch (err: any) {
        console.error("[Memory] Recall failed:", err);
        return `Failed to recall: ${err.message}`;
    }
}

async function getAuthenticatedClient(supabaseToken: string) {
    // We create a new client instance for this request to ensure the header is set correctly
    // or we can use the singleton if we update the global auth header
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${supabaseToken}`,
                },
            },
        }
    );
}

function dotProduct(a: number[], b: number[]) {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

export async function getPersonaPreferences(userId?: string, supabaseToken?: string): Promise<string> {
    try {
        let all: any[] = [];
        
        // 1. Try Cloud
        if (userId && supabaseToken) {
            const client = await getAuthenticatedClient(supabaseToken);
            const { data, error } = await client
                .from('memories')
                .select('content')
                .eq('user_id', userId)
                .limit(100);
            
            if (!error && data) {
                all = data.map(d => ({ fact: d.content }));
            }
        }

        // 2. Local fallback/merge
        const db = await getDB();
        const local = await db.getAll(STORE_NAME);
        local.forEach(l => {
            if (!all.find(a => a.fact === l.fact)) {
                all.push(l);
            }
        });

        const keywords = ['prefer', 'always', 'never', 'love', 'hate', 'like', 'don\'t like'];
        const prefs = all.filter(m => 
            keywords.some(k => m.fact.toLowerCase().includes(k))
        );

        if (prefs.length === 0) return "";

        const rules = prefs.map(m => m.fact).join(' ');
        return `\n\nUSER PREFERENCES (ADHERE TO THESE STRICTLY): ${rules}`;
    } catch (e) {
        return "";
    }
}

