import { NextRequest, NextResponse } from 'next/server';
import { invokeAI } from '@/lib/aws/bedrock';
import { getDocClient, dynamoDBTables } from '@/lib/aws/config';
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getUserProfile, getUserSymptomLogs } from '@/lib/aws/dynamodb';
import { getCurrentCycleInfo } from '@/lib/utils/cycle-analysis';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type');
        const userId = searchParams.get('userId');
        const condition = searchParams.get('condition');

        if (type === 'daily') {
            if (!userId) {
                return NextResponse.json({ success: false, error: 'userId is required for daily insights' }, { status: 400 });
            }

            const today = new Date().toISOString().split('T')[0];
            const cacheKey = `${userId}#${today}`;

            const docClient = getDocClient();

            // 1. Check DynamoDB Cache
            try {
                const getCmd = new GetCommand({
                    TableName: dynamoDBTables.articles,
                    Key: { id: cacheKey }
                });
                const cacheRes = await docClient.send(getCmd);
                if (cacheRes.Item) {
                    return NextResponse.json({ success: true, article: cacheRes.Item });
                }
            } catch (e) {
                console.error('Cache miss or error:', e);
            }

            // 2. Not in cache, generate
            const profile = await getUserProfile(userId);
            const logs = await getUserSymptomLogs(userId, 100);

            let profileLastPeriod: Date | null = null;
            if (profile?.lastPeriodStart) {
                profileLastPeriod = new Date(profile.lastPeriodStart);
            }

            const cycleInfo = getCurrentCycleInfo(
                logs as any,
                profileLastPeriod,
                profile?.averageCycleLength
            );

            const prompt = `Generate a short women's health article (150-200 words) for a user who is
  currently in their ${cycleInfo.currentPhase} phase (day ${cycleInfo.cycleDay} of ${cycleInfo.averageCycleLength}-day cycle).
  User context: ${profile?.healthContextSummary || 'No specific health context provided.'}
  
  Format as JSON:
  {
    "title": "string (max 60 chars, engaging, not clickbait)",
    "tagline": "string (max 100 chars — shown on dashboard card)",
    "body": "string (200-250 words, practical advice for their current phase)",
    "phase": "string",
    "tips": ["string", "string", "string"],
    "category": "nutrition | exercise | mental_health | sleep | symptoms"
  }
  
  Guidelines:
  - If luteal phase: focus on self-care, managing PMS, iron-rich foods
  - If menstrual phase: focus on rest, warmth, hydration, iron replenishment  
  - If follicular phase: focus on energy, new habits, exercise opportunities
  - If ovulation: focus on fertility window, peak energy utilisation
  - Consider Indian diet: suggest dal, ragi, sesame, jaggery as iron sources
    (not just 'eat spinach' — be culturally specific)
  - If user has PCOS: weave in low-GI food suggestions
  - If vegetarian: never suggest meat-based sources`;

            const aiResult = await invokeAI(prompt, "You are a women's health expert. Return ONLY valid JSON.");

            let article;
            try {
                // Remove Markdown if present
                const cleanJson = aiResult.response.replace(/```json\n?|\n?```/g, '').trim();
                article = JSON.parse(cleanJson);
            } catch (e) {
                console.error('AI JSON Parse Error:', e, aiResult.response);
                // Fallback stub if AI fails JSON format
                article = {
                    title: "Managing Energy in your Cycle",
                    tagline: "Your daily insight for your current phase",
                    body: "Hormonal shifts can impact your energy levels throughout the month...",
                    phase: cycleInfo.currentPhase,
                    tips: ["Rest well", "Eat iron-rich foods", "Hydrate"],
                    category: "symptoms"
                };
            }

            // 3. Save to DynamoDB with TTL (midnight tonight)
            const midnight = new Date();
            midnight.setHours(23, 59, 59, 999);
            const ttl = Math.floor(midnight.getTime() / 1000);

            const articleItem = {
                ...article,
                id: cacheKey,
                userId,
                date: today,
                type: 'daily',
                ttl
            };

            await docClient.send(new PutCommand({
                TableName: dynamoDBTables.articles,
                Item: articleItem
            }));

            return NextResponse.json({ success: true, article: articleItem });
        }

        if (type === 'list') {
            const stubs = [
                { id: 'pcos-basics', title: 'PCOS Basics', tagline: 'Understanding the fundamentals of PCOS management', category: 'conditions', phase_relevance: 'All' },
                { id: 'endo-awareness', title: 'Endo Awareness', tagline: 'Recognizing signs and seeking support', category: 'conditions', phase_relevance: 'All' },
                { id: 'pms-mgt', title: 'PMS Management', tagline: 'Tips for handling pre-period tension', category: 'mental_health', phase_relevance: 'Luteal' },
                { id: 'cycle-nutr', title: 'Cycle Nutrition', tagline: 'Eating for your hormones', category: 'nutrition', phase_relevance: 'All' },
                { id: 'sleep-hygiene', title: 'Sleep Hygiene', tagline: 'Better rest across your cycle', category: 'sleep', phase_relevance: 'All' },
                { id: 'exercise-follicular', title: 'Follicular Energy', tagline: 'Maximum intensity workouts', category: 'exercise', phase_relevance: 'Follicular' },
                { id: 'iron-sources', title: 'Iron Rich Foods', tagline: 'Non-meat sources for menstrual health', category: 'nutrition', phase_relevance: 'Menstrual' },
                { id: 'meditation-luteal', title: 'Luteal Calm', tagline: 'Mindfulness for the late cycle', category: 'mental_health', phase_relevance: 'Luteal' },
                { id: 'hydration-vitals', title: 'Hydration Vitals', tagline: 'Why water matters more during ovulation', category: 'symptoms', phase_relevance: 'Ovulation' },
                { id: 'ragi-benefits', title: 'The Power of Ragi', tagline: 'A superfood for women\'s health', category: 'nutrition', phase_relevance: 'All' }
            ];
            return NextResponse.json({ success: true, articles: stubs });
        }

        if (type === 'condition' && condition === 'pcos') {
            const pcosArticles = [
                { id: 'pcos-diet', title: 'The PCOS Friendly Diet', tagline: 'Low GI meals for insulin sensitivity', category: 'nutrition', phase_relevance: 'All' },
                { id: 'pcos-exercise', title: 'Movement for PCOS', tagline: 'Strength training vs Cardio', category: 'exercise', phase_relevance: 'All' },
                { id: 'pcos-supplements', title: 'Inositol & More', tagline: 'Evidence-based supplement guide', category: 'nutrition', phase_relevance: 'All' },
                { id: 'pcos-acne', title: 'Managing Hormonal Acne', tagline: 'Skincare and internal health', category: 'symptoms', phase_relevance: 'All' },
                { id: 'pcos-cycles', title: 'Regulating Irregular Cycles', tagline: 'Natural approaches to cycle health', category: 'conditions', phase_relevance: 'All' }
            ];
            return NextResponse.json({ success: true, articles: pcosArticles });
        }

        return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });

    } catch (error: any) {
        console.error('Articles API Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
