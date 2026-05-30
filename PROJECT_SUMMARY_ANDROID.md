# ScentraVN Serenity — Ringkasan Project untuk Konversi Android (Kotlin + Java)

## Daftar Isi
1. [Gambaran Umum](#1-gambaran-umum)
2. [Tech Stack Saat Ini (Web)](#2-tech-stack-saat-ini-web)
3. [Tampilan & UI/UX](#3-tampilan--uiux)
4. [Halaman / Screen (17 Route)](#4-halaman--screen-17-route)
5. [Fitur-Fitur Lengkap](#5-fitur-fitur-lengkap)
6. [Model Data (Firestore)](#6-model-data-firestore)
7. [Integrasi API Eksternal](#7-integrasi-api-eksternal)
8. [Navigasi](#8-navigasi)
9. [Manajemen State](#9-manajemen-state)
10. [Rekomendasi Stack Android](#10-rekomendasi-stack-android)
11. [Peta Konversi Web → Android](#11-peta-konversi-web--android)

---

## 1. Gambaran Umum

**Nama Aplikasi:** ScentraVN Serenity — Smart Health Monitoring System

**Deskripsi:**
Aplikasi kesehatan mental dan fisik berbasis AI yang menggabungkan:
- Monitoring biometrik real-time via perangkat Bluetooth
- Chatbot AI (Dr. Synachat) berbasis Google Gemini
- Intervensi adaptif otomatis (pernapasan, musik, yoga, dll.)
- Skala asesmen psikologis klinis (PHQ-9, UCLA, PSP-5, SEES-10)
- Analitik tren kesehatan historis
- Konten wellness (meditasi, yoga, jurnal, musik terapi)

**Target Pengguna:** Pengguna Indonesia (bilingual ID/EN)

**Status:** PWA (Progressive Web App), siap dikonversi ke Android Native

---

## 2. Tech Stack Saat Ini (Web)

| Komponen | Teknologi Web | Pengganti Android |
|---|---|---|
| Bahasa | Vanilla JS (ES6 Modules) | Kotlin + Java |
| UI Framework | HTML5 + CSS3 | XML Layouts + Jetpack Compose |
| Routing | Hash-based SPA | Navigation Component + Fragment |
| Database Cloud | Firebase Firestore 10.7.0 | Firebase Firestore Android SDK |
| Auth | Firebase Auth (Email + Google) | Firebase Auth Android SDK |
| AI Chat | Google Gemini API (REST) | Gemini Android SDK / Retrofit |
| Text-to-Speech | ElevenLabs API | ElevenLabs API (Retrofit) + Android TTS |
| 3D Avatar | Three.js + GLTF/FBX | SceneView / Filament (opsional) |
| Charts | Chart.js | MPAndroidChart / Vico |
| Bluetooth | Web Bluetooth API | Android BLE API |
| Offline | Service Worker + LocalStorage | Room Database + DataStore |
| Yoga API | REST (yoga-api-nzy4.onrender.com) | Retrofit2 |
| Animasi | CSS Animations | Lottie + Android Animator |
| Lokalisasi | Custom i18n.js | Android strings.xml (res/values-id) |
| Tema | CSS Variables (gradient ungu) | Material 3 + Custom Theme |

---

## 3. Tampilan & UI/UX

### Palet Warna
| Nama | Hex | Penggunaan |
|---|---|---|
| Primary Purple | `#8B5CF6` | Tombol utama, header, aksen |
| Dark Purple | `#7C3AED` | Gradient, hover, status aktif |
| Accent Pink | `#EC4899` | Highlight, indikator mood |
| Orange | `#F97316` | Peringatan, badge streak |
| Background Dark | `#0F0F1A` | Latar layar utama |
| Card Dark | `#1A1A2E` | Kartu konten |
| Text Primary | `#FFFFFF` | Teks utama |
| Text Secondary | `#A0AEC0` | Teks subjudul |

### Tipografi
- **Font:** Poppins (Google Fonts)
- **Weight:** 400 (regular), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)

### Elemen UI Utama
- **Bottom Navigation Bar** — 6-7 item (sticky di bawah)
- **Top Header** — Logo + waktu + tanggal + toggle bahasa + tombol koneksi perangkat
- **Cards** — Sudut bulat besar (24dp), background gelap, shadow halus
- **Gauge/Lingkaran** — Indikator nilai real-time (HR, SpO2, Stress)
- **Progress Bar** — Linear & circular untuk skor
- **Modal/Dialog** — Full-screen atau bottom sheet
- **FAB (Floating Action Button)** — Koneksi perangkat, chat
- **Animasi:** Breathing circle pulsing, floating orbs, smooth slide transitions
- **Dark Mode:** Default (seluruh app dark theme)

---

## 4. Halaman / Screen (17 Route)

### 1. Dashboard (`#dashboard`)
**Fungsi:** Beranda utama, welcome message, health score, menu cepat
**Komponen UI:**
- Header greeting (nama user + waktu)
- Card HEROIC Wellness Index (skor 0-100 dengan warna)
- Mini chart real-time HR & Stress (Chart.js → MPAndroidChart)
- Grid kartu Quick Menu (10+ kartu: Assessment, Chat, Sleep, Yoga, dll.)
- Status indikator koneksi perangkat
**Data:** Health score terbaru, nama user, status koneksi perangkat

---

### 2. Health (`#health`)
**Fungsi:** Halaman untuk menghubungkan dan melihat data dari perangkat kesehatan Bluetooth. Semua perangkat yang digunakan dalam aplikasi ini dikelola dan ditampilkan di sini.
**Komponen UI:**
- Gauge besar: HR (Detak Jantung), SpO2 (Saturasi Oksigen), Stress Level (0-100)
- Gauge tambahan: GSR (Respons Galvanik Kulit), Suhu Tubuh, Aktivitas (Diam/Jalan/Lari)
- Gauge gelombang otak: Delta, Theta, Alpha, Beta, Gamma (% power band)
- Gauge Tekanan Darah: Sistolik/Diastolik
- Tombol START/STOP Recording sesi
- Counter pembacaan sesi + durasi
- Status chip tiap kategori perangkat yang terhubung
**Data real-time:** `hr, spo2, stress, gsr, bodyTemp, activity, eegBands, bpSystolic, bpDiastolic`

---

### 3. Analytics (`#analytics`)
**Fungsi:** Tren data historis kesehatan per periode
**Komponen UI:**
- Tab selector: Hari / Minggu / Bulan / Tahun
- Line chart tren: HR, Stress, GSR, SpO2
- Card ringkasan: Avg, Min, Max, Jumlah pembacaan
- Date picker / period navigator
**Data:** `analyticsSummary/{YYYY-MM-DD}` dari Firestore

---

### 4. Profile (`#profile`)
**Fungsi:** Informasi user, statistik, dan pengaturan
**Komponen UI:**
- Avatar foto profil + nama + email
- Stats cards: Total sesi, Total pembacaan, Hari streak
- Weekly bar chart aktivitas
- Tombol Edit Profil
- Tombol Logout
- Daftar skor asesmen terakhir (PHQ-9, UCLA, PSP-5, SEES-10)
**Data:** `users/{uid}` + `assessments/` terbaru

---

### 5. Synachat (`#synachat`)
**Fungsi:** Chatbot AI Dr. Synachat dengan avatar 3D
**Komponen UI:**
- Area avatar 3D (Three.js → Filament/SceneView Android)
- Bubble chat scrollable (user kiri, AI kanan)
- Input text + tombol kirim
- Tombol toggle TTS (audio on/off)
- Status indikator "typing..."
- Konteks biometrik otomatis disertakan dalam prompt
**API:** Google Gemini + ElevenLabs TTS
**Fitur:** Proactive alert saat stres tinggi (auto-buka chat)

---

### 6. Assessment (`#assessment`)
**Fungsi:** Kuesioner psikologis klinis bertahap
**Komponen UI:**
- Progress bar bertahap (misal: Tahap 1/4)
- Judul kuesioner aktif
- Kartu pertanyaan satu per satu
- Tombol jawaban skala Likert
- Tombol Lanjut / Kembali
- Halaman hasil: Skor, kategori (Normal/Ringan/Sedang/Berat), penjelasan
**Kuesioner:**
- **PHQ-9** — 9 pertanyaan depresi, skor 0-27
- **UCLA Loneliness Scale** — 20 pertanyaan, skor 20-80 (ada item reverse)
- **PSP-5** — 5 pertanyaan stres, skala 1-6
- **SEES-10** — 10 pertanyaan eating response, skala 1-5

---

### 7. Support (`#support`)
**Fungsi:** Pusat dukungan krisis psikologis
**Komponen UI:**
- 4 card hotline krisis Indonesia (24/7) dengan tombol telepon
- Tombol akses Safety Planning
- Form Safety Plan: tanda peringatan, strategi coping, kontak darurat
- Link ke Halodoc, Alodokter, Riliv
- Alert banner saat stres kritis terdeteksi
**Trigger:** Dapat dibuka otomatis oleh Intervention Engine

---

### 8. Academy (`#academy`)
**Fungsi:** Konten edukasi kesehatan mental
**Komponen UI:**
- Daftar kursus dengan thumbnail, judul, deskripsi
- Progress bar per kursus
- Konten artikel/video per chapter
**Data:** `academyProgress/{courseId}`

---

### 9. Research (`#research`)
**Fungsi:** Partisipasi dalam studi penelitian
**Komponen UI:**
- Daftar studi aktif
- Form persetujuan (consent form)
- Upload data sensor anonim

---

### 10. Sleep (`#sleep`)
**Fungsi:** Lab tidur — skor kesiapan & rutinitas malam
**Komponen UI:**
- Skor Sleep Readiness (0-100) dengan indikator warna
- Checklist rutinitas sebelum tidur (checkbox)
- Rekomendasi audio relaksasi + music player
- Grafik histori tidur (durasi & skor)
- Analisis gelombang otak saat tidur (theta/delta ratio, dari data perangkat)
**Data:** LocalStorage `synawatch_sleep_history` + Firestore

---

### 11. Moodbooster (`#moodbooster`)
**Fungsi:** Terapi musik berbasis biometrik
**Komponen UI:**
- Mood check-in harian (1x/hari, skala 1-5 dengan emoji)
- 4 kategori musik: Calm, Ambient, Upbeat, Local ASEAN
- Grid kartu lagu dengan cover art, judul, durasi
- Music player mini (play/pause/next)
- Rekomendasi otomatis berdasarkan HR & Stress level
- Selector negara ASEAN (untuk musik lokal)
**Audio:** 21 track (15 terapi + 6 musik lokal ASEAN)

---

### 12. Mindful (`#mindful`)
**Fungsi:** Latihan pernapasan 4-7-8
**Komponen UI:**
- Lingkaran animasi pulsing besar (visual breathing guide)
- Countdown timer per fase (Tarik/Tahan/Hembus)
- Label fase aktif (Inhale 4s → Hold 7s → Exhale 8s)
- Tombol Mulai / Selesai
- Counter jumlah siklus selesai
- Opsi durasi sesi

---

### 13. Journal (`#journal`)
**Fungsi:** Jurnal harian dengan tag emosi dari sensor
**Komponen UI:**
- Date picker (tanggal jurnal)
- Text area input jurnal
- Chip tag emosi otomatis (Relaxed, Tense, Active, dll.)
- Card konteks sensor saat menulis (HR, Stress, GSR, SpO2)
- Daftar entri jurnal sebelumnya
- Filter/search jurnal

---

### 14. Games (`#games`)
**Fungsi:** Gamifikasi wellness
**Komponen UI:**
- Poin total + badge level
- Streak harian (hari berturut)
- Daftar game wellness (quiz, challenge)
- Papan skor (leaderboard)
- Riwayat poin per aktivitas
**Data:** `gameStats/summary` Firestore

---

### 15. Yoga (`#yoga`)
**Fungsi:** Browser pose yoga dengan rekomendasi biometrik
**Komponen UI:**
- Filter: Semua / Beginner / Intermediate / Expert
- Filter kategori: Standing, Seated, Balance, dll.
- Grid kartu pose (foto, nama Sanskrit, nama Inggris, deskripsi)
- Detail pose: instruksi, benefit, durasi
- Rekomendasi pose berdasarkan HR & Stress saat ini
**API:** Yoga API (300+ pose) + Yogism API (enrichment)

---

### 16. HEROIC (`#heroic`)
**Fungsi:** Dashboard AI wellness index yang dapat dijelaskan (XAI)
**Komponen UI:**
- Skor keseluruhan (0-100) + label wellness
- 6 dimensi radar chart: Physical, Mental, Social, Lifestyle, Cognitive, Spiritual
- Penjelasan per dimensi (kontributif faktor & skor sub-dimensi)
- Tren historis skor HEROIC
- Insight rekomendasi dari AI

---

### 17. Admin (`#admin`)
**Fungsi:** Panel administrasi sistem (khusus admin)
**Komponen UI:**
- Statistik sistem (jumlah user aktif, total pembacaan hari ini)
- Manajemen API Key Gemini (rotasi, CRUD)
- Daftar user terdaftar
- Toggle maintenance mode

---

## 5. Fitur-Fitur Lengkap

### A. Monitoring Kesehatan Real-Time
- Koneksi Bluetooth ke beberapa perangkat kesehatan sekaligus (dikelola di halaman Health)
- Data yang dikumpulkan: HR, SpO2, Stress, GSR, Suhu Tubuh, Aktivitas, Gelombang Otak (EEG 5 band), Tekanan Darah
- Kalkulasi Stress Score (weighted multi-factor): `0.35*HR + 0.25*SpO2 + 0.20*GSR + 0.10*Temp + 0.10*IMU`
- Health Score 0-100 dengan warna status (Hijau/Kuning/Merah)
- Auto-save pembacaan ke Firestore setiap interval
- Session tracking (start/stop, total pembacaan, durasi)

### B. AI Chatbot (Dr. Synachat)
- Model AI: Google Gemini 2.0-flash-lite (fallback ke 2.5-flash-lite → 2.0-flash)
- Rotasi API key otomatis (rate limit handling)
- Konteks biometrik real-time disertakan dalam setiap prompt
- Text-to-Speech via ElevenLabs dengan sinkronisasi gerakan mulut avatar
- Avatar 3D dengan animasi idle + bicara (Three.js GLTF)
- Deteksi anomali proaktif — chat dibuka otomatis saat stres melonjak

### C. Intervention Engine (Mesin Intervensi Adaptif)
- Baseline personal fisiologis dipelajari dari data historis
- Threshold adaptif berdasarkan skor PHQ-9 (depresi berat → threshold lebih sensitif)
- Cooldown antar intervensi (cegah notifikasi berulang)
- Jenis intervensi yang dipicu otomatis:
  - Latihan pernapasan (Mindful)
  - Chat dengan Dr. Synachat
  - Rekomendasi musik (Moodbooster)
  - Saran pose yoga
  - Buka halaman Support (krisis)

### D. Asesmen Psikologis
| Kuesioner | Item | Rentang Skor | Kategori |
|---|---|---|---|
| PHQ-9 | 9 | 0-27 | Normal / Ringan / Sedang / Berat |
| UCLA Loneliness | 20 | 20-80 | Tidak Kesepian / Ringan / Sedang / Berat |
| PSP-5 | 5 | 5-30 | Rendah / Sedang / Tinggi |
| SEES-10 | 10 | 10-50 | Normal / Ringan / Tinggi |

### E. Analisis Gelombang Otak (EEG)
- Pembacaan dan dekoding data EEG real-time dari perangkat yang terhubung
- Analisis 5 band frekuensi: Delta (0.5-4Hz), Theta (4-8Hz), Alpha (8-13Hz), Beta (13-30Hz), Gamma (30-50Hz)
- Theta/Beta ratio → klasifikasi fokus (Relax / Focused / Drowsy)
- Analisis tidur via gelombang delta

### F. Sleep Lab
- Sleep Readiness Score berdasarkan biometrik malam (HR, HRV, data gelombang otak)
- Checklist rutinitas tidur yang dapat dikustom
- Audio relaksasi bawaan + music player
- Histori durasi tidur & skor malam sebelumnya

### G. Gamifikasi
- Sistem poin per aktivitas (jurnal, sesi monitoring, asesmen, dsb.)
- Streak harian
- Level badge berdasarkan total poin
- Leaderboard antar pengguna

### H. Lokalisasi
- Bahasa Indonesia (default) + English
- Toggle bahasa dari header
- Seluruh teks UI, label, dan pesan error diterjemahkan

---

## 6. Model Data (Firestore)

### Struktur Path
```
users/{uid}/
  ├── healthReadings/{autoId}
  ├── healthData/{autoId}
  ├── dailySummary/{YYYY-MM-DD}
  ├── analyticsSummary/{YYYY-MM-DD}
  ├── sessions/{autoId}
  ├── assessments/{autoId}
  ├── chatHistory/main
  ├── journals/{autoId}
  ├── moodLogs/{autoId}
  ├── musicTherapyLogs/{autoId}
  ├── interventions/{autoId}
  ├── safetyPlans/plan
  ├── emergencyPlans/plan
  ├── academyProgress/{courseId}
  ├── gameStats/summary
  └── heroicScores/{date}

users/{uid}           ← profil user
apiKeys/{autoId}      ← manajemen API key (admin)
system/stats          ← statistik sistem
```

### Schema Field Utama

**healthData:**
```json
{
  "hr": 72,
  "spo2": 98,
  "stress": 45,
  "gsr": 2.3,
  "bodyTemp": 36.5,
  "activity": "DIAM",
  "imuMagnitude": 0.12,
  "healthScore": 78,
  "timestamp": "Firestore Timestamp"
}
```

**assessments:**
```json
{
  "phq9": { "score": 7, "category": "Ringan", "answers": [0,1,1,0,0,2,1,1,1] },
  "ucla": { "score": 34, "category": "Sedang", "answers": [...] },
  "psp5": { "score": 12, "category": "Sedang", "answers": [2,3,2,3,2] },
  "sees10": { "score": 25, "category": "Normal", "answers": [...] },
  "timestamp": "Firestore Timestamp"
}
```

**journals:**
```json
{
  "date": "2025-05-30",
  "text": "Hari ini saya merasa...",
  "mood": 4,
  "sensorContext": { "stress": 38, "gsr": 1.8, "hr": 70, "spo2": 99 },
  "emotionTag": "Relaxed",
  "timestamp": "Firestore Timestamp"
}
```

**users/{uid}:**
```json
{
  "name": "Nama User",
  "email": "user@email.com",
  "photoURL": "https://...",
  "country": "Indonesia",
  "createdAt": "Firestore Timestamp",
  "lastLogin": "Firestore Timestamp"
}
```

---

## 7. Integrasi API Eksternal

| API | Endpoint | Fungsi | Auth |
|---|---|---|---|
| Google Gemini | `generativelanguage.googleapis.com/v1beta/models` | AI chatbot | API Key |
| ElevenLabs | `api.elevenlabs.io/v1/text-to-speech` | TTS avatar | API Key |
| Yoga API | `yoga-api-nzy4.onrender.com/v1/poses` | Database pose yoga | Public |
| Yogism API | `priyangsubanerjee.github.io/yogism/...` | Enrichment data yoga | Public |
| Firebase Auth | Firebase SDK | Login/Register/Google | OAuth |
| Firestore | Firebase SDK | Database cloud | Firebase Rules |

**Rotasi API Key Gemini:**
- Model priority: `gemini-2.0-flash-lite` → `gemini-2.5-flash-lite` → `gemini-2.0-flash`
- Jika rate limit, otomatis ganti key dari koleksi `apiKeys/` Firestore

---

## 8. Navigasi

### Bottom Navigation Bar (6 item tetap)
```
[Dashboard] [Health] [Analytics] [Profile] [Synachat] [Menu ...]
```

### Quick Menu dari Dashboard (10+ kartu)
- Assessment → Yoga
- Chat (Synachat) → Games
- Crisis Support → Academy
- Sleep Lab → Research
- Mood Booster → Journal
- Breathing (Mindful)

### Header Atas
- Kiri: Logo + Waktu real-time + Tanggal
- Kanan: Toggle Bahasa (ID/EN) + Status & Tombol Koneksi Perangkat

### Hamburger Menu (item tambahan mobile)
- HEROIC Dashboard
- Admin Panel (jika admin)
- Questionnaire / Feedback

---

## 9. Manajemen State

### State Global Web → Android Equivalent

| State Web | Variabel | Android Equivalent |
|---|---|---|
| User session | `synawatch_user` (LocalStorage) | DataStore / SharedPreferences |
| Data perangkat | `BLEConnection` singleton | BLE Service (Bound Service) |
| Multi-perangkat | `MultiDevice` manager | BLE Service dengan multiple koneksi |
| Stress baseline | `synawatch_personal_baseline` | DataStore + Room DB |
| Assessment progress | `synawatch_assessment_progress` | ViewModel SavedStateHandle |
| Yoga cache (24h) | `synawatch_yoga_poses` | Room DB + timestamp TTL |
| Sleep history | `synawatch_sleep_history` | Room DB |
| Mood log date | `synawatch_mood_date` | DataStore |
| Game stats | `synawatch_game_stats` | Room DB + Firestore sync |
| Chat history | Firestore `chatHistory/main` | Firestore live listener |

---

## 10. Rekomendasi Stack Android

### Core
```
Language:     Kotlin (primary) + Java (BLE, legacy libs)
Min SDK:      26 (Android 8.0) — required untuk Web Bluetooth parity
Target SDK:   35 (Android 15)
Build:        Gradle 8.x + AGP 8.x
```

### Architecture
```
Pattern:      MVVM + Repository Pattern
DI:           Hilt (Dagger 2)
Async:        Coroutines + Flow
Navigation:   Navigation Component + Safe Args
```

### UI
```
Layout:       XML + Material 3
Components:   Jetpack Compose (screen baru) / XML (screen lama)
Charts:       MPAndroidChart atau Vico
Animasi:      Lottie + ObjectAnimator
Avatar 3D:    SceneView (Filament-based) atau Rive
```

### Data
```
Local DB:     Room
Preferences:  DataStore (Proto)
Cloud:        Firebase Firestore + Firebase Auth
Cache:        OkHttp Cache + Room TTL
```

### Network
```
HTTP Client:  Retrofit2 + OkHttp3
JSON:         Gson atau Moshi
Image:        Coil atau Glide
```

### Bluetooth
```
BLE:          Android BLE API native
Service:      Foreground Service untuk koneksi persistent ke perangkat
```

### Audio
```
Music Player: ExoPlayer (Media3)
TTS:          ElevenLabs (Retrofit) + fallback Android TTS
```

### Lainnya
```
Firebase:     Firebase Auth, Firestore, Analytics, Crashlytics
Testing:      JUnit5 + Mockk + Espresso
Lokalisasi:   strings.xml (res/values/ + res/values-id/)
```

---

## 11. Peta Konversi Web → Android

### Screen Mapping

| Screen Web | Fragment/Activity Android | Priority |
|---|---|---|
| Dashboard | `DashboardFragment` | P1 — Utama |
| Health | `HealthMonitorFragment` | P1 — Utama |
| Analytics | `AnalyticsFragment` | P1 — Utama |
| Profile | `ProfileFragment` | P1 — Utama |
| Synachat | `SynachatFragment` | P1 — Utama |
| Assessment | `AssessmentActivity` | P1 — Utama |
| Support | `SupportFragment` | P1 — Penting |
| Mindful | `MindfulFragment` | P2 |
| Moodbooster | `MoodboosterFragment` | P2 |
| Sleep | `SleepLabFragment` | P2 |
| Journal | `JournalFragment` | P2 |
| Yoga | `YogaFragment` | P2 |
| Games | `GamesFragment` | P3 |
| Academy | `AcademyFragment` | P3 |
| HEROIC | `HeroicFragment` | P2 |
| Research | `ResearchFragment` | P3 |
| Admin | `AdminActivity` | P3 |

### Komponen Kunci

| Komponen Web | Android |
|---|---|
| `BLEConnection.js` | `BleService.kt` (Foreground Service) |
| `StressCalculator.js` | `StressCalculator.kt` |
| `InterventionEngine.js` | `InterventionEngine.kt` (WorkManager) |
| `Synachat.js` + Gemini | `GeminiApiService.kt` (Retrofit) |
| `ElevenLabs TTS` | `ElevenLabsService.kt` (Retrofit) + MediaPlayer |
| `Analytics.js` | `AnalyticsRepository.kt` + Firestore |
| `HeroicXAI.js` | `HeroicScoreCalculator.kt` |
| `I18n.js` | `strings.xml` + `strings-id.xml` |
| Chart.js (line chart) | `MPAndroidChart LineChart` |
| Chart.js (radar chart) | `MPAndroidChart RadarChart` |
| CSS Breathing Circle | `ObjectAnimator` + `ValueAnimator` |
| CSS Gauge | Custom View atau `CircularProgressIndicator` |
| Three.js Avatar | `SceneView` + `.glb` model |

### Data Flow Android

```
Perangkat Bluetooth
    ↓
BleService (Foreground Service)
    ↓ SharedFlow
SensorRepository
    ↓
HealthViewModel (coroutines + StateFlow)
    ↓
HealthMonitorFragment (observe StateFlow)
    ↓ setiap interval
FirestoreRepository.saveHealthReading()
    ↓
Firestore Cloud
```

---

## Statistik Project

| Aspek | Jumlah |
|---|---|
| Total baris JavaScript | 33.292 |
| Modul JS utama | 58 file |
| Route / Screen | 17 |
| Koleksi Firestore | 15+ |
| Track audio | 21 (15 terapi + 6 ASEAN lokal) |
| Pertanyaan asesmen | 44 total |
| Integrasi API eksternal | 5 |
| Bahasa | 2 (Indonesian, English) |

---

*Dokumen ini dibuat untuk membantu proses konversi ScentraVN Serenity dari PWA ke Android Native (Kotlin + Java). Prioritaskan screen P1 terlebih dahulu, pastikan BLE Service dan Firebase sudah berjalan sebelum mengerjakan fitur lanjutan.*
