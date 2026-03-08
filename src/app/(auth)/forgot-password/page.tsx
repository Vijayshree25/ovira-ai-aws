'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react';

type ResetStep = 'email' | 'code' | 'success';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetStep, setResetStep] = useState<ResetStep>('email');

    const router = useRouter();

    const handleSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to send reset code');
            }

            setResetStep('code');
        } catch (err: any) {
            setError(err.message || 'Failed to send reset code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code, newPassword }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to reset password');
            }

            setResetStep('success');
            setTimeout(() => {
                router.push('/login');
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to reset password. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to resend code');
            }

            setError('New code sent! Check your email.');
        } catch (err: any) {
            setError(err.message || 'Failed to resend code.');
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
                    <p className="text-gray-600">Reset your password</p>
                </div>

                <Card variant="elevated" padding="lg">
                    {/* Success State */}
                    {resetStep === 'success' && (
                        <>
                            <CardContent>
                                <div className="text-center py-6">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                        <CheckCircle className="w-8 h-8 text-green-600" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Password Reset Successful!</h2>
                                    <p className="text-gray-600 mb-4">Your password has been changed. Redirecting to login...</p>
                                    <Link
                                        href="/login"
                                        className="text-teal-600 hover:text-teal-700 font-medium"
                                    >
                                        Go to Login
                                    </Link>
                                </div>
                            </CardContent>
                        </>
                    )}

                    {/* Step 1: Enter Email */}
                    {resetStep === 'email' && (
                        <>
                            <CardHeader>
                                <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
                                    <KeyRound className="w-7 h-7 text-teal-600" />
                                </div>
                                <CardTitle>Forgot Password?</CardTitle>
                                <CardDescription>
                                    Enter your email and we&apos;ll send you a code to reset your password.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {error && (
                                    <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                                        {error}
                                    </div>
                                )}
                                <form onSubmit={handleSendCode} className="space-y-4">
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
                                    <Button type="submit" fullWidth isLoading={loading}>
                                        Send Reset Code
                                    </Button>
                                </form>

                                <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                                    <Link
                                        href="/login"
                                        className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700"
                                    >
                                        <ArrowLeft size={16} />
                                        Back to Login
                                    </Link>
                                </div>
                            </CardContent>
                        </>
                    )}

                    {/* Step 2: Enter Code + New Password */}
                    {resetStep === 'code' && (
                        <>
                            <CardHeader>
                                <div className="mx-auto w-14 h-14 rounded-2xl bg-teal-50 flex items-center justify-center mb-4">
                                    <Mail className="w-7 h-7 text-teal-600" />
                                </div>
                                <CardTitle>Check Your Email</CardTitle>
                                <CardDescription>
                                    We sent a reset code to <strong>{email}</strong>. Enter it below along with your new password.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {error && (
                                    <div className={`mb-4 p-3 rounded-lg border text-sm ${error.includes('sent')
                                            ? 'bg-green-50 border-green-200 text-green-700'
                                            : 'bg-red-50 border-red-200 text-red-600'
                                        }`}>
                                        {error}
                                    </div>
                                )}
                                <form onSubmit={handleResetPassword} className="space-y-4">
                                    <Input
                                        label="Verification Code"
                                        type="text"
                                        placeholder="Enter 6-digit code"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        maxLength={6}
                                        required
                                        disabled={loading}
                                    />
                                    <Input
                                        label="New Password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="At least 8 characters"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
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
                                    <Input
                                        label="Confirm New Password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Confirm your new password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        leftIcon={<Lock size={20} />}
                                        error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
                                        required
                                        disabled={loading}
                                    />
                                    <Button type="submit" fullWidth isLoading={loading}>
                                        Reset Password
                                    </Button>
                                </form>

                                <div className="mt-4 text-center">
                                    <p className="text-sm text-gray-600 mb-2">
                                        Didn&apos;t receive the code?
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleResendCode}
                                        disabled={loading}
                                        className="text-sm text-teal-600 hover:text-teal-700 font-medium disabled:opacity-50"
                                    >
                                        Resend Code
                                    </button>
                                </div>

                                <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                                    <Link
                                        href="/login"
                                        className="inline-flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700"
                                    >
                                        <ArrowLeft size={16} />
                                        Back to Login
                                    </Link>
                                </div>
                            </CardContent>
                        </>
                    )}
                </Card>
            </div>
        </div>
    );
}
