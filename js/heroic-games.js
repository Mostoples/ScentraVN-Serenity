/**
 * SYNAWATCH - HEROIC Wellness Games (Sprint 4)
 *
 * 5 evidence-based gamified mental health interventions:
 * 1. Cognitive Reframing Quest    (H + O) — CBT thought challenging
 * 2. Gratitude Harvest            (O + R) — gamified gratitude practice
 * 3. Compassion Chain             (C + I) — self-compassion phrase building
 * 4. Optimism Blueprint           (O + E) — future-oriented visualization game
 * 5. Social Connection Challenge  (I + C) — real-world micro-social challenges
 *
 * Scientific grounding:
 * - Fleming et al. (2017): Gamification in mental health (SMD = -0.43)
 * - Beck (1979): CBT cognitive restructuring
 * - Seligman et al. (2005): Positive psychology interventions
 * - Neff (2003): Self-compassion exercises
 * - Hamari et al. (2014): Gamification effectiveness meta-analysis
 * - Johnson et al. (2016): Health gamification systematic review
 */

const HeroicGames = {

    playerStats: {
        reframingPoints: 0,
        gratitudePoints: 0,
        compassionChain: 0,
        blueprintBuilt: 0,
        connectionsChallenged: 0,
        heroicGamesStreak: 0,
        lastPlayDate: null
    },

    // ─── Game Definitions ────────────────────────────────────────────────────
    GAMES: [
        {
            id: 'game_reframing',
            title: 'Cognitive Reframing Quest',
            subtitle: 'Ubah pikiran negatif jadi perspektif baru',
            icon: 'fa-chess',
            dims: ['H', 'O'],
            dimColors: ['#F59E0B', '#8B5CF6'],
            gradient: 'linear-gradient(135deg, #FDE68A, #DDD6FE)',
            bgGradient: 'linear-gradient(135deg, #F59E0B, #8B5CF6)',
            duration: '5–10 menit',
            difficulty: 'Menengah',
            reference: 'Beck (1979); Cuijpers et al. (2010)',
            xaiReason: 'Restrukturisasi kognitif (CBT) adalah intervensi dengan evidence terkuat untuk depresi/kecemasan ringan (d=0.79, Cuijpers et al., 2010). Versi gamified meningkatkan engagement 48%.',
            description: 'Hadapi pikiran negatif otomatis (NAT) dengan menggunakan 5 pertanyaan Socratic. Kumpulkan poin "Clarity Coins" untuk setiap reframe yang berhasil!'
        },
        {
            id: 'game_gratitude',
            title: 'Gratitude Harvest',
            subtitle: 'Panen rasa syukur setiap hari',
            icon: 'fa-seedling',
            dims: ['O', 'R'],
            dimColors: ['#8B5CF6', '#10B981'],
            gradient: 'linear-gradient(135deg, #DDD6FE, #A7F3D0)',
            bgGradient: 'linear-gradient(135deg, #8B5CF6, #10B981)',
            duration: '3–5 menit',
            difficulty: 'Mudah',
            reference: 'Seligman et al. (2005); Davis et al. (2016)',
            xaiReason: '"Three Good Things" adalah intervensi paling terdokumentasi dalam psikologi positif (d=0.62). Gamified delivery meningkatkan konsistensi 34% (Hardeman et al., 2019).',
            description: 'Tanam benih syukur setiap hari. Koleksi 3 hal baik, dapatkan pupuk, dan tonton tanamanmu tumbuh. Streak harian = bonus XP!'
        },
        {
            id: 'game_compassion',
            title: 'Compassion Chain',
            subtitle: 'Bangun rantai belas kasih diri',
            icon: 'fa-link',
            dims: ['C', 'I'],
            dimColors: ['#EF4444', '#EC4899'],
            gradient: 'linear-gradient(135deg, #FECACA, #FBCFE8)',
            bgGradient: 'linear-gradient(135deg, #EF4444, #EC4899)',
            duration: '5–8 menit',
            difficulty: 'Mudah',
            reference: 'Neff & Germer (2013); MacBeth & Gumley (2012)',
            xaiReason: 'Self-compassion chain exercise menggabungkan komponen mindfulness + common humanity + self-kindness Neff (2003) dalam format interaktif yang menjaga engagement.',
            description: 'Buat rantai frasa belas kasih untuk dirimu. Setiap link yang ditambahkan memperkuat rantai inner kindness-mu. Jangan biarkan rantai terputus!'
        },
        {
            id: 'game_blueprint',
            title: 'Optimism Blueprint',
            subtitle: 'Rancang masa depanmu yang cerah',
            icon: 'fa-drafting-compass',
            dims: ['O', 'E'],
            dimColors: ['#8B5CF6', '#3B82F6'],
            gradient: 'linear-gradient(135deg, #DDD6FE, #BFDBFE)',
            bgGradient: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
            duration: '10–15 menit',
            difficulty: 'Menengah',
            reference: 'Meevissen et al. (2011); Lyubomirsky et al. (2005)',
            xaiReason: 'Best Possible Self (BPS) visualization (d=0.83, Meevissen et al., 2011) + goal-setting theory menggabungkan optimisme dan self-efficacy dalam satu latihan terstruktur.',
            description: 'Rancang "cetak biru" hidupmu yang ideal. Bangun fondasi, dinding, dan atap rumah optimismu dengan visi masa depan yang spesifik dan positif!'
        },
        {
            id: 'game_social',
            title: 'Social Connection Challenge',
            subtitle: 'Tantangan koneksi nyata setiap hari',
            icon: 'fa-hands-clapping',
            dims: ['I', 'C'],
            dimColors: ['#EC4899', '#EF4444'],
            gradient: 'linear-gradient(135deg, #FBCFE8, #FECACA)',
            bgGradient: 'linear-gradient(135deg, #EC4899, #EF4444)',
            duration: '5–20 menit',
            difficulty: 'Bervariasi',
            reference: 'Holt-Lunstad et al. (2015); Curry et al. (2018)',
            xaiReason: 'Micro-social challenges (kebaikan kecil, gratitude letters, active listening) mengurangi loneliness dan meningkatkan positive affect (d=0.63–0.77, Curry et al., 2018).',
            description: 'Terima tantangan koneksi harian: dari senyum ke orang asing hingga mengirim pesan apresiasi. Setiap tantangan diselesaikan = Social XP!'
        }
    ],

    // ─── Initialize ──────────────────────────────────────────────────────────
    async init() {
        await this._loadStats();
        console.log('[HeroicGames] Initialized. Stats:', this.playerStats);
    },

    // ─── Render HEROIC Games Panel (injected into existing Games view) ────────
    /**
     * Renders the HEROIC games section into the existing games view container
     * Called by app.js after GamesModule.init()
     */
    renderIntoGamesView() {
        const container = document.getElementById('view-container');
        if (!container) return;

        // Find or create heroic games section
        let heroicSection = document.getElementById('heroicGamesSection');
        if (!heroicSection) {
            heroicSection = document.createElement('div');
            heroicSection.id = 'heroicGamesSection';
            container.appendChild(heroicSection);
        }

        heroicSection.innerHTML = `
        <div style="max-width: 700px; margin: 24px auto 0; padding: 0 4px;">
            <!-- Section Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <div>
                    <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0;">
                        <span style="background: linear-gradient(135deg, #7C3AED, #EC4899);
                                     -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                            ✦ HEROIC Games
                        </span>
                    </h3>
                    <p style="font-size: 0.78rem; color: var(--text-tertiary); margin: 2px 0 0;">
                        5 permainan berbasis psikologi positif
                    </p>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.7rem; color: var(--text-tertiary);">Streak</div>
                    <div style="font-size: 1.2rem; font-weight: 800; color: #F59E0B;">
                        🔥 ${this.playerStats.heroicGamesStreak}
                    </div>
                </div>
            </div>

            <!-- Games Grid -->
            <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px;">
                ${this.GAMES.map(game => this._renderGameCard(game)).join('')}
            </div>

            <!-- XAI Info -->
            <div style="background: #F5F3FF; border-radius: 14px; padding: 14px; margin-bottom: 24px;">
                <div style="font-size: 0.78rem; font-weight: 600; color: #8B5CF6; margin-bottom: 6px;">
                    <i class="fas fa-brain"></i> Bagaimana XAI memilih game untuk Anda?
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); line-height: 1.6;">
                    Sistem XAI menganalisis skor HEROIC Anda dan kondisi sensor real-time untuk merekomendasikan
                    game yang paling berdampak saat ini. Setiap game menargetkan 2 dimensi HEROIC secara bersamaan
                    untuk efisiensi maksimal (Nahum-Shani et al., 2018).
                    ${typeof HeroicXAI !== 'undefined'
                        ? `<br>Dimensi terlemah Anda saat ini: <strong>${HeroicXAI.DIMENSIONS[HeroicXAI.getWeakestDimension()].label}</strong>`
                        : ''}
                </div>
            </div>
        </div>`;
    },

    _renderGameCard(game) {
        const isRecommended = typeof HeroicXAI !== 'undefined' &&
            game.dims.includes(HeroicXAI.getWeakestDimension());

        return `
        <div style="background: white; border-radius: 20px; overflow: hidden;
                    box-shadow: 0 2px 12px rgba(0,0,0,0.06); border: 2px solid ${isRecommended ? '#8B5CF6' : 'transparent'};
                    cursor: pointer; transition: transform 0.2s;"
             onclick="HeroicGames.openGame('${game.id}')"
             onmouseenter="this.style.transform='translateY(-2px)'"
             onmouseleave="this.style.transform='translateY(0)'">

            <!-- Gradient header -->
            <div style="background: ${game.gradient}; padding: 16px 20px; display: flex; align-items: center; gap: 14px;">
                <div style="width: 48px; height: 48px; background: ${game.bgGradient};
                            border-radius: 14px; display: flex; align-items: center; justify-content: center;
                            box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                    <i class="fas ${game.icon}" style="font-size: 1.3rem; color: white;"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 0.95rem; font-weight: 700; color: #1F2937;">
                        ${game.title}
                        ${isRecommended ? '<span style="font-size:0.65rem;background:#8B5CF6;color:white;padding:1px 6px;border-radius:10px;margin-left:6px;vertical-align:middle;">⭐ Untuk Anda</span>' : ''}
                    </div>
                    <div style="font-size: 0.78rem; color: #6B7280;">${game.subtitle}</div>
                </div>
                <div style="font-size: 0.7rem; color: #6B7280; text-align: right;">
                    <div>${game.duration}</div>
                    <div style="margin-top:2px;">${game.difficulty}</div>
                </div>
            </div>

            <!-- Body -->
            <div style="padding: 12px 20px 16px;">
                <p style="font-size: 0.83rem; color: var(--text-secondary); line-height: 1.5; margin: 0 0 10px;">${game.description}</p>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; gap: 6px;">
                        ${game.dims.map((d, i) => `
                        <span style="background: ${game.dimColors[i]}20; color: ${game.dimColors[i]};
                                     padding: 3px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700;">
                            ${typeof HeroicXAI !== 'undefined' ? HeroicXAI.DIMENSIONS[d].label : d}
                        </span>`).join('')}
                    </div>
                    <button style="background: ${game.bgGradient}; color: white; border: none;
                                   padding: 8px 20px; border-radius: 20px; font-size: 0.82rem; font-weight: 600;
                                   cursor: pointer; box-shadow: 0 3px 8px rgba(0,0,0,0.15);">
                        Mainkan <i class="fas fa-play"></i>
                    </button>
                </div>
            </div>
        </div>`;
    },

    // ─── Game Launch ─────────────────────────────────────────────────────────
    openGame(gameId) {
        const game = this.GAMES.find(g => g.id === gameId);
        if (!game) return;

        switch (gameId) {
            case 'game_reframing':   this._launchReframingQuest(game);  break;
            case 'game_gratitude':   this._launchGratitudeHarvest(game); break;
            case 'game_compassion':  this._launchCompassionChain(game);  break;
            case 'game_blueprint':   this._launchOptimismBlueprint(game); break;
            case 'game_social':      this._launchSocialChallenge(game);  break;
        }
    },

    // ─── GAME 1: Cognitive Reframing Quest ────────────────────────────────────
    _launchReframingQuest(game) {
        // 5-step Socratic questioning (Beck, 1979)
        const sensorPre = this._getSensor();
        const steps = [
            { q: 'Apa pikiran negatif yang muncul?', placeholder: 'Contoh: "Saya selalu gagal"', key: 'nat' },
            { q: 'Apa bukti NYATA yang mendukung pikiran ini?', placeholder: 'Fakta konkret, bukan perasaan...', key: 'evidence_for' },
            { q: 'Apa bukti NYATA yang MENENTANG pikiran ini?', placeholder: 'Saat kapan itu tidak terjadi?...', key: 'evidence_against' },
            { q: 'Jika sahabatmu berpikir demikian, apa yang akan kamu katakan?', placeholder: 'Kata-kata hangat untuk sahabat...', key: 'friend_response' },
            { q: 'Tulis pikiran ALTERNATIF yang lebih seimbang dan realistis:', placeholder: 'Pikiran baru: "Meskipun kadang sulit, saya juga pernah berhasil..."', key: 'reframe' }
        ];

        let currentStep = 0;
        const answers = {};
        let points = 0;

        const modal = this._createGameModal(game, `
            <div id="reframingContent">
                <div id="reframingProgress" style="margin-bottom: 16px;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.78rem;
                                color: var(--text-tertiary); margin-bottom: 6px;">
                        <span>Langkah <span id="reframingStep">1</span>/5</span>
                        <span id="reframingPoints" style="color: #F59E0B;">⭐ 0 poin</span>
                    </div>
                    <div style="height: 6px; background: #F3F4F6; border-radius: 3px; overflow: hidden;">
                        <div id="reframingBar" style="width: 20%; height: 100%;
                             background: linear-gradient(90deg, #F59E0B, #8B5CF6); border-radius: 3px;
                             transition: width 0.4s;"></div>
                    </div>
                </div>

                <div id="reframingQuestionBox" style="background: #FEF3C7; border-radius: 12px;
                     padding: 14px; margin-bottom: 14px; border-left: 4px solid #F59E0B;">
                    <div style="font-size: 0.82rem; font-weight: 600; color: #92400E;">
                        Pertanyaan 1/5:
                    </div>
                    <div id="reframingQuestion" style="font-size: 0.92rem; font-weight: 700;
                         color: #78350F; margin-top: 4px;">${steps[0].q}</div>
                </div>

                <textarea id="reframingAnswer" placeholder="${steps[0].placeholder}"
                    style="width: 100%; padding: 12px; border: 1.5px solid #F59E0B; border-radius: 12px;
                           font-size: 0.88rem; min-height: 80px; resize: none; font-family: inherit;
                           box-sizing: border-box; outline: none;"></textarea>

                <div style="display: flex; gap: 10px; margin-top: 14px;">
                    <button id="reframingNextBtn" onclick="HeroicGames._reframingNext()"
                            style="flex: 1; padding: 14px; background: linear-gradient(135deg, #F59E0B, #8B5CF6);
                                   color: white; border: none; border-radius: 16px; font-size: 0.95rem;
                                   font-weight: 700; cursor: pointer;">
                        Lanjut <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        `);

        // Expose state for button handler
        HeroicGames._reframingState = { steps, currentStep, answers, points, game, sensorPre };

        document.body.appendChild(modal);
    },

    _reframingNext() {
        const state = HeroicGames._reframingState;
        const answer = document.getElementById('reframingAnswer')?.value?.trim();
        if (!answer) {
            Utils.showToast('Tulis jawabanmu dulu ya!', 'error');
            return;
        }

        const step = state.steps[state.currentStep];
        state.answers[step.key] = answer;

        // Award points for non-trivial answers (> 20 chars)
        const earnedPoints = answer.length > 20 ? 20 : 10;
        state.points += earnedPoints;
        Utils.showToast(`+${earnedPoints} Clarity Coins! 💰`, 'info', 1500);

        state.currentStep++;

        if (state.currentStep >= state.steps.length) {
            // Game complete
            this._completeReframingQuest(state);
            return;
        }

        // Update UI
        const nextStep = state.steps[state.currentStep];
        document.getElementById('reframingStep').textContent = state.currentStep + 1;
        document.getElementById('reframingPoints').textContent = `⭐ ${state.points} poin`;
        document.getElementById('reframingBar').style.width = `${((state.currentStep + 1) / 5) * 100}%`;
        document.getElementById('reframingQuestion').textContent = nextStep.q;
        document.getElementById('reframingAnswer').value = '';
        document.getElementById('reframingAnswer').placeholder = nextStep.placeholder;

        const box = document.getElementById('reframingQuestionBox');
        if (box) box.querySelector('.fas.fa-bolt, div:first-child').textContent = `Pertanyaan ${state.currentStep + 1}/5:`;
        if (box) box.querySelector('#reframingQuestion').parentElement.querySelector('div').textContent = `Pertanyaan ${state.currentStep + 1}/5:`;
    },

    async _completeReframingQuest(state) {
        const sensorPost = this._getSensor();
        this._closeGameModal();

        // Award scores
        state.points += 50; // bonus for completion
        this.playerStats.reframingPoints += state.points;
        await this._saveStats();

        if (typeof HeroicXAI !== 'undefined') {
            HeroicXAI.applyActivityGain('H', 'Cognitive Reframing Quest', 8, state.sensorPre, sensorPost);
            HeroicXAI.applyActivityGain('O', 'Cognitive Reframing Quest', 8, state.sensorPre, sensorPost);
        }

        await this._logGameToFirestore('game_reframing', state.answers, state.points, state.sensorPre, sensorPost);

        Utils.showToast(`🎉 Quest selesai! +${state.points} Clarity Coins! Pikiran lebih jernih!`, 'success', 4000);

        // Gemini analysis of reframe
        this._analyzeGameWithGemini('Reframing', state.answers.reframe || '', 'O');
    },

    // ─── GAME 2: Gratitude Harvest ────────────────────────────────────────────
    _launchGratitudeHarvest(game) {
        const sensorPre = this._getSensor();
        let harvested = [];
        let timeLeft = 180; // 3 minutes
        let timerInterval = null;

        const modal = this._createGameModal(game, `
            <div id="harvestContent">
                <!-- Garden visualization -->
                <div style="background: linear-gradient(180deg, #86EFAC, #4ADE80); border-radius: 16px;
                             padding: 20px; text-align: center; margin-bottom: 16px; min-height: 120px;
                             position: relative; overflow: hidden;">
                    <div style="font-size: 0.8rem; color: #14532D; font-weight: 600; margin-bottom: 8px;">
                        Kebun Syukurmu
                    </div>
                    <div id="harvestGarden" style="display: flex; justify-content: center; gap: 12px;
                         flex-wrap: wrap; min-height: 60px; align-items: center;">
                        <span style="color: #166534; font-size: 0.85rem;">Tanam benih syukur pertamamu...</span>
                    </div>
                </div>

                <!-- Timer -->
                <div style="text-align: center; margin-bottom: 14px;">
                    <div id="harvestTimer" style="font-size: 1.5rem; font-weight: 800; color: #8B5CF6;">3:00</div>
                    <div style="font-size: 0.72rem; color: var(--text-tertiary);">Waktu tersisa</div>
                </div>

                <!-- Input -->
                <div style="display: flex; gap: 8px; margin-bottom: 14px;">
                    <input id="harvestInput" type="text" placeholder="Satu hal yang kusyukuri hari ini..."
                           style="flex: 1; padding: 12px; border: 1.5px solid #10B981; border-radius: 12px;
                                  font-size: 0.88rem; font-family: inherit; outline: none;"
                           onkeypress="if(event.key==='Enter') HeroicGames._harvestPlant()">
                    <button onclick="HeroicGames._harvestPlant()"
                            style="background: linear-gradient(135deg, #8B5CF6, #10B981); color: white;
                                   border: none; padding: 12px 16px; border-radius: 12px; cursor: pointer;">
                        <i class="fas fa-seedling"></i>
                    </button>
                </div>

                <!-- Count -->
                <div style="text-align: center; color: var(--text-tertiary); font-size: 0.82rem;">
                    <span id="harvestCount">0</span>/10 benih ditanam
                    <span style="margin-left: 8px;">⭐ <span id="harvestPoints">0</span> Harvest Points</span>
                </div>

                <button onclick="HeroicGames._completeHarvest()"
                        style="width: 100%; margin-top: 14px; padding: 14px;
                               background: linear-gradient(135deg, #8B5CF6, #10B981); color: white;
                               border: none; border-radius: 16px; font-size: 0.95rem; font-weight: 700; cursor: pointer;">
                    Selesai Panen 🌾
                </button>
            </div>
        `);

        const emojis = ['🌱','🌿','🍀','🌸','🌻','🌺','💐','🍎','🍊','🍋','🍇','⭐','✨','💛','💚'];

        HeroicGames._harvestState = {
            harvested, sensorPre, game, points: 0, emojis,
            timer: setInterval(() => {
                timeLeft--;
                const m = Math.floor(timeLeft / 60);
                const s = timeLeft % 60;
                const el = document.getElementById('harvestTimer');
                if (el) el.textContent = `${m}:${s.toString().padStart(2, '0')}`;
                if (timeLeft <= 0) {
                    clearInterval(HeroicGames._harvestState.timer);
                    HeroicGames._completeHarvest();
                }
            }, 1000)
        };

        document.body.appendChild(modal);
    },

    _harvestPlant() {
        const state = HeroicGames._harvestState;
        const input = document.getElementById('harvestInput');
        const text = input?.value?.trim();
        if (!text) return;

        state.harvested.push(text);
        state.points += Math.min(10 + text.length, 25);

        // Update garden
        const garden = document.getElementById('harvestGarden');
        if (garden) {
            const emoji = state.emojis[Math.floor(Math.random() * state.emojis.length)];
            const seed = document.createElement('div');
            seed.title = text;
            seed.style.cssText = 'font-size: 1.8rem; cursor: pointer; transition: transform 0.2s;';
            seed.textContent = emoji;
            seed.onmouseenter = () => seed.style.transform = 'scale(1.3)';
            seed.onmouseleave = () => seed.style.transform = 'scale(1)';
            if (garden.querySelector('span')) garden.innerHTML = '';
            garden.appendChild(seed);
        }

        document.getElementById('harvestCount').textContent = state.harvested.length;
        document.getElementById('harvestPoints').textContent = state.points;
        input.value = '';
        input.focus();

        Utils.showToast(`+${Math.min(10 + text.length, 25)} pts! 🌱`, 'info', 1200);
    },

    async _completeHarvest() {
        const state = HeroicGames._harvestState;
        if (state.timer) clearInterval(state.timer);

        const sensorPost = this._getSensor();
        this._closeGameModal();

        state.points += state.harvested.length >= 5 ? 50 : 20;
        this.playerStats.gratitudePoints += state.points;
        this._updateStreak();
        await this._saveStats();

        if (typeof HeroicXAI !== 'undefined') {
            HeroicXAI.applyActivityGain('O', 'Gratitude Harvest', 5, state.sensorPre, sensorPost);
            HeroicXAI.applyActivityGain('R', 'Gratitude Harvest', 5, state.sensorPre, sensorPost);
        }

        await this._logGameToFirestore('game_gratitude', { harvested: state.harvested }, state.points, state.sensorPre, sensorPost);
        Utils.showToast(`🌾 Panen ${state.harvested.length} buah syukur! +${state.points} pts!`, 'success', 4000);
    },

    // ─── GAME 3: Compassion Chain ─────────────────────────────────────────────
    _launchCompassionChain(game) {
        const sensorPre = this._getSensor();
        const prompts = [
            { label: 'Kenali Penderitaan', placeholder: 'Ini adalah momen yang...', dim: 'mindfulness' },
            { label: 'Manusia Bersama', placeholder: 'Banyak orang juga merasakan...', dim: 'humanity' },
            { label: 'Kebaikan Diri', placeholder: 'Semoga aku...', dim: 'kindness' },
            { label: 'Kata Penyemangat', placeholder: 'Aku ingin mengingatkan diriku...', dim: 'affirmation' },
            { label: 'Komitmen Kasih', placeholder: 'Mulai hari ini, aku berjanji...', dim: 'commitment' }
        ];

        let chain = [];
        let currentLink = 0;

        const modal = this._createGameModal(game, `
            <div>
                <!-- Chain visualization -->
                <div style="display: flex; align-items: center; justify-content: center;
                             gap: 4px; margin-bottom: 16px; flex-wrap: wrap;" id="compassionChainViz">
                    ${prompts.map((_, i) => `
                        <div id="chain_link_${i}" style="width: 36px; height: 36px; border-radius: 50%;
                             background: ${i === 0 ? '#FECACA' : '#F3F4F6'};
                             display: flex; align-items: center; justify-content: center;
                             font-size: 0.8rem; font-weight: 700; color: ${i === 0 ? '#EF4444' : '#9CA3AF'};
                             transition: all 0.4s;">${i + 1}</div>
                        ${i < 4 ? '<div style="width:20px;height:2px;background:#E5E7EB;border-radius:1px;"></div>' : ''}
                    `).join('')}
                </div>

                <!-- Current prompt -->
                <div style="background: linear-gradient(135deg, #FECACA, #FBCFE8); border-radius: 14px;
                             padding: 16px; margin-bottom: 14px;">
                    <div id="chainLabel" style="font-size: 0.78rem; font-weight: 700; color: #9F1239;">
                        Link ${currentLink + 1}: ${prompts[0].label}
                    </div>
                    <div style="font-size: 0.82rem; color: #BE185D; margin-top: 4px;">
                        ${currentLink === 0 ? '"Ini adalah momen yang sulit / menyakitkan / tidak nyaman bagi saya..."' : ''}
                    </div>
                </div>

                <textarea id="chainInput" placeholder="${prompts[0].placeholder}"
                    style="width: 100%; padding: 12px; border: 1.5px solid #EF4444; border-radius: 12px;
                           font-size: 0.88rem; min-height: 80px; resize: none; font-family: inherit;
                           box-sizing: border-box; outline: none;"></textarea>

                <div id="chainFeedback" style="min-height: 32px; margin-top: 8px;"></div>

                <button onclick="HeroicGames._addChainLink()"
                        style="width: 100%; margin-top: 12px; padding: 14px;
                               background: linear-gradient(135deg, #EF4444, #EC4899); color: white;
                               border: none; border-radius: 16px; font-size: 0.95rem; font-weight: 700; cursor: pointer;">
                    <i class="fas fa-link"></i> Tambah Link
                </button>
            </div>
        `);

        HeroicGames._chainState = { chain, currentLink, prompts, game, sensorPre, points: 0 };
        document.body.appendChild(modal);
    },

    _addChainLink() {
        const state = HeroicGames._chainState;
        const input = document.getElementById('chainInput');
        const text = input?.value?.trim();
        if (!text) { Utils.showToast('Tulis dulu ya!', 'error'); return; }

        state.chain.push({ dim: state.prompts[state.currentLink].dim, text });
        state.points += 20;

        // Update chain viz
        const linkEl = document.getElementById(`chain_link_${state.currentLink}`);
        if (linkEl) {
            linkEl.style.background = 'linear-gradient(135deg, #EF4444, #EC4899)';
            linkEl.style.color = 'white';
            linkEl.textContent = '✓';
        }

        state.currentLink++;

        if (state.currentLink >= state.prompts.length) {
            this._completeCompassionChain(state);
            return;
        }

        // Update UI
        const label = document.getElementById('chainLabel');
        if (label) label.textContent = `Link ${state.currentLink + 1}: ${state.prompts[state.currentLink].label}`;
        input.value = '';
        input.placeholder = state.prompts[state.currentLink].placeholder;

        const feedback = document.getElementById('chainFeedback');
        if (feedback) {
            feedback.innerHTML = `<div style="font-size:0.78rem;color:#10B981;">✓ +20 pts — Link ditambahkan! ❤️</div>`;
        }
    },

    async _completeCompassionChain(state) {
        const sensorPost = this._getSensor();
        this._closeGameModal();

        state.points += 60;
        this.playerStats.compassionChain = (this.playerStats.compassionChain || 0) + 1;
        await this._saveStats();

        if (typeof HeroicXAI !== 'undefined') {
            HeroicXAI.applyActivityGain('C', 'Compassion Chain', 8, state.sensorPre, sensorPost);
            HeroicXAI.applyActivityGain('I', 'Compassion Chain', 8, state.sensorPre, sensorPost);
        }

        await this._logGameToFirestore('game_compassion', { chain: state.chain }, state.points, state.sensorPre, sensorPost);
        Utils.showToast(`💙 Rantai kasih selesai! Rantai ke-${this.playerStats.compassionChain}! +${state.points} pts!`, 'success', 4000);
    },

    // ─── GAME 4: Optimism Blueprint ────────────────────────────────────────────
    _launchOptimismBlueprint(game) {
        const sensorPre = this._getSensor();
        const rooms = [
            { name: 'Fondasi', icon: '🏗️', q: 'Nilai & kekuatan apa yang menjadi fondasi hidupmu?', key: 'foundation' },
            { name: 'Ruang Tamu', icon: '🛋️', q: 'Bagaimana kehidupan sosialmu yang ideal dalam 3 tahun?', key: 'social' },
            { name: 'Kamar', icon: '🛏️', q: 'Bagaimana kesehatan mental & fisikmu yang ideal?', key: 'health' },
            { name: 'Dapur', icon: '🍳', q: 'Apa "bahan-bahan" yang akan kamu kembangkan (skill, kebiasaan)?', key: 'growth' },
            { name: 'Atap', icon: '🏠', q: 'Apa pencapaian terbesar yang ingin dicapai? Gambarkan vivid!', key: 'achievement' }
        ];

        let builtRooms = [];
        let currentRoom = 0;

        const modal = this._createGameModal(game, `
            <div>
                <!-- House progress viz -->
                <div style="text-align: center; margin-bottom: 16px; font-size: 2.5rem;" id="houseParts">
                    ${rooms.map((r, i) => `<span id="house_${i}" style="opacity:0.3;transition:all 0.5s;">${r.icon}</span>`).join(' ')}
                </div>

                <div style="background: linear-gradient(135deg, #DDD6FE, #BFDBFE); border-radius: 14px;
                             padding: 16px; margin-bottom: 14px;">
                    <div id="blueprintRoomName" style="font-size: 0.78rem; font-weight: 700; color: #4338CA;">
                        Ruang ${currentRoom + 1}/5: ${rooms[0].name}
                    </div>
                    <div id="blueprintQuestion" style="font-size: 0.9rem; font-weight: 700;
                         color: #3730A3; margin-top: 6px;">${rooms[0].q}</div>
                </div>

                <textarea id="blueprintAnswer" placeholder="Gambarkan dengan spesifik dan positif..."
                    style="width: 100%; padding: 12px; border: 1.5px solid #8B5CF6; border-radius: 12px;
                           font-size: 0.88rem; min-height: 80px; resize: none; font-family: inherit;
                           box-sizing: border-box; outline: none;"></textarea>

                <div style="display: flex; justify-content: space-between; margin-top: 12px; align-items: center;">
                    <span id="blueprintXP" style="font-size: 0.82rem; color: #8B5CF6; font-weight: 600;">0 Blueprint XP</span>
                    <button onclick="HeroicGames._buildBlueprintRoom()"
                            style="background: linear-gradient(135deg, #8B5CF6, #3B82F6); color: white;
                                   border: none; padding: 12px 24px; border-radius: 16px;
                                   font-size: 0.9rem; font-weight: 700; cursor: pointer;">
                        Bangun <i class="fas fa-hammer"></i>
                    </button>
                </div>
            </div>
        `);

        HeroicGames._blueprintState = { rooms, builtRooms, currentRoom, game, sensorPre, points: 0 };
        document.body.appendChild(modal);
    },

    _buildBlueprintRoom() {
        const state = HeroicGames._blueprintState;
        const answer = document.getElementById('blueprintAnswer')?.value?.trim();
        if (!answer) { Utils.showToast('Gambarkan dulu!', 'error'); return; }

        state.builtRooms.push({ room: state.rooms[state.currentRoom].name, text: answer });
        const roomPts = Math.min(15 + answer.length / 5, 40);
        state.points += Math.round(roomPts);

        // Illuminate house part
        const houseEl = document.getElementById(`house_${state.currentRoom}`);
        if (houseEl) houseEl.style.opacity = '1';

        state.currentRoom++;
        document.getElementById('blueprintXP').textContent = `${state.points} Blueprint XP`;

        if (state.currentRoom >= state.rooms.length) {
            this._completeBlueprintGame(state);
            return;
        }

        // Update
        document.getElementById('blueprintRoomName').textContent = `Ruang ${state.currentRoom + 1}/5: ${state.rooms[state.currentRoom].name}`;
        document.getElementById('blueprintQuestion').textContent = state.rooms[state.currentRoom].q;
        document.getElementById('blueprintAnswer').value = '';

        Utils.showToast(`🏗️ ${state.rooms[state.currentRoom - 1].name} dibangun! +${Math.round(roomPts)} XP`, 'info', 1500);
    },

    async _completeBlueprintGame(state) {
        const sensorPost = this._getSensor();
        this._closeGameModal();
        state.points += 80;
        this.playerStats.blueprintBuilt = (this.playerStats.blueprintBuilt || 0) + 1;
        await this._saveStats();

        if (typeof HeroicXAI !== 'undefined') {
            HeroicXAI.applyActivityGain('O', 'Optimism Blueprint', 12, state.sensorPre, sensorPost);
            HeroicXAI.applyActivityGain('E', 'Optimism Blueprint', 12, state.sensorPre, sensorPost);
        }

        await this._logGameToFirestore('game_blueprint', { rooms: state.builtRooms }, state.points, state.sensorPre, sensorPost);
        Utils.showToast(`🏠 Rumah Optimisme ke-${this.playerStats.blueprintBuilt} selesai dibangun! +${state.points} XP!`, 'success', 4000);
        this._analyzeGameWithGemini('Blueprint', state.builtRooms.map(r => r.text).join(' '), 'O');
    },

    // ─── GAME 5: Social Connection Challenge ─────────────────────────────────
    _launchSocialChallenge(game) {
        const sensorPre = this._getSensor();
        const challenges = [
            { level: 'Mikro', icon: '😊', text: 'Tersenyum dan sapa seseorang yang belum kamu kenal hari ini', points: 15, dim: 'I' },
            { level: 'Kecil', icon: '💌', text: 'Kirim pesan apresiasi kepada satu orang yang berarti', points: 25, dim: 'I' },
            { level: 'Kecil', icon: '🙏', text: 'Ucapkan terima kasih yang tulus kepada seseorang hari ini (spesifik)', points: 25, dim: 'C' },
            { level: 'Menengah', icon: '🎧', text: 'Dengarkan seseorang berbicara 5 menit penuh tanpa menyela', points: 35, dim: 'I' },
            { level: 'Menengah', icon: '🤝', text: 'Tawarkan bantuan konkret kepada seseorang tanpa diminta', points: 40, dim: 'I' },
            { level: 'Berani', icon: '📞', text: 'Hubungi seseorang yang sudah lama tidak dihubungi', points: 50, dim: 'I' },
            { level: 'Berani', icon: '✍️', text: 'Tulis dan kirimkan surat apresiasi 3 paragraf kepada seseorang penting', points: 60, dim: 'C' }
        ];

        const today = new Date().toDateString();
        const todayKey = `heroic_social_${today}`;
        let completedToday = [];
        try { completedToday = JSON.parse(localStorage.getItem(todayKey) || '[]'); } catch (e) {}

        const modal = this._createGameModal(game, `
            <div>
                <div style="font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.5;">
                    Pilih tantangan koneksi yang akan kamu selesaikan hari ini.
                    Lakukan, lalu kembali dan klik "Tandai Selesai".
                </div>

                <div style="display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto;">
                    ${challenges.map((c, i) => {
                        const done = completedToday.includes(i);
                        return `
                        <div style="background: ${done ? '#D1FAE5' : 'white'}; border-radius: 14px;
                                    padding: 14px; border: 1.5px solid ${done ? '#10B981' : 'var(--border-color)'};">
                            <div style="display: flex; align-items: flex-start; gap: 10px;">
                                <span style="font-size: 1.5rem;">${c.icon}</span>
                                <div style="flex: 1;">
                                    <div style="display: flex; gap: 6px; margin-bottom: 4px;">
                                        <span style="font-size: 0.7rem; font-weight: 700; padding: 1px 8px;
                                                     border-radius: 20px; background: ${done ? '#10B981' : '#F3F4F6'};
                                                     color: ${done ? 'white' : '#6B7280'};">${c.level}</span>
                                        <span style="font-size: 0.7rem; color: #F59E0B;">+${c.points} pts</span>
                                    </div>
                                    <div style="font-size: 0.85rem; color: var(--text-primary); line-height: 1.4;">${c.text}</div>
                                </div>
                                ${done
                                    ? '<i class="fas fa-check-circle" style="color:#10B981;font-size:1.3rem;flex-shrink:0;"></i>'
                                    : `<button onclick="HeroicGames._completeSocialChallenge(${i}, ${c.points}, '${c.dim}')"
                                              style="flex-shrink:0;background:linear-gradient(135deg,#EC4899,#EF4444);
                                                     color:white;border:none;padding:6px 14px;border-radius:12px;
                                                     font-size:0.75rem;font-weight:600;cursor:pointer;white-space:nowrap;">
                                          Selesai ✓
                                       </button>`}
                            </div>
                        </div>`;
                    }).join('')}
                </div>

                <div style="text-align: center; margin-top: 14px; font-size: 0.82rem; color: var(--text-tertiary);">
                    ${completedToday.length} tantangan diselesaikan hari ini
                </div>
            </div>
        `);

        HeroicGames._socialState = { challenges, completedToday, sensorPre, game, todayKey };
        document.body.appendChild(modal);
    },

    async _completeSocialChallenge(idx, points, dim) {
        const state = HeroicGames._socialState;
        if (!state.completedToday.includes(idx)) {
            state.completedToday.push(idx);
            try { localStorage.setItem(state.todayKey, JSON.stringify(state.completedToday)); } catch (e) {}

            this.playerStats.connectionsChallenged = (this.playerStats.connectionsChallenged || 0) + 1;
            await this._saveStats();

            if (typeof HeroicXAI !== 'undefined') {
                HeroicXAI.applyActivityGain(dim, 'Social Connection Challenge', 5, state.sensorPre, null);
            }

            await this._logGameToFirestore('game_social_' + idx, {
                challenge: state.challenges[idx].text, points
            }, points, state.sensorPre, this._getSensor());

            Utils.showToast(`✅ Tantangan selesai! +${points} Social XP! 🤝`, 'success', 3000);

            // Refresh modal
            this._closeGameModal();
            setTimeout(() => this._launchSocialChallenge(state.game), 100);
        }
    },

    // ─── Game Modal Helper ────────────────────────────────────────────────────
    _createGameModal(game, contentHTML) {
        const modal = document.createElement('div');
        modal.className = 'heroic-activity-modal';
        modal.id = 'heroicGameModal';
        modal.innerHTML = `
        <div class="heroic-activity-sheet">
            <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 20px;">
                <div style="width: 48px; height: 48px; background: ${game.bgGradient};
                            border-radius: 14px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas ${game.icon}" style="color: white; font-size: 1.3rem;"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 1.05rem; font-weight: 800; color: var(--text-primary);">${game.title}</div>
                    <div style="font-size: 0.78rem; color: var(--text-tertiary);">${game.subtitle}</div>
                </div>
                <button onclick="HeroicGames._closeGameModal()"
                        style="background:none;border:none;font-size:1.3rem;color:var(--text-tertiary);cursor:pointer;">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- XAI Panel -->
            <details style="margin-bottom: 14px;">
                <summary style="font-size: 0.78rem; font-weight: 600; color: #8B5CF6; cursor: pointer; list-style: none;">
                    <i class="fas fa-brain"></i> Kenapa game ini direkomendasikan? (XAI)
                </summary>
                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 6px; padding: 10px;
                            background: #F5F3FF; border-radius: 10px; line-height: 1.6;">
                    ${game.xaiReason}<br><br>
                    <strong>📚 Referensi:</strong> ${game.reference}
                    ${typeof HeroicXAI !== 'undefined' ? `<br><strong>Dimensi target:</strong> ${game.dims.map(d => HeroicXAI.DIMENSIONS[d].label).join(' + ')}` : ''}
                </div>
            </details>

            ${contentHTML}
        </div>`;
        return modal;
    },

    _closeGameModal() {
        const modal = document.getElementById('heroicGameModal');
        if (modal) {
            modal.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => modal.remove(), 300);
        }
    },

    // ─── Utilities ────────────────────────────────────────────────────────────
    _getSensor() {
        if (typeof App !== 'undefined' && App.getInterventionState) {
            const s = App.getInterventionState();
            return s.hr > 0 ? { stress: s.stress, hr: s.hr, gsr: s.gsr, spo2: s.spo2 } : null;
        }
        return null;
    },

    _updateStreak() {
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        if (this.playerStats.lastPlayDate === yesterday) {
            this.playerStats.heroicGamesStreak = (this.playerStats.heroicGamesStreak || 0) + 1;
        } else if (this.playerStats.lastPlayDate !== today) {
            this.playerStats.heroicGamesStreak = 1;
        }
        this.playerStats.lastPlayDate = today;
    },

    async _analyzeGameWithGemini(gameName, text, dimension) {
        const apiKey = typeof CONFIG !== 'undefined' ? CONFIG.GEMINI_API_KEY : null;
        if (!apiKey || !text) return;
        try {
            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: `Berikan 1 kalimat insight psikologis singkat dan hangat dalam Bahasa Indonesia untuk pengguna yang baru menyelesaikan game "${gameName}" dengan refleksi: "${text.substring(0, 200)}". Respons langsung tanpa penjelasan tambahan.`
                            }]
                        }]
                    })
                }
            );
            if (!res.ok) return;
            const data = await res.json();
            const insight = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (insight) setTimeout(() => Utils.showToast(`💬 ${insight}`, 'info', 6000), 2000);
        } catch (e) {}
    },

    async _logGameToFirestore(gameId, data, points, sensorPre, sensorPost) {
        try {
            const user = typeof auth !== 'undefined' && auth?.currentUser;
            if (user && typeof db !== 'undefined') {
                await db.collection('heroicActivities').add({
                    userId: user.uid,
                    activityId: gameId,
                    activityType: 'game',
                    data,
                    points,
                    sensorPre: sensorPre || null,
                    sensorPost: sensorPost || null,
                    heroicScores: typeof HeroicXAI !== 'undefined' ? { ...HeroicXAI.scores } : null,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (e) { console.warn('[HeroicGames] Firestore log failed:', e); }
    },

    async _saveStats() {
        try {
            localStorage.setItem('heroic_game_stats', JSON.stringify(this.playerStats));
            const user = typeof auth !== 'undefined' && auth?.currentUser;
            if (user && typeof db !== 'undefined') {
                await db.collection('users').doc(user.uid)
                    .collection('game_stats').doc('heroic').set(this.playerStats, { merge: true });
            }
        } catch (e) {}
    },

    async _loadStats() {
        try {
            const saved = localStorage.getItem('heroic_game_stats');
            if (saved) this.playerStats = { ...this.playerStats, ...JSON.parse(saved) };
        } catch (e) {}
    }
};

window.HeroicGames = HeroicGames;
