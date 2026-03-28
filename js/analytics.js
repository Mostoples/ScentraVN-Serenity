/**
 * SYNAWATCH - Analytics Module
 * Handles health data visualization from Firebase
 * Data is auto-saved by BLEConnection when device is connected
 */

// Charts
let hrTrendChart = null;
let stressTrendChart = null;
let gsrTrendChart = null;
let spo2TrendChart = null;

// Current period
let currentPeriod = 'day';

// Auto-save configuration (used by BLEConnection)
const Analytics = {
    SAVE_THROTTLE: 10000,
    lastSaveTime: 0,
    lastSavedData: null,
    isAutoSaveEnabled: false,
    dataBuffer: [],
    sessionStartTime: null,
    sessionId: null,
    totalReadings: 0,

    startAutoSave() {
        this.isAutoSaveEnabled = true;
        this.sessionStartTime = Date.now();
        this.sessionId = `session_${Date.now()}`;
        this.totalReadings = 0;
        this.dataBuffer = [];
        console.log('Auto-recording started');
    },

    stopAutoSave() {
        if (this.dataBuffer.length > 0) {
            this.flushBuffer();
        }
        this.saveSessionSummary();
        this.isAutoSaveEnabled = false;
        console.log('Auto-recording stopped. Total readings:', this.totalReadings);
    },

    onBLEDataReceived(sensorData) {
        if (!this.isAutoSaveEnabled) return;

        const now = Date.now();
        const timeSinceLastSave = now - this.lastSaveTime;

        if (sensorData.finger && sensorData.hr > 0) {
            this.dataBuffer.push({
                hr: sensorData.hr,
                spo2: sensorData.spo2,
                stress: sensorData.stress,
                gsr: sensorData.gsr,
                bt: sensorData.bt,
                timestamp: now
            });
            this.totalReadings++;
        }

        if (timeSinceLastSave >= this.SAVE_THROTTLE && this.dataBuffer.length > 0) {
            this.saveCurrentHealthData(sensorData);
            this.lastSaveTime = now;
        }
    },

    async flushBuffer() {
        if (this.dataBuffer.length === 0) return;

        const avg = {
            hr: Math.round(this.dataBuffer.reduce((s, d) => s + d.hr, 0) / this.dataBuffer.length),
            spo2: Math.round(this.dataBuffer.reduce((s, d) => s + d.spo2, 0) / this.dataBuffer.length),
            stress: Math.round(this.dataBuffer.reduce((s, d) => s + d.stress, 0) / this.dataBuffer.length),
            gsr: Math.round(this.dataBuffer.reduce((s, d) => s + d.gsr, 0) / this.dataBuffer.length),
            bt: (this.dataBuffer.reduce((s, d) => s + d.bt, 0) / this.dataBuffer.length).toFixed(1)
        };

        this.dataBuffer = [];
        return avg;
    },

    async saveSessionSummary() {
        try {
            const user = auth?.currentUser;
            if (!user || !this.sessionStartTime) return;

            const duration = Math.round((Date.now() - this.sessionStartTime) / 1000);
            if (duration < 10 || this.totalReadings < 1) return;

            const sessionData = {
                sessionId: this.sessionId,
                startTime: new Date(this.sessionStartTime).toISOString(),
                endTime: new Date().toISOString(),
                durationSeconds: duration,
                totalReadings: this.totalReadings,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            await FirebaseService.userCol(user.uid, 'sessions').add(sessionData);
        } catch (error) {
            console.error('Error saving session summary:', error);
        }
    },

    async saveCurrentHealthData() {
        try {
            const user = auth.currentUser;
            if (!user) return;

            if (typeof BLEConnection === 'undefined') return;

            const sensorData = BLEConnection.getSensorData();
            if (!sensorData || !sensorData.lastUpdate) return;

            if (!sensorData.finger && sensorData.hr === 0) return;

            if (this.lastSavedData) {
                const hrDiff = Math.abs((this.lastSavedData.hr || 0) - (sensorData.hr || 0));
                const stressDiff = Math.abs((this.lastSavedData.stress || 0) - (sensorData.stress || 0));

                if (hrDiff < 3 && stressDiff < 5) return;
            }

            const stressAnalysis = sensorData.stressAnalysis || {};

            const healthData = {
                hr: sensorData.hr || 0,
                spo2: sensorData.spo2 || 0,
                bodyTemp: sensorData.bt || 0,
                ambientTemp: sensorData.at || 0,
                stress: sensorData.stress || 0,
                stressLevel: stressAnalysis.level ?? -1,
                stressLabel: stressAnalysis.label || 'Unknown',
                stressValid: stressAnalysis.valid !== false,
                gsr: sensorData.gsr || 0,
                gsrRaw: sensorData.gsrRaw || 0,
                gsrR: sensorData.gsrR || 0,
                activity: sensorData.act || 'DIAM',
                imuMagnitude: sensorData.imuMagnitude || 0,
                imuState: stressAnalysis.imuState || 'unknown',
                ax: sensorData.ax || 0,
                ay: sensorData.ay || 0,
                az: sensorData.az || 0,
                fingerDetected: sensorData.finger || false,
                healthScore: Utils.calculateHealthScore(sensorData),
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                localTime: new Date().toISOString()
            };

            const docRef = await FirebaseService.userCol(user.uid, 'healthData').add(healthData);

            this.lastSavedData = {
                hr: sensorData.hr,
                stress: sensorData.stress,
                timestamp: Date.now()
            };

            await this.updateDailySummary(user.uid, healthData);

        } catch (error) {
            console.error('Error saving health data:', error);
        }
    },

    async updateDailySummary(userId, healthData) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const docRef = FirebaseService.userCol(userId, 'dailySummary').doc(today);
            const doc = await docRef.get();

            if (doc.exists) {
                const existing = doc.data();
                const count = (existing.readingCount || 0) + 1;

                const updates = {
                    avgHr: this.runningAvg(existing.avgHr, healthData.hr, count),
                    avgSpo2: this.runningAvg(existing.avgSpo2, healthData.spo2, count),
                    avgStress: this.runningAvg(existing.avgStress, healthData.stress, count),
                    avgGsr: this.runningAvg(existing.avgGsr, healthData.gsr, count),
                    avgBodyTemp: this.runningAvg(existing.avgBodyTemp, healthData.bodyTemp, count),
                    avgHealthScore: this.runningAvg(existing.avgHealthScore, healthData.healthScore, count),
                    minHr: healthData.hr > 0 ? Math.min(existing.minHr || 999, healthData.hr) : existing.minHr,
                    maxHr: healthData.hr > 0 ? Math.max(existing.maxHr || 0, healthData.hr) : existing.maxHr,
                    minStress: Math.min(existing.minStress ?? 999, healthData.stress),
                    maxStress: Math.max(existing.maxStress ?? 0, healthData.stress),
                    readingCount: count,
                    lastReading: firebase.firestore.FieldValue.serverTimestamp()
                };

                await docRef.update(updates);
            } else {
                await docRef.set({
                    date: today,
                    avgHr: healthData.hr,
                    avgSpo2: healthData.spo2,
                    avgStress: healthData.stress,
                    avgGsr: healthData.gsr,
                    avgBodyTemp: healthData.bodyTemp,
                    avgHealthScore: healthData.healthScore,
                    minHr: healthData.hr || 0,
                    maxHr: healthData.hr || 0,
                    minStress: healthData.stress,
                    maxStress: healthData.stress,
                    readingCount: 1,
                    firstReading: firebase.firestore.FieldValue.serverTimestamp(),
                    lastReading: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Error updating daily summary:', error);
        }
    },

    runningAvg(currentAvg, newValue, count) {
        if (!newValue || newValue === 0) return currentAvg || 0;
        if (!currentAvg || currentAvg === 0) return newValue;
        return Math.round(((currentAvg * (count - 1)) + newValue) / count);
    }
};

window.Analytics = Analytics;

/**
 * Initialize analytics page
 */
async function initAnalyticsPage() {
    updateCurrentDate();
    await new Promise(resolve => setTimeout(resolve, 100));
    await loadAnalyticsData();
}

window.initAnalyticsPage = initAnalyticsPage;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('authenticated', (e) => {
        initAnalyticsPage();
    });

    if (typeof auth !== 'undefined' && auth.currentUser) {
        initAnalyticsPage();
    }
});

function updateCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    if (dateElement) {
        dateElement.textContent = Utils.formatDate(new Date(), 'short');
    }
}

/**
 * Load analytics data from Firestore
 */
async function loadAnalyticsData() {
    // Get dates based on period
    const dates = [];
    const today = new Date();
    let daysToFetch = 1;

    if (currentPeriod === 'week') daysToFetch = 7;
    else if (currentPeriod === 'month') daysToFetch = 30;

    for (let i = daysToFetch - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }

    try {
        const user = auth?.currentUser;
        if (!user) {
            showDemoData(dates);
            return;
        }

        // Fetch data from Firebase
        let healthReadings = [];

        if (currentPeriod === 'day') {
            // For today, fetch individual readings
            const startOfDay = new Date(today);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(today);
            endOfDay.setHours(23, 59, 59, 999);

            const snapshot = await FirebaseService.userCol(user.uid, 'healthData')
                .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
                .where('timestamp', '<=', firebase.firestore.Timestamp.fromDate(endOfDay))
                .orderBy('timestamp', 'asc')
                .limit(100)
                .get();

            healthReadings = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));
        } else {
            // For week/month, fetch daily summaries
            for (const date of dates) {
                const doc = await FirebaseService.userCol(user.uid, 'dailySummary').doc(date).get();
                if (doc.exists) {
                    healthReadings.push({
                        ...doc.data(),
                        date: date
                    });
                }
            }
        }

        // If no data, show demo data
        if (healthReadings.length === 0) {
            showDemoData(dates);
            return;
        }

        // Process and display real data
        displayAnalyticsCharts(healthReadings, dates);
        updateSummaryStats(healthReadings);

    } catch (error) {
        console.error('Error loading analytics:', error);
        showDemoData(dates);
    }
}

/**
 * Display analytics charts
 */
function displayAnalyticsCharts(readings, dates) {
    destroyCharts();

    let labels, hrData, stressData, gsrData, spo2Data;

    if (currentPeriod === 'day') {
        // For today - show time-based data
        labels = readings.map(r => {
            const date = r.timestamp?.toDate ? r.timestamp.toDate() : new Date(r.localTime);
            return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        });
        hrData = readings.map(r => r.hr || null);
        stressData = readings.map(r => r.stress || null);
        gsrData = readings.map(r => r.gsr || null);
        spo2Data = readings.map(r => r.spo2 || null);
    } else {
        // For week/month - show date-based data
        labels = dates.map(d => {
            const date = new Date(d);
            return date.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' });
        });

        const dataMap = {};
        readings.forEach(r => {
            dataMap[r.date] = r;
        });

        hrData = dates.map(d => dataMap[d]?.avgHr || null);
        stressData = dates.map(d => dataMap[d]?.avgStress || null);
        gsrData = dates.map(d => dataMap[d]?.avgGsr || null);
        spo2Data = dates.map(d => dataMap[d]?.avgSpo2 || null);
    }

    // Create charts
    createHRChart(labels, hrData);
    createStressChart(labels, stressData);
    createGSRChart(labels, gsrData);
    createSpO2Chart(labels, spo2Data);

    // Update stat badges
    updateStatBadges(hrData, stressData, gsrData, spo2Data);
}

function createHRChart(labels, data) {
    const ctx = document.getElementById('hrTrendChart');
    if (!ctx) return;

    hrTrendChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Heart Rate',
                data: data,
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#ef4444',
                spanGaps: true
            }]
        },
        options: getChartOptions('BPM', 40, 140)
    });
}

function createStressChart(labels, data) {
    const ctx = document.getElementById('stressTrendChart');
    if (!ctx) return;

    stressTrendChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Stress Level',
                data: data,
                backgroundColor: data.map(v => {
                    if (v === null) return 'rgba(156, 163, 175, 0.5)';
                    if (v <= 30) return 'rgba(16, 185, 129, 0.8)';
                    if (v <= 60) return 'rgba(245, 158, 11, 0.8)';
                    return 'rgba(239, 68, 68, 0.8)';
                }),
                borderRadius: 6
            }]
        },
        options: getChartOptions('%', 0, 100)
    });
}

function createGSRChart(labels, data) {
    const ctx = document.getElementById('gsrTrendChart');
    if (!ctx) return;

    gsrTrendChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'GSR',
                data: data,
                borderColor: '#7c3aed',
                backgroundColor: 'rgba(124, 58, 237, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#7c3aed',
                spanGaps: true
            }]
        },
        options: getChartOptions('%', 0, 100)
    });
}

function createSpO2Chart(labels, data) {
    const ctx = document.getElementById('spo2TrendChart');
    if (!ctx) return;

    spo2TrendChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'SpO2',
                data: data,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#3b82f6',
                spanGaps: true
            }]
        },
        options: getChartOptions('%', 85, 100)
    });
}

function getChartOptions(unit, min, max) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500 },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                titleColor: '#f1f5f9',
                bodyColor: '#f1f5f9',
                padding: 12,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: (ctx) => ctx.parsed.y !== null ? `${ctx.parsed.y} ${unit}` : 'No data'
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { color: 'rgba(107, 114, 128, 0.8)', font: { size: 10 } }
            },
            y: {
                min: min,
                max: max,
                grid: { color: 'rgba(107, 114, 128, 0.1)' },
                ticks: { color: 'rgba(107, 114, 128, 0.8)', font: { size: 10 } }
            }
        }
    };
}

function updateStatBadges(hrData, stressData, gsrData, spo2Data) {
    const calcAvg = (arr) => {
        const valid = arr.filter(v => v !== null && v > 0);
        return valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : '--';
    };

    const hrAvg = calcAvg(hrData);
    const stressAvg = calcAvg(stressData);
    const gsrAvg = calcAvg(gsrData);
    const spo2Avg = calcAvg(spo2Data);

    const hrStat = document.getElementById('hrAvgStat');
    const stressStat = document.getElementById('stressAvgStat');
    const gsrStat = document.getElementById('gsrAvgStat');
    const spo2Stat = document.getElementById('spo2AvgStat');

    if (hrStat) hrStat.textContent = `Avg: ${hrAvg} BPM`;
    if (stressStat) stressStat.textContent = `Avg: ${stressAvg}%`;
    if (gsrStat) gsrStat.textContent = `Avg: ${gsrAvg}%`;
    if (spo2Stat) spo2Stat.textContent = `Avg: ${spo2Avg}%`;
}

function updateSummaryStats(readings) {
    const calcAvg = (key) => {
        const values = readings.map(r => r[key] || r[`avg${key.charAt(0).toUpperCase() + key.slice(1)}`]).filter(v => v > 0);
        return values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : '--';
    };

    const avgHrEl = document.getElementById('avgHr');
    const avgStressEl = document.getElementById('avgStress');
    const avgSpo2El = document.getElementById('avgSpo2');
    const avgGsrEl = document.getElementById('avgGsr');

    if (avgHrEl) avgHrEl.textContent = calcAvg('hr') || calcAvg('Hr');
    if (avgStressEl) avgStressEl.textContent = (calcAvg('stress') || calcAvg('Stress')) + '%';
    if (avgSpo2El) avgSpo2El.textContent = (calcAvg('spo2') || calcAvg('Spo2')) + '%';
    if (avgGsrEl) avgGsrEl.textContent = (calcAvg('gsr') || calcAvg('Gsr')) + '%';
}

function showDemoData(dates) {
    destroyCharts();

    const labels = currentPeriod === 'day'
        ? Array.from({ length: 12 }, (_, i) => `${8 + i}:00`)
        : dates.map(d => new Date(d).toLocaleDateString('id-ID', { weekday: 'short' }));

    const hrData = labels.map(() => Math.floor(Math.random() * 20) + 65);
    const stressData = labels.map(() => Math.floor(Math.random() * 40) + 20);
    const gsrData = labels.map(() => Math.floor(Math.random() * 30) + 25);
    const spo2Data = labels.map(() => Math.floor(Math.random() * 3) + 96);

    createHRChart(labels, hrData);
    createStressChart(labels, stressData);
    createGSRChart(labels, gsrData);
    createSpO2Chart(labels, spo2Data);
    updateStatBadges(hrData, stressData, gsrData, spo2Data);

    // Update summary with demo data
    const avgHrEl = document.getElementById('avgHr');
    const avgStressEl = document.getElementById('avgStress');
    const avgSpo2El = document.getElementById('avgSpo2');
    const avgGsrEl = document.getElementById('avgGsr');

    if (avgHrEl) avgHrEl.textContent = '72';
    if (avgStressEl) avgStressEl.textContent = '35%';
    if (avgSpo2El) avgSpo2El.textContent = '97%';
    if (avgGsrEl) avgGsrEl.textContent = '40%';
}

function destroyCharts() {
    if (hrTrendChart) { hrTrendChart.destroy(); hrTrendChart = null; }
    if (stressTrendChart) { stressTrendChart.destroy(); stressTrendChart = null; }
    if (gsrTrendChart) { gsrTrendChart.destroy(); gsrTrendChart = null; }
    if (spo2TrendChart) { spo2TrendChart.destroy(); spo2TrendChart = null; }
}

async function changeChartPeriod(period, button) {
    currentPeriod = period;

    document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    if (button) button.classList.add('active');

    await loadAnalyticsData();
}

window.changeChartPeriod = changeChartPeriod;

window.addEventListener('beforeunload', destroyCharts);
