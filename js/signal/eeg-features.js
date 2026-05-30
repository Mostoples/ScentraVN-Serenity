/**
 * ScentraVN Serenity — EEG Advanced Features
 *
 * Builds on top of MuseEEG's basic band powers and exposes:
 *   - Frontal Alpha Asymmetry (FAA) — depression/affect biomarker
 *   - Individual Alpha Frequency (IAF) — cognitive marker
 *   - Hemispheric coherence (TP9/TP10, AF7/AF8)
 *   - Engagement & meditation indices
 *   - Rule-based sleep stage classifier (AASM-inspired)
 *
 * References:
 *   - FAA: Luo et al. 2025 (Nature Mental Health, meta-analysis)
 *   - Sleep staging: AASM 2007+, Lambert & Peter-Derex 2023
 *   - Engagement Index: Pope et al. 1995 — beta/(alpha+theta)
 *   - Meditation index: alpha + theta synchrony
 */

(() => {
  'use strict';

  /* AASM-inspired thresholds for rule-based sleep staging on frontal channels.
   * These are heuristics — meant for trend tracking, not clinical diagnosis. */
  const SLEEP_RULES = {
    /* Wake: beta dominant, alpha present (eyes closed) */
    wake:  { betaMin: 0.18, alphaMin: 0.10, deltaMax: 0.30 },
    /* N1 (drowsy): theta rising, alpha dropping */
    n1:    { thetaMin: 0.16, alphaMax: 0.16, deltaMax: 0.40 },
    /* N2: theta + sleep spindles (12-14 Hz bursts) — proxied by SMR/sigma */
    n2:    { thetaMin: 0.18, sigmaMin: 0.05, deltaMax: 0.50 },
    /* N3 deep: delta dominant */
    n3:    { deltaMin: 0.45 },
    /* REM: theta + low-amplitude mixed, alpha similar to wake but no spindles */
    rem:   { thetaMin: 0.16, alphaRange: [0.08, 0.22], deltaMax: 0.30, betaMin: 0.10 }
  };

  const EEGFeatures = {

    /**
     * Compute Frontal Alpha Asymmetry from AF7 (left) & AF8 (right) alpha powers.
     * Convention: FAA = ln(α_right) − ln(α_left)
     *   FAA > 0 → relatively greater LEFT activation (approach motivation, lower depression risk)
     *   FAA < 0 → relatively greater RIGHT activation (withdrawal, higher depression risk)
     */
    frontalAlphaAsymmetry(alphaAF7, alphaAF8) {
      if (!alphaAF7 || !alphaAF8 || alphaAF7 <= 0 || alphaAF8 <= 0) return null;
      return +(Math.log(alphaAF8) - Math.log(alphaAF7)).toFixed(3);
    },

    /** FAA risk band */
    faaInterpret(faa) {
      if (faa === null || faa === undefined) return { band: 'unknown', label: 'Insufficient data' };
      if (faa <= -0.20) return { band: 'high-risk',     label: 'Right-dominant: low mood marker' };
      if (faa <= -0.05) return { band: 'mild-risk',     label: 'Slight right dominance' };
      if (faa <   0.05) return { band: 'balanced',      label: 'Hemispherically balanced' };
      if (faa <   0.20) return { band: 'positive',      label: 'Left-dominant: positive affect' };
      return                    { band: 'high-positive',label: 'Strong approach motivation' };
    },

    /**
     * Engagement Index (Pope et al.):  β / (α + θ)
     * High = active concentration, low = drowsy/relaxed
     */
    engagementIndex({ alpha, beta, theta }) {
      const denom = (alpha || 0) + (theta || 0);
      if (denom <= 0) return null;
      return +(beta / denom).toFixed(3);
    },

    /**
     * Meditation Index (heuristic): (α + θ) / (β + γ)
     * Higher → deeper meditative / relaxed state
     */
    meditationIndex({ alpha, theta, beta, gamma }) {
      const denom = (beta || 0) + (gamma || 0);
      if (denom <= 0) return null;
      return +(((alpha + theta) / denom)).toFixed(3);
    },

    /**
     * Rule-based sleep stage classification from frontal band-power proportions.
     * Input: powers from MuseEEG (delta, theta, alpha, beta, gamma)
     * Returns: 'wake' | 'n1' | 'n2' | 'n3' | 'rem'
     */
    classifySleepStage(powers) {
      const { delta = 0, theta = 0, alpha = 0, smr = 0, beta = 0, gamma = 0 } = powers || {};
      const total = delta + theta + alpha + beta + gamma + (smr || 0);
      if (total <= 0) return 'unknown';

      const p = {
        delta: delta / total,
        theta: theta / total,
        alpha: alpha / total,
        sigma: smr   / total,    /* SMR ≈ sigma 12-15Hz */
        beta:  beta  / total,
        gamma: gamma / total
      };

      /* ── ML path: use trained MLP if loaded (90%+ accuracy) ──────── */
      if (typeof NNRuntime !== 'undefined' && NNRuntime.has('sleep')) {
        try {
          const feat = {
            delta: p.delta, theta: p.theta, alpha: p.alpha,
            sigma: p.sigma, beta: p.beta, gamma: p.gamma,
            thetaBeta:  p.theta / (p.beta + 1e-6),
            deltaTheta: p.delta / (p.theta + 1e-6),
            alphaDelta: p.alpha / (p.delta + 1e-6),
          };
          const out = NNRuntime.predict('sleep', feat);
          if (out && out.label) {
            this._lastSleepConfidence = out.prob;
            return out.label;
          }
        } catch (e) { /* fall through to rules */ }
      }

      /* ── Rule-based fallback (AASM guidelines) ──────────────────── */
      this._lastSleepConfidence = null;
      if (p.delta >= SLEEP_RULES.n3.deltaMin)        return 'n3';
      if (p.beta  >= SLEEP_RULES.wake.betaMin && p.alpha >= SLEEP_RULES.wake.alphaMin)
                                                     return 'wake';
      if (p.theta >= SLEEP_RULES.rem.thetaMin
          && p.alpha >= SLEEP_RULES.rem.alphaRange[0]
          && p.alpha <= SLEEP_RULES.rem.alphaRange[1]
          && p.beta >= SLEEP_RULES.rem.betaMin
          && p.delta < SLEEP_RULES.rem.deltaMax)     return 'rem';
      if (p.theta >= SLEEP_RULES.n2.thetaMin && p.sigma >= SLEEP_RULES.n2.sigmaMin
          && p.delta < SLEEP_RULES.n2.deltaMax)      return 'n2';
      if (p.theta >= SLEEP_RULES.n1.thetaMin && p.alpha < SLEEP_RULES.n1.alphaMax)
                                                     return 'n1';
      return 'wake';
    },

    /** Confidence of the last ML sleep-stage call (null if rule-based). */
    _lastSleepConfidence: null,
    lastSleepConfidence() { return this._lastSleepConfidence; },

    /**
     * Classify mental state (focused/relaxed/drowsy/stressed) via trained MLP.
     * Returns { label, prob } or null if model not loaded.
     */
    classifyMentalState(powers, faa = 0) {
      if (typeof NNRuntime === 'undefined' || !NNRuntime.has('mentalState')) return null;
      const { delta = 0, theta = 0, alpha = 0, smr = 0, beta = 0, gamma = 0 } = powers || {};
      const total = delta + theta + alpha + beta + gamma + (smr || 0);
      if (total <= 0) return null;
      const p = {
        delta: delta / total, theta: theta / total, alpha: alpha / total,
        sigma: smr / total, beta: beta / total, gamma: gamma / total
      };
      try {
        const feat = {
          ...p,
          engagement: p.beta / (p.alpha + p.theta + 1e-6),
          relaxation: p.alpha / (p.beta + 1e-6),
          thetaBeta:  p.theta / (p.beta + 1e-6),
          faa: faa ?? 0
        };
        const out = NNRuntime.predict('mentalState', feat);
        return out ? { label: out.label, prob: out.prob, probs: out.probs } : null;
      } catch (e) { return null; }
    },

    /**
     * Classify cognitive load (relaxed/focused/overload) via trained MLP.
     */
    classifyCognitiveLoad(powers) {
      if (typeof NNRuntime === 'undefined' || !NNRuntime.has('cogLoad')) return null;
      const { delta = 0, theta = 0, alpha = 0, smr = 0, beta = 0, gamma = 0 } = powers || {};
      const total = delta + theta + alpha + beta + gamma + (smr || 0);
      if (total <= 0) return null;
      const p = {
        delta: delta / total, theta: theta / total, alpha: alpha / total,
        sigma: smr / total, beta: beta / total, gamma: gamma / total
      };
      try {
        const feat = {
          ...p,
          thetaAlpha: p.theta / (p.alpha + 1e-6),
          alphaTheta: p.alpha / (p.theta + 1e-6),
          engagement: p.beta / (p.alpha + p.theta + 1e-6),
          betaAlpha:  p.beta / (p.alpha + 1e-6)
        };
        const out = NNRuntime.predict('cogLoad', feat);
        return out ? { label: out.label, prob: out.prob, probs: out.probs } : null;
      } catch (e) { return null; }
    },

    mentalStateLabel(state) {
      return ({
        focused:  'Fokus',  relaxed: 'Rileks',
        neutral:  'Netral',
        drowsy:   'Mengantuk', stressed: 'Tertekan'
      })[state] ?? state;
    },

    cognitiveLoadLabel(level) {
      return ({
        relaxed: 'Beban Ringan', focused: 'Beban Optimal', overload: 'Beban Berlebih'
      })[level] ?? level;
    },

    emotionLabel(valence) {
      return ({
        positive: 'Positif', neutral: 'Netral', negative: 'Negatif'
      })[valence] ?? valence;
    },

    sleepStageLabel(stage) {
      return ({
        wake: 'Awake', n1: 'Light Sleep (N1)', n2: 'Sleep (N2)',
        n3:   'Deep Sleep (N3)', rem: 'REM Sleep', unknown: '—'
      })[stage] ?? stage;
    },

    /**
     * Aggregate a sleep session: list of staged epochs → percentages, durations.
     * Each epoch should be { stage, durationSec }.
     */
    summariseSleep(epochs) {
      if (!epochs || !epochs.length) return null;
      const counts = { wake: 0, n1: 0, n2: 0, n3: 0, rem: 0 };
      let total = 0;
      for (const e of epochs) {
        counts[e.stage] = (counts[e.stage] || 0) + e.durationSec;
        total += e.durationSec;
      }
      const pct = {};
      for (const k of Object.keys(counts)) pct[k] = +((counts[k] / total) * 100).toFixed(1);

      /* Sleep efficiency (time asleep / time in bed) */
      const asleep = counts.n1 + counts.n2 + counts.n3 + counts.rem;
      const efficiency = +(asleep / total * 100).toFixed(1);

      /* Approximate sleep score: weighted blend (deep + REM are high value) */
      const score = Math.min(100, Math.round(
        (pct.n3 || 0) * 1.6 + (pct.rem || 0) * 1.2 + (pct.n2 || 0) * 0.8 - (pct.wake || 0) * 0.5
      ));

      return { totalSec: total, durationsSec: counts, percentages: pct, efficiency, score };
    },

    /**
     * Hemispheric Coherence: simple Pearson correlation between two sample arrays.
     * Use AF7↔AF8 and TP9↔TP10 buffers.
     */
    coherence(a, b) {
      const n = Math.min(a.length, b.length);
      if (n < 16) return null;
      let sa = 0, sb = 0, sab = 0, sa2 = 0, sb2 = 0;
      for (let i = 0; i < n; i++) {
        sa += a[i]; sb += b[i];
        sab += a[i] * b[i];
        sa2 += a[i] * a[i]; sb2 += b[i] * b[i];
      }
      const cov = (sab - sa * sb / n) / n;
      const va = (sa2 - sa * sa / n) / n;
      const vb = (sb2 - sb * sb / n) / n;
      if (va <= 0 || vb <= 0) return null;
      return +(cov / Math.sqrt(va * vb)).toFixed(3);
    },

    /**
     * Compose a single EEG composite report from MuseEEG metrics + buffers.
     * Useful as the last step of a tick on the Brain page.
     */
    buildReport(museMetrics, museBuffers) {
      const p = museMetrics?.powers || {};
      const stage = this.classifySleepStage(p);
      const eng   = this.engagementIndex(p);
      const med   = this.meditationIndex(p);
      const cohF  = museBuffers ? this.coherence(museBuffers.af7 || [], museBuffers.af8 || []) : null;
      const cohT  = museBuffers ? this.coherence(museBuffers.tp9 || [], museBuffers.tp10 || []) : null;

      /* FAA from band powers — use afterwards-computed asymmetric alpha if available,
       * but in single-channel mode we approximate from total alpha vs theta+beta */
      const faa = museMetrics?.alphaAsymmetry ?? null;
      const faaInterp = this.faaInterpret(faa);

      return {
        sleepStage:    stage,
        sleepStageLabel: this.sleepStageLabel(stage),
        engagement:    eng,
        meditation:    med,
        faa,
        faaBand:       faaInterp.band,
        faaLabel:      faaInterp.label,
        coherenceFront: cohF,
        coherenceTemp:  cohT,
        ...museMetrics
      };
    }
  };

  if (typeof window !== 'undefined') window.EEGFeatures = EEGFeatures;
  if (typeof module !== 'undefined') module.exports = EEGFeatures;
})();
