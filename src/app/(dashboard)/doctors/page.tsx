'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DEMO_DOCTORS, Doctor, TimeSlot } from '@/lib/constants/doctors';
import {
    MapPin,
    Calendar,
    Clock,
    Star,
    Users,
    Award,
    ArrowRight,
    CheckCircle2,
    Loader2,
    CalendarDays,
    X,
} from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';

// ─── Filter Data ─────────────────────────────────────────────────────────────

const CITIES = ["All", "Bangalore", "Delhi"];
const SPECIALTIES = ["All", "PCOS", "Endometriosis", "Irregular Cycles", "Fertility", "Thyroid"];

// ─── Components ───────────────────────────────────────────────────────────────

export default function DoctorsPage() {
    const { user, userProfile } = useAuth();
    const [selectedCity, setSelectedCity] = useState("All");
    const [selectedSpecialty, setSelectedSpecialty] = useState("All");
    const [isPremium, setIsPremium] = useState(false);

    // Modal States
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [isBookingLoading, setIsBookingLoading] = useState(false);
    const [bookingResult, setBookingResult] = useState<{ appointmentId: string; summaryGenerated: boolean } | null>(null);
    const [summaryContent, setSummaryContent] = useState<string | null>(null);

    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    useEffect(() => {
        if (userProfile?.isPremium) {
            setIsPremium(true);
        }
    }, [userProfile]);

    // Polling for summary status
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (bookingResult && !bookingResult.summaryGenerated) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/appointments/${bookingResult.appointmentId}/status`);
                    const data = await res.json();
                    if (data.success && data.summaryGenerated) {
                        setBookingResult(prev => prev ? { ...prev, summaryGenerated: true } : null);
                        setSummaryContent(data.summaryContent);
                        clearInterval(interval);
                    }
                } catch (err) {
                    console.error('Polling error:', err);
                }
            }, 3000);
        }

        return () => clearInterval(interval);
    }, [bookingResult]);

    // Filters logic
    const filteredDoctors = DEMO_DOCTORS.filter(dr => {
        const cityMatch = selectedCity === "All" || dr.city === selectedCity;
        const specialtyMatch = selectedSpecialty === "All" || dr.specialisation.includes(selectedSpecialty);
        return cityMatch && specialtyMatch;
    });

    const handleBookClick = (doctor: Doctor) => {
        if (!isPremium) {
            setIsUpgradeModalOpen(true);
            return;
        }
        setSelectedDoctor(doctor);
        setSelectedSlot(null);
        setIsBookingModalOpen(true);
    };

    const confirmBooking = async () => {
        if (!selectedDoctor || !selectedSlot || !user) return;

        setIsBookingLoading(true);
        try {
            const res = await fetch('/api/doctors/book', {
                method: 'POST',
                body: JSON.stringify({
                    userId: user.username || user.email,
                    doctorId: selectedDoctor.doctorId,
                    date: selectedSlot.date,
                    time: selectedSlot.time,
                }),
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();

            if (data.success) {
                setBookingResult({
                    appointmentId: data.appointmentId,
                    summaryGenerated: false
                });
            }
        } catch (err) {
            console.error('Booking failed:', err);
        } finally {
            setIsBookingLoading(false);
        }
    };

    const getCalendarUrl = () => {
        if (!selectedDoctor || !selectedSlot) return '#';
        const date = selectedSlot.date === "Today" ? new Date().toISOString().split('T')[0] : new Date(Date.now() + 86400000).toISOString().split('T')[0];
        const time = selectedSlot.time.replace(':', '').replace(' ', '');
        const title = encodeURIComponent(`Appointment with ${selectedDoctor.name}`);
        const details = encodeURIComponent(`${selectedDoctor.hospital}, ${selectedDoctor.city}`);
        // Simple Google Calendar link (just for demo purposes)
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}`;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-text-primary">Find a Women's Health Specialist</h1>
                <p className="text-text-secondary">Book an appointment and send your health summary &mdash; all in one place</p>
            </div>

            {/* Filters */}
            <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-medium text-text-muted self-center mr-2">City:</span>
                    {CITIES.map(city => (
                        <button
                            key={city}
                            onClick={() => setSelectedCity(city)}
                            className={clsx(
                                "px-4 py-1.5 rounded-full text-sm transition-all border",
                                selectedCity === city
                                    ? "bg-primary border-primary text-white"
                                    : "bg-surface border-border text-text-secondary hover:border-primary/50"
                            )}
                        >
                            {city}
                        </button>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2">
                    <span className="text-sm font-medium text-text-muted self-center mr-2">Specialty:</span>
                    {SPECIALTIES.map(spec => (
                        <button
                            key={spec}
                            onClick={() => setSelectedSpecialty(spec)}
                            className={clsx(
                                "px-4 py-1.5 rounded-full text-sm transition-all border",
                                selectedSpecialty === spec
                                    ? "bg-accent border-accent text-white"
                                    : "bg-surface border-border text-text-secondary hover:border-accent/50"
                            )}
                        >
                            {spec}
                        </button>
                    ))}
                </div>
            </div>

            {/* Doctors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDoctors.map(doctor => (
                    <Card key={doctor.doctorId} className="p-0 overflow-hidden group hover:shadow-xl transition-all duration-300 border-border/50">
                        <div className="p-6 space-y-4">
                            {/* Doctor Header */}
                            <div className="flex justify-between items-start">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                        {doctor.name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-text-primary group-hover:text-primary transition-colors">{doctor.name}</h3>
                                        <div className="flex items-center gap-1 text-xs text-text-secondary">
                                            <Star size={14} className="text-yellow-500 fill-yellow-500" />
                                            <span className="font-bold text-text-primary">{doctor.rating}</span>
                                            <span>({doctor.reviews} reviews)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="space-y-2 text-sm">
                                <p className="text-primary font-medium">{doctor.specialty}</p>
                                <div className="flex items-center gap-2 text-text-secondary">
                                    <MapPin size={16} />
                                    <span>{doctor.hospital}, {doctor.city}</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {doctor.specialisation.slice(0, 3).map(s => (
                                        <span key={s} className="bg-surface-elevated px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-bold text-text-muted border border-border/50">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-text-secondary mt-1">
                                    <span className="font-medium text-text-primary">{doctor.languages.join(', ')}</span> &bull; {doctor.experience} experience
                                </p>
                            </div>

                            <div className="pt-4 border-t border-border/50 flex flex-col gap-3">
                                <div className="flex justify-between items-center text-sm">
                                    <div className="flex items-center gap-2 text-green-600 font-medium">
                                        <Clock size={16} />
                                        <span>Next slot: {doctor.slots.find(s => s.available)?.date} {doctor.slots.find(s => s.available)?.time}</span>
                                    </div>
                                    <div className="font-bold text-text-primary">{doctor.consultationFee}</div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button variant="secondary" size="sm" onClick={() => handleBookClick(doctor)}>View Slots</Button>
                                    <Button size="sm" onClick={() => handleBookClick(doctor)}>Book now</Button>
                                </div>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Booking Modal */}
            {isBookingModalOpen && selectedDoctor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { if (!bookingResult) setIsBookingModalOpen(false); }} />
                    <Card className="relative w-full max-w-lg overflow-hidden bg-surface animate-in fade-in zoom-in duration-200">
                        {bookingResult ? (
                            <div className="p-8 text-center space-y-6">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                                    <CheckCircle2 size={32} />
                                </div>
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-text-primary">Appointment Confirmed!</h2>
                                    <p className="text-text-secondary font-medium">{selectedDoctor.name} &bull; {selectedDoctor.hospital}</p>
                                    <p className="text-primary font-bold">{selectedSlot?.date}, {selectedSlot?.time}</p>
                                    <p className="text-xs text-text-muted">{selectedDoctor.city}</p>
                                </div>

                                <div className="bg-surface-elevated rounded-2xl p-6 border border-border/50">
                                    {!bookingResult.summaryGenerated ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <Loader2 className="animate-spin text-primary" size={32} />
                                            <p className="text-sm font-medium text-text-primary">Ovira is preparing your health summary for {selectedDoctor.name.split(' ')[0]}...</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 text-green-600 justify-center">
                                                <CheckCircle2 size={24} />
                                                <span className="font-bold">Health Summary Ready</span>
                                            </div>
                                            <div className="text-left bg-white p-4 rounded-xl text-xs text-text-secondary line-clamp-3 italic ring-1 ring-border/50">
                                                "{summaryContent}"
                                            </div>
                                            <div className="flex flex-col gap-2 pt-2">
                                                <Link href={`/appointments/${bookingResult.appointmentId}/summary`} className="w-full">
                                                    <Button className="w-full">
                                                        View My Summary
                                                    </Button>
                                                </Link>
                                                <Button
                                                    variant="secondary"
                                                    className="w-full"
                                                    onClick={async () => {
                                                        const res = await fetch('/api/appointments/send-summary', {
                                                            method: 'POST',
                                                            body: JSON.stringify({ appointmentId: bookingResult.appointmentId }),
                                                            headers: { 'Content-Type': 'application/json' }
                                                        });
                                                        const data = await res.json();
                                                        if (data.success) {
                                                            alert(`Summary sent to Dr. ${selectedDoctor.name.split(' ')[1] || selectedDoctor.name}!`);
                                                        }
                                                    }}
                                                >
                                                    Send to {selectedDoctor.name.split(' ')[0]}
                                                </Button>
                                                <a href={getCalendarUrl()} target="_blank" rel="noopener noreferrer" className="w-full">
                                                    <Button variant="outline" className="w-full flex gap-2">
                                                        <CalendarDays size={18} />
                                                        Add to Calendar
                                                    </Button>
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {!bookingResult.summaryGenerated && (
                                    <Button variant="ghost" onClick={() => setIsBookingModalOpen(false)}>Close for now</Button>
                                )}
                            </div>
                        ) : (
                            <div className="p-0">
                                <div className="p-6 border-b border-border flex justify-between items-center">
                                    <h3 className="font-bold text-xl">Select Time Slot</h3>
                                    <button onClick={() => setIsBookingModalOpen(false)}><X size={20} /></button>
                                </div>
                                <div className="p-6 space-y-6">
                                    <div className="flex gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                                            {selectedDoctor.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <p className="font-bold text-text-primary">{selectedDoctor.name}</p>
                                            <p className="text-xs text-text-secondary">{selectedDoctor.specialty}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-sm font-bold text-text-primary uppercase tracking-wider">Available Slots</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {selectedDoctor.slots.map((slot, i) => (
                                                <button
                                                    key={i}
                                                    disabled={!slot.available}
                                                    onClick={() => setSelectedSlot(slot)}
                                                    className={clsx(
                                                        "p-3 rounded-xl border text-sm transition-all flex flex-col items-center gap-1",
                                                        !slot.available ? "bg-surface-elevated border-border text-text-muted cursor-not-allowed" :
                                                            selectedSlot === slot ? "bg-primary/5 border-primary text-primary ring-2 ring-primary/20" :
                                                                "bg-surface border-border text-text-secondary hover:border-primary/50"
                                                    )}
                                                >
                                                    <span className="font-bold">{slot.time}</span>
                                                    <span className="text-[10px] opacity-70">{slot.date}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-6 space-y-4">
                                        <Button
                                            className="w-full"
                                            disabled={!selectedSlot || isBookingLoading}
                                            onClick={confirmBooking}
                                        >
                                            {isBookingLoading ? <Loader2 className="animate-spin" /> : "Confirm Booking"}
                                        </Button>
                                        <p className="text-[10px] text-center text-text-muted italic">
                                            After booking, Ovira will prepare your health summary for {selectedDoctor.name.split(' ')[0]}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* Upgrade Modal */}
            {isUpgradeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsUpgradeModalOpen(false)} />
                    <Card className="relative w-full max-w-md p-8 text-center space-y-6 bg-surface animate-in fade-in slide-in-from-bottom-4">
                        <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto text-accent">
                            <Award size={32} />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-text-primary text-balance text-left">Unlock Specialist Bookings with Ovira PRO</h2>
                            <p className="text-text-secondary text-sm text-left">
                                Get direct access to India's top women's health specialists and automatic health summary preparation.
                            </p>
                        </div>
                        <div className="space-y-4 pt-4">
                            <Button className="w-full bg-accent hover:bg-accent/90">Upgrade to PRO &mdash; Rs. 499/mo</Button>
                            <Button variant="ghost" className="w-full" onClick={() => setIsUpgradeModalOpen(false)}>Not now</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
