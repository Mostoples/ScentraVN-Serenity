# Handoff untuk App Android ScentraVN — Local WebSocket Bridge (Offline)

> **Untuk: Claude Code yang mengerjakan aplikasi Android.**
> Dokumen ini menjelaskan satu perubahan yang HARUS ada di sisi app Android agar
> web app (PWA) tetap menerima data **tanpa internet**. Web app sudah selesai
> disesuaikan; bagian inilah yang tersisa di app.

---

## 1. TL;DR — apa yang berubah & apa yang harus dikerjakan

**Yang berubah di web app:** Web app **tidak lagi membaca Firebase Realtime
Database** untuk data live. Mode-nya sekarang **offline-first** — sumber data live
satu-satunya adalah **WebSocket lokal** dari app Android (lihat
`js/firebase-live.js` → `ScentraLive.offlineOnly = true`).

**Yang harus dikerjakan di app Android:**
> Jalankan **server WebSocket lokal** yang **bind ke `0.0.0.0:8765`** dan
> mem-broadcast snapshot `/scentravn/live` sebagai JSON ke semua client yang
> terhubung, beberapa kali per detik.

Kalau app Android saat ini **hanya menulis ke Firebase RTDB**, maka di lapangan
(tanpa internet) **web app tidak akan menerima data apa pun**. WebSocket lokal ini
wajib ditambahkan.

---

## 2. Kenapa: dua skenario penggunaan di lapangan (tanpa internet)

```
SKENARIO A — PWA & app di HP yang SAMA:
  Galaxy Watch --BLE--> App Android (WS server) --ws://127.0.0.1:8765--> PWA (di HP)

SKENARIO B — PWA di LAPTOP, app di HP (via hotspot):
  Galaxy Watch --BLE--> App Android (WS server)
                               |  Hotspot WiFi HP (TANPA internet, 1 LAN)
                               v
                        Laptop: PWA --ws://192.168.43.1:8765--> data masuk
```

Skenario B inilah alasan **wajib bind `0.0.0.0`** (bukan `127.0.0.1`): kalau hanya
loopback, laptop di hotspot tidak bisa menjangkau server.

---

## 3. Spesifikasi server WebSocket (yang harus dipenuhi)

| Aspek | Nilai / Aturan |
|---|---|
| **Protokol** | WebSocket (`ws://`), bukan `wss://` |
| **Bind address** | **`0.0.0.0`** (semua interface) — WAJIB untuk skenario hotspot |
| **Port** | **`8765`** |
| **Path** | Terima koneksi di path apa pun (`/` sudah cukup; PWA connect tanpa path) |
| **Arah data** | Server → client (broadcast). Server tidak perlu memproses pesan masuk |
| **Multi-client** | Dukung **beberapa client sekaligus** (mis. HP + laptop bersamaan) |
| **Frekuensi kirim** | ~**2 Hz** (tiap ~500 ms), atau tiap ada pembacaan baru |
| **Batas "stale"** | PWA menganggap putus bila **tak ada pesan > 8 detik** → kirim minimal tiap beberapa detik walau data tak berubah |
| **Lifecycle** | Tetap menyiarkan selama sesi aktif; izinkan client reconnect kapan saja |

### Catatan penting
- **Biarkan BLE tetap jalan saat hotspot menyala.** Di sebagian chipset, scan/koneksi
  BLE bisa bentrok dengan hotspot. Bila Galaxy Watch putus saat hotspot ON, fallback:
  **laptop yang jadi hotspot**, HP bergabung (web app sudah mendukung IP ini).
- **(Opsional) Private Network Access:** untuk jaga-jaga kompatibilitas browser,
  pada handshake tambahkan header `Access-Control-Allow-Private-Network: true`.
- **Keamanan:** bind `0.0.0.0` mengekspos telemetri (read-only) ke LAN hotspot.
  Untuk lapangan ini wajar; bila perlu, batasi ke subnet hotspot saja.

---

## 4. Format payload (PERSIS) — kirim sebagai satu pesan JSON

Kirim **isi/value dari `/scentravn/live`** (TANPA bungkus `scentravn.live`).
Top-level key = `galaxyWatch`, `esp32`, `muse`:

```json
{
  "galaxyWatch": {
    "source": "GALAXY_WATCH",
    "connected": true,
    "bpm": 75,
    "battery": 65,
    "stress": {
      "value": 42,
      "level": "sedang",
      "source": "WATCH_CALIBRATED",
      "updatedAt": 1780168100467
    },
    "updatedAt": 1780168100467
  },
  "esp32": {
    "source": "ESP32_WATCH",
    "connected": false,
    "bpm": null,
    "spo2": null,
    "battery": null,
    "updatedAt": 0
  },
  "muse": {
    "source": "MUSE_S",
    "connected": true,
    "bpm": null,
    "eeg": { "delta": 1.2, "theta": 0.8, "alpha": 2.1, "beta": 1.5, "gamma": 0.4 },
    "betaAlpha": 0.71,
    "battery": 80,
    "updatedAt": 1780168100467
  }
}
```

### Aturan nilai (sama seperti kontrak Firebase yang lama)
- **`updatedAt` = epoch milidetik.** Naikkan tiap pembacaan baru. `0` = device itu belum pernah kirim data.
  (Web app memakai `updatedAt` untuk koreksi beda jam, deteksi "stale", dan dedup frame rekaman.)
- **`connected`** = boolean status link device.
- **Stres ada DI DALAM `galaxyWatch.stress`** (bukan top-level). `level` ∈
  `"rileks" | "rendah" | "sedang" | "tinggi" | "unavailable"`.
- **`esp32`** punya `spo2`; **`muse`** punya `eeg{delta,theta,alpha,beta,gamma}` + `betaAlpha`.
- Angka tak tersedia → **`null`**, jangan angka palsu.

### ⚠️ Beda penting dari Firebase
Di RTDB, field bernilai `null` **dihapus**. Lewat WebSocket/JSON **TIDAK** —
jadi **silakan kirim `null` secara eksplisit** (justru lebih disukai). Web app
sudah memakai cek longgar `x != null`, jadi `null` maupun field hilang sama-sama aman.

Kontrak field lengkap & semantiknya: lihat **`WEB_APP_INTEGRATION.md` §3**.

---

## 5. Sisi web app (sudah selesai — untuk konteks Anda)

- **Consumer WS:** `js/local-bridge.js` — auto-probe `127.0.0.1` **dan** IP hotspot
  (`192.168.43.1`, `192.168.137.1`, `172.20.10.1`) secara paralel; yang pertama
  terbuka dipakai. Bisa pin manual: `ScentraLocalBridge.setHost('192.168.43.1')`.
- **Ingest & normalisasi:** `js/firebase-live.js` → `ScentraLive._ingest(raw,'local')`
  → `_normalize(raw)` membaca `raw.galaxyWatch/esp32/muse`. `offlineOnly = true`
  mematikan RTDB sepenuhnya.
- **Penyajian PWA di laptop:** lewat `http://localhost:8000` (launcher
  `serve-offline.*`). Detail: **`OFFLINE_LAPTOP_SETUP.md`**.
  > Penting: PWA dibuka via `http://localhost` (bukan `https`, bukan IP) supaya
  > Service Worker hidup **dan** `ws://` ke IP LAN tidak diblokir browser (mixed content).

---

## 6. Apakah Firebase RTDB masih perlu ditulis?

**Tidak untuk web app ini** — web app mengabaikan RTDB sepenuhnya saat offline.
- Bila tak ada konsumen lain → boleh **hentikan write RTDB** saat offline (hemat baterai/kuota).
- Bila masih ada konsumen lain (analitik/cloud) → boleh tetap menulis; web app abai.

Yang wajib tetap ada untuk web app = **WebSocket lokal** di atas.

---

## 7. Checklist verifikasi (end-to-end)

1. App Android: BLE ke Galaxy Watch tersambung, WS server **bind `0.0.0.0:8765`**, broadcast ~2 Hz.
2. **Skenario A (1 HP):** buka PWA di HP → kartu Galaxy Watch RAW Recorder = **"Terhubung · Offline (lokal)"**, angka bergerak.
3. **Skenario B (laptop):** HP hotspot ON → laptop join → jalankan `serve-offline.bat`/`.sh` → buka `http://localhost:8000`.
   - Bila kosong: di Console (F12) → `ScentraLocalBridge.setHost('192.168.43.1')` (sesuaikan IP HP).
4. Cek `updatedAt` naik tiap pembacaan; matikan watch → `connected:false` dalam ≤ beberapa detik.
5. Cek tahan-putus: tutup app sesaat → PWA "stale" < 8 dtk → reconnect otomatis saat broadcast lagi.

---

## 8. Berkas rujukan di repo web app
- `js/local-bridge.js` — client WebSocket (kontrak koneksi & probe IP).
- `js/firebase-live.js` — ingest, `_normalize`, flag `offlineOnly`.
- `WEB_APP_INTEGRATION.md` — kontrak field `/scentravn/live` lengkap.
- `OFFLINE_LAPTOP_SETUP.md` — cara menyajikan PWA di laptop client.
