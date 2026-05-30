/**
 * ScentraVN Serenity — Aromatherapy Recommendation Engine
 *
 * Fuses subjective (PSP-5, SEES-10, Hunger) + objective (EEG mental-state ML,
 * PPG stress, GSR) signals into a 7-dimensional "therapeutic need" vector,
 * then ranks aromatherapy oils by cosine-similarity to that need.
 *
 * Always recommends KEMIRI as the carrier base, plus 1-3 essential oils
 * for the blend.
 *
 * Dimensions: calm, uplift, ground, energize, focus, sleep, appetite
 */

(() => {
  'use strict';

  const DIMS = ['calm', 'uplift', 'ground', 'energize', 'focus', 'sleep', 'appetite'];

  const AromaRecommender = {

    /**
     * Build the therapeutic need vector (each 0..1) from all available inputs.
     *
     * @param {Object} input
     *   psp5:   { cheerfulness, happiness, anger, anxiety, sadness }  (1..6)
     *   hunger: number (1..10)
     *   sees10: number[]  (10 items, 1..5)  → emotional-eating tendency
     *   eeg:    { mentalState: {label}, cognitiveLoad: {label} }
     *   ppg:    { stressScore (0..100), rmssd }
     *   gsr:    number (0..100)
     */
    buildNeedVector(input = {}) {
      const need = { calm: 0, uplift: 0, ground: 0, energize: 0, focus: 0, sleep: 0, appetite: 0 };
      const psp = input.psp5 || {};

      /* ── PSP-5 (1..6 scale) ─────────────────────────────────────── */
      const norm6 = v => (Math.max(1, Math.min(6, v || 1)) - 1) / 5;   /* → 0..1 */

      if (psp.anxiety  != null) need.calm   += norm6(psp.anxiety)  * 1.0;
      if (psp.sadness  != null) need.uplift += norm6(psp.sadness)  * 1.0;
      if (psp.anger    != null) need.ground += norm6(psp.anger)    * 1.0;

      /* Low cheerfulness / happiness → needs uplift & energize */
      if (psp.cheerfulness != null) {
        const lowCheer = 1 - norm6(psp.cheerfulness);
        need.uplift   += lowCheer * 0.7;
        need.energize += lowCheer * 0.5;
      }
      if (psp.happiness != null) {
        const lowHappy = 1 - norm6(psp.happiness);
        need.uplift += lowHappy * 0.6;
        need.calm   += lowHappy * 0.3;
      }

      /* High anxiety also drives sleep need (relaxation) */
      if (psp.anxiety != null) need.sleep += norm6(psp.anxiety) * 0.4;

      /* ── SEES-10 emotional eating ───────────────────────────────── */
      if (Array.isArray(input.sees10) && input.sees10.length) {
        /* Items measure eating change under stress. Distance from "3 = normal"
           indicates emotional-eating reactivity → needs appetite balance + calm. */
        const reactivity = input.sees10
          .map(v => Math.abs((v || 3) - 3) / 2)        /* 0..1 per item */
          .reduce((a, b) => a + b, 0) / input.sees10.length;
        need.appetite += reactivity * 1.0;
        need.calm     += reactivity * 0.4;
      }

      /* ── Hunger scale (1..10) ───────────────────────────────────── */
      if (input.hunger != null) {
        const h = Math.max(1, Math.min(10, input.hunger));
        /* Extremes (very hungry <3 or very full >8) → appetite regulation */
        if (h <= 3 || h >= 8) need.appetite += 0.5;
      }

      /* ── EEG mental-state (ML) ──────────────────────────────────── */
      const state = input.eeg?.mentalState?.label;
      if (state === 'stressed') { need.calm += 0.9; need.ground += 0.4; }
      if (state === 'drowsy')   { need.energize += 0.9; need.focus += 0.4; }
      if (state === 'focused')  { need.focus += 0.3; }
      if (state === 'relaxed')  { need.sleep += 0.2; }

      const load = input.eeg?.cognitiveLoad?.label;
      if (load === 'overload')  { need.focus += 0.7; need.calm += 0.5; need.ground += 0.3; }

      /* ── EEG emotion valence (real Muse-trained) ────────────────── */
      const emo = input.eeg?.emotion?.label;
      if (emo === 'negative') { need.uplift += 0.8; need.calm += 0.5; }
      if (emo === 'positive') { need.energize += 0.2; }

      /* ── PPG / GSR objective stress ─────────────────────────────── */
      if (input.ppg?.stressScore != null) {
        const s = input.ppg.stressScore / 100;
        need.calm  += s * 0.8;
        need.sleep += s * 0.3;
      }
      if (input.gsr != null && input.gsr > 60) {
        need.calm += ((input.gsr - 60) / 40) * 0.5;
      }

      /* Clamp & normalize to 0..1 */
      let max = 0;
      for (const k of DIMS) { need[k] = Math.max(0, need[k]); if (need[k] > max) max = need[k]; }
      if (max > 0) for (const k of DIMS) need[k] = +(need[k] / max).toFixed(3);

      return need;
    },

    /** Cosine similarity between need vector and oil target vector. */
    _similarity(need, targets) {
      let dot = 0, nMag = 0, tMag = 0;
      for (const k of DIMS) {
        const a = need[k] || 0, b = targets[k] || 0;
        dot += a * b; nMag += a * a; tMag += b * b;
      }
      if (nMag === 0 || tMag === 0) return 0;
      return dot / (Math.sqrt(nMag) * Math.sqrt(tMag));
    },

    /**
     * Recommend a blend.
     * @returns {
     *   need, dominant, carrier, essentials:[{oil, score}], blend, summary
     * }
     */
    recommend(input = {}) {
      const DB = (typeof AromaDB !== 'undefined') ? AromaDB
               : (typeof window !== 'undefined' ? window.AromaDB : null);
      if (!DB) return null;
      const need = this.buildNeedVector(input);

      /* Dominant therapeutic direction */
      let dominant = 'calm', domVal = -1;
      for (const k of DIMS) if (need[k] > domVal) { domVal = need[k]; dominant = k; }

      /* Rank essential oils by similarity */
      const ranked = DB.essentials()
        .map(oil => ({ oil, score: this._similarity(need, oil.targets) }))
        .sort((a, b) => b.score - a.score);

      const top = ranked.slice(0, 3).filter(r => r.score > 0.1);
      const carrier = DB.primary();   /* kemiri */

      /* Build blend drops: primary essential 3 drops, secondary 2, tertiary 1 */
      const dropPlan = [3, 2, 1];
      const blend = top.map((r, i) => ({
        id: r.oil.id, name: r.oil.name, drops: dropPlan[i] || 1, score: +r.score.toFixed(2)
      }));

      const dimLabel = {
        calm: 'menenangkan kecemasan', uplift: 'mengangkat suasana hati',
        ground: 'meredakan kemarahan/frustrasi', energize: 'meningkatkan energi',
        focus: 'meningkatkan fokus', sleep: 'mendukung tidur',
        appetite: 'menyeimbangkan nafsu makan'
      };

      const summary = top.length
        ? `Kebutuhan utama: ${dimLabel[dominant]}. Blend ${top.map(t => t.oil.name).join(' + ')} pada base ${carrier.name}.`
        : `Gunakan ${carrier.name} sebagai pijat relaksasi dasar.`;

      return { need, dominant, dominantLabel: dimLabel[dominant], carrier, ranked, top, blend, summary };
    },

    /** Convenience: pull live signals from app state + provided survey. */
    recommendFromLive({ psp5 = null, hunger = null, sees10 = null } = {}) {
      const eeg = (typeof MuseEEG !== 'undefined') ? MuseEEG.getMetrics() : {};
      const readDom = (id) => {
        const el = document.getElementById(id);
        if (!el) return null;
        const n = parseFloat(el.textContent);
        return isFinite(n) ? n : null;
      };
      return this.recommend({
        psp5, hunger, sees10,
        eeg: { mentalState: eeg.mentalState, cognitiveLoad: eeg.cognitiveLoad },
        ppg: { stressScore: readDom('stressValue'), rmssd: null },
        gsr: readDom('gsrValue')
      });
    }
  };

  if (typeof window !== 'undefined') window.AromaRecommender = AromaRecommender;
  if (typeof module !== 'undefined') module.exports = AromaRecommender;
})();
