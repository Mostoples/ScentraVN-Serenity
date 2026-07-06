/**
 * ScentraVN Serenity — Health Monitoring Page (READ-ONLY)
 *
 * Halaman ini TIDAK menyambungkan perangkat. Penyambungan 3 perangkat
 * (Galaxy Watch, ESP32-C3, Muse S Gen 2) dilakukan di aplikasi Android
 * ScentraVN, yang mendorong snapshot live ke Firebase RTDB `/scentravn/live`.
 * Web app cukup membaca via `ScentraLive` (lihat js/firebase-live.js).
 */

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────

function initHealthPage() {
    initEEGChart();

    // Status awal netral
    setHealthBadge('healthLiveBadge', 'waiting', t('health.waiting'));
    setHealthBadge('liveIndicator', 'waiting', t('metric.live') || 'live');
    setHealthBadge('eegLive', 'off', t('health.muse_off'));

    // Berlangganan data live dari App ScentraVN (Firebase RTDB)
    wireHealthLiveBridge();

    // Kontrol rekam inline (mesin sama dengan halaman Raw Recorder)
    if (typeof HealthRecorder !== 'undefined') HealthRecorder.wire();

    // Tombol info "sinyal lemah" pada card HRV
    document.getElementById('eegHrvInfo')?.addEventListener('click', showPpgSignalTips);
    // Tombol tutorial Muse S Gen 2 (video) pada card EEG
    document.getElementById('eegTutorBtn')?.addEventListener('click', showMuseTutorial);
}

/** Modal video tutorial penggunaan Muse S Gen 2 (auto-play). */
function showMuseTutorial() {
    if (document.getElementById('museTutorOverlay')) return;
    const ov = document.createElement('div');
    ov.id = 'museTutorOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;background:rgba(15,12,40,.80);backdrop-filter:blur(4px);padding:16px;';
    ov.innerHTML =
        '<div style="position:relative;width:100%;max-width:760px;background:#000;border-radius:16px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.5);">' +
          '<button id="museTutorClose" aria-label="Tutup" style="position:absolute;top:10px;right:10px;z-index:2;width:38px;height:38px;border:none;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;font-size:1.05rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;"><i class="fas fa-xmark"></i></button>' +
          '<video id="museTutorVideo" src="tutor.mp4" controls autoplay playsinline preload="auto" style="width:100%;height:auto;max-height:78vh;display:block;background:#000;"></video>' +
          '<div style="padding:10px 14px;background:#0f0c28;color:#cbd5e1;font-size:.74rem;text-align:center;font-weight:600;">Tutorial penggunaan Muse S Gen 2</div>' +
        '</div>';
    document.body.appendChild(ov);

    const vid = document.getElementById('museTutorVideo');
    // Klik tombol = gesture pengguna → coba auto-play bersuara; jika diblokir, mute lalu play.
    const p = vid.play && vid.play();
    if (p && p.catch) p.catch(() => { vid.muted = true; const q = vid.play(); if (q && q.catch) q.catch(() => {}); });

    const close = () => { try { vid.pause(); } catch (e) {} ov.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.getElementById('museTutorClose').addEventListener('click', close);
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    document.addEventListener('keydown', onKey);
}

/** Tips to strengthen a weak Muse PPG signal (shown from the HRV card info button). */
function showPpgSignalTips() {
    const msg = 'Sinyal PPG (HRV) terlalu lemah untuk dihitung. Cara menguatkannya:\n\n'
        + '• Lap dahi dari keringat & minyak\n'
        + '• Singkirkan rambut / poni yang menutupi sensor di dahi\n'
        + '• Pasang headband lebih erat agar sensor menempel kulit\n'
        + '• Diam beberapa detik — gerakan merusak sinyal PPG\n\n'
        + 'Setelah nilai PPG (IR) naik & stabil, HRV akan muncul (kisaran wajar ~20–60 ms).';
    if (typeof Utils !== 'undefined' && Utils.alertModal) Utils.alertModal(msg, { title: 'Perkuat Sinyal PPG' });
    else alert(msg);
}

// ─────────────────────────────────────────────
// LIVE BRIDGE
// ─────────────────────────────────────────────

let _healthLiveUnsub = null;
let _lastLive = null;

// BLE overlays — direct Web Bluetooth connections from this page (independent
// of the Android→RTDB bridge). Galaxy Watch stays RTDB-only.
let _museOverlay = null;     // { eeg, battery, updatedAt }
let _espOverlay  = null;     // { bpm, spo2, battery, updatedAt }
let _museMetricsHandler = null;
let _bleDataHandler = null;
let _museConnHandler = null;
let _bleConnHandler = null;

function _emptyLive() {
    return {
        galaxyWatch: { source: 'GALAXY_WATCH', connected: false, bpm: null, battery: null, updatedAt: 0, stress: { value: null, level: 'unavailable' } },
        esp32:       { source: 'ESP32_WATCH', connected: false, bpm: null, spo2: null, bt: null, battery: null, updatedAt: 0, stress: { value: null, level: 'unavailable' } },
        muse:        { source: 'MUSE_S', connected: false, bpm: null, eeg: {}, battery: null, updatedAt: 0 },
    };
}

function wireHealthLiveBridge() {
    if (typeof ScentraLive !== 'undefined') {
        ScentraLive.start();
        if (_healthLiveUnsub) { _healthLiveUnsub(); _healthLiveUnsub = null; }
        _healthLiveUnsub = ScentraLive.onUpdate(applyHealthLiveSnapshot);
    }
    wireHealthBleButtons();
    wireHealthBleStreams();
}

function unwireHealthLiveBridge() {
    if (_healthLiveUnsub) { _healthLiveUnsub(); _healthLiveUnsub = null; }
    if (typeof MuseEEG !== 'undefined') {
        if (_museMetricsHandler && MuseEEG.offMetrics) MuseEEG.offMetrics(_museMetricsHandler);
    }
    if (typeof BLEConnection !== 'undefined') {
        if (_bleDataHandler && BLEConnection.offDataUpdate) BLEConnection.offDataUpdate(_bleDataHandler);
        if (_bleConnHandler && BLEConnection.offConnectionChange) BLEConnection.offConnectionChange(_bleConnHandler);
    }
    _museMetricsHandler = _bleDataHandler = _museConnHandler = _bleConnHandler = null;
    // Stop the recorder UI ticker (the recording itself keeps running in memory
    // so navigating away does not interrupt an active session).
    if (typeof HealthRecorder !== 'undefined') HealthRecorder._stopTick();
    // Stop the auto-insight pipeline (worker + timers).
    if (typeof EEGInsight !== 'undefined' && EEGInsight.running) EEGInsight.stop();
    _insightOn = false;
}

// ── BLE connect buttons (Muse S Gen 2 + ScentraVN Watch) ──
function wireHealthBleButtons() {
    const museBtn = document.getElementById('dev-muse-connect');
    const espBtn  = document.getElementById('dev-esp-connect');

    if (museBtn) museBtn.onclick = async () => {
        if (typeof MuseEEG === 'undefined') return;
        if (MuseEEG.isConnected || MuseEEG.simulationMode) {
            await MuseEEG.disconnect();
            _museOverlay = null;                 // buang data EEG lama
            setHealthBtn(museBtn, t('health.connect'), false);
            renderMergedHealth();                // refresh status kartu → "Tidak terhubung"
            return;
        }
        setHealthBtn(museBtn, t('health.connecting'), true);
        const ok = await MuseEEG.connect();
        setHealthBtn(museBtn, ok ? t('health.disconnect') : t('health.connect'), false);
        if (!ok && typeof Utils !== 'undefined') Utils.showToast?.(t('health.muse_connect_fail'), 'warning');
        renderMergedHealth();
    };

    if (espBtn) espBtn.onclick = async () => {
        if (typeof BLEConnection === 'undefined') return;
        if (BLEConnection.isConnected && BLEConnection.isConnected()) { await BLEConnection.disconnect(); setHealthBtn(espBtn, t('health.connect'), false); return; }
        setHealthBtn(espBtn, t('health.connecting'), true);
        try { await BLEConnection.connect(); setHealthBtn(espBtn, t('health.disconnect'), false); }
        catch (e) { setHealthBtn(espBtn, t('health.connect'), false); }
    };

    // Reflect current connection state on entry
    const museOn = (typeof MuseEEG !== 'undefined') && MuseEEG.isConnected;
    const espOn  = (typeof BLEConnection !== 'undefined') && BLEConnection.isConnected && BLEConnection.isConnected();
    if (museBtn) setHealthBtn(museBtn, museOn ? t('health.disconnect') : t('health.connect'), false);
    if (espBtn)  setHealthBtn(espBtn, espOn ? t('health.disconnect') : t('health.connect'), false);
}

function _syncHealthBtn(id, connected) {
    const btn = document.getElementById(id);
    if (btn) setHealthBtn(btn, connected ? t('health.disconnect') : t('health.connect'), false);
}

function setHealthBtn(btn, label, busy) {
    if (!btn) return;
    btn.disabled = !!busy;
    const icon = busy ? 'fa-spinner fa-spin' : 'fab fa-bluetooth-b';
    btn.innerHTML = `<i class="${busy ? 'fas ' + icon : icon}"></i> ${label}`;
}

// ── Subscribe to live BLE streams → overlay → re-render ──
function wireHealthBleStreams() {
    if (typeof MuseEEG !== 'undefined' && MuseEEG.onMetrics && !_museMetricsHandler) {
        _museMetricsHandler = (m) => {
            const p = m.powers || {};
            _museOverlay = {
                eeg: { delta: p.delta, theta: p.theta, alpha: p.alpha, beta: p.beta, gamma: p.gamma },
                battery: m.battery, updatedAt: Date.now(),
            };
            _syncHealthBtn('dev-muse-connect', true);
            renderMergedHealth();
        };
        MuseEEG.onMetrics(_museMetricsHandler);
    }
    if (typeof BLEConnection !== 'undefined' && BLEConnection.onDataUpdate && !_bleDataHandler) {
        _bleDataHandler = (d) => {
            const finger = d.finger !== false;
            _espOverlay = {
                bpm: finger ? d.hr : 0, spo2: finger ? d.spo2 : 0,
                bt: d.bt != null ? d.bt : null,   // MLX90614 body temperature (°C)
                // Tingkat stres dihitung di ScentraVN Watch (HR+GSR+suhu+SpO₂),
                // hanya valid saat finger terdeteksi.
                stress: (finger && d.stress != null && isFinite(d.stress))
                    ? { value: Number(d.stress), level: d.stressLevel || null }
                    : { value: null, level: 'unavailable' },
                battery: d.battery != null ? d.battery : null, updatedAt: Date.now(),
            };
            renderMergedHealth();
        };
        BLEConnection.onDataUpdate(_bleDataHandler);
    }
    // Keep ScentraVN connect button in sync (BLEConnection supports multi-listener).
    // Muse uses a single-slot onConnection callback (avoid clobbering it) — its
    // button is reflected from the metrics handler / onclick instead.
    if (typeof BLEConnection !== 'undefined' && BLEConnection.onConnectionChange && !_bleConnHandler) {
        _bleConnHandler = (isConnected) => {
            _syncHealthBtn('dev-esp-connect', !!isConnected);
            if (!isConnected) { _espOverlay = null; }
            renderMergedHealth();
        };
        BLEConnection.onConnectionChange(_bleConnHandler);
    }
}

/** Build a snapshot that merges the RTDB bridge data with live BLE overlays. */
function mergeBleOverlay(live) {
    const merged = JSON.parse(JSON.stringify(live || _emptyLive()));
    const museOn = (typeof MuseEEG !== 'undefined') && (MuseEEG.isConnected || MuseEEG.simulationMode);
    if (museOn && _museOverlay) {
        merged.muse.connected = true;
        merged.muse.source = MuseEEG.simulationMode ? 'MUSE_S (sim)' : 'MUSE_S (BLE)';
        merged.muse.eeg = _museOverlay.eeg;
        if (_museOverlay.battery != null) merged.muse.battery = _museOverlay.battery;
        merged.muse.updatedAt = _museOverlay.updatedAt;
    }
    const espOn = (typeof BLEConnection !== 'undefined') && BLEConnection.isConnected && BLEConnection.isConnected();
    if (espOn && _espOverlay) {
        merged.esp32.connected = true;
        merged.esp32.source = 'ESP32 (BLE)';
        if (_espOverlay.bpm != null)  merged.esp32.bpm = _espOverlay.bpm;
        if (_espOverlay.spo2 != null) merged.esp32.spo2 = _espOverlay.spo2;
        if (_espOverlay.bt != null)   merged.esp32.bt = _espOverlay.bt;
        if (_espOverlay.stress)       merged.esp32.stress = _espOverlay.stress;
        if (_espOverlay.battery != null) merged.esp32.battery = _espOverlay.battery;
        merged.esp32.updatedAt = _espOverlay.updatedAt;
    }
    return merged;
}

/** Re-render using the cached RTDB snapshot + current BLE overlays. */
function renderMergedHealth() {
    if (!document.getElementById('eegChart')) { unwireHealthLiveBridge(); return; }
    _renderHealthSnapshot(mergeBleOverlay(_lastLive));
}

/**
 * Render snapshot kontrak (galaxyWatch/esp32/muse) ke halaman health.
 * Jujur sesuai skema: HR dari Watch (fallback ESP32), SpO₂ HANYA ESP32,
 * Stres = angka 0–100 dari ScentraVN Watch (ESP32), EEG dari Muse. BP/EKG tidak ada.
 */
function applyHealthLiveSnapshot(live) {
    if (!document.getElementById('eegChart')) { unwireHealthLiveBridge(); return; }
    if (live) _lastLive = live;
    _renderHealthSnapshot(mergeBleOverlay(_lastLive || _emptyLive()));
}

function _renderHealthSnapshot(live) {
    if (!document.getElementById('eegChart')) { unwireHealthLiveBridge(); return; }
    if (!live) return;

    const gw = live.galaxyWatch, esp = live.esp32, muse = live.muse;

    // ── Badge global ──
    const bleOn = ((typeof MuseEEG !== 'undefined') && (MuseEEG.isConnected || MuseEEG.simulationMode)) ||
                  ((typeof BLEConnection !== 'undefined') && BLEConnection.isConnected && BLEConnection.isConnected());
    const avail = bleOn || ((typeof ScentraLive !== 'undefined') && ScentraLive.available);
    const anyOn = gw.connected || esp.connected || muse.connected;
    if (!avail)       setHealthBadge('healthLiveBadge', 'off', t('health.no_device'));
    else if (anyOn)   setHealthBadge('healthLiveBadge', 'live', bleOn ? t('health.live_bt') : t('health.live_app'));
    else              setHealthBadge('healthLiveBadge', 'waiting', t('health.waiting'));

    // ── Kartu perangkat (read-only) ──
    renderDeviceCard('gw', gw);
    renderDeviceCard('esp', esp);
    renderDeviceCard('muse', muse);

    // ── Detak jantung: DUA sumber (Galaxy Watch + ScentraVN Watch) ──
    const gwHr  = (gw.connected && gw.bpm > 0) ? gw.bpm : null;
    const espHr = (esp.connected && esp.bpm > 0) ? esp.bpm : null;
    renderHeartRate(gwHr, espHr);

    // ── SpO₂: HANYA ESP32 ──
    const spo2 = (esp.connected && esp.spo2 != null && esp.spo2 > 0) ? esp.spo2 : 0;
    renderSpO2(spo2);

    // ── Suhu tubuh: HANYA ScentraVN Watch (MLX90614) ──
    const bt = (esp.connected && esp.bt != null && esp.bt > 0) ? esp.bt : null;
    renderBodyTemp(bt);

    // ── Indikator vital live ──
    setHealthBadge('liveIndicator', (gwHr || espHr || spo2 > 0) ? 'live' : 'waiting', t('metric.live') || 'live');

    // ── Stres (angka 0–100, dari ScentraVN Watch / ESP32) ──
    const espStress = (esp.connected && esp.stress && esp.stress.value != null)
        ? esp.stress.value : null;
    renderStress(espStress);

    // ── EEG (Muse) ──
    renderEEG(muse);
}

// ─────────────────────────────────────────────
// DEVICE CARDS
// ─────────────────────────────────────────────

function renderDeviceCard(key, dev) {
    const dot  = document.getElementById(`dev-${key}-dot`);
    const stat = document.getElementById(`dev-${key}-status`);
    const batt = document.getElementById(`dev-${key}-batt`);
    const upd  = document.getElementById(`dev-${key}-updated`);

    const age = (typeof ScentraLive !== 'undefined') ? ScentraLive.ageMs(dev.updatedAt) : null;
    const stale = dev.connected && age != null && age > 8000;

    if (dot) {
        dot.classList.remove('on', 'stale');
        if (dev.connected && !stale) dot.classList.add('on');
        else if (stale)              dot.classList.add('stale');
    }
    if (stat) stat.textContent = !dev.connected ? t('health.not_connected') : (stale ? t('health.signal_delayed') : t('health.connected'));
    if (batt) batt.textContent = dev.battery != null ? `${Math.round(dev.battery)}%` : '—';
    if (upd)  upd.textContent  = dev.updatedAt ? t('health.updated', { ago: agoText(age) }) : t('health.no_data_yet');
}

// ─────────────────────────────────────────────
// VITALS
// ─────────────────────────────────────────────

/** Tampilkan DUA sumber BPM: Galaxy Watch + ScentraVN Watch. */
function renderHeartRate(gwHr, espHr) {
    setHrValue('hrGalaxy', gwHr);
    setHrValue('hrEsp', espHr);

    // Badge status berdasarkan pembacaan utama (Galaxy → fallback ScentraVN)
    const primary = gwHr != null ? gwHr : espHr;
    const stEl = document.getElementById('hrStatus');
    if (stEl) {
        if (primary != null && typeof Utils !== 'undefined' && Utils.getHeartRateStatus) {
            const s = Utils.getHeartRateStatus(primary);
            stEl.textContent = s.status;
            stEl.style.color = statusHex(s.color);
        } else {
            stEl.textContent = '—';
            stEl.style.color = '';
        }
    }
}

/** Set one BPM value cell, warnai sesuai status HR-nya. */
function setHrValue(id, hr) {
    const el = document.getElementById(id);
    if (!el) return;
    if (hr != null && hr > 0) {
        el.textContent = hr;
        el.style.color = (typeof Utils !== 'undefined' && Utils.getHeartRateStatus)
            ? statusHex(Utils.getHeartRateStatus(hr).color) : '#1e293b';
    } else {
        el.textContent = '--';
        el.style.color = '#94a3b8';
    }
}

function renderSpO2(spo2) {
    const valEl = document.getElementById('spo2Value');
    const stEl  = document.getElementById('spo2Status');
    if (valEl) valEl.textContent = spo2 > 0 ? spo2 : '--';
    if (stEl) {
        if (spo2 > 0 && typeof Utils !== 'undefined' && Utils.getSpO2Status) {
            const s = Utils.getSpO2Status(spo2);
            stEl.textContent = s.status;
            stEl.style.color = statusHex(s.color);
        } else {
            stEl.textContent = '—';
            stEl.style.color = '';
        }
    }
}

function renderBodyTemp(bt) {
    const valEl = document.getElementById('bodyTempValue');
    const stEl  = document.getElementById('bodyTempStatus');
    if (valEl) valEl.textContent = (bt != null && bt > 0) ? Number(bt).toFixed(1) : '--';
    if (stEl) {
        if (bt != null && bt > 0) {
            let label, color;
            if (bt < 35)         { label = t('health.temp_low');    color = 'info'; }
            else if (bt <= 37.5) { label = t('health.temp_normal'); color = 'success'; }
            else                 { label = t('health.temp_fever');  color = 'danger'; }
            stEl.textContent = label;
            stEl.style.color = statusHex(color);
        } else {
            stEl.textContent = '—';
            stEl.style.color = '';
        }
    }
}

/** Tingkat stres ScentraVN Watch — tampil ANGKA saja (0–100), warnai per level. */
function renderStress(value) {
    const catEl = document.getElementById('stressCategory');
    if (!catEl) return;
    if (value == null || !isFinite(value)) {
        catEl.textContent = '--';
        catEl.style.color = '#1e293b';
        return;
    }
    const v = Math.round(value);
    let c = '#10b981';                  // tenang
    if (v >= 67) c = '#ef4444';         // tinggi
    else if (v >= 34) c = '#f59e0b';    // sedang
    catEl.textContent = v;
    catEl.style.color = c;
}

// ─────────────────────────────────────────────
// EEG
// ─────────────────────────────────────────────

const EEG_BANDS = ['delta', 'theta', 'alpha', 'beta', 'gamma'];

/**
 * Proses & tampilkan EEG secara AKURAT:
 *  - daya pita absolut Muse → daya pita RELATIF (%) ternormalisasi (interpretable,
 *    bebas dari skala amplitudo/kontak elektroda),
 *  - indeks rasio tervalidasi: Engagement β/(α+θ) (Pope dkk.) & Relaksasi (α+θ)/(β+γ),
 *  - validasi input ketat (semua 5 pita ada, finite, ≥0, total>0) sebelum menghitung.
 */
function renderEEG(muse) {
    const setBand = (b, txt, pct) => {
        const el = document.getElementById('eeg' + b.charAt(0).toUpperCase() + b.slice(1));
        if (el) el.textContent = txt;
        const bar = document.getElementById('eegBar-' + b);
        if (bar) bar.style.width = (pct == null ? 0 : Math.min(100, pct)) + '%';
    };

    const eeg = muse.eeg || {};
    const vals = EEG_BANDS.map((b) => eeg[b]);
    const valid = muse.connected && vals.every((v) => v != null && isFinite(v) && v >= 0);
    const sum = valid ? vals.reduce((a, v) => a + v, 0) : 0;

    if (valid && sum > 0) {
        setHealthBadge('eegLive', 'live', 'LIVE');
        const max = Math.max(...vals, 1e-9);
        const raw = {};
        EEG_BANDS.forEach((b) => {
            const val = eeg[b];
            raw[b] = val;
            const barPct = (val / max) * 100;       // tinggi bar proporsional (visual)
            setBand(b, fmtBandPower(val), barPct);  // tampil NILAI MENTAH (bukan %)
        });
        updateEEGChart(raw);                 // chart memplot daya pita MENTAH
        renderEEGIndices(eeg);
    } else {
        setHealthBadge('eegLive', 'off', t('health.muse_off'));
        EEG_BANDS.forEach((b) => setBand(b, '--', 0));
        renderEEGIndices(null);
    }

    // Baterai Muse: prioritaskan data BLE langsung (jika tersedia) karena lebih
    // akurat dan lebih baru daripada snapshot RTDB.
    const liveBatt = (typeof MuseEEG !== 'undefined' && MuseEEG.metrics) ? MuseEEG.metrics.battery : null;
    const batteryValue = (liveBatt != null && isFinite(liveBatt)) ? liveBatt : muse.battery;
    const bat = document.getElementById('eegBattery');
    if (bat) bat.textContent = batteryValue != null ? `${Math.round(batteryValue)}%` : '--';

    // Muse-app-style contact gauge (electrode quality + battery) — only with a
    // real Muse link (the contact quality is derived from raw sample variance).
    const gaugeEl = document.getElementById('healthMuseGauge');
    const museReal = (typeof MuseGauge !== 'undefined') && MuseGauge.connected();
    if (gaugeEl) {
        if (museReal) { gaugeEl.style.display = 'block'; MuseGauge.render(gaugeEl); }
        else { gaugeEl.style.display = 'none'; }
    }

    // PPG cards (replaced Focus/Relax): live IR sample + HRV (RMSSD).
    const ppg = (typeof MuseEEG !== 'undefined' && MuseEEG.metrics) ? MuseEEG.metrics.ppg : null;
    const irEl = document.getElementById('eegPpgIr');
    if (irEl) irEl.textContent = (museReal && ppg && ppg.ir != null) ? Math.round(ppg.ir).toLocaleString('id-ID') : '--';
    // Show which bit-depth the PPG packets are being decoded as (16 or 24).
    const bitsEl = document.getElementById('eegPpgBits');
    const bits = (typeof MuseEEG !== 'undefined' && MuseEEG.metrics) ? MuseEEG.metrics.ppgBits : null;
    if (bitsEl) bitsEl.textContent = (museReal && bits) ? `· decode ${bits}-bit` : '';
    const hrvEl = document.getElementById('eegHrv');
    const hrvInfo = document.getElementById('eegHrvInfo');
    // HRV from the dedicated PPG→HRV pipeline (MusePPG), but ONLY when the signal
    // quality is good — a weak/poorly-seated PPG produces erratic, meaningless RMSSD.
    const sqi = (typeof MuseEEG !== 'undefined' && MuseEEG.metrics) ? (MuseEEG.metrics.ppgSqi || 0) : 0;
    const rmssd = (typeof MuseEEG !== 'undefined' && MuseEEG.metrics) ? MuseEEG.metrics.rmssd : null;
    let weak = false;
    if (hrvEl) {
      // Plausible resting RMSSD on consumer forehead PPG ≈ 5–150 ms; anything far
      // above that with a low SQI is artefact, not real HRV.
      if (museReal && rmssd != null && isFinite(rmssd) && rmssd >= 5 && rmssd <= 150 && sqi >= 0.5) {
        hrvEl.textContent = Math.round(rmssd) + ' ms';
        hrvEl.style.color = '';
      } else if (museReal && (MuseEEG.metrics.ppg && MuseEEG.metrics.ppg.ir != null)) {
        hrvEl.textContent = 'sinyal lemah';   // PPG present but quality too low for HRV
        hrvEl.style.color = '#b45309';
        weak = true;
      } else {
        hrvEl.textContent = '--';
        hrvEl.style.color = '';
      }
    }
    // Info button appears only when the signal is weak (tells how to strengthen it).
    if (hrvInfo) hrvInfo.style.display = weak ? 'inline-flex' : 'none';

    // Pre-conditioning baseline + auto-insight follow the real Muse link.
    if (typeof EEGInsight !== 'undefined') {
        if (museReal && !_insightOn) {
            _insightOn = true;
            EEGInsight.start({ onInsight: _onAutoInsight, onBaseline: _onBaselineState });
        } else if (!museReal && _insightOn) {
            _insightOn = false;
            EEGInsight.stop();
            _resetInsightUI();
        }
    }
}

// ── Auto-insight + pre-conditioning UI ──
let _insightOn = false;

function _onAutoInsight(label) {
    const ins = document.getElementById('eegInsight');
    if (ins && label) { ins.textContent = label.label; ins.className = 'heeg-auto-val tone-' + (label.tone || 'neutral'); }
}

function _onBaselineState(s) {
    const el = document.getElementById('eegBaseline');
    if (el) {
        el.style.display = 'flex';
        el.classList.remove('ready', 'warn');
        if (s.phase === 'ready') {
            el.classList.add('ready');
            el.innerHTML = '<i class="fas fa-circle-check"></i> Baseline siap — READY untuk merekam';
        } else if (s.phase === 'waiting_contact') {
            el.classList.add('warn');
            el.innerHTML = '<i class="fas fa-triangle-exclamation"></i> Perbaiki kontak elektroda dahi (AF7/AF8)…';
        } else {
            const pct = Math.min(100, Math.round((s.elapsed / s.total) * 100));
            const sec = Math.max(0, Math.ceil((s.total - s.elapsed) / 1000));
            el.innerHTML = `<i class="far fa-clock"></i> Kalibrasi baseline… ${sec}s <span class="bar"><span style="width:${pct}%"></span></span>`;
        }
    }
    if (typeof HealthRecorder !== 'undefined') HealthRecorder.setGate({ museConnected: true, ready: !!s.ready });
}

function _resetInsightUI() {
    const el = document.getElementById('eegBaseline');
    if (el) el.style.display = 'none';
    const ins = document.getElementById('eegInsight');
    if (ins) { ins.textContent = '—'; ins.className = 'heeg-auto-val tone-neutral'; }
    if (typeof HealthRecorder !== 'undefined') HealthRecorder.setGate({ museConnected: false, ready: false });
}

/** Hitung indeks kognitif tervalidasi + label status mental heuristik. */
function renderEEGIndices(eeg) {
    const focusEl = document.getElementById('eegFocusState');
    const relaxEl = document.getElementById('eegArousal');
    const chip = document.getElementById('eegMentalChip');

    if (!eeg) {
        if (focusEl) focusEl.textContent = '--';
        if (relaxEl) relaxEl.textContent = '--';
        if (chip) chip.style.display = 'none';
        return;
    }

    const a = eeg.alpha, b = eeg.beta, th = eeg.theta, g = eeg.gamma, d = eeg.delta;
    const EF = (typeof EEGFeatures !== 'undefined') ? EEGFeatures : null;

    // Engagement (Pope dkk.): β/(α+θ) — tinggi = konsentrasi aktif
    const eng = EF && EF.engagementIndex
        ? EF.engagementIndex({ alpha: a, beta: b, theta: th })
        : ((a + th) > 0 ? +(b / (a + th)).toFixed(3) : null);
    // Relaksasi/meditasi: (α+θ)/(β+γ) — tinggi = lebih rileks
    const med = EF && EF.meditationIndex
        ? EF.meditationIndex({ alpha: a, theta: th, beta: b, gamma: g })
        : ((b + g) > 0 ? +(((a + th) / (b + g))).toFixed(3) : null);

    // Tampilkan ANGKA saja (indeks), tanpa label kualitatif
    if (focusEl) focusEl.textContent = eng != null ? eng.toFixed(2) : '--';
    if (relaxEl) relaxEl.textContent = med != null ? med.toFixed(2) : '--';

    // Chip status mental disembunyikan (hanya angka di halaman ini)
    if (chip) chip.style.display = 'none';
}

function initEEGChart() {
    const canvas = document.getElementById('eegChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (window._eegChart) { window._eegChart.destroy(); window._eegChart = null; }

    const empty = Array(60).fill(null);
    const ds = (label, color) => ({
        label, data: [...empty], borderColor: color,
        backgroundColor: 'transparent', borderWidth: 1.5, pointRadius: 0, tension: 0.3,
    });

    window._eegChart = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: Array(60).fill(''),
            datasets: [
                ds('Delta', '#3b82f6'), ds('Theta', '#8b5cf6'), ds('Alpha', '#10b981'),
                ds('Beta', '#f59e0b'), ds('Gamma', '#ef4444'),
            ],
        },
        options: {
            responsive: true, maintainAspectRatio: false, animation: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: true, position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 11 } } },
                tooltip: { enabled: true },
            },
            scales: {
                x: { display: false, grid: { display: false } },
                y: {
                    display: true, beginAtZero: true,
                    grid: { color: 'rgba(124,58,237,0.08)' },
                    ticks: { maxTicksLimit: 5, color: '#94a3b8', font: { size: 10 } },
                },
            },
        },
    });
}

function updateEEGChart(eeg) {
    const chart = window._eegChart;
    if (!chart) return;
    const MAX = 60;
    const bands = ['delta', 'theta', 'alpha', 'beta', 'gamma'];

    chart.data.labels.push('');
    if (chart.data.labels.length > MAX) chart.data.labels.shift();

    bands.forEach((band, i) => {
        chart.data.datasets[i].data.push(eeg[band] ?? null);
        if (chart.data.datasets[i].data.length > MAX) chart.data.datasets[i].data.shift();
    });
    chart.update('none');
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function setHealthBadge(id, state, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('live', 'waiting', 'off');
    el.classList.add(state);
    const txt = el.querySelector('.txt');
    if (txt) txt.textContent = text; else el.textContent = text;
}

/** Format a raw band-power value for display (no percent). */
function fmtBandPower(v) {
    if (v == null || !isFinite(v)) return '--';
    if (v >= 100) return String(Math.round(v));
    if (v >= 10)  return v.toFixed(1);
    return v.toFixed(2);
}

function statusHex(colorClass) {
    const map = { success: '#10b981', warning: '#f59e0b', danger: '#ef4444', info: '#3b82f6', gray: '#94a3b8' };
    return map[colorClass] || map.gray;
}

function agoText(ms) {
    if (ms == null) return '—';
    const s = Math.round(ms / 1000);
    if (s < 2) return t('health.just_now');
    if (s < 60) return t('health.secs_ago', { s });
    return t('health.mins_ago', { m: Math.round(s / 60) });
}

// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// INLINE RECORDER (same engine as the Raw Recorder page, via RawRecorder)
// Records the synchronized device streams and saves to Firestore. Start/Pause/
// Stop behave exactly like the Raw Recorder: Pause checkpoints a draft to the
// device; Stop uploads to the cloud and offers to open the History page.
// ─────────────────────────────────────────────

const HealthRecorder = {
    _timer: null,
    _busy: false,
    _gate: { museConnected: false, ready: false },

    /** Pre-conditioning gate: block Start until the 30 s baseline is READY
     *  (only while a real Muse link is present). */
    setGate(g) { this._gate = Object.assign({}, this._gate, g); this.updateUI(); },

    wire() {
        const btn = document.getElementById('hrecBtn');
        const stop = document.getElementById('hrecStop');
        if (!btn) return;
        btn.onclick = () => this._toggle();
        if (stop) stop.onclick = () => this._stop();
        const csv = document.getElementById('hrecCsv');
        if (csv) csv.onclick = () => this._exportCsv();
        this.updateUI();
        this._startTick();
    },

    async _exportCsv() {
        if (typeof SessionStore === 'undefined') { this._toast('Penyimpanan sesi tidak tersedia', 'error'); return; }
        const btn = document.getElementById('hrecCsv');
        const orig = btn ? btn.innerHTML : '';
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CSV'; }
        const stamp = this._stamp();
        const fname = `scentravn-muse-${stamp}.csv`;
        const blob = await SessionStore.exportCsv('muse', fname);
        if (btn) { btn.disabled = false; btn.innerHTML = orig; }
        if (!blob || blob.size <= 0) { this._toast('Belum ada data sesi untuk diekspor', 'warning'); return; }
        this._download(blob, fname);
        this._toast('CSV diekspor', 'success');
    },

    _download(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    _stamp() { const d = new Date(); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; },

    _startTick() {
        this._stopTick();
        // Once a second: refresh UI AND flush new frames to the storage worker
        // (IndexedDB) so the session is persisted off the main thread.
        this._timer = setInterval(() => {
            if (typeof RawRecorder !== 'undefined' && RawRecorder.recording) {
                this.updateUI();
                if (typeof SessionStore !== 'undefined') SessionStore.flush(RawRecorder.streams);
            }
        }, 1000);
    },
    _stopTick() { if (this._timer) { clearInterval(this._timer); this._timer = null; } },

    _toggle() {
        if (typeof RawRecorder === 'undefined') return;
        if (!RawRecorder.recording) {
            RawRecorder.start();
            if (typeof SessionStore !== 'undefined') SessionStore.begin();
        } else if (RawRecorder.paused) {
            RawRecorder.resume();
        } else {
            RawRecorder.pause();
            if (typeof SessionStore !== 'undefined') SessionStore.flush(RawRecorder.streams);
            RawRecorder.saveDraft().then(ok => this._toast(ok ? t('rr.toast_draft_saved') : t('rr.toast_draft_failed'), ok ? 'success' : 'error'));
        }
        this.updateUI();
    },

    async _stop() {
        if (typeof RawRecorder === 'undefined' || this._busy) return;
        const sum = RawRecorder.stop();
        // Final flush so the storage worker (IndexedDB) holds the whole session
        // for CSV export before the in-memory streams are reset.
        if (typeof SessionStore !== 'undefined') await SessionStore.flush(RawRecorder.streams);
        this.updateUI();
        if (!sum || sum.total === 0) {
            await RawRecorder.clearDraft();
            RawRecorder.reset();
            this.updateUI();
            this._toast(t('rr.toast_empty'), 'warning');
            return;
        }
        this._busy = true;
        this._setStatus(t('rr.status_saving'));
        const name = (typeof RawRecorder.prettyName === 'function') ? RawRecorder.prettyName() : 'ScentraVN Record';
        // Offline-safe commit: never blocks on the network. Returns immediately
        // with a draft when offline; auto-uploads once the connection returns.
        const res = await RawRecorder.commitSession({ name });
        this._busy = false;
        RawRecorder.reset();
        this.updateUI();
        this._setStatus(res.status === 'saved' ? t('rr.status_saved') : t('rr.status_ready'));

        // Go straight to the History page; show the result toast over it.
        if (typeof Router !== 'undefined') Router.navigate('recordhistory');
        const saved = res.status === 'saved';
        setTimeout(() => {
            this._toast(saved ? t('rr.toast_saved', { n: sum.total }) : t('rr.toast_local'), saved ? 'success' : 'info');
        }, 300);
    },

    updateUI() {
        if (typeof RawRecorder === 'undefined') return;
        const rec = RawRecorder.recording, paused = RawRecorder.paused;
        const btn = document.getElementById('hrecBtn');
        const icon = btn && btn.querySelector('i');
        const label = document.getElementById('hrecLabel');
        const stop = document.getElementById('hrecStop');
        const status = document.getElementById('hrecStatus');
        const timeEl = document.getElementById('hrecTime');
        const framesEl = document.getElementById('hrecFrames');
        // Block starting a fresh session until the baseline is READY (Muse only).
        const gateBlock = !rec && this._gate.museConnected && !this._gate.ready;
        if (icon) icon.className = (rec && !paused) ? 'fas fa-pause' : 'fas fa-play';
        if (btn) { btn.classList.toggle('is-rec', rec && !paused); btn.disabled = gateBlock || this._busy; }
        if (label) label.textContent = gateBlock ? 'Kalibrasi…' : (!rec ? t('rr.lbl_start') : (paused ? t('rr.lbl_resume') : t('rr.lbl_pause')));
        if (stop) stop.style.display = rec ? 'inline-flex' : 'none';
        if (status) {
            status.classList.remove('rec', 'pause');
            if (rec && !paused) status.classList.add('rec');
            else if (paused) status.classList.add('pause');
            status.textContent = !rec ? t('rr.status_ready') : (paused ? t('rr.status_paused') : t('rr.status_recording'));
        }
        const sum = RawRecorder.getSummary ? RawRecorder.getSummary() : { total: 0, durationSec: 0 };
        if (timeEl) timeEl.textContent = this._fmtTime(RawRecorder.elapsedSec ? RawRecorder.elapsedSec() : (sum.durationSec || 0));
        if (framesEl) framesEl.textContent = (sum.total || 0).toLocaleString();
    },

    _setStatus(tx) { const s = document.getElementById('hrecStatus'); if (s) s.textContent = tx; },
    _fmtTime(s) { s = Math.max(0, Math.floor(s || 0)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; },
    _toast(msg, type) { if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast(msg, type || 'info'); },
    async _confirm(msg) {
        if (typeof Utils !== 'undefined' && Utils.confirmModal) return await Utils.confirmModal(msg, { confirmText: t('rr.history') || 'Riwayat', cancelText: 'Nanti' });
        return confirm(msg);
    },
};
window.HealthRecorder = HealthRecorder;

// ─────────────────────────────────────────────
// CLEANUP / EXPORT
// ─────────────────────────────────────────────

window.addEventListener('beforeunload', () => {
    unwireHealthLiveBridge();
    if (window._eegChart) { window._eegChart.destroy(); window._eegChart = null; }
});

window.initHealthPage = initHealthPage;
window.unwireHealthLiveBridge = unwireHealthLiveBridge;
