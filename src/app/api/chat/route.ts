import { NextRequest, NextResponse } from 'next/server';
import { chatWithAI, getFallbackResponse } from '@/lib/aws/bedrock';

const SYSTEM_PROMPT = `You are Ovira AI, a compassionate and knowledgeable women's health assistant. Your role is to provide supportive, educational information about women's health topics including menstrual health, reproductive wellness, and general well-being.

IMPORTANT GUIDELINES:
1. Be empathetic, warm, and use stigma-free language
2. NEVER prescribe medications or provide medical diagnoses
3. ALWAYS recommend consulting healthcare professionals for medical concerns
4. Provide educational information based on established medical knowledge
5. Address sensitive topics with care, respect, and without judgment
6. If asked about emergencies or severe symptoms, immediately advise seeking medical care
7. Keep responses concise but informative (2-3 paragraphs max)
8. Use simple, accessible language
9. This is DECISION-SUPPORT only, not medical advice

TOPICS YOU CAN HELP WITH:
- Menstrual cycle tracking and understanding
- PMS and period symptoms
- General reproductive health education
- Lifestyle tips for menstrual wellness
- When to see a doctor
- Emotional support and validation

TOPICS TO REDIRECT TO DOCTORS:
- Specific medical diagnoses
- Medication recommendations
- Severe pain or unusual symptoms
- Pregnancy-related medical advice
- Fertility treatments

Remember: You are a supportive companion providing decision-support information, not a replacement for medical care.`;

export async function POST(request: NextRequest) {
    try {
        const { message, history, userContext } = await request.json();

        if (!message) {
            return NextResponse.json({ error: 'Message is required' }, { status: 400 });
        }

        // Check if AWS Bedrock is configured
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            console.log('AWS credentials not configured, using fallback response');
            return NextResponse.json({
                message: getFallbackResponse(message),
            });
        }

        // Build user context string from health summary and profile data
        let contextString = '';
        if (userContext?.healthSummary) {
            contextString = userContext.healthSummary;
        } else {
            // Fallback to basic context
            if (userContext?.ageRange) {
                contextString += `User age range: ${userContext.ageRange}`;
            }
            if (userContext?.conditions?.length > 0) {
                contextString += `, Known conditions: ${userContext.conditions.join(', ')}`;
            }
        }

        // Build conversation history for Bedrock
        const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [];
        if (history && Array.isArray(history)) {
            for (const msg of history.slice(-10)) { // Keep last 10 messages for context
                conversationHistory.push({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content,
                });
            }
        }

        // Call Bedrock AI with built-in retry + fallback
        const { response, model_used, attempts } = await chatWithAI(message, conversationHistory, contextString);

        return NextResponse.json({ message: response, model_used, attempts });

    } catch (error) {
        console.error('Chat API error:', error);
        return NextResponse.json({
            message: getFallbackResponse(''),
        });
    }
}
