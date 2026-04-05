/**
 * SYNAWATCH - Assessment Module
 * Handles PHQ-9 (Depression) and UCLA Loneliness Scale questionnaires
 * With progress persistence and Firestore storage
 */

const Assessment = {
    // PHQ-9 Questions (Over the last 2 weeks, how often have you been bothered by any of the following problems?)
    phq9: [
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
    // UCLA Loneliness Scale V3 (20 items)
    ucla: [
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
    uclaReversedIndices: [0, 4, 5, 8, 9, 14, 15, 18, 19],

    currentStage: 'intro', // intro, phq9, ucla, result
    currentIndex: 0,
    answers: {
        phq9: [],
        ucla: []
    },

    // Storage key for localStorage
    STORAGE_KEY: 'synawatch_assessment_progress',

    /**
     * Initialize Assessment - check for existing progress or completed assessment
     */
    async init() {
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
                <h2 style="font-size: var(--text-2xl); color: var(--text-primary); margin-bottom: 12px;">Selamat Datang!</h2>
                <p style="color: var(--text-secondary); margin-bottom: 32px; line-height: 1.6;">Untuk mempersonalisasi SYNAWATCH sesuai dengan kondisi Anda, kami perlu menanyakan beberapa hal (PHQ-9 & UCLA Loneliness Scale). Data ini dijamin kerahasiaannya.</p>
                <button class="btn btn-primary" style="width: 100%; justify-content: center; padding: 16px; font-size: 1.1rem;" onclick="Assessment.start()">Mulai Evaluasi</button>
            </div>
        `;
    },

    /**
     * Show saved results from Firestore
     */
    showSavedResults(assessment) {
        const phq9Score = assessment.phq9?.score ?? 0;
        const phq9Category = assessment.phq9?.category ?? 'Unknown';
        const uclaScore = assessment.ucla?.score ?? 0;
        const uclaCategory = assessment.ucla?.category ?? 'Unknown';

        // Format date
        let dateStr = 'Unknown';
        if (assessment.timestamp?.toDate) {
            dateStr = assessment.timestamp.toDate().toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            });
        } else if (assessment.date) {
            dateStr = new Date(assessment.date).toLocaleDateString('id-ID', {
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
                <h2 style="font-size: var(--text-2xl); color: var(--text-primary); margin-bottom: 8px;">Hasil Evaluasi Terakhir</h2>
                <p style="color: var(--text-tertiary); margin-bottom: 24px; font-size: 0.9rem;">
                    <i class="fas fa-calendar-alt"></i> ${dateStr}
                </p>

                <!-- Fusion Score -->
                <div style="background: linear-gradient(135deg, ${fusion.fusionColor}15, ${fusion.fusionColor}08); padding: 20px; border-radius: 16px; border: 2px solid ${fusion.fusionColor}30; margin-bottom: 16px;">
                    <p style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">SynaScore</p>
                    <p style="font-size: 3rem; font-weight: 800; color: ${fusion.fusionColor}; margin-bottom: 4px;">${fusion.fusionScore}</p>
                    <p style="font-size: var(--text-sm); font-weight: 600; color: ${fusion.fusionColor};">${fusion.fusionCategory}</p>
                </div>

                <!-- Score Cards -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
                    <div style="background: var(--bg-secondary); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color);">
                        <p style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">PHQ-9</p>
                        <p style="font-size: var(--text-3xl); font-weight: 800; color: var(--primary-600); margin-bottom: 4px;">${phq9Score}</p>
                        <p style="font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary);">${phq9Category}</p>
                    </div>
                    <div style="background: var(--bg-secondary); padding: 20px; border-radius: 16px; border: 1px solid var(--border-color);">
                        <p style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">UCLA</p>
                        <p style="font-size: var(--text-3xl); font-weight: 800; color: var(--info-600); margin-bottom: 4px;">${uclaScore}</p>
                        <p style="font-size: var(--text-sm); font-weight: 600; color: var(--text-secondary);">${uclaCategory}</p>
                    </div>
                </div>

                <!-- Longitudinal Chart -->
                <div id="longitudinalContainer"></div>

                <!-- Actions -->
                <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 24px;">
                    <button class="btn btn-primary" style="width: 100%; justify-content: center;" onclick="Assessment.retakeAssessment()">
                        <i class="fas fa-redo"></i> Ulangi Evaluasi
                    </button>
                    <button class="btn btn-outline" style="width: 100%; justify-content: center;" onclick="Router.navigate('dashboard')">
                        <i class="fas fa-home"></i> Ke Dashboard
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
        // Also clear cached assessment results
        try { localStorage.removeItem('synawatch_assessment'); } catch (e) {}
        this.currentStage = 'intro';
        this.currentIndex = 0;
        this.answers = { phq9: [], ucla: [] };
        this.start();
    },

    /**
     * Start Assessment
     */
    start() {
        this.currentStage = 'phq9';
        this.currentIndex = 0;
        this.answers = { phq9: [], ucla: [] };
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
        if (this.currentStage === 'phq9') {
            this.answers.phq9[this.currentIndex] = value;
            this.saveProgress(); // Save after each answer
            this.next();
        } else if (this.currentStage === 'ucla') {
            this.answers.ucla[this.currentIndex] = value;
            this.saveProgress(); // Save after each answer
            this.next();
        }
    },

    /**
     * Go to next question
     */
    next() {
        if (this.currentStage === 'phq9') {
            if (this.currentIndex < this.phq9.length - 1) {
                this.currentIndex++;
                this.saveProgress();
                this.renderQuestion();
            } else {
                this.currentStage = 'ucla';
                this.currentIndex = 0;
                this.saveProgress();
                this.renderQuestion();
            }
        } else if (this.currentStage === 'ucla') {
            if (this.currentIndex < this.ucla.length - 1) {
                this.currentIndex++;
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
        if (this.currentStage === 'ucla' && this.currentIndex === 0) {
            // Go back to last PHQ-9 question
            this.currentStage = 'phq9';
            this.currentIndex = this.phq9.length - 1;
        } else if (this.currentIndex > 0) {
            this.currentIndex--;
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

        let totalQuestions = this.phq9.length + this.ucla.length;
        let currentOverallIndex = this.currentStage === 'phq9' ? this.currentIndex : this.phq9.length + this.currentIndex;
        let progress = Math.round((currentOverallIndex / totalQuestions) * 100);

        // Update progress bar
        const progressBar = document.getElementById('assessmentProgress');
        if (progressBar) progressBar.style.width = progress + '%';

        // Check if there's a previously selected answer for this question
        const previousAnswer = this.currentStage === 'phq9'
            ? this.answers.phq9[this.currentIndex]
            : this.answers.ucla[this.currentIndex];

        // Can go back?
        const canGoBack = !(this.currentStage === 'phq9' && this.currentIndex === 0);

        let html = '';
        if (this.currentStage === 'phq9') {
            html = `
                <div class="assessment-header" style="margin-bottom: var(--space-6); text-align: center;">
                    <span class="badge" style="background: rgba(139, 92, 246, 0.15); color: var(--primary-500); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; margin-bottom: 12px; display: inline-block;">Bagian 1: Kesejahteraan Mental (${this.currentIndex + 1}/${this.phq9.length})</span>
                    <p style="color: var(--text-tertiary); font-size: var(--text-sm);">Dalam 2 minggu terakhir, seberapa sering Anda terganggu oleh masalah berikut?</p>
                </div>
                <div class="question-card" style="background: white; padding: var(--space-6); border-radius: var(--radius-xl); box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin-bottom: var(--space-6);">
                    <h3 style="font-size: var(--text-lg); color: var(--text-primary); margin-bottom: var(--space-6); text-align: center;">${this.phq9[this.currentIndex]}</h3>
                    <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                        <button class="btn ${previousAnswer === 0 ? 'btn-primary' : 'btn-outline'}" style="justify-content: flex-start; text-align: left; padding: 16px;" onclick="Assessment.selectAnswer(0)">
                            ${previousAnswer === 0 ? '<i class="fas fa-check-circle" style="margin-right: 8px;"></i>' : ''}Tidak pernah sama sekali
                        </button>
                        <button class="btn ${previousAnswer === 1 ? 'btn-primary' : 'btn-outline'}" style="justify-content: flex-start; text-align: left; padding: 16px;" onclick="Assessment.selectAnswer(1)">
                            ${previousAnswer === 1 ? '<i class="fas fa-check-circle" style="margin-right: 8px;"></i>' : ''}Beberapa hari
                        </button>
                        <button class="btn ${previousAnswer === 2 ? 'btn-primary' : 'btn-outline'}" style="justify-content: flex-start; text-align: left; padding: 16px;" onclick="Assessment.selectAnswer(2)">
                            ${previousAnswer === 2 ? '<i class="fas fa-check-circle" style="margin-right: 8px;"></i>' : ''}Lebih dari separuh waktu
                        </button>
                        <button class="btn ${previousAnswer === 3 ? 'btn-primary' : 'btn-outline'}" style="justify-content: flex-start; text-align: left; padding: 16px;" onclick="Assessment.selectAnswer(3)">
                            ${previousAnswer === 3 ? '<i class="fas fa-check-circle" style="margin-right: 8px;"></i>' : ''}Hampir setiap hari
                        </button>
                    </div>
                </div>
                ${canGoBack ? `
                <button class="btn btn-outline" style="width: 100%; justify-content: center; margin-top: 8px;" onclick="Assessment.prev()">
                    <i class="fas fa-arrow-left"></i> Pertanyaan Sebelumnya
                </button>
                ` : ''}
            `;
        } else if (this.currentStage === 'ucla') {
            html = `
                <div class="assessment-header" style="margin-bottom: var(--space-6); text-align: center;">
                    <span class="badge" style="background: rgba(16, 185, 129, 0.15); color: var(--success-500); padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; margin-bottom: 12px; display: inline-block;">Bagian 2: Interaksi Sosial (${this.currentIndex + 1}/${this.ucla.length})</span>
                    <p style="color: var(--text-tertiary); font-size: var(--text-sm);">Seberapa sering Anda merasakan hal berikut?</p>
                </div>
                <div class="question-card" style="background: white; padding: var(--space-6); border-radius: var(--radius-xl); box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin-bottom: var(--space-6);">
                    <h3 style="font-size: var(--text-lg); color: var(--text-primary); margin-bottom: var(--space-6); text-align: center;">${this.ucla[this.currentIndex]}</h3>
                    <div style="display: flex; flex-direction: column; gap: var(--space-3);">
                        <button class="btn ${previousAnswer === 1 ? 'btn-primary' : 'btn-outline'}" style="justify-content: flex-start; text-align: left; padding: 16px;" onclick="Assessment.selectAnswer(1)">
                            ${previousAnswer === 1 ? '<i class="fas fa-check-circle" style="margin-right: 8px;"></i>' : ''}Tidak pernah (Never)
                        </button>
                        <button class="btn ${previousAnswer === 2 ? 'btn-primary' : 'btn-outline'}" style="justify-content: flex-start; text-align: left; padding: 16px;" onclick="Assessment.selectAnswer(2)">
                            ${previousAnswer === 2 ? '<i class="fas fa-check-circle" style="margin-right: 8px;"></i>' : ''}Jarang (Rarely)
                        </button>
                        <button class="btn ${previousAnswer === 3 ? 'btn-primary' : 'btn-outline'}" style="justify-content: flex-start; text-align: left; padding: 16px;" onclick="Assessment.selectAnswer(3)">
                            ${previousAnswer === 3 ? '<i class="fas fa-check-circle" style="margin-right: 8px;"></i>' : ''}Kadang-kadang (Sometimes)
                        </button>
                        <button class="btn ${previousAnswer === 4 ? 'btn-primary' : 'btn-outline'}" style="justify-content: flex-start; text-align: left; padding: 16px;" onclick="Assessment.selectAnswer(4)">
                            ${previousAnswer === 4 ? '<i class="fas fa-check-circle" style="margin-right: 8px;"></i>' : ''}Sering (Often)
                        </button>
                    </div>
                </div>
                <button class="btn btn-outline" style="width: 100%; justify-content: center; margin-top: 8px;" onclick="Assessment.prev()">
                    <i class="fas fa-arrow-left"></i> Pertanyaan Sebelumnya
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
        // Validate all answers are present (guard against corrupted data)
        const phq9Valid = this.answers.phq9.length === this.phq9.length &&
            this.answers.phq9.every(a => typeof a === 'number' && a >= 0 && a <= 3);
        const uclaValid = this.answers.ucla.length === this.ucla.length &&
            this.answers.ucla.every(a => typeof a === 'number' && a >= 1 && a <= 4);

        if (!phq9Valid || !uclaValid) {
            console.error('Invalid answers detected, restarting assessment');
            this.clearProgress();
            this.currentStage = 'intro';
            this.currentIndex = 0;
            this.answers = { phq9: [], ucla: [] };
            this.renderIntro();
            return;
        }

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
        if (phq9Score <= 4) phq9Category = "Minimal";        // Minimal -> mode pemantauan pasif
        else if (phq9Score <= 9) phq9Category = "Ringan";    // Ringan -> intervensi mandiri (Sleep Lab, Mood Booster)
        else if (phq9Score <= 14) phq9Category = "Sedang";   // Sedang -> SynaBuddy proaktif + Support Hub disarankan
        else if (phq9Score <= 19) phq9Category = "Sedang-Berat"; // Sedang-Berat -> Alert + Referral System
        else phq9Category = "Berat";                         // Berat -> Crisis Support otomatis tampil

        // UCLA Categories (20-80)
        let uclaCategory = "";
        if (uclaScore <= 34) uclaCategory = "Low";
        else if (uclaScore <= 49) uclaCategory = "Moderate";
        else if (uclaScore <= 64) uclaCategory = "Moderately High";
        else uclaCategory = "High";

        const container = document.getElementById('assessmentContent');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px 20px;">
                    <div class="loading-spinner" style="margin: 0 auto 20px;"></div>
                    <p>Menyimpan hasil evaluasi Anda...</p>
                </div>
            `;
        }

        // Cache assessment results for intervention engine (always, even if Firestore fails)
        this.cacheAssessmentResults(phq9Score, phq9Category, uclaScore, uclaCategory);

        const user = auth?.currentUser;
        const firestoreAvailable = user && typeof db !== 'undefined' && typeof FirebaseService !== 'undefined';

        if (!firestoreAvailable) {
            // No Firestore available - cache locally and show results
            console.warn('Firestore not available, assessment cached locally only');
            this.clearProgress();
            this.showResults(phq9Score, phq9Category, uclaScore, uclaCategory);
            return;
        }

        try {
            // Save to Firestore
            await FirebaseService.userCol(user.uid, 'assessments').add({
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
                initialPhq9Score: phq9Score,
                initialUclaScore: uclaScore
            }, { merge: true });

            // Clear localStorage progress since we're done
            this.clearProgress();

            // Show results
            this.showResults(phq9Score, phq9Category, uclaScore, uclaCategory);
        } catch (error) {
            console.error("Error saving assessment:", error);
            // Store scores temporarily so retry can use them
            this._pendingResults = { phq9Score, phq9Category, uclaScore, uclaCategory };
            const cont = document.getElementById('assessmentContent');
            if (cont) {
                cont.innerHTML = `
                    <div style="text-align: center; padding: 40px 20px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--danger-500); margin-bottom: 20px;"></i>
                        <h3>Gagal Menyimpan</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 20px;">Terjadi kesalahan saat menyimpan data ke server. Data Anda tetap tersimpan secara lokal.</p>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <button class="btn btn-primary" onclick="Assessment.retryFinish()" style="width: 100%; justify-content: center;">
                                <i class="fas fa-redo"></i> Coba Simpan Ulang
                            </button>
                            <button class="btn btn-outline" onclick="Assessment.showResults(${phq9Score}, '${phq9Category}', ${uclaScore}, '${uclaCategory}')" style="width: 100%; justify-content: center;">
                                <i class="fas fa-chart-pie"></i> Lihat Hasil Saja
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
            localStorage.setItem('synawatch_assessment', JSON.stringify({
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
                        <h3>Masih Gagal Menyimpan</h3>
                        <p style="color: var(--text-secondary); margin-bottom: 20px;">Periksa koneksi internet Anda. Data tetap tersimpan lokal.</p>
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                            <button class="btn btn-primary" onclick="Assessment.retryFinish()" style="width: 100%; justify-content: center;">
                                <i class="fas fa-redo"></i> Coba Lagi
                            </button>
                            <button class="btn btn-outline" onclick="Assessment.showResults(${pending.phq9Score}, '${pending.phq9Category}', ${pending.uclaScore}, '${pending.uclaCategory}')" style="width: 100%; justify-content: center;">
                                <i class="fas fa-chart-pie"></i> Lihat Hasil Saja
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
                const sleepHistory = JSON.parse(localStorage.getItem('synawatch_sleep_history') || '[]');
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
        let discordance = null;
        if (hasSensorData && componentScores.pHrv !== null) {
            const bioAvg = (pEda + pHrv + pSleep) / 3;
            const diff = Math.abs(pPsych - bioAvg);
            if (diff > 30) {
                discordance = pPsych > bioAvg
                    ? 'Laporan diri Anda menunjukkan kondisi baik, namun sinyal tubuh menunjukkan tekanan. Perhatikan sinyal fisik Anda.'
                    : 'Tubuh Anda dalam kondisi rileks, namun skor psikometrik menunjukkan beban emosional. Pertimbangkan untuk berbicara dengan seseorang.';
            }
        }

        // ── Kategorisasi SynaScore ──────────────────────────────────────────────
        let fusionCategory, fusionColor;
        if (fusionScore >= 80) { fusionCategory = 'Sangat Baik'; fusionColor = '#10b981'; }
        else if (fusionScore >= 60) { fusionCategory = 'Baik'; fusionColor = '#3b82f6'; }
        else if (fusionScore >= 40) { fusionCategory = 'Waspada'; fusionColor = '#f59e0b'; }
        else if (fusionScore >= 20) { fusionCategory = 'Perlu Perhatian'; fusionColor = '#f97316'; }
        else { fusionCategory = 'Kritis'; fusionColor = '#ef4444'; }

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
        const fusionHtml = `
            <div style="background: linear-gradient(135deg, ${fusion.fusionColor}15, ${fusion.fusionColor}08); padding: 20px; border-radius: 16px; border: 2px solid ${fusion.fusionColor}30; margin-bottom: 16px;">
                <p style="font-size: var(--text-xs); color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">SynaScore (Bio-Psycho Fusion)</p>
                <p style="font-size: 3rem; font-weight: 800; color: ${fusion.fusionColor}; margin-bottom: 4px;">${fusion.fusionScore}</p>
                <p style="font-size: var(--text-sm); font-weight: 600; color: ${fusion.fusionColor};">${fusion.fusionCategory}</p>
                <p style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 4px;">${fusion.hasSensorData ? 'Sensor + Psikometrik' : 'Psikometrik saja (hubungkan sensor untuk akurasi lebih)'}</p>
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

                <div style="margin-top: 32px;">
                    <button class="btn btn-outline" style="width: 100%; justify-content: center;" onclick="Router.navigate('dashboard')">Lewati ke Dashboard</button>
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
