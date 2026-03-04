'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { SUPPORTED_LANGUAGES, HEALTH_CONDITIONS } from '@/types';
// TODO: Replace with AWS DynamoDB and Cognito operations
import {
    ArrowLeft,
    User,
    Globe,
    Shield,
    Download,
    Trash2,
    Save,
    AlertTriangle,
    Check,
    Calendar
} from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
    const { user, userProfile, updateProfile, logout } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // Form state
    // Smart first name extraction: if displayName looks like an email prefix (one word, no spaces),
    // try to extract a proper name by capitalizing the first letter
    const getInitialDisplayName = () => {
        const name = userProfile?.displayName || '';
        if (name && name.includes(' ')) return name; // already has spaces, use as-is
        if (name) {
            // Capitalize first letter for display
            return name.charAt(0).toUpperCase() + name.slice(1);
        }
        return '';
    };

    const [displayName, setDisplayName] = useState(getInitialDisplayName());
    const [language, setLanguage] = useState(userProfile?.language || 'en');
    const [cycleLength, setCycleLength] = useState(userProfile?.averageCycleLength || 28);

    const handleSave = async () => {
        if (!user) return;

        setLoading(true);
        try {
            await updateProfile({
                displayName: displayName.trim(),
                language,
                averageCycleLength: cycleLength,
            });

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExportData = async () => {
        if (!user) return;

        setLoading(true);
        try {
            // TODO: Fetch all user data from DynamoDB
            // const logs = await fetchAllLogsFromDynamoDB(user.uid);

            const exportData = {
                profile: userProfile,
                logs: [],
                exportedAt: new Date().toISOString(),
            };

            // Download as JSON
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `ovira-health-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (!user) return;

        setDeleteLoading(true);
        try {
            // TODO: Delete user data from DynamoDB and Cognito
            // await deleteUserFromDynamoDB(user.uid);
            // await deleteUserFromCognito(user.uid);

            router.push('/login');
        } catch (error: any) {
            console.error('Error deleting account:', error);
            alert('Failed to delete account. Please try again or contact support.');
        } finally {
            setDeleteLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/dashboard"
                    className="p-2 rounded-xl hover:bg-surface-elevated transition-colors"
                >
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">Settings</h1>
                    <p className="text-text-secondary">Manage your account and preferences</p>
                </div>
            </div>

            {/* Success Message */}
            {success && (
                <div className="p-4 rounded-xl bg-success/10 border border-success/20 flex items-center gap-3 animate-fade-in">
                    <Check className="text-success" />
                    <p className="text-success font-medium">Settings saved successfully!</p>
                </div>
            )}

            {/* Profile Settings */}
            <Card variant="elevated">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle>Profile</CardTitle>
                            <CardDescription>Update your personal information</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Input
                        label="Display Name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your name"
                    />
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            Email
                        </label>
                        <div className="px-4 py-3 rounded-xl bg-surface-elevated text-text-secondary">
                            {user?.email}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Cycle Settings */}
            <Card variant="elevated">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                            <CardTitle>Cycle Settings</CardTitle>
                            <CardDescription>Customize your cycle tracking</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            Average Cycle Length
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="21"
                                max="40"
                                value={cycleLength}
                                onChange={(e) => setCycleLength(parseInt(e.target.value))}
                                className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((cycleLength - 21) / 19) * 100
                                        }%, hsl(var(--border)) ${((cycleLength - 21) / 19) * 100}%, hsl(var(--border)) 100%)`,
                                }}
                            />
                            <span className="text-lg font-bold text-primary w-16 text-center">
                                {cycleLength} days
                            </span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Language Settings */}
            <Card variant="elevated">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-secondary" />
                        </div>
                        <div>
                            <CardTitle>Language</CardTitle>
                            <CardDescription>Choose your preferred language</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-2">
                        {SUPPORTED_LANGUAGES.map((lang) => (
                            <button
                                key={lang.code}
                                onClick={() => setLanguage(lang.code)}
                                className={`p-4 rounded-xl border-2 text-left transition-all ${language === lang.code
                                    ? 'border-primary bg-primary/10'
                                    : 'border-border hover:border-primary/50'
                                    }`}
                            >
                                <span className="font-medium">{lang.name}</span>
                            </button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Save Button */}
            <Button
                onClick={handleSave}
                fullWidth
                size="lg"
                isLoading={loading}
                leftIcon={<Save size={20} />}
            >
                Save Changes
            </Button>

            {/* Privacy & Data */}
            <Card variant="elevated">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-success" />
                        </div>
                        <div>
                            <CardTitle>Privacy & Data</CardTitle>
                            <CardDescription>Manage your data and privacy</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button
                        variant="outline"
                        fullWidth
                        onClick={handleExportData}
                        disabled={loading}
                        leftIcon={<Download size={18} />}
                    >
                        Export All Data
                    </Button>
                    <p className="text-sm text-text-muted text-center">
                        Download all your health data as a JSON file
                    </p>
                </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card variant="outlined" className="border-error/30">
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-error" />
                        </div>
                        <div>
                            <CardTitle className="text-error">Danger Zone</CardTitle>
                            <CardDescription>Irreversible actions</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {!showDeleteConfirm ? (
                        <Button
                            variant="danger"
                            fullWidth
                            onClick={() => setShowDeleteConfirm(true)}
                            leftIcon={<Trash2 size={18} />}
                        >
                            Delete Account
                        </Button>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-error/10 border border-error/20">
                                <p className="text-sm text-error font-medium mb-2">
                                    Are you absolutely sure?
                                </p>
                                <p className="text-sm text-text-secondary">
                                    This action cannot be undone. All your data including logs, reports,
                                    and account information will be permanently deleted.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="ghost"
                                    fullWidth
                                    onClick={() => setShowDeleteConfirm(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="danger"
                                    fullWidth
                                    onClick={handleDeleteAccount}
                                    isLoading={deleteLoading}
                                >
                                    Yes, Delete Everything
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
