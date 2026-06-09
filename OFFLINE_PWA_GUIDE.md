# Panduan Offline Mode & PWA — ScentraVN

Dokumen ini menjelaskan cara kerja mode offline pada ScentraVN sebagai
Progressive Web App (PWA): apa yang bisa & tidak bisa dipakai offline,
arsitektur cache-nya, alur autentikasi offline-first, serta cara menguji
dan memelihara fitur ini.

> Versi Service Worker saat dokumen ini ditulis: **v2.1.0** (`sw.js`).

---

## 1. Ringkasan Singkat

ScentraVN dapat **dibuka dan dipakai tanpa koneksi internet** setelah kunjungan
pertama berhasil. Saat install, Service Worker menyimpan seluruh *app shell*
(HTML, semua JS/CSS lokal, ikon, model 3D, plus library CDN penting) ke cache
browser. Pada kunjungan berikutnya — termasuk saat offline — aplikasi dilayani
langsung dari cache sehingga terbuka instan.

| Aspek | Saat Online | Saat Offline |
|-------|-------------|--------------|
| Membuka aplikasi (UI) | ✅ | ✅ (dari cache) |
| Login pertama kali | ✅ | ❌ (butuh internet) |
| Tetap login (sesi lama) | ✅ | ✅ (cached session) |
| Rekam sinyal BLE/Muse (EEG/PPG/EDA) | ✅ | ✅ (proses di device) |
| Inferensi ML / DSP lokal | ✅ | ✅ |
| Baca data yang sudah tersimpan | ✅ | ✅ (IndexedDB Firestore) |
| Sinkronisasi data ke cloud | ✅ | ⏳ (antri, sync saat online) |
| Chat AI (Gemini) & TTS (ElevenLabs) | ✅ | ❌ (butuh server) |
| Login Google (OAuth) | ✅ | ❌ (butuh internet) |

---

## 2. Apa Itu PWA di Konteks ScentraVN

PWA adalah aplikasi web yang berperilaku seperti aplikasi native: bisa
di-install ke layar utama, berjalan layar penuh, dan tetap berfungsi offline.
Tiga komponen utamanya di proyek ini:

1. **`manifest.json`** — metadata aplikasi (nama, ikon, warna tema, `start_url`,
   mode tampilan). Membuat aplikasi bisa "Add to Home Screen".
2. **Service Worker (`sw.js`)** — proxy jaringan yang berjalan di latar belakang;
   mengatur strategi cache dan menyajikan aset offline.
3. **`js/pwa.js`** — kode sisi halaman: mendaftarkan Service Worker, menangani
   prompt install, dan menampilkan indikator status koneksi.

---

## 3. Arsitektur Cache Service Worker

### 3.1 Dua cache utama

| Cache | Isi | Kapan diisi |
|-------|-----|-------------|
| `scentravn-precache-v2.1.0` | App shell lengkap + CDN penting | Saat **install** |
| `scentravn-runtime-v2.1.0` | Aset yang diambil saat dipakai | Saat **runtime** |

Saat versi `APP_VERSION` di `sw.js` dinaikkan, cache lama (yang namanya tidak
cocok) otomatis dihapus pada event `activate`.

### 3.2 Yang di-precache saat install (`LOCAL_ASSETS`)

- Semua halaman inti: `/`, `index.html`, `app.html`, `auth.html`, `offline.html`
- `manifest.json`
- Seluruh CSS (`/css/*.css`)
- ~90 file JavaScript: core/config, signal processing & ML, konektivitas BLE,
  dashboard, avatar/TTS, EEG/sleep/biolab, aromaterapi, recorder, modul aplikasi
  (assessment, journal, mindful, dll), program HEROIC, dan UI misc
- **Worker DSP Muse + sub-modulnya**: `dsp.worker.js` beserta
  `dsp/filters.js`, `dsp/fft.js`, `dsp/bandpower.js`, `dsp/peak.js`, `dsp/br.js`
  > ⚠️ Penting: `dsp.worker.js` dimuat sebagai *module worker*
  > (`new Worker(url, { type: 'module' })`) dan meng-`import` kelima sub-modul
  > di atas. Semuanya **wajib** ada di precache; jika satu hilang, fitur EEG
  > Muse gagal total saat offline.
- Gambar & model 3D inti: `logo.png`, `icon.svg`, `avatar.glb`, `Idle.fbx`

Precache dilakukan **satu per satu dengan `Promise.allSettled`**, sehingga satu
file yang gagal di-fetch tidak menggagalkan seluruh proses install.

### 3.3 Library CDN (`CDN_ASSETS`)

Library eksternal penting (Firebase SDK, Three.js + loader, Chart.js, fflate,
xlsx, Font Awesome, Google Fonts) di-precache secara *best-effort*. Bila gagal
saat install (mis. CORS), library tetap akan tersimpan saat pertama kali diambil
di runtime melalui strategi *stale-while-revalidate*.

---

## 4. Strategi Penanganan Request (event `fetch`)

Service Worker hanya menangani request **GET** berskema `http(s)`. Selebihnya
diputuskan berdasarkan jenis request:

| Jenis request | Strategi | Alasan |
|---------------|----------|--------|
| **API data** (Firestore, Realtime DB, Auth, Storage, Gemini, ElevenLabs) | **Diabaikan SW** — langsung ke jaringan | Data dinamis; offline ditangani persistence IndexedDB Firestore. Caching response API berbahaya/usang |
| **Media besar** (`.mp3/.mp4/.wav/...`, `/audio/`, `/music/`) | Dibiarkan ke jaringan | Agar *Range request* (HTTP 206) untuk streaming/seek tetap jalan |
| **Navigasi halaman** (`mode: navigate`) | **Network-first** → halaman cache → app shell → `offline.html` | Selalu coba versi terbaru saat online; tetap tampil saat offline |
| **Aset lain** (JS/CSS/font/gambar/CDN) | **Stale-while-revalidate** | Tampil instan dari cache, diperbarui di latar belakang |

Catatan penting tentang deteksi API: **Google Fonts** (`fonts.googleapis.com`,
`fonts.gstatic.com`) sengaja **dikecualikan** dari daftar "API" supaya font
tetap boleh di-cache dan tersedia offline.

### Stale-While-Revalidate (SWR)

```
1. Kembalikan respons dari cache SEGERA (jika ada)
2. Secara paralel, fetch versi baru dari jaringan
3. Jika fetch sukses (bukan 206), simpan ke RUNTIME cache untuk lain kali
4. Jika tak ada cache & jaringan gagal -> Response 503
```

### Navigasi

```
ONLINE  : navigationPreload / fetch -> simpan ke cache -> tampilkan
OFFLINE : halaman sama dari cache
          -> app shell (app.html)
          -> offline.html
          -> teks "Anda sedang offline"
```

`navigationPreload` diaktifkan saat `activate` untuk mempercepat navigasi online.

---

## 5. Autentikasi Offline-First

Tujuan: pengguna yang **sudah pernah login** tidak boleh "terkunci di luar"
hanya karena sedang offline (login Google/Firebase butuh internet).

### Prinsip

- **Persistence selalu `LOCAL`.** Baik login email/password, register, maupun
  Google — semuanya memakai `firebase.auth.Auth.Persistence.LOCAL`. Sebelumnya,
  tanpa "remember me" memakai `SESSION` yang membuat pengguna ter-logout saat
  browser ditutup. (Parameter `rememberMe` dipertahankan demi kompatibilitas API
  namun tidak lagi menurunkan ke `SESSION`.)

- **Cached session.** Setelah login sukses, objek user disimpan ke
  `localStorage` (`scentravn_user`). `AuthGuard` membacanya saat offline.

### Alur `AuthGuard.check()` (halaman terproteksi spt `app.html`)

```
onAuthStateChanged / timeout 3 dtk:
  - Ada user dari Firebase            -> IZINKAN
  - Offline + ada cached session      -> IZINKAN (jangan redirect ke login)
  - Online tanpa user / tanpa cache   -> TOLAK (redirect ke auth.html)
```

Implementasi memakai flag `settled` agar listener `onAuthStateChanged` dan
fallback `setTimeout` tidak saling balapan (anti-race).

### Halaman login (`auth.html`)

- Saat offline, tombol **Login Google dinonaktifkan** (popup OAuth butuh
  internet) dengan tooltip penjelasan.
- Offline **tanpa** cached session → tampilkan pesan: login pertama butuh
  internet.
- Offline **dengan** cached session → langsung diarahkan ke `app.html` oleh
  `AuthGuard.redirectIfAuthenticated()`.
- Bereaksi terhadap event `online`/`offline` secara real-time.

---

## 6. Penanganan Data Offline

Service Worker **tidak** meng-cache response API Firebase. Penanganan data
offline sepenuhnya mengandalkan **persistence IndexedDB milik Firestore**:

- Data yang sudah pernah dimuat tetap bisa **dibaca** saat offline.
- Penulisan baru saat offline **diantrikan** dan **otomatis tersinkronisasi**
  saat koneksi pulih.
- Pemrosesan sinyal (BLE/Muse → DSP → fitur → inferensi ML) berjalan **lokal di
  perangkat**, jadi perekaman & analisis tetap berfungsi penuh offline.

---

## 7. Indikator Status Koneksi (UI)

Modul `NetworkStatus` di `js/pwa.js` menampilkan banner kecil di atas layar:

- **Offline** (merah): "Mode offline — data tersimpan tetap tersedia" (menetap).
- **Kembali online** (hijau): "Koneksi kembali — tersinkronisasi" (hilang otomatis
  setelah ~2,5 detik).
- Saat pertama load dalam keadaan online, banner tidak ditampilkan.

Modul ini mandiri (tidak bergantung objek `PWA`) dan bersifat aksesibel
(`role="status"`, `aria-live="polite"`).

Dialog konfirmasi/peringatan native (`alert`/`confirm`) digantikan modal
berbranding `Utils.showModal()` (lihat `js/utils.js`), dipakai antara lain di
`record-history.js` dan `raw-recorder-view.js`.

---

## 8. Halaman Offline (`offline.html`)

Fallback terakhir untuk navigasi saat halaman tidak tersedia di cache.
Menjelaskan apa yang masih bisa dilakukan offline dan menyediakan tombol
"coba lagi" yang mengecek konektivitas (`navigator.onLine` + HEAD ke
`manifest.json`) sebelum memuat ulang.

---

## 9. Cara Menguji Mode Offline

1. Buka aplikasi **online** sekali sampai termuat penuh (agar precache selesai).
2. Buka **DevTools → Application → Service Workers**; pastikan SW *activated*.
3. Centang **Offline** (atau **Network → Offline**).
4. Reload halaman — aplikasi harus tetap terbuka dari cache.
5. Uji skenario:
   - Buka `app.html` langsung saat offline → harus masuk (cached session).
   - Buka `auth.html` saat offline → tombol Google ter-disable.
   - Jalankan perekaman/analisis sinyal → tetap berfungsi.
   - Coba fitur chat AI/TTS → gagal dengan pesan yang sesuai (perlu server).
6. **Application → Cache Storage** → periksa isi `scentravn-precache-v2.1.0`.

> Tip: untuk menguji ulang dari nol, hapus cache lewat DevTools atau
> *Unregister* Service Worker, lalu reload.

---

## 10. Memelihara & Memperbarui

- **Menambah file JS/CSS/aset baru** yang harus tersedia offline → **tambahkan
  path-nya ke `LOCAL_ASSETS`** di `sw.js`. File yang tidak terdaftar hanya akan
  ter-cache *setelah* pertama kali diakses online (via SWR), jadi tidak terjamin
  ada saat offline pada kunjungan pertama.
- **Module worker / dependensi `import`** → semua file di dalam graf import
  worker **wajib** dimasukkan ke precache (lihat kasus `dsp/*` di §3.2).
- **Setelah mengubah aset apa pun** → **naikkan `APP_VERSION`** di `sw.js`
  (mis. `2.1.0` → `2.1.1`). Ini memicu install ulang precache (dengan
  `cache: 'reload'`) dan pembersihan cache versi lama.
- **Endpoint API baru** yang tidak boleh di-cache → tambahkan host-nya ke fungsi
  `isApiRequest()`.
- **Tipe media baru** yang butuh Range request → tambahkan ke `isMedia()`.

---

## 11. Berkas Terkait

| Berkas | Peran |
|--------|-------|
| `sw.js` | Service Worker: precache, strategi fetch, lifecycle |
| `manifest.json` | Metadata PWA & ikon |
| `js/pwa.js` | Registrasi SW, prompt install, `NetworkStatus` |
| `js/auth.js` | Login/register, persistence LOCAL, guard offline Google |
| `js/auth-guard.js` | Proteksi halaman + izin masuk offline via cached session |
| `js/utils.js` | `Utils.showModal()` (pengganti alert/confirm) |
| `offline.html` | Halaman fallback offline |
| `js/firebase-config.js` | Persistence Firestore (IndexedDB) & cache user |

---

## 12. Keterbatasan yang Diketahui

- **Login pertama kali wajib online** (Firebase/Google OAuth tidak bisa offline).
- **Fitur berbasis server** (chat AI Gemini, TTS ElevenLabs) tidak tersedia
  offline.
- **Stale-while-revalidate** berarti aset bisa tampil dari versi cache lama untuk
  satu kali muat sebelum diperbarui — naikkan `APP_VERSION` saat rilis untuk
  memaksa pembaruan menyeluruh.
- Halaman utilitas (`admin.html`, `research.html`, dll.) tidak di-precache karena
  bergantung pada data Firebase live; saat offline akan jatuh ke fallback app
  shell / `offline.html`.
