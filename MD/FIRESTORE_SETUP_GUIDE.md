# SYNAWATCH - Firestore Complete Setup Guide

**Status:** Ready for comprehensive database initialization
**Created:** March 25, 2026
**Last Updated:** v1.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Firestore Schema](#firestore-schema)
5. [Creating Indexes](#creating-indexes)
6. [Security Rules](#security-rules)
7. [Verification & Testing](#verification--testing)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Firestore database needs **14 collections** to support all SynaWatch features:

| Collection | Purpose | Data Type |
|-----------|---------|-----------|
| `users` | User profiles & auth data | User info |
| `assessments` | PHQ-9, GAD-7, UCLA, DASS-21, PSQI results | Questionnaire responses |
| `biometricData` | Real-time health metrics (HR, SpO2, stress) | Sensor data |
| `journalEntries` | Daily journal with mood tracking | Text + metadata |
| `meditationSessions` | Mindfulness/meditation tracking | Session records |
| `sleepRecords` | Sleep quality & duration data | Sleep metrics |
| `gamesProgress` | Wellness game stats & points | Game data |
| `crisisLogs` | Crisis support access logs | Log entries |
| `userSettings` | App preferences & settings | User preferences |
| `apiKeys` | API key management | Keys + quotas |
| `adminActivityLogs` | Admin action audit trail | Audit logs |
| `mindfulnessPrograms` | Pre-built meditation programs | Program templates |
| `interventions` | Mental health interventions | Intervention records |
| `researchData` | Anonymous research data | Aggregated metrics |

---

## Prerequisites

✅ **What you need:**
1. Firebase CLI installed: `npm install -g firebase-tools`
2. Service Account JSON file: `serviceAccountKey.json`
3. Node.js v14+ installed
4. Access to Firebase Console

**If you don't have serviceAccountKey.json:**
1. Go to [Firebase Console](https://console.firebase.google.com/project/synawacth-id/settings/serviceaccounts/adminsdk)
2. Click "Generate New Private Key"
3. Save as `serviceAccountKey.json` in `/SYNAWATCH/` directory
4. **KEEP IT SECURE** - Add to `.gitignore`

---

## Step-by-Step Setup

### **Step 1: Initialize Firestore Schema** (5 minutes)

Run the schema initialization script:

```bash
cd /c/Users/mosto/Desktop/SYNAWATCH
node setup-firestore-schema.js init-schema
```

**What this does:**
- Creates all 14 collections
- Adds sample documents for reference
- Initializes basic document structure
- Sets up indexes

**Expected output:**
```
📊 Initializing Firestore Schema...

📝 Creating collection: users
   ✓ Collection initialized

📝 Creating collection: assessments
   ✓ Collection initialized

[... more collections ...]

✅ Firestore schema initialization complete!

📋 Collections created:
   • users
   • assessments
   • biometricData
   [... 11 more ...]
```

### **Step 2: Create Firestore Indexes** (10 minutes)

Generate index configuration:

```bash
node setup-firestore-schema.js create-indexes
```

This will display all required indexes. You have 2 options:

#### **Option A: Automatic Creation (Recommended)**

```bash
cd synawatch
firebase firestore:indexes
```

Firebase CLI will create all indexes automatically.

#### **Option B: Manual Creation**

1. Go to [Firestore Indexes Console](https://console.firebase.google.com/project/synawacth-id/firestore/indexes)
2. Click "Create Index"
3. For each index, fill in:
   - **Collection ID**: (e.g., `assessments`)
   - **Query scope**: Collection
   - **Fields**:
     - `userId` (Ascending)
     - `timestamp` (Descending)
4. Click "Create Index"

**Required Indexes:**
```
assessments:     userId (↑) + timestamp (↓)
biometricData:   userId (↑) + timestamp (↓)
journalEntries:  userId (↑) + date (↓)
meditationSessions: userId (↑) + startTime (↓)
sleepRecords:    userId (↑) + date (↓)
crisisLogs:      userId (↑) + timestamp (↓)
adminActivityLogs: adminId (↑) + timestamp (↓)
interventions:   userId (↑) + recommendedAt (↓)
```

### **Step 3: Deploy Security Rules** (5 minutes)

```bash
cd synawatch
firebase deploy --only firestore:rules
```

Or manually:

1. Go to [Firestore Security Rules](https://console.firebase.google.com/project/synawacth-id/firestore/rules)
2. Paste contents of `/SYNAWATCH/firestore.rules`
3. Click "Publish"

### **Step 4: Verify Setup** (2 minutes)

List all collections:

```bash
node setup-firestore-schema.js list-collections
```

Expected output:
```
📚 Firestore Collections:

   • users (1 documents)
   • assessments (1 documents)
   • biometricData (1 documents)
   • journalEntries (1 documents)
   • meditationSessions (1 documents)
   • sleepRecords (1 documents)
   • gamesProgress (1 documents)
   • crisisLogs (1 documents)
   • userSettings (1 documents)
   • apiKeys (1 documents)
   • adminActivityLogs (1 documents)
   • mindfulnessPrograms (1 documents)
   • interventions (1 documents)
   • researchData (1 documents)
```

---

## Firestore Schema

### **1. Users Collection**

Stores user profiles and authentication data.

```javascript
// Document structure
{
  userId: "auth_uid",
  email: "user@example.com",
  displayName: "John Doe",
  role: "user", // 'user' | 'admin'
  createdAt: Timestamp,
  preferences: {
    language: "id",
    theme: "light",
    notificationsEnabled: true
  },
  healthProfile: {
    age: 30,
    gender: "male",
    weight: 70,
    height: 175
  },
  stats: {
    totalAssessments: 0,
    totalMeditationMinutes: 0,
    gamesPlayed: 0,
    journalEntries: 0
  }
}
```

### **2. Assessments Collection**

Stores mental health assessment results (PHQ-9, GAD-7, UCLA, DASS-21, PSQI).

```javascript
{
  userId: "user_id",
  type: "phq9", // 'phq9' | 'gad7' | 'ucla' | 'dass21' | 'psqi'
  responses: {
    q1: 2,
    q2: 1,
    // ... individual question responses
  },
  scores: {
    total: 8,
    subScores: {
      depression: 4,
      anxiety: 3,
      stress: 2 // for DASS-21
    }
  },
  interpretation: "mild", // severity level
  timestamp: Timestamp,
  notes: "User notes"
}
```

### **3. Biometric Data Collection**

Real-time health metrics from smartwatch.

```javascript
{
  userId: "user_id",
  deviceId: "watch_001",
  timestamp: Timestamp,
  heartRate: {
    value: 72,
    status: "normal" // 'normal' | 'elevated' | 'high'
  },
  spO2: {
    value: 98,
    status: "normal"
  },
  stressLevel: {
    value: 25, // 0-100
    status: "low"
  },
  gsr: {
    value: 1.2,
    status: "relaxed"
  },
  bodyTemperature: {
    value: 37.0,
    unit: "°C"
  },
  activityType: "resting", // 'resting' | 'walking' | 'running' | 'sleeping'
  environment: {
    ambientTemperature: 24,
    humidity: 65
  }
}
```

### **4. Journal Entries Collection**

Daily journal with mood tracking.

```javascript
{
  userId: "user_id",
  date: Timestamp,
  title: "Today's Reflection",
  content: "Today was a good day because...",
  mood: {
    emoji: "😊",
    score: 8 // 1-10
  },
  tags: ["positive", "grateful", "reflection"],
  isPrivate: true,
  attachments: [
    {
      type: "image",
      url: "https://...",
      timestamp: Timestamp
    }
  ],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### **5. Meditation Sessions Collection**

Mindfulness and meditation tracking.

```javascript
{
  userId: "user_id",
  type: "guided", // 'guided' | 'freeform' | 'breathwork'
  duration: 10, // minutes
  title: "Morning Mindfulness",
  startTime: Timestamp,
  endTime: Timestamp,
  preSessionMood: 5,
  postSessionMood: 8,
  stressReduction: 40, // percentage
  notes: "Felt very calm after session",
  completed: true
}
```

### **6. Sleep Records Collection**

Sleep quality and duration tracking (PSQI-based).

```javascript
{
  userId: "user_id",
  date: Timestamp,
  bedTime: Timestamp,
  wakeTime: Timestamp,
  totalDuration: 480, // minutes
  quality: {
    score: 8, // 1-10
    components: {
      subjectiveQuality: 8,
      latency: 20, // minutes to fall asleep
      duration: 8, // hours
      efficiency: 90, // percentage
      disturbances: 2, // count
      medication: 0, // 0 = none, 1 = sometimes
      daytimeDysfunction: 1 // 0-3
    }
  },
  sleepStages: {
    light: 40, // percentage
    deep: 30,
    rem: 30
  },
  interruptions: 2,
  notes: "Good sleep"
}
```

### **7. Games Progress Collection**

Wellness game statistics and progress.

```javascript
{
  userId: "user_id",
  gameType: "breathing", // 'breathing' | 'memory' | 'challenge'
  totalPlayed: 5,
  totalPoints: 150,
  lastPlayedAt: Timestamp,
  personalBest: 50,
  // Subcollections for detailed records:
  // breathingExercises/
  // memoryMatches/
  // dailyChallenges/
}
```

### **8. Crisis Logs Collection**

Crisis support access tracking (for analysis & follow-up).

```javascript
{
  userId: "user_id",
  timestamp: Timestamp,
  severity: "medium", // 'low' | 'medium' | 'high' | 'critical'
  type: "resources", // 'hotline' | 'chat' | 'resources' | 'emergency'
  description: "User accessed crisis support",
  resourcesShown: [
    {
      name: "National Mental Health Hotline",
      phone: "1-800-XXX-XXXX",
      url: "https://..."
    }
  ],
  followUpNeeded: true,
  notes: "Follow up with user in 24hrs"
}
```

### **9-14. Other Collections**

- **userSettings**: App preferences, notification settings, rotation policies
- **apiKeys**: API key management (name, service, quota, usage)
- **adminActivityLogs**: Audit trail of admin actions
- **mindfulnessPrograms**: Pre-built meditation programs
- **interventions**: Mental health intervention tracking
- **researchData**: Anonymous aggregated data for research

---

## Creating Indexes

### **Why Indexes Matter**

Firestore requires composite indexes for queries with:
- Multiple `where` clauses
- `orderBy` with multiple fields
- Queries that can't use a single-field index

**Example (Journal query):**
```javascript
db.collection('journalEntries')
  .where('userId', '==', uid)
  .orderBy('date', 'desc')
  .get()
```

This needs index: `userId (↑)` + `date (↓)`

### **Creating Index via Firebase CLI**

```bash
# Interactive mode
firebase firestore:indexes

# Or specific project
firebase firestore:indexes --project synawacth-id
```

### **Creating Index via Console**

1. [Firebase Console → Firestore](https://console.firebase.google.com/project/synawacth-id/firestore/indexes)
2. Click "Create Index"
3. Select Collection and Fields
4. Click "Create"

**Tip:** Check if index is already created by looking at error message:
```
ERROR: The query requires an index. You can create it here: [LINK]
```

Click the link to auto-create!

---

## Security Rules

The `firestore.rules` file implements:

### **Key Features**

1. **User Data Privacy**
   - Users can only access their own data
   - Admins can access all data
   - Private journals are truly private

2. **Role-Based Access**
   - `role: 'user'` - Can read/write own data
   - `role: 'admin'` - Full access + management features

3. **Data Protection**
   - Users can't modify their role
   - API keys only accessible by admins
   - Audit logs write-protected

4. **Public Collections**
   - `mindfulnessPrograms` readable by all authenticated users
   - `researchData` anonymous (no user ID exposure)

### **Deploying Rules**

**Via CLI:**
```bash
cd synawatch
firebase deploy --only firestore:rules
```

**Via Console:**
1. [Firestore Rules Console](https://console.firebase.google.com/project/synawacth-id/firestore/rules)
2. Paste content from `firestore.rules`
3. Click "Publish"

### **Testing Rules**

Use Firebase Emulator:

```bash
firebase emulators:start --only firestore
```

Then test in console:
```javascript
// Test read access
db.collection('assessments').doc('test').get()

// Test write access
db.collection('assessments').doc('test').set({...})
```

---

## Verification & Testing

### **Check Collection Count**

```bash
node setup-firestore-schema.js list-collections
```

Should show **14 collections**.

### **Backup Data**

```bash
node setup-firestore-schema.js backup-data
```

Creates `firestore-backup-[timestamp].json`

### **Test Index Status**

Go to [Firestore Indexes](https://console.firebase.google.com/project/synawacth-id/firestore/indexes) and check:
- All indexes show "Enabled" (green checkmark)
- No "Building" indexes (these take 10-60 minutes)

### **Test Security Rules**

1. Go to [Firestore Rules](https://console.firebase.google.com/project/synawacth-id/firestore/rules)
2. Click "Rules Playground"
3. Simulate requests:

```javascript
// Test 1: User can read own data
service cloud.firestore {
  match /users/user123 {
    allow read: if request.auth.uid == 'user123'
  }
}

// Test 2: Admin can read all
service cloud.firestore {
  match /assessments/doc1 {
    allow read: if get(/databases/(default)/documents/users/$(request.auth.uid)).data.role == 'admin'
  }
}
```

---

## Troubleshooting

### **Issue: Collections Not Appearing**

**Solution:**
1. Refresh Firebase Console
2. Check `_schema_reference` documents exist
3. Delete and re-run: `node setup-firestore-schema.js init-schema`

### **Issue: "Query requires an index"**

**Message:**
```
ERROR: The query requires an index. You can create it here:
https://console.firebase.google.com/v1/r/project/synawacth-id/firestore/indexes?create_index=...
```

**Solution:**
1. Click the provided link
2. Index creation will auto-start
3. Wait 10-60 minutes for "Enabled" status
4. Retry query

### **Issue: Permission Denied on Write**

**Symptom:** Getting `PERMISSION_DENIED` when trying to write

**Solution:**
1. Check user is authenticated
2. Check user has correct `userId` in document
3. Check `firestore.rules` is deployed
4. Verify user role in Console

```bash
# Check rules are deployed
firebase firestore:rules --project synawacth-id
```

### **Issue: Data Not Syncing**

**Solution:**
1. Check internet connection
2. Check `apiKeys` quota not exceeded
3. Look for errors in browser console
4. Check Firestore quota in [Firebase Console](https://console.firebase.google.com/project/synawacth-id/settings/billing/quotas)

### **Issue: Slow Queries**

**Solution:**
1. Verify indexes are enabled (green checkmark)
2. Limit query results: `.limit(50)`
3. Use pagination:
   ```javascript
   .limit(20)
   .startAfter(lastDoc)
   ```
4. Check Firestore capacity in Console

---

## Quick Commands Reference

```bash
# Initialize schema
node setup-firestore-schema.js init-schema

# List all collections
node setup-firestore-schema.js list-collections

# Generate indexes
node setup-firestore-schema.js create-indexes

# Backup data
node setup-firestore-schema.js backup-data

# Deploy security rules
cd synawatch && firebase deploy --only firestore:rules

# Deploy hosting
cd synawatch && firebase deploy --only hosting

# Deploy everything
cd synawatch && firebase deploy

# Start emulator
firebase emulators:start --only firestore

# Check project status
firebase projects:list
```

---

## Next Steps

1. ✅ Run `node setup-firestore-schema.js init-schema`
2. ✅ Create indexes (auto or manual)
3. ✅ Deploy security rules
4. ✅ Run `node setup-firestore-schema.js list-collections` to verify
5. ✅ Test with app: Go to [https://synawacth-id.web.app](https://synawacth-id.web.app)
6. ✅ Create test user and do assessment
7. ✅ Check Firestore Console to see data being created

---

## Support

For issues or questions:
- Check [Firebase Docs](https://firebase.google.com/docs/firestore)
- View [Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- Check error message and provided links in console

**Happy building! 🚀**
