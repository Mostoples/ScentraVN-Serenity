/**
 * ScentraVN Serenity — EEG Muse Sleep Module
 *
 * Connects to Muse Sleep headband via Web Bluetooth API.
 * Decodes 20-byte EEG packets → 12 × 12-bit samples per channel (256 Hz).
 * Computes FFT band powers: delta, theta, alpha, beta, gamma.
 * Classifies stress (theta/beta ratio) and focus (SMR/alpha ratio).
 * Falls back to simulation mode when no device is present.
 */

/* ── Muse BLE UUIDs ─────────────────────────────────────────────────── */
const MUSE_SERVICE  = '0000fe8d-0000-1000-8000-00805f9b34fb';
const MUSE_CHAR = {
    control:    '273e0001-4c4d-454d-96be-f03bac821358',
    tp9:        '273e0003-4c4d-454d-96be-f03bac821358',
    af7:        '273e0004-4c4d-454d-96be-f03bac821358',
    af8:        '273e0005-4c4d-454d-96be-f03bac821358',
    tp10:       '273e0006-4c4d-454d-96be-f03bac821358',
    battery:    '273e000b-4c4d-454d-96be-f03bac821358',
    gyroscope:  '273e0009-4c4d-454d-96be-f03bac821358',
    accelero:   '273e000a-4c4d-454d-96be-f03bac821358',
    /* PPG (Muse S / Muse 2 have an optical heart sensor): 3 channels @ 64 Hz,
       24-bit samples. ppg1=ambient, ppg2=infrared, ppg3=red. */
    ppg1:       '273e000f-4c4d-454d-96be-f03bac821358',
    ppg2:       '273e0010-4c4d-454d-96be-f03bac821358',
    ppg3:       '273e0011-4c4d-454d-96be-f03bac821358',
};

/* Standard BLE Battery Service (0x180F / 0x2A19) — Muse exposes a clean 0-100%
   level here, which we prefer over the quirky proprietary telemetry scaling. */
const BATTERY_SERVICE = 0x180f;
const BATTERY_LEVEL_CHAR = 0x2a19;

/* Muse streams at 256 Hz; each EEG packet = 12 samples (12-bit each) */
const MUSE_SAMPLE_RATE  = 256;
const MUSE_SAMPLES_PER_PACKET = 12;
const MUSE_ADC_MIDPOINT = 2048;            // 12-bit unsigned centre (0..4095)
const MUSE_UV_PER_UNIT  = 0.48828125;      // ADC unit → microvolts

/* Band definitions [lowHz, highHz] */
const BANDS = {
    delta: [0.5, 4],
    theta: [4,   8],
    alpha: [8,  13],
    smr:   [13, 15],
    beta:  [13, 30],
    gamma: [30, 100],
};

/* Stress classification thresholds (theta/beta ratio).
   Recentred for the corrected 12-bit decoder + windowed PSD: a resting adult on
   the θ[4-8]/β[13-30] bands sits around θ/β ≈ 2–3, drowsy/loaded climbs higher.
   (Old 6.37/9.50 centre assumed the previous mis-decoded spectrum.) */
const STRESS_HIGH   = 4.50;   // θ/β above this → high
const STRESS_MEDIUM = 3.00;   // θ/β above this → medium, else low

/* Focus: SMR/alpha ratio. Alpha normally dominates, so SMR/α ≈ 0.2–0.5; it rises
   as alpha is suppressed during focused attention. 0.35 ≈ "good focus" baseline. */
const FOCUS_GOOD = 0.35;

/* FFT window size — power-of-2, ~1 s at 256 Hz */
const FFT_SIZE = 256;

/* ── Module state ──────────────────────────────────────────────────── */
const MuseEEG = {
    device:         null,
    server:         null,
    service:        null,
    controlChar:    null,
    isConnected:    false,
    isConnecting:   false,
    simulationMode: false,
    _simInterval:   null,

    /* Rolling sample buffers per channel (last FFT_SIZE samples) */
    buffers: { tp9: [], af7: [], af8: [], tp10: [] },

    /* Computed metrics (updated every analysis tick) */
    metrics: {
        powers:         { delta: 0, theta: 0, alpha: 0, smr: 0, beta: 0, gamma: 0 },
        powersAF7:      { delta: 0, theta: 0, alpha: 0, smr: 0, beta: 0, gamma: 0 },
        powersAF8:      { delta: 0, theta: 0, alpha: 0, smr: 0, beta: 0, gamma: 0 },
        thetaBetaRatio: 0,
        smrAlphaRatio:  0,
        alphaPeak:      0,
        alphaAsymmetry: null,    // ln(α_AF8) − ln(α_AF7)
        sleepStage:     'unknown',
        engagement:     null,
        meditation:     null,
        mentalState:    null,    // { label, prob } from MLP
        cognitiveLoad:  null,    // { label, prob } from MLP
        emotion:        null,    // { label, prob } valence from real Muse-trained MLP
        stressLevel:    'low',   // 'low' | 'medium' | 'high'
        focusState:     'low',   // 'low' | 'moderate' | 'good'
        battery:        null,
        ppg:            { ambient: null, ir: null, red: null },  // latest optical PPG sample per channel
        hr:             null,   // heart rate (BPM) from PPG IR pipeline
        rmssd:          null,   // HRV RMSSD (ms) from PPG IR pipeline
        ppgSqi:         0,      // PPG signal-quality index 0..1
        ppgBits:        null,   // PPG decode bit-depth in use (16 or 24)
        packetCount:    0,
    },

    /* Callbacks */
    _onMetrics:     null,
    _metricsListeners: [],
    _rawListeners:  [],      // raw EEG sample listeners: cb({ t, ch, samples:[...] })
    _onConnection:  null,
    _onError:       null,

    /* ── Event binding ─────────────────────────────────────────────── */
    onMetrics(cb)    { if (cb && !this._metricsListeners.includes(cb)) this._metricsListeners.push(cb); },
    offMetrics(cb)   { this._metricsListeners = this._metricsListeners.filter(f => f !== cb); },
    /* Raw per-channel EEG samples (256 Hz) — used by the RAW data recorder */
    onRaw(cb)        { if (cb && !this._rawListeners.includes(cb)) this._rawListeners.push(cb); },
    offRaw(cb)       { this._rawListeners = this._rawListeners.filter(f => f !== cb); },
    onConnection(cb) { this._onConnection = cb; },
    onError(cb)      { this._onError      = cb; },

    /* ── BLE connect ────────────────────────────────────────────────── */
    async connect() {
        if (!('bluetooth' in navigator)) {
            this._emit('error', 'Bluetooth tidak didukung di browser ini. Gunakan Chrome atau Edge.');
            return false;
        }
        if (this.isConnected || this.isConnecting) return false;

        // A fresh, explicit device pick supersedes any auto-reconnect loop left
        // over from a previous unexpected drop.
        this._cancelReconnect();

        this.isConnecting = true;
        this._emit('connection', { status: 'connecting' });

        try {
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'Muse' },
                    { services: [MUSE_SERVICE] }
                ],
                optionalServices: [MUSE_SERVICE, BATTERY_SERVICE],
            });

            this.device.addEventListener('gattserverdisconnected', () => this._onDisconnected());

            return await this._setupAfterDevice();
        } catch (err) {
            this.isConnecting = false;
            this._emit('connection', { status: 'error' });
            if (err.name === 'NotFoundError') {
                this._emit('error', 'Tidak ada perangkat Muse yang dipilih.');
            } else {
                this._emit('error', `Koneksi gagal: ${err.message}`);
            }
            return false;
        }
    },

    /**
     * GATT-connect + subscribe to every characteristic (EEG/motion/PPG/battery)
     * and start streaming. Shared by connect() (fresh device picked via the
     * browser chooser) and _attemptReconnect() (same already-picked device,
     * auto-reconnecting after an unexpected drop) so the two paths can't drift
     * apart. Throws on failure — callers are responsible for catching it.
     */
    async _setupAfterDevice() {
            this.server  = await this.device.gatt.connect();
            this.service = await this.server.getPrimaryService(MUSE_SERVICE);

            /* Control characteristic first — Muse S Gen 2 (Athena) needs a halt
               before it will accept a preset change. */
            this.controlChar = await this.service.getCharacteristic(MUSE_CHAR.control);
            try {
                await this.controlChar.startNotifications();
                this.controlChar.addEventListener('characteristicvaluechanged', (e) => this._onControlReply(e.target.value));
            } catch (_) { /* control notify optional */ }

            await this._sendCommand('h');            // halt streaming
            await this._delay(200);

            /* Subscribe to 4 EEG channels */
            this._packetsSeen = 0;
            for (const ch of ['tp9', 'af7', 'af8', 'tp10']) {
                const char = await this.service.getCharacteristic(MUSE_CHAR[ch]);
                await char.startNotifications();
                char.addEventListener('characteristicvaluechanged', (e) => this._onEEGPacket(ch, e.target.value));
            }

            /* Subscribe to motion (optional, best-effort) */
            for (const ch of ['accelero', 'gyroscope']) {
                try {
                    const c = await this.service.getCharacteristic(MUSE_CHAR[ch]);
                    await c.startNotifications();
                    c.addEventListener('characteristicvaluechanged', (e) => this._onMotionPacket(ch, e.target.value));
                } catch (_) { /* not present on all firmware */ }
            }

            /* Subscribe to PPG (optical heart sensor — Muse S / Muse 2). */
            this._ppgCount = 0;
            this._ppgSubs = 0;
            if (this._ppgProc) this._ppgProc.reset();   // fresh HRV state per session
            for (const ch of ['ppg1', 'ppg2', 'ppg3']) {
                try {
                    const c = await this.service.getCharacteristic(MUSE_CHAR[ch]);
                    await c.startNotifications();
                    c.addEventListener('characteristicvaluechanged', (e) => this._onPPGPacket(ch, e.target.value));
                    this._ppgSubs++;
                } catch (err) { console.warn('[Muse] PPG', ch, 'unavailable:', err && err.message); }
            }
            console.log('[Muse] PPG karakteristik ter-subscribe:', this._ppgSubs, '/ 3',
                this._ppgSubs === 0 ? '← chars PPG tidak ada di firmware ini' : '');

            /* Start streaming. Muse S Gen 2 ("Athena", fw 2024+) streams EEG+PPG+IMU
               on preset p1035. Older Muse 2 / Muse S Gen 1 use the 50-series preset
               (p50) which ALSO enables PPG — so we fall back to p50 (not the EEG-only
               p21) to keep the optical heart sensor streaming on classic devices. */
            await this._startPreset(this.PRESET_GEN2);   // 'p1035'
            await this._sendCommand('s');   // "status" query — reply carries battery % (see _onControlReply)
            await this._sendCommand('d');

            /* If no EEG packets within 2.5s, retry with the PPG-capable legacy preset. */
            this._presetFallbackTimer = setTimeout(async () => {
                if (this._packetsSeen === 0 && this.device?.gatt?.connected) {
                    console.warn('[Muse] No EEG on', this.PRESET_GEN2, '→ retrying with p50 (Gen 1 / Muse 2, EEG+PPG)');
                    try {
                        await this._sendCommand('h');
                        await this._delay(150);
                        await this._startPreset('p50');
                        await this._sendCommand('s');
                        await this._sendCommand('d');
                    } catch (_) {}
                }
            }, 2500);

            /* Surface whether PPG packets actually arrived. If EEG flows but PPG
               doesn't, try the PPG-capable presets once (some Athena units need a
               different preset to turn the optical sensor on). EEG keeps streaming. */
            setTimeout(async () => {
                if (!this.device?.gatt?.connected) return;
                if (this._ppgCount > 0) {
                    console.log('[Muse] PPG streaming ✓ —', this._ppgCount, 'paket dalam 6 dtk');
                    return;
                }
                console.warn('[Muse] PPG belum ada paket setelah 6 dtk (subscribed ' + this._ppgSubs + '/3). Mencoba preset yang mengaktifkan PPG…');
                for (const preset of ['p1044', 'p1045', 'p50']) {
                    if (this._ppgCount > 0) break;
                    try {
                        await this._sendCommand('h');
                        await this._delay(150);
                        await this._startPreset(preset);
                        await this._sendCommand('s');
                        await this._sendCommand('d');
                        await this._delay(2500);
                        if (this._ppgCount > 0) { console.log('[Muse] PPG aktif dengan preset', preset, '✓'); break; }
                    } catch (_) {}
                }
                if (this._ppgCount === 0) {
                    // Restore the known-good EEG preset so we never leave EEG broken.
                    try { await this._sendCommand('h'); await this._delay(150); await this._startPreset(this.PRESET_GEN2); await this._sendCommand('s'); await this._sendCommand('d'); } catch (_) {}
                    console.warn('[Muse] PPG tetap tidak streaming — unit/firmware ini mungkin tidak mengekspos PPG. EEG dikembalikan ke', this.PRESET_GEN2, '.');
                }
            }, 6000);

            /* ── Battery ──
               Prefer the STANDARD BLE Battery Service (0x180F → 0x2A19): a clean
               uint8 percentage. If present it is authoritative and we ignore the
               proprietary telemetry (which uses a quirky scale). */
            this._stdBattery = false;
            try {
                const battSvc = await this.server.getPrimaryService(BATTERY_SERVICE);
                const battChar = await battSvc.getCharacteristic(BATTERY_LEVEL_CHAR);
                this._battStdChar = battChar;
                const apply = (dv) => {
                    if (dv && dv.byteLength >= 1) {
                        const pct = dv.getUint8(0);
                        this.metrics.battery = Math.max(0, Math.min(100, pct));
                    }
                };
                apply(await battChar.readValue());
                this._stdBattery = true;
                console.log('[Muse] Baterai dari BLE Battery Service standar (0x2A19):', this.metrics.battery + '%  ← sumber paling akurat (sama dengan app Muse)');
                try {
                    await battChar.startNotifications();
                    battChar.addEventListener('characteristicvaluechanged', (e) => apply(e.target.value));
                } catch (_) { /* read-only is fine */ }
            } catch (_) {
                console.log('[Muse] BLE Battery Service standar TIDAK tersedia → memakai telemetry proprietary (lihat raw di bawah).');
            }

            /* Proprietary telemetry (273e000b). Third-choice source — its byte
               layout/scale has proven unreliable specifically on Muse S Gen 2
               (Athena) units (verified wrong in the field: showed 1% while the
               official app showed 96%), even though it matches the layout
               documented by reference JS/Python Muse decoders. Only applied
               when neither the standard battery service NOR the control-status
               reply below have already supplied a reading. */
            this._ctrlBattery = false;
            try {
                const bat = await this.service.getCharacteristic(MUSE_CHAR.battery);
                this._battPropChar = bat;
                await bat.startNotifications();
                bat.addEventListener('characteristicvaluechanged', (e) => {
                    if (this._stdBattery || this._ctrlBattery) return;
                    this._applyPropBattery(e.target.value, '(notify)');
                });
            } catch(_) { /* battery not always available */ }

            /* Some Muse units only notify the battery sparsely (or once), which
               makes the % look frozen. Poll it every 30 s so it refreshes as the
               device drains. Reads are cheap and don't disturb the data stream. */
            if (this._battPoll) clearInterval(this._battPoll);
            this._battPoll = setInterval(() => this._pollBattery(), 30000);
            this._pollBattery();

            this.isConnected  = true;
            this.isConnecting = false;
            this.simulationMode = false;
            this._emit('connection', { status: 'connected', deviceName: this.device.name });
            return true;
    },

    async disconnect() {
        // Explicit, user-requested disconnect — mark it so the
        // gattserverdisconnected handler below doesn't treat this as an
        // unexpected drop and try to auto-reconnect / auto-pause a recording.
        this._userDisconnect = true;
        this._cancelReconnect();
        this._autoPausedRecording = false;
        this._stopSimulation();
        if (this.device?.gatt?.connected) {
            try { await this._sendCommand('h'); } catch(_) {}
            this.device.gatt.disconnect();
        }
        this._reset();
        this._emit('connection', { status: 'disconnected' });
    },

    /**
     * Retry connecting to the SAME (already-picked) device every few seconds
     * until it succeeds — used after an unexpected disconnect (device turned
     * off / walked out of range), so the user doesn't have to re-open the
     * Bluetooth chooser once the Muse is back on. If a recording was active
     * when the drop happened, it gets auto-resumed on success (see
     * _onDisconnected). Gives up after ~10 minutes of no luck.
     */
    _attemptReconnect(device) {
        if (this._reconnecting) return;
        this._reconnecting = true;
        this._reconnectAttempts = 0;
        this.isConnecting = true;
        this._emit('connection', { status: 'reconnecting' });

        const RETRY_MS = 3000;
        const MAX_ATTEMPTS = 200;   // ~10 minutes at 3s intervals

        const tryOnce = async () => {
            if (!this._reconnecting) return;   // cancelled (manual connect/disconnect)
            this._reconnectAttempts++;
            try {
                this.device = device;
                await this._setupAfterDevice();
                this._reconnecting = false;
                this._reconnectTimer = null;
                console.log('[Muse] Auto-reconnect berhasil (percobaan ke-' + this._reconnectAttempts + ')');
                if (this._autoPausedRecording && typeof RawRecorder !== 'undefined') {
                    this._autoPausedRecording = false;
                    RawRecorder.resume();
                    if (typeof Utils !== 'undefined' && Utils.showToast) {
                        Utils.showToast('Muse tersambung lagi — perekaman dilanjutkan.', 'success');
                    }
                }
            } catch (_) {
                if (!this._reconnecting) return;   // cancelled while awaiting
                if (this._reconnectAttempts >= MAX_ATTEMPTS) {
                    console.warn('[Muse] Auto-reconnect menyerah setelah', this._reconnectAttempts, 'percobaan.');
                    this._reconnecting = false;
                    this._reconnectTimer = null;
                    this.isConnecting = false;
                    this._emit('connection', { status: 'disconnected' });
                    return;
                }
                this._reconnectTimer = setTimeout(tryOnce, RETRY_MS);
            }
        };
        tryOnce();
    },

    _cancelReconnect() {
        this._reconnecting = false;
        if (this._reconnectTimer) { clearTimeout(this._reconnectTimer); this._reconnectTimer = null; }
    },

    /* ── Simulation mode (demo without device) ──────────────────────── */
    startSimulation(stressLevel = 'medium') {
        if (this.isConnected) return;
        this.simulationMode = true;
        this._emit('connection', { status: 'simulation' });

        const stressMap = { low: 0.3, medium: 0.6, high: 0.9 };
        const stressFactor = stressMap[stressLevel] ?? 0.5;

        this._simInterval = setInterval(() => {
            const t = Date.now() / 1000;

            /* Synthesise realistic EEG-like power values */
            const delta = 18 + 4 * Math.sin(t * 0.3);
            const theta = (4 + stressFactor * 12) + 2 * Math.sin(t * 0.7);
            const alpha = (12 - stressFactor * 6) + 1.5 * Math.sin(t * 1.1);
            const smr   = (4  - stressFactor * 2) + 0.8 * Math.sin(t * 1.3);
            const beta  = (3  + stressFactor * 8) + 1 * Math.sin(t * 1.8);
            const gamma = (1  + stressFactor * 3) + 0.5 * Math.sin(t * 2.5);

            const powers = { delta, theta, alpha, smr, beta, gamma };
            /* Simulate slight asymmetry — left more active when stressed */
            const asym = stressFactor * 0.15;
            const pAF7 = { ...powers, alpha: alpha * (1 - asym) };
            const pAF8 = { ...powers, alpha: alpha * (1 + asym) };
            this._updateMetrics(powers, pAF7, pAF8);
        }, 500);
    },

    stopSimulation() { this._stopSimulation(); },

    /* ── EEG packet decoder ─────────────────────────────────────────── */
    _onEEGPacket(channel, dataView) {
        /* 20-byte Muse EEG packet:
           [0-1]   = 16-bit sample index
           [2-19]  = 12 samples × 12-bit UNSIGNED, packed big-endian
           Each sample → microvolts around the 12-bit midpoint (2048):
             uv = (raw12 - 2048) * 0.48828125  (canonical muse-js scaling). */
        const buf = this.buffers[channel];
        this._packetsSeen = (this._packetsSeen || 0) + 1;

        /* Clamp to whatever the packet actually carries (guards short frames). */
        const fits = Math.max(0, Math.floor(((dataView.byteLength - 2) * 8) / 12));
        const count = Math.min(MUSE_SAMPLES_PER_PACKET, fits);

        const samples = new Array(count);
        for (let i = 0; i < count; i++) {
            const bitIndex   = i * 12;
            const byteOffset = 2 + (bitIndex >> 3);     // /8
            const bitOffset  = bitIndex & 7;            // %8  → 0 or 4
            const word  = (dataView.getUint8(byteOffset) << 8) | dataView.getUint8(byteOffset + 1);
            const raw12 = (word >> (4 - bitOffset)) & 0x0FFF;   // 0..4095
            const uv = (raw12 - MUSE_ADC_MIDPOINT) * MUSE_UV_PER_UNIT;
            buf.push(uv);
            samples[i] = uv;
        }
        /* Emit RAW samples (for the multi-device recorder) */
        if (this._rawListeners.length) {
            const seq = (dataView.byteLength >= 2) ? (dataView.getUint8(0) << 8 | dataView.getUint8(1)) : 0;
            const frame = { t: Date.now(), ch: channel, seq, samples };
            for (const fn of this._rawListeners) { try { fn(frame); } catch (_) {} }
        }

        /* Keep rolling window */
        if (buf.length > FFT_SIZE * 2) buf.splice(0, buf.length - FFT_SIZE * 2);

        /* Run analysis when we have a full window from AF7 (frontal lead) */
        if (channel === 'af7' && buf.length >= FFT_SIZE) {
            this.metrics.packetCount++;
            if (this.metrics.packetCount % 8 === 0) {   /* ~every 200ms */
                /* AF7 powers */
                const winAF7 = buf.slice(-FFT_SIZE);
                const pAF7 = this._bandPowers(winAF7);

                /* AF8 powers (if available) */
                const af8Buf = this.buffers.af8;
                const pAF8 = (af8Buf.length >= FFT_SIZE)
                    ? this._bandPowers(af8Buf.slice(-FFT_SIZE))
                    : null;

                /* Combined (mean of frontal channels for stress/focus classification) */
                const combined = pAF8
                    ? this._meanPowers(pAF7, pAF8)
                    : pAF7;

                this._updateMetrics(combined, pAF7, pAF8);
            }
        }
    },

    /* Average two band-power objects */
    _meanPowers(a, b) {
        const out = {};
        for (const k of Object.keys(a)) {
            if (k.startsWith('_')) continue;
            const va = a[k] ?? 0, vb = b[k] ?? 0;
            out[k] = (va + vb) / 2;
        }
        if (a._alphaPeak || b._alphaPeak) {
            out._alphaPeak = ((a._alphaPeak || 0) + (b._alphaPeak || 0)) / 2;
        }
        return out;
    },

    /**
     * Build the 15-feature vector for the real-trained emotion-valence model.
     * Computed live from the 4 raw channel buffers + current band powers.
     * Contract must match python/train_emotion_real.py COMPACT_FEATURES.
     */
    emotionFeatureVector() {
        const p = this.metrics.powers || {};
        const total = (p.delta||0)+(p.theta||0)+(p.alpha||0)+(p.beta||0)+(p.gamma||0)+(p.smr||0);
        if (total <= 0) return null;
        const prop = {
            delta: (p.delta||0)/total, theta: (p.theta||0)/total, alpha: (p.alpha||0)/total,
            sigma: (p.smr||0)/total,   beta: (p.beta||0)/total,   gamma: (p.gamma||0)/total
        };

        /* Alpha asymmetry (AF8 − AF7) from per-channel band powers */
        const aAF7 = this.metrics.powersAF7?.alpha || 0;
        const aAF8 = this.metrics.powersAF8?.alpha || 0;
        const t7 = this._sumPowers(this.metrics.powersAF7);
        const t8 = this._sumPowers(this.metrics.powersAF8);
        const alphaAsym = (t8 > 0 && t7 > 0) ? (aAF8/t8 - aAF7/t7) : 0;

        /* Statistical aggregates across the 4 raw channel buffers */
        const stats = this._channelStats();

        return {
            delta: prop.delta, theta: prop.theta, alpha: prop.alpha,
            sigma: prop.sigma, beta: prop.beta, gamma: prop.gamma,
            thetaAlpha: prop.theta / (prop.alpha + 1e-6),
            betaAlpha:  prop.beta  / (prop.alpha + 1e-6),
            engagement: prop.beta  / (prop.alpha + prop.theta + 1e-6),
            alphaAsym:  alphaAsym,
            statMean: stats.meanOfMeans,
            statStd:  stats.stdOfMeans,
            stdMean:  stats.meanOfStds,
            stdStd:   stats.stdOfStds,
            absMean:  stats.meanOfAbs
        };
    },

    _sumPowers(p) {
        if (!p) return 0;
        return (p.delta||0)+(p.theta||0)+(p.alpha||0)+(p.beta||0)+(p.gamma||0)+(p.smr||0);
    },

    /* Per-channel mean/std stats across the 4 raw buffers */
    _channelStats() {
        const chans = ['tp9','af7','af8','tp10'];
        const means = [], stds = [], absMeans = [];
        for (const ch of chans) {
            const b = this.buffers[ch];
            if (!b || b.length < 8) continue;
            const w = b.slice(-FFT_SIZE);
            const m = w.reduce((a,x)=>a+x,0)/w.length;
            const v = w.reduce((a,x)=>a+(x-m)*(x-m),0)/w.length;
            means.push(m); stds.push(Math.sqrt(v));
            absMeans.push(w.reduce((a,x)=>a+Math.abs(x),0)/w.length);
        }
        const agg = arr => {
            if (!arr.length) return { mean: 0, std: 0 };
            const m = arr.reduce((a,x)=>a+x,0)/arr.length;
            const v = arr.reduce((a,x)=>a+(x-m)*(x-m),0)/arr.length;
            return { mean: m, std: Math.sqrt(v) };
        };
        const mAgg = agg(means), sAgg = agg(stds);
        return {
            meanOfMeans: mAgg.mean, stdOfMeans: mAgg.std,
            meanOfStds:  sAgg.mean, stdOfStds:  sAgg.std,
            meanOfAbs:   absMeans.length ? absMeans.reduce((a,x)=>a+x,0)/absMeans.length : 0
        };
    },

    /* ── FFT & band power ───────────────────────────────────────────── */
    _bandPowers(samples) {
        const N = samples.length;

        /* 1) Detrend (remove DC mean) THEN apply a Hann window. Subtracting the
              mean here is what stops any residual offset from dumping huge power
              into delta. Track window power U = Σw² for correct PSD scaling. */
        const mean = samples.reduce((a, s) => a + s, 0) / N;
        const re = new Float64Array(N);
        const im = new Float64Array(N);
        let U = 0;
        for (let n = 0; n < N; n++) {
            const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * n / (N - 1));
            re[n] = (samples[n] - mean) * w;
            U += w * w;
        }

        /* 2) Cooley-Tukey in-place FFT */
        this._fft(re, im, N);

        /* 3) One-sided power spectral density (µV²/Hz).
              P[k] = 2·|X[k]|² / (fs·U), DC/Nyquist not doubled (skipped here). */
        const freqRes = MUSE_SAMPLE_RATE / N;            /* Hz per bin */
        const half = N >> 1;
        const norm = 2 / (MUSE_SAMPLE_RATE * U);
        const psd = new Float64Array(half);
        for (let k = 1; k < half; k++) {
            psd[k] = (re[k] * re[k] + im[k] * im[k]) * norm;
        }

        /* 4) Integrate PSD across each band → absolute band power (µV²) */
        const powers = {};
        for (const [band, [lo, hi]] of Object.entries(BANDS)) {
            let p = 0;
            for (let k = Math.ceil(lo / freqRes); k <= Math.floor(hi / freqRes) && k < half; k++) {
                p += psd[k] * freqRes;
            }
            powers[band] = p;
        }

        /* Alpha peak frequency */
        let peakPow = 0, peakFreq = 10;
        const loK = Math.ceil(BANDS.alpha[0] / freqRes);
        const hiK = Math.floor(BANDS.alpha[1] / freqRes);
        for (let k = loK; k <= hiK && k < half; k++) {
            if (psd[k] > peakPow) { peakPow = psd[k]; peakFreq = k * freqRes; }
        }
        powers._alphaPeak = peakFreq;

        return powers;
    },

    _fft(re, im, N) {
        /* Bit-reversal permutation */
        let j = 0;
        for (let i = 1; i < N; i++) {
            let bit = N >> 1;
            for (; j & bit; bit >>= 1) j ^= bit;
            j ^= bit;
            if (i < j) {
                [re[i], re[j]] = [re[j], re[i]];
                [im[i], im[j]] = [im[j], im[i]];
            }
        }
        /* Butterfly passes */
        for (let len = 2; len <= N; len <<= 1) {
            const ang = -2 * Math.PI / len;
            const wRe = Math.cos(ang), wIm = Math.sin(ang);
            for (let i = 0; i < N; i += len) {
                let curRe = 1, curIm = 0;
                for (let k = 0; k < len / 2; k++) {
                    const uRe = re[i + k], uIm = im[i + k];
                    const vRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
                    const vIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
                    re[i + k]           = uRe + vRe;
                    im[i + k]           = uIm + vIm;
                    re[i + k + len / 2] = uRe - vRe;
                    im[i + k + len / 2] = uIm - vIm;
                    const tmp = curRe * wRe - curIm * wIm;
                    curIm = curRe * wIm + curIm * wRe;
                    curRe = tmp;
                }
            }
        }
    },

    /* ── Metrics update & classification ───────────────────────────── */
    _updateMetrics(powers, powersAF7 = null, powersAF8 = null) {
        const { theta, alpha, smr, beta } = powers;

        const thetaBeta = beta > 0.0001 ? theta / beta : 0;
        const smrAlpha  = alpha > 0.0001 ? smr  / alpha : 0;
        const alphaPeak = powers._alphaPeak ?? 10;

        let stressLevel;
        if (thetaBeta > STRESS_HIGH)   stressLevel = 'high';
        else if (thetaBeta > STRESS_MEDIUM) stressLevel = 'medium';
        else                            stressLevel = 'low';

        let focusState;
        if (smrAlpha > FOCUS_GOOD * 1.5) focusState = 'good';
        else if (smrAlpha > FOCUS_GOOD * 0.8) focusState = 'moderate';
        else focusState = 'low';

        /* Frontal Alpha Asymmetry (depression-mood biomarker) */
        let faa = null;
        if (powersAF7 && powersAF8 && powersAF7.alpha > 0 && powersAF8.alpha > 0
            && typeof EEGFeatures !== 'undefined') {
            faa = EEGFeatures.frontalAlphaAsymmetry(powersAF7.alpha, powersAF8.alpha);
        }

        /* Engagement & meditation indices */
        let engagement = null, meditation = null, sleepStage = 'unknown';
        let mentalState = null, cognitiveLoad = null, emotion = null;
        if (typeof EEGFeatures !== 'undefined') {
            engagement = EEGFeatures.engagementIndex(powers);
            meditation = EEGFeatures.meditationIndex(powers);
            sleepStage = EEGFeatures.classifySleepStage(powers);

            /* Mental-state, emotion & cognitive-load now share the 15-feature
               browser contract (all real Muse/EEG-trained). Compute once. */
            const fv = (typeof NNRuntime !== 'undefined') ? this.emotionFeatureVector() : null;
            if (fv && typeof NNRuntime !== 'undefined') {
                if (NNRuntime.has('mentalState')) {
                    try {
                        const o = NNRuntime.predict('mentalState', fv);
                        if (o && o.label) mentalState = { label: o.label, prob: o.prob, probs: o.probs };
                    } catch (e) { /* ignore */ }
                }
                if (NNRuntime.has('emotion')) {
                    try {
                        const o = NNRuntime.predict('emotion', fv);
                        if (o && o.label) emotion = { label: o.label, prob: o.prob, probs: o.probs };
                    } catch (e) { /* ignore */ }
                }
                if (NNRuntime.has('cogLoad')) {
                    try {
                        const o = NNRuntime.predict('cogLoad', fv);
                        if (o && o.label) cognitiveLoad = { label: o.label, prob: o.prob, probs: o.probs };
                    } catch (e) { /* ignore */ }
                }
            }
        }

        Object.assign(this.metrics, {
            powers:         { ...powers },
            powersAF7:      powersAF7 ? { ...powersAF7 } : this.metrics.powersAF7,
            powersAF8:      powersAF8 ? { ...powersAF8 } : this.metrics.powersAF8,
            thetaBetaRatio: thetaBeta,
            smrAlphaRatio:  smrAlpha,
            alphaPeak,
            alphaAsymmetry: faa,
            sleepStage,
            engagement,
            meditation,
            mentalState,
            cognitiveLoad,
            emotion,
            stressLevel,
            focusState,
        });

        if (this._onMetrics) this._onMetrics({ ...this.metrics });
        if (this._metricsListeners.length) {
            const snapshot = { ...this.metrics };
            for (const fn of this._metricsListeners) {
                try { fn(snapshot); } catch (e) { /* isolate listener errors */ }
            }
        }
    },

    /* ── Helpers ────────────────────────────────────────────────────── */
    PRESET_GEN2: 'p1035',    // Muse S Gen 2 (Athena): EEG + PPG + IMU
    _packetsSeen: 0,
    _presetFallbackTimer: null,

    _delay(ms) { return new Promise(r => setTimeout(r, ms)); },

    async _startPreset(preset) {
        try { await this._sendCommand(preset); }
        catch (e) { console.warn('[Muse] preset', preset, 'failed:', e.message); }
    },

    /* Control-channel JSON replies (firmware/version/status) — best effort.
     * The 's' (status) command's reply carries a "bp" field = battery percent
     * DIRECTLY (no odd scale to guess), confirmed by two independent, actively
     * maintained open-source Muse decoders — alexandrebarachant/muse-lsl
     * (`ask_control()` sends 's', docs its reply as containing "bp") and
     * DominiqueMakowski/OpenMuse (built specifically for Muse S Athena). This
     * is now the primary battery source whenever the standard BLE Battery
     * Service (0x2A19) isn't available, ranked above the proprietary binary
     * telemetry (273e000b) which has proven unreliable on this hardware. */
    _onControlReply(dataView) {
        try {
            const len = dataView.getUint8(0);
            let s = '';
            for (let i = 1; i <= len && i < dataView.byteLength; i++) s += String.fromCharCode(dataView.getUint8(i));
            this._ctrlBuf = (this._ctrlBuf || '') + s;
            if (this._ctrlBuf.includes('}')) {
                if (!this._stdBattery) {
                    const m = this._ctrlBuf.match(/"bp"\s*:\s*([\d.]+)/);
                    if (m) {
                        const pct = Math.max(0, Math.min(100, parseFloat(m[1])));
                        if (isFinite(pct)) {
                            this._ctrlBattery = true;
                            this.metrics.battery = pct;
                            if (pct !== this._lastBattCtrl) {
                                this._lastBattCtrl = pct;
                                console.log('[Muse] Baterai dari status control-channel ("bp"):', pct + '%');
                            }
                        }
                    }
                }
                /* a full JSON reply has arrived; reset for the next one */
                this._ctrlBuf = '';
            }
        } catch (_) {}
    },

    /* Accel/Gyro packets (3 axes × 3 samples, 16-bit signed). Forwarded raw. */
    _onMotionPacket(channel, dataView) {
        if (!this._rawListeners.length) return;
        try {
            const out = [];
            for (let i = 2; i + 5 < dataView.byteLength; i += 6) {
                out.push([
                    dataView.getInt16(i, false),
                    dataView.getInt16(i + 2, false),
                    dataView.getInt16(i + 4, false),
                ]);
            }
            const frame = { t: Date.now(), ch: channel, samples: out };
            for (const fn of this._rawListeners) { try { fn(frame); } catch (_) {} }
        } catch (_) {}
    },

    /* PPG packets (Muse optical heart sensor): 2-byte sequence + 24-bit big-endian
       unsigned samples (6 per packet @ 64 Hz). ppg1=ambient, ppg2=IR, ppg3=red.
       We keep the latest sample per channel (metrics.ppg) and forward the samples
       to raw listeners so a recording can capture the full PPG waveform. */
    _onPPGPacket(channel, dataView) {
        try {
            const n = dataView.byteLength;
            if (n < 4) return;
            const body = n - 2;   // bytes after the 2-byte sequence
            // Muse S Gen 2 (Athena) PPG = 16-bit samples → 14-byte packet (per the
            // project's authoritative decoder.js). Classic Muse 2 / S use 24-bit →
            // 20-byte packet. Pick the format from the packet length.
            const bits = (n >= 20 && body % 3 === 0) ? 24 : 16;
            const samples = [];
            if (bits === 24) {
                for (let i = 2; i + 2 < n; i += 3) samples.push((dataView.getUint8(i) << 16) | (dataView.getUint8(i + 1) << 8) | dataView.getUint8(i + 2));
            } else {
                for (let i = 2; i + 1 < n; i += 2) samples.push(dataView.getUint16(i, false));
            }
            if (!samples.length) return;
            this._ppgCount = (this._ppgCount || 0) + 1;
            this.metrics.ppgBits = bits;
            if (!this._ppgLogged) {
                this._ppgLogged = true;
                console.log(`[Muse] PPG paket pertama diterima — ch=${channel}, byteLength=${n}, mode=${bits}-bit, ${samples.length} sampel ✓`);
            }
            const key = channel === 'ppg1' ? 'ambient' : channel === 'ppg2' ? 'ir' : 'red';
            this.metrics.ppg[key] = samples[samples.length - 1];

            // IR is the strong pulsatile channel → feed the HRV pipeline (PPGProcessor).
            // Uses performance.now() so BLE jitter doesn't distort beat timing.
            if (channel === 'ppg2') {
                if (!this._ppgProc && typeof MusePPG !== 'undefined') this._ppgProc = new MusePPG({ fs: 64 });
                if (this._ppgProc) {
                    this._ppgProc.pushPacket(samples, (typeof performance !== 'undefined' ? performance.now() : Date.now()));
                    this.metrics.hr = this._ppgProc.bpm;
                    this.metrics.rmssd = this._ppgProc.rmssd;
                    this.metrics.ppgSqi = this._ppgProc.sqi;
                }
            }

            // Attach the latest HR snapshot so a recorded PPG_Raw export carries
            // heart rate alongside the raw waveform (updated from the IR channel above).
            const frame = { t: Date.now(), ch: channel, samples, hr: this.metrics.hr };
            for (const fn of this._rawListeners) { try { fn(frame); } catch (_) {} }
        } catch (_) {}
    },

    /** Apply a proprietary-telemetry battery frame.
     *  Layout matches the reverse-engineered Muse telemetry packet shared across
     *  Muse 2016/2/S (see urish/muse-js `parseTelemetry`, the reference decoder):
     *    offset 0: sequenceId (uint16)
     *    offset 2: batteryLevel — uint16, raw/512 = percent ← the real battery %
     *    offset 4: fuelGaugeVoltage — uint16 * 2.2 = mV (NOT a percentage)
     *  A previous version of this code read offset 4 with the /512 scale, which
     *  divides the raw fuel-gauge voltage instead of the battery level — the
     *  result happens to land in a plausible 0-100 range but doesn't match the
     *  official Muse app. Offset 2 barely changing between packets is expected
     *  (battery % doesn't move every second), not a sign it's frozen/broken. */
    _applyPropBattery(dv, source) {
        if (!dv || dv.byteLength < 6) return;
        const raw = dv.getUint16(2, false);
        const pct = raw / 512;
        if (!isFinite(pct) || pct < 0) return;
        const clamped = Math.max(0, Math.min(100, pct));
        if (raw !== this._lastBattRaw) {
            this._lastBattRaw = raw;
            const mv = Math.round(dv.getUint16(4, false) * 2.2);
            console.log(`[Muse] Baterai ${source || ''} — raw@2=${raw} → ${Math.round(clamped)}% (fuel-gauge≈${mv}mV @4, referensi saja)`);
        }
        this.metrics.battery = clamped;
    },

    /** Re-read the battery so the % refreshes even if the device notifies rarely. */
    async _pollBattery() {
        try {
            if (!this.isConnected || !this.device || !this.device.gatt || !this.device.gatt.connected) return;
            if (this._stdBattery && this._battStdChar) {
                const dv = await this._battStdChar.readValue();
                if (dv && dv.byteLength >= 1) {
                    const pct = dv.getUint8(0);
                    if (pct !== this._lastBattStd) {
                        this._lastBattStd = pct;
                        console.log('[Muse] Baterai (poll, BLE standar):', pct + '%');
                    }
                    this.metrics.battery = Math.max(0, Math.min(100, pct));
                }
            } else {
                // Ask for a fresh control-channel status reply ("bp" field —
                // see _onControlReply). Safe, read-only query, doesn't touch
                // the EEG/PPG stream. The reply arrives asynchronously via
                // characteristicvaluechanged, so it lands a moment after this.
                try { await this._sendCommand('s'); } catch (_) {}
                if (!this._ctrlBattery && this._battPropChar) {
                    this._applyPropBattery(await this._battPropChar.readValue(), '(poll)');
                }
            }
        } catch (_) { /* characteristic not readable / transient BLE error */ }
    },

    async _sendCommand(cmd) {
        if (!this.controlChar) return;
        const encoded = new TextEncoder().encode(`${cmd}\n`);
        const packet  = new Uint8Array(encoded.length + 1);
        packet[0] = encoded.length;
        packet.set(encoded, 1);
        await this.controlChar.writeValue(packet);
    },

    _onDisconnected() {
        // Deliberate disconnect (user clicked "disconnect") → plain reset,
        // no auto-reconnect, no auto-pause (disconnect() already stopped the
        // stream on purpose).
        if (this._userDisconnect) {
            this._userDisconnect = false;
            this._reset();
            this._emit('connection', { status: 'disconnected' });
            return;
        }

        // Unexpected drop (device turned off / walked out of BLE range).
        // Pause an active recording instead of leaving it broken — resumed
        // automatically once the Muse reconnects (see _attemptReconnect).
        const device = this.device;   // keep the handle — _reset() nulls this.device
        const wasRecording = typeof RawRecorder !== 'undefined' && RawRecorder.recording && !RawRecorder.paused;
        this._reset();
        this._emit('connection', { status: 'disconnected' });

        if (wasRecording) {
            RawRecorder.pause();
            this._autoPausedRecording = true;
            // Checkpoint immediately (same as a manual pause) — if the user
            // closes the tab while waiting for the Muse to come back, whatever
            // was recorded up to the drop is already safe in IndexedDB.
            RawRecorder.saveDraft().catch(() => {});
            if (typeof Utils !== 'undefined' && Utils.showToast) {
                Utils.showToast('Muse terputus — perekaman dijeda otomatis. Nyalakan lagi untuk lanjut.', 'warning');
            }
        }

        if (device) this._attemptReconnect(device);
    },

    _reset() {
        this.isConnected  = false;
        this.isConnecting = false;
        this.device = this.server = this.service = this.controlChar = null;
        if (this._presetFallbackTimer) { clearTimeout(this._presetFallbackTimer); this._presetFallbackTimer = null; }
        if (this._battPoll) { clearInterval(this._battPoll); this._battPoll = null; }
        this._battStdChar = this._battPropChar = null;
        this._stdBattery = false;
        this._ctrlBattery = false;
        this._lastBattRaw = null;
        this._lastBattStd = null;
        this._lastBattCtrl = null;
        this._packetsSeen = 0;
        this._ctrlBuf = '';
        for (const ch of Object.keys(this.buffers)) this.buffers[ch] = [];
    },

    _stopSimulation() {
        if (this._simInterval) { clearInterval(this._simInterval); this._simInterval = null; }
        this.simulationMode = false;
    },

    _emit(type, data) {
        if (type === 'connection' && this._onConnection) this._onConnection(data);
        if (type === 'error'      && this._onError)      this._onError(data);
    },

    /* ── Public helpers ─────────────────────────────────────────────── */
    getMetrics()    { return { ...this.metrics }; },
    getStatus()     { return { isConnected: this.isConnected, simulationMode: this.simulationMode }; },
    isSupported()   { return 'bluetooth' in navigator; },

    /* For symmetry with BLEConnection.isConnected() */
    isConnectedFn() { return this.isConnected; },

    stressLabel(level) {
        return { high: 'Stres Tinggi', medium: 'Stres Sedang', low: 'Stres Rendah' }[level] ?? level;
    },
    focusLabel(state) {
        return { good: 'Fokus Baik', moderate: 'Fokus Sedang', low: 'Fokus Rendah' }[state] ?? state;
    },
};

window.MuseEEG = MuseEEG;
/* Global alias to keep older app.js code working: EEGMuse.isConnected() */
window.EEGMuse = {
    isConnected: () => MuseEEG.isConnected,
    metrics:     () => MuseEEG.getMetrics(),
    connect:     () => MuseEEG.connect(),
    disconnect:  () => MuseEEG.disconnect(),
    onMetrics:   (cb) => MuseEEG.onMetrics(cb),
    onRaw:       (cb) => MuseEEG.onRaw(cb),
    offRaw:      (cb) => MuseEEG.offRaw(cb),
    onConnection:(cb) => MuseEEG.onConnection(cb),
    onError:     (cb) => MuseEEG.onError(cb),
    startSimulation:(...a) => MuseEEG.startSimulation(...a),
    stopSimulation:  () => MuseEEG.stopSimulation()
};
