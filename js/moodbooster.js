/**
 * SYNAWATCH - Mood Booster Module v3.0
 * [GAP 3] Biofeedback-Driven Music Therapy
 * Features: play/pause, daily mood check (once per day), biofeedback recommendation
 */

const MoodBooster = {
    currentMood: null,
    currentCategory: null,
    currentAudio: null,
    currentTrackKey: null, // "category:index"
    isPlaying: false,

    MOOD_STORAGE_KEY: 'synawatch_mood_date',

    // Local audio files in /audio folder
    audioUrls: {
        // Calm / Relaxation tracks
        'calm:0': 'audio/rain.mp3',
        'calm:1': 'audio/forest.mp3',
        'calm:2': 'audio/whitenoise.mp3',
        'calm:3': 'audio/calm4.mp3',
        'calm:4': 'audio/calm5.mp3',
        // Ambient / Balance tracks
        'ambient:0': 'audio/amb1.mp3',
        'ambient:1': 'audio/amb2.mp3',
        'ambient:2': 'audio/amb3.mp3',
        'ambient:3': 'audio/amb4.mp3',
        'ambient:4': 'audio/amb5.mp3',
        // Upbeat / Energetic tracks
        'upbeat:0': 'audio/upbeat1.mp3',
        'upbeat:1': 'audio/upbeat2.mp3',
        'upbeat:2': 'audio/uobeat3.mp3', // Note: typo in filename
        'upbeat:3': 'audio/upbeat4.mp3',
        'upbeat:4': 'audio/upbeat5.mp3',
        // Traditional / Local ASEAN tracks
        'local:0': 'music/indonesia-gamelan.mp3',
        'local:1': 'music/malaysia-traditional.mp3',
        'local:2': 'music/vietnam-dan-tranh.mp3',
        'local:3': 'music/thailand-ranat.mp3',
        'local:4': 'music/singapore-traditional.mp3'
    },

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
        },
        local: {
            label: 'Musik Tradisional ASEAN',
            icon: 'fa-globe-asia',
            color: '#8b5cf6',
            bpmRange: '60-100 BPM',
            description: 'Musik tradisional lokal dari negara-negara ASEAN',
            tracks: [
                { name: 'Gamelan Jawa Tradisional', genre: 'Gamelan', bpm: 70, duration: '8:34', mood: 'Meditatif', flag: '🇮🇩' },
                { name: 'Muzik Tradisional Malaysia', genre: 'Traditional', bpm: 80, duration: '5:21', mood: 'Harmonis', flag: '🇲🇾' },
                { name: 'Vietnamese Dan Tranh', genre: 'Traditional', bpm: 75, duration: '4:41', mood: 'Damai', flag: '🇻🇳' },
                { name: 'Thai Ranat Melody', genre: 'Traditional', bpm: 85, duration: '4:39', mood: 'Tenang', flag: '🇹🇭' },
                { name: 'Singapore Traditional Melody', genre: 'Traditional', bpm: 78, duration: '3:14', mood: 'Seimbang', flag: '🇸🇬' }
            ]
        }
    },

    init() {
        this.stopAudio();
        this.renderUI();
    },

    destroy() {
        this.stopAudio();
    },

    // ========== MOOD CHECK (once per day) ==========

    isMoodCheckedToday() {
        const saved = localStorage.getItem(this.MOOD_STORAGE_KEY);
        if (!saved) return false;
        const today = new Date().toISOString().split('T')[0];
        return saved === today;
    },

    markMoodChecked() {
        const today = new Date().toISOString().split('T')[0];
        localStorage.setItem(this.MOOD_STORAGE_KEY, today);
    },

    // ========== SENSOR / BIOFEEDBACK ==========

    getSensorState() {
        const state = (typeof App !== 'undefined' && App.getInterventionState) ? App.getInterventionState() : {};
        return {
            stress: state.stress || 0,
            gsr: state.gsr || 0,
            hr: state.hr || 0,
            hasSensor: (state.hr > 0 || state.stress > 0)
        };
    },

    getRecommendedCategory() {
        const sensor = this.getSensorState();
        if (!sensor.hasSensor) {
            return { category: null, reason: 'Hubungkan sensor untuk rekomendasi otomatis berbasis biofeedback.' };
        }
        if (sensor.stress > 65 || sensor.gsr > 70) {
            return { category: 'calm', reason: `Stres tinggi (${sensor.stress}%). Musik 60-80 BPM direkomendasikan.` };
        } else if (sensor.stress > 35 || sensor.gsr > 40) {
            return { category: 'ambient', reason: `Stres moderat (${sensor.stress}%). Musik 80-100 BPM untuk keseimbangan.` };
        }
        return { category: 'upbeat', reason: `Rileks (stres ${sensor.stress}%). Musik upbeat untuk mood positif.` };
    },

    // ========== AUDIO PLAY / PAUSE ==========

    playTrack(categoryKey, index) {
        const trackKey = `${categoryKey}:${index}`;
        const track = this.musicLibrary[categoryKey].tracks[index];

        // If same track → toggle pause/play
        if (this.currentTrackKey === trackKey && this.currentAudio) {
            if (this.isPlaying) {
                this.pauseAudio();
            } else {
                this.resumeAudio();
            }
            return;
        }

        // Different track → stop old, play new
        this.stopAudio();

        // Stop CountryMusic background audio if playing
        if (typeof CountryMusic !== 'undefined' && CountryMusic.audioPlayer) {
            CountryMusic.audioPlayer.pause();
        }

        const url = this.audioUrls[trackKey];
        if (!url) {
            if (typeof Utils !== 'undefined') Utils.showToast(t('moodbooster.track_unavailable'), 'error');
            return;
        }

        // Create audio element directly with src
        this.currentAudio = new Audio(url);
        this.currentAudio.volume = 0.7;
        this.currentTrackKey = trackKey;

        // Event listeners
        this.currentAudio.onended = () => {
            this.isPlaying = false;
            this.currentTrackKey = null;
            this.currentAudio = null;
            this._updateTrackButtons();
        };

        this.currentAudio.onerror = (e) => {
            const error = this.currentAudio.error;
            let errorMsg = 'Unknown error';
            if (error) {
                switch(error.code) {
                    case 1: errorMsg = 'MEDIA_ERR_ABORTED - Dibatalkan'; break;
                    case 2: errorMsg = 'MEDIA_ERR_NETWORK - Network error'; break;
                    case 3: errorMsg = 'MEDIA_ERR_DECODE - File corrupt/format tidak didukung'; break;
                    case 4: errorMsg = 'MEDIA_ERR_SRC_NOT_SUPPORTED - Format tidak didukung'; break;
                }
            }
            console.error('Audio error for:', url, '| Error:', errorMsg);
            if (typeof Utils !== 'undefined') Utils.showToast(`Error: ${errorMsg}`, 'error');
            this.isPlaying = false;
            this.currentTrackKey = null;
            this.currentAudio = null;
            this._updateTrackButtons();
        };

        // Play directly
        const playPromise = this.currentAudio.play();

        if (playPromise !== undefined) {
            playPromise.then(() => {
                this.isPlaying = true;
                this._updateTrackButtons();
                this.logTherapySession(categoryKey, track);
                if (typeof Utils !== 'undefined') Utils.showToast(`▶ ${track.name}`, 'success');
            }).catch((err) => {
                console.error('Play failed:', err.message);
                // Try playing on next user interaction
                if (typeof Utils !== 'undefined') Utils.showToast(t('moodbooster.click_to_play'), 'info');
                this._updateTrackButtons();
            });
        }
    },

    pauseAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.isPlaying = false;
            this._updateTrackButtons();
        }
    },

    resumeAudio() {
        if (this.currentAudio) {
            this.currentAudio.play();
            this.isPlaying = true;
            this._updateTrackButtons();
        }
    },

    stopAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.src = '';
            this.currentAudio = null;
        }
        this.isPlaying = false;
        this.currentTrackKey = null;
    },

    _updateTrackButtons() {
        document.querySelectorAll('.mb-track-btn').forEach(btn => {
            const key = btn.dataset.trackKey;
            const icon = btn.querySelector('.mb-track-icon');
            if (!icon) return;

            if (key === this.currentTrackKey && this.isPlaying) {
                icon.className = 'fas fa-pause mb-track-icon';
                btn.classList.add('mb-playing');
            } else {
                icon.className = 'fas fa-play mb-track-icon';
                btn.classList.remove('mb-playing');
            }
        });

        // Update now-playing bar
        const bar = document.getElementById('nowPlayingBar');
        if (bar) {
            if (this.isPlaying && this.currentTrackKey) {
                const [cat, idx] = this.currentTrackKey.split(':');
                const track = this.musicLibrary[cat].tracks[parseInt(idx)];
                bar.style.display = 'flex';
                bar.querySelector('.np-name').textContent = track.name;
                bar.querySelector('.np-genre').textContent = `${track.genre} • ${track.bpm} BPM`;
                bar.querySelector('.np-toggle-icon').className = 'fas fa-pause np-toggle-icon';
            } else if (!this.isPlaying && this.currentTrackKey) {
                bar.style.display = 'flex';
                bar.querySelector('.np-toggle-icon').className = 'fas fa-play np-toggle-icon';
            } else {
                bar.style.display = 'none';
            }
        }
    },

    toggleNowPlaying() {
        if (this.isPlaying) this.pauseAudio();
        else this.resumeAudio();
    },

    stopNowPlaying() {
        this.stopAudio();
        this._updateTrackButtons();
    },

    // ========== MOOD SELECTION ==========

    setMood(level) {
        this.currentMood = level;
        this.markMoodChecked();

        // Hide mood card with animation
        const moodCard = document.getElementById('moodCheckCard');
        if (moodCard) {
            moodCard.style.transition = 'all 0.4s ease';
            moodCard.style.opacity = '0';
            moodCard.style.maxHeight = '0';
            moodCard.style.overflow = 'hidden';
            moodCard.style.marginBottom = '0';
            moodCard.style.padding = '0';
            setTimeout(() => moodCard.remove(), 400);
        }

        // Auto-select category based on mood
        if (level <= 2) this.selectCategory('calm');
        else if (level === 3) this.selectCategory('ambient');
        else this.selectCategory('upbeat');

        this.logMood(level);
        if (typeof Utils !== 'undefined') Utils.showToast(t('moodbooster.mood_recorded'), 'success');
    },

    // ========== CATEGORY SELECTION ==========

    selectCategory(categoryKey) {
        this.currentCategory = categoryKey;
        const cat = this.musicLibrary[categoryKey];

        // For local category, reorder tracks to put user's country first
        if (categoryKey === 'local' && typeof CountryMusic !== 'undefined' && CountryMusic.currentCountry) {
            const countryOrder = ['ID', 'MY', 'VN', 'TH', 'SG'];
            const userIdx = countryOrder.indexOf(CountryMusic.currentCountry.code);
            if (userIdx > 0) {
                // Move user's country track to front
                const tracks = [...cat.tracks];
                const [userTrack] = tracks.splice(userIdx, 1);
                tracks.unshift(userTrack);
                const urls = Object.keys(this.audioUrls)
                    .filter(k => k.startsWith('local:'))
                    .map(k => this.audioUrls[k]);
                const [userUrl] = urls.splice(userIdx, 1);
                urls.unshift(userUrl);
                // Rebuild audioUrls for local category
                tracks.forEach((t, i) => { this.audioUrls[`local:${i}`] = urls[i]; });
                cat.tracks = tracks;
            }
        }
        const trackList = document.getElementById('trackList');
        if (!trackList) return;

        // Highlight active category
        document.querySelectorAll('.mb-cat-card').forEach(el => {
            const k = el.dataset.catKey;
            if (k === categoryKey) {
                el.style.borderColor = this.musicLibrary[k].color;
                el.style.boxShadow = `0 4px 16px ${this.musicLibrary[k].color}20`;
            } else {
                el.style.borderColor = 'transparent';
                el.style.boxShadow = 'none';
            }
        });

        let tracksHtml = cat.tracks.map((track, i) => {
            const trackKey = `${categoryKey}:${i}`;
            const isActive = this.currentTrackKey === trackKey;
            const iconClass = isActive && this.isPlaying ? 'fa-pause' : 'fa-play';
            const trackIcon = track.flag
                ? `<span style="font-size:1.4rem;line-height:1;">${track.flag}</span>`
                : `<i class="fas ${iconClass} mb-track-icon" style="color:${cat.color};font-size:0.9rem;"></i>`;

            return `
            <div class="mb-track-btn card ${isActive ? 'mb-playing' : ''}" data-track-key="${trackKey}"
                 onclick="MoodBooster.playTrack('${categoryKey}', ${i})"
                 style="cursor:pointer;padding:14px;margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <div style="width:42px;height:42px;background:${cat.color}15;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;position:relative;">
                        ${trackIcon}
                        ${track.flag ? `<i class="fas ${iconClass} mb-track-icon" style="position:absolute;bottom:-4px;right:-4px;background:${cat.color};color:white;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;font-size:0.6rem;"></i>` : ''}
                    </div>
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:600;color:var(--text-primary);font-size:0.9rem;">${track.name}</div>
                        <div style="font-size:0.75rem;color:var(--text-tertiary);">${track.genre} • ${track.bpm} BPM • ${track.duration}</div>
                    </div>
                    <span style="background:${cat.color}15;color:${cat.color};padding:3px 10px;border-radius:8px;font-size:0.7rem;font-weight:600;flex-shrink:0;">${track.mood}</span>
                </div>
            </div>`;
        }).join('');

        trackList.innerHTML = `
            <div style="margin-top:16px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
                    <i class="fas ${cat.icon}" style="color:${cat.color};"></i>
                    <h4 style="margin:0;color:var(--text-primary);font-size:0.95rem;">${cat.label}</h4>
                    <span style="font-size:0.8rem;color:var(--text-tertiary);">(${cat.tracks.length} tracks)</span>
                </div>
                ${tracksHtml}
            </div>
        `;
    },

    // ========== RENDER ==========

    renderUI() {
        const container = document.getElementById('moodboosterContent');
        if (!container) return;

        const recommendation = this.getRecommendedCategory();
        const sensor = this.getSensorState();
        const showMoodCheck = !this.isMoodCheckedToday();

        // Sensor badge
        const sensorBadge = sensor.hasSensor
            ? `<span style="background:rgba(16,185,129,0.12);color:#10b981;padding:4px 12px;border-radius:20px;font-size:0.72rem;font-weight:600;"><i class="fas fa-broadcast-tower"></i> ${t('status.sensor_active')}</span>`
            : `<span style="background:rgba(156,163,175,0.12);color:#9ca3af;padding:4px 12px;border-radius:20px;font-size:0.72rem;font-weight:600;"><i class="fas fa-unlink"></i> ${t('status.sensor_offline')}</span>`;

        // Recommendation card
        const recCard = recommendation.category ? `
            <div class="card" style="margin-bottom:16px;padding:16px;border-left:3px solid ${this.musicLibrary[recommendation.category].color};">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <i class="fas fa-brain" style="color:${this.musicLibrary[recommendation.category].color};"></i>
                    <span style="font-weight:700;color:var(--text-primary);font-size:0.9rem;">Rekomendasi Biofeedback</span>
                </div>
                <p style="font-size:0.82rem;color:var(--text-secondary);line-height:1.5;margin-bottom:10px;">${recommendation.reason}</p>
                <button onclick="MoodBooster.selectCategory('${recommendation.category}')" class="btn btn-primary btn-sm" style="background:${this.musicLibrary[recommendation.category].color};">
                    <i class="fas ${this.musicLibrary[recommendation.category].icon}"></i> Putar ${this.musicLibrary[recommendation.category].label}
                </button>
            </div>
        ` : '';

        // Mood check card (once per day)
        const moodEmojis = [
            { emoji: '😢', label: 'Sedih', value: 1 },
            { emoji: '😟', label: 'Cemas', value: 2 },
            { emoji: '😐', label: 'Netral', value: 3 },
            { emoji: '😊', label: 'Baik', value: 4 },
            { emoji: '😄', label: 'Bahagia', value: 5 }
        ];

        const moodCard = showMoodCheck ? `
            <div id="moodCheckCard" class="card" style="margin-bottom:16px;padding:16px;">
                <h4 style="margin-bottom:12px;color:var(--text-primary);font-size:0.95rem;">Bagaimana perasaan Anda hari ini?</h4>
                <div style="display:flex;gap:8px;">
                    ${moodEmojis.map(m => `
                        <button onclick="MoodBooster.setMood(${m.value})" style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:12px 8px;background:var(--bg-primary);border:none;border-radius:14px;cursor:pointer;transition:all 0.2s;flex:1;min-width:0;">
                            <span style="font-size:1.5rem;">${m.emoji}</span>
                            <span style="font-size:0.68rem;color:var(--text-tertiary);font-weight:500;">${m.label}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
        ` : '';

        // Categories
        let categoriesHtml = '';
        for (const [key, cat] of Object.entries(this.musicLibrary)) {
            const isRec = key === recommendation.category;
            categoriesHtml += `
                <div class="card mb-cat-card" data-cat-key="${key}"
                     onclick="MoodBooster.selectCategory('${key}')"
                     style="cursor:pointer;padding:14px;margin-bottom:10px;border:2px solid ${isRec ? cat.color : 'transparent'}; ${isRec ? 'box-shadow:0 4px 16px ' + cat.color + '20;' : ''}">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <div style="width:46px;height:46px;background:${cat.color}12;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                            <i class="fas ${cat.icon}" style="color:${cat.color};font-size:1.2rem;"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <div style="font-weight:700;color:var(--text-primary);font-size:0.92rem;">${cat.label}</div>
                            <div style="font-size:0.78rem;color:var(--text-tertiary);">${cat.bpmRange} • ${cat.description}</div>
                        </div>
                        ${isRec ? `<span style="background:${cat.color};color:white;padding:2px 8px;border-radius:8px;font-size:0.68rem;font-weight:600;flex-shrink:0;">REC</span>` : ''}
                    </div>
                </div>
            `;
        }

        container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h2 style="font-size:1.25rem;font-weight:700;color:var(--text-primary);margin:0;"><i class="fas fa-music" style="color:#f59e0b;margin-right:6px;"></i>Mood Booster</h2>
                ${sensorBadge}
            </div>

            ${recCard}
            ${moodCard}

            <h4 style="margin-bottom:10px;color:var(--text-primary);font-size:0.92rem;">Terapi Musik</h4>
            ${categoriesHtml}

            <div id="trackList"></div>

            <!-- Now Playing Bar -->
            <div id="nowPlayingBar" style="display:none;position:fixed;bottom:100px;left:50%;transform:translateX(-50%);width:calc(100% - 32px);max-width:400px;background:var(--bg-card-solid, #fff);border-radius:16px;padding:12px 16px;box-shadow:0 8px 30px rgba(0,0,0,0.15);z-index:200;align-items:center;gap:12px;">
                <div style="flex:1;min-width:0;">
                    <div class="np-name" style="font-weight:600;font-size:0.88rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
                    <div class="np-genre" style="font-size:0.72rem;color:var(--text-tertiary);"></div>
                </div>
                <button onclick="MoodBooster.toggleNowPlaying()" style="width:38px;height:38px;border-radius:50%;background:var(--primary-500, #8b5cf6);color:white;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;">
                    <i class="fas fa-pause np-toggle-icon"></i>
                </button>
                <button onclick="MoodBooster.stopNowPlaying()" style="width:38px;height:38px;border-radius:50%;background:var(--bg-primary, #f0f0f0);color:var(--text-tertiary);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;">
                    <i class="fas fa-stop"></i>
                </button>
            </div>

            <div style="padding:12px;border-radius:12px;margin-top:16px;text-align:center;">
                <p style="font-size:0.72rem;color:var(--text-tertiary);margin:0;">
                    <i class="fas fa-flask"></i> Berbasis penelitian: Music Therapy for Depression (Leubner & Hinterberger, 2020)
                </p>
            </div>
        `;
    },

    // ========== FIREBASE LOGGING ==========

    async logMood(level) {
        const user = typeof auth !== 'undefined' && auth.currentUser;
        if (!user || typeof db === 'undefined') return;
        try {
            await FirebaseService.userCol(user.uid, 'moodLogs').add({
                mood: level,
                sensorState: this.getSensorState(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) { console.warn('Mood log error:', e); }
    },

    async logTherapySession(category, track) {
        const user = typeof auth !== 'undefined' && auth.currentUser;
        if (!user || typeof db === 'undefined') return;
        try {
            await FirebaseService.userCol(user.uid, 'musicTherapyLogs').add({
                category,
                trackName: track.name,
                bpm: track.bpm,
                sensorState: this.getSensorState(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (e) { console.warn('Therapy log error:', e); }
    }
};

window.MoodBooster = MoodBooster;
