/**
 * SYNAWATCH - Health Monitoring Page Logic
 * Realtime charts removed - now only on dashboard
 * Data auto-saves to Firebase when connected
 */

// Recording timer
let healthRecordingInterval = null;
let healthRecordingStartTime = null;

/**
 * Initialize health page
 */
function initHealthPage() {
    // Listen for BLE data updates
    BLEConnection.onDataUpdate(handleHealthDataUpdate);

    // Listen for connection changes
    BLEConnection.onConnectionChange(handleHealthConnectionChange);

    // Check initial connection status
    const status = BLEConnection.getConnectionStatus();
    updateBLECardVisibility(status.isConnected);

    if (status.isConnected) {
        showAutoRecordStatus(true);
        startHealthRecordingTimer();
    }
}

/**
 * Handle incoming health data
 */
function handleHealthDataUpdate(data) {
    // Update GSR raw value
    const gsrRawElement = document.getElementById('gsrRaw');
    if (gsrRawElement) {
        gsrRawElement.textContent = data.gsrRaw || '--';
    }

    // Update GSR resistance
    const gsrResistance = document.getElementById('gsrResistance');
    if (gsrResistance && data.gsrR) {
        gsrResistance.textContent = (data.gsrR / 1000).toFixed(1) + ' kΩ';
    }

    // Update GSR baseline
    const gsrBaseline = document.getElementById('gsrBaseline');
    if (gsrBaseline && data.gsrBase) {
        gsrBaseline.textContent = (data.gsrBase / 1000).toFixed(1) + ' kΩ';
    }

    // Update GSR calibration status
    const gsrCalStatus = document.getElementById('gsrCalStatus');
    if (gsrCalStatus) {
        if (data.gsrCal) {
            gsrCalStatus.textContent = 'Calibrated';
            gsrCalStatus.style.color = 'var(--success-500)';
        } else {
            gsrCalStatus.textContent = 'Calibrating...';
            gsrCalStatus.style.color = 'var(--warning-500)';
        }
    }

    // Update accelerometer values
    const axElement = document.getElementById('axValue');
    const ayElement = document.getElementById('ayValue');
    const azElement = document.getElementById('azValue');
    if (axElement) axElement.textContent = (data.ax || 0).toFixed(2);
    if (ayElement) ayElement.textContent = (data.ay || 0).toFixed(2);
    if (azElement) azElement.textContent = (data.az || 0).toFixed(2);

    // Update gyroscope values
    const gxElement = document.getElementById('gxValue');
    const gyElement = document.getElementById('gyValue');
    const gzElement = document.getElementById('gzValue');
    if (gxElement) gxElement.textContent = (data.gx || 0).toFixed(1);
    if (gyElement) gyElement.textContent = (data.gy || 0).toFixed(1);
    if (gzElement) gzElement.textContent = (data.gz || 0).toFixed(1);

    // Update finger status in hero section
    const fingerStatusElement = document.getElementById('fingerStatus');
    if (fingerStatusElement) {
        if (data.finger) {
            fingerStatusElement.innerHTML = '<i class="fas fa-check-circle"></i> <span style="color: #10b981;">Finger Detected</span>';
        } else {
            fingerStatusElement.innerHTML = '<i class="fas fa-fingerprint"></i> <span>Place finger on sensor</span>';
        }
    }

    // Update recording count
    if (typeof Analytics !== 'undefined') {
        const countEl = document.getElementById('healthRecordingCount');
        if (countEl) {
            countEl.textContent = `${Analytics.totalReadings} readings`;
        }
    }
}

/**
 * Handle BLE connection change
 */
function handleHealthConnectionChange(connected) {
    updateBLECardVisibility(connected);

    if (connected) {
        Utils.showToast('Connected to SYNAWATCH', 'success');
        showAutoRecordStatus(true);
        startHealthRecordingTimer();
    } else {
        Utils.showToast('Disconnected from device', 'error');
        showAutoRecordStatus(false);
        stopHealthRecordingTimer();
    }
}

/**
 * Update BLE card visibility
 */
function updateBLECardVisibility(connected) {
    const bleCard = document.getElementById('bleCard');
    if (bleCard) {
        bleCard.style.display = connected ? 'none' : 'block';
    }
}

/**
 * Show/hide auto record status
 */
function showAutoRecordStatus(show) {
    const statusCard = document.getElementById('autoRecordStatus');
    if (statusCard) {
        statusCard.style.display = show ? 'block' : 'none';
    }
}

/**
 * Start health recording timer
 */
function startHealthRecordingTimer() {
    healthRecordingStartTime = Date.now();

    if (healthRecordingInterval) {
        clearInterval(healthRecordingInterval);
    }

    healthRecordingInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - healthRecordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');

        const timerEl = document.getElementById('healthRecordingTimer');
        if (timerEl) {
            timerEl.textContent = `${minutes}:${seconds}`;
        }
    }, 1000);
}

/**
 * Stop health recording timer
 */
function stopHealthRecordingTimer() {
    if (healthRecordingInterval) {
        clearInterval(healthRecordingInterval);
        healthRecordingInterval = null;
    }

    const timerEl = document.getElementById('healthRecordingTimer');
    if (timerEl) {
        timerEl.textContent = '00:00';
    }

    const countEl = document.getElementById('healthRecordingCount');
    if (countEl) {
        countEl.textContent = '0 readings';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('authenticated', (e) => {
        initHealthPage();
    });

    if (typeof auth !== 'undefined' && auth.currentUser) {
        initHealthPage();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (healthRecordingInterval) {
        clearInterval(healthRecordingInterval);
    }
});
