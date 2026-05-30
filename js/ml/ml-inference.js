/**
 * ScentraVN Serenity — Lightweight ML Inference Layer
 *
 * Provides ESTIMATES for blood glucose, blood pressure, vascular age, and
 * stress score from PPG-derived features. When no trained model is loaded,
 * falls back to literature-derived rule-based regressions.
 *
 *  ⚠️  DISCLAIMER (must show in UI):
 *      All estimates here are RESEARCH-GRADE / EXPERIMENTAL.
 *      They are NOT diagnostic. Do NOT use to dose medication, replace
 *      lab tests, or make medical decisions. Optical sensors on the wrist/finger
 *      cannot replace fingerstick glucometers, ABPM cuffs, or 12-lead ECG.
 *
 * The fallback heuristics are intentionally conservative (they regress toward
 * population means when features are sparse) so a clearly-noisy reading
 * doesn't produce alarming numbers.
 *
 * To upgrade accuracy:
 *   1. Train a model with python/train_glucose_model.py (see docs)
 *   2. Convert it to TensorFlow.js Layers JSON
 *   3. Drop into js/ml/models/glucose-model.json + weights
 *   4. ScentraML.loadModel('glucose', '/js/ml/models/glucose-model.json')
 */

(() => {
  'use strict';

  /* Population means used as Bayesian-style anchors when features are sparse */
  const POP_MEAN = {
    glucose:    100,    /* mg/dL fasting healthy */
    glucoseSD:  15,
    sbp:        118,    /* mmHg */
    sbpSD:      12,
    dbp:        76,
    dbpSD:      10,
    rmssd:      42,     /* ms healthy adult */
    sdnn:       50
  };

  /* Pretty units */
  const UNITS = {
    glucose: 'mg/dL', sbp: 'mmHg', dbp: 'mmHg',
    vascularAge: 'years', stress: '%', sleepScore: '/100'
  };

  const ScentraML = {

    models: { glucose: null, bp: null, sleep: null },
    modelMeta: {},
    rfModels: { glucose: null, bp: null },        /* plain-JSON Random Forests */
    stressThresholds: null,                       /* loaded from stress-thresholds.json */

    /**
     * Load a plain-JSON Random Forest exported from sklearn.
     * Format: { type: 'random-forest', features: [...], trees: [[{f,th,l,r,v}, ...]], targetMean, metrics }
     */
    async loadJsonRF(name, url) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const bundle = await res.json();
        if (bundle.type !== 'random-forest') throw new Error('not a random-forest bundle');
        this.rfModels[name] = bundle;
        this.modelMeta[name] = { url, loadedAt: Date.now(), kind: 'json-rf', metrics: bundle.metrics };
        console.info(`ScentraML: JSON-RF '${name}' loaded with ${bundle.trees.length} trees.`);
        return true;
      } catch (err) {
        console.warn(`ScentraML: failed to load JSON-RF '${name}' from ${url}:`, err.message);
        return false;
      }
    },

    /** Load stress thresholds JSON (from train_stress_hrv.py) */
    async loadStressThresholds(url) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        this.stressThresholds = await res.json();
        return true;
      } catch (err) {
        console.warn('ScentraML: stress thresholds not available:', err.message);
        return false;
      }
    },

    /** Predict using a JSON RF bundle. featureMap = { name: value } */
    _predictJsonRF(bundle, featureMap) {
      const x = bundle.features.map(f => {
        const v = featureMap[f];
        return (v === null || v === undefined || !isFinite(v)) ? 0 : Number(v);
      });
      let total = 0;
      for (const tree of bundle.trees) {
        let node = 0;
        while (true) {
          const n = tree[node];
          if (n.l === -1 || n.r === -1) { total += n.v; break; }
          node = (x[n.f] <= n.th) ? n.l : n.r;
        }
      }
      return total / bundle.trees.length;
    },

    /**
     * Try to load a TF.js Layers model (optional). Falls back to heuristics
     * if TF.js or the model weights aren't available.
     */
    async loadModel(name, url) {
      if (typeof tf === 'undefined') {
        console.info(`ScentraML: TF.js not loaded, '${name}' will use heuristic fallback.`);
        return false;
      }
      try {
        this.models[name] = await tf.loadLayersModel(url);
        this.modelMeta[name] = { url, loadedAt: Date.now() };
        console.info(`ScentraML: model '${name}' loaded.`);
        return true;
      } catch (err) {
        console.warn(`ScentraML: failed to load '${name}' from ${url}:`, err.message);
        this.models[name] = null;
        return false;
      }
    },

    /* ────────────────────────────────────────────────────────────
     * 1. Blood Glucose Estimate
     *    Heuristic: regress toward population mean using HRV, age,
     *    HR-baseline-shift, augmentation index. Bayesian shrinkage
     *    keeps the estimate plausible when features are sparse.
     *
     *    Literature anchors:
     *    - High AI ↔ stiffer arteries ↔ higher fasting glucose risk
     *    - Reduced HRV (low SDNN/RMSSD) ↔ insulin resistance
     *    - Elevated resting HR ↔ glycemic dysfunction
     *    (Salamea-Palacios 2025; Satter 2024)
     * ──────────────────────────────────────────────────────────── */
    estimateGlucose(features) {
      /* Try JSON Random Forest first (sklearn-trained, no TF.js needed) */
      if (this.rfModels.glucose) {
        try {
          /* Map our generic features to the dataset's column names */
          const featureMap = {
            Heart_Rate:     features.hr,
            Systolic_Peak:  features.systolicPeak  ?? (features.ppgAmpMean * 600 + 500),
            Diastolic_Peak: features.diastolicPeak ?? (features.ppgAmpMean * 400 + 480),
            Pulse_Area:     features.pulseArea     ?? (features.ppgAreaSys ?? 380),
            Age:            features.age,
            Gender:         features.gender ?? 1,
            Height:         features.height ?? 170,
            Weight:         features.weight ?? 65,
          };
          const pred = this._predictJsonRF(this.rfModels.glucose, featureMap);
          const conf = this.rfModels.glucose.metrics?.r2 > 0.1 ? 0.55 : 0.30;
          return this._wrap('glucose', pred, conf, 'json-rf');
        } catch (e) { /* fall through */ }
      }

      /* Try TF.js model */
      if (this.models.glucose && typeof tf !== 'undefined') {
        try {
          const x = this._buildVector(features, this._glucoseFeatureOrder());
          const out = this.models.glucose.predict(tf.tensor2d([x])).dataSync();
          return this._wrap('glucose', out[0], 0.55, 'tfjs');
        } catch (e) { /* fall through to heuristic */ }
      }

      const hr    = features.hr    ?? null;
      const sdnn  = features.sdnn  ?? null;
      const rmssd = features.rmssd ?? null;
      const ai    = features.augmentationIdx ?? null;
      const age   = features.age   ?? 30;
      const bmi   = features.bmi   ?? 23;

      let g = POP_MEAN.glucose;        /* prior */

      /* Confidence accumulator (0..1) */
      let conf = 0.10;
      const w = [];

      if (hr !== null) {
        /* Resting HR > 80 modestly raises estimate */
        g += clamp((hr - 70) * 0.35, -8, 12);
        w.push(0.10);
      }
      if (rmssd !== null) {
        /* Low RMSSD → ANS imbalance → +glucose */
        g += clamp((POP_MEAN.rmssd - rmssd) * 0.20, -10, 15);
        w.push(0.18);
      }
      if (sdnn !== null) {
        g += clamp((POP_MEAN.sdnn - sdnn) * 0.15, -8, 12);
        w.push(0.12);
      }
      if (ai !== null) {
        /* Higher augmentation index ↔ stiffer arteries ↔ higher glucose */
        g += clamp(ai * 35, -6, 18);
        w.push(0.20);
      }
      if (age) g += clamp((age - 30) * 0.30, -5, 25);
      if (bmi) g += clamp((bmi - 23) * 0.55, -5, 20);

      conf = Math.min(0.65, conf + w.reduce((a, b) => a + b, 0));

      /* Bayesian shrinkage toward population mean */
      g = conf * g + (1 - conf) * POP_MEAN.glucose;

      return this._wrap('glucose', g, conf, 'heuristic');
    },

    _glucoseFeatureOrder() {
      return ['hr', 'sdnn', 'rmssd', 'pnn50', 'lf', 'hf', 'lfhf',
              'ppgRiseTime', 'ppgWidth50', 'augmentationIdx',
              'spectralEntropy', 'age', 'bmi'];
    },

    /* ────────────────────────────────────────────────────────────
     * 2. Blood Pressure (Systolic / Diastolic)
     *    Heuristic uses Pulse Transit Time surrogate (rise time)
     *    and AI. PPG-derived BP literature MAE ~8-12 mmHg.
     * ──────────────────────────────────────────────────────────── */
    estimateBP(features) {
      if (this.models.bp && typeof tf !== 'undefined') {
        try {
          const x = this._buildVector(features, this._bpFeatureOrder());
          const out = this.models.bp.predict(tf.tensor2d([x])).dataSync();
          return {
            systolic:  this._wrap('sbp', out[0], 0.55, 'tfjs'),
            diastolic: this._wrap('dbp', out[1], 0.55, 'tfjs')
          };
        } catch (e) { /* fall through */ }
      }

      const hr    = features.hr ?? 72;
      const ai    = features.augmentationIdx ?? 0.1;
      const rise  = features.ppgRiseTime ?? 200;     /* ms, lower = stiffer */
      const age   = features.age ?? 30;

      /* Rise-time inversely related to PWV ↔ SBP */
      let sbp = POP_MEAN.sbp + clamp((200 - rise) * 0.15, -10, 18);
      sbp += clamp(ai * 25, -5, 15);
      sbp += clamp((hr - 72) * 0.30, -10, 15);
      sbp += clamp((age - 30) * 0.40, -8, 25);

      let dbp = POP_MEAN.dbp + clamp((180 - rise) * 0.08, -8, 10);
      dbp += clamp(ai * 12, -3, 8);
      dbp += clamp((age - 30) * 0.20, -5, 15);

      const conf = 0.30;
      sbp = conf * sbp + (1 - conf) * POP_MEAN.sbp;
      dbp = conf * dbp + (1 - conf) * POP_MEAN.dbp;

      return {
        systolic:  this._wrap('sbp', sbp, 0.40, 'heuristic'),
        diastolic: this._wrap('dbp', dbp, 0.40, 'heuristic')
      };
    },

    _bpFeatureOrder() {
      return ['hr', 'sdnn', 'rmssd', 'ppgRiseTime', 'ppgFallTime',
              'ppgWidth50', 'augmentationIdx', 'reflectionIdx', 'age'];
    },

    /* ────────────────────────────────────────────────────────────
     * 3. Vascular Age — purely from PPG morphology + AI + HR
     * ──────────────────────────────────────────────────────────── */
    estimateVascularAge(features) {
      const ai   = features.augmentationIdx ?? 0.10;
      const rise = features.ppgRiseTime ?? 200;
      const hr   = features.hr ?? 72;
      const realAge = features.age ?? 30;

      /* Higher AI and lower rise time → older vascular age */
      let vAge = realAge;
      vAge += ai * 60;
      vAge += (200 - rise) * 0.04;
      vAge += (hr - 70) * 0.10;
      vAge = clamp(vAge, 18, 95);

      return this._wrap('vascularAge', vAge, 0.45, 'heuristic');
    },

    /* ────────────────────────────────────────────────────────────
     * 4. Composite Stress Index (PPG + EEG + GSR if available)
     *    Uses HRV shift and EEG theta/beta plus GSR conductance.
     * ──────────────────────────────────────────────────────────── */
    estimateStress({ rmssd = null, sdnn = null, lfhf = null, thetaBetaRatio = null, gsr = null, hr = null, pnn50 = null }) {
      /* Try the trained stress MLP first (when HRV features available) */
      if (typeof NNRuntime !== 'undefined' && NNRuntime.has('stress')
          && hr !== null && sdnn !== null && rmssd !== null && pnn50 !== null) {
        try {
          const out = NNRuntime.predict('stress', { hr, sdnn, rmssd, pnn50 });
          if (out && out.probs) {
            /* probability of "stress" class → 0..100 score */
            const stressIdx = (out.label === 'stress') ? out.index : (out.index === 0 ? 1 : 0);
            const pStress = out.probs[stressIdx] ?? out.probs[out.probs.length - 1];
            const score = Math.round(pStress * 100);
            /* NN on tiny dataset → cap confidence honestly */
            return this._wrap('stress', score, 0.50, 'mlp-nn');
          }
        } catch (e) { /* fall through to heuristic */ }
      }

      let score = 30;
      let conf = 0.20;

      if (rmssd !== null) {
        /* Low RMSSD → high stress */
        score += clamp((POP_MEAN.rmssd - rmssd) * 1.0, -20, 30);
        conf += 0.20;
      }
      if (lfhf !== null) {
        /* High LF/HF → sympathetic dominance */
        score += clamp((lfhf - 1.5) * 6, -15, 20);
        conf += 0.10;
      }
      if (thetaBetaRatio !== null) {
        score += clamp((thetaBetaRatio - 6.4) * 1.3, -15, 25);
        conf += 0.15;
      }
      if (gsr !== null) {
        score += clamp((gsr - 30) * 0.30, -10, 30);
        conf += 0.10;
      }

      score = clamp(score, 0, 100);
      conf = Math.min(0.80, conf);
      return this._wrap('stress', score, conf, 'composite');
    },

    /* ────────────────────────────────────────────────────────────
     * 5. Sleep Quality from staged epochs
     * ──────────────────────────────────────────────────────────── */
    sleepQuality(epochs) {
      if (typeof EEGFeatures === 'undefined' || !epochs?.length) return null;
      const summary = EEGFeatures.summariseSleep(epochs);
      if (!summary) return null;
      return {
        ...summary,
        confidence: 0.55,
        method: 'rule-based-aasm'
      };
    },

    /* ── Helpers ───────────────────────────────────────────────── */

    _wrap(metric, value, confidence, method) {
      const v = isFinite(value) ? Math.round(value * 10) / 10 : null;
      return {
        metric,
        value: v,
        unit: UNITS[metric] ?? '',
        confidence: +confidence.toFixed(2),
        band: this._band(metric, v),
        method,
        researchGrade: true,
        timestamp: Date.now()
      };
    },

    _band(metric, v) {
      if (v === null) return 'unknown';
      switch (metric) {
        case 'glucose':
          if (v < 70)   return 'low';
          if (v < 100)  return 'normal';
          if (v < 126)  return 'pre-diabetic';
          return            'diabetic-range';
        case 'sbp':
          if (v < 90)   return 'low';
          if (v < 120)  return 'normal';
          if (v < 130)  return 'elevated';
          if (v < 140)  return 'hypertension-1';
          return            'hypertension-2';
        case 'dbp':
          if (v < 60)   return 'low';
          if (v < 80)   return 'normal';
          if (v < 90)   return 'hypertension-1';
          return            'hypertension-2';
        case 'vascularAge':
          return 'estimate';
        case 'stress':
          if (v < 25)   return 'relaxed';
          if (v < 50)   return 'normal';
          if (v < 75)   return 'tense';
          return            'high';
        default:
          return 'estimate';
      }
    },

    _buildVector(features, order) {
      return order.map(k => {
        const v = features[k];
        return (v === null || v === undefined || !isFinite(v)) ? 0 : v;
      });
    }
  };

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  if (typeof window !== 'undefined') window.ScentraML = ScentraML;
  if (typeof module !== 'undefined') module.exports = ScentraML;
})();
