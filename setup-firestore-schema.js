#!/usr/bin/env node

/**
 * SYNAWATCH - Firestore Schema Setup
 * Creates all collections, fields, and indexes for complete functionality
 *
 * Usage: node setup-firestore-schema.js [command]
 *
 * Commands:
 *   init-schema       - Create all collections with sample documents
 *   create-indexes    - Generate index configuration
 *   backup-data       - Backup existing data
 *   list-collections  - List all current collections
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Error: serviceAccountKey.json not found!');
    console.error(`   Place it at: ${serviceAccountPath}`);
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://synawacth-id-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

// ===== FIRESTORE SCHEMA DEFINITION =====

const SCHEMA = {
    // 1. Users Collection - User profiles and preferences
    'users': {
        description: 'User profiles and authentication data',
        fields: {
            email: 'string',
            displayName: 'string',
            photoURL: 'string',
            role: 'string', // 'user' | 'admin'
            createdAt: 'timestamp',
            updatedAt: 'timestamp',
            onboardingCompleted: 'boolean',
            preferences: {
                language: 'string',
                theme: 'string',
                notificationsEnabled: 'boolean',
                privacyLevel: 'string'
            },
            healthProfile: {
                age: 'number',
                gender: 'string',
                weight: 'number',
                height: 'number',
                medicalHistory: 'array'
            },
            stats: {
                totalAssessments: 'number',
                totalMeditationMinutes: 'number',
                gamesPlayed: 'number',
                journalEntries: 'number'
            }
        },
        index: ['role', 'createdAt']
    },

    // 2. Assessments Collection - PHQ-9, GAD-7, UCLA results
    'assessments': {
        description: 'Mental health assessment results',
        fields: {
            userId: 'string',
            type: 'string', // 'phq9' | 'gad7' | 'ucla' | 'dass21' | 'psqi'
            responses: 'map', // individual question responses
            scores: {
                total: 'number',
                subScores: 'map' // for multi-dimension assessments
            },
            interpretation: 'string', // severity level
            timestamp: 'timestamp',
            notes: 'string'
        },
        index: ['userId', 'timestamp'],
        subcollections: {
            'phq9': {
                q1_interest: 'number',
                q2_mood: 'number',
                q3_sleep: 'number',
                q4_energy: 'number',
                q5_appetite: 'number',
                q6_selfWorth: 'number',
                q7_concentration: 'number',
                q8_movement: 'number',
                q9_suicidal: 'number',
                timestamp: 'timestamp'
            },
            'gad7': {
                q1_nervous: 'number',
                q2_worry: 'number',
                q3_calm: 'number',
                q4_restless: 'number',
                q5_afraid: 'number',
                q6_panic: 'number',
                q7_anxious: 'number',
                timestamp: 'timestamp'
            },
            'ucla': {
                responses: 'array',
                totalScore: 'number',
                timestamp: 'timestamp'
            },
            'dass21': {
                depression: 'number',
                anxiety: 'number',
                stress: 'number',
                timestamp: 'timestamp'
            },
            'psqi': {
                overallQuality: 'number',
                latency: 'number',
                duration: 'number',
                efficiency: 'number',
                disturbances: 'number',
                medication: 'number',
                daytimeDysfunction: 'number',
                globalScore: 'number',
                timestamp: 'timestamp'
            }
        }
    },

    // 3. Biometric Data - Real-time health metrics
    'biometricData': {
        description: 'Real-time readings from smartwatch',
        fields: {
            userId: 'string',
            deviceId: 'string',
            timestamp: 'timestamp',
            heartRate: {
                value: 'number',
                status: 'string' // normal | elevated | high
            },
            spO2: {
                value: 'number',
                status: 'string'
            },
            stressLevel: {
                value: 'number', // 0-100
                status: 'string'
            },
            gsr: {
                value: 'number',
                status: 'string'
            },
            bodyTemperature: {
                value: 'number',
                unit: 'string'
            },
            activityType: 'string', // resting | walking | running | sleeping
            environment: {
                ambientTemperature: 'number',
                humidity: 'number'
            }
        },
        index: ['userId', 'timestamp']
    },

    // 4. Journal Entries - Daily journal with mood tracking
    'journalEntries': {
        description: 'User journal entries with mood tracking',
        fields: {
            userId: 'string',
            date: 'timestamp',
            title: 'string',
            content: 'string',
            mood: {
                emoji: 'string',
                score: 'number' // 1-10
            },
            tags: 'array',
            isPrivate: 'boolean',
            attachments: 'array', // photos, voice memos
            createdAt: 'timestamp',
            updatedAt: 'timestamp'
        },
        index: ['userId', 'date']
    },

    // 5. Meditation Sessions - Mindfulness tracking
    'meditationSessions': {
        description: 'Meditation and mindfulness sessions',
        fields: {
            userId: 'string',
            type: 'string', // 'guided' | 'freeform' | 'breathwork'
            duration: 'number', // minutes
            title: 'string',
            startTime: 'timestamp',
            endTime: 'timestamp',
            preSessionMood: 'number',
            postSessionMood: 'number',
            stressReduction: 'number', // %
            notes: 'string',
            audioUrl: 'string', // if recorded
            completed: 'boolean'
        },
        index: ['userId', 'startTime']
    },

    // 6. Sleep Records - Sleep tracking data
    'sleepRecords': {
        description: 'Sleep quality and duration tracking',
        fields: {
            userId: 'string',
            date: 'timestamp',
            bedTime: 'timestamp',
            wakeTime: 'timestamp',
            totalDuration: 'number', // minutes
            quality: {
                score: 'number', // 1-10
                components: {
                    subjectiveQuality: 'number',
                    latency: 'number',
                    duration: 'number',
                    efficiency: 'number',
                    disturbances: 'number',
                    medication: 'number',
                    daytimeDysfunction: 'number'
                }
            },
            sleepStages: {
                light: 'number', // percentage
                deep: 'number',
                rem: 'number'
            },
            interruptions: 'number',
            notes: 'string'
        },
        index: ['userId', 'date']
    },

    // 7. Games Progress - Wellness games tracking
    'gamesProgress': {
        description: 'Progress tracking for wellness games',
        fields: {
            userId: 'string',
            gameType: 'string', // 'breathing' | 'memory' | 'challenge'
            totalPlayed: 'number',
            totalPoints: 'number',
            lastPlayedAt: 'timestamp',
            personalBest: 'number',
            sessions: 'array'
        },
        subcollections: {
            'breathingExercises': {
                completedAt: 'timestamp',
                duration: 'number',
                cycles: 'number',
                stressRelief: 'number', // percentage
                notes: 'string'
            },
            'memoryMatches': {
                completedAt: 'timestamp',
                movesCount: 'number',
                timeSpent: 'number',
                pairsFound: 'number',
                points: 'number'
            },
            'dailyChallenges': {
                date: 'timestamp',
                challengeType: 'string',
                completed: 'boolean',
                pointsEarned: 'number'
            }
        }
    },

    // 8. Crisis Support Logs - Track crisis support access
    'crisisLogs': {
        description: 'Crisis support access and response logs',
        fields: {
            userId: 'string',
            timestamp: 'timestamp',
            severity: 'string', // 'low' | 'medium' | 'high' | 'critical'
            type: 'string', // 'hotline' | 'chat' | 'resources' | 'emergency'
            description: 'string',
            resourcesShown: 'array',
            followUpNeeded: 'boolean',
            notes: 'string'
        },
        index: ['userId', 'timestamp']
    },

    // 9. User Settings - App settings and preferences
    'userSettings': {
        description: 'Persistent user settings and preferences',
        fields: {
            userId: 'string',
            apiKeyRotationPolicy: {
                enabled: 'boolean',
                frequencyDays: 'number',
                lastRotatedAt: 'timestamp',
                nextRotationDue: 'timestamp'
            },
            notificationPreferences: {
                dailyCheckIn: 'boolean',
                assessmentReminder: 'boolean',
                meditationReminder: 'boolean',
                journalPrompt: 'boolean',
                sleepReminder: 'boolean'
            },
            privacySettings: {
                shareDataForResearch: 'boolean',
                dataRetentionMonths: 'number'
            },
            displayPreferences: {
                darkMode: 'boolean',
                language: 'string',
                metricSystem: 'string' // 'metric' | 'imperial'
            },
            updatedAt: 'timestamp'
        }
    },

    // 10. API Keys - API key management
    'apiKeys': {
        description: 'API key management for external services',
        fields: {
            name: 'string',
            service: 'string', // 'gemini' | 'elevenlabs' | 'openweather'
            key: 'string',
            secret: 'string',
            quota: 'number',
            used: 'number',
            status: 'string', // 'active' | 'disabled' | 'revoked'
            createdAt: 'timestamp',
            updatedAt: 'timestamp',
            lastUsed: 'timestamp',
            expiresAt: 'timestamp',
            rotationHistory: 'array'
        }
    },

    // 11. Admin Activity Logs - Audit trail
    'adminActivityLogs': {
        description: 'Admin actions and system activity logging',
        fields: {
            adminId: 'string',
            action: 'string', // 'user_created' | 'role_changed' | 'key_rotated'
            targetUserId: 'string',
            targetResource: 'string',
            details: 'map',
            timestamp: 'timestamp',
            ipAddress: 'string',
            status: 'string' // 'success' | 'failed'
        },
        index: ['adminId', 'timestamp']
    },

    // 12. Mindfulness Programs - Structured meditation programs
    'mindfulnessPrograms': {
        description: 'Pre-built mindfulness programs',
        fields: {
            name: 'string',
            description: 'string',
            duration: 'number', // days
            sessionsPerWeek: 'number',
            difficulty: 'string', // 'beginner' | 'intermediate' | 'advanced'
            category: 'string',
            sessions: 'array'
        }
    },

    // 13. Interventions - Mental health interventions
    'interventions': {
        description: 'Evidence-based mental health interventions',
        fields: {
            userId: 'string',
            type: 'string', // 'cbt' | 'mindfulness' | 'breathing' | 'distress_tolerance'
            recommendedAt: 'timestamp',
            completedAt: 'timestamp',
            status: 'string', // 'recommended' | 'in_progress' | 'completed'
            sessions: 'number',
            effectiveness: 'number', // 1-10 user rating
            notes: 'string'
        },
        index: ['userId', 'recommendedAt']
    },

    // 14. Research Data - Anonymous research participation
    'researchData': {
        description: 'Anonymous data for research purposes',
        fields: {
            anonymousId: 'string',
            aggregatedMetrics: 'map',
            consentGiven: 'boolean',
            participationStart: 'timestamp',
            lastUpdated: 'timestamp'
        }
    }
};

// ===== FUNCTIONS =====

/**
 * Initialize Firestore Schema
 */
async function initSchema() {
    try {
        console.log('\n📊 Initializing Firestore Schema...\n');

        for (const [collection, config] of Object.entries(SCHEMA)) {
            console.log(`📝 Creating collection: ${collection}`);

            // Create sample document to initialize collection
            const sampleData = createSampleDocument(collection, config);

            // Use batch write
            const batch = db.batch();
            const docRef = db.collection(collection).doc('_schema_reference');
            batch.set(docRef, {
                ...sampleData,
                _isSchemaReference: true,
                _createdAt: new Date(),
                _description: config.description,
                _fields: Object.keys(config.fields)
            });

            await batch.commit();
            console.log(`   ✓ Collection initialized\n`);
        }

        console.log('✅ Firestore schema initialization complete!\n');
        console.log('📋 Collections created:');
        Object.keys(SCHEMA).forEach(col => {
            console.log(`   • ${col}`);
        });

        console.log('\n⚠️  NEXT STEPS:');
        console.log('1. Run: node setup-firestore-schema.js create-indexes');
        console.log('2. Create indexes in Firebase Console (links will be provided)');
        console.log('3. Review security rules\n');

    } catch (error) {
        console.error('❌ Error initializing schema:', error.message);
        process.exit(1);
    }
}

/**
 * Create sample document structure
 */
function createSampleDocument(collection, config) {
    const samples = {
        'users': {
            email: 'user@example.com',
            displayName: 'John Doe',
            role: 'user',
            createdAt: new Date(),
            onboardingCompleted: true,
            preferences: {
                language: 'id',
                theme: 'light',
                notificationsEnabled: true,
                privacyLevel: 'private'
            },
            healthProfile: {
                age: 30,
                gender: 'male',
                weight: 70,
                height: 175
            },
            stats: {
                totalAssessments: 0,
                totalMeditationMinutes: 0,
                gamesPlayed: 0,
                journalEntries: 0
            }
        },
        'assessments': {
            userId: 'user_id_here',
            type: 'phq9',
            scores: {
                total: 5,
                subScores: {}
            },
            interpretation: 'minimal',
            timestamp: new Date(),
            notes: ''
        },
        'biometricData': {
            userId: 'user_id_here',
            deviceId: 'watch_001',
            timestamp: new Date(),
            heartRate: { value: 72, status: 'normal' },
            spO2: { value: 98, status: 'normal' },
            stressLevel: { value: 20, status: 'low' },
            activityType: 'resting'
        },
        'journalEntries': {
            userId: 'user_id_here',
            date: new Date(),
            title: 'Sample Entry',
            content: 'Today was a good day...',
            mood: { emoji: '😊', score: 8 },
            tags: ['positive', 'reflection'],
            isPrivate: true,
            createdAt: new Date()
        },
        'meditationSessions': {
            userId: 'user_id_here',
            type: 'guided',
            duration: 10,
            title: 'Morning Meditation',
            startTime: new Date(),
            endTime: new Date(),
            preSessionMood: 5,
            postSessionMood: 7,
            completed: true
        },
        'sleepRecords': {
            userId: 'user_id_here',
            date: new Date(),
            totalDuration: 480,
            quality: { score: 8 },
            sleepStages: { light: 40, deep: 30, rem: 30 }
        },
        'gamesProgress': {
            userId: 'user_id_here',
            gameType: 'breathing',
            totalPlayed: 5,
            totalPoints: 150,
            lastPlayedAt: new Date(),
            personalBest: 50
        },
        'crisisLogs': {
            userId: 'user_id_here',
            timestamp: new Date(),
            severity: 'medium',
            type: 'resources',
            description: 'User accessed crisis resources'
        },
        'userSettings': {
            userId: 'user_id_here',
            apiKeyRotationPolicy: {
                enabled: true,
                frequencyDays: 30
            },
            notificationPreferences: {
                dailyCheckIn: true,
                assessmentReminder: true
            },
            updatedAt: new Date()
        },
        'apiKeys': {
            name: 'gemini-prod',
            service: 'gemini',
            key: 'key_xxxxx',
            quota: 100000,
            used: 1250,
            status: 'active',
            createdAt: new Date()
        },
        'adminActivityLogs': {
            adminId: 'admin_id_here',
            action: 'user_created',
            timestamp: new Date(),
            status: 'success'
        },
        'mindfulnessPrograms': {
            name: '7-Day Starter Program',
            description: 'Introduction to mindfulness',
            duration: 7,
            difficulty: 'beginner',
            sessionsPerWeek: 1
        },
        'interventions': {
            userId: 'user_id_here',
            type: 'breathing',
            status: 'recommended',
            recommendedAt: new Date()
        },
        'researchData': {
            anonymousId: 'anon_xxxxx',
            consentGiven: false,
            participationStart: new Date()
        }
    };

    return samples[collection] || {};
}

/**
 * Generate Firestore Indexes Configuration
 */
async function createIndexes() {
    console.log('\n📑 Firestore Index Configuration\n');
    console.log('Add these indexes to firestore.indexes.json:\n');

    const indexes = [
        {
            collection: 'assessments',
            fields: [
                { fieldPath: 'userId', order: 'ASCENDING' },
                { fieldPath: 'timestamp', order: 'DESCENDING' }
            ]
        },
        {
            collection: 'biometricData',
            fields: [
                { fieldPath: 'userId', order: 'ASCENDING' },
                { fieldPath: 'timestamp', order: 'DESCENDING' }
            ]
        },
        {
            collection: 'journalEntries',
            fields: [
                { fieldPath: 'userId', order: 'ASCENDING' },
                { fieldPath: 'date', order: 'DESCENDING' }
            ]
        },
        {
            collection: 'meditationSessions',
            fields: [
                { fieldPath: 'userId', order: 'ASCENDING' },
                { fieldPath: 'startTime', order: 'DESCENDING' }
            ]
        },
        {
            collection: 'sleepRecords',
            fields: [
                { fieldPath: 'userId', order: 'ASCENDING' },
                { fieldPath: 'date', order: 'DESCENDING' }
            ]
        },
        {
            collection: 'crisisLogs',
            fields: [
                { fieldPath: 'userId', order: 'ASCENDING' },
                { fieldPath: 'timestamp', order: 'DESCENDING' }
            ]
        },
        {
            collection: 'adminActivityLogs',
            fields: [
                { fieldPath: 'adminId', order: 'ASCENDING' },
                { fieldPath: 'timestamp', order: 'DESCENDING' }
            ]
        },
        {
            collection: 'interventions',
            fields: [
                { fieldPath: 'userId', order: 'ASCENDING' },
                { fieldPath: 'recommendedAt', order: 'DESCENDING' }
            ]
        }
    ];

    console.log(JSON.stringify({ indexes }, null, 2));

    console.log('\n📌 To create indexes automatically:\n');
    console.log('1. Go to Firebase Console → Firestore → Indexes');
    console.log('2. Click "Create Index" for each configuration above');
    console.log('3. Or use Firebase CLI: firebase firestore:indexes');
    console.log('\n🔗 Direct links:\n');

    indexes.forEach(idx => {
        console.log(`   • ${idx.collection}`);
        console.log(`     https://console.firebase.google.com/v1/r/project/synawacth-id/firestore/indexes\n`);
    });
}

/**
 * List all collections
 */
async function listCollections() {
    try {
        console.log('\n📚 Firestore Collections:\n');

        const collections = await db.listCollections();

        if (collections.length === 0) {
            console.log('   (No collections found)\n');
            return;
        }

        for (const collection of collections) {
            const docCount = await collection.count().get();
            console.log(`   • ${collection.id} (${docCount.data().count} documents)`);
        }
        console.log();

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

/**
 * Backup data
 */
async function backupData() {
    try {
        console.log('\n💾 Backing up Firestore data...\n');

        const backup = {};
        const collections = await db.listCollections();

        for (const collection of collections) {
            const docs = await collection.get();
            backup[collection.id] = [];

            docs.forEach(doc => {
                backup[collection.id].push({
                    id: doc.id,
                    data: doc.data()
                });
            });

            console.log(`   ✓ Backed up ${collection.id} (${docs.size} documents)`);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `firestore-backup-${timestamp}.json`;
        fs.writeFileSync(filename, JSON.stringify(backup, null, 2));

        console.log(`\n✅ Backup saved to: ${filename}\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// ===== MAIN =====

const command = process.argv[2] || 'help';

switch (command) {
    case 'init-schema':
        initSchema().then(() => process.exit(0));
        break;
    case 'create-indexes':
        createIndexes();
        process.exit(0);
        break;
    case 'list-collections':
        listCollections().then(() => process.exit(0));
        break;
    case 'backup-data':
        backupData().then(() => process.exit(0));
        break;
    default:
        console.log(`
📊 SYNAWATCH - Firestore Schema Setup

Usage: node setup-firestore-schema.js [command]

Commands:
  init-schema        Initialize all collections with sample documents
  create-indexes     Display Firestore index configuration
  list-collections   List all current collections
  backup-data        Backup all Firestore data to JSON

Example:
  node setup-firestore-schema.js init-schema

🔗 For manual index creation:
  https://console.firebase.google.com/project/synawacth-id/firestore/indexes
        `);
        process.exit(0);
}
