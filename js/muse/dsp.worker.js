/**
 * Muse DSP Worker — composes filters → FFT → band power per EEG channel,
 * and peak → HR/HRV → breath rate for the PPG channel.
 *
 * Lives in a Web Worker (referenced via `new Worker('/js/muse/dsp.worker.js', { type: 'module' })`)
 * so that DSP never blocks the main UI thread.
 *
 * Wire protocol (main → worker):
 *   { type: 'init',  payload: { fs?: 256, ppgFs?: 64, mainsHz?: 50|60, fftN?: 256 } }
 *   { type: 'eeg',   payload: { ch: 'tp9'|'af7'|'af8'|'tp10', samples: Float32Array, tMs: number } }
 *   { type: 'ppg',   payload: { samples: Float32Array, tMs: number } }
 *   { type: 'imu',   payload: { magG: number, tMs: number } }
 *   { type: 'reset' }
 *
 * Wire protocol (worker → main):
 *   { type: 'metrics', payload: { powers, contact, hr, hrv, br, alphaPeak, tMs } }
 *
 * The worker self-throttles `metrics` emission to ≤10 Hz (R19.3) and only
 * recomputes band power when at least 64 new EEG samples have been received
 * (i.e. every 250 ms at 256 Hz — within the 4–10 Hz window from R4.4).
 *
 * Validates: Requirements 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 6.1, 19.2, 19.3
 *
 * Usage in tests: import this file and call `handleMessage({ data })` directly
 * (we expose a `handleMessage` function on `globalThis` so tests can drive it
 * without a real Worker).
 */

import { EegPreFilter, detectMainsHz } from './dsp/filters.js';
import { computeBandPowers, computeAveragedBandPowers } from './dsp/bandpower.js';
import { PeakDetector, rrToHr, rrToRmssd } from './dsp/peak.js';
import { BreathRateEstimator } from './dsp/br.js';

const DEFAULT_EEG_FS = 256;
const DEFAULT_PPG_FS = 64;
const DEFAULT_FFT_N = 256;
const POOR_CONTACT_UV = 1500;
const POOR_CONTACT_DURATION_MS = 1000;
const RECOMPUTE_EVERY_SAMPLES = 64;
const MAX_EMIT_HZ = 10;

/* ─── Worker state ───────────────────────────────────────────────── */

const state = {
  initialized: false,
  fs: DEFAULT_EEG_FS,
  ppgFs: DEFAULT_PPG_FS,
  fftN: DEFAULT_FFT_N,
  mainsHz: 50,
  channels: ['tp9', 'af7', 'af8', 'tp10'],
  prefilters: /** @type {Object<string, EegPreFilter>} */ ({}),
  buffers: /** @type {Object<string, Float32Array>} */ ({}),
  bufferIdx: /** @type {Object<string, number>} */ ({}),
  bufferCount: /** @type {Object<string, number>} */ ({}),
  samplesSinceFft: /** @type {Object<string, number>} */ ({}),
  contactBad: /** @type {Object<string, { since:number|null }>} */ ({}),
  contactState: /** @type {Object<string, 'good'|'poor'|'initializing'>} */ ({}),
  rrIntervals: /** @type {number[]} */ ([]),
  ppgPeak: /** @type {PeakDetector|null} */ (null),
  brEst: /** @type {BreathRateEstimator|null} */ (null),
  lastEmitMs: -Infinity,
  lastBands: /** @type {Object<string, any>} */ ({}),
  lastAlphaPeak: 0,
  lastHr: { hr: 0, valid: false },
  lastRmssd: { rmssd: 0, valid: false, status: 'warming_up' },
  lastBr: { brpm: 0, valid: false, status: 'warming_up' },
};

function init(payload = {}) {
  state.fs = payload.fs ?? DEFAULT_EEG_FS;
  state.ppgFs = payload.ppgFs ?? DEFAULT_PPG_FS;
  state.fftN = payload.fftN ?? DEFAULT_FFT_N;
  state.mainsHz = payload.mainsHz ?? detectMainsHz();
  // Allocate per-channel state.
  state.prefilters = {};
  state.buffers = {};
  state.bufferIdx = {};
  state.bufferCount = {};
  state.samplesSinceFft = {};
  state.contactBad = {};
  state.contactState = {};
  state.lastBands = {};
  for (const ch of state.channels) {
    state.prefilters[ch] = new EegPreFilter({ fs: state.fs, mainsHz: state.mainsHz });
    state.buffers[ch] = new Float32Array(state.fftN);
    state.bufferIdx[ch] = 0;
    state.bufferCount[ch] = 0;
    state.samplesSinceFft[ch] = 0;
    state.contactBad[ch] = { since: null };
    state.contactState[ch] = 'initializing';
    state.lastBands[ch] = null;
  }
  state.ppgPeak = new PeakDetector({ fs: state.ppgFs });
  state.brEst = new BreathRateEstimator({ fs: state.ppgFs, source: 'ppg' });
  state.rrIntervals = [];
  state.lastEmitMs = -Infinity;
  state.lastAlphaPeak = 0;
  state.lastHr = { hr: 0, valid: false };
  state.lastRmssd = { rmssd: 0, valid: false, status: 'warming_up' };
  state.lastBr = { brpm: 0, valid: false, status: 'warming_up' };
  state.initialized = true;
}

function reset() {
  if (!state.initialized) return;
  for (const ch of state.channels) {
    state.prefilters[ch].reset();
    state.buffers[ch].fill(0);
    state.bufferIdx[ch] = 0;
    state.bufferCount[ch] = 0;
    state.samplesSinceFft[ch] = 0;
    state.contactBad[ch] = { since: null };
    state.contactState[ch] = 'initializing';
    state.lastBands[ch] = null;
  }
  state.ppgPeak.reset();
  state.brEst.reset();
  state.rrIntervals.length = 0;
  state.lastEmitMs = -Infinity;
}

/**
 * Process an EEG packet (a small batch of consecutive samples for one channel).
 * Updates the rolling buffer, contact monitor, and triggers band-power
 * recomputation when due.
 */
function onEeg({ ch, samples, tMs }) {
  if (!state.initialized) return;
  if (!state.channels.includes(ch)) return;
  const pre = state.prefilters[ch];
  const buf = state.buffers[ch];
  const N = state.fftN;
  for (let i = 0; i < samples.length; i++) {
    const filtered = pre.step(samples[i]);
    buf[state.bufferIdx[ch]] = filtered;
    state.bufferIdx[ch] = (state.bufferIdx[ch] + 1) % N;
    if (state.bufferCount[ch] < N) state.bufferCount[ch]++;
    state.samplesSinceFft[ch]++;
    // Contact: |sample| > POOR_CONTACT_UV → mark suspect; sustained > 1 s → poor.
    if (Math.abs(filtered) > POOR_CONTACT_UV) {
      const c = state.contactBad[ch];
      if (c.since === null) c.since = tMs;
      else if (tMs - c.since > POOR_CONTACT_DURATION_MS) state.contactState[ch] = 'poor';
    } else {
      state.contactBad[ch].since = null;
      if (state.contactState[ch] !== 'good' && state.bufferCount[ch] >= state.fs) {
        state.contactState[ch] = 'good';
      }
    }
  }

  // Recompute band power if buffer full and enough new samples since last FFT.
  if (state.bufferCount[ch] >= N && state.samplesSinceFft[ch] >= RECOMPUTE_EVERY_SAMPLES) {
    state.samplesSinceFft[ch] = 0;
    const ordered = orderedFromRing(buf, state.bufferIdx[ch], N);
    const bp = computeBandPowers(ordered, state.fs, N);
    state.lastBands[ch] = bp;
    if (ch === 'af7' || ch === 'af8') {
      // Use frontal lead alpha peak.
      state.lastAlphaPeak = bp.alphaPeak;
    }
    maybeEmit(tMs);
  }
}

function onPpg({ samples, tMs }) {
  if (!state.initialized) return;
  // Distribute samples uniformly across the timestamp window. We approximate
  // the per-sample timestamp as evenly spaced ending at tMs.
  const dt = 1000 / state.ppgFs;
  let curTs = tMs - dt * (samples.length - 1);
  for (let i = 0; i < samples.length; i++) {
    const beat = state.ppgPeak.push(samples[i], curTs);
    if (beat) {
      state.rrIntervals.push(beat.rrMs);
      // Cap history at 60 RR intervals (~ last 60 beats).
      if (state.rrIntervals.length > 60) state.rrIntervals.shift();
      state.lastHr = rrToHr(state.rrIntervals);
      state.lastRmssd = rrToRmssd(state.rrIntervals);
    }
    state.lastBr = state.brEst.push(samples[i], curTs);
    curTs += dt;
  }
  maybeEmit(tMs);
}

function onImu({ magG, tMs }) {
  if (!state.initialized) return;
  // Reserved for future BR-from-IMU fallback. Currently we do not fan-out
  // IMU into the BR estimator because the PPG envelope is the primary source.
  // The store on the main thread keeps stillness; we just attach magG to the
  // next emit for convenience.
  state._lastImuMagG = magG;
  state._lastImuTs = tMs;
  maybeEmit(tMs);
}

/**
 * Read out a ring buffer in chronological order: `[idx..N-1] ++ [0..idx-1]`.
 * @param {Float32Array} buf
 * @param {number} headIdx - Position of the next-write slot (oldest sample).
 * @param {number} N
 */
function orderedFromRing(buf, headIdx, N) {
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    out[i] = buf[(headIdx + i) % N];
  }
  return out;
}

function maybeEmit(tMs) {
  if (tMs - state.lastEmitMs < 1000 / MAX_EMIT_HZ) return;
  state.lastEmitMs = tMs;

  // Per-channel + frontal-average powers.
  const perChannel = {};
  for (const ch of state.channels) {
    perChannel[ch] = state.lastBands[ch];
  }
  let frontal = null;
  if (state.lastBands.af7 && state.lastBands.af8) {
    frontal = {
      delta: (state.lastBands.af7.delta + state.lastBands.af8.delta) / 2,
      theta: (state.lastBands.af7.theta + state.lastBands.af8.theta) / 2,
      alpha: (state.lastBands.af7.alpha + state.lastBands.af8.alpha) / 2,
      smr:   (state.lastBands.af7.smr   + state.lastBands.af8.smr)   / 2,
      beta:  (state.lastBands.af7.beta  + state.lastBands.af8.beta)  / 2,
      gamma: (state.lastBands.af7.gamma + state.lastBands.af8.gamma) / 2,
      alphaPeak: (state.lastBands.af7.alphaPeak + state.lastBands.af8.alphaPeak) / 2,
    };
  }

  const payload = {
    tMs,
    powers: { perChannel, frontal },
    contact: { ...state.contactState },
    hr: state.lastHr,
    hrv: state.lastRmssd,
    br: state.lastBr,
    alphaPeak: state.lastAlphaPeak,
    imuMagG: state._lastImuMagG ?? null,
  };
  post({ type: 'metrics', payload });
}

/* ─── Message dispatch ───────────────────────────────────────────── */

/**
 * Dispatch a message coming in over `postMessage` (or a synthetic call from a test).
 * @param {{ data: { type: string, payload?: any } }} ev
 */
export function handleMessage(ev) {
  const { type, payload } = ev?.data ?? {};
  switch (type) {
    case 'init':   init(payload);  break;
    case 'eeg':    onEeg(payload); break;
    case 'ppg':    onPpg(payload); break;
    case 'imu':    onImu(payload); break;
    case 'reset':  reset();        break;
    default:
      // Ignore unknown messages silently — the main thread's contract may evolve.
      break;
  }
}

/**
 * Internal post helper that forwards to `self.postMessage` when running inside
 * a real Web Worker, or to an injectable spy for tests.
 *
 * Tests can swap `setPostMessage(fn)` to capture emissions.
 * @type {(msg: any) => void}
 */
let _post = (msg) => {
  // In a Worker scope, `self` is the WorkerGlobalScope.
  if (typeof self !== 'undefined' && typeof self.postMessage === 'function') {
    self.postMessage(msg);
  }
};
function post(msg) { _post(msg); }

/**
 * Test seam — replace the post function with a custom callback.
 * @param {(msg:any) => void} fn
 */
export function setPostMessage(fn) {
  _post = fn;
}

/**
 * Test seam — return a snapshot of internal state.
 */
export function _getStateForTesting() {
  return state;
}

// Wire the message listener when running inside a real Worker.
if (typeof self !== 'undefined' && typeof self.addEventListener === 'function' && typeof window === 'undefined') {
  self.addEventListener('message', handleMessage);
}
