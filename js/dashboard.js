/**
 * SYNAWATCH - Dashboard Logic
 * Real-time charts always visible with live updates when connected
 */

// Charts
let hrChart = null;
let stressChart = null;
let gsrChart = null;

// Max data points to show
const MAX_DATA_POINTS = 20;

// Demo data animation
let demoAnimationInterval = null;
let isLiveMode = false;

/**
 * Initialize dashboard
 */
async function initDashboard() {
    // Update greeting
    updateGreeting();

    // Update current time
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    // Initialize charts if not already done
    if (!hrChart || !stressChart || !gsrChart) {
        initCharts();
    }

    // Load user data
    await loadUserData();

    // Load today's data from Firebase
    await loadTodayData();

    // Listen for BLE data updates
    BLEConnection.onDataUpdate(handleDataUpdate);

    // Listen for connection changes
    BLEConnection.onConnectionChange(handleConnectionChange);

    // Check initial connection status
    const status = BLEConnection.getConnectionStatus();
    if (status.isConnected) {
        setLiveMode(true);
    } else {
        // Ensure demo animation is running when not connected
        if (!demoAnimationInterval) {
            startDemoAnimation();
        }
    }
}

/**
 * Update greeting based on time of day
 */
function updateGreeting() {
    const greeting = Utils.getGreeting();
    document.getElementById('greeting').textContent = greeting;
}

/**
 * Update current time display
 */
function updateCurrentTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
    const timeElement = document.getElementById('currentTime');
    if (timeElement) {
        timeElement.textContent = timeStr;
    }
}

/**
 * Load user data
 */
async function loadUserData() {
    try {
        const user = auth.currentUser;
        if (user) {
            const userData = await FirebaseService.getUserDocument(user.uid);
            const nameElement = document.getElementById('userName');
            if (nameElement && userData) {
                nameElement.textContent = userData.name || user.displayName || user.email;
            }
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

/**
 * Destroy existing charts (for SPA navigation)
 */
function destroyDashboardCharts() {
    stopDemoAnimation();
    if (hrChart) { hrChart.destroy(); hrChart = null; }
    if (stressChart) { stressChart.destroy(); stressChart = null; }
    if (gsrChart) { gsrChart.destroy(); gsrChart = null; }
}

/**
 * Initialize charts with demo data
 */
function initCharts() {
    // Wait for ChartConfigs to be available
    if (typeof ChartConfigs === 'undefined') {
        console.log('ChartConfigs not ready, retrying...');
        setTimeout(initCharts, 100);
        return;
    }

    // Destroy existing charts first (for SPA re-navigation)
    destroyDashboardCharts();

    // Set demo-mode class by default (animations paused until connected)
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
        container.classList.add('demo-mode');
        container.classList.remove('live-mode');
    });

    const initialLabels = generateTimeLabels(MAX_DATA_POINTS);
    const initialHrData = generateSmoothData(MAX_DATA_POINTS, 65, 85);
    const initialStressData = generateSmoothData(MAX_DATA_POINTS, 20, 45);
    const initialGsrData = generateSmoothData(MAX_DATA_POINTS, 25, 50);

    // Heart Rate Chart
    const hrCtx = document.getElementById('hrChart');
    if (hrCtx) {
        hrChart = ChartConfigs.createHeartRateChart(hrCtx.getContext('2d'), {
            labels: initialLabels,
            values: initialHrData
        });
        console.log('HR Chart initialized');
    }

    // Stress Chart
    const stressCtx = document.getElementById('stressChart');
    if (stressCtx) {
        stressChart = ChartConfigs.createStressChart(stressCtx.getContext('2d'), {
            labels: initialLabels,
            values: initialStressData
        });
        console.log('Stress Chart initialized');
    }

    // GSR Chart
    const gsrCtx = document.getElementById('gsrChart');
    if (gsrCtx) {
        gsrChart = ChartConfigs.createGSRChart(gsrCtx.getContext('2d'), {
            labels: initialLabels,
            values: initialGsrData
        });
        console.log('GSR Chart initialized');
    }
}

/**
 * Generate time labels
 */
function generateTimeLabels(count) {
    const labels = [];
    const now = new Date();

    for (let i = count - 1; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 3000); // Every 3 seconds for demo
        labels.push(time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }

    return labels;
}

/**
 * Generate smooth random data for demo
 */
function generateSmoothData(count, min, max) {
    const data = [];
    let value = (min + max) / 2;

    for (let i = 0; i < count; i++) {
        // Smooth random walk
        const change = (Math.random() - 0.5) * 8;
        value = Math.max(min, Math.min(max, value + change));
        data.push(Math.round(value));
    }
    return data;
}

/**
 * Start demo animation (when not connected)
 */
function startDemoAnimation() {
    if (demoAnimationInterval) return;

    // Update chart containers to demo mode
    const chartContainers = document.querySelectorAll('.chart-container');
    chartContainers.forEach(container => {
        container.classList.add('demo-mode');
        container.classList.remove('live-mode');
    });

    demoAnimationInterval = setInterval(() => {
        if (isLiveMode) return;

        const now = new Date();
        const timeLabel = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        // Generate new demo values
        let newHr = 72, newStress = 30, newGsr = 35;

        // Animate heart rate chart
        if (hrChart) {
            const lastValue = hrChart.data.datasets[0].data.slice(-1)[0] || 72;
            newHr = Math.max(55, Math.min(95, lastValue + (Math.random() - 0.5) * 8));

            hrChart.data.labels.push(timeLabel);
            hrChart.data.datasets[0].data.push(Math.round(newHr));

            if (hrChart.data.labels.length > MAX_DATA_POINTS) {
                hrChart.data.labels.shift();
                hrChart.data.datasets[0].data.shift();
            }
            hrChart.update('none');
        }

        // Animate stress chart
        if (stressChart) {
            const lastValue = stressChart.data.datasets[0].data.slice(-1)[0] || 30;
            newStress = Math.max(10, Math.min(70, lastValue + (Math.random() - 0.5) * 10));

            stressChart.data.labels.push(timeLabel);
            stressChart.data.datasets[0].data.push(Math.round(newStress));

            // Update colors
            stressChart.data.datasets[0].backgroundColor = stressChart.data.datasets[0].data.map(v => {
                if (v <= 30) return 'rgba(16, 185, 129, 0.8)';
                if (v <= 60) return 'rgba(245, 158, 11, 0.8)';
                return 'rgba(239, 68, 68, 0.8)';
            });

            if (stressChart.data.labels.length > MAX_DATA_POINTS) {
                stressChart.data.labels.shift();
                stressChart.data.datasets[0].data.shift();
            }
            stressChart.update('none');
        }

        // Animate GSR chart
        if (gsrChart) {
            const lastValue = gsrChart.data.datasets[0].data.slice(-1)[0] || 35;
            newGsr = Math.max(15, Math.min(65, lastValue + (Math.random() - 0.5) * 8));

            gsrChart.data.labels.push(timeLabel);
            gsrChart.data.datasets[0].data.push(Math.round(newGsr));

            if (gsrChart.data.labels.length > MAX_DATA_POINTS) {
                gsrChart.data.labels.shift();
                gsrChart.data.datasets[0].data.shift();
            }
            gsrChart.update('none');
        }

        // Update demo live values
        const hrLive = document.getElementById('hrLiveValue');
        const stressLive = document.getElementById('stressLiveValue');
        const gsrLive = document.getElementById('gsrLiveValue');

        if (hrLive) hrLive.textContent = `~${Math.round(newHr)} BPM`;
        if (stressLive) stressLive.textContent = `~${Math.round(newStress)}%`;
        if (gsrLive) gsrLive.textContent = `~${Math.round(newGsr)}%`;

    }, 1500); // Update every 1.5 seconds for more visible animation
}

/**
 * Stop demo animation
 */
function stopDemoAnimation() {
    if (demoAnimationInterval) {
        clearInterval(demoAnimationInterval);
        demoAnimationInterval = null;
    }
}

/**
 * Set live mode (connected to device)
 */
function setLiveMode(live) {
    isLiveMode = live;

    const chartStatus = document.getElementById('chartStatus');
    const liveValues = document.querySelectorAll('.live-value');
    const chartContainers = document.querySelectorAll('.chart-container');

    if (live) {
        stopDemoAnimation();

        if (chartStatus) {
            chartStatus.innerHTML = '<i class="fas fa-circle"></i> Live';
            chartStatus.classList.remove('demo');
            chartStatus.classList.add('live');
        }

        liveValues.forEach(el => el.classList.add('active'));

        // Update chart container classes
        chartContainers.forEach(container => {
            container.classList.remove('demo-mode');
            container.classList.add('live-mode');
        });
    } else {
        startDemoAnimation();

        if (chartStatus) {
            chartStatus.innerHTML = '<i class="fas fa-circle"></i> Demo';
            chartStatus.classList.remove('live');
            chartStatus.classList.add('demo');
        }

        liveValues.forEach(el => el.classList.remove('active'));

        // Update chart container classes
        chartContainers.forEach(container => {
            container.classList.remove('live-mode');
            container.classList.add('demo-mode');
        });

        // Show demo values
        const hrLive = document.getElementById('hrLiveValue');
        const stressLive = document.getElementById('stressLiveValue');
        const gsrLive = document.getElementById('gsrLiveValue');

        if (hrLive) hrLive.textContent = '~72 BPM';
        if (stressLive) stressLive.textContent = '~30%';
        if (gsrLive) gsrLive.textContent = '~35%';
    }
}

/**
 * Load today's data from Firebase
 */
async function loadTodayData() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const readings = await FirebaseService.getHealthReadingsForRange(
            user.uid,
            firebase.firestore.Timestamp.fromDate(today),
            firebase.firestore.Timestamp.fromDate(tomorrow)
        );

        if (readings.length > 0) {
            updateChartsWithData(readings);
            const latest = readings[0];
            updateCurrentValues(latest);
        }
    } catch (error) {
        console.error('Error loading today data:', error);
    }
}

/**
 * Update charts with Firebase data
 */
function updateChartsWithData(readings) {
    const chronological = [...readings].reverse();
    const recentReadings = chronological.slice(-MAX_DATA_POINTS);

    const labels = recentReadings.map(r => {
        const date = r.readingTime?.toDate ? r.readingTime.toDate() : new Date(r.readingTime);
        return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    });

    const hrValues = recentReadings.map(r => r.hr || 0);
    const stressValues = recentReadings.map(r => r.stress || 0);
    const gsrValues = recentReadings.map(r => r.gsr || 0);

    if (hrChart) ChartConfigs.updateChart(hrChart, labels, hrValues);
    if (stressChart) ChartConfigs.updateChart(stressChart, labels, stressValues);
    if (gsrChart) ChartConfigs.updateChart(gsrChart, labels, gsrValues);
}

/**
 * Update current metric values
 */
function updateCurrentValues(data) {
    // Heart Rate
    const hrElement = document.getElementById('hrValue');
    const hrStatus = document.getElementById('hrStatus');
    if (hrElement) {
        hrElement.textContent = data.finger && data.hr > 0 ? data.hr : '--';
    }
    if (hrStatus && data.finger && data.hr > 0) {
        const status = Utils.getHeartRateStatus(data.hr);
        hrStatus.textContent = status.status;
        hrStatus.className = 'metric-status ' + status.color;
    }

    // SpO2
    const spo2Element = document.getElementById('spo2Value');
    const spo2Status = document.getElementById('spo2Status');
    if (spo2Element) {
        spo2Element.textContent = data.finger && data.spo2 > 0 ? data.spo2 : '--';
    }
    if (spo2Status && data.finger && data.spo2 > 0) {
        const status = Utils.getSpO2Status(data.spo2);
        spo2Status.textContent = status.status;
        spo2Status.className = 'metric-status ' + status.color;
    }

    // Stress
    const stressElement = document.getElementById('stressValue');
    const stressBar = document.getElementById('stressBar');
    if (stressElement) stressElement.textContent = data.stress + '%';
    if (stressBar) {
        stressBar.style.width = data.stress + '%';
        stressBar.style.backgroundColor = Utils.getStressColor(data.stress);
    }

    // GSR
    const gsrElement = document.getElementById('gsrValue');
    const gsrBar = document.getElementById('gsrBar');
    if (gsrElement) gsrElement.textContent = data.gsr + '%';
    if (gsrBar) {
        gsrBar.style.width = data.gsr + '%';
        gsrBar.style.backgroundColor = Utils.getGSRColor(data.gsr);
    }

    // Temperature
    const btElement = document.getElementById('btValue');
    if (btElement) btElement.textContent = data.bt ? data.bt.toFixed(1) : '--';

    const atElement = document.getElementById('atValue');
    if (atElement) atElement.textContent = data.at ? data.at.toFixed(1) : '--';

    // Activity
    const actElement = document.getElementById('actValue');
    const actIcon = document.getElementById('actIcon');
    if (actElement) actElement.textContent = Utils.getActivityLabel(data.act);
    if (actIcon) actIcon.className = 'fas ' + Utils.getActivityIcon(data.act);

    // Finger status
    const fingerElement = document.getElementById('fingerStatus');
    if (fingerElement) {
        fingerElement.textContent = data.finger ? 'Detected' : 'Not Detected';
        fingerElement.style.color = data.finger ? '#10b981' : '#ef4444';
    }
}

/**
 * Handle incoming BLE data (live mode)
 */
function handleDataUpdate(data) {
    // Update current values
    updateCurrentValues(data);

    // Update live value displays
    const hrLive = document.getElementById('hrLiveValue');
    const stressLive = document.getElementById('stressLiveValue');
    const gsrLive = document.getElementById('gsrLiveValue');

    if (hrLive) hrLive.textContent = data.finger && data.hr > 0 ? `${data.hr} BPM` : '-- BPM';
    if (stressLive) stressLive.textContent = `${data.stress}%`;
    if (gsrLive) gsrLive.textContent = `${data.gsr}%`;

    // Add to chart data
    const now = new Date();
    const timeLabel = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Update Heart Rate chart
    if (hrChart && data.finger && data.hr > 0) {
        hrChart.data.labels.push(timeLabel);
        hrChart.data.datasets[0].data.push(data.hr);

        if (hrChart.data.labels.length > MAX_DATA_POINTS) {
            hrChart.data.labels.shift();
            hrChart.data.datasets[0].data.shift();
        }
        hrChart.update('none');
    }

    // Update Stress chart
    if (stressChart) {
        stressChart.data.labels.push(timeLabel);
        stressChart.data.datasets[0].data.push(data.stress);

        stressChart.data.datasets[0].backgroundColor = stressChart.data.datasets[0].data.map(v => {
            if (v <= 30) return 'rgba(16, 185, 129, 0.8)';
            if (v <= 60) return 'rgba(245, 158, 11, 0.8)';
            return 'rgba(239, 68, 68, 0.8)';
        });

        if (stressChart.data.labels.length > MAX_DATA_POINTS) {
            stressChart.data.labels.shift();
            stressChart.data.datasets[0].data.shift();
        }
        stressChart.update('none');
    }

    // Update GSR chart
    if (gsrChart) {
        gsrChart.data.labels.push(timeLabel);
        gsrChart.data.datasets[0].data.push(data.gsr);

        if (gsrChart.data.labels.length > MAX_DATA_POINTS) {
            gsrChart.data.labels.shift();
            gsrChart.data.datasets[0].data.shift();
        }
        gsrChart.update('none');
    }

    // Save to Firebase (throttled)
    saveDataToFirebase(data);
}

/**
 * Save data to Firebase (throttled to once per 5 seconds)
 */
const saveDataToFirebase = Utils.throttle(async (data) => {
    try {
        const user = auth.currentUser;
        if (!user) return;

        await FirebaseService.saveHealthReading(user.uid, data);
    } catch (error) {
        console.error('Error saving to Firebase:', error);
    }
}, 5000);

/**
 * Handle BLE connection change
 */
function handleConnectionChange(connected) {
    const bleStatus = document.getElementById('bleStatus');
    const bleStatusIcon = document.getElementById('bleStatusIcon');
    const bleStatusBtn = document.getElementById('bleStatusBtn');

    setLiveMode(connected);

    if (connected) {
        if (bleStatus) bleStatus.textContent = 'Connected';
        if (bleStatusIcon) {
            bleStatusIcon.className = 'fas fa-bluetooth';
            bleStatusIcon.style.color = '#10b981';
        }
        if (bleStatusBtn) {
            bleStatusBtn.classList.add('connected');
            bleStatusBtn.classList.remove('connecting');
        }

        Utils.showToast('Connected to SYNAWATCH', 'success');
    } else {
        if (bleStatus) bleStatus.textContent = 'Disconnected';
        if (bleStatusIcon) {
            bleStatusIcon.className = 'fas fa-bluetooth';
            bleStatusIcon.style.color = '#ef4444';
        }
        if (bleStatusBtn) {
            bleStatusBtn.classList.remove('connected', 'connecting');
        }
    }
}

// Initialize on page load (for standalone dashboard.html only)
document.addEventListener('DOMContentLoaded', () => {
    // Check if running in SPA mode (app.js will handle initialization)
    const isSPAMode = document.getElementById('view-container') !== null;

    if (!isSPAMode) {
        // Standalone mode - initialize immediately
        initCharts();
        startDemoAnimation();

        document.addEventListener('authenticated', (e) => {
            initDashboard();
        });

        setTimeout(() => {
            if (typeof auth !== 'undefined' && auth.currentUser) {
                initDashboard();
            }
        }, 500);
    }
    // In SPA mode, app.js will call initCharts() and startDemoAnimation()
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    destroyDashboardCharts();
});

// Make functions globally available for SPA
window.initCharts = initCharts;
window.startDemoAnimation = startDemoAnimation;
window.stopDemoAnimation = stopDemoAnimation;
window.setLiveMode = setLiveMode;
window.destroyDashboardCharts = destroyDashboardCharts;
window.initDashboard = initDashboard;
window.handleDataUpdate = handleDataUpdate;
