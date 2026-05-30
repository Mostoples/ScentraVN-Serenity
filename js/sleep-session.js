/**
 * ScentraVN Serenity — Sleep Session Recorder
 *
 * Records 30-second EEG epochs from MuseEEG, classifies sleep stage via
 * EEGFeatures.classifySleepStage, accumulates them in memory, and saves
 * the full session to Firestore on stop.
 *
 * Firestore schema:
 *   users/{uid}/sleepSessions/{autoId}
 *     startedAt, endedAt, durationSec, epochCount
 *     epochs: [{ t, stage, powers, faa, engagement }]
 *     summary: { totalSec, durationsSec, percentages, efficiency, score }
 *
 * Backed up to localStorage too, so unfinished sessions survive reload.
 */

(() => {
  'use strict';

  const EPOCH_SEC = 30;
  const LS_KEY = 'scentravn_sleep_session_active';
  const MAX_EPOCHS = 24 * 60 * 2;   /* 24h cap */

  const SleepSession = {
    isRecording: false,
    startedAt:   null,
    epochs:      [],          /* [{ t, stage, powers, faa, engagement }] */
    _tickTimer:  null,
    _onTick:     null,        /* user-facing callback per epoch */

    /* ── Public API ─────────────────────────────────────────────── */

    /** Start a new recording session. Returns true if started. */
    start() {
      if (this.isRecording) return false;
      if (typeof MuseEEG === 'undefined') {
        console.warn('SleepSession: MuseEEG not loaded.');
        return false;
      }

      /* Make sure we have *some* signal — fall back to simulation */
      if (!MuseEEG.isConnected && !MuseEEG.simulationMode) {
        MuseEEG.startSimulation('low');
      }

      this.isRecording = true;
      this.startedAt = Date.now();
      this.epochs = [];
      this._persistLocal();

      /* Capture an epoch every EPOCH_SEC seconds */
      this._tickTimer = setInterval(() => this._captureEpoch(), EPOCH_SEC * 1000);
      /* Capture first epoch immediately so UI shows progress */
      setTimeout(() => this._captureEpoch(), 1500);
      return true;
    },

    /** Stop and persist the session. Returns the saved doc data. */
    async stop() {
      if (!this.isRecording) return null;
      clearInterval(this._tickTimer);
      this._tickTimer = null;
      this.isRecording = false;

      const endedAt = Date.now();
      const durationSec = Math.round((endedAt - this.startedAt) / 1000);

      const epochsForSummary = this.epochs.map(e => ({ stage: e.stage, durationSec: EPOCH_SEC }));
      const summary = (typeof EEGFeatures !== 'undefined' && epochsForSummary.length)
        ? EEGFeatures.summariseSleep(epochsForSummary)
        : null;

      const sessionDoc = {
        startedAt: new Date(this.startedAt).toISOString(),
        endedAt:   new Date(endedAt).toISOString(),
        durationSec,
        epochCount: this.epochs.length,
        epochs: this.epochs,
        summary
      };

      /* Persist to Firestore (best-effort; keep local copy) */
      const persisted = await this._saveToFirestore(sessionDoc);
      sessionDoc.firestoreId = persisted;

      /* Clear local active marker, but keep last summary cached */
      localStorage.removeItem(LS_KEY);
      localStorage.setItem('scentravn_sleep_last', JSON.stringify(sessionDoc));

      this.epochs = [];
      this.startedAt = null;
      return sessionDoc;
    },

    /** Restore an unfinished session from localStorage (call on app boot). */
    restoreIfAny() {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        if (!parsed || !parsed.startedAt || !Array.isArray(parsed.epochs)) return false;

        /* Only restore if started < 12 hours ago */
        if (Date.now() - parsed.startedAt > 12 * 3600 * 1000) {
          localStorage.removeItem(LS_KEY);
          return false;
        }

        this.startedAt = parsed.startedAt;
        this.epochs = parsed.epochs;
        return true;
      } catch (e) { return false; }
    },

    onTick(cb) { this._onTick = cb; },

    /** Get current session state (no Firestore round-trip) */
    getState() {
      return {
        isRecording: this.isRecording,
        startedAt: this.startedAt,
        epochCount: this.epochs.length,
        currentStage: this.epochs.length ? this.epochs[this.epochs.length - 1].stage : null,
        elapsedSec: this.startedAt ? Math.round((Date.now() - this.startedAt) / 1000) : 0,
      };
    },

    /** Load history from Firestore (latest N) */
    async getHistory(limit = 10) {
      try {
        if (typeof auth === 'undefined' || !auth.currentUser || typeof db === 'undefined') {
          return [];
        }
        const snap = await db.collection('users')
          .doc(auth.currentUser.uid)
          .collection('sleepSessions')
          .orderBy('startedAt', 'desc')
          .limit(limit)
          .get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.warn('SleepSession history failed:', e.message);
        return [];
      }
    },

    /* ── Internals ───────────────────────────────────────────────── */

    _captureEpoch() {
      if (!this.isRecording) return;
      if (this.epochs.length >= MAX_EPOCHS) {
        console.warn('SleepSession: hit MAX_EPOCHS, auto-stopping.');
        this.stop();
        return;
      }

      const m = MuseEEG.getMetrics();
      const epoch = {
        t: Date.now(),
        stage: m.sleepStage || 'unknown',
        powers: m.powers || {},
        faa:   m.alphaAsymmetry,
        engagement: m.engagement,
        meditation: m.meditation,
        thetaBeta:  +(m.thetaBetaRatio || 0).toFixed(2),
      };
      this.epochs.push(epoch);
      this._persistLocal();
      if (this._onTick) {
        try { this._onTick(epoch, this.epochs.length); } catch (e) { /* ignore */ }
      }
    },

    _persistLocal() {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify({
          startedAt: this.startedAt,
          epochs: this.epochs.slice(-180),  /* last 90 minutes only to stay small */
        }));
      } catch (e) { /* quota issues are non-fatal */ }
    },

    async _saveToFirestore(doc) {
      try {
        if (typeof auth === 'undefined' || !auth.currentUser || typeof db === 'undefined') {
          console.warn('SleepSession: not authenticated, keeping local copy only.');
          return null;
        }
        const ref = await db.collection('users')
          .doc(auth.currentUser.uid)
          .collection('sleepSessions')
          .add({
            ...doc,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
        return ref.id;
      } catch (e) {
        console.warn('SleepSession Firestore save failed:', e.message);
        return null;
      }
    }
  };

  if (typeof window !== 'undefined') window.SleepSession = SleepSession;
})();
