/**
 * ScentraVN Serenity — Spectra Editor (full page)
 *
 * Opened from the Recording History "Lihat Spektra" button. Renders the EEG
 * band spectrum (delta–gamma) of one saved recording on a dedicated page and
 * lets the user remove noisy time segments — e.g. data captured while the user
 * blinked — then save the cleaned recording back to Firestore.
 *
 * Editing model: click two points on the chart to mark a time range, then
 * "Hapus Rentang". Every frame whose timestamp falls inside that absolute
 * window is removed from ALL streams (muse, museRaw, scentra, galaxy), so the
 * data captured at that moment is dropped together.
 */

(() => {
  'use strict';

  const SpectraEditor = {
    pendingId: null,
    recordId: null,
    meta: null,
    streams: null,        // working copy (mutated by edits)
    originalJSON: null,    // snapshot for "Batalkan Perubahan"
    chart: null,
    times: [],            // chart bucket centre seconds (index → seconds)
    museT0: 0,            // timestamp (ms) of first muse frame
    selA: null,           // selection start index (into times)
    selB: null,           // selection end index
    dirty: false,

    /** Entry point used by RecordHistory: remember which recording, then route. */
    open(id) {
      this.pendingId = id;
      Router.navigate('spectra');
    },

    /** Called by the route handler after Views.spectraEditor() is rendered. */
    async init() {
      const id = this.pendingId;
      if (!id) { Router.navigate('recordhistory', true); return; }
      this.recordId = id;
      this.meta = null; this.streams = null; this.originalJSON = null;
      this.chart = null; this.times = []; this.museT0 = 0;
      this.selA = this.selB = null; this.dirty = false;

      const back = document.getElementById('seBack');
      if (back) back.addEventListener('click', () => this._leave());

      await this._load();
    },

    async _load() {
      const root = document.getElementById('seRoot');
      if (!root) return;
      root.innerHTML = `<div class="se-state"><i class="fas fa-spinner fa-spin"></i><p>${t('se.loading')}</p></div>`;
      try {
        const full = await RawRecorder.loadRecording(this.recordId);
        if (!full) throw new Error(t('rh.not_found'));
        this.meta = full.meta || {};
        this.streams = full.streams || { muse: [], museRaw: [], scentra: [], galaxy: [] };
        this.originalJSON = JSON.stringify(this.streams);

        const sub = document.getElementById('seSub');
        if (sub) {
          const name = this.meta.name || t('rh.rec_default');
          const when = RecordHistory._fmtDate(this.meta.createdAt) || RecordHistory._fmtISO(this.meta.startedAt) || '';
          sub.textContent = when ? `${name} · ${when}` : name;
        }
        this._renderBody();
      } catch (e) {
        console.error(e);
        root.innerHTML = `<div class="se-state"><i class="fas fa-triangle-exclamation" style="color:#fca5a5;"></i>
          <p>${t('se.load_failed')}<br><span style="font-size:.72rem;">${RecordHistory._esc(e.message)}</span></p>
          <button class="se-btn" onclick="SpectraEditor._load()"><i class="fas fa-rotate"></i> ${t('rh.retry')}</button></div>`;
      }
    },

    /** Render the toolbar + chart + data list (or an empty state). */
    _renderBody() {
      const root = document.getElementById('seRoot');
      if (!root) return;
      const prevScroll = (document.getElementById('seList') || {}).scrollTop || 0;

      const spec = RecordHistory._computeBands(this.streams.muse || []);
      this.times = spec.times || [];
      // Bucket edges (first/last raw frame's elapsed second inside each bucket)
      // — used instead of the bucket MEAN when deleting a range, so a
      // downsampled long recording doesn't clip data at the edges of the
      // first/last selected bucket. Falls back to `times` if absent (older
      // cached spec shape) so this never throws.
      this.timesStart = spec.timesStart || this.times;
      this.timesEnd = spec.timesEnd || this.times;
      // Frames shown in the list (muse metrics that carry a timestamp).
      this.listFrames = (this.streams.muse || []).filter(f => f && f.t != null);
      this.museT0 = this.listFrames.length ? this.listFrames[0].t : 0;
      this.selA = this.selB = null;
      this.activeRow = null;

      if (!spec.bands.length) {
        root.innerHTML = `
          <div class="se-toolbar">
            <div class="se-actions">
              <button id="seReset" class="se-btn"><i class="fas fa-rotate-left"></i> ${t('se.reset')}</button>
              <button id="seSave" class="se-btn primary"><i class="fas fa-floppy-disk"></i> ${t('se.save')}</button>
            </div>
          </div>
          <div class="se-state"><i class="fas fa-wave-square"></i><p>${t('se.empty')}</p></div>`;
        this._wireActions();
        return;
      }

      root.innerHTML = `
        <div class="se-toolbar">
          <div class="se-hint"><i class="fas fa-circle-info"></i> ${t('se.hint')}</div>
          <div class="se-selrow">
            <span id="seSel" class="se-sel">${t('se.sel_none')}</span>
            <span id="seFrames" class="se-frames"></span>
          </div>
          <div class="se-actions">
            <button id="seDenoiseInfo" class="se-btn ghost se-info-btn" type="button" title="${t('se.denoise_info_title')}"><i class="fas fa-circle-info"></i></button>
            <button id="seDenoise" class="se-btn denoise" type="button"><i class="fas fa-filter"></i> ${t('se.denoise')}</button>
            <button id="seDelete" class="se-btn danger" disabled><i class="fas fa-eraser"></i> ${t('se.delete')}</button>
            <button id="seClear" class="se-btn" disabled><i class="fas fa-xmark"></i> ${t('se.clear')}</button>
            <button id="seReset" class="se-btn"><i class="fas fa-rotate-left"></i> ${t('se.reset')}</button>
            <button id="seSave" class="se-btn primary"><i class="fas fa-floppy-disk"></i> ${t('se.save')}</button>
          </div>
        </div>
        <div class="se-canvaswrap"><canvas id="seCanvas"></canvas></div>
        <div class="se-list-head">
          <span><i class="fas fa-list-ul"></i> ${t('se.data_title')}</span>
          <span class="se-list-count">${this.listFrames.length.toLocaleString()} ${t('rh.frame')}</span>
        </div>
        <div class="se-list-hint">${t('se.data_hint')}</div>
        <div id="seList" class="se-list">${this._listRowsHTML()}</div>`;

      this._updateFrames(spec.count);
      this._wireActions();
      this._drawChart(spec);
      this._wireList();
      this._refreshSelUI();

      const list = document.getElementById('seList');
      if (list) list.scrollTop = prevScroll;
    },

    /** Build the rows for the data list from this.listFrames. */
    _listRowsHTML() {
      const fmt = (v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return '–';
        return n >= 10 ? n.toFixed(0) : n.toFixed(2);
      };
      const t0 = this.museT0;
      return this.listFrames.map((f, i) => {
        const clock = RecordHistory._fmtClock((f.t - t0) / 1000);
        const vals = `δ ${fmt(f.delta)} · θ ${fmt(f.theta)} · α ${fmt(f.alpha)} · β ${fmt(f.beta)} · γ ${fmt(f.gamma)}`;
        return `<div class="se-row" data-i="${i}">
            <span class="se-row-t">${clock}</span>
            <span class="se-row-vals">${vals}</span>
            <button class="se-row-del" data-i="${i}" type="button" title="${t('se.del_frame')}"><i class="fas fa-trash"></i></button>
          </div>`;
      }).join('');
    },

    _wireList() {
      const list = document.getElementById('seList');
      if (!list) return;
      list.addEventListener('click', (e) => {
        const del = e.target.closest('.se-row-del');
        if (del) { e.stopPropagation(); this._deleteFrame(parseInt(del.dataset.i, 10)); return; }
        const row = e.target.closest('.se-row');
        if (row) this._locateFrame(parseInt(row.dataset.i, 10), row);
      });
    },

    /** Highlight where a list frame sits on the chart (vertical marker). */
    _locateFrame(i, rowEl) {
      const f = this.listFrames[i];
      if (!f) return;
      const sec = (f.t - this.museT0) / 1000;
      this.selA = this._nearestTimeIdx(sec);
      this.selB = null;
      if (document.querySelector('.se-row.active')) document.querySelector('.se-row.active').classList.remove('active');
      if (rowEl) rowEl.classList.add('active');
      this._refreshSelUI();
      if (this.chart) this.chart.update('none');
    },

    _nearestTimeIdx(sec) {
      let best = 0, bestD = Infinity;
      for (let k = 0; k < this.times.length; k++) {
        const d = Math.abs(this.times[k] - sec);
        if (d < bestD) { bestD = d; best = k; }
      }
      return best;
    },

    /** Plain-language explanation of what the "Denoise Otomatis" button does. */
    _showDenoiseInfo() {
      const msg = t('se.denoise_info_body');
      if (typeof Utils !== 'undefined' && Utils.alertModal) {
        Utils.alertModal(msg, { title: t('se.denoise_info_title'), icon: 'fa-filter' });
      } else {
        alert(msg);
      }
    },

    /**
     * Auto-denoise: robustly detect artifact frames (blink/motion spikes raise
     * the total band power far above the session baseline) and, on confirmation,
     * remove them together with the raw data captured in the same time slice.
     *
     * Uses a median + MAD threshold (≈4σ) so a few large spikes don't bias the
     * baseline the way mean/std would.
     */
    async _autoDenoise() {
      const frames = this.listFrames || [];
      if (frames.length < 8) { this._toast(t('se.denoise_none')); return; }

      const bands = RecordHistory.BANDS_ORDER;
      const scoreOf = (f) => bands.reduce((a, b) => { const v = Number(f[b]); return a + (Number.isFinite(v) ? v : 0); }, 0);
      const scores = frames.map(scoreOf);

      const med = this._median(scores);
      const mad = this._median(scores.map(s => Math.abs(s - med)));
      let thr;
      if (mad > 0) {
        thr = med + 4 * 1.4826 * mad;           // robust ≈4σ
      } else {
        const mean = scores.reduce((a, s) => a + s, 0) / scores.length;
        const sd = Math.sqrt(scores.reduce((a, s) => a + (s - mean) * (s - mean), 0) / scores.length);
        thr = mean + 4 * sd;
      }

      const artifacts = frames.filter((f, i) => scores[i] > thr);
      if (!artifacts.length) { this._toast(t('se.denoise_none')); return; }

      const ok = await this._confirm(t('se.denoise_confirm', { n: artifacts.length }),
        { danger: true, confirmText: t('se.denoise_do'), cancelText: t('se.leave_no') });
      if (!ok) return;

      // Remove a small window around each artifact (½ the median frame interval)
      // so the matching raw EEG / watch samples captured then are dropped too.
      const ts = frames.map(f => f.t).sort((a, b) => a - b);
      const diffs = [];
      for (let i = 1; i < ts.length; i++) diffs.push(ts[i] - ts[i - 1]);
      const half = (this._median(diffs) || 1000) / 2;
      const wins = artifacts.map(f => [f.t - half, f.t + half]);
      const inWin = (tt) => wins.some(w => tt >= w[0] && tt <= w[1]);

      let removed = 0;
      for (const key of ['muse', 'museRaw', 'scentra', 'galaxy']) {
        const arr = this.streams[key];
        if (!Array.isArray(arr)) continue;
        const before = arr.length;
        this.streams[key] = arr.filter(fr => !(fr && fr.t != null && inWin(fr.t)));
        removed += before - this.streams[key].length;
      }

      this.dirty = true;
      this._toast(t('se.denoised', { n: removed }));
      if (this.chart) { try { this.chart.destroy(); } catch (_) {} this.chart = null; }
      this._renderBody();
    },

    _median(arr) {
      if (!arr || !arr.length) return 0;
      const a = arr.slice().sort((x, y) => x - y);
      const m = a.length >> 1;
      return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
    },

    /**
     * Delete a single frame (one row): removes it from `muse`, AND the raw
     * EEG/PPG/watch samples captured in the same instant from `museRaw`/
     * `scentra`/`galaxy` — matching the editing model documented at the top
     * of this file and what range-delete/auto-denoise already do. A previous
     * version of this only touched `muse`, silently leaving the underlying
     * raw data (the actual noisy signal) in the recording.
     */
    _deleteFrame(i) {
      const f = this.listFrames[i];
      if (!f) return;

      // Half the median interval between listed frames — same window logic
      // _autoDenoise uses — so the raw samples captured "at the same moment"
      // as this metrics frame get removed too, not just the summary row.
      const ts = this.listFrames.map(x => x.t).sort((a, b) => a - b);
      const diffs = [];
      for (let k = 1; k < ts.length; k++) diffs.push(ts[k] - ts[k - 1]);
      const half = (this._median(diffs) || 1000) / 2;
      const startMs = f.t - half, endMs = f.t + half;

      let removed = 0;
      for (const key of ['muse', 'museRaw', 'scentra', 'galaxy']) {
        const arr = this.streams[key];
        if (!Array.isArray(arr)) continue;
        const before = arr.length;
        this.streams[key] = (key === 'muse')
          ? arr.filter(x => x !== f)   // exact — never drop a neighbouring muse frame by accident
          : arr.filter(fr => !(fr && fr.t != null && fr.t >= startMs && fr.t <= endMs));
        removed += before - this.streams[key].length;
      }

      this.dirty = true;
      this._toast(t('se.removed', { n: removed }));
      if (this.chart) { try { this.chart.destroy(); } catch (_) {} this.chart = null; }
      this._renderBody();
    },

    _wireActions() {
      const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
      on('seDenoise', () => this._autoDenoise());
      on('seDenoiseInfo', () => this._showDenoiseInfo());
      on('seDelete', () => this._deleteSelection());
      on('seClear', () => { this.selA = this.selB = null; this._refreshSelUI(); if (this.chart) this.chart.update('none'); });
      on('seReset', () => this._reset());
      on('seSave', () => this._save());
      this._refreshSaveBtn();
    },

    _drawChart(spec) {
      const canvas = document.getElementById('seCanvas');
      if (!canvas) return;
      const SE = this;

      // Inline plugin: shade the currently selected time range.
      const selectionBox = {
        id: 'selectionBox',
        beforeDatasetsDraw(chart) {
          if (SE.selA == null) return;
          const { ctx, chartArea, scales } = chart;
          const x = scales.x;
          const top = chartArea.top, bottom = chartArea.bottom;
          if (SE.selB == null) {
            const px = x.getPixelForValue(SE.selA);
            ctx.save();
            ctx.strokeStyle = 'rgba(239,68,68,0.8)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, bottom); ctx.stroke();
            ctx.restore();
          } else {
            const a = x.getPixelForValue(Math.min(SE.selA, SE.selB));
            const b = x.getPixelForValue(Math.max(SE.selA, SE.selB));
            ctx.save();
            ctx.fillStyle = 'rgba(239,68,68,0.15)';
            ctx.fillRect(a, top, b - a, bottom - top);
            ctx.strokeStyle = 'rgba(239,68,68,0.6)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(a, top, b - a, bottom - top);
            ctx.restore();
          }
        },
      };

      this.chart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
          labels: spec.times.map(s => RecordHistory._fmtClock(s)),
          datasets: spec.bands.map(b => ({
            label: RecordHistory.BAND_META[b].label,
            data: spec.series[b],
            borderColor: RecordHistory.BAND_META[b].color,
            backgroundColor: 'transparent',
            borderWidth: 1.5, pointRadius: 0, tension: 0.3, spanGaps: true,
          })),
        },
        options: {
          responsive: true, maintainAspectRatio: false, animation: false,
          interaction: { mode: 'index', intersect: false },
          onClick: (e) => this._onChartClick(e),
          plugins: {
            legend: { display: true, position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } },
            tooltip: { enabled: true, callbacks: { title: (items) => `${t('rh.sp_axis_time')}: ${items[0]?.label || ''}` } },
          },
          scales: {
            x: {
              display: true, title: { display: true, text: t('rh.sp_axis_time'), font: { size: 10 }, color: '#94a3b8' },
              grid: { display: false },
              ticks: { maxTicksLimit: 8, autoSkip: true, maxRotation: 0, color: '#94a3b8', font: { size: 10 } },
            },
            y: {
              display: true, beginAtZero: true,
              grid: { color: 'rgba(124,58,237,0.08)' },
              ticks: { maxTicksLimit: 5, color: '#94a3b8', font: { size: 10 } },
            },
          },
        },
        plugins: [selectionBox],
      });
    },

    _onChartClick(e) {
      if (!this.chart || !this.times.length) return;
      // Ignore clicks outside the plot area (legend, axis labels, padding).
      const area = this.chart.chartArea;
      if (area && (e.y < area.top || e.y > area.bottom || e.x < area.left || e.x > area.right)) return;
      const x = this.chart.scales.x;
      let idx = Math.round(x.getValueForPixel(e.x));
      idx = Math.max(0, Math.min(this.times.length - 1, idx));
      // First point, or restart after a completed range.
      if (this.selA == null || this.selB != null) {
        this.selA = idx; this.selB = null;
      } else {
        this.selB = idx;
      }
      this._refreshSelUI();
      this.chart.update('none');
    },

    _refreshSelUI() {
      const sel = document.getElementById('seSel');
      const del = document.getElementById('seDelete');
      const clr = document.getElementById('seClear');
      const has = this.selA != null;
      const full = has && this.selB != null;
      if (sel) {
        if (full) {
          const a = Math.min(this.selA, this.selB), b = Math.max(this.selA, this.selB);
          sel.textContent = t('se.sel_range', { a: RecordHistory._fmtClock(this.times[a]), b: RecordHistory._fmtClock(this.times[b]) });
        } else if (has) {
          sel.textContent = t('se.sel_start', { a: RecordHistory._fmtClock(this.times[this.selA]) });
        } else {
          sel.textContent = t('se.sel_none');
        }
      }
      if (del) del.disabled = !full;
      if (clr) clr.disabled = !has;
    },

    _deleteSelection() {
      if (this.selA == null || this.selB == null) return;
      const a = Math.min(this.selA, this.selB), b = Math.max(this.selA, this.selB);
      // Use bucket EDGES, not the mean (this.times), so the whole selected
      // bucket's raw data is removed — see _computeBands' doc comment.
      const startMs = this.museT0 + this.timesStart[a] * 1000;
      const endMs = this.museT0 + this.timesEnd[b] * 1000;

      let removed = 0;
      for (const key of ['muse', 'museRaw', 'scentra', 'galaxy']) {
        const arr = this.streams[key];
        if (!Array.isArray(arr)) continue;
        const before = arr.length;
        this.streams[key] = arr.filter(f => !(f && f.t != null && f.t >= startMs && f.t <= endMs));
        removed += before - this.streams[key].length;
      }

      if (removed > 0) {
        this.dirty = true;
        this._toast(t('se.removed', { n: removed }));
      } else {
        this._toast(t('se.nothing'));
      }
      if (this.chart) { try { this.chart.destroy(); } catch (_) {} this.chart = null; }
      this._renderBody();
    },

    async _save() {
      const btn = document.getElementById('seSave');
      const orig = btn ? btn.innerHTML : '';
      if (btn) { btn.disabled = true; btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${t('se.saving')}`; }
      try {
        await RawRecorder.updateRecording(this.recordId, this.streams);
        this.originalJSON = JSON.stringify(this.streams);
        this.dirty = false;
        this._toast(t('se.saved'));
      } catch (e) {
        console.error(e);
        this._alert(t('se.save_failed', { msg: e.message }), { danger: true });
      }
      if (btn) { btn.innerHTML = orig; }
      this._refreshSaveBtn();
    },

    _reset() {
      if (!this.originalJSON) return;
      this.streams = JSON.parse(this.originalJSON);
      this.dirty = false;
      if (this.chart) { try { this.chart.destroy(); } catch (_) {} this.chart = null; }
      this._renderBody();
    },

    /** Called by the router when navigating away — free the chart. */
    destroy() {
      if (this.chart) { try { this.chart.destroy(); } catch (_) {} this.chart = null; }
      this.selA = this.selB = null;
    },

    async _leave() {
      if (this.dirty) {
        const ok = await this._confirm(t('se.confirm_leave'), { danger: true, confirmText: t('se.leave_yes'), cancelText: t('se.leave_no') });
        if (!ok) return;
      }
      Router.navigate('recordhistory');
    },

    _updateFrames(eegCount) {
      const el = document.getElementById('seFrames');
      if (!el) return;
      const total = ['muse', 'museRaw', 'scentra', 'galaxy'].reduce((a, k) => a + ((this.streams[k] || []).length), 0);
      el.textContent = t('se.frames', { eeg: (eegCount || 0).toLocaleString(), total: total.toLocaleString() });
    },

    _refreshSaveBtn() {
      const btn = document.getElementById('seSave');
      if (btn) btn.disabled = !this.dirty;
    },

    /* helpers ─ delegate to RecordHistory/Utils where possible */
    _toast(msg) {
      if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast(msg, 'success');
      else if (typeof Utils !== 'undefined' && Utils.alertModal) Utils.alertModal(msg);
    },
    _alert(msg, opts) {
      if (typeof Utils !== 'undefined' && Utils.alertModal) return Utils.alertModal(msg, opts || {});
      alert(msg);
    },
    async _confirm(msg, opts) {
      if (typeof Utils !== 'undefined' && Utils.confirmModal) return await Utils.confirmModal(msg, opts || {});
      return confirm(msg);
    },
  };

  if (typeof window !== 'undefined') window.SpectraEditor = SpectraEditor;
})();
