import { NextRequest, NextResponse } from 'next/server';
import { generateHealthReportSummary } from '@/lib/aws/bedrock';

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
}

interface HealthReportRequest {
    logs: SymptomLogInput[];
    userProfile: UserProfileInput;
}

export async function POST(request: NextRequest) {
    try {
        const { logs, userProfile }: HealthReportRequest = await request.json();

        if (!logs || logs.length === 0) {
            return NextResponse.json({
                error: 'No symptom logs provided',
                message: 'Please log some symptoms before generating a health report.'
            }, { status: 400 });
        }

        // Calculate basic statistics
        const stats = calculateStats(logs);

        // Check for AWS credentials - if missing, return fallback immediately
        if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
            console.log('AWS credentials not configured, returning fallback report');
            return NextResponse.json(generateFallbackReport(logs, userProfile, stats));
        }

        // Try to generate AI-powered report using Bedrock
        try {
            console.log('Health Report - Generating with Amazon Bedrock');

            const userContext = `
USER PROFILE:
- Name: ${userProfile.displayName || 'Patient'}
- Age Range: ${userProfile.ageRange || 'Not specified'}
- Known Conditions: ${userProfile.conditions?.join(', ') || 'None reported'}
- Average Cycle Length: ${userProfile.averageCycleLength || 28} days
`;

            const symptomData = `
SYMPTOM LOGS (${logs.length} entries):
${logs.slice(0, 10).map(log => `
Date: ${log.date}
- Flow: ${log.flowLevel}
- Pain Level: ${log.painLevel}/10
- Mood: ${log.mood}
- Energy: ${log.energyLevel}
- Sleep: ${log.sleepHours} hours
- Symptoms: ${log.symptoms?.join(', ') || 'None'}
`).join('\n')}
${logs.length > 10 ? `\n... and ${logs.length - 10} more entries` : ''}

CALCULATED STATISTICS:
- Total Logs: ${stats.totalLogs}
- Average Pain: ${stats.avgPain.toFixed(1)}/10
- Heavy Flow Days: ${stats.heavyFlowDays}
- Average Sleep: ${stats.avgSleep.toFixed(1)} hours
- Low Energy Days: ${stats.lowEnergyDays}
- Poor Mood Days: ${stats.poorMoodDays}
- Most Common Symptoms: ${stats.topSymptoms.join(', ') || 'None recorded'}
`;

            const { response: aiResponse, model_used, attempts } = await generateHealthReportSummary(symptomData, userContext);

            // If we got a static fallback, skip JSON parsing and use the fallback report
            if (model_used === 'static-fallback') {
                console.log('AI returned static fallback, using generated fallback report');
                const fallbackReport = generateFallbackReport(logs, userProfile, stats);
                return NextResponse.json({ ...fallbackReport, model_used, attempts });
            }

            // Try to parse JSON from AI response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const reportData = JSON.parse(jsonMatch[0]);

                // Add metadata
                reportData.generatedAt = new Date().toISOString();
                reportData.periodStart = logs[logs.length - 1]?.date;
                reportData.periodEnd = logs[0]?.date;
                reportData.totalLogsAnalyzed = logs.length;
                reportData.patientInfo = {
                    name: userProfile.displayName || 'Patient',
                    ageRange: userProfile.ageRange,
                    conditions: userProfile.conditions || [],
                    averageCycleLength: userProfile.averageCycleLength || 28
                };
                reportData.statistics = stats;
                reportData.model_used = model_used;
                reportData.attempts = attempts;

                return NextResponse.json(reportData);
            }

            // JSON parsing failed — use fallback report
            console.warn('Failed to parse AI response as JSON, using fallback report');
            const fallbackReport = generateFallbackReport(logs, userProfile, stats);
            return NextResponse.json({ ...fallbackReport, model_used, attempts });
        } catch (aiError) {
            // AI failed entirely — log it and return fallback
            console.error('Bedrock AI generation failed, using fallback:', aiError);
            return NextResponse.json(generateFallbackReport(logs, userProfile, stats));
        }
    } catch (error) {
        console.error('Health Report API error:', error);
        return NextResponse.json(
            { error: 'Failed to generate health report', message: 'Please try again later.' },
            { status: 500 }
        );
    }
}

function calculateStats(logs: SymptomLogInput[]) {
    const totalLogs = logs.length;
    const avgPain = logs.reduce((sum, l) => sum + l.painLevel, 0) / totalLogs;
    const avgSleep = logs.reduce((sum, l) => sum + l.sleepHours, 0) / totalLogs;
    const heavyFlowDays = logs.filter(l => l.flowLevel === 'heavy').length;
    const lowEnergyDays = logs.filter(l => l.energyLevel === 'low').length;
    const poorMoodDays = logs.filter(l => ['bad', 'terrible'].includes(l.mood)).length;

    // Count symptoms
    const symptomCounts: Record<string, number> = {};
    logs.forEach(log => {
        log.symptoms?.forEach(symptom => {
            symptomCounts[symptom] = (symptomCounts[symptom] || 0) + 1;
        });
    });

    const topSymptoms = Object.entries(symptomCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([symptom]) => symptom);

    // Calculate mood distribution
    const moodCounts: Record<string, number> = {};
    logs.forEach(log => {
        moodCounts[log.mood] = (moodCounts[log.mood] || 0) + 1;
    });

    // Calculate flow distribution
    const flowCounts: Record<string, number> = {};
    logs.forEach(log => {
        flowCounts[log.flowLevel] = (flowCounts[log.flowLevel] || 0) + 1;
    });

    // Calculate energy distribution
    const energyCounts: Record<string, number> = {};
    logs.forEach(log => {
        energyCounts[log.energyLevel] = (energyCounts[log.energyLevel] || 0) + 1;
    });

    return {
        totalLogs,
        avgPain,
        avgSleep,
        heavyFlowDays,
        lowEnergyDays,
        poorMoodDays,
        topSymptoms,
        symptomCounts,
        moodCounts,
        flowCounts,
        energyCounts,
        highPainDays: logs.filter(l => l.painLevel >= 7).length,
        flowDays: logs.filter(l => l.flowLevel !== 'none').length
    };
}

function generateFallbackReport(logs: SymptomLogInput[], userProfile: UserProfileInput, stats: ReturnType<typeof calculateStats>) {
    const riskAssessment = [];

    // Check for anemia indicators
    if (stats.heavyFlowDays >= 3 && stats.lowEnergyDays >= 3) {
        riskAssessment.push({
            condition: 'Iron Deficiency/Anemia',
            riskLevel: 'medium',
            confidence: 'medium',
            indicators: ['Heavy menstrual bleeding', 'Persistent fatigue/low energy'],
            recommendation: 'Consider getting iron levels checked with a blood test'
        });
    }

    // Check for severe pain patterns
    if (stats.highPainDays >= 3 || stats.avgPain >= 7) {
        riskAssessment.push({
            condition: 'Endometriosis/Severe Dysmenorrhea',
            riskLevel: 'medium',
            confidence: 'low',
            indicators: ['Consistent severe pelvic pain', `Average pain level: ${stats.avgPain.toFixed(1)}/10`],
            recommendation: 'Discuss pain management options with a gynecologist'
        });
    }

    // Check for mood concerns
    if (stats.poorMoodDays >= stats.totalLogs * 0.5) {
        riskAssessment.push({
            condition: 'Mood Disturbance/PMDD',
            riskLevel: 'low',
            confidence: 'medium',
            indicators: ['Frequent low mood correlating with cycle'],
            recommendation: 'Consider speaking with a healthcare provider about emotional health support'
        });
    }

    return {
        executiveSummary: `Health report based on ${stats.totalLogs} symptom logs. Average pain level is ${stats.avgPain.toFixed(1)}/10 with ${stats.heavyFlowDays} heavy flow days recorded. ${riskAssessment.length > 0 ? 'Some patterns warrant discussion with a healthcare provider.' : 'No significant concerns identified in the recorded data.'}`,
        cycleInsights: {
            overallPattern: `Based on ${stats.totalLogs} logs over the reporting period`,
            averagePainLevel: stats.avgPain,
            flowPatternDescription: `${stats.flowDays} days with menstrual flow recorded, ${stats.heavyFlowDays} classified as heavy`,
            cycleRegularity: stats.totalLogs < 14 ? 'insufficient_data' : 'requires_more_analysis'
        },
        symptomAnalysis: {
            mostFrequentSymptoms: Object.entries(stats.symptomCounts).map(([symptom, count]) => ({
                symptom,
                count,
                percentage: Math.round((count / stats.totalLogs) * 100)
            })).slice(0, 5),
            painTrend: 'stable',
            moodPattern: `${stats.poorMoodDays} days with low mood out of ${stats.totalLogs} logged`,
            sleepQuality: `Average ${stats.avgSleep.toFixed(1)} hours per night`,
            energyPattern: `${stats.lowEnergyDays} low energy days recorded`,
            notableCorrelations: []
        },
        riskAssessment,
        recommendations: [
            'Continue tracking symptoms consistently for better pattern recognition',
            stats.avgSleep < 7 ? 'Consider improving sleep hygiene - aim for 7-9 hours' : 'Maintain your current sleep schedule',
            stats.avgPain > 5 ? 'Discuss pain management strategies with your healthcare provider' : 'Monitor pain levels and note any changes',
            'Stay hydrated, especially during menstruation',
            'Regular gentle exercise can help manage symptoms'
        ],
        questionsForDoctor: [
            'Are my symptoms within normal range for my age?',
            stats.heavyFlowDays >= 3 ? 'Should I be concerned about my heavy flow days?' : null,
            stats.avgPain >= 6 ? 'What pain management options would you recommend?' : null,
            'Are there any lifestyle changes that could help with my symptoms?'
        ].filter(Boolean),
        lifestyleTips: [
            'Track symptoms at the same time each day for consistency',
            'Note any dietary changes that correlate with symptom changes',
            'Regular exercise can help reduce cramping and improve mood',
            'Consider keeping a food diary alongside symptom tracking'
        ],
        urgentFlags: stats.avgPain >= 9 ? ['Very high pain levels detected - please consult a healthcare provider'] : [],
        generatedAt: new Date().toISOString(),
        periodStart: logs[logs.length - 1]?.date,
        periodEnd: logs[0]?.date,
        totalLogsAnalyzed: logs.length,
        patientInfo: {
            name: userProfile.displayName || 'Patient',
            ageRange: userProfile.ageRange,
            conditions: userProfile.conditions || [],
            averageCycleLength: userProfile.averageCycleLength || 28
        },
        statistics: stats
    };
}
