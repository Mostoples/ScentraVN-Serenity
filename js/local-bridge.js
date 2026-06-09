/**
 * ScentraVN Serenity — Local Bridge (offline, lintas-perangkat via hotspot)
 *
 * App Android ScentraVN menjalankan server WebSocket dan mengirim snapshot
 * `/scentravn/live` (sama persis seperti yang dulu ditulis ke Firebase). Modul ini
 * menyuapi ScentraLive: tiap pesan → `ScentraLive._ingest(raw, 'local')`.
 *
 * DUA SKENARIO, satu kode:
 *   1) PWA & app di HP yang SAMA      → `ws://127.0.0.1:8765` (loopback).
 *   2) PWA di LAPTOP, app di HP        → HP jadi hotspot WiFi (TANPA internet),
 *      laptop bergabung, PWA menyambung ke IP HP, mis. `ws://192.168.43.1:8765`.
 *
 * Karena semua lewat LAN/loopback, ini bekerja **tanpa internet sama sekali**.
 *
 * ⚠️ MIXED CONTENT: browser memblokir halaman **HTTPS** yang membuka `ws://` ke
 *    IP LAN (hanya loopback yang dikecualikan). Untuk skenario laptop, sajikan PWA
 *    dari **http://localhost** (mis. `python -m http.server` / `npx serve`):
 *    localhost = secure context (Service Worker/offline tetap aktif) DAN `ws://`
 *    ke IP hotspot diizinkan karena halaman bukan HTTPS.
 *
 * 📱 SISI APP ANDROID: server WS harus bind ke `0.0.0.0:8765` (bukan `127.0.0.1`)
 *    agar bisa dijangkau laptop lewat hotspot.
 *
 * 🔧 IP HP berbeda? Pin manual dari Console:
 *      ScentraLocalBridge.setHost('192.168.43.1')   // tersimpan di localStorage
 *      ScentraLocalBridge.setHost(null)              // kembali ke auto-probe
 */
(() => {
  'use strict';

  const PORT = 8765;
  const RETRY_MS = 4000;       // jeda coba-sambung ulang saat tak ada server
  const STALE_MS = 8000;       // anggap putus bila tak ada pesan selama ini
  const PROBE_MS = 6000;       // tunggu salah satu kandidat terbuka sebelum ulang

  /* Kandidat host (urut prioritas):
     127.0.0.1     → PWA & app di HP sama (loopback)
     192.168.43.1  → HP jadi hotspot (gateway Android lazim)
     192.168.137.1 → laptop jadi hotspot (Windows Mobile Hotspot)
     172.20.10.1   → tethering iPhone
     Override manual lewat setHost() selalu didahulukan. */
  const DEFAULT_HOSTS = ['127.0.0.1', '192.168.43.1', '192.168.137.1', '172.20.10.1'];
  const LS_KEY = 'scentra.bridgeHost';

  const ScentraLocalBridge = {
    connected: false,
    enabled: true,
    host: null,                // host yang sedang aktif (berhasil)
    _ws: null,                 // koneksi aktif (pemenang probe)
    _probes: [],               // socket kandidat yang sedang diuji
    _retryTimer: null,
    _watchdog: null,
    _lastMsgAt: 0,

    /** Daftar host kandidat: override manual dulu, lalu default (tanpa duplikat). */
    _hosts() {
      let pinned = null;
      try { pinned = localStorage.getItem(LS_KEY); } catch (_) {}
      const list = pinned ? [pinned] : [];
      for (const h of DEFAULT_HOSTS) if (!list.includes(h)) list.push(h);
      return list;
    },

    /** Pin IP HP secara manual; null untuk kembali ke auto-probe. */
    setHost(host) {
      try { host ? localStorage.setItem(LS_KEY, host) : localStorage.removeItem(LS_KEY); } catch (_) {}
      this._reconnect();
      return host;
    },

    start() {
      if (!this.enabled || typeof WebSocket === 'undefined') return;

      // Bantuan debug: kalau halaman HTTPS non-localhost, ws:// ke LAN pasti diblokir.
      if (location.protocol === 'https:' && !/^(localhost|127\.|\[?::1)/.test(location.hostname)) {
        console.warn('[LocalBridge] Halaman via HTTPS non-localhost — browser akan MEMBLOKIR ' +
          'ws:// ke IP LAN (mixed content). Sajikan PWA dari http://localhost agar bridge hotspot jalan.');
      }

      this._probe();
      clearInterval(this._watchdog);
      // Watchdog: socket "open" tapi data berhenti → paksa sambung ulang.
      this._watchdog = setInterval(() => {
        if (this.connected && this._lastMsgAt && (Date.now() - this._lastMsgAt) > STALE_MS) {
          this._reconnect();
        }
      }, RETRY_MS);
    },

    stop() {
      this.enabled = false;
      clearTimeout(this._retryTimer);
      clearInterval(this._watchdog);
      this._closeProbes();
      if (this._ws) { try { this._ws.close(); } catch (_) {} }
      this._ws = null;
      this.connected = false;
    },

    /** Buka SEMUA kandidat sekaligus; yang pertama terbuka menang (cepat & tahan IP berubah). */
    _probe() {
      if (!this.enabled || this._ws) return;
      this._closeProbes();
      let settled = false;

      for (const host of this._hosts()) {
        let ws;
        try { ws = new WebSocket(`ws://${host}:${PORT}`); } catch (_) { continue; }
        this._probes.push(ws);
        ws.onopen = () => {
          if (settled) { try { ws.close(); } catch (_) {} return; }
          settled = true;
          this._adopt(ws, host);
        };
        ws.onerror = () => { /* ditangani onclose */ };
        ws.onclose = () => { /* kandidat ini gagal; biarkan yang lain */ };
      }

      // Tak ada yang terbuka dalam PROBE_MS → bersihkan & jadwalkan ulang.
      clearTimeout(this._retryTimer);
      this._retryTimer = setTimeout(() => {
        if (!this._ws && this.enabled) { this._closeProbes(); this._scheduleRetry(); }
      }, PROBE_MS);
    },

    /** Pemenang ditemukan: tutup kandidat lain, pasang handler tetap. */
    _adopt(ws, host) {
      this._ws = ws;
      this.host = host;
      this.connected = true;
      this._lastMsgAt = Date.now();
      this._closeProbes();               // tutup semua kecuali pemenang (this._ws)
      clearTimeout(this._retryTimer);
      console.log(`[LocalBridge] Tersambung ke ws://${host}:${PORT} (offline-ready)`);

      ws.onmessage = (ev) => {
        this._lastMsgAt = Date.now();
        let raw;
        try { raw = JSON.parse(ev.data); } catch (_) { return; }
        if (window.ScentraLive && typeof window.ScentraLive._ingest === 'function') {
          window.ScentraLive._ingest(raw, 'local');
        }
      };
      ws.onerror = () => { /* ditangani onclose */ };
      ws.onclose = () => {
        this.connected = false;
        this._ws = null;
        this._scheduleRetry();
      };
    },

    /** Tutup semua socket kandidat kecuali koneksi aktif. */
    _closeProbes() {
      for (const p of this._probes) {
        if (p !== this._ws) { try { p.close(); } catch (_) {} }
      }
      this._probes = [];
    },

    _reconnect() {
      this._closeProbes();
      if (this._ws) { try { this._ws.close(); } catch (_) {} this._ws = null; }
      this.connected = false;
      this._probe();
    },

    _scheduleRetry() {
      if (!this.enabled) return;
      clearTimeout(this._retryTimer);
      this._retryTimer = setTimeout(() => this._probe(), RETRY_MS);
    },
  };

  if (typeof window !== 'undefined') {
    window.ScentraLocalBridge = ScentraLocalBridge;
    // Mulai mencoba segera; aman dipanggil sebelum app tersambung — akan retry.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => ScentraLocalBridge.start());
    } else {
      ScentraLocalBridge.start();
    }
  }
})();
