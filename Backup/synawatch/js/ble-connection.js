/**
 * BLE Connection Module for SYNAWATCH
 * Handles Bluetooth Low Energy connection to ESP32 device
 */

// BLE Configuration
const BLE_CONFIG = {
    deviceName: CONFIG.BLE_DEVICE_NAME || 'SYNAWATCH',
    serviceUUID: CONFIG.BLE_SERVICE_UUID || '12345678-1234-1234-1234-123456789abc',
    characteristicUUID: CONFIG.BLE_CHARACTERISTIC_UUID || 'abcd1234-ab12-cd34-ef56-123456789abc'
};

// BLE Connection State
let bleDevice = null;
let bleServer = null;
let bleService = null;
let bleCharacteristic = null;
let isConnected = false;
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Sensor Data Storage
let sensorData = {
    hr: 0,
    spo2: 0,
    bt: 0,
    at: 0,
    ax: 0,
    ay: 0,
    az: 0,
    gx: 0,
    gy: 0,
    gz: 0,
    stress: 0,
    act: 'DIAM',
    finger: false,
    gsr: 0,
    gsrRaw: 0,
    gsrR: 0,
    gsrCal: false,
    gsrBase: 0,
    lastUpdate: null
};

// Event listeners for data updates
const dataListeners = [];
const connectionListeners = [];

/**
 * Check if Web Bluetooth API is supported
 */
function isBLESupported() {
    return 'bluetooth' in navigator;
}

/**
 * Connect to BLE device
 */
async function connectBLE() {
    // Check if BLE is supported
    if (!isBLESupported()) {
        throw new Error('Bluetooth tidak didukung di browser ini. Gunakan Chrome atau Edge.');
    }

    // Check if already connected
    if (isConnected) {
        console.log('Already connected to BLE device');
        return true;
    }

    // Check if already connecting
    if (isConnecting) {
        console.log('Connection already in progress...');
        return false;
    }

    isConnecting = true;
    updateConnectionStatus('connecting', 'Menghubungkan ke perangkat...');

    try {
        console.log('Requesting BLE device...');

        // Request device - akan membuka dialog pemilihan perangkat
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [
                { name: BLE_CONFIG.deviceName },
                { services: [BLE_CONFIG.serviceUUID] }
            ],
            optionalServices: [BLE_CONFIG.serviceUUID]
        });

        console.log('Device selected:', bleDevice.name);

        // Listen for disconnection
        bleDevice.addEventListener('gattserverdisconnected', onDisconnected);

        // Connect to GATT server
        console.log('Connecting to GATT server...');
        bleServer = await bleDevice.gatt.connect();
        console.log('GATT server connected');

        // Get service
        console.log('Getting service...');
        bleService = await bleServer.getPrimaryService(BLE_CONFIG.serviceUUID);
        console.log('Service obtained');

        // Get characteristic
        console.log('Getting characteristic...');
        bleCharacteristic = await bleService.getCharacteristic(BLE_CONFIG.characteristicUUID);
        console.log('Characteristic obtained');

        // Subscribe to notifications
        console.log('Subscribing to notifications...');
        await bleCharacteristic.startNotifications();
        bleCharacteristic.addEventListener('characteristicvaluechanged', handleDataNotification);
        console.log('Subscribed to notifications');

        // Connection successful
        isConnected = true;
        isConnecting = false;
        reconnectAttempts = 0;
        updateConnectionStatus('connected', 'Terhubung ke ' + bleDevice.name);
        notifyConnectionChange(true);

        // Start auto-saving health data to Firestore
        if (typeof Analytics !== 'undefined') {
            Analytics.startAutoSave();
        }

        // Show auto-recording status
        showAutoRecordingStatus(true);

        // Start recording timer
        startRecordingTimer();

        console.log('BLE connection established successfully');
        return true;

    } catch (error) {
        isConnecting = false;
        console.error('BLE connection error:', error);

        let errorMessage = 'Gagal menghubungkan ke perangkat.';

        if (error.name === 'NotFoundError') {
            errorMessage = 'Perangkat tidak ditemukan. Pastikan SYNAWATCH sudah menyala.';
        } else if (error.name === 'SecurityError') {
            errorMessage = 'Izin Bluetooth ditolak.';
        } else if (error.name === 'NetworkError') {
            errorMessage = 'Gagal terhubung. Coba lagi.';
        } else if (error.message.includes('User cancelled')) {
            errorMessage = 'Pemilihan perangkat dibatalkan.';
        }

        updateConnectionStatus('error', errorMessage);
        notifyConnectionChange(false);
        return false;
    }
}

/**
 * Handle incoming data notification from BLE
 */
function handleDataNotification(event) {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const jsonStr = decoder.decode(value);

    try {
        const data = JSON.parse(jsonStr);

        // ============================================
        // HITUNG MAGNITUDE IMU DARI AKSELEROMETER
        // Digunakan untuk filter validitas data stres
        // ============================================
        const imuMagnitude = Math.sqrt(
            Math.pow(data.ax || 0, 2) +
            Math.pow(data.ay || 0, 2) +
            Math.pow(data.az || 0, 2)
        );

        // ============================================
        // ANALISIS STRES
        // Panggil fungsi analyzeStress setiap data baru masuk
        // ============================================
        const stressAnalysis = Utils.analyzeStress({
            hr: data.hr || 0,
            gsr: data.gsrRaw || data.gsr || 0,  // Gunakan raw GSR jika ada
            suhu: data.bt || 0,                  // Body temperature
            spo2: data.spo2 || 0,
            imu: imuMagnitude
        });

        // Update sensor data dengan hasil analisis stres
        sensorData = {
            ...sensorData,
            ...data,
            imuMagnitude: imuMagnitude,
            // Override stress dengan hasil kalkulasi baru
            stress: stressAnalysis.valid ? stressAnalysis.score : sensorData.stress,
            stressAnalysis: stressAnalysis,  // Simpan detail analisis
            lastUpdate: Date.now()
        };

        // Notify listeners
        dataListeners.forEach(listener => {
            try {
                listener(sensorData);
            } catch (error) {
                console.error('Error in data listener:', error);
            }
        });

        // Update UI
        updateUI(sensorData);

        // Auto-save to Firestore (triggered on each data receive)
        if (typeof Analytics !== 'undefined' && Analytics.isAutoSaveEnabled) {
            Analytics.onBLEDataReceived(sensorData);
        }

    } catch (error) {
        console.error('Error parsing BLE data:', error, jsonStr);
    }
}

/**
 * Update UI with sensor data
 */
function updateUI(data) {
    // Heart Rate - tampilkan "--" jika finger=false atau hr=0
    const hrElement = document.getElementById('hrValue');
    if (hrElement) {
        hrElement.textContent = (!data.finger || data.hr === 0) ? '--' : data.hr;
    }

    // SpO2 - tampilkan "--" jika finger=false atau spo2=0
    const spo2Element = document.getElementById('spo2Value');
    if (spo2Element) {
        spo2Element.textContent = (!data.finger || data.spo2 === 0) ? '--' : data.spo2;
    }

    // Body Temperature - 1 desimal
    const btElement = document.getElementById('btValue');
    if (btElement) {
        btElement.textContent = data.bt ? data.bt.toFixed(1) : '--';
    }

    // Ambient Temperature - 1 desimal
    const atElement = document.getElementById('atValue');
    if (atElement) {
        atElement.textContent = data.at ? data.at.toFixed(1) : '--';
    }

    // ============================================
    // STRESS LEVEL DISPLAY
    // Menampilkan hasil analisis stres dengan detail
    // ============================================
    const stressElement = document.getElementById('stressValue');
    const stressBar = document.getElementById('stressBar');
    const stressLabelElement = document.getElementById('stressLabel');
    const stressAnalysis = data.stressAnalysis;

    if (stressAnalysis) {
        // Jika data valid, tampilkan skor dan label
        if (stressAnalysis.valid) {
            if (stressElement) stressElement.textContent = stressAnalysis.score + '%';
            if (stressBar) {
                stressBar.style.width = stressAnalysis.score + '%';
                stressBar.style.backgroundColor = stressAnalysis.color;
            }
            if (stressLabelElement) {
                stressLabelElement.textContent = stressAnalysis.label;
                stressLabelElement.style.color = stressAnalysis.color;
            }
        } else {
            // Data tidak valid (user bergerak)
            if (stressElement) stressElement.textContent = '--';
            if (stressBar) {
                stressBar.style.width = '0%';
                stressBar.style.backgroundColor = stressAnalysis.color;
            }
            if (stressLabelElement) {
                stressLabelElement.textContent = stressAnalysis.label;
                stressLabelElement.style.color = stressAnalysis.color;
            }
        }
    } else {
        // Fallback ke metode lama jika tidak ada analisis
        if (stressElement) stressElement.textContent = data.stress + '%';
        if (stressBar) {
            stressBar.style.width = data.stress + '%';
            stressBar.style.backgroundColor = Utils.getStressColor(data.stress);
        }
    }

    // GSR Level - progress bar dengan warna dinamis
    const gsrElement = document.getElementById('gsrValue');
    const gsrBar = document.getElementById('gsrBar');
    if (gsrElement) gsrElement.textContent = data.gsr + '%';
    if (gsrBar) {
        gsrBar.style.width = data.gsr + '%';
        gsrBar.style.backgroundColor = Utils.getGSRColor(data.gsr);
    }

    // Activity
    const actElement = document.getElementById('actValue');
    if (actElement) actElement.textContent = Utils.getActivityLabel(data.act);

    const actIcon = document.getElementById('actIcon');
    if (actIcon) actIcon.className = 'fas ' + Utils.getActivityIcon(data.act);

    // Finger Status
    const fingerElement = document.getElementById('fingerStatus');
    if (fingerElement) {
        fingerElement.textContent = data.finger ? 'Detected' : 'Not Detected';
        fingerElement.style.color = data.finger ? '#10b981' : '#ef4444';
    }

    // Health Score
    const healthScoreElement = document.getElementById('healthScore');
    if (healthScoreElement && data.finger) {
        const score = Utils.calculateHealthScore(data);
        healthScoreElement.textContent = score;
    }

    // Update status badges
    updateStatusBadges(data);
}

/**
 * Update status badges based on data
 */
function updateStatusBadges(data) {
    // Heart Rate Status
    const hrStatus = document.getElementById('hrStatus');
    if (hrStatus && data.finger && data.hr > 0) {
        const status = Utils.getHeartRateStatus(data.hr);
        hrStatus.textContent = status.status;
        hrStatus.className = 'metric-status ' + status.color;
    }

    // SpO2 Status
    const spo2Status = document.getElementById('spo2Status');
    if (spo2Status && data.finger && data.spo2 > 0) {
        const status = Utils.getSpO2Status(data.spo2);
        spo2Status.textContent = status.status;
        spo2Status.className = 'metric-status ' + status.color;
    }

    // Stress Status - menggunakan hasil analisis stres baru
    const stressStatus = document.getElementById('stressStatus');
    if (stressStatus) {
        const stressAnalysis = data.stressAnalysis;
        if (stressAnalysis) {
            if (stressAnalysis.valid) {
                // Mapping label ke warna class
                const colorClass = stressAnalysis.level === 0 ? 'success' :
                                   stressAnalysis.level === 1 ? 'warning' :
                                   stressAnalysis.level === 2 ? 'orange' : 'danger';
                stressStatus.textContent = stressAnalysis.label;
                stressStatus.className = 'metric-status ' + colorClass;
            } else {
                stressStatus.textContent = stressAnalysis.label;
                stressStatus.className = 'metric-status gray';
            }
        } else {
            // Fallback ke metode lama
            const status = Utils.getStressStatus(data.stress);
            stressStatus.textContent = status.status;
            stressStatus.className = 'metric-status ' + status.color;
        }
    }

    // GSR Status
    const gsrStatus = document.getElementById('gsrStatusBadge');
    if (gsrStatus) {
        const status = Utils.getGSRStatus(data.gsr);
        gsrStatus.textContent = status.status;
        gsrStatus.className = 'metric-status ' + status.color;
    }
}

/**
 * Disconnect from BLE device
 */
async function disconnectBLE() {
    if (!isConnected && !isConnecting) {
        return;
    }

    try {
        // Stop notifications
        if (bleCharacteristic) {
            await bleCharacteristic.stopNotifications();
            bleCharacteristic.removeEventListener('characteristicvaluechanged', handleDataNotification);
        }

        // Disconnect from device
        if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected) {
            await bleDevice.gatt.disconnect();
        }

        console.log('BLE disconnected');
    } catch (error) {
        console.error('Error disconnecting:', error);
    } finally {
        // Stop auto-saving health data
        if (typeof Analytics !== 'undefined') {
            Analytics.stopAutoSave();
        }

        resetConnectionState();
        updateConnectionStatus('disconnected', 'Terputus dari perangkat');
        notifyConnectionChange(false);
    }
}

/**
 * Handle disconnection event
 */
let isReconnecting = false;

function onDisconnected(event) {
    // Prevent re-entry during reconnection attempts
    if (isReconnecting) return;

    console.log('Device disconnected');
    resetConnectionState();
    updateConnectionStatus('disconnected', 'Terputus dari perangkat');
    notifyConnectionChange(false);

    attemptReconnection();
}

function attemptReconnection() {
    if (isReconnecting || isConnected || !bleDevice) return;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts = 0;
        isReconnecting = false;
        updateConnectionStatus('error', 'Gagal menghubungkan kembali. Silakan coba manual.');
        return;
    }

    isReconnecting = true;
    reconnectAttempts++;
    console.log(`Attempting reconnection (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
    updateConnectionStatus('connecting', `Mencoba menghubungkan kembali (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);

    setTimeout(async () => {
        try {
            bleServer = await bleDevice.gatt.connect();
            bleService = await bleServer.getPrimaryService(BLE_CONFIG.serviceUUID);
            bleCharacteristic = await bleService.getCharacteristic(BLE_CONFIG.characteristicUUID);
            await bleCharacteristic.startNotifications();
            bleCharacteristic.addEventListener('characteristicvaluechanged', handleDataNotification);

            isConnected = true;
            reconnectAttempts = 0;
            isReconnecting = false;
            updateConnectionStatus('connected', 'Terhubung kembali ke ' + bleDevice.name);
            notifyConnectionChange(true);
        } catch (error) {
            console.error('Reconnection failed:', error.message);
            isReconnecting = false;
            // Retry with exponential backoff instead of re-triggering onDisconnected
            attemptReconnection();
        }
    }, 2000 * reconnectAttempts); // Exponential backoff: 2s, 4s, 6s, 8s, 10s
}

// Recording timer variables
let recordingTimerInterval = null;
let recordingStartTime = null;

/**
 * Show/hide auto-recording status card
 */
function showAutoRecordingStatus(show) {
    // Check both possible IDs (dashboard and health page)
    const statusCard = document.getElementById('autoRecordStatus');
    if (statusCard) {
        statusCard.style.display = show ? 'block' : 'none';
    }
}

/**
 * Start recording timer
 */
function startRecordingTimer() {
    recordingStartTime = Date.now();

    // Clear existing timer
    if (recordingTimerInterval) {
        clearInterval(recordingTimerInterval);
    }

    // Update timer every second
    recordingTimerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');

        // Update all possible timer elements
        const timerEls = [
            document.getElementById('recordingTimer'),
            document.getElementById('healthRecordingTimer')
        ];
        timerEls.forEach(el => {
            if (el) el.textContent = `${minutes}:${seconds}`;
        });

        // Update reading count from Analytics
        const countEls = [
            document.getElementById('recordingCount'),
            document.getElementById('healthRecordingCount')
        ];
        countEls.forEach(el => {
            if (el && typeof Analytics !== 'undefined') {
                el.textContent = `${Analytics.totalReadings} readings`;
            }
        });
    }, 1000);
}

/**
 * Stop recording timer
 */
function stopRecordingTimer() {
    if (recordingTimerInterval) {
        clearInterval(recordingTimerInterval);
        recordingTimerInterval = null;
    }
}

/**
 * Reset connection state
 */
function resetConnectionState() {
    isConnected = false;
    isConnecting = false;
    bleCharacteristic = null;
    bleService = null;
    bleServer = null;

    // Hide auto-recording status and stop timer
    showAutoRecordingStatus(false);
    stopRecordingTimer();
}

/**
 * Update connection status UI
 */
function updateConnectionStatus(status, message) {
    const event = new CustomEvent('bleStatusChange', {
        detail: { status, message }
    });
    document.dispatchEvent(event);

    // Hide/show BLE card based on connection status
    const bleCard = document.getElementById('bleCard');
    if (bleCard) {
        bleCard.style.display = status === 'connected' ? 'none' : 'block';
    }

    // Update status indicator if exists
    const statusElement = document.getElementById('bleStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = 'ble-status ' + status;
    }

    const statusIcon = document.getElementById('bleStatusIcon');
    if (statusIcon) {
        if (status === 'connected') {
            statusIcon.className = 'fas fa-bluetooth';
            statusIcon.style.color = '#10b981';
        } else if (status === 'connecting') {
            statusIcon.className = 'fas fa-spinner fa-spin';
            statusIcon.style.color = '#f59e0b';
        } else {
            statusIcon.className = 'fas fa-bluetooth';
            statusIcon.style.color = '#ef4444';
        }
    }

    // Update connect button
    const connectBtn = document.getElementById('bleConnectBtn');
    if (connectBtn) {
        if (status === 'connected') {
            connectBtn.innerHTML = '<i class="fas fa-bluetooth"></i> Disconnect';
            connectBtn.classList.remove('btn-primary');
            connectBtn.classList.add('btn-danger');
        } else if (status === 'connecting') {
            connectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
            connectBtn.disabled = true;
        } else {
            connectBtn.innerHTML = '<i class="fas fa-bluetooth"></i> Connect';
            connectBtn.classList.remove('btn-danger');
            connectBtn.classList.add('btn-primary');
            connectBtn.disabled = false;
        }
    }
}

/**
 * Notify connection change listeners
 */
function notifyConnectionChange(connected) {
    connectionListeners.forEach(listener => {
        try {
            listener(connected);
        } catch (error) {
            console.error('Error in connection listener:', error);
        }
    });
}

/**
 * Add data listener
 */
function onDataUpdate(callback) {
    dataListeners.push(callback);
}

/**
 * Remove data listener
 */
function offDataUpdate(callback) {
    const index = dataListeners.indexOf(callback);
    if (index > -1) {
        dataListeners.splice(index, 1);
    }
}

/**
 * Add connection change listener
 */
function onConnectionChange(callback) {
    connectionListeners.push(callback);
}

/**
 * Remove connection change listener
 */
function offConnectionChange(callback) {
    const index = connectionListeners.indexOf(callback);
    if (index > -1) {
        connectionListeners.splice(index, 1);
    }
}

/**
 * Get current sensor data
 */
function getSensorData() {
    return { ...sensorData };
}

/**
 * Get connection status
 */
function getConnectionStatus() {
    return {
        isConnected,
        isConnecting,
        deviceName: bleDevice?.name || null
    };
}

/**
 * Toggle connection
 */
async function toggleConnection() {
    if (isConnected) {
        await disconnectBLE();
    } else {
        await connectBLE();
    }
}

// Export functions
window.BLEConnection = {
    connect: connectBLE,
    disconnect: disconnectBLE,
    toggle: toggleConnection,
    isSupported: isBLESupported,
    isConnected: () => isConnected,
    getSensorData,
    getConnectionStatus,
    onConnectionChange,
    offConnectionChange,
    onDataUpdate,
    offDataUpdate
};
