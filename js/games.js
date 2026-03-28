/**
 * SYNAWATCH - Wellness Games Module
 * Modern design with Firestore integration
 */

const GamesModule = {
    currentGame: null,
    userId: null,
    stats: {
        totalPoints: 0,
        gamesPlayed: 0,
        currentStreak: 0,
        lastPlayDate: null,
        breathingExercises: 0,
        puzzlesCompleted: 0,
        challengesCompleted: 0,
        focusSessions: 0
    },

    /**
     * Initialize Games Module
     */
    async init() {
        console.log('Games Module initialized');

        // Get current user
        if (typeof firebase !== 'undefined' && firebase.auth) {
            const user = firebase.auth().currentUser;
            if (user) {
                this.userId = user.uid;
                await this.loadStatsFromFirestore();
            }
        }

        this.updateStatsDisplay();
        this.loadHistory();
        this.loadLeaderboard();
    },

    /**
     * Load stats from Firestore
     */
    async loadStatsFromFirestore() {
        if (!this.userId) return;

        try {
            const doc = await firebase.firestore()
                .collection('users')
                .doc(this.userId)
                .collection('gameStats')
                .doc('summary')
                .get();

            if (doc.exists) {
                this.stats = { ...this.stats, ...doc.data() };
                this.checkStreak();
            }
        } catch (e) {
            console.log('Could not load game stats:', e);
            // Fallback to localStorage
            this.loadStatsFromLocal();
        }
    },

    /**
     * Load stats from localStorage (fallback)
     */
    loadStatsFromLocal() {
        try {
            const saved = localStorage.getItem('synawatch_game_stats');
            if (saved) {
                this.stats = { ...this.stats, ...JSON.parse(saved) };
            }
        } catch (e) {
            console.log('Could not load local stats');
        }
    },

    /**
     * Save stats to Firestore
     */
    async saveStats() {
        // Save to localStorage first
        localStorage.setItem('synawatch_game_stats', JSON.stringify(this.stats));

        if (!this.userId) return;

        try {
            await firebase.firestore()
                .collection('users')
                .doc(this.userId)
                .collection('gameStats')
                .doc('summary')
                .set(this.stats, { merge: true });
        } catch (e) {
            console.log('Could not save stats to Firestore:', e);
        }
    },

    /**
     * Save game history to Firestore
     */
    async saveGameHistory(gameType, score, duration, details = {}) {
        const historyEntry = {
            gameType,
            score,
            duration,
            details,
            playedAt: new Date().toISOString(),
            timestamp: firebase.firestore ? firebase.firestore.FieldValue.serverTimestamp() : new Date()
        };

        // Update stats
        this.stats.totalPoints += score;
        this.stats.gamesPlayed++;
        this.stats.lastPlayDate = new Date().toDateString();

        // Update specific game stats
        if (gameType === 'breathing') this.stats.breathingExercises++;
        if (gameType === 'memory') this.stats.puzzlesCompleted++;
        if (gameType === 'challenge') this.stats.challengesCompleted++;
        if (gameType === 'focus') this.stats.focusSessions++;

        this.checkStreak();
        await this.saveStats();
        this.updateStatsDisplay();

        if (!this.userId) return;

        try {
            await firebase.firestore()
                .collection('users')
                .doc(this.userId)
                .collection('gameHistory')
                .add(historyEntry);
        } catch (e) {
            console.log('Could not save game history:', e);
        }
    },

    /**
     * Check and update streak
     */
    checkStreak() {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        if (this.stats.lastPlayDate === today) {
            // Already played today, streak continues
        } else if (this.stats.lastPlayDate === yesterday) {
            // Played yesterday, increment streak
            this.stats.currentStreak++;
        } else if (this.stats.lastPlayDate !== today) {
            // Streak broken, reset to 1
            this.stats.currentStreak = 1;
        }
    },

    /**
     * Update stats display
     */
    updateStatsDisplay() {
        const totalPointsEl = document.getElementById('totalPointsDisplay');
        const streakEl = document.getElementById('currentStreak');
        const gamesPlayedEl = document.getElementById('gamesPlayed');

        if (totalPointsEl) totalPointsEl.textContent = this.stats.totalPoints || 0;
        if (streakEl) streakEl.textContent = this.stats.currentStreak || 0;
        if (gamesPlayedEl) gamesPlayedEl.textContent = this.stats.gamesPlayed || 0;
    },

    /**
     * Load game history
     */
    async loadHistory() {
        const container = document.getElementById('gameHistoryList');
        if (!container) return;

        if (!this.userId) {
            const noHistory = typeof t !== 'undefined' && I18n.currentLang === 'en' ? 'No History Yet' : 'Belum Ada Riwayat';
            const loginMsg = typeof t !== 'undefined' && I18n.currentLang === 'en' ? 'Login to see game history' : 'Login untuk melihat riwayat permainan';
            container.innerHTML = this.renderEmptyState(noHistory, loginMsg);
            return;
        }

        try {
            const snapshot = await firebase.firestore()
                .collection('users')
                .doc(this.userId)
                .collection('gameHistory')
                .orderBy('playedAt', 'desc')
                .limit(20)
                .get();

            if (snapshot.empty) {
                const noHistory = typeof t !== 'undefined' && I18n.currentLang === 'en' ? 'No History Yet' : 'Belum Ada Riwayat';
                const playMsg = typeof t !== 'undefined' && I18n.currentLang === 'en' ? 'Play games to see history' : 'Mainkan game untuk melihat riwayat';
                container.innerHTML = this.renderEmptyState(noHistory, playMsg);
                return;
            }

            let html = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                html += this.renderHistoryItem(data);
            });

            container.innerHTML = html;
        } catch (e) {
            console.log('Could not load history:', e);
            const failTitle = typeof t !== 'undefined' && I18n.currentLang === 'en' ? 'Failed to Load' : 'Gagal Memuat';
            const failMsg = typeof t !== 'undefined' && I18n.currentLang === 'en' ? 'Try refreshing the page' : 'Coba refresh halaman';
            container.innerHTML = this.renderEmptyState(failTitle, failMsg);
        }
    },

    /**
     * Render history item
     */
    renderHistoryItem(data) {
        const gameNames = {
            breathing: typeof t !== 'undefined' ? t('games.breathing_title') : 'Breathing Exercise',
            memory: typeof t !== 'undefined' ? t('games.memory_title') : 'Memory Match',
            challenge: typeof t !== 'undefined' ? t('games.challenge_title') : 'Daily Challenge',
            focus: typeof t !== 'undefined' ? t('games.focus_title') : 'Focus Timer'
        };

        const gameIcons = {
            breathing: 'fa-wind',
            memory: 'fa-brain',
            challenge: 'fa-trophy',
            focus: 'fa-bullseye'
        };

        const date = new Date(data.playedAt);
        const locale = typeof I18n !== 'undefined' && I18n.currentLang === 'en' ? 'en-US' : 'id-ID';
        const formattedDate = date.toLocaleDateString(locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
            <div class="history-item">
                <div class="history-icon ${data.gameType}">
                    <i class="fas ${gameIcons[data.gameType] || 'fa-gamepad'}"></i>
                </div>
                <div class="history-info">
                    <div class="history-title">${gameNames[data.gameType] || data.gameType}</div>
                    <div class="history-date">${formattedDate}</div>
                </div>
                <div class="history-score">
                    <div class="history-points">+${data.score}</div>
                    <div class="history-duration">${data.duration || '-'}</div>
                </div>
            </div>
        `;
    },

    /**
     * Load leaderboard
     */
    async loadLeaderboard() {
        const container = document.getElementById('leaderboardList');
        if (!container) return;

        try {
            const snapshot = await firebase.firestore()
                .collection('users')
                .orderBy('gameStats.totalPoints', 'desc')
                .limit(10)
                .get();

            const noDataTitle = typeof t !== 'undefined' && I18n.currentLang === 'en' ? 'No Data Yet' : 'Belum Ada Data';
            const beFirstMsg = typeof t !== 'undefined' && I18n.currentLang === 'en' ? 'Be the first on the leaderboard!' : 'Jadilah yang pertama di leaderboard!';

            if (snapshot.empty) {
                container.innerHTML = this.renderEmptyState(noDataTitle, beFirstMsg);
                return;
            }

            let html = '';
            let rank = 1;

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.gameStats && data.gameStats.totalPoints > 0) {
                    html += this.renderLeaderboardItem(data, rank);
                    rank++;
                }
            });

            if (!html) {
                container.innerHTML = this.renderEmptyState(noDataTitle, beFirstMsg);
                return;
            }

            container.innerHTML = html;
        } catch (e) {
            console.log('Could not load leaderboard:', e);
            // Show placeholder leaderboard
            container.innerHTML = this.renderPlaceholderLeaderboard();
        }
    },

    /**
     * Render leaderboard item
     */
    renderLeaderboardItem(user, rank) {
        const topClass = rank <= 3 ? `top-${rank}` : '';
        const name = user.displayName || user.email?.split('@')[0] || 'Anonymous';
        const initial = name.charAt(0).toUpperCase();
        const points = user.gameStats?.totalPoints || 0;

        return `
            <div class="leaderboard-item ${topClass}">
                <div class="leaderboard-rank">${rank}</div>
                <div class="leaderboard-user">
                    <div class="leaderboard-avatar">${initial}</div>
                    <div class="leaderboard-name">${name}</div>
                </div>
                <div class="leaderboard-points">${points}</div>
            </div>
        `;
    },

    /**
     * Render placeholder leaderboard
     */
    renderPlaceholderLeaderboard() {
        const placeholders = [
            { name: 'Player 1', points: 500 },
            { name: 'Player 2', points: 350 },
            { name: 'Player 3', points: 280 },
            { name: 'You', points: this.stats.totalPoints || 0 }
        ];

        return placeholders.map((p, i) => `
            <div class="leaderboard-item ${i < 3 ? 'top-' + (i + 1) : ''}">
                <div class="leaderboard-rank">${i + 1}</div>
                <div class="leaderboard-user">
                    <div class="leaderboard-avatar">${p.name.charAt(0)}</div>
                    <div class="leaderboard-name">${p.name}</div>
                </div>
                <div class="leaderboard-points">${p.points}</div>
            </div>
        `).join('');
    },

    /**
     * Render empty state
     */
    renderEmptyState(title, desc) {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-inbox"></i>
                </div>
                <div class="empty-state-title">${title}</div>
                <div class="empty-state-desc">${desc}</div>
            </div>
        `;
    },

    /**
     * Switch tab
     */
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.games-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.games-tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });

        // Load data for specific tabs
        if (tabName === 'history') {
            this.loadHistory();
        } else if (tabName === 'leaderboard') {
            this.loadLeaderboard();
        }
    },

    /**
     * Display selected game
     */
    displayGame(gameType) {
        const modal = document.getElementById('gameModal');
        const gameDisplay = document.getElementById('gameDisplay');
        if (!modal || !gameDisplay) return;

        this.currentGame = gameType;

        if (gameType === 'breathing') {
            gameDisplay.innerHTML = this.breathingExercise();
        } else if (gameType === 'memory') {
            gameDisplay.innerHTML = this.memoryGame();
            this.initMemoryGame();
        } else if (gameType === 'challenge') {
            gameDisplay.innerHTML = this.challengeGame();
            this.initChallengeGame();
        } else if (gameType === 'focus') {
            gameDisplay.innerHTML = this.focusTimer();
            this.initFocusTimer();
        }

        modal.classList.add('active');
    },

    /**
     * Close game modal
     */
    closeGame() {
        const modal = document.getElementById('gameModal');
        if (modal) {
            modal.classList.remove('active');
        }

        // Cleanup intervals
        if (this.breathingInterval) clearInterval(this.breathingInterval);
        if (this.memoryTimerInterval) clearInterval(this.memoryTimerInterval);
        if (this.focusInterval) clearInterval(this.focusInterval);

        this.currentGame = null;
    },

    /**
     * GAME 1: Breathing Exercise
     */
    breathingExercise() {
        return `
            <div style="text-align: center; padding: 20px;">
                <div style="margin-bottom: 24px;">
                    <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0 0 8px;">
                        <i class="fas fa-wind" style="color: #06b6d4;"></i> Breathing Exercise
                    </h2>
                    <p style="color: var(--text-secondary); margin: 0;">Ikuti lingkaran untuk menenangkan pikiran</p>
                </div>

                <div style="position: relative; display: flex; justify-content: center; margin: 40px 0;">
                    <div id="breathingCircle" style="
                        width: 180px;
                        height: 180px;
                        border-radius: 50%;
                        background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 20px 60px rgba(6, 182, 212, 0.4);
                        color: white;
                        font-weight: 700;
                        font-size: 1.2rem;
                        transition: transform 4s ease-in-out;
                    ">
                        <span id="breathText">Siap?</span>
                    </div>
                </div>

                <div style="margin-bottom: 24px;">
                    <div style="font-size: 2.5rem; font-weight: 800; color: var(--primary-500);" id="breathCount">0</div>
                    <div style="font-size: 0.9rem; color: var(--text-tertiary);">Siklus Napas</div>
                </div>

                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button class="btn btn-primary" onclick="GamesModule.startBreathing()" id="startBreathBtn" style="padding: 14px 32px; font-size: 1rem;">
                        <i class="fas fa-play"></i> Mulai
                    </button>
                    <button class="btn btn-secondary" onclick="GamesModule.stopBreathing()" id="stopBreathBtn" style="display: none; padding: 14px 32px; font-size: 1rem;">
                        <i class="fas fa-stop"></i> Berhenti
                    </button>
                </div>

                <div style="margin-top: 24px; padding: 16px; background: rgba(6, 182, 212, 0.1); border-radius: 12px;">
                    <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">
                        <i class="fas fa-info-circle" style="color: #06b6d4;"></i>
                        Tarik napas 4 detik → Tahan 4 detik → Buang 4 detik → Tahan 4 detik
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
        const circle = document.getElementById('breathingCircle');
        const breathText = document.getElementById('breathText');
        const breathCount = document.getElementById('breathCount');

        if (!startBtn || !circle) return;

        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-flex';

        let count = 0;
        let phase = 0;
        const phases = ['Tarik Napas', 'Tahan', 'Buang Napas', 'Tahan'];
        const startTime = Date.now();

        const animate = () => {
            if (phase === 0) {
                circle.style.transform = 'scale(1.3)';
            } else if (phase === 2) {
                circle.style.transform = 'scale(1)';
            }

            breathText.textContent = phases[phase];
            phase = (phase + 1) % 4;

            if (phase === 0) {
                count++;
                breathCount.textContent = count;
            }

            if (count >= 8) {
                this.stopBreathing();
                const duration = Math.round((Date.now() - startTime) / 1000);
                this.saveGameHistory('breathing', 30, `${duration}s`, { cycles: count });
                this.showGameComplete('Breathing Exercise', 30, `${count} siklus selesai`);
            }
        };

        animate();
        this.breathingInterval = setInterval(animate, 4000);
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
        const circle = document.getElementById('breathingCircle');

        if (startBtn) startBtn.style.display = 'inline-flex';
        if (stopBtn) stopBtn.style.display = 'none';
        if (circle) circle.style.transform = 'scale(1)';
    },

    /**
     * GAME 2: Memory Match
     */
    memoryGame() {
        const emojis = ['😊', '😌', '🧘', '💪', '🌟', '✨', '🎉', '💫'];
        const shuffled = [...emojis, ...emojis].sort(() => Math.random() - 0.5);

        return `
            <div style="padding: 20px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0 0 8px;">
                        <i class="fas fa-brain" style="color: #f97316;"></i> Memory Match
                    </h2>
                    <p style="color: var(--text-secondary); margin: 0;">Cocokkan pasangan emoji yang sama</p>
                </div>

                <div style="display: flex; justify-content: space-around; margin-bottom: 20px; padding: 16px; background: var(--bg-secondary); border-radius: 12px;">
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-500);" id="pairsFound">0/8</div>
                        <div style="font-size: 0.8rem; color: var(--text-tertiary);">Pasangan</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: #f97316;" id="moveCount">0</div>
                        <div style="font-size: 0.8rem; color: var(--text-tertiary);">Langkah</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: #10b981;" id="timeCount">0s</div>
                        <div style="font-size: 0.8rem; color: var(--text-tertiary);">Waktu</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 20px;">
                    ${shuffled.map((emoji, idx) => `
                        <button onclick="GamesModule.flipCard(${idx})" id="card-${idx}" class="memory-card" data-emoji="${emoji}">
                            <span id="card-face-${idx}">?</span>
                        </button>
                    `).join('')}
                </div>

                <style>
                    .memory-card {
                        aspect-ratio: 1;
                        background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
                        border: none;
                        border-radius: 12px;
                        color: white;
                        font-size: 1.8rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3);
                    }
                    .memory-card:hover { transform: scale(1.05); }
                    .memory-card.matched {
                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                    }
                </style>

                <button class="btn btn-secondary" onclick="GamesModule.resetMemoryGame()" style="width: 100%;">
                    <i class="fas fa-redo"></i> Main Ulang
                </button>
            </div>
        `;
    },

    /**
     * Initialize Memory Game
     */
    initMemoryGame() {
        let flipped = [];
        let moves = 0;
        let matched = 0;
        let startTime = Date.now();
        let gameActive = true;

        this.memoryTimerInterval = setInterval(() => {
            if (gameActive) {
                const seconds = Math.floor((Date.now() - startTime) / 1000);
                const timeEl = document.getElementById('timeCount');
                if (timeEl) timeEl.textContent = seconds + 's';
            }
        }, 100);

        this.flipCard = (idx) => {
            if (!gameActive || flipped.length >= 2) return;

            const card = document.getElementById('card-' + idx);
            const face = document.getElementById('card-face-' + idx);
            if (!card || !face || face.textContent !== '?') return;

            const emoji = card.dataset.emoji;
            face.textContent = emoji;
            card.classList.add('matched');
            flipped.push({ idx, emoji });

            if (flipped.length === 2) {
                moves++;
                document.getElementById('moveCount').textContent = moves;

                if (flipped[0].emoji === flipped[1].emoji) {
                    matched++;
                    document.getElementById('pairsFound').textContent = matched + '/8';
                    flipped = [];

                    if (matched === 8) {
                        gameActive = false;
                        clearInterval(this.memoryTimerInterval);
                        const duration = Math.floor((Date.now() - startTime) / 1000);
                        this.saveGameHistory('memory', 15, `${duration}s`, { moves, time: duration });
                        setTimeout(() => {
                            this.showGameComplete('Memory Match', 15, `Selesai dalam ${moves} langkah`);
                        }, 500);
                    }
                } else {
                    setTimeout(() => {
                        const f1 = document.getElementById('card-face-' + flipped[0].idx);
                        const f2 = document.getElementById('card-face-' + flipped[1].idx);
                        const c1 = document.getElementById('card-' + flipped[0].idx);
                        const c2 = document.getElementById('card-' + flipped[1].idx);

                        if (f1) f1.textContent = '?';
                        if (f2) f2.textContent = '?';
                        if (c1) c1.classList.remove('matched');
                        if (c2) c2.classList.remove('matched');
                        flipped = [];
                    }, 800);
                }
            }
        };
    },

    /**
     * Reset Memory Game
     */
    resetMemoryGame() {
        if (this.memoryTimerInterval) clearInterval(this.memoryTimerInterval);
        this.displayGame('memory');
    },

    /**
     * GAME 3: Daily Challenge
     */
    challengeGame() {
        const challenges = [
            { emoji: '💧', task: 'Minum segelas air', points: 10 },
            { emoji: '🚶', task: 'Jalan kaki 5 menit', points: 25 },
            { emoji: '😊', task: 'Tersenyum dan bersyukur', points: 15 },
            { emoji: '🧘', task: 'Meditasi 2 menit', points: 30 },
            { emoji: '💪', task: 'Lakukan 10 peregangan', points: 20 },
            { emoji: '🫁', task: 'Latihan napas dalam 1 menit', points: 25 },
            { emoji: '📱', task: 'Digital detox 15 menit', points: 20 },
            { emoji: '😴', task: 'Persiapan tidur yang baik', points: 30 }
        ];

        const today = new Date().toDateString();
        const completedToday = localStorage.getItem('challenge_' + today) === 'true';
        const todayChallenge = challenges[new Date().getDay() % challenges.length];

        return `
            <div style="padding: 20px;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0 0 8px;">
                        <i class="fas fa-trophy" style="color: #eab308;"></i> Daily Challenge
                    </h2>
                    <p style="color: var(--text-secondary); margin: 0;">Tantangan harian untuk kesehatan mental</p>
                </div>

                <div style="background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%); padding: 32px; border-radius: 20px; color: white; text-align: center; margin-bottom: 24px;">
                    <div style="font-size: 4rem; margin-bottom: 16px;" id="challengeEmoji">${todayChallenge.emoji}</div>
                    <div style="font-size: 1.3rem; font-weight: 600; margin-bottom: 16px;" id="challengeTask">${todayChallenge.task}</div>
                    <div style="background: rgba(255,255,255,0.2); padding: 12px 24px; border-radius: 30px; display: inline-block;">
                        <span style="font-size: 1.3rem; font-weight: 700;">+<span id="challengePoints">${todayChallenge.points}</span> Poin</span>
                    </div>
                </div>

                ${!completedToday ? `
                    <button class="btn btn-primary" style="width: 100%; padding: 16px; font-size: 1.1rem;" onclick="GamesModule.completeChallenge()">
                        <i class="fas fa-check"></i> Selesaikan Tantangan
                    </button>
                ` : `
                    <div style="background: rgba(16, 185, 129, 0.1); border: 2px solid #10b981; padding: 24px; border-radius: 16px; text-align: center;">
                        <i class="fas fa-check-circle" style="font-size: 2.5rem; color: #10b981; margin-bottom: 12px;"></i>
                        <p style="margin: 0; font-weight: 600; color: #10b981; font-size: 1.1rem;">Tantangan Hari Ini Selesai!</p>
                        <p style="margin: 8px 0 0; color: var(--text-secondary);">Kembali besok untuk tantangan baru</p>
                    </div>
                `}
            </div>
        `;
    },

    /**
     * Initialize Challenge Game
     */
    initChallengeGame() {
        // Challenge is self-contained in the HTML
    },

    /**
     * Complete daily challenge
     */
    completeChallenge() {
        const today = new Date().toDateString();
        const pointsEl = document.getElementById('challengePoints');
        const points = parseInt(pointsEl?.textContent || '15');

        localStorage.setItem('challenge_' + today, 'true');
        this.saveGameHistory('challenge', points, 'Harian', { date: today });
        this.showGameComplete('Daily Challenge', points, 'Tantangan harian selesai!');
        this.displayGame('challenge');
    },

    /**
     * GAME 4: Focus Timer (Pomodoro)
     */
    focusTimer() {
        return `
            <div style="padding: 20px; text-align: center;">
                <div style="margin-bottom: 24px;">
                    <h2 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0 0 8px;">
                        <i class="fas fa-bullseye" style="color: #10b981;"></i> Focus Timer
                    </h2>
                    <p style="color: var(--text-secondary); margin: 0;">Teknik Pomodoro untuk produktivitas</p>
                </div>

                <div style="position: relative; width: 200px; height: 200px; margin: 40px auto;">
                    <svg width="200" height="200" style="transform: rotate(-90deg);">
                        <circle cx="100" cy="100" r="90" stroke="var(--bg-secondary)" stroke-width="12" fill="none"/>
                        <circle id="focusProgress" cx="100" cy="100" r="90" stroke="#10b981" stroke-width="12" fill="none"
                            stroke-dasharray="565.48" stroke-dashoffset="0" stroke-linecap="round"
                            style="transition: stroke-dashoffset 1s linear;"/>
                    </svg>
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center;">
                        <div id="focusTime" style="font-size: 2.5rem; font-weight: 800; color: var(--text-primary);">25:00</div>
                        <div id="focusStatus" style="font-size: 0.9rem; color: var(--text-tertiary);">Siap Fokus</div>
                    </div>
                </div>

                <div style="display: flex; gap: 12px; justify-content: center; margin-bottom: 24px;">
                    <button class="btn btn-primary" onclick="GamesModule.startFocus()" id="startFocusBtn" style="padding: 14px 32px;">
                        <i class="fas fa-play"></i> Mulai
                    </button>
                    <button class="btn btn-secondary" onclick="GamesModule.pauseFocus()" id="pauseFocusBtn" style="display: none; padding: 14px 32px;">
                        <i class="fas fa-pause"></i> Pause
                    </button>
                    <button class="btn btn-secondary" onclick="GamesModule.resetFocus()" style="padding: 14px 32px;">
                        <i class="fas fa-redo"></i> Reset
                    </button>
                </div>

                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button class="focus-preset active" onclick="GamesModule.setFocusDuration(25)" data-duration="25">25m</button>
                    <button class="focus-preset" onclick="GamesModule.setFocusDuration(15)" data-duration="15">15m</button>
                    <button class="focus-preset" onclick="GamesModule.setFocusDuration(5)" data-duration="5">5m</button>
                </div>

                <style>
                    .focus-preset {
                        padding: 10px 20px;
                        border: 2px solid var(--border-color);
                        background: white;
                        border-radius: 30px;
                        font-weight: 600;
                        color: var(--text-secondary);
                        cursor: pointer;
                        transition: all 0.3s ease;
                    }
                    .focus-preset:hover, .focus-preset.active {
                        border-color: #10b981;
                        color: #10b981;
                        background: rgba(16, 185, 129, 0.1);
                    }
                </style>
            </div>
        `;
    },

    /**
     * Initialize Focus Timer
     */
    initFocusTimer() {
        this.focusDuration = 25 * 60;
        this.focusRemaining = this.focusDuration;
        this.focusPaused = true;
    },

    /**
     * Set focus duration
     */
    setFocusDuration(minutes) {
        this.focusDuration = minutes * 60;
        this.focusRemaining = this.focusDuration;
        this.updateFocusDisplay();

        document.querySelectorAll('.focus-preset').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.duration) === minutes);
        });
    },

    /**
     * Start focus timer
     */
    startFocus() {
        const startBtn = document.getElementById('startFocusBtn');
        const pauseBtn = document.getElementById('pauseFocusBtn');
        const statusEl = document.getElementById('focusStatus');

        if (startBtn) startBtn.style.display = 'none';
        if (pauseBtn) pauseBtn.style.display = 'inline-flex';
        if (statusEl) statusEl.textContent = 'Fokus...';

        this.focusPaused = false;
        this.focusStartTime = Date.now();

        this.focusInterval = setInterval(() => {
            if (!this.focusPaused && this.focusRemaining > 0) {
                this.focusRemaining--;
                this.updateFocusDisplay();

                if (this.focusRemaining <= 0) {
                    this.completeFocus();
                }
            }
        }, 1000);
    },

    /**
     * Pause focus timer
     */
    pauseFocus() {
        this.focusPaused = true;
        const startBtn = document.getElementById('startFocusBtn');
        const pauseBtn = document.getElementById('pauseFocusBtn');
        const statusEl = document.getElementById('focusStatus');

        if (startBtn) startBtn.style.display = 'inline-flex';
        if (pauseBtn) pauseBtn.style.display = 'none';
        if (statusEl) statusEl.textContent = 'Dijeda';
    },

    /**
     * Reset focus timer
     */
    resetFocus() {
        if (this.focusInterval) clearInterval(this.focusInterval);
        this.focusRemaining = this.focusDuration;
        this.focusPaused = true;
        this.updateFocusDisplay();

        const startBtn = document.getElementById('startFocusBtn');
        const pauseBtn = document.getElementById('pauseFocusBtn');
        const statusEl = document.getElementById('focusStatus');

        if (startBtn) startBtn.style.display = 'inline-flex';
        if (pauseBtn) pauseBtn.style.display = 'none';
        if (statusEl) statusEl.textContent = 'Siap Fokus';
    },

    /**
     * Update focus display
     */
    updateFocusDisplay() {
        const timeEl = document.getElementById('focusTime');
        const progressEl = document.getElementById('focusProgress');

        if (timeEl) {
            const mins = Math.floor(this.focusRemaining / 60);
            const secs = this.focusRemaining % 60;
            timeEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }

        if (progressEl) {
            const progress = (this.focusDuration - this.focusRemaining) / this.focusDuration;
            const circumference = 565.48;
            progressEl.style.strokeDashoffset = circumference * (1 - progress);
        }
    },

    /**
     * Complete focus session
     */
    completeFocus() {
        clearInterval(this.focusInterval);
        const duration = Math.round(this.focusDuration / 60);
        this.saveGameHistory('focus', 50, `${duration}m`, { duration });
        this.showGameComplete('Focus Timer', 50, `${duration} menit fokus selesai!`);
        this.resetFocus();
    },

    /**
     * Show game complete modal
     */
    showGameComplete(gameName, points, message) {
        const gameDisplay = document.getElementById('gameDisplay');
        if (!gameDisplay) return;

        gameDisplay.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="width: 100px; height: 100px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; box-shadow: 0 15px 40px rgba(16, 185, 129, 0.4);">
                    <i class="fas fa-check" style="font-size: 3rem; color: white;"></i>
                </div>
                <h2 style="font-size: 1.8rem; font-weight: 800; color: var(--text-primary); margin: 0 0 8px;">Selamat! 🎉</h2>
                <p style="color: var(--text-secondary); margin: 0 0 24px;">${message}</p>
                <div style="background: var(--primary-50); padding: 20px; border-radius: 16px; margin-bottom: 24px;">
                    <div style="font-size: 2.5rem; font-weight: 800; color: var(--primary-500);">+${points}</div>
                    <div style="font-size: 0.9rem; color: var(--text-tertiary);">Poin Diperoleh</div>
                </div>
                <button class="btn btn-primary" onclick="GamesModule.closeGame()" style="padding: 14px 40px; font-size: 1rem;">
                    <i class="fas fa-home"></i> Kembali ke Menu
                </button>
            </div>
        `;

        this.updateStatsDisplay();
    }
};

// Make globally available
window.GamesModule = GamesModule;
