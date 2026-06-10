/**
 * ScentraVN Serenity — Feature Extraction Worker
 *
 * Runs the (heavy) FFT / Hjorth / HRV maths off the main thread so the live
 * Web-Bluetooth stream and UI stay smooth. Receives a window payload, returns
 * the extracted feature object. Pure maths live in math-utilities.js.
 */
/* global MathUtils */
try {
  importScripts('/js/math-utilities.js');
} catch (e) {
  // Fallback for non-root hosting: resolve relative to this worker file.
  try { importScripts('math-utilities.js'); } catch (_) {}
}

self.onmessage = (ev) => {
  const p = ev.data;
  if (!p || p.type !== 'extract') return;
  try {
    const features = (typeof MathUtils !== 'undefined') ? MathUtils.extract(p) : null;
    self.postMessage({ type: 'features', features });
  } catch (err) {
    self.postMessage({ type: 'error', message: err && err.message });
  }
};
