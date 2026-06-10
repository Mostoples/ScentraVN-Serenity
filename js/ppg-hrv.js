/**
 * ScentraVN Serenity — Muse PPG → HRV Processor (biomedical signal pipeline)
 *
 * Plugs into the existing BLE 'characteristicvaluechanged' handler WITHOUT
 * touching the EEG logic. Pipeline:
 *   ingest (per-sample timestamps) → Butterworth band-pass (0.5–8 Hz) →
 *   adaptive derivative peak detection → IBI outlier rejection → BPM + RMSSD.
 *
 * INJECT POINT: for each Muse PPG (IR) packet, call
 *     musePPG.pushPacket(irSamples, performance.now());
 * then read musePPG.bpm / musePPG.rmssd / musePPG.sqi.
 *
 * Exposed as window.MusePPG (a class) — distinct from the watch's PPGProcessor.
 */
(() => {
  'use strict';

  /* ── Biquad (Direct Form I) ─────────────────────────────────────────── */
  function biquad(b0, b1, b2, a1, a2) { return { b0, b1, b2, a1, a2, x1: 0, x2: 0, y1: 0, y2: 0 }; }
  function run(s, x) {
    const y = s.b0 * x + s.b1 * s.x1 + s.b2 * s.x2 - s.a1 * s.y1 - s.a2 * s.y2;
    s.x2 = s.x1; s.x1 = x; s.y2 = s.y1; s.y1 = y;
    return y;
  }
  // RBJ cookbook 2nd-order Butterworth (Q = 1/√2) low-/high-pass biquads.
  function designLP(fs, f0, Q) {
    const w = 2 * Math.PI * f0 / fs, c = Math.cos(w), sn = Math.sin(w), al = sn / (2 * Q), a0 = 1 + al;
    return biquad((1 - c) / 2 / a0, (1 - c) / a0, (1 - c) / 2 / a0, (-2 * c) / a0, (1 - al) / a0);
  }
  function designHP(fs, f0, Q) {
    const w = 2 * Math.PI * f0 / fs, c = Math.cos(w), sn = Math.sin(w), al = sn / (2 * Q), a0 = 1 + al;
    return biquad((1 + c) / 2 / a0, -(1 + c) / a0, (1 + c) / 2 / a0, (-2 * c) / a0, (1 - al) / a0);
  }
  const median = (a) => {
    if (!a.length) return 0;
    const b = a.slice().sort((x, y) => x - y), m = b.length >> 1;
    return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
  };

  class MusePPGProcessor {
    constructor(opts = {}) {
      this.fs = opts.fs || 64;                       // Muse PPG ≈ 64 Hz (tunable)
      this.lowHz = opts.lowHz != null ? opts.lowHz : 0.5;   // remove baseline/breathing
      this.highHz = opts.highHz != null ? opts.highHz : 8;  // keep the sharp upstroke
      this.Q = Math.SQRT1_2;                         // Butterworth, maximally flat
      this.refractoryMs = opts.refractoryMs || 300;  // ≤ 200 BPM
      this.minIbi = opts.minIbi || 300;              // 200 BPM
      this.maxIbi = opts.maxIbi || 2000;             // 30 BPM
      this.ibiWindowMs = (opts.ibiWindowSec || 45) * 1000;  // HRV window
      this._design();
      this.reset();
    }

    /** Re-design the band-pass when the sample rate changes (tunable fs). */
    setSampleRate(fs) { this.fs = fs || 64; this._design(); this.reset(); }
    _design() { this._hp = designHP(this.fs, this.lowHz, this.Q); this._lp = designLP(this.fs, this.highHz, this.Q); }

    reset() {
      for (const s of [this._hp, this._lp]) if (s) { s.x1 = s.x2 = s.y1 = s.y2 = 0; }
      this._prevF = null; this._prevDeriv = 0; this._prevT = 0;
      this._env = 0; this._lastPeakT = 0;
      this.ibis = [];                 // recent inter-beat intervals: { t, ibi }
      this.bpm = null; this.rmssd = null; this.sqi = 0;
      this.lastIr = null; this.lastFiltered = 0;
      this._acc = 2; this._rej = 0;   // beat acceptance counters (seeded)
    }

    /**
     * INJECT POINT — one BLE packet of IR samples + its arrival time.
     * Per-sample timestamps are interpolated BACKWARDS from the high-resolution
     * arrival time so BLE jitter / packet loss doesn't distort IBI timing.
     */
    pushPacket(samples, tArrivalMs) {
      if (!samples || !samples.length) return;
      const n = samples.length;
      const t0 = (typeof tArrivalMs === 'number') ? tArrivalMs
        : (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const dt = 1000 / this.fs;
      for (let i = 0; i < n; i++) this.pushSample(samples[i], t0 - (n - 1 - i) * dt);
    }

    /** Process a single raw IR sample at time t (ms). */
    pushSample(raw, t) {
      raw = Number(raw);
      if (!isFinite(raw)) return;
      this.lastIr = raw;

      // 1) Band-pass: high-pass (baseline drift) then low-pass (HF noise).
      const f = run(this._lp, run(this._hp, raw));
      this.lastFiltered = f;

      // 2) Envelope follower → adaptive amplitude threshold (fast attack/slow decay).
      const af = Math.abs(f);
      this._env = af > this._env ? af : this._env * 0.995 + af * 0.005;
      const thr = 0.35 * this._env;

      // 3) Systolic peak = derivative sign change (+ → −) above the threshold.
      //    Using the local max + refractory gives a stable fiducial point.
      if (this._prevF !== null) {
        const deriv = f - this._prevF;
        if (this._prevDeriv > 0 && deriv <= 0 && this._prevF > thr) this._onPeak(this._prevT, this._prevF);
        this._prevDeriv = deriv;
      }
      this._prevF = f; this._prevT = t;
    }

    _onPeak(t, amp) {
      if (this._lastPeakT && (t - this._lastPeakT) < this.refractoryMs) return;   // refractory
      if (this._lastPeakT) this._addIbi(t, t - this._lastPeakT);
      this._lastPeakT = t;
    }

    /** Add an inter-beat interval with physiologic + median outlier rejection. */
    _addIbi(t, ibi) {
      let ok = ibi >= this.minIbi && ibi <= this.maxIbi;
      // Reject missed/extra beats (IBI ≈ 2× / 0.5×) vs the running median.
      if (ok && this.ibis.length >= 4) {
        const med = median(this.ibis.slice(-7).map(x => x.ibi));
        if (med > 0 && Math.abs(ibi - med) / med > 0.30) ok = false;
      }
      if (ok) { this.ibis.push({ t, ibi }); this._acc++; } else { this._rej++; }

      const cutoff = t - this.ibiWindowMs;
      while (this.ibis.length && this.ibis[0].t < cutoff) this.ibis.shift();
      this._acc *= 0.98; this._rej *= 0.98;
      this._recompute();
    }

    _recompute() {
      const arr = this.ibis.map(x => x.ibi);
      const accRatio = Math.max(0, Math.min(1, this._acc / (this._acc + this._rej)));
      let reg = 0;   // IBI regularity — erratic beats (noise/poor contact) score low

      if (arr.length >= 3) {
        const med = median(arr);
        // Robust dispersion (mean abs deviation around the median) → coeff. of var.
        let mad = 0; for (const v of arr) mad += Math.abs(v - med); mad /= arr.length;
        const cv = med > 0 ? mad / med : 1;
        reg = Math.max(0, Math.min(1, 1 - (cv - 0.08) / 0.30));   // cv<0.08→1, cv>0.38→0

        this.bpm = Math.round(60000 / med);                       // robust HR from median IBI
        let s = 0, k = 0;
        for (let i = 1; i < arr.length; i++) { const d = arr[i] - arr[i - 1]; s += d * d; k++; }
        this.rmssd = k ? Math.round(Math.sqrt(s / k)) : null;      // RMSSD in ms
      } else { this.bpm = null; this.rmssd = null; }

      // Quality = beats accepted × IBI regularity, gated by AC pulsatility floor.
      const ampOk = Math.max(0, Math.min(1, this._env / 8));
      this.sqi = Math.max(0, Math.min(1, accRatio * reg * (0.3 + 0.7 * ampOk)));
    }
  }

  if (typeof window !== 'undefined') window.MusePPG = MusePPGProcessor;
})();
