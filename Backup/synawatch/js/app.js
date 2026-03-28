/**
 * SYNAWATCH - SPA Application
 * Main application entry point
 */

const App = {
    currentUser: null,
    initialized: false,

    /**
     * Initialize the application
     */
    async init() {
        if (this.initialized) return;

        console.log('Initializing SYNAWATCH SPA...');

        // Wait for Firebase auth
        await this.waitForAuth();

        // Setup router
        this.setupRouter();

        // Setup navigation
        this.setupNavigation();

        // Initialize BLE if available
        if (typeof BLEConnection !== 'undefined') {
            BLEConnection.onDataUpdate(this.handleBLEData.bind(this));
            BLEConnection.onConnectionChange(this.handleBLEConnection.bind(this));
        }

        // Update time
        this.updateTime();
        setInterval(() => this.updateTime(), 1000);

        this.initialized = true;
        console.log('SYNAWATCH SPA initialized');
    },

    /**
     * Wait for Firebase authentication
     */
    waitForAuth() {
        return new Promise((resolve) => {
            if (typeof auth === 'undefined') {
                resolve();
                return;
            }

            const unsubscribe = auth.onAuthStateChanged(async (user) => {
                this.currentUser = user;
                
                // Check onboarding status
                if (user && typeof db !== 'undefined') {
                    try {
                        const userDoc = await db.collection('users').doc(user.uid).get();
                        if (!userDoc.exists || !userDoc.data().onboardingCompleted) {
                            setTimeout(() => {
                                Router.navigate('assessment', true);
                            }, 100);
                        } else {
                            // Init Intervention Engine if onboarding is done
                            if (typeof InterventionEngine !== 'undefined') {
                                InterventionEngine.init(userDoc.data());
                            }
                            // Init HEROIC XAI Score Engine (depends on InterventionEngine)
                            if (typeof HeroicXAI !== 'undefined') {
                                HeroicXAI.init(userDoc.data());
                                console.log('✅ HeroicXAI initialized — overall score:', HeroicXAI.getOverallScore());
                            }
                        }
                    } catch (e) {
                        console.error('Failed to get user data:', e);
                    }
                }
                
                unsubscribe();
                resolve();
            });
        });
    },

    /**
     * Setup the router with all routes
     */
    setupRouter() {
        // Register routes
        Router.register('assessment', () => {
            Router.render(Views.assessment());
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'none'; // Hide nav during assessment
        });

        Router.register('dashboard', () => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'flex';
            Router.render(Views.dashboard());
            this.initDashboardView();
        });

        Router.register('health', () => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'flex';
            Router.render(Views.health());
            this.initHealthView();
        });

        Router.register('analytics', () => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'flex';
            Router.render(Views.analytics());
            this.initAnalyticsView();
        });

        Router.register('profile', () => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'flex';
            Router.render(Views.profile());
            this.initProfileView();
        });

        Router.register('edit-profile', () => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'flex';
            Router.render(Views['edit-profile']());
            loadEditProfileData();
        });

        Router.register('change-password', () => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'flex';
            Router.render(Views['change-password']());
        });

        Router.register('synachat', () => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'flex';
            Router.render(Views.synachat());
            this.initSynachatView();
        });

        Router.register('support', () => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'flex';
            Router.render(Views.support());
            if (typeof SupportHub !== 'undefined') SupportHub.initSupportHub();
        });

        Router.register('academy', () => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'flex';
            Router.render(Views.academy());
            if (typeof Academy !== 'undefined') Academy.initAcademy();
        });

        Router.register('sleep', () => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'flex';
            Router.render(Views.sleep());
            if (typeof SleepLab !== 'undefined') SleepLab.init();
        });

        Router.register('moodbooster', () => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'flex';
            Router.render(Views.moodbooster());
            if (typeof MoodBooster !== 'undefined') MoodBooster.init();
        });

        Router.register('mindful', () => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'flex';
            Router.render(Views.mindful());
            if (typeof Mindful !== 'undefined') Mindful.init();
        });

        Router.register('journal', () => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'flex';
            Router.render(Views.journal());
            if (typeof Journal !== 'undefined') Journal.init();
        });

        Router.register('research', () => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'flex';
            Router.render(Views.research());
            if (typeof ResearchFoundation !== 'undefined') ResearchFoundation.initResearch();
        });

        Router.register('admin', () => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'none'; // Hide nav for admin
            Router.render(Views.admin());
            if (typeof AdminUI !== 'undefined') AdminUI.init();
        });

        Router.register('games', () => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'flex';
            Router.render(Views.games());
            if (typeof GamesModule !== 'undefined') GamesModule.init();
            // Inject HEROIC games section below existing games (Sprint 4)
            if (typeof HeroicGames !== 'undefined') {
                setTimeout(() => HeroicGames.renderIntoGamesView(), 200);
            }
        });

        // Yoga routes
        Router.register('yoga', () => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'flex';
            Router.render(Views.yoga());
            if (typeof YogaModule !== 'undefined') YogaModule.init();
        });

        // ── HEROIC Program route ────────────────────────────────────────────────
        // Psikologi Positif 6-Dimensi: Humor, Efikasi, Religiusitas,
        // Optimisme, Interaksi Sosial, Belas Kasih Diri
        // Ref: Hidayati, Fanani & Mulyani (2023)
        Router.register('heroic', () => {
            const nav = document.querySelector('.bottom-nav');
            if (nav) nav.style.display = 'flex';
            // Views.heroic() is injected by heroic-program.js at load time
            if (typeof Views !== 'undefined' && typeof Views.heroic === 'function') {
                Router.render(Views.heroic());
            } else {
                Router.render(`<div class="view-container" style="padding:40px;text-align:center;">
                    <i class="fas fa-star" style="font-size:3rem;color:#6366f1;margin-bottom:16px;"></i>
                    <h2>HEROIC Program</h2><p>Memuat...</p></div>`);
            }
            if (typeof HeroicProgram !== 'undefined') {
                setTimeout(() => HeroicProgram.init(), 100);
            }
        });

        // Initialize router
        Router.init();

        // Intervention Engine is initialized via waitForAuth() → InterventionEngine.init()
    },

    /**
     * Get current user state for intervention engine
     */
    getInterventionState() {
        const state = {
            stress: 0, gsr: 0, hr: 0, spo2: 0, activity: 'resting',
            phq9Score: 0, phq9Category: 'Minimal',
            uclaScore: 20, uclaCategory: 'Low'
        };
        // Read latest sensor data from DOM
        const stressEl = document.getElementById('stressValue');
        if (stressEl) state.stress = parseInt(stressEl.textContent) || 0;
        const gsrEl = document.getElementById('gsrValue');
        if (gsrEl) state.gsr = parseInt(gsrEl.textContent) || 0;
        const hrEl = document.getElementById('hrValue');
        if (hrEl) state.hr = parseInt(hrEl.textContent) || 0;
        const spo2El = document.getElementById('spo2Value');
        if (spo2El) state.spo2 = parseInt(spo2El.textContent) || 0;
        // Read cached assessment from localStorage
        try {
            const cached = localStorage.getItem('synawatch_assessment');
            if (cached) {
                const a = JSON.parse(cached);
                state.phq9Score = a.phq9Score || 0;
                state.phq9Category = a.phq9Category || 'Minimal';
                state.uclaScore = a.uclaScore || 20;
                state.uclaCategory = a.uclaCategory || 'Low';
            }
        } catch (e) {}
        return state;
    },

    /**
     * Setup navigation with More menu
     */
    setupNavigation() {
        // Create bottom navigation
        const nav = document.createElement('nav');
        nav.className = 'bottom-nav';
        nav.innerHTML = `
            <a class="nav-item" data-route="dashboard">
                <div class="nav-icon">
                    <i class="fas fa-home"></i>
                </div>
                <span class="nav-label">Home</span>
            </a>
            <a class="nav-item" data-route="health">
                <div class="nav-icon">
                    <i class="fas fa-heartbeat"></i>
                </div>
                <span class="nav-label">Health</span>
            </a>
            <a class="nav-item" data-route="synachat">
                <div class="nav-icon">
                    <i class="fas fa-comments"></i>
                </div>
                <span class="nav-label">AI Chat</span>
            </a>
            <a class="nav-item" data-route="analytics">
                <div class="nav-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <span class="nav-label">Analytics</span>
            </a>
            <a class="nav-item nav-more-trigger" onclick="App.toggleMoreMenu(event)">
                <div class="nav-icon">
                    <i class="fas fa-ellipsis-h"></i>
                </div>
                <span class="nav-label">More</span>
            </a>
        `;
        document.body.appendChild(nav);

        // Create More menu overlay
        const moreMenu = document.createElement('div');
        moreMenu.id = 'moreMenu';
        moreMenu.className = 'more-menu-overlay';
        moreMenu.style.display = 'none';
        moreMenu.innerHTML = `
            <div class="more-menu-backdrop" onclick="App.closeMoreMenu()"></div>
            <div class="more-menu-panel">
                <div class="more-menu-header">
                    <span style="font-weight: 700; font-size: 1rem; color: var(--text-primary);">Menu Lainnya</span>
                    <button onclick="App.closeMoreMenu()" style="background: none; border: none; font-size: 1.2rem; color: var(--text-tertiary); cursor: pointer;"><i class="fas fa-times"></i></button>
                </div>
                <div class="more-menu-grid">
                    <a class="more-menu-item" data-route="sleep" onclick="App.closeMoreMenu()">
                        <div class="more-icon" style="background: rgba(49, 46, 129, 0.12); color: #312e81;"><i class="fas fa-moon"></i></div>
                        <span>Sleep Lab</span>
                    </a>
                    <a class="more-menu-item" data-route="moodbooster" onclick="App.closeMoreMenu()">
                        <div class="more-icon" style="background: rgba(234, 179, 8, 0.12); color: #eab308;"><i class="fas fa-music"></i></div>
                        <span>Mood Booster</span>
                    </a>
                    <a class="more-menu-item" data-route="mindful" onclick="App.closeMoreMenu()">
                        <div class="more-icon" style="background: rgba(16, 185, 129, 0.12); color: #10b981;"><i class="fas fa-leaf"></i></div>
                        <span>Mindful Moment</span>
                    </a>
                    <a class="more-menu-item" data-route="journal" onclick="App.closeMoreMenu()">
                        <div class="more-icon" style="background: rgba(249, 115, 22, 0.12); color: #f97316;"><i class="fas fa-book-open"></i></div>
                        <span>Daily Journal</span>
                    </a>
                    <a class="more-menu-item" data-route="support" onclick="App.closeMoreMenu()">
                        <div class="more-icon" style="background: rgba(239, 68, 68, 0.12); color: var(--danger-500);"><i class="fas fa-hands-holding-heart"></i></div>
                        <span>Support Hub</span>
                    </a>
                    <a class="more-menu-item" data-route="academy" onclick="App.closeMoreMenu()">
                        <div class="more-icon" style="background: rgba(139, 92, 246, 0.12); color: var(--primary-500);"><i class="fas fa-graduation-cap"></i></div>
                        <span>Syna Academy</span>
                    </a>
                    <a class="more-menu-item" data-route="research" onclick="App.closeMoreMenu()">
                        <div class="more-icon" style="background: rgba(245, 158, 11, 0.12); color: var(--warning-500);"><i class="fas fa-flask"></i></div>
                        <span>Research</span>
                    </a>
                    <a class="more-menu-item" data-route="profile" onclick="App.closeMoreMenu()">
                        <div class="more-icon" style="background: rgba(99, 102, 241, 0.12); color: var(--info-500);"><i class="fas fa-user"></i></div>
                        <span>Profile</span>
                    </a>
                    <a class="more-menu-item" data-route="assessment" onclick="App.closeMoreMenu()">
                        <div class="more-icon" style="background: rgba(16, 185, 129, 0.12); color: var(--success-500);"><i class="fas fa-clipboard-list"></i></div>
                        <span>Re-Assessment</span>
                    </a>
                    <a class="more-menu-item" data-route="yoga" onclick="App.closeMoreMenu()">
                        <div class="more-icon" style="background: rgba(102, 126, 234, 0.12); color: #667eea;"><i class="fas fa-spa"></i></div>
                        <span>Yoga Practice</span>
                    </a>
                    <a class="more-menu-item" data-route="heroic" onclick="App.closeMoreMenu()">
                        <div class="more-icon" style="background: rgba(99, 102, 241, 0.12); color: #6366f1;"><i class="fas fa-star-half-stroke"></i></div>
                        <span>HEROIC Program</span>
                    </a>
                </div>
            </div>
        `;
        document.body.appendChild(moreMenu);

        // Update active state based on current route
        Router.updateNavigation();
    },

    /**
     * Toggle More menu
     */
    toggleMoreMenu(e) {
        if (e) e.preventDefault();
        const menu = document.getElementById('moreMenu');
        if (!menu) return;
        if (menu.style.display === 'none') {
            menu.style.display = 'flex';
            requestAnimationFrame(() => menu.classList.add('show'));
        } else {
            this.closeMoreMenu();
        }
    },

    /**
     * Close More menu
     */
    closeMoreMenu() {
        const menu = document.getElementById('moreMenu');
        if (!menu) return;
        menu.classList.remove('show');
        setTimeout(() => { menu.style.display = 'none'; }, 250);
    },

    /**
     * Update time display
     */
    updateTime() {
        const timeEl = document.getElementById('currentTime');
        if (timeEl) {
            const now = new Date();
            timeEl.textContent = now.toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    },

    /**
     * Handle BLE connection changes
     */
    handleBLEConnection(connected) {
        // Update BLE indicator
        const indicator = document.getElementById('bleIndicator');
        const bleBtn = document.getElementById('bleConnectBtn');
        const bleStatus = bleBtn?.querySelector('.ble-status');

        if (indicator) {
            indicator.className = connected ? 'ble-indicator connected' : 'ble-indicator disconnected';
        }
        if (bleStatus) {
            bleStatus.textContent = connected ? 'Connected' : 'Connect';
        }

        // Update dashboard chart mode (if on dashboard)
        if (typeof setLiveMode === 'function') {
            setLiveMode(connected);
        }
    },

    /**
     * Handle BLE data updates
     */
    handleBLEData(data) {
        // Update UI elements if they exist
        this.updateElementText('hrValue', data.finger ? data.hr : '--');
        this.updateElementText('spo2Value', data.finger ? data.spo2 : '--');
        this.updateElementText('btValue', data.bt ? data.bt.toFixed(1) : '--');
        this.updateElementText('atValue', data.at ? data.at.toFixed(1) : '--');
        this.updateElementText('stressValue', data.stress + '%');
        this.updateElementText('gsrValue', data.gsr + '%');

        // Update live value displays on dashboard charts
        this.updateElementText('hrLiveValue', data.finger && data.hr > 0 ? `${data.hr} BPM` : '-- BPM');
        this.updateElementText('stressLiveValue', `${data.stress}%`);
        this.updateElementText('gsrLiveValue', `${data.gsr}%`);

        // Update progress bars
        this.updateProgressBar('stressBar', data.stress);
        this.updateProgressBar('gsrBar', data.gsr);

        // Update activity
        if (typeof Utils !== 'undefined') {
            this.updateElementText('actValue', Utils.getActivityLabel(data.act));
            const actIcon = document.getElementById('actIcon');
            if (actIcon) {
                actIcon.className = 'fas ' + Utils.getActivityIcon(data.act);
            }
        }

        // Update finger status
        const fingerEl = document.getElementById('fingerStatus');
        if (fingerEl) {
            if (fingerEl.querySelector('span')) {
                fingerEl.querySelector('span').textContent = data.finger ? 'Finger detected' : 'Place finger on sensor';
            } else {
                fingerEl.textContent = data.finger ? 'Detected' : 'Not Detected';
                fingerEl.style.color = data.finger ? 'var(--success-400)' : 'var(--danger-400)';
            }
        }

        // Update context for Synachat
        this.updateElementText('contextHr', data.finger ? data.hr : '--');
        this.updateElementText('contextSpo2', data.finger ? data.spo2 : '--');
        this.updateElementText('contextStress', data.stress);
        this.updateElementText('contextGsr', data.gsr);

        // Process data through Closed-loop Intervention Engine
        if (typeof InterventionEngine !== 'undefined') {
            InterventionEngine.processTelemetry(data);
        }

        // Call handleDataUpdate from dashboard.js to update charts (if on dashboard)
        if (typeof handleDataUpdate === 'function') {
            handleDataUpdate(data);
        }
        this.updateElementText('contextTemp', data.bt ? data.bt.toFixed(1) : '--');
    },

    /**
     * Helper to update element text
     */
    updateElementText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    },

    /**
     * Helper to update progress bar
     */
    updateProgressBar(id, value) {
        const el = document.getElementById(id);
        if (el) {
            el.style.width = value + '%';
        }
    },

    /**
     * Initialize Dashboard View
     */
    initDashboardView() {
        // Set greeting
        const greetingEl = document.getElementById('greeting');
        const userNameEl = document.getElementById('userName');

        if (greetingEl) {
            const hour = new Date().getHours();
            let greeting = 'Good Evening';
            if (hour < 12) greeting = 'Good Morning';
            else if (hour < 17) greeting = 'Good Afternoon';
            greetingEl.textContent = greeting + ' 👋';
        }

        if (userNameEl && this.currentUser) {
            userNameEl.textContent = this.currentUser.displayName || this.currentUser.email?.split('@')[0] || 'User';
        }

        // Check if user is admin and show/hide admin card
        const adminCardContainer = document.getElementById('adminCardContainer');
        if (adminCardContainer) {
            // Default: hide admin card
            adminCardContainer.style.display = 'none';

            // Check user role only if authenticated
            if (this.currentUser && typeof db !== 'undefined') {
                db.collection('users').doc(this.currentUser.uid).get()
                    .then(doc => {
                        const userData = doc.data();
                        // Only show if user role is explicitly 'admin'
                        if (userData && userData.role === 'admin') {
                            adminCardContainer.style.display = 'block';
                            console.log('✅ Admin panel visible');
                        } else {
                            adminCardContainer.style.display = 'none';
                            console.log('🔒 Admin panel hidden - user is not admin');
                        }
                    })
                    .catch(e => {
                        adminCardContainer.style.display = 'none';
                        console.log('Could not check admin status:', e);
                    });
            }
        }

        // Initialize charts from dashboard.js
        if (typeof initCharts === 'function') {
            initCharts();
        }

        // Register BLE data handlers for live chart updates
        if (typeof BLEConnection !== 'undefined') {
            if (typeof handleDataUpdate === 'function') {
                BLEConnection.onDataUpdate(handleDataUpdate);
            }
            if (typeof handleConnectionChange === 'function') {
                BLEConnection.onConnectionChange(handleConnectionChange);
            }

            // Check current connection status
            if (BLEConnection.isConnected()) {
                if (typeof setLiveMode === 'function') setLiveMode(true);
            } else {
                if (typeof startDemoAnimation === 'function') startDemoAnimation();
            }
        }

        // ── Inject HEROIC Score Card into Dashboard ────────────────────────────
        // Positioned above Quick Menu section so it's the first thing users see
        setTimeout(() => {
            if (document.getElementById('heroicDashboardCard')) return; // already injected
            if (typeof HeroicXAI === 'undefined') return;

            const overall = Math.round(HeroicXAI.getOverallScore());
            const dims = HeroicXAI.DIMENSIONS || {};
            const scores = HeroicXAI.scores || {};
            const weakDimKey = HeroicXAI.getWeakestDimension ? HeroicXAI.getWeakestDimension() : 'E';
            const weakDim = dims[weakDimKey] || { label: 'Efikasi Diri', icon: 'fa-chart-line', color: '#10B981' };
            const weakScore = Math.round(scores[weakDimKey] || 50);

            // Build mini dimension bars HTML
            const dimBarsHtml = Object.values(dims).map(d => {
                const sc = Math.round(scores[d.key] || 50);
                return `<div title="${d.label}: ${sc}" style="display:flex;flex-direction:column;align-items:center;gap:3px;">
                    <div style="width:28px;height:${Math.max(4, Math.round(sc * 0.32))}px;background:${d.color};border-radius:4px;transition:height 0.4s;"></div>
                    <span style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.85);">${d.key}</span>
                </div>`;
            }).join('');

            // Overall score color ring
            const scoreColor = overall >= 70 ? '#10B981' : overall >= 50 ? '#F59E0B' : '#EF4444';
            const scoreLabel = overall >= 70 ? 'Baik' : overall >= 50 ? 'Cukup' : 'Perlu Perhatian';

            const card = document.createElement('div');
            card.id = 'heroicDashboardCard';
            card.style.cssText = 'padding: 0 16px 8px; margin-top: 16px;';
            card.innerHTML = `
                <div onclick="Router.navigate('heroic')" style="
                    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #9333EA 100%);
                    border-radius: 20px;
                    padding: 18px 20px;
                    cursor: pointer;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 8px 24px rgba(99,102,241,0.35);
                    transition: transform 0.2s, box-shadow 0.2s;
                " onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform=''" ontouchstart="this.style.transform='scale(0.98)'" ontouchend="this.style.transform=''">
                    <!-- decorative circles -->
                    <div style="position:absolute;top:-20px;right:-20px;width:100px;height:100px;border-radius:50%;background:rgba(255,255,255,0.06);"></div>
                    <div style="position:absolute;bottom:-30px;right:60px;width:70px;height:70px;border-radius:50%;background:rgba(255,255,255,0.04);"></div>

                    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
                        <div>
                            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
                                <i class="fas fa-star-half-stroke" style="color:rgba(255,255,255,0.9);font-size:14px;"></i>
                                <span style="font-size:11px;font-weight:700;color:rgba(255,255,255,0.75);letter-spacing:0.08em;text-transform:uppercase;">HEROIC Score</span>
                            </div>
                            <div style="display:flex;align-items:baseline;gap:6px;">
                                <span style="font-size:2.8rem;font-weight:800;color:white;line-height:1;">${overall}</span>
                                <span style="font-size:13px;color:rgba(255,255,255,0.65);">/100</span>
                            </div>
                            <div style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.15);border-radius:20px;padding:3px 10px;margin-top:6px;">
                                <span style="width:6px;height:6px;border-radius:50%;background:${scoreColor};"></span>
                                <span style="font-size:11px;font-weight:600;color:white;">${scoreLabel}</span>
                            </div>
                        </div>
                        <div style="text-align:right;">
                            <div style="font-size:10px;color:rgba(255,255,255,0.6);margin-bottom:6px;">Perlu perhatian:</div>
                            <div style="display:flex;align-items:center;gap:5px;justify-content:flex-end;">
                                <i class="fas ${weakDim.icon}" style="color:${weakDim.color};font-size:13px;"></i>
                                <span style="font-size:12px;font-weight:700;color:white;">${weakDim.label}</span>
                            </div>
                            <div style="font-size:11px;color:rgba(255,255,255,0.55);margin-top:2px;">${weakScore}/100</div>
                        </div>
                    </div>

                    <!-- Mini dimension bars -->
                    <div style="display:flex;align-items:flex-end;gap:8px;justify-content:center;padding-top:8px;border-top:1px solid rgba(255,255,255,0.12);">
                        ${dimBarsHtml}
                        <div style="margin-left:auto;display:flex;align-items:center;gap:4px;">
                            <span style="font-size:10px;color:rgba(255,255,255,0.6);">Lihat detail</span>
                            <i class="fas fa-chevron-right" style="font-size:9px;color:rgba(255,255,255,0.5);"></i>
                        </div>
                    </div>
                </div>`;

            // Insert after the featured-card (health score card), before quick menu
            const featuredCard = document.querySelector('.featured-card');
            if (featuredCard && featuredCard.parentNode) {
                featuredCard.parentNode.insertBefore(card, featuredCard.nextSibling);
            } else {
                // Fallback: prepend to view-container
                const viewContainer = document.querySelector('.view-container');
                if (viewContainer) viewContainer.prepend(card);
            }
        }, 500);
    },

    /**
     * Initialize Health View
     */
    initHealthView() {
        // Initialize health page logic
        if (typeof initHealthPage === 'function') {
            initHealthPage();
        }

        // Initialize realtime charts
        if (typeof initRealtimeCharts === 'function') {
            initRealtimeCharts();
        }
    },

    /**
     * Initialize Analytics View
     */
    initAnalyticsView() {
        // Set current date
        const dateEl = document.getElementById('currentDate');
        if (dateEl) {
            dateEl.textContent = new Date().toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
        }

        // Initialize analytics
        if (typeof initAnalyticsPage === 'function') {
            initAnalyticsPage();
        }
    },

    /**
     * Initialize Profile View
     */
    initProfileView() {
        if (this.currentUser) {
            this.updateElementText('profileName', this.currentUser.displayName || 'User');
            this.updateElementText('profileEmail', this.currentUser.email || '');

            // Set avatar
            const avatarContainer = document.getElementById('avatarContainer');
            if (avatarContainer && this.currentUser.photoURL) {
                avatarContainer.innerHTML = `<img src="${this.currentUser.photoURL}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            }

            // Set joined date
            const joinedEl = document.getElementById('profileJoined');
            if (joinedEl && this.currentUser.metadata?.creationTime) {
                const joinDate = new Date(this.currentUser.metadata.creationTime);
                joinedEl.textContent = `Joined ${joinDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`;
            }
        }

        // Load stats from Firebase
        this.loadProfileStats();

        // Initialize weekly chart
        this.initWeeklyChart();
    },

    /**
     * Load profile statistics
     */
    async loadProfileStats() {
        try {
            const user = auth?.currentUser;
            if (!user) return;

            const stats = await FirebaseService.getUserStatistics(user.uid);

            this.updateElementText('daysActive', stats.daysActive || 0);
            this.updateElementText('totalSessions', stats.totalSessions || 0);
            this.updateElementText('healthScore', stats.avgHealthScore || '--');

            // Format total time
            const hours = Math.floor((stats.totalDuration || 0) / 3600);
            const minutes = Math.floor(((stats.totalDuration || 0) % 3600) / 60);
            this.updateElementText('totalTime', hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`);
        } catch (error) {
            console.error('Error loading profile stats:', error);
        }
    },

    /**
     * Initialize weekly chart
     */
    initWeeklyChart() {
        const ctx = document.getElementById('weeklyChart');
        if (!ctx || typeof Chart === 'undefined') return;

        // Generate demo data for weekly chart
        const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const data = labels.map(() => Math.floor(Math.random() * 30) + 60);

        new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Health Score',
                    data: data,
                    backgroundColor: data.map(v => {
                        if (v >= 80) return 'rgba(16, 185, 129, 0.8)';
                        if (v >= 60) return 'rgba(139, 92, 246, 0.8)';
                        return 'rgba(251, 191, 36, 0.8)';
                    }),
                    borderRadius: 8,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: 'rgba(107, 114, 128, 0.8)', font: { size: 11 } }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        grid: { color: 'rgba(107, 114, 128, 0.1)' },
                        ticks: { color: 'rgba(107, 114, 128, 0.8)', font: { size: 10 } }
                    }
                }
            }
        });
    },

    /**
     * Initialize Synachat View with 3D Avatar
     */
    initSynachatView() {
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            if (typeof initSynachat === 'function') {
                initSynachat();
            }
        }, 100);
    },

    /**
     * Cleanup previous view before switching
     */
    cleanupPreviousView(previousRoute) {
        // Cleanup synachat if leaving that view
        if (previousRoute === 'synachat' && typeof cleanupSynachat === 'function') {
            cleanupSynachat();
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is authenticated
    if (typeof auth !== 'undefined') {
        auth.onAuthStateChanged((user) => {
            if (user) {
                App.init();
            } else {
                // Redirect to auth page
                window.location.href = 'auth.html';
            }
        });
    } else {
        App.init();
    }
});

// Handle authenticated event
document.addEventListener('authenticated', () => {
    App.init();
});

// Make it globally available
window.App = App;

/**
 * Confirm logout with modal
 */
function confirmLogout() {
    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'logout-modal-overlay';
    overlay.innerHTML = `
        <div class="logout-modal">
            <div class="logout-modal-icon">
                <i class="fas fa-sign-out-alt"></i>
            </div>
            <h3>Logout</h3>
            <p>Are you sure you want to logout from SYNAWATCH?</p>
            <div class="logout-modal-buttons">
                <button class="btn btn-secondary" onclick="closeLogoutModal()">Cancel</button>
                <button class="btn btn-danger" onclick="performLogout()">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
        overlay.classList.add('show');
    });
}

/**
 * Close logout modal
 */
function closeLogoutModal() {
    const overlay = document.querySelector('.logout-modal-overlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    }
}

/**
 * Perform logout
 */
async function performLogout() {
    try {
        if (typeof Auth !== 'undefined') {
            const result = await Auth.logout();
            if (result.success) {
                window.location.href = 'auth.html';
            } else {
                Utils.showToast('Failed to logout', 'error');
                closeLogoutModal();
            }
        } else if (typeof auth !== 'undefined') {
            await auth.signOut();
            window.location.href = 'auth.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
        Utils.showToast('Failed to logout', 'error');
        closeLogoutModal();
    }
}

/**
 * Open Edit Profile Page
 */
function openEditProfile() {
    Router.navigate('edit-profile');
}

/**
 * Open Change Password Page
 */
function openChangePassword() {
    Router.navigate('change-password');
}

/**
 * Load Edit Profile Data
 */
async function loadEditProfileData() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const nameInput = document.getElementById('editProfileName');
        const emailInput = document.getElementById('editProfileEmail');

        if (emailInput) emailInput.value = user.email;

        // Get user data from Firestore
        const userData = await FirebaseService.getUserDocument(user.uid);
        if (nameInput && userData) {
            nameInput.value = userData.name || user.displayName || '';
        }
    } catch (error) {
        console.error('Error loading profile data:', error);
        Utils.showToast('Failed to load profile data', 'error');
    }
}

/**
 * Save Profile Changes
 */
async function saveProfileChanges() {
    try {
        const user = auth.currentUser;
        if (!user) {
            Utils.showToast('User not authenticated', 'error');
            return;
        }

        const nameInput = document.getElementById('editProfileName');
        const newName = nameInput?.value?.trim();

        if (!newName) {
            Utils.showToast('Please enter a name', 'warning');
            return;
        }

        // Update display name
        await user.updateProfile({ displayName: newName });

        // Update Firestore
        await FirebaseService.updateUserDocument(user.uid, { name: newName });

        Utils.showToast('Profile updated successfully!', 'success');
        setTimeout(() => Router.navigate('profile'), 1000);
    } catch (error) {
        console.error('Error saving profile:', error);
        Utils.showToast(error.message || 'Failed to save profile', 'error');
    }
}

/**
 * Change Password
 */
async function changePassword() {
    try {
        const user = auth.currentUser;
        if (!user) {
            Utils.showToast('User not authenticated', 'error');
            return;
        }

        const currentPassword = document.getElementById('currentPassword')?.value;
        const newPassword = document.getElementById('newPassword')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            Utils.showToast('Please fill in all fields', 'warning');
            return;
        }

        if (newPassword.length < 8) {
            Utils.showToast('New password must be at least 8 characters', 'warning');
            return;
        }

        if (newPassword !== confirmPassword) {
            Utils.showToast('Passwords do not match', 'warning');
            return;
        }

        // Re-authenticate user with current password
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        await user.reauthenticateWithCredential(credential);

        // Update password
        await user.updatePassword(newPassword);

        Utils.showToast('Password changed successfully!', 'success');
        setTimeout(() => Router.navigate('profile'), 1500);
    } catch (error) {
        console.error('Error changing password:', error);

        if (error.code === 'auth/wrong-password') {
            Utils.showToast('Current password is incorrect', 'error');
        } else if (error.code === 'auth/weak-password') {
            Utils.showToast('Password is too weak. Use at least 8 characters', 'error');
        } else {
            Utils.showToast(error.message || 'Failed to change password', 'error');
        }
    }
}

// Make functions globally available
window.confirmLogout = confirmLogout;
window.closeLogoutModal = closeLogoutModal;
window.performLogout = performLogout;
window.openEditProfile = openEditProfile;
window.openChangePassword = openChangePassword;
