/**
 * ScentraVN Serenity — Supabase Health Check
 *
 * Supabase free-plan projects auto-pause after ~7 days without activity.
 * A paused project doesn't return a normal error — Storage/API calls just
 * fail (connection refused / project not found), so a RAW-recording upload
 * would otherwise break silently. This runs a lightweight check whenever the
 * Dashboard loads and surfaces it as a visible warning banner instead.
 */
(() => {
  'use strict';

  const SupabaseHealth = {
    /** Probe Supabase Storage. Returns { ok: true|false|null }; null = skipped (offline). */
    async check() {
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: null, reason: 'offline' };
      if (!window.supabaseClient) return { ok: false, reason: 'not-configured' };
      try {
        const bucket = (typeof CONFIG !== 'undefined' && CONFIG.SUPABASE_RECORDINGS_BUCKET) || 'recordings';
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000));
        const { error } = await Promise.race([
          supabaseClient.storage.from(bucket).list('', { limit: 1 }),
          timeout,
        ]);
        if (error) return { ok: false, reason: error.message || 'error' };
        return { ok: true };
      } catch (e) {
        return { ok: false, reason: (e && e.message) || 'error' };
      }
    },

    /** Run the check and show/hide the banner in the current page. */
    async render(bannerId = 'supabaseHealthBanner') {
      const el = document.getElementById(bannerId);
      if (!el) return;
      const result = await this.check();
      if (result.ok === false) {
        console.warn('[SupabaseHealth] Supabase tidak terjangkau:', result.reason);
        el.style.display = 'flex';
      } else {
        el.style.display = 'none';
      }
    },
  };

  window.SupabaseHealth = SupabaseHealth;
})();
