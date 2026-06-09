/**
 * SCENTRAVN - Auth Guard
 * Protects routes that require authentication
 */

const AuthGuard = {
    /**
     * Check authentication status and redirect if needed
     */
    check() {
        return new Promise((resolve) => {
            let settled = false;

            // Cached user from a previous successful login (set by the
            // onAuthStateChanged listener in firebase-config.js).
            const cachedUser = this.getCachedUser();
            const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

            const allow = (user) => {
                if (settled) return;
                settled = true;
                resolve(user);
            };

            const deny = () => {
                if (settled) return;
                settled = true;
                window.location.href = 'auth.html';
                resolve(null);
            };

            // Listen for auth state
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe(); // Unsubscribe after first check

                if (user) {
                    allow(user);
                } else if (isOffline && cachedUser) {
                    // Offline and we have a previously cached session: trust the
                    // cache and let the user in. Firebase cannot reach its auth
                    // servers offline, so we must not redirect to the login page
                    // (where Google sign-in would be impossible).
                    allow(cachedUser);
                } else {
                    // Online with no user, or no cached session at all.
                    deny();
                }
            });

            // Timeout fallback - if Firebase takes too long to respond.
            setTimeout(() => {
                if (settled) return;
                if (auth.currentUser) {
                    allow(auth.currentUser);
                } else if (cachedUser) {
                    // Slow/offline Firebase but we have a cached session: allow.
                    allow(cachedUser);
                } else {
                    deny();
                }
            }, 3000);
        });
    },

    /**
     * Get cached user object from localStorage (null if none)
     */
    getCachedUser() {
        try {
            const raw = localStorage.getItem('scentravn_user');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Initialize auth guard on protected pages
     */
    init() {
        // Show loading state while checking
        document.body.style.opacity = '0';

        this.check().then((user) => {
            if (user) {
                // Fade in content
                document.body.style.transition = 'opacity 0.3s ease';
                document.body.style.opacity = '1';

                // Dispatch authenticated event
                document.dispatchEvent(new CustomEvent('authenticated', { detail: { user } }));
            }
        });
    },

    /**
     * Redirect authenticated users away from auth page
     */
    redirectIfAuthenticated() {
        return new Promise((resolve) => {
            let settled = false;
            const cachedUser = this.getCachedUser();
            const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;

            // Offline with a cached session: no point staying on the login page
            // (Google sign-in needs internet). Go straight to the app.
            if (isOffline && cachedUser) {
                settled = true;
                window.location.href = 'app.html';
                resolve(true);
                return;
            }

            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();
                if (settled) return;
                settled = true;

                if (user) {
                    window.location.href = 'app.html';
                    resolve(true);
                } else {
                    resolve(false);
                }
            });

            // Fallback: if Firebase is slow but we already have a cached session.
            setTimeout(() => {
                if (settled) return;
                if (auth.currentUser || cachedUser) {
                    settled = true;
                    window.location.href = 'app.html';
                    resolve(true);
                }
            }, 3000);
        });
    },

    /**
     * Get current user or redirect
     */
    async requireUser() {
        const user = auth.currentUser;
        if (!user) {
            await this.check();
            return auth.currentUser;
        }
        return user;
    },

    /**
     * Get user data from Firestore
     */
    async getUserData() {
        const user = await this.requireUser();
        if (!user) return null;

        return await FirebaseService.getUserDocument(user.uid);
    }
};

// Auto-initialize on protected pages
document.addEventListener('DOMContentLoaded', () => {
    // Check if this is a protected page (has data-protected attribute or specific class)
    const isProtectedPage = document.body.hasAttribute('data-protected') ||
                           document.querySelector('.app-container');

    // Check if this is the auth page
    const isAuthPage = document.querySelector('.auth-container');

    if (isAuthPage) {
        // Redirect to dashboard if already logged in
        AuthGuard.redirectIfAuthenticated();
    } else if (isProtectedPage) {
        // Protect the page
        AuthGuard.init();
    }
});

// Make AuthGuard globally available
window.AuthGuard = AuthGuard;
