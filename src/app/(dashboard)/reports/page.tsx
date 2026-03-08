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
    Loader2,
    File,
    Clock,
    Check
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
    const [documents, setDocuments] = useState<any[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            if (!user) return;

            try {
                const response = await fetch(`/api/symptoms?userId=${user.username}&limit=30`);
                const data = await response.json();

                if (data.success && data.logs) {
                    const logs = data.logs.map((log: any) => ({
                        ...log,
                        date: {
                            toDate: () => new Date(log.date),
                        },
                    }));
                    setLogs(logs);
                }
            } catch (error) {
                console.error('Error fetching logs:', error);
            } finally {
                setLoading(false);
            }
        };

        const fetchDocuments = async () => {
            if (!user) return;
            try {
                const response = await fetch(`/api/documents?userId=${user.username}`);
                const data = await response.json();
                if (data.success) {
                    setDocuments(data.documents);
                }
            } catch (error) {
                console.error('Error fetching documents:', error);
            } finally {
                setLoadingDocs(false);
            }
        };

        fetchLogs();
        fetchDocuments();
    }, [user]);

    const toggleDocument = async (docId: string, currentStatus: boolean) => {
        try {
            const response = await fetch('/api/documents', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user?.username,
                    docId,
                    shouldIncludeInSummary: !currentStatus
                })
            });
            if (response.ok) {
                setDocuments(docs => docs.map(d =>
                    d.docId === docId ? { ...d, shouldIncludeInSummary: !currentStatus } : d
                ));
            }
        } catch (error) {
            console.error('Error toggling document:', error);
        }
    };

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
                        date: (log.date as any).toDate().toISOString(),
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

            {/* Recent Logs and Your Documents Grid */}
            <div className="grid md:grid-cols-2 gap-6">
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
                                                <p className="text-lg font-bold">{formatDate((log.date as any).toDate(), 'd')}</p>
                                                <p className="text-xs text-text-muted">{formatDate((log.date as any).toDate(), 'MMM')}</p>
                                            </div>
                                            <div>
                                                <p className="font-medium capitalize">{log.flowLevel} flow</p>
                                                <p className="text-sm text-text-muted">
                                                    Pain: {log.painLevel}/10 • {log.mood} mood
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Your Documents (NEW) */}
                <Card variant="elevated">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                            <span>Your Documents</span>
                            <span className="text-xs font-normal text-text-muted bg-surface-elevated px-2 py-1 rounded">
                                {documents.length} Total
                            </span>
                        </CardTitle>
                        <CardDescription>Records to share with doctors</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loadingDocs ? (
                            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" /></div>
                        ) : documents.length === 0 ? (
                            <div className="text-center py-8">
                                <File className="w-12 h-12 text-text-muted mx-auto mb-3" />
                                <p className="text-text-muted mb-4 text-sm">No health documents uploaded yet.</p>
                                <Link href="/settings">
                                    <Button variant="secondary" size="sm">Go to Settings</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {documents.map((doc) => (
                                    <div
                                        key={doc.docId}
                                        className="p-3 rounded-xl bg-surface-elevated border border-transparent hover:border-primary/20 transition-all"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
                                                    <File className="w-5 h-5 text-pink-600" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-medium text-sm truncate">{doc.filename || doc.fileName}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] uppercase font-bold text-pink-600 bg-pink-50 px-1.5 py-0.5 rounded">
                                                            {doc.category?.replace('_', ' ') || 'BLOOD TEST'}
                                                        </span>
                                                        <span className="text-[10px] text-text-muted flex items-center gap-1">
                                                            <Clock size={10} />
                                                            {formatDate(new Date(doc.uploadedAt), 'MMM d, yyyy')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => toggleDocument(doc.docId, !!doc.shouldIncludeInSummary)}
                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${doc.shouldIncludeInSummary
                                                        ? 'bg-success/10 text-success border border-success/20'
                                                        : 'bg-text-muted/10 text-text-muted border border-transparent hover:bg-text-muted/20'
                                                    }`}
                                            >
                                                {doc.shouldIncludeInSummary ? <Check size={12} /> : <Plus size={12} />}
                                                {doc.shouldIncludeInSummary ? 'Included' : 'Include'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <p className="text-[10px] text-text-muted text-center mt-4 bg-surface px-3 py-2 rounded-lg">
                                    ℹ️ AI references document names only — contents are never read.
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

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
