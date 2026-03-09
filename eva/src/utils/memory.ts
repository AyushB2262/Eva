import { openDB } from 'idb';

const DB_NAME = 'eva_memory_db';
const STORE_NAME = 'memories';
const DB_VERSION = 1;

export async function initDB() {
    return await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        },
    });
}

export async function rememberFact(fact: string): Promise<string> {
    try {
        const db = await initDB();
        await db.add(STORE_NAME, { fact, timestamp: Date.now() });
        return `Successfully remembered: "${fact}"`;
    } catch (err: any) {
        return `Failed to remember: ${err.message}`;
    }
}

export async function recallFact(query: string): Promise<string> {
    try {
        const db = await initDB();
        const allMemories = await db.getAll(STORE_NAME);

        // Very basic semantic search simulation (just text matching for mvp)
        // In a production app, we would use transformers.js locally to generate embeddings 
        // and do cosine similarity search.
        const relevant = allMemories.filter(m =>
            m.fact.toLowerCase().includes(query.toLowerCase()) ||
            query.toLowerCase().split(' ').some(word => word.length > 3 && m.fact.toLowerCase().includes(word))
        );

        if (relevant.length === 0) {
            // If no direct match, just return the last 5 memories to give context
            const recent = allMemories.slice(-5).map(m => m.fact).join('\n- ');
            return recent ? `No exact match found. Recent memories:\n- ${recent}` : "I don't have any memories stored yet.";
        }

        return `Found relevant memories:\n- ${relevant.map(m => m.fact).join('\n- ')}`;
    } catch (err: any) {
        return `Failed to recall: ${err.message}`;
    }
}
