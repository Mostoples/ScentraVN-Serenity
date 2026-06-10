/**
 * ScentraVN Serenity — Math Utilities (pure, dependency-free)
 *
 * Feature-extraction maths for EEG / PPG / accelerometer windows. Designed to
 * run inside a Web Worker (attaches to `self`) but also usable on the main
 * thread (attaches to `window`). No DOM, no external libraries.
 *
 * Provides:
 *   Time domain   : hjorth() (activity/mobility/complexity), zeroCrossingRate()
 *   Frequency dom.: bandPowers() (delta..gamma via FFT), frontalAlphaAsymmetry()
 *   Physical dom. : ppgRmssd() (HRV from PPG), motionLevel() (accelerometer)
 *   extract()     : one-call window → feature object (shared by worker + main)
 */
(function (root) {
  'use strict';

  const BANDS = { delta: [0.5, 4], theta: [4, 8], alpha: [8, 13], smr: [12, 15], beta: [13, 30], gamma: [30, 44] };

  const mean = (a) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : 0; };
  const variance = (a) => { if (a.length < 2) return 0; const m = mean(a); let s = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - m; s += d * d; } return s / a.length; };
  const nextPow2Floor = (n) => (n < 2 ? 1 : 1 << Math.floor(Math.log2(n)));

  /* In-place iterative Cooley-Tukey FFT (N power of two). */
  function fft(re, im, N) {
    let j = 0;
    for (let i = 1; i < N; i++) {
      let bit = N >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) { const tr = re[i]; re[i] = re[j]; re[j] = tr; const ti = im[i]; im[i] = im[j]; im[j] = ti; }
    }
    for (let len = 2; len <= N; len <<= 1) {
      const ang = -2 * Math.PI / len, wRe = Math.cos(ang), wIm = Math.sin(ang);
      for (let i = 0; i < N; i += len) {
        let curRe = 1, curIm = 0;
        for (let k = 0; k < len / 2; k++) {
          const a = i + k, b = i + k + len / 2;
          const vRe = re[b] * curRe - im[b] * curIm;
          const vIm = re[b] * curIm + im[b] * curRe;
          re[b] = re[a] - vRe; im[b] = im[a] - vIm;
          re[a] += vRe; im[a] += vIm;
          const tmp = curRe * wRe - curIm * wIm;
          curIm = curRe * wIm + curIm * wRe; curRe = tmp;
        }
      }
    }
  }

  /**
   * Hjorth parameters. Activity = signal variance; Mobility = sqrt(var(x')/var(x));
   * Complexity = mobility(x') / mobility(x). Robust to short windows.
   */
  function hjorth(x) {
    if (!x || x.length < 3) return { activity: 0, mobility: 0, complexity: 0 };
    const d1 = new Float64Array(x.length - 1);
    for (let i = 0; i < d1.length; i++) d1[i] = x[i + 1] - x[i];
    const d2 = new Float64Array(d1.length - 1);
    for (let i = 0; i < d2.length; i++) d2[i] = d1[i + 1] - d1[i];
    const v0 = variance(x), v1 = variance(d1), v2 = variance(d2);
    const mobility = v0 > 0 ? Math.sqrt(v1 / v0) : 0;
    const mob1 = v1 > 0 ? Math.sqrt(v2 / v1) : 0;
    const complexity = mobility > 0 ? mob1 / mobility : 0;
    return { activity: v0, mobility, complexity };
  }

  /** Zero-crossing rate of the mean-centred signal (0..1). */
  function zeroCrossingRate(x) {
    if (!x || x.length < 2) return 0;
    const m = mean(x);
    let c = 0, prev = x[0] - m;
    for (let i = 1; i < x.length; i++) {
      const v = x[i] - m;
      if ((prev < 0 && v >= 0) || (prev > 0 && v <= 0)) c++;
      prev = v;
    }
    return c / (x.length - 1);
  }

  /**
   * Absolute band power (µV²) per band via one-sided PSD. Detrends, applies a
   * Hann window, and uses the largest power-of-two suffix of the input.
   */
  function bandPowers(samples, fs) {
    const out = { delta: 0, theta: 0, alpha: 0, smr: 0, beta: 0, gamma: 0, _alphaPeak: 10 };
    if (!samples || samples.length < 16 || !fs) return out;
    const N = nextPow2Floor(samples.length);
    const start = samples.length - N;
    const m = mean(samples.slice(start));
    const re = new Float64Array(N), im = new Float64Array(N);
    let U = 0;
    for (let n = 0; n < N; n++) {
      const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1));
      re[n] = (samples[start + n] - m) * w;
      U += w * w;
    }
    fft(re, im, N);
    const freqRes = fs / N, half = N >> 1, norm = 2 / (fs * U);
    const psd = new Float64Array(half);
    for (let k = 1; k < half; k++) psd[k] = (re[k] * re[k] + im[k] * im[k]) * norm;
    for (const band in BANDS) {
      const lo = BANDS[band][0], hi = BANDS[band][1];
      let p = 0;
      for (let k = Math.ceil(lo / freqRes); k <= Math.floor(hi / freqRes) && k < half; k++) p += psd[k] * freqRes;
      out[band] = p;
    }
    let peakPow = 0, peakFreq = 10;
    for (let k = Math.ceil(8 / freqRes); k <= Math.floor(13 / freqRes) && k < half; k++) {
      if (psd[k] > peakPow) { peakPow = psd[k]; peakFreq = k * freqRes; }
    }
    out._alphaPeak = peakFreq;
    return out;
  }

  /** Frontal Alpha Asymmetry: ln(α_AF8) − ln(α_AF7). Positive ⇒ approach/positive. */
  function frontalAlphaAsymmetry(alphaAF7, alphaAF8) {
    if (alphaAF7 > 0 && alphaAF8 > 0) return Math.log(alphaAF8) - Math.log(alphaAF7);
    return null;
  }

  /** Detect PPG pulse peaks (indices) with an adaptive threshold + refractory gap. */
  function detectPeaks(x, fs) {
    const peaks = [];
    if (!x || x.length < fs) return peaks;
    const m = mean(x), sd = Math.sqrt(variance(x));
    const thr = m + 0.5 * sd;
    const minGap = Math.max(1, Math.round(0.4 * fs));   // ≤150 BPM
    let last = -minGap;
    for (let i = 1; i < x.length - 1; i++) {
      if (x[i] > thr && x[i] >= x[i - 1] && x[i] > x[i + 1] && (i - last) >= minGap) {
        peaks.push(i); last = i;
      }
    }
    return peaks;
  }

  /** RMSSD (ms) from an array of RR intervals (ms). */
  function rmssd(rr) {
    if (!rr || rr.length < 3) return null;
    let s = 0, n = 0;
    for (let i = 1; i < rr.length; i++) { const d = rr[i] - rr[i - 1]; s += d * d; n++; }
    return n ? Math.sqrt(s / n) : null;
  }

  /** HRV RMSSD from raw PPG samples (detect peaks → RR intervals → RMSSD). */
  function ppgRmssd(ppg, fs) {
    const peaks = detectPeaks(ppg, fs);
    if (peaks.length < 4) return null;
    const rr = [];
    for (let i = 1; i < peaks.length; i++) {
      const ms = (peaks[i] - peaks[i - 1]) / fs * 1000;
      if (ms >= 300 && ms <= 2000) rr.push(ms);   // 30–200 BPM plausibility gate
    }
    return rmssd(rr);
  }

  /**
   * Movement level from accelerometer samples (array of [x,y,z]). Returns the
   * std-dev of the acceleration magnitude — higher = more motion/artefact.
   */
  function motionLevel(accel) {
    if (!accel || !accel.length) return null;
    const mag = new Float64Array(accel.length);
    for (let i = 0; i < accel.length; i++) {
      const s = accel[i];
      if (Array.isArray(s)) mag[i] = Math.sqrt(s[0] * s[0] + s[1] * s[1] + s[2] * s[2]);
      else mag[i] = Math.abs(Number(s) || 0);
    }
    return Math.sqrt(variance(mag));
  }

  /**
   * One-call window → feature object. Shared by the feature worker and the
   * main-thread fallback so both paths produce identical results.
   * payload = { t, eeg:{af7,af8,tp9,tp10}, ppg:[], accel:[[x,y,z]…], fs:{eeg,ppg,acc} }
   */
  function extract(p) {
    const fsE = (p.fs && p.fs.eeg) || 256;
    const fsP = (p.fs && p.fs.ppg) || 64;
    const e = p.eeg || {};
    const bp7 = bandPowers(e.af7, fsE), bp8 = bandPowers(e.af8, fsE);
    const avg = (k) => ((bp7[k] || 0) + (bp8[k] || 0)) / 2;
    const bands = { delta: avg('delta'), theta: avg('theta'), alpha: avg('alpha'), smr: avg('smr'), beta: avg('beta'), gamma: avg('gamma') };
    const ref = (e.af7 && e.af7.length >= 16) ? e.af7 : (e.af8 || []);
    return {
      t: p.t,
      bands,
      faa: frontalAlphaAsymmetry(bp7.alpha, bp8.alpha),
      hjorth: hjorth(ref),
      zcr: zeroCrossingRate(ref),
      betaTheta: bands.theta > 1e-6 ? bands.beta / bands.theta : null,
      rmssd: (p.ppg && p.ppg.length >= fsP) ? ppgRmssd(p.ppg, fsP) : null,
      motion: (p.accel && p.accel.length) ? motionLevel(p.accel) : null,
    };
  }

  root.MathUtils = {
    BANDS, fft, hjorth, zeroCrossingRate, bandPowers,
    frontalAlphaAsymmetry, detectPeaks, rmssd, ppgRmssd, motionLevel, extract,
  };
})(typeof self !== 'undefined' ? self : this);
