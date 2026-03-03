import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

// Bedrock config - defined here (server-side only) to ensure non-NEXT_PUBLIC_ env vars are available.
// These env vars are NOT accessible in 'use client' modules like config.ts.
const bedrockConfig = {
    modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-haiku-20240307-v1:0',
    fallbackModelId: process.env.BEDROCK_FALLBACK_MODEL_ID || 'amazon.nova-micro-v1:0',
    region: process.env.BEDROCK_REGION || 'us-east-1',
};

// Server-side only - Initialize Bedrock client
function getBedrockClient(): BedrockRuntimeClient {
    return new BedrockRuntimeClient({
        region: bedrockConfig.region,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
    });
}

// Medical safety guardrails - prohibited words and phrases
const PROHIBITED_MEDICAL_TERMS = [
    'diagnose', 'diagnosis', 'treatment', 'cure', 'prescribe', 'prescription',
    'disease', 'disorder', 'illness', 'medication', 'medicine', 'drug',
];

// Check if response contains prohibited medical terms
function containsProhibitedTerms(text: string): boolean {
    const lowerText = text.toLowerCase();
    return PROHIBITED_MEDICAL_TERMS.some(term => lowerText.includes(term));
}

// Sanitize AI response to ensure non-diagnostic output
function sanitizeResponse(text: string): string {
    let sanitized = text;

    // Replace diagnostic language with decision-support language
    sanitized = sanitized.replace(/\b(diagnos[ei]s?|diagnose[ds]?)\b/gi, 'pattern observation');
    sanitized = sanitized.replace(/\b(treatment|treat)\b/gi, 'management approach');
    sanitized = sanitized.replace(/\b(cure|cured)\b/gi, 'improvement');
    sanitized = sanitized.replace(/\b(prescribe[ds]?|prescription)\b/gi, 'recommendation');
    sanitized = sanitized.replace(/\b(disease|disorder|illness)\b/gi, 'condition');
    sanitized = sanitized.replace(/\b(medication|medicine|drug)\b/gi, 'option');

    // Add decision-support disclaimer if not present
    if (!sanitized.includes('consult') && !sanitized.includes('healthcare provider')) {
        sanitized += '\n\nRemember: This is decision-support information only. Please consult with a healthcare provider for personalized medical advice.';
    }

    return sanitized;
}

// Invoke Claude model via Bedrock
export async function invokeClaude(
    prompt: string,
    systemPrompt?: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
    const client = getBedrockClient();

    // Build messages array
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    if (conversationHistory) {
        messages.push(...conversationHistory);
    }

    messages.push({
        role: 'user',
        content: prompt,
    });

    // Prepare request body for Claude
    const requestBody = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1024,
        temperature: 0.7,
        system: systemPrompt || 'You are a helpful, empathetic women\'s health assistant. Provide educational information only. Never diagnose or prescribe treatment.',
        messages: messages,
    };

    try {
        const command = new InvokeModelCommand({
            modelId: bedrockConfig.modelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(requestBody),
        });

        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        // Extract text from Claude response
        const text = responseBody.content?.[0]?.text || '';

        // Apply medical safety guardrails
        if (containsProhibitedTerms(text)) {
            console.warn('Response contained prohibited medical terms, sanitizing...');
            return sanitizeResponse(text);
        }

        return text;
    } catch (error) {
        console.error('Claude invocation error:', error);
        throw error;
    }
}

// Invoke Nova Micro model as fallback
export async function invokeTitan(prompt: string): Promise<string> {
    const client = getBedrockClient();

    const requestBody = {
        messages: [
            {
                role: 'user',
                content: [{ text: prompt }],
            },
        ],
        inferenceConfig: {
            maxTokens: 1024,
            temperature: 0.7,
            topP: 0.9,
        },
    };

    try {
        const command = new InvokeModelCommand({
            modelId: bedrockConfig.fallbackModelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify(requestBody),
        });

        const response = await client.send(command);
        const responseBody = JSON.parse(new TextDecoder().decode(response.body));

        const text = responseBody.output?.message?.content?.[0]?.text || '';

        // Apply medical safety guardrails
        if (containsProhibitedTerms(text)) {
            console.warn('Response contained prohibited medical terms, sanitizing...');
            return sanitizeResponse(text);
        }

        return text;
    } catch (error) {
        console.error('Titan invocation error:', error);
        throw error;
    }
}

// Main function to invoke AI with fallback
export async function invokeAI(
    prompt: string,
    systemPrompt?: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
    try {
        // Try Claude first
        return await invokeClaude(prompt, systemPrompt, conversationHistory);
    } catch (claudeError) {
        console.error('Claude failed, trying Titan fallback:', claudeError);

        try {
            // Fallback to Titan
            const fullPrompt = systemPrompt
                ? `${systemPrompt}\n\nUser: ${prompt}\nAssistant:`
                : prompt;
            return await invokeTitan(fullPrompt);
        } catch (titanError) {
            console.error('Titan also failed:', titanError);
            throw new Error('AI service unavailable. Please try again later.');
        }
    }
}

// Generate health report summary using AI
export async function generateHealthReportSummary(
    symptomData: string,
    userContext: string
): Promise<any> {
    const systemPrompt = `You are a medical data analyst AI. Generate a comprehensive, doctor-friendly health report based on symptom logs.

CRITICAL RULES:
1. Provide ONLY non-diagnostic statistical analysis
2. Use decision-support language, NOT diagnostic language
3. Encourage professional medical consultation
4. Return valid JSON only
5. Never use words: diagnose, treatment, cure, disease, prescribe

Return JSON with this structure:
{
    "executiveSummary": "Professional summary for healthcare providers (non-diagnostic)",
    "cycleInsights": {
        "overallPattern": "Description",
        "averagePainLevel": 0.0,
        "flowPatternDescription": "Description",
        "cycleRegularity": "regular|irregular|insufficient_data"
    },
    "symptomAnalysis": {
        "mostFrequentSymptoms": [{"symptom": "name", "count": 0, "percentage": 0}],
        "painTrend": "increasing|decreasing|stable|variable",
        "moodPattern": "Description",
        "sleepQuality": "Description",
        "energyPattern": "Description",
        "notableCorrelations": ["correlation 1"]
    },
    "riskAssessment": [
        {
            "condition": "Statistical indicator name",
            "riskLevel": "low|medium|high",
            "confidence": "low|medium|high",
            "indicators": ["indicator 1"],
            "recommendation": "Consult healthcare provider about..."
        }
    ],
    "recommendations": ["Recommendation 1"],
    "questionsForDoctor": ["Question 1"],
    "lifestyleTips": ["Tip 1"],
    "urgentFlags": []
}`;

    const prompt = `${userContext}\n\n${symptomData}\n\nGenerate a comprehensive health report following the JSON structure. Focus on statistical patterns and decision-support insights.`;

    try {
        const response = await invokeAI(prompt, systemPrompt);

        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        throw new Error('Failed to parse AI response as JSON');
    } catch (error) {
        console.error('Health report generation error:', error);
        throw error;
    }
}

// Chat with AI assistant
export async function chatWithAI(
    message: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    userContext?: string
): Promise<string> {
    const systemPrompt = `You are Ovira AI, a compassionate women's health assistant providing educational information and decision-support.

CRITICAL GUIDELINES:
1. Be empathetic and use stigma-free language
2. NEVER diagnose or prescribe treatment
3. ALWAYS encourage consulting healthcare professionals
4. Provide educational information only
5. Keep responses concise (2-3 paragraphs)
6. Use simple, accessible language
7. This is DECISION-SUPPORT only, not medical advice

PROHIBITED: Never use diagnostic language, prescribe medications, or provide treatment recommendations.

TOPICS YOU CAN HELP WITH:
- Menstrual cycle education
- General reproductive health information
- Lifestyle tips for wellness
- When to see a doctor
- Emotional support

${userContext ? `\nUser Context: ${userContext}` : ''}`;

    return await invokeAI(message, systemPrompt, conversationHistory);
}

// Fallback responses when AI is unavailable
export const FALLBACK_RESPONSES: Record<string, string> = {
    default: "I'm here to provide educational information about women's health. While I'm having trouble connecting right now, I encourage you to track your symptoms regularly and consult with a healthcare provider for personalized advice. Is there something specific you'd like to know about?",
    pain: "Period pain is common, but if it's severe or affecting your daily life, please consult a healthcare provider. General tips: apply heat, stay hydrated, gentle exercise may help. This is educational information only - not medical advice.",
    mood: "Mood changes during your cycle are normal due to hormonal fluctuations. Self-care strategies like regular sleep and exercise can help. If mood changes are severe, consider speaking with a healthcare provider. This is decision-support information only.",
    cycle: "A typical menstrual cycle lasts 21-35 days. If your cycle is irregular or you're experiencing unusual symptoms, discuss with your doctor. This is educational information to support your healthcare decisions.",
};

export function getFallbackResponse(message: string): string {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('pain') || lowerMessage.includes('cramp')) {
        return FALLBACK_RESPONSES.pain;
    }
    if (lowerMessage.includes('mood') || lowerMessage.includes('feel')) {
        return FALLBACK_RESPONSES.mood;
    }
    if (lowerMessage.includes('cycle') || lowerMessage.includes('period')) {
        return FALLBACK_RESPONSES.cycle;
    }
    return FALLBACK_RESPONSES.default;
}
