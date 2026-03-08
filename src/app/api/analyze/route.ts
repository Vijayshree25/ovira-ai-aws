import { NextRequest, NextResponse } from 'next/server';
import { RiskFlag, SymptomLog } from '@/types';

interface AnalyzeRequest {
    logs: SymptomLog[];
    averageCycleLength?: number;
}

interface AnalyzeResponse {
    overallRisk: 'low' | 'medium' | 'high';
    riskFlags: RiskFlag[];
    summary: string;
    recommendations: string[];
}

export async function POST(request: NextRequest) {
    try {
        const { logs, averageCycleLength = 28 }: AnalyzeRequest = await request.json();

        if (!logs || logs.length === 0) {
            return NextResponse.json({
                overallRisk: 'low',
                riskFlags: [],
                summary: 'Not enough data to analyze. Please log more symptoms.',
                recommendations: ['Continue logging your symptoms daily for better insights.'],
            });
        }

        const riskFlags: RiskFlag[] = [];
        const recommendations: string[] = [];

        // Analyze patterns
        const heavyFlowCount = logs.filter((l) => l.flowLevel === 'heavy').length;
        const lowEnergyCount = logs.filter((l) => l.energyLevel === 'low').length;
        const highPainCount = logs.filter((l) => l.painLevel >= 7).length;
        const avgPain = logs.reduce((sum, l) => sum + l.painLevel, 0) / logs.length;
        const poorMoodCount = logs.filter((l) => ['bad', 'terrible'].includes(l.mood)).length;

        // Check for anemia indicators
        if (heavyFlowCount >= 3 && lowEnergyCount >= 3) {
            riskFlags.push({
                type: 'anemia',
                severity: 'medium',
                description: 'Heavy bleeding combined with persistent fatigue may indicate iron deficiency',
                recommendation: 'Consider getting your iron levels checked with a blood test',
            });
            recommendations.push('Increase iron-rich foods like spinach, red meat, and legumes');
        }

        // Check for PCOS indicators (irregular cycles)
        if (averageCycleLength > 35) {
            riskFlags.push({
                type: 'pcos',
                severity: 'medium',
                description: 'Cycles longer than 35 days may indicate hormonal imbalance',
                recommendation: 'Discuss cycle irregularities with your gynecologist',
            });
        }

        // Check for endometriosis indicators
        if (highPainCount >= 3 || avgPain >= 7) {
            riskFlags.push({
                type: 'endometriosis',
                severity: 'medium',
                description: 'Consistent severe pelvic pain may warrant further investigation',
                recommendation: 'Consult a specialist about your pain levels',
            });
            recommendations.push('Keep a detailed pain diary to share with your doctor');
        }

        // Check for mood concerns
        if (poorMoodCount >= logs.length * 0.5) {
            riskFlags.push({
                type: 'general',
                severity: 'low',
                description: 'Frequent low mood detected in your logs',
                recommendation: 'Consider speaking with a healthcare provider about your emotional health',
            });
            recommendations.push('Practice stress-reduction techniques like meditation or gentle exercise');
        }

        // Check symptoms for urgent flags
        const allSymptoms = logs.flatMap((l) => l.symptoms || []);
        const symptomCounts = allSymptoms.reduce((acc, s) => {
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Determine overall risk
        let overallRisk: 'low' | 'medium' | 'high' = 'low';
        if (riskFlags.some((f) => f.severity === 'high')) {
            overallRisk = 'high';
        } else if (riskFlags.some((f) => f.severity === 'medium')) {
            overallRisk = 'medium';
        }

        // Generate summary
        let summary = '';
        if (riskFlags.length === 0) {
            summary = 'Your recent logs look good! No notable health concerns detected.';
            recommendations.push('Keep up your consistent logging habits');
        } else if (overallRisk === 'high') {
            summary = 'Some patterns in your logs may need attention. Please consult a healthcare provider.';
        } else {
            summary = 'A few patterns worth monitoring have been noted as patterns. Review the flags below.';
        }

        // Add general recommendations
        if (recommendations.length === 0) {
            recommendations.push('Stay hydrated and maintain regular sleep patterns');
            recommendations.push('Continue tracking your symptoms for better insights');
        }

        return NextResponse.json({
            overallRisk,
            riskFlags,
            summary,
            recommendations,
        });
    } catch (error) {
        console.error('Analyze API error:', error);
        return NextResponse.json(
            { error: 'Failed to analyze data' },
            { status: 500 }
        );
    }
}
