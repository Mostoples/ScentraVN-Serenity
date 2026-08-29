/**
 * ScentraVN Serenity — Multi-Device RAW Data Recorder
 *
 * Records synchronized RAW sensor streams from all devices and saves the
 * session to Firestore (metadata) + Supabase Storage (full-resolution blob),
 * plus local JSON/CSV export.
 *
 * Devices & transports:
 *   1. Muse S Gen 2 (EEG)   — Web Bluetooth (MuseEEG)
 *        RAW: TP9/AF7/AF8/TP10 @256Hz + accel/gyro  ·  metrics: band powers, states
 *   2. ScentraVN Watch      — Web Bluetooth (BLEConnection / ESP32)
 *        RAW: MAX30102 red/IR/HR/SpO2, MLX90614 temps, IMU, EDA/GSR
 *   3. Galaxy Watch         — offline loopback bridge ws://127.0.0.1 (ScentraLive),
 *        RTDB only as fallback. bpm · stress · battery (Android companion → live)
 *
 * Save model (keeps big data OUT of Firestore, which is 1MB/doc and burns
 * through the Spark free-plan write/storage quota fast — see SUPABASE_SETUP.md):
 *   users/{uid}/rawRecordings/{id}   ← metadata + summary only (Firestore)
 *   Supabase Storage bucket `recordings`, path {uid}/{id}.json.gz
 *                                     ← ONE gzip blob with the full streams JSON
 *
 * Recordings saved before this change used a legacy scheme (schemaVersion 2:
 * the full streams JSON split into chunks under rawRecordings/{id}/chunks/{i}).
 * loadRecording/deleteRecording still understand that legacy layout so old
 * history keeps working; updateRecording migrates a recording to the new
 * Supabase-backed scheme the next time it's edited.
 */

(() => {
  'use strict';

  const IDB_NAME = 'scentravn-recorder';
  const IDB_STORE = 'drafts';
  const IDB_REC_STORE = 'recordings';   // finished local recordings pending cloud upload
  const DRAFT_KEY = 'current';
  const LOCAL_PREFIX = 'local-';

  /**
   * Compress `streams` to gzip and upload as one blob to Supabase Storage.
   * Path is deterministic (`{uid}/{id}.json.gz`) so save/edit/migrate always
   * overwrite the SAME object — no orphaned blobs left behind on re-upload.
   * `info` (name/durationSec/counts/…) is attached as Storage object metadata
   * so a recording is self-describing straight from the Supabase dashboard,
   * without having to cross-reference the Firestore doc.
   */
  const SUPABASE_FREE_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;   // Supabase free-plan hard cap, not raisable

  async function _uploadStreamsToSupabase(uid, id, streams, info = {}) {
    if (!window.supabaseClient) throw new Error('Supabase belum dikonfigurasi — lihat SUPABASE_SETUP.md.');
    const json = JSON.stringify(streams);
    if (!json || json.length < 2) throw new Error('Data rekaman kosong — dibatalkan agar tidak menimpa blob yang valid.');
    const compressed = fflate.gzipSync(fflate.strToU8(json), { level: 6 });
    // A ~1h session compresses to roughly 10-20MB in practice; a much bigger
    // blob than that means something is off (unexpectedly dense stream, or a
    // recording well beyond the ~1h target this app is designed for) — fail
    // clearly here instead of letting Supabase reject it with an opaque error.
    if (compressed.length > SUPABASE_FREE_MAX_UPLOAD_BYTES) {
      throw new Error(`Rekaman terlalu besar untuk Supabase free plan (${(compressed.length / 1024 / 1024).toFixed(1)}MB terkompresi, batas 50MB). Coba rekaman lebih pendek.`);
    }
    const bucket = (typeof CONFIG !== 'undefined' && CONFIG.SUPABASE_RECORDINGS_BUCKET) || 'recordings';
    const path = `${uid}/${id}.json.gz`;
    const { error } = await supabaseClient.storage.from(bucket)
      .upload(path, new Blob([compressed], { type: 'application/gzip' }), {
        contentType: 'application/gzip',
        cacheControl: '0',   // may be overwritten by updateRecording — never serve a stale cached copy
        upsert: true,
        metadata: {
          recordingId: id,
          uid,
          name: info.name || '',
          startedAt: info.startedAt || '',
          durationSec: info.durationSec || 0,
          total: info.total || 0,
        },
      });
    if (error) throw error;
    return { bucket, path, bytes: json.length, compressedBytes: compressed.length };
  }

  /** Download + gunzip a recording blob from Supabase Storage back to the streams object. */
  async function _downloadStreamsFromSupabase(bucket, path) {
    if (!window.supabaseClient) throw new Error('Supabase belum dikonfigurasi — lihat SUPABASE_SETUP.md.');
    const { data, error } = await supabaseClient.storage.from(bucket || 'recordings').download(path);
    if (error) throw error;
    const buf = new Uint8Array(await data.arrayBuffer());
    const parsed = JSON.parse(fflate.strFromU8(fflate.gunzipSync(buf)));
    // Always return the 4 known stream arrays, even if the blob is an older/
    // partial shape — callers can rely on `.muse`/`.museRaw`/etc. always existing.
    return {
      galaxy: Array.isArray(parsed.galaxy) ? parsed.galaxy : [],
      muse: Array.isArray(parsed.muse) ? parsed.muse : [],
      museRaw: Array.isArray(parsed.museRaw) ? parsed.museRaw : [],
      scentra: Array.isArray(parsed.scentra) ? parsed.scentra : [],
    };
  }

  const RawRecorder = {
    recording: false,
    paused: false,
    startedAt: null,
    stoppedAt: null,        // frozen timestamp when recording stops
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
      this.stoppedAt = null;
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
      this.stoppedAt = Date.now();
      this.recording = false;
      this.paused = false;
      this._pauseStart = null;
      this._detachSources();
      this._emit();
      return this.getSummary();
    },

    /**
     * Clear the in-memory session back to a fresh idle state (00:00, no frames).
     * Call AFTER a session has been saved/exported — Stop alone keeps the streams
     * so a failed upload can still be retried/checkpointed; reset discards them.
     */
    reset() {
      this.recording = false;
      this.paused = false;
      this.startedAt = null;
      this.stoppedAt = null;
      this.pausedMs = 0;
      this._pauseStart = null;
      this.streams = { galaxy: [], muse: [], museRaw: [], scentra: [] };
      this._emit();
    },

    /** Active (non-paused) recording seconds. Frozen once stopped. */
    elapsedSec() {
      if (!this.startedAt) return 0;
      // Once stopped, freeze the clock at the stop moment so the on-screen
      // timer no longer keeps counting after the user presses Stop.
      const now = (!this.recording && this.stoppedAt) ? this.stoppedAt : Date.now();
      let paused = this.pausedMs;
      if (this.recording && this.paused && this._pauseStart) paused += Date.now() - this._pauseStart;
      return Math.max(0, Math.round((now - this.startedAt - paused) / 1000));
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
          // RECORD REAL DATA ONLY: ignore frames while the headband is in
          // simulation mode so saved sessions never contain synthetic values.
          if (!MuseEEG.isConnected || MuseEEG.simulationMode) return;
          this._record('muse', {
            t: Date.now(),
            delta: m.powers?.delta, theta: m.powers?.theta, alpha: m.powers?.alpha,
            beta: m.powers?.beta, gamma: m.powers?.gamma, smr: m.powers?.smr,
            af7_alpha: m.powersAF7?.alpha, af8_alpha: m.powersAF8?.alpha,
            faa: m.alphaAsymmetry, sleepStage: m.sleepStage,
            emotion: m.emotion?.label, mentalState: m.mentalState?.label,
            hr: m.hr, rmssd: m.rmssd, ppgSqi: m.ppgSqi,
            battery: m.battery,
          });
          // Connected flag reflects a genuine BLE link only.
          this.devices.muse.connected = MuseEEG.isConnected && !MuseEEG.simulationMode;
        };
        MuseEEG.onMetrics(this._museMetricsListener);
        if (MuseEEG.isConnected && !MuseEEG.simulationMode) {
          this.devices.muse.connected = true;
          this.devices.muse.transport = 'BLE';
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

      /* Galaxy Watch — via offline loopback bridge (ws://127.0.0.1), with the
         Realtime Database only as a fallback when the on-device bridge is absent.
         Both sources funnel through ScentraLive, so we subscribe once. */
      this._attachGalaxy();
    },

    _attachGalaxy() {
      if (typeof ScentraLive === 'undefined') return;
      try {
        ScentraLive.start();
        let lastUpdatedAt = 0;
        this._galaxyUnsub = ScentraLive.onUpdate((live) => {
          if (!this.recording || this.paused) return;
          const gw = live && live.galaxyWatch;
          if (!gw) return;
          this.devices.galaxy.connected = !!gw.connected;
          // Tag the genuine transport so saved sessions distinguish offline (local
          // bridge) captures from cloud (RTDB) ones.
          this.devices.galaxy.transport = ScentraLive.source === 'local' ? 'LOCAL' : 'RTDB';
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
      // Real device only — do NOT silently fall back to simulation so that
      // recordings always contain genuine Muse data.
      const ok = await MuseEEG.connect();
      this.devices.muse.connected = !!(ok && MuseEEG.isConnected);
      this.devices.muse.transport = this.devices.muse.connected ? 'BLE' : null;
      this._emit();
      return this.devices.muse.connected;
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
      if (!arr || !arr.length) {
        if (typeof Utils !== 'undefined' && Utils.alertModal) Utils.alertModal('Tidak ada data untuk ' + stream, { danger: true });
        else alert('Tidak ada data untuk ' + stream);
        return;
      }
      this._download(RawRecorder.streamToCSV(arr), `scentravn-${stream}-${this._stamp()}.csv`, 'text/csv');
    },

    /** Human-friendly default recording name, e.g. "ScentraVN Record · 09 Jun 2026, 03.52". */
    prettyName(date = new Date()) {
      const locale = (typeof I18n !== 'undefined' && I18n.currentLang === 'en') ? 'en-US' : 'id-ID';
      const datePart = date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
      const timePart = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
      return `ScentraVN Record · ${datePart}, ${timePart}`;
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

    /**
     * Stop-and-save orchestration that NEVER blocks the UI on the network.
     *   1) Always checkpoint to device storage first (instant, crash-safe).
     *   2) Offline → don't touch Firestore (it would hang until reconnect); keep
     *      the draft so it can upload automatically when the connection returns.
     *   3) Online → upload, but cap the wait so a mid-save disconnect can't freeze
     *      the UI; on timeout/failure the draft is kept for the reconnect sync.
     * Returns { status: 'saved'|'offline'|'queued'|'noauth', id? }.
     */
    async commitSession(meta = {}) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      const noauth = typeof auth === 'undefined' || !auth.currentUser;

      // Can't upload now → store a FULL local recording so it shows in History
      // immediately and uploads automatically once online.
      if (offline || noauth) {
        const localId = await this.saveLocalRecording(meta);
        await this.clearDraft();
        return { status: noauth ? 'noauth' : 'offline', localId };
      }

      // Online: upload, but cap the wait so a mid-save disconnect can't hang the UI.
      // A ~1h recording's gzip blob can be several/tens of MB (see
      // _uploadStreamsToSupabase's size guard) — 60s was too tight on a slow
      // connection and would needlessly bounce a successful-but-slow upload
      // into the local-pending/retry path, so this is generous (5 min) instead.
      let id = null;
      try { id = await this._withTimeout(this.saveToFirestore(meta, { silent: true }), 300000); }
      catch (e) { id = null; }
      if (id) { await this.clearDraft(); return { status: 'saved', id }; }

      // Upload failed/slow → keep it as a local recording for the reconnect sync.
      const localId = await this.saveLocalRecording(meta);
      await this.clearDraft();
      return { status: 'queued', localId };
    },

    _withTimeout(promise, ms) {
      return Promise.race([promise, new Promise((res) => setTimeout(() => res(null), ms))]);
    },

    /* ── Save (FULL resolution): blob → Supabase Storage, metadata → Firestore ── */
    async saveToFirestore(meta = {}, opts = {}) {
      const silent = !!opts.silent;
      try {
        if (typeof auth === 'undefined' || !auth.currentUser || typeof db === 'undefined') {
          if (!silent) {
            if (typeof Utils !== 'undefined' && Utils.alertModal) Utils.alertModal('Login diperlukan untuk menyimpan ke cloud.', { danger: true });
            else alert('Login diperlukan untuk menyimpan ke cloud.');
          }
          return null;
        }
        const uid = auth.currentUser.uid;
        const summary = this.getSummary();
        const col = db.collection('users').doc(uid).collection('rawRecordings');

        /* 1) metadata doc (id generated client-side so we can use it as the storage path) */
        const docRef = col.doc();
        const startedISO = this.startedAt ? new Date(this.startedAt).toISOString() : null;

        /* 2) full streams JSON → one gzip blob in Supabase Storage */
        const { bucket, path, bytes, compressedBytes } = await _uploadStreamsToSupabase(uid, docRef.id, this.streams, {
          name: meta.name || this.prettyName(),
          startedAt: startedISO,
          durationSec: summary.durationSec,
          total: summary.total,
        });

        await docRef.set({
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          startedAt: startedISO,
          endedAt: new Date().toISOString(),
          durationSec: summary.durationSec,
          counts: summary.counts,
          total: summary.total,
          devices: this.devices,
          name: meta.name || this.prettyName(),
          note: meta.note || '',
          schemaVersion: 3,
          storageBucket: bucket,
          storagePath: path,
          bytes,
          compressedBytes,
        });

        return docRef.id;
      } catch (e) {
        console.error('Firestore save failed:', e);
        if (!silent) {
          if (typeof Utils !== 'undefined' && Utils.alertModal) Utils.alertModal('Gagal menyimpan ke cloud: ' + e.message, { danger: true });
          else alert('Gagal menyimpan ke cloud: ' + e.message);
        }
        return null;
      }
    },

    /* ── Firestore history API ────────────────────────────────────── */
    async listRecordings() {
      // Local (pending) recordings show first — available even offline.
      const local = await this.listLocalRecordings();
      let cloud = [];
      if (typeof auth !== 'undefined' && auth.currentUser && typeof db !== 'undefined') {
        try {
          const snap = await db.collection('users').doc(auth.currentUser.uid)
            .collection('rawRecordings').orderBy('createdAt', 'desc').limit(100).get();
          cloud = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (e) { /* offline / unreachable → just show local */ }
      }
      return [...local, ...cloud];
    },

    /** Load a recording's full streams (Supabase blob, or legacy Firestore chunks). */
    async loadRecording(id) {
      if (id && id.indexOf(LOCAL_PREFIX) === 0) return this.loadLocalRecording(id);
      if (typeof auth === 'undefined' || !auth.currentUser || typeof db === 'undefined') return null;
      const ref = db.collection('users').doc(auth.currentUser.uid).collection('rawRecordings').doc(id);
      const metaSnap = await ref.get();
      if (!metaSnap.exists) return null;
      const meta = { id, ...metaSnap.data() };
      let streams = { galaxy: [], muse: [], museRaw: [], scentra: [] };
      try {
        if (meta.storagePath) {
          streams = await _downloadStreamsFromSupabase(meta.storageBucket, meta.storagePath);
        } else {
          // Legacy schemaVersion 2 recording: full JSON split across Firestore chunk docs.
          const chunksSnap = await ref.collection('chunks').orderBy('i').get();
          let json = '';
          chunksSnap.forEach(c => { json += (c.data().part || ''); });
          if (json) streams = JSON.parse(json);
        }
      } catch (e) { console.warn('load streams failed', e); }
      return { meta, streams };
    },

    /**
     * Overwrite an existing recording's full streams (used by the spectra editor
     * after the user removes noisy segments). Recomputes counts/bytes, re-uploads
     * the Supabase blob (upsert — same path, new content), and updates metadata.
     * If the recording still used the legacy chunked-Firestore scheme, this also
     * deletes those chunk docs, migrating it to the Supabase-backed scheme.
     */
    async updateRecording(id, streams) {
      // Local (pending) recording → update in IndexedDB.
      if (id && id.indexOf(LOCAL_PREFIX) === 0) {
        const r = await this._idbGet(id, IDB_REC_STORE);
        if (!r) return false;
        r.streams = streams;
        r.counts = {
          muse: (streams.muse || []).length, museRaw: (streams.museRaw || []).length,
          scentra: (streams.scentra || []).length, galaxy: (streams.galaxy || []).length,
        };
        r.total = r.counts.muse + r.counts.museRaw + r.counts.scentra + r.counts.galaxy;
        r.bytes = JSON.stringify(streams).length;
        r.editedAt = new Date().toISOString();
        await this._idbPut(r, IDB_REC_STORE);
        return true;
      }
      if (typeof auth === 'undefined' || !auth.currentUser || typeof db === 'undefined') {
        throw new Error('Login diperlukan untuk menyimpan perubahan.');
      }
      const uid = auth.currentUser.uid;
      const ref = db.collection('users').doc(uid).collection('rawRecordings').doc(id);

      const counts = {
        muse: (streams.muse || []).length,
        museRaw: (streams.museRaw || []).length,
        scentra: (streams.scentra || []).length,
        galaxy: (streams.galaxy || []).length,
      };
      const total = counts.muse + counts.museRaw + counts.scentra + counts.galaxy;

      const existing = (await ref.get()).data() || {};
      const { bucket, path, bytes, compressedBytes } = await _uploadStreamsToSupabase(uid, id, streams, {
        name: existing.name, startedAt: existing.startedAt, durationSec: existing.durationSec, total,
      });

      /* Clean up legacy chunk docs, if any (pre-Supabase recording being migrated). */
      const oldChunks = await ref.collection('chunks').get();
      if (!oldChunks.empty) {
        let batch = db.batch(); let ops = 0;
        for (const c of oldChunks.docs) {
          batch.delete(c.ref);
          if (++ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
        }
        if (ops > 0) await batch.commit();
      }

      await ref.update({
        counts, total,
        bytes, compressedBytes,
        schemaVersion: 3,
        storageBucket: bucket,
        storagePath: path,
        chunkCount: firebase.firestore.FieldValue.delete(),
        editedAt: new Date().toISOString(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    },

    /**
     * One-off migration button target: move an EXISTING legacy recording
     * (schemaVersion 2, full data split across Firestore `chunks` docs) to the
     * Supabase-backed scheme, without touching its content. Refuses to run for:
     *   - local/pending recordings (nothing in Firestore yet to migrate)
     *   - recordings that already have a storagePath (already migrated — the
     *     caller should not be able to trigger this twice for the same recording).
     */
    async syncRecordingToSupabase(id) {
      if (id && id.indexOf(LOCAL_PREFIX) === 0) {
        throw new Error('Rekaman ini masih tersimpan lokal (offline) — akan sync otomatis saat online, bukan lewat tombol ini.');
      }
      if (typeof auth === 'undefined' || !auth.currentUser || typeof db === 'undefined') {
        throw new Error('Login diperlukan.');
      }
      const uid = auth.currentUser.uid;
      const ref = db.collection('users').doc(uid).collection('rawRecordings').doc(id);
      const metaSnap = await ref.get();
      if (!metaSnap.exists) throw new Error('Rekaman tidak ditemukan.');
      const meta = metaSnap.data();
      if (meta.storagePath) throw new Error('Rekaman ini sudah tersimpan di Supabase.');

      // Reassemble the legacy chunked JSON — content is NOT modified, only relocated.
      const chunksSnap = await ref.collection('chunks').orderBy('i').get();
      let json = '';
      chunksSnap.forEach(c => { json += (c.data().part || ''); });
      const streams = json ? JSON.parse(json) : { galaxy: [], muse: [], museRaw: [], scentra: [] };

      const { bucket, path, bytes, compressedBytes } = await _uploadStreamsToSupabase(uid, id, streams, {
        name: meta.name, startedAt: meta.startedAt, durationSec: meta.durationSec, total: meta.total,
      });

      let batch = db.batch(); let ops = 0;
      for (const c of chunksSnap.docs) {
        batch.delete(c.ref);
        if (++ops >= 400) { await batch.commit(); batch = db.batch(); ops = 0; }
      }
      if (ops > 0) await batch.commit();

      await ref.update({
        schemaVersion: 3,
        storageBucket: bucket,
        storagePath: path,
        bytes, compressedBytes,
        chunkCount: firebase.firestore.FieldValue.delete(),
        syncedAt: new Date().toISOString(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      return true;
    },

    /**
     * Global "sync everything" button target: migrates every remaining legacy
     * (schemaVersion 2) cloud recording to Supabase Storage. Recordings that
     * already have a storagePath are skipped, so calling this again — or
     * concurrently from another tab — never re-uploads or re-migrates the
     * same recording twice. Returns { total, synced, failed }.
     */
    async syncAllToSupabase() {
      if (typeof auth === 'undefined' || !auth.currentUser || typeof db === 'undefined') {
        throw new Error('Login diperlukan.');
      }
      const uid = auth.currentUser.uid;
      const snap = await db.collection('users').doc(uid).collection('rawRecordings').get();
      const legacy = snap.docs.filter(d => !d.data().storagePath);

      let synced = 0, failed = 0;
      for (const d of legacy) {
        try { await this.syncRecordingToSupabase(d.id); synced++; }
        catch (e) { failed++; console.warn('syncAllToSupabase: gagal untuk', d.id, e.message); }
      }
      return { total: legacy.length, synced, failed };
    },

    async deleteRecording(id) {
      if (id && id.indexOf(LOCAL_PREFIX) === 0) return this.deleteLocalRecording(id);
      if (typeof auth === 'undefined' || !auth.currentUser || typeof db === 'undefined') return false;
      const ref = db.collection('users').doc(auth.currentUser.uid).collection('rawRecordings').doc(id);

      const metaSnap = await ref.get();
      const meta = metaSnap.exists ? metaSnap.data() : null;
      if (meta && meta.storagePath && window.supabaseClient) {
        try { await supabaseClient.storage.from(meta.storageBucket || 'recordings').remove([meta.storagePath]); }
        catch (e) { console.warn('Supabase delete failed:', e && e.message); }
      }

      // Legacy schemaVersion 2 recordings kept their data in a chunks subcollection.
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
        const req = indexedDB.open(IDB_NAME, 2);   // v2 adds the 'recordings' store
        req.onupgradeneeded = () => {
          const d = req.result;
          if (!d.objectStoreNames.contains(IDB_STORE)) d.createObjectStore(IDB_STORE, { keyPath: 'id' });
          if (!d.objectStoreNames.contains(IDB_REC_STORE)) d.createObjectStore(IDB_REC_STORE, { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    },

    _idbPut(value, storeName = IDB_STORE) {
      return this._openIDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(value);
        tx.oncomplete = () => { db.close(); resolve(true); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      }));
    },

    _idbGet(id, storeName = IDB_STORE) {
      return this._openIDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const r = tx.objectStore(storeName).get(id);
        r.onsuccess = () => { db.close(); resolve(r.result || null); };
        r.onerror = () => { db.close(); reject(r.error); };
      }));
    },

    _idbGetAll(storeName = IDB_STORE) {
      return this._openIDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const r = tx.objectStore(storeName).getAll();
        r.onsuccess = () => { db.close(); resolve(r.result || []); };
        r.onerror = () => { db.close(); reject(r.error); };
      }));
    },

    _idbDel(id, storeName = IDB_STORE) {
      return this._openIDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(id);
        tx.oncomplete = () => { db.close(); resolve(true); };
        tx.onerror = () => { db.close(); reject(tx.error); };
      }));
    },

    /* ── Local recordings store (IndexedDB) — finished sessions that appear in
       the History page immediately, even offline, and upload when online. ── */
    async saveLocalRecording(meta = {}) {
      const summary = this.getSummary();
      const json = JSON.stringify(this.streams);
      const id = LOCAL_PREFIX + Date.now();
      const rec = {
        id, _local: true, pending: true,
        name: meta.name || this.prettyName(),
        note: meta.note || '',
        createdAtMs: Date.now(),
        startedAt: this.startedAt ? new Date(this.startedAt).toISOString() : null,
        endedAt: new Date().toISOString(),
        durationSec: summary.durationSec,
        counts: summary.counts,
        total: summary.total,
        devices: JSON.parse(JSON.stringify(this.devices)),
        bytes: json.length,
        schemaVersion: 2,
        streams: this.streams,
      };
      try { await this._idbPut(rec, IDB_REC_STORE); return id; }
      catch (e) { console.warn('saveLocalRecording failed:', e.message); return null; }
    },

    /** Metadata of locally-stored (pending) recordings, newest first. */
    async listLocalRecordings() {
      try {
        const all = await this._idbGetAll(IDB_REC_STORE);
        return all.map(r => { const { streams, ...meta } = r; return meta; })
          .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      } catch (e) { return []; }
    },

    async loadLocalRecording(id) {
      try {
        const r = await this._idbGet(id, IDB_REC_STORE);
        if (!r) return null;
        const { streams, ...meta } = r;
        return { meta, streams: streams || { galaxy: [], muse: [], museRaw: [], scentra: [] } };
      } catch (e) { return null; }
    },

    async deleteLocalRecording(id) { try { await this._idbDel(id, IDB_REC_STORE); return true; } catch (e) { return false; } },

    /** Upload one stored local recording: blob to Supabase Storage, metadata to Firestore. */
    async _uploadRecord(rec) {
      const uid = auth.currentUser.uid;
      const docRef = db.collection('users').doc(uid).collection('rawRecordings').doc();
      const { bucket, path, bytes, compressedBytes } = await _uploadStreamsToSupabase(uid, docRef.id, rec.streams || {}, {
        name: rec.name, startedAt: rec.startedAt, durationSec: rec.durationSec, total: rec.total,
      });
      await docRef.set({
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        startedAt: rec.startedAt || null,
        endedAt: rec.endedAt || new Date().toISOString(),
        durationSec: rec.durationSec || 0,
        counts: rec.counts || {}, total: rec.total || 0,
        devices: rec.devices || {},
        name: rec.name || this.prettyName(), note: rec.note || '',
        schemaVersion: 3, storageBucket: bucket, storagePath: path, bytes, compressedBytes,
      });
      return docRef.id;
    },

    /** Upload all pending local recordings to Firestore (called when online). */
    async syncLocalRecordings() {
      if (this._syncing) return 0;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return 0;
      if (typeof auth === 'undefined' || !auth.currentUser || typeof db === 'undefined') return 0;
      this._syncing = true;
      let uploaded = 0;
      try {
        const all = await this._idbGetAll(IDB_REC_STORE);
        for (const rec of all) {
          try { if (await this._uploadRecord(rec)) { await this.deleteLocalRecording(rec.id); uploaded++; } }
          catch (e) { /* keep for the next attempt */ }
        }
      } catch (e) { /* ignore */ }
      finally { this._syncing = false; }
      if (uploaded && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('recordings-synced', { detail: { count: uploaded } }));
        if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast(`${uploaded} rekaman offline terunggah ke cloud.`, 'success');
      }
      return uploaded;
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

  if (typeof window !== 'undefined') {
    window.RawRecorder = RawRecorder;
    // When the connection returns, auto-upload any pending local recordings.
    window.addEventListener('online', () => { try { RawRecorder.syncLocalRecordings(); } catch (_) {} });
  }
})();
