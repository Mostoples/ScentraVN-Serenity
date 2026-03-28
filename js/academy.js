/**
 * SYNAWATCH - Syna Academy Module
 * Educational content about health monitoring, mental wellness, and biosensors
 */

const Academy = {
    progress: {},
    currentCourse: null,
    currentLesson: null,

    courses: [
        {
            id: 'heart-health',
            title: 'Memahami Jantungmu',
            icon: 'fas fa-heartbeat',
            color: '#ef4444',
            desc: 'Pelajari tentang detak jantung, HRV, dan apa yang tubuhmu coba sampaikan.',
            lessons: [
                {
                    id: 'hr-basics',
                    title: 'Apa Itu Heart Rate?',
                    duration: '3 menit',
                    content: `
<h3>Detak Jantung: Irama Kehidupanmu</h3>
<p>Heart rate (HR) adalah jumlah detak jantung per menit (BPM). Jantung memompa darah ke seluruh tubuh untuk mengirim oksigen dan nutrisi ke setiap sel.</p>

<div class="lesson-highlight">
<strong>Rentang Normal Saat Istirahat:</strong><br>
Dewasa: 60–100 BPM<br>
Atlet terlatih: 40–60 BPM
</div>

<h4>Faktor yang Mempengaruhi HR</h4>
<ul>
<li><strong>Aktivitas fisik</strong> — Olahraga meningkatkan HR untuk memenuhi kebutuhan oksigen otot</li>
<li><strong>Stres & emosi</strong> — Kecemasan memicu hormon adrenalin yang mempercepat detak</li>
<li><strong>Kafein & nikotin</strong> — Stimulan meningkatkan HR 5–20 BPM</li>
<li><strong>Suhu tubuh</strong> — Demam meningkatkan HR ~10 BPM per 1°C kenaikan</li>
<li><strong>Dehidrasi</strong> — Kurang cairan membuat jantung bekerja lebih keras</li>
</ul>

<h4>Yang SYNAWATCH Ukur</h4>
<p>Sensor PPG (Photoplethysmography) di SYNAWATCH menggunakan cahaya LED untuk mendeteksi perubahan volume darah di pembuluh kapiler jarimu, lalu menghitung BPM secara real-time.</p>

<div class="lesson-tip">
<strong>Tips:</strong> Pastikan jarimu menempel dengan tenang di sensor saat pengukuran. Gerakan akan mengganggu akurasi pembacaan.
</div>`
                },
                {
                    id: 'hr-stress',
                    title: 'HR dan Stres: Apa Hubungannya?',
                    duration: '4 menit',
                    content: `
<h3>Ketika Jantung "Berteriak" Karena Stres</h3>
<p>Sistem saraf otonom mengontrol detak jantung tanpa kamu sadari. Saat stres, sistem saraf simpatis (fight-or-flight) aktif dan mempercepat jantung.</p>

<div class="lesson-highlight">
<strong>Tanda HR tinggi karena stres:</strong><br>
HR istirahat > 90 BPM secara konsisten<br>
HR melonjak tiba-tiba tanpa aktivitas fisik<br>
Sulit kembali ke HR normal setelah episode stres
</div>

<h4>Siklus Stres-HR</h4>
<p>Stres → Adrenalin naik → HR naik → Kamu merasa jantung berdebar → Kecemasan meningkat → Stres bertambah. Siklus ini bisa diputus dengan teknik relaksasi.</p>

<h4>Teknik Menenangkan HR</h4>
<ul>
<li><strong>Pernapasan 4-7-8</strong> — Tarik napas 4 detik, tahan 7 detik, hembuskan 8 detik</li>
<li><strong>Grounding 5-4-3-2-1</strong> — Fokus pada 5 hal yang terlihat, 4 terdengar, 3 terasa, 2 tercium, 1 terasa</li>
<li><strong>Splashing air dingin</strong> — Memicu diving reflex yang memperlambat HR</li>
</ul>

<div class="lesson-tip">
<strong>Di SYNAWATCH:</strong> Gunakan fitur Mindful Breathing di menu utama untuk latihan pernapasan terpandu yang bisa menurunkan HR-mu.
</div>`
                },
                {
                    id: 'hr-exercise',
                    title: 'HR Saat Olahraga',
                    duration: '3 menit',
                    content: `
<h3>Zona Detak Jantung Saat Olahraga</h3>
<p>Memahami zona HR membantu kamu berolahraga dengan intensitas yang tepat.</p>

<div class="lesson-highlight">
<strong>Rumus HR Maksimum:</strong><br>
HR Max ≈ 220 - Usia kamu<br>
Contoh: Usia 25 → HR Max = 195 BPM
</div>

<h4>5 Zona Latihan</h4>
<ul>
<li><strong>Zona 1 (50-60%)</strong> — Pemanasan, pemulihan. Contoh: jalan santai</li>
<li><strong>Zona 2 (60-70%)</strong> — Pembakaran lemak optimal. Contoh: jogging ringan</li>
<li><strong>Zona 3 (70-80%)</strong> — Meningkatkan stamina. Contoh: lari sedang</li>
<li><strong>Zona 4 (80-90%)</strong> — Meningkatkan performa. Contoh: lari cepat</li>
<li><strong>Zona 5 (90-100%)</strong> — Maksimal, hanya untuk interval pendek</li>
</ul>

<div class="lesson-tip">
<strong>Tips:</strong> Untuk kesehatan umum, targetkan 150 menit per minggu di Zona 2-3.
</div>`
                }
            ]
        },
        {
            id: 'oxygen-spo2',
            title: 'SpO2 & Oksigen Darah',
            icon: 'fas fa-lungs',
            color: '#3b82f6',
            desc: 'Kenapa oksigen darah penting dan kapan kamu perlu khawatir.',
            lessons: [
                {
                    id: 'spo2-basics',
                    title: 'Apa Itu SpO2?',
                    duration: '3 menit',
                    content: `
<h3>Saturasi Oksigen: Bahan Bakar Sel-selmu</h3>
<p>SpO2 (Saturation of Peripheral Oxygen) mengukur persentase hemoglobin dalam darah yang membawa oksigen. Ini indikator vital seberapa baik paru-paru dan jantungmu bekerja.</p>

<div class="lesson-highlight">
<strong>Level SpO2:</strong><br>
95-100% — Normal<br>
90-94% — Rendah, perlu perhatian<br>
< 90% — Hipoksemia, segera cari bantuan medis
</div>

<h4>Mengapa SpO2 Bisa Turun?</h4>
<ul>
<li><strong>Ketinggian</strong> — Di dataran tinggi, oksigen lebih tipis</li>
<li><strong>Sleep apnea</strong> — Napas berhenti sementara saat tidur</li>
<li><strong>Penyakit paru</strong> — Asma, pneumonia, COPD</li>
<li><strong>Anemia</strong> — Kurang hemoglobin untuk membawa oksigen</li>
<li><strong>Merokok</strong> — Karbon monoksida menggeser oksigen dari hemoglobin</li>
</ul>

<div class="lesson-tip">
<strong>Di SYNAWATCH:</strong> Sensor PPG mengukur SpO2 dengan mendeteksi perbedaan warna darah beroksigen (merah cerah) dan tanpa oksigen (merah gelap).
</div>`
                },
                {
                    id: 'spo2-sleep',
                    title: 'SpO2 dan Kualitas Tidur',
                    duration: '4 menit',
                    content: `
<h3>Oksigen Saat Tidur: Indikator Tersembunyi</h3>
<p>Penurunan SpO2 saat tidur bisa jadi tanda sleep apnea — kondisi di mana napas berhenti sebentar-sebentar selama tidur.</p>

<div class="lesson-highlight">
<strong>Tanda Peringatan Saat Tidur:</strong><br>
SpO2 turun di bawah 90% berulang kali<br>
Mendengkur keras<br>
Bangun dengan sakit kepala atau mulut kering<br>
Kantuk berlebihan di siang hari
</div>

<h4>Tips Menjaga SpO2 Saat Tidur</h4>
<ul>
<li>Tidur miring (bukan telentang) untuk membuka jalan napas</li>
<li>Jaga berat badan ideal</li>
<li>Hindari alkohol sebelum tidur</li>
<li>Gunakan bantal yang mendukung posisi kepala</li>
</ul>

<div class="lesson-tip">
<strong>Tips:</strong> Gunakan fitur Sleep Tracker di SYNAWATCH untuk memantau SpO2 sepanjang malam.
</div>`
                }
            ]
        },
        {
            id: 'stress-gsr',
            title: 'Stres & Respons Kulit',
            icon: 'fas fa-brain',
            color: '#8b5cf6',
            desc: 'Pahami GSR, cortisol, dan bagaimana tubuhmu merespons tekanan.',
            lessons: [
                {
                    id: 'gsr-basics',
                    title: 'Apa Itu GSR?',
                    duration: '3 menit',
                    content: `
<h3>Galvanic Skin Response: Kulitmu Tidak Bisa Berbohong</h3>
<p>GSR mengukur konduktivitas listrik kulit yang berubah saat kelenjar keringat aktif. Saat stres, cemas, atau excited, kelenjar keringat di telapak tangan aktif — bahkan sebelum kamu menyadarinya.</p>

<div class="lesson-highlight">
<strong>Level GSR di SYNAWATCH:</strong><br>
0-30% — Relax, tenang<br>
31-60% — Normal, aktif<br>
61-80% — Terangsang/excited<br>
81-100% — Stres tinggi/kecemasan
</div>

<h4>GSR dalam Kehidupan Sehari-hari</h4>
<ul>
<li><strong>Presentasi</strong> — GSR naik sebelum kamu merasa gugup</li>
<li><strong>Film horor</strong> — Lonjakan GSR saat jump scare</li>
<li><strong>Berbohong</strong> — Dasar kerja lie detector (polygraph)</li>
<li><strong>Meditasi</strong> — GSR turun saat relaksasi dalam</li>
</ul>

<div class="lesson-tip">
<strong>Menarik:</strong> GSR bereaksi 1-3 detik sebelum kamu secara sadar merasa stres. SYNAWATCH menggunakan ini untuk deteksi dini stres.
</div>`
                },
                {
                    id: 'stress-management',
                    title: 'Teknik Manajemen Stres',
                    duration: '5 menit',
                    content: `
<h3>Mengelola Stres dengan Data</h3>
<p>Dengan SYNAWATCH, kamu bisa melihat pola stresmu secara objektif. Berikut teknik berbasis bukti untuk mengelolanya.</p>

<h4>Teknik Jangka Pendek (saat stres melonjak)</h4>
<ul>
<li><strong>Box Breathing</strong> — Tarik 4s, tahan 4s, hembuskan 4s, tahan 4s. Ulangi 4x</li>
<li><strong>Progressive Muscle Relaxation</strong> — Tegangkan lalu lepaskan otot dari kaki ke kepala</li>
<li><strong>Cold exposure</strong> — Cuci muka dengan air dingin (memicu vagus nerve)</li>
</ul>

<h4>Teknik Jangka Panjang</h4>
<ul>
<li><strong>Journaling</strong> — Tulis 3 hal yang kamu syukuri setiap malam</li>
<li><strong>Olahraga rutin</strong> — 30 menit, 3-5x seminggu</li>
<li><strong>Tidur cukup</strong> — 7-9 jam per malam</li>
<li><strong>Batasi kafein</strong> — Maksimal 2 cangkir sebelum jam 2 siang</li>
<li><strong>Mindfulness</strong> — 10 menit meditasi harian menurunkan baseline cortisol</li>
</ul>

<div class="lesson-tip">
<strong>Di SYNAWATCH:</strong> Gunakan fitur Journal untuk mencatat pemicu stres dan Mindful Breathing untuk latihan harian.
</div>`
                }
            ]
        },
        {
            id: 'mental-wellness',
            title: 'Kesehatan Mental',
            icon: 'fas fa-spa',
            color: '#10b981',
            desc: 'Kenali tanda-tanda dan cara menjaga kesehatan mentalmu.',
            lessons: [
                {
                    id: 'mental-basics',
                    title: 'Mengenali Tanda-tanda Stres Berlebih',
                    duration: '4 menit',
                    content: `
<h3>Tubuhmu Memberi Sinyal</h3>
<p>Stres kronis mempengaruhi tubuh dan pikiran. Mengenali tanda-tandanya adalah langkah pertama menuju pemulihan.</p>

<h4>Tanda Fisik</h4>
<ul>
<li>Sakit kepala tegang atau migrain</li>
<li>Otot kaku terutama leher dan bahu</li>
<li>Gangguan pencernaan</li>
<li>Jantung berdebar (HR istirahat > 90)</li>
<li>Sulit tidur atau tidur berlebihan</li>
</ul>

<h4>Tanda Emosional</h4>
<ul>
<li>Mudah tersinggung atau marah</li>
<li>Merasa kewalahan</li>
<li>Sulit konsentrasi</li>
<li>Kehilangan motivasi</li>
<li>Merasa kosong atau mati rasa</li>
</ul>

<div class="lesson-highlight">
<strong>Kapan Harus Cari Bantuan Profesional?</strong><br>
Jika gejala berlangsung > 2 minggu, mengganggu aktivitas sehari-hari, atau kamu memiliki pikiran untuk menyakiti diri sendiri — segera hubungi profesional kesehatan mental.
</div>

<div class="lesson-tip">
<strong>Di SYNAWATCH:</strong> Fitur Assessment (PHQ-9) membantu mengukur tingkat depresimu secara berkala. Gunakan fitur Support Hub untuk akses ke helpline.
</div>`
                },
                {
                    id: 'sleep-hygiene',
                    title: 'Sleep Hygiene: Tidur Lebih Berkualitas',
                    duration: '4 menit',
                    content: `
<h3>Tidur adalah Obat Terbaik</h3>
<p>Kualitas tidur mempengaruhi HR, SpO2, stres, mood, dan produktivitas. Berikut panduan berbasis sains.</p>

<h4>Aturan Sleep Hygiene</h4>
<ul>
<li><strong>Jadwal konsisten</strong> — Tidur dan bangun di jam yang sama, termasuk akhir pekan</li>
<li><strong>Ruangan gelap & sejuk</strong> — Suhu ideal 18-22°C</li>
<li><strong>No screen 1 jam sebelum tidur</strong> — Blue light menekan melatonin</li>
<li><strong>Hindari kafein setelah jam 2 siang</strong></li>
<li><strong>Ritual malam</strong> — Baca buku, stretching ringan, atau meditasi</li>
</ul>

<div class="lesson-highlight">
<strong>Siklus Tidur:</strong><br>
1 siklus = ~90 menit (Light → Deep → REM)<br>
Target: 4-6 siklus = 6-9 jam<br>
Deep sleep paling banyak di awal malam, REM di akhir
</div>

<div class="lesson-tip">
<strong>Di SYNAWATCH:</strong> Gunakan Sleep Tracker untuk memantau durasi dan kualitas tidurmu, serta lihat korelasi dengan data HR dan SpO2.
</div>`
                }
            ]
        }
    ],

    async initAcademy() {
        const container = document.getElementById('academyContent');
        if (!container) return;

        // Load progress from Firebase
        await this._loadProgress();

        this.currentCourse = null;
        this.currentLesson = null;
        this._renderCourseList(container);
    },

    async _loadProgress() {
        try {
            if (typeof auth !== 'undefined' && auth.currentUser && typeof FirebaseService !== 'undefined') {
                this.progress = await FirebaseService.getAcademyProgress(auth.currentUser.uid) || {};
            }
        } catch (e) {
            console.warn('Academy: could not load progress', e);
            this.progress = {};
        }
    },

    _renderCourseList(container) {
        let coursesHtml = '';
        this.courses.forEach(course => {
            const totalLessons = course.lessons.length;
            const completed = (this.progress[course.id] || []).length;
            const pct = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;

            coursesHtml += `
                <div class="card" style="cursor:pointer;margin-bottom:14px;" onclick="Academy.openCourse('${course.id}')">
                    <div style="display:flex;gap:16px;align-items:center;">
                        <div style="width:56px;height:56px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:1.4rem;color:white;background:${course.color};flex-shrink:0;box-shadow:0 4px 12px ${course.color}33;">
                            <i class="${course.icon}"></i>
                        </div>
                        <div style="flex:1;min-width:0;">
                            <h4 style="font-size:1rem;font-weight:700;margin-bottom:4px;">${course.title}</h4>
                            <p style="font-size:0.8rem;color:var(--text-tertiary);margin-bottom:8px;">${course.desc}</p>
                            <div style="display:flex;align-items:center;gap:10px;">
                                <div style="flex:1;height:6px;background:var(--bg-primary);border-radius:4px;overflow:hidden;">
                                    <div style="width:${pct}%;height:100%;background:${course.color};border-radius:4px;transition:width 0.3s;"></div>
                                </div>
                                <span style="font-size:0.75rem;font-weight:600;color:${course.color};">${completed}/${totalLessons}</span>
                            </div>
                        </div>
                        <i class="fas fa-chevron-right" style="color:var(--text-tertiary);font-size:0.85rem;"></i>
                    </div>
                </div>
            `;
        });

        container.innerHTML = `
            <div style="margin-bottom:24px;">
                <h2 style="font-size:1.4rem;font-weight:700;margin-bottom:6px;">Syna Academy</h2>
                <p style="color:var(--text-tertiary);font-size:0.9rem;">Pahami tubuh dan pikiranmu lebih dalam.</p>
            </div>
            <div>${coursesHtml}</div>
        `;
    },

    openCourse(courseId) {
        const container = document.getElementById('academyContent');
        if (!container) return;

        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;

        this.currentCourse = course;
        const completedLessons = this.progress[courseId] || [];

        let lessonsHtml = '';
        course.lessons.forEach((lesson, idx) => {
            const isDone = completedLessons.includes(lesson.id);
            lessonsHtml += `
                <div class="card" style="cursor:pointer;margin-bottom:12px;" onclick="Academy.openLesson('${courseId}','${lesson.id}')">
                    <div style="display:flex;gap:14px;align-items:center;">
                        <div style="width:40px;height:40px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:0.9rem;font-weight:700;flex-shrink:0;${isDone ? `background:${course.color};color:white;` : 'background:var(--bg-primary);color:var(--text-tertiary);'}">
                            ${isDone ? '<i class="fas fa-check"></i>' : (idx + 1)}
                        </div>
                        <div style="flex:1;min-width:0;">
                            <h4 style="font-size:0.95rem;font-weight:600;">${lesson.title}</h4>
                            <p style="font-size:0.75rem;color:var(--text-tertiary);margin-top:2px;"><i class="fas fa-clock" style="margin-right:4px;"></i>${lesson.duration}</p>
                        </div>
                        <i class="fas fa-chevron-right" style="color:var(--text-tertiary);font-size:0.8rem;"></i>
                    </div>
                </div>
            `;
        });

        container.innerHTML = `
            <div style="margin-bottom:20px;">
                <button onclick="Academy.initAcademy()" style="background:none;border:none;color:var(--primary-500);font-weight:600;font-size:0.9rem;cursor:pointer;padding:0;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                    <i class="fas fa-arrow-left"></i> Kembali
                </button>
                <div style="display:flex;align-items:center;gap:14px;margin-bottom:6px;">
                    <div style="width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:white;background:${course.color};">
                        <i class="${course.icon}"></i>
                    </div>
                    <h2 style="font-size:1.3rem;font-weight:700;">${course.title}</h2>
                </div>
                <p style="color:var(--text-tertiary);font-size:0.85rem;">${course.lessons.length} pelajaran</p>
            </div>
            <div>${lessonsHtml}</div>
        `;
    },

    async openLesson(courseId, lessonId) {
        const container = document.getElementById('academyContent');
        if (!container) return;

        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;
        const lesson = course.lessons.find(l => l.id === lessonId);
        if (!lesson) return;

        this.currentLesson = lesson;
        const completedLessons = this.progress[courseId] || [];
        const isDone = completedLessons.includes(lessonId);

        // Find prev/next
        const idx = course.lessons.indexOf(lesson);
        const prevLesson = idx > 0 ? course.lessons[idx - 1] : null;
        const nextLesson = idx < course.lessons.length - 1 ? course.lessons[idx + 1] : null;

        container.innerHTML = `
            <div style="margin-bottom:16px;">
                <button onclick="Academy.openCourse('${courseId}')" style="background:none;border:none;color:var(--primary-500);font-weight:600;font-size:0.9rem;cursor:pointer;padding:0;margin-bottom:12px;display:flex;align-items:center;gap:6px;">
                    <i class="fas fa-arrow-left"></i> ${course.title}
                </button>
                <h2 style="font-size:1.25rem;font-weight:700;margin-bottom:4px;">${lesson.title}</h2>
                <p style="font-size:0.8rem;color:var(--text-tertiary);"><i class="fas fa-clock" style="margin-right:4px;"></i>${lesson.duration}</p>
            </div>

            <div class="card lesson-content" style="margin-bottom:16px;">
                ${lesson.content}
            </div>

            <div style="display:flex;gap:10px;margin-bottom:16px;">
                ${!isDone ? `
                    <button class="btn btn-primary" style="flex:1;padding:14px;border-radius:14px;font-size:0.95rem;" onclick="Academy.markComplete('${courseId}','${lessonId}')">
                        <i class="fas fa-check" style="margin-right:8px;"></i>Tandai Selesai
                    </button>
                ` : `
                    <div style="flex:1;padding:14px;text-align:center;border-radius:14px;background:rgba(16,185,129,0.1);color:#059669;font-weight:600;font-size:0.95rem;">
                        <i class="fas fa-check-circle" style="margin-right:8px;"></i>Sudah Selesai
                    </div>
                `}
            </div>

            <div style="display:flex;justify-content:space-between;gap:10px;">
                ${prevLesson ? `
                    <button onclick="Academy.openLesson('${courseId}','${prevLesson.id}')" style="flex:1;padding:12px;border:none;border-radius:12px;background:var(--bg-primary);color:var(--text-secondary);font-weight:600;font-size:0.85rem;cursor:pointer;">
                        <i class="fas fa-arrow-left" style="margin-right:6px;"></i>Sebelumnya
                    </button>
                ` : '<div style="flex:1;"></div>'}
                ${nextLesson ? `
                    <button onclick="Academy.openLesson('${courseId}','${nextLesson.id}')" style="flex:1;padding:12px;border:none;border-radius:12px;background:var(--primary-500);color:white;font-weight:600;font-size:0.85rem;cursor:pointer;">
                        Selanjutnya<i class="fas fa-arrow-right" style="margin-left:6px;"></i>
                    </button>
                ` : '<div style="flex:1;"></div>'}
            </div>
        `;

        // Scroll to top
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    async markComplete(courseId, lessonId) {
        // Update local
        if (!this.progress[courseId]) this.progress[courseId] = [];
        if (!this.progress[courseId].includes(lessonId)) {
            this.progress[courseId].push(lessonId);
        }

        // Save to Firebase
        try {
            if (typeof auth !== 'undefined' && auth.currentUser && typeof FirebaseService !== 'undefined') {
                await FirebaseService.markLessonComplete(auth.currentUser.uid, courseId, lessonId);
            }
        } catch (e) {
            console.warn('Academy: could not save progress', e);
        }

        // Show toast
        if (typeof Utils !== 'undefined') {
            Utils.showToast('Pelajaran selesai!', 'success');
        }

        // Re-render lesson to show completed state
        this.openLesson(courseId, lessonId);
    }
};

window.Academy = Academy;
