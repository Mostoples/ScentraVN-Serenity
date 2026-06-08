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
    setHealthBadge('healthLiveBadge', 'waiting', 'Menunggu data…');
    setHealthBadge('liveIndicator', 'waiting', t('metric.live') || 'live');
    setHealthBadge('eegLive', 'off', 'Muse mati');

    // Berlangganan data live dari App ScentraVN (Firebase RTDB)
    wireHealthLiveBridge();
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
        esp32:       { source: 'ESP32_WATCH', connected: false, bpm: null, spo2: null, bt: null, battery: null, updatedAt: 0 },
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
}

// ── BLE connect buttons (Muse S Gen 2 + ScentraVN Watch) ──
function wireHealthBleButtons() {
    const museBtn = document.getElementById('dev-muse-connect');
    const espBtn  = document.getElementById('dev-esp-connect');

    if (museBtn) museBtn.onclick = async () => {
        if (typeof MuseEEG === 'undefined') return;
        if (MuseEEG.isConnected) { await MuseEEG.disconnect(); setHealthBtn(museBtn, 'Hubungkan', false); return; }
        setHealthBtn(museBtn, 'Menghubungkan…', true);
        const ok = await MuseEEG.connect();
        setHealthBtn(museBtn, ok ? 'Putuskan' : 'Hubungkan', false);
        if (!ok && typeof Utils !== 'undefined') Utils.showToast?.('Muse: gagal / dibatalkan', 'warning');
    };

    if (espBtn) espBtn.onclick = async () => {
        if (typeof BLEConnection === 'undefined') return;
        if (BLEConnection.isConnected && BLEConnection.isConnected()) { await BLEConnection.disconnect(); setHealthBtn(espBtn, 'Hubungkan', false); return; }
        setHealthBtn(espBtn, 'Menghubungkan…', true);
        try { await BLEConnection.connect(); setHealthBtn(espBtn, 'Putuskan', false); }
        catch (e) { setHealthBtn(espBtn, 'Hubungkan', false); }
    };

    // Reflect current connection state on entry
    const museOn = (typeof MuseEEG !== 'undefined') && MuseEEG.isConnected;
    const espOn  = (typeof BLEConnection !== 'undefined') && BLEConnection.isConnected && BLEConnection.isConnected();
    if (museBtn) setHealthBtn(museBtn, museOn ? 'Putuskan' : 'Hubungkan', false);
    if (espBtn)  setHealthBtn(espBtn, espOn ? 'Putuskan' : 'Hubungkan', false);
}

function _syncHealthBtn(id, connected) {
    const btn = document.getElementById(id);
    if (btn) setHealthBtn(btn, connected ? 'Putuskan' : 'Hubungkan', false);
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
 * Stres = kategori dari Watch, EEG dari Muse. BP/EKG tidak ada.
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
    if (!avail)       setHealthBadge('healthLiveBadge', 'off', 'Belum ada perangkat');
    else if (anyOn)   setHealthBadge('healthLiveBadge', 'live', bleOn ? 'LIVE — Bluetooth' : 'LIVE — app tersambung');
    else              setHealthBadge('healthLiveBadge', 'waiting', 'Menunggu data…');

    // ── Kartu perangkat (read-only) ──
    renderDeviceCard('gw', gw);
    renderDeviceCard('esp', esp);
    renderDeviceCard('muse', muse);

    // ── Detak jantung: Watch → fallback ESP32 ──
    let hr = 0, hrSrc = '—';
    if (gw.connected && gw.bpm > 0)       { hr = gw.bpm;  hrSrc = 'Galaxy Watch'; }
    else if (esp.connected && esp.bpm > 0) { hr = esp.bpm; hrSrc = 'ScentraVN Watch'; }
    renderHeartRate(hr, hrSrc);

    // ── SpO₂: HANYA ESP32 ──
    const spo2 = (esp.connected && esp.spo2 != null && esp.spo2 > 0) ? esp.spo2 : 0;
    renderSpO2(spo2);

    // ── Suhu tubuh: HANYA ScentraVN Watch (MLX90614) ──
    const bt = (esp.connected && esp.bt != null && esp.bt > 0) ? esp.bt : null;
    renderBodyTemp(bt);

    // ── Indikator vital live ──
    setHealthBadge('liveIndicator', (hr > 0 || spo2 > 0) ? 'live' : 'waiting', t('metric.live') || 'live');

    // ── Stres (kategori, dari Watch) ──
    renderStress(gw.connected ? gw.stress.level : null);

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
    if (stat) stat.textContent = !dev.connected ? 'Tidak terhubung' : (stale ? 'Sinyal tertunda' : 'Terhubung');
    if (batt) batt.textContent = dev.battery != null ? `${Math.round(dev.battery)}%` : '—';
    if (upd)  upd.textContent  = dev.updatedAt ? `diperbarui ${agoText(age)}` : 'belum ada data';
}

// ─────────────────────────────────────────────
// VITALS
// ─────────────────────────────────────────────

function renderHeartRate(hr, source) {
    const valEl = document.getElementById('hrValue');
    const stEl  = document.getElementById('hrStatus');
    const srcEl = document.getElementById('hrSource');

    if (valEl) valEl.textContent = hr > 0 ? hr : '--';
    if (srcEl) srcEl.textContent = source;
    if (stEl) {
        if (hr > 0 && typeof Utils !== 'undefined' && Utils.getHeartRateStatus) {
            const s = Utils.getHeartRateStatus(hr);
            stEl.textContent = s.status;
            stEl.style.color = statusHex(s.color);
        } else {
            stEl.textContent = '—';
            stEl.style.color = '';
        }
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

function renderStress(level) {
    const catEl = document.getElementById('stressCategory');
    if (!catEl) return;
    const map = {
        rileks:      { t: 'Rileks',  c: '#4ade80' },
        rendah:      { t: 'Rendah',  c: '#34d399' },
        sedang:      { t: 'Sedang',  c: '#fbbf24' },
        tinggi:      { t: 'Tinggi',  c: '#f87171' },
        unavailable: { t: 'Belum dikalibrasi', c: '#94a3b8' },
    };
    const m = level ? (map[level] || map.unavailable) : { t: '—', c: '#94a3b8' };
    catEl.textContent = m.t;
    catEl.style.color = m.c;
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
        const rel = {};
        EEG_BANDS.forEach((b) => {
            const pct = (eeg[b] / sum) * 100;
            rel[b] = pct;
            setBand(b, `${pct.toFixed(0)}%`, pct);
        });
        updateEEGChart(rel);                 // chart memplot daya RELATIF (%)
        renderEEGIndices(eeg);
    } else {
        setHealthBadge('eegLive', 'off', 'Muse mati');
        EEG_BANDS.forEach((b) => setBand(b, '--', 0));
        renderEEGIndices(null);
    }

    const bat = document.getElementById('eegBattery');
    if (bat) bat.textContent = muse.battery != null ? `${Math.round(muse.battery)}%` : '--';
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

    if (focusEl) focusEl.textContent = eng != null
        ? `${eng < 0.6 ? 'Rendah' : eng <= 1.2 ? 'Sedang' : 'Tinggi'} (${eng.toFixed(2)})` : '--';
    if (relaxEl) relaxEl.textContent = med != null
        ? `${med < 1 ? 'Rendah' : med <= 2 ? 'Sedang' : 'Tinggi'} (${med.toFixed(2)})` : '--';

    // Status mental heuristik dari proporsi pita + indeks
    const total = a + b + th + g + d;
    const pAlpha = total > 0 ? a / total : 0;
    const pTheta = total > 0 ? th / total : 0;
    let label = 'Netral', color = '#475569', bg = '#f1f5f9';
    if (pTheta > 0.45 && eng != null && eng < 0.6)    { label = 'Mengantuk';    color = '#a16207'; bg = '#fef9c3'; }
    else if (eng != null && eng > 1.3)                { label = 'Fokus tinggi'; color = '#b45309'; bg = '#ffedd5'; }
    else if (med != null && med > 2 && pAlpha > 0.30) { label = 'Rileks';       color = '#15803d'; bg = '#dcfce7'; }
    else if (eng != null && eng >= 0.6)               { label = 'Fokus';        color = '#047857'; bg = '#d1fae5'; }
    if (chip) { chip.textContent = label; chip.style.display = ''; chip.style.background = bg; chip.style.color = color; }
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
                    display: true, beginAtZero: true, suggestedMax: 60,
                    grid: { color: 'rgba(124,58,237,0.08)' },
                    ticks: { maxTicksLimit: 5, color: '#94a3b8', font: { size: 10 }, callback: (v) => v + '%' },
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

function statusHex(colorClass) {
    const map = { success: '#10b981', warning: '#f59e0b', danger: '#ef4444', info: '#3b82f6', gray: '#94a3b8' };
    return map[colorClass] || map.gray;
}

function agoText(ms) {
    if (ms == null) return '—';
    const s = Math.round(ms / 1000);
    if (s < 2) return 'baru saja';
    if (s < 60) return `${s} dtk lalu`;
    return `${Math.round(s / 60)} mnt lalu`;
}

// ─────────────────────────────────────────────
// CLEANUP / EXPORT
// ─────────────────────────────────────────────

window.addEventListener('beforeunload', () => {
    unwireHealthLiveBridge();
    if (window._eegChart) { window._eegChart.destroy(); window._eegChart = null; }
});

window.initHealthPage = initHealthPage;
window.unwireHealthLiveBridge = unwireHealthLiveBridge;
