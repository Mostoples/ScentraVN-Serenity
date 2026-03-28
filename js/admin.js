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
     * Initialize Admin Module
     */
    async init() {
        console.log('Initializing Admin Manager...');
        await this.checkAdminAccess();
        await this.loadApiKeys();
        await this.loadUsers();
        await this.loadSystemStats();
    },

    /**
     * Check if current user is admin
     */
    async checkAdminAccess() {
        if (!Auth.currentUser) {
            throw new Error('User not authenticated');
        }

        try {
            const userDoc = await db.collection('users').doc(Auth.currentUser.uid).get();
            const userData = userDoc.data() || {};

            if (userData.role !== 'admin') {
                throw new Error('Access denied: Admin role required');
            }

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
    }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminManager;
}
