/**
 * ScentraVN Serenity Configuration
 * API keys are loaded from config.keys.js (excluded from git)
 */

const CONFIG = {
    // Firebase Configuration - SERENITY ID
    FIREBASE_API_KEY: (typeof API_KEYS !== 'undefined' && API_KEYS.FIREBASE_API_KEY) || '',
    FIREBASE_AUTH_DOMAIN: 'serenity-id.firebaseapp.com',
    FIREBASE_DATABASE_URL: 'https://serenity-id-default-rtdb.asia-southeast1.firebasedatabase.app',
    FIREBASE_PROJECT_ID: 'serenity-id',
    FIREBASE_STORAGE_BUCKET: 'serenity-id.firebasestorage.app',
    FIREBASE_MESSAGING_SENDER_ID: '188752099512',
    FIREBASE_APP_ID: '1:188752099512:web:9a75a80a7a27f4ab901c4d',

    // Supabase Configuration - Storage untuk blob rekaman RAW (EEG/PPG)
    SUPABASE_URL: (typeof API_KEYS !== 'undefined' && API_KEYS.SUPABASE_URL) || '',
    SUPABASE_ANON_KEY: (typeof API_KEYS !== 'undefined' && API_KEYS.SUPABASE_ANON_KEY) || '',
    SUPABASE_RECORDINGS_BUCKET: 'recordings',

    // Gemini AI Configuration (multiple keys for auto-fallback)
    GEMINI_API_KEY: (typeof API_KEYS !== 'undefined' && API_KEYS.GEMINI_API_KEY) || '',
    GEMINI_API_KEYS: (typeof API_KEYS !== 'undefined' && API_KEYS.GEMINI_API_KEYS) || [],

    // ElevenLabs TTS Configuration
    ELEVENLABS_API_KEY: (typeof API_KEYS !== 'undefined' && API_KEYS.ELEVENLABS_API_KEY) || '',
    ELEVENLABS_VOICE_ID: (typeof API_KEYS !== 'undefined' && API_KEYS.ELEVENLABS_VOICE_ID) || '',

    // BLE Configuration for ESP32 device (Watch Vitals - HR & SpO2)
    BLE_DEVICE_NAME: 'SCENTRAVN',
    BLE_SERVICE_UUID: '12345678-1234-1234-1234-123456789abc',
    BLE_CHARACTERISTIC_UUID: 'abcd1234-ab12-cd34-ef56-123456789abc',

    // BLE Configuration for ESP32 SCENTRAVN-BP (Watch Blood Pressure)
    BLE_BP_DEVICE_NAME: 'SCENTRAVN-BP',
    BLE_BP_SERVICE_UUID: '12345678-1234-1234-1234-123456789abc',
    BLE_BP_CHAR_UUID: 'abcd1234-ab12-cd34-ef56-123456789abc',

    // App Configuration
    APP_NAME: 'ScentraVN Serenity',
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
