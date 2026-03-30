# 📋 Rencana Implementasi Kuesioner Pengujian SynaWatch
> Dokumen ini dibuat untuk memudahkan kolaborasi tim dalam mengimplementasikan fitur kuesioner pengujian aplikasi SynaWatch yang terintegrasi dengan Firebase Firestore.

---

## 🎯 Tujuan

Membuat halaman kuesioner pengujian (`questionnaire.html`) yang:
1. Dapat diakses langsung dari halaman **beranda (dashboard)** aplikasi via banner card
2. Menyimpan semua jawaban responden langsung ke **Firestore** collection `questionnaireResults`
3. Menghitung skor secara otomatis (SUS, TAM, rata-rata, dll.)
4. Sesuai dengan desain SynaWatch (glassmorphism + gradien ungu)

---

## 📁 File yang Perlu Dibuat / Dimodifikasi

```
synawatch/
├── questionnaire.html          ← BUAT BARU  (halaman kuesioner lengkap)
└── js/
    └── views.js                ← MODIFIKASI (tambah banner card di dashboard)
```

---

## 🗂️ Struktur Data Firestore

**Collection:** `questionnaireResults`

Setiap dokumen disimpan otomatis saat user submit, dengan struktur:

```json
{
  "submittedAt": "<Firestore Timestamp>",
  "appVersion": "SynaWatch v1.0 MVP",
  "testingPhase": "Without Smartwatch",
  "source": "questionnaire.html",

  "responden": {
    "name": "string",
    "ageRange": "18-24 | 25-34 | ...",
    "gender": "Laki-laki | Perempuan | Lainnya",
    "background": "Mahasiswa | Profesional | ...",
    "appFrequency": "Tidak pernah | Jarang | ..."
  },

  "sus": {
    "rawScores": { "sus1": 4, "sus2": 2, ... },
    "totalScore": 82,
    "grade": "Good | Excellent | OK | Poor"
  },

  "uiux": {
    "rawScores": { "uiux1": 4, ... },
    "avgScore": 3.8,
    "avgNavigation": 4.0,
    "avgFeatures": 3.7
  },

  "tam": {
    "rawScores": { "tam1": 4, ... },
    "perceivedUsefulness": 4.0,
    "perceivedEaseOfUse": 3.75,
    "overallAvg": 3.88
  },

  "ueq": {
    "rawScores": { "ueq1": 6, ... },
    "avgScore": 5.5
  },

  "trust": {
    "rawScores": { "trust1": 4, ... },
    "avgScore": 3.9
  },

  "therapeutic": {
    "rawScores": { "ther1": 4, ... },
    "avgScore": 3.8
  },

  "engagement": {
    "rawScores": { "eng1": 5, ... },
    "avgScore": 4.2
  },

  "nps": {
    "score": 9,
    "category": "Promoter | Passive | Detractor"
  },

  "openEnded": {
    "liked": "string",
    "confusing": "string",
    "missing": "string",
    "smartwatch": "string",
    "suggestion": "string"
  },

  "summary": {
    "susScore": 82,
    "uiuxAvg": 3.8,
    "tamAvg": 3.88,
    "ueqAvg": 5.5,
    "trustAvg": 3.9,
    "therapeuticAvg": 3.8,
    "engagementAvg": 4.2,
    "nps": 9
  }
}
```

---

## 📝 Isi Kuesioner Lengkap

Kuesioner terdiri dari **9 halaman** dengan **66 item** total.

---

### Halaman 0 — Informasi Responden

| Field | Tipe | Pilihan |
|---|---|---|
| Nama / Inisial | Text | Bebas (maks. 50 karakter) |
| Usia | Select | <18 / 18-24 / 25-34 / 35-44 / 45+ |
| Jenis Kelamin | Select | Laki-laki / Perempuan / Lainnya |
| Latar Belakang | Select | Mahasiswa / Profesional / Tenaga Medis / Peneliti / Lainnya |
| Frekuensi pakai app kesehatan | Select | Tidak pernah / Jarang / Kadang / Sering / Setiap hari |

---

### Halaman 1 — Bagian A: SUS (System Usability Scale)
> Skala 1–5 · 10 item · Wajib semua

| Kode | Pertanyaan |
|---|---|
| sus1 | Saya merasa ingin sering menggunakan aplikasi SynaWatch ini. |
| sus2 | Saya merasa aplikasi ini terlalu rumit untuk digunakan. |
| sus3 | Aplikasi ini mudah digunakan. |
| sus4 | Saya membutuhkan bantuan orang lain untuk bisa menggunakan aplikasi ini. |
| sus5 | Fitur-fitur dalam aplikasi ini terintegrasi dengan baik satu sama lain. |
| sus6 | Saya merasa terlalu banyak ketidakkonsistenan dalam aplikasi ini. |
| sus7 | Saya rasa kebanyakan orang dapat belajar menggunakan aplikasi ini dengan sangat cepat. |
| sus8 | Aplikasi ini terasa sangat rumit dan canggung untuk digunakan. |
| sus9 | Saya merasa percaya diri saat menggunakan aplikasi ini. |
| sus10 | Saya perlu belajar banyak hal sebelum dapat menggunakan aplikasi ini dengan lancar. |

**Cara hitung skor SUS:**
- Item ganjil (sus1,3,5,7,9): `nilai - 1`
- Item genap (sus2,4,6,8,10): `5 - nilai`
- Total skor: `jumlah semua × 2.5` → range 0–100
- Grade: ≥85 = Excellent · ≥71 = Good · ≥51 = OK · <51 = Poor

---

### Halaman 2 — Bagian B: Kepuasan UI/UX & Fitur (Custom)
> Skala 1–5 · 12 item · Wajib semua

**Tampilan & Navigasi (uiux1–4)**

| Kode | Pertanyaan |
|---|---|
| uiux1 | Tampilan visual aplikasi ini menarik dan nyaman dilihat. |
| uiux2 | Ikon dan tombol mudah saya kenali fungsinya. |
| uiux3 | Saya dapat berpindah antar fitur dengan mudah dan intuitif. |
| uiux4 | Teks dan informasi dalam aplikasi mudah dibaca. |

**Fitur Utama (uiux5–12)**

| Kode | Pertanyaan |
|---|---|
| uiux5 | Fitur SynaChat membantu saya mengekspresikan perasaan saya. |
| uiux6 | Fitur Journal mudah saya gunakan untuk mencatat emosi harian. |
| uiux7 | Konten di Academy relevan dan bermanfaat untuk kesehatan mental saya. |
| uiux8 | Latihan di fitur Yoga/Mindful terasa terarah dan mudah diikuti. |
| uiux9 | Fitur Mood Booster memberikan dampak positif pada suasana hati saya. |
| uiux10 | Program HEROIC memiliki alur yang jelas dan memotivasi. |
| uiux11 | Dashboard memberikan gambaran kondisi saya yang informatif. |
| uiux12 | Fitur Games terasa menyenangkan dan relevan dengan kesehatan mental. |

---

### Halaman 3 — Bagian C: TAM (Technology Acceptance Model)
> Skala 1–5 · 8 item · Wajib semua

**Perceived Usefulness / Persepsi Kegunaan (tam1–4)**

| Kode | Pertanyaan |
|---|---|
| tam1 | Menggunakan SynaWatch membantu saya memantau kondisi kesehatan mental saya. |
| tam2 | Aplikasi ini meningkatkan kesadaran saya terhadap kondisi emosi dan stres saya. |
| tam3 | SynaWatch bermanfaat dalam membantu saya mengelola kesehatan mental sehari-hari. |
| tam4 | Secara keseluruhan, aplikasi ini berguna bagi saya. |

**Perceived Ease of Use / Persepsi Kemudahan (tam5–8)**

| Kode | Pertanyaan |
|---|---|
| tam5 | Mempelajari cara menggunakan SynaWatch terasa mudah bagi saya. |
| tam6 | Interaksi dengan aplikasi ini jelas dan mudah dipahami. |
| tam7 | Saya dapat menggunakan aplikasi ini tanpa banyak usaha. |
| tam8 | Secara keseluruhan, aplikasi ini mudah digunakan. |

---

### Halaman 4 — Bagian D: UEQ (User Experience Questionnaire)
> Skala semantik 1–7 · 8 pasang kata · Wajib semua

| Kode | Kata Negatif (1) | Kata Positif (7) |
|---|---|---|
| ueq1 | Menjengkelkan | Menyenangkan |
| ueq2 | Membingungkan | Jelas |
| ueq3 | Tidak efisien | Efisien |
| ueq4 | Membosankan | Menarik |
| ueq5 | Tidak dapat diprediksi | Dapat diprediksi |
| ueq6 | Konvensional | Inovatif |
| ueq7 | Tidak nyaman | Nyaman |
| ueq8 | Lambat | Cepat |

---

### Halaman 5 — Bagian E: Kepercayaan & Privasi Data
> Skala 1–5 · 5 item · Wajib semua

| Kode | Pertanyaan |
|---|---|
| trust1 | Saya percaya bahwa data kesehatan saya aman di dalam aplikasi SynaWatch. |
| trust2 | Saya merasa nyaman memberikan data pribadi dan kondisi emosi saya ke aplikasi ini. |
| trust3 | Saya yakin data saya tidak akan disalahgunakan atau dibagikan tanpa izin. |
| trust4 | Informasi tentang privasi dan keamanan data dalam aplikasi sudah cukup jelas. |
| trust5 | Saya percaya pada AI (SynaChat) untuk menyimpan percakapan saya dengan aman. |

---

### Halaman 6 — Bagian F: Nilai Terapeutik & Relevansi Konten
> Skala 1–5 · 7 item · Wajib semua

| Kode | Pertanyaan |
|---|---|
| ther1 | Konten dalam aplikasi ini relevan dengan kebutuhan kesehatan mental saya. |
| ther2 | Fitur SynaChat terasa seperti berbicara dengan pendamping yang memahami saya. |
| ther3 | Latihan Yoga dan Mindful dalam aplikasi ini terasa efektif untuk menenangkan pikiran. |
| ther4 | Konten Academy memberikan pengetahuan baru yang berguna tentang kesehatan mental. |
| ther5 | Saya merasa lebih baik secara emosional setelah menggunakan aplikasi ini. |
| ther6 | Program HEROIC memberikan panduan terstruktur untuk perkembangan diri saya. |
| ther7 | Fitur Journal membantu saya lebih memahami pola emosi dan suasana hati saya. |

---

### Halaman 7 — Bagian G: Keterlibatan & Motivasi Pengguna
> Skala 1–5 · 5 item · Wajib semua

| Kode | Pertanyaan |
|---|---|
| eng1 | Saya akan menggunakan SynaWatch secara rutin jika tersedia. |
| eng2 | Saya merasa terdorong untuk menyelesaikan program atau latihan dalam aplikasi. |
| eng3 | Notifikasi atau pengingat dari aplikasi ini akan memotivasi saya untuk konsisten. |
| eng4 | Saya merasa ada kemajuan nyata saat menggunakan fitur-fitur dalam aplikasi ini. |
| eng5 | Saya ingin mencoba fitur smartwatch ketika perangkatnya sudah tersedia. |

---

### Halaman 8 — Bagian H & I: NPS + Pertanyaan Terbuka

**H.1 — NPS (Net Promoter Score)**
> Skala 0–10 · Wajib

*"Seberapa besar kemungkinan Anda merekomendasikan SynaWatch kepada teman atau orang yang Anda kenal?"*

- 0–6 = Detractor
- 7–8 = Passive
- 9–10 = Promoter

**I — Pertanyaan Terbuka (tidak wajib)**

| Kode | Pertanyaan |
|---|---|
| open_liked | Fitur mana yang paling Anda sukai? Mengapa? |
| open_confusing | Fitur mana yang paling membingungkan atau sulit digunakan? |
| open_missing | Fitur apa yang belum ada namun Anda harapkan ada? |
| open_smartwatch | Bagaimana pendapat Anda tentang konsep smartwatch yang terhubung ke aplikasi ini? |
| open_suggestion | Saran atau masukan lain untuk pengembangan SynaWatch? |

---

## 🔧 Langkah Implementasi

### Step 1 — Buat `questionnaire.html`

Buat file baru `synawatch/questionnaire.html` dengan ketentuan:

- **Firebase:** Load dari CDN `https://www.gstatic.com/firebasejs/9.23.0/`
  - `firebase-app-compat.js`
  - `firebase-firestore-compat.js`
  - `firebase-auth-compat.js`
- **Config:** Import `js/config.js` (sudah ada di proyek)
- **Firestore:** Init menggunakan `CONFIG.FIREBASE_*` dari config.js
- **Collection target:** `questionnaireResults`
- **Desain:** Ikuti tema SynaWatch — font `Plus Jakarta Sans`, warna utama `#7c3aed`, glassmorphism, animasi aura ungu

**Struktur halaman:**
```
├── Background aura animation (3 orbs)
├── Header card (logo SYNAWATCH + judul)
├── Progress bar + step dots (9 langkah)
├── Page 0: Informasi Responden
├── Page 1: SUS (10 item, skala 1-5)
├── Page 2: UI/UX Custom (12 item, skala 1-5)
├── Page 3: TAM (8 item, skala 1-5)
├── Page 4: UEQ (8 item, skala semantik 1-7)
├── Page 5: Trust & Privasi (5 item, skala 1-5)
├── Page 6: Nilai Terapeutik (7 item, skala 1-5)
├── Page 7: Engagement (5 item, skala 1-5)
├── Page 8: NPS (0-10) + Open-ended (5 textarea)
└── Success screen (tampil setelah submit berhasil)
```

**Fitur wajib:**
- Validasi setiap halaman sebelum bisa lanjut
- Perhitungan skor otomatis sebelum disimpan ke Firestore
- Tombol Kembali / Lanjut di setiap halaman
- Tampilan sukses dengan ID dokumen Firestore setelah submit
- Tombol "Isi Lagi" untuk reset form

---

### Step 2 — Tambahkan Banner Card di `js/views.js`

Pada fungsi `dashboard()`, tambahkan HTML banner card **setelah** featured Health Score Card dan **sebelum** section Quick Menu (`<!-- Menu Cepat / Quick Menu -->`).

```html
<!-- Banner Kuesioner Pengujian Aplikasi -->
<div style="margin-top: 24px;">
  <div onclick="window.open('questionnaire.html', '_blank')" style="
      cursor: pointer;
      border-radius: 20px;
      padding: 20px 22px;
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 60%, #c084fc 100%);
      box-shadow: 0 8px 28px rgba(124,58,237,0.35);
      display: flex; align-items: center; justify-content: space-between; gap: 16px;
      position: relative; overflow: hidden;
      transition: transform 0.25s ease, box-shadow 0.25s ease;
  "
  onmouseenter="this.style.transform='translateY(-3px)';this.style.boxShadow='0 14px 36px rgba(124,58,237,0.45)'"
  onmouseleave="this.style.transform='';this.style.boxShadow='0 8px 28px rgba(124,58,237,0.35)'"
  >
    <!-- Decorative circles -->
    <div style="position:absolute;width:120px;height:120px;background:rgba(255,255,255,0.07);border-radius:50%;top:-30px;right:80px;pointer-events:none;"></div>
    <div style="position:absolute;width:80px;height:80px;background:rgba(255,255,255,0.06);border-radius:50%;bottom:-20px;right:20px;pointer-events:none;"></div>

    <!-- Kiri: ikon + teks -->
    <div style="display:flex; align-items:center; gap:16px; z-index:1;">
      <div style="
          width:52px; height:52px; flex-shrink:0;
          background:rgba(255,255,255,0.18);
          border-radius:14px;
          display:flex; align-items:center; justify-content:center;">
        <i class="fas fa-clipboard-list" style="font-size:22px; color:#fff;"></i>
      </div>
      <div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px;">
          <span style="font-size:15px;font-weight:800;color:#fff;">Kuesioner Pengujian</span>
          <span style="background:rgba(255,255,255,0.25);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;letter-spacing:0.5px;">BETA</span>
        </div>
        <p style="font-size:12px;color:rgba(255,255,255,0.82);margin:0;line-height:1.4;">
          Bantu kami tingkatkan SynaWatch — isi kuesioner &amp; beri feedback!
        </p>
      </div>
    </div>

    <!-- Kanan: tombol panah -->
    <div style="
        z-index:1; flex-shrink:0;
        width:38px; height:38px;
        background:rgba(255,255,255,0.2);
        border-radius:50%;
        display:flex; align-items:center; justify-content:center;">
      <i class="fas fa-arrow-right" style="color:#fff; font-size:14px;"></i>
    </div>
  </div>
</div>
```

---

## ✅ Checklist Implementasi

- [ ] Buat file `synawatch/questionnaire.html`
- [ ] Pastikan `js/config.js` bisa diakses dari `questionnaire.html`
- [ ] Pastikan Firebase Firestore terhubung dan bisa menerima data
- [ ] Tambahkan banner card di `js/views.js` → fungsi `dashboard()`
- [ ] Uji submit kuesioner → cek collection `questionnaireResults` di Firebase Console
- [ ] Uji tombol banner card di dashboard → memastikan `questionnaire.html` terbuka

---

## 🎨 Referensi Desain (Token CSS dari SynaWatch)

```css
/* Warna */
--primary:        #7c3aed;
--primary-light:  #a855f7;
--primary-dark:   #5b21b6;
--surface:        rgba(255,255,255,0.55);
--border:         rgba(255,255,255,0.6);
--text:           #1e293b;
--text-muted:     #64748b;
--success:        #10b981;
--error:          #ef4444;

/* Font */
font-family: 'Plus Jakarta Sans', sans-serif;

/* Glassmorphism */
backdrop-filter: blur(20px);
background: rgba(255,255,255,0.45);
border: 1px solid rgba(255,255,255,0.6);
border-radius: 16px;

/* Background Aura */
/* 3 orbs: ungu #a855f7, putih #fff, ungu muda #c084fc */
/* filter: blur(120px); opacity: 0.5; animasi 25s */
```

---

## 🔗 Dependencies

Semua sudah tersedia di proyek, tidak perlu install tambahan:

| Resource | Sumber |
|---|---|
| Firebase SDK v9 compat | `https://www.gstatic.com/firebasejs/9.23.0/` |
| Font Awesome 6.4 | `https://cdnjs.cloudflare.com/...` |
| Plus Jakarta Sans | Google Fonts |
| Firebase config | `js/config.js` (sudah ada) |

---

*Dokumen ini dibuat untuk membantu koordinasi tim pengembang SynaWatch. Diperbarui: 2026-03-30*
