/**
 * Amazon Bedrock Knowledge Base Client for Ovira AI
 *
 * Provides RAG-powered answers from two Bedrock Knowledge Bases:
 *   KB #1 (Chatbot) — empathetic user chat
 *   KB #2 (Clinical) — doctor-ready health reports
 *
 * Uses BedrockAgentRuntimeClient (NOT BedrockRuntimeClient).
 * Falls back to plain invokeClaude() without RAG on failure.
 */

import {
    BedrockAgentRuntimeClient,
    RetrieveAndGenerateCommand,
    type RetrieveAndGenerateCommandOutput,
} from '@aws-sdk/client-bedrock-agent-runtime';

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

// ─── Constants ───────────────────────────────────────────────────────────────

const KB_REGION = 'us-east-1';

const PRIMARY_MODEL_ARN =
    `arn:aws:bedrock:${KB_REGION}::foundation-model/anthropic.claude-3-haiku-20240307-v1:0`;

const FALLBACK_MODEL_ARN =
    `arn:aws:bedrock:${KB_REGION}::foundation-model/amazon.nova-micro-v1:0`;

const CHATBOT_KB_ID = process.env.BEDROCK_CHATBOT_KB_ID || '';
const CLINICAL_KB_ID = process.env.BEDROCK_CLINICAL_KB_ID || '';

// ─── Client (singleton) ─────────────────────────────────────────────────────

let agentClient: BedrockAgentRuntimeClient | undefined;

function getAgentClient(): BedrockAgentRuntimeClient {
    if (!agentClient) {
        agentClient = new BedrockAgentRuntimeClient({
            region: KB_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            },
        });
    }
    return agentClient;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generic retry wrapper with exponential backoff.
 * Attempts: 3, delays: 1 000 ms → 2 000 ms → 4 000 ms.
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3,
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(
                `[${new Date().toISOString()}] KB attempt ${attempt}/${maxAttempts}`,
            );
            return await fn();
        } catch (error: any) {
            lastError = error;
            console.error(
                `[${new Date().toISOString()}] KB attempt ${attempt} failed:`,
                error?.name || error?.message,
            );

            if (attempt < maxAttempts) {
                const backoffMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
                console.log(
                    `[${new Date().toISOString()}] Waiting ${backoffMs}ms before retry…`,
                );
                await sleep(backoffMs);
            }
        }
    }

    throw lastError;
}

// ─── Core: Retrieve & Generate ──────────────────────────────────────────────

/**
 * Calls Bedrock RetrieveAndGenerate against a specific Knowledge Base.
 *
 * @param question    - The user's question / input text
 * @param kbId        - Knowledge Base ID to query
 * @param systemPrompt - System prompt prepended to search results
 * @param maxTokens   - Max tokens for the generation (default 800)
 * @returns answer text, parsed citations array, and model identifier
 */
export async function retrieveAndGenerate(
    question: string,
    kbId: string,
    systemPrompt: string,
    maxTokens: number = 800,
): Promise<{ answer: string; citations: Citation[]; modelUsed: string }> {
    const client = getAgentClient();

    const command = new RetrieveAndGenerateCommand({
        input: { text: question },
        retrieveAndGenerateConfiguration: {
            type: 'KNOWLEDGE_BASE',
            knowledgeBaseConfiguration: {
                knowledgeBaseId: kbId,
                modelArn: PRIMARY_MODEL_ARN,
                generationConfiguration: {
                    promptTemplate: {
                        textPromptTemplate: systemPrompt + '\n\n$search_results$',
                    },
                    inferenceConfig: {
                        textInferenceConfig: {
                            maxTokens,
                            temperature: 0.3,
                        },
                    },
                },
            },
        },
    });

    const response = await client.send(command);

    const answer = response.output?.text || '';
    const citations = extractCitations(response);

    return {
        answer,
        citations,
        modelUsed: 'claude-3-haiku (KB RAG)',
    };
}

// ─── Citation Extraction ────────────────────────────────────────────────────

/**
 * Parses the citations array from a RetrieveAndGenerate response into a
 * clean Citation[] with source name, excerpt, and optional URL.
 */
export function extractCitations(
    response: RetrieveAndGenerateCommandOutput,
): Citation[] {
    if (!response.citations || response.citations.length === 0) {
        return [];
    }

    const parsed: Citation[] = [];

    for (const citation of response.citations) {
        const refs = citation.retrievedReferences || [];
        for (const ref of refs) {
            const source =
                ref.location?.s3Location?.uri ||
                ref.location?.webLocation?.url ||
                'Unknown source';

            const excerpt =
                ref.content?.text || '';

            const url =
                ref.location?.webLocation?.url ||
                ref.location?.s3Location?.uri ||
                undefined;

            parsed.push({ source, excerpt, url });
        }
    }

    return parsed;
}

// ─── Fallback to plain invokeClaude (dynamic import) ────────────────────────

/**
 * Dynamically imports invokeClaude from bedrock.ts so there is no static
 * dependency between the two modules.
 */
async function fallbackInvokeClaude(
    prompt: string,
    systemPrompt?: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<string> {
    const { invokeClaude } = await import('./bedrock');
    return invokeClaude(prompt, systemPrompt, conversationHistory);
}

// ─── Chatbot KB ─────────────────────────────────────────────────────────────

const CHATBOT_SYSTEM_PROMPT = `You are Ovira AI, a compassionate and empathetic women's health assistant.
Use the knowledge base search results below to provide accurate, supportive answers.
Speak in plain, accessible language. Never diagnose or prescribe treatment.
Always encourage consulting a healthcare professional for personalised advice.
Keep answers concise (2-3 paragraphs).`;

/**
 * Chat with the Chatbot Knowledge Base — plain-language answers for users.
 *
 * @param question            - The user's message
 * @param conversationHistory - Prior messages for context (used only in fallback)
 */
export async function chatWithKB(
    question: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    userContext?: string,
): Promise<KBResponse> {
    if (!CHATBOT_KB_ID) {
        console.warn('BEDROCK_CHATBOT_KB_ID is not set — falling back to plain Claude');
        return chatFallback(question, conversationHistory, userContext);
    }

    try {
        // Prepend user health context to system prompt when available
        const prompt = userContext
            ? `USER HEALTH CONTEXT:\n${userContext}\n\n${CHATBOT_SYSTEM_PROMPT}`
            : CHATBOT_SYSTEM_PROMPT;

        const { answer, citations, modelUsed } = await retryWithBackoff(() =>
            retrieveAndGenerate(question, CHATBOT_KB_ID, prompt),
        );

        return {
            response: answer,
            citations,
            sourceKB: 'chatbot',
            modelUsed,
            fallbackUsed: false,
        };
    } catch (error) {
        console.error('chatWithKB: KB call failed after retries, using plain Claude fallback', error);
        return chatFallback(question, conversationHistory, userContext);
    }
}

async function chatFallback(
    question: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    userContext?: string,
): Promise<KBResponse> {
    try {
        const prompt = userContext
            ? `USER HEALTH CONTEXT:\n${userContext}\n\n${CHATBOT_SYSTEM_PROMPT}`
            : CHATBOT_SYSTEM_PROMPT;

        const text = await fallbackInvokeClaude(
            question,
            prompt,
            conversationHistory,
        );

        return {
            response: text,
            citations: [],
            sourceKB: 'chatbot',
            modelUsed: 'claude-3-haiku (plain, no RAG)',
            fallbackUsed: true,
        };
    } catch (fallbackError) {
        console.error('chatWithKB: plain Claude fallback also failed', fallbackError);
        return {
            response:
                "I'm sorry, I'm having trouble connecting right now. Please try again in a moment, or consult a healthcare provider for immediate assistance.",
            citations: [],
            sourceKB: 'chatbot',
            modelUsed: 'static-fallback',
            fallbackUsed: true,
        };
    }
}

// ─── Clinical KB ────────────────────────────────────────────────────────────

const CLINICAL_SYSTEM_PROMPT = `You are a medical data analyst AI generating structured, doctor-ready health reports.
Use the knowledge base search results below to produce evidence-backed clinical insights.

RULES:
1. Provide ONLY non-diagnostic statistical analysis and pattern observations.
2. Use decision-support language — NEVER diagnostic language.
3. Structure your output with clear sections: Summary, Key Observations, Risk Indicators, Recommendations.
4. Cite knowledge-base sources where possible.
5. Encourage professional medical consultation.`;

/**
 * Generate clinical insights from the Clinical Knowledge Base.
 * Produces structured, doctor-ready output based on a symptom summary.
 *
 * @param symptomSummary - Aggregated symptom data / context string
 */
export async function generateClinicalInsights(
    symptomSummary: string,
    userContext?: string,
): Promise<KBResponse> {
    if (!CLINICAL_KB_ID) {
        console.warn('BEDROCK_CLINICAL_KB_ID is not set — falling back to plain Claude');
        return clinicalFallback(symptomSummary, userContext);
    }

    try {
        // Prepend user health context to clinical system prompt when available
        const prompt = userContext
            ? `USER HEALTH CONTEXT:\n${userContext}\n\n${CLINICAL_SYSTEM_PROMPT}`
            : CLINICAL_SYSTEM_PROMPT;

        const { answer, citations, modelUsed } = await retryWithBackoff(() =>
            retrieveAndGenerate(
                symptomSummary,
                CLINICAL_KB_ID,
                prompt,
                1200, // larger token budget for structured clinical output
            ),
        );

        return {
            response: answer,
            citations,
            sourceKB: 'clinical',
            modelUsed,
            fallbackUsed: false,
        };
    } catch (error) {
        console.error(
            'generateClinicalInsights: KB call failed after retries, using plain Claude fallback',
            error,
        );
        return clinicalFallback(symptomSummary, userContext);
    }
}

async function clinicalFallback(symptomSummary: string, userContext?: string): Promise<KBResponse> {
    try {
        const prompt = userContext
            ? `USER HEALTH CONTEXT:\n${userContext}\n\n${CLINICAL_SYSTEM_PROMPT}`
            : CLINICAL_SYSTEM_PROMPT;

        const text = await fallbackInvokeClaude(symptomSummary, prompt);

        return {
            response: text,
            citations: [],
            sourceKB: 'clinical',
            modelUsed: 'claude-3-haiku (plain, no RAG)',
            fallbackUsed: true,
        };
    } catch (fallbackError) {
        console.error(
            'generateClinicalInsights: plain Claude fallback also failed',
            fallbackError,
        );
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
