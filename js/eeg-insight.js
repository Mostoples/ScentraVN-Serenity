/**
 * ScentraVN Serenity — EEG Auto-Insight + Pre-Conditioning
 *
 * Sits on top of the existing MuseEEG BLE stream (does NOT touch the connection
 * flow). Every ~1.5 s it grabs a window of EEG/PPG/accel, sends it to the
 * feature worker (falling back to main-thread maths), then:
 *
 *   1. PRE-CONDITIONING — for the first 30 s of stable frontal contact it
 *      gathers a personal baseline (alpha, beta/theta, Hjorth activity, HRV).
 *      Only once stable does it report READY (gating the main recording).
 *   2. AUTO-INSIGHT — interprets each window RELATIVE to that baseline and emits
 *      a short, indicative label (focus / relaxed / positive valence / neutral).
 *
 * All labels are indicative estimates from consumer-grade EEG — not clinical.
 */
(() => {
  'use strict';

  const EEG_FS = 256, PPG_FS = 64, ACC_FS = 52;
  const WIN_MS = 1500;          // extraction cadence
  const EEG_WIN = 256;          // 1 s @ 256 Hz (power of two)
  const BASELINE_MS = 30000;    // pre-conditioning duration
  const MIN_BASE_SAMPLES = 8;   // need enough clean windows before READY

  const EEGInsight = {
    running: false,
    ready: false,
    baseline: null,
    _worker: null,
    _rawCb: null,
    _tick: null,
    _ppg: [],
    _acc: [],
    _baseStart: 0,
    _base: [],
    _onInsight: null,
    _onBaseline: null,

    /** opts: { onInsight(label, features, ready), onBaseline(state) } */
    start(opts) {
      if (this.running) this.stop();
      opts = opts || {};
      this._onInsight = opts.onInsight || null;
      this._onBaseline = opts.onBaseline || null;
      this.running = true;
      this.ready = false;
      this.baseline = null;
      this._ppg = []; this._acc = [];
      this._base = []; this._baseStart = Date.now();

      this._initWorker();

      // Collect PPG (IR) + accelerometer from the raw Muse stream.
      this._rawCb = (f) => {
        if (!f || !f.samples) return;
        if (f.ch === 'ppg2') {
          this._ppg.push(...f.samples);
          const cap = PPG_FS * 6;
          if (this._ppg.length > cap) this._ppg.splice(0, this._ppg.length - cap);
        } else if (f.ch === 'accelero') {
          for (const s of f.samples) this._acc.push(s);
          const cap = ACC_FS * 4;
          if (this._acc.length > cap) this._acc.splice(0, this._acc.length - cap);
        }
      };
      if (typeof MuseEEG !== 'undefined' && MuseEEG.onRaw) MuseEEG.onRaw(this._rawCb);

      this._tick = setInterval(() => this._extract(), WIN_MS);
      this._emitBaseline('calibrating', 0);
    },

    stop() {
      this.running = false;
      if (this._tick) { clearInterval(this._tick); this._tick = null; }
      if (this._rawCb && typeof MuseEEG !== 'undefined' && MuseEEG.offRaw) MuseEEG.offRaw(this._rawCb);
      this._rawCb = null;
      if (this._worker) { try { this._worker.terminate(); } catch (_) {} this._worker = null; }
    },

    _initWorker() {
      try {
        this._worker = new Worker('/js/feature-worker.js');
        this._worker.onmessage = (e) => { if (e.data && e.data.type === 'features') this._onFeatures(e.data.features); };
        this._worker.onerror = () => { try { this._worker.terminate(); } catch (_) {} this._worker = null; };
      } catch (_) { this._worker = null; }
    },

    _win(ch, n) { const b = (typeof MuseEEG !== 'undefined' && MuseEEG.buffers && MuseEEG.buffers[ch]) || []; return b.slice(-n); },

    _extract() {
      if (typeof MuseEEG === 'undefined' || !MuseEEG.isConnected || MuseEEG.simulationMode) return;
      const eeg = { af7: this._win('af7', EEG_WIN), af8: this._win('af8', EEG_WIN), tp9: this._win('tp9', EEG_WIN), tp10: this._win('tp10', EEG_WIN) };
      if (eeg.af7.length < 64 || eeg.af8.length < 64) return;   // not enough samples yet
      const payload = {
        type: 'extract', t: Date.now(), eeg,
        ppg: this._ppg.slice(-PPG_FS * 4), accel: this._acc.slice(-ACC_FS * 3),
        fs: { eeg: EEG_FS, ppg: PPG_FS, acc: ACC_FS },
      };
      if (this._worker) this._worker.postMessage(payload);
      else if (typeof MathUtils !== 'undefined') this._onFeatures(MathUtils.extract(payload));
    },

    _frontalGood() {
      if (typeof MuseGauge === 'undefined') return true;   // can't tell → assume ok
      const q = MuseGauge.quals();
      return q.af7 === 'good' && q.af8 === 'good';
    },

    _onFeatures(f) {
      if (!f) return;
      this.last = f;
      this._updateBaseline(f);
      if (this._onInsight) this._onInsight(this._interpret(f), f, this.ready);
    },

    _updateBaseline(f) {
      if (this.ready) return;
      // Restart the baseline clock whenever frontal contact is lost — a baseline
      // measured on a loose lead is worthless.
      if (!this._frontalGood()) {
        this._baseStart = Date.now(); this._base = [];
        this._emitBaseline('waiting_contact', 0);
        return;
      }
      if (f.bands && f.bands.alpha != null) {
        this._base.push({ alpha: f.bands.alpha, betaTheta: f.betaTheta, activity: f.hjorth && f.hjorth.activity, rmssd: f.rmssd, faa: f.faa });
      }
      const elapsed = Date.now() - this._baseStart;
      if (elapsed >= BASELINE_MS && this._base.length >= MIN_BASE_SAMPLES) {
        const avg = (k) => { const v = this._base.map(s => s[k]).filter(x => x != null && isFinite(x)); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
        this.baseline = { alpha: avg('alpha'), betaTheta: avg('betaTheta'), activity: avg('activity'), rmssd: avg('rmssd'), faa: avg('faa') };
        this.ready = true;
        this._emitBaseline('ready', BASELINE_MS);
      } else {
        this._emitBaseline('calibrating', elapsed);
      }
    },

    _emitBaseline(phase, elapsed) {
      if (this._onBaseline) this._onBaseline({ phase, elapsed, total: BASELINE_MS, ready: this.ready, baseline: this.baseline });
    },

    /**
     * Interpret one window relative to the baseline. Priority: focus → relaxed →
     * positive valence → neutral. Returns { label, tone }.
     */
    _interpret(f) {
      const b = this.baseline, bands = f.bands || {};
      const bt = f.betaTheta;
      const act = f.hjorth && f.hjorth.activity;

      const focusHigh = bt != null && (b && b.betaTheta ? bt > b.betaTheta * 1.15 : bt > 1.3);
      const relaxed = bands.alpha != null && b && b.alpha && b.activity
        && bands.alpha > b.alpha * 1.10 && act != null && act < b.activity * 0.9;
      const positive = f.faa != null && f.faa > 0.05;

      if (focusHigh) return { label: 'High Cognitive Load / Focus', tone: 'focus' };
      if (relaxed) return { label: 'Relaxed', tone: 'relax' };
      if (positive) return { label: 'Positive Valence / Approach', tone: 'positive' };
      return { label: 'Neutral', tone: 'neutral' };
    },
  };

  if (typeof window !== 'undefined') window.EEGInsight = EEGInsight;
})();
