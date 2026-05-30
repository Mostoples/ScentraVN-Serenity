/**
 * ScentraVN Serenity — EEG Muse Sleep Module
 *
 * Connects to Muse Sleep headband via Web Bluetooth API.
 * Decodes 12-byte EEG packets → 5 samples per channel (256 Hz).
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
};

/* Muse streams at 256 Hz; each packet = 5 samples */
const MUSE_SAMPLE_RATE  = 256;
const MUSE_SAMPLES_PER_PACKET = 5;

/* Band definitions [lowHz, highHz] */
const BANDS = {
    delta: [0.5, 4],
    theta: [4,   8],
    alpha: [8,  13],
    smr:   [13, 15],
    beta:  [13, 30],
    gamma: [30, 100],
};

/* Stress classification thresholds (theta/beta ratio) */
const STRESS_HIGH   = 9.50;
const STRESS_MEDIUM = 6.37;

/* Focus: SMR/alpha ratio > 1.5 = good focus */
const FOCUS_GOOD = 1.5;

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
        packetCount:    0,
    },

    /* Callbacks */
    _onMetrics:     null,
    _metricsListeners: [],
    _onConnection:  null,
    _onError:       null,

    /* ── Event binding ─────────────────────────────────────────────── */
    onMetrics(cb)    { if (cb && !this._metricsListeners.includes(cb)) this._metricsListeners.push(cb); },
    offMetrics(cb)   { this._metricsListeners = this._metricsListeners.filter(f => f !== cb); },
    onConnection(cb) { this._onConnection = cb; },
    onError(cb)      { this._onError      = cb; },

    /* ── BLE connect ────────────────────────────────────────────────── */
    async connect() {
        if (!('bluetooth' in navigator)) {
            this._emit('error', 'Web Bluetooth tidak didukung. Gunakan Chrome/Edge.');
            return false;
        }
        if (this.isConnected || this.isConnecting) return false;

        this.isConnecting = true;
        this._emit('connection', { status: 'connecting' });

        try {
            this.device = await navigator.bluetooth.requestDevice({
                filters: [
                    { namePrefix: 'Muse' },
                    { services: [MUSE_SERVICE] }
                ],
                optionalServices: [MUSE_SERVICE],
            });

            this.device.addEventListener('gattserverdisconnected', () => this._onDisconnected());

            this.server  = await this.device.gatt.connect();
            this.service = await this.server.getPrimaryService(MUSE_SERVICE);

            /* Subscribe to 4 EEG channels */
            for (const ch of ['tp9', 'af7', 'af8', 'tp10']) {
                const char = await this.service.getCharacteristic(MUSE_CHAR[ch]);
                await char.startNotifications();
                char.addEventListener('characteristicvaluechanged', (e) => this._onEEGPacket(ch, e.target.value));
            }

            /* Start streaming */
            this.controlChar = await this.service.getCharacteristic(MUSE_CHAR.control);
            await this._sendCommand('p50');
            await this._sendCommand('s');
            await this._sendCommand('d');

            /* Battery characteristic (optional) */
            try {
                const bat = await this.service.getCharacteristic(MUSE_CHAR.battery);
                await bat.startNotifications();
                bat.addEventListener('characteristicvaluechanged', (e) => {
                    this.metrics.battery = e.target.getUint16(0, false) / 512;
                });
            } catch(_) { /* battery not always available */ }

            this.isConnected  = true;
            this.isConnecting = false;
            this.simulationMode = false;
            this._emit('connection', { status: 'connected', deviceName: this.device.name });
            return true;

        } catch (err) {
            this.isConnecting = false;
            if (err.name === 'NotFoundError') {
                this._emit('error', 'Tidak ada perangkat Muse yang dipilih.');
            } else {
                this._emit('error', `Koneksi gagal: ${err.message}`);
            }
            return false;
        }
    },

    async disconnect() {
        this._stopSimulation();
        if (this.device?.gatt?.connected) {
            try { await this._sendCommand('h'); } catch(_) {}
            this.device.gatt.disconnect();
        }
        this._reset();
        this._emit('connection', { status: 'disconnected' });
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
        /* 12-byte Muse packet:
           [0-1] = 16-bit sequence number
           [2-11] = 5 × 10-bit samples packed big-endian */
        const buf = this.buffers[channel];

        for (let i = 0; i < MUSE_SAMPLES_PER_PACKET; i++) {
            const byteOffset = 2 + Math.floor(i * 10 / 8);
            const bitOffset  = (i * 10) % 8;
            let val = (dataView.getUint8(byteOffset) << 8 | dataView.getUint8(byteOffset + 1));
            val = (val >> (6 - bitOffset)) & 0x3FF;
            /* Convert to microvolts: Muse ADC ref 1.2V, 10-bit → ±0.7 mV range */
            const uv = (val - 512) * 0.48828125;
            buf.push(uv);
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
        /* Apply Hanning window */
        const windowed = samples.map((s, i) => s * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (samples.length - 1))));

        /* Cooley-Tukey in-place FFT */
        const N = windowed.length;
        const re = Float64Array.from(windowed);
        const im = new Float64Array(N);
        this._fft(re, im, N);

        /* Compute power spectral density per bin */
        const freqRes = MUSE_SAMPLE_RATE / N;   /* Hz per bin */
        const psd = new Float64Array(N / 2);
        for (let k = 1; k < N / 2; k++) {
            psd[k] = (re[k] * re[k] + im[k] * im[k]) / (N * N);
        }

        /* Integrate power in each band */
        const powers = {};
        for (const [band, [lo, hi]] of Object.entries(BANDS)) {
            let p = 0;
            for (let k = Math.round(lo / freqRes); k <= Math.round(hi / freqRes) && k < psd.length; k++) {
                p += psd[k];
            }
            powers[band] = p * 1e6;  /* scale to readable units */
        }

        /* Alpha peak frequency */
        let peakPow = 0, peakFreq = 10;
        const loK = Math.round(BANDS.alpha[0] / freqRes);
        const hiK = Math.round(BANDS.alpha[1] / freqRes);
        for (let k = loK; k <= hiK && k < psd.length; k++) {
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
            mentalState   = EEGFeatures.classifyMentalState(powers, faa);
            cognitiveLoad = EEGFeatures.classifyCognitiveLoad(powers);
            /* Emotion uses the richer 15-feature vector (real Muse-trained) */
            if (typeof NNRuntime !== 'undefined' && NNRuntime.has('emotion')) {
                const ev = this.emotionFeatureVector();
                if (ev) {
                    try {
                        const out = NNRuntime.predict('emotion', ev);
                        if (out && out.label) emotion = { label: out.label, prob: out.prob, probs: out.probs };
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
    async _sendCommand(cmd) {
        if (!this.controlChar) return;
        const encoded = new TextEncoder().encode(`X${cmd}\n`);
        const packet  = new Uint8Array(encoded.length + 1);
        packet[0] = encoded.length;
        packet.set(encoded, 1);
        await this.controlChar.writeValue(packet);
    },

    _onDisconnected() {
        this._reset();
        this._emit('connection', { status: 'disconnected' });
    },

    _reset() {
        this.isConnected  = false;
        this.isConnecting = false;
        this.device = this.server = this.service = this.controlChar = null;
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
    onConnection:(cb) => MuseEEG.onConnection(cb),
    onError:     (cb) => MuseEEG.onError(cb),
    startSimulation:(...a) => MuseEEG.startSimulation(...a),
    stopSimulation:  () => MuseEEG.stopSimulation()
};
