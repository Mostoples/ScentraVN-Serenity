/**
 * SYNAWATCH - Assessment Module
 * Handles PHQ-9 (Depression) and UCLA Loneliness Scale questionnaires
 */

const Assessment = {
    // PHQ-9 Questions (Over the last 2 weeks, how often have you been bothered by any of the following problems?)
    phq9: [
        "Kurang minat atau kesenangan dalam melakukan sesuatu",
        "Merasa sedih, tertekan, atau putus asa",
        "Sulit tidur atau tetap tertidur, atau terlalu banyak tidur",
        "Merasa lelah atau kurang berenergi",
        "Kurang nafsu makan atau makan berlebihan",
        "Merasa buruk tentang diri sendiri — atau merasa gagal atau mengecewakan diri sendiri maupun keluarga",
        "Sulit berkonsentrasi pada hal-hal seperti membaca atau menonton televisi",
        "Bergerak atau berbicara sangat lambat sehingga orang lain menyadarinya, atau sebaliknya — sangat gelisah sehingga bergerak lebih banyak dari biasanya",
        "Pikiran bahwa Anda lebih baik mati, atau ingin menyakiti diri sendiri"
    ],
    // UCLA Loneliness Scale V3 (20 items)
    ucla: [
        "Seberapa sering Anda merasa 'sejalan' dengan orang-orang di sekitar Anda?", // *Reversed
        "Seberapa sering Anda merasa kekurangan teman dekat?",
        "Seberapa sering Anda merasa tidak ada orang yang bisa diandalkan?",
        "Seberapa sering Anda merasa sendirian?",
        "Seberapa sering Anda merasa menjadi bagian dari sekelompok teman?", // *Reversed
        "Seberapa sering Anda merasa memiliki banyak kesamaan dengan orang-orang di sekitar?", // *Reversed
        "Seberapa sering Anda merasa tidak lagi dekat dengan siapa pun?",
        "Seberapa sering Anda merasa minat dan ide Anda tidak dipahami orang sekitar?",
        "Seberapa sering Anda merasa ramah dan mudah bergaul?", // *Reversed
        "Seberapa sering Anda merasa dekat dengan orang lain?", // *Reversed
        "Seberapa sering Anda merasa dikucilkan?",
        "Seberapa sering Anda merasa hubungan Anda dengan orang lain tidak bermakna?",
        "Seberapa sering Anda merasa tidak ada yang benar-benar mengenal Anda?",
        "Seberapa sering Anda merasa terisolasi dari orang lain?",
        "Seberapa sering Anda merasa bisa menemukan teman saat menginginkannya?", // *Reversed
        "Seberapa sering Anda merasa ada orang yang benar-benar memahami Anda?", // *Reversed
        "Seberapa sering Anda merasa pemalu?",
        "Seberapa sering Anda merasa orang ada di sekitar tapi tidak bersama Anda?",
        "Seberapa sering Anda merasa ada orang yang bisa diajak bicara?", // *Reversed
        "Seberapa sering Anda merasa ada orang yang bisa diandalkan?" // *Reversed
    ],
    uclaReversedIndices: [0, 4, 5, 8, 9, 14, 15, 18, 19],

    currentStage: 'intro', // intro, phq9, ucla, result
    currentIndex: 0,
    answers: {
        phq9: [],
        ucla: []
    },

    /**
     * Start Assessment
     */
    start() {
        this.currentStage = 'phq9';
        this.currentIndex = 0;
        this.answers = { phq9: [], ucla: [] };
        this.renderQuestion();
    },

    /**
     * Handle Answer Selection
     */
    selectAnswer(value, element) {
        // Add pulse animation to clicked button
        if (element) {
            element.classList.add('selected');
        }

        // Wait for animation to complete before moving to next question
        setTimeout(() => {
            if (this.currentStage === 'phq9') {
                this.answers.phq9[this.currentIndex] = value;
                this.next();
            } else if (this.currentStage === 'ucla') {
                this.answers.ucla[this.currentIndex] = value;
                this.next();
            }
        }, 300);
    },

    /**
     * Go to next question
     */
    next() {
        if (this.currentStage === 'phq9') {
            if (this.currentIndex < this.phq9.length - 1) {
                this.currentIndex++;
                this.renderQuestion();
            } else {
                this.currentStage = 'ucla';
                this.currentIndex = 0;
                this.renderQuestion();
            }
        } else if (this.currentStage === 'ucla') {
            if (this.currentIndex < this.ucla.length - 1) {
                this.currentIndex++;
                this.renderQuestion();
            } else {
                this.finish();
            }
        }
    },

    /**
     * Render Current Question
     */
    renderQuestion() {
        const container = document.getElementById('assessmentContent');
        if (!container) return;

        let totalQuestions = this.phq9.length + this.ucla.length;
        let currentOverallIndex = this.currentStage === 'phq9' ? this.currentIndex : this.phq9.length + this.currentIndex;
        let progress = Math.round((currentOverallIndex / totalQuestions) * 100);

        // Update progress bar
        const progressBar = document.getElementById('assessmentProgress');
        if (progressBar) progressBar.style.width = progress + '%';

        // Update progress counter text
        const progressWrapper = document.getElementById('assessmentProgressWrapper');
        if (progressWrapper) {
            const counterEl = progressWrapper.querySelector('.progress-counter');
            if (counterEl) {
                counterEl.textContent = t('assessment.question_counter', {current: currentOverallIndex + 1, total: totalQuestions});
            } else {
                const span = document.createElement('span');
                span.className = 'progress-counter';
                span.style.cssText = 'font-size:0.8rem;font-weight:600;color:var(--primary-500);';
                span.textContent = t('assessment.question_counter', {current: currentOverallIndex + 1, total: totalQuestions});
                progressWrapper.querySelector('div').appendChild(span);
            }
        }

        let html = '';
        if (this.currentStage === 'phq9') {
            html = `
                <div class="assessment-header" style="margin-bottom: var(--space-6); text-align: center;">
                    <span class="badge" style="background: rgba(139, 92, 246, 0.15); color: var(--primary-500); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; margin-bottom: 12px; display: inline-block;">${t('assessment.phq9_header')}</span>
                    <p style="color: var(--text-tertiary); font-size: var(--text-sm);">${t('assessment.phq9_instruction')}</p>
                </div>
                <div class="question-card" style="background: white; padding: var(--space-6); border-radius: var(--radius-xl); box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin-bottom: var(--space-6);">
                    <h3 style="font-size: var(--text-lg); color: var(--text-primary); margin-bottom: var(--space-6); text-align: center;">${t('phq9.q' + this.currentIndex)}</h3>
                    <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                        <button class="assessment-answer-btn" style="justify-content: flex-start; text-align: left; padding: 16px; background: #f0f4f8; border: 2px solid #e0e7f1; color: #333; border-radius: 10px; cursor: pointer; transition: all 0.2s; font-weight: 500;" onmouseover="this.style.background='#e8f0ff'; this.style.borderColor='#667eea'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.2)';" onmouseout="this.style.background='#f0f4f8'; this.style.borderColor='#e0e7f1'; this.style.transform='translateY(0)'; this.style.boxShadow='none';" onclick="Assessment.selectAnswer(0, this)">${t('assessment.phq9_a0')}</button>
                        <button class="assessment-answer-btn" style="justify-content: flex-start; text-align: left; padding: 16px; background: #f0f4f8; border: 2px solid #e0e7f1; color: #333; border-radius: 10px; cursor: pointer; transition: all 0.2s; font-weight: 500;" onmouseover="this.style.background='#e8f0ff'; this.style.borderColor='#667eea'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.2)';" onmouseout="this.style.background='#f0f4f8'; this.style.borderColor='#e0e7f1'; this.style.transform='translateY(0)'; this.style.boxShadow='none';" onclick="Assessment.selectAnswer(1, this)">${t('assessment.phq9_a1')}</button>
                        <button class="assessment-answer-btn" style="justify-content: flex-start; text-align: left; padding: 16px; background: #f0f4f8; border: 2px solid #e0e7f1; color: #333; border-radius: 10px; cursor: pointer; transition: all 0.2s; font-weight: 500;" onmouseover="this.style.background='#e8f0ff'; this.style.borderColor='#667eea'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.2)';" onmouseout="this.style.background='#f0f4f8'; this.style.borderColor='#e0e7f1'; this.style.transform='translateY(0)'; this.style.boxShadow='none';" onclick="Assessment.selectAnswer(2, this)">${t('assessment.phq9_a2')}</button>
                        <button class="assessment-answer-btn" style="justify-content: flex-start; text-align: left; padding: 16px; background: #f0f4f8; border: 2px solid #e0e7f1; color: #333; border-radius: 10px; cursor: pointer; transition: all 0.2s; font-weight: 500;" onmouseover="this.style.background='#e8f0ff'; this.style.borderColor='#667eea'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.2)';" onmouseout="this.style.background='#f0f4f8'; this.style.borderColor='#e0e7f1'; this.style.transform='translateY(0)'; this.style.boxShadow='none';" onclick="Assessment.selectAnswer(3, this)">${t('assessment.phq9_a3')}</button>
                    </div>
                </div>
            `;
        } else if (this.currentStage === 'ucla') {
            html = `
                <div class="assessment-header" style="margin-bottom: var(--space-6); text-align: center;">
                    <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--success-500); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; margin-bottom: 12px; display: inline-block;">${t('assessment.ucla_header')}</span>
                    <p style="color: var(--text-tertiary); font-size: var(--text-sm);">${t('assessment.ucla_instruction')}</p>
                </div>
                <div class="question-card" style="background: white; padding: var(--space-6); border-radius: var(--radius-xl); box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin-bottom: var(--space-6);">
                    <h3 style="font-size: var(--text-lg); color: var(--text-primary); margin-bottom: var(--space-6); text-align: center;">${t('ucla.q' + this.currentIndex)}</h3>
                    <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                        <button class="assessment-answer-btn" style="justify-content: flex-start; text-align: left; padding: 16px; background: #f0f4f8; border: 2px solid #e0e7f1; color: #333; border-radius: 10px; cursor: pointer; transition: all 0.2s; font-weight: 500;" onmouseover="this.style.background='#e8f0ff'; this.style.borderColor='#667eea'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.2)';" onmouseout="this.style.background='#f0f4f8'; this.style.borderColor='#e0e7f1'; this.style.transform='translateY(0)'; this.style.boxShadow='none';" onclick="Assessment.selectAnswer(1, this)">${t('assessment.ucla_a1')}</button>
                        <button class="assessment-answer-btn" style="justify-content: flex-start; text-align: left; padding: 16px; background: #f0f4f8; border: 2px solid #e0e7f1; color: #333; border-radius: 10px; cursor: pointer; transition: all 0.2s; font-weight: 500;" onmouseover="this.style.background='#e8f0ff'; this.style.borderColor='#667eea'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.2)';" onmouseout="this.style.background='#f0f4f8'; this.style.borderColor='#e0e7f1'; this.style.transform='translateY(0)'; this.style.boxShadow='none';" onclick="Assessment.selectAnswer(2, this)">${t('assessment.ucla_a2')}</button>
                        <button class="assessment-answer-btn" style="justify-content: flex-start; text-align: left; padding: 16px; background: #f0f4f8; border: 2px solid #e0e7f1; color: #333; border-radius: 10px; cursor: pointer; transition: all 0.2s; font-weight: 500;" onmouseover="this.style.background='#e8f0ff'; this.style.borderColor='#667eea'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.2)';" onmouseout="this.style.background='#f0f4f8'; this.style.borderColor='#e0e7f1'; this.style.transform='translateY(0)'; this.style.boxShadow='none';" onclick="Assessment.selectAnswer(3, this)">${t('assessment.ucla_a3')}</button>
                        <button class="assessment-answer-btn" style="justify-content: flex-start; text-align: left; padding: 16px; background: #f0f4f8; border: 2px solid #e0e7f1; color: #333; border-radius: 10px; cursor: pointer; transition: all 0.2s; font-weight: 500;" onmouseover="this.style.background='#e8f0ff'; this.style.borderColor='#667eea'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.2)';" onmouseout="this.style.background='#f0f4f8'; this.style.borderColor='#e0e7f1'; this.style.transform='translateY(0)'; this.style.boxShadow='none';" onclick="Assessment.selectAnswer(4, this)">${t('assessment.ucla_a4')}</button>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
        window.scrollTo(0, 0);
    },

    /**
     * Finish Assessment, calculate scores and save to Firestore
     */
    async finish() {
        // Calculate PHQ-9 (Sum of all answers: 0-27)
        const phq9Score = this.answers.phq9.reduce((a, b) => a + b, 0);
        
        // Calculate UCLA
        // Items 1, 5, 6, 9, 10, 15, 16, 19, 20 are reversed scored
        let uclaScore = 0;
        this.answers.ucla.forEach((ans, index) => {
            if (this.uclaReversedIndices.includes(index)) {
                // Reverse: 1->4, 2->3, 3->2, 4->1
                uclaScore += (5 - ans);
            } else {
                uclaScore += ans;
            }
        });

        // Determine Categories
        // PHQ-9 Categories
        let phq9Category = "";
        if (phq9Score <= 4) phq9Category = t('assessment.cat_minimal');
        else if (phq9Score <= 9) phq9Category = t('assessment.cat_mild');
        else if (phq9Score <= 14) phq9Category = t('assessment.cat_moderate');
        else if (phq9Score <= 19) phq9Category = t('assessment.cat_mod_severe');
        else phq9Category = t('assessment.cat_severe');                         // Berat -> Crisis Support otomatis tampil

        // UCLA Categories (20-80)
        let uclaCategory = "";
        if (uclaScore <= 34) uclaCategory = t('assessment.cat_low');
        else if (uclaScore <= 49) uclaCategory = t('assessment.cat_moderate_u');
        else if (uclaScore <= 64) uclaCategory = t('assessment.cat_mod_high');
        else uclaCategory = t('assessment.cat_high');

        const container = document.getElementById('assessmentContent');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <div class="loading-spinner" style="margin: 0 auto 20px;"></div>
                    <p>Menyimpan hasil evaluasi Anda...</p>
                </div>
            `;
        }

        try {
            // Save to Firestore
            const user = auth?.currentUser;
            if (user && typeof db !== 'undefined') {
                await db.collection('assessments').add({
                    userId: user.uid,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    date: new Date().toISOString(),
                    phq9: {
                        score: phq9Score,
                        category: phq9Category,
                        answers: this.answers.phq9
                    },
                    ucla: {
                        score: uclaScore,
                        category: uclaCategory,
                        answers: this.answers.ucla
                    }
                });
                
                // Update User document to mark onboarding complete
                await db.collection('users').doc(user.uid).set({
                    onboardingCompleted: true,
                    lastAssessmentDate: firebase.firestore.FieldValue.serverTimestamp(),
                    initialPhq9Score: phq9Score
                }, { merge: true });
            }

            // Show results
            this.showResults(phq9Score, phq9Category, uclaScore, uclaCategory);
        } catch (error) {
            console.error("Error saving assessment:", error);
            if (container) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--danger-500); margin-bottom: 20px;"></i>
                        <h3>Gagal Menyimpan</h3>
                        <p>Terjadi kesalahan saat menyimpan data. Silakan coba lagi nanti.</p>
                        <button class="btn btn-primary" onclick="Router.navigate('dashboard')" style="margin-top: 20px;">Kembali ke Dashboard</button>
                    </div>
                `;
            }
        }
    },

    /**
     * [GAP 1] Multimodal Bio-Psycho Fusion Score
     * Combines physiological sensor data (GSR, HRV, SpO2) with psychometric scores (PHQ-9, UCLA)
     * Based on: Hickey et al. 2021, Quisel et al. 2025, Can et al. 2021
     * Produces a unified "SynaScore" (0-100) reflecting overall mental wellness
     */
    calculateFusionScore(phq9Score, uclaScore) {
        // Get current sensor data from App state
        const state = (typeof App !== 'undefined' && App.getInterventionState) ? App.getInterventionState() : {};

        // Normalize PHQ-9 (0-27) to 0-100 inverted (higher = better)
        const phq9Normalized = Math.max(0, 100 - (phq9Score / 27) * 100);

        // Normalize UCLA (20-80) to 0-100 inverted (higher = better)
        const uclaNormalized = Math.max(0, 100 - ((uclaScore - 20) / 60) * 100);

        // Normalize sensor data (if available)
        const stressNormalized = Math.max(0, 100 - (state.stress || 0)); // Lower stress = higher score
        const gsrNormalized = Math.max(0, 100 - (state.gsr || 0)); // Lower GSR = calmer
        const hrScore = state.hr > 0 ? Math.max(0, 100 - Math.abs(state.hr - 72) * 2) : 50; // Optimal ~72 BPM
        const spo2Score = state.spo2 > 0 ? Math.min(100, (state.spo2 / 100) * 100) : 50; // Higher SpO2 = better

        // Weighted fusion: Psychometric (60%) + Physiological (40%)
        // Literature suggests psychometric has higher diagnostic validity (Levis et al. 2020)
        const hasSensorData = state.hr > 0 || state.stress > 0;

        let fusionScore;
        if (hasSensorData) {
            const psychoScore = (phq9Normalized * 0.35) + (uclaNormalized * 0.25);
            const bioScore = (stressNormalized * 0.15) + (gsrNormalized * 0.10) + (hrScore * 0.10) + (spo2Score * 0.05);
            fusionScore = Math.round(psychoScore + bioScore);
        } else {
            // Without sensor data, use psychometric only
            fusionScore = Math.round((phq9Normalized * 0.6) + (uclaNormalized * 0.4));
        }

        // Discordance detection: flag when self-report and bio-signals disagree
        let discordance = null;
        if (hasSensorData) {
            const psychoAvg = (phq9Normalized + uclaNormalized) / 2;
            const bioAvg = (stressNormalized + gsrNormalized + hrScore + spo2Score) / 4;
            const diff = Math.abs(psychoAvg - bioAvg);
            if (diff > 30) {
                discordance = psychoAvg > bioAvg
                    ? 'Laporan diri Anda menunjukkan kondisi baik, namun sinyal tubuh menunjukkan tekanan. Perhatikan sinyal fisik Anda.'
                    : 'Tubuh Anda dalam kondisi rileks, namun skor psikometrik menunjukkan beban emosional. Pertimbangkan untuk berbicara dengan seseorang.';
            }
        }

        // Categorize fusion score
        let fusionCategory, fusionColor;
        if (fusionScore >= 80) { fusionCategory = 'Sangat Baik'; fusionColor = '#10b981'; }
        else if (fusionScore >= 60) { fusionCategory = 'Baik'; fusionColor = '#3b82f6'; }
        else if (fusionScore >= 40) { fusionCategory = 'Waspada'; fusionColor = '#f59e0b'; }
        else if (fusionScore >= 20) { fusionCategory = 'Perlu Perhatian'; fusionColor = '#f97316'; }
        else { fusionCategory = 'Kritis'; fusionColor = '#ef4444'; }

        return { fusionScore, fusionCategory, fusionColor, discordance, hasSensorData };
    },

    /**
     * [GAP 5] Longitudinal Psychometric Tracking
     * Shows PHQ-9 and UCLA score trends over time with intervention correlation
     * Based on: Moshe et al. 2021, Morgiève et al. 2022
     */
    async renderLongitudinalChart(container) {
        const user = auth?.currentUser;
        if (!user || typeof db === 'undefined') return;

        try {
            const snapshot = await db.collection('assessments')
                .where('userId', '==', user.uid)
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
                            return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                        }),
                        datasets: [
                            {
                                label: 'PHQ-9 (Depresi)',
                                data: assessments.map(a => a.phq9),
                                borderColor: '#8B5CF6',
                                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                fill: true,
                                tension: 0.4,
                                pointRadius: 4,
                                pointBackgroundColor: '#8B5CF6'
                            },
                            {
                                label: 'UCLA (Kesepian)',
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

    showResults(phq9Score, phq9Category, uclaScore, uclaCategory) {
        const container = document.getElementById('assessmentContent');
        if (!container) return;

        // Hide progress bar wrapper
        const progressWrapper = document.getElementById('assessmentProgressWrapper');
        if (progressWrapper) progressWrapper.style.display = 'none';

        // Recommended action based on PHQ-9
        let recommendationHtml = "";
        if (phq9Score >= 15) {
            recommendationHtml = `
                <div style="background: rgba(239, 68, 68, 0.1); border-left: 4px solid var(--danger-500); padding: 16px; margin-top: 20px; border-radius: 0 8px 8px 0; text-align: left;">
                    <p style="color: var(--danger-700); font-weight: 600; margin-bottom: 8px;"><i class="fas fa-exclamation-circle"></i> Bantuan Tersedia Untuk Anda</p>
                    <p style="font-size: 0.9rem; color: var(--danger-600); margin-bottom: 12px;">Skor Anda menunjukkan tingkat beban mental yang tinggi. SYNAWATCH merekomendasikan Anda untuk berbicara dengan tenaga profesional.</p>
                    <button class="btn btn-primary btn-sm" onclick="Router.navigate('support')" style="background: var(--danger-500); border-color: var(--danger-500);">Buka Support Hub</button>
                </div>
            `;
        } else if (phq9Score >= 10) {
            recommendationHtml = `
                <div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid var(--warning-500); padding: 16px; margin-top: 20px; border-radius: 0 8px 8px 0; text-align: left;">
                    <p style="color: var(--warning-700); font-weight: 600; margin-bottom: 8px;"><i class="fas fa-info-circle"></i> Rekomendasi Fitur</p>
                    <p style="font-size: 0.9rem; color: var(--warning-600); margin-bottom: 12px;">SYNACHAT AI siap menemani Anda ngobrol dan meredakan beban pikiran Anda hari ini.</p>
                    <button class="btn btn-primary btn-sm" onclick="Router.navigate('synachat')" style="background: var(--warning-500); border-color: var(--warning-500);">Mulai Percakapan AI</button>
                </div>
            `;
        } else {
            recommendationHtml = `
                 <div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid var(--success-500); padding: 16px; margin-top: 20px; border-radius: 0 8px 8px 0; text-align: left;">
                    <p style="color: var(--success-700); font-weight: 600; margin-bottom: 8px;"><i class="fas fa-check-circle"></i> Pertahankan Kondisi Anda!</p>
                    <p style="font-size: 0.9rem; color: var(--success-600); margin-bottom: 12px;">Kondisi mental Anda terpantau baik. Gunakan fitur Sleep Lab dan Meditasi untuk menjaga kualitas istirahat Anda.</p>
                    <button class="btn btn-primary btn-sm" onclick="Router.navigate('dashboard')" style="background: var(--success-500); border-color: var(--success-500);">Lanjutkan ke Dashboard</button>
                </div>
            `;
        }

        // [GAP 1] Calculate Fusion Score
        const fusion = this.calculateFusionScore(phq9Score, uclaScore);
        // Gauge visualization using conic-gradient
        const gaugePercent = fusion.fusionScore;
        const fusionHtml = `
            <div style="background: linear-gradient(135deg, ${fusion.fusionColor}15, ${fusion.fusionColor}08); padding: 20px; border-radius: 16px; border: 2px solid ${fusion.fusionColor}30; margin-bottom: 16px;">
                <p style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">SynaScore (Bio-Psycho Fusion)</p>
                <div style="width:120px;height:120px;border-radius:50%;background:conic-gradient(${fusion.fusionColor} ${gaugePercent * 3.6}deg, #e5e7eb ${gaugePercent * 3.6}deg);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;">
                    <div style="width:90px;height:90px;border-radius:50%;background:white;display:flex;align-items:center;justify-content:center;flex-direction:column;">
                        <span style="font-size:2rem;font-weight:800;color:${fusion.fusionColor};">${fusion.fusionScore}</span>
                        <span style="font-size:0.6rem;color:var(--text-tertiary);">dari 100</span>
                    </div>
                </div>
                <p style="font-size: var(--text-sm); font-weight: 600; color: ${fusion.fusionColor};">${fusion.fusionCategory}</p>
                <div style="margin-top:12px;padding:10px;background:rgba(255,255,255,0.6);border-radius:8px;">
                    <p style="font-size:0.72rem;color:var(--text-tertiary);margin:0;">
                        <strong>Skala:</strong> 80-100 Sangat Baik · 60-79 Baik · 40-59 Waspada · 20-39 Perlu Perhatian · 0-19 Kritis
                    </p>
                </div>
                <p style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 8px;">${fusion.hasSensorData ? 'Sensor + Psikometrik' : 'Psikometrik saja (hubungkan sensor untuk akurasi lebih)'}</p>
            </div>
        `;

        const discordanceHtml = fusion.discordance ? `
            <div style="background: rgba(245, 158, 11, 0.1); border-left: 4px solid #f59e0b; padding: 14px; margin-bottom: 16px; border-radius: 0 8px 8px 0; text-align: left;">
                <p style="color: #d97706; font-weight: 600; margin-bottom: 4px;"><i class="fas fa-exclamation-triangle"></i> Deteksi Diskordan</p>
                <p style="font-size: 0.85rem; color: #92400e;">${fusion.discordance}</p>
            </div>
        ` : '';

        container.innerHTML = `
            <div style="text-align: center; animation: fadeIn 0.5s;">
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, var(--success-400), var(--success-600)); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 24px; color: white; font-size: 2.5rem; box-shadow: 0 10px 25px rgba(16, 185, 129, 0.3);">
                    <i class="fas fa-check"></i>
                </div>
                <h2 style="font-size: var(--text-2xl); color: var(--text-primary); margin-bottom: 12px;">Evaluasi Selesai</h2>
                <p style="color: var(--text-tertiary); margin-bottom: 24px;">Terima kasih. Sistem kami telah menyesuaikan fitur SYNAWATCH khusus untuk kondisi Anda.</p>

                ${fusionHtml}
                ${discordanceHtml}

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                    <div style="background: var(--bg-secondary); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color);">
                        <p style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Mental Score</p>
                        <p style="font-size: var(--text-3xl); font-weight: 800; color: var(--primary-600); margin-bottom: 4px;">${phq9Score}</p>
                        <p style="font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary);">${phq9Category}</p>
                    </div>
                    <div style="background: var(--bg-secondary); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color);">
                        <p style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">Social Link</p>
                        <p style="font-size: var(--text-3xl); font-weight: 800; color: var(--info-600); margin-bottom: 4px;">${uclaScore}</p>
                        <p style="font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary);">${uclaCategory}</p>
                    </div>
                </div>

                ${recommendationHtml}

                <div id="longitudinalContainer"></div>

                <div style="margin-top: 32px; display: flex; flex-direction: column; gap: 12px;">
                    <button class="btn btn-primary" style="width: 100%; justify-content: center;" onclick="Router.navigate('dashboard')"><i class="fas fa-home"></i> Lanjut ke Dashboard</button>
                    <button class="btn btn-outline" style="width: 100%; justify-content: center;" onclick="window.print()"><i class="fas fa-file-pdf"></i> Simpan / Cetak Hasil</button>
                </div>
            </div>
        `;

        // [GAP 5] Render longitudinal tracking chart
        const longitudinalContainer = document.getElementById('longitudinalContainer');
        if (longitudinalContainer) {
            this.renderLongitudinalChart(longitudinalContainer);
        }
    }
};

window.Assessment = Assessment;
