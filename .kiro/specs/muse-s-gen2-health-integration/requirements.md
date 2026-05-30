# Requirements Document

## Introduction

Fitur ini memperluas halaman Health pada aplikasi ScentraVN Serenity untuk mendukung perangkat **Muse S Gen 2** (headband biofeedback dengan EEG 4-kanal, PPG, breathing/PPG-derived respirasi, dan IMU). Tujuannya bukan hanya mengganti koneksi BLE yang ada agar Muse S Gen 2 stabil, tetapi juga membawa SELURUH fitur yang ada di aplikasi resmi Muse (mind, heart, body, breath, sleep, soundscape, session history) ke dalam app ini, lalu mengembangkan setiap fitur tersebut menjadi versi yang lebih bermanfaat untuk audiens Serenity (yoga, mental health, akademi, journaling).

Cakupan utama:
1. Koneksi & pairing perangkat Muse S Gen 2 melalui Web Bluetooth, termasuk reconnect, error handling, dan fallback simulasi.
2. Streaming real-time untuk EEG (TP9/AF7/AF8/TP10), PPG/HR, breathing (BR), dan IMU (accelerometer + gyroscope).
3. Fitur paritas dengan Muse app: meditasi terpandu dengan biofeedback 4-pilar (Mind, Heart, Body, Breath), sleep tracking + sleep staging + sleep position, soundscape adaptif, skor stress/focus/calm, session history, streaks, points, badges, insight harian/mingguan/bulanan.
4. Ekstensi spesifik Serenity: tautan EEG focus ke Academy, score stress sebagai gating untuk rekomendasi yoga/breathing, sleep data untuk evening routine, integrasi journal, dan pengayaan SynaScore.
5. Persistensi ke Firestore mengikuti pola yang sudah ada (sleepSessions, healthData), visualisasi via Chart.js, kepatuhan offline-first PWA, privasi dan performa.

## Glossary

- **Muse_Headband**: Perangkat Muse S Gen 2 milik InteraXon yang dihubungkan via Web Bluetooth Low Energy.
- **Muse_Service**: GATT primary service Muse dengan UUID `0000fe8d-0000-1000-8000-00805f9b34fb`.
- **EEG_Channel**: Salah satu dari empat kanal elektroda Muse: `TP9`, `AF7`, `AF8`, `TP10`, masing-masing menghasilkan sampel pada 256 Hz.
- **Band_Power**: Energi spektral pada pita Delta (0.5–4 Hz), Theta (4–8 Hz), Alpha (8–13 Hz), SMR (13–15 Hz), Beta (13–30 Hz), Gamma (30–100 Hz).
- **PPG_Signal**: Sinyal photoplethysmography dari sensor optik Muse S Gen 2 yang diturunkan menjadi denyut jantung (HR) dan variabilitas denyut (HRV).
- **Breath_Rate (BR)**: Laju respirasi dalam tarikan napas per menit, diturunkan dari modulasi PPG dan/atau IMU torakal.
- **IMU_Data**: Data accelerometer 3-sumbu (`ax,ay,az`) dan gyroscope 3-sumbu (`gx,gy,gz`) dari Muse_Headband.
- **Mind_Score**: Skor 0–100 turunan dari rasio Theta/Beta dan Alpha-power yang merepresentasikan ketenangan pikiran.
- **Heart_Score**: Skor 0–100 turunan dari HR baseline dan RMSSD (HRV time-domain).
- **Body_Score**: Skor 0–100 turunan invers dari magnitude IMU (semakin diam, semakin tinggi).
- **Breath_Score**: Skor 0–100 turunan dari deviasi laju respirasi terhadap target sesi (default 6 brpm).
- **Calm_Score**: Skor agregat sesi meditasi (rata-rata berbobot Mind, Heart, Body, Breath).
- **Focus_Score**: Skor 0–100 turunan dari rasio SMR/Alpha untuk sesi fokus/learning.
- **Stress_Score**: Skor 0–100 turunan utama dari rasio Theta/Beta EEG, dipadu dengan HR dan GSR existing (jika tersedia).
- **Sleep_Stage**: Klasifikasi tahap tidur per epoch (`awake`, `light`, `deep`, `rem`).
- **Sleep_Position**: Posisi tidur user (`supine`, `prone`, `left`, `right`) yang diturunkan dari orientasi accelerometer.
- **Soundscape_Engine**: Modul audio adaptif yang mengubah parameter audio (volume, layer, tempo) berdasarkan nilai Band_Power dan Stress_Score real-time.
- **Session_Record**: Dokumen Firestore yang menyimpan satu sesi (meditasi, focus, sleep, atau breathing) lengkap dengan metrik agregat dan ringkasan time-series.
- **Health_Page**: Halaman aplikasi yang dirender dari `js/views.js` dan diinisialisasi oleh `js/health.js`.
- **Multi_Device_Manager**: Modul `js/multi-ble.js` (`window.MultiDevice`) yang mengoordinasikan koneksi Muse, BP watch, dan vitals watch.
- **Academy_Module**: Fitur pembelajaran (`js/academy.js`) yang dapat dipicu oleh Focus_Score.
- **Yoga_Module**: Fitur konten yoga (`js/yoga.js`) yang dapat direkomendasikan berdasarkan Stress_Score.
- **Journal_Module**: Fitur jurnal (`js/journal.js`) yang menerima ringkasan sesi otomatis.
- **SynaScore**: Skor kesehatan agregat existing yang akan diperkaya oleh metrik EEG/HRV baru.
- **Simulation_Mode**: Mode tanpa perangkat fisik yang membangkitkan sinyal sintetis untuk demo/QA.
- **PBT**: Property-based testing untuk modul murni (FFT, klasifikasi sleep stage, perhitungan skor).

## Requirements

### Requirement 1: Dukungan Browser dan Pra-koneksi

**User Story:** Sebagai user, saya ingin tahu apakah browser saya mendukung Muse S Gen 2 sebelum mencoba menyambung, supaya saya tidak terjebak dengan error yang membingungkan.

#### Acceptance Criteria

1. WHEN Health_Page dimuat, THE Multi_Device_Manager SHALL memanggil `navigator.bluetooth` availability check dan memperbarui flag dukungan dalam waktu kurang dari 200 ms.
2. IF `navigator.bluetooth` tidak tersedia, THEN THE Health_Page SHALL menampilkan banner berisi instruksi browser yang didukung (Chrome/Edge desktop atau Android) dan menonaktifkan tombol "Hubungkan" untuk Muse_Headband.
3. IF halaman dimuat melalui konteks non-secure (bukan HTTPS dan bukan localhost), THEN THE Health_Page SHALL menampilkan peringatan bahwa Web Bluetooth memerlukan HTTPS.
4. WHERE perangkat sebelumnya pernah dipair pada sesi browser yang sama, THE Multi_Device_Manager SHALL menampilkan tombol "Sambungkan Ulang" yang langsung mencoba `navigator.bluetooth.getDevices()` tanpa membuka chooser baru.
5. WHEN user pertama kali membuka Health_Page pada sesi browser, THE Health_Page SHALL menampilkan kartu onboarding Muse S Gen 2 dengan checklist (perangkat menyala, headband terpasang, kontak elektroda kering).

### Requirement 2: Pairing dan Koneksi Muse S Gen 2

**User Story:** Sebagai user, saya ingin menyambungkan headband Muse S Gen 2 melalui satu tombol agar siap streaming data.

#### Acceptance Criteria

1. WHEN user menekan tombol "Hubungkan" pada kartu Muse_Headband, THE Multi_Device_Manager SHALL memanggil `navigator.bluetooth.requestDevice` dengan filter `namePrefix: 'Muse'` DAN `optionalServices` berisi `Muse_Service`.
2. WHEN dialog pemilihan perangkat dibatalkan oleh user, THE Multi_Device_Manager SHALL mengembalikan status koneksi ke `disconnected` dan menampilkan toast "Pemilihan perangkat dibatalkan" tanpa menulis log error.
3. WHEN GATT server berhasil terhubung, THE Multi_Device_Manager SHALL berlangganan notifikasi pada karakteristik EEG TP9, AF7, AF8, TP10, control, accelerometer, gyroscope, PPG, dan battery dalam waktu kurang dari 5 detik.
4. WHEN seluruh karakteristik berhasil di-subscribe, THE Multi_Device_Manager SHALL mengirim sequence kontrol Muse `p21` (preset Gen 2 EEG+PPG+IMU), `s` (status), dan `d` (start streaming) pada karakteristik kontrol.
5. IF perangkat yang dipilih bukan Muse Gen 2 (terdeteksi dari respons preset atau model number), THEN THE Multi_Device_Manager SHALL menampilkan peringatan "Model bukan Muse S Gen 2; beberapa fitur (PPG, breath) mungkin tidak tersedia" dan tetap melanjutkan koneksi untuk fitur EEG.
6. IF koneksi GATT gagal karena `NotFoundError`, `SecurityError`, atau `NetworkError`, THEN THE Multi_Device_Manager SHALL menampilkan pesan kesalahan spesifik per jenis error dan mengembalikan status `error` melalui callback `onConnection`.
7. WHEN koneksi berhasil, THE Health_Page SHALL menampilkan nama perangkat, level baterai awal, dan timestamp koneksi pada kartu Muse_Headband.
8. WHEN tombol Disconnect ditekan saat status `connected`, THE Multi_Device_Manager SHALL mengirim perintah halt `h`, memutus GATT, membersihkan buffer EEG, dan menampilkan status `disconnected` dalam waktu kurang dari 2 detik.

### Requirement 3: Reconnect Otomatis dan Ketahanan Koneksi

**User Story:** Sebagai user yang bergerak saat sesi, saya ingin koneksi Muse pulih sendiri ketika sinyal sempat terputus.

#### Acceptance Criteria

1. WHEN event `gattserverdisconnected` terjadi pada Muse_Headband selama sesi aktif, THE Multi_Device_Manager SHALL mencoba reconnect maksimum 5 kali dengan exponential backoff (2 s, 4 s, 8 s, 16 s, 32 s).
2. WHILE upaya reconnect berjalan, THE Health_Page SHALL menampilkan indikator "Menyambung ulang (n/5)" dan tetap menahan data sesi dalam buffer in-memory.
3. IF semua 5 percobaan reconnect gagal, THEN THE Multi_Device_Manager SHALL menghentikan upaya, menyimpan data sesi parsial yang sudah terkumpul ke Firestore dengan flag `interrupted: true`, dan menampilkan dialog "Koneksi terputus, sesi disimpan sebagai parsial".
4. WHEN reconnect berhasil pada percobaan ke-n, THE Multi_Device_Manager SHALL melanjutkan sesi yang sama (melestarikan `sessionStartTime` dan akumulasi metrik) dan mereset counter percobaan ke 0.
5. WHILE Muse_Headband terhubung, IF tidak ada paket EEG dari kanal AF7 selama lebih dari 10 detik, THEN THE Multi_Device_Manager SHALL menandai status `stalled` dan memicu prosedur reconnect yang sama.

### Requirement 4: Streaming dan Decoding EEG

**User Story:** Sebagai user, saya ingin grafik EEG saya bergerak halus dan mencerminkan kondisi otak saya saat ini.

#### Acceptance Criteria

1. WHEN paket EEG 12-byte diterima dari salah satu EEG_Channel, THE Multi_Device_Manager SHALL men-decode 5 sampel 10-bit menjadi nilai mikrovolt menggunakan skala Muse ADC (referensi 1.2 V, range ±732 µV) dan menambahkannya ke buffer rolling kanal tersebut.
2. THE Multi_Device_Manager SHALL mempertahankan buffer rolling sebesar minimal 2 detik (512 sampel pada 256 Hz) per EEG_Channel.
3. WHEN buffer AF7 mencapai 256 sampel, THE Multi_Device_Manager SHALL menghitung Band_Power untuk Delta, Theta, Alpha, SMR, Beta, dan Gamma menggunakan FFT N=256 dengan Hanning window.
4. THE Multi_Device_Manager SHALL memperbarui Band_Power dan emit event `eeg` minimal 4 kali per detik dan maksimum 10 kali per detik agar UI tidak berhenti.
5. WHEN sebuah kanal melaporkan kontak elektroda buruk (variansi sinyal di luar rentang ±1500 µV selama > 1 detik), THE Multi_Device_Manager SHALL menandai kanal tersebut sebagai `poor_contact` dalam payload event `eeg`.
6. WHILE minimal 3 dari 4 EEG_Channel berstatus `good_contact`, THE Health_Page SHALL menampilkan ikon kontak hijau; selain itu, ikon kontak SHALL berwarna merah dengan label "Sesuaikan headband".
7. THE Multi_Device_Manager SHALL menerapkan filter band-pass 0.5–45 Hz dan notch 50/60 Hz pada sampel EEG sebelum perhitungan Band_Power.

### Requirement 5: PPG, Heart Rate, dan HRV

**User Story:** Sebagai user, saya ingin melihat denyut jantung dan HRV saya langsung dari Muse tanpa smartwatch terpisah.

#### Acceptance Criteria

1. WHEN paket PPG diterima dari Muse_Headband, THE Multi_Device_Manager SHALL mendeteksi puncak dengan algoritma Pan-Tompkins yang disederhanakan dan menghitung interval beat-to-beat dalam milidetik.
2. THE Multi_Device_Manager SHALL menghitung HR (bpm) sebagai rata-rata terbalik atas 8 interval terakhir, diperbarui setiap interval baru.
3. THE Multi_Device_Manager SHALL menghitung RMSSD HRV dari minimum 30 interval terakhir, diperbarui setiap 5 detik.
4. THE Health_Page SHALL menampilkan HR dan HRV dengan satu desimal untuk HRV dan integer untuk HR.
5. IF Muse_Headband tidak menyediakan karakteristik PPG (misal model lama), THEN THE Health_Page SHALL menyembunyikan kartu Heart Muse dan tetap menampilkan kartu HR dari vitals watch jika terhubung.
6. WHEN nilai HR berada di luar rentang fisiologis 30–220 bpm selama lebih dari 3 sampel berturut, THE Multi_Device_Manager SHALL membuang sampel tersebut dan menandai status PPG sebagai `unstable`.

### Requirement 6: Deteksi Laju Respirasi (Breath Rate)

**User Story:** Sebagai user yang mengikuti latihan napas, saya ingin tahu apakah napas saya sudah selaras dengan pacer.

#### Acceptance Criteria

1. WHEN data PPG dan IMU tersedia, THE Multi_Device_Manager SHALL menurunkan Breath_Rate dengan menerapkan band-pass 0.1–0.5 Hz pada sinyal PPG envelope dan/atau accelerometer Z-axis selama jendela 30 detik.
2. THE Multi_Device_Manager SHALL emit nilai Breath_Rate dalam brpm minimal sekali per 5 detik dengan rentang valid 4–30 brpm.
3. WHEN sesi Breathwork aktif, THE Health_Page SHALL menampilkan visual pacer (lingkaran membesar/mengecil) yang sinkron dengan target laju (default 6 brpm) dan menampilkan deviasi user terhadap target.
4. IF Breath_Rate keluar dari rentang 4–30 brpm selama lebih dari 60 detik, THEN THE Multi_Device_Manager SHALL menandai sinyal sebagai `low_quality` dan menonaktifkan Breath_Score sampai sinyal pulih.
5. WHEN sesi breath berakhir, THE Health_Page SHALL menampilkan ringkasan rata-rata BR, persentase waktu di dalam ±1 brpm dari target, dan grafik time-series BR.

### Requirement 7: IMU, Stillness, dan Sleep Position

**User Story:** Sebagai user, saya ingin Muse mengetahui apakah saya benar-benar diam saat meditasi atau sedang berbaring miring saat tidur.

#### Acceptance Criteria

1. WHEN paket accelerometer atau gyroscope diterima, THE Multi_Device_Manager SHALL menyimpan sampel IMU_Data dengan timestamp pada buffer berdurasi minimal 60 detik.
2. THE Multi_Device_Manager SHALL menghitung magnitude akselerasi `sqrt(ax^2+ay^2+az^2)` dan emit nilai stillness setiap 1 detik, di mana stillness = 100 saat magnitude < 0.05 g dan 0 saat magnitude > 0.3 g (skala linear di antaranya).
3. WHILE sesi sleep aktif, THE Multi_Device_Manager SHALL mengklasifikasikan Sleep_Position setiap 30 detik berdasarkan vektor gravitasi: `supine` (az ≈ +1g), `prone` (az ≈ -1g), `left` (ay ≈ +1g), `right` (ay ≈ -1g) dengan toleransi 0.3 g.
4. WHERE Sleep_Position berubah selama sesi sleep, THE Multi_Device_Manager SHALL mencatat event `position_change` dengan timestamp dan posisi baru.
5. WHEN sesi sleep berakhir, THE Health_Page SHALL menampilkan distribusi Sleep_Position (persen waktu) dan jumlah perubahan posisi pada ringkasan.

### Requirement 8: Skor Mind, Heart, Body, Breath, dan Calm

**User Story:** Sebagai user, saya ingin satu skor sederhana yang menyatakan seberapa tenang sesi meditasi saya.

#### Acceptance Criteria

1. THE Multi_Device_Manager SHALL menghitung Mind_Score sebagai `clamp(0,100, 100 - 7 * (theta/beta - 1))` setiap perubahan Band_Power, dengan rasio Theta/Beta diambil dari kanal AF7+AF8 yang dirata-rata.
2. THE Multi_Device_Manager SHALL menghitung Heart_Score sebagai fungsi linear dari RMSSD relatif terhadap baseline 14 hari user (skor 100 saat RMSSD ≥ baseline + 1 SD, skor 50 saat baseline, skor 0 saat ≤ baseline - 1 SD).
3. THE Multi_Device_Manager SHALL menghitung Body_Score sebagai 100 dikurangi 100 × magnitude_g_dinormalisasi, dengan magnitude > 0.3 g dipotong ke 0.
4. THE Multi_Device_Manager SHALL menghitung Breath_Score sebagai `clamp(0,100, 100 - 12 × |BR - target_BR|)` dengan target_BR sesi default 6 brpm.
5. WHEN sesi meditasi aktif, THE Multi_Device_Manager SHALL menghitung Calm_Score setiap detik sebagai `0.4*Mind + 0.2*Heart + 0.2*Body + 0.2*Breath` dan menyimpan nilai puncak, rata-rata, serta grafik time-series.
6. WHERE user belum memiliki baseline 14 hari, THE Multi_Device_Manager SHALL menggunakan baseline default (RMSSD 35 ms) dan menandai Heart_Score sebagai `provisional`.
7. THE Health_Page SHALL menampilkan keempat skor (Mind, Heart, Body, Breath) dalam empat ring gauge yang diperbarui minimum 1 Hz.

### Requirement 9: Sesi Meditasi Terpandu dengan Biofeedback

**User Story:** Sebagai user, saya ingin sesi meditasi yang memberi feedback audio sesuai keadaan otak saya.

#### Acceptance Criteria

1. WHEN user memilih program meditasi (preset 3, 5, 10, atau 20 menit) dan menekan "Mulai", THE Health_Page SHALL membuat Session_Record bertipe `meditation` dengan `targetDuration`, `programId`, dan `startTime`.
2. WHILE sesi meditasi berjalan, THE Soundscape_Engine SHALL memutar layer audio dasar (rain, ocean, atau forest) yang volumenya inversely proportional terhadap Mind_Score, sehingga semakin tenang user semakin lembut suara latar.
3. WHEN Mind_Score ≥ 80 selama lebih dari 15 detik berturut, THE Soundscape_Engine SHALL memainkan reward cue (bird chirp atau bell) tanpa mengganggu suara dasar.
4. WHILE sesi meditasi berjalan, THE Health_Page SHALL menampilkan timer mundur, ring 4 skor, dan grafik mini Mind_Score 60 detik terakhir.
5. WHEN sesi berakhir (timer mencapai 0 atau user menekan "Selesai"), THE Health_Page SHALL menyimpan Session_Record dengan rata-rata, puncak, distribusi waktu di setiap kategori (calm/neutral/active), dan menambah `meditationMinutes` user di Firestore.
6. IF user menekan "Hentikan" sebelum 60 detik, THEN THE Health_Page SHALL membuang Session_Record (tidak disimpan ke Firestore) dan menampilkan toast "Sesi terlalu pendek, tidak dicatat".
7. WHERE Muse_Headband tidak terhubung saat user menekan "Mulai", THE Health_Page SHALL menampilkan opsi "Mode Tanpa Sensor" yang menjalankan timer dan audio tanpa biofeedback dan menyimpan sesi dengan flag `sensorless: true`.

### Requirement 10: Sesi Fokus dan Integrasi Academy

**User Story:** Sebagai pelajar, saya ingin tahu kapan otak saya sedang fokus agar bisa belajar di waktu emas.

#### Acceptance Criteria

1. WHEN user memulai "Sesi Fokus" dari Health_Page, THE Multi_Device_Manager SHALL menghitung Focus_Score sebagai rasio SMR/Alpha yang dipetakan ke skala 0–100 (rasio ≥ 1.5 → skor 100, rasio ≤ 0.5 → skor 0, linear di antaranya).
2. WHILE sesi fokus berjalan, THE Health_Page SHALL menampilkan timeline Focus_Score 5 menit terakhir dan persentase waktu di kategori `good` (skor ≥ 70).
3. WHEN Focus_Score turun di bawah 40 selama lebih dari 90 detik, THE Health_Page SHALL menampilkan saran intervensi (peregangan 1 menit, napas kotak 4-4-4-4, atau ganti materi) tanpa memutus sesi.
4. WHEN sesi fokus berakhir, THE Health_Page SHALL membuat link cepat ke materi Academy_Module yang direkomendasikan berdasarkan kategori user (mis. teknik Pomodoro jika persen waktu fokus < 50%).
5. WHERE Academy_Module sedang aktif memutar materi pembelajaran, THE Multi_Device_Manager SHALL men-stream Focus_Score ke Academy_Module untuk mencatat porsi materi yang dikonsumsi dalam keadaan fokus tinggi.

### Requirement 11: Sleep Tracking dengan Sleep Staging Berbasis EEG+IMU

**User Story:** Sebagai user, saya ingin laporan tidur yang menunjukkan tahapan tidur saya, bukan hanya jam tidur.

#### Acceptance Criteria

1. WHEN user memilih "Mulai Tidur" pada Health_Page dengan Muse_Headband terhubung, THE Multi_Device_Manager SHALL membuat Session_Record bertipe `sleep` dan mulai menyimpan epoch 30 detik berisi rata-rata Band_Power, magnitude IMU, HR, dan Sleep_Position.
2. WHEN epoch 30 detik selesai, THE Multi_Device_Manager SHALL mengklasifikasikan Sleep_Stage sebagai berikut:
   - `awake` IF magnitude IMU > 0.15 g ATAU Beta_relative > 30%.
   - `rem` IF magnitude IMU < 0.05 g DAN HR > 1.05 × HR_baseline DAN Theta_relative > 25%.
   - `deep` IF magnitude IMU < 0.05 g DAN Delta_relative > 40% DAN HR < HR_baseline.
   - `light` untuk semua kasus lainnya saat magnitude IMU < 0.15 g.
3. THE Multi_Device_Manager SHALL mempertahankan kompatibilitas dengan SleepTracker existing dengan memetakan Sleep_Stage Muse ke skema `{deep, light, rem, awake}` yang sama.
4. WHEN sesi sleep berakhir, THE Health_Page SHALL menampilkan hipnogram (timeline tahap tidur), durasi total per tahap, sleep efficiency, jumlah arousal, distribusi Sleep_Position, dan Sleep_Quality_Score 0–100.
5. THE Multi_Device_Manager SHALL menggunakan baseline HR user (rata-rata HR resting 7 hari terakhir) untuk klasifikasi REM; jika tidak tersedia, default 55 bpm DIGUNAKAN dan stage REM ditandai `provisional`.
6. WHERE Muse_Headband terlepas selama sesi sleep dan tidak dapat reconnect, THE Multi_Device_Manager SHALL melanjutkan tracking dalam mode IMU-only (smartphone) dan menandai porsi sesi sebagai `eeg_lost`.
7. WHEN sesi sleep selesai, THE Health_Page SHALL membuat rekomendasi "Evening Routine" untuk malam berikutnya berdasarkan kekurangan terbesar (mis. "Tidur lebih awal" jika total < 6 jam, "Hindari kafein sore" jika REM < 15%).

### Requirement 12: Soundscape Adaptif

**User Story:** Sebagai user, saya ingin musik latar berubah mengikuti keadaan otak saya.

#### Acceptance Criteria

1. THE Soundscape_Engine SHALL menyediakan minimal 4 preset (Rain, Ocean, Forest, Tibetan Bowls), masing-masing terdiri atas layer drone + ambient + accent.
2. WHEN Mind_Score atau Calm_Score berubah, THE Soundscape_Engine SHALL menyesuaikan crossfade antara layer "active" (saat skor < 50) dan layer "calm" (saat skor > 80) dalam rentang 1 detik.
3. WHILE sesi meditasi berjalan, THE Soundscape_Engine SHALL menjaga total RMS audio dalam ±3 dB dari target user untuk menghindari kejutan volume.
4. IF browser memblokir autoplay audio, THEN THE Health_Page SHALL menampilkan tombol "Aktifkan Suara" yang melakukan unlock AudioContext melalui interaksi user.
5. WHEN sesi berakhir atau user menekan stop, THE Soundscape_Engine SHALL melakukan fade-out 2 detik sebelum menghentikan playback.

### Requirement 13: Stress Score Terintegrasi dan Gating Yoga

**User Story:** Sebagai user yang stres, saya ingin app menyarankan yoga atau napas yang tepat untuk meredakan.

#### Acceptance Criteria

1. THE Multi_Device_Manager SHALL menghitung Stress_Score gabungan dengan bobot 60% EEG (Theta/Beta), 25% HR (relatif baseline), dan 15% GSR existing (jika tersedia), menghasilkan skala 0–100 di mana 100 = sangat stres.
2. WHEN Stress_Score ≥ 70 selama lebih dari 5 menit, THE Health_Page SHALL menampilkan kartu rekomendasi Yoga_Module dengan filter "low intensity, breathing, restorative".
3. WHEN Stress_Score ≤ 30 selama lebih dari 10 menit, THE Health_Page SHALL menampilkan rekomendasi Yoga_Module bertema "vinyasa" atau "power" untuk memanfaatkan energi user.
4. WHERE user memilih sesi yoga dari rekomendasi, THE Yoga_Module SHALL menerima konteks `entryStressScore` agar dapat membandingkan dengan `exitStressScore` setelah sesi.
5. WHEN sesi yoga berakhir, THE Health_Page SHALL menampilkan delta Stress_Score (entry - exit) sebagai bukti efektivitas, dengan label hijau jika delta > 10.
6. THE Multi_Device_Manager SHALL menyimpan Stress_Score time-series dalam buffer 30 menit terakhir untuk grafik harian.

### Requirement 14: Riwayat Sesi, Streak, dan Badge

**User Story:** Sebagai user, saya ingin melihat tren sesi saya dan dihargai atas konsistensi.

#### Acceptance Criteria

1. WHEN sebuah Session_Record (meditation, focus, sleep, atau breath) selesai dan dianggap valid, THE Multi_Device_Manager SHALL menyimpan dokumen ke koleksi Firestore yang sesuai (`meditationSessions`, `focusSessions`, `sleepSessions`, `breathSessions`) di bawah `userId`.
2. THE Health_Page SHALL menampilkan tab "Riwayat" yang melisting 30 sesi terbaru dengan filter per tipe sesi dan rentang tanggal.
3. THE Health_Page SHALL menghitung Streak harian (jumlah hari berturut dengan minimal 1 sesi valid) dan menampilkannya pada header.
4. WHEN user mencapai milestone Streak (3, 7, 14, 30, 100 hari) atau total menit kumulatif (60, 300, 1000, 3000), THE Health_Page SHALL memberikan Badge baru dan menampilkan animasi konfirmasi sekali.
5. THE Health_Page SHALL menambahkan Points pada profil user: 1 poin per menit meditasi, 2 poin per 10 menit fokus, 3 poin per jam tidur dengan Sleep_Quality_Score ≥ 70, dan 5 poin per badge baru.
6. IF perhitungan Streak/Badge gagal karena data Firestore offline, THEN THE Health_Page SHALL menggunakan cache lokal terakhir dan menandai nilai sebagai `cached`.

### Requirement 15: Insight Harian, Mingguan, dan Bulanan

**User Story:** Sebagai user, saya ingin ringkasan otomatis yang menunjukkan tren mingguan saya.

#### Acceptance Criteria

1. WHEN Health_Page tab "Insight" dibuka, THE Health_Page SHALL menampilkan kartu "Hari Ini" berisi total menit per fitur, rata-rata Calm_Score, dan rata-rata Sleep_Quality_Score.
2. THE Health_Page SHALL menampilkan grafik mingguan Chart.js untuk Calm_Score, Focus_Score, Stress_Score, dan total menit dalam 7 hari terakhir.
3. THE Health_Page SHALL menampilkan kartu bulanan dengan heatmap konsistensi (1 sel per hari, intensitas berdasarkan total menit).
4. WHEN data mingguan menunjukkan penurunan Calm_Score > 15% dibanding minggu sebelumnya, THE Health_Page SHALL menampilkan insight kontekstual berbasis aturan (mis. "Stres meningkat — coba meditasi 5 menit pagi").
5. THE Health_Page SHALL menyertakan tombol "Tulis di Jurnal" pada setiap kartu insight yang membuat draft Journal_Module dengan ringkasan otomatis.

### Requirement 16: Persistensi Firestore dan Skema Data

**User Story:** Sebagai user, saya ingin data saya aman tersimpan dan bisa diakses dari perangkat lain.

#### Acceptance Criteria

1. THE Multi_Device_Manager SHALL menyimpan setiap Session_Record dengan field minimum `userId`, `type`, `startTime`, `endTime`, `duration`, `device` ('muse-s-gen2'), `metricsSummary`, dan `createdAt: serverTimestamp`.
2. THE Multi_Device_Manager SHALL menulis sample EEG agregat (rata-rata Band_Power per epoch 30 detik) ke sub-collection `epochs/` Session_Record agar grafik retrospektif tersedia tanpa menyimpan raw EEG.
3. THE Multi_Device_Manager SHALL TIDAK menyimpan sampel mentah EEG (256 Hz) ke Firestore demi menjaga ukuran dokumen di bawah 1 MB; sampel mentah hanya dipertahankan dalam memori selama sesi.
4. WHEN sesi disimpan, THE Multi_Device_Manager SHALL juga menulis dokumen ringkas ke `users/{uid}/dailyAggregates/{YYYY-MM-DD}` untuk akses cepat tab Insight.
5. THE Multi_Device_Manager SHALL menggunakan `firebase.firestore.FieldValue.serverTimestamp()` untuk seluruh field timestamp agar konsisten dengan pola yang sudah ada di codebase.
6. THE Multi_Device_Manager SHALL menyertakan field versi skema (`schemaVersion: 1`) pada setiap dokumen baru agar migrasi mendatang dapat dilakukan.

### Requirement 17: Mode Offline dan PWA

**User Story:** Sebagai user, saya ingin tetap bisa bermeditasi meski koneksi internet putus dan datanya tersinkron nanti.

#### Acceptance Criteria

1. WHEN user kehilangan koneksi internet selama sesi aktif, THE Health_Page SHALL melanjutkan akuisisi data Muse_Headband dan menyimpan Session_Record ke IndexedDB dengan flag `pendingSync: true`.
2. WHEN koneksi internet pulih, THE Multi_Device_Manager SHALL melakukan flush Session_Record `pendingSync` ke Firestore dengan urutan kronologis dan menghapus entry yang sukses tersimpan.
3. THE Soundscape_Engine SHALL melakukan precache aset audio preset di Service Worker pada kunjungan pertama user agar sesi tetap berjalan offline.
4. IF flush ke Firestore gagal lebih dari 3 kali untuk dokumen yang sama, THEN THE Health_Page SHALL menampilkan banner "Beberapa sesi belum tersinkron" dengan tombol retry manual.

### Requirement 18: Privasi dan Kontrol Data

**User Story:** Sebagai user, saya ingin tahu data otak saya dipakai untuk apa dan bisa menghapusnya kapan saja.

#### Acceptance Criteria

1. WHEN user pertama kali menyambungkan Muse_Headband, THE Health_Page SHALL menampilkan dialog persetujuan yang menjelaskan jenis data (EEG agregat, HR, IMU, sleep) dan tujuan penyimpanan, dengan tombol "Setuju" dan "Batal".
2. IF user menekan "Batal" pada dialog persetujuan, THEN THE Multi_Device_Manager SHALL membatalkan koneksi dan tidak menyimpan data apa pun.
3. THE Health_Page SHALL menyediakan menu "Privasi & Data" yang memuat opsi: ekspor seluruh sesi (CSV/JSON), hapus sesi tertentu, dan hapus seluruh data Muse.
4. WHEN user memilih "Hapus seluruh data Muse", THE Multi_Device_Manager SHALL menghapus seluruh dokumen pada koleksi sesi terkait, dailyAggregates, dan baseline user dalam transaksi atomic dan menampilkan ringkasan jumlah dokumen yang terhapus.
5. THE Multi_Device_Manager SHALL TIDAK mengirim data EEG/PPG/IMU ke endpoint pihak ketiga di luar Firebase project user.

### Requirement 19: Performa Real-time

**User Story:** Sebagai user, saya ingin UI tetap mulus saat banyak metrik dirender bersamaan.

#### Acceptance Criteria

1. THE Health_Page SHALL menjaga frame rate render Chart.js minimal 30 fps pada perangkat target (CPU kelas Snapdragon 750G atau setara) saat seluruh kartu live aktif.
2. THE Multi_Device_Manager SHALL menjalankan FFT dan klasifikasi sleep di Web Worker terpisah agar main thread tetap responsif.
3. THE Multi_Device_Manager SHALL membatasi event update UI per metrik maksimum 10 Hz menggunakan throttling.
4. WHEN penggunaan memori buffer EEG melebihi 50 MB, THE Multi_Device_Manager SHALL memangkas buffer ke ukuran target (10 detik per kanal) dan mencatat warning di console.
5. THE Health_Page SHALL menggunakan `requestAnimationFrame` untuk pembaruan gauge skor agar selaras dengan refresh layar.

### Requirement 20: Mode Simulasi untuk Demo dan QA

**User Story:** Sebagai QA, saya ingin menguji semua fitur Muse tanpa harus selalu memakai perangkat fisik.

#### Acceptance Criteria

1. WHERE flag URL `?simulate=muse` aktif atau user menekan "Mode Demo" pada kartu Muse_Headband, THE Multi_Device_Manager SHALL menjalankan Simulation_Mode yang menghasilkan Band_Power, HR, BR, dan IMU sintetis yang realistis.
2. WHILE Simulation_Mode aktif, THE Health_Page SHALL menampilkan badge "DEMO" pada seluruh kartu Muse agar user tidak salah mengira sebagai data nyata.
3. THE Multi_Device_Manager SHALL menyediakan minimal 3 skenario simulasi: `calm`, `stressed`, `focused`, masing-masing dengan distribusi Band_Power dan HR yang berbeda.
4. WHEN Simulation_Mode dihentikan, THE Multi_Device_Manager SHALL membersihkan interval simulasi dan mereset metrik ke null agar tidak bertabrakan dengan sesi sungguhan berikutnya.
5. WHILE Simulation_Mode aktif, THE Multi_Device_Manager SHALL TIDAK menulis data simulasi ke Firestore kecuali user menekan tombol khusus "Simpan sebagai uji coba" yang menambahkan flag `simulated: true`.

### Requirement 21: Aksesibilitas dan Lokalisasi

**User Story:** Sebagai user dengan kebutuhan aksesibilitas, saya ingin bisa menggunakan fitur Muse dengan screen reader dan bahasa Indonesia.

#### Acceptance Criteria

1. THE Health_Page SHALL menyediakan label `aria-label` pada semua tombol koneksi, ring gauge, dan grafik utama.
2. WHEN user menekan Tab, THE Health_Page SHALL menavigasi kontrol dalam urutan logis: status koneksi → tombol mulai sesi → opsi durasi → tombol stop.
3. THE Health_Page SHALL menyediakan teks alternatif untuk hipnogram (mis. "Tidur 7 jam, deep 1.2 jam, rem 1.5 jam, light 4 jam, awake 0.3 jam") yang dibaca oleh screen reader.
4. THE Health_Page SHALL menggunakan modul i18n existing (`js/i18n.js`) sehingga seluruh string baru tersedia dalam bahasa Indonesia (default), Inggris, dan Vietnam.
5. WHERE user mengaktifkan mode high-contrast OS, THE Health_Page SHALL menerapkan palet warna alternatif untuk gauge dan grafik agar tetap memenuhi rasio kontras WCAG AA 4.5:1.

### Requirement 22: Keamanan dan Validasi Input

**User Story:** Sebagai pengembang, saya ingin parsing data BLE aman dari input yang malformed.

#### Acceptance Criteria

1. WHEN paket BLE diterima dengan panjang berbeda dari yang diharapkan untuk karakteristiknya, THE Multi_Device_Manager SHALL membuang paket tersebut dan menambah counter `malformedPackets` tanpa memunculkan exception ke main loop.
2. THE Multi_Device_Manager SHALL melakukan validasi rentang pada seluruh nilai turunan (HR 30–220, BR 4–30, magnitude 0–10 g, Band_Power ≥ 0) dan menampilkan toast warning sekali per sesi jika lebih dari 5% paket invalid.
3. THE Multi_Device_Manager SHALL menggunakan parameterized writes ke Firestore (tanpa string concatenation pada path) untuk menghindari injection.
4. THE Health_Page SHALL melakukan sanitasi konten user-generated (catatan jurnal, label sesi) dengan textContent atau library sanitasi sebelum render ulang.

### Requirement 23: Parser dan Serializer Data Sesi

**User Story:** Sebagai user, saya ingin bisa mengekspor sesi saya dan mengimpornya kembali atau membagikannya.

#### Acceptance Criteria

1. THE Multi_Device_Manager SHALL menyediakan Session_Serializer yang mengubah Session_Record beserta epochs menjadi dokumen JSON valid sesuai skema yang didefinisikan.
2. THE Multi_Device_Manager SHALL menyediakan Session_Parser yang membaca JSON tersebut kembali menjadi Session_Record yang bisa dirender ulang oleh Health_Page.
3. FOR ALL Session_Record valid, parsing kemudian printing kemudian parsing SHALL menghasilkan objek yang ekuivalen secara struktural (round-trip property).
4. WHEN Session_Parser menemukan field yang tidak dikenal atau tipe yang salah, THE Session_Parser SHALL mengembalikan error deskriptif yang menyebutkan field dan ekspektasi tipenya.
5. THE Multi_Device_Manager SHALL menyediakan ekspor CSV dengan kolom standar (timestamp, sessionId, type, metric, value) yang juga round-trippable melalui CSV_Parser internal.
