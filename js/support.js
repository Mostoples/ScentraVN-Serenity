/**
 * SYNAWATCH - Support Hub v3.0
 * Bio-Signal Triggered Safety Planning
 * Based on: Melvin et al. 2024, Nuij et al. 2020 (SafePlan), McManama et al. 2023, Berrouiguet et al. 2023
 */

const SupportHub = {
    hotlines: [
        {
            name: 'Layanan Sejiwa',
            number: '119 ext 8',
            phone: 'tel:119',
            operator: 'Kemenkes RI',
            hours: '24/7',
            description: 'Konseling krisis kesehatan mental nasional',
            icon: 'fa-phone-alt',
            color: '#8B5CF6'
        },
        {
            name: 'Into The Light Indonesia',
            number: '+62 821 1500 4949',
            phone: 'tel:+6282115004949',
            operator: 'NGO',
            hours: '24/7',
            description: 'Dukungan krisis mental dan pencegahan bunuh diri',
            icon: 'fa-heart-pulse',
            color: '#EC4899'
        },
        {
            name: 'LSM Jangan Bunuh Diri',
            number: '+62 856 9191 9191',
            phone: 'tel:+6285691919191',
            operator: 'NGO',
            hours: '24/7',
            description: 'Pendampingan krisis dan pencegahan bunuh diri',
            icon: 'fa-hand-holding-heart',
            color: '#EF4444'
        },
        {
            name: 'Yayasan Pulih',
            number: '+62 812 1366 9000',
            phone: 'tel:+6281213669000',
            operator: 'NGO',
            hours: 'Senin-Jumat, 09:00-17:00',
            description: 'Pemulihan trauma dan krisis kesehatan mental',
            icon: 'fa-shield-heart',
            color: '#14B8A6'
        }
    ],

    professionals: [
        { type: 'Psikolog Klinis', icon: 'fa-user-tie', platform: 'Halodoc', url: 'https://www.halodoc.com/tanya-dokter/psikolog-klinis', desc: 'Konsultasi online dengan psikolog berlisensi' },
        { type: 'Psikiater', icon: 'fa-stethoscope', platform: 'Alodokter', url: 'https://www.alodokter.com/cari-dokter/psikiater', desc: 'Temukan psikiater terdekat untuk terapi medis' },
        { type: 'Konselor Online', icon: 'fa-comments', platform: 'Riliv', url: 'https://riliv.co/', desc: 'Sesi konseling online terjadwal' }
    ],

    selfCareTools: [
        { label: 'Latihan Pernapasan 4-7-8', desc: 'Tarik 4 detik, tahan 7 detik, buang 8 detik. Ulangi 4x.', icon: 'fa-wind', route: 'mindful', color: '#10B981' },
        { label: 'Refleksi Harian (Journaling)', desc: 'Tulis pikiran Anda untuk identifikasi pola emosi.', icon: 'fa-book-open', route: 'journal', color: '#F97316' },
        { label: 'Terapi Musik', desc: 'Dengarkan musik yang disesuaikan sensor tubuh Anda.', icon: 'fa-music', route: 'moodbooster', color: '#F59E0B' },
        { label: 'Bicara dengan AI', desc: 'Dr. Synachat siap menemani Anda kapan saja.', icon: 'fa-robot', route: 'synachat', color: '#3B82F6' }
    ],

    cachedAssessment: null,
    cachedSafetyPlan: null,

    async initSupportHub() {
        console.log('Support Hub v3.0 Initializing...');
        await this.loadUserData();
        this.render();
    },

    /**
     * Load assessment + safety plan from Firestore
     */
    async loadUserData() {
        const user = auth?.currentUser;
        if (!user) return;

        try {
            const [assessmentResult, safetyPlanResult] = await Promise.all([
                FirebaseService.getLatestAssessment(user.uid),
                FirebaseService.userCol(user.uid, 'safetyPlans').doc('plan').get()
            ]);

            if (assessmentResult) {
                this.cachedAssessment = {
                    phq9Score: assessmentResult.phq9?.score ?? 0,
                    phq9Category: assessmentResult.phq9?.category ?? 'Minimal',
                    uclaScore: assessmentResult.ucla?.score ?? 20,
                    uclaCategory: assessmentResult.ucla?.category ?? 'Low',
                    date: assessmentResult.date || null
                };
            }

            if (safetyPlanResult.exists) {
                this.cachedSafetyPlan = safetyPlanResult.data();
            }
        } catch (e) {
            console.warn('Support Hub: Error loading user data', e);
        }
    },

    /**
     * Get current state from sensor + assessment
     */
    getCurrentState() {
        const sensor = (typeof BLEConnection !== 'undefined') ? BLEConnection.getSensorData() : {};
        const assessment = this.cachedAssessment || {};

        return {
            stress: sensor.stress || 0,
            gsr: sensor.gsr || 0,
            hr: sensor.hr || 0,
            spo2: sensor.spo2 || 0,
            hasSensor: (sensor.hr > 0 || sensor.stress > 0),
            phq9Score: assessment.phq9Score || 0,
            phq9Category: assessment.phq9Category || 'Minimal',
            uclaScore: assessment.uclaScore || 20,
            uclaCategory: assessment.uclaCategory || 'Low',
            hasAssessment: !!this.cachedAssessment
        };
    },

    /**
     * Assess risk level
     */
    assessRiskLevel(state) {
        const phq9 = state.phq9Score || 0;
        const stress = state.stress || 0;
        const gsr = state.gsr || 0;
        const ucla = state.uclaScore || 0;

        if (phq9 >= 20 && stress > 80 && gsr > 80) {
            return { level: 3, label: 'Risiko Tinggi', message: 'Skor mental dan sinyal fisiologis menunjukkan kondisi yang memerlukan bantuan segera. Hubungi layanan krisis atau kunjungi rumah sakit terdekat.', color: '#DC2626', bg: '#FEF2F2', icon: 'fa-circle-exclamation' };
        }
        if (phq9 >= 15 && (stress > 65 || gsr > 70 || ucla > 60)) {
            return { level: 2, label: 'Perlu Perhatian Serius', message: 'Skor depresi Anda menunjukkan beban signifikan. Konsultasi dengan tenaga profesional sangat direkomendasikan.', color: '#F97316', bg: '#FFF7ED', icon: 'fa-triangle-exclamation' };
        }
        if (phq9 >= 10) {
            return { level: 1, label: 'Perlu Perhatian', message: 'Anda menunjukkan gejala yang dapat dikelola dengan dukungan profesional dan strategi self-care.', color: '#F59E0B', bg: '#FFFBEB', icon: 'fa-circle-info' };
        }
        if (phq9 >= 5) {
            return { level: 0, label: 'Gejala Ringan', message: 'Gejala ringan terdeteksi. Manfaatkan fitur self-care SynaWatch untuk menjaga kondisi Anda.', color: '#3B82F6', bg: '#EFF6FF', icon: 'fa-info-circle' };
        }
        return { level: 0, label: 'Kondisi Baik', message: 'Kondisi mental Anda terpantau baik. Lanjutkan praktik self-care dan pantau secara berkala.', color: '#10B981', bg: '#ECFDF5', icon: 'fa-check-circle' };
    },

    /**
     * Main render
     */
    render() {
        const container = document.getElementById('supportContent');
        if (!container) return;

        const state = this.getCurrentState();
        const risk = this.assessRiskLevel(state);

        container.innerHTML = `
            <!-- Header -->
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h2 style="font-size:1.25rem;font-weight:700;color:var(--text-primary);margin:0;">
                    <i class="fas fa-hand-holding-heart" style="color:#EF4444;margin-right:6px;"></i>Support Hub
                </h2>
            </div>

            <!-- Risk Assessment Banner -->
            ${this.renderRiskBanner(state, risk)}

            <!-- Emergency Section (Level 2+) -->
            ${risk.level >= 2 ? this.renderEmergencyBanner() : ''}

            <!-- Assessment Status -->
            ${this.renderAssessmentStatus(state)}

            <!-- Hotlines -->
            <div style="margin-bottom:20px;">
                <h3 style="font-size:0.95rem;font-weight:700;color:var(--text-primary);margin-bottom:12px;">
                    <i class="fas fa-phone-alt" style="color:#EF4444;margin-right:6px;"></i>Hotline Darurat
                </h3>
                ${this.renderHotlines()}
            </div>

            <!-- Safety Plan -->
            ${this.renderSafetyPlanCard()}

            <!-- Professional Referral -->
            <div style="margin-bottom:20px;">
                <h3 style="font-size:0.95rem;font-weight:700;color:var(--text-primary);margin-bottom:12px;">
                    <i class="fas fa-user-doctor" style="color:#3B82F6;margin-right:6px;"></i>Konsultasi Profesional
                </h3>
                ${this.renderProfessionals()}
            </div>

            <!-- Self-Care Tools -->
            <div style="margin-bottom:20px;">
                <h3 style="font-size:0.95rem;font-weight:700;color:var(--text-primary);margin-bottom:12px;">
                    <i class="fas fa-heart" style="color:#EC4899;margin-right:6px;"></i>Alat Bantu Self-Care
                </h3>
                ${this.renderSelfCareTools()}
            </div>

            <!-- Footer -->
            <div style="background:var(--bg-secondary);padding:12px;border-radius:12px;">
                <p style="font-size:0.72rem;color:var(--text-tertiary);text-align:center;margin:0;">
                    <i class="fas fa-flask"></i> Safety Planning berbasis: Digital Safety Plans (Melvin et al., 2024), SafePlan (Nuij et al., 2020)
                </p>
            </div>
        `;
    },

    renderRiskBanner(state, risk) {
        const sensorBadge = state.hasSensor
            ? `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(16,185,129,0.12);color:#10B981;padding:3px 10px;border-radius:8px;font-size:0.7rem;font-weight:600;"><i class="fas fa-broadcast-tower" style="font-size:0.6rem;"></i> Sensor Aktif</span>`
            : `<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(156,163,175,0.12);color:#9CA3AF;padding:3px 10px;border-radius:8px;font-size:0.7rem;font-weight:600;"><i class="fas fa-unlink" style="font-size:0.6rem;"></i> Sensor Offline</span>`;

        return `
        <div style="background:${risk.bg};border:1px solid ${risk.color}25;border-left:4px solid ${risk.color};border-radius:14px;padding:16px;margin-bottom:16px;">
            <div style="display:flex;align-items:flex-start;gap:12px;">
                <div style="width:40px;height:40px;background:${risk.color}15;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas ${risk.icon}" style="color:${risk.color};font-size:1rem;"></i>
                </div>
                <div style="flex:1;">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
                        <span style="font-weight:700;color:${risk.color};font-size:0.9rem;">${risk.label}</span>
                        ${sensorBadge}
                    </div>
                    <p style="margin:0;color:var(--text-secondary);font-size:0.84rem;line-height:1.55;">${risk.message}</p>
                    ${state.hasAssessment ? `<div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
                        <span style="background:white;padding:3px 10px;border-radius:8px;font-size:0.72rem;font-weight:600;color:var(--text-secondary);border:1px solid var(--border-color);">PHQ-9: ${state.phq9Score} (${state.phq9Category})</span>
                        <span style="background:white;padding:3px 10px;border-radius:8px;font-size:0.72rem;font-weight:600;color:var(--text-secondary);border:1px solid var(--border-color);">UCLA: ${state.uclaScore} (${state.uclaCategory})</span>
                    </div>` : ''}
                </div>
            </div>
        </div>
        `;
    },

    renderEmergencyBanner() {
        return `
        <div style="background:linear-gradient(135deg,#DC2626,#991B1B);padding:18px;border-radius:16px;margin-bottom:16px;color:white;box-shadow:0 8px 24px rgba(220,38,38,0.2);">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                <i class="fas fa-shield-heart" style="font-size:1.2rem;"></i>
                <h3 style="margin:0;font-size:1rem;font-weight:700;">Bantuan Segera Tersedia</h3>
            </div>
            <p style="margin:0 0 14px;font-size:0.85rem;opacity:0.95;line-height:1.5;">Anda tidak sendirian. Hubungi layanan krisis untuk berbicara dengan seseorang sekarang.</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <a href="tel:119" style="display:flex;align-items:center;justify-content:center;gap:6px;padding:12px;background:white;color:#DC2626;border-radius:12px;text-decoration:none;font-weight:700;font-size:0.88rem;">
                    <i class="fas fa-phone-alt"></i> Sejiwa 119
                </a>
                <button onclick="SupportHub.openSafetyPlan()" style="display:flex;align-items:center;justify-content:center;gap:6px;padding:12px;background:rgba(255,255,255,0.2);color:white;border:none;border-radius:12px;font-weight:600;cursor:pointer;font-size:0.88rem;">
                    <i class="fas fa-clipboard-list"></i> Rencana Aman
                </button>
            </div>
        </div>
        `;
    },

    renderAssessmentStatus(state) {
        if (state.hasAssessment) return '';

        return `
        <div style="background:white;border:1px solid var(--border-color);border-radius:14px;padding:16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;background:#EDE9FE;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="fas fa-clipboard-check" style="color:#7C3AED;"></i>
            </div>
            <div style="flex:1;">
                <div style="font-weight:700;color:var(--text-primary);font-size:0.88rem;margin-bottom:2px;">Evaluasi Belum Dilakukan</div>
                <div style="font-size:0.78rem;color:var(--text-tertiary);line-height:1.4;">Lakukan evaluasi PHQ-9 & UCLA agar sistem dapat menilai risiko Anda secara akurat.</div>
            </div>
            <button onclick="Router.navigate('assessment')" class="btn btn-primary btn-sm" style="flex-shrink:0;border-radius:10px;padding:8px 14px;font-size:0.8rem;">Mulai</button>
        </div>
        `;
    },

    renderHotlines() {
        return this.hotlines.map(h => `
            <div style="background:white;padding:14px;border-radius:14px;border:1px solid var(--border-color);margin-bottom:10px;display:flex;align-items:center;gap:12px;">
                <div style="width:44px;height:44px;background:${h.color}12;color:${h.color};border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1rem;">
                    <i class="fas ${h.icon}"></i>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;color:var(--text-primary);font-size:0.88rem;">${h.name}</div>
                    <div style="font-size:0.75rem;color:var(--text-tertiary);margin-bottom:2px;">${h.operator} &bull; ${h.hours}</div>
                    <div style="font-size:0.78rem;color:var(--text-secondary);font-weight:600;">${h.number}</div>
                </div>
                <a href="${h.phone}" style="display:flex;align-items:center;justify-content:center;gap:5px;padding:10px 16px;background:${h.color};color:white;border-radius:10px;text-decoration:none;font-weight:600;font-size:0.8rem;flex-shrink:0;box-shadow:0 4px 12px ${h.color}30;">
                    <i class="fas fa-phone" style="font-size:0.7rem;"></i> Hubungi
                </a>
            </div>
        `).join('');
    },

    renderSafetyPlanCard() {
        const hasPlan = !!this.cachedSafetyPlan;

        if (hasPlan) {
            const plan = this.cachedSafetyPlan;
            const updatedAt = plan.updatedAt?.toDate ? plan.updatedAt.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '';

            return `
            <div style="background:white;border:1px solid var(--border-color);border-radius:16px;padding:18px;margin-bottom:20px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
                    <h3 style="font-size:0.95rem;font-weight:700;color:var(--text-primary);margin:0;">
                        <i class="fas fa-clipboard-list" style="color:#14B8A6;margin-right:6px;"></i>Rencana Keselamatan
                    </h3>
                    <div style="display:flex;gap:6px;">
                        <span style="background:#ECFDF5;color:#059669;padding:3px 10px;border-radius:8px;font-size:0.7rem;font-weight:700;"><i class="fas fa-check-circle"></i> Tersimpan</span>
                    </div>
                </div>

                ${plan.warningSigns ? `
                <div style="margin-bottom:12px;">
                    <div style="font-size:0.75rem;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;"><i class="fas fa-exclamation-triangle" style="color:#F59E0B;margin-right:4px;"></i>Tanda Peringatan</div>
                    <div style="font-size:0.84rem;color:var(--text-secondary);line-height:1.5;background:var(--bg-secondary);padding:10px 12px;border-radius:10px;">${this.escapeHtml(plan.warningSigns)}</div>
                </div>` : ''}

                ${plan.copingStrategies ? `
                <div style="margin-bottom:12px;">
                    <div style="font-size:0.75rem;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;"><i class="fas fa-heart" style="color:#EC4899;margin-right:4px;"></i>Strategi Koping</div>
                    <div style="font-size:0.84rem;color:var(--text-secondary);line-height:1.5;background:var(--bg-secondary);padding:10px 12px;border-radius:10px;">${this.escapeHtml(plan.copingStrategies)}</div>
                </div>` : ''}

                ${plan.supportPeople ? `
                <div style="margin-bottom:12px;">
                    <div style="font-size:0.75rem;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;"><i class="fas fa-users" style="color:#3B82F6;margin-right:4px;"></i>Orang Terpercaya</div>
                    <div style="font-size:0.84rem;color:var(--text-secondary);line-height:1.5;background:var(--bg-secondary);padding:10px 12px;border-radius:10px;">${this.escapeHtml(plan.supportPeople)}</div>
                </div>` : ''}

                ${plan.reasonsForLiving ? `
                <div style="margin-bottom:12px;">
                    <div style="font-size:0.75rem;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;"><i class="fas fa-sun" style="color:#F59E0B;margin-right:4px;"></i>Alasan Bertahan</div>
                    <div style="font-size:0.84rem;color:var(--text-secondary);line-height:1.5;background:var(--bg-secondary);padding:10px 12px;border-radius:10px;">${this.escapeHtml(plan.reasonsForLiving)}</div>
                </div>` : ''}

                <div style="display:flex;gap:8px;margin-top:4px;">
                    <button onclick="SupportHub.openSafetyPlan()" class="btn btn-outline btn-sm" style="flex:1;border-radius:10px;justify-content:center;font-size:0.82rem;">
                        <i class="fas fa-pen"></i> Edit Rencana
                    </button>
                </div>
                ${updatedAt ? `<div style="font-size:0.7rem;color:var(--text-tertiary);text-align:center;margin-top:8px;">Terakhir diperbarui: ${updatedAt}</div>` : ''}
            </div>
            `;
        }

        return `
        <div style="background:white;border:1px solid var(--border-color);border-radius:16px;padding:18px;margin-bottom:20px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                <div style="width:44px;height:44px;background:#F0FDFA;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas fa-clipboard-list" style="color:#14B8A6;font-size:1.1rem;"></i>
                </div>
                <div>
                    <h3 style="margin:0;font-size:0.95rem;font-weight:700;color:var(--text-primary);">Rencana Keselamatan Pribadi</h3>
                    <p style="margin:2px 0 0;font-size:0.78rem;color:var(--text-tertiary);">Buat rencana yang dapat diakses kapan saja saat krisis</p>
                </div>
            </div>
            <p style="font-size:0.84rem;color:var(--text-secondary);line-height:1.55;margin-bottom:14px;">
                Rencana keselamatan membantu Anda menavigasi momen-momen sulit dengan langkah-langkah yang sudah dipersiapkan. Ini bersifat pribadi dan hanya dapat diakses oleh Anda.
            </p>
            <button onclick="SupportHub.openSafetyPlan()" class="btn btn-primary" style="width:100%;padding:12px;border-radius:12px;font-weight:600;justify-content:center;font-size:0.88rem;">
                <i class="fas fa-plus"></i> Buat Rencana Keselamatan
            </button>
        </div>
        `;
    },

    renderProfessionals() {
        return this.professionals.map(p => `
            <a href="${p.url}" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:12px;background:white;padding:14px;border-radius:14px;border:1px solid var(--border-color);margin-bottom:10px;text-decoration:none;transition:box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.06)'" onmouseout="this.style.boxShadow='none'">
                <div style="width:44px;height:44px;background:#EFF6FF;color:#3B82F6;border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1rem;">
                    <i class="fas ${p.icon}"></i>
                </div>
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;color:var(--text-primary);font-size:0.88rem;">${p.type}</div>
                    <div style="font-size:0.78rem;color:var(--text-tertiary);">via ${p.platform}</div>
                    <div style="font-size:0.78rem;color:var(--text-secondary);margin-top:2px;">${p.desc}</div>
                </div>
                <i class="fas fa-external-link-alt" style="color:var(--text-tertiary);font-size:0.75rem;flex-shrink:0;"></i>
            </a>
        `).join('');
    },

    renderSelfCareTools() {
        return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            ${this.selfCareTools.map(tool => `
                <button onclick="Router.navigate('${tool.route}')" style="background:white;border:1px solid var(--border-color);border-radius:14px;padding:14px;text-align:left;cursor:pointer;transition:all 0.2s;" onmouseover="this.style.borderColor='${tool.color}';this.style.boxShadow='0 4px 12px ${tool.color}15'" onmouseout="this.style.borderColor='var(--border-color)';this.style.boxShadow='none'">
                    <div style="width:36px;height:36px;background:${tool.color}12;border-radius:10px;display:flex;align-items:center;justify-content:center;margin-bottom:10px;">
                        <i class="fas ${tool.icon}" style="color:${tool.color};font-size:0.9rem;"></i>
                    </div>
                    <div style="font-weight:700;color:var(--text-primary);font-size:0.82rem;margin-bottom:2px;">${tool.label}</div>
                    <div style="font-size:0.72rem;color:var(--text-tertiary);line-height:1.4;">${tool.desc}</div>
                </button>
            `).join('')}
        </div>`;
    },

    /**
     * Open safety plan modal (create or edit)
     */
    openSafetyPlan() {
        const user = auth?.currentUser;
        if (!user) {
            Utils.showToast('Silakan login terlebih dahulu', 'error');
            return;
        }

        const plan = this.cachedSafetyPlan || {};
        const isEdit = !!this.cachedSafetyPlan;

        const overlay = document.createElement('div');
        overlay.className = 'support-plan-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:2000;padding:16px;animation:fadeIn 0.3s;';

        overlay.innerHTML = `
            <div style="background:white;border-radius:24px;padding:24px;max-width:500px;width:100%;max-height:85vh;overflow-y:auto;box-shadow:0 20px 50px rgba(0,0,0,0.3);animation:slideUp 0.4s cubic-bezier(0.16,1,0.3,1);">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <h3 style="margin:0;color:var(--text-primary);font-size:1.1rem;font-weight:700;">
                        <i class="fas fa-clipboard-list" style="color:#14B8A6;margin-right:6px;"></i>${isEdit ? 'Edit' : 'Buat'} Rencana Keselamatan
                    </h3>
                    <button onclick="this.closest('.support-plan-overlay').remove()" style="width:32px;height:32px;background:var(--bg-secondary);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--text-tertiary);font-size:1.1rem;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <div style="background:#F0FDFA;padding:12px;border-radius:12px;margin-bottom:18px;font-size:0.82rem;color:#115E59;display:flex;align-items:center;gap:8px;">
                    <i class="fas fa-lock" style="flex-shrink:0;"></i>
                    <span>Rencana ini disimpan secara pribadi dan terenkripsi di akun Anda.</span>
                </div>

                <div style="display:flex;flex-direction:column;gap:16px;">
                    <div>
                        <label style="display:flex;align-items:center;gap:6px;font-weight:600;color:var(--text-primary);margin-bottom:6px;font-size:0.88rem;">
                            <i class="fas fa-exclamation-triangle" style="color:#F59E0B;font-size:0.75rem;"></i> Tanda Peringatan Dini
                        </label>
                        <textarea id="spWarningSigns" placeholder="Apa yang biasanya terjadi sebelum krisis?&#10;Contoh: insomnia 3 hari, isolasi diri, kehilangan nafsu makan" style="width:100%;padding:12px;border:1.5px solid var(--border-color);border-radius:12px;font-size:0.88rem;min-height:80px;font-family:inherit;resize:vertical;outline:none;transition:border-color 0.2s;" onfocus="this.style.borderColor='#14B8A6'" onblur="this.style.borderColor='var(--border-color)'">${this.escapeHtml(plan.warningSigns || '')}</textarea>
                    </div>

                    <div>
                        <label style="display:flex;align-items:center;gap:6px;font-weight:600;color:var(--text-primary);margin-bottom:6px;font-size:0.88rem;">
                            <i class="fas fa-heart" style="color:#EC4899;font-size:0.75rem;"></i> Strategi Koping
                        </label>
                        <textarea id="spCopingStrategies" placeholder="Apa yang membantu Anda merasa lebih baik?&#10;Contoh: berjalan kaki, menelepon teman, meditasi" style="width:100%;padding:12px;border:1.5px solid var(--border-color);border-radius:12px;font-size:0.88rem;min-height:80px;font-family:inherit;resize:vertical;outline:none;transition:border-color 0.2s;" onfocus="this.style.borderColor='#14B8A6'" onblur="this.style.borderColor='var(--border-color)'">${this.escapeHtml(plan.copingStrategies || '')}</textarea>
                    </div>

                    <div>
                        <label style="display:flex;align-items:center;gap:6px;font-weight:600;color:var(--text-primary);margin-bottom:6px;font-size:0.88rem;">
                            <i class="fas fa-users" style="color:#3B82F6;font-size:0.75rem;"></i> Orang Terpercaya
                        </label>
                        <textarea id="spSupportPeople" placeholder="Siapa yang bisa Anda hubungi?&#10;Contoh: Ibu - 081234567890, Sahabat Andi - 089876543210" style="width:100%;padding:12px;border:1.5px solid var(--border-color);border-radius:12px;font-size:0.88rem;min-height:80px;font-family:inherit;resize:vertical;outline:none;transition:border-color 0.2s;" onfocus="this.style.borderColor='#14B8A6'" onblur="this.style.borderColor='var(--border-color)'">${this.escapeHtml(plan.supportPeople || '')}</textarea>
                    </div>

                    <div>
                        <label style="display:flex;align-items:center;gap:6px;font-weight:600;color:var(--text-primary);margin-bottom:6px;font-size:0.88rem;">
                            <i class="fas fa-sun" style="color:#F59E0B;font-size:0.75rem;"></i> Alasan Untuk Bertahan
                        </label>
                        <textarea id="spReasonsForLiving" placeholder="Apa yang penting bagi Anda?&#10;Contoh: keluarga, impian karier, hobi yang dicintai" style="width:100%;padding:12px;border:1.5px solid var(--border-color);border-radius:12px;font-size:0.88rem;min-height:80px;font-family:inherit;resize:vertical;outline:none;transition:border-color 0.2s;" onfocus="this.style.borderColor='#14B8A6'" onblur="this.style.borderColor='var(--border-color)'">${this.escapeHtml(plan.reasonsForLiving || '')}</textarea>
                    </div>

                    <button onclick="SupportHub.saveSafetyPlan()" id="spSaveBtn" class="btn btn-primary" style="width:100%;padding:14px;border-radius:12px;font-weight:700;justify-content:center;font-size:0.92rem;background:linear-gradient(135deg,#14B8A6,#0D9488);">
                        <i class="fas fa-save"></i> Simpan Rencana
                    </button>
                </div>
            </div>
            <style>
                @keyframes slideUp { from { opacity:0; transform:translateY(20px) scale(0.95); } to { opacity:1; transform:translateY(0) scale(1); } }
            </style>
        `;

        document.body.appendChild(overlay);

        // Close on backdrop click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    },

    /**
     * Save safety plan to Firestore
     */
    async saveSafetyPlan() {
        const warningSigns = document.getElementById('spWarningSigns')?.value?.trim();
        const copingStrategies = document.getElementById('spCopingStrategies')?.value?.trim();
        const supportPeople = document.getElementById('spSupportPeople')?.value?.trim();
        const reasonsForLiving = document.getElementById('spReasonsForLiving')?.value?.trim();

        if (!warningSigns && !copingStrategies) {
            Utils.showToast('Isi minimal tanda peringatan atau strategi koping', 'error');
            return;
        }

        const user = auth?.currentUser;
        if (!user || typeof db === 'undefined') return;

        const btn = document.getElementById('spSaveBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        }

        try {
            const planData = {
                warningSigns: warningSigns || '',
                copingStrategies: copingStrategies || '',
                supportPeople: supportPeople || '',
                reasonsForLiving: reasonsForLiving || '',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            await FirebaseService.userCol(user.uid, 'safetyPlans').doc('plan').set(planData);

            this.cachedSafetyPlan = planData;
            Utils.showToast('Rencana keselamatan berhasil disimpan', 'success');

            const overlay = document.querySelector('.support-plan-overlay');
            if (overlay) overlay.remove();

            // Re-render to show the saved plan
            this.render();
        } catch (e) {
            console.error('Error saving safety plan:', e);
            Utils.showToast('Gagal menyimpan rencana', 'error');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Simpan Rencana';
            }
        }
    },

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

window.SupportHub = SupportHub;
