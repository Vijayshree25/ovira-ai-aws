'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Appointment } from '@/types';
import {
    Calendar,
    Clock,
    MapPin,
    ChevronRight,
    CheckCircle,
    Send,
    Loader2,
    CalendarOff
} from 'lucide-react';
import Link from 'next/link';

export default function AppointmentsPage() {
    const { user } = useAuth();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetch_ = async () => {
            try {
                const res = await fetch(`/api/appointments?userId=${user.username}`);
                const data = await res.json();
                if (data.success) setAppointments(data.appointments || []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetch_();
    }, [user]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">My Appointments</h1>
                    <p className="text-text-secondary text-sm mt-1">
                        View and manage your scheduled consultations
                    </p>
                </div>
                <Link href="/doctors">
                    <Button leftIcon={<Calendar size={18} />}>
                        Book a Doctor
                    </Button>
                </Link>
            </div>

            {appointments.length === 0 ? (
                <Card variant="outlined" className="border-dashed">
                    <CardContent className="flex flex-col items-center py-20 text-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-surface-elevated flex items-center justify-center">
                            <CalendarOff className="text-text-muted" size={32} />
                        </div>
                        <div>
                            <p className="font-semibold text-lg">No appointments scheduled</p>
                            <p className="text-text-secondary text-sm mt-1">
                                Book a consultation with a specialist and your AI health summary will be prepared automatically.
                            </p>
                        </div>
                        <Link href="/doctors">
                            <Button>Find a Specialist</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {appointments.map((appt) => (
                        <Card key={appt.appointmentId} variant="elevated" hover>
                            <CardContent className="p-5">
                                <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                                    <div className="flex gap-4 items-start">
                                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <Calendar className="text-primary" size={22} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-base">{appt.doctorName}</h3>
                                            <p className="text-text-secondary text-sm">{appt.hospital}</p>
                                            <div className="flex flex-wrap gap-3 mt-2 text-xs text-text-muted">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} /> {appt.date} at {appt.time}
                                                </span>
                                                {appt.address && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin size={12} /> {appt.address}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        {appt.healthSummarySent ? (
                                            <div className="flex items-center gap-2 text-success font-semibold text-sm bg-success/10 px-3 py-1.5 rounded-full">
                                                <CheckCircle size={14} />
                                                Summary Sent
                                            </div>
                                        ) : appt.healthSummaryGenerated ? (
                                            <div className="flex items-center gap-2 text-warning font-semibold text-sm bg-warning/10 px-3 py-1.5 rounded-full">
                                                <Send size={14} />
                                                Ready to Send
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-text-muted text-sm bg-surface-elevated px-3 py-1.5 rounded-full">
                                                <Loader2 size={14} className="animate-spin" />
                                                Preparing Summary
                                            </div>
                                        )}
                                        <Link href={`/appointments/${appt.appointmentId}`}>
                                            <Button variant="outline" size="sm" rightIcon={<ChevronRight size={14} />}>
                                                View
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
