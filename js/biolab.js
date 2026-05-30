/**
 * ScentraVN Serenity — BioLab Controller
 *
 * Wires:
 *   MuseEEG  → EEG band powers, FAA, sleep stage, engagement, meditation
 *   PPGProcessor → HR, HRV (time + freq), respiratory rate, perfusion index
 *   PPGFeatures → morphology features for ML
 *   ScentraML  → glucose, BP, vascular age, stress estimates (research grade)
 *
 * Auto-falls back to Muse simulation mode when no headband is paired.
 */

(() => {
  'use strict';

  const BAND_KEYS = ['delta', 'theta', 'alpha', 'smr', 'beta', 'gamma'];

  const BioLab = {
    inited: false,
    refreshTimer: null,
    profile: { age: 25, bmi: 22 },

    init() {
      this._wireMuseButton();
      this._wireRefresh();
      this._wireSleepSession();
      this._loadUserProfile();
      this._loadModels();
      this._subscribeMuse();
      this._subscribePPG();
      this._tick();           /* first paint */
      this._scheduleTick();
      this._loadSleepHistory();
      this._refreshSleepUI();
      this._loadInterventionLog();
      this.inited = true;
    },

    /* ── Intervention history ─────────────────────────────────────── */
    async _loadInterventionLog() {
      const el = document.getElementById('biolabInterventionLog');
      if (!el) return;
      try {
        if (typeof auth === 'undefined' || !auth.currentUser ||
            typeof FirebaseService === 'undefined') return;
        const snap = await FirebaseService.userCol(auth.currentUser.uid, 'interventions')
          .orderBy('timestamp', 'desc').limit(6).get();
        if (snap.empty) return;

        const labels = {
          eeg_stress:   { icon: 'fa-wind',  txt: 'Ketegangan mental (EEG)' },
          eeg_overload: { icon: 'fa-gauge-high', txt: 'Beban kognitif berlebih (EEG)' },
          eeg_drowsy:   { icon: 'fa-mug-hot', txt: 'Kantuk terdeteksi (EEG)' },
          breathing:    { icon: 'fa-lungs', txt: 'Latihan pernapasan' },
          synachat:     { icon: 'fa-comments', txt: 'Saran ngobrol AI' },
          music:        { icon: 'fa-music', txt: 'Mood booster' },
          yoga_calm:    { icon: 'fa-spa', txt: 'Yoga menenangkan' },
          yoga_recovery:{ icon: 'fa-spa', txt: 'Yoga pemulihan' },
          crisis:       { icon: 'fa-shield-heart', txt: 'Protokol krisis' },
        };

        el.innerHTML = snap.docs.map(d => {
          const x = d.data();
          const meta = labels[x.type] || { icon: 'fa-bolt', txt: x.type };
          const ts = x.timestamp?.toDate ? x.timestamp.toDate() : null;
          const when = ts ? ts.toLocaleString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '';
          return `<div style="display:flex; align-items:center; gap:10px; padding:8px 10px; background:rgba(124,58,237,0.06); border-radius:10px;">
            <i class="fas ${meta.icon}" style="color:#7c3aed; width:18px;"></i>
            <span style="flex:1; font-size:0.78rem; color:#4c1d95; font-weight:600;">${meta.txt}</span>
            <span style="font-size:0.7rem; color:#94a3b8;">${when}</span>
          </div>`;
        }).join('');
      } catch (e) { /* offline / index building — fine */ }
    },

    /* ── Sleep Session UI ─────────────────────────────────────────── */
    _wireSleepSession() {
      if (typeof SleepSession === 'undefined') return;

      const startBtn = document.getElementById('sleepStartBtn');
      const stopBtn  = document.getElementById('sleepStopBtn');
      if (!startBtn || !stopBtn) return;

      startBtn.addEventListener('click', () => {
        const ok = SleepSession.start();
        if (!ok) {
          alert('Could not start session. Check Muse connection.');
          return;
        }
        this._refreshSleepUI();
      });

      stopBtn.addEventListener('click', async () => {
        stopBtn.disabled = true;
        const session = await SleepSession.stop();
        stopBtn.disabled = false;
        this._refreshSleepUI();
        await this._loadSleepHistory();
        if (session?.summary) {
          alert(`Session saved.\nDuration: ${(session.durationSec/60).toFixed(0)} min · Score: ${session.summary.score}/100 · Efficiency: ${session.summary.efficiency}%`);
        }
      });

      SleepSession.onTick(() => this._refreshSleepUI());

      /* Live elapsed counter */
      setInterval(() => this._refreshSleepUI(), 1000);
    },

    _refreshSleepUI() {
      if (typeof SleepSession === 'undefined') return;
      const s = SleepSession.getState();

      const startBtn = document.getElementById('sleepStartBtn');
      const stopBtn  = document.getElementById('sleepStopBtn');
      const panel    = document.getElementById('sleepLivePanel');
      const status   = document.getElementById('sleepSessionStatus');
      const liveDur  = document.getElementById('sleepLiveDuration');

      if (s.isRecording) {
        if (startBtn) startBtn.style.display = 'none';
        if (stopBtn)  stopBtn.style.display  = 'inline-flex';
        if (panel)    panel.style.display    = 'block';
        if (status)   status.textContent     = 'recording';
        if (liveDur) {
          const m = Math.floor(s.elapsedSec / 60);
          const sec = s.elapsedSec % 60;
          liveDur.textContent = `· ${m}m ${sec}s`;
        }
        this._setText('sleepEpochCount', s.epochCount);
        this._setText('sleepCurStage', s.currentStage
          ? (typeof EEGFeatures !== 'undefined' ? EEGFeatures.sleepStageLabel(s.currentStage) : s.currentStage)
          : '—');
        this._setText('sleepElapsed', `${Math.floor(s.elapsedSec / 60)}m`);

        /* Render live hypnogram */
        if (typeof SleepTimeline !== 'undefined') {
          SleepTimeline.render('sleepLiveTimeline', SleepSession.epochs, {
            startedAt: SleepSession.startedAt,
            endedAt:   Date.now(),
            height: 80
          });
        }
      } else {
        if (startBtn) startBtn.style.display = 'inline-flex';
        if (stopBtn)  stopBtn.style.display  = 'none';
        if (panel)    panel.style.display    = 'none';
        if (status)   status.textContent     = 'idle';
        if (liveDur)  liveDur.textContent    = '';
      }
    },

    async _loadSleepHistory() {
      const list = document.getElementById('sleepHistoryList');
      if (!list || typeof SleepSession === 'undefined') return;
      const sessions = await SleepSession.getHistory(5);
      this._sleepHistoryCache = sessions;        /* cached for click handler */

      if (!sessions.length) {
        list.innerHTML = '<div style="color:#94a3b8; font-size:0.78rem;">No sessions yet.</div>';
        return;
      }

      list.innerHTML = sessions.map((s, idx) => {
        const date = s.startedAt ? new Date(s.startedAt).toLocaleString('id-ID', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        }) : '—';
        const score = s.summary?.score ?? '—';
        const eff   = s.summary?.efficiency != null ? `${s.summary.efficiency}%` : '—';
        const mins  = s.durationSec ? Math.round(s.durationSec / 60) : '—';
        return `
          <div data-idx="${idx}" class="sleep-history-row" style="display:flex; justify-content:space-between; align-items:center; padding:10px 12px; background:rgba(124,58,237,0.06); border-radius:12px; cursor:pointer; transition: all 0.2s;">
            <div>
              <div style="font-size:0.82rem; font-weight:600; color:#4c1d95;">${date}</div>
              <div style="font-size:0.72rem; color:#64748b;">${mins} min · efficiency ${eff} · click for details</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:1.1rem; font-weight:800; color:#7c3aed;">${score}</div>
              <div style="font-size:0.65rem; color:#94a3b8;">/100</div>
            </div>
          </div>`;
      }).join('');

      /* Attach click handlers */
      list.querySelectorAll('.sleep-history-row').forEach(row => {
        row.addEventListener('mouseenter', () => {
          row.style.background = 'rgba(124,58,237,0.12)';
          row.style.transform = 'translateX(3px)';
        });
        row.addEventListener('mouseleave', () => {
          row.style.background = 'rgba(124,58,237,0.06)';
          row.style.transform = '';
        });
        row.addEventListener('click', () => {
          const idx = +row.dataset.idx;
          const session = this._sleepHistoryCache?.[idx];
          if (session && typeof SleepTimeline !== 'undefined') {
            SleepTimeline.openDetailModal(session);
          }
        });
      });
    },

    /* ── Lazy-load trained models (no-op if missing) ──────────────── */
    async _loadModels() {
      if (typeof ScentraML === 'undefined') return;
      try {
        await ScentraML.loadJsonRF('glucose', '/js/ml/models/glucose-rf.json');
        await ScentraML.loadStressThresholds('/js/ml/models/stress-thresholds.json');

        /* Real neural-net models via NNRuntime */
        if (typeof NNRuntime !== 'undefined') {
          await NNRuntime.load('sleep',       '/js/ml/models/sleep-stager-mlp.json');
          await NNRuntime.load('stress',      '/js/ml/models/stress-ppg-mlp.json');
          await NNRuntime.load('mentalState', '/js/ml/models/mental-state-mlp.json');
          await NNRuntime.load('cogLoad',     '/js/ml/models/cognitive-load-mlp.json');
          await NNRuntime.load('emotion',     '/js/ml/models/emotion-valence-mlp.json');
          await NNRuntime.load('edaStress',   '/js/ml/models/eda-stress-mlp.json');
        }

        const badge = document.getElementById('mlStatusBadge');
        if (badge) {
          const parts = [];
          if (typeof NNRuntime !== 'undefined') {
            if (NNRuntime.has('sleep')) {
              const meta = NNRuntime.meta.sleep?.metrics || {};
              const a = meta.accuracy;
              const tag = meta.synthetic === false ? 'real-EEG' : '';
              parts.push(`sleep-NN ${a ? (a*100).toFixed(0)+'%' : 'on'}${tag ? ' ('+tag+')' : ''}`);
            }
            if (NNRuntime.has('mentalState')) {
              const a = NNRuntime.meta.mentalState?.metrics?.accuracy;
              parts.push(`state-NN ${a ? (a*100).toFixed(0)+'%' : 'on'}`);
            }
          }
          if (ScentraML.rfModels?.glucose) parts.push('glucose RF (low conf)');
          badge.textContent = parts.length ? parts.join(' · ') : 'heuristic';
        }
      } catch (e) { /* fallback to heuristic, fine */ }
    },

    /* ── Profile (age/bmi feed glucose/BP heuristics) ─────────────── */
    async _loadUserProfile() {
      try {
        if (typeof auth === 'undefined' || !auth.currentUser || typeof db === 'undefined') return;
        const doc = await db.collection('users').doc(auth.currentUser.uid).get();
        const d = doc.data() || {};
        if (d.age) this.profile.age = +d.age;
        if (d.bmi) this.profile.bmi = +d.bmi;
        if (d.healthProfile) {
          if (d.healthProfile.age) this.profile.age = +d.healthProfile.age;
          if (d.healthProfile.bmi) this.profile.bmi = +d.healthProfile.bmi;
        }
      } catch (e) { /* offline ok */ }
    },

    /* ── Muse connection button ───────────────────────────────────── */
    _wireMuseButton() {
      const btn = document.getElementById('biolabConnectMuseBtn');
      if (!btn || typeof MuseEEG === 'undefined') return;

      btn.addEventListener('click', async () => {
        if (!MuseEEG.isSupported()) {
          alert('Web Bluetooth tidak didukung di browser ini. Gunakan Chrome/Edge desktop.');
          return;
        }
        if (MuseEEG.isConnected) {
          await MuseEEG.disconnect();
          this._setMuseStatus('disconnected');
        } else {
          this._setMuseStatus('connecting…');
          const ok = await MuseEEG.connect();
          if (!ok) {
            /* No device → fall back to simulation so the UI still demoes */
            MuseEEG.startSimulation('medium');
            this._setMuseStatus('simulation');
          }
        }
      });

      /* Auto-start simulation if user just opened the page without device */
      if (!MuseEEG.isConnected && !MuseEEG.simulationMode) {
        MuseEEG.startSimulation('medium');
        this._setMuseStatus('simulation');
      } else if (MuseEEG.isConnected) {
        this._setMuseStatus('connected');
      }
    },

    _setMuseStatus(text) {
      const badge = document.getElementById('museStatusBadge');
      if (badge) badge.textContent = text;
      const btn = document.getElementById('biolabConnectMuseBtn');
      if (btn) {
        const span = btn.querySelector('span');
        if (span) span.textContent = (text === 'connected') ? 'Disconnect' : 'Connect Muse';
      }
    },

    /* ── Subscriptions ────────────────────────────────────────────── */
    _subscribeMuse() {
      if (typeof MuseEEG === 'undefined') return;
      MuseEEG.onMetrics((m) => this._renderEEG(m));
      MuseEEG.onConnection((c) => this._setMuseStatus(c.status));
    },

    _subscribePPG() {
      if (typeof PPGProcessor === 'undefined') return;
      PPGProcessor.onMetrics((m) => this._renderPPG(m));
    },

    /* ── Refresh ML button ────────────────────────────────────────── */
    _wireRefresh() {
      const btn = document.getElementById('biolabRefreshML');
      if (btn) btn.addEventListener('click', () => this._renderML());
    },

    _scheduleTick() {
      clearInterval(this.refreshTimer);
      this.refreshTimer = setInterval(() => this._tick(), 5000);
    },

    _tick() {
      if (typeof MuseEEG !== 'undefined') this._renderEEG(MuseEEG.getMetrics());
      if (typeof PPGProcessor !== 'undefined') this._renderPPG(PPGProcessor.getMetrics());
      this._renderML();
    },

    /* ── EEG render ───────────────────────────────────────────────── */
    _renderEEG(m) {
      if (!m) return;
      const p = m.powers || {};

      /* Sleep stage */
      const stageEl = document.getElementById('biolabSleepStage');
      const stageDesc = document.getElementById('biolabSleepDesc');
      if (stageEl) {
        const label = (typeof EEGFeatures !== 'undefined')
          ? EEGFeatures.sleepStageLabel(m.sleepStage || 'unknown')
          : (m.sleepStage || '—');
        stageEl.textContent = label;
      }
      if (stageDesc) stageDesc.textContent = m.alphaPeak ? `α-peak ${m.alphaPeak.toFixed(1)} Hz` : 'AASM rule-based';

      /* FAA */
      const faaEl = document.getElementById('biolabFAA');
      const faaLab = document.getElementById('biolabFAALabel');
      if (faaEl) faaEl.textContent = (m.alphaAsymmetry !== null && m.alphaAsymmetry !== undefined)
        ? m.alphaAsymmetry.toFixed(2) : '—';
      if (faaLab && typeof EEGFeatures !== 'undefined') {
        const interp = EEGFeatures.faaInterpret(m.alphaAsymmetry);
        faaLab.textContent = interp.label;
      }

      /* Engagement / Meditation */
      this._setText('biolabEngagement', m.engagement?.toFixed(2) ?? '—');
      this._setText('biolabMeditation', m.meditation?.toFixed(2) ?? '—');

      /* Mental state (MLP) */
      if (m.mentalState && typeof EEGFeatures !== 'undefined') {
        this._setText('biolabMentalState', EEGFeatures.mentalStateLabel(m.mentalState.label));
        this._setText('biolabMentalStateConf', `real-EEG · ${Math.round((m.mentalState.prob || 0) * 100)}%`);
      } else {
        this._setText('biolabMentalState', '—');
      }

      /* Cognitive load (MLP) */
      if (m.cognitiveLoad && typeof EEGFeatures !== 'undefined') {
        this._setText('biolabCogLoad', EEGFeatures.cognitiveLoadLabel(m.cognitiveLoad.label));
        this._setText('biolabCogLoadConf', `advisory · ${Math.round((m.cognitiveLoad.prob || 0) * 100)}%`);
      } else {
        this._setText('biolabCogLoad', '—');
      }

      /* Emotion valence (real Muse-trained MLP) */
      if (m.emotion && typeof EEGFeatures !== 'undefined') {
        this._setText('biolabEmotion', EEGFeatures.emotionLabel(m.emotion.label));
        this._setText('biolabEmotionConf', `real-EEG · ${Math.round((m.emotion.prob || 0) * 100)}%`);
      } else {
        this._setText('biolabEmotion', '—');
      }

      /* Bands */
      const total = BAND_KEYS.reduce((a, k) => a + (p[k] || 0), 0) || 1;
      for (const k of BAND_KEYS) {
        const v = p[k] || 0;
        const pct = (v / total) * 100;
        const bar = document.getElementById(`bioBand-${k}`);
        const lab = document.getElementById(`bioBandVal-${k}`);
        if (bar) bar.style.width = `${Math.min(100, pct).toFixed(1)}%`;
        if (lab) lab.textContent = `${pct.toFixed(0)}%`;
      }
    },

    /* ── PPG render ───────────────────────────────────────────────── */
    _renderPPG(m) {
      if (!m) return;
      this._setText('bioHr',     m.hr ?? '--');
      this._setText('bioRMSSD',  m.hrvRMSSD ?? '--');
      this._setText('bioSDNN',   m.hrvSDNN ?? '--');
      this._setText('bioPNN50',  m.hrvpNN50 ?? '--');
      this._setText('bioLFHF',   m.hrvLFHF != null ? m.hrvLFHF.toFixed(2) : '--');
      this._setText('bioRR',     m.respRate ?? '--');
      this._setText('bioPI',     m.perfusionIndex ?? '--');
      this._setText('bioSQ',     m.signalQuality != null ? Math.round(m.signalQuality * 100) : '--');

      const badge = document.getElementById('ppgQualityBadge');
      if (badge) {
        if (m.signalQuality === null) badge.textContent = 'no signal';
        else if (m.signalQuality < 0.3) badge.textContent = 'noisy';
        else if (m.signalQuality < 0.65) badge.textContent = 'fair';
        else badge.textContent = 'good';
      }
    },

    /* ── ML render ────────────────────────────────────────────────── */
    _renderML() {
      if (typeof ScentraML === 'undefined') return;
      const ppg  = (typeof PPGProcessor !== 'undefined') ? PPGProcessor.getMetrics() : {};
      const muse = (typeof MuseEEG !== 'undefined') ? MuseEEG.getMetrics() : {};

      /* Build feature vector */
      const features = (typeof PPGFeatures !== 'undefined')
        ? PPGFeatures.extract({
            red: PPGProcessor?.redBuffer ?? [],
            ir:  PPGProcessor?.irBuffer  ?? [],
            peaks: [],
            fs: PPGProcessor?.fs ?? 100,
            hrv: ppg,
            hr:  ppg.hr,
            spo2: this._readDom('spo2Value'),
            age: this.profile.age,
            bmi: this.profile.bmi
          })
        : { hr: ppg.hr, sdnn: ppg.hrvSDNN, rmssd: ppg.hrvRMSSD, age: this.profile.age, bmi: this.profile.bmi };

      /* 1. Glucose */
      const g = ScentraML.estimateGlucose(features);
      this._setText('biolabGlucose', g.value !== null ? `${g.value} mg/dL` : '— mg/dL');
      this._setText('biolabGlucoseConf', `conf ${(g.confidence * 100).toFixed(0)}%`);
      this._setText('biolabGlucoseBand', `${g.band} · ${g.method}`);

      /* 2. BP */
      const bp = ScentraML.estimateBP(features);
      this._setText('biolabBP', `${bp.systolic.value ?? '—'} / ${bp.diastolic.value ?? '—'}`);
      this._setText('biolabBPConf', `conf ${(bp.systolic.confidence * 100).toFixed(0)}%`);
      this._setText('biolabBPBand', `${bp.systolic.band} · ${bp.systolic.method}`);

      /* 3. Vascular age */
      const v = ScentraML.estimateVascularAge(features);
      this._setText('biolabVAge', v.value ?? '—');
      this._setText('biolabVAgeConf', `conf ${(v.confidence * 100).toFixed(0)}%`);

      /* 4. Composite stress */
      const s = ScentraML.estimateStress({
        rmssd: ppg.hrvRMSSD,
        sdnn:  ppg.hrvSDNN,
        pnn50: ppg.hrvpNN50,
        hr:    ppg.hr,
        lfhf:  ppg.hrvLFHF,
        thetaBetaRatio: muse.thetaBetaRatio,
        gsr: this._readDom('gsrValue')
      });
      this._setText('biolabStress', s.value ?? '—');
      this._setText('biolabStressConf', `conf ${(s.confidence * 100).toFixed(0)}%`);
      this._setText('biolabStressBand', `${s.band} · multi-modal`);
    },

    /* ── Helpers ──────────────────────────────────────────────────── */
    _setText(id, v) {
      const el = document.getElementById(id);
      if (el) el.textContent = (v === null || v === undefined || v === '') ? '--' : v;
    },
    _readDom(id) {
      const el = document.getElementById(id);
      if (!el) return null;
      const n = parseFloat(el.textContent);
      return isFinite(n) ? n : null;
    },

    destroy() {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
      this.inited = false;
    }
  };

  if (typeof window !== 'undefined') window.BioLab = BioLab;
})();
