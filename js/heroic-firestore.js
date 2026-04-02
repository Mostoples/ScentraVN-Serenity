/**
 * SYNAWATCH - HEROIC Firestore Service
 * Handles all Firestore operations for HEROIC data persistence
 */

const HeroicFirestore = {

    /**
     * Initialize and load user's HEROIC data from Firestore
     * Called on app start / HEROIC page load
     */
    async init() {
        try {
            const user = auth?.currentUser;
            if (!user || typeof db === 'undefined') return false;

            console.log('[HeroicFirestore] Initializing for user:', user.uid);

            // Load current scores from user document
            await this.loadCurrentScores(user.uid);

            // Load today's completed activities
            await this.loadTodayActivities(user.uid);

            return true;
        } catch (error) {
            console.error('[HeroicFirestore] Init failed:', error);
            return false;
        }
    },

    /**
     * Load current HEROIC scores from Firestore
     * Updates HeroicXAI.scores with persisted data
     */
    async loadCurrentScores(userId) {
        try {
            if (typeof HeroicXAI === 'undefined') return;

            // Try to get current scores from user document
            const userDocRef = db.collection('users').doc(userId);
            const userDoc = await userDocRef.get();

            if (userDoc.exists) {
                const userData = userDoc.data();

                // Load HEROIC scores if they exist
                if (userData.heroicScores) {
                    console.log('[HeroicFirestore] Loading scores from Firestore:', userData.heroicScores);
                    Object.assign(HeroicXAI.scores, userData.heroicScores);
                    HeroicXAI.lastUpdated = userData.heroicLastUpdated?.toMillis() || Date.now();
                }

                // If no scores exist, initialize from assessment data
                if (!userData.heroicScores && userData.initialPhq9Score !== undefined) {
                    console.log('[HeroicFirestore] Initializing scores from assessment');
                    HeroicXAI.init(userData);
                    await this.saveCurrentScores(userId);
                }
            }
        } catch (error) {
            console.error('[HeroicFirestore] Load scores failed:', error);
        }
    },

    /**
     * Save current HEROIC scores to Firestore
     * Updates both user document (current state) and history collection (timeline)
     */
    async saveCurrentScores(userId) {
        try {
            if (typeof HeroicXAI === 'undefined') return;

            const user = auth?.currentUser;
            if (!user || user.uid !== userId) return;

            const scores = { ...HeroicXAI.scores };
            const overallScore = HeroicXAI.getOverallScore();
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();

            // 1. Update user document with current scores
            await db.collection('users').doc(userId).set({
                heroicScores: scores,
                heroicOverallScore: overallScore,
                heroicLastUpdated: timestamp
            }, { merge: true });

            console.log('[HeroicFirestore] Saved current scores to user doc');

            // 2. Also save to history collection for timeline
            await db.collection('heroicScoreHistory').add({
                userId: userId,
                scores: scores,
                overallScore: overallScore,
                timestamp: timestamp,
                source: 'auto_save'
            });

            console.log('[HeroicFirestore] Saved scores to history');

            return true;
        } catch (error) {
            console.error('[HeroicFirestore] Save scores failed:', error);
            return false;
        }
    },

    /**
     * Save activity completion to Firestore
     * Called when user completes a HEROIC activity
     */
    async saveActivityCompletion(activityData) {
        try {
            const user = auth?.currentUser;
            if (!user || typeof db === 'undefined') return;

            const data = {
                userId: user.uid,
                activityId: activityData.activityId,
                activityTitle: activityData.activityTitle,
                dimension: activityData.dimension,
                durationMin: activityData.durationMin,
                reflection: activityData.reflection || '',
                completedAt: firebase.firestore.FieldValue.serverTimestamp(),

                // Score data
                scoresBefore: activityData.scoresBefore || {},
                scoresAfter: activityData.scoresAfter || {},
                scoreGain: activityData.scoreGain || 0,

                // Sensor data (if available)
                sensorPre: activityData.sensorPre || null,
                sensorPost: activityData.sensorPost || null,

                // XAI explanation
                xaiExplanation: activityData.xaiExplanation || '',

                // Metadata
                deviceInfo: this._getDeviceInfo(),
                appVersion: 'v1.0'
            };

            // Save to top-level collection
            const docRef = await db.collection('heroicActivities').add(data);

            // Also save to user subcollection for easy querying
            await db.collection('users').doc(user.uid)
                .collection('heroicActivities').doc(docRef.id).set(data);

            console.log('[HeroicFirestore] Activity saved:', docRef.id);

            // Update scores in user document
            await this.saveCurrentScores(user.uid);

            return docRef.id;
        } catch (error) {
            console.error('[HeroicFirestore] Save activity failed:', error);
            return null;
        }
    },

    /**
     * Load today's completed activities
     * Updates HeroicProgram.completedToday
     */
    async loadTodayActivities(userId) {
        try {
            if (typeof HeroicProgram === 'undefined') return;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const snapshot = await db.collection('heroicActivities')
                .where('userId', '==', userId)
                .where('completedAt', '>=', today)
                .get();

            const completedIds = new Set();
            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.activityId) {
                    completedIds.add(data.activityId);
                }
            });

            HeroicProgram.completedToday = completedIds;
            console.log('[HeroicFirestore] Loaded today activities:', completedIds.size);

            return completedIds;
        } catch (error) {
            console.error('[HeroicFirestore] Load today activities failed:', error);
            return new Set();
        }
    },

    /**
     * Save daily summary
     * Called at end of day or on demand
     */
    async saveDailySummary(userId, summaryData) {
        try {
            const user = auth?.currentUser;
            if (!user || user.uid !== userId) return;

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const data = {
                userId: userId,
                date: firebase.firestore.Timestamp.fromDate(today),
                scores: summaryData.scores || HeroicXAI.scores,
                overallScore: summaryData.overallScore || HeroicXAI.getOverallScore(),
                activitiesCompleted: summaryData.activitiesCompleted || HeroicProgram.completedToday.size,
                activitiesList: summaryData.activitiesList || Array.from(HeroicProgram.completedToday),
                dimensionBreakdown: summaryData.dimensionBreakdown || this._getDimensionBreakdown(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Save to user subcollection
            await db.collection('users').doc(userId)
                .collection('heroicDailySummary')
                .doc(today.toISOString().split('T')[0]) // YYYY-MM-DD as doc ID
                .set(data, { merge: true });

            console.log('[HeroicFirestore] Daily summary saved');
            return true;
        } catch (error) {
            console.error('[HeroicFirestore] Save daily summary failed:', error);
            return false;
        }
    },

    /**
     * Get activity history for date range
     */
    async getActivityHistory(userId, days = 30) {
        try {
            const since = new Date();
            since.setDate(since.getDate() - days);

            const snapshot = await db.collection('heroicActivities')
                .where('userId', '==', userId)
                .where('completedAt', '>=', since)
                .orderBy('completedAt', 'desc')
                .limit(100)
                .get();

            const activities = [];
            snapshot.forEach(doc => {
                activities.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return activities;
        } catch (error) {
            console.error('[HeroicFirestore] Get activity history failed:', error);
            return [];
        }
    },

    /**
     * Get score history for charting
     */
    async getScoreHistory(userId, days = 30) {
        try {
            const since = new Date();
            since.setDate(since.getDate() - days);

            const snapshot = await db.collection('heroicScoreHistory')
                .where('userId', '==', userId)
                .where('timestamp', '>=', since)
                .orderBy('timestamp', 'asc')
                .limit(200)
                .get();

            const history = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                history.push({
                    id: doc.id,
                    timestamp: data.timestamp?.toMillis() || Date.now(),
                    scores: data.scores,
                    overallScore: data.overallScore
                });
            });

            return history;
        } catch (error) {
            console.error('[HeroicFirestore] Get score history failed:', error);
            return [];
        }
    },

    /**
     * Get statistics for dashboard/analytics
     */
    async getStatistics(userId) {
        try {
            const [activities, scoreHistory] = await Promise.all([
                this.getActivityHistory(userId, 30),
                this.getScoreHistory(userId, 30)
            ]);

            // Calculate stats
            const stats = {
                totalActivities: activities.length,
                activitiesThisWeek: activities.filter(a => {
                    const date = a.completedAt?.toMillis() || 0;
                    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                    return date >= weekAgo;
                }).length,

                currentScores: HeroicXAI.scores,
                overallScore: HeroicXAI.getOverallScore(),

                // Dimension breakdown
                dimensionProgress: {},

                // Streaks
                currentStreak: this._calculateStreak(activities),

                // Most active dimension
                mostActiveDimension: this._getMostActiveDimension(activities)
            };

            // Calculate progress for each dimension
            for (const dim of ['H', 'E', 'R', 'O', 'I', 'C']) {
                const dimActivities = activities.filter(a => a.dimension === dim);
                stats.dimensionProgress[dim] = {
                    completed: dimActivities.length,
                    score: HeroicXAI.scores[dim]
                };
            }

            return stats;
        } catch (error) {
            console.error('[HeroicFirestore] Get statistics failed:', error);
            return null;
        }
    },

    /**
     * Auto-save scores periodically
     * Called every 5 minutes or on significant changes
     */
    async autoSave() {
        const user = auth?.currentUser;
        if (!user) return;

        await this.saveCurrentScores(user.uid);
        console.log('[HeroicFirestore] Auto-save completed');
    },

    /**
     * Batch update - for data migration or bulk operations
     */
    async batchUpdateScores(userId, updates) {
        try {
            const batch = db.batch();

            // Update user document
            const userRef = db.collection('users').doc(userId);
            batch.update(userRef, updates);

            await batch.commit();
            console.log('[HeroicFirestore] Batch update completed');
            return true;
        } catch (error) {
            console.error('[HeroicFirestore] Batch update failed:', error);
            return false;
        }
    },

    // ===== HELPER METHODS =====

    _getDimensionBreakdown() {
        if (typeof HeroicProgram === 'undefined') return {};

        const breakdown = {};
        for (const dim of ['H', 'E', 'R', 'O', 'I', 'C']) {
            const completed = Array.from(HeroicProgram.completedToday)
                .filter(id => id.startsWith(dim)).length;
            breakdown[dim] = completed;
        }
        return breakdown;
    },

    _calculateStreak(activities) {
        if (activities.length === 0) return 0;

        let streak = 0;
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        // Check each day backwards
        for (let i = 0; i < 365; i++) {
            const hasActivity = activities.some(a => {
                const actDate = new Date(a.completedAt?.toMillis() || 0);
                actDate.setHours(0, 0, 0, 0);
                return actDate.getTime() === currentDate.getTime();
            });

            if (hasActivity) {
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                break;
            }
        }

        return streak;
    },

    _getMostActiveDimension(activities) {
        const counts = { H: 0, E: 0, R: 0, O: 0, I: 0, C: 0 };
        activities.forEach(a => {
            if (counts[a.dimension] !== undefined) {
                counts[a.dimension]++;
            }
        });

        let maxDim = 'H';
        let maxCount = 0;
        for (const [dim, count] of Object.entries(counts)) {
            if (count > maxCount) {
                maxCount = count;
                maxDim = dim;
            }
        }

        return maxDim;
    },

    _getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenWidth: window.screen.width,
            screenHeight: window.screen.height
        };
    }
};

// Setup auto-save interval (every 5 minutes)
if (typeof window !== 'undefined') {
    setInterval(() => {
        if (typeof HeroicXAI !== 'undefined' && HeroicXAI.lastUpdated) {
            HeroicFirestore.autoSave();
        }
    }, 5 * 60 * 1000); // 5 minutes
}

// Save on page unload
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        if (typeof HeroicXAI !== 'undefined' && auth?.currentUser) {
            // Use sendBeacon for reliable save on unload
            const data = JSON.stringify({
                scores: HeroicXAI.scores,
                overallScore: HeroicXAI.getOverallScore(),
                timestamp: Date.now()
            });

            // Save to localStorage as fallback
            try {
                localStorage.setItem('heroic_unsaved_scores', data);
            } catch (e) {}
        }
    });
}

// Make globally available
window.HeroicFirestore = HeroicFirestore;
