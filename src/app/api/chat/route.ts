import { NextRequest, NextResponse } from 'next/server';
import { chatWithAI, getFallbackResponse, sanitizeResponse } from '@/lib/aws/bedrock';
import { chatWithKB, type Citation } from '@/lib/aws/bedrock-kb';
import { chatWithSLM, routeToSLM } from '@/lib/menstllama-client';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Format citation sources into a readable footer string.
 */
function formatCitationFooter(citations: Citation[]): string {
    if (citations.length === 0) return '';

    const sourceNames = citations
        .map((c) => c.source)
        .filter((s) => s !== 'Unknown source')
        .filter((s, i, arr) => arr.indexOf(s) === i);

    if (sourceNames.length === 0) return '';

    return `\n\n📚 Sources: ${sourceNames.join(', ')}`;
}

/**
 * Ensure the consultation reminder is appended if not already present.
 */
function ensureConsultationReminder(text: string): string {
    if (text.includes('healthcare provider') || text.includes('consult')) {
        return text;
    }
    return text + '\n\nPlease consult a healthcare provider for personalised advice.';
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const { message, history, userContext } = await request.json();

        if (!message) {
            return NextResponse.json(
                { error: 'Message is required' },
                { status: 400 },
            );
        }

        // Build user context string early so it's available for all paths
        let contextString = '';
        if (userContext?.healthSummary) {
            contextString = userContext.healthSummary;
        } else {
            if (userContext?.ageRange) {
                contextString += `User age range: ${userContext.ageRange}`;
            }
            if (userContext?.conditions?.length > 0) {
                contextString += `, Known conditions: ${userContext.conditions.join(', ')}`;
            }
        }

        // Build conversation history array
        const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
        if (history && Array.isArray(history)) {
            for (const msg of history.slice(-10)) {
                conversationHistory.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content,
                });
            }
        }

        // ── Step 1: Classify — should this go to the SLM? ──────────────────

        const useSLM = routeToSLM(message);

        // ── Step 2: If SLM route, try MenstLLaMA first ─────────────────────

        if (useSLM) {
            try {
                const slmResult = await chatWithSLM(message, contextString);

                if (!slmResult.fallbackUsed) {
                    // SLM succeeded — apply safety guardrails and return
                    const sanitized = sanitizeResponse(slmResult.response);
                    const finalMessage = ensureConsultationReminder(sanitized);

                    return NextResponse.json({
                        message: finalMessage,
                        citations: [],
                        model: 'MenstLLaMA-EC2 (Menstrual Health Specialist)',
                        ragEnabled: false,
                        slmUsed: true,
                        latency_ms: slmResult.latency_ms,
                    });
                }

                // SLM unavailable — fall through to Bedrock below
                console.log('SLM unavailable or returned fallback, falling through to Bedrock');
            } catch (slmError) {
                console.error('SLM call threw, falling through to Bedrock:', slmError);
            }
        }

        // ── Step 3: Check if AWS credentials are configured ────────────────

        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            console.log('AWS credentials not configured, using fallback response');
            return NextResponse.json({
                message: getFallbackResponse(message),
                citations: [],
                model: 'static-fallback',
                ragEnabled: false,
                slmUsed: false,
            });
        }

        // ── Step 4: Local RAG-backed response (Manual RAG via bedrock-kb) ──

        try {
            const kbResult = await chatWithKB(
                message,
                conversationHistory,
                contextString || undefined,
            );

            // Apply medical safety guardrails
            const sanitizedAnswer = sanitizeResponse(kbResult.response);
            const finalMessage = ensureConsultationReminder(sanitizedAnswer);

            return NextResponse.json({
                message: finalMessage,
                citations: kbResult.citations,
                model: kbResult.modelUsed,
                ragEnabled: !kbResult.fallbackUsed,
                slmUsed: false,
            });
        } catch (ragError) {
            console.error(
                'Local RAG call failed, falling back to direct Claude:',
                ragError,
            );
            // Fall through to chatWithAI fallback below
        }

        // ── Step 5: Fallback — direct chatWithAI (no RAG) ──────────────────

        try {
            const { response, model_used } = await chatWithAI(
                message,
                conversationHistory,
                contextString,
            );

            const finalMessage = ensureConsultationReminder(response);

            return NextResponse.json({
                message: finalMessage,
                citations: [],
                model: model_used,
                ragEnabled: false,
                slmUsed: false,
            });
        } catch (fallbackError) {
            console.error('Direct Claude fallback also failed:', fallbackError);
        }

        // ── Step 6: Final static fallback ──────────────────────────────────

        return NextResponse.json({
            message: getFallbackResponse(message),
            citations: [],
            model: 'static-fallback',
            ragEnabled: false,
            slmUsed: false,
        });
    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json({
            message: getFallbackResponse(''),
            citations: [],
            model: 'static-fallback',
            ragEnabled: false,
            slmUsed: false,
        });
    }
}
