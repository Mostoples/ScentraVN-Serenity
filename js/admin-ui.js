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
            // Wait for auth to be ready
            await new Promise((resolve) => {
                if (auth.currentUser) {
                    resolve();
                } else {
                    const unsubscribe = auth.onAuthStateChanged((user) => {
                        if (user) {
                            unsubscribe();
                            resolve();
                        }
                    });
                    // Timeout after 5 seconds
                    setTimeout(() => {
                        unsubscribe();
                        resolve();
                    }, 5000);
                }
            });

            await AdminManager.init();
            this.renderDashboard();
            this.setupEventListeners();
            console.log('✅ Admin UI initialized successfully');
        } catch (e) {
            console.error('Admin UI initialization failed:', e);
            console.error('Error details:', e.message);
            this.showError(`Admin access denied: ${e.message}`);
        }
    },

    /**
     * Switch between tabs
     */
    switchTab(tabName) {
        this.currentTab = tabName;

        // Update button states (support both old and new layouts)
        const tabButtons = document.querySelectorAll('.admin-tab-btn, .admin-nav-link, .admin-nav-item');
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.tab === tabName) {
                btn.classList.add('active');
            }
        });

        // Hide/show static tab divs (admin.html legacy layout)
        document.querySelectorAll('.admin-content').forEach(el => el.classList.remove('active'));
        const staticTab = document.getElementById(tabName + '-tab');
        if (staticTab) staticTab.classList.add('active');

        // Update breadcrumb and header title
        const breadcrumbEl = document.getElementById('currentPageName');
        const headerTitleEl = document.querySelector('.admin-header-left h2');
        const pageNames = {
            'dashboard': 'Dashboard',
            'users': 'Users Management',
            'patients': 'Patient Data',
            'questionnaires': 'Questionnaires',
            'aroma': 'Aromatherapy',
            'competition': 'Kesiapan Kompetisi',
            'notulen': 'Notulen Diskusi',
            'alat-dataset': 'Ketersediaan Alat Dataset'
        };
        const pageName = pageNames[tabName] || tabName;
        if (breadcrumbEl) breadcrumbEl.textContent = pageName;
        if (headerTitleEl) headerTitleEl.textContent = pageName;

        // Load tab content
        if (tabName === 'dashboard') {
            this.renderDashboard();
        } else if (tabName === 'users') {
            this.renderUsersTab();
        } else if (tabName === 'patients') {
            this.renderPatientsTab();
        } else if (tabName === 'questionnaires') {
            this.renderQuestionnairesTab();
        } else if (tabName === 'aroma') {
            this.renderAromaTab();
        } else if (tabName === 'competition') {
            this.renderCompetitionTab();
        } else if (tabName === 'notulen') {
            this.renderNotulenTab();
        } else if (tabName === 'alat-dataset') {
            this.renderAlatDatasetTab();
        }
    },

    /**
     * Render Dashboard Tab
     */
    async renderDashboard() {
        const content = document.getElementById('adminDashboardContent');
        if (!content) return;

        // Show loading skeleton
        content.innerHTML = `
            <div class="admin-stats-grid">
                <div class="admin-skeleton skeleton-card"></div>
                <div class="admin-skeleton skeleton-card"></div>
                <div class="admin-skeleton skeleton-card"></div>
                <div class="admin-skeleton skeleton-card"></div>
            </div>
            <div class="admin-skeleton" style="height: 300px;"></div>
        `;

        try {
            // Load data in parallel for speed (OPTIMIZED!)
            const [patients, questionnaires] = await Promise.all([
                AdminManager.loadPatientData().catch(() => []), // Fallback to empty if error
                AdminManager.loadQuestionnaires().catch(() => [])
            ]);

            // Calculate statistics
            let totalHealthRecords = 0;
            let totalAssessments = 0;
            patients.forEach(p => {
                totalHealthRecords += p.stats.healthReadings || 0;
                totalAssessments += p.stats.assessments || 0;
            });

            // Calculate growth (mock data for now)
            const userGrowth = AdminManager.users.length > 0 ? '+12%' : '0%';
            const patientGrowth = patients.length > 0 ? '+8%' : '0%';
            const recordGrowth = totalHealthRecords > 0 ? '+24%' : '0%';
            const questionnaireGrowth = questionnaires.length > 0 ? '+15%' : '0%';

            // Render professional dashboard
            content.innerHTML = `
                <!-- Page Header -->
                <div style="margin-bottom: 32px;">
                    <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--admin-text-primary); margin-bottom: 8px;">
                        Dashboard Overview
                    </h1>
                    <p style="color: var(--admin-text-secondary); font-size: 0.95rem;">
                        Welcome back! Here's what's happening with your platform.
                    </p>
                </div>

                <!-- Statistics Cards -->
                <div class="admin-stats-grid">
                    <!-- Total Users -->
                    <div class="admin-stat-card primary">
                        <div class="stat-header">
                            <div>
                                <div class="stat-label">Total Users</div>
                                <div class="stat-value">${AdminManager.users.length}</div>
                            </div>
                            <div class="stat-icon">
                                <i class="fas fa-users"></i>
                            </div>
                        </div>
                        <div class="stat-description">
                            <span class="stat-trend up">
                                <i class="fas fa-arrow-up"></i> ${userGrowth}
                            </span>
                            <span>from last month</span>
                        </div>
                    </div>

                    <!-- Total Patients -->
                    <div class="admin-stat-card info">
                        <div class="stat-header">
                            <div>
                                <div class="stat-label">Active Patients</div>
                                <div class="stat-value">${patients.length}</div>
                            </div>
                            <div class="stat-icon" style="background: linear-gradient(135deg, #3b82f6, #2563eb);">
                                <i class="fas fa-user-injured"></i>
                            </div>
                        </div>
                        <div class="stat-description">
                            <span class="stat-trend up">
                                <i class="fas fa-arrow-up"></i> ${patientGrowth}
                            </span>
                            <span>with health data</span>
                        </div>
                    </div>

                    <!-- Health Records -->
                    <div class="admin-stat-card success">
                        <div class="stat-header">
                            <div>
                                <div class="stat-label">Health Records</div>
                                <div class="stat-value">${totalHealthRecords.toLocaleString()}</div>
                            </div>
                            <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                                <i class="fas fa-heartbeat"></i>
                            </div>
                        </div>
                        <div class="stat-description">
                            <span class="stat-trend up">
                                <i class="fas fa-arrow-up"></i> ${recordGrowth}
                            </span>
                            <span>total readings</span>
                        </div>
                    </div>

                    <!-- Questionnaires -->
                    <div class="admin-stat-card warning">
                        <div class="stat-header">
                            <div>
                                <div class="stat-label">Questionnaires</div>
                                <div class="stat-value">${questionnaires.length}</div>
                            </div>
                            <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                                <i class="fas fa-clipboard-list"></i>
                            </div>
                        </div>
                        <div class="stat-description">
                            <span class="stat-trend up">
                                <i class="fas fa-arrow-up"></i> ${questionnaireGrowth}
                            </span>
                            <span>responses collected</span>
                        </div>
                    </div>
                </div>

                <!-- Charts Row -->
                <div class="admin-charts-grid">
                    <!-- User Growth Chart -->
                    <div class="admin-chart-container">
                        <div class="admin-chart-header">
                            <div>
                                <div class="admin-chart-title">User Growth</div>
                                <div class="admin-chart-subtitle">Last 6 months trend</div>
                            </div>
                            <span class="admin-chart-badge">+${AdminManager.users.length}</span>
                        </div>
                        <div class="admin-chart-wrapper">
                            <canvas id="userGrowthChart"></canvas>
                        </div>
                    </div>

                    <!-- Activity Chart -->
                    <div class="admin-chart-container">
                        <div class="admin-chart-header">
                            <div>
                                <div class="admin-chart-title">Platform Activity</div>
                                <div class="admin-chart-subtitle">Weekly engagement</div>
                            </div>
                            <span class="admin-chart-badge">This Week</span>
                        </div>
                        <div class="admin-chart-wrapper">
                            <canvas id="activityChart"></canvas>
                        </div>
                    </div>
                </div>

                <!-- Recent Activity Table -->
                <div class="admin-table-container">
                    <div class="admin-table-header">
                        <div class="admin-table-title">
                            <i class="fas fa-clock"></i>
                            Recent Activity
                        </div>
                    </div>
                    <div id="recentActivityTable"></div>
                </div>
            `;

            // Render recent activity table
            this.renderRecentActivityTable();

            // Render charts
            this.renderDashboardCharts();

        } catch (error) {
            console.error('Failed to render dashboard:', error);
            content.innerHTML = `
                <div class="admin-empty-state">
                    <div class="admin-empty-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="admin-empty-title">Failed to Load Dashboard</div>
                    <div class="admin-empty-description">${error.message}</div>
                    <button class="admin-btn admin-btn-primary" onclick="AdminUI.renderDashboard()">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    },

    /**
     * Render Recent Activity Table
     */
    renderRecentActivityTable() {
        const activities = [
            { type: 'user_register', user: AdminManager.users[AdminManager.users.length - 1]?.email || 'New User', action: 'New user registered', time: '2 minutes ago', status: 'success' },
            { type: 'questionnaire', user: 'Patient', action: 'Submitted questionnaire', time: '15 minutes ago', status: 'success' },
            { type: 'health_data', user: 'Patient', action: 'Uploaded health data', time: '1 hour ago', status: 'success' },
            { type: 'user_login', user: AdminManager.users[0]?.email || 'User', action: 'User logged in', time: '2 hours ago', status: 'success' },
            { type: 'assessment', user: 'Patient', action: 'Completed assessment', time: '3 hours ago', status: 'success' }
        ];

        const html = `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Type</th>
                        <th>User</th>
                        <th>Action</th>
                        <th>Time</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${activities.map(activity => `
                        <tr>
                            <td>
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <div style="width: 36px; height: 36px; background: ${this.getActivityIcon(activity.type).bg}; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: ${this.getActivityIcon(activity.type).color};">
                                        <i class="${this.getActivityIcon(activity.type).icon}"></i>
                                    </div>
                                    <span style="font-weight: 600;">${this.formatActivityType(activity.type)}</span>
                                </div>
                            </td>
                            <td>${activity.user}</td>
                            <td>${activity.action}</td>
                            <td style="color: var(--admin-text-secondary);">${activity.time}</td>
                            <td>
                                <span class="admin-badge success">
                                    <i class="fas fa-check-circle"></i> ${activity.status}
                                </span>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        document.getElementById('recentActivityTable').innerHTML = html;
    },

    /**
     * Render Dashboard Charts - PROFESSIONAL DESIGN
     */
    renderDashboardCharts() {
        // User Growth Chart - Modern Line Chart with Gradient
        const userGrowthCtx = document.getElementById('userGrowthChart');
        if (userGrowthCtx) {
            const gradient = userGrowthCtx.getContext('2d').createLinearGradient(0, 0, 0, 250);
            gradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
            gradient.addColorStop(1, 'rgba(102, 126, 234, 0.01)');

            new Chart(userGrowthCtx, {
                type: 'line',
                data: {
                    labels: ['January', 'February', 'March', 'April', 'May', 'June'],
                    datasets: [{
                        label: 'Total Users',
                        data: [12, 19, 25, 32, 41, Math.max(AdminManager.users.length, 50)],
                        borderColor: '#667eea',
                        backgroundColor: gradient,
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#667eea',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 3,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointHoverBackgroundColor: '#764ba2',
                        pointHoverBorderWidth: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            titleColor: '#fff',
                            bodyColor: '#e2e8f0',
                            borderColor: '#667eea',
                            borderWidth: 1,
                            padding: 12,
                            displayColors: false,
                            titleFont: { size: 14, weight: '700' },
                            bodyFont: { size: 13 },
                            callbacks: {
                                label: function(context) {
                                    return ` ${context.parsed.y} users`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            border: {
                                display: false
                            },
                            ticks: {
                                color: '#94a3b8',
                                font: { size: 12, weight: '600' }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: '#f1f5f9',
                                drawBorder: false
                            },
                            border: {
                                display: false
                            },
                            ticks: {
                                color: '#94a3b8',
                                font: { size: 12, weight: '600' },
                                padding: 8
                            }
                        }
                    }
                }
            });
        }

        // Activity Chart - Modern Bar Chart
        const activityCtx = document.getElementById('activityChart');
        if (activityCtx) {
            const activityData = [45, 52, 38, 65, 72, 48, 35];
            const maxValue = Math.max(...activityData);

            new Chart(activityCtx, {
                type: 'bar',
                data: {
                    labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                    datasets: [{
                        label: 'Activities',
                        data: activityData,
                        backgroundColor: activityData.map(val =>
                            val === maxValue ? '#667eea' : 'rgba(102, 126, 234, 0.6)'
                        ),
                        borderRadius: 10,
                        borderSkipped: false,
                        barThickness: 32,
                        hoverBackgroundColor: '#764ba2'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            titleColor: '#fff',
                            bodyColor: '#e2e8f0',
                            borderColor: '#667eea',
                            borderWidth: 1,
                            padding: 12,
                            displayColors: false,
                            titleFont: { size: 14, weight: '700' },
                            bodyFont: { size: 13 },
                            callbacks: {
                                label: function(context) {
                                    return ` ${context.parsed.y} activities`;
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false
                            },
                            border: {
                                display: false
                            },
                            ticks: {
                                color: '#94a3b8',
                                font: { size: 12, weight: '600' }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: '#f1f5f9',
                                drawBorder: false
                            },
                            border: {
                                display: false
                            },
                            ticks: {
                                color: '#94a3b8',
                                font: { size: 12, weight: '600' },
                                padding: 8,
                                stepSize: 20
                            }
                        }
                    }
                }
            });
        }
    },

    /**
     * Format Activity Type
     */
    formatActivityType(type) {
        const types = {
            'user_register': 'Registration',
            'user_login': 'Login',
            'questionnaire': 'Questionnaire',
            'health_data': 'Health Data',
            'assessment': 'Assessment',
            'api_call': 'API Call',
            'system_check': 'System Check'
        };
        return types[type] || type;
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
     * Render Users Tab - MODERN PROFESSIONAL DESIGN
     */
    async renderUsersTab() {
        const content = document.getElementById('adminDashboardContent');
        if (!content) return;

        if (AdminManager.users.length === 0) {
            content.innerHTML = `
                <div class="admin-empty-state">
                    <div class="admin-empty-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="admin-empty-title">No Users Found</div>
                    <div class="admin-empty-description">
                        There are no users in the system yet. Users will appear here when they register.
                    </div>
                </div>
            `;
            return;
        }

        // Calculate stats
        const adminCount = AdminManager.users.filter(u => u.role === 'admin').length;
        const activeCount = AdminManager.users.filter(u => !u.disabled).length;
        const disabledCount = AdminManager.users.filter(u => u.disabled).length;

        const usersTable = AdminManager.users.map((user, index) => `
            <tr class="modern-table-row">
                <td>
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <div class="user-avatar-lg">
                            ${(user.email || 'U')[0].toUpperCase()}
                        </div>
                        <div style="min-width: 0; flex: 1;">
                            <div class="user-email">${user.email || 'Anonymous User'}</div>
                            <div class="user-id">ID: ${user.id?.slice(0, 12)}...</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div class="user-name-cell">
                        ${user.name || '<span style="color: #cbd5e1; font-style: italic;">Not set</span>'}
                    </div>
                </td>
                <td>
                    <div class="role-badge-modern ${user.role === 'admin' ? 'role-admin' : 'role-user'}">
                        <i class="fas ${user.role === 'admin' ? 'fa-shield-halved' : 'fa-user'}"></i>
                        <span>${(user.role || 'user')}</span>
                    </div>
                </td>
                <td>
                    <div class="status-badge-modern ${user.disabled ? 'status-disabled' : 'status-active'}">
                        <span class="status-dot"></span>
                        <span>${user.disabled ? 'Disabled' : 'Active'}</span>
                    </div>
                </td>
                <td>
                    <div class="user-date">
                        ${user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        }) : '-'}
                    </div>
                </td>
                <td>
                    <div class="table-actions-modern">
                        <select class="role-select-modern" onchange="AdminUI.changeUserRole('${user.id}', this.value)">
                            <option value="user" ${user.role === 'user' || !user.role ? 'selected' : ''}>User</option>
                            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                        </select>
                        <button class="action-btn-modern ${user.disabled ? 'btn-enable' : 'btn-disable'}"
                                onclick="AdminUI.toggleUserStatus('${user.id}', ${user.disabled ? false : true})"
                                title="${user.disabled ? 'Enable User' : 'Disable User'}">
                            <i class="fas ${user.disabled ? 'fa-check-circle' : 'fa-ban'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        content.innerHTML = `
            <!-- Stats Cards -->
            <div class="admin-stats-grid" style="margin-bottom: 32px;">
                <div class="admin-stat-card primary">
                    <div class="stat-header">
                        <div class="stat-icon" style="background: linear-gradient(135deg, #667eea, #764ba2);">
                            <i class="fas fa-users"></i>
                        </div>
                    </div>
                    <div class="stat-label">Total Users</div>
                    <div class="stat-value">${AdminManager.users.length}</div>
                    <div class="stat-description">All registered accounts</div>
                </div>

                <div class="admin-stat-card success">
                    <div class="stat-header">
                        <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                            <i class="fas fa-check-circle"></i>
                        </div>
                    </div>
                    <div class="stat-label">Active Users</div>
                    <div class="stat-value">${activeCount}</div>
                    <div class="stat-description">${((activeCount/AdminManager.users.length)*100).toFixed(1)}% of total</div>
                </div>

                <div class="admin-stat-card info">
                    <div class="stat-header">
                        <div class="stat-icon" style="background: linear-gradient(135deg, #3b82f6, #2563eb);">
                            <i class="fas fa-shield-halved"></i>
                        </div>
                    </div>
                    <div class="stat-label">Administrators</div>
                    <div class="stat-value">${adminCount}</div>
                    <div class="stat-description">System admins</div>
                </div>

                <div class="admin-stat-card ${disabledCount > 0 ? 'warning' : 'success'}">
                    <div class="stat-header">
                        <div class="stat-icon" style="background: linear-gradient(135deg, ${disabledCount > 0 ? '#f59e0b, #d97706' : '#10b981, #059669'});">
                            <i class="fas fa-ban"></i>
                        </div>
                    </div>
                    <div class="stat-label">Disabled</div>
                    <div class="stat-value">${disabledCount}</div>
                    <div class="stat-description">${disabledCount > 0 ? 'Requires attention' : 'All good!'}</div>
                </div>
            </div>

            <!-- Modern Table -->
            <div class="admin-table-container-modern">
                <div class="admin-table-header-modern">
                    <div>
                        <h3 class="table-title-modern">
                            <i class="fas fa-users"></i>
                            All Users
                        </h3>
                        <p class="table-subtitle-modern">Manage user accounts and permissions</p>
                    </div>
                    <div class="table-header-actions">
                        <div class="admin-search-modern">
                            <i class="fas fa-search"></i>
                            <input type="text"
                                   placeholder="Search by email or name..."
                                   id="userSearchInput"
                                   onkeyup="AdminUI.searchUsers(this.value)">
                        </div>
                        <button class="admin-btn-modern btn-primary-modern" onclick="AdminUI.exportUsers()">
                            <i class="fas fa-download"></i>
                            <span>Export</span>
                        </button>
                    </div>
                </div>

                <div class="table-wrapper-modern">
                    <table class="admin-table-modern" id="usersTable">
                        <thead>
                            <tr>
                                <th>User Account</th>
                                <th>Full Name</th>
                                <th>Role</th>
                                <th>Status</th>
                                <th>Joined</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${usersTable}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },

    /**
     * Search Users
     */
    searchUsers(query) {
        const table = document.getElementById('usersTable');
        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');
        const searchTerm = query.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    },

    /**
     * Export Users to CSV
     */
    exportUsers() {
        const csv = ['Email,Name,Role,Status\n'];
        AdminManager.users.forEach(user => {
            csv.push(`${user.email || ''},${user.name || ''},${user.role || 'user'},${user.disabled ? 'Disabled' : 'Active'}\n`);
        });

        const blob = new Blob(csv, { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        this.showSuccess('Users exported successfully!');
    },

    /**
     * Render Settings Tab
     */
    renderSettingsTab() {
        // Settings already rendered in Views.admin()
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
     * Save Settings
     */
    async saveSettings() {
        const policy = document.getElementById('rotationPolicy')?.value;
        this.showSuccess(`Rotation policy updated to: ${policy}`);
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
        this.showToast(message, 'success');
    },

    /**
     * Show Error Message
     */
    showError(message) {
        this.showToast(message, 'error');
    },

    /**
     * Show Toast Notification
     */
    showToast(message, type = 'info') {
        // Remove existing toasts
        document.querySelectorAll('.admin-toast').forEach(toast => toast.remove());

        // Create toast
        const toast = document.createElement('div');
        toast.className = 'admin-toast';
        toast.style.cssText = `
            position: fixed;
            top: 24px;
            right: 24px;
            background: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 10001;
            animation: slideInRight 0.3s ease;
            max-width: 400px;
            border-left: 4px solid ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        `;

        const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle';
        const color = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';

        toast.innerHTML = `
            <i class="fas ${icon}" style="font-size: 1.5rem; color: ${color};"></i>
            <div style="flex: 1;">
                <div style="font-weight: 600; color: var(--admin-text-primary); margin-bottom: 2px;">
                    ${type === 'success' ? 'Success!' : type === 'error' ? 'Error!' : 'Info'}
                </div>
                <div style="font-size: 0.875rem; color: var(--admin-text-secondary);">
                    ${message}
                </div>
            </div>
            <button onclick="this.parentElement.remove()"
                    style="background: none; border: none; color: var(--admin-text-tertiary); cursor: pointer; font-size: 1.2rem; padding: 0; width: 24px; height: 24px;">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(toast);

        // Add animation style if not exists
        if (!document.getElementById('toastAnimation')) {
            const style = document.createElement('style');
            style.id = 'toastAnimation';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideInRight 0.3s ease reverse';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    },

    /**
     * Render System Chart
     */
    renderSystemChart(patients, questionnaires) {
        const ctx = document.getElementById('systemChart');
        if (!ctx) return;

        // Prepare data - last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            last7Days.push(date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }));
        }

        // Sample data (in real app, aggregate from actual data)
        const userData = [10, 15, 12, 18, 22, 25, AdminManager.users.length];
        const questionnaireData = [2, 3, 5, 4, 6, 8, questionnaires.length];

        if (this.systemChart) {
            this.systemChart.destroy();
        }

        this.systemChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [
                    {
                        label: 'Total Users',
                        data: userData,
                        borderColor: '#7c3aed',
                        backgroundColor: 'rgba(124, 58, 237, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Questionnaires',
                        data: questionnaireData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    },

    /**
     * Render Patients Tab - MODERN PROFESSIONAL DESIGN
     */
    async renderPatientsTab() {
        const container = document.getElementById('adminDashboardContent');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 80px 20px;">
                <div class="loading-spinner" style="margin: 0 auto 24px; width: 50px; height: 50px;"></div>
                <p style="color: #64748b; font-size: 1.1rem; font-weight: 500;">Loading patient data...</p>
            </div>
        `;

        try {
            const patients = await AdminManager.loadPatientData();

            if (patients.length === 0) {
                container.innerHTML = `
                    <div class="admin-empty-state">
                        <div class="admin-empty-icon">
                            <i class="fas fa-user-injured"></i>
                        </div>
                        <div class="admin-empty-title">No Patient Data</div>
                        <div class="admin-empty-description">
                            No patient records found in the system
                        </div>
                    </div>
                `;
                return;
            }

            // Calculate stats
            const totalReadings = patients.reduce((sum, p) => sum + (p.stats?.healthReadings || 0), 0);
            const totalAssessments = patients.reduce((sum, p) => sum + (p.stats?.assessments || 0), 0);
            const totalJournals = patients.reduce((sum, p) => sum + (p.stats?.journals || 0), 0);
            const onboardedCount = patients.filter(p => p.onboardingCompleted).length;

            const patientsTable = patients.map(patient => `
                <tr class="modern-table-row">
                    <td>
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <div class="user-avatar-lg" style="background: linear-gradient(135deg, #10b981, #059669);">
                                ${(patient.name || 'P')[0].toUpperCase()}
                            </div>
                            <div style="min-width: 0; flex: 1;">
                                <div class="user-email">${patient.name || 'Unknown Patient'}</div>
                                <div class="user-id">${patient.email}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="status-badge-modern ${patient.onboardingCompleted ? 'status-active' : 'status-disabled'}">
                            <span class="status-dot"></span>
                            <span>${patient.onboardingCompleted ? 'Onboarded' : 'Pending'}</span>
                        </div>
                    </td>
                    <td>
                        <div class="data-stat-pill">
                            <i class="fas fa-heartbeat"></i>
                            <span>${patient.stats?.healthReadings || 0}</span>
                        </div>
                    </td>
                    <td>
                        <div class="data-stat-pill">
                            <i class="fas fa-clipboard-check"></i>
                            <span>${patient.stats?.assessments || 0}</span>
                        </div>
                    </td>
                    <td>
                        <div class="data-stat-pill">
                            <i class="fas fa-book"></i>
                            <span>${patient.stats?.journals || 0}</span>
                        </div>
                    </td>
                    <td>
                        <div class="data-stat-pill">
                            <i class="fas fa-trophy"></i>
                            <span>${patient.stats?.heroicActivities || 0}</span>
                        </div>
                    </td>
                    <td>
                        <div class="table-actions-modern">
                            <button class="action-btn-modern" style="background: #dbeafe; color: #2563eb;"
                                    onclick="AdminUI.viewPatientDetails('${patient.id}')"
                                    title="View Details">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn-modern" style="background: #dcfce7; color: #16a34a;"
                                    onclick="AdminUI.exportPatientData('${patient.id}')"
                                    title="Export Data">
                                <i class="fas fa-download"></i>
                            </button>
                            <button class="action-btn-modern btn-disable"
                                    onclick="AdminUI.deletePatientDataConfirm('${patient.id}')"
                                    title="Delete Data">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');

            container.innerHTML = `
                <!-- Stats Cards -->
                <div class="admin-stats-grid" style="margin-bottom: 32px;">
                    <div class="admin-stat-card success">
                        <div class="stat-header">
                            <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                                <i class="fas fa-user-injured"></i>
                            </div>
                        </div>
                        <div class="stat-label">Total Patients</div>
                        <div class="stat-value">${patients.length}</div>
                        <div class="stat-description">Active patient records</div>
                    </div>

                    <div class="admin-stat-card info">
                        <div class="stat-header">
                            <div class="stat-icon" style="background: linear-gradient(135deg, #3b82f6, #2563eb);">
                                <i class="fas fa-heartbeat"></i>
                            </div>
                        </div>
                        <div class="stat-label">Health Readings</div>
                        <div class="stat-value">${totalReadings}</div>
                        <div class="stat-description">Total vitals recorded</div>
                    </div>

                    <div class="admin-stat-card primary">
                        <div class="stat-header">
                            <div class="stat-icon" style="background: linear-gradient(135deg, #667eea, #764ba2);">
                                <i class="fas fa-clipboard-check"></i>
                            </div>
                        </div>
                        <div class="stat-label">Assessments</div>
                        <div class="stat-value">${totalAssessments}</div>
                        <div class="stat-description">Completed evaluations</div>
                    </div>

                    <div class="admin-stat-card warning">
                        <div class="stat-header">
                            <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                                <i class="fas fa-book"></i>
                            </div>
                        </div>
                        <div class="stat-label">Journal Entries</div>
                        <div class="stat-value">${totalJournals}</div>
                        <div class="stat-description">Personal reflections</div>
                    </div>
                </div>

                <!-- Modern Table -->
                <div class="admin-table-container-modern">
                    <div class="admin-table-header-modern">
                        <div>
                            <h3 class="table-title-modern">
                                <i class="fas fa-user-injured"></i>
                                Patient Records
                            </h3>
                            <p class="table-subtitle-modern">View and manage patient health data</p>
                        </div>
                        <div class="table-header-actions">
                            <div class="admin-search-modern">
                                <i class="fas fa-search"></i>
                                <input type="text"
                                       placeholder="Search patients..."
                                       id="patientSearchInput"
                                       onkeyup="AdminUI.searchPatients(this.value)">
                            </div>
                            <button class="admin-btn-modern btn-primary-modern" onclick="AdminUI.exportAllPatients()">
                                <i class="fas fa-download"></i>
                                <span>Export All</span>
                            </button>
                        </div>
                    </div>

                    <div class="table-wrapper-modern">
                        <table class="admin-table-modern" id="patientsTable">
                            <thead>
                                <tr>
                                    <th>Patient Info</th>
                                    <th>Onboarding</th>
                                    <th>Health Readings</th>
                                    <th>Assessments</th>
                                    <th>Journals</th>
                                    <th>HEROIC</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${patientsTable}
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        } catch (e) {
            console.error('Failed to render patients:', e);
            container.innerHTML = `
                <div class="admin-empty-state">
                    <div class="admin-empty-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="admin-empty-title">Error Loading Data</div>
                    <div class="admin-empty-description">${e.message}</div>
                </div>
            `;
        }
    },

    /**
     * View Patient Details
     */
    async viewPatientDetails(userId) {
        const modal = document.getElementById('detailModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = 'Patient Details';
        modalBody.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Loading...</p></div>';
        modal.classList.add('active');

        try {
            const data = await AdminManager.getPatientDetails(userId);

            modalBody.innerHTML = `
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Name</label>
                        <p>${data.user.name || '-'}</p>
                    </div>
                    <div class="detail-item">
                        <label>Email</label>
                        <p>${data.user.email || '-'}</p>
                    </div>
                    <div class="detail-item">
                        <label>Role</label>
                        <p><span class="badge badge-info">${data.user.role || 'user'}</span></p>
                    </div>
                    <div class="detail-item">
                        <label>Created</label>
                        <p>${AdminManager.formatDate(data.user.createdAt)}</p>
                    </div>
                </div>

                <h3 class="section-title">Health Data Summary</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Health Readings</label>
                        <p>${data.healthReadings.length}</p>
                    </div>
                    <div class="detail-item">
                        <label>Assessments</label>
                        <p>${data.assessments.length}</p>
                    </div>
                    <div class="detail-item">
                        <label>Journal Entries</label>
                        <p>${data.journals.length}</p>
                    </div>
                    <div class="detail-item">
                        <label>HEROIC Activities</label>
                        <p>${data.heroicActivities.length}</p>
                    </div>
                </div>

                <h3 class="section-title">Recent Health Readings (Last 5)</h3>
                <div style="max-height: 200px; overflow-y: auto;">
                    ${data.healthReadings.slice(0, 5).map(reading => `
                        <div style="padding: 12px; background: #f8fafc; border-radius: 8px; margin-bottom: 8px;">
                            <div style="display: flex; justify-content: space-between; font-size: 0.9rem;">
                                <span><strong>HR:</strong> ${reading.heartRate || '-'} bpm</span>
                                <span><strong>SpO2:</strong> ${reading.spo2 || '-'}%</span>
                                <span><strong>Temp:</strong> ${reading.temperature || '-'}°C</span>
                                <span style="color: var(--text-tertiary);">${AdminManager.formatDate(reading.timestamp)}</span>
                            </div>
                        </div>
                    `).join('') || '<p style="text-align: center; color: var(--text-tertiary);">No health readings</p>'}
                </div>
            `;
        } catch (e) {
            modalBody.innerHTML = `
                <div style="text-align: center; color: var(--error);">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load patient details: ${e.message}</p>
                </div>
            `;
        }
    },

    /**
     * Export Patient Data
     */
    async exportPatientData(userId) {
        try {
            await AdminManager.exportPatientDataToJSON(userId);
            this.showSuccess('Patient data exported successfully');
        } catch (e) {
            this.showError('Failed to export patient data: ' + e.message);
        }
    },

    /**
     * Delete Patient Data Confirm
     */
    deletePatientDataConfirm(userId) {
        if (confirm('Are you sure you want to delete ALL data for this patient? This action cannot be undone!')) {
            this.deletePatientData(userId);
        }
    },

    /**
     * Delete Patient Data
     */
    async deletePatientData(userId) {
        try {
            await AdminManager.deletePatientData(userId, 'all');
            this.showSuccess('Patient data deleted successfully');
            this.renderPatientsTab();
        } catch (e) {
            this.showError('Failed to delete patient data: ' + e.message);
        }
    },

    /**
     * Search Patients
     */
    searchPatients(query) {
        const searchTerm = query.toLowerCase().trim();
        const table = document.getElementById('patientsTable');
        if (!table) return;

        const rows = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr');

        for (let row of rows) {
            const patientInfo = row.cells[0].textContent.toLowerCase();

            if (patientInfo.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        }
    },

    /**
     * Export All Patients
     */
    async exportAllPatients() {
        try {
            const patients = await AdminManager.loadPatientData();

            if (patients.length === 0) {
                this.showError('No patient data to export');
                return;
            }

            // Prepare CSV data
            const csvHeaders = [
                'Patient ID',
                'Name',
                'Email',
                'Onboarding Status',
                'Health Readings',
                'Assessments',
                'Journals',
                'HEROIC Activities',
                'Created Date'
            ];

            const csvRows = patients.map(patient => [
                patient.id || '',
                patient.name || '',
                patient.email || '',
                patient.onboardingCompleted ? 'Onboarded' : 'Pending',
                patient.stats?.healthReadings || 0,
                patient.stats?.assessments || 0,
                patient.stats?.journals || 0,
                patient.stats?.heroicActivities || 0,
                patient.createdAt ? new Date(patient.createdAt.seconds * 1000).toLocaleDateString() : ''
            ]);

            // Create CSV content
            let csvContent = csvHeaders.join(',') + '\n';
            csvRows.forEach(row => {
                csvContent += row.map(cell => {
                    // Escape cells that contain commas or quotes
                    const cellStr = String(cell);
                    if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                        return '"' + cellStr.replace(/"/g, '""') + '"';
                    }
                    return cellStr;
                }).join(',') + '\n';
            });

            // Create and download file
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            link.setAttribute('href', url);
            link.setAttribute('download', `synawatch_patients_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showSuccess(`Successfully exported ${patients.length} patient records`);
        } catch (e) {
            console.error('Export error:', e);
            this.showError('Failed to export patient data: ' + e.message);
        }
    },

    /**
     * Filter Patient Data
     */
    filterPatientData(dataType) {
        // Implement filter functionality
        console.log('Filtering by:', dataType);
    },

    /**
     * Render Aromatherapy Recommendations Tab
     */
    async renderAromaTab() {
        const container = document.getElementById('adminDashboardContent');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align:center;padding:40px;color:#6b7280;">
                <i class="fas fa-spinner fa-spin" style="font-size:2rem;margin-bottom:12px;display:block;"></i>
                Memuat data aromaterapi...
            </div>`;

        try {
            const recs = await AdminManager.loadAromaRecommendations(500);

            if (!recs.length) {
                container.innerHTML = `
                    <div class="admin-empty-state">
                        <div class="admin-empty-icon"><i class="fas fa-spray-can-sparkles"></i></div>
                        <div class="admin-empty-title">Belum Ada Rekomendasi Aromaterapi</div>
                        <div class="admin-empty-description">
                            Data akan muncul saat pengguna menggunakan Aroma Advisor.
                        </div>
                    </div>`;
                return;
            }

            /* Aggregate: dominant-need distribution + oil frequency */
            const dominantCount = {};
            const oilCount = {};
            const dimLabel = {
                calm:'Tenang', uplift:'Mood', ground:'Grounding', energize:'Energi',
                focus:'Fokus', sleep:'Tidur', appetite:'Nafsu makan'
            };
            recs.forEach(r => {
                if (r.dominant) dominantCount[r.dominant] = (dominantCount[r.dominant] || 0) + 1;
                (r.blend || []).forEach(b => { oilCount[b.id] = (oilCount[b.id] || 0) + 1; });
            });

            const total = recs.length;
            const topDominant = Object.entries(dominantCount).sort((a,b)=>b[1]-a[1]);
            const topOils = Object.entries(oilCount).sort((a,b)=>b[1]-a[1]).slice(0, 8);

            const oilName = (id) => (typeof AromaDB !== 'undefined' && AromaDB.get(id)) ? AromaDB.get(id).name : id;

            container.innerHTML = `
                <div style="margin-bottom:28px;">
                    <h1 style="font-size:1.6rem;font-weight:800;color:var(--admin-text-primary,#1e293b);margin-bottom:6px;">Aromatherapy Recommendations</h1>
                    <p style="color:var(--admin-text-secondary,#64748b);font-size:0.92rem;">${total} rekomendasi tercatat dari pengguna</p>
                </div>

                <div class="admin-stats-grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr));margin-bottom:28px;">
                    <div class="admin-stat-card">
                        <div class="stat-header"><div><div class="stat-label">Total Rekomendasi</div><div class="stat-value">${total}</div></div>
                        <div class="stat-icon" style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);"><i class="fas fa-spray-can-sparkles"></i></div></div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="stat-header"><div><div class="stat-label">Kebutuhan Teratas</div><div class="stat-value" style="font-size:1.3rem;">${topDominant.length ? (dimLabel[topDominant[0][0]]||topDominant[0][0]) : '—'}</div></div>
                        <div class="stat-icon" style="background:linear-gradient(135deg,#10b981,#059669);"><i class="fas fa-chart-pie"></i></div></div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="stat-header"><div><div class="stat-label">Minyak Terpopuler</div><div class="stat-value" style="font-size:1.3rem;">${topOils.length ? oilName(topOils[0][0]) : '—'}</div></div>
                        <div class="stat-icon" style="background:linear-gradient(135deg,#f59e0b,#d97706);"><i class="fas fa-leaf"></i></div></div>
                    </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px;">
                    <div class="admin-card" style="padding:18px;">
                        <h3 style="font-size:1rem;margin-bottom:14px;color:var(--admin-text-primary,#1e293b);">Distribusi Kebutuhan Dominan</h3>
                        ${topDominant.map(([k,c]) => `
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                                <span style="width:90px;font-size:0.78rem;color:#6d28d9;font-weight:600;">${dimLabel[k]||k}</span>
                                <div style="flex:1;height:10px;background:rgba(124,58,237,0.08);border-radius:99px;overflow:hidden;">
                                    <div style="height:100%;width:${Math.round(c/total*100)}%;background:linear-gradient(90deg,#8b5cf6,#c084fc);"></div>
                                </div>
                                <span style="font-size:0.75rem;color:#7c3aed;font-weight:700;">${c}</span>
                            </div>`).join('')}
                    </div>
                    <div class="admin-card" style="padding:18px;">
                        <h3 style="font-size:1rem;margin-bottom:14px;color:var(--admin-text-primary,#1e293b);">Minyak Esensial Terpopuler</h3>
                        ${topOils.map(([id,c]) => `
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                                <span style="width:110px;font-size:0.78rem;color:#4c1d95;font-weight:600;">${oilName(id)}</span>
                                <div style="flex:1;height:10px;background:rgba(124,58,237,0.08);border-radius:99px;overflow:hidden;">
                                    <div style="height:100%;width:${Math.round(c/(topOils[0][1])*100)}%;background:linear-gradient(90deg,#10b981,#34d399);"></div>
                                </div>
                                <span style="font-size:0.75rem;color:#059669;font-weight:700;">${c}</span>
                            </div>`).join('')}
                    </div>
                </div>

                <div class="admin-table-container">
                    <table class="admin-table">
                        <thead><tr>
                            <th>Waktu</th><th>User</th><th>Kebutuhan</th><th>Blend</th><th>Hunger</th>
                        </tr></thead>
                        <tbody>
                            ${recs.slice(0, 100).map(r => {
                                const ts = r.timestamp?.toDate ? r.timestamp.toDate() : null;
                                const when = ts ? ts.toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) : '—';
                                const blend = (r.blend||[]).map(b => oilName(b.id)).join(', ') || '—';
                                return `<tr>
                                    <td>${when}</td>
                                    <td style="font-family:monospace;font-size:0.72rem;">${(r.userId||'').slice(0,8)}…</td>
                                    <td><span style="background:rgba(124,58,237,0.1);color:#6d28d9;padding:3px 10px;border-radius:99px;font-size:0.72rem;font-weight:700;">${dimLabel[r.dominant]||r.dominant||'—'}</span></td>
                                    <td style="font-size:0.78rem;">${blend}</td>
                                    <td>${r.hunger ?? '—'}</td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (e) {
            console.error('Failed to render aroma tab:', e);
            container.innerHTML = `<div class="admin-empty-state"><div class="admin-empty-title">Gagal memuat data</div><div class="admin-empty-description">${e.message}</div></div>`;
        }
    },

    /**
     * Render Questionnaires Tab
     */
    async renderQuestionnairesTab() {
        const container = document.getElementById('adminDashboardContent');
        if (!container) return;

        // Show loading skeleton
        container.innerHTML = `
            <div class="admin-stats-grid">
                <div class="admin-skeleton skeleton-card"></div>
                <div class="admin-skeleton skeleton-card"></div>
            </div>
            <div class="admin-skeleton" style="height: 400px; margin-top: 20px;"></div>
        `;

        try {
            const questionnaires = await AdminManager.loadQuestionnaires();

            if (questionnaires.length === 0) {
                container.innerHTML = `
                    <div class="admin-empty-state">
                        <div class="admin-empty-icon">
                            <i class="fas fa-clipboard-list"></i>
                        </div>
                        <div class="admin-empty-title">No Questionnaire Responses</div>
                        <div class="admin-empty-description">
                            No questionnaire responses have been submitted yet. Responses will appear here when users complete the questionnaire.
                        </div>
                    </div>
                `;
                return;
            }

            // Calculate statistics
            const totalResponses = questionnaires.length;
            const avgSUS = questionnaires.reduce((sum, q) => sum + (q.sus?.totalScore || 0), 0) / totalResponses;
            const avgTAM = questionnaires.reduce((sum, q) => sum + (q.tam?.overallAvg || 0), 0) / totalResponses;
            const avgNPS = questionnaires.reduce((sum, q) => sum + (q.nps?.score || 0), 0) / totalResponses;

            // Render Google Forms-like interface
            container.innerHTML = `
                <!-- Page Header -->
                <div style="margin-bottom: 32px;">
                    <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--admin-text-primary); margin-bottom: 8px;">
                        Questionnaire Responses
                    </h1>
                    <p style="color: var(--admin-text-secondary); font-size: 0.95rem;">
                        View and analyze questionnaire responses from your users
                    </p>
                </div>

                <!-- Tab Navigation -->
                <div style="border-bottom: 2px solid var(--admin-border); margin-bottom: 24px;">
                    <div style="display: flex; gap: 8px;">
                        <button class="questionnaire-tab active" data-tab="summary" onclick="AdminUI.switchQuestionnaireTab('summary')">
                            <i class="fas fa-chart-pie"></i> Summary
                        </button>
                        <button class="questionnaire-tab" data-tab="responses" onclick="AdminUI.switchQuestionnaireTab('responses')">
                            <i class="fas fa-list"></i> Individual Responses
                        </button>
                    </div>
                </div>

                <!-- Summary Tab -->
                <div id="questionnaire-summary-tab" style="display: block;">
                    <!-- Overview Stats -->
                    <div class="admin-stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 32px;">
                        <div class="admin-stat-card primary">
                            <div class="stat-header">
                                <div>
                                    <div class="stat-label">Total Responses</div>
                                    <div class="stat-value">${totalResponses}</div>
                                </div>
                                <div class="stat-icon">
                                    <i class="fas fa-clipboard-check"></i>
                                </div>
                            </div>
                        </div>

                        <div class="admin-stat-card success">
                            <div class="stat-header">
                                <div>
                                    <div class="stat-label">Avg SUS Score</div>
                                    <div class="stat-value">${avgSUS.toFixed(1)}</div>
                                </div>
                                <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                                    <i class="fas fa-star"></i>
                                </div>
                            </div>
                            <div class="stat-description">
                                <span style="color: ${this.getSUSColor(avgSUS)}; font-weight: 600;">
                                    ${this.getSUSGrade(avgSUS)}
                                </span>
                            </div>
                        </div>

                        <div class="admin-stat-card info">
                            <div class="stat-header">
                                <div>
                                    <div class="stat-label">Avg TAM Score</div>
                                    <div class="stat-value">${avgTAM.toFixed(2)}</div>
                                </div>
                                <div class="stat-icon" style="background: linear-gradient(135deg, #3b82f6, #2563eb);">
                                    <i class="fas fa-thumbs-up"></i>
                                </div>
                            </div>
                        </div>

                        <div class="admin-stat-card warning">
                            <div class="stat-header">
                                <div>
                                    <div class="stat-label">Avg NPS Score</div>
                                    <div class="stat-value">${avgNPS.toFixed(0)}</div>
                                </div>
                                <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                                    <i class="fas fa-chart-line"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Overall Summary -->
                    <div class="admin-chart-container">
                        <div class="admin-chart-header">
                            <div>
                                <div class="admin-chart-title">
                                    <i class="fas fa-chart-bar"></i> SUS Score Distribution
                                </div>
                                <div class="admin-chart-subtitle">Overall System Usability Scale scores</div>
                            </div>
                            <span class="admin-chart-badge">${totalResponses} Responses</span>
                        </div>
                        <div class="admin-chart-wrapper" style="height: 300px;">
                            <canvas id="susDistributionChart"></canvas>
                        </div>
                    </div>

                    <!-- Demographic Breakdown -->
                    <div class="admin-charts-grid">
                        <div class="admin-chart-container">
                            <div class="admin-chart-header">
                                <div>
                                    <div class="admin-chart-title">Age Distribution</div>
                                    <div class="admin-chart-subtitle">Respondent age ranges</div>
                                </div>
                            </div>
                            <div class="admin-chart-wrapper" style="height: 260px;">
                                <canvas id="ageDistributionChart"></canvas>
                            </div>
                        </div>

                        <div class="admin-chart-container">
                            <div class="admin-chart-header">
                                <div>
                                    <div class="admin-chart-title">Gender Distribution</div>
                                    <div class="admin-chart-subtitle">Respondent demographics</div>
                                </div>
                            </div>
                            <div class="admin-chart-wrapper" style="height: 260px;">
                                <canvas id="genderDistributionChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <!-- Detailed Question Analysis -->
                    <div id="detailedQuestionCharts"></div>

                    <!-- Export Options -->
                    <div style="margin-top: 32px; text-align: center;">
                        <button class="admin-btn admin-btn-primary" onclick="AdminUI.exportQuestionnaires()">
                            <i class="fas fa-download"></i>
                            Export All Responses (CSV)
                        </button>
                    </div>
                </div>

                <!-- Individual Responses Tab -->
                <div id="questionnaire-responses-tab" style="display: none;">
                    <div class="admin-table-container">
                        <div class="admin-table-header">
                            <div class="admin-table-title">
                                <i class="fas fa-users"></i>
                                All Responses (${totalResponses})
                            </div>
                            <div class="admin-table-actions">
                                <div class="admin-search">
                                    <i class="fas fa-search"></i>
                                    <input type="text" placeholder="Search responses..." id="responseSearchInput" onkeyup="AdminUI.searchResponses(this.value)">
                                </div>
                            </div>
                        </div>

                        <table class="admin-table" id="responsesTable">
                            <thead>
                                <tr>
                                    <th>Respondent</th>
                                    <th>Demographics</th>
                                    <th>Submitted</th>
                                    <th>SUS Score</th>
                                    <th>TAM Avg</th>
                                    <th>NPS</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${questionnaires.map(q => `
                                    <tr>
                                        <td>
                                            <div style="display: flex; align-items: center; gap: 12px;">
                                                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700;">
                                                    ${(q.responden?.name || 'A')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style="font-weight: 600;">${q.responden?.name || 'Anonymous'}</div>
                                                    <div style="font-size: 0.75rem; color: var(--admin-text-tertiary); font-family: monospace;">
                                                        ${q.id?.slice(0, 8)}...
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div style="font-size: 0.875rem;">
                                                <div><i class="fas fa-user"></i> ${q.responden?.ageRange || '-'}</div>
                                                <div style="color: var(--admin-text-tertiary);"><i class="fas fa-venus-mars"></i> ${q.responden?.gender || '-'}</div>
                                            </div>
                                        </td>
                                        <td style="color: var(--admin-text-secondary); font-size: 0.875rem;">
                                            ${this.formatTimestamp(q.submittedAt)}
                                        </td>
                                        <td>
                                            <div style="font-weight: 700; font-size: 1.25rem; color: ${this.getSUSColor(q.sus?.totalScore)};">
                                                ${q.sus?.totalScore || '-'}
                                            </div>
                                            <div style="font-size: 0.75rem; color: var(--admin-text-tertiary);">
                                                ${this.getSUSGrade(q.sus?.totalScore) || '-'}
                                            </div>
                                        </td>
                                        <td style="font-weight: 600;">
                                            ${q.tam?.overallAvg?.toFixed(2) || '-'}
                                        </td>
                                        <td>
                                            <span class="admin-badge ${this.getNPSBadgeClass(q.nps?.score)}">
                                                ${q.nps?.score || '-'}
                                            </span>
                                        </td>
                                        <td>
                                            <button class="admin-btn admin-btn-secondary" style="padding: 8px 14px; font-size: 0.8rem;" onclick="AdminUI.viewQuestionnaireDetails('${q.id}')">
                                                <i class="fas fa-eye"></i>
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <style>
                    .questionnaire-tab {
                        padding: 12px 24px;
                        background: transparent;
                        border: none;
                        border-bottom: 3px solid transparent;
                        color: var(--admin-text-secondary);
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s;
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .questionnaire-tab:hover {
                        color: var(--admin-primary);
                        background: rgba(102, 126, 234, 0.05);
                    }

                    .questionnaire-tab.active {
                        color: var(--admin-primary);
                        border-bottom-color: var(--admin-primary);
                    }
                </style>
            `;

            // Render charts
            this.renderQuestionnaireCharts(questionnaires);

            // Render detailed question-by-question charts
            this.renderDetailedQuestionCharts(questionnaires);

        } catch (e) {
            console.error('Failed to render questionnaires:', e);
            container.innerHTML = `
                <div class="admin-empty-state">
                    <div class="admin-empty-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="admin-empty-title">Error Loading Responses</div>
                    <div class="admin-empty-description">${e.message}</div>
                    <button class="admin-btn admin-btn-primary" onclick="AdminUI.renderQuestionnairesTab()">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    },

    /**
     * Switch Questionnaire Tab
     */
    switchQuestionnaireTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.questionnaire-tab').forEach(tab => {
            tab.classList.remove('active');
            if (tab.dataset.tab === tabName) {
                tab.classList.add('active');
            }
        });

        // Show/hide tab content
        document.getElementById('questionnaire-summary-tab').style.display = tabName === 'summary' ? 'block' : 'none';
        document.getElementById('questionnaire-responses-tab').style.display = tabName === 'responses' ? 'block' : 'none';
    },

    /**
     * Render Questionnaire Charts
     */
    renderQuestionnaireCharts(questionnaires) {
        // SUS Distribution Chart
        const susScores = questionnaires.map(q => q.sus?.totalScore || 0).filter(s => s > 0);
        const susRanges = ['0-20', '21-40', '41-60', '61-80', '81-100'];
        const susDistribution = [0, 0, 0, 0, 0];
        susScores.forEach(score => {
            if (score <= 20) susDistribution[0]++;
            else if (score <= 40) susDistribution[1]++;
            else if (score <= 60) susDistribution[2]++;
            else if (score <= 80) susDistribution[3]++;
            else susDistribution[4]++;
        });

        const susCtx = document.getElementById('susDistributionChart');
        if (susCtx) {
            new Chart(susCtx, {
                type: 'bar',
                data: {
                    labels: susRanges,
                    datasets: [{
                        label: 'Number of Responses',
                        data: susDistribution,
                        backgroundColor: [
                            '#ef4444',
                            '#f59e0b',
                            '#3b82f6',
                            '#10b981',
                            '#22c55e'
                        ],
                        borderRadius: 12,
                        borderSkipped: false,
                        barThickness: 54
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            titleColor: '#fff',
                            bodyColor: '#e2e8f0',
                            borderColor: '#667eea',
                            borderWidth: 1,
                            padding: 12,
                            displayColors: true,
                            titleFont: { size: 14, weight: '700' },
                            bodyFont: { size: 13 }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            border: { display: false },
                            ticks: {
                                color: '#94a3b8',
                                font: { size: 13, weight: '600' }
                            }
                        },
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: '#f1f5f9',
                                drawBorder: false
                            },
                            border: { display: false },
                            ticks: {
                                color: '#94a3b8',
                                font: { size: 12, weight: '600' },
                                padding: 8,
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        }

        // Age Distribution Chart
        const ageCounts = {};
        questionnaires.forEach(q => {
            const age = q.responden?.ageRange || 'Unknown';
            ageCounts[age] = (ageCounts[age] || 0) + 1;
        });

        const ageCtx = document.getElementById('ageDistributionChart');
        if (ageCtx) {
            new Chart(ageCtx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(ageCounts),
                    datasets: [{
                        data: Object.values(ageCounts),
                        backgroundColor: [
                            '#667eea',
                            '#3b82f6',
                            '#10b981',
                            '#f59e0b',
                            '#ef4444'
                        ],
                        borderWidth: 0,
                        hoverBorderWidth: 3,
                        hoverBorderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#64748b',
                                font: { size: 12, weight: '600' },
                                padding: 15,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            titleColor: '#fff',
                            bodyColor: '#e2e8f0',
                            borderColor: '#667eea',
                            borderWidth: 1,
                            padding: 12,
                            titleFont: { size: 14, weight: '700' },
                            bodyFont: { size: 13 }
                        }
                    }
                }
            });
        }

        // Gender Distribution Chart
        const genderCounts = {};
        questionnaires.forEach(q => {
            const gender = q.responden?.gender || 'Unknown';
            genderCounts[gender] = (genderCounts[gender] || 0) + 1;
        });

        const genderCtx = document.getElementById('genderDistributionChart');
        if (genderCtx) {
            new Chart(genderCtx, {
                type: 'pie',
                data: {
                    labels: Object.keys(genderCounts),
                    datasets: [{
                        data: Object.values(genderCounts),
                        backgroundColor: [
                            '#667eea',
                            '#f59e0b',
                            '#10b981'
                        ],
                        borderWidth: 0,
                        hoverBorderWidth: 3,
                        hoverBorderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#64748b',
                                font: { size: 12, weight: '600' },
                                padding: 15,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            titleColor: '#fff',
                            bodyColor: '#e2e8f0',
                            borderColor: '#667eea',
                            borderWidth: 1,
                            padding: 12,
                            titleFont: { size: 14, weight: '700' },
                            bodyFont: { size: 13 }
                        }
                    }
                }
            });
        }
    },

    /**
     * Render Detailed Question-by-Question Charts
     */
    renderDetailedQuestionCharts(questionnaires) {
        const container = document.getElementById('detailedQuestionCharts');
        if (!container) return;

        // Define all questions with their data keys (matching Firestore structure)
        const questionCategories = {
            'SUS - System Usability Scale': [
                { key: 'sus1', text: 'Q1: Saya merasa ingin sering menggunakan aplikasi SynaWatch ini' },
                { key: 'sus2', text: 'Q2: Saya merasa aplikasi ini terlalu rumit untuk digunakan' },
                { key: 'sus3', text: 'Q3: Aplikasi ini mudah digunakan' },
                { key: 'sus4', text: 'Q4: Saya membutuhkan bantuan orang lain untuk bisa menggunakan aplikasi ini' },
                { key: 'sus5', text: 'Q5: Fitur-fitur dalam aplikasi ini terintegrasi dengan baik satu sama lain' },
                { key: 'sus6', text: 'Q6: Saya merasa terlalu banyak ketidakkonsistenan dalam aplikasi ini' },
                { key: 'sus7', text: 'Q7: Saya rasa kebanyakan orang dapat belajar menggunakan aplikasi ini dengan sangat cepat' },
                { key: 'sus8', text: 'Q8: Aplikasi ini terasa sangat rumit dan canggung untuk digunakan' },
                { key: 'sus9', text: 'Q9: Saya merasa percaya diri saat menggunakan aplikasi ini' },
                { key: 'sus10', text: 'Q10: Saya perlu belajar banyak hal sebelum dapat menggunakan aplikasi ini dengan lancar' }
            ],
            'UI/UX - Navigation & Design': [
                { key: 'uiux1', text: 'Tampilan visual aplikasi ini menarik dan nyaman dilihat' },
                { key: 'uiux2', text: 'Ikon dan tombol mudah saya kenali fungsinya' },
                { key: 'uiux3', text: 'Saya dapat berpindah antar fitur dengan mudah dan intuitif' },
                { key: 'uiux4', text: 'Teks dan informasi dalam aplikasi mudah dibaca' }
            ],
            'UI/UX - Features': [
                { key: 'uiux5', text: 'Fitur SynaChat membantu saya mengekspresikan perasaan saya' },
                { key: 'uiux6', text: 'Fitur Journal mudah saya gunakan untuk mencatat emosi harian' },
                { key: 'uiux7', text: 'Konten di Academy relevan dan bermanfaat untuk kesehatan mental saya' },
                { key: 'uiux8', text: 'Latihan di fitur Yoga/Mindful terasa terarah dan mudah diikuti' },
                { key: 'uiux9', text: 'Fitur Mood Booster memberikan dampak positif pada suasana hati saya' },
                { key: 'uiux10', text: 'Program HEROIC memiliki alur yang jelas dan memotivasi' },
                { key: 'uiux11', text: 'Dashboard memberikan gambaran kondisi saya yang informatif' },
                { key: 'uiux12', text: 'Fitur Games terasa menyenangkan dan relevan dengan kesehatan mental' }
            ],
            'TAM - Perceived Usefulness': [
                { key: 'tam1', text: 'Menggunakan SynaWatch membantu saya memantau kondisi kesehatan mental saya' },
                { key: 'tam2', text: 'Aplikasi ini meningkatkan kesadaran saya terhadap kondisi emosi dan stres saya' },
                { key: 'tam3', text: 'SynaWatch bermanfaat dalam membantu saya mengelola kesehatan mental sehari-hari' },
                { key: 'tam4', text: 'Secara keseluruhan, aplikasi ini berguna bagi saya' }
            ],
            'TAM - Perceived Ease of Use': [
                { key: 'tam5', text: 'Mempelajari cara menggunakan SynaWatch terasa mudah bagi saya' },
                { key: 'tam6', text: 'Interaksi dengan aplikasi ini jelas dan mudah dipahami' },
                { key: 'tam7', text: 'Saya dapat menggunakan aplikasi ini tanpa banyak usaha' },
                { key: 'tam8', text: 'Secara keseluruhan, aplikasi ini mudah digunakan' }
            ],
            'UEQ - User Experience': [
                { key: 'ueq1', text: 'Menjengkelkan → Menyenangkan' },
                { key: 'ueq2', text: 'Membingungkan → Jelas' },
                { key: 'ueq3', text: 'Tidak efisien → Efisien' },
                { key: 'ueq4', text: 'Membosankan → Menarik' },
                { key: 'ueq5', text: 'Tidak dapat diprediksi → Dapat diprediksi' },
                { key: 'ueq6', text: 'Konvensional → Inovatif' },
                { key: 'ueq7', text: 'Tidak nyaman → Nyaman' },
                { key: 'ueq8', text: 'Lambat → Cepat' }
            ],
            'Trust & Privacy': [
                { key: 'trust1', text: 'Saya percaya bahwa data kesehatan saya aman di dalam aplikasi SynaWatch' },
                { key: 'trust2', text: 'Saya merasa nyaman memberikan data pribadi dan kondisi emosi saya ke aplikasi ini' },
                { key: 'trust3', text: 'Saya yakin data saya tidak akan disalahgunakan atau dibagikan tanpa izin' },
                { key: 'trust4', text: 'Informasi tentang privasi dan keamanan data dalam aplikasi sudah cukup jelas' },
                { key: 'trust5', text: 'Saya percaya pada AI (SynaChat) untuk menyimpan percakapan saya dengan aman' }
            ],
            'Therapeutic Value': [
                { key: 'ther1', text: 'Konten dalam aplikasi ini relevan dengan kebutuhan kesehatan mental saya' },
                { key: 'ther2', text: 'Fitur SynaChat terasa seperti berbicara dengan pendamping yang memahami saya' },
                { key: 'ther3', text: 'Latihan Yoga dan Mindful dalam aplikasi ini terasa efektif untuk menenangkan pikiran' },
                { key: 'ther4', text: 'Konten Academy memberikan pengetahuan baru yang berguna tentang kesehatan mental' },
                { key: 'ther5', text: 'Saya merasa lebih baik secara emosional setelah menggunakan aplikasi ini' },
                { key: 'ther6', text: 'Program HEROIC memberikan panduan terstruktur untuk perkembangan diri saya' },
                { key: 'ther7', text: 'Fitur Journal membantu saya lebih memahami pola emosi dan suasana hati saya' }
            ],
            'Engagement & Motivation': [
                { key: 'eng1', text: 'Saya akan menggunakan SynaWatch secara rutin jika tersedia' },
                { key: 'eng2', text: 'Saya merasa terdorong untuk menyelesaikan program atau latihan dalam aplikasi' },
                { key: 'eng3', text: 'Notifikasi atau pengingat dari aplikasi ini akan memotivasi saya untuk konsisten' },
                { key: 'eng4', text: 'Saya merasa ada kemajuan nyata saat menggunakan fitur-fitur dalam aplikasi ini' },
                { key: 'eng5', text: 'Saya ingin mencoba fitur smartwatch ketika perangkatnya sudah tersedia' }
            ]
        };

        let html = `
            <div style="margin-top: 48px;">
                <div style="text-align: center; margin-bottom: 40px;">
                    <h2 style="font-size: 1.75rem; font-weight: 800; color: #0f172a; margin-bottom: 8px;">
                        <i class="fas fa-poll"></i> Detailed Question Analysis
                    </h2>
                    <p style="color: #64748b; font-size: 1rem;">Individual response distribution for each question</p>
                </div>
        `;

        // Render each category
        Object.entries(questionCategories).forEach(([category, questions], catIndex) => {
            html += `
                <div style="margin-bottom: 48px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0;">
                        <div style="width: 6px; height: 32px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 3px;"></div>
                        <h3 style="font-size: 1.35rem; font-weight: 800; color: #0f172a; margin: 0;">${category}</h3>
                        <span style="background: rgba(102, 126, 234, 0.1); color: #667eea; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">${questions.length} Questions</span>
                    </div>

                    <div class="admin-charts-grid">
            `;

            questions.forEach((question, qIndex) => {
                const chartId = `question_${catIndex}_${qIndex}`;
                html += `
                    <div class="admin-chart-container">
                        <div class="admin-chart-header">
                            <div style="flex: 1;">
                                <div class="admin-chart-title" style="font-size: 0.95rem; line-height: 1.4;">
                                    ${question.text}
                                </div>
                                <div class="admin-chart-subtitle" style="font-size: 0.75rem; margin-top: 4px;">
                                    Code: ${question.key}
                                </div>
                            </div>
                        </div>
                        <div class="admin-chart-wrapper" style="height: 200px;">
                            <canvas id="${chartId}"></canvas>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        container.innerHTML = html;

        // Now render all the charts
        this.renderIndividualQuestionCharts(questionnaires, questionCategories);
    },

    /**
     * Render Individual Question Charts with REAL DATA from Firestore
     */
    renderIndividualQuestionCharts(questionnaires, questionCategories) {
        Object.entries(questionCategories).forEach(([category, questions], catIndex) => {
            questions.forEach((question, qIndex) => {
                const chartId = `question_${catIndex}_${qIndex}`;
                const canvas = document.getElementById(chartId);
                if (!canvas) return;

                // Extract REAL data from Firestore
                const distribution = [0, 0, 0, 0, 0]; // For ratings 1-5
                const questionKey = question.key;

                // Determine which category this question belongs to
                let category_type = '';
                if (questionKey.startsWith('sus')) category_type = 'sus';
                else if (questionKey.startsWith('uiux')) category_type = 'uiux';
                else if (questionKey.startsWith('tam')) category_type = 'tam';
                else if (questionKey.startsWith('ueq')) category_type = 'ueq';
                else if (questionKey.startsWith('trust')) category_type = 'trust';
                else if (questionKey.startsWith('ther')) category_type = 'therapeutic';
                else if (questionKey.startsWith('eng')) category_type = 'engagement';

                // Count actual responses from Firestore data
                questionnaires.forEach(q => {
                    const categoryData = q[category_type];
                    if (categoryData && categoryData.rawScores && categoryData.rawScores[questionKey]) {
                        const rating = categoryData.rawScores[questionKey];
                        if (rating >= 1 && rating <= 5) {
                            distribution[rating - 1]++; // rating 1 goes to index 0, etc.
                        }
                    }
                });

                // Calculate total and average for display
                const total = distribution.reduce((a, b) => a + b, 0);
                const weightedSum = distribution.reduce((sum, count, index) => sum + (count * (index + 1)), 0);
                const average = total > 0 ? (weightedSum / total).toFixed(2) : 0;

                // Update canvas title with average score
                const parentContainer = canvas.closest('.admin-chart-container');
                if (parentContainer) {
                    const headerDiv = parentContainer.querySelector('.admin-chart-header');
                    if (headerDiv && !headerDiv.querySelector('.chart-score-badge')) {
                        const badge = document.createElement('div');
                        badge.className = 'chart-score-badge';
                        badge.innerHTML = `
                            <div style="text-align: right;">
                                <div style="font-size: 1.5rem; font-weight: 800; color: ${this.getScoreColor(average)};">
                                    ${average}
                                </div>
                                <div style="font-size: 0.7rem; color: #94a3b8; font-weight: 600;">
                                    Avg Score (${total} responses)
                                </div>
                            </div>
                        `;
                        headerDiv.appendChild(badge);
                    }
                }

                new Chart(canvas, {
                    type: 'bar',
                    data: {
                        labels: ['1 - Sangat Tidak Setuju', '2 - Tidak Setuju', '3 - Netral', '4 - Setuju', '5 - Sangat Setuju'],
                        datasets: [{
                            label: 'Responses',
                            data: distribution,
                            backgroundColor: [
                                '#ef4444',
                                '#f59e0b',
                                '#94a3b8',
                                '#10b981',
                                '#22c55e'
                            ],
                            borderRadius: 8,
                            borderSkipped: false
                        }]
                    },
                    options: {
                        indexAxis: 'y',
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                titleColor: '#fff',
                                bodyColor: '#e2e8f0',
                                borderColor: '#667eea',
                                borderWidth: 1,
                                padding: 12,
                                titleFont: { size: 13, weight: '700' },
                                bodyFont: { size: 12 },
                                callbacks: {
                                    label: function(context) {
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = total > 0 ? ((context.parsed.x / total) * 100).toFixed(1) : 0;
                                        return ` ${context.parsed.x} responses (${percentage}%)`;
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                beginAtZero: true,
                                grid: {
                                    color: '#f1f5f9',
                                    drawBorder: false
                                },
                                border: { display: false },
                                ticks: {
                                    color: '#94a3b8',
                                    font: { size: 11, weight: '600' },
                                    stepSize: 1
                                }
                            },
                            y: {
                                grid: { display: false },
                                border: { display: false },
                                ticks: {
                                    color: '#64748b',
                                    font: { size: 11, weight: '600' }
                                }
                            }
                        }
                    }
                });
            });
        });
    },

    /**
     * Get Score Color based on value
     */
    getScoreColor(score) {
        if (score >= 4.5) return '#22c55e'; // Excellent - Green
        if (score >= 4.0) return '#10b981'; // Good - Light Green
        if (score >= 3.5) return '#3b82f6'; // Above Average - Blue
        if (score >= 3.0) return '#94a3b8'; // Average - Gray
        if (score >= 2.5) return '#f59e0b'; // Below Average - Orange
        return '#ef4444'; // Poor - Red
    },

    /**
     * Search Responses
     */
    searchResponses(query) {
        const table = document.getElementById('responsesTable');
        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');
        const searchTerm = query.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
    },

    /**
     * Format Timestamp
     */
    formatTimestamp(timestamp) {
        if (!timestamp) return '-';

        let date;
        if (timestamp.toDate) {
            date = timestamp.toDate();
        } else {
            date = new Date(timestamp);
        }

        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes} minutes ago`;
        if (hours < 24) return `${hours} hours ago`;
        if (days < 7) return `${days} days ago`;

        return date.toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },

    /**
     * Get SUS Grade
     */
    getSUSGrade(score) {
        if (!score) return '-';
        if (score >= 80) return 'Excellent';
        if (score >= 68) return 'Good';
        if (score >= 51) return 'OK';
        if (score >= 38) return 'Poor';
        return 'Awful';
    },

    /**
     * Get NPS Badge Class
     */
    getNPSBadgeClass(score) {
        if (!score) return 'info';
        if (score >= 9) return 'success';
        if (score >= 7) return 'warning';
        return 'danger';
    },

    /**
     * View Questionnaire Details
     */
    async viewQuestionnaireDetails(questionnaireId) {
        const questionnaires = await AdminManager.loadQuestionnaires();
        const q = questionnaires.find(item => item.id === questionnaireId);

        if (!q) {
            this.showError('Questionnaire not found');
            return;
        }

        // Create modal
        const modal = document.createElement('div');
        modal.className = 'admin-modal-overlay';
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };

        modal.innerHTML = `
            <div class="admin-modal" style="max-width: 900px;" onclick="event.stopPropagation()">
                <div class="admin-modal-header">
                    <div>
                        <div class="admin-modal-title">Response Details</div>
                        <div style="font-size: 0.875rem; color: var(--admin-text-secondary); margin-top: 4px;">
                            Submitted ${this.formatTimestamp(q.submittedAt)}
                        </div>
                    </div>
                    <button class="admin-modal-close" onclick="this.closest('.admin-modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div class="admin-modal-body">
                    <!-- Respondent Info -->
                    <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 24px; border-radius: 12px; color: white; margin-bottom: 24px;">
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: 800;">
                                ${(q.responden?.name || 'A')[0].toUpperCase()}
                            </div>
                            <div style="flex: 1;">
                                <div style="font-size: 1.25rem; font-weight: 700; margin-bottom: 4px;">
                                    ${q.responden?.name || 'Anonymous Respondent'}
                                </div>
                                <div style="display: flex; gap: 16px; font-size: 0.875rem; opacity: 0.9;">
                                    <span><i class="fas fa-user"></i> ${q.responden?.ageRange || '-'}</span>
                                    <span><i class="fas fa-venus-mars"></i> ${q.responden?.gender || '-'}</span>
                                    <span><i class="fas fa-briefcase"></i> ${q.responden?.background || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Score Cards -->
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px;">
                        <div style="background: white; border: 2px solid #10b981; border-radius: 12px; padding: 20px; text-align: center;">
                            <div style="font-size: 0.75rem; font-weight: 600; color: var(--admin-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">SUS Score</div>
                            <div style="font-size: 2.5rem; font-weight: 800; color: ${this.getSUSColor(q.sus?.totalScore)}; margin-bottom: 4px;">
                                ${q.sus?.totalScore || '-'}
                            </div>
                            <div style="font-size: 0.875rem; color: var(--admin-text-secondary);">
                                ${this.getSUSGrade(q.sus?.totalScore)}
                            </div>
                        </div>

                        <div style="background: white; border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; text-align: center;">
                            <div style="font-size: 0.75rem; font-weight: 600; color: var(--admin-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">TAM Score</div>
                            <div style="font-size: 2.5rem; font-weight: 800; color: #3b82f6; margin-bottom: 4px;">
                                ${q.tam?.overallAvg?.toFixed(2) || '-'}
                            </div>
                            <div style="font-size: 0.875rem; color: var(--admin-text-secondary);">
                                Overall Average
                            </div>
                        </div>

                        <div style="background: white; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; text-align: center;">
                            <div style="font-size: 0.75rem; font-weight: 600; color: var(--admin-text-secondary); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">NPS Score</div>
                            <div style="font-size: 2.5rem; font-weight: 800; color: #f59e0b; margin-bottom: 4px;">
                                ${q.nps?.score || '-'}
                            </div>
                            <div style="font-size: 0.875rem; color: var(--admin-text-secondary);">
                                ${q.nps?.category || '-'}
                            </div>
                        </div>
                    </div>

                    <!-- Open-Ended Responses -->
                    <div>
                        <h3 style="font-size: 1.125rem; font-weight: 700; color: var(--admin-text-primary); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-comments"></i>
                            Open-Ended Responses
                        </h3>

                        <div style="space-y: 16px;">
                            ${this.renderOpenEndedResponse('Fitur yang paling disukai', q.openEnded?.liked)}
                            ${this.renderOpenEndedResponse('Fitur yang membingungkan', q.openEnded?.confusing)}
                            ${this.renderOpenEndedResponse('Fitur yang diharapkan', q.openEnded?.missing)}
                            ${this.renderOpenEndedResponse('Pendapat tentang smartwatch', q.openEnded?.smartwatch)}
                            ${this.renderOpenEndedResponse('Saran dan masukan', q.openEnded?.suggestion)}
                        </div>
                    </div>
                </div>

                <div class="admin-modal-footer">
                    <button class="admin-btn admin-btn-secondary" onclick="this.closest('.admin-modal-overlay').remove()">
                        Close
                    </button>
                    <button class="admin-btn admin-btn-primary" onclick="AdminUI.exportSingleResponse('${q.id}')">
                        <i class="fas fa-download"></i>
                        Export Response
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    },

    /**
     * Render Open-Ended Response
     */
    renderOpenEndedResponse(question, answer) {
        if (!answer || answer.trim() === '') {
            return `
                <div style="margin-bottom: 20px;">
                    <div style="font-weight: 600; color: var(--admin-text-secondary); margin-bottom: 8px; font-size: 0.875rem;">
                        ${question}
                    </div>
                    <div style="padding: 16px; background: #f8fafc; border-radius: 8px; color: var(--admin-text-tertiary); font-style: italic;">
                        No response provided
                    </div>
                </div>
            `;
        }

        return `
            <div style="margin-bottom: 20px;">
                <div style="font-weight: 600; color: var(--admin-text-secondary); margin-bottom: 8px; font-size: 0.875rem;">
                    ${question}
                </div>
                <div style="padding: 16px; background: white; border: 1px solid var(--admin-border); border-radius: 8px; color: var(--admin-text-primary); line-height: 1.6;">
                    ${answer}
                </div>
            </div>
        `;
    },

    /**
     * Export Single Response
     */
    async exportSingleResponse(questionnaireId) {
        const questionnaires = await AdminManager.loadQuestionnaires();
        const q = questionnaires.find(item => item.id === questionnaireId);

        if (!q) {
            this.showError('Response not found');
            return;
        }

        const data = {
            respondent: q.responden,
            scores: {
                sus: q.sus?.totalScore,
                tam: q.tam?.overallAvg,
                nps: q.nps?.score
            },
            openEnded: q.openEnded,
            submittedAt: q.submittedAt
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `response_${q.responden?.name || 'anonymous'}_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);

        this.showSuccess('Response exported successfully!');
    },

    /**
     * Show Questionnaire Statistics
     */
    async showQuestionnaireStats() {
        const modal = document.getElementById('detailModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');

        modalTitle.textContent = 'Questionnaire Statistics';
        modalBody.innerHTML = '<div class="loading"><div class="loading-spinner"></div><p>Calculating statistics...</p></div>';
        modal.classList.add('active');

        try {
            const stats = await AdminManager.getQuestionnaireStats();

            modalBody.innerHTML = `
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Total Responses</label>
                        <p style="font-size: 2rem; font-weight: 800;">${stats.total}</p>
                    </div>
                    <div class="detail-item">
                        <label>Average SUS Score</label>
                        <p style="font-size: 2rem; font-weight: 800; color: ${this.getSUSColor(stats.avgSUS)};">${stats.avgSUS}</p>
                    </div>
                    <div class="detail-item">
                        <label>Average TAM</label>
                        <p style="font-size: 2rem; font-weight: 800;">${stats.avgTAM}</p>
                    </div>
                    <div class="detail-item">
                        <label>Average UEQ</label>
                        <p style="font-size: 2rem; font-weight: 800;">${stats.avgUEQ}</p>
                    </div>
                </div>

                <h3 class="section-title">NPS Breakdown</h3>
                <div class="detail-grid">
                    <div class="detail-item" style="background: rgba(16, 185, 129, 0.1);">
                        <label>Promoters (9-10)</label>
                        <p style="font-size: 1.5rem; font-weight: 800; color: #10b981;">${stats.npsBreakdown.promoters}</p>
                    </div>
                    <div class="detail-item" style="background: rgba(245, 158, 11, 0.1);">
                        <label>Passives (7-8)</label>
                        <p style="font-size: 1.5rem; font-weight: 800; color: #f59e0b;">${stats.npsBreakdown.passives}</p>
                    </div>
                    <div class="detail-item" style="background: rgba(239, 68, 68, 0.1);">
                        <label>Detractors (0-6)</label>
                        <p style="font-size: 1.5rem; font-weight: 800; color: #ef4444;">${stats.npsBreakdown.detractors}</p>
                    </div>
                    <div class="detail-item" style="background: linear-gradient(135deg, #DDD6FE, #8B5CF6);">
                        <label style="color: white;">Net Promoter Score</label>
                        <p style="font-size: 1.5rem; font-weight: 800; color: white;">${stats.npsScore}</p>
                    </div>
                </div>
            `;
        } catch (e) {
            modalBody.innerHTML = `
                <div style="text-align: center; color: var(--error);">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to calculate statistics: ${e.message}</p>
                </div>
            `;
        }
    },

    /**
     * Export Questionnaires
     */
    async exportQuestionnaires() {
        try {
            await AdminManager.exportQuestionnairesToCSV();
            this.showSuccess('Questionnaires exported successfully');
        } catch (e) {
            this.showError('Failed to export questionnaires: ' + e.message);
        }
    },

    /**
     * Delete Questionnaire Confirm
     */
    deleteQuestionnaireConfirm(questionnaireId) {
        if (confirm('Are you sure you want to delete this questionnaire response?')) {
            this.deleteQuestionnaire(questionnaireId);
        }
    },

    /**
     * Delete Questionnaire
     */
    async deleteQuestionnaire(questionnaireId) {
        try {
            await AdminManager.deleteQuestionnaire(questionnaireId);
            this.showSuccess('Questionnaire deleted successfully');
            this.renderQuestionnairesTab();
        } catch (e) {
            this.showError('Failed to delete questionnaire: ' + e.message);
        }
    },

    /**
     * Search Questionnaires
     */
    searchQuestionnaires(query) {
        // Implement search functionality
        console.log('Searching questionnaires:', query);
    },

    /**
     * Search Users
     */
    searchUsers(query) {
        // Implement search functionality
        console.log('Searching users:', query);
    },

    /**
     * Export Users
     */
    async exportUsers() {
        // Implement export functionality
        this.showSuccess('Users export feature coming soon');
    },

    /**
     * Get SUS Score Color
     */
    getSUSColor(score) {
        if (!score) return '#64748b';
        if (score >= 85) return '#10b981'; // Excellent
        if (score >= 71) return '#3b82f6'; // Good
        if (score >= 51) return '#f59e0b'; // OK
        return '#ef4444'; // Poor
    },

    /**
     * Get NPS Badge Class
     */
    getNPSBadgeClass(score) {
        if (!score && score !== 0) return 'badge-info';
        if (score >= 9) return 'badge-success'; // Promoter
        if (score >= 7) return 'badge-warning'; // Passive
        return 'badge-error'; // Detractor
    },

    /**
     * Close Modal
     */
    closeModal() {
        const modal = document.getElementById('detailModal');
        if (modal) modal.classList.remove('active');
        const createModal = document.getElementById('createKeyModal');
        if (createModal) createModal.remove();
    },

    /**
     * Setup Event Listeners
     */
    setupEventListeners() {
        // Tab buttons already have onclick handlers
        // Close modal on outside click
        const modal = document.getElementById('detailModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        }
    },

    // =====================================================================
    // COMPETITION READINESS TAB
    // Evaluasi kesiapan SynaWatch untuk kompetisi Junior Category
    // Kriteria: Originality(20), Usefulness(30), Creativity(15),
    //           Prototype Readiness(15), Presentation(20)
    // =====================================================================

    renderCompetitionTab() {
        const content = document.getElementById('competitionTabContent') || document.getElementById('adminDashboardContent');
        if (!content) return;

        // ── Checklist Data ────────────────────────────────────────────────
        const criteria = [
            {
                id: 'originality',
                title: 'Originality of Innovation',
                maxScore: 20,
                color: '#8b5cf6',
                icon: 'fa-lightbulb',
                items: [
                    { id: 'o1', label: 'Produk unik vs smartwatch komersial (Apple/Fitbit)', done: true,  impact: 'HIGH' },
                    { id: 'o2', label: 'Algoritma stres multi-sensor (HR+SpO2+GSR+Suhu)', done: true,  impact: 'HIGH' },
                    { id: 'o3', label: 'Framework HEROIC (psikologi positif lokal)', done: true,  impact: 'HIGH' },
                    { id: 'o4', label: 'Explainable AI (XAI) pada setiap intervensi', done: true,  impact: 'HIGH' },
                    { id: 'o5', label: 'Closed-loop JITAI (sensor → intervensi otomatis)', done: true,  impact: 'HIGH' },
                    { id: 'o6', label: 'Dokumentasi keunikan vs produk sejenis (comparison table)', done: false, impact: 'MEDIUM', action: 'Buat slide/doc perbandingan SynaWatch vs Apple Watch vs Fitbit vs Headspace' },
                    { id: 'o7', label: 'Inovasi dual-source sleep tracking (watch + phone IMU)', done: true,  impact: 'MEDIUM' },
                ],
                estimatedScore: 16
            },
            {
                id: 'market',
                title: 'Usefulness — Market Potential',
                maxScore: 15,
                color: '#10b981',
                icon: 'fa-chart-pie',
                items: [
                    { id: 'm1', label: 'Target user terdefinisi jelas (young professional, mahasiswa, klinisi)', done: true,  impact: 'HIGH' },
                    { id: 'm2', label: 'Analisis pasar Indonesia (273M penduduk, 15-20M depresif)', done: true,  impact: 'HIGH' },
                    { id: 'm3', label: 'Manfaat konkret terdokumentasi (musik terapi, yoga, JITAI)', done: true,  impact: 'HIGH' },
                    { id: 'm4', label: 'Survei calon pengguna (minimal 10 responden)', done: false, impact: 'HIGH',   action: 'Lakukan survei Google Form: masalah kesehatan mental, kebutuhan fitur, willingness to pay' },
                    { id: 'm5', label: 'Bukti testimonial / feedback awal dari pengguna beta', done: false, impact: 'HIGH',   action: 'Kumpulkan 5-10 testimonial dari teman/keluarga yang mencoba SynaWatch' },
                    { id: 'm6', label: 'Model bisnis freemium dijelaskan', done: true,  impact: 'MEDIUM' },
                    { id: 'm7', label: 'Potensi kolaborasi dengan klinik/psikolog disebutkan', done: false, impact: 'MEDIUM', action: 'Tambahkan rencana kemitraan dengan puskesmas / psikolog ke deck presentasi' },
                ],
                estimatedScore: 9
            },
            {
                id: 'collab',
                title: 'Usefulness — Industry Collaboration',
                maxScore: 15,
                color: '#3b82f6',
                icon: 'fa-handshake',
                items: [
                    { id: 'c1', label: 'Identifikasi mitra industri potensial', done: false, impact: 'HIGH',   action: 'Hubungi: Halodoc, Alodokter, K24, atau psikolog kampus untuk kolaborasi' },
                    { id: 'c2', label: 'Surat / bukti komunikasi dengan mitra', done: false, impact: 'HIGH',   action: 'Kirim email resmi ke minimal 1 organisasi. Simpan screenshotnya sebagai bukti.' },
                    { id: 'c3', label: 'Foto kegiatan kolaborasi (jika ada)', done: false, impact: 'HIGH',   action: 'Wajib untuk "agency collaboration" — foto meeting, diskusi, atau demo ke mitra' },
                    { id: 'c4', label: 'Input dari diskusi mitra untuk improvement produk', done: false, impact: 'MEDIUM', action: 'Dokumentasikan saran dari mitra dan tunjukkan bagaimana diimplementasikan' },
                    { id: 'c5', label: 'Konsultasi dengan psikolog / dokter', done: false, impact: 'MEDIUM', action: 'Minta review algoritma stres/intervensi dari profesional kesehatan mental' },
                ],
                estimatedScore: 3
            },
            {
                id: 'creativity',
                title: 'Creativity — Scientific & Technological Principles',
                maxScore: 15,
                color: '#f59e0b',
                icon: 'fa-flask',
                items: [
                    { id: 'cr1', label: 'Prinsip ilmiah: RMSSD HRV (Task Force 1996)', done: true,  impact: 'HIGH' },
                    { id: 'cr2', label: 'Prinsip ilmiah: Weighted stress score (GSR/HR/Temp/SpO2)', done: true,  impact: 'HIGH' },
                    { id: 'cr3', label: 'Prinsip ilmiah: JITAI (Nahum-Shani 2018)', done: true,  impact: 'HIGH' },
                    { id: 'cr4', label: 'Prinsip ilmiah: Music therapy BPM (Leubner 2020)', done: true,  impact: 'MEDIUM' },
                    { id: 'cr5', label: 'Laporan eksperimen ilmiah (scientific experiment report)', done: false, impact: 'HIGH',   action: 'WAJIB untuk math/science: buat dokumen validasi algoritma stres. Tunjukkan grafik akurasi prediksi vs ground truth dari 10-20 session.' },
                    { id: 'cr6', label: 'Referensi jurnal ilmiah terdaftar di presentasi', done: false, impact: 'MEDIUM', action: 'Cantumkan minimal 5 referensi jurnal di slide presentasi atau poster' },
                    { id: 'cr7', label: 'Grafik akurasi SynaScore vs user-reported ground truth', done: false, impact: 'HIGH',   action: 'Gunakan data ground-truth.js yang sudah ada → buat visualisasi chart di admin/laporan' },
                ],
                estimatedScore: 10
            },
            {
                id: 'prototype',
                title: 'Prototype Readiness',
                maxScore: 15,
                color: '#ef4444',
                icon: 'fa-microchip',
                items: [
                    { id: 'p1', label: 'PWA aplikasi berjalan di browser/mobile', done: true,  impact: 'HIGH' },
                    { id: 'p2', label: 'Koneksi BLE smartwatch ESP32 berfungsi', done: true,  impact: 'HIGH' },
                    { id: 'p3', label: 'Sensor HR/SpO2/GSR/IMU terkirim ke app', done: true,  impact: 'HIGH' },
                    { id: 'p4', label: 'Kalkulasi stres real-time bekerja', done: true,  impact: 'HIGH' },
                    { id: 'p5', label: 'Intervensi otomatis trigger saat stres tinggi', done: true,  impact: 'HIGH' },
                    { id: 'p6', label: 'Sleep tracking (dual IMU) berjalan', done: true,  impact: 'MEDIUM' },
                    { id: 'p7', label: 'Smartwatch fisik tersedia untuk demo', done: false, impact: 'HIGH',   action: 'Pastikan unit ESP32 dirakit, charged, dan bisa di-pair saat demo. Bawa spare unit cadangan.' },
                    { id: 'p8', label: 'Video demo produk (1-3 menit)', done: false, impact: 'HIGH',   action: 'Rekam video: pakai smartwatch → buka app → lihat data stres → intervensi otomatis → lihat hasil' },
                    { id: 'p9', label: 'Dapat proceed ke next level (fitur roadmap jelas)', done: false, impact: 'MEDIUM', action: 'Buat roadmap 6-12 bulan: clinical study → HEROIC full → therapist platform → launch' },
                ],
                estimatedScore: 11
            },
            {
                id: 'presentation',
                title: 'Presentation & Demonstration',
                maxScore: 20,
                color: '#6366f1',
                icon: 'fa-presentation-screen',
                items: [
                    { id: 'pr1', label: 'Penjelasan produk jelas dan terstruktur', done: false, impact: 'HIGH',   action: 'Buat deck: Problem → Solution → How it Works → Algorithm → Demo → Market → Roadmap' },
                    { id: 'pr2', label: 'Objek/produk terlihat jelas (poster / prototype fisik)', done: false, impact: 'HIGH',   action: 'Siapkan poster A1 dengan: diagram sistem, screenshot UI, foto hardware, grafik hasil' },
                    { id: 'pr3', label: 'Presentasi menunjukkan kerja tim', done: false, impact: 'MEDIUM', action: 'Jelaskan siapa yang mengerjakan apa: hardware, software, research, design' },
                    { id: 'pr4', label: 'Pengetahuan ilmiah ditunjukkan (bisa jawab pertanyaan juri)', done: false, impact: 'HIGH',   action: 'Latih penjelasan: cara kerja algoritma stres, mengapa GSR paling sensitif, referensi jurnal' },
                    { id: 'pr5', label: 'Demo langsung saat presentasi', done: false, impact: 'HIGH',   action: 'Demo live: kenakan smartwatch, buka app di laptop/HP, tunjukkan data real-time, trigger intervensi' },
                    { id: 'pr6', label: 'Slide / poster dengan grafik data hasil pengujian', done: false, impact: 'HIGH',   action: 'Tampilkan: chart stres 7 hari, grafik akurasi ground truth, distribusi sleep quality' },
                ],
                estimatedScore: 8
            }
        ];

        // ── Calculate totals ──────────────────────────────────────────────
        let totalEstimated = 0;
        let totalMax = 0;
        let totalDone = 0;
        let totalItems = 0;
        criteria.forEach(c => {
            totalEstimated += c.estimatedScore;
            totalMax += c.maxScore;
            c.items.forEach(i => { totalItems++; if (i.done) totalDone++; });
        });
        const overallPct = Math.round((totalEstimated / totalMax) * 100);
        const checklistPct = Math.round((totalDone / totalItems) * 100);

        // ── Priority Actions (not done, HIGH impact) ──────────────────────
        const priorityActions = [];
        criteria.forEach(c => {
            c.items.filter(i => !i.done && i.impact === 'HIGH').forEach(i => {
                priorityActions.push({ criterion: c.title, label: i.label, action: i.action, color: c.color, icon: c.icon });
            });
        });

        // ── Render ────────────────────────────────────────────────────────
        content.innerHTML = `
        <div style="padding:0 0 40px;">

            <!-- Header -->
            <div style="margin-bottom:24px;">
                <h2 style="font-size:1.5rem;font-weight:800;color:var(--admin-text-primary);margin-bottom:4px;">
                    <i class="fas fa-trophy" style="color:#f59e0b;margin-right:8px;"></i>
                    Kesiapan Kompetisi — Junior Category
                </h2>
                <p style="color:var(--admin-text-secondary);font-size:0.88rem;">
                    Evaluasi berdasarkan 5 kriteria penilaian juri. Selesaikan semua action item untuk memaksimalkan skor.
                </p>
            </div>

            <!-- Overall Score Card -->
            <div class="admin-stat-card" style="margin-bottom:24px;padding:24px;background:linear-gradient(135deg,#1e1b4b,#312e81);color:white;border-radius:16px;">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;">
                    <div>
                        <div style="font-size:0.8rem;opacity:0.8;margin-bottom:4px;font-weight:600;letter-spacing:1px;">ESTIMASI SKOR SAAT INI</div>
                        <div style="font-size:3rem;font-weight:900;line-height:1;">${totalEstimated}<span style="font-size:1.5rem;opacity:0.7;">/${totalMax}</span></div>
                        <div style="margin-top:8px;font-size:0.85rem;opacity:0.8;">Selesaikan semua action item untuk mencapai ~85/100</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:0.8rem;opacity:0.8;margin-bottom:8px;font-weight:600;">CHECKLIST PROGRESS</div>
                        <div style="font-size:2rem;font-weight:700;">${totalDone}/${totalItems}</div>
                        <div style="font-size:0.8rem;opacity:0.7;">item selesai (${checklistPct}%)</div>
                        <div style="margin-top:10px;height:8px;background:rgba(255,255,255,0.2);border-radius:4px;width:160px;">
                            <div style="height:100%;width:${checklistPct}%;background:#10b981;border-radius:4px;transition:width 0.8s;"></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Score bars per criteria -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-bottom:24px;">
                ${criteria.map(c => {
                    const pct = Math.round((c.estimatedScore / c.maxScore) * 100);
                    const donePct = Math.round((c.items.filter(i=>i.done).length / c.items.length) * 100);
                    return `
                    <div class="admin-stat-card" style="padding:16px;border-left:3px solid ${c.color};">
                        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                            <i class="fas ${c.icon}" style="color:${c.color};width:16px;"></i>
                            <span style="font-size:0.82rem;font-weight:700;color:var(--admin-text-primary);">${c.title}</span>
                        </div>
                        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:6px;">
                            <span style="font-size:1.5rem;font-weight:800;color:${c.color};">${c.estimatedScore}</span>
                            <span style="font-size:0.75rem;color:var(--admin-text-secondary);">dari ${c.maxScore} (${pct}%)</span>
                        </div>
                        <div style="height:6px;background:var(--admin-bg-secondary,#f1f5f9);border-radius:3px;margin-bottom:6px;">
                            <div style="height:100%;width:${pct}%;background:${c.color};border-radius:3px;"></div>
                        </div>
                        <div style="font-size:0.72rem;color:var(--admin-text-secondary);">
                            ${c.items.filter(i=>i.done).length}/${c.items.length} checklist (${donePct}%)
                        </div>
                    </div>`;
                }).join('')}
            </div>

            <!-- Priority Action Items -->
            <div style="margin-bottom:24px;">
                <h3 style="font-size:1rem;font-weight:700;color:var(--admin-text-primary);margin-bottom:12px;">
                    <i class="fas fa-exclamation-triangle" style="color:#f59e0b;margin-right:6px;"></i>
                    Priority Actions — Dampak Tinggi Belum Dikerjakan (${priorityActions.length} item)
                </h3>
                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${priorityActions.map((a, idx) => `
                    <div style="background:var(--admin-bg-card,white);border-radius:12px;padding:14px 16px;border-left:3px solid ${a.color};box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                        <div style="display:flex;align-items:flex-start;gap:10px;">
                            <div style="width:24px;height:24px;background:${a.color}15;border-radius:6px;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;">
                                <span style="font-size:0.7rem;font-weight:800;color:${a.color};">${idx+1}</span>
                            </div>
                            <div style="flex:1;">
                                <div style="font-size:0.72rem;color:${a.color};font-weight:600;margin-bottom:2px;">
                                    <i class="fas ${a.icon}"></i> ${a.criterion}
                                </div>
                                <div style="font-size:0.85rem;font-weight:600;color:var(--admin-text-primary);margin-bottom:4px;">${a.label}</div>
                                <div style="font-size:0.78rem;color:var(--admin-text-secondary);">${a.action}</div>
                            </div>
                            <span style="background:#ef444415;color:#ef4444;padding:2px 8px;border-radius:8px;font-size:0.65rem;font-weight:700;flex-shrink:0;">HIGH</span>
                        </div>
                    </div>`).join('')}
                </div>
            </div>

            <!-- Detailed Checklist per Criteria -->
            ${criteria.map(c => `
            <div style="margin-bottom:20px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                    <h3 style="font-size:0.95rem;font-weight:700;color:var(--admin-text-primary);margin:0;">
                        <i class="fas ${c.icon}" style="color:${c.color};margin-right:6px;"></i>
                        ${c.title}
                    </h3>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:0.75rem;color:var(--admin-text-secondary);">${c.items.filter(i=>i.done).length}/${c.items.length} done</span>
                        <span style="background:${c.color};color:white;padding:2px 10px;border-radius:10px;font-size:0.75rem;font-weight:700;">${c.estimatedScore}/${c.maxScore}</span>
                    </div>
                </div>
                <div style="background:var(--admin-bg-card,white);border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                    ${c.items.map((item, i) => `
                    <div style="display:flex;align-items:flex-start;gap:12px;padding:12px 16px;${i < c.items.length-1 ? 'border-bottom:1px solid var(--admin-border,#e5e7eb);' : ''}">
                        <div style="width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;
                             background:${item.done ? '#10b981' : 'var(--admin-bg-secondary,#f1f5f9)'};
                             border:${item.done ? 'none' : '2px dashed var(--admin-border,#d1d5db)'};">
                            ${item.done ? '<i class="fas fa-check" style="font-size:0.6rem;color:white;"></i>' : ''}
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-size:0.85rem;font-weight:600;color:${item.done ? 'var(--admin-text-secondary)' : 'var(--admin-text-primary)'};
                                 text-decoration:${item.done ? 'line-through' : 'none'};margin-bottom:${item.done ? '0' : '3px'};">
                                ${item.label}
                            </div>
                            ${!item.done && item.action ? `<div style="font-size:0.76rem;color:var(--admin-text-secondary);line-height:1.4;">→ ${item.action}</div>` : ''}
                        </div>
                        <span style="padding:2px 8px;border-radius:8px;font-size:0.65rem;font-weight:700;flex-shrink:0;
                             background:${item.impact==='HIGH'?'#ef444415':item.impact==='MEDIUM'?'#f59e0b15':'#6366f115'};
                             color:${item.impact==='HIGH'?'#ef4444':item.impact==='MEDIUM'?'#f59e0b':'#6366f1'};">
                            ${item.impact}
                        </span>
                    </div>`).join('')}
                </div>
            </div>`).join('')}

            <!-- Scientific Experiment Report Section -->
            <div style="margin-bottom:20px;" id="sciExpReportSection">
                <h3 style="font-size:0.95rem;font-weight:700;color:var(--admin-text-primary);margin-bottom:10px;">
                    <i class="fas fa-flask" style="color:#f59e0b;margin-right:6px;"></i>
                    Scientific Experiment Report — Validasi Akurasi Algoritma
                    <span style="background:#ef444415;color:#ef4444;padding:2px 8px;border-radius:8px;font-size:0.65rem;font-weight:700;margin-left:8px;">WAJIB</span>
                </h3>
                <div id="sciExpReportContent">
                    <div style="text-align:center;padding:30px;color:var(--admin-text-secondary);">
                        <i class="fas fa-spinner fa-spin" style="font-size:1.5rem;margin-bottom:8px;"></i>
                        <div>Memuat data ground truth...</div>
                    </div>
                </div>
            </div>

            <!-- Benefactor Survey Section -->
            <div style="margin-bottom:20px;" id="benefactorSection">
                <h3 style="font-size:0.95rem;font-weight:700;color:var(--admin-text-primary);margin-bottom:10px;">
                    <i class="fas fa-users" style="color:#10b981;margin-right:6px;"></i>
                    Survei Pengguna & Bukti Kolaborasi
                    <span style="background:#f59e0b15;color:#f59e0b;padding:2px 8px;border-radius:8px;font-size:0.65rem;font-weight:700;margin-left:8px;">DIPERLUKAN</span>
                </h3>
                <div style="background:var(--admin-bg-card,white);border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                    <!-- Survey links and collaboration evidence upload -->
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                        <div style="background:#f0fdf4;border-radius:10px;padding:14px;border:1px solid #86efac;">
                            <div style="font-size:0.8rem;font-weight:700;color:#15803d;margin-bottom:6px;">
                                <i class="fas fa-poll"></i> Survei Pengguna
                            </div>
                            <div style="font-size:0.75rem;color:#166534;line-height:1.5;margin-bottom:10px;">
                                Buat Google Form dengan pertanyaan:<br>
                                • Seberapa sering kamu merasa stres?<br>
                                • Fitur apa yang kamu butuhkan?<br>
                                • Apakah kamu mau pakai SynaWatch?
                            </div>
                            <button onclick="AdminUI.openSurveyGuide()" style="width:100%;padding:8px;background:#10b981;color:white;border:none;border-radius:8px;font-size:0.78rem;font-weight:600;cursor:pointer;">
                                <i class="fas fa-external-link-alt"></i> Panduan Buat Survei
                            </button>
                        </div>
                        <div style="background:#eff6ff;border-radius:10px;padding:14px;border:1px solid #93c5fd;">
                            <div style="font-size:0.8rem;font-weight:700;color:#1e40af;margin-bottom:6px;">
                                <i class="fas fa-handshake"></i> Kolaborasi Industri
                            </div>
                            <div style="font-size:0.75rem;color:#1e3a8a;line-height:1.5;margin-bottom:10px;">
                                Hubungi salah satu:<br>
                                • Psikolog kampus<br>
                                • Klinik kesehatan mental<br>
                                • Halodoc / Alodokter (email partnership)
                            </div>
                            <button onclick="AdminUI.openCollabGuide()" style="width:100%;padding:8px;background:#3b82f6;color:white;border:none;border-radius:8px;font-size:0.78rem;font-weight:600;cursor:pointer;">
                                <i class="fas fa-envelope"></i> Template Email Kolaborasi
                            </button>
                        </div>
                    </div>
                    <!-- Collaboration evidence input -->
                    <div style="border-top:1px solid var(--admin-border,#e5e7eb);padding-top:14px;">
                        <div style="font-size:0.8rem;font-weight:700;color:var(--admin-text-primary);margin-bottom:8px;">Catat Bukti Kolaborasi</div>
                        <div style="display:flex;flex-direction:column;gap:8px;">
                            <input id="collabOrgInput" type="text" placeholder="Nama organisasi/mitra..."
                                   style="width:100%;padding:8px 12px;border:1px solid var(--admin-border,#e5e7eb);border-radius:8px;font-size:0.82rem;box-sizing:border-box;">
                            <input id="collabDescInput" type="text" placeholder="Deskripsi kolaborasi (misal: konsultasi algoritma stres)..."
                                   style="width:100%;padding:8px 12px;border:1px solid var(--admin-border,#e5e7eb);border-radius:8px;font-size:0.82rem;box-sizing:border-box;">
                            <button onclick="AdminUI.saveCollabEvidence()"
                                    style="padding:8px 16px;background:#6366f1;color:white;border:none;border-radius:8px;font-size:0.82rem;font-weight:600;cursor:pointer;align-self:flex-start;">
                                <i class="fas fa-save"></i> Simpan Bukti
                            </button>
                        </div>
                        <div id="collabEvidenceList" style="margin-top:12px;"></div>
                    </div>
                </div>
            </div>

            <!-- Additional Notes -->
            <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1px solid #86efac;border-radius:12px;padding:16px;">
                <h4 style="font-size:0.9rem;font-weight:700;color:#15803d;margin-bottom:8px;">
                    <i class="fas fa-info-circle"></i> Catatan Penting untuk Juri
                </h4>
                <ul style="font-size:0.82rem;color:#166534;line-height:1.8;margin:0;padding-left:16px;">
                    <li><strong>Scientific Experiment Report</strong> WAJIB jika kategori math/science — data akurasi ground truth sudah dikumpulkan otomatis dari pengguna</li>
                    <li><strong>Foto kegiatan kolaborasi</strong> diperlukan untuk full credit di kriteria Industry Collaboration</li>
                    <li><strong>Survei pengguna</strong> minimal 10 responden untuk membuktikan market potential</li>
                    <li>Demo langsung lebih berkesan dari slide — pastikan hardware berfungsi saat presentasi</li>
                    <li>Jawab pertanyaan juri: <em>"Mengapa GSR bobotnya 35%?"</em> → GSR paling sensitif terhadap aktivasi sistem saraf simpatetis (Nkurikiyeyezu 2019)</li>
                    <li>Jawab: <em>"Bagaimana adaptive threshold bekerja?"</em> → personal mean + 1.5 SD dari 50 reading terakhir (Nahum-Shani 2018)</li>
                </ul>
            </div>

        </div>`;

        // Load ground truth data asynchronously
        this.loadGroundTruthReport();
        this.loadCollabEvidence();
    },

    async loadGroundTruthReport() {
        const el = document.getElementById('sciExpReportContent');
        if (!el) return;

        try {
            // Try to get ground truth data from Firestore (all users aggregate)
            let records = [];
            if (typeof db !== 'undefined') {
                const snap = await db.collectionGroup('groundTruth')
                    .orderBy('timestamp', 'desc')
                    .limit(200)
                    .get()
                    .catch(() => null);

                if (snap && !snap.empty) {
                    records = snap.docs.map(d => d.data());
                }
            }

            const components = [
                { key: 'synaScoreError', label: 'SynaScore Accuracy', color: '#8b5cf6', scale: 100 },
                { key: 'stressError',    label: 'Stress Detection Accuracy', color: '#ef4444', scale: 100 },
                { key: 'sleepError',     label: 'Sleep Quality Accuracy', color: '#3b82f6', scale: 100 }
            ];

            const stats = components.map(c => {
                const vals = records.filter(r => r[c.key] !== undefined).map(r => r[c.key]);
                if (vals.length === 0) return { ...c, accuracy: null, n: 0, avgError: null };
                const avgError = vals.reduce((s, v) => s + v, 0) / vals.length;
                const accuracy = Math.round(Math.max(0, 100 - (avgError / c.scale) * 100));
                return { ...c, accuracy, n: vals.length, avgError: Math.round(avgError * 10) / 10 };
            });

            // Crisis stats
            const crisisRecords = records.filter(r => r.crisisPredicted !== undefined);
            const tp = crisisRecords.filter(r => r.crisisPredicted && r.crisisActual).length;
            const fp = crisisRecords.filter(r => r.crisisPredicted && !r.crisisActual).length;
            const fn = crisisRecords.filter(r => !r.crisisPredicted && r.crisisActual).length;
            const precision = tp + fp > 0 ? Math.round((tp / (tp + fp)) * 100) : null;
            const recall = tp + fn > 0 ? Math.round((tp / (tp + fn)) * 100) : null;

            const hasData = records.length > 0;
            const overallAccuracy = stats.filter(s => s.accuracy !== null).length > 0
                ? Math.round(stats.filter(s=>s.accuracy!==null).reduce((s,c)=>s+c.accuracy,0) / stats.filter(s=>s.accuracy!==null).length)
                : null;

            el.innerHTML = `
                <div style="background:var(--admin-bg-card,white);border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
                    ${!hasData ? `
                    <div style="background:#fef3c7;border-radius:10px;padding:12px 16px;margin-bottom:16px;border:1px solid #fcd34d;">
                        <div style="font-size:0.82rem;color:#92400e;font-weight:600;margin-bottom:4px;">
                            <i class="fas fa-exclamation-triangle"></i> Belum Ada Data Ground Truth
                        </div>
                        <div style="font-size:0.78rem;color:#78350f;line-height:1.5;">
                            Data akurasi dikumpulkan otomatis saat pengguna merespons prompt validasi (setelah assessment, sleep tracking, atau crisis alert).
                            Minta beberapa pengguna beta untuk menggunakan aplikasi minimal 1-3 sesi agar data muncul di sini.
                        </div>
                    </div>` : ''}

                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px;">
                        ${stats.map(s => `
                        <div style="text-align:center;padding:16px;background:${s.color}08;border-radius:10px;border:1px solid ${s.color}20;">
                            <div style="font-size:0.75rem;font-weight:700;color:${s.color};margin-bottom:8px;">${s.label}</div>
                            <div style="font-size:2rem;font-weight:900;color:${s.accuracy !== null ? s.color : 'var(--admin-text-tertiary,#9ca3af)'};">
                                ${s.accuracy !== null ? s.accuracy + '%' : '--'}
                            </div>
                            <div style="font-size:0.7rem;color:var(--admin-text-secondary);margin-top:4px;">
                                ${s.n > 0 ? `n=${s.n} | avg error: ${s.avgError}` : 'Belum ada data'}
                            </div>
                            ${s.accuracy !== null ? `
                            <div style="margin-top:8px;height:6px;background:${s.color}20;border-radius:3px;">
                                <div style="height:100%;width:${s.accuracy}%;background:${s.color};border-radius:3px;"></div>
                            </div>` : ''}
                        </div>`).join('')}
                        <div style="text-align:center;padding:16px;background:#6366f108;border-radius:10px;border:1px solid #6366f120;">
                            <div style="font-size:0.75rem;font-weight:700;color:#6366f1;margin-bottom:8px;">Crisis Detection</div>
                            <div style="font-size:1.1rem;font-weight:700;color:${precision!==null?'#6366f1':'var(--admin-text-tertiary)'};">
                                ${precision!==null ? `P: ${precision}% | R: ${recall}%` : '--'}
                            </div>
                            <div style="font-size:0.7rem;color:var(--admin-text-secondary);margin-top:4px;">
                                ${crisisRecords.length > 0 ? `TP:${tp} FP:${fp} FN:${fn}` : 'Belum ada data'}
                            </div>
                        </div>
                    </div>

                    ${overallAccuracy !== null ? `
                    <div style="background:linear-gradient(135deg,#8b5cf615,#6366f115);border-radius:10px;padding:14px;text-align:center;">
                        <div style="font-size:0.8rem;color:#6366f1;font-weight:700;margin-bottom:4px;">OVERALL SYSTEM ACCURACY</div>
                        <div style="font-size:2.5rem;font-weight:900;color:#6366f1;">${overallAccuracy}%</div>
                        <div style="font-size:0.75rem;color:var(--admin-text-secondary);margin-top:4px;">
                            Berdasarkan ${records.length} ground truth records dari pengguna
                        </div>
                    </div>` : ''}

                    <div style="margin-top:14px;padding:12px;background:#eff6ff;border-radius:8px;font-size:0.78rem;color:#1e40af;line-height:1.5;">
                        <strong>Untuk laporan ilmiah:</strong> Data ini menunjukkan bahwa SynaWatch menggunakan <em>crowdsourced ground truth validation</em>
                        — pengguna sendiri melaporkan kondisi sebenarnya untuk divalidasi dengan prediksi sistem.
                        Formula: <code>accuracy = 100 - (|predicted - actual| / scale) × 100</code>
                    </div>
                </div>
            `;
        } catch (e) {
            el.innerHTML = `<div style="color:#ef4444;font-size:0.82rem;padding:12px;">Gagal memuat data: ${e.message}</div>`;
        }
    },

    async saveCollabEvidence() {
        const org  = document.getElementById('collabOrgInput')?.value?.trim();
        const desc = document.getElementById('collabDescInput')?.value?.trim();
        if (!org || !desc) { alert('Isi nama organisasi dan deskripsi.'); return; }

        const key = 'synawatch_collab_evidence';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.unshift({ org, desc, date: new Date().toLocaleDateString('id-ID'), id: Date.now() });
        localStorage.setItem(key, JSON.stringify(existing));

        document.getElementById('collabOrgInput').value = '';
        document.getElementById('collabDescInput').value = '';
        this.loadCollabEvidence();
    },

    loadCollabEvidence() {
        const el = document.getElementById('collabEvidenceList');
        if (!el) return;
        const key = 'synawatch_collab_evidence';
        const items = JSON.parse(localStorage.getItem(key) || '[]');
        if (items.length === 0) { el.innerHTML = '<p style="font-size:0.78rem;color:var(--admin-text-tertiary);">Belum ada bukti kolaborasi tercatat.</p>'; return; }
        el.innerHTML = items.map(i => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:var(--admin-bg-secondary,#f8fafc);border-radius:8px;margin-bottom:6px;">
                <i class="fas fa-handshake" style="color:#3b82f6;"></i>
                <div style="flex:1;">
                    <div style="font-size:0.82rem;font-weight:600;color:var(--admin-text-primary);">${i.org}</div>
                    <div style="font-size:0.75rem;color:var(--admin-text-secondary);">${i.desc} · ${i.date}</div>
                </div>
                <button onclick="AdminUI._deleteCollab(${i.id})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.75rem;">✕</button>
            </div>`).join('');
    },

    _deleteCollab(id) {
        const key = 'synawatch_collab_evidence';
        const items = JSON.parse(localStorage.getItem(key) || '[]').filter(i => i.id !== id);
        localStorage.setItem(key, JSON.stringify(items));
        this.loadCollabEvidence();
    },

    openSurveyGuide() {
        const html = `
            <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
                <div style="background:white;border-radius:16px;padding:24px;max-width:500px;width:100%;max-height:80vh;overflow-y:auto;">
                    <h3 style="margin-bottom:16px;font-size:1rem;font-weight:700;">📋 Panduan Survei Pengguna</h3>
                    <p style="font-size:0.82rem;color:#374151;margin-bottom:12px;">Buat Google Form dengan pertanyaan berikut (minimal 10 responden):</p>
                    <ol style="font-size:0.82rem;color:#374151;line-height:2;padding-left:16px;margin-bottom:16px;">
                        <li>Seberapa sering kamu merasa stres dalam seminggu terakhir? (1-5)</li>
                        <li>Apakah kamu pernah menggunakan aplikasi kesehatan mental?</li>
                        <li>Fitur apa yang paling kamu butuhkan? (stres monitoring, sleep tracking, yoga, musik)</li>
                        <li>Apakah kamu mau memakai smartwatch untuk pantau kesehatan mental?</li>
                        <li>Berapa harga yang wajar untuk berlangganan (per bulan)?</li>
                        <li>Setelah mencoba SynaWatch, seberapa puas? (1-10) — untuk pengguna beta</li>
                    </ol>
                    <div style="background:#f0fdf4;border-radius:8px;padding:12px;font-size:0.78rem;color:#166534;margin-bottom:16px;">
                        <strong>Tips:</strong> Bagikan ke grup WhatsApp / LINE kampus, teman kuliah, atau keluarga. Target minimal 20 responden untuk kredibilitas lebih tinggi.
                    </div>
                    <button onclick="this.closest('div[style*=\"position:fixed\"]').remove()" style="width:100%;padding:10px;background:#6366f1;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Tutup</button>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    openCollabGuide() {
        const html = `
            <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
                <div style="background:white;border-radius:16px;padding:24px;max-width:520px;width:100%;max-height:80vh;overflow-y:auto;">
                    <h3 style="margin-bottom:16px;font-size:1rem;font-weight:700;">📧 Template Email Kolaborasi Industri</h3>
                    <div style="background:#f8fafc;border-radius:8px;padding:16px;font-size:0.8rem;color:#374151;line-height:1.7;margin-bottom:16px;font-family:monospace;">
                        Yth. [Nama / Tim Klinik/Organisasi],<br><br>
                        Perkenalkan, kami adalah tim SynaWatch dari [Sekolah/Universitas]. Kami sedang mengembangkan aplikasi pemantauan kesehatan mental berbasis smartwatch yang menggabungkan sensor biometrik (detak jantung, GSR, suhu) dengan kecerdasan buatan.<br><br>
                        Kami ingin memohon masukan dan kolaborasi dari pihak [nama organisasi] untuk:<br>
                        1. Validasi pendekatan ilmiah yang kami gunakan<br>
                        2. Saran dari perspektif klinis/profesional<br>
                        3. Potensi pilot program bersama<br><br>
                        Apakah kami bisa menjadwalkan pertemuan singkat (15-30 menit) untuk berdiskusi?<br><br>
                        Terima kasih atas perhatiannya.<br><br>
                        Salam,<br>
                        Tim SynaWatch
                    </div>
                    <div style="background:#fef3c7;border-radius:8px;padding:12px;font-size:0.78rem;color:#92400e;margin-bottom:16px;">
                        <strong>Penting:</strong> Simpan screenshot reply email atau foto pertemuan sebagai bukti untuk juri. Ini diperlukan untuk mendapat nilai penuh di kriteria Industry Collaboration.
                    </div>
                    <button onclick="this.closest('div[style*=\"position:fixed\"]').remove()" style="width:100%;padding:10px;background:#3b82f6;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Tutup</button>
                </div>
            </div>`;
        document.body.insertAdjacentHTML('beforeend', html);
    },

    async renderNotulenTab() {
        const content = document.getElementById('notulenContent') || document.getElementById('adminDashboardContent');
        if (!content) return;
        content.innerHTML = '<div style="text-align:center;padding:40px;"><div class="loading-spinner" style="margin:0 auto 16px;"></div><p style="color:#64748b;">Memuat notulen...</p></div>';
        try {
            const snapshot = await db.collection('meetingNotes').orderBy('createdAt', 'desc').limit(50).get();
            if (snapshot.empty) {
                content.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#64748b;"><i class="fas fa-notes-medical" style="font-size:3rem;color:#cbd5e1;margin-bottom:16px;display:block;"></i><h4 style="color:#475569;margin-bottom:8px;">Belum ada notulen</h4><p>Klik "Tambah Notulen" untuk mencatat diskusi.</p></div>';
                return;
            }
            let html = '<div style="display:flex;flex-direction:column;gap:16px;padding:16px;">';
            const topikColors = { riset:'#6366f1', alat:'#0ea5e9', aplikasi:'#10b981', kuesioner:'#f59e0b', umum:'#64748b' };
            snapshot.forEach(doc => {
                const n = doc.data();
                const dt = n.tanggal ? new Date(n.tanggal).toLocaleString('id-ID',{dateStyle:'full',timeStyle:'short'}) : '—';
                const tc = topikColors[n.topik] || '#64748b';
                html += `<div style="background:white;border-radius:16px;padding:20px;box-shadow:0 2px 12px rgba(0,0,0,0.06);border-left:4px solid ${tc};">
                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
                        <div>
                            <span style="display:inline-block;background:${tc}20;color:${tc};padding:3px 10px;border-radius:99px;font-size:11px;font-weight:700;margin-bottom:6px;">${(n.topik||'umum').toUpperCase()}</span>
                            <div style="font-size:13px;color:#64748b;"><i class="fas fa-calendar-alt" style="margin-right:5px;"></i>${dt}</div>
                        </div>
                        <button onclick="AdminUI.deleteNotulen('${doc.id}')" style="background:#fee2e2;color:#ef4444;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:12px;"><i class="fas fa-trash"></i></button>
                    </div>
                    ${n.peserta ? `<div style="margin-bottom:10px;font-size:13px;color:#475569;"><strong style="color:#1e293b;">Peserta:</strong> ${n.peserta}</div>` : ''}
                    <div style="margin-bottom:10px;">
                        <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:6px;">Poin Diskusi:</div>
                        <div style="font-size:13px;color:#475569;white-space:pre-wrap;background:#f8fafc;padding:10px 14px;border-radius:8px;line-height:1.6;">${n.poin||'—'}</div>
                    </div>
                    ${n.actionItems ? `<div><div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:6px;">Tindak Lanjut:</div><div style="font-size:13px;color:#475569;white-space:pre-wrap;background:#f0fdf4;padding:10px 14px;border-radius:8px;line-height:1.6;">${n.actionItems}</div></div>` : ''}
                </div>`;
            });
            html += '</div>';
            content.innerHTML = html;
        } catch(err) {
            content.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444;">Error: ${err.message}<br><button onclick="AdminUI.renderNotulenTab()" style="margin-top:12px;padding:8px 16px;background:#6366f1;color:white;border:none;border-radius:8px;cursor:pointer;">Coba Lagi</button></div>`;
        }
    },

    showAddNotulenModal() {
        const modal = document.getElementById('notulenModal');
        if (modal) {
            const now = new Date();
            const localDT = new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,16);
            const dtInput = document.getElementById('notulen-datetime');
            if (dtInput) dtInput.value = localDT;
            modal.classList.add('active');
        }
    },

    async saveNotulen() {
        const datetime = document.getElementById('notulen-datetime')?.value;
        const peserta = document.getElementById('notulen-peserta')?.value.trim();
        const poin = document.getElementById('notulen-poin')?.value.trim();
        const action = document.getElementById('notulen-action')?.value.trim();
        const topik = document.getElementById('notulen-topik')?.value;
        if (!datetime || !peserta || !poin) {
            alert('Mohon isi Tanggal, Peserta, dan Poin Diskusi.');
            return;
        }
        try {
            await db.collection('meetingNotes').add({
                tanggal: datetime,
                peserta,
                poin,
                actionItems: action || '',
                topik: topik || 'umum',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: auth.currentUser?.email || 'admin'
            });
            document.getElementById('notulenModal')?.classList.remove('active');
            ['notulen-peserta','notulen-poin','notulen-action'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
            this.renderNotulenTab();
        } catch(err) {
            alert('Gagal menyimpan: ' + err.message);
        }
    },

    async deleteNotulen(docId) {
        if (!confirm('Hapus notulen ini?')) return;
        try {
            await db.collection('meetingNotes').doc(docId).delete();
            this.renderNotulenTab();
        } catch(err) {
            alert('Gagal hapus: ' + err.message);
        }
    },

    loadNotulen() { this.renderNotulenTab(); },

    async renderAlatDatasetTab() {
        const content = document.getElementById('alatDatasetContent') || document.getElementById('adminDashboardContent');
        if (!content) return;
        try {
            let devices = [];
            try {
                const snap = await db.collection('deviceInventory').get();
                if (!snap.empty) snap.forEach(doc => devices.push({id:doc.id,...doc.data()}));
            } catch(e) {}
            if (devices.length === 0) {
                devices = [
                    {id:'eeg1',kategori:'EEG',nama:'Muse-S Headband #1',brand:'InteraXon',status:'tersedia',catatan:'BT, 4ch EEG + PPG'},
                    {id:'eeg2',kategori:'EEG',nama:'Muse-S Headband #2',brand:'InteraXon',status:'tersedia',catatan:'Backup unit'},
                    {id:'eeg3',kategori:'EEG',nama:'Muse-S Headband #3',brand:'InteraXon',status:'maintenance',catatan:'Perlu kalibrasi'},
                    {id:'eda1',kategori:'EDA',nama:'SynaWatch Prototype #1',brand:'ScentraVN',status:'tersedia',catatan:'EDA + PPG + IMU'},
                    {id:'eda2',kategori:'EDA',nama:'SynaWatch Prototype #2',brand:'ScentraVN',status:'tersedia',catatan:'EDA + PPG + IMU'},
                    {id:'eda3',kategori:'EDA',nama:'SynaWatch Prototype #3',brand:'ScentraVN',status:'digunakan',catatan:'Dalam pengujian'},
                    {id:'ppg1',kategori:'PPG',nama:'Samsung Galaxy Watch #1',brand:'Samsung',status:'tersedia',catatan:'Ref: HR, HRV, SpO2'},
                    {id:'ppg2',kategori:'PPG',nama:'Samsung Galaxy Watch #2',brand:'Samsung',status:'tersedia',catatan:'Ref: HR, HRV'},
                ];
            }
            const statusColors = {tersedia:'#10b981',digunakan:'#f59e0b',maintenance:'#ef4444'};
            const katIcons = {EEG:'fa-brain',EDA:'fa-microchip',PPG:'fa-heart-pulse'};
            const katColors = {EEG:'#6366f1',EDA:'#0ea5e9',PPG:'#ec4899'};
            const grouped = devices.reduce((g,d)=>{ (g[d.kategori]=g[d.kategori]||[]).push(d); return g; },{});
            let html = `<div style="padding:20px;">
                <div style="background:linear-gradient(135deg,#1e293b,#334155);border-radius:20px;padding:24px;margin-bottom:24px;color:white;">
                    <h2 style="font-size:1.3rem;font-weight:800;margin-bottom:8px;"><i class="fas fa-microscope" style="margin-right:10px;color:#60a5fa;"></i>Rencana Pengambilan Dataset</h2>
                    <p style="color:rgba(255,255,255,0.7);font-size:0.88rem;margin-bottom:16px;">Protokol riset — EEG, EDA, PPG ground truth</p>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;">
                        <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:14px;text-align:center;"><div style="font-size:1.8rem;font-weight:800;color:#60a5fa;">50</div><div style="font-size:11px;color:rgba(255,255,255,0.6);">Target Partisipan</div></div>
                        <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:14px;text-align:center;"><div style="font-size:1.8rem;font-weight:800;color:#a78bfa;">3</div><div style="font-size:11px;color:rgba(255,255,255,0.6);">Alat EDA</div></div>
                        <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:14px;text-align:center;"><div style="font-size:1.8rem;font-weight:800;color:#67e8f9;">2–3</div><div style="font-size:11px;color:rgba(255,255,255,0.6);">Alat EEG</div></div>
                        <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:14px;text-align:center;"><div style="font-size:1.8rem;font-weight:800;color:#86efac;">25–30</div><div style="font-size:11px;color:rgba(255,255,255,0.6);">Menit/Sesi</div></div>
                    </div>
                    <div style="margin-top:14px;background:rgba(255,255,255,0.06);border-radius:10px;padding:12px 16px;font-size:12px;color:rgba(255,255,255,0.75);">
                        <strong style="color:white;">Protokol Sesi:</strong> Baseline/noise (2–5 mnt) → Relaksasi musik (15 mnt) → Recovery/noise (2–5 mnt)
                    </div>
                </div>`;
            ['EEG','EDA','PPG'].forEach(kat => {
                const items = grouped[kat] || [];
                const avail = items.filter(d=>d.status==='tersedia').length;
                html += `<div style="margin-bottom:20px;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
                        <div style="width:40px;height:40px;background:${katColors[kat]}20;border-radius:12px;display:flex;align-items:center;justify-content:center;color:${katColors[kat]};font-size:1.1rem;"><i class="fas ${katIcons[kat]}"></i></div>
                        <div><h3 style="font-size:1rem;font-weight:700;color:#1e293b;margin:0;">${kat}</h3><p style="font-size:12px;color:#64748b;margin:0;">${avail}/${items.length} tersedia</p></div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:8px;">`;
                items.forEach(d => {
                    const sc = statusColors[d.status]||'#64748b';
                    html += `<div style="background:white;border-radius:12px;padding:14px 16px;box-shadow:0 2px 8px rgba(0,0,0,0.06);display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                        <div style="flex:1;min-width:180px;">
                            <div style="font-size:14px;font-weight:700;color:#1e293b;">${d.nama}</div>
                            <div style="font-size:12px;color:#64748b;">${d.brand}${d.catatan?' — '+d.catatan:''}</div>
                        </div>
                        <select onchange="AdminUI.updateDeviceStatus('${d.id}',this.value)" style="padding:6px 10px;border:1.5px solid ${sc};border-radius:8px;font-size:12px;font-weight:700;color:${sc};background:${sc}15;cursor:pointer;outline:none;">
                            <option value="tersedia" ${d.status==='tersedia'?'selected':''}>✓ Tersedia</option>
                            <option value="digunakan" ${d.status==='digunakan'?'selected':''}>⚡ Digunakan</option>
                            <option value="maintenance" ${d.status==='maintenance'?'selected':''}>⚠ Maintenance</option>
                        </select>
                    </div>`;
                });
                html += '</div></div>';
            });
            html += '</div>';
            content.innerHTML = html;
        } catch(err) {
            content.innerHTML = `<div style="padding:40px;text-align:center;color:#ef4444;">Error: ${err.message}</div>`;
        }
    },

    async updateDeviceStatus(deviceId, newStatus) {
        try {
            await db.collection('deviceInventory').doc(deviceId).set({status:newStatus},{merge:true});
        } catch(err) {
            console.error('updateDeviceStatus error:', err);
        }
    }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminUI;
}
