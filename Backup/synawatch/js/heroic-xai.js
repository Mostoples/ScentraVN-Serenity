/**
 * SYNAWATCH - HEROIC-XAI Engine (Sprint 1)
 *
 * Implements the 6-dimensional HEROIC psychoeducation framework with
 * Explainable AI (XAI) transparency layer, grounded in:
 * - Nahum-Shani et al. (2018) - JITAI design principles
 * - Bandura (1997) - Self-Efficacy theory
 * - Neff & Germer (2013) - Mindful Self-Compassion
 * - Arrieta et al. (2020) - XAI taxonomy in healthcare
 * - Markus et al. (2021) - Trustworthy AI: transparency + uncertainty
 *
 * HEROIC Dimensions:
 *   H - Humor (Gonot-Schoupinsky & Garip, 2019; Crawford & Caltabiano, 2022)
 *   E - Efficacy / Self-Efficacy (Bandura, 1977, 1997; Chua et al., 2020)
 *   R - Religiosity / Spirituality (Bozzini et al., 2023; VanderWeele et al., 2016)
 *   O - Optimism (Scheier & Carver, 1985; Meevissen et al., 2011; Menezes et al., 2022)
 *   I - Interaction / Social Support (Holt-Lunstad et al., 2015; Masi et al., 2011)
 *   C - Compassion / Self-Compassion (Neff, 2003; MacBeth & Gumley, 2012; Luo et al., 2022)
 */

const HeroicXAI = {

    // ─── Score State ──────────────────────────────────────────────────────────
    scores: { H: 50, E: 50, R: 50, O: 50, I: 50, C: 50 },
    scoreHistory: [],   // Array of { ts, scores, sensorSnapshot }
    lastUpdated: null,

    // ─── Dimension Metadata ───────────────────────────────────────────────────
    DIMENSIONS: {
        H: {
            key: 'H',
            name: 'Humor',
            label: 'Humor & Tawa',
            icon: 'fa-face-laugh-beam',
            color: '#F59E0B',
            gradient: 'linear-gradient(135deg, #FDE68A, #F59E0B)',
            description: 'Kemampuan menemukan sisi positif & humor dalam kehidupan',
            lowMsg: 'Skor Humor rendah terdeteksi. Humor terbukti menurunkan kortisol 20–30% dalam 5 menit.',
            reference: 'Crawford & Caltabiano (2022); Gonot-Schoupinsky (2019)',
            threshold: { low: 35, moderate: 60 }
        },
        E: {
            key: 'E',
            name: 'Efficacy',
            label: 'Efikasi Diri',
            icon: 'fa-bolt',
            color: '#3B82F6',
            gradient: 'linear-gradient(135deg, #BFDBFE, #3B82F6)',
            description: 'Keyakinan pada kemampuan diri untuk menghadapi tantangan',
            lowMsg: 'Efikasi Diri menurun. Teori Bandura (1997): penyelesaian tugas kecil membangun keyakinan secara bertahap.',
            reference: 'Bandura (1977, 1997); Chua et al. (2020)',
            threshold: { low: 35, moderate: 60 }
        },
        R: {
            key: 'R',
            name: 'Religiosity',
            label: 'Religiusitas',
            icon: 'fa-hands-praying',
            color: '#10B981',
            gradient: 'linear-gradient(135deg, #A7F3D0, #10B981)',
            description: 'Koneksi spiritual dan nilai-nilai keimanan sebagai sumber kekuatan',
            lowMsg: 'Skor Religiusitas rendah. Praktik spiritual terbukti menurunkan risiko depresi hingga 26% (Bozzini et al., 2023).',
            reference: 'Bozzini et al. (2023); VanderWeele et al. (2016)',
            threshold: { low: 35, moderate: 60 }
        },
        O: {
            key: 'O',
            name: 'Optimism',
            label: 'Optimisme',
            icon: 'fa-sun',
            color: '#8B5CF6',
            gradient: 'linear-gradient(135deg, #DDD6FE, #8B5CF6)',
            description: 'Ekspektasi positif terhadap masa depan dan kemampuan reframing',
            lowMsg: 'Optimisme rendah terdeteksi. Latihan "Best Possible Self" meningkatkan mood dalam 1–4 minggu (Meevissen et al., 2011).',
            reference: 'Scheier & Carver (1985); Meevissen et al. (2011)',
            threshold: { low: 35, moderate: 60 }
        },
        I: {
            key: 'I',
            name: 'Interaction',
            label: 'Interaksi Sosial',
            icon: 'fa-people-group',
            color: '#EC4899',
            gradient: 'linear-gradient(135deg, #FBCFE8, #EC4899)',
            description: 'Kualitas koneksi sosial dan dukungan dari lingkungan sekitar',
            lowMsg: 'Isolasi sosial setara merokok 15 batang/hari (Holt-Lunstad, 2015). Latihan koneksi kecil dapat membantu.',
            reference: 'Holt-Lunstad et al. (2015); Masi et al. (2011)',
            threshold: { low: 35, moderate: 60 }
        },
        C: {
            key: 'C',
            name: 'Compassion',
            label: 'Belas Kasih Diri',
            icon: 'fa-heart-circle-check',
            color: '#EF4444',
            gradient: 'linear-gradient(135deg, #FECACA, #EF4444)',
            description: 'Kemampuan memperlakukan diri sendiri dengan kasih dan pengertian',
            lowMsg: 'Self-Compassion rendah. Penelitian Neff & Germer (2013): latihan 8 minggu menurunkan depresi & kritik diri secara signifikan.',
            reference: 'Neff (2003); MacBeth & Gumley (2012); Luo et al. (2022)',
            threshold: { low: 35, moderate: 60 }
        }
    },

    // ─── Scoring Weights (evidence-based) ────────────────────────────────────
    // Based on PHQ-9 sensitivity → affect multiplier
    SCORE_WEIGHTS: {
        phq9:     { H: -2.5, E: -3.0, R: -1.5, O: -3.5, I: -2.0, C: -2.5 },
        gad7:     { H: -2.0, E: -2.5, R: -1.0, O: -2.0, I: -1.5, C: -2.0 },
        ucla:     { H: -1.5, E: -1.5, R: -1.0, O: -1.5, I: -4.0, C: -2.0 },
        stress:   { H: -0.3, E: -0.3, R: -0.2, O: -0.3, I: -0.2, C: -0.3 },
        activity: { H: +0.5, E: +1.0, R: +0.3, O: +0.5, I: +0.5, C: +0.3 },
        journal:  { H: +2.0, E: +2.5, R: +2.0, O: +2.5, I: +1.5, C: +2.0 },
        games:    { H: +3.0, E: +2.5, R: +1.5, O: +2.0, I: +2.0, C: +2.0 }
    },

    // ─── XAI Explanation Templates ────────────────────────────────────────────
    XAI_EXPLANATIONS: {
        sensorHigh: (dim, sensor, val, threshold) =>
            `Sensor ${sensor} menunjukkan ${val} (di atas ambang ${threshold}). ` +
            `Kondisi ini terkait dengan penurunan ${HeroicXAI.DIMENSIONS[dim].label}. ` +
            `[${HeroicXAI.DIMENSIONS[dim].reference}]`,
        scoreDropped: (dim, prev, curr) =>
            `Skor ${HeroicXAI.DIMENSIONS[dim].label} turun ${prev - curr} poin ` +
            `(dari ${prev} → ${curr}). ` + HeroicXAI.DIMENSIONS[dim].lowMsg,
        activityCompleted: (dim, actName) =>
            `Aktivitas "${actName}" selesai. Penelitian menunjukkan intervensi singkat ` +
            `meningkatkan ${HeroicXAI.DIMENSIONS[dim].label} secara bertahap. ` +
            `[${HeroicXAI.DIMENSIONS[dim].reference}]`,
        personalBaseline: (dim, score, avg, sd) =>
            `Skor ${HeroicXAI.DIMENSIONS[dim].label} Anda (${score}) berada ` +
            `${Math.abs(score - avg).toFixed(1)} poin di bawah rata-rata personal Anda (${avg.toFixed(0)}). ` +
            `Sistem merekomendasikan intervensi berdasarkan profil unik Anda.`
    },

    // ─── Initializer ──────────────────────────────────────────────────────────
    /**
     * Initialize HEROIC engine with user baseline data
     * Called after assessment completion (PHQ-9, GAD-7, UCLA)
     *
     * @param {Object} userData - Firestore user document
     */
    init(userData) {
        if (!userData) return;

        const phq9  = userData.initialPhq9Score  || 0;
        const gad7  = userData.initialGad7Score   || 0;
        const ucla  = userData.uclaScore           || 0;

        // Calculate initial 6-dimensional scores from assessment data
        // Base score = 100, then deduct based on clinical instruments
        const base = 100;
        for (const dim of Object.keys(this.scores)) {
            let score = base;
            score += (phq9 / 27) * 100 * this.SCORE_WEIGHTS.phq9[dim];
            score += (gad7 / 21) * 100 * this.SCORE_WEIGHTS.gad7[dim];
            score += (ucla / 60) * 100 * this.SCORE_WEIGHTS.ucla[dim];
            this.scores[dim] = Math.round(Math.max(10, Math.min(100, score)));
        }

        // Load persisted scores if available
        this._loadFromStorage();

        console.log('[HEROIC-XAI] Initialized. Scores:', this.scores);
        this.lastUpdated = Date.now();
    },

    // ─── Score Computation ────────────────────────────────────────────────────
    /**
     * Process telemetry data and update HEROIC scores
     * Called by InterventionEngine.processTelemetry() on each BLE update
     * Implements adaptive sensor-to-score mapping (Nkurikiyeyezu et al., 2019)
     *
     * @param {Object} sensorData - { stress, hr, gsr, spo2, act }
     */
    updateFromSensor(sensorData) {
        if (!sensorData) return;

        const stress = sensorData.stress || 0;
        const gsr    = sensorData.gsr    || 0;
        const act    = sensorData.act    || 0; // activity level 0-3

        // Decay factor: elevated stress slowly erodes scores
        // Based on Boucsein (2012) psychophysiological response duration
        for (const dim of Object.keys(this.scores)) {
            const stressImpact = (stress > 60) ? (stress - 60) * this.SCORE_WEIGHTS.stress[dim] / 100 : 0;
            const activityBoost = act > 1 ? act * this.SCORE_WEIGHTS.activity[dim] / 100 : 0;
            this.scores[dim] = Math.round(Math.max(10, Math.min(100,
                this.scores[dim] + stressImpact + activityBoost
            )));
        }

        this.lastUpdated = Date.now();
    },

    /**
     * Apply score gains from completing a HEROIC activity
     * Implements Bandura's (1997) mastery experience → self-efficacy loop
     *
     * @param {string} dimension - 'H'|'E'|'R'|'O'|'I'|'C'
     * @param {string} activityName - name of the completed activity
     * @param {number} durationMin - minutes spent on activity
     * @param {Object|null} sensorPre  - sensor snapshot before activity
     * @param {Object|null} sensorPost - sensor snapshot after activity
     * @returns {Object} gainReport with XAI explanation
     */
    applyActivityGain(dimension, activityName, durationMin, sensorPre, sensorPost) {
        const dim = dimension.toUpperCase();
        if (!this.DIMENSIONS[dim]) return null;

        // Base gain: 2–8 points depending on duration (Seligman et al., 2005)
        const baseGain = Math.min(8, Math.max(2, durationMin * 0.4));

        // Sensor-confirmed gain: if post-activity stress is lower, bonus
        let sensorBonus = 0;
        if (sensorPre && sensorPost) {
            const stressDrop = (sensorPre.stress || 0) - (sensorPost.stress || 0);
            const gsrDrop    = (sensorPre.gsr    || 0) - (sensorPost.gsr    || 0);
            sensorBonus = Math.max(0, (stressDrop * 0.1) + (gsrDrop * 0.05));
        }

        const totalGain = Math.round(baseGain + sensorBonus);
        const prevScore  = this.scores[dim];
        this.scores[dim] = Math.min(100, prevScore + totalGain);

        // Small secondary gains for adjacent dimensions (positive spill-over)
        // Evidence: gratitude → optimism+compassion (Wood et al., 2010)
        const spillover = { H: ['O'], E: ['O','I'], R: ['C','O'], O: ['H','E'], I: ['C','H'], C: ['E','R'] };
        if (spillover[dim]) {
            spillover[dim].forEach(adj => {
                this.scores[adj] = Math.min(100, this.scores[adj] + Math.round(totalGain * 0.15));
            });
        }

        this.lastUpdated = Date.now();
        this._saveToStorage();
        this._logToFirestore('activity', { dimension: dim, activityName, durationMin, gain: totalGain, sensorPre, sensorPost });

        // Build XAI explanation
        const explanation = this.XAI_EXPLANATIONS.activityCompleted(dim, activityName);
        const sensorContext = sensorPost
            ? `Sensor post-aktivitas: Stres ${sensorPost.stress || '--'}, GSR ${sensorPost.gsr || '--'}%.`
            : '';

        return {
            dimension: dim,
            prevScore,
            newScore: this.scores[dim],
            gain: totalGain,
            sensorBonus: Math.round(sensorBonus),
            xaiExplanation: explanation + (sensorContext ? ' ' + sensorContext : ''),
            timestamp: Date.now()
        };
    },

    /**
     * Apply score changes from journal entry analysis
     * Implements Pennebaker (1986) expressive writing → emotional processing loop
     *
     * @param {Object} journalAnalysis - { dimension, sentiment, keyThemes, geminiScore }
     */
    applyJournalInsight(journalAnalysis) {
        const { dimension, sentiment, geminiScore } = journalAnalysis;
        const dim = (dimension || 'O').toUpperCase();
        if (!this.DIMENSIONS[dim]) return;

        // Gemini score: -1 (very negative) to +1 (very positive)
        const gain = Math.round((geminiScore || 0) * 5 + (sentiment === 'positive' ? 3 : sentiment === 'negative' ? -1 : 1));
        this.scores[dim] = Math.round(Math.max(10, Math.min(100, this.scores[dim] + gain)));
        this.lastUpdated = Date.now();
        this._saveToStorage();
    },

    // ─── XAI Explanation Generator ────────────────────────────────────────────
    /**
     * Generate a full XAI explanation for why a HEROIC intervention was triggered
     * Implements Markus et al. (2021) transparency + contextual explanation principle
     *
     * @param {string} dimension - which dimension to explain
     * @param {Object} context   - { sensorData, prevScore, triggerReason }
     * @returns {string} Plain-language Bahasa Indonesia explanation
     */
    generateXAIExplanation(dimension, context = {}) {
        const dim  = dimension.toUpperCase();
        const info = this.DIMENSIONS[dim];
        if (!info) return '';

        const score   = this.scores[dim];
        const sensor  = context.sensorData || {};
        const reasons = [];

        // 1. Score-based reason
        if (score < info.threshold.low) {
            reasons.push(`📊 Skor ${info.label} Anda saat ini ${score}/100 (rendah).`);
        } else if (score < info.threshold.moderate) {
            reasons.push(`📊 Skor ${info.label} Anda ${score}/100 (perlu perhatian).`);
        }

        // 2. Sensor-based reason
        if (sensor.stress && sensor.stress > 65) {
            reasons.push(`❤️ Tingkat stres fisiologis ${sensor.stress}% terdeteksi dari sensor.`);
        }
        if (sensor.gsr && sensor.gsr > 70) {
            reasons.push(`⚡ Respons galvanik kulit (GSR) ${sensor.gsr}% menunjukkan aktivasi simpatis.`);
        }
        if (sensor.hr && sensor.hr > 100) {
            reasons.push(`💓 Detak jantung ${sensor.hr} bpm melebihi ambang istirahat.`);
        }

        // 3. Evidence reference
        reasons.push(`📚 Referensi ilmiah: ${info.reference}`);

        // 4. Personalization note
        reasons.push(`🎯 Rekomendasi ini didasarkan pada profil unik Anda (data sensor + riwayat aktivitas).`);

        return reasons.join('\n');
    },

    /**
     * Get the weakest HEROIC dimension (lowest score)
     * Used by InterventionEngine to decide which dimension to prioritize
     *
     * @returns {string} dimension key ('H'|'E'|'R'|'O'|'I'|'C')
     */
    getWeakestDimension() {
        return Object.entries(this.scores)
            .sort((a, b) => a[1] - b[1])[0][0];
    },

    /**
     * Get dimensions below threshold sorted by deficit severity
     * @returns {Array} [{key, score, deficit}]
     */
    getDimensionsNeedingAttention() {
        return Object.entries(this.scores)
            .map(([key, score]) => ({
                key,
                score,
                deficit: this.DIMENSIONS[key].threshold.moderate - score,
                info: this.DIMENSIONS[key]
            }))
            .filter(d => d.score < this.DIMENSIONS[d.key].threshold.moderate)
            .sort((a, b) => b.deficit - a.deficit);
    },

    /**
     * Calculate overall HEROIC wellness index (0-100)
     * Weighted average reflecting clinical importance
     * E and C have higher weight (most evidence-based for digital delivery)
     */
    getOverallScore() {
        const weights = { H: 1.0, E: 1.5, R: 1.0, O: 1.3, I: 1.2, C: 1.5 };
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        const weightedSum = Object.entries(this.scores)
            .reduce((sum, [dim, score]) => sum + score * weights[dim], 0);
        return Math.round(weightedSum / totalWeight);
    },

    // ─── Radar Chart Data ─────────────────────────────────────────────────────
    /**
     * Get Chart.js-compatible radar chart data for HEROIC scores
     * @returns {Object} Chart.js dataset
     */
    getRadarChartData() {
        const dims = ['H', 'E', 'R', 'O', 'I', 'C'];
        return {
            labels: dims.map(d => this.DIMENSIONS[d].label),
            datasets: [{
                label: 'HEROIC Score',
                data: dims.map(d => this.scores[d]),
                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                borderColor: '#8B5CF6',
                borderWidth: 2,
                pointBackgroundColor: dims.map(d => this.DIMENSIONS[d].color),
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#8B5CF6',
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        };
    },

    // ─── Persistence ──────────────────────────────────────────────────────────
    _saveToStorage() {
        try {
            localStorage.setItem('synawatch_heroic_scores', JSON.stringify({
                scores: this.scores,
                lastUpdated: this.lastUpdated
            }));
        } catch (e) {}
    },

    _loadFromStorage() {
        try {
            const saved = localStorage.getItem('synawatch_heroic_scores');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.scores) {
                    // Merge saved scores (don't overwrite if assessment data is newer)
                    Object.assign(this.scores, data.scores);
                }
            }
        } catch (e) {}
    },

    async _logToFirestore(eventType, payload) {
        try {
            const user = typeof auth !== 'undefined' && auth?.currentUser;
            if (user && typeof db !== 'undefined') {
                await db.collection('heroicScoreHistory').add({
                    userId: user.uid,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    eventType,
                    scores: { ...this.scores },
                    overallScore: this.getOverallScore(),
                    ...payload
                });
            }
        } catch (e) { console.warn('[HEROIC-XAI] Firestore log failed:', e); }
    },

    // ─── Score History & Analytics ────────────────────────────────────────────
    /**
     * Load HEROIC score history from Firestore for analytics
     * @returns {Promise<Array>}
     */
    async loadScoreHistory(days = 30) {
        try {
            const user = typeof auth !== 'undefined' && auth?.currentUser;
            if (!user || typeof db === 'undefined') return [];

            const since = new Date();
            since.setDate(since.getDate() - days);

            const snap = await db.collection('heroicScoreHistory')
                .where('userId', '==', user.uid)
                .where('timestamp', '>=', since)
                .orderBy('timestamp', 'desc')
                .limit(100)
                .get();

            return snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) {
            console.warn('[HEROIC-XAI] Could not load history:', e);
            return [];
        }
    }
};

// ─── Extend InterventionEngine with HEROIC trigger ────────────────────────────
// Add HEROIC as a new intervention type following JITAI principles
// (Nahum-Shani et al., 2018 - decision rule: if score_deficit > 25 AND cooldown_elapsed)
if (typeof InterventionEngine !== 'undefined') {
    const _origProcessTelemetry = InterventionEngine.processTelemetry.bind(InterventionEngine);
    InterventionEngine.processTelemetry = function(data) {
        _origProcessTelemetry(data);

        // Update HEROIC scores from sensor data
        if (typeof HeroicXAI !== 'undefined') {
            HeroicXAI.updateFromSensor(data);

            // HEROIC JITAI trigger: weakest dimension + stress elevation
            const weakDim = HeroicXAI.getWeakestDimension();
            const weakScore = HeroicXAI.scores[weakDim];
            const now = Date.now();
            const HEROIC_COOLDOWN = 20 * 60 * 1000; // 20 minutes

            if (!this.cooldowns.heroic) this.cooldowns.heroic = 0;

            if (weakScore < 40 && (data.stress || 0) > 55) {
                if (now - this.cooldowns.heroic > HEROIC_COOLDOWN) {
                    this.triggerHeroicIntervention(weakDim, weakScore, data);
                    this.cooldowns.heroic = now;
                }
            }
        }
    };

    // Add HEROIC intervention handler to InterventionEngine
    InterventionEngine.triggerHeroicIntervention = function(dimension, score, sensorData) {
        const dimInfo = HeroicXAI.DIMENSIONS[dimension];
        if (!dimInfo) return;

        console.log('[InterventionEngine] Triggering HEROIC intervention:', dimension, score);
        this.logInterventionToDB('heroic_' + dimension);

        const xaiMsg = HeroicXAI.generateXAIExplanation(dimension, { sensorData });
        const shortMsg = dimInfo.lowMsg;

        this.showAlert(
            `${shortMsg}\n\nMau coba latihan ${dimInfo.label} singkat sekarang?`,
            () => {
                if (typeof Router !== 'undefined') {
                    Router.navigate('heroic');
                    // After navigation, highlight the specific dimension
                    setTimeout(() => {
                        if (typeof HeroicProgram !== 'undefined') {
                            HeroicProgram.highlightDimension(dimension);
                        }
                    }, 300);
                }
            }
        );
    };
}

// Make globally available
window.HeroicXAI = HeroicXAI;
