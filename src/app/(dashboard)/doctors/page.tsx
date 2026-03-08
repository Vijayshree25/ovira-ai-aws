'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
    Users, Star, MapPin, Calendar, Clock,
    ArrowRight, Check, Loader2, Sparkles,
    ChevronRight, ExternalLink, Filter, Search
} from 'lucide-react';

const DEMO_DOCTORS = [
    {
        doctorId: "dr-001", name: "Dr. Meera Nair",
        specialty: "Gynaecologist and Obstetrician",
        hospital: "Apollo Hospitals, Bannerghatta Road", city: "Bangalore",
        experience: "18 years", languages: ["English", "Hindi", "Malayalam"],
        consultationFee: "Rs 800", rating: 4.8, reviews: 312,
        focusAreas: ["PCOS", "Endometriosis", "Irregular Cycles", "Fertility"],
        address: "154/11, Bannerghatta Main Rd, Bangalore 560076",
        mapsUrl: "https://maps.google.com/?q=Apollo+Hospitals+Bannerghatta+Bangalore",
        slots: [
            { date: "Tomorrow", time: "10:00 AM", available: true },
            { date: "Tomorrow", time: "11:30 AM", available: true },
            { date: "Tomorrow", time: "2:00 PM", available: false },
            { date: "Day after", time: "9:00 AM", available: true },
        ]
    },
    {
        doctorId: "dr-002", name: "Dr. Priya Subramanian",
        specialty: "Reproductive Endocrinologist",
        hospital: "Manipal Hospital, Whitefield", city: "Bangalore",
        experience: "12 years", languages: ["English", "Tamil", "Kannada"],
        consultationFee: "Rs 1,200", rating: 4.9, reviews: 189,
        focusAreas: ["PCOS", "Hormonal Imbalance", "Thyroid"],
        address: "ITPL Main Rd, Whitefield, Bangalore 560066",
        mapsUrl: "https://maps.google.com/?q=Manipal+Hospital+Whitefield",
        slots: [{ date: "Day after", time: "9:00 AM", available: true }]
    },
    {
        doctorId: "dr-003", name: "Dr. Anjali Sharma",
        specialty: "Gynaecologist", hospital: "Max Healthcare, Saket", city: "Delhi",
        experience: "15 years", languages: ["English", "Hindi"],
        consultationFee: "Rs 700", rating: 4.7, reviews: 245,
        focusAreas: ["PMS", "Heavy Bleeding", "Endometriosis"],
        address: "1, 2, Press Enclave Marg, Saket, Delhi 110017",
        mapsUrl: "https://maps.google.com/?q=Max+Healthcare+Saket",
        slots: [{ date: "Tomorrow", time: "3:00 PM", available: true }]
    }
];

const CITIES = ['All', 'Bangalore', 'Delhi', 'Mumbai', 'Chennai'];
const FOCUS_AREAS = ['All', 'PCOS', 'Fertility', 'Endometriosis', 'PMS', 'Thyroid'];

export default function DoctorsDiscoveryPage() {
    const { user, userProfile } = useAuth();
    const router = useRouter();
    const [selectedCity, setSelectedCity] = useState('Bangalore');
    const [selectedFocus, setSelectedFocus] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [bookingDoctor, setBookingDoctor] = useState<any>(null);
    const [selectedSlot, setSelectedSlot] = useState<any>(null);
    const [isBooking, setIsBooking] = useState(false);
    const [bookingStage, setBookingStage] = useState<'picker' | 'confirming' | 'confirmed'>('picker');
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const filteredDoctors = DEMO_DOCTORS.filter(doc => {
        const matchesCity = selectedCity === 'All' || doc.city === selectedCity;
        const matchesFocus = selectedFocus === 'All' || doc.focusAreas.includes(selectedFocus);
        const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.specialty.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCity && matchesFocus && matchesSearch;
    });

    const handleBookClick = (doctor: any) => {
        if (!userProfile?.isPremium) {
            setShowUpgradeModal(true);
            return;
        }
        setBookingDoctor(doctor);
        setBookingStage('picker');
        setSelectedSlot(null);
    };

    const handleConfirmBooking = async () => {
        if (!selectedSlot || !user) return;

        setIsBooking(true);
        setBookingStage('confirming');

        try {
            // 1. Book the appointment
            const res = await fetch('/api/doctors/book', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.username,
                    doctorId: bookingDoctor.doctorId,
                    doctorName: bookingDoctor.name,
                    hospital: bookingDoctor.hospital,
                    address: bookingDoctor.address,
                    mapsUrl: bookingDoctor.mapsUrl,
                    date: selectedSlot.date,
                    time: selectedSlot.time
                })
            });
            const data = await res.json();

            if (data.success) {
                // 2. Start summary generation (fire and forget handled by API mostly, but we trigger it)
                fetch('/api/appointments/generate-summary', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.username,
                        appointmentId: data.appointmentId
                    })
                });

                setBookingStage('confirmed');
                // Auto-poll or redirect handled in the UI
                setTimeout(() => {
                    router.push(`/appointments/${data.appointmentId}`);
                }, 3000);
            }
        } catch (err) {
            console.error('Booking failed:', err);
            setBookingStage('picker');
        } finally {
            setIsBooking(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2">Find a Women Health Specialist</h1>
                <p className="text-text-secondary max-w-2xl">
                    Book your appointment. We automatically prepare your complete health summary
                    so your doctor walks in already knowing your history.
                </p>
            </div>

            {/* Filters */}
            <div className="grid lg:grid-cols-4 gap-6 mb-8">
                <div className="lg:col-span-1 space-y-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={18} />
                            <Input
                                placeholder="Doctor name or specialty..."
                                className="pl-10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                            <MapPin size={16} /> City
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {CITIES.map(city => (
                                <button
                                    key={city}
                                    onClick={() => setSelectedCity(city)}
                                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${selectedCity === city
                                            ? 'bg-primary text-white border-primary shadow-sm'
                                            : 'bg-surface border-border text-text-secondary hover:border-primary/30'
                                        }`}
                                >
                                    {city}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                            <Filter size={16} /> Focus Area
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {FOCUS_AREAS.map(area => (
                                <button
                                    key={area}
                                    onClick={() => setSelectedFocus(area)}
                                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${selectedFocus === area
                                            ? 'bg-accent text-white border-accent shadow-sm'
                                            : 'bg-surface border-border text-text-secondary hover:border-accent/30'
                                        }`}
                                >
                                    {area}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Doctor List */}
                <div className="lg:col-span-3 space-y-4">
                    {filteredDoctors.length > 0 ? (
                        filteredDoctors.map(doctor => (
                            <Card key={doctor.doctorId} className="overflow-hidden hover:shadow-md transition-shadow">
                                <CardContent className="p-0">
                                    <div className="p-6 md:flex gap-6">
                                        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 mb-4 md:mb-0">
                                            <Users size={32} className="text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="md:flex justify-between items-start mb-2">
                                                <div>
                                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                                        {doctor.name}
                                                        <span className="flex items-center gap-1 text-sm bg-yellow-400/10 text-yellow-600 px-2 py-0.5 rounded-full font-medium">
                                                            <Star size={14} fill="currentColor" /> {doctor.rating}
                                                        </span>
                                                    </h3>
                                                    <p className="text-primary font-medium">{doctor.specialty}</p>
                                                </div>
                                                <div className="text-right mt-2 md:mt-0">
                                                    <p className="text-lg font-bold text-text-primary">{doctor.consultationFee}</p>
                                                    <p className="text-xs text-text-muted">Consultation Fee</p>
                                                </div>
                                            </div>

                                            <p className="text-text-secondary text-sm flex items-center gap-1 mb-4">
                                                <MapPin size={14} className="text-text-muted" /> {doctor.hospital}, {doctor.city}
                                            </p>

                                            <div className="flex flex-wrap gap-1.5 mb-4">
                                                {doctor.focusAreas.map(area => (
                                                    <span key={area} className="px-2 py-0.5 bg-accent/5 text-accent text-[11px] font-bold rounded-md border border-accent/10">
                                                        {area}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-xs text-text-muted mb-6">
                                                <div className="flex items-center gap-2">
                                                    <Clock size={14} /> {doctor.experience} experience
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Loader2 size={14} className="text-green-500" /> {doctor.reviews} happy patients
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <Button
                                                    variant="primary"
                                                    className="flex-1 rounded-xl shadow-button py-2.5 h-auto text-sm"
                                                    onClick={() => handleBookClick(doctor)}
                                                >
                                                    Book Appointment
                                                    <ChevronRight size={16} className="ml-1" />
                                                </Button>
                                                <Button
                                                    variant="secondary"
                                                    className="flex-1 rounded-xl py-2.5 h-auto text-sm"
                                                >
                                                    View Profile
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <div className="bg-surface border border-dashed border-border rounded-2xl p-12 text-center">
                            <Users size={48} className="mx-auto text-text-muted mb-4 opacity-20" />
                            <h3 className="text-lg font-medium text-text-secondary">No doctors found</h3>
                            <p className="text-text-muted">Try adjusting your filters or search query.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Upgrade Modal */}
            {showUpgradeModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-surface rounded-3xl p-8 max-w-md w-full shadow-2xl scale-in-center">
                        <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                            <Sparkles size={32} className="text-accent" />
                        </div>
                        <h2 className="text-2xl font-bold text-center mb-2">Book with Confidence</h2>
                        <p className="text-text-secondary text-center mb-6">
                            Doctor booking and AI-generated health summaries are exclusive to <strong>Ovira Pro</strong>.
                        </p>
                        <div className="space-y-4 mb-8">
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-5 h-5 bg-green-500/20 text-green-600 rounded-full flex items-center justify-center shrink-0">
                                    <Check size={12} strokeWidth={4} />
                                </div>
                                Prepare doctors with your 12-month summary
                            </div>
                            <div className="flex items-center gap-3 text-sm">
                                <div className="w-5 h-5 bg-green-500/20 text-green-600 rounded-full flex items-center justify-center shrink-0">
                                    <Check size={12} strokeWidth={4} />
                                </div>
                                One-click secure health record sharing
                            </div>
                        </div>
                        <div className="flex flex-col gap-3">
                            <Button variant="primary" className="rounded-2xl py-4 h-auto text-base font-bold shadow-accent">
                                Upgrade to Pro
                            </Button>
                            <Button
                                variant="secondary"
                                className="rounded-2xl py-4 h-auto text-base"
                                onClick={() => setShowUpgradeModal(false)}
                            >
                                Not now
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Booking Modal */}
            {bookingDoctor && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-surface rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h2 className="text-xl font-bold">
                                {bookingStage === 'confirmed' ? 'Successfully Booked' : `Book with ${bookingDoctor.name}`}
                            </h2>
                            <button
                                onClick={() => !isBooking && setBookingDoctor(null)}
                                className="p-2 hover:bg-surface-elevated rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            {bookingStage === 'picker' && (
                                <>
                                    <div className="flex items-center gap-4 mb-8 p-4 bg-surface-elevated rounded-2xl">
                                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                                            <Users size={24} className="text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-bold">{bookingDoctor.name}</p>
                                            <p className="text-sm text-text-secondary">{bookingDoctor.hospital}</p>
                                        </div>
                                    </div>

                                    <h3 className="font-bold mb-4 flex items-center gap-2">
                                        <Calendar size={18} className="text-primary" /> Select Available Slot
                                    </h3>

                                    <div className="space-y-6 mb-8">
                                        {['Tomorrow', 'Day after'].map(day => (
                                            <div key={day}>
                                                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3">{day}</p>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {bookingDoctor.slots
                                                        .filter((s: any) => s.date === day)
                                                        .map((slot: any, idx: number) => (
                                                            <button
                                                                key={idx}
                                                                disabled={!slot.available}
                                                                onClick={() => setSelectedSlot(slot)}
                                                                className={`p-3 rounded-2xl border text-sm transition-all text-center ${selectedSlot === slot
                                                                        ? 'bg-primary border-primary text-white shadow-md'
                                                                        : slot.available
                                                                            ? 'bg-surface border-border hover:border-primary/50 text-text-primary'
                                                                            : 'bg-surface-elevated border-border text-text-muted cursor-not-allowed opacity-50'
                                                                    }`}
                                                            >
                                                                {slot.time}
                                                            </button>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <Button
                                        variant="primary"
                                        className="w-full rounded-2xl py-4 h-auto text-base font-bold shadow-button"
                                        disabled={!selectedSlot}
                                        onClick={handleConfirmBooking}
                                    >
                                        Confirm Booking
                                    </Button>
                                </>
                            )}

                            {bookingStage === 'confirming' && (
                                <div className="py-12 text-center">
                                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-6" />
                                    <h3 className="text-xl font-bold mb-2">Securing your slot...</h3>
                                    <p className="text-text-secondary">We're confirming your appointment with {bookingDoctor.name}.</p>
                                </div>
                            )}

                            {bookingStage === 'confirmed' && (
                                <div className="text-center py-6">
                                    <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-500/20">
                                        <Check size={40} strokeWidth={3} />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-1">Appointment Confirmed!</h3>
                                    <p className="text-text-secondary mb-6">{bookingDoctor.name}, {bookingDoctor.hospital}</p>

                                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 mb-8 text-left inline-block w-full max-w-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={16} className="text-primary" />
                                                <span className="text-sm font-medium">{selectedSlot?.date}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-right">
                                                <Clock size={16} className="text-primary" />
                                                <span className="text-sm font-medium">{selectedSlot?.time}</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <MapPin size={16} className="text-primary shrink-0" />
                                            <p className="text-xs text-text-secondary line-clamp-2">{bookingDoctor.address}</p>
                                            <a
                                                href={bookingDoctor.mapsUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="ml-auto p-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-all text-primary"
                                            >
                                                <ExternalLink size={16} />
                                            </a>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-center gap-2 text-primary font-medium">
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Your health summary is being prepared...</span>
                                        </div>
                                        <p className="text-xs text-text-muted italic">Prepared from your Ovira tracking data (Last 12 months)</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function X({ size }: { size: number }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
        </svg>
    );
}
