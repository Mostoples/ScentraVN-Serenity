/**
 * SYNAWATCH - PWA Handler
 * Elegant PWA install prompt and service worker management
 */

const PWA = {
    deferredPrompt: null,
    isInstalled: false,
    isIOS: false,
    isStandalone: false,

    /**
     * Initialize PWA functionality
     */
    init() {
        console.log('[PWA] Initializing...');

        // Check if running in standalone mode (already installed)
        this.isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                           window.navigator.standalone ||
                           document.referrer.includes('android-app://');

        // Check if iOS
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

        // Register service worker
        this.registerServiceWorker();

        // Listen for install prompt
        this.listenForInstallPrompt();

        // Listen for app installed event
        this.listenForAppInstalled();

        // Check if should show install prompt
        this.checkInstallEligibility();

        // Create install UI
        this.createInstallUI();

        console.log('[PWA] Initialized', {
            isStandalone: this.isStandalone,
            isIOS: this.isIOS
        });
    },

    /**
     * Register Service Worker
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/',
                    updateViaCache: 'none'
                });

                this.swRegistration = registration;
                console.log('[PWA] Service Worker registered:', registration.scope);

                // Check for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('[PWA] New service worker installing...');

                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New version available - auto activate
                            console.log('[PWA] New version ready, activating...');
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                });

                // Handle controller change - reload to apply new version
                let refreshing = false;
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    if (refreshing) return;
                    refreshing = true;
                    console.log('[PWA] New version activated, reloading...');
                    window.location.reload();
                });

                // Check for updates periodically (every 2 minutes)
                setInterval(() => {
                    registration.update();
                    console.log('[PWA] Checking for updates...');
                }, 2 * 60 * 1000);

            } catch (error) {
                console.error('[PWA] Service Worker registration failed:', error);
            }
        }
    },

    /**
     * Listen for beforeinstallprompt event
     */
    listenForInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            console.log('[PWA] Install prompt available');

            // Prevent default mini-infobar
            e.preventDefault();

            // Store the event for later use
            this.deferredPrompt = e;

            // Show custom install UI after a delay
            setTimeout(() => {
                this.showInstallPrompt();
            }, 3000);
        });
    },

    /**
     * Listen for app installed event
     */
    listenForAppInstalled() {
        window.addEventListener('appinstalled', () => {
            console.log('[PWA] App installed successfully');
            this.isInstalled = true;
            this.deferredPrompt = null;
            this.hideInstallPrompt();
            this.showInstalledConfirmation();
        });
    },

    /**
     * Check if app is eligible for install
     */
    checkInstallEligibility() {
        // Check if already shown recently
        const lastShown = localStorage.getItem('pwa_install_shown');
        if (lastShown) {
            const daysSinceShown = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
            if (daysSinceShown < 7) {
                console.log('[PWA] Install prompt recently shown, skipping');
                return false;
            }
        }

        return !this.isStandalone;
    },

    /**
     * Create Install UI elements
     */
    createInstallUI() {
        // Create install banner
        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.className = 'pwa-install-banner';
        banner.innerHTML = `
            <div class="pwa-banner-backdrop"></div>
            <div class="pwa-banner-content">
                <button class="pwa-banner-close" onclick="PWA.hideInstallPrompt()" aria-label="Close">
                    <i class="fas fa-times"></i>
                </button>

                <div class="pwa-banner-header">
                    <div class="pwa-app-icon">
                        <img src="images/logo.png" alt="SYNAWATCH" width="64" height="64" class="pwa-app-icon-img">
                    </div>
                    <div class="pwa-app-info">
                        <h3>Install SYNAWATCH</h3>
                        <p>Add to your home screen for the best experience</p>
                    </div>
                </div>

                <div class="pwa-features">
                    <div class="pwa-feature">
                        <i class="fas fa-bolt"></i>
                        <span>Faster access</span>
                    </div>
                    <div class="pwa-feature">
                        <i class="fas fa-wifi-slash"></i>
                        <span>Works offline</span>
                    </div>
                    <div class="pwa-feature">
                        <i class="fas fa-bell"></i>
                        <span>Get notifications</span>
                    </div>
                </div>

                <div class="pwa-actions">
                    <button class="pwa-btn-secondary" onclick="PWA.hideInstallPrompt(true)">
                        Not now
                    </button>
                    <button class="pwa-btn-primary" onclick="PWA.installApp()">
                        <i class="fas fa-download"></i>
                        Install App
                    </button>
                </div>

                <div class="pwa-ios-instructions" style="display: none;">
                    <div class="pwa-ios-step">
                        <span class="step-number">1</span>
                        <span>Tap the <i class="fas fa-share-from-square"></i> Share button</span>
                    </div>
                    <div class="pwa-ios-step">
                        <span class="step-number">2</span>
                        <span>Scroll and tap <strong>"Add to Home Screen"</strong></span>
                    </div>
                    <div class="pwa-ios-step">
                        <span class="step-number">3</span>
                        <span>Tap <strong>"Add"</strong> to confirm</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        // Create mini install button for header
        const miniBtn = document.createElement('button');
        miniBtn.id = 'pwa-mini-install';
        miniBtn.className = 'pwa-mini-install';
        miniBtn.innerHTML = '<i class="fas fa-download"></i>';
        miniBtn.setAttribute('aria-label', 'Install App');
        miniBtn.onclick = () => this.showInstallPrompt();

        // Add mini button to header if not standalone
        if (!this.isStandalone) {
            const headerRight = document.querySelector('.header-right');
            if (headerRight) {
                headerRight.insertBefore(miniBtn, headerRight.firstChild);
            }
        }

        // Inject styles
        this.injectStyles();
    },

    /**
     * Inject PWA styles
     */
    injectStyles() {
        const styles = document.createElement('style');
        styles.id = 'pwa-styles';
        styles.textContent = `
            /* PWA Install Banner */
            .pwa-install-banner {
                position: fixed;
                inset: 0;
                z-index: 10000;
                display: none;
                align-items: flex-end;
                justify-content: center;
                padding: 16px;
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .pwa-install-banner.visible {
                display: flex;
                opacity: 1;
            }

            .pwa-banner-backdrop {
                position: absolute;
                inset: 0;
                background: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
            }

            .pwa-banner-content {
                position: relative;
                width: 100%;
                max-width: 400px;
                background: white;
                border-radius: 24px;
                padding: 24px;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25),
                            0 0 0 1px rgba(255, 255, 255, 0.1);
                animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }

            @keyframes slideUp {
                from {
                    opacity: 0;
                    transform: translateY(100px) scale(0.95);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            .pwa-banner-close {
                position: absolute;
                top: 16px;
                right: 16px;
                width: 32px;
                height: 32px;
                border-radius: 50%;
                background: #f1f5f9;
                border: none;
                color: #64748b;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
            }

            .pwa-banner-close:hover {
                background: #e2e8f0;
                color: #334155;
                transform: scale(1.1);
            }

            .pwa-banner-header {
                display: flex;
                align-items: center;
                gap: 16px;
                margin-bottom: 20px;
            }

            .pwa-app-icon {
                width: 64px;
                height: 64px;
                background: #fff;
                border: 1px solid rgba(139, 92, 246, 0.15);
                border-radius: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 8px 24px rgba(139, 92, 246, 0.2);
                flex-shrink: 0;
                padding: 4px;
                overflow: hidden;
            }

            .pwa-app-icon-img {
                width: 100%;
                height: 100%;
                object-fit: contain;
                display: block;
                border-radius: 12px;
            }

            .pwa-app-info h3 {
                font-size: 1.25rem;
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 4px;
            }

            .pwa-app-info p {
                font-size: 0.875rem;
                color: #64748b;
                line-height: 1.4;
            }

            .pwa-features {
                display: flex;
                gap: 12px;
                margin-bottom: 24px;
                flex-wrap: wrap;
            }

            .pwa-feature {
                flex: 1;
                min-width: 100px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding: 12px 8px;
                background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%);
                border-radius: 12px;
                text-align: center;
            }

            .pwa-feature i {
                font-size: 1.25rem;
                color: #8B5CF6;
            }

            .pwa-feature span {
                font-size: 0.75rem;
                font-weight: 600;
                color: #6d28d9;
            }

            .pwa-actions {
                display: flex;
                gap: 12px;
            }

            .pwa-btn-primary,
            .pwa-btn-secondary {
                flex: 1;
                padding: 14px 20px;
                border-radius: 12px;
                font-size: 0.9375rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                border: none;
            }

            .pwa-btn-primary {
                background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
                color: white;
                box-shadow: 0 4px 14px rgba(139, 92, 246, 0.4);
            }

            .pwa-btn-primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
            }

            .pwa-btn-primary:active {
                transform: translateY(0);
            }

            .pwa-btn-secondary {
                background: #f1f5f9;
                color: #64748b;
            }

            .pwa-btn-secondary:hover {
                background: #e2e8f0;
                color: #334155;
            }

            /* iOS Instructions */
            .pwa-ios-instructions {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
            }

            .pwa-ios-step {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 10px 0;
                font-size: 0.875rem;
                color: #475569;
            }

            .pwa-ios-step .step-number {
                width: 24px;
                height: 24px;
                background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
                color: white;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 0.75rem;
                font-weight: 700;
                flex-shrink: 0;
            }

            .pwa-ios-step i {
                color: #8B5CF6;
            }

            /* Mini Install Button */
            .pwa-mini-install {
                width: 40px;
                height: 40px;
                border-radius: 12px;
                background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
                border: none;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1rem;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 4px 14px rgba(139, 92, 246, 0.35);
                animation: pulse-glow 2s ease-in-out infinite;
            }

            @keyframes pulse-glow {
                0%, 100% {
                    box-shadow: 0 4px 14px rgba(139, 92, 246, 0.35);
                }
                50% {
                    box-shadow: 0 4px 20px rgba(139, 92, 246, 0.55);
                }
            }

            .pwa-mini-install:hover {
                transform: scale(1.1);
                box-shadow: 0 6px 24px rgba(139, 92, 246, 0.5);
            }

            .pwa-mini-install.hidden {
                display: none;
            }

            /* Update Available Toast */
            .pwa-update-toast {
                position: fixed;
                bottom: 100px;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                color: white;
                padding: 16px 24px;
                border-radius: 16px;
                display: flex;
                align-items: center;
                gap: 16px;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                z-index: 10001;
                opacity: 0;
                transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
            }

            .pwa-update-toast.visible {
                opacity: 1;
                transform: translateX(-50%) translateY(0);
            }

            .pwa-update-toast p {
                font-size: 0.875rem;
                font-weight: 500;
            }

            .pwa-update-toast button {
                padding: 8px 16px;
                background: white;
                color: #1e293b;
                border: none;
                border-radius: 8px;
                font-size: 0.8125rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .pwa-update-toast button:hover {
                background: #f1f5f9;
            }

            /* Installed Confirmation */
            .pwa-installed-modal {
                position: fixed;
                inset: 0;
                z-index: 10002;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 24px;
                background: rgba(0, 0, 0, 0.6);
                backdrop-filter: blur(8px);
                opacity: 0;
                transition: opacity 0.3s ease;
            }

            .pwa-installed-modal.visible {
                opacity: 1;
            }

            .pwa-installed-content {
                background: white;
                border-radius: 24px;
                padding: 40px;
                text-align: center;
                max-width: 320px;
                animation: scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1);
            }

            @keyframes scaleIn {
                from {
                    opacity: 0;
                    transform: scale(0.8);
                }
                to {
                    opacity: 1;
                    transform: scale(1);
                }
            }

            .pwa-installed-icon {
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 24px;
                box-shadow: 0 8px 24px rgba(34, 197, 94, 0.4);
            }

            .pwa-installed-icon i {
                font-size: 2rem;
                color: white;
            }

            .pwa-installed-content h3 {
                font-size: 1.5rem;
                font-weight: 700;
                color: #1e293b;
                margin-bottom: 8px;
            }

            .pwa-installed-content p {
                font-size: 0.9375rem;
                color: #64748b;
                line-height: 1.5;
            }

            /* Responsive */
            @media (min-width: 768px) {
                .pwa-install-banner {
                    align-items: center;
                }

                .pwa-banner-content {
                    max-width: 440px;
                    padding: 32px;
                }

                .pwa-app-icon {
                    width: 72px;
                    height: 72px;
                }

                .pwa-app-info h3 {
                    font-size: 1.375rem;
                }
            }
        `;
        document.head.appendChild(styles);
    },

    /**
     * Show install prompt
     */
    showInstallPrompt() {
        const banner = document.getElementById('pwa-install-banner');
        if (!banner || this.isStandalone) return;

        // Show iOS-specific instructions
        if (this.isIOS) {
            const iosInstructions = banner.querySelector('.pwa-ios-instructions');
            const actions = banner.querySelector('.pwa-actions');
            if (iosInstructions) iosInstructions.style.display = 'block';
            if (actions) actions.style.display = 'none';
        }

        banner.classList.add('visible');
        localStorage.setItem('pwa_install_shown', Date.now().toString());
    },

    /**
     * Hide install prompt
     */
    hideInstallPrompt(remember = false) {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) {
            banner.classList.remove('visible');
        }

        if (remember) {
            localStorage.setItem('pwa_install_dismissed', 'true');
            // Hide mini button too
            const miniBtn = document.getElementById('pwa-mini-install');
            if (miniBtn) miniBtn.classList.add('hidden');
        }
    },

    /**
     * Trigger app installation
     */
    async installApp() {
        if (!this.deferredPrompt) {
            console.log('[PWA] No install prompt available');
            // Show iOS instructions if on iOS
            if (this.isIOS) {
                this.showInstallPrompt();
            }
            return;
        }

        // Show the install prompt
        this.deferredPrompt.prompt();

        // Wait for user response
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log('[PWA] User choice:', outcome);

        // Clear the prompt
        this.deferredPrompt = null;

        if (outcome === 'accepted') {
            this.hideInstallPrompt();
        }
    },

    /**
     * Show update available notification
     */
    showUpdateAvailable() {
        // Remove existing toast
        const existing = document.querySelector('.pwa-update-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'pwa-update-toast';
        toast.innerHTML = `
            <p>A new version is available!</p>
            <button onclick="PWA.reloadApp()">Update</button>
        `;
        document.body.appendChild(toast);

        // Show with animation
        requestAnimationFrame(() => {
            toast.classList.add('visible');
        });
    },

    /**
     * Show installed confirmation
     */
    showInstalledConfirmation() {
        const modal = document.createElement('div');
        modal.className = 'pwa-installed-modal';
        modal.innerHTML = `
            <div class="pwa-installed-content">
                <div class="pwa-installed-icon">
                    <i class="fas fa-check"></i>
                </div>
                <h3>App Installed!</h3>
                <p>SYNAWATCH has been added to your home screen. Enjoy faster access to your health data!</p>
            </div>
        `;
        document.body.appendChild(modal);

        // Show with animation
        requestAnimationFrame(() => {
            modal.classList.add('visible');
        });

        // Auto dismiss
        setTimeout(() => {
            modal.classList.remove('visible');
            setTimeout(() => modal.remove(), 300);
        }, 3000);
    },

    /**
     * Reload app to apply updates
     */
    reloadApp() {
        window.location.reload();
    }
};

// Initialize PWA when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => PWA.init());
} else {
    PWA.init();
}

// Make PWA globally available
window.PWA = PWA;
