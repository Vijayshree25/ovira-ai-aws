'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
// TODO: Replace with AWS DynamoDB queries
import { SymptomLog } from '@/types';
import { formatDate } from '@/lib/utils';
import {
    FileText,
    ArrowLeft,
    AlertTriangle,
    AlertCircle,
    CheckCircle,
    Calendar,
    TrendingUp,
    TrendingDown,
    Minus,
    Loader2,
    Heart,
    Moon,
    Zap,
    Droplets,
    Brain,
    Stethoscope,
    ClipboardList,
    Lightbulb,
    MessageSquare,
    Activity,
    User,
    Clock,
    Printer
} from 'lucide-react';
import Link from 'next/link';

interface HealthReportData {
    executiveSummary: string;
    cycleInsights: {
        overallPattern: string;
        averagePainLevel: number;
        flowPatternDescription: string;
        cycleRegularity: string;
    };
    symptomAnalysis: {
        mostFrequentSymptoms: { symptom: string; count: number; percentage: number }[];
        painTrend: string;
        moodPattern: string;
        sleepQuality: string;
        energyPattern: string;
        notableCorrelations: string[];
    };
    riskAssessment: {
        condition: string;
        riskLevel: 'low' | 'medium' | 'high';
        confidence: string;
        indicators: string[];
        recommendation: string;
    }[];
    recommendations: string[];
    questionsForDoctor: string[];
    lifestyleTips: string[];
    urgentFlags: string[];
    generatedAt: string;
    periodStart: string;
    periodEnd: string;
    totalLogsAnalyzed: number;
    patientInfo: {
        name: string;
        ageRange: string;
        conditions: string[];
        averageCycleLength: number;
    };
    statistics: {
        totalLogs: number;
        avgPain: number;
        avgSleep: number;
        heavyFlowDays: number;
        lowEnergyDays: number;
        poorMoodDays: number;
        topSymptoms: string[];
        moodCounts: Record<string, number>;
        flowCounts: Record<string, number>;
        energyCounts: Record<string, number>;
        highPainDays: number;
        flowDays: number;
    };
}

export default function HealthReportPage() {
    const { user, userProfile } = useAuth();
    const [logs, setLogs] = useState<SymptomLog[]>([]);
    const [report, setReport] = useState<HealthReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            if (!user) return;

            try {
                // TODO: Fetch logs from DynamoDB
                // const fetchedLogs = await fetchLogsFromDynamoDB(user.uid, 90);
                setLogs([]);
            } catch (error) {
                console.error('Error fetching logs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [user]);

    const generateReport = async () => {
        if (logs.length === 0) return;

        setGenerating(true);
        setError(null);

        try {
            // Properly serialize logs - only include serializable fields
            const serializedLogs = logs.map((log) => ({
                id: log.id,
                date: log.date?.toDate?.()?.toISOString() || new Date().toISOString(),
                flowLevel: log.flowLevel,
                painLevel: log.painLevel,
                mood: log.mood,
                energyLevel: log.energyLevel,
                sleepHours: log.sleepHours,
                symptoms: log.symptoms || [],
                notes: log.notes || '',
            }));

            const response = await fetch('/api/health-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    logs: serializedLogs,
                    userProfile: {
                        displayName: userProfile?.displayName || 'Patient',
                        ageRange: userProfile?.ageRange || '',
                        conditions: userProfile?.conditions || [],
                        averageCycleLength: userProfile?.averageCycleLength || 28,
                        lastPeriodStart: userProfile?.lastPeriodStart?.toDate?.()?.toISOString() || null,
                    },
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Failed to generate report');
            }

            setReport(data);
        } catch (err) {
            console.error('Error generating report:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate report. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const getRiskColor = (level: 'low' | 'medium' | 'high') => {
        switch (level) {
            case 'high': return 'text-error bg-error/10 border-error/20';
            case 'medium': return 'text-warning bg-warning/10 border-warning/20';
            case 'low': return 'text-success bg-success/10 border-success/20';
        }
    };

    const getRiskIcon = (level: 'low' | 'medium' | 'high') => {
        switch (level) {
            case 'high': return <AlertTriangle className="w-5 h-5" />;
            case 'medium': return <AlertCircle className="w-5 h-5" />;
            case 'low': return <CheckCircle className="w-5 h-5" />;
        }
    };

    const getTrendIcon = (trend: string) => {
        if (trend === 'increasing') return <TrendingUp className="w-4 h-4 text-error" />;
        if (trend === 'decreasing') return <TrendingDown className="w-4 h-4 text-success" />;
        return <Minus className="w-4 h-4 text-text-muted" />;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6 print:max-w-none print:space-y-4">
            {/* Header - Hide print button when printing */}
            <div className="flex items-center gap-4 mb-6 print:mb-4">
                <Link
                    href="/reports"
                    className="p-2 rounded-xl hover:bg-surface-elevated transition-colors print:hidden"
                >
                    <ArrowLeft size={24} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold print:text-xl">Health Report</h1>
                    <p className="text-text-secondary">AI-Generated Doctor-Friendly Report</p>
                </div>
                <div className="flex gap-2 print:hidden">
                    {report && (
                        <Button
                            variant="secondary"
                            onClick={handlePrint}
                            leftIcon={<Printer size={18} />}
                        >
                            Print
                        </Button>
                    )}
                    <Button
                        onClick={generateReport}
                        isLoading={generating}
                        disabled={logs.length === 0}
                        leftIcon={<FileText size={18} />}
                    >
                        {report ? 'Regenerate Report' : 'Generate Report'}
                    </Button>
                </div>
            </div>

            {/* No logs message */}
            {logs.length === 0 && (
                <Card variant="elevated" className="text-center py-12">
                    <CardContent>
                        <ClipboardList className="w-16 h-16 text-text-muted mx-auto mb-4" />
                        <h2 className="text-xl font-bold mb-2">No Symptom Logs Yet</h2>
                        <p className="text-text-secondary mb-4">
                            Start logging your symptoms to generate a comprehensive health report.
                        </p>
                        <Link href="/log">
                            <Button>Log Your First Entry</Button>
                        </Link>
                    </CardContent>
                </Card>
            )}

            {/* Error message */}
            {error && (
                <Card variant="outlined" className="border-error/30 bg-error/5">
                    <CardContent className="pt-6 flex gap-3">
                        <AlertCircle className="w-5 h-5 text-error flex-shrink-0" />
                        <p className="text-error">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Pre-generation info */}
            {logs.length > 0 && !report && !generating && (
                <Card variant="elevated">
                    <CardContent className="pt-6">
                        <div className="text-center py-8">
                            <Stethoscope className="w-16 h-16 text-primary mx-auto mb-4" />
                            <h2 className="text-xl font-bold mb-2">Ready to Generate Your Report</h2>
                            <p className="text-text-secondary mb-2">
                                Analyzing <span className="font-semibold text-primary">{logs.length}</span> symptom logs
                            </p>
                            <p className="text-sm text-text-muted mb-6">
                                Our AI will analyze your data to create a comprehensive, doctor-friendly health report
                            </p>
                            <Button
                                onClick={generateReport}
                                size="lg"
                                leftIcon={<Brain size={20} />}
                            >
                                Generate AI Health Report
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Report Content */}
            {report && (
                <div className="space-y-6 print:space-y-4">
                    {/* Report Header with Patient Info */}
                    <Card variant="gradient" className="print:border print:border-border">
                        <CardContent className="pt-6">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="w-6 h-6 text-primary" />
                                        <h2 className="text-xl font-bold">Ovira Health Report</h2>
                                    </div>
                                    <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                                        <span className="flex items-center gap-1">
                                            <User size={14} />
                                            {report.patientInfo.name}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            {report.patientInfo.ageRange || 'Age not specified'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={14} />
                                            Generated {formatDate(new Date(report.generatedAt), 'MMM d, yyyy h:mm a')}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-text-muted">Report Period</p>
                                    <p className="font-medium">
                                        {report.periodStart ? formatDate(new Date(report.periodStart), 'MMM d') : 'N/A'} - {report.periodEnd ? formatDate(new Date(report.periodEnd), 'MMM d, yyyy') : 'N/A'}
                                    </p>
                                    <p className="text-sm text-text-muted mt-1">{report.totalLogsAnalyzed} logs analyzed</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Urgent Flags */}
                    {report.urgentFlags && report.urgentFlags.length > 0 && (
                        <Card variant="outlined" className="border-error bg-error/5">
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-3">
                                    <AlertTriangle className="w-6 h-6 text-error flex-shrink-0" />
                                    <div>
                                        <h3 className="font-bold text-error mb-2">Urgent Attention Required</h3>
                                        <ul className="space-y-1">
                                            {report.urgentFlags.map((flag, i) => (
                                                <li key={i} className="text-error">{flag}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Executive Summary */}
                    <Card variant="elevated">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Brain className="w-5 h-5 text-primary" />
                                Executive Summary
                            </CardTitle>
                            <CardDescription>AI-generated overview for healthcare providers</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-text-primary leading-relaxed text-lg">
                                {report.executiveSummary}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:grid-cols-4">
                        <Card variant="elevated">
                            <CardContent className="pt-4 text-center">
                                <Droplets className="w-6 h-6 text-error mx-auto mb-2" />
                                <p className="text-2xl font-bold">{report.statistics.flowDays}</p>
                                <p className="text-xs text-text-muted">Flow Days</p>
                            </CardContent>
                        </Card>
                        <Card variant="elevated">
                            <CardContent className="pt-4 text-center">
                                <Activity className="w-6 h-6 text-accent mx-auto mb-2" />
                                <p className="text-2xl font-bold">{typeof report.statistics?.avgPain === 'number' && isFinite(report.statistics.avgPain) ? report.statistics.avgPain.toFixed(1) : 'N/A'}</p>
                                <p className="text-xs text-text-muted">Avg Pain /10</p>
                            </CardContent>
                        </Card>
                        <Card variant="elevated">
                            <CardContent className="pt-4 text-center">
                                <Moon className="w-6 h-6 text-secondary mx-auto mb-2" />
                                <p className="text-2xl font-bold">{typeof report.statistics?.avgSleep === 'number' && isFinite(report.statistics.avgSleep) ? `${report.statistics.avgSleep.toFixed(1)}h` : 'N/A'}</p>
                                <p className="text-xs text-text-muted">Avg Sleep</p>
                            </CardContent>
                        </Card>
                        <Card variant="elevated">
                            <CardContent className="pt-4 text-center">
                                <Zap className="w-6 h-6 text-warning mx-auto mb-2" />
                                <p className="text-2xl font-bold">{report.statistics.lowEnergyDays}</p>
                                <p className="text-xs text-text-muted">Low Energy Days</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Cycle Overview Chart */}
                    <Card variant="elevated">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary" />
                                Cycle Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-text-secondary mb-4">{report.cycleInsights.overallPattern}</p>

                            {/* Flow Distribution Chart */}
                            <div className="mb-6">
                                <p className="text-sm font-medium mb-2">Flow Distribution</p>
                                <div className="flex h-8 rounded-xl overflow-hidden">
                                    {Object.entries(report.statistics.flowCounts).map(([level, count]) => {
                                        const percentage = (count / report.statistics.totalLogs) * 100;
                                        const colors: Record<string, string> = {
                                            none: 'bg-gray-200',
                                            light: 'bg-red-200',
                                            medium: 'bg-red-400',
                                            heavy: 'bg-red-600'
                                        };
                                        return percentage > 0 ? (
                                            <div
                                                key={level}
                                                className={`${colors[level]} flex items-center justify-center text-xs font-medium`}
                                                style={{ width: `${percentage}%` }}
                                                title={`${level}: ${count} days (${percentage.toFixed(0)}%)`}
                                            >
                                                {percentage > 10 && `${level}`}
                                            </div>
                                        ) : null;
                                    })}
                                </div>
                                <div className="flex justify-between mt-2 text-xs text-text-muted">
                                    <span>None</span>
                                    <span>Light</span>
                                    <span>Medium</span>
                                    <span>Heavy</span>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-surface-elevated">
                                    <p className="text-sm text-text-muted mb-1">Flow Pattern</p>
                                    <p className="font-medium">{report.cycleInsights.flowPatternDescription}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-surface-elevated">
                                    <p className="text-sm text-text-muted mb-1">Cycle Regularity</p>
                                    <p className="font-medium capitalize">{report.cycleInsights.cycleRegularity.replace('_', ' ')}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Symptom Analysis */}
                    <Card variant="elevated">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-primary" />
                                Symptom Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {/* Most Frequent Symptoms */}
                            {report.symptomAnalysis.mostFrequentSymptoms.length > 0 && (
                                <div className="mb-6">
                                    <p className="text-sm font-medium mb-3">Most Frequent Symptoms</p>
                                    <div className="space-y-2">
                                        {report.symptomAnalysis.mostFrequentSymptoms.map((item, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <span className="w-24 text-sm truncate">{item.symptom}</span>
                                                <div className="flex-1 h-6 bg-surface-elevated rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-end pr-2"
                                                        style={{ width: `${Math.max(item.percentage, 10)}%` }}
                                                    >
                                                        <span className="text-xs text-white font-medium">{item.percentage}%</span>
                                                    </div>
                                                </div>
                                                <span className="text-sm text-text-muted w-16">{item.count} days</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Pain Trend */}
                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                                <div className="p-4 rounded-xl bg-surface-elevated">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-sm text-text-muted">Pain Trend</p>
                                        {getTrendIcon(report.symptomAnalysis.painTrend)}
                                    </div>
                                    <p className="font-medium capitalize">{report.symptomAnalysis.painTrend}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-surface-elevated">
                                    <p className="text-sm text-text-muted mb-1">Sleep Quality</p>
                                    <p className="font-medium">{report.symptomAnalysis.sleepQuality}</p>
                                </div>
                            </div>

                            {/* Mood & Energy */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-surface-elevated">
                                    <p className="text-sm text-text-muted mb-1">Mood Pattern</p>
                                    <p className="font-medium">{report.symptomAnalysis.moodPattern}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-surface-elevated">
                                    <p className="text-sm text-text-muted mb-1">Energy Pattern</p>
                                    <p className="font-medium">{report.symptomAnalysis.energyPattern}</p>
                                </div>
                            </div>

                            {/* Correlations */}
                            {report.symptomAnalysis.notableCorrelations.length > 0 && (
                                <div className="mt-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                                    <p className="text-sm font-medium text-primary mb-2">Notable Correlations</p>
                                    <ul className="space-y-1">
                                        {report.symptomAnalysis.notableCorrelations.map((corr, i) => (
                                            <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                                                <span className="text-primary">•</span>
                                                {corr}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Health Risk Assessment */}
                    <Card variant="elevated">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Stethoscope className="w-5 h-5 text-primary" />
                                Health Risk Assessment
                            </CardTitle>
                            <CardDescription>Based on pattern analysis of your symptom data</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {report.riskAssessment.length === 0 ? (
                                <div className="text-center py-6">
                                    <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                                    <p className="font-medium text-success">No Significant Risk Factors Detected</p>
                                    <p className="text-sm text-text-muted mt-1">
                                        Your symptom patterns appear within normal ranges
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {report.riskAssessment.map((risk, i) => (
                                        <div
                                            key={i}
                                            className={`p-4 rounded-xl border ${getRiskColor(risk.riskLevel)}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {getRiskIcon(risk.riskLevel)}
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="font-semibold">{risk.condition}</p>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${getRiskColor(risk.riskLevel)}`}>
                                                            {risk.riskLevel.toUpperCase()} RISK
                                                        </span>
                                                    </div>
                                                    <p className="text-sm opacity-80 mb-2">
                                                        Confidence: {risk.confidence}
                                                    </p>
                                                    <div className="mb-2">
                                                        <p className="text-xs font-medium mb-1">Indicators:</p>
                                                        <ul className="text-sm opacity-80">
                                                            {risk.indicators.map((ind, j) => (
                                                                <li key={j}>• {ind}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <p className="text-sm font-medium">{risk.recommendation}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Two Column Section */}
                    <div className="grid md:grid-cols-2 gap-6 print:grid-cols-2">
                        {/* Recommendations */}
                        <Card variant="elevated">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Lightbulb className="w-5 h-5 text-warning" />
                                    Recommendations
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {report.recommendations.map((rec, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <CheckCircle size={16} className="text-success mt-1 flex-shrink-0" />
                                            <span className="text-sm">{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        {/* Questions for Doctor */}
                        <Card variant="elevated">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MessageSquare className="w-5 h-5 text-accent" />
                                    Questions for Your Doctor
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-3">
                                    {report.questionsForDoctor.map((q, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                                                {i + 1}
                                            </span>
                                            <span className="text-sm">{q}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Lifestyle Tips */}
                    <Card variant="elevated">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Heart className="w-5 h-5 text-error" />
                                Personalized Lifestyle Tips
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-3">
                                {report.lifestyleTips.map((tip, i) => (
                                    <div key={i} className="p-3 rounded-xl bg-surface-elevated flex items-start gap-2">
                                        <span className="text-primary">💡</span>
                                        <span className="text-sm">{tip}</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Disclaimer */}
                    <Card variant="outlined" className="border-warning/30 bg-warning/5">
                        <CardContent className="pt-6 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-medium text-warning mb-1">Medical Disclaimer</p>
                                <p className="text-sm text-text-secondary">
                                    This report is generated by AI for informational purposes only and is not a medical diagnosis.
                                    The risk assessments are based on pattern analysis and should be discussed with a qualified
                                    healthcare professional. Always consult your doctor for medical advice, diagnosis, or treatment.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Print Footer */}
                    <div className="hidden print:block text-center text-xs text-text-muted mt-8 pt-4 border-t">
                        <p>Generated by Ovira AI Health Report • {formatDate(new Date(report.generatedAt), 'MMMM d, yyyy')}</p>
                        <p>This document is for informational purposes only and does not constitute medical advice.</p>
                    </div>
                </div>
            )}
        </div>
    );
}
