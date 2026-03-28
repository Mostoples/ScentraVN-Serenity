/**
 * SYNAWATCH - Sleep Lab Module
 * Handles bedtime routines, sleep score visualization, and relaxation audio
 */

const SleepLab = {
    audioPlayer: null,

    init() {
        this.renderStats();
        this.setupAudio();
    },

    renderStats() {
        const state = App.getInterventionState ? App.getInterventionState() : {};
        // Placeholder simulation: if stress is low, sleep score is better.
        let baseScore = 85; 
        if (state.stress > 60) baseScore -= 15;
        
        const scoreEl = document.getElementById('sleepScoreValue');
        if(scoreEl) scoreEl.textContent = baseScore;
    },

    setupAudio() {
        this.audioPlayer = new Audio();
    },

    playSound(type) {
        // Local audio files - place in /audio folder
        const tracks = {
            'rain': 'audio/rain.mp3',
            'forest': 'audio/forest.mp3',
            'noise': 'audio/whitenoise.mp3'
        };

        if (tracks[type]) {
            const trackUrl = tracks[type];

            // Check if same track is playing - toggle pause/play
            if (!this.audioPlayer.paused && this.audioPlayer.src.includes(type)) {
                this.audioPlayer.pause();
                this.updateSoundButtons(null);
                Utils.showToast(typeof t !== 'undefined' ? t('sleep.audio_stopped') : "Audio dihentikan", "info");
                return;
            }

            // Play new track
            this.audioPlayer.src = trackUrl;
            this.audioPlayer.loop = true;

            this.audioPlayer.play()
                .then(() => {
                    this.updateSoundButtons(type);
                    Utils.showToast(typeof t !== 'undefined' ? t('sleep.audio_playing') : "Memutar audio relaksasi...", "success");
                })
                .catch(err => {
                    console.error('Audio play error:', err);
                    const errorMsg = typeof t !== 'undefined' && I18n.currentLang === 'en'
                        ? "Audio not available. Please add audio files to /audio folder"
                        : "Audio tidak tersedia. Silakan tambahkan file audio di folder /audio";
                    Utils.showToast(errorMsg, "error");
                });
        }
    },

    updateSoundButtons(activeType) {
        const buttons = document.querySelectorAll('.sound-btn');
        buttons.forEach(btn => {
            const btnType = btn.getAttribute('onclick')?.match(/'(\w+)'/)?.[1];
            if (btnType === activeType) {
                btn.classList.add('active');
                btn.querySelector('i')?.classList.add('fa-beat');
            } else {
                btn.classList.remove('active');
                btn.querySelector('i')?.classList.remove('fa-beat');
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
    }
};

window.SleepLab = SleepLab;
