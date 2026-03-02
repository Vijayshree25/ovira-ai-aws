'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Mail, Lock, Eye, EyeOff, User, Check } from 'lucide-react';

type SignupStep = 'initial' | 'verify-email' | 'complete';

export default function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [signupStep, setSignupStep] = useState<SignupStep>('initial');

    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        if (!acceptTerms) {
            setError('Please accept the terms and conditions');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/signup-new', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, name }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Signup failed');
            }

            console.log('Signup response:', data);
            setSignupStep('verify-email');
        } catch (err: any) {
            console.error('Signup error:', err);
            setError(getAmplifyErrorMessage(err.message || err.error));
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/signup-new', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, verificationCode }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Verification failed');
            }

            console.log('Verification response:', data);
            
            // Auto login after verification
            const loginResponse = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const loginData = await loginResponse.json();

            if (loginData.success && loginData.authenticationResult) {
                localStorage.setItem('idToken', loginData.authenticationResult.IdToken);
                localStorage.setItem('accessToken', loginData.authenticationResult.AccessToken);
                localStorage.setItem('refreshToken', loginData.authenticationResult.RefreshToken);
                
                setSignupStep('complete');
                router.push('/onboarding');
            }
        } catch (err: any) {
            console.error('Verification error:', err);
            setError(getAmplifyErrorMessage(err.message || err.error));
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/resend-code', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to resend code');
            }

            alert('Verification code resent! Check your email.');
        } catch (err: any) {
            console.error('Resend error:', err);
            setError(getAmplifyErrorMessage(err.message || err.error));
        } finally {
            setLoading(false);
        }
    };

    const passwordStrength = getPasswordStrength(password);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-teal-50 via-white to-teal-50">
            <div className="w-full max-w-md animate-slide-in-up">
                {/* Logo/Brand */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-teal-600 mb-2">Ovira AI</h1>
                    <p className="text-gray-600">
                        {signupStep === 'initial' ? 'Start your health journey today' : 'Verify your email'}
                    </p>
                </div>

                <Card variant="elevated" padding="lg">
                    <CardHeader>
                        <CardTitle>
                            {signupStep === 'initial' ? 'Create Account' : 'Check Your Email'}
                        </CardTitle>
                        <CardDescription>
                            {signupStep === 'initial' 
                                ? 'Join thousands tracking their wellness'
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

                        {signupStep === 'initial' && (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input
                                    label="Full Name"
                                    type="text"
                                    placeholder="Your name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    leftIcon={<User size={20} />}
                                    required
                                    disabled={loading}
                                />

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

                                <div>
                                    <Input
                                        label="Password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="At least 8 characters"
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
                                    {password && (
                                        <div className="mt-2">
                                            <div className="flex gap-1 mb-1">
                                                {[1, 2, 3, 4].map((level) => (
                                                    <div
                                                        key={level}
                                                        className={`h-1 flex-1 rounded-full transition-colors ${level <= passwordStrength.level
                                                                ? passwordStrength.color
                                                                : 'bg-border'
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <p className={`text-xs ${passwordStrength.textColor}`}>
                                                {passwordStrength.label}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <Input
                                    label="Confirm Password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Confirm your password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    leftIcon={<Lock size={20} />}
                                    error={confirmPassword && password !== confirmPassword ? 'Passwords do not match' : undefined}
                                    required
                                    disabled={loading}
                                />

                                {/* Terms Checkbox */}
                                <label className="flex items-start gap-3 cursor-pointer group">
                                    <div
                                        className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${acceptTerms
                                                ? 'bg-teal-600 border-teal-600'
                                                : 'border-gray-300 group-hover:border-teal-600'
                                            }`}
                                        onClick={() => setAcceptTerms(!acceptTerms)}
                                    >
                                        {acceptTerms && <Check size={14} className="text-white" />}
                                    </div>
                                    <span className="text-sm text-gray-600">
                                        I agree to the{' '}
                                        <Link href="/terms" className="text-teal-600 hover:underline">
                                            Terms of Service
                                        </Link>{' '}
                                        and{' '}
                                        <Link href="/privacy" className="text-teal-600 hover:underline">
                                            Privacy Policy
                                        </Link>
                                    </span>
                                </label>

                                <Button type="submit" fullWidth isLoading={loading} disabled={!acceptTerms}>
                                    Create Account
                                </Button>

                                <p className="mt-6 text-center text-sm text-gray-600">
                                    Already have an account?{' '}
                                    <Link href="/login" className="text-teal-600 hover:text-teal-700 font-medium">
                                        Sign in
                                    </Link>
                                </p>
                            </form>
                        )}

                        {signupStep === 'verify-email' && (
                            <form onSubmit={handleVerifyEmail} className="space-y-4">
                                <Input
                                    label="Verification Code"
                                    type="text"
                                    placeholder="Enter 6-digit code"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    maxLength={6}
                                    required
                                    disabled={loading}
                                />

                                <Button type="submit" fullWidth isLoading={loading}>
                                    Verify Email
                                </Button>

                                <p className="text-center text-sm text-gray-600">
                                    Didn't receive the code?{' '}
                                    <button
                                        type="button"
                                        onClick={handleResendCode}
                                        disabled={loading}
                                        className="text-teal-600 hover:text-teal-700 font-medium disabled:opacity-50"
                                    >
                                        Resend Code
                                    </button>
                                </p>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function getPasswordStrength(password: string) {
    let score = 0;

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) {
        return { level: 1, label: 'Weak', color: 'bg-error', textColor: 'text-error' };
    } else if (score <= 2) {
        return { level: 2, label: 'Fair', color: 'bg-warning', textColor: 'text-warning' };
    } else if (score <= 3) {
        return { level: 3, label: 'Good', color: 'bg-info', textColor: 'text-info' };
    } else {
        return { level: 4, label: 'Strong', color: 'bg-success', textColor: 'text-success' };
    }
}

function getAmplifyErrorMessage(error: string): string {
    if (error.includes('UsernameExistsException') || error.includes('already exists')) {
        return 'An account with this email already exists';
    }
    if (error.includes('InvalidPasswordException') || error.includes('Password')) {
        return 'Password must be at least 8 characters with uppercase, lowercase, and numbers';
    }
    if (error.includes('InvalidParameterException') || error.includes('Invalid')) {
        return 'Invalid email or password format';
    }
    if (error.includes('CodeMismatchException') || error.includes('verification code')) {
        return 'Invalid verification code';
    }
    if (error.includes('ExpiredCodeException') || error.includes('expired')) {
        return 'Verification code has expired';
    }
    if (error.includes('TooManyRequestsException') || error.includes('Too many')) {
        return 'Too many attempts. Please try again later';
    }
    if (error.includes('LimitExceededException') || error.includes('limit')) {
        return 'Attempt limit exceeded. Please try again later';
    }
    if (error.includes('NetworkError') || error.includes('network')) {
        return 'Network error. Please check your connection';
    }
    return error || 'An error occurred. Please try again';
}

function getErrorMessage(code: string): string {
    switch (code) {
        case 'auth/email-already-in-use':
            return 'An account with this email already exists';
        case 'auth/invalid-email':
            return 'Invalid email address';
        case 'auth/weak-password':
            return 'Password is too weak';
        case 'auth/popup-closed-by-user':
            return 'Sign-up cancelled';
        default:
            return 'An error occurred. Please try again';
    }
}
