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
import {
    createUserProfile,
    getUserProfile,
    updateUserProfile as updateUserProfileDB,
} from '@/lib/aws/dynamodb';
import { UserProfile, OnboardingData } from '@/types';

interface AuthContextType {
    user: CognitoAuthUser | null;
    userProfile: UserProfile | null;
    loading: boolean;
    error: string | null;
    signUp: (email: string, password: string, displayName: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    completeOnboarding: (data: OnboardingData) => Promise<void>;
    refreshUserProfile: () => Promise<void>;
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

    // Fetch user profile from DynamoDB
    const fetchUserProfile = async (userId: string) => {
        try {
            const profile = await getUserProfile(userId);
            setUserProfile(profile);
        } catch (err: any) {
            console.error('Error fetching user profile:', err);
            if (!err.message?.includes('offline')) {
                setError('Unable to load profile. Please check your connection.');
            }
            setUserProfile(null);
        }
    };

    // Check for current user on mount
    useEffect(() => {
        if (!mounted) {
            setLoading(false);
            return;
        }

        const checkCurrentUser = async () => {
            try {
                const currentUser = await getCurrentUser();
                setUser(currentUser);

                if (currentUser) {
                    await fetchUserProfile(currentUser.username);
                } else {
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

        const updates: Partial<UserProfile> = {
            ageRange: data.ageRange,
            conditions: data.conditions,
            language: data.language,
            onboardingComplete: true,
        };

        await updateUserProfileDB(user.username, updates);
        setUserProfile((prev) => prev ? { ...prev, ...updates } : null);
    };

    // Refresh user profile
    const refreshUserProfile = async () => {
        if (user) {
            await fetchUserProfile(user.username);
        }
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
                refreshUserProfile,
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
