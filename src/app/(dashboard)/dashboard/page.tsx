'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
// TODO: Replace with AWS DynamoDB queries
import { SymptomLog } from '@/types';
import {
    calculateCycleDay,
    getDaysUntilNextPeriod,
    getCyclePhase,
    getPhaseColor,
    formatDate,
    getOrdinalSuffix
} from '@/lib/utils';
import {
    Calendar,
    MessageCircle,
    FileText,
    TrendingUp,
    Flame,
    Heart,
    Moon,
    Sparkles,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
    const { user, userProfile } = useAuth();
    const [recentLogs, setRecentLogs] = useState<SymptomLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        const fetchRecentLogs = async () => {
            if (!user) return;

            try {
                // TODO: Fetch logs from DynamoDB
                // const logs = await fetchLogsFromDynamoDB(user.uid);
                setRecentLogs([]);
                setStreak(0);
            } catch (error) {
                console.error('Error fetching logs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecentLogs();
    }, [user]);

    // Calculate cycle info
    const lastPeriodStart = userProfile?.lastPeriodStart?.toDate() || new Date();
    const cycleLength = userProfile?.averageCycleLength || 28;
    const cycleDay = calculateCycleDay(lastPeriodStart);
    const daysUntilPeriod = getDaysUntilNextPeriod(lastPeriodStart, cycleLength);
    const currentPhase = getCyclePhase(cycleDay, cycleLength);
    const phaseColor = getPhaseColor(currentPhase);

    // Get latest log
    const latestLog = recentLogs[0];

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Welcome Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-text-primary">
                        Welcome back, {userProfile?.displayName?.split(' ')[0] || 'there'}! 👋
                    </h1>
                    <p className="text-text-secondary mt-1">
                        Here&apos;s your health overview for today
                    </p>
                </div>
                <div className="flex gap-3">
                    <Link href="/log">
                        <Button leftIcon={<Calendar size={18} />}>Log Symptoms</Button>
                    </Link>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Cycle Day Card */}
                <Card variant="gradient" className="md:col-span-2 lg:col-span-1">
                    <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-text-secondary mb-1">Current Cycle Day</p>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-5xl font-bold" style={{ color: phaseColor }}>
                                        {cycleDay}
                                    </span>
                                    <span className="text-text-muted">of {cycleLength}</span>
                                </div>
                                <div
                                    className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-sm font-medium"
                                    style={{ backgroundColor: `${phaseColor}20`, color: phaseColor }}
                                >
                                    <Sparkles size={14} />
                                    {currentPhase} Phase
                                </div>
                            </div>
                            <div className="w-16 h-16 rounded-2xl bg-surface flex items-center justify-center">
                                <svg viewBox="0 0 36 36" className="w-14 h-14">
                                    <path
                                        d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        className="text-border"
                                    />
                                    <path
                                        d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                                        fill="none"
                                        stroke={phaseColor}
                                        strokeWidth="3"
                                        strokeDasharray={`${(cycleDay / cycleLength) * 100}, 100`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Period Prediction Card */}
                <Card variant="elevated">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                                <Heart className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                                <p className="text-sm text-text-secondary">Next Period</p>
                                <p className="font-semibold">
                                    {daysUntilPeriod > 0
                                        ? `In ${daysUntilPeriod} days`
                                        : daysUntilPeriod === 0
                                            ? 'Expected today'
                                            : `${Math.abs(daysUntilPeriod)} days late`
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                                style={{ width: `${Math.min(100, ((cycleLength - daysUntilPeriod) / cycleLength) * 100)}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Streak Card */}
                <Card variant="elevated">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-text-secondary mb-1">Logging Streak</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold text-warning">{streak}</span>
                                    <span className="text-text-muted">days</span>
                                </div>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center">
                                <Flame className="w-7 h-7 text-warning" />
                            </div>
                        </div>
                        {streak >= 7 && (
                            <p className="text-sm text-success mt-3 flex items-center gap-1">
                                <TrendingUp size={14} /> Great consistency! Keep it up!
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* Latest Log Summary */}
                <Card variant="elevated" className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Moon className="w-5 h-5 text-primary" />
                            Latest Log Summary
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {latestLog ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-3 rounded-xl bg-surface-elevated">
                                    <p className="text-xs text-text-muted mb-1">Flow</p>
                                    <p className="font-medium capitalize">{latestLog.flowLevel}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-surface-elevated">
                                    <p className="text-xs text-text-muted mb-1">Pain Level</p>
                                    <p className="font-medium">{latestLog.painLevel}/10</p>
                                </div>
                                <div className="p-3 rounded-xl bg-surface-elevated">
                                    <p className="text-xs text-text-muted mb-1">Mood</p>
                                    <p className="font-medium capitalize">{latestLog.mood}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-surface-elevated">
                                    <p className="text-xs text-text-muted mb-1">Energy</p>
                                    <p className="font-medium capitalize">{latestLog.energyLevel}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <p className="text-text-muted mb-3">No logs yet today</p>
                                <Link href="/log">
                                    <Button size="sm">Log Your First Entry</Button>
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* AI Insight Card */}
                <Card variant="elevated">
                    <CardContent className="pt-6">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
                                <Sparkles className="w-5 h-5 text-secondary" />
                            </div>
                            <div>
                                <p className="font-medium mb-1">Health Insight</p>
                                <p className="text-sm text-text-secondary">
                                    You&apos;re in your {currentPhase.toLowerCase()} phase.
                                    {currentPhase === 'Luteal' && ' This is a great time to focus on rest and self-care.'}
                                    {currentPhase === 'Follicular' && ' Energy levels typically increase during this time.'}
                                    {currentPhase === 'Ovulation' && ' You may notice increased energy and mood.'}
                                    {currentPhase === 'Menstrual' && ' Remember to stay hydrated and rest when needed.'}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link href="/log">
                    <Card variant="default" hover className="h-full">
                        <CardContent className="pt-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                                <Calendar className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium">Log Symptoms</p>
                                <p className="text-sm text-text-secondary">Track how you feel today</p>
                            </div>
                            <ChevronRight className="text-text-muted" />
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/chat">
                    <Card variant="default" hover className="h-full">
                        <CardContent className="pt-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center">
                                <MessageCircle className="w-6 h-6 text-accent" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium">Chat with Ovira</p>
                                <p className="text-sm text-text-secondary">Ask health questions</p>
                            </div>
                            <ChevronRight className="text-text-muted" />
                        </CardContent>
                    </Card>
                </Link>

                <Link href="/reports">
                    <Card variant="default" hover className="h-full">
                        <CardContent className="pt-6 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
                                <FileText className="w-6 h-6 text-secondary" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium">Health Reports</p>
                                <p className="text-sm text-text-secondary">View and share reports</p>
                            </div>
                            <ChevronRight className="text-text-muted" />
                        </CardContent>
                    </Card>
                </Link>
            </div>

            {/* Medical Disclaimer */}
            <Card variant="outlined" className="border-warning/30 bg-warning/5">
                <CardContent className="pt-6 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-warning mb-1">Medical Disclaimer</p>
                        <p className="text-sm text-text-secondary">
                            Information provided by Ovira AI is for educational purposes only and is not a substitute
                            for professional medical advice. Always consult a healthcare provider for medical concerns.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
