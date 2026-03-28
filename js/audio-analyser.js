/**
 * SYNAWATCH - Audio Analyser
 * Web Audio API integration for lip sync
 * Ported from Synaglo useAudioAnalyser.ts
 */

const AudioAnalyser = {
    audioContext: null,
    analyser: null,
    bufferLength: 0,
    connectedElements: new WeakSet(),
    isInitialized: false,

    /**
     * Initialize the audio analyser
     */
    init() {
        if (this.isInitialized) return;

        // Create AudioContext
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        this.audioContext = new AudioContextClass();

        // Create AnalyserNode
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;
        this.bufferLength = this.analyser.frequencyBinCount;

        // Resume on user interaction
        const resumeContext = () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().catch(console.warn);
            }
        };

        window.addEventListener('click', resumeContext, { passive: true });
        window.addEventListener('keydown', resumeContext, { passive: true });
        window.addEventListener('touchstart', resumeContext, { passive: true });

        // Set up audio queue callback
        if (typeof AudioQueue !== 'undefined') {
            AudioQueue.setAudioStartCallback((audio) => {
                this.connectAudio(audio);
            });
        }

        this.isInitialized = true;
        console.log('AudioAnalyser initialized');
    },

    /**
     * Connect an audio element to the analyser
     */
    connectAudio(audioElement) {
        if (!this.audioContext || !this.analyser) {
            this.init();
        }

        // Resume context if needed
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(console.warn);
        }

        // Only connect each element once
        if (this.connectedElements.has(audioElement)) return;
        this.connectedElements.add(audioElement);

        try {
            const source = this.audioContext.createMediaElementSource(audioElement);
            source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
        } catch (e) {
            console.warn('Could not connect audio element to analyser:', e);
        }
    },

    /**
     * Get current volume (0-1)
     * Call this in animation loop for lip sync
     */
    getVolume() {
        if (!this.analyser || this.bufferLength === 0) return 0;

        const dataArray = new Uint8Array(this.bufferLength);
        this.analyser.getByteFrequencyData(dataArray);

        // Calculate average amplitude
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }

        // Normalize to 0-1 range
        const average = sum / dataArray.length;
        return Math.min(average / 90, 1);
    },

    /**
     * Cleanup
     */
    destroy() {
        if (this.audioContext) {
            this.audioContext.close().catch(console.warn);
            this.audioContext = null;
        }
        this.analyser = null;
        this.isInitialized = false;
    }
};

// Make globally available
window.AudioAnalyser = AudioAnalyser;
