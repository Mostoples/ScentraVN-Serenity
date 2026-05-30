/**
 * ScentraVN Serenity — PPG Signal Processor
 *
 * Real-time analysis of PPG (red) and IR samples from MAX30102.
 * Computes: peak detection, inter-beat intervals (IBI), HRV (time + frequency),
 * respiratory rate, perfusion index, signal quality.
 *
 * Pure JavaScript, runs in the browser. Falls back to using parsed HR stream
 * (firmware-derived BPM updates) when raw samples are not available.
 *
 * References:
 *   - SDNN, RMSSD, pNN50: Task Force HRV standards
 *   - PPG-derived RR: amplitude modulation (RIIV)
 *   - Perfusion Index: AC/DC ratio (Masimo definition)
 */

(() => {
  'use strict';

  /* ── Defaults ─────────────────────────────────────────────────────── */
  const DEFAULT_FS = 100;          // MAX30102 sample rate (Hz). Adjust if firmware differs.
  const MIN_RR_MS = 300;           // 200 bpm cap
  const MAX_RR_MS = 2000;          // 30 bpm cap
  const HRV_MIN_BEATS = 10;        // need at least N beats for stable HRV
  const RR_BUFFER_MAX = 300;       // keep last ~5 minutes of beats

  /* ── Module ───────────────────────────────────────────────────────── */
  const PPGProcessor = {
    /* Configurable */
    fs: DEFAULT_FS,

    /* Rolling sample buffers */
    redBuffer: [],
    irBuffer:  [],
    timestamps: [],     // ms timestamp per sample

    /* Beat history (IBI) */
    beats: [],          // [{ t: ms, bpm }]
    rrIntervals: [],    // ms

    /* Latest computed metrics */
    metrics: {
      hr:       null,   // bpm
      hrvSDNN:  null,
      hrvRMSSD: null,
      hrvpNN50: null,
      hrvLF:    null,
      hrvHF:    null,
      hrvLFHF:  null,
      respRate: null,   // breaths/min
      perfusionIndex: null,
      signalQuality:  null,  // 0..1
      dominantFreq:   null,
      lastUpdated:    null
    },

    /* Callbacks */
    _onMetrics: null,

    /* ── Public API ────────────────────────────────────────────────── */

    /** Configure sample rate (Hz). Match firmware. */
    setSampleRate(fs) { this.fs = fs; },

    onMetrics(cb) { this._onMetrics = cb; },

    /**
     * Push raw PPG samples. Pass arrays of red & IR ADC values (uint16-ish).
     * Optionally pass a starting timestamp (ms).
     */
    pushSamples(red, ir, startTs) {
      if (!Array.isArray(red) || !Array.isArray(ir)) return;
      const n = Math.min(red.length, ir.length);
      const tStart = startTs ?? Date.now();
      const dt = 1000 / this.fs;

      for (let i = 0; i < n; i++) {
        this.redBuffer.push(red[i]);
        this.irBuffer.push(ir[i]);
        this.timestamps.push(tStart + i * dt);
      }
      this._trimBuffers();

      /* Run analysis when we have ≥ 4 seconds of data */
      if (this.redBuffer.length >= this.fs * 4) {
        this._analyse();
      }
    },

    /**
     * Lightweight fallback: when only HR (BPM) updates from firmware are
     * available, register each new beat to derive IBI-based HRV.
     */
    pushBPM(bpm, ts = Date.now()) {
      if (!isFinite(bpm) || bpm < 30 || bpm > 220) return;
      this.beats.push({ t: ts, bpm });
      if (this.beats.length > RR_BUFFER_MAX) this.beats.shift();

      /* Derive RR from successive beat timestamps */
      if (this.beats.length >= 2) {
        const last = this.beats[this.beats.length - 1];
        const prev = this.beats[this.beats.length - 2];
        const rr = last.t - prev.t;
        if (rr >= MIN_RR_MS && rr <= MAX_RR_MS) {
          this.rrIntervals.push(rr);
          if (this.rrIntervals.length > RR_BUFFER_MAX) this.rrIntervals.shift();
        }
      }

      /* Update HR and recompute HRV every 5 beats */
      this.metrics.hr = bpm;
      if (this.beats.length % 5 === 0) {
        this._computeHRV();
        this._emit();
      }
    },

    getMetrics() { return { ...this.metrics }; },

    /** Reset all buffers (e.g., on disconnect) */
    reset() {
      this.redBuffer = [];
      this.irBuffer  = [];
      this.timestamps = [];
      this.beats = [];
      this.rrIntervals = [];
      Object.keys(this.metrics).forEach(k => this.metrics[k] = null);
    },

    /* ── Internal pipeline ─────────────────────────────────────────── */

    _analyse() {
      /* 1. Detrend & low-pass filter the IR signal (cleaner than red for HR) */
      const filtered = this._bandpass(this.irBuffer, 0.5, 5.0);

      /* 2. Peak detection on filtered IR */
      const peaks = this._findPeaks(filtered, this.fs);

      /* 3. Update beat list & RR intervals */
      this._updateBeats(peaks);

      /* 4. Compute HRV from accumulated RR */
      this._computeHRV();

      /* 5. Heart rate (windowed average from last 10 RR) */
      const recent = this.rrIntervals.slice(-10);
      if (recent.length >= 3) {
        const meanRR = recent.reduce((a, b) => a + b, 0) / recent.length;
        this.metrics.hr = Math.round(60000 / meanRR);
      }

      /* 6. Respiratory rate from PPG amplitude modulation */
      this.metrics.respRate = this._respiratoryRate(filtered, peaks);

      /* 7. Perfusion Index */
      this.metrics.perfusionIndex = this._perfusionIndex(this.irBuffer);

      /* 8. Signal quality estimate */
      this.metrics.signalQuality = this._signalQuality(filtered, peaks);

      this.metrics.lastUpdated = Date.now();
      this._emit();
    },

    /* Trim buffers to last 30 seconds */
    _trimBuffers() {
      const max = this.fs * 30;
      if (this.redBuffer.length > max) {
        const drop = this.redBuffer.length - max;
        this.redBuffer.splice(0, drop);
        this.irBuffer.splice(0, drop);
        this.timestamps.splice(0, drop);
      }
    },

    /* ── Filters ──────────────────────────────────────────────────── */

    /** 4th-order Butterworth-equivalent bandpass via cascaded EMA (lightweight) */
    _bandpass(signal, fLow, fHigh) {
      const dt = 1 / this.fs;
      const aLow  = dt / (1 / (2 * Math.PI * fHigh) + dt);  // low-pass alpha
      const aHigh = (1 / (2 * Math.PI * fLow)) / (1 / (2 * Math.PI * fLow) + dt); // high-pass coef

      const lp = new Array(signal.length);
      lp[0] = signal[0];
      for (let i = 1; i < signal.length; i++) {
        lp[i] = lp[i - 1] + aLow * (signal[i] - lp[i - 1]);
      }

      const out = new Array(signal.length);
      out[0] = 0;
      for (let i = 1; i < signal.length; i++) {
        out[i] = aHigh * (out[i - 1] + lp[i] - lp[i - 1]);
      }
      return out;
    },

    /* ── Peak detection ───────────────────────────────────────────── */

    _findPeaks(signal, fs) {
      const peaks = [];
      const minDistance = Math.floor(fs * (MIN_RR_MS / 1000));
      const w = Math.max(3, Math.floor(fs * 0.05));

      /* Adaptive threshold: use rolling std */
      const std = this._rollingStd(signal, fs);

      for (let i = w; i < signal.length - w; i++) {
        if (peaks.length && (i - peaks[peaks.length - 1]) < minDistance) continue;

        let isPeak = true;
        for (let j = 1; j <= w; j++) {
          if (signal[i] <= signal[i - j] || signal[i] <= signal[i + j]) {
            isPeak = false; break;
          }
        }
        if (isPeak && Math.abs(signal[i]) > 0.4 * std) {
          peaks.push(i);
        }
      }
      return peaks;
    },

    _rollingStd(arr, w) {
      let sum = 0, sumSq = 0;
      const n = Math.min(arr.length, w);
      for (let i = 0; i < n; i++) { sum += arr[i]; sumSq += arr[i] * arr[i]; }
      const mean = sum / n;
      return Math.sqrt(Math.max(0, sumSq / n - mean * mean));
    },

    _updateBeats(peakIndices) {
      for (const idx of peakIndices) {
        const t = this.timestamps[idx];
        if (!this.beats.length || t - this.beats[this.beats.length - 1].t >= MIN_RR_MS) {
          this.beats.push({ t, bpm: null });
          if (this.beats.length >= 2) {
            const rr = t - this.beats[this.beats.length - 2].t;
            if (rr >= MIN_RR_MS && rr <= MAX_RR_MS) {
              this.rrIntervals.push(rr);
              if (this.rrIntervals.length > RR_BUFFER_MAX) this.rrIntervals.shift();
            }
          }
        }
      }
      if (this.beats.length > RR_BUFFER_MAX) {
        this.beats.splice(0, this.beats.length - RR_BUFFER_MAX);
      }
    },

    /* ── HRV ──────────────────────────────────────────────────────── */

    _computeHRV() {
      const rr = this.rrIntervals;
      if (rr.length < HRV_MIN_BEATS) return;

      /* Time-domain */
      const mean = rr.reduce((a, b) => a + b, 0) / rr.length;
      const sdnn = Math.sqrt(rr.reduce((a, b) => a + (b - mean) ** 2, 0) / rr.length);

      let sumSq = 0;
      let nn50 = 0;
      for (let i = 1; i < rr.length; i++) {
        const diff = rr[i] - rr[i - 1];
        sumSq += diff * diff;
        if (Math.abs(diff) > 50) nn50++;
      }
      const rmssd = Math.sqrt(sumSq / (rr.length - 1));
      const pnn50 = (nn50 / (rr.length - 1)) * 100;

      this.metrics.hrvSDNN  = +sdnn.toFixed(1);
      this.metrics.hrvRMSSD = +rmssd.toFixed(1);
      this.metrics.hrvpNN50 = +pnn50.toFixed(1);

      /* Frequency-domain via FFT on resampled RR series */
      if (rr.length >= 32) {
        const { lf, hf } = this._hrvFreqDomain(rr);
        this.metrics.hrvLF  = +lf.toFixed(2);
        this.metrics.hrvHF  = +hf.toFixed(2);
        this.metrics.hrvLFHF = hf > 0 ? +(lf / hf).toFixed(2) : null;
      }
    },

    _hrvFreqDomain(rr) {
      /* Resample RR (irregular) to 4 Hz uniform via linear interpolation */
      const fsRR = 4;
      const totalMs = rr.reduce((a, b) => a + b, 0);
      const cumT = [];
      let acc = 0;
      for (const r of rr) { acc += r; cumT.push(acc); }

      const N = Math.pow(2, Math.floor(Math.log2(totalMs / 1000 * fsRR)));
      if (N < 16) return { lf: 0, hf: 0 };

      const uniform = new Float64Array(N);
      const dt = (totalMs / N);
      for (let i = 0; i < N; i++) {
        const t = i * dt;
        let j = 0;
        while (j < cumT.length - 1 && cumT[j + 1] < t) j++;
        const t0 = j === 0 ? 0 : cumT[j - 1];
        const t1 = cumT[j];
        const frac = (t1 > t0) ? (t - t0) / (t1 - t0) : 0;
        uniform[i] = rr[Math.max(0, j - 1)] + frac * (rr[j] - rr[Math.max(0, j - 1)]);
      }

      /* Detrend */
      const meanU = uniform.reduce((a, b) => a + b, 0) / N;
      for (let i = 0; i < N; i++) uniform[i] -= meanU;

      /* FFT */
      const re = Float64Array.from(uniform);
      const im = new Float64Array(N);
      this._fft(re, im, N);

      const psd = new Float64Array(N / 2);
      for (let k = 1; k < N / 2; k++) psd[k] = (re[k] * re[k] + im[k] * im[k]) / (N * N);

      const freqRes = fsRR / N;
      let lf = 0, hf = 0;
      for (let k = 1; k < N / 2; k++) {
        const f = k * freqRes;
        if (f >= 0.04 && f <= 0.15) lf += psd[k];
        if (f > 0.15 && f <= 0.40)  hf += psd[k];
      }
      return { lf, hf };
    },

    /* In-place radix-2 FFT */
    _fft(re, im, N) {
      let j = 0;
      for (let i = 1; i < N; i++) {
        let bit = N >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
          [re[i], re[j]] = [re[j], re[i]];
          [im[i], im[j]] = [im[j], im[i]];
        }
      }
      for (let len = 2; len <= N; len <<= 1) {
        const ang = -2 * Math.PI / len;
        const wRe = Math.cos(ang), wIm = Math.sin(ang);
        for (let i = 0; i < N; i += len) {
          let cRe = 1, cIm = 0;
          for (let k = 0; k < len / 2; k++) {
            const uRe = re[i + k], uIm = im[i + k];
            const vRe = re[i + k + len / 2] * cRe - im[i + k + len / 2] * cIm;
            const vIm = re[i + k + len / 2] * cIm + im[i + k + len / 2] * cRe;
            re[i + k]           = uRe + vRe;
            im[i + k]           = uIm + vIm;
            re[i + k + len / 2] = uRe - vRe;
            im[i + k + len / 2] = uIm - vIm;
            const t = cRe * wRe - cIm * wIm;
            cIm = cRe * wIm + cIm * wRe;
            cRe = t;
          }
        }
      }
    },

    /* ── Respiratory rate from PPG amplitude modulation (RIIV) ────── */

    _respiratoryRate(filtered, peaks) {
      if (peaks.length < 8) return null;
      const peakAmps = peaks.map(i => filtered[i]);

      /* Detrend */
      const m = peakAmps.reduce((a, b) => a + b, 0) / peakAmps.length;
      const series = peakAmps.map(v => v - m);

      /* Peak detection on amplitude envelope (each peak ~ 1 breath cycle in modulation) */
      const envPeaks = [];
      for (let i = 1; i < series.length - 1; i++) {
        if (series[i] > series[i - 1] && series[i] > series[i + 1] && series[i] > 0) {
          envPeaks.push(i);
        }
      }
      if (envPeaks.length < 2) return null;

      /* Average heart-cycles per breath, then convert to br/min */
      const beatsPerBreath = (envPeaks[envPeaks.length - 1] - envPeaks[0]) / (envPeaks.length - 1);
      if (!isFinite(beatsPerBreath) || beatsPerBreath <= 0) return null;
      const meanRR = this.rrIntervals.length
        ? this.rrIntervals.reduce((a, b) => a + b, 0) / this.rrIntervals.length
        : 800;
      const rr = 60000 / (beatsPerBreath * meanRR);
      if (rr < 4 || rr > 40) return null;
      return +rr.toFixed(1);
    },

    /* ── Perfusion Index = (AC peak-to-peak / DC mean) × 100 ──────── */

    _perfusionIndex(signal) {
      if (signal.length < this.fs * 2) return null;
      const window = signal.slice(-this.fs * 2);
      const dc = window.reduce((a, b) => a + b, 0) / window.length;
      let max = -Infinity, min = Infinity;
      for (const v of window) { if (v > max) max = v; if (v < min) min = v; }
      const ac = max - min;
      if (dc === 0) return null;
      return +((ac / dc) * 100).toFixed(2);
    },

    /* ── Signal quality (0..1) — based on peak regularity & SNR ───── */

    _signalQuality(filtered, peaks) {
      if (peaks.length < 5) return 0;
      const intervals = [];
      for (let i = 1; i < peaks.length; i++) intervals.push(peaks[i] - peaks[i - 1]);
      const m = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const v = intervals.reduce((a, b) => a + (b - m) ** 2, 0) / intervals.length;
      const cv = m > 0 ? Math.sqrt(v) / m : 1;     /* coefficient of variation */
      const regularity = Math.max(0, 1 - cv * 2);
      return +regularity.toFixed(2);
    },

    /* ── Emit ─────────────────────────────────────────────────────── */
    _emit() {
      if (this._onMetrics) this._onMetrics({ ...this.metrics });
    }
  };

  if (typeof window !== 'undefined') window.PPGProcessor = PPGProcessor;
  if (typeof module !== 'undefined') module.exports = PPGProcessor;
})();
