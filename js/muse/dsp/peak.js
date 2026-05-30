/**
 * Muse DSP — PPG Peak Detector (simplified Pan-Tompkins)
 *
 * Detects systolic peaks in a PPG signal and emits beat-to-beat (RR) intervals.
 * Implements design.md § 5.5:
 *
 *   1. Band-pass 5–15 Hz (caller-supplied; we reuse `BandpassFilter`).
 *   2. Derivative (1st difference).
 *   3. Square.
 *   4. Moving-window integration (~150 ms).
 *   5. Adaptive threshold = 0.3 × max-of-last-8-peaks; refractory 300 ms.
 *
 * Usage:
 *   const det = new PeakDetector({ fs: 64 });
 *   for (const sample of stream) {
 *     const beat = det.push(sample, timestampMs);
 *     if (beat) console.log('RR =', beat.rrMs);
 *   }
 *
 * Validates: Requirements 5.1, 5.2, 5.3
 */

import { BandpassFilter } from './filters.js';

/** PPG sample rate of Muse S Gen 2 (typical). */
const DEFAULT_FS = 64;

/** Refractory period — minimum spacing between beats (R5.1). */
const DEFAULT_REFRACTORY_MS = 300;

/** Length of the recent-peak buffer used for adaptive threshold. */
const RECENT_PEAK_HISTORY = 8;

export class PeakDetector {
  /**
   * @param {{ fs?: number, refractoryMs?: number, mwiMs?: number }} opts
   */
  constructor({ fs = DEFAULT_FS, refractoryMs = DEFAULT_REFRACTORY_MS, mwiMs = 150 } = {}) {
    this.fs = fs;
    this.refractoryMs = refractoryMs;
    this.mwiMs = mwiMs;
    this._bp = new BandpassFilter({ fs, fLow: 5, fHigh: Math.min(15, fs / 2 - 1) });
    this._mwiSize = Math.max(1, Math.round((mwiMs / 1000) * fs));
    this._mwiBuf = new Float64Array(this._mwiSize);
    this._mwiSum = 0;
    this._mwiIdx = 0;
    this._prevFiltered = 0;
    this._lastBeatMs = -Infinity;
    this._recentPeaks = [];
    this._lookingForPeak = false;
    this._peakCandidate = 0;
    this._peakCandidateTs = 0;
  }

  /**
   * Push one PPG sample.
   * @param {number} x - Sample value (raw or filtered, in any unit).
   * @param {number} tMs - Timestamp in milliseconds.
   * @returns {{ tMs:number, rrMs:number, peakValue:number }|null}
   *          A beat object when a peak is confirmed, otherwise `null`.
   */
  push(x, tMs) {
    // 1. Band-pass.
    const filtered = this._bp.step(x);
    // 2. Derivative.
    const deriv = filtered - this._prevFiltered;
    this._prevFiltered = filtered;
    // 3. Square.
    const sq = deriv * deriv;
    // 4. MWI: rolling-sum window of length _mwiSize.
    const evicted = this._mwiBuf[this._mwiIdx];
    this._mwiBuf[this._mwiIdx] = sq;
    this._mwiIdx = (this._mwiIdx + 1) % this._mwiSize;
    this._mwiSum += sq - evicted;
    const integrated = this._mwiSum / this._mwiSize;

    // 5. Adaptive threshold = 0.3 × max of last 8 peaks (with a small floor
    //    so silence doesn't trip false positives).
    const recentMax = this._recentPeaks.length
      ? Math.max(...this._recentPeaks)
      : 0;
    const threshold = Math.max(recentMax * 0.3, 1e-6);

    // Refractory period guard.
    if (tMs - this._lastBeatMs < this.refractoryMs) {
      return null;
    }

    // Peak-finding state machine: while integrated > threshold, track the
    // local maximum; when it drops back below threshold, commit the peak.
    if (integrated > threshold) {
      if (!this._lookingForPeak || integrated > this._peakCandidate) {
        this._peakCandidate = integrated;
        this._peakCandidateTs = tMs;
      }
      this._lookingForPeak = true;
      return null;
    }

    if (this._lookingForPeak) {
      // Falling edge — commit the candidate as a beat.
      const beatTs = this._peakCandidateTs;
      const peakVal = this._peakCandidate;
      this._lookingForPeak = false;
      this._peakCandidate = 0;

      if (this._lastBeatMs === -Infinity) {
        // First beat — no RR yet, but record it for adaptive threshold.
        this._recentPeaks.push(peakVal);
        if (this._recentPeaks.length > RECENT_PEAK_HISTORY) this._recentPeaks.shift();
        this._lastBeatMs = beatTs;
        return null;
      }

      const rrMs = beatTs - this._lastBeatMs;
      this._lastBeatMs = beatTs;

      this._recentPeaks.push(peakVal);
      if (this._recentPeaks.length > RECENT_PEAK_HISTORY) this._recentPeaks.shift();

      return { tMs: beatTs, rrMs, peakValue: peakVal };
    }

    return null;
  }

  /** Reset state (e.g. after BLE reconnect). */
  reset() {
    this._bp.reset();
    this._mwiBuf.fill(0);
    this._mwiSum = 0;
    this._mwiIdx = 0;
    this._prevFiltered = 0;
    this._lastBeatMs = -Infinity;
    this._recentPeaks.length = 0;
    this._lookingForPeak = false;
    this._peakCandidate = 0;
    this._peakCandidateTs = 0;
  }
}

/**
 * Compute heart rate (bpm) from a list of recent RR intervals.
 *
 * Spec: HR = 60000 / mean(RR_last8), integer (R5.2).
 *
 * @param {ArrayLike<number>} rrMs - Recent RR intervals in ms (most recent last).
 * @param {number} [windowSize=8]
 * @returns {{ hr:number, valid:boolean }} valid=false when fewer than 2 RRs.
 */
export function rrToHr(rrMs, windowSize = 8) {
  if (!rrMs || rrMs.length < 2) return { hr: 0, valid: false };
  const start = Math.max(0, rrMs.length - windowSize);
  let sum = 0;
  let count = 0;
  for (let i = start; i < rrMs.length; i++) {
    sum += rrMs[i];
    count++;
  }
  const mean = sum / count;
  if (mean <= 0) return { hr: 0, valid: false };
  const hr = Math.round(60000 / mean);
  // Physiological clamp 30–220 bpm (R5.6).
  if (hr < 30 || hr > 220) return { hr, valid: false };
  return { hr, valid: true };
}

/**
 * Compute RMSSD HRV from at least 30 RR intervals (R5.3).
 *
 * RMSSD = sqrt( mean( (RR_{i+1} - RR_i)² ) ), 1 decimal.
 *
 * @param {ArrayLike<number>} rrMs - RR intervals in ms.
 * @param {number} [minSamples=30]
 * @returns {{ rmssd:number, valid:boolean, status:'ok'|'warming_up' }}
 */
export function rrToRmssd(rrMs, minSamples = 30) {
  if (!rrMs || rrMs.length < minSamples) {
    return { rmssd: 0, valid: false, status: 'warming_up' };
  }
  let sumSq = 0;
  let n = 0;
  for (let i = 1; i < rrMs.length; i++) {
    const d = rrMs[i] - rrMs[i - 1];
    sumSq += d * d;
    n++;
  }
  if (n === 0) return { rmssd: 0, valid: false, status: 'warming_up' };
  const rmssd = Math.sqrt(sumSq / n);
  return { rmssd: Math.round(rmssd * 10) / 10, valid: true, status: 'ok' };
}

const Peak = Object.freeze({ PeakDetector, rrToHr, rrToRmssd });
if (typeof window !== 'undefined') window.MusePeak = Peak;
export default Peak;
