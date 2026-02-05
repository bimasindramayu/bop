// ===== SHARED CONFIGURATION =====
// File: config.js
// Deskripsi: Konfigurasi terpusat untuk seluruh sistem (Main, BOP, BMN)

const APP_CONFIG = {
    // API Configuration
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbzJyfnNZmEfld6SpIMoZSmGcbnLTW-G8xmygguFDVaJt2Xe0gJoTWH3QPfk_KNbyjuu/exec',

    // KUA List
    KUA_LIST: [
        'KUA Anjatan', 'KUA Arahan', 'KUA Balongan', 'KUA Bangodua', 'KUA Bongas',
        'KUA Cantigi', 'KUA Cikedung', 'KUA Gantar', 'KUA Gabuswetan', 'KUA Haurgeulis',
        'KUA Indramayu', 'KUA Jatibarang', 'KUA Juntinyuat', 'KUA Kandanghaur', 'KUA Karangampel',
        'KUA Kedokan Bunder', 'KUA Kertasemaya', 'KUA Krangkeng', 'KUA Lelea', 'KUA Lohbener',
        'KUA Losarang', 'KUA Pasekan', 'KUA Patrol', 'KUA Sindang', 'KUA Sliyeg',
        'KUA Sukagumiwang', 'KUA Sukra', 'KUA Terisi', 'KUA Tukdana', 'KUA Widasari'
    ],
    
    // Months
    MONTHS: [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ],
    
    // BOP Configuration
    BOP: {
        RPD_PARAMETERS: {
            '521111': {
                name: 'Belanja Operasional Perkantoran',
                items: ['ATK Kantor', 'Jamuan Tamu', 'Pramubakti', 'Alat Rumah Tangga Kantor']
            },
            '521211': {
                name: 'Belanja Bahan',
                items: ['Penggandaan / Penjilidan', 'Spanduk']
            },
            '522111': {
                name: 'Belanja Langganan Listrik',
                items: ['Nominal']
            },
            '522112': {
                name: 'Belanja Langganan Telepon / Internet',
                items: ['Nominal']
            },
            '522113': {
                name: 'Belanja Langganan Air',
                items: ['Nominal']
            },
            '523111': {
                name: 'Belanja Pemeliharaan Gedung dan Bangunan',
                items: ['Nominal']
            },
            '523121': {
                name: 'Belanja Pemeliharaan Peralatan dan Mesin',
                items: ['Nominal']
            }
        }
    },
    
    // BMN Configuration
    BMN: {
        JENIS_BMN: ['Tanah', 'Gedung/Bangunan', 'Kendaraan', 'Peralatan & Mesin', 'Aset Lainnya'],
        KONDISI_BMN: ['Baik', 'Rusak Ringan', 'Rusak Berat'],
        STATUS_BMN: ['Digunakan', 'Tidak Digunakan', 'Diusulkan Penghapusan'],
        SUMBER_PEROLEHAN: ['APBN', 'APBD', 'Hibah', 'Pembelian', 'Bantuan', 'Lainnya'],
        MAX_PHOTO_SIZE: 5 * 1024 * 1024, // 5MB
        MAX_PHOTOS: 5,
        
        JENIS_BMN_CODES: {
            'Tanah': '01',
            'Gedung/Bangunan': '02',
            'Kendaraan': '03',
            'Peralatan & Mesin': '04',
            'Aset Lainnya': '05'
        },
        
        KUA_CODES: {
            'KUA Anjatan': 'AJ', 'KUA Arahan': 'AR', 'KUA Balongan': 'BA',
            'KUA Bangodua': 'BG', 'KUA Bongas': 'BS', 'KUA Cantigi': 'CT',
            'KUA Cikedung': 'CK', 'KUA Gantar': 'GT', 'KUA Gabuswetan': 'GB',
            'KUA Haurgeulis': 'HG', 'KUA Indramayu': 'IM', 'KUA Jatibarang': 'JT',
            'KUA Juntinyuat': 'JN', 'KUA Kandanghaur': 'KH', 'KUA Karangampel': 'KA',
            'KUA Kedokan Bunder': 'KB', 'KUA Kertasemaya': 'KS', 'KUA Krangkeng': 'KR',
            'KUA Lelea': 'LL', 'KUA Lohbener': 'LB', 'KUA Losarang': 'LS',
            'KUA Pasekan': 'PS', 'KUA Patrol': 'PT', 'KUA Sindang': 'SD',
            'KUA Sliyeg': 'SL', 'KUA Sukagumiwang': 'SG', 'KUA Sukra': 'SK',
            'KUA Terisi': 'TR', 'KUA Tukdana': 'TK', 'KUA Widasari': 'WD'
        }
    },
    
    // Cache Configuration
    CACHE: {
        ENABLED: true,
        DURATION: 5 * 60 * 1000, // 5 minutes
        KEYS: {
            STATS: 'stats',
            DATA: 'data',
            VERIFIKASI: 'verifikasi',
            RIWAYAT: 'riwayat'
        }
    },
    
    // Debug Mode
    DEBUG_MODE: true
};

// ===== UTILITY FUNCTIONS =====

// Loading Spinner
function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('active');
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('active');
}

// Notifications
function showNotification(message, type = 'info') {
    console.log(`[NOTIFICATION] ${type.toUpperCase()}: ${message}`);
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.className = `notification ${type} active`;
        setTimeout(() => {
            notification.classList.remove('active');
        }, 4000);
    }
}

// Currency Formatting
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Date Formatting
function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Toggle Password Visibility
function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const button = input.nextElementSibling;
    if (input.type === 'password') {
        input.type = 'text';
        if (button) button.textContent = '🙈';
    } else {
        input.type = 'password';
        if (button) button.textContent = '👁️';
    }
}

// API Call Helper - FIXED VERSION
async function apiCall(action, data = {}) {
    showLoading();
    try {
        // ✅ FIX: Kirim data langsung tanpa nested structure
        const payload = { 
            action: action,
            ...data  // Spread data langsung ke root level
        };
        
        const response = await fetch(APP_CONFIG.SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        hideLoading();
        
        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.message || 'Terjadi kesalahan');
        }
    } catch (error) {
        hideLoading();
        console.error('[API ERROR]', error);
        showNotification(error.message, 'error');
        throw error;
    }
}

// Debug Logger
function debugLog(category, message, data = null) {
    if (!APP_CONFIG.DEBUG_MODE) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${category}]`;
    
    if (data) {
        console.log(prefix, message, data);
    } else {
        console.log(prefix, message);
    }
}

// Cache Management
const AppCache = {
    data: {},
    lastUpdate: {},
    
    isValid(key) {
        if (!APP_CONFIG.CACHE.ENABLED) return false;
        if (!this.data[key] || !this.lastUpdate[key]) return false;
        return (Date.now() - this.lastUpdate[key]) < APP_CONFIG.CACHE.DURATION;
    },
    
    get(key) {
        if (this.isValid(key)) {
            debugLog('CACHE', `Cache HIT for ${key}`);
            return this.data[key];
        }
        debugLog('CACHE', `Cache MISS for ${key}`);
        return null;
    },
    
    set(key, value) {
        this.data[key] = value;
        this.lastUpdate[key] = Date.now();
        debugLog('CACHE', `Cache SET for ${key}`);
    },
    
    clear(key = null) {
        if (key) {
            delete this.data[key];
            delete this.lastUpdate[key];
            debugLog('CACHE', `Cache CLEAR for ${key}`);
        } else {
            this.data = {};
            this.lastUpdate = {};
            debugLog('CACHE', 'Cache CLEAR ALL');
        }
    }
};

// Download Helper
function downloadFile(data, filename, mimeType = 'application/octet-stream') {
    try {
        const blob = base64ToBlob(data, mimeType);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification('File berhasil diunduh', 'success');
    } catch (error) {
        console.error('[DOWNLOAD ERROR]', error);
        showNotification('Gagal mengunduh file', 'error');
    }
}

function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
}

// Session Management
const SessionManager = {
    get(key) {
        const data = sessionStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },
    
    set(key, value) {
        sessionStorage.setItem(key, JSON.stringify(value));
    },
    
    remove(key) {
        sessionStorage.removeItem(key);
    },
    
    clear() {
        sessionStorage.clear();
    },
    
    getCurrentUser() {
        return this.get('user');
    },
    
    setCurrentUser(user) {
        this.set('user', user);
    },
    
    clearUser() {
        this.remove('user');
    }
};

// Modal Management
const ModalManager = {
    show(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    },
    
    hide(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    },
    
    hideAll() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
};

// Common Logout Function
function commonLogout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        SessionManager.clearUser();
        window.location.href = 'index.html';
    }
}

// Back to Main Menu
function backToMenu() {
    window.location.href = 'main-menu.html';
}