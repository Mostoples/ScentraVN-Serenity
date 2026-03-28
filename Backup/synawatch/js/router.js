/**
 * SYNAWATCH - SPA Router
 * Handles client-side routing for Single Page Application
 */

const Router = {
    routes: {},
    currentRoute: null,
    currentView: null,

    /**
     * Initialize the router
     */
    init() {
        // Handle browser back/forward
        window.addEventListener('popstate', () => this.handleRoute());

        // Handle link clicks
        document.addEventListener('click', (e) => {
            const link = e.target.closest('[data-route]');
            if (link) {
                e.preventDefault();
                const route = link.getAttribute('data-route');
                this.navigate(route);
            }
        });

        // Initial route
        this.handleRoute();
    },

    /**
     * Register a route
     */
    register(path, handler) {
        this.routes[path] = handler;
    },

    /**
     * Navigate to a route
     */
    navigate(path, replace = false) {
        if (replace) {
            history.replaceState({ path }, '', `#${path}`);
        } else {
            history.pushState({ path }, '', `#${path}`);
        }
        this.handleRoute();
    },

    /**
     * Handle the current route
     */
    handleRoute() {
        const hash = window.location.hash.slice(1) || 'dashboard';
        const route = this.routes[hash];

        if (route) {
            // Cleanup previous view
            if (this.currentRoute && typeof App !== 'undefined' && App.cleanupPreviousView) {
                App.cleanupPreviousView(this.currentRoute);
            }

            this.currentRoute = hash;
            this.updateNavigation();
            route();
        } else {
            // Fallback to dashboard
            this.navigate('dashboard', true);
        }
    },

    /**
     * Update navigation active state
     */
    updateNavigation() {
        document.querySelectorAll('.nav-item').forEach(item => {
            const route = item.getAttribute('data-route');
            if (route === this.currentRoute) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },

    /**
     * Render view to container
     */
    render(html) {
        const container = document.getElementById('view-container');
        if (container) {
            container.innerHTML = html;
            container.classList.add('view-container');

            // Add/remove synachat-active class for full-width layout
            if (this.currentRoute === 'synachat') {
                container.classList.add('synachat-active');
                document.body.classList.add('synachat-view');
            } else {
                container.classList.remove('synachat-active');
                document.body.classList.remove('synachat-view');
            }

            // Scroll to top
            window.scrollTo(0, 0);
        }
    }
};

// Make it globally available
window.Router = Router;
