/**
 * ScentraVN Serenity - Assessment Module
 * Handles PHQ-9 (Depression), UCLA Loneliness Scale, PSP-5 (Stress), SEES-10 (Eating Response)
 * With progress persistence and Firestore storage
 */

const Assessment = {
    // PHQ-9 Questions — bilingual (id · en)
    _phq9: {
        en: [
            "Little interest or pleasure in doing things",
            "Feeling down, depressed, or hopeless",
            "Trouble falling or staying asleep, or sleeping too much",
            "Feeling tired or having little energy",
            "Poor appetite or overeating",
            "Feeling bad about yourself - or that you are a failure or have let yourself or your family down",
            "Trouble concentrating on things, such as reading the newspaper or watching television",
            "Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual",
            "Thoughts that you would be better off dead, or of hurting yourself"
        ],
        id: [
            "Kurang berminat atau bergairah dalam melakukan sesuatu",
            "Merasa murung, sedih, atau putus asa",
            "Sulit tidur atau mudah terbangun, atau terlalu banyak tidur",
            "Merasa lelah atau kurang berenergi",
            "Kurang nafsu makan atau makan berlebihan",
            "Merasa buruk tentang diri sendiri — merasa gagal atau telah mengecewakan diri sendiri atau keluarga",
            "Sulit berkonsentrasi pada sesuatu, seperti membaca koran atau menonton televisi",
            "Bergerak atau berbicara sangat lambat sampai diperhatikan orang lain. Atau sebaliknya — merasa gelisah atau resah sehingga lebih banyak bergerak dari biasanya",
            "Berpikir bahwa Anda lebih baik mati, atau ingin menyakiti diri sendiri"
        ]
    },
    // UCLA Loneliness Scale V3 (20 items) — bilingual
    _ucla: {
        en: [
            "How often do you feel that you are 'in tune' with the people around you?", // *Reversed
            "How often do you feel that you lack companionship?",
            "How often do you feel that there is no one you can turn to?",
            "How often do you feel alone?",
            "How often do you feel part of a group of friends?", // *Reversed
            "How often do you feel that you have a lot in common with the people around you?", // *Reversed
            "How often do you feel that you are no longer close to anyone?",
            "How often do you feel that your interests and ideas are not shared by those around you?",
            "How often do you feel outgoing and friendly?", // *Reversed
            "How often do you feel close to people?", // *Reversed
            "How often do you feel left out?",
            "How often do you feel that your relationships with others are not meaningful?",
            "How often do you feel that no one really knows you well?",
            "How often do you feel isolated from others?",
            "How often do you feel you can find companionship when you want it?", // *Reversed
            "How often do you feel that there are people who really understand you?", // *Reversed
            "How often do you feel shy?",
            "How often do you feel that people are around you but not with you?",
            "How often do you feel that there are people you can talk to?", // *Reversed
            "How often do you feel that there are people you can turn to?" // *Reversed
        ],
        id: [
            "Seberapa sering Anda merasa \"sejalan\" dengan orang-orang di sekitar Anda?", // *Reversed
            "Seberapa sering Anda merasa kekurangan teman?",
            "Seberapa sering Anda merasa tidak ada orang yang bisa Anda andalkan?",
            "Seberapa sering Anda merasa sendirian?",
            "Seberapa sering Anda merasa menjadi bagian dari sekelompok teman?", // *Reversed
            "Seberapa sering Anda merasa memiliki banyak kesamaan dengan orang di sekitar Anda?", // *Reversed
            "Seberapa sering Anda merasa tidak lagi dekat dengan siapa pun?",
            "Seberapa sering Anda merasa minat dan gagasan Anda tidak dibagikan oleh orang di sekitar Anda?",
            "Seberapa sering Anda merasa mudah bergaul dan ramah?", // *Reversed
            "Seberapa sering Anda merasa dekat dengan orang lain?", // *Reversed
            "Seberapa sering Anda merasa tersisihkan?",
            "Seberapa sering Anda merasa hubungan Anda dengan orang lain tidak bermakna?",
            "Seberapa sering Anda merasa tidak ada yang benar-benar mengenal Anda dengan baik?",
            "Seberapa sering Anda merasa terisolasi dari orang lain?",
            "Seberapa sering Anda merasa bisa menemukan teman saat Anda menginginkannya?", // *Reversed
            "Seberapa sering Anda merasa ada orang yang benar-benar memahami Anda?", // *Reversed
            "Seberapa sering Anda merasa malu?",
            "Seberapa sering Anda merasa orang-orang ada di sekitar Anda tetapi tidak bersama Anda?",
            "Seberapa sering Anda merasa ada orang yang bisa Anda ajak bicara?", // *Reversed
            "Seberapa sering Anda merasa ada orang yang bisa Anda andalkan?" // *Reversed
        ]
    },
    uclaReversedIndices: [0, 4, 5, 8, 9, 14, 15, 18, 19],

    // PSP-5 — Perceived Stress Scale (5-item, scale 1–6) — bilingual
    _psp5: {
        en: [
            "How often have you felt suddenly disturbed by something unexpected?",
            "How often have you felt unable to control the important things in your life?",
            "How often have you felt nervous and under pressure?",
            "How often have you successfully coped with the difficulties you faced?",  // reversed
            "How often have you felt confident in handling your personal problems?" // reversed
        ],
        id: [
            "Seberapa sering Anda merasa terganggu secara tiba-tiba oleh sesuatu yang tidak terduga?",
            "Seberapa sering Anda merasa tidak mampu mengendalikan hal-hal penting dalam hidup Anda?",
            "Seberapa sering Anda merasa gugup dan penuh tekanan?",
            "Seberapa sering Anda berhasil mengatasi berbagai kesulitan yang Anda hadapi?",  // reversed
            "Seberapa sering Anda merasa percaya diri dalam menghadapi masalah pribadi Anda?" // reversed
        ]
    },
    psp5ReversedIndices: [3, 4], // item 4 & 5 di-reverse (7 - nilai)
    _psp5Labels: {
        en: ['1 — Never', '2 — Almost Never', '3 — Sometimes', '4 — Fairly Often', '5 — Often', '6 — Almost Always'],
        id: ['1 — Tidak Pernah', '2 — Hampir Tidak Pernah', '3 — Kadang-kadang', '4 — Cukup Sering', '5 — Sering', '6 — Hampir Selalu'],
    },

    // SEES-10 — Salzburg Emotional Eating Scale (10-item, scale 1–5) — bilingual
    _sees10: {
        en: [
            "When I am anxious, I eat more than usual",
            "When I feel angry, I tend to eat right away",
            "When I feel depressed, I eat more",
            "When I feel disappointed, I overeat",
            "When I feel afraid, I eat more",
            "When I feel happy, I also eat more",
            "When I feel bored, I tend to snack excessively",
            "When I feel pressured by life's stress, I eat more",
            "Food is my main way of coping with negative emotions",
            "I eat in response to my mood, not because I'm truly hungry",
        ],
        id: [
            "Saat saya sedang cemas, saya makan lebih banyak dari biasanya",
            "Saat saya merasa marah, saya cenderung langsung makan",
            "Saat saya sedang merasa depresi, saya makan lebih banyak",
            "Saat saya merasa kecewa, saya makan berlebihan",
            "Saat saya merasa takut, saya makan lebih banyak",
            "Saat saya sedang merasa senang, saya juga makan lebih banyak",
            "Saat saya merasa bosan, saya cenderung ngemil berlebihan",
            "Saat saya merasa tertekan oleh tekanan hidup, saya makan lebih banyak",
            "Makanan adalah cara utama saya mengatasi emosi negatif",
            "Saya makan sebagai respons terhadap suasana hati, bukan karena benar-benar lapar",
        ]
    },
    _sees10Labels: {
        en: ['1 — Never', '2 — Rarely', '3 — Sometimes', '4 — Often', '5 — Always'],
        id: ['1 — Tidak Pernah', '2 — Jarang', '3 — Kadang-kadang', '4 — Sering', '5 — Selalu'],
    },

    // ── Active-language helpers (length identical across languages) ──
    lang() { try { return (window.I18n && I18n.getLang && I18n.getLang() === 'en') ? 'en' : 'id'; } catch (e) { return 'id'; } },
    get phq9()        { return this._phq9[this.lang()]        || this._phq9.id; },
    get ucla()        { return this._ucla[this.lang()]        || this._ucla.id; },
    get psp5()        { return this._psp5[this.lang()]        || this._psp5.id; },
    get sees10()      { return this._sees10[this.lang()]      || this._sees10.id; },
    get psp5Labels()  { return this._psp5Labels[this.lang()]  || this._psp5Labels.id; },
    get sees10Labels(){ return this._sees10Labels[this.lang()]|| this._sees10Labels.id; },

    currentStage: 'intro', // intro, phq9, ucla, psp5, sees10, result
    currentIndex: 0,
    answers: {
        phq9:  [],
        ucla:  [],
        psp5:  [],
        sees10: [],
    },

    // Storage key for localStorage
    STORAGE_KEY: 'scentravn_assessment_progress',

    // ── Bilingual UI strings ─────────────────────────────────────
    _ui: {
        intro_title:   { id: 'Selamat Datang!', en: 'Welcome!' },
        intro_body:    { id: 'Untuk mempersonalisasi SCENTRAVN sesuai kondisi Anda, kami perlu menanyakan beberapa hal (PHQ-9 & UCLA Loneliness Scale). Kerahasiaan data Anda terjamin.', en: 'To personalize SCENTRAVN for your condition, we need to ask you a few questions (PHQ-9 & UCLA Loneliness Scale). Your data is kept confidential.' },
        intro_start:   { id: 'Mulai Evaluasi', en: 'Start Assessment' },

        badge_phq9:    { id: 'Bagian 1: Kesejahteraan Mental', en: 'Part 1: Mental Well-being' },
        badge_ucla:    { id: 'Bagian 2: Interaksi Sosial', en: 'Part 2: Social Interaction' },
        badge_psp5:    { id: 'Bagian 3: Tingkat Stres — PSP-5', en: 'Part 3: Stress Level — PSP-5' },
        badge_sees10:  { id: 'Bagian 4: Respons Makan — SEES-10', en: 'Part 4: Eating Response — SEES-10' },

        prompt_phq9:   { id: 'Dalam 2 minggu terakhir, seberapa sering Anda terganggu oleh masalah berikut?', en: 'Over the last 2 weeks, how often have you been bothered by the following problems?' },
        prompt_ucla:   { id: 'Seberapa sering Anda merasakan hal berikut?', en: 'How often do you feel the following?' },
        prompt_psp5:   { id: 'Dalam sebulan terakhir, pilih yang paling sesuai dengan kondisi Anda.', en: 'Over the last month, choose what best fits your situation.' },
        prompt_sees10: { id: 'Secara umum, seberapa sering Anda mengalami hal berikut?', en: 'In general, how often do you experience the following?' },

        opt_phq9:      { id: ['Tidak pernah sama sekali', 'Beberapa hari', 'Lebih dari separuh waktu', 'Hampir setiap hari'],
                         en: ['Not at all', 'Several days', 'More than half the days', 'Nearly every day'] },
        opt_ucla:      { id: ['Tidak pernah', 'Jarang', 'Kadang-kadang', 'Sering'],
                         en: ['Never', 'Rarely', 'Sometimes', 'Often'] },

        prev:          { id: 'Pertanyaan Sebelumnya', en: 'Previous Question' },
        saving:        { id: 'Menyimpan hasil evaluasi Anda...', en: 'Saving your assessment results...' },

        saved_title:   { id: 'Hasil Evaluasi Terakhir', en: 'Latest Assessment Result' },
        saved_redo:    { id: 'Ulangi Evaluasi', en: 'Retake Assessment' },
        to_dashboard:  { id: 'Ke Dashboard', en: 'To Dashboard' },
        skip_dashboard:{ id: 'Lewati ke Dashboard', en: 'Skip to Dashboard' },

        result_title:  { id: 'Evaluasi Selesai', en: 'Assessment Complete' },
        result_thanks: { id: 'Terima kasih. Sistem kami telah menyesuaikan fitur SCENTRAVN khusus untuk kondisi Anda.', en: 'Thank you. Our system has tailored SCENTRAVN features specifically for your condition.' },
        mental_score:  { id: 'Skor Mental', en: 'Mental Score' },
        social_link:   { id: 'Koneksi Sosial', en: 'Social Link' },

        rec_severe_title: { id: 'Bantuan Tersedia Untuk Anda', en: 'Help Is Available For You' },
        rec_severe_body:  { id: 'Skor Anda menunjukkan tingkat beban mental yang tinggi. SCENTRAVN menyarankan Anda berbicara dengan tenaga profesional.', en: 'Your score indicates a high level of mental burden. SCENTRAVN recommends speaking with a professional.' },
        rec_severe_btn:   { id: 'Buka Support Hub', en: 'Open Support Hub' },
        rec_mod_title:    { id: 'Rekomendasi Fitur', en: 'Feature Recommendation' },
        rec_mod_body:     { id: 'ScentraVN Chat AI siap menemani Anda mengobrol dan meringankan beban pikiran Anda hari ini.', en: 'ScentraVN Chat AI is ready to chat with you and ease your mind today.' },
        rec_mod_btn:      { id: 'Mulai Percakapan AI', en: 'Start AI Conversation' },
        rec_good_title:   { id: 'Pertahankan Kondisi Anda!', en: 'Keep It Up!' },
        rec_good_body:    { id: 'Kondisi mental Anda terpantau baik. Gunakan fitur Sleep Lab dan Meditasi untuk menjaga kualitas istirahat Anda.', en: 'Your mental condition looks good. Use the Sleep Lab and Meditation features to maintain your rest quality.' },
        rec_good_btn:     { id: 'Lanjutkan ke Dashboard', en: 'Continue to Dashboard' },

        synascore:        { id: 'SynaScore (Perpaduan Bio-Psiko)', en: 'SynaScore (Bio-Psycho Fusion)' },
        fusion_sensor:    { id: 'Sensor + Psikometrik', en: 'Sensor + Psychometric' },
        fusion_psy_only:  { id: 'Psikometrik saja (hubungkan sensor untuk akurasi lebih)', en: 'Psychometric only (connect a sensor for better accuracy)' },
        discordance_title:{ id: 'Deteksi Diskordan', en: 'Discordance Detected' },

        fail_title:    { id: 'Gagal Menyimpan', en: 'Failed to Save' },
        fail_body:     { id: 'Data tersimpan lokal. Coba simpan ulang atau lihat hasil.', en: 'Data saved locally. Try saving again or view results.' },
        fail_retry:    { id: 'Coba Simpan Ulang', en: 'Try Saving Again' },
        fail_viewonly: { id: 'Lihat Hasil Saja', en: 'View Results Only' },
    },

    // Localized category labels (canonical id-string -> bilingual display)
    _cat: {
        'Minimal': { id: 'Minimal', en: 'Minimal' },
        'Ringan': { id: 'Ringan', en: 'Mild' },
        'Sedang': { id: 'Sedang', en: 'Moderate' },
        'Sedang-Berat': { id: 'Sedang-Berat', en: 'Moderately Severe' },
        'Berat': { id: 'Berat', en: 'Severe' },
        'Low': { id: 'Rendah', en: 'Low' },
        'Moderate': { id: 'Sedang', en: 'Moderate' },
        'Moderately High': { id: 'Cukup Tinggi', en: 'Moderately High' },
        'High': { id: 'Tinggi', en: 'High' },
        'Stres Rendah': { id: 'Stres Rendah', en: 'Low Stress' },
        'Stres Sedang': { id: 'Stres Sedang', en: 'Moderate Stress' },
        'Stres Tinggi': { id: 'Stres Tinggi', en: 'High Stress' },
        'Under Eating': { id: 'Makan Kurang', en: 'Under Eating' },
        'Normal': { id: 'Normal', en: 'Normal' },
        'Over Eating / Emotional Eating': { id: 'Makan Berlebih / Emosional', en: 'Over Eating / Emotional Eating' },
    },

    /** Get a localized UI string by key. */
    ui(key) { const e = this._ui[key]; return e ? (e[this.lang()] ?? e.id) : key; },
    /** Localize a stored category value for display. */
    catLabel(cat) { const e = this._cat[cat]; return e ? (e[this.lang()] ?? e.id) : cat; },

    /** Switch language without leaving the assessment, then re-render in place. */
    setLang(lang) {
        lang = (lang === 'en') ? 'en' : 'id';
        try {
            if (window.I18n) {
                I18n.currentLang = lang;
                localStorage.setItem('scentravn_lang', lang);
                const label = document.getElementById('langToggleLabel');
                if (label) label.textContent = lang.toUpperCase();
            }
        } catch (e) {}
        this._renderLangToggle();
        this._rerender();
    },

    /** Re-render whatever stage is currently active (preserves progress). */
    _rerender() {
        switch (this.currentStage) {
            case 'intro':  this.renderIntro(); break;
            case 'result':
                if (this._resultArgs) this.showResults(...this._resultArgs);
                else if (this._savedArgs) this.showSavedResults(this._savedArgs);
                break;
            default: this.renderQuestion();
        }
    },

    /** Paint the ID/EN toggle pill into its slot in the view. */
    _renderLangToggle() {
        const el = document.getElementById('assessmentLangToggle');
        if (!el) return;
        const l = this.lang();
        el.innerHTML =
            `<button type="button" class="assess-lang-btn ${l === 'id' ? 'active' : ''}" onclick="Assessment.setLang('id')">ID</button>` +
            `<button type="button" class="assess-lang-btn ${l === 'en' ? 'active' : ''}" onclick="Assessment.setLang('en')">EN</button>`;
    },

    /**
     * Initialize Assessment - check for existing progress or completed assessment
     */
    async init() {
        this._renderLangToggle();
        const user = auth?.currentUser;
        if (!user) {
            this.renderIntro();
            return;
        }

        // First, check if user has completed assessment in Firestore
        try {
            const latestAssessment = await this.getLatestAssessment(user.uid);
            if (latestAssessment) {
                // User has completed assessment before - show results
                this.showSavedResults(latestAssessment);
                return;
            }
        } catch (error) {
            console.error('Error checking assessment:', error);
        }

        // Check for in-progress assessment in localStorage
        const savedProgress = this.loadProgress();
        if (savedProgress && savedProgress.userId === user.uid) {
            // Resume from saved progress
            this.currentStage = savedProgress.currentStage;
            this.currentIndex = savedProgress.currentIndex;
            this.answers = savedProgress.answers;

            if (this.currentStage === 'phq9' || this.currentStage === 'ucla') {
                this.renderQuestion();
            } else {
                this.renderIntro();
            }
        } else {
            // No progress - show intro
            this.renderIntro();
        }
    },

    /**
     * Get latest completed assessment from Firestore
     */
    async getLatestAssessment(userId) {
        if (typeof db === 'undefined' || typeof FirebaseService === 'undefined') return null;

        try {
            const snapshot = await FirebaseService.userCol(userId, 'assessments')
                .orderBy('timestamp', 'desc')
                .limit(1)
                .get();

            if (snapshot.empty) return null;

            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        } catch (error) {
            console.error('Error getting assessment:', error);
            return null;
        }
    },

    /**
     * Render intro screen
     */
    renderIntro() {
        this.currentStage = 'intro';
        const container = document.getElementById('assessmentContent');
        if (!container) return;

        // Reset progress bar
        const progressBar = document.getElementById('assessmentProgress');
        if (progressBar) progressBar.style.width = '0%';

        // Hide progress wrapper on intro
        const progressWrapper = document.getElementById('assessmentProgressWrapper');
        if (progressWrapper) progressWrapper.style.display = 'none';

        container.innerHTML = `
            <div style="text-align: center; animation: fadeIn 0.5s;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%); border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; color: white; font-size: 2.5rem; box-shadow: 0 10px 25px rgba(139, 92, 246, 0.3);">
                    <i class="fas fa-clipboard-list"></i>
                </div>
                <h2 style="font-size: var(--text-2xl); color: var(--text-primary); margin-bottom: 12px;">${this.ui('intro_title')}</h2>
                <p style="color: var(--text-secondary); margin-bottom: 32px; line-height: 1.6;">${this.ui('intro_body')}</p>
                <button class="btn btn-primary" style="width: 100%; justify-content: center; padding: 16px; font-size: 1.1rem;" onclick="Assessment.start()">${this.ui('intro_start')}</button>
            </div>
        `;
    },

    /**
     * Show saved results from Firestore
     */
    showSavedResults(assessment) {
        // Remember stage + payload so language toggle can re-render this screen
        this.currentStage = 'result';
        this._savedArgs = assessment;
        this._resultArgs = null;

        const phq9Score = assessment.phq9?.score ?? 0;
        const phq9Category = assessment.phq9?.category ?? 'Unknown';
        const uclaScore = assessment.ucla?.score ?? 0;
        const uclaCategory = assessment.ucla?.category ?? 'Unknown';

        // Format date in the active language
        const locale = this.lang() === 'en' ? 'en-US' : 'id-ID';
        let dateStr = 'Unknown';
        if (assessment.timestamp?.toDate) {
            dateStr = assessment.timestamp.toDate().toLocaleDateString(locale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } else if (assessment.date) {
            dateStr = new Date(assessment.date).toLocaleDateString(locale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        }

        // Cache results for intervention engine
        this.cacheAssessmentResults(phq9Score, phq9Category, uclaScore, uclaCategory);

        const container = document.getElementById('assessmentContent');
        if (!container) return;

        // Hide progress bar
        const progressWrapper = document.getElementById('assessmentProgressWrapper');
        if (progressWrapper) progressWrapper.style.display = 'none';

        // Calculate fusion score
        const fusion = this.calculateFusionScore(phq9Score, uclaScore);

        container.innerHTML = `
            <div style="text-align: center; animation: fadeIn 0.5s;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, var(--primary-400), var(--primary-600)); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; color: white; font-size: 2.5rem; box-shadow: 0 10px 25px rgba(139, 92, 246, 0.3);">
                    <i class="fas fa-chart-pie"></i>
                </div>
                <h2 style="font-size: var(--text-2xl); color: var(--text-primary); margin-bottom: 8px;">${this.ui('saved_title')}</h2>
                <p style="color: var(--text-tertiary); margin-bottom: 24px; font-size: 0.9rem;">
                    <i class="fas fa-calendar-alt"></i> ${dateStr}
                </p>

                <!-- Fusion Score -->
                <div style="background: linear-gradient(135deg, ${fusion.fusionColor}15, ${fusion.fusionColor}08); padding: 20px; border-radius: 16px; border: 2px solid ${fusion.fusionColor}30; margin-bottom: 16px;">
                    <p style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">${this.ui('synascore')}</p>
                    <p style="font-size: 3rem; font-weight: 800; color: ${fusion.fusionColor}; margin-bottom: 4px;">${fusion.fusionScore}</p>
                    <p style="font-size: var(--text-sm); font-weight: 600; color: ${fusion.fusionColor};">${fusion.fusionCategory}</p>
                </div>

                <!-- Score Cards -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                    <div style="background: var(--bg-secondary); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color);">
                        <p style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">PHQ-9</p>
                        <p style="font-size: var(--text-3xl); font-weight: 800; color: var(--primary-600); margin-bottom: 4px;">${phq9Score}</p>
                        <p style="font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary);">${this.catLabel(phq9Category)}</p>
                    </div>
                    <div style="background: var(--bg-secondary); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color);">
                        <p style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">UCLA</p>
                        <p style="font-size: var(--text-3xl); font-weight: 800; color: var(--info-600); margin-bottom: 4px;">${uclaScore}</p>
                        <p style="font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary);">${this.catLabel(uclaCategory)}</p>
                    </div>
                </div>

                <!-- Longitudinal Chart -->
                <div id="longitudinalContainer"></div>

                <!-- Actions -->
                <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 24px;">
                    <button class="btn btn-primary" style="width: 100%; justify-content: center;" onclick="Assessment.retakeAssessment()">
                        <i class="fas fa-redo"></i> ${this.ui('saved_redo')}
                    </button>
                    <button class="btn btn-outline" style="width: 100%; justify-content: center;" onclick="Router.navigate('dashboard')">
                        <i class="fas fa-home"></i> ${this.ui('to_dashboard')}
                    </button>
                </div>
            </div>
        `;

        // Render longitudinal chart
        const longitudinalContainer = document.getElementById('longitudinalContainer');
        if (longitudinalContainer) {
            this.renderLongitudinalChart(longitudinalContainer);
        }
    },

    /**
     * Retake assessment - reset and start fresh
     */
    retakeAssessment() {
        this.clearProgress();
        try { localStorage.removeItem('scentravn_assessment'); } catch (e) {}
        this.currentStage = 'intro';
        this.currentIndex = 0;
        this.answers = { phq9: [], ucla: [], psp5: [], sees10: [] };
        this.start();
    },

    /**
     * Start Assessment
     */
    start() {
        this.currentStage = 'phq9';
        this.currentIndex = 0;
        this.answers = { phq9: [], ucla: [], psp5: [], sees10: [] };
        this.saveProgress();
        this.renderQuestion();
    },

    /**
     * Save progress to localStorage
     */
    saveProgress() {
        const user = auth?.currentUser;
        if (!user) return;

        const progress = {
            userId: user.uid,
            currentStage: this.currentStage,
            currentIndex: this.currentIndex,
            answers: this.answers,
            savedAt: new Date().toISOString()
        };

        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(progress));
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    },

    /**
     * Load progress from localStorage
     */
    loadProgress() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading progress:', error);
        }
        return null;
    },

    /**
     * Clear progress from localStorage
     */
    clearProgress() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing progress:', error);
        }
    },

    /**
     * Handle Answer Selection
     */
    selectAnswer(value) {
        const stage = this.currentStage;
        if (['phq9', 'ucla', 'psp5', 'sees10'].includes(stage)) {
            this.answers[stage][this.currentIndex] = value;
            this.saveProgress();
            this.next();
        }
    },

    /**
     * Go to next question
     */
    next() {
        const stageOrder  = ['phq9', 'ucla', 'psp5', 'sees10'];
        const stageLengths = {
            phq9:   this.phq9.length,
            ucla:   this.ucla.length,
            psp5:   this.psp5.length,
            sees10: this.sees10.length,
        };
        const stage = this.currentStage;
        const maxIdx = stageLengths[stage] - 1;

        if (this.currentIndex < maxIdx) {
            this.currentIndex++;
            this.saveProgress();
            this.renderQuestion();
        } else {
            const nextStageIdx = stageOrder.indexOf(stage) + 1;
            if (nextStageIdx < stageOrder.length) {
                this.currentStage = stageOrder[nextStageIdx];
                this.currentIndex = 0;
                this.saveProgress();
                this.renderQuestion();
            } else {
                this.finish();
            }
        }
    },

    /**
     * Go to previous question
     */
    prev() {
        const stageOrder = ['phq9', 'ucla', 'psp5', 'sees10'];
        const stageLengths = {
            phq9:   this.phq9.length,
            ucla:   this.ucla.length,
            psp5:   this.psp5.length,
            sees10: this.sees10.length,
        };

        if (this.currentIndex > 0) {
            this.currentIndex--;
        } else {
            const prevStageIdx = stageOrder.indexOf(this.currentStage) - 1;
            if (prevStageIdx >= 0) {
                this.currentStage = stageOrder[prevStageIdx];
                this.currentIndex = stageLengths[this.currentStage] - 1;
            }
        }
        this.saveProgress();
        this.renderQuestion();
    },

    /**
     * Render Current Question
     */
    renderQuestion() {
        const container = document.getElementById('assessmentContent');
        if (!container) return;

        // Show progress wrapper
        const progressWrapper = document.getElementById('assessmentProgressWrapper');
        if (progressWrapper) progressWrapper.style.display = 'block';

        const stageLengths  = { phq9: this.phq9.length, ucla: this.ucla.length, psp5: this.psp5.length, sees10: this.sees10.length };
        const stageOrder    = ['phq9', 'ucla', 'psp5', 'sees10'];
        const totalQuestions = Object.values(stageLengths).reduce((s, v) => s + v, 0);
        let done = 0;
        for (const s of stageOrder) {
            if (s === this.currentStage) { done += this.currentIndex; break; }
            done += stageLengths[s];
        }
        let progress = Math.round((done / totalQuestions) * 100);

        // Update progress bar
        const progressBar = document.getElementById('assessmentProgress');
        if (progressBar) progressBar.style.width = progress + '%';

        // Check if there's a previously selected answer for this question
        const previousAnswer = this.answers[this.currentStage]?.[this.currentIndex];

        // Can go back?
        const canGoBack = !(this.currentStage === 'phq9' && this.currentIndex === 0);

        let html = '';
        if (this.currentStage === 'phq9') {
            html = `
                <div class="assessment-header" style="margin-bottom: var(--space-6); text-align: center;">
                    <span class="badge" style="background: rgba(139, 92, 246, 0.15); color: var(--primary-500); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; margin-bottom: 12px; display: inline-block;">${this.ui('badge_phq9')} (${this.currentIndex + 1}/${this.phq9.length})</span>
                    <p style="color: var(--text-tertiary); font-size: var(--text-sm);">${this.ui('prompt_phq9')}</p>
                </div>
                <div class="question-card" style="background: white; padding: var(--space-6); border-radius: var(--radius-xl); box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin-bottom: var(--space-6);">
                    <h3 style="font-size: var(--text-lg); color: var(--text-primary); margin-bottom: var(--space-6); text-align: center;">${this.phq9[this.currentIndex]}</h3>
                    <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                        ${this.ui('opt_phq9').map((lbl, v) => `
                        <button class="btn ${previousAnswer === v ? 'btn-primary' : 'btn-outline'}" style="justify-content: flex-start; text-align: left; padding: 16px;" onclick="Assessment.selectAnswer(${v})">
                            ${previousAnswer === v ? '<i class="fas fa-check-circle" style="margin-right: 8px;"></i>' : ''}${lbl}
                        </button>`).join('')}
                    </div>
                </div>
                ${canGoBack ? `
                <button class="btn btn-outline" style="width: 100%; justify-content: center; margin-top: 8px;" onclick="Assessment.prev()">
                    <i class="fas fa-arrow-left"></i> ${this.ui('prev')}
                </button>
                ` : ''}
            `;
        } else if (this.currentStage === 'ucla') {
            html = `
                <div class="assessment-header" style="margin-bottom: var(--space-6); text-align: center;">
                    <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--success-500); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; margin-bottom: 12px; display: inline-block;">${this.ui('badge_ucla')} (${this.currentIndex + 1}/${this.ucla.length})</span>
                    <p style="color: var(--text-tertiary); font-size: var(--text-sm);">${this.ui('prompt_ucla')}</p>
                </div>
                <div class="question-card" style="background: white; padding: var(--space-6); border-radius: var(--radius-xl); box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin-bottom: var(--space-6);">
                    <h3 style="font-size: var(--text-lg); color: var(--text-primary); margin-bottom: var(--space-6); text-align: center;">${this.ucla[this.currentIndex]}</h3>
                    <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                        ${this.ui('opt_ucla').map((lbl, i) => { const v = i + 1; return `
                        <button class="btn ${previousAnswer === v ? 'btn-primary' : 'btn-outline'}" style="justify-content: flex-start; text-align: left; padding: 16px;" onclick="Assessment.selectAnswer(${v})">
                            ${previousAnswer === v ? '<i class="fas fa-check-circle" style="margin-right: 8px;"></i>' : ''}${lbl}
                        </button>`; }).join('')}
                    </div>
                </div>
                <button class="btn btn-outline" style="width: 100%; justify-content: center; margin-top: 8px;" onclick="Assessment.prev()">
                    <i class="fas fa-arrow-left"></i> ${this.ui('prev')}
                </button>
            `;
        } else if (this.currentStage === 'psp5') {
            const psp5Labels = this.psp5Labels;
            html = `
                <div class="assessment-header" style="margin-bottom: var(--space-6); text-align: center;">
                    <span class="badge" style="background: rgba(239,68,68,0.12); color: #dc2626; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; margin-bottom: 12px; display: inline-block;">
                        ${this.ui('badge_psp5')} (${this.currentIndex + 1}/${this.psp5.length})
                    </span>
                    <p style="color: var(--text-tertiary); font-size: var(--text-sm);">${this.ui('prompt_psp5')}</p>
                </div>
                <div class="question-card" style="background: white; padding: var(--space-6); border-radius: var(--radius-xl); box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin-bottom: var(--space-6);">
                    <h3 style="font-size: var(--text-lg); color: var(--text-primary); margin-bottom: var(--space-6); text-align: center;">${this.psp5[this.currentIndex]}</h3>
                    <div style="display: flex; flex-direction: column; gap: var(--space-2);">
                        ${psp5Labels.map((lbl, i) => {
                            const val = i + 1;
                            const sel = previousAnswer === val;
                            return `<button class="btn ${sel ? 'btn-primary' : 'btn-outline'}" style="justify-content: flex-start; text-align: left; padding: 14px;" onclick="Assessment.selectAnswer(${val})">
                                ${sel ? '<i class="fas fa-check-circle" style="margin-right:8px;"></i>' : ''}${lbl}
                            </button>`;
                        }).join('')}
                    </div>
                </div>
                <button class="btn btn-outline" style="width: 100%; justify-content: center; margin-top: 8px;" onclick="Assessment.prev()">
                    <i class="fas fa-arrow-left"></i> ${this.ui('prev')}
                </button>
            `;
        } else if (this.currentStage === 'sees10') {
            const sees10Labels = this.sees10Labels;
            html = `
                <div class="assessment-header" style="margin-bottom: var(--space-6); text-align: center;">
                    <span class="badge" style="background: rgba(234,88,12,0.12); color: #ea580c; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; margin-bottom: 12px; display: inline-block;">
                        ${this.ui('badge_sees10')} (${this.currentIndex + 1}/${this.sees10.length})
                    </span>
                    <p style="color: var(--text-tertiary); font-size: var(--text-sm);">${this.ui('prompt_sees10')}</p>
                </div>
                <div class="question-card" style="background: white; padding: var(--space-6); border-radius: var(--radius-xl); box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin-bottom: var(--space-6);">
                    <h3 style="font-size: var(--text-lg); color: var(--text-primary); margin-bottom: var(--space-6); text-align: center;">${this.sees10[this.currentIndex]}</h3>
                    <div style="display: flex; flex-direction: column; gap: var(--space-2);">
                        ${sees10Labels.map((lbl, i) => {
                            const val = i + 1;
                            const sel = previousAnswer === val;
                            return `<button class="btn ${sel ? 'btn-primary' : 'btn-outline'}" style="justify-content: flex-start; text-align: left; padding: 14px;" onclick="Assessment.selectAnswer(${val})">
                                ${sel ? '<i class="fas fa-check-circle" style="margin-right:8px;"></i>' : ''}${lbl}
                            </button>`;
                        }).join('')}
                    </div>
                </div>
                <button class="btn btn-outline" style="width: 100%; justify-content: center; margin-top: 8px;" onclick="Assessment.prev()">
                    <i class="fas fa-arrow-left"></i> ${this.ui('prev')}
                </button>
            `;
        }

        container.innerHTML = html;
        window.scrollTo(0, 0);
    },

    /**
     * Finish Assessment, calculate scores and save to Firestore
     */
    async finish() {
        // Validate all answers
        const phq9Valid  = this.answers.phq9.length  === this.phq9.length  && this.answers.phq9.every(a  => typeof a === 'number' && a >= 0 && a <= 3);
        const uclaValid  = this.answers.ucla.length  === this.ucla.length  && this.answers.ucla.every(a  => typeof a === 'number' && a >= 1 && a <= 4);
        const psp5Valid  = this.answers.psp5.length  === this.psp5.length  && this.answers.psp5.every(a  => typeof a === 'number' && a >= 1 && a <= 6);
        const sees10Valid= this.answers.sees10.length=== this.sees10.length&& this.answers.sees10.every(a => typeof a === 'number' && a >= 1 && a <= 5);

        if (!phq9Valid || !uclaValid || !psp5Valid || !sees10Valid) {
            console.error('Invalid answers, restarting assessment');
            this.clearProgress();
            this.currentStage = 'intro';
            this.currentIndex = 0;
            this.answers = { phq9: [], ucla: [], psp5: [], sees10: [] };
            this.renderIntro();
            return;
        }

        // ── PHQ-9 (0–27) ─────────────────────────────────────────
        const phq9Score = this.answers.phq9.reduce((a, b) => a + b, 0);
        let phq9Category;
        if      (phq9Score <= 4)  phq9Category = "Minimal";
        else if (phq9Score <= 9)  phq9Category = "Ringan";
        else if (phq9Score <= 14) phq9Category = "Sedang";
        else if (phq9Score <= 19) phq9Category = "Sedang-Berat";
        else                      phq9Category = "Berat";

        // ── UCLA (20–80) ──────────────────────────────────────────
        let uclaScore = 0;
        this.answers.ucla.forEach((ans, idx) => {
            uclaScore += this.uclaReversedIndices.includes(idx) ? (5 - ans) : ans;
        });
        let uclaCategory;
        if      (uclaScore <= 34) uclaCategory = "Low";
        else if (uclaScore <= 49) uclaCategory = "Moderate";
        else if (uclaScore <= 64) uclaCategory = "Moderately High";
        else                      uclaCategory = "High";

        // ── PSP-5 (5–30, reversed items 3 & 4 scored as 7-val) ───
        let psp5Score = 0;
        this.answers.psp5.forEach((ans, idx) => {
            psp5Score += this.psp5ReversedIndices.includes(idx) ? (7 - ans) : ans;
        });
        let psp5Category;
        if      (psp5Score < 15) psp5Category = "Stres Rendah";
        else if (psp5Score < 22) psp5Category = "Stres Sedang";
        else                     psp5Category = "Stres Tinggi";

        // ── SEES-10 (rata-rata 1–5) ───────────────────────────────
        const sees10Avg = +(this.answers.sees10.reduce((a, b) => a + b, 0) / this.sees10.length).toFixed(2);
        let sees10Category;
        if      (sees10Avg < 2.5) sees10Category = "Under Eating";
        else if (sees10Avg <= 3.5) sees10Category = "Normal";
        else                       sees10Category = "Over Eating / Emotional Eating";

        const container = document.getElementById('assessmentContent');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <div class="loading-spinner" style="margin: 0 auto 20px;"></div>
                    <p>${this.ui('saving')}</p>
                </div>
            `;
        }

        this.cacheAssessmentResults(phq9Score, phq9Category, uclaScore, uclaCategory, psp5Score, psp5Category, sees10Avg, sees10Category);

        const user = auth?.currentUser;
        const firestoreAvailable = user && typeof db !== 'undefined' && typeof FirebaseService !== 'undefined';

        if (!firestoreAvailable) {
            this.clearProgress();
            this.showResults(phq9Score, phq9Category, uclaScore, uclaCategory, psp5Score, psp5Category, sees10Avg, sees10Category);
            return;
        }

        try {
            await FirebaseService.userCol(user.uid, 'assessments').add({
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                date: new Date().toISOString(),
                phq9:  { score: phq9Score,  category: phq9Category,  answers: this.answers.phq9  },
                ucla:  { score: uclaScore,  category: uclaCategory,  answers: this.answers.ucla  },
                psp5:  { score: psp5Score,  category: psp5Category,  answers: this.answers.psp5  },
                sees10:{ average: sees10Avg, category: sees10Category, answers: this.answers.sees10 },
            });

            await db.collection('users').doc(user.uid).set({
                onboardingCompleted: true,
                lastAssessmentDate: firebase.firestore.FieldValue.serverTimestamp(),
                initialPhq9Score:   phq9Score,
                initialUclaScore:   uclaScore,
                initialPsp5Score:   psp5Score,
                initialSees10Avg:   sees10Avg,
            }, { merge: true });

            this.clearProgress();
            this.showResults(phq9Score, phq9Category, uclaScore, uclaCategory, psp5Score, psp5Category, sees10Avg, sees10Category);
        } catch (error) {
            console.error("Error saving assessment:", error);
            this._pendingResults = { phq9Score, phq9Category, uclaScore, uclaCategory, psp5Score, psp5Category, sees10Avg, sees10Category };
            const cont = document.getElementById('assessmentContent');
            if (cont) {
                cont.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--danger-500); margin-bottom: 20px;"></i>
                        <h3>${this.ui('fail_title')}</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 20px;">${this.ui('fail_body')}</p>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <button class="btn btn-primary" onclick="Assessment.retryFinish()" style="width: 100%; justify-content: center;">
                                <i class="fas fa-redo"></i> ${this.ui('fail_retry')}
                            </button>
                            <button class="btn btn-outline" onclick="Assessment.showResults(${phq9Score},'${phq9Category}',${uclaScore},'${uclaCategory}',${psp5Score},'${psp5Category}',${sees10Avg},'${sees10Category}')" style="width: 100%; justify-content: center;">
                                <i class="fas fa-chart-pie"></i> ${this.ui('fail_viewonly')}
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    },

    /**
     * Cache assessment results to localStorage for intervention engine
     */
    cacheAssessmentResults(phq9Score, phq9Category, uclaScore, uclaCategory) {
        try {
            localStorage.setItem('scentravn_assessment', JSON.stringify({
                phq9Score,
                phq9Category,
                uclaScore,
                uclaCategory,
                cachedAt: new Date().toISOString()
            }));
        } catch (e) {
            console.error('Error caching assessment results:', e);
        }
    },

    /**
     * Retry saving assessment to Firestore after a failed attempt
     */
    async retryFinish() {
        const pending = this._pendingResults;
        if (!pending) return;

        const container = document.getElementById('assessmentContent');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <div class="loading-spinner" style="margin: 0 auto 20px;"></div>
                    <p>Menyimpan ulang hasil evaluasi...</p>
                </div>
            `;
        }

        const user = auth?.currentUser;
        if (!user || typeof db === 'undefined' || typeof FirebaseService === 'undefined') {
            // Still no Firestore - show results from cache
            this.clearProgress();
            this.showResults(pending.phq9Score, pending.phq9Category, pending.uclaScore, pending.uclaCategory);
            return;
        }

        try {
            await FirebaseService.userCol(user.uid, 'assessments').add({
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                date: new Date().toISOString(),
                phq9: {
                    score: pending.phq9Score,
                    category: pending.phq9Category,
                    answers: this.answers.phq9
                },
                ucla: {
                    score: pending.uclaScore,
                    category: pending.uclaCategory,
                    answers: this.answers.ucla
                }
            });

            await db.collection('users').doc(user.uid).set({
                onboardingCompleted: true,
                lastAssessmentDate: firebase.firestore.FieldValue.serverTimestamp(),
                initialPhq9Score: pending.phq9Score,
                initialUclaScore: pending.uclaScore
            }, { merge: true });

            this.clearProgress();
            this._pendingResults = null;
            this.showResults(pending.phq9Score, pending.phq9Category, pending.uclaScore, pending.uclaCategory);
        } catch (error) {
            console.error("Retry save failed:", error);
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--danger-500); margin-bottom: 20px;"></i>
                        <h3>${this.lang() === 'en' ? 'Still Failed to Save' : 'Masih Gagal Menyimpan'}</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 20px;">${this.lang() === 'en' ? 'Please check your internet connection. Your data is still saved locally.' : 'Periksa koneksi internet Anda. Data tetap tersimpan lokal.'}</p>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <button class="btn btn-primary" onclick="Assessment.retryFinish()" style="width: 100%; justify-content: center;">
                                <i class="fas fa-redo"></i> ${this.lang() === 'en' ? 'Try Again' : 'Coba Lagi'}
                            </button>
                            <button class="btn btn-outline" onclick="Assessment.showResults(${pending.phq9Score}, '${pending.phq9Category}', ${pending.uclaScore}, '${pending.uclaCategory}')" style="width: 100%; justify-content: center;">
                                <i class="fas fa-chart-pie"></i> ${this.ui('fail_viewonly')}
                            </button>
                        </div>
                    </div>
                `;
            }
        }
    },

    /**
     * [GAP 1] Multimodal Bio-Psycho Fusion Score
     *
     * Formula: SynaScore = w1(P_psych) + w2(P_EDA) + w3(P_HRV) + w4(P_Sleep)
     *   w1=0.50  P_psych  = PHQ-9 (60%) + UCLA (40%) — validitas diagnostik tertinggi (Levis et al. 2020)
     *   w2=0.15  P_EDA    = GSR / Electrodermal Activity — penanda arousal otonom (Boucsein 2012)
     *   w3=0.20  P_HRV    = RMSSD — indikator regulasi ANS & resiliensi (Shaffer & Ginsberg 2017)
     *   w4=0.15  P_Sleep  = Sleep readiness score — hubungan tidur-kesehatan mental (Walker 2017)
     *
     * Tanpa sensor: fallback ke P_psych saja
     * Based on: Hickey et al. 2021, Quisel et al. 2025, Can et al. 2021
     */
    calculateFusionScore(phq9Score, uclaScore) {
        // Ambil state sensor dari App
        const state = (typeof App !== 'undefined' && App.getInterventionState) ? App.getInterventionState() : {};

        // Ambil sensorData langsung untuk rrIntervals & rmssd
        const rawSensor = (typeof BLEConnection !== 'undefined' && BLEConnection.getSensorData)
            ? BLEConnection.getSensorData() : {};

        // ── P_psych: Komponen Psikometrik (w1 = 0.50) ──────────────────────────
        // PHQ-9 (0-27) → 0-100 inverted; UCLA (20-80) → 0-100 inverted
        const phq9Normalized = Math.max(0, 100 - (phq9Score / 27) * 100);
        const uclaNormalized = Math.max(0, 100 - ((uclaScore - 20) / 60) * 100);
        const pPsych = (phq9Normalized * 0.60) + (uclaNormalized * 0.40); // 0-100

        // ── Deteksi ketersediaan sensor ────────────────────────────────────────
        const hasSensorData = (state.hr > 0 || state.stress > 0 || state.gsr > 0);

        let fusionScore, pEda, pHrv, pSleep, componentScores;

        if (hasSensorData) {
            // ── P_EDA: Electrodermal Activity / GSR (w2 = 0.15) ────────────────
            // GSR rendah = lebih tenang; nilai 0-100 diinvert
            pEda = Math.max(0, 100 - (state.gsr || 0));

            // ── P_HRV: Heart Rate Variability via RMSSD (w3 = 0.20) ────────────
            // Gunakan RMSSD nyata jika tersedia, fallback ke estimasi dari HR
            let rmssd = rawSensor.rmssd || 0;
            if (!rmssd && rawSensor.rrIntervals && rawSensor.rrIntervals.length >= 2) {
                rmssd = Utils.calculateRMSSD(rawSensor.rrIntervals);
            }
            if (rmssd > 0) {
                // Normalisasi RMSSD (10ms stres berat — 100ms sangat rileks) → 0-100
                pHrv = Math.max(0, Math.min(100, ((rmssd - 10) / (100 - 10)) * 100));
            } else {
                // Estimasi: gunakan skor stres yang sudah dihitung (inverted)
                pHrv = Math.max(0, 100 - (state.stress || 50));
            }

            // ── P_Sleep: Sleep Readiness Score (w4 = 0.15) ─────────────────────
            // Coba ambil skor tidur malam sebelumnya dari history localStorage
            let sleepScore = 50; // default jika tidak ada data
            try {
                const sleepHistory = JSON.parse(localStorage.getItem('scentravn_sleep_history') || '[]');
                if (sleepHistory.length > 0) {
                    // Gunakan skor tidur terbaru (malam kemarin atau sesi terakhir)
                    sleepScore = sleepHistory[sleepHistory.length - 1].score || 50;
                } else if (typeof SleepLab !== 'undefined' && SleepLab.calculateScore) {
                    // Fallback: hitung readiness saat ini
                    sleepScore = SleepLab.calculateScore();
                }
            } catch (_) { /* localStorage tidak tersedia */ }
            pSleep = Math.max(0, Math.min(100, sleepScore));

            // ── Formula SynaScore ───────────────────────────────────────────────
            fusionScore = Math.round(
                (pPsych  * 0.50) +
                (pEda    * 0.15) +
                (pHrv    * 0.20) +
                (pSleep  * 0.15)
            );

            componentScores = { pPsych, pEda, pHrv, pSleep };

        } else {
            // Tanpa sensor: gunakan P_psych saja
            fusionScore = Math.round(pPsych);
            componentScores = { pPsych, pEda: null, pHrv: null, pSleep: null };
        }

        fusionScore = Math.max(0, Math.min(100, fusionScore));

        // ── Discordance detection ───────────────────────────────────────────────
        // Flagging ketika self-report dan bio-signal tidak selaras (selisih > 30)
        const en = this.lang() === 'en';
        let discordance = null;
        if (hasSensorData && componentScores.pHrv !== null) {
            const bioAvg = (pEda + pHrv + pSleep) / 3;
            const diff = Math.abs(pPsych - bioAvg);
            if (diff > 30) {
                discordance = pPsych > bioAvg
                    ? (en ? 'Your self-report indicates you are doing well, but your body signals show strain. Pay attention to your physical signals.'
                          : 'Laporan diri Anda menunjukkan kondisi baik, namun sinyal tubuh menunjukkan tekanan. Perhatikan sinyal fisik Anda.')
                    : (en ? 'Your body is relaxed, but your psychometric score shows emotional burden. Consider talking to someone.'
                          : 'Tubuh Anda dalam kondisi rileks, namun skor psikometrik menunjukkan beban emosional. Pertimbangkan untuk berbicara dengan seseorang.');
            }
        }

        // ── Kategorisasi SynaScore ──────────────────────────────────────────────
        let fusionCategory, fusionColor;
        if (fusionScore >= 80) { fusionCategory = en ? 'Excellent' : 'Sangat Baik'; fusionColor = '#10b981'; }
        else if (fusionScore >= 60) { fusionCategory = en ? 'Good' : 'Baik'; fusionColor = '#3b82f6'; }
        else if (fusionScore >= 40) { fusionCategory = en ? 'Caution' : 'Waspada'; fusionColor = '#f59e0b'; }
        else if (fusionScore >= 20) { fusionCategory = en ? 'Needs Attention' : 'Perlu Perhatian'; fusionColor = '#f97316'; }
        else { fusionCategory = en ? 'Critical' : 'Kritis'; fusionColor = '#ef4444'; }

        return { fusionScore, fusionCategory, fusionColor, discordance, hasSensorData, componentScores };
    },

    /**
     * [GAP 5] Longitudinal Psychometric Tracking
     * Shows PHQ-9 and UCLA score trends over time with intervention correlation
     * Based on: Moshe et al. 2021, Morgiève et al. 2022
     */
    async renderLongitudinalChart(container) {
        const user = auth?.currentUser;
        if (!user || typeof db === 'undefined' || typeof FirebaseService === 'undefined') return;

        try {
            const snapshot = await FirebaseService.userCol(user.uid, 'assessments')
                .orderBy('timestamp', 'desc')
                .limit(12)
                .get();

            if (snapshot.empty || snapshot.size < 2) {
                container.innerHTML += `
                    <div style="background: #f8f9ff; padding: 16px; border-radius: 12px; text-align: center; margin-top: 20px;">
                        <i class="fas fa-chart-line" style="font-size: 2rem; color: var(--primary-300); margin-bottom: 8px;"></i>
                        <p style="color: var(--text-tertiary); font-size: 0.9rem;">Grafik tren akan tersedia setelah 2+ evaluasi.</p>
                    </div>
                `;
                return;
            }

            const assessments = [];
            snapshot.forEach(doc => {
                const d = doc.data();
                assessments.push({
                    date: d.date || (d.timestamp?.toDate ? d.timestamp.toDate().toISOString() : new Date().toISOString()),
                    phq9: d.phq9?.score ?? d.phq9Score ?? 0,
                    ucla: d.ucla?.score ?? d.uclaScore ?? 0
                });
            });
            assessments.reverse(); // Chronological order

            const chartId = 'longitudinalChart_' + Date.now();
            container.innerHTML += `
                <div style="background: white; padding: 20px; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); margin-top: 20px;">
                    <h4 style="margin-bottom: 16px; color: var(--text-primary);"><i class="fas fa-chart-line" style="color: var(--primary-500);"></i> Tren Longitudinal</h4>
                    <canvas id="${chartId}" height="200"></canvas>
                    <p style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 8px; text-align: center;">Berdasarkan ${assessments.length} evaluasi terakhir</p>
                </div>
            `;

            // Wait for DOM render
            requestAnimationFrame(() => {
                const canvas = document.getElementById(chartId);
                if (!canvas || typeof Chart === 'undefined') return;

                new Chart(canvas, {
                    type: 'line',
                    data: {
                        labels: assessments.map(a => {
                            const d = new Date(a.date);
                            return d.toLocaleDateString(this.lang() === 'en' ? 'en-US' : 'id-ID', { day: 'numeric', month: 'short' });
                        }),
                        datasets: [
                            {
                                label: this.lang() === 'en' ? 'PHQ-9 (Depression)' : 'PHQ-9 (Depresi)',
                                data: assessments.map(a => a.phq9),
                                borderColor: '#8B5CF6',
                                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                fill: true,
                                tension: 0.4,
                                pointRadius: 4,
                                pointBackgroundColor: '#8B5CF6'
                            },
                            {
                                label: this.lang() === 'en' ? 'UCLA (Loneliness)' : 'UCLA (Kesepian)',
                                data: assessments.map(a => a.ucla),
                                borderColor: '#3b82f6',
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                fill: true,
                                tension: 0.4,
                                pointRadius: 4,
                                pointBackgroundColor: '#3b82f6'
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } }
                        },
                        scales: {
                            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
                            x: { grid: { display: false } }
                        }
                    }
                });
            });
        } catch (e) {
            console.error('Longitudinal chart error:', e);
        }
    },

    showResults(phq9Score, phq9Category, uclaScore, uclaCategory, psp5Score, psp5Category, sees10Avg, sees10Category) {
        const container = document.getElementById('assessmentContent');
        if (!container) return;

        // Remember stage + args so language toggle can re-render this screen
        this.currentStage = 'result';
        this._resultArgs = [phq9Score, phq9Category, uclaScore, uclaCategory, psp5Score, psp5Category, sees10Avg, sees10Category];
        this._savedArgs = null;

        // Hide progress bar wrapper
        const progressWrapper = document.getElementById('assessmentProgressWrapper');
        if (progressWrapper) progressWrapper.style.display = 'none';

        // Recommended action based on PHQ-9
        let recommendationHtml = "";
        if (phq9Score >= 15) {
            recommendationHtml = `
                <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--danger-500); padding: 16px; margin-top: 20px; border-radius: 0 8px 8px 0; text-align: left;">
                    <p style="color: var(--danger-700); font-weight: 600; margin-bottom: 8px;"><i class="fas fa-exclamation-circle"></i> ${this.ui('rec_severe_title')}</p>
                    <p style="font-size: 0.9rem; color: var(--danger-600); margin-bottom: 12px;">${this.ui('rec_severe_body')}</p>
                    <button class="btn btn-primary btn-sm" onclick="Router.navigate('support')" style="background: var(--danger-500); border-color: var(--danger-500);">${this.ui('rec_severe_btn')}</button>
                </div>
            `;
        } else if (phq9Score >= 10) {
            recommendationHtml = `
                <div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid var(--warning-500); padding: 16px; margin-top: 20px; border-radius: 0 8px 8px 0; text-align: left;">
                    <p style="color: var(--warning-700); font-weight: 600; margin-bottom: 8px;"><i class="fas fa-info-circle"></i> ${this.ui('rec_mod_title')}</p>
                    <p style="font-size: 0.9rem; color: var(--warning-600); margin-bottom: 12px;">${this.ui('rec_mod_body')}</p>
                    <button class="btn btn-primary btn-sm" onclick="Router.navigate('synachat')" style="background: var(--warning-500); border-color: var(--warning-500);">${this.ui('rec_mod_btn')}</button>
                </div>
            `;
        } else {
            recommendationHtml = `
                 <div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid var(--success-500); padding: 16px; margin-top: 20px; border-radius: 0 8px 8px 0; text-align: left;">
                    <p style="color: var(--success-700); font-weight: 600; margin-bottom: 8px;"><i class="fas fa-check-circle"></i> ${this.ui('rec_good_title')}</p>
                    <p style="font-size: 0.9rem; color: var(--success-600); margin-bottom: 12px;">${this.ui('rec_good_body')}</p>
                    <button class="btn btn-primary btn-sm" onclick="Router.navigate('dashboard')" style="background: var(--success-500); border-color: var(--success-500);">${this.ui('rec_good_btn')}</button>
                </div>
            `;
        }

        // [GAP 1] Calculate Fusion Score
        const fusion = this.calculateFusionScore(phq9Score, uclaScore);
        const fusionHtml = `
            <div style="background: linear-gradient(135deg, ${fusion.fusionColor}15, ${fusion.fusionColor}08); padding: 20px; border-radius: 16px; border: 2px solid ${fusion.fusionColor}30; margin-bottom: 16px;">
                <p style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">${this.ui('synascore')}</p>
                <p style="font-size: 3rem; font-weight: 800; color: ${fusion.fusionColor}; margin-bottom: 4px;">${fusion.fusionScore}</p>
                <p style="font-size: var(--text-sm); font-weight: 600; color: ${fusion.fusionColor};">${fusion.fusionCategory}</p>
                <p style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 4px;">${fusion.hasSensorData ? this.ui('fusion_sensor') : this.ui('fusion_psy_only')}</p>
            </div>
        `;

        const discordanceHtml = fusion.discordance ? `
            <div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 14px; margin-bottom: 16px; border-radius: 0 8px 8px 0; text-align: left;">
                <p style="color: #d97706; font-weight: 600; margin-bottom: 4px;"><i class="fas fa-exclamation-triangle"></i> ${this.ui('discordance_title')}</p>
                <p style="font-size: 0.85rem; color: #92400e;">${fusion.discordance}</p>
            </div>
        ` : '';

        container.innerHTML = `
            <div style="text-align: center; animation: fadeIn 0.5s;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, var(--success-400), var(--success-600)); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; color: white; font-size: 2.5rem; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);">
                    <i class="fas fa-check"></i>
                </div>
                <h2 style="font-size: var(--text-2xl); color: var(--text-primary); margin-bottom: 12px;">${this.ui('result_title')}</h2>
                <p style="color: var(--text-tertiary); margin-bottom: 24px;">${this.ui('result_thanks')}</p>

                ${fusionHtml}
                ${discordanceHtml}

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                    <div style="background: var(--bg-secondary); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color);">
                        <p style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">${this.ui('mental_score')}</p>
                        <p style="font-size: var(--text-3xl); font-weight: 800; color: var(--primary-600); margin-bottom: 4px;">${phq9Score}</p>
                        <p style="font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary);">${this.catLabel(phq9Category)}</p>
                    </div>
                    <div style="background: var(--bg-secondary); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color);">
                        <p style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">${this.ui('social_link')}</p>
                        <p style="font-size: var(--text-3xl); font-weight: 800; color: var(--info-600); margin-bottom: 4px;">${uclaScore}</p>
                        <p style="font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary);">${this.catLabel(uclaCategory)}</p>
                    </div>
                </div>

                ${recommendationHtml}

                <div id="longitudinalContainer"></div>

                <div style="margin-top: 32px;">
                    <button class="btn btn-outline" style="width: 100%; justify-content: center;" onclick="Router.navigate('dashboard')">${this.ui('skip_dashboard')}</button>
                </div>
            </div>
        `;

        // [GAP 5] Render longitudinal tracking chart
        const longitudinalContainer = document.getElementById('longitudinalContainer');
        if (longitudinalContainer) {
            this.renderLongitudinalChart(longitudinalContainer);
        }

        // Ground Truth: minta validasi dari pengguna setelah 3 detik
        // agar hasil tampil lebih dulu sebelum prompt muncul
        setTimeout(() => {
            if (typeof GroundTruth !== 'undefined') {
                const state = (typeof App !== 'undefined' && App.getInterventionState)
                    ? App.getInterventionState() : {};
                GroundTruth.promptAfterAssessment(
                    fusion.fusionScore,
                    state.stress || 0,
                    {
                        snapshotHr:     state.hr     || 0,
                        snapshotGsr:    state.gsr    || 0,
                        snapshotSpo2:   state.spo2   || 0,
                        snapshotStress: state.stress || 0,
                        phq9Score,
                        uclaScore
                    }
                );
            }
        }, 3000);
    }
};

window.Assessment = Assessment;
