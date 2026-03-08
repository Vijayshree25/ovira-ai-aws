/**
 * Seed DynamoDB with 365 days of realistic PCOS symptom data for Priya Sharma.
 *
 * Usage:
 *   node scripts/seed-demo-data.mjs
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

// ── Config ──────────────────────────────────────────────────────────────────
const REGION = process.env.AWS_REGION || 'us-east-1';
const USERS_TABLE = process.env.NEXT_PUBLIC_DYNAMODB_USERS_TABLE || 'ovira-users';
const SYMPTOMS_TABLE = process.env.NEXT_PUBLIC_DYNAMODB_SYMPTOMS_TABLE || 'ovira-symptoms';
const DOCTORS_TABLE = process.env.NEXT_PUBLIC_DYNAMODB_DOCTORS_TABLE || 'ovira-doctors';
const DOCUMENTS_TABLE = process.env.NEXT_PUBLIC_DYNAMODB_DOCUMENTS_TABLE || 'ovira-documents';
const CHAT_TABLE = process.env.NEXT_PUBLIC_DYNAMODB_CHAT_TABLE || 'ovira-chat-history';
const APPOINTMENTS_TABLE = process.env.NEXT_PUBLIC_DYNAMODB_APPOINTMENTS_TABLE || 'ovira-appointments';

const TODAY = new Date();
TODAY.setHours(12, 0, 0, 0);

const PRIYA_ID = "demo-user-ovira-2025";

const DEMO_USER_PRIYA = {
    id: PRIYA_ID,
    uid: PRIYA_ID,
    email: "demo@ovira.ai",
    displayName: "Priya Sharma (Demo Account)",
    ageRange: "25-34",
    conditions: ["PCOS"],
    averageCycleLength: 34,
    lastPeriodStart: new Date(TODAY.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    language: "en",
    dietType: "vegetarian",
    stapleGrain: "rice",
    ironRichFoodFrequency: "sometimes",
    waterIntake: 6,
    caffeineIntake: "1-2 cups",
    sleepHabit: "10pm-12am",
    activityLevel: "lightly_active",
    healthContextSummary: "Priya is a 27-year-old vegetarian woman from Bangalore with PCOS. She follows a South Indian rice-dominant diet with moderate dal/spinach intake. Her cycle averages 34 days (PCOS-influenced irregularity, range 31-38 days). She experiences moderate-to-severe luteal phase mood changes, persistent acne in follicular phase (androgen excess pattern), and occasional heavy flow days. Her personal goal is understanding PCOS and managing irregular cycles. Iron absorption may be lower due to rice phytates. Chai intake may worsen iron absorption if consumed with meals.",
    hasDoctorConsultation: true,
    personalGoal: "Understand my PCOS and manage irregular cycles",
    onboardingComplete: true,
    createdAt: new Date(TODAY.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(),
};

// ── DynamoDB client ─────────────────────────────────────────────────────────
const rawClient = new DynamoDBClient({
    region: REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
const docClient = DynamoDBDocumentClient.from(rawClient);

// ── Helpers ─────────────────────────────────────────────────────────────────
function rand(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany(arr, min, max) {
    const count = rand(min, max);
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

// ── Logic ───────────────────────────────────────────────────────────────────

function generateLogs() {
    const logs = [];
    let currentDate = new Date(TODAY.getTime() - 365 * 24 * 60 * 60 * 1000);
    currentDate.setHours(12, 0, 0, 0);

    let dayInCycle = 1;
    let cycleLength = rand(31, 38);
    let monthIndex = 0;

    for (let day = 0; day < 365; day++) {
        monthIndex = Math.floor(day / 30);

        // PCOS pattern: Menstrual (5-7 days), Follicular, Ovulation (sometimes missed), Luteal (10-14 days)
        let phase = 'follicular';
        let periodDuration = rand(5, 7);

        if (dayInCycle <= periodDuration) phase = 'menstrual';
        else if (dayInCycle <= periodDuration + 7) phase = 'follicular';
        else if (dayInCycle <= periodDuration + 11) phase = 'ovulation';
        else if (dayInCycle <= cycleLength - 7) phase = 'luteal-early';
        else phase = 'luteal-late';

        // Month-based evolution
        const severityModifier = monthIndex < 3 ? 1.2 : (monthIndex < 6 ? 1.0 : 0.8);
        const detailLevel = monthIndex >= 9 ? 1.0 : 0.6;

        const dateStr = currentDate.toISOString().split('T')[0];

        // Skip some logs for early months to simulate "not tracking regularly"
        if (monthIndex < 6 && Math.random() > 0.4 && day % 2 === 0) {
            // keep it
        } else if (monthIndex < 6 && Math.random() > 0.7) {
            // skip
            currentDate.setDate(currentDate.getDate() + 1);
            dayInCycle++;
            if (dayInCycle > cycleLength) {
                dayInCycle = 1;
                cycleLength = rand(31, 38);
            }
            continue;
        }

        // Flow Level
        let flowLevel = 'none';
        if (phase === 'menstrual') {
            const isHeavyCycle = Math.random() < 0.3;
            if (isHeavyCycle && dayInCycle <= 3) flowLevel = 'heavy';
            else if (dayInCycle <= 3) flowLevel = 'medium';
            else flowLevel = 'light';
        }

        // Pain Level (PCOS pattern: 5-8 period, 3-6 late luteal)
        let painLevel = 0;
        if (phase === 'menstrual') painLevel = rand(5, 8);
        else if (phase === 'luteal-late') painLevel = rand(3, 6);
        else painLevel = rand(0, 2);

        painLevel = Math.min(10, Math.round(painLevel * severityModifier));

        // Mood (bad/terrible for last 5 days in 70% of cycles)
        let mood = 'neutral';
        if (phase === 'luteal-late' && dayInCycle > cycleLength - 5) {
            mood = Math.random() < 0.7 ? pick(['bad', 'terrible']) : 'neutral';
        } else if (phase === 'menstrual') {
            mood = pick(['bad', 'neutral']);
        } else if (phase === 'ovulation') {
            mood = pick(['good', 'great']);
        } else {
            mood = pick(['good', 'neutral']);
        }

        // Energy (gradually improves follicular)
        let energyLevel = 'medium';
        if (phase === 'menstrual') energyLevel = 'low';
        else if (phase === 'follicular') energyLevel = dayInCycle < periodDuration + 4 ? 'medium' : 'high';
        else if (phase === 'ovulation') energyLevel = 'high';
        else energyLevel = 'medium';

        // Sleep
        let sleepHours = phase === 'luteal-late' ? 6 + Math.random() : 7 + Math.random();

        // Symptoms
        const symptoms = [];
        if (phase === 'menstrual') symptoms.push(...pickMany(['Cramps', 'Fatigue', 'Bloating', 'Back pain'], 1, 3));
        if (phase === 'follicular' && Math.random() < 0.65) symptoms.push('Acne');
        if (phase === 'luteal-late') {
            if (Math.random() < 0.6) symptoms.push('Anxiety');
            symptoms.push(...pickMany(['Mood swings', 'Bloating', 'Breast tenderness'], 1, 3));
        }

        // Notes (Indian context)
        let notes = "";
        if (Math.random() < detailLevel) {
            if (phase === 'menstrual' && dayInCycle === 1) notes = pick(["Period started, jaggery and ginger tea helping", "Period day 1 — crampy"]);
            else if (phase === 'follicular' && Math.random() < 0.3) notes = pick(["Skin breaking out again", "Had idli for lunch, good energy"]);
            else if (phase === 'luteal-late' && Math.random() < 0.3) notes = pick(["Mood swings so bad today", "Craving sweets — probably PMS", "Chai not helping today 😅"]);
        }

        logs.push({
            id: `${PRIYA_ID}_${dateStr}`,
            userId: PRIYA_ID,
            date: dateStr,
            flowLevel,
            painLevel,
            mood,
            energyLevel,
            sleepHours,
            symptoms,
            notes,
            createdAt: currentDate.toISOString(),
            updatedAt: currentDate.toISOString(),
        });

        currentDate.setDate(currentDate.getDate() + 1);
        dayInCycle++;
        if (dayInCycle > cycleLength) {
            dayInCycle = 1;
            cycleLength = rand(31, 38);
        }
    }
    return logs;
}

async function writeBatches(table, items) {
    const batchSize = 25;
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const requests = batch.map(item => ({ PutRequest: { Item: item } }));
        await docClient.send(new BatchWriteCommand({
            RequestItems: { [table]: requests }
        }));
        if (i % 100 === 0) process.stdout.write(`.`);
    }
}

async function main() {
    console.log(`🌱 Seeding data for Priya Sharma (${PRIYA_ID})...`);

    // 1. User Profile
    await docClient.send(new PutCommand({ TableName: USERS_TABLE, Item: DEMO_USER_PRIYA }));
    console.log("   ✓ User Profile seeded.");

    // 2. Doctor
    await docClient.send(new PutCommand({
        TableName: DOCTORS_TABLE,
        Item: {
            userId: PRIYA_ID,
            doctorId: "doctor-001",
            name: "Dr. Meera Nair",
            specialty: "Gynaecologist",
            hospital: "Apollo Hospitals",
            city: "Bangalore",
            notes: "Diagnosed PCOS in September 2024. Recommended lifestyle changes and cycle tracking.",
            isPreferred: true
        }
    }));
    console.log("   ✓ Doctor seeded.");

    // 3. Document
    await docClient.send(new PutCommand({
        TableName: DOCUMENTS_TABLE,
        Item: {
            userId: PRIYA_ID,
            docId: "doc-001",
            fileSize: 245000,
            shouldIncludeInSummary: true
        }
    }));
    await docClient.send(new PutCommand({
        TableName: DOCUMENTS_TABLE,
        Item: {
            userId: PRIYA_ID,
            docId: "doc-002",
            filename: "Blood_Test_Aug2024.pdf",
            category: "Blood Test",
            uploadedAt: "2024-08-10",
            s3Key: `${PRIYA_ID}/doc-002-Blood_Test_Aug2024.pdf`,
            fileSize: 156000,
            shouldIncludeInSummary: false
        }
    }));
    console.log("   ✓ Document stubs seeded.");

    // 4. Chat Session & History
    const session = {
        userId: PRIYA_ID,
        sessionId_timestamp: `session-001#${new Date("2025-01-15").toISOString()}`,
        type: "doctor_session",
        createdAt: "2025-01-15T10:00:00Z",
        generatedSummary: true,
        summaryText: "Chief Complaint: Irregular cycles and acne. History: PCOS diagnosed Sep 2024. Patient tracking symptoms.",
        timestamp: "2025-01-15T10:00:00Z"
    };
    await docClient.send(new PutCommand({ TableName: CHAT_TABLE, Item: session }));

    const messages = [
        "Hi Aria, I've been noticing more acne lately. Is this typical for PCOS?",
        "Yes Priya, androgen excess in PCOS often leads to acne, especially in the follicular phase.",
        "Can jaggery help with my energy levels during periods?",
        "Jaggery is a good source of iron and energy, but watch the sugar spike.",
        "I missed my ovulation this month, should I be worried?",
        "PCOS can cause occasional anovulatory cycles. Keep tracking to see the pattern.",
        "What's a good Ragi recipe for iron?",
        "Ragi malt or Ragi mudde are excellent. Pair with Vitamin C for better iron absorption.",
        "I'm feeling very anxious today, could it be PMS?",
        "Anxiety is a common luteal phase symptom in PCOS. Deep breathing might help."
    ].map((content, i) => ({
        userId: PRIYA_ID,
        sessionId_timestamp: `recent-chat#${new Date(TODAY.getTime() - (20 - i) * 24 * 60 * 60 * 1000).toISOString()}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content,
        timestamp: new Date(TODAY.getTime() - (20 - i) * 24 * 60 * 60 * 1000).toISOString(),
    }));

    await writeBatches(CHAT_TABLE, messages);
    console.log("\n   ✓ Chat history seeded.");

    // 5. Upcoming Appointment (Tomorrow)
    const tomorrow = new Date(TODAY.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

    await docClient.send(new PutCommand({
        TableName: APPOINTMENTS_TABLE,
        Item: {
            userId: PRIYA_ID,
            appointmentId: "appt-demo-001",
            doctorId: "doctor-001",
            doctorName: "Dr. Meera Nair",
            hospital: "Apollo Hospitals",
            date: tomorrowStr,
            time: "10:30 AM",
            status: "confirmed",
            healthSummaryGenerated: true,
            healthSummarySent: false,
            summaryText: "Patient presents with regular concerns about PCOS. Cycle analysis shows 34 day average. No severe pain flags this month. Mood pattern stable.",
            createdAt: TODAY.toISOString()
        }
    }));
    console.log("   ✓ Upcoming appointment seeded.");

    // 5. Symptom Logs (365 days)
    console.log("   📊 Generating 365 days of logs...");
    const logs = generateLogs();
    await writeBatches(SYMPTOMS_TABLE, logs);

    console.log(`\n\n✅ Seeding complete! Seeded ${logs.length} logs, 1 doctor, 1 document for Priya Sharma.`);
}

main().catch(console.error);
