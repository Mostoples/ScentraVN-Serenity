/**
 * SCENTRAVN - SPA Views
 * Contains all view templates for the application
 */

const Views = {
    /**
     * Assessment View (PHQ-9 & UCLA)
     */
    assessment() {
        return `
            <div class="view-container" style="margin: 0 auto; padding-top: 24px; padding-bottom: 40px;">
                <div id="assessmentProgressWrapper" style="margin-bottom: 32px; display: none;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="font-size: 0.8rem; font-weight: 600; color: var(--text-secondary);">${t('assessment.progress')}</span>
                    </div>
                    <div class="progress-bar" style="height: 8px; background: rgba(139, 92, 246, 0.1);">
                        <div id="assessmentProgress" class="progress-fill" style="width: 0%; background: var(--primary-500); transition: width 0.4s ease;"></div>
                    </div>
                </div>

                <div id="assessmentContent">
                    <div style="text-align: center; padding: 60px 20px;">
                        <div class="loading-spinner" style="margin: 0 auto 20px;"></div>
                        <p style="color: var(--text-tertiary);">${t('common.loading')}</p>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Dashboard View — Aura Glassmorphism redesign
     */
    dashboard() {
        return `
            <div class="view-container">

                <!-- ═══════════════════════════════════════════════
                     HERO CARD — Greeting + Health Score (purple)
                ═══════════════════════════════════════════════ -->
                <section class="aura-hero">
                    <div class="hero-row">
                        <div>
                            <div class="hero-greeting" id="greeting">${t('dashboard.welcome') || 'Welcome'}</div>
                            <div class="hero-name" id="userName">User</div>
                            <div class="hero-sub" id="dashboardDate"></div>
                        </div>
                        <button class="hero-action" onclick="Router.navigate('profile')" type="button" aria-label="${t('action.edit') || 'Edit'}" title="${t('action.edit') || 'Edit'}">
                            <i class="fas fa-pen"></i>
                        </button>
                    </div>

                    <div class="hero-score">
                        <div class="hero-score-text">
                            <span class="hero-score-label">${t('dashboard.health_score')}</span>
                            <div class="hero-score-value">
                                <strong id="healthScore">--</strong>
                                <span>/100</span>
                            </div>
                        </div>
                        <div class="hero-score-icon">
                            <i class="fas fa-shield-heart"></i>
                        </div>
                    </div>
                </section>

                <!-- ═══════════════════════════════════════════════
                     HEALTH INFO PILLS — like "Living room 21°"
                ═══════════════════════════════════════════════ -->
                <div class="aura-section">
                    <span class="aura-section-title">${t('dashboard.current_health') || 'Health info'}</span>
                    <button class="aura-section-link" onclick="Router.navigate('health')" type="button">${t('action.see_all') || 'See all'}</button>
                </div>

                <div class="metric-pills">
                    <!-- Heart Rate -->
                    <div class="metric-pill" onclick="Router.navigate('health')">
                        <div class="pill-icon danger"><i class="fas fa-heart-pulse"></i></div>
                        <div class="pill-value"><span id="hrValue">--</span><sup>${t('metric.bpm') || 'bpm'}</sup></div>
                        <div class="pill-label">${t('dashboard.heart_rate')}</div>
                        <div class="pill-sub" id="hrStatus">${t('metric.no_data') || 'No data'}</div>
                    </div>

                    <!-- SpO2 -->
                    <div class="metric-pill" onclick="Router.navigate('health')">
                        <div class="pill-icon info"><i class="fas fa-lungs"></i></div>
                        <div class="pill-value"><span id="spo2Value">--</span><sup>%</sup></div>
                        <div class="pill-label">${t('dashboard.spo2')}</div>
                        <div class="pill-sub" id="spo2Status">${t('metric.no_data') || 'No data'}</div>
                    </div>

                    <!-- Stress -->
                    <div class="metric-pill" onclick="Router.navigate('analytics')">
                        <div class="pill-icon warning"><i class="fas fa-brain"></i></div>
                        <div class="pill-value"><span id="stressValue">0</span><sup>%</sup></div>
                        <div class="pill-label">${t('dashboard.stress')}</div>
                        <div class="pill-sub" id="stressLabel">${t('metric.low') || 'Low'}</div>
                        <div style="display:none;">
                            <div id="stressBar" style="width:0%"></div>
                        </div>
                    </div>

                    <!-- GSR -->
                    <div class="metric-pill" onclick="Router.navigate('analytics')">
                        <div class="pill-icon success"><i class="fas fa-hand-sparkles"></i></div>
                        <div class="pill-value"><span id="gsrValue">0</span><sup>%</sup></div>
                        <div class="pill-label">${t('dashboard.gsr')}</div>
                        <div class="pill-sub">${t('metric.live') || 'live'}</div>
                        <div style="display:none;">
                            <div id="gsrBar" style="width:0%"></div>
                        </div>
                    </div>

                    <!-- HEROIC Wellness Index -->
                    <div class="metric-pill" onclick="Router.navigate('heroic')" style="grid-column: span 2;">
                        <div class="pill-icon"><i class="fas fa-star-of-life"></i></div>
                        <div class="pill-value"><span id="dashboardHeroicScore">--</span><sup>/100</sup></div>
                        <div class="pill-label">HEROIC Wellness</div>
                        <div class="pill-sub">XAI Powered &middot; ${t('action.tap_view') || 'tap to view'}</div>
                    </div>

                    <!-- Body Temp (extra slot if BLE provides) -->
                    <div class="metric-pill" onclick="Router.navigate('health')">
                        <div class="pill-icon"><i class="fas fa-temperature-half"></i></div>
                        <div class="pill-value"><span id="btValue">--</span><sup>°C</sup></div>
                        <div class="pill-label">${t('dashboard.body_temp') || 'Body temp'}</div>
                        <div class="pill-sub">${t('metric.live') || 'live'}</div>
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════
                     SCRIPTS — Wellness routines (like Morning/Evening scene)
                ═══════════════════════════════════════════════ -->
                <div class="aura-section">
                    <span class="aura-section-title">${t('dashboard.scripts') || 'Scripts'}</span>
                </div>
                <div class="script-grid">
                    <div class="script-card" onclick="Router.navigate('mindful')">
                        <div class="script-card-head">
                            <div class="icon"><i class="fas fa-sun"></i></div>
                            <span class="edit"><i class="fas fa-pen"></i> ${t('action.edit') || 'Edit'}</span>
                        </div>
                        <div class="script-card-title">${t('dashboard.morning_scene') || 'Morning routine'}</div>
                        <div class="script-card-desc">${t('dashboard.morning_desc') || 'Breathing, mindfulness, light stretch'}</div>
                    </div>
                    <div class="script-card" onclick="Router.navigate('sleepsession')">
                        <div class="script-card-head">
                            <div class="icon"><i class="fas fa-moon"></i></div>
                            <span class="edit"><i class="fas fa-pen"></i> ${t('action.edit') || 'Edit'}</span>
                        </div>
                        <div class="script-card-title">${t('dashboard.evening_scene') || 'Sleep tracking'}</div>
                        <div class="script-card-desc">EEG hypnogram, sleep score, history</div>
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════
                     DEVICES / SENSORS
                ═══════════════════════════════════════════════ -->
                <div class="aura-section">
                    <span class="aura-section-title">${t('dashboard.devices') || 'Devices'}</span>
                    <button class="aura-section-link" onclick="Router.navigate('live')" type="button"><i class="fas fa-tower-broadcast"></i> Live Monitor</button>
                </div>
                <div class="device-grid">
                    <div class="device-card" onclick="Router.navigate('live')">
                        <div class="device-card-head">
                            <div class="icon"><img src="images/smartwatch.png" alt="Galaxy Watch" style="width:16px;height:16px;object-fit:contain;filter:brightness(0) saturate(100%) invert(28%) sepia(83%) saturate(2089%) hue-rotate(258deg) brightness(91%) contrast(96%);"></div>
                            <span class="device-card-status off" id="watchStatus">OFF</span>
                        </div>
                        <div class="device-card-name">Galaxy Watch</div>
                        <div class="device-card-room">App ScentraVN</div>
                    </div>
                    <div class="device-card" onclick="Router.navigate('biolab')">
                        <div class="device-card-head">
                            <div class="icon"><i class="fas fa-brain"></i></div>
                            <span class="device-card-status off" id="museStatus">OFF</span>
                        </div>
                        <div class="device-card-name">Muse EEG</div>
                        <div class="device-card-room">BioLab</div>
                    </div>
                    <div class="device-card" onclick="Router.navigate('synachat')">
                        <div class="device-card-head">
                            <div class="icon"><i class="fas fa-robot"></i></div>
                            <span class="device-card-status on">ON</span>
                        </div>
                        <div class="device-card-name">Dr. ScentraVN Chat</div>
                        <div class="device-card-room">AI Assistant</div>
                    </div>
                </div>

                <!-- ═══════════════════════════════════════════════
                     QUESTIONNAIRE BANNER
                ═══════════════════════════════════════════════ -->
                <!-- Banner Kuesioner Pengujian Aplikasi -->
                <div style="margin-top: 24px;">
                    <div onclick="Router.navigate('questionnaire')" style="
                        cursor: pointer;
                        border-radius: 20px;
                        padding: 20px 22px;
                        background: linear-gradient(135deg, #7c3aed 0%, #a855f7 60%, #c084fc 100%);
                        box-shadow: 0 8px 28px rgba(124,58,237,0.35);
                        display: flex; align-items: center; justify-content: space-between; gap: 16px;
                        position: relative; overflow: hidden;
                        transition: transform 0.25s ease, box-shadow 0.25s ease;
                    "
                    onmouseenter="this.style.transform='translateY(-3px)';this.style.boxShadow='0 14px 36px rgba(124,58,237,0.45)'"
                    onmouseleave="this.style.transform='';this.style.boxShadow='0 8px 28px rgba(124,58,237,0.35)'"
                    >
                        <!-- Decorative circles -->
                        <div style="position:absolute;width:120px;height:120px;background:rgba(255,255,255,0.07);border-radius:50%;top:-30px;right:80px;pointer-events:none;"></div>
                        <div style="position:absolute;width:80px;height:80px;background:rgba(255,255,255,0.06);border-radius:50%;bottom:-20px;right:20px;pointer-events:none;"></div>

                        <!-- Kiri: ikon + teks -->
                        <div style="display:flex; align-items:center; gap:16px; z-index:1;">
                            <div style="
                                width:52px; height:52px; flex-shrink:0;
                                background:rgba(255,255,255,0.18);
                                border-radius:14px;
                                display:flex; align-items:center; justify-content:center;">
                                <i class="fas fa-clipboard-list" style="font-size:22px; color:#fff;"></i>
                            </div>
                            <div>
                                <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
                                    <span style="font-size:15px;font-weight:800;color:#fff;">${t('questionnaire.title')}</span>
                                    <span style="background:rgba(255,255,255,0.25);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;letter-spacing:0.5px;">BETA</span>
                                </div>
                                <p style="font-size:12px;color:rgba(255,255,255,0.82);margin:0;line-height:1.4;">
                                    ${t('questionnaire.banner_desc')}
                                </p>
                            </div>
                        </div>

                        <!-- Kanan: tombol panah -->
                        <div style="
                            z-index:1; flex-shrink:0;
                            width:38px; height:38px;
                            background:rgba(255,255,255,0.2);
                            border-radius:50%;
                            display:flex; align-items:center; justify-content:center;">
                            <i class="fas fa-arrow-right" style="color:#fff; font-size:14px;"></i>
                        </div>
                    </div>
                </div>

                <!-- Menu Cepat / Quick Menu -->
                <div style="margin-top: 32px; margin-bottom: 32px;">
                    <h3 class="section-title" style="margin-bottom: 20px;">${t('dashboard.quick_menu')}</h3>
                    <div class="card-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;">
                        <!-- Admin Panel (if admin) -->
                        <div id="adminCardContainer" style="display: none;">
                            <div class="quick-menu-card admin-card" onclick="Router.navigate('admin')" data-card="admin">
                                <div class="card-decorative-bg"></div>
                                <div class="card-icon-box admin-gradient">
                                    <i class="fas fa-sliders-h"></i>
                                </div>
                                <div class="card-content">
                                    <h4 class="card-title">${t('menu.admin')}</h4>
                                    <p class="card-subtitle">${t('menu.admin_sub')}</p>
                                </div>
                                <div class="card-hover-bg"></div>
                            </div>
                        </div>

                        <!-- Assessment -->
                        <div class="quick-menu-card assessment-card" onclick="Router.navigate('assessment')" data-card="assessment">
                            <div class="card-decorative-bg"></div>
                            <div class="card-icon-box assessment-gradient">
                                <i class="fas fa-list-check"></i>
                            </div>
                            <div class="card-content">
                                <h4 class="card-title">${t('menu.assessment')}</h4>
                                <p class="card-subtitle">${t('menu.assessment_sub')}</p>
                            </div>
                            <div class="card-hover-bg"></div>
                        </div>

                        <!-- AI Chat -->
                        <div class="quick-menu-card chat-card" onclick="Router.navigate('synachat')" data-card="chat">
                            <div class="card-decorative-bg"></div>
                            <div class="card-icon-box chat-gradient">
                                <i class="fas fa-comments"></i>
                            </div>
                            <div class="card-content">
                                <h4 class="card-title">${t('menu.chat')}</h4>
                                <p class="card-subtitle">${t('menu.chat_sub')}</p>
                            </div>
                            <div class="card-hover-bg"></div>
                        </div>

                        <!-- Crisis Support -->
                        <div class="quick-menu-card crisis-card" onclick="Router.navigate('support')" data-card="crisis">
                            <div class="card-decorative-bg"></div>
                            <div class="card-icon-box crisis-gradient">
                                <i class="fas fa-headset"></i>
                            </div>
                            <div class="card-content">
                                <h4 class="card-title">${t('menu.crisis')}</h4>
                                <p class="card-subtitle">${t('menu.crisis_sub')}</p>
                            </div>
                            <div class="card-hover-bg"></div>
                        </div>

                        <!-- Sleep Lab -->
                        <div class="quick-menu-card sleep-card" onclick="Router.navigate('sleep')" data-card="sleep">
                            <div class="card-decorative-bg"></div>
                            <div class="card-icon-box sleep-gradient">
                                <i class="fas fa-bed"></i>
                            </div>
                            <div class="card-content">
                                <h4 class="card-title">${t('menu.sleep')}</h4>
                                <p class="card-subtitle">${t('menu.sleep_sub')}</p>
                            </div>
                            <div class="card-hover-bg"></div>
                        </div>

                        <!-- Journal -->
                        <div class="quick-menu-card journal-card" onclick="Router.navigate('journal')" data-card="journal">
                            <div class="card-decorative-bg"></div>
                            <div class="card-icon-box journal-gradient">
                                <i class="fas fa-pen-fancy"></i>
                            </div>
                            <div class="card-content">
                                <h4 class="card-title">${t('menu.journal')}</h4>
                                <p class="card-subtitle">${t('menu.journal_sub')}</p>
                            </div>
                            <div class="card-hover-bg"></div>
                        </div>

                        <!-- Mindfulness -->
                        <div class="quick-menu-card mindful-card" onclick="Router.navigate('mindful')" data-card="mindful">
                            <div class="card-decorative-bg"></div>
                            <div class="card-icon-box mindful-gradient">
                                <i class="fas fa-spa"></i>
                            </div>
                            <div class="card-content">
                                <h4 class="card-title">${t('menu.mindful')}</h4>
                                <p class="card-subtitle">${t('menu.mindful_sub')}</p>
                            </div>
                            <div class="card-hover-bg"></div>
                        </div>

                        <!-- Mood Booster -->
                        <div class="quick-menu-card mood-card" onclick="Router.navigate('moodbooster')" data-card="mood">
                            <div class="card-decorative-bg"></div>
                            <div class="card-icon-box mood-gradient">
                                <i class="fas fa-music"></i>
                            </div>
                            <div class="card-content">
                                <h4 class="card-title">${t('menu.mood')}</h4>
                                <p class="card-subtitle">${t('menu.mood_sub')}</p>
                            </div>
                            <div class="card-hover-bg"></div>
                        </div>

                        <!-- Academy -->
                        <div class="quick-menu-card academy-card" onclick="Router.navigate('academy')" data-card="academy">
                            <div class="card-decorative-bg"></div>
                            <div class="card-icon-box academy-gradient">
                                <i class="fas fa-book"></i>
                            </div>
                            <div class="card-content">
                                <h4 class="card-title">${t('menu.academy')}</h4>
                                <p class="card-subtitle">${t('menu.academy_sub')}</p>
                            </div>
                            <div class="card-hover-bg"></div>
                        </div>

                        <!-- HEROIC Program -->
                        <div class="quick-menu-card heroic-card" onclick="Router.navigate('heroic')" data-card="heroic">
                            <div class="card-decorative-bg"></div>
                            <div class="card-icon-box" style="background: linear-gradient(135deg, #7C3AED, #5B21B6);">
                                <i class="fas fa-star-of-life"></i>
                            </div>
                            <div class="card-content">
                                <h4 class="card-title">${t('menu.heroic')}</h4>
                                <p class="card-subtitle">${t('menu.heroic_sub')}</p>
                            </div>
                            <div class="card-hover-bg"></div>
                        </div>

                        <!-- Games -->
                        <div class="quick-menu-card games-card" onclick="Router.navigate('games')" data-card="games">
                            <div class="card-decorative-bg"></div>
                            <div class="card-icon-box games-gradient">
                                <i class="fas fa-gamepad"></i>
                            </div>
                            <div class="card-content">
                                <h4 class="card-title">${t('menu.games')}</h4>
                                <p class="card-subtitle">${t('menu.games_sub')}</p>
                            </div>
                            <div class="card-hover-bg"></div>
                        </div>

                        <!-- Kuesioner -->
                        <div class="quick-menu-card questionnaire-card" onclick="Router.navigate('questionnaire')" data-card="questionnaire">
                            <div class="card-decorative-bg"></div>
                            <div class="card-icon-box" style="background: linear-gradient(135deg, #7c3aed, #a855f7);">
                                <i class="fas fa-clipboard-list"></i>
                            </div>
                            <div class="card-content">
                                <h4 class="card-title">${t('questionnaire.title')}</h4>
                                <p class="card-subtitle">${t('questionnaire.give_feedback')}</p>
                            </div>
                            <div class="card-hover-bg"></div>
                        </div>

                        <!-- Aroma Advisor -->
                        <div class="quick-menu-card aroma-card" onclick="Router.navigate('aroma')" data-card="aroma">
                            <div class="card-decorative-bg"></div>
                            <div class="card-icon-box" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">
                                <i class="fas fa-spray-can-sparkles"></i>
                            </div>
                            <div class="card-content">
                                <h4 class="card-title">Aroma Advisor</h4>
                                <p class="card-subtitle">Rekomendasi aromaterapi</p>
                            </div>
                            <div class="card-hover-bg"></div>
                        </div>
                    </div>
                </div>

                <!-- Real-time Charts -->
                <h3 class="section-title">
                    ${t('dashboard.realtime_charts')}
                    <span id="chartStatus" class="chart-status-badge demo">
                        <i class="fas fa-circle"></i> ${t('metric.demo')}
                    </span>
                </h3>

                <div class="chart-container chart-hr">
                    <div class="chart-animated-icon hr-icon">
                        <i class="fas fa-heart"></i>
                        <div class="pulse-ring"></div>
                        <div class="pulse-ring delay"></div>
                    </div>
                    <div class="chart-header">
                        <span class="chart-title">
                            <i class="fas fa-heart-pulse" style="color: var(--danger-400);"></i>
                            ${t('dashboard.heart_rate')}
                            <span id="hrLiveValue" class="live-value">-- ${t('metric.bpm')}</span>
                        </span>
                    </div>
                    <div class="chart-canvas">
                        <canvas id="hrChart"></canvas>
                    </div>
                </div>

                <div class="chart-container chart-stress">
                    <div class="chart-animated-icon stress-icon">
                        <i class="fas fa-brain"></i>
                        <div class="wave-effect"></div>
                    </div>
                    <div class="chart-header">
                        <span class="chart-title">
                            <i class="fas fa-brain" style="color: var(--warning-400);"></i>
                            ${t('dashboard.stress')}
                            <span id="stressLiveValue" class="live-value">--%</span>
                        </span>
                    </div>
                    <div class="chart-canvas">
                        <canvas id="stressChart"></canvas>
                    </div>
                </div>

                <div class="chart-container chart-gsr">
                    <div class="chart-animated-icon gsr-icon">
                        <i class="fas fa-hand-sparkles"></i>
                        <div class="sparkle s1"></div>
                        <div class="sparkle s2"></div>
                        <div class="sparkle s3"></div>
                    </div>
                    <div class="chart-header">
                        <span class="chart-title">
                            <i class="fas fa-hand" style="color: var(--primary-400);"></i>
                            ${t('dashboard.gsr')}
                            <span id="gsrLiveValue" class="live-value">--%</span>
                        </span>
                    </div>
                    <div class="chart-canvas">
                        <canvas id="gsrChart"></canvas>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div style="margin-top: var(--space-6); display: flex; gap: var(--space-3); flex-wrap: wrap;">
                    <button class="btn btn-primary btn-sm" data-route="health">
                        <i class="fas fa-heartbeat"></i>
                        ${t('action.start_monitoring')}
                    </button>
                    <button class="btn btn-secondary btn-sm" data-route="synachat">
                        <i class="fas fa-comments"></i>
                        ${t('action.talk_to_ai')}
                    </button>
                </div>
            </div>
        `;
    },

    /**
     * Health View - Modern Professional Design
     */
    health() {
        return `
            <div class="health-page">
                <style>
                    .health-body{padding:32px 16px 28px;display:flex;flex-direction:column;gap:22px;}
                    .health-page .hsec{margin:0;}
                    .health-page .hsec-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:13px;flex-wrap:wrap;}
                    .health-page .hsec-head h2{display:flex;align-items:center;gap:9px;font-size:1rem;font-weight:800;color:#4c1d95;margin:0;}
                    .health-page .hsec-head h2 i{color:#7c3aed;}
                    .health-page .hsec-note{font-size:0.7rem;color:#94a3b8;display:inline-flex;align-items:center;gap:5px;}
                    .hcard{background:#fff;border:1px solid rgba(124,58,237,0.10);border-radius:18px;box-shadow:0 4px 18px rgba(76,29,149,0.06);}
                    .health-live-badge{display:inline-flex;align-items:center;gap:7px;padding:6px 13px;border-radius:999px;font-size:0.72rem;font-weight:700;white-space:nowrap;}
                    .health-live-badge .dot{width:8px;height:8px;border-radius:50%;background:#cbd5e1;flex-shrink:0;}
                    .health-live-badge.live{background:#dcfce7;color:#15803d;} .health-live-badge.live .dot{background:#22c55e;}
                    .health-live-badge.waiting{background:#fef9c3;color:#a16207;} .health-live-badge.waiting .dot{background:#f59e0b;}
                    .health-live-badge.off{background:#fee2e2;color:#b91c1c;} .health-live-badge.off .dot{background:#ef4444;}
                    .hdev-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
                    .hdev-card{padding:16px;display:flex;flex-direction:column;}
                    .hdev-top{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px;}
                    .hdev-icon{width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#7c3aed,#a78bfa);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.15rem;box-shadow:0 4px 12px rgba(124,58,237,0.30);}
                    .hdev-img{width:30px;height:30px;object-fit:contain;filter:brightness(0) invert(1) drop-shadow(0 0 2px rgba(255,255,255,0.55));}
                    .hdev-dot{width:11px;height:11px;border-radius:50%;background:#cbd5e1;box-shadow:0 0 0 4px rgba(203,213,225,0.22);margin-top:5px;}
                    .hdev-dot.on{background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,0.18);}
                    .hdev-dot.stale{background:#f59e0b;box-shadow:0 0 0 4px rgba(245,158,11,0.18);}
                    .hdev-name{font-weight:800;font-size:0.95rem;color:#1e293b;}
                    .hdev-role{font-size:0.72rem;color:#94a3b8;margin-top:2px;}
                    .hdev-meta{display:flex;align-items:center;gap:8px;font-size:0.76rem;color:#475569;font-weight:600;margin-top:10px;}
                    .hdev-meta .hdev-sep{color:#cbd5e1;}
                    .hdev-updated{font-size:0.66rem;color:#a78bfa;font-weight:600;margin-top:5px;}
                    .hvit-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
                    .hvit{padding:18px;display:flex;flex-direction:column;gap:9px;}
                    .hvit-top{display:flex;align-items:center;justify-content:space-between;}
                    .hvit-ic{width:40px;height:40px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:1.05rem;}
                    .hvit-badge{font-size:0.66rem;font-weight:700;padding:4px 10px;border-radius:999px;background:#f1f5f9;color:#64748b;}
                    .hvit-num{display:flex;align-items:baseline;gap:6px;}
                    .hvit-num .n{font-size:2.2rem;font-weight:800;color:#1e293b;line-height:1;}
                    .hvit-num .u{font-size:0.85rem;font-weight:700;color:#94a3b8;}
                    .hvit-label{font-size:0.82rem;font-weight:700;color:#334155;}
                    .hvit-foot{font-size:0.66rem;color:#94a3b8;line-height:1.4;}
                    .heeg-card{padding:18px;}
                    .heeg-cw{background:#faf8ff;border:1px solid rgba(124,58,237,0.08);border-radius:14px;padding:12px;margin:14px 0;}
                    .heeg-bands{display:grid;grid-template-columns:repeat(5,1fr);gap:9px;margin-bottom:14px;}
                    .heeg-band{background:#faf8ff;border:1px solid rgba(124,58,237,0.08);border-radius:12px;padding:12px 6px;text-align:center;}
                    .heeg-band .v{font-size:1.3rem;font-weight:800;line-height:1;}
                    .heeg-band .n{font-size:0.68rem;font-weight:700;color:#334155;margin-top:5px;}
                    .heeg-band .h{font-size:0.58rem;color:#94a3b8;margin-top:1px;}
                    .heeg-bar{height:5px;background:rgba(124,58,237,0.10);border-radius:99px;margin-top:8px;overflow:hidden;}
                    .heeg-bar span{display:block;height:100%;width:0;border-radius:99px;transition:width .35s ease;}
                    .heeg-status{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
                    .heeg-stat{background:#faf8ff;border:1px solid rgba(124,58,237,0.08);border-radius:12px;padding:12px;display:flex;align-items:center;gap:10px;}
                    .heeg-stat i{font-size:1.05rem;flex-shrink:0;}
                    .heeg-stat .lbl{font-size:0.66rem;color:#94a3b8;}
                    .heeg-stat .val{font-size:0.85rem;font-weight:800;color:#1e293b;}
                    .health-page .health-actions{display:flex;gap:12px;flex-wrap:wrap;}
                    @media(max-width:640px){
                        .hdev-grid,.hvit-grid{grid-template-columns:1fr;}
                        .heeg-bands{gap:6px;} .heeg-band{padding:10px 3px;} .heeg-band .v{font-size:1.05rem;}
                        .heeg-status{grid-template-columns:1fr;}
                    }
                </style>

                <!-- Header -->
                <div class="health-header">
                    <div class="health-header-content">
                        <div class="health-header-left">
                            <h1 class="health-title">${t('health.title')}</h1>
                            <p class="health-subtitle">${t('health.subtitle')}</p>
                        </div>
                        <span id="healthLiveBadge" class="health-live-badge waiting">
                            <span class="dot"></span><span class="txt">Menunggu data…</span>
                        </span>
                    </div>
                </div>

                <div class="health-body">
                    <!-- Perangkat -->
                    <section class="hsec">
                        <div class="hsec-head">
                            <h2><i class="fas fa-tower-broadcast"></i> Perangkat</h2>
                            <span class="hsec-note"><i class="fas fa-circle-info"></i> Muse &amp; ScentraVN lewat Bluetooth · Galaxy Watch lewat aplikasi ScentraVN</span>
                        </div>
                        <div class="hdev-grid">
                            ${[
                                ['gw','img:images/smartwatch.png','Galaxy Watch','Detak jantung · Stres','rtdb'],
                                ['esp','fa-microchip','ScentraVN Watch','Detak jantung · SpO₂','ble'],
                                ['muse','fa-brain','Muse S Gen 2','Gelombang otak (EEG)','ble']
                            ].map(([k,ic,nm,role,conn]) => `
                                <div class="hcard hdev-card">
                                    <div class="hdev-top">
                                        <div class="hdev-icon">${ic.startsWith('img:')
                                            ? `<img src="${ic.slice(4)}" alt="${nm}" class="hdev-img">`
                                            : `<i class="fas ${ic}"></i>`}</div>
                                        <span class="hdev-dot" id="dev-${k}-dot"></span>
                                    </div>
                                    <div class="hdev-name">${nm}</div>
                                    <div class="hdev-role">${role}</div>
                                    <div class="hdev-meta">
                                        <span id="dev-${k}-status">Tidak terhubung</span>
                                        <span class="hdev-sep">·</span>
                                        <span><i class="fas fa-battery-half" style="color:#7c3aed;"></i> <span id="dev-${k}-batt">—</span></span>
                                    </div>
                                    <div class="hdev-updated" id="dev-${k}-updated">—</div>
                                    ${conn === 'ble'
                                        ? `<button class="hdev-connect-btn" id="dev-${k}-connect" type="button" style="margin-top:11px;width:100%;border:1px solid rgba(124,58,237,0.25);background:rgba(124,58,237,0.08);color:#6d28d9;font-weight:700;font-size:0.76rem;padding:8px;border-radius:10px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px;"><i class="fab fa-bluetooth-b"></i> Hubungkan</button>`
                                        : `<div style="margin-top:11px;font-size:0.66rem;color:#0891b2;font-weight:700;background:rgba(8,145,178,0.08);padding:8px;border-radius:10px;text-align:center;"><i class="fas fa-mobile-screen-button"></i> Buka aplikasi ScentraVN</div>`}
                                </div>`).join('')}
                        </div>
                    </section>

                    <!-- Tanda Vital -->
                    <section class="hsec">
                        <div class="hsec-head">
                            <h2><i class="fas fa-wave-square"></i> ${t('health.vital_signs')}</h2>
                            <span id="liveIndicator" class="health-live-badge waiting"><span class="dot"></span><span class="txt">${t('metric.live') || 'live'}</span></span>
                        </div>
                        <div class="hvit-grid">
                            <div class="hcard hvit">
                                <div class="hvit-top">
                                    <div class="hvit-ic" style="background:rgba(239,68,68,0.12);color:#ef4444;"><i class="fas fa-heart-pulse"></i></div>
                                    <span class="hvit-badge" id="hrStatus">—</span>
                                </div>
                                <div class="hvit-num"><span class="n" id="hrValue">--</span><span class="u">BPM</span></div>
                                <div class="hvit-label">${t('health.heart_rate') || 'Detak Jantung'}</div>
                                <div class="hvit-foot">Sumber: <span id="hrSource">—</span> · Normal 60–100</div>
                            </div>
                            <div class="hcard hvit">
                                <div class="hvit-top">
                                    <div class="hvit-ic" style="background:rgba(6,182,212,0.12);color:#0891b2;"><i class="fas fa-lungs"></i></div>
                                    <span class="hvit-badge" id="spo2Status">—</span>
                                </div>
                                <div class="hvit-num"><span class="n" id="spo2Value">--</span><span class="u">%</span></div>
                                <div class="hvit-label">${t('health.blood_oxygen') || 'Saturasi Oksigen'}</div>
                                <div class="hvit-foot">Dari ScentraVN Watch · Normal 95–100</div>
                            </div>
                            <div class="hcard hvit">
                                <div class="hvit-top">
                                    <div class="hvit-ic" style="background:rgba(124,58,237,0.12);color:#7c3aed;"><i class="fas fa-brain"></i></div>
                                    <span class="hvit-badge" id="stressSource">Watch</span>
                                </div>
                                <div class="hvit-num"><span class="n" id="stressCategory" style="font-size:1.6rem;">—</span></div>
                                <div class="hvit-label">Tingkat Stres</div>
                                <div class="hvit-foot">Tingkat stres dari Galaxy Watch</div>
                            </div>
                        </div>
                    </section>

                    <!-- EEG -->
                    <section class="hsec hcard heeg-card">
                        <div class="hsec-head">
                            <h2><i class="fas fa-brain"></i> Gelombang Otak EEG</h2>
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span id="eegMentalChip" class="hvit-badge" style="display:none;">—</span>
                                <span id="eegLive" class="health-live-badge off"><span class="dot"></span><span class="txt">Muse mati</span></span>
                            </div>
                        </div>
                        <div class="heeg-cw">
                            <div style="position:relative;width:100%;height:180px;">
                                <canvas id="eegChart"></canvas>
                            </div>
                            <div style="font-size:0.62rem;color:#94a3b8;text-align:right;margin-top:4px;">Daya pita relatif (%) · ternormalisasi</div>
                        </div>
                        <div class="heeg-bands">
                            <div class="heeg-band"><div class="v" id="eegDelta" style="color:#3b82f6;">--</div><div class="n">Delta</div><div class="h">0.5–4Hz</div><div class="heeg-bar"><span id="eegBar-delta" style="background:#3b82f6;"></span></div></div>
                            <div class="heeg-band"><div class="v" id="eegTheta" style="color:#8b5cf6;">--</div><div class="n">Theta</div><div class="h">4–8Hz</div><div class="heeg-bar"><span id="eegBar-theta" style="background:#8b5cf6;"></span></div></div>
                            <div class="heeg-band"><div class="v" id="eegAlpha" style="color:#10b981;">--</div><div class="n">Alpha</div><div class="h">8–13Hz</div><div class="heeg-bar"><span id="eegBar-alpha" style="background:#10b981;"></span></div></div>
                            <div class="heeg-band"><div class="v" id="eegBeta" style="color:#f59e0b;">--</div><div class="n">Beta</div><div class="h">13–30Hz</div><div class="heeg-bar"><span id="eegBar-beta" style="background:#f59e0b;"></span></div></div>
                            <div class="heeg-band"><div class="v" id="eegGamma" style="color:#ef4444;">--</div><div class="n">Gamma</div><div class="h">30–100Hz</div><div class="heeg-bar"><span id="eegBar-gamma" style="background:#ef4444;"></span></div></div>
                        </div>
                        <div class="heeg-status">
                            <div class="heeg-stat"><i class="fas fa-bullseye" style="color:#10b981;"></i><div><div class="lbl">Fokus / Engagement</div><div class="val" id="eegFocusState">--</div></div></div>
                            <div class="heeg-stat"><i class="fas fa-spa" style="color:#7c3aed;"></i><div><div class="lbl">Relaksasi</div><div class="val" id="eegArousal">--</div></div></div>
                            <div class="heeg-stat"><i class="fas fa-battery-half" style="color:#3b82f6;"></i><div><div class="lbl">Baterai Muse</div><div class="val" id="eegBattery">--</div></div></div>
                        </div>
                    </section>

                    <!-- Quick Actions -->
                    <div class="health-actions">
                        <button class="health-action-btn primary" onclick="Router.navigate('rawrecorder')" style="background:linear-gradient(135deg,#7c3aed,#a855f7);">
                            <i class="fas fa-record-vinyl"></i>
                            <span>Rekam Data</span>
                        </button>
                        <button class="health-action-btn secondary" onclick="Router.navigate('recordhistory')">
                            <i class="fas fa-clock-rotate-left"></i>
                            <span>Riwayat Rekaman</span>
                        </button>
                        <button class="health-action-btn secondary" onclick="Router.navigate('analytics')">
                            <i class="fas fa-chart-line"></i>
                            <span>${t('health.view_analytics')}</span>
                        </button>
                        <button class="health-action-btn secondary" onclick="Router.navigate('synachat')">
                            <i class="fas fa-robot"></i>
                            <span>${t('health.ask_synachat')}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Analytics View
     */
    analytics() {
        return `
            <div class="view-container">
                <!-- Period Filter -->
                <div class="filter-tabs" style="margin-bottom: var(--space-4);">
                    <button class="filter-tab active" onclick="changeChartPeriod('day', this)">${t('analytics.today')}</button>
                    <button class="filter-tab" onclick="changeChartPeriod('week', this)">${t('analytics.this_week')}</button>
                    <button class="filter-tab" onclick="changeChartPeriod('month', this)">${t('analytics.this_month')}</button>
                </div>

                <!-- Heart Rate Chart -->
                <div class="chart-container">
                    <div class="chart-header">
                        <span class="chart-title">
                            <i class="fas fa-heart-pulse" style="color: var(--danger-500);"></i>
                            ${t('analytics.hr_trends')}
                        </span>
                        <span id="hrAvgStat" class="stat-badge">Avg: -- ${t('metric.bpm')}</span>
                    </div>
                    <div class="chart-canvas" style="height: 200px;">
                        <canvas id="hrTrendChart"></canvas>
                    </div>
                </div>

                <!-- Stress Chart -->
                <div class="chart-container">
                    <div class="chart-header">
                        <span class="chart-title">
                            <i class="fas fa-brain" style="color: var(--warning-500);"></i>
                            ${t('analytics.stress_pattern')}
                        </span>
                        <span id="stressAvgStat" class="stat-badge">Avg: --%</span>
                    </div>
                    <div class="chart-canvas" style="height: 200px;">
                        <canvas id="stressTrendChart"></canvas>
                    </div>
                </div>

                <!-- GSR Chart -->
                <div class="chart-container">
                    <div class="chart-header">
                        <span class="chart-title">
                            <i class="fas fa-hand" style="color: var(--primary-500);"></i>
                            ${t('analytics.gsr_pattern')}
                        </span>
                        <span id="gsrAvgStat" class="stat-badge">Avg: --%</span>
                    </div>
                    <div class="chart-canvas" style="height: 200px;">
                        <canvas id="gsrTrendChart"></canvas>
                    </div>
                </div>

                <!-- SpO2 Chart -->
                <div class="chart-container">
                    <div class="chart-header">
                        <span class="chart-title">
                            <i class="fas fa-lungs" style="color: var(--info-500);"></i>
                            ${t('analytics.spo2_trends')}
                        </span>
                        <span id="spo2AvgStat" class="stat-badge">Avg: --%</span>
                    </div>
                    <div class="chart-canvas" style="height: 200px;">
                        <canvas id="spo2TrendChart"></canvas>
                    </div>
                </div>

                <!-- Daily Summary -->
                <h3 class="section-title">${t('analytics.daily_summary')}</h3>
                <div class="card-grid">
                    <div class="card metric-card">
                        <div class="metric-icon danger">
                            <i class="fas fa-heart"></i>
                        </div>
                        <div class="metric-value" id="avgHr">--</div>
                        <div class="metric-label">${t('analytics.avg_hr')}</div>
                    </div>
                    <div class="card metric-card">
                        <div class="metric-icon warning">
                            <i class="fas fa-brain"></i>
                        </div>
                        <div class="metric-value" id="avgStress">--</div>
                        <div class="metric-label">${t('analytics.avg_stress')}</div>
                    </div>
                    <div class="card metric-card">
                        <div class="metric-icon info">
                            <i class="fas fa-lungs"></i>
                        </div>
                        <div class="metric-value" id="avgSpo2">--</div>
                        <div class="metric-label">${t('analytics.avg_spo2')}</div>
                    </div>
                    <div class="card metric-card">
                        <div class="metric-icon primary">
                            <i class="fas fa-hand"></i>
                        </div>
                        <div class="metric-value" id="avgGsr">--</div>
                        <div class="metric-label">${t('analytics.avg_gsr')}</div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Profile View
     */
    profile() {
        return `
            <div class="view-container">
                <!-- Profile Header -->
                <div class="featured-card" style="text-align: center; margin: calc(var(--space-5) * -1) calc(var(--space-5) * -1) var(--space-6); border-radius: 0 0 var(--radius-2xl) var(--radius-2xl);">
                    <div class="content">
                        <div id="avatarContainer" style="width: 100px; height: 100px; border-radius: 50%; background: rgba(255,255,255,0.15); display: flex; align-items: center; justify-content: center; margin: 0 auto var(--space-4); font-size: 2.5rem; color: white; border: 4px solid rgba(255,255,255,0.3);">
                            <i class="fas fa-user"></i>
                        </div>
                        <div id="profileName" style="font-size: var(--text-2xl); font-weight: var(--font-bold); color: white; margin-bottom: var(--space-1);">Loading...</div>
                        <div id="profileEmail" style="font-size: var(--text-sm); color: rgba(255,255,255,0.8);">...</div>
                        <div id="profileJoined" style="font-size: var(--text-xs); color: rgba(255,255,255,0.6); margin-top: var(--space-2);"></div>
                    </div>
                </div>

                <!-- Statistics -->
                <h3 class="section-title">${t('profile.title')}</h3>
                <div class="card-grid">
                    <div class="card metric-card">
                        <div class="metric-icon primary">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                        <div id="daysActive" class="metric-value">0</div>
                        <div class="metric-label">${t('profile.days_active')}</div>
                    </div>
                    <div class="card metric-card">
                        <div class="metric-icon success">
                            <i class="fas fa-clipboard-list"></i>
                        </div>
                        <div id="totalSessions" class="metric-value">0</div>
                        <div class="metric-label">${t('profile.total_sessions')}</div>
                    </div>
                    <div class="card metric-card">
                        <div class="metric-icon danger">
                            <i class="fas fa-heart"></i>
                        </div>
                        <div id="healthScore" class="metric-value">--</div>
                        <div class="metric-label">${t('profile.health_score')}</div>
                    </div>
                    <div class="card metric-card">
                        <div class="metric-icon info">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div id="totalTime" class="metric-value">0h</div>
                        <div class="metric-label">${t('profile.total_time')}</div>
                    </div>
                </div>

                <!-- Weekly Chart -->
                <div class="card" style="margin-bottom: var(--space-6);">
                    <h3 style="font-size: var(--text-base); font-weight: var(--font-semibold); margin-bottom: var(--space-4); display: flex; align-items: center; gap: var(--space-2); color: var(--text-primary);">
                        <i class="fas fa-chart-line" style="color: var(--primary-400);"></i>
                        Weekly Health Score
                    </h3>
                    <div style="height: 160px;">
                        <canvas id="weeklyChart"></canvas>
                    </div>
                </div>

                <!-- Menu -->
                <div class="card" style="padding: 0; overflow: hidden; margin-bottom: var(--space-6);">
                    <div class="list-item" onclick="openEditProfile()">
                        <div class="list-item-icon" style="background: rgba(99, 102, 241, 0.15); color: var(--primary-400);">
                            <i class="fas fa-user-edit"></i>
                        </div>
                        <div class="list-item-content">
                            <div class="list-item-title">${t('profile.edit')}</div>
                            <div class="list-item-subtitle">${I18n.currentLang === 'id' ? 'Perbarui nama dan foto Anda' : 'Update your name and photo'}</div>
                        </div>
                        <i class="fas fa-chevron-right list-item-action"></i>
                    </div>
                    <div class="list-item" onclick="openChangePassword()">
                        <div class="list-item-icon" style="background: rgba(251, 191, 36, 0.15); color: var(--accent-400);">
                            <i class="fas fa-lock"></i>
                        </div>
                        <div class="list-item-content">
                            <div class="list-item-title">${t('profile.change_password')}</div>
                            <div class="list-item-subtitle">${t('profile.update_security')}</div>
                        </div>
                        <i class="fas fa-chevron-right list-item-action"></i>
                    </div>
                    <div class="list-item" data-route="synachat">
                        <div class="list-item-icon" style="background: rgba(34, 197, 94, 0.15); color: var(--success-400);">
                            <i class="fas fa-comments"></i>
                        </div>
                        <div class="list-item-content">
                            <div class="list-item-title">${t('profile.health_assistant')}</div>
                            <div class="list-item-subtitle">${t('profile.chat_subtitle')}</div>
                        </div>
                        <i class="fas fa-chevron-right list-item-action"></i>
                    </div>
                    <div class="list-item" data-route="questionnaire">
                        <div class="list-item-icon" style="background: rgba(124, 58, 237, 0.15); color: var(--primary-400);">
                            <i class="fas fa-clipboard-list"></i>
                        </div>
                        <div class="list-item-content">
                            <div class="list-item-title">${t('questionnaire.title')}</div>
                            <div class="list-item-subtitle">${t('questionnaire.subtitle')}</div>
                        </div>
                        <i class="fas fa-chevron-right list-item-action"></i>
                    </div>
                    <div class="list-item" data-route="research-questionnaire">
                        <div class="list-item-icon" style="background: rgba(14, 165, 233, 0.15); color: #0ea5e9;">
                            <i class="fas fa-flask"></i>
                        </div>
                        <div class="list-item-content">
                            <div class="list-item-title">Kuesioner Penelitian</div>
                            <div class="list-item-subtitle">PSP-5 · Hunger Scale · SEES-10</div>
                        </div>
                        <i class="fas fa-chevron-right list-item-action"></i>
                    </div>
                    <div class="list-item" onclick="CountryMusic.changeCountry()">
                        <div class="list-item-icon" style="background: rgba(168, 85, 247, 0.15); color: #a855f7;">
                            <i class="fas fa-music"></i>
                        </div>
                        <div class="list-item-content">
                            <div class="list-item-title">${I18n.currentLang === 'id' ? 'Musik Negara' : 'Country Music'}</div>
                            <div class="list-item-subtitle" id="profileCountrySubtitle">${I18n.currentLang === 'id' ? 'Pilih atau ganti musik tradisional' : 'Choose or change traditional music'}</div>
                        </div>
                        <i class="fas fa-chevron-right list-item-action"></i>
                    </div>
                    <div class="list-item" style="border-bottom: none;">
                        <div class="list-item-icon" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">
                            <i class="fas fa-globe"></i>
                        </div>
                        <div class="list-item-content">
                            <div class="list-item-title">${t('profile.language')}</div>
                            <div class="list-item-subtitle">${t('profile.select_language')}</div>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button onclick="I18n.setLang('id')" class="btn btn-sm ${I18n.currentLang === 'id' ? 'btn-primary' : 'btn-secondary'}" style="padding: 6px 12px; font-size: 0.75rem;">
                                ID
                            </button>
                            <button onclick="I18n.setLang('en')" class="btn btn-sm ${I18n.currentLang === 'en' ? 'btn-primary' : 'btn-secondary'}" style="padding: 6px 12px; font-size: 0.75rem;">
                                EN
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Admin Dashboard (only for admin role) -->
                <div id="adminMenuCard" class="card" style="padding: 0; overflow: hidden; margin-bottom: var(--space-4); display: none;">
                    <div class="list-item" onclick="Router.navigate('admin')" style="border-bottom: none; cursor: pointer;">
                        <div class="list-item-icon" style="background: linear-gradient(135deg, #7c3aed, #a855f7); color: white;">
                            <i class="fas fa-shield-halved"></i>
                        </div>
                        <div class="list-item-content">
                            <div class="list-item-title" style="color: var(--primary-500); font-weight: 700;">Admin Dashboard</div>
                            <div class="list-item-subtitle">${I18n.currentLang === 'id' ? 'Kelola sistem & data pengguna' : 'Manage system & user data'}</div>
                        </div>
                        <i class="fas fa-arrow-right" style="color: var(--primary-500);"></i>
                    </div>
                </div>

                <div class="card" style="padding: 0; overflow: hidden; margin-bottom: var(--space-6);">
                    <div class="list-item" onclick="confirmLogout()" style="border-bottom: none;">
                        <div class="list-item-icon" style="background: rgba(239, 68, 68, 0.15); color: var(--danger-400);">
                            <i class="fas fa-sign-out-alt"></i>
                        </div>
                        <div class="list-item-content">
                            <div class="list-item-title" style="color: var(--danger-400);">${t('profile.logout')}</div>
                            <div class="list-item-subtitle">${I18n.currentLang === 'id' ? 'Keluar dari akun Anda' : 'Sign out of your account'}</div>
                        </div>
                    </div>
                </div>

                <script>
                // Show admin menu only for admin users
                (async function() {
                    const user = auth.currentUser;
                    if (user) {
                        const userDoc = await db.collection('users').doc(user.uid).get();
                        if (userDoc.exists && userDoc.data().role === 'admin') {
                            const adminCard = document.getElementById('adminMenuCard');
                            if (adminCard) adminCard.style.display = 'block';
                        }
                    }
                })();
                </script>

                <!-- Version -->
                <div style="text-align: center; padding: var(--space-5); color: var(--text-muted); font-size: var(--text-xs);">
                    <p>SCENTRAVN v1.0.0</p>
                </div>
            </div>
        `;
    },

    /**
     * Synachat View - Modern AI Assistant Interface
     */
    synachat() {
        return `
            <div class="synachat-container">
                <!-- 3D Avatar Section with Premium Gradient -->
                <div class="synachat-avatar-section">
                    <!-- Premium Background Effects -->
                    <div class="synachat-bg-effects">
                        <div class="bg-gradient"></div>
                        <div class="floating-icon icon-1"><i class="fas fa-heart-pulse"></i></div>
                        <div class="floating-icon icon-2"><i class="fas fa-shield-heart"></i></div>
                        <div class="floating-icon icon-3"><i class="fas fa-brain"></i></div>
                        <div class="floating-icon icon-4"><i class="fas fa-sparkles"></i></div>
                    </div>

                    <!-- 3D Canvas Container -->
                    <div id="avatarCanvas" class="avatar-canvas">
                        <div class="avatar-loading">
                            <div class="loading-spinner"></div>
                            <p>${t('synachat.initializing')}</p>
                        </div>
                    </div>

                    <!-- Avatar Info Card - Glass Style -->
                    <div class="avatar-info">
                        <div class="avatar-name">
                            <i class="fas fa-sparkles"></i>
                            <span>${t('synachat.title')}</span>
                        </div>
                        <div class="avatar-status">
                            <span class="status-dot"></span>
                            <span id="avatarStatusText">${t('synachat.ready')}</span>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="synachat-action-btns">
                        <button id="ttsToggle" class="tts-toggle active" onclick="toggleTTS()" aria-label="Toggle voice">
                            <i class="fas fa-volume-high"></i>
                        </button>
                        <button class="tts-toggle" onclick="clearChat()" aria-label="Clear chat" title="${t('synachat.delete_tooltip')}">
                            <i class="fas fa-trash-can"></i>
                        </button>
                    </div>
                </div>

                <!-- Chat Section - Clean White -->
                <div class="synachat-chat-section">
                    <!-- Health Context Bar - Minimal -->
                    <div id="healthContext" class="health-context-bar">
                        <div class="health-context-label">
                            <i class="fas fa-activity"></i>
                            ${t('synachat.live_health')}
                        </div>
                        <div class="health-context-items">
                            <span><i class="fas fa-heart"></i> <span id="contextHr">--</span> bpm</span>
                            <span><i class="fas fa-droplet"></i> <span id="contextSpo2">--</span>%</span>
                            <span><i class="fas fa-wave-square"></i> <span id="contextStress">--</span>%</span>
                        </div>
                    </div>

                    <!-- Messages Container -->
                    <div id="messagesContainer" class="synachat-messages">
                        <!-- Welcome Message - Premium Design -->
                        <div id="welcomeMessage" class="welcome-message">
                            <div class="welcome-icon">
                                <img class="welcome-icon-img" src="images/ai.png" alt="Dr. ScentraVN Chat" width="80" height="80" loading="lazy">
                            </div>
                            <h3>${t('synachat.hello')}</h3>
                            <p>${t('synachat.welcome_msg')}</p>
                            <div class="quick-actions">
                                <button class="quick-action" onclick="sendQuickMessage('${t('synachat.qa_heart_msg')}')">
                                    <i class="fas fa-heart-pulse"></i>
                                    ${t('synachat.qa_heart')}
                                </button>
                                <button class="quick-action" onclick="sendQuickMessage('${t('synachat.qa_stress_msg')}')">
                                    <i class="fas fa-spa"></i>
                                    ${t('synachat.qa_stress')}
                                </button>
                                <button class="quick-action" onclick="sendQuickMessage('${t('synachat.qa_tips_msg')}')">
                                    <i class="fas fa-wand-magic-sparkles"></i>
                                    ${t('synachat.qa_tips')}
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Input Container - Floating Style -->
                    <div class="synachat-input-container">
                        <div class="input-wrapper">
                            <textarea
                                id="messageInput"
                                class="message-input"
                                placeholder="${t('synachat.placeholder')}"
                                rows="1"
                                onkeydown="handleKeyDown(event)"
                                oninput="autoResize(this)"
                                aria-label="Type your message"
                            ></textarea>
                            <button id="sendBtn" class="send-btn" onclick="sendMessage()" aria-label="Send message">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Sleep Lab View
     */
    sleep() {
        return `
            <div class="view-container" style="margin: 0 auto; padding-bottom: 80px;">
                <!-- Header -->
                <div class="health-hero" style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);">
                    <i class="fas fa-moon" style="font-size: 2.5rem; margin-bottom: 12px; color: #a5b4fc;"></i>
                    <div class="big-value" style="color: white; font-size: 3rem;"><span id="sleepScoreValue">--</span></div>
                    <div id="sleepScoreCategory" class="label" style="color: #c7d2fe;">${t('sleep.title')}</div>
                </div>

                <!-- Tips -->
                <div id="sleepTipsContainer"></div>

                <!-- Relaxation Audio -->
                <h3 class="section-title">${t('sleep.audio_title')}</h3>
                <div id="sleepAudioGrid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 8px;">
                    <div class="card sound-btn" data-sound="rain" style="text-align: center; cursor: pointer; padding: 16px; transition: all 0.3s;" onclick="SleepLab.playSound('rain')">
                        <i class="fas fa-cloud-rain" style="font-size: 1.5rem; color: var(--info-500); margin-bottom: 8px;"></i>
                        <div style="font-size: 0.8rem; font-weight: 600;">${t('sleep.audio_rain')}</div>
                    </div>
                    <div class="card sound-btn" data-sound="forest" style="text-align: center; cursor: pointer; padding: 16px; transition: all 0.3s;" onclick="SleepLab.playSound('forest')">
                        <i class="fas fa-tree" style="font-size: 1.5rem; color: var(--success-500); margin-bottom: 8px;"></i>
                        <div style="font-size: 0.8rem; font-weight: 600;">${t('sleep.audio_forest')}</div>
                    </div>
                    <div class="card sound-btn" data-sound="noise" style="text-align: center; cursor: pointer; padding: 16px; transition: all 0.3s;" onclick="SleepLab.playSound('noise')">
                        <i class="fas fa-water" style="font-size: 1.5rem; color: var(--primary-500); margin-bottom: 8px;"></i>
                        <div style="font-size: 0.8rem; font-weight: 600;">${t('sleep.audio_waves')}</div>
                    </div>
                </div>
                <!-- Volume Control -->
                <div id="sleepVolumeControl" style="display: none; padding: 0 4px; margin-bottom: 24px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-volume-down" style="color: var(--text-tertiary); font-size: 0.85rem;"></i>
                        <input type="range" id="sleepVolumeSlider" min="0" max="100" value="70" style="flex: 1; accent-color: var(--primary-500); height: 6px;" oninput="SleepLab.setVolume(this.value)">
                        <i class="fas fa-volume-up" style="color: var(--text-tertiary); font-size: 0.85rem;"></i>
                    </div>
                </div>

                <!-- Sleep Tracking -->
                <h3 class="section-title">🌙 Sleep Tracking</h3>
                <p style="font-size: 0.8rem; color: var(--text-tertiary); margin: -8px 0 12px;">Analisis pola tidur menggunakan IMU smartwatch + sensor hape</p>
                <div class="card" style="padding: 20px;">
                    <div id="sleepTrackingStatus" style="text-align: center; margin-bottom: 4px; font-weight: 600; color: var(--text-tertiary);"></div>
                    <div id="sleepTrackingMode" style="text-align: center; margin-bottom: 16px; font-size: 0.78rem; color: #8b5cf6; font-weight: 500;"></div>

                    <button id="startSleepTrackingBtn" onclick="SleepTracker.startTracking()"
                            style="width: 100%; padding: 14px; background: linear-gradient(135deg, #1e1b4b, #312e81);
                                   color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer;
                                   display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 8px;">
                        <i class="fas fa-play"></i>
                        <span>Mulai Sleep Tracking</span>
                    </button>

                    <button id="stopSleepTrackingBtn" onclick="SleepTracker.stopTracking()"
                            style="width: 100%; padding: 14px; background: linear-gradient(135deg, #dc2626, #ef4444);
                                   color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer;
                                   display: none; align-items: center; justify-content: center; gap: 8px;">
                        <i class="fas fa-stop"></i>
                        <span>Stop Tracking & Lihat Hasil</span>
                    </button>

                    <div style="margin-top: 12px; background: var(--bg-primary); border-radius: 10px; padding: 10px 12px;">
                        <div style="font-size: 0.73rem; color: var(--text-tertiary); line-height: 1.6;">
                            <div><i class="fas fa-watch" style="color:#8b5cf6;width:14px;"></i> Smartwatch terhubung → data tahap tidur + detak jantung</div>
                            <div><i class="fas fa-mobile-alt" style="color:#3b82f6;width:14px;"></i> Sensor hape → deteksi gangguan tidur (hape bergerak)</div>
                            <div><i class="fas fa-info-circle" style="color:#94a3b8;width:14px;"></i> Tracking bisa berjalan tanpa smartwatch (mode hape saja)</div>
                        </div>
                    </div>
                </div>

                <!-- Bedtime Checklist -->
                <h3 class="section-title">${t('sleep.routine_title')}</h3>
                <p style="font-size: 0.8rem; color: var(--text-tertiary); margin: -8px 0 12px;">${t('sleep.routine_hint')}</p>
                <div class="card" style="padding: 0; overflow: hidden;">
                    <div class="list-item" data-routine="bath" style="cursor: pointer;" onclick="SleepLab.toggleChecklist(this)">
                        <div class="list-item-icon" style="background: transparent; color: var(--text-tertiary);"><i class="far fa-circle"></i></div>
                        <div class="list-item-content">
                            <div class="list-item-title">${t('sleep.routine_bath')}</div>
                        </div>
                    </div>
                    <div class="list-item" data-routine="screen" style="cursor: pointer;" onclick="SleepLab.toggleChecklist(this)">
                        <div class="list-item-icon" style="background: transparent; color: var(--text-tertiary);"><i class="far fa-circle"></i></div>
                        <div class="list-item-content">
                            <div class="list-item-title">${t('sleep.routine_screen')}</div>
                        </div>
                    </div>
                    <div class="list-item" data-routine="drink" style="cursor: pointer; border-bottom: none;" onclick="SleepLab.toggleChecklist(this)">
                        <div class="list-item-icon" style="background: transparent; color: var(--text-tertiary);"><i class="far fa-circle"></i></div>
                        <div class="list-item-content">
                            <div class="list-item-title">${t('sleep.routine_drink')}</div>
                        </div>
                    </div>
                </div>

                <!-- Sleep History -->
                <div id="sleepHistoryContainer" style="margin-top: 24px;"></div>
            </div>
        `;
    },

    /**
     * Mood Booster View
     */
    moodbooster() {
        return `
            <div class="view-container" style="margin: 0 auto;">
                <div id="moodboosterContent">
                    <div style="text-align: center; padding: 40px 20px;">
                        <div class="loading-spinner" style="margin: 0 auto 16px;"></div>
                        <p style="color: var(--text-tertiary);">${t('moodbooster.loading')}</p>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Mindful Moment View
     */
    mindful() {
        return `
            <div class="view-container" style="margin: 0 auto; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-primary);">
                <div style="text-align: center; margin-bottom: 60px;">
                    <h2 style="font-size: 2rem; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">${t('mindful.title')}</h2>
                    <p style="color: var(--text-secondary);">${t('mindful.desc')}</p>
                </div>

                <div style="position: relative; width: 250px; height: 250px; display: flex; align-items: center; justify-content: center; margin-bottom: 60px;">
                    <div id="breathingCircle" style="position: absolute; width: 100px; height: 100px; background: rgba(16, 185, 129, 0.2); border-radius: 50%; border: 2px solid var(--success-500); box-shadow: 0 0 30px rgba(16, 185, 129, 0.4); z-index: 1;"></div>
                    <div id="breathingText" style="z-index: 2; font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">${t('mindful.start')}</div>
                </div>

                <button id="mindfulBtn" class="btn btn-primary" style="padding: 16px 32px; border-radius: 30px; font-size: 1.1rem; box-shadow: 0 10px 20px rgba(99, 102, 241, 0.3);" onclick="Mindful.toggle()">
                    <i class="fas fa-play"></i> ${t('mindful.start_breathing')}
                </button>
            </div>
        `;
    },

    /**
     * Journal View
     */
    journal() {
        // UI lengkap (badge sensor + mood selector + daftar) dirender oleh
        // Journal.renderJournalUI() ke dalam #journalContent (lihat js/journal.js).
        return `
            <div class="view-container" style="max-width: 700px; margin: 0 auto;">
                <div id="journalContent">
                    <div style="text-align: center; padding: 40px;"><div class="loading-spinner" style="margin:0 auto;"></div></div>
                </div>
            </div>
        `;
    },

    /**
     * Support Hub View
     */
    support() {
        return `
            <div class="view-container" style="margin: 0 auto;">
                <div id="supportContent">
                    <div style="text-align: center; padding: 40px 20px;">
                        <div class="loading-spinner" style="margin: 0 auto 16px;"></div>
                        <p style="color: var(--text-tertiary);">${t('support.loading')}</p>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Academy View
     */
    academy() {
        return `
            <div class="view-container" style="margin: 0 auto;">
                <div id="academyContent">
                    <div style="text-align: center; padding: 40px 20px;">
                        <div class="loading-spinner" style="margin: 0 auto 16px;"></div>
                        <p style="color: var(--text-tertiary);">${t('academy.loading')}</p>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Research Foundation View
     */
    research() {
        return `
            <div id="researchContent" style="padding:0;">
                <div style="text-align:center;padding:40px 20px;">
                    <div class="loading-spinner" style="margin:0 auto 16px;"></div>
                    <p style="color:var(--text-tertiary);">${t('research.loading')}</p>
                </div>
            </div>
        `;
    },

    /**
     * Games View - Modern & Professional Design
     */
    games() {
        return `
            <div class="games-page">
                <!-- Hero Header -->
                <div class="games-hero">
                    <div class="games-hero-bg"></div>
                    <div class="games-hero-content">
                        <div class="games-hero-icon">
                            <i class="fas fa-gamepad"></i>
                        </div>
                        <h1 class="games-hero-title">${t('games.title')}</h1>
                        <p class="games-hero-subtitle">${t('games.hero_subtitle')}</p>
                    </div>
                </div>

                <!-- Stats Overview -->
                <div class="games-stats-bar">
                    <div class="games-stat-item">
                        <i class="fas fa-trophy"></i>
                        <div class="games-stat-info">
                            <span class="games-stat-value" id="totalPointsDisplay">0</span>
                            <span class="games-stat-label">${t('games.total_points')}</span>
                        </div>
                    </div>
                    <div class="games-stat-item">
                        <i class="fas fa-fire"></i>
                        <div class="games-stat-info">
                            <span class="games-stat-value" id="currentStreak">0</span>
                            <span class="games-stat-label">${t('games.day_streak')}</span>
                        </div>
                    </div>
                    <div class="games-stat-item">
                        <i class="fas fa-gamepad"></i>
                        <div class="games-stat-info">
                            <span class="games-stat-value" id="gamesPlayed">0</span>
                            <span class="games-stat-label">${t('games.games_played')}</span>
                        </div>
                    </div>
                </div>

                <!-- Tab Navigation -->
                <div class="games-tabs">
                    <button class="games-tab active" data-tab="play" onclick="GamesModule.switchTab('play')">
                        <i class="fas fa-play"></i> ${t('games.tab_play')}
                    </button>
                    <button class="games-tab" data-tab="history" onclick="GamesModule.switchTab('history')">
                        <i class="fas fa-history"></i> ${t('games.tab_history')}
                    </button>
                    <button class="games-tab" data-tab="leaderboard" onclick="GamesModule.switchTab('leaderboard')">
                        <i class="fas fa-medal"></i> ${t('games.tab_leaderboard')}
                    </button>
                </div>

                <!-- Tab Content: Play -->
                <div id="tab-play" class="games-tab-content active">
                    <h3 class="games-section-title">${t('games.select_game')}</h3>
                    <div class="games-grid">
                        <!-- Breathing Game Card -->
                        <div class="game-card breathing-card" onclick="GamesModule.displayGame('breathing')">
                            <div class="game-card-glow"></div>
                            <div class="game-card-icon breathing-icon">
                                <i class="fas fa-wind"></i>
                            </div>
                            <div class="game-card-content">
                                <h4 class="game-card-title">${t('games.breathing_title')}</h4>
                                <p class="game-card-desc">${t('games.breathing_desc')}</p>
                                <div class="game-card-meta">
                                    <span><i class="fas fa-clock"></i> 2-5 ${t('games.minutes')}</span>
                                    <span><i class="fas fa-star"></i> +30 ${t('games.points')}</span>
                                </div>
                            </div>
                            <div class="game-card-play">
                                <i class="fas fa-play"></i>
                            </div>
                        </div>

                        <!-- Memory Game Card -->
                        <div class="game-card memory-card" onclick="GamesModule.displayGame('memory')">
                            <div class="game-card-glow"></div>
                            <div class="game-card-icon memory-icon">
                                <i class="fas fa-brain"></i>
                            </div>
                            <div class="game-card-content">
                                <h4 class="game-card-title">${t('games.memory_title')}</h4>
                                <p class="game-card-desc">${t('games.memory_desc')}</p>
                                <div class="game-card-meta">
                                    <span><i class="fas fa-clock"></i> ${t('games.varies')}</span>
                                    <span><i class="fas fa-star"></i> +15 ${t('games.points')}</span>
                                </div>
                            </div>
                            <div class="game-card-play">
                                <i class="fas fa-play"></i>
                            </div>
                        </div>

                        <!-- Daily Challenge Card -->
                        <div class="game-card challenge-card" onclick="GamesModule.displayGame('challenge')">
                            <div class="game-card-glow"></div>
                            <div class="game-card-icon challenge-icon">
                                <i class="fas fa-trophy"></i>
                            </div>
                            <div class="game-card-content">
                                <h4 class="game-card-title">${t('games.challenge_title')}</h4>
                                <p class="game-card-desc">${t('games.challenge_desc')}</p>
                                <div class="game-card-meta">
                                    <span><i class="fas fa-calendar-day"></i> ${t('games.daily')}</span>
                                    <span><i class="fas fa-star"></i> +10-30 ${t('games.points')}</span>
                                </div>
                            </div>
                            <div class="game-card-play">
                                <i class="fas fa-play"></i>
                            </div>
                        </div>

                        <!-- Focus Game Card -->
                        <div class="game-card focus-card" onclick="GamesModule.displayGame('focus')">
                            <div class="game-card-glow"></div>
                            <div class="game-card-icon focus-icon">
                                <i class="fas fa-bullseye"></i>
                            </div>
                            <div class="game-card-content">
                                <h4 class="game-card-title">${t('games.focus_title')}</h4>
                                <p class="game-card-desc">${t('games.focus_desc')}</p>
                                <div class="game-card-meta">
                                    <span><i class="fas fa-clock"></i> 25 ${t('games.minutes')}</span>
                                    <span><i class="fas fa-star"></i> +50 ${t('games.points')}</span>
                                </div>
                            </div>
                            <div class="game-card-play">
                                <i class="fas fa-play"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Tab Content: History -->
                <div id="tab-history" class="games-tab-content">
                    <h3 class="games-section-title">${t('games.history_title')}</h3>
                    <div id="gameHistoryList" class="game-history-list">
                        <div class="loading-placeholder">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>${t('games.loading_history')}</p>
                        </div>
                    </div>
                </div>

                <!-- Tab Content: Leaderboard -->
                <div id="tab-leaderboard" class="games-tab-content">
                    <h3 class="games-section-title">${t('games.leaderboard_title')}</h3>
                    <div id="leaderboardList" class="leaderboard-list">
                        <div class="loading-placeholder">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>${t('games.loading_leaderboard')}</p>
                        </div>
                    </div>
                </div>

                <!-- Game Display Area (Modal Style) -->
                <div id="gameModal" class="game-modal">
                    <div class="game-modal-content">
                        <button class="game-modal-close" onclick="GamesModule.closeGame()">
                            <i class="fas fa-times"></i>
                        </button>
                        <div id="gameDisplay"></div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Yoga Studio View
     */
    yoga() {
        return `
            <div class="view-container" style="margin: 0 auto; padding-top: 20px;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 24px;">
                    <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; box-shadow: 0 6px 20px rgba(20, 184, 166, 0.35);">
                        <i class="fas fa-spa" style="font-size: 1.75rem; color: white;"></i>
                    </div>
                    <h2 style="font-size: var(--text-2xl); font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${t('yoga.title')}</h2>
                    <p style="font-size: var(--text-sm); color: var(--text-tertiary);">${t('yoga.subtitle')}</p>
                </div>

                <!-- Search Bar -->
                <div class="yoga-search-wrapper">
                    <i class="fas fa-search yoga-search-icon"></i>
                    <input type="text" id="yogaSearch" class="yoga-search-bar" placeholder="${t('yoga.search')}">
                </div>

                <!-- Filter Bar -->
                <div class="yoga-filter-bar">
                    <div class="yoga-filter-group">
                        <button class="yoga-filter-btn active" data-level="all">${t('yoga.filter_all')}</button>
                        <button class="yoga-filter-btn" data-level="pemula">${t('yoga.filter_beginner')}</button>
                        <button class="yoga-filter-btn" data-level="menengah">${t('yoga.filter_intermediate')}</button>
                        <button class="yoga-filter-btn" data-level="ahli">${t('yoga.filter_advanced')}</button>
                    </div>
                    <select id="yogaCategoryFilter" class="yoga-category-select">
                        <option value="all">${t('yoga.filter_category')}</option>
                    </select>
                </div>

                <!-- Results -->
                <div id="yogaResults"></div>

                <!-- Detail Modal Container -->
                <div id="yogaPoseDetail" style="display: none;"></div>
            </div>
        `;
    },

    /**
     * Questionnaire View
     */
    questionnaire() {
        return `
            <div class="view-container">
                <div class="q-container">

                    <!-- Header -->
                    <div class="q-header-card">
                        <div class="q-header-logo">SCENTRAVN</div>
                        <div class="q-header-title">Kuesioner Pengujian Aplikasi</div>
                        <div class="q-header-subtitle">Bantu kami tingkatkan ScentraVN dengan mengisi kuesioner ini. Jawaban Anda sangat berharga!</div>
                    </div>

                    <!-- Progress -->
                    <div class="q-progress" id="qProgressSection">
                        <div class="q-progress-info">
                            <span class="q-progress-label" id="qProgressLabel">Informasi Responden</span>
                            <span class="q-progress-count" id="qProgressCount">1 / 9</span>
                        </div>
                        <div class="q-progress-track">
                            <div class="q-progress-fill" id="qProgressFill"></div>
                        </div>
                        <div class="q-step-dots" id="qStepDots"></div>
                    </div>

                    <!-- PAGE 0: Informasi Responden -->
                    <div class="q-page active" id="qpage-0">
                        <div class="q-badge"><i class="fas fa-user"></i> HALAMAN 1 DARI 9</div>
                        <div class="q-page-title">Informasi Responden</div>
                        <div class="q-page-desc">Isi data diri Anda. Data ini bersifat anonim dan hanya digunakan untuk keperluan analisis penelitian.</div>
                        <div class="q-page-error" id="qerror-0"><i class="fas fa-exclamation-circle"></i> <span></span></div>

                        <div class="q-form-group">
                            <label class="q-form-label">Nama / Inisial <span class="q-required">*</span></label>
                            <input type="text" class="q-form-input" id="resp-name" maxlength="50" placeholder="Contoh: AS atau Andi S.">
                        </div>
                        <div class="q-form-group">
                            <label class="q-form-label">Rentang Usia <span class="q-required">*</span></label>
                            <select class="q-form-select" id="resp-age">
                                <option value="">— Pilih usia —</option>
                                <option value="<18">&lt; 18 tahun</option>
                                <option value="18-24">18 – 24 tahun</option>
                                <option value="25-34">25 – 34 tahun</option>
                                <option value="35-44">35 – 44 tahun</option>
                                <option value="45+">45+ tahun</option>
                            </select>
                        </div>
                        <div class="q-form-group">
                            <label class="q-form-label">Jenis Kelamin <span class="q-required">*</span></label>
                            <select class="q-form-select" id="resp-gender">
                                <option value="">— Pilih —</option>
                                <option value="Laki-laki">Laki-laki</option>
                                <option value="Perempuan">Perempuan</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>
                        <div class="q-form-group">
                            <label class="q-form-label">Latar Belakang <span class="q-required">*</span></label>
                            <select class="q-form-select" id="resp-background">
                                <option value="">— Pilih —</option>
                                <option value="Mahasiswa">Mahasiswa</option>
                                <option value="Profesional">Profesional</option>
                                <option value="Tenaga Medis">Tenaga Medis</option>
                                <option value="Peneliti">Peneliti</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>
                        <div class="q-form-group">
                            <label class="q-form-label">Seberapa sering menggunakan aplikasi kesehatan? <span class="q-required">*</span></label>
                            <select class="q-form-select" id="resp-frequency">
                                <option value="">— Pilih —</option>
                                <option value="Tidak pernah">Tidak pernah</option>
                                <option value="Jarang">Jarang</option>
                                <option value="Kadang">Kadang-kadang</option>
                                <option value="Sering">Sering</option>
                                <option value="Setiap hari">Setiap hari</option>
                            </select>
                        </div>

                        <div class="q-btn-row">
                            <button class="q-btn q-btn-next" onclick="Questionnaire.nextPage()"><span>Mulai Kuesioner</span> <i class="fas fa-arrow-right"></i></button>
                        </div>
                    </div>

                    <!-- PAGE 1: SUS -->
                    <div class="q-page" id="qpage-1">
                        <div class="q-badge"><i class="fas fa-chart-simple"></i> BAGIAN A — HALAMAN 2 DARI 9</div>
                        <div class="q-page-title">System Usability Scale (SUS)</div>
                        <div class="q-page-desc">Berikan penilaian Anda terhadap kegunaan umum aplikasi ScentraVN. Skala: 1 = Sangat Tidak Setuju, 5 = Sangat Setuju.</div>
                        <div class="q-page-error" id="qerror-1"><i class="fas fa-exclamation-circle"></i> <span></span></div>
                        <div id="sus-questions"></div>
                        <div class="q-btn-row">
                            <button class="q-btn q-btn-back" onclick="Questionnaire.prevPage()"><i class="fas fa-arrow-left"></i> Kembali</button>
                            <button class="q-btn q-btn-next" onclick="Questionnaire.nextPage()"><span>Lanjut</span> <i class="fas fa-arrow-right"></i></button>
                        </div>
                    </div>

                    <!-- PAGE 2: UI/UX -->
                    <div class="q-page" id="qpage-2">
                        <div class="q-badge"><i class="fas fa-palette"></i> BAGIAN B — HALAMAN 3 DARI 9</div>
                        <div class="q-page-title">Kepuasan UI/UX & Fitur</div>
                        <div class="q-page-desc">Nilai pengalaman Anda terhadap tampilan dan fitur-fitur ScentraVN. Skala: 1 = Sangat Tidak Setuju, 5 = Sangat Setuju.</div>
                        <div class="q-page-error" id="qerror-2"><i class="fas fa-exclamation-circle"></i> <span></span></div>
                        <div id="uiux-questions"></div>
                        <div class="q-btn-row">
                            <button class="q-btn q-btn-back" onclick="Questionnaire.prevPage()"><i class="fas fa-arrow-left"></i> Kembali</button>
                            <button class="q-btn q-btn-next" onclick="Questionnaire.nextPage()"><span>Lanjut</span> <i class="fas fa-arrow-right"></i></button>
                        </div>
                    </div>

                    <!-- PAGE 3: TAM -->
                    <div class="q-page" id="qpage-3">
                        <div class="q-badge"><i class="fas fa-brain"></i> BAGIAN C — HALAMAN 4 DARI 9</div>
                        <div class="q-page-title">Technology Acceptance Model (TAM)</div>
                        <div class="q-page-desc">Nilai persepsi kegunaan dan kemudahan penggunaan ScentraVN. Skala: 1 = Sangat Tidak Setuju, 5 = Sangat Setuju.</div>
                        <div class="q-page-error" id="qerror-3"><i class="fas fa-exclamation-circle"></i> <span></span></div>
                        <div id="tam-questions"></div>
                        <div class="q-btn-row">
                            <button class="q-btn q-btn-back" onclick="Questionnaire.prevPage()"><i class="fas fa-arrow-left"></i> Kembali</button>
                            <button class="q-btn q-btn-next" onclick="Questionnaire.nextPage()"><span>Lanjut</span> <i class="fas fa-arrow-right"></i></button>
                        </div>
                    </div>

                    <!-- PAGE 4: UEQ -->
                    <div class="q-page" id="qpage-4">
                        <div class="q-badge"><i class="fas fa-sliders"></i> BAGIAN D — HALAMAN 5 DARI 9</div>
                        <div class="q-page-title">User Experience Questionnaire (UEQ)</div>
                        <div class="q-page-desc">Pilih angka yang paling menggambarkan pengalaman Anda. Skala 1–7 dari kata negatif ke positif.</div>
                        <div class="q-page-error" id="qerror-4"><i class="fas fa-exclamation-circle"></i> <span></span></div>
                        <div id="ueq-questions"></div>
                        <div class="q-btn-row">
                            <button class="q-btn q-btn-back" onclick="Questionnaire.prevPage()"><i class="fas fa-arrow-left"></i> Kembali</button>
                            <button class="q-btn q-btn-next" onclick="Questionnaire.nextPage()"><span>Lanjut</span> <i class="fas fa-arrow-right"></i></button>
                        </div>
                    </div>

                    <!-- PAGE 5: Trust -->
                    <div class="q-page" id="qpage-5">
                        <div class="q-badge"><i class="fas fa-shield-halved"></i> BAGIAN E — HALAMAN 6 DARI 9</div>
                        <div class="q-page-title">Kepercayaan & Privasi Data</div>
                        <div class="q-page-desc">Seberapa percaya Anda terhadap keamanan data di ScentraVN? Skala: 1 = Sangat Tidak Setuju, 5 = Sangat Setuju.</div>
                        <div class="q-page-error" id="qerror-5"><i class="fas fa-exclamation-circle"></i> <span></span></div>
                        <div id="trust-questions"></div>
                        <div class="q-btn-row">
                            <button class="q-btn q-btn-back" onclick="Questionnaire.prevPage()"><i class="fas fa-arrow-left"></i> Kembali</button>
                            <button class="q-btn q-btn-next" onclick="Questionnaire.nextPage()"><span>Lanjut</span> <i class="fas fa-arrow-right"></i></button>
                        </div>
                    </div>

                    <!-- PAGE 6: Therapeutic -->
                    <div class="q-page" id="qpage-6">
                        <div class="q-badge"><i class="fas fa-heart-pulse"></i> BAGIAN F — HALAMAN 7 DARI 9</div>
                        <div class="q-page-title">Nilai Terapeutik & Relevansi Konten</div>
                        <div class="q-page-desc">Seberapa bermanfaat konten dan fitur terapeutik ScentraVN? Skala: 1 = Sangat Tidak Setuju, 5 = Sangat Setuju.</div>
                        <div class="q-page-error" id="qerror-6"><i class="fas fa-exclamation-circle"></i> <span></span></div>
                        <div id="therapeutic-questions"></div>
                        <div class="q-btn-row">
                            <button class="q-btn q-btn-back" onclick="Questionnaire.prevPage()"><i class="fas fa-arrow-left"></i> Kembali</button>
                            <button class="q-btn q-btn-next" onclick="Questionnaire.nextPage()"><span>Lanjut</span> <i class="fas fa-arrow-right"></i></button>
                        </div>
                    </div>

                    <!-- PAGE 7: Engagement -->
                    <div class="q-page" id="qpage-7">
                        <div class="q-badge"><i class="fas fa-fire"></i> BAGIAN G — HALAMAN 8 DARI 9</div>
                        <div class="q-page-title">Keterlibatan & Motivasi Pengguna</div>
                        <div class="q-page-desc">Seberapa besar motivasi Anda untuk terus menggunakan ScentraVN? Skala: 1 = Sangat Tidak Setuju, 5 = Sangat Setuju.</div>
                        <div class="q-page-error" id="qerror-7"><i class="fas fa-exclamation-circle"></i> <span></span></div>
                        <div id="engagement-questions"></div>
                        <div class="q-btn-row">
                            <button class="q-btn q-btn-back" onclick="Questionnaire.prevPage()"><i class="fas fa-arrow-left"></i> Kembali</button>
                            <button class="q-btn q-btn-next" onclick="Questionnaire.nextPage()"><span>Lanjut</span> <i class="fas fa-arrow-right"></i></button>
                        </div>
                    </div>

                    <!-- PAGE 8: NPS + Open-Ended -->
                    <div class="q-page" id="qpage-8">
                        <div class="q-badge"><i class="fas fa-star"></i> BAGIAN H & I — HALAMAN 9 DARI 9</div>
                        <div class="q-page-title">Rekomendasi & Masukan Terbuka</div>
                        <div class="q-page-desc">Terakhir! Beri nilai rekomendasi dan sampaikan masukan Anda.</div>
                        <div class="q-page-error" id="qerror-8"><i class="fas fa-exclamation-circle"></i> <span></span></div>

                        <div class="q-divider">NET PROMOTER SCORE</div>
                        <div class="q-item" id="nps-item">
                            <div class="q-item-text">Seberapa besar kemungkinan Anda merekomendasikan ScentraVN kepada teman atau orang yang Anda kenal?</div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                                <span class="q-nps-hint">Sangat tidak mungkin</span>
                                <span class="q-nps-hint">Sangat mungkin</span>
                            </div>
                            <div class="q-nps" id="nps-scale"></div>
                        </div>

                        <div class="q-divider">PERTANYAAN TERBUKA (Opsional)</div>
                        <div class="q-form-group">
                            <label class="q-form-label">Fitur mana yang paling Anda sukai? Mengapa?</label>
                            <textarea class="q-form-textarea" id="open-liked" placeholder="Tulis jawaban Anda..." rows="3"></textarea>
                        </div>
                        <div class="q-form-group">
                            <label class="q-form-label">Fitur mana yang paling membingungkan atau sulit digunakan?</label>
                            <textarea class="q-form-textarea" id="open-confusing" placeholder="Tulis jawaban Anda..." rows="3"></textarea>
                        </div>
                        <div class="q-form-group">
                            <label class="q-form-label">Fitur apa yang belum ada namun Anda harapkan ada?</label>
                            <textarea class="q-form-textarea" id="open-missing" placeholder="Tulis jawaban Anda..." rows="3"></textarea>
                        </div>
                        <div class="q-form-group">
                            <label class="q-form-label">Bagaimana pendapat Anda tentang konsep smartwatch yang terhubung ke aplikasi ini?</label>
                            <textarea class="q-form-textarea" id="open-smartwatch" placeholder="Tulis jawaban Anda..." rows="3"></textarea>
                        </div>
                        <div class="q-form-group">
                            <label class="q-form-label">Saran atau masukan lain untuk pengembangan ScentraVN?</label>
                            <textarea class="q-form-textarea" id="open-suggestion" placeholder="Tulis jawaban Anda..." rows="3"></textarea>
                        </div>

                        <div class="q-btn-row">
                            <button class="q-btn q-btn-back" onclick="Questionnaire.prevPage()"><i class="fas fa-arrow-left"></i> Kembali</button>
                            <button class="q-btn q-btn-submit" id="qBtnSubmit" onclick="Questionnaire.submit()">
                                <span class="q-btn-text"><i class="fas fa-paper-plane"></i> Kirim Jawaban</span>
                                <div class="q-spinner"></div>
                            </button>
                        </div>
                    </div>

                    <!-- SUCCESS SCREEN -->
                    <div class="q-success" id="qSuccessScreen">
                        <div class="q-success-icon"><i class="fas fa-check"></i></div>
                        <div class="q-success-title">Terima Kasih!</div>
                        <div class="q-success-desc">
                            Jawaban Anda telah berhasil disimpan. Kontribusi Anda sangat berarti untuk pengembangan ScentraVN ke depannya.
                        </div>
                        <div class="q-success-id" id="qSuccessDocId"></div>
                        <br><br>
                        <button class="q-btn-reset" onclick="Questionnaire.reset()"><i class="fas fa-rotate-right"></i> Isi Lagi</button>
                        <div style="margin-top: 16px;">
                            <button class="q-btn q-btn-back" style="display: inline-flex; flex: none; padding: 12px 24px;" onclick="Router.navigate('dashboard')"><i class="fas fa-home"></i> Kembali ke Dashboard</button>
                        </div>
                    </div>

                </div>
            </div>
        `;
    },

    researchQuestionnaire() {
        return `
            <div class="view-container">
                <div class="rq-container">
                    <div class="rq-header">
                        <div class="rq-header-logo">SCENTRAVN RESEARCH</div>
                        <div class="rq-header-title">Kuesioner Penelitian Ground Truth</div>
                        <div class="rq-header-sub">PSP-5 · Hunger Scale · SEES-10 — Data untuk pengembangan model AI</div>
                    </div>

                    <div class="rq-progress" id="rq-progress-section">
                        <div class="rq-progress-info">
                            <span class="rq-progress-label" id="rq-progress-label">Data Responden</span>
                            <span class="rq-progress-count" id="rq-progress-count">1 / 3</span>
                        </div>
                        <div class="rq-progress-track">
                            <div class="rq-progress-fill" id="rq-progress-fill"></div>
                        </div>
                        <div class="rq-step-dots" id="rq-step-dots"></div>
                    </div>

                    <!-- PAGE 0: Data Responden -->
                    <div class="rq-page active" id="rq-page-0">
                        <div class="rq-badge"><i class="fas fa-user"></i> HALAMAN 1 DARI 3</div>
                        <div class="rq-page-title">Data Responden</div>
                        <div class="rq-page-desc">Data ini bersifat rahasia dan hanya digunakan untuk keperluan penelitian.</div>
                        <div class="rq-error" id="rq-error-0"><i class="fas fa-exclamation-circle"></i><span></span></div>

                        <div class="rq-form-group">
                            <label class="rq-form-label">Nama Responden <span class="rq-required">*</span></label>
                            <input type="text" class="rq-input" id="rq-nama" maxlength="80" placeholder="Nama lengkap atau inisial">
                        </div>
                        <div class="rq-form-group">
                            <label class="rq-form-label">Kode Responden <span class="rq-required">*</span></label>
                            <input type="text" class="rq-input" id="rq-kode" maxlength="20" placeholder="Kode yang diberikan peneliti">
                        </div>
                        <div class="rq-form-group">
                            <label class="rq-form-label">Riwayat Penyakit</label>
                            <textarea class="rq-textarea" id="rq-penyakit" placeholder="Contoh: Hipertensi, Diabetes (kosongkan jika tidak ada)"></textarea>
                        </div>
                        <div class="rq-form-group">
                            <label class="rq-form-label">Riwayat Obat</label>
                            <input type="text" class="rq-input" id="rq-obat" maxlength="200" placeholder="Obat yang sedang dikonsumsi (kosongkan jika tidak ada)">
                        </div>
                        <div class="rq-form-group">
                            <label class="rq-form-label">Riwayat Alergi</label>
                            <input type="text" class="rq-input" id="rq-alergi" maxlength="200" placeholder="Riwayat alergi (kosongkan jika tidak ada)">
                        </div>

                        <div class="rq-btn-row">
                            <button class="rq-btn rq-btn-next" onclick="ResearchQuestionnaire.nextPage()">
                                <i class="fas fa-arrow-right"></i> Lanjut ke PSP-5
                            </button>
                        </div>
                    </div>

                    <!-- PAGE 1: PSP-5 -->
                    <div class="rq-page" id="rq-page-1">
                        <div class="rq-badge"><i class="fas fa-smile"></i> HALAMAN 2 DARI 3</div>
                        <div class="rq-page-title">PSP-5 — Kondisi Emosi Saat Ini</div>
                        <div class="rq-page-desc">Silakan pilih angka yang paling menggambarkan kondisi emosi Anda saat ini.<br>Skala: 1 = Sangat Rendah &nbsp;&nbsp; 6 = Sangat Tinggi</div>
                        <div class="rq-error" id="rq-error-1"><i class="fas fa-exclamation-circle"></i><span></span></div>
                        <div id="rq-psp5"></div>
                        <div class="rq-btn-row">
                            <button class="rq-btn rq-btn-back" onclick="ResearchQuestionnaire.prevPage()">
                                <i class="fas fa-arrow-left"></i> Kembali
                            </button>
                            <button class="rq-btn rq-btn-next" onclick="ResearchQuestionnaire.nextPage()">
                                Lanjut <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>

                    <!-- PAGE 2: Hunger + SEES-10 -->
                    <div class="rq-page" id="rq-page-2">
                        <div class="rq-badge"><i class="fas fa-utensils"></i> HALAMAN 3 DARI 3</div>
                        <div class="rq-page-title">Hunger Scale & SEES-10</div>
                        <div class="rq-page-desc">Isi skala rasa lapar dan pola makan saat stress Anda saat ini.</div>
                        <div class="rq-error" id="rq-error-2"><i class="fas fa-exclamation-circle"></i><span></span></div>

                        <div class="rq-item" id="rq-hunger-item">
                            <div class="rq-item-num">HUNGER SCALE</div>
                            <div class="rq-item-text">Bagaimana rasa lapar anda saat ini? (1 = Lapar sekali, 10 = Sangat kenyang)</div>
                            <div class="rq-hunger" id="rq-hunger"></div>
                            <div style="display:flex;justify-content:space-between;margin-top:10px;font-size:11px;color:#94a3b8;">
                                <span>1 — Lapar sekali / lemas</span>
                                <span>10 — Sangat kenyang / mual</span>
                            </div>
                        </div>

                        <div class="rq-divider"><i class="fas fa-chart-bar"></i> SEES-10 — Pola Makan Saat Stress</div>
                        <p style="font-size:13px;color:#64748b;margin-bottom:16px;line-height:1.5;">Ketika saya menghadapi situasi berikut, bagaimana perubahan pola makan saya?<br>1 = Makan sangat lebih sedikit &nbsp; · &nbsp; 5 = Makan sangat lebih banyak</p>
                        <div id="rq-sees10"></div>

                        <div class="rq-btn-row">
                            <button class="rq-btn rq-btn-back" onclick="ResearchQuestionnaire.prevPage()">
                                <i class="fas fa-arrow-left"></i> Kembali
                            </button>
                            <button class="rq-btn rq-btn-submit" id="rq-submit-btn" onclick="ResearchQuestionnaire.submit()">
                                <div class="rq-spinner"></div>
                                <span class="rq-btn-text"><i class="fas fa-check"></i> Simpan Data</span>
                            </button>
                        </div>
                    </div>

                    <!-- Success Screen -->
                    <div class="rq-success" id="rq-success">
                        <div class="rq-success-icon"><i class="fas fa-check"></i></div>
                        <div class="rq-success-title">Data Berhasil Disimpan!</div>
                        <div class="rq-success-desc">Terima kasih telah berpartisipasi dalam penelitian ini.<br>Data Anda telah tersimpan dengan aman.</div>
                        <div class="rq-success-id" id="rq-success-id">ID Rekam: —</div>
                        <br>
                        <button class="rq-btn rq-btn-next" onclick="ResearchQuestionnaire.reset()" style="max-width:260px;margin:0 auto;">
                            <i class="fas fa-redo"></i> Isi Formulir Baru
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Admin Dashboard View - Embedded in SPA
     */
    admin() {
        const user = auth.currentUser;
        const userEmail = user ? user.email : 'Admin';

        return `
            <!-- Admin CSS -->
            <link rel="stylesheet" href="css/admin.css">
            <link rel="stylesheet" href="css/admin-layout.css">

            <style>
                /* FORCE HIDE USER UI */
                .bottom-nav {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                }

                .app-header {
                    display: none !important;
                    visibility: hidden !important;
                    opacity: 0 !important;
                    pointer-events: none !important;
                }

                .app-container {
                    padding-top: 0 !important;
                    padding-bottom: 0 !important;
                }

                /* Reset admin page styling */
                .view-container {
                    padding: 0 !important;
                    max-width: 100% !important;
                    margin: 0 !important;
                }

                /* Admin Navbar */
                .admin-navbar {
                    position: sticky;
                    top: 0;
                    z-index: 1000;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.15);
                    margin: 0;
                    padding: 0;
                }

                .admin-navbar-container {
                    max-width: 100%;
                    padding: 12px 32px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 24px;
                    flex-wrap: wrap;
                }

                .admin-brand {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: white;
                    cursor: pointer;
                    transition: transform 0.2s;
                }

                .admin-brand:hover {
                    transform: scale(1.02);
                }

                .admin-brand-icon {
                    width: 44px;
                    height: 44px;
                    background: rgba(255, 255, 255, 0.25);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.4rem;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                }

                .admin-brand-text h1 {
                    font-size: 1.35rem;
                    font-weight: 800;
                    margin: 0;
                    color: white;
                    letter-spacing: -0.5px;
                }

                .admin-brand-text p {
                    font-size: 0.75rem;
                    margin: 2px 0 0;
                    opacity: 0.85;
                    color: rgba(255, 255, 255, 0.9);
                }

                .admin-nav-links {
                    display: flex;
                    gap: 6px;
                    flex: 1;
                    justify-content: center;
                    flex-wrap: wrap;
                }

                .admin-nav-link {
                    padding: 10px 18px;
                    background: rgba(255, 255, 255, 0.12);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 10px;
                    color: white;
                    font-weight: 600;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    text-decoration: none;
                    white-space: nowrap;
                }

                .admin-nav-link:hover {
                    background: rgba(255, 255, 255, 0.22);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
                }

                .admin-nav-link.active {
                    background: rgba(255, 255, 255, 0.3);
                    border-color: rgba(255, 255, 255, 0.4);
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                }

                .admin-nav-actions {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .admin-user-info {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 14px;
                    background: rgba(255, 255, 255, 0.15);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 10px;
                    color: white;
                }

                .admin-user-avatar {
                    width: 34px;
                    height: 34px;
                    background: rgba(255, 255, 255, 0.3);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 0.95rem;
                }

                .admin-user-details {
                    display: flex;
                    flex-direction: column;
                    line-height: 1.3;
                }

                .admin-user-name {
                    font-size: 0.85rem;
                    font-weight: 700;
                }

                .admin-user-role {
                    font-size: 0.7rem;
                    opacity: 0.85;
                }

                .admin-btn {
                    padding: 10px 16px;
                    background: rgba(255, 255, 255, 0.18);
                    border: 1px solid rgba(255, 255, 255, 0.25);
                    border-radius: 10px;
                    color: white;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.9rem;
                }

                .admin-btn:hover {
                    background: rgba(255, 255, 255, 0.28);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
                }

                .admin-btn.logout {
                    background: rgba(239, 68, 68, 0.25);
                    border-color: rgba(239, 68, 68, 0.4);
                }

                .admin-btn.logout:hover {
                    background: rgba(239, 68, 68, 0.35);
                }

                /* Admin Content Area */
                #adminDashboardContent {
                    min-height: calc(100vh - 80px);
                    padding: 32px;
                    background: #f8fafc;
                    max-width: 1400px;
                    margin: 0 auto;
                }

                /* Mobile Responsive */
                @media (max-width: 968px) {
                    .admin-navbar-container {
                        padding: 12px 16px;
                    }

                    .admin-nav-links {
                        order: 3;
                        width: 100%;
                        justify-content: flex-start;
                        gap: 6px;
                    }

                    .admin-user-details {
                        display: none;
                    }

                    .admin-brand-text p {
                        display: none;
                    }

                    .admin-btn span {
                        display: none;
                    }

                    #adminDashboardContent {
                        padding: 20px 16px;
                    }
                }

                @media (max-width: 640px) {
                    .admin-user-info {
                        padding: 8px;
                    }

                    .admin-nav-link span {
                        display: none;
                    }

                    .admin-nav-link {
                        padding: 10px 12px;
                    }
                }
            </style>

            <!-- Modern Sidebar Layout -->
            <div class="admin-layout">
                <!-- Sidebar -->
                <aside class="admin-sidebar">
                    <!-- Header -->
                    <div class="admin-sidebar-header">
                        <div class="admin-logo" onclick="AdminUI.switchTab('dashboard')">
                            <div class="admin-logo-icon">
                                <i class="fas fa-shield-halved"></i>
                            </div>
                            <div class="admin-logo-text">
                                <h1>SCENTRAVN</h1>
                                <p>Admin Dashboard</p>
                            </div>
                        </div>
                    </div>

                    <!-- Navigation -->
                    <nav class="admin-sidebar-nav">
                        <div class="admin-nav-section">
                            <span class="admin-nav-label">Main Menu</span>
                            <div class="admin-nav-item active" data-tab="dashboard" onclick="AdminUI.switchTab('dashboard')">
                                <i class="fas fa-chart-line"></i>
                                <span>Dashboard</span>
                            </div>
                            <div class="admin-nav-item" data-tab="users" onclick="AdminUI.switchTab('users')">
                                <i class="fas fa-users"></i>
                                <span>Users</span>
                            </div>
                            <div class="admin-nav-item" data-tab="patients" onclick="AdminUI.switchTab('patients')">
                                <i class="fas fa-user-injured"></i>
                                <span>Patients</span>
                            </div>
                            <div class="admin-nav-item" data-tab="questionnaires" onclick="AdminUI.switchTab('questionnaires')">
                                <i class="fas fa-clipboard-list"></i>
                                <span>Questionnaires</span>
                            </div>
                            <div class="admin-nav-item" data-tab="notulen" onclick="AdminUI.switchTab('notulen')">
                                <i class="fas fa-notes-medical"></i>
                                <span>Notulen</span>
                            </div>
                            <div class="admin-nav-item" data-tab="alat-dataset" onclick="AdminUI.switchTab('alat-dataset')">
                                <i class="fas fa-microscope"></i>
                                <span>Alat Dataset</span>
                            </div>
                        </div>

                        <div class="admin-nav-section">
                            <span class="admin-nav-label">System</span>
                            <div class="admin-nav-item" onclick="Router.navigate('dashboard')">
                                <i class="fas fa-arrow-left"></i>
                                <span>Back to App</span>
                            </div>
                        </div>
                    </nav>

                    <!-- Footer -->
                    <div class="admin-sidebar-footer">
                        <div class="admin-user-card">
                            <div class="admin-user-avatar">
                                ${userEmail.split('@')[0].charAt(0).toUpperCase()}
                            </div>
                            <div class="admin-user-info">
                                <div class="admin-user-name">${userEmail.split('@')[0]}</div>
                                <div class="admin-user-role">Administrator</div>
                            </div>
                            <button class="admin-logout-btn" onclick="AdminUI.logout()" title="Logout">
                                <i class="fas fa-sign-out-alt"></i>
                            </button>
                        </div>
                    </div>
                </aside>

                <!-- Main Content -->
                <main class="admin-main">
                    <!-- Header -->
                    <header class="admin-header">
                        <div class="admin-header-left">
                            <h2>Dashboard</h2>
                            <div class="admin-breadcrumb">
                                <span><i class="fas fa-home"></i> Admin</span>
                                <i class="fas fa-chevron-right"></i>
                                <span id="currentPageName">Dashboard</span>
                            </div>
                        </div>
                        <div class="admin-header-right">
                            <div class="admin-search">
                                <i class="fas fa-search"></i>
                                <input type="text" placeholder="Search anything...">
                            </div>
                            <button class="admin-header-btn" onclick="location.reload()">
                                <i class="fas fa-sync-alt"></i>
                                <span>Refresh</span>
                            </button>
                        </div>
                    </header>

                    <!-- Content -->
                    <div id="adminDashboardContent">
                        <div style="text-align: center; padding: 100px 20px;">
                            <div class="loading-spinner" style="margin: 0 auto 24px; width: 50px; height: 50px;"></div>
                            <p style="color: #64748b; font-size: 1.1rem; font-weight: 500;">Loading Dashboard...</p>
                        </div>
                    </div>
                </main>
            </div>

            <script>
                // Logout function
                window.AdminUI = window.AdminUI || {};

                AdminUI.logout = async function() {
                    if (confirm('Are you sure you want to logout?')) {
                        try {
                            await auth.signOut();
                            window.location.href = 'auth.html';
                        } catch (error) {
                            console.error('Logout error:', error);
                            alert('Failed to logout: ' + error.message);
                        }
                    }
                };
            </script>
        `;
    },

    /**
     * BioLab — EEG (Muse) + PPG (MAX30102) integrated dashboard
     * with research-grade ML estimates (glucose, BP, HRV, sleep stage, FAA).
     */
    biolab() {
        return `
            <div class="view-container">
                <!-- HERO ---------------------------------------------------- -->
                <section class="aura-hero" style="margin-bottom: 24px;">
                    <div class="hero-row">
                        <div>
                            <div class="hero-greeting">BioLab · Research Mode</div>
                            <div class="hero-name">Brain &amp; Heart Insights</div>
                            <div class="hero-sub">EEG (Muse) + PPG (MAX30102) live processing</div>
                        </div>
                        <button class="hero-action" id="biolabConnectMuseBtn" type="button">
                            <i class="fab fa-bluetooth-b"></i> <span>Connect Muse</span>
                        </button>
                    </div>
                </section>

                <!-- DISCLAIMER ---------------------------------------------- -->
                <div class="glass-card" style="padding:14px 16px; margin-bottom: 20px; border-left: 3px solid #f59e0b;">
                    <p style="font-size: 0.78rem; color: #92400e; line-height: 1.55; font-weight: 500;">
                        <i class="fas fa-flask"></i> <strong>Research Grade.</strong>
                        Estimasi glukosa, tekanan darah, dan stage tidur di sini bersifat eksperimental,
                        tidak menggantikan alat medis tervalidasi. Jangan dipakai untuk diagnosis atau
                        keputusan pengobatan.
                    </p>
                </div>

                <!-- EEG SECTION --------------------------------------------- -->
                <div class="aura-section">
                    <span class="aura-section-title">EEG · Muse Sleep</span>
                    <span class="aura-section-link" id="museStatusBadge">disconnected</span>
                </div>

                <div class="metric-pills">
                    <div class="metric-pill">
                        <div class="pill-icon"><i class="fas fa-wave-square"></i></div>
                        <div class="pill-value"><span id="biolabSleepStage">—</span></div>
                        <div class="pill-label">Sleep stage</div>
                        <div class="pill-sub" id="biolabSleepDesc">AASM rule-based</div>
                    </div>
                    <div class="metric-pill">
                        <div class="pill-icon warning"><i class="fas fa-brain"></i></div>
                        <div class="pill-value"><span id="biolabFAA">—</span></div>
                        <div class="pill-label">Frontal α asym.</div>
                        <div class="pill-sub" id="biolabFAALabel">depression marker</div>
                    </div>
                    <div class="metric-pill">
                        <div class="pill-icon info"><i class="fas fa-bullseye"></i></div>
                        <div class="pill-value"><span id="biolabEngagement">—</span></div>
                        <div class="pill-label">Engagement</div>
                        <div class="pill-sub">β / (α + θ)</div>
                    </div>
                    <div class="metric-pill">
                        <div class="pill-icon success"><i class="fas fa-spa"></i></div>
                        <div class="pill-value"><span id="biolabMeditation">—</span></div>
                        <div class="pill-label">Meditation idx</div>
                        <div class="pill-sub">(α+θ)/(β+γ)</div>
                    </div>
                    <div class="metric-pill">
                        <div class="pill-icon"><i class="fas fa-face-smile"></i></div>
                        <div class="pill-value" style="font-size:1.1rem;"><span id="biolabMentalState">—</span></div>
                        <div class="pill-label">Mental state</div>
                        <div class="pill-sub" id="biolabMentalStateConf">real-EEG · 72%</div>
                    </div>
                    <div class="metric-pill">
                        <div class="pill-icon warning"><i class="fas fa-gauge-high"></i></div>
                        <div class="pill-value" style="font-size:1.1rem;"><span id="biolabCogLoad">—</span></div>
                        <div class="pill-label">Cognitive load</div>
                        <div class="pill-sub" id="biolabCogLoadConf">low conf · advisory</div>
                    </div>
                    <div class="metric-pill">
                        <div class="pill-icon success"><i class="fas fa-face-smile-beam"></i></div>
                        <div class="pill-value" style="font-size:1.1rem;"><span id="biolabEmotion">—</span></div>
                        <div class="pill-label">Emotion valence</div>
                        <div class="pill-sub" id="biolabEmotionConf">real-EEG · 93%</div>
                    </div>
                </div>

                <!-- BAND BAR CHART ------------------------------------------ -->
                <div class="glass-card" style="padding: 18px; margin-top: 18px;">
                    <h4 style="font-size: 0.95rem; color: #4c1d95; margin-bottom: 14px;">EEG Band Powers (frontal mean)</h4>
                    <div id="biolabBands" style="display:flex; flex-direction:column; gap: 8px;">
                        ${['delta','theta','alpha','smr','beta','gamma'].map(b => `
                            <div style="display:flex; align-items:center; gap:10px;">
                                <span style="width:54px; font-size:0.78rem; font-weight:700; color:#6d28d9; text-transform:uppercase;">${b}</span>
                                <div style="flex:1; height: 10px; background: rgba(124,58,237,0.08); border-radius: 99px; overflow:hidden;">
                                    <div id="bioBand-${b}" style="height:100%; width: 0%; background: linear-gradient(90deg, #8b5cf6, #c084fc); transition: width 0.4s;"></div>
                                </div>
                                <span id="bioBandVal-${b}" style="width:54px; text-align:right; font-size:0.78rem; color:#7c3aed; font-weight:600;">--</span>
                            </div>`).join('')}
                    </div>
                </div>

                <!-- SLEEP SESSION RECORDER ----------------------------------- -->
                <div class="aura-section">
                    <span class="aura-section-title">Sleep Session</span>
                    <span class="aura-section-link" id="sleepSessionStatus">idle</span>
                </div>

                <div class="glass-card" style="padding: 18px;">
                    <div style="display:flex; gap: 12px; align-items:center; flex-wrap: wrap;">
                        <button id="sleepStartBtn" class="hero-action" type="button"
                            style="background: linear-gradient(135deg,#7c3aed,#a855f7); border:none;">
                            <i class="fas fa-bed"></i> <span>Start sleep tracking</span>
                        </button>
                        <button id="sleepStopBtn" class="hero-action" type="button"
                            style="background: rgba(239,68,68,0.15); color:#ef4444; border:1px solid rgba(239,68,68,0.3); display:none;">
                            <i class="fas fa-stop"></i> <span>Stop &amp; save</span>
                        </button>
                        <span id="sleepLiveDuration" style="font-size:0.85rem; color:#7c3aed; font-weight:600;"></span>
                    </div>

                    <div id="sleepLivePanel" style="display:none; margin-top: 18px;">
                        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px;">
                            <div class="metric-pill" style="padding:12px;">
                                <div class="pill-label">Current stage</div>
                                <div class="pill-value" style="font-size: 1.2rem;"><span id="sleepCurStage">—</span></div>
                            </div>
                            <div class="metric-pill" style="padding:12px;">
                                <div class="pill-label">Epochs</div>
                                <div class="pill-value" style="font-size: 1.2rem;"><span id="sleepEpochCount">0</span></div>
                            </div>
                            <div class="metric-pill" style="padding:12px;">
                                <div class="pill-label">Elapsed</div>
                                <div class="pill-value" style="font-size: 1.2rem;"><span id="sleepElapsed">0m</span></div>
                            </div>
                        </div>

                        <!-- Live hypnogram -->
                        <div id="sleepLiveTimeline" style="margin-top:14px;"></div>

                        <p style="font-size: 0.75rem; color: #94a3b8; margin-top: 12px; line-height: 1.5;">
                            <i class="fas fa-info-circle"></i> Sleep stages diklasifikasi tiap 30 detik dari band-power frontal (AASM rule-based).
                            Hasil disimpan ke Firestore saat Stop ditekan.
                        </p>
                    </div>

                    <div id="sleepHistoryPanel" style="margin-top: 18px;">
                        <h5 style="font-size:0.85rem; color:#4c1d95; margin-bottom: 8px;">Recent sessions</h5>
                        <div id="sleepHistoryList" style="display:flex; flex-direction:column; gap:8px;">
                            <div style="color:#94a3b8; font-size:0.78rem;">Loading…</div>
                        </div>
                    </div>
                </div>

                <!-- PPG SECTION --------------------------------------------- -->
                <div class="aura-section">
                    <span class="aura-section-title">PPG · MAX30102 Derived</span>
                    <span class="aura-section-link" id="ppgQualityBadge">no signal</span>
                </div>

                <div class="metric-pills">
                    <div class="metric-pill">
                        <div class="pill-icon danger"><i class="fas fa-heart-pulse"></i></div>
                        <div class="pill-value"><span id="bioHr">--</span><sup>bpm</sup></div>
                        <div class="pill-label">Heart rate</div>
                        <div class="pill-sub">live</div>
                    </div>
                    <div class="metric-pill">
                        <div class="pill-icon"><i class="fas fa-chart-line"></i></div>
                        <div class="pill-value"><span id="bioRMSSD">--</span><sup>ms</sup></div>
                        <div class="pill-label">RMSSD</div>
                        <div class="pill-sub">parasympathetic</div>
                    </div>
                    <div class="metric-pill">
                        <div class="pill-icon"><i class="fas fa-wave-square"></i></div>
                        <div class="pill-value"><span id="bioSDNN">--</span><sup>ms</sup></div>
                        <div class="pill-label">SDNN</div>
                        <div class="pill-sub">overall HRV</div>
                    </div>
                    <div class="metric-pill">
                        <div class="pill-icon info"><i class="fas fa-percentage"></i></div>
                        <div class="pill-value"><span id="bioPNN50">--</span><sup>%</sup></div>
                        <div class="pill-label">pNN50</div>
                        <div class="pill-sub">vagal tone</div>
                    </div>
                    <div class="metric-pill">
                        <div class="pill-icon warning"><i class="fas fa-balance-scale"></i></div>
                        <div class="pill-value"><span id="bioLFHF">--</span></div>
                        <div class="pill-label">LF / HF</div>
                        <div class="pill-sub">autonomic balance</div>
                    </div>
                    <div class="metric-pill">
                        <div class="pill-icon success"><i class="fas fa-lungs"></i></div>
                        <div class="pill-value"><span id="bioRR">--</span><sup>br/min</sup></div>
                        <div class="pill-label">Respiratory rate</div>
                        <div class="pill-sub">amplitude mod.</div>
                    </div>
                    <div class="metric-pill">
                        <div class="pill-icon"><i class="fas fa-droplet"></i></div>
                        <div class="pill-value"><span id="bioPI">--</span><sup>%</sup></div>
                        <div class="pill-label">Perfusion idx</div>
                        <div class="pill-sub">AC/DC</div>
                    </div>
                    <div class="metric-pill">
                        <div class="pill-icon info"><i class="fas fa-signal"></i></div>
                        <div class="pill-value"><span id="bioSQ">--</span><sup>%</sup></div>
                        <div class="pill-label">Signal quality</div>
                        <div class="pill-sub">peak regularity</div>
                    </div>
                </div>

                <!-- ML ESTIMATES -------------------------------------------- -->
                <div class="aura-section">
                    <span class="aura-section-title">ML Estimates <span style="font-size:0.7rem; color:#f59e0b; font-weight:600;">· research grade</span></span>
                    <span style="display:flex; gap:10px; align-items:center;">
                        <span style="font-size:0.7rem; color:#7c3aed; font-weight:600;" id="mlStatusBadge">heuristic</span>
                        <button class="aura-section-link" id="biolabRefreshML" type="button">Recompute</button>
                    </span>
                </div>

                <div class="script-grid">
                    <div class="script-card" id="cardGlucose">
                        <div class="script-card-head">
                            <div class="icon"><i class="fas fa-droplet"></i></div>
                            <span class="edit" id="biolabGlucoseConf">conf —</span>
                        </div>
                        <div class="script-card-title"><span id="biolabGlucose">— mg/dL</span></div>
                        <div class="script-card-desc" id="biolabGlucoseBand">Heuristic from PPG morphology + HRV</div>
                    </div>
                    <div class="script-card" id="cardBP">
                        <div class="script-card-head">
                            <div class="icon"><i class="fas fa-stethoscope"></i></div>
                            <span class="edit" id="biolabBPConf">conf —</span>
                        </div>
                        <div class="script-card-title"><span id="biolabBP">— / —</span> mmHg</div>
                        <div class="script-card-desc" id="biolabBPBand">PPG rise time + AI surrogate</div>
                    </div>
                    <div class="script-card" id="cardVAge">
                        <div class="script-card-head">
                            <div class="icon"><i class="fas fa-hourglass-half"></i></div>
                            <span class="edit" id="biolabVAgeConf">conf —</span>
                        </div>
                        <div class="script-card-title"><span id="biolabVAge">—</span> yrs</div>
                        <div class="script-card-desc">Vascular age estimate</div>
                    </div>
                    <div class="script-card" id="cardStress">
                        <div class="script-card-head">
                            <div class="icon"><i class="fas fa-brain"></i></div>
                            <span class="edit" id="biolabStressConf">conf —</span>
                        </div>
                        <div class="script-card-title"><span id="biolabStress">—</span>%</div>
                        <div class="script-card-desc" id="biolabStressBand">EEG + HRV + GSR composite</div>
                    </div>
                </div>

                <!-- INFO ---------------------------------------------------- -->
                <div class="glass-card" style="padding: 16px; margin-top: 22px;">
                    <h4 style="font-size:0.9rem; color:#4c1d95; margin-bottom:8px;"><i class="fas fa-bolt"></i> Closed-loop interventions</h4>
                    <p style="font-size:0.78rem; color:#64748b; line-height:1.55; margin-bottom:12px;">
                        Saat EEG mendeteksi <strong>tertekan</strong>, <strong>beban kognitif berlebih</strong>, atau <strong>kantuk</strong> yang menetap (terkonfirmasi beberapa epoch berturut), app otomatis menyarankan intervensi (pernapasan, mindful, atau mood booster). Berbasis model MLP mental-state (97%) + cognitive-load (90%).
                    </p>
                    <div id="biolabInterventionLog" style="display:flex; flex-direction:column; gap:6px;">
                        <div style="color:#94a3b8; font-size:0.75rem;">Belum ada intervensi tercatat.</div>
                    </div>
                </div>

                <!-- ABOUT --------------------------------------------------- -->
                <div class="glass-card" style="padding: 16px; margin-top: 16px;">
                    <h4 style="font-size:0.9rem; color:#4c1d95; margin-bottom:8px;"><i class="fas fa-info-circle"></i> About this lab</h4>
                    <p style="font-size:0.8rem; color:#64748b; line-height:1.6;">
                        EEG bands (delta, theta, alpha, sigma/SMR, beta, gamma) di-FFT realtime dari 4 channel Muse (TP9, AF7, AF8, TP10).
                        PPG features (HRV time/freq-domain, pulse morphology, perfusion index) dihitung dari raw red+IR samples MAX30102 jika firmware mengirimkannya;
                        kalau tidak, jatuh ke mode degraded berbasis BPM events. Estimasi glucose/BP/vascular-age memakai heuristik literatur (lihat Salamea-Palacios 2025; Satter 2024)
                        dan akan otomatis di-upgrade saat model TF.js dimuat lewat <code>ScentraML.loadModel()</code>.
                    </p>
                </div>
            </div>
        `;
    },

    /**
     * Sleep Session view — record & review sleep sessions backed by Firestore.
     */
    sleepSession() {
        return `
            <div class="view-container">
                <section class="aura-hero" style="margin-bottom: 22px;">
                    <div class="hero-row">
                        <div>
                            <div class="hero-greeting">Sleep Session</div>
                            <div class="hero-name">Hypnogram &amp; History</div>
                            <div class="hero-sub">EEG-staged sleep epochs · synced to cloud</div>
                        </div>
                        <button class="hero-action" id="sleepSessionBtn" type="button">
                            <i class="fas fa-play"></i> <span>Start</span>
                        </button>
                    </div>
                </section>

                <!-- Live -->
                <div class="glass-card" id="sleepLivePanel" style="padding:18px; margin-bottom: 22px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                        <h4 style="font-size:0.95rem; color:#4c1d95;">Live session</h4>
                        <span id="sleepStatus" style="font-size:0.75rem; color:#64748b; font-weight:600;">idle</span>
                    </div>

                    <div style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px;">
                        <div>
                            <div style="font-size:0.7rem; color:#94a3b8; text-transform:uppercase; font-weight:600;">Elapsed</div>
                            <div id="sleepElapsed" style="font-size:1.2rem; font-weight:800; color:#4c1d95;">00:00</div>
                        </div>
                        <div>
                            <div style="font-size:0.7rem; color:#94a3b8; text-transform:uppercase; font-weight:600;">Epochs</div>
                            <div id="sleepEpochCount" style="font-size:1.2rem; font-weight:800; color:#4c1d95;">0</div>
                        </div>
                        <div>
                            <div style="font-size:0.7rem; color:#94a3b8; text-transform:uppercase; font-weight:600;">Current</div>
                            <div id="sleepCurrentStage" style="font-size:1.2rem; font-weight:800; color:#4c1d95;">—</div>
                        </div>
                        <div>
                            <div style="font-size:0.7rem; color:#94a3b8; text-transform:uppercase; font-weight:600;">Score</div>
                            <div id="sleepLiveScore" style="font-size:1.2rem; font-weight:800; color:#4c1d95;">—</div>
                        </div>
                    </div>

                    <!-- Hypnogram -->
                    <div style="font-size:0.7rem; color:#94a3b8; text-transform:uppercase; font-weight:600; margin-bottom:6px;">Hypnogram</div>
                    <div id="hypnogramTrack" style="position:relative; height:90px; background: rgba(124,58,237,0.05); border-radius: 14px; overflow: hidden; border: 1px solid var(--glass-border);"></div>
                    <div style="display:flex; justify-content:space-between; font-size:0.65rem; color:#94a3b8; margin-top:6px;">
                        <span>WAKE</span><span>REM</span><span>N1</span><span>N2</span><span>N3</span>
                    </div>
                </div>

                <!-- Stage distribution -->
                <div class="glass-card" id="sleepDistPanel" style="padding:18px; margin-bottom:22px; display:none;">
                    <h4 style="font-size:0.95rem; color:#4c1d95; margin-bottom:14px;">Stage distribution</h4>
                    <div id="sleepStageBars" style="display:flex; flex-direction:column; gap:8px;"></div>
                </div>

                <!-- History -->
                <div class="aura-section">
                    <span class="aura-section-title">Recent sessions</span>
                    <button class="aura-section-link" id="sleepRefreshBtn" type="button">Refresh</button>
                </div>
                <div id="sleepHistoryList" class="script-grid"></div>

                <div class="glass-card" style="padding:16px; margin-top: 22px; border-left: 3px solid #10b981;">
                    <p style="font-size:0.78rem; color:#065f46; line-height:1.55;">
                        <i class="fas fa-circle-check"></i> <strong>Tervalidasi data nyata.</strong>
                        Model sleep-stager dilatih & divalidasi pada Sleep-EDF (197 subjek, split subject-wise): akurasi <strong>~60%</strong>, macro-F1 0.56 untuk 5 stage dari single-channel frontal EEG. Realistis untuk perangkat consumer; bukan pengganti polisomnografi klinis.
                    </p>
                </div>
            </div>
        `;
    },

    /**
     * Aromatherapy Advisor — PSP-5 + Hunger + SEES-10 + EEG/PPG fusion
     * recommends a kemiri-based blend.
     */
    aroma() {
        const psp5Items = [
            { key: 'cheerfulness', q: 'Keceriaan Anda saat ini?' },
            { key: 'happiness',    q: 'Kebahagiaan Anda saat ini?' },
            { key: 'anger',        q: 'Rasa marah / frustrasi saat ini?' },
            { key: 'anxiety',      q: 'Rasa cemas / stres saat ini?' },
            { key: 'sadness',      q: 'Rasa sedih saat ini?' }
        ];
        const scale6 = ['Sangat rendah','Rendah','Sedikit rendah','Sedikit tinggi','Tinggi','Sangat tinggi'];

        const pspHtml = psp5Items.map(it => `
            <div class="glass-card" style="padding:14px 16px; margin-bottom:10px;">
                <div style="font-size:0.88rem; font-weight:600; color:#4c1d95; margin-bottom:10px;">${it.q}</div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    ${scale6.map((lbl,i) => `
                        <button type="button" class="aroma-opt" data-group="psp_${it.key}" data-val="${i+1}"
                            title="${lbl}"
                            style="flex:1; min-width:42px; padding:8px 4px; border-radius:10px; border:1px solid rgba(124,58,237,0.2); background:rgba(255,255,255,0.6); cursor:pointer; font-size:0.78rem; font-weight:700; color:#6d28d9;">
                            ${i+1}
                        </button>`).join('')}
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.62rem; color:#94a3b8; margin-top:4px;">
                    <span>Sangat rendah</span><span>Sangat tinggi</span>
                </div>
            </div>`).join('');

        const sees10Q = [
            'Ketika kewalahan/beban tugas banyak, saya makan…',
            'Pada saat sangat stres, saya makan…',
            'Ketika merasa keadaan di luar kendali, saya makan…',
            'Saat semua hal tidak sesuai harapan, saya makan…',
            'Saat mempersiapkan tugas berat, saya makan…',
            'Ketika di bawah tekanan, saya makan…',
            'Ketika cemas dan stres, saya makan…',
            'Ketika merasa tak berperan atas hal penting, saya makan…',
            'Ketika merasa tidak menguasai keadaan, saya makan…',
            'Ketika kesulitan menumpuk tinggi, saya makan…'
        ];
        const seesScale = ['Jauh lebih sedikit','Lebih sedikit','Seperti biasa','Lebih banyak','Jauh lebih banyak'];
        const seesHtml = sees10Q.map((q,idx) => `
            <div style="padding:10px 0; border-bottom:1px solid rgba(124,58,237,0.08);">
                <div style="font-size:0.8rem; color:#4c1d95; margin-bottom:8px;">${idx+1}. ${q}</div>
                <div style="display:flex; gap:5px;">
                    ${seesScale.map((lbl,i) => `
                        <button type="button" class="aroma-opt" data-group="sees_${idx}" data-val="${i+1}" title="${lbl}"
                            style="flex:1; padding:7px 2px; border-radius:8px; border:1px solid rgba(124,58,237,0.2); background:rgba(255,255,255,0.6); cursor:pointer; font-size:0.72rem; font-weight:700; color:#6d28d9;">${i+1}</button>`).join('')}
                </div>
            </div>`).join('');

        return `
            <div class="view-container">
                <section class="aura-hero" style="margin-bottom:22px;">
                    <div class="hero-row">
                        <div>
                            <div class="hero-greeting">Scentra · Aromaterapi</div>
                            <div class="hero-name">Aroma Advisor</div>
                            <div class="hero-sub">Rekomendasi blend berbasis emosi + biosignal</div>
                        </div>
                        <div class="hero-score-icon"><i class="fas fa-spray-can-sparkles"></i></div>
                    </div>
                </section>

                <div class="glass-card" style="padding:14px 16px; margin-bottom:18px; border-left:3px solid #f59e0b;">
                    <p style="font-size:0.78rem; color:#92400e; line-height:1.55; font-weight:500;">
                        <i class="fas fa-leaf"></i> <strong>Wellness komplementer.</strong> Aromaterapi (berbasis <strong>Minyak Kemiri</strong> sebagai carrier) bukan pengganti pengobatan medis. Lakukan patch-test, hindari kontak mata, jangan ditelan, dan konsultasikan bila hamil/asma/epilepsi.
                    </p>
                </div>

                <div class="aura-section"><span class="aura-section-title">PSP-5 · Profil Emosi</span></div>
                ${pspHtml}

                <div class="aura-section"><span class="aura-section-title">Hunger Scale (1–10)</span></div>
                <div class="glass-card" style="padding:16px;">
                    <input type="range" id="aromaHunger" min="1" max="10" value="5" step="1"
                        style="width:100%; accent-color:#7c3aed;">
                    <div style="display:flex; justify-content:space-between; font-size:0.65rem; color:#94a3b8; margin-top:6px;">
                        <span>1 · Sangat lapar</span><span id="aromaHungerVal" style="color:#7c3aed; font-weight:700;">5</span><span>10 · Sangat kenyang</span>
                    </div>
                </div>

                <div class="aura-section">
                    <span class="aura-section-title">SEES-10 · Emotional Eating</span>
                    <button class="aura-section-link" id="aromaToggleSees" type="button">Tampilkan</button>
                </div>
                <div class="glass-card" id="aromaSeesPanel" style="padding:16px; display:none;">
                    ${seesHtml}
                </div>

                <div class="glass-card" style="padding:14px 16px; margin-top:14px;">
                    <div style="font-size:0.8rem; color:#4c1d95; font-weight:600;">
                        <i class="fas fa-wave-square"></i> Biosignal live
                        <span id="aromaBioState" style="font-weight:500; color:#7c3aed;"> — menunggu EEG/PPG</span>
                    </div>
                    <p style="font-size:0.72rem; color:#94a3b8; margin-top:4px;">EEG mental-state &amp; PPG stress otomatis disertakan jika BioLab/Muse aktif.</p>
                </div>

                <button id="aromaRecommendBtn" class="btn btn-primary" type="button"
                    style="width:100%; margin-top:18px; padding:16px; border-radius:16px; justify-content:center; font-size:1.05rem;">
                    <i class="fas fa-flask"></i> Analisis &amp; Rekomendasikan Blend
                </button>

                <div id="aromaResult" style="margin-top:22px;"></div>

                <div class="aura-section" style="margin-top:28px;"><span class="aura-section-title">Pustaka Aroma</span></div>
                <div id="aromaLibrary" class="card-grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px;"></div>
            </div>
        `;
    },

    /**
     * Model Card — transparent AI accuracy disclosure to the user.
     */
    modelCard() {
        return `
            <div class="view-container">
                <section class="aura-hero" style="margin-bottom:22px;">
                    <div class="hero-row">
                        <div>
                            <div class="hero-greeting">Transparansi AI</div>
                            <div class="hero-name">Model Card</div>
                            <div class="hero-sub">Akurasi & batasan tiap model — jujur apa adanya</div>
                        </div>
                        <div class="hero-score-icon"><i class="fas fa-shield-halved"></i></div>
                    </div>
                </section>

                <div class="glass-card" style="padding:14px 16px; margin-bottom:18px; border-left:3px solid #6366f1;">
                    <p style="font-size:0.8rem; color:#3730a3; line-height:1.6;">
                        <i class="fas fa-circle-info"></i> Kami percaya transparansi. Halaman ini menampilkan akurasi nyata setiap model AI di ScentraVN — termasuk yang masih lemah. Semua estimasi kesehatan bersifat <strong>wellness/eksperimental</strong>, bukan diagnosis medis.
                    </p>
                </div>

                <div id="modelCardList" style="display:flex; flex-direction:column; gap:14px;"></div>

                <div class="aura-section" style="margin-top:26px;"><span class="aura-section-title">Komponen Signal Processing (bukan ML)</span></div>
                <div class="glass-card" style="padding:16px;">
                    <p style="font-size:0.75rem; color:#64748b; margin-bottom:12px; line-height:1.5;">Metrik ini dihitung dengan signal processing (DSP), bukan machine learning — jadi akurasinya tinggi & deterministik.</p>
                    <div id="dspList" style="display:flex; flex-direction:column; gap:8px;"></div>
                </div>

                <div class="glass-card" style="padding:16px; margin-top:18px; border-left:3px solid #f59e0b;">
                    <p style="font-size:0.76rem; color:#92400e; line-height:1.6;">
                        <i class="fas fa-triangle-exclamation"></i> <strong>Disclaimer.</strong> ScentraVN adalah alat wellness, bukan perangkat medis. Jangan gunakan estimasi glukosa, tekanan darah, atau stage tidur untuk diagnosis, dosis obat, atau menggantikan pemeriksaan klinis.
                    </p>
                </div>
            </div>
        `;
    },

    /**
     * RAW Data Recorder — multi-device synchronized capture & export.
     */
    rawRecorder() {
        const dev = (id, name, icon, sensors) => `
            <div class="rr-dev" id="rawDevCard-${id}">
                <div class="rr-dev-hd">
                    <div class="rr-dev-ic">${icon.startsWith('img:')
                        ? `<img src="${icon.slice(4)}" alt="${name}">`
                        : `<i class="fas ${icon}"></i>`}</div>
                    <div class="rr-dev-main">
                        <div class="rr-dev-name">${name}</div>
                        <div class="rr-dev-sensors">${sensors}</div>
                    </div>
                    <span class="rr-dev-status" id="rawDev-${id}-status"><span class="rr-dot"></span> Terputus</span>
                </div>
                <div class="rr-live" id="rawLive-${id}"></div>
                <div class="rr-dev-hint" id="rawHint-${id}" style="display:none;"></div>
                <div class="rr-dev-foot"><span class="rr-dev-count" id="rawDev-${id}-count">0 frame</span></div>
            </div>`;

        return `
            <div class="rr-wrap">
                <style>
                    .rr-wrap{padding:14px 14px 30px;display:flex;flex-direction:column;gap:16px;max-width:560px;margin:0 auto;}
                    .rr-top{display:flex;align-items:center;justify-content:space-between;gap:10px;}
                    .rr-title{font-size:1.25rem;font-weight:800;color:#4c1d95;display:flex;align-items:center;gap:9px;}
                    .rr-title i{color:#7c3aed;}
                    .rr-hist-link{display:inline-flex;align-items:center;gap:6px;font-size:0.74rem;font-weight:700;color:#7c3aed;background:rgba(124,58,237,0.1);padding:8px 13px;border-radius:99px;border:none;cursor:pointer;}

                    /* ── Hero status / timer ── */
                    .rr-hero{position:relative;overflow:hidden;border-radius:22px;padding:24px 20px;color:#fff;
                        background:linear-gradient(135deg,#6d28d9 0%,#9333ea 60%,#a855f7 100%);
                        box-shadow:0 14px 36px rgba(109,40,217,0.34);text-align:center;}
                    .rr-hero::after{content:"";position:absolute;inset:0;background:radial-gradient(120% 90% at 50% -10%,rgba(255,255,255,0.28),transparent 60%);pointer-events:none;}
                    .rr-statuspill{position:relative;display:inline-flex;align-items:center;gap:8px;font-size:0.74rem;font-weight:700;
                        background:rgba(255,255,255,0.18);padding:6px 14px;border-radius:99px;backdrop-filter:blur(4px);letter-spacing:.02em;}
                    .rr-statuspill .sdot{width:9px;height:9px;border-radius:50%;background:#cbd5e1;}
                    .rr-statuspill.rec .sdot{background:#fca5a5;box-shadow:0 0 0 0 rgba(252,165,165,.7);animation:rrPulse 1.4s infinite;}
                    .rr-statuspill.pause .sdot{background:#fcd34d;}
                    @keyframes rrPulse{0%{box-shadow:0 0 0 0 rgba(252,165,165,.6)}70%{box-shadow:0 0 0 9px rgba(252,165,165,0)}100%{box-shadow:0 0 0 0 rgba(252,165,165,0)}}
                    .rr-timer{position:relative;font-size:3rem;font-weight:800;line-height:1.05;margin:14px 0 4px;font-variant-numeric:tabular-nums;letter-spacing:.01em;}
                    .rr-timer-sub{position:relative;font-size:0.78rem;opacity:.85;font-weight:600;}

                    /* ── Controls ── */
                    .rr-controls{display:flex;align-items:center;justify-content:center;gap:26px;margin-top:8px;}
                    .rr-rec-btn{width:84px;height:84px;border-radius:50%;border:none;cursor:pointer;color:#fff;font-size:2rem;
                        background:linear-gradient(135deg,#7c3aed,#a855f7);box-shadow:0 10px 26px rgba(124,58,237,.45);
                        display:flex;align-items:center;justify-content:center;transition:transform .12s ease,box-shadow .2s ease;}
                    .rr-rec-btn:active{transform:scale(.93);}
                    .rr-rec-btn.is-rec{background:linear-gradient(135deg,#f59e0b,#f97316);box-shadow:0 10px 26px rgba(245,158,11,.45);}
                    .rr-rec-btn:disabled{opacity:.6;cursor:default;}
                    .rr-stop-btn{width:66px;height:66px;border-radius:50%;cursor:pointer;color:#fff;font-size:1.4rem;
                        background:linear-gradient(135deg,#ef4444,#dc2626);box-shadow:0 10px 24px rgba(239,68,68,.42);border:none;
                        display:none;align-items:center;justify-content:center;transition:transform .12s ease;}
                    .rr-stop-btn:active{transform:scale(.93);}
                    .rr-ctrl-label{font-size:0.62rem;font-weight:700;opacity:.8;margin-top:7px;text-transform:uppercase;letter-spacing:.06em;text-align:center;}
                    .rr-ctrl-cell{display:flex;flex-direction:column;align-items:center;}

                    /* ── Stats row ── */
                    .rr-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
                    .rr-stat{background:#fff;border:1px solid rgba(124,58,237,0.1);border-radius:16px;padding:13px 8px;text-align:center;box-shadow:0 4px 14px rgba(76,29,149,.05);}
                    .rr-stat .v{font-size:1.3rem;font-weight:800;color:#4c1d95;line-height:1;font-variant-numeric:tabular-nums;}
                    .rr-stat .l{font-size:0.62rem;color:#94a3b8;font-weight:700;margin-top:5px;text-transform:uppercase;letter-spacing:.04em;}

                    /* ── Draft banner ── */
                    .rr-draft{display:none;align-items:center;gap:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:16px;padding:13px 15px;}
                    .rr-draft i.dic{color:#d97706;font-size:1.2rem;}
                    .rr-draft .dtxt{flex:1;font-size:0.76rem;color:#92400e;line-height:1.45;}
                    .rr-draft .dbtns{display:flex;gap:7px;flex-wrap:wrap;}
                    .rr-draft button{font-size:0.7rem;font-weight:700;border:none;border-radius:99px;padding:7px 12px;cursor:pointer;}

                    /* ── Device cards (live raw monitor) ── */
                    .rr-sec{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:2px 2px -2px;}
                    .rr-sec-title{font-size:0.74rem;font-weight:800;color:#64748b;text-transform:uppercase;letter-spacing:.05em;}
                    .rr-sec-link{font-size:0.7rem;font-weight:700;color:#7c3aed;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:5px;}
                    .rr-dev{background:#fff;border:1px solid rgba(124,58,237,0.1);border-radius:16px;padding:14px;box-shadow:0 4px 14px rgba(76,29,149,.05);transition:border-color .2s;}
                    .rr-dev.on{border-color:rgba(34,197,94,.4);}
                    .rr-dev-hd{display:flex;align-items:center;gap:12px;}
                    .rr-dev-ic{width:46px;height:46px;flex-shrink:0;border-radius:13px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.15rem;}
                    .rr-dev-ic img{width:28px;height:28px;object-fit:contain;filter:brightness(0) invert(1) drop-shadow(0 0 2px rgba(255,255,255,0.5));}
                    .rr-dev-main{flex:1;min-width:0;}
                    .rr-dev-name{font-size:0.9rem;font-weight:800;color:#1e293b;}
                    .rr-dev-sensors{font-size:0.64rem;color:#94a3b8;line-height:1.35;margin-top:2px;}
                    .rr-dev-status{display:inline-flex;align-items:center;gap:6px;font-size:0.68rem;font-weight:700;color:#94a3b8;white-space:nowrap;flex-shrink:0;}
                    .rr-dev-status .rr-dot{width:8px;height:8px;border-radius:50%;background:#cbd5e1;}
                    .rr-dev-status.on{color:#15803d;} .rr-dev-status.on .rr-dot{background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.16);}
                    .rr-live{display:grid;grid-template-columns:repeat(auto-fill,minmax(56px,1fr));gap:7px;margin-top:12px;}
                    .rr-cell{background:#faf8ff;border:1px solid rgba(124,58,237,.08);border-radius:10px;padding:7px 4px;text-align:center;}
                    .rr-cell .k{font-size:0.52rem;color:#94a3b8;font-weight:800;text-transform:uppercase;letter-spacing:.02em;}
                    .rr-cell .v{font-size:0.82rem;color:#4c1d95;font-weight:800;font-variant-numeric:tabular-nums;margin-top:3px;line-height:1;}
                    .rr-cell .v.live{color:#16a34a;}
                    .rr-dev-hint{margin-top:11px;font-size:0.7rem;color:#94a3b8;display:flex;align-items:center;gap:6px;flex-wrap:wrap;background:#f8fafc;border-radius:10px;padding:9px 11px;}
                    .rr-dev-hint a{color:#7c3aed;font-weight:700;cursor:pointer;text-decoration:none;}
                    .rr-dev-foot{display:flex;align-items:center;justify-content:flex-end;margin-top:9px;}
                    .rr-dev-count{font-size:0.66rem;font-weight:700;color:#7c3aed;}

                    /* ── Export ── */
                    .rr-card{background:#fff;border:1px solid rgba(124,58,237,0.1);border-radius:18px;padding:16px;box-shadow:0 4px 14px rgba(76,29,149,.05);}
                    .rr-info-btn{width:100%;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-size:0.8rem;font-weight:700;padding:13px;border-radius:14px;border:1px solid rgba(124,58,237,0.12);cursor:pointer;background:rgba(124,58,237,0.06);color:#6d28d9;transition:background .18s;}
                    .rr-info-btn:hover{background:rgba(124,58,237,0.14);}
                </style>

                <div class="rr-top">
                    <div class="rr-title"><i class="fas fa-record-vinyl"></i> RAW Recorder</div>
                    <button class="rr-hist-link" type="button" onclick="Router.navigate('recordhistory')"><i class="fas fa-clock-rotate-left"></i> Riwayat</button>
                </div>

                <!-- Draft banner -->
                <div class="rr-draft" id="rawDraftBanner">
                    <i class="fas fa-floppy-disk dic"></i>
                    <div class="dtxt" id="rawDraftText">Ada rekaman tersimpan sementara di perangkat.</div>
                    <div class="dbtns">
                        <button id="rawDraftSave" style="background:#10b981;color:#fff;">Simpan ke Cloud</button>
                        <button id="rawDraftDiscard" style="background:#fee2e2;color:#b91c1c;">Buang</button>
                    </div>
                </div>

                <!-- Hero timer + controls -->
                <div class="rr-hero">
                    <span class="rr-statuspill" id="rawStatusPill"><span class="sdot"></span> <span id="rawStatus">Siap merekam</span></span>
                    <div class="rr-timer" id="rawDuration">00:00</div>
                    <div class="rr-timer-sub" id="rawRawCount">Belum ada data</div>
                    <div class="rr-controls">
                        <div class="rr-ctrl-cell">
                            <button class="rr-rec-btn" id="rawRecordBtn" type="button" aria-label="Rekam"><i class="fas fa-play"></i></button>
                            <span class="rr-ctrl-label" id="rawRecordLabel">Mulai</span>
                        </div>
                        <div class="rr-ctrl-cell">
                            <button class="rr-stop-btn" id="rawStopBtn" type="button" aria-label="Stop"><i class="fas fa-stop"></i></button>
                            <span class="rr-ctrl-label" id="rawStopLabel" style="display:none;">Stop &amp; Simpan</span>
                        </div>
                    </div>
                </div>

                <!-- Stats -->
                <div class="rr-stats">
                    <div class="rr-stat"><div class="v" id="rawTotal">0</div><div class="l">Total frame</div></div>
                    <div class="rr-stat"><div class="v" id="rawStatRaw">0</div><div class="l">EEG mentah</div></div>
                    <div class="rr-stat"><div class="v" id="rawStatDev">0/3</div><div class="l">Perangkat</div></div>
                </div>

                <!-- Devices: live raw-data monitor -->
                <div class="rr-sec">
                    <span class="rr-sec-title">Data Mentah Langsung</span>
                    <a class="rr-sec-link" onclick="Router.navigate('health')"><i class="fas fa-bluetooth-b"></i> Sambungkan di Health</a>
                </div>
                <div style="display:flex;flex-direction:column;gap:11px;">
                    ${dev('muse', 'Muse S Gen 2', 'fa-brain', 'Gelombang otak (EEG) · gerakan kepala')}
                    ${dev('scentra', 'ScentraVN Watch', 'fa-microchip', 'Detak jantung · SpO₂ · suhu · gerakan · respons kulit')}
                    ${dev('galaxy', 'Galaxy Watch', 'img:images/smartwatch.png', 'Detak jantung · stres · baterai — lewat aplikasi ScentraVN')}
                </div>

                <button class="rr-info-btn" type="button" onclick="Router.navigate('recordhistory')"><i class="fas fa-clock-rotate-left"></i> Lihat Riwayat Rekaman</button>
            </div>
        `;
    },

    /**
     * Recording History View — list saved RAW recordings, download to Excel/JSON.
     */
    recordHistory() {
        return `
            <div class="rh-wrap">
                <style>
                    .rh-wrap{padding:14px 14px 30px;display:flex;flex-direction:column;gap:16px;max-width:920px;margin:0 auto;}
                    .rh-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
                    .rh-title{font-size:1.25rem;font-weight:800;color:#4c1d95;display:flex;align-items:center;gap:9px;}
                    .rh-title i{color:#7c3aed;}
                    .rh-actions{display:flex;gap:8px;flex-wrap:wrap;}
                    .rh-btn{display:inline-flex;align-items:center;gap:7px;font-size:0.76rem;font-weight:700;padding:9px 15px;border-radius:99px;border:none;cursor:pointer;background:rgba(124,58,237,0.1);color:#6d28d9;transition:background .18s;}
                    .rh-btn:hover{background:rgba(124,58,237,0.18);}
                    .rh-btn.primary{background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;}

                    /* summary strip */
                    .rh-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
                    .rh-sum{background:#fff;border:1px solid rgba(124,58,237,0.1);border-radius:16px;padding:14px;box-shadow:0 4px 14px rgba(76,29,149,.05);text-align:center;}
                    .rh-sum .v{font-size:1.35rem;font-weight:800;color:#4c1d95;line-height:1;font-variant-numeric:tabular-nums;}
                    .rh-sum .l{font-size:0.62rem;color:#94a3b8;font-weight:700;margin-top:5px;text-transform:uppercase;letter-spacing:.04em;}

                    /* list / grid */
                    .rh-grid{display:grid;grid-template-columns:1fr;gap:13px;}
                    @media(min-width:680px){ .rh-grid{grid-template-columns:1fr 1fr;} }

                    .rh-card{background:#fff;border:1px solid rgba(124,58,237,0.1);border-radius:18px;padding:16px;box-shadow:0 5px 18px rgba(76,29,149,.06);display:flex;flex-direction:column;gap:12px;transition:transform .15s ease,box-shadow .2s ease;}
                    .rh-card:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(76,29,149,.12);}
                    .rh-card-top{display:flex;align-items:flex-start;gap:12px;}
                    .rh-card-ic{width:44px;height:44px;flex-shrink:0;border-radius:13px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.1rem;box-shadow:0 4px 12px rgba(124,58,237,.28);}
                    .rh-card-hd{flex:1;min-width:0;}
                    .rh-card-name{font-size:0.95rem;font-weight:800;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
                    .rh-card-meta{font-size:0.68rem;color:#94a3b8;font-weight:600;margin-top:3px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
                    .rh-card-meta .sep{color:#cbd5e1;}
                    .rh-frames{flex-shrink:0;background:rgba(124,58,237,0.08);color:#6d28d9;font-size:0.66rem;font-weight:800;padding:5px 11px;border-radius:99px;white-space:nowrap;}

                    .rh-chips{display:flex;gap:6px;flex-wrap:wrap;}
                    .rh-chip{font-size:0.62rem;font-weight:700;padding:4px 10px;border-radius:99px;display:inline-flex;align-items:center;gap:5px;}
                    .rh-chip .d{width:6px;height:6px;border-radius:50%;}

                    .rh-card-foot{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;border-top:1px solid #f1f5f9;padding-top:12px;}
                    .rh-dl{flex:1;min-width:120px;display:inline-flex;align-items:center;justify-content:center;gap:7px;font-size:0.76rem;font-weight:700;padding:10px;border-radius:12px;border:none;cursor:pointer;background:linear-gradient(135deg,#10b981,#059669);color:#fff;transition:filter .18s;}
                    .rh-dl:hover{filter:brightness(1.05);}
                    .rh-ico-btn{width:42px;height:42px;border-radius:12px;border:1px solid rgba(124,58,237,0.14);background:rgba(124,58,237,0.05);color:#6d28d9;font-size:0.95rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:background .18s;}
                    .rh-ico-btn:hover{background:rgba(124,58,237,0.12);}
                    .rh-ico-btn.danger{border-color:rgba(239,68,68,0.18);background:rgba(239,68,68,0.07);color:#ef4444;}
                    .rh-ico-btn.danger:hover{background:rgba(239,68,68,0.14);}
                    .rh-ico-btn:disabled,.rh-dl:disabled{opacity:.6;cursor:default;}

                    .rh-state{background:#fff;border:1px solid rgba(124,58,237,0.1);border-radius:18px;padding:40px 24px;text-align:center;color:#94a3b8;box-shadow:0 4px 14px rgba(76,29,149,.05);}
                    .rh-state .bigic{font-size:2.2rem;color:#c4b5fd;margin-bottom:12px;}
                    .rh-state p{margin:0 0 14px;font-size:0.86rem;}
                </style>

                <div class="rh-head">
                    <div class="rh-title"><i class="fas fa-clock-rotate-left"></i> Riwayat Rekaman</div>
                    <div class="rh-actions">
                        <button class="rh-btn primary" type="button" onclick="Router.navigate('rawrecorder')"><i class="fas fa-record-vinyl"></i> Rekam Baru</button>
                        <button class="rh-btn" type="button" id="histRefresh"><i class="fas fa-rotate"></i> Muat Ulang</button>
                    </div>
                </div>

                <div class="rh-summary" id="histSummary" style="display:none;">
                    <div class="rh-sum"><div class="v" id="rhCount">0</div><div class="l">Rekaman</div></div>
                    <div class="rh-sum"><div class="v" id="rhFrames">0</div><div class="l">Total frame</div></div>
                    <div class="rh-sum"><div class="v" id="rhSize">0</div><div class="l">Ukuran data</div></div>
                </div>

                <div id="histList">
                    <div class="rh-state"><i class="fas fa-spinner fa-spin bigic" style="font-size:1.6rem;"></i><p>Memuat riwayat…</p></div>
                </div>
            </div>
        `;
    }
};

// Make it globally available
window.Views = Views;
