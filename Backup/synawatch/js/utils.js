/**
 * SYNAWATCH Utility Functions
 */

const Utils = {
    /**
     * Format date to readable string
     */
    formatDate(date, format = 'full') {
        const d = new Date(date);
        const options = {
            full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
            short: { month: 'short', day: 'numeric', year: 'numeric' },
            time: { hour: '2-digit', minute: '2-digit' },
            datetime: { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
        };
        return d.toLocaleDateString('id-ID', options[format] || options.full);
    },

    /**
     * Format time to HH:MM:SS
     */
    formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    },

    /**
     * Get Heart Rate Status
     */
    getHeartRateStatus(bpm) {
        if (bpm === 0 || bpm === null) return { status: 'No Data', color: 'gray', icon: 'fa-heart' };
        if (bpm < CONFIG.HEALTH_THRESHOLDS.HR_LOW) return { status: 'Low', color: 'warning', icon: 'fa-heart' };
        if (bpm > CONFIG.HEALTH_THRESHOLDS.HR_HIGH) return { status: 'High', color: 'danger', icon: 'fa-heart' };
        return { status: 'Normal', color: 'success', icon: 'fa-heart' };
    },

    /**
     * Get SpO2 Status
     */
    getSpO2Status(spo2) {
        if (spo2 === 0 || spo2 === null) return { status: 'No Data', color: 'gray' };
        if (spo2 >= CONFIG.HEALTH_THRESHOLDS.SPO2_EXCELLENT) return { status: 'Excellent', color: 'success' };
        if (spo2 >= CONFIG.HEALTH_THRESHOLDS.SPO2_NORMAL) return { status: 'Normal', color: 'success' };
        if (spo2 >= CONFIG.HEALTH_THRESHOLDS.SPO2_LOW) return { status: 'Low', color: 'warning' };
        return { status: 'Critical', color: 'danger' };
    },

    /**
     * Get Stress Status
     */
    getStressStatus(stress) {
        if (stress <= CONFIG.HEALTH_THRESHOLDS.STRESS_LOW) return { status: 'Low', color: 'success' };
        if (stress <= CONFIG.HEALTH_THRESHOLDS.STRESS_MODERATE) return { status: 'Moderate', color: 'warning' };
        return { status: 'High', color: 'danger' };
    },

    /**
     * Get GSR Status
     */
    getGSRStatus(gsr) {
        if (gsr <= CONFIG.HEALTH_THRESHOLDS.GSR_RELAXED) return { status: 'Relaxed', color: 'success' };
        if (gsr <= CONFIG.HEALTH_THRESHOLDS.GSR_NORMAL) return { status: 'Normal', color: 'warning' };
        if (gsr <= CONFIG.HEALTH_THRESHOLDS.GSR_AROUSED) return { status: 'Aroused', color: 'orange' };
        return { status: 'Stressed', color: 'danger' };
    },

    /**
     * Get Temperature Status
     */
    getTempStatus(temp) {
        if (temp === 0 || temp === null) return { status: 'No Data', color: 'gray' };
        if (temp < CONFIG.HEALTH_THRESHOLDS.TEMP_MIN) return { status: 'Low', color: 'info' };
        if (temp > CONFIG.HEALTH_THRESHOLDS.TEMP_MAX) return { status: 'High', color: 'warning' };
        return { status: 'Normal', color: 'success' };
    },

    /**
     * Get Activity Icon
     */
    getActivityIcon(act) {
        const icons = {
            'DIAM': 'fa-person',
            'JALAN': 'fa-person-walking',
            'LARI': 'fa-person-running',
            'AKTIF': 'fa-person-biking'
        };
        return icons[act] || 'fa-person';
    },

    /**
     * Get Activity Label
     */
    getActivityLabel(act) {
        const labels = {
            'DIAM': 'Resting',
            'JALAN': 'Walking',
            'LARI': 'Running',
            'AKTIF': 'Active'
        };
        return labels[act] || act;
    },

    /**
     * Calculate Health Score
     */
    calculateHealthScore(data) {
        let score = 100;

        // Heart Rate factor (optimal around 70-75)
        if (data.hr > 0) {
            const hrDeviation = Math.abs(data.hr - 72);
            score -= hrDeviation * 0.5;
        }

        // SpO2 factor
        if (data.spo2 > 0) {
            score -= (100 - data.spo2) * 2;
        }

        // Stress factor
        score -= data.stress * 0.3;

        // GSR factor
        score -= data.gsr * 0.2;

        // Temperature factor
        if (data.bt > 0) {
            if (data.bt < 36.1 || data.bt > 37.2) {
                score -= 5;
            }
        }

        return Math.max(0, Math.min(100, Math.round(score)));
    },

    /**
     * Get color by status
     */
    getStatusColor(status) {
        const colors = {
            'success': '#10b981',
            'warning': '#f59e0b',
            'danger': '#ef4444',
            'info': '#3b82f6',
            'gray': '#6b7280',
            'orange': '#f97316'
        };
        return colors[status] || colors.gray;
    },

    /**
     * Get stress level color
     */
    getStressColor(stress) {
        if (stress <= 30) return '#10b981';
        if (stress <= 60) return '#f59e0b';
        if (stress <= 80) return '#f97316';
        return '#ef4444';
    },

    /**
     * Get GSR level color
     */
    getGSRColor(gsr) {
        if (gsr <= 30) return '#10b981';
        if (gsr <= 60) return '#f59e0b';
        if (gsr <= 80) return '#f97316';
        return '#ef4444';
    },

    /**
     * ============================================
     * STRESS ANALYSIS FUNCTION
     * ============================================
     * Menghitung skor stres berdasarkan data sensor BLE dari ESP32
     *
     * FORMULA: Stress Score = Σ (nilai_ternormalisasi × bobot) × 100
     *
     * BOBOT:
     * - GSR  = 35% (paling dominan untuk deteksi stres)
     * - HR   = 30% (detak jantung meningkat saat stres)
     * - HRV  = 20% (variabilitas menurun saat stres)
     * - Suhu = 10% (suhu tubuh dapat berubah saat stres)
     * - SpO2 = 5%  (saturasi oksigen sebagai indikator tambahan)
     *
     * @param {Object} data - Data sensor dari BLE
     * @param {number} data.hr - Heart Rate (BPM)
     * @param {number} data.gsr - GSR value (0-1023 raw atau 0-100 normalized)
     * @param {number} data.suhu - Body Temperature (Celsius)
     * @param {number} data.spo2 - SpO2 percentage
     * @param {number} data.imu - IMU acceleration magnitude
     * @returns {Object} { score, level, label, color, valid }
     */
    analyzeStress(data) {
        // ============================================
        // FILTER IMU: Validasi pergerakan pengguna
        // ============================================
        // IMU < 0.5      : Diam (normal calculation)
        // 0.5 ≤ IMU < 1.5: Gelisah/Tremor (penalti +10)
        // IMU ≥ 1.5      : Aktif bergerak (tidak valid)
        // ============================================
        const imuMagnitude = data.imu || 0;

        // Jika IMU >= 1.5g, data tidak valid (user aktif bergerak)
        if (imuMagnitude >= 1.5) {
            return {
                score: null,
                level: -1,
                label: 'Tidak Valid',
                color: '#6b7280',  // Gray
                valid: false,
                imuState: 'active',
                reason: 'User sedang bergerak aktif (IMU ≥ 1.5g)'
            };
        }

        // Tentukan state IMU dan penalti
        let imuState = 'still';      // Diam
        let imuPenalty = 0;

        if (imuMagnitude >= 0.5 && imuMagnitude < 1.5) {
            // Gelisah/Tremor - tambah penalti kecil
            imuState = 'restless';
            imuPenalty = 10;
        }

        // ============================================
        // HELPER: Clamp nilai ke rentang 0-1
        // Memastikan semua nilai normalisasi berada dalam batas yang valid
        // ============================================
        const clamp = (value, min = 0, max = 1) => {
            return Math.max(min, Math.min(max, value));
        };

        // ============================================
        // NORMALISASI MIN-MAX
        // Mengubah nilai sensor ke skala 0-1
        // ============================================

        // HR Normalization: (hr - 40) / (180 - 40)
        // Range: 40 BPM (min) hingga 180 BPM (max)
        // Semakin tinggi HR, semakin tinggi stress
        const hr = data.hr || 0;
        const hrNorm = clamp((hr - 40) / (180 - 40));

        // GSR Normalization: gsr / 1023
        // Range: 0 hingga 1023 (raw ADC value)
        // Jika data sudah dalam format 0-100, konversi dulu
        let gsrRaw = data.gsr || 0;
        if (gsrRaw <= 100) {
            // Asumsi data sudah normalized ke 0-100, konversi ke 0-1
            gsrRaw = gsrRaw * 10.23; // Convert to 0-1023 scale
        }
        const gsrNorm = clamp(gsrRaw / 1023);

        // Suhu Normalization: (suhu - 35) / (40 - 35)
        // Range: 35°C (min) hingga 40°C (max)
        // Suhu tinggi dapat mengindikasikan stress
        const suhu = data.suhu || data.bt || 0;
        const suhuNorm = clamp((suhu - 35) / (40 - 35));

        // SpO2 Normalization (INVERTED): 1 - ((spo2 - 85) / (100 - 85))
        // Range: 85% (critical) hingga 100% (excellent)
        // Dibalik karena SpO2 rendah = stress tinggi
        const spo2 = data.spo2 || 0;
        const spo2Norm = clamp(1 - ((spo2 - 85) / (100 - 85)));

        // HRV Normalization (ESTIMATED & INVERTED): 1 - ((60000/hr - 300) / (1000 - 300))
        // HRV diestimasi dari interval RR (60000/HR dalam ms)
        // Range: 300ms (stress tinggi) hingga 1000ms (relax)
        // Dibalik karena HRV rendah = stress tinggi
        let hrvNorm = 0;
        if (hr > 0) {
            const rrInterval = 60000 / hr; // Estimasi RR interval dalam ms
            hrvNorm = clamp(1 - ((rrInterval - 300) / (1000 - 300)));
        }

        // ============================================
        // PERHITUNGAN SKOR STRES
        // Formula: score = Σ (norm × bobot) × 100
        // ============================================
        const weights = {
            gsr: 0.35,   // 35% - Galvanic Skin Response
            hr: 0.30,    // 30% - Heart Rate
            hrv: 0.20,   // 20% - Heart Rate Variability
            suhu: 0.10,  // 10% - Body Temperature
            spo2: 0.05   // 5%  - Oxygen Saturation
        };

        // Weighted sum calculation
        const weightedSum =
            (gsrNorm * weights.gsr) +
            (hrNorm * weights.hr) +
            (hrvNorm * weights.hrv) +
            (suhuNorm * weights.suhu) +
            (spo2Norm * weights.spo2);

        // ============================================
        // FINAL SCORE CALCULATION
        // Base score + IMU penalty (jika gelisah/tremor)
        // ============================================
        let score = Math.round(weightedSum * 100);

        // Tambahkan penalti IMU jika user gelisah/tremor
        if (imuPenalty > 0) {
            score += imuPenalty;
        }

        // Clamp score ke range 0-100
        score = Math.max(0, Math.min(100, score));

        // ============================================
        // KLASIFIKASI LEVEL STRES
        // 0-30  : Level 0 - Rendah (Rileks)
        // 31-60 : Level 1 - Sedang (Waspada)
        // 61-80 : Level 2 - Tinggi (Stres)
        // 81-100: Level 3 - Kritis (Stres Berat)
        // ============================================
        let level, label, color;

        if (score <= 30) {
            level = 0;
            label = 'Rendah';
            color = '#10b981';  // Green - Rileks
        } else if (score <= 60) {
            level = 1;
            label = 'Sedang';
            color = '#f59e0b';  // Yellow/Amber - Waspada
        } else if (score <= 80) {
            level = 2;
            label = 'Tinggi';
            color = '#f97316';  // Orange - Stres
        } else {
            level = 3;
            label = 'Kritis';
            color = '#ef4444';  // Red - Stres Berat
        }

        // ============================================
        // RETURN HASIL ANALISIS
        // ============================================
        return {
            score: score,           // Skor stres (0-100)
            level: level,           // Level numerik (0-3)
            label: label,           // Label Indonesia
            color: color,           // Warna untuk UI
            valid: true,            // Data valid
            // IMU state info
            imuState: imuState,     // 'still' atau 'restless'
            imuPenalty: imuPenalty, // Penalti yang ditambahkan (0 atau 10)
            imuMagnitude: imuMagnitude.toFixed(2),
            // Detail normalisasi untuk debugging/analytics
            details: {
                hrNorm: hrNorm.toFixed(3),
                gsrNorm: gsrNorm.toFixed(3),
                hrvNorm: hrvNorm.toFixed(3),
                suhuNorm: suhuNorm.toFixed(3),
                spo2Norm: spo2Norm.toFixed(3),
                weights: weights
            }
        };
    },

    /**
     * Get stress level info based on score
     * Helper function untuk mendapatkan info level dari skor
     */
    getStressLevelInfo(score) {
        if (score === null) {
            return { level: -1, label: 'Tidak Valid', color: '#6b7280', description: 'Data tidak valid' };
        }
        if (score <= 30) {
            return { level: 0, label: 'Rendah', color: '#10b981', description: 'Kondisi rileks dan tenang' };
        }
        if (score <= 60) {
            return { level: 1, label: 'Sedang', color: '#f59e0b', description: 'Perlu perhatian, coba relaksasi' };
        }
        if (score <= 80) {
            return { level: 2, label: 'Tinggi', color: '#f97316', description: 'Stres terdeteksi, istirahat sejenak' };
        }
        return { level: 3, label: 'Kritis', color: '#ef4444', description: 'Stres berat, segera istirahat!' };
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Get current timestamp
     */
    getTimestamp() {
        return firebase.firestore.Timestamp.now();
    },

    /**
     * Format duration in seconds to readable string
     */
    formatDuration(seconds) {
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hrs}h ${mins}m`;
    },

    /**
     * Get greeting based on time of day
     */
    getGreeting() {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        if (hour < 21) return 'Good Evening';
        return 'Good Night';
    },

    /**
     * Check if device is mobile
     */
    isMobile() {
        return window.innerWidth <= 768;
    },

    /**
     * Sanitize HTML to prevent XSS
     */
    sanitizeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }
};

// Make Utils globally available
window.Utils = Utils;
