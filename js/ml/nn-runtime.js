/**
 * ScentraVN Serenity — Tiny Neural-Network Runtime
 *
 * Runs feed-forward inference for MLP / logistic / softmax models exported
 * as plain JSON from scikit-learn or Keras. No TensorFlow.js dependency —
 * pure JS matrix math, ~3 KB, works offline.
 *
 * Supported bundle formats (auto-detected by `type`):
 *
 *  1. "mlp" — multilayer perceptron
 *     {
 *       type: "mlp",
 *       task: "regression" | "classification",
 *       featureOrder: [...],
 *       scaler: { mean: [...], scale: [...] },     // optional StandardScaler
 *       layers: [ { W: [[...]], b: [...], act: "relu"|"tanh"|"sigmoid"|"linear"|"softmax" }, ... ],
 *       classes: [...],                            // for classification
 *       targetMean, targetStd,                     // for regression de-normalization
 *       metrics: {...}
 *     }
 *
 *  2. "logistic" — single linear layer + sigmoid/softmax
 *     {
 *       type: "logistic",
 *       featureOrder: [...],
 *       scaler: {mean, scale},
 *       coef: [[...]], intercept: [...],
 *       classes: [...]
 *     }
 *
 * The matrices follow sklearn convention: W shape = [n_in, n_out].
 */

(() => {
  'use strict';

  /* ── Activation functions ─────────────────────────────────────── */
  const ACT = {
    relu:    v => v.map(x => x > 0 ? x : 0),
    tanh:    v => v.map(x => Math.tanh(x)),
    sigmoid: v => v.map(x => 1 / (1 + Math.exp(-x))),
    linear:  v => v,
    identity:v => v,
    softmax: v => {
      const m = Math.max(...v);
      const ex = v.map(x => Math.exp(x - m));
      const s = ex.reduce((a, b) => a + b, 0) || 1;
      return ex.map(x => x / s);
    }
  };

  /* y = x · W + b  (x: [n_in], W: [n_in][n_out], b: [n_out]) */
  function dense(x, W, b) {
    const nOut = b.length;
    const out = new Array(nOut).fill(0);
    for (let j = 0; j < nOut; j++) {
      let s = b[j];
      for (let i = 0; i < x.length; i++) s += x[i] * W[i][j];
      out[j] = s;
    }
    return out;
  }

  const NNRuntime = {
    models: {},        /* name → bundle */
    meta:   {},

    /** Register a bundle object directly (already-parsed JSON). */
    register(name, bundle) {
      this.models[name] = bundle;
      this.meta[name] = {
        type: bundle.type,
        task: bundle.task,
        classes: bundle.classes,
        metrics: bundle.metrics,
        loadedAt: Date.now()
      };
      return true;
    },

    /** Fetch + register a bundle from URL. */
    async load(name, url) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const bundle = await res.json();
        this.register(name, bundle);
        console.info(`NNRuntime: '${name}' (${bundle.type}/${bundle.task || 'n/a'}) loaded.`);
        return true;
      } catch (e) {
        console.warn(`NNRuntime: failed to load '${name}':`, e.message);
        return false;
      }
    },

    has(name) { return !!this.models[name]; },

    /** Build & scale the input vector from a featureMap. */
    _vectorize(bundle, featureMap) {
      const order = bundle.featureOrder || bundle.features || [];
      let x = order.map(f => {
        const v = featureMap[f];
        return (v === null || v === undefined || !isFinite(v)) ? 0 : Number(v);
      });
      if (bundle.scaler && bundle.scaler.mean && bundle.scaler.scale) {
        x = x.map((v, i) => (v - bundle.scaler.mean[i]) / (bundle.scaler.scale[i] || 1));
      }
      return x;
    },

    /**
     * Run inference.
     * @returns for regression: { value, raw }
     *          for classification: { label, index, prob, probs }
     */
    predict(name, featureMap) {
      const bundle = this.models[name];
      if (!bundle) return null;

      let x = this._vectorize(bundle, featureMap);

      if (bundle.type === 'logistic') {
        return this._predictLogistic(bundle, x);
      }
      if (bundle.type === 'mlp') {
        return this._predictMLP(bundle, x);
      }
      console.warn(`NNRuntime: unknown bundle type '${bundle.type}'`);
      return null;
    },

    _predictMLP(bundle, x) {
      let h = x;
      for (const layer of bundle.layers) {
        h = dense(h, layer.W, layer.b);
        const act = ACT[layer.act] || ACT.relu;
        h = act(h);
      }

      if (bundle.task === 'classification') {
        /* h is class probabilities (softmax/sigmoid) */
        let probs = h;
        if (h.length === 1) probs = [1 - h[0], h[0]];       /* binary sigmoid */
        const idx = probs.indexOf(Math.max(...probs));
        return {
          label: bundle.classes ? bundle.classes[idx] : idx,
          index: idx,
          prob: probs[idx],
          probs
        };
      }

      /* regression — optionally de-normalize */
      let val = h[0];
      if (bundle.targetStd !== undefined && bundle.targetMean !== undefined) {
        val = val * bundle.targetStd + bundle.targetMean;
      }
      return { value: val, raw: h[0] };
    },

    _predictLogistic(bundle, x) {
      const coef = bundle.coef;          /* [n_classes_or_1][n_features] */
      const intercept = bundle.intercept;
      const logits = coef.map((row, c) => {
        let s = intercept[c];
        for (let i = 0; i < row.length; i++) s += row[i] * x[i];
        return s;
      });

      let probs;
      if (logits.length === 1) {
        const p = 1 / (1 + Math.exp(-logits[0]));
        probs = [1 - p, p];
      } else {
        probs = ACT.softmax(logits);
      }
      const idx = probs.indexOf(Math.max(...probs));
      return {
        label: bundle.classes ? bundle.classes[idx] : idx,
        index: idx,
        prob: probs[idx],
        probs
      };
    }
  };

  if (typeof window !== 'undefined') window.NNRuntime = NNRuntime;
  if (typeof module !== 'undefined') module.exports = NNRuntime;
})();
