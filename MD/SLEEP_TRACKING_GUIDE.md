# 😴 Sleep Tracking Guide - IMU-Based Sleep Quality

## ✅ Fitur Baru: Sleep Quality dari Data IMU

Sleep Lab sekarang bisa **track kualitas tidur sepanjang malam** berdasarkan **data gerakan (IMU)** dari perangkat BLE!

---

## 🎯 Konsep: Gerakan = Kualitas Tidur

### Logic:
- **Banyak gerakan** = Kualitas tidur **buruk** ❌
- **Sedikit gerakan** = Kualitas tidur **baik** ✅

### Data Source:
- **Accelerometer** (ax, ay, az) dari BLE device
- **IMU Magnitude** = √(ax² + ay² + az²)
- **Heart Rate** = Supporting data untuk sleep stages

---

## 🌙 Sleep Stages Detection

Berdasarkan gerakan dan heart rate, sistem mendeteksi 4 tahap tidur:

### 1️⃣ **Deep Sleep** (Tidur Nyenyak) 💤
```
Movement: < 0.5 m/s² (very low)
Heart Rate: < 65 bpm (low)
Color: Green
Quality: BEST
```
- Hampir tidak ada gerakan
- Heart rate rendah dan stabil
- Tidur paling berkualitas

### 2️⃣ **Light Sleep** (Tidur Ringan) 😴
```
Movement: < 0.5 m/s² (low)
Heart Rate: 65-80 bpm (moderate)
Color: Blue
Quality: GOOD
```
- Gerakan minimal
- Heart rate moderat
- Tidur normal

### 3️⃣ **REM Sleep** (Rapid Eye Movement) 🎭
```
Movement: 0.5-1.5 m/s² (moderate)
Heart Rate: Variable
Color: Orange
Quality: FAIR
```
- Gerakan sedang
- Fase mimpi
- Penting untuk memori

### 4️⃣ **Awake** (Terbangun) 👀
```
Movement: > 1.5 m/s² (high)
Heart Rate: > 80 bpm (high)
Color: Red
Quality: BAD
```
- Gerakan banyak
- Heart rate tinggi
- Mengurangi kualitas tidur

---

## 🎬 Cara Menggunakan

### 1️⃣ **Persiapan (Sebelum Tidur)**
```
1. Pastikan BLE device terpasang dan connected ✅
2. Buka Sleep Lab page
3. (Optional) Dengarkan relaxation audio
4. (Optional) Complete bedtime routine checklist
```

### 2️⃣ **Mulai Tracking**
```
1. Tap "Mulai Sleep Tracking" 🟢
2. Konfirmasi BLE connected
3. Status: "🟢 Tracking Active"
4. Tidur dengan tenang 😴
```

**Yang Terjadi:**
- ✅ Sistem mulai record IMU data tiap 5 detik
- ✅ Setiap gerakan dicatat
- ✅ Sleep stage di-detect otomatis
- ✅ Heart rate di-monitor

### 3️⃣ **Sepanjang Malam**
```
BLE Device → IMU Data → SleepTracker
                ↓
         Analyze Movement
                ↓
      Determine Sleep Stage
                ↓
           Record Data
```

**Data yang Direkam:**
- Timestamp
- IMU magnitude
- Movement level (none/low/high)
- Sleep stage (deep/light/rem/awake)
- Heart rate

### 4️⃣ **Setelah Bangun**
```
1. Tap "Stop Tracking & Lihat Hasil" 🛑
2. Sistem analyze semua data
3. Calculate sleep quality score
4. Show summary modal
5. Save ke Firestore
```

---

## 📊 Sleep Quality Score (0-100)

Score dihitung dari 4 faktor:

### 1️⃣ **Deep Sleep %** (0-40 points)
```
Formula: (Deep Sleep Minutes / Total Minutes) × 100
Target: 30% deep sleep = max score (40 points)

Example:
- 8 jam tidur = 480 menit
- Deep sleep = 144 menit (30%)
- Score = 40 points ✅
```

### 2️⃣ **Sleep Efficiency** (0-30 points)
```
Formula: (Time Asleep / Total Time) × 100
Time Asleep = Deep + Light + REM (exclude Awake)

Example:
- Total time: 480 menit
- Awake: 30 menit
- Sleep time: 450 menit
- Efficiency: 93.75%
- Score: 28 points ✅
```

### 3️⃣ **Movement Score** (0-20 points)
```
Formula: 20 - (Movements per Hour × 2)
Lower movement = Higher score

Example:
- Total movements: 60
- Duration: 8 hours
- Movements/hour: 7.5
- Score: 20 - (7.5 × 2) = 5 points
```

### 4️⃣ **Awake Time Penalty** (0-10 points)
```
Formula: 10 - (Awake % / 5)
Less awake = Higher score

Example:
- Awake: 30 menit
- Total: 480 menit
- Awake %: 6.25%
- Score: 10 - (6.25 / 5) = 8.75 points
```

### **Total Score:**
```
Deep (40) + Efficiency (28) + Movement (5) + Awake (8.75)
= 81.75 → 82/100 ✅ EXCELLENT!
```

---

## 🎨 Sleep Quality Categories

| Score | Category | Color | Icon | Meaning |
|-------|----------|-------|------|---------|
| 80-100 | Excellent | 🟢 Green | ⭐ Star | Perfect sleep! |
| 70-79 | Baik | 🔵 Blue | 😊 Smile | Good sleep |
| 50-69 | Cukup | 🟡 Yellow | 😐 Meh | Fair sleep |
| 0-49 | Buruk | 🔴 Red | 😞 Frown | Poor sleep |

---

## 📱 Sleep Summary Modal

Setelah stop tracking, muncul modal dengan info:

```
┌────────────────────────────────┐
│        ⭐ SLEEP QUALITY         │
│           82/100                │
│         Excellent 🟢            │
├────────────────────────────────┤
│     Total Durasi Tidur         │
│         8j 12m                 │
├────────────────────────────────┤
│  Deep Sleep      Light Sleep   │
│   144m 🟢         180m 🔵      │
│                                │
│  REM Sleep       Awake         │
│   126m 🟡         30m 🔴       │
├────────────────────────────────┤
│  Total Movements: 60           │
│  Avg Heart Rate: 62 bpm        │
└────────────────────────────────┘
```

---

## 💾 Data Storage (Firestore)

Setiap sleep session disimpan ke Firestore:

```javascript
{
  userId: "user123",
  startTime: Timestamp(2025-01-15 22:00:00),
  endTime: Timestamp(2025-01-16 06:12:00),
  duration: 492, // minutes
  sleepQuality: 82,
  totalMovements: 60,
  stages: {
    deep: 144,   // minutes
    light: 180,
    rem: 126,
    awake: 30
  },
  averageHR: 62,
  lowestHR: 58,
  movements: [
    { hour: 22, movements: 5, avgIMU: 0.42 },
    { hour: 23, movements: 3, avgIMU: 0.31 },
    { hour: 0, movements: 2, avgIMU: 0.21 },
    ...
  ],
  createdAt: ServerTimestamp
}
```

---

## 🔧 Technical Details

### IMU Sampling
```
Interval: 5 seconds
Formula: √(ax² + ay² + az²)
Thresholds:
  - Low movement: < 0.5 m/s²
  - Significant movement: > 1.5 m/s²
```

### Data Flow
```
BLE Device (ESP32)
    ↓ (JSON via BLE)
handleDataNotification()
    ↓ (Parse ax, ay, az, hr)
SleepTracker.processIMUData()
    ↓ (Calculate magnitude)
recordDataPoint()
    ↓ (Every 5 seconds)
determineSleepStage()
    ↓ (Based on movement + HR)
Store in memory
    ↓ (On stop)
analyzeSleepData()
    ↓ (Calculate quality)
saveSleepSession()
    ↓ (Firestore)
Show Summary Modal
```

### Memory Management
```
- IMU history: Keep only last 2 hours
- Movement data: All data points (sampled every 5s)
- Summary: Hourly buckets for storage
```

---

## 📈 Sleep History

View recent sleep sessions:

```javascript
// Get last 7 sessions
const sessions = await SleepTracker.getRecentSessions(7);

sessions.forEach(session => {
  console.log(`Date: ${session.startTime}`);
  console.log(`Quality: ${session.sleepQuality}/100`);
  console.log(`Duration: ${session.duration} min`);
  console.log(`Stages:`, session.stages);
});
```

---

## ✅ Best Practices

### For Accurate Tracking:
1. ✅ **Wear device properly** - Secure on wrist
2. ✅ **Start before sleep** - Begin tracking saat siap tidur
3. ✅ **Keep connected** - Pastikan BLE tidak disconnect
4. ✅ **Sleep naturally** - Don't worry tentang device
5. ✅ **Stop in morning** - Stop tracking setelah bangun

### Tips for Better Sleep Quality:
- 🌙 Complete bedtime routine
- 🎵 Listen relaxation audio
- 📱 Avoid screen before sleep
- 🛁 Warm bath helps
- ☕ No caffeine 6 hours before bed

---

## 🐛 Troubleshooting

### "Hubungkan perangkat BLE terlebih dahulu"
**Problem:** BLE not connected
**Solution:**
1. Go to header
2. Tap Connect button
3. Select BLE device
4. Wait for connected status
5. Return to Sleep Lab
6. Try start tracking again

### Tracking tidak berjalan
**Problem:** No data being recorded
**Solution:**
1. Check BLE connection status (green dot)
2. Verify IMU data coming in (check dashboard)
3. Restart tracking
4. Check browser console for errors

### Data tidak tersimpan
**Problem:** Session not saving to Firestore
**Solution:**
1. Ensure logged in
2. Check internet connection
3. Verify Firestore rules
4. Check browser console

### Score selalu rendah
**Problem:** Too much movement detected
**Solution:**
1. Check device placement (not too loose)
2. Sleep in comfortable position
3. Avoid disturbances
4. Review movement data in summary

---

## 📊 Interpretation Guide

### Excellent (80-100)
```
✅ Deep sleep: 25-35%
✅ Efficiency: >90%
✅ Movements: <10/hour
✅ Awake time: <10%

Recommendation: Keep it up! 👍
```

### Good (70-79)
```
✅ Deep sleep: 20-25%
✅ Efficiency: 85-90%
✅ Movements: 10-15/hour
✅ Awake time: 10-15%

Recommendation: Solid sleep, minor improvements possible
```

### Fair (50-69)
```
⚠️ Deep sleep: 15-20%
⚠️ Efficiency: 75-85%
⚠️ Movements: 15-25/hour
⚠️ Awake time: 15-25%

Recommendation: Try relaxation techniques, improve sleep hygiene
```

### Poor (<50)
```
❌ Deep sleep: <15%
❌ Efficiency: <75%
❌ Movements: >25/hour
❌ Awake time: >25%

Recommendation: Consult doctor, check sleep environment, reduce stress
```

---

## 🎯 Future Enhancements (Ideas)

- [ ] Sleep trends chart (7/30 days)
- [ ] Sleep recommendations based on quality
- [ ] Smart alarm (wake during light sleep)
- [ ] Sleep diary integration
- [ ] Export sleep data
- [ ] Share sleep report
- [ ] Sleep goal setting
- [ ] Bedtime reminders

---

**Status:** ✅ Production Ready
**Data Source:** BLE IMU (ax, ay, az) + Heart Rate
**Storage:** Firestore (`sleepSessions` collection)
**Score Range:** 0-100 (higher = better)
**Sleep Stages:** 4 stages (Deep, Light, REM, Awake)

---

**Selamat Tidur! 😴💤**
