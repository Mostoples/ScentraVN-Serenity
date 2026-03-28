/**
 * SYNAWATCH - Bottom Navigation Component
 */

const Navbar = {
    /**
     * Navigation items configuration
     */
    items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'fa-home', href: 'dashboard.html' },
        { id: 'analytics', label: 'Analytics', icon: 'fa-chart-line', href: 'analytics.html' },
        { id: 'health', label: 'Health', icon: 'fa-heartbeat', href: 'health.html' },
        { id: 'chat', label: 'Synachat', icon: 'fa-comments', href: 'synachat.html' },
        { id: 'profile', label: 'Profile', icon: 'fa-user', href: 'profile.html' }
    ],

    /**
     * Render the navigation bar
     */
    render(activeId) {
        const nav = document.createElement('nav');
        nav.className = 'bottom-nav';
        nav.setAttribute('role', 'navigation');
        nav.setAttribute('aria-label', 'Main navigation');

        nav.innerHTML = this.items.map(item => `
            <a href="${item.href}"
               class="nav-item ${item.id === activeId ? 'active' : ''}"
               aria-current="${item.id === activeId ? 'page' : 'false'}">
                <div class="nav-icon">
                    <i class="fas ${item.icon}"></i>
                </div>
                <span class="nav-label">${item.label}</span>
            </a>
        `).join('');

        return nav;
    },

    /**
     * Initialize navigation on page
     */
    init(activeId) {
        const existingNav = document.querySelector('.bottom-nav');
        if (existingNav) {
            existingNav.remove();
        }

        const nav = this.render(activeId);
        document.body.appendChild(nav);

        // Add keyboard navigation
        this.setupKeyboardNav(nav);
    },

    /**
     * Setup keyboard navigation
     */
    setupKeyboardNav(nav) {
        const items = nav.querySelectorAll('.nav-item');

        nav.addEventListener('keydown', (e) => {
            const currentIndex = Array.from(items).findIndex(item =>
                item === document.activeElement
            );

            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % items.length;
                items[nextIndex].focus();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                const prevIndex = (currentIndex - 1 + items.length) % items.length;
                items[prevIndex].focus();
            }
        });
    },

    /**
     * Set active item
     */
    setActive(itemId) {
        const items = document.querySelectorAll('.nav-item');
        items.forEach(item => {
            const isActive = item.href.includes(this.items.find(i => i.id === itemId)?.href);
            item.classList.toggle('active', isActive);
            item.setAttribute('aria-current', isActive ? 'page' : 'false');
        });
    },

    /**
     * Show/hide navbar
     */
    toggle(show) {
        const nav = document.querySelector('.bottom-nav');
        if (nav) {
            nav.style.display = show ? 'flex' : 'none';
        }
    },

    /**
     * Get current page ID from URL
     */
    getCurrentPageId() {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '') || 'dashboard';

        // Map synachat to chat
        if (page === 'synachat') return 'chat';

        return page;
    }
};

// Auto-initialize navbar on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on pages that need navbar
    if (document.querySelector('.app-container')) {
        Navbar.init(Navbar.getCurrentPageId());
    }
});

// Make Navbar globally available
window.Navbar = Navbar;
