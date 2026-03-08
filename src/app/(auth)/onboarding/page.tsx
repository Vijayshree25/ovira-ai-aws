'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';
import { HEALTH_CONDITIONS, SUPPORTED_LANGUAGES, SYMPTOM_OPTIONS, OnboardingData } from '@/types';
import { Check, ChevronLeft, ChevronRight, Shield, Heart, Globe, Calendar, User, Utensils, Activity } from 'lucide-react';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

// ── Chip selector component ──────────────────────────────────────────────────
function Chip({
    label,
    selected,
    onClick,
    emoji,
}: {
    label: string;
    selected: boolean;
    onClick: () => void;
    emoji?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-200 ${selected
                ? 'border-primary bg-primary/10 text-primary scale-[1.03] shadow-sm'
                : 'border-border hover:border-primary/40 hover:bg-primary/5'
                }`}
        >
            {emoji && <span className="mr-1.5">{emoji}</span>}
            {label}
        </button>
    );
}

// ── Range slider component ───────────────────────────────────────────────────
function RangeSlider({
    label,
    min,
    max,
    value,
    onChange,
    unit,
}: {
    label: string;
    min: number;
    max: number;
    value: number;
    onChange: (v: number) => void;
    unit?: string;
}) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-text-secondary">{label}</span>
                <span className="text-sm font-bold text-primary">
                    {value} {unit}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full h-2 bg-surface rounded-full appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-text-muted">
                <span>{min}</span>
                <span>{max}</span>
            </div>
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function OnboardingPage() {
    const [step, setStep] = useState<Step>(1);
    const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<OnboardingData>({
        // Step 1 — Welcome
        language: 'en',
        acceptedTerms: false,
        acceptedMedicalDisclaimer: false,
        // Step 2 — About You
        ageRange: '25-34',
        activityLevel: '',
        heightRange: '',
        // Step 3 — Cycle History
        lastPeriodStart: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
        previousPeriodDates: [],
        periodDuration: 5,
        cycleRegularity: '',
        // Step 4 — Health Conditions
        conditions: [],
        // Step 5 — Diet & Lifestyle
        dietType: '',
        stapleGrain: '',
        ironRichFoodFrequency: '',
        waterIntake: 6,
        caffeineIntake: '',
        sleepHabit: '',
        // Step 6 — Recent Symptoms
        recentPainLevel: '',
        recentMoodPattern: '',
        regularSymptoms: [],
        hasDoctorConsultation: '',
        personalGoal: '',
    });

    const { completeOnboarding, user, loading: authLoading } = useAuth();
    const router = useRouter();
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    // Scroll to top when step changes
    useEffect(() => {
        contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    const handleNext = () => {
        if (step < 6) {
            setDirection('forward');
            setStep((step + 1) as Step);
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setDirection('backward');
            setStep((step - 1) as Step);
        }
    };

    const handleComplete = async () => {
        if (!data.acceptedTerms || !data.acceptedMedicalDisclaimer) return;
        if (!user) {
            console.error('User not initialized');
            return;
        }

        setLoading(true);
        try {
            await completeOnboarding(data);
            router.replace('/dashboard?welcome=true');
        } catch (error) {
            console.error('Error completing onboarding:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleCondition = (condition: string) => {
        setData((prev) => ({
            ...prev,
            conditions: prev.conditions.includes(condition)
                ? prev.conditions.filter((c) => c !== condition)
                : [...prev.conditions, condition],
        }));
    };

    const toggleSymptom = (symptom: string) => {
        setData((prev) => ({
            ...prev,
            regularSymptoms: prev.regularSymptoms.includes(symptom)
                ? prev.regularSymptoms.filter((s) => s !== symptom)
                : [...prev.regularSymptoms, symptom],
        }));
    };

    const updatePreviousDate = (index: number, value: string) => {
        setData((prev) => {
            const dates = [...prev.previousPeriodDates];
            if (value) {
                dates[index] = value;
            } else {
                dates.splice(index, 1);
            }
            return { ...prev, previousPeriodDates: dates.filter(Boolean) };
        });
    };

    // Can continue from step 1 only if both checkboxes are checked
    const canContinueStep1 = data.acceptedTerms && data.acceptedMedicalDisclaimer;

    // Step icons & labels for progress
    const stepConfig = [
        { icon: Shield, label: 'Welcome' },
        { icon: User, label: 'About You' },
        { icon: Calendar, label: 'Cycle' },
        { icon: Heart, label: 'Health' },
        { icon: Utensils, label: 'Lifestyle' },
        { icon: Activity, label: 'Symptoms' },
    ];

    // ── Transition class ─────────────────────────────────────────────────────
    const slideClass =
        direction === 'forward'
            ? 'animate-slide-in-right'
            : 'animate-slide-in-left';

    return (
        <div className="min-h-screen flex flex-col items-center justify-start p-4 pt-8 bg-gradient-to-br from-primary/5 via-background to-accent/5">
            <div className="w-full max-w-lg">
                {/* ── Progress Bar ────────────────────────────────────── */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        {stepConfig.map((s, i) => {
                            const num = i + 1;
                            const Icon = s.icon;
                            return (
                                <div key={num} className="flex flex-col items-center gap-1">
                                    <div
                                        className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 ${num < step
                                            ? 'bg-primary text-white'
                                            : num === step
                                                ? 'bg-primary text-white ring-4 ring-primary/20'
                                                : 'bg-surface border-2 border-border text-text-muted'
                                            }`}
                                    >
                                        {num < step ? <Check size={14} /> : <Icon size={14} />}
                                    </div>
                                    <span className="text-[10px] text-text-muted hidden sm:block">
                                        {s.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="h-2 bg-surface rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500 ease-out"
                            style={{ width: `${(step / 6) * 100}%` }}
                        />
                    </div>
                </div>

                {/* ── Card ────────────────────────────────────────────── */}
                <Card variant="elevated" padding="lg">
                    <div
                        ref={contentRef}
                        key={step}
                        className={`${slideClass} max-h-[65vh] overflow-y-auto pr-1`}
                        style={{ scrollbarWidth: 'thin' }}
                    >
                        {/* ═══════════════════ STEP 1 — WELCOME ═══════════════════ */}
                        {step === 1 && (
                            <>
                                <CardHeader className="text-center">
                                    <div className="flex items-center justify-center mb-2">
                                        <Logo variant="icon" size={64} showText={false} />
                                    </div>
                                    <div className="flex items-center justify-center gap-4 mb-2">
                                        <CardTitle>Welcome to Ovira AI</CardTitle>
                                    </div>
                                    <CardDescription>
                                        Let&apos;s set up your personalised health companion
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-5">
                                        {/* Language selector */}
                                        <div>
                                            <h4 className="font-medium mb-2 flex items-center gap-2">
                                                <Globe size={16} className="text-secondary" />
                                                Preferred language
                                            </h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {SUPPORTED_LANGUAGES.map((lang) => (
                                                    <button
                                                        key={lang.code}
                                                        onClick={() =>
                                                            setData((prev) => ({
                                                                ...prev,
                                                                language: lang.code,
                                                            }))
                                                        }
                                                        className={`p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between ${data.language === lang.code
                                                            ? 'border-primary bg-primary/10'
                                                            : 'border-border hover:border-primary/50'
                                                            }`}
                                                    >
                                                        <span className="font-medium text-sm">
                                                            {lang.name}
                                                        </span>
                                                        {data.language === lang.code && (
                                                            <Check
                                                                size={16}
                                                                className="text-primary"
                                                            />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Data privacy notice */}
                                        <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-xs text-text-secondary leading-relaxed">
                                            🔒 Ovira collects health data to personalise your AI
                                            companion. Your data stays encrypted in AWS and is never
                                            shared.{' '}
                                            <a
                                                href="#"
                                                className="text-primary underline hover:no-underline"
                                            >
                                                See Privacy Policy
                                            </a>
                                        </div>

                                        {/* Privacy Terms */}
                                        <div className="p-4 rounded-xl bg-surface-elevated border border-border">
                                            <h4 className="font-medium mb-2">
                                                Privacy & Data Usage
                                            </h4>
                                            <p className="text-sm text-text-secondary">
                                                Your health data is encrypted and stored securely. We
                                                never share your personal information with third
                                                parties. You can export or delete your data at any
                                                time.
                                            </p>
                                            <label className="flex items-center gap-3 mt-4 cursor-pointer">
                                                <div
                                                    onClick={() =>
                                                        setData((prev) => ({
                                                            ...prev,
                                                            acceptedTerms: !prev.acceptedTerms,
                                                        }))
                                                    }
                                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${data.acceptedTerms
                                                        ? 'bg-primary border-primary'
                                                        : 'border-border hover:border-primary'
                                                        }`}
                                                >
                                                    {data.acceptedTerms && (
                                                        <Check
                                                            size={12}
                                                            className="text-white"
                                                        />
                                                    )}
                                                </div>
                                                <span className="text-sm">
                                                    I accept the privacy policy and terms
                                                </span>
                                            </label>
                                        </div>

                                        {/* Medical Disclaimer */}
                                        <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
                                            <h4 className="font-medium mb-2 text-warning">
                                                Medical Disclaimer
                                            </h4>
                                            <p className="text-sm text-text-secondary">
                                                Ovira AI provides health insights for informational
                                                purposes only. This is{' '}
                                                <strong>not</strong> a substitute for professional
                                                medical advice, diagnosis, or treatment.
                                            </p>
                                            <label className="flex items-center gap-3 mt-4 cursor-pointer">
                                                <div
                                                    onClick={() =>
                                                        setData((prev) => ({
                                                            ...prev,
                                                            acceptedMedicalDisclaimer:
                                                                !prev.acceptedMedicalDisclaimer,
                                                        }))
                                                    }
                                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0 ${data.acceptedMedicalDisclaimer
                                                        ? 'bg-warning border-warning'
                                                        : 'border-border hover:border-warning'
                                                        }`}
                                                >
                                                    {data.acceptedMedicalDisclaimer && (
                                                        <Check
                                                            size={12}
                                                            className="text-white"
                                                        />
                                                    )}
                                                </div>
                                                <span className="text-sm">
                                                    I understand and accept this disclaimer
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </CardContent>
                            </>
                        )}

                        {/* ═══════════════════ STEP 2 — ABOUT YOU ═══════════════════ */}
                        {step === 2 && (
                            <>
                                <CardHeader className="text-center">
                                    <div className="mx-auto w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mb-4">
                                        <User className="w-7 h-7 text-secondary" />
                                    </div>
                                    <CardTitle>About You</CardTitle>
                                    <CardDescription>
                                        This helps us personalise your experience
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-6">
                                        {/* Age Range */}
                                        <div>
                                            <h4 className="text-sm font-medium mb-3 text-text-secondary">
                                                Age range
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {(
                                                    [
                                                        '13-17',
                                                        '18-24',
                                                        '25-34',
                                                        '35-44',
                                                        '45+',
                                                    ] as const
                                                ).map((range) => (
                                                    <Chip
                                                        key={range}
                                                        label={range}
                                                        selected={data.ageRange === range}
                                                        onClick={() =>
                                                            setData((prev) => ({
                                                                ...prev,
                                                                ageRange: range,
                                                            }))
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Activity Level */}
                                        <div>
                                            <h4 className="text-sm font-medium mb-3 text-text-secondary">
                                                Activity level
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    'Sedentary',
                                                    'Lightly Active',
                                                    'Moderately Active',
                                                    'Very Active',
                                                ].map((level) => (
                                                    <Chip
                                                        key={level}
                                                        label={level}
                                                        selected={data.activityLevel === level}
                                                        onClick={() =>
                                                            setData((prev) => ({
                                                                ...prev,
                                                                activityLevel: level,
                                                            }))
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Height Range (optional) */}
                                        <div>
                                            <h4 className="text-sm font-medium mb-1 text-text-secondary">
                                                Height range{' '}
                                                <span className="text-text-muted">(optional)</span>
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    'Under 150cm',
                                                    '150-160cm',
                                                    '160-170cm',
                                                    '170cm+',
                                                ].map((h) => (
                                                    <Chip
                                                        key={h}
                                                        label={h}
                                                        selected={data.heightRange === h}
                                                        onClick={() =>
                                                            setData((prev) => ({
                                                                ...prev,
                                                                heightRange:
                                                                    prev.heightRange === h
                                                                        ? ''
                                                                        : h,
                                                            }))
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </>
                        )}

                        {/* ═══════════════════ STEP 3 — CYCLE HISTORY ═══════════════════ */}
                        {step === 3 && (
                            <>
                                <CardHeader className="text-center">
                                    <div className="mx-auto w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                                        <Calendar className="w-7 h-7 text-accent" />
                                    </div>
                                    <CardTitle>Cycle History</CardTitle>
                                    <CardDescription>
                                        Help us understand your menstrual pattern
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-5">
                                        {/* Last period start */}
                                        <div>
                                            <label className="text-sm font-medium text-text-secondary block mb-2">
                                                When did your last period start?
                                            </label>
                                            <input
                                                type="date"
                                                value={data.lastPeriodStart}
                                                onChange={(e) =>
                                                    setData((prev) => ({
                                                        ...prev,
                                                        lastPeriodStart: e.target.value,
                                                    }))
                                                }
                                                className="w-full p-3 rounded-xl border-2 border-border bg-surface text-sm focus:border-primary focus:outline-none transition-colors"
                                            />
                                        </div>

                                        {/* Previous period dates (optional) */}
                                        <div>
                                            <label className="text-sm font-medium text-text-secondary block mb-2">
                                                Previous period start dates{' '}
                                                <span className="text-text-muted">(optional)</span>
                                            </label>
                                            <div className="space-y-2">
                                                <input
                                                    type="date"
                                                    value={data.previousPeriodDates[0] || ''}
                                                    onChange={(e) =>
                                                        updatePreviousDate(0, e.target.value)
                                                    }
                                                    placeholder="Period before last"
                                                    className="w-full p-3 rounded-xl border-2 border-border bg-surface text-sm focus:border-primary focus:outline-none transition-colors"
                                                />
                                                <input
                                                    type="date"
                                                    value={data.previousPeriodDates[1] || ''}
                                                    onChange={(e) =>
                                                        updatePreviousDate(1, e.target.value)
                                                    }
                                                    placeholder="Period before that"
                                                    className="w-full p-3 rounded-xl border-2 border-border bg-surface text-sm focus:border-primary focus:outline-none transition-colors"
                                                />
                                            </div>
                                        </div>

                                        {/* Period duration slider */}
                                        <RangeSlider
                                            label="How many days does your period usually last?"
                                            min={2}
                                            max={10}
                                            value={data.periodDuration}
                                            onChange={(v) =>
                                                setData((prev) => ({
                                                    ...prev,
                                                    periodDuration: v,
                                                }))
                                            }
                                            unit="days"
                                        />

                                        {/* Cycle regularity */}
                                        <div>
                                            <h4 className="text-sm font-medium mb-3 text-text-secondary">
                                                How would you describe your cycle regularity?
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    'Very Regular (±2 days)',
                                                    'Mostly Regular (±5 days)',
                                                    'Irregular',
                                                    'Very Irregular',
                                                    "I don't track",
                                                ].map((option) => (
                                                    <Chip
                                                        key={option}
                                                        label={option}
                                                        selected={data.cycleRegularity === option}
                                                        onClick={() =>
                                                            setData((prev) => ({
                                                                ...prev,
                                                                cycleRegularity: option,
                                                            }))
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </>
                        )}

                        {/* ═══════════════════ STEP 4 — HEALTH CONDITIONS ═══════════════════ */}
                        {step === 4 && (
                            <>
                                <CardHeader className="text-center">
                                    <div className="mx-auto w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                                        <Heart className="w-7 h-7 text-accent" />
                                    </div>
                                    <CardTitle>Any known conditions?</CardTitle>
                                    <CardDescription>
                                        Select all that apply (optional)
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 gap-2">
                                        {HEALTH_CONDITIONS.map((condition) => (
                                            <button
                                                key={condition}
                                                onClick={() => toggleCondition(condition)}
                                                className={`p-3 rounded-xl border-2 text-sm text-left transition-all flex items-center gap-2 ${data.conditions.includes(condition)
                                                    ? 'border-primary bg-primary/10 text-primary'
                                                    : 'border-border hover:border-primary/50'
                                                    }`}
                                            >
                                                <div
                                                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${data.conditions.includes(condition)
                                                        ? 'bg-primary border-primary'
                                                        : 'border-border'
                                                        }`}
                                                >
                                                    {data.conditions.includes(condition) && (
                                                        <Check
                                                            size={12}
                                                            className="text-white"
                                                        />
                                                    )}
                                                </div>
                                                {condition}
                                            </button>
                                        ))}
                                    </div>
                                </CardContent>
                            </>
                        )}

                        {/* ═══════════════════ STEP 5 — DIET & LIFESTYLE ═══════════════════ */}
                        {step === 5 && (
                            <>
                                <CardHeader className="text-center">
                                    <div className="mx-auto w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mb-4">
                                        <Utensils className="w-7 h-7 text-success" />
                                    </div>
                                    <CardTitle>Diet & Lifestyle</CardTitle>
                                    <CardDescription>
                                        This helps us give nutrition-aware advice
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-5">
                                        {/* Diet type */}
                                        <div>
                                            <h4 className="text-sm font-medium mb-3 text-text-secondary">
                                                Diet type
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    { label: 'Vegetarian', emoji: '🥬' },
                                                    { label: 'Eggetarian', emoji: '🥚' },
                                                    { label: 'Non-vegetarian', emoji: '🍗' },
                                                    { label: 'Vegan', emoji: '🌱' },
                                                ].map((d) => (
                                                    <Chip
                                                        key={d.label}
                                                        label={d.label}
                                                        emoji={d.emoji}
                                                        selected={data.dietType === d.label}
                                                        onClick={() =>
                                                            setData((prev) => ({
                                                                ...prev,
                                                                dietType: d.label,
                                                            }))
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Staple grain */}
                                        <div>
                                            <h4 className="text-sm font-medium mb-3 text-text-secondary">
                                                Staple grain
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    'Rice-dominant',
                                                    'Roti-dominant',
                                                    'Both',
                                                    'Other',
                                                ].map((g) => (
                                                    <Chip
                                                        key={g}
                                                        label={g}
                                                        selected={data.stapleGrain === g}
                                                        onClick={() =>
                                                            setData((prev) => ({
                                                                ...prev,
                                                                stapleGrain: g,
                                                            }))
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Iron-rich foods */}
                                        <div>
                                            <h4 className="text-sm font-medium mb-1 text-text-secondary">
                                                How often do you eat iron-rich foods?
                                            </h4>
                                            <p className="text-xs text-text-muted mb-3">
                                                Spinach, jaggery, dates, meat, or fish
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    'Rarely',
                                                    'Sometimes (2-3x/week)',
                                                    'Often (daily)',
                                                ].map((f) => (
                                                    <Chip
                                                        key={f}
                                                        label={f}
                                                        selected={
                                                            data.ironRichFoodFrequency === f
                                                        }
                                                        onClick={() =>
                                                            setData((prev) => ({
                                                                ...prev,
                                                                ironRichFoodFrequency: f,
                                                            }))
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Water intake slider */}
                                        <RangeSlider
                                            label="How many glasses of water per day?"
                                            min={1}
                                            max={12}
                                            value={data.waterIntake}
                                            onChange={(v) =>
                                                setData((prev) => ({
                                                    ...prev,
                                                    waterIntake: v,
                                                }))
                                            }
                                            unit="glasses"
                                        />

                                        {/* Caffeine */}
                                        <div>
                                            <h4 className="text-sm font-medium mb-3 text-text-secondary">
                                                Tea or coffee per day?
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {['None', '1-2 cups', '3+ cups'].map((c) => (
                                                    <Chip
                                                        key={c}
                                                        label={c}
                                                        selected={data.caffeineIntake === c}
                                                        onClick={() =>
                                                            setData((prev) => ({
                                                                ...prev,
                                                                caffeineIntake: c,
                                                            }))
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Sleep */}
                                        <div>
                                            <h4 className="text-sm font-medium mb-3 text-text-secondary">
                                                I usually sleep…
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    'Before 10pm',
                                                    '10pm - 12am',
                                                    'After midnight',
                                                ].map((s) => (
                                                    <Chip
                                                        key={s}
                                                        label={s}
                                                        selected={data.sleepHabit === s}
                                                        onClick={() =>
                                                            setData((prev) => ({
                                                                ...prev,
                                                                sleepHabit: s,
                                                            }))
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </>
                        )}

                        {/* ═══════════════════ STEP 6 — RECENT SYMPTOMS ═══════════════════ */}
                        {step === 6 && (
                            <>
                                <CardHeader className="text-center">
                                    <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                                        <Activity className="w-7 h-7 text-primary" />
                                    </div>
                                    <CardTitle>Help us understand your recent health</CardTitle>
                                    <CardDescription>
                                        This helps your AI companion give personalised advice from
                                        Day 1
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-5">
                                        {/* Pain level */}
                                        <div>
                                            <h4 className="text-sm font-medium mb-3 text-text-secondary">
                                                How has your pain been in the last 3 months?
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    'No pain',
                                                    'Mild discomfort',
                                                    'Moderate pain',
                                                    'Severe pain (affects daily life)',
                                                ].map((p) => (
                                                    <Chip
                                                        key={p}
                                                        label={p}
                                                        selected={data.recentPainLevel === p}
                                                        onClick={() =>
                                                            setData((prev) => ({
                                                                ...prev,
                                                                recentPainLevel: p,
                                                            }))
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Mood pattern */}
                                        <div>
                                            <h4 className="text-sm font-medium mb-3 text-text-secondary">
                                                How has your mood been before periods?
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {[
                                                    'Fine',
                                                    'Bit low',
                                                    'Noticeably worse',
                                                    'Very difficult',
                                                ].map((m) => (
                                                    <Chip
                                                        key={m}
                                                        label={m}
                                                        selected={data.recentMoodPattern === m}
                                                        onClick={() =>
                                                            setData((prev) => ({
                                                                ...prev,
                                                                recentMoodPattern: m,
                                                            }))
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Regular symptoms (multi-select) */}
                                        <div>
                                            <h4 className="text-sm font-medium mb-3 text-text-secondary">
                                                Any symptoms you deal with regularly?
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {SYMPTOM_OPTIONS.map((sym) => (
                                                    <Chip
                                                        key={sym}
                                                        label={sym}
                                                        selected={data.regularSymptoms.includes(
                                                            sym
                                                        )}
                                                        onClick={() => toggleSymptom(sym)}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Doctor consultation */}
                                        <div>
                                            <h4 className="text-sm font-medium mb-3 text-text-secondary">
                                                Have you spoken to a doctor about your cycle
                                                recently?
                                            </h4>
                                            <div className="flex flex-wrap gap-2">
                                                {['Yes', 'No', 'Planning to'].map((d) => (
                                                    <Chip
                                                        key={d}
                                                        label={d}
                                                        selected={
                                                            data.hasDoctorConsultation === d
                                                        }
                                                        onClick={() =>
                                                            setData((prev) => ({
                                                                ...prev,
                                                                hasDoctorConsultation: d,
                                                            }))
                                                        }
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Personal goal (free text) */}
                                        <div>
                                            <h4 className="text-sm font-medium mb-2 text-text-secondary">
                                                Is there anything specific you want help with?{' '}
                                                <span className="text-text-muted">(optional)</span>
                                            </h4>
                                            <textarea
                                                value={data.personalGoal}
                                                onChange={(e) =>
                                                    setData((prev) => ({
                                                        ...prev,
                                                        personalGoal: e.target.value.slice(0, 200),
                                                    }))
                                                }
                                                maxLength={200}
                                                rows={3}
                                                placeholder="e.g. understanding my irregular cycles, managing PMS, PCOS symptoms..."
                                                className="w-full p-3 rounded-xl border-2 border-border bg-surface text-sm focus:border-primary focus:outline-none transition-colors resize-none"
                                            />
                                            <p className="text-xs text-text-muted text-right mt-1">
                                                {data.personalGoal.length}/200
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </>
                        )}
                    </div>

                    {/* ── Navigation Buttons ────────────────────────────── */}
                    <div className="flex gap-3 mt-6 pt-6 border-t border-border">
                        {step > 1 && (
                            <Button
                                variant="ghost"
                                onClick={handleBack}
                                leftIcon={<ChevronLeft size={20} />}
                            >
                                Back
                            </Button>
                        )}
                        <div className="flex-1" />
                        {step < 6 ? (
                            <Button
                                onClick={handleNext}
                                rightIcon={<ChevronRight size={20} />}
                                disabled={step === 1 && !canContinueStep1}
                            >
                                Continue
                            </Button>
                        ) : (
                            <Button
                                onClick={handleComplete}
                                isLoading={loading}
                                disabled={
                                    !data.acceptedTerms ||
                                    !data.acceptedMedicalDisclaimer ||
                                    !user
                                }
                            >
                                Get Started 🎉
                            </Button>
                        )}
                    </div>
                </Card>
            </div>

            {/* ── Global animation styles ────────────────────────────── */}
            <style jsx global>{`
                @keyframes slideInRight {
                    from {
                        opacity: 0;
                        transform: translateX(40px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes slideInLeft {
                    from {
                        opacity: 0;
                        transform: translateX(-40px);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                .animate-slide-in-right {
                    animation: slideInRight 0.35s ease-out;
                }
                .animate-slide-in-left {
                    animation: slideInLeft 0.35s ease-out;
                }
            `}</style>
        </div>
    );
}
