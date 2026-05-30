/**
 * Tests for js/muse/dsp/filters.js (Task 3.7 — filters).
 *
 * Validates: Requirement 4.7 (band-pass + notch before band-power)
 */

import { describe, it, expect } from 'vitest';
import {
  BandpassFilter,
  NotchFilter,
  EegPreFilter,
  detectMainsHz,
} from '../../../js/muse/dsp/filters.js';

const FS = 256;
const DURATION = 4; // seconds → enough for IIR steady state

function genSine(freq, fs, durationSec, amp = 1) {
  const N = Math.round(fs * durationSec);
  const out = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    out[n] = amp * Math.sin((2 * Math.PI * freq * n) / fs);
  }
  return out;
}

function rms(arr, fromIdx = 0) {
  let s = 0;
  let c = 0;
  for (let i = fromIdx; i < arr.length; i++) {
    s += arr[i] * arr[i];
    c++;
  }
  return c > 0 ? Math.sqrt(s / c) : 0;
}

describe('NotchFilter — 50 Hz mains rejection', () => {
  it('attenuates a 50 Hz sine ≥ 40 dB at fs=256, Q=30', () => {
    const sig = genSine(50, FS, DURATION, 1);
    const filt = new NotchFilter({ fs: FS, fNotch: 50, q: 30 });
    const out = filt.process(sig);
    // Skip first 2 seconds for filter settling.
    const settle = FS * 2;
    const inRms = rms(sig, settle);
    const outRms = rms(out, settle);
    const attenDb = 20 * Math.log10(inRms / Math.max(outRms, 1e-12));
    expect(attenDb).toBeGreaterThanOrEqual(40);
  });

  it('attenuates a 60 Hz sine ≥ 40 dB at fs=256, Q=30 when fNotch=60', () => {
    const sig = genSine(60, FS, DURATION, 1);
    const filt = new NotchFilter({ fs: FS, fNotch: 60, q: 30 });
    const out = filt.process(sig);
    const settle = FS * 2;
    const attenDb = 20 * Math.log10(rms(sig, settle) / Math.max(rms(out, settle), 1e-12));
    expect(attenDb).toBeGreaterThanOrEqual(40);
  });

  it('passes 10 Hz alpha-band signal nearly unchanged when notch=50', () => {
    const sig = genSine(10, FS, DURATION, 1);
    const filt = new NotchFilter({ fs: FS, fNotch: 50, q: 30 });
    const out = filt.process(sig);
    const settle = FS * 2;
    const ratio = rms(out, settle) / rms(sig, settle);
    expect(ratio).toBeGreaterThan(0.95);
  });
});

describe('BandpassFilter — 0.5..45 Hz', () => {
  it('attenuates DC component (0 Hz)', () => {
    const N = FS * DURATION;
    const sig = new Float32Array(N).fill(1.0);
    const filt = new BandpassFilter({ fs: FS, fLow: 0.5, fHigh: 45 });
    const out = filt.process(sig);
    const settle = FS * 3;
    expect(rms(out, settle)).toBeLessThan(0.05);
  });

  it('attenuates very-low-frequency drift (0.1 Hz) significantly', () => {
    const sig = genSine(0.1, FS, DURATION, 1);
    const filt = new BandpassFilter({ fs: FS, fLow: 0.5, fHigh: 45 });
    const out = filt.process(sig);
    // 0.1 Hz is 5 octaves below 0.5 Hz cutoff for a 2nd-order HP → ≥ ~24 dB rejection.
    const settle = FS * 2;
    const attenDb = 20 * Math.log10(rms(sig, settle) / Math.max(rms(out, settle), 1e-12));
    expect(attenDb).toBeGreaterThanOrEqual(15);
  });

  it('passes 10 Hz nearly unchanged', () => {
    const sig = genSine(10, FS, DURATION, 1);
    const filt = new BandpassFilter({ fs: FS, fLow: 0.5, fHigh: 45 });
    const out = filt.process(sig);
    const settle = FS * 2;
    const ratio = rms(out, settle) / rms(sig, settle);
    expect(ratio).toBeGreaterThan(0.7);
  });

  it('attenuates high frequencies above 45 Hz', () => {
    const sig = genSine(80, FS, DURATION, 1);
    const filt = new BandpassFilter({ fs: FS, fLow: 0.5, fHigh: 45 });
    const out = filt.process(sig);
    const settle = FS * 2;
    const attenDb = 20 * Math.log10(rms(sig, settle) / Math.max(rms(out, settle), 1e-12));
    expect(attenDb).toBeGreaterThan(8);
  });

  it('rejects construction with invalid arguments', () => {
    expect(() => new BandpassFilter({ fs: 0, fLow: 0.5, fHigh: 45 })).toThrow();
    expect(() => new BandpassFilter({ fs: 256, fLow: 0, fHigh: 45 })).toThrow();
    expect(() => new BandpassFilter({ fs: 256, fLow: 50, fHigh: 45 })).toThrow();
    expect(() => new BandpassFilter({ fs: 256, fLow: 0.5, fHigh: 130 })).toThrow();
  });
});

describe('EegPreFilter (BP + notch composite)', () => {
  it('attenuates 50 Hz and DC simultaneously at fs=256', () => {
    const N = FS * DURATION;
    const dcPlus50 = new Float32Array(N);
    for (let n = 0; n < N; n++) {
      dcPlus50[n] = 1 + Math.sin((2 * Math.PI * 50 * n) / FS);
    }
    const filt = new EegPreFilter({ fs: FS, mainsHz: 50 });
    const out = filt.process(dcPlus50);
    const settle = FS * 3;
    expect(rms(out, settle)).toBeLessThan(0.1);
  });
});

describe('detectMainsHz', () => {
  it('returns 60 for en-US, en-CA, es-MX, pt-BR', () => {
    expect(detectMainsHz('en-US')).toBe(60);
    expect(detectMainsHz('en-CA')).toBe(60);
    expect(detectMainsHz('es-MX')).toBe(60);
    expect(detectMainsHz('pt-BR')).toBe(60);
  });
  it('returns 50 for id-ID, en-GB, vi-VN by default', () => {
    expect(detectMainsHz('id-ID')).toBe(50);
    expect(detectMainsHz('en-GB')).toBe(50);
    expect(detectMainsHz('vi-VN')).toBe(50);
  });
  it('falls back to 50 on missing input', () => {
    expect(detectMainsHz('')).toBe(50);
    expect(detectMainsHz(undefined)).toBe(50);
  });
});
