/**
 * SYNAWATCH - Service Worker
 * PWA Offline Support & Caching Strategy
 */

const CACHE_NAME = 'synawatch-v1.3.0';
const STATIC_CACHE = 'synawatch-static-v1.3.0';
const DYNAMIC_CACHE = 'synawatch-dynamic-v1.3.0';

// Assets to cache immediately on install
const STATIC_ASSETS = [
    '/',
    '/app.html',
    '/auth.html',
    '/index.html',
    '/offline.html',
    '/css/styles.css',
    '/css/auth.css',
    '/js/config.js',
    '/js/utils.js',
    '/js/firebase-config.js',
    '/js/auth-guard.js',
    '/js/auth.js',
    '/js/ble-connection.js',
    '/js/charts.js',
    '/js/dashboard.js',
    '/js/analytics.js',
    '/js/router.js',
    '/js/views.js',
    '/js/app.js',
    '/js/navbar.js',
    '/js/profile.js',
    '/js/health.js',
    '/js/audio-queue.js',
    '/js/audio-analyser.js',
    '/js/elevenlabs-tts.js',
    '/js/synachat-avatar.js',
    '/js/synachat.js',
    '/images/logo.svg',
    '/models/avatar.glb',
    '/models/Idle.fbx',
    '/manifest.json'
];

// External resources to cache
const EXTERNAL_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing Service Worker...');

    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] Caching static assets...');
                // Cache local assets
                return cache.addAll(STATIC_ASSETS.map(url => {
                    return new Request(url, { cache: 'reload' });
                })).catch(err => {
                    console.warn('[SW] Some static assets failed to cache:', err);
                });
            })
            .then(() => {
                // Try to cache external assets (non-critical)
                return caches.open(STATIC_CACHE).then(cache => {
                    return Promise.allSettled(
                        EXTERNAL_ASSETS.map(url =>
                            fetch(url, { mode: 'cors' })
                                .then(response => cache.put(url, response))
                                .catch(() => console.log('[SW] External asset not cached:', url))
                        )
                    );
                });
            })
            .then(() => {
                console.log('[SW] Installation complete');
                return self.skipWaiting();
            })
    );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating Service Worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => {
                            return name.startsWith('synawatch-') &&
                                   name !== STATIC_CACHE &&
                                   name !== DYNAMIC_CACHE;
                        })
                        .map((name) => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Activation complete');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip Chrome extensions and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Skip Firebase and API requests (always fetch from network)
    if (url.hostname.includes('firebase') ||
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('elevenlabs.io') ||
        url.hostname.includes('generativelanguage.googleapis.com')) {
        event.respondWith(
            fetch(request)
                .catch(() => {
                    // Return offline fallback for API requests
                    return new Response(
                        JSON.stringify({ error: 'Offline', message: 'No internet connection' }),
                        { headers: { 'Content-Type': 'application/json' } }
                    );
                })
        );
        return;
    }

    // Cache-first strategy for static assets
    if (STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.endsWith(asset))) {
        event.respondWith(
            caches.match(request)
                .then((cachedResponse) => {
                    if (cachedResponse) {
                        // Return cached version, but also update cache in background
                        fetch(request)
                            .then(response => {
                                if (response.ok) {
                                    caches.open(STATIC_CACHE)
                                        .then(cache => cache.put(request, response));
                                }
                            })
                            .catch(() => {});
                        return cachedResponse;
                    }
                    return fetch(request)
                        .then((response) => {
                            if (response.ok) {
                                const responseClone = response.clone();
                                caches.open(STATIC_CACHE)
                                    .then((cache) => cache.put(request, responseClone));
                            }
                            return response;
                        });
                })
        );
        return;
    }

    // Network-first strategy for dynamic content
    event.respondWith(
        fetch(request)
            .then((response) => {
                // Cache successful responses
                if (response.ok) {
                    const responseClone = response.clone();
                    caches.open(DYNAMIC_CACHE)
                        .then((cache) => cache.put(request, responseClone));
                }
                return response;
            })
            .catch(() => {
                // Fallback to cache
                return caches.match(request)
                    .then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Return offline page for navigation requests
                        if (request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }
                        return new Response('Offline', { status: 503 });
                    });
            })
    );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'sync-health-data') {
        event.waitUntil(syncHealthData());
    }
});

// Push notifications
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    const options = {
        body: event.data ? event.data.text() : 'New health update available',
        icon: '/images/icons/icon-192x192.png',
        badge: '/images/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            { action: 'explore', title: 'View Details' },
            { action: 'close', title: 'Dismiss' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification('SYNAWATCH', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/app.html#dashboard')
        );
    }
});

// Helper function for background sync
async function syncHealthData() {
    try {
        // Get pending data from IndexedDB
        const pendingData = await getPendingHealthData();

        if (pendingData && pendingData.length > 0) {
            // Sync with server
            for (const data of pendingData) {
                await fetch('/api/health-data', {
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            // Clear pending data
            await clearPendingHealthData();
        }
    } catch (error) {
        console.error('[SW] Sync failed:', error);
    }
}

// Placeholder functions for IndexedDB operations
async function getPendingHealthData() {
    // Implementation depends on your IndexedDB structure
    return [];
}

async function clearPendingHealthData() {
    // Implementation depends on your IndexedDB structure
}

console.log('[SW] Service Worker loaded');
