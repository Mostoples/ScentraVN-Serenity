/**
 * SYNAWATCH - SPA Views
 * Contains all view templates for the application
 */

const Views = {
    /**
     * Assessment View (PHQ-9 & UCLA)
     */
    assessment() {
        return `
            <div class="view-container" style="max-width: 600px; margin: 0 auto; padding-top: 40px;">
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
     * Dashboard View
     */
    dashboard() {
        return `
            <div class="view-container">
                <!-- Greeting Section -->
                <div class="greeting-section">
                    <h2 id="greeting"></h2>
                    <p id="userName"></p>
                </div>

                <!-- Health Score Card -->
                <div class="featured-card">
                    <div class="content" style="display: flex; align-items: center; justify-content: space-between;">
                        <div>
                            <p style="font-size: var(--text-sm); opacity: 0.9; margin-bottom: var(--space-1); color: rgba(255,255,255,0.8);">${t('dashboard.health_score')}</p>
                            <div style="display: flex; align-items: baseline; gap: var(--space-2);">
                                <span id="healthScore" style="font-size: var(--text-4xl); font-weight: 800; color: white;">--</span>
                                <span style="font-size: var(--text-sm); color: rgba(255,255,255,0.7);">/100</span>
                            </div>
                        </div>
                        <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.15); border-radius: var(--radius-lg); display: flex; align-items: center; justify-content: center;">
                            <i class="fas fa-shield-heart" style="font-size: var(--text-2xl); color: white;"></i>
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
                    </div>
                </div>

                <!-- Current Health Metrics -->
                <h3 class="section-title">${t('dashboard.current_health')}</h3>
                <div class="card-grid">
                    <!-- Heart Rate -->
                    <div class="card metric-card">
                        <div class="metric-icon danger">
                            <i class="fas fa-heart pulse"></i>
                        </div>
                        <div class="metric-value">
                            <span id="hrValue">--</span>
                            <span class="metric-unit">${t('metric.bpm')}</span>
                        </div>
                        <div class="metric-label">${t('dashboard.heart_rate')}</div>
                        <span id="hrStatus" class="metric-status gray">${t('metric.no_data')}</span>
                    </div>

                    <!-- SpO2 -->
                    <div class="card metric-card">
                        <div class="metric-icon info">
                            <i class="fas fa-lungs"></i>
                        </div>
                        <div class="metric-value">
                            <span id="spo2Value">--</span>
                            <span class="metric-unit">%</span>
                        </div>
                        <div class="metric-label">${t('dashboard.spo2')}</div>
                        <span id="spo2Status" class="metric-status gray">${t('metric.no_data')}</span>
                    </div>

                    <!-- Stress Level -->
                    <div class="card metric-card">
                        <div class="metric-icon warning">
                            <i class="fas fa-brain"></i>
                        </div>
                        <div class="metric-value">
                            <span id="stressValue">0%</span>
                        </div>
                        <div class="metric-label">${t('dashboard.stress')}</div>
                        <span id="stressLabel" class="metric-status success" style="margin-bottom: var(--space-2);">${t('metric.low')}</span>
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div id="stressBar" class="progress-fill" style="width: 0%;"></div>
                            </div>
                        </div>
                    </div>

                    <!-- GSR -->
                    <div class="card metric-card">
                        <div class="metric-icon primary">
                            <i class="fas fa-hand"></i>
                        </div>
                        <div class="metric-value">
                            <span id="gsrValue">0%</span>
                        </div>
                        <div class="metric-label">${t('dashboard.gsr')}</div>
                        <div class="progress-container">
                            <div class="progress-bar">
                                <div id="gsrBar" class="progress-fill" style="width: 0%;"></div>
                            </div>
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
                <!-- Header with Connection Status -->
                <div class="health-header">
                    <div class="health-header-content">
                        <div class="health-header-left">
                            <h1 class="health-title">${t('health.title')}</h1>
                            <p class="health-subtitle">${t('health.subtitle')}</p>
                        </div>
                        <button id="bleConnectBtn" class="ble-connect-btn" onclick="BLEConnection.toggle()">
                            <span class="ble-btn-content">
                                <span class="ble-status-dot" id="bleIndicator"></span>
                                <i class="fas fa-bluetooth-b"></i>
                                <span id="bleStatusText">${t('health.connect')}</span>
                            </span>
                        </button>
                    </div>
                </div>

                <!-- Main Heart Rate Display -->
                <div class="hr-showcase">
                    <div class="hr-ring-container">
                        <svg class="hr-ring" viewBox="0 0 200 200">
                            <circle class="hr-ring-bg" cx="100" cy="100" r="90" />
                            <circle class="hr-ring-progress" id="hrRingProgress" cx="100" cy="100" r="90" />
                        </svg>
                        <div class="hr-center">
                            <div class="hr-icon-pulse">
                                <i class="fas fa-heartbeat"></i>
                            </div>
                            <div class="hr-value-display">
                                <span class="hr-number" id="hrValue">--</span>
                                <span class="hr-unit">BPM</span>
                            </div>
                            <div class="hr-status" id="hrStatus">
                                <span class="status-dot"></span>
                                <span>${t('health.waiting')}</span>
                            </div>
                        </div>
                    </div>
                    <div class="hr-meta">
                        <div class="hr-meta-item">
                            <i class="fas fa-fingerprint"></i>
                            <span id="fingerStatus">${t('health.place_finger')}</span>
                        </div>
                    </div>
                </div>

                <!-- Vital Signs Grid -->
                <div class="vitals-section">
                    <div class="section-header">
                        <h2><i class="fas fa-wave-square"></i> ${t('health.vital_signs')}</h2>
                        <span class="live-badge" id="liveIndicator">
                            <span class="live-dot"></span> ${t('metric.live')}
                        </span>
                    </div>

                    <div class="vitals-grid">
                        <!-- SpO2 Card -->
                        <div class="vital-card spo2-card">
                            <div class="vital-card-header">
                                <div class="vital-icon spo2">
                                    <i class="fas fa-lungs"></i>
                                </div>
                                <span class="vital-badge" id="spo2Status">--</span>
                            </div>
                            <div class="vital-card-body">
                                <div class="vital-value">
                                    <span class="vital-number" id="spo2Value">--</span>
                                    <span class="vital-unit">%</span>
                                </div>
                                <div class="vital-label">${t('health.blood_oxygen')}</div>
                            </div>
                            <div class="vital-card-footer">
                                <div class="vital-range">
                                    <span>${t('metric.normal')}: 95-100%</span>
                                </div>
                            </div>
                        </div>

                        <!-- Body Temperature Card -->
                        <div class="vital-card temp-card">
                            <div class="vital-card-header">
                                <div class="vital-icon temp">
                                    <i class="fas fa-temperature-half"></i>
                                </div>
                                <span class="vital-badge" id="tempStatus">--</span>
                            </div>
                            <div class="vital-card-body">
                                <div class="vital-value">
                                    <span class="vital-number" id="btValue">--</span>
                                    <span class="vital-unit">°C</span>
                                </div>
                                <div class="vital-label">${t('health.body_temp')}</div>
                            </div>
                            <div class="vital-card-footer">
                                <div class="vital-range">
                                    <span>${t('metric.normal')}: 36.1-37.2°C</span>
                                </div>
                            </div>
                        </div>

                        <!-- Ambient Temperature Card -->
                        <div class="vital-card ambient-card">
                            <div class="vital-card-header">
                                <div class="vital-icon ambient">
                                    <i class="fas fa-sun"></i>
                                </div>
                            </div>
                            <div class="vital-card-body">
                                <div class="vital-value">
                                    <span class="vital-number" id="atValue">--</span>
                                    <span class="vital-unit">°C</span>
                                </div>
                                <div class="vital-label">${t('health.room_temp')}</div>
                            </div>
                        </div>

                        <!-- Activity Card -->
                        <div class="vital-card activity-card">
                            <div class="vital-card-header">
                                <div class="vital-icon activity">
                                    <i id="actIcon" class="fas fa-person"></i>
                                </div>
                            </div>
                            <div class="vital-card-body">
                                <div class="vital-value">
                                    <span class="vital-text" id="actValue">${t('health.resting')}</span>
                                </div>
                                <div class="vital-label">${t('health.activity')}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stress & Wellness Section -->
                <div class="wellness-section">
                    <div class="section-header">
                        <h2><i class="fas fa-brain"></i> ${t('health.mental_wellness')}</h2>
                    </div>

                    <div class="wellness-grid">
                        <!-- Stress Level Card -->
                        <div class="wellness-card stress-card">
                            <div class="wellness-card-inner">
                                <div class="wellness-gauge">
                                    <svg class="gauge-svg" viewBox="0 0 120 120">
                                        <circle class="gauge-bg" cx="60" cy="60" r="54" />
                                        <circle class="gauge-fill stress-gauge" id="stressGauge" cx="60" cy="60" r="54" />
                                    </svg>
                                    <div class="gauge-center">
                                        <span class="gauge-value" id="stressValue">0</span>
                                        <span class="gauge-unit">%</span>
                                    </div>
                                </div>
                                <div class="wellness-info">
                                    <h3>${t('health.stress_level')}</h3>
                                    <span class="wellness-status" id="stressStatus">${t('metric.low')}</span>
                                    <p class="wellness-tip" id="stressTip">${t('health.doing_great')}</p>
                                </div>
                            </div>
                        </div>

                        <!-- GSR Card -->
                        <div class="wellness-card gsr-card">
                            <div class="wellness-card-inner">
                                <div class="wellness-gauge">
                                    <svg class="gauge-svg" viewBox="0 0 120 120">
                                        <circle class="gauge-bg" cx="60" cy="60" r="54" />
                                        <circle class="gauge-fill gsr-gauge" id="gsrGauge" cx="60" cy="60" r="54" />
                                    </svg>
                                    <div class="gauge-center">
                                        <span class="gauge-value" id="gsrValue">0</span>
                                        <span class="gauge-unit">%</span>
                                    </div>
                                </div>
                                <div class="wellness-info">
                                    <h3>${t('health.gsr_activity')}</h3>
                                    <span class="wellness-status" id="gsrStatusBadge">${t('health.relaxed')}</span>
                                    <p class="wellness-tip" id="gsrTip">${t('health.skin_normal')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Recording Status -->
                <div id="autoRecordStatus" class="recording-banner" style="display: none;">
                    <div class="recording-indicator">
                        <span class="recording-dot"></span>
                        <span>${t('health.recording')}</span>
                    </div>
                    <div class="recording-info">
                        <span id="recordingTimer">00:00</span>
                        <span class="recording-divider">•</span>
                        <span id="recordingCount">0 ${t('health.readings')}</span>
                    </div>
                </div>

                <!-- Quick Actions -->
                <div class="health-actions">
                    <button class="health-action-btn primary" onclick="Router.navigate('analytics')">
                        <i class="fas fa-chart-line"></i>
                        <span>${t('health.view_analytics')}</span>
                    </button>
                    <button class="health-action-btn secondary" onclick="Router.navigate('synachat')">
                        <i class="fas fa-robot"></i>
                        <span>${t('health.ask_synachat')}</span>
                    </button>
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
                            <div class="list-item-subtitle">${I18n.currentLang === 'id' ? 'Perbarui kredensial keamanan Anda' : 'Update your security credentials'}</div>
                        </div>
                        <i class="fas fa-chevron-right list-item-action"></i>
                    </div>
                    <div class="list-item" data-route="synachat">
                        <div class="list-item-icon" style="background: rgba(34, 197, 94, 0.15); color: var(--success-400);">
                            <i class="fas fa-comments"></i>
                        </div>
                        <div class="list-item-content">
                            <div class="list-item-title">${t('profile.health_assistant')}</div>
                            <div class="list-item-subtitle">${I18n.currentLang === 'id' ? 'Chat dengan Dr. Synachat' : 'Chat with Dr. Synachat'}</div>
                        </div>
                        <i class="fas fa-chevron-right list-item-action"></i>
                    </div>
                    <div class="list-item" style="border-bottom: none;">
                        <div class="list-item-icon" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6;">
                            <i class="fas fa-globe"></i>
                        </div>
                        <div class="list-item-content">
                            <div class="list-item-title">${t('profile.language')}</div>
                            <div class="list-item-subtitle">${I18n.currentLang === 'id' ? 'Pilih bahasa aplikasi' : 'Select app language'}</div>
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

                <!-- Version -->
                <div style="text-align: center; padding: var(--space-5); color: var(--text-muted); font-size: var(--text-xs);">
                    <p>SYNAWATCH v1.0.0</p>
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
                            <p>Initializing AI Assistant...</p>
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
                            Live Health
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
                                <i class="fas fa-robot"></i>
                            </div>
                            <h3>Hello, I'm Dr. Synachat</h3>
                            <p>Your personal AI health companion. I can analyze your vitals, offer wellness advice, and support your health journey.</p>
                            <div class="quick-actions">
                                <button class="quick-action" onclick="sendQuickMessage('Analyze my current heart rate')">
                                    <i class="fas fa-heart-pulse"></i>
                                    Heart Analysis
                                </button>
                                <button class="quick-action" onclick="sendQuickMessage('Help me manage my stress levels')">
                                    <i class="fas fa-spa"></i>
                                    Stress Relief
                                </button>
                                <button class="quick-action" onclick="sendQuickMessage('Give me personalized health tips')">
                                    <i class="fas fa-wand-magic-sparkles"></i>
                                    Health Tips
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
            <div class="view-container" style="max-width: 700px; margin: 0 auto; padding-bottom: 80px;">
                <!-- Header -->
                <div class="health-hero" style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);">
                    <i class="fas fa-moon" style="font-size: 2.5rem; margin-bottom: 12px; color: #a5b4fc;"></i>
                    <div class="big-value" style="color: white; font-size: 3rem;"><span id="sleepScoreValue">--</span></div>
                    <div class="label" style="color: #c7d2fe;">${t('sleep.title')}</div>
                </div>

                <!-- Relaxation Audio -->
                <h3 class="section-title">${t('sleep.audio_title')}</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
                    <div class="card" style="text-align: center; cursor: pointer; padding: 16px;" onclick="SleepLab.playSound('rain')">
                        <i class="fas fa-cloud-rain" style="font-size: 1.5rem; color: var(--info-500); margin-bottom: 8px;"></i>
                        <div style="font-size: 0.8rem; font-weight: 600;">${t('sleep.audio_rain')}</div>
                    </div>
                    <div class="card" style="text-align: center; cursor: pointer; padding: 16px;" onclick="SleepLab.playSound('forest')">
                        <i class="fas fa-tree" style="font-size: 1.5rem; color: var(--success-500); margin-bottom: 8px;"></i>
                        <div style="font-size: 0.8rem; font-weight: 600;">${t('sleep.audio_forest')}</div>
                    </div>
                    <div class="card" style="text-align: center; cursor: pointer; padding: 16px;" onclick="SleepLab.playSound('noise')">
                        <i class="fas fa-water" style="font-size: 1.5rem; color: var(--primary-500); margin-bottom: 8px;"></i>
                        <div style="font-size: 0.8rem; font-weight: 600;">${t('sleep.audio_waves')}</div>
                    </div>
                </div>

                <!-- Bedtime Checklist -->
                <h3 class="section-title">${t('sleep.routine_title')}</h3>
                <div class="card" style="padding: 0; overflow: hidden;">
                    <div class="list-item" style="cursor: pointer;" onclick="SleepLab.toggleChecklist(this)">
                        <div class="list-item-icon" style="background: transparent; color: var(--text-tertiary);"><i class="far fa-circle"></i></div>
                        <div class="list-item-content">
                            <div class="list-item-title">${t('sleep.routine_bath')}</div>
                        </div>
                    </div>
                    <div class="list-item" style="cursor: pointer;" onclick="SleepLab.toggleChecklist(this)">
                        <div class="list-item-icon" style="background: transparent; color: var(--text-tertiary);"><i class="far fa-circle"></i></div>
                        <div class="list-item-content">
                            <div class="list-item-title">${t('sleep.routine_screen')}</div>
                        </div>
                    </div>
                    <div class="list-item" style="cursor: pointer; border-bottom: none;" onclick="SleepLab.toggleChecklist(this)">
                        <div class="list-item-icon" style="background: transparent; color: var(--text-tertiary);"><i class="far fa-circle"></i></div>
                        <div class="list-item-content">
                            <div class="list-item-title">${t('sleep.routine_drink')}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    /**
     * Mood Booster View
     */
    moodbooster() {
        return `
            <div class="view-container" style="max-width: 700px; margin: 0 auto;">
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
            <div class="view-container" style="max-width: 700px; margin: 0 auto; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--bg-primary);">
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
        return `
            <div class="view-container" style="max-width: 700px; margin: 0 auto;">
                <div style="margin-bottom: 24px;">
                    <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 8px;"><i class="fas fa-book-open" style="color: var(--primary-500);"></i> ${t('journal.title')}</h2>
                    <p style="color: var(--text-tertiary);">${t('journal.desc')}</p>
                </div>

                <div class="card" style="margin-bottom: 24px;">
                    <textarea id="journalInput" rows="5" placeholder="${t('journal.placeholder')}" style="width: 100%; border: none; background: #f8fafc; padding: 16px; border-radius: 12px; font-family: 'Poppins', sans-serif; font-size: 1rem; color: var(--text-primary); resize: vertical; margin-bottom: 16px; outline: none;"></textarea>
                    <button class="btn btn-primary" style="width: 100%; justify-content: center;" onclick="Journal.save()">
                        <i class="fas fa-save"></i> ${t('journal.save')}
                    </button>
                </div>

                <h3 class="section-title">${t('journal.previous')}</h3>
                <div id="journalList">
                    <!-- Loaded dynamically -->
                    <div style="text-align: center; padding: 20px;"><div class="loading-spinner"></div></div>
                </div>
            </div>
        `;
    },

    /**
     * Support Hub View
     */
    support() {
        return `
            <div class="view-container" style="max-width: 700px; margin: 0 auto;">
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
            <div class="view-container" style="max-width: 700px; margin: 0 auto;">
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
            <div class="view-container" style="max-width: 700px; margin: 0 auto; padding-top: 20px;">
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
     * Admin Dashboard View
     */
    admin() {
        return `
            <div class="view-container" style="max-width: 1200px; margin: 0 auto; padding-top: 40px;">
                <!-- Admin Header -->
                <div style="margin-bottom: 32px;">
                    <h1 style="font-size: var(--text-3xl); font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">
                        <i class="fas fa-shield-alt" style="color: var(--primary-500); margin-right: 12px;"></i>${t('admin.title')}
                    </h1>
                    <p style="color: var(--text-secondary);">${t('admin.subtitle')}</p>
                </div>

                <!-- Tabs Navigation -->
                <div class="admin-tabs" style="display: flex; gap: 12px; margin-bottom: 24px; border-bottom: 2px solid var(--border-color);">
                    <button class="admin-tab-btn active" data-tab="dashboard" onclick="AdminUI.switchTab('dashboard')">
                        <i class="fas fa-chart-line"></i> ${t('admin.dashboard')}
                    </button>
                    <button class="admin-tab-btn" data-tab="api-keys" onclick="AdminUI.switchTab('api-keys')">
                        <i class="fas fa-key"></i> ${t('admin.api_keys')}
                    </button>
                    <button class="admin-tab-btn" data-tab="users" onclick="AdminUI.switchTab('users')">
                        <i class="fas fa-users"></i> ${t('admin.users')}
                    </button>
                    <button class="admin-tab-btn" data-tab="settings" onclick="AdminUI.switchTab('settings')">
                        <i class="fas fa-cog"></i> ${t('admin.settings')}
                    </button>
                </div>

                <!-- Dashboard Tab -->
                <div id="dashboard-tab" class="admin-tab-content" style="display: block;">
                    <div class="card-grid" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; margin-bottom: 32px;">
                        <div class="card" style="padding: 24px; border-left: 4px solid var(--primary-500);">
                            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 8px;">${t('admin.total_users')}</p>
                            <div style="font-size: 2.5rem; font-weight: 700; color: var(--primary-500);" id="totalUsers">--</div>
                            <p style="color: var(--text-tertiary); font-size: 0.85rem; margin-top: 8px;"><i class="fas fa-arrow-up" style="color: #10b981;"></i> +12% this month</p>
                        </div>
                        <div class="card" style="padding: 24px; border-left: 4px solid var(--info-500);">
                            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 8px;">${t('admin.api_calls')}</p>
                            <div style="font-size: 2.5rem; font-weight: 700; color: var(--info-500);" id="totalApiCalls">--</div>
                            <p style="color: var(--text-tertiary); font-size: 0.85rem; margin-top: 8px;"><i class="fas fa-arrow-up" style="color: #10b981;"></i> +24% this month</p>
                        </div>
                        <div class="card" style="padding: 24px; border-left: 4px solid var(--success-500);">
                            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 8px;">${t('admin.system_uptime')}</p>
                            <div style="font-size: 2.5rem; font-weight: 700; color: var(--success-500);" id="systemUptime">--</div>
                            <p style="color: var(--text-tertiary); font-size: 0.85rem; margin-top: 8px;">Last 30 days</p>
                        </div>
                        <div class="card" style="padding: 24px; border-left: 4px solid var(--warning-500);">
                            <p style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 8px;">${t('admin.active_keys')}</p>
                            <div style="font-size: 2.5rem; font-weight: 700; color: var(--warning-500);" id="activeKeys">--</div>
                            <p style="color: var(--text-tertiary); font-size: 0.85rem; margin-top: 8px;"><i class="fas fa-circle" style="color: #10b981;"></i> All healthy</p>
                        </div>
                    </div>

                    <!-- Recent Activity -->
                    <div class="card" style="padding: 24px;">
                        <h3 style="font-size: 1.2rem; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">${t('admin.recent_activity')}</h3>
                        <div id="recentActivity" style="space-y: 12px;">
                            <div style="text-align: center; padding: 20px; color: var(--text-tertiary);">
                                <p>${t('admin.loading')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- API Keys Tab -->
                <div id="api-keys-tab" class="admin-tab-content" style="display: none;">
                    <div style="margin-bottom: 24px;">
                        <button class="btn btn-primary" onclick="AdminUI.showCreateKeyModal()" style="display: flex; align-items: center; gap: 8px;">
                            <i class="fas fa-plus"></i> ${t('admin.create_key')}
                        </button>
                    </div>

                    <div class="card" style="padding: 24px;">
                        <h3 style="font-size: 1.2rem; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">${t('admin.key_management')}</h3>
                        <div id="apiKeysTable" style="overflow-x: auto;">
                            <div style="text-align: center; padding: 20px; color: var(--text-tertiary);">
                                <div class="loading-spinner" style="margin: 0 auto 12px;"></div>
                                <p>${t('admin.loading')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Users Tab -->
                <div id="users-tab" class="admin-tab-content" style="display: none;">
                    <div class="card" style="padding: 24px;">
                        <h3 style="font-size: 1.2rem; font-weight: 600; color: var(--text-primary); margin-bottom: 16px;">${t('admin.user_management')}</h3>
                        <div id="usersTable" style="overflow-x: auto;">
                            <div style="text-align: center; padding: 20px; color: var(--text-tertiary);">
                                <div class="loading-spinner" style="margin: 0 auto 12px;"></div>
                                <p>${t('admin.loading')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Settings Tab -->
                <div id="settings-tab" class="admin-tab-content" style="display: none;">
                    <div class="card" style="padding: 24px;">
                        <h3 style="font-size: 1.2rem; font-weight: 600; color: var(--text-primary); margin-bottom: 24px;">${t('admin.system_settings')}</h3>

                        <div style="margin-bottom: 24px;">
                            <label style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 8px;">${t('admin.rotation_policy')}</label>
                            <div style="background: var(--bg-secondary); padding: 12px; border-radius: var(--radius-md); margin-bottom: 12px; color: var(--text-secondary);">
                                <select id="rotationPolicy" style="width: 100%; padding: 8px; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                                    <option value="30">Rotate every 30 days</option>
                                    <option value="60">Rotate every 60 days</option>
                                    <option value="90">Rotate every 90 days</option>
                                    <option value="manual">Manual only</option>
                                </select>
                            </div>
                            <button class="btn btn-primary" onclick="AdminUI.saveSettings()" style="display: flex; align-items: center; gap: 8px;">
                                <i class="fas fa-save"></i> ${t('admin.save_settings')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};

// Make it globally available
window.Views = Views;
