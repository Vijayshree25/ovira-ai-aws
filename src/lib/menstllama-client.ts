/**
 * MenstLLaMA / SLM Client for Ovira AI
 *
 * Connects to the self-hosted MenstLLaMA model running on EC2.
 * Provides health-check caching, keyword-based routing, and
 * automatic fallback signalling so the caller can fall through
 * to Bedrock when the SLM is unavailable.
 *
 * Environment variable:
 *   MENSTLLAMA_EC2_URL — e.g. http://3.14.15.92:8080
 */

// ─── Config ──────────────────────────────────────────────────────────────────

const MENSTLLAMA_URL = process.env.MENSTLLAMA_EC2_URL || '';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SLMResponse {
    response: string;
    model: string;
    latency_ms: number;
    fallbackUsed: boolean;
}

// ─── Health Check (cached for 60 s) ──────────────────────────────────────────

let slmAvailable: boolean | null = null;
let lastCheck = 0;

const HEALTH_CACHE_MS = 60_000; // 60 seconds
const HEALTH_TIMEOUT_MS = 3_000; // 3 seconds
const CHAT_TIMEOUT_MS = 30_000; // 30 seconds

/**
 * Returns `true` if the EC2 SLM is reachable.
 * Result is cached for 60 s to avoid per-request overhead.
 */
async function checkSLMHealth(): Promise<boolean> {
    // Return cached result if still valid
    if (Date.now() - lastCheck < HEALTH_CACHE_MS && slmAvailable !== null) {
        return slmAvailable;
    }

    try {
        const res = await fetch(`${MENSTLLAMA_URL}/health`, {
            signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
        });
        slmAvailable = res.ok;
    } catch {
        slmAvailable = false;
    }

    lastCheck = Date.now();
    return slmAvailable;
}

// ─── Chat ────────────────────────────────────────────────────────────────────

/**
 * Send a message to the EC2-hosted SLM.
 *
 * If the SLM is unreachable or errors out, returns
 * `{ fallbackUsed: true }` so the caller can fall through to Bedrock.
 */
export async function chatWithSLM(
    message: string,
    userContext: string,
): Promise<SLMResponse> {
    const isAvailable = await checkSLMHealth();

    if (!isAvailable || !MENSTLLAMA_URL) {
        // SLM not configured or unreachable — signal fallback
        return { response: '', model: 'bedrock-fallback', latency_ms: 0, fallbackUsed: true };
    }

    try {
        const res = await fetch(`${MENSTLLAMA_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, userContext }),
            signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
        });

        if (!res.ok) {
            throw new Error(`SLM returned HTTP ${res.status}`);
        }

        const data = await res.json();

        return {
            response: data.response,
            model: data.model || 'MenstLLaMA-EC2',
            latency_ms: data.latency_ms || 0,
            fallbackUsed: false,
        };
    } catch (err) {
        console.error('SLM call failed, falling back to Bedrock:', err);
        return { response: '', model: 'bedrock-fallback', latency_ms: 0, fallbackUsed: true };
    }
}

// ─── Routing Heuristic ───────────────────────────────────────────────────────

/**
 * Keyword-based classification to decide whether a user message should
 * be routed to the domain-specific SLM or to Bedrock.
 *
 * SLM  → specific menstrual/reproductive health questions (its speciality)
 * Bedrock → general questions, report generation, complex reasoning
 */
const SLM_KEYWORDS = [
    'period', 'cycle', 'pcos', 'cramp', 'flow', 'menstrual',
    'ovulation', 'luteal', 'follicular', 'pms', 'pmdd', 'dysmenorrhea',
    'endometriosis', 'irregular', 'spotting', 'discharge', 'fertility',
    'bloating', 'breast tenderness', 'mood swing', 'heavy bleeding',
    'amenorrhea', 'oligomenorrhea', 'menorrhagia', 'fibroids',
];

export function routeToSLM(message: string): boolean {
    const lower = message.toLowerCase();
    return SLM_KEYWORDS.some((keyword) => lower.includes(keyword));
}
