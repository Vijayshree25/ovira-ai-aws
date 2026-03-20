/**
 * Manual RAG Client for Ovira AI
 *
 * Retrieves relevant knowledge chunks locally (TF-IDF vector store) and
 * injects them into Claude 3 Haiku prompts.
 *
 * Fallback chain (most to least capable):
 *   1. Claude via Bedrock  +  RAG context   (best)
 *   2. RAG context only — formatted directly from chunks  (works without Bedrock)
 *   3. Static safety message  (only if knowledge store also fails)
 */

import { invokeClaude } from './bedrock';
import { retrieveContext } from '@/lib/rag/ragPipeline';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Citation {
    source: string;
    excerpt: string;
    url?: string;
}

export interface KBResponse {
    response: string;
    citations: Citation[];
    sourceKB: string;
    modelUsed: string;
    fallbackUsed: boolean;
}

export interface KBConfig {
    knowledgeBaseId: string;
    modelArn: string;
    region: string;
}

// ─── Retry utility ───────────────────────────────────────────────────────────

export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;
            if (attempt < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
            }
        }
    }
    throw lastError;
}

// ─── System Prompts ──────────────────────────────────────────────────────────

const CHATBOT_SYSTEM_PROMPT = `You are Aria, an empathetic women's health companion for Ovira AI.
You help users understand their menstrual health using trusted health information.

STRICT RULES — never break these:
1. NEVER use these words: diagnose, diagnosis, treatment, cure, prescribe, disease,
   disorder, illness, medication, medicine, drug, prescription
2. ALWAYS end with: "Please consult a healthcare provider for personalised advice."
3. Use warm, supportive, non-medical language
4. When citing sources, say "According to the knowledge base..." or
   "Based on clinical references..."
5. Keep answers to 2–3 paragraphs maximum
6. If the question is outside women's menstrual health, politely redirect`;

const CLINICAL_SYSTEM_PROMPT = `You are a clinical pattern analysis assistant for Ovira AI.
You generate structured health reports for users to share with their gynaecologist.

CRITICAL RULES:
1. ALWAYS use decision-support language: "pattern consistent with", "may warrant
   evaluation for", "your doctor may consider", "suggests discussion about"
2. NEVER say: diagnose, you have [condition], you are at risk, you should take [drug],
   prescribe, medication, cure, disease
3. Cite clinical references: "Based on ACOG CPG No. 7 (2023)...", "Per WHO (2024)...",
   "According to NIH iron deficiency guidelines..."
4. Structure output as valid JSON with these exact keys:
   executiveSummary, cycleInsights, symptomAnalysis, riskFlags,
   recommendations, questionsForDoctor, lifestyleTips, urgentFlags
5. urgentFlags is only populated if pain >8/10 on non-period days for >2 months
6. riskFlags must include: type, severity (low/medium/high), confidence (0-100),
   clinicalBasis (the guideline cited), indicators (string[]), recommendation`;

// ─── Citation helpers ─────────────────────────────────────────────────────────

function buildCitations(context: string): Citation[] {
    if (!context) return [];
    const citations: Citation[] = [];
    const blockRegex = /\[(\d+)\] \(Source: ([^,]+),\s*similarity: ([\d.]+)\)\n([\s\S]*?)(?=\n---|$)/g;
    let match: RegExpExecArray | null;
    while ((match = blockRegex.exec(context)) !== null) {
        const source = match[2].trim().replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        const excerpt = match[4]?.trim().slice(0, 200) ?? '';
        citations.push({ source, excerpt });
    }
    return citations;
}

// ─── Context-only fallback ────────────────────────────────────────────────────

/**
 * When Claude is unavailable, format the retrieved knowledge chunks into a
 * readable response. This gives users useful, knowledge-backed answers
 * even without the LLM layer.
 */
function buildContextOnlyResponse(question: string, context: string): KBResponse {
    const citations = buildCitations(context);

    // Extract the text body from each numbered block (strip the header line)
    const blocks = context
        .split(/\n---\n/)
        .map(block => {
            const newlineIdx = block.indexOf('\n');
            return newlineIdx >= 0 ? block.slice(newlineIdx + 1).trim() : block.trim();
        })
        .filter(Boolean);

    if (blocks.length === 0) {
        return {
            response:
                'I wasn\'t able to find specific information about that in our knowledge base. ' +
                'Please consult a healthcare provider for personalised advice.',
            citations: [],
            sourceKB: 'chatbot',
            modelUsed: 'local-rag-only',
            fallbackUsed: true,
        };
    }

    // Build a natural, summarized response instead of dumping raw chunks
    const topChunk = blocks[0];
    const sentences = topChunk.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const summary = sentences.slice(0, 3).join('. ').trim() + '.';
    
    const response =
        `Based on our women's health knowledge base: ${summary}\n\n` +
        `${citations.length > 0 ? formatCitationFooter(citations) + '\n\n' : ''}` +
        `Please consult a healthcare provider for personalised advice.`;

    return {
        response,
        citations,
        sourceKB: 'chatbot',
        modelUsed: 'local-rag-only',
        fallbackUsed: true,
    };
}

// Helper function to format citations
function formatCitationFooter(citations: Citation[]): string {
    if (citations.length === 0) return '';
    const sourceNames = citations
        .map((c) => c.source)
        .filter((s) => s !== 'Unknown source')
        .filter((s, i, arr) => arr.indexOf(s) === i);
    if (sourceNames.length === 0) return '';
    return `📚 Sources: ${sourceNames.join(', ')}`;
}

// ─── Chatbot RAG ─────────────────────────────────────────────────────────────

export async function chatWithKB(
    question: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    userContext?: string,
): Promise<KBResponse> {
    // ── Step 1: Retrieve context from local vector store ──────────────────────
    let context = '';
    try {
        context = await retrieveContext(question, 'chatbot', 5);
    } catch (ragError: any) {
        console.error('[chatWithKB] RAG retrieval failed:', ragError?.message);
        // Continue — will try Claude without context, then give static fallback
    }

    // ── Step 2: Try Claude with context injected ──────────────────────────────
    try {
        const systemPrompt = [
            userContext ? `USER HEALTH CONTEXT:\n${userContext}\n` : '',
            CHATBOT_SYSTEM_PROMPT,
            context ? `\n\n${context}` : '',
        ].filter(Boolean).join('\n');

        const answer = await invokeClaude(question, systemPrompt, conversationHistory);
        const citations = buildCitations(context);

        return {
            response: answer,
            citations,
            sourceKB: 'chatbot',
            modelUsed: 'claude-3-haiku (local RAG)',
            fallbackUsed: false,
        };
    } catch (claudeError: any) {
        console.error('[chatWithKB] Claude invocation failed:', claudeError?.name, claudeError?.message);
        console.error('  → HTTP Status:', claudeError?.$metadata?.httpStatusCode);
        console.error('  → Tip: Enable model access in AWS Bedrock console, or check IAM permissions for bedrock:InvokeModel');
    }

    // ── Step 3: Claude unavailable — return knowledge chunks directly ─────────
    if (context) {
        console.log('[chatWithKB] Claude unavailable — returning context-only RAG response');
        return buildContextOnlyResponse(question, context);
    }

    // ── Step 4: Nothing available — static safety message ────────────────────
    return {
        response:
            'I wasn\'t able to retrieve information for that question right now. ' +
            'Please consult a healthcare provider for personalised advice.',
        citations: [],
        sourceKB: 'chatbot',
        modelUsed: 'static-fallback',
        fallbackUsed: true,
    };
}

// ─── Clinical RAG ─────────────────────────────────────────────────────────────

export async function generateClinicalInsights(
    symptomSummary: string,
    userContext?: string,
): Promise<KBResponse> {
    let context = '';
    try {
        context = await retrieveContext(symptomSummary, 'clinical', 6);
    } catch (ragError: any) {
        console.error('[generateClinicalInsights] RAG retrieval failed:', ragError?.message);
    }

    try {
        const systemPrompt = [
            userContext ? `USER HEALTH CONTEXT:\n${userContext}\n` : '',
            CLINICAL_SYSTEM_PROMPT,
            context ? `\n\n${context}` : '',
        ].filter(Boolean).join('\n');

        const answer = await invokeClaude(symptomSummary, systemPrompt);
        const citations = buildCitations(context);

        return {
            response: answer,
            citations,
            sourceKB: 'clinical',
            modelUsed: 'claude-3-haiku (local RAG)',
            fallbackUsed: false,
        };
    } catch (error: any) {
        console.error('[generateClinicalInsights] Claude failed:', error?.name, error?.message);
        console.error('  → HTTP Status:', error?.$metadata?.httpStatusCode);
        return clinicalFallback(symptomSummary, userContext);
    }
}

async function clinicalFallback(
    symptomSummary: string,
    userContext?: string,
): Promise<KBResponse> {
    try {
        const prompt = userContext
            ? `USER HEALTH CONTEXT:\n${userContext}\n\n${CLINICAL_SYSTEM_PROMPT}`
            : CLINICAL_SYSTEM_PROMPT;

        const text = await invokeClaude(symptomSummary, prompt);

        return {
            response: text,
            citations: [],
            sourceKB: 'clinical',
            modelUsed: 'claude-3-haiku (plain, no RAG)',
            fallbackUsed: true,
        };
    } catch (fallbackError: any) {
        console.error('[generateClinicalInsights] plain Claude fallback also failed', fallbackError?.message);
        return {
            response:
                'Unable to generate clinical insights at this time. Please retry later or consult your healthcare provider directly.',
            citations: [],
            sourceKB: 'clinical',
            modelUsed: 'static-fallback',
            fallbackUsed: true,
        };
    }
}
