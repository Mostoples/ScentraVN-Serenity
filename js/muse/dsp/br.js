/**
 * Muse DSP — Breath Rate Estimator
 *
 * Estimates respiratory rate (brpm) from one of two sources, in priority order:
 *   1. PPG envelope (preferred — bright signal even when subject is still).
 *   2. Accelerometer Z-axis (fallback when PPG envelope is unstable, e.g. during
 *      breathing exercises where the subject's chest barely moves the optical
 *      sensor on the forehead).
 *
 * Algorithm (design.md § 5.4):
 *   - Compute moving-RMS of input signal with 0.5 s window → envelope.
 *   - Apply band-pass 0.1–0.5 Hz to the envelope (covers 6–30 brpm).
 *   - Count zero-crossings (or peaks) within a 30 s rolling window.
 *   - BR = peaks × 2 (two zero-crossings per breath cycle).
 *   - Update every 5 s; emit `low_quality` when out-of-range > 60 s
 *     (to be enforced by the caller / store, see R6.4).
 *
 * Validates: Requirement 6.1, 6.2
 */

import { BandpassFilter } from './filters.js';

const DEFAULT_PPG_FS = 64;
const DEFAULT_IMU_FS = 50;
const ENVELOPE_WIN_S = 0.5;
const ANALYSIS_WIN_S = 30;
const UPDATE_INTERVAL_MS = 5000;
const MIN_BR_BRPM = 4;
const MAX_BR_BRPM = 30;

/**
 * Detect zero-crossings (rising) in a signal — used as a robust proxy for
 * peak count when SNR is low.
 *
 * @param {ArrayLike<number>} signal
 * @returns {number} Number of upward zero-crossings.
 */
export function countRisingZeroCrossings(signal) {
  let prev = signal[0] ?? 0;
  let count = 0;
  for (let i = 1; i < signal.length; i++) {
    const cur = signal[i];
    if (prev <= 0 && cur > 0) count++;
    prev = cur;
  }
  return count;
}

/**
 * Online breath-rate estimator.
 *
 * Holds a rolling buffer of envelope samples for the analysis window
 * (default 30 s) and emits an updated brpm value at most every UPDATE_INTERVAL_MS.
 */
export class BreathRateEstimator {
  /**
   * @param {{
   *   fs?: number,
   *   source?: 'ppg'|'imu',
   *   envelopeWinS?: number,
   *   analysisWinS?: number,
   *   updateIntervalMs?: number
   * }} opts
   */
  constructor({
    fs = DEFAULT_PPG_FS,
    source = 'ppg',
    envelopeWinS = ENVELOPE_WIN_S,
    analysisWinS = ANALYSIS_WIN_S,
    updateIntervalMs = UPDATE_INTERVAL_MS,
  } = {}) {
    this.fs = fs;
    this.source = source;
    this.envelopeWinSamples = Math.max(1, Math.round(envelopeWinS * fs));
    this.analysisWinSamples = Math.max(1, Math.round(analysisWinS * fs));
    this.analysisWinS = analysisWinS;
    this.updateIntervalMs = updateIntervalMs;

    // Moving-RMS envelope buffer.
    this._rmsBuf = new Float64Array(this.envelopeWinSamples);
    this._rmsSumSq = 0;
    this._rmsIdx = 0;
    this._rmsCount = 0;

    // Rolling buffer of band-passed envelope samples.
    this._envBuf = new Float64Array(this.analysisWinSamples);
    this._envIdx = 0;
    this._envCount = 0;

    // Band-pass 0.1–0.5 Hz on the envelope. Note: at fs=64 this is comfortably
    // within Nyquist; fLow must be > 0 for the cookbook formula.
    this._envBp = new BandpassFilter({ fs, fLow: 0.1, fHigh: 0.5, q: 0.7 });

    this._lastEmitMs = -Infinity;
    this._lastValue = { brpm: 0, valid: false, status: 'warming_up' };
  }

  /**
   * Push one input sample.
   *
   * @param {number} x - Input sample (PPG or accel-z).
   * @param {number} tMs - Timestamp in ms.
   * @returns {{ brpm: number, valid: boolean, status: 'ok'|'warming_up'|'out_of_range' }}
   *          The estimator's latest value (cached between updates).
   */
  push(x, tMs) {
    // 1. Moving-RMS envelope.
    const evicted = this._rmsBuf[this._rmsIdx];
    const sq = x * x;
    this._rmsBuf[this._rmsIdx] = sq;
    this._rmsSumSq += sq - evicted;
    this._rmsIdx = (this._rmsIdx + 1) % this.envelopeWinSamples;
    if (this._rmsCount < this.envelopeWinSamples) this._rmsCount++;
    const rms = Math.sqrt(this._rmsSumSq / this.envelopeWinSamples);

    // 2. Band-pass on envelope.
    const env = this._envBp.step(rms);

    // 3. Append to analysis buffer.
    this._envBuf[this._envIdx] = env;
    this._envIdx = (this._envIdx + 1) % this.analysisWinSamples;
    if (this._envCount < this.analysisWinSamples) this._envCount++;

    // 4. Emit at most once every UPDATE_INTERVAL_MS, and only when buffer is full.
    if (
      this._envCount >= this.analysisWinSamples &&
      tMs - this._lastEmitMs >= this.updateIntervalMs
    ) {
      this._lastEmitMs = tMs;
      // Reconstruct chronological order from ring buffer.
      const ordered = new Float64Array(this.analysisWinSamples);
      for (let i = 0; i < this.analysisWinSamples; i++) {
        ordered[i] = this._envBuf[(this._envIdx + i) % this.analysisWinSamples];
      }
      const crossings = countRisingZeroCrossings(ordered);
      const brpm = (crossings * 60) / this.analysisWinS;
      let status;
      let valid;
      if (brpm < MIN_BR_BRPM || brpm > MAX_BR_BRPM) {
        status = 'out_of_range';
        valid = false;
      } else {
        status = 'ok';
        valid = true;
      }
      this._lastValue = { brpm: Math.round(brpm * 10) / 10, valid, status };
    }
    return this._lastValue;
  }

  reset() {
    this._rmsBuf.fill(0);
    this._rmsSumSq = 0;
    this._rmsIdx = 0;
    this._rmsCount = 0;
    this._envBuf.fill(0);
    this._envIdx = 0;
    this._envCount = 0;
    this._envBp.reset();
    this._lastEmitMs = -Infinity;
    this._lastValue = { brpm: 0, valid: false, status: 'warming_up' };
  }
}

const BR = Object.freeze({
  BreathRateEstimator,
  countRisingZeroCrossings,
  MIN_BR_BRPM,
  MAX_BR_BRPM,
});

if (typeof window !== 'undefined') window.MuseBR = BR;
export default BR;
