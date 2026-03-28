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
        if (text) text.textContent = 'Mulai Latihan';
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
        if (text) text.textContent = 'Dihentikan';

        setTimeout(() => {
            if (this.phase === 0 && text) {
                text.textContent = 'Mulai Latihan';
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
        if (this.running) {
            btn.innerHTML = '<i class="fas fa-stop"></i> Berhenti';
            btn.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
            btn.style.boxShadow = '0 10px 20px rgba(239, 68, 68, 0.3)';
        } else {
            btn.innerHTML = '<i class="fas fa-play"></i> Mulai Pernapasan';
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

        this._startCountdown(4, 'Tarik Napas', () => this._hold());
    },

    _hold() {
        if (!this.running) return;
        this.phase = 2;

        this._startCountdown(7, 'Tahan', () => this._breatheOut());
    },

    _breatheOut() {
        if (!this.running) return;
        this.phase = 3;

        const circle = document.getElementById('breathingCircle');
        if (circle) {
            circle.style.transition = 'transform 8s ease-in';
            circle.style.transform = 'scale(1)';
        }

        this._startCountdown(8, 'Hembuskan', () => {
            this.cycles++;
            if (this.cycles < 4 && this.running) {
                this._breatheIn();
            } else {
                const text = document.getElementById('breathingText');
                if (text) text.textContent = 'Selesai. Kerja Bagus!';
                this.phase = 0;
                this.running = false;
                this._updateButton();
            }
        });
    }
};

window.Mindful = Mindful;
