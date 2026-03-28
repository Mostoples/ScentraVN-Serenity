/**
 * SYNAWATCH - Syna Academy Module
 * Updated: Merged lesson buttons, forward-only navigation
 */

const Academy = {
    courses: [
        {
            id: 'heart',
            title: 'Memahami Jantungmu',
            icon: 'fa-heartbeat',
            color: 'var(--primary-600)',
            bg: 'var(--primary-100)',
            lessons: [
                {
                    id: 'hr-basics',
                    title: 'Apa Itu Heart Rate?',
                    duration: '3 menit',
                    content: `
                        <h3>Apa Itu Heart Rate?</h3>
                        <p>Heart Rate (detak jantung) adalah jumlah berapa kali jantung Anda berdetak per menit (BPM). Ini adalah salah satu tanda vital paling penting yang menunjukkan kesehatan jantung dan kondisi fisik Anda.</p>
                        <h4>Rentang Normal</h4>
                        <ul>
                            <li><strong>Dewasa istirahat:</strong> 60-100 BPM</li>
                            <li><strong>Atlet terlatih:</strong> 40-60 BPM</li>
                            <li><strong>Saat olahraga:</strong> Bisa mencapai 150-200 BPM</li>
                        </ul>
                        <h4>Faktor yang Mempengaruhi</h4>
                        <ul>
                            <li><strong>Stres & Kecemasan</strong> — Meningkatkan HR 10-30 BPM</li>
                            <li><strong>Kafein</strong> — Stimulan yang meningkatkan detak jantung</li>
                            <li><strong>Suhu tubuh</strong> — Demam meningkatkan HR ~10 BPM per 1°C kenaikan</li>
                            <li><strong>Dehidrasi</strong> — Kurang cairan membuat jantung bekerja lebih keras</li>
                        </ul>
                        <div style="background:rgba(139,92,246,0.08);padding:12px;border-radius:10px;border-left:3px solid var(--primary-500);margin-top:16px;">
                            <strong>Yang SYNAWATCH Ukur:</strong><br>
                            <span style="font-size:0.85rem;">Sensor PPG (Photoplethysmography) di SYNAWATCH menggunakan cahaya LED untuk mendeteksi perubahan volume darah di pembuluh kapiler jarimu, lalu menghitung BPM secara real-time.</span>
                        </div>
                        <div style="background:#FEF3C7;padding:12px;border-radius:10px;margin-top:12px;">
                            <strong>Tips:</strong> Pastikan jarimu menempel dengan tenang di sensor saat pengukuran. Gerakan akan mengganggu akurasi pembacaan.
                        </div>
                    `
                },
                {
                    id: 'hr-stress',
                    title: 'HR dan Stres: Apa Hubungannya?',
                    duration: '4 menit',
                    content: `
                        <h3>HR dan Stres: Apa Hubungannya?</h3>
                        <p>Ketika Anda merasa stres, sistem saraf simpatik mengaktifkan respons "fight or flight". Ini menyebabkan pelepasan hormon adrenalin yang langsung meningkatkan detak jantung.</p>
                        <h4>Bagaimana Stres Meningkatkan HR</h4>
                        <ul>
                            <li>Adrenalin dilepaskan ke aliran darah</li>
                            <li>Pembuluh darah menyempit</li>
                            <li>Jantung memompa lebih cepat dan keras</li>
                            <li>HR meningkat 15-30 BPM dari baseline</li>
                        </ul>
                        <h4>Cara Menurunkan HR Saat Stres</h4>
                        <ul>
                            <li><strong>Pernapasan 4-7-8:</strong> Tarik napas 4 detik, tahan 7 detik, buang 8 detik</li>
                            <li><strong>Grounding:</strong> Identifikasi 5 hal yang bisa dilihat, 4 didengar, 3 disentuh</li>
                            <li><strong>Progressive Muscle Relaxation:</strong> Tegangkan dan rilekskan otot secara bertahap</li>
                        </ul>
                    `
                },
                {
                    id: 'hr-exercise',
                    title: 'HR Saat Olahraga',
                    duration: '3 menit',
                    content: `
                        <h3>HR Saat Olahraga</h3>
                        <p>Memahami zona detak jantung saat olahraga membantu Anda berolahraga dengan aman dan efektif.</p>
                        <h4>Rumus HR Maksimum</h4>
                        <p><strong>HR Max = 220 - Usia kamu</strong><br>Contoh: Usia 25 → HR Max = 195 BPM</p>
                        <h4>5 Zona Latihan</h4>
                        <ul>
                            <li><strong>Zona 1 (50-60%):</strong> Pemanasan, pemulihan. Contoh: jalan santai</li>
                            <li><strong>Zona 2 (60-70%):</strong> Pembakaran lemak optimal. Contoh: jogging ringan</li>
                            <li><strong>Zona 3 (70-80%):</strong> Meningkatkan stamina. Contoh: lari sedang</li>
                            <li><strong>Zona 4 (80-90%):</strong> Meningkatkan performa. Contoh: lari cepat</li>
                            <li><strong>Zona 5 (90-100%):</strong> Maksimal, hanya untuk interval pendek</li>
                        </ul>
                        <div style="background:#FEF3C7;padding:12px;border-radius:10px;margin-top:12px;">
                            <strong>Tips:</strong> Untuk kesehatan umum, targetkan 150 menit per minggu di Zona 2-3.
                        </div>
                    `
                }
            ]
        }
    ],

    completedLessons: new Set(),

    initAcademy() {
        console.log("Syna Academy Initialized");
        this.loadProgress();
        this.renderCourseList();
    },

    async loadProgress() {
        try {
            const user = typeof auth !== 'undefined' && auth.currentUser;
            if (!user || typeof db === 'undefined') return;
            const doc = await db.collection('users').doc(user.uid)
                .collection('academy').doc('progress').get();
            if (doc.exists && doc.data().completed) {
                this.completedLessons = new Set(doc.data().completed);
            }
        } catch (e) { console.warn('Could not load academy progress:', e); }
    },

    async saveProgress() {
        try {
            const user = typeof auth !== 'undefined' && auth.currentUser;
            if (!user || typeof db === 'undefined') return;
            await db.collection('users').doc(user.uid)
                .collection('academy').doc('progress').set({
                    completed: Array.from(this.completedLessons),
                    updatedAt: new Date()
                }, { merge: true });
        } catch (e) { console.warn('Could not save academy progress:', e); }
    },

    renderCourseList() {
        const container = document.getElementById('academyContent');
        if (!container) return;

        const coursesHTML = this.courses.map(course => {
            const totalLessons = course.lessons.length;
            const completedCount = course.lessons.filter(l => this.completedLessons.has(l.id)).length;

            const lessonsHTML = course.lessons.map((lesson, idx) => {
                const isCompleted = this.completedLessons.has(lesson.id);
                return `
                    <div class="list-item" style="cursor:pointer;${idx === totalLessons - 1 ? 'border-bottom:none;' : ''}"
                         onclick="Academy.openLesson('${course.id}', ${idx})">
                        <div style="width:32px;height:32px;border-radius:50%;background:${isCompleted ? 'var(--success-500)' : 'var(--primary-100)'};color:${isCompleted ? 'white' : 'var(--primary-600)'};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;flex-shrink:0;">
                            ${isCompleted ? '<i class="fas fa-check"></i>' : idx + 1}
                        </div>
                        <div class="list-item-content" style="flex:1;">
                            <div class="list-item-title">${lesson.title}</div>
                            <div class="list-item-subtitle"><i class="fas fa-clock"></i> ${lesson.duration}</div>
                        </div>
                        <i class="fas fa-chevron-right" style="color:var(--text-tertiary);font-size:0.75rem;"></i>
                    </div>
                `;
            }).join('');

            return `
                <div style="margin-bottom:24px;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                        <div style="width:48px;height:48px;background:${course.bg};border-radius:14px;display:flex;align-items:center;justify-content:center;color:${course.color};font-size:1.3rem;">
                            <i class="fas ${course.icon}"></i>
                        </div>
                        <div>
                            <h3 style="font-size:1.1rem;font-weight:700;margin:0;">${course.title}</h3>
                            <p style="font-size:0.75rem;color:var(--text-tertiary);margin:0;">${completedCount}/${totalLessons} pelajaran selesai</p>
                        </div>
                    </div>
                    <div class="card" style="padding:0;overflow:hidden;">
                        ${lessonsHTML}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            <div style="margin-bottom:24px;">
                <h2 style="font-size:1.5rem;font-weight:700;margin-bottom:8px;">Syna Academy</h2>
                <p style="color:var(--text-tertiary);">Pahami tubuh dan pikiranmu lebih dalam.</p>
            </div>
            ${coursesHTML}
        `;
    },

    openLesson(courseId, lessonIdx) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;

        const lesson = course.lessons[lessonIdx];
        const isLast = lessonIdx >= course.lessons.length - 1;
        const isCompleted = this.completedLessons.has(lesson.id);

        const container = document.getElementById('academyContent');
        if (!container) return;

        container.innerHTML = `
            <div style="margin-bottom:20px;">
                <button onclick="Academy.renderCourseList()" style="background:none;border:none;color:var(--primary-500);font-size:0.85rem;cursor:pointer;padding:0;">
                    <i class="fas fa-arrow-left"></i> Kembali
                </button>
            </div>
            <div style="margin-bottom:24px;">
                <div class="lesson-content" style="font-size:0.9rem;line-height:1.7;color:var(--text-secondary);">
                    ${lesson.content}
                </div>
            </div>
            <div style="text-align:center;padding:20px 0;">
                ${isLast ? `
                    <button onclick="Academy.completeAndFinish('${courseId}', ${lessonIdx})"
                        class="btn btn-primary" style="width:100%;padding:14px;border-radius:12px;font-weight:700;font-size:0.95rem;">
                        <i class="fas fa-check-circle"></i> Selesai
                    </button>
                ` : `
                    <button onclick="Academy.completeAndNext('${courseId}', ${lessonIdx})"
                        class="btn btn-primary" style="width:100%;padding:14px;border-radius:12px;font-weight:700;font-size:0.95rem;">
                        Selesai & Lanjut <i class="fas fa-arrow-right"></i>
                    </button>
                `}
            </div>
        `;
    },

    completeAndNext(courseId, lessonIdx) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;
        this.completedLessons.add(course.lessons[lessonIdx].id);
        this.saveProgress();
        Utils.showToast("Pelajaran selesai!", "success");
        this.openLesson(courseId, lessonIdx + 1);
    },

    completeAndFinish(courseId, lessonIdx) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) return;
        this.completedLessons.add(course.lessons[lessonIdx].id);
        this.saveProgress();
        Utils.showToast("Selamat! Kursus selesai!", "success");
        this.renderCourseList();
    }
};

window.Academy = Academy;
