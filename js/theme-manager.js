/**
 * ScentraVN Serenity — Theme Manager
 *
 * Light/dark toggle has been removed. The app now runs in a single fixed
 * light theme. This module only applies the light theme and strips any
 * previously-injected toggle button or saved dark preference.
 */

(() => {
  'use strict';

  const KEY = 'scentravn_theme';

  const ThemeManager = {
    current: 'light',

    init() {
      this.set('light', { silent: true });
      /* Clear any legacy saved preference so nothing forces dark. */
      try { localStorage.removeItem(KEY); } catch (e) { /* private mode */ }
      this._removeToggle();
      /* app.html mounts its header after a delay — keep stripping the button. */
      setTimeout(() => this._removeToggle(), 600);
      setTimeout(() => this._removeToggle(), 1500);
    },

    set(theme, { silent = false } = {}) {
      this.current = 'light';
      document.documentElement.setAttribute('data-theme', 'light');
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', '#F8FAFC');
      if (!silent && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: 'light' } }));
      }
    },

    /* No-op kept for backward compatibility with any callers. */
    cycle() { /* theme switching disabled */ },

    /* Remove any toggle button previously injected/cached in the DOM. */
    _removeToggle() {
      document.querySelectorAll('.theme-toggle-btn, #themeToggleBtn').forEach(el => el.remove());
    },
  };

  if (typeof window !== 'undefined') window.ThemeManager = ThemeManager;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
  } else {
    ThemeManager.init();
  }
})();
