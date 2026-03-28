/**
 * SYNAWATCH - Mindful Moment
 * 4-7-8 Breathing Exercise with live countdown timer
 */

const Mindful = {
    countdownTimer: null,
    phaseTimeout: null,
    phase: 0, // 0: Idle, 1: Inhale, 2: Hold, 3: Exhale
    running: false,
    cycles: 0,

    init() {
        this.reset();
    },

    reset() {
        this._clearTimers();
        this.phase = 0;
        this.running = false;
        this.cycles = 0;
        const circle = document.getElementById('breathingCircle');
        const text = document.getElementById('breathingText');
        if (circle) {
            circle.style.transition = 'transform 0.5s ease';
            circle.style.transform = 'scale(1)';
        }
        if (text) text.textContent = typeof t !== 'undefined' ? t('mindful.start') : 'Mulai Latihan';
    },

    stop() {
        if (!this.running) return;
        this._clearTimers();
        this.phase = 0;
        this.running = false;
        this.cycles = 0;
        this._updateButton();

        const circle = document.getElementById('breathingCircle');
        const text = document.getElementById('breathingText');
        if (circle) {
            circle.style.transition = 'transform 0.5s ease';
            circle.style.transform = 'scale(1)';
        }
        if (text) text.textContent = typeof t !== 'undefined' ? t('mindful.stopped') : 'Dihentikan';

        setTimeout(() => {
            if (this.phase === 0 && text) {
                text.textContent = typeof t !== 'undefined' ? t('mindful.start') : 'Mulai Latihan';
            }
        }, 1500);
    },

    toggle() {
        if (this.running) {
            this.stop();
        } else {
            this.start();
        }
    },

    start() {
        if (this.running) return;
        this.running = true;
        this.cycles = 0;
        this._updateButton();
        this._breatheIn();
    },

    _updateButton() {
        const btn = document.getElementById('mindfulBtn');
        if (!btn) return;
        const stopText = typeof t !== 'undefined' ? t('mindful.stop') : 'Berhenti';
        const startText = typeof t !== 'undefined' ? t('mindful.start_breathing') : 'Mulai Pernapasan';
        if (this.running) {
            btn.innerHTML = `<i class="fas fa-stop"></i> ${stopText}`;
            btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            btn.style.boxShadow = '0 10px 20px rgba(239, 68, 68, 0.3)';
        } else {
            btn.innerHTML = `<i class="fas fa-play"></i> ${startText}`;
            btn.style.background = '';
            btn.style.boxShadow = '0 10px 20px rgba(99, 102, 241, 0.3)';
        }
    },

    _clearTimers() {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
        if (this.phaseTimeout) {
            clearTimeout(this.phaseTimeout);
            this.phaseTimeout = null;
        }
    },

    _startCountdown(totalSeconds, label, onDone) {
        const text = document.getElementById('breathingText');
        let remaining = totalSeconds;

        // Show immediately
        if (text) text.textContent = `${label} (${remaining}s)`;

        this.countdownTimer = setInterval(() => {
            remaining--;
            if (remaining <= 0) {
                clearInterval(this.countdownTimer);
                this.countdownTimer = null;
                if (this.running) onDone();
            } else {
                if (text) text.textContent = `${label} (${remaining}s)`;
            }
        }, 1000);
    },

    _breatheIn() {
        if (!this.running) return;
        this.phase = 1;

        const circle = document.getElementById('breathingCircle');
        if (circle) {
            circle.style.transition = 'transform 4s ease-out';
            circle.style.transform = 'scale(1.8)';
        }

        const inhaleText = typeof t !== 'undefined' ? t('mindful.inhale') : 'Tarik Napas';
        this._startCountdown(4, inhaleText, () => this._hold());
    },

    _hold() {
        if (!this.running) return;
        this.phase = 2;

        const holdText = typeof t !== 'undefined' ? t('mindful.hold') : 'Tahan';
        this._startCountdown(7, holdText, () => this._breatheOut());
    },

    _breatheOut() {
        if (!this.running) return;
        this.phase = 3;

        const circle = document.getElementById('breathingCircle');
        if (circle) {
            circle.style.transition = 'transform 8s ease-in';
            circle.style.transform = 'scale(1)';
        }

        const exhaleText = typeof t !== 'undefined' ? t('mindful.exhale') : 'Hembuskan';
        this._startCountdown(8, exhaleText, () => {
            this.cycles++;
            if (this.cycles < 4 && this.running) {
                this._breatheIn();
            } else {
                const text = document.getElementById('breathingText');
                if (text) text.textContent = typeof t !== 'undefined' ? t('mindful.complete') : 'Selesai. Kerja Bagus!';
                this.phase = 0;
                this.running = false;
                this._updateButton();
            }
        });
    }
};

window.Mindful = Mindful;
