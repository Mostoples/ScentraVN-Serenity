/**
 * SYNAWATCH - 3D Avatar Engine
 * Three.js based avatar with lip sync, blinking, and head tracking
 * Ported from Synaglo Avatar.tsx
 */

const SynachatAvatar = {
    // Three.js objects
    scene: null,
    camera: null,
    renderer: null,
    mixer: null,
    clock: null,

    // Avatar model
    avatar: null,

    // Bone references
    headBone: null,
    leftEyeBone: null,
    rightEyeBone: null,

    // Morph target references
    mouthOpenMesh: null,
    mouthOpenIndex: -1,
    eyeBlinkLeftMesh: null,
    eyeBlinkLeftIndex: -1,
    eyeBlinkRightMesh: null,
    eyeBlinkRightIndex: -1,

    // Animation state
    isSpeaking: false,
    smoothMouthOpen: 0,
    blinkTimer: 3,
    blinkProgress: -1,
    headTargetX: 0,
    headTargetY: 0,
    headCurrentX: 0,
    headCurrentY: 0,
    mouseX: 0,
    mouseY: 0,

    // Constants
    DEG2RAD: Math.PI / 180,
    HEAD_MAX_Y: 15 * (Math.PI / 180),
    HEAD_MAX_X: 10 * (Math.PI / 180),
    HEAD_LERP_SPEED: 0.05,
    BLINK_DURATION: 0.15,
    BLINK_MIN_INTERVAL: 2,
    BLINK_MAX_INTERVAL: 5,

    // Container
    container: null,
    animationId: null,
    isInitialized: false,

    /**
     * Initialize the avatar
     */
    async init(containerId) {
        // Prevent double initialization
        if (this.isInitialized) {
            console.log('SynachatAvatar already initialized, skipping...');
            return true;
        }

        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Avatar container not found:', containerId);
            return false;
        }

        // Check if Three.js is loaded
        if (typeof THREE === 'undefined') {
            console.error('Three.js not loaded');
            return false;
        }

        // Clean up any existing canvas
        const existingCanvas = this.container.querySelector('canvas');
        if (existingCanvas) {
            existingCanvas.remove();
        }

        try {
            // Setup scene
            this.scene = new THREE.Scene();

            // Setup camera
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            this.camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
            this.camera.position.set(0, 1.2, 5);
            this.camera.lookAt(0, 1.2, 0);

            // Setup renderer
            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true
            });
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.1;
            this.renderer.outputEncoding = THREE.sRGBEncoding;
            this.container.appendChild(this.renderer.domElement);

            // Setup clock
            this.clock = new THREE.Clock();

            // Setup lighting (medical/professional theme)
            this.setupLighting();

            // Load avatar model
            await this.loadAvatar();

            // Setup mouse tracking
            this.setupMouseTracking();

            // Setup resize handler
            this.setupResizeHandler();

            // Initialize audio analyser
            if (typeof AudioAnalyser !== 'undefined') {
                AudioAnalyser.init();
            }

            // Start animation loop
            this.animate();

            this.isInitialized = true;
            console.log('SynachatAvatar initialized');
            return true;

        } catch (error) {
            console.error('Error initializing avatar:', error);
            return false;
        }
    },

    /**
     * Setup lighting for medical theme
     */
    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xf0ece6, 0.5);
        this.scene.add(ambientLight);

        // Hemisphere light (ceiling cool, floor warm)
        const hemiLight = new THREE.HemisphereLight(0xe8eaf0, 0xd4c8b0, 0.6);
        this.scene.add(hemiLight);

        // Key light (warm, from right)
        const keyLight = new THREE.DirectionalLight(0xfff5e6, 2.0);
        keyLight.position.set(6, 8, 3);
        keyLight.castShadow = true;
        this.scene.add(keyLight);

        // Fill light (cool, from front-top)
        const fillLight = new THREE.DirectionalLight(0xe0e4ef, 0.8);
        fillLight.position.set(0, 7, 5);
        this.scene.add(fillLight);

        // Rim light (edge separation)
        const rimLight = new THREE.DirectionalLight(0xc8d4f0, 0.5);
        rimLight.position.set(-4, 4, -3);
        this.scene.add(rimLight);

        // Soft fill from left
        const leftFill = new THREE.PointLight(0xe8e0d8, 0.4, 15, 2);
        leftFill.position.set(-5, 2, 2);
        this.scene.add(leftFill);

        // Under-chin fill
        const chinFill = new THREE.PointLight(0xfff0e0, 0.3, 10, 2);
        chinFill.position.set(0, 0.5, 4);
        this.scene.add(chinFill);
    },

    /**
     * Load avatar model and animation
     */
    async loadAvatar() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.GLTFLoader();

            loader.load(
                'models/avatar.glb',
                (gltf) => {
                    this.avatar = gltf.scene;
                    this.avatar.position.set(0, -0.8, 0);
                    this.avatar.scale.set(1.7, 1.7, 1.7);

                    // Setup mixer for animations
                    this.mixer = new THREE.AnimationMixer(this.avatar);

                    // Traverse and cache bone/morph references
                    this.avatar.traverse((obj) => {
                        // Find bones
                        if (obj.isBone) {
                            const name = obj.name.toLowerCase();
                            if (name.includes('head') && !this.headBone) {
                                this.headBone = obj;
                            }
                            if (name.includes('lefteye') || name.includes('eye_l') || name.includes('eye.l')) {
                                this.leftEyeBone = obj;
                            }
                            if (name.includes('righteye') || name.includes('eye_r') || name.includes('eye.r')) {
                                this.rightEyeBone = obj;
                            }
                        }

                        // Find morph targets
                        if (obj.isMesh) {
                            obj.frustumCulled = false;
                            if (obj.material) {
                                obj.material.side = THREE.DoubleSide;
                            }

                            const dict = obj.morphTargetDictionary;
                            if (dict && obj.morphTargetInfluences) {
                                // Find mouth open morph
                                const mouthKey = this.findMorphKey(dict, ['mouthOpen', 'jawOpen', 'viseme_aa']);
                                if (mouthKey && this.mouthOpenIndex === -1) {
                                    this.mouthOpenMesh = obj;
                                    this.mouthOpenIndex = dict[mouthKey];
                                }

                                // Find blink morphs
                                const blinkLeftKey = this.findMorphKey(dict, ['eyeBlinkLeft', 'blink_l']);
                                if (blinkLeftKey && this.eyeBlinkLeftIndex === -1) {
                                    this.eyeBlinkLeftMesh = obj;
                                    this.eyeBlinkLeftIndex = dict[blinkLeftKey];
                                }

                                const blinkRightKey = this.findMorphKey(dict, ['eyeBlinkRight', 'blink_r']);
                                if (blinkRightKey && this.eyeBlinkRightIndex === -1) {
                                    this.eyeBlinkRightMesh = obj;
                                    this.eyeBlinkRightIndex = dict[blinkRightKey];
                                }
                            }
                        }
                    });

                    this.scene.add(this.avatar);

                    // Load idle animation
                    this.loadIdleAnimation().then(resolve).catch(reject);
                },
                (progress) => {
                    // Loading progress
                },
                (error) => {
                    console.error('Error loading avatar:', error);
                    reject(error);
                }
            );
        });
    },

    /**
     * Load idle animation
     */
    async loadIdleAnimation() {
        return new Promise((resolve, reject) => {
            const loader = new THREE.FBXLoader();

            loader.load(
                'models/Idle.fbx',
                (fbx) => {
                    if (fbx.animations.length > 0 && this.mixer) {
                        const action = this.mixer.clipAction(fbx.animations[0]);
                        action.play();
                    }
                    resolve();
                },
                (progress) => {
                    // Loading progress
                },
                (error) => {
                    console.warn('Could not load idle animation:', error);
                    resolve(); // Continue without animation
                }
            );
        });
    },

    /**
     * Find morph target key (case insensitive)
     */
    findMorphKey(dict, searchKeys) {
        for (const search of searchKeys) {
            const found = Object.keys(dict).find(
                k => k.toLowerCase() === search.toLowerCase()
            );
            if (found) return found;
        }
        return null;
    },

    /**
     * Setup mouse tracking
     */
    setupMouseTracking() {
        document.addEventListener('mousemove', (e) => {
            // Convert to NDC (-1 to 1)
            this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        });
    },

    /**
     * Setup resize handler
     */
    setupResizeHandler() {
        const resizeObserver = new ResizeObserver(() => {
            if (!this.container || !this.camera || !this.renderer) return;

            const width = this.container.clientWidth;
            const height = this.container.clientHeight;

            this.camera.aspect = width / height;

            // Adjust camera and avatar based on aspect ratio
            // Side-by-side layout (tablet/desktop) has height > width
            if (height > width * 1.2) {
                // Vertical/tall layout - zoom out a bit and center
                this.camera.position.set(0, 1.1, 4.5);
                this.camera.lookAt(0, 1.1, 0);
                if (this.avatar) {
                    this.avatar.position.set(0, -0.6, 0);
                    this.avatar.scale.set(1.5, 1.5, 1.5);
                }
            } else if (height < width * 0.6) {
                // Very wide/short layout (mobile landscape)
                this.camera.position.set(0, 1.3, 5.5);
                this.camera.lookAt(0, 1.3, 0);
                if (this.avatar) {
                    this.avatar.position.set(0, -0.8, 0);
                    this.avatar.scale.set(1.7, 1.7, 1.7);
                }
            } else {
                // Normal/default layout
                this.camera.position.set(0, 1.2, 5);
                this.camera.lookAt(0, 1.2, 0);
                if (this.avatar) {
                    this.avatar.position.set(0, -0.8, 0);
                    this.avatar.scale.set(1.7, 1.7, 1.7);
                }
            }

            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        });

        resizeObserver.observe(this.container);
    },

    /**
     * Set speaking state
     */
    setSpeaking(speaking) {
        this.isSpeaking = speaking;
    },

    /**
     * Animation loop
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        const delta = this.clock.getDelta();
        const time = this.clock.elapsedTime;

        // Update animation mixer
        if (this.mixer) {
            this.mixer.update(delta);
        }

        // Idle animations
        if (this.avatar) {
            // Gentle body sway
            this.avatar.rotation.y = Math.sin(time * 0.5) * 0.02;
            // Breathing
            this.avatar.position.y = -0.8 + Math.sin(time * 1.5) * 0.003;
        }

        // Lip sync
        this.updateLipSync();

        // Eye blinking
        this.updateBlinking(delta);

        // Head tracking
        this.updateHeadTracking(time);

        // Render
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    },

    /**
     * Update lip sync based on audio volume
     */
    updateLipSync() {
        if (!this.mouthOpenMesh || this.mouthOpenIndex < 0) return;

        let volume = 0;
        if (typeof AudioAnalyser !== 'undefined') {
            volume = AudioAnalyser.getVolume();
        }

        const targetMouth = this.isSpeaking ? Math.min(volume * 1.3, 1) : 0;

        // Smooth the value
        this.smoothMouthOpen = THREE.MathUtils.lerp(
            this.smoothMouthOpen,
            targetMouth,
            0.25
        );

        this.mouthOpenMesh.morphTargetInfluences[this.mouthOpenIndex] = this.smoothMouthOpen;
    },

    /**
     * Update eye blinking
     */
    updateBlinking(delta) {
        this.blinkTimer -= delta;

        // Start blink
        if (this.blinkTimer <= 0 && this.blinkProgress < 0) {
            this.blinkProgress = 0;
        }

        // Process blink
        if (this.blinkProgress >= 0) {
            this.blinkProgress += delta;

            // Triangle wave: 0 -> 1 -> 0
            const t = this.blinkProgress / this.BLINK_DURATION;
            const blinkValue = t < 0.5 ? t * 2 : (1 - t) * 2;
            const clampedBlink = Math.max(0, Math.min(1, blinkValue));

            // Apply blink
            const hasBlinkMorphs =
                this.eyeBlinkLeftMesh && this.eyeBlinkLeftIndex >= 0 &&
                this.eyeBlinkRightMesh && this.eyeBlinkRightIndex >= 0;

            if (hasBlinkMorphs) {
                this.eyeBlinkLeftMesh.morphTargetInfluences[this.eyeBlinkLeftIndex] = clampedBlink;
                this.eyeBlinkRightMesh.morphTargetInfluences[this.eyeBlinkRightIndex] = clampedBlink;
            } else if (this.leftEyeBone && this.rightEyeBone) {
                // Fallback: scale eye bones
                const scaleY = 1 - clampedBlink * 0.9;
                this.leftEyeBone.scale.y = scaleY;
                this.rightEyeBone.scale.y = scaleY;
            }

            // Blink complete
            if (this.blinkProgress >= this.BLINK_DURATION) {
                this.blinkProgress = -1;
                this.blinkTimer = this.BLINK_MIN_INTERVAL +
                    Math.random() * (this.BLINK_MAX_INTERVAL - this.BLINK_MIN_INTERVAL);

                // Reset
                if (hasBlinkMorphs) {
                    this.eyeBlinkLeftMesh.morphTargetInfluences[this.eyeBlinkLeftIndex] = 0;
                    this.eyeBlinkRightMesh.morphTargetInfluences[this.eyeBlinkRightIndex] = 0;
                } else if (this.leftEyeBone && this.rightEyeBone) {
                    this.leftEyeBone.scale.y = 1;
                    this.rightEyeBone.scale.y = 1;
                }
            }
        }
    },

    /**
     * Update head tracking
     */
    updateHeadTracking(time) {
        if (!this.headBone) return;

        // Calculate target rotation from mouse
        this.headTargetY = THREE.MathUtils.clamp(
            this.mouseX * this.HEAD_MAX_Y * 2,
            -this.HEAD_MAX_Y,
            this.HEAD_MAX_Y
        );
        this.headTargetX = THREE.MathUtils.clamp(
            -this.mouseY * this.HEAD_MAX_X * 2,
            -this.HEAD_MAX_X,
            this.HEAD_MAX_X
        );

        // Reduce tracking during speaking
        const trackingIntensity = this.isSpeaking ? 0.5 : 1.0;

        // Smooth interpolation
        this.headCurrentY = THREE.MathUtils.lerp(
            this.headCurrentY,
            this.headTargetY * trackingIntensity,
            this.HEAD_LERP_SPEED
        );
        this.headCurrentX = THREE.MathUtils.lerp(
            this.headCurrentX,
            this.headTargetX * trackingIntensity,
            this.HEAD_LERP_SPEED
        );

        // Add micro-movements
        const microX = Math.sin(time * 0.7) * 0.008;
        const microY = Math.sin(time * 0.5) * 0.005;

        this.headBone.rotation.y = this.headCurrentY + microY;
        this.headBone.rotation.x = this.headCurrentX + microX;
    },

    /**
     * Cleanup and destroy
     */
    destroy() {
        console.log('Destroying SynachatAvatar...');

        // Stop animation
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }

        // Dispose Three.js objects
        if (this.scene) {
            this.scene.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose());
                    } else {
                        obj.material.dispose();
                    }
                }
            });
        }

        // Remove canvas from DOM
        if (this.renderer && this.renderer.domElement) {
            this.renderer.dispose();
            if (this.renderer.domElement.parentNode) {
                this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
            }
        }

        // Reset all state
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.mixer = null;
        this.clock = null;
        this.avatar = null;
        this.headBone = null;
        this.leftEyeBone = null;
        this.rightEyeBone = null;
        this.mouthOpenMesh = null;
        this.mouthOpenIndex = -1;
        this.eyeBlinkLeftMesh = null;
        this.eyeBlinkLeftIndex = -1;
        this.eyeBlinkRightMesh = null;
        this.eyeBlinkRightIndex = -1;
        this.container = null;
        this.isInitialized = false;

        // Reset animation state
        this.isSpeaking = false;
        this.smoothMouthOpen = 0;
        this.blinkTimer = 3;
        this.blinkProgress = -1;
        this.headTargetX = 0;
        this.headTargetY = 0;
        this.headCurrentX = 0;
        this.headCurrentY = 0;

        console.log('SynachatAvatar destroyed');
    }
};

// Make globally available
window.SynachatAvatar = SynachatAvatar;
