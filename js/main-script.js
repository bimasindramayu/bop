// ===== MAIN SCRIPT =====
// File: main-script.js
// Untuk: index.html dan main-menu.html
// Menggunakan config.js untuk semua utilities dan config

// ===== STATE =====
let currentUser = null;

// ===== LOGIN PAGE =====
function initLoginPage() {
    debugLog('MAIN', 'Initializing login page');
    
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', handleLogin);
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
        showNotification('Username dan password harus diisi', 'error');
        return;
    }
    
    // ✅ VALIDATE CAPTCHA if enabled
    if (APP_CONFIG.CAPTCHA.ENABLED) {
        const captchaInput = document.getElementById('captchaInput').value;
        
        if (!captchaInput) {
            showNotification('Kode CAPTCHA harus diisi', 'error');
            return;
        }
        
        if (!CaptchaManager.validate(captchaInput)) {
            showNotification('Kode CAPTCHA salah', 'error');
            // Refresh CAPTCHA
            if (typeof window.refreshCaptcha === 'function') {
                window.refreshCaptcha();
            } else {
                CaptchaManager.refresh();
                document.getElementById('captchaInput').value = '';
            }
            return; // ❌ STOP LOGIN PROCESS
        }
    }
    
    try {
        debugLog('LOGIN', 'Attempting login', { username });
        const user = await apiCall('login', { username, password });
        
        // Save to session
        SessionManager.setCurrentUser(user);
        
        showNotification('Login berhasil', 'success');
        
        // Redirect to main menu
        setTimeout(() => {
            window.location.href = 'main-menu.html';
        }, 1000);
    } catch (error) {
        debugLog('LOGIN', 'Login failed', error);
        showNotification(error.message || 'Username atau password salah', 'error');
        
        // ✅ Refresh CAPTCHA on failed login
        if (APP_CONFIG.CAPTCHA.ENABLED) {
            if (typeof window.refreshCaptcha === 'function') {
                window.refreshCaptcha();
            } else {
                CaptchaManager.refresh();
                document.getElementById('captchaInput').value = '';
            }
        }
    }
}

// ===== MAIN MENU PAGE =====
function initMainMenuPage() {
    debugLog('MAIN', 'Initializing main menu page');
    
    // Check if user is logged in
    currentUser = SessionManager.getCurrentUser();
    
    if (!currentUser) {
        debugLog('MAIN', 'No user session, redirecting to login');
        window.location.href = 'index.html';
        return;
    }
    
    // Display user info
    displayUserInfo();
    
    // Setup password change modal
    setupPasswordChangeModal();
}

function displayUserInfo() {
    const userNameEl = document.getElementById('userName');
    const userRoleEl = document.getElementById('userRole');
    
    if (userNameEl) {
        userNameEl.textContent = currentUser.name;
    }
    
    if (userRoleEl) {
        const roleText = currentUser.role + (currentUser.kua ? ' - ' + currentUser.kua : '');
        userRoleEl.textContent = roleText;
    }
    
    // Show Pengguna & Kelola Info KUA menu for Admin
    if (currentUser.role === 'Admin') {
        const menuPengguna = document.getElementById('menuPengguna');
        if (menuPengguna) {
            menuPengguna.style.display = 'block';
        }
        const menuKelolInfoKUA = document.getElementById('menuKelolInfoKUA');
        if (menuKelolInfoKUA) {
            menuKelolInfoKUA.style.display = 'block';
        }
    }
    
    debugLog('MAIN', 'User info displayed', { name: currentUser.name, role: currentUser.role });
}

function setupPasswordChangeModal() {
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (!changePasswordForm) return;
    
    changePasswordForm.addEventListener('submit', handlePasswordChange);
}

function showPasswordModal() {
    ModalManager.show('changePasswordModal');
}

function closePasswordModal() {
    ModalManager.hide('changePasswordModal');
    document.getElementById('changePasswordForm').reset();
}

async function handlePasswordChange(e) {
    e.preventDefault();
    
    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!oldPassword || !newPassword || !confirmPassword) {
        showNotification('Semua field harus diisi', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showNotification('Password baru tidak cocok', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showNotification('Password baru minimal 6 karakter', 'error');
        return;
    }
    
    try {
        debugLog('PASSWORD', 'Changing password for user', currentUser.username);
        
        await apiCall('changePassword', {
            userId: currentUser.id,
            username: currentUser.username,
            role: currentUser.role,
            oldPassword: oldPassword,
            newPassword: newPassword
        });
        
        showNotification('Password berhasil diubah', 'success');
        closePasswordModal();
        
        // Logout after password change
        setTimeout(() => {
            showNotification('Silakan login dengan password baru', 'info');
            setTimeout(() => {
                logout();
            }, 2000);
        }, 1000);
    } catch (error) {
        debugLog('PASSWORD', 'Password change failed', error);
        showNotification(error.message || 'Gagal mengubah password', 'error');
    }
}

function logout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        debugLog('MAIN', 'User logging out');
        SessionManager.clearUser();
        AppCache.clear(); // Clear cache on logout
        window.location.href = 'index.html';
    }
}

// ===== AUTO INITIALIZATION =====
window.addEventListener('DOMContentLoaded', function() {
    debugLog('MAIN', 'DOM Content Loaded');
    
    // Determine which page we're on
    const path = window.location.pathname;
    
    if (path.includes('index.html') || path.endsWith('/')) {
        initLoginPage();
    } else if (path.includes('main-menu.html')) {
        initMainMenuPage();
    }
});

// ===== EXPOSE FUNCTIONS TO GLOBAL SCOPE =====
// These are called from HTML onclick attributes
window.showPasswordModal = showPasswordModal;
window.closePasswordModal = closePasswordModal;
window.logout = logout;