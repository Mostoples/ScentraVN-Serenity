/**
 * SYNAWATCH - Synachat AI Assistant
 * Powered by Google Gemini API
 */

// Gemini API Configuration
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-8b:generateContent';

// System prompt for Synachat
const SYSTEM_PROMPT = `You are Synachat, an empathetic, professional, and knowledgeable AI assistant who acts as both a psychologist and a medical advisor. You are part of a smartwatch health monitoring app called SYNAWATCH.

Your role:
1. Provide emotional support and mental health guidance
2. Help users understand their health data
3. Offer wellness tips and lifestyle recommendations
4. Be empathetic and supportive, especially when users express stress or anxiety

You have access to the user's real-time health data from their SYNAWATCH smartwatch:
- Heart Rate (HR) - Normal range: 60-100 BPM at rest
- SpO2 (Blood Oxygen) - Normal range: 95-100%
- Body Temperature - Normal range: 36.1-37.2°C
- Stress Level - 0-100% (0-30: Low, 31-60: Moderate, 61-100: High)
- GSR (Galvanic Skin Response) - Measures emotional arousal through skin conductivity
  - 0-30%: Relaxed state
  - 31-60%: Normal state
  - 61-80%: Aroused/Excited state
  - 81-100%: High stress/anxiety
- Activity Status - DIAM (Resting), JALAN (Walking), LARI (Running), AKTIF (Active)

Guidelines:
1. Always be supportive and non-judgmental
2. Use simple, understandable language
3. When discussing health data, explain what the numbers mean
4. If you detect high stress or concerning values, acknowledge it gently
5. Always encourage users to consult healthcare professionals for serious concerns
6. Respond in the same language the user uses
7. Keep responses concise but helpful (2-3 paragraphs max)
8. Include a disclaimer when giving medical information

Important: You are an AI assistant, not a real doctor. Always remind users of this when discussing medical advice.

CRITICAL RULES:
- NEVER output template placeholders like [sebutkan...], [insert...], or [masukkan...] in your responses. Always use actual data values provided in the health context.
- If health data is not available, say "data belum tersedia" instead of using placeholder brackets.
- Respond in Bahasa Indonesia by default unless the user writes in English.`;

// Chat state
let chatHistory = [];
let isWaitingForResponse = false;
let showHealthContext = false;
let ttsEnabled = true;
let avatarInitialized = false;
let synachatInitialized = false;

/**
 * [GAP 6] Proactive Sensor Anomaly Detection
 * Monitors real-time biosensor data and initiates conversation when anomalies detected
 * Based on: He et al. 2023, Huang et al. 2024, Daley et al. 2022
 */
let proactiveAnomalyMonitor = {
    enabled: true,
    sensorHistory: [],
    lastAnomalyPrompt: 0,
    ANOMALY_COOLDOWN: 10 * 60 * 1000, // 10 minutes between proactive initiations

    /**
     * Check for biosensor anomalies that warrant proactive AI intervention
     */
    checkForAnomalies(sensorData) {
        if (!this.enabled || !sensorData) return;

        const now = Date.now();
        if (now - this.lastAnomalyPrompt < this.ANOMALY_COOLDOWN) return;

        // Track sensor history
        this.sensorHistory.push({
            stress: sensorData.stress || 0,
            gsr: sensorData.gsr || 0,
            hr: sensorData.hr || 0,
            ts: now
        });
        if (this.sensorHistory.length > 50) this.sensorHistory.shift();

        // Detect sustained elevation
        if (this.sensorHistory.length >= 10) {
            const recent = this.sensorHistory.slice(-10);
            const avgStress = recent.reduce((s, r) => s + r.stress, 0) / recent.length;
            const avgGSR = recent.reduce((s, r) => s + r.gsr, 0) / recent.length;

            // Trigger if sustained high stress + high GSR
            if (avgStress > 70 && avgGSR > 65 && sensorData.hr > 85) {
                this.promptProactiveChat(sensorData, avgStress, avgGSR);
                this.lastAnomalyPrompt = now;
            }
        }
    },

    /**
     * Show non-intrusive proactive chat suggestion
     */
    promptProactiveChat(sensorData, avgStress, avgGSR) {
        // Check if already in chat view
        if (document.getElementById('chatWindow')) return;

        const banner = document.createElement('div');
        banner.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 16px;
            right: 16px;
            background: linear-gradient(135deg, #8B5CF6 0%, #6366f1 100%);
            border-radius: 16px;
            padding: 16px;
            color: white;
            box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
            z-index: 1000;
            animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex;
            align-items: center;
            gap: 12px;
        `;

        banner.innerHTML = `
            <div style="flex: 1;">
                <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 4px;">Synachat tersedia</div>
                <div style="font-size: 0.85rem; opacity: 0.9;">Pola stres terdeteksi. Mau ngobrol sebentar?</div>
            </div>
            <button onclick="this.parentElement.remove(); Router.navigate('synachat');" style="background: white; color: #8B5CF6; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 600; cursor: pointer; flex-shrink: 0;">
                Chat
            </button>
            <button onclick="this.parentElement.remove();" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 8px 12px; border-radius: 8px; cursor: pointer; font-size: 1.2rem;">
                ✕
            </button>
        `;

        document.body.appendChild(banner);
        setTimeout(() => banner.style.opacity = '0.8', 100);
        setTimeout(() => banner.remove(), 8000); // Auto-dismiss after 8s
    }
};

window.proactiveAnomalyMonitor = proactiveAnomalyMonitor;

/**
 * Initialize Synachat with 3D Avatar
 */
async function initSynachat() {
    // Prevent double initialization
    if (synachatInitialized) {
        console.log('Synachat already initialized, skipping...');
        return;
    }

    console.log('Initializing Synachat...');
    synachatInitialized = true;

    // Initialize 3D Avatar
    await initAvatar();

    // Load chat history from Firebase
    await loadChatHistory();

    // Listen for BLE data updates to update health context
    if (typeof BLEConnection !== 'undefined') {
        BLEConnection.onDataUpdate((data) => {
            updateHealthContext(data);
            // [GAP 6] Check for sensor anomalies that warrant proactive intervention
            if (proactiveAnomalyMonitor) {
                proactiveAnomalyMonitor.checkForAnomalies(data);
            }
        });
    }

    // Update health context display
    updateHealthContextDisplay();

    // Focus input
    const input = document.getElementById('messageInput');
    if (input) input.focus();

    // Update TTS toggle button state
    updateTTSToggleUI();

    // Check for proactive AI Chat trigger (Gap 6)
    const proactiveTrigger = sessionStorage.getItem('synachat_proactive_trigger');
    if (proactiveTrigger) {
        sessionStorage.removeItem('synachat_proactive_trigger');
        setTimeout(() => triggerProactiveAIChat(proactiveTrigger), 1500);
    }
}

/**
 * Initialize 3D Avatar
 */
async function initAvatar() {
    // Prevent double initialization
    if (avatarInitialized) {
        console.log('Avatar already initialized, skipping...');
        return;
    }

    const avatarCanvas = document.getElementById('avatarCanvas');
    if (!avatarCanvas) {
        console.warn('Avatar canvas not found');
        return;
    }

    // Clear any existing content first to prevent duplicates
    const existingFallback = avatarCanvas.querySelector('.avatar-fallback');
    if (existingFallback) {
        existingFallback.remove();
    }

    // Check if Three.js and avatar engine are loaded
    if (typeof THREE === 'undefined') {
        console.warn('Three.js not loaded, using fallback');
        showAvatarFallback(avatarCanvas);
        avatarInitialized = true;
        return;
    }

    if (typeof SynachatAvatar === 'undefined') {
        console.warn('SynachatAvatar not loaded');
        showAvatarFallback(avatarCanvas);
        avatarInitialized = true;
        return;
    }

    // Destroy existing avatar if any
    if (SynachatAvatar.isInitialized) {
        console.log('Destroying existing avatar first...');
        SynachatAvatar.destroy();
    }

    try {
        // Get loading indicator
        const loading = avatarCanvas.querySelector('.avatar-loading');

        // Initialize avatar
        const success = await SynachatAvatar.init('avatarCanvas');

        if (success) {
            avatarInitialized = true;
            if (loading) loading.style.display = 'none';
            console.log('Avatar initialized successfully');

            // Setup speaking state callback
            if (typeof AudioQueue !== 'undefined') {
                AudioQueue.setCallback((isSpeaking) => {
                    SynachatAvatar.setSpeaking(isSpeaking);
                    updateAvatarStatus(isSpeaking);
                });
            }
        } else {
            throw new Error('Avatar initialization failed');
        }
    } catch (error) {
        console.error('Error initializing avatar:', error);
        showAvatarFallback(avatarCanvas);
        avatarInitialized = true;
    }
}

/**
 * Show avatar fallback
 */
function showAvatarFallback(container) {
    container.innerHTML = `
        <div class="avatar-fallback">
            <div class="avatar-fallback-icon">
                <i class="fas fa-robot"></i>
            </div>
            <p>Synachat</p>
        </div>
    `;
}

/**
 * Update avatar status text
 */
function updateAvatarStatus(isSpeaking) {
    const statusText = document.getElementById('avatarStatusText');
    if (statusText) {
        statusText.textContent = isSpeaking ? 'Speaking...' : 'Ready to help';
    }
}

/**
 * Cleanup avatar when leaving view
 */
function cleanupSynachat() {
    console.log('Cleaning up Synachat...');

    // Reset initialization flags FIRST
    synachatInitialized = false;
    avatarInitialized = false;

    // Cleanup 3D Avatar
    if (typeof SynachatAvatar !== 'undefined' && SynachatAvatar.isInitialized) {
        SynachatAvatar.destroy();
    }

    // Stop TTS
    if (typeof ElevenLabsTTS !== 'undefined') {
        ElevenLabsTTS.stop();
    }

    // Clear audio queue
    if (typeof AudioQueue !== 'undefined') {
        AudioQueue.clear();
    }

    console.log('Synachat cleanup complete');
}

/**
 * Toggle TTS on/off
 */
function toggleTTS() {
    ttsEnabled = !ttsEnabled;
    updateTTSToggleUI();

    if (!ttsEnabled && typeof ElevenLabsTTS !== 'undefined') {
        ElevenLabsTTS.stop();
    }

    if (typeof Utils !== 'undefined') {
        Utils.showToast(ttsEnabled ? 'Voice enabled' : 'Voice disabled', 'info');
    }
}

/**
 * Update TTS toggle button UI
 */
function updateTTSToggleUI() {
    const toggle = document.getElementById('ttsToggle');
    if (!toggle) return;

    if (ttsEnabled) {
        toggle.classList.add('active');
        toggle.classList.remove('muted');
        toggle.innerHTML = '<i class="fas fa-volume-up"></i>';
        toggle.title = 'Suara Aktif — Klik untuk matikan';
    } else {
        toggle.classList.remove('active');
        toggle.classList.add('muted');
        toggle.innerHTML = '<i class="fas fa-volume-mute"></i>';
        toggle.title = 'Suara Mati — Klik untuk aktifkan';
    }
}

/**
 * Speak response using TTS
 */
function speakResponse(text) {
    if (!ttsEnabled || !text) return;

    if (typeof ElevenLabsTTS !== 'undefined') {
        // Split into sentences for more natural speech
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

        sentences.forEach(sentence => {
            const trimmed = sentence.trim();
            if (trimmed) {
                ElevenLabsTTS.speak(trimmed, (isSpeaking) => {
                    if (avatarInitialized && typeof SynachatAvatar !== 'undefined') {
                        SynachatAvatar.setSpeaking(isSpeaking);
                    }
                    updateAvatarStatus(isSpeaking);
                });
            }
        });
    }
}

/**
 * Update health context display
 */
function updateHealthContextDisplay() {
    if (typeof BLEConnection === 'undefined') return;

    const data = BLEConnection.getSensorData();
    if (!data) return;

    const hrEl = document.getElementById('contextHr');
    const spo2El = document.getElementById('contextSpo2');
    const stressEl = document.getElementById('contextStress');

    if (hrEl) hrEl.textContent = data.finger ? data.hr : '--';
    if (spo2El) spo2El.textContent = data.finger ? data.spo2 : '--';
    if (stressEl) stressEl.textContent = data.stress || '--';
}

/**
 * Load chat history from Firebase
 */
async function loadChatHistory() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const messages = await FirebaseService.getChatHistory(user.uid);

        if (messages && messages.length > 0) {
            chatHistory = messages;
            renderMessages();
            hideWelcomeMessage();
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

/**
 * Send message
 */
async function sendMessage() {
    const input = document.getElementById('messageInput');
    const message = input.value.trim();

    if (!message || isWaitingForResponse) return;

    // Clear input
    input.value = '';
    input.style.height = 'auto';

    // Hide welcome message
    hideWelcomeMessage();

    // Add user message
    addMessage('user', message);

    // Save to history
    await saveMessageToHistory('user', message);

    // Show typing indicator
    showTypingIndicator();

    // Get AI response
    try {
        const response = await sendToGemini(message);
        hideTypingIndicator();
        addMessage('assistant', response);
        await saveMessageToHistory('assistant', response);

        // Speak the response using TTS
        speakResponse(response);
    } catch (error) {
        console.error('Error getting AI response:', error);
        hideTypingIndicator();
        const errorMsg = 'Maaf, terjadi kesalahan. Silakan coba lagi nanti.';
        addMessage('assistant', errorMsg);
        speakResponse(errorMsg);
    }
}

/**
 * Send message to Gemini API
 */
async function sendToGemini(userMessage) {
    isWaitingForResponse = true;

    try {
        // Get current health context
        let healthContext = '';
        if (typeof BLEConnection !== 'undefined') {
            const data = BLEConnection.getSensorData();
            if (data.lastUpdate) {
                healthContext = `
[Current Health Data from SYNAWATCH:]
- Heart Rate: ${data.finger ? data.hr : 'Not detected'} BPM
- SpO2: ${data.finger ? data.spo2 : 'Not detected'}%
- Body Temperature: ${data.bt.toFixed(1)}°C
- Stress Level: ${data.stress}%
- GSR Level: ${data.gsr}% (${Utils.getGSRStatus(data.gsr).status})
- Activity: ${Utils.getActivityLabel(data.act)}
- Finger Detected: ${data.finger ? 'Yes' : 'No'}
`;
            }
        }

        // Build conversation history for context
        const conversationHistory = chatHistory.slice(-10).map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        // Add current message with health context
        const currentMessage = healthContext
            ? `${healthContext}\n\nUser message: ${userMessage}`
            : userMessage;

        // Embed system prompt in conversation for compatibility
        const contents = [
            {
                role: 'user',
                parts: [{ text: `${SYSTEM_PROMPT}\n\nPlease acknowledge and respond as Synachat.` }]
            },
            {
                role: 'model',
                parts: [{ text: 'Understood. I am Synachat, your AI health assistant from SYNAWATCH. I will provide empathetic support, help you understand your health data, and offer wellness guidance. How can I help you today?' }]
            },
            ...conversationHistory,
            {
                role: 'user',
                parts: [{ text: currentMessage }]
            }
        ];

        // Make API request
        const response = await fetch(`${GEMINI_API_URL}?key=${CONFIG.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: contents,
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 1024
                },
                safetySettings: [
                    {
                        category: 'HARM_CATEGORY_HARASSMENT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_HATE_SPEECH',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    },
                    {
                        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Gemini API Response:', response.status, errorBody);
            throw new Error(`API error: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();

        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        } else {
            throw new Error('Invalid response format');
        }
    } catch (error) {
        console.error('Gemini API error:', error);
        throw error;
    } finally {
        isWaitingForResponse = false;
    }
}

/**
 * Add message to chat
 */
function addMessage(role, content) {
    const container = document.getElementById('messagesContainer');
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const messageHtml = `
        <div class="message ${role}">
            <div class="message-avatar">
                <i class="fas ${role === 'assistant' ? 'fa-robot' : 'fa-user'}"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble">${formatMessage(content)}</div>
                <div class="message-time">${timeStr}</div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', messageHtml);

    // Smooth scroll to bottom
    container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
    });

    // Update local history
    chatHistory.push({
        role,
        content,
        timestamp: now.toISOString()
    });
}

/**
 * Format message content (basic markdown support)
 */
function formatMessage(content) {
    // Escape HTML
    let formatted = Utils.sanitizeHTML(content);

    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');

    // Lists
    formatted = formatted.replace(/^- (.*)/gm, '<li>$1</li>');
    formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

    return formatted;
}

/**
 * Save message to Firebase
 */
async function saveMessageToHistory(role, content) {
    try {
        const user = auth.currentUser;
        if (!user) return;

        await FirebaseService.saveChatMessage(user.uid, {
            role,
            content,
            timestamp: firebase.firestore.Timestamp.now()
        });
    } catch (error) {
        console.error('Error saving message:', error);
    }
}

/**
 * Show typing indicator
 */
function showTypingIndicator() {
    const container = document.getElementById('messagesContainer');

    const typingHtml = `
        <div id="typingIndicator" class="message assistant">
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    <div class="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', typingHtml);
    container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
    });

    // Add thinking animation to avatar
    const avatarContainer = document.querySelector('.synachat-avatar-section');
    if (avatarContainer) avatarContainer.classList.add('avatar-thinking');
}

/**
 * Hide typing indicator
 */
function hideTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
    // Remove thinking animation from avatar
    const avatarContainer = document.querySelector('.synachat-avatar-section');
    if (avatarContainer) avatarContainer.classList.remove('avatar-thinking');
}

/**
 * Hide welcome message
 */
function hideWelcomeMessage() {
    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        welcomeMessage.style.display = 'none';
    }
}

/**
 * Render messages from history
 */
function renderMessages() {
    const container = document.getElementById('messagesContainer');
    container.innerHTML = '';

    chatHistory.forEach(msg => {
        const time = msg.timestamp
            ? new Date(msg.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            : '';

        const messageHtml = `
            <div class="message ${msg.role}">
                <div class="message-avatar">
                    <i class="fas ${msg.role === 'assistant' ? 'fa-robot' : 'fa-user'}"></i>
                </div>
                <div class="message-content">
                    <div class="message-bubble">${formatMessage(msg.content)}</div>
                    <div class="message-time">${time}</div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', messageHtml);
    });

    container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
    });
}

/**
 * Send quick message
 */
function sendQuickMessage(message) {
    document.getElementById('messageInput').value = message;
    sendMessage();
}

/**
 * Handle key down in input
 */
function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

/**
 * Auto resize textarea
 */
function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

/**
 * Toggle health context display
 */
function toggleHealthContext() {
    const contextElement = document.getElementById('healthContext');
    showHealthContext = !showHealthContext;
    contextElement.style.display = showHealthContext ? 'block' : 'none';

    if (showHealthContext) {
        // Update with current data
        const data = BLEConnection.getSensorData();
        updateHealthContext(data);
    }
}

/**
 * Update health context with BLE data
 */
function updateHealthContext(data) {
    if (!showHealthContext) return;

    document.getElementById('contextHr').textContent = data.finger ? data.hr : '--';
    document.getElementById('contextSpo2').textContent = data.finger ? data.spo2 : '--';
    document.getElementById('contextStress').textContent = data.stress;
    document.getElementById('contextGsr').textContent = data.gsr;
    document.getElementById('contextTemp').textContent = data.bt ? data.bt.toFixed(1) : '--';

    // Gap 6: Proactive AI Chat Triggers - check realtime inside chat
    checkRealtimeProactiveTriggers(data);
}

// Global variable for debounce to prevent spamming proactive triggers during chat
let lastProactiveTriggerTime = 0;

/**
 * Check for real-time proactive triggers while the user is actively in the chat view
 */
function checkRealtimeProactiveTriggers(data) {
    if (!data.finger) return;
    
    const now = Date.now();
    // 5 minute cooldown for in-chat interruptions
    if (now - lastProactiveTriggerTime < 5 * 60 * 1000) return;

    if (data.stress > 85 && data.gsr > 80 && data.act === 0) {
        lastProactiveTriggerTime = now;
        triggerProactiveAIChat('acute_stress_spike');
    }
}

/**
 * Trigger Proactive AI Chat Message internally
 */
async function triggerProactiveAIChat(triggerReason) {
    if (isWaitingForResponse) return;

    hideWelcomeMessage();
    showTypingIndicator();

    try {
        let triggerPrompt = "";
        
        switch (triggerReason) {
            case 'high_stress_resting':
                triggerPrompt = "[SYSTEM COMMAND: You are initiating this conversation. The user was resting but their stress and heart rate suddenly spiked consistently. Act proactively by asking if they are okay, mentioning their sudden stress spike gently without alarming them, and offering a quick relaxation tip.]";
                break;
            case 'acute_stress_spike':
                triggerPrompt = "[SYSTEM COMMAND: The user is currently in chat. Their biometric data just detected an acute stress/panic level spike right now. Interrupt gently, acknowledge their physical reaction, and provide immediate calming grounding techniques (like 5-4-3-2-1) with empathetic support.]";
                break;
            default:
                triggerPrompt = "[SYSTEM COMMAND: Hello, initiate a gentle check-in with the user based on their high biometric stress.]";
        }

        const response = await sendToGemini(triggerPrompt);
        hideTypingIndicator();
        addMessage('assistant', response);
        await saveMessageToHistory('assistant', response);
        speakResponse(response);
    } catch (error) {
        console.error('Proactive AI error:', error);
        hideTypingIndicator();
    }
}

/**
 * Clear chat
 */
async function clearChat() {
    if (!confirm('Hapus semua riwayat chat? Tindakan ini tidak dapat dibatalkan.')) return;

    try {
        const user = auth.currentUser;
        if (user) {
            await FirebaseService.clearChatHistory(user.uid);
        }

        chatHistory = [];
        const container = document.getElementById('messagesContainer');
        container.innerHTML = `
            <div id="welcomeMessage" class="welcome-message">
                <div class="welcome-icon">
                    <i class="fas fa-robot"></i>
                </div>
                <h3>Hello, I'm Synachat</h3>
                <p>Your personal AI health companion. I can analyze your vitals, offer wellness advice, and support your health journey.</p>
                <div class="quick-actions">
                    <button class="quick-action" onclick="sendQuickMessage('Analyze my current heart rate')">
                        <i class="fas fa-heart-pulse"></i>
                        Heart Analysis
                    </button>
                    <button class="quick-action" onclick="sendQuickMessage('Help me manage my stress levels')">
                        <i class="fas fa-spa"></i>
                        Stress Relief
                    </button>
                    <button class="quick-action" onclick="sendQuickMessage('Give me personalized health tips')">
                        <i class="fas fa-wand-magic-sparkles"></i>
                        Health Tips
                    </button>
                </div>
            </div>
        `;

        Utils.showToast('Chat history cleared', 'success');
    } catch (error) {
        console.error('Error clearing chat:', error);
        Utils.showToast('Failed to clear chat', 'error');
    }
}

// Note: initSynachat() is called by the SPA router when navigating to synachat view
// Do not add automatic initialization here to prevent double rendering
