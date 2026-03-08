import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { invokeAI } from '@/lib/aws/bedrock';
import { analyzeHealthPatterns } from '@/lib/utils/pattern-analysis';
import { DEMO_DOCTORS } from '@/lib/constants/doctors';
import { SymptomLog, UserProfile } from '@/types';

const client = new DynamoDBClient({
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

const docClient = DynamoDBDocumentClient.from(client);

export async function POST(request: NextRequest) {
    try {
        const { appointmentId } = await request.json();

        if (!appointmentId) {
            return NextResponse.json({ success: false, error: 'Appointment ID is required' }, { status: 400 });
        }

        const appointmentsTable = process.env.NEXT_PUBLIC_DYNAMODB_APPOINTMENTS_TABLE || 'ovira-appointments';
        const usersTable = process.env.NEXT_PUBLIC_DYNAMODB_USERS_TABLE || 'ovira-users';
        const symptomsTable = process.env.NEXT_PUBLIC_DYNAMODB_SYMPTOMS_TABLE || 'ovira-symptoms';
        const documentsTable = process.env.DYNAMODB_DOCUMENTS_TABLE || 'ovira-documents';

        // 1. Fetch Appointment
        const appointmentRes = await docClient.send(new GetCommand({
            TableName: appointmentsTable,
            Key: { id: appointmentId }
        }));

        if (!appointmentRes.Item) {
            return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
        }

        const appointment = appointmentRes.Item;
        const userId = appointment.userId;
        const doctorId = appointment.doctorId;

        // 2. Fetch User Profile
        const profileRes = await docClient.send(new ScanCommand({
            TableName: usersTable,
            FilterExpression: 'id = :id OR uid = :uid OR email = :email',
            ExpressionAttributeValues: {
                ':id': userId,
                ':uid': userId,
                ':email': userId,
            },
            Limit: 1,
        }));
        const profile = (profileRes.Items?.[0] || {}) as UserProfile;

        // 3. Fetch Last 90 Days of Symptoms
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const startDateStr = ninetyDaysAgo.toISOString().split('T')[0];

        const symptomsRes = await docClient.send(new ScanCommand({
            TableName: symptomsTable,
            FilterExpression: 'userId = :userId AND #d >= :sd',
            ExpressionAttributeNames: { '#d': 'date' },
            ExpressionAttributeValues: {
                ':userId': userId,
                ':sd': startDateStr,
            }
        }));
        const logs = (symptomsRes.Items || []) as SymptomLog[];

        // 4. Fetch Documents
        let documentList = "None uploaded";
        try {
            const docsRes = await docClient.send(new ScanCommand({
                TableName: documentsTable,
                FilterExpression: 'userId = :userId',
                ExpressionAttributeValues: { ':userId': userId }
            }));
            if (docsRes.Items && docsRes.Items.length > 0) {
                documentList = docsRes.Items.map(d => d.fileName || d.name || 'Unnamed document').join(', ');
            }
        } catch (e) {
            console.log('Documents table fetch failed or not configured, skipping docs');
        }

        // 5. Compute Stats using analyzeHealthPatterns
        const analysis = analyzeHealthPatterns(logs, profile);
        const stats = analysis.cycleStats;

        const avgPain = stats.avgPainScore;
        const heavyFlowDays = stats.heavyFlowDays;
        const nonPeriodPainDays = stats.nonPeriodPainDays;
        const topSymptoms = stats.topSymptoms.length > 0 ? stats.topSymptoms.join(', ') : "None logged";

        const lutealMoodSummary = stats.lutealMoodScore < stats.follicularMoodScore - 1
            ? "mood consistently lower in days before period"
            : "mood stable";

        const cyclePattern = stats.cycleLengths.length > 0
            ? `cycles range ${Math.min(...stats.cycleLengths)}-${Math.max(...stats.cycleLengths)} days, averaging ${Math.round(stats.cycleLengths.reduce((a, b) => a + b, 0) / stats.cycleLengths.length)} days`
            : "insufficient data to determine cycle pattern";

        const doctor = DEMO_DOCTORS.find(d => d.doctorId === doctorId);
        const doctorName = doctor?.name || "the specialist";

        // 6. Bedrock Prompt
        const prompt = `Generate a pre-appointment health data summary for a gynaecologist.
This summarises self-tracked data from the Ovira health app.
The patient has explicitly consented to share this with their doctor.
This is NOT a pattern concern. It is pattern data to help the appointment be productive.

Patient: ${profile.displayName || 'User'}, ${profile.ageRange || 'Unknown age'}
Health conditions noted by patient: ${profile.conditions?.join(', ') || 'None reported'}
Diet: ${profile.dietType || 'Not specified'}, ${profile.stapleGrain || 'Not specified'}-dominant staples, iron-rich food intake: ${profile.ironRichFoodFrequency || 'Not specified'}
Activity level: ${profile.activityLevel || 'Not specified'}
Tracking period: ${startDateStr} — ${new Date().toISOString().split('T')[0]} (${logs.length} days logged)
Personal goal for this appointment: ${profile.personalGoal || 'Routine checkup'}

Tracked patterns:
- Cycle pattern: ${cyclePattern}
- Average pain score when logged: ${avgPain}/10
- Heavy flow days in period: ${heavyFlowDays}
- Days with elevated pain outside period: ${nonPeriodPainDays}
- Most frequently logged symptoms: ${topSymptoms}
- Mood pattern: ${lutealMoodSummary}
- Average sleep: ${stats.avgSleepHours} hours/night
- Uploaded documents available: ${documentList}

Generate a summary with these exact sections:
1. Reason for Visit
   (based on personal goal — what the patient wants to discuss today)

2. Cycle & Flow Pattern
   (state the data only — dates, lengths, flow levels — no interpretation)

3. Symptom Patterns Ovira Noticed
   (describe what the data shows — use 'Ovira noticed', 'the data shows',
    'the patient logged' — not 'patient has' or 'indicates')

4. Patterns Worth Discussing Today
   (list 2-4 items from the data that the patient wants evaluated,
    end each with '— worth discussing at this appointment')

5. Patient's Questions for Dr. ${doctorName}
   (generate 3-5 questions based on personal goal and flagged patterns,
    phrased as questions the patient is bringing, not conclusions)

6. Documents Available
   (list uploaded documents or 'None — patient may have additional records')

STRICT RULES:
- NEVER say 'you have', 'patient has [condition]', 'this indicates', 'this means'
- NEVER use: identify concerns about, pattern concern, disorder, disease, treatment, prescribe, medication
- ALWAYS say: 'Ovira noticed a pattern of', 'the data shows', 'worth discussing'
- Footer MUST include:
  'This summary was generated from self-reported tracking data in the Ovira app.
   All observations are pattern-based and are not a medical assessment.
   Please verify all information directly with your patient.'`;

        const aiResult = await invokeAI(prompt, "You are a clinical data summarizer for Ovira AI. You transform patient-tracked data into structured summaries for doctors. Always adhere to strict non-diagnostic language.");
        const summaryText = aiResult.response;

        // 7. Update Appointment
        await docClient.send(new UpdateCommand({
            TableName: appointmentsTable,
            Key: { id: appointmentId },
            UpdateExpression: 'SET summaryGenerated = :g, summaryContent = :s, summaryGeneratedAt = :t',
            ExpressionAttributeValues: {
                ':g': true,
                ':s': summaryText,
                ':t': new Date().toISOString(),
            },
        }));

        return NextResponse.json({ success: true, summaryText });
    } catch (error: any) {
        console.error('Summary generation API error:', error);
        return NextResponse.json({ success: false, error: 'Failed to generate summary', details: error.message }, { status: 500 });
    }
}
