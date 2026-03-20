/**
 * Local TF-IDF Text Embedder — with Unigram + Bigram support
 *
 * Generates a 512-dimensional dense vector for any input text using
 * term-frequency + deterministic hash projection.  Runs entirely in-process —
 * no network, no AWS credentials, no npm packages required.
 *
 * Algorithm
 * ─────────
 *  1. Tokenise: lowercase → split on non-alphanumeric → remove stop words
 *  2. Build unigrams AND bigrams (adjacent word pairs) from the token list.
 *     Bigrams capture domain phrases like "menstrual cycle", "heavy flow",
 *     "iron deficiency", "irregular periods" that are critical for women's
 *     health retrieval quality.
 *  3. Compute TF (term frequency) for each feature (unigram or bigram)
 *  4. Project each feature into a 512-dim vector via FNV-1a-32 hash.
 *     Bigrams get 1.5× weight to reward phrase matches.
 *  5. L2-normalise the resulting vector (matches Titan v2 normalize:true)
 *
 * Public API is identical to the old Bedrock-based embeddings.ts so
 * ragPipeline.ts requires zero changes.
 */

// ─── Constants ────────────────────────────────────────────────────────────────

const DIMS = 512; // output dimensionality — matches former Titan v2 config

/** Common English stop words excluded from TF computation. */
const STOP_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'can', 'that', 'this', 'it', 'its', 'they', 'them', 'their', 'which',
    'who', 'whom', 'what', 'when', 'where', 'how', 'not', 'no', 'nor',
    'so', 'if', 'as', 'than', 'then', 'there', 'here', 'both', 'each',
    'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same',
    'also', 'very', 'just', 'now', 'any', 'all', 'your', 'our', 'my',
    'he', 'she', 'we', 'you', 'i', 'me', 'him', 'her', 'us',
]);

// Bigram weight relative to unigrams.
// Higher value rewards exact phrase matches more strongly.
const BIGRAM_WEIGHT = 1.5;

// ─── Tokeniser ────────────────────────────────────────────────────────────────

function tokenise(text: string): string[] {
    return text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(tok => tok.length >= 2 && !STOP_WORDS.has(tok));
}

/** Build bigrams from a token list: ["heavy", "flow"] → "heavy_flow" */
function makeBigrams(tokens: string[]): string[] {
    const bigrams: string[] = [];
    for (let i = 0; i < tokens.length - 1; i++) {
        bigrams.push(`${tokens[i]}_${tokens[i + 1]}`);
    }
    return bigrams;
}

// ─── FNV-1a 32-bit hash ───────────────────────────────────────────────────────

function fnv1a32(str: string): number {
    let hash = 0x811c9dc5; // FNV offset basis
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 0x01000193) >>> 0; // 32-bit multiply by FNV prime
    }
    return hash;
}

// ─── Core embedding ───────────────────────────────────────────────────────────

function computeEmbedding(text: string): number[] {
    const tokens = tokenise(text.slice(0, 8192));
    const bigrams = makeBigrams(tokens);

    const vec = new Float64Array(DIMS);

    if (tokens.length === 0) {
        return Array.from(vec);
    }

    const totalFeatures = tokens.length + bigrams.length;

    // ── Unigrams ─────────────────────────────────────────────────────────────

    const tf: Record<string, number> = {};
    for (const tok of tokens) {
        tf[tok] = (tf[tok] || 0) + 1;
    }

    for (const [tok, count] of Object.entries(tf)) {
        const weight = count / totalFeatures;

        // Primary dimension
        const dim1 = fnv1a32(tok) % DIMS;
        // Secondary dimension with salt — reduces collision impact
        const dim2 = fnv1a32(tok + '\x01') % DIMS;

        vec[dim1] += weight;
        vec[dim2] += weight * 0.5;
    }

    // ── Bigrams ───────────────────────────────────────────────────────────────

    const tfBi: Record<string, number> = {};
    for (const bi of bigrams) {
        tfBi[bi] = (tfBi[bi] || 0) + 1;
    }

    for (const [bi, count] of Object.entries(tfBi)) {
        // Bigrams get boosted weight so phrase matches score higher
        const weight = (count / totalFeatures) * BIGRAM_WEIGHT;

        const dim1 = fnv1a32(bi) % DIMS;
        const dim2 = fnv1a32(bi + '\x01') % DIMS;

        vec[dim1] += weight;
        vec[dim2] += weight * 0.5;
    }

    // ── L2 normalise ─────────────────────────────────────────────────────────

    let norm = 0;
    for (let i = 0; i < DIMS; i++) norm += vec[i] * vec[i];
    norm = Math.sqrt(norm);

    if (norm === 0) return Array.from(vec);

    const result = new Array<number>(DIMS);
    for (let i = 0; i < DIMS; i++) result[i] = vec[i] / norm;
    return result;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a 512-dimensional embedding vector for the given text.
 * Drop-in replacement for the former Bedrock Titan embedText() call.
 */
export async function embedText(text: string): Promise<number[]> {
    return computeEmbedding(text);
}

/**
 * Embed an array of texts. The delayMs parameter is kept for API
 * compatibility but ignored — no throttling needed for local computation.
 */
export async function embedBatch(
    texts: string[],
    delayMs = 0,
): Promise<number[][]> {
    void delayMs;
    return texts.map(computeEmbedding);
}
