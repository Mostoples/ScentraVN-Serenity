# SynaWatch - Firestore Database Structure

## Overview

Semua data pengguna disimpan sebagai **subcollection** di bawah document user masing-masing (`users/{uid}/`). Pendekatan ini memastikan:

- Data terpartisi per user secara otomatis
- Tidak perlu field `userId` di setiap document
- Query lebih sederhana (tanpa `.where('userId', '==', uid)`)
- Security rules cukup satu wildcard rule
- Mudah menghapus seluruh data user jika diperlukan

---

## Top-Level Collections

### `users`
Document ID: `{uid}` (Firebase Auth UID)

| Field | Type | Deskripsi |
|-------|------|-----------|
| `uid` | string | Firebase Auth UID |
| `email` | string | Email pengguna |
| `name` | string | Nama tampilan |
| `avatar` | string/null | URL foto profil |
| `role` | string | `"user"` atau `"admin"` |
| `onboardingCompleted` | boolean | Sudah selesai assessment awal |
| `initialPhq9Score` | number | Skor PHQ-9 pertama kali |
| `lastAssessmentDate` | timestamp | Tanggal assessment terakhir |
| `disabled` | boolean | Akun dinonaktifkan oleh admin |
| `createdAt` | timestamp | Waktu pembuatan akun |
| `updatedAt` | timestamp | Waktu update terakhir |

### `apiKeys` (Admin Only)
Document ID: auto-generated

| Field | Type | Deskripsi |
|-------|------|-----------|
| `name` | string | Nama API key |
| `service` | string | Layanan terkait |
| `key` | string | API key value |
| `secret` | string | API secret |
| `quota` | number | Batas penggunaan |
| `used` | number | Jumlah penggunaan |
| `status` | string | `"active"` / `"disabled"` |
| `createdAt` | timestamp | Waktu pembuatan |
| `lastUsed` | timestamp | Terakhir digunakan |
| `history` | array | Riwayat rotasi key |

### `system` (Admin Only)
Document ID: `stats`

| Field | Type | Deskripsi |
|-------|------|-----------|
| `totalUsers` | number | Jumlah pengguna |
| `totalApiCalls` | number | Total panggilan API |
| `uptime` | string | Persentase uptime |
| `lastUpdated` | timestamp | Terakhir diperbarui |

---

## User Subcollections (`users/{uid}/...`)

### `healthReadings`
Data pembacaan sensor real-time individual.
Document ID: auto-generated

| Field | Type | Deskripsi |
|-------|------|-----------|
| `hr` | number | Heart rate (BPM) |
| `spo2` | number | Saturasi oksigen (%) |
| `stress` | number | Level stres (0-100) |
| `gsr` | number | Galvanic skin response (%) |
| `heartRateStatus` | string | Status HR (normal/tinggi/rendah) |
| `spo2Status` | string | Status SpO2 |
| `stressStatus` | string | Status stres |
| `gsrStatus` | string | Status GSR |
| `readingTime` | timestamp | Waktu pembacaan (server) |
| `readingType` | string | `"realtime"` |

### `healthData`
Data kesehatan agregat dari auto-save sensor (per throttle interval).
Document ID: auto-generated

| Field | Type | Deskripsi |
|-------|------|-----------|
| `hr` | number | Heart rate |
| `spo2` | number | SpO2 |
| `bodyTemp` | number | Suhu tubuh |
| `ambientTemp` | number | Suhu lingkungan |
| `stress` | number | Level stres |
| `stressLevel` | number | Level kategori stres |
| `stressLabel` | string | Label stres (Low/Medium/High) |
| `stressValid` | boolean | Apakah kalkulasi stres valid |
| `gsr` | number | GSR persentase |
| `gsrRaw` | number | GSR raw value |
| `gsrR` | number | GSR resistance |
| `activity` | string | Aktivitas (`"DIAM"`, `"GERAK"`, dll) |
| `imuMagnitude` | number | Magnitude IMU |
| `imuState` | string | State IMU |
| `ax`, `ay`, `az` | number | Accelerometer XYZ |
| `fingerDetected` | boolean | Jari terdeteksi di sensor |
| `healthScore` | number | Skor kesehatan keseluruhan |
| `timestamp` | timestamp | Waktu (server) |
| `localTime` | string | ISO timestamp lokal |

### `dailySummary`
Ringkasan harian dari data kesehatan (agregat per hari).
Document ID: `{YYYY-MM-DD}` (tanggal)

| Field | Type | Deskripsi |
|-------|------|-----------|
| `date` | string | Tanggal (`YYYY-MM-DD`) |
| `avgHr` | number | Rata-rata heart rate |
| `avgSpo2` | number | Rata-rata SpO2 |
| `avgStress` | number | Rata-rata stres |
| `avgGsr` | number | Rata-rata GSR |
| `avgBodyTemp` | number | Rata-rata suhu tubuh |
| `avgHealthScore` | number | Rata-rata health score |
| `minHr`, `maxHr` | number | Min/max heart rate |
| `minStress`, `maxStress` | number | Min/max stres |
| `readingCount` | number | Jumlah pembacaan |
| `firstReading` | timestamp | Pembacaan pertama |
| `lastReading` | timestamp | Pembacaan terakhir |

### `analyticsSummary`
Ringkasan analitik per tanggal (custom data).
Document ID: `{YYYY-MM-DD}` (tanggal)

| Field | Type | Deskripsi |
|-------|------|-----------|
| `date` | string | Tanggal |
| `...data` | various | Data analitik custom |
| `updatedAt` | timestamp | Terakhir diperbarui |

### `sessions`
Riwayat sesi perekaman sensor.
Document ID: auto-generated

| Field | Type | Deskripsi |
|-------|------|-----------|
| `sessionId` | string | ID sesi unik |
| `startTime` | string | ISO waktu mulai |
| `endTime` | string | ISO waktu selesai |
| `durationSeconds` | number | Durasi dalam detik |
| `totalReadings` | number | Jumlah pembacaan |
| `timestamp` | timestamp | Waktu (server) |

### `recordingHistory`
Riwayat sesi perekaman (metadata).
Document ID: auto-generated

| Field | Type | Deskripsi |
|-------|------|-----------|
| `...data` | various | Data sesi perekaman |
| `createdAt` | timestamp | Waktu pembuatan |

### `assessments`
Hasil evaluasi PHQ-9 dan UCLA Loneliness Scale.
Document ID: auto-generated

| Field | Type | Deskripsi |
|-------|------|-----------|
| `date` | string | ISO tanggal assessment |
| `phq9.score` | number | Skor PHQ-9 (0-27) |
| `phq9.category` | string | Minimal/Ringan/Sedang/Sedang-Berat/Berat |
| `phq9.answers` | array | Array jawaban (0-3) per pertanyaan |
| `ucla.score` | number | Skor UCLA (20-80) |
| `ucla.category` | string | Low/Moderate/Moderately High/High |
| `ucla.answers` | array | Array jawaban (1-4) per pertanyaan |
| `timestamp` | timestamp | Waktu (server) |

### `chatHistory`
Riwayat percakapan dengan Dr. Synachat AI.
Document ID: `main` (single document)

| Field | Type | Deskripsi |
|-------|------|-----------|
| `messages` | array | Array objek pesan `{role, content, timestamp}` |
| `createdAt` | timestamp | Waktu pembuatan chat pertama |
| `updatedAt` | timestamp | Pesan terakhir ditambahkan |

### `journals`
Entri jurnal harian dengan konteks sensor.
Document ID: auto-generated

| Field | Type | Deskripsi |
|-------|------|-----------|
| `date` | string | ISO tanggal |
| `text` | string | Isi jurnal |
| `mood` | string | `sangat_baik`/`baik`/`netral`/`buruk`/`sangat_buruk` |
| `sensorContext.stress` | number | Stres saat menulis |
| `sensorContext.gsr` | number | GSR saat menulis |
| `sensorContext.hr` | number | HR saat menulis |
| `sensorContext.spo2` | number | SpO2 saat menulis |
| `sensorContext.hasSensor` | boolean | Sensor terhubung |
| `sensorContext.timestamp` | string | ISO waktu snapshot |
| `timestamp` | timestamp | Waktu (server) |

### `moodLogs`
Log pemilihan mood harian di Mood Booster.
Document ID: auto-generated

| Field | Type | Deskripsi |
|-------|------|-----------|
| `mood` | number | Level mood (1-5) |
| `sensorState.stress` | number | Stres saat log |
| `sensorState.gsr` | number | GSR saat log |
| `sensorState.hr` | number | HR saat log |
| `sensorState.hasSensor` | boolean | Sensor terhubung |
| `timestamp` | timestamp | Waktu (server) |

### `musicTherapyLogs`
Log sesi terapi musik.
Document ID: auto-generated

| Field | Type | Deskripsi |
|-------|------|-----------|
| `category` | string | `calm`/`ambient`/`upbeat` |
| `trackName` | string | Nama track yang diputar |
| `bpm` | number | BPM track |
| `sensorState` | object | Snapshot sensor (sama seperti moodLogs) |
| `timestamp` | timestamp | Waktu (server) |

### `interventions`
Log intervensi otomatis yang di-trigger oleh Intervention Engine.
Document ID: auto-generated

| Field | Type | Deskripsi |
|-------|------|-----------|
| `type` | string | `breathing`/`synachat`/`music`/`crisis` |
| `baselineState.phq9Score` | number | Skor PHQ-9 baseline |
| `baselineState.stressThreshold` | number | Threshold stres aktif |
| `baselineState.uclaScore` | number | Skor UCLA baseline |
| `timestamp` | timestamp | Waktu (server) |

### `interventionLogs`
Log intervensi (via FirebaseService).
Document ID: auto-generated

| Field | Type | Deskripsi |
|-------|------|-----------|
| `...data` | various | Data intervensi |
| `timestamp` | timestamp | Waktu (server) |

### `safetyPlans`
Rencana keselamatan pribadi pengguna.
Document ID: `plan` (single document)

| Field | Type | Deskripsi |
|-------|------|-----------|
| `warningSigns` | string | Tanda peringatan dini krisis |
| `copingStrategies` | string | Strategi koping |
| `supportPeople` | string | Orang-orang terpercaya |
| `reasonsForLiving` | string | Alasan untuk bertahan |
| `updatedAt` | timestamp | Terakhir diperbarui |

### `emergencyPlans`
Rencana darurat.
Document ID: `plan` (single document)

| Field | Type | Deskripsi |
|-------|------|-----------|
| `...data` | various | Data rencana darurat |
| `updatedAt` | timestamp | Terakhir diperbarui |

### `academyProgress`
Progress kursus Syna Academy per user.
Document ID: `{courseId}`

| Field | Type | Deskripsi |
|-------|------|-----------|
| `courseId` | string | ID kursus |
| `completedLessons` | array | Array lesson ID yang sudah selesai |
| `startedAt` | timestamp | Waktu mulai kursus |
| `updatedAt` | timestamp | Terakhir diperbarui |

---

## Diagram Struktur

```
firestore/
├── users/{uid}                          ← Profil pengguna
│   ├── healthReadings/{autoId}          ← Pembacaan sensor real-time
│   ├── healthData/{autoId}              ← Data kesehatan agregat
│   ├── dailySummary/{YYYY-MM-DD}        ← Ringkasan harian
│   ├── analyticsSummary/{YYYY-MM-DD}    ← Ringkasan analitik
│   ├── sessions/{autoId}                ← Sesi perekaman
│   ├── recordingHistory/{autoId}        ← Riwayat rekaman
│   ├── assessments/{autoId}             ← Hasil PHQ-9 & UCLA
│   ├── chatHistory/main                 ← Riwayat chat AI
│   ├── journals/{autoId}                ← Jurnal harian
│   ├── moodLogs/{autoId}               ← Log mood
│   ├── musicTherapyLogs/{autoId}        ← Log terapi musik
│   ├── interventions/{autoId}           ← Intervensi otomatis
│   ├── interventionLogs/{autoId}        ← Log intervensi
│   ├── safetyPlans/plan                 ← Rencana keselamatan
│   ├── emergencyPlans/plan              ← Rencana darurat
│   └── academyProgress/{courseId}       ← Progress kursus
│
├── apiKeys/{autoId}                     ← API keys (admin only)
├── system/stats                         ← Statistik sistem (admin only)
├── gamesProgress/{gameId}               ← Progress game
├── meditationSessions/{autoId}          ← Sesi meditasi
├── sleepRecords/{autoId}                ← Rekaman tidur
└── mindfulnessPrograms/{autoId}         ← Program mindfulness (read-only)
```

---

## Security Rules

Semua subcollection di bawah `users/{uid}/` dilindungi oleh satu wildcard rule:

```javascript
match /users/{userId} {
    allow read, write: if isOwner(userId);
    allow read, write: if isAdmin();

    match /{subcollection}/{docId} {
        allow read, write: if isOwner(userId);
        allow read: if isAdmin();
    }
}
```

- **User** hanya bisa baca/tulis data miliknya sendiri
- **Admin** bisa baca semua data user, tulis hanya ke profil user

---

## Akses di Kode

Semua akses ke subcollection user menggunakan helper:

```javascript
// Helper function
FirebaseService.userCol(userId, 'collectionName')
// Equivalent to: db.collection('users').doc(userId).collection('collectionName')

// Contoh penggunaan
await FirebaseService.userCol(uid, 'journals').add({ ... });
await FirebaseService.userCol(uid, 'dailySummary').doc('2025-01-15').get();
await FirebaseService.userCol(uid, 'chatHistory').doc('main').update({ ... });
await FirebaseService.userCol(uid, 'academyProgress').doc('course-1').set({ ... });
```
