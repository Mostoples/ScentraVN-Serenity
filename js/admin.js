/**
 * SYNAWATCH - Admin Management System
 * Handles: API Keys, Users, System Monitoring
 */

const AdminManager = {
    currentTab: 'dashboard',
    apiKeys: [],
    users: [],
    systemStats: {},

    /**
     * Initialize Admin Module (OPTIMIZED with parallel loading)
     */
    async init() {
        console.log('Initializing Admin Manager...');

        // Security check first
        await this.checkAdminAccess();

        // Load all data in parallel for faster init
        await Promise.all([
            this.loadApiKeys().catch(e => console.error('Failed to load API keys:', e)),
            this.loadUsers().catch(e => console.error('Failed to load users:', e)),
            this.loadSystemStats().catch(e => console.error('Failed to load system stats:', e))
        ]);

        console.log('Admin Manager initialized successfully');
    },

    /**
     * Check if current user is admin
     */
    async checkAdminAccess() {
        const currentUser = auth.currentUser; // Use Firebase auth instance
        if (!currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            const userDoc = await db.collection('users').doc(currentUser.uid).get();
            const userData = userDoc.data() || {};

            if (userData.role !== 'admin') {
                throw new Error('Access denied: Admin role required');
            }

            console.log('✅ Admin access verified for:', currentUser.email);
            return true;
        } catch (e) {
            console.error('Admin access check failed:', e);
            throw e;
        }
    },

    /**
     * Load API Keys from Firestore
     */
    async loadApiKeys() {
        try {
            const snapshot = await db.collection('apiKeys').get();
            this.apiKeys = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log('API Keys loaded:', this.apiKeys);
        } catch (e) {
            console.error('Failed to load API keys:', e);
            this.apiKeys = [];
        }
    },

    /**
     * Load Users from Firestore
     */
    async loadUsers() {
        try {
            const snapshot = await db.collection('users').get();
            this.users = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log('Users loaded:', this.users);
        } catch (e) {
            console.error('Failed to load users:', e);
            this.users = [];
        }
    },

    /**
     * Load System Statistics
     */
    async loadSystemStats() {
        try {
            const statsDoc = await db.collection('system').doc('stats').get();
            this.systemStats = statsDoc.data() || {
                totalUsers: 0,
                totalApiCalls: 0,
                uptime: '99.9%',
                lastUpdated: new Date()
            };
        } catch (e) {
            console.error('Failed to load system stats:', e);
            this.systemStats = {};
        }
    },

    /**
     * Create New API Key
     */
    async createApiKey(name, service, quota = 100000) {
        try {
            const keyData = {
                name: name,
                service: service,
                key: this.generateSecureKey(),
                secret: this.generateSecureKey(),
                quota: quota,
                used: 0,
                status: 'active',
                createdAt: new Date(),
                lastUsed: null,
                history: []
            };

            const docRef = await db.collection('apiKeys').add(keyData);
            console.log('API Key created:', docRef.id);

            // Reload keys
            await this.loadApiKeys();

            return {
                id: docRef.id,
                ...keyData
            };
        } catch (e) {
            console.error('Failed to create API key:', e);
            throw e;
        }
    },

    /**
     * Rotate API Key
     */
    async rotateApiKey(keyId) {
        try {
            const keyRef = db.collection('apiKeys').doc(keyId);
            const oldKey = await keyRef.get();
            const oldData = oldKey.data();

            const newKey = {
                ...oldData,
                key: this.generateSecureKey(),
                secret: this.generateSecureKey(),
                rotatedAt: new Date(),
                previousKey: oldData.key,
                history: [
                    ...(oldData.history || []),
                    {
                        action: 'rotated',
                        oldKey: oldData.key,
                        timestamp: new Date(),
                        used: oldData.used
                    }
                ]
            };

            await keyRef.set(newKey);
            console.log('API Key rotated:', keyId);

            // Reload keys
            await this.loadApiKeys();

            return newKey;
        } catch (e) {
            console.error('Failed to rotate API key:', e);
            throw e;
        }
    },

    /**
     * Disable API Key
     */
    async disableApiKey(keyId) {
        try {
            await db.collection('apiKeys').doc(keyId).update({
                status: 'disabled',
                disabledAt: new Date()
            });
            console.log('API Key disabled:', keyId);
            await this.loadApiKeys();
        } catch (e) {
            console.error('Failed to disable API key:', e);
            throw e;
        }
    },

    /**
     * Delete API Key
     */
    async deleteApiKey(keyId) {
        try {
            await db.collection('apiKeys').doc(keyId).delete();
            console.log('API Key deleted:', keyId);
            await this.loadApiKeys();
        } catch (e) {
            console.error('Failed to delete API key:', e);
            throw e;
        }
    },

    /**
     * Update User Role
     */
    async updateUserRole(userId, role) {
        try {
            await db.collection('users').doc(userId).update({
                role: role,
                roleUpdatedAt: new Date()
            });
            console.log(`User ${userId} role updated to ${role}`);
            await this.loadUsers();
        } catch (e) {
            console.error('Failed to update user role:', e);
            throw e;
        }
    },

    /**
     * Disable User Account
     */
    async disableUser(userId) {
        try {
            await db.collection('users').doc(userId).update({
                disabled: true,
                disabledAt: new Date()
            });
            console.log('User disabled:', userId);
            await this.loadUsers();
        } catch (e) {
            console.error('Failed to disable user:', e);
            throw e;
        }
    },

    /**
     * Enable User Account
     */
    async enableUser(userId) {
        try {
            await db.collection('users').doc(userId).update({
                disabled: false,
                enabledAt: new Date()
            });
            console.log('User enabled:', userId);
            await this.loadUsers();
        } catch (e) {
            console.error('Failed to enable user:', e);
            throw e;
        }
    },

    /**
     * Generate Secure Random Key
     */
    generateSecureKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    /**
     * Track API Key Usage
     */
    async trackKeyUsage(keyId) {
        try {
            const keyRef = db.collection('apiKeys').doc(keyId);
            const keyDoc = await keyRef.get();
            const data = keyDoc.data();

            await keyRef.update({
                used: (data.used || 0) + 1,
                lastUsed: new Date()
            });
        } catch (e) {
            console.error('Failed to track key usage:', e);
        }
    },

    /**
     * Get API Key by Name
     */
    getKeyByName(name) {
        return this.apiKeys.find(k => k.name === name);
    },

    /**
     * Format Key Display (mask secret)
     */
    formatKeyDisplay(key) {
        return key.substring(0, 8) + '...' + key.substring(key.length - 4);
    },

    /**
     * Get Key Status Color
     */
    getStatusColor(status) {
        switch (status) {
            case 'active':
                return '#10b981';
            case 'disabled':
                return '#ef4444';
            case 'expired':
                return '#f59e0b';
            default:
                return '#6b7280';
        }
    },

    /**
     * Format Date
     */
    formatDate(date) {
        if (!date) return '-';
        if (typeof date === 'object' && date.toDate) {
            date = date.toDate();
        }
        return new Date(date).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    /**
     * Calculate Quota Usage Percentage
     */
    getQuotageUsagePercent(used, quota) {
        return Math.round((used / quota) * 100);
    },

    // ========== PATIENT DATA MANAGEMENT ==========

    /**
     * Load all patient data (OPTIMIZED with limit & caching)
     */
    async loadPatientData(limit = 50) {
        try {
            // Check cache first (cache for 5 minutes)
            const cacheKey = 'admin_patient_data';
            const cached = this._cache[cacheKey];
            if (cached && (Date.now() - cached.timestamp < 5 * 60 * 1000)) {
                console.log('Using cached patient data');
                return cached.data;
            }

            const patients = [];

            // Get users with limit (OPTIMIZED!)
            const usersSnapshot = await db.collection('users')
                .orderBy('createdAt', 'desc')
                .limit(limit)
                .get();

            console.log(`Loading data for ${usersSnapshot.docs.length} users...`);

            // Process users with minimal queries (only count if needed)
            for (const userDoc of usersSnapshot.docs) {
                const userId = userDoc.id;
                const userData = userDoc.data();

                // Simple patient object without heavy subcollection queries
                patients.push({
                    id: userId,
                    name: userData.name || 'Unknown',
                    email: userData.email || '-',
                    createdAt: userData.createdAt,
                    lastActive: userData.lastActive,
                    role: userData.role || 'user',
                    onboardingCompleted: userData.onboardingCompleted || false,
                    stats: {
                        healthReadings: 0, // Load on-demand when viewing details
                        assessments: 0,
                        journals: 0,
                        chatSessions: 0,
                        heroicActivities: 0
                    }
                });
            }

            // Cache the result
            this._cache[cacheKey] = {
                data: patients,
                timestamp: Date.now()
            };

            console.log('Patient data loaded:', patients.length);
            return patients;
        } catch (e) {
            console.error('Failed to load patient data:', e);
            return [];
        }
    },

    // Cache object
    _cache: {},

    /**
     * Clear cache (force refresh on next load)
     */
    clearCache(cacheKey = null) {
        if (cacheKey) {
            delete this._cache[cacheKey];
            console.log(`Cache cleared: ${cacheKey}`);
        } else {
            this._cache = {};
            console.log('All cache cleared');
        }
    },

    /**
     * Get detailed patient data
     */
    async getPatientDetails(userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                throw new Error('User not found');
            }

            const userData = userDoc.data();

            // Get all subcollections
            const healthReadings = await db.collection('users').doc(userId).collection('healthReadings')
                .orderBy('timestamp', 'desc').limit(100).get();

            const assessments = await db.collection('users').doc(userId).collection('assessments')
                .orderBy('createdAt', 'desc').get();

            const journals = await db.collection('users').doc(userId).collection('journals')
                .orderBy('createdAt', 'desc').limit(50).get();

            const dailySummary = await db.collection('users').doc(userId).collection('dailySummary')
                .orderBy('date', 'desc').limit(30).get();

            const heroicActivities = await db.collection('heroicActivities')
                .where('userId', '==', userId)
                .orderBy('completedAt', 'desc')
                .limit(50).get();

            const heroicScores = await db.collection('heroicScoreHistory')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(30).get();

            return {
                user: { id: userId, ...userData },
                healthReadings: healthReadings.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                assessments: assessments.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                journals: journals.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                dailySummary: dailySummary.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                heroicActivities: heroicActivities.docs.map(doc => ({ id: doc.id, ...doc.data() })),
                heroicScores: heroicScores.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            };
        } catch (e) {
            console.error('Failed to get patient details:', e);
            throw e;
        }
    },

    /**
     * Get patient health readings with filters
     */
    async getPatientHealthReadings(userId, startDate, endDate) {
        try {
            let query = db.collection('users').doc(userId).collection('healthReadings');

            if (startDate) {
                query = query.where('timestamp', '>=', startDate);
            }
            if (endDate) {
                query = query.where('timestamp', '<=', endDate);
            }

            const snapshot = await query.orderBy('timestamp', 'desc').get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) {
            console.error('Failed to get health readings:', e);
            return [];
        }
    },

    /**
     * Delete patient data
     */
    async deletePatientData(userId, dataType) {
        try {
            if (dataType === 'all') {
                // Delete all subcollections
                const collections = ['healthReadings', 'assessments', 'journals', 'chatHistory',
                                   'dailySummary', 'interventionLogs', 'moodLogs'];

                for (const collectionName of collections) {
                    const snapshot = await db.collection('users').doc(userId).collection(collectionName).get();
                    const batch = db.batch();
                    snapshot.docs.forEach(doc => batch.delete(doc.ref));
                    await batch.commit();
                }

                // Delete HEROIC data
                const heroicActivities = await db.collection('heroicActivities').where('userId', '==', userId).get();
                const heroicScores = await db.collection('heroicScoreHistory').where('userId', '==', userId).get();

                const batch = db.batch();
                heroicActivities.docs.forEach(doc => batch.delete(doc.ref));
                heroicScores.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();

            } else {
                // Delete specific collection
                const snapshot = await db.collection('users').doc(userId).collection(dataType).get();
                const batch = db.batch();
                snapshot.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }

            console.log(`Patient data deleted: ${userId} - ${dataType}`);
            return true;
        } catch (e) {
            console.error('Failed to delete patient data:', e);
            throw e;
        }
    },

    /**
     * Export patient data to JSON
     */
    async exportPatientDataToJSON(userId) {
        try {
            const data = await this.getPatientDetails(userId);
            const jsonString = JSON.stringify(data, null, 2);

            // Create download
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `patient_${userId}_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);

            return true;
        } catch (e) {
            console.error('Failed to export patient data:', e);
            throw e;
        }
    },

    // ========== QUESTIONNAIRE MANAGEMENT ==========

    /**
     * Load all aromatherapy recommendations across users (collectionGroup).
     * Requires a collectionGroup index on aromaRecommendations.timestamp.
     */
    async loadAromaRecommendations(limit = 200) {
        try {
            const cacheKey = 'admin_aroma';
            const cached = this._cache[cacheKey];
            if (cached && (Date.now() - cached.timestamp < 5 * 60 * 1000)) {
                return cached.data;
            }

            let docs = [];
            try {
                const snap = await db.collectionGroup('aromaRecommendations')
                    .orderBy('timestamp', 'desc')
                    .limit(limit)
                    .get();
                docs = snap.docs;
            } catch (idxErr) {
                /* Index not ready — fall back to unordered collectionGroup */
                console.warn('Aroma ordered query failed, fallback:', idxErr.message);
                const snap = await db.collectionGroup('aromaRecommendations').limit(limit).get();
                docs = snap.docs;
            }

            const recs = docs.map(doc => {
                const userId = doc.ref.parent.parent ? doc.ref.parent.parent.id : null;
                return { id: doc.id, userId, ...doc.data() };
            });

            this._cache[cacheKey] = { data: recs, timestamp: Date.now() };
            console.log('Aroma recommendations loaded:', recs.length);
            return recs;
        } catch (e) {
            console.error('Failed to load aroma recommendations:', e);
            return [];
        }
    },

    /**
     * Load all questionnaire responses (OPTIMIZED with limit & caching)
     */
    async loadQuestionnaires(limit = 100) {
        try {
            // Check cache first (cache for 5 minutes)
            const cacheKey = 'admin_questionnaires';
            const cached = this._cache[cacheKey];
            if (cached && (Date.now() - cached.timestamp < 5 * 60 * 1000)) {
                console.log('Using cached questionnaire data');
                return cached.data;
            }

            const snapshot = await db.collection('questionnaireResults')
                .orderBy('submittedAt', 'desc')
                .limit(limit)
                .get();

            const questionnaires = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Cache the result
            this._cache[cacheKey] = {
                data: questionnaires,
                timestamp: Date.now()
            };

            console.log('Questionnaires loaded:', questionnaires.length);
            return questionnaires;
        } catch (e) {
            console.error('Failed to load questionnaires:', e);
            return [];
        }
    },

    /**
     * Get questionnaire statistics
     */
    async getQuestionnaireStats() {
        try {
            // For stats, we want all data (set high limit)
            const questionnaires = await this.loadQuestionnaires(1000);

            if (questionnaires.length === 0) {
                return {
                    total: 0,
                    avgSUS: 0,
                    avgTAM: 0,
                    avgUEQ: 0,
                    npsBreakdown: { promoters: 0, passives: 0, detractors: 0 }
                };
            }

            // Calculate averages
            const susScores = questionnaires.map(q => q.sus?.totalScore || 0).filter(s => s > 0);
            const tamScores = questionnaires.map(q => q.tam?.overallAvg || 0).filter(s => s > 0);
            const ueqScores = questionnaires.map(q => q.ueq?.avgScore || 0).filter(s => s > 0);

            const avgSUS = susScores.length > 0 ?
                susScores.reduce((a, b) => a + b, 0) / susScores.length : 0;
            const avgTAM = tamScores.length > 0 ?
                tamScores.reduce((a, b) => a + b, 0) / tamScores.length : 0;
            const avgUEQ = ueqScores.length > 0 ?
                ueqScores.reduce((a, b) => a + b, 0) / ueqScores.length : 0;

            // NPS breakdown
            const npsScores = questionnaires.map(q => q.nps?.score || 0);
            const promoters = npsScores.filter(s => s >= 9).length;
            const passives = npsScores.filter(s => s >= 7 && s < 9).length;
            const detractors = npsScores.filter(s => s < 7).length;

            return {
                total: questionnaires.length,
                avgSUS: Math.round(avgSUS * 10) / 10,
                avgTAM: Math.round(avgTAM * 100) / 100,
                avgUEQ: Math.round(avgUEQ * 100) / 100,
                npsBreakdown: { promoters, passives, detractors },
                npsScore: Math.round(((promoters - detractors) / questionnaires.length) * 100)
            };
        } catch (e) {
            console.error('Failed to calculate questionnaire stats:', e);
            return null;
        }
    },

    /**
     * Export questionnaires to CSV
     */
    async exportQuestionnairesToCSV() {
        try {
            // For export, we want all data (set high limit)
            const questionnaires = await this.loadQuestionnaires(1000);

            if (questionnaires.length === 0) {
                alert('No questionnaire data to export');
                return;
            }

            // CSV headers
            const headers = [
                'ID', 'Submitted At', 'Name', 'Age Range', 'Gender', 'Background',
                'SUS Score', 'SUS Grade', 'TAM Usefulness', 'TAM Ease of Use', 'TAM Overall',
                'UI/UX Avg', 'UEQ Avg', 'Trust Avg', 'Therapeutic Avg', 'Engagement Avg',
                'NPS Score', 'NPS Category',
                'Liked Features', 'Confusing Features', 'Missing Features', 'Smartwatch Opinion', 'Suggestions'
            ];

            // CSV rows
            const rows = questionnaires.map(q => [
                q.id,
                this.formatDate(q.submittedAt),
                q.responden?.name || '-',
                q.responden?.ageRange || '-',
                q.responden?.gender || '-',
                q.responden?.background || '-',
                q.sus?.totalScore || '-',
                q.sus?.grade || '-',
                q.tam?.perceivedUsefulness || '-',
                q.tam?.perceivedEaseOfUse || '-',
                q.tam?.overallAvg || '-',
                q.uiux?.avgScore || '-',
                q.ueq?.avgScore || '-',
                q.trust?.avgScore || '-',
                q.therapeutic?.avgScore || '-',
                q.engagement?.avgScore || '-',
                q.nps?.score || '-',
                q.nps?.category || '-',
                (q.openEnded?.liked || '-').replace(/,/g, ';'),
                (q.openEnded?.confusing || '-').replace(/,/g, ';'),
                (q.openEnded?.missing || '-').replace(/,/g, ';'),
                (q.openEnded?.smartwatch || '-').replace(/,/g, ';'),
                (q.openEnded?.suggestion || '-').replace(/,/g, ';')
            ]);

            // Create CSV content
            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
            ].join('\n');

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `questionnaires_${new Date().toISOString().split('T')[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);

            console.log('Questionnaires exported to CSV');
            return true;
        } catch (e) {
            console.error('Failed to export questionnaires:', e);
            throw e;
        }
    },

    /**
     * Delete questionnaire response
     */
    async deleteQuestionnaire(questionnaireId) {
        try {
            await db.collection('questionnaireResults').doc(questionnaireId).delete();
            console.log('Questionnaire deleted:', questionnaireId);
            return true;
        } catch (e) {
            console.error('Failed to delete questionnaire:', e);
            throw e;
        }
    },

    /**
     * Logout admin
     */
    async logout() {
        try {
            await auth.signOut();
            window.location.href = 'auth.html';
        } catch (e) {
            console.error('Logout failed:', e);
            alert('Failed to logout');
        }
    }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminManager;
}
