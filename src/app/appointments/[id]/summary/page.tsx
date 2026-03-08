'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DEMO_DOCTORS } from '@/lib/constants/doctors';
import {
    Printer,
    Send,
    ArrowLeft,
    CheckCircle2,
    FileText,
    Loader2,
    Download,
    MailCheck,
    Clock
} from 'lucide-react';
import Link from 'next/link';

export default function AppointmentSummaryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [appointment, setAppointment] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [sentStatus, setSentStatus] = useState<string | null>(null);

    useEffect(() => {
        fetchAppointment();
    }, [id]);

    const fetchAppointment = async () => {
        try {
            const res = await fetch(`/api/appointments/${id}/status`);
            const data = await res.json();
            if (data.success) {
                // Fetch the full appointment details from another endpoint if needed, 
                // but status API returns status and summary
                // For a more complete demo, we'll fetch logs from status API 
                // and compute doctor name from constant
                setAppointment(data);
            }
        } catch (err) {
            console.error('Failed to fetch appointment:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendToDoctor = async () => {
        setSending(true);
        try {
            const res = await fetch('/api/appointments/send-summary', {
                method: 'POST',
                body: JSON.stringify({ appointmentId: id }),
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await res.json();
            if (data.success) {
                setSentStatus(`Sent on ${new Date().toLocaleDateString()}`);
                setAppointment((prev: any) => prev ? { ...prev, summarySent: true } : prev);
            }
        } catch (err) {
            console.error('Failed to send summary:', err);
        } finally {
            setSending(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-primary" size={40} />
                    <p className="text-text-secondary font-medium">Loading your health summary...</p>
                </div>
            </div>
        );
    }

    if (!appointment || !appointment.summaryContent) {
        return (
            <div className="min-h-screen p-8 bg-background flex flex-col items-center justify-center">
                <div className="text-center space-y-4">
                    <h1 className="text-2xl font-bold text-text-primary">Summary Not Found</h1>
                    <p className="text-text-secondary">We couldn't find the health summary for this appointment.</p>
                    <Button onClick={() => router.back()}>Go Back</Button>
                </div>
            </div>
        );
    }

    // Basic parsing for display
    const sections = appointment.summaryContent.split('\n\n').map((section: string) => {
        const lines = section.split('\n');
        return {
            title: lines[0].replace(/^\d+\.\s*/, ''),
            content: lines.slice(1).join('\n')
        };
    });

    return (
        <div className="min-h-screen bg-surface-elevated pb-20 print:bg-white print:pb-0">
            {/* Nav Header */}
            <header className="sticky top-0 z-30 bg-white border-b border-border px-6 py-4 flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-surface-elevated rounded-full transition-colors text-text-secondary"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-bold text-text-primary">Appointment Summary</h1>
                        <p className="text-xs text-text-muted">Ref: {id.slice(0, 8)}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="flex gap-2">
                        <Printer size={16} />
                        <span className="hidden sm:inline">Print / PDF</span>
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSendToDoctor}
                        disabled={appointment.summarySent || sending}
                        className={appointment.summarySent ? "bg-green-600 hover:bg-green-600" : "bg-primary"}
                    >
                        {sending ? <Loader2 className="animate-spin mr-2" size={16} /> :
                            appointment.summarySent ? <MailCheck className="mr-2" size={16} /> :
                                <Send className="mr-2" size={16} />}
                        {appointment.summarySent ? "Sent to Doctor" : "Send to Doctor"}
                    </Button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-6 space-y-8 print:p-0">
                {/* Status Alert for Sent */}
                {appointment.summarySent && (
                    <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 text-green-700 print:hidden animate-in fade-in slide-in-from-top-2">
                        <CheckCircle2 size={24} />
                        <span className="font-medium">Summary successfully shared with your specialist on {new Date().toLocaleDateString()}.</span>
                    </div>
                )}

                <Card className="p-0 border-border/50 shadow-xl overflow-hidden print:shadow-none print:border-none">
                    {/* Visual Header */}
                    <div className="bg-primary/5 p-8 border-b border-border/50 flex flex-col sm:flex-row justify-between items-start gap-6">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-primary font-bold tracking-tight uppercase text-xs">
                                <FileText size={16} />
                                <span>Self-Reported Health Summary</span>
                            </div>
                            <h2 className="text-2xl font-bold text-text-primary">Pre-Appointment Brief</h2>
                            <p className="text-text-secondary max-w-md">
                                This summary contains pattern observations from your tracked data to help make your appointment more productive.
                            </p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-border/50 shadow-sm space-y-2 min-w-[200px]">
                            <div className="flex items-center gap-2 text-xs text-text-muted">
                                <Clock size={14} />
                                <span>Generated {new Date(appointment.summaryGeneratedAt || Date.now()).toLocaleDateString()}</span>
                            </div>
                            <div className="h-px bg-border/50" />
                            <p className="text-sm font-bold text-text-primary">Confidential Patient Data</p>
                            <p className="text-[10px] text-text-muted leading-relaxed">
                                Not a medical assessment. Please verify all details with your specialist.
                            </p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-8 space-y-10 bg-white">
                        {sections.map((section: any, idx: number) => (
                            <div key={idx} className="space-y-4 group">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-primary rounded-full group-hover:scale-y-125 transition-transform origin-center" />
                                    <h3 className="font-bold text-lg text-text-primary uppercase tracking-wide text-sm">{section.title}</h3>
                                </div>
                                <div className="pl-4.5 text-text-secondary leading-relaxed space-y-2 white-space-pre-wrap">
                                    {section.content.split('\n').map((line: string, i: number) => (
                                        <p key={i} className={line.startsWith('-') ? "pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-primary" : ""}>
                                            {line.startsWith('-') ? line.substring(1).trim() : line}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Disclaimer Footer */}
                    <div className="p-8 bg-surface-elevated border-t border-border/50">
                        <p className="text-[11px] text-text-muted leading-relaxed italic text-center">
                            This summary was generated from self-reported tracking data in the Ovira app.
                            All observations are pattern-based and are not a medical assessment.
                            Please verify all information directly with your patient.
                            Generated by Ovira AI — Specialized Women's Health Support.
                        </p>
                    </div>
                </Card>

                {/* Print Only Footer */}
                <div className="hidden print:block text-center pt-10 border-t border-gray-200 mt-20">
                    <p className="text-sm font-bold text-gray-500">Provided by Ovira AI</p>
                    <p className="text-xs text-gray-400">www.ovira.ai</p>
                </div>
            </main>

            {/* Floating Action for Mobile */}
            {!appointment.summarySent && !sending && (
                <div className="fixed bottom-6 left-6 right-6 sm:hidden print:hidden animate-in slide-in-from-bottom-6">
                    <Button className="w-full h-14 rounded-2xl shadow-2xl bg-primary text-lg font-bold flex gap-3" onClick={handleSendToDoctor}>
                        <Send size={20} />
                        Send to Doctor
                    </Button>
                </div>
            )}
        </div>
    );
}
