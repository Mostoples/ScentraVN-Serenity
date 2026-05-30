/**
 * ScentraVN Serenity — Sleep Session UI controller
 *
 * Binds the SleepSession recorder + EEGFeatures to the Sleep Session view.
 *
 * Renders a live hypnogram (5 lanes: WAKE → REM → N1 → N2 → N3), running stats,
 * stage distribution bar chart, and a list of recent sessions stored in Firestore.
 */

(() => {
  'use strict';

  const STAGE_ORDER = ['wake', 'rem', 'n1', 'n2', 'n3'];
  const STAGE_LABELS = { wake: 'Awake', rem: 'REM', n1: 'N1', n2: 'N2', n3: 'N3', unknown: '—' };
  const STAGE_COLORS = {
    wake: '#f97316',
    rem:  '#a855f7',
    n1:   '#60a5fa',
    n2:   '#3b82f6',
    n3:   '#1d4ed8',
    unknown: '#94a3b8'
  };

  const SleepSessionUI = {
    timerHandle: null,

    init() {
      if (typeof SleepSession === 'undefined') return;

      SleepSession.onEpoch       = (e) => this._onEpoch(e);
      SleepSession.onStateChange = ()  => this._renderState();
      SleepSession.onSummary     = (s) => this._renderSummary(s);

      const btn = document.getElementById('sleepSessionBtn');
      const refresh = document.getElementById('sleepRefreshBtn');
      if (btn) btn.addEventListener('click', () => this._toggle());
      if (refresh) refresh.addEventListener('click', () => this._loadHistory());

      this._renderState();
      this._loadHistory();

      /* Re-render hypnogram with whatever epochs were already collected */
      this._renderHypnogram(SleepSession.epochs || []);

      /* Tick clock for elapsed time */
      this.timerHandle = setInterval(() => this._tickClock(), 1000);
    },

    destroy() {
      if (this.timerHandle) clearInterval(this.timerHandle);
      this.timerHandle = null;
    },

    /* ── Toggle start/stop ────────────────────────────────────────── */
    async _toggle() {
      if (SleepSession.isRunning) {
        const summary = await SleepSession.stop();
        this._renderSummary(summary);
      } else {
        await SleepSession.start({ source: 'manual' });
      }
    },

    _renderState() {
      const btn   = document.getElementById('sleepSessionBtn');
      const status = document.getElementById('sleepStatus');
      if (!btn) return;
      const span  = btn.querySelector('span');
      const icon  = btn.querySelector('i');

      if (SleepSession.isRunning) {
        if (span) span.textContent = 'Stop';
        if (icon) icon.className = 'fas fa-stop';
        if (status) status.textContent = 'recording';
        if (status) status.style.color = '#10b981';
      } else {
        if (span) span.textContent = 'Start';
        if (icon) icon.className = 'fas fa-play';
        if (status) status.textContent = 'idle';
        if (status) status.style.color = '#64748b';
      }
    },

    /* ── Live tick ────────────────────────────────────────────────── */
    _tickClock() {
      if (!SleepSession.isRunning || !SleepSession.startTs) return;
      const elapsed = Date.now() - SleepSession.startTs;
      const el = document.getElementById('sleepElapsed');
      if (el) el.textContent = this._fmtDuration(elapsed / 1000);
    },

    /* ── Per-epoch update ─────────────────────────────────────────── */
    _onEpoch(epoch) {
      const epochs = SleepSession.epochs;

      /* Counters */
      const c = document.getElementById('sleepEpochCount');
      if (c) c.textContent = epochs.length;

      const cur = document.getElementById('sleepCurrentStage');
      if (cur) {
        cur.textContent = STAGE_LABELS[epoch.stage] ?? epoch.stage;
        cur.style.color = STAGE_COLORS[epoch.stage] ?? '#4c1d95';
      }

      /* Live score */
      if (typeof EEGFeatures !== 'undefined') {
        const summary = EEGFeatures.summariseSleep(epochs.map(e => ({ stage: e.stage, durationSec: e.durationSec })));
        const sc = document.getElementById('sleepLiveScore');
        if (sc && summary) sc.textContent = summary.score;
      }

      this._renderHypnogram(epochs);
    },

    /* ── Hypnogram drawing ────────────────────────────────────────── */
    _renderHypnogram(epochs) {
      const track = document.getElementById('hypnogramTrack');
      if (!track) return;

      track.innerHTML = '';
      if (!epochs.length) return;

      const height = track.clientHeight || 90;
      const laneH  = height / STAGE_ORDER.length;

      const total = epochs.reduce((a, e) => a + e.durationSec, 0);
      let xCursor = 0;
      const trackWidth = track.clientWidth;

      epochs.forEach(e => {
        const w = (e.durationSec / total) * trackWidth;
        const laneIdx = STAGE_ORDER.indexOf(e.stage);
        if (laneIdx === -1) { xCursor += w; return; }

        const block = document.createElement('div');
        block.style.position = 'absolute';
        block.style.left = xCursor + 'px';
        block.style.top = (laneIdx * laneH) + 'px';
        block.style.width = Math.max(2, w) + 'px';
        block.style.height = laneH + 'px';
        block.style.background = STAGE_COLORS[e.stage];
        block.style.opacity = 0.85;
        block.style.borderRadius = '3px';
        block.title = `${STAGE_LABELS[e.stage]} · ${e.durationSec}s`;
        track.appendChild(block);

        xCursor += w;
      });
    },

    /* ── Summary panel ────────────────────────────────────────────── */
    _renderSummary(summary) {
      this._renderState();
      if (!summary || !summary.totalSec) return;
      const panel = document.getElementById('sleepDistPanel');
      const bars = document.getElementById('sleepStageBars');
      if (!panel || !bars) return;
      panel.style.display = 'block';

      const stages = STAGE_ORDER;
      bars.innerHTML = stages.map(s => {
        const pct = (summary.percentages?.[s] || 0);
        const dur = (summary.durationsSec?.[s] || 0);
        return `
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="width:60px; font-size:0.78rem; font-weight:700; color:${STAGE_COLORS[s]}; text-transform:uppercase;">${STAGE_LABELS[s]}</span>
            <div style="flex:1; height:10px; background: rgba(124,58,237,0.06); border-radius:99px; overflow:hidden;">
              <div style="height:100%; width:${pct}%; background:${STAGE_COLORS[s]}; transition: width 0.4s;"></div>
            </div>
            <span style="width:90px; text-align:right; font-size:0.75rem; color:#475569;">${pct.toFixed(1)}% · ${this._fmtDuration(dur)}</span>
          </div>
        `;
      }).join('');

      this._loadHistory();
    },

    /* ── History list ─────────────────────────────────────────────── */
    async _loadHistory() {
      const list = document.getElementById('sleepHistoryList');
      if (!list) return;
      list.innerHTML = `<div style="color:#94a3b8; font-size:0.8rem;">Loading…</div>`;

      const sessions = await SleepSession.listHistory(20);
      if (!sessions.length) {
        list.innerHTML = `<div style="color:#94a3b8; font-size:0.8rem; padding: 12px;">Belum ada sesi tidur tersimpan.</div>`;
        return;
      }

      list.innerHTML = sessions.map(s => {
        const start = s.startedAtMs ? new Date(s.startedAtMs) : null;
        const day  = start ? start.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }) : '—';
        const time = start ? start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '';
        const dur  = s.durationSec ? this._fmtDuration(s.durationSec) : '—';
        const score = s.summary?.score ?? '—';
        return `
          <div class="script-card" onclick="SleepSessionUI._showDetail('${s.id}')">
            <div class="script-card-head">
              <div class="icon"><i class="fas fa-bed"></i></div>
              <span class="edit">${s.status || '—'}</span>
            </div>
            <div class="script-card-title">${day} · ${time}</div>
            <div class="script-card-desc">Score ${score} · ${dur}</div>
          </div>
        `;
      }).join('');
    },

    async _showDetail(id) {
      const detail = await SleepSession.getSessionDetail(id);
      if (!detail) return;
      /* Replay into hypnogram & summary panels */
      this._renderHypnogram(detail.epochs || []);
      if (detail.summary) this._renderSummary(detail.summary);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    _fmtDuration(sec) {
      sec = Math.floor(sec);
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      if (h > 0) return `${h}h ${m}m`;
      if (m > 0) return `${m}m ${s}s`;
      return `${s}s`;
    }
  };

  if (typeof window !== 'undefined') window.SleepSessionUI = SleepSessionUI;
})();
