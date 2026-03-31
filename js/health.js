/**
 * SYNAWATCH - Health Monitoring Page Logic
 * Modern professional health monitoring interface
 */

// Recording timer
let healthRecordingInterval = null;
let healthRecordingStartTime = null;
let healthReadingCount = 0;

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
    updateConnectionUI(status.isConnected);

    if (status.isConnected) {
        showAutoRecordStatus(true);
        startHealthRecordingTimer();
    }

    // Initialize gauges at 0
    updateStressGauge(0);
    updateGSRGauge(0);
}

/**
 * Handle incoming health data
 */
function handleHealthDataUpdate(data) {
    healthReadingCount++;

    // Update Heart Rate display and ring
    updateHeartRateDisplay(data);

    // Update SpO2
    updateSpO2Display(data);

    // Update Temperature
    updateTemperatureDisplay(data);

    // Update Activity
    updateActivityDisplay(data);

    // Update Stress gauge
    updateStressDisplay(data);

    // Update GSR gauge
    updateGSRDisplay(data);

    // Update finger status
    updateFingerStatus(data.finger);

    // Update recording count
    const countEl = document.getElementById('recordingCount');
    if (countEl) {
        countEl.textContent = `${healthReadingCount} readings`;
    }
}

/**
 * Update Heart Rate display with animated ring
 */
function updateHeartRateDisplay(data) {
    const hrValue = document.getElementById('hrValue');
    const hrStatus = document.getElementById('hrStatus');
    const hrRing = document.getElementById('hrRingProgress');

    if (data.finger && data.hr > 0) {
        if (hrValue) hrValue.textContent = data.hr;

        // Update ring progress (0-200 BPM range)
        if (hrRing) {
            const percentage = Math.min(data.hr / 200, 1);
            const circumference = 2 * Math.PI * 90;
            const offset = circumference - (percentage * circumference);
            hrRing.style.strokeDashoffset = offset;

            // Change color based on HR
            if (data.hr < 60) {
                hrRing.style.stroke = '#3b82f6'; // Low - blue
            } else if (data.hr <= 100) {
                hrRing.style.stroke = '#10b981'; // Normal - green
            } else if (data.hr <= 140) {
                hrRing.style.stroke = '#f59e0b'; // Elevated - yellow
            } else {
                hrRing.style.stroke = '#ef4444'; // High - red
            }
        }

        // Update status
        if (hrStatus) {
            const status = Utils.getHeartRateStatus(data.hr);
            hrStatus.innerHTML = `<span class="status-dot" style="background: ${getStatusColor(status.color)}"></span><span>${status.status}</span>`;
            hrStatus.className = 'hr-status ' + status.color;
        }
    } else {
        if (hrValue) hrValue.textContent = '--';
        if (hrRing) hrRing.style.strokeDashoffset = 565.48;
        if (hrStatus) {
            hrStatus.innerHTML = `<span class="status-dot"></span><span>${t('status.waiting_data')}</span>`;
            hrStatus.className = 'hr-status';
        }
    }
}

/**
 * Update SpO2 display
 */
function updateSpO2Display(data) {
    const spo2Value = document.getElementById('spo2Value');
    const spo2Status = document.getElementById('spo2Status');

    if (data.finger && data.spo2 > 0) {
        if (spo2Value) spo2Value.textContent = data.spo2;

        if (spo2Status) {
            const status = Utils.getSpO2Status(data.spo2);
            spo2Status.textContent = status.status;
            spo2Status.className = 'vital-badge ' + status.color;
        }
    } else {
        if (spo2Value) spo2Value.textContent = '--';
        if (spo2Status) {
            spo2Status.textContent = '--';
            spo2Status.className = 'vital-badge';
        }
    }
}

/**
 * Update Temperature displays
 */
function updateTemperatureDisplay(data) {
    const btValue = document.getElementById('btValue');
    const atValue = document.getElementById('atValue');
    const tempStatus = document.getElementById('tempStatus');

    if (btValue) {
        btValue.textContent = data.bt ? data.bt.toFixed(1) : '--';
    }

    if (atValue) {
        atValue.textContent = data.at ? data.at.toFixed(1) : '--';
    }

    if (tempStatus && data.bt) {
        if (data.bt >= 36.1 && data.bt <= 37.2) {
            tempStatus.textContent = t('status.normal');
            tempStatus.className = 'vital-badge normal';
        } else if (data.bt > 37.2 && data.bt <= 38) {
            tempStatus.textContent = t('status.elevated');
            tempStatus.className = 'vital-badge warning';
        } else if (data.bt > 38) {
            tempStatus.textContent = t('status.fever');
            tempStatus.className = 'vital-badge danger';
        } else {
            tempStatus.textContent = t('status.low');
            tempStatus.className = 'vital-badge warning';
        }
    }
}

/**
 * Update Activity display
 */
function updateActivityDisplay(data) {
    const actValue = document.getElementById('actValue');
    const actIcon = document.getElementById('actIcon');

    if (actValue) {
        actValue.textContent = Utils.getActivityLabel(data.act);
    }

    if (actIcon) {
        actIcon.className = 'fas ' + Utils.getActivityIcon(data.act);
    }
}

/**
 * Update Stress display with gauge
 */
function updateStressDisplay(data) {
    const stressValue = document.getElementById('stressValue');
    const stressStatus = document.getElementById('stressStatus');
    const stressTip = document.getElementById('stressTip');

    if (stressValue) stressValue.textContent = data.stress || 0;

    updateStressGauge(data.stress || 0);

    if (stressStatus) {
        const status = Utils.getStressStatus(data.stress);
        stressStatus.textContent = status.status;

        if (data.stress <= 30) {
            stressStatus.className = 'wellness-status';
        } else if (data.stress <= 60) {
            stressStatus.className = 'wellness-status moderate';
        } else {
            stressStatus.className = 'wellness-status high';
        }
    }

    if (stressTip) {
        if (data.stress <= 30) {
            stressTip.textContent = t('health.doing_great');
        } else if (data.stress <= 60) {
            stressTip.textContent = t('health.tip_break');
        } else {
            stressTip.textContent = t('health.tip_breathing');
        }
    }
}

/**
 * Update GSR display with gauge
 */
function updateGSRDisplay(data) {
    const gsrValue = document.getElementById('gsrValue');
    const gsrStatus = document.getElementById('gsrStatusBadge');
    const gsrTip = document.getElementById('gsrTip');

    if (gsrValue) gsrValue.textContent = data.gsr || 0;

    updateGSRGauge(data.gsr || 0);

    if (gsrStatus) {
        const status = Utils.getGSRStatus(data.gsr);
        gsrStatus.textContent = status.status;

        if (data.gsr <= 30) {
            gsrStatus.className = 'wellness-status';
        } else if (data.gsr <= 60) {
            gsrStatus.className = 'wellness-status moderate';
        } else {
            gsrStatus.className = 'wellness-status high';
        }
    }

    if (gsrTip) {
        if (data.gsr <= 30) {
            gsrTip.textContent = "Skin conductance is normal.";
        } else if (data.gsr <= 60) {
            gsrTip.textContent = "Slight emotional arousal detected.";
        } else {
            gsrTip.textContent = "High arousal - try to relax.";
        }
    }
}

/**
 * Update stress gauge SVG
 */
function updateStressGauge(value) {
    const gauge = document.getElementById('stressGauge');
    if (!gauge) return;

    const circumference = 2 * Math.PI * 54;
    const percentage = Math.min(value / 100, 1);
    const offset = circumference - (percentage * circumference);
    gauge.style.strokeDashoffset = offset;

    // Change color based on stress level
    if (value <= 30) {
        gauge.style.stroke = '#10b981';
    } else if (value <= 60) {
        gauge.style.stroke = '#f59e0b';
    } else {
        gauge.style.stroke = '#ef4444';
    }
}

/**
 * Update GSR gauge SVG
 */
function updateGSRGauge(value) {
    const gauge = document.getElementById('gsrGauge');
    if (!gauge) return;

    const circumference = 2 * Math.PI * 54;
    const percentage = Math.min(value / 100, 1);
    const offset = circumference - (percentage * circumference);
    gauge.style.strokeDashoffset = offset;

    // Change color based on GSR level
    if (value <= 30) {
        gauge.style.stroke = '#8b5cf6';
    } else if (value <= 60) {
        gauge.style.stroke = '#6366f1';
    } else {
        gauge.style.stroke = '#ec4899';
    }
}

/**
 * Update finger status
 */
function updateFingerStatus(detected) {
    const fingerStatus = document.getElementById('fingerStatus');
    if (!fingerStatus) return;

    if (detected) {
        fingerStatus.innerHTML = `<i class="fas fa-check-circle" style="color: #10b981;"></i> ${t('ble.finger_detected')}`;
    } else {
        fingerStatus.textContent = t('ble.place_finger');
    }
}

/**
 * Get status color
 */
function getStatusColor(colorClass) {
    const colors = {
        'success': '#10b981',
        'warning': '#f59e0b',
        'danger': '#ef4444',
        'info': '#3b82f6',
        'gray': '#94a3b8'
    };
    return colors[colorClass] || colors.gray;
}

/**
 * Handle BLE connection change
 */
function handleHealthConnectionChange(connected) {
    updateConnectionUI(connected);

    if (connected) {
        Utils.showToast(t('ble.connected'), 'success');
        showAutoRecordStatus(true);
        startHealthRecordingTimer();
    } else {
        Utils.showToast(t('ble.disconnected'), 'error');
        showAutoRecordStatus(false);
        stopHealthRecordingTimer();
    }
}

/**
 * Update connection UI elements
 */
function updateConnectionUI(connected) {
    const bleBtn = document.getElementById('bleConnectBtn');
    const bleStatusText = document.getElementById('bleStatusText');
    const bleIndicator = document.getElementById('bleIndicator');
    const liveIndicator = document.getElementById('liveIndicator');

    if (bleBtn) {
        if (connected) {
            bleBtn.classList.add('connected');
        } else {
            bleBtn.classList.remove('connected');
        }
    }

    if (bleStatusText) {
        bleStatusText.textContent = connected ? t('status.connected') : t('ble.connect');
    }

    if (liveIndicator) {
        if (connected) {
            liveIndicator.classList.remove('offline');
        } else {
            liveIndicator.classList.add('offline');
        }
    }
}

/**
 * Show/hide auto record status
 */
function showAutoRecordStatus(show) {
    const statusCard = document.getElementById('autoRecordStatus');
    if (statusCard) {
        statusCard.style.display = show ? 'flex' : 'none';
    }
}

/**
 * Start health recording timer
 */
function startHealthRecordingTimer() {
    healthRecordingStartTime = Date.now();
    healthReadingCount = 0;

    if (healthRecordingInterval) {
        clearInterval(healthRecordingInterval);
    }

    healthRecordingInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - healthRecordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');

        const timerEl = document.getElementById('recordingTimer');
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

    const timerEl = document.getElementById('recordingTimer');
    if (timerEl) {
        timerEl.textContent = '00:00';
    }

    const countEl = document.getElementById('recordingCount');
    if (countEl) {
        countEl.textContent = t('health.readings_count', { count: '0' });
    }

    healthReadingCount = 0;
}

// Make function globally available
window.initHealthPage = initHealthPage;

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
