/**
 * SYNAWATCH - Kuesioner Penelitian (Ground Truth)
 * PSP-5 + Hunger Scale + SEES-10
 * Saves to Firestore 'researchQuestionnaires'
 */
const ResearchQuestionnaire = {
    currentPage: 0,
    TOTAL_PAGES: 3,

    PSP5_QUESTIONS: [
        { code: 'psp1', text: 'Bagaimana keceriaan anda saat ini?' },
        { code: 'psp2', text: 'Bagaimana kebahagiaan anda saat ini?' },
        { code: 'psp3', text: 'Bagaimana rasa marah/frustasi anda saat ini?' },
        { code: 'psp4', text: 'Bagaimana rasa cemas/stress anda saat ini?' },
        { code: 'psp5', text: 'Bagaimana rasa sedih anda saat ini?' }
    ],

    SEES10_QUESTIONS: [
        { code: 'sees1', text: 'Ketika saya kewalahan/beban tugas banyak, maka saya harus….' },
        { code: 'sees2', text: 'Pada saat sangat stress, saya...' },
        { code: 'sees3', text: 'Ketika saya merasa keadaan diluar kendali, saya...' },
        { code: 'sees4', text: 'Pada saat semua hal berjalan tidak sesuai harapan,...' },
        { code: 'sees5', text: 'Pada saat mempersiapkan tugas berat, saya...' },
        { code: 'sees6', text: 'Ketika saya dibawah tekanan, saya..' },
        { code: 'sees7', text: 'Ketika saya merasa cemas dan stress, saya…' },
        { code: 'sees8', text: 'Ketika merasa tidak memiliki pengaruh/tidak bisa berperan atas hal-hal penting dalam hidupku, saya...' },
        { code: 'sees9', text: 'Ketika saya merasa tidak menguasai keadaan, saya..' },
        { code: 'sees10', text: 'Ketika saya merasa kesulitan telah menumpuk begitu tinggi sehingga saya tidak dapat mengatasinya, saya...' }
    ],

    PAGE_LABELS: ['Data Responden', 'PSP-5 — Kondisi Emosi', 'Hunger Scale & SEES-10'],

    init() {
        this.currentPage = 0;
        this._injectStyles();
        this._buildPSP5();
        this._buildHungerScale();
        this._buildSEES10();
        this._buildStepDots();
        this._updateProgress();
    },

    _injectStyles() {
        if (document.getElementById('rq-styles')) return;
        const style = document.createElement('style');
        style.id = 'rq-styles';
        style.textContent = `
            .rq-container{max-width:640px;margin:0 auto;padding-bottom:40px;}
            .rq-header{background:linear-gradient(135deg,#0ea5e9 0%,#6366f1 100%);border-radius:24px;padding:28px 24px 24px;text-align:center;box-shadow:0 8px 32px rgba(14,165,233,0.3);margin-bottom:24px;position:relative;overflow:hidden;}
            .rq-header::before{content:'';position:absolute;width:200px;height:200px;background:radial-gradient(circle,rgba(255,255,255,0.12),transparent 70%);top:-60px;right:-40px;border-radius:50%;}
            .rq-header-logo{font-size:12px;font-weight:800;letter-spacing:3px;color:rgba(255,255,255,0.7);margin-bottom:6px;position:relative;z-index:1;}
            .rq-header-title{font-size:19px;font-weight:800;color:#fff;line-height:1.3;position:relative;z-index:1;}
            .rq-header-sub{font-size:13px;color:rgba(255,255,255,0.8);margin-top:6px;position:relative;z-index:1;}
            .rq-progress{background:rgba(255,255,255,0.65);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.6);border-radius:16px;padding:16px 20px;margin-bottom:24px;box-shadow:0 8px 32px rgba(0,0,0,0.06);}
            .rq-progress-info{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:13px;}
            .rq-progress-label{font-weight:700;color:#1e293b;}
            .rq-progress-count{color:#64748b;font-weight:600;}
            .rq-progress-track{width:100%;height:6px;background:#e0e7ff;border-radius:99px;overflow:hidden;}
            .rq-progress-fill{height:100%;background:linear-gradient(90deg,#0ea5e9,#6366f1);border-radius:99px;transition:width 0.5s ease;width:0%;}
            .rq-step-dots{display:flex;justify-content:center;gap:10px;margin-top:14px;}
            .rq-step-dot{width:10px;height:10px;border-radius:50%;background:#ddd6fe;transition:all 0.3s;cursor:pointer;}
            .rq-step-dot.active{background:#6366f1;transform:scale(1.3);box-shadow:0 0 0 3px rgba(99,102,241,0.2);}
            .rq-step-dot.done{background:#10b981;}
            .rq-page{background:rgba(255,255,255,0.7);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,0.6);border-radius:24px;padding:28px 22px;box-shadow:0 8px 32px rgba(0,0,0,0.06);animation:rqFade 0.4s ease;display:none;}
            .rq-page.active{display:block;}
            @keyframes rqFade{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
            .rq-badge{display:inline-flex;align-items:center;gap:6px;background:#f0f9ff;color:#0284c7;font-size:11px;font-weight:700;letter-spacing:0.5px;padding:5px 12px;border-radius:99px;margin-bottom:14px;border:1px solid #bae6fd;}
            .rq-page-title{font-size:18px;font-weight:800;color:#1e293b;margin-bottom:4px;}
            .rq-page-desc{font-size:13px;color:#64748b;margin-bottom:24px;line-height:1.5;}
            .rq-form-group{margin-bottom:20px;}
            .rq-form-label{display:block;font-size:13px;font-weight:700;color:#1e293b;margin-bottom:8px;}
            .rq-required{color:#ef4444;margin-left:2px;}
            .rq-input,.rq-textarea{width:100%;padding:12px 16px;background:rgba(255,255,255,0.8);border:1.5px solid #e2e8f0;border-radius:12px;font-family:inherit;font-size:14px;color:#1e293b;transition:all 0.2s;outline:none;}
            .rq-input:focus,.rq-textarea:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,0.1);background:#fff;}
            .rq-textarea{resize:vertical;min-height:70px;}
            .rq-item{background:rgba(255,255,255,0.5);border:1px solid #f1f5f9;border-radius:16px;padding:18px 16px;margin-bottom:14px;transition:all 0.2s;}
            .rq-item:hover{background:rgba(255,255,255,0.8);}
            .rq-item.answered{border-color:rgba(99,102,241,0.2);background:rgba(238,242,255,0.5);}
            .rq-item.has-error{border-color:#ef4444;background:rgba(254,226,226,0.2);}
            .rq-item-num{font-size:11px;font-weight:700;color:#6366f1;margin-bottom:5px;}
            .rq-item-text{font-size:14px;font-weight:600;color:#1e293b;margin-bottom:14px;line-height:1.5;}
            .rq-likert6{display:flex;justify-content:space-between;gap:4px;}
            .rq-likert6-opt{flex:1;text-align:center;}
            .rq-likert6-opt input{display:none;}
            .rq-likert6-opt label{display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;padding:6px 2px;border-radius:10px;transition:all 0.2s;}
            .rq-likert6-opt label:hover{background:#f0f9ff;}
            .rq-l6-circle{width:36px;height:36px;border-radius:50%;border:2px solid #cbd5e1;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#64748b;transition:all 0.25s;}
            .rq-likert6-opt input:checked + label .rq-l6-circle{background:#6366f1;border-color:#6366f1;color:#fff;transform:scale(1.1);box-shadow:0 4px 12px rgba(99,102,241,0.3);}
            .rq-l6-label{font-size:9px;color:#94a3b8;font-weight:500;line-height:1.2;max-width:52px;text-align:center;}
            .rq-likert5{display:flex;justify-content:space-between;gap:4px;}
            .rq-likert5-opt{flex:1;text-align:center;}
            .rq-likert5-opt input{display:none;}
            .rq-likert5-opt label{display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;padding:6px 2px;border-radius:10px;transition:all 0.2s;}
            .rq-likert5-opt label:hover{background:#f0fdf4;}
            .rq-l5-circle{width:36px;height:36px;border-radius:50%;border:2px solid #cbd5e1;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#64748b;transition:all 0.25s;}
            .rq-likert5-opt input:checked + label .rq-l5-circle{background:#10b981;border-color:#10b981;color:#fff;transform:scale(1.1);box-shadow:0 4px 12px rgba(16,185,129,0.3);}
            .rq-l5-label{font-size:9px;color:#94a3b8;font-weight:500;line-height:1.2;max-width:56px;text-align:center;}
            .rq-hunger{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-top:8px;}
            .rq-hunger-opt input{display:none;}
            .rq-hunger-opt label{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;cursor:pointer;border:2px solid #e2e8f0;color:#64748b;transition:all 0.25s;background:rgba(255,255,255,0.7);}
            .rq-hunger-opt label:hover{border-color:#0ea5e9;color:#0ea5e9;background:#f0f9ff;}
            .rq-hunger-opt input:checked + label{background:#0ea5e9;border-color:#0ea5e9;color:#fff;transform:scale(1.1);box-shadow:0 4px 16px rgba(14,165,233,0.4);}
            .rq-error{background:#fee2e2;color:#ef4444;padding:12px 16px;border-radius:12px;font-size:13px;font-weight:600;margin-bottom:16px;display:none;align-items:center;gap:8px;animation:rqShake 0.4s ease;}
            .rq-error.show{display:flex;}
            @keyframes rqShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
            .rq-btn-row{display:flex;gap:12px;margin-top:28px;}
            .rq-btn{flex:1;padding:14px 20px;border:none;border-radius:12px;cursor:pointer;font-family:inherit;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;transition:all 0.25s;}
            .rq-btn-back{background:rgba(255,255,255,0.8);color:#64748b;border:1.5px solid #e2e8f0;}
            .rq-btn-back:hover{background:#fff;color:#1e293b;}
            .rq-btn-next{background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;box-shadow:0 8px 24px rgba(99,102,241,0.25);}
            .rq-btn-next:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(99,102,241,0.35);}
            .rq-btn-submit{background:linear-gradient(135deg,#10b981,#34d399);color:#fff;box-shadow:0 8px 24px rgba(16,185,129,0.25);}
            .rq-btn-submit:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(16,185,129,0.35);}
            .rq-btn-submit:disabled{opacity:0.6;cursor:not-allowed;transform:none!important;}
            .rq-success{display:none;text-align:center;padding:40px 20px;}
            .rq-success.active{display:block;}
            .rq-success-icon{width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#10b981,#34d399);display:flex;align-items:center;justify-content:center;margin:0 auto 24px;animation:rqPop 0.5s cubic-bezier(0.175,0.885,0.32,1.275);box-shadow:0 12px 40px rgba(16,185,129,0.3);}
            .rq-success-icon i{font-size:36px;color:#fff;}
            @keyframes rqPop{0%{transform:scale(0);opacity:0}100%{transform:scale(1);opacity:1}}
            .rq-success-title{font-size:22px;font-weight:800;color:#1e293b;margin-bottom:8px;}
            .rq-success-desc{font-size:14px;color:#64748b;line-height:1.6;margin-bottom:24px;}
            .rq-success-id{display:inline-block;background:#f0fdf4;color:#10b981;padding:8px 16px;border-radius:99px;font-size:12px;font-weight:700;border:1px solid #bbf7d0;margin-bottom:28px;}
            .rq-spinner{width:20px;height:20px;border:2.5px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:rqSpin 0.6s linear infinite;display:none;}
            .rq-btn-submit.loading .rq-spinner{display:block;}
            .rq-btn-submit.loading .rq-btn-text{display:none;}
            @keyframes rqSpin{to{transform:rotate(360deg)}}
            .rq-divider{display:flex;align-items:center;gap:10px;margin:24px 0 18px;font-size:12px;font-weight:700;color:#0284c7;letter-spacing:0.5px;}
            .rq-divider::before,.rq-divider::after{content:'';flex:1;height:1px;background:#bae6fd;}
            @media(max-width:480px){.rq-page{padding:20px 14px;}.rq-l6-circle,.rq-l5-circle{width:30px;height:30px;font-size:12px;}.rq-hunger-opt label{width:38px;height:38px;font-size:13px;}}
        `;
        document.head.appendChild(style);
    },

    _buildPSP5() {
        const el = document.getElementById('rq-psp5');
        if (!el) return;
        const labels6 = ['Sangat\nRendah','Rendah','Sedikit\nRendah','Sedikit\nTinggi','Tinggi','Sangat\nTinggi'];
        let html = '';
        this.PSP5_QUESTIONS.forEach((q, idx) => {
            html += `<div class="rq-item" id="rq-item-${q.code}">
                <div class="rq-item-num">PSP-5 — Pertanyaan ${idx+1}</div>
                <div class="rq-item-text">${q.text}</div>
                <div class="rq-likert6">`;
            for (let i = 1; i <= 6; i++) {
                html += `<div class="rq-likert6-opt">
                    <input type="radio" name="${q.code}" id="${q.code}_${i}" value="${i}">
                    <label for="${q.code}_${i}">
                        <div class="rq-l6-circle">${i}</div>
                        <span class="rq-l6-label">${labels6[i-1].replace('\n','<br>')}</span>
                    </label>
                </div>`;
            }
            html += '</div></div>';
        });
        el.innerHTML = html;
        this.PSP5_QUESTIONS.forEach(q => {
            document.querySelectorAll(`input[name="${q.code}"]`).forEach(inp => {
                inp.addEventListener('change', () => {
                    document.getElementById(`rq-item-${q.code}`)?.classList.add('answered');
                    document.getElementById(`rq-item-${q.code}`)?.classList.remove('has-error');
                });
            });
        });
    },

    _buildHungerScale() {
        const el = document.getElementById('rq-hunger');
        if (!el) return;
        let html = '';
        for (let i = 1; i <= 10; i++) {
            html += `<div class="rq-hunger-opt">
                <input type="radio" name="hunger" id="hunger_${i}" value="${i}">
                <label for="hunger_${i}">${i}</label>
            </div>`;
        }
        el.innerHTML = html;
        document.querySelectorAll('input[name="hunger"]').forEach(inp => {
            inp.addEventListener('change', () => {
                document.getElementById('rq-hunger-item')?.classList.add('answered');
                document.getElementById('rq-hunger-item')?.classList.remove('has-error');
            });
        });
    },

    _buildSEES10() {
        const el = document.getElementById('rq-sees10');
        if (!el) return;
        const labels5 = ['Makan sangat\nlebih sedikit','Makan lebih\nsedikit','Makan\nseperti\nbiasanya','Makan lebih\nbanyak','Makan sangat\nlebih banyak'];
        let html = '';
        this.SEES10_QUESTIONS.forEach((q, idx) => {
            html += `<div class="rq-item" id="rq-item-${q.code}">
                <div class="rq-item-num">SEES-10 — Pertanyaan ${idx+1}</div>
                <div class="rq-item-text">${q.text}</div>
                <div class="rq-likert5">`;
            for (let i = 1; i <= 5; i++) {
                html += `<div class="rq-likert5-opt">
                    <input type="radio" name="${q.code}" id="${q.code}_${i}" value="${i}">
                    <label for="${q.code}_${i}">
                        <div class="rq-l5-circle">${i}</div>
                        <span class="rq-l5-label">${labels5[i-1].replace(/\n/g,'<br>')}</span>
                    </label>
                </div>`;
            }
            html += '</div></div>';
        });
        el.innerHTML = html;
        this.SEES10_QUESTIONS.forEach(q => {
            document.querySelectorAll(`input[name="${q.code}"]`).forEach(inp => {
                inp.addEventListener('change', () => {
                    document.getElementById(`rq-item-${q.code}`)?.classList.add('answered');
                    document.getElementById(`rq-item-${q.code}`)?.classList.remove('has-error');
                });
            });
        });
    },

    _buildStepDots() {
        const el = document.getElementById('rq-step-dots');
        if (!el) return;
        let html = '';
        for (let i = 0; i < this.TOTAL_PAGES; i++) {
            html += `<div class="rq-step-dot${i===0?' active':''}" title="${this.PAGE_LABELS[i]}"></div>`;
        }
        el.innerHTML = html;
    },

    _updateProgress() {
        const pct = ((this.currentPage + 1) / this.TOTAL_PAGES) * 100;
        const fill = document.getElementById('rq-progress-fill');
        const label = document.getElementById('rq-progress-label');
        const count = document.getElementById('rq-progress-count');
        if (fill) fill.style.width = pct + '%';
        if (label) label.textContent = this.PAGE_LABELS[this.currentPage];
        if (count) count.textContent = `${this.currentPage + 1} / ${this.TOTAL_PAGES}`;
        document.querySelectorAll('.rq-step-dot').forEach((dot, idx) => {
            dot.classList.remove('active','done');
            if (idx < this.currentPage) dot.classList.add('done');
            if (idx === this.currentPage) dot.classList.add('active');
        });
    },

    showPage(idx) {
        document.querySelectorAll('.rq-page').forEach(p => p.classList.remove('active'));
        const page = document.getElementById(`rq-page-${idx}`);
        if (page) { page.classList.add('active'); page.style.animation='none'; page.offsetHeight; page.style.animation=''; }
        this.currentPage = idx;
        this._updateProgress();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    nextPage() {
        if (!this._validatePage(this.currentPage)) return;
        if (this.currentPage < this.TOTAL_PAGES - 1) this.showPage(this.currentPage + 1);
    },

    prevPage() {
        if (this.currentPage > 0) this.showPage(this.currentPage - 1);
    },

    _showError(pageIdx, msg) {
        const el = document.getElementById(`rq-error-${pageIdx}`);
        if (el) { el.querySelector('span').textContent = msg; el.classList.add('show'); el.scrollIntoView({ behavior:'smooth', block:'center' }); }
    },

    _clearError(pageIdx) {
        const el = document.getElementById(`rq-error-${pageIdx}`);
        if (el) el.classList.remove('show');
    },

    _validatePage(pageIdx) {
        this._clearError(pageIdx);
        if (pageIdx === 0) {
            const fields = [{ id:'rq-nama', label:'Nama Responden' }, { id:'rq-kode', label:'Kode' }];
            for (const f of fields) {
                const el = document.getElementById(f.id);
                if (!el || !el.value.trim()) {
                    this._showError(0, `Mohon isi field "${f.label}".`);
                    return false;
                }
            }
            return true;
        }
        if (pageIdx === 1) {
            const unanswered = this.PSP5_QUESTIONS.filter(q => !document.querySelector(`input[name="${q.code}"]:checked`));
            unanswered.forEach(q => document.getElementById(`rq-item-${q.code}`)?.classList.add('has-error'));
            if (unanswered.length > 0) {
                this._showError(1, `Masih ada ${unanswered.length} pertanyaan PSP-5 yang belum dijawab.`);
                document.getElementById(`rq-item-${unanswered[0].code}`)?.scrollIntoView({ behavior:'smooth', block:'center' });
                return false;
            }
            return true;
        }
        if (pageIdx === 2) {
            if (!document.querySelector('input[name="hunger"]:checked')) {
                document.getElementById('rq-hunger-item')?.classList.add('has-error');
                this._showError(2, 'Mohon pilih skala rasa lapar Anda.');
                document.getElementById('rq-hunger-item')?.scrollIntoView({ behavior:'smooth', block:'center' });
                return false;
            }
            const unanswered = this.SEES10_QUESTIONS.filter(q => !document.querySelector(`input[name="${q.code}"]:checked`));
            unanswered.forEach(q => document.getElementById(`rq-item-${q.code}`)?.classList.add('has-error'));
            if (unanswered.length > 0) {
                this._showError(2, `Masih ada ${unanswered.length} pertanyaan SEES-10 yang belum dijawab.`);
                document.getElementById(`rq-item-${unanswered[0].code}`)?.scrollIntoView({ behavior:'smooth', block:'center' });
                return false;
            }
            return true;
        }
        return true;
    },

    _getRadio(name) {
        const el = document.querySelector(`input[name="${name}"]:checked`);
        return el ? parseInt(el.value) : 0;
    },

    async submit() {
        if (!this._validatePage(2)) return;
        const btn = document.getElementById('rq-submit-btn');
        if (btn) { btn.classList.add('loading'); btn.disabled = true; }
        try {
            const psp5 = {};
            this.PSP5_QUESTIONS.forEach(q => { psp5[q.code] = this._getRadio(q.code); });
            const sees10 = {};
            this.SEES10_QUESTIONS.forEach(q => { sees10[q.code] = this._getRadio(q.code); });
            const hunger = this._getRadio('hunger');
            const user = firebase.auth().currentUser;
            const data = {
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                userId: user ? user.uid : null,
                type: 'ground-truth',
                responden: {
                    nama: document.getElementById('rq-nama').value.trim(),
                    kode: document.getElementById('rq-kode').value.trim(),
                    riwayatPenyakit: document.getElementById('rq-penyakit').value.trim(),
                    riwayatObat: document.getElementById('rq-obat').value.trim(),
                    riwayatAlergi: document.getElementById('rq-alergi').value.trim(),
                },
                psp5,
                psp5Avg: +(Object.values(psp5).reduce((a,b)=>a+b,0)/5).toFixed(2),
                hunger,
                sees10,
                sees10Avg: +(Object.values(sees10).reduce((a,b)=>a+b,0)/10).toFixed(2),
            };
            const docRef = await firebase.firestore().collection('researchQuestionnaires').add(data);
            document.querySelectorAll('.rq-page').forEach(p => p.classList.remove('active'));
            document.getElementById('rq-progress-section').style.display = 'none';
            const idEl = document.getElementById('rq-success-id');
            if (idEl) idEl.textContent = `ID Rekam: ${docRef.id}`;
            document.getElementById('rq-success').classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            console.error('Research questionnaire submit error:', err);
            this._showError(2, 'Gagal menyimpan data. Periksa koneksi internet dan coba lagi.');
            if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
        }
    },

    reset() {
        document.querySelectorAll('#view-container input[type="radio"]').forEach(r => { r.checked = false; });
        document.querySelectorAll('#view-container .rq-input,#view-container .rq-textarea').forEach(el => { el.value = ''; });
        document.querySelectorAll('.rq-item').forEach(el => { el.classList.remove('answered','has-error'); });
        document.querySelectorAll('.rq-error').forEach(el => { el.classList.remove('show'); });
        const btn = document.getElementById('rq-submit-btn');
        if (btn) { btn.classList.remove('loading'); btn.disabled = false; }
        document.getElementById('rq-progress-section').style.display = '';
        document.getElementById('rq-success').classList.remove('active');
        this.currentPage = 0;
        this.showPage(0);
    }
};
window.ResearchQuestionnaire = ResearchQuestionnaire;
