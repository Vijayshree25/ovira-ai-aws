'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';

type AuthStep = 'initial' | 'otp-challenge' | 'authenticated';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [authStep, setAuthStep] = useState<AuthStep>('initial');
    const [session, setSession] = useState<string>('');

    const router = useRouter();
    const { refreshUser, userProfile } = useAuth();

    const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Authentication failed');
            }

            console.log('Login response:', data);

            // Check if we need OTP verification
            if (data.challengeName === 'EMAIL_OTP') {
                setSession(data.session);
                setAuthStep('otp-challenge');
            } else if (data.authenticationResult) {
                // Store tokens in localStorage
                localStorage.setItem('idToken', data.authenticationResult.IdToken);
                localStorage.setItem('accessToken', data.authenticationResult.AccessToken);
                localStorage.setItem('refreshToken', data.authenticationResult.RefreshToken);

                // Also store email for session reconstruction
                localStorage.setItem('userEmail', email);

                // Wait for AuthContext to initialize user state
                await refreshUser();

                // Small delay to ensure state is set
                await new Promise(resolve => setTimeout(resolve, 500));

                // Check if user needs onboarding
                const storedEmail = localStorage.getItem('userEmail') || email;
                try {
                    const profileRes = await fetch(`/api/user/profile?userId=${encodeURIComponent(storedEmail)}`);
                    const profileData = await profileRes.json();
                    if (profileData.success && profileData.profile && profileData.profile.onboardingComplete) {
                        router.push('/dashboard');
                    } else {
                        router.push('/onboarding');
                    }
                } catch {
                    // Fallback: let dashboard layout handle the redirect
                    router.push('/dashboard');
                }
            } else {
                throw new Error('No authentication result or challenge received');
            }
        } catch (err: any) {
            console.error('Authentication error:', err);
            const errorMsg = getErrorMessage(err.message || err.error);

            // Special handling for unverified users
            if (errorMsg === 'UNVERIFIED_USER') {
                setError('Your email is not verified. Redirecting to verification page...');
                setTimeout(() => {
                    router.push(`/verify?email=${encodeURIComponent(email)}`);
                }, 2000);
            } else {
                setError(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOTPSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email,
                    challengeResponse: otpCode,
                    session,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Verification failed');
            }

            console.log('OTP verification response:', data);

            if (data.authenticationResult) {
                // Store tokens
                localStorage.setItem('idToken', data.authenticationResult.IdToken);
                localStorage.setItem('accessToken', data.authenticationResult.AccessToken);
                localStorage.setItem('refreshToken', data.authenticationResult.RefreshToken);
                localStorage.setItem('userEmail', email);

                // Wait for AuthContext to initialize user state
                await refreshUser();

                // Small delay to ensure state is set
                await new Promise(resolve => setTimeout(resolve, 500));

                // Clear form data
                setEmail('');
                setPassword('');
                setOtpCode('');

                // Check if user needs onboarding
                const storedEmail = localStorage.getItem('userEmail') || email;
                try {
                    const profileRes = await fetch(`/api/user/profile?userId=${encodeURIComponent(storedEmail)}`);
                    const profileData = await profileRes.json();
                    if (profileData.success && profileData.profile && profileData.profile.onboardingComplete) {
                        router.push('/dashboard');
                    } else {
                        router.push('/onboarding');
                    }
                } catch {
                    router.push('/dashboard');
                }
            } else {
                throw new Error('No authentication result received');
            }
        } catch (err: any) {
            console.error('OTP verification error:', err);
            setError(getErrorMessage(err.message || err.error));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-teal-50 via-white to-teal-50">
            <div className="w-full max-w-md animate-slide-in-up">
                {/* Logo/Brand */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-teal-600 mb-2">Ovira AI</h1>
                    <p className="text-gray-600">Your personal women&apos;s health companion</p>
                </div>

                <Card variant="elevated" padding="lg">
                    <CardHeader>
                        <CardTitle>
                            {authStep === 'initial' ? 'Welcome Back' : 'Verify Your Email'}
                        </CardTitle>
                        <CardDescription>
                            {authStep === 'initial'
                                ? 'Sign in to continue tracking your health'
                                : `We sent a verification code to ${email}`
                            }
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        {error && (
                            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                                {error}
                            </div>
                        )}

                        {authStep === 'initial' && (
                            <form onSubmit={handleEmailPasswordSubmit} className="space-y-4">
                                <Input
                                    label="Email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    leftIcon={<Mail size={20} />}
                                    required
                                    disabled={loading}
                                />

                                <Input
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    leftIcon={<Lock size={20} />}
                                    rightIcon={
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="hover:text-teal-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                    }
                                    required
                                    disabled={loading}
                                />

                                <Button type="submit" fullWidth isLoading={loading}>
                                    Sign In
                                </Button>
                            </form>
                        )}

                        {authStep === 'otp-challenge' && (
                            <form onSubmit={handleOTPSubmit} className="space-y-4">
                                <Input
                                    label="Verification Code"
                                    type="text"
                                    placeholder="Enter 6-digit code"
                                    value={otpCode}
                                    onChange={(e) => setOtpCode(e.target.value)}
                                    maxLength={6}
                                    required
                                    disabled={loading}
                                />

                                <Button type="submit" fullWidth isLoading={loading}>
                                    Verify Code
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>

                <p className="mt-4 text-center text-sm text-gray-600">
                    Don&apos;t have an account?{' '}
                    <a href="/signup" className="font-semibold text-teal-600 hover:text-teal-700 transition-colors">
                        Sign Up
                    </a>
                </p>

                <p className="mt-4 text-center text-xs text-gray-500 px-4">
                    By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
            </div>
        </div>
    );
}

function getErrorMessage(error: string): string {
    if (error.includes('UserNotConfirmedException') || error.includes('not confirmed')) {
        return 'UNVERIFIED_USER';
    }
    if (error.includes('NotAuthorizedException') || error.includes('Incorrect')) {
        return 'Incorrect email or password';
    }
    if (error.includes('UserNotFoundException') || error.includes('not found')) {
        return 'No account found with this email';
    }
    if (error.includes('CodeMismatchException') || error.includes('Invalid')) {
        return 'Invalid verification code';
    }
    if (error.includes('ExpiredCodeException') || error.includes('expired')) {
        return 'Verification code expired. Please request a new one';
    }
    if (error.includes('NetworkError') || error.includes('network')) {
        return 'Connection error. Please check your internet connection';
    }
    if (error.includes('TooManyRequestsException') || error.includes('Too many')) {
        return 'Too many attempts. Please try again later';
    }
    return error || 'An error occurred. Please try again';
}
