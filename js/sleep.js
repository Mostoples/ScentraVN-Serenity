/**
 * SYNAWATCH - Sleep Lab Module
 * Handles sleep readiness scoring, bedtime routines, relaxation audio,
 * sleep history tracking, and Firestore persistence.
 */

const SleepLab = {
    audioPlayer: null,
    currentTrack: null,
    completedRoutines: [],
    CHECKLIST_KEY: 'synawatch_sleep_checklist',
    HISTORY_KEY: 'synawatch_sleep_history',

    init() {
        this.setupAudio();
        this.loadChecklistState();
        this.renderStats();
        this.renderTips();
        this.renderHistory();
    },

    /**
     * Cleanup when navigating away - stops audio playback
     */
    destroy() {
        if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.audioPlayer.src = '';
            this.currentTrack = null;
        }
    },

    // ===================== SLEEP SCORE =====================

    /**
     * Calculate sleep readiness score based on multiple signals:
     * - Base score from time of day (circadian factor)
     * - Sensor data (stress, HR, SpO2)
     * - Completed bedtime routines (+5 each)
     * - Assessment data (PHQ-9 affects sleep quality)
     */
    calculateScore() {
        const state = (typeof App !== 'undefined' && App.getInterventionState)
            ? App.getInterventionState() : {};

        // 1. Circadian base: evening hours (20:00-23:00) boost readiness
        const hour = new Date().getHours();
        let baseScore = 50;
        if (hour >= 20 && hour <= 23) baseScore = 75;
        else if (hour >= 0 && hour <= 6) baseScore = 70;
        else if (hour >= 7 && hour <= 11) baseScore = 40;
        else baseScore = 55; // afternoon

        // 2. Stress impact (-0 to -25 points)
        const stress = state.stress || 0;
        if (stress > 0) {
            baseScore -= Math.round((stress / 100) * 25);
        }

        // 3. Heart rate impact: resting HR closer to 60-70 is better for sleep
        const hr = state.hr || 0;
        if (hr > 0) {
            const hrDeviation = Math.abs(hr - 65);
            baseScore -= Math.min(10, Math.round(hrDeviation * 0.3));
        }

        // 4. SpO2 impact: good oxygen = better sleep readiness
        const spo2 = state.spo2 || 0;
        if (spo2 > 0) {
            if (spo2 >= 97) baseScore += 5;
            else if (spo2 < 94) baseScore -= 10;
        }

        // 5. PHQ-9 impact: depression affects sleep quality
        const phq9Score = state.phq9Score || 0;
        if (phq9Score > 14) baseScore -= 10;
        else if (phq9Score > 9) baseScore -= 5;

        // 6. Completed routines bonus (+5 each, up to +15)
        baseScore += this.completedRoutines.length * 5;

        // Clamp to 0-100
        return Math.max(0, Math.min(100, baseScore));
    },

    /**
     * Get score category and color
     */
    getScoreCategory(score) {
        if (score >= 80) return {
            key: 'sleep.score_excellent',
            tipKey: 'sleep.tip_excellent',
            color: '#10b981',
            icon: 'fa-star'
        };
        if (score >= 60) return {
            key: 'sleep.score_good',
            tipKey: 'sleep.tip_good',
            color: '#3b82f6',
            icon: 'fa-thumbs-up'
        };
        if (score >= 40) return {
            key: 'sleep.score_fair',
            tipKey: 'sleep.tip_fair',
            color: '#f59e0b',
            icon: 'fa-exclamation-circle'
        };
        return {
            key: 'sleep.score_poor',
            tipKey: 'sleep.tip_poor',
            color: '#ef4444',
            icon: 'fa-exclamation-triangle'
        };
    },

    /**
     * Render sleep score and category label
     */
    renderStats() {
        const score = this.calculateScore();
        const category = this.getScoreCategory(score);

        const scoreEl = document.getElementById('sleepScoreValue');
        if (scoreEl) scoreEl.textContent = score;

        const categoryEl = document.getElementById('sleepScoreCategory');
        if (categoryEl) {
            const label = typeof t !== 'undefined' ? t(category.key) : category.key;
            categoryEl.innerHTML = `${t('sleep.title')} &middot; <span style="color: ${category.color};">${label}</span>`;
        }

        // Save today's score for history
        this.saveDailyScore(score);
    },

    // ===================== TIPS =====================

    /**
     * Render personalized tip based on current score category
     */
    renderTips() {
        const container = document.getElementById('sleepTipsContainer');
        if (!container) return;

        const score = this.calculateScore();
        const category = this.getScoreCategory(score);
        const tip = typeof t !== 'undefined' ? t(category.tipKey) : '';

        if (!tip) return;

        container.innerHTML = `
            <div style="background: ${category.color}12; border-left: 4px solid ${category.color}; padding: 14px 16px; border-radius: 0 12px 12px 0; margin-bottom: 20px;">
                <p style="font-size: var(--text-sm); color: var(--text-primary); display: flex; align-items: flex-start; gap: 8px;">
                    <i class="fas ${category.icon}" style="color: ${category.color}; margin-top: 2px;"></i>
                    <span>${tip}</span>
                </p>
            </div>
        `;
    },

    // ===================== AUDIO =====================

    setupAudio() {
        if (!this.audioPlayer) {
            this.audioPlayer = new Audio();
            this.audioPlayer.volume = 0.7;

            // Handle audio ending or errors
            this.audioPlayer.addEventListener('error', () => {
                this.currentTrack = null;
                this.updateSoundButtons(null);
                this.toggleVolumeControl(false);
            });
        }
    },

    playSound(type) {
        const tracks = {
            'rain': 'audio/rain.mp3',
            'forest': 'audio/forest.mp3',
            'noise': 'audio/whitenoise.mp3'
        };

        if (!tracks[type]) return;

        this.setupAudio();

        // Toggle pause/play for same track
        if (this.currentTrack === type && !this.audioPlayer.paused) {
            this.audioPlayer.pause();
            this.currentTrack = null;
            this.updateSoundButtons(null);
            this.toggleVolumeControl(false);
            if (typeof Utils !== 'undefined') {
                Utils.showToast(typeof t !== 'undefined' ? t('sleep.audio_stopped') : 'Audio dihentikan', 'info');
            }
            return;
        }

        // Play new track
        this.audioPlayer.src = tracks[type];
        this.audioPlayer.loop = true;

        this.audioPlayer.play()
            .then(() => {
                this.currentTrack = type;
                this.updateSoundButtons(type);
                this.toggleVolumeControl(true);
                if (typeof Utils !== 'undefined') {
                    Utils.showToast(typeof t !== 'undefined' ? t('sleep.audio_playing') : 'Memutar audio relaksasi...', 'success');
                }
            })
            .catch(err => {
                console.error('Audio play error:', err);
                this.currentTrack = null;
                this.updateSoundButtons(null);
                this.toggleVolumeControl(false);
                if (typeof Utils !== 'undefined') {
                    const msg = typeof t !== 'undefined' && typeof I18n !== 'undefined' && I18n.currentLang === 'en'
                        ? 'Audio not available. Please add audio files to /audio folder'
                        : 'Audio tidak tersedia. Silakan tambahkan file audio di folder /audio';
                    Utils.showToast(msg, 'error');
                }
            });
    },

    /**
     * Update sound button active states using data-sound attributes
     */
    updateSoundButtons(activeType) {
        const buttons = document.querySelectorAll('.sound-btn');
        buttons.forEach(btn => {
            const btnType = btn.getAttribute('data-sound');
            if (btnType === activeType) {
                btn.style.borderColor = 'var(--primary-500)';
                btn.style.boxShadow = '0 0 0 2px rgba(139, 92, 246, 0.2)';
                const icon = btn.querySelector('i');
                if (icon) icon.classList.add('fa-beat');
            } else {
                btn.style.borderColor = '';
                btn.style.boxShadow = '';
                const icon = btn.querySelector('i');
                if (icon) icon.classList.remove('fa-beat');
            }
        });
    },

    /**
     * Show/hide volume control slider
     */
    toggleVolumeControl(show) {
        const el = document.getElementById('sleepVolumeControl');
        if (el) el.style.display = show ? 'block' : 'none';
    },

    /**
     * Set audio volume from slider (0-100)
     */
    setVolume(value) {
        if (this.audioPlayer) {
            this.audioPlayer.volume = Math.max(0, Math.min(1, value / 100));
        }
    },

    // ===================== BEDTIME CHECKLIST =====================

    /**
     * Toggle checklist item and update score
     */
    toggleChecklist(el) {
        const routine = el.getAttribute('data-routine');
        if (!routine) return;

        const isChecked = el.classList.toggle('checked');
        const icon = el.querySelector('i');

        if (isChecked) {
            if (icon) {
                icon.className = 'fas fa-check-circle';
                icon.style.color = 'var(--success-500)';
            }
            if (!this.completedRoutines.includes(routine)) {
                this.completedRoutines.push(routine);
            }
        } else {
            if (icon) {
                icon.className = 'far fa-circle';
                icon.style.color = 'var(--text-tertiary)';
            }
            this.completedRoutines = this.completedRoutines.filter(r => r !== routine);
        }

        // Save checklist state
        this.saveChecklistState();

        // Recalculate and update score
        this.renderStats();
        this.renderTips();
    },

    /**
     * Save checklist state to localStorage (daily, resets next day)
     */
    saveChecklistState() {
        try {
            localStorage.setItem(this.CHECKLIST_KEY, JSON.stringify({
                date: new Date().toISOString().split('T')[0],
                routines: this.completedRoutines
            }));
        } catch (e) {
            console.error('Error saving checklist:', e);
        }
    },

    /**
     * Load checklist state from localStorage and restore UI
     */
    loadChecklistState() {
        try {
            const saved = localStorage.getItem(this.CHECKLIST_KEY);
            if (!saved) return;

            const data = JSON.parse(saved);
            const today = new Date().toISOString().split('T')[0];

            // Only restore if same day
            if (data.date !== today) {
                localStorage.removeItem(this.CHECKLIST_KEY);
                this.completedRoutines = [];
                return;
            }

            this.completedRoutines = data.routines || [];

            // Restore UI state
            this.completedRoutines.forEach(routine => {
                const el = document.querySelector(`[data-routine="${routine}"]`);
                if (el) {
                    el.classList.add('checked');
                    const icon = el.querySelector('i');
                    if (icon) {
                        icon.className = 'fas fa-check-circle';
                        icon.style.color = 'var(--success-500)';
                    }
                }
            });
        } catch (e) {
            console.error('Error loading checklist:', e);
            this.completedRoutines = [];
        }
    },

    // ===================== SLEEP HISTORY =====================

    /**
     * Save today's sleep score to localStorage and Firestore
     */
    saveDailyScore(score) {
        const today = new Date().toISOString().split('T')[0];
        const category = this.getScoreCategory(score);

        // Save to localStorage for quick access
        try {
            const history = this.getLocalHistory();
            // Update today's entry (or add new)
            const existingIdx = history.findIndex(h => h.date === today);
            const entry = {
                date: today,
                score,
                routines: [...this.completedRoutines],
                category: category.key
            };

            if (existingIdx >= 0) {
                history[existingIdx] = entry;
            } else {
                history.push(entry);
            }

            // Keep last 30 days
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 30);
            const filtered = history.filter(h => new Date(h.date) >= cutoff);
            localStorage.setItem(this.HISTORY_KEY, JSON.stringify(filtered));
        } catch (e) {
            console.error('Error saving sleep history:', e);
        }

        // Save to Firestore
        this.saveToFirestore(today, score);
    },

    /**
     * Get sleep history from localStorage
     */
    getLocalHistory() {
        try {
            const data = localStorage.getItem(this.HISTORY_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    /**
     * Save sleep data to Firestore
     */
    async saveToFirestore(date, score) {
        const user = typeof auth !== 'undefined' ? auth.currentUser : null;
        if (!user || typeof db === 'undefined' || typeof FirebaseService === 'undefined') return;

        try {
            const docRef = FirebaseService.userCol(user.uid, 'sleepData').doc(date);
            await docRef.set({
                date,
                score,
                routinesCompleted: [...this.completedRoutines],
                audioPlayed: this.currentTrack || null,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        } catch (e) {
            console.error('Error saving sleep data to Firestore:', e);
        }
    },

    /**
     * Render 7-day sleep history chart
     */
    async renderHistory() {
        const container = document.getElementById('sleepHistoryContainer');
        if (!container) return;

        // Try Firestore first, fallback to localStorage
        let history = await this.getFirestoreHistory();
        if (!history || history.length < 2) {
            history = this.getLocalHistory();
        }

        if (history.length < 2) {
            container.innerHTML = `
                <h3 class="section-title">${typeof t !== 'undefined' ? t('sleep.history_title') : 'Sleep History (7 Days)'}</h3>
                <div class="card" style="text-align: center; padding: 24px;">
                    <i class="fas fa-chart-line" style="font-size: 2rem; color: var(--primary-300); margin-bottom: 8px;"></i>
                    <p style="color: var(--text-tertiary); font-size: 0.9rem;">${typeof t !== 'undefined' ? t('sleep.history_empty') : 'History will be available after a few days of usage.'}</p>
                </div>
            `;
            return;
        }

        // Get last 7 entries
        const recent = history.slice(-7);
        const chartId = 'sleepHistoryChart_' + Date.now();

        container.innerHTML = `
            <h3 class="section-title">${typeof t !== 'undefined' ? t('sleep.history_title') : 'Sleep History (7 Days)'}</h3>
            <div class="card" style="padding: 16px;">
                <canvas id="${chartId}" height="180"></canvas>
            </div>
        `;

        // Render chart
        requestAnimationFrame(() => {
            const canvas = document.getElementById(chartId);
            if (!canvas || typeof Chart === 'undefined') return;

            new Chart(canvas, {
                type: 'bar',
                data: {
                    labels: recent.map(h => {
                        const d = new Date(h.date);
                        return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
                    }),
                    datasets: [{
                        label: 'Sleep Readiness',
                        data: recent.map(h => h.score),
                        backgroundColor: recent.map(h => {
                            const cat = this.getScoreCategory(h.score);
                            return cat.color + '40';
                        }),
                        borderColor: recent.map(h => {
                            return this.getScoreCategory(h.score).color;
                        }),
                        borderWidth: 2,
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            grid: { color: 'rgba(0,0,0,0.05)' },
                            ticks: { stepSize: 25 }
                        },
                        x: { grid: { display: false } }
                    }
                }
            });
        });
    },

    /**
     * Get sleep history from Firestore (last 7 days)
     */
    async getFirestoreHistory() {
        const user = typeof auth !== 'undefined' ? auth.currentUser : null;
        if (!user || typeof db === 'undefined' || typeof FirebaseService === 'undefined') return null;

        try {
            const snapshot = await FirebaseService.userCol(user.uid, 'sleepData')
                .orderBy('date', 'desc')
                .limit(7)
                .get();

            if (snapshot.empty) return null;

            const history = [];
            snapshot.forEach(doc => {
                const d = doc.data();
                history.push({
                    date: d.date,
                    score: d.score || 0,
                    routines: d.routinesCompleted || []
                });
            });

            return history.reverse(); // Chronological order
        } catch (e) {
            console.error('Error fetching sleep history:', e);
            return null;
        }
    }
};

window.SleepLab = SleepLab;
