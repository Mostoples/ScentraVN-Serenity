# 🧘 YOGA FEATURE - ARCHITECTURE & CHECKLIST

**Status:** Ready for Implementation
**Created:** March 25, 2026

---

## 📐 SYSTEM ARCHITECTURE

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL YOGA APIS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  Yoga API       │  │  Yogism API      │  │  Capstone API │  │
│  │  (254 poses)    │  │  (programs)      │  │  (300+ poses) │  │
│  │  yoga-api-nzy4. │  │  priyangsuban... │  │  github.com   │  │
│  │  onrender.com   │  │  .github.io      │  │  /yoga-api    │  │
│  └────────┬────────┘  └────────┬─────────┘  └───────┬───────┘  │
│           │                    │                      │          │
└───────────┼────────────────────┼──────────────────────┼──────────┘
            │                    │                      │
            └────────┬───────────┴──────────┬───────────┘
                     │                      │
    ┌────────────────▼──────────────────────▼────────────────┐
    │         DATA NORMALIZATION & ENRICHMENT                │
    │          (setup-yoga-data.js script)                  │
    │                                                        │
    │  1. Fetch all 3 APIs in parallel                      │
    │  2. Normalize to common format                        │
    │  3. Merge & enrich with cross-references              │
    │  4. Validate data quality                             │
    └─────────────┬──────────────────────────┬──────────────┘
                  │                          │
    ┌─────────────▼─────────────┬────────────▼──────────────┐
    │     FIRESTORE DATABASE    │                           │
    │                           │                           │
    │  Collections Created:     │  New Indexes:             │
    │  ┌──────────────────┐    │  ┌────────────────────┐   │
    │  │ yoga_poses       │    │  │ (difficulty, cat)  │   │
    │  │ yoga_protocols   │    │  │ (user_id, date)    │   │
    │  │ yoga_programs    │    │  │ (condition, date)  │   │
    │  │ yoga_sessions    │    │  └────────────────────┘   │
    │  │ mental_health_   │    │                           │
    │  │   yoga_map       │    │  Security Rules:          │
    │  └──────────────────┘    │  ┌────────────────────┐   │
    │                           │  │ Public read        │   │
    │  Subcollections:          │  │ Admin write        │   │
    │  ┌──────────────────┐    │  │ User owns sessions │   │
    │  │ users/{id}/      │    │  └────────────────────┘   │
    │  │   session_       │    │                           │
    │  │   history        │    │                           │
    │  └──────────────────┘    │                           │
    └───────────┬──────────────┴──────────────┬─────────────┘
                │                             │
                │            ┌────────────────▼─────────┐
                │            │ ASSESSMENT DATA          │
                │            │ (from PHQ-9, GAD-7,      │
                │            │  DASS-21 scores)         │
                │            └────────────────┬─────────┘
                │                             │
    ┌───────────▼─────────────────────────────▼────────────┐
    │         WEB APPLICATION (Vue.js)                      │
    │                                                       │
    │  ┌──────────────────────────────────────────────┐   │
    │  │ Yoga Feature Components                      │   │
    │  │                                              │   │
    │  │ ┌─────────────────────────────────────────┐ │   │
    │  │ │ Yoga Main View                          │ │   │
    │  │ │ • Recommendation Engine                 │ │   │
    │  │ │ • Pose Library with Filters             │ │   │
    │  │ │ • Quick Start Buttons                   │ │   │
    │  │ │ • Browse by Difficulty/Category         │ │   │
    │  │ └─────────────────────────────────────────┘ │   │
    │  │                                              │   │
    │  │ ┌─────────────────────────────────────────┐ │   │
    │  │ │ Session Player Component                │ │   │
    │  │ │ • Display current pose                  │ │   │
    │  │ │ • Timer for each pose                   │ │   │
    │  │ │ • Session progress bar                  │ │   │
    │  │ │ • Pre/post session metrics              │ │   │
    │  │ │ • Session summary                       │ │   │
    │  │ └─────────────────────────────────────────┘ │   │
    │  │                                              │   │
    │  │ ┌─────────────────────────────────────────┐ │   │
    │  │ │ Progress & Analytics                    │ │   │
    │  │ │ • Completion stats                      │ │   │
    │  │ │ • Mood improvement tracking             │ │   │
    │  │ │ • Compliance charts                     │ │   │
    │  │ │ • Integration with Dashboard            │ │   │
    │  │ └─────────────────────────────────────────┘ │   │
    │  └──────────────────────────────────────────────┘   │
    │                                                       │
    │  Integration Points:                                 │
    │  • Assessment Module (PHQ-9, GAD-7, DASS-21)        │
    │  • Intervention Engine (JITAI recommendations)       │
    │  • Dashboard (yoga stats widget)                     │
    │  • Academy (yoga education)                          │
    │  • Navigation Menu                                  │
    └─────────────────────────────────────────────────────┘
```

---

## 📊 DATA MODEL RELATIONSHIPS

```
┌──────────────────┐
│ users/{userId}   │
│                  │
│ • uid            │
│ • name           │
│ • age            │
│ • mental_health_ │
│   profile        │
│ • current_       │
│   protocol_id ──────┐
│ • streak_days    │  │
└──────────────────┘  │
    │                 │
    │ 1:N             │
    │ (subcoll)       │
    ▼                 │
┌─────────────────┐   │
│ assessments/    │   │
│ {assessmentId}  │   │
│                 │   │  ┌──────────────────────┐
│ • phq9_score    │   │  │ yoga_protocols/      │
│ • gad7_score    │   │  │ {protocolId}         │
│ • dass21_*      │   └─▶│                      │
│ • created_at    │      │ • name               │
└─────────────────┘      │ • target_condition   │
                         │ • duration_days      │
                         │ • frequency          │
                         │ • recommended_poses[]│
    ┌───────────────┐    └──────────────────────┘
    │ yoga_protocols    │
    │ {protocolId}  │
    │               │
    │ • name        │         ┌──────────────────┐
    │ • target_     │         │ yoga_poses/      │
    │   condition   ├────────▶│ {poseId}         │
    │ • recommen    │         │                  │
    │   ded_poses[] │         │ • english_name   │
    └───────────────┘         │ • sanskrit_name  │
                              │ • difficulty     │
                              │ • category       │
                              │ • benefits[]     │
                              │ • duration_sec   │
                              │ • images{}       │
                              │ • neuro_effects{}│
                              └──────────────────┘
    ┌──────────────────┐
    │ yoga_sessions/   │
    │ {sessionId}      │
    │                  │
    │ • user_id        │
    │ • protocol_id ──────┐
    │ • session_date   │  │
    │ • duration       │  │
    │ • poses_complete │  │
    │ • pre_session{}  │  │
    │ • post_session{} │  │
    └──────────────────┘  │
         │                │
         └────────────────┘
```

---

## 🔄 IMPLEMENTATION WORKFLOW

### Week 1: Data Sync

```
START
  │
  ├─ Step 1: Prepare environment
  │   ├─ npm install firebase-admin node-fetch
  │   ├─ Verify serviceAccountKey.json exists
  │   └─ ✓ Ready
  │
  ├─ Step 2: Create sync script
  │   ├─ Copy setup-yoga-data.js
  │   ├─ Review code (no changes needed)
  │   └─ ✓ Ready
  │
  ├─ Step 3: Run data sync
  │   ├─ node setup-yoga-data.js
  │   │   ├─ Fetch 3 APIs in parallel
  │   │   ├─ Normalize data
  │   │   ├─ Store in Firestore (batch ops)
  │   │   ├─ Create protocols
  │   │   └─ Create mappings
  │   └─ ✓ Verify in Firebase Console
  │
  ├─ Step 4: Verify data
  │   ├─ Firebase Console → Firestore
  │   ├─ Check yoga_poses (254+ docs)
  │   ├─ Check yoga_protocols (3 docs)
  │   ├─ Check mental_health_yoga_map (3 docs)
  │   └─ ✓ All data present
  │
  ├─ Step 5: Setup Firestore rules
  │   ├─ Add yoga rules to firestore.rules
  │   ├─ firebase deploy --only firestore:rules
  │   └─ ✓ Rules deployed
  │
  └─ WEEK 1 COMPLETE ✓
```

### Week 2: UI Components & Integration

```
START WEEK 2
  │
  ├─ Step 1: Create Yoga Main Component
  │   ├─ Create yoga-main.js or YogaMain.vue
  │   ├─ Add recommendation engine logic
  │   ├─ Add pose library with filters
  │   ├─ Add pose detail modal
  │   └─ ✓ Component ready
  │
  ├─ Step 2: Create Session Component
  │   ├─ Create yoga-session.js or YogaSession.vue
  │   ├─ Build session player UI
  │   ├─ Add timer logic
  │   ├─ Add progress tracking
  │   ├─ Add session summary
  │   └─ ✓ Component ready
  │
  ├─ Step 3: Integrate into Main App
  │   ├─ Add routes to app.js/router.js
  │   │   ├─ /yoga → Yoga main view
  │   │   └─ /yoga-session/:id → Session player
  │   ├─ Add navigation items
  │   │   └─ Add "Yoga" button to bottom nav
  │   ├─ Import components
  │   └─ ✓ Routes working
  │
  ├─ Step 4: Connect Assessment Data
  │   ├─ Modify recommendation engine
  │   │   ├─ Read latest assessment
  │   │   ├─ Determine primary condition
  │   │   ├─ Select matching protocol
  │   │   └─ Customize based on severity
  │   ├─ Test with sample assessments
  │   └─ ✓ Recommendations accurate
  │
  ├─ Step 5: Add Dashboard Widget
  │   ├─ Create yoga stats component
  │   │   ├─ Total sessions
  │   │   ├─ Total duration
  │   │   ├─ This week count
  │   │   ├─ Mood improvement
  │   │   └─ Streak days
  │   ├─ Add to dashboard
  │   └─ ✓ Widget visible & updating
  │
  └─ WEEK 2 COMPLETE ✓
```

### Week 3: Testing & Optimization

```
START WEEK 3
  │
  ├─ Step 1: Unit Testing
  │   ├─ Test data sync function
  │   ├─ Test normalization logic
  │   ├─ Test recommendation engine
  │   └─ ✓ 80%+ coverage
  │
  ├─ Step 2: Integration Testing
  │   ├─ Test Firestore queries
  │   ├─ Test session saving
  │   ├─ Test data retrieval
  │   └─ ✓ All queries work
  │
  ├─ Step 3: UI/UX Testing
  │   ├─ Test on mobile devices
  │   ├─ Test on desktop
  │   ├─ Check image loading
  │   ├─ Test filters & search
  │   └─ ✓ Responsive & fast
  │
  ├─ Step 4: Performance Optimization
  │   ├─ Optimize image loading (lazy load)
  │   ├─ Implement pagination
  │   ├─ Cache Firestore queries
  │   ├─ Reduce bundle size
  │   └─ ✓ Page load < 3s
  │
  ├─ Step 5: Bug Fixes
  │   ├─ Fix reported issues
  │   ├─ Test edge cases
  │   ├─ Cross-browser testing
  │   └─ ✓ All bugs fixed
  │
  └─ WEEK 3 COMPLETE ✓
```

### Week 4: Deployment

```
START WEEK 4
  │
  ├─ Step 1: Final Testing
  │   ├─ Run full test suite
  │   ├─ Manual smoke testing
  │   ├─ Performance monitoring
  │   └─ ✓ Ready for production
  │
  ├─ Step 2: Production Deployment
  │   ├─ Update version numbers
  │   ├─ Create release notes
  │   ├─ firebase deploy
  │   ├─ Verify deployment
  │   └─ ✓ Live in production
  │
  ├─ Step 3: Monitoring Setup
  │   ├─ Enable Firestore monitoring
  │   ├─ Setup error tracking
  │   ├─ Monitor user engagement
  │   └─ ✓ Monitoring active
  │
  ├─ Step 4: User Communication
  │   ├─ Post in-app announcement
  │   ├─ Send email to users
  │   ├─ Create tutorial
  │   └─ ✓ Users informed
  │
  ├─ Step 5: Post-Launch Support
  │   ├─ Monitor feedback
  │   ├─ Fix urgent issues
  │   ├─ Optimize based on usage
  │   └─ ✓ Feature stable
  │
  └─ DEPLOYMENT COMPLETE ✓ 🎉
```

---

## ✅ IMPLEMENTATION CHECKLIST

### Pre-Implementation
- [ ] Review all 4 documentation files
- [ ] Understand 3-API architecture
- [ ] Verify Firebase project exists
- [ ] Verify serviceAccountKey.json exists
- [ ] Node.js installed (v14+)
- [ ] npm installed

### Phase 1: Data Sync (Week 1)
- [ ] Create `setup-yoga-data.js`
- [ ] Run data sync script
- [ ] Verify 254+ poses in Firestore
- [ ] Verify 3 protocols created
- [ ] Verify mental health mappings
- [ ] Verify Firestore rules deployed
- [ ] Create Firestore indexes (if needed)

### Phase 2: UI Components (Week 1-2)
- [ ] Create YogaMain.vue or yoga-main.js
- [ ] Create YogaSession.vue or yoga-session.js
- [ ] Add routes to app.js/router
- [ ] Add navigation links
- [ ] Test recommendation engine
- [ ] Test session player
- [ ] Test filters & search
- [ ] Test on mobile device

### Phase 3: Integration (Week 2-3)
- [ ] Connect to assessment module
- [ ] Add dashboard widget
- [ ] Integrate with intervention engine
- [ ] Connect to academy
- [ ] Test all integrations
- [ ] Performance optimization
- [ ] Bug fixes

### Phase 4: Testing (Week 3)
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests
- [ ] E2E tests
- [ ] Mobile responsiveness
- [ ] Cross-browser testing
- [ ] Performance testing
- [ ] Security testing

### Phase 5: Deployment (Week 4)
- [ ] Final smoke testing
- [ ] Update version numbers
- [ ] Create release notes
- [ ] Deploy to production
- [ ] Verify deployment
- [ ] Setup monitoring
- [ ] User announcement
- [ ] Post-launch support

---

## 🎯 SUCCESS CRITERIA

### Data Sync Success
- [ ] All 3 APIs fetched successfully
- [ ] 254+ poses in Firestore
- [ ] Data properly normalized
- [ ] No duplicate poses
- [ ] All required fields present
- [ ] Images loading correctly
- [ ] Indexes created for queries

### UI/UX Success
- [ ] Yoga view loads instantly
- [ ] Recommendations accurate
- [ ] Filters work smoothly
- [ ] Session player responsive
- [ ] Timer works accurately
- [ ] Data persists on refresh
- [ ] Mobile-friendly layout

### Integration Success
- [ ] Assessment data used for recommendations
- [ ] Sessions saved to Firestore
- [ ] Dashboard widget shows stats
- [ ] Intervention engine includes yoga
- [ ] Progress tracked accurately
- [ ] Notifications working

### Performance Success
- [ ] Page load time < 3 seconds
- [ ] First pose loads < 500ms
- [ ] Session saving < 1 second
- [ ] Firestore queries < 100ms
- [ ] Mobile app smooth (60 FPS)
- [ ] No memory leaks

### User Success
- [ ] Users understand feature
- [ ] Can start session easily
- [ ] Can see their progress
- [ ] Report mood improvement
- [ ] Recommend to others
- [ ] 80%+ session completion

---

## 📋 DAILY STANDUP TEMPLATE

Use this during implementation:

```
DAILY STANDUP - YOGA FEATURE

Date: [DATE]
Phase: [1|2|3|4]

✅ COMPLETED TODAY:
  - [Task 1]
  - [Task 2]
  - [Task 3]

🚧 IN PROGRESS:
  - [Task 1] - [% complete]
  - [Task 2] - [% complete]

🔴 BLOCKERS:
  - [Issue description]
  - [Impact]
  - [Proposed solution]

⬜ NEXT 24 HOURS:
  - [Task 1]
  - [Task 2]
  - [Task 3]

📊 PROGRESS:
  Week 1: [0-100]% complete
  Total: [0-100]% complete

NOTES:
  - [Any observations]
  - [Lessons learned]
  - [Questions]
```

---

## 📞 SUPPORT & TROUBLESHOOTING

### API Issues
**Problem:** API endpoints timeout
**Solution:** Add retry logic with exponential backoff
```javascript
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, { timeout: 5000 });
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

### Firestore Quota
**Problem:** "Quota exceeded" error
**Solution:** Implement batch operations & rate limiting
```javascript
// Batch operations automatically
const batch = db.batch();
docs.forEach((doc, i) => {
  batch.set(db.collection('yoga_poses').doc(doc.id), doc);
  if ((i + 1) % 100 === 0) {
    batch.commit();
    batch = db.batch();
  }
});
```

### Image Loading
**Problem:** SVG images not displaying
**Solution:** Add error handling & fallbacks
```javascript
<img
  :src="pose.images.svg"
  :alt="pose.english_name"
  @error="handleImageError"
  onerror="this.src='assets/yoga-placeholder.svg'"
/>
```

### Performance
**Problem:** Slow page load
**Solution:** Lazy load images & paginate
```javascript
// Lazy load images
<img
  v-lazy="pose.images.svg"
  :alt="pose.english_name"
/>

// Paginate results
const perPage = 20;
const page = ref(0);
const poses = computed(() =>
  allPoses.value.slice(page.value * perPage, (page.value + 1) * perPage)
);
```

---

## 🚀 GO-LIVE CHECKLIST

### 48 Hours Before Launch
- [ ] Final testing completed
- [ ] All bugs fixed
- [ ] Monitoring set up
- [ ] Support team trained
- [ ] User docs ready

### Launch Day
- [ ] Deploy to production
- [ ] Monitor error rates
- [ ] Monitor Firestore usage
- [ ] Monitor user feedback
- [ ] Be ready to rollback if needed

### Post-Launch (First Week)
- [ ] Monitor daily engagement
- [ ] Respond to user feedback
- [ ] Fix critical issues
- [ ] Optimize based on usage
- [ ] Celebrate success! 🎉

---

**Created:** March 25, 2026
**Status:** Ready to Execute ✅
**Good luck! 🧘‍♀️**
