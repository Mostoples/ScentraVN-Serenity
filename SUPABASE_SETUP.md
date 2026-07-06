# Setup Supabase — Storage Rekaman EEG/PPG

Firebase (Auth, Firestore, semua fitur lain) **tidak berubah**. Hanya data rekaman
mentah (raw EEG/PPG, yang besar) yang disimpan di Supabase Storage supaya tidak
kena limit Firestore free plan (1GiB storage / 20K write per hari).

## 1. Buat project

1. Buka **[supabase.com](https://supabase.com)** → login/daftar → **New Project**.
2. Isi nama project (mis. `scentravn`), buat password database (simpan, tidak
   dipakai di kode ini tapi Supabase minta), pilih region terdekat (mis.
   `Southeast Asia (Singapore)`).
3. Tunggu ± 2 menit sampai project selesai di-provision.

## 2. Buat bucket

1. Sidebar kiri → **Storage** → **New bucket**.
2. Nama: `recordings`.
3. **Public bucket: OFF** (biarkan private — rekaman EEG/PPG bukan untuk publik).
4. Create.

## 3. Buat policy akses

App ini pakai **Firebase Auth**, bukan Supabase Auth, jadi akses ke bucket
dikontrol lewat `anon key` + konvensi path `recordings/{firebaseUid}/{id}.json.gz`
(bukan lewat `auth.uid()` Supabase). Ini cukup untuk app personal/skala kecil,
bukan proteksi enterprise.

1. Storage → bucket `recordings` → tab **Policies** → **New policy**.
2. Pilih **For full customization** dan gunakan SQL berikut (jalankan di
   **SQL Editor**, bukan lewat form, biar sekali jalan):

   ```sql
   create policy "anon rw recordings"
   on storage.objects
   for all
   to anon
   using (bucket_id = 'recordings')
   with check (bucket_id = 'recordings');
   ```

3. Run.

## 4. Ambil kredensial

**Project Settings** (ikon gear, sidebar bawah) → **API**:

| Ambil | Contoh bentuk |
|---|---|
| **Project URL** | `https://xxxxxxxxxxxx.supabase.co` |
| **anon / public key** | string panjang diawali `eyJ...` |

⚠️ **Jangan** ambil/pakai `service_role` key — itu bisa bypass semua policy,
tidak boleh ada di kode browser.

## 5. Kirim ke saya / masukkan ke config

Tambahkan ke `js/config.keys.js` (file ini sudah di-gitignore, tidak ke-commit):

```js
const API_KEYS = {
    // ...existing keys...
    SUPABASE_URL: 'https://xxxxxxxxxxxx.supabase.co',
    SUPABASE_ANON_KEY: 'eyJ...',
};
```

Setelah dua nilai ini ada, kasih tahu saya — saya lanjutkan wiring-nya di
`js/config.js` (baca dari `API_KEYS`) dan alur simpan rekaman di
`js/raw-recorder.js` (upload blob ke Supabase, Firestore cuma simpan metadata).

## Ringkasan alur setelah selesai

```
Rekaman selesai
   ├─ Firestore: metadata ringan (nama, durasi, counts, path file)
   └─ Supabase Storage: 1 file blob (json.gz) per sesi → recordings/{uid}/{id}.json.gz
```

## Struktur data di Supabase Storage

- **Path deterministik**: `{firebaseUid}/{recordingId}.json.gz` — satu folder per user,
  satu file per rekaman. Path dihitung dari `uid`+`id` saja (bukan tanggal/nama), jadi
  save/edit/migrasi rekaman yang sama SELALU menimpa file yang sama persis (`upsert`) —
  tidak ada file yatim (orphan) yang menumpuk tiap kali rekaman diedit.
- **Isi file**: JSON gabungan 4 stream (`muse`, `museRaw`, `scentra`, `galaxy`) di-gzip
  (`fflate`). Saat dibaca kembali, tiap stream selalu dipastikan berbentuk array
  (default `[]` kalau field-nya hilang/rusak) — jadi kode pemanggil tidak perlu cek null.
- **Object metadata** (custom, terlihat di Supabase Dashboard → Storage → klik file →
  "Metadata", tanpa perlu buka Firestore): `recordingId`, `uid`, `name`, `startedAt`,
  `durationSec`, `total` — supaya tiap file bisa langsung dikenali isinya dari dashboard.
- **cacheControl: 0** — supaya setelah rekaman diedit (`updateRecording`), baca berikutnya
  tidak kebaca versi lama dari cache.
- **Firestore `rawRecordings/{id}`** menyimpan `schemaVersion: 3`, `storageBucket`,
  `storagePath`, `bytes` (ukuran JSON asli), `compressedBytes` (ukuran setelah gzip) —
  dua angka terakhir berguna untuk memantau rasio kompresi.

## Kapasitas rekaman ~1 jam

- **Batas keras Supabase free plan: 50MB per file** (tidak bisa dinaikkan di plan gratis —
  beda dari Firestore, ini per-project cap yang fixed). Estimasi rekaman ~1 jam (EEG 256Hz
  ×4ch + PPG 64Hz ×3ch + data watch) setelah gzip biasanya ~10-20MB — masih jauh di bawah
  limit. `js/raw-recorder.js` (`_uploadStreamsToSupabase`) cek ukuran terkompresi sebelum
  upload dan gagal dengan pesan jelas kalau ternyata > 50MB, alih-alih error mentah dari API.
- **Autosave berkala saat merekam**: sebelumnya draft cuma disimpan ke IndexedDB saat user
  menekan Jeda. Sekarang (`js/raw-recorder-view.js`) ada checkpoint otomatis tiap ~2 menit
  selama aktif merekam, supaya kalau tab crash/browser ditutup di tengah sesi 1 jam, yang
  hilang paling banyak 2 menit terakhir — bukan seluruh sesi.
- **Timeout upload**: dinaikkan dari 60 detik → 5 menit (`commitSession` di raw-recorder.js),
  karena blob 10-20MB di koneksi lambat bisa lebih dari 1 menit. Kalau tetap gagal/timeout,
  rekaman otomatis disimpan lokal (IndexedDB) dan di-retry saat online lagi — tidak hilang.
