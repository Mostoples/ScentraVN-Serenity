/**
 * ScentraVN Serenity — Local Guest Session
 *
 * Lets "Continue as Guest" work with NO internet. A local guest has a locally
 * generated uid (no Firebase account), so the app's offline-first paths store
 * all data on the device. When the connection returns it auto-upgrades to a
 * real Firebase anonymous account and the local data syncs to Firestore.
 *
 * Loaded on both auth.html and app.html (after firebase-config.js).
 */
(() => {
  'use strict';

  const GUEST_KEY = 'scentravn_local_guest';
  const USER_KEY = 'scentravn_user';   // the key AuthGuard.getCachedUser() reads

  const GuestSession = {
    /** The stored local-guest object, or null. */
    get() {
      try { const r = localStorage.getItem(GUEST_KEY); return r ? JSON.parse(r) : null; }
      catch (e) { return null; }
    },

    /** A local guest is "active" only while there is no real Firebase user. */
    isActive() {
      if (!this.get()) return false;
      const hasFirebase = (typeof auth !== 'undefined') && auth.currentUser;
      return !hasFirebase;
    },

    /** Create a device-local guest session (works fully offline). */
    create() {
      const id = 'local-guest-' + Date.now().toString(36) + Math.floor(Math.random() * 1e5).toString(36);
      const guest = { uid: id, displayName: 'Tamu', email: null, photoURL: null, isLocalGuest: true, createdAt: Date.now() };
      try {
        localStorage.setItem(GUEST_KEY, JSON.stringify(guest));
        localStorage.setItem(USER_KEY, JSON.stringify(guest));   // so the guard treats it as a session
      } catch (e) { /* storage full / disabled */ }
      return guest;
    },

    /** Remove the local-guest markers (keeps a real user's cached session intact). */
    clear() {
      try { localStorage.removeItem(GUEST_KEY); } catch (e) {}
      try {
        const u = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
        if (u && u.isLocalGuest) localStorage.removeItem(USER_KEY);
      } catch (e) {}
    },

    _upgrading: false,
    /**
     * When online, promote a local guest to a real Firebase anonymous account so
     * its data can sync to Firestore. No-op if offline, already a real user, or
     * anonymous auth is unavailable (stays a local guest in that case).
     */
    async upgradeWhenOnline() {
      if (this._upgrading) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
      if (typeof auth === 'undefined') return;
      if (auth.currentUser) { this.clear(); return; }   // already a real user
      if (!this.get()) return;                            // no local guest to upgrade

      this._upgrading = true;
      try {
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        const cred = await auth.signInAnonymously();
        if (typeof FirebaseService !== 'undefined' && FirebaseService.createUserDocument) {
          try { await FirebaseService.createUserDocument(cred.user, { name: 'Tamu' }); } catch (e) {}
        }
        this.clear();
        // Push anything captured locally while offline.
        if (typeof RawRecorder !== 'undefined' && RawRecorder.syncLocalRecordings) RawRecorder.syncLocalRecordings();
        if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast('Akun Tamu tersambung ke cloud — data tersinkron.', 'success');
      } catch (e) {
        // Anonymous auth not enabled / transient → remain a local guest.
        console.warn('Guest upgrade tertunda:', e && e.message);
      } finally {
        this._upgrading = false;
      }
    },
  };

  if (typeof window !== 'undefined') {
    window.GuestSession = GuestSession;
    // Auto-upgrade when the connection returns…
    window.addEventListener('online', () => { try { GuestSession.upgradeWhenOnline(); } catch (_) {} });
    // …and shortly after load if we're already online (give auth time to settle).
    setTimeout(() => { try { GuestSession.upgradeWhenOnline(); } catch (_) {} }, 4000);
  }
})();
