/**
 * SYNAWATCH - Sleep Tracker Module
 * Tracks sleep quality based on IMU (movement) data from BLE device
 *
 * Logic:
 * - More movement = Lower sleep quality
 * - Movement patterns determine sleep stages
 * - Stores complete sleep session to Firestore
 */

const SleepTracker = {
    isTracking: false,
    sessionStartTime: null,
    movementData: [],
    imuHistory: [],

    // Thresholds for movement detection
    MOVEMENT_THRESHOLD: 1.5, // m/s² - significant movement
    LOW_MOVEMENT_THRESHOLD: 0.5, // m/s² - minimal movement
    SAMPLE_INTERVAL: 5000, // 5 seconds - how often to record data point

    lastSampleTime: 0,
    currentSession: null,

    /**
     * Start sleep tracking
     */
    startTracking() {
        if (this.isTracking) {
            console.warn('[SleepTracker] Already tracking');
            return;
        }

        // Check if BLE is connected
        if (typeof BLE === 'undefined' || !BLE.isConnected || !BLE.isConnected()) {
            if (typeof Utils !== 'undefined') {
                Utils.showToast('⚠️ Hubungkan perangkat BLE terlebih dahulu', 'warning');
            }
            return false;
        }

        this.isTracking = true;
        this.sessionStartTime = new Date();
        this.movementData = [];
        this.imuHistory = [];
        this.lastSampleTime = Date.now();

        this.currentSession = {
            startTime: this.sessionStartTime,
            endTime: null,
            duration: 0,
            totalMovements: 0,
            sleepQuality: 0,
            stages: {
                deep: 0,    // minutes
                light: 0,   // minutes
                rem: 0,     // minutes
                awake: 0    // minutes
            },
            averageHR: 0,
            lowestHR: 999,
            movements: []
        };

        console.log('[SleepTracker] Sleep tracking started at', this.sessionStartTime);

        if (typeof Utils !== 'undefined') {
            Utils.showToast('😴 Sleep tracking dimulai. Selamat tidur!', 'success', 4000);
        }

        this.updateUI('tracking');
        return true;
    },

    /**
     * Stop sleep tracking and calculate results
     */
    async stopTracking() {
        if (!this.isTracking) {
            console.warn('[SleepTracker] Not tracking');
            return null;
        }

        this.isTracking = false;
        const endTime = new Date();
        const duration = (endTime - this.sessionStartTime) / 1000 / 60; // minutes

        this.currentSession.endTime = endTime;
        this.currentSession.duration = duration;

        // Calculate sleep quality and stages
        this.analyzeSleepData();

        console.log('[SleepTracker] Sleep session ended:', this.currentSession);

        // Save to Firestore
        await this.saveSleepSession();

        // Show summary
        this.showSleepSummary();

        // Reset for next session
        const session = { ...this.currentSession };
        this.currentSession = null;
        this.movementData = [];
        this.imuHistory = [];

        this.updateUI('stopped');

        return session;
    },

    /**
     * Process IMU data from BLE
     * Called from BLE handleDataNotification
     */
    processIMUData(data) {
        if (!this.isTracking) return;

        // Calculate IMU magnitude (already done in BLE, but we do it here too)
        const imuMagnitude = Math.sqrt(
            Math.pow(data.ax || 0, 2) +
            Math.pow(data.ay || 0, 2) +
            Math.pow(data.az || 0, 2)
        );

        // Store raw IMU for detailed analysis
        this.imuHistory.push({
            timestamp: Date.now(),
            magnitude: imuMagnitude,
            hr: data.hr || 0,
            spo2: data.spo2 || 0
        });

        // Sample every SAMPLE_INTERVAL to avoid too much data
        const now = Date.now();
        if (now - this.lastSampleTime >= this.SAMPLE_INTERVAL) {
            this.recordDataPoint(imuMagnitude, data.hr);
            this.lastSampleTime = now;
        }

        // Keep only last 2 hours of detailed data (to save memory)
        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
        this.imuHistory = this.imuHistory.filter(d => d.timestamp > twoHoursAgo);
    },

    /**
     * Record a data point (sampled every 5 seconds)
     */
    recordDataPoint(imuMagnitude, heartRate) {
        // Determine movement level
        let movementLevel = 'none';
        if (imuMagnitude > this.MOVEMENT_THRESHOLD) {
            movementLevel = 'high';
            this.currentSession.totalMovements++;
        } else if (imuMagnitude > this.LOW_MOVEMENT_THRESHOLD) {
            movementLevel = 'low';
        }

        // Determine sleep stage based on movement + HR
        const stage = this.determineSleepStage(imuMagnitude, heartRate);

        const dataPoint = {
            timestamp: Date.now(),
            imu: imuMagnitude,
            movement: movementLevel,
            stage: stage,
            hr: heartRate || 0
        };

        this.movementData.push(dataPoint);

        // Update current session stats
        if (heartRate > 0) {
            this.currentSession.lowestHR = Math.min(this.currentSession.lowestHR, heartRate);
        }
    },

    /**
     * Determine sleep stage based on IMU and HR
     *
     * Deep Sleep: Very low movement + low HR
     * Light Sleep: Low movement + moderate HR
     * REM: Moderate movement + varying HR
     * Awake: High movement + higher HR
     */
    determineSleepStage(imuMagnitude, heartRate) {
        // High movement = Awake
        if (imuMagnitude > this.MOVEMENT_THRESHOLD) {
            return 'awake';
        }

        // Very low movement + low HR = Deep sleep
        if (imuMagnitude < this.LOW_MOVEMENT_THRESHOLD && heartRate > 0 && heartRate < 65) {
            return 'deep';
        }

        // Low movement + moderate HR = Light sleep
        if (imuMagnitude < this.LOW_MOVEMENT_THRESHOLD) {
            return 'light';
        }

        // Moderate movement = REM
        return 'rem';
    },

    /**
     * Analyze sleep data and calculate quality
     */
    analyzeSleepData() {
        if (this.movementData.length === 0) {
            this.currentSession.sleepQuality = 0;
            return;
        }

        // Count minutes in each stage
        const samplesPerMinute = 60 / (this.SAMPLE_INTERVAL / 1000);
        const stageCounts = { deep: 0, light: 0, rem: 0, awake: 0 };

        this.movementData.forEach(point => {
            stageCounts[point.stage]++;
        });

        // Convert to minutes
        this.currentSession.stages = {
            deep: Math.round(stageCounts.deep / samplesPerMinute),
            light: Math.round(stageCounts.light / samplesPerMinute),
            rem: Math.round(stageCounts.rem / samplesPerMinute),
            awake: Math.round(stageCounts.awake / samplesPerMinute)
        };

        // Calculate average HR
        const hrData = this.movementData.filter(d => d.hr > 0);
        if (hrData.length > 0) {
            this.currentSession.averageHR = Math.round(
                hrData.reduce((sum, d) => sum + d.hr, 0) / hrData.length
            );
        }

        // Calculate sleep quality (0-100)
        this.currentSession.sleepQuality = this.calculateSleepQuality();

        // Store movement summary (reduce data size)
        this.currentSession.movements = this.summarizeMovements();
    },

    /**
     * Calculate sleep quality score (0-100)
     *
     * Factors:
     * - Deep sleep % (higher is better)
     * - Total movements (lower is better)
     * - Awake time (lower is better)
     * - Sleep efficiency (time asleep / total time)
     */
    calculateSleepQuality() {
        const stages = this.currentSession.stages;
        const totalMinutes = stages.deep + stages.light + stages.rem + stages.awake;

        if (totalMinutes === 0) return 0;

        // 1. Deep sleep percentage (0-40 points)
        const deepSleepPercentage = (stages.deep / totalMinutes) * 100;
        const deepScore = Math.min(40, (deepSleepPercentage / 30) * 40); // 30% deep = max score

        // 2. Sleep efficiency (0-30 points)
        const sleepTime = stages.deep + stages.light + stages.rem;
        const efficiency = (sleepTime / totalMinutes) * 100;
        const efficiencyScore = (efficiency / 100) * 30;

        // 3. Movement score (0-20 points)
        const movementsPerHour = (this.currentSession.totalMovements / (totalMinutes / 60));
        const movementScore = Math.max(0, 20 - (movementsPerHour * 2)); // Less movement = higher score

        // 4. Awake time penalty (0-10 points)
        const awakePercentage = (stages.awake / totalMinutes) * 100;
        const awakeScore = Math.max(0, 10 - (awakePercentage / 5)); // Less awake = higher score

        const totalScore = deepScore + efficiencyScore + movementScore + awakeScore;

        return Math.round(Math.min(100, Math.max(0, totalScore)));
    },

    /**
     * Summarize movements for storage (hourly buckets)
     */
    summarizeMovements() {
        if (this.movementData.length === 0) return [];

        const hourlyBuckets = {};

        this.movementData.forEach(point => {
            const hour = new Date(point.timestamp).getHours();
            if (!hourlyBuckets[hour]) {
                hourlyBuckets[hour] = {
                    hour: hour,
                    movements: 0,
                    avgIMU: 0,
                    samples: 0
                };
            }
            hourlyBuckets[hour].movements += (point.movement !== 'none' ? 1 : 0);
            hourlyBuckets[hour].avgIMU += point.imu;
            hourlyBuckets[hour].samples++;
        });

        // Calculate averages
        return Object.values(hourlyBuckets).map(bucket => ({
            hour: bucket.hour,
            movements: bucket.movements,
            avgIMU: Math.round((bucket.avgIMU / bucket.samples) * 100) / 100
        }));
    },

    /**
     * Save sleep session to Firestore
     */
    async saveSleepSession() {
        if (!this.currentSession || !firebase || !auth || !auth.currentUser) {
            console.error('[SleepTracker] Cannot save: no session or not logged in');
            return;
        }

        try {
            const sessionData = {
                userId: auth.currentUser.uid,
                startTime: firebase.firestore.Timestamp.fromDate(this.currentSession.startTime),
                endTime: firebase.firestore.Timestamp.fromDate(this.currentSession.endTime),
                duration: this.currentSession.duration,
                sleepQuality: this.currentSession.sleepQuality,
                totalMovements: this.currentSession.totalMovements,
                stages: this.currentSession.stages,
                averageHR: this.currentSession.averageHR,
                lowestHR: this.currentSession.lowestHR === 999 ? 0 : this.currentSession.lowestHR,
                movements: this.currentSession.movements,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await db.collection('sleepSessions').add(sessionData);
            console.log('[SleepTracker] Sleep session saved to Firestore');

            if (typeof Utils !== 'undefined') {
                Utils.showToast('✅ Sleep data tersimpan', 'success');
            }
        } catch (error) {
            console.error('[SleepTracker] Error saving sleep session:', error);
            if (typeof Utils !== 'undefined') {
                Utils.showToast('⚠️ Gagal menyimpan data: ' + error.message, 'error');
            }
        }
    },

    /**
     * Show sleep summary modal
     */
    showSleepSummary() {
        if (!this.currentSession) return;

        const session = this.currentSession;
        const hours = Math.floor(session.duration / 60);
        const minutes = Math.round(session.duration % 60);

        // Get quality category
        let qualityCategory = 'Buruk';
        let qualityColor = '#ef4444';
        let qualityIcon = 'fa-frown';

        if (session.sleepQuality >= 80) {
            qualityCategory = 'Excellent';
            qualityColor = '#10b981';
            qualityIcon = 'fa-star';
        } else if (session.sleepQuality >= 70) {
            qualityCategory = 'Baik';
            qualityColor = '#3b82f6';
            qualityIcon = 'fa-smile';
        } else if (session.sleepQuality >= 50) {
            qualityCategory = 'Cukup';
            qualityColor = '#f59e0b';
            qualityIcon = 'fa-meh';
        }

        const summaryHTML = `
            <div style="text-align: center; padding: 20px;">
                <div style="width: 80px; height: 80px; background: ${qualityColor}15; border-radius: 50%;
                            display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                    <i class="fas ${qualityIcon}" style="font-size: 2.5rem; color: ${qualityColor};"></i>
                </div>

                <h3 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 8px;">
                    Sleep Quality: ${session.sleepQuality}/100
                </h3>
                <p style="color: ${qualityColor}; font-weight: 600; margin-bottom: 20px;">
                    ${qualityCategory}
                </p>

                <div style="background: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
                    <div style="font-size: 0.85rem; color: #64748b; margin-bottom: 8px;">Total Durasi Tidur</div>
                    <div style="font-size: 1.75rem; font-weight: 700; color: #8B5CF6;">
                        ${hours}j ${minutes}m
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px;">
                    <div style="background: #f0fdf4; border-radius: 12px; padding: 12px;">
                        <div style="font-size: 0.75rem; color: #059669; margin-bottom: 4px;">Deep Sleep</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #10b981;">${session.stages.deep}m</div>
                    </div>
                    <div style="background: #eff6ff; border-radius: 12px; padding: 12px;">
                        <div style="font-size: 0.75rem; color: #2563eb; margin-bottom: 4px;">Light Sleep</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #3b82f6;">${session.stages.light}m</div>
                    </div>
                    <div style="background: #fef3c7; border-radius: 12px; padding: 12px;">
                        <div style="font-size: 0.75rem; color: #d97706; margin-bottom: 4px;">REM</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #f59e0b;">${session.stages.rem}m</div>
                    </div>
                    <div style="background: #fee2e2; border-radius: 12px; padding: 12px;">
                        <div style="font-size: 0.75rem; color: #dc2626; margin-bottom: 4px;">Awake</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: #ef4444;">${session.stages.awake}m</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
                    <div style="text-align: left; padding: 10px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div style="font-size: 0.75rem; color: #64748b;">Total Movements</div>
                        <div style="font-size: 1.1rem; font-weight: 700; color: #333;">${session.totalMovements}</div>
                    </div>
                    <div style="text-align: left; padding: 10px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                        <div style="font-size: 0.75rem; color: #64748b;">Avg Heart Rate</div>
                        <div style="font-size: 1.1rem; font-weight: 700; color: #333;">${session.averageHR} bpm</div>
                    </div>
                </div>

                <button onclick="document.getElementById('sleepSummaryModal').remove()"
                        style="margin-top: 20px; width: 100%; padding: 12px; background: var(--gradient-primary);
                               color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer;">
                    OK, Mengerti
                </button>
            </div>
        `;

        // Create modal
        const modal = document.createElement('div');
        modal.id = 'sleepSummaryModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center; z-index: 10000;
            padding: 20px;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: white; border-radius: 20px; max-width: 500px; width: 100%;
            max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        `;
        modalContent.innerHTML = summaryHTML;

        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    },

    /**
     * Update UI based on tracking state
     */
    updateUI(state) {
        const startBtn = document.getElementById('startSleepTrackingBtn');
        const stopBtn = document.getElementById('stopSleepTrackingBtn');
        const statusEl = document.getElementById('sleepTrackingStatus');

        if (!startBtn || !stopBtn) return;

        if (state === 'tracking') {
            startBtn.style.display = 'none';
            stopBtn.style.display = 'block';
            if (statusEl) statusEl.textContent = '🟢 Tracking Active';
        } else {
            startBtn.style.display = 'block';
            stopBtn.style.display = 'none';
            if (statusEl) statusEl.textContent = '';
        }
    },

    /**
     * Get recent sleep sessions from Firestore
     */
    async getRecentSessions(limit = 7) {
        if (!firebase || !auth || !auth.currentUser) return [];

        try {
            const snapshot = await db.collection('sleepSessions')
                .where('userId', '==', auth.currentUser.uid)
                .orderBy('startTime', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                startTime: doc.data().startTime.toDate(),
                endTime: doc.data().endTime.toDate()
            }));
        } catch (error) {
            console.error('[SleepTracker] Error fetching sessions:', error);
            return [];
        }
    }
};

// Make globally available
window.SleepTracker = SleepTracker;
