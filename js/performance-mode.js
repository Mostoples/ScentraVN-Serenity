/**
 * ScentraVN Serenity — Performance Mode (Lite / Normal)
 *
 * One toggle that makes the whole app lighter on low-end devices:
 *   - adds `lite-mode` class to <html> → CSS strips blur/animations/shadows
 *   - exposes ScentraPerf.isLite() so JS modules can throttle work
 *     (slower chart redraws, lower sensor/render frequency, skip 3D avatar)
 *   - persists choice in localStorage
 *   - auto-suggests Lite on low-end devices (few CPU cores / low memory)
 *
 * Replaces the earlier AnimToggle with a broader, intentful control.
 */

(() => {
  'use strict';

  const KEY = 'scentravn_perf_mode';     // 'lite' | 'normal'

  const ScentraPerf = {
    mode: 'normal',
    _listeners: [],

    init() {
      const saved = localStorage.getItem(KEY);
      if (saved === 'lite' || saved === 'normal') {
        this.mode = saved;
      } else {
        /* Auto-detect low-end device on first visit */
        this.mode = this._isLowEndDevice() ? 'lite' : 'normal';
      }
      this._apply(true);
      this._mount();
    },

    isLite() { return this.mode === 'lite'; },

    set(mode, { silent = false } = {}) {
      this.mode = (mode === 'lite') ? 'lite' : 'normal';
      try { localStorage.setItem(KEY, this.mode); } catch (e) {}
      this._apply();
      this._refreshBtn();
      if (!silent) {
        this._toast(this.mode === 'lite'
          ? 'Mode Ringan aktif — animasi & efek dimatikan'
          : 'Mode Normal aktif — efek penuh');
        window.dispatchEvent(new CustomEvent('perfmodechange', { detail: { mode: this.mode } }));
        this._listeners.forEach(fn => { try { fn(this.mode); } catch (e) {} });
      }
    },

    toggle() { this.set(this.isLite() ? 'normal' : 'lite'); },

    onChange(cb) { if (typeof cb === 'function') this._listeners.push(cb); },

    _apply(silent) {
      const lite = this.isLite();
      document.documentElement.classList.toggle('lite-mode', lite);
      /* Keep backward-compat with Bob's reduce-motion class */
      document.documentElement.classList.toggle('reduce-motion', lite);
    },

    /* Heuristic: low cores OR low memory OR save-data header */
    _isLowEndDevice() {
      try {
        const cores = navigator.hardwareConcurrency || 4;
        const mem = navigator.deviceMemory || 4;          /* GB, Chrome only */
        const saveData = navigator.connection && navigator.connection.saveData;
        return cores <= 4 || mem <= 2 || !!saveData;
      } catch (e) { return false; }
    },

    /* ── Toggle button in header ──────────────────────────────────── */
    _mount() {
      const insert = () => {
        if (document.querySelector('.perf-toggle-btn')) { this._refreshBtn(); return; }
        const btn = document.createElement('button');
        btn.className = 'perf-toggle-btn';
        btn.setAttribute('aria-label', 'Performance mode');
        btn.title = 'Mode Ringan / Normal';
        btn.addEventListener('click', () => this.toggle());

        const headerRight = document.querySelector('.app-header .header-right');
        if (headerRight) {
          headerRight.prepend(btn);
        } else {
          btn.style.cssText = 'position:fixed;top:16px;right:104px;z-index:500;';
          document.body.appendChild(btn);
        }
        this._refreshBtn();
      };
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insert);
      } else { insert(); }
      setTimeout(insert, 700);
      setTimeout(insert, 1600);
    },

    _refreshBtn() {
      const btn = document.querySelector('.perf-toggle-btn');
      if (!btn) return;
      const lite = this.isLite();
      btn.classList.toggle('lite-active', lite);
      btn.innerHTML = `<i class="fas ${lite ? 'fa-feather' : 'fa-gauge-high'}"></i>`;
      btn.title = lite ? 'Mode Ringan AKTIF (klik untuk Normal)' : 'Mode Normal (klik untuk Ringan)';
    },

    _toast(msg) {
      let t = document.querySelector('.perf-toast');
      if (!t) {
        t = document.createElement('div');
        t.className = 'perf-toast';
        document.body.appendChild(t);
      }
      t.textContent = msg;
      requestAnimationFrame(() => t.classList.add('show'));
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
    }
  };

  if (typeof window !== 'undefined') window.ScentraPerf = ScentraPerf;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ScentraPerf.init());
  } else {
    ScentraPerf.init();
  }
})();
