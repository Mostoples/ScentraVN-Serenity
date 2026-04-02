/**
 * SYNAWATCH - HEROIC Program Module (Sprint 2)
 *
 * Implements the 36-activity HEROIC psychoeducation program across 6 dimensions.
 * Scientific grounding:
 * - Seligman et al. (2005): Positive psychology interventions
 * - Pennebaker (1986): Expressive writing & emotional processing
 * - Meevissen et al. (2011): Best Possible Self visualization
 * - Neff & Germer (2013): Mindful Self-Compassion program
 * - Fleming et al. (2017): Gamified mental health interventions
 * - Bozzini et al. (2023): Religiosity & digital mental health
 * - Holt-Lunstad et al. (2015): Social connection interventions
 */

// ─── Extend Views with HEROIC view ────────────────────────────────────────────
// Called after views.js loads; safely adds heroic() to the global Views object
if (typeof Views !== 'undefined') {
    Views.heroic = function() {
        return `
        <div class="view-container" style="max-width: 700px; margin: 0 auto; padding-top: 16px;">

            <!-- Hero Header -->
            <div style="background: linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%);
                        border-radius: 24px; padding: 24px; margin-bottom: 24px;
                        color: white; position: relative; overflow: hidden;">
                <div style="position: absolute; top: -20px; right: -20px; width: 120px; height: 120px;
                             background: rgba(255,255,255,0.08); border-radius: 50%;"></div>
                <div style="position: absolute; bottom: -30px; right: 40px; width: 80px; height: 80px;
                             background: rgba(255,255,255,0.06); border-radius: 50%;"></div>
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                    <div style="width: 52px; height: 52px; background: rgba(255,255,255,0.2);
                                border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-star-of-life" style="font-size: 1.5rem;"></i>
                    </div>
                    <div>
                        <h2 style="font-size: 1.4rem; font-weight: 800; margin: 0;">Program HEROIC</h2>
                        <p style="opacity: 0.85; font-size: 0.85rem; margin: 2px 0 0;">Psikoedukasi Psikologi Positif Berbasis Riset</p>
                    </div>
                </div>
                <!-- Overall HEROIC Score -->
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <p style="opacity: 0.75; font-size: 0.75rem; margin: 0;">HEROIC Wellness Index</p>
                        <div style="display: flex; align-items: baseline; gap: 6px;">
                            <span id="heroicOverallScore" style="font-size: 2.2rem; font-weight: 800;">--</span>
                            <span style="opacity: 0.7; font-size: 0.9rem;">/100</span>
                        </div>
                    </div>
                    <div id="heroicXAIBadge" style="background: rgba(255,255,255,0.15); border-radius: 12px;
                                                     padding: 8px 14px; font-size: 0.75rem; text-align: center;">
                        <i class="fas fa-brain"></i> XAI Active<br>
                        <span style="opacity: 0.8; font-size: 0.7rem;">Personalized</span>
                    </div>
                </div>
            </div>

            <!-- Radar Chart Card -->
            <div class="card" style="padding: 20px; margin-bottom: 24px;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                    <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0;">
                        <i class="fas fa-chart-radar" style="color: #8B5CF6;"></i> Profil 6 Dimensi
                    </h3>
                    <button onclick="HeroicProgram.showXAIExplanation()" style="background: none; border: 1px solid #8B5CF6;
                            color: #8B5CF6; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; cursor: pointer;">
                        <i class="fas fa-info-circle"></i> Kenapa ini?
                    </button>
                </div>
                <canvas id="heroicRadarChart" style="max-height: 280px;"></canvas>
            </div>

            <!-- Dimension Cards -->
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 16px;">
                <i class="fas fa-layer-group" style="color: #8B5CF6;"></i> 6 Dimensi HEROIC
            </h3>
            <div id="heroicDimensionGrid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 24px;">
                <!-- Filled by HeroicProgram.renderDimensions() -->
            </div>

            <!-- Today's Recommendations (XAI-powered) -->
            <div class="card" style="padding: 20px; margin-bottom: 24px; border-left: 4px solid #8B5CF6;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
                    <div style="width: 36px; height: 36px; background: linear-gradient(135deg, #DDD6FE, #8B5CF6);
                                border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas fa-wand-magic-sparkles" style="color: #5B21B6; font-size: 1rem;"></i>
                    </div>
                    <div>
                        <h4 style="font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin: 0;">
                            Rekomendasi Hari Ini
                        </h4>
                        <p style="font-size: 0.75rem; color: var(--text-tertiary); margin: 0;">Dipersonalisasi oleh XAI</p>
                    </div>
                </div>
                <div id="heroicRecommendations">
                    <div style="text-align: center; padding: 20px; color: var(--text-tertiary);">
                        <div class="loading-spinner" style="margin: 0 auto 8px;"></div>
                        <p style="font-size: 0.85rem;">Menganalisis data Anda...</p>
                    </div>
                </div>
            </div>

            <!-- Activity Library -->
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
                <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0;">
                    <i class="fas fa-book-open" style="color: #8B5CF6;"></i> Perpustakaan Aktivitas
                </h3>
                <div id="heroicDimFilter" style="display: flex; gap: 6px; flex-wrap: wrap;">
                    <button class="heroic-filter-btn active" data-dim="all" onclick="HeroicProgram.filterActivities('all')">Semua</button>
                    <button class="heroic-filter-btn" data-dim="H" onclick="HeroicProgram.filterActivities('H')">H</button>
                    <button class="heroic-filter-btn" data-dim="E" onclick="HeroicProgram.filterActivities('E')">E</button>
                    <button class="heroic-filter-btn" data-dim="R" onclick="HeroicProgram.filterActivities('R')">R</button>
                    <button class="heroic-filter-btn" data-dim="O" onclick="HeroicProgram.filterActivities('O')">O</button>
                    <button class="heroic-filter-btn" data-dim="I" onclick="HeroicProgram.filterActivities('I')">I</button>
                    <button class="heroic-filter-btn" data-dim="C" onclick="HeroicProgram.filterActivities('C')">C</button>
                </div>
            </div>
            <div id="heroicActivityList" style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px;">
                <!-- Filled by HeroicProgram.renderActivities() -->
            </div>

        </div>

        <style>
        .heroic-filter-btn {
            padding: 4px 12px; border-radius: 20px; font-size: 0.78rem; font-weight: 600;
            border: 1px solid var(--border-color); background: var(--bg-secondary);
            color: var(--text-secondary); cursor: pointer; transition: all 0.2s;
        }
        .heroic-filter-btn.active, .heroic-filter-btn:hover {
            background: #8B5CF6; color: white; border-color: #8B5CF6;
        }
        .heroic-dim-card {
            background: white; border-radius: 16px; padding: 16px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06); cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s; border: 2px solid transparent;
        }
        .heroic-dim-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.12); }
        .heroic-dim-card.active { border-color: #8B5CF6; }
        .heroic-activity-card {
            background: white; border-radius: 16px; padding: 16px 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; align-items: center;
            gap: 16px; transition: transform 0.2s; cursor: pointer;
        }
        .heroic-activity-card:hover { transform: translateX(4px); }
        .heroic-activity-card.completed { opacity: 0.7; border-left: 4px solid #10B981; }
        .heroic-activity-modal {
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15,23,42,0.6); backdrop-filter: blur(8px);
            display: flex; align-items: flex-end; justify-content: center;
            z-index: 9999; animation: fadeIn 0.3s;
        }
        .heroic-activity-sheet {
            background: white; border-radius: 28px 28px 0 0; padding: 28px 24px 40px;
            width: 100%; max-width: 700px; max-height: 85vh; overflow-y: auto;
            animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .heroic-timer-circle {
            width: 120px; height: 120px; border-radius: 50%;
            background: conic-gradient(#8B5CF6 0%, #E5E7EB 0%);
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 16px; position: relative;
        }
        .heroic-timer-inner {
            width: 96px; height: 96px; border-radius: 50%; background: white;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.8rem; font-weight: 800; color: #8B5CF6;
        }
        @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
        }
        </style>
        `;
    };
}

// ─── HEROIC Program Controller ────────────────────────────────────────────────
const HeroicProgram = {

    radarChart: null,
    currentDimFilter: 'all',
    activeActivity: null,
    activityTimer: null,
    completedToday: new Set(),  // activity IDs completed today

    // ─── 36 Activities Library ────────────────────────────────────────────────
    // 6 per dimension (6 × 6 = 36), grounded in evidence-based protocols
    ACTIVITIES: [
        // ── H: HUMOR ──────────────────────────────────────────────────────────
        {
            id: 'H01', dim: 'H', title: 'Daily Humor Jar',
            subtitle: 'Kumpulkan momen lucu hari ini',
            icon: 'fa-jar', duration: 5,
            tag: 'Humor', tagColor: '#F59E0B',
            description: 'Tuliskan atau rekam 1–3 momen lucu/aneh yang terjadi hari ini. Humor ringan terbukti menurunkan kortisol 20% dalam waktu singkat.',
            instructions: [
                'Duduk nyaman selama 5 menit',
                'Ingat 1–3 momen lucu hari ini (bahkan hal kecil pun tidak apa)',
                'Tuliskan di bawah dengan detail',
                'Baca ulang dan biarkan senyum datang'
            ],
            hasTextInput: true,
            inputPrompt: 'Ceritakan momen lucu hari ini...',
            reference: 'Crawford & Caltabiano (2022)'
        },
        {
            id: 'H02', dim: 'H', title: 'Laughter Breathing',
            subtitle: 'Pernapasan tawa 5 menit',
            icon: 'fa-face-laugh-squint', duration: 5,
            tag: 'Humor', tagColor: '#F59E0B',
            description: 'Teknik Laughter Yoga: tarik nafas dalam, lalu hembuskan sambil bersuara "ha-ha-ha". Aktivasi endorfin melalui tawa yang diinduksi.',
            instructions: [
                'Tarik nafas dalam lewat hidung (4 detik)',
                'Tahan sebentar (2 detik)',
                'Hembuskan sambil bersuara "ha-ha-ha" (4 detik)',
                'Ulangi 10 kali. Jangan khawatir terdengar aneh!'
            ],
            isTimedExercise: true,
            exerciseDuration: 5,
            reference: 'Gonot-Schoupinsky & Garip (2019)'
        },
        {
            id: 'H03', dim: 'H', title: 'Incongruity Finder',
            subtitle: 'Temukan ketidaksesuaian lucu di sekitarmu',
            icon: 'fa-magnifying-glass', duration: 7,
            tag: 'Humor', tagColor: '#F59E0B',
            description: 'Cognitive humor: latih otak mendeteksi inkongruensi (perbedaan antara harapan dan kenyataan) — komponen utama humor kognitif (Martin, 2001).',
            instructions: [
                'Amati lingkungan sekitarmu selama 3 menit',
                'Cari sesuatu yang "tidak seharusnya ada di sana" atau "tidak cocok"',
                'Buat keterangan lucu untuk benda/situasi tersebut',
                'Tambahkan ke jurnal humormu'
            ],
            hasTextInput: true,
            inputPrompt: 'Apa yang kamu temukan? Buat keterangan lucu...',
            reference: 'Martin (2001)'
        },
        {
            id: 'H04', dim: 'H', title: 'Funny Reframe',
            subtitle: 'Ubah keluhan jadi komedi',
            icon: 'fa-masks-theater', duration: 8,
            tag: 'Humor', tagColor: '#F59E0B',
            description: 'Teknik cognitive reappraisal via humor: bingkai ulang masalah sehari-hari menjadi bahan komedi. Terbukti meningkatkan resiliensi kognitif (Beck & Clark, 1988).',
            instructions: [
                'Pilih satu hal yang mengganggumu hari ini',
                'Bayangkan itu adalah materi stand-up comedy',
                'Tuliskan versi "lebay" dan lucu dari masalah itu',
                'Baca ulang — apakah terasa lebih ringan?'
            ],
            hasTextInput: true,
            inputPrompt: 'Masalahmu: ... Versi komedi-nya: ...',
            reference: 'Martin (2001); Beck & Clark (1988)'
        },
        {
            id: 'H05', dim: 'H', title: 'Childhood Giggle Memory',
            subtitle: 'Kenang momen tawa masa kecil',
            icon: 'fa-child-reaching', duration: 10,
            tag: 'Humor', tagColor: '#F59E0B',
            description: 'Reminiscence therapy via humor: mengingat memori tawa masa kecil mengaktifkan jaringan saraf positif yang sama (Thakkar et al., 2024).',
            instructions: [
                'Tutup mata, tarik nafas dalam',
                'Kembali ke satu memori tawa paling kuat dari masa kecilmu',
                'Rasakan sensasi di tubuhmu saat itu',
                'Tuliskan detail memori tersebut'
            ],
            hasTextInput: true,
            inputPrompt: 'Ceritakan memori tawa masa kecilmu...',
            reference: 'Thakkar et al. (2024)'
        },
        {
            id: 'H06', dim: 'H', title: 'Comic Relief Journal',
            subtitle: 'Gambar/tulis strip komik hidupmu',
            icon: 'fa-pen-nib', duration: 15,
            tag: 'Humor', tagColor: '#F59E0B',
            description: 'Art-based humor expression: menulis atau menggambar strip komik dari kejadian hari ini mengintegrasikan ekspresi kreatif dan humor.',
            instructions: [
                'Ambil kertas/buka catatan',
                'Bagi menjadi 3–4 panel (bisa teks saja)',
                'Gambarkan kejadian hari ini seperti kartun',
                'Beri judul yang lucu'
            ],
            hasTextInput: true,
            inputPrompt: 'Judul strip komikmu hari ini...',
            reference: 'Fleming et al. (2017)'
        },

        // ── E: EFFICACY ────────────────────────────────────────────────────────
        {
            id: 'E01', dim: 'E', title: 'Micro-Mastery Mission',
            subtitle: 'Selesaikan 1 tugas kecil sekarang',
            icon: 'fa-circle-check', duration: 10,
            tag: 'Efikasi', tagColor: '#3B82F6',
            description: 'Bandura (1997): mastery experiences (pengalaman keberhasilan) adalah sumber self-efficacy terkuat. Tugas kecil yang selesai = kepercayaan diri bertumbuh.',
            instructions: [
                'Pilih 1 tugas yang sudah lama ditunda (maks. 10 menit)',
                'Selesaikan sekarang',
                'Rayakan dengan "ya!" keras',
                'Catat pencapaianmu di bawah'
            ],
            hasTextInput: true,
            inputPrompt: 'Tugas apa yang kamu selesaikan? Bagaimana rasanya?',
            reference: 'Bandura (1997); Chua et al. (2020)'
        },
        {
            id: 'E02', dim: 'E', title: 'Strength Inventory',
            subtitle: 'Identifikasi 5 kekuatanmu',
            icon: 'fa-list-check', duration: 10,
            tag: 'Efikasi', tagColor: '#3B82F6',
            description: 'Character strengths identification (Seligman, 2005): mengenali dan menggunakan kekuatan karakter meningkatkan self-efficacy dan well-being.',
            instructions: [
                'Tulis 5 kekuatan atau kemampuanmu',
                'Ingat situasi ketika kamu menggunakan setiap kekuatan',
                'Pilih 1 kekuatan yang akan kamu gunakan hari ini',
                'Tuliskan rencana konkretnya'
            ],
            hasTextInput: true,
            inputPrompt: 'Kekuatanku: 1) ... 2) ... Rencanaku: ...',
            reference: 'Seligman et al. (2005)'
        },
        {
            id: 'E03', dim: 'E', title: 'Success Timeline',
            subtitle: 'Petakan pencapaian hidupmu',
            icon: 'fa-timeline', duration: 12,
            tag: 'Efikasi', tagColor: '#3B82F6',
            description: 'Vicarious reinforcement via personal history: merekonstruksi timeline keberhasilan diri mengaktifkan keyakinan bahwa tantangan baru juga dapat diatasi.',
            instructions: [
                'Buat garis waktu dari 5 tahun terakhir',
                'Tandai 5 pencapaian penting (sekecil apapun)',
                'Untuk setiap pencapaian: apa hambatannya? bagaimana kamu mengatasinya?',
                'Kesimpulan: apa pola kekuatanmu?'
            ],
            hasTextInput: true,
            inputPrompt: 'Pencapaianku: Tahun...: ... Pola kekuatanku:...',
            reference: 'Bandura (1977); Kelders et al. (2012)'
        },
        {
            id: 'E04', dim: 'E', title: 'Positive Self-Talk Script',
            subtitle: 'Tulis monolog motivasi personalmu',
            icon: 'fa-comment-dots', duration: 8,
            tag: 'Efikasi', tagColor: '#3B82F6',
            description: 'Verbal persuasion (Bandura, 1977): self-talk positif yang dibuat sendiri lebih efektif daripada afirmasi generik karena relevan secara personal.',
            instructions: [
                'Bayangkan dirimu di momen paling penuh keyakinan',
                'Tulis apa yang dikatakan "dirimu terkuat" kepada dirimu saat ini',
                'Buat dalam format surat personal (mulai dengan nama panggilanmu)',
                'Baca keras-keras setelah selesai'
            ],
            hasTextInput: true,
            inputPrompt: 'Surat untuk diriku sendiri...',
            reference: 'Bandura (1977)'
        },
        {
            id: 'E05', dim: 'E', title: 'Challenge Ladder',
            subtitle: 'Buat tangga tantangan bertahap',
            icon: 'fa-stairs', duration: 12,
            tag: 'Efikasi', tagColor: '#3B82F6',
            description: 'Graduated exposure (Beck, 1979): menyusun hierarki tantangan dari mudah ke sulit membangun self-efficacy secara progresif tanpa overwhelming.',
            instructions: [
                'Pilih satu tujuan besar yang terasa menakutkan',
                'Pecah menjadi 5 langkah bertahap (dari sangat mudah)',
                'Langkah pertama harus bisa kamu lakukan hari ini',
                'Tandai setiap langkah yang berhasil'
            ],
            hasTextInput: true,
            inputPrompt: 'Tujuanku: ... Langkah 1 (mudah): ... Langkah 5 (final): ...',
            reference: 'Beck (1979); Chua et al. (2020)'
        },
        {
            id: 'E06', dim: 'E', title: 'Physiological Empowerment',
            subtitle: 'Power pose 2 menit',
            icon: 'fa-person-arms-open', duration: 5,
            tag: 'Efikasi', tagColor: '#3B82F6',
            description: 'Physiological arousal reinterpretation (Bandura): adopting expansive posture moderates self-efficacy perception; combined with breathing, reduces cortisol.',
            instructions: [
                'Berdiri tegak atau duduk tegak dengan bahu terbuka',
                'Tangan di pinggang atau lengan terbuka (pose "Superman")',
                'Tarik nafas dalam 3x',
                'Ulangi: "Saya mampu. Saya cukup. Saya kuat."'
            ],
            isTimedExercise: true,
            exerciseDuration: 2,
            reference: 'Bandura (1997)'
        },

        // ── R: RELIGIOSITY ─────────────────────────────────────────────────────
        {
            id: 'R01', dim: 'R', title: 'Dzikr Digital',
            subtitle: '100x tasbih dengan nafas sadar',
            icon: 'fa-hands-praying', duration: 10,
            tag: 'Religiusitas', tagColor: '#10B981',
            description: 'Dzikr (remembrance) practice: repitisi kalimat tasbih dengan nafas sadar mengaktifkan respons parasimpatis. Terbukti menurunkan HR dan kecemasan (Sholeh, 2021).',
            instructions: [
                'Duduk nyaman, tutup mata',
                'Tarik nafas dalam sambil hitung dalam hati',
                'SubhanAllah (33x) — Alhamdulillah (33x) — Allahu Akbar (34x)',
                'Fokus pada makna setiap kalimat'
            ],
            isTimedExercise: true,
            exerciseDuration: 10,
            reference: 'Sholeh (2021); Bozzini et al. (2023)'
        },
        {
            id: 'R02', dim: 'R', title: 'Syukur Journal',
            subtitle: 'Tulis 3 nikmat yang sering terlupakan',
            icon: 'fa-book-heart', duration: 8,
            tag: 'Religiusitas', tagColor: '#10B981',
            description: 'Gratitude-spiritual integration: menggabungkan latihan syukur dengan kerangka spiritual meningkatkan efek kedua intervensi (Davis et al., 2016).',
            instructions: [
                'Pikirkan 3 nikmat yang kamu miliki tapi jarang disadari',
                'Untuk setiap nikmat: siapa atau apa yang memungkinkannya ada?',
                'Ungkapkan dalam doa/kalimat syukur personalmu',
                'Rasakan perbedaan di dadamu'
            ],
            hasTextInput: true,
            inputPrompt: 'Nikmat 1: ... Nikmat 2: ... Nikmat 3: ...',
            reference: 'Davis et al. (2016); Bozzini et al. (2023)'
        },
        {
            id: 'R03', dim: 'R', title: 'Tawakal Timer',
            subtitle: 'Lepaskan kekhawatiran selama 5 menit',
            icon: 'fa-cloud', duration: 8,
            tag: 'Religiusitas', tagColor: '#10B981',
            description: 'Tawakal (tawakkul) practice: melatih menyerahkan kekhawatiran kepada Tuhan setelah ikhtiar adalah bentuk emotion regulation berbasis keimanan.',
            instructions: [
                'Tuliskan satu hal yang sedang kamu khawatirkan',
                'Tuliskan ikhtiar apa yang sudah/bisa kamu lakukan',
                'Tulis kalimat: "Aku sudah berusaha, sisanya aku serahkan."',
                'Tarik nafas dalam 3x dan rasakan kelegaan'
            ],
            hasTextInput: true,
            inputPrompt: 'Kekhawatiranku: ... Ikhtiarku: ...',
            reference: 'Koenig (2009); Newberg & Iversen (2003)'
        },
        {
            id: 'R04', dim: 'R', title: 'Makna di Balik Ujian',
            subtitle: 'Temukan makna dari kesulitan',
            icon: 'fa-lightbulb', duration: 12,
            tag: 'Religiusitas', tagColor: '#10B981',
            description: 'Meaning-making dari perspektif spiritual: Viktor Frankl menunjukkan bahwa menemukan makna dalam penderitaan adalah kondisi kesehatan mental paling fundamental.',
            instructions: [
                'Ingat satu kesulitan yang telah kamu lalui',
                'Pertanyaan: Apa yang kamu pelajari dari ujian itu?',
                'Pertanyaan: Bagaimana kesulitan itu membuatmu lebih kuat/bijak?',
                'Tulis makna yang bisa diambil dari pengalaman tersebut'
            ],
            hasTextInput: true,
            inputPrompt: 'Kesulitanku dulu: ... Maknanya:...',
            reference: 'VanderWeele et al. (2016)'
        },
        {
            id: 'R05', dim: 'R', title: 'Sholat Sadar',
            subtitle: 'Panduan sholat dengan penuh kesadaran',
            icon: 'fa-mosque', duration: 15,
            tag: 'Religiusitas', tagColor: '#10B981',
            description: 'Mindful prayer: menggabungkan teknik mindfulness dengan ibadah sholat meningkatkan fokus spiritual dan manfaat psikologis secara sinergis.',
            instructions: [
                'Siapkan diri untuk sholat (wudhu dengan kesadaran penuh)',
                'Di setiap gerakan, fokus pada artinya, bukan hanya gerakannya',
                'Setelah salam, duduk 3 menit dalam doa personal',
                'Catat satu insight yang datang saat sholat'
            ],
            hasTextInput: true,
            inputPrompt: 'Insight dari sholatku hari ini...',
            reference: 'Newberg & Iversen (2003); Rusmini & Agustini (2023)'
        },
        {
            id: 'R06', dim: 'R', title: 'Doa Spesifik',
            subtitle: 'Tulis doa paling tulus untuk hidupmu',
            icon: 'fa-star-and-crescent', duration: 10,
            tag: 'Religiusitas', tagColor: '#10B981',
            description: 'Purposive prayer (berdoa dengan niat spesifik) dikaitkan dengan peningkatan sense of control dan penurunan kecemasan dalam 48 jam (Koenig, 2009).',
            instructions: [
                'Tulis doa/harapan personalmu dalam kata-kata sendiri',
                'Spesifik: apa yang kamu minta? mengapa? bagaimana kamu akan berkontribusi?',
                'Tidak ada format baku — ini antara kamu dan Tuhan',
                'Tutup dengan rasa terima kasih'
            ],
            hasTextInput: true,
            inputPrompt: 'Doaku hari ini...',
            reference: 'Koenig (2009)'
        },

        // ── O: OPTIMISM ─────────────────────────────────────────────────────────
        {
            id: 'O01', dim: 'O', title: 'Best Possible Self',
            subtitle: 'Visualisasi diri terbaik dalam 5 tahun',
            icon: 'fa-star', duration: 15,
            tag: 'Optimisme', tagColor: '#8B5CF6',
            description: 'Best Possible Self (BPS) visualization: 2 minggu latihan BPS meningkatkan optimisme secara signifikan (d=0.83, Meevissen et al., 2011). Bayangkan versi terbaik dirimu di masa depan.',
            instructions: [
                'Tutup mata, bayangkan dirimu dalam 5 tahun ke depan',
                'Semua telah berjalan sangat baik — apa yang berbeda?',
                'Buka mata, tulis detail visi tersebut selama 10 menit',
                'Akhiri dengan: "Langkah kecil menuju ini hari ini adalah..."'
            ],
            hasTextInput: true,
            inputPrompt: 'Visi diriku dalam 5 tahun: ...',
            reference: 'Meevissen et al. (2011); Menezes et al. (2022)'
        },
        {
            id: 'O02', dim: 'O', title: 'Three Good Things',
            subtitle: 'Catat 3 hal baik hari ini',
            icon: 'fa-list-ol', duration: 8,
            tag: 'Optimisme', tagColor: '#8B5CF6',
            description: '"Three Good Things" / "What Went Well": intervensi paling diuji dalam psikologi positif, efektif dalam 1 minggu (Seligman et al., 2005; d=0.62).',
            instructions: [
                'Tulis 3 hal baik yang terjadi hari ini (sekecil apapun)',
                'Untuk setiap hal: MENGAPA terjadi? Siapa yang berkontribusi?',
                'Ini melatih otak mendeteksi hal positif secara otomatis',
                'Lakukan setiap malam selama 7 hari untuk efek optimal'
            ],
            hasTextInput: true,
            inputPrompt: '1. ... (karena...) 2. ... (karena...) 3. ... (karena...)',
            reference: 'Seligman et al. (2005)'
        },
        {
            id: 'O03', dim: 'O', title: 'Negative Thought Challenger',
            subtitle: 'Tantang pikiran negatif otomatis',
            icon: 'fa-chess', duration: 12,
            tag: 'Optimisme', tagColor: '#8B5CF6',
            description: 'Cognitive restructuring (Beck, 1979): identifikasi dan tantang pikiran otomatis negatif (NAT) adalah inti dari CBT. Versi digital terbukti efektif (Cuijpers et al., 2010).',
            instructions: [
                'Identifikasi satu pikiran negatif yang muncul hari ini',
                'Tanya: Apakah ada bukti yang mendukung pikiran ini?',
                'Tanya: Apakah ada bukti yang menentang pikiran ini?',
                'Tulis pikiran alternatif yang lebih realistis dan seimbang'
            ],
            hasTextInput: true,
            inputPrompt: 'Pikiran negatifku: ... Bukti menentangnya: ... Pikiran alternatif: ...',
            reference: 'Beck (1979); Cuijpers et al. (2010)'
        },
        {
            id: 'O04', dim: 'O', title: 'Future Letter',
            subtitle: 'Surat dari dirimu di masa depan',
            icon: 'fa-envelope-open-text', duration: 15,
            tag: 'Optimisme', tagColor: '#8B5CF6',
            description: 'Future-oriented writing: menulis dari perspektif masa depan yang sukses membuat otak "menerima" kemungkinan positif sebagai nyata (Lyubomirsky et al., 2005).',
            instructions: [
                'Bayangkan dirimu 3 tahun ke depan, telah melewati masa sulit ini',
                'Tulis surat dari "dirimu masa depan" kepada dirimu sekarang',
                'Apa yang ingin disampaikan? Apa yang ingin diingatkan?',
                'Tutup dengan kata-kata penyemangat'
            ],
            hasTextInput: true,
            inputPrompt: 'Surat dari diriku masa depan...',
            reference: 'Lyubomirsky et al. (2005)'
        },
        {
            id: 'O05', dim: 'O', title: 'Silver Lining Finder',
            subtitle: 'Temukan sisi positif dari situasi sulit',
            icon: 'fa-cloud-sun', duration: 10,
            tag: 'Optimisme', tagColor: '#8B5CF6',
            description: 'Benefit-finding / positive reappraisal: mencari manfaat dalam pengalaman negatif secara aktif adalah strategi coping terbukti efektif (Carver et al., 2010).',
            instructions: [
                'Pilih situasi sulit yang sedang atau telah kamu hadapi',
                'Paksa dirimu temukan TIGA hal positif dari situasi itu',
                'Bisa berupa pelajaran, kekuatan yang tumbuh, atau koneksi baru',
                'Tulis bagaimana hal-hal ini membuatmu lebih baik'
            ],
            hasTextInput: true,
            inputPrompt: 'Situasi sulitku: ... Tiga sisi positifnya: 1)... 2)... 3)...',
            reference: 'Carver et al. (2010)'
        },
        {
            id: 'O06', dim: 'O', title: 'Optimism Affirmation Recording',
            subtitle: 'Rekam & dengarkan afirmasi optimimsemu',
            icon: 'fa-microphone', duration: 5,
            tag: 'Optimisme', tagColor: '#8B5CF6',
            description: 'Verbal self-persuasion (Bandura): mendengar suara sendiri mengucapkan afirmasi lebih efektif dari membaca karena melibatkan auditory processing.',
            instructions: [
                'Tulis 3 kalimat afirmasi optimisme personal (bukan klise)',
                'Rekam dengan suaramu sendiri (gunakan voice memo)',
                'Dengarkan segera setelah bangun pagi selama 7 hari',
                'Contoh: "Saya mampu melewati hari ini karena telah melewati [ingat pencapaian]"'
            ],
            hasTextInput: true,
            inputPrompt: 'Afirmasi optimimseku: 1)... 2)... 3)...',
            reference: 'Bandura (1977); Seligman et al. (2005)'
        },

        // ── I: INTERACTION ──────────────────────────────────────────────────────
        {
            id: 'I01', dim: 'I', title: 'Gratitude Letter',
            subtitle: 'Tulis surat apresiasi tulus',
            icon: 'fa-envelope-heart', duration: 15,
            tag: 'Interaksi', tagColor: '#EC4899',
            description: 'Gratitude letter (Seligman, 2005): menulis surat apresiasi kepada seseorang yang berarti memiliki efek terbesar dalam studi positive psychology (d=0.80).',
            instructions: [
                'Pilih seseorang yang berarti namun belum pernah kamu ungkapkan rasa terima kasih',
                'Tulis surat 3–5 paragraf: spesifik tentang apa yang mereka lakukan dan dampaknya',
                'Kirim (atau baca langsung jika memungkinkan) untuk efek maksimal',
                'Tidak apa jika tidak dikirim — menulis saja sudah bermanfaat'
            ],
            hasTextInput: true,
            inputPrompt: 'Suratku untuk [nama]: ...',
            reference: 'Seligman et al. (2005); Davis et al. (2016)'
        },
        {
            id: 'I02', dim: 'I', title: 'Connection Audit',
            subtitle: 'Peta jaringan sosialmu',
            icon: 'fa-network-wired', duration: 10,
            tag: 'Interaksi', tagColor: '#EC4899',
            description: 'Social network mapping (Cacioppo, 2014): memvisualisasikan jaringan sosial membantu mengidentifikasi koneksi lemah yang bisa diperkuat dan koneksi toksik yang perlu dibatasi.',
            instructions: [
                'Gambar lingkaran konsentris: inti, tengah, luar',
                'Tempatkan orang-orang penting di lingkaran yang sesuai',
                'Identifikasi: siapa yang memberi energi? siapa yang menguras?',
                'Pilih satu orang untuk dihubungi hari ini'
            ],
            hasTextInput: true,
            inputPrompt: 'Orang yang akan kuhubungi hari ini: ... Alasan: ...',
            reference: 'Holt-Lunstad et al. (2015); Masi et al. (2011)'
        },
        {
            id: 'I03', dim: 'I', title: 'Random Act of Kindness',
            subtitle: 'Lakukan 1 kebaikan anonim',
            icon: 'fa-hand-holding-heart', duration: 15,
            tag: 'Interaksi', tagColor: '#EC4899',
            description: '"Helper\'s high": melakukan kebaikan mengaktifkan area reward otak yang sama dengan menerima reward. Efek signifikan pada mood dalam 24 jam (Curry et al., 2018; d=0.77).',
            instructions: [
                'Lakukan satu kebaikan hari ini untuk orang yang tidak dikenal',
                'Contoh: pujian tulus, pinjamkan payung, bayarkan kopi',
                'Tidak harus besar — yang penting tulus',
                'Tulis pengalaman dan bagaimana perasaanmu'
            ],
            hasTextInput: true,
            inputPrompt: 'Kebaikan yang kulakukan: ... Rasanya: ...',
            reference: 'Curry et al. (2018); Post (2005)'
        },
        {
            id: 'I04', dim: 'I', title: 'Deep Listening Practice',
            subtitle: 'Latihan mendengarkan penuh tanpa interupsi',
            icon: 'fa-ear-listen', duration: 15,
            tag: 'Interaksi', tagColor: '#EC4899',
            description: 'Active listening (Rogers, 1951): kemampuan mendengarkan dengan empati adalah keterampilan sosial terpenting yang dapat dilatih dan meningkatkan kualitas hubungan.',
            instructions: [
                'Dalam percakapan berikutnya, latih mendengar 2 menit tanpa interupsi',
                'Fokus memahami, bukan menyiapkan respons',
                'Tunjukkan dengan anggukan dan kontak mata',
                'Setelah selesai, tulis insight apa yang kamu dapatkan'
            ],
            hasTextInput: true,
            inputPrompt: 'Apa yang kupelajari dari mendengarkan hari ini...',
            reference: 'Christensen et al. (2006)'
        },
        {
            id: 'I05', dim: 'I', title: 'Social Fear Exposé',
            subtitle: 'Hadapi satu situasi sosial yang biasa kamu hindari',
            icon: 'fa-people-arrows', duration: 20,
            tag: 'Interaksi', tagColor: '#EC4899',
            description: 'Graduated exposure for social anxiety (Beck, 1979): menghindari situasi sosial memperparah kecemasan. Terpapar secara bertahap dalam dosis kecil terbukti mengurangi ketakutan.',
            instructions: [
                'Identifikasi satu situasi sosial yang biasa kamu hindari',
                'Buat versi yang paling ringan dari situasi itu',
                'Lakukan situasi ringan itu hari ini',
                'Catat: apa yang kamu takutkan vs apa yang sebenarnya terjadi?'
            ],
            hasTextInput: true,
            inputPrompt: 'Situasi yang kuhindari: ... Versi ringannya: ... Hasilnya: ...',
            reference: 'Beck (1979); Christensen et al. (2006)'
        },
        {
            id: 'I06', dim: 'I', title: 'Community Contribution',
            subtitle: 'Berikan sesuatu kepada komunitasmu',
            icon: 'fa-people-carry-box', duration: 20,
            tag: 'Interaksi', tagColor: '#EC4899',
            description: 'Prosocial behavior and well-being (Post, 2005): berkontribusi pada kelompok/komunitas memenuhi kebutuhan koneksi + kompetensi + otonomi sekaligus.',
            instructions: [
                'Pilih satu kontribusi kecil untuk komunitasmu (online atau offline)',
                'Contoh: jawab pertanyaan di forum, bantu tetangga, donasi waktu',
                'Rencanakan dan lakukan hari ini atau besok',
                'Refleksi: apa yang berubah dalam perasaanmu?'
            ],
            hasTextInput: true,
            inputPrompt: 'Kontribusiku: ... Dampak yang kurasakan: ...',
            reference: 'Post (2005); Curry et al. (2018)'
        },

        // ── C: COMPASSION ───────────────────────────────────────────────────────
        {
            id: 'C01', dim: 'C', title: 'Self-Compassion Break',
            subtitle: 'Latihan kasih diri 3 menit',
            icon: 'fa-heart-pulse', duration: 5,
            tag: 'Kasih Diri', tagColor: '#EF4444',
            description: 'Self-Compassion Break (Neff & Germer, 2013): intervensi 3-komponen terbukti mengurangi self-criticism dalam 1 sesi. Tiga komponen: mindfulness, common humanity, self-kindness.',
            instructions: [
                '1. MINDFULNESS: "Ini adalah momen penderitaan/kesulitan"',
                '2. KEMANUSIAAN BERSAMA: "Menderita adalah bagian dari kehidupan manusia. Aku tidak sendiri"',
                '3. KEBAIKAN DIRI: Letakkan tangan di hati. "Semoga aku baik-baik saja. Semoga aku kuat."',
                'Ulangi 3 kali dengan nafas dalam di antara setiap bagian'
            ],
            isTimedExercise: true,
            exerciseDuration: 5,
            reference: 'Neff & Germer (2013); MacBeth & Gumley (2012)'
        },
        {
            id: 'C02', dim: 'C', title: 'Inner Critic Transformer',
            subtitle: 'Ubah suara kritik menjadi suara sahabat',
            icon: 'fa-wand-sparkles', duration: 12,
            tag: 'Kasih Diri', tagColor: '#EF4444',
            description: 'Inner critic work (Neff, 2003): mengidentifikasi dan merespons suara kritik diri dengan sudut pandang "sahabat terbaik" adalah teknik inti MSC (Mindful Self-Compassion).',
            instructions: [
                'Tulis kritik terburuk yang biasa kamu ucapkan pada diri sendiri',
                'Bayangkan sahabat terbaikmu berkata hal itu padamu — apakah kamu terima?',
                'Sekarang tulis apa yang akan dikatakan "sahabat terbaikmu" sebagai respons',
                'Baca versi "sahabat" ini keras-keras kepada dirimu'
            ],
            hasTextInput: true,
            inputPrompt: 'Kritik batinku: "..." Respons sahabat terbaikku: "..."',
            reference: 'Neff (2003)'
        },
        {
            id: 'C03', dim: 'C', title: 'Body Scan Compassion',
            subtitle: 'Body scan dengan niat kasih sayang',
            icon: 'fa-person', duration: 12,
            tag: 'Kasih Diri', tagColor: '#EF4444',
            description: 'Compassionate body scan (Kabat-Zinn; Neff, 2003): menggabungkan body scan mindfulness dengan niat belas kasih menurunkan GSR dan regulasi kortisol lebih efektif.',
            instructions: [
                'Berbaring atau duduk nyaman, mata tertutup',
                'Mulai dari ujung kaki, perlahan naik ke kepala',
                'Di setiap bagian tubuh: rasakan sensasi dan ucapkan "Terima kasih [bagian tubuh] untuk semua yang kamu lakukan"',
                'Khusus area yang sakit/tegang: berikan perhatian ekstra dan kasih'
            ],
            isTimedExercise: true,
            exerciseDuration: 12,
            reference: 'Neff & Germer (2013)'
        },
        {
            id: 'C04', dim: 'C', title: 'Common Humanity Reflection',
            subtitle: 'Hubungkan penderitaanmu dengan kemanusiaan',
            icon: 'fa-globe', duration: 10,
            tag: 'Kasih Diri', tagColor: '#EF4444',
            description: 'Common humanity (Neff, 2003): kesadaran bahwa penderitaan adalah universal mengurangi isolasi emosional dan rasa malu yang memperparah depresi.',
            instructions: [
                'Tulis sesuatu yang membuatmu malu atau merasa gagal',
                'Sekarang bayangkan jutaan orang di seluruh dunia yang mengalami hal serupa',
                'Tulis satu kalimat yang menghubungkan pengalamanmu dengan pengalaman universal',
                'Rasakan beban yang berkurang ketika kamu tidak sendirian'
            ],
            hasTextInput: true,
            inputPrompt: 'Perasaan yang kubawa sendiri: ... Ternyata ini juga dirasakan oleh...',
            reference: 'Neff (2003); MacBeth & Gumley (2012)'
        },
        {
            id: 'C05', dim: 'C', title: 'Forgiveness Letter',
            subtitle: 'Tulis surat pemaafan untuk dirimu',
            icon: 'fa-scroll', duration: 15,
            tag: 'Kasih Diri', tagColor: '#EF4444',
            description: 'Self-forgiveness intervention (Homan, 2016): memaafkan diri sendiri dari kesalahan masa lalu signifikan menurunkan depresi dan meningkatkan self-compassion.',
            instructions: [
                'Ingat sesuatu yang kamu sesalkan dari masa lalu',
                'Tulis: apa yang terjadi, mengapa kamu membuat pilihan itu, apa yang sudah kamu pelajari',
                'Tulis kalimat pemaafan: "Aku memaafkan diriku karena... karena aku manusia dan belajar"',
                'Tutup amplop virtual ini dan biarkan ia pergi'
            ],
            hasTextInput: true,
            inputPrompt: 'Aku memaafkan diriku karena... Aku tahu kini bahwa...',
            reference: 'Homan (2016); Neff & Germer (2013)'
        },
        {
            id: 'C06', dim: 'C', title: 'Loving-Kindness Meditation',
            subtitle: 'Meditasi metta: cinta kasih ke diri & dunia',
            icon: 'fa-heart', duration: 10,
            tag: 'Kasih Diri', tagColor: '#EF4444',
            description: 'Loving-kindness meditation (LKM) meningkatkan positive affect, self-compassion, dan social connection sekaligus (d=0.60–0.80, meta-analysis, 2011).',
            instructions: [
                'Duduk nyaman, mata tertutup',
                'Arahkan ke diri sendiri: "Semoga aku bahagia. Semoga aku sehat. Semoga aku damai."',
                'Arahkan ke orang tersayang, lalu kenalan, lalu orang yang menyulitkan',
                'Akhiri: "Semoga semua makhluk bahagia dan bebas dari penderitaan."'
            ],
            isTimedExercise: true,
            exerciseDuration: 10,
            reference: 'Neff (2003); Luo et al. (2022)'
        }
    ],

    // ─── Initialize ────────────────────────────────────────────────────────────
    async init() {
        console.log('[HeroicProgram] Initializing...');

        // Load today's completions
        await this._loadCompletions();

        // Init radar chart
        this._initRadarChart();

        // Render dimension cards
        this.renderDimensions();

        // Generate XAI recommendations
        setTimeout(() => this.renderRecommendations(), 600);

        // Render activity library
        this.renderActivities('all');

        // Update overall score display
        if (typeof HeroicXAI !== 'undefined') {
            const score = HeroicXAI.getOverallScore();
            const el = document.getElementById('heroicOverallScore');
            if (el) {
                el.textContent = score;
                el.style.color = score >= 70 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444';
            }
        }
    },

    // ─── Radar Chart ───────────────────────────────────────────────────────────
    _initRadarChart() {
        const canvas = document.getElementById('heroicRadarChart');
        if (!canvas || typeof Chart === 'undefined') return;

        if (this.radarChart) {
            this.radarChart.destroy();
            this.radarChart = null;
        }

        const chartData = (typeof HeroicXAI !== 'undefined')
            ? HeroicXAI.getRadarChartData()
            : {
                labels: ['Humor', 'Efikasi Diri', 'Religiusitas', 'Optimisme', 'Interaksi', 'Kasih Diri'],
                datasets: [{ label: 'HEROIC', data: [50, 50, 50, 50, 50, 50],
                    backgroundColor: 'rgba(139,92,246,0.2)', borderColor: '#8B5CF6',
                    borderWidth: 2, pointRadius: 5 }]
            };

        this.radarChart = new Chart(canvas.getContext('2d'), {
            type: 'radar',
            data: chartData,
            options: {
                responsive: true,
                scales: {
                    r: {
                        min: 0, max: 100,
                        ticks: { stepSize: 25, font: { size: 10 } },
                        pointLabels: { font: { size: 11, weight: '600' } },
                        grid: { color: 'rgba(139,92,246,0.1)' },
                        angleLines: { color: 'rgba(139,92,246,0.15)' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}/100`
                        }
                    }
                }
            }
        });
    },

    // ─── Dimension Cards ───────────────────────────────────────────────────────
    renderDimensions() {
        const grid = document.getElementById('heroicDimensionGrid');
        if (!grid || typeof HeroicXAI === 'undefined') return;

        const dims = Object.values(HeroicXAI.DIMENSIONS);
        grid.innerHTML = dims.map(dim => {
            const score = HeroicXAI.scores[dim.key];
            const isLow = score < dim.threshold.low;
            const isMod = score < dim.threshold.moderate && !isLow;
            const statusColor = isLow ? '#EF4444' : isMod ? '#F59E0B' : '#10B981';
            const statusText = isLow ? 'Perlu perhatian' : isMod ? 'Sedang berkembang' : 'Baik';
            const completedCount = this.ACTIVITIES.filter(a => a.dim === dim.key && this.completedToday.has(a.id)).length;
            const totalCount = this.ACTIVITIES.filter(a => a.dim === dim.key).length;

            return `
            <div class="heroic-dim-card" onclick="HeroicProgram.filterActivities('${dim.key}')" data-dim="${dim.key}">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                    <div style="width: 36px; height: 36px; background: ${dim.gradient};
                                border-radius: 10px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas ${dim.icon}" style="color: white; font-size: 1rem;"></i>
                    </div>
                    <span style="font-size: 0.7rem; font-weight: 600; color: ${statusColor};
                                 background: ${statusColor}20; padding: 2px 8px; border-radius: 20px;">
                        ${statusText}
                    </span>
                </div>
                <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary); margin-bottom: 4px;">${dim.label}</div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <div style="flex: 1; height: 6px; background: #F3F4F6; border-radius: 3px; overflow: hidden;">
                        <div style="width: ${score}%; height: 100%; background: ${statusColor}; border-radius: 3px; transition: width 0.8s;"></div>
                    </div>
                    <span style="font-size: 0.85rem; font-weight: 700; color: ${statusColor};">${score}</span>
                </div>
                <div style="font-size: 0.72rem; color: var(--text-tertiary);">${completedCount}/${totalCount} aktivitas hari ini</div>
            </div>`;
        }).join('');
    },

    // ─── XAI Recommendations ──────────────────────────────────────────────────
    renderRecommendations() {
        const container = document.getElementById('heroicRecommendations');
        if (!container || typeof HeroicXAI === 'undefined') return;

        const needy = HeroicXAI.getDimensionsNeedingAttention().slice(0, 3);
        if (needy.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 16px; color: #10B981;">
                    <i class="fas fa-circle-check" style="font-size: 1.5rem; margin-bottom: 8px;"></i>
                    <p style="font-size: 0.9rem; font-weight: 600;">Semua dimensi HEROIC dalam kondisi baik!</p>
                    <p style="font-size: 0.8rem; color: var(--text-tertiary);">Pertahankan dengan aktivitas harian.</p>
                </div>`;
            return;
        }

        // Get recommended activities for each needy dimension
        const recs = needy.map(d => {
            // Find incomplete activity from this dimension
            const act = this.ACTIVITIES.find(a => a.dim === d.key && !this.completedToday.has(a.id));
            if (!act) return null;
            const xai = HeroicXAI.generateXAIExplanation(d.key);
            return { dim: d, act, xai };
        }).filter(Boolean);

        container.innerHTML = recs.map(({ dim, act, xai }) => `
            <div style="background: ${dim.info.color}10; border-radius: 14px; padding: 14px;
                        border-left: 4px solid ${dim.info.color}; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <div style="width: 32px; height: 32px; background: ${dim.info.gradient};
                                border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                        <i class="fas ${dim.info.icon}" style="color: white; font-size: 0.85rem;"></i>
                    </div>
                    <div>
                        <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);">
                            ${act.title}
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-tertiary);">${dim.info.label} • ${act.duration} menit</div>
                    </div>
                    <button onclick="HeroicProgram.openActivity('${act.id}')"
                            style="margin-left: auto; background: ${dim.info.color}; color: white;
                                   border: none; padding: 6px 14px; border-radius: 20px; font-size: 0.78rem;
                                   font-weight: 600; cursor: pointer;">
                        Mulai
                    </button>
                </div>
                <details style="margin-top: 4px;">
                    <summary style="font-size: 0.72rem; color: #8B5CF6; cursor: pointer;">
                        <i class="fas fa-brain"></i> Kenapa ini direkomendasikan?
                    </summary>
                    <div style="font-size: 0.72rem; color: var(--text-secondary); margin-top: 6px;
                                background: white; border-radius: 8px; padding: 10px; line-height: 1.6;
                                white-space: pre-line;">${xai}</div>
                </details>
            </div>`).join('');
    },

    // ─── Activity Library ─────────────────────────────────────────────────────
    filterActivities(dim) {
        this.currentDimFilter = dim;

        // Update filter button states
        document.querySelectorAll('.heroic-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-dim') === dim);
        });

        this.renderActivities(dim);
    },

    renderActivities(dim = 'all') {
        const list = document.getElementById('heroicActivityList');
        if (!list) return;

        const filtered = dim === 'all'
            ? this.ACTIVITIES
            : this.ACTIVITIES.filter(a => a.dim === dim);

        list.innerHTML = filtered.map(act => {
            const dimInfo = HeroicXAI.DIMENSIONS[act.dim];
            const isDone = this.completedToday.has(act.id);
            return `
            <div class="heroic-activity-card ${isDone ? 'completed' : ''}" onclick="HeroicProgram.openActivity('${act.id}')">
                <div style="width: 44px; height: 44px; background: ${dimInfo.gradient};
                            border-radius: 12px; display: flex; align-items: center; justify-content: center;
                            flex-shrink: 0;">
                    <i class="fas ${act.icon}" style="color: white; font-size: 1.1rem;"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 0.9rem; font-weight: 700; color: var(--text-primary);">${act.title}</div>
                    <div style="font-size: 0.78rem; color: var(--text-tertiary); white-space: nowrap;
                                overflow: hidden; text-overflow: ellipsis;">${act.subtitle}</div>
                    <div style="display: flex; gap: 6px; margin-top: 4px;">
                        <span style="font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 20px;
                                     background: ${dimInfo.color}20; color: ${dimInfo.color};">${act.tag}</span>
                        <span style="font-size: 0.7rem; color: var(--text-tertiary);">
                            <i class="fas fa-clock"></i> ${act.duration} mnt
                        </span>
                    </div>
                </div>
                ${isDone
                    ? '<i class="fas fa-check-circle" style="color: #10B981; font-size: 1.2rem;"></i>'
                    : '<i class="fas fa-chevron-right" style="color: var(--text-tertiary); font-size: 0.9rem;"></i>'}
            </div>`;
        }).join('');
    },

    // ─── Activity Modal ────────────────────────────────────────────────────────
    openActivity(actId) {
        const act = this.ACTIVITIES.find(a => a.id === actId);
        if (!act) return;

        this.activeActivity = act;
        const dimInfo = HeroicXAI.DIMENSIONS[act.dim];

        // Capture pre-activity sensor snapshot
        const sensorPre = this._getSensorSnapshot();

        const modal = document.createElement('div');
        modal.className = 'heroic-activity-modal';
        modal.id = 'heroicActivityModal';

        modal.innerHTML = `
        <div class="heroic-activity-sheet">
            <!-- Header -->
            <div style="display: flex; align-items: center; gap: 14px; margin-bottom: 20px;">
                <div style="width: 52px; height: 52px; background: ${dimInfo.gradient};
                            border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                    <i class="fas ${act.icon}" style="color: white; font-size: 1.4rem;"></i>
                </div>
                <div>
                    <div style="font-size: 1.1rem; font-weight: 800; color: var(--text-primary);">${act.title}</div>
                    <div style="font-size: 0.8rem; color: var(--text-tertiary);">${dimInfo.label} • ${act.duration} menit</div>
                </div>
                <button onclick="HeroicProgram.closeActivity()" style="margin-left: auto; background: none;
                        border: none; font-size: 1.3rem; color: var(--text-tertiary); cursor: pointer;">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <!-- Description -->
            <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 20px;
                      background: ${dimInfo.color}10; padding: 12px; border-radius: 12px;">
                ${act.description}
            </p>

            <!-- XAI Panel -->
            <details style="margin-bottom: 16px;">
                <summary style="font-size: 0.82rem; font-weight: 600; color: #8B5CF6; cursor: pointer; list-style: none;">
                    <i class="fas fa-brain"></i> Mengapa aktivitas ini? (XAI)
                </summary>
                <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 8px; padding: 10px;
                            background: #F5F3FF; border-radius: 10px; line-height: 1.7; white-space: pre-line;">
                    ${HeroicXAI.generateXAIExplanation(act.dim, { sensorData: sensorPre })}
                </div>
            </details>

            <!-- Instructions -->
            <div style="margin-bottom: 20px;">
                <h4 style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 10px;">
                    <i class="fas fa-list-check" style="color: ${dimInfo.color};"></i> Langkah-langkah
                </h4>
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    ${act.instructions.map((step, i) => `
                    <div style="display: flex; gap: 10px; align-items: flex-start;">
                        <div style="width: 24px; height: 24px; background: ${dimInfo.gradient};
                                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                                    flex-shrink: 0; font-size: 0.72rem; font-weight: 700; color: white;">${i+1}</div>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0; line-height: 1.5;">${step}</p>
                    </div>`).join('')}
                </div>
            </div>

            ${act.isTimedExercise ? `
            <!-- Timer -->
            <div style="text-align: center; margin-bottom: 20px;" id="activityTimerSection">
                <div class="heroic-timer-circle" id="heroicTimerCircle">
                    <div class="heroic-timer-inner" id="heroicTimerDisplay">${act.exerciseDuration}:00</div>
                </div>
                <button id="heroicTimerBtn" onclick="HeroicProgram.startTimer(${act.exerciseDuration})"
                        style="background: ${dimInfo.color}; color: white; border: none; padding: 12px 32px;
                               border-radius: 24px; font-size: 1rem; font-weight: 700; cursor: pointer;
                               box-shadow: 0 4px 12px ${dimInfo.color}40;">
                    <i class="fas fa-play"></i> Mulai Timer
                </button>
            </div>` : ''}

            ${act.hasTextInput ? `
            <!-- Text Input -->
            <div style="margin-bottom: 20px;">
                <label style="font-size: 0.82rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; display: block;">
                    Catatan / Refleksi
                </label>
                <textarea id="heroicActivityInput" placeholder="${act.inputPrompt}"
                    style="width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 12px;
                           font-size: 0.88rem; line-height: 1.5; min-height: 100px; resize: vertical;
                           font-family: inherit; box-sizing: border-box;"></textarea>
            </div>` : ''}

            <!-- Complete Button -->
            <button onclick="HeroicProgram.completeActivity('${act.id}')"
                    style="width: 100%; padding: 16px; background: linear-gradient(135deg, ${dimInfo.color}, ${dimInfo.color}CC);
                           color: white; border: none; border-radius: 20px; font-size: 1rem; font-weight: 700;
                           cursor: pointer; box-shadow: 0 6px 16px ${dimInfo.color}40;">
                <i class="fas fa-check"></i> Selesai & Tandai
            </button>

            <p style="text-align: center; font-size: 0.72rem; color: var(--text-tertiary); margin-top: 10px;">
                📚 Referensi: ${act.reference}
            </p>
        </div>`;

        document.body.appendChild(modal);

        // Store pre-sensor data on the modal element
        modal._sensorPre = sensorPre;
    },

    closeActivity() {
        const modal = document.getElementById('heroicActivityModal');
        if (modal) {
            this._stopTimer();
            modal.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => modal.remove(), 300);
        }
        this.activeActivity = null;
    },

    // ─── Timer Logic ───────────────────────────────────────────────────────────
    startTimer(minutes) {
        let remaining = minutes * 60;
        const display = document.getElementById('heroicTimerDisplay');
        const btn = document.getElementById('heroicTimerBtn');
        const circle = document.getElementById('heroicTimerCircle');
        if (!display) return;

        const total = remaining;
        btn.innerHTML = '<i class="fas fa-stop"></i> Hentikan';
        btn.onclick = () => this._stopTimer();

        this.activityTimer = setInterval(() => {
            remaining--;
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            display.textContent = `${m}:${s.toString().padStart(2, '0')}`;

            // Update conic gradient progress
            const pct = ((total - remaining) / total) * 100;
            if (circle) {
                circle.style.background = `conic-gradient(#8B5CF6 ${pct}%, #E5E7EB ${pct}%)`;
            }

            if (remaining <= 0) {
                this._stopTimer();
                display.textContent = '✓';
                if (btn) btn.textContent = 'Selesai!';
                Utils.showToast('Latihan selesai! Luar biasa! 🎉', 'success');
            }
        }, 1000);
    },

    _stopTimer() {
        if (this.activityTimer) {
            clearInterval(this.activityTimer);
            this.activityTimer = null;
        }
    },

    // ─── Complete Activity ─────────────────────────────────────────────────────
    async completeActivity(actId) {
        const act = this.ACTIVITIES.find(a => a.id === actId);
        if (!act) return;

        const modal = document.getElementById('heroicActivityModal');
        const textInput = document.getElementById('heroicActivityInput');
        const reflectionText = textInput ? textInput.value.trim() : '';
        const sensorPre  = modal ? modal._sensorPre : null;
        const sensorPost = this._getSensorSnapshot();

        // Mark as completed
        this.completedToday.add(actId);
        this._saveCompletions();

        // Apply HEROIC score gain
        let gainReport = null;
        if (typeof HeroicXAI !== 'undefined') {
            gainReport = HeroicXAI.applyActivityGain(act.dim, act.title, act.duration, sensorPre, sensorPost);
        }

        // Save to Firestore
        await this._logActivityToFirestore(act, reflectionText, gainReport, sensorPre, sensorPost);

        // Analyze text with Gemini if present
        if (reflectionText && typeof HeroicXAI !== 'undefined') {
            this._analyzeReflectionWithGemini(reflectionText, act.dim, act.id);
        }

        this.closeActivity();

        // Show gain toast
        if (gainReport) {
            Utils.showToast(
                `✨ ${HeroicXAI.DIMENSIONS[act.dim].label} +${gainReport.gain} poin! Score: ${gainReport.newScore}/100`,
                'success'
            );
        } else {
            Utils.showToast('Aktivitas selesai! Hebat! 🌟', 'success');
        }

        // Refresh UI
        setTimeout(() => {
            this.renderDimensions();
            this.renderActivities(this.currentDimFilter);
            this.renderRecommendations();
            if (this.radarChart && typeof HeroicXAI !== 'undefined') {
                this.radarChart.data = HeroicXAI.getRadarChartData();
                this.radarChart.update();
            }
            // Update overall score
            const scoreEl = document.getElementById('heroicOverallScore');
            if (scoreEl && typeof HeroicXAI !== 'undefined') {
                scoreEl.textContent = HeroicXAI.getOverallScore();
            }
        }, 300);
    },

    // ─── Gemini Analysis ──────────────────────────────────────────────────────
    async _analyzeReflectionWithGemini(text, dimension, actId) {
        const apiKey = (typeof CONFIG !== 'undefined') ? CONFIG.GEMINI_API_KEY : null;
        if (!apiKey) return;

        try {
            const dimInfo = HeroicXAI.DIMENSIONS[dimension];
            const prompt = `Anda adalah psikolog klinis yang menganalisis refleksi singkat dari pengguna aplikasi kesehatan mental.
Dimensi HEROIC yang relevan: ${dimInfo.name} (${dimInfo.label})
Deskripsi dimensi: ${dimInfo.description}
Teks refleksi pengguna: "${text}"

Analisis dalam JSON:
{
  "sentiment": "positive|neutral|negative",
  "geminiScore": -1 sampai 1 (negatif = negatif, 0 = netral, positif = positif),
  "keyThemes": ["tema1", "tema2"],
  "insight": "1-2 kalimat insight psikologis dalam Bahasa Indonesia",
  "encouragement": "1 kalimat penyemangat personal dalam Bahasa Indonesia"
}`;

            const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                }
            );

            if (!res.ok) return;
            const data = await res.json();
            const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

            // Parse JSON from response
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return;
            const analysis = JSON.parse(jsonMatch[0]);

            // Apply journal insight to scores
            HeroicXAI.applyJournalInsight({ dimension, ...analysis });

            // Show Gemini insight as toast
            if (analysis.encouragement) {
                setTimeout(() => {
                    Utils.showToast(`💬 ${analysis.encouragement}`, 'info', 5000);
                }, 1500);
            }

            // Log analysis to Firestore
            try {
                const user = auth?.currentUser;
                if (user && typeof db !== 'undefined') {
                    await db.collection('heroicActivities').doc(actId + '_' + Date.now()).set({
                        userId: user.uid,
                        activityId: actId,
                        dimension,
                        reflectionText: text,
                        geminiAnalysis: analysis,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            } catch (e) {}
        } catch (e) {
            console.warn('[HeroicProgram] Gemini analysis failed:', e);
        }
    },

    // ─── Sensor Helper ────────────────────────────────────────────────────────
    _getSensorSnapshot() {
        if (typeof BLEConnection === 'undefined') return null;
        const latest = BLEConnection.getLatestData ? BLEConnection.getLatestData() : null;
        return latest || null;
    },

    // ─── XAI Explanation Popup ────────────────────────────────────────────────
    showXAIExplanation() {
        if (typeof HeroicXAI === 'undefined') return;

        const weak = HeroicXAI.getDimensionsNeedingAttention();
        const msg = weak.length > 0
            ? `Sistem XAI mendeteksi ${weak.length} dimensi yang perlu perhatian:\n\n` +
              weak.map(d => `• ${d.info.label}: ${d.score}/100\n  ${d.info.lowMsg}`).join('\n\n')
            : 'Semua dimensi HEROIC dalam kondisi sehat! Terus pertahankan.';

        if (typeof InterventionEngine !== 'undefined') {
            InterventionEngine.showAlert(
                '🧠 Analisis XAI — Profil HEROIC Anda\n\n' + msg,
                null
            );
        }
    },

    /**
     * Highlight a specific dimension (called by InterventionEngine JITAI trigger)
     */
    highlightDimension(dimKey) {
        this.filterActivities(dimKey);
        const card = document.querySelector(`[data-dim="${dimKey}"]`);
        if (card) {
            card.classList.add('active');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    },

    // ─── Persistence ──────────────────────────────────────────────────────────
    _saveCompletions() {
        const today = new Date().toDateString();
        try {
            localStorage.setItem('heroic_completions_' + today, JSON.stringify([...this.completedToday]));
        } catch (e) {}
    },

    async _loadCompletions() {
        const today = new Date().toDateString();
        try {
            const saved = localStorage.getItem('heroic_completions_' + today);
            if (saved) {
                this.completedToday = new Set(JSON.parse(saved));
            }
        } catch (e) {}
    },

    async _logActivityToFirestore(act, reflection, gainReport, sensorPre, sensorPost) {
        try {
            const user = typeof auth !== 'undefined' && auth?.currentUser;
            if (user && typeof db !== 'undefined') {
                await db.collection('heroicActivities').add({
                    userId: user.uid,
                    activityId: act.id,
                    activityTitle: act.title,
                    dimension: act.dim,
                    durationMin: act.duration,
                    reflection: reflection || '',
                    gainReport: gainReport || null,
                    sensorPre: sensorPre || null,
                    sensorPost: sensorPost || null,
                    heroicScores: { ...HeroicXAI.scores },
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (e) {
            console.warn('[HeroicProgram] Firestore log failed:', e);
        }
    }
};

window.HeroicProgram = HeroicProgram;
