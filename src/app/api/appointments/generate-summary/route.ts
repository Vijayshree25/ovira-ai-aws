import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getUserSymptomLogs, getUserProfile } from '@/lib/aws/dynamodb';
import { calculateHealthStats, analyzeHealthRiskFlags } from '@/lib/utils/healthAnalysis';
import { invokeAI } from '@/lib/aws/bedrock';

const client = new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
const docClient = DynamoDBDocumentClient.from(client);
const APPOINTMENTS_TABLE = process.env.NEXT_PUBLIC_DYNAMODB_APPOINTMENTS_TABLE || 'ovira-appointments';
const DOCUMENTS_TABLE = process.env.NEXT_PUBLIC_DYNAMODB_DOCUMENTS_TABLE || 'ovira-documents';

export async function POST(request: Request) {
    try {
        const { userId, appointmentId } = await request.json();

        if (!userId || !appointmentId) {
            return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
        }

        // 1. Fetch user data (12 months)
        const profile = await getUserProfile(userId);
        if (!profile) {
            return NextResponse.json({ success: false, error: 'User profile not found' }, { status: 404 });
        }

        const logs = await getUserSymptomLogs(userId, 365);

        // 1.5 Fetch Documents List
        const docsRes = await docClient.send(new QueryCommand({
            TableName: DOCUMENTS_TABLE,
            KeyConditionExpression: 'userId = :uid',
            ExpressionAttributeValues: { ':uid': userId }
        }));
        const documents = (docsRes.Items || []).filter(d => d.shouldIncludeInSummary !== false);
        const documentSummary = documents.map(d => `${d.filename || d.fileName} (${(d.category || 'General').replace('_', ' ')})`).join(', ') || 'None';

        // 2. Perform pattern analysis
        const stats = calculateHealthStats(logs, profile);
        const riskFlags = analyzeHealthRiskFlags(logs, profile);

        // 3. Prepare Bedrock Prompt
        const prompt = `
Generate a health summary for a patient to share with their gynaecologist.
This is based on self-tracked data from the Ovira AI app.

Patient: ${profile.displayName}, ${profile.ageRange}, ${profile.dietType} diet with ${profile.stapleGrain}-dominant staples
Self-reported concerns: ${profile.conditions?.join(', ') || 'None'}
Cycle: ${profile.averageCycleLength || 28} days average, ${profile.cycleRegularity || 'not specified'}
Questions for this appointment: ${profile.personalGoal || 'General checkup'}
Tracking: ${stats.totalLogs} entries over ${stats.monthsCovered} months

Pattern data from tracking:
- Average pain: ${stats.avgPain}/10
- Heavy flow days in 6 months: ${stats.heavyFlowDays}
- Most reported symptoms: ${stats.topSymptoms.join(', ') || 'None'}
- Mood pattern before periods: ${stats.lutealMoodPattern}
- Recent cycle lengths: ${stats.cycleLengths.join(', ') || 'N/A'}
- Non-period days with pain above 5: ${stats.nonPeriodPainDays}

Flagged concerns from pattern analysis:
${riskFlags.map(f => `- [${f.severity.toUpperCase()}] ${f.type} pattern: ${f.description} (Flagged for evaluation)`).join('\n')}

Documents being shared: ${documentSummary}

Generate these sections:
1 - About the Patient
2 - Cycle and Flow Patterns
3 - Flagged Concerns
4 - Diet and Lifestyle Context
5 - Documents Shared
6 - Questions for This Appointment

LANGUAGE RULES — every line must follow:
NEVER write: diagnose, diagnosis, you have [condition], at risk, treatment, cure, prescribe, medication, disorder, prescription
ALWAYS write: pattern suggests, worth discussing, flagged for your evaluation, self-tracked observation, your patient may want to explore this with you
End every concern with: flagged for your evaluation

Final paragraph must say: This summary contains self-tracked data from the Ovira AI app. It is not a medical assessment. All observations are for your professional evaluation only.
`;

        const systemPrompt = "You are a medical data summarizer. You generate professional summaries for gynaecologists based on patient tracking data. You strictly follow non-diagnostic language rules.";

        // 4. Generate AI Summary
        const aiResponse = await invokeAI(prompt, systemPrompt);
        const summaryText = aiResponse.response;

        // 5. Update Appointment in DynamoDB
        await docClient.send(new UpdateCommand({
            TableName: APPOINTMENTS_TABLE,
            Key: { userId, appointmentId },
            UpdateExpression: 'SET healthSummaryGenerated = :gen, summaryText = :text, updatedAt = :now',
            ExpressionAttributeValues: {
                ':gen': true,
                ':text': summaryText.trim(),
                ':now': new Date().toISOString(),
            }
        }));

        return NextResponse.json({
            success: true,
            summaryText: summaryText.trim()
        });

    } catch (error: any) {
        console.error('Error in generate-summary:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
