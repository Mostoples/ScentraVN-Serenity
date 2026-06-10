/**
 * ScentraVN Serenity — Muse contact gauge (shared)
 *
 * Renders the Muse-app-style arc-of-segments + central battery indicator that
 * shows per-electrode contact quality (TP9/AF7/AF8/TP10) and the battery level.
 * Pure SVG, no colored background — drops into any container. Reads live data
 * straight from the global MuseEEG (buffers for contact quality, metrics.battery).
 */
(() => {
  'use strict';

  const CFG = { cx: 200, cy: 170, rI: 78, rO: 126, start: 228, end: -48, gap: 8, order: ['tp9', 'af7', 'af8', 'tp10'] };
  const COL = { good: '#18d8c6', noisy: '#f59e0b', flat: '#ef4444', nodata: '#94a3b8' };
  const STD_MIN_UV = 1.0;   // below → flat/disconnected lead
  const STD_MAX_UV = 60.0;  // above → motion/railing artefact

  const polar = (cx, cy, r, deg) => { const a = deg * Math.PI / 180; return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
  function ringSector(cx, cy, rI, rO, a1, a2) {
    const [x1, y1] = polar(cx, cy, rO, a1);
    const [x2, y2] = polar(cx, cy, rO, a2);
    const [x3, y3] = polar(cx, cy, rI, a2);
    const [x4, y4] = polar(cx, cy, rI, a1);
    const large = (a1 - a2) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${rO} ${rO} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rI} ${rI} 0 ${large} 0 ${x4} ${y4} Z`;
  }

  function chanStd(ch, n = 256) {
    if (typeof MuseEEG === 'undefined' || !MuseEEG.buffers) return null;
    const b = MuseEEG.buffers[ch];
    if (!b || b.length < 64) return null;
    const w = b.slice(-n);
    const mean = w.reduce((a, x) => a + x, 0) / w.length;
    const varc = w.reduce((a, x) => a + (x - mean) * (x - mean), 0) / w.length;
    return Math.sqrt(varc);
  }
  function chanQuality(ch) {
    const sd = chanStd(ch);
    if (sd == null) return 'nodata';
    if (sd < STD_MIN_UV) return 'flat';
    if (sd > STD_MAX_UV) return 'noisy';
    return 'good';
  }

  const MuseGauge = {
    /** Real (non-simulated) Muse link present? */
    connected() { return typeof MuseEEG !== 'undefined' && MuseEEG.isConnected && !MuseEEG.simulationMode; },

    /** Current per-electrode contact quality. */
    quals() {
      return { tp9: chanQuality('tp9'), af7: chanQuality('af7'), af8: chanQuality('af8'), tp10: chanQuality('tp10') };
    },

    /** Static gauge SVG (geometry only; colours set by update()). */
    skeletonHTML() {
      const c = CFG;
      const sweep = c.start - c.end;
      const segW = (sweep - c.gap * (c.order.length - 1)) / c.order.length;
      let a = c.start, segs = '';
      for (let i = 0; i < c.order.length; i++) {
        const a1 = a, a2 = a - segW;
        segs += `<path class="seg" data-seg="${c.order[i]}" d="${ringSector(c.cx, c.cy, c.rI, c.rO, a1, a2)}" ` +
          `fill="#94a3b8" stroke="#94a3b8" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"></path>`;
        a = a2 - c.gap;
      }
      const bx = c.cx, by = c.cy + 4, R = 44;
      const bars = [-16, -4, 8].map((dx, i) =>
        `<rect class="batt-bar" data-bar="${i}" x="${bx + dx}" y="${by - 7}" width="10" height="14" rx="2" fill="#18d8c6"></rect>`).join('');
      const legend = c.order.map(ch => `<span class="lg"><span class="dot" data-leg="${ch}"></span>${ch.toUpperCase()}</span>`).join('');
      return `<div class="rr-gauge-wrap"><svg class="rr-gauge" viewBox="0 0 400 300" role="img" aria-label="Muse contact quality">
          <g class="segments">${segs}</g>
          <g class="battery">
            <circle cx="${bx}" cy="${by}" r="${R}" fill="#f8fafc" stroke="#e2e8f0" stroke-width="3"></circle>
            <rect class="batt-body" x="${bx - 22}" y="${by - 12}" width="42" height="24" rx="5" fill="none" stroke="#18d8c6" stroke-width="3"></rect>
            <rect class="batt-tip" x="${bx + 22}" y="${by - 5}" width="5" height="10" rx="2" fill="#18d8c6"></rect>
            ${bars}
            <text class="rr-batt-pct" x="${c.cx}" y="${by + R + 24}" text-anchor="middle" font-size="26">—</text>
          </g>
        </svg></div>
        <div class="rr-gauge-legend">${legend}</div>`;
    },

    /** Update segment colours + battery from the live Muse state. */
    update(el) {
      if (!el) return;
      const q = this.quals();
      CFG.order.forEach((ch) => {
        const col = COL[q[ch]] || COL.nodata;
        const p = el.querySelector(`.seg[data-seg="${ch}"]`);
        if (p) {
          p.setAttribute('fill', col); p.setAttribute('stroke', col);
          p.style.filter = `drop-shadow(0 0 7px ${col}99)`;
          p.style.opacity = q[ch] === 'nodata' ? '.45' : '1';
        }
        const dot = el.querySelector(`.dot[data-leg="${ch}"]`);
        if (dot) dot.style.background = col;
      });
      const pct = (typeof MuseEEG !== 'undefined' && MuseEEG.metrics) ? MuseEEG.metrics.battery : null;
      const battCol = pct == null ? '#94a3b8' : (pct > 40 ? '#18d8c6' : pct > 20 ? '#f59e0b' : '#ef4444');
      const txt = el.querySelector('.rr-batt-pct');
      if (txt) txt.textContent = pct == null ? '—' : Math.round(pct) + '%';
      const filled = pct == null ? 0 : Math.max(1, Math.round(pct / 100 * 3));
      el.querySelectorAll('.batt-bar').forEach((b, i) => b.setAttribute('fill', i < filled ? battCol : '#e2e8f0'));
      const body = el.querySelector('.batt-body'); if (body) body.setAttribute('stroke', battCol);
      const tip = el.querySelector('.batt-tip'); if (tip) tip.setAttribute('fill', battCol);
    },

    /** Build (once) + update the gauge inside `el`. */
    render(el) {
      if (!el) return;
      if (!el.querySelector('.rr-gauge')) el.innerHTML = this.skeletonHTML();
      this.update(el);
    },
  };

  if (typeof window !== 'undefined') window.MuseGauge = MuseGauge;
})();
