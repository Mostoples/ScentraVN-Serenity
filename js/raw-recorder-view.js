/**
 * ScentraVN Serenity — RAW Recorder View Controller
 *
 * Controls:
 *   ▶ Mulai  → start()                       (morphs to ⏸ Jeda, reveals ⏹ Stop)
 *   ⏸ Jeda   → pause() + saveDraft()          (checkpoint to device / IndexedDB)
 *   ▶ Lanjut → resume()
 *   ⏹ Stop   → stop() + auto-save to Firestore + clear draft
 */

(() => {
  'use strict';

  const RawRecorderView = {
    _timer: null,
    _busy: false,
    _live: { museRaw: {}, muse: null, scentra: null, galaxy: null },
    _subs: [],

    /* Muse signal-stability tracking */
    _museStableSince: null,
    _museReady: false,
    _museReadyNotified: false,
    STABLE_MS: 2500,          // signal must stay good this long to be "ready"
    STD_MIN_UV: 1.0,          // below → flat/disconnected lead
    STD_MAX_UV: 60.0,         // above → motion/railing artefact

    init() {
      if (typeof RawRecorder === 'undefined') return;
      this._live = { museRaw: {}, muse: null, scentra: null, galaxy: null };
      this._subs = [];
      this._wireLive();
      this._wireControls();
      RawRecorder.onUpdate((s, d) => this._render(s, d));
      this._render(RawRecorder.getSummary(), RawRecorder.devices);
      this._syncControls();
      this._checkDraft();
      this._timer = setInterval(() => {
        this._render(RawRecorder.getSummary(), RawRecorder.devices);
        this._evaluateMuseStability();
      }, 1000);
    },

    _el(id) { return document.getElementById(id); },
    _toast(msg, type) {
      if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast(msg, type || 'info');
    },
    /** Branded confirm dialog (no native Chrome popup). */
    async _confirm(msg, opts) {
      if (typeof Utils !== 'undefined' && Utils.confirmModal) return await Utils.confirmModal(msg, opts || {});
      return confirm(msg);
    },
    /** Human-friendly default recording name. */
    _recName() {
      if (typeof RawRecorder !== 'undefined' && RawRecorder.prettyName) return RawRecorder.prettyName();
      return `ScentraVN Record · ${new Date().toLocaleString(this._locale())}`;
    },

    /* ── Live raw-data monitor (independent of recording) ── */
    _wireLive() {
      if (typeof MuseEEG !== 'undefined') {
        const onRaw = (f) => {
          if (['tp9', 'af7', 'af8', 'tp10'].includes(f.ch) && f.samples?.length) {
            this._live.museRaw[f.ch] = f.samples[f.samples.length - 1];
          }
        };
        const onMet = (m) => {
          const p = m.powers || {};
          this._live.muse = { delta: p.delta, theta: p.theta, alpha: p.alpha, beta: p.beta, gamma: p.gamma, battery: m.battery };
        };
        if (MuseEEG.onRaw) { MuseEEG.onRaw(onRaw); this._subs.push(() => MuseEEG.offRaw && MuseEEG.offRaw(onRaw)); }
        MuseEEG.onMetrics(onMet); this._subs.push(() => MuseEEG.offMetrics && MuseEEG.offMetrics(onMet));
      }
      if (typeof BLEConnection !== 'undefined' && BLEConnection.onDataUpdate) {
        const onData = (d) => { this._live.scentra = d; };
        BLEConnection.onDataUpdate(onData);
        this._subs.push(() => BLEConnection.offDataUpdate && BLEConnection.offDataUpdate(onData));
      }
      if (typeof ScentraLive !== 'undefined' && ScentraLive.onUpdate) {
        ScentraLive.start();
        const unsub = ScentraLive.onUpdate((live) => { this._live.galaxy = live && live.galaxyWatch; });
        if (typeof unsub === 'function') this._subs.push(unsub);
      }
    },

    _connState() {
      // Recorder treats Muse as connected ONLY on a genuine BLE link, never in
      // simulation, so the live monitor and recordings reflect real data.
      const muse = (typeof MuseEEG !== 'undefined') && MuseEEG.isConnected && !MuseEEG.simulationMode;
      const scentra = (typeof BLEConnection !== 'undefined') && BLEConnection.isConnected && BLEConnection.isConnected();
      const galaxy = !!(this._live.galaxy && this._live.galaxy.connected);
      return { muse, scentra, galaxy };
    },

    /* ── Muse signal stability → "siap merekam" notification ── */

    /** Standard deviation of the last N samples of a Muse channel buffer. */
    _chanStd(ch, n = 256) {
      if (typeof MuseEEG === 'undefined' || !MuseEEG.buffers) return null;
      const b = MuseEEG.buffers[ch];
      if (!b || b.length < 64) return null;            // not enough samples yet
      const w = b.slice(-n);
      const mean = w.reduce((a, x) => a + x, 0) / w.length;
      const varc = w.reduce((a, x) => a + (x - mean) * (x - mean), 0) / w.length;
      return Math.sqrt(varc);
    },

    /** True when a channel's amplitude variance sits in a plausible EEG range. */
    _chanGood(ch) {
      const sd = this._chanStd(ch);
      return sd != null && sd >= this.STD_MIN_UV && sd <= this.STD_MAX_UV;
    },

    /**
     * Detect a stable, good-quality Muse signal and, once it holds for
     * STABLE_MS, flag readiness + notify the user that recording can start.
     */
    _evaluateMuseStability() {
      const realConnected = (typeof MuseEEG !== 'undefined') && MuseEEG.isConnected && !MuseEEG.simulationMode;
      const simulating = (typeof MuseEEG !== 'undefined') && MuseEEG.simulationMode;

      if (!realConnected) {
        this._museStableSince = null;
        this._museReady = false;
        this._museReadyNotified = false;
        this._renderReadyBadge(simulating ? 'sim' : 'off');
        return;
      }

      // Require both frontal leads (AF7/AF8) good, plus at least one temporal.
      const frontalGood = this._chanGood('af7') && this._chanGood('af8');
      const temporalGood = this._chanGood('tp9') || this._chanGood('tp10');
      const stableNow = frontalGood && temporalGood;

      if (stableNow) {
        if (!this._museStableSince) this._museStableSince = Date.now();
        const held = Date.now() - this._museStableSince;
        if (held >= this.STABLE_MS) {
          if (!this._museReady) {
            this._museReady = true;
            if (!this._museReadyNotified) {
              this._museReadyNotified = true;
              this._toast(t('rr.muse_ready') || 'Sinyal Muse stabil — siap merekam', 'success');
            }
          }
          this._renderReadyBadge('ready');
        } else {
          this._renderReadyBadge('stabilizing');
        }
      } else {
        // Signal lost quality — reset so the user is re-notified next time.
        this._museStableSince = null;
        this._museReady = false;
        this._museReadyNotified = false;
        this._renderReadyBadge('stabilizing');
      }
    },

    /** Lazily create the readiness badge inside the hero, below the sub-text. */
    _ensureReadyBadge() {
      let badge = this._el('rawReadyBadge');
      if (badge) return badge;
      const sub = this._el('rawRawCount');
      if (!sub || !sub.parentNode) return null;
      badge = document.createElement('div');
      badge.id = 'rawReadyBadge';
      badge.style.cssText = 'display:none;align-items:center;justify-content:center;gap:7px;' +
        'margin:8px auto 0;padding:6px 14px;border-radius:99px;font-size:0.74rem;font-weight:700;' +
        'max-width:max-content;transition:background .2s,color .2s;';
      sub.parentNode.insertBefore(badge, sub.nextSibling);
      return badge;
    },

    _renderReadyBadge(state) {
      const badge = this._ensureReadyBadge();
      if (!badge) return;
      const styles = {
        off:         { show: false },
        sim:         { show: true, bg: 'rgba(148,163,184,.16)', fg: '#475569', ic: 'fa-flask', tx: t('rr.muse_sim') || 'Mode simulasi — bukan data asli' },
        stabilizing: { show: true, bg: 'rgba(245,158,11,.16)', fg: '#b45309', ic: 'fa-wave-square', tx: t('rr.muse_stabilizing') || 'Menstabilkan sinyal Muse…' },
        ready:       { show: true, bg: 'rgba(16,185,129,.16)', fg: '#047857', ic: 'fa-circle-check', tx: t('rr.muse_ready') || 'Sinyal Muse stabil — siap merekam' },
      }[state] || { show: false };

      if (!styles.show) { badge.style.display = 'none'; return; }
      badge.style.display = 'inline-flex';
      badge.style.background = styles.bg;
      badge.style.color = styles.fg;
      badge.innerHTML = `<i class="fas ${styles.ic}"></i> ${styles.tx}`;
    },

    /* ── Record / Pause / Stop ── */
    _syncControls() {
      const rec = RawRecorder.recording, paused = RawRecorder.paused;
      const btn = this._el('rawRecordBtn'), icon = btn?.querySelector('i'), label = this._el('rawRecordLabel');
      const stop = this._el('rawStopBtn'), stopLabel = this._el('rawStopLabel');
      const pill = this._el('rawStatusPill');

      if (icon) icon.className = (rec && !paused) ? 'fas fa-pause' : 'fas fa-play';
      if (btn) btn.classList.toggle('is-rec', rec && !paused);
      if (label) label.textContent = !rec ? t('rr.lbl_start') : (paused ? t('rr.lbl_resume') : t('rr.lbl_pause'));

      const showStop = rec;
      if (stop) stop.style.display = showStop ? 'flex' : 'none';
      if (stopLabel) stopLabel.style.display = showStop ? 'block' : 'none';

      if (pill) {
        pill.classList.remove('rec', 'pause');
        if (rec && !paused) pill.classList.add('rec');
        else if (paused) pill.classList.add('pause');
      }
      this._setText('rawStatus', !rec ? t('rr.status_ready') : (paused ? t('rr.status_paused') : t('rr.status_recording')));
    },

    _wireControls() {
      this._el('rawRecordBtn')?.addEventListener('click', async () => {
        if (this._busy) return;
        if (!RawRecorder.recording) {
          RawRecorder.start();
          this._hideDraft();
        } else if (RawRecorder.paused) {
          RawRecorder.resume();
        } else {
          RawRecorder.pause();
          this._syncControls();
          const ok = await RawRecorder.saveDraft();
          this._toast(ok ? t('rr.toast_draft_saved') : t('rr.toast_draft_failed'), ok ? 'success' : 'error');
        }
        this._syncControls();
      });

      this._el('rawStopBtn')?.addEventListener('click', () => this._stopAndSave());
    },

    async _stopAndSave() {
      if (this._busy) return;
      const sum = RawRecorder.stop();
      this._syncControls();
      if (sum.total === 0) {
        await RawRecorder.clearDraft();
        this._toast(t('rr.toast_empty'), 'warning');
        return;
      }
      const btn = this._el('rawStopBtn');
      this._busy = true;
      const orig = btn ? btn.innerHTML : '';
      if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      this._setText('rawStatus', t('rr.status_saving'));

      const name = this._recName();
      const id = await RawRecorder.saveToFirestore({ name });

      if (btn) btn.innerHTML = orig;
      this._busy = false;

      if (id) {
        await RawRecorder.clearDraft();
        this._setText('rawStatus', t('rr.status_saved'));
        this._toast(t('rr.toast_saved', { n: sum.total }), 'success');
        if (await this._confirm(t('rr.confirm_open_history'), { title: t('rr.history'), confirmText: t('rr.history') || 'Riwayat', cancelText: 'Nanti' })) Router.navigate('recordhistory');
      } else {
        this._setText('rawStatus', t('rr.status_failed'));
        // Keep a device-side checkpoint so data isn't lost
        await RawRecorder.saveDraft();
        this._toast(t('rr.toast_upload_failed'), 'error');
        this._checkDraft();
      }
    },

    /* ── Draft (device storage) banner ── */
    async _checkDraft() {
      if (RawRecorder.recording) return;
      const d = await RawRecorder.getDraft();
      const banner = this._el('rawDraftBanner');
      if (!d || !banner) return;
      const total = d.total || 0;
      const when = d.savedAt ? new Date(d.savedAt).toLocaleString(this._locale()) : '';
      this._setText('rawDraftText', t('rr.draft_text', { n: this._fmtNum(total), dur: d.durationSec || 0, when }));
      banner.style.display = 'flex';

      this._el('rawDraftSave').onclick = async (e) => {
        const b = e.currentTarget; const o = b.innerHTML; b.disabled = true; b.innerHTML = '…';
        await RawRecorder.restoreDraft();
        const id = await RawRecorder.saveToFirestore({ name: this._recName() });
        b.disabled = false; b.innerHTML = o;
        if (id) { await RawRecorder.clearDraft(); this._hideDraft(); if (await this._confirm(t('rr.confirm_open_history2'), { title: t('rr.history'), confirmText: t('rr.history') || 'Riwayat', cancelText: 'Nanti' })) Router.navigate('recordhistory'); }
      };
      this._el('rawDraftDiscard').onclick = async () => {
        if (!await this._confirm(t('rr.confirm_discard'), { danger: true, confirmText: t('rr.draft_discard') || 'Buang', cancelText: 'Batal' })) return;
        await RawRecorder.clearDraft();
        this._hideDraft();
      };
    },
    _hideDraft() { const b = this._el('rawDraftBanner'); if (b) b.style.display = 'none'; },

    /* ── Render ── */
    _render(summary, devices) {
      this._setText('rawDuration', this._fmtClock(summary.durationSec));
      this._setText('rawTotal', this._fmtNum(summary.total));
      this._setText('rawStatSize', this._fmtBytes(this._estimateBytes(summary.counts)));

      const conn = this._connState();
      const transports = { muse: t('rr.conn_bluetooth'), scentra: t('rr.conn_bluetooth'), galaxy: t('rr.conn_app') };
      let connected = 0;

      for (const id of ['muse', 'scentra', 'galaxy']) {
        const on = conn[id];
        if (on) connected++;
        const card = this._el(`rawDevCard-${id}`);
        const status = this._el(`rawDev-${id}-status`);
        const count = this._el(`rawDev-${id}-count`);
        if (card) card.classList.toggle('on', on);
        if (status) {
          status.classList.toggle('on', on);
          status.innerHTML = `<span class="rr-dot"></span> ${on ? t('rr.connected') + ' · ' + transports[id] : t('rr.disconnected')}`;
        }
        if (count) {
          const c = id === 'muse' ? (summary.counts.muse + summary.counts.museRaw) : summary.counts[id];
          count.textContent = `${this._fmtNum(c)} ${t('rr.frame')}`;
        }
        this._renderLive(id, on);
      }
      this._setText('rawStatDev', `${connected}/3`);

      this._setText('rawRawCount', summary.total > 0
        ? t('rr.sub_packets', { eeg: this._fmtNum(summary.counts.museRaw), watch: this._fmtNum(summary.counts.scentra), galaxy: this._fmtNum(summary.counts.galaxy) })
        : (connected ? t('rr.ready_press') : t('rr.no_device')));
    },

    /* Render the live raw-value cells for one device. */
    _renderLive(id, connected) {
      const grid = this._el(`rawLive-${id}`);
      const hint = this._el(`rawHint-${id}`);
      if (!grid) return;

      if (!connected) {
        grid.innerHTML = '';
        if (hint) {
          hint.style.display = 'flex';
          hint.innerHTML = id === 'galaxy'
            ? `<i class="fas fa-mobile-screen-button"></i> ${t('rr.hint_galaxy')}`
            : `<i class="fas fa-circle-info"></i> ${t('rr.hint_not_connected')} <a onclick="Router.navigate('health')">${t('rr.hint_connect_link')}</a>`;
        }
        return;
      }
      if (hint) hint.style.display = 'none';

      let pairs = [];
      if (id === 'muse') {
        const r = this._live.museRaw || {}, m = this._live.muse || {};
        pairs = [
          ['TP9', this._uv(r.tp9)], ['AF7', this._uv(r.af7)], ['AF8', this._uv(r.af8)], ['TP10', this._uv(r.tp10)],
          ['δ', this._n(m.delta, 1)], ['θ', this._n(m.theta, 1)], ['α', this._n(m.alpha, 1)], ['β', this._n(m.beta, 1)], ['γ', this._n(m.gamma, 1)],
          ['Bat', m.battery != null ? Math.round(m.battery) + '%' : '—'],
        ];
      } else if (id === 'scentra') {
        const d = this._live.scentra || {};
        const fin = d.finger !== false;
        pairs = [
          ['HR', fin && d.hr ? d.hr : '—'], ['SpO₂', fin && d.spo2 ? d.spo2 : '—'],
          ['IR', this._n(d.ir, 0)], ['RED', this._n(d.red, 0)],
          [t('rr.cell_temp'), this._n(d.bt, 1)], ['GSR', this._n(d.gsrRaw != null ? d.gsrRaw : d.gsr, 0)],
          ['AcX', this._n(d.ax, 2)], ['AcY', this._n(d.ay, 2)], ['AcZ', this._n(d.az, 2)],
        ];
      } else {
        const g = this._live.galaxy || {};
        pairs = [
          ['BPM', g.bpm != null ? g.bpm : '—'],
          [t('rr.cell_stress'), (g.stress && g.stress.value != null && isFinite(g.stress.value)) ? Math.round(g.stress.value) : '—'],
          ['Bat', g.battery != null ? Math.round(g.battery) + '%' : '—'],
        ];
      }
      // Kolom yang membagi rata jumlah sel agar rapi (tanpa sisa baris pincang)
      const cols = { muse: 5, scentra: 3, galaxy: 3 }[id] || 5;
      grid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
      grid.innerHTML = pairs.map(([k, v]) =>
        `<div class="rr-cell"><div class="k">${k}</div><div class="v${(v !== '—' && v !== '') ? ' live' : ''}">${v === '' || v == null ? '—' : v}</div></div>`
      ).join('');
    },

    _uv(v) { return (v == null || !isFinite(v)) ? '—' : Math.round(v); },
    _n(v, d) { return (v == null || !isFinite(v)) ? '—' : Number(v).toFixed(d); },

    _fmtClock(s) {
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      const p = n => String(n).padStart(2, '0');
      return h > 0 ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
    },
    _locale() { return (typeof I18n !== 'undefined' && I18n.currentLang === 'en') ? 'en-US' : 'id-ID'; },
    _fmtNum(n) { return (n || 0).toLocaleString(this._locale()); },
    /* Perkiraan ukuran data live (byte rata-rata per jenis frame). */
    _estimateBytes(c) {
      c = c || {};
      return (c.museRaw || 0) * 60 + (c.muse || 0) * 150 + (c.scentra || 0) * 130 + (c.galaxy || 0) * 80;
    },
    _fmtBytes(b) {
      b = Number(b) || 0;
      if (b < 1024) return b + ' B';
      if (b < 1024 * 1024) return (b / 1024).toFixed(0) + ' KB';
      return (b / 1024 / 1024).toFixed(1) + ' MB';
    },
    _setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; },

    destroy() {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      (this._subs || []).forEach(fn => { try { fn(); } catch (_) {} });
      this._subs = [];
    }
  };

  if (typeof window !== 'undefined') window.RawRecorderView = RawRecorderView;
})();
