/**
 * SYNAWATCH Configuration
 * Replace placeholder values with your actual API keys
 */

const CONFIG = {
    // Firebase Configuration - SYNAWACTH-ID
    FIREBASE_API_KEY: 'AIzaSyCSfe6L9nYPLBCx4SsZ7Wb8vhh34VKexYc',
    FIREBASE_AUTH_DOMAIN: 'synawacth-id.firebaseapp.com',
    FIREBASE_PROJECT_ID: 'synawacth-id',
    FIREBASE_STORAGE_BUCKET: 'synawacth-id.firebasestorage.app',
    FIREBASE_MESSAGING_SENDER_ID: '362856081724',
    FIREBASE_APP_ID: '1:362856081724:web:56e6dd619d391adedc9639',

    // Gemini AI Configuration
    GEMINI_API_KEY: 'AIzaSyCAiJgXoqcN8IGGUzT5z0H-UhXWMfDaD5c',

    // ElevenLabs TTS Configuration
    ELEVENLABS_API_KEY: 'e7639c34914b1734706406e174f9ae11e5e230c16ddb37a5a0af4e3496ec27f0',
    ELEVENLABS_VOICE_ID: '9BWtsMINqrJLrRacOk9x', // Aria - multilingual female voice

    // BLE Configuration for ESP32 SYNAWATCH
    BLE_DEVICE_NAME: 'SYNAWATCH',
    BLE_SERVICE_UUID: '12345678-1234-1234-1234-123456789abc',
    BLE_CHARACTERISTIC_UUID: 'abcd1234-ab12-cd34-ef56-123456789abc',

    // App Configuration
    APP_NAME: 'SYNAWATCH',
    APP_VERSION: '1.0.0',
    DATA_REFRESH_INTERVAL: 500, // milliseconds

    // Health Thresholds
    HEALTH_THRESHOLDS: {
        HR_LOW: 60,
        HR_HIGH: 100,
        SPO2_EXCELLENT: 98,
        SPO2_NORMAL: 95,
        SPO2_LOW: 90,
        STRESS_LOW: 30,
        STRESS_MODERATE: 60,
        GSR_RELAXED: 30,
        GSR_NORMAL: 60,
        GSR_AROUSED: 80,
        TEMP_MIN: 36.1,
        TEMP_MAX: 37.2
    },

    // ─── HEROIC Program Configuration ───────────────────────────────────────────
    // Hidayati, Fanani & Mulyani (2023) Positive Psychology Framework
    // Integrates JITAI (Nahum-Shani et al., 2018) + XAI (Arrieta et al., 2020)
    HEROIC_CONFIG: {
        // Score thresholds for JITAI trigger (Nahum-Shani et al., 2018)
        SCORE_ALERT_THRESHOLD: 40,        // Trigger intervention if any dim < 40
        STRESS_CO_TRIGGER: 55,            // Combined stress level to trigger
        COOLDOWN_MS: 1200000,             // 20-min cooldown between interventions

        // Adaptive baseline (Nkurikiyeyezu et al., 2019 — 1.5 SD rule)
        ADAPTIVE_BASELINE_SD: 1.5,

        // 6 HEROIC dimensions
        DIMENSIONS: ['H', 'E', 'R', 'O', 'I', 'C'],

        // Weighted overall score (higher weight = more clinically significant)
        // Efikasi (E) & Belas Kasih (C) weighted highest — Bandura 1997, Neff 2003
        DIMENSION_WEIGHTS: { H: 1.0, E: 1.5, R: 1.0, O: 1.3, I: 1.2, C: 1.5 },

        // Score decay without activity (per-hour passive decrease)
        SCORE_DECAY_RATE: 0.02,

        // Activity limits
        MAX_ACTIVITIES_PER_DAY: 5,

        // Gemini model for journal & activity analysis
        GEMINI_MODEL: 'gemini-2.0-flash-exp',

        // Firestore collection names
        FIRESTORE_SCORE_HISTORY: 'heroicScoreHistory',
        FIRESTORE_ACTIVITIES: 'heroicActivities',

        // Dimension brand colors
        COLORS: {
            H: '#F59E0B',   // Amber — Humor
            E: '#10B981',   // Emerald — Efikasi
            R: '#6366F1',   // Indigo — Religiusitas
            O: '#F97316',   // Orange — Optimisme
            I: '#3B82F6',   // Blue — Interaksi
            C: '#EC4899'    // Pink — Belas Kasih
        },

        // Gradient CSS per dimension (used by heroic-program.js cards)
        GRADIENTS: {
            H: 'linear-gradient(135deg, #F59E0B, #D97706)',
            E: 'linear-gradient(135deg, #10B981, #059669)',
            R: 'linear-gradient(135deg, #6366F1, #4F46E5)',
            O: 'linear-gradient(135deg, #F97316, #EA580C)',
            I: 'linear-gradient(135deg, #3B82F6, #2563EB)',
            C: 'linear-gradient(135deg, #EC4899, #DB2777)'
        }
    }
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.HEALTH_THRESHOLDS);
Object.freeze(CONFIG.HEROIC_CONFIG);
Object.freeze(CONFIG.HEROIC_CONFIG.DIMENSION_WEIGHTS);
Object.freeze(CONFIG.HEROIC_CONFIG.COLORS);
Object.freeze(CONFIG.HEROIC_CONFIG.GRADIENTS);
