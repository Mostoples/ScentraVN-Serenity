# ScentraVN Serenity — Setup Laptop Client (Offline, via Hotspot HP)

Panduan menyiapkan **laptop client** agar PWA jalan **tanpa internet** dan menerima
data Galaxy Watch dari HP lewat hotspot WiFi.

```
Galaxy Watch --BLE--> App Android (server WS 0.0.0.0:8765)
                              |  Hotspot WiFi HP (TANPA internet)
                              v
   Laptop: PWA di http://localhost:8000  --ws://192.168.43.1:8765-->  data masuk
```

---

## 1. Sekali saja: siapkan laptop

1. **Salin folder proyek ini** ke laptop client (mis. ke `C:\ScentraVN\` atau `~/ScentraVN/`).
2. **Pastikan ada salah satu runtime** (cek dengan membuka Terminal/CMD):
   - **Python** — paling disarankan, sering sudah ada. Windows: install dari
     <https://python.org> dan **centang "Add Python to PATH"**.
   - atau **Node.js**, atau **PHP**. (Launcher memakai yang mana pun tersedia.)

   > Runtime ini perlu di-install **saat masih ada internet**. Setelah terpasang,
   > semuanya berjalan **100% offline** — tidak ada `npm install`/unduhan.

---

## 2. Tiap kali dipakai di lapangan

**Di HP (App Android ScentraVN):**
1. Sambungkan Galaxy Watch (Bluetooth) seperti biasa.
2. Nyalakan **Hotspot** (kuota/internet tidak diperlukan).
3. Pastikan server WS app **bind `0.0.0.0:8765`** (bukan `127.0.0.1`). *(setelan sisi app)*

**Di Laptop:**
1. Sambungkan WiFi ke **hotspot HP**.
2. Jalankan launcher:
   - **Windows:** dobel-klik **`serve-offline.bat`**
   - **macOS/Linux:** `./serve-offline.sh` (atau dobel-klik bila diizinkan)
3. Browser terbuka otomatis ke **`http://localhost:8000`**. Selesai.

> Biarkan jendela launcher **tetap terbuka** selama dipakai. Menutupnya = server berhenti.

**Cek berhasil:** buka halaman **RAW Recorder** → kartu **Galaxy Watch** harus
membaca **"Terhubung · Offline (lokal)"** dan angkanya bergerak.

---

## 3. Precache offline (penting dipahami)

Saat pertama kali membuka `http://localhost:8000`, Service Worker menyimpan seluruh
app-shell ke cache. Karena file disajikan dari **laptop sendiri**, precache ini
**berhasil penuh tanpa internet**. Setelah itu app tahan walau server/HP sempat putus.

---

## 4. Kalau bermasalah

| Gejala | Penyebab & solusi |
|---|---|
| Galaxy Watch "Terputus" terus | Cek IP HP. Di Console browser laptop (F12) ketik: `ScentraLocalBridge.setHost('192.168.43.1')`. IP HP bisa dilihat di setelan hotspot, atau dari `ipconfig` (Windows) / `ip route` (Linux) → "Default Gateway" laptop = IP HP. |
| Data tetap kosong | Pastikan server WS app Android **bind `0.0.0.0`**, bukan `127.0.0.1`. Loopback tak bisa dijangkau laptop. |
| Console: "ws:// LAN diblokir (mixed content)" | Anda membuka PWA via **https://** atau via **IP**. WAJIB buka via **`http://localhost:8000`** (pakai launcher ini), jangan `https`, jangan IP. |
| "Port 8000 sudah dipakai" | Jalankan dengan port lain: `serve-offline.bat 9000` atau `./serve-offline.sh 9000`. |
| Browser tak terbuka sendiri | Buka manual: `http://localhost:8000`. |
| Launcher bilang tak ada runtime | Install Python (lihat langkah 1) saat masih ada internet. |

---

## Berkas terkait
- `serve-offline.bat` — launcher Windows
- `serve-offline.sh` — launcher macOS/Linux
- `serve-offline.js` — server Node cadangan (zero-dependency)
- `js/local-bridge.js` — jembatan WS PWA (auto-probe loopback + IP hotspot; `setHost()` untuk pin manual)
