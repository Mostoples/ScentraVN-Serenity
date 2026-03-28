#!/usr/bin/env node

/**
 * SYNAWATCH - Admin Setup Script
 * Setup admin user, initialize Firestore, manage API keys
 *
 * Usage: node setup-admin.js [command] [args]
 *
 * Commands:
 *   setup-admin <email>              - Set user as admin
 *   create-api-key <name> <service>  - Create new API key
 *   list-users                       - List all users
 *   reset-db                         - Reset database (careful!)
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Error: serviceAccountKey.json not found!');
    console.error(`   Please download it from Firebase Console and place at: ${serviceAccountPath}`);
    process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://synawacth-id-default-rtdb.firebaseio.com'
});

const db = admin.firestore();
const auth = admin.auth();

/**
 * Setup Admin User
 */
async function setupAdmin(email) {
    try {
        console.log(`\n🔐 Setting up admin for: ${email}\n`);

        // Find user by email
        const userRecord = await auth.getUserByEmail(email);
        const uid = userRecord.uid;

        console.log(`✓ Found user: ${userRecord.email} (UID: ${uid})`);

        // Set admin role in Firestore
        await db.collection('users').doc(uid).set({
            email: userRecord.email,
            role: 'admin',
            setupAt: new Date(),
            onboardingCompleted: true
        }, { merge: true });

        console.log(`✓ Added admin role to Firestore`);

        // Set custom claim (optional, for additional security)
        await auth.setCustomUserClaims(uid, { admin: true });
        console.log(`✓ Set custom auth claim: admin=true\n`);

        console.log(`✅ Admin setup complete!`);
        console.log(`   Email: ${email}`);
        console.log(`   UID: ${uid}`);
        console.log(`   Role: admin`);
        console.log(`\n📍 Admin Dashboard: https://synawacth-id.web.app/#/admin\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

/**
 * Create API Key
 */
async function createApiKey(name, service, quota = 100000) {
    try {
        console.log(`\n🔑 Creating API key: ${name}\n`);

        const keyData = {
            name: name,
            service: service,
            key: generateSecureKey(),
            secret: generateSecureKey(),
            quota: quota,
            used: 0,
            status: 'active',
            createdAt: new Date(),
            lastUsed: null,
            history: []
        };

        const docRef = await db.collection('apiKeys').add(keyData);

        console.log(`✓ API Key created: ${docRef.id}`);
        console.log(`   Name: ${name}`);
        console.log(`   Service: ${service}`);
        console.log(`   Quota: ${quota.toLocaleString()} calls/month`);
        console.log(`   Key: ${keyData.key.substring(0, 8)}...${keyData.key.substring(keyData.key.length - 4)}`);
        console.log(`   Secret: ${keyData.secret.substring(0, 8)}...${keyData.secret.substring(keyData.secret.length - 4)}\n`);

        console.log(`✅ API Key ready to use!\n`);

        return { id: docRef.id, ...keyData };

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

/**
 * List All Users
 */
async function listUsers() {
    try {
        console.log(`\n👥 Users in Database:\n`);

        const snapshot = await db.collection('users').get();

        if (snapshot.empty) {
            console.log('   (No users found)\n');
            return;
        }

        snapshot.forEach((doc, index) => {
            const data = doc.data();
            console.log(`${index + 1}. ${data.email || 'Unknown'}`);
            console.log(`   UID: ${doc.id}`);
            console.log(`   Role: ${data.role || 'user'}`);
            console.log(`   Created: ${data.createdAt ? new Date(data.createdAt.toDate()).toLocaleDateString() : 'N/A'}`);
            console.log('');
        });

        console.log(`✅ Total users: ${snapshot.size}\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

/**
 * Initialize Database Structure
 */
async function initializeDatabase() {
    try {
        console.log(`\n⚙️  Initializing database...\n`);

        // Create system collection
        await db.collection('system').doc('stats').set({
            totalUsers: 0,
            totalApiCalls: 0,
            uptime: '99.9%',
            lastUpdated: new Date()
        }, { merge: true });

        console.log(`✓ Created system/stats collection`);

        // Create default API keys collection (empty)
        const apiKeysRef = db.collection('apiKeys');
        console.log(`✓ API Keys collection ready`);

        // Create users collection (empty)
        const usersRef = db.collection('users');
        console.log(`✓ Users collection ready\n`);

        console.log(`✅ Database initialized!\n`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

/**
 * Generate Secure Key
 */
function generateSecureKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Main CLI
 */
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command) {
        console.log(`
SYNAWATCH Admin Setup Script
=============================

Usage: node setup-admin.js [command] [args]

Commands:
  setup-admin <email>              Set user as admin
  create-api-key <name> <service>  Create new API key
  list-users                       List all users
  init-db                          Initialize database
  help                             Show this help

Examples:
  node setup-admin.js setup-admin admin@example.com
  node setup-admin.js create-api-key gemini-prod Gemini
  node setup-admin.js list-users
  node setup-admin.js init-db
        `);
        return;
    }

    switch (command) {
        case 'setup-admin':
            if (!args[1]) {
                console.error('❌ Email required: node setup-admin.js setup-admin <email>');
                process.exit(1);
            }
            await setupAdmin(args[1]);
            break;

        case 'create-api-key':
            if (!args[1] || !args[2]) {
                console.error('❌ Name and service required: node setup-admin.js create-api-key <name> <service>');
                process.exit(1);
            }
            await createApiKey(args[1], args[2], args[3] || 100000);
            break;

        case 'list-users':
            await listUsers();
            break;

        case 'init-db':
            await initializeDatabase();
            break;

        case 'help':
            main();
            break;

        default:
            console.error(`❌ Unknown command: ${command}`);
            console.error(`   Try: node setup-admin.js help`);
            process.exit(1);
    }

    process.exit(0);
}

main();
