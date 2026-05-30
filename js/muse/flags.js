/**
 * Muse v2 — Feature Flag Helper
 *
 * Mengevaluasi apakah pengalaman Muse v2 aktif untuk user/sesi browser saat ini.
 * Flag ini sengaja sederhana dan idempoten: hasilnya hanya berubah bila user
 * mengubah URL atau localStorage.
 *
 * Sumber aktivasi (mana saja yang true → v2 aktif):
 *  1. Query string `?muse=v2`
 *  2. `localStorage.museV2 === '1'` atau `'true'`
 *
 * Mematuhi:
 *  - design.md § 17.3 (Feature flag)
 *  - tasks.md task 1.5
 *
 * Modul ini ditulis dalam IIFE plain JS agar kompatibel dengan pola codebase
 * existing (vanilla `<script>` tags). Juga dapat di-import dari modul ESM
 * lain via `window.MuseFlags`.
 */
(function attachMuseFlags(global) {
  'use strict';

  /**
   * Cek apakah Muse v2 aktif.
   *
   * @returns {boolean}
   */
  function isMuseV2Enabled() {
    try {
      // 1. Query string
      if (global && global.location && typeof global.location.search === 'string') {
        const params = new URLSearchParams(global.location.search);
        const v = params.get('muse');
        if (v === 'v2') return true;
      }
    } catch (_e) {
      // ignore — environment without proper URL/Search API (very rare)
    }

    try {
      // 2. localStorage
      if (global && global.localStorage) {
        const v = global.localStorage.getItem('museV2');
        if (v === '1' || v === 'true') return true;
      }
    } catch (_e) {
      // localStorage might be blocked (private mode, sandboxed iframe)
    }

    return false;
  }

  /**
   * Cek apakah simulasi Muse aktif (untuk QA/E2E tanpa perangkat).
   * Pemicu: `?simulate=muse` atau `localStorage.museSim === '1'`.
   *
   * @returns {{ enabled: boolean, scenario: 'calm'|'stressed'|'focused'|null }}
   */
  function getSimulationConfig() {
    const result = { enabled: false, scenario: null };

    try {
      if (global && global.location && typeof global.location.search === 'string') {
        const params = new URLSearchParams(global.location.search);
        if (params.get('simulate') === 'muse') {
          result.enabled = true;
          const s = params.get('scenario');
          if (s === 'calm' || s === 'stressed' || s === 'focused') {
            result.scenario = s;
          }
        }
      }
    } catch (_e) {
      // ignore
    }

    if (!result.enabled) {
      try {
        if (global && global.localStorage && global.localStorage.getItem('museSim') === '1') {
          result.enabled = true;
        }
      } catch (_e) {
        // ignore
      }
    }

    return result;
  }

  const MuseFlags = Object.freeze({
    isMuseV2Enabled,
    getSimulationConfig,
  });

  if (global && typeof global === 'object') {
    global.MuseFlags = MuseFlags;
  }

  // Juga export sebagai CommonJS/ESM jika environment mendukung (untuk Vitest).
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = MuseFlags;
  }
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
