/**
 * SYNAWATCH - Wellness Games Module
 * Stress relief & mindfulness games
 */

const GamesModule = {
    currentGame: null,
    score: 0,
    streak: 0,
    stats: {
        breathingExercises: 0,
        puzzlesCompleted: 0,
        meditationMinutes: 0,
        totalStressRelief: 0,
        challengesCompleted: 0
    },

    /**
     * Initialize Games Module
     */
    async init() {
        console.log('Games Module initialized');
        await this.loadStats();
    },

    /**
     * Load player stats from Firestore (with localStorage fallback)
     */
    async loadStats() {
        // Try Firestore first
        try {
            const user = typeof firebase !== 'undefined' && firebase.auth().currentUser;
            if (user && typeof db !== 'undefined') {
                const doc = await db.collection('users').doc(user.uid)
                    .collection('game_stats').doc('summary').get();
                if (doc.exists) {
                    this.stats = { ...this.stats, ...doc.data() };
                    console.log('✅ Game stats loaded from Firestore');
                    this._syncToLocalStorage();
                    return;
                }
            }
        } catch (e) {
            console.warn('Firestore game stats unavailable, using localStorage');
        }

        // Fallback: localStorage
        try {
            const saved = localStorage.getItem('synawatch_game_stats');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.stats = { ...this.stats, ...(parsed.stats || parsed) };
            }
        } catch (e) {
            console.log('Could not load stats from localStorage');
        }
    },

    /**
     * Save player stats to Firestore AND localStorage
     */
    async saveStats() {
        // Save to localStorage immediately
        this._syncToLocalStorage();

        // Save to Firestore asynchronously
        try {
            const user = typeof firebase !== 'undefined' && firebase.auth().currentUser;
            if (user && typeof db !== 'undefined') {
                await db.collection('users').doc(user.uid)
                    .collection('game_stats').doc('summary').set({
                        ...this.stats,
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
                        userId: user.uid
                    }, { merge: true });
                console.log('✅ Game stats saved to Firestore');
            }
        } catch (e) {
            console.warn('Could not save game stats to Firestore (saved to localStorage):', e.message);
        }
    },

    _syncToLocalStorage() {
        try {
            localStorage.setItem('synawatch_game_stats', JSON.stringify(this.stats));
        } catch (e) {}
    },

    /**
     * GAME 1: Breathing Exercise
     * Guided breathing with visual feedback
     */
    breathingExercise() {
        return `
            <div style="max-width: 500px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="font-size: 2rem; margin-bottom: 10px;">🫁 Breathing Exercise</h2>
                    <p style="color: var(--text-secondary);">Follow the circle. Reduce stress in 2 minutes.</p>
                </div>

                <!-- Breathing Circle -->
                <div style="display: flex; justify-content: center; margin-bottom: 30px;">
                    <div id="breathingCircle" style="
                        width: 150px;
                        height: 150px;
                        border-radius: 50%;
                        background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 10px 40px rgba(139, 92, 246, 0.3);
                        color: white;
                        font-weight: 700;
                        font-size: 2rem;
                        animation: breathe 8s infinite;
                    ">
                        <span id="breathText">Breathe In</span>
                    </div>
                </div>

                <style>
                    @keyframes breathe {
                        0% { transform: scale(1); }
                        25% { transform: scale(1.3); }
                        50% { transform: scale(1.3); }
                        75% { transform: scale(1); }
                        100% { transform: scale(1); }
                    }

                    @keyframes float {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(-10px); }
                    }

                    .particle {
                        position: absolute;
                        width: 8px;
                        height: 8px;
                        background: rgba(139, 92, 246, 0.6);
                        border-radius: 50%;
                        animation: float 3s infinite;
                    }
                </style>

                <!-- Instructions -->
                <div style="background: var(--bg-secondary); padding: 20px; border-radius: var(--radius-lg); margin-bottom: 20px;">
                    <p style="margin: 0 0 10px; font-weight: 600; color: var(--text-primary);">How to Use:</p>
                    <ul style="margin: 0; padding-left: 20px; color: var(--text-secondary);">
                        <li>Watch the circle expand as you breathe in (4 seconds)</li>
                        <li>Hold your breath (4 seconds)</li>
                        <li>Exhale as circle shrinks (4 seconds)</li>
                        <li>Hold (4 seconds)</li>
                        <li>Repeat for 2-5 minutes</li>
                    </ul>
                </div>

                <!-- Breathing Count -->
                <div style="text-align: center; margin-bottom: 20px;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-500);">
                        Breathing Cycles: <span id="breathCount">0</span>
                    </div>
                    <div style="font-size: 0.9rem; color: var(--text-tertiary); margin-top: 5px;">
                        Stress Relief: <span id="stressReduction">0</span>%
                    </div>
                </div>

                <!-- Controls -->
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-primary" onclick="GamesModule.startBreathing()" id="startBreathBtn">
                        <i class="fas fa-play"></i> Start
                    </button>
                    <button class="btn btn-secondary" onclick="GamesModule.stopBreathing()" id="stopBreathBtn" style="display: none;">
                        <i class="fas fa-stop"></i> Stop
                    </button>
                </div>

                <!-- Tips -->
                <div style="margin-top: 30px; padding: 15px; background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10b981; border-radius: var(--radius-md);">
                    <p style="margin: 0; font-size: 0.9rem; color: var(--text-secondary);">
                        💡 <strong>Tip:</strong> Slow, deep breathing activates your parasympathetic nervous system, reducing stress and anxiety naturally.
                    </p>
                </div>
            </div>
        `;
    },

    /**
     * Start Breathing Exercise
     */
    startBreathing() {
        const startBtn = document.getElementById('startBreathBtn');
        const stopBtn = document.getElementById('stopBreathBtn');
        const breathText = document.getElementById('breathText');
        const breathCount = document.getElementById('breathCount');
        const stressReduction = document.getElementById('stressReduction');

        if (!startBtn) return;

        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';

        let count = 0;
        let phase = 0;
        const phases = ['Breathe In', 'Hold', 'Breathe Out', 'Hold'];

        const interval = setInterval(() => {
            phase = (phase + 1) % 4;
            count = Math.floor(phase / 4) + 1;

            if (breathText) breathText.textContent = phases[phase];
            if (breathCount) breathCount.textContent = count;
            if (stressReduction) stressReduction.textContent = Math.min(100, count * 25);

            // Complete after 8 cycles (2 minutes)
            if (count >= 8) {
                this.stopBreathing();
                GamesModule.stats.breathingExercises++;
                GamesModule.stats.totalStressRelief += 30;
                GamesModule.saveStats();
                alert('✅ Great job! You completed 2 minutes of breathing exercises. Keep it up! 🎉');
            }
        }, 4000);

        this.breathingInterval = interval;
    },

    /**
     * Stop Breathing Exercise
     */
    stopBreathing() {
        if (this.breathingInterval) {
            clearInterval(this.breathingInterval);
            this.breathingInterval = null;
        }

        const startBtn = document.getElementById('startBreathBtn');
        const stopBtn = document.getElementById('stopBreathBtn');

        if (startBtn) startBtn.style.display = 'inline-block';
        if (stopBtn) stopBtn.style.display = 'none';
    },

    /**
     * GAME 2: Stress Relief Puzzle
     * Simple matching game
     */
    stressRelieveGame() {
        const emojis = ['😊', '😌', '🧘', '💪', '🌟', '✨', '🎉', '💫'];
        const shuffled = [...emojis, ...emojis].sort(() => Math.random() - 0.5);

        return `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="font-size: 2rem; margin-bottom: 10px;">🧩 Memory Match Game</h2>
                    <p style="color: var(--text-secondary);">Match pairs of emojis. Improves focus and reduces stress.</p>
                </div>

                <!-- Score -->
                <div style="display: flex; justify-content: space-around; margin-bottom: 20px;">
                    <div style="text-align: center;">
                        <div style="font-size: 1rem; color: var(--text-secondary);">Pairs Found</div>
                        <div style="font-size: 2rem; font-weight: 700; color: var(--primary-500);" id="pairsFound">0/8</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 1rem; color: var(--text-secondary);">Moves</div>
                        <div style="font-size: 2rem; font-weight: 700; color: var(--warning-500);" id="moveCount">0</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 1rem; color: var(--text-secondary);">Time</div>
                        <div style="font-size: 2rem; font-weight: 700; color: var(--success-500);" id="timeCount">0s</div>
                    </div>
                </div>

                <!-- Game Board -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 30px;">
                    ${shuffled.map((emoji, idx) => `
                        <button onclick="GamesModule.flipCard(${idx})" id="card-${idx}" style="
                            width: 100%;
                            aspect-ratio: 1;
                            background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
                            border: none;
                            border-radius: var(--radius-lg);
                            color: white;
                            font-size: 2.5rem;
                            cursor: pointer;
                            transition: all 0.3s;
                            box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        " data-emoji="${emoji}" data-flipped="false">
                            <span id="card-face-${idx}">?</span>
                        </button>
                    `).join('')}
                </div>

                <!-- Controls -->
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-redo"></i> New Game
                    </button>
                    <button class="btn btn-secondary" onclick="Router.navigate('dashboard')">
                        <i class="fas fa-arrow-left"></i> Back
                    </button>
                </div>

                <script>
                let flipped = [];
                let moves = 0;
                let matched = 0;
                let startTime = Date.now();
                let gameActive = true;

                setInterval(() => {
                    if (gameActive) {
                        const seconds = Math.floor((Date.now() - startTime) / 1000);
                        const timeEl = document.getElementById('timeCount');
                        if (timeEl) timeEl.textContent = seconds + 's';
                    }
                }, 100);

                GamesModule.flipCard = function(idx) {
                    if (!gameActive || flipped.length >= 2) return;

                    const card = document.getElementById('card-' + idx);
                    const face = document.getElementById('card-face-' + idx);
                    const emoji = card.dataset.emoji;

                    if (face.textContent !== '?') return;

                    face.textContent = emoji;
                    flipped.push({idx, emoji});

                    if (flipped.length === 2) {
                        moves++;
                        document.getElementById('moveCount').textContent = moves;

                        if (flipped[0].emoji === flipped[1].emoji) {
                            matched++;
                            document.getElementById('pairsFound').textContent = matched + '/8';
                            flipped = [];

                            if (matched === 8) {
                                gameActive = false;
                                alert('🎉 Congratulations! You completed the game in ' + moves + ' moves!');
                                GamesModule.stats.puzzlesCompleted++;
                                GamesModule.stats.totalStressRelief += 15;
                                GamesModule.saveStats();
                            }
                        } else {
                            setTimeout(() => {
                                document.getElementById('card-face-' + flipped[0].idx).textContent = '?';
                                document.getElementById('card-face-' + flipped[1].idx).textContent = '?';
                                flipped = [];
                            }, 1000);
                        }
                    }
                };
                </script>
            </div>
        `;
    },

    /**
     * GAME 3: Quick Wellness Challenge
     * Daily challenge system
     */
    wellnessChallenge() {
        const challenges = [
            { emoji: '💧', task: 'Drink a glass of water', points: 10 },
            { emoji: '🚶', task: 'Take a 5-minute walk', points: 25 },
            { emoji: '😊', task: 'Smile and be grateful', points: 15 },
            { emoji: '🧘', task: 'Do 2 minutes of meditation', points: 30 },
            { emoji: '💪', task: 'Do 10 stretches', points: 20 },
            { emoji: '🫁', task: 'Practice deep breathing (1 min)', points: 25 },
            { emoji: '📱', task: 'Digital detox (15 mins)', points: 20 },
            { emoji: '😴', task: 'Prepare for good sleep', points: 30 }
        ];

        const today = new Date().toDateString();
        const completedToday = localStorage.getItem('challenge_' + today) === 'true';

        return `
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h2 style="font-size: 2rem; margin-bottom: 10px;">🏆 Daily Wellness Challenge</h2>
                    <p style="color: var(--text-secondary);">Complete the challenge to earn points & streaks!</p>
                </div>

                <!-- Challenge Card -->
                <div style="background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); padding: 30px; border-radius: var(--radius-lg); color: white; margin-bottom: 30px; text-align: center;">
                    <div style="font-size: 3rem; margin-bottom: 15px;" id="challengeEmoji">🏆</div>
                    <div style="font-size: 1.3rem; font-weight: 600; margin-bottom: 20px;" id="challengeTask">Loading...</div>
                    <div style="background: rgba(255,255,255,0.2); padding: 10px 20px; border-radius: var(--radius-md); display: inline-block;">
                        <span style="font-size: 1.2rem; font-weight: 700;">+<span id="challengePoints">0</span> Points</span>
                    </div>
                </div>

                <!-- Progress -->
                ${!completedToday ? `
                    <div style="margin-bottom: 20px;">
                        <button class="btn btn-primary" style="width: 100%; padding: 15px;" onclick="GamesModule.completeChallenge()">
                            <i class="fas fa-check"></i> Complete Today's Challenge
                        </button>
                    </div>
                ` : `
                    <div style="background: rgba(16, 185, 129, 0.1); border: 2px solid #10b981; padding: 20px; border-radius: var(--radius-lg); margin-bottom: 20px; text-align: center;">
                        <p style="margin: 0; font-weight: 600; color: #10b981;">✅ Challenge Completed Today!</p>
                        <p style="margin: 10px 0 0; color: var(--text-secondary);">Come back tomorrow for a new challenge.</p>
                    </div>
                `}

                <!-- Stats -->
                <div style="background: var(--bg-secondary); padding: 20px; border-radius: var(--radius-lg); margin-bottom: 20px;">
                    <h3 style="margin-top: 0; color: var(--text-primary);">Your Stats</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <div style="font-size: 0.9rem; color: var(--text-tertiary);">Total Points</div>
                            <div style="font-size: 1.8rem; font-weight: 700; color: var(--primary-500);" id="totalPoints">0</div>
                        </div>
                        <div>
                            <div style="font-size: 0.9rem; color: var(--text-tertiary);">Stress Relief</div>
                            <div style="font-size: 1.8rem; font-weight: 700; color: var(--success-500);" id="totalRelief">0%</div>
                        </div>
                    </div>
                </div>

                <!-- All Challenges -->
                <div style="background: var(--bg-secondary); padding: 20px; border-radius: var(--radius-lg);">
                    <h3 style="margin-top: 0; color: var(--text-primary);">Available Challenges</h3>
                    ${challenges.map(c => `
                        <div style="padding: 12px; background: white; border-radius: var(--radius-md); margin-bottom: 10px; display: flex; align-items: center; gap: 15px;">
                            <span style="font-size: 1.5rem;">${c.emoji}</span>
                            <div style="flex: 1;">
                                <div style="font-weight: 500; color: var(--text-primary);">${c.task}</div>
                            </div>
                            <div style="background: var(--primary-100); color: var(--primary-500); padding: 5px 12px; border-radius: var(--radius-sm); font-weight: 600; font-size: 0.85rem;">
                                +${c.points}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <script>
                const challenges = ${JSON.stringify(challenges)};
                const today = new Date().toDateString();
                const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];

                document.getElementById('challengeEmoji').textContent = randomChallenge.emoji;
                document.getElementById('challengeTask').textContent = randomChallenge.task;
                document.getElementById('challengePoints').textContent = randomChallenge.points;
                document.getElementById('totalPoints').textContent = JSON.parse(localStorage.getItem('synawatch_game_stats') || '{"stats":{}}').stats?.totalStressRelief || 0;
                document.getElementById('totalRelief').textContent = Math.min(100, (JSON.parse(localStorage.getItem('synawatch_game_stats') || '{"stats":{}}').stats?.totalStressRelief || 0)) + '%';

                GamesModule.completeChallenge = function() {
                    localStorage.setItem('challenge_' + today, 'true');
                    alert('🎉 Challenge completed! +' + randomChallenge.points + ' points earned!');
                    GamesModule.stats.totalStressRelief += randomChallenge.points;
                    GamesModule.saveStats();
                    location.reload();
                };
                </script>
            </div>
        `;
    },

    /**
     * Display selected game
     */
    displayGame(gameType) {
        const gameDisplay = document.getElementById('gameDisplay');

        if (gameType === 'breathing') {
            gameDisplay.innerHTML = this.breathingExercise();
        } else if (gameType === 'memory') {
            gameDisplay.innerHTML = this.stressRelieveGame();
        } else if (gameType === 'challenge') {
            gameDisplay.innerHTML = this.wellnessChallenge();
        }
    }
};

// Make globally available
window.GamesModule = GamesModule;
