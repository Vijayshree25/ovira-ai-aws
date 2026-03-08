'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
    Users, MapPin, Calendar, Clock,
    ExternalLink, Check, Loader2,
    ArrowLeft, Shield, FileText,
    AlertCircle, Send, ChevronRight
} from 'lucide-react';
import { Appointment } from '@/types';

export default function AppointmentDetailPage() {
    const { appointmentId } = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    useEffect(() => {
        const fetchAppointment = async () => {
            if (!user || !appointmentId) return;
            try {
                const res = await fetch(`/api/appointments/${appointmentId}?userId=${user.username}`);
                const data = await res.json();
                if (data.success) {
                    setAppointment(data.appointment);

                    // Poll if summary not generated yet
                    if (!data.appointment.healthSummaryGenerated) {
                        setTimeout(fetchAppointment, 3000);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch appointment:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchAppointment();
    }, [user, appointmentId]);

    const handleSendToDoctor = async () => {
        setSending(true);
        // Simulate sending to doctor
        setTimeout(async () => {
            try {
                // Update status in DB
                await fetch(`/api/doctors/book`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...appointment,
                        healthSummarySent: true
                    })
                });
                setSent(true);
            } catch (err) {
                console.error('Send failed:', err);
            } finally {
                setSending(false);
            }
        }, 1500);
    };

    if (loading && !appointment) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-text-secondary text-lg">Loading appointment details...</p>
            </div>
        );
    }

    if (!appointment) return <div>Appointment not found</div>;

    if (sent) {
        return (
            <div className="max-w-2xl mx-auto py-12 text-center animate-in zoom-in-95 duration-300">
                <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 border-8 border-green-500/5 shadow-inner">
                    <Check size={48} strokeWidth={3} />
                </div>
                <h1 className="text-3xl font-bold mb-2">Sent! {appointment.doctorName} is prepared for you.</h1>
                <p className="text-text-secondary text-lg mb-10 max-w-md mx-auto">
                    Your complete health summary has been securely shared with Dr. Nair's office.
                </p>

                <Card className="mb-10 text-left border-green-500/20 bg-green-500/5">
                    <CardContent className="p-6">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                <Users size={24} className="text-green-500" />
                            </div>
                            <div>
                                <p className="font-bold text-green-800">Health Summary Shared</p>
                                <p className="text-sm text-green-700/80">She will have everything before you walk in.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Button
                    variant="primary"
                    className="rounded-2xl px-12 py-4 h-auto text-lg font-bold shadow-button"
                    onClick={() => router.push('/dashboard')}
                >
                    Back to Dashboard
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-8 transition-colors group"
            >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Back
            </button>

            {/* SECTION 1 — Appointment bar */}
            <div className="bg-surface border border-border rounded-3xl p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center shrink-0">
                        <Users size={32} className="text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">{appointment.doctorName}</h1>
                        <p className="text-text-secondary flex items-center gap-1.5">
                            {appointment.hospital} <span className="opacity-30">•</span> {appointment.date} at {appointment.time}
                        </p>
                    </div>
                </div>
                <a
                    href={appointment.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-border rounded-2xl text-primary font-bold hover:shadow-md transition-all whitespace-nowrap"
                >
                    <MapPin size={18} /> Open in Maps
                </a>
            </div>

            <div className="grid md:grid-cols-5 gap-8">
                {/* SECTION 2 — Summary preview card */}
                <div className="md:col-span-3">
                    <Card className="rounded-[2rem] overflow-hidden border-border bg-gradient-to-b from-white to-surface">
                        <CardHeader className="p-8 border-b border-border bg-surface-elevated/50">
                            <div className="flex justify-between items-center mb-1">
                                <CardTitle className="text-2xl font-bold">Your Health Summary</CardTitle>
                                <div className="bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                    AI Prepared
                                </div>
                            </div>
                            <p className="text-text-secondary text-sm">
                                Prepared from your Ovira tracking data (Last 12 months). Self-reported patterns only.
                            </p>
                        </CardHeader>
                        <CardContent className="p-8 space-y-10">
                            {!appointment.healthSummaryGenerated ? (
                                <div className="py-20 text-center space-y-4">
                                    <div className="relative w-20 h-20 mx-auto">
                                        <div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <FileText size={28} className="text-primary opacity-50" />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold">Preparing your summary...</h3>
                                    <p className="text-text-secondary max-w-xs mx-auto">
                                        Our AI is analyzing your last 12 months of health records to provide Dr. Nair with clear insights.
                                    </p>
                                </div>
                            ) : (
                                <div className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-text-primary prose-p:text-text-secondary">
                                    {/* Render summaryText sections with styling */}
                                    {appointment.summaryText?.split('###').filter(Boolean).map((section, idx) => {
                                        const lines = section.trim().split('\n');
                                        const title = lines[0].trim();
                                        const content = lines.slice(1).join('\n').trim();

                                        return (
                                            <div key={idx} className="mb-8 last:mb-0">
                                                <h3 className="text-lg mb-3 flex items-center gap-2">
                                                    {title === 'About You' && <Shield size={18} className="text-primary" />}
                                                    {title === 'Cycle and Flow Patterns' && <Calendar size={18} className="text-primary" />}
                                                    {title === 'Flagged Concerns' && <AlertCircle size={18} className="text-accent" />}
                                                    {title === 'Diet and Lifestyle Context' && <Clock size={18} className="text-primary" />}
                                                    {title}
                                                </h3>
                                                <div className="bg-surface-elevated p-5 rounded-2xl border border-border/50 text-text-secondary leading-relaxed whitespace-pre-wrap">
                                                    {title === 'Flagged Concerns' ? (
                                                        <div className="space-y-3">
                                                            {content.split('\n').map((line, lidx) => {
                                                                const isMedium = line.includes('[MEDIUM]');
                                                                const isLow = line.includes('[LOW]');
                                                                const colorClass = isMedium ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                                    isLow ? 'bg-green-100 text-green-700 border-green-200' : '';

                                                                return (
                                                                    <div key={lidx} className={`p-3 rounded-xl border text-sm font-medium ${colorClass}`}>
                                                                        {line.replace('[MEDIUM] ', '').replace('[LOW] ', '')}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : content}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <div className="mt-12 p-4 bg-surface rounded-xl border border-dashed border-border text-[11px] text-text-muted text-center flex items-start gap-4 text-left">
                                        <Shield size={14} className="shrink-0 mt-0.5" />
                                        <p>
                                            This contains self-tracked data from Ovira AI. Not a medical assessment.
                                            All observations are for your doctor's evaluation only.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* SECTION 3 — THE ONE CLICK SEND */}
                <div className="md:col-span-2">
                    <div className="sticky top-8">
                        <Card className="rounded-[2rem] border-primary-500/30 border-2 bg-primary/5 shadow-xl shadow-primary/5">
                            <CardContent className="p-8">
                                <h3 className="text-2xl font-bold mb-2">Send to {appointment.doctorName}</h3>
                                <p className="text-text-secondary text-sm mb-8">
                                    Everything she needs to know will be shared securely.
                                </p>

                                <div className="space-y-4 mb-10">
                                    {[
                                        '12-month cycle and symptom patterns',
                                        'Flagged health concerns for evaluation',
                                        'Your uploaded documents',
                                        'Diet and lifestyle context',
                                        'Your questions for the appointment'
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center shrink-0">
                                                <Check size={14} strokeWidth={3} />
                                            </div>
                                            <span className="text-sm font-medium text-text-secondary">{item}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-6 bg-white rounded-2xl border border-primary/10 mb-8 border-dashed text-center">
                                    <p className="text-primary font-bold text-sm">Tagline: She will have everything before you walk in.</p>
                                </div>

                                <Button
                                    variant="primary"
                                    className="w-full rounded-2xl py-5 h-auto text-base font-bold shadow-button flex items-center justify-center gap-3 group"
                                    disabled={!appointment.healthSummaryGenerated || sending}
                                    onClick={handleSendToDoctor}
                                >
                                    {sending ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" />
                                            Sending Summary...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                            Send Health Summary
                                        </>
                                    )}
                                </Button>

                                <p className="text-center text-[10px] text-text-muted mt-4">
                                    By clicking you agree to share your tracking patterns with Dr. Nair.
                                </p>
                            </CardContent>
                        </Card>

                        <div className="mt-8 p-6 bg-surface border border-border rounded-2xl">
                            <h4 className="font-bold flex items-center gap-2 mb-2 text-sm">
                                <FileText size={16} className="text-text-muted" /> Quick Tip
                            </h4>
                            <p className="text-xs text-text-secondary leading-relaxed">
                                Sharing your summary ahead of time saves approx. <strong>15 minutes</strong> of basic history-taking during your physical consultation.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
