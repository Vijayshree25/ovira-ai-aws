'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
    ArrowLeft, Bell, BellOff, Clock, Droplets, Pill, Calendar,
    Trash2, Plus, Check, X, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import {
    loadSettings, saveSettings, loadNotifications, dismissNotification,
    clearAllNotifications, getUnreadCount, requestPushPermission,
    ReminderSettings, AppNotification
} from '@/lib/utils/notifications';

type Tab = 'notifications' | 'reminders';

export default function NotificationsPage() {
    const { userProfile } = useAuth();
    const [activeTab, setActiveTab] = useState<Tab>('notifications');
    const [settings, setSettings] = useState<ReminderSettings>(loadSettings());
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // New medication form state
    const [showMedForm, setShowMedForm] = useState(false);
    const [newMedLabel, setNewMedLabel] = useState('');
    const [newMedTime, setNewMedTime] = useState('09:00');

    useEffect(() => {
        setNotifications(loadNotifications());
    }, []);

    const handleDismiss = (id: string) => {
        dismissNotification(id);
        setNotifications(loadNotifications());
    };

    const handleClearAll = () => {
        clearAllNotifications();
        setNotifications([]);
    };

    const updateSettings = (partial: Partial<ReminderSettings>) => {
        const updated = { ...settings, ...partial };
        setSettings(updated);
        saveSettings(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    };

    const handleEnablePush = async () => {
        const granted = await requestPushPermission();
        updateSettings({ pushEnabled: granted });
    };

    const addMedication = () => {
        if (!newMedLabel.trim()) return;
        const med = {
            id: `med-${Date.now()}`,
            enabled: true,
            label: newMedLabel.trim(),
            time: newMedTime,
        };
        updateSettings({ medications: [...settings.medications, med] });
        setNewMedLabel('');
        setNewMedTime('09:00');
        setShowMedForm(false);
    };

    const removeMedication = (id: string) => {
        updateSettings({
            medications: settings.medications.filter(m => m.id !== id),
        });
    };

    const toggleMedication = (id: string) => {
        updateSettings({
            medications: settings.medications.map(m =>
                m.id === id ? { ...m, enabled: !m.enabled } : m
            ),
        });
    };

    // Group notifications by today vs earlier
    const today = new Date().toISOString().split('T')[0];
    const todayNotifs = notifications.filter(n => n.timestamp.startsWith(today));
    const earlierNotifs = notifications.filter(n => !n.timestamp.startsWith(today));
    const unreadCount = getUnreadCount();

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
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">Notifications</h1>
                    <p className="text-text-secondary">Manage reminders and alerts</p>
                </div>
                {unreadCount > 0 && (
                    <span className="bg-accent text-white text-xs font-bold px-2 py-1 rounded-full">
                        {unreadCount} new
                    </span>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-surface-elevated rounded-xl p-1">
                <button
                    onClick={() => setActiveTab('notifications')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'notifications'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                >
                    Notifications {unreadCount > 0 && `(${unreadCount})`}
                </button>
                <button
                    onClick={() => setActiveTab('reminders')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'reminders'
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                >
                    Reminders
                </button>
            </div>

            {/* Save Success */}
            {saveSuccess && (
                <div className="p-3 rounded-xl bg-success/10 border border-success/20 flex items-center gap-2 text-success text-sm animate-fade-in">
                    <Check size={16} /> Settings saved!
                </div>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
                <div className="space-y-4">
                    {notifications.length === 0 ? (
                        <Card variant="elevated">
                            <CardContent className="py-12 text-center">
                                <BellOff className="w-12 h-12 text-text-muted mx-auto mb-4" />
                                <p className="text-text-secondary">No notifications yet</p>
                                <p className="text-sm text-text-muted mt-1">
                                    Set up reminders in the Reminders tab
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {notifications.length > 0 && (
                                <div className="flex justify-end">
                                    <button
                                        onClick={handleClearAll}
                                        className="text-sm text-text-muted hover:text-error transition-colors"
                                    >
                                        Clear all
                                    </button>
                                </div>
                            )}

                            {todayNotifs.length > 0 && (
                                <>
                                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Today</p>
                                    {todayNotifs.map(notif => (
                                        <NotificationItem key={notif.id} notif={notif} onDismiss={handleDismiss} />
                                    ))}
                                </>
                            )}

                            {earlierNotifs.length > 0 && (
                                <>
                                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mt-4">Earlier</p>
                                    {earlierNotifs.map(notif => (
                                        <NotificationItem key={notif.id} notif={notif} onDismiss={handleDismiss} />
                                    ))}
                                </>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* REMINDERS TAB */}
            {activeTab === 'reminders' && (
                <div className="space-y-4">
                    {/* Push Notifications Toggle */}
                    <Card variant="elevated">
                        <CardContent className="pt-5 pb-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Bell className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Push Notifications</p>
                                        <p className="text-xs text-text-muted">Get alerts even when app is closed</p>
                                    </div>
                                </div>
                                <ToggleSwitch
                                    checked={settings.pushEnabled}
                                    onChange={() => {
                                        if (!settings.pushEnabled) {
                                            handleEnablePush();
                                        } else {
                                            updateSettings({ pushEnabled: false });
                                        }
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Period Reminder */}
                    <Card variant="elevated">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                                        <Calendar className="w-5 h-5 text-accent" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Period Reminder</CardTitle>
                                        <CardDescription>Alert before your predicted period</CardDescription>
                                    </div>
                                </div>
                                <ToggleSwitch
                                    checked={settings.periodReminder.enabled}
                                    onChange={() => updateSettings({
                                        periodReminder: { ...settings.periodReminder, enabled: !settings.periodReminder.enabled }
                                    })}
                                />
                            </div>
                        </CardHeader>
                        {settings.periodReminder.enabled && (
                            <CardContent>
                                <div className="flex items-center gap-4">
                                    <label className="text-sm text-text-secondary">Days before:</label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="7"
                                        value={settings.periodReminder.daysBefore}
                                        onChange={e => updateSettings({
                                            periodReminder: { ...settings.periodReminder, daysBefore: parseInt(e.target.value) }
                                        })}
                                        className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
                                        style={{
                                            background: `linear-gradient(to right, hsl(var(--accent)) 0%, hsl(var(--accent)) ${((settings.periodReminder.daysBefore - 1) / 6) * 100}%, hsl(var(--border)) ${((settings.periodReminder.daysBefore - 1) / 6) * 100}%, hsl(var(--border)) 100%)`,
                                        }}
                                    />
                                    <span className="text-sm font-bold text-accent w-16 text-center">
                                        {settings.periodReminder.daysBefore} day{settings.periodReminder.daysBefore > 1 ? 's' : ''}
                                    </span>
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    {/* Daily Log Reminder */}
                    <Card variant="elevated">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-warning" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Daily Log Reminder</CardTitle>
                                        <CardDescription>Remember to track your symptoms</CardDescription>
                                    </div>
                                </div>
                                <ToggleSwitch
                                    checked={settings.dailyLog.enabled}
                                    onChange={() => updateSettings({
                                        dailyLog: { ...settings.dailyLog, enabled: !settings.dailyLog.enabled }
                                    })}
                                />
                            </div>
                        </CardHeader>
                        {settings.dailyLog.enabled && (
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <label className="text-sm text-text-secondary">Remind at:</label>
                                    <input
                                        type="time"
                                        value={settings.dailyLog.time}
                                        onChange={e => updateSettings({
                                            dailyLog: { ...settings.dailyLog, time: e.target.value }
                                        })}
                                        className="px-3 py-2 rounded-lg border bg-surface text-text-primary"
                                    />
                                </div>
                            </CardContent>
                        )}
                    </Card>

                    {/* Medication Reminders */}
                    <Card variant="elevated">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                                        <Pill className="w-5 h-5 text-secondary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Medication Reminders</CardTitle>
                                        <CardDescription>Never miss a pill or supplement</CardDescription>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {settings.medications.map(med => (
                                <div key={med.id} className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated">
                                    <ToggleSwitch
                                        checked={med.enabled}
                                        onChange={() => toggleMedication(med.id)}
                                    />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">{med.label}</p>
                                        <p className="text-xs text-text-muted">{med.time}</p>
                                    </div>
                                    <button
                                        onClick={() => removeMedication(med.id)}
                                        className="p-1.5 rounded-lg hover:bg-error/10 text-text-muted hover:text-error transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}

                            {showMedForm ? (
                                <div className="p-3 rounded-xl border border-border space-y-3">
                                    <input
                                        type="text"
                                        placeholder="Medication name"
                                        value={newMedLabel}
                                        onChange={e => setNewMedLabel(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg border bg-surface text-text-primary placeholder:text-text-muted"
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            type="time"
                                            value={newMedTime}
                                            onChange={e => setNewMedTime(e.target.value)}
                                            className="px-3 py-2 rounded-lg border bg-surface text-text-primary"
                                        />
                                        <Button size="sm" onClick={addMedication}>Add</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setShowMedForm(false)}>Cancel</Button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowMedForm(true)}
                                    className="flex items-center gap-2 w-full p-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 text-text-muted hover:text-primary transition-colors text-sm"
                                >
                                    <Plus size={16} /> Add Medication
                                </button>
                            )}
                        </CardContent>
                    </Card>

                    {/* Hydration Reminder */}
                    <Card variant="elevated">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center">
                                        <Droplets className="w-5 h-5 text-info" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-base">Hydration Reminder</CardTitle>
                                        <CardDescription>Stay hydrated during your period</CardDescription>
                                    </div>
                                </div>
                                <ToggleSwitch
                                    checked={settings.hydration.enabled}
                                    onChange={() => updateSettings({
                                        hydration: { ...settings.hydration, enabled: !settings.hydration.enabled }
                                    })}
                                />
                            </div>
                        </CardHeader>
                        {settings.hydration.enabled && (
                            <CardContent>
                                <div className="flex items-center gap-3">
                                    <label className="text-sm text-text-secondary">Remind every:</label>
                                    <select
                                        value={settings.hydration.intervalMinutes}
                                        onChange={e => updateSettings({
                                            hydration: { ...settings.hydration, intervalMinutes: parseInt(e.target.value) }
                                        })}
                                        className="px-3 py-2 rounded-lg border bg-surface text-text-primary"
                                    >
                                        <option value={30}>30 minutes</option>
                                        <option value={60}>1 hour</option>
                                        <option value={120}>2 hours</option>
                                    </select>
                                </div>
                                <p className="text-xs text-text-muted mt-2 flex items-center gap-1">
                                    <AlertCircle size={12} />
                                    Active only during your menstrual phase
                                </p>
                            </CardContent>
                        )}
                    </Card>
                </div>
            )}
        </div>
    );
}

// Notification list item
function NotificationItem({ notif, onDismiss }: { notif: AppNotification; onDismiss: (id: string) => void }) {
    const iconMap: Record<string, React.ReactNode> = {
        period: <Calendar className="w-5 h-5 text-accent" />,
        'daily-log': <Clock className="w-5 h-5 text-warning" />,
        medication: <Pill className="w-5 h-5 text-secondary" />,
        hydration: <Droplets className="w-5 h-5 text-info" />,
    };

    const time = new Date(notif.timestamp);
    const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className={`flex items-start gap-3 p-4 rounded-xl transition-colors ${notif.read ? 'bg-surface' : 'bg-primary/5 border border-primary/10'
            }`}>
            <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center flex-shrink-0">
                {iconMap[notif.type] || <Bell className="w-5 h-5 text-text-muted" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className={`text-sm ${notif.read ? 'text-text-secondary' : 'font-medium text-text-primary'}`}>
                    {notif.title}
                </p>
                <p className="text-xs text-text-muted mt-0.5">{notif.body}</p>
                <p className="text-xs text-text-muted mt-1">{timeStr}</p>
            </div>
            {!notif.read && (
                <button
                    onClick={() => onDismiss(notif.id)}
                    className="p-1.5 rounded-lg hover:bg-surface-elevated text-text-muted hover:text-text-primary transition-colors"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
}

// Toggle switch component
function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
        <button
            onClick={onChange}
            className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-border'
                }`}
        >
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${checked ? 'translate-x-5' : 'translate-x-0'
                }`} />
        </button>
    );
}
