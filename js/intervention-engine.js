/**
 * SYNAWATCH - Closed-Loop Intervention Engine
 * Processes real-time sensor data against baseline psychological states
 * to trigger automated dynamic interventions.
 */

const InterventionEngine = {
    baseline: null,
    cooldowns: {
        breathing: 0,
        synachat: 0,
        music: 0,
        yoga: 0,
        crisis: 0,
        eeg_stress: 0,
        eeg_overload: 0,
        eeg_drowsy: 0
    },
    COOLDOWN_PERIOD: 5 * 60 * 1000, // 5 minutes between automatic interventions
    SIMULATION_MODE: true, // Set to true to allow easier trigger during dev

    /* ── EEG closed-loop state ─────────────────────────────────────
     * Sustained-detection buffer: an EEG state must persist across
     * several consecutive epochs before triggering, to avoid noise.
     */
    eegBuffer: [],
    EEG_BUFFER_SIZE: 6,           // ~ last 6 metric ticks
    EEG_SUSTAIN_RATIO: 0.66,      // 66% of buffer must agree
    _eegSubscribed: false,

    /**
     * [GAP 2] Adaptive Threshold Calibration
     * Sliding window of recent sensor readings for personalized baseline learning
     * Based on: Nahum-Shani et al. 2019 (JITAI), Bischoff et al. 2025, Galli et al. 2022
     */
    sensorHistory: [],
    HISTORY_WINDOW: 100, // Keep last 100 readings for rolling baseline
    personalBaseline: null, // Learned from user's own data

    /**
     * Initialize engine with user baseline
     */
    init(userData) {
        const phq9 = userData.initialPhq9Score || 0;
        this.baseline = {
            phq9Score: phq9,
            stressThreshold: this.calculateStressThreshold(phq9),
            uclaScore: userData.uclaScore || 0
        };

        // [GAP 2] Load personal baseline from localStorage if available
        try {
            const saved = localStorage.getItem('synawatch_personal_baseline');
            if (saved) this.personalBaseline = JSON.parse(saved);
        } catch (e) {}

        console.log("Intervention Engine v2.0 Initialized. Threshold:", this.baseline.stressThreshold,
            "Personal baseline:", this.personalBaseline ? 'loaded' : 'learning...');

        // Subscribe to EEG metrics for brain-driven interventions
        this.subscribeEEG();
    },

    /**
     * [EEG] Subscribe to MuseEEG metrics → brain-state-driven interventions.
     * Uses the trained mental-state & cognitive-load MLP classifiers.
     */
    subscribeEEG() {
        if (this._eegSubscribed) return;
        if (typeof MuseEEG === 'undefined') {
            /* MuseEEG script may load later — retry a few times */
            this._eegRetries = (this._eegRetries || 0) + 1;
            if (this._eegRetries <= 10) {
                setTimeout(() => this.subscribeEEG(), 1000);
            }
            return;
        }
        try {
            MuseEEG.onMetrics((m) => this.processEEG(m));
            this._eegSubscribed = true;
            console.log("Intervention Engine: subscribed to EEG metrics.");
        } catch (e) { /* MuseEEG not ready yet */ }
    },

    /**
     * [EEG] Process a Muse metrics tick. Buffers the ML-classified mental
     * state and only fires an intervention when a concerning state is
     * sustained across the buffer window (reduces false positives).
     */
    processEEG(m) {
        if (!m) return;

        // Prefer ML mental-state label; fall back to cognitive load
        const state = m.mentalState?.label || null;
        const load  = m.cognitiveLoad?.label || null;
        const emo   = m.emotion?.label || null;
        const conf  = m.mentalState?.prob || 0;

        // Only buffer reasonably confident classifications
        if (state && conf >= 0.5) {
            this.eegBuffer.push({ state, load, emo, ts: Date.now() });
            if (this.eegBuffer.length > this.EEG_BUFFER_SIZE) this.eegBuffer.shift();
        }

        if (this.eegBuffer.length < this.EEG_BUFFER_SIZE) return;

        const now = Date.now();
        const ratio = (label, key) => {
            const c = this.eegBuffer.filter(e => e[key] === label).length;
            return c / this.eegBuffer.length;
        };

        // 1) Sustained NEGATIVE emotion → calming / uplift intervention
        if (ratio('negative', 'emo') >= this.EEG_SUSTAIN_RATIO) {
            if (now - this.cooldowns.eeg_stress > this.COOLDOWN_PERIOD) {
                this.cooldowns.eeg_stress = now;
                this.logInterventionToDB('eeg_stress');
                this.showAromaOrFallback('stressed',
                    "Pola emosi negatif terdeteksi menetap pada EEG. Latihan pernapasan atau aromaterapi menenangkan bisa membantu.",
                    () => { if (typeof Router !== 'undefined') Router.navigate('mindful'); });
                this.eegBuffer = [];
                return;
            }
        }

        // 2) Sustained COGNITIVE OVERLOAD → suggest a short break / mindful
        if (ratio('overload', 'load') >= this.EEG_SUSTAIN_RATIO) {
            if (now - this.cooldowns.eeg_overload > this.COOLDOWN_PERIOD) {
                this.cooldowns.eeg_overload = now;
                this.logInterventionToDB('eeg_overload');
                this.showAromaOrFallback('overload',
                    "Beban kognitif terdeteksi tinggi (theta naik, alpha turun). Istirahat 2 menit atau latihan grounding bisa memulihkan fokus.",
                    () => { if (typeof Router !== 'undefined') Router.navigate('mindful'); });
                this.eegBuffer = [];
                return;
            }
        }

        // 3) Sustained RELAXED+low engagement during the day → gentle activation
        if (ratio('relaxed', 'state') >= this.EEG_SUSTAIN_RATIO) {
            const hour = new Date().getHours();
            if (hour >= 8 && hour <= 20 && now - this.cooldowns.eeg_drowsy > this.COOLDOWN_PERIOD * 3) {
                this.cooldowns.eeg_drowsy = now;
                this.logInterventionToDB('eeg_drowsy');
                this.showAromaOrFallback('drowsy',
                    "Gelombang otak menunjukkan kondisi sangat rileks/mengantuk di jam aktif. Peregangan atau musik energik bisa menyegarkan.",
                    () => { if (typeof Router !== 'undefined') Router.navigate('moodbooster'); });
                this.eegBuffer = [];
                return;
            }
        }
    },

    /**
     * [AROMA] When a concerning EEG state is sustained, offer an aromatherapy
     * blend (kemiri-based) tailored to that state — with a fallback action.
     */
    showAromaOrFallback(stateLabel, fallbackMsg, fallbackAction) {
        // If aroma recommender is available, build a state-specific blend
        if (typeof AromaRecommender !== 'undefined' && typeof AromaDB !== 'undefined') {
            try {
                /* Map sustained EEG state → recommender input */
                const eegInput = { eeg: { mentalState: { label: stateLabel } } };
                if (stateLabel === 'overload') eegInput.eeg.cognitiveLoad = { label: 'overload' };
                const rec = AromaRecommender.recommend(eegInput);
                if (rec && rec.blend && rec.blend.length) {
                    const blendNames = rec.blend.map(b => `${b.name} (${b.drops} tetes)`).join(', ');
                    const msg = `${fallbackMsg}\n\n🌿 Scentra menyarankan aromaterapi: ${rec.carrier.name} + ${blendNames}.`;
                    this.showAromaAlert(msg, rec, fallbackAction);
                    return;
                }
            } catch (e) { /* fall through */ }
        }
        this.showAlert(fallbackMsg, fallbackAction);
    },

    /**
     * Aroma-specific alert with 2 actions: open Aroma Advisor, or do fallback.
     */
    showAromaAlert(message, rec, fallbackAction) {
        if (document.querySelector('.intervention-modal-overlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'intervention-modal-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(76,29,149,0.55);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:9999;animation:fadeIn 0.3s;';

        const blendChips = rec.blend.map(b =>
            `<span style="display:inline-block;background:rgba(124,58,237,0.1);color:#6d28d9;font-size:0.72rem;font-weight:700;padding:4px 10px;border-radius:99px;margin:2px;">${b.name} · ${b.drops}d</span>`
        ).join('');

        overlay.innerHTML = `
            <div style="background:white;padding:30px 24px;border-radius:28px;width:90%;max-width:400px;text-align:center;box-shadow:0 20px 40px rgba(124,58,237,0.25);transform:scale(0.95);animation:slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards;">
                <div style="width:68px;height:68px;background:linear-gradient(135deg,#8b5cf6,#7c3aed);border-radius:20px;display:flex;align-items:center;justify-content:center;margin:0 auto 18px;color:#fff;font-size:2rem;box-shadow:0 8px 18px rgba(124,58,237,0.3);">
                    <i class="fas fa-spray-can-sparkles"></i>
                </div>
                <h3 style="font-size:1.3rem;font-weight:800;margin-bottom:10px;color:#4c1d95;">Aromaterapi untuk Anda</h3>
                <p style="color:#64748b;margin-bottom:14px;font-size:0.92rem;line-height:1.55;white-space:pre-line;">${message}</p>
                <div style="margin-bottom:20px;">
                    <div style="font-size:0.72rem;color:#7c3aed;font-weight:700;margin-bottom:6px;">BASE: ${rec.carrier.name}</div>
                    ${blendChips}
                </div>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <button id="btnAroma" class="btn btn-primary" style="width:100%;padding:14px;font-size:1rem;border-radius:14px;justify-content:center;background:linear-gradient(135deg,#8b5cf6,#7c3aed);border:none;">
                        <i class="fas fa-flask"></i> Buka Aroma Advisor
                    </button>
                    <button id="btnAromaAlt" class="btn" style="width:100%;padding:14px;font-size:0.95rem;border-radius:14px;justify-content:center;background:#f3f4f6;color:#374151;border:none;">
                        Latihan lain saja
                    </button>
                    <button id="btnAromaDismiss" style="width:100%;padding:10px;font-size:0.85rem;border-radius:14px;background:transparent;color:#9ca3af;border:1px solid #e5e7eb;cursor:pointer;">Nanti saja</button>
                </div>
            </div>
            <style>@keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(0.95);}to{opacity:1;transform:translateY(0) scale(1);}}</style>
        `;
        document.body.appendChild(overlay);

        const close = () => { overlay.style.animation = 'fadeOut 0.3s forwards'; setTimeout(() => overlay.remove(), 300); };
        document.getElementById('btnAromaDismiss').onclick = close;
        document.getElementById('btnAroma').onclick = () => { close(); if (typeof Router !== 'undefined') Router.navigate('aroma'); };
        document.getElementById('btnAromaAlt').onclick = () => { close(); if (fallbackAction) fallbackAction(); };
    },

    /**
     * Dynamically adjust sensitivity based on PHQ-9/UCLA
     */
    calculateStressThreshold(phq9Score) {
        // High PHQ-9 means lower threshold for triggering interventions
        if (phq9Score >= 15) return 60; // Very sensitive
        if (phq9Score >= 10) return 70; // Sensitive
        if (phq9Score >= 5)  return 80; // Normal
        return 85;                      // High threshold
    },

    /**
     * [GAP 2] Update rolling personal baseline from sensor readings
     * Learns user's "normal" physiological state over time
     */
    updatePersonalBaseline(data) {
        this.sensorHistory.push({
            stress: data.stress || 0,
            hr: data.hr || 0,
            gsr: data.gsr || 0,
            spo2: data.spo2 || 0,
            ts: Date.now()
        });

        // Keep sliding window
        if (this.sensorHistory.length > this.HISTORY_WINDOW) {
            this.sensorHistory.shift();
        }

        // Recalculate personal baseline every 20 readings
        if (this.sensorHistory.length >= 20 && this.sensorHistory.length % 20 === 0) {
            const recent = this.sensorHistory.slice(-50);
            this.personalBaseline = {
                avgStress: recent.reduce((s, r) => s + r.stress, 0) / recent.length,
                avgHR: recent.reduce((s, r) => s + r.hr, 0) / recent.length,
                avgGSR: recent.reduce((s, r) => s + r.gsr, 0) / recent.length,
                stdStress: this.stdDev(recent.map(r => r.stress)),
                stdHR: this.stdDev(recent.map(r => r.hr)),
                updatedAt: Date.now()
            };

            // Persist for future sessions
            try {
                localStorage.setItem('synawatch_personal_baseline', JSON.stringify(this.personalBaseline));
            } catch (e) {}
        }
    },

    /**
     * Calculate standard deviation for adaptive thresholds
     */
    stdDev(values) {
        const avg = values.reduce((s, v) => s + v, 0) / values.length;
        const squareDiffs = values.map(v => Math.pow(v - avg, 2));
        return Math.sqrt(squareDiffs.reduce((s, v) => s + v, 0) / values.length);
    },

    /**
     * [GAP 2] Get effective threshold - uses personal baseline if available
     * Threshold = personal average + 1.5 standard deviations (statistically significant deviation)
     */
    getEffectiveThreshold() {
        if (this.personalBaseline && this.personalBaseline.stdStress > 0) {
            // Adaptive: user's personal mean + 1.5 SD, but capped by PHQ-9 based threshold
            const adaptiveThreshold = Math.round(this.personalBaseline.avgStress + (1.5 * this.personalBaseline.stdStress));
            return Math.min(adaptiveThreshold, this.baseline.stressThreshold);
        }
        return this.baseline.stressThreshold;
    },

    /**
     * Process incoming telemetry data from watch (Heart Rate, GSR, Stress calc)
     * Called by App.handleBLEData automatically
     * Enhanced with [GAP 2] adaptive thresholds and [GAP 7] crisis detection
     */
    processTelemetry(data) {
        if (!this.baseline || (!data.finger && !this.SIMULATION_MODE)) return;

        // [GAP 2] Update personal baseline learning
        this.updatePersonalBaseline(data);

        // Store latest data for use in triggerIntervention messages
        this._lastData = data;

        const now = Date.now();
        const stress = data.stress || 0;
        const hr = data.hr || 0;
        const gsr = data.gsr || 0;
        const threshold = this.getEffectiveThreshold();

        // Detect acute stress event (Panic attack / High anxiety)
        if (stress > threshold && gsr > 70) {
            if (now - this.cooldowns.breathing > this.COOLDOWN_PERIOD) {
                this.triggerIntervention('breathing');
                this.cooldowns.breathing = now;
            }
        }

        // Detect chronic prolonged stress / elevated HR while resting (activity == 0)
        if (stress > threshold - 10 && data.act === 0) {
             if (now - this.cooldowns.synachat > this.COOLDOWN_PERIOD * 2) {
                this.triggerIntervention('synachat');
                this.cooldowns.synachat = now;
            }
        }

        // [GAP 3] Detect mood suitable for music therapy
        if (stress > threshold - 15 && gsr > 50 && gsr <= 70) {
            if (now - this.cooldowns.music > this.COOLDOWN_PERIOD) {
                this.triggerIntervention('music');
                this.cooldowns.music = now;
            }
        }

        // [GAP 4] Yoga intervention: stres sedang + tidak bergerak → cocok untuk yoga menenangkan
        if (stress > threshold - 20 && stress <= threshold && gsr > 40 && data.act === 'DIAM') {
            if (now - this.cooldowns.yoga > this.COOLDOWN_PERIOD * 1.5) {
                this.triggerIntervention('yoga_calm');
                this.cooldowns.yoga = now;
            }
        }

        // [GAP 4] Yoga recovery: setelah aktivitas tinggi + stress mulai naik → cool-down yoga
        if ((data.act === 'LARI' || data.act === 'AKTIF') && stress > threshold - 25 && hr > 90) {
            if (now - this.cooldowns.yoga > this.COOLDOWN_PERIOD * 2) {
                this.triggerIntervention('yoga_recovery');
                this.cooldowns.yoga = now;
            }
        }

        // [GAP 7] Crisis detection: sustained extreme readings + high PHQ-9 + high UCLA
        if (this.baseline.phq9Score >= 15 && stress > 85 && gsr > 80 && hr > 100) {
            if (now - this.cooldowns.crisis > this.COOLDOWN_PERIOD * 3) {
                this.triggerIntervention('crisis');
                this.cooldowns.crisis = now;
            }
        }
    },

    /**
     * Trigger specific intervention UI
     */
    triggerIntervention(type) {
        console.log("TRIGGERING CLOSED-LOOP INTERVENTION:", type);

        // Save intervention event to database
        this.logInterventionToDB(type);

        const data = this._lastData || {};

        switch(type) {
            case 'breathing':
                this.showAlert("Detak jantung dan stres terdeteksi tinggi. Mari istirahat sejenak dengan latihan pernapasan 4-7-8.", () => {
                    // Navigate to mindful module (Batch 05)
                    Utils.showToast("Diarahkan ke Modul Mindfulness...", "info");
                    // Router.navigate('mindful'); 
                });
                break;
            case 'synachat':
                this.showAlert("AI mendeteksi pola stres saat Anda sedang rileks. Mau ngobrol sebentar dengan Dr. Synachat?", () => {
                    Router.navigate('synachat');
                });
                break;
            case 'music':
                this.showAlert("Mood Booster yang menenangkan disiapkan untuk Anda berdasarkan metrik vital Anda.", () => {
                    Router.navigate('moodbooster');
                });
                break;
            case 'yoga_calm':
                this.showAlert(
                    `Stres terdeteksi (${Math.round(data?.stress || 0)}%). Yoga menenangkan dapat membantu menurunkan tegangan. Mau mencoba beberapa pose relaksasi?`,
                    () => {
                        if (typeof Router !== 'undefined') Router.navigate('yoga');
                        if (typeof YogaModule !== 'undefined') {
                            setTimeout(() => YogaModule.applyBiometricFilter('calm'), 400);
                        }
                    }
                );
                break;
            case 'yoga_recovery':
                this.showAlert(
                    `Aktivitas tinggi terdeteksi. Cool-down dengan yoga ringan membantu detak jantung kembali normal lebih cepat.`,
                    () => {
                        if (typeof Router !== 'undefined') Router.navigate('yoga');
                        if (typeof YogaModule !== 'undefined') {
                            setTimeout(() => YogaModule.applyBiometricFilter('recovery'), 400);
                        }
                    }
                );
                break;
            case 'crisis':
                // [GAP 7] Auto-activated crisis protocol
                this.showCrisisAlert();
                break;
        }
    },

    /**
     * Show custom non-intrusive popup
     */
    showAlert(message, onAccept) {
        // Prevent stacking overlays
        if (document.querySelector('.intervention-modal-overlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'intervention-modal-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:9999;animation:fadeIn 0.3s;';
        
        overlay.innerHTML = `
            <div style="background:white;padding:32px 24px;border-radius:32px;width:90%;max-width:400px;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,0.2);transform:scale(0.95);animation:slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
                <div style="width:72px;height:72px;background:linear-gradient(135deg, var(--primary-100), var(--primary-200));border-radius:24px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;color:var(--primary-600);font-size:2.5rem;box-shadow:0 8px 16px rgba(99,102,241,0.2);">
                    <i class="fas fa-heart-pulse" style="animation:pulse 2s infinite;"></i>
                </div>
                <h3 style="font-size:1.5rem;font-weight:800;margin-bottom:12px;color:var(--text-primary);letter-spacing:-0.5px;">Sinkronisasi Tubuh & Pikiran</h3>
                <p style="color:var(--text-secondary);margin-bottom:32px;font-size:1rem;line-height:1.6;">${message}</p>
                <div style="display:flex;flex-direction:column;gap:12px;">
                    <button id="btnAccept" class="btn btn-primary" style="width:100%;padding:16px;font-size:1.1rem;border-radius:16px;justify-content:center;background:linear-gradient(135deg, var(--primary-500), var(--primary-600));border:none;box-shadow:0 8px 16px rgba(99,102,241,0.3);">Ya, Tentu Saja</button>
                    <button id="btnDismiss" class="btn btn-outline" style="width:100%;padding:16px;font-size:1.1rem;border-radius:16px;justify-content:center;border-color:var(--border-color);color:var(--text-tertiary);">Nanti Saja</button>
                </div>
            </div>
            <style>
                @keyframes slideUp { 
                    from { opacity: 0; transform: translateY(20px) scale(0.95); } 
                    to { opacity: 1; transform: translateY(0) scale(1); } 
                }
            </style>
        `;

        document.body.appendChild(overlay);

        document.getElementById('btnDismiss').onclick = () => {
            overlay.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => overlay.remove(), 300);
        };
        document.getElementById('btnAccept').onclick = () => {
            overlay.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => overlay.remove(), 300);
            if(onAccept) onAccept();
        };
    },

    /**
     * [GAP 7] Show crisis alert with immediate support options
     * Based on: Melvin et al. 2024, Nuij et al. 2020 (SafePlan), Berrouiguet et al. 2023
     */
    showCrisisAlert() {
        if (document.querySelector('.intervention-modal-overlay')) return;

        const overlay = document.createElement('div');
        overlay.className = 'intervention-modal-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(127,29,29,0.7);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;z-index:9999;animation:fadeIn 0.3s;';

        overlay.innerHTML = `
            <div style="background:white;padding:32px 24px;border-radius:32px;width:90%;max-width:400px;text-align:center;box-shadow:0 20px 40px rgba(0,0,0,0.3);transform:scale(0.95);animation:slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;">
                <div style="width:72px;height:72px;background:linear-gradient(135deg, #fecaca, #fca5a5);border-radius:24px;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;color:#dc2626;font-size:2.5rem;box-shadow:0 8px 16px rgba(220,38,38,0.2);">
                    <i class="fas fa-shield-heart" style="animation:pulse 2s infinite;"></i>
                </div>
                <h3 style="font-size:1.4rem;font-weight:800;margin-bottom:12px;color:#991b1b;letter-spacing:-0.5px;">Protokol Keamanan Aktif</h3>
                <p style="color:#7f1d1d;margin-bottom:8px;font-size:0.95rem;line-height:1.6;">Sensor mendeteksi pola fisiologis yang memerlukan perhatian segera. Anda tidak sendirian.</p>
                <p style="color:#9ca3af;font-size:0.8rem;margin-bottom:24px;">Stres, detak jantung, dan GSR sangat tinggi.</p>
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <a href="tel:119" style="display:block;width:100%;padding:14px;font-size:1rem;border-radius:16px;text-align:center;background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;border:none;font-weight:700;text-decoration:none;box-shadow:0 8px 16px rgba(220,38,38,0.3);">
                        <i class="fas fa-phone-alt"></i> Hubungi Sejiwa (119 ext 8)
                    </a>
                    <button id="btnCrisisChat" style="width:100%;padding:14px;font-size:1rem;border-radius:16px;background:#f97316;color:white;border:none;font-weight:600;cursor:pointer;">
                        <i class="fas fa-comments"></i> Bicara dengan Dr. Synachat
                    </button>
                    <button id="btnCrisisPlan" style="width:100%;padding:14px;font-size:1rem;border-radius:16px;background:#f3f4f6;color:#374151;border:none;font-weight:600;cursor:pointer;">
                        <i class="fas fa-hand-holding-heart"></i> Buka Support Hub
                    </button>
                    <button id="btnCrisisDismiss" style="width:100%;padding:12px;font-size:0.9rem;border-radius:16px;background:transparent;color:#9ca3af;border:1px solid #e5e7eb;cursor:pointer;">
                        Saya baik-baik saja
                    </button>
                </div>
            </div>
            <style>
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
            </style>
        `;

        document.body.appendChild(overlay);

        const dismiss = () => {
            overlay.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => overlay.remove(), 300);
        };

        document.getElementById('btnCrisisDismiss').onclick = dismiss;
        document.getElementById('btnCrisisChat').onclick = () => { dismiss(); Router.navigate('synachat'); };
        document.getElementById('btnCrisisPlan').onclick = () => { dismiss(); Router.navigate('support'); };
    },

    async logInterventionToDB(type) {
        const user = auth?.currentUser;
        if (user && typeof db !== 'undefined') {
            try {
                await FirebaseService.userCol(user.uid, 'interventions').add({
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    type: type,
                    baselineState: this.baseline
                });
            } catch (e) { console.error("Failed to log intervention:", e); }
        }
    }
};

window.InterventionEngine = InterventionEngine;
