/**
 * SYNAWATCH - ElevenLabs TTS Integration
 * Text-to-Speech using ElevenLabs API
 */

const ElevenLabsTTS = {
    voiceId: 'JBFqnCBsd6RMkjVDRZzb', // George - free tier compatible
    modelId: 'eleven_turbo_v2_5', // New model for free tier
    isEnabled: true,
    _isSpeaking: false, // Guard against concurrent speak calls

    /**
     * Check if TTS is configured
     */
    isConfigured() {
        return CONFIG.ELEVENLABS_API_KEY &&
               CONFIG.ELEVENLABS_API_KEY !== 'YOUR_ELEVENLABS_API_KEY';
    },

    /**
     * Speak text using ElevenLabs (with concurrency guard)
     */
    async speak(text, onSpeakingChange) {
        if (!text || !text.trim()) return;

        // Stop any previous speech first
        this.stop();

        // Guard against overlapping speak calls
        if (this._isSpeaking) return;
        this._isSpeaking = true;

        // Set speaking callback
        if (onSpeakingChange) {
            AudioQueue.setCallback(onSpeakingChange);
        }

        // If not configured, use browser TTS as fallback
        if (!this.isConfigured()) {
            console.warn('ElevenLabs API key not configured, using browser TTS');
            this._isSpeaking = false;
            this.browserSpeak(text, onSpeakingChange);
            return;
        }

        try {
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`,
                {
                    method: 'POST',
                    headers: {
                        'xi-api-key': CONFIG.ELEVENLABS_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        text: text.trim(),
                        model_id: this.modelId,
                        voice_settings: {
                            stability: 0.35,
                            similarity_boost: 0.85,
                            style: 0.7,
                            use_speaker_boost: true
                        }
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error('ElevenLabs API error:', response.status, errorText);
                this._isSpeaking = false;
                // Fallback to browser TTS only if not a concurrent error
                this.browserSpeak(text, onSpeakingChange);
                return;
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            this._isSpeaking = false;
            AudioQueue.enqueue(url);

        } catch (error) {
            console.error('ElevenLabs TTS error:', error);
            this._isSpeaking = false;
            this.browserSpeak(text, onSpeakingChange);
        }
    },

    /**
     * Fallback browser TTS
     */
    browserSpeak(text, onSpeakingChange) {
        if (!('speechSynthesis' in window)) {
            console.warn('Browser does not support speech synthesis');
            return;
        }

        // Cancel any existing browser speech first
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'id-ID'; // Indonesian
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            if (onSpeakingChange) onSpeakingChange(true);
        };

        utterance.onend = () => {
            if (onSpeakingChange) onSpeakingChange(false);
        };

        utterance.onerror = () => {
            if (onSpeakingChange) onSpeakingChange(false);
        };

        window.speechSynthesis.speak(utterance);
    },

    /**
     * Stop all speaking
     */
    stop() {
        this._isSpeaking = false;
        AudioQueue.clear();
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    },

    /**
     * Enable/disable TTS
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }
};

// Make globally available
window.ElevenLabsTTS = ElevenLabsTTS;
