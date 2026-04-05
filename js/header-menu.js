/**
 * SYNAWATCH - Header Menu (Mobile Hamburger)
 * Responsive header menu for mobile devices
 */

const HeaderMenu = {
    isOpen: false,

    /**
     * Initialize header menu
     */
    init() {
        this.createHamburgerButton();
        this.createDropdownMenu();
        this.setupEventListeners();
        console.log('[HeaderMenu] Initialized');
    },

    /**
     * Create hamburger button
     */
    createHamburgerButton() {
        const headerRight = document.querySelector('.header-right');
        if (!headerRight) return;

        // Create hamburger button
        const hamburger = document.createElement('button');
        hamburger.id = 'hamburgerBtn';
        hamburger.className = 'hamburger-btn';
        hamburger.setAttribute('aria-label', 'Menu');
        hamburger.innerHTML = `
            <div class="hamburger-icon">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;

        // Insert at the beginning of header-right
        headerRight.insertBefore(hamburger, headerRight.firstChild);
    },

    /**
     * Create dropdown menu
     */
    createDropdownMenu() {
        const header = document.querySelector('.app-header');
        if (!header) return;

        const dropdown = document.createElement('div');
        dropdown.id = 'headerDropdown';
        dropdown.className = 'header-dropdown';
        dropdown.innerHTML = `
            <div class="dropdown-content">
                <div class="dropdown-items" id="dropdownItems">
                    <!-- Items will be cloned here -->
                </div>
            </div>
        `;

        header.appendChild(dropdown);
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const hamburger = document.getElementById('hamburgerBtn');
        const dropdown = document.getElementById('headerDropdown');

        if (hamburger) {
            hamburger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggle();
            });
        }

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (this.isOpen && dropdown && !dropdown.contains(e.target)) {
                this.close();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        // Update menu items when window resizes
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && this.isOpen) {
                this.close();
            }
        });
    },

    /**
     * Toggle menu
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    },

    /**
     * Open menu
     */
    open() {
        const hamburger = document.getElementById('hamburgerBtn');
        const dropdown = document.getElementById('headerDropdown');
        const dropdownItems = document.getElementById('dropdownItems');

        if (!hamburger || !dropdown || !dropdownItems) return;

        // Clone header items to dropdown
        this.cloneHeaderItems(dropdownItems);

        // Open menu
        hamburger.classList.add('active');
        dropdown.classList.add('active');
        this.isOpen = true;

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    },

    /**
     * Close menu
     */
    close() {
        const hamburger = document.getElementById('hamburgerBtn');
        const dropdown = document.getElementById('headerDropdown');

        if (!hamburger || !dropdown) return;

        hamburger.classList.remove('active');
        dropdown.classList.remove('active');
        this.isOpen = false;

        // Restore body scroll
        document.body.style.overflow = '';
    },

    /**
     * Clone header items to dropdown
     * BLE button stays in header (always visible on mobile)
     * PWA install button moves into dropdown
     */
    cloneHeaderItems(container) {
        if (!container) return;

        // Clear existing items
        container.innerHTML = '';

        // Get all header-right children except hamburger, BLE button, and BLE indicator
        // BLE stays visible in the header on mobile
        const headerRight = document.querySelector('.header-right');
        if (!headerRight) return;

        const skipIds = ['hamburgerBtn', 'headerDropdown', 'bleConnectBtn', 'bleIndicator'];
        const items = Array.from(headerRight.children).filter(
            child => !skipIds.includes(child.id)
        );

        items.forEach(item => {
            const dropdownItem = document.createElement('div');
            dropdownItem.className = 'dropdown-item';

            // Clone the item
            const clonedItem = item.cloneNode(true);

            // Update classes for dropdown style
            if (clonedItem.id === 'headerMusicBtn') {
                clonedItem.className = 'dropdown-music-btn';
            } else if (clonedItem.id === 'langToggleBtn') {
                clonedItem.className = 'dropdown-lang-btn';
            } else if (clonedItem.id === 'pwa-mini-install') {
                // PWA install button — restyle for dropdown
                clonedItem.className = 'dropdown-pwa-btn';
                clonedItem.innerHTML = '<i class="fas fa-download" aria-hidden="true"></i><span class="pwa-install-label">Install App</span>';
            }

            // Re-attach event listeners
            this.attachEventListeners(clonedItem, item);

            dropdownItem.appendChild(clonedItem);
            container.appendChild(dropdownItem);
        });
    },

    /**
     * Attach event listeners to cloned items
     */
    attachEventListeners(clonedItem, originalItem) {
        // Music button
        if (clonedItem.id === 'headerMusicBtn' && typeof CountryMusic !== 'undefined') {
            clonedItem.onclick = () => {
                CountryMusic.showController();
                this.close();
            };
        }

        // Language toggle
        if (clonedItem.id === 'langToggleBtn' && typeof I18n !== 'undefined') {
            clonedItem.onclick = () => {
                I18n.setLang(I18n.currentLang === 'id' ? 'en' : 'id');
                this.close();
            };
        }

        // PWA install
        if (clonedItem.id === 'pwa-mini-install' && typeof PWAManager !== 'undefined') {
            clonedItem.onclick = () => {
                PWAManager.showInstallPrompt();
                this.close();
            };
        }
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => HeaderMenu.init());
} else {
    HeaderMenu.init();
}

// Make globally available
window.HeaderMenu = HeaderMenu;
