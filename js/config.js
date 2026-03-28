/**
 * SYNAWATCH Configuration
 * API keys are loaded from config.keys.js (excluded from git)
 */

const CONFIG = {
    // Firebase Configuration - SYNAWACTH-ID
    FIREBASE_API_KEY: (typeof API_KEYS !== 'undefined' && API_KEYS.FIREBASE_API_KEY) || '',
    FIREBASE_AUTH_DOMAIN: 'synawacth-id.firebaseapp.com',
    FIREBASE_PROJECT_ID: 'synawacth-id',
    FIREBASE_STORAGE_BUCKET: 'synawacth-id.firebasestorage.app',
    FIREBASE_MESSAGING_SENDER_ID: '362856081724',
    FIREBASE_APP_ID: '1:362856081724:web:56e6dd619d391adedc9639',

    // Gemini AI Configuration (multiple keys for auto-fallback)
    GEMINI_API_KEY: (typeof API_KEYS !== 'undefined' && API_KEYS.GEMINI_API_KEY) || '',
    GEMINI_API_KEYS: (typeof API_KEYS !== 'undefined' && API_KEYS.GEMINI_API_KEYS) || [],

    // ElevenLabs TTS Configuration
    ELEVENLABS_API_KEY: (typeof API_KEYS !== 'undefined' && API_KEYS.ELEVENLABS_API_KEY) || '',
    ELEVENLABS_VOICE_ID: (typeof API_KEYS !== 'undefined' && API_KEYS.ELEVENLABS_VOICE_ID) || '',

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
    }
};

// Freeze config to prevent modifications
Object.freeze(CONFIG.GEMINI_API_KEYS);
Object.freeze(CONFIG.HEALTH_THRESHOLDS);
Object.freeze(CONFIG);
