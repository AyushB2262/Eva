import { openDB } from 'idb';
import { pipeline } from '@xenova/transformers';

const DB_NAME = 'eva-memory';
const STORE_NAME = 'memories';
const PREFS_STORE = 'preferences';

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

export async function rememberFact(fact: string): Promise<string> {
    try {
        const embedder = await getEmbedder();
        const output = await embedder(fact, { pooling: 'mean', normalize: true });
        const vector = Array.from(output.data);

        const db = await getDB();
        await db.add(STORE_NAME, {
            fact,
            vector,
            timestamp: new Date().toISOString()
        });

        console.log(`[Memory] Fact stored locally: ${fact}`);
        return `Successfully remembered: "${fact}"`;
    } catch (err: any) {
        console.error("[Memory] Storage failed:", err);
        return `Failed to remember: ${err.message}`;
    }
}

export async function recallFact(query: string): Promise<string> {
    try {
        const embedder = await getEmbedder();
        const queryOutput = await embedder(query, { pooling: 'mean', normalize: true });
        const queryVector = Array.from(queryOutput.data) as number[];

        const db = await getDB();
        const allMemories = await db.getAll(STORE_NAME);

        if (allMemories.length === 0) {
            return "I don't have any memories stored yet.";
        }

        // Local Cosine Similarity
        const scored = allMemories.map(m => {
            const score = dotProduct(queryVector, m.vector);
            return { ...m, score };
        }).filter(m => m.score > 0.4)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        if (scored.length === 0) {
            return "I don't find any relevant memories locally.";
        }

        return `Found relevant memories:\n- ${scored.map(m => m.fact).join('\n- ')}`;
    } catch (err: any) {
        console.error("[Memory] Recall failed:", err);
        return `Failed to recall: ${err.message}`;
    }
}

function dotProduct(a: number[], b: number[]) {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

export async function getPersonaPreferences(): Promise<string> {
    try {
        const db = await getDB();
        const all = await db.getAll(STORE_NAME);
        
        // Filter for things that look like preferences
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
