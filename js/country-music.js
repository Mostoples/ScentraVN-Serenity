/**
 * SYNAWATCH - Country Selection & Traditional Music Player
 *
 * Provides country selection for ASEAN countries with traditional music playback
 * using YouTube IFrame Player API
 */

const CountryMusic = {

    // 5 ASEAN Countries with traditional music
    ASEAN_COUNTRIES: [
        {
            code: 'ID',
            name: 'Indonesia',
            flag: '🇮🇩',
            color: '#FF0000',
            gradient: 'linear-gradient(135deg, #FF0000, #FFFFFF)',
            music: {
                audioUrl: 'music/indonesia-gamelan.mp3',
                title: 'Gamelan Jawa Tradisional',
                artist: 'Traditional Indonesian'
            }
        },
        {
            code: 'MY',
            name: 'Malaysia',
            flag: '🇲🇾',
            color: '#010066',
            gradient: 'linear-gradient(135deg, #010066, #CC0001)',
            music: {
                audioUrl: 'music/malaysia-traditional.mp3',
                title: 'Muzik Tradisional Malaysia',
                artist: 'Traditional Malaysian'
            }
        },
        {
            code: 'VN',
            name: 'Vietnam',
            flag: '🇻🇳',
            color: '#DA251D',
            gradient: 'linear-gradient(135deg, #DA251D, #FFCD00)',
            music: {
                audioUrl: 'music/vietnam-dan-tranh.mp3',
                title: 'Vietnamese Traditional Melody',
                artist: 'Traditional Vietnamese'
            }
        },
        {
            code: 'TH',
            name: 'Thailand',
            flag: '🇹🇭',
            color: '#A51931',
            gradient: 'linear-gradient(135deg, #A51931, #F4F5F8)',
            music: {
                audioUrl: 'music/thailand-ranat.mp3',
                title: 'Thai Traditional Melody',
                artist: 'Traditional Thai'
            }
        },
        {
            code: 'SG',
            name: 'Singapore',
            flag: '🇸🇬',
            color: '#ED2939',
            gradient: 'linear-gradient(135deg, #ED2939, #FFFFFF)',
            music: {
                audioUrl: 'music/singapore-traditional.mp3',
                title: 'Singapore Traditional Melody',
                artist: 'Traditional Singaporean'
            }
        }
    ],

    player: null,
    audioPlayer: null, // HTML5 Audio player
    currentCountry: null,
    isPlayerReady: false,
    volumeLevel: 0.3, // 30% volume for background music
    useYouTube: false, // Use HTML5 Audio instead of YouTube

    /**
     * Initialize Country Selection
     * Called after successful login/registration
     */
    async init() {
        // Check if user already selected a country
        const user = auth?.currentUser;
        if (!user) return;

        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            const userData = userDoc.data();

            if (userData && userData.country) {
                // Country already selected
                this.currentCountry = this.ASEAN_COUNTRIES.find(c => c.code === userData.country);
                console.log('[CountryMusic] Country already selected:', this.currentCountry?.name);
                return;
            }

            // Show country selection modal
            this.showCountrySelection();
        } catch (error) {
            console.error('[CountryMusic] Error checking country:', error);
        }
    },

    /**
     * Show Country Selection Modal
     */
    showCountrySelection() {
        const modal = document.createElement('div');
        modal.id = 'countrySelectionModal';
        modal.className = 'country-modal-overlay';

        modal.innerHTML = `
        <div class="country-modal">
            <div class="country-modal-header">
                <div class="modal-icon-wrapper">
                    <i class="fas fa-globe-asia"></i>
                </div>
                <h2 class="modal-title">Pilih Negara Anda</h2>
                <p class="modal-subtitle">
                    Nikmati pengalaman personal dengan musik tradisional dari negaramu
                </p>
            </div>

            <div class="country-grid">
                ${this.ASEAN_COUNTRIES.map(country => `
                <div class="country-card" onclick="CountryMusic.selectCountry('${country.code}')"
                     data-country="${country.code}">
                    <div class="country-card-bg" style="background: ${country.gradient};"></div>
                    <div class="country-card-content">
                        <div class="country-flag">${country.flag}</div>
                        <div class="country-name">${country.name}</div>
                        <div class="country-music-preview">
                            <i class="fas fa-music"></i>
                            <span>Traditional</span>
                        </div>
                    </div>
                    <div class="country-card-hover">
                        <i class="fas fa-play-circle"></i>
                        <span>Dengarkan</span>
                    </div>
                </div>
                `).join('')}
            </div>

            <div class="modal-footer">
                <div class="modal-info">
                    <i class="fas fa-info-circle"></i>
                    <span>Musik akan diputar sebagai backsound saat menggunakan aplikasi</span>
                </div>
                <button onclick="CountryMusic.skipMusic()" class="skip-btn">
                    <i class="fas fa-forward"></i>
                    <span>Lewati untuk Sekarang</span>
                </button>
            </div>
        </div>

        <style>
        .country-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            padding: 20px;
            overflow-y: auto;
        }

        .country-modal {
            background: #FFFFFF;
            border-radius: 24px;
            padding: 40px 32px;
            max-width: 680px;
            width: 100%;
            max-height: calc(100vh - 40px);
            overflow-y: auto;
            overflow-x: hidden;
            animation: modalSlideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.25),
                        0 8px 16px rgba(0, 0, 0, 0.15);
            margin: auto;
        }

        .country-modal::-webkit-scrollbar {
            width: 8px;
        }

        .country-modal::-webkit-scrollbar-track {
            background: #F1F5F9;
            border-radius: 4px;
        }

        .country-modal::-webkit-scrollbar-thumb {
            background: #CBD5E1;
            border-radius: 4px;
        }

        .country-modal::-webkit-scrollbar-thumb:hover {
            background: #94A3B8;
        }

        .country-modal-header {
            text-align: center;
            margin-bottom: 32px;
        }

        .modal-icon-wrapper {
            width: 72px;
            height: 72px;
            background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
        }

        .modal-icon-wrapper i {
            font-size: 2rem;
            color: white;
        }

        .modal-title {
            font-size: 1.75rem;
            font-weight: 800;
            color: #0F172A;
            margin: 0 0 12px;
            letter-spacing: -0.5px;
        }

        .modal-subtitle {
            color: #64748B;
            font-size: 0.95rem;
            margin: 0;
            line-height: 1.5;
        }

        .country-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 16px;
            margin-bottom: 28px;
            width: 100%;
        }

        .country-card {
            background: #F8FAFC;
            border: 2px solid #E2E8F0;
            border-radius: 16px;
            padding: 0;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            aspect-ratio: 1 / 1;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 140px;
        }

        .country-card-bg {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            opacity: 0;
            transition: opacity 0.3s;
        }

        .country-card-content {
            position: relative;
            z-index: 2;
            padding: 20px;
            transition: transform 0.3s;
        }

        .country-card-hover {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(4px);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 8px;
            opacity: 0;
            transition: opacity 0.3s;
            z-index: 3;
            color: white;
        }

        .country-card-hover i {
            font-size: 2rem;
        }

        .country-card-hover span {
            font-size: 0.9rem;
            font-weight: 600;
        }

        .country-card:hover {
            transform: translateY(-6px) scale(1.02);
            border-color: #8B5CF6;
            box-shadow: 0 12px 32px rgba(139, 92, 246, 0.25);
        }

        .country-card:hover .country-card-bg {
            opacity: 0.12;
        }

        .country-card:hover .country-card-hover {
            opacity: 1;
        }

        .country-card:active {
            transform: translateY(-4px) scale(0.98);
        }

        .country-flag {
            font-size: 3.5rem;
            margin-bottom: 12px;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.12));
            transition: transform 0.3s;
        }

        .country-card:hover .country-flag {
            transform: scale(1.1);
        }

        .country-name {
            font-size: 0.95rem;
            font-weight: 700;
            color: #1E293B;
            margin-bottom: 8px;
            letter-spacing: -0.2px;
        }

        .country-music-preview {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            font-size: 0.75rem;
            color: #8B5CF6;
            padding: 6px 12px;
            background: #F5F3FF;
            border-radius: 12px;
            font-weight: 600;
        }

        .country-music-preview i {
            font-size: 0.75rem;
        }

        .modal-footer {
            text-align: center;
            padding-top: 24px;
            border-top: 1px solid #E2E8F0;
        }

        .modal-info {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 0.85rem;
            color: #64748B;
            margin-bottom: 16px;
        }

        .modal-info i {
            color: #8B5CF6;
        }

        .skip-btn {
            background: transparent;
            border: 2px solid #E2E8F0;
            color: #64748B;
            padding: 12px 24px;
            border-radius: 12px;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .skip-btn:hover {
            background: #F8FAFC;
            border-color: #CBD5E1;
            color: #475569;
            transform: translateY(-2px);
        }

        .skip-btn:active {
            transform: translateY(0);
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }

        @keyframes modalSlideUp {
            from {
                opacity: 0;
                transform: translateY(60px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        @keyframes slideDown {
            from {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
            to {
                opacity: 0;
                transform: translateY(40px) scale(0.95);
            }
        }

        /* Large Desktop */
        @media (min-width: 1200px) {
            .country-modal {
                max-width: 720px;
            }

            .country-grid {
                grid-template-columns: repeat(5, 1fr);
            }
        }

        /* Desktop */
        @media (min-width: 769px) and (max-width: 1199px) {
            .country-grid {
                grid-template-columns: repeat(5, 1fr);
            }
        }

        /* Tablet Portrait */
        @media (max-width: 768px) {
            .country-modal-overlay {
                padding: 16px;
            }

            .country-modal {
                padding: 32px 24px;
                max-height: calc(100vh - 32px);
            }

            .modal-icon-wrapper {
                width: 68px;
                height: 68px;
            }

            .modal-icon-wrapper i {
                font-size: 1.9rem;
            }

            .modal-title {
                font-size: 1.5rem;
            }

            .modal-subtitle {
                font-size: 0.9rem;
            }

            .country-grid {
                grid-template-columns: repeat(3, 1fr);
                gap: 12px;
            }

            .country-card {
                min-height: 130px;
            }

            .country-flag {
                font-size: 3rem;
            }
        }

        /* Mobile Landscape */
        @media (max-width: 640px) and (orientation: landscape) {
            .country-modal {
                padding: 24px 20px;
            }

            .country-modal-header {
                margin-bottom: 20px;
            }

            .modal-icon-wrapper {
                width: 56px;
                height: 56px;
            }

            .modal-icon-wrapper i {
                font-size: 1.6rem;
            }

            .modal-title {
                font-size: 1.3rem;
            }

            .country-grid {
                grid-template-columns: repeat(5, 1fr);
                gap: 10px;
            }

            .country-card {
                min-height: 100px;
            }

            .country-flag {
                font-size: 2.2rem;
            }

            .country-name {
                font-size: 0.75rem;
            }
        }

        /* Mobile Portrait */
        @media (max-width: 640px) and (orientation: portrait) {
            .country-modal-overlay {
                padding: 12px;
            }

            .country-modal {
                padding: 28px 20px;
                border-radius: 20px;
                max-height: calc(100vh - 24px);
            }

            .modal-icon-wrapper {
                width: 64px;
                height: 64px;
                margin-bottom: 16px;
            }

            .modal-icon-wrapper i {
                font-size: 1.75rem;
            }

            .modal-title {
                font-size: 1.35rem;
                margin-bottom: 10px;
            }

            .modal-subtitle {
                font-size: 0.875rem;
            }

            .country-modal-header {
                margin-bottom: 24px;
            }

            .country-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 12px;
                margin-bottom: 20px;
            }

            .country-card {
                min-height: 140px;
            }

            .country-flag {
                font-size: 2.8rem;
            }

            .country-name {
                font-size: 0.85rem;
                margin-bottom: 6px;
            }

            .country-music-preview {
                font-size: 0.7rem;
                padding: 5px 10px;
            }

            .modal-footer {
                padding-top: 20px;
            }

            .modal-info {
                font-size: 0.8rem;
                margin-bottom: 14px;
            }

            .skip-btn {
                width: 100%;
                justify-content: center;
                padding: 10px 20px;
            }
        }

        /* Small Mobile */
        @media (max-width: 375px) {
            .country-modal {
                padding: 24px 16px;
            }

            .modal-icon-wrapper {
                width: 60px;
                height: 60px;
            }

            .modal-icon-wrapper i {
                font-size: 1.65rem;
            }

            .modal-title {
                font-size: 1.25rem;
            }

            .modal-subtitle {
                font-size: 0.825rem;
            }

            .country-grid {
                gap: 10px;
            }

            .country-card {
                min-height: 130px;
            }

            .country-flag {
                font-size: 2.5rem;
            }

            .country-name {
                font-size: 0.8rem;
            }

            .country-music-preview {
                font-size: 0.65rem;
                padding: 4px 8px;
            }
        }

        /* Extra Small Mobile */
        @media (max-width: 320px) {
            .country-modal {
                padding: 20px 12px;
            }

            .modal-icon-wrapper {
                width: 56px;
                height: 56px;
            }

            .modal-title {
                font-size: 1.15rem;
            }

            .modal-subtitle {
                font-size: 0.8rem;
            }

            .country-grid {
                gap: 8px;
            }

            .country-card {
                min-height: 120px;
                border-radius: 12px;
            }

            .country-flag {
                font-size: 2.3rem;
            }

            .country-name {
                font-size: 0.75rem;
            }

            .country-music-preview {
                font-size: 0.6rem;
                padding: 4px 6px;
            }

            .skip-btn {
                font-size: 0.85rem;
                padding: 10px 16px;
            }
        }
        </style>
        `;

        document.body.appendChild(modal);
    },

    /**
     * Select a country
     */
    async selectCountry(countryCode) {
        const country = this.ASEAN_COUNTRIES.find(c => c.code === countryCode);
        if (!country) {
            console.error('[CountryMusic] Country not found:', countryCode);
            return;
        }

        console.log('[CountryMusic] Country selected:', country.name);
        this.currentCountry = country;

        // Show loading
        const modal = document.getElementById('countrySelectionModal');
        if (modal) {
            modal.innerHTML = `
            <div class="country-modal">
                <div style="text-align: center; padding: 40px;">
                    <div style="width: 80px; height: 80px; margin: 0 auto 20px;
                                border-radius: 50%; display: flex; align-items: center; justify-content: center;
                                font-size: 3rem; animation: pulse 1.5s ease-in-out infinite;">
                        ${country.flag}
                    </div>
                    <h3 style="font-size: 1.2rem; font-weight: 700; color: var(--text-primary); margin: 0 0 8px;">
                        ${country.name}
                    </h3>
                    <p style="color: var(--text-secondary); margin: 0 0 20px;">
                        Menyiapkan musik tradisional...
                    </p>
                    <div class="loading-spinner" style="margin: 0 auto;"></div>
                </div>
            </div>
            <style>
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
            }
            </style>
            `;
        }

        // Save to Firestore
        try {
            const user = auth?.currentUser;
            if (user) {
                console.log('[CountryMusic] Saving country to Firestore...');
                await db.collection('users').doc(user.uid).update({
                    country: country.code,
                    countryName: country.name,
                    musicPreference: 'traditional',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('[CountryMusic] Country saved successfully');
            }

            // Play audio using HTML5 Audio (no YouTube needed)
            console.log('[CountryMusic] Loading audio player...');

            // Wait a bit before playing
            setTimeout(() => {
                console.log('[CountryMusic] Starting music playback...');
                this.playAudioFile();

                // Close modal with animation after a bit
                setTimeout(() => {
                    if (modal) {
                        const modalContent = modal.querySelector('.country-modal');
                        if (modalContent) {
                            modalContent.style.animation = 'slideDown 0.4s ease';
                        }
                        modal.style.animation = 'fadeOut 0.4s ease';
                        setTimeout(() => modal.remove(), 400);
                    }

                    // Show welcome toast
                    if (typeof Utils !== 'undefined') {
                        Utils.showToast(
                            `🎵 Selamat datang! Menikmati musik tradisional ${country.name}`,
                            'success',
                            4000
                        );
                    }
                }, 1000);
            }, 1500);

        } catch (error) {
            console.error('[CountryMusic] Error in selectCountry:', error);
            if (modal) modal.remove();
            if (typeof Utils !== 'undefined') {
                Utils.showToast('Gagal menyimpan pilihan negara: ' + error.message, 'error');
            }
        }
    },

    /**
     * Load YouTube IFrame Player API
     */
    async loadYouTubeAPI() {
        return new Promise((resolve, reject) => {
            // Check if already loaded
            if (window.YT && window.YT.Player) {
                console.log('[CountryMusic] YouTube API already loaded');
                resolve();
                return;
            }

            console.log('[CountryMusic] Loading YouTube API...');

            // Load YouTube IFrame API
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            tag.onerror = () => {
                console.error('[CountryMusic] Failed to load YouTube API');
                reject(new Error('Failed to load YouTube API'));
            };

            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

            // YouTube API will call this function when ready
            window.onYouTubeIframeAPIReady = () => {
                console.log('[CountryMusic] YouTube API ready');
                resolve();
            };

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!window.YT || !window.YT.Player) {
                    console.error('[CountryMusic] YouTube API load timeout');
                    reject(new Error('YouTube API load timeout'));
                }
            }, 10000);
        });
    },

    /**
     * Play Audio File (HTML5 Audio - more reliable than YouTube)
     */
    playAudioFile() {
        if (!this.currentCountry) {
            console.error('[CountryMusic] No country selected');
            return;
        }

        console.log('[CountryMusic] Playing audio for:', this.currentCountry.name);
        console.log('[CountryMusic] Audio URL:', this.currentCountry.music.audioUrl);

        // Stop existing audio
        if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.audioPlayer = null;
        }

        // Create new audio player
        try {
            this.audioPlayer = new Audio(this.currentCountry.music.audioUrl);
            this.audioPlayer.volume = this.volumeLevel;
            this.audioPlayer.loop = true;

            // Event listeners
            this.audioPlayer.addEventListener('loadeddata', () => {
                console.log('[CountryMusic] Audio loaded, starting playback');
                this.isPlayerReady = true;
            });

            this.audioPlayer.addEventListener('playing', () => {
                console.log('[CountryMusic] Audio playing');
                this.createMusicController();

                // Remove manual play prompt if exists
                const prompt = document.getElementById('manualPlayPrompt');
                if (prompt) prompt.remove();
            });

            this.audioPlayer.addEventListener('error', (e) => {
                console.error('[CountryMusic] Audio error:', e);
                if (typeof Utils !== 'undefined') {
                    Utils.showToast('Gagal memutar musik. Coba negara lain.', 'error');
                }
            });

            // Try to play
            const playPromise = this.audioPlayer.play();

            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('[CountryMusic] Audio autoplay successful');
                    })
                    .catch(error => {
                        console.warn('[CountryMusic] Autoplay blocked:', error);
                        this.showManualPlayPrompt();
                    });
            }

        } catch (e) {
            console.error('[CountryMusic] Error creating audio player:', e);
            if (typeof Utils !== 'undefined') {
                Utils.showToast('Gagal memutar musik', 'error');
            }
        }
    },

    /**
     * Play Traditional Music (YouTube - DEPRECATED)
     */
    playTraditionalMusic() {
        if (!this.currentCountry) {
            console.error('[CountryMusic] No country selected');
            return;
        }

        console.log('[CountryMusic] Playing music for:', this.currentCountry.name);
        console.log('[CountryMusic] Video ID:', this.currentCountry.music.videoId);

        if (!window.YT || !window.YT.Player) {
            console.error('[CountryMusic] YouTube API not loaded yet');
            return;
        }

        // Create hidden player container if not exists
        let playerContainer = document.getElementById('ytMusicPlayer');
        if (!playerContainer) {
            playerContainer = document.createElement('div');
            playerContainer.id = 'ytMusicPlayer';
            playerContainer.style.display = 'none';
            document.body.appendChild(playerContainer);
            console.log('[CountryMusic] Player container created');
        }

        // Destroy existing player
        if (this.player) {
            try {
                this.player.destroy();
                console.log('[CountryMusic] Old player destroyed');
            } catch (e) {
                console.error('[CountryMusic] Error destroying old player:', e);
            }
        }

        // Create new player
        try {
            console.log('[CountryMusic] Creating new player...');
            this.player = new YT.Player('ytMusicPlayer', {
                height: '0',
                width: '0',
                videoId: this.currentCountry.music.videoId,
                playerVars: {
                    autoplay: 1,
                    loop: 1,
                    playlist: this.currentCountry.music.videoId, // Required for loop
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    modestbranding: 1,
                    playsinline: 1
                },
                events: {
                    onReady: (event) => {
                        console.log('[CountryMusic] Player ready, starting playback');
                        event.target.setVolume(this.volumeLevel * 100);

                        // Try to play
                        try {
                            event.target.playVideo();
                            this.isPlayerReady = true;

                            // Wait a bit and check if playing
                            setTimeout(() => {
                                const state = event.target.getPlayerState();
                                console.log('[CountryMusic] Player state after play attempt:', state);

                                // If not playing (likely blocked by autoplay policy)
                                if (state !== YT.PlayerState.PLAYING) {
                                    console.warn('[CountryMusic] Autoplay blocked, showing manual play button');
                                    this.showManualPlayPrompt();
                                } else {
                                    this.createMusicController();
                                }
                            }, 1000);
                        } catch (e) {
                            console.error('[CountryMusic] Error playing video:', e);
                            this.showManualPlayPrompt();
                        }
                    },
                    onStateChange: (event) => {
                        console.log('[CountryMusic] Player state changed:', event.data);

                        // If started playing, hide manual play prompt and show controller
                        if (event.data === YT.PlayerState.PLAYING) {
                            const prompt = document.getElementById('manualPlayPrompt');
                            if (prompt) prompt.remove();

                            if (!document.getElementById('musicController')) {
                                this.createMusicController();
                            }
                        }
                    },
                    onError: (error) => {
                        console.error('[CountryMusic] Player error:', error);
                        console.error('[CountryMusic] Error code:', error.data);

                        // YouTube error codes:
                        // 2 = Invalid parameter
                        // 5 = HTML5 player error
                        // 100 = Video not found or private
                        // 101 = Video owner doesn't allow embedding
                        // 150 = Video owner doesn't allow embedding (same as 101)

                        let errorMsg = 'Gagal memutar musik';
                        if (error.data === 100) {
                            errorMsg = 'Video musik tidak ditemukan atau privat';
                        } else if (error.data === 101 || error.data === 150) {
                            errorMsg = 'Video musik tidak bisa diputar (embedding disabled)';
                        }

                        // Try fallback video
                        console.log('[CountryMusic] Trying fallback videos...');
                        this.tryFallback().then(success => {
                            if (!success) {
                                // All fallbacks failed - show error
                                if (typeof Utils !== 'undefined') {
                                    Utils.showToast(`${errorMsg}. Fitur musik tidak tersedia untuk negara ini.`, 'warning', 5000);
                                }

                                // Remove manual play prompt if exists
                                const prompt = document.getElementById('manualPlayPrompt');
                                if (prompt) prompt.remove();

                                // Close modal if open
                                const modal = document.getElementById('countrySelectionModal');
                                if (modal) {
                                    setTimeout(() => {
                                        modal.style.animation = 'fadeOut 0.3s ease';
                                        setTimeout(() => modal.remove(), 300);
                                    }, 1000);
                                }
                            }
                        });
                    }
                }
            });
        } catch (e) {
            console.error('[CountryMusic] Error creating player:', e);
        }
    },

    /**
     * Show manual play prompt (when autoplay is blocked)
     */
    showManualPlayPrompt() {
        // Remove existing prompt
        const existing = document.getElementById('manualPlayPrompt');
        if (existing) existing.remove();

        const prompt = document.createElement('div');
        prompt.id = 'manualPlayPrompt';
        prompt.innerHTML = `
        <div class="manual-play-prompt">
            <div class="prompt-card">
                <div class="prompt-icon-wrapper">
                    <div class="prompt-flag">${this.currentCountry.flag}</div>
                    <div class="prompt-pulse"></div>
                </div>

                <div class="prompt-content">
                    <div class="prompt-title">
                        <i class="fas fa-music"></i>
                        Musik Tradisional ${this.currentCountry.name}
                    </div>
                    <div class="prompt-subtitle">
                        Browser memblokir autoplay. Klik tombol di bawah untuk memulai.
                    </div>
                </div>

                <button class="prompt-play-btn" onclick="CountryMusic.manualPlay()">
                    <i class="fas fa-play-circle"></i>
                    <span>Putar Sekarang</span>
                </button>

                <button class="prompt-close-btn" onclick="document.getElementById('manualPlayPrompt').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>

        <style>
        .manual-play-prompt {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 10001;
            animation: slideInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .prompt-card {
            background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%);
            border-radius: 20px;
            padding: 24px;
            box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15),
                        0 4px 12px rgba(0, 0, 0, 0.1);
            display: flex;
            flex-direction: column;
            gap: 16px;
            align-items: center;
            max-width: 340px;
            border: 1px solid rgba(139, 92, 246, 0.1);
            position: relative;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
        }

        .prompt-icon-wrapper {
            position: relative;
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .prompt-flag {
            font-size: 3.5rem;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.15));
            position: relative;
            z-index: 2;
        }

        .prompt-pulse {
            position: absolute;
            width: 100%;
            height: 100%;
            border-radius: 50%;
            background: linear-gradient(135deg, #8B5CF6, #EC4899);
            opacity: 0.2;
            animation: pulse 2s ease-in-out infinite;
        }

        .prompt-content {
            text-align: center;
        }

        .prompt-title {
            font-size: 1rem;
            font-weight: 700;
            color: #0F172A;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            letter-spacing: -0.2px;
        }

        .prompt-title i {
            color: #8B5CF6;
            font-size: 0.9rem;
        }

        .prompt-subtitle {
            font-size: 0.85rem;
            color: #64748B;
            line-height: 1.5;
        }

        .prompt-play-btn {
            background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
            color: white;
            border: none;
            padding: 14px 32px;
            border-radius: 16px;
            font-weight: 700;
            font-size: 0.95rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.35);
            width: 100%;
            justify-content: center;
        }

        .prompt-play-btn i {
            font-size: 1.1rem;
        }

        .prompt-play-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 28px rgba(139, 92, 246, 0.45);
        }

        .prompt-play-btn:active {
            transform: translateY(-1px);
        }

        .prompt-close-btn {
            position: absolute;
            top: 12px;
            right: 12px;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: none;
            background: #F1F5F9;
            color: #64748B;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            font-size: 0.75rem;
        }

        .prompt-close-btn:hover {
            background: #E2E8F0;
            color: #475569;
        }

        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
                opacity: 0.2;
            }
            50% {
                transform: scale(1.2);
                opacity: 0.1;
            }
        }

        /* Tablet */
        @media (max-width: 768px) {
            .manual-play-prompt {
                bottom: 20px;
                right: 20px;
                left: 20px;
            }

            .prompt-card {
                max-width: 100%;
                padding: 22px;
            }

            .prompt-icon-wrapper {
                width: 76px;
                height: 76px;
            }

            .prompt-flag {
                font-size: 3.2rem;
            }
        }

        /* Mobile Large */
        @media (max-width: 640px) {
            .manual-play-prompt {
                bottom: 18px;
                right: 18px;
                left: 18px;
            }

            .prompt-card {
                padding: 20px;
                border-radius: 18px;
            }

            .prompt-icon-wrapper {
                width: 72px;
                height: 72px;
            }

            .prompt-flag {
                font-size: 3rem;
            }

            .prompt-title {
                font-size: 0.95rem;
            }

            .prompt-subtitle {
                font-size: 0.82rem;
            }

            .prompt-play-btn {
                padding: 13px 28px;
                font-size: 0.9rem;
            }
        }

        /* Mobile Standard */
        @media (max-width: 480px) {
            .manual-play-prompt {
                bottom: 16px;
                right: 16px;
                left: 16px;
            }

            .prompt-card {
                padding: 20px 18px;
                gap: 14px;
            }

            .prompt-icon-wrapper {
                width: 68px;
                height: 68px;
            }

            .prompt-flag {
                font-size: 2.8rem;
            }

            .prompt-title {
                font-size: 0.9rem;
                gap: 6px;
            }

            .prompt-title i {
                font-size: 0.85rem;
            }

            .prompt-subtitle {
                font-size: 0.8rem;
            }

            .prompt-play-btn {
                padding: 12px 24px;
                font-size: 0.88rem;
                border-radius: 14px;
            }

            .prompt-play-btn i {
                font-size: 1rem;
            }
        }

        /* Mobile Small */
        @media (max-width: 375px) {
            .manual-play-prompt {
                bottom: 14px;
                right: 14px;
                left: 14px;
            }

            .prompt-card {
                padding: 18px 16px;
                gap: 12px;
            }

            .prompt-icon-wrapper {
                width: 64px;
                height: 64px;
            }

            .prompt-flag {
                font-size: 2.6rem;
            }

            .prompt-title {
                font-size: 0.88rem;
            }

            .prompt-subtitle {
                font-size: 0.78rem;
            }

            .prompt-play-btn {
                padding: 11px 22px;
                font-size: 0.85rem;
            }
        }

        /* Mobile Extra Small */
        @media (max-width: 320px) {
            .manual-play-prompt {
                bottom: 12px;
                right: 12px;
                left: 12px;
            }

            .prompt-card {
                padding: 16px 14px;
                gap: 10px;
                border-radius: 16px;
            }

            .prompt-icon-wrapper {
                width: 60px;
                height: 60px;
            }

            .prompt-flag {
                font-size: 2.4rem;
            }

            .prompt-title {
                font-size: 0.85rem;
                flex-direction: column;
                gap: 4px;
            }

            .prompt-subtitle {
                font-size: 0.75rem;
                line-height: 1.4;
            }

            .prompt-play-btn {
                padding: 10px 20px;
                font-size: 0.82rem;
                gap: 8px;
            }

            .prompt-close-btn {
                width: 26px;
                height: 26px;
                top: 10px;
                right: 10px;
            }
        }
        </style>
        `;

        document.body.appendChild(prompt);
    },

    /**
     * Manual play (triggered by user click)
     */
    manualPlay() {
        console.log('[CountryMusic] Manual play triggered');

        // Play HTML5 Audio
        if (this.audioPlayer) {
            this.audioPlayer.play()
                .then(() => {
                    console.log('[CountryMusic] Manual play successful');
                })
                .catch(e => {
                    console.error('[CountryMusic] Manual play failed:', e);
                });
        }
        // Fallback to YouTube player
        else if (this.player && this.isPlayerReady) {
            this.player.playVideo();
        } else {
            console.error('[CountryMusic] No player available');
            return;
        }

        // Remove prompt
        const prompt = document.getElementById('manualPlayPrompt');
        if (prompt) {
            prompt.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => prompt.remove(), 300);
        }

        // Show controller
        this.createMusicController();
    },

    /**
     * Create floating music controller (Modern & Professional)
     */
    createMusicController() {
        // Remove existing controller
        const existing = document.getElementById('musicController');
        if (existing) existing.remove();

        const controller = document.createElement('div');
        controller.id = 'musicController';
        controller.innerHTML = `
        <div class="music-controller">
            <div class="music-wave-bg"></div>

            <div class="music-info-section">
                <div class="music-album-art">
                    <div class="album-art-inner" style="background: ${this.currentCountry.gradient};">
                        <div class="music-flag-large">${this.currentCountry.flag}</div>
                    </div>
                    <div class="music-playing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>

                <div class="music-meta">
                    <div class="music-title-wrapper">
                        <i class="fas fa-music music-note-icon"></i>
                        <div class="music-title">${this.currentCountry.music.title}</div>
                    </div>
                    <div class="music-artist">
                        <i class="fas fa-globe"></i>
                        <span>${this.currentCountry.name}</span>
                    </div>
                </div>
            </div>

            <div class="music-controls-section">
                <button id="musicPlayPause" class="music-ctrl-btn primary-btn"
                        onclick="CountryMusic.togglePlayPause()"
                        title="Play/Pause">
                    <i class="fas fa-pause"></i>
                </button>
                <button id="musicVolume" class="music-ctrl-btn"
                        onclick="CountryMusic.toggleMute()"
                        title="Mute/Unmute">
                    <i class="fas fa-volume-up"></i>
                </button>
                <button class="music-ctrl-btn"
                        onclick="CountryMusic.changeCountry()"
                        title="Ganti Negara">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>

            <button class="music-close-btn" onclick="CountryMusic.hideController()" title="Sembunyikan">
                <i class="fas fa-times"></i>
            </button>
        </div>


        <style>
        /* Main Controller */
        .music-controller {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%);
            border-radius: 20px;
            padding: 16px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12),
                        0 2px 8px rgba(0, 0, 0, 0.08);
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            z-index: 9999;
            animation: slideInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            border: 1px solid rgba(139, 92, 246, 0.1);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            width: auto;
            max-width: 420px;
            min-width: 320px;
        }

        .music-wave-bg {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg,
                rgba(139, 92, 246, 0.03) 0%,
                rgba(236, 72, 153, 0.03) 100%);
            opacity: 0.5;
            z-index: 0;
        }

        .music-info-section {
            display: flex;
            align-items: center;
            gap: 14px;
            flex: 1;
            position: relative;
            z-index: 1;
            min-width: 0;
        }

        .music-album-art {
            position: relative;
            flex-shrink: 0;
        }

        .album-art-inner {
            width: 56px;
            height: 56px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
            animation: pulseGlow 3s ease-in-out infinite;
        }

        .music-flag-large {
            font-size: 2rem;
            filter: drop-shadow(0 2px 6px rgba(0,0,0,0.15));
        }

        .music-playing-indicator {
            position: absolute;
            bottom: -4px;
            right: -4px;
            background: linear-gradient(135deg, #10B981, #059669);
            border-radius: 8px;
            padding: 4px 6px;
            display: flex;
            gap: 2px;
            align-items: flex-end;
            height: 18px;
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.4);
        }

        .music-playing-indicator span {
            width: 2px;
            background: white;
            border-radius: 2px;
            animation: soundWave 0.8s ease-in-out infinite;
        }

        .music-playing-indicator span:nth-child(1) {
            height: 8px;
            animation-delay: 0s;
        }

        .music-playing-indicator span:nth-child(2) {
            height: 12px;
            animation-delay: 0.2s;
        }

        .music-playing-indicator span:nth-child(3) {
            height: 6px;
            animation-delay: 0.4s;
        }

        .music-meta {
            flex: 1;
            min-width: 0;
        }

        .music-title-wrapper {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
        }

        .music-note-icon {
            color: #8B5CF6;
            font-size: 0.75rem;
            flex-shrink: 0;
        }

        .music-title {
            font-size: 0.9rem;
            font-weight: 700;
            color: #0F172A;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            letter-spacing: -0.2px;
        }

        .music-artist {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.8rem;
            color: #64748B;
            font-weight: 500;
        }

        .music-artist i {
            font-size: 0.7rem;
            color: #94A3B8;
        }

        .music-controls-section {
            display: flex;
            gap: 8px;
            align-items: center;
            padding-left: 16px;
            border-left: 1px solid #E2E8F0;
            position: relative;
            z-index: 1;
        }

        .music-ctrl-btn {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: none;
            background: #F1F5F9;
            color: #475569;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-size: 0.9rem;
            position: relative;
        }

        .music-ctrl-btn.primary-btn {
            background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
        }

        .music-ctrl-btn:hover {
            transform: translateY(-3px) scale(1.05);
            box-shadow: 0 6px 16px rgba(139, 92, 246, 0.35);
        }

        .music-ctrl-btn.primary-btn:hover {
            box-shadow: 0 6px 20px rgba(139, 92, 246, 0.45);
        }

        .music-ctrl-btn:active {
            transform: translateY(-1px) scale(0.95);
        }

        .music-ctrl-btn:not(.primary-btn):hover {
            background: #E2E8F0;
            color: #8B5CF6;
        }

        .music-close-btn {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            border: none;
            background: transparent;
            color: #94A3B8;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            z-index: 2;
        }

        .music-close-btn:hover {
            background: #F1F5F9;
            color: #475569;
        }

        /* Header Music Button */
        .header-music-btn {
            background: rgba(139, 92, 246, 0.1);
            border: 2px solid rgba(139, 92, 246, 0.2);
            border-radius: 12px;
            padding: 8px 12px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            align-items: center;
            gap: 8px;
            height: 40px;
            min-width: 70px;
            margin-right: 8px;
        }

        .header-music-btn:hover {
            background: rgba(139, 92, 246, 0.15);
            border-color: rgba(139, 92, 246, 0.4);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
        }

        .header-music-btn:active {
            transform: translateY(0);
        }

        .music-icon-wrapper {
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .music-flag-mini {
            font-size: 1.3rem;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1));
            animation: miniPulse 2s ease-in-out infinite;
        }

        .music-wave-mini {
            display: flex;
            gap: 2px;
            align-items: flex-end;
            height: 14px;
        }

        .music-wave-mini span {
            width: 3px;
            background: linear-gradient(180deg, #8B5CF6, #EC4899);
            border-radius: 2px;
            animation: soundWave 0.8s ease-in-out infinite;
        }

        .music-wave-mini span:nth-child(1) {
            height: 8px;
            animation-delay: 0s;
        }

        .music-wave-mini span:nth-child(2) {
            height: 14px;
            animation-delay: 0.15s;
        }

        .music-wave-mini span:nth-child(3) {
            height: 10px;
            animation-delay: 0.3s;
        }

        /* Animations */
        @keyframes slideInUp {
            from {
                opacity: 0;
                transform: translateY(80px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes slideDown {
            from {
                opacity: 1;
                transform: translateY(0);
            }
            to {
                opacity: 0;
                transform: translateY(60px);
            }
        }

        @keyframes pulseGlow {
            0%, 100% {
                box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
            }
            50% {
                box-shadow: 0 4px 20px rgba(139, 92, 246, 0.45);
            }
        }

        @keyframes soundWave {
            0%, 100% {
                height: 40%;
            }
            50% {
                height: 100%;
            }
        }

        @keyframes miniPulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.05);
            }
        }

        @keyframes pulseRing {
            0% {
                transform: translate(-50%, -50%) scale(0.9);
                opacity: 1;
            }
            50% {
                transform: translate(-50%, -50%) scale(1.3);
                opacity: 0.3;
            }
            100% {
                transform: translate(-50%, -50%) scale(1.5);
                opacity: 0;
            }
        }

        @keyframes bounce {
            0%, 100% {
                transform: translateX(-50%) translateY(0);
            }
            50% {
                transform: translateX(-50%) translateY(-5px);
            }
        }

        /* Large Desktop */
        @media (min-width: 1200px) {
            .music-controller {
                max-width: 450px;
            }
        }

        /* Tablet & Landscape */
        @media (max-width: 1024px) {
            .music-controller {
                right: 16px;
                bottom: 16px;
                max-width: 400px;
            }
        }

        /* Tablet Portrait */
        @media (max-width: 768px) {
            .music-controller {
                right: 16px;
                left: 16px;
                bottom: 90px;
                max-width: none;
                min-width: unset;
                padding: 14px;
                gap: 14px;
            }

            .music-info-section {
                flex: 1;
                min-width: 0;
                gap: 12px;
            }

            .music-controls-section {
                padding-left: 12px;
                gap: 6px;
                flex-shrink: 0;
            }

            .music-ctrl-btn {
                width: 38px;
                height: 38px;
                font-size: 0.85rem;
            }

            .album-art-inner {
                width: 52px;
                height: 52px;
            }

            .music-flag-large {
                font-size: 1.9rem;
            }
        }

        /* Mobile Large (landscape phones) */
        @media (max-width: 640px) {
            .music-controller {
                bottom: 85px;
                right: 14px;
                left: 14px;
                padding: 12px;
                gap: 12px;
                border-radius: 18px;
            }

            .music-info-section {
                gap: 10px;
            }

            .album-art-inner {
                width: 50px;
                height: 50px;
            }

            .music-flag-large {
                font-size: 1.8rem;
            }

            .music-title {
                font-size: 0.85rem;
            }

            .music-artist {
                font-size: 0.75rem;
            }

            .music-artist i {
                font-size: 0.65rem;
            }

            .music-controls-section {
                padding-left: 10px;
                gap: 5px;
            }

            .music-ctrl-btn {
                width: 36px;
                height: 36px;
                font-size: 0.8rem;
            }
        }

        /* Mobile Standard */
        @media (max-width: 480px) {
            .music-controller {
                bottom: 80px;
                right: 12px;
                left: 12px;
                padding: 10px;
                gap: 10px;
                border-radius: 16px;
            }

            .music-info-section {
                gap: 8px;
            }

            .album-art-inner {
                width: 46px;
                height: 46px;
                border-radius: 10px;
            }

            .music-flag-large {
                font-size: 1.65rem;
            }

            .music-playing-indicator {
                bottom: -3px;
                right: -3px;
                padding: 3px 5px;
                height: 16px;
            }

            .music-playing-indicator span {
                width: 2px;
            }

            .music-title-wrapper {
                gap: 6px;
            }

            .music-note-icon {
                font-size: 0.7rem;
            }

            .music-title {
                font-size: 0.8rem;
            }

            .music-artist {
                font-size: 0.7rem;
            }

            .music-controls-section {
                padding-left: 8px;
                gap: 4px;
            }

            .music-ctrl-btn {
                width: 34px;
                height: 34px;
                font-size: 0.75rem;
            }

            .music-close-btn {
                width: 22px;
                height: 22px;
                top: 6px;
                right: 6px;
                font-size: 0.7rem;
            }

            .header-music-btn {
                padding: 6px 10px;
                min-width: 60px;
                height: 36px;
                margin-right: 6px;
            }

            .music-flag-mini {
                font-size: 1.2rem;
            }

            .music-wave-mini {
                height: 12px;
            }

            .music-wave-mini span {
                width: 2.5px;
            }

            .music-wave-mini span:nth-child(2) {
                height: 12px;
            }
        }

        /* Mobile Small */
        @media (max-width: 375px) {
            .music-controller {
                padding: 10px;
                gap: 8px;
            }

            .music-info-section {
                gap: 8px;
            }

            .album-art-inner {
                width: 44px;
                height: 44px;
            }

            .music-flag-large {
                font-size: 1.5rem;
            }

            .music-meta {
                min-width: 0;
                max-width: 150px;
            }

            .music-title {
                font-size: 0.75rem;
            }

            .music-artist {
                font-size: 0.68rem;
            }

            .music-controls-section {
                gap: 4px;
                padding-left: 6px;
            }

            .music-ctrl-btn {
                width: 32px;
                height: 32px;
                font-size: 0.7rem;
            }
        }

        /* Mobile Extra Small */
        @media (max-width: 320px) {
            .music-controller {
                padding: 8px;
                gap: 6px;
                flex-wrap: wrap;
                justify-content: center;
            }

            .music-info-section {
                width: 100%;
                justify-content: center;
                gap: 8px;
            }

            .album-art-inner {
                width: 40px;
                height: 40px;
            }

            .music-flag-large {
                font-size: 1.4rem;
            }

            .music-meta {
                max-width: 180px;
                text-align: center;
            }

            .music-title-wrapper {
                justify-content: center;
            }

            .music-artist {
                justify-content: center;
            }

            .music-controls-section {
                width: 100%;
                justify-content: center;
                padding-left: 0;
                border-left: none;
                border-top: 1px solid #E2E8F0;
                padding-top: 8px;
                margin-top: 4px;
            }

            .music-ctrl-btn {
                width: 36px;
                height: 36px;
            }

            .music-close-btn {
                display: none;
            }
        }
        </style>
        `;

        document.body.appendChild(controller);

        // Also create header button for when hidden
        this.createHeaderMusicButton();
    },

    /**
     * Create header music button
     */
    createHeaderMusicButton() {
        // Remove existing
        const existing = document.getElementById('headerMusicBtn');
        if (existing) existing.remove();

        const headerBtn = document.createElement('button');
        headerBtn.id = 'headerMusicBtn';
        headerBtn.className = 'header-music-btn';
        headerBtn.style.display = 'none';
        headerBtn.onclick = () => this.showController();
        headerBtn.innerHTML = `
            <div class="music-icon-wrapper">
                <div class="music-flag-mini">${this.currentCountry.flag}</div>
                <div class="music-wave-mini">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;

        // Insert into header-right, before language toggle
        const headerRight = document.querySelector('.header-right');
        const langBtn = document.getElementById('langToggleBtn');
        if (headerRight && langBtn) {
            headerRight.insertBefore(headerBtn, langBtn);
        }
    },

    /**
     * Hide controller and show header button
     */
    hideController() {
        const controller = document.getElementById('musicController');
        const headerBtn = document.getElementById('headerMusicBtn');

        if (controller) {
            controller.style.animation = 'slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            setTimeout(() => {
                controller.style.display = 'none';
                if (headerBtn) {
                    headerBtn.style.display = 'flex';
                    headerBtn.style.animation = 'fadeIn 0.3s ease';
                }
            }, 400);
        }

        // Show toast notification
        if (typeof Utils !== 'undefined') {
            Utils.showToast('🎵 Music controller disembunyikan. Klik icon musik di header untuk menampilkan.', 'info', 3000);
        }
    },

    /**
     * Show controller from header button
     */
    showController() {
        const controller = document.getElementById('musicController');
        const headerBtn = document.getElementById('headerMusicBtn');

        if (headerBtn) {
            headerBtn.style.animation = 'fadeOut 0.2s ease';
            setTimeout(() => {
                headerBtn.style.display = 'none';
            }, 200);
        }

        if (controller) {
            controller.style.display = 'flex';
            controller.style.animation = 'slideInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        }
    },

    /**
     * Toggle Play/Pause
     */
    togglePlayPause() {
        const btn = document.getElementById('musicPlayPause');
        const icon = btn?.querySelector('i');
        const miniIcon = document.getElementById('miniPlayPauseIcon');

        // HTML5 Audio
        if (this.audioPlayer) {
            if (this.audioPlayer.paused) {
                this.audioPlayer.play();
                if (icon) icon.className = 'fas fa-pause';
                if (miniIcon) miniIcon.className = 'fas fa-pause';
            } else {
                this.audioPlayer.pause();
                if (icon) icon.className = 'fas fa-play';
                if (miniIcon) miniIcon.className = 'fas fa-play';
            }
            return;
        }

        // YouTube fallback
        if (!this.player || !this.isPlayerReady) return;

        if (this.player.getPlayerState() === YT.PlayerState.PLAYING) {
            this.player.pauseVideo();
            if (icon) icon.className = 'fas fa-play';
            if (miniIcon) miniIcon.className = 'fas fa-play';
        } else {
            this.player.playVideo();
            if (icon) icon.className = 'fas fa-pause';
            if (miniIcon) miniIcon.className = 'fas fa-pause';
        }
    },

    /**
     * Toggle Mute
     */
    toggleMute() {
        const btn = document.getElementById('musicVolume');
        const icon = btn?.querySelector('i');

        // HTML5 Audio
        if (this.audioPlayer) {
            if (this.audioPlayer.muted) {
                this.audioPlayer.muted = false;
                this.audioPlayer.volume = this.volumeLevel;
                if (icon) icon.className = 'fas fa-volume-up';
            } else {
                this.audioPlayer.muted = true;
                if (icon) icon.className = 'fas fa-volume-mute';
            }
            return;
        }

        // YouTube fallback
        if (!this.player || !this.isPlayerReady) return;

        if (this.player.isMuted()) {
            this.player.unMute();
            this.player.setVolume(this.volumeLevel * 100);
            if (icon) icon.className = 'fas fa-volume-up';
        } else {
            this.player.mute();
            if (icon) icon.className = 'fas fa-volume-mute';
        }
    },

    /**
     * Set volume (0-1)
     */
    setVolume(volume) {
        this.volumeLevel = Math.max(0, Math.min(1, volume));

        // HTML5 Audio
        if (this.audioPlayer) {
            this.audioPlayer.volume = this.volumeLevel;
        }

        // YouTube fallback
        if (this.player && this.isPlayerReady) {
            this.player.setVolume(this.volumeLevel * 100);
        }
    },

    /**
     * Change country selection
     */
    changeCountry() {
        console.log('[CountryMusic] Changing country selection');

        // Stop current music
        this.stop();

        // Show country selection modal
        this.showCountrySelection();

        if (typeof Utils !== 'undefined') {
            Utils.showToast('Pilih negara baru untuk mengganti musik', 'info', 3000);
        }
    },

    /**
     * Reset country preference (for testing)
     */
    async resetCountry() {
        const user = auth?.currentUser;
        if (!user) return;

        try {
            await db.collection('users').doc(user.uid).update({
                country: firebase.firestore.FieldValue.delete(),
                countryName: firebase.firestore.FieldValue.delete()
            });

            console.log('[CountryMusic] Country preference reset');

            // Stop music
            this.stop();

            // Show selection modal
            this.showCountrySelection();

            if (typeof Utils !== 'undefined') {
                Utils.showToast('Pilihan negara direset. Pilih negara baru.', 'success');
            }
        } catch (error) {
            console.error('[CountryMusic] Error resetting country:', error);
        }
    },

    /**
     * Skip music (don't save country)
     */
    skipMusic() {
        console.log('[CountryMusic] User skipped music');
        const modal = document.getElementById('countrySelectionModal');
        if (modal) {
            modal.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => modal.remove(), 300);
        }

        // Show toast
        if (typeof Utils !== 'undefined') {
            Utils.showToast('Musik dilewati. Kamu bisa mengaktifkannya nanti di pengaturan.', 'info', 3000);
        }
    },

    /**
     * Try fallback video if primary fails
     */
    async tryFallback() {
        if (!this.currentCountry || !this.currentCountry.music.fallbacks) {
            console.error('[CountryMusic] No fallback videos available');
            return false;
        }

        const fallbacks = this.currentCountry.music.fallbacks;
        console.log('[CountryMusic] Trying fallback videos:', fallbacks);

        for (let i = 0; i < fallbacks.length; i++) {
            const videoId = fallbacks[i];
            console.log(`[CountryMusic] Trying fallback ${i + 1}/${fallbacks.length}: ${videoId}`);

            // Update video ID
            this.currentCountry.music.videoId = videoId;

            // Try to play
            try {
                this.playTraditionalMusic();
                // Wait a bit to see if it works
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Check if player state is ok
                if (this.player && this.player.getPlayerState() !== -1) {
                    console.log('[CountryMusic] Fallback video works!');
                    return true;
                }
            } catch (e) {
                console.error(`[CountryMusic] Fallback ${i + 1} failed:`, e);
            }
        }

        console.error('[CountryMusic] All fallback videos failed');
        return false;
    },

    /**
     * Stop music
     */
    stop() {
        // Stop HTML5 Audio
        if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.audioPlayer = null;
        }

        // Stop YouTube
        if (this.player && this.isPlayerReady) {
            this.player.stopVideo();
        }

        const controller = document.getElementById('musicController');
        if (controller) controller.remove();
    }
};

// Make globally available
window.CountryMusic = CountryMusic;
