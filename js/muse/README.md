# Muse S Gen 2 — Peta Modul

Folder ini berisi seluruh modul baru untuk integrasi Muse S Gen 2 ke halaman Health (lihat `design.md` § 2). Semua modul di sini bersifat opt-in dan diaktifkan via feature flag agar rollout dapat dilakukan bertahap.

## Feature Flag

Aktivasi v2 di balik feature flag (lihat `design.md` § 17.3, default OFF):

- Query string: `?muse=v2`
- LocalStorage: `localStorage.museV2 = '1'`

Helper resmi: `js/muse/flags.js` → `isMuseV2Enabled()` (di-export ke `window.MuseFlags`).

## Peta Modul

| Modul | Tanggung Jawab |
|---|---|
| `connection.js` | `MuseConnection` — pairing Web Bluetooth, subscribe karakteristik, kirim `p21/s/d`, reconnect exponential backoff, deteksi stalled. |
| `decoder.js` | Pure functions decode paket BLE Muse: `decodeEegPacket`, `decodePpgPacket`, `decodeImuPacket`, `decodeBattery`. |
| `dsp.worker.js` | Web Worker DSP — menggabungkan pipeline filter → FFT → band power per kanal dan peak → BR untuk PPG; posting metrics ke main thread (throttle 10 Hz). |
| `dsp/filters.js` | Biquad cascade band-pass 0.5–45 Hz dan notch 50/60 Hz; stateful per kanal. |
| `dsp/fft.js` | FFT Cooley-Tukey radix-2 dengan window Hanning; API `fftMag(samples, N)`. |
| `dsp/bandpower.js` | Integrasi PSD per band Δ/θ/α/SMR/β/γ + alpha peak. |
| `dsp/peak.js` | Pan-Tompkins simplified untuk deteksi puncak PPG (refractory 300 ms). |
| `dsp/br.js` | Estimator Breath_Rate dari PPG envelope dengan fallback IMU Z-axis. |
| `scoring.js` | Pure scoring functions: `mind`, `heart`, `body`, `breath`, `calm`, `focus`, `stress` (clamp `[0, 100]`). |
| `sleep-classifier.js` | Klasifikasi tahap tidur per epoch 30 s (`awake/light/deep/rem`); dipanggil dari worker. |
| `sessions.js` | `SessionRecorder` — lifecycle sesi (start/addEpoch/finalize/discard), snapshot 10 s ke IndexedDB, flag interrupted/sensorless. |
| `serializer.js` | Round-trip JSON/CSV: `stringifyJson`/`parseJson`/`stringifyCsv`/`parseCsv`; `UnsupportedSchemaError` deskriptif. |
| `soundscape.js` | `SoundscapeEngine` — AudioContext, 4 preset × 3 layer, volume adaptif, reward cue, fade-out, RMS guard. |
| `sim.js` | `MuseSim` — drop-in pengganti `MuseConnection` dengan skenario `calm/stressed/focused` (update 1 Hz). |
| `sync.js` | `MuseSync` — antrean offline IndexedDB → flush kronologis ke Firestore dengan retry & quota guard. |
| `consent.js` | `MuseConsent` — dialog persetujuan dan persistensi ke `users/{uid}/museConsent/profile`. |
| `store.js` | `MuseStore` — single source of truth state Muse (status, scores, contact, dst.) dengan `subscribe`/throttle 10 Hz. |
| `flags.js` | Helper feature flag `isMuseV2Enabled()` (mengevaluasi query string + localStorage). |
| `ui/ring-gauge.js` | Komponen `RingGauge` berbasis `requestAnimationFrame` untuk ring meter Mind/Heart/Body/Breath. |

## Konvensi Testing

- Framework: **Vitest** (runner) + **fast-check** (property-based).
- Lokasi test: `tests/muse/` (mirror struktur folder ini).
- Konvensi nama:
  - Unit test: `<modul>.test.js`
  - Property-based test: `<modul>.pbt.js`
- Setiap properti yang dites wajib mereferensikan requirement dengan format: `**Validates: Requirements X.Y**`.
- Jalankan via `npm test` (smoke + unit + PBT) atau `npm run test:watch` saat pengembangan.

## Catatan

- Semua modul DSP dan scoring ditulis sebagai pure functions agar dapat diuji unit/PBT tanpa BLE.
- `eeg-muse.js` lama dipertahankan sebagai shim adapter (lihat `design.md` § 17.1) sehingga `multi-ble.js` tidak pecah saat flag OFF.
- State Muse adalah single source of truth di `MuseStore`, bukan di DOM.
