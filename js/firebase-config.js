/**
 * SYNAWATCH - Firebase Configuration
 */

// Firebase configuration using values from config.js
const firebaseConfig = {
    apiKey: CONFIG.FIREBASE_API_KEY,
    authDomain: CONFIG.FIREBASE_AUTH_DOMAIN,
    projectId: CONFIG.FIREBASE_PROJECT_ID,
    storageBucket: CONFIG.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: CONFIG.FIREBASE_MESSAGING_SENDER_ID,
    appId: CONFIG.FIREBASE_APP_ID
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence (warning is expected in Firebase 10.x compat)
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.log('Firestore: Multiple tabs open, using memory cache');
    } else if (err.code === 'unimplemented') {
        console.log('Firestore: Persistence not supported');
    }
});

// Auth state change listener
auth.onAuthStateChanged((user) => {
    if (user) {
        console.log('User logged in:', user.email);
        // Store user data in localStorage for quick access
        localStorage.setItem('synawatch_user', JSON.stringify({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL
        }));
    } else {
        console.log('User logged out');
        localStorage.removeItem('synawatch_user');
    }
});

/**
 * Firebase Helper Functions
 * All user data is stored as subcollections under users/{uid}/
 */
const FirebaseService = {

    /**
     * Get a subcollection reference under the user's document
     */
    userCol(userId, collectionName) {
        return db.collection('users').doc(userId).collection(collectionName);
    },

    // ===== User Management =====

    /**
     * Create or update user document
     */
    async createUserDocument(user, additionalData = {}) {
        const userRef = db.collection('users').doc(user.uid);
        const snapshot = await userRef.get();

        if (!snapshot.exists) {
            const { email, displayName, photoURL } = user;
            const createdAt = firebase.firestore.FieldValue.serverTimestamp();

            await userRef.set({
                uid: user.uid,
                email,
                name: displayName || additionalData.name || email.split('@')[0],
                avatar: photoURL || null,
                createdAt,
                updatedAt: createdAt,
                ...additionalData
            });
        }

        return userRef;
    },

    /**
     * Get user document
     */
    async getUserDocument(uid) {
        const userRef = db.collection('users').doc(uid);
        const snapshot = await userRef.get();
        return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
    },

    /**
     * Update user document
     */
    async updateUserDocument(uid, data) {
        const userRef = db.collection('users').doc(uid);
        await userRef.update({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    // ===== Health Readings =====

    /**
     * Save health reading
     */
    async saveHealthReading(userId, data) {
        const reading = {
            ...data,
            heartRateStatus: Utils.getHeartRateStatus(data.hr).status,
            spo2Status: Utils.getSpO2Status(data.spo2).status,
            stressStatus: Utils.getStressStatus(data.stress).status,
            gsrStatus: Utils.getGSRStatus(data.gsr).status,
            readingTime: firebase.firestore.FieldValue.serverTimestamp(),
            readingType: 'realtime'
        };

        return await this.userCol(userId, 'healthReadings').add(reading);
    },

    /**
     * Get recent health readings
     */
    async getHealthReadings(userId, limit = 50) {
        const snapshot = await this.userCol(userId, 'healthReadings')
            .orderBy('readingTime', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    /**
     * Get health readings for date range
     */
    async getHealthReadingsForRange(userId, startDate, endDate) {
        const snapshot = await this.userCol(userId, 'healthReadings')
            .where('readingTime', '>=', startDate)
            .where('readingTime', '<=', endDate)
            .orderBy('readingTime', 'desc')
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // ===== Health Data (Aggregated) =====

    /**
     * Save aggregated health data
     */
    async saveHealthData(userId, data) {
        return await this.userCol(userId, 'healthData').add({
            ...data,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    /**
     * Get health data
     */
    async getHealthData(userId, limit = 100) {
        const snapshot = await this.userCol(userId, 'healthData')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // ===== Analytics Summary =====

    /**
     * Save or update analytics summary
     */
    async saveAnalyticsSummary(userId, date, data) {
        const docRef = this.userCol(userId, 'analyticsSummary').doc(date);

        await docRef.set({
            date,
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        return docRef;
    },

    /**
     * Get analytics summary for date
     */
    async getAnalyticsSummary(userId, date) {
        const snapshot = await this.userCol(userId, 'analyticsSummary').doc(date).get();
        return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
    },

    /**
     * Get analytics summaries for range
     */
    async getAnalyticsSummaries(userId, startDate, endDate) {
        const snapshot = await this.userCol(userId, 'analyticsSummary')
            .where('date', '>=', startDate)
            .where('date', '<=', endDate)
            .orderBy('date', 'desc')
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // ===== Recording History =====

    /**
     * Save recording session
     */
    async saveRecordingSession(userId, data) {
        return await this.userCol(userId, 'recordingHistory').add({
            ...data,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    /**
     * Get recording history
     */
    async getRecordingHistory(userId, limit = 20) {
        const snapshot = await this.userCol(userId, 'recordingHistory')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // ===== Chat History =====

    /**
     * Save chat message
     */
    async saveChatMessage(userId, message) {
        const chatRef = this.userCol(userId, 'chatHistory').doc('main');
        const snapshot = await chatRef.get();

        if (snapshot.exists) {
            await chatRef.update({
                messages: firebase.firestore.FieldValue.arrayUnion(message),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await chatRef.set({
                messages: [message],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    },

    /**
     * Get chat history
     */
    async getChatHistory(userId) {
        const snapshot = await this.userCol(userId, 'chatHistory').doc('main').get();
        return snapshot.exists ? snapshot.data().messages || [] : [];
    },

    /**
     * Clear chat history
     */
    async clearChatHistory(userId) {
        await this.userCol(userId, 'chatHistory').doc('main').delete();
    },

    // ===== Statistics =====

    /**
     * Get user statistics
     */
    async getUserStatistics(userId) {
        const [recordings, healthData] = await Promise.all([
            this.getRecordingHistory(userId, 1000),
            this.getHealthData(userId, 1000)
        ]);

        const totalSessions = recordings.length;
        const totalDuration = recordings.reduce((acc, r) => acc + (r.durationSeconds || 0), 0);

        // Calculate days active
        const uniqueDays = new Set(recordings.map(r => {
            const date = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
            return date.toISOString().split('T')[0];
        }));

        // Calculate average health score
        const avgHealthScore = recordings.length > 0
            ? Math.round(recordings.reduce((acc, r) => acc + (r.healthScore || 0), 0) / recordings.length)
            : 0;

        return {
            totalSessions,
            totalDuration,
            daysActive: uniqueDays.size,
            avgHealthScore
        };
    },

    // ===== Assessment =====

    /**
     * Save assessment result
     */
    async saveAssessment(userId, data) {
        return await this.userCol(userId, 'assessments').add({
            ...data,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    /**
     * Get latest assessment for user
     */
    async getLatestAssessment(userId) {
        const snapshot = await this.userCol(userId, 'assessments')
            .orderBy('timestamp', 'desc')
            .limit(1)
            .get();
        return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    },

    /**
     * Get all assessments for user
     */
    async getAssessmentHistory(userId, limit = 10) {
        const snapshot = await this.userCol(userId, 'assessments')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // ===== Intervention Logs =====

    /**
     * Log an intervention event
     */
    async logIntervention(userId, data) {
        return await this.userCol(userId, 'interventionLogs').add({
            ...data,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    },

    /**
     * Get intervention logs
     */
    async getInterventionLogs(userId, limit = 50) {
        const snapshot = await this.userCol(userId, 'interventionLogs')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // ===== Emergency Plans =====

    /**
     * Save or update emergency plan
     */
    async saveEmergencyPlan(userId, data) {
        const docRef = this.userCol(userId, 'emergencyPlans').doc('plan');
        await docRef.set({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return docRef;
    },

    /**
     * Get emergency plan
     */
    async getEmergencyPlan(userId) {
        const snapshot = await this.userCol(userId, 'emergencyPlans').doc('plan').get();
        return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
    },

    // ===== Academy Progress =====

    /**
     * Mark lesson as complete
     */
    async markLessonComplete(userId, courseId, lessonId) {
        const docRef = this.userCol(userId, 'academyProgress').doc(courseId);
        const snapshot = await docRef.get();

        if (snapshot.exists) {
            await docRef.update({
                completedLessons: firebase.firestore.FieldValue.arrayUnion(lessonId),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await docRef.set({
                courseId,
                completedLessons: [lessonId],
                startedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    },

    /**
     * Get academy progress for all courses
     */
    async getAcademyProgress(userId) {
        const snapshot = await this.userCol(userId, 'academyProgress').get();
        const progress = {};
        snapshot.docs.forEach(doc => {
            const data = doc.data();
            progress[data.courseId] = data.completedLessons || [];
        });
        return progress;
    }
};

// Make services globally available
window.auth = auth;
window.db = db;
window.FirebaseService = FirebaseService;
