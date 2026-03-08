import { NextRequest, NextResponse } from 'next/server';
import { generateHealthReportSummary, sanitizeResponse } from '@/lib/aws/bedrock';
import { retrieveAndGenerate, retryWithBackoff, type Citation } from '@/lib/aws/bedrock-kb';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SymptomLogInput {
    id: string;
    date: string;
    flowLevel: 'none' | 'light' | 'medium' | 'heavy';
    painLevel: number;
    mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
    energyLevel: 'high' | 'medium' | 'low';
    sleepHours: number;
    symptoms?: string[];
    notes?: string;
}

interface UserProfileInput {
    displayName?: string;
    ageRange?: string;
    conditions?: string[];
    averageCycleLength?: number;
    lastPeriodStart?: string;
    healthContextSummary?: string;
    dietType?: string;
    stapleGrain?: string;
    ironRichFoodFrequency?: string;
}

interface HealthReportRequest {
    logs: SymptomLogInput[];
    userProfile: UserProfileInput;
}

interface ClinicalStats {
    totalLogs: number;
    dateRange: { start: string; end: string };
    avgPainScore: number;
    avgSleepHours: number;
    heavyFlowDays: number;
    heavyFlowCycles: number;
    nonPeriodPainDays: number;
    lutealMoodScore: number;
    follicularMoodScore: number;
    cycleLengths: number[];
    topSymptoms: Array<{ symptom: string; count: number; percentage: number }>;
    fatigueDuringPeriod: number;
    userConditions: string[];
    // Preserved from original for fallback
    lowEnergyDays: number;
    poorMoodDays: number;
    highPainDays: number;
    flowDays: number;
    symptomCounts: Record<string, number>;
    moodCounts: Record<string, number>;
    flowCounts: Record<string, number>;
    energyCounts: Record<string, number>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CLINICAL_KB_ID = process.env.BEDROCK_CLINICAL_KB_ID || '';

const CLINICAL_SYSTEM_PROMPT = `You are a clinical pattern analysis assistant for Ovira AI.
You generate structured health reports for users to share with their gynaecologist.

INPUT CONTEXT: You will receive a JSON object with the user's symptom statistics
calculated from their logged data. Use this data + the clinical references below
to generate a structured report.

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
   clinicalBasis (the guideline cited), indicators (string[]), recommendation

Clinical references from the knowledge base:
$search_results$`;

// ─── Mood Scoring ────────────────────────────────────────────────────────────

const MOOD_SCORES: Record<string, number> = {
    great: 5,
    good: 4,
    neutral: 3,
    bad: 2,
    terrible: 1,
};

// ─── Enhanced Stats Calculation ──────────────────────────────────────────────

function calculateClinicalStats(
    logs: SymptomLogInput[],
    userProfile: UserProfileInput,
): ClinicalStats {
    const totalLogs = logs.length;
    const sortedLogs = [...logs].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Basic averages
    const avgPainScore = totalLogs > 0
        ? logs.reduce((sum, l) => sum + l.painLevel, 0) / totalLogs
        : 0;
    const avgSleepHours = totalLogs > 0
        ? logs.reduce((sum, l) => sum + l.sleepHours, 0) / totalLogs
        : 0;

    // Flow analysis
    const heavyFlowDays = logs.filter((l) => l.flowLevel === 'heavy').length;
    const flowDays = logs.filter((l) => l.flowLevel !== 'none').length;

    // Energy / mood counts
    const lowEnergyDays = logs.filter((l) => l.energyLevel === 'low').length;
    const poorMoodDays = logs.filter((l) =>
        ['bad', 'terrible'].includes(l.mood),
    ).length;
    const highPainDays = logs.filter((l) => l.painLevel >= 7).length;

    // Symptom frequency
    const symptomCounts: Record<string, number> = {};
    logs.forEach((log) => {
        log.symptoms?.forEach((symptom) => {
            symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
        });
    });

    const topSymptoms = Object.entries(symptomCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([symptom, count]) => ({
            symptom,
            count,
            percentage: Math.round((count / totalLogs) * 100),
        }));

    // Mood distribution
    const moodCounts: Record<string, number> = {};
    logs.forEach((log) => {
        moodCounts[log.mood] = (moodCounts[log.mood] || 0) + 1;
    });

    // Flow distribution
    const flowCounts: Record<string, number> = {};
    logs.forEach((log) => {
        flowCounts[log.flowLevel] = (flowCounts[log.flowLevel] || 0) + 1;
    });

    // Energy distribution
    const energyCounts: Record<string, number> = {};
    logs.forEach((log) => {
        energyCounts[log.energyLevel] = (energyCounts[log.energyLevel] || 0) + 1;
    });

    // ── Advanced clinical stats ──────────────────────────────────────────

    // Date range
    const dateRange = {
        start: sortedLogs[0]?.date || '',
        end: sortedLogs[sortedLogs.length - 1]?.date || '',
    };

    // Identify period days (days with any flow)
    const periodDayDates = new Set(
        logs.filter((l) => l.flowLevel !== 'none').map((l) => l.date),
    );

    // Non-period pain days: pain > 5 on days outside period
    const nonPeriodPainDays = logs.filter(
        (l) => l.painLevel > 5 && !periodDayDates.has(l.date),
    ).length;

    // Heavy flow cycles: estimate cycles & count those with ≥ 5 heavy days
    const cycleLength = userProfile.averageCycleLength || 28;
    const totalDaysSpan =
        sortedLogs.length >= 2
            ? Math.ceil(
                (new Date(sortedLogs[sortedLogs.length - 1].date).getTime() -
                    new Date(sortedLogs[0].date).getTime()) /
                (1000 * 60 * 60 * 24),
            )
            : 0;
    const estimatedCycles = Math.max(1, Math.round(totalDaysSpan / cycleLength));

    // Group heavy days by approximate cycle (buckets of cycleLength days)
    let heavyFlowCycles = 0;
    if (totalDaysSpan > 0) {
        const firstDate = new Date(sortedLogs[0].date).getTime();
        const heavyByCycle: Record<number, number> = {};

        logs.filter((l) => l.flowLevel === 'heavy').forEach((l) => {
            const dayOffset = Math.floor(
                (new Date(l.date).getTime() - firstDate) / (1000 * 60 * 60 * 24),
            );
            const cycleIndex = Math.floor(dayOffset / cycleLength);
            heavyByCycle[cycleIndex] = (heavyByCycle[cycleIndex] || 0) + 1;
        });

        heavyFlowCycles = Object.values(heavyByCycle).filter((count) => count >= 5).length;
    }

    // Cycle lengths from last period start (estimate last 3)
    const cycleLengths: number[] = [];
    if (userProfile.lastPeriodStart && userProfile.averageCycleLength) {
        // Use average as best estimate; we'd need multiple period start dates for actuals
        for (let i = 0; i < Math.min(3, estimatedCycles); i++) {
            cycleLengths.push(userProfile.averageCycleLength);
        }
    }

    // Luteal mood score: average mood in last 7 days before estimated period
    // Follicular mood score: average mood in days 6–13 of estimated cycle
    let lutealMoodScore = 3; // default neutral
    let follicularMoodScore = 3;

    if (sortedLogs.length > 0 && userProfile.lastPeriodStart) {
        const periodStart = new Date(userProfile.lastPeriodStart).getTime();

        const lutealLogs = sortedLogs.filter((l) => {
            const logTime = new Date(l.date).getTime();
            const daysBefore = (periodStart - logTime) / (1000 * 60 * 60 * 24);
            return daysBefore >= 0 && daysBefore <= 7;
        });

        const follicularLogs = sortedLogs.filter((l) => {
            const logTime = new Date(l.date).getTime();
            const daysAfter = (logTime - periodStart) / (1000 * 60 * 60 * 24);
            return daysAfter >= 6 && daysAfter <= 13;
        });

        if (lutealLogs.length > 0) {
            lutealMoodScore =
                lutealLogs.reduce((sum, l) => sum + (MOOD_SCORES[l.mood] || 3), 0) /
                lutealLogs.length;
        }

        if (follicularLogs.length > 0) {
            follicularMoodScore =
                follicularLogs.reduce((sum, l) => sum + (MOOD_SCORES[l.mood] || 3), 0) /
                follicularLogs.length;
        }
    }

    // Fatigue during period: % of period days with "Fatigue" symptom
    const periodLogsWithFatigue = logs.filter(
        (l) =>
            l.flowLevel !== 'none' &&
            l.symptoms?.some((s) => s.toLowerCase().includes('fatigue')),
    ).length;
    const fatigueDuringPeriod =
        periodDayDates.size > 0
            ? Math.round((periodLogsWithFatigue / periodDayDates.size) * 100)
            : 0;

    return {
        totalLogs,
        dateRange,
        avgPainScore: Math.round(avgPainScore * 10) / 10,
        avgSleepHours: Math.round(avgSleepHours * 10) / 10,
        heavyFlowDays,
        heavyFlowCycles,
        nonPeriodPainDays,
        lutealMoodScore: Math.round(lutealMoodScore * 10) / 10,
        follicularMoodScore: Math.round(follicularMoodScore * 10) / 10,
        cycleLengths,
        topSymptoms,
        fatigueDuringPeriod,
        userConditions: userProfile.conditions || [],
        // Preserved for fallback
        lowEnergyDays,
        poorMoodDays,
        highPainDays,
        flowDays,
        symptomCounts,
        moodCounts,
        flowCounts,
        energyCounts,
    };
}

// ─── Citation Helpers ────────────────────────────────────────────────────────

/**
 * Format citation sources into a readable footer.
 */
function formatCitationFooter(citations: Citation[]): string {
    if (citations.length === 0) return '';

    const sourceNames = citations
        .map((c) => c.source)
        .filter((s) => s !== 'Unknown source')
        .filter((s, i, arr) => arr.indexOf(s) === i)
        .map((s) => {
            if (s.startsWith('s3://')) {
                const filename = s.split('/').pop() || s;
                return filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
            }
            return s;
        });

    if (sourceNames.length === 0) return '';
    return `\n\n📚 Clinical Sources: ${sourceNames.join(', ')}`;
}

// ─── Route Handler ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    try {
        const { logs, userProfile }: HealthReportRequest = await request.json();

        if (!logs || logs.length === 0) {
            return NextResponse.json(
                {
                    error: 'No symptom logs provided',
                    message: 'Please log some symptoms before generating a health report.',
                },
                { status: 400 },
            );
        }

        // Calculate enhanced clinical statistics
        const stats = calculateClinicalStats(logs, userProfile);

        // Check for AWS credentials
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            console.log('AWS credentials not configured, returning fallback report');
            return NextResponse.json({
                ...generateFallbackReport(logs, userProfile, stats),
                citations: [],
                ragEnabled: false,
            });
        }

        // ── Attempt KB-backed clinical report ───────────────────────────────

        if (CLINICAL_KB_ID) {
            try {
                console.log('Health Report — Generating via Clinical Knowledge Base');

                // Build the stats JSON to pass to the KB
                const statsJson = JSON.stringify(
                    {
                        totalLogs: stats.totalLogs,
                        dateRange: stats.dateRange,
                        avgPainScore: stats.avgPainScore,
                        avgSleepHours: stats.avgSleepHours,
                        heavyFlowDays: stats.heavyFlowDays,
                        heavyFlowCycles: stats.heavyFlowCycles,
                        nonPeriodPainDays: stats.nonPeriodPainDays,
                        lutealMoodScore: stats.lutealMoodScore,
                        follicularMoodScore: stats.follicularMoodScore,
                        cycleLengths: stats.cycleLengths,
                        topSymptoms: stats.topSymptoms,
                        fatigueDuringPeriod: stats.fatigueDuringPeriod,
                        userConditions: stats.userConditions,
                        dietType: userProfile.dietType || 'not specified',
                        stapleGrain: userProfile.stapleGrain || 'not specified',
                        ironRichFoodFrequency: userProfile.ironRichFoodFrequency || 'not specified',
                    },
                    null,
                    2,
                );

                const question = `Generate a comprehensive health report for a patient with these menstrual health statistics:\n\n${statsJson}`;

                // Inject user health context into the clinical system prompt
                const clinicalPrompt = userProfile.healthContextSummary
                    ? `USER HEALTH CONTEXT:\n${userProfile.healthContextSummary}\n\n${CLINICAL_SYSTEM_PROMPT}`
                    : CLINICAL_SYSTEM_PROMPT;

                const { answer, citations, modelUsed } = await retryWithBackoff(() =>
                    retrieveAndGenerate(
                        question,
                        CLINICAL_KB_ID,
                        clinicalPrompt,
                        1200, // larger token budget for structured clinical output
                    ),
                );

                // Apply medical safety guardrails
                const sanitizedAnswer = sanitizeResponse(answer);

                // Try to parse JSON from KB response
                const jsonMatch = sanitizedAnswer.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    try {
                        const reportData = JSON.parse(jsonMatch[0]);

                        // Enrich riskFlags with citation-backed clinicalBasis
                        if (reportData.riskFlags && Array.isArray(reportData.riskFlags)) {
                            reportData.riskFlags = reportData.riskFlags.map(
                                (flag: Record<string, unknown>) => ({
                                    ...flag,
                                    // Preserve KB-generated clinicalBasis if present
                                    clinicalBasis:
                                        flag.clinicalBasis ||
                                        (citations.length > 0
                                            ? citations[0].source
                                            : 'Clinical guidelines'),
                                }),
                            );
                        }

                        // Add metadata
                        reportData.generatedAt = new Date().toISOString();
                        reportData.periodStart = logs[logs.length - 1]?.date;
                        reportData.periodEnd = logs[0]?.date;
                        reportData.totalLogsAnalyzed = logs.length;
                        reportData.patientInfo = {
                            name: userProfile.displayName || 'Patient',
                            ageRange: userProfile.ageRange,
                            conditions: userProfile.conditions || [],
                            averageCycleLength: userProfile.averageCycleLength || 28,
                        };
                        reportData.statistics = stats;
                        reportData.model_used = modelUsed;
                        reportData.citations = citations;
                        reportData.ragEnabled = true;

                        // Append citation footer to executive summary
                        if (reportData.executiveSummary && citations.length > 0) {
                            reportData.executiveSummary += formatCitationFooter(citations);
                        }

                        return NextResponse.json(reportData);
                    } catch (parseError) {
                        console.warn('Failed to parse KB JSON response, falling back:', parseError);
                        // Fall through to generateHealthReportSummary fallback
                    }
                } else {
                    console.warn('KB response did not contain JSON, falling back');
                }
            } catch (kbError) {
                console.error(
                    'Clinical KB call failed after retries, falling back to direct Claude:',
                    kbError,
                );
            }
        } else {
            console.warn('BEDROCK_CLINICAL_KB_ID not set — skipping KB');
        }

        // ── Fallback: direct generateHealthReportSummary (no RAG) ───────────

        try {
            console.log('Health Report — Falling back to direct Bedrock');

            const userContext = `
USER PROFILE:
- Name: ${userProfile.displayName || 'Patient'}
- Age Range: ${userProfile.ageRange || 'Not specified'}
- Known Conditions: ${userProfile.conditions?.join(', ') || 'None reported'}
- Average Cycle Length: ${userProfile.averageCycleLength || 28} days
- Diet Type: ${userProfile.dietType || 'Not specified'}
- Staple Grain: ${userProfile.stapleGrain || 'Not specified'}
- Iron-Rich Food Frequency: ${userProfile.ironRichFoodFrequency || 'Not specified'}
${userProfile.healthContextSummary ? `\nHEALTH CONTEXT SUMMARY:\n${userProfile.healthContextSummary}` : ''}
`;

            const symptomData = `
SYMPTOM LOGS (${logs.length} entries):
${logs
                    .slice(0, 10)
                    .map(
                        (log) => `
Date: ${log.date}
- Flow: ${log.flowLevel}
- Pain Level: ${log.painLevel}/10
- Mood: ${log.mood}
- Energy: ${log.energyLevel}
- Sleep: ${log.sleepHours} hours
- Symptoms: ${log.symptoms?.join(', ') || 'None'}
`,
                    )
                    .join('\n')}
${logs.length > 10 ? `\n... and ${logs.length - 10} more entries` : ''}

CALCULATED STATISTICS:
- Total Logs: ${stats.totalLogs}
- Average Pain: ${stats.avgPainScore}/10
- Heavy Flow Days: ${stats.heavyFlowDays}
- Average Sleep: ${stats.avgSleepHours} hours
- Low Energy Days: ${stats.lowEnergyDays}
- Poor Mood Days: ${stats.poorMoodDays}
- Most Common Symptoms: ${stats.topSymptoms.map((s) => s.symptom).join(', ') || 'None recorded'}
`;

            const { response: aiResponse, model_used, attempts } =
                await generateHealthReportSummary(symptomData, userContext);

            if (model_used === 'static-fallback') {
                console.log('AI returned static fallback, using generated fallback report');
                const fallbackReport = generateFallbackReport(logs, userProfile, stats);
                return NextResponse.json({
                    ...fallbackReport,
                    model_used,
                    attempts,
                    citations: [],
                    ragEnabled: false,
                });
            }

            // Try to parse JSON from AI response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const reportData = JSON.parse(jsonMatch[0]);

                reportData.generatedAt = new Date().toISOString();
                reportData.periodStart = logs[logs.length - 1]?.date;
                reportData.periodEnd = logs[0]?.date;
                reportData.totalLogsAnalyzed = logs.length;
                reportData.patientInfo = {
                    name: userProfile.displayName || 'Patient',
                    ageRange: userProfile.ageRange,
                    conditions: userProfile.conditions || [],
                    averageCycleLength: userProfile.averageCycleLength || 28,
                };
                reportData.statistics = stats;
                reportData.model_used = model_used;
                reportData.attempts = attempts;
                reportData.citations = [];
                reportData.ragEnabled = false;

                return NextResponse.json(reportData);
            }

            // JSON parsing failed
            console.warn('Failed to parse AI response as JSON, using fallback report');
            const fallbackReport = generateFallbackReport(logs, userProfile, stats);
            return NextResponse.json({
                ...fallbackReport,
                model_used,
                attempts,
                citations: [],
                ragEnabled: false,
            });
        } catch (aiError) {
            console.error('Bedrock AI generation failed, using fallback:', aiError);
        }

        // ── Final static fallback ───────────────────────────────────────────

        return NextResponse.json({
            ...generateFallbackReport(logs, userProfile, stats),
            citations: [],
            ragEnabled: false,
        });
    } catch (error) {
        console.error('Health Report API error:', error);
        return NextResponse.json(
            { error: 'Failed to generate health report', message: 'Please try again later.' },
            { status: 500 },
        );
    }
}

// ─── Fallback Report Generator ──────────────────────────────────────────────

function generateFallbackReport(
    logs: SymptomLogInput[],
    userProfile: UserProfileInput,
    stats: ClinicalStats,
) {
    const riskAssessment = [];

    // Check for anemia indicators
    if (stats.heavyFlowDays >= 3 && stats.lowEnergyDays >= 3) {
        riskAssessment.push({
            condition: 'Iron Deficiency/Anemia',
            riskLevel: 'medium',
            confidence: 'medium',
            indicators: ['Heavy menstrual bleeding', 'Persistent fatigue/low energy'],
            recommendation: 'Consider getting iron levels checked with a blood test',
        });
    }

    // Check for severe pain patterns
    if (stats.highPainDays >= 3 || stats.avgPainScore >= 7) {
        riskAssessment.push({
            condition: 'Endometriosis/Severe Dysmenorrhea',
            riskLevel: 'medium',
            confidence: 'low',
            indicators: [
                'Consistent severe pelvic pain',
                `Average pain level: ${stats.avgPainScore}/10`,
            ],
            recommendation: 'Discuss pain management options with a gynecologist',
        });
    }

    // Check for mood concerns
    if (stats.poorMoodDays >= stats.totalLogs * 0.5) {
        riskAssessment.push({
            condition: 'Mood Pattern/PMDD',
            riskLevel: 'low',
            confidence: 'medium',
            indicators: ['Frequent low mood correlating with cycle'],
            recommendation:
                'Consider speaking with a healthcare provider about emotional health support',
        });
    }

    return {
        executiveSummary: `Health report based on ${stats.totalLogs} symptom logs. Average pain level is ${stats.avgPainScore}/10 with ${stats.heavyFlowDays} heavy flow days recorded. ${riskAssessment.length > 0 ? 'Some patterns warrant discussion with a healthcare provider.' : 'No significant concerns identified in the recorded data.'}`,
        cycleInsights: {
            overallPattern: `Based on ${stats.totalLogs} logs over the reporting period`,
            averagePainLevel: stats.avgPainScore,
            flowPatternDescription: `${stats.flowDays} days with menstrual flow recorded, ${stats.heavyFlowDays} classified as heavy`,
            cycleRegularity:
                stats.totalLogs < 14 ? 'insufficient_data' : 'requires_more_analysis',
        },
        symptomAnalysis: {
            mostFrequentSymptoms: stats.topSymptoms,
            painTrend: 'stable',
            moodPattern: `${stats.poorMoodDays} days with low mood out of ${stats.totalLogs} logged`,
            sleepQuality: `Average ${stats.avgSleepHours} hours per night`,
            energyPattern: `${stats.lowEnergyDays} low energy days recorded`,
            notableCorrelations: [],
        },
        riskAssessment,
        recommendations: [
            'Continue tracking symptoms consistently for better pattern recognition',
            stats.avgSleepHours < 7
                ? 'Consider improving sleep hygiene - aim for 7-9 hours'
                : 'Maintain your current sleep schedule',
            stats.avgPainScore > 5
                ? 'Discuss pain management strategies with your healthcare provider'
                : 'Monitor pain levels and note any changes',
            'Stay hydrated, especially during menstruation',
            'Regular gentle exercise can help manage symptoms',
        ],
        questionsForDoctor: [
            'Are my symptoms within normal range for my age?',
            stats.heavyFlowDays >= 3
                ? 'Should I be concerned about my heavy flow days?'
                : null,
            stats.avgPainScore >= 6
                ? 'What pain management options would you recommend?'
                : null,
            'Are there any lifestyle changes that could help with my symptoms?',
        ].filter(Boolean),
        lifestyleTips: [
            'Track symptoms at the same time each day for consistency',
            'Note any dietary changes that correlate with symptom changes',
            'Regular exercise can help reduce cramping and improve mood',
            'Consider keeping a food diary alongside symptom tracking',
        ],
        urgentFlags:
            stats.avgPainScore >= 9
                ? ['Very high pain levels detected - please consult a healthcare provider']
                : [],
        generatedAt: new Date().toISOString(),
        periodStart: logs[logs.length - 1]?.date,
        periodEnd: logs[0]?.date,
        totalLogsAnalyzed: logs.length,
        patientInfo: {
            name: userProfile.displayName || 'Patient',
            ageRange: userProfile.ageRange,
            conditions: userProfile.conditions || [],
            averageCycleLength: userProfile.averageCycleLength || 28,
        },
        statistics: stats,
    };
}
