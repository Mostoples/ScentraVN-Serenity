/**
 * SYNAWATCH - Journal Module v2.0
 * [GAP 4] Sensor-Contextualized Journaling
 * Based on: Gao et al. 2024 (MindScape), Lattie et al. 2021, Eisenbarth et al. 2025
 *
 * Auto-tags journal entries with physiological context (stress, HR, GSR, activity, sleep quality)
 * at the time of writing, enabling pattern discovery in mood-body relationships.
 */

const Journal = {
    init() {
        this.loadRecent();
        this.renderJournalUI();
    },

    /**
     * Get current sensor context snapshot
     */
    getSensorSnapshot() {
        const state = (typeof App !== 'undefined' && App.getInterventionState) ? App.getInterventionState() : {};
        return {
            stress: state.stress || 0,
            gsr: state.gsr || 0,
            hr: state.hr || 0,
            spo2: state.spo2 || 0,
            hasSensor: (state.hr > 0 || state.stress > 0),
            timestamp: new Date().toISOString()
        };
    },

    /**
     * Determine emotional context label from sensor data
     */
    getEmotionLabel(snapshot) {
        if (!snapshot.hasSensor) return { label: 'Manual', icon: 'fa-pen', color: '#9ca3af' };

        if (snapshot.stress > 70 || snapshot.gsr > 75) {
            return { label: 'Stres Tinggi', icon: 'fa-bolt', color: '#ef4444' };
        } else if (snapshot.stress > 40 || snapshot.gsr > 45) {
            return { label: 'Moderat', icon: 'fa-cloud-sun', color: '#f59e0b' };
        } else if (snapshot.hr > 0 && snapshot.hr < 65) {
            return { label: 'Rileks', icon: 'fa-spa', color: '#10b981' };
        } else {
            return { label: 'Normal', icon: 'fa-check-circle', color: '#3b82f6' };
        }
    },

    /**
     * Render enhanced journal UI with sensor context
     */
    renderJournalUI() {
        const container = document.getElementById('journalContent');
        if (!container) return;

        const snapshot = this.getSensorSnapshot();
        const emotion = this.getEmotionLabel(snapshot);

        const sensorBadge = snapshot.hasSensor
            ? `<div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:${emotion.color}10;border:1px solid ${emotion.color}30;border-radius:10px;">
                    <i class="fas ${emotion.icon}" style="color:${emotion.color};"></i>
                    <span style="font-size:0.8rem;font-weight:600;color:${emotion.color};">${emotion.label}</span>
                    <span style="font-size:0.7rem;color:var(--text-tertiary);">| HR ${snapshot.hr} | Stres ${snapshot.stress}% | GSR ${snapshot.gsr}%</span>
               </div>`
            : `<div style="padding:8px 12px;background:#f8f9fa;border-radius:10px;font-size:0.75rem;color:var(--text-tertiary);text-align:center;">
                    <i class="fas fa-unlink"></i> Sensor tidak terhubung — jurnal akan disimpan tanpa data fisiologis
               </div>`;

        container.innerHTML = `
            <div style="margin-bottom:16px;">
                <h2 style="font-size:1.25rem;font-weight:700;color:var(--text-primary);margin-bottom:4px;"><i class="fas fa-book-open" style="color:#f97316;"></i> Refleksi Harian</h2>
                <p style="font-size:0.85rem;color:var(--text-tertiary);">Tulis perasaan Anda. Sensor otomatis menandai konteks fisiologis.</p>
            </div>

            ${sensorBadge}

            <div class="card" style="margin-top:16px;padding:16px;border-radius:16px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                    <label style="font-weight:600;color:var(--text-primary);font-size:0.9rem;">Jurnal Hari Ini</label>
                    <span style="font-size:0.75rem;color:var(--text-tertiary);">${new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <textarea id="journalInput" placeholder="Apa yang Anda rasakan hari ini? Bagaimana hari Anda berjalan?..." style="width:100%;min-height:120px;padding:12px;border:1px solid var(--border-color);border-radius:12px;font-family:inherit;font-size:0.95rem;resize:vertical;outline:none;transition:border-color 0.2s;background:var(--bg-secondary);" onfocus="this.style.borderColor='var(--primary-500)'" onblur="this.style.borderColor='var(--border-color)'"></textarea>

                <div style="display:flex;gap:8px;margin-top:12px;">
                    <select id="journalMood" style="flex:1;padding:10px;border:1px solid var(--border-color);border-radius:10px;font-size:0.85rem;background:var(--bg-secondary);color:var(--text-primary);">
                        <option value="">Pilih mood...</option>
                        <option value="sangat_baik">😄 Sangat Baik</option>
                        <option value="baik">😊 Baik</option>
                        <option value="netral">😐 Netral</option>
                        <option value="buruk">😟 Kurang Baik</option>
                        <option value="sangat_buruk">😢 Sangat Buruk</option>
                    </select>
                    <button onclick="Journal.save()" class="btn btn-primary" style="padding:10px 20px;border-radius:10px;">
                        <i class="fas fa-save"></i> Simpan
                    </button>
                </div>
            </div>

            <div style="margin-top:20px;">
                <h4 style="margin-bottom:12px;color:var(--text-primary);font-size:0.95rem;"><i class="fas fa-history" style="color:var(--primary-400);"></i> Jurnal Terakhir</h4>
                <div id="journalList">
                    <div style="text-align:center;padding:20px;">
                        <div class="loading-spinner" style="margin:0 auto;"></div>
                    </div>
                </div>
            </div>

            <div style="background:#f8f9ff;padding:12px;border-radius:12px;margin-top:16px;">
                <p style="font-size:0.75rem;color:var(--text-tertiary);text-align:center;margin:0;">
                    <i class="fas fa-flask"></i> Berbasis: MindScape AI Journaling (Gao et al., 2024),
                    Expressive Writing & Wellbeing (Eisenbarth et al., 2025)
                </p>
            </div>
        `;
    },

    async loadRecent() {
        const user = auth?.currentUser;
        if (!user || typeof db === 'undefined') return;
        try {
            const snps = await db.collection('journals')
                .where('userId', '==', user.uid)
                .orderBy('timestamp', 'desc')
                .limit(5)
                .get();

            const list = document.getElementById('journalList');
            if (!list) return;

            if (snps.empty) {
                list.innerHTML = `<p style="color:var(--text-tertiary);text-align:center;padding:20px;">Belum ada jurnal. Mulai menulis untuk melacak pola emosi Anda.</p>`;
                return;
            }

            let html = '';
            snps.forEach(doc => {
                const d = doc.data();
                const date = d.date ? new Date(d.date) : new Date();
                const sensor = d.sensorContext || {};
                const emotion = this.getEmotionLabel(sensor);

                // Sensor context tags
                const sensorTags = sensor.hasSensor ? `
                    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
                        <span style="background:${emotion.color}10;color:${emotion.color};padding:2px 8px;border-radius:6px;font-size:0.7rem;font-weight:600;">
                            <i class="fas ${emotion.icon}"></i> ${emotion.label}
                        </span>
                        <span style="background:#f3f4f6;color:#6b7280;padding:2px 8px;border-radius:6px;font-size:0.7rem;">HR ${sensor.hr}</span>
                        <span style="background:#f3f4f6;color:#6b7280;padding:2px 8px;border-radius:6px;font-size:0.7rem;">Stres ${sensor.stress}%</span>
                        <span style="background:#f3f4f6;color:#6b7280;padding:2px 8px;border-radius:6px;font-size:0.7rem;">GSR ${sensor.gsr}%</span>
                    </div>
                ` : '';

                const moodBadge = d.mood ? `<span style="font-size:0.8rem;">${this.getMoodEmoji(d.mood)}</span>` : '';

                html += `
                    <div style="background:white;padding:16px;border-radius:14px;margin-bottom:10px;border:1px solid var(--border-color);box-shadow:0 1px 4px rgba(0,0,0,0.03);">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                            <span style="font-size:0.8rem;color:var(--text-tertiary);">
                                ${date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })} — ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            ${moodBadge}
                        </div>
                        <div style="color:var(--text-primary);font-size:0.9rem;line-height:1.6;">${d.text}</div>
                        ${sensorTags}
                    </div>
                `;
            });
            list.innerHTML = html;
        } catch (e) {
            console.error('Journal load error:', e);
        }
    },

    getMoodEmoji(mood) {
        const map = { sangat_baik: '😄', baik: '😊', netral: '😐', buruk: '😟', sangat_buruk: '😢' };
        return map[mood] || '';
    },

    async save() {
        const text = document.getElementById('journalInput')?.value;
        if (!text || text.trim() === '') return Utils.showToast("Jurnal kosong!", "error");

        const mood = document.getElementById('journalMood')?.value || null;
        const sensorContext = this.getSensorSnapshot();

        const user = auth?.currentUser;
        if (user && typeof db !== 'undefined') {
            try {
                await db.collection('journals').add({
                    userId: user.uid,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                    date: new Date().toISOString(),
                    text: text.trim(),
                    mood: mood,
                    sensorContext: sensorContext // [GAP 4] Auto-tagged sensor state
                });
                Utils.showToast("Jurnal disimpan dengan konteks sensor!", "success");
                document.getElementById('journalInput').value = '';
                if (document.getElementById('journalMood')) document.getElementById('journalMood').value = '';
                this.loadRecent();
            } catch (e) {
                Utils.showToast("Gagal menyimpan jurnal", "error");
                console.error(e);
            }
        }
    }
};

window.Journal = Journal;
