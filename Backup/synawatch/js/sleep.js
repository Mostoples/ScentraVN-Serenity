/**
 * SYNAWATCH - Sleep Lab Module
 * Handles bedtime routines, sleep score visualization, and relaxation audio
 * Updated: QC improvements - score labels, history, tips, checklist persistence
 */

const SleepLab = {
    audioPlayer: null,
    currentPlaying: null,
    baseScore: 70,
    checklistBonus: 0,

    init() {
        this.renderStats();
        this.setupAudio();
        this.loadChecklist();
    },

    getScoreLabel(score) {
        if (score >= 90) return { text: t('sleep.score_excellent'), color: '#10b981', icon: 'fa-star' };
        if (score >= 75) return { text: t('sleep.score_good'), color: '#3b82f6', icon: 'fa-thumbs-up' };
        if (score >= 60) return { text: t('sleep.score_fair'), color: '#f59e0b', icon: 'fa-minus-circle' };
        return { text: t('sleep.score_poor'), color: '#ef4444', icon: 'fa-exclamation-triangle' };
    },

    getSleepTips(score) {
        if (score >= 90) return t('sleep.tip_excellent');
        if (score >= 75) return t('sleep.tip_good');
        if (score >= 60) return t('sleep.tip_fair');
        return t('sleep.tip_poor');
    },

    renderStats() {
        const state = App.getInterventionState ? App.getInterventionState() : {};
        this.baseScore = 70;
        if (state.stress > 60) this.baseScore -= 15;
        if (state.stress < 30) this.baseScore += 10;

        this.updateScoreDisplay();
        this.renderHistory();
    },

    updateScoreDisplay() {
        const totalScore = Math.min(100, Math.max(0, this.baseScore + this.checklistBonus));
        const scoreEl = document.getElementById('sleepScoreValue');
        if (scoreEl) scoreEl.textContent = totalScore;

        const label = this.getScoreLabel(totalScore);
        const labelEl = document.getElementById('sleepScoreLabel');
        if (labelEl) {
            labelEl.innerHTML = `<i class="fas ${label.icon}"></i> ${label.text}`;
            labelEl.style.color = label.color;
        }

        const tipsEl = document.getElementById('sleepTips');
        if (tipsEl) tipsEl.textContent = this.getSleepTips(totalScore);
    },

    async renderHistory() {
        const container = document.getElementById('sleepHistory');
        if (!container) return;

        try {
            const user = typeof auth !== 'undefined' && auth.currentUser;
            if (!user || typeof db === 'undefined') {
                container.innerHTML = '<p style="font-size:0.8rem;color:var(--text-tertiary);text-align:center;">Riwayat akan tersedia setelah beberapa hari penggunaan.</p>';
                return;
            }

            const snap = await db.collection('users').doc(user.uid)
                .collection('sleepHistory').orderBy('date', 'desc').limit(7).get();

            if (snap.empty) {
                container.innerHTML = '<p style="font-size:0.8rem;color:var(--text-tertiary);text-align:center;">Riwayat akan tersedia setelah beberapa hari penggunaan.</p>';
                return;
            }

            const records = snap.docs.map(d => d.data()).reverse();
            const barsHTML = records.map(r => {
                const lbl = this.getScoreLabel(r.score);
                const height = Math.max(20, r.score * 0.8);
                return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                    <span style="font-size:0.65rem;font-weight:600;color:${lbl.color};">${r.score}</span>
                    <div style="width:28px;height:${height}px;background:${lbl.color};border-radius:6px;"></div>
                    <span style="font-size:0.6rem;color:var(--text-tertiary);">${r.label || ''}</span>
                </div>`;
            }).join('');

            container.innerHTML = `<div style="display:flex;justify-content:space-around;align-items:flex-end;min-height:100px;">${barsHTML}</div>`;
        } catch (e) {
            container.innerHTML = '<p style="font-size:0.8rem;color:var(--text-tertiary);text-align:center;">Riwayat akan tersedia setelah beberapa hari penggunaan.</p>';
        }
    },

    setupAudio() {
        this.audioPlayer = new Audio();
        this.audioPlayer.addEventListener('ended', () => {
            this.currentPlaying = null;
            this.updateAudioButtons();
        });
    },

    playSound(type) {
        const tracks = {
            'rain': 'https://actions.google.com/sounds/v1/weather/rain_on_roof.ogg',
            'forest': 'https://actions.google.com/sounds/v1/nature/jungle_ambience_1.ogg',
            'noise': 'https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg'
        };

        if (tracks[type]) {
            if (!this.audioPlayer.paused && this.currentPlaying === type) {
                this.audioPlayer.pause();
                this.currentPlaying = null;
                Utils.showToast("Audio dihentikan", "info");
            } else {
                this.audioPlayer.src = tracks[type];
                this.audioPlayer.loop = true;
                this.audioPlayer.play();
                this.currentPlaying = type;
                Utils.showToast("Memutar audio relaksasi...", "success");
            }
            this.updateAudioButtons();
        }
    },

    updateAudioButtons() {
        document.querySelectorAll('.sleep-audio-btn').forEach(btn => {
            const type = btn.dataset.type;
            const icon = btn.querySelector('.audio-play-icon');
            if (icon) {
                icon.className = this.currentPlaying === type
                    ? 'fas fa-pause audio-play-icon'
                    : 'fas fa-play audio-play-icon';
            }
        });
    },

    toggleChecklist(el) {
        el.classList.toggle('checked');
        if (el.classList.contains('checked')) {
            el.querySelector('i').className = 'fas fa-check-circle';
            el.querySelector('i').style.color = 'var(--success-500)';
        } else {
            el.querySelector('i').className = 'far fa-circle';
            el.querySelector('i').style.color = 'var(--text-tertiary)';
        }
        this.updateChecklistScore();
        this.saveChecklist();
    },

    updateChecklistScore() {
        const items = document.querySelectorAll('.sleep-checklist-item');
        const checked = document.querySelectorAll('.sleep-checklist-item.checked');
        this.checklistBonus = checked.length * 5;
        this.updateScoreDisplay();
    },

    async saveChecklist() {
        try {
            const user = typeof auth !== 'undefined' && auth.currentUser;
            if (!user || typeof db === 'undefined') return;

            const items = document.querySelectorAll('.sleep-checklist-item');
            const state = {};
            items.forEach((item, i) => {
                state[`item_${i}`] = item.classList.contains('checked');
            });

            const today = new Date().toISOString().split('T')[0];
            await db.collection('users').doc(user.uid)
                .collection('sleepChecklist').doc(today).set({
                    items: state,
                    updatedAt: new Date(),
                    bonus: this.checklistBonus
                }, { merge: true });
        } catch (e) {
            console.warn('Could not save checklist:', e);
        }
    },

    async loadChecklist() {
        try {
            const user = typeof auth !== 'undefined' && auth.currentUser;
            if (!user || typeof db === 'undefined') return;

            const today = new Date().toISOString().split('T')[0];
            const doc = await db.collection('users').doc(user.uid)
                .collection('sleepChecklist').doc(today).get();

            if (doc.exists) {
                const data = doc.data();
                const items = document.querySelectorAll('.sleep-checklist-item');
                items.forEach((item, i) => {
                    if (data.items && data.items[`item_${i}`]) {
                        item.classList.add('checked');
                        item.querySelector('i').className = 'fas fa-check-circle';
                        item.querySelector('i').style.color = 'var(--success-500)';
                    }
                });
                this.updateChecklistScore();
            }
        } catch (e) {
            console.warn('Could not load checklist:', e);
        }
    }
};

window.SleepLab = SleepLab;
