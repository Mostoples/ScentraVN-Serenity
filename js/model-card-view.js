/**
 * ScentraVN Serenity — Model Card View Controller
 * Renders the transparency cards for every model.
 */

(() => {
  'use strict';

  const ModelCardView = {
    init() {
      this._renderCards();
      this._renderDSP();
    },

    _renderCards() {
      const el = document.getElementById('modelCardList');
      if (!el || typeof ModelCards === 'undefined') return;

      el.innerHTML = ModelCards.all.map(m => {
        const g = ModelCards.gradeMeta(m.grade);
        const accPct = (m.accuracy != null) ? Math.round(m.accuracy * 100) : null;
        const barColor = m.grade === 'real' ? '#10b981'
                       : m.grade === 'real-weak' ? '#f59e0b'
                       : m.grade === 'advisory' ? '#f97316' : '#ef4444';
        const bar = (accPct != null) ? `
          <div style="margin:10px 0 6px;">
            <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:#64748b; margin-bottom:4px;">
              <span>Akurasi nyata</span><span style="color:${barColor}; font-weight:700;">${m.accuracyLabel}</span>
            </div>
            <div style="height:10px; background:rgba(124,58,237,0.08); border-radius:99px; overflow:hidden;">
              <div style="height:100%; width:${accPct}%; background:${barColor};"></div>
            </div>
            ${m.ceiling ? `<div style="font-size:0.65rem; color:#94a3b8; margin-top:3px;">Ceiling (fitur penuh): ${Math.round(m.ceiling*100)}%</div>` : ''}
          </div>` : `
          <div style="margin:10px 0; font-size:0.78rem; color:${barColor}; font-weight:600;">${m.accuracyLabel}</div>`;

        return `
          <div class="glass-card" style="padding:18px;">
            <div style="display:flex; align-items:flex-start; gap:14px;">
              <div style="width:46px; height:46px; flex-shrink:0; border-radius:14px; background:linear-gradient(135deg,#8b5cf6,#7c3aed); display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.15rem;">
                <i class="fas ${m.icon}"></i>
              </div>
              <div style="flex:1; min-width:0;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                  <span style="font-size:1rem; font-weight:800; color:#4c1d95;">${m.name}</span>
                  <span style="display:inline-flex; align-items:center; gap:4px; font-size:0.66rem; font-weight:700; color:${g.color}; background:${g.color}1a; padding:3px 8px; border-radius:99px;">
                    <i class="fas ${g.icon}"></i> ${g.label}
                  </span>
                </div>
                <div style="font-size:0.8rem; color:#64748b; margin-top:3px;">${m.task}</div>
              </div>
            </div>

            ${bar}

            <div style="display:flex; flex-direction:column; gap:5px; margin-top:10px; font-size:0.74rem; color:#475569;">
              <div><i class="fas fa-microchip" style="color:#7c3aed; width:16px;"></i> <strong>Input:</strong> ${m.input}</div>
              <div><i class="fas fa-database" style="color:#7c3aed; width:16px;"></i> <strong>Data latih:</strong> ${m.trainedOn}</div>
              <div><i class="fas fa-vial-circle-check" style="color:#7c3aed; width:16px;"></i> <strong>Validasi:</strong> ${m.validation}</div>
            </div>

            <div style="display:flex; gap:10px; margin-top:12px; flex-wrap:wrap;">
              <div style="flex:1; min-width:140px; background:rgba(16,185,129,0.07); border-radius:10px; padding:10px;">
                <div style="font-size:0.66rem; color:#059669; font-weight:700; text-transform:uppercase; margin-bottom:3px;">Kekuatan</div>
                <div style="font-size:0.74rem; color:#475569; line-height:1.4;">${m.strengths}</div>
              </div>
              <div style="flex:1; min-width:140px; background:rgba(239,68,68,0.07); border-radius:10px; padding:10px;">
                <div style="font-size:0.66rem; color:#dc2626; font-weight:700; text-transform:uppercase; margin-bottom:3px;">Batasan</div>
                <div style="font-size:0.74rem; color:#475569; line-height:1.4;">${m.limits}</div>
              </div>
            </div>
          </div>`;
      }).join('');
    },

    _renderDSP() {
      const el = document.getElementById('dspList');
      if (!el || typeof ModelCards === 'undefined') return;
      el.innerHTML = ModelCards.dsp.map(d => `
        <div style="display:flex; align-items:flex-start; gap:10px; padding:8px 10px; background:rgba(16,185,129,0.06); border-radius:10px;">
          <i class="fas fa-circle-check" style="color:#10b981; margin-top:2px;"></i>
          <div>
            <div style="font-size:0.8rem; font-weight:700; color:#065f46;">${d.name}</div>
            <div style="font-size:0.72rem; color:#475569; line-height:1.4;">${d.note}</div>
          </div>
        </div>`).join('');
    }
  };

  if (typeof window !== 'undefined') window.ModelCardView = ModelCardView;
})();
