/**
 * SYNAWATCH Configuration
 * API keys are loaded from config.keys.js (excluded from git)
 */

const CONFIG = {
    // Firebase Configuration - ScentraVN
    FIREBASE_API_KEY: 'AIzaSyCvYBVasZNLghuQhRhLwoYOPkdR3noVXrA',
    FIREBASE_AUTH_DOMAIN: 'scentravn.firebaseapp.com',
    FIREBASE_DATABASE_URL: 'https://scentravn-default-rtdb.asia-southeast1.firebasedatabase.app',
    FIREBASE_PROJECT_ID: 'scentravn',
    FIREBASE_STORAGE_BUCKET: 'scentravn.firebasestorage.app',
    FIREBASE_MESSAGING_SENDER_ID: '479113972827',
    FIREBASE_APP_ID: '1:479113972827:web:399f5543c7624e75b1037e',

    // Gemini AI Configuration (multiple keys for auto-fallback)
    GEMINI_API_KEY: (typeof API_KEYS !== 'undefined' && API_KEYS.GEMINI_API_KEY) || '',
    GEMINI_API_KEYS: (typeof API_KEYS !== 'undefined' && API_KEYS.GEMINI_API_KEYS) || [],

    // ElevenLabs TTS Configuration
    ELEVENLABS_API_KEY: (typeof API_KEYS !== 'undefined' && API_KEYS.ELEVENLABS_API_KEY) || '',
    ELEVENLABS_VOICE_ID: (typeof API_KEYS !== 'undefined' && API_KEYS.ELEVENLABS_VOICE_ID) || '',

    // BLE Configuration for ESP32 SYNAWATCH (Watch Vitals - HR & SpO2)
    BLE_DEVICE_NAME: 'SYNAWATCH',
    BLE_SERVICE_UUID: '12345678-1234-1234-1234-123456789abc',
    BLE_CHARACTERISTIC_UUID: 'abcd1234-ab12-cd34-ef56-123456789abc',

    // BLE Configuration for ESP32 SYNAWATCH-BP (Watch Blood Pressure)
    BLE_BP_DEVICE_NAME: 'SYNAWATCH-BP',
    BLE_BP_SERVICE_UUID: '12345678-1234-1234-1234-123456789abc',
    BLE_BP_CHAR_UUID: 'abcd1234-ab12-cd34-ef56-123456789abc',

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
