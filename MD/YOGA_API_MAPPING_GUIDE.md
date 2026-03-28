# 🧘 YOGA API MAPPING GUIDE

**Purpose:** Map 3 external APIs → Unified Firestore schema
**Status:** Complete Reference
**Last Updated:** March 25, 2026

---

## 📡 API SOURCES

### API #1: Yoga API (Primary)
- **URL:** `https://yoga-api-nzy4.onrender.com/v1`
- **Type:** REST API (JSON)
- **Data:** 254 yoga poses + categories
- **Update Frequency:** Real-time
- **Best For:** Pose library, detailed pose information, filtering

**Endpoints:**
```
GET /categories                    # All pose categories
GET /categories?name=standing      # Single category
GET /poses                         # All 254 poses
GET /poses?level=beginner         # Filter by difficulty
GET /poses/:id                    # Single pose details
```

### API #2: Yogism API (Secondary)
- **URL:** `https://priyangsubanerjee.github.io/yogism/yogism-api.json`
- **Type:** Static JSON file
- **Data:** Pre-built yoga courses/flows
- **Update Frequency:** Manual (GitHub)
- **Best For:** Guided programs, sequences, timed flows

**Structure:**
```json
{
  "featured": [
    {
      "name": "Course Name",
      "date": "19th Aug",
      "image": "URL",
      "description": "...",
      "time_taken": "16 Min",
      "level": "Level 1",
      "scheduled": [{ pose data }]
    }
  ]
}
```

### API #3: Yoga Capstone (Tertiary - Self-hosted)
- **Repository:** `https://github.com/alexcumplido/yoga-api`
- **Type:** Vector assets (SVG) + Database
- **Data:** 300+ poses with detailed instructions
- **Update Frequency:** As needed
- **Best For:** Advanced instruction, form validation, variations

**Note:** Requires self-hosting. Optional for MVP.

---

## 🗂️ DATA MAPPING STRATEGY

### Step 1: Normalize All 3 APIs to Common Format

```javascript
// Common format for all poses
const normalizedPose = {
  // Unique identifier
  id: 'pose_123',

  // Names
  english_name: 'Mountain Pose',
  sanskrit_name: 'Tadasana',

  // Classification
  difficulty: 'beginner',              // beginner | intermediate | advanced
  category: 'standing',                // standing | seated | prone | supine | dynamic
  posture_type: 'standing',            // For compatibility

  // Timing & Duration
  duration_seconds: 300,               // Default 5 min
  hold_duration_seconds: 60,           // How long to hold

  // Content
  description: 'Stand with feet together...',
  benefits: ['Anxiety reduction', 'Improves focus'],
  contraindications: ['Lower back pain'],

  // Instructions
  steps: [
    'Stand with feet hip-width apart',
    'Engage your thighs',
    'Take 5-10 breaths'
  ],
  variations: 'With arms overhead',
  preparation: ['Take 3 deep breaths'],

  // Mental Health
  for_conditions: ['anxiety', 'stress', 'depression'],
  neuro_effects: {
    serotonin: 'mild_increase',        // ↑ increase, ↓ decrease, ✓ no_change
    dopamine: 'mild_increase',
    cortisol: 'mild_decrease',
    oxytocin: 'no_change',
    gaba: 'increase'
  },
  chakra_focus: 'muladhara',           // Root chakra
  kosha_impact: ['pranamaya kosha'],   // Energy sheath

  // Media
  images: {
    svg: 'https://yoga-api.../pose.svg',
    png: 'https://yoga-api.../pose.png',
    source: 'yoga-api'
  },
  video_url: null,

  // Research
  research_evidence: [
    {
      study: 'Study Name',
      doi: 'https://doi.org/...',
      effect_size: 'd = 0.45',
      population: 'Anxiety patients'
    }
  ],

  // Metadata
  api_sources: ['yoga-api', 'yogism-api'],
  search_tags: ['grounding', 'focus', 'balance'],
  synced_at: '2026-03-25T12:00:00Z',
  source_updated_at: '2026-03-25T12:00:00Z'
};
```

---

## 🔄 API-SPECIFIC MAPPING

### API #1: Yoga API → Firestore Mapping

**Yoga API Response:**
```json
{
  "id": 1,
  "englishName": "Mountain Pose",
  "sanskritName": "Tadasana",
  "level": "beginner",
  "category": "Standing Poses",
  "description": "Stand with feet together...",
  "benefits": [
    "Calms the mind",
    "Improves focus",
    "Reduces anxiety"
  ],
  "images": {
    "svg": "https://yoga-api-nzy4.onrender.com/v1/poses/1/image.svg",
    "png": "https://yoga-api-nzy4.onrender.com/v1/poses/1/image.png"
  }
}
```

**Firestore Mapping:**
```javascript
{
  id: 'pose_1',
  english_name: 'Mountain Pose',           // from englishName
  sanskrit_name: 'Tadasana',                // from sanskritName
  difficulty: 'beginner',                   // from level
  category: 'standing',                     // from category (normalize)
  description: 'Stand with feet together...', // from description
  benefits: [                               // from benefits
    'Calms the mind',
    'Improves focus',
    'Reduces anxiety'
  ],
  images: {                                 // from images
    svg: 'https://yoga-api-nzy4.onrender.com/v1/poses/1/image.svg',
    png: 'https://yoga-api-nzy4.onrender.com/v1/poses/1/image.png',
    source: 'yoga-api'
  },
  duration_seconds: 300,                    // default
  api_sources: ['yoga-api'],
  synced_at: timestamp
}
```

**Normalization Code:**
```javascript
function mapYogaAPI(apiPose) {
  return {
    id: `pose_${apiPose.id}`,
    english_name: apiPose.englishName,
    sanskrit_name: apiPose.sanskritName,
    difficulty: apiPose.level?.toLowerCase() || 'intermediate',
    category: normalizeCategory(apiPose.category),
    description: apiPose.description || '',
    benefits: Array.isArray(apiPose.benefits) ? apiPose.benefits : [apiPose.benefits],
    images: apiPose.images || {},
    duration_seconds: 300,
    api_sources: ['yoga-api'],
    created_at: new Date()
  };
}

function normalizeCategory(category) {
  const map = {
    'Standing Poses': 'standing',
    'Sitting Poses': 'seated',
    'Prone Poses': 'prone',
    'Supine Poses': 'supine',
    'Balancing Poses': 'standing',
    'Backbends': 'dynamic',
    'Forward Bends': 'seated',
    'Twists': 'dynamic',
    'Inversions': 'inverted'
  };
  return map[category] || 'other';
}
```

---

### API #2: Yogism API → Firestore Mapping

**Yogism API Response (for a course):**
```json
{
  "name": "4 yoga poses for beginners",
  "date": "19th Aug",
  "image": "https://i.pinimg.com/...",
  "description": "This course is for beginners...",
  "time_taken": "16 Min",
  "level": "Level 1",
  "scheduled": [
    {
      "sanskrit_name": "Sukhasana",
      "english_name": "Easy Pose",
      "description": "Sukhasana yoga posture facilitates...",
      "time": "3 Min",
      "image": "https://fitsri.com/...",
      "benefits": "Improves awareness regarding the body's posture...",
      "steps": "Sit on the ground or mat...",
      "variations": "",
      "category": "Beginner",
      "target": "Harmonizes central nervous system"
    }
  ]
}
```

**Firestore Mapping (Two collections):**

**1. Poses Enrichment:**
```javascript
// Find matching pose in yoga_poses and enrich
{
  id: 'pose_sukhasana',
  // ... existing fields ...

  // Add from Yogism
  in_programs: ['4 yoga poses for beginners'],
  duration_seconds: 180,                    // from "3 Min"
  steps: ['Sit on the ground...', 'Fold the legs...', ...],
  benefits: [..., 'Harmonizes central nervous system'],
  category: 'Beginner',
  api_sources: ['yoga-api', 'yogism-api']   // merged
}
```

**2. Create Program Document:**
```javascript
db.collection('yoga_programs').doc('program_beginner_4poses').set({
  id: 'program_beginner_4poses',
  name: '4 yoga poses for beginners',
  description: 'This course is for beginners...',
  level: 'beginner',
  total_duration_minutes: 16,
  image_url: 'https://i.pinimg.com/...',
  poses_sequence: [
    { pose_id: 'pose_sukhasana', order: 1, duration: 180 },
    { pose_id: 'pose_tadasana', order: 2, duration: 180 },
    { pose_id: 'pose_vrksasana', order: 3, duration: 120 },
    { pose_id: 'pose_uttanasana', order: 4, duration: 180 }
  ],
  created_at: timestamp
});
```

**Mapping Code:**
```javascript
function mapYogismProgram(apiProgram) {
  const totalMinutes = parseInt(apiProgram.time_taken);

  return {
    id: `program_${slugify(apiProgram.name)}`,
    name: apiProgram.name,
    description: apiProgram.description,
    level: mapYogismLevel(apiProgram.level),
    total_duration_minutes: totalMinutes,
    image_url: apiProgram.image,
    created_at: new Date(),
    poses_sequence: apiProgram.scheduled.map((pose, idx) => ({
      english_name: pose.english_name,
      sanskrit_name: pose.sanskrit_name,
      order: idx + 1,
      duration_minutes: parseInt(pose.time),
      benefits: pose.benefits,
      steps: pose.steps?.split('\n') || [],
      variations: pose.variations
    }))
  };
}

function mapYogismLevel(level) {
  const map = {
    'Level 1': 'beginner',
    'Level 2': 'intermediate',
    'Level 3': 'advanced'
  };
  return map[level] || 'beginner';
}
```

---

### API #3: Yoga Capstone (Optional) → Firestore

**Capstone Structure:**
```json
{
  "id": 123,
  "name": "Mountain Pose",
  "sanskrit": "Tadasana",
  "difficulty": "beginner",
  "duration": 300,
  "category": "standing",
  "instructions": [
    { "step": 1, "text": "...", "timing": "5s" }
  ],
  "benefits": ["..."],
  "images": [{ "url": "...", "alt": "..." }],
  "videos": [{ "url": "youtube.com/...", "source": "youtube" }],
  "preparation": ["Take 3 breaths"],
  "modifications": [
    { "name": "arms up", "difficulty": "intermediate" }
  ]
}
```

**Mapping Code:**
```javascript
function enrichFromCapstone(poses, capstoneData) {
  const poseMap = new Map(poses.map(p => [
    p.english_name.toLowerCase(),
    p
  ]));

  capstoneData.forEach(capstonePose => {
    const key = capstonePose.name.toLowerCase();
    const pose = poseMap.get(key);

    if (pose) {
      // Enrich with capstone data
      pose.duration_seconds = capstonePose.duration || pose.duration_seconds;
      pose.instructions = capstonePose.instructions || [];
      pose.videos = capstonePose.videos || [];
      pose.preparation = capstonePose.preparation || [];
      pose.modifications = capstonePose.modifications || [];
      pose.api_sources.push('capstone-api');
    }
  });

  return Array.from(poseMap.values());
}
```

---

## 🧩 MENTAL HEALTH MAPPING

### Condition → Pose Recommendation

**Anxiety:**
```javascript
{
  condition: 'anxiety',
  target_assessment: 'gad7',
  min_score: 10,
  recommended_poses: [
    'tadasana',           // Grounding
    'child_pose',         // Calming
    'tree_pose',          // Balance
    'cat_cow',            // Gentle flow
    'legs_up_wall',       // Restorative
    'savasana'            // Relaxation
  ],
  recommended_duration: '15-30 minutes',
  frequency: '3-4 times per week',
  expected_improvement: 'GAD-7 reduction 4-6 points',
  research: [
    { doi: '10.1017/S1461145721000182', effect: 'moderate' }
  ]
}
```

**Depression:**
```javascript
{
  condition: 'depression',
  target_assessment: 'phq9',
  min_score: 10,
  recommended_poses: [
    'sun_salutation',     // Energizing
    'warrior_poses',      // Strength
    'backbends',          // Mood lifting
    'inversions',         // Blood flow
    'savasana'            // Recovery
  ],
  recommended_duration: '20-40 minutes',
  frequency: 'Daily or 5-6 times per week',
  expected_improvement: 'PHQ-9 reduction 5-8 points',
  research: [
    { doi: '10.1177/1359105318769805', effect: 'large' }
  ]
}
```

**Stress:**
```javascript
{
  condition: 'stress',
  target_assessment: 'dass21_stress',
  min_score: 15,
  recommended_poses: [
    'balasana',           // Surrendering
    'supported_poses',    // Grounding
    'breathing_work',     // Activation
    'restorative_poses',  // Relaxation
    'yoga_nidra'          // Deep rest
  ],
  recommended_duration: '10-20 minutes',
  frequency: '4-5 times per week',
  expected_improvement: 'DASS-21 stress reduction 5-7 points',
  research: [
    { doi: '10.3390/jcm8081351', effect: 'moderate' }
  ]
}
```

**Firestore Structure:**
```javascript
// Collection: mental_health_yoga_mapping
db.collection('mental_health_yoga_mapping').doc('anxiety').set({
  condition: 'anxiety',
  protocols: ['anxiety_relief'],
  recommended_poses: [
    'pose_1', 'pose_2', 'pose_3', ...
  ],
  alternative_poses: [
    'pose_4', 'pose_5', ...
  ],
  contraindicated_poses: [
    'intense_backbends', 'advanced_inversions'
  ],
  research_evidence: [...]
});
```

---

## 📊 NEUROBIOLOGICAL MAPPING

**How Poses Affect Mental Health:**

```javascript
const neuroMapping = {
  // Poses that increase serotonin
  serotonin_boosting: {
    high: ['surya_namaskar', 'warrior_poses', 'backbends'],
    moderate: ['forward_bends', 'standing_poses'],
    mild: ['seated_poses', 'gentle_flows']
  },

  // Poses that lower cortisol (stress hormone)
  cortisol_lowering: {
    high: ['savasana', 'yoga_nidra', 'supported_inversions'],
    moderate: ['restorative_poses', 'balasana'],
    mild: ['gentle_stretches']
  },

  // Poses that activate parasympathetic nervous system
  parasympathetic_activation: {
    high: ['legs_up_wall', 'yoga_nidra', 'supported_child_pose'],
    moderate: ['gentle_backbends', 'seated_forward_bends'],
    mild: ['breathing_exercises']
  },

  // Vagal tone improvement
  vagal_tone_improving: {
    high: ['ujjayi_breathing', 'chanting'],
    moderate: ['humming_breath', 'slow_breathing'],
    mild: ['conscious_breathing']
  }
};

// Each pose stores this in Firestore:
{
  id: 'pose_123',
  neuro_effects: {
    serotonin: 'mild_increase',
    dopamine: 'mild_increase',
    cortisol: 'moderate_decrease',
    oxytocin: 'no_change',
    gaba: 'mild_increase'
  },
  parasympathetic_activation: 'moderate',
  vagal_tone_impact: 'mild_increase',
  activation_level: 'calming',  // calming | balancing | energizing
}
```

---

## ✅ VALIDATION CHECKLIST

Before storing pose in Firestore, ensure:

```javascript
function validatePose(pose) {
  const required = [
    'id', 'english_name', 'sanskrit_name',
    'difficulty', 'category', 'benefits'
  ];

  const valid = required.every(field => {
    if (!pose[field]) {
      console.error(`Missing required field: ${field}`);
      return false;
    }
    return true;
  });

  if (!valid) return false;

  // Validate enum values
  const validDifficulties = ['beginner', 'intermediate', 'advanced'];
  if (!validDifficulties.includes(pose.difficulty)) {
    console.error(`Invalid difficulty: ${pose.difficulty}`);
    return false;
  }

  const validCategories = ['standing', 'seated', 'prone', 'supine', 'dynamic', 'inverted'];
  if (!validCategories.includes(pose.category)) {
    console.error(`Invalid category: ${pose.category}`);
    return false;
  }

  return true;
}
```

---

## 🔗 SAMPLE INTEGRATION CODE

**Complete Data Sync Function:**

```javascript
async function syncAllYogaAPIs() {
  console.log('Starting complete yoga data sync...');

  try {
    // 1. Fetch all APIs
    const [yogaAPI, yogismAPI, capstoneAPI] = await Promise.all([
      fetch('https://yoga-api-nzy4.onrender.com/v1/poses').then(r => r.json()),
      fetch('https://priyangsubanerjee.github.io/yogism/yogism-api.json').then(r => r.json()),
      loadCapstoneAPI() // Self-hosted or GitHub
    ]);

    console.log(`✅ Fetched: ${yogaAPI.length} poses, ${yogismAPI.featured.length} programs`);

    // 2. Normalize & merge
    let poses = yogaAPI.map(p => mapYogaAPI(p));
    poses = enrichFromYogism(poses, yogismAPI.featured);
    poses = enrichFromCapstone(poses, capstoneAPI);

    // 3. Validate
    const validPoses = poses.filter(p => validatePose(p));
    console.log(`✅ Validated ${validPoses.length}/${poses.length} poses`);

    // 4. Store in Firestore
    const db = firebase.firestore();
    const batch = db.batch();

    validPoses.forEach((pose, idx) => {
      batch.set(db.collection('yoga_poses').doc(pose.id), pose);
      if ((idx + 1) % 100 === 0) {
        batch.commit();
        batch = db.batch(); // New batch after 100 docs
      }
    });

    // Final batch
    if (validPoses.length % 100 !== 0) {
      await batch.commit();
    }

    console.log(`✅ Stored ${validPoses.length} poses in Firestore`);

    // 5. Create mental health mappings
    await createMentalHealthMappings(db);

    console.log('✨ Sync complete!');
    return {
      success: true,
      poses_synced: validPoses.length,
      programs_synced: yogismAPI.featured.length
    };

  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  }
}
```

---

## 📋 FIRESTORE SCHEMA SUMMARY

```
yoga_poses/{pose_id}
├── id (string)
├── english_name (string)
├── sanskrit_name (string)
├── difficulty (string: beginner|intermediate|advanced)
├── category (string: standing|seated|prone|supine|dynamic|inverted)
├── description (string)
├── benefits (array<string>)
├── duration_seconds (number)
├── images (map)
│   ├── svg (string)
│   ├── png (string)
│   └── source (string: yoga-api|yogism-api|capstone-api)
├── steps (array<string>)
├── variations (string)
├── for_conditions (array<string>)
├── neuro_effects (map)
│   ├── serotonin (string)
│   ├── dopamine (string)
│   ├── cortisol (string)
│   └── ...
├── api_sources (array<string>)
├── synced_at (timestamp)
└── source_updated_at (timestamp)

yoga_programs/{program_id}
├── id (string)
├── name (string)
├── description (string)
├── level (string)
├── total_duration_minutes (number)
├── image_url (string)
├── poses_sequence (array<object>)
│   ├── pose_id (string)
│   ├── order (number)
│   └── duration (number)
└── created_at (timestamp)

yoga_protocols/{protocol_id}
├── id (string)
├── name (string)
├── description (string)
├── target_condition (string: anxiety|depression|stress)
├── target_scores (map)
├── duration_days (number)
├── frequency (string)
├── recommended_poses (array<string>)
└── created_at (timestamp)
```

---

**This mapping ensures all 3 APIs work harmoniously in one unified system!** ✨
