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

    // ========== INITIALIZATION ==========

    async init() {
        this.showLoading();
        try {
            await Promise.all([this.fetchAllPoses(), this.fetchCategories()]);
            // Yogism enrichment - non-blocking, graceful degradation
            try {
                await this.fetchYogismPoses();
                this.mergePoses();
            } catch (e) {
                console.warn('Yogism enrichment skipped:', e.message);
            }
            this.renderPoses(this.poses);
            this.setupEventListeners();
        } catch (error) {
            console.error('Yoga Module init error:', error);
            this.showError('Gagal memuat data yoga. Periksa koneksi internet Anda.');
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

        // Extract poses from nested structure
        this.yogismPoses = [];
        const sections = [...(data.featured || []), ...(data['yoga-flow'] || [])];
        sections.forEach(section => {
            if (section.scheduled) {
                section.scheduled.forEach(pose => {
                    // Avoid duplicates by english_name
                    const exists = this.yogismPoses.some(p =>
                        p.english_name.toLowerCase() === pose.english_name.toLowerCase()
                    );
                    if (!exists) {
                        this.yogismPoses.push(pose);
                    }
                });
            }
        });

        this.setCache(this.CACHE_YOGISM_KEY, this.yogismPoses);
    },

    normalizeName(name) {
        return (name || '').toLowerCase()
            .replace(/\s*pose\s*$/i, '')
            .replace(/^the\s+/i, '')
            .trim();
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
            searchInput.addEventListener('input', () => {
                clearTimeout(this.debounceTimer);
                this.debounceTimer = setTimeout(() => {
                    this.currentFilter.search = searchInput.value.trim();
                    this.applyFilters();
                }, 300);
            });
        }

        document.querySelectorAll('.yoga-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.yoga-filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter.difficulty = btn.dataset.level;
                this.applyFilters();
            });
        });

        const categorySelect = document.getElementById('yogaCategoryFilter');
        if (categorySelect) {
            // Populate categories
            this.categories.forEach(cat => {
                const option = document.createElement('option');
                option.value = cat.category_name;
                option.textContent = cat.category_name;
                categorySelect.appendChild(option);
            });

            categorySelect.addEventListener('change', () => {
                this.currentFilter.category = categorySelect.value;
                this.applyFilters();
            });
        }

        // Escape key closes detail
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeDetail();
        });
    },

    // ========== FILTERING ==========

    applyFilters() {
        let filtered = [...this.poses];
        const { difficulty, category, search } = this.currentFilter;

        if (search) {
            const q = search.toLowerCase();
            filtered = filtered.filter(p =>
                p.english_name.toLowerCase().includes(q) ||
                p.sanskrit_name_adapted.toLowerCase().includes(q) ||
                p.sanskrit_name.toLowerCase().includes(q)
            );
        }

        if (difficulty !== 'all') {
            const map = { pemula: 'Beginner', menengah: 'Intermediate', ahli: 'Expert' };
            filtered = filtered.filter(p =>
                p.difficulty_level.toLowerCase() === (map[difficulty] || '').toLowerCase()
            );
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
            'expert': 'Ahli'
        };
        return map[(level || '').toLowerCase()] || level;
    },

    getDifficultyClass(level) {
        const map = {
            'beginner': 'beginner',
            'intermediate': 'intermediate',
            'expert': 'expert'
        };
        return map[(level || '').toLowerCase()] || 'beginner';
    },

    renderPoses(poses) {
        const container = document.getElementById('yogaResults');
        if (!container) return;

        if (!poses || poses.length === 0) {
            this.showEmpty();
            return;
        }

        const cards = poses.map(pose => `
            <div class="yoga-pose-card" tabindex="0" role="button"
                 onclick="YogaModule.showDetail(${pose.id})"
                 onkeydown="if(event.key==='Enter') YogaModule.showDetail(${pose.id})">
                <div class="yoga-pose-img-wrapper">
                    <img class="yoga-pose-img"
                         src="${pose.url_svg}"
                         alt="${pose.english_name}"
                         loading="lazy"
                         onerror="this.onerror=null; this.src='${pose.url_png}';">
                </div>
                <div class="yoga-pose-info">
                    <h4 class="yoga-pose-name">${pose.english_name}</h4>
                    <p class="yoga-pose-sanskrit">${pose.sanskrit_name_adapted}</p>
                    <span class="yoga-difficulty-badge ${this.getDifficultyClass(pose.difficulty_level)}">
                        ${this.getDifficultyLabel(pose.difficulty_level)}
                    </span>
                </div>
            </div>
        `).join('');

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
                        <img src="${pose.url_svg}" alt="${pose.english_name}"
                             onerror="this.onerror=null; this.src='${pose.url_png}';">
                    </div>

                    <div class="yoga-detail-header">
                        <h2 class="yoga-detail-name">${pose.english_name}</h2>
                        <p class="yoga-detail-sanskrit">${pose.sanskrit_name_adapted} &bull; ${pose.sanskrit_name}</p>
                        <p class="yoga-detail-translation">${pose.translation_name}</p>
                        <div class="yoga-detail-badges">
                            <span class="yoga-difficulty-badge ${this.getDifficultyClass(pose.difficulty_level)}">
                                ${this.getDifficultyLabel(pose.difficulty_level)}
                            </span>
                            ${categoryTags}
                            ${pose.enriched ? '<span class="yoga-enriched-badge"><i class="fas fa-star"></i> Data Lengkap</span>' : ''}
                        </div>
                    </div>

                    ${metaHtml}

                    <div class="yoga-detail-section">
                        <h3><i class="fas fa-list-ol"></i> Cara Melakukan</h3>
                        <p>${pose.pose_description}</p>
                    </div>

                    ${stepsHtml}

                    <div class="yoga-detail-section">
                        <h3><i class="fas fa-heart"></i> Manfaat</h3>
                        <p>${pose.pose_benefits}</p>
                    </div>

                    ${variationsHtml}

                    <button class="btn btn-primary btn-block" onclick="YogaModule.closeDetail()" style="margin-top: 20px;">
                        <i class="fas fa-arrow-left"></i> Kembali ke Daftar Pose
                    </button>
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
                window.scrollTo(0, this.savedScrollY);
            }, 300);
        } else {
            detailContainer.style.display = 'none';
            detailContainer.innerHTML = '';
            document.body.style.overflow = '';
        }
    }
};

window.YogaModule = YogaModule;
