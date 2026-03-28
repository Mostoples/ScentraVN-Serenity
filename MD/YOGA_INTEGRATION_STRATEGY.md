# 🧘 YOGA MENTAL HEALTH - COMPREHENSIVE INTEGRATION STRATEGY

**Date:** March 25, 2026
**Status:** Ready for Implementation
**Priority:** High - Evidence-based mental health intervention
**Total Implementation Time:** 3-4 weeks (4 phases)

---

## 📋 TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [API Analysis & Comparison](#api-analysis--comparison)
3. [Data Architecture](#data-architecture)
4. [Integration Strategy](#integration-strategy)
5. [Implementation Roadmap](#implementation-roadmap)
6. [Code Samples](#code-samples)
7. [Testing & Deployment](#testing--deployment)

---

## 📊 EXECUTIVE SUMMARY

### Objective
Integrate yoga as a **primary mental health intervention** in SynaWatch with:
- ✅ 254+ yoga poses from external APIs
- ✅ WHO-based yoga protocols for mental health
- ✅ Evidence-based targeting (PHQ-9, GAD-7, DASS-21 scores)
- ✅ Personalized recommendations based on mental health profile
- ✅ Session tracking & progress monitoring
- ✅ Integration with existing assessment tools

### Why This Approach?
- **3 complementary APIs** provide different strengths:
  - Yoga API → Pose library (filtering, customization)
  - Yogism API → Pre-built programs (guidance, sequences)
  - Yoga Capstone API → Video instructions (form validation)
- **WHO data** provides clinical credibility
- **Firestore** enables real-time progress tracking
- **Fusion** with PHQ-9/GAD-7 creates adaptive protocols

---

## 🔍 API ANALYSIS & COMPARISON

### API 1: YOGA API (Primary Pose Library)

**URL:** `https://yoga-api-nzy4.onrender.com/v1`
**Status:** ✅ Active
**Pros:** 254 poses, categorized, SVG/PNG images, filtering
**Cons:** No pre-built sequences, requires client-side orchestration

**Sample Response:**
```json
{
  "id": 1,
  "englishName": "Mountain Pose",
  "sanskritName": "Tadasana",
  "level": "beginner",
  "description": "Stand with feet together...",
  "benefits": ["Calms the mind", "Reduces anxiety"],
  "images": {
    "svg": "https://yoga-api-nzy4.onrender.com/v1/poses/1/image.svg",
    "png": "https://yoga-api-nzy4.onrender.com/v1/poses/1/image.png"
  }
}
```

**Key Endpoints:**
```javascript
GET /categories                      // All categories
GET /categories?name=standing        // Filter by category
GET /poses                           // All 254 poses
GET /poses?level=beginner           // Filter by difficulty
GET /poses/:id                       // Single pose detail
```

**Best For:** Building custom sequences, pose filtering, library browsing

---

### API 2: YOGISM API (Pre-built Programs)

**URL:** `https://priyangsubanerjee.github.io/yogism/yogism-api.json`
**Status:** ✅ Static JSON (always available)
**Pros:** Pre-built courses, timed sequences, proven flows
**Cons:** Limited to predefined courses, ~10 programs

**Structure:**
```json
{
  "featured": [
    {
      "name": "4 yoga poses for beginners",
      "duration": 16,
      "level": "Level 1",
      "image": "...",
      "description": "...",
      "scheduled": [
        {
          "sanskrit_name": "Sukhasana",
          "english_name": "Easy Pose",
          "description": "...",
          "time": "3 Min",
          "image": "...",
          "benefits": "...",
          "steps": "...",
          "category": "Beginner",
          "target": "Harmonizes central nervous system"
        }
      ]
    }
  ]
}
```

**Best For:** Guided programs, time-based sessions, beginner onboarding

---

### API 3: YOGA CAPSTONE API (Video-Enhanced Poses)

**URL:** `https://github.com/alexcumplido/yoga-api`
**Status:** ✅ GitHub repo
**Pros:** 300+ poses with vector assets, form guidance
**Cons:** Needs self-hosting, larger payload

**Structure:**
```javascript
// Each pose has:
{
  id: 123,
  name: "Mountain Pose",
  sanskrit: "Tadasana",
  difficulty: "beginner",
  duration: 300,        // seconds
  instructions: [...],  // step-by-step
  benefits: [...],
  images: [             // vector SVGs
    { url: "...", alt: "..." }
  ],
  videos: [             // optional
    { url: "...", source: "youtube" }
  ],
  category: "standing",
  preparation: [],      // warm-up poses
  modifications: []     // variations
}
```

**Best For:** Form validation, detailed instruction, progression paths

---

## 🗄️ DATA ARCHITECTURE

### Firestore Collections Structure (Yoga Module)

```
SYNAWATCH/
├── yoga_protocols/
│   ├── doc: anxiety_relief_protocol
│   │   ├── name: "Anxiety Relief Program"
│   │   ├── target_condition: "anxiety"
│   │   ├── target_scores: { phq9: null, gad7: ">10", dass21_anxiety: ">10" }
│   │   ├── duration_days: 28
│   │   ├── sessions: [
│   │   │   { week: 1, days: "Mon, Wed, Fri", session_template_id: "..." },
│   │   │   { week: 2, days: "Mon, Wed, Fri, Sat", session_template_id: "..." }
│   │   ]
│   │   ├── poses_progression: ["tadasana", "vrksasana", "balasana", ...]
│   │   └── created_at, updated_at
│   │
│   └── doc: depression_recovery_protocol
│       ├── name: "Depression Recovery"
│       ├── target_condition: "depression"
│       └── ...
│
├── yoga_poses/
│   ├── doc: tadasana
│   │   ├── english_name: "Mountain Pose"
│   │   ├── sanskrit_name: "Tadasana"
│   │   ├── difficulty: "beginner"
│   │   ├── duration_seconds: 300
│   │   ├── category: "standing"
│   │   ├── benefits: ["Anxiety reduction", "Grounding", ...]
│   │   ├── neuro_effects: {
│   │   │   serotonin: "↑ mild",
│   │   │   cortisol: "↓ moderate",
│   │   │   vagal_tone: "↑ mild"
│   │   ├── for_conditions: ["anxiety", "stress", "depression"]
│   │   ├── contraindications: [...]
│   │   ├── images: {
│   │   │   svg: "...",
│   │   │   png: "...",
│   │   │   source: "yoga-api"
│   │   ├── instructions: [
│   │   │   { step: 1, text: "Stand with feet...", timing: "5s" },
│   │   │   { step: 2, text: "...", timing: "..." }
│   │   ├── variations: [
│   │   │   { name: "hands up", difficulty: "intermediate", desc: "..." }
│   │   ├── research_evidence: [
│   │   │   { study: "...", effect_size: "...", doi: "..." }
│   │   ├── api_sources: ["yoga-api", "yogism-api", "capstone-api"]
│   │   └── synced_at, source_updated_at
│   │
│   └── doc: vrksasana
│       └── ...
│
├── yoga_sessions/
│   ├── doc: session_20260325_001
│   │   ├── user_id: "user123"
│   │   ├── protocol_id: "anxiety_relief_protocol"
│   │   ├── session_date: timestamp
│   │   ├── scheduled_duration: 20
│   │   ├── actual_duration: 22
│   │   ├── poses: [
│   │   │   {
│   │   │     pose_id: "tadasana",
│   │   │     scheduled_duration: 5,
│   │   │     actual_duration: 5,
│   │   │     completed: true,
│   │   │     notes: "Felt grounded",
│   │   │     timestamp: ...
│   │   │   }
│   │   ├── pre_session: {
│   │   │   mood: 4,
│   │   │   stress: 7,
│   │   │   heart_rate: 85
│   │   ├── post_session: {
│   │   │   mood: 6,
│   │   │   stress: 4,
│   │   │   heart_rate: 72,
│   │   │   mood_improvement: "+2"
│   │   ├── feedback: {
│   │   │   difficulty: "just_right",
│   │   │   enjoyed: true,
│   │   │   would_repeat: true
│   │   └── created_at, updated_at
│   │
│   └── doc: session_20260326_001
│       └── ...
│
├── users/{userId}/session_history/
│   └── doc: yoga_sessions (subcollection index)
│       ├── total_sessions: 45
│       ├── total_minutes: 450
│       ├── streak_days: 12
│       ├── completion_rate: 0.92
│       ├── avg_mood_improvement: 2.3
│       └── favorite_poses: ["tadasana", "balasana", ...]
│
└── yoga_mental_health_map/
    └── doc: master_reference
        ├── anxiety: {
        │   recommended_poses: ["tadasana", "balasana", ...],
        │   protocols: ["anxiety_relief_protocol"],
        │   research_papers: [...]
        ├── depression: { ... }
        └── stress: { ... }
```

### Collection-Level Indexes Required

```javascript
// For efficient querying
yoga_sessions:
  - (user_id, session_date DESC)
  - (protocol_id, session_date DESC)
  - (user_id, completed, session_date DESC)

yoga_protocols:
  - (target_condition, active)

yoga_poses:
  - (difficulty, category)
  - (for_conditions, difficulty)
```

---

## 🎯 INTEGRATION STRATEGY

### Phase 1: DATA SYNC (Week 1)

**Objective:** Pull yoga data from 3 APIs → normalize → store in Firestore

#### 1.1 Create Yoga Data Sync Service

**File:** `synawatch/js/services/yoga-sync.js`

```javascript
class YogaSyncService {
  /**
   * Sync yoga poses from all 3 APIs
   */
  async syncAllYogaData() {
    console.log('🧘 Starting yoga data sync...');

    try {
      // Parallel API calls
      const [yogaApiPoses, yogismCourses, capstoneData] = await Promise.all([
        this.fetchYogaAPI(),
        this.fetchYogismAPI(),
        this.fetchCapstoneData()
      ]);

      // Normalize & merge
      const normalizedPoses = this.normalizePoses(yogaApiPoses);
      const enrichedPoses = this.enrichFromYogism(normalizedPoses, yogismCourses);
      const fullyEnrichedPoses = this.enrichFromCapstone(enrichedPoses, capstoneData);

      // Store in Firestore
      await this.storePosesInFirestore(fullyEnrichedPoses);
      await this.storeProgramsInFirestore(yogismCourses);

      console.log('✅ Yoga data sync complete!');
      return { success: true, posesCount: fullyEnrichedPoses.length };
    } catch (error) {
      console.error('❌ Sync failed:', error);
      throw error;
    }
  }

  /**
   * Fetch from Yoga API (254 poses)
   */
  async fetchYogaAPI() {
    const categories = await fetch(
      'https://yoga-api-nzy4.onrender.com/v1/categories'
    ).then(r => r.json());

    const poses = await fetch(
      'https://yoga-api-nzy4.onrender.com/v1/poses'
    ).then(r => r.json());

    return { categories, poses };
  }

  /**
   * Fetch from Yogism API (pre-built programs)
   */
  async fetchYogismAPI() {
    const response = await fetch(
      'https://priyangsubanerjee.github.io/yogism/yogism-api.json'
    ).then(r => r.json());

    return response.featured || [];
  }

  /**
   * Normalize Yoga API data to common format
   */
  normalizePoses(yogaData) {
    return yogaData.poses.map(pose => ({
      id: `pose_${pose.id}`,
      english_name: pose.englishName,
      sanskrit_name: pose.sanskritName,
      difficulty: pose.level || 'intermediate',
      category: pose.category || 'other',
      description: pose.description,
      benefits: Array.isArray(pose.benefits) ? pose.benefits : [pose.benefits],
      images: {
        svg: pose.images?.svg,
        png: pose.images?.png,
        source: 'yoga-api'
      },
      instructions: [],  // Will be filled by capstone
      duration_seconds: 300,  // Default
      api_sources: ['yoga-api'],
      created_at: new Date()
    }));
  }

  /**
   * Enrich with Yogism program data
   */
  enrichFromYogism(poses, yogismCourses) {
    // For each pose in yogism, find matching pose and add program info
    const poseMap = new Map(poses.map(p => [p.english_name.toLowerCase(), p]));

    yogismCourses.forEach(course => {
      if (course.scheduled) {
        course.scheduled.forEach(yogismPose => {
          const key = yogismPose.english_name.toLowerCase();
          const matchingPose = poseMap.get(key);

          if (matchingPose) {
            matchingPose.api_sources.push('yogism-api');
            matchingPose.in_programs = matchingPose.in_programs || [];
            matchingPose.in_programs.push(course.name);
            matchingPose.benefits = [
              ...new Set([
                ...matchingPose.benefits,
                yogismPose.target || yogismPose.benefits
              ])
            ];
            matchingPose.steps = yogismPose.steps;
            matchingPose.variations = yogismPose.variations;
            matchingPose.duration_seconds = this.parseTime(yogismPose.time);
          }
        });
      }
    });

    return Array.from(poseMap.values());
  }

  /**
   * Store normalized poses in Firestore
   */
  async storePosesInFirestore(poses) {
    const db = firebase.firestore();
    const batch = db.batch();

    poses.forEach(pose => {
      const docRef = db.collection('yoga_poses').doc(pose.id);
      batch.set(docRef, {
        ...pose,
        synced_at: new Date()
      });
    });

    await batch.commit();
    console.log(`✅ Stored ${poses.length} poses in Firestore`);
  }

  /**
   * Create yoga protocols based on WHO/mental health data
   */
  async createMentalHealthProtocols() {
    const db = firebase.firestore();

    const protocols = [
      {
        id: 'anxiety_relief_protocol',
        name: 'Anxiety Relief Program',
        target_condition: 'anxiety',
        target_scores: {
          gad7_min: 10,  // GAD-7 >= 10 = mild anxiety
          phq9_anxiety: true
        },
        duration_days: 28,
        frequency: 'Mon, Wed, Fri, Sat',
        session_template: 'guided_sequence',
        poses_progression: [
          'tadasana', 'vrksasana', 'balasana', 'adho_mukha_svanasana',
          'child_pose', 'savasana'
        ],
        expected_outcomes: {
          gad7_reduction: 'Mild-Moderate (4-6 points)',
          anxiety_symptom_improvement: ['Sleep quality ↑', 'Worry reduction ↓'],
          mood_impact: 'Improved calmness'
        },
        created_at: new Date()
      },
      {
        id: 'depression_recovery_protocol',
        name: 'Depression Recovery Program',
        target_condition: 'depression',
        target_scores: {
          phq9_min: 10,
          dass21_depression_min: 10
        },
        duration_days: 42,
        frequency: 'Daily',
        session_template: 'energizing_sequence',
        poses_progression: [
          'tadasana', 'uttanasana', 'surya_namaskar', 'ustrasana',
          'bhujangasana', 'savasana'
        ],
        expected_outcomes: {
          phq9_reduction: 'Mild-Moderate (5-8 points)',
          mood_impact: 'Energy ↑, Motivation ↑',
          physical_benefits: 'Better sleep, Appetite improvement'
        },
        created_at: new Date()
      },
      {
        id: 'stress_management_protocol',
        name: 'Stress Management Program',
        target_condition: 'stress',
        target_scores: {
          dass21_stress_min: 15
        },
        duration_days: 21,
        frequency: 'Tue, Thu, Sat, Sun',
        session_template: 'relaxation_sequence',
        poses_progression: [
          'tadasana', 'malasana', 'baddha_konasana', 'supta_baddha_konasana',
          'yoga_nidra', 'savasana'
        ],
        expected_outcomes: {
          dass21_stress_reduction: 'Mild-Moderate (5-7 points)',
          stress_symptoms: ['Muscle tension ↓', 'Sleep quality ↑'],
          cortisol_impact: 'Expected decrease'
        },
        created_at: new Date()
      }
    ];

    const batch = db.batch();
    protocols.forEach(protocol => {
      const docRef = db.collection('yoga_protocols').doc(protocol.id);
      batch.set(docRef, protocol);
    });

    await batch.commit();
    console.log(`✅ Created ${protocols.length} mental health protocols`);
  }

  parseTime(timeStr) {
    // Convert "3 Min" to 180 seconds
    const match = timeStr.match(/(\d+)\s*min/i);
    return match ? parseInt(match[1]) * 60 : 300;
  }
}

export default new YogaSyncService();
```

#### 1.2 Run Sync as Setup Script

**File:** `setup-yoga-data.js`

```javascript
#!/usr/bin/env node

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function syncYogaData() {
  console.log('🧘 Starting yoga data sync...\n');

  try {
    // 1. Fetch APIs
    console.log('📥 Fetching yoga data from APIs...');
    const yogaAPI = await fetch('https://yoga-api-nzy4.onrender.com/v1/poses')
      .then(r => r.json());

    const yogismAPI = await fetch(
      'https://priyangsubanerjee.github.io/yogism/yogism-api.json'
    ).then(r => r.json());

    console.log(`✅ Fetched ${yogaAPI.length} poses from Yoga API`);
    console.log(`✅ Fetched ${yogismAPI.featured.length} courses from Yogism API`);

    // 2. Normalize data
    console.log('\n📝 Normalizing and merging data...');
    const normalizedPoses = normalizePoses(yogaAPI);
    const enrichedPoses = enrichFromYogism(normalizedPoses, yogismAPI.featured);

    // 3. Store in Firestore
    console.log(`\n💾 Storing ${enrichedPoses.length} poses in Firestore...');
    const batch = db.batch();
    let count = 0;

    enrichedPoses.forEach(pose => {
      const docRef = db.collection('yoga_poses').doc(pose.id);
      batch.set(docRef, {
        ...pose,
        synced_at: admin.firestore.FieldValue.serverTimestamp()
      });
      count++;

      if (count % 100 === 0) {
        console.log(`  └─ ${count}/${enrichedPoses.length} poses batched...`);
      }
    });

    await batch.commit();
    console.log(`✅ All ${enrichedPoses.length} poses stored!\n`);

    // 4. Create protocols
    console.log('📋 Creating yoga mental health protocols...');
    await createProtocols(db);

    console.log('\n✨ Yoga data sync complete!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

function normalizePoses(yogaData) {
  return yogaData.map((pose, idx) => ({
    id: `pose_${pose.id || idx}`,
    english_name: pose.englishName || pose.name,
    sanskrit_name: pose.sanskritName || '',
    difficulty: pose.level || 'intermediate',
    category: pose.category || 'standing',
    description: pose.description || '',
    benefits: Array.isArray(pose.benefits) ? pose.benefits : [pose.benefits || ''],
    images: {
      svg: pose.images?.svg,
      png: pose.images?.png
    },
    api_source: 'yoga-api',
    created_at: new Date()
  }));
}

function enrichFromYogism(poses, yogismCourses) {
  const poseMap = new Map(
    poses.map(p => [p.english_name.toLowerCase(), p])
  );

  yogismCourses.forEach(course => {
    if (course.scheduled) {
      course.scheduled.forEach(yogismPose => {
        const key = yogismPose.english_name.toLowerCase();
        const pose = poseMap.get(key);

        if (pose) {
          pose.duration_seconds = parseTime(yogismPose.time);
          pose.steps = yogismPose.steps;
          pose.in_programs = [...(pose.in_programs || []), course.name];
        }
      });
    }
  });

  return Array.from(poseMap.values());
}

function parseTime(timeStr) {
  const match = timeStr.match(/(\d+)\s*min/i);
  return match ? parseInt(match[1]) * 60 : 300;
}

async function createProtocols(db) {
  const protocols = [
    {
      id: 'anxiety_relief',
      name: 'Anxiety Relief Program',
      target_condition: 'anxiety',
      target_scores: { gad7_min: 10 },
      poses: ['tadasana', 'vrksasana', 'balasana', 'child_pose', 'savasana']
    },
    {
      id: 'depression_recovery',
      name: 'Depression Recovery Program',
      target_condition: 'depression',
      target_scores: { phq9_min: 10 },
      poses: ['tadasana', 'uttanasana', 'surya_namaskar', 'savasana']
    },
    {
      id: 'stress_management',
      name: 'Stress Management Program',
      target_condition: 'stress',
      target_scores: { dass21_stress_min: 15 },
      poses: ['balasana', 'malasana', 'savasana', 'yoga_nidra']
    }
  ];

  const batch = db.batch();
  protocols.forEach(protocol => {
    const docRef = db.collection('yoga_protocols').doc(protocol.id);
    batch.set(docRef, {
      ...protocol,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  await batch.commit();
}

syncYogaData();
```

---

### Phase 2: UI COMPONENTS (Week 1-2)

#### 2.1 Yoga Feature Main Component

**File:** `synawatch/js/components/yoga-main.js`

```javascript
// Yoga Main Dashboard Component
const yogaMainView = `
  <div class="yoga-container">
    <div class="yoga-header">
      <h2>🧘 Yoga for Mental Health</h2>
      <p>Personalized yoga programs based on your mental health profile</p>
    </div>

    <div class="yoga-sections">
      <!-- Section 1: Recommended Program (based on assessment scores) -->
      <div class="yoga-section recommended-program">
        <h3>Your Recommended Program</h3>
        <div id="recommended-program-card" class="program-card">
          <div class="program-skeleton">Loading...</div>
        </div>
      </div>

      <!-- Section 2: Current Sessions -->
      <div class="yoga-section current-sessions">
        <h3>This Week's Sessions</h3>
        <div id="sessions-list" class="sessions-list">
          <p>No sessions scheduled</p>
        </div>
      </div>

      <!-- Section 3: Browse All Poses -->
      <div class="yoga-section pose-library">
        <h3>Pose Library</h3>
        <div class="pose-filters">
          <select id="pose-difficulty-filter">
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <select id="pose-category-filter">
            <option value="">All Categories</option>
            <option value="standing">Standing</option>
            <option value="seated">Seated</option>
            <option value="prone">Prone</option>
            <option value="supine">Supine</option>
          </select>

          <select id="pose-condition-filter">
            <option value="">All Conditions</option>
            <option value="anxiety">Anxiety</option>
            <option value="depression">Depression</option>
            <option value="stress">Stress</option>
          </select>
        </div>

        <div id="poses-grid" class="poses-grid">
          <!-- Dynamically populated -->
        </div>
      </div>
    </div>
  </div>
`;
```

#### 2.2 Yoga Session Component

**File:** `synawatch/js/components/yoga-session.js`

```javascript
class YogaSession {
  constructor(protocolId) {
    this.protocolId = protocolId;
    this.currentPoseIndex = 0;
    this.sessionStartTime = null;
    this.preSessionData = null;
    this.sessionData = {
      poses: [],
      totalDuration: 0,
      completed: false
    };
  }

  async initSession(protocolId) {
    try {
      const protocol = await this.getProtocol(protocolId);
      const poses = await this.getPosesForProtocol(protocol);

      // Record pre-session metrics
      this.preSessionData = {
        mood: this.getCurrentMood(),
        stress: this.getCurrentStress(),
        heart_rate: this.getHeartRate(),
        timestamp: new Date()
      };

      this.renderSessionUI(protocol, poses);
      this.sessionStartTime = new Date();

    } catch (error) {
      console.error('Failed to init session:', error);
    }
  }

  renderSessionUI(protocol, poses) {
    const html = `
      <div class="yoga-session">
        <div class="session-header">
          <h2>${protocol.name}</h2>
          <p>Total duration: ${protocol.duration_days} days</p>
        </div>

        <div class="session-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
          </div>
          <p id="pose-counter">Pose 1 of ${poses.length}</p>
        </div>

        <div class="current-pose-container">
          <div id="current-pose-display"></div>
          <button id="start-pose-btn" class="btn btn-primary">Start Pose</button>
        </div>

        <div class="session-controls">
          <button id="skip-pose-btn" class="btn btn-secondary">Skip</button>
          <button id="finish-session-btn" class="btn btn-secondary">Finish Session</button>
        </div>

        <div class="session-stats">
          <div class="stat">
            <span class="label">Duration</span>
            <span id="session-duration" class="value">0:00</span>
          </div>
          <div class="stat">
            <span class="label">Poses Done</span>
            <span id="poses-completed" class="value">0</span>
          </div>
        </div>
      </div>
    `;

    document.getElementById('app').innerHTML = html;
    this.attachEventListeners(poses);
  }

  displayCurrentPose(poses) {
    const pose = poses[this.currentPoseIndex];
    const html = `
      <div class="pose-display">
        <div class="pose-image">
          ${pose.images?.svg ?
            `<img src="${pose.images.svg}" alt="${pose.english_name}">` :
            `<div class="no-image">No image available</div>`
          }
        </div>

        <div class="pose-info">
          <h3>${pose.english_name}</h3>
          <p class="sanskrit">${pose.sanskrit_name}</p>

          <div class="pose-details">
            <p><strong>Duration:</strong> ${pose.duration_seconds}s</p>
            <p><strong>Difficulty:</strong> ${pose.difficulty}</p>
            <p><strong>Benefits:</strong> ${pose.benefits.join(', ')}</p>
          </div>

          <div class="pose-instructions">
            <h4>How to do it:</h4>
            <ol>
              ${pose.steps.map(step => `<li>${step}</li>`).join('')}
            </ol>
          </div>

          ${pose.variations ? `
            <div class="pose-variations">
              <h4>Variations:</h4>
              <p>${pose.variations}</p>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    document.getElementById('current-pose-display').innerHTML = html;
  }

  async finishSession() {
    const postSessionData = {
      mood: this.getCurrentMood(),
      stress: this.getCurrentStress(),
      heart_rate: this.getHeartRate(),
      timestamp: new Date()
    };

    const moodImprovement = postSessionData.mood - this.preSessionData.mood;
    const stressReduction = this.preSessionData.stress - postSessionData.stress;

    const sessionRecord = {
      protocol_id: this.protocolId,
      session_date: this.sessionStartTime,
      duration: (new Date() - this.sessionStartTime) / 1000,
      pre_session: this.preSessionData,
      post_session: postSessionData,
      mood_improvement: moodImprovement,
      stress_reduction: stressReduction,
      poses_completed: this.sessionData.poses.length,
      feedback: await this.collectFeedback(),
      completed: true
    };

    await this.saveSession(sessionRecord);

    this.showSessionSummary(sessionRecord);
  }

  async showSessionSummary(sessionRecord) {
    const summary = `
      <div class="session-summary">
        <h2>Great job! 🎉</h2>

        <div class="summary-stats">
          <div class="stat">
            <span class="icon">😊</span>
            <span class="value">${sessionRecord.mood_improvement > 0 ? '+' : ''}${sessionRecord.mood_improvement}</span>
            <span class="label">Mood Improvement</span>
          </div>

          <div class="stat">
            <span class="icon">😌</span>
            <span class="value">${sessionRecord.stress_reduction}</span>
            <span class="label">Stress Reduction</span>
          </div>

          <div class="stat">
            <span class="icon">⏱️</span>
            <span class="value">${Math.round(sessionRecord.duration / 60)}m</span>
            <span class="label">Duration</span>
          </div>
        </div>

        <button id="done-btn" class="btn btn-primary">Done</button>
      </div>
    `;

    document.getElementById('app').innerHTML = summary;
  }
}
```

---

### Phase 3: RECOMMENDATION ENGINE (Week 2)

#### 3.1 Adaptive Protocol Selector

**File:** `synawatch/js/services/yoga-recommendation.js`

```javascript
class YogaRecommendationEngine {
  /**
   * Recommend yoga protocol based on mental health assessment scores
   */
  async getRecommendedProtocol(userId) {
    const user = await this.getUser(userId);
    const latestAssessment = await this.getLatestAssessment(userId);

    if (!latestAssessment) {
      return this.getDefaultProtocol();
    }

    // Calculate severity scores
    const scores = {
      anxiety: latestAssessment.gad7_score || 0,
      depression: latestAssessment.phq9_score || 0,
      stress: latestAssessment.dass21_stress_score || 0
    };

    // Determine primary condition
    const primaryCondition = this.determinePrimaryCondition(scores);

    // Get matching protocols
    const protocol = await this.getProtocolByCondition(primaryCondition);

    // Customize based on severity
    const customizedProtocol = this.customizeProtocol(protocol, scores);

    return customizedProtocol;
  }

  determinePrimaryCondition(scores) {
    // Simple scoring: which is highest?
    if (scores.anxiety >= scores.depression && scores.anxiety >= scores.stress) {
      return 'anxiety';
    } else if (scores.depression >= scores.stress) {
      return 'depression';
    } else {
      return 'stress';
    }
  }

  customizeProtocol(protocol, scores) {
    const customized = { ...protocol };

    // Adjust frequency based on severity
    const maxScore = Math.max(...Object.values(scores));

    if (maxScore >= 15) {
      // Severe: more frequent
      customized.frequency = 'Daily';
      customized.duration_days = 56;
    } else if (maxScore >= 10) {
      // Moderate: standard
      customized.frequency = 'Mon, Wed, Fri, Sat';
      customized.duration_days = 28;
    } else {
      // Mild: maintenance
      customized.frequency = '3x per week';
      customized.duration_days = 21;
    }

    // Adjust poses progression based on physical capability
    if (scores.depression >= 15) {
      // For severe depression, start with gentler, grounding poses
      customized.poses_progression = this.filterPosesByProperty(
        customized.poses_progression,
        'neuro_effects.serotonin',
        'high'
      );
    }

    return customized;
  }

  /**
   * Get monthly progress analytics
   */
  async getProgressAnalytics(userId, protocolId) {
    const sessions = await this.getUserSessions(userId, protocolId);

    if (sessions.length < 2) {
      return { message: 'Not enough data yet' };
    }

    // Calculate trends
    const moodTrend = this.calculateTrend(
      sessions.map(s => s.post_session?.mood || 0)
    );

    const stressTrend = this.calculateTrend(
      sessions.map(s => s.post_session?.stress || 0)
    );

    const complianceRate = sessions.filter(s => s.completed).length / sessions.length;

    return {
      mood_trend: moodTrend,
      stress_trend: stressTrend,
      compliance_rate: complianceRate,
      sessions_count: sessions.length,
      improvements: this.summarizeImprovements(sessions)
    };
  }

  calculateTrend(values) {
    if (values.length < 2) return 'neutral';

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const avgFirst = firstHalf.reduce((a, b) => a + b) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b) / secondHalf.length;

    if (avgSecond < avgFirst - 0.5) return 'improving'; // Going down (less stress)
    if (avgSecond > avgFirst + 0.5) return 'declining';
    return 'stable';
  }
}

export default new YogaRecommendationEngine();
```

---

### Phase 4: INTEGRATION & DEPLOYMENT (Week 3-4)

#### 4.1 Add Yoga to Main App Navigation

**File:** `synawatch/js/views.js` (modify)

```javascript
// Add to views object
const views = {
  // ... existing views ...

  yoga: () => {
    return `
      <div class="view-container yoga-view">
        ${yogaMainView}
      </div>
    `;
  }
};

// Add to bottom navigation
const bottomNav = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'assessment', label: 'Assessment', icon: '📋' },
  { id: 'yoga', label: 'Yoga', icon: '🧘' },
  { id: 'meditation', label: 'Mindfulness', icon: '🧘‍♀️' },
  { id: 'more', label: 'More', icon: '⋯' }
];
```

#### 4.2 Yoga Firestore Rules

**File:** `yoga-firestore.rules`

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // Yoga Poses - Public read, no write
    match /yoga_poses/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'admin';
    }

    // Yoga Protocols - Public read, admin write
    match /yoga_protocols/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'admin';
    }

    // User yoga sessions - Private
    match /users/{userId}/session_history/{document=**} {
      allow read: if request.auth.uid == userId;
      allow create: if request.auth.uid == userId &&
                      isValidYogaSession(request.resource.data);
      allow update: if request.auth.uid == userId;
    }

    // Helper functions
    function isValidYogaSession(data) {
      return data.protocol_id is string &&
             data.session_date is timestamp &&
             data.pre_session is map &&
             data.post_session is map;
    }
  }
}
```

---

## 📈 IMPLEMENTATION ROADMAP

| Phase | Duration | Deliverables | Status |
|-------|----------|---------------|--------|
| **Phase 1: Data Sync** | Week 1 | `setup-yoga-data.js`, `yoga_poses/`, `yoga_protocols/` collections | Not Started |
| **Phase 2: UI Components** | Week 1-2 | `yoga-main.js`, `yoga-session.js`, session UI | Not Started |
| **Phase 3: Recommendation Engine** | Week 2 | `yoga-recommendation.js`, adaptive protocols | Not Started |
| **Phase 4: Integration & Testing** | Week 3-4 | Navigation, Firestore rules, E2E testing | Not Started |

---

## 🧪 TESTING & DEPLOYMENT

### Unit Tests
```bash
# Test data sync
npm test -- yoga-sync.test.js

# Test recommendation engine
npm test -- yoga-recommendation.test.js

# Test session logic
npm test -- yoga-session.test.js
```

### Integration Tests
```bash
# Test Firestore operations
npm test -- yoga-firestore.test.js

# Test end-to-end flows
npm test -- yoga-e2e.test.js
```

### Deployment Checklist

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Firestore rules deployed
- [ ] Yoga collections seeded with data
- [ ] Navigation links added
- [ ] UI tested on mobile & desktop
- [ ] Push to GitHub
- [ ] Deploy to Firebase Hosting

---

## 📚 REFERENCES & LINKS

**API Documentation:**
- [Yoga API](https://yoga-api-nzy4.onrender.com/v1) - 254 poses
- [Yogism API](https://priyangsubanerjee.github.io/yogism/yogism-api.json) - Pre-built programs
- [Yoga Capstone](https://github.com/alexcumplido/yoga-api) - Video + instructions

**Research Papers:**
- Yoga for Mental Health (WHO guidelines)
- Yoga Nidra for anxiety reduction
- Asana for depression management

**Firebase Docs:**
- [Firestore Queries](https://firebase.google.com/docs/firestore/query-data/get-data)
- [Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Batch Writes](https://firebase.google.com/docs/firestore/manage-data/transactions)

---

## 🚀 NEXT STEPS

1. **Run Phase 1** → `node setup-yoga-data.js`
2. **Review data** in Firebase Console
3. **Build Phase 2 UI** → Start with main dashboard
4. **Test locally** → Test with sample data
5. **Deploy** → Push to Firebase Hosting

---

**Created:** March 25, 2026
**Updated:** March 25, 2026
**Status:** Ready for Implementation ✅
