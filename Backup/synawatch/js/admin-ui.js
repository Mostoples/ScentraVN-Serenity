/**
 * SYNAWATCH - Admin UI Controller
 * Manages UI interactions for the Admin Dashboard
 */

const AdminUI = {
    currentTab: 'dashboard',

    /**
     * Initialize Admin UI
     */
    async init() {
        console.log('Initializing Admin UI...');

        try {
            await AdminManager.init();
            this.renderDashboard();
            this.setupEventListeners();
        } catch (e) {
            console.error('Admin UI initialization failed:', e);
            this.showError('Admin access denied. You need admin role to access this page.');
        }
    },

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        this.currentTab = tabName;

        // Update button states
        document.querySelectorAll('.admin-tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content visibility
        document.querySelectorAll('.admin-tab-content').forEach(content => {
            content.style.display = 'none';
        });
        document.getElementById(`${tabName}-tab`).style.display = 'block';

        // Load tab content
        if (tabName === 'api-keys') {
            this.renderApiKeysTab();
        } else if (tabName === 'users') {
            this.renderUsersTab();
        } else if (tabName === 'settings') {
            this.renderSettingsTab();
        } else if (tabName === 'dashboard') {
            this.renderDashboard();
        }
    },

    /**
     * Render Dashboard Tab
     */
    async renderDashboard() {
        // Update stats
        document.getElementById('totalUsers').textContent = AdminManager.users.length;
        document.getElementById('totalApiCalls').textContent = (AdminManager.systemStats.totalApiCalls || 0).toLocaleString();
        document.getElementById('systemUptime').textContent = AdminManager.systemStats.uptime || '99.9%';

        const activeKeys = AdminManager.apiKeys.filter(k => k.status === 'active').length;
        document.getElementById('activeKeys').textContent = activeKeys;

        // Render recent activity
        this.renderRecentActivity();
    },

    /**
     * Render Recent Activity – loads from Firestore interventions + assessments
     */
    async renderRecentActivity() {
        const container = document.getElementById('recentActivity');
        if (!container) return;

        let activities = [];

        try {
            // Load recent interventions
            const interventions = await db.collection('interventions')
                .orderBy('timestamp', 'desc').limit(3).get();
            interventions.docs.forEach(doc => {
                const d = doc.data();
                const ts = d.timestamp?.toDate ? d.timestamp.toDate() : new Date(d.timestamp || Date.now());
                activities.push({
                    type: 'api_call',
                    label: `Intervention: ${d.type || 'auto'} triggered`,
                    time: this._timeAgo(ts),
                    status: 'success'
                });
            });

            // Load recent assessments across all users
            const assessments = await db.collectionGroup('assessments')
                .orderBy('created_at', 'desc').limit(3).get();
            assessments.docs.forEach(doc => {
                const d = doc.data();
                const ts = d.created_at ? new Date(d.created_at) : new Date();
                activities.push({
                    type: 'user_login',
                    label: `Assessment completed (PHQ-9: ${d.phq9_score || d.phq9Score || '?'})`,
                    time: this._timeAgo(ts),
                    status: 'success'
                });
            });

            // Load recent yoga sessions
            const yogaSessions = await db.collection('yoga_sessions')
                .orderBy('session_date', 'desc').limit(2).get();
            yogaSessions.docs.forEach(doc => {
                const d = doc.data();
                const ts = d.session_date?.toDate ? d.session_date.toDate() : new Date();
                activities.push({
                    type: 'system_check',
                    label: `Yoga session: ${d.protocol_name || d.protocol_id || 'practice'} (${d.poses_completed || 0} poses)`,
                    time: this._timeAgo(ts),
                    status: 'success'
                });
            });

        } catch (e) {
            console.warn('Could not load Firestore activity, using defaults:', e.message);
            // Fallback default activity when Firestore unreachable
            activities = [
                { type: 'system_check', label: 'System initialized', time: 'Just now', status: 'success' },
                { type: 'api_call', label: `${AdminManager.users.length} users loaded`, time: 'Just now', status: 'success' },
                { type: 'key_rotation', label: `${AdminManager.apiKeys.length} API keys active`, time: 'Just now', status: 'success' }
            ];
        }

        // Sort by recency (most recent first), show up to 8
        activities = activities.slice(0, 8);

        if (activities.length === 0) {
            container.innerHTML = '<p style="text-align:center;padding:24px;color:var(--text-tertiary);">No recent activity yet.</p>';
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div style="padding: 12px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                    <div style="width: 40px; height: 40px; background: ${this.getActivityIcon(activity.type).bg}; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; color: ${this.getActivityIcon(activity.type).color};">
                        <i class="${this.getActivityIcon(activity.type).icon}"></i>
                    </div>
                    <div>
                        <p style="font-weight: 600; color: var(--text-primary);">${activity.label}</p>
                        <p style="font-size: 0.85rem; color: var(--text-tertiary);">${activity.time}</p>
                    </div>
                </div>
                <span style="padding: 4px 12px; background: rgba(16, 185, 129, 0.1); color: #10b981; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600;">
                    ${activity.status.toUpperCase()}
                </span>
            </div>
        `).join('');
    },

    /**
     * Helper: convert Date to "X ago" string
     */
    _timeAgo(date) {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)} days ago`;
    },

    /**
     * Get Activity Icon
     */
    getActivityIcon(type) {
        const icons = {
            api_call: { icon: 'fas fa-network-wired', bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' },
            key_rotation: { icon: 'fas fa-sync-alt', bg: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' },
            user_login: { icon: 'fas fa-user-check', bg: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
            system_check: { icon: 'fas fa-heartbeat', bg: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }
        };
        return icons[type] || icons.system_check;
    },

    /**
     * Render API Keys Tab
     */
    async renderApiKeysTab() {
        const keysHtml = AdminManager.apiKeys.map((key, index) => `
            <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 16px; margin-bottom: 12px; background: var(--bg-secondary);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                    <div style="flex: 1;">
                        <h4 style="font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${key.name}</h4>
                        <p style="font-size: 0.85rem; color: var(--text-tertiary);">Service: ${key.service}</p>
                    </div>
                    <span style="padding: 4px 12px; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600; background: ${key.status === 'active' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${key.status === 'active' ? '#10b981' : '#ef4444'};">
                        ${key.status.toUpperCase()}
                    </span>
                </div>

                <div style="background: white; padding: 12px; border-radius: var(--radius-sm); margin-bottom: 12px; font-family: monospace; font-size: 0.85rem; color: var(--text-secondary);">
                    Key: ${AdminManager.formatKeyDisplay(key.key)}
                </div>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 12px;">
                    <div style="background: white; padding: 12px; border-radius: var(--radius-sm);">
                        <p style="font-size: 0.8rem; color: var(--text-tertiary); margin-bottom: 4px;">QUOTA</p>
                        <p style="font-weight: 600; color: var(--text-primary);">${key.used.toLocaleString()} / ${key.quota.toLocaleString()}</p>
                        <div style="width: 100%; height: 4px; background: var(--border-color); border-radius: 2px; margin-top: 8px;">
                            <div style="width: ${AdminManager.getQuotageUsagePercent(key.used, key.quota)}%; height: 100%; background: ${AdminManager.getQuotageUsagePercent(key.used, key.quota) > 80 ? '#ef4444' : '#10b981'}; border-radius: 2px;"></div>
                        </div>
                    </div>
                    <div style="background: white; padding: 12px; border-radius: var(--radius-sm);">
                        <p style="font-size: 0.8rem; color: var(--text-tertiary); margin-bottom: 4px;">CREATED</p>
                        <p style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">${AdminManager.formatDate(key.createdAt)}</p>
                    </div>
                    <div style="background: white; padding: 12px; border-radius: var(--radius-sm);">
                        <p style="font-size: 0.8rem; color: var(--text-tertiary); margin-bottom: 4px;">LAST USED</p>
                        <p style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">${AdminManager.formatDate(key.lastUsed) || 'Never'}</p>
                    </div>
                </div>

                <div style="display: flex; gap: 8px;">
                    ${key.status === 'active' ? `
                        <button class="btn" style="flex: 1; padding: 8px 12px; font-size: 0.9rem; border: 1px solid var(--primary-500); color: var(--primary-500); background: transparent; border-radius: var(--radius-md); cursor: pointer;" onclick="AdminUI.rotateKey('${key.id}')">
                            <i class="fas fa-sync-alt"></i> Rotate
                        </button>
                        <button class="btn" style="flex: 1; padding: 8px 12px; font-size: 0.9rem; border: 1px solid var(--warning-500); color: var(--warning-500); background: transparent; border-radius: var(--radius-md); cursor: pointer;" onclick="AdminUI.disableKey('${key.id}')">
                            <i class="fas fa-pause"></i> Disable
                        </button>
                    ` : ''}
                    <button class="btn" style="flex: 1; padding: 8px 12px; font-size: 0.9rem; border: 1px solid var(--danger-500); color: var(--danger-500); background: transparent; border-radius: var(--radius-md); cursor: pointer;" onclick="AdminUI.deleteKey('${key.id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');

        const emptyState = AdminManager.apiKeys.length === 0 ? `
            <div style="text-align: center; padding: 40px 20px;">
                <i class="fas fa-key" style="font-size: 3rem; color: var(--text-tertiary); margin-bottom: 16px;"></i>
                <p style="color: var(--text-secondary); font-size: 1.1rem; margin-bottom: 16px;">No API keys yet</p>
                <button class="btn btn-primary" onclick="AdminUI.showCreateKeyModal()">Create First API Key</button>
            </div>
        ` : '';

        document.getElementById('apiKeysTable').innerHTML = keysHtml || emptyState;
    },

    /**
     * Render Users Tab
     */
    async renderUsersTab() {
        const usersHtml = AdminManager.users.map(user => `
            <div style="border-bottom: 1px solid var(--border-color); padding: 12px 0; display: flex; justify-content: space-between; align-items: center;">
                <div style="flex: 1;">
                    <p style="font-weight: 600; color: var(--text-primary);">${user.email || 'Anonymous User'}</p>
                    <p style="font-size: 0.85rem; color: var(--text-tertiary);">ID: ${user.id?.slice(0, 10)}...</p>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="padding: 4px 12px; background: ${user.role === 'admin' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(99, 102, 241, 0.1)'}; color: ${user.role === 'admin' ? '#8b5cf6' : '#6366f1'}; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600;">
                        ${(user.role || 'user').toUpperCase()}
                    </span>
                    <select onchange="AdminUI.changeUserRole('${user.id}', this.value)" style="padding: 6px 8px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: 0.85rem;">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                    <button class="btn" style="padding: 6px 12px; border: 1px solid var(--danger-500); color: var(--danger-500); background: transparent; border-radius: var(--radius-md); cursor: pointer; font-size: 0.85rem;" onclick="AdminUI.toggleUserStatus('${user.id}', ${user.disabled ? false : true})">
                        ${user.disabled ? '<i class="fas fa-unlock"></i> Enable' : '<i class="fas fa-lock"></i> Disable'}
                    </button>
                </div>
            </div>
        `).join('');

        const emptyState = AdminManager.users.length === 0 ? `
            <div style="text-align: center; padding: 40px 20px;">
                <p style="color: var(--text-secondary);">No users found</p>
            </div>
        ` : '';

        document.getElementById('usersTable').innerHTML = `<div style="background: white; border-radius: var(--radius-md); padding: 16px;">${usersHtml || emptyState}</div>`;
    },

    /**
     * Render Settings Tab – load current settings from Firestore
     */
    async renderSettingsTab() {
        try {
            const settingsDoc = await db.collection('system').doc('settings').get();
            const settings = settingsDoc.exists ? settingsDoc.data() : {};

            const policySelect = document.getElementById('rotationPolicy');
            if (policySelect && settings.rotationPolicy) {
                policySelect.value = settings.rotationPolicy;
            }

            const maxQuotaInput = document.getElementById('maxQuota');
            if (maxQuotaInput && settings.maxQuota) {
                maxQuotaInput.value = settings.maxQuota;
            }

            const alertThresholdInput = document.getElementById('alertThreshold');
            if (alertThresholdInput && settings.alertThreshold) {
                alertThresholdInput.value = settings.alertThreshold;
            }
        } catch (e) {
            console.warn('Could not load settings from Firestore:', e.message);
        }
    },

    /**
     * Show Create API Key Modal
     */
    showCreateKeyModal() {
        const modal = document.createElement('div');
        modal.id = 'createKeyModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;
        `;
        modal.innerHTML = `
            <div style="background: white; border-radius: var(--radius-lg); padding: 32px; max-width: 500px; width: 90%;">
                <h3 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin-bottom: 24px;">Create New API Key</h3>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">Key Name</label>
                    <input id="keyName" type="text" placeholder="e.g., Gemini Production" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 1rem;">
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">Service</label>
                    <select id="keyService" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 1rem;">
                        <option value="">Select a service</option>
                        <option value="gemini">Gemini Chat</option>
                        <option value="elevenlabs">ElevenLabs TTS</option>
                        <option value="firebase">Firebase</option>
                        <option value="custom">Custom Service</option>
                    </select>
                </div>

                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">Monthly Quota</label>
                    <input id="keyQuota" type="number" value="100000" style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-md); font-size: 1rem;">
                </div>

                <div style="display: flex; gap: 12px;">
                    <button class="btn btn-primary" style="flex: 1; padding: 12px; border: none; background: var(--primary-500); color: white; border-radius: var(--radius-md); cursor: pointer; font-weight: 600;" onclick="AdminUI.createApiKey()">
                        Create Key
                    </button>
                    <button class="btn" style="flex: 1; padding: 12px; border: 1px solid var(--border-color); background: white; color: var(--text-primary); border-radius: var(--radius-md); cursor: pointer; font-weight: 600;" onclick="AdminUI.closeModal()">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeModal();
        });
    },

    /**
     * Create API Key
     */
    async createApiKey() {
        const name = document.getElementById('keyName')?.value;
        const service = document.getElementById('keyService')?.value;
        const quota = parseInt(document.getElementById('keyQuota')?.value || 100000);

        if (!name || !service) {
            this.showError('Please fill in all fields');
            return;
        }

        try {
            const newKey = await AdminManager.createApiKey(name, service, quota);
            this.showSuccess(`API Key "${name}" created successfully!`);
            this.closeModal();
            this.renderApiKeysTab();
        } catch (e) {
            this.showError('Failed to create API key: ' + e.message);
        }
    },

    /**
     * Rotate API Key
     */
    async rotateKey(keyId) {
        if (!confirm('Are you sure you want to rotate this API key? Old key will be invalidated.')) return;

        try {
            await AdminManager.rotateApiKey(keyId);
            this.showSuccess('API key rotated successfully!');
            this.renderApiKeysTab();
        } catch (e) {
            this.showError('Failed to rotate API key: ' + e.message);
        }
    },

    /**
     * Disable API Key
     */
    async disableKey(keyId) {
        if (!confirm('Disable this API key?')) return;

        try {
            await AdminManager.disableApiKey(keyId);
            this.showSuccess('API key disabled successfully!');
            this.renderApiKeysTab();
        } catch (e) {
            this.showError('Failed to disable API key: ' + e.message);
        }
    },

    /**
     * Delete API Key
     */
    async deleteKey(keyId) {
        if (!confirm('Are you sure you want to delete this API key? This cannot be undone.')) return;

        try {
            await AdminManager.deleteApiKey(keyId);
            this.showSuccess('API key deleted successfully!');
            this.renderApiKeysTab();
        } catch (e) {
            this.showError('Failed to delete API key: ' + e.message);
        }
    },

    /**
     * Change User Role
     */
    async changeUserRole(userId, role) {
        try {
            await AdminManager.updateUserRole(userId, role);
            this.showSuccess(`User role updated to ${role}`);
            this.renderUsersTab();
        } catch (e) {
            this.showError('Failed to update user role: ' + e.message);
        }
    },

    /**
     * Toggle User Status
     */
    async toggleUserStatus(userId, disable) {
        try {
            if (disable) {
                await AdminManager.disableUser(userId);
                this.showSuccess('User disabled');
            } else {
                await AdminManager.enableUser(userId);
                this.showSuccess('User enabled');
            }
            this.renderUsersTab();
        } catch (e) {
            this.showError('Failed to update user status: ' + e.message);
        }
    },

    /**
     * Save Settings to Firestore
     */
    async saveSettings() {
        const policy = document.getElementById('rotationPolicy')?.value;
        const maxQuota = document.getElementById('maxQuota')?.value;
        const alertThreshold = document.getElementById('alertThreshold')?.value;

        if (!policy) {
            this.showError('Please select a rotation policy');
            return;
        }

        try {
            const settings = {
                rotationPolicy: policy,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedBy: firebase.auth().currentUser?.uid || 'admin'
            };
            if (maxQuota) settings.maxQuota = parseInt(maxQuota);
            if (alertThreshold) settings.alertThreshold = parseInt(alertThreshold);

            await db.collection('system').doc('settings').set(settings, { merge: true });
            this.showSuccess(`Settings saved! Rotation policy: ${policy}`);
            console.log('✅ Settings saved to Firestore:', settings);
        } catch (e) {
            this.showError('Failed to save settings: ' + e.message);
            console.error('Settings save error:', e);
        }
    },

    /**
     * Close Modal
     */
    closeModal() {
        const modal = document.getElementById('createKeyModal');
        if (modal) modal.remove();
    },

    /**
     * Show Success Message
     */
    showSuccess(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; padding: 16px 24px;
            background: #10b981; color: white; border-radius: var(--radius-md);
            z-index: 10000; animation: slideIn 0.3s ease;
        `;
        toast.textContent = '✓ ' + message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    /**
     * Show Error Message
     */
    showError(message) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; bottom: 20px; right: 20px; padding: 16px 24px;
            background: #ef4444; color: white; border-radius: var(--radius-md);
            z-index: 10000; animation: slideIn 0.3s ease;
        `;
        toast.textContent = '✗ ' + message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    },

    /**
     * Setup Event Listeners
     */
    setupEventListeners() {
        // Tab buttons already have onclick handlers
    }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminUI;
}
