/**
 * SYNAWATCH - ElevenLabs TTS Integration
 * Text-to-Speech using ElevenLabs API
 * Supports language-aware voice switching (Indonesian & English)
 */

const ElevenLabsTTS = {
    // Voice map per language - using natural sounding voices
    voices: {
        id: 'pMsXgVXv4MrvPzMd1L5l', // Serenity - Natural female voice
        en: 'EXAVITQu4vr4xnSDxMaL'  // Ava - Natural English female
    },
    modelId: 'eleven_multilingual_v2',
    isEnabled: true,
    _isSpeaking: false,

    /**
     * Get the active voice ID based on current language
     */
    getVoiceId() {
        const lang = (typeof I18n !== 'undefined') ? I18n.currentLang : 'id';
        return this.voices[lang] || this.voices['id'];
    },

    /**
     * Check if TTS is configured
     */
    isConfigured() {
        return typeof CONFIG !== 'undefined' &&
               CONFIG.ELEVENLABS_API_KEY &&
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

        const voiceId = this.getVoiceId();

        try {
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
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
                            stability: 0.65,
                            similarity_boost: 0.75,
                            style: 0.5,
                            use_speaker_boost: true
                        }
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error('ElevenLabs API error:', response.status, errorText);
                this._isSpeaking = false;
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
     * Fallback browser TTS - also language-aware
     */
    browserSpeak(text, onSpeakingChange) {
        if (!('speechSynthesis' in window)) {
            console.warn('Browser does not support speech synthesis');
            return;
        }

        window.speechSynthesis.cancel();

        const lang = (typeof I18n !== 'undefined') ? I18n.currentLang : 'id';
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'en' ? 'en-US' : 'id-ID';
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
