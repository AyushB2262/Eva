import { openDB } from 'idb';
import { pipeline } from '@xenova/transformers';

const DB_NAME = 'eva_memory_db';
const STORE_NAME = 'memories';
const DB_VERSION = 2; // Upgraded version for vector schema

// Singleton pattern for the embedding pipeline to avoid reloading the model
let embedPipeline: any = null;

async function getEmbedder() {
    if (!embedPipeline) {
        // Use a tiny, extremely fast model for local browser embeddings
        embedPipeline = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return embedPipeline;
}

export async function initDB() {
    return await openDB(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            if (oldVersion < 2) {
                // If upgrading from v1, delete the old store to recreate with new schema
                if (db.objectStoreNames.contains(STORE_NAME)) {
                    db.deleteObjectStore(STORE_NAME);
                }
            }
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            }
        },
    });
}

// Cosine similarity mathematical function
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function rememberFact(fact: string): Promise<string> {
    try {
        const embedder = await getEmbedder();
        const db = await initDB();
        
        // Generate the 384-dimensional vector embedding for the text
        const output = await embedder(fact, { pooling: 'mean', normalize: true });
        const vector = Array.from(output.data);

        await db.add(STORE_NAME, { 
            fact, 
            vector,
            timestamp: Date.now() 
        });
        
        console.log("Memory embedded and stored natively.");
        return `Successfully remembered: "${fact}"`;
    } catch (err: any) {
        return `Failed to remember: ${err.message}`;
    }
}

export async function recallFact(query: string): Promise<string> {
    try {
        const embedder = await getEmbedder();
        const db = await initDB();
        const allMemories = await db.getAll(STORE_NAME);

        if (allMemories.length === 0) {
            return "I don't have any memories stored yet.";
        }

        // Embed the search query
        const queryOutput = await embedder(query, { pooling: 'mean', normalize: true });
        const queryVector = Array.from(queryOutput.data);

        // Calculate semantic similarity scores across all database memories
        const scoredMemories = allMemories.map(m => {
            if (!m.vector) return { ...m, score: 0 }; // Legacy fallback
            return {
                ...m,
                score: cosineSimilarity(queryVector as number[], m.vector)
            };
        });

        // Filter and sort by highest similarity (Threshold context: > 0.4 usually means somewhat related)
        const relevantMemories = scoredMemories
            .filter(m => m.score > 0.3)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5); // Keep top 5 most relevant

        if (relevantMemories.length === 0) {
            const recent = allMemories.slice(-3).map(m => m.fact).join('\n- ');
            return `No exact semantic match found. Recent generic memories:\n- ${recent}`;
        }

        return `Found relevant memories:\n- ${relevantMemories.map(m => m.fact).join('\n- ')}`;
    } catch (err: any) {
        return `Failed to recall: ${err.message}`;
    }
}

// New utility to inject dynamic persona data
export async function getPersonaPreferences(): Promise<string> {
    try {
        const db = await initDB();
        const allMemories = await db.getAll(STORE_NAME);
        
        // Look for preferences specifically
        const prefMemories = allMemories.filter(m => 
            m.fact.toLowerCase().includes('prefer') || 
            m.fact.toLowerCase().includes('always') ||
            m.fact.toLowerCase().includes('never')
        );

        if (prefMemories.length > 0) {
            const rules = prefMemories.map(m => m.fact).join(' ');
            return `\n\nUSER PREFERENCES (ADHERE TO THESE STRICTLY): ${rules}`;
        }
        return "";
    } catch (e) {
        return "";
    }
}
