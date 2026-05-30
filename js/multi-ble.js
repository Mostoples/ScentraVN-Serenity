const MultiDevice = {
  state: {
    muse:   { isConnected: false, isConnecting: false },
    bp:     { device: null, isConnected: false, isConnecting: false },
    vitals: { isConnected: false, isConnecting: false }
  },
  data: {
    eeg:    { delta: 0, theta: 0, alpha: 0, smr: 0, beta: 0, gamma: 0, stressLevel: 'low', focusState: 'low', battery: null },
    bp:     { sys: 0, dia: 0, lastUpdate: null },
    vitals: { hr: 0, spo2: 0, finger: false, lastUpdate: null }
  },

  _callbacks: {
    eeg: [],
    bp: [],
    vitals: [],
    connection: []
  },

  _vitalsRegistered: false,

  onEEGData(cb) {
    this._callbacks.eeg.push(cb);
  },

  onBPData(cb) {
    this._callbacks.bp.push(cb);
  },

  onVitalsData(cb) {
    this._callbacks.vitals.push(cb);
  },

  onConnectionChange(cb) {
    this._callbacks.connection.push(cb);
  },

  _emit(type, data) {
    this._callbacks[type].forEach(cb => cb(data));
  },

  _emitConnection(device, status) {
    this._callbacks.connection.forEach(cb => cb({ device, status }));
  },

  async connectMuse() {
    if (this.state.muse.isConnected) {
      this.disconnectMuse();
      return;
    }

    this.state.muse.isConnecting = true;
    this._emitConnection('muse', 'connecting');

    // Register callbacks every time (MuseEEG uses single-slot callbacks — overwrite is safe)
    MuseEEG.onMetrics(metrics => {
      const { powers, stressLevel, focusState, battery } = metrics;
      this.data.eeg.delta = powers.delta;
      this.data.eeg.theta = powers.theta;
      this.data.eeg.alpha = powers.alpha;
      this.data.eeg.smr = powers.smr;
      this.data.eeg.beta = powers.beta;
      this.data.eeg.gamma = powers.gamma;
      this.data.eeg.stressLevel = stressLevel;
      this.data.eeg.focusState = focusState;
      this.data.eeg.battery = battery;
      this._emit('eeg', { ...this.data.eeg });
    });

    MuseEEG.onConnection(({ status }) => {
      if (status === 'connected') {
        this.state.muse.isConnected = true;
        this.state.muse.isConnecting = false;
        this._emitConnection('muse', 'connected');
      } else if (status === 'disconnected') {
        this.state.muse.isConnected = false;
        this.state.muse.isConnecting = false;
        this._emitConnection('muse', 'disconnected');
      } else if (status === 'connecting') {
        this.state.muse.isConnecting = true;
        this._emitConnection('muse', 'connecting');
      } else if (status === 'error') {
        this.state.muse.isConnected = false;
        this.state.muse.isConnecting = false;
        this._emitConnection('muse', 'error');
      } else if (status === 'simulation') {
        this.state.muse.isConnected = true;
        this.state.muse.isConnecting = false;
        this._emitConnection('muse', 'connected');
      }
    });

    MuseEEG.onError(msg => {
      this.state.muse.isConnected = false;
      this.state.muse.isConnecting = false;
      this._emitConnection('muse', 'error');
      if (typeof Utils !== 'undefined') Utils.showToast(`Muse EEG: ${msg}`, 'error');
    });

    const ok = await MuseEEG.connect();
    // connect() returns false (no throw) on failure — reset state explicitly
    if (!ok && this.state.muse.isConnecting) {
      this.state.muse.isConnecting = false;
      this._emitConnection('muse', 'error');
    }
  },

  disconnectMuse() {
    MuseEEG.disconnect();
    this.state.muse.isConnected = false;
    this.state.muse.isConnecting = false;
    this._emitConnection('muse', 'disconnected');
  },

  async connectBP() {
    if (this.state.bp.isConnected) {
      this.disconnectBP();
      return;
    }

    this.state.bp.isConnecting = true;
    this._emitConnection('bp', 'connecting');

    const device = await navigator.bluetooth.requestDevice({
      filters: [{ name: CONFIG.BLE_BP_DEVICE_NAME }],
      optionalServices: [CONFIG.BLE_BP_SERVICE_UUID]
    });

    this.state.bp.device = device;

    device.addEventListener('gattserverdisconnected', () => {
      this.state.bp.isConnected = false;
      this.state.bp.isConnecting = false;
      this._emitConnection('bp', 'disconnected');
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService(CONFIG.BLE_BP_SERVICE_UUID);
    const characteristic = await service.getCharacteristic(CONFIG.BLE_BP_CHAR_UUID);

    characteristic.addEventListener('characteristicvaluechanged', event => {
      const decoder = new TextDecoder();
      const raw = decoder.decode(event.target.value);
      try {
        const parsed = JSON.parse(raw);
        this.data.bp.sys = parsed.sys;
        this.data.bp.dia = parsed.dia;
        this.data.bp.lastUpdate = Date.now();
        this._emit('bp', { ...this.data.bp });
      } catch (e) {
        // ignore malformed
      }
    });

    await characteristic.startNotifications();

    this.state.bp.isConnected = true;
    this.state.bp.isConnecting = false;
    this._emitConnection('bp', 'connected');
  },

  disconnectBP() {
    const device = this.state.bp.device;
    if (device && device.gatt && device.gatt.connected) {
      device.gatt.disconnect();
    }
    this.state.bp.isConnected = false;
    this.state.bp.isConnecting = false;
    this.state.bp.device = null;
    this._emitConnection('bp', 'disconnected');
  },

  async connectVitals() {
    if (this.state.vitals.isConnected) {
      this.disconnectVitals();
      return;
    }

    this.state.vitals.isConnecting = true;
    this._emitConnection('vitals', 'connecting');

    if (!this._vitalsRegistered) {
      this._vitalsRegistered = true;

      BLEConnection.onDataUpdate(data => {
        this.data.vitals.hr = data.hr;
        this.data.vitals.spo2 = data.spo2;
        this.data.vitals.finger = data.finger;
        this.data.vitals.lastUpdate = Date.now();
        this._emit('vitals', { ...this.data.vitals });
      });

      BLEConnection.onConnectionChange(isConnected => {
        this.state.vitals.isConnected = isConnected;
        this.state.vitals.isConnecting = false;
        this._emitConnection('vitals', isConnected ? 'connected' : 'disconnected');
      });
    }

    await BLEConnection.connectBLE();
  },

  disconnectVitals() {
    BLEConnection.disconnect();
    this.state.vitals.isConnected = false;
    this.state.vitals.isConnecting = false;
    this._emitConnection('vitals', 'disconnected');
  },

  async toggle(type) {
    const labels = { muse: 'Muse EEG', bp: 'Blood Pressure', vitals: 'Vitals Watch' };
    try {
      if (type === 'muse') await this.connectMuse();
      else if (type === 'bp') await this.connectBP();
      else if (type === 'vitals') await this.connectVitals();
    } catch (err) {
      const label = labels[type] || type;
      Utils.showToast(`${label}: ${err.message || err}`, 'error');
      if (type === 'muse') { this.state.muse.isConnecting = false; this._emitConnection('muse', 'error'); }
      else if (type === 'bp') { this.state.bp.isConnecting = false; this._emitConnection('bp', 'error'); }
      else if (type === 'vitals') { this.state.vitals.isConnecting = false; this._emitConnection('vitals', 'error'); }
    }
  },

  getStatus() {
    return {
      muse: this.state.muse.isConnected,
      bp: this.state.bp.isConnected,
      vitals: this.state.vitals.isConnected
    };
  }
};

window.MultiDevice = MultiDevice;
