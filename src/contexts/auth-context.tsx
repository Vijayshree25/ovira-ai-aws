'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
    signUpUser,
    signInUser,
    signOutUser,
    getCurrentUser,
    resetPassword as cognitoResetPassword,
    getCognitoErrorMessage,
    CognitoAuthUser,
} from '@/lib/aws/cognito';
import { UserProfile, OnboardingData } from '@/types';
import { buildHealthContext } from '@/lib/buildHealthContext';

interface AuthContextType {
    user: CognitoAuthUser | null;
    userProfile: UserProfile | null;
    loading: boolean;
    error: string | null;
    signUp: (email: string, password: string, displayName: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<CognitoAuthUser>;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    completeOnboarding: (data: OnboardingData) => Promise<void>;
    updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
    refreshUserProfile: () => Promise<void>;
    refreshUser: () => Promise<CognitoAuthUser | null>;
    loginAsDemo: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<CognitoAuthUser | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    // Ensure we're mounted before operations
    useEffect(() => {
        setMounted(true);
    }, []);

    // Fetch user profile from API route
    const fetchUserProfile = async (userId: string) => {
        try {
            console.log('Fetching user profile for:', userId);
            
            const response = await fetch(`/api/user/profile?userId=${encodeURIComponent(userId)}`);
            const data = await response.json();
            
            let profile = data.success ? data.profile : null;

            // If profile doesn't exist, create a basic one
            if (!profile) {
                console.log('Creating new user profile for:', userId);
                const newProfile = {
                    uid: userId,
                    email: userId,
                    displayName: userId.split('@')[0],
                    onboardingComplete: false,
                    averageCycleLength: 28,
                    conditions: [],
                    language: 'en',
                    ageRange: '25-34' as const,
                    createdAt: new Date().toISOString(),
                };

                try {
                    const createResponse = await fetch('/api/user/profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(newProfile),
                    });

                    const createData = await createResponse.json();
                    
                    if (createData.success) {
                        profile = createData.profile;
                        console.log('New user profile created successfully');
                    } else {
                        console.error('Failed to create user profile:', createData.error);
                        profile = newProfile as UserProfile;
                    }
                } catch (createError) {
                    console.error('Failed to create user profile:', createError);
                    profile = newProfile as UserProfile;
                }
            }

            console.log('Setting user profile:', profile);

            // Compute healthContextSummary for users who completed onboarding
            if (
                profile &&
                profile.onboardingComplete &&
                !profile.healthContextSummary
            ) {
                try {
                    const healthContextSummary = buildHealthContext(profile);
                    profile.healthContextSummary = healthContextSummary;
                    
                    // Persist to API in background
                    fetch('/api/user/profile', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId, updates: { healthContextSummary } }),
                    }).catch((err) =>
                        console.error('Failed to persist computed healthContextSummary:', err),
                    );
                    
                    console.log('Computed and saved missing healthContextSummary');
                } catch (err) {
                    console.error('Error computing healthContextSummary:', err);
                }
            }

            setUserProfile(profile);
        } catch (err: any) {
            console.error('Error fetching user profile:', err);

            // Don't show error for offline scenarios
            if (!err.message?.includes('offline') && !err.message?.includes('NetworkingError')) {
                setError('Unable to load profile. Please check your connection.');
            }

            // Set a minimal profile to prevent auth loops
            const fallbackProfile: UserProfile = {
                id: userId,
                uid: userId,
                email: userId,
                displayName: userId.split('@')[0],
                onboardingComplete: false,
                createdAt: new Date().toISOString(),
                averageCycleLength: 28,
                conditions: [],
                language: 'en',
                ageRange: '25-34',
            };

            setUserProfile(fallbackProfile);
        }
    };

    // Check for current user on mount - initialize from stored tokens
    useEffect(() => {
        if (!mounted) {
            setLoading(false);
            return;
        }

        const checkCurrentUser = async () => {
            try {
                console.log('Checking current user on mount');
                // Check for stored tokens first
                const idToken = localStorage.getItem('idToken');
                const accessToken = localStorage.getItem('accessToken');
                const userEmail = localStorage.getItem('userEmail');

                console.log('Stored auth data:', {
                    hasIdToken: !!idToken,
                    hasAccessToken: !!accessToken,
                    userEmail
                });

                if (idToken && accessToken && userEmail) {
                    // Create user object from stored data
                    const authUser: CognitoAuthUser = {
                        username: userEmail,
                        email: userEmail,
                        attributes: { email: userEmail },
                        session: null as any, // We have tokens but not full session object
                    };

                    console.log('Setting user from stored tokens:', authUser);
                    setUser(authUser);
                    await fetchUserProfile(userEmail);
                } else {
                    console.log('No stored auth data, user is null');
                    setUser(null);
                    setUserProfile(null);
                }
            } catch (err) {
                console.error('Error checking current user:', err);
                setUser(null);
                setUserProfile(null);
            } finally {
                setLoading(false);
            }
        };

        checkCurrentUser();
    }, [mounted]);

    const clearError = () => setError(null);

    // Sign up with email/password
    const signUp = async (email: string, password: string, displayName: string) => {
        try {
            // Call server-side API route
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, displayName }),
            });

            const data = await response.json();

            if (!data.success) {
                const error = new Error(data.error || 'Signup failed');
                (error as any).code = data.code;
                throw error;
            }

            // Check if user needs email verification
            if (!data.userConfirmed) {
                setError('Account created! Please check your email for verification code. Then try logging in.');
                return;
            }

            // If auto-confirmed, sign in the user
            await signIn(email, password);
        } catch (err: any) {
            const message = err.message || 'An error occurred during signup';
            setError(message);
            throw err;
        }
    };

    // Sign in with email/password
    const signIn = async (email: string, password: string) => {
        try {
            // Call server-side API route
            const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Signin failed');
            }

            // Store tokens and create user object
            const authResult = data.authenticationResult;
            const authUser: CognitoAuthUser = {
                username: email,
                email: email,
                attributes: {},
                session: authResult as any,
            };

            setUser(authUser);
            await fetchUserProfile(email);

            // Return the user object so caller can verify state is set
            return authUser;
        } catch (err: any) {
            const message = err.message || 'An error occurred during signin';
            setError(message);
            throw err;
        }
    };

    // Sign in with Google (placeholder - requires Cognito Identity Pool setup)
    const signInWithGoogle = async () => {
        setError('Google sign-in requires additional AWS Cognito Identity Pool configuration. Please use email/password for now.');
        throw new Error('Google sign-in not yet configured');
    };

    // Logout
    const logout = async () => {
        await signOutUser();
        // Clear all stored auth data
        localStorage.removeItem('idToken');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userEmail');
        setUser(null);
        setUserProfile(null);
    };

    // Reset password
    const resetPassword = async (email: string) => {
        try {
            await cognitoResetPassword(email);
        } catch (err: any) {
            const message = getCognitoErrorMessage(err);
            setError(message);
            throw err;
        }
    };

    // Complete onboarding
    const completeOnboarding = async (data: OnboardingData) => {
        if (!user) throw new Error('No user logged in');

        console.log('Completing onboarding for user:', user.username);

        // Build a partial profile from the onboarding data to compute health context
        const profileSnapshot: UserProfile = {
            uid: user.username,
            email: user.email || user.username,
            displayName: userProfile?.displayName,
            ageRange: data.ageRange,
            conditions: data.conditions,
            language: data.language,
            onboardingComplete: true,
            createdAt: userProfile?.createdAt || new Date().toISOString(),
            averageCycleLength: data.periodDuration ? Math.round(28) : 28,
            activityLevel: data.activityLevel,
            heightRange: data.heightRange,
            lastPeriodStart: data.lastPeriodStart,
            previousPeriodDates: data.previousPeriodDates,
            avgCycleLength: data.periodDuration,
            cycleRegularity: data.cycleRegularity,
            dietType: data.dietType,
            stapleGrain: data.stapleGrain,
            ironRichFoodFrequency: data.ironRichFoodFrequency,
            waterIntake: data.waterIntake,
            caffeineIntake: data.caffeineIntake,
            sleepHabit: data.sleepHabit,
            recentPainLevel: data.recentPainLevel,
            recentMoodPattern: data.recentMoodPattern,
            regularSymptoms: data.regularSymptoms,
            hasDoctorConsultation: data.hasDoctorConsultation,
            personalGoal: data.personalGoal,
        };

        // Generate health context summary for AI personalisation
        const healthContextSummary = buildHealthContext(profileSnapshot);

        const updates: Partial<UserProfile> = {
            ageRange: data.ageRange,
            conditions: data.conditions,
            language: data.language,
            onboardingComplete: true,
            activityLevel: data.activityLevel,
            heightRange: data.heightRange,
            lastPeriodStart: data.lastPeriodStart,
            previousPeriodDates: data.previousPeriodDates,
            avgCycleLength: data.periodDuration,
            cycleRegularity: data.cycleRegularity,
            dietType: data.dietType,
            stapleGrain: data.stapleGrain,
            ironRichFoodFrequency: data.ironRichFoodFrequency,
            waterIntake: data.waterIntake,
            caffeineIntake: data.caffeineIntake,
            sleepHabit: data.sleepHabit,
            recentPainLevel: data.recentPainLevel,
            recentMoodPattern: data.recentMoodPattern,
            regularSymptoms: data.regularSymptoms,
            hasDoctorConsultation: data.hasDoctorConsultation,
            personalGoal: data.personalGoal,
            healthContextSummary,
        };

        const response = await fetch('/api/user/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.username, updates }),
        });

        const responseData = await response.json();
        
        if (!responseData.success) {
            throw new Error(responseData.message || 'Failed to update profile');
        }

        console.log('Profile updated via API with health context');

        setUserProfile((prev) => {
            const updated = prev ? { ...prev, ...updates } : null;
            console.log('Updated userProfile state:', updated);
            return updated;
        });
    };

    // Update user profile via API and local state
    const updateProfile = async (updates: Partial<UserProfile>) => {
        if (!user) throw new Error('No user logged in');

        const response = await fetch('/api/user/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.username, updates }),
        });

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.message || 'Failed to update profile');
        }

        setUserProfile((prev) => prev ? { ...prev, ...updates } : null);
    };

    // Refresh user profile
    const refreshUserProfile = async () => {
        if (user) {
            await fetchUserProfile(user.username);
        }
    };

    // Refresh user from stored tokens
    const refreshUser = async (): Promise<CognitoAuthUser | null> => {
        try {
            console.log('refreshUser called');
            const idToken = localStorage.getItem('idToken');
            const accessToken = localStorage.getItem('accessToken');
            const userEmail = localStorage.getItem('userEmail');

            console.log('Stored tokens:', {
                hasIdToken: !!idToken,
                hasAccessToken: !!accessToken,
                userEmail
            });

            if (idToken && accessToken && userEmail) {
                const authUser: CognitoAuthUser = {
                    username: userEmail,
                    email: userEmail,
                    attributes: { email: userEmail },
                    session: null as any,
                };

                console.log('Setting user from tokens:', authUser);
                setUser(authUser);
                await fetchUserProfile(userEmail);

                return authUser;
            }
            console.log('No tokens found');
            return null;
        } catch (err) {
            console.error('Error refreshing user:', err);
            return null;
        }
    };

    // Login as demo user (no Cognito needed)
    const loginAsDemo = async () => {
        console.log('Logging in as demo user...');

        // Set synthetic tokens so auth guard passes
        localStorage.setItem('idToken', 'demo-token');
        localStorage.setItem('accessToken', 'demo-token');
        localStorage.setItem('refreshToken', 'demo-token');
        localStorage.setItem('userEmail', 'demo-user-001');

        const demoUser: CognitoAuthUser = {
            username: 'demo-user-001',
            email: 'demo@ovira.ai',
            attributes: { email: 'demo@ovira.ai' },
            session: null as any,
        };

        setUser(demoUser);
        await fetchUserProfile('demo-user-001');
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                userProfile,
                loading,
                error,
                signUp,
                signIn,
                signInWithGoogle,
                logout,
                resetPassword,
                completeOnboarding,
                updateProfile,
                refreshUserProfile,
                refreshUser,
                loginAsDemo,
                clearError,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
