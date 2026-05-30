/**
 * ScentraVN Serenity — Theme Manager
 *
 * Handles 3 modes (light · dark · aura) plus persistent preference,
 * system-pref auto-detection, and runtime swap. Renders the toggle
 * pill into the app header (top-right).
 */

(() => {
  'use strict';

  const KEY = 'scentravn_theme';
  const VALID = ['light', 'dark', 'aura'];

  const ThemeManager = {
    current: 'aura',

    init() {
      const saved = localStorage.getItem(KEY);
      const initial = VALID.includes(saved) ? saved : this._systemPref();
      this.set(initial, { silent: true });
      this._mount();
      this._listenSystemChange();
    },

    set(theme, { silent = false } = {}) {
      if (!VALID.includes(theme)) theme = 'aura';
      this.current = theme;
      document.documentElement.setAttribute('data-theme', theme);
      try { localStorage.setItem(KEY, theme); } catch (e) { /* private mode */ }

      /* Update theme-color meta for mobile status bar */
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content',
          theme === 'dark'  ? '#0f0a1f' :
          theme === 'light' ? '#F8FAFC' :
                              '#8B5CF6');
      }

      this._refreshButtons();
      if (!silent && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
      }
    },

    cycle() {
      const next = VALID[(VALID.indexOf(this.current) + 1) % VALID.length];
      this.set(next);
    },

    _systemPref() {
      try {
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
      } catch (e) {}
      return 'aura';
    },

    _listenSystemChange() {
      try {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener?.('change', e => {
          /* Only auto-flip if user hasn't picked manually */
          if (!localStorage.getItem(KEY)) this.set(e.matches ? 'dark' : 'aura', { silent: true });
        });
      } catch (e) {}
    },

    /* ── Inject the toggle button into the app header ────────────── */
    _mount() {
      /* Wait until header exists (app.html may render later) */
      const insert = () => {
        const headerRight = document.querySelector('.app-header .header-right');
        if (!headerRight) {
          /* Try standalone pages: just append to body top-right */
          if (!document.querySelector('.theme-toggle')) {
            const fab = this._buildToggle(true);
            fab.style.position = 'fixed';
            fab.style.top = '16px';
            fab.style.right = '16px';
            fab.style.zIndex = '500';
            document.body.appendChild(fab);
          }
          return;
        }
        if (headerRight.querySelector('.theme-toggle')) {
          this._refreshButtons();
          return;
        }
        const toggle = this._buildToggle(false);
        /* Place before the language button so order is: theme · lang · ble */
        headerRight.prepend(toggle);
        this._refreshButtons();
      };

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insert);
      } else {
        insert();
      }
      /* Also retry shortly after — app.html mounts header after a delay */
      setTimeout(insert, 600);
      setTimeout(insert, 1500);
    },

    _buildToggle(isFloating) {
      const wrap = document.createElement('div');
      wrap.className = 'theme-toggle';
      wrap.setAttribute('role', 'group');
      wrap.setAttribute('aria-label', 'Theme');
      wrap.innerHTML = `
        <button data-theme-set="light" aria-label="Light mode" title="Light"><i class="fas fa-sun"></i></button>
        <button data-theme-set="aura"  aria-label="Aura mode"  title="Aura"><i class="fas fa-wand-magic-sparkles"></i></button>
        <button data-theme-set="dark"  aria-label="Dark mode"  title="Dark"><i class="fas fa-moon"></i></button>
      `;
      wrap.addEventListener('click', e => {
        const btn = e.target.closest('button[data-theme-set]');
        if (btn) this.set(btn.dataset.themeSet);
      });
      return wrap;
    },

    _refreshButtons() {
      document.querySelectorAll('.theme-toggle button[data-theme-set]').forEach(b => {
        b.classList.toggle('active', b.dataset.themeSet === this.current);
      });
    }
  };

  if (typeof window !== 'undefined') window.ThemeManager = ThemeManager;

  /* ── Auto-init ────────────────────────────────────────────────
   * NOTE: The old AnimToggle was superseded by ScentraPerf
   * (js/performance-mode.js) which provides a fuller Lite/Normal mode.
   */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
  } else {
    ThemeManager.init();
  }
})();
