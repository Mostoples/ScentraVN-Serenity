/**
 * ScentraVN Serenity — Storage Worker (IndexedDB)
 *
 * Persists recording frames OFF the main thread, one chunk per second, so a long
 * session never accumulates unbounded data in main-thread RAM. Also builds the
 * end-of-session CSV inside the worker (avoids a giant string on the UI thread).
 *
 * Messages in : { id, type:'start'|'append'|'count'|'exportCsv'|'clear', … }
 * Messages out: { id, ok, … }  — `exportCsv` returns { blob, filename }.
 */

const DB_NAME = 'scentravn-session-store';
const STORE = 'chunks';
let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function ensure() { if (!db) db = await openDB(); return db; }
function reqP(r) { return new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); }
function store(mode) { return db.transaction(STORE, mode).objectStore(STORE); }

async function clearAll() { await reqP(store('readwrite').clear()); }
async function append(stream, frames) { await reqP(store('readwrite').add({ stream, frames })); }
async function countRows() { return reqP(store('readonly').count()); }
async function getAll() { return reqP(store('readonly').getAll()); }

/** Array of frame objects → CSV (arrays become pipe-joined cells). */
function streamToCSV(arr) {
  if (!arr.length) return '';
  const keys = Array.from(arr.reduce((s, r) => { Object.keys(r).forEach(k => s.add(k)); return s; }, new Set()));
  const esc = (v) => {
    if (v === undefined || v === null) return '';
    if (Array.isArray(v)) return '"' + v.map(x => Array.isArray(x) ? x.join('|') : x).join('|') + '"';
    if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))) return '"' + v.replace(/"/g, '""') + '"';
    return v;
  };
  const lines = [keys.join(',')];
  for (const r of arr) lines.push(keys.map(k => esc(r[k])).join(','));
  return lines.join('\n');
}

async function buildCsv(streamName) {
  const rows = await getAll();
  const frames = [];
  for (const row of rows) { if (row.stream === streamName && Array.isArray(row.frames)) frames.push(...row.frames); }
  const csv = streamToCSV(frames);
  return new Blob([csv], { type: 'text/csv;charset=utf-8' });
}

self.onmessage = async (ev) => {
  const m = ev.data || {};
  const id = m.id;
  try {
    await ensure();
    switch (m.type) {
      case 'start':   await clearAll(); self.postMessage({ id, ok: true }); break;
      case 'append':  await append(m.stream, m.frames || []); self.postMessage({ id, ok: true }); break;
      case 'count':   self.postMessage({ id, ok: true, count: await countRows() }); break;
      case 'exportCsv': {
        const blob = await buildCsv(m.stream || 'muse');
        self.postMessage({ id, ok: true, blob, filename: m.filename || 'scentravn.csv' });
        break;
      }
      case 'clear':   await clearAll(); self.postMessage({ id, ok: true }); break;
      default:        self.postMessage({ id, ok: false, error: 'unknown type' });
    }
  } catch (err) {
    self.postMessage({ id, ok: false, error: err && err.message });
  }
};
