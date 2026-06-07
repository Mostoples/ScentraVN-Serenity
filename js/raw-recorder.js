/**
 * ScentraVN Serenity — Multi-Device RAW Data Recorder
 *
 * Records synchronized RAW sensor streams from all devices and saves the
 * session to Firestore (full resolution, chunked) plus local JSON/CSV export.
 *
 * Devices & transports:
 *   1. Muse S Gen 2 (EEG)   — Web Bluetooth (MuseEEG)
 *        RAW: TP9/AF7/AF8/TP10 @256Hz + accel/gyro  ·  metrics: band powers, states
 *   2. ScentraVN Watch      — Web Bluetooth (BLEConnection / ESP32)
 *        RAW: MAX30102 red/IR/HR/SpO2, MLX90614 temps, IMU, EDA/GSR
 *   3. Galaxy Watch         — Firebase Realtime Database (ScentraLive bridge)
 *        bpm · stress · battery (Android companion → /scentravn/live/galaxyWatch)
 *
 * Save model (bypasses Firestore 1MB doc limit):
 *   users/{uid}/rawRecordings/{id}            ← metadata + summary
 *   users/{uid}/rawRecordings/{id}/chunks/{i} ← JSON string parts of full streams
 */

(() => {
  'use strict';

  const CHUNK_BYTES = 600 * 1024;   // ~600KB per chunk (Firestore doc limit 1MB)
  const IDB_NAME = 'scentravn-recorder';
  const IDB_STORE = 'drafts';
  const DRAFT_KEY = 'current';

  const RawRecorder = {
    recording: false,
    paused: false,
    startedAt: null,
    pausedMs: 0,            // accumulated paused time
    _pauseStart: null,

    /* RAW + derived streams keyed by source */
    streams: { galaxy: [], muse: [], museRaw: [], scentra: [] },

    devices: {
      muse:    { connected: false, transport: null, label: 'Muse S Gen 2' },
      scentra: { connected: false, transport: null, label: 'ScentraVN Watch' },
      galaxy:  { connected: false, transport: null, label: 'Galaxy Watch' },
    },

    _museMetricsListener: null,
    _museRawListener: null,
    _bleListener: null,
    _galaxyUnsub: null,
    _onUpdate: null,
    MAX_FRAMES: 500000,        // safety cap per stream

    onUpdate(cb) { this._onUpdate = cb; },

    /* ── Session control ──────────────────────────────────────────── */
    start() {
      if (this.recording) return false;
      this.recording = true;
      this.paused = false;
      this.startedAt = Date.now();
      this.pausedMs = 0;
      this._pauseStart = null;
      this.streams = { galaxy: [], muse: [], museRaw: [], scentra: [] };
      this._attachSources();
      this._emit();
      return true;
    },

    pause() {
      if (!this.recording || this.paused) return false;
      this.paused = true;
      this._pauseStart = Date.now();
      this._emit();
      return true;
    },

    resume() {
      if (!this.recording || !this.paused) return false;
      if (this._pauseStart) this.pausedMs += Date.now() - this._pauseStart;
      this._pauseStart = null;
      this.paused = false;
      this._emit();
      return true;
    },

    stop() {
      if (this.paused && this._pauseStart) this.pausedMs += Date.now() - this._pauseStart;
      this.recording = false;
      this.paused = false;
      this._pauseStart = null;
      this._detachSources();
      this._emit();
      return this.getSummary();
    },

    /** Active (non-paused) recording seconds. */
    elapsedSec() {
      if (!this.startedAt) return 0;
      let paused = this.pausedMs;
      if (this.paused && this._pauseStart) paused += Date.now() - this._pauseStart;
      return Math.max(0, Math.round((Date.now() - this.startedAt - paused) / 1000));
    },

    getSummary() {
      return {
        startedAt: this.startedAt,
        durationSec: this.elapsedSec(),
        paused: this.paused,
        recording: this.recording,
        counts: {
          muse: this.streams.muse.length,
          museRaw: this.streams.museRaw.length,
          scentra: this.streams.scentra.length,
          galaxy: this.streams.galaxy.length,
        },
        total: this.streams.muse.length + this.streams.museRaw.length +
               this.streams.scentra.length + this.streams.galaxy.length,
      };
    },

    /* ── Source attachment ────────────────────────────────────────── */
    _attachSources() {
      /* Muse — derived metrics */
      if (typeof MuseEEG !== 'undefined') {
        this._museMetricsListener = (m) => {
          if (!this.recording || this.paused) return;
          this._record('muse', {
            t: Date.now(),
            delta: m.powers?.delta, theta: m.powers?.theta, alpha: m.powers?.alpha,
            beta: m.powers?.beta, gamma: m.powers?.gamma, smr: m.powers?.smr,
            af7_alpha: m.powersAF7?.alpha, af8_alpha: m.powersAF8?.alpha,
            faa: m.alphaAsymmetry, sleepStage: m.sleepStage,
            emotion: m.emotion?.label, mentalState: m.mentalState?.label,
            battery: m.battery,
          });
          this.devices.muse.connected = MuseEEG.isConnected || MuseEEG.simulationMode;
        };
        MuseEEG.onMetrics(this._museMetricsListener);
        if (MuseEEG.isConnected || MuseEEG.simulationMode) {
          this.devices.muse.connected = true;
          this.devices.muse.transport = MuseEEG.simulationMode ? 'Simulasi' : 'BLE';
        }

        /* Muse — RAW per-channel EEG samples (256Hz) + motion */
        if (MuseEEG.onRaw) {
          this._museRawListener = (f) => {
            if (!this.recording || this.paused) return;
            this._record('museRaw', f);   // { t, ch, seq?, samples:[...] }
          };
          MuseEEG.onRaw(this._museRawListener);
        }
      }

      /* ScentraVN watch — RAW ESP32 JSON via BLE */
      if (typeof BLEConnection !== 'undefined' && BLEConnection.onDataUpdate) {
        this._bleListener = (data) => {
          if (!this.recording || this.paused) return;
          this._record('scentra', {
            t: Date.now(),
            hr: data.hr, spo2: data.spo2, ir: data.ir, red: data.red,
            bt: data.bt, at: data.at,                  // MLX temps
            ax: data.ax, ay: data.ay, az: data.az,     // IMU accel
            gx: data.gx, gy: data.gy, gz: data.gz,     // IMU gyro
            gsrRaw: data.gsrRaw, gsr: data.gsr,        // EDA
            rmssd: data.rmssd, act: data.act, finger: data.finger,
          });
          this.devices.scentra.connected = true;
          this.devices.scentra.transport = 'BLE';
        };
        BLEConnection.onDataUpdate(this._bleListener);
        if (BLEConnection.isConnected && BLEConnection.isConnected()) {
          this.devices.scentra.connected = true;
          this.devices.scentra.transport = 'BLE';
        }
      }

      /* Galaxy Watch — via Firebase Realtime Database (ScentraLive bridge) */
      this._attachGalaxyRTDB();
    },

    _attachGalaxyRTDB() {
      if (typeof ScentraLive === 'undefined') return;
      try {
        ScentraLive.start();
        let lastUpdatedAt = 0;
        this._galaxyUnsub = ScentraLive.onUpdate((live) => {
          if (!this.recording || this.paused) return;
          const gw = live && live.galaxyWatch;
          if (!gw) return;
          this.devices.galaxy.connected = !!gw.connected;
          this.devices.galaxy.transport = 'RTDB';
          /* only record genuinely new frames from the bridge */
          if (gw.updatedAt && gw.updatedAt === lastUpdatedAt) return;
          lastUpdatedAt = gw.updatedAt || Date.now();
          this._record('galaxy', {
            t: Date.now(),
            updatedAt: gw.updatedAt || null,
            bpm: gw.bpm,
            battery: gw.battery,
            stressValue: gw.stress?.value,
            stressLevel: gw.stress?.level,
          });
        });
      } catch (e) { /* RTDB not configured */ }
    },

    _detachSources() {
      if (this._museMetricsListener && typeof MuseEEG !== 'undefined' && MuseEEG.offMetrics) {
        MuseEEG.offMetrics(this._museMetricsListener);
      }
      this._museMetricsListener = null;
      if (this._museRawListener && typeof MuseEEG !== 'undefined' && MuseEEG.offRaw) {
        MuseEEG.offRaw(this._museRawListener);
      }
      this._museRawListener = null;
      if (this._bleListener && typeof BLEConnection !== 'undefined' && BLEConnection.offDataUpdate) {
        BLEConnection.offDataUpdate(this._bleListener);
      }
      this._bleListener = null;
      if (this._galaxyUnsub) { try { this._galaxyUnsub(); } catch (e) {} this._galaxyUnsub = null; }
    },

    _record(stream, frame) {
      const arr = this.streams[stream];
      if (!arr) return;
      if (arr.length >= this.MAX_FRAMES) return;
      arr.push(frame);
      if (this._onUpdate && arr.length % 10 === 0) this._emit();
    },

    _emit() { if (this._onUpdate) this._onUpdate(this.getSummary(), this.devices); },

    /* ── Manual transport connectors ──────────────────────────────── */
    async connectMuse() {
      if (typeof MuseEEG === 'undefined') return false;
      if (MuseEEG.isConnected) {
        this.devices.muse.connected = true;
        this.devices.muse.transport = 'BLE';
        this._emit();
        return true;
      }
      const ok = await MuseEEG.connect();
      if (!ok && !MuseEEG.isConnected) { MuseEEG.startSimulation('medium'); }
      this.devices.muse.connected = true;
      this.devices.muse.transport = (ok || MuseEEG.isConnected) ? 'BLE' : 'Simulasi';
      this._emit();
      return true;
    },

    async connectScentra() {
      if (typeof BLEConnection === 'undefined') return false;
      if (BLEConnection.isConnected && BLEConnection.isConnected()) {
        this.devices.scentra.connected = true;
        this.devices.scentra.transport = 'BLE';
        this._emit();
        return true;
      }
      try {
        await BLEConnection.connect();
        this.devices.scentra.connected = true;
        this.devices.scentra.transport = 'BLE';
      } catch (e) { /* user cancelled */ }
      this._emit();
      return true;
    },

    /* ── Local export ─────────────────────────────────────────────── */
    _buildPayload() {
      return {
        meta: {
          app: 'ScentraVN Serenity',
          schemaVersion: 2,
          startedAt: this.startedAt ? new Date(this.startedAt).toISOString() : null,
          endedAt: new Date().toISOString(),
          durationSec: this.elapsedSec(),
          devices: this.devices,
          counts: this.getSummary().counts,
        },
        streams: this.streams,
      };
    },

    exportJSON() {
      this._download(JSON.stringify(this._buildPayload(), null, 2),
        `scentravn-raw-${this._stamp()}.json`, 'application/json');
    },

    exportCSV(stream) {
      const arr = this.streams[stream];
      if (!arr || !arr.length) { alert('Tidak ada data untuk ' + stream); return; }
      this._download(RawRecorder.streamToCSV(arr), `scentravn-${stream}-${this._stamp()}.csv`, 'text/csv');
    },

    /** Convert an array of frames → CSV string (handles arrays like raw samples). */
    streamToCSV(arr) {
      const keys = Array.from(arr.reduce((s, r) => { Object.keys(r).forEach(k => s.add(k)); return s; }, new Set()));
      const esc = (v) => {
        if (v === undefined || v === null) return '';
        if (Array.isArray(v)) return '"' + v.map(x => Array.isArray(x) ? x.join('|') : x).join('|') + '"';
        if (typeof v === 'string' && (v.includes(',') || v.includes('"'))) return '"' + v.replace(/"/g, '""') + '"';
        return v;
      };
      const lines = [keys.join(',')];
      for (const r of arr) lines.push(keys.map(k => esc(r[k])).join(','));
      return lines.join('\n');
    },

    /* ── Firestore save (FULL resolution, chunked) ────────────────── */
    async saveToFirestore(meta = {}) {
      try {
        if (typeof auth === 'undefined' || !auth.currentUser || typeof db === 'undefined') {
          alert('Login diperlukan untuk menyimpan ke cloud.'); return null;
        }
        const uid = auth.currentUser.uid;
        const summary = this.getSummary();
        const col = db.collection('users').doc(uid).collection('rawRecordings');

        /* 1) metadata doc */
        const docRef = col.doc();
        const startedISO = this.startedAt ? new Date(this.startedAt).toISOString() : null;

        /* 2) split full streams JSON into ≤600KB string chunks */
        const json = JSON.stringify(this.streams);
        const parts = [];
        for (let i = 0; i < json.length; i += CHUNK_BYTES) parts.push(json.slice(i, i + CHUNK_BYTES));

        await docRef.set({
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          startedAt: startedISO,
          endedAt: new Date().toISOString(),
          durationSec: summary.durationSec,
          counts: summary.counts,
          total: summary.total,
          devices: this.devices,
          name: meta.name || `Rekaman ${new Date().toLocaleString('id-ID')}`,
          note: meta.note || '',
          schemaVersion: 2,
          chunkCount: parts.length,
          bytes: json.length,
        });

        /* 3) write chunks in batches */
        const chunksCol = docRef.collection('chunks');
        let batch = db.batch();
        let ops = 0;
        for (let i = 0; i < parts.length; i++) {
          batch.set(chunksCol.doc(String(i).padStart(5, '0')), { i, part: parts[i] });
          if (++ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
        }
        if (ops > 0) await batch.commit();

        return docRef.id;
      } catch (e) {
        console.error('Firestore save failed:', e);
        alert('Gagal menyimpan ke cloud: ' + e.message);
        return null;
      }
    },

    /* ── Firestore history API ────────────────────────────────────── */
    async listRecordings() {
      if (typeof auth === 'undefined' || !auth.currentUser || typeof db === 'undefined') return [];
      const snap = await db.collection('users').doc(auth.currentUser.uid)
        .collection('rawRecordings').orderBy('createdAt', 'desc').limit(100).get();
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },

    /** Load a recording's full streams by reassembling its chunks. */
    async loadRecording(id) {
      if (typeof auth === 'undefined' || !auth.currentUser || typeof db === 'undefined') return null;
      const ref = db.collection('users').doc(auth.currentUser.uid).collection('rawRecordings').doc(id);
      const metaSnap = await ref.get();
      if (!metaSnap.exists) return null;
      const meta = { id, ...metaSnap.data() };
      const chunksSnap = await ref.collection('chunks').orderBy('i').get();
      let json = '';
      chunksSnap.forEach(c => { json += (c.data().part || ''); });
      let streams = { galaxy: [], muse: [], museRaw: [], scentra: [] };
      if (json) { try { streams = JSON.parse(json); } catch (e) { console.warn('parse streams failed', e); } }
      return { meta, streams };
    },

    async deleteRecording(id) {
      if (typeof auth === 'undefined' || !auth.currentUser || typeof db === 'undefined') return false;
      const ref = db.collection('users').doc(auth.currentUser.uid).collection('rawRecordings').doc(id);
      const chunks = await ref.collection('chunks').get();
      let batch = db.batch(); let ops = 0;
      chunks.forEach(c => { batch.delete(c.ref); if (++ops >= 400) { batch.commit(); batch = db.batch(); ops = 0; } });
      if (ops > 0) await batch.commit();
      await ref.delete();
      return true;
    },

    /* ── Local draft persistence (IndexedDB, "storage device") ────── */
    _openIDB() {
      return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) { reject(new Error('IndexedDB tidak didukung')); return; }
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },

    _idbPut(value) {
      return this._openIDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(value);
        tx.oncomplete = () => { db.close(); resolve(true); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      }));
    },

    _idbGet(id) {
      return this._openIDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const r = tx.objectStore(IDB_STORE).get(id);
        r.onsuccess = () => { db.close(); resolve(r.result || null); };
        r.onerror = () => { db.close(); reject(r.error); };
      }));
    },

    _idbDel(id) {
      return this._openIDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).delete(id);
        tx.oncomplete = () => { db.close(); resolve(true); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      }));
    },

    /** Persist the current session to device storage (checkpoint on pause). */
    async saveDraft() {
      try {
        await this._idbPut({
          id: DRAFT_KEY,
          savedAt: Date.now(),
          startedAt: this.startedAt,
          pausedMs: this.pausedMs,
          durationSec: this.elapsedSec(),
          counts: this.getSummary().counts,
          total: this.getSummary().total,
          devices: JSON.parse(JSON.stringify(this.devices)),
          streams: this.streams,
        });
        return true;
      } catch (e) { console.warn('saveDraft failed:', e.message); return false; }
    },

    async getDraft()   { try { return await this._idbGet(DRAFT_KEY); } catch (e) { return null; } },
    async clearDraft() { try { await this._idbDel(DRAFT_KEY); return true; } catch (e) { return false; } },

    /** Load a device-stored draft back into memory (without recording). */
    async restoreDraft() {
      const d = await this.getDraft();
      if (!d) return null;
      this.recording = false; this.paused = false;
      this.startedAt = d.startedAt || null;
      this.pausedMs = d.pausedMs || 0;
      this._pauseStart = null;
      this.streams = d.streams || { galaxy: [], muse: [], museRaw: [], scentra: [] };
      if (d.devices) this.devices = d.devices;
      this._emit();
      return d;
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
