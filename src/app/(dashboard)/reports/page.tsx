'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
// TODO: Replace with AWS DynamoDB queries
import { SymptomLog, RiskFlag } from '@/types';
import { formatDate } from '@/lib/utils';
import {
    FileText,
    Download,
    Plus,
    ArrowLeft,
    AlertTriangle,
    AlertCircle,
    CheckCircle,
    Calendar,
    TrendingUp,
    Loader2
} from 'lucide-react';
import Link from 'next/link';

interface AnalysisResult {
    overallRisk: 'low' | 'medium' | 'high';
    riskFlags: RiskFlag[];
    summary: string;
    recommendations: string[];
}

export default function ReportsPage() {
    const { user, userProfile } = useAuth();
    const [logs, setLogs] = useState<SymptomLog[]>([]);
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);

    useEffect(() => {
        const fetchLogs = async () => {
            if (!user) return;

            try {
                // TODO: Fetch logs from DynamoDB
                // const fetchedLogs = await fetchLogsFromDynamoDB(user.uid, 30);
                setLogs([]);
            } catch (error) {
                console.error('Error fetching logs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, [user]);

    const analyzeHealth = async () => {
        if (logs.length === 0) return;

        setAnalyzing(true);
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    logs: logs.map((log) => ({
                        ...log,
                        date: log.date.toDate().toISOString(),
                    })),
                    averageCycleLength: userProfile?.averageCycleLength || 28,
                }),
            });

            const data = await response.json();
            setAnalysis(data);
        } catch (error) {
            console.error('Error analyzing health:', error);
        } finally {
            setAnalyzing(false);
        }
    };

    const getRiskIcon = (severity: 'low' | 'medium' | 'high') => {
        switch (severity) {
            case 'high':
                return <AlertTriangle className="text-error" size={20} />;
            case 'medium':
                return <AlertCircle className="text-warning" size={20} />;
            case 'low':
                return <CheckCircle className="text-success" size={20} />;
        }
    };

    const getRiskBadgeColor = (severity: 'low' | 'medium' | 'high') => {
        switch (severity) {
            case 'high':
                return 'bg-error/10 text-error border-error/20';
            case 'medium':
                return 'bg-warning/10 text-warning border-warning/20';
            case 'low':
                return 'bg-success/10 text-success border-success/20';
        }
    };

    // Calculate stats from logs
    const stats = {
        totalLogs: logs.length,
        avgPain: logs.length > 0
            ? (logs.reduce((sum, l) => sum + l.painLevel, 0) / logs.length).toFixed(1)
            : '0',
        heavyDays: logs.filter((l) => l.flowLevel === 'heavy').length,
        avgSleep: logs.length > 0
            ? (logs.reduce((sum, l) => sum + l.sleepHours, 0) / logs.length).toFixed(1)
            : '0',
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/dashboard"
                    className="p-2 rounded-xl hover:bg-surface-elevated transition-colors"
                >
                    <ArrowLeft size={24} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">Health Reports</h1>
                    <p className="text-text-secondary">Analyze your health patterns</p>
                </div>
                <Button
                    onClick={analyzeHealth}
                    isLoading={analyzing}
                    disabled={logs.length === 0}
                    leftIcon={<TrendingUp size={18} />}
                >
                    Analyze Health
                </Button>
            </div>

            {/* AI Health Report Card */}
            <Link href="/health-report">
                <Card variant="gradient" hover className="group cursor-pointer overflow-hidden">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FileText className="w-7 h-7 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-bold text-text-primary">Generate AI Health Report</h3>
                                <p className="text-text-secondary text-sm">
                                    Create a comprehensive, doctor-friendly report with cycle analysis, risk assessment & personalized recommendations
                                </p>
                            </div>
                            <div className="text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all">
                                →
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </Link>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card variant="elevated">
                    <CardContent className="pt-4 text-center">
                        <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
                        <p className="text-2xl font-bold">{stats.totalLogs}</p>
                        <p className="text-sm text-text-muted">Total Logs</p>
                    </CardContent>
                </Card>
                <Card variant="elevated">
                    <CardContent className="pt-4 text-center">
                        <TrendingUp className="w-6 h-6 text-accent mx-auto mb-2" />
                        <p className="text-2xl font-bold">{stats.avgPain}</p>
                        <p className="text-sm text-text-muted">Avg Pain</p>
                    </CardContent>
                </Card>
                <Card variant="elevated">
                    <CardContent className="pt-4 text-center">
                        <AlertCircle className="w-6 h-6 text-error mx-auto mb-2" />
                        <p className="text-2xl font-bold">{stats.heavyDays}</p>
                        <p className="text-sm text-text-muted">Heavy Days</p>
                    </CardContent>
                </Card>
                <Card variant="elevated">
                    <CardContent className="pt-4 text-center">
                        <FileText className="w-6 h-6 text-secondary mx-auto mb-2" />
                        <p className="text-2xl font-bold">{stats.avgSleep}h</p>
                        <p className="text-sm text-text-muted">Avg Sleep</p>
                    </CardContent>
                </Card>
            </div>

            {/* Analysis Results */}
            {analysis && (
                <Card variant="elevated" className="animate-slide-in-up">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Health Analysis</CardTitle>
                                <CardDescription>Based on your last {logs.length} logs</CardDescription>
                            </div>
                            <div className={`px-4 py-2 rounded-full text-sm font-medium border ${getRiskBadgeColor(analysis.overallRisk)}`}>
                                {analysis.overallRisk.charAt(0).toUpperCase() + analysis.overallRisk.slice(1)} Risk
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {/* Summary */}
                        <div className="p-4 rounded-xl bg-surface-elevated mb-6">
                            <p className="text-text-primary">{analysis.summary}</p>
                        </div>

                        {/* Risk Flags */}
                        {analysis.riskFlags.length > 0 && (
                            <div className="mb-6">
                                <h3 className="font-medium mb-3">Flags to Review</h3>
                                <div className="space-y-3">
                                    {analysis.riskFlags.map((flag, index) => (
                                        <div
                                            key={index}
                                            className={`p-4 rounded-xl border ${getRiskBadgeColor(flag.severity)}`}
                                        >
                                            <div className="flex items-start gap-3">
                                                {getRiskIcon(flag.severity)}
                                                <div>
                                                    <p className="font-medium capitalize">{flag.type}</p>
                                                    <p className="text-sm opacity-80">{flag.description}</p>
                                                    {flag.recommendation && (
                                                        <p className="text-sm mt-2 font-medium">{flag.recommendation}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recommendations */}
                        <div>
                            <h3 className="font-medium mb-3">Recommendations</h3>
                            <ul className="space-y-2">
                                {analysis.recommendations.map((rec, index) => (
                                    <li key={index} className="flex items-start gap-2 text-text-secondary">
                                        <CheckCircle size={16} className="text-success mt-1 flex-shrink-0" />
                                        <span>{rec}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Logs */}
            <Card variant="elevated">
                <CardHeader>
                    <CardTitle>Recent Logs</CardTitle>
                    <CardDescription>Your symptom history</CardDescription>
                </CardHeader>
                <CardContent>
                    {logs.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-text-muted mb-4">No logs yet</p>
                            <Link href="/log">
                                <Button leftIcon={<Plus size={18} />}>Log Symptoms</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {logs.slice(0, 10).map((log) => (
                                <div
                                    key={log.id}
                                    className="flex items-center justify-between p-4 rounded-xl bg-surface-elevated"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="text-center min-w-[50px]">
                                            <p className="text-lg font-bold">{formatDate(log.date.toDate(), 'd')}</p>
                                            <p className="text-xs text-text-muted">{formatDate(log.date.toDate(), 'MMM')}</p>
                                        </div>
                                        <div>
                                            <p className="font-medium capitalize">{log.flowLevel} flow</p>
                                            <p className="text-sm text-text-muted">
                                                Pain: {log.painLevel}/10 • {log.mood} mood • {log.energyLevel} energy
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Disclaimer */}
            <Card variant="outlined" className="border-warning/30 bg-warning/5">
                <CardContent className="pt-6 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-warning mb-1">Important</p>
                        <p className="text-sm text-text-secondary">
                            This analysis is for informational purposes only and is not a medical diagnosis.
                            Please consult a healthcare professional for any health concerns.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
