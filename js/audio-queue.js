/**
 * SYNAWATCH - Audio Queue Manager
 * Handles sequential playback of TTS audio
 * Ported from Synaglo audioQueue.ts
 */

const AudioQueue = {
    queue: [],
    isPlaying: false,
    currentAudio: null,
    onSpeakingChange: null,
    onAudioStart: null,

    /**
     * Set callback for speaking state changes
     */
    setCallback(callback) {
        this.onSpeakingChange = callback;
    },

    /**
     * Set callback when audio starts (for analyser connection)
     */
    setAudioStartCallback(callback) {
        this.onAudioStart = callback;
    },

    /**
     * Get currently playing audio element
     */
    getCurrentAudio() {
        return this.currentAudio;
    },

    /**
     * Add audio URL to queue
     */
    enqueue(audioUrl) {
        this.queue.push(audioUrl);
        this.playNext();
    },

    /**
     * Play next audio in queue
     */
    playNext() {
        if (this.isPlaying || this.queue.length === 0) return;

        this.isPlaying = true;
        if (this.onSpeakingChange) {
            this.onSpeakingChange(true);
        }

        const nextUrl = this.queue.shift();
        this.currentAudio = new Audio(nextUrl);
        this.currentAudio.crossOrigin = 'anonymous';

        // Notify analyser before play
        if (this.onAudioStart && this.currentAudio) {
            this.onAudioStart(this.currentAudio);
        }

        this.currentAudio.onended = () => {
            URL.revokeObjectURL(nextUrl);
            this.isPlaying = false;
            this.currentAudio = null;

            if (this.queue.length === 0) {
                if (this.onSpeakingChange) {
                    this.onSpeakingChange(false);
                }
            } else {
                this.playNext();
            }
        };

        this.currentAudio.onerror = (e) => {
            console.error('Audio playback error:', e);
            URL.revokeObjectURL(nextUrl);
            this.isPlaying = false;
            this.currentAudio = null;

            if (this.queue.length === 0) {
                if (this.onSpeakingChange) {
                    this.onSpeakingChange(false);
                }
            } else {
                this.playNext();
            }
        };

        this.currentAudio.play().catch(err => {
            console.error('Failed to play audio:', err);
            this.isPlaying = false;
            this.currentAudio = null;

            if (this.queue.length === 0) {
                if (this.onSpeakingChange) {
                    this.onSpeakingChange(false);
                }
            } else {
                this.playNext();
            }
        });
    },

    /**
     * Clear queue and stop current audio
     */
    clear() {
        this.queue.forEach(url => URL.revokeObjectURL(url));
        this.queue = [];

        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        this.isPlaying = false;

        if (this.onSpeakingChange) {
            this.onSpeakingChange(false);
        }
    }
};

// Make globally available
window.AudioQueue = AudioQueue;
