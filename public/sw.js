// Ovira AI — Custom Service Worker (No npm packages)
const CACHE_NAME = 'ovira-ai-v1';
const OFFLINE_URL = '/offline.html';

// Pre-cache ONLY predictable static files (NOT /_next/static/* which has hashed names)
const PRECACHE_ASSETS = [
    OFFLINE_URL,
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png',
    '/icons/icon-maskable-192x192.png',
    '/icons/icon-maskable-512x512.png',
    '/icons/apple-touch-icon.png',
];

// ─── Install: Pre-cache essential static assets ───
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Pre-caching offline assets');
            return cache.addAll(PRECACHE_ASSETS);
        })
    );
    self.skipWaiting();
});

// ─── Activate: Clean up old caches ───
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) =>
            Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            )
        )
    );
    self.clients.claim();
});

// ─── Fetch: Route requests to the appropriate strategy ───
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests and non-HTTP(S) protocols
    if (request.method !== 'GET') return;
    if (!url.protocol.startsWith('http')) return;

    // 1) API Calls (/api/*) → Network-First, fall back to cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // 2) Next.js Static Assets & Images → Cache-First (Runtime Caching)
    if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/images/') || url.pathname.startsWith('/icons/')) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // 3) Navigation Requests (HTML pages) → Network-First with offline fallback
    if (request.mode === 'navigate') {
        event.respondWith(navigationHandler(request));
        return;
    }

    // 4) Everything else → Cache-First
    event.respondWith(cacheFirst(request));
});

// ─── Strategy: Network-First ───
// Try network, if it fails serve from cache (good for API data)
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cached = await caches.match(request);
        return cached || new Response(
            JSON.stringify({ success: false, error: 'Offline', message: 'You are currently offline.' }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// ─── Strategy: Cache-First ───
// Serve from cache if available, otherwise fetch from network and cache it
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        // For non-critical assets, just return a basic offline response
        return new Response('', { status: 408 });
    }
}

// ─── Strategy: Navigation Handler ───
// Network-first for pages, offline.html fallback if fully offline
async function navigationHandler(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        // Try serving the cached version of the page first
        const cached = await caches.match(request);
        if (cached) return cached;

        // Last resort: serve the offline fallback page
        return caches.match(OFFLINE_URL);
    }
}

// ═══════════════════════════════════════════════════════
// ─── Offline Notifications & Reminders ───
// ═══════════════════════════════════════════════════════

// In-memory store for reminder settings (synced from main app)
let reminderSettings = null;
let lastDailyLogNotif = 0;
let lastHydrationNotif = 0;
let lastMedNotifs = {};

// ─── Listen for messages from the app ───
self.addEventListener('message', (event) => {
    const { type } = event.data;

    if (type === 'SHOW_NOTIFICATION') {
        const { title, body, actionUrl } = event.data;
        self.registration.showNotification(title, {
            body,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-192x192.png',
            vibrate: [200, 100, 200],
            tag: 'ovira-' + Date.now(),
            data: { actionUrl: actionUrl || '/notifications' },
        });
    }

    if (type === 'SYNC_REMINDER_SETTINGS') {
        reminderSettings = event.data.settings;
        console.log('[SW] Reminder settings synced:', reminderSettings);
    }
});

// ─── Handle notification click: open the app ───
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.actionUrl || '/dashboard';

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
            // Focus existing window if open
            for (const client of clients) {
                if (client.url.includes(self.location.origin)) {
                    client.focus();
                    client.navigate(url);
                    return;
                }
            }
            // Otherwise open new window
            return self.clients.openWindow(url);
        })
    );
});

// ─── Periodic offline reminder check (runs every 60s) ───
function checkOfflineReminders() {
    if (!reminderSettings) return;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Daily log reminder
    if (reminderSettings.dailyLog?.enabled) {
        const [h, m] = reminderSettings.dailyLog.time.split(':').map(Number);
        const targetMinutes = h * 60 + m;
        if (Math.abs(currentMinutes - targetMinutes) <= 2 && (Date.now() - lastDailyLogNotif) > 300000) {
            self.registration.showNotification('📝 Time to Log Your Symptoms', {
                body: 'Track how you\'re feeling today for better health insights.',
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-192x192.png',
                vibrate: [200, 100, 200],
                tag: 'ovira-daily-log',
                data: { actionUrl: '/log' },
            });
            lastDailyLogNotif = Date.now();
        }
    }

    // Medication reminders
    if (reminderSettings.medications?.length) {
        for (const med of reminderSettings.medications) {
            if (!med.enabled) continue;
            const [h, m] = med.time.split(':').map(Number);
            const targetMinutes = h * 60 + m;
            const lastSent = lastMedNotifs[med.id] || 0;
            if (Math.abs(currentMinutes - targetMinutes) <= 2 && (Date.now() - lastSent) > 300000) {
                self.registration.showNotification(`💊 ${med.label} Reminder`, {
                    body: `It's time to take your ${med.label}.`,
                    icon: '/icons/icon-192x192.png',
                    badge: '/icons/icon-192x192.png',
                    vibrate: [200, 100, 200],
                    tag: 'ovira-med-' + med.id,
                    data: { actionUrl: '/notifications' },
                });
                lastMedNotifs[med.id] = Date.now();
            }
        }
    }

    // Hydration reminder (interval-based, runs anytime settings say so)
    if (reminderSettings.hydration?.enabled) {
        const intervalMs = (reminderSettings.hydration.intervalMinutes || 60) * 60 * 1000;
        if ((Date.now() - lastHydrationNotif) >= intervalMs) {
            self.registration.showNotification('💧 Stay Hydrated', {
                body: 'Drink some water to stay healthy and energized.',
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-192x192.png',
                vibrate: [200, 100, 200],
                tag: 'ovira-hydration',
                data: { actionUrl: '/notifications' },
            });
            lastHydrationNotif = Date.now();
        }
    }
}

// Run reminder checks every 60 seconds
setInterval(checkOfflineReminders, 60000);
