'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SymptomLog, Appointment } from '@/types';
import {
    getPhaseColor,
    formatDate,
} from '@/lib/utils';
import { getCurrentCycleInfo, calculateLoggingStreak, CycleInfo } from '@/lib/utils/cycle-analysis';
import {
    loadNotifications, dismissNotification, getUnreadCount, AppNotification
} from '@/lib/utils/notifications';
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
    AlertCircle,
    Bell,
    Clock,
    Droplets,
    Pill,
    X,
    Settings,
    PartyPopper,
    Users,
    Check
} from 'lucide-react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

export default function DashboardPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const [recentLogs, setRecentLogs] = useState<SymptomLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [streak, setStreak] = useState(0);
    const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
    const [bellOpen, setBellOpen] = useState(false);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [dailyArticle, setDailyArticle] = useState<any>(null);
    const [articleLoading, setArticleLoading] = useState(false);
    const [upcomingAppt, setUpcomingAppt] = useState<Appointment | null>(null);
    const bellRef = useRef<HTMLDivElement>(null);
    const [welcomeToast, setWelcomeToast] = useState(false);
    const searchParams = useSearchParams();
    const dashRouter = useRouter();

    // Welcome toast from onboarding
    useEffect(() => {
        if (searchParams.get('welcome') === 'true') {
            setWelcomeToast(true);
            // Clean up the URL
            dashRouter.replace('/dashboard');
            // Auto-dismiss after 6s
            const timer = setTimeout(() => setWelcomeToast(false), 6000);
            return () => clearTimeout(timer);
        }
    }, [searchParams, dashRouter]);

    // Refresh notification state
    const refreshNotifs = () => {
        setNotifications(loadNotifications());
        setUnreadCount(getUnreadCount());
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
                setBellOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchRecentLogs = async () => {
            if (!user) return;

            try {
                const response = await fetch(`/api/symptoms?userId=${user.username}&limit=100`);
                const data = await response.json();

                if (data.success && data.logs) {
                    const logs = data.logs.map((log: any) => ({
                        ...log,
                        date: {
                            // Handle both YYYY-MM-DD and ISO formats correctly in local time
                            toDate: () => {
                                if (log.date.includes('T')) {
                                    return new Date(log.date);
                                }
                                const [y, m, d] = log.date.split('-').map(Number);
                                return new Date(y, m - 1, d);
                            },
                        },
                    }));
                    setRecentLogs(logs);

                    // Smart cycle analysis from actual log data
                    const rawLogs = data.logs as Array<{ date: string; flowLevel: string;[key: string]: any }>;

                    // Parse profile lastPeriodStart safely
                    let profileLastPeriod: Date | null = null;
                    if (userProfile?.lastPeriodStart) {
                        const lps = userProfile.lastPeriodStart as any;
                        if (typeof lps === 'string') {
                            profileLastPeriod = new Date(lps);
                        } else if (lps?.toDate) {
                            profileLastPeriod = lps.toDate();
                        }
                    }

                    const info = getCurrentCycleInfo(
                        rawLogs,
                        profileLastPeriod,
                        userProfile?.averageCycleLength
                    );
                    setCycleInfo(info);

                    // Smart streak calculation
                    setStreak(calculateLoggingStreak(rawLogs));
                }
            } catch (error) {
                console.error('Error fetching logs:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecentLogs();
    }, [user, userProfile]);

    // Fetch daily health insight
    useEffect(() => {
        const fetchDailyArticle = async () => {
            if (!user) return;

            const today = new Date().toISOString().split('T')[0];
            const cacheKey = `daily_article_${user.username}_${today}`;

            // Check localStorage cache first
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                try {
                    setDailyArticle(JSON.parse(cached));
                    return;
                } catch (e) {
                    localStorage.removeItem(cacheKey);
                }
            }

            setArticleLoading(true);
            try {
                const response = await fetch(`/api/articles?type=daily&userId=${user.username}`);
                const data = await response.json();
                if (data.success && data.article) {
                    setDailyArticle(data.article);
                    localStorage.setItem(cacheKey, JSON.stringify(data.article));
                }
            } catch (error) {
                console.error('Error fetching daily article:', error);
            } finally {
                setArticleLoading(false);
            }
        };

        fetchDailyArticle();
    }, [user]);

    // Fetch upcoming appointments
    useEffect(() => {
        const fetchUpcomingAppt = async () => {
            if (!user) return;
            try {
                const response = await fetch(`/api/appointments?userId=${user.username}&upcoming=true`);
                const data = await response.json();
                if (data.success && data.appointments?.length > 0) {
                    setUpcomingAppt(data.appointments[0]);
                }
            } catch (error) {
                console.error('Error fetching appointments:', error);
            }
        };

        fetchUpcomingAppt();
    }, [user]);

    // Show loading state while auth is loading
    if (authLoading || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-text-secondary">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    // Use smart cycle info or fallback defaults
    const avgCycleLength = cycleInfo?.averageCycleLength || 28;
    const daysUntilPeriod = cycleInfo?.daysUntilNextPeriod ?? 28;
    const currentPhase = cycleInfo?.currentPhase || 'Follicular';
    const cycleDay = cycleInfo?.cycleDay || 1;
    const hasSufficientData = cycleInfo?.hasSufficientData || false;
    const phaseColor = getPhaseColor(currentPhase);

    // Get latest log
    const latestLog = recentLogs[0];

    // Format predicted period date from cycle analysis
    const nextPeriodDate = cycleInfo?.nextPeriodDate || new Date();
    const nextPeriodFormatted = formatDate(nextPeriodDate, 'MMMM d');

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {/* Welcome toast from onboarding */}
            {welcomeToast && (
                <div className="fixed top-4 right-4 z-50 animate-slide-in-up">
                    <div className="flex items-start gap-3 bg-surface border border-primary/30 shadow-xl rounded-2xl p-4 max-w-sm">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <PartyPopper className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm">
                                Welcome, {userProfile?.displayName?.split(' ')[0] || 'there'}! 🎉
                            </p>
                            <p className="text-xs text-text-secondary mt-0.5">
                                Your AI companion is now personalised for you.
                            </p>
                        </div>
                        <button
                            onClick={() => setWelcomeToast(false)}
                            className="p-1 rounded hover:bg-surface-elevated text-text-muted"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </div>
            )}
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
                <div className="flex items-center gap-3">
                    {/* Bell icon with dropdown */}
                    <div className="relative" ref={bellRef}>
                        <button
                            onClick={() => { setBellOpen(!bellOpen); refreshNotifs(); }}
                            className="relative p-2.5 rounded-xl bg-surface-elevated hover:bg-primary/10 transition-colors"
                        >
                            <Bell size={20} />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 bg-accent text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Dropdown */}
                        {bellOpen && (
                            <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-fade-in">
                                <div className="p-4 border-b border-border flex items-center justify-between">
                                    <h3 className="font-semibold text-sm">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <span className="text-xs text-accent font-medium">{unreadCount} new</span>
                                    )}
                                </div>
                                <div className="max-h-72 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="p-6 text-center text-text-muted text-sm">
                                            No notifications yet
                                        </div>
                                    ) : (
                                        notifications.slice(0, 5).map(notif => {
                                            const iconMap: Record<string, React.ReactNode> = {
                                                period: <Calendar className="w-4 h-4 text-accent" />,
                                                'daily-log': <Clock className="w-4 h-4 text-warning" />,
                                                medication: <Pill className="w-4 h-4 text-secondary" />,
                                                hydration: <Droplets className="w-4 h-4 text-info" />,
                                            };
                                            const time = new Date(notif.timestamp);
                                            const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            return (
                                                <div
                                                    key={notif.id}
                                                    className={`flex items-start gap-3 px-4 py-3 hover:bg-surface-elevated transition-colors ${!notif.read ? 'bg-primary/5' : ''}`}
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-surface-elevated flex items-center justify-center flex-shrink-0 mt-0.5">
                                                        {iconMap[notif.type] || <Bell className="w-4 h-4" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-xs ${!notif.read ? 'font-semibold' : 'text-text-secondary'}`}>{notif.title}</p>
                                                        <p className="text-[11px] text-text-muted mt-0.5 truncate">{notif.body}</p>
                                                        <p className="text-[10px] text-text-muted mt-0.5">{timeStr}</p>
                                                    </div>
                                                    {!notif.read && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); refreshNotifs(); }}
                                                            className="p-1 rounded hover:bg-surface text-text-muted hover:text-text-primary"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                                <Link
                                    href="/notifications"
                                    onClick={() => setBellOpen(false)}
                                    className="flex items-center justify-center gap-2 p-3 border-t border-border text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
                                >
                                    <Settings size={14} />
                                    Notification Settings
                                </Link>
                            </div>
                        )}
                    </div>
                    <Link href="/log">
                        <Button leftIcon={<Calendar size={18} />}>Log Symptoms</Button>
                    </Link>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Period Countdown Card — Primary */}
                <Card variant="gradient" className="md:col-span-2 lg:col-span-1">
                    <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-text-secondary mb-1">Next Period</p>
                                {daysUntilPeriod > 0 ? (
                                    <>
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-5xl font-bold" style={{ color: phaseColor }}>
                                                {daysUntilPeriod}
                                            </span>
                                            <span className="text-text-muted text-lg">days away</span>
                                        </div>
                                        <p className="text-sm text-text-secondary mt-1">
                                            Expected {nextPeriodFormatted}
                                        </p>
                                    </>
                                ) : daysUntilPeriod === 0 ? (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-accent">Expected Today</span>
                                    </div>
                                ) : (
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-error">
                                            {Math.abs(daysUntilPeriod)} days late
                                        </span>
                                    </div>
                                )}
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
                                        strokeDasharray={`${(cycleDay / avgCycleLength) * 100}, 100`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Cycle Info Card */}
                <Card variant="elevated">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                                <Heart className="w-5 h-5 text-accent" />
                            </div>
                            <div>
                                <p className="text-sm text-text-secondary">Cycle Length</p>
                                <p className="font-semibold">
                                    {avgCycleLength} days {hasSufficientData ? '(computed)' : '(default)'}
                                </p>
                            </div>
                        </div>
                        <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-accent transition-all"
                                style={{ width: `${Math.min(100, (cycleDay / avgCycleLength) * 100)}%` }}
                            />
                        </div>
                        <p className="text-xs text-text-muted mt-2">Day {cycleDay} of {avgCycleLength}</p>
                        {!hasSufficientData && (
                            <p className="text-xs text-warning mt-2 flex items-center gap-1">
                                <AlertCircle size={12} />
                                Log more periods for smarter predictions
                            </p>
                        )}
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

                {/* Today's Health Insight Card */}
                <Card variant="default">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-primary" />
                            </div>
                            <h3 className="font-bold">Daily Health Insight</h3>
                        </div>

                        {dailyArticle ? (
                            <div className="space-y-3">
                                <h4 className="font-bold text-text-primary leading-tight">
                                    {dailyArticle.title}
                                </h4>
                                <p className="text-xs text-text-secondary line-clamp-3">
                                    {dailyArticle.tagline || dailyArticle.body}
                                </p>
                                <Link
                                    href={`/articles/${dailyArticle.id || 'daily'}`}
                                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:gap-2 transition-all mt-2"
                                >
                                    Read more <ChevronRight size={12} />
                                </Link>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <h4 className="font-bold text-text-primary leading-tight">
                                    Nurture your {currentPhase.toLowerCase()} phase
                                </h4>
                                <p className="text-xs text-text-secondary leading-relaxed">
                                    Focus on iron-rich foods like leafy greens and lean proteins during this time to support your levels.
                                </p>
                                <Link
                                    href="/articles"
                                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:gap-2 transition-all mt-2"
                                >
                                    View recommendations <ChevronRight size={12} />
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Upcoming Appointment Card */}
                {upcomingAppt && (
                    <Card variant="default" className="md:col-span-2 lg:col-span-3 border-primary/20 bg-primary/5">
                        <CardContent className="p-6">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                        <Users className="w-6 h-6 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg">Upcoming Health Consultation</h3>
                                        <p className="text-text-secondary">
                                            {upcomingAppt.doctorName}, {upcomingAppt.date} at {upcomingAppt.time}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full md:w-auto">
                                    {upcomingAppt.healthSummarySent ? (
                                        <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-xl border border-green-200">
                                            <Check size={18} /> Summary sent to {upcomingAppt.doctorName.split(' ')[1]}
                                        </div>
                                    ) : (
                                        <Link href={`/appointments/${upcomingAppt.appointmentId}`} className="w-full md:w-auto">
                                            <Button variant="primary" className="w-full rounded-xl shadow-button">
                                                Send Health Summary
                                            </Button>
                                        </Link>
                                    )}
                                    <Link href={`/appointments/${upcomingAppt.appointmentId}`} className="shrink-0">
                                        <Button variant="secondary" className="rounded-xl">
                                            View Details
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
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
        </div >
    );
}
