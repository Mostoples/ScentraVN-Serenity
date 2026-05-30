/**
 * ScentraVN Serenity - Health Monitoring Page Logic
 * Multi-device BLE: Muse S Gen 2 EEG, BP Smartwatch, Vitals Smartwatch
 */

// Recording timer state
let healthRecordingInterval = null;
let healthRecordingStartTime = null;
let healthReadingCount = 0;

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

/**
 * Main entry point — called by the SPA router after the health view is mounted.
 */
function initHealthPage() {
    // Register multi-device data handlers (clear first to avoid accumulation on SPA re-navigation)
    if (typeof MultiDevice !== 'undefined') {
        MultiDevice._callbacks.eeg = [];
        MultiDevice._callbacks.bp = [];
        MultiDevice._callbacks.vitals = [];
        MultiDevice._callbacks.connection = [];

        MultiDevice.onEEGData(handleEEGUpdate);
        MultiDevice.onBPData(handleBPUpdate);
        MultiDevice.onVitalsData(handleVitalsUpdate);
        MultiDevice.onConnectionChange(handleDeviceConnectionChange);

        // Reflect any devices that are already connected
        const statuses = MultiDevice.getConnectionStatuses?.() || {};
        ['muse', 'bp', 'vitals'].forEach((device) => {
            if (statuses[device]) {
                handleDeviceConnectionChange({ device, status: statuses[device] });
            }
        });
    }

    // Build the EEG chart
    initEEGChart();

    // Initialise gauges / indicators at neutral state
    updateStressGauge(0);

    const liveIndicator = document.getElementById('liveIndicator');
    if (liveIndicator) liveIndicator.classList.add('offline');

    const eegLiveIndicator = document.getElementById('eegLiveIndicator');
    if (eegLiveIndicator) eegLiveIndicator.style.display = 'none';

    showAutoRecordStatus(false);
}

// ─────────────────────────────────────────────
// EEG CHART
// ─────────────────────────────────────────────

/**
 * Create (or recreate) the Chart.js EEG line chart on #eegChart canvas.
 */
function initEEGChart() {
    const canvas = document.getElementById('eegChart');
    if (!canvas) return;

    // Destroy previous instance if it exists
    if (window._eegChart) {
        window._eegChart.destroy();
        window._eegChart = null;
    }

    const emptyData = Array(60).fill(null);

    window._eegChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: Array(60).fill(''),
            datasets: [
                {
                    label: 'Delta',
                    data: [...emptyData],
                    borderColor: '#3b82f6',
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.3,
                },
                {
                    label: 'Theta',
                    data: [...emptyData],
                    borderColor: '#8b5cf6',
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.3,
                },
                {
                    label: 'Alpha',
                    data: [...emptyData],
                    borderColor: '#10b981',
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.3,
                },
                {
                    label: 'Beta',
                    data: [...emptyData],
                    borderColor: '#f59e0b',
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.3,
                },
                {
                    label: 'Gamma',
                    data: [...emptyData],
                    borderColor: '#ef4444',
                    backgroundColor: 'transparent',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.3,
                },
            ],
        },
        options: {
            responsive: true,
            animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: { boxWidth: 12, padding: 10, font: { size: 11 } },
                },
                tooltip: { enabled: true },
            },
            scales: {
                x: {
                    display: false,
                    grid: { display: false },
                },
                y: {
                    display: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { maxTicksLimit: 5, font: { size: 10 } },
                },
            },
        },
    });
}

/**
 * Push a new EEG sample into the chart, keeping only the last 60 points.
 * @param {object} data - EEG data object with delta, theta, alpha, beta, gamma
 */
function updateEEGChart(data) {
    const chart = window._eegChart;
    if (!chart) return;

    const MAX_POINTS = 60;
    const bands = ['delta', 'theta', 'alpha', 'beta', 'gamma'];

    chart.data.labels.push('');
    if (chart.data.labels.length > MAX_POINTS) chart.data.labels.shift();

    bands.forEach((band, i) => {
        const value = data[band] ?? null;
        chart.data.datasets[i].data.push(value);
        if (chart.data.datasets[i].data.length > MAX_POINTS) {
            chart.data.datasets[i].data.shift();
        }
    });

    chart.update('none');
}

// ─────────────────────────────────────────────
// DEVICE DATA HANDLERS
// ─────────────────────────────────────────────

/**
 * Receive EEG data from the Muse S Gen 2 and update the display.
 * @param {object} data - { delta, theta, alpha, beta, gamma, stressLevel, focusState, battery }
 */
function handleEEGUpdate(data) {
    if (!data) return;

    // Band power values (integers)
    const bands = ['delta', 'theta', 'alpha', 'beta', 'gamma'];
    bands.forEach((band) => {
        const el = document.getElementById(`eeg${band.charAt(0).toUpperCase() + band.slice(1)}`);
        if (el) el.textContent = data[band] != null ? Math.round(data[band]) : '--';
    });

    // Stress level text
    const stressMap = { low: 'Rendah 🟢', medium: 'Sedang 🟡', high: 'Tinggi 🔴' };
    const stressEl = document.getElementById('eegStressLevel');
    if (stressEl) stressEl.textContent = stressMap[data.stressLevel] ?? '--';

    // Focus state text
    const focusMap = { low: 'Rendah', moderate: 'Sedang', good: 'Baik ✓' };
    const focusEl = document.getElementById('eegFocusState');
    if (focusEl) focusEl.textContent = focusMap[data.focusState] ?? '--';

    // Battery
    const batteryEl = document.getElementById('eegBattery');
    if (batteryEl) {
        batteryEl.textContent = data.battery != null ? `${Math.round(data.battery)}%` : '--';
    }

    // Show live indicator
    const eegLiveIndicator = document.getElementById('eegLiveIndicator');
    if (eegLiveIndicator) eegLiveIndicator.style.display = '';

    // Push to chart
    updateEEGChart(data);
}

/**
 * Receive blood pressure data from the BP smartwatch.
 * @param {object} data - { sys, dia }
 */
function handleBPUpdate(data) {
    if (!data) return;

    const bpSys = document.getElementById('bpSys');
    const bpDia = document.getElementById('bpDia');
    const bpStatusBadge = document.getElementById('bpStatusBadge');

    if (bpSys) bpSys.textContent = data.sys ?? '--';
    if (bpDia) bpDia.textContent = data.dia ?? '--';

    if (bpStatusBadge && data.sys != null && data.dia != null) {
        let label, cls;
        if (data.sys < 120 && data.dia < 80) {
            label = 'Normal';
            cls = 'vital-badge success';
        } else if (data.sys < 130 && data.dia < 80) {
            label = 'Meningkat';
            cls = 'vital-badge warning';
        } else {
            label = 'Tinggi';
            cls = 'vital-badge danger';
        }
        bpStatusBadge.textContent = label;
        bpStatusBadge.className = cls;
    }

    // Show live indicator
    const liveIndicator = document.getElementById('liveIndicator');
    if (liveIndicator) liveIndicator.classList.remove('offline');
}

/**
 * Receive HR / SpO2 data from the vitals smartwatch.
 * @param {object} data - { hr, spo2, finger }
 */
function handleVitalsUpdate(data) {
    if (!data) return;

    healthReadingCount++;

    updateHeartRateDisplay(data);
    updateSpO2Display(data);

    // Finger status
    const fingerStatus = document.getElementById('fingerStatus');
    if (fingerStatus) {
        if (data.finger) {
            fingerStatus.innerHTML = `<i class="fas fa-check-circle" style="color: #10b981;"></i> ${t('ble.finger_detected')}`;
        } else {
            fingerStatus.textContent = t('ble.place_finger');
        }
    }

    // Reading count
    const countEl = document.getElementById('recordingCount');
    if (countEl) {
        countEl.textContent = `${healthReadingCount} readings`;
    }

    // Show live indicator
    const liveIndicator = document.getElementById('liveIndicator');
    if (liveIndicator) liveIndicator.classList.remove('offline');
}

// ─────────────────────────────────────────────
// DEVICE CONNECTION CHANGE HANDLER
// ─────────────────────────────────────────────

/**
 * Update the device card UI when any device connection state changes.
 * @param {object} param0 - { device: 'muse'|'bp'|'vitals', status: 'disconnected'|'connecting'|'connected' }
 */
function handleDeviceConnectionChange({ device, status }) {
    const dotEl = document.getElementById(`${device}Dot`);
    const statusTextEl = document.getElementById(`${device}Status`);
    const btnEl = document.getElementById(`${device}ConnectBtn`);

    // Dot colour
    if (dotEl) {
        dotEl.style.backgroundColor =
            status === 'connected'   ? '#10b981' :
            status === 'connecting'  ? '#f59e0b' :
                                       '#ef4444';
    }

    // Status text
    if (statusTextEl) {
        statusTextEl.textContent =
            status === 'connected'   ? t('status.connected') :
            status === 'connecting'  ? t('status.connecting') :
                                       t('status.disconnected');
    }

    // Button label
    if (btnEl) {
        btnEl.textContent =
            status === 'connected'   ? 'Putuskan' :
            status === 'connecting'  ? 'Menghubungkan...' :
                                       'Sambungkan';
        btnEl.disabled = status === 'connecting';
    }

    // Vitals-specific side effects
    if (device === 'vitals') {
        if (status === 'connected') {
            showAutoRecordStatus(true);
            startHealthRecordingTimer();
        } else if (status === 'disconnected') {
            showAutoRecordStatus(false);
            stopHealthRecordingTimer();

            // Reset live indicator
            const liveIndicator = document.getElementById('liveIndicator');
            if (liveIndicator) liveIndicator.classList.add('offline');
        }
    }

    // Muse-specific side effects
    if (device === 'muse' && status === 'disconnected') {
        const eegLiveIndicator = document.getElementById('eegLiveIndicator');
        if (eegLiveIndicator) eegLiveIndicator.style.display = 'none';
    }
}

// ─────────────────────────────────────────────
// VITALS DISPLAY HELPERS
// ─────────────────────────────────────────────

/**
 * Update Heart Rate display and the SVG ring progress.
 * @param {object} data - { hr, finger }
 */
function updateHeartRateDisplay(data) {
    const hrValue = document.getElementById('hrValue');
    const hrStatus = document.getElementById('hrStatus');
    const hrRing = document.getElementById('hrRingProgress');

    const circumference = 175.93; // 2π × 28 (matches SVG ring r=28)

    if (data.finger && data.hr > 0) {
        if (hrValue) hrValue.textContent = data.hr;

        if (hrRing) {
            const percentage = Math.min(data.hr / 200, 1);
            const offset = circumference - percentage * circumference;
            hrRing.style.strokeDashoffset = offset;

            hrRing.style.stroke =
                data.hr < 60  ? '#3b82f6' :
                data.hr <= 100 ? '#10b981' :
                data.hr <= 140 ? '#f59e0b' :
                                 '#ef4444';
        }

        if (hrStatus) {
            const statusInfo = Utils.getHeartRateStatus(data.hr);
            hrStatus.innerHTML = `<span class="status-dot" style="background:${getStatusColor(statusInfo.color)}"></span><span>${statusInfo.status}</span>`;
            hrStatus.className = 'hr-status ' + statusInfo.color;
        }
    } else {
        if (hrValue) hrValue.textContent = '--';
        if (hrRing) hrRing.style.strokeDashoffset = circumference;
        if (hrStatus) {
            hrStatus.innerHTML = `<span class="status-dot"></span><span>${t('status.waiting_data')}</span>`;
            hrStatus.className = 'hr-status';
        }
    }
}

/**
 * Update SpO2 display.
 * @param {object} data - { spo2, finger }
 */
function updateSpO2Display(data) {
    const spo2Value = document.getElementById('spo2Value');
    const spo2Status = document.getElementById('spo2Status');

    if (data.finger && data.spo2 > 0) {
        if (spo2Value) spo2Value.textContent = data.spo2;

        if (spo2Status) {
            const statusInfo = Utils.getSpO2Status(data.spo2);
            spo2Status.textContent = statusInfo.status;
            spo2Status.className = 'vital-badge ' + statusInfo.color;
        }
    } else {
        if (spo2Value) spo2Value.textContent = '--';
        if (spo2Status) {
            spo2Status.textContent = '--';
            spo2Status.className = 'vital-badge';
        }
    }
}

// ─────────────────────────────────────────────
// GAUGE HELPERS
// ─────────────────────────────────────────────

/**
 * Update the stress SVG gauge arc.
 * @param {number} value - 0–100
 */
function updateStressGauge(value) {
    const gauge = document.getElementById('stressGauge');
    if (!gauge) return;

    const circumference = 2 * Math.PI * 54;
    const percentage = Math.min(value / 100, 1);
    gauge.style.strokeDashoffset = circumference - percentage * circumference;

    gauge.style.stroke =
        value <= 30 ? '#10b981' :
        value <= 60 ? '#f59e0b' :
                      '#ef4444';
}

/**
 * Map a CSS colour class name to a hex colour string.
 * @param {string} colorClass
 * @returns {string}
 */
function getStatusColor(colorClass) {
    const map = {
        success : '#10b981',
        warning : '#f59e0b',
        danger  : '#ef4444',
        info    : '#3b82f6',
        gray    : '#94a3b8',
    };
    return map[colorClass] ?? map.gray;
}

// ─────────────────────────────────────────────
// AUTO-RECORD STATUS / TIMER
// ─────────────────────────────────────────────

/**
 * Show or hide the auto-record status card.
 * @param {boolean} show
 */
function showAutoRecordStatus(show) {
    const statusCard = document.getElementById('autoRecordStatus');
    if (statusCard) statusCard.style.display = show ? 'flex' : 'none';
}

/**
 * Start the elapsed-time recording timer.
 */
function startHealthRecordingTimer() {
    healthRecordingStartTime = Date.now();
    healthReadingCount = 0;

    if (healthRecordingInterval) clearInterval(healthRecordingInterval);

    healthRecordingInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - healthRecordingStartTime) / 1000);
        const mm = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const ss = (elapsed % 60).toString().padStart(2, '0');

        const timerEl = document.getElementById('recordingTimer');
        if (timerEl) timerEl.textContent = `${mm}:${ss}`;
    }, 1000);
}

/**
 * Stop the recording timer and reset display.
 */
function stopHealthRecordingTimer() {
    if (healthRecordingInterval) {
        clearInterval(healthRecordingInterval);
        healthRecordingInterval = null;
    }

    const timerEl = document.getElementById('recordingTimer');
    if (timerEl) timerEl.textContent = '00:00';

    const countEl = document.getElementById('recordingCount');
    if (countEl) countEl.textContent = t('health.readings_count', { count: '0' });

    healthReadingCount = 0;
}

// ─────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────

window.addEventListener('beforeunload', () => {
    if (healthRecordingInterval) clearInterval(healthRecordingInterval);
    if (window._eegChart) {
        window._eegChart.destroy();
        window._eegChart = null;
    }
});

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

window.initHealthPage = initHealthPage;
