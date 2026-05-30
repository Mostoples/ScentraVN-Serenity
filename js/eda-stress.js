/**
 * ScentraVN Serenity — EDA Stress Runner
 *
 * Maintains a rolling window of EDA (GSR) + skin-temperature samples from the
 * ScentraVN smartwatch, computes the 9 WESAD-style features, and runs the
 * real-trained eda-stress MLP (77% subject-wise on WESAD).
 *
 * Feature contract (must match python/train_eda_stress.py EDA_TEMP_FEATURES):
 *   EDA_mean, EDA_std, EDA_min, EDA_max, EDA_slope, EDA_peak_count,
 *   TEMP_mean, TEMP_std, TEMP_slope
 */

(() => {
  'use strict';

  const WIN = 120;          /* rolling window samples (~60s at 2Hz) */

  const EDAStress = {
    edaBuf: [],
    tempBuf: [],
    result: null,           /* { label, prob, score } */
    _onResult: null,

    onResult(cb) { this._onResult = cb; },

    /** Push one sensor frame (call from BLE data handler). */
    push(edaValue, tempValue) {
      if (isFinite(edaValue)) {
        this.edaBuf.push(edaValue);
        if (this.edaBuf.length > WIN) this.edaBuf.shift();
      }
      if (isFinite(tempValue)) {
        this.tempBuf.push(tempValue);
        if (this.tempBuf.length > WIN) this.tempBuf.shift();
      }
      /* Recompute every ~10 samples once we have enough */
      if (this.edaBuf.length >= 20 && this.edaBuf.length % 10 === 0) {
        this._infer();
      }
    },

    features() {
      if (this.edaBuf.length < 10) return null;
      const eda = this.edaBuf;
      const temp = this.tempBuf.length >= 5 ? this.tempBuf : [0];

      const mean = a => a.reduce((s, x) => s + x, 0) / a.length;
      const std  = a => { const m = mean(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length); };
      const slope = a => {
        const n = a.length; if (n < 2) return 0;
        const xs = a.map((_, i) => i); const mx = mean(xs), my = mean(a);
        let num = 0, den = 0;
        for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (a[i] - my); den += (xs[i] - mx) ** 2; }
        return den ? num / den : 0;
      };
      const peaks = a => {
        let c = 0;
        for (let i = 1; i < a.length - 1; i++) if (a[i] > a[i - 1] && a[i] > a[i + 1]) c++;
        return c;
      };

      return {
        EDA_mean: mean(eda), EDA_std: std(eda),
        EDA_min: Math.min(...eda), EDA_max: Math.max(...eda),
        EDA_slope: slope(eda), EDA_peak_count: peaks(eda),
        TEMP_mean: mean(temp), TEMP_std: std(temp), TEMP_slope: slope(temp),
      };
    },

    _infer() {
      if (typeof NNRuntime === 'undefined' || !NNRuntime.has('edaStress')) return;
      const f = this.features();
      if (!f) return;
      try {
        const out = NNRuntime.predict('edaStress', f);
        if (out && out.probs) {
          const stressIdx = out.label === 'stress' ? out.index : (out.index === 0 ? 1 : 0);
          const pStress = out.probs[stressIdx] ?? out.probs[out.probs.length - 1];
          this.result = { label: out.label, prob: out.prob, score: Math.round(pStress * 100) };
          if (this._onResult) this._onResult(this.result);
        }
      } catch (e) { /* ignore */ }
    },

    getResult() { return this.result; },
    reset() { this.edaBuf = []; this.tempBuf = []; this.result = null; }
  };

  if (typeof window !== 'undefined') window.EDAStress = EDAStress;
})();
