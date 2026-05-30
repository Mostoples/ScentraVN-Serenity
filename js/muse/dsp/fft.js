/**
 * Muse DSP — FFT (Cooley-Tukey radix-2) and Hanning window.
 *
 * Pure module. Uses Float64Array for both real and imaginary buffers so that
 * intermediate accumulations stay numerically stable for N up to ~8192.
 *
 * design.md § 5.2: N=256 (1 s @ 256 Hz), Hanning window pre-applied.
 *
 * Exports:
 *   - fft(re, im) — in-place radix-2; N must be a power of two.
 *   - fftMag(samples, N) — convenience wrapper that windows + FFTs and returns
 *     magnitude spectrum (length N/2).
 *   - hanning(N) — pre-computed Hanning window (cached per N).
 *
 * Validates: Requirement 4.3
 */

const _hanningCache = new Map();

/**
 * Hanning window of length N: w[n] = 0.5 - 0.5 * cos(2π n / (N-1)).
 *
 * Cached per N to avoid recomputation in the hot DSP path.
 *
 * @param {number} N - Window length (≥ 2).
 * @returns {Float64Array}
 */
export function hanning(N) {
  if (!(Number.isInteger(N) && N >= 2)) {
    throw new RangeError('hanning: N must be an integer >= 2');
  }
  const cached = _hanningCache.get(N);
  if (cached) return cached;
  const w = new Float64Array(N);
  const denom = N - 1;
  for (let n = 0; n < N; n++) {
    w[n] = 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / denom);
  }
  _hanningCache.set(N, w);
  return w;
}

/**
 * In-place radix-2 Cooley-Tukey FFT. `re` and `im` must have the same length
 * which must be a power of two. After the call they hold the complex spectrum
 * in standard order (DC at index 0, Nyquist at index N/2).
 *
 * @param {Float64Array|Float32Array} re
 * @param {Float64Array|Float32Array} im
 */
export function fft(re, im) {
  const N = re.length;
  if (im.length !== N) throw new RangeError('fft: re and im must have the same length');
  if (!isPowerOfTwo(N)) throw new RangeError(`fft: N must be a power of two, got ${N}`);

  // Bit-reversal permutation.
  let j = 0;
  for (let i = 1; i < N; i++) {
    let bit = N >> 1;
    for (; (j & bit) !== 0; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }

  // Butterfly passes.
  for (let len = 2; len <= N; len <<= 1) {
    const ang = -2 * Math.PI / len;
    const wRe = Math.cos(ang);
    const wIm = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let curRe = 1;
      let curIm = 0;
      const half = len >> 1;
      for (let k = 0; k < half; k++) {
        const a = i + k;
        const b = i + k + half;
        const xRe = re[b] * curRe - im[b] * curIm;
        const xIm = re[b] * curIm + im[b] * curRe;
        const yRe = re[a];
        const yIm = im[a];
        re[a] = yRe + xRe;
        im[a] = yIm + xIm;
        re[b] = yRe - xRe;
        im[b] = yIm - xIm;
        const tRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = tRe;
      }
    }
  }
}

/**
 * Compute the one-sided magnitude spectrum of a real signal.
 *
 * Steps:
 *   1. Take the trailing N samples (or the full signal if shorter).
 *   2. Apply Hanning window.
 *   3. Run radix-2 FFT.
 *   4. Return magnitude `sqrt(re² + im²)` for bins 0..N/2 (length N/2 + 1 — but
 *      we drop the Nyquist bin to keep length N/2 for downstream consumers
 *      that index up to N/2 exclusively).
 *
 * @param {ArrayLike<number>} samples
 * @param {number} N - FFT size (power of two ≤ samples.length).
 * @returns {Float64Array} Magnitude spectrum, length N/2 (DC..Nyquist exclusive).
 */
export function fftMag(samples, N) {
  if (!isPowerOfTwo(N)) throw new RangeError('fftMag: N must be a power of two');
  if (samples.length < N) {
    throw new RangeError(`fftMag: samples.length (${samples.length}) < N (${N})`);
  }
  const w = hanning(N);
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  const start = samples.length - N;
  for (let i = 0; i < N; i++) {
    re[i] = samples[start + i] * w[i];
    // im[i] starts at 0
  }
  fft(re, im);
  const out = new Float64Array(N / 2);
  for (let k = 0; k < N / 2; k++) {
    out[k] = Math.hypot(re[k], im[k]);
  }
  return out;
}

/**
 * Compute the one-sided power spectral density (PSD) of a real signal.
 * Returns `|X[k]|² / N²` (matches the convention used in design.md § 5.3).
 *
 * @param {ArrayLike<number>} samples
 * @param {number} N
 * @returns {Float64Array} PSD, length N/2.
 */
export function fftPsd(samples, N) {
  const mag = fftMag(samples, N);
  const out = new Float64Array(mag.length);
  const denom = N * N;
  for (let k = 0; k < mag.length; k++) {
    out[k] = (mag[k] * mag[k]) / denom;
  }
  return out;
}

function isPowerOfTwo(n) {
  return Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;
}

/* ─── Default export ──────────────────────────────────────────────── */

const FFT = Object.freeze({ fft, fftMag, fftPsd, hanning });
if (typeof window !== 'undefined') window.MuseFFT = FFT;
export default FFT;
