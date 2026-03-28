/**
 * SYNAWATCH - Authentication Logic
 */

const Auth = {
    /**
     * Register new user
     */
    async register(email, password, name) {
        try {
            // Create user with email and password
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Update display name
            await user.updateProfile({
                displayName: name
            });

            // Create user document in Firestore
            await FirebaseService.createUserDocument(user, { name });

            return { success: true, user };
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    },

    /**
     * Login user
     */
    async login(email, password, rememberMe = false) {
        try {
            // Set persistence based on remember me
            const persistence = rememberMe
                ? firebase.auth.Auth.Persistence.LOCAL
                : firebase.auth.Auth.Persistence.SESSION;

            await auth.setPersistence(persistence);

            // Sign in
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            return { success: true, user: userCredential.user };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    },

    // Flag to prevent multiple popup requests
    _isGoogleLoginInProgress: false,

    /**
     * Login with Google
     */
    async loginWithGoogle() {
        // Check if running from file:// protocol
        if (window.location.protocol === 'file:') {
            return {
                success: false,
                error: 'Google login tidak tersedia dalam mode offline. Gunakan email dan password.'
            };
        }

        // Prevent multiple popup requests
        if (this._isGoogleLoginInProgress) {
            return {
                success: false,
                error: 'Proses login sedang berjalan. Mohon tunggu.'
            };
        }

        this._isGoogleLoginInProgress = true;

        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({
                prompt: 'select_account'
            });

            const userCredential = await auth.signInWithPopup(provider);

            // Create user document if new user
            await FirebaseService.createUserDocument(userCredential.user);

            this._isGoogleLoginInProgress = false;
            return { success: true, user: userCredential.user };
        } catch (error) {
            this._isGoogleLoginInProgress = false;
            console.error('Google login error:', error);

            // Handle specific errors
            if (error.code === 'auth/operation-not-supported-in-this-environment') {
                return {
                    success: false,
                    error: 'Google login tidak tersedia dalam mode offline. Gunakan email dan password.'
                };
            }

            // Ignore cancelled popup errors silently
            if (error.code === 'auth/cancelled-popup-request' ||
                error.code === 'auth/popup-closed-by-user') {
                return { success: false, error: 'Login dibatalkan.', silent: true };
            }

            // Handle popup blocked
            if (error.code === 'auth/popup-blocked') {
                return {
                    success: false,
                    error: 'Popup diblokir oleh browser. Izinkan popup untuk situs ini.'
                };
            }

            return { success: false, error: this.getErrorMessage(error.code) };
        }
    },

    /**
     * Logout user
     */
    async logout() {
        try {
            await auth.signOut();
            localStorage.removeItem('synawatch_user');
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Send password reset email
     */
    async resetPassword(email) {
        try {
            await auth.sendPasswordResetEmail(email);
            return { success: true };
        } catch (error) {
            console.error('Password reset error:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    },

    /**
     * Update password
     */
    async updatePassword(currentPassword, newPassword) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('No user logged in');

            // Re-authenticate user
            const credential = firebase.auth.EmailAuthProvider.credential(
                user.email,
                currentPassword
            );
            await user.reauthenticateWithCredential(credential);

            // Update password
            await user.updatePassword(newPassword);
            return { success: true };
        } catch (error) {
            console.error('Update password error:', error);
            return { success: false, error: this.getErrorMessage(error.code) };
        }
    },

    /**
     * Update user profile
     */
    async updateProfile(data) {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error('No user logged in');

            // Update auth profile
            if (data.displayName) {
                await user.updateProfile({ displayName: data.displayName });
            }

            // Update Firestore document
            await FirebaseService.updateUserDocument(user.uid, {
                name: data.displayName || data.name,
                ...data
            });

            return { success: true };
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Get current user
     */
    getCurrentUser() {
        return auth.currentUser;
    },

    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return !!auth.currentUser;
    },

    /**
     * Get cached user from localStorage
     */
    getCachedUser() {
        const userData = localStorage.getItem('synawatch_user');
        return userData ? JSON.parse(userData) : null;
    },

    /**
     * Convert Firebase error codes to user-friendly messages
     */
    getErrorMessage(errorCode) {
        const errorMessages = {
            'auth/email-already-in-use': 'Email sudah terdaftar. Silakan login.',
            'auth/invalid-email': 'Format email tidak valid.',
            'auth/operation-not-allowed': 'Operasi tidak diizinkan.',
            'auth/weak-password': 'Password terlalu lemah. Minimal 6 karakter.',
            'auth/user-disabled': 'Akun telah dinonaktifkan.',
            'auth/user-not-found': 'Email tidak terdaftar.',
            'auth/wrong-password': 'Password salah.',
            'auth/invalid-credential': 'Email atau password salah.',
            'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi nanti.',
            'auth/network-request-failed': 'Koneksi internet bermasalah.',
            'auth/popup-closed-by-user': 'Login dibatalkan.',
            'auth/cancelled-popup-request': 'Login dibatalkan.',
            'auth/requires-recent-login': 'Silakan login ulang untuk melanjutkan.'
        };

        return errorMessages[errorCode] || 'Terjadi kesalahan. Silakan coba lagi.';
    },

    /**
     * Validate email format
     */
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Validate password strength
     */
    validatePassword(password) {
        if (password.length < 6) {
            return { valid: false, message: 'Password minimal 6 karakter', strength: 'weak' };
        }

        let strength = 'weak';
        let score = 0;

        if (password.length >= 8) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        if (score >= 4) strength = 'strong';
        else if (score >= 2) strength = 'medium';

        return { valid: true, strength };
    }
};

// Make Auth globally available
window.Auth = Auth;

/**
 * Auth Page UI Handler
 */
document.addEventListener('DOMContentLoaded', () => {
    // Only run on auth page
    if (!document.querySelector('.auth-container')) return;

    // Elements
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authAlert = document.getElementById('authAlert');

    // Tab switching
    if (loginTab && registerTab) {
        loginTab.addEventListener('click', () => {
            loginTab.classList.add('active');
            registerTab.classList.remove('active');
            loginForm.classList.add('active');
            registerForm.classList.remove('active');
            hideAlert();
        });

        registerTab.addEventListener('click', () => {
            registerTab.classList.add('active');
            loginTab.classList.remove('active');
            registerForm.classList.add('active');
            loginForm.classList.remove('active');
            hideAlert();
        });
    }

    // Login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const rememberMe = document.getElementById('rememberMe')?.checked || false;
            const submitBtn = loginForm.querySelector('.auth-submit');

            // Validate
            if (!email || !password) {
                showAlert('Mohon isi semua field.', 'error');
                return;
            }

            if (!Auth.validateEmail(email)) {
                showAlert('Format email tidak valid.', 'error');
                return;
            }

            // Show loading
            setLoading(submitBtn, true);

            // Attempt login
            const result = await Auth.login(email, password, rememberMe);

            if (result.success) {
                showAlert('Login berhasil! Mengalihkan...', 'success');
                setTimeout(() => {
                    window.location.href = 'app.html';
                }, 1000);
            } else {
                showAlert(result.error, 'error');
                setLoading(submitBtn, false);
            }
        });
    }

    // Register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('registerName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const submitBtn = registerForm.querySelector('.auth-submit');

            // Validate
            if (!name || !email || !password || !confirmPassword) {
                showAlert('Mohon isi semua field.', 'error');
                return;
            }

            if (!Auth.validateEmail(email)) {
                showAlert('Format email tidak valid.', 'error');
                return;
            }

            const passwordValidation = Auth.validatePassword(password);
            if (!passwordValidation.valid) {
                showAlert(passwordValidation.message, 'error');
                return;
            }

            if (password !== confirmPassword) {
                showAlert('Password tidak cocok.', 'error');
                return;
            }

            // Show loading
            setLoading(submitBtn, true);

            // Attempt register
            const result = await Auth.register(email, password, name);

            if (result.success) {
                showAlert('Registrasi berhasil! Mengalihkan...', 'success');
                setTimeout(() => {
                    window.location.href = 'app.html';
                }, 1000);
            } else {
                showAlert(result.error, 'error');
                setLoading(submitBtn, false);
            }
        });
    }

    // Google login
    const googleBtn = document.getElementById('googleLogin');

    if (googleBtn) {
        googleBtn.addEventListener('click', async () => {
            // Check if running from file:// protocol
            if (window.location.protocol === 'file:') {
                showServerRequiredModal();
                return;
            }

            // Disable button during login
            googleBtn.disabled = true;
            googleBtn.innerHTML = '<div class="spinner"></div> Menghubungkan...';

            const result = await Auth.loginWithGoogle();

            // Re-enable button
            googleBtn.disabled = false;
            googleBtn.innerHTML = '<i class="fab fa-google"></i> Masuk dengan Google';

            if (result.success) {
                showAlert('Login berhasil! Mengalihkan...', 'success');
                setTimeout(() => {
                    window.location.href = 'app.html';
                }, 1000);
            } else if (!result.silent) {
                // Only show error if not silent (not cancelled by user)
                showAlert(result.error, 'error');
            }
        });
    }

    // Show modal for server requirement
    function showServerRequiredModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('serverModal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'serverModal';
        modal.innerHTML = `
            <div class="server-modal-overlay">
                <div class="server-modal">
                    <div class="server-modal-header">
                        <i class="fas fa-server"></i>
                        <h3>Server Diperlukan</h3>
                    </div>
                    <p>Google Sign-In memerlukan server lokal. Pilih salah satu cara berikut:</p>

                    <div class="server-options">
                        <div class="server-option">
                            <div class="option-header">
                                <i class="fab fa-python"></i>
                                <strong>Python</strong>
                            </div>
                            <code>python -m http.server 8000</code>
                            <span class="option-note">Buka: http://localhost:8000</span>
                        </div>

                        <div class="server-option">
                            <div class="option-header">
                                <i class="fab fa-node-js"></i>
                                <strong>Node.js</strong>
                            </div>
                            <code>npx serve</code>
                            <span class="option-note">Buka: http://localhost:3000</span>
                        </div>

                        <div class="server-option">
                            <div class="option-header">
                                <i class="fas fa-code"></i>
                                <strong>VS Code</strong>
                            </div>
                            <code>Install "Live Server" extension</code>
                            <span class="option-note">Klik kanan file → Open with Live Server</span>
                        </div>
                    </div>

                    <div class="server-modal-actions">
                        <button class="modal-btn-secondary" onclick="this.closest('.server-modal-overlay').remove()">
                            Gunakan Email
                        </button>
                        <button class="modal-btn-primary" onclick="copyServerCommand()">
                            <i class="fas fa-copy"></i> Copy Command
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Copy server command to clipboard
    window.copyServerCommand = function() {
        const command = 'python -m http.server 8000';
        navigator.clipboard.writeText(command).then(() => {
            const btn = document.querySelector('.modal-btn-primary');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-copy"></i> Copy Command';
                }, 2000);
            }
        });
    }

    // Forgot password
    const forgotLink = document.getElementById('forgotPassword');
    if (forgotLink) {
        forgotLink.addEventListener('click', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();

            if (!email) {
                showAlert('Masukkan email Anda terlebih dahulu.', 'error');
                return;
            }

            if (!Auth.validateEmail(email)) {
                showAlert('Format email tidak valid.', 'error');
                return;
            }

            const result = await Auth.resetPassword(email);

            if (result.success) {
                showAlert('Email reset password telah dikirim.', 'success');
            } else {
                showAlert(result.error, 'error');
            }
        });
    }

    // Password visibility toggle
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.parentElement.querySelector('input');
            const icon = btn.querySelector('i');

            if (input.type === 'password') {
                input.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                input.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });

    // Password strength indicator
    const registerPassword = document.getElementById('registerPassword');
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');

    if (registerPassword && strengthBar) {
        registerPassword.addEventListener('input', () => {
            const validation = Auth.validatePassword(registerPassword.value);

            strengthBar.className = 'strength-fill';
            if (registerPassword.value.length > 0) {
                strengthBar.classList.add(validation.strength);
            }

            if (strengthText) {
                const texts = {
                    'weak': 'Password lemah',
                    'medium': 'Password sedang',
                    'strong': 'Password kuat'
                };
                strengthText.textContent = registerPassword.value.length > 0
                    ? texts[validation.strength]
                    : '';
            }
        });
    }

    // Helper functions
    function showAlert(message, type) {
        if (authAlert) {
            authAlert.innerHTML = `
                <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                <span>${message}</span>
            `;
            authAlert.className = `auth-alert ${type} show`;
        }
    }

    function hideAlert() {
        if (authAlert) {
            authAlert.classList.remove('show');
        }
    }

    function setLoading(button, loading) {
        if (loading) {
            button.disabled = true;
            button.innerHTML = '<div class="spinner"></div> Memproses...';
        } else {
            button.disabled = false;
            button.innerHTML = button.dataset.originalText || 'Submit';
        }
    }

    // Store original button text
    document.querySelectorAll('.auth-submit').forEach(btn => {
        btn.dataset.originalText = btn.innerHTML;
    });
});
