/**
 * SYNAWATCH - Auth Guard
 * Protects routes that require authentication
 */

const AuthGuard = {
    /**
     * Check authentication status and redirect if needed
     */
    check() {
        return new Promise((resolve) => {
            // Check cached user first for quick response
            const cachedUser = localStorage.getItem('synawatch_user');

            // Listen for auth state
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe(); // Unsubscribe after first check

                if (user) {
                    resolve(user);
                } else {
                    // Redirect to auth page
                    window.location.href = 'auth.html';
                    resolve(null);
                }
            });

            // Timeout fallback - if Firebase takes too long
            setTimeout(() => {
                if (!auth.currentUser && !cachedUser) {
                    window.location.href = 'auth.html';
                    resolve(null);
                }
            }, 3000);
        });
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
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();

                if (user) {
                    window.location.href = 'app.html';
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
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
