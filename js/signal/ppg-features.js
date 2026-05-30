/**
 * ScentraVN Serenity — PPG Feature Extraction
 *
 * Extracts morphological & statistical features from PPG/IR samples that
 * downstream ML models (glucose, BP, vascular age) consume.
 *
 * Feature set follows: Salamea-Palacios et al. 2025 (MDPI Biosensors),
 * Satter et al. 2024 (Sci. Reports), and EMD-based PPG approaches.
 *
 * Designed to be runnable both with raw red+IR samples (preferred)
 * or only with HR/HRV summary metrics (degraded mode).
 */

(() => {
  'use strict';

  const PPGFeatures = {

    /**
     * Extract a feature vector suitable for downstream regression/classification.
     *
     * @param {Object} input
     * @param {number[]} [input.red]    Raw red samples (last few seconds)
     * @param {number[]} [input.ir]     Raw IR samples
     * @param {number[]} [input.peaks]  Indices of detected systolic peaks (in samples)
     * @param {number}   [input.fs]     Sample rate (Hz). Default 100.
     * @param {Object}   [input.hrv]    Already-computed HRV { sdnn, rmssd, pnn50, lf, hf, lfhf }
     * @param {number}   [input.hr]     BPM
     * @param {number}   [input.spo2]   SpO2 percentage (0..100) when known
     * @param {number}   [input.age]    User age (years)
     * @param {number}   [input.bmi]    Optional BMI
     * @returns {Object} feature dict
     */
    extract({ red = [], ir = [], peaks = [], fs = 100, hrv = {}, hr = null, spo2 = null, age = null, bmi = null } = {}) {
      const features = {
        /* Cardiovascular core */
        hr:        hr ?? null,
        spo2:      spo2 ?? null,

        /* HRV time-domain */
        sdnn:   hrv.sdnn  ?? hrv.hrvSDNN  ?? null,
        rmssd:  hrv.rmssd ?? hrv.hrvRMSSD ?? null,
        pnn50:  hrv.pnn50 ?? hrv.hrvpNN50 ?? null,

        /* HRV frequency-domain */
        lf:    hrv.lf   ?? hrv.hrvLF   ?? null,
        hf:    hrv.hf   ?? hrv.hrvHF   ?? null,
        lfhf:  hrv.lfhf ?? hrv.hrvLFHF ?? null,

        /* PPG morphology (only if raw samples + peaks given) */
        ppgAmpMean:    null,
        ppgAmpStd:     null,
        ppgRiseTime:   null,    // ms — onset → systolic peak
        ppgFallTime:   null,    // ms — peak → next onset
        ppgWidth50:    null,    // pulse width at 50% amplitude
        ppgAreaSys:    null,    // area under systolic phase
        ppgAreaDia:    null,    // area under diastolic phase
        augmentationIdx: null,  // AI = (P2 - P1) / P1
        reflectionIdx:   null,  // RI = late peak / systolic peak

        /* Spectral */
        psdLow:   null,         // 0–1 Hz energy
        psdHigh:  null,         // 1–5 Hz energy
        spectralEntropy: null,

        /* Demographics (optional priors for ML) */
        age: age ?? null,
        bmi: bmi ?? null
      };

      if (red.length && peaks.length >= 3) {
        Object.assign(features, this._morphological(ir.length ? ir : red, peaks, fs));
        Object.assign(features, this._spectral(ir.length ? ir : red, fs));
      }

      return features;
    },

    /* ── Morphological features ───────────────────────────────────── */

    _morphological(signal, peaks, fs) {
      const out = {
        ppgAmpMean: null, ppgAmpStd: null,
        ppgRiseTime: null, ppgFallTime: null,
        ppgWidth50: null,
        ppgAreaSys: null, ppgAreaDia: null,
        augmentationIdx: null, reflectionIdx: null
      };

      const amps = [];
      const rises = [];
      const widths50 = [];

      for (let i = 1; i < peaks.length - 1; i++) {
        const p = peaks[i];
        const prev = peaks[i - 1];
        const next = peaks[i + 1];

        /* Find pulse onset (local minimum between prev and current peak) */
        let onset = prev;
        let minVal = signal[prev];
        for (let k = prev; k < p; k++) {
          if (signal[k] < minVal) { minVal = signal[k]; onset = k; }
        }

        /* Find next onset (local minimum between p and next) */
        let endIdx = next;
        let minVal2 = signal[p];
        for (let k = p; k < next; k++) {
          if (signal[k] < minVal2) { minVal2 = signal[k]; endIdx = k; }
        }

        const amp = signal[p] - minVal;
        if (amp <= 0) continue;
        amps.push(amp);
        rises.push((p - onset) * (1000 / fs));

        /* Width at 50% amplitude */
        const half = minVal + amp / 2;
        let lo = onset, hi = endIdx;
        for (let k = onset; k <= p; k++) if (signal[k] >= half) { lo = k; break; }
        for (let k = p; k <= endIdx; k++) if (signal[k] <= half) { hi = k; break; }
        widths50.push((hi - lo) * (1000 / fs));
      }

      if (!amps.length) return out;

      const meanArr = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
      const stdArr  = arr => {
        const m = meanArr(arr);
        return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / arr.length);
      };

      out.ppgAmpMean = +meanArr(amps).toFixed(3);
      out.ppgAmpStd  = +stdArr(amps).toFixed(3);
      out.ppgRiseTime = +meanArr(rises).toFixed(1);
      out.ppgWidth50  = +meanArr(widths50).toFixed(1);

      /* Approximate Augmentation Index using second-derivative inflexion */
      const apg = this._secondDerivative(signal);
      const ai = this._augmentationIndex(apg, peaks);
      if (ai !== null) {
        out.augmentationIdx = +ai.toFixed(3);
        out.reflectionIdx = +(0.5 + 0.4 * ai).toFixed(3);   // surrogate
      }

      /* Areas — trapezoidal between onsets */
      let aSys = 0, aDia = 0;
      for (let i = 1; i < peaks.length; i++) {
        const start = peaks[i - 1], end = peaks[i];
        for (let k = start; k < end; k++) {
          if (k <= start + (end - start) / 3) aSys += Math.max(0, signal[k]);
          else aDia += Math.max(0, signal[k]);
        }
      }
      out.ppgAreaSys = +aSys.toFixed(1);
      out.ppgAreaDia = +aDia.toFixed(1);

      return out;
    },

    _secondDerivative(signal) {
      const d = new Array(signal.length).fill(0);
      for (let i = 2; i < signal.length - 2; i++) {
        d[i] = signal[i + 2] - 2 * signal[i] + signal[i - 2];
      }
      return d;
    },

    _augmentationIndex(apg, peaks) {
      /* a-b-c-d-e wave detection on APG; simplified: ratio of second peak to first within RR */
      let totalAI = 0, count = 0;
      for (let i = 1; i < peaks.length; i++) {
        const start = peaks[i - 1];
        const end = peaks[i];
        let firstPk = -1, firstVal = -Infinity;
        let secondPk = -1, secondVal = -Infinity;
        for (let k = start + 2; k < end - 2; k++) {
          if (apg[k] > apg[k - 1] && apg[k] > apg[k + 1]) {
            if (apg[k] > firstVal) {
              if (firstPk !== -1 && apg[k] > secondVal) { secondPk = firstPk; secondVal = firstVal; }
              firstPk = k; firstVal = apg[k];
            } else if (apg[k] > secondVal) {
              secondPk = k; secondVal = apg[k];
            }
          }
        }
        if (firstVal > 0 && secondVal > 0 && firstVal !== 0) {
          totalAI += (firstVal - secondVal) / firstVal;
          count++;
        }
      }
      return count ? totalAI / count : null;
    },

    /* ── Spectral features ────────────────────────────────────────── */

    _spectral(signal, fs) {
      /* Welch with single Hanning window for simplicity */
      const N = Math.pow(2, Math.floor(Math.log2(Math.min(signal.length, 1024))));
      if (N < 64) return { psdLow: null, psdHigh: null, spectralEntropy: null };

      const x = signal.slice(-N);
      const m = x.reduce((a, b) => a + b, 0) / N;
      const re = Float64Array.from(x.map((v, i) => (v - m) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)))));
      const im = new Float64Array(N);
      this._fft(re, im, N);

      const psd = new Float64Array(N / 2);
      let total = 0;
      for (let k = 1; k < N / 2; k++) { psd[k] = (re[k] * re[k] + im[k] * im[k]) / (N * N); total += psd[k]; }

      const freqRes = fs / N;
      let pLow = 0, pHigh = 0;
      for (let k = 1; k < N / 2; k++) {
        const f = k * freqRes;
        if (f >= 0.0 && f < 1.0) pLow += psd[k];
        else if (f >= 1.0 && f <= 5.0) pHigh += psd[k];
      }

      let H = 0;
      if (total > 0) {
        for (let k = 1; k < N / 2; k++) {
          const p = psd[k] / total;
          if (p > 0) H -= p * Math.log2(p);
        }
      }

      return {
        psdLow:   +(pLow / (total || 1)).toFixed(4),
        psdHigh:  +(pHigh / (total || 1)).toFixed(4),
        spectralEntropy: +H.toFixed(3)
      };
    },

    _fft(re, im, N) {
      let j = 0;
      for (let i = 1; i < N; i++) {
        let bit = N >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
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
    }
  };

  if (typeof window !== 'undefined') window.PPGFeatures = PPGFeatures;
  if (typeof module !== 'undefined') module.exports = PPGFeatures;
})();
