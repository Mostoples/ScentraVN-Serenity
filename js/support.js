/**
 * SYNAWATCH - Support Hub v2.0
 * [GAP 7] Bio-Signal Triggered Safety Planning
 * Based on: Melvin et al. 2024, Nuij et al. 2020 (SafePlan), McManama et al. 2023, Berrouiguet et al. 2023
 *
 * Auto-activates crisis protocols when sensor data + PHQ-9 score indicate danger.
 * Includes emergency hotlines, professional referral system, and personalized safety plans.
 */

const SupportHub = {
    // Indonesian Crisis Hotlines
    hotlines: [
        {
            name: 'Layanan Sejiwa',
            number: '119 ext 8',
            phone: 'tel:119',
            operator: 'Kemenkes RI',
            hours: '24/7',
            description: 'Konseling krisis kesehatan mental nasional',
            icon: 'fa-phone-alt'
        },
        {
            name: 'Into The Light Indonesia',
            number: '+62 821 1500 4949',
            phone: 'tel:+6282115004949',
            operator: 'NGO',
            hours: '24/7',
            description: 'Dukungan untuk krisis mental dan pencegahan bunuh diri',
            icon: 'fa-heart-pulse'
        },
        {
            name: 'LSM Jangan Bunuh Diri',
            number: '+62 856 9191 9191',
            phone: 'tel:+6285691919191',
            operator: 'NGO',
            hours: '24/7',
            description: 'Pendampingan krisis dan pencegahan bunuh diri',
            icon: 'fa-hand-holding-heart'
        },
        {
            name: 'Yayasan Pulih',
            number: '+62 812 1366 9000',
            phone: 'tel:+6281213669000',
            operator: 'NGO',
            hours: 'Jam Kerja',
            description: 'Pemulihan trauma dan krisis kesehatan mental',
            icon: 'fa-shield'
        }
    ],

    // Professional referral system
    professionals: [
        { type: 'Psikolog', icon: 'fa-user-tie', platform: 'Halodoc', link: '#' },
        { type: 'Psikiater', icon: 'fa-stethoscope', platform: 'Alodokter', link: '#' },
        { type: 'Konselor', icon: 'fa-comments', platform: 'Telepsikologi', link: '#' }
    ],

    initSupportHub() {
        console.log("Support Hub v2.0 Initialized (Bio-Signal Triggered)");
        const state = App.getInterventionState ? App.getInterventionState() : {};
        this.renderSupportUI(state);
    },

    /**
     * Render main support hub UI
     */
    renderSupportUI(state) {
        let container = document.getElementById('supportContent');
        if (!container) return;

        // [GAP 7] Risk assessment banner based on PHQ-9 + sensor data
        let riskBanner = '';
        let riskLevel = this.assessRiskLevel(state);

        if (riskLevel.level >= 2) {
            riskBanner = `
                <div style="background: linear-gradient(135deg, ${riskLevel.color}20, ${riskLevel.color}05); padding: 18px; border-radius: 16px; border-left: 4px solid ${riskLevel.color}; margin-bottom: 20px;">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        <i class="fas ${riskLevel.icon}" style="color: ${riskLevel.color}; font-size: 1.3rem;"></i>
                        <div>
                            <h4 style="margin: 0; color: ${riskLevel.color}; font-weight: 700;">${riskLevel.label}</h4>
                            <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: var(--text-secondary);">${riskLevel.message}</p>
                        </div>
                    </div>
                </div>
            `;
        }

        // Emergency banner if immediate help needed
        let emergencySection = riskLevel.level >= 3 ? `
            <div style="background: linear-gradient(135deg, #dc2626, #991b1b); padding: 18px; border-radius: 16px; margin-bottom: 20px; color: white; box-shadow: 0 8px 24px rgba(220, 38, 38, 0.2);">
                <h3 style="margin: 0 0 12px 0; font-size: 1.1rem;"><i class="fas fa-shield-heart"></i> Hubungi Segera</h3>
                <p style="margin-bottom: 14px; font-size: 0.9rem; opacity: 0.95;">Sistem mendeteksi pola yang memerlukan intervensi profesional segera. Anda tidak sendirian.</p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                    <a href="tel:119" style="display: block; padding: 12px; background: white; color: #dc2626; border-radius: 10px; text-align: center; text-decoration: none; font-weight: 700; border: none; cursor: pointer;">
                        <i class="fas fa-phone-alt"></i> Sejiwa 119
                    </a>
                    <button onclick="SupportHub.openEmergencyPlan()" style="padding: 12px; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">
                        <i class="fas fa-clipboard-list"></i> Rencana Keselamatan
                    </button>
                </div>
            </div>
        ` : '';

        // Hotlines section
        let hotlinesHTML = this.hotlines.map(h => `
            <div style="background: white; padding: 16px; border-radius: 14px; border: 1px solid var(--border-color); margin-bottom: 12px; display: flex; align-items: center; gap: 12px;">
                <div style="width: 48px; height: 48px; background: #8B5CF6; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fas ${h.icon}"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 700; color: var(--text-primary); font-size: 0.95rem;">${h.name}</div>
                    <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-bottom: 4px;">${h.operator} • ${h.hours}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${h.description}</div>
                </div>
                <a href="${h.phone}" class="btn btn-primary btn-sm" style="flex-shrink: 0; border-radius: 10px;">
                    <i class="fas fa-phone"></i> Hubungi
                </a>
            </div>
        `).join('');

        // Professional referral
        let professionalsHTML = this.professionals.map(p => `
            <div style="background: white; padding: 16px; border-radius: 14px; border: 1px solid var(--border-color); display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                <div style="width: 40px; height: 40px; background: #3b82f6; color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fas ${p.icon}"></i>
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: var(--text-primary); font-size: 0.9rem;">${p.type}</div>
                    <div style="font-size: 0.8rem; color: var(--text-tertiary);">via ${p.platform}</div>
                </div>
                <button class="btn btn-outline btn-sm" style="flex-shrink: 0; border-radius: 10px;">Cari</button>
            </div>
        `).join('');

        // Resources section
        const resourcesHTML = `
            <div style="background: #f8f9ff; padding: 14px; border-radius: 12px; border-left: 3px solid var(--primary-500);">
                <h4 style="margin: 0 0 8px 0; color: var(--primary-600); font-size: 0.9rem;"><i class="fas fa-book-open"></i> Sumber Daya Mandiri</h4>
                <ul style="margin: 0; padding-left: 20px; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.8;">
                    <li>Teknik Pernapasan 4-7-8 untuk mengurangi kecemasan akut</li>
                    <li>Jurnal Pemikiran untuk mengidentifikasi pola negatif</li>
                    <li>Latihan Mindfulness 5-10 menit harian</li>
                    <li><a href="javascript:Router.navigate('academy')" style="color:var(--primary-500);text-decoration:underline;">Akses Syna Academy</a> untuk pembelajaran berkelanjutan</li>
                </ul>
            </div>
        `;

        container.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h2 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0;">
                    <i class="fas fa-hand-holding-heart" style="color: #ef4444;"></i> Support Hub
                </h2>
            </div>

            ${riskBanner}
            ${emergencySection}

            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 12px;">
                <i class="fas fa-phone-alt" style="color: #ef4444;"></i> Hotline Darurat 24/7
            </h3>
            ${hotlinesHTML}

            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 20px 0 12px 0;">
                <i class="fas fa-user-md" style="color: #3b82f6;"></i> Konsultasi Profesional
            </h3>
            ${professionalsHTML}

            ${resourcesHTML}

            <div style="background: #f8f9ff; padding: 12px; border-radius: 12px; margin-top: 16px;">
                <p style="font-size: 0.75rem; color: var(--text-tertiary); text-align: center; margin: 0;">
                    <i class="fas fa-flask"></i> Safety Planning berbasis: Digital Safety Plans (Melvin et al., 2024),
                    SafePlan (Nuij et al., 2020)
                </p>
            </div>
        `;
    },

    /**
     * [GAP 7] Assess risk level based on PHQ-9 + sensor data
     * Returns: { level: 0-3, label, message, color, icon }
     */
    assessRiskLevel(state) {
        const phq9 = state.phq9Score || 0;
        const stress = state.stress || 0;
        const gsr = state.gsr || 0;
        const ucla = state.uclaScore || 0;

        // Extreme risk: high PHQ-9 + sustained extreme sensor readings
        if (phq9 >= 20 && stress > 80 && gsr > 80) {
            return {
                level: 3,
                label: '🔴 RISIKO TINGGI - Hubungi Segera',
                message: 'Skor mental sangat tinggi dan sensor menunjukkan aktivasi fisiologis ekstrem. Hubungi layanan krisis segera atau kunjungi rumah sakit terdekat.',
                color: '#dc2626',
                icon: 'fa-exclamation-triangle'
            };
        }

        // High risk: high PHQ-9 + moderate sensor elevation
        if (phq9 >= 15 && (stress > 65 || gsr > 70 || ucla > 60)) {
            return {
                level: 2,
                label: '🟠 RISIKO SEDANG - Pertimbangkan Profesional',
                message: 'Skor depresi Anda menunjukkan beban signifikan. Konsultasi dengan tenaga profesional kesehatan mental sangat direkomendasikan.',
                color: '#f59e0b',
                icon: 'fa-exclamation-circle'
            };
        }

        // Moderate risk: moderate PHQ-9
        if (phq9 >= 10) {
            return {
                level: 1,
                label: '🟡 PERLU PERHATIAN - Layanan Mendukung Tersedia',
                message: 'Anda menunjukkan gejala yang dapat dikelola dengan dukungan profesional dan strategi self-care.',
                color: '#f59e0b',
                icon: 'fa-info-circle'
            };
        }

        // Low risk
        return {
            level: 0,
            label: '🟢 BAIK - Pantau Kesehatan Anda',
            message: 'Kondisi mental Anda terpantau baik. Lanjutkan praktik self-care dan hubungi kami jika ada perubahan.',
            color: '#10b981',
            icon: 'fa-check-circle'
        };
    },

    /**
     * [GAP 7] Open emergency safety plan creation
     */
    openEmergencyPlan() {
        const user = auth?.currentUser;
        if (!user) {
            Utils.showToast("Silakan login terlebih dahulu", "error");
            return;
        }

        const planModal = document.createElement('div');
        planModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            padding: 16px;
        `;

        planModal.innerHTML = `
            <div style="background: white; border-radius: 20px; padding: 24px; max-width: 500px; width: 100%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="margin: 0; color: var(--text-primary); font-size: 1.15rem;">Rencana Keselamatan Pribadi</h3>
                    <button onclick="this.closest('[style*=\'position: fixed\']').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--text-tertiary);">✕</button>
                </div>

                <div style="background: #fef2f2; padding: 12px; border-radius: 10px; margin-bottom: 16px; font-size: 0.85rem; color: #7f1d1d;">
                    <i class="fas fa-info-circle" style="margin-right: 6px;"></i>
                    Rencana ini akan disimpan secara pribadi di akun Anda.
                </div>

                <div style="display: flex; flex-direction: column; gap: 16px;">
                    <div>
                        <label style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">Tanda Peringatan Dini (Warning Signs)</label>
                        <textarea placeholder="Apa yang biasanya terjadi sebelum krisis? (misal: insomnia 3 hari berturut-turut, isolasi diri)" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 10px; font-size: 0.9rem; min-height: 80px; font-family: inherit;"></textarea>
                    </div>

                    <div>
                        <label style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">Aktivitas Koping (Coping Strategies)</label>
                        <textarea placeholder="Apa yang membantu Anda merasa lebih baik? (misal: berjalan kaki, menelepon teman, Mindful Moment)" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 10px; font-size: 0.9rem; min-height: 80px; font-family: inherit;"></textarea>
                    </div>

                    <div>
                        <label style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">Orang Terpercaya</label>
                        <textarea placeholder="Siapa yang bisa Anda hubungi? (nama, hubungan, nomor telepon)" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 10px; font-size: 0.9rem; min-height: 80px; font-family: inherit;"></textarea>
                    </div>

                    <div>
                        <label style="display: block; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">Alasan Untuk Bertahan (Reasons for Living)</label>
                        <textarea placeholder="Apa yang penting bagi Anda? (keluarga, impian, nilai-nilai)" style="width: 100%; padding: 10px; border: 1px solid var(--border-color); border-radius: 10px; font-size: 0.9rem; min-height: 80px; font-family: inherit;"></textarea>
                    </div>

                    <button onclick="SupportHub.saveSafetyPlan(event)" class="btn btn-primary" style="width: 100%; padding: 14px; border-radius: 10px; font-weight: 600;">
                        <i class="fas fa-save"></i> Simpan Rencana
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(planModal);
    },

    /**
     * Save safety plan to Firestore
     */
    async saveSafetyPlan(event) {
        const modal = event.target.closest('[style*="position: fixed"]');
        const textareas = modal.querySelectorAll('textarea');

        const plan = {
            warningSigns: textareas[0].value,
            copingStrategies: textareas[1].value,
            supportPeople: textareas[2].value,
            reasonsForLiving: textareas[3].value
        };

        if (!plan.warningSigns || !plan.copingStrategies) {
            Utils.showToast("Isi minimal warning signs dan coping strategies", "error");
            return;
        }

        const user = auth?.currentUser;
        if (!user || typeof db === 'undefined') return;

        try {
            await FirebaseService.userCol(user.uid, 'safetyPlans').doc('plan').set({
                ...plan,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            Utils.showToast("Rencana keselamatan disimpan", "success");
            modal.remove();
        } catch (e) {
            Utils.showToast("Gagal menyimpan rencana", "error");
            console.error(e);
        }
    }
};

window.SupportHub = SupportHub;
