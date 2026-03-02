'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { MOOD_OPTIONS, FLOW_LEVELS, ENERGY_LEVELS, SYMPTOM_OPTIONS } from '@/types';
// TODO: Replace with AWS DynamoDB operations
import { format } from 'date-fns';
import { Calendar, Check, ArrowLeft, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function LogPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    // Form state
    const [flowLevel, setFlowLevel] = useState<'none' | 'light' | 'medium' | 'heavy'>('none');
    const [painLevel, setPainLevel] = useState(0);
    const [mood, setMood] = useState<'great' | 'good' | 'neutral' | 'bad' | 'terrible'>('neutral');
    const [energyLevel, setEnergyLevel] = useState<'low' | 'medium' | 'high'>('medium');
    const [sleepHours, setSleepHours] = useState(7);
    const [symptoms, setSymptoms] = useState<string[]>([]);
    const [notes, setNotes] = useState('');

    const toggleSymptom = (symptom: string) => {
        setSymptoms((prev) =>
            prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);

        try {
            // TODO: Save log to DynamoDB
            // await saveToDynamoDB({
            //     userId: user.uid,
            //     date: selectedDate.toISOString(),
            //     flowLevel,
            //     painLevel,
            //     mood,
            //     energyLevel,
            //     sleepHours,
            //     symptoms,
            //     notes: notes.trim() || null,
            // });

            setSuccess(true);
            setTimeout(() => {
                router.push('/dashboard');
            }, 1500);
        } catch (error) {
            console.error('Error saving log:', error);
        } finally {
            setLoading(false);
        }
    };

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        if (newDate <= new Date()) {
            setSelectedDate(newDate);
        }
    };

    if (success) {
        return (
            <div className="max-w-2xl mx-auto">
                <Card variant="elevated" className="text-center py-12">
                    <CardContent>
                        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6 animate-slide-in-up">
                            <Check className="w-10 h-10 text-success" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Log Saved!</h2>
                        <p className="text-text-secondary">Your symptoms have been recorded successfully.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/dashboard"
                    className="p-2 rounded-xl hover:bg-surface-elevated transition-colors"
                >
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Log Symptoms</h1>
                    <p className="text-text-secondary">Track how you&apos;re feeling today</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Date Selector */}
                <Card variant="elevated">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => changeDate(-1)}
                                className="p-2 rounded-xl hover:bg-surface-elevated transition-colors"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <div className="flex items-center gap-3">
                                <Calendar className="text-primary" size={20} />
                                <span className="text-lg font-medium">
                                    {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={() => changeDate(1)}
                                disabled={
                                    selectedDate.toDateString() === new Date().toDateString()
                                }
                                className="p-2 rounded-xl hover:bg-surface-elevated transition-colors disabled:opacity-30"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* Flow Level */}
                <Card variant="elevated">
                    <CardHeader>
                        <CardTitle className="text-lg">Flow Level</CardTitle>
                        <CardDescription>How is your flow today?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-4 gap-2">
                            {FLOW_LEVELS.map((level) => (
                                <button
                                    key={level.value}
                                    type="button"
                                    onClick={() => setFlowLevel(level.value as typeof flowLevel)}
                                    className={`p-4 rounded-xl border-2 text-center transition-all ${flowLevel === level.value
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-primary/50'
                                        }`}
                                >
                                    <div
                                        className="w-8 h-8 rounded-full mx-auto mb-2"
                                        style={{ backgroundColor: level.color }}
                                    />
                                    <span className="text-sm font-medium">{level.label}</span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Pain Level */}
                <Card variant="elevated">
                    <CardHeader>
                        <CardTitle className="text-lg">Pain Level</CardTitle>
                        <CardDescription>Rate your pain from 0 (none) to 10 (severe)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm text-text-muted">
                                <span>No pain</span>
                                <span>Severe</span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="10"
                                value={painLevel}
                                onChange={(e) => setPainLevel(parseInt(e.target.value))}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${painLevel * 10
                                        }%, hsl(var(--border)) ${painLevel * 10}%, hsl(var(--border)) 100%)`,
                                }}
                            />
                            <div className="flex justify-center">
                                <span className="text-3xl font-bold text-primary">{painLevel}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Mood */}
                <Card variant="elevated">
                    <CardHeader>
                        <CardTitle className="text-lg">Mood</CardTitle>
                        <CardDescription>How are you feeling emotionally?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-5 gap-2">
                            {MOOD_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setMood(option.value as typeof mood)}
                                    className={`p-3 rounded-xl border-2 text-center transition-all ${mood === option.value
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-primary/50'
                                        }`}
                                >
                                    <span className="text-2xl block mb-1">{option.emoji}</span>
                                    <span className="text-xs">{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Energy Level */}
                <Card variant="elevated">
                    <CardHeader>
                        <CardTitle className="text-lg">Energy Level</CardTitle>
                        <CardDescription>How energetic do you feel?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-3 gap-3">
                            {ENERGY_LEVELS.map((level) => (
                                <button
                                    key={level.value}
                                    type="button"
                                    onClick={() => setEnergyLevel(level.value as typeof energyLevel)}
                                    className={`p-4 rounded-xl border-2 text-center transition-all ${energyLevel === level.value
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-primary/50'
                                        }`}
                                >
                                    <span className="text-2xl block mb-1">{level.icon}</span>
                                    <span className="text-sm font-medium">{level.label}</span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Sleep Hours */}
                <Card variant="elevated">
                    <CardHeader>
                        <CardTitle className="text-lg">Sleep Hours</CardTitle>
                        <CardDescription>How many hours of sleep did you get?</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-center gap-6">
                            <button
                                type="button"
                                onClick={() => setSleepHours(Math.max(0, sleepHours - 0.5))}
                                className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center text-2xl hover:bg-primary/10 transition-colors"
                            >
                                -
                            </button>
                            <div className="text-center">
                                <span className="text-4xl font-bold text-primary">{sleepHours}</span>
                                <span className="text-text-muted block">hours</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSleepHours(Math.min(24, sleepHours + 0.5))}
                                className="w-12 h-12 rounded-full bg-surface-elevated flex items-center justify-center text-2xl hover:bg-primary/10 transition-colors"
                            >
                                +
                            </button>
                        </div>
                    </CardContent>
                </Card>

                {/* Symptoms */}
                <Card variant="elevated">
                    <CardHeader>
                        <CardTitle className="text-lg">Additional Symptoms</CardTitle>
                        <CardDescription>Select any other symptoms you&apos;re experiencing</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {SYMPTOM_OPTIONS.map((symptom) => (
                                <button
                                    key={symptom}
                                    type="button"
                                    onClick={() => toggleSymptom(symptom)}
                                    className={`px-4 py-2 rounded-full text-sm transition-all ${symptoms.includes(symptom)
                                        ? 'bg-primary text-white'
                                        : 'bg-surface-elevated text-text-secondary hover:bg-primary/10'
                                        }`}
                                >
                                    {symptom}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Notes */}
                <Card variant="elevated">
                    <CardHeader>
                        <CardTitle className="text-lg">Notes</CardTitle>
                        <CardDescription>Any additional notes for today (optional)</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="How are you feeling? Any specific observations..."
                            rows={4}
                        />
                    </CardContent>
                </Card>

                {/* Submit Button */}
                <Button
                    type="submit"
                    fullWidth
                    size="lg"
                    isLoading={loading}
                    leftIcon={<Save size={20} />}
                >
                    Save Log
                </Button>
            </form>
        </div>
    );
}
