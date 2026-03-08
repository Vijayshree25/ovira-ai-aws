// User Profile
export interface UserProfile {
    id?: string; // Optional for backward compatibility
    uid: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    ageRange: '13-17' | '18-24' | '25-34' | '35-44' | '45+';
    conditions: string[];
    language: string;
    onboardingComplete: boolean;
    createdAt: string; // ISO 8601 string
    lastPeriodStart?: string; // ISO 8601 string
    averageCycleLength: number;
    // About You (Step 2)
    activityLevel?: string;
    heightRange?: string;
    // Cycle History (Step 3)
    previousPeriodDates?: string[];
    avgCycleLength?: number;
    cycleRegularity?: string;
    // Diet & Lifestyle (Step 5)
    dietType?: string;
    stapleGrain?: string;
    ironRichFoodFrequency?: string;
    waterIntake?: number;
    caffeineIntake?: string;
    sleepHabit?: string;
    // Recent Symptoms (Step 6)
    recentPainLevel?: string;
    recentMoodPattern?: string;
    regularSymptoms?: string[];
    hasDoctorConsultation?: string;
    personalGoal?: string;
    // AI context
    healthContextSummary?: string;
    isPremium?: boolean;
    // AI Preferences
    aiPersonality?: 'warm' | 'informative' | 'detail';
    aiResponseLength?: 'concise' | 'standard' | 'detailed';
    aiModelPreference?: 'auto' | 'menstllama' | 'standard';
    aiLanguage?: string;
}

// Symptom Log
export interface SymptomLog {
    id: string;
    userId: string;
    date: string; // ISO 8601 string
    flowLevel: 'none' | 'light' | 'medium' | 'heavy';
    painLevel: number; // 0-10
    mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
    energyLevel: 'high' | 'medium' | 'low';
    sleepHours: number;
    notes?: string;
    symptoms?: string[];
    createdAt: string; // ISO 8601 string
    updatedAt?: string; // ISO 8601 string
}

// Health Report
export interface HealthReport {
    id: string;
    userId: string;
    generatedAt: string; // ISO 8601 string
    periodStart: string; // ISO 8601 string
    periodEnd: string; // ISO 8601 string
    pdfUrl: string;
    riskFlags: RiskFlag[];
    summary?: string;
}

// Risk Flag
export interface RiskFlag {
    type: 'anemia' | 'pcos' | 'endometriosis' | 'urgent' | 'general';
    severity: 'low' | 'medium' | 'high';
    description: string;
    recommendation?: string;
}

// Chat Message
export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string; // ISO 8601 string
}

// Health Document
export interface HealthDocument {
    userId: string;
    docId: string;
    filename: string;
    category: 'blood_test' | 'ultrasound' | 'prescription' | 'doctor_notes' | 'other';
    uploadedAt: string; // ISO 8601 string
    s3Key: string;
    fileSize: number;
}

// Doctor
export interface Doctor {
    userId: string;
    doctorId: string;
    name: string;
    specialty: 'Gynaecologist' | 'GP' | 'Endocrinologist' | 'Other';
    hospital: string;
    city: string;
    phone?: string;
    notes?: string;
    isPreferred: boolean;
}

// Onboarding Data — covers all 6 steps
export interface OnboardingData {
    // Step 1 — Welcome
    language: string;
    acceptedTerms: boolean;
    acceptedMedicalDisclaimer: boolean;
    // Step 2 — About You
    ageRange: UserProfile['ageRange'];
    activityLevel: string;
    heightRange: string;
    // Step 3 — Cycle History
    lastPeriodStart: string;
    previousPeriodDates: string[];
    periodDuration: number;
    cycleRegularity: string;
    // Step 4 — Health Conditions
    conditions: string[];
    // Step 5 — Diet & Lifestyle
    dietType: string;
    stapleGrain: string;
    ironRichFoodFrequency: string;
    waterIntake: number;
    caffeineIntake: string;
    sleepHabit: string;
    // Step 6 — Recent Symptoms
    recentPainLevel: string;
    recentMoodPattern: string;
    regularSymptoms: string[];
    hasDoctorConsultation: string;
    personalGoal: string;
}

// Appointment
export interface Appointment {
    appointmentId: string;
    userId: string;
    doctorId: string;
    doctorName: string;
    hospital: string;
    address?: string;
    mapsUrl?: string;
    date: string;
    time: string;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    healthSummaryGenerated: boolean;
    healthSummarySent: boolean;
    summaryText?: string;
    createdAt: string;
}

// Doctor Slot
export interface DoctorSlot {
    date: string;
    time: string;
    available: boolean;
}

// Full Doctor Profile (for discovery)
export interface DoctorProfile {
    doctorId: string;
    name: string;
    specialty: string;
    hospital: string;
    city: string;
    experience: string;
    languages: string[];
    consultationFee: string;
    rating: number;
    reviews: number;
    focusAreas: string[];
    address: string;
    mapsUrl: string;
    slots: DoctorSlot[];
}

// Health Conditions List
export const HEALTH_CONDITIONS = [
    'PCOS',
    'Endometriosis',
    'Fibroids',
    'Thyroid Condition',
    'Anemia',
    'Diabetes',
    'Hypertension',
    'None of the above',
] as const;

// Mood Options
export const MOOD_OPTIONS = [
    { value: 'great', label: 'Great', emoji: '😊' },
    { value: 'good', label: 'Good', emoji: '🙂' },
    { value: 'neutral', label: 'Neutral', emoji: '😐' },
    { value: 'bad', label: 'Bad', emoji: '😔' },
    { value: 'terrible', label: 'Terrible', emoji: '😢' },
] as const;

// Flow Levels
export const FLOW_LEVELS = [
    { value: 'none', label: 'None', color: '#E5E7EB' },
    { value: 'light', label: 'Light', color: '#FCA5A5' },
    { value: 'medium', label: 'Medium', color: '#EF4444' },
    { value: 'heavy', label: 'Heavy', color: '#991B1B' },
] as const;

// Energy Levels
export const ENERGY_LEVELS = [
    { value: 'low', label: 'Low', icon: '🔋' },
    { value: 'medium', label: 'Medium', icon: '⚡' },
    { value: 'high', label: 'High', icon: '🚀' },
] as const;

// Symptoms List
export const SYMPTOM_OPTIONS = [
    'Cramps',
    'Headache',
    'Bloating',
    'Breast tenderness',
    'Acne',
    'Fatigue',
    'Nausea',
    'Back pain',
    'Insomnia',
    'Mood swings',
    'Anxiety',
    'Cravings',
] as const;

// Languages
export const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Español' },
    { code: 'hi', name: 'हिंदी' },
    { code: 'pt', name: 'Português' },
    { code: 'fr', name: 'Français' },
] as const;
