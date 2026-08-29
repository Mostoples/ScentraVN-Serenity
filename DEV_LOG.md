# ScentraVN Serenity — Catatan Pengembangan (Handoff)

> Ringkasan kerja agar bisa dilanjutkan besok. **Service Worker saat ini: `v2.5.4`** (lihat `sw.js` → `APP_VERSION`).
> Live: **https://serenity-id.web.app** · Project Firebase: **serenity-id**.

---

## ✅ Yang sudah selesai (sesi ini)

### 1. Spektra & Editor Data Rekaman
- "Lihat Grafik" di **Riwayat Rekaman** kini membuka **halaman editor** (`#spectra`), bukan modal.
- Grafik band EEG (delta–gamma) gaya halaman Health, **sumbu waktu (mm:ss)**.
- **Edit/hapus noise**: Denoise otomatis (MAD), hapus rentang (klik 2 titik), hapus per-frame (daftar data), simpan balik ke Firestore.
- File: `js/spectra-editor.js`, `js/record-history.js`, `js/raw-recorder.js` (`updateRecording`).

### 2. Perekaman pindah ke halaman Health
- `HealthRecorder` (di `js/health.js`): Start/Pause/Stop + timer + frame, mesin sama `RawRecorder`.
- **Gauge stabilitas Muse** (busur 4 elektroda + baterai tengah) → `js/muse-gauge.js`.
- Tombol "Rekam Data" lama dihapus; ada tombol **Monitor PPG** ke `ppg/index.html`.

### 3. PPG Muse S Gen 2 + HRV (akurat)
- Langganan PPG (`273e000f/0010/0011`), **decode adaptif 16/24-bit** (unit ini **24-bit**, paket 20-byte ✓).
- Auto-coba preset (`p1044/p1045/p50`) bila PPG tak streaming, lalu **kembalikan EEG ke p1035**.
- **Pipeline PPG→HRV** `js/ppg-hrv.js` (`window.MusePPG`): Butterworth band-pass 0.5–8 Hz, deteksi puncak adaptif, **IBI outlier rejection**, RMSSD + BPM + **SQI**.
- Card Health **PPG (IR)** (+ keterangan `decode 24-bit`) & **HRV (RMSSD)**; HRV di-gate SQI (kalau jelek → "sinyal lemah" + tombol info tips).
- Indikator PPG di gauge: **segmen tipis merah + ikon hati** (nyala saat streaming).
- Modul fitur: `js/math-utilities.js`, `js/feature-worker.js`, `js/eeg-insight.js` (baseline 30 dtk + auto-insight).

### 4. Baterai Muse — KALIBRASI FINAL
- **Sumber benar = telemetry offset 4, rumus `raw/512`** (45976/512 = 90% = sama app). Offset 2 (lama) salah/"lengket".
- Di-**poll tiap 30 dtk** + notify. File: `js/eeg-muse.js` (`_applyPropBattery`, `_pollBattery`).

### 5. Offline-first menyeluruh
- **Simpan rekaman**: offline → IndexedDB lokal (muncul di Riwayat dgn badge "Offline · menunggu unggah"); online → Firestore; auto-sync saat online (`RawRecorder.commitSession`, `saveLocalRecording`, `syncLocalRecordings`).
- **Storage worker** IndexedDB + CSV export (`js/storage-worker.js`, `js/session-store.js`).
- **Firestore persistence** aktif (no-hang saat offline). XLSX di-vendor lokal (`js/vendor/xlsx.full.min.js`) → Excel jalan offline.

### 6. Halaman PPG (`ppg/index.html`) offline-first
- Auto-save tiap pengukuran selesai: online→Firestore (`users/{uid}/ppgMeasurements`), offline→localStorage, auto-sync saat online. Tombol "☁ Sinkron". Tombol "← Health".

### 7. Auth / Tamu
- **Continue as Guest tanpa internet** → "Tamu Lokal" (`js/guest-session.js`): UID lokal, data ke perangkat, **auto-upgrade ke Firebase anonymous + sync saat online**.
- Persistence LOGIN LOCAL (tak perlu login ulang). Foto profil Google diperbaiki (24-bit avatar + fallback inisial).

### 8. Lain-lain
- **Video tutorial** Muse S Gen 2: tombol ▶️ di card EEG → modal auto-play `tutor.mp4`.
- Ikon `fa-chart-line` dibuat statis (tak beranimasi).
- Firestore rules: koleksi `ppgMeasurements` tercakup wildcard (sudah ter-deploy).

---

## ⚠️ Perlu dilakukan di sisi Anda
- **Aktifkan Anonymous sign-in** di Firebase Console (Authentication → Sign-in method → Anonymous) agar Tamu (online/lokal-upgrade) bisa sinkron ke cloud. Tanpa ini, Tamu tetap jalan **lokal/offline** saja.

## 🐞 Catatan / known issues
- **WebSocket `ws://…:8765 failed`** membanjiri console = `local-bridge` memindai jembatan Galaxy Watch (tidak jalan). Benigna. Bisa di-backoff kalau mau console bersih.
- **Baterai** telemetry kasar & lambat update (wajar ±1%, turun bertahap).
- **Video tutorial** di-serve dari jaringan (SW kecualikan `.mp4`) → butuh online. Bisa di-precache kalau perlu offline.
- `firebase.json` host seluruh folder (`public: "."`) → PDF/Backup ikut terunggah. Bisa dirapikan via `ignore`.

## 🧭 Ide lanjutan (besok)
- Bungkam spam WebSocket local-bridge (backoff/berhenti setelah N gagal).
- (Opsional) Card **BPM/Detak Jantung** di Health (sudah dihitung di `MuseEEG.metrics.hr`).
- (Opsional) Indikator **SQI** kecil di gauge.
- (Opsional) Precache `tutor.mp4` untuk tutorial offline.
- (Opsional) Rapikan `firebase.json ignore` agar deploy lebih ramping.

## 🚀 Cara deploy
```bash
firebase deploy --only hosting --project scentravn         # web/app
firebase deploy --only firestore:rules --project scentravn # rules (jika berubah)
```
Setelah ubah file: naikkan `APP_VERSION` di `sw.js` agar SW & cache ter-refresh di klien.
