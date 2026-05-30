/**
 * ScentraVN Serenity — Sleep Timeline + Detail Modal
 *
 * Renders a compact SVG hypnogram (stages over time) and a modal that
 * shows full session details: per-epoch stages, band-power averages,
 * FAA trajectory, and key metrics.
 *
 * No external chart libs needed — vanilla SVG.
 */

(() => {
  'use strict';

  /* y-position per stage on the hypnogram (top → bottom) */
  const STAGE_Y = { wake: 0, rem: 1, n1: 2, n2: 3, n3: 4, unknown: 1.5 };
  const STAGE_LABEL = {
    wake: 'Wake', rem: 'REM', n1: 'N1 (light)', n2: 'N2',
    n3: 'N3 (deep)', unknown: '—'
  };

  const SleepTimeline = {

    /**
     * Render a hypnogram into a container.
     * @param {HTMLElement|string} container
     * @param {Array<{t:number, stage:string}>} epochs
     * @param {Object} [opts] { startedAt, endedAt, height, showAxis }
     */
    render(container, epochs, opts = {}) {
      const el = (typeof container === 'string') ? document.getElementById(container) : container;
      if (!el) return;

      if (!epochs || !epochs.length) {
        el.innerHTML = '<div style="color:#94a3b8; font-size:0.78rem; text-align:center; padding:16px;">No epochs to display.</div>';
        return;
      }

      const height = opts.height ?? 90;
      const totalEpochs = epochs.length;
      const startTs = opts.startedAt ?? epochs[0].t;
      const endTs   = opts.endedAt   ?? epochs[epochs.length - 1].t + 30000;
      const totalMs = Math.max(1, endTs - startTs);

      /* SVG renders in 0..1000 viewBox for easy responsive scaling */
      const W = 1000;
      const H = height;
      const stageRows = 5;        /* wake / rem / n1 / n2 / n3 */
      const rowH = (H - 20) / stageRows;

      const rects = epochs.map((e, i) => {
        const t = e.t || (startTs + i * 30000);
        const x  = ((t - startTs) / totalMs) * W;
        const w  = Math.max(2, ((30000) / totalMs) * W);
        const sy = STAGE_Y[e.stage] ?? STAGE_Y.unknown;
        const y  = sy * rowH + 4;
        const fill = `url(#stage-${e.stage || 'unknown'})`;
        const stageClass = `stage-${e.stage || 'unknown'}`;
        return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(2)}" height="${(rowH - 2).toFixed(1)}" rx="2" class="${stageClass}" />`;
      }).join('');

      /* Row guides */
      const rows = ['wake','rem','n1','n2','n3'].map((s, i) => {
        const y = i * rowH + rowH / 2 + 4;
        return `<text x="6" y="${y.toFixed(1)}" font-size="9" fill="#94a3b8" dominant-baseline="middle">${STAGE_LABEL[s].split(' ')[0]}</text>`;
      }).join('');

      const startLabel = new Date(startTs).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const endLabel   = new Date(endTs).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const midLabel   = new Date((startTs + endTs) / 2).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      const hours = (totalMs / 3600000).toFixed(1);

      el.innerHTML = `
        <div class="sleep-timeline-wrap">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 6px;">
            <span style="font-size:0.78rem; color:#4c1d95; font-weight:700;">Hypnogram</span>
            <span style="font-size:0.7rem; color:#64748b;">${totalEpochs} epochs · ${hours} h</span>
          </div>
          <svg class="sleep-timeline-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
            ${rows}
            ${rects}
          </svg>
          <div class="sleep-timeline-axis">
            <span>${startLabel}</span>
            <span>${midLabel}</span>
            <span>${endLabel}</span>
          </div>
          <div class="sleep-legend">
            <span class="sleep-legend-item"><span class="sleep-legend-dot stage-wake"></span> Wake</span>
            <span class="sleep-legend-item"><span class="sleep-legend-dot stage-rem"></span> REM</span>
            <span class="sleep-legend-item"><span class="sleep-legend-dot stage-n1"></span> N1</span>
            <span class="sleep-legend-item"><span class="sleep-legend-dot stage-n2"></span> N2</span>
            <span class="sleep-legend-item"><span class="sleep-legend-dot stage-n3"></span> N3</span>
          </div>
        </div>
      `;
    },

    /**
     * Render a horizontal stacked bar of stage proportions.
     * @param {HTMLElement|string} container
     * @param {Object} percentages { wake, n1, n2, n3, rem }
     */
    renderStageBar(container, percentages) {
      const el = (typeof container === 'string') ? document.getElementById(container) : container;
      if (!el || !percentages) return;
      const order = ['wake', 'n1', 'n2', 'n3', 'rem'];
      el.innerHTML = `<div class="sleep-bands-bar">
        ${order.map(s => {
          const pct = percentages[s] || 0;
          if (pct < 0.5) return '';
          return `<span class="stage-${s}" style="width:${pct.toFixed(1)}%;" title="${STAGE_LABEL[s]}: ${pct.toFixed(1)}%"></span>`;
        }).join('')}
      </div>`;
    },

    /**
     * Open a modal with full session details.
     * @param {Object} session — Firestore doc
     */
    openDetailModal(session) {
      this.closeDetailModal();

      const epochs = session.epochs || [];
      const summary = session.summary || {};
      const startedAt = session.startedAt ? new Date(session.startedAt) : null;
      const endedAt   = session.endedAt   ? new Date(session.endedAt)   : null;
      const durMin = Math.round((session.durationSec || 0) / 60);

      /* Average band powers across the session */
      const bandSums = { delta: 0, theta: 0, alpha: 0, smr: 0, beta: 0, gamma: 0 };
      let bandCount = 0;
      let faaSum = 0, faaCount = 0;
      let engSum = 0, engCount = 0;
      for (const e of epochs) {
        if (e.powers) {
          for (const k of Object.keys(bandSums)) bandSums[k] += e.powers[k] || 0;
          bandCount++;
        }
        if (e.faa !== null && e.faa !== undefined) { faaSum += e.faa; faaCount++; }
        if (e.engagement !== null && e.engagement !== undefined) { engSum += e.engagement; engCount++; }
      }
      const bandAvg = {};
      const totalP = Object.values(bandSums).reduce((a, b) => a + b, 0) || 1;
      for (const k of Object.keys(bandSums)) bandAvg[k] = (bandSums[k] / totalP) * 100;
      const faaAvg = faaCount ? (faaSum / faaCount) : null;
      const engAvg = engCount ? (engSum / engCount) : null;

      const backdrop = document.createElement('div');
      backdrop.className = 'sleep-modal-backdrop';
      backdrop.id = 'sleepDetailBackdrop';
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.closeDetailModal();
      });

      backdrop.innerHTML = `
        <div class="sleep-modal" role="dialog" aria-modal="true">
          <button class="sleep-modal-close" id="sleepModalCloseBtn" type="button" aria-label="Close">
            <i class="fas fa-times"></i>
          </button>

          <h3>Sleep Session Detail</h3>
          <div class="sleep-modal-meta">
            ${startedAt ? startedAt.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
            ${endedAt ? ` → ${endedAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` : ''}
            · ${durMin} min · ${epochs.length} epochs
          </div>

          <div class="sleep-summary-grid">
            <div class="sleep-summary-item">
              <div class="lbl">Score</div>
              <div class="val">${summary.score ?? '—'}</div>
              <div class="sub">/ 100</div>
            </div>
            <div class="sleep-summary-item">
              <div class="lbl">Efficiency</div>
              <div class="val">${summary.efficiency != null ? summary.efficiency + '%' : '—'}</div>
              <div class="sub">asleep / total</div>
            </div>
            <div class="sleep-summary-item">
              <div class="lbl">Deep</div>
              <div class="val">${summary.percentages?.n3 != null ? summary.percentages.n3 + '%' : '—'}</div>
              <div class="sub">N3</div>
            </div>
            <div class="sleep-summary-item">
              <div class="lbl">REM</div>
              <div class="val">${summary.percentages?.rem != null ? summary.percentages.rem + '%' : '—'}</div>
              <div class="sub">dream sleep</div>
            </div>
            <div class="sleep-summary-item">
              <div class="lbl">Wake</div>
              <div class="val">${summary.percentages?.wake != null ? summary.percentages.wake + '%' : '—'}</div>
              <div class="sub">interruptions</div>
            </div>
            <div class="sleep-summary-item">
              <div class="lbl">avg FAA</div>
              <div class="val">${faaAvg != null ? faaAvg.toFixed(2) : '—'}</div>
              <div class="sub">mood marker</div>
            </div>
          </div>

          <h5 style="font-size:0.85rem; color:#4c1d95; margin: 12px 0 8px;">Stage distribution</h5>
          <div id="sleepModalStageBar"></div>

          <h5 style="font-size:0.85rem; color:#4c1d95; margin: 18px 0 8px;">Hypnogram</h5>
          <div id="sleepModalTimeline"></div>

          <h5 style="font-size:0.85rem; color:#4c1d95; margin: 18px 0 8px;">EEG band powers (session avg)</h5>
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${Object.keys(bandSums).map(k => `
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="width:54px; font-size:0.75rem; font-weight:700; color:#6d28d9; text-transform:uppercase;">${k}</span>
                <div style="flex:1; height: 8px; background: rgba(124,58,237,0.08); border-radius: 99px; overflow:hidden;">
                  <div style="height:100%; width:${Math.min(100, bandAvg[k]).toFixed(1)}%; background: linear-gradient(90deg, #8b5cf6, #c084fc);"></div>
                </div>
                <span style="width:50px; text-align:right; font-size:0.75rem; color:#7c3aed; font-weight:600;">${bandAvg[k].toFixed(0)}%</span>
              </div>`).join('')}
          </div>

          <p style="font-size: 0.7rem; color: #94a3b8; margin-top: 18px; line-height: 1.5;">
            <i class="fas fa-info-circle"></i> Stages are estimated from a single frontal channel using
            AASM-inspired rules. This is a wellness tool, not a clinical polysomnography.
          </p>
        </div>
      `;

      document.body.appendChild(backdrop);
      document.body.style.overflow = 'hidden';

      this.render('sleepModalTimeline', epochs, {
        startedAt: session.startedAt ? +new Date(session.startedAt) : undefined,
        endedAt:   session.endedAt   ? +new Date(session.endedAt)   : undefined,
      });
      this.renderStageBar('sleepModalStageBar', summary.percentages || {});

      document.getElementById('sleepModalCloseBtn')?.addEventListener('click', () => this.closeDetailModal());
      document.addEventListener('keydown', this._escHandler);
    },

    closeDetailModal() {
      const bd = document.getElementById('sleepDetailBackdrop');
      if (bd) bd.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', this._escHandler);
    },

    _escHandler(e) {
      if (e.key === 'Escape') SleepTimeline.closeDetailModal();
    }
  };

  if (typeof window !== 'undefined') window.SleepTimeline = SleepTimeline;
})();
