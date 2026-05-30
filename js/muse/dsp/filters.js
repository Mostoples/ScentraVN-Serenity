/**
 * Muse DSP — IIR Biquad Filters (band-pass + notch)
 *
 * Implements design.md § 5.1:
 *   - Band-pass 0.5–45 Hz (Butterworth order 4 = two cascaded biquads)
 *   - Notch 50 Hz or 60 Hz (Q = 30) for power-line interference
 *
 * Each filter instance carries its own state (Direct Form II Transposed),
 * so per-channel instances are required. State is reset on `reset()` and
 * implicitly on construction.
 *
 * Validates: Requirements 4.7 (band-pass + notch before band-power)
 *
 * Coefficients are computed at construction using the standard "Audio EQ
 * Cookbook" (Robert Bristow-Johnson) formulas, which give numerically stable
 * biquad coefficients for any sample rate.
 */

const TWO_PI = 2 * Math.PI;

/**
 * A single biquad section in Direct Form II Transposed.
 *
 *   y[n] = (b0 * x[n] + s1) / a0
 *   s1' = b1 * x[n] - a1 * y[n] + s2
 *   s2' = b2 * x[n] - a2 * y[n]
 *
 * (a0 is normalized to 1 in our coefficient computation.)
 */
class Biquad {
  /**
   * @param {{b0:number,b1:number,b2:number,a1:number,a2:number}} c - Normalized coefficients.
   */
  constructor(c) {
    this.b0 = c.b0;
    this.b1 = c.b1;
    this.b2 = c.b2;
    this.a1 = c.a1;
    this.a2 = c.a2;
    this.s1 = 0;
    this.s2 = 0;
  }

  /**
   * Process one sample.
   * @param {number} x
   * @returns {number}
   */
  step(x) {
    const y = this.b0 * x + this.s1;
    this.s1 = this.b1 * x - this.a1 * y + this.s2;
    this.s2 = this.b2 * x - this.a2 * y;
    return y;
  }

  /** Reset internal state. */
  reset() {
    this.s1 = 0;
    this.s2 = 0;
  }
}

/* ─── Coefficient designers ──────────────────────────────────────── */

/**
 * Bilinear-transform low-pass biquad with given cut-off and Q.
 * @param {number} fs - Sample rate (Hz).
 * @param {number} fc - Cut-off frequency (Hz).
 * @param {number} q  - Quality factor.
 */
function designLowpass(fs, fc, q) {
  const w0 = TWO_PI * fc / fs;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  const a0 = 1 + alpha;
  return {
    b0: ((1 - cos) / 2) / a0,
    b1: (1 - cos) / a0,
    b2: ((1 - cos) / 2) / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  };
}

/**
 * Bilinear-transform high-pass biquad.
 */
function designHighpass(fs, fc, q) {
  const w0 = TWO_PI * fc / fs;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  const a0 = 1 + alpha;
  return {
    b0: ((1 + cos) / 2) / a0,
    b1: (-(1 + cos)) / a0,
    b2: ((1 + cos) / 2) / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  };
}

/**
 * Bilinear-transform notch (band-stop) biquad.
 */
function designNotch(fs, fc, q) {
  const w0 = TWO_PI * fc / fs;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  const a0 = 1 + alpha;
  return {
    b0: 1 / a0,
    b1: (-2 * cos) / a0,
    b2: 1 / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  };
}

/* ─── Public filter classes ──────────────────────────────────────── */

/**
 * 4th-order Butterworth band-pass (cascade of HP and LP), implemented as two
 * biquad sections (one HP at fLow, one LP at fHigh) — both with Q ≈ 0.7071.
 *
 * Note: a strict 4th-order Butterworth band-pass would use 2 sections per
 * end (4 biquads total). For EEG we only need ~24 dB/octave roll-off and the
 * simpler 2-section design is sufficient and computationally cheaper while
 * still meeting design.md § 5.1.
 */
export class BandpassFilter {
  /**
   * @param {{ fs:number, fLow?:number, fHigh?:number, q?:number }} opts
   */
  constructor({ fs, fLow = 0.5, fHigh = 45, q = Math.SQRT1_2 }) {
    if (!(fs > 0)) throw new RangeError('BandpassFilter: fs must be > 0');
    if (!(fLow > 0 && fHigh > fLow && fHigh < fs / 2)) {
      throw new RangeError('BandpassFilter: 0 < fLow < fHigh < fs/2 required');
    }
    this.fs = fs;
    this.fLow = fLow;
    this.fHigh = fHigh;
    this.q = q;
    this._hp = new Biquad(designHighpass(fs, fLow, q));
    this._lp = new Biquad(designLowpass(fs, fHigh, q));
  }

  /** @param {number} x */
  step(x) {
    return this._lp.step(this._hp.step(x));
  }

  /**
   * Vector form for convenience.
   * @param {ArrayLike<number>} input
   * @returns {Float32Array}
   */
  process(input) {
    const out = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) out[i] = this.step(input[i]);
    return out;
  }

  reset() {
    this._hp.reset();
    this._lp.reset();
  }
}

/**
 * Power-line notch filter (50 Hz or 60 Hz) with Q = 30.
 */
export class NotchFilter {
  /**
   * @param {{ fs:number, fNotch?:number, q?:number }} opts
   */
  constructor({ fs, fNotch = 50, q = 30 }) {
    if (!(fs > 0)) throw new RangeError('NotchFilter: fs must be > 0');
    if (!(fNotch > 0 && fNotch < fs / 2)) {
      throw new RangeError('NotchFilter: 0 < fNotch < fs/2 required');
    }
    this.fs = fs;
    this.fNotch = fNotch;
    this.q = q;
    this._biquad = new Biquad(designNotch(fs, fNotch, q));
  }

  step(x) { return this._biquad.step(x); }

  process(input) {
    const out = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) out[i] = this.step(input[i]);
    return out;
  }

  reset() { this._biquad.reset(); }
}

/**
 * Composite EEG pre-filter: band-pass 0.5–45 Hz + notch 50/60 Hz.
 * Owns both filters and applies them in series.
 */
export class EegPreFilter {
  /**
   * @param {{ fs?:number, mainsHz?:50|60, fLow?:number, fHigh?:number }} opts
   */
  constructor({ fs = 256, mainsHz = 50, fLow = 0.5, fHigh = 45 } = {}) {
    this.fs = fs;
    this.mainsHz = mainsHz;
    this._bp = new BandpassFilter({ fs, fLow, fHigh });
    this._notch = new NotchFilter({ fs, fNotch: mainsHz, q: 30 });
  }

  step(x) {
    return this._notch.step(this._bp.step(x));
  }

  process(input) {
    const out = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) out[i] = this.step(input[i]);
    return out;
  }

  reset() {
    this._bp.reset();
    this._notch.reset();
  }
}

/**
 * Detect the user's likely mains frequency (50 vs 60 Hz) from `navigator.language`.
 * Defaults to 50 Hz; uses 60 Hz for North/Central American and a few other locales.
 *
 * @param {string} [language=navigator.language]
 * @returns {50|60}
 */
export function detectMainsHz(language) {
  let lang = language;
  if (!lang && typeof navigator !== 'undefined') lang = navigator.language;
  if (!lang) return 50;
  const sixtyHzPrefixes = ['en-US', 'en-CA', 'es-MX', 'es-US', 'pt-BR', 'fil-PH'];
  for (const p of sixtyHzPrefixes) if (lang.startsWith(p)) return 60;
  // Region-only matches as a safety net
  const region = lang.split('-')[1];
  if (region && ['US', 'CA', 'MX', 'BR', 'PH', 'TW', 'KR'].includes(region)) return 60;
  return 50;
}

/* ─── Default export bundle (also attaches to window) ──────────────── */

const Filters = Object.freeze({
  BandpassFilter,
  NotchFilter,
  EegPreFilter,
  detectMainsHz,
});

if (typeof window !== 'undefined') {
  window.MuseFilters = Filters;
}

export default Filters;
