/**
 * ScentraVN Serenity — RAW Recorder View Controller
 * Wires the recording UI to RawRecorder.
 */

(() => {
  'use strict';

  const RawRecorderView = {
    _timer: null,

    init() {
      if (typeof RawRecorder === 'undefined') return;
      this._wireDevices();
      this._wireRecord();
      this._wireExports();
      RawRecorder.onUpdate((s, d) => this._render(s, d));
      this._render(RawRecorder.getSummary(), RawRecorder.devices);
      this._timer = setInterval(() => this._render(RawRecorder.getSummary(), RawRecorder.devices), 1000);
    },

    _wireDevices() {
      document.getElementById('rawConnect-muse')?.addEventListener('click', () => RawRecorder.connectMuse());
      document.getElementById('rawConnect-scentra')?.addEventListener('click', () => RawRecorder.connectScentra());
      document.getElementById('rawConnect-watch8')?.addEventListener('click', () => {
        const url = prompt('Masukkan URL WebSocket aplikasi perantara Watch 8 (kosongkan untuk mode Firebase relay):', 'ws://192.168.1.50:8080');
        if (url && url.trim()) {
          RawRecorder.connectWatch8WiFi(url.trim());
        } else {
          RawRecorder._attachWatch8Firebase();
          alert('Mode Firebase relay aktif. Aplikasi perantara harus menulis ke users/{uid}/liveDevices/watch8.');
        }
      });
    },

    _wireRecord() {
      const startBtn = document.getElementById('rawStartBtn');
      const stopBtn = document.getElementById('rawStopBtn');
      startBtn?.addEventListener('click', () => {
        RawRecorder.start();
        startBtn.style.display = 'none';
        if (stopBtn) stopBtn.style.display = 'inline-flex';
        this._setText('rawStatus', 'merekam');
      });
      stopBtn?.addEventListener('click', () => {
        const sum = RawRecorder.stop();
        stopBtn.style.display = 'none';
        if (startBtn) startBtn.style.display = 'inline-flex';
        this._setText('rawStatus', 'berhenti');
        alert(`Rekaman selesai.\nDurasi: ${sum.durationSec}s\nTotal frame: ${sum.total}\n(Muse ${sum.counts.muse} · ScentraVN ${sum.counts.scentra} · Watch8 ${sum.counts.watch8})`);
      });
    },

    _wireExports() {
      document.getElementById('rawExportJson')?.addEventListener('click', () => RawRecorder.exportJSON());
      document.getElementById('rawExportMuse')?.addEventListener('click', () => RawRecorder.exportCSV('muse'));
      document.getElementById('rawExportScentra')?.addEventListener('click', () => RawRecorder.exportCSV('scentra'));
      document.getElementById('rawExportWatch8')?.addEventListener('click', () => RawRecorder.exportCSV('watch8'));
      document.getElementById('rawSaveCloud')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget; const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        const id = await RawRecorder.saveToFirestore();
        btn.innerHTML = orig;
        if (id) alert('Tersimpan ke cloud. ID: ' + id);
      });
    },

    _render(summary, devices) {
      this._setText('rawDuration', this._fmtDur(summary.durationSec));
      this._setText('rawTotal', summary.total);

      for (const id of ['watch8', 'muse', 'scentra']) {
        const dv = devices[id];
        const dot = document.getElementById(`rawDev-${id}-dot`);
        const status = document.getElementById(`rawDev-${id}-status`);
        const count = document.getElementById(`rawDev-${id}-count`);
        if (dot) dot.style.background = dv.connected ? '#10b981' : '#cbd5e1';
        if (status) status.textContent = dv.connected ? `terhubung · ${dv.transport || 'BLE'}` : 'terputus';
        if (count) count.textContent = `${summary.counts[id]} frame`;
      }

      if (RawRecorder.recording && RawRecorder.startedAt) {
        const s = Math.round((Date.now() - RawRecorder.startedAt) / 1000);
        this._setText('rawTimer', `● Merekam · ${this._fmtDur(s)}`);
      }
    },

    _fmtDur(s) {
      if (s < 60) return `${s}s`;
      const m = Math.floor(s / 60), sec = s % 60;
      return `${m}m ${sec}s`;
    },

    _setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; },

    destroy() { if (this._timer) { clearInterval(this._timer); this._timer = null; } }
  };

  if (typeof window !== 'undefined') window.RawRecorderView = RawRecorderView;
})();
