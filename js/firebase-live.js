/**
 * ScentraVN Serenity — Live Bridge (Firebase Realtime Database)
 *
 * Menyambungkan web app ke APP ANDROID ScentraVN lewat Firebase RTDB.
 * App Android = jembatan (connect 3 device) → menulis snapshot live ke
 * `/scentravn/live` tiap ~0.5 dtk. Web app cukup `onValue()` — TANPA login.
 *
 * Kontrak data: lihat WEB_APP_INTEGRATION.md §3.
 *   /scentravn/live/galaxyWatch  { source, connected, bpm, battery, stress:{value,level,source,updatedAt}, updatedAt }
 *   /scentravn/live/esp32        { source, connected, bpm, spo2, battery, updatedAt }
 *   /scentravn/live/muse         { source, connected, bpm, eeg:{delta,theta,alpha,beta,gamma}, betaAlpha, battery, updatedAt }
 *
 * ⚠️ RTDB menghapus field bernilai null → di JS jadi `undefined`. Selalu pakai
 *    cek longgar `x != null` (menangkap null & undefined).
 */
(() => {
  'use strict';

  const LIVE_PATH = 'scentravn/live';
  const BUF_MAX = 120;          // ~1 menit @ 2 Hz untuk sparkline

  const ScentraLive = {
    started: false,
    available: false,
    ref: null,
    latest: {},                 // snapshot mentah terakhir (ternormalisasi)
    _subs: new Set(),
    _bpmBuf: { galaxyWatch: [], esp32: [], muse: [] },
    _skewMs: 0,                 // koreksi beda jam HP vs browser
    _lastRecvAt: 0,

    /* ── Lifecycle ─────────────────────────────────────────────────── */
    start() {
      if (this.started) return;

      if (typeof firebase === 'undefined' || typeof firebase.database !== 'function') {
        console.warn('[ScentraLive] firebase-database SDK belum dimuat — live bridge nonaktif.');
        return;
      }

      try {
        const db = firebase.database();
        this.ref = db.ref(LIVE_PATH);
        this.ref.on('value', (snap) => this._onSnapshot(snap.val()), (err) => {
          console.error('[ScentraLive] RTDB read error:', err);
        });
        this.started = true;
        this.available = true;
        console.log('[ScentraLive] Tersambung ke', LIVE_PATH);
      } catch (e) {
        console.error('[ScentraLive] gagal init RTDB:', e);
      }
    },

    stop() {
      if (this.ref) { try { this.ref.off(); } catch (_) {} }
      this.ref = null;
      this.started = false;
    },

    /** Daftar callback dipanggil tiap update: cb(live). Return fungsi unsubscribe. */
    onUpdate(cb) {
      if (typeof cb !== 'function') return () => {};
      this._subs.add(cb);
      if (this.latest && Object.keys(this.latest).length) {
        try { cb(this.latest); } catch (_) {}
      }
      return () => this._subs.delete(cb);
    },

    /* ── Snapshot handling ─────────────────────────────────────────── */
    _onSnapshot(raw) {
      const live = this._normalize(raw || {});
      this.latest = live;
      this._lastRecvAt = Date.now();

      /* Koreksi beda jam: bandingkan updatedAt terbaru device dgn jam browser */
      const maxUpdated = Math.max(
        live.galaxyWatch.updatedAt || 0,
        live.esp32.updatedAt || 0,
        live.muse.updatedAt || 0
      );
      if (maxUpdated > 0) this._skewMs = this._lastRecvAt - maxUpdated;

      /* Buffer BPM untuk sparkline */
      this._pushBpm('galaxyWatch', live.galaxyWatch.bpm);
      this._pushBpm('esp32', live.esp32.bpm);
      this._pushBpm('muse', live.muse.bpm);

      /* Cermin status koneksi ke kartu device dashboard (kalau ada) */
      this._reflectDashboard(live);

      /* Broadcast */
      for (const cb of this._subs) { try { cb(live); } catch (e) { console.error(e); } }

      /* Render halaman live kalau sedang dibuka */
      if (document.getElementById('liveRoot')) this._render(live);
    },

    /** Pastikan tiap device punya bentuk yang konsisten (null-safe). */
    _normalize(raw) {
      const gw = raw.galaxyWatch || {};
      const esp = raw.esp32 || {};
      const muse = raw.muse || {};
      const st = gw.stress || {};
      return {
        galaxyWatch: {
          source: gw.source || 'GALAXY_WATCH',
          connected: gw.connected === true,
          bpm: this._num(gw.bpm),
          battery: this._num(gw.battery),
          updatedAt: this._num(gw.updatedAt) || 0,
          stress: {
            value: this._num(st.value),
            level: st.level || 'unavailable',
            source: st.source || null,
            updatedAt: this._num(st.updatedAt) || 0,
          },
        },
        esp32: {
          source: esp.source || 'ESP32_WATCH',
          connected: esp.connected === true,
          bpm: this._num(esp.bpm),
          spo2: this._num(esp.spo2),
          battery: this._num(esp.battery),
          updatedAt: this._num(esp.updatedAt) || 0,
        },
        muse: {
          source: muse.source || 'MUSE_S',
          connected: muse.connected === true,
          bpm: this._num(muse.bpm),
          eeg: {
            delta: this._num(muse.eeg?.delta),
            theta: this._num(muse.eeg?.theta),
            alpha: this._num(muse.eeg?.alpha),
            beta: this._num(muse.eeg?.beta),
            gamma: this._num(muse.eeg?.gamma),
          },
          betaAlpha: this._num(muse.betaAlpha),
          battery: this._num(muse.battery),
          updatedAt: this._num(muse.updatedAt) || 0,
        },
      };
    },

    _num(v) { return (v != null && isFinite(v)) ? Number(v) : null; },

    _pushBpm(dev, bpm) {
      if (bpm != null && bpm > 0) {
        const b = this._bpmBuf[dev];
        b.push(bpm);
        if (b.length > BUF_MAX) b.shift();
      }
    },

    /** Umur data device (ms) terkoreksi beda jam; null bila belum ada data. */
    ageMs(updatedAt) {
      if (!updatedAt) return null;
      return Math.max(0, (Date.now() - this._skewMs) - updatedAt);
    },

    /* ── Dashboard mirror (kartu device) ───────────────────────────── */
    _reflectDashboard(live) {
      this._setStatusBadge('watchStatus', live.galaxyWatch.connected);
      this._setStatusBadge('museStatus', live.muse.connected);
    },

    _setStatusBadge(id, on) {
      const el = document.getElementById(id);
      /* Hanya badge device-card dashboard — hindari bentrok dgn id sama di
         halaman health (mis. #museStatus yang berupa teks status). */
      if (!el || !el.classList.contains('device-card-status')) return;
      el.textContent = on ? 'ON' : 'OFF';
      el.classList.toggle('on', !!on);
      el.classList.toggle('off', !on);
    },

    /* ── Halaman Live Monitor ──────────────────────────────────────── */
    pageHTML() {
      return `
      <div id="liveRoot" class="live-root" style="max-width:1100px;margin:0 auto;padding:8px 4px 96px;">
        <div class="live-header" style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:18px;">
          <div>
            <h2 style="margin:0;font-size:1.45rem;font-weight:800;color:#4c1d95;display:flex;align-items:center;gap:10px;">
              <i class="fas fa-tower-broadcast" style="color:#7c3aed;"></i> Live Monitor
            </h2>
            <p style="margin:4px 0 0;font-size:0.82rem;color:#64748b;">
              Data realtime dari <b>App ScentraVN</b> via Firebase. Web app = semua tampilan.
            </p>
          </div>
          <div id="liveConnPill" class="live-conn-pill" style="display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;font-size:0.8rem;font-weight:700;background:#f1f5f9;color:#64748b;">
            <span id="liveConnDot" style="width:9px;height:9px;border-radius:50%;background:#cbd5e1;"></span>
            <span id="liveConnText">Menunggu data…</span>
          </div>
        </div>

        <div class="live-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;">

          <!-- Galaxy Watch -->
          ${this._deviceCardShell('gw', 'fa-watch-smart', 'Galaxy Watch', `
            <div style="display:flex;gap:18px;align-items:flex-end;flex-wrap:wrap;">
              <div>
                <div class="live-metric-big"><span id="gwBpm">—</span><sup style="font-size:0.5em;color:#94a3b8;"> bpm</sup></div>
                <div class="live-metric-cap">Detak jantung</div>
              </div>
              <div style="margin-left:auto;text-align:right;">
                <div id="gwStressChip" class="live-chip" style="background:#f1f5f9;color:#64748b;">Stres: —</div>
                <div class="live-metric-cap" style="margin-top:6px;">Baterai <span id="gwBatt">—</span></div>
              </div>
            </div>
            <canvas id="gwSpark" height="40" style="width:100%;margin-top:12px;display:block;"></canvas>
          `)}

          <!-- Scentravn Watch (ESP32 + MAX30102) -->
          ${this._deviceCardShell('esp', 'fa-microchip', 'Scentravn Watch (MAX30102)', `
            <div style="display:flex;gap:24px;flex-wrap:wrap;">
              <div>
                <div class="live-metric-big"><span id="espBpm">—</span><sup style="font-size:0.5em;color:#94a3b8;"> bpm</sup></div>
                <div class="live-metric-cap">Detak jantung</div>
              </div>
              <div>
                <div class="live-metric-big"><span id="espSpo2">—</span><sup style="font-size:0.5em;color:#94a3b8;"> %</sup></div>
                <div class="live-metric-cap">SpO₂</div>
              </div>
              <div style="margin-left:auto;text-align:right;">
                <div class="live-metric-cap">Baterai <span id="espBatt">—</span></div>
              </div>
            </div>
            <canvas id="espSpark" height="40" style="width:100%;margin-top:12px;display:block;"></canvas>
          `)}

          <!-- Muse S -->
          ${this._deviceCardShell('muse', 'fa-brain', 'Muse S Gen 2 (EEG)', `
            <div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-bottom:6px;">
              <div>
                <div class="live-metric-big"><span id="museBA">—</span></div>
                <div class="live-metric-cap">Rasio β/α (arousal kognitif)</div>
              </div>
              <div style="margin-left:auto;text-align:right;">
                <div class="live-metric-cap">Baterai <span id="museBatt">—</span></div>
              </div>
            </div>
            <div id="museBands" style="margin-top:8px;display:grid;gap:7px;">
              ${['delta','theta','alpha','beta','gamma'].map(k => `
                <div style="display:flex;align-items:center;gap:10px;">
                  <span style="width:46px;font-size:0.72rem;color:#64748b;text-transform:capitalize;">${k}</span>
                  <div style="flex:1;height:8px;background:#eef2ff;border-radius:99px;overflow:hidden;">
                    <div id="museBand-${k}" style="height:100%;width:0%;background:linear-gradient(90deg,#7c3aed,#a855f7);border-radius:99px;transition:width .3s;"></div>
                  </div>
                  <span id="museBandVal-${k}" style="width:38px;text-align:right;font-size:0.72rem;color:#4c1d95;font-weight:600;">—</span>
                </div>`).join('')}
            </div>
          `)}
        </div>

        <div style="margin-top:18px;padding:14px 16px;background:rgba(124,58,237,0.05);border-radius:14px;border:1px dashed rgba(124,58,237,0.25);font-size:0.78rem;color:#64748b;line-height:1.6;">
          <i class="fas fa-circle-info" style="color:#7c3aed;"></i>
          <b>Catatan kejujuran data:</b> SpO₂ hanya dari ESP32 (MAX30102) — Galaxy Watch tak punya API publik.
          Stres ditampilkan sebagai <b>kategori</b> (Rileks/Rendah/Sedang/Tinggi) hasil kalibrasi 3-titik di app.
          Tekanan darah &amp; EKG <b>tidak didukung</b> dan tidak ditampilkan.
        </div>
      </div>

      <style>
        .live-card{background:#fff;border-radius:18px;padding:18px 18px 16px;box-shadow:0 6px 22px rgba(76,29,149,0.07);border:1px solid rgba(124,58,237,0.08);}
        .live-card-head{display:flex;align-items:center;gap:11px;margin-bottom:14px;}
        .live-card-head .ic{width:38px;height:38px;border-radius:11px;background:rgba(124,58,237,0.1);display:flex;align-items:center;justify-content:center;color:#7c3aed;}
        .live-card-name{font-weight:800;color:#4c1d95;font-size:0.98rem;}
        .live-card-sub{font-size:0.7rem;color:#94a3b8;}
        .live-dev-status{margin-left:auto;font-size:0.68rem;font-weight:800;padding:4px 10px;border-radius:999px;background:#fee2e2;color:#b91c1c;letter-spacing:.4px;}
        .live-dev-status.on{background:#dcfce7;color:#15803d;}
        .live-dev-status.stale{background:#fef9c3;color:#a16207;}
        .live-metric-big{font-size:2.3rem;font-weight:800;color:#1e293b;line-height:1;}
        .live-metric-cap{font-size:0.72rem;color:#94a3b8;margin-top:3px;}
        .live-chip{display:inline-block;padding:5px 12px;border-radius:999px;font-size:0.78rem;font-weight:700;}
      </style>`;
    },

    _deviceCardShell(key, icon, name, body) {
      return `
      <div class="live-card">
        <div class="live-card-head">
          <div class="ic"><i class="fas ${icon}"></i></div>
          <div>
            <div class="live-card-name">${name}</div>
            <div class="live-card-sub" id="${key}Updated">menunggu…</div>
          </div>
          <span class="live-dev-status off" id="${key}Status">OFF</span>
        </div>
        ${body}
      </div>`;
    },

    /** Dipanggil router setelah Router.render(pageHTML()). */
    initPage() {
      this.start();
      this._render(this.latest || this._normalize({}));
      clearInterval(this._pageTimer);
      this._pageTimer = setInterval(() => {
        if (!document.getElementById('liveRoot')) { clearInterval(this._pageTimer); return; }
        this._render(this.latest || this._normalize({}));   // refresh "X dtk lalu" + status stale
      }, 1000);
    },

    destroyPage() { clearInterval(this._pageTimer); },

    _render(live) {
      if (!document.getElementById('liveRoot')) return;
      const gw = live.galaxyWatch, esp = live.esp32, muse = live.muse;

      /* Header koneksi keseluruhan */
      const anyOn = gw.connected || esp.connected || muse.connected;
      const dot = document.getElementById('liveConnDot');
      const txt = document.getElementById('liveConnText');
      if (dot && txt) {
        if (!this.available) { dot.style.background = '#ef4444'; txt.textContent = 'SDK Database belum dimuat'; }
        else if (anyOn) { dot.style.background = '#22c55e'; txt.textContent = 'Live — app tersambung'; }
        else { dot.style.background = '#f59e0b'; txt.textContent = 'App belum mengirim data'; }
      }

      /* ── Galaxy Watch ── */
      this._devStatus('gw', gw.connected, gw.updatedAt);
      this._set('gwBpm', (gw.bpm != null && gw.bpm > 0) ? gw.bpm : '—');
      this._set('gwBatt', gw.battery != null ? gw.battery + '%' : '—');
      this._renderStressChip(gw.stress);
      this._spark('gwSpark', this._bpmBuf.galaxyWatch, '#ef4444');

      /* ── ESP32 ── */
      this._devStatus('esp', esp.connected, esp.updatedAt);
      this._set('espBpm', (esp.bpm != null && esp.bpm > 0) ? esp.bpm : '—');
      this._set('espSpo2', esp.spo2 != null ? esp.spo2 : '—');
      this._set('espBatt', esp.battery != null ? esp.battery + '%' : '—');
      this._spark('espSpark', this._bpmBuf.esp32, '#3b82f6');

      /* ── Muse ── */
      this._devStatus('muse', muse.connected, muse.updatedAt);
      this._set('museBA', muse.betaAlpha != null ? muse.betaAlpha.toFixed(2) : '—');
      this._set('museBatt', muse.battery != null ? muse.battery + '%' : '—');
      this._renderBands(muse.eeg);
    },

    _renderStressChip(stress) {
      const el = document.getElementById('gwStressChip');
      if (!el) return;
      const map = {
        rileks:      { t: 'Rileks',  bg: '#dcfce7', fg: '#15803d' },
        rendah:      { t: 'Rendah',  bg: '#d1fae5', fg: '#047857' },
        sedang:      { t: 'Sedang',  bg: '#fef9c3', fg: '#a16207' },
        tinggi:      { t: 'Tinggi',  bg: '#fee2e2', fg: '#b91c1c' },
        unavailable: { t: 'Belum dikalibrasi', bg: '#f1f5f9', fg: '#64748b' },
      };
      const m = map[stress.level] || map.unavailable;
      el.textContent = 'Stres: ' + m.t;
      el.style.background = m.bg;
      el.style.color = m.fg;
    },

    _renderBands(eeg) {
      const keys = ['delta','theta','alpha','beta','gamma'];
      const total = keys.reduce((a, k) => a + (eeg[k] || 0), 0);
      for (const k of keys) {
        const v = eeg[k];
        const bar = document.getElementById('museBand-' + k);
        const lab = document.getElementById('museBandVal-' + k);
        if (v == null || total <= 0) {
          if (bar) bar.style.width = '0%';
          if (lab) lab.textContent = '—';
          continue;
        }
        const pct = (v / total) * 100;
        if (bar) bar.style.width = Math.min(100, pct).toFixed(1) + '%';
        if (lab) lab.textContent = pct.toFixed(0) + '%';
      }
    },

    _devStatus(key, connected, updatedAt) {
      const badge = document.getElementById(key + 'Status');
      const upd = document.getElementById(key + 'Updated');
      const age = this.ageMs(updatedAt);
      const stale = connected && age != null && age > 8000;

      if (badge) {
        badge.classList.remove('on', 'off', 'stale');
        if (!connected)      { badge.textContent = 'OFF';   badge.classList.add('off'); }
        else if (stale)      { badge.textContent = 'STALE'; badge.classList.add('stale'); }
        else                 { badge.textContent = 'ON';    badge.classList.add('on'); }
      }
      if (upd) {
        if (!updatedAt) upd.textContent = 'belum ada data';
        else upd.textContent = 'diperbarui ' + this._ago(age);
      }
    },

    _ago(ms) {
      if (ms == null) return '—';
      const s = Math.round(ms / 1000);
      if (s < 2) return 'baru saja';
      if (s < 60) return s + ' dtk lalu';
      const m = Math.round(s / 60);
      return m + ' mnt lalu';
    },

    _spark(canvasId, data, color) {
      const c = document.getElementById(canvasId);
      if (!c) return;
      const dpr = window.devicePixelRatio || 1;
      const w = c.clientWidth || 280, h = c.height;
      if (c.width !== w * dpr) { c.width = w * dpr; }
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      if (data.length < 2) return;

      const min = Math.min(...data), max = Math.max(...data);
      const range = (max - min) || 1;
      const stepX = w / (data.length - 1);
      ctx.beginPath();
      data.forEach((v, i) => {
        const x = i * stepX;
        const y = h - 4 - ((v - min) / range) * (h - 8);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.stroke();
    },

    _set(id, v) {
      const el = document.getElementById(id);
      if (el) el.textContent = (v == null || v === '') ? '—' : v;
    },
  };

  if (typeof window !== 'undefined') window.ScentraLive = ScentraLive;
})();
