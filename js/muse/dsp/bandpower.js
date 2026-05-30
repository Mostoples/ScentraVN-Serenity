/**
 * Muse DSP — Band Power Integration
 *
 * Computes the energy of each EEG band (Δ, θ, α, SMR, β, γ) by integrating
 * PSD bins that fall within the band's frequency range. Also returns the
 * dominant frequency of the alpha band (peak detection) which is used as a
 * weak indicator of relaxation depth.
 *
 * design.md § 5.3 mapping (with fs=256, N=256 → 1 Hz/bin):
 *   delta : 0.5 – 4 Hz
 *   theta : 4   – 8 Hz
 *   alpha : 8   – 13 Hz
 *   smr   : 13  – 15 Hz
 *   beta  : 13  – 30 Hz
 *   gamma : 30  – 45 Hz
 *
 * Validates: Requirement 4.3 (band power computation)
 */

import { fftPsd } from './fft.js';

/** Canonical band ranges in Hz. */
export const BANDS = Object.freeze({
  delta: [0.5, 4],
  theta: [4, 8],
  alpha: [8, 13],
  smr:   [13, 15],
  beta:  [13, 30],
  gamma: [30, 45],
});

/**
 * Integrate PSD bins that fall in [fLo, fHi] (inclusive).
 *
 * @param {ArrayLike<number>} psd - Length N/2 PSD array.
 * @param {number} freqRes - Frequency resolution (Hz/bin).
 * @param {number} fLo - Lower bound (Hz).
 * @param {number} fHi - Upper bound (Hz).
 * @returns {number}
 */
export function integrateBand(psd, freqRes, fLo, fHi) {
  const kLo = Math.max(1, Math.round(fLo / freqRes)); // skip DC
  const kHi = Math.min(psd.length - 1, Math.round(fHi / freqRes));
  let sum = 0;
  for (let k = kLo; k <= kHi; k++) sum += psd[k];
  return sum;
}

/**
 * Compute band powers from raw windowed samples.
 *
 * @param {ArrayLike<number>} samples - Input samples (any length ≥ N).
 * @param {number} fs - Sample rate (Hz).
 * @param {number} N - FFT size (power of two).
 * @returns {{
 *   delta:number, theta:number, alpha:number,
 *   smr:number, beta:number, gamma:number,
 *   alphaPeak:number,
 * }}
 */
export function computeBandPowers(samples, fs, N) {
  const psd = fftPsd(samples, N);
  const freqRes = fs / N;
  const out = {};
  for (const [name, [lo, hi]] of Object.entries(BANDS)) {
    out[name] = integrateBand(psd, freqRes, lo, hi);
  }
  // Alpha peak frequency: argmax of PSD within the alpha band.
  const [aLo, aHi] = BANDS.alpha;
  const kLo = Math.max(1, Math.round(aLo / freqRes));
  const kHi = Math.min(psd.length - 1, Math.round(aHi / freqRes));
  let peakK = kLo;
  let peakVal = psd[kLo] || 0;
  for (let k = kLo + 1; k <= kHi; k++) {
    if (psd[k] > peakVal) {
      peakVal = psd[k];
      peakK = k;
    }
  }
  out.alphaPeak = peakK * freqRes;
  return out;
}

/**
 * Compute band powers averaged over multiple channels (e.g. AF7+AF8 frontal
 * lead average used by mind/stress scoring).
 *
 * @param {ArrayLike<number>[]} channels
 * @param {number} fs
 * @param {number} N
 * @returns {object} Same shape as `computeBandPowers`.
 */
export function computeAveragedBandPowers(channels, fs, N) {
  const perCh = channels.map((ch) => computeBandPowers(ch, fs, N));
  const out = { delta: 0, theta: 0, alpha: 0, smr: 0, beta: 0, gamma: 0, alphaPeak: 0 };
  for (const p of perCh) {
    out.delta += p.delta;
    out.theta += p.theta;
    out.alpha += p.alpha;
    out.smr += p.smr;
    out.beta += p.beta;
    out.gamma += p.gamma;
    out.alphaPeak += p.alphaPeak;
  }
  const n = perCh.length || 1;
  out.delta /= n;
  out.theta /= n;
  out.alpha /= n;
  out.smr /= n;
  out.beta /= n;
  out.gamma /= n;
  out.alphaPeak /= n;
  return out;
}

const BandPower = Object.freeze({
  BANDS,
  integrateBand,
  computeBandPowers,
  computeAveragedBandPowers,
});

if (typeof window !== 'undefined') window.MuseBandPower = BandPower;
export default BandPower;
