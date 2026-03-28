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
        // Simulated audio sources (Using public domain / mock links)
        const tracks = {
            'rain': 'https://actions.google.com/sounds/v1/weather/rain_on_roof.ogg',
            'forest': 'https://actions.google.com/sounds/v1/nature/jungle_ambience_1.ogg',
            'noise': 'https://actions.google.com/sounds/v1/water/waves_crashing_on_rock_beach.ogg'
        };
        
        if (tracks[type]) {
            if(!this.audioPlayer.paused && this.audioPlayer.src === tracks[type]) {
                this.audioPlayer.pause();
                Utils.showToast("Audio dihentikan", "info");
            } else {
                this.audioPlayer.src = tracks[type];
                this.audioPlayer.loop = true;
                this.audioPlayer.play();
                Utils.showToast("Memutar audio relaksasi...", "success");
            }
        }
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
