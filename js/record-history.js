/**
 * ScentraVN Serenity — Recording History Controller
 *
 * Lists saved RAW recordings from Firestore and lets the user download each
 * one as an Excel workbook (multi-sheet, raw data) or JSON, or delete it.
 * Excel uses SheetJS (XLSX) loaded from CDN in app.html.
 */

(() => {
  'use strict';

  const RecordHistory = {
    init() {
      document.getElementById('histRefresh')?.addEventListener('click', () => this.load());
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
                </div>
                <span class="rh-frames">${this._fmtNum(it.total || 0)} ${t('rh.frame')}</span>
            </div>
            <div class="rh-chips">${chips || `<span class="rh-chip" style="color:#94a3b8;background:#f1f5f9;">${t('rh.no_streams')}</span>`}</div>
            <div class="rh-card-foot">
                <button class="rh-dl hist-xlsx" data-id="${it.id}" type="button"><i class="fas fa-file-excel"></i> ${t('rh.download_excel')}</button>
                <button class="rh-ico-btn hist-json" data-id="${it.id}" type="button" title="${t('rh.download_json')}"><i class="fas fa-file-code"></i></button>
                <button class="rh-ico-btn danger hist-del" data-id="${it.id}" type="button" title="${t('rh.delete')}"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    },

    _wireCards(items) {
      const byId = id => items.find(x => x.id === id);
      document.querySelectorAll('.hist-xlsx').forEach(b => b.addEventListener('click', (e) => this._downloadExcel(e.currentTarget, byId(e.currentTarget.dataset.id))));
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
      } catch (e) { alert(t('rh.fail', { msg: e.message })); }
      btn.disabled = false; btn.innerHTML = orig;
    },

    async _downloadExcel(btn, it) {
      if (typeof XLSX === 'undefined') { alert(t('rh.xlsx_missing')); return; }
      const orig = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      try {
        const { meta, streams } = await this._fetch(it.id);
        const wb = XLSX.utils.book_new();

        /* Info sheet */
        const info = [
          [t('rh.x_name'), it.name || ''],
          ['ID', it.id],
          [t('rh.x_created'), this._fmtDate(it.createdAt) || ''],
          [t('rh.x_start'), it.startedAt || ''],
          [t('rh.x_end'), it.endedAt || ''],
          [t('rh.x_duration'), it.durationSec || 0],
          [t('rh.x_total'), it.total || 0],
          [t('rh.x_eeg'), (it.counts || {}).museRaw || 0],
          [t('rh.x_muse'), (it.counts || {}).muse || 0],
          [t('rh.x_scentra'), (it.counts || {}).scentra || 0],
          [t('rh.x_galaxy'), (it.counts || {}).galaxy || 0],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[t('rh.x_field'), t('rh.x_value')], ...info]), 'Info');

        /* EEG raw (long format): one row per sample */
        const eegRows = [], motionRows = [];
        for (const f of (streams.museRaw || [])) {
          if (['tp9', 'af7', 'af8', 'tp10'].includes(f.ch)) {
            (f.samples || []).forEach((uv, i) => eegRows.push({ t: f.t, ch: f.ch, seq: f.seq, i, uV: uv }));
          } else {
            (f.samples || []).forEach((s, i) => motionRows.push({ t: f.t, ch: f.ch, i, x: s[0], y: s[1], z: s[2] }));
          }
        }
        if (eegRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(eegRows), 'EEG_Raw');
        if (motionRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(motionRows), 'Muse_Motion');

        /* Other streams as-is (arrays flattened to pipe-joined strings) */
        this._appendStream(wb, 'Muse_Metrics', streams.muse);
        this._appendStream(wb, 'ScentraVN', streams.scentra);
        this._appendStream(wb, 'Galaxy_Watch', streams.galaxy);

        if (wb.SheetNames.length === 1) {
          XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[t('rh.x_empty')]]), 'Empty');
        }
        XLSX.writeFile(wb, `${this._slug(it.name)}-${it.id}.xlsx`);
      } catch (e) { console.error(e); alert(t('rh.xlsx_failed', { msg: e.message })); }
      btn.disabled = false; btn.innerHTML = orig;
    },

    _appendStream(wb, name, arr) {
      if (!arr || !arr.length) return;
      const rows = arr.map(r => {
        const o = {};
        for (const k of Object.keys(r)) o[k] = Array.isArray(r[k]) ? r[k].join('|') : r[k];
        return o;
      });
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), name.slice(0, 31));
    },

    async _delete(id) {
      if (!confirm(t('rh.confirm_delete'))) return;
      try { await RawRecorder.deleteRecording(id); this.load(); }
      catch (e) { alert(t('rh.delete_failed', { msg: e.message })); }
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
