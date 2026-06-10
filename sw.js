/**
 * SCENTRAVN - Service Worker
 * PWA Offline Support & Caching Strategy
 *
 * Strategi:
 *  - App shell (HTML, semua JS/CSS lokal, ikon, model) di-precache saat install
 *    sehingga aplikasi langsung bisa dibuka offline pada kunjungan pertama.
 *  - Library CDN penting (Firebase SDK, Chart.js, Three.js, Font Awesome,
 *    Google Fonts) di-precache secara best-effort, lalu di-cache ulang saat
 *    runtime (stale-while-revalidate).
 *  - Endpoint DATA Firebase (Firestore, Realtime DB, Auth, Storage, Gemini,
 *    ElevenLabs) TIDAK pernah di-cache oleh SW. Dibiarkan ke jaringan; offline
 *    ditangani oleh persistence IndexedDB milik Firestore.
 *  - File media besar (audio/music) dibiarkan ke jaringan agar Range request
 *    (status 206) tetap berfungsi.
 *  - Navigasi: network-first -> halaman ter-cache -> offline.html.
 */

const APP_VERSION = '2.4.2';
const PRECACHE = `scentravn-precache-v${APP_VERSION}`;
const RUNTIME = `scentravn-runtime-v${APP_VERSION}`;

// Halaman fallback navigasi utama
const APP_SHELL = '/app.html';
const OFFLINE_PAGE = '/offline.html';

// ── Aset lokal (app shell) yang di-precache ──────────────────────────────────
const LOCAL_ASSETS = [
    '/',
    '/index.html',
    '/app.html',
    '/auth.html',
    '/offline.html',
    '/manifest.json',

    // CSS
    '/css/styles.css',
    '/css/header-menu.css',
    '/css/onboarding-tour.css',
    '/css/theme-aura.css',
    '/css/icon-animations.css',
    '/css/theme-toggle.css',
    '/css/lite-mode.css',
    '/css/auth.css',
    '/css/admin.css',
    '/css/admin-layout.css',

    // JS - core & config
    '/js/theme-manager.js',
    '/js/performance-mode.js',
    '/js/config.keys.js',
    '/js/config.js',
    '/js/utils.js',
    '/js/i18n.js',
    '/js/firebase-config.js',
    '/js/firebase-live.js',
    '/js/local-bridge.js',
    '/js/auth-guard.js',
    '/js/auth.js',

    // JS - signal processing & ML
    '/js/stressCalculator.js',
    '/js/stressStore.js',
    '/js/signal/ppg-processor.js',
    '/js/signal/ppg-features.js',
    '/js/signal/eeg-features.js',
    '/js/ml/nn-runtime.js',
    '/js/ml/ml-inference.js',
    '/js/eda-stress.js',

    // JS - connectivity & dashboard
    '/js/ble-connection.js',
    '/js/multi-ble.js',
    '/js/charts.js',
    '/js/dashboard.js',
    '/js/analytics.js',
    '/js/router.js',
    '/js/views.js',
    '/js/health.js',

    // JS - avatar, TTS, chat
    '/js/audio-queue.js',
    '/js/audio-analyser.js',
    '/js/elevenlabs-tts.js',
    '/js/synachat-avatar.js',
    '/js/synachat.js',

    // JS - EEG / sleep / biolab
    '/js/eeg-muse.js',
    '/js/muse-gauge.js',
    '/js/math-utilities.js',
    '/js/feature-worker.js',
    '/js/eeg-insight.js',
    '/js/sleep-timeline.js',
    '/js/biolab.js',

    // JS - aromatherapy
    '/js/aromatherapy-db.js',
    '/js/aroma-recommender.js',
    '/js/aroma-module.js',

    // JS - model cards
    '/js/model-cards.js',
    '/js/model-card-view.js',

    // JS - recorder
    '/js/raw-recorder.js',
    '/js/raw-recorder-view.js',
    '/js/record-history.js',
    '/js/spectra-editor.js',
    '/js/session-store.js',
    '/js/storage-worker.js',
    '/js/vendor/xlsx.full.min.js',
    '/js/sleep-session.js',
    '/js/sleep-session-ui.js',

    // JS - app modules
    '/js/assessment.js',
    '/js/intervention-engine.js',
    '/js/sleep.js',
    '/js/sleep-tracker.js',
    '/js/moodbooster.js',
    '/js/mindful.js',
    '/js/journal.js',
    '/js/support.js',
    '/js/academy.js',
    '/js/research.js',
    '/js/research-questionnaire.js',
    '/js/questionnaire.js',
    '/js/admin.js',
    '/js/admin-ui.js',
    '/js/games.js',
    '/js/yoga.js',

    // JS - HEROIC program
    '/js/heroic-xai.js',
    '/js/heroic-firestore.js',
    '/js/heroic-program.js',
    '/js/heroic-journal.js',
    '/js/heroic-games.js',

    // JS - misc UI
    '/js/country-music.js',
    '/js/header-menu.js',
    '/js/navbar.js',
    '/js/onboarding-tour.js',
    '/js/profile.js',
    '/js/app.js',
    '/js/pwa.js',

    // Muse DSP worker (di-load via new Worker saat runtime)
    '/js/muse/decoder.js',
    '/js/muse/flags.js',
    '/js/muse/dsp.worker.js',
    // Sub-modul DSP yang di-import oleh dsp.worker.js (type: 'module').
    // Wajib di-precache, jika tidak worker EEG Muse gagal saat offline.
    '/js/muse/dsp/filters.js',
    '/js/muse/dsp/fft.js',
    '/js/muse/dsp/bandpower.js',
    '/js/muse/dsp/peak.js',
    '/js/muse/dsp/br.js',

    // Gambar & model 3D inti
    '/images/logo.png',
    '/images/icons/icon.svg',
    '/models/avatar.glb',
    '/models/Idle.fbx'
];

// ── Library CDN (best-effort precache, di-cache ulang saat runtime) ──────────
const CDN_ASSETS = [
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.0/firebase-database-compat.js',
    'https://unpkg.com/three@0.128.0/build/three.min.js',
    'https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js',
    'https://unpkg.com/three@0.128.0/examples/js/loaders/FBXLoader.js',
    'https://unpkg.com/fflate@0.7.3/umd/index.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// ─────────────────────────────────────────────────────────────────────────────
// INSTALL
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
    console.log(`[SW] Installing v${APP_VERSION}...`);

    event.waitUntil((async () => {
        const cache = await caches.open(PRECACHE);

        // Precache aset lokal satu-per-satu agar 1 file gagal tidak menggagalkan semua.
        await Promise.allSettled(
            LOCAL_ASSETS.map(async (url) => {
                try {
                    const res = await fetch(new Request(url, { cache: 'reload' }));
                    if (res && (res.ok || res.type === 'opaque')) {
                        await cache.put(url, res);
                    } else {
                        console.warn('[SW] Lewati precache (status buruk):', url, res && res.status);
                    }
                } catch (err) {
                    console.warn('[SW] Gagal precache aset lokal:', url);
                }
            })
        );

        // Precache CDN secara best-effort (CORS).
        await Promise.allSettled(
            CDN_ASSETS.map(async (url) => {
                try {
                    const res = await fetch(url, { mode: 'cors' });
                    if (res && (res.ok || res.type === 'opaque')) {
                        await cache.put(url, res);
                    }
                } catch (err) {
                    console.log('[SW] CDN belum ter-cache (akan di-cache saat runtime):', url);
                }
            })
        );

        console.log('[SW] Precache selesai');
        await self.skipWaiting();
    })());
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATE
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
    console.log(`[SW] Activating v${APP_VERSION}...`);

    event.waitUntil((async () => {
        const names = await caches.keys();
        await Promise.all(
            names
                .filter((name) => name.startsWith('scentravn-') && name !== PRECACHE && name !== RUNTIME)
                .map((name) => {
                    console.log('[SW] Hapus cache lama:', name);
                    return caches.delete(name);
                })
        );

        // Aktifkan navigation preload bila tersedia (mempercepat navigasi online).
        if (self.registration.navigationPreload) {
            try { await self.registration.navigationPreload.enable(); } catch (e) {}
        }

        await self.clients.claim();
        console.log('[SW] Aktif');
    })());
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: deteksi tipe request
// ─────────────────────────────────────────────────────────────────────────────

// Endpoint DATA/API yang TIDAK boleh di-cache (dibiarkan ke jaringan).
function isApiRequest(url) {
    const h = url.hostname;

    // Google Fonts BUKAN API -> harus boleh di-cache.
    if (h === 'fonts.googleapis.com' || h === 'fonts.gstatic.com') return false;

    return (
        h.endsWith('googleapis.com') ||        // firestore, identitytoolkit, securetoken, storage, generativelanguage, dsb.
        h.endsWith('firebaseio.com') ||        // Realtime DB
        h.endsWith('firebasedatabase.app') ||  // Realtime DB (region baru)
        h.includes('firebaseinstallations') ||
        h.includes('identitytoolkit') ||
        h.includes('securetoken') ||
        h.includes('elevenlabs.io')            // TTS streaming
    );
}

// Media besar yang butuh dukungan Range request -> dibiarkan ke jaringan.
function isMedia(url) {
    return /\.(mp3|wav|ogg|m4a|aac|mp4|webm|mov)$/i.test(url.pathname) ||
           url.pathname.startsWith('/audio/') ||
           url.pathname.startsWith('/music/');
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategi caching
// ─────────────────────────────────────────────────────────────────────────────

// Stale-while-revalidate: kembalikan cache segera, perbarui di latar belakang.
async function staleWhileRevalidate(request) {
    const cache = await caches.open(RUNTIME);
    const cached = await caches.match(request);

    const networkFetch = fetch(request)
        .then((response) => {
            if (response && (response.ok || response.type === 'opaque') && response.status !== 206) {
                cache.put(request, response.clone()).catch(() => {});
            }
            return response;
        })
        .catch(() => null);

    if (cached) {
        // Perbarui di latar belakang, jangan menunggu.
        networkFetch.catch(() => {});
        return cached;
    }

    const network = await networkFetch;
    if (network) return network;

    // Tidak ada cache & jaringan gagal.
    return new Response('Resource tidak tersedia secara offline', {
        status: 503,
        statusText: 'Service Unavailable'
    });
}

// Navigasi: network-first -> shell ter-cache -> offline.html
async function handleNavigation(event) {
    const { request } = event;
    try {
        // Manfaatkan navigation preload bila ada.
        const preload = await event.preloadResponse;
        if (preload) {
            caches.open(RUNTIME).then((c) => c.put(request, preload.clone())).catch(() => {});
            return preload;
        }

        const network = await fetch(request);
        if (network && network.ok) {
            caches.open(RUNTIME).then((c) => c.put(request, network.clone())).catch(() => {});
        }
        return network;
    } catch (err) {
        // Offline: coba halaman yang sama dari cache, lalu shell, lalu offline page.
        const cached = await caches.match(request);
        if (cached) return cached;

        const shell = await caches.match(APP_SHELL);
        if (shell) return shell;

        const offline = await caches.match(OFFLINE_PAGE);
        if (offline) return offline;

        return new Response('Anda sedang offline.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
    const { request } = event;

    // Hanya GET yang ditangani.
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Lewati skema non-http (chrome-extension, data:, dll).
    if (!url.protocol.startsWith('http')) return;

    // Endpoint DATA Firebase/API: jangan disentuh SW (biarkan jaringan + persistence Firestore).
    if (isApiRequest(url)) return;

    // Media besar: biarkan jaringan menangani (Range request).
    if (isMedia(url)) return;

    // Foto profil lintas-domain (Google/Gravatar): biarkan browser ambil langsung
    // dari jaringan. Cache opaque SW bisa basi/rusak dan membuat avatar gagal muat.
    if (url.hostname.endsWith('googleusercontent.com') || url.hostname.endsWith('gravatar.com')) return;

    // Navigasi halaman.
    if (request.mode === 'navigate') {
        event.respondWith(handleNavigation(event));
        return;
    }

    // Aset lain (JS/CSS/font/gambar/CDN lib): stale-while-revalidate.
    event.respondWith(staleWhileRevalidate(request));
});

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE - skip waiting dari klien
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        console.log('[SW] Skip waiting diminta');
        self.skipWaiting();
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// BACKGROUND SYNC
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);
    if (event.tag === 'sync-health-data') {
        event.waitUntil(syncHealthData());
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'Ada pembaruan kesehatan baru',
        icon: '/images/logo.png',
        badge: '/images/logo.png',
        vibrate: [100, 50, 100],
        data: { dateOfArrival: Date.now(), primaryKey: 1 },
        actions: [
            { action: 'explore', title: 'Lihat Detail' },
            { action: 'close', title: 'Tutup' }
        ]
    };
    event.waitUntil(self.registration.showNotification('SCENTRAVN', options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'explore') {
        event.waitUntil(clients.openWindow('/app.html#dashboard'));
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper background sync (placeholder - Firestore menangani sinkronisasi data)
// ─────────────────────────────────────────────────────────────────────────────
async function syncHealthData() {
    try {
        const pendingData = await getPendingHealthData();
        if (pendingData && pendingData.length > 0) {
            for (const data of pendingData) {
                await fetch('/api/health-data', {
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            await clearPendingHealthData();
        }
    } catch (error) {
        console.error('[SW] Sync gagal:', error);
    }
}

async function getPendingHealthData() { return []; }
async function clearPendingHealthData() {}

console.log(`[SW] Service Worker v${APP_VERSION} dimuat`);
