/**
 * Smoke test — memastikan toolchain Vitest + fast-check + jsdom berfungsi.
 *
 * Test ini sengaja minimal: hanya memverifikasi runtime tersedia dan
 * library `fast-check` dapat diimpor + dijalankan. Tidak menguji modul Muse
 * apa pun (tugas itu ada di `tests/muse/decoder.test.js`, dst.).
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

describe('toolchain smoke', () => {
  it('Vitest is wired and runs a basic assertion', () => {
    expect(2 + 2).toBe(4);
  });

  it('jsdom environment exposes window/document globals', () => {
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
    const div = document.createElement('div');
    div.textContent = 'muse-smoke';
    expect(div.textContent).toBe('muse-smoke');
  });

  it('fast-check executes a trivial property over integers', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => Number.isInteger(n)),
      { numRuns: 32 }
    );
  });
});
