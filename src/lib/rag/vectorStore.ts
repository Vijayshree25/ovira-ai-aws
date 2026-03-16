/**
 * Pure-JS In-Memory Vector Store
 *
 * Stores document chunk embeddings and supports cosine-similarity search.
 * No native dependencies — runs in any Node.js environment including Next.js.
 *
 * Performance: Linear scan over the stored vectors. For typical RAG use cases
 * (< 500 chunks, 512-dim embeddings) this is fast enough (<25ms per query).
 */

import type { Chunk } from './textLoader';

// ─── Types ───────────────────────────────────────────────────────────────────

interface EmbeddedChunk {
    chunk: Chunk;
    embedding: number[];
    /** Pre-computed L2 norm to speed up cosine similarity at query time. */
    norm: number;
}

export interface SearchResult {
    chunk: Chunk;
    score: number;   // cosine similarity [0, 1] — higher is more similar
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

function l2Norm(v: number[]): number {
    let sum = 0;
    for (const x of v) sum += x * x;
    return Math.sqrt(sum);
}

function dotProduct(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
    return sum;
}

function cosineSimilarity(a: number[], normA: number, b: number[], normB: number): number {
    if (normA === 0 || normB === 0) return 0;
    return dotProduct(a, b) / (normA * normB);
}

// ─── VectorStore class ────────────────────────────────────────────────────────

export class VectorStore {
    private items: EmbeddedChunk[] = [];

    /** Clear all stored vectors. */
    clear(): void {
        this.items = [];
    }

    /** Total number of stored chunks. */
    get size(): number {
        return this.items.length;
    }

    /**
     * Add a chunk and its embedding to the store.
     * Pre-computes the norm to accelerate future similarity queries.
     */
    add(chunk: Chunk, embedding: number[]): void {
        this.items.push({
            chunk,
            embedding,
            norm: l2Norm(embedding),
        });
    }

    /**
     * Search for the top-k most similar chunks to the given query embedding.
     *
     * @param queryEmbedding  - Embedding vector for the user's query
     * @param k               - Number of results to return (default: 5)
     * @param minScore        - Minimum cosine similarity threshold (default: 0.0)
     */
    search(
        queryEmbedding: number[],
        k = 5,
        minScore = 0.0,
    ): SearchResult[] {
        if (this.items.length === 0) return [];

        const queryNorm = l2Norm(queryEmbedding);

        const scored: SearchResult[] = this.items.map(item => ({
            chunk: item.chunk,
            score: cosineSimilarity(queryEmbedding, queryNorm, item.embedding, item.norm),
        }));

        return scored
            .filter(r => r.score >= minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, k);
    }
}

// ─── Singletons ───────────────────────────────────────────────────────────────
// Two separate stores: one per knowledge domain.

export const chatbotStore = new VectorStore();
export const clinicalStore = new VectorStore();
