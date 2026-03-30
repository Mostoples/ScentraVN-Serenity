/**
 * SYNAWATCH - Kuesioner Pengujian Aplikasi
 * 9-page questionnaire with SUS, UI/UX, TAM, UEQ, Trust, Therapeutic, Engagement, NPS scoring
 * Saves results to Firestore collection 'questionnaireResults'
 */

const Questionnaire = {
    currentPage: 0,
    TOTAL_PAGES: 9,

    SUS_QUESTIONS: [
        { code: 'sus1',  text: 'Saya merasa ingin sering menggunakan aplikasi SynaWatch ini.' },
        { code: 'sus2',  text: 'Saya merasa aplikasi ini terlalu rumit untuk digunakan.' },
        { code: 'sus3',  text: 'Aplikasi ini mudah digunakan.' },
        { code: 'sus4',  text: 'Saya membutuhkan bantuan orang lain untuk bisa menggunakan aplikasi ini.' },
        { code: 'sus5',  text: 'Fitur-fitur dalam aplikasi ini terintegrasi dengan baik satu sama lain.' },
        { code: 'sus6',  text: 'Saya merasa terlalu banyak ketidakkonsistenan dalam aplikasi ini.' },
        { code: 'sus7',  text: 'Saya rasa kebanyakan orang dapat belajar menggunakan aplikasi ini dengan sangat cepat.' },
        { code: 'sus8',  text: 'Aplikasi ini terasa sangat rumit dan canggung untuk digunakan.' },
        { code: 'sus9',  text: 'Saya merasa percaya diri saat menggunakan aplikasi ini.' },
        { code: 'sus10', text: 'Saya perlu belajar banyak hal sebelum dapat menggunakan aplikasi ini dengan lancar.' }
    ],

    UIUX_QUESTIONS: [
        { code: 'uiux1',  text: 'Tampilan visual aplikasi ini menarik dan nyaman dilihat.', group: 'nav' },
        { code: 'uiux2',  text: 'Ikon dan tombol mudah saya kenali fungsinya.', group: 'nav' },
        { code: 'uiux3',  text: 'Saya dapat berpindah antar fitur dengan mudah dan intuitif.', group: 'nav' },
        { code: 'uiux4',  text: 'Teks dan informasi dalam aplikasi mudah dibaca.', group: 'nav' },
        { code: 'uiux5',  text: 'Fitur SynaChat membantu saya mengekspresikan perasaan saya.', group: 'feature' },
        { code: 'uiux6',  text: 'Fitur Journal mudah saya gunakan untuk mencatat emosi harian.', group: 'feature' },
        { code: 'uiux7',  text: 'Konten di Academy relevan dan bermanfaat untuk kesehatan mental saya.', group: 'feature' },
        { code: 'uiux8',  text: 'Latihan di fitur Yoga/Mindful terasa terarah dan mudah diikuti.', group: 'feature' },
        { code: 'uiux9',  text: 'Fitur Mood Booster memberikan dampak positif pada suasana hati saya.', group: 'feature' },
        { code: 'uiux10', text: 'Program HEROIC memiliki alur yang jelas dan memotivasi.', group: 'feature' },
        { code: 'uiux11', text: 'Dashboard memberikan gambaran kondisi saya yang informatif.', group: 'feature' },
        { code: 'uiux12', text: 'Fitur Games terasa menyenangkan dan relevan dengan kesehatan mental.', group: 'feature' }
    ],

    TAM_QUESTIONS: [
        { code: 'tam1', text: 'Menggunakan SynaWatch membantu saya memantau kondisi kesehatan mental saya.', group: 'usefulness' },
        { code: 'tam2', text: 'Aplikasi ini meningkatkan kesadaran saya terhadap kondisi emosi dan stres saya.', group: 'usefulness' },
        { code: 'tam3', text: 'SynaWatch bermanfaat dalam membantu saya mengelola kesehatan mental sehari-hari.', group: 'usefulness' },
        { code: 'tam4', text: 'Secara keseluruhan, aplikasi ini berguna bagi saya.', group: 'usefulness' },
        { code: 'tam5', text: 'Mempelajari cara menggunakan SynaWatch terasa mudah bagi saya.', group: 'ease' },
        { code: 'tam6', text: 'Interaksi dengan aplikasi ini jelas dan mudah dipahami.', group: 'ease' },
        { code: 'tam7', text: 'Saya dapat menggunakan aplikasi ini tanpa banyak usaha.', group: 'ease' },
        { code: 'tam8', text: 'Secara keseluruhan, aplikasi ini mudah digunakan.', group: 'ease' }
    ],

    UEQ_PAIRS: [
        { code: 'ueq1', neg: 'Menjengkelkan', pos: 'Menyenangkan' },
        { code: 'ueq2', neg: 'Membingungkan', pos: 'Jelas' },
        { code: 'ueq3', neg: 'Tidak efisien', pos: 'Efisien' },
        { code: 'ueq4', neg: 'Membosankan', pos: 'Menarik' },
        { code: 'ueq5', neg: 'Tidak dapat diprediksi', pos: 'Dapat diprediksi' },
        { code: 'ueq6', neg: 'Konvensional', pos: 'Inovatif' },
        { code: 'ueq7', neg: 'Tidak nyaman', pos: 'Nyaman' },
        { code: 'ueq8', neg: 'Lambat', pos: 'Cepat' }
    ],

    TRUST_QUESTIONS: [
        { code: 'trust1', text: 'Saya percaya bahwa data kesehatan saya aman di dalam aplikasi SynaWatch.' },
        { code: 'trust2', text: 'Saya merasa nyaman memberikan data pribadi dan kondisi emosi saya ke aplikasi ini.' },
        { code: 'trust3', text: 'Saya yakin data saya tidak akan disalahgunakan atau dibagikan tanpa izin.' },
        { code: 'trust4', text: 'Informasi tentang privasi dan keamanan data dalam aplikasi sudah cukup jelas.' },
        { code: 'trust5', text: 'Saya percaya pada AI (SynaChat) untuk menyimpan percakapan saya dengan aman.' }
    ],

    THERAPEUTIC_QUESTIONS: [
        { code: 'ther1', text: 'Konten dalam aplikasi ini relevan dengan kebutuhan kesehatan mental saya.' },
        { code: 'ther2', text: 'Fitur SynaChat terasa seperti berbicara dengan pendamping yang memahami saya.' },
        { code: 'ther3', text: 'Latihan Yoga dan Mindful dalam aplikasi ini terasa efektif untuk menenangkan pikiran.' },
        { code: 'ther4', text: 'Konten Academy memberikan pengetahuan baru yang berguna tentang kesehatan mental.' },
        { code: 'ther5', text: 'Saya merasa lebih baik secara emosional setelah menggunakan aplikasi ini.' },
        { code: 'ther6', text: 'Program HEROIC memberikan panduan terstruktur untuk perkembangan diri saya.' },
        { code: 'ther7', text: 'Fitur Journal membantu saya lebih memahami pola emosi dan suasana hati saya.' }
    ],

    ENGAGEMENT_QUESTIONS: [
        { code: 'eng1', text: 'Saya akan menggunakan SynaWatch secara rutin jika tersedia.' },
        { code: 'eng2', text: 'Saya merasa terdorong untuk menyelesaikan program atau latihan dalam aplikasi.' },
        { code: 'eng3', text: 'Notifikasi atau pengingat dari aplikasi ini akan memotivasi saya untuk konsisten.' },
        { code: 'eng4', text: 'Saya merasa ada kemajuan nyata saat menggunakan fitur-fitur dalam aplikasi ini.' },
        { code: 'eng5', text: 'Saya ingin mencoba fitur smartwatch ketika perangkatnya sudah tersedia.' }
    ],

    PAGE_LABELS: [
        'Informasi Responden',
        'SUS — Usability',
        'UI/UX & Fitur',
        'TAM — Acceptance',
        'UEQ — Experience',
        'Kepercayaan & Privasi',
        'Nilai Terapeutik',
        'Engagement & Motivasi',
        'NPS & Masukan'
    ],

    // ═══════════════════════════════════════════
    // Init
    // ═══════════════════════════════════════════
    init() {
        this.currentPage = 0;
        this._injectStyles();
        this._buildLikertQuestions('sus-questions', this.SUS_QUESTIONS);
        this._buildLikertQuestions('uiux-questions', this.UIUX_QUESTIONS);
        this._buildLikertQuestions('tam-questions', this.TAM_QUESTIONS);
        this._buildSemanticQuestions();
        this._buildLikertQuestions('trust-questions', this.TRUST_QUESTIONS);
        this._buildLikertQuestions('therapeutic-questions', this.THERAPEUTIC_QUESTIONS);
        this._buildLikertQuestions('engagement-questions', this.ENGAGEMENT_QUESTIONS);
        this._buildNPSScale();
        this._buildStepDots();
        this._updateProgress();
    },

    // ═══════════════════════════════════════════
    // Style Injection
    // ═══════════════════════════════════════════
    _injectStyles() {
        if (document.getElementById('questionnaire-styles')) return;
        const style = document.createElement('style');
        style.id = 'questionnaire-styles';
        style.textContent = `
            /* ═══ Questionnaire Container ═══ */
            .q-container { max-width: 640px; margin: 0 auto; padding-bottom: 40px; }

            /* ═══ Header Card ═══ */
            .q-header-card {
                background: linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #c084fc 100%);
                border-radius: var(--radius-2xl, 24px); padding: 28px 24px 24px;
                text-align: center; box-shadow: 0 8px 32px rgba(124,58,237,0.25);
                margin-bottom: 24px; position: relative; overflow: hidden;
            }
            .q-header-card::before {
                content: ''; position: absolute; width: 200px; height: 200px;
                background: radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%);
                top: -60px; right: -40px; border-radius: 50%;
            }
            .q-header-card::after {
                content: ''; position: absolute; width: 150px; height: 150px;
                background: radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%);
                bottom: -40px; left: -20px; border-radius: 50%;
            }
            .q-header-logo {
                font-size: 13px; font-weight: 800; letter-spacing: 3px;
                color: rgba(255,255,255,0.7); margin-bottom: 8px; position: relative; z-index: 1;
            }
            .q-header-title {
                font-size: 20px; font-weight: 800; color: #fff;
                line-height: 1.3; position: relative; z-index: 1;
            }
            .q-header-subtitle {
                font-size: 13px; color: rgba(255,255,255,0.75);
                margin-top: 8px; position: relative; z-index: 1; line-height: 1.5;
            }

            /* ═══ Progress ═══ */
            .q-progress {
                background: rgba(255,255,255,0.65); backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.6); border-radius: var(--radius-md, 16px);
                padding: 16px 20px; margin-bottom: 24px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6);
            }
            .q-progress-info {
                display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 12px; font-size: 13px;
            }
            .q-progress-label { font-weight: 700; color: var(--text-primary, #1e293b); }
            .q-progress-count { color: var(--text-secondary, #64748b); font-weight: 600; }
            .q-progress-track {
                width: 100%; height: 6px; background: var(--primary-100, #ede9fe);
                border-radius: 99px; overflow: hidden;
            }
            .q-progress-fill {
                height: 100%; background: linear-gradient(90deg, #7c3aed, #a855f7);
                border-radius: 99px; transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1); width: 0%;
            }
            .q-step-dots { display: flex; justify-content: center; gap: 8px; margin-top: 14px; }
            .q-step-dot {
                width: 10px; height: 10px; border-radius: 50%;
                background: var(--primary-200, #ddd6fe); transition: all 0.3s ease; cursor: pointer;
            }
            .q-step-dot.active {
                background: var(--primary-600, #7c3aed); transform: scale(1.25);
                box-shadow: 0 0 0 3px rgba(124,58,237,0.2);
            }
            .q-step-dot.completed { background: var(--success-500, #10b981); }

            /* ═══ Page Card ═══ */
            .q-page {
                background: rgba(255,255,255,0.65); backdrop-filter: blur(20px);
                border: 1px solid rgba(255,255,255,0.6); border-radius: var(--radius-2xl, 24px);
                padding: 28px 22px; box-shadow: 0 8px 32px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.6);
                animation: qFadeSlideUp 0.4s ease; display: none;
            }
            .q-page.active { display: block; }
            @keyframes qFadeSlideUp {
                from { opacity: 0; transform: translateY(16px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .q-badge {
                display: inline-flex; align-items: center; gap: 6px;
                background: var(--primary-50, #f5f3ff); color: var(--primary-600, #7c3aed);
                font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
                padding: 5px 12px; border-radius: 99px; margin-bottom: 14px;
                border: 1px solid var(--primary-100, #ede9fe);
            }
            .q-page-title {
                font-size: 18px; font-weight: 800; color: var(--text-primary, #1e293b);
                margin-bottom: 4px; line-height: 1.3;
            }
            .q-page-desc {
                font-size: 13px; color: var(--text-secondary, #64748b);
                margin-bottom: 24px; line-height: 1.5;
            }

            /* ═══ Form Elements ═══ */
            .q-form-group { margin-bottom: 20px; }
            .q-form-label {
                display: block; font-size: 13px; font-weight: 700;
                color: var(--text-primary, #1e293b); margin-bottom: 8px;
            }
            .q-form-label .q-required { color: #ef4444; margin-left: 2px; }
            .q-form-input, .q-form-select {
                width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.8);
                border: 1.5px solid #e2e8f0; border-radius: var(--radius-sm, 12px);
                font-family: inherit; font-size: 14px; color: var(--text-primary, #1e293b);
                transition: all 0.2s ease; outline: none;
            }
            .q-form-input:focus, .q-form-select:focus {
                border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); background: #fff;
            }
            .q-form-input.q-error, .q-form-select.q-error {
                border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.1);
            }
            .q-form-select {
                appearance: none; cursor: pointer;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
                background-repeat: no-repeat; background-position: right 14px center; padding-right: 40px;
            }
            .q-form-textarea {
                width: 100%; padding: 12px 16px; background: rgba(255,255,255,0.8);
                border: 1.5px solid #e2e8f0; border-radius: var(--radius-sm, 12px);
                font-family: inherit; font-size: 14px; color: var(--text-primary, #1e293b);
                transition: all 0.2s ease; outline: none; resize: vertical; min-height: 80px;
            }
            .q-form-textarea:focus {
                border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); background: #fff;
            }

            /* ═══ Question Item ═══ */
            .q-item {
                background: rgba(255,255,255,0.5); border: 1px solid #f1f5f9;
                border-radius: var(--radius-md, 16px); padding: 18px 16px;
                margin-bottom: 14px; transition: all 0.2s ease;
            }
            .q-item:hover { background: rgba(255,255,255,0.75); }
            .q-item.q-answered { border-color: rgba(124,58,237,0.15); background: rgba(245,243,255,0.5); }
            .q-item.q-has-error { border-color: #ef4444; background: rgba(254,226,226,0.2); }
            .q-item-number {
                font-size: 11px; font-weight: 700; color: var(--primary-600, #7c3aed);
                margin-bottom: 6px; letter-spacing: 0.3px;
            }
            .q-item-text {
                font-size: 14px; font-weight: 600; color: var(--text-primary, #1e293b);
                margin-bottom: 14px; line-height: 1.5;
            }

            /* ═══ Likert Scale ═══ */
            .q-likert { display: flex; justify-content: space-between; gap: 6px; }
            .q-likert-opt { flex: 1; text-align: center; }
            .q-likert-opt input[type="radio"] { display: none; }
            .q-likert-opt label {
                display: flex; flex-direction: column; align-items: center; gap: 4px;
                cursor: pointer; padding: 8px 4px; border-radius: var(--radius-sm, 12px);
                transition: all 0.2s ease;
            }
            .q-likert-opt label:hover { background: var(--primary-50, #f5f3ff); }
            .q-likert-circle {
                width: 36px; height: 36px; border-radius: 50%; border: 2px solid #cbd5e1;
                display: flex; align-items: center; justify-content: center;
                font-size: 14px; font-weight: 700; color: var(--text-secondary, #64748b);
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .q-likert-opt input:checked + label .q-likert-circle {
                background: #7c3aed; border-color: #7c3aed; color: #fff;
                transform: scale(1.1); box-shadow: 0 4px 12px rgba(124,58,237,0.3);
            }
            .q-likert-label {
                font-size: 10px; color: #94a3b8; font-weight: 500; line-height: 1.2; max-width: 60px;
            }

            /* ═══ Semantic Differential ═══ */
            .q-semantic-labels {
                display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;
            }
            .q-semantic-neg { font-size: 13px; font-weight: 600; color: #ef4444; max-width: 100px; }
            .q-semantic-pos { font-size: 13px; font-weight: 600; color: #10b981; max-width: 100px; text-align: right; }
            .q-semantic-scale { display: flex; justify-content: space-between; gap: 4px; }
            .q-semantic-opt { flex: 1; text-align: center; }
            .q-semantic-opt input[type="radio"] { display: none; }
            .q-semantic-opt label {
                display: block; cursor: pointer; padding: 8px 2px;
                border-radius: 10px; transition: all 0.2s ease;
            }
            .q-semantic-opt label:hover { background: var(--primary-50, #f5f3ff); }
            .q-semantic-dot {
                width: 32px; height: 32px; border-radius: 50%; border: 2px solid #cbd5e1;
                margin: 0 auto; display: flex; align-items: center; justify-content: center;
                font-size: 12px; font-weight: 700; color: #94a3b8;
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .q-semantic-opt input:checked + label .q-semantic-dot {
                background: #7c3aed; border-color: #7c3aed; color: #fff;
                transform: scale(1.15); box-shadow: 0 4px 12px rgba(124,58,237,0.3);
            }

            /* ═══ NPS Scale ═══ */
            .q-nps { display: grid; grid-template-columns: repeat(11, 1fr); gap: 4px; }
            .q-nps-opt { text-align: center; }
            .q-nps-opt input[type="radio"] { display: none; }
            .q-nps-opt label {
                display: flex; flex-direction: column; align-items: center; gap: 4px;
                cursor: pointer; padding: 8px 2px; border-radius: 10px; transition: all 0.2s ease;
            }
            .q-nps-opt label:hover { background: var(--primary-50, #f5f3ff); }
            .q-nps-circle {
                width: 34px; height: 34px; border-radius: 50%; border: 2px solid #cbd5e1;
                display: flex; align-items: center; justify-content: center;
                font-size: 13px; font-weight: 700; color: var(--text-secondary, #64748b);
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .q-nps-opt input:checked + label .q-nps-circle {
                color: #fff; transform: scale(1.1);
            }
            .q-nps-opt[data-cat="detractor"] input:checked + label .q-nps-circle {
                background: #ef4444; border-color: #ef4444; box-shadow: 0 4px 12px rgba(239,68,68,0.3);
            }
            .q-nps-opt[data-cat="passive"] input:checked + label .q-nps-circle {
                background: #f59e0b; border-color: #f59e0b; box-shadow: 0 4px 12px rgba(245,158,11,0.3);
            }
            .q-nps-opt[data-cat="promoter"] input:checked + label .q-nps-circle {
                background: #10b981; border-color: #10b981; box-shadow: 0 4px 12px rgba(16,185,129,0.3);
            }
            .q-nps-hint { font-size: 11px; color: #94a3b8; }

            /* ═══ Buttons ═══ */
            .q-btn-row { display: flex; gap: 12px; margin-top: 28px; }
            .q-btn {
                flex: 1; padding: 14px 20px; border: none; border-radius: var(--radius-sm, 12px);
                cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 700;
                display: flex; align-items: center; justify-content: center; gap: 8px;
                transition: all 0.25s ease;
            }
            .q-btn-back {
                background: rgba(255,255,255,0.8); color: var(--text-secondary, #64748b);
                border: 1.5px solid #e2e8f0;
            }
            .q-btn-back:hover { background: #fff; color: var(--text-primary, #1e293b); border-color: #cbd5e1; }
            .q-btn-next {
                background: linear-gradient(135deg, #7c3aed, #a855f7);
                color: #fff; box-shadow: 0 8px 32px rgba(124,58,237,0.25);
            }
            .q-btn-next:hover {
                transform: translateY(-2px); box-shadow: 0 12px 36px rgba(124,58,237,0.35);
            }
            .q-btn-next:active { transform: translateY(0); }
            .q-btn-submit {
                background: linear-gradient(135deg, #10b981, #34d399);
                color: #fff; box-shadow: 0 8px 32px rgba(16,185,129,0.25);
            }
            .q-btn-submit:hover {
                transform: translateY(-2px); box-shadow: 0 12px 36px rgba(16,185,129,0.35);
            }
            .q-btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }

            /* ═══ Error ═══ */
            .q-page-error {
                background: #fee2e2; color: #ef4444; padding: 12px 16px;
                border-radius: var(--radius-sm, 12px); font-size: 13px; font-weight: 600;
                margin-bottom: 16px; display: none; align-items: center; gap: 8px;
                animation: qShake 0.4s ease;
            }
            .q-page-error.q-show { display: flex; }
            @keyframes qShake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-6px); }
                75% { transform: translateX(6px); }
            }

            /* ═══ Section Divider ═══ */
            .q-divider {
                display: flex; align-items: center; gap: 10px; margin: 24px 0 18px;
                font-size: 12px; font-weight: 700; color: var(--primary-600, #7c3aed); letter-spacing: 0.5px;
            }
            .q-divider::before, .q-divider::after {
                content: ''; flex: 1; height: 1px; background: var(--primary-200, #ddd6fe);
            }

            /* ═══ Success Screen ═══ */
            .q-success { display: none; text-align: center; padding: 40px 20px; }
            .q-success.active { display: block; }
            .q-success-icon {
                width: 88px; height: 88px; border-radius: 50%;
                background: linear-gradient(135deg, #10b981, #34d399);
                display: flex; align-items: center; justify-content: center;
                margin: 0 auto 24px; animation: qSuccessPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                box-shadow: 0 12px 40px rgba(16,185,129,0.3);
            }
            .q-success-icon i { font-size: 36px; color: #fff; }
            @keyframes qSuccessPop {
                0% { transform: scale(0); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }
            .q-success-title { font-size: 22px; font-weight: 800; color: var(--text-primary, #1e293b); margin-bottom: 8px; }
            .q-success-desc { font-size: 14px; color: var(--text-secondary, #64748b); line-height: 1.6; margin-bottom: 24px; }
            .q-success-id {
                display: inline-block; background: var(--primary-50, #f5f3ff); color: var(--primary-600, #7c3aed);
                padding: 8px 16px; border-radius: 99px; font-size: 12px; font-weight: 700;
                letter-spacing: 0.3px; border: 1px solid var(--primary-100, #ede9fe); margin-bottom: 28px;
            }
            .q-btn-reset {
                display: inline-flex; align-items: center; gap: 8px;
                background: linear-gradient(135deg, #7c3aed, #a855f7);
                color: #fff; padding: 14px 28px; border: none; border-radius: var(--radius-sm, 12px);
                cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 700;
                box-shadow: 0 8px 32px rgba(124,58,237,0.25); transition: all 0.25s ease;
            }
            .q-btn-reset:hover {
                transform: translateY(-2px); box-shadow: 0 12px 36px rgba(124,58,237,0.35);
            }

            /* ═══ Spinner ═══ */
            .q-spinner {
                width: 20px; height: 20px; border: 2.5px solid rgba(255,255,255,0.3);
                border-top-color: #fff; border-radius: 50%; animation: qSpin 0.6s linear infinite; display: none;
            }
            .q-btn-submit.q-loading .q-spinner { display: block; }
            .q-btn-submit.q-loading .q-btn-text { display: none; }
            @keyframes qSpin { to { transform: rotate(360deg); } }

            /* ═══ Responsive ═══ */
            @media (max-width: 480px) {
                .q-container { padding-bottom: 32px; }
                .q-header-card { padding: 22px 18px 20px; }
                .q-page { padding: 22px 16px; }
                .q-likert-circle { width: 32px; height: 32px; font-size: 13px; }
                .q-likert-label { font-size: 9px; }
                .q-semantic-dot { width: 28px; height: 28px; font-size: 11px; }
                .q-nps { grid-template-columns: repeat(6, 1fr); gap: 6px; }
                .q-nps-circle { width: 38px; height: 38px; font-size: 14px; }
            }
        `;
        document.head.appendChild(style);
    },

    // ═══════════════════════════════════════════
    // Build Questions
    // ═══════════════════════════════════════════
    _buildLikertScale(code, max) {
        const labels5 = ['STS', 'TS', 'N', 'S', 'SS'];
        const labels = max === 5 ? labels5 : [];
        let html = '<div class="q-likert">';
        for (let i = 1; i <= max; i++) {
            html += `<div class="q-likert-opt">
                <input type="radio" name="${code}" id="${code}_${i}" value="${i}">
                <label for="${code}_${i}">
                    <div class="q-likert-circle">${i}</div>
                    ${labels[i-1] ? `<span class="q-likert-label">${labels[i-1]}</span>` : ''}
                </label>
            </div>`;
        }
        html += '</div>';
        return html;
    },

    _buildLikertQuestions(containerId, questions, max = 5) {
        const el = document.getElementById(containerId);
        if (!el) return;
        let html = '';
        questions.forEach((q, idx) => {
            html += `<div class="q-item" id="item-${q.code}">
                <div class="q-item-number">${q.code.toUpperCase()} — Pertanyaan ${idx + 1}</div>
                <div class="q-item-text">${q.text}</div>
                ${this._buildLikertScale(q.code, max)}
            </div>`;
        });
        el.innerHTML = html;
        questions.forEach(q => {
            document.querySelectorAll(`input[name="${q.code}"]`).forEach(input => {
                input.addEventListener('change', () => {
                    document.getElementById(`item-${q.code}`).classList.add('q-answered');
                    document.getElementById(`item-${q.code}`).classList.remove('q-has-error');
                });
            });
        });
    },

    _buildSemanticQuestions() {
        const el = document.getElementById('ueq-questions');
        if (!el) return;
        let html = '';
        this.UEQ_PAIRS.forEach((pair, idx) => {
            html += `<div class="q-item" id="item-${pair.code}">
                <div class="q-item-number">${pair.code.toUpperCase()} — Pasangan ${idx + 1}</div>
                <div class="q-semantic-labels">
                    <span class="q-semantic-neg">${pair.neg}</span>
                    <span class="q-semantic-pos">${pair.pos}</span>
                </div>
                <div class="q-semantic-scale">`;
            for (let i = 1; i <= 7; i++) {
                html += `<div class="q-semantic-opt">
                    <input type="radio" name="${pair.code}" id="${pair.code}_${i}" value="${i}">
                    <label for="${pair.code}_${i}"><div class="q-semantic-dot">${i}</div></label>
                </div>`;
            }
            html += `</div></div>`;
        });
        el.innerHTML = html;
        this.UEQ_PAIRS.forEach(pair => {
            document.querySelectorAll(`input[name="${pair.code}"]`).forEach(input => {
                input.addEventListener('change', () => {
                    document.getElementById(`item-${pair.code}`).classList.add('q-answered');
                    document.getElementById(`item-${pair.code}`).classList.remove('q-has-error');
                });
            });
        });
    },

    _buildNPSScale() {
        const el = document.getElementById('nps-scale');
        if (!el) return;
        let html = '';
        for (let i = 0; i <= 10; i++) {
            const cat = i <= 6 ? 'detractor' : (i <= 8 ? 'passive' : 'promoter');
            html += `<div class="q-nps-opt" data-cat="${cat}">
                <input type="radio" name="nps" id="nps_${i}" value="${i}">
                <label for="nps_${i}"><div class="q-nps-circle">${i}</div></label>
            </div>`;
        }
        el.innerHTML = html;
        document.querySelectorAll('input[name="nps"]').forEach(input => {
            input.addEventListener('change', () => {
                document.getElementById('nps-item').classList.remove('q-has-error');
                document.getElementById('nps-item').classList.add('q-answered');
            });
        });
    },

    _buildStepDots() {
        const el = document.getElementById('qStepDots');
        if (!el) return;
        let html = '';
        for (let i = 0; i < this.TOTAL_PAGES; i++) {
            html += `<div class="q-step-dot${i === 0 ? ' active' : ''}" data-step="${i}" title="${this.PAGE_LABELS[i]}"></div>`;
        }
        el.innerHTML = html;
    },

    // ═══════════════════════════════════════════
    // Navigation
    // ═══════════════════════════════════════════
    _updateProgress() {
        const pct = ((this.currentPage + 1) / this.TOTAL_PAGES) * 100;
        const fill = document.getElementById('qProgressFill');
        const label = document.getElementById('qProgressLabel');
        const count = document.getElementById('qProgressCount');
        if (fill) fill.style.width = pct + '%';
        if (label) label.textContent = this.PAGE_LABELS[this.currentPage];
        if (count) count.textContent = `${this.currentPage + 1} / ${this.TOTAL_PAGES}`;

        document.querySelectorAll('.q-step-dot').forEach((dot, idx) => {
            dot.classList.remove('active');
            if (idx < this.currentPage) dot.classList.add('completed');
            if (idx === this.currentPage) dot.classList.add('active');
        });
    },

    showPage(idx) {
        document.querySelectorAll('.q-page').forEach(p => p.classList.remove('active'));
        const page = document.getElementById(`qpage-${idx}`);
        if (page) {
            page.classList.add('active');
            page.style.animation = 'none';
            page.offsetHeight;
            page.style.animation = '';
        }
        this.currentPage = idx;
        this._updateProgress();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    nextPage() {
        if (!this._validatePage(this.currentPage)) return;
        if (this.currentPage < this.TOTAL_PAGES - 1) {
            this.showPage(this.currentPage + 1);
        }
    },

    prevPage() {
        if (this.currentPage > 0) {
            this.showPage(this.currentPage - 1);
        }
    },

    // ═══════════════════════════════════════════
    // Validation
    // ═══════════════════════════════════════════
    _showPageError(pageIdx, msg) {
        const el = document.getElementById(`qerror-${pageIdx}`);
        if (el) {
            el.querySelector('span').textContent = msg;
            el.classList.add('q-show');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },

    _clearPageError(pageIdx) {
        const el = document.getElementById(`qerror-${pageIdx}`);
        if (el) el.classList.remove('q-show');
    },

    _validatePage(pageIdx) {
        this._clearPageError(pageIdx);

        if (pageIdx === 0) {
            const fields = [
                { id: 'resp-name', label: 'Nama' },
                { id: 'resp-age', label: 'Usia' },
                { id: 'resp-gender', label: 'Jenis Kelamin' },
                { id: 'resp-background', label: 'Latar Belakang' },
                { id: 'resp-frequency', label: 'Frekuensi' }
            ];
            for (const f of fields) {
                const el = document.getElementById(f.id);
                if (!el || !el.value.trim()) {
                    if (el) el.classList.add('q-error');
                    this._showPageError(0, `Mohon isi field "${f.label}".`);
                    if (el) el.focus();
                    return false;
                }
                el.classList.remove('q-error');
            }
            return true;
        }

        const questionMap = {
            1: this.SUS_QUESTIONS.map(q => q.code),
            2: this.UIUX_QUESTIONS.map(q => q.code),
            3: this.TAM_QUESTIONS.map(q => q.code),
            4: this.UEQ_PAIRS.map(q => q.code),
            5: this.TRUST_QUESTIONS.map(q => q.code),
            6: this.THERAPEUTIC_QUESTIONS.map(q => q.code),
            7: this.ENGAGEMENT_QUESTIONS.map(q => q.code),
        };

        if (questionMap[pageIdx]) {
            const codes = questionMap[pageIdx];
            const unanswered = [];
            codes.forEach(code => {
                if (!document.querySelector(`input[name="${code}"]:checked`)) {
                    unanswered.push(code);
                    const item = document.getElementById(`item-${code}`);
                    if (item) item.classList.add('q-has-error');
                }
            });
            if (unanswered.length > 0) {
                this._showPageError(pageIdx, `Masih ada ${unanswered.length} pertanyaan yang belum dijawab.`);
                const first = document.getElementById(`item-${unanswered[0]}`);
                if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
                return false;
            }
            return true;
        }

        if (pageIdx === 8) {
            if (!document.querySelector('input[name="nps"]:checked')) {
                document.getElementById('nps-item').classList.add('q-has-error');
                this._showPageError(8, 'Mohon berikan skor rekomendasi (NPS).');
                document.getElementById('nps-item').scrollIntoView({ behavior: 'smooth', block: 'center' });
                return false;
            }
            return true;
        }

        return true;
    },

    // ═══════════════════════════════════════════
    // Score Calculations
    // ═══════════════════════════════════════════
    _getRadioValue(name) {
        const el = document.querySelector(`input[name="${name}"]:checked`);
        return el ? parseInt(el.value) : 0;
    },

    _calcSUS() {
        const rawScores = {};
        let total = 0;
        this.SUS_QUESTIONS.forEach((q, idx) => {
            const val = this._getRadioValue(q.code);
            rawScores[q.code] = val;
            if ((idx + 1) % 2 === 1) total += (val - 1);
            else total += (5 - val);
        });
        const totalScore = total * 2.5;
        let grade = 'Poor';
        if (totalScore >= 85) grade = 'Excellent';
        else if (totalScore >= 71) grade = 'Good';
        else if (totalScore >= 51) grade = 'OK';
        return { rawScores, totalScore, grade };
    },

    _calcUIUX() {
        const rawScores = {};
        let navTotal = 0, navCount = 0, featureTotal = 0, featureCount = 0;
        this.UIUX_QUESTIONS.forEach(q => {
            const val = this._getRadioValue(q.code);
            rawScores[q.code] = val;
            if (q.group === 'nav') { navTotal += val; navCount++; }
            else { featureTotal += val; featureCount++; }
        });
        const allVals = Object.values(rawScores);
        return {
            rawScores,
            avgScore: +(allVals.reduce((a, b) => a + b, 0) / allVals.length).toFixed(2),
            avgNavigation: +(navTotal / navCount).toFixed(2),
            avgFeatures: +(featureTotal / featureCount).toFixed(2)
        };
    },

    _calcTAM() {
        const rawScores = {};
        let usefulTotal = 0, usefulCount = 0, easeTotal = 0, easeCount = 0;
        this.TAM_QUESTIONS.forEach(q => {
            const val = this._getRadioValue(q.code);
            rawScores[q.code] = val;
            if (q.group === 'usefulness') { usefulTotal += val; usefulCount++; }
            else { easeTotal += val; easeCount++; }
        });
        const perceivedUsefulness = +(usefulTotal / usefulCount).toFixed(2);
        const perceivedEaseOfUse = +(easeTotal / easeCount).toFixed(2);
        return { rawScores, perceivedUsefulness, perceivedEaseOfUse, overallAvg: +((perceivedUsefulness + perceivedEaseOfUse) / 2).toFixed(2) };
    },

    _calcSimpleAvg(questions) {
        const rawScores = {};
        questions.forEach(q => { rawScores[q.code] = this._getRadioValue(q.code); });
        const vals = Object.values(rawScores);
        return { rawScores, avgScore: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) };
    },

    _calcNPS() {
        const score = this._getRadioValue('nps');
        let category = 'Detractor';
        if (score >= 9) category = 'Promoter';
        else if (score >= 7) category = 'Passive';
        return { score, category };
    },

    // ═══════════════════════════════════════════
    // Submit
    // ═══════════════════════════════════════════
    async submit() {
        if (!this._validatePage(8)) return;

        const btn = document.getElementById('qBtnSubmit');
        btn.classList.add('q-loading');
        btn.disabled = true;

        try {
            const db = firebase.firestore();
            const sus = this._calcSUS();
            const uiux = this._calcUIUX();
            const tam = this._calcTAM();
            const ueq = this._calcSimpleAvg(this.UEQ_PAIRS);
            const trust = this._calcSimpleAvg(this.TRUST_QUESTIONS);
            const therapeutic = this._calcSimpleAvg(this.THERAPEUTIC_QUESTIONS);
            const engagement = this._calcSimpleAvg(this.ENGAGEMENT_QUESTIONS);
            const nps = this._calcNPS();

            const user = firebase.auth().currentUser;
            const data = {
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                userId: user ? user.uid : null,
                appVersion: 'SynaWatch v1.0 MVP',
                testingPhase: 'Without Smartwatch',
                source: 'questionnaire',
                responden: {
                    name: document.getElementById('resp-name').value.trim(),
                    ageRange: document.getElementById('resp-age').value,
                    gender: document.getElementById('resp-gender').value,
                    background: document.getElementById('resp-background').value,
                    appFrequency: document.getElementById('resp-frequency').value
                },
                sus, uiux, tam, ueq, trust, therapeutic, engagement, nps,
                openEnded: {
                    liked: document.getElementById('open-liked').value.trim(),
                    confusing: document.getElementById('open-confusing').value.trim(),
                    missing: document.getElementById('open-missing').value.trim(),
                    smartwatch: document.getElementById('open-smartwatch').value.trim(),
                    suggestion: document.getElementById('open-suggestion').value.trim()
                },
                summary: {
                    susScore: sus.totalScore,
                    uiuxAvg: uiux.avgScore,
                    tamAvg: tam.overallAvg,
                    ueqAvg: ueq.avgScore,
                    trustAvg: trust.avgScore,
                    therapeuticAvg: therapeutic.avgScore,
                    engagementAvg: engagement.avgScore,
                    nps: nps.score
                }
            };

            const docRef = await db.collection('questionnaireResults').add(data);

            document.querySelectorAll('.q-page').forEach(p => p.classList.remove('active'));
            document.getElementById('qProgressSection').style.display = 'none';
            document.getElementById('qSuccessDocId').textContent = `ID: ${docRef.id}`;
            document.getElementById('qSuccessScreen').classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });

        } catch (err) {
            console.error('Questionnaire submit error:', err);
            this._showPageError(8, 'Gagal menyimpan data. Periksa koneksi internet Anda dan coba lagi.');
            btn.classList.remove('q-loading');
            btn.disabled = false;
        }
    },

    // ═══════════════════════════════════════════
    // Reset
    // ═══════════════════════════════════════════
    reset() {
        document.querySelectorAll('#view-container input[type="radio"]').forEach(r => { r.checked = false; });
        document.querySelectorAll('#view-container .q-form-input, #view-container .q-form-select, #view-container .q-form-textarea').forEach(el => {
            if (el.tagName === 'SELECT') el.selectedIndex = 0;
            else el.value = '';
        });
        document.querySelectorAll('.q-item').forEach(el => { el.classList.remove('q-answered', 'q-has-error'); });
        document.querySelectorAll('.q-form-input, .q-form-select').forEach(el => { el.classList.remove('q-error'); });
        document.querySelectorAll('.q-page-error').forEach(el => el.classList.remove('q-show'));

        const btn = document.getElementById('qBtnSubmit');
        if (btn) { btn.classList.remove('q-loading'); btn.disabled = false; }

        document.querySelectorAll('.q-step-dot').forEach(d => d.classList.remove('completed', 'active'));

        document.getElementById('qProgressSection').style.display = '';
        document.getElementById('qSuccessScreen').classList.remove('active');
        this.currentPage = 0;
        this.showPage(0);
    }
};

window.Questionnaire = Questionnaire;
