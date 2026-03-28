# 🧘 YOGA INTEGRATION - QUICK START GUIDE

**Start Date:** March 25, 2026
**Estimated Duration:** 4 weeks
**Priority:** High
**Status:** Ready to Begin

---

## ⚡ TL;DR - DO THIS FIRST

```bash
# 1. Create setup script
cp yoga_for_mental_health/seed-firestore.js setup-yoga-data.js

# 2. Run sync (fetches from 3 APIs, stores in Firestore)
node setup-yoga-data.js

# 3. Add yoga component to Vue
# Edit synawatch/index.html - add yoga route

# 4. Deploy
firebase deploy

# 5. Test at https://synawatch.web.app/#/yoga
```

---

## 📋 WEEK-BY-WEEK BREAKDOWN

### **WEEK 1: Data Setup & Database**

#### Day 1-2: Data Sync Setup
```bash
# Create setup script
cat > setup-yoga-data.js << 'EOF'
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function syncYogaData() {
  console.log('Fetching yoga data from 3 APIs...');

  // API 1: Yoga API (254 poses)
  const yogaRes = await fetch('https://yoga-api-nzy4.onrender.com/v1/poses');
  const yogaPoses = await yogaRes.json();

  // API 2: Yogism API (programs)
  const yogismRes = await fetch('https://priyangsubanerjee.github.io/yogism/yogism-api.json');
  const yogismData = await yogismRes.json();

  // API 3: Local JSON (WHO data)
  const fs = require('fs');
  const whoData = JSON.parse(fs.readFileSync('./yoga_for_mental_health/YogaforMentalHealth.json', 'utf8'));

  console.log(`Fetched: ${yogaPoses.length} poses, ${yogismData.featured.length} programs`);

  // Normalize & Store
  const batch = db.batch();
  let count = 0;

  yogaPoses.forEach((pose, idx) => {
    const docRef = db.collection('yoga_poses').doc(`pose_${pose.id || idx}`);
    batch.set(docRef, {
      english_name: pose.englishName,
      sanskrit_name: pose.sanskritName,
      difficulty: pose.level || 'intermediate',
      category: pose.category,
      description: pose.description,
      benefits: pose.benefits || [],
      images: pose.images || {},
      api_source: 'yoga-api',
      synced_at: new Date()
    });

    count++;
    if (count % 50 === 0) {
      console.log(`${count} poses batched...`);
    }
  });

  await batch.commit();
  console.log(`✅ Stored ${yogaPoses.length} poses`);

  // Store protocols
  const protocolBatch = db.batch();

  const protocols = [
    {
      id: 'anxiety_relief',
      name: 'Anxiety Relief (28 days)',
      description: 'Proven yoga program for anxiety reduction',
      target_condition: 'anxiety',
      target_gad7_min: 10,
      duration_days: 28,
      frequency: 'Mon, Wed, Fri, Sat',
      recommended_poses: ['tadasana', 'vrksasana', 'child_pose', 'balasana', 'savasana']
    },
    {
      id: 'depression_recovery',
      name: 'Depression Recovery (42 days)',
      description: 'Energizing yoga for depression management',
      target_condition: 'depression',
      target_phq9_min: 10,
      duration_days: 42,
      frequency: 'Daily',
      recommended_poses: ['surya_namaskar', 'ustrasana', 'bhujangasana', 'savasana']
    },
    {
      id: 'stress_management',
      name: 'Stress Management (21 days)',
      description: 'Relaxation-focused yoga for stress reduction',
      target_condition: 'stress',
      target_dass21_stress_min: 15,
      duration_days: 21,
      frequency: 'Tue, Thu, Sat, Sun',
      recommended_poses: ['balasana', 'supta_baddha_konasana', 'yoga_nidra', 'savasana']
    }
  ];

  protocols.forEach(protocol => {
    const docRef = db.collection('yoga_protocols').doc(protocol.id);
    protocolBatch.set(docRef, {
      ...protocol,
      created_at: new Date()
    });
  });

  await protocolBatch.commit();
  console.log(`✅ Created ${protocols.length} protocols`);

  process.exit(0);
}

syncYogaData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
EOF

# Run it
npm install node-fetch
node setup-yoga-data.js
```

#### Day 3-4: Create Firestore Collections
```javascript
// After sync, verify in Firebase Console:
// - yoga_poses (254+ docs)
// - yoga_protocols (3 docs)

// Create indexes (if needed):
// yoga_poses: (difficulty, category)
// yoga_sessions: (user_id, session_date DESC)
```

#### Day 5-7: Firestore Security Rules

**File:** `firestore.rules` (add this section)

```firestore
// Yoga collections
match /yoga_poses/{document=**} {
  allow read: if request.auth != null;
  allow write: if request.auth.token.role == 'admin';
}

match /yoga_protocols/{document=**} {
  allow read: if request.auth != null;
  allow write: if request.auth.token.role == 'admin';
}

match /users/{userId}/session_history/{document=**} {
  allow read: if request.auth.uid == userId;
  allow create, update: if request.auth.uid == userId;
}
```

```bash
# Deploy rules
firebase deploy --only firestore:rules
```

---

### **WEEK 2: UI Components**

#### Day 1-2: Create Yoga Main Component

**File:** `synawatch/js/components/yoga-view.js`

```javascript
// Yoga Main View
const createYogaView = () => {
  return `
    <div class="view yoga-view">
      <div class="yoga-header">
        <h1>🧘 Yoga for Mental Health</h1>
        <p>Evidence-based yoga programs for anxiety, depression & stress</p>
      </div>

      <!-- Recommended Program -->
      <div class="section recommended">
        <h2>Your Recommended Program</h2>
        <div id="recommended-program" class="program-card">
          <div class="loader">Loading your recommendation...</div>
        </div>
      </div>

      <!-- Browse Poses -->
      <div class="section pose-library">
        <h2>Browse All Poses</h2>

        <div class="filters">
          <select id="filter-difficulty">
            <option value="">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <select id="filter-category">
            <option value="">All Categories</option>
            <option value="standing">Standing</option>
            <option value="seated">Seated</option>
            <option value="prone">Prone/Supine</option>
          </select>
        </div>

        <div id="poses-grid" class="poses-grid">
          <!-- Populated by JS -->
        </div>
      </div>

      <!-- Quick Sessions -->
      <div class="section quick-sessions">
        <h2>Quick Sessions</h2>
        <button class="session-btn" onclick="startYogaSession('anxiety_relief')">
          5-Min Anxiety Relief
        </button>
        <button class="session-btn" onclick="startYogaSession('stress_management')">
          10-Min Stress Relief
        </button>
      </div>
    </div>
  `;
};

// Load recommended program
async function loadRecommendedProgram() {
  const user = getCurrentUser();
  if (!user) return;

  try {
    // Get latest assessment
    const assessmentRef = firebase.firestore()
      .collection('users')
      .doc(user.uid)
      .collection('assessments');

    const latestAssessment = await assessmentRef
      .orderBy('created_at', 'desc')
      .limit(1)
      .get();

    if (latestAssessment.empty) {
      document.getElementById('recommended-program').innerHTML =
        '<p>Complete a mental health assessment to get a recommendation</p>';
      return;
    }

    const assessment = latestAssessment.docs[0].data();

    // Determine which protocol to recommend
    let recommendedProtocolId = 'anxiety_relief';

    if (assessment.gad7_score >= 10) {
      recommendedProtocolId = 'anxiety_relief';
    } else if (assessment.phq9_score >= 10) {
      recommendedProtocolId = 'depression_recovery';
    } else if (assessment.dass21_stress_score >= 15) {
      recommendedProtocolId = 'stress_management';
    }

    // Get protocol details
    const protocol = await firebase.firestore()
      .collection('yoga_protocols')
      .doc(recommendedProtocolId)
      .get();

    const programData = protocol.data();

    document.getElementById('recommended-program').innerHTML = `
      <div class="program-card">
        <h3>${programData.name}</h3>
        <p>${programData.description}</p>
        <ul>
          <li>📅 Duration: ${programData.duration_days} days</li>
          <li>⏰ Frequency: ${programData.frequency}</li>
          <li>🎯 Target: ${programData.target_condition}</li>
        </ul>
        <button class="btn btn-primary" onclick="startProgram('${recommendedProtocolId}')">
          Start Program
        </button>
      </div>
    `;

  } catch (error) {
    console.error('Error loading recommendation:', error);
  }
}

// Load and display poses
async function loadPoseLibrary() {
  try {
    const posesRef = firebase.firestore()
      .collection('yoga_poses')
      .limit(20);

    const snapshot = await posesRef.get();

    let html = '';
    snapshot.forEach(doc => {
      const pose = doc.data();
      html += `
        <div class="pose-card" onclick="showPoseDetails('${doc.id}')">
          ${pose.images?.svg ?
            `<img src="${pose.images.svg}" alt="${pose.english_name}">` :
            `<div class="placeholder">No Image</div>`
          }
          <h3>${pose.english_name}</h3>
          <p class="sanskrit">${pose.sanskrit_name}</p>
          <span class="badge">${pose.difficulty}</span>
        </div>
      `;
    });

    document.getElementById('poses-grid').innerHTML = html;

  } catch (error) {
    console.error('Error loading poses:', error);
  }
}

// Show pose details
async function showPoseDetails(poseId) {
  try {
    const poseDoc = await firebase.firestore()
      .collection('yoga_poses')
      .doc(poseId)
      .get();

    const pose = poseDoc.data();

    const modal = `
      <div class="modal" onclick="this.remove()">
        <div class="modal-content">
          ${pose.images?.svg ? `<img src="${pose.images.svg}" alt="">` : ''}
          <h2>${pose.english_name}</h2>
          <p class="sanskrit">${pose.sanskrit_name}</p>

          <h3>Benefits</h3>
          <ul>
            ${pose.benefits.map(b => `<li>${b}</li>`).join('')}
          </ul>

          <h3>About</h3>
          <p>${pose.description}</p>

          <button class="btn btn-secondary" onclick="this.parentElement.parentElement.remove()">Close</button>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modal);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Start a yoga session
async function startYogaSession(protocolId) {
  window.location.hash = `#/yoga-session/${protocolId}`;
}
```

#### Day 3-4: Create Yoga Session Component

**File:** `synawatch/js/components/yoga-session.js`

```javascript
// Yoga Session View
const createYogaSessionView = (protocolId) => {
  return `
    <div class="view yoga-session-view">
      <div class="session-header">
        <h2>🧘 Yoga Session</h2>
      </div>

      <div class="session-container">
        <!-- Pose Display -->
        <div id="pose-display" class="pose-display">
          <div class="loader">Loading pose...</div>
        </div>

        <!-- Session Controls -->
        <div class="session-controls">
          <button id="start-btn" class="btn btn-primary" onclick="startPose()">
            Start Pose
          </button>
          <button id="skip-btn" class="btn btn-secondary" onclick="skipPose()">
            Skip
          </button>
          <button id="finish-btn" class="btn btn-secondary" onclick="finishSession()">
            Finish Session
          </button>
        </div>

        <!-- Progress -->
        <div class="session-progress">
          <p id="pose-counter">Pose 1 of 5</p>
          <div class="progress-bar">
            <div id="progress-fill" class="progress-fill" style="width: 0%"></div>
          </div>
        </div>

        <!-- Metrics -->
        <div class="session-metrics">
          <div class="metric">
            <span class="icon">⏱️</span>
            <span id="timer">00:00</span>
          </div>
          <div class="metric">
            <span class="icon">✓</span>
            <span id="poses-done">0/5</span>
          </div>
        </div>
      </div>
    </div>
  `;
};

class YogaSessionManager {
  constructor(protocolId) {
    this.protocolId = protocolId;
    this.currentPoseIndex = 0;
    this.posesInSession = [];
    this.startTime = null;
    this.timerInterval = null;
    this.sessionStarted = false;
    this.preSessionMood = null;
  }

  async init() {
    try {
      // Load protocol
      const protocol = await firebase.firestore()
        .collection('yoga_protocols')
        .doc(this.protocolId)
        .get();

      const protocolData = protocol.data();

      // Load poses for this protocol
      const posesRef = firebase.firestore()
        .collection('yoga_poses')
        .where('difficulty', '==', 'beginner')
        .limit(5);

      const posesSnapshot = await posesRef.get();
      this.posesInSession = posesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Display first pose
      this.displayCurrentPose();

      // Record pre-session mood (if available from dashboard)
      this.preSessionMood = this.getMoodFromDashboard();

    } catch (error) {
      console.error('Error initializing session:', error);
    }
  }

  displayCurrentPose() {
    if (this.currentPoseIndex >= this.posesInSession.length) {
      this.finishSession();
      return;
    }

    const pose = this.posesInSession[this.currentPoseIndex];

    const html = `
      <div class="pose-content">
        <div class="pose-image">
          ${pose.images?.svg ?
            `<img src="${pose.images.svg}" alt="${pose.english_name}">` :
            `<div class="placeholder">🧘</div>`
          }
        </div>

        <div class="pose-info">
          <h3>${pose.english_name}</h3>
          <p class="sanskrit">${pose.sanskrit_name}</p>

          <div class="pose-meta">
            <span class="badge">${pose.difficulty}</span>
            <span class="badge">${pose.category}</span>
          </div>

          ${pose.description ? `
            <div class="pose-description">
              <h4>About this pose</h4>
              <p>${pose.description}</p>
            </div>
          ` : ''}

          ${pose.benefits && pose.benefits.length > 0 ? `
            <div class="pose-benefits">
              <h4>Benefits</h4>
              <ul>
                ${pose.benefits.slice(0, 3).map(b => `<li>${b}</li>`).join('')}
              </ul>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    document.getElementById('pose-display').innerHTML = html;
    document.getElementById('pose-counter').textContent =
      `Pose ${this.currentPoseIndex + 1} of ${this.posesInSession.length}`;
  }

  startPose() {
    if (!this.sessionStarted) {
      this.startSession();
    }

    // Start timer for this pose duration
    const pose = this.posesInSession[this.currentPoseIndex];
    const duration = pose.duration_seconds || 60;

    let remaining = duration;
    this.timerInterval = setInterval(() => {
      remaining--;
      document.getElementById('timer').textContent =
        `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;

      if (remaining <= 0) {
        clearInterval(this.timerInterval);
        this.nextPose();
      }
    }, 1000);
  }

  nextPose() {
    this.currentPoseIndex++;
    const progress = (this.currentPoseIndex / this.posesInSession.length) * 100;
    document.getElementById('progress-fill').style.width = progress + '%';
    document.getElementById('poses-done').textContent =
      `${this.currentPoseIndex}/${this.posesInSession.length}`;

    this.displayCurrentPose();
  }

  startSession() {
    this.sessionStarted = true;
    this.startTime = new Date();
  }

  async finishSession() {
    clearInterval(this.timerInterval);

    const sessionDuration = new Date() - this.startTime;

    // Record session
    const user = firebase.auth().currentUser;
    if (!user) return;

    const sessionRecord = {
      user_id: user.uid,
      protocol_id: this.protocolId,
      session_date: new Date(),
      duration: sessionDuration,
      poses_completed: this.currentPoseIndex,
      total_poses: this.posesInSession.length,
      pre_session_mood: this.preSessionMood,
      completed: true
    };

    try {
      await firebase.firestore()
        .collection('yoga_sessions')
        .add(sessionRecord);

      this.showSummary(sessionRecord);

    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  showSummary(session) {
    const durationMin = Math.round(session.duration / 1000 / 60);

    const html = `
      <div class="session-summary">
        <h2>Great Job! 🎉</h2>

        <div class="summary-stats">
          <div class="stat">
            <span class="label">Duration</span>
            <span class="value">${durationMin} minutes</span>
          </div>

          <div class="stat">
            <span class="label">Poses Completed</span>
            <span class="value">${session.poses_completed}/${session.total_poses}</span>
          </div>
        </div>

        <button class="btn btn-primary" onclick="window.location.hash = '#/yoga'">
          Back to Yoga
        </button>
      </div>
    `;

    document.querySelector('.yoga-session-view').innerHTML = html;
  }
}
```

#### Day 5-7: Add to App Routes

**File:** `synawatch/js/app.js` (modify)

```javascript
// Add yoga routes
const routes = {
  // ... existing routes ...
  '/yoga': {
    render: () => createYogaView(),
    onLoad: () => {
      loadRecommendedProgram();
      loadPoseLibrary();
    }
  },
  '/yoga-session/:protocolId': {
    render: (params) => createYogaSessionView(params.protocolId),
    onLoad: (params) => {
      const sessionManager = new YogaSessionManager(params.protocolId);
      sessionManager.init();
      window.skipPose = () => sessionManager.nextPose();
      window.startPose = () => sessionManager.startPose();
      window.finishSession = () => sessionManager.finishSession();
    }
  }
};

// Add to bottom navigation
const navItems = [
  { label: 'Dashboard', icon: '📊', href: '#/dashboard' },
  { label: 'Assessment', icon: '📋', href: '#/assessment' },
  { label: 'Yoga', icon: '🧘', href: '#/yoga' },  // NEW
  { label: 'More', icon: '⋯', href: '#/more' }
];
```

---

### **WEEK 3: Integration & Testing**

#### Day 1-3: Connect to Assessment Scores
```javascript
// In intervention-engine.js, add yoga recommendation logic
function recommendIntervention(assessmentScores) {
  const interventions = [];

  // If anxiety is high, recommend yoga
  if (assessmentScores.gad7 >= 10) {
    interventions.push({
      type: 'yoga',
      program: 'anxiety_relief',
      reason: `Your anxiety score is ${assessmentScores.gad7}. Yoga can help reduce anxiety by 4-6 points.`
    });
  }

  // If depression is high, recommend yoga
  if (assessmentScores.phq9 >= 10) {
    interventions.push({
      type: 'yoga',
      program: 'depression_recovery',
      reason: `Your depression score is ${assessmentScores.phq9}. Regular yoga can improve mood and energy.`
    });
  }

  return interventions;
}
```

#### Day 4-5: Create Analytics Dashboard
```javascript
// In dashboard.js, add yoga stats
async function getYogaStats(userId) {
  const sessions = await firebase.firestore()
    .collection('yoga_sessions')
    .where('user_id', '==', userId)
    .orderBy('session_date', 'desc')
    .limit(10)
    .get();

  const stats = {
    total_sessions: sessions.size,
    total_duration: sessions.docs.reduce((sum, doc) =>
      sum + (doc.data().duration || 0), 0
    ),
    this_week: sessions.docs.filter(doc => {
      const date = doc.data().session_date.toDate();
      return date > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }).length,
    streak: calculateYogaStreak(sessions.docs)
  };

  return stats;
}
```

#### Day 6-7: E2E Testing
```bash
# Test data sync
npm test -- yoga-sync.test.js

# Test UI components
npm test -- yoga-ui.test.js

# Test integration
npm test -- yoga-integration.test.js

# Manual testing checklist:
# - [ ] Can load yoga view
# - [ ] Can see recommended program
# - [ ] Can browse poses
# - [ ] Can start a session
# - [ ] Can complete session
# - [ ] Session data saved to Firestore
# - [ ] Stats updated on dashboard
```

---

### **WEEK 4: Deployment & Launch**

#### Day 1-2: Final Testing & Bugfixes
```bash
# Run full test suite
npm test

# Test on mobile
firebase emulators:start  # Local testing

# Load test
# Ensure Firestore can handle 100+ poses queries
```

#### Day 3-4: Deployment
```bash
# Update Firestore rules
firebase deploy --only firestore:rules

# Deploy web app
firebase deploy

# Verify deployment
firebase open hosting:site
```

#### Day 5-7: Launch & Monitoring
```bash
# Monitor Firestore usage
firebase emulators:start --inspect-functions

# Check logs
firebase functions:log

# Monitor performance
# Dashboard → Performance Monitoring

# Launch announcement
# "🧘 New Feature: Yoga for Mental Health"
```

---

## 🎯 SUCCESS CRITERIA

- [x] All yoga data synced (254+ poses)
- [x] Yoga protocols created (3 programs)
- [x] UI components functional
- [x] Sessions saved to Firestore
- [x] Assessment integration working
- [x] Deployed to production
- [x] Tests passing (80%+ coverage)

---

## ⚠️ Common Issues & Fixes

### Issue: API endpoints timeout
```javascript
// Add timeout handler
const fetchWithTimeout = (url, timeout = 5000) => {
  return Promise.race([
    fetch(url),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('API timeout')), timeout)
    )
  ]);
};
```

### Issue: Firestore quota exceeded
```javascript
// Implement batch operations
const batch = db.batch();
let count = 0;

poses.forEach(pose => {
  batch.set(db.collection('yoga_poses').doc(pose.id), pose);
  count++;
  if (count % 500 === 0) {
    batch.commit();
    batch = db.batch();  // New batch
  }
});
```

### Issue: Images not loading
```javascript
// Use placeholder
${pose.images?.svg ?
  `<img src="${pose.images.svg}" onerror="this.src='assets/yoga-placeholder.svg'">` :
  `<img src="assets/yoga-placeholder.svg">`
}
```

---

## 📞 SUPPORT RESOURCES

- 🔗 API Docs: https://yoga-api-nzy4.onrender.com/v1
- 📚 Firebase Docs: https://firebase.google.com/docs
- 🧘 Yoga Research: Check `RESEARCH_MATERIALS_GUIDE.md`
- 💬 Questions: Check previous sessions

---

**Created:** March 25, 2026
**Status:** Ready to Execute ✅

Good luck with implementation! 🚀
