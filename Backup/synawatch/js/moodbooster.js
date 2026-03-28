/**
 * SYNAWATCH - Mood Booster Module v2.0
 * [GAP 3] Biofeedback-Driven Music Therapy
 * Based on: Nayak et al. 2025, Leubner & Hinterberger 2020, de Witte et al. 2025, Peng et al. 2024
 *
 * Dynamically selects music tempo/genre based on real-time GSR and stress levels:
 * - High GSR/Stress → Calm music (60-80 BPM) for down-regulation
 * - Moderate stress → Ambient/Nature sounds (80-100 BPM)
 * - Low stress/mood → Upbeat music (120+ BPM) for mood elevation
 */

const MoodBooster = {
    currentMood: null,
    currentCategory: null,
    audioContext: null,

    // Biofeedback-mapped music categories
    musicLibrary: {
        calm: {
            label: 'Relaksasi Mendalam',
            icon: 'fa-spa',
            color: '#6366f1',
            bpmRange: '60-80 BPM',
            description: 'Musik lambat untuk meredakan stres tinggi',
            tracks: [
                { name: 'Ocean Waves & Piano', genre: 'Ambient', bpm: 65, duration: '5:00', mood: 'Tenang' },
                { name: 'Rain on Leaves', genre: 'Nature', bpm: 60, duration: '4:30', mood: 'Damai' },
                { name: 'Tibetan Singing Bowls', genre: 'Meditative', bpm: 55, duration: '6:00', mood: 'Meditatif' },
                { name: 'Soft Guitar Lullaby', genre: 'Acoustic', bpm: 72, duration: '4:00', mood: 'Lembut' },
                { name: 'Deep Forest Ambience', genre: 'Nature', bpm: 50, duration: '7:00', mood: 'Grounding' }
            ]
        },
        ambient: {
            label: 'Keseimbangan',
            icon: 'fa-cloud-sun',
            color: '#10b981',
            bpmRange: '80-100 BPM',
            description: 'Musik moderat untuk menyeimbangkan emosi',
            tracks: [
                { name: 'Café Jazz Lo-fi', genre: 'Lo-fi', bpm: 85, duration: '5:00', mood: 'Rileks' },
                { name: 'Gentle Acoustic', genre: 'Folk', bpm: 90, duration: '4:00', mood: 'Hangat' },
                { name: 'Morning Coffee Beats', genre: 'Chillhop', bpm: 88, duration: '4:30', mood: 'Nyaman' },
                { name: 'Sunset Vibes', genre: 'Indie', bpm: 95, duration: '3:30', mood: 'Nostalgia' },
                { name: 'Rainy Day Reading', genre: 'Classical', bpm: 82, duration: '5:30', mood: 'Fokus' }
            ]
        },
        upbeat: {
            label: 'Mood Elevator',
            icon: 'fa-bolt',
            color: '#f59e0b',
            bpmRange: '120+ BPM',
            description: 'Musik energetik untuk mengangkat suasana hati',
            tracks: [
                { name: 'Feel Good Pop', genre: 'Pop', bpm: 125, duration: '3:30', mood: 'Ceria' },
                { name: 'Sunshine Funk', genre: 'Funk', bpm: 130, duration: '4:00', mood: 'Energi' },
                { name: 'Happy Dance Mix', genre: 'EDM', bpm: 128, duration: '5:00', mood: 'Semangat' },
                { name: 'African Drum Circle', genre: 'World', bpm: 120, duration: '4:30', mood: 'Vitalitas' },
                { name: 'Island Groove', genre: 'Reggae', bpm: 110, duration: '3:45', mood: 'Bahagia' }
            ]
        }
    },

    init() {
        console.log("MoodBooster v2.0 (Biofeedback) Initialized");
        this.renderBiofeedbackUI();
    },

    /**
     * Get current sensor state for biofeedback recommendation
     */
    getSensorState() {
        const state = (typeof App !== 'undefined' && App.getInterventionState) ? App.getInterventionState() : {};
        return {
            stress: state.stress || 0,
            gsr: state.gsr || 0,
            hr: state.hr || 0,
            hasSensor: (state.hr > 0 || state.stress > 0)
        };
    },

    /**
     * [GAP 3] Determine recommended music category based on biofeedback
     */
    getRecommendedCategory() {
        const sensor = this.getSensorState();

        if (!sensor.hasSensor) {
            return { category: null, reason: 'Hubungkan sensor untuk rekomendasi otomatis berbasis biofeedback.' };
        }

        if (sensor.stress > 65 || sensor.gsr > 70) {
            return {
                category: 'calm',
                reason: `Stres tinggi terdeteksi (${sensor.stress}%). Musik lambat 60-80 BPM direkomendasikan untuk menurunkan aktivasi simpatetik (Nayak et al., 2025).`
            };
        } else if (sensor.stress > 35 || sensor.gsr > 40) {
            return {
                category: 'ambient',
                reason: `Stres moderat (${sensor.stress}%). Musik ambient 80-100 BPM membantu menyeimbangkan sistem saraf otonom (de Witte et al., 2025).`
            };
        } else {
            return {
                category: 'upbeat',
                reason: `Kondisi rileks (stres ${sensor.stress}%). Musik upbeat 120+ BPM dapat meningkatkan mood positif dan energi (Leubner & Hinterberger, 2020).`
            };
        }
    },

    /**
     * Render the biofeedback-enhanced UI
     */
    renderBiofeedbackUI() {
        const container = document.getElementById('moodboosterContent');
        if (!container) return;

        const recommendation = this.getRecommendedCategory();
        const sensor = this.getSensorState();

        // Sensor status badge
        const sensorBadge = sensor.hasSensor
            ? `<span style="background:rgba(16,185,129,0.15);color:#10b981;padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:600;"><i class="fas fa-broadcast-tower"></i> Biofeedback Aktif</span>`
            : `<span style="background:rgba(156,163,175,0.15);color:#9ca3af;padding:4px 12px;border-radius:20px;font-size:0.75rem;font-weight:600;"><i class="fas fa-unlink"></i> Sensor Tidak Terhubung</span>`;

        // Biofeedback recommendation card
        const recCard = recommendation.category ? `
            <div style="background:linear-gradient(135deg, ${this.musicLibrary[recommendation.category].color}15, ${this.musicLibrary[recommendation.category].color}05);padding:16px;border-radius:16px;border:2px solid ${this.musicLibrary[recommendation.category].color}30;margin-bottom:20px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <i class="fas fa-brain" style="color:${this.musicLibrary[recommendation.category].color};"></i>
                    <span style="font-weight:700;color:var(--text-primary);font-size:0.95rem;">Rekomendasi Biofeedback</span>
                </div>
                <p style="font-size:0.85rem;color:var(--text-secondary);line-height:1.5;margin-bottom:12px;">${recommendation.reason}</p>
                <button onclick="MoodBooster.selectCategory('${recommendation.category}')" class="btn btn-primary btn-sm" style="background:${this.musicLibrary[recommendation.category].color};border-color:${this.musicLibrary[recommendation.category].color};">
                    <i class="fas ${this.musicLibrary[recommendation.category].icon}"></i> Putar ${this.musicLibrary[recommendation.category].label}
                </button>
            </div>
        ` : `
            <div style="background:#f8f9ff;padding:16px;border-radius:16px;margin-bottom:20px;text-align:center;">
                <i class="fas fa-bluetooth-b" style="font-size:1.5rem;color:var(--primary-300);margin-bottom:8px;"></i>
                <p style="font-size:0.85rem;color:var(--text-tertiary);">${recommendation.reason}</p>
            </div>
        `;

        // Mood check section
        const moodEmojis = [
            { emoji: '😢', label: 'Sedih', value: 1 },
            { emoji: '😟', label: 'Cemas', value: 2 },
            { emoji: '😐', label: 'Netral', value: 3 },
            { emoji: '😊', label: 'Baik', value: 4 },
            { emoji: '😄', label: 'Bahagia', value: 5 }
        ];

        let moodHtml = moodEmojis.map(m => `
            <button onclick="MoodBooster.setMood(${m.value})" class="mood-btn" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px;background:var(--bg-secondary);border:2px solid var(--border-color);border-radius:16px;cursor:pointer;transition:all 0.2s;flex:1;min-width:60px;">
                <span style="font-size:1.5rem;">${m.emoji}</span>
                <span style="font-size:0.7rem;color:var(--text-tertiary);font-weight:500;">${m.label}</span>
            </button>
        `).join('');

        // Music categories
        let categoriesHtml = '';
        for (const [key, cat] of Object.entries(this.musicLibrary)) {
            const isRecommended = key === recommendation.category;
            categoriesHtml += `
                <div onclick="MoodBooster.selectCategory('${key}')" style="background:white;padding:16px;border-radius:16px;border:2px solid ${isRecommended ? cat.color : 'var(--border-color)'};cursor:pointer;transition:all 0.2s;${isRecommended ? 'box-shadow:0 4px 16px ' + cat.color + '20;' : ''}" onmouseover="this.style.borderColor='${cat.color}'" onmouseout="this.style.borderColor='${isRecommended ? cat.color : 'var(--border-color)'}'">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div style="width:48px;height:48px;background:${cat.color}15;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas ${cat.icon}" style="color:${cat.color};font-size:1.25rem;"></i>
                        </div>
                        <div style="flex:1;">
                            <div style="font-weight:700;color:var(--text-primary);font-size:0.95rem;">${cat.label}</div>
                            <div style="font-size:0.8rem;color:var(--text-tertiary);">${cat.bpmRange} • ${cat.description}</div>
                        </div>
                        ${isRecommended ? '<span style="background:' + cat.color + ';color:white;padding:2px 8px;border-radius:8px;font-size:0.7rem;font-weight:600;">REKOMENDASI</span>' : ''}
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h2 style="font-size:1.25rem;font-weight:700;color:var(--text-primary);margin:0;"><i class="fas fa-music" style="color:#f59e0b;"></i> Mood Booster</h2>
                ${sensorBadge}
            </div>

            ${recCard}

            <div class="card" style="margin-bottom:16px;padding:16px;border-radius:16px;">
                <h4 style="margin-bottom:12px;color:var(--text-primary);font-size:0.95rem;">Bagaimana perasaan Anda sekarang?</h4>
                <div style="display:flex;gap:8px;">${moodHtml}</div>
            </div>

            <h4 style="margin-bottom:12px;color:var(--text-primary);font-size:0.95rem;">Terapi Musik</h4>
            <div style="display:grid;gap:12px;margin-bottom:16px;">${categoriesHtml}</div>

            <div id="trackList"></div>

            <div style="background:#f8f9ff;padding:12px;border-radius:12px;margin-top:16px;">
                <p style="font-size:0.75rem;color:var(--text-tertiary);text-align:center;margin:0;">
                    <i class="fas fa-flask"></i> Berbasis penelitian: Music Therapy for Depression (Leubner & Hinterberger, 2020),
                    Biofeedback-Driven Therapeutics (Nayak et al., 2025)
                </p>
            </div>
        `;
    },

    setMood(level) {
        this.currentMood = level;
        document.querySelectorAll('.mood-btn').forEach((btn, i) => {
            btn.style.borderColor = (i + 1) === level ? '#8B5CF6' : 'var(--border-color)';
            btn.style.background = (i + 1) === level ? 'rgba(139,92,246,0.08)' : 'var(--bg-secondary)';
        });

        // If mood is low (1-2) and no sensor, suggest calm music
        if (level <= 2) {
            this.selectCategory('calm');
        } else if (level === 3) {
            this.selectCategory('ambient');
        } else {
            this.selectCategory('upbeat');
        }

        // Log mood to Firestore
        this.logMood(level);
        Utils.showToast("Mood dicatat. Playlist disesuaikan!", "success");
    },

    /**
     * Select and display tracks for a category
     */
    selectCategory(categoryKey) {
        this.currentCategory = categoryKey;
        const cat = this.musicLibrary[categoryKey];
        const trackList = document.getElementById('trackList');
        if (!trackList) return;

        let tracksHtml = cat.tracks.map((track, i) => `
            <div onclick="MoodBooster.playTrack('${categoryKey}', ${i})" style="display:flex;align-items:center;gap:12px;padding:12px;background:white;border-radius:12px;border:1px solid var(--border-color);cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor='${cat.color}'" onmouseout="this.style.borderColor='var(--border-color)'">
                <div style="width:40px;height:40px;background:${cat.color}15;border-radius:10px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas fa-play" style="color:${cat.color};font-size:0.9rem;"></i>
                </div>
                <div style="flex:1;">
                    <div style="font-weight:600;color:var(--text-primary);font-size:0.9rem;">${track.name}</div>
                    <div style="font-size:0.75rem;color:var(--text-tertiary);">${track.genre} • ${track.bpm} BPM • ${track.duration}</div>
                </div>
                <span style="background:${cat.color}15;color:${cat.color};padding:2px 8px;border-radius:6px;font-size:0.7rem;font-weight:600;">${track.mood}</span>
            </div>
        `).join('');

        trackList.innerHTML = `
            <div style="margin-top:16px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                    <i class="fas ${cat.icon}" style="color:${cat.color};"></i>
                    <h4 style="margin:0;color:var(--text-primary);font-size:0.95rem;">${cat.label}</h4>
                    <span style="font-size:0.8rem;color:var(--text-tertiary);">(${cat.tracks.length} tracks)</span>
                </div>
                <div style="display:grid;gap:8px;">${tracksHtml}</div>
            </div>
        `;
    },

    playTrack(categoryKey, index) {
        const track = this.musicLibrary[categoryKey].tracks[index];
        Utils.showToast(`Memutar: ${track.name} (${track.bpm} BPM)`, "info");

        // Log therapy session
        this.logTherapySession(categoryKey, track);
    },

    async logMood(level) {
        const user = auth?.currentUser;
        if (!user || typeof db === 'undefined') return;
        try {
            await db.collection('moodLogs').add({
                userId: user.uid,
                mood: level,
                sensorState: this.getSensorState(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) { console.error('Mood log error:', e); }
    },

    async logTherapySession(category, track) {
        const user = auth?.currentUser;
        if (!user || typeof db === 'undefined') return;
        try {
            await db.collection('musicTherapyLogs').add({
                userId: user.uid,
                category,
                trackName: track.name,
                bpm: track.bpm,
                sensorState: this.getSensorState(),
                recommendation: this.getRecommendedCategory().category,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) { console.error('Therapy log error:', e); }
    }
};

window.MoodBooster = MoodBooster;
