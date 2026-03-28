# 🧘 YOGA FEATURE - DEVELOPER QUICK REFERENCE

**For:** Developers implementing yoga feature
**Updated:** March 25, 2026
**Use:** Copy-paste code snippets & commands

---

## ⚡ QUICK COMMANDS

### Setup & Data Sync
```bash
# 1. Install dependencies
npm install firebase-admin node-fetch

# 2. Create sync script (copy full script below)
cp yoga_for_mental_health/seed-firestore.js setup-yoga-data.js

# 3. Run sync (fetches 3 APIs → Firestore)
node setup-yoga-data.js

# 4. Verify data in Firebase Console
firebase open console
# Navigate to: Firestore → Collections → yoga_poses, yoga_protocols

# 5. Deploy Firestore rules
firebase deploy --only firestore:rules

# 6. Deploy web app
firebase deploy
```

---

## 📝 CODE SNIPPETS

### 1. Complete Data Sync Script

**File:** `setup-yoga-data.js`

```javascript
#!/usr/bin/env node
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function syncAllYogaData() {
  console.log('🧘 Starting complete yoga data sync...\n');

  try {
    // Step 1: Fetch all 3 APIs in parallel
    console.log('📥 Fetching yoga data from 3 APIs...');
    const [yogaAPI, yogismAPI] = await Promise.all([
      fetch('https://yoga-api-nzy4.onrender.com/v1/poses')
        .then(r => r.json())
        .catch(() => []),
      fetch('https://priyangsubanerjee.github.io/yogism/yogism-api.json')
        .then(r => r.json())
        .catch(() => ({ featured: [] }))
    ]);

    console.log(`✅ Yoga API: ${yogaAPI.length} poses`);
    console.log(`✅ Yogism API: ${yogismAPI.featured?.length || 0} programs\n`);

    // Step 2: Normalize Yoga API
    console.log('📝 Normalizing data...');
    const normalizedPoses = normalizeYogaAPI(yogaAPI);
    const enrichedPoses = enrichFromYogism(normalizedPoses, yogismAPI.featured || []);

    // Step 3: Validate
    const validPoses = enrichedPoses.filter(p =>
      p.id && p.english_name && p.sanskrit_name
    );
    console.log(`✅ Valid poses: ${validPoses.length}\n`);

    // Step 4: Store in Firestore (batch operations)
    console.log('💾 Storing poses in Firestore...');
    const batchSize = 100;
    for (let i = 0; i < validPoses.length; i += batchSize) {
      const batch = db.batch();
      const chunk = validPoses.slice(i, i + batchSize);

      chunk.forEach(pose => {
        const ref = db.collection('yoga_poses').doc(pose.id);
        batch.set(ref, {
          ...pose,
          synced_at: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      await batch.commit();
      console.log(`  ✓ ${Math.min(i + batchSize, validPoses.length)}/${validPoses.length}`);
    }

    // Step 5: Create protocols
    console.log('\n📋 Creating yoga protocols...');
    await createYogaProtocols(db);

    // Step 6: Create mental health mappings
    console.log('\n🧠 Creating mental health mappings...');
    await createMentalHealthMappings(db);

    console.log('\n✨ Yoga data sync complete!\n');
    console.log('Summary:');
    console.log(`  • Poses stored: ${validPoses.length}`);
    console.log(`  • Programs synced: ${yogismAPI.featured?.length || 0}`);
    console.log(`  • Protocols created: 3`);
    console.log('\n✅ Ready to build UI components!\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// ─── UTILITY FUNCTIONS ───

function normalizeYogaAPI(poses) {
  return poses.map((pose, idx) => ({
    id: `pose_${pose.id || idx}`,
    english_name: pose.englishName || pose.name || '',
    sanskrit_name: pose.sanskritName || '',
    difficulty: pose.level?.toLowerCase() || 'intermediate',
    category: normalizeCategory(pose.category),
    description: pose.description || '',
    benefits: Array.isArray(pose.benefits) ? pose.benefits : [pose.benefits || ''],
    images: {
      svg: pose.images?.svg || null,
      png: pose.images?.png || null,
      source: 'yoga-api'
    },
    duration_seconds: 300,
    api_sources: ['yoga-api'],
    created_at: new Date()
  })).filter(p => p.english_name && p.sanskrit_name);
}

function normalizeCategory(category) {
  if (!category) return 'other';

  const lower = category.toLowerCase();
  if (lower.includes('standing')) return 'standing';
  if (lower.includes('sitting') || lower.includes('seated')) return 'seated';
  if (lower.includes('prone')) return 'prone';
  if (lower.includes('supine')) return 'supine';
  if (lower.includes('backbend')) return 'dynamic';
  if (lower.includes('forward')) return 'seated';
  if (lower.includes('twist')) return 'dynamic';
  if (lower.includes('inversion')) return 'inverted';

  return 'other';
}

function enrichFromYogism(poses, yogismCourses) {
  const poseMap = new Map(
    poses.map(p => [p.english_name.toLowerCase(), p])
  );

  yogismCourses?.forEach(course => {
    if (course.scheduled && Array.isArray(course.scheduled)) {
      course.scheduled.forEach(yogismPose => {
        const key = yogismPose.english_name?.toLowerCase();
        const pose = poseMap.get(key);

        if (pose) {
          // Enrich with yogism data
          if (yogismPose.time) {
            const match = yogismPose.time.match(/(\d+)/);
            if (match) {
              pose.duration_seconds = parseInt(match[1]) * 60;
            }
          }

          if (yogismPose.steps) {
            pose.steps = yogismPose.steps.split('\n').filter(s => s.trim());
          }

          if (yogismPose.benefits) {
            pose.benefits = [...new Set([...pose.benefits, yogismPose.benefits])];
          }

          if (!pose.api_sources.includes('yogism-api')) {
            pose.api_sources.push('yogism-api');
          }

          if (!pose.in_programs) pose.in_programs = [];
          pose.in_programs.push(course.name);
        }
      });
    }
  });

  return Array.from(poseMap.values());
}

async function createYogaProtocols(db) {
  const protocols = [
    {
      id: 'anxiety_relief',
      name: 'Anxiety Relief Program',
      description: 'Evidence-based 28-day yoga program for anxiety reduction',
      target_condition: 'anxiety',
      target_gad7_min: 10,
      duration_days: 28,
      frequency: 'Mon, Wed, Fri, Sat',
      recommended_poses: ['pose_1', 'pose_2', 'pose_3', 'pose_4', 'pose_5'],
      expected_improvement: 'GAD-7 reduction 4-6 points'
    },
    {
      id: 'depression_recovery',
      name: 'Depression Recovery Program',
      description: 'Evidence-based 42-day energizing yoga for depression',
      target_condition: 'depression',
      target_phq9_min: 10,
      duration_days: 42,
      frequency: 'Daily or 6x per week',
      recommended_poses: ['pose_6', 'pose_7', 'pose_8', 'pose_9', 'pose_10'],
      expected_improvement: 'PHQ-9 reduction 5-8 points'
    },
    {
      id: 'stress_management',
      name: 'Stress Management Program',
      description: 'Relaxation-focused 21-day yoga for stress reduction',
      target_condition: 'stress',
      target_dass21_stress_min: 15,
      duration_days: 21,
      frequency: 'Tue, Thu, Sat, Sun',
      recommended_poses: ['pose_11', 'pose_12', 'pose_13', 'pose_14', 'pose_15'],
      expected_improvement: 'DASS-21 stress reduction 5-7 points'
    }
  ];

  const batch = db.batch();
  protocols.forEach(protocol => {
    const ref = db.collection('yoga_protocols').doc(protocol.id);
    batch.set(ref, {
      ...protocol,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  await batch.commit();
  console.log(`✓ Created ${protocols.length} protocols`);
}

async function createMentalHealthMappings(db) {
  const mappings = [
    {
      condition: 'anxiety',
      description: 'Yoga for anxiety reduction',
      protocols: ['anxiety_relief'],
      assessment_field: 'gad7_score'
    },
    {
      condition: 'depression',
      description: 'Yoga for depression management',
      protocols: ['depression_recovery'],
      assessment_field: 'phq9_score'
    },
    {
      condition: 'stress',
      description: 'Yoga for stress management',
      protocols: ['stress_management'],
      assessment_field: 'dass21_stress_score'
    }
  ];

  const batch = db.batch();
  mappings.forEach(mapping => {
    const ref = db.collection('mental_health_yoga_map').doc(mapping.condition);
    batch.set(ref, {
      ...mapping,
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
  });

  await batch.commit();
  console.log(`✓ Created ${mappings.length} mental health mappings`);
}

// Run sync
syncAllYogaData();
```

---

### 2. Yoga Main Component (Vue.js)

**File:** `synawatch/components/YogaMain.vue`

```vue
<template>
  <div class="yoga-main">
    <!-- Header -->
    <div class="header">
      <h1>🧘 Yoga for Mental Health</h1>
      <p>Evidence-based yoga programs based on your mental health profile</p>
    </div>

    <!-- Recommended Program -->
    <div class="section recommended-program">
      <h2>Your Recommended Program</h2>
      <div v-if="recommendedProgram" class="program-card">
        <h3>{{ recommendedProgram.name }}</h3>
        <p>{{ recommendedProgram.description }}</p>
        <ul>
          <li>📅 Duration: {{ recommendedProgram.duration_days }} days</li>
          <li>⏰ Frequency: {{ recommendedProgram.frequency }}</li>
          <li>🎯 For: {{ recommendedProgram.target_condition }}</li>
        </ul>
        <button @click="startProgram(recommendedProgram.id)" class="btn btn-primary">
          Start Program
        </button>
      </div>
      <div v-else class="loading">Loading...</div>
    </div>

    <!-- Browse Poses -->
    <div class="section pose-library">
      <h2>Browse All Poses</h2>

      <div class="filters">
        <select v-model="filters.difficulty">
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>

        <select v-model="filters.category">
          <option value="">All Categories</option>
          <option value="standing">Standing</option>
          <option value="seated">Seated</option>
          <option value="prone">Prone</option>
          <option value="supine">Supine</option>
        </select>
      </div>

      <div class="poses-grid">
        <div
          v-for="pose in filteredPoses"
          :key="pose.id"
          class="pose-card"
          @click="showPoseDetail(pose)"
        >
          <img
            v-if="pose.images?.svg"
            :src="pose.images.svg"
            :alt="pose.english_name"
          />
          <div v-else class="placeholder">🧘</div>
          <h3>{{ pose.english_name }}</h3>
          <p class="sanskrit">{{ pose.sanskrit_name }}</p>
          <span class="badge">{{ pose.difficulty }}</span>
        </div>
      </div>
    </div>

    <!-- Pose Detail Modal -->
    <div v-if="selectedPose" class="modal" @click="selectedPose = null">
      <div class="modal-content" @click.stop>
        <button class="close" @click="selectedPose = null">&times;</button>
        <img v-if="selectedPose.images?.svg" :src="selectedPose.images.svg" />
        <h2>{{ selectedPose.english_name }}</h2>
        <p class="sanskrit">{{ selectedPose.sanskrit_name }}</p>

        <div class="details">
          <h3>Benefits</h3>
          <ul>
            <li v-for="(benefit, idx) in selectedPose.benefits" :key="idx">
              {{ benefit }}
            </li>
          </ul>

          <h3>About</h3>
          <p>{{ selectedPose.description }}</p>

          <h3>Duration</h3>
          <p>{{ Math.round(selectedPose.duration_seconds / 60) }} minutes</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { db } from '@/firebase-config';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export default {
  name: 'YogaMain',
  data() {
    return {
      recommendedProgram: null,
      poses: [],
      selectedPose: null,
      filters: {
        difficulty: '',
        category: ''
      }
    };
  },
  computed: {
    filteredPoses() {
      let result = this.poses;

      if (this.filters.difficulty) {
        result = result.filter(p => p.difficulty === this.filters.difficulty);
      }

      if (this.filters.category) {
        result = result.filter(p => p.category === this.filters.category);
      }

      return result.slice(0, 20); // Limit to 20 for performance
    }
  },
  methods: {
    async loadRecommendedProgram() {
      try {
        // Get user's latest assessment
        const user = this.$store.state.user;
        if (!user) return;

        const assessmentsRef = collection(db, `users/${user.uid}/assessments`);
        const q = query(assessmentsRef, orderBy('created_at', 'desc'), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          console.log('No assessments found');
          return;
        }

        const assessment = snapshot.docs[0].data();

        // Determine which protocol to recommend
        let protocolId = 'anxiety_relief';

        if (assessment.gad7_score >= assessment.phq9_score &&
            assessment.gad7_score >= assessment.dass21_stress_score) {
          protocolId = 'anxiety_relief';
        } else if (assessment.phq9_score >= assessment.dass21_stress_score) {
          protocolId = 'depression_recovery';
        } else {
          protocolId = 'stress_management';
        }

        // Load protocol details
        const protocolsRef = collection(db, 'yoga_protocols');
        const protocolQ = query(protocolsRef, where('id', '==', protocolId));
        const protocolSnapshot = await getDocs(protocolQ);

        if (!protocolSnapshot.empty) {
          this.recommendedProgram = protocolSnapshot.docs[0].data();
        }

      } catch (error) {
        console.error('Error loading recommendation:', error);
      }
    },

    async loadPoses() {
      try {
        const posesRef = collection(db, 'yoga_poses');
        const q = query(posesRef, limit(50));
        const snapshot = await getDocs(q);

        this.poses = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

      } catch (error) {
        console.error('Error loading poses:', error);
      }
    },

    showPoseDetail(pose) {
      this.selectedPose = pose;
    },

    startProgram(protocolId) {
      this.$router.push(`/yoga-session/${protocolId}`);
    }
  },
  mounted() {
    this.loadRecommendedProgram();
    this.loadPoses();
  }
};
</script>

<style scoped>
.yoga-main {
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.header h1 {
  font-size: 28px;
  margin: 0;
}

.header p {
  color: #666;
  margin: 8px 0 0;
}

.section {
  margin-bottom: 32px;
}

.section h2 {
  font-size: 20px;
  margin: 0 0 16px;
}

.program-card {
  background: #f5f5f5;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.program-card h3 {
  margin: 0 0 8px;
  color: #333;
}

.program-card ul {
  list-style: none;
  padding: 0;
  margin: 8px 0;
}

.program-card li {
  padding: 4px 0;
  color: #666;
}

.filters {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.filters select {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.poses-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.pose-card {
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.pose-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.pose-card img,
.pose-card .placeholder {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 4px;
  margin-bottom: 8px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
}

.pose-card h3 {
  margin: 8px 0 4px;
  font-size: 14px;
}

.pose-card .sanskrit {
  font-size: 12px;
  color: #999;
  font-style: italic;
  margin: 0;
}

.pose-card .badge {
  display: inline-block;
  background: #e8f4f8;
  color: #0277bd;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  margin-top: 8px;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 20px;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
  position: relative;
}

.close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.modal-content img {
  width: 100%;
  height: 300px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 16px;
}

.modal-content h2 {
  margin: 0 0 4px;
}

.modal-content .sanskrit {
  color: #999;
  font-style: italic;
  margin: 0 0 16px;
}

.details {
  color: #666;
}

.details h3 {
  margin: 16px 0 8px;
  color: #333;
}

.details ul {
  margin: 0;
  padding-left: 20px;
}

.details p {
  margin: 0;
  line-height: 1.6;
}

.btn {
  display: inline-block;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #0277bd;
  color: white;
}

.btn-primary:hover {
  background: #01579b;
}

.loading {
  text-align: center;
  padding: 24px;
  color: #999;
}
</style>
```

---

### 3. Firestore Rules (Security)

**File:** `firestore.rules` (add to existing)

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    // ─── YOGA COLLECTIONS ───

    // Yoga Poses - Public read, admin write
    match /yoga_poses/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }

    // Yoga Protocols - Public read, admin write
    match /yoga_protocols/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }

    // Yoga Sessions - User's own sessions
    match /yoga_sessions/{document=**} {
      allow read: if request.auth.uid == resource.data.user_id;
      allow create: if request.auth != null &&
                      isValidYogaSession(request.resource.data);
      allow update: if request.auth.uid == resource.data.user_id;
    }

    // User yoga session history
    match /users/{userId}/session_history/{document=**} {
      allow read: if request.auth.uid == userId;
      allow create, update: if request.auth.uid == userId &&
                             isValidSessionLog(request.resource.data);
    }

    // Mental health yoga mapping - Public read
    match /mental_health_yoga_map/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.admin == true;
    }

    // ─── HELPER FUNCTIONS ───

    function isValidYogaSession(data) {
      return data.user_id is string &&
             data.protocol_id is string &&
             data.session_date is timestamp &&
             data.completed is bool;
    }

    function isValidSessionLog(data) {
      return data.pose_id is string &&
             data.session_date is timestamp;
    }

  }
}
```

Deploy with:
```bash
firebase deploy --only firestore:rules
```

---

## 🔗 API ENDPOINTS

### Yoga API (Primary)
```bash
# Get all poses
curl https://yoga-api-nzy4.onrender.com/v1/poses

# Get categories
curl https://yoga-api-nzy4.onrender.com/v1/categories

# Get beginner poses
curl "https://yoga-api-nzy4.onrender.com/v1/poses?level=beginner"

# Get standing poses
curl "https://yoga-api-nzy4.onrender.com/v1/poses?category=Standing%20Poses"
```

### Yogism API (Secondary)
```bash
# Get all programs
curl https://priyangsubanerjee.github.io/yogism/yogism-api.json
```

---

## 🧪 TESTING SNIPPETS

### Test API Fetch
```javascript
// test-apis.js
const fetch = require('node-fetch');

async function testAPIs() {
  try {
    console.log('Testing Yoga API...');
    const yoga = await fetch('https://yoga-api-nzy4.onrender.com/v1/poses')
      .then(r => r.json());
    console.log(`✅ Yoga API: ${yoga.length} poses`);

    console.log('Testing Yogism API...');
    const yogism = await fetch('https://priyangsubanerjee.github.io/yogism/yogism-api.json')
      .then(r => r.json());
    console.log(`✅ Yogism API: ${yogism.featured?.length} programs`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPIs();
```

Run: `node test-apis.js`

### Test Firestore Queries
```javascript
// test-firestore.js
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testQueries() {
  try {
    // Count poses
    const poses = await db.collection('yoga_poses').limit(1).get();
    console.log(`✅ Total poses in Firestore: ${poses.size}`);

    // Get protocols
    const protocols = await db.collection('yoga_protocols').get();
    console.log(`✅ Protocols: ${protocols.size}`);
    protocols.forEach(doc => {
      console.log(`  - ${doc.data().name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

testQueries();
```

Run: `node test-firestore.js`

---

## 📦 DEPENDENCIES

```json
{
  "dependencies": {
    "firebase": "^9.0.0",
    "firebase-admin": "^12.0.0",
    "vue": "^3.0.0"
  },
  "devDependencies": {
    "jest": "^27.0.0",
    "node-fetch": "^2.6.0"
  }
}
```

Install:
```bash
npm install firebase firebase-admin vue node-fetch
```

---

## 🐛 COMMON DEBUGGING

### Check Firestore Collection
```javascript
// In browser console
db.collection('yoga_poses').limit(3).get().then(snapshot => {
  snapshot.forEach(doc => console.log(doc.data()));
});
```

### Monitor API Response
```javascript
fetch('https://yoga-api-nzy4.onrender.com/v1/poses')
  .then(r => r.json())
  .then(data => console.log(`Fetched ${data.length} poses`))
  .catch(err => console.error('API Error:', err.message));
```

### Check Authentication
```javascript
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    console.log('✅ Logged in as:', user.email);
    console.log('Admin:', user.getIdTokenResult().then(r => r.claims.admin));
  } else {
    console.log('❌ Not logged in');
  }
});
```

---

## 📊 MONITORING CHECKLIST

- [ ] `setup-yoga-data.js` runs without errors
- [ ] Firestore has 250+ poses
- [ ] Firestore has 3 protocols
- [ ] Yoga view loads without errors
- [ ] Can filter poses by difficulty/category
- [ ] Can start a session
- [ ] Session data saved to Firestore
- [ ] Mobile responsive

---

**Last Updated:** March 25, 2026
**Status:** Ready to Use ✅
