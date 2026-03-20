'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Logo } from '@/components/ui/Logo';
import {
    SUPPORTED_LANGUAGES,
    HEALTH_CONDITIONS,
    UserProfile,
    HealthDocument,
    Doctor
} from '@/types';
import {
    User,
    Shield,
    Download,
    Trash2,
    Save,
    AlertTriangle,
    Check,
    Calendar,
    FileText,
    Users,
    Sparkles,
    CreditCard,
    Plus,
    Upload,
    ExternalLink,
    ChevronRight,
    Loader2,
    Info,
    Clock,
    Lock,
    Globe
} from 'lucide-react';
import Link from 'next/link';

type TabType = 'profile' | 'documents' | 'cycle' | 'doctors' | 'ai' | 'privacy' | 'subscription';

const INDIAN_CITIES = [
    'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad', 'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur',
    'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara'
];

export default function SettingsHubPage() {
    const { user, userProfile, updateProfile, logout } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialTab = (searchParams.get('tab') as TabType) || 'profile';

    const [activeTab, setActiveTab] = useState<TabType>(initialTab);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // Tab 1: Profile State
    const [profileForm, setProfileForm] = useState<Partial<UserProfile>>({});

    // Tab 2: Documents State
    const [documents, setDocuments] = useState<HealthDocument[]>([]);
    const [docLoading, setDocLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Tab 4: Doctors State
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [docCrudLoading, setDocCrudLoading] = useState(false);
    const [showDoctorForm, setShowDoctorForm] = useState(false);
    const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
    const [doctorForm, setDoctorForm] = useState<Partial<Doctor>>({
        specialty: 'Gynaecologist',
        city: 'Mumbai',
        isPreferred: false
    });

    useEffect(() => {
        if (userProfile) {
            setProfileForm({
                displayName: userProfile.displayName || '',
                ageRange: userProfile.ageRange || '25-34',
                activityLevel: userProfile.activityLevel || 'moderate',
                dietType: userProfile.dietType || 'vegetarian',
                stapleGrain: userProfile.stapleGrain || 'rice',
                ironRichFoodFrequency: userProfile.ironRichFoodFrequency || 'sometimes',
                conditions: userProfile.conditions || [],
                language: userProfile.language || 'en',
                personalGoal: userProfile.personalGoal || '',
                averageCycleLength: userProfile.averageCycleLength || 28,
                lastPeriodStart: userProfile.lastPeriodStart || '',
                // AI Prefs
                aiPersonality: userProfile.aiPersonality || 'warm',
                aiResponseLength: userProfile.aiResponseLength || 'standard',
                aiModelPreference: userProfile.aiModelPreference || 'auto',
                aiLanguage: userProfile.aiLanguage || 'en'
            });
        }
    }, [userProfile]);

    useEffect(() => {
        if (activeTab === 'documents' && user) fetchDocuments();
        if (activeTab === 'doctors' && user) fetchDoctors();
    }, [activeTab, user]);

    const fetchDocuments = async () => {
        setDocLoading(true);
        try {
            const res = await fetch(`/api/documents?userId=${user?.username}`);
            const data = await res.json();
            if (data.success) setDocuments(data.documents);
        } catch (e) { console.error(e); }
        finally { setDocLoading(false); }
    };

    const refreshDocuments = async () => {
        try {
            const res = await fetch(`/api/documents?userId=${user?.username}`);
            const text = await res.text();
            const data = text ? JSON.parse(text) : {};
            if (data.success) setDocuments(data.documents || []);
        } catch (e) { console.error(e); }
    };

    const fetchDoctors = async () => {
        setDocCrudLoading(true);
        try {
            const res = await fetch(`/api/doctors?userId=${user?.username}`);
            const data = await res.json();
            if (data.success) setDoctors(data.doctors);
        } catch (e) { console.error(e); }
        finally { setDocCrudLoading(false); }
    };

    const handleSaveProfile = async () => {
        setLoading(true);
        try {
            await updateProfile(profileForm);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setUploading(true);
        setUploadError(null);

        // Reset input so the same file can be re-selected
        if (fileInputRef.current) fileInputRef.current.value = '';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', user.username);
        formData.append('category', 'other');

        try {
            const res = await fetch('/api/documents', {
                method: 'POST',
                body: formData
            });
            const text = await res.text();
            let data: any = {};
            try { data = JSON.parse(text); } catch { setUploadError('Upload failed: invalid server response'); setUploading(false); return; }

            if (data.success) {
                await refreshDocuments(); // Silently re-fetch without spinner
            } else {
                setUploadError(data.error || 'Upload failed');
            }
        } catch (err: any) {
            console.error('Upload error:', err);
            setUploadError(err.message || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const viewDocument = async (docId: string) => {
        try {
            const res = await fetch(`/api/documents?userId=${user?.username}&docId=${docId}`);
            const data = await res.json();
            if (data.success && data.url) {
                window.open(data.url, '_blank');
            }
        } catch (e) { console.error(e); }
    };

    const deleteDocument = async (docId: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        try {
            const res = await fetch(`/api/documents?userId=${user?.username}&docId=${docId}`, {
                method: 'DELETE'
            });
            if (res.ok) fetchDocuments();
        } catch (e) { console.error(e); }
    };

    const handleDoctorSubmit = async () => {
        setDocCrudLoading(true);
        try {
            const res = await fetch('/api/doctors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...doctorForm, userId: user?.username, doctorId: editingDoctorId })
            });
            if (res.ok) {
                setShowDoctorForm(false);
                setEditingDoctorId(null);
                fetchDoctors();
            }
        } catch (e) { console.error(e); }
        finally { setDocCrudLoading(false); }
    };

    const deleteDoctor = async (doctorId: string) => {
        if (!confirm('Remove this doctor?')) return;
        try {
            await fetch(`/api/doctors?userId=${user?.username}&doctorId=${doctorId}`, { method: 'DELETE' });
            fetchDoctors();
        } catch (e) { console.error(e); }
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'documents', label: 'Health Docs', icon: FileText },
        { id: 'cycle', label: 'Cycle Prefs', icon: Calendar },
        { id: 'doctors', label: 'My Doctors', icon: Users },
        { id: 'ai', label: 'AI Preferences', icon: Sparkles },
        { id: 'privacy', label: 'Data & Privacy', icon: Shield },
        { id: 'subscription', label: 'Subscription', icon: CreditCard },
    ];

    return (
        <div className="flex flex-col lg:flex-row gap-8 max-w-7xl mx-auto">
            {/* Sidebar Tabs (Desktop) / Header Tabs (Mobile) */}
            <div className="w-full lg:w-64 flex-shrink-0">
                <div className="bg-surface rounded-2xl p-2 border border-border sticky top-24 lg:flex lg:flex-col lg:gap-2 grid grid-cols-2 md:grid-cols-4 overflow-x-auto lg:overflow-visible">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                : 'text-text-secondary hover:bg-surface-elevated'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                    <button
                        onClick={() => logout()}
                        className="flex lg:mt-4 items-center gap-3 px-4 py-3 rounded-xl text-error hover:bg-error/10 transition-all text-sm font-medium"
                    >
                        <Trash2 size={18} /> Logout
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 space-y-6">
                {success && (
                    <div className="p-4 rounded-xl bg-success/10 border border-success/20 flex items-center gap-3 animate-fade-in mb-4">
                        <Check className="text-success" />
                        <p className="text-success font-medium">Settings saved successfully!</p>
                    </div>
                )}

                {/* TAB 1: PROFILE */}
                {activeTab === 'profile' && (
                    <div className="space-y-6 animate-fade-in">
                        <Card variant="elevated">
                            <CardHeader>
                                <CardTitle>My Profile</CardTitle>
                                <CardDescription>Your basic information and health background</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input
                                        label="Display Name"
                                        value={profileForm.displayName || ''}
                                        onChange={e => setProfileForm({ ...profileForm, displayName: e.target.value })}
                                    />
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Email (Read-only)</label>
                                        <div className="px-4 py-2.5 bg-surface-elevated rounded-xl border border-border text-text-muted text-sm">
                                            {user?.email}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Age Range</label>
                                        <select
                                            value={profileForm.ageRange}
                                            onChange={e => setProfileForm({ ...profileForm, ageRange: e.target.value as any })}
                                            className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none"
                                        >
                                            <option value="13-17">13-17</option>
                                            <option value="18-24">18-24</option>
                                            <option value="25-34">25-34</option>
                                            <option value="35-44">35-44</option>
                                            <option value="45+">45+</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Activity Level</label>
                                        <div className="flex flex-wrap gap-2">
                                            {['Sedentary', 'Light', 'Moderate', 'Active', 'Very Active'].map(level => (
                                                <button
                                                    key={level}
                                                    onClick={() => setProfileForm({ ...profileForm, activityLevel: level.toLowerCase() })}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${profileForm.activityLevel === level.toLowerCase()
                                                        ? 'bg-primary border-primary text-white'
                                                        : 'bg-surface border-border hover:border-primary/50'
                                                        }`}
                                                >
                                                    {level}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-border">
                                    <h4 className="font-bold text-sm uppercase tracking-wider text-text-muted">Diet & Lifestyle</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-xs">Diet Type</label>
                                            <select
                                                value={profileForm.dietType}
                                                onChange={e => setProfileForm({ ...profileForm, dietType: e.target.value })}
                                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm"
                                            >
                                                <option value="none">Normal</option>
                                                <option value="vegetarian">Vegetarian</option>
                                                <option value="vegan">Vegan</option>
                                                <option value="pescatarian">Pescatarian</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-xs">Staple Grain</label>
                                            <select
                                                value={profileForm.stapleGrain}
                                                onChange={e => setProfileForm({ ...profileForm, stapleGrain: e.target.value })}
                                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm"
                                            >
                                                <option value="rice">Rice-heavy</option>
                                                <option value="wheat">Wheat-heavy</option>
                                                <option value="mixed">Mixed/balanced</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1 text-xs">Iron Intake</label>
                                            <select
                                                value={profileForm.ironRichFoodFrequency}
                                                onChange={e => setProfileForm({ ...profileForm, ironRichFoodFrequency: e.target.value })}
                                                className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm"
                                            >
                                                <option value="rarely">Rarely</option>
                                                <option value="sometimes">Sometimes</option>
                                                <option value="frequently">Frequently</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-border">
                                    <h4 className="font-bold text-sm uppercase tracking-wider text-text-muted">Personal Health Goal</h4>
                                    <textarea
                                        value={profileForm.personalGoal || ''}
                                        onChange={e => setProfileForm({ ...profileForm, personalGoal: e.target.value })}
                                        className="w-full p-4 bg-surface-elevated border border-border rounded-xl focus:ring-2 focus:ring-primary/50 outline-none min-h-[100px] text-sm"
                                        placeholder="E.g., I want to manage PCOS symptoms through diet..."
                                    />
                                </div>

                                <Button
                                    onClick={handleSaveProfile}
                                    fullWidth
                                    isLoading={loading}
                                    leftIcon={<Save size={20} />}
                                >
                                    Save Profile
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* TAB 2: HEALTH DOCUMENTS */}
                {activeTab === 'documents' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold">Health Documents</h3>
                                <p className="text-sm text-text-secondary">Securely store your test results and prescriptions</p>
                            </div>
                            <Button
                                leftIcon={<Upload size={18} />}
                                onClick={() => fileInputRef.current?.click()}
                                isLoading={uploading}
                            >
                                Upload
                            </Button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                onChange={handleFileUpload}
                                accept=".pdf,image/*"
                            />
                        </div>

                        <Card variant="outlined" className="bg-primary/5 border-primary/20">
                            <CardContent className="py-4 flex gap-3">
                                <Lock className="w-5 h-5 text-primary flex-shrink-0" />
                                <p className="text-xs text-text-secondary leading-relaxed">
                                    Your documents are encrypted and stored securely in AWS S3.
                                    Only you can access them. They are never shared with third parties.
                                </p>
                            </CardContent>
                        </Card>

                        {uploadError && (
                            <div className="p-3 rounded-xl bg-error/10 border border-error/20 text-error text-sm flex items-center gap-2">
                                <AlertTriangle size={16} />
                                {uploadError}
                            </div>
                        )}

                        {docLoading ? (
                            <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>
                        ) : documents.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {documents.map(doc => (
                                    <Card key={doc.docId} variant="default" className="group">
                                        <CardContent className="p-4 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-surface-elevated flex items-center justify-center">
                                                    <FileText className="text-primary" size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm truncate max-w-[150px]">{doc.filename}</p>
                                                    <p className="text-[10px] text-text-muted">
                                                        {new Date(doc.uploadedAt).toLocaleDateString()} • {Math.round(doc.fileSize / 1024)} KB
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => viewDocument(doc.docId)}>
                                                    View
                                                </Button>
                                                <button onClick={() => deleteDocument(doc.docId)} className="p-2 text-text-muted hover:text-error transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-surface rounded-2xl border border-dashed border-border">
                                <Upload className="mx-auto text-text-muted mb-4" size={40} />
                                <p className="text-text-secondary">No documents uploaded yet</p>
                                <p className="text-xs text-text-muted mt-1">Upload blood tests, ultrasounds, or prescriptions</p>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 4: MY DOCTORS */}
                {activeTab === 'doctors' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold">My Doctors</h3>
                                <p className="text-sm text-text-secondary">Keep track of your healthcare providers</p>
                            </div>
                            <Button variant="outline" leftIcon={<Plus size={18} />} onClick={() => {
                                setEditingDoctorId(null);
                                setDoctorForm({ specialty: 'Gynaecologist', city: 'Mumbai', isPreferred: false });
                                setShowDoctorForm(true);
                            }}>
                                Add Doctor
                            </Button>
                        </div>

                        {showDoctorForm && (
                            <Card className="border-primary/50 shadow-lg animate-fade-in">
                                <CardHeader>
                                    <CardTitle>{editingDoctorId ? 'Edit Doctor' : 'New Doctor'}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Input
                                            label="Doctor Name"
                                            value={doctorForm.name || ''}
                                            onChange={e => setDoctorForm({ ...doctorForm, name: e.target.value })}
                                            placeholder="Dr. Smita Rao"
                                        />
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Specialty</label>
                                            <select
                                                value={doctorForm.specialty}
                                                onChange={e => setDoctorForm({ ...doctorForm, specialty: e.target.value as any })}
                                                className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-xl text-sm"
                                            >
                                                <option>Gynaecologist</option>
                                                <option>GP</option>
                                                <option>Endocrinologist</option>
                                                <option>Other</option>
                                            </select>
                                        </div>
                                        <Input
                                            label="Hospital / Clinic"
                                            value={doctorForm.hospital || ''}
                                            onChange={e => setDoctorForm({ ...doctorForm, hospital: e.target.value })}
                                        />
                                        <div>
                                            <label className="block text-sm font-medium mb-1">City</label>
                                            <select
                                                value={doctorForm.city}
                                                onChange={e => setDoctorForm({ ...doctorForm, city: e.target.value })}
                                                className="w-full px-4 py-2 bg-surface-elevated border border-border rounded-xl text-sm"
                                            >
                                                {INDIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <textarea
                                        className="w-full p-4 bg-surface-elevated border border-border rounded-xl text-sm min-h-[80px]"
                                        placeholder="Notes: last visit, concerns discussed..."
                                        value={doctorForm.notes || ''}
                                        onChange={e => setDoctorForm({ ...doctorForm, notes: e.target.value })}
                                    />
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="preferred"
                                            checked={doctorForm.isPreferred}
                                            onChange={e => setDoctorForm({ ...doctorForm, isPreferred: e.target.checked })}
                                        />
                                        <label htmlFor="preferred" className="text-sm font-medium">Mark as preferred doctor</label>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button variant="ghost" fullWidth onClick={() => setShowDoctorForm(false)}>Cancel</Button>
                                        <Button fullWidth onClick={handleDoctorSubmit} isLoading={docCrudLoading}>Save</Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {docCrudLoading && !showDoctorForm ? (
                            <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>
                        ) : doctors.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {doctors.map(doc => (
                                    <Card key={doc.doctorId} variant="elevated" className={doc.isPreferred ? 'border-primary/30' : ''}>
                                        <CardContent className="p-5">
                                            <div className="flex justify-between items-start">
                                                <div className="flex gap-3">
                                                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                                                        <User size={24} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold flex items-center gap-2">
                                                            {doc.name}
                                                            {doc.isPreferred && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full uppercase">Preferred</span>}
                                                        </h4>
                                                        <p className="text-xs text-text-secondary">{doc.specialty} • {doc.city}</p>
                                                        <p className="text-xs text-text-muted mt-1">{doc.hospital}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <button onClick={() => {
                                                        setEditingDoctorId(doc.doctorId);
                                                        setDoctorForm(doc);
                                                        setShowDoctorForm(true);
                                                    }} className="p-2 hover:bg-surface-elevated rounded-lg"><Plus size={16} className="rotate-45" /></button>
                                                    <button onClick={() => deleteDoctor(doc.doctorId)} className="p-2 hover:bg-error/10 text-error rounded-lg"><Trash2 size={16} /></button>
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-border/50">
                                                <Button variant="outline" size="sm" fullWidth rightIcon={<ExternalLink size={14} />}>
                                                    Book Appointment
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-surface rounded-2xl border border-dashed border-border">
                                <Users className="mx-auto text-text-muted mb-4" size={40} />
                                <p className="text-text-secondary">No doctors added yet</p>
                                <Button variant="ghost" className="mt-4" onClick={() => setShowDoctorForm(true)}>Add your first doctor</Button>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: CYCLE PREFS */}
                {activeTab === 'cycle' && (
                    <div className="space-y-6 animate-fade-in">
                        <Card variant="elevated">
                            <CardHeader>
                                <CardTitle>Cycle Preferences</CardTitle>
                                <CardDescription>Customise your tracking and alerts</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="text-sm font-medium">Average Cycle Length</label>
                                        <span className="text-primary font-bold">{profileForm.averageCycleLength} days</span>
                                    </div>
                                    <input
                                        type="range" min="21" max="42"
                                        value={profileForm.averageCycleLength}
                                        onChange={e => setProfileForm({ ...profileForm, averageCycleLength: parseInt(e.target.value) })}
                                        className="w-full h-2 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-primary"
                                    />
                                    <p className="text-[10px] text-text-muted mt-2">Normal range: 21-35 days</p>
                                </div>

                                <div className="space-y-4 pt-6 border-t border-border">
                                    <h4 className="text-sm font-bold uppercase tracking-wider text-text-muted">Notifications</h4>
                                    {[
                                        { label: 'Period Reminder', desc: 'Alert me 2 days before expected start' },
                                        { label: 'Daily Logging', desc: 'Remind me to track symptoms at 8:00 PM' },
                                        { label: 'Ovulation Alert', desc: 'Notify when approaching fertile window' },
                                        { label: 'Weekly Summary', desc: 'Send health summary every Monday' }
                                    ].map(item => (
                                        <div key={item.label} className="flex items-center justify-between p-4 bg-surface rounded-xl border border-border">
                                            <div>
                                                <p className="text-sm font-medium">{item.label}</p>
                                                <p className="text-xs text-text-secondary">{item.desc}</p>
                                            </div>
                                            <div className="w-10 h-6 bg-primary rounded-full relative cursor-pointer opacity-50">
                                                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <Button onClick={handleSaveProfile} isLoading={loading} leftIcon={<Save size={18} />}>Save Preferences</Button>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* TAB 5: AI PREFERENCES */}
                {activeTab === 'ai' && (
                    <div className="space-y-6 animate-fade-in">
                        <Card variant="elevated">
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Sparkles className="text-primary" />
                                    <CardTitle>AI Preferences</CardTitle>
                                </div>
                                <CardDescription>Customise how Aria interacts with you</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8">
                                <div>
                                    <label className="block text-sm font-medium mb-3">Chat Personality</label>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { id: 'warm', label: 'Warm & Supportive' },
                                            { id: 'informative', label: 'Informative & Direct' },
                                            { id: 'detail', label: 'Detail-Oriented' }
                                        ].map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => setProfileForm({ ...profileForm, aiPersonality: p.id as any })}
                                                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${profileForm.aiPersonality === p.id
                                                    ? 'bg-primary border-primary text-white'
                                                    : 'bg-surface border-border hover:border-primary/50'
                                                    }`}
                                            >
                                                {p.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-3">Language for AI Responses</label>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                        {['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali'].map(lang => (
                                            <button
                                                key={lang}
                                                onClick={() => setProfileForm({ ...profileForm, aiLanguage: lang })}
                                                className={`p-3 rounded-xl border text-sm transition-all ${profileForm.aiLanguage === lang
                                                    ? 'border-primary bg-primary/5 text-primary font-bold'
                                                    : 'border-border hover:border-primary/50'
                                                    }`}
                                            >
                                                {lang}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <Button onClick={handleSaveProfile} isLoading={loading}>Update AI Settings</Button>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* TAB 6: DATA & PRIVACY */}
                {activeTab === 'privacy' && (
                    <div className="space-y-6 animate-fade-in">
                        <Card variant="elevated">
                            <CardHeader>
                                <CardTitle>Data Summary</CardTitle>
                                <CardDescription>A overview of your stored health data</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Logs', count: 124, icon: Calendar },
                                        { label: 'Reports', count: 12, icon: FileText },
                                        { label: 'Messages', count: 450, icon: Sparkles },
                                        { label: 'Docs', count: documents.length, icon: Lock }
                                    ].map(stat => (
                                        <div key={stat.label} className="p-4 bg-surface-elevated rounded-2xl text-center">
                                            <stat.icon className="mx-auto mb-2 text-primary opacity-50" size={20} />
                                            <p className="text-xl font-bold">{stat.count}</p>
                                            <p className="text-[10px] uppercase font-bold text-text-muted">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 p-4 bg-surface rounded-xl border border-border flex items-center justify-between">
                                    <p className="text-sm font-medium">Tracking since</p>
                                    <p className="text-sm font-bold text-primary">{new Date(userProfile?.createdAt || '').toLocaleDateString()}</p>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Button variant="outline" fullWidth leftIcon={<Download size={18} />}>Export Data (JSON)</Button>
                            <Button variant="primary" fullWidth leftIcon={<FileText size={18} />} onClick={async () => {
                                const res = await fetch(`/api/export/pdf?userId=${user?.username}`);
                                const data = await res.json();
                                alert(data.message);
                            }}>Export Health Timeline (PDF)</Button>
                        </div>

                        <Card variant="outlined" className="border-error/30">
                            <CardContent className="py-6 flex flex-col items-center gap-4 text-center">
                                <AlertTriangle className="text-error" size={40} />
                                <div>
                                    <h4 className="font-bold text-error">Danger Zone</h4>
                                    <p className="text-sm text-text-secondary mt-1">This will permanently delete ALL your tracking data, logs, and information.</p>
                                </div>
                                <Button variant="danger">Delete My Account</Button>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* TAB 7: SUBSCRIPTION */}
                {activeTab === 'subscription' && (
                    <div className="space-y-6 animate-fade-in">
                        <Card variant="gradient" className="bg-gradient-to-br from-primary to-accent text-white border-none shadow-xl shadow-primary/20">
                            <CardContent className="p-8">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <Logo variant="icon" size={48} showText={false} />
                                            <h3 className="text-2xl font-bold">Ovira Pro</h3>
                                        </div>
                                        <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Active</span>
                                        <p className="text-white/80">Renewal on Oct 12, 2026</p>
                                    </div>
                                    <div className="p-3 bg-white/10 rounded-2xl">
                                        <Sparkles size={32} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/10 rounded-xl">
                                        <p className="text-[10px] font-bold uppercase text-white/60 mb-1">AI Reports Used</p>
                                        <div className="flex items-end justify-between">
                                            <p className="text-2xl font-bold">Unlimited</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white/10 rounded-xl">
                                        <p className="text-[10px] font-bold uppercase text-white/60 mb-1">Doctor Chat Sessions</p>
                                        <div className="flex items-end justify-between">
                                            <p className="text-2xl font-bold">3 <span className="text-sm font-normal text-white/60">/ 5 used</span></p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <h4 className="font-bold">Plan Benefits</h4>
                            {[
                                'Unlimited personalised AI health reports',
                                'Direct chat with certified gynaecologists',
                                'Clinical-grade risk analysis & early detection',
                                'Secure medical document storage system',
                                'Ad-free experience'
                            ].map(benefit => (
                                <div key={benefit} className="flex items-center gap-3 text-sm">
                                    <div className="w-5 h-5 rounded-full bg-success/20 text-success flex items-center justify-center flex-shrink-0">
                                        <Check size={12} />
                                    </div>
                                    {benefit}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
