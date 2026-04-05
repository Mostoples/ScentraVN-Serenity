/**
 * SYNAWATCH - Onboarding Tour (Multi-Page)
 * Guided walkthrough & coach marks for new users
 * Each page has its own mini-tour, triggered on first visit
 * Tour completion tracked per-page in Firestore
 */

const OnboardingTour = {
    currentPage: null,
    currentStep: 0,
    steps: [],
    overlay: null,
    tooltip: null,
    isActive: false,
    _resizeHandler: null,
    _touchStartX: 0,
    _touchStartY: 0,
    _scrollEndTimer: null,
    _scrollEndCalled: false,
    _completedTours: null, // cached from Firestore

    // ===== Per-page tour definitions =====
    getPageTours() {
        return {
            dashboard: {
                showWelcome: true,
                steps: [
                    {
                        selector: '.featured-card',
                        title: t('tour.dash.score_title'),
                        description: t('tour.dash.score_desc'),
                        icon: 'fa-shield-heart',
                        position: 'bottom'
                    },
                    {
                        selector: '.card[onclick*="heroic"]',
                        title: t('tour.dash.heroic_title'),
                        description: t('tour.dash.heroic_desc'),
                        icon: 'fa-star-of-life',
                        position: 'bottom'
                    },
                    {
                        selector: '.card-grid',
                        title: t('tour.dash.menu_title'),
                        description: t('tour.dash.menu_desc'),
                        icon: 'fa-grip',
                        position: 'bottom'
                    }
                ]
            },

            health: {
                steps: [
                    {
                        selector: '.hr-showcase',
                        title: t('tour.health.hr_title'),
                        description: t('tour.health.hr_desc'),
                        icon: 'fa-heartbeat',
                        position: 'bottom'
                    },
                    {
                        selector: '.vitals-section',
                        title: t('tour.health.vitals_title'),
                        description: t('tour.health.vitals_desc'),
                        icon: 'fa-wave-square',
                        position: 'bottom'
                    },
                    {
                        selector: '.wellness-section',
                        title: t('tour.health.gsr_title'),
                        description: t('tour.health.gsr_desc'),
                        icon: 'fa-brain',
                        position: 'bottom'
                    }
                ]
            },

            analytics: {
                steps: [
                    {
                        selector: '.filter-tabs',
                        title: t('tour.analytics.filter_title'),
                        description: t('tour.analytics.filter_desc'),
                        icon: 'fa-filter',
                        position: 'bottom'
                    },
                    {
                        selector: '.chart-container',
                        title: t('tour.analytics.chart_title'),
                        description: t('tour.analytics.chart_desc'),
                        icon: 'fa-chart-line',
                        position: 'bottom'
                    }
                ]
            },

            synachat: {
                steps: [
                    {
                        selector: '.avatar-info',
                        title: t('tour.synachat.ai_title'),
                        description: t('tour.synachat.ai_desc'),
                        icon: 'fa-robot',
                        position: 'bottom'
                    },
                    {
                        selector: '.health-context-bar',
                        title: t('tour.synachat.context_title'),
                        description: t('tour.synachat.context_desc'),
                        icon: 'fa-heart-pulse',
                        position: 'bottom'
                    },
                    {
                        selector: '.quick-actions',
                        title: t('tour.synachat.quick_title'),
                        description: t('tour.synachat.quick_desc'),
                        icon: 'fa-bolt',
                        position: 'top'
                    }
                ]
            },

            sleep: {
                steps: [
                    {
                        selector: '.health-hero',
                        title: t('tour.sleep.score_title'),
                        description: t('tour.sleep.score_desc'),
                        icon: 'fa-moon',
                        position: 'bottom'
                    },
                    {
                        selector: '#sleepAudioGrid',
                        title: t('tour.sleep.audio_title'),
                        description: t('tour.sleep.audio_desc'),
                        icon: 'fa-headphones',
                        position: 'bottom'
                    },
                    {
                        selector: '.list-item[data-routine]',
                        title: t('tour.sleep.routine_title'),
                        description: t('tour.sleep.routine_desc'),
                        icon: 'fa-list-check',
                        position: 'top'
                    }
                ]
            },

            mindful: {
                steps: [
                    {
                        selector: '#breathingCircle',
                        title: t('tour.mindful.circle_title'),
                        description: t('tour.mindful.circle_desc'),
                        icon: 'fa-wind',
                        position: 'bottom'
                    },
                    {
                        selector: '#mindfulBtn',
                        title: t('tour.mindful.btn_title'),
                        description: t('tour.mindful.btn_desc'),
                        icon: 'fa-play',
                        position: 'top'
                    }
                ]
            },

            journal: {
                steps: [
                    {
                        selector: '#journalInput',
                        title: t('tour.journal.input_title'),
                        description: t('tour.journal.input_desc'),
                        icon: 'fa-pen-fancy',
                        position: 'bottom'
                    },
                    {
                        selector: '#journalList',
                        title: t('tour.journal.history_title'),
                        description: t('tour.journal.history_desc'),
                        icon: 'fa-clock-rotate-left',
                        position: 'top'
                    }
                ]
            },

            heroic: {
                steps: [
                    {
                        type: 'modal',
                        title: t('tour.heroic.intro_title'),
                        description: t('tour.heroic.intro_desc'),
                        icon: 'fa-star-of-life'
                    }
                ]
            },

            games: {
                steps: [
                    {
                        selector: '.games-stats-bar',
                        title: t('tour.games.stats_title'),
                        description: t('tour.games.stats_desc'),
                        icon: 'fa-trophy',
                        position: 'bottom'
                    },
                    {
                        selector: '.games-hero',
                        title: t('tour.games.types_title'),
                        description: t('tour.games.types_desc'),
                        icon: 'fa-gamepad',
                        position: 'bottom'
                    }
                ]
            },

            support: {
                steps: [
                    {
                        type: 'modal',
                        title: t('tour.support.intro_title'),
                        description: t('tour.support.intro_desc'),
                        icon: 'fa-hand-holding-heart'
                    }
                ]
            },

            moodbooster: {
                steps: [
                    {
                        type: 'modal',
                        title: t('tour.mood.intro_title'),
                        description: t('tour.mood.intro_desc'),
                        icon: 'fa-music'
                    }
                ]
            },

            profile: {
                steps: [
                    {
                        type: 'modal',
                        title: t('tour.profile.intro_title'),
                        description: t('tour.profile.intro_desc'),
                        icon: 'fa-user-gear'
                    }
                ]
            },

            academy: {
                steps: [
                    {
                        type: 'modal',
                        title: t('tour.academy.intro_title'),
                        description: t('tour.academy.intro_desc'),
                        icon: 'fa-graduation-cap'
                    }
                ]
            },

            research: {
                steps: [
                    {
                        type: 'modal',
                        title: t('tour.research.intro_title'),
                        description: t('tour.research.intro_desc'),
                        icon: 'fa-flask'
                    }
                ]
            },

            yoga: {
                steps: [
                    {
                        selector: '.yoga-search-wrapper',
                        title: t('tour.yoga.search_title'),
                        description: t('tour.yoga.search_desc'),
                        icon: 'fa-search',
                        position: 'bottom'
                    },
                    {
                        selector: '.yoga-filter-bar',
                        title: t('tour.yoga.filter_title'),
                        description: t('tour.yoga.filter_desc'),
                        icon: 'fa-filter',
                        position: 'bottom'
                    }
                ]
            },

            questionnaire: {
                steps: [
                    {
                        selector: '.q-header-card',
                        title: t('tour.questionnaire.intro_title'),
                        description: t('tour.questionnaire.intro_desc'),
                        icon: 'fa-clipboard-list',
                        position: 'bottom'
                    },
                    {
                        selector: '#qProgressSection',
                        title: t('tour.questionnaire.progress_title'),
                        description: t('tour.questionnaire.progress_desc'),
                        icon: 'fa-tasks',
                        position: 'bottom'
                    }
                ]
            }
        };
    },

    // ===== Public API =====

    /**
     * Check and start tour for a specific page
     * Called by each route handler in app.js
     */
    async checkAndStart(pageName) {
        try {
            if (this.isActive) return;

            const user = auth?.currentUser;
            if (!user || !db) return;

            // Load completed tours (cache to avoid repeated reads)
            if (!this._completedTours) {
                const userDoc = await db.collection('users').doc(user.uid).get();
                const data = userDoc.data() || {};
                // Only show tours if assessment onboarding is done
                if (!data.onboardingCompleted) return;

                // Merge Firestore data with localStorage backup
                const firestoreTours = data.toursCompleted || {};
                let localTours = {};
                try {
                    localTours = JSON.parse(localStorage.getItem('synawatch_tours_completed') || '{}');
                } catch (_) {}

                // Combine both sources — if either says completed, it's completed
                this._completedTours = { ...localTours, ...firestoreTours };
            }

            // Check if this page's tour has already been completed
            if (this._completedTours[pageName]) return;

            const pageTours = this.getPageTours();
            const tourDef = pageTours[pageName];
            if (!tourDef) return;

            // Delay to let page render
            setTimeout(() => this._startPageTour(pageName, tourDef), 600);
        } catch (e) {
            console.error('[OnboardingTour] Error checking tour:', e);
        }
    },

    /**
     * Reset cache (call when user logs out or lang changes)
     */
    resetCache() {
        this._completedTours = null;
    },

    // ===== Internal =====

    _startPageTour(pageName, tourDef) {
        if (this.isActive) return;
        this.isActive = true;
        this.currentPage = pageName;
        this.currentStep = 0;

        // Build steps array
        this.steps = [];

        // Welcome modal only on very first tour (dashboard)
        if (tourDef.showWelcome && !this._hasAnyTourCompleted()) {
            this.steps.push({
                type: 'welcome',
                title: t('tour.welcome_title'),
                description: t('tour.welcome_desc'),
                icon: 'fa-hand-sparkles'
            });
        }

        // Page-specific steps
        this.steps.push(...tourDef.steps);

        // Finish step
        this.steps.push({
            type: 'finish',
            title: t('tour.finish_title'),
            description: t('tour.finish_desc'),
            icon: 'fa-check-circle'
        });

        this.createOverlay();
        this.bindEvents();
        this.showStep(0);

        console.log(`[OnboardingTour] Started tour for "${pageName}" (${this.steps.length} steps)`);
    },

    _hasAnyTourCompleted() {
        if (!this._completedTours) return false;
        return Object.values(this._completedTours).some(v => v === true);
    },

    // ===== Overlay & Tooltip =====

    createOverlay() {
        this.destroy();

        this.overlay = document.createElement('div');
        this.overlay.className = 'tour-overlay';
        this.overlay.innerHTML = `
            <svg class="tour-spotlight-svg" width="100%" height="100%">
                <defs>
                    <mask id="tourSpotlightMask">
                        <rect width="100%" height="100%" fill="white"/>
                        <rect id="tourSpotlightHole" rx="16" ry="16" fill="black"/>
                    </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(0,0,0,0.72)" mask="url(#tourSpotlightMask)"/>
            </svg>
        `;
        document.body.appendChild(this.overlay);

        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tour-tooltip';
        document.body.appendChild(this.tooltip);
    },

    // ===== Step Rendering =====

    _renderTooltipContent(step, index) {
        const isModal = step.type === 'welcome' || step.type === 'finish' || step.type === 'modal';
        const totalSteps = this.steps.length;

        let navHTML = '';
        if (step.type === 'welcome') {
            navHTML = `
                <div class="tour-nav">
                    <button class="tour-btn tour-btn-skip" onclick="OnboardingTour.skip()">
                        ${t('tour.skip')}
                    </button>
                    <button class="tour-btn tour-btn-primary" onclick="OnboardingTour.next()">
                        ${t('tour.start_tour')} <i class="fas fa-arrow-right"></i>
                    </button>
                </div>`;
        } else if (step.type === 'finish') {
            navHTML = `
                <div class="tour-nav">
                    <button class="tour-btn tour-btn-primary tour-btn-finish" onclick="OnboardingTour.finish()">
                        ${t('tour.got_it')} <i class="fas fa-check"></i>
                    </button>
                </div>`;
        } else if (step.type === 'modal') {
            // Single modal step — show Got It
            navHTML = `
                <div class="tour-nav">
                    <button class="tour-btn tour-btn-skip" onclick="OnboardingTour.skip()">
                        ${t('tour.skip')}
                    </button>
                    <button class="tour-btn tour-btn-primary" onclick="OnboardingTour.next()">
                        ${t('tour.got_it')} <i class="fas fa-arrow-right"></i>
                    </button>
                </div>`;
        } else {
            navHTML = `
                <div class="tour-nav">
                    <button class="tour-btn tour-btn-back" onclick="OnboardingTour.prev()" ${index <= 0 || this.steps[index - 1]?.type === 'welcome' ? 'style="visibility:hidden"' : ''}>
                        <i class="fas fa-arrow-left"></i> ${t('tour.back')}
                    </button>
                    <div class="tour-progress-dots">
                        ${this.steps.map((_, i) => `<span class="tour-dot ${i === index ? 'active' : ''} ${i < index ? 'done' : ''}"></span>`).join('')}
                    </div>
                    <button class="tour-btn tour-btn-primary" onclick="OnboardingTour.next()">
                        ${t('tour.next')} <i class="fas fa-arrow-right"></i>
                    </button>
                </div>
                <div class="tour-swipe-hint">
                    <i class="fas fa-hand-point-left"></i> ${t('tour.swipe_hint')} <i class="fas fa-hand-point-right"></i>
                </div>`;
        }

        const stepCounter = !isModal ? `<span class="tour-step-counter">${index}/${totalSteps - 1}</span>` : '';

        this.tooltip.innerHTML = `
            <div class="tour-tooltip-inner ${isModal ? 'tour-modal-mode' : ''}">
                <div class="tour-icon-circle">
                    <i class="fas ${step.icon}"></i>
                </div>
                ${stepCounter}
                <h3 class="tour-title">${step.title}</h3>
                <p class="tour-desc">${step.description}</p>
                ${navHTML}
            </div>
        `;
    },

    showStep(index) {
        const step = this.steps[index];
        if (!step) return;

        const isModal = step.type === 'welcome' || step.type === 'finish' || step.type === 'modal';

        this.tooltip.classList.remove('tour-visible');
        this._renderTooltipContent(step, index);

        if (isModal) {
            this.hideSpotlight();
            this.tooltip.classList.remove('tour-arrow-top', 'tour-arrow-bottom');
            this.tooltip.classList.add('tour-center');
            this.tooltip.style.top = '';
            this.tooltip.style.left = '';
            this._revealTooltip();
        } else {
            const el = document.querySelector(step.selector);
            if (el) {
                const isFixed = this._isFixedElement(el);
                if (isFixed) {
                    this.positionSpotlight(el);
                    this.positionTooltip(el, step.position);
                    this._revealTooltip();
                } else {
                    this._scrollToElement(el, () => {
                        this.positionSpotlight(el);
                        this.positionTooltip(el, step.position);
                        this._revealTooltip();
                    });
                }
            } else {
                // Element not found — show as modal fallback
                this.hideSpotlight();
                this.tooltip.classList.remove('tour-arrow-top', 'tour-arrow-bottom');
                this.tooltip.classList.add('tour-center');
                this.tooltip.style.top = '';
                this.tooltip.style.left = '';
                this._revealTooltip();
            }
        }
    },

    _isFixedElement(el) {
        let node = el;
        while (node && node !== document.body) {
            if (getComputedStyle(node).position === 'fixed') return true;
            node = node.parentElement;
        }
        return false;
    },

    _revealTooltip() {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (this.tooltip) this.tooltip.classList.add('tour-visible');
            });
        });
    },

    // ===== Scroll & Position =====

    _scrollToElement(el, cb) {
        this._scrollEndCalled = false;
        clearTimeout(this._scrollEndTimer);

        const done = () => {
            if (this._scrollEndCalled) return;
            this._scrollEndCalled = true;
            clearTimeout(this._scrollEndTimer);
            window.removeEventListener('scroll', onScroll);
            requestAnimationFrame(() => cb());
        };

        let scrollTimer;
        const onScroll = () => {
            clearTimeout(scrollTimer);
            scrollTimer = setTimeout(done, 120);
        };
        window.addEventListener('scroll', onScroll);
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        this._scrollEndTimer = setTimeout(done, 500);
    },

    positionSpotlight(el) {
        const rect = el.getBoundingClientRect();
        const padding = window.innerWidth <= 375 ? 4 : 8;
        const hole = document.getElementById('tourSpotlightHole');
        if (hole) {
            hole.setAttribute('x', rect.left - padding);
            hole.setAttribute('y', rect.top - padding);
            hole.setAttribute('width', rect.width + padding * 2);
            hole.setAttribute('height', rect.height + padding * 2);
        }
        this.overlay.classList.add('tour-spotlight-active');
    },

    hideSpotlight() {
        const hole = document.getElementById('tourSpotlightHole');
        if (hole) {
            hole.setAttribute('x', 0);
            hole.setAttribute('y', 0);
            hole.setAttribute('width', 0);
            hole.setAttribute('height', 0);
        }
        this.overlay.classList.remove('tour-spotlight-active');
    },

    positionTooltip(el, preferredPosition) {
        const rect = el.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const edgePadding = vw <= 375 ? 6 : 12;
        const gap = vw <= 375 ? 10 : 14;

        this.tooltip.classList.remove('tour-arrow-top', 'tour-arrow-bottom', 'tour-center');
        this.tooltip.style.top = '-9999px';
        this.tooltip.style.left = '0px';

        const tooltipW = this.tooltip.offsetWidth;
        const tooltipH = this.tooltip.offsetHeight;

        const spaceAbove = rect.top - gap;
        const spaceBelow = vh - rect.bottom - gap;

        let position = preferredPosition || 'bottom';
        if (position === 'bottom' && spaceBelow < tooltipH && spaceAbove > spaceBelow) {
            position = 'top';
        } else if (position === 'top' && spaceAbove < tooltipH && spaceBelow > spaceAbove) {
            position = 'bottom';
        }

        let top, left;
        if (position === 'top') {
            top = rect.top - tooltipH - gap;
            this.tooltip.classList.add('tour-arrow-bottom');
        } else {
            top = rect.bottom + gap;
            this.tooltip.classList.add('tour-arrow-top');
        }

        left = rect.left + rect.width / 2 - tooltipW / 2;
        left = Math.max(edgePadding, Math.min(left, vw - tooltipW - edgePadding));
        top = Math.max(edgePadding, Math.min(top, vh - tooltipH - edgePadding));

        const targetCenterX = rect.left + rect.width / 2;
        const arrowLeft = targetCenterX - left;
        const clampedArrowLeft = Math.max(24, Math.min(arrowLeft, tooltipW - 24));
        this.tooltip.style.setProperty('--tour-arrow-left', clampedArrowLeft + 'px');

        this.tooltip.style.top = top + 'px';
        this.tooltip.style.left = left + 'px';
    },

    // ===== Navigation =====

    next() {
        if (this.currentStep < this.steps.length - 1) {
            this.currentStep++;
            this.showStep(this.currentStep);
        }
    },

    prev() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    },

    skip() {
        this.finish();
    },

    async finish() {
        this.destroy();
        this.unbindEvents();
        this.isActive = false;

        const pageName = this.currentPage;
        this.currentPage = null;

        // Always update local cache first (prevents re-showing in same session)
        if (this._completedTours && pageName) {
            this._completedTours[pageName] = true;
        }

        // Also persist to localStorage as backup (survives refresh even if Firestore fails)
        if (pageName) {
            try {
                const lsKey = 'synawatch_tours_completed';
                const stored = JSON.parse(localStorage.getItem(lsKey) || '{}');
                stored[pageName] = true;
                localStorage.setItem(lsKey, JSON.stringify(stored));
            } catch (_) {}
        }

        // Save to Firestore (use merge to create toursCompleted map if it doesn't exist)
        try {
            const user = auth?.currentUser;
            if (user && db && pageName) {
                const update = {};
                update[`toursCompleted.${pageName}`] = true;
                await db.collection('users').doc(user.uid).set(update, { merge: true });
                console.log(`[OnboardingTour] Tour "${pageName}" completed`);
            }
        } catch (e) {
            console.error('[OnboardingTour] Error saving tour status:', e);
            // Tour won't re-show because localStorage + cache already have it
        }
    },

    // ===== Events =====

    bindEvents() {
        this._resizeHandler = () => {
            if (!this.isActive) return;
            clearTimeout(this._resizeTimeout);
            this._resizeTimeout = setTimeout(() => {
                const step = this.steps[this.currentStep];
                if (step && !step.type) {
                    const el = document.querySelector(step.selector);
                    if (el) {
                        this.positionSpotlight(el);
                        this.positionTooltip(el, step.position);
                    }
                }
            }, 200);
        };
        window.addEventListener('resize', this._resizeHandler);
        window.addEventListener('orientationchange', this._resizeHandler);

        this._onTouchStart = (e) => this._handleTouchStart(e);
        this._onTouchEnd = (e) => this._handleTouchEnd(e);
        document.addEventListener('touchstart', this._onTouchStart, { passive: true });
        document.addEventListener('touchend', this._onTouchEnd, { passive: true });
    },

    unbindEvents() {
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            window.removeEventListener('orientationchange', this._resizeHandler);
            this._resizeHandler = null;
        }
        if (this._onTouchStart) {
            document.removeEventListener('touchstart', this._onTouchStart);
            document.removeEventListener('touchend', this._onTouchEnd);
            this._onTouchStart = null;
            this._onTouchEnd = null;
        }
    },

    _handleTouchStart(e) {
        if (!this.isActive) return;
        this._touchStartX = e.touches[0].clientX;
        this._touchStartY = e.touches[0].clientY;
    },

    _handleTouchEnd(e) {
        if (!this.isActive) return;
        const dx = e.changedTouches[0].clientX - this._touchStartX;
        const dy = e.changedTouches[0].clientY - this._touchStartY;

        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            const step = this.steps[this.currentStep];
            const isModal = step?.type === 'welcome' || step?.type === 'finish' || step?.type === 'modal';
            if (!isModal) {
                dx < 0 ? this.next() : this.prev();
            }
        }
    },

    // ===== Cleanup =====

    destroy() {
        if (this.overlay) { this.overlay.remove(); this.overlay = null; }
        if (this.tooltip) { this.tooltip.remove(); this.tooltip = null; }
    }
};

window.OnboardingTour = OnboardingTour;
