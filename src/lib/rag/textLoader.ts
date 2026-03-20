/**
 * Text Document Loader & Chunker for Manual RAG Pipeline
 *
 * Reads .txt knowledge files from the `knowledge/` directory at project root,
 * and splits content into overlapping chunks suitable for embedding.
 */

import fs from 'fs';
import path from 'path';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Chunk {
    text: string;
    source: string;
    chunkIndex: number;
}

// ─── Config ──────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 500;      // characters per chunk
const CHUNK_OVERLAP = 80;    // characters of overlap between adjacent chunks

const KNOWLEDGE_DIR = path.join(process.cwd(), 'knowledge');

const FILE_MAP: Record<'chatbot' | 'clinical', string> = {
    chatbot: 'chatbot-health.txt',
    clinical: 'clinical-guidelines.txt',
};

// ─── Core: split text into overlapping chunks ─────────────────────────────────

function splitIntoChunks(text: string, source: string): Chunk[] {
    const chunks: Chunk[] = [];

    // Split on double-newline paragraph boundaries first to avoid breaking
    // sentences mid-word where possible, then fall back to char-level slicing.
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

    let buffer = '';
    let chunkIndex = 0;

    for (const para of paragraphs) {
        // If adding this paragraph would exceed chunk size, flush current buffer
        if (buffer.length + para.length > CHUNK_SIZE && buffer.length > 0) {
            chunks.push({ text: buffer.trim(), source, chunkIndex: chunkIndex++ });

            // Keep the last CHUNK_OVERLAP characters in the next chunk (overlap)
            buffer = buffer.slice(-CHUNK_OVERLAP) + ' ' + para;
        } else {
            buffer = buffer ? buffer + '\n\n' + para : para;
        }
    }

    // Flush remaining content
    if (buffer.trim().length > 0) {
        chunks.push({ text: buffer.trim(), source, chunkIndex: chunkIndex++ });
    }

    return chunks;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Loads and chunks a knowledge document for the given RAG type.
 *
 * @param type - 'chatbot' for the consumer chat knowledge base,
 *               'clinical' for the doctor-report knowledge base
 */
export function loadAndChunkDocuments(type: 'chatbot' | 'clinical'): Chunk[] {
    const filename = FILE_MAP[type];
    const filepath = path.join(KNOWLEDGE_DIR, filename);

    if (!fs.existsSync(filepath)) {
        console.warn(`[RAG] Knowledge file not found: ${filepath}. RAG will return empty context.`);
        return [];
    }

    const raw = fs.readFileSync(filepath, 'utf-8');
    const chunks = splitIntoChunks(raw, filename);

    console.log(`[RAG] Loaded ${chunks.length} chunks from ${filename}`);
    return chunks;
}
