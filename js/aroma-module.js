/**
 * ScentraVN Serenity — Aromatherapy Advisor Controller
 *
 * Wires the PSP-5 / Hunger / SEES-10 survey UI + live EEG/PPG to
 * AromaRecommender, renders the recommended kemiri-based blend, and
 * persists results to Firestore.
 */

(() => {
  'use strict';

  const AromaModule = {
    answers: { psp: {}, sees: {}, hunger: 5 },
    _bioTimer: null,

    init() {
      this.answers = { psp: {}, sees: {}, hunger: 5 };
      this._wireOptions();
      this._wireHunger();
      this._wireSeesToggle();
      this._wireRecommend();
      this._renderLibrary();
      this._startBioWatch();
    },

    /* ── Option buttons (PSP-5 + SEES-10) ─────────────────────────── */
    _wireOptions() {
      document.querySelectorAll('.aroma-opt').forEach(btn => {
        btn.addEventListener('click', () => {
          const group = btn.dataset.group;
          const val = +btn.dataset.val;
          /* visual active toggle within group */
          document.querySelectorAll(`.aroma-opt[data-group="${group}"]`).forEach(b => {
            b.style.background = 'rgba(255,255,255,0.6)';
            b.style.color = '#6d28d9';
            b.classList.remove('active');
          });
          btn.style.background = 'linear-gradient(135deg,#8b5cf6,#7c3aed)';
          btn.style.color = '#fff';
          btn.classList.add('active');

          if (group.startsWith('psp_')) {
            this.answers.psp[group.slice(4)] = val;
          } else if (group.startsWith('sees_')) {
            this.answers.sees[group.slice(5)] = val;
          }
        });
      });
    },

    _wireHunger() {
      const slider = document.getElementById('aromaHunger');
      const label  = document.getElementById('aromaHungerVal');
      if (!slider) return;
      slider.addEventListener('input', () => {
        this.answers.hunger = +slider.value;
        if (label) label.textContent = slider.value;
      });
    },

    _wireSeesToggle() {
      const btn = document.getElementById('aromaToggleSees');
      const panel = document.getElementById('aromaSeesPanel');
      if (!btn || !panel) return;
      btn.addEventListener('click', () => {
        const show = panel.style.display === 'none';
        panel.style.display = show ? 'block' : 'none';
        btn.textContent = show ? 'Sembunyikan' : 'Tampilkan';
      });
    },

    /* ── Live biosignal indicator ─────────────────────────────────── */
    _startBioWatch() {
      const update = () => {
        const el = document.getElementById('aromaBioState');
        if (!el) return;
        const eeg = (typeof MuseEEG !== 'undefined') ? MuseEEG.getMetrics() : {};
        const state = eeg.mentalState?.label;
        const stressDom = document.getElementById('stressValue');
        const stress = stressDom ? parseInt(stressDom.textContent) : null;
        const parts = [];
        if (state && typeof EEGFeatures !== 'undefined') parts.push('EEG: ' + EEGFeatures.mentalStateLabel(state));
        if (isFinite(stress)) parts.push('Stres: ' + stress + '%');
        el.textContent = parts.length ? ' — ' + parts.join(' · ') : ' — menunggu EEG/PPG';
      };
      update();
      this._bioTimer = setInterval(update, 3000);
    },

    /* ── Recommend ────────────────────────────────────────────────── */
    _wireRecommend() {
      const btn = document.getElementById('aromaRecommendBtn');
      if (!btn) return;
      btn.addEventListener('click', () => this._recommend());
    },

    _collectSees() {
      const arr = [];
      for (let i = 0; i < 10; i++) {
        if (this.answers.sees[i] != null) arr.push(this.answers.sees[i]);
      }
      return arr.length ? arr : null;
    },

    _recommend() {
      if (typeof AromaRecommender === 'undefined') return;

      const eeg = (typeof MuseEEG !== 'undefined') ? MuseEEG.getMetrics() : {};
      const readDom = (id) => {
        const el = document.getElementById(id);
        if (!el) return null;
        const n = parseFloat(el.textContent);
        return isFinite(n) ? n : null;
      };

      const rec = AromaRecommender.recommend({
        psp5:  Object.keys(this.answers.psp).length ? this.answers.psp : null,
        hunger: this.answers.hunger,
        sees10: this._collectSees(),
        eeg: { mentalState: eeg.mentalState, cognitiveLoad: eeg.cognitiveLoad, emotion: eeg.emotion },
        ppg: { stressScore: readDom('stressValue') },
        gsr: readDom('gsrValue')
      });

      if (!rec) return;
      this._renderResult(rec);
      this._saveResult(rec);
    },

    _renderResult(rec) {
      const el = document.getElementById('aromaResult');
      if (!el) return;

      const c = rec.carrier;
      const dims = (typeof AromaDB !== 'undefined') ? AromaDB.DIMENSIONS : Object.keys(rec.need);
      const dimLabel = {
        calm:'Tenang', uplift:'Mood', ground:'Grounding', energize:'Energi',
        focus:'Fokus', sleep:'Tidur', appetite:'Nafsu makan'
      };

      const needBars = dims.map(k => `
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="width:84px; font-size:0.72rem; color:#6d28d9; font-weight:600;">${dimLabel[k] || k}</span>
          <div style="flex:1; height:8px; background:rgba(124,58,237,0.08); border-radius:99px; overflow:hidden;">
            <div style="height:100%; width:${Math.round((rec.need[k]||0)*100)}%; background:linear-gradient(90deg,#8b5cf6,#c084fc);"></div>
          </div>
        </div>`).join('');

      const blendHtml = rec.blend.length ? rec.blend.map((b, i) => {
        const oil = (typeof AromaDB !== 'undefined') ? AromaDB.get(b.id) : null;
        return `
          <div style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(124,58,237,0.06); border-radius:14px;">
            <div style="width:40px; height:40px; border-radius:12px; background:linear-gradient(135deg,#8b5cf6,#7c3aed); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:800;">${b.drops}</div>
            <div style="flex:1;">
              <div style="font-size:0.9rem; font-weight:700; color:#4c1d95;">${b.name} <span style="font-size:0.7rem; color:#94a3b8; font-weight:500;">${b.drops} tetes</span></div>
              <div style="font-size:0.72rem; color:#64748b;">${oil ? oil.aromaProfile : ''}</div>
            </div>
            <span style="font-size:0.7rem; color:#7c3aed; font-weight:700;">${Math.round(b.score*100)}%</span>
          </div>`;
      }).join('') : '<div style="color:#94a3b8; font-size:0.8rem;">Tidak ada minyak esensial yang menonjol — gunakan kemiri sebagai pijat relaksasi dasar.</div>';

      el.innerHTML = `
        <div class="glass-card" style="padding:20px;">
          <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
            <div style="width:48px; height:48px; border-radius:14px; background:linear-gradient(135deg,#8b5cf6,#7c3aed); display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.2rem;"><i class="fas fa-spray-can-sparkles"></i></div>
            <div>
              <div style="font-size:1.05rem; font-weight:800; color:#4c1d95;">Rekomendasi Blend</div>
              <div style="font-size:0.78rem; color:#7c3aed;">Kebutuhan utama: ${rec.dominantLabel}</div>
            </div>
          </div>

          <div style="background:linear-gradient(135deg,#7c3aed,#a855f7); border-radius:16px; padding:16px; margin-bottom:16px; color:#fff;">
            <div style="font-size:0.72rem; opacity:0.85; text-transform:uppercase; letter-spacing:0.5px;">Base / Carrier</div>
            <div style="font-size:1.1rem; font-weight:800; margin-top:2px;">${c.name}</div>
            <div style="font-size:0.74rem; opacity:0.9; margin-top:4px;">${c.scientificName} · ${c.origin}</div>
            <div style="font-size:0.74rem; opacity:0.92; margin-top:8px; line-height:1.5;">${c.usage}</div>
          </div>

          <h5 style="font-size:0.85rem; color:#4c1d95; margin-bottom:10px;">Minyak Esensial (tambahkan ke base)</h5>
          <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:18px;">${blendHtml}</div>

          <h5 style="font-size:0.85rem; color:#4c1d95; margin-bottom:10px;">Profil Kebutuhan</h5>
          <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:14px;">${needBars}</div>

          <div style="background:rgba(245,158,11,0.08); border-radius:12px; padding:12px; font-size:0.72rem; color:#92400e; line-height:1.5;">
            <i class="fas fa-circle-info"></i> ${rec.summary} Patch-test dulu, hindari mata, jangan ditelan. Aromaterapi bersifat komplementer.
          </div>
        </div>
      `;
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    async _saveResult(rec) {
      try {
        if (typeof auth === 'undefined' || !auth.currentUser ||
            typeof FirebaseService === 'undefined') return;
        await FirebaseService.userCol(auth.currentUser.uid, 'aromaRecommendations').add({
          timestamp: firebase.firestore.FieldValue.serverTimestamp(),
          psp5: this.answers.psp,
          hunger: this.answers.hunger,
          sees10: this._collectSees(),
          need: rec.need,
          dominant: rec.dominant,
          carrier: rec.carrier.id,
          blend: rec.blend.map(b => ({ id: b.id, drops: b.drops, score: b.score }))
        });
      } catch (e) { /* offline ok */ }
    },

    /* ── Oil library cards ────────────────────────────────────────── */
    _renderLibrary() {
      const el = document.getElementById('aromaLibrary');
      if (!el || typeof AromaDB === 'undefined') return;
      el.innerHTML = AromaDB.all.map(oil => `
        <div class="glass-card" style="padding:14px; cursor:pointer;" onclick="AromaModule.showOil('${oil.id}')">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
            <div style="width:32px; height:32px; border-radius:10px; background:${oil.primary ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'linear-gradient(135deg,#8b5cf6,#7c3aed)'}; display:flex; align-items:center; justify-content:center; color:#fff;">
              <i class="fas ${oil.kind === 'carrier' ? 'fa-bottle-droplet' : 'fa-leaf'}"></i>
            </div>
            ${oil.primary ? '<span style="font-size:0.6rem; background:#fef3c7; color:#92400e; padding:2px 6px; border-radius:99px; font-weight:700;">UTAMA</span>' : ''}
          </div>
          <div style="font-size:0.85rem; font-weight:700; color:#4c1d95;">${oil.name}</div>
          <div style="font-size:0.68rem; color:#94a3b8; font-style:italic;">${oil.scientificName}</div>
          <div style="font-size:0.7rem; color:#64748b; margin-top:6px; line-height:1.4;">${oil.aromaProfile}</div>
        </div>`).join('');
    },

    showOil(id) {
      const oil = (typeof AromaDB !== 'undefined') ? AromaDB.get(id) : null;
      if (!oil) return;
      const ev = { traditional:'Tradisional', limited:'Bukti terbatas', moderate:'Bukti sedang' };
      alert(`${oil.name} (${oil.scientificName})\n\nAroma: ${oil.aromaProfile}\n\n${oil.notes}\n\nCara pakai: ${oil.usage}\n\nPerhatian: ${oil.caution}\n\nLevel bukti: ${ev[oil.evidence] || oil.evidence}`);
    },

    destroy() {
      if (this._bioTimer) { clearInterval(this._bioTimer); this._bioTimer = null; }
    }
  };

  if (typeof window !== 'undefined') window.AromaModule = AromaModule;
})();
