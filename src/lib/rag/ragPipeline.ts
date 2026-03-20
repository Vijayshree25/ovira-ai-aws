/**
 * RAG Pipeline Orchestrator
 *
 * Ties together textLoader → embeddings → vectorStore into a single
 * `retrieveContext(query, type)` function that is called by bedrock-kb.ts.
 *
 * Index initialisation is lazy and cached for the lifetime of the Node process
 * (i.e., per Next.js worker). On a cold start it embeds all chunks once; every
 * subsequent call reuses the in-memory index.
 */

import { loadAndChunkDocuments, type Chunk } from './textLoader';
import { embedText, embedBatch } from './embeddings';
import { chatbotStore, clinicalStore } from './vectorStore';

// ─── State ────────────────────────────────────────────────────────────────────

/** Track whether each store has been initialised to avoid repeated embedding. */
const indexed: Record<'chatbot' | 'clinical', boolean> = {
    chatbot: false,
    clinical: false,
};

/** Lock out concurrent initialisations for the same store. */
const initPromises: Record<'chatbot' | 'clinical', Promise<void> | null> = {
    chatbot: null,
    clinical: null,
};

// ─── Store selector ───────────────────────────────────────────────────────────

function getStore(type: 'chatbot' | 'clinical') {
    return type === 'chatbot' ? chatbotStore : clinicalStore;
}

// ─── Initialisation ───────────────────────────────────────────────────────────

/**
 * Load knowledge documents, embed all chunks, and populate the vector store.
 * Idempotent — safe to call multiple times; only runs once per process per type.
 */
async function initialiseStore(type: 'chatbot' | 'clinical'): Promise<void> {
    if (indexed[type]) return;

    // Deduplicate concurrent calls
    if (initPromises[type]) {
        return initPromises[type]!;
    }

    initPromises[type] = (async () => {
        console.log(`[RAG] Initialising ${type} vector store…`);

        const store = getStore(type);
        const chunks = loadAndChunkDocuments(type);

        if (chunks.length === 0) {
            console.warn(`[RAG] No chunks loaded for ${type}. Skipping embedding.`);
            indexed[type] = true;
            return;
        }

        const texts = chunks.map((c: Chunk) => c.text);

        // Embed all chunks via local TF-IDF (synchronous, no throttle needed)
        const embeddings = await embedBatch(texts, 50);

        store.clear();
        for (let i = 0; i < chunks.length; i++) {
            store.add(chunks[i], embeddings[i]);
        }

        console.log(`[RAG] ${type} store ready: ${store.size} chunks indexed.`);
        indexed[type] = true;
    })().catch((err) => {
        // Reset so the next request can retry rather than getting a permanent rejection
        console.error(`[RAG] Failed to initialise ${type} store, will retry on next request:`, err);
        initPromises[type] = null;
        indexed[type] = false;
    });

    return initPromises[type]!;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Retrieve the most relevant knowledge chunks for a given query.
 *
 * Returns a formatted string ready to be injected directly into a Claude prompt
 * under a "RELEVANT KNOWLEDGE:" heading.
 *
 * @param query   - The user's message or symptom summary
 * @param type    - Which knowledge store to search ('chatbot' | 'clinical')
 * @param k       - Number of top chunks to retrieve (default: 5)
 */
export async function retrieveContext(
    query: string,
    type: 'chatbot' | 'clinical',
    k = 5,
): Promise<string> {
    // Ensure store is initialised (no-op if already done)
    await initialiseStore(type);

    const store = getStore(type);

    if (store.size === 0) {
        return ''; // No knowledge documents available — caller falls back to plain Claude
    }

    // Embed the query
    const queryEmbedding = await embedText(query);

    // Retrieve top-k chunks.
    // minScore = 0.0 — with a local TF-IDF embedder cosine similarities are
    // lower than dense neural embeddings. Using 0 ensures we always send the
    // top-k most relevant chunks to Claude rather than returning empty context.
    const results = store.search(queryEmbedding, k, 0.0);

    if (results.length === 0) {
        return '';
    }

    // Format into a context block
    const contextLines = results.map((r, i) =>
        `[${i + 1}] (Source: ${r.chunk.source}, similarity: ${r.score.toFixed(3)})\n${r.chunk.text}`,
    );

    return `RELEVANT KNOWLEDGE:\n${contextLines.join('\n\n---\n\n')}`;
}

/**
 * Returns metadata about the current store state (for health checks / logging).
 */
export function getStoreStats(): Record<'chatbot' | 'clinical', { indexed: boolean; size: number }> {
    return {
        chatbot: { indexed: indexed.chatbot, size: chatbotStore.size },
        clinical: { indexed: indexed.clinical, size: clinicalStore.size },
    };
}
