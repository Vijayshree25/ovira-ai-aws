'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Mail, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function VerifyPage() {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email') || '';

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Verification failed');
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/login');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Verification failed. Please try again');
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
                throw new Error(data.error || 'Failed to resend code');
            }

            setError('Verification code sent! Check your email.');
        } catch (err: any) {
            setError(err.message || 'Failed to resend code');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
                <Card variant="elevated" padding="lg" className="w-full max-w-md text-center">
                    <CardContent>
                        <div className="mx-auto w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                            <Mail className="w-8 h-8 text-success" />
                        </div>
                        <h2 className="text-2xl font-bold mb-2">Email Verified!</h2>
                        <p className="text-text-secondary">Redirecting to login...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
            <div className="w-full max-w-md animate-slide-in-up">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold gradient-text mb-2">Ovira AI</h1>
                    <p className="text-text-secondary">Verify your email address</p>
                </div>

                <Card variant="elevated" padding="lg">
                    <CardHeader>
                        <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                            <Mail className="w-7 h-7 text-primary" />
                        </div>
                        <CardTitle>Check Your Email</CardTitle>
                        <CardDescription>
                            We sent a verification code to <strong>{email}</strong>
                        </CardDescription>
                    </CardHeader>

                    <CardContent>
                        {error && (
                            <div className={`mb-4 p-3 rounded-lg border text-sm ${
                                error.includes('sent') 
                                    ? 'bg-success/10 border-success/20 text-success'
                                    : 'bg-error/10 border-error/20 text-error'
                            }`}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleVerify} className="space-y-4">
                            <Input
                                label="Verification Code"
                                type="text"
                                placeholder="Enter 6-digit code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                maxLength={6}
                                required
                                autoFocus
                            />

                            <Button type="submit" fullWidth isLoading={loading}>
                                Verify Email
                            </Button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-text-secondary mb-3">
                                Didn't receive the code?
                            </p>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={handleResendCode}
                                disabled={loading}
                            >
                                Resend Code
                            </Button>
                        </div>

                        <div className="mt-6 pt-6 border-t border-border text-center">
                            <Link
                                href="/login"
                                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary-dark"
                            >
                                <ArrowLeft size={16} />
                                Back to Login
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
