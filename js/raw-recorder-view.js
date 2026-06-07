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
      this._timer = setInterval(() => this._render(RawRecorder.getSummary(), RawRecorder.devices), 1000);
    },

    _el(id) { return document.getElementById(id); },
    _toast(msg, type) {
      if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast(msg, type || 'info');
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
      const muse = (typeof MuseEEG !== 'undefined') && (MuseEEG.isConnected || MuseEEG.simulationMode);
      const scentra = (typeof BLEConnection !== 'undefined') && BLEConnection.isConnected && BLEConnection.isConnected();
      const galaxy = !!(this._live.galaxy && this._live.galaxy.connected);
      return { muse, scentra, galaxy };
    },

    /* ── Record / Pause / Stop ── */
    _syncControls() {
      const rec = RawRecorder.recording, paused = RawRecorder.paused;
      const btn = this._el('rawRecordBtn'), icon = btn?.querySelector('i'), label = this._el('rawRecordLabel');
      const stop = this._el('rawStopBtn'), stopLabel = this._el('rawStopLabel');
      const pill = this._el('rawStatusPill');

      if (icon) icon.className = (rec && !paused) ? 'fas fa-pause' : 'fas fa-play';
      if (btn) btn.classList.toggle('is-rec', rec && !paused);
      if (label) label.textContent = !rec ? 'Mulai' : (paused ? 'Lanjut' : 'Jeda');

      const showStop = rec;
      if (stop) stop.style.display = showStop ? 'flex' : 'none';
      if (stopLabel) stopLabel.style.display = showStop ? 'block' : 'none';

      if (pill) {
        pill.classList.remove('rec', 'pause');
        if (rec && !paused) pill.classList.add('rec');
        else if (paused) pill.classList.add('pause');
      }
      this._setText('rawStatus', !rec ? 'Siap merekam' : (paused ? 'Dijeda' : 'Merekam'));
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
          this._toast(ok ? 'Cadangan sementara tersimpan di perangkat' : 'Gagal menyimpan cadangan', ok ? 'success' : 'error');
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
        this._toast('Rekaman kosong — tidak ada data masuk. Pastikan perangkat terhubung.', 'warning');
        return;
      }
      const btn = this._el('rawStopBtn');
      this._busy = true;
      const orig = btn ? btn.innerHTML : '';
      if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      this._setText('rawStatus', 'Menyimpan ke cloud…');

      const name = `Rekaman ${new Date().toLocaleString('id-ID')}`;
      const id = await RawRecorder.saveToFirestore({ name });

      if (btn) btn.innerHTML = orig;
      this._busy = false;

      if (id) {
        await RawRecorder.clearDraft();
        this._setText('rawStatus', 'Tersimpan ✓');
        this._toast(`Tersimpan ke Firestore (${sum.total} frame)`, 'success');
        if (confirm('Rekaman tersimpan ke cloud. Buka halaman Riwayat sekarang?')) Router.navigate('recordhistory');
      } else {
        this._setText('rawStatus', 'Gagal menyimpan');
        // Keep a device-side checkpoint so data isn't lost
        await RawRecorder.saveDraft();
        this._toast('Gagal unggah ke cloud — data disimpan sementara di perangkat.', 'error');
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
      const when = d.savedAt ? new Date(d.savedAt).toLocaleString('id-ID') : '';
      this._setText('rawDraftText', `Cadangan tersimpan di perangkat — ${total} frame · ${d.durationSec || 0}s · ${when}`);
      banner.style.display = 'flex';

      this._el('rawDraftSave').onclick = async (e) => {
        const b = e.currentTarget; const o = b.innerHTML; b.disabled = true; b.innerHTML = '…';
        await RawRecorder.restoreDraft();
        const id = await RawRecorder.saveToFirestore({ name: `Rekaman (pulih) ${new Date().toLocaleString('id-ID')}` });
        b.disabled = false; b.innerHTML = o;
        if (id) { await RawRecorder.clearDraft(); this._hideDraft(); if (confirm('Tersimpan ke cloud. Buka Riwayat?')) Router.navigate('recordhistory'); }
      };
      this._el('rawDraftDiscard').onclick = async () => {
        if (!confirm('Buang cadangan sementara di perangkat?')) return;
        await RawRecorder.clearDraft();
        this._hideDraft();
      };
    },
    _hideDraft() { const b = this._el('rawDraftBanner'); if (b) b.style.display = 'none'; },

    /* ── Render ── */
    _render(summary, devices) {
      this._setText('rawDuration', this._fmtClock(summary.durationSec));
      this._setText('rawTotal', this._fmtNum(summary.total));
      this._setText('rawStatRaw', this._fmtNum(summary.counts.museRaw));

      const conn = this._connState();
      const transports = { muse: 'Bluetooth', scentra: 'Bluetooth', galaxy: 'Aplikasi' };
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
          status.innerHTML = `<span class="rr-dot"></span> ${on ? 'Terhubung · ' + transports[id] : 'Terputus'}`;
        }
        if (count) {
          const c = id === 'muse' ? (summary.counts.muse + summary.counts.museRaw) : summary.counts[id];
          count.textContent = `${this._fmtNum(c)} frame`;
        }
        this._renderLive(id, on);
      }
      this._setText('rawStatDev', `${connected}/3`);

      this._setText('rawRawCount', summary.total > 0
        ? `${this._fmtNum(summary.counts.museRaw)} paket EEG · ${this._fmtNum(summary.counts.scentra)} watch · ${this._fmtNum(summary.counts.galaxy)} galaxy`
        : (connected ? 'Perangkat siap — tekan ▶ untuk merekam' : 'Belum ada perangkat'));
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
            ? `<i class="fas fa-mobile-screen-button"></i> Buka aplikasi ScentraVN untuk mengirim data.`
            : `<i class="fas fa-circle-info"></i> Belum terhubung. <a onclick="Router.navigate('health')">Sambungkan di Health →</a>`;
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
          ['Suhu', this._n(d.bt, 1)], ['GSR', this._n(d.gsrRaw != null ? d.gsrRaw : d.gsr, 0)],
          ['AcX', this._n(d.ax, 2)], ['AcY', this._n(d.ay, 2)], ['AcZ', this._n(d.az, 2)],
        ];
      } else {
        const g = this._live.galaxy || {};
        pairs = [
          ['BPM', g.bpm != null ? g.bpm : '—'],
          ['Stres', g.stress && g.stress.level && g.stress.level !== 'unavailable' ? g.stress.level : '—'],
          ['Bat', g.battery != null ? Math.round(g.battery) + '%' : '—'],
        ];
      }
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
    _fmtNum(n) { return (n || 0).toLocaleString('id-ID'); },
    _setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; },

    destroy() {
      if (this._timer) { clearInterval(this._timer); this._timer = null; }
      (this._subs || []).forEach(fn => { try { fn(); } catch (_) {} });
      this._subs = [];
    }
  };

  if (typeof window !== 'undefined') window.RawRecorderView = RawRecorderView;
})();
