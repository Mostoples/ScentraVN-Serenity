/**
 * Tests for js/muse/flags.js (Task 1.5).
 *
 * Validates:
 * - Default OFF when no URL param and no localStorage flag.
 * - Enabled via `?muse=v2`.
 * - Enabled via `localStorage.museV2 = '1'` and `'true'`.
 * - Simulation config parsing (`?simulate=muse&scenario=calm`).
 * - Side effect: `window.MuseFlags` is exposed.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

// We re-import via dynamic import inside each test so URL/localStorage state
// at import time does not affect subsequent tests (the helper itself is pure
// — re-evaluating env each call — so a single import is sufficient).
import '../../js/muse/flags.js';

const originalSearch = window.location.search;

function setSearch(qs) {
  // jsdom allows replacing search via history.replaceState
  const url = new URL(window.location.href);
  url.search = qs;
  window.history.replaceState({}, '', url.toString());
}

describe('MuseFlags.isMuseV2Enabled', () => {
  beforeEach(() => {
    setSearch('');
    window.localStorage.clear();
  });

  afterEach(() => {
    setSearch(originalSearch);
    window.localStorage.clear();
  });

  it('exposes MuseFlags on window', () => {
    expect(typeof window.MuseFlags).toBe('object');
    expect(typeof window.MuseFlags.isMuseV2Enabled).toBe('function');
    expect(typeof window.MuseFlags.getSimulationConfig).toBe('function');
  });

  it('returns false by default', () => {
    expect(window.MuseFlags.isMuseV2Enabled()).toBe(false);
  });

  it('returns true when ?muse=v2', () => {
    setSearch('?muse=v2');
    expect(window.MuseFlags.isMuseV2Enabled()).toBe(true);
  });

  it('returns false when ?muse=v1 or other value', () => {
    setSearch('?muse=v1');
    expect(window.MuseFlags.isMuseV2Enabled()).toBe(false);
    setSearch('?muse=anything');
    expect(window.MuseFlags.isMuseV2Enabled()).toBe(false);
  });

  it('returns true when localStorage.museV2 = "1"', () => {
    window.localStorage.setItem('museV2', '1');
    expect(window.MuseFlags.isMuseV2Enabled()).toBe(true);
  });

  it('returns true when localStorage.museV2 = "true"', () => {
    window.localStorage.setItem('museV2', 'true');
    expect(window.MuseFlags.isMuseV2Enabled()).toBe(true);
  });

  it('returns false when localStorage.museV2 = "0"', () => {
    window.localStorage.setItem('museV2', '0');
    expect(window.MuseFlags.isMuseV2Enabled()).toBe(false);
  });
});

describe('MuseFlags.getSimulationConfig', () => {
  beforeEach(() => {
    setSearch('');
    window.localStorage.clear();
  });

  afterEach(() => {
    setSearch(originalSearch);
    window.localStorage.clear();
  });

  it('returns disabled by default', () => {
    expect(window.MuseFlags.getSimulationConfig()).toEqual({ enabled: false, scenario: null });
  });

  it('parses ?simulate=muse alone', () => {
    setSearch('?simulate=muse');
    expect(window.MuseFlags.getSimulationConfig()).toEqual({ enabled: true, scenario: null });
  });

  it('parses ?simulate=muse&scenario=calm', () => {
    setSearch('?simulate=muse&scenario=calm');
    expect(window.MuseFlags.getSimulationConfig()).toEqual({ enabled: true, scenario: 'calm' });
  });

  it('parses scenario=stressed and focused', () => {
    setSearch('?simulate=muse&scenario=stressed');
    expect(window.MuseFlags.getSimulationConfig().scenario).toBe('stressed');
    setSearch('?simulate=muse&scenario=focused');
    expect(window.MuseFlags.getSimulationConfig().scenario).toBe('focused');
  });

  it('rejects unknown scenario', () => {
    setSearch('?simulate=muse&scenario=bogus');
    expect(window.MuseFlags.getSimulationConfig()).toEqual({ enabled: true, scenario: null });
  });

  it('enables via localStorage.museSim = "1"', () => {
    window.localStorage.setItem('museSim', '1');
    expect(window.MuseFlags.getSimulationConfig().enabled).toBe(true);
  });
});
