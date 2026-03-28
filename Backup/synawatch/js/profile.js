/**
 * SYNAWATCH - Profile Page Logic
 */

let weeklyChart = null;

/**
 * Initialize profile page
 */
async function initProfile() {
    await loadProfileData();
    await loadStatistics();
    initWeeklyChart();
    setupFormHandlers();
}

/**
 * Load profile data
 */
async function loadProfileData() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        // Get user document from Firestore
        const userData = await FirebaseService.getUserDocument(user.uid);

        // Update UI
        const nameElement = document.getElementById('profileName');
        const emailElement = document.getElementById('profileEmail');
        const joinedElement = document.getElementById('profileJoined');
        const avatarContainer = document.getElementById('avatarContainer');
        const editNameInput = document.getElementById('editName');

        if (nameElement) {
            nameElement.textContent = userData?.name || user.displayName || user.email.split('@')[0];
        }

        if (emailElement) {
            emailElement.textContent = user.email;
        }

        if (joinedElement && userData?.createdAt) {
            const createdDate = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
            joinedElement.textContent = `Member since ${Utils.formatDate(createdDate, 'short')}`;
        }

        if (avatarContainer) {
            if (user.photoURL) {
                avatarContainer.innerHTML = `<img src="${user.photoURL}" alt="Avatar">`;
            } else {
                const initials = (userData?.name || user.email)[0].toUpperCase();
                avatarContainer.innerHTML = `<span style="font-size: 2.5rem;">${initials}</span>`;
            }
        }

        if (editNameInput) {
            editNameInput.value = userData?.name || user.displayName || '';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

/**
 * Load user statistics
 */
async function loadStatistics() {
    try {
        const user = auth.currentUser;
        if (!user) return;

        const stats = await FirebaseService.getUserStatistics(user.uid);

        // Update UI
        const daysActiveElement = document.getElementById('daysActive');
        const totalSessionsElement = document.getElementById('totalSessions');
        const healthScoreElement = document.getElementById('healthScore');
        const totalTimeElement = document.getElementById('totalTime');

        if (daysActiveElement) {
            daysActiveElement.textContent = stats.daysActive || 0;
        }

        if (totalSessionsElement) {
            totalSessionsElement.textContent = stats.totalSessions || 0;
        }

        if (healthScoreElement) {
            healthScoreElement.textContent = stats.avgHealthScore || '--';
        }

        if (totalTimeElement) {
            const hours = Math.floor((stats.totalDuration || 0) / 3600);
            const minutes = Math.floor(((stats.totalDuration || 0) % 3600) / 60);
            totalTimeElement.textContent = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

/**
 * Initialize weekly chart
 */
async function initWeeklyChart() {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) return;

    try {
        const user = auth.currentUser;
        let weeklyData = [0, 0, 0, 0, 0, 0, 0];

        if (user) {
            // Get last 7 days of data
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 6);

            const recordings = await FirebaseService.getRecordingHistory(user.uid, 100);

            // Group by day
            const dayData = {};
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

            recordings.forEach(recording => {
                const date = recording.createdAt?.toDate ? recording.createdAt.toDate() : new Date(recording.createdAt);
                const dayIndex = (date.getDay() + 6) % 7; // Mon = 0
                const dayName = days[dayIndex];

                if (!dayData[dayName]) {
                    dayData[dayName] = { total: 0, count: 0 };
                }
                dayData[dayName].total += recording.healthScore || 0;
                dayData[dayName].count++;
            });

            weeklyData = days.map(day => {
                if (dayData[day] && dayData[day].count > 0) {
                    return Math.round(dayData[day].total / dayData[day].count);
                }
                return 0;
            });
        }

        // Create chart
        weeklyChart = ChartConfigs.createWeeklyTrendChart(ctx.getContext('2d'), weeklyData);
    } catch (error) {
        console.error('Error creating weekly chart:', error);
        // Create with demo data
        weeklyChart = ChartConfigs.createWeeklyTrendChart(ctx.getContext('2d'), [75, 82, 78, 85, 80, 88, 84]);
    }
}

/**
 * Setup form handlers
 */
function setupFormHandlers() {
    // Edit Profile Form
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('editName').value.trim();
            if (!name) {
                Utils.showToast('Please enter your name', 'error');
                return;
            }

            const submitBtn = editProfileForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

            const result = await Auth.updateProfile({ name, displayName: name });

            if (result.success) {
                Utils.showToast('Profile updated successfully', 'success');
                closeModal('editProfileModal');
                loadProfileData();
            } else {
                Utils.showToast(result.error || 'Failed to update profile', 'error');
            }

            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Changes';
        });
    }

    // Change Password Form
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmNewPassword = document.getElementById('confirmNewPassword').value;

            if (newPassword !== confirmNewPassword) {
                Utils.showToast('Passwords do not match', 'error');
                return;
            }

            const validation = Auth.validatePassword(newPassword);
            if (!validation.valid) {
                Utils.showToast(validation.message, 'error');
                return;
            }

            const submitBtn = changePasswordForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';

            const result = await Auth.updatePassword(currentPassword, newPassword);

            if (result.success) {
                Utils.showToast('Password updated successfully', 'success');
                closeModal('changePasswordModal');
                changePasswordForm.reset();
            } else {
                Utils.showToast(result.error || 'Failed to update password', 'error');
            }

            submitBtn.disabled = false;
            submitBtn.textContent = 'Update Password';
        });
    }
}

/**
 * Open edit profile modal
 */
function openEditProfile() {
    document.getElementById('editProfileModal').classList.add('show');
}

/**
 * Open change password modal
 */
function openChangePassword() {
    document.getElementById('changePasswordModal').classList.add('show');
}

/**
 * Close modal
 */
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

/**
 * Confirm logout
 */
function confirmLogout() {
    if (confirm('Are you sure you want to logout?')) {
        logout();
    }
}

/**
 * Logout
 */
async function logout() {
    const result = await Auth.logout();

    if (result.success) {
        window.location.href = 'auth.html';
    } else {
        Utils.showToast('Failed to logout', 'error');
    }
}

// Close modals when clicking outside
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('show');
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('authenticated', () => {
        initProfile();
    });

    if (typeof auth !== 'undefined' && auth.currentUser) {
        initProfile();
    }
});

// Cleanup
window.addEventListener('beforeunload', () => {
    if (weeklyChart) weeklyChart.destroy();
});
