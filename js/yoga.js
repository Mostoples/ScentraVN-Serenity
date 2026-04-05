/**
 * SynaWatch - Yoga Studio Module
 * Browse, search, and explore yoga poses for wellness
 * Data from: https://yoga-api-nzy4.onrender.com/v1
 */

const YogaModule = {
    poses: [],
    categories: [],
    categoryMap: {},
    currentFilter: { difficulty: 'all', category: 'all', search: '' },
    isLoading: false,
    savedScrollY: 0,
    debounceTimer: null,

    API_BASE: 'https://yoga-api-nzy4.onrender.com/v1',
    YOGISM_API: 'https://priyangsubanerjee.github.io/yogism/yogism-api.json',
    CACHE_KEY: 'synawatch_yoga_poses',
    CACHE_CAT_KEY: 'synawatch_yoga_categories',
    CACHE_YOGISM_KEY: 'synawatch_yoga_yogism',
    CACHE_TTL: 24 * 60 * 60 * 1000, // 24 hours
    yogismPoses: [],

    // ── Session tracking ───────────────────────────────────────
    activeSession: null,

    // ========== INITIALIZATION ==========

    async init() {
        if (this.isLoading) return;
        this.isLoading = true;
        this.currentFilter = { difficulty: 'all', category: 'all', search: '' };
        this.showLoading();

        try {
            // Retry up to 2 times for cold-start APIs
            let retries = 2;
            while (retries >= 0) {
                try {
                    await Promise.all([this.fetchAllPoses(), this.fetchCategories()]);
                    break;
                } catch (e) {
                    if (retries === 0) throw e;
                    retries--;
                    console.warn(`Yoga API retry (${2 - retries}/2)...`);
                    await new Promise(r => setTimeout(r, 3000));
                }
            }

            // Yogism enrichment - non-blocking
            try {
                await this.fetchYogismPoses();
                this.mergePoses();
            } catch (e) {
                console.warn('Yogism enrichment skipped:', e.message);
            }

            this.renderPoses(this.poses);
            this.setupEventListeners();

            // Auto-apply biometric filter jika sensor aktif
            setTimeout(() => {
                const ctx = this.getBiometricContext();
                if (ctx.hasSensor && (ctx.stress > 0 || ctx.hr > 0)) {
                    this.applyBiometricFilter(null); // auto-detect mode
                }
            }, 300);
        } catch (error) {
            console.error('Yoga Module init error:', error);
            this.showError('Gagal memuat data yoga. API mungkin sedang cold-start.');
        } finally {
            this.isLoading = false;
        }
    },

    // ========== DATA FETCHING ==========

    async fetchAllPoses() {
        // Check cache first
        const cached = this.getCache(this.CACHE_KEY);
        if (cached) {
            this.poses = cached;
            return;
        }

        const response = await fetch(`${this.API_BASE}/poses`);
        if (!response.ok) throw new Error('Gagal memuat data pose');
        this.poses = await response.json();
        this.setCache(this.CACHE_KEY, this.poses);
    },

    async fetchCategories() {
        const cached = this.getCache(this.CACHE_CAT_KEY);
        if (cached) {
            this.categories = cached;
            this.buildCategoryMap();
            return;
        }

        const response = await fetch(`${this.API_BASE}/categories`);
        if (!response.ok) throw new Error('Gagal memuat kategori');
        this.categories = await response.json();
        this.setCache(this.CACHE_CAT_KEY, this.categories);
        this.buildCategoryMap();
    },

    buildCategoryMap() {
        this.categoryMap = {};
        this.categories.forEach(cat => {
            if (cat.poses) {
                cat.poses.forEach(pose => {
                    if (!this.categoryMap[pose.id]) {
                        this.categoryMap[pose.id] = [];
                    }
                    this.categoryMap[pose.id].push(cat.category_name);
                });
            }
        });
    },

    async fetchYogismPoses() {
        const cached = this.getCache(this.CACHE_YOGISM_KEY);
        if (cached) {
            this.yogismPoses = cached;
            return;
        }

        const response = await fetch(this.YOGISM_API);
        if (!response.ok) throw new Error('Gagal memuat data Yogism');
        const data = await response.json();

        // Extract poses from ALL sections (not just featured + yoga-flow)
        this.yogismPoses = [];
        const sectionKeys = ['featured', 'yoga-flow', 'yoga-styles', 'yoga-levels', 'life-style-yoga', 'body_fitness_yoga'];
        sectionKeys.forEach(key => {
            const sections = data[key] || [];
            sections.forEach(section => {
                if (section.scheduled) {
                    section.scheduled.forEach(pose => {
                        if (!pose.english_name) return;
                        const exists = this.yogismPoses.some(p =>
                            p.english_name.toLowerCase() === pose.english_name.toLowerCase()
                        );
                        if (!exists) {
                            this.yogismPoses.push(pose);
                        }
                    });
                }
            });
        });

        this.setCache(this.CACHE_YOGISM_KEY, this.yogismPoses);
    },

    normalizeName(name) {
        return (name || '').toLowerCase()
            .replace(/\s*pose\s*$/i, '')
            .replace(/^the\s+/i, '')
            .trim();
    },

    /**
     * Yogism uses category: Beginner | Intermediate | Advanced.
     * We map to difficulty_level so level filters match (Advanced → Expert for labels/CSS).
     */
    mapYogismCategoryToDifficulty(category) {
        const c = (category || '').trim().toLowerCase();
        if (c === 'beginner') return 'Beginner';
        if (c === 'intermediate') return 'Intermediate';
        if (c === 'advanced') return 'Expert';
        return null;
    },

    mergePoses() {
        if (!this.yogismPoses.length) return;

        this.poses.forEach(pose => {
            const name1 = this.normalizeName(pose.english_name);
            const match = this.yogismPoses.find(yp => {
                const name2 = this.normalizeName(yp.english_name);
                return name1 === name2 || name1.includes(name2) || name2.includes(name1);
            });

            if (match) {
                pose.steps = match.steps || null;
                pose.variations = match.variations || null;
                pose.duration = match.time || null;
                pose.target = match.target || null;
                pose.enriched = true;
                // Main yoga API has no difficulty_level; take level from Yogism when possible
                const fromYogism = this.mapYogismCategoryToDifficulty(match.category);
                if (!pose.difficulty_level && fromYogism) {
                    pose.difficulty_level = fromYogism;
                }
            } else {
                pose.steps = null;
                pose.variations = null;
                pose.duration = null;
                pose.target = null;
                pose.enriched = false;
            }
        });
    },

    // ========== CACHE HELPERS ==========

    getCache(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const { data, timestamp } = JSON.parse(raw);
            if (Date.now() - timestamp > this.CACHE_TTL) {
                localStorage.removeItem(key);
                return null;
            }
            return data;
        } catch (e) {
            return null;
        }
    },

    setCache(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
        } catch (e) {
            console.warn('Cache write failed:', e);
        }
    },

    // ========== EVENT LISTENERS ==========

    setupEventListeners() {
        const searchInput = document.getElementById('yogaSearch');
        if (searchInput) {
            // Property assignment so re-init / "Coba Lagi" does not stack listeners
            searchInput.oninput = () => {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.currentFilter.search = searchInput.value.trim();
                    this.applyFilters();
                }, 300);
            };
        }

        document.querySelectorAll('.yoga-filter-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.yoga-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter.difficulty = btn.dataset.level || 'all';
                this.applyFilters();
            };
        });

        const categorySelect = document.getElementById('yogaCategoryFilter');
        if (categorySelect) {
            // Rebuild options every init so categories never duplicate (retry / re-enter route)
            categorySelect.innerHTML = `<option value="all">${t('yoga.all_categories')}</option>`;
            this.categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.category_name;
                option.textContent = cat.category_name;
                categorySelect.appendChild(option);
            });

            categorySelect.onchange = () => {
                this.currentFilter.category = categorySelect.value;
                this.applyFilters();
            };
        }

        // Escape key closes detail (one global listener is ok; guard duplicate)
        if (!this._escapeHandlerBound) {
            this._escapeHandlerBound = true;
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.closeDetail();
            });
        }
    },

    // ========== FILTERING ==========

    applyFilters() {
        let filtered = [...this.poses];
        const { difficulty, category, search } = this.currentFilter;

        if (search) {
            const q = search.toLowerCase();
            filtered = filtered.filter(p =>
                (p.english_name || '').toLowerCase().includes(q) ||
                (p.sanskrit_name_adapted || '').toLowerCase().includes(q) ||
                (p.sanskrit_name || '').toLowerCase().includes(q)
            );
        }

        // difficulty_level comes from Yogism merge (main API omits it). Unknown = only in "Semua".
        if (difficulty !== 'all') {
            const map = {
                pemula: ['beginner'],
                menengah: ['intermediate'],
                ahli: ['expert', 'advanced']
            };
            const targets = map[difficulty] || [];
            filtered = filtered.filter(p => {
                const d = (p.difficulty_level || '').toString().trim().toLowerCase();
                return targets.includes(d);
            });
        }

        if (category !== 'all') {
            filtered = filtered.filter(p => {
                const cats = this.categoryMap[p.id] || [];
                return cats.includes(category);
            });
        }

        this.renderPoses(filtered);
    },

    // ========== RENDERING ==========

    showLoading() {
        const container = document.getElementById('yogaResults');
        if (!container) return;
        let skeletons = '';
        for (let i = 0; i < 6; i++) {
            skeletons += `
                <div class="yoga-pose-card yoga-skeleton">
                    <div class="yoga-skeleton-img"></div>
                    <div class="yoga-skeleton-text"></div>
                    <div class="yoga-skeleton-text short"></div>
                </div>
            `;
        }
        container.innerHTML = `<div class="yoga-grid">${skeletons}</div>`;
    },

    showError(message) {
        const container = document.getElementById('yogaResults');
        if (!container) return;
        container.innerHTML = `
            <div class="yoga-empty-state">
                <i class="fas fa-exclamation-triangle" style="font-size: 2.5rem; color: var(--warning-500); margin-bottom: 12px;"></i>
                <p style="font-size: 1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">${message}</p>
                <p style="font-size: 0.85rem; color: var(--text-tertiary); margin-bottom: 16px;">API mungkin sedang cold-start, coba lagi dalam beberapa detik.</p>
                <button class="btn btn-primary btn-sm" onclick="YogaModule.init()">
                    <i class="fas fa-redo"></i> Coba Lagi
                </button>
            </div>
        `;
    },

    showEmpty() {
        const container = document.getElementById('yogaResults');
        if (!container) return;
        container.innerHTML = `
            <div class="yoga-empty-state">
                <i class="fas fa-spa" style="font-size: 2.5rem; color: var(--text-tertiary); margin-bottom: 12px;"></i>
                <p style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">Tidak ada pose yang cocok</p>
                <p style="font-size: 0.85rem; color: var(--text-tertiary);">Coba ubah kata kunci atau filter pencarian.</p>
            </div>
        `;
    },

    getDifficultyLabel(level) {
        const map = {
            'beginner': 'Pemula',
            'intermediate': 'Menengah',
            'expert': 'Ahli',
            'advanced': 'Ahli'
        };
        const key = (level || '').toString().trim().toLowerCase();
        return map[key] || (level ? String(level) : '—');
    },

    getDifficultyClass(level) {
        const key = (level || '').toString().trim().toLowerCase();
        if (!key) return 'unknown';
        const map = {
            'beginner': 'beginner',
            'intermediate': 'intermediate',
            'expert': 'expert',
            'advanced': 'expert'
        };
        return map[key] || 'unknown';
    },

    renderPoses(poses) {
        const container = document.getElementById('yogaResults');
        if (!container) return;

        if (!poses || poses.length === 0) {
            this.showEmpty();
            return;
        }

        const cards = poses.map(pose => {
            const imgSrc = pose.url_svg || pose.url_png || '';
            const fallbackSrc = pose.url_png || pose.url_svg || '';
            return `
            <div class="yoga-pose-card" tabindex="0" role="button"
                 onclick="YogaModule.showDetail(${pose.id})"
                 onkeydown="if(event.key==='Enter') YogaModule.showDetail(${pose.id})">
                <div class="yoga-pose-img-wrapper">
                    ${imgSrc ? `
                    <img class="yoga-pose-img"
                         src="${imgSrc}"
                         alt="${pose.english_name || ''}"
                         loading="lazy"
                         onerror="this.onerror=null; this.src='${fallbackSrc}';">
                    ` : `
                    <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--text-tertiary);font-size:2rem;">
                        <i class="fas fa-spa"></i>
                    </div>
                    `}
                </div>
                <div class="yoga-pose-info">
                    <h4 class="yoga-pose-name">${pose.english_name || 'Pose'}</h4>
                    <p class="yoga-pose-sanskrit">${pose.sanskrit_name_adapted || ''}</p>
                    <span class="yoga-difficulty-badge ${this.getDifficultyClass(pose.difficulty_level)}">
                        ${this.getDifficultyLabel(pose.difficulty_level)}
                    </span>
                </div>
            </div>
        `}).join('');

        container.innerHTML = `<div class="yoga-grid">${cards}</div>`;
    },

    // ========== DETAIL VIEW ==========

    showDetail(poseId) {
        const pose = this.poses.find(p => p.id === poseId);
        if (!pose) return;

        this.savedScrollY = window.scrollY;

        const categories = this.categoryMap[poseId] || [];
        const categoryTags = categories.map(c =>
            `<span class="yoga-category-tag">${c}</span>`
        ).join('');

        const detailContainer = document.getElementById('yogaPoseDetail');
        if (!detailContainer) return;

        // Build meta pills (duration & target from Yogism)
        let metaHtml = '';
        if (pose.duration || pose.target) {
            metaHtml = `<div class="yoga-detail-meta">`;
            if (pose.duration) metaHtml += `<span><i class="fas fa-clock"></i> ${pose.duration}</span>`;
            if (pose.target) metaHtml += `<span><i class="fas fa-bullseye"></i> ${pose.target}</span>`;
            metaHtml += `</div>`;
        }

        // Build steps section (from Yogism enrichment)
        let stepsHtml = '';
        if (pose.steps) {
            const stepLines = pose.steps.split('\n').filter(s => s.trim());
            if (stepLines.length > 0) {
                const stepsItems = stepLines.map(s => `<li>${s.trim()}</li>`).join('');
                stepsHtml = `
                    <div class="yoga-detail-section">
                        <h3><i class="fas fa-shoe-prints"></i> Langkah-Langkah</h3>
                        <ol class="yoga-steps-list">${stepsItems}</ol>
                    </div>
                `;
            }
        }

        // Build variations section (from Yogism enrichment)
        let variationsHtml = '';
        if (pose.variations && pose.variations.trim()) {
            variationsHtml = `
                <div class="yoga-detail-section">
                    <h3><i class="fas fa-random"></i> Variasi</h3>
                    <p>${pose.variations}</p>
                </div>
            `;
        }

        detailContainer.innerHTML = `
            <div class="yoga-detail-overlay" onclick="if(event.target===this) YogaModule.closeDetail()">
                <div class="yoga-detail-panel">
                    <button class="yoga-detail-close" onclick="YogaModule.closeDetail()">
                        <i class="fas fa-times"></i>
                    </button>

                    <div class="yoga-detail-img-wrapper">
                        ${(pose.url_svg || pose.url_png) ? `
                        <img src="${pose.url_svg || pose.url_png}" alt="${pose.english_name || ''}"
                             onerror="this.onerror=null; this.src='${pose.url_png || pose.url_svg || ''}';">
                        ` : `
                        <div style="width:100%;height:200px;display:flex;align-items:center;justify-content:center;color:var(--text-tertiary);font-size:3rem;">
                            <i class="fas fa-spa"></i>
                        </div>
                        `}
                    </div>

                    <div class="yoga-detail-header">
                        <h2 class="yoga-detail-name">${pose.english_name || 'Pose'}</h2>
                        <p class="yoga-detail-sanskrit">${pose.sanskrit_name_adapted || ''} ${pose.sanskrit_name ? '&bull; ' + pose.sanskrit_name : ''}</p>
                        ${pose.translation_name ? `<p class="yoga-detail-translation">${pose.translation_name}</p>` : ''}
                        <div class="yoga-detail-badges">
                            <span class="yoga-difficulty-badge ${this.getDifficultyClass(pose.difficulty_level)}">
                                ${this.getDifficultyLabel(pose.difficulty_level)}
                            </span>
                            ${categoryTags}
                            ${pose.enriched ? '<span class="yoga-enriched-badge"><i class="fas fa-star"></i> Data Lengkap</span>' : ''}
                        </div>
                    </div>

                    ${metaHtml}

                    ${pose.pose_description ? `
                    <div class="yoga-detail-section">
                        <h3><i class="fas fa-list-ol"></i> Cara Melakukan</h3>
                        <p>${pose.pose_description}</p>
                    </div>
                    ` : ''}

                    ${stepsHtml}

                    ${pose.pose_benefits ? `
                    <div class="yoga-detail-section">
                        <h3><i class="fas fa-heart"></i> Manfaat</h3>
                        <p>${pose.pose_benefits}</p>
                    </div>
                    ` : ''}

                    ${variationsHtml}

                    <div style="display:flex;flex-direction:column;gap:10px;margin-top:20px;">
                        <button class="btn btn-primary btn-block"
                                onclick="YogaModule.startSession(${poseId}); this.style.display='none'; document.getElementById('btnEndSession${poseId}').style.display='flex';">
                            <i class="fas fa-play"></i> Mulai Sesi Yoga
                        </button>
                        <button id="btnEndSession${poseId}" class="btn btn-block"
                                style="display:none;background:linear-gradient(135deg,#10b981,#059669);color:white;border:none;border-radius:12px;padding:14px;font-weight:600;cursor:pointer;align-items:center;justify-content:center;gap:8px;"
                                onclick="YogaModule.endSession(null); YogaModule.closeDetail();">
                            <i class="fas fa-stop"></i> Selesai & Simpan Sesi
                        </button>
                        <button class="btn btn-outline btn-block" onclick="YogaModule.closeDetail()" style="color:var(--text-tertiary);">
                            <i class="fas fa-arrow-left"></i> Kembali ke Daftar Pose
                        </button>
                    </div>
                </div>
            </div>
        `;

        detailContainer.style.display = 'block';
        requestAnimationFrame(() => {
            const overlay = detailContainer.querySelector('.yoga-detail-overlay');
            if (overlay) overlay.classList.add('show');
        });

        document.body.style.overflow = 'hidden';
    },

    closeDetail() {
        const detailContainer = document.getElementById('yogaPoseDetail');
        if (!detailContainer) return;

        const overlay = detailContainer.querySelector('.yoga-detail-overlay');
        if (overlay) {
            overlay.classList.remove('show');
            setTimeout(() => {
                detailContainer.style.display = 'none';
                detailContainer.innerHTML = '';
                document.body.style.overflow = '';
                document.body.style.position = '';
                window.scrollTo(0, this.savedScrollY);
            }, 300);
        } else {
            detailContainer.style.display = 'none';
            detailContainer.innerHTML = '';
            document.body.style.overflow = '';
            document.body.style.position = '';
        }
    },

    // ========== BIOMETRIC INTEGRATION ==========

    /**
     * Ambil state sensor terkini dari App/BLEConnection.
     */
    getBiometricContext() {
        const state = (typeof App !== 'undefined' && App.getInterventionState)
            ? App.getInterventionState() : {};
        const sensor = (typeof BLEConnection !== 'undefined' && BLEConnection.isConnected())
            ? BLEConnection.getSensorData() : {};
        return {
            stress:    state.stress  || sensor.stress  || 0,
            hr:        state.hr      || sensor.hr      || 0,
            gsr:       state.gsr     || sensor.gsr     || 0,
            spo2:      sensor.spo2   || 0,
            act:       sensor.act    || 'DIAM',
            finger:    sensor.finger || false,
            hasSensor: BLEConnection?.isConnected() || false
        };
    },

    /**
     * Filter pose berdasarkan kondisi biometrik.
     * mode: 'calm' | 'recovery' | 'energize' | null (auto dari sensor)
     */
    getRecommendedPoses(mode) {
        const ctx = this.getBiometricContext();
        let targetMode = mode;

        if (!targetMode) {
            if (ctx.stress > 70 || ctx.gsr > 65)                     targetMode = 'calm';
            else if (ctx.act === 'LARI' || ctx.act === 'AKTIF')       targetMode = 'recovery';
            else if (ctx.stress < 30 && ctx.hr > 0 && ctx.hr < 75)   targetMode = 'energize';
            else                                                       targetMode = 'balance';
        }

        // Kata kunci manfaat/kategori per mode
        const modeKeywords = {
            calm:     ['calm', 'relax', 'stress', 'anxiety', 'restorative', 'balance', 'grounding'],
            recovery: ['cool', 'stretch', 'relief', 'flexibility', 'recovery', 'gentle', 'forward'],
            energize: ['energi', 'strength', 'backbend', 'inversion', 'power', 'standing'],
            balance:  ['balance', 'core', 'focus', 'standing', 'hip']
        };
        const keywords = modeKeywords[targetMode] || modeKeywords.balance;

        const scored = this.poses.map(pose => {
            const text = [
                pose.pose_benefits || '',
                pose.pose_description || '',
                (this.categoryMap[pose.id] || []).join(' ')
            ].join(' ').toLowerCase();

            const score = keywords.reduce((s, kw) => s + (text.includes(kw) ? 1 : 0), 0);
            return { pose, score };
        });

        return scored
            .filter(x => x.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
            .map(x => x.pose);
    },

    /**
     * Terapkan filter biometrik: render poses + tampilkan banner rekomendasi.
     */
    applyBiometricFilter(mode) {
        const ctx = this.getBiometricContext();
        const recommended = this.getRecommendedPoses(mode);

        const modeInfo = {
            calm:     { label: 'Relaksasi Stres',  icon: 'fa-spa',        color: '#6366f1', desc: `Stres terdeteksi (${ctx.stress}%). Pose berikut membantu menenangkan sistem saraf.` },
            recovery: { label: 'Cool-down',         icon: 'fa-snowflake',  color: '#3b82f6', desc: `Setelah aktivitas tinggi (HR ${ctx.hr} bpm). Pose stretching untuk pemulihan.` },
            energize: { label: 'Energizing',         icon: 'fa-bolt',       color: '#f59e0b', desc: `Kondisi rileks optimal. Saatnya pose yang lebih menantang.` },
            balance:  { label: 'Keseimbangan',       icon: 'fa-yin-yang',   color: '#10b981', desc: 'Pose untuk menjaga keseimbangan tubuh dan pikiran.' }
        };
        const info = modeInfo[mode] || modeInfo.balance;

        // Tampilkan banner biometrik di atas daftar pose
        this._renderBiometricBanner(ctx, info, recommended.length);

        if (recommended.length > 0) {
            this.renderPoses(recommended);
        }
    },

    _renderBiometricBanner(ctx, info, count) {
        const container = document.getElementById('yogaResults');
        if (!container) return;

        const existing = document.getElementById('yogaBiometricBanner');
        if (existing) existing.remove();

        const banner = document.createElement('div');
        banner.id = 'yogaBiometricBanner';
        banner.style.cssText = 'margin-bottom:16px;';

        const sensorBadge = ctx.hasSensor
            ? `<span style="background:rgba(16,185,129,0.12);color:#10b981;padding:3px 10px;border-radius:12px;font-size:0.72rem;font-weight:600;"><i class="fas fa-broadcast-tower"></i> Sensor Aktif</span>`
            : `<span style="background:rgba(156,163,175,0.12);color:#9ca3af;padding:3px 10px;border-radius:12px;font-size:0.72rem;font-weight:600;"><i class="fas fa-unlink"></i> Tanpa Sensor</span>`;

        banner.innerHTML = `
            <div class="card" style="padding:14px;border-left:3px solid ${info.color};">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
                    <i class="fas ${info.icon}" style="color:${info.color};"></i>
                    <span style="font-weight:700;color:var(--text-primary);font-size:0.9rem;">${info.label}</span>
                    ${sensorBadge}
                </div>
                <p style="font-size:0.8rem;color:var(--text-secondary);margin:0 0 8px;">${info.desc}</p>
                ${ctx.hasSensor ? `
                <div style="display:flex;gap:10px;flex-wrap:wrap;">
                    ${ctx.hr > 0 ? `<span style="font-size:0.75rem;background:rgba(239,68,68,0.1);color:#ef4444;padding:2px 8px;border-radius:8px;"><i class="fas fa-heart"></i> ${ctx.hr} bpm</span>` : ''}
                    ${ctx.stress > 0 ? `<span style="font-size:0.75rem;background:rgba(99,102,241,0.1);color:#6366f1;padding:2px 8px;border-radius:8px;"><i class="fas fa-brain"></i> Stres ${ctx.stress}%</span>` : ''}
                    ${ctx.gsr > 0 ? `<span style="font-size:0.75rem;background:rgba(245,158,11,0.1);color:#f59e0b;padding:2px 8px;border-radius:8px;"><i class="fas fa-bolt"></i> GSR ${ctx.gsr}%</span>` : ''}
                </div>` : ''}
                <button onclick="YogaModule._resetBiometricFilter()" style="margin-top:8px;font-size:0.72rem;background:transparent;border:none;color:var(--text-tertiary);cursor:pointer;padding:0;">
                    <i class="fas fa-times"></i> Tampilkan semua pose
                </button>
            </div>
        `;

        container.parentNode.insertBefore(banner, container);
    },

    _resetBiometricFilter() {
        const banner = document.getElementById('yogaBiometricBanner');
        if (banner) banner.remove();
        this.applyFilters();
    },

    // ========== SESSION TRACKING ==========

    /**
     * Mulai sesi yoga untuk pose tertentu — catat biometrik awal.
     */
    startSession(poseId) {
        const pose = this.poses.find(p => p.id === poseId);
        if (!pose) return;

        const ctx = this.getBiometricContext();
        this.activeSession = {
            poseId,
            poseName: pose.english_name || 'Unknown',
            startTime: Date.now(),
            initialBiometrics: {
                hr: ctx.hr, gsr: ctx.gsr, stress: ctx.stress, spo2: ctx.spo2
            }
        };
        console.log('[YogaModule] Session started:', this.activeSession.poseName);
    },

    /**
     * Akhiri sesi yoga — hitung delta biometrik dan simpan ke Firestore.
     */
    async endSession(userRating) {
        if (!this.activeSession) return;

        const ctx = this.getBiometricContext();
        const duration = Math.round((Date.now() - this.activeSession.startTime) / 1000); // detik

        const session = {
            ...this.activeSession,
            endTime: Date.now(),
            duration,
            finalBiometrics: {
                hr: ctx.hr, gsr: ctx.gsr, stress: ctx.stress, spo2: ctx.spo2
            },
            hrDelta:     ctx.hr     - this.activeSession.initialBiometrics.hr,
            stressDelta: ctx.stress - this.activeSession.initialBiometrics.stress,
            gsrDelta:    ctx.gsr    - this.activeSession.initialBiometrics.gsr,
            userRating:  userRating || null
        };

        this.activeSession = null;

        await this._saveSessionToFirestore(session);
        this._showSessionResult(session);
    },

    async _saveSessionToFirestore(session) {
        if (typeof firebase === 'undefined' || !auth?.currentUser) return;
        try {
            await db.collection('yogaSessions').add({
                userId:            auth.currentUser.uid,
                poseId:            session.poseId,
                poseName:          session.poseName,
                duration:          session.duration,
                initialBiometrics: session.initialBiometrics,
                finalBiometrics:   session.finalBiometrics,
                hrDelta:           session.hrDelta,
                stressDelta:       session.stressDelta,
                gsrDelta:          session.gsrDelta,
                userRating:        session.userRating,
                timestamp:         firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('[YogaModule] Session saved to Firestore');
        } catch (e) {
            console.warn('[YogaModule] Save session error:', e);
        }
    },

    _showSessionResult(session) {
        const stressChange = session.stressDelta;
        const improved = stressChange < -3;
        const icon  = improved ? 'fa-smile' : 'fa-check-circle';
        const color = improved ? '#10b981' : '#6366f1';
        const msg   = improved
            ? `Stres turun ${Math.abs(stressChange)}% setelah yoga!`
            : `Sesi selesai. Durasi: ${Math.round(session.duration / 60)}m ${session.duration % 60}s.`;

        if (typeof Utils !== 'undefined') {
            Utils.showToast(`✅ ${msg}`, 'success', 4000);
        }
    },

    // ========== CLEANUP ==========
    destroy() {
        this.closeDetail();
        this.poses = [];
        this.categories = [];
        this.yogismPoses = [];
        this.isLoading = false;
        this.activeSession = null;
        const banner = document.getElementById('yogaBiometricBanner');
        if (banner) banner.remove();
    }
};

window.YogaModule = YogaModule;
