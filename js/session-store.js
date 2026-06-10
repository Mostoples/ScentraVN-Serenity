/**
 * ScentraVN Serenity — Session Store client
 *
 * Thin main-thread wrapper around storage-worker.js. During a recording it
 * flushes only the NEW frames of each stream to the worker once per second
 * (incremental, by offset), so data lives in IndexedDB rather than piling up in
 * main-thread RAM. At the end it exports a CSV built inside the worker.
 *
 * Additive & non-blocking: if the Worker can't be created, every call no-ops so
 * the existing recording/Firestore flow is never affected.
 */
(() => {
  'use strict';

  const STREAMS = ['muse', 'museRaw', 'scentra', 'galaxy'];

  const SessionStore = {
    _w: null,
    _id: 0,
    _pending: {},
    _sent: {},
    _active: false,

    _ensure() {
      if (this._w) return true;
      try {
        this._w = new Worker('/js/storage-worker.js');
        this._w.onmessage = (e) => {
          const d = e.data || {}; const p = this._pending[d.id];
          if (!p) return;
          delete this._pending[d.id];
          d.ok ? p.res(d) : p.rej(new Error(d.error || 'storage error'));
        };
        this._w.onerror = () => { this._w = null; };
        return true;
      } catch (_) { this._w = null; return false; }
    },

    _call(msg) {
      return new Promise((res, rej) => {
        if (!this._ensure()) { rej(new Error('storage worker unavailable')); return; }
        const id = ++this._id;
        this._pending[id] = { res, rej };
        this._w.postMessage(Object.assign({ id }, msg));
      });
    },

    /** Begin a fresh session (clears any previous one in IndexedDB). */
    async begin() {
      this._sent = {}; STREAMS.forEach(s => (this._sent[s] = 0));
      this._active = true;
      try { await this._call({ type: 'start', sessionId: '' + (this._id + 1) }); }
      catch (_) { this._active = false; }
    },

    /** Flush the tail (un-sent) frames of each stream to the worker. */
    async flush(streams) {
      if (!this._active || !streams) return;
      for (const k of STREAMS) {
        const arr = streams[k] || [];
        const from = this._sent[k] || 0;
        if (arr.length > from) {
          const frames = arr.slice(from);
          this._sent[k] = arr.length;
          try { await this._call({ type: 'append', stream: k, frames }); }
          catch (_) { this._sent[k] = from; /* retry next tick */ break; }
        }
      }
    },

    /** Export one stream as CSV (Blob built in the worker). Returns null on failure. */
    async exportCsv(stream, filename) {
      try { const r = await this._call({ type: 'exportCsv', stream: stream || 'muse', filename }); return r.blob || null; }
      catch (_) { return null; }
    },

    async count() { try { return (await this._call({ type: 'count' })).count || 0; } catch (_) { return 0; } },
    async clear() { this._active = false; try { await this._call({ type: 'clear' }); } catch (_) {} },
    stop() { this._active = false; },
  };

  if (typeof window !== 'undefined') window.SessionStore = SessionStore;
})();
