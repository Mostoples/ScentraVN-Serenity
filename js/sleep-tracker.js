/**
 * SYNAWATCH - Sleep Tracker Module v2.0
 * Dual-source sleep pattern detection:
 *   - Source A: Smartwatch IMU (via BLE) → body movement → sleep stages
 *   - Source B: Smartphone IMU (DeviceMotion API) → phone disturbance detection
 *
 * Modes:
 *   - DUAL   : Both smartwatch BLE + smartphone IMU active
 *   - WATCH  : Smartwatch BLE only (no phone motion)
 *   - PHONE  : Smartphone IMU only (no BLE connected)
 *
 * Sleep Stage Logic (smartwatch):
 *   Deep  : very low movement + HR < 65
 *   Light : low movement
 *   REM   : moderate movement
 *   Awake : high movement / HR spike
 *
 * Phone Disturbance Logic:
 *   Any phone acceleration > PHONE_THRESHOLD → disturbance event logged
 *   Disturbances penalize final sleep quality score
 */

const SleepTracker = {
    isTracking: false,
    sessionStartTime: null,
    movementData: [],
    imuHistory: [],

    // ── Smartwatch thresholds (m/s²) ──────────────────────────
    MOVEMENT_THRESHOLD:     1.5,
    LOW_MOVEMENT_THRESHOLD: 0.5,
    SAMPLE_INTERVAL:        5000, // ms between sampled data points
    lastSampleTime:         0,

    // ── Smartphone IMU ─────────────────────────────────────────
    phoneMotionListener:    null,
    phoneIMUHistory:        [],
    phoneDisturbances:      [],
    PHONE_THRESHOLD:        1.2,  // m/s² — above this = phone was moved
    PHONE_COOLDOWN:         10000, // ms — min gap between disturbance events
    lastPhoneDisturbanceTime: 0,
    phoneIMUActive:         false,

    // ── Session data ───────────────────────────────────────────
    currentSession: null,
    trackingMode:   null, // 'dual' | 'watch' | 'phone'

    // ─────────────────────────────────────────────────────────────
    // START
    // ─────────────────────────────────────────────────────────────

    /**
     * Start sleep tracking.
     * Works with smartwatch, smartphone, or both.
     */
    async startTracking() {
        if (this.isTracking) {
            console.warn('[SleepTracker] Already tracking');
            return false;
        }

        const bleConnected = typeof BLEConnection !== 'undefined' && BLEConnection.isConnected();
        const phoneAvailable = typeof DeviceMotionEvent !== 'undefined';

        if (!bleConnected && !phoneAvailable) {
            if (typeof Utils !== 'undefined') {
                Utils.showToast('⚠️ Tidak ada sensor tersedia. Hubungkan smartwatch atau izinkan sensor hape.', 'warning', 4000);
            }
            return false;
        }

        // Request DeviceMotion permission (iOS 13+)
        if (phoneAvailable && typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                const perm = await DeviceMotionEvent.requestPermission();
                if (perm !== 'granted') {
                    if (!bleConnected) {
                        if (typeof Utils !== 'undefined') Utils.showToast('⚠️ Izin sensor hape ditolak. Hubungkan smartwatch.', 'warning');
                        return false;
                    }
                }
            } catch (e) {
                console.warn('[SleepTracker] DeviceMotion permission error:', e);
            }
        }

        // Determine mode
        if (bleConnected && phoneAvailable) {
            this.trackingMode = 'dual';
        } else if (bleConnected) {
            this.trackingMode = 'watch';
        } else {
            this.trackingMode = 'phone';
        }

        this.isTracking        = true;
        this.sessionStartTime  = new Date();
        this.movementData      = [];
        this.imuHistory        = [];
        this.phoneIMUHistory   = [];
        this.phoneDisturbances = [];
        this.lastSampleTime    = Date.now();
        this.lastPhoneDisturbanceTime = 0;

        this.currentSession = {
            startTime:          this.sessionStartTime,
            endTime:            null,
            duration:           0,
            trackingMode:       this.trackingMode,
            // Smartwatch data
            totalMovements:     0,
            sleepQuality:       0,
            stages: { deep: 0, light: 0, rem: 0, awake: 0 },
            averageHR:          0,
            lowestHR:           999,
            movements:          [],
            // Phone data
            phoneDisturbances:  0,
            phoneDisturbanceEvents: []
        };

        // Start phone IMU listener
        if (this.trackingMode === 'dual' || this.trackingMode === 'phone') {
            this._startPhoneIMU();
        }

        console.log(`[SleepTracker] Started in ${this.trackingMode.toUpperCase()} mode`);

        const modeLabel = {
            dual:  '⌚📱 Smartwatch + Hape',
            watch: '⌚ Smartwatch saja',
            phone: '📱 Sensor hape saja'
        }[this.trackingMode];

        if (typeof Utils !== 'undefined') {
            Utils.showToast(`😴 Sleep tracking dimulai (${modeLabel})`, 'success', 4000);
        }

        this.updateUI('tracking');
        return true;
    },

    // ─────────────────────────────────────────────────────────────
    // STOP
    // ─────────────────────────────────────────────────────────────

    async stopTracking() {
        if (!this.isTracking) {
            console.warn('[SleepTracker] Not tracking');
            return null;
        }

        this.isTracking = false;
        this._stopPhoneIMU();

        const endTime  = new Date();
        const duration = (endTime - this.sessionStartTime) / 1000 / 60; // minutes

        this.currentSession.endTime  = endTime;
        this.currentSession.duration = duration;

        this.analyzeSleepData();

        console.log('[SleepTracker] Session ended:', this.currentSession);

        await this.saveSleepSession();
        this.showSleepSummary();

        const session = { ...this.currentSession };
        this.currentSession    = null;
        this.movementData      = [];
        this.imuHistory        = [];
        this.phoneIMUHistory   = [];
        this.phoneDisturbances = [];

        this.updateUI('stopped');
        return session;
    },

    // ─────────────────────────────────────────────────────────────
    // SMARTPHONE IMU
    // ─────────────────────────────────────────────────────────────

    _startPhoneIMU() {
        if (this.phoneMotionListener) return; // already running

        this.phoneMotionListener = (event) => {
            const a = event.accelerationIncludingGravity;
            if (!a) return;

            const mag = Math.sqrt(
                Math.pow(a.x || 0, 2) +
                Math.pow(a.y || 0, 2) +
                Math.pow(a.z || 0, 2)
            );

            // Remove gravity baseline (~9.8 m/s²) to get net acceleration
            // We use |mag - 9.8| as proxy for movement
            const netAcc = Math.abs(mag - 9.81);

            const now = Date.now();

            this.phoneIMUHistory.push({ timestamp: now, netAcc });

            // Keep only last 2 hours
            const twoHoursAgo = now - 7200000;
            if (this.phoneIMUHistory.length > 5000) {
                this.phoneIMUHistory = this.phoneIMUHistory.filter(d => d.timestamp > twoHoursAgo);
            }

            // Detect disturbance event
            if (netAcc > this.PHONE_THRESHOLD && (now - this.lastPhoneDisturbanceTime) > this.PHONE_COOLDOWN) {
                this.lastPhoneDisturbanceTime = now;
                const event = {
                    timestamp: now,
                    magnitude: Math.round(netAcc * 100) / 100,
                    elapsed:   Math.round((now - this.sessionStartTime.getTime()) / 60000) // minutes into sleep
                };
                this.phoneDisturbances.push(event);
                this.currentSession.phoneDisturbances++;
                this.currentSession.phoneDisturbanceEvents.push(event);

                console.log(`[SleepTracker] Phone disturbance at +${event.elapsed}min, acc=${event.magnitude}`);
            }
        };

        window.addEventListener('devicemotion', this.phoneMotionListener);
        this.phoneIMUActive = true;
        console.log('[SleepTracker] Phone IMU listener started');
    },

    _stopPhoneIMU() {
        if (this.phoneMotionListener) {
            window.removeEventListener('devicemotion', this.phoneMotionListener);
            this.phoneMotionListener = null;
        }
        this.phoneIMUActive = false;
        console.log('[SleepTracker] Phone IMU listener stopped');
    },

    // ─────────────────────────────────────────────────────────────
    // SMARTWATCH IMU (called from ble-connection.js)
    // ─────────────────────────────────────────────────────────────

    processIMUData(data) {
        if (!this.isTracking) return;
        if (this.trackingMode === 'phone') return; // phone-only: ignore BLE

        const imuMagnitude = Math.sqrt(
            Math.pow(data.ax || 0, 2) +
            Math.pow(data.ay || 0, 2) +
            Math.pow(data.az || 0, 2)
        );

        this.imuHistory.push({
            timestamp: Date.now(),
            magnitude: imuMagnitude,
            hr:        data.hr   || 0,
            spo2:      data.spo2 || 0
        });

        const now = Date.now();
        if (now - this.lastSampleTime >= this.SAMPLE_INTERVAL) {
            this.recordDataPoint(imuMagnitude, data.hr);
            this.lastSampleTime = now;
        }

        // Prune memory: keep last 2 hours
        const twoHoursAgo = now - 7200000;
        if (this.imuHistory.length > 5000) {
            this.imuHistory = this.imuHistory.filter(d => d.timestamp > twoHoursAgo);
        }
    },

    recordDataPoint(imuMagnitude, heartRate) {
        let movementLevel = 'none';
        if (imuMagnitude > this.MOVEMENT_THRESHOLD) {
            movementLevel = 'high';
            this.currentSession.totalMovements++;
        } else if (imuMagnitude > this.LOW_MOVEMENT_THRESHOLD) {
            movementLevel = 'low';
        }

        const stage = this.determineSleepStage(imuMagnitude, heartRate);

        this.movementData.push({
            timestamp: Date.now(),
            imu:       imuMagnitude,
            movement:  movementLevel,
            stage,
            hr:        heartRate || 0
        });

        if (heartRate > 0) {
            this.currentSession.lowestHR = Math.min(this.currentSession.lowestHR, heartRate);
        }
    },

    // ─────────────────────────────────────────────────────────────
    // SLEEP STAGE CLASSIFICATION
    // ─────────────────────────────────────────────────────────────

    /**
     * Classify sleep stage from smartwatch IMU + HR.
     *
     * Deep  : imu < LOW  && HR < 65
     * Light : imu < LOW
     * REM   : imu LOW–HIGH (moderate)
     * Awake : imu > HIGH
     */
    determineSleepStage(imuMagnitude, heartRate) {
        if (imuMagnitude > this.MOVEMENT_THRESHOLD)                                   return 'awake';
        if (imuMagnitude < this.LOW_MOVEMENT_THRESHOLD && heartRate > 0 && heartRate < 65) return 'deep';
        if (imuMagnitude < this.LOW_MOVEMENT_THRESHOLD)                               return 'light';
        return 'rem';
    },

    // ─────────────────────────────────────────────────────────────
    // ANALYSIS
    // ─────────────────────────────────────────────────────────────

    analyzeSleepData() {
        // Phone-only mode: generate synthetic stages from disturbance count
        if (this.trackingMode === 'phone') {
            this._analyzePhoneOnlyMode();
            return;
        }

        if (this.movementData.length === 0) {
            this.currentSession.sleepQuality = 0;
            return;
        }

        const samplesPerMinute = 60 / (this.SAMPLE_INTERVAL / 1000);
        const stageCounts = { deep: 0, light: 0, rem: 0, awake: 0 };

        this.movementData.forEach(p => stageCounts[p.stage]++);

        this.currentSession.stages = {
            deep:  Math.round(stageCounts.deep  / samplesPerMinute),
            light: Math.round(stageCounts.light / samplesPerMinute),
            rem:   Math.round(stageCounts.rem   / samplesPerMinute),
            awake: Math.round(stageCounts.awake / samplesPerMinute)
        };

        const hrData = this.movementData.filter(d => d.hr > 0);
        if (hrData.length > 0) {
            this.currentSession.averageHR = Math.round(
                hrData.reduce((s, d) => s + d.hr, 0) / hrData.length
            );
        }

        this.currentSession.sleepQuality = this.calculateSleepQuality();
        this.currentSession.movements    = this.summarizeMovements();
    },

    /**
     * Phone-only mode analysis.
     * We can't determine sleep stages without HR, but we estimate quality
     * from total sleep duration and phone disturbances.
     */
    _analyzePhoneOnlyMode() {
        const duration = this.currentSession.duration; // minutes
        const disturb  = this.currentSession.phoneDisturbances;

        // Base quality: assume user slept (phone was still)
        // Disturbances penalize score
        const durationScore = Math.min(40, (duration / 480) * 40); // max at 8 hours
        const disturbScore  = Math.max(0, 40 - disturb * 5);       // -5 per disturbance
        const constScore    = 20;                                   // baseline

        this.currentSession.sleepQuality = Math.round(
            Math.min(100, Math.max(0, durationScore + disturbScore + constScore))
        );

        // Estimate stages based on duration only (no IMU data)
        const sleepMinutes = Math.max(0, duration - disturb * 5);
        this.currentSession.stages = {
            deep:  Math.round(sleepMinutes * 0.20),
            light: Math.round(sleepMinutes * 0.50),
            rem:   Math.round(sleepMinutes * 0.25),
            awake: Math.round(duration - sleepMinutes + disturb * 5)
        };

        this.currentSession.movements = this.summarizePhoneDisturbances();
    },

    /**
     * Sleep quality score for WATCH or DUAL mode.
     * DUAL mode adds phone disturbance penalty.
     */
    calculateSleepQuality() {
        const stages       = this.currentSession.stages;
        const totalMinutes = stages.deep + stages.light + stages.rem + stages.awake;
        if (totalMinutes === 0) return 0;

        // 1. Deep sleep % (0–35 pts)
        const deepPct   = (stages.deep / totalMinutes) * 100;
        const deepScore = Math.min(35, (deepPct / 30) * 35);

        // 2. Sleep efficiency (0–25 pts)
        const sleepTime        = stages.deep + stages.light + stages.rem;
        const efficiency       = (sleepTime / totalMinutes) * 100;
        const efficiencyScore  = (efficiency / 100) * 25;

        // 3. Movement penalty (0–20 pts)
        const movPerHour      = this.currentSession.totalMovements / Math.max(1, totalMinutes / 60);
        const movementScore   = Math.max(0, 20 - movPerHour * 2);

        // 4. Awake time penalty (0–10 pts)
        const awakePct   = (stages.awake / totalMinutes) * 100;
        const awakeScore = Math.max(0, 10 - awakePct / 5);

        // 5. Phone disturbance penalty (0–10 pts) — only in DUAL mode
        let phoneScore = 10;
        if (this.trackingMode === 'dual') {
            const disturb  = this.currentSession.phoneDisturbances;
            phoneScore = Math.max(0, 10 - disturb * 2);
        }

        return Math.round(
            Math.min(100, Math.max(0,
                deepScore + efficiencyScore + movementScore + awakeScore + phoneScore
            ))
        );
    },

    summarizeMovements() {
        if (this.movementData.length === 0) return [];

        const buckets = {};
        this.movementData.forEach(point => {
            const hour = new Date(point.timestamp).getHours();
            if (!buckets[hour]) buckets[hour] = { hour, movements: 0, avgIMU: 0, samples: 0 };
            if (point.movement !== 'none') buckets[hour].movements++;
            buckets[hour].avgIMU += point.imu;
            buckets[hour].samples++;
        });

        return Object.values(buckets).map(b => ({
            hour:      b.hour,
            movements: b.movements,
            avgIMU:    Math.round((b.avgIMU / b.samples) * 100) / 100
        }));
    },

    summarizePhoneDisturbances() {
        return this.phoneDisturbances.map(d => ({
            hour:      new Date(d.timestamp).getHours(),
            movements: 1,
            avgIMU:    d.magnitude
        }));
    },

    // ─────────────────────────────────────────────────────────────
    // SAVE TO FIRESTORE
    // ─────────────────────────────────────────────────────────────

    async saveSleepSession() {
        if (!this.currentSession || typeof firebase === 'undefined' || !auth?.currentUser) {
            console.error('[SleepTracker] Cannot save: no session or not logged in');
            return;
        }

        try {
            const data = {
                userId:                auth.currentUser.uid,
                startTime:             firebase.firestore.Timestamp.fromDate(this.currentSession.startTime),
                endTime:               firebase.firestore.Timestamp.fromDate(this.currentSession.endTime),
                duration:              this.currentSession.duration,
                trackingMode:          this.currentSession.trackingMode,
                sleepQuality:          this.currentSession.sleepQuality,
                totalMovements:        this.currentSession.totalMovements,
                stages:                this.currentSession.stages,
                averageHR:             this.currentSession.averageHR,
                lowestHR:              this.currentSession.lowestHR === 999 ? 0 : this.currentSession.lowestHR,
                movements:             this.currentSession.movements,
                phoneDisturbances:     this.currentSession.phoneDisturbances,
                phoneDisturbanceEvents: this.currentSession.phoneDisturbanceEvents.slice(0, 100), // cap at 100
                createdAt:             firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('sleepSessions').add(data);
            console.log('[SleepTracker] Session saved');

            if (typeof Utils !== 'undefined') Utils.showToast('✅ Sleep data tersimpan', 'success');
        } catch (error) {
            console.error('[SleepTracker] Save error:', error);
            if (typeof Utils !== 'undefined') Utils.showToast('⚠️ Gagal menyimpan: ' + error.message, 'error');
        }
    },

    // ─────────────────────────────────────────────────────────────
    // UI
    // ─────────────────────────────────────────────────────────────

    showSleepSummary() {
        if (!this.currentSession) return;

        const s = this.currentSession;
        const hours   = Math.floor(s.duration / 60);
        const minutes = Math.round(s.duration % 60);

        let qualityLabel = 'Buruk';
        let qualityColor = '#ef4444';
        let qualityIcon  = 'fa-frown';

        if      (s.sleepQuality >= 80) { qualityLabel = 'Excellent'; qualityColor = '#10b981'; qualityIcon = 'fa-star'; }
        else if (s.sleepQuality >= 70) { qualityLabel = 'Baik';      qualityColor = '#3b82f6'; qualityIcon = 'fa-smile'; }
        else if (s.sleepQuality >= 50) { qualityLabel = 'Cukup';     qualityColor = '#f59e0b'; qualityIcon = 'fa-meh'; }

        const modeLabel = {
            dual:  '⌚📱 Smartwatch + Hape',
            watch: '⌚ Smartwatch',
            phone: '📱 Sensor Hape'
        }[s.trackingMode] || s.trackingMode;

        const phoneDisturbSection = (s.trackingMode === 'dual' || s.trackingMode === 'phone')
            ? `<div style="background:#fef3c7;border-radius:12px;padding:12px;margin-bottom:12px;">
                   <div style="font-size:0.75rem;color:#d97706;margin-bottom:4px;">📱 Gangguan Hape</div>
                   <div style="font-size:1.25rem;font-weight:700;color:#f59e0b;">${s.phoneDisturbances}x</div>
                   <div style="font-size:0.72rem;color:#92400e;margin-top:2px;">Kali hape bergerak saat tidur</div>
               </div>`
            : '';

        const phoneNote = s.trackingMode === 'phone'
            ? `<div style="background:#eff6ff;border-radius:10px;padding:10px;margin-bottom:12px;font-size:0.78rem;color:#2563eb;">
                   <i class="fas fa-info-circle"></i> Mode sensor hape: tahap tidur diestimasi. Hubungkan smartwatch untuk akurasi lebih tinggi.
               </div>`
            : '';

        const html = `
            <div style="text-align:center;padding:20px;">
                <div style="width:80px;height:80px;background:${qualityColor}15;border-radius:50%;
                            display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                    <i class="fas ${qualityIcon}" style="font-size:2.5rem;color:${qualityColor};"></i>
                </div>

                <h3 style="font-size:1.5rem;font-weight:700;margin-bottom:4px;">
                    Sleep Quality: ${s.sleepQuality}/100
                </h3>
                <p style="color:${qualityColor};font-weight:600;margin-bottom:6px;">${qualityLabel}</p>
                <p style="font-size:0.75rem;color:#94a3b8;margin-bottom:20px;">${modeLabel}</p>

                ${phoneNote}

                <div style="background:#f8fafc;border-radius:12px;padding:16px;margin-bottom:16px;">
                    <div style="font-size:0.85rem;color:#64748b;margin-bottom:8px;">Total Durasi Tidur</div>
                    <div style="font-size:1.75rem;font-weight:700;color:#8B5CF6;">${hours}j ${minutes}m</div>
                </div>

                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-bottom:12px;">
                    <div style="background:#f0fdf4;border-radius:12px;padding:12px;">
                        <div style="font-size:0.75rem;color:#059669;margin-bottom:4px;">Deep Sleep</div>
                        <div style="font-size:1.25rem;font-weight:700;color:#10b981;">${s.stages.deep}m</div>
                    </div>
                    <div style="background:#eff6ff;border-radius:12px;padding:12px;">
                        <div style="font-size:0.75rem;color:#2563eb;margin-bottom:4px;">Light Sleep</div>
                        <div style="font-size:1.25rem;font-weight:700;color:#3b82f6;">${s.stages.light}m</div>
                    </div>
                    <div style="background:#fef3c7;border-radius:12px;padding:12px;">
                        <div style="font-size:0.75rem;color:#d97706;margin-bottom:4px;">REM</div>
                        <div style="font-size:1.25rem;font-weight:700;color:#f59e0b;">${s.stages.rem}m</div>
                    </div>
                    <div style="background:#fee2e2;border-radius:12px;padding:12px;">
                        <div style="font-size:0.75rem;color:#dc2626;margin-bottom:4px;">Awake</div>
                        <div style="font-size:1.25rem;font-weight:700;color:#ef4444;">${s.stages.awake}m</div>
                    </div>
                </div>

                ${phoneDisturbSection}

                <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
                    <div style="text-align:left;padding:10px;background:white;border-radius:8px;border:1px solid #e2e8f0;">
                        <div style="font-size:0.75rem;color:#64748b;">Gerakan Tubuh</div>
                        <div style="font-size:1.1rem;font-weight:700;color:#333;">${s.totalMovements}x</div>
                    </div>
                    <div style="text-align:left;padding:10px;background:white;border-radius:8px;border:1px solid #e2e8f0;">
                        <div style="font-size:0.75rem;color:#64748b;">Rata-rata HR</div>
                        <div style="font-size:1.1rem;font-weight:700;color:#333;">${s.averageHR > 0 ? s.averageHR + ' bpm' : '--'}</div>
                    </div>
                </div>

                <button onclick="document.getElementById('sleepSummaryModal').remove()"
                        style="margin-top:20px;width:100%;padding:12px;background:var(--gradient-primary);
                               color:white;border:none;border-radius:12px;font-weight:600;cursor:pointer;">
                    OK, Mengerti
                </button>
            </div>
        `;

        const modal = document.createElement('div');
        modal.id = 'sleepSummaryModal';
        modal.style.cssText = `
            position:fixed;top:0;left:0;right:0;bottom:0;
            background:rgba(0,0,0,0.5);backdrop-filter:blur(4px);
            display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;
        `;

        const box = document.createElement('div');
        box.style.cssText = `
            background:white;border-radius:20px;max-width:500px;width:100%;
            max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.3);
        `;
        box.innerHTML = html;
        modal.appendChild(box);
        document.body.appendChild(modal);
    },

    updateUI(state) {
        const startBtn = document.getElementById('startSleepTrackingBtn');
        const stopBtn  = document.getElementById('stopSleepTrackingBtn');
        const statusEl = document.getElementById('sleepTrackingStatus');
        const modeEl   = document.getElementById('sleepTrackingMode');

        if (!startBtn || !stopBtn) return;

        if (state === 'tracking') {
            startBtn.style.display = 'none';
            stopBtn.style.display  = 'block';

            const modeLabel = {
                dual:  '⌚📱 Smartwatch + Hape',
                watch: '⌚ Smartwatch',
                phone: '📱 Sensor Hape'
            }[this.trackingMode] || '';

            if (statusEl) statusEl.textContent = '🟢 Tracking Active';
            if (modeEl)   modeEl.textContent   = modeLabel;
        } else {
            startBtn.style.display = 'block';
            stopBtn.style.display  = 'none';
            if (statusEl) statusEl.textContent = '';
            if (modeEl)   modeEl.textContent   = '';
        }
    },

    // ─────────────────────────────────────────────────────────────
    // FIRESTORE: fetch history
    // ─────────────────────────────────────────────────────────────

    async getRecentSessions(limit = 7) {
        if (typeof firebase === 'undefined' || !auth?.currentUser) return [];

        try {
            const snap = await db.collection('sleepSessions')
                .where('userId', '==', auth.currentUser.uid)
                .orderBy('startTime', 'desc')
                .limit(limit)
                .get();

            return snap.docs.map(doc => ({
                id:        doc.id,
                ...doc.data(),
                startTime: doc.data().startTime.toDate(),
                endTime:   doc.data().endTime.toDate()
            }));
        } catch (error) {
            console.error('[SleepTracker] Fetch error:', error);
            return [];
        }
    }
};

window.SleepTracker = SleepTracker;
