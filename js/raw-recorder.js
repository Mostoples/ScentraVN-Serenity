/**
 * ScentraVN Serenity — Multi-Device RAW Data Recorder
 *
 * Records synchronized raw sensor streams from up to 3 devices and lets the
 * user save the session (JSON/CSV download + optional Firestore upload).
 *
 * Devices:
 *   1. Samsung Galaxy Watch 8  — via companion app (WiFi/Firebase bridge)
 *        sensors: HR, HRV/IBI, SpO2, accel, gyro, skinTemp, EDA, steps, baro
 *   2. Muse Sleep (EEG)        — via Web Bluetooth (MuseEEG)
 *        channels: TP9, AF7, AF8, TP10 + band powers + accel/gyro
 *   3. ScentraVN custom watch  — via BLE/WiFi/Firebase
 *        sensors: MAX30102 (red/IR/HR/SpO2), MLX90614 temp, IMU, EDA/GSR
 *
 * Transports: BLE (Web Bluetooth), WiFi (WebSocket/HTTP), Firebase (RTDB/Firestore relay)
 */

(() => {
  'use strict';

  const RawRecorder = {
    recording: false,
    startedAt: null,
    /* frames keyed by device: [{ t, ...sensorValues }] */
    streams: { watch8: [], muse: [], scentra: [] },
    devices: {
      watch8:  { connected: false, transport: null, label: 'Samsung Watch 8' },
      muse:    { connected: false, transport: null, label: 'Muse Sleep' },
      scentra: { connected: false, transport: null, label: 'ScentraVN Watch' },
    },
    _museListener: null,
    _bleListener: null,
    _fbUnsub: null,
    _onUpdate: null,
    MAX_FRAMES: 200000,        /* safety cap per device */

    onUpdate(cb) { this._onUpdate = cb; },

    /* ── Session control ──────────────────────────────────────────── */
    start() {
      if (this.recording) return false;
      this.recording = true;
      this.startedAt = Date.now();
      this.streams = { watch8: [], muse: [], scentra: [] };
      this._attachSources();
      this._emit();
      return true;
    },

    stop() {
      this.recording = false;
      this._detachSources();
      this._emit();
      return this.getSummary();
    },

    getSummary() {
      const durSec = this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0;
      return {
        startedAt: this.startedAt,
        durationSec: durSec,
        counts: {
          watch8: this.streams.watch8.length,
          muse: this.streams.muse.length,
          scentra: this.streams.scentra.length,
        },
        total: this.streams.watch8.length + this.streams.muse.length + this.streams.scentra.length,
      };
    },

    /* ── Source attachment ────────────────────────────────────────── */
    _attachSources() {
      /* Muse via MuseEEG metrics stream */
      if (typeof MuseEEG !== 'undefined') {
        this._museListener = (m) => {
          if (!this.recording) return;
          this._record('muse', {
            t: Date.now(),
            delta: m.powers?.delta, theta: m.powers?.theta, alpha: m.powers?.alpha,
            beta: m.powers?.beta, gamma: m.powers?.gamma, smr: m.powers?.smr,
            af7_alpha: m.powersAF7?.alpha, af8_alpha: m.powersAF8?.alpha,
            faa: m.alphaAsymmetry, sleepStage: m.sleepStage,
            emotion: m.emotion?.label, mentalState: m.mentalState?.label,
          });
          this.devices.muse.connected = MuseEEG.isConnected || MuseEEG.simulationMode;
        };
        MuseEEG.onMetrics(this._museListener);
      }

      /* ScentraVN custom watch via BLE data stream */
      if (typeof BLEConnection !== 'undefined' && BLEConnection.onDataUpdate) {
        this._bleListener = (data) => {
          if (!this.recording) return;
          this._record('scentra', {
            t: Date.now(),
            hr: data.hr, spo2: data.spo2, ir: data.ir, red: data.red,
            bt: data.bt, at: data.at,                  // MLX temps
            ax: data.ax, ay: data.ay, az: data.az,     // IMU
            gx: data.gx, gy: data.gy, gz: data.gz,
            gsrRaw: data.gsrRaw, gsr: data.gsr,        // EDA
            act: data.act, finger: data.finger,
          });
          this.devices.scentra.connected = true;
          this.devices.scentra.transport = 'BLE';
        };
        BLEConnection.onDataUpdate(this._bleListener);
      }

      /* Samsung Watch 8 via Firebase relay (companion app writes here) */
      this._attachWatch8Firebase();
    },

    _attachWatch8Firebase() {
      try {
        if (typeof auth === 'undefined' || !auth.currentUser || typeof db === 'undefined') return;
        const uid = auth.currentUser.uid;
        /* Companion app streams latest frame to users/{uid}/liveDevices/watch8 */
        this._fbUnsub = db.collection('users').doc(uid)
          .collection('liveDevices').doc('watch8')
          .onSnapshot(snap => {
            if (!this.recording || !snap.exists) return;
            const d = snap.data() || {};
            this._record('watch8', {
              t: Date.now(),
              hr: d.hr, hrv: d.hrv, spo2: d.spo2,
              skinTemp: d.skinTemp, eda: d.eda, steps: d.steps,
              ax: d.ax, ay: d.ay, az: d.az,
              gx: d.gx, gy: d.gy, gz: d.gz,
              baro: d.baro, battery: d.battery,
            });
            this.devices.watch8.connected = true;
            this.devices.watch8.transport = 'Firebase';
          }, err => console.warn('Watch8 relay error:', err.message));
      } catch (e) { /* not configured */ }
    },

    _detachSources() {
      if (this._museListener && typeof MuseEEG !== 'undefined' && MuseEEG.offMetrics) {
        MuseEEG.offMetrics(this._museListener);
      }
      this._museListener = null;
      if (this._bleListener && typeof BLEConnection !== 'undefined' && BLEConnection.offDataUpdate) {
        BLEConnection.offDataUpdate(this._bleListener);
      }
      this._bleListener = null;
      if (this._fbUnsub) { try { this._fbUnsub(); } catch (e) {} this._fbUnsub = null; }
    },

    _record(device, frame) {
      const arr = this.streams[device];
      if (!arr) return;
      if (arr.length >= this.MAX_FRAMES) return;
      arr.push(frame);
      if (this._onUpdate && arr.length % 5 === 0) this._emit();
    },

    _emit() { if (this._onUpdate) this._onUpdate(this.getSummary(), this.devices); },

    /* ── Manual transport connectors ──────────────────────────────── */
    async connectMuse() {
      if (typeof MuseEEG === 'undefined') return false;
      const ok = await MuseEEG.connect();
      if (!ok) { MuseEEG.startSimulation('medium'); }
      this.devices.muse.connected = true;
      this.devices.muse.transport = ok ? 'BLE' : 'Simulation';
      this._emit();
      return true;
    },

    async connectScentra() {
      if (typeof BLEConnection === 'undefined') return false;
      try {
        await BLEConnection.connect();
        this.devices.scentra.connected = true;
        this.devices.scentra.transport = 'BLE';
      } catch (e) { /* user cancelled */ }
      this._emit();
      return true;
    },

    /** Register Watch8 companion endpoint (WiFi WebSocket) */
    connectWatch8WiFi(wsUrl) {
      try {
        const ws = new WebSocket(wsUrl);
        ws.onmessage = (ev) => {
          if (!this.recording) return;
          let d; try { d = JSON.parse(ev.data); } catch { return; }
          this._record('watch8', { t: Date.now(), ...d });
          this.devices.watch8.connected = true;
          this.devices.watch8.transport = 'WiFi';
        };
        ws.onopen = () => { this.devices.watch8.connected = true; this.devices.watch8.transport = 'WiFi'; this._emit(); };
        ws.onerror = () => { console.warn('Watch8 WiFi error'); };
        this._watch8Ws = ws;
        return true;
      } catch (e) { return false; }
    },

    /* ── Export ───────────────────────────────────────────────────── */
    exportJSON() {
      const payload = {
        meta: {
          app: 'ScentraVN Serenity',
          startedAt: this.startedAt ? new Date(this.startedAt).toISOString() : null,
          endedAt: new Date().toISOString(),
          durationSec: this.getSummary().durationSec,
          devices: this.devices,
        },
        streams: this.streams,
      };
      this._download(JSON.stringify(payload, null, 2),
        `scentravn-raw-${this._stamp()}.json`, 'application/json');
    },

    exportCSV(device) {
      const arr = this.streams[device];
      if (!arr || !arr.length) { alert('Tidak ada data untuk ' + device); return; }
      /* union of keys */
      const keys = Array.from(arr.reduce((s, r) => { Object.keys(r).forEach(k => s.add(k)); return s; }, new Set()));
      const lines = [keys.join(',')];
      for (const r of arr) {
        lines.push(keys.map(k => {
          const v = r[k];
          if (v === undefined || v === null) return '';
          if (Array.isArray(v)) return '"' + v.join('|') + '"';
          return v;
        }).join(','));
      }
      this._download(lines.join('\n'), `scentravn-${device}-${this._stamp()}.csv`, 'text/csv');
    },

    async saveToFirestore() {
      try {
        if (typeof auth === 'undefined' || !auth.currentUser || typeof db === 'undefined') {
          alert('Login diperlukan untuk menyimpan ke cloud.'); return null;
        }
        const summary = this.getSummary();
        /* Store metadata + downsampled streams (Firestore doc limit 1MB) */
        const ds = (arr, max = 500) => {
          if (arr.length <= max) return arr;
          const step = Math.ceil(arr.length / max);
          return arr.filter((_, i) => i % step === 0);
        };
        const ref = await db.collection('users').doc(auth.currentUser.uid)
          .collection('rawRecordings').add({
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            startedAt: this.startedAt ? new Date(this.startedAt).toISOString() : null,
            durationSec: summary.durationSec,
            counts: summary.counts,
            devices: this.devices,
            streamsDownsampled: {
              watch8: ds(this.streams.watch8),
              muse: ds(this.streams.muse),
              scentra: ds(this.streams.scentra),
            },
            note: 'Full-resolution data available via local JSON export.',
          });
        return ref.id;
      } catch (e) {
        console.warn('Firestore save failed:', e.message);
        alert('Gagal menyimpan ke cloud: ' + e.message);
        return null;
      }
    },

    _download(content, filename, mime) {
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    _stamp() {
      const d = new Date();
      const p = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    },
  };

  if (typeof window !== 'undefined') window.RawRecorder = RawRecorder;
})();
