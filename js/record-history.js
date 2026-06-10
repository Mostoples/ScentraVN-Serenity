/**
 * ScentraVN Serenity — Recording History Controller
 *
 * Lists saved RAW recordings from Firestore and lets the user download each
 * one as an Excel workbook (multi-sheet, raw data) or JSON, or delete it.
 * Excel uses SheetJS (XLSX) loaded from CDN in app.html.
 */

(() => {
  'use strict';

  /**
   * Lokasi elektroda Muse pada kepala (sistem 10-20 internasional).
   * Muse S Gen 2 punya 4 elektroda EEG + referensi FPz di dahi tengah.
   */
  const MUSE_ELECTRODES = {
    tp9:  { name: 'TP9',  region: 'Temporal-parietal kiri (belakang telinga kiri)',  lobe: 'Lobus temporal kiri' },
    af7:  { name: 'AF7',  region: 'Anterior-frontal kiri (dahi kiri)',                lobe: 'Korteks prefrontal kiri' },
    af8:  { name: 'AF8',  region: 'Anterior-frontal kanan (dahi kanan)',             lobe: 'Korteks prefrontal kanan' },
    tp10: { name: 'TP10', region: 'Temporal-parietal kanan (belakang telinga kanan)', lobe: 'Lobus temporal kanan' },
  };

  const RecordHistory = {
    init() {
      document.getElementById('histRefresh')?.addEventListener('click', () => this.load());
      // Reload the list when offline recordings finish uploading.
      if (!this._wiredSync) {
        this._wiredSync = true;
        window.addEventListener('recordings-synced', () => { if (document.getElementById('histList')) this.load(); });
      }
      // Opportunistic: if online, push any pending local recordings to the cloud.
      if (typeof RawRecorder !== 'undefined' && RawRecorder.syncLocalRecordings && navigator.onLine !== false) {
        RawRecorder.syncLocalRecordings();
      }
      this.load();
    },

    async load() {
      const host = document.getElementById('histList');
      const summary = document.getElementById('histSummary');
      if (!host) return;
      if (summary) summary.style.display = 'none';
      host.innerHTML = `<div class="rh-state"><i class="fas fa-spinner fa-spin" style="font-size:1.6rem;color:#c4b5fd;margin-bottom:12px;"></i><p>${t('rh.loading')}</p></div>`;
      let items = [];
      try { items = await RawRecorder.listRecordings(); }
      catch (e) {
        host.innerHTML = `<div class="rh-state"><i class="fas fa-triangle-exclamation bigic" style="color:#fca5a5;"></i><p style="color:#b91c1c;">${t('rh.load_failed')}<br><span style="font-size:0.72rem;">${this._esc(e.message)}</span></p><button class="rh-btn" onclick="RecordHistory.load()"><i class="fas fa-rotate"></i> ${t('rh.retry')}</button></div>`;
        return;
      }
      if (!items.length) {
        host.innerHTML = `<div class="rh-state">
            <i class="fas fa-folder-open bigic"></i>
            <p>${t('rh.empty')}<br>${t('rh.empty_sub')}</p>
            <button class="rh-btn primary" onclick="Router.navigate('rawrecorder')"><i class="fas fa-record-vinyl"></i> ${t('rh.start')}</button>
        </div>`;
        return;
      }

      /* summary strip */
      if (summary) {
        const tot = items.reduce((a, it) => a + (it.total || 0), 0);
        const bytes = items.reduce((a, it) => a + (it.bytes || 0), 0);
        this._set('rhCount', items.length);
        this._set('rhFrames', this._fmtNum(tot));
        this._set('rhSize', this._fmtBytes(bytes));
        summary.style.display = 'grid';
      }

      host.innerHTML = `<div class="rh-grid">${items.map(it => this._card(it)).join('')}</div>`;
      this._wireCards(items);
    },

    _card(it) {
      const c = it.counts || {};
      const when = this._fmtDate(it.createdAt) || this._fmtISO(it.startedAt) || '—';
      const dur = it.durationSec != null ? this._fmtDur(it.durationSec) : '—';
      const kb = it.bytes ? this._fmtBytes(it.bytes) : '';
      const chip = (label, n, color) => (n > 0)
        ? `<span class="rh-chip" style="color:${color};background:${color}14;"><span class="d" style="background:${color};"></span>${label} ${this._fmtNum(n)}</span>`
        : '';
      const chips = [
        chip('EEG', c.museRaw, '#8b5cf6'),
        chip('Muse', c.muse, '#7c3aed'),
        chip('Watch', c.scentra, '#0891b2'),
        chip('Galaxy', c.galaxy, '#ef4444'),
      ].filter(Boolean).join('');
      return `
        <div class="rh-card" data-rec="${it.id}">
            <div class="rh-card-top">
                <div class="rh-card-ic"><i class="fas fa-wave-square"></i></div>
                <div class="rh-card-hd">
                    <div class="rh-card-name" title="${this._esc(it.name || t('rh.rec_default'))}">${this._esc(it.name || t('rh.rec_default'))}</div>
                    <div class="rh-card-meta">
                        <span><i class="far fa-clock"></i> ${when}</span>
                        <span class="sep">·</span><span><i class="fas fa-stopwatch"></i> ${dur}</span>
                        ${kb ? `<span class="sep">·</span><span><i class="fas fa-database"></i> ${kb}</span>` : ''}
                    </div>
                    ${(it._local || it.pending) ? `<span class="rh-pending"><i class="fas fa-cloud-arrow-up"></i> ${t('rh.pending')}</span>` : ''}
                </div>
                <span class="rh-frames">${this._fmtNum(it.total || 0)} ${t('rh.frame')}</span>
            </div>
            <div class="rh-chips">${chips || `<span class="rh-chip" style="color:#94a3b8;background:#f1f5f9;">${t('rh.no_streams')}</span>`}</div>
            <div class="rh-card-foot">
                <button class="rh-dl hist-xlsx" data-id="${it.id}" type="button"><i class="fas fa-file-excel"></i> ${t('rh.download_excel')}</button>
                <button class="rh-ico-btn spectra hist-spectra" data-id="${it.id}" type="button" title="${t('rh.spectra')}"><i class="fas fa-chart-line"></i></button>
                <button class="rh-ico-btn hist-json" data-id="${it.id}" type="button" title="${t('rh.download_json')}"><i class="fas fa-file-code"></i></button>
                <button class="rh-ico-btn danger hist-del" data-id="${it.id}" type="button" title="${t('rh.delete')}"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    },

    _wireCards(items) {
      const byId = id => items.find(x => x.id === id);
      document.querySelectorAll('.hist-xlsx').forEach(b => b.addEventListener('click', (e) => this._downloadExcel(e.currentTarget, byId(e.currentTarget.dataset.id))));
      document.querySelectorAll('.hist-spectra').forEach(b => b.addEventListener('click', (e) => this._showSpectra(e.currentTarget, byId(e.currentTarget.dataset.id))));
      document.querySelectorAll('.hist-json').forEach(b => b.addEventListener('click', (e) => this._downloadJSON(e.currentTarget, byId(e.currentTarget.dataset.id))));
      document.querySelectorAll('.hist-del').forEach(b => b.addEventListener('click', (e) => this._delete(e.currentTarget.dataset.id)));
    },

    async _fetch(id) {
      const full = await RawRecorder.loadRecording(id);
      if (!full) throw new Error(t('rh.not_found'));
      return full;
    },

    async _downloadJSON(btn, it) {
      const orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      try {
        const { meta, streams } = await this._fetch(it.id);
        const blob = new Blob([JSON.stringify({ meta, streams }, null, 2)], { type: 'application/json' });
        this._save(blob, `${this._slug(it.name)}-${it.id}.json`);
      } catch (e) { this._alert(t('rh.fail', { msg: e.message }), { danger: true }); }
      btn.disabled = false; btn.innerHTML = orig;
    },

    async _downloadExcel(btn, it) {
      if (typeof XLSX === 'undefined') { this._alert(t('rh.xlsx_missing'), { danger: true }); return; }
      const orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      try {
        const { meta, streams } = await this._fetch(it.id);
        const wb = XLSX.utils.book_new();
        wb.Props = { Title: 'ScentraVN Record', Author: 'ScentraVN Serenity', CreatedDate: new Date() };

        const recName = it.name || t('rh.rec_default');
        const created = this._fmtDate(it.createdAt) || this._fmtISO(it.startedAt) || '';
        const subtitle = created ? `${recName} · ${created}` : recName;

        /* ── Info sheet (titled key/value table) ── */
        const infoAOA = [
          ['ScentraVN Record'],
          [recName],
          [created],
          [],
          [t('rh.x_field'), t('rh.x_value')],
          [t('rh.x_name'), recName],
          ['ID', it.id],
          [t('rh.x_created'), created],
          [t('rh.x_start'), it.startedAt || ''],
          [t('rh.x_end'), it.endedAt || ''],
          [t('rh.x_duration'), it.durationSec != null ? this._fmtDur(it.durationSec) : ''],
          [t('rh.x_total'), it.total || 0],
          [t('rh.x_eeg'), (it.counts || {}).museRaw || 0],
          [t('rh.x_muse'), (it.counts || {}).muse || 0],
          [t('rh.x_scentra'), (it.counts || {}).scentra || 0],
          [t('rh.x_galaxy'), (it.counts || {}).galaxy || 0],
        ];
        const wsInfo = XLSX.utils.aoa_to_sheet(infoAOA);
        wsInfo['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
          { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
        ];
        wsInfo['!cols'] = [{ wch: 22 }, { wch: 48 }];
        XLSX.utils.book_append_sheet(wb, wsInfo, 'Info');

        /* ── Legend sheet: arti channel EEG & band power ── */
        const legendAOA = [
          ['ScentraVN Record — Keterangan Data'],
          [subtitle],
          [],
          ['Elektroda EEG (sistem 10-20)', 'Lokasi pengambilan sinyal', 'Area otak'],
          ...Object.values(MUSE_ELECTRODES).map(e => [e.name, e.region, e.lobe]),
          ['Referensi', 'FPz — dahi tengah', 'Titik referensi (bukan sinyal otak)'],
          [],
          ['Band power EEG (µV²)', 'Rentang frekuensi', 'Kaitan umum'],
          ['delta', '0.5–4 Hz', 'Tidur dalam'],
          ['theta', '4–8 Hz',  'Kantuk, meditasi, memori'],
          ['alpha', '8–13 Hz', 'Rileks, mata tertutup'],
          ['beta',  '13–30 Hz', 'Fokus, waspada, berpikir aktif'],
          ['gamma', '30–44 Hz', 'Pemrosesan kognitif tinggi'],
          ['smr',   '12–15 Hz', 'Sensorimotor rhythm (tenang & fokus)'],
          [],
          ['Sinyal PPG — ScentraVN Watch (MAX30102)', 'Keterangan', 'Catatan'],
          ['ir',   'PPG mentah kanal IR (infra-merah)',  'Pantulan LED inframerah dari jari — sinyal fotopletismografi'],
          ['red',  'PPG mentah kanal RED (merah)',       'Pantulan LED merah — dipakai bersama IR untuk SpO₂'],
          ['hr',   'Detak jantung (BPM)',                'Turunan dari puncak gelombang PPG'],
          ['spo2', 'Saturasi oksigen (%)',               'Turunan rasio IR/RED'],
          ['rmssd', 'HRV RMSSD (ms)',                    'Turunan interval antar-detak PPG'],
        ];
        const wsLegend = XLSX.utils.aoa_to_sheet(legendAOA);
        wsLegend['!merges'] = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } },
          { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } },
        ];
        wsLegend['!cols'] = [{ wch: 24 }, { wch: 42 }, { wch: 34 }];
        XLSX.utils.book_append_sheet(wb, wsLegend, 'Keterangan');

        /* ── EEG raw (long format): one row per sample ── */
        const PPG_CH = { ppg1: 'ambient', ppg2: 'ir', ppg3: 'red' };
        const eegRows = [], motionRows = [], ppgRows = [];
        for (const f of (streams.museRaw || [])) {
          const el = MUSE_ELECTRODES[f.ch];
          if (el) {
            // Channel diberi label baku (AF7/TP9/…) + lokasi elektroda di kepala
            // sehingga pembaca data tahu sinyal ini diambil dari bagian mana.
            (f.samples || []).forEach((uv, i) => eegRows.push({
              t: f.t, channel: el.name, region: el.region, seq: f.seq, i, uV: uv,
            }));
          } else if (PPG_CH[f.ch]) {
            // PPG optik Muse (64 Hz, 24-bit). ppg1=ambient, ppg2=IR, ppg3=merah.
            (f.samples || []).forEach((v, i) => ppgRows.push({ t: f.t, channel: PPG_CH[f.ch], i, value: v }));
          } else {
            (f.samples || []).forEach((s, i) => motionRows.push({ t: f.t, ch: f.ch, i, x: s[0], y: s[1], z: s[2] }));
          }
        }
        if (eegRows.length) XLSX.utils.book_append_sheet(wb, this._titledSheet(eegRows, 'EEG Raw — µV per sample (256 Hz) · channel = posisi elektroda 10-20', subtitle), 'EEG_Raw');
        if (ppgRows.length) XLSX.utils.book_append_sheet(wb, this._titledSheet(ppgRows, 'PPG Raw — sensor optik (64 Hz) · ambient/IR/merah', subtitle), 'PPG_Raw');
        if (motionRows.length) XLSX.utils.book_append_sheet(wb, this._titledSheet(motionRows, 'Muse Motion — accel/gyro', subtitle), 'Muse_Motion');

        /* ── Other streams (arrays flattened to pipe-joined strings) ── */
        this._appendStream(wb, 'Muse_Metrics', streams.muse, subtitle, 'Muse Metrics — band power (µV²) & status');
        this._appendStream(wb, 'ScentraVN', streams.scentra, subtitle, 'ScentraVN Watch — PPG (ir/red), HR, SpO₂, EDA, IMU');
        this._appendStream(wb, 'Galaxy_Watch', streams.galaxy, subtitle);

        if (wb.SheetNames.length === 1) {
          XLSX.utils.book_append_sheet(wb, this._titledSheet([], t('rh.x_empty'), subtitle), 'Empty');
        }
        XLSX.writeFile(wb, `${this._slug(recName)}-${it.id}.xlsx`);
      } catch (e) { console.error(e); this._alert(t('rh.xlsx_failed', { msg: e.message }), { danger: true }); }
      btn.disabled = false; btn.innerHTML = orig;
    },

    /* ── Spectra viewer ───────────────────────────────────────────────
     * Visualises the recorded EEG band powers from the `muse` metrics stream as
     * a multi-line time-series — identical in style to the live EEG chart on the
     * Health page (delta/theta/alpha/beta/gamma, one thin line each). No extra fetch.
     */
    BANDS_ORDER: ['delta', 'theta', 'alpha', 'beta', 'gamma'],
    BAND_META: {
      delta: { color: '#3b82f6', label: 'Delta' },
      theta: { color: '#8b5cf6', label: 'Theta' },
      alpha: { color: '#10b981', label: 'Alpha' },
      beta:  { color: '#f59e0b', label: 'Beta' },
      gamma: { color: '#ef4444', label: 'Gamma' },
    },
    MAX_POINTS: 360,    // time-series points after bucket-downsampling

    // Open the dedicated spectra page (chart + noise editor) for this recording.
    _showSpectra(btn, it) {
      if (typeof Chart === 'undefined') { this._alert(t('rh.chart_missing'), { danger: true }); return; }
      if (typeof SpectraEditor === 'undefined' || typeof Router === 'undefined') {
        this._alert(t('rh.fail', { msg: 'editor unavailable' }), { danger: true });
        return;
      }
      SpectraEditor.open(it.id);
    },

    /**
     * Build per-band time-series from the recorded `muse` metrics frames.
     * Returns the bands actually present plus a bucket-downsampled value series
     * per band (≤ MAX_POINTS) so long sessions still render smoothly.
     */
    _computeBands(muse) {
      const frames = (muse || []).filter(f => f && f.t != null);
      const bands = [], raw = {};
      for (const b of this.BANDS_ORDER) {
        const vals = frames.map(f => Number(f[b]));
        if (!vals.some(v => Number.isFinite(v))) continue;
        bands.push(b);
        raw[b] = vals.map(v => (Number.isFinite(v) ? v : null));
      }
      if (!bands.length) return { count: frames.length, bands: [], series: {}, times: [] };

      const t0 = frames[0].t;
      const n = frames.length;
      const step = Math.max(1, Math.ceil(n / this.MAX_POINTS));
      const series = {}, times = [];
      bands.forEach(b => (series[b] = []));
      for (let i = 0; i < n; i += step) {
        const end = Math.min(i + step, n);
        let ts = 0;
        for (let j = i; j < end; j++) ts += (frames[j].t - t0);
        times.push((ts / (end - i)) / 1000);          // bucket mean elapsed seconds
        for (const b of bands) {
          let s = 0, c = 0;
          for (let j = i; j < end; j++) { const v = raw[b][j]; if (v != null) { s += v; c++; } }
          series[b].push(c ? s / c : null);
        }
      }
      return { count: frames.length, bands, series, times };
    },

    /** Elapsed seconds → "m:ss" clock label for the time axis. */
    _fmtClock(sec) {
      const s = Math.max(0, Math.round(sec));
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    },

    /**
     * Build a worksheet with a "ScentraVN Record" banner above the data table.
     * The banner rows are merged across all data columns; columns auto-size.
     */
    _titledSheet(rows, title, subtitle) {
      const headers = (rows && rows.length) ? Object.keys(rows[0]) : ['—'];
      const ncol = Math.max(1, headers.length);
      const banner = [['ScentraVN Record']];
      if (title) banner.push([title]);
      if (subtitle) banner.push([subtitle]);
      banner.push([]);                                   // spacer row
      const headerRow = banner.length;                  // 0-based row for the table header
      const ws = XLSX.utils.aoa_to_sheet(banner);
      if (rows && rows.length) {
        XLSX.utils.sheet_add_json(ws, rows, { origin: { r: headerRow, c: 0 } });
      } else {
        XLSX.utils.sheet_add_aoa(ws, [[t('rh.x_empty')]], { origin: { r: headerRow, c: 0 } });
      }
      const merges = [];
      for (let r = 0; r < banner.length - 1; r++) merges.push({ s: { r, c: 0 }, e: { r, c: ncol - 1 } });
      ws['!merges'] = merges;
      ws['!cols'] = this._autoCols(rows || [], headers);
      ws['!freeze'] = { xSplit: 0, ySplit: headerRow + 1 };
      return ws;
    },

    /** Estimate sensible column widths from header + sample of values. */
    _autoCols(rows, headers) {
      return headers.map(h => {
        let w = String(h).length;
        const lim = Math.min(rows.length, 200);
        for (let i = 0; i < lim; i++) {
          const v = rows[i] ? rows[i][h] : '';
          const len = v == null ? 0 : String(v).length;
          if (len > w) w = len;
        }
        return { wch: Math.min(42, Math.max(9, w + 2)) };
      });
    },

    _appendStream(wb, name, arr, subtitle, title) {
      if (!arr || !arr.length) return;
      const rows = arr.map(r => {
        const o = {};
        for (const k of Object.keys(r)) o[k] = Array.isArray(r[k]) ? r[k].join('|') : r[k];
        return o;
      });
      XLSX.utils.book_append_sheet(wb, this._titledSheet(rows, title || name.replace(/_/g, ' '), subtitle), name.slice(0, 31));
    },

    async _delete(id) {
      if (!await this._confirm(t('rh.confirm_delete'), { danger: true, confirmText: t('rh.delete') || 'Hapus', cancelText: 'Batal' })) return;
      try { await RawRecorder.deleteRecording(id); this.load(); }
      catch (e) { this._alert(t('rh.delete_failed', { msg: e.message }), { danger: true }); }
    },

    _save(blob, filename) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    /* helpers */
    _set(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; },
    async _confirm(msg, opts) {
      if (typeof Utils !== 'undefined' && Utils.confirmModal) return await Utils.confirmModal(msg, opts || {});
      return confirm(msg);
    },
    _alert(msg, opts) {
      if (typeof Utils !== 'undefined' && Utils.alertModal) return Utils.alertModal(msg, opts || {});
      alert(msg);
    },
    _esc(s) { return String(s == null ? '' : s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])); },
    _slug(s) { return String(s || 'rekaman').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'rekaman'; },
    _locale() { return (typeof I18n !== 'undefined' && I18n.currentLang === 'en') ? 'en-US' : 'id-ID'; },
    _fmtNum(n) { return (Number(n) || 0).toLocaleString(this._locale()); },
    _fmtBytes(b) {
      b = Number(b) || 0;
      if (b < 1024) return b + ' B';
      if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
      return (b / 1024 / 1024).toFixed(1) + ' MB';
    },
    _fmtDur(s) { if (s < 60) return `${s}s`; const m = Math.floor(s / 60); return `${m}m ${s % 60}s`; },
    _fmtISO(iso) { if (!iso) return null; try { return new Date(iso).toLocaleString(this._locale()); } catch (_) { return null; } },
    _fmtDate(ts) {
      if (!ts) return null;
      try { const d = ts.toDate ? ts.toDate() : new Date(ts); return d.toLocaleString(this._locale()); }
      catch (_) { return null; }
    },
  };

  if (typeof window !== 'undefined') window.RecordHistory = RecordHistory;
})();
