#!/usr/bin/env node
/**
 * ScentraVN Serenity — Server statis offline (cadangan, zero-dependency).
 *
 * Dipakai oleh launcher (serve-offline.bat / serve-offline.sh) ketika Python
 * tidak ada tapi Node ada. TIDAK butuh npm install / internet — hanya modul
 * bawaan Node (http, fs, path). Menyajikan folder ini di http://localhost:PORT.
 *
 *   node serve-offline.js [PORT]      (default 8000)
 *
 * Diikat ke 127.0.0.1 saja: PWA dibuka di laptop yang sama; HP menyambung ke
 * SERVER-nya sendiri (app Android), bukan ke server laptop ini.
 */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.argv[2], 10) || 8000;
const HOST = '127.0.0.1';
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map':  'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.otf':  'font/otf',
  '.wasm': 'application/wasm',
  '.mp3':  'audio/mpeg',
  '.wav':  'audio/wav',
  '.ogg':  'audio/ogg',
  '.mp4':  'video/mp4',
  '.txt':  'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(req.url.split('?')[0].split('#')[0]); }
  catch (_) { res.writeHead(400); return res.end('Bad request'); }

  if (urlPath === '/' || urlPath === '') urlPath = '/index.html';

  // Cegah path traversal: file harus tetap di dalam ROOT.
  let filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) filePath = path.join(filePath, 'index.html');

    fs.readFile(filePath, (err2, data) => {
      if (err2) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        return res.end('404 — ' + urlPath + ' tidak ditemukan');
      }
      const ext = path.extname(filePath).toLowerCase();
      const type = MIME[ext] || 'application/octet-stream';
      const base = path.basename(filePath);
      const headers = { 'Content-Type': type };
      // sw.js & HTML jangan di-cache server agar pembaruan selalu terambil;
      // Service Worker yang mengurus cache offline aslinya.
      if (base === 'sw.js' || ext === '.html' || ext === '.webmanifest') {
        headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      }
      res.writeHead(200, headers);
      res.end(data);
    });
  });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`[ScentraVN] Port ${PORT} sudah dipakai. Coba: node serve-offline.js ${PORT + 1}`);
  } else {
    console.error('[ScentraVN] Server error:', e.message);
  }
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`[ScentraVN] PWA tersaji di  http://localhost:${PORT}/`);
  console.log('[ScentraVN] Biarkan jendela ini TERBUKA. Tekan Ctrl+C untuk berhenti.');
});
