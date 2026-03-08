// Notification types and utilities for Ovira AI reminders
// Uses localStorage for persistence (works offline in PWA)

export type ReminderType = 'period' | 'daily-log' | 'medication' | 'hydration';

export interface ReminderSettings {
    periodReminder: {
        enabled: boolean;
        daysBefore: number; // 1-7
    };
    dailyLog: {
        enabled: boolean;
        time: string; // HH:mm format
    };
    medications: Array<{
        id: string;
        enabled: boolean;
        label: string;
        time: string; // HH:mm format
    }>;
    hydration: {
        enabled: boolean;
        intervalMinutes: number; // 30, 60, 120
    };
    pushEnabled: boolean;
}

export interface AppNotification {
    id: string;
    type: ReminderType;
    title: string;
    body: string;
    timestamp: string; // ISO string
    read: boolean;
    actionUrl?: string;
}

const SETTINGS_KEY = 'ovira-reminder-settings';
const NOTIFICATIONS_KEY = 'ovira-notifications';
const LAST_CHECK_KEY = 'ovira-last-notification-check';

// Default settings
export function getDefaultSettings(): ReminderSettings {
    return {
        periodReminder: { enabled: true, daysBefore: 3 },
        dailyLog: { enabled: true, time: '20:00' },
        medications: [],
        hydration: { enabled: true, intervalMinutes: 60 },
        pushEnabled: false,
    };
}

// Load/save settings
export function loadSettings(): ReminderSettings {
    if (typeof window === 'undefined') return getDefaultSettings();
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        if (stored) return { ...getDefaultSettings(), ...JSON.parse(stored) };
    } catch { /* ignore */ }
    return getDefaultSettings();
}

export function saveSettings(settings: ReminderSettings): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));

    // Sync to service worker for offline notifications
    syncSettingsToSW(settings);
}

// Load/save notifications
export function loadNotifications(): AppNotification[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(NOTIFICATIONS_KEY);
        if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return [];
}

function saveNotifications(notifications: AppNotification[]): void {
    if (typeof window === 'undefined') return;
    // Keep last 50 notifications
    const trimmed = notifications.slice(0, 50);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(trimmed));
}

// Dismiss / mark read
export function dismissNotification(id: string): void {
    const notifications = loadNotifications();
    const updated = notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
    );
    saveNotifications(updated);
}

export function clearAllNotifications(): void {
    saveNotifications([]);
}

export function getUnreadCount(): number {
    return loadNotifications().filter(n => !n.read).length;
}

// Request push notification permission
export async function requestPushPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) return false;

    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;

    const result = await Notification.requestPermission();
    return result === 'granted';
}

// Show a browser push notification
export function showPushNotification(title: string, body: string, actionUrl?: string): void {
    if (typeof window === 'undefined') return;

    // Try service worker notification first (works offline in PWA)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'SHOW_NOTIFICATION',
            title,
            body,
            actionUrl: actionUrl || '/notifications',
        });
        return;
    }

    // Fallback to regular Notification API
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
        });
    }
}

// Sync settings to service worker for offline scheduling
function syncSettingsToSW(settings: ReminderSettings): void {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'SYNC_REMINDER_SETTINGS',
            settings,
        });
    }
}

// Generate a unique notification ID
function genId(): string {
    return `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// Check current time against HH:mm string
function isTimeToNotify(timeStr: string, toleranceMinutes: number = 5): boolean {
    const now = new Date();
    const [h, m] = timeStr.split(':').map(Number);
    const targetMinutes = h * 60 + m;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return Math.abs(currentMinutes - targetMinutes) <= toleranceMinutes;
}

// Check if a notification was already sent today for a given type+key
function alreadySentToday(type: string, key: string): boolean {
    const notifications = loadNotifications();
    const today = new Date().toISOString().split('T')[0];
    return notifications.some(n =>
        n.type === type && n.id.includes(key) && n.timestamp.startsWith(today)
    );
}

interface CycleInfoForNotifications {
    daysUntilNextPeriod: number;
    currentPhase: string;
    cycleDay: number;
}

/**
 * Check all reminder conditions and generate notifications.
 * Call this on app load and periodically.
 */
export function checkAndGenerateNotifications(
    settings: ReminderSettings,
    cycleInfo?: CycleInfoForNotifications | null,
): AppNotification[] {
    const newNotifications: AppNotification[] = [];

    // 1. Period reminder
    if (settings.periodReminder.enabled && cycleInfo) {
        const daysUntil = cycleInfo.daysUntilNextPeriod;
        if (daysUntil >= 0 && daysUntil <= settings.periodReminder.daysBefore) {
            const key = `period-${daysUntil}`;
            if (!alreadySentToday('period', key)) {
                const notif: AppNotification = {
                    id: genId() + '-' + key,
                    type: 'period',
                    title: daysUntil === 0
                        ? '🔴 Period Expected Today'
                        : `🔴 Period in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
                    body: daysUntil === 0
                        ? 'Your period is expected today. Take care of yourself!'
                        : `Your period is expected in ${daysUntil} day${daysUntil > 1 ? 's' : ''}. Time to prepare!`,
                    timestamp: new Date().toISOString(),
                    read: false,
                    actionUrl: '/dashboard',
                };
                newNotifications.push(notif);
            }
        }
    }

    // 2. Daily log reminder
    if (settings.dailyLog.enabled) {
        if (isTimeToNotify(settings.dailyLog.time) && !alreadySentToday('daily-log', 'daily')) {
            const notif: AppNotification = {
                id: genId() + '-daily',
                type: 'daily-log',
                title: '📝 Time to Log Your Symptoms',
                body: 'Track how you\'re feeling today for better health insights.',
                timestamp: new Date().toISOString(),
                read: false,
                actionUrl: '/log',
            };
            newNotifications.push(notif);
        }
    }

    // 3. Medication reminders
    for (const med of settings.medications) {
        if (med.enabled && isTimeToNotify(med.time) && !alreadySentToday('medication', med.id)) {
            const notif: AppNotification = {
                id: genId() + '-' + med.id,
                type: 'medication',
                title: `💊 ${med.label || 'Medication'} Reminder`,
                body: `It's time to take your ${med.label || 'medication'}.`,
                timestamp: new Date().toISOString(),
                read: false,
            };
            newNotifications.push(notif);
        }
    }

    // 4. Hydration reminder (during period/menstrual phase)
    if (settings.hydration.enabled && cycleInfo) {
        const isPeriod = cycleInfo.currentPhase === 'Menstrual';
        if (isPeriod) {
            const lastCheck = localStorage.getItem(LAST_CHECK_KEY);
            const now = Date.now();
            const intervalMs = settings.hydration.intervalMinutes * 60 * 1000;
            const lastTime = lastCheck ? parseInt(lastCheck) : 0;

            if (now - lastTime >= intervalMs) {
                const notif: AppNotification = {
                    id: genId() + '-hydration',
                    type: 'hydration',
                    title: '💧 Stay Hydrated',
                    body: 'You\'re on your period — drink some water to help with cramps and fatigue.',
                    timestamp: new Date().toISOString(),
                    read: false,
                };
                newNotifications.push(notif);
                localStorage.setItem(LAST_CHECK_KEY, now.toString());
            }
        }
    }

    // Save new notifications
    if (newNotifications.length > 0) {
        const existing = loadNotifications();
        saveNotifications([...newNotifications, ...existing]);

        // Fire push notifications if enabled
        if (settings.pushEnabled && Notification.permission === 'granted') {
            for (const notif of newNotifications) {
                showPushNotification(notif.title, notif.body, notif.actionUrl);
            }
        }
    }

    return newNotifications;
}
