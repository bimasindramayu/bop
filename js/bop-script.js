// ===== BOP SCRIPT =====
// File: bop-script.js
// Untuk: bop-dashboard.html
// Config & utilities dari config.js

// ===== STATE MANAGEMENT =====
let currentUser = null;
let currentPage = 'dashboardPage';
let editingBudget = null;

let uploadedFiles = [];
let uploadConfig = {
    maxFiles: 10,
    maxFileSize: 10  // MB
};

// ✅ Realisasi data for autopay integration
let realisasiData = {};

// ✅ LOCAL CACHE - persisten selama session, tidak ada timeout
const localCache = {
    budgets: null,
    rpds: null,
    realisasis: null,
    dashboardStats: null,
    verifikasi: null,
    riwayat: null,
    lastUpdate: {}
};

// Autopay state
let autopayConfigs = [];
let autopayData = [];
let autopayKUAList = [];

// ===== AUTOPAY HELPER FUNCTIONS =====

/**
 * Get autopay info for a specific KUA, month, year, and POS
 * Returns nominal dari Autopay_Realisasi atau 0 jika belum ada data
 */
async function getAutopayInfo(kua, tahun, bulan, kodePos) {
    try {
        console.log('[AUTOPAY_INFO] Getting autopay info:', { kua, tahun, bulan, kodePos });
        
        // Check if autopay enabled for this KUA and POS
        const isEnabled = await autopayApiCall('isAutopayEnabled', { kua, kodePos });
        
        if (!isEnabled) {
            console.log('[AUTOPAY_INFO] Autopay not enabled');
            return { enabled: false, nominal: 0 };
        }
        
        // Get autopay realisasi data
        const autopayDataList = await autopayApiCall('getAutopayRealisasi', { tahun, bulan });
        
        // Find data for this KUA and POS
        const autopayRecord = autopayDataList.find(r => 
            String(r.kua).trim() === String(kua).trim() && 
            String(r.kodePos).trim() === String(kodePos).trim()
        );
        
        const nominal = autopayRecord ? (parseFloat(autopayRecord.nominal) || 0) : 0;
        
        console.log('[AUTOPAY_INFO] Result:', { enabled: true, nominal });
        
        return {
            enabled: true,
            nominal: nominal,
            keterangan: autopayRecord ? autopayRecord.keterangan : ''
        };
        
    } catch (error) {
        console.error('[AUTOPAY_INFO] Error:', error);
        return { enabled: false, nominal: 0 };
    }
}

/**
 * Generate HTML untuk tampilkan info autopay
 * Untuk dipakai di detail view / modal
 */
function generateAutopayInfoHTML(autopayInfo, posName) {
    if (!autopayInfo || !autopayInfo.enabled) {
        return '';
    }
    
    return `
        <div style="margin-top: 10px; padding: 12px; background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%); 
                    border-left: 4px solid #2196F3; border-radius: 6px;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="background: white; color: #1976D2; padding: 4px 10px; 
                             border-radius: 4px; font-weight: bold; font-size: 11px;">
                    🤖 AUTOPAY - DIBAYAR VIA SAKTI
                </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; 
                       padding: 8px; background: white; border-radius: 4px;">
                <div>
                    <small style="color: #666; display: block; font-size: 11px; margin-bottom: 4px;">
                        ℹ️ POS ini menggunakan Autopay. Admin input nominal via SAKTI.
                    </small>
                    <div style="color: #1976D2; font-size: 13px; font-weight: 500;">
                        Nominal Autopay:
                    </div>
                </div>
                <strong style="color: #1976D2; font-size: 18px;">
                    ${formatCurrency(autopayInfo.nominal)}
                </strong>
            </div>
            ${autopayInfo.keterangan ? `
                <div style="margin-top: 8px; padding: 6px 8px; background: #FFF9C4; 
                           border-radius: 4px; border-left: 3px solid #FBC02D;">
                    <small style="color: #F57C00; font-size: 11px;">
                        <strong>Keterangan:</strong> ${autopayInfo.keterangan}
                    </small>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * Check if a POS code is autopay-eligible
 */
function isAutopayPOS(kodePos) {
    return kodePos === '522111' || kodePos === '522112';
}

/**
 * Get POS name for autopay POS
 */
function getAutopayPOSName(kodePos) {
    if (kodePos === '522111') return 'Belanja Langganan Listrik';
    if (kodePos === '522112') return 'Belanja Langganan Telepon / Internet';
    return '';
}

// ✅ Function untuk update cache dengan data baru
function updateLocalCache(key, data) {
    localCache[key] = data;
    localCache.lastUpdate[key] = Date.now();
    console.log(`[LOCAL_CACHE] Updated ${key} at ${new Date().toLocaleTimeString()}`);
}

// ✅ Function untuk get cache
function getLocalCache(key) {
    if (localCache[key]) {
        console.log(`[LOCAL_CACHE] Using cached ${key}`);
        return localCache[key];
    }
    console.log(`[LOCAL_CACHE] No cache for ${key}`);
    return null;
}

// ✅ Function untuk clear specific cache
function clearLocalCache(key) {
    if (key) {
        localCache[key] = null;
        delete localCache.lastUpdate[key];
        console.log(`[LOCAL_CACHE] Cleared ${key}`);
    } else {
        // Clear all
        Object.keys(localCache).forEach(k => {
            if (k !== 'lastUpdate') {
                localCache[k] = null;
            }
        });
        localCache.lastUpdate = {};
        console.log(`[LOCAL_CACHE] Cleared ALL cache`);
    }
}

// Replace function startRealisasiPolling: 
function startRealisasiPolling() {
    // ✅ Check config dari window.CACHE_CONFIG
    if (!window.CACHE_CONFIG || !window.CACHE_CONFIG.AUTO_REFRESH_ENABLED) {
        console.log('[POLL] Auto-refresh disabled in config');
        return;
    }
    
    // ✅ Stop any existing poller first
    if (realisasiStatusPoller) {
        clearInterval(realisasiStatusPoller);
        realisasiStatusPoller = null;
    }
    
    if (currentPage === 'realisasiPage') {
        realisasiStatusPoller = setInterval(async () => {
            console.log('[POLL] Checking realisasi status...');
            await loadRealisasis(true);
        }, window.CACHE_CONFIG.AUTO_REFRESH_INTERVAL);
        
        console.log('[POLL] Started with interval:', window.CACHE_CONFIG.AUTO_REFRESH_INTERVAL);
    }
}

// Replace function getCache:
function getCache(cacheKey) {
    // ✅ Check config dari window.CACHE_CONFIG
    if (!window.CACHE_CONFIG || !window.CACHE_CONFIG.ENABLED) {
        console.log(`[CACHE] Cache disabled in config`);
        return null;
    }
    
    if (isCacheValid(cacheKey)) {
        console.log(`[CACHE] Using cached data for ${cacheKey}`);
        return dataCache[cacheKey].data;
    }
    console.log(`[CACHE] Cache MISS for ${cacheKey}`);
    return null;
}

// Replace function setCache:
function setCache(cacheKey, data) {
    // ✅ Check config dari window.CACHE_CONFIG
    if (!window.CACHE_CONFIG || !window.CACHE_CONFIG.ENABLED) {
        console.log(`[CACHE] Cache disabled, not storing ${cacheKey}`);
        return;
    }
    
    dataCache[cacheKey] = {
        ...dataCache[cacheKey],
        data: data,
        timestamp: Date.now()
    };
    console.log(`[CACHE] Set cache for ${cacheKey}`);
}

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', function() {
    debugLog('BOP', 'Initializing BOP Dashboard');
    
    // Check authentication
    currentUser = SessionManager.getCurrentUser();
    
    if (!currentUser) {
        debugLog('BOP', 'No user session, redirecting to login');
        window.location.href = 'index.html';
        return;
    }
    
    // Initialize dashboard
    showDashboard();
});

// ✅ PRELOAD ALL DATA - dipanggil sekali saat dashboard pertama kali muncul
async function preloadAllData() {
    console.log('[PRELOAD] ========== PRELOADING ALL DATA START ==========');
    console.log('[PRELOAD] User:', currentUser.role, '-', currentUser.kua);
    
    showLoading();
    
    try {
        const currentYear = new Date().getFullYear();
        
        // ✅ Parallel fetch semua data sekaligus untuk performa maksimal
        const promises = [];
        
        // 1. Dashboard Stats
        promises.push(
            apiCall('getDashboardStats', { 
                year: currentYear,
                kua: currentUser.kua,
                role: currentUser.role
            }).then(data => {
                updateLocalCache('dashboardStats', data);
                console.log('[PRELOAD] ✅ Dashboard stats loaded');
                return data;
            })
        );
        
        // 2. Budgets
        if (currentUser.role === 'Admin') {
            promises.push(
                apiCall('getBudgets', { year: currentYear }).then(data => {
                    updateLocalCache('budgets', data);
                    console.log('[PRELOAD] ✅ Budgets loaded:', data.length);
                    return data;
                })
            );
        } else {
            promises.push(
                apiCall('getBudgets', { kua: currentUser.kua }).then(data => {
                    updateLocalCache('budgets', data);
                    console.log('[PRELOAD] ✅ Budgets loaded:', data.length);
                    return data;
                })
            );
        }
        
        // 3. RPDs
        if (currentUser.role === 'Admin') {
            promises.push(
                apiCall('getRPDs', { year: currentYear }).then(data => {
                    updateLocalCache('rpds', sortByMonth(data));
                    console.log('[PRELOAD] ✅ RPDs loaded:', data.length);
                    return data;
                })
            );
        } else {
            promises.push(
                apiCall('getRPDs', { 
                    kua: currentUser.kua, 
                    year: currentYear 
                }).then(data => {
                    updateLocalCache('rpds', sortByMonth(data));
                    console.log('[PRELOAD] ✅ RPDs loaded:', data.length);
                    return data;
                })
            );
        }
        
        // 4. Realisasis (untuk Operator KUA)
        if (currentUser.role === 'Operator KUA') {
            promises.push(
                apiCall('getRealisasis', { 
                    kua: currentUser.kua, 
                    year: currentYear 
                }).then(data => {
                    updateLocalCache('realisasis', sortByMonth(data));
                    console.log('[PRELOAD] ✅ Realisasis loaded:', data.length);
                    return data;
                })
            );
            
            // ✅ Preload config untuk Operator KUA juga (untuk button state)
            promises.push(
                apiCall('getRPDConfig').then(data => {
                    updateLocalCache('config', data);
                    console.log('[PRELOAD] ✅ RPD Config loaded for Operator');
                    return data;
                })
            );
        }
        
        // 5. Verifikasi (untuk Admin)
        if (currentUser.role === 'Admin') {
            promises.push(
                apiCall('getRealisasis', { year: currentYear }).then(data => {
                    updateLocalCache('verifikasi', data);
                    console.log('[PRELOAD] ✅ Verifikasi data loaded:', data.length);
                    return data;
                })
            );
            
            // ✅ FIX ISSUE #5: Preload RPD Config untuk Admin
            promises.push(
                apiCall('getRPDConfig').then(data => {
                    updateLocalCache('config', data);
                    console.log('[PRELOAD] ✅ RPD Config loaded');
                    return data;
                })
            );
        }
        
        // ✅ Wait for all data to load
        await Promise.all(promises);
        
        console.log('[PRELOAD] ========== ALL DATA LOADED SUCCESSFULLY ==========');
        console.log('[PRELOAD] Cache status:', {
            dashboardStats: !!localCache.dashboardStats,
            budgets: !!localCache.budgets,
            rpds: !!localCache.rpds,
            realisasis: !!localCache.realisasis,
            verifikasi: !!localCache.verifikasi,
            config: !!localCache.config
        });
        
    } catch (error) {
        console.error('[PRELOAD] Error loading data:', error);
        showNotification('Gagal memuat data: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function showDashboard() {
    console.log('[DASHBOARD] Showing dashboard for:', currentUser);
    
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        dashboard.classList.add('active');
    }
    
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userRoleDisplay = document.getElementById('userRoleDisplay');
    
    if (userNameDisplay) userNameDisplay.textContent = currentUser.name;
    if (userRoleDisplay) userRoleDisplay.textContent = currentUser.role;
    
    populateYearFilters();
    buildNavMenu();
    
    // ✅ PRELOAD ALL DATA saat dashboard pertama kali muncul
    preloadAllData().then(() => {
        // Setelah preload selesai, tampilkan dashboard page
        currentPage = 'dashboardPage';
        showPage('dashboardPage');
    });
    // Show/hide autopay filter based on role
    // Filter should only be visible for Admin in Laporan page
    const includeAutopayFilterContainer = document.getElementById('includeAutopayFilterContainer');
    if (includeAutopayFilterContainer) {
        // Always hide in Realisasi page (will be shown only in Laporan via other code)
        includeAutopayFilterContainer.style.display = 'none';
    }
}

function populateYearFilters() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
        years.push(i);
    }

    // Budget Year Filter
    const budgetYearFilter = document.getElementById('budgetYearFilter');
    if (budgetYearFilter) {
        budgetYearFilter.innerHTML = years.map(year => 
            `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`
        ).join('');
    }

    // RPD Year Filter
    const rpdYearFilter = document.getElementById('rpdYearFilter');
    if (rpdYearFilter) {
        rpdYearFilter.innerHTML = years.map(year => 
            `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`
        ).join('');
    }

    // Realisasi Year Filter
    const realisasiYearFilter = document.getElementById('realisasiYearFilter');
    if (realisasiYearFilter) {
        realisasiYearFilter.innerHTML = years.map(year => 
            `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`
        ).join('');
    }

    // Verifikasi Year Filter
    const verifikasiYearFilter = document.getElementById('verifikasiYearFilter');
    if (verifikasiYearFilter) {
        verifikasiYearFilter.innerHTML = years.map(year => 
            `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`
        ).join('');
    }

    // Verifikasi KUA Filter
    const verifikasiKUAFilter = document.getElementById('verifikasiKUAFilter');
    if (verifikasiKUAFilter) {
        verifikasiKUAFilter.innerHTML = '<option value="">Semua KUA</option>' + 
            APP_CONFIG.KUA_LIST.map(kua => `<option value="${kua}">${kua}</option>`).join('');
    }
}

function getMonthIndex(monthName) {
    return APP_CONFIG.MONTHS.indexOf(monthName);
}

function buildNavMenu() {
    console.log('[NAV] Building navigation menu');
    const navMenu = document.getElementById('navMenu');
    if (!navMenu) return;
    
    let menuItems = [];

    if (currentUser.role === 'Admin') {
        menuItems = [
            { id: 'dashboardPage', label: 'Dashboard' },
            { id: 'budgetingPage', label: 'Budget' },
            { id: 'rpdPage', label: 'Lihat RPD' },
            { id: 'verifikasiPage', label: 'Verifikasi' },
            { id: 'autopayPage', label: 'Autopay' },
            { id: 'laporanPage', label: 'Laporan' },
            { id: 'rpdConfigPage', label: 'Konfigurasi' }
        ];
    } else {
        menuItems = [
            { id: 'dashboardPage', label: 'Dashboard' },
            { id: 'rpdPage', label: 'RPD' },
            { id: 'realisasiPage', label: 'Realisasi' }
        ];
    }

    navMenu.innerHTML = `
        <ul>
            ${menuItems.map(item => `
                <li>
                    <button onclick="showPage('${item.id}')" id="nav-${item.id}">
                        ${item.label}
                    </button>
                </li>
            `).join('')}
        </ul>
    `;

    const firstNavBtn = document.getElementById('nav-dashboardPage');
    if (firstNavBtn) firstNavBtn.classList.add('active');
}

// ===== DATA CACHE MANAGEMENT =====
const dataCache = {
    budgets: { data: null, timestamp: null, ttl: 5 * 60 * 1000 }, // 5 menit
    users: { data: null, timestamp: null, ttl: 10 * 60 * 1000 }, // 10 menit
    rpds: { data: null, timestamp: null, ttl: 3 * 60 * 1000 }, // 3 menit
    realisasis: { data: null, timestamp: null, ttl: 2 * 60 * 1000 }, // 2 menit (lebih sering update)
    verifikasi: { data: null, timestamp: null, ttl: 1 * 60 * 1000 }, //1menit
    config: { data: null, timestamp: null, ttl: 15 * 60 * 1000 }, // 15 menit
    dashboardStats: { data: null, timestamp: null, ttl: 2 * 60 * 1000 } // 2 menit
};

function isCacheValid(cacheKey) {
    const cache = dataCache[cacheKey];
    if (!cache.data || !cache.timestamp) return false;
    return (Date.now() - cache.timestamp) < cache.ttl;
}

// Auto-refresh status realisasi setiap 30 detik jika ada yang pending
let realisasiStatusPoller = null;

function stopRealisasiPolling() {
    if (realisasiStatusPoller) {
        clearInterval(realisasiStatusPoller);
        realisasiStatusPoller = null;
        console.log('[POLL] Stopped realisasi polling');
    }
}

function navigateTo(pageId) {
    console.log('[PAGE] Navigating to:', pageId);
    
    // ✅ Stop polling saat pindah page
    stopRealisasiPolling();
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.add('active');
        currentPage = pageId;
        
        // Load page data
        switch(pageId) {
            case 'dashboardPage':
                loadDashboardStats();
                break;
            case 'budgetPage':
                if (currentUser.role === 'Admin') {
                    loadBudgets();
                }
                break;
            case 'rpdPage':
                loadRPDs();
                break;
            case 'realisasiPage':
                // ✅ FIX: Use cache (false) when navigating, data already preloaded
                loadRealisasis(false);
                // ✅ Start polling HANYA untuk halaman realisasi
                startRealisasiPolling();
                break;
            case 'autopayPage':
                if (currentUser.role === 'Admin') {
                    loadAutopayConfig();
                }
                break;
            case 'verifikasiPage':
                if (currentUser.role === 'Admin') {
                    loadVerifikasi();
                }
                break;
            case 'laporanPage':
                // ... existing code ...
                
                // Show autopay filter only for Admin in Laporan page
                if (user.role === 'Admin') {
                    const filterContainer = document.getElementById('includeAutopayFilterContainer');
                    if (filterContainer) {
                        filterContainer.style.display = 'inline';
                    }
                }
                break;
        }
    }
}

function showPage(pageId) {
    console.log(`[PAGE] Navigating to: ${pageId}`);
    
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    
    // Remove active from all nav buttons
    document.querySelectorAll('.nav-menu button').forEach(btn => btn.classList.remove('active'));
    
    // Show selected page
    const selectedPage = document.getElementById(pageId);
    if (selectedPage) selectedPage.classList.add('active');
    
    // Add active to selected nav button
    const navButton = document.getElementById('nav-' + pageId);
    if (navButton) {
        navButton.classList.add('active');
    }
    
    currentPage = pageId;
    
    // Stop polling
    stopRealisasiPolling();
    stopVerifikasiAutoRefresh();
    
    if (pageId === 'rpdPage') {
        const kuaFilter = document.getElementById('rpdKUAFilter');
        const btnCreateRPD = document.getElementById('btnCreateRPD');
        const thKUA = document.querySelectorAll('.th-kua');
        
        if (currentUser.role === 'Admin') {
            if (kuaFilter) {
                kuaFilter.style.display = 'block';
                
                kuaFilter.innerHTML = '<option value="">Semua KUA</option>' + 
                    APP_CONFIG.KUA_LIST.map(kua => `<option value="${kua}">${kua}</option>`).join('');
                
                console.log('[RPD] KUA filter populated with', APP_CONFIG.KUA_LIST.length, 'options');
            }
            if (btnCreateRPD) btnCreateRPD.style.display = 'none';
            thKUA.forEach(th => th.style.display = 'table-cell');
        } else {
            // Operator: Hide KUA filter, show create button, hide KUA column
            if (kuaFilter) kuaFilter.style.display = 'none';
            if (btnCreateRPD) btnCreateRPD.style.display = 'inline-block';
            thKUA.forEach(th => th.style.display = 'none');
        }
    }

    if (pageId === 'verifikasiPage') {
        loadVerifikasi();
        if (currentUser.role === 'Admin') {
            startVerifikasiAutoRefresh();
        }
        
        // ✅ FIX ISSUE #4: Populate verifikasi KUA filter
        const verifikasiKUAFilter = document.getElementById('verifikasiKUAFilter');
        if (verifikasiKUAFilter) {
            // ✅ Populate tanpa cek length
            verifikasiKUAFilter.innerHTML = '<option value="">Semua KUA</option>' +
                APP_CONFIG.KUA_LIST.map(kua => `<option value="${kua}">${kua}</option>`).join('');
            
            console.log('[VERIFIKASI] KUA filter populated');
        }
        
        // ✅ FIX ISSUE #4: Ensure event listeners are attached
        const verifikasiYearFilter = document.getElementById('verifikasiYearFilter');
        const verifikasiStatusFilter = document.getElementById('verifikasiStatusFilter');
        
        if (verifikasiYearFilter) {
            // Remove old listener if exists
            verifikasiYearFilter.onchange = null;
            // Add new listener
            verifikasiYearFilter.addEventListener('change', function() {
                console.log('[VERIFIKASI] Year filter changed to:', this.value);
                loadVerifikasi(true); // Force refresh
            });
        }
        
        if (verifikasiKUAFilter) {
            verifikasiKUAFilter.onchange = null;
            verifikasiKUAFilter.addEventListener('change', function() {
                console.log('[VERIFIKASI] KUA filter changed to:', this.value);
                loadVerifikasi(); // Use cache, just re-filter
            });
        }
        
        if (verifikasiStatusFilter) {
            verifikasiStatusFilter.onchange = null;
            verifikasiStatusFilter.addEventListener('change', function() {
                console.log('[VERIFIKASI] Status filter changed to:', this.value);
                loadVerifikasi(); // Use cache, just re-filter
            });
        }
    }
    
    // ✅ FIX: Setup realisasiPage event listeners
    if (pageId === 'realisasiPage') {
        const realisasiYearFilter = document.getElementById('realisasiYearFilter');
        
        if (realisasiYearFilter) {
            // Remove old listener if exists
            realisasiYearFilter.onchange = null;
            // Add new listener
            realisasiYearFilter.addEventListener('change', function() {
                console.log('[REALISASI] Year filter changed to:', this.value);
                loadRealisasis(true); // Force refresh with new year
            });
        }
    }
    
    // ✅ FIX: Setup budgetingPage event listeners
    if (pageId === 'budgetingPage') {
        const budgetYearFilter = document.getElementById('budgetYearFilter');
        
        if (budgetYearFilter) {
            // Remove old listener if exists
            budgetYearFilter.onchange = null;
            // Add new listener
            budgetYearFilter.addEventListener('change', function() {
                console.log('[BUDGET] Year filter changed to:', this.value);
                loadBudgets(true); // Force refresh with new year
            });
        }
    }
    
    // Load data for specific pages
    switch(pageId) {
        case 'dashboardPage':
            loadDashboardStats();
            break;
        case 'budgetingPage':
            // ✅ FIX: Use cache, data already preloaded
            loadBudgets(false); // false = use cache
            break;
        case 'rpdConfigPage':
            // ✅ FIX ISSUE #5: Gunakan cache, tidak perlu fetch dari server lagi
            console.log('[CONFIG] Loading config from cache');
            loadRPDConfig(false);  // false = use cache
            break;
        case 'rpdPage':
            loadRPDs();
            break;
        case 'realisasiPage':
            // ✅ FIX ISSUE #6: Gunakan cache, tidak perlu fetch dari server lagi
            loadRealisasis(false); // false = use cache
            if (currentUser.role === 'Operator KUA') {
                startRealisasiPolling();
                // ✅ Update button state saat masuk halaman
                updateRealisasiButtonState();
            }
            break;
        case 'verifikasiPage':
            loadVerifikasi();
            if (currentUser.role === 'Admin') {
                startVerifikasiAutoRefresh();
            }
            // Populate verifikasi KUA filter
            const verifikasiKUAFilter = document.getElementById('verifikasiKUAFilter');
            if (verifikasiKUAFilter && verifikasiKUAFilter.children.length === 1) {
                verifikasiKUAFilter.innerHTML = '<option value="">Semua KUA</option>' +
                    APP_CONFIG.KUA_LIST.map(kua => `<option value="${kua}">${kua}</option>`).join('');
            }
            break;
        case 'laporanPage':
            // Populate KUA selects for all export functions
            const exportRPDPerYearKua = document.getElementById('exportRPDPerYearKua');
            const exportRealisasiPerYearKua = document.getElementById('exportRealisasiPerYearKua');
            
            if (exportRPDPerYearKua && exportRPDPerYearKua.children.length === 1) {
                exportRPDPerYearKua.innerHTML += APP_CONFIG.KUA_LIST.map(kua => 
                    `<option value="${kua}">${kua}</option>`
                ).join('');
            }
            
            if (exportRealisasiPerYearKua && exportRealisasiPerYearKua.children.length === 1) {
                exportRealisasiPerYearKua.innerHTML += APP_CONFIG.KUA_LIST.map(kua => 
                    `<option value="${kua}">${kua}</option>`
                ).join('');
            }
            break;
    }
}

async function loadDashboardStats(forceRefresh = false) {
    console.log('[DASHBOARD] Loading stats', { forceRefresh });
    
    // ✅ ALWAYS cek cache dulu
    const cachedData = getLocalCache('dashboardStats');
    if (cachedData && !forceRefresh) {
        console.log('[DASHBOARD] Using cached stats - NO SERVER CALL');
        displayDashboardStats(cachedData);
        return;
    }
    
    // ✅ Only fetch dari server jika force refresh atau belum ada cache
    if (forceRefresh || !cachedData) {
        console.log('[DASHBOARD] Fetching from server...');
        // ❌ NO LOADING SPINNER
        
        try {
            const yearFilter = document.getElementById('dashboardYearFilter');
            const year = yearFilter ? yearFilter.value : new Date().getFullYear();
            
            const stats = await apiCall('getDashboardStats', { 
                year: year,
                kua: currentUser.kua,
                role: currentUser.role
            });
            
            console.log('[DASHBOARD] Stats received from server:', stats);
            
            // ✅ Update local cache
            updateLocalCache('dashboardStats', stats);
            displayDashboardStats(stats);
        } catch (error) {
            console.error('[DASHBOARD ERROR]', error);
            showNotification('Gagal memuat statistik dashboard', 'error');
        }
    }
}

function displayDashboardStats(stats) {
    console.log('[DASHBOARD] Displaying stats:', stats);
    
    // ✅ FIX: Normalisasi semua numeric values dengan fallback
    const budget = parseFloat(stats.budget) || parseFloat(stats.totalBudget) || 0;
    const totalRPD = parseFloat(stats.totalRPD) || parseFloat(stats.pagu) || 0;
    const totalRealisasi = parseFloat(stats.totalRealisasi) || parseFloat(stats.realisasi) || 0;
    const sisaBudget = budget - totalRealisasi;
    
    // ✅ FIX: Handle pending count dengan benar
    const pendingCount = parseInt(stats.pendingVerifikasi) || parseInt(stats.menungguVerifikasi) || 0;
    
    console.log('[DASHBOARD] Normalized values:', { 
        budget, 
        totalRPD, 
        totalRealisasi, 
        sisaBudget,
        pendingCount 
    });
    
    let statsHtml = '';
    
    if (currentUser.role === 'Admin') {
        // ✅ Admin Dashboard
        statsHtml = `
            <div class="stat-card">
                <div class="stat-icon">💰</div>
                <div class="stat-info">
                    <div class="stat-label">Total Budget</div>
                    <div class="stat-value">${formatCurrency(budget)}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-info">
                    <div class="stat-label">Total RPD</div>
                    <div class="stat-value">${formatCurrency(totalRPD)}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-info">
                    <div class="stat-label">Total Realisasi</div>
                    <div class="stat-value">${formatCurrency(totalRealisasi)}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⏳</div>
                <div class="stat-info">
                    <div class="stat-label">Menunggu Verifikasi</div>
                    <div class="stat-value">${pendingCount} Realisasi</div>
                </div>
            </div>
        `;
    } else {
        // ✅ Operator Dashboard
        statsHtml = `
            <div class="stat-card">
                <div class="stat-icon">💰</div>
                <div class="stat-info">
                    <div class="stat-label">Budget Tahunan</div>
                    <div class="stat-value">${formatCurrency(budget)}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-info">
                    <div class="stat-label">Total RPD</div>
                    <div class="stat-value">${formatCurrency(totalRPD)}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-info">
                    <div class="stat-label">Total Realisasi</div>
                    <div class="stat-value">${formatCurrency(totalRealisasi)}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">💵</div>
                <div class="stat-info">
                    <div class="stat-label">Sisa Budget</div>
                    <div class="stat-value" style="color: ${sisaBudget >= 0 ? '#28a745' : '#dc3545'}">
                        ${formatCurrency(sisaBudget)}
                    </div>
                </div>
            </div>
        `;
    }
    
    const statsGrid = document.getElementById('statsGrid');
    if (statsGrid) {
        statsGrid.innerHTML = statsHtml;
    }
}

// ⭐ NEW: Update dashboard stats by calculating from cache (no API call)
function updateDashboardFromCache() {
    console.log('[DASHBOARD] Recalculating stats from cache - NO API CALL');
    
    try {
        const cachedBudgets = getLocalCache('budgets');
        const cachedRPDs = getLocalCache('rpds');
        const cachedRealisasi = getLocalCache('realisasis');
        
        if (!cachedBudgets || cachedBudgets.length === 0) {
            console.warn('[DASHBOARD] No budget in cache, cannot recalculate');
            return;
        }
        
        // Calculate from cache
        const budget = cachedBudgets[0];
        const budgetTotal = parseFloat(budget.total) || parseFloat(budget.budget) || 0;
        
        // Calculate total RPD from cache
        const currentYear = new Date().getFullYear();
        const filteredRPDs = cachedRPDs ? cachedRPDs.filter(r => {
            const yearMatch = r.year == currentYear;
            const kuaMatch = currentUser.role === 'Admin' || r.kua === currentUser.kua;
            return yearMatch && kuaMatch;
        }) : [];
        
        const totalRPD = filteredRPDs.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);
        
        // Calculate total realisasi from cache
        const filteredRealisasi = cachedRealisasi ? cachedRealisasi.filter(r => {
            const yearMatch = r.year == currentYear;
            const kuaMatch = currentUser.role === 'Admin' || r.kua === currentUser.kua;
            return yearMatch && kuaMatch;
        }) : [];
        
        const totalRealisasi = filteredRealisasi.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);
        
        // Count pending verifikasi
        const pendingCount = filteredRealisasi.filter(r => r.status === 'Menunggu Verifikasi').length;
        
        const calculatedStats = {
            budget: budgetTotal,
            totalBudget: budgetTotal,
            totalRPD: totalRPD,
            pagu: totalRPD,
            totalRealisasi: totalRealisasi,
            realisasi: totalRealisasi,
            pendingVerifikasi: pendingCount,
            menungguVerifikasi: pendingCount
        };
        
        console.log('[DASHBOARD] Calculated stats from cache:', calculatedStats);
        
        // Display the calculated stats
        displayDashboardStats(calculatedStats);
        
    } catch (error) {
        console.error('[DASHBOARD] Error recalculating from cache:', error);
    }
}

// ===== BUDGET MANAGEMENT =====
async function loadBudgets(forceRefresh = false) {
    console.log('[BUDGET] Loading budgets', { forceRefresh });
    
    // ✅ ALWAYS cek cache dulu
    const cachedData = getLocalCache('budgets');
    if (cachedData && !forceRefresh) {
        console.log('[BUDGET] Using cached data - NO SERVER CALL');
        displayBudgets(cachedData);
        return;
    }
    
    // ✅ Only fetch dari server jika force refresh atau belum ada cache
    if (forceRefresh || !cachedData) {
        console.log('[BUDGET] Fetching from server...');
        // ❌ NO LOADING SPINNER
        
        try {
            const yearFilter = document.getElementById('budgetYearFilter');
            const year = yearFilter ? yearFilter.value : new Date().getFullYear();
            
            const budgets = await apiCall('getBudgets', { year: year });
            
            // ✅ Update local cache
            updateLocalCache('budgets', budgets);
            displayBudgets(budgets);
        } catch (error) {
            console.error('[BUDGET ERROR]', error);
        }
    }
}

function displayBudgets(budgets) {
    const tbody = document.querySelector('#budgetTable tbody');
    
    // ✅ FIX: Pastikan semua field numeric ada dan valid
    tbody.innerHTML = budgets.map((budget, index) => {
        const budgetTotal = parseFloat(budget.total) || parseFloat(budget.budget) || 0;
        const totalRPD = parseFloat(budget.totalRPD) || parseFloat(budget.pagu) || 0;
        const totalRealisasi = parseFloat(budget.totalRealisasi) || parseFloat(budget.realisasi) || 0;
        const sisaBudget = budgetTotal - totalRealisasi;
        
        return `
        <tr>
            <td>${index + 1}</td>
            <td>${budget.kua}</td>
            <td>${budget.year}</td>
            <td>${formatCurrency(budgetTotal)}</td>
            <td>${formatCurrency(totalRPD)}</td>
            <td>${formatCurrency(totalRealisasi)}</td>
            <td>${formatCurrency(sisaBudget)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm" onclick='editBudget(${JSON.stringify(budget)})'>Edit</button>
                </div>
            </td>
        </tr>
    `;
    }).join('');
}

function showBudgetModal(budget = null) {
    console.log('[BUDGET MODAL]', budget);
    
    editingBudget = budget;
    
    let modal = document.getElementById('modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    const currentYear = new Date().getFullYear();
    const budgetTotal = budget ? (parseFloat(budget.total) || parseFloat(budget.budget) || 0) : 0;
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${budget ? 'Edit Budget' : 'Tambah Budget'}</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <form id="budgetForm">
                <div class="form-group">
                    <label>Pilih KUA</label>
                    <select id="budgetKUA" required ${budget ? 'disabled' : ''}>
                        <option value="">-- Pilih KUA --</option>
                        ${APP_CONFIG.KUA_LIST.map(kua => `
                            <option value="${kua}" ${budget && budget.kua === kua ? 'selected' : ''}>${kua}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Tahun Anggaran</label>
                    <select id="budgetYear" required ${budget ? 'disabled' : ''}>
                        ${[currentYear - 1, currentYear, currentYear + 1].map(year => `
                            <option value="${year}" ${budget && budget.year == year ? 'selected' : year === currentYear ? 'selected' : ''}>${year}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Budget Tahunan (Rp)</label>
                    <input type="text" 
                           id="budgetAmount" 
                           class="auto-format-number"
                           required 
                           value="${budgetTotal}" 
                           placeholder="0">
                    <small style="color: #666;">Otomatis terformat dengan separator ribuan</small>
                </div>
                <button type="submit" class="btn">Simpan</button>
            </form>
        </div>
    `;
    
    modal.classList.add('active');
    
    // ✅ Setup auto-format
    setTimeout(() => {
        setupAllAutoFormatInputs('.auto-format-number');
    }, 100);
    
    document.getElementById('budgetForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const budgetInput = document.getElementById('budgetAmount');
        // ✅ Parse formatted value
        const rawValue = parseFormattedNumber(budgetInput.value);
        
        const budgetData = {
            id: editingBudget?.id,
            kua: document.getElementById('budgetKUA').value,
            year: parseInt(document.getElementById('budgetYear').value),
            total: rawValue
        };
        
        console.log('[BUDGET FORM] Submitting:', budgetData);
        
        try {
            await apiCall('saveBudget', budgetData);
            showNotification('Budget berhasil disimpan', 'success');
            
            editingBudget = null;
            closeModal();
            
            clearLocalCache('budgets');
            clearLocalCache('dashboardStats');
            
            await Promise.all([
                loadBudgets(true),
                loadDashboardStats(true)
            ]);
            
        } catch (error) {
            console.error('[BUDGET FORM ERROR]', error);
            showNotification(error.message || 'Gagal menyimpan budget', 'error');
        }
    });
}

function editBudget(budget) {
    showBudgetModal(budget);
}

// ===== USER MANAGEMENT =====
async function loadUsers(forceRefresh = false) {
    console.log('[USER] Loading users');
    
    if (!forceRefresh) {
        const cachedData = getCache('users');
        if (cachedData) {
            displayUsers(cachedData);
            return;
        }
    }
    
    try {
        const users = await apiCall('getUsers');
        setCache('users', users);
        displayUsers(users);
    } catch (error) {
        console.error('[USER ERROR]', error);
    }
}

function displayUsers(users) {
    const tbody = document.querySelector('#userTable tbody');
    tbody.innerHTML = users.map((user, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${user.username}</td>
            <td>${user.name}</td>
            <td>${user.role}</td>
            <td>${user.kua || '-'}</td>
            <td><span class="badge badge-${user.status === 'Active' ? 'success' : 'danger'}">${user.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm" onclick='editUser(${JSON.stringify(user)})'>Edit</button>
                    ${user.status === 'Active' ? `<button class="btn btn-danger btn-sm" onclick="deleteUserConfirm('${user.id}')">Nonaktifkan</button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function showUserModal(user = null) {
    console.log('[USER MODAL]', user);
    let modal = document.getElementById('modal');

    if (!modal) {

        modal = document.createElement('div');

        modal.id = 'modal';

        modal.className = 'modal';

        document.body.appendChild(modal);

    }
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${user ? 'Edit Pengguna' : 'Tambah Pengguna'}</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <form id="userForm">
                <div class="form-group">
                    <label>Username</label>
                    <input type="text" id="userUsername" required value="${user ? user.username : ''}" ${user ? 'readonly' : ''}>
                </div>
                ${!user ? `
                <div class="form-group">
                    <label>Password</label>
                    <div class="password-input-group">
                        <input type="password" id="userPassword" required minlength="6">
                        <button type="button" class="password-toggle" onclick="togglePassword('userPassword')">👁️</button>
                    </div>
                </div>
                ` : ''}
                <div class="form-group">
                    <label>Nama Lengkap</label>
                    <input type="text" id="userName" required value="${user ? user.name : ''}">
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select id="userRole" required>
                        <option value="Admin" ${user && user.role === 'Admin' ? 'selected' : ''}>Admin</option>
                        <option value="Operator KUA" ${user && user.role === 'Operator KUA' ? 'selected' : ''}>Operator KUA</option>
                    </select>
                </div>
                <div class="form-group" id="kuaGroup" style="display: ${user && user.role === 'Operator KUA' || !user ? 'block' : 'none'}">
                    <label>KUA</label>
                    <select id="userKUA">
                        <option value="">-- Pilih KUA --</option>
                        ${APP_CONFIG.KUA_LIST.map(kua => `
                            <option value="${kua}" ${user && user.kua === kua ? 'selected' : ''}>${kua}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="userStatus">
                        <option value="Active" ${!user || user.status === 'Active' ? 'selected' : ''}>Aktif</option>
                        <option value="Inactive" ${user && user.status === 'Inactive' ? 'selected' : ''}>Nonaktif</option>
                    </select>
                </div>
                <button type="submit" class="btn">Simpan</button>
            </form>
        </div>
    `;
    
    modal.classList.add('active');
    
    document.getElementById('userRole').addEventListener('change', function() {
        document.getElementById('kuaGroup').style.display = this.value === 'Operator KUA' ? 'block' : 'none';
    });
    
    document.getElementById('userForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('[USER] Saving user');
        
        const role = document.getElementById('userRole').value;
        const kua = document.getElementById('userKUA').value;
        
        if (role === 'Operator KUA' && !kua) {
            showNotification('Pilih KUA untuk Operator', 'warning');
            return;
        }
        
        try {
            await apiCall('saveUser', {
                id: user ? user.id : null,
                username: document.getElementById('userUsername').value,
                password: user ? null : document.getElementById('userPassword').value,
                name: document.getElementById('userName').value,
                role: role,
                kua: role === 'Operator KUA' ? kua : '',
                status: document.getElementById('userStatus').value,
                adminId: currentUser.id,
                adminUsername: currentUser.username
            });
            
            showNotification('Pengguna berhasil disimpan', 'success');
            closeModal();
            loadUsers();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
}

async function saveBudget(data) {
    console.log('[SAVE_BUDGET] Starting save process');
    
    try {
        // Panggil API untuk save budget
        await apiCall('saveBudget', {
            id: data.id || null,
            kua: data.kua,
            year: data.year,
            budget: data.budget,
            userId: currentUser.id,
            username: currentUser.username
        });
        
        // ✅ STEP 1: Hapus cache yang terkait dengan budget
        console.log('[SAVE_BUDGET] Invalidating related cache');
        clearLocalCache('budgets');        // Hapus cache budgets
        clearLocalCache('dashboardStats'); // Hapus cache dashboard stats
        
        // ✅ STEP 2: Tutup modal
        closeModal();
        
        // ✅ STEP 3: Reload data dengan FORCE REFRESH (bypass cache)
        console.log('[SAVE_BUDGET] Reloading fresh data');
        await loadBudgets(true);           // true = force refresh dari server
        await loadDashboardStats(true);    // true = force refresh dari server
        
        // ✅ STEP 4: Tampilkan notifikasi sukses
        showNotification('Budget berhasil disimpan', 'success');
        
    } catch (error) {
        console.error('[SAVE_BUDGET ERROR]', error);
        showNotification(error.message, 'error');
    }
}

async function saveUser(data) {
    console.log('[SAVE_USER] Starting save process');
    
    try {
        const role = document.getElementById('userRole').value;
        const kua = document.getElementById('userKUA').value;
        
        if (role === 'Operator KUA' && !kua) {
            showNotification('Pilih KUA untuk Operator', 'warning');
            return;
        }
        
        // Panggil API untuk save user
        await apiCall('saveUser', {
            id: data ? data.id : null,
            username: document.getElementById('userUsername').value,
            password: data ? null : document.getElementById('userPassword').value,
            name: document.getElementById('userName').value,
            role: role,
            kua: role === 'Operator KUA' ? kua : '',
            status: document.getElementById('userStatus').value,
            adminId: currentUser.id,
            adminUsername: currentUser.username
        });
        
        // ✅ STEP 1: Hapus cache users
        console.log('[SAVE_USER] Invalidating users cache');
        clearLocalCache('users');
        
        // ✅ STEP 2: Tutup modal
        closeModal();
        
        // ✅ STEP 3: Reload data dengan FORCE REFRESH
        console.log('[SAVE_USER] Reloading fresh data');
        await loadUsers(true); // true = force refresh
        
        // ✅ STEP 4: Notifikasi
        showNotification('Pengguna berhasil disimpan', 'success');
        
    } catch (error) {
        console.error('[SAVE_USER ERROR]', error);
        showNotification(error.message, 'error');
    }
}

function editUser(user) {
    showUserModal(user);
}

async function deleteUserConfirm(userId) {
    if (confirm('Yakin ingin menonaktifkan pengguna ini?')) {
        console.log('[DELETE_USER] Deleting user:', userId);
        
        try {
            await apiCall('deleteUser', {
                id: userId,
                adminId: currentUser.id,
                adminUsername: currentUser.username
            });
            
            // ✅ Hapus cache dan reload
            clearLocalCache('users');
            await loadUsers(true);
            
            showNotification('Pengguna berhasil dinonaktifkan', 'success');
        } catch (error) {
            console.error('[DELETE_USER ERROR]', error);
            showNotification(error.message, 'error');
        }
    }
}

// ===== RPD APP_CONFIG =====
async function loadRPDConfig(forceRefresh = false) {
    console.log('[CONFIG] Loading RPD & Realisasi config', { forceRefresh });
    
    // ✅ FIX ISSUE #5: Cek local cache dulu (sudah di-preload)
    const cachedData = getLocalCache('config');
    if (cachedData && !forceRefresh) {
        console.log('[CONFIG] Using cached config - NO SERVER CALL');
        displayRPDConfig(cachedData);
        return;
    }
    
    // ✅ Only fetch dari server jika force refresh atau belum ada cache
    if (forceRefresh || !cachedData) {
        console.log('[CONFIG] Fetching from server...');
        
        try {
            const config = await apiCall('getRPDConfig');
            console.log('[CONFIG] Config received from server:', config);
            
            // ✅ Update local cache
            updateLocalCache('config', config);
            
            displayRPDConfig(config);
        } catch (error) {
            console.error('[CONFIG ERROR]', error);
            showNotification('Gagal memuat konfigurasi', 'error');
        }
    }
}

function displayRPDConfig(config) {
    console.log('[CONFIG] Displaying config:', config);
    
    const rpdStatusEl = document.getElementById('rpdStatus');
    const realisasiStatusEl = document.getElementById('realisasiStatus');
    const maxFileSizeEl = document.getElementById('realisasiMaxFileSize');
    const maxFilesEl = document.getElementById('realisasiMaxFiles');
    
    if (rpdStatusEl) {
        rpdStatusEl.value = config.RPD_STATUS || 'open';
        console.log('[CONFIG] Set RPD Status to:', rpdStatusEl.value);
    } else {
        console.error('[CONFIG] rpdStatus element not found!');
    }
    
    if (realisasiStatusEl) {
        realisasiStatusEl.value = config.REALISASI_STATUS || 'open';
        console.log('[CONFIG] Set Realisasi Status to:', realisasiStatusEl.value);
    } else {
        console.error('[CONFIG] realisasiStatus element not found!');
    }
    
    if (maxFileSizeEl) {
        maxFileSizeEl.value = config.REALISASI_MAX_FILE_SIZE || '5';
        console.log('[CONFIG] Set Max File Size to:', maxFileSizeEl.value);
    } else {
        console.error('[CONFIG] realisasiMaxFileSize element not found!');
    }
    
    if (maxFilesEl) {
        maxFilesEl.value = config.REALISASI_MAX_FILES || '10';
        console.log('[CONFIG] Set Max Files to:', maxFilesEl.value);
    } else {
        console.error('[CONFIG] realisasiMaxFiles element not found!');
    }
}

async function saveRPDConfig() {
    console.log('[SAVE_CONFIG] Starting save process');
    
    try {
        await apiCall('saveRPDConfig', {
            rpdStatus: document.getElementById('rpdStatus').value,
            realisasiStatus: document.getElementById('realisasiStatus').value,
            realisasiMaxFileSize: document.getElementById('realisasiMaxFileSize').value,
            realisasiMaxFiles: document.getElementById('realisasiMaxFiles').value,
            userId: currentUser.id,
            username: currentUser.username
        });
        
        // ✅ Hapus cache config
        console.log('[SAVE_CONFIG] Invalidating config cache');
        clearLocalCache('config');
        
        showNotification('Konfigurasi berhasil disimpan', 'success');
        
    } catch (error) {
        console.error('[SAVE_CONFIG ERROR]', error);
        showNotification(error.message, 'error');
    }
}

// ===== RPD MANAGEMENT =====
async function loadRPDs(forceRefresh = false) {
    console.log('[RPD] Loading RPDs', { forceRefresh });
    
    // ✅ ALWAYS cek cache dulu
    const cachedData = getLocalCache('rpds');
    if (cachedData && !forceRefresh) {
        console.log('[RPD] Using cached data - NO SERVER CALL');
        displayRPDs(cachedData);
        return;
    }
    
    // ✅ Only fetch dari server jika force refresh atau belum ada cache
    if (forceRefresh || !cachedData) {
        console.log('[RPD] Fetching from server...');
        // ❌ NO LOADING SPINNER
        
        try {
            const yearFilter = document.getElementById('rpdYearFilter');
            const year = yearFilter ? yearFilter.value : new Date().getFullYear();
            
            let rpds;
            
            if (currentUser.role === 'Admin') {
                // ✅ Admin - Get all KUA RPDs
                rpds = await apiCall('getRPDs', { year: year });
                
                // ✅ FIX ISSUE #4: Apply KUA filter untuk Admin
                const kuaFilter = document.getElementById('rpdKUAFilter');
                if (kuaFilter && kuaFilter.value) {
                    const selectedKUA = kuaFilter.value;
                    console.log('[RPD] Filtering by KUA:', selectedKUA);
                    rpds = rpds.filter(rpd => rpd.kua === selectedKUA);
                }
            } else {
                // Operator - Get only own KUA
                rpds = await apiCall('getRPDs', { kua: currentUser.kua, year: year });
            }
            
            rpds = sortByMonth(rpds);
            
            // ✅ Update local cache
            updateLocalCache('rpds', rpds);
            displayRPDs(rpds);
        } catch (error) {
            console.error('[RPD ERROR]', error);
        }
    }
}

function displayRPDs(rpds) {
    const tbody = document.querySelector('#rpdTable tbody');
    const thKUA = document.querySelectorAll('.th-kua');
    
    // ✅ FIX: READ FILTER VALUE
    const kuaFilter = document.getElementById('rpdKUAFilter');
    const yearFilter = document.getElementById('rpdYearFilter');
    
    const selectedKUA = kuaFilter ? kuaFilter.value : '';
    const selectedYear = yearFilter ? yearFilter.value : new Date().getFullYear();
    
    console.log('[RPD] Displaying with filters:', {
        kua: selectedKUA,
        year: selectedYear,
        role: currentUser.role
    });
    
    // ✅ APPLY FILTERS
    let filteredData = rpds.filter(rpd => {
        let passKUA = !selectedKUA || rpd.kua === selectedKUA;
        let passYear = !selectedYear || rpd.year == selectedYear;
        
        return passKUA && passYear;
    });
    
    console.log('[RPD] Filtered from', rpds.length, 'to', filteredData.length, 'records');
    
    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Belum ada data RPD</td></tr>';
        return;
    }
    
    let totalNominal = 0;
    
    const rows = filteredData.map((rpd, index) => {
        totalNominal += parseFloat(rpd.total || 0);
        
        const rpdEscaped = JSON.stringify(rpd).replace(/"/g, '&quot;');
        
        // ✅ KUA column visibility based on role
        const kuaColumn = currentUser.role === 'Admin' ? 
            `<td>${rpd.kua || '-'}</td>` : '';
        
        return `
        <tr>
            <td>${index + 1}</td>
            ${kuaColumn}
            <td>${rpd.month || '-'}</td>
            <td>${rpd.year || '-'}</td>
            <td>${formatCurrency(rpd.total || 0)}</td>
            <td>${rpd.createdAt ? formatDate(rpd.createdAt) : '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm" onclick='viewRPD(${rpdEscaped})'>Lihat</button>
                    ${currentUser.role !== 'Admin' ? 
                        `<button class="btn btn-sm" onclick='editRPD(${rpdEscaped})'>Edit</button>` : ''}
                </div>
            </td>
        </tr>
        `;
    }).join('');
    
    const kuaTotalColumn = currentUser.role === 'Admin' ? '<td></td>' : '';
    
    const totalRow = `
        <tr style="background: #f8f9fa; font-weight: bold;">
            <td></td>
            ${kuaTotalColumn}
            <td colspan="2" style="text-align: right;">TOTAL:</td>
            <td>${formatCurrency(totalNominal)}</td>
            <td colspan="2"></td>
        </tr>
    `;
    
    tbody.innerHTML = rows + totalRow;
    console.log('[RPD] Displayed', filteredData.length, 'records');
}

// Handler untuk filter KUA change (Admin only)
function onRPDKUAFilterChange() {
    console.log('[RPD] KUA filter changed');
    
    const cachedData = getCache('rpds');
    const kuaFilter = document.getElementById('rpdKUAFilter');
    const selectedKUA = kuaFilter ? kuaFilter.value : '';
    
    if (cachedData && selectedKUA === '') {
        // If "All KUA" selected and we have cache, use it
        displayRPDs(cachedData);
    } else {
        // Otherwise reload from server
        loadRPDs(true);
    }
}

async function showRPDModal(rpd = null) {
    console.log('[RPD MODAL]', rpd);
    
    // Check if config allows RPD input (tanpa loading)
    try {
        const config = await apiCall('getRPDConfig');
        if (config.RPD_STATUS === 'closed' && currentUser.role !== 'Admin') {
            showNotification('Pengisian RPD sedang ditutup', 'warning');
            return;
        }
    } catch (error) {
        console.error('[RPD ERROR] Failed to check config', error);
    }

    // ✅ OPTIMIZED: Get budget info dari cache dan hitung totalRPD dari rpdTable
    let budgetInfo = { budget: 0, totalRPD: 0, sisaRPD: 0 };
    try {
        console.log('[RPD MODAL] Getting budget info from cache...');
        
        // Get budget dari cache (budget NEVER changes, always in cache)
        const cachedBudgets = getLocalCache('budgets');
        
        if (cachedBudgets && cachedBudgets.length > 0) {
            const budget = cachedBudgets[0];
            const budgetTotal = parseFloat(budget.total) || parseFloat(budget.budget) || 0;
            
            // ⭐ OPTIMIZED: Hitung totalRPD dari data RPD yang sudah di-load di rpdTable
            const cachedRPDs = getLocalCache('rpds');
            let calculatedTotalRPD = 0;
            
            if (cachedRPDs && cachedRPDs.length > 0) {
                // Filter RPDs sesuai dengan user dan year yang sedang aktif
                const currentYear = new Date().getFullYear();
                const filteredRPDs = cachedRPDs.filter(r => {
                    const yearMatch = r.year == currentYear;
                    const kuaMatch = currentUser.role === 'Admin' || r.kua === currentUser.kua;
                    return yearMatch && kuaMatch;
                });
                
                // Calculate total dari filtered RPDs
                calculatedTotalRPD = filteredRPDs.reduce((sum, r) => {
                    return sum + (parseFloat(r.total) || 0);
                }, 0);
                
                console.log('[RPD MODAL] Calculated totalRPD from table:', {
                    totalRPDs: filteredRPDs.length,
                    calculatedTotal: calculatedTotalRPD
                });
            }
            
            budgetInfo = {
                budget: budgetTotal,
                totalRPD: calculatedTotalRPD,
                sisaRPD: budgetTotal - calculatedTotalRPD
            };
            
            console.log('[RPD MODAL] Budget info from cache + calculated RPD:', budgetInfo);
        } else {
            console.warn('[RPD MODAL] No budget in cache - budget should have been loaded at startup!');
        }
    } catch (error) {
        console.error('[RPD ERROR] Failed to get budget:', error);
    }

    // Create modal if doesn't exist
    let modal = document.getElementById('modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    // ✅ FIX: Prepare RPD data dengan benar
    const rpdData = rpd && rpd.data ? rpd.data : {};
    console.log('[RPD MODAL] RPD data:', rpdData);
    
    const currentYear = new Date().getFullYear();
    
    // ✅ FIX: Build parameters HTML dengan logging detail
    let parametersHTML = '';
    
    Object.entries(APP_CONFIG.BOP.RPD_PARAMETERS).forEach(([code, param]) => {
        console.log('[RPD MODAL] Building HTML for code:', code, 'param:', param);
        
        parametersHTML += `
            <div class="rpd-item">
                <h4>${code} - ${param.name}</h4>
        `;
        
        param.items.forEach((item, itemIndex) => {
            // ✅ FIX: Define value BEFORE using it
            const itemValue = rpdData[code] && rpdData[code][item] ? rpdData[code][item] : 0;
            const inputId = `rpd_${code}_${item.replace(/\s+/g, '_')}`;
            
            console.log(`[RPD MODAL] Item ${itemIndex}: ${item}, value:`, itemValue);
            
            parametersHTML += `
                <div class="rpd-subitem">
                    <label>${item}</label>
                    <input type="text" 
                           id="${inputId}"
                           class="rpd-input auto-format-number"
                           data-code="${code}" 
                           data-item="${item}" 
                           value="${itemValue}" 
                           placeholder="0">
                </div>
            `;
        });
        
        parametersHTML += `</div>`;
    });
    
    console.log('[RPD MODAL] Parameters HTML built successfully');
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <h3>${rpd ? 'Edit RPD' : 'Buat RPD Baru'}</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            
            <div class="summary-box">
                <div class="summary-item">
                    <span>Budget Tahunan:</span>
                    <strong>${formatCurrency(budgetInfo.budget)}</strong>
                </div>
                <div class="summary-item">
                    <span>Total RPD yang Sudah Disubmit:</span>
                    <strong>${formatCurrency(budgetInfo.totalRPD)}</strong>
                </div>
                <div class="summary-item">
                    <span>Sisa Nominal RPD:</span>
                    <strong style="color: #28a745;">${formatCurrency(budgetInfo.sisaRPD)}</strong>
                </div>
            </div>
            
            <form id="rpdForm" data-edit-mode="${rpd ? 'true' : 'false'}" data-existing-rpd-total="${rpd ? (rpd.total || 0) : 0}">
                <div class="form-group">
                    <label>Bulan</label>
                    <select id="rpdMonth" required ${rpd ? 'disabled' : ''}>
                        <option value="">-- Pilih Bulan --</option>
                        ${APP_CONFIG.MONTHS.map((month, index) => `
                            <option value="${month}" ${rpd && rpd.month === month ? 'selected' : ''}>${month}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Tahun</label>
                    <select id="rpdYear" required ${rpd ? 'disabled' : ''}>
                        ${[currentYear - 1, currentYear, currentYear + 1].map(year => `
                            <option value="${year}" ${rpd && rpd.year == year ? 'selected' : year === currentYear ? 'selected' : ''}>${year}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div id="rpdParameters">
                    ${parametersHTML}
                </div>
                
                <div class="summary-box">
                    <div class="summary-item">
                        <span>Total RPD:</span>
                        <strong id="rpdTotal">${formatCurrency(0)}</strong>
                    </div>
                </div>
                
                <button type="submit" class="btn">Simpan RPD</button>
            </form>
        </div>
    `;
    
    modal.classList.add('active');
    
    // ✅ Setup auto-format untuk semua inputs
    console.log('[RPD MODAL] Setting up auto-format for inputs...');
    setTimeout(() => {
        setupAllAutoFormatInputs('.auto-format-number');
        
        // Calculate total on input change
        const inputs = document.querySelectorAll('.rpd-input');
        console.log('[RPD MODAL] Found', inputs.length, 'rpd-input elements');
        
        inputs.forEach((input, index) => {
            console.log('[RPD MODAL] Attaching listener to input', index + 1, ':', input.id);
            input.addEventListener('input', function() {
                calculateRPDTotal();
                modalHasChanges = true; // ✅ Track changes
            });
        });
        
        calculateRPDTotal();
    }, 100);
    
    // ✅ Reset modalHasChanges
    modalHasChanges = false;
    
    // Form submit handler
    document.getElementById('rpdForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('[RPD] Submitting RPD form');
        
        const month = document.getElementById('rpdMonth').value;
        const year = document.getElementById('rpdYear').value;
        
        // ✅ UPDATED VALIDATION: Check for duplicate month and config status
        if (!rpd || !rpd.id) {
            // For NEW RPD, check duplicate month
            const cachedRPDs = getLocalCache('rpds') || [];
            const isDuplicate = cachedRPDs.some(existingRPD => 
                existingRPD.month === month && 
                existingRPD.year == year &&
                existingRPD.kua === currentUser.kua
            );
            
            if (isDuplicate) {
                showNotification('RPD untuk bulan ' + month + ' ' + year + ' sudah ada. Tidak boleh duplicate.', 'error');
                return;
            }
            
            // Check config status
            try {
                const config = await apiCall('getRPDConfig');
                if (config.RPD_STATUS === 'closed' && currentUser.role !== 'Admin') {
                    showNotification('Pengisian RPD sedang ditutup', 'warning');
                    return;
                }
            } catch (error) {
                console.error('[RPD VALIDATION] Failed to check config', error);
            }
        }
        
        // ✅ Kumpulkan data RPD dengan parse formatted values
        const rpdData = {};
        let total = 0;
        
        console.log('[RPD] Collecting data from inputs...');
        
        Object.keys(APP_CONFIG.BOP.RPD_PARAMETERS).forEach(code => {
            rpdData[code] = {};
            const items = document.querySelectorAll(`.rpd-input[data-code="${code}"]`);
            
            console.log(`[RPD] Processing code ${code}, found ${items.length} inputs`);
            
            items.forEach((input, index) => {
                const item = input.dataset.item;
                // ✅ Parse formatted value
                const value = parseFormattedNumber(input.value);
                rpdData[code][item] = value;
                total += value;
                
                console.log(`[RPD] ${code} - ${item}: ${input.value} → ${value}`);
            });
        });
        
        console.log('[RPD] Final data collected:', rpdData);
        console.log('[RPD] Total:', total);
        
        if (total === 0) {
            showNotification('Total RPD tidak boleh 0. Silakan isi nominal untuk minimal satu item.', 'warning');
            return;
        }
        
        try {
            const submitData = {
                id: rpd?.id || null,
                kua: currentUser.kua,
                month: month,
                year: parseInt(year),
                total: total,
                data: rpdData,
                userId: currentUser.id,
                username: currentUser.username
            };
            
            console.log('[RPD FORM] Submitting to API:', submitData);
            
            await apiCall('saveRPD', submitData);
            
            showNotification('RPD berhasil disimpan', 'success');
            
            // ⭐ OPTIMIZED: Only clear RPD cache (budget never changes!)
            clearLocalCache('rpds');
            
            // Clear Smart Cache untuk RPD saja
            if (window.SmartCacheManager) {
                SmartCacheManager.invalidateType('RPDS');
                // Budget TIDAK di-invalidate karena tidak berubah
                // Dashboard stats akan di-recalculate dari cache
            }
            
            modalHasChanges = false; // ✅ Reset changes flag
            closeModal(true); // ✅ Skip confirmation karena sudah saved
            
            // ✅ OPTIMIZED: Hanya reload RPDs, dashboard akan recalculate
            await loadRPDs(true);
            
            // ⭐ PENTING: Recalculate dashboard stats dari cache tanpa API call
            updateDashboardFromCache();
            
        } catch (error) {
            console.error('[RPD FORM ERROR]', error);
            showNotification(error.message, 'error');
        }
    });
}

// Find rpdForm submit handler

async function submitRPD(e) {
  e.preventDefault();
  
  // ✅ Collect data properly
  const rpdData = {};
  let total = 0;
  
  Object.keys(APP_CONFIG.BOP.RPD_PARAMETERS).forEach(code => {
    rpdData[code] = {};
    APP_CONFIG.BOP.RPD_PARAMETERS[code].items.forEach(item => {
      const inputId = `rpd_${code}_${item.replace(/\s+/g, '_')}`;
      const value = parseFloat(document.getElementById(inputId)?.value) || 0;
      rpdData[code][item] = value;
      total += value;
    });
  });
  
  const submitData = {
    id: editingRPD?.id,
    kua: currentUser.kua,
    userId: currentUser.id,
    month: document.getElementById('rpdMonth').value,
    year: document.getElementById('rpdYear').value,
    data: rpdData,  // ✅ This is the nested object
    total: total
  };
  
  console.log('[RPD FORM] Submitting:', JSON.stringify(submitData).substring(0, 200));
  
  try {
    const result = await apiCall('saveRPD', submitData);
    showNotification(result.message || 'RPD berhasil disimpan', 'success');
    closeModal();
    loadRPDs();
  } catch (error) {
    console.error('[RPD FORM ERROR]', error);
    showNotification(error.message || 'Gagal menyimpan RPD', 'error');
  }
}

function calculateRPDTotal() {
    let total = 0;
    
    console.log('[CALCULATE_RPD_TOTAL] Starting calculation...');
    
    Object.keys(APP_CONFIG.BOP.RPD_PARAMETERS).forEach(code => {
        const items = document.querySelectorAll(`.rpd-input[data-code="${code}"]`);
        
        items.forEach(input => {
            // ✅ Parse formatted value
            const value = parseFormattedNumber(input.value);
            total += value;
            
            console.log(`[CALCULATE_RPD_TOTAL] ${input.id}: ${input.value} → ${value}`);
        });
    });
    
    console.log('[CALCULATE_RPD_TOTAL] Total:', total);
    
    const totalElement = document.getElementById('rpdTotal');
    if (totalElement) {
        totalElement.textContent = formatCurrency(total);
    }
    
    // ✅ UPDATE SUMMARY BOX - Update sisa nominal RPD secara real-time
    updateRPDSummaryBox(total);
}

// ✅ NEW FUNCTION: Update summary box dengan total RPD yang sedang diinput
function updateRPDSummaryBox(currentTotal) {
    const budgetTahunanEl = document.querySelector('.summary-box .summary-item:nth-child(1) strong');
    const totalRPDEl = document.querySelector('.summary-box .summary-item:nth-child(2) strong');
    const sisaNominalEl = document.querySelector('.summary-box .summary-item:nth-child(3) strong');
    
    if (!budgetTahunanEl || !totalRPDEl || !sisaNominalEl) {
        console.log('[UPDATE_SUMMARY] Summary elements not found');
        return;
    }
    
    // Get current budget tahunan (tetap)
    const budgetTahunanText = budgetTahunanEl.textContent.replace(/[^\d]/g, '');
    const budgetTahunan = parseFloat(budgetTahunanText) || 0;
    
    // Get form data
    const form = document.getElementById('rpdForm');
    const isEdit = form?.dataset?.editMode === 'true';
    const existingRPDTotal = parseFloat(form?.dataset?.existingRpdTotal || 0);
    
    console.log('[UPDATE_SUMMARY] Form data:', { isEdit, existingRPDTotal });
    
    // ⭐ OPTIMIZED: Hitung baseline total RPD dari data RPD yang sudah di-cache
    const cachedRPDs = getLocalCache('rpds');
    let baselineTotalRPD = 0;
    
    if (cachedRPDs && cachedRPDs.length > 0) {
        // Filter RPDs sesuai dengan user dan year yang sedang aktif
        const currentYear = new Date().getFullYear();
        const filteredRPDs = cachedRPDs.filter(r => {
            const yearMatch = r.year == currentYear;
            const kuaMatch = currentUser.role === 'Admin' || r.kua === currentUser.kua;
            return yearMatch && kuaMatch;
        });
        
        // Calculate total dari filtered RPDs
        baselineTotalRPD = filteredRPDs.reduce((sum, r) => {
            return sum + (parseFloat(r.total) || 0);
        }, 0);
        
        console.log('[UPDATE_SUMMARY] Baseline total RPD calculated from table:', {
            totalRPDs: filteredRPDs.length,
            baselineTotalRPD
        });
    }
    
    // ✅ Calculate new total RPD
    let newTotalRPD;
    if (isEdit) {
        // Edit mode: totalRPD = baseline - existing + current
        newTotalRPD = baselineTotalRPD - existingRPDTotal + currentTotal;
        console.log('[UPDATE_SUMMARY] EDIT MODE:', {
            baselineTotalRPD,
            existingRPDTotal,
            currentTotal,
            calculation: `${baselineTotalRPD} - ${existingRPDTotal} + ${currentTotal} = ${newTotalRPD}`
        });
    } else {
        // New mode: totalRPD = baseline + current
        newTotalRPD = baselineTotalRPD + currentTotal;
        console.log('[UPDATE_SUMMARY] NEW MODE:', {
            baselineTotalRPD,
            currentTotal,
            calculation: `${baselineTotalRPD} + ${currentTotal} = ${newTotalRPD}`
        });
    }
    
    // Calculate sisa
    const sisaNominal = budgetTahunan - newTotalRPD;
    
    console.log('[UPDATE_SUMMARY] Final:', {
        budgetTahunan,
        newTotalRPD,
        sisaNominal
    });
    
    // Update display dengan warna
    totalRPDEl.textContent = formatCurrency(newTotalRPD);
    sisaNominalEl.textContent = formatCurrency(sisaNominal);
    
    // ✅ Add visual feedback jika melebihi budget
    if (sisaNominal < 0) {
        sisaNominalEl.style.color = '#dc3545'; // Red
        totalRPDEl.style.color = '#dc3545'; // Red
    } else if (sisaNominal < budgetTahunan * 0.1) {
        // Warning jika sisa < 10%
        sisaNominalEl.style.color = '#ffc107'; // Yellow
        totalRPDEl.style.color = '#333'; // Default
    } else {
        sisaNominalEl.style.color = '#28a745'; // Green
        totalRPDEl.style.color = '#333'; // Default
    }
}

function viewRPD(rpd) {
    console.log('[RPD] Viewing RPD:', rpd);
    
    let modal = document.getElementById('modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    // ✅ FIX ISSUE #2: Format detail dengan logic yang sama seperti realisasi
    let detailHTML = '';
    Object.entries(rpd.data).forEach(([code, items]) => {
        const param = APP_CONFIG.BOP.RPD_PARAMETERS[code];
        
        const itemsArray = Object.entries(items);
        const hasMultipleItems = itemsArray.length > 1;
        const onlyNominal = itemsArray.length === 1 && itemsArray[0][0] === 'Nominal';
        
        console.log(`[RPD] ${code} - ${param.name}:`, {
            itemsCount: itemsArray.length,
            hasMultipleItems,
            onlyNominal,
            items: items
        });
        
        detailHTML += `<div class="rpd-item">`;
        
        if (onlyNominal) {
            // ✅ Jika hanya "Nominal", tampilkan value langsung di samping nama akun
            const nominalValue = items['Nominal'];
            detailHTML += `
                <div class="rpd-subitem">
                    <span style="font-weight: 600; color: #333;">${code} - ${param.name}</span>
                    <strong style="font-size: 16px; color: #667eea;">${formatCurrency(nominalValue)}</strong>
                </div>
            `;
        } else if (hasMultipleItems) {
            // ✅ Jika ada breakdown, jangan tampilkan total parent
            detailHTML += `<h4>${code} - ${param.name}</h4>`;
            
            itemsArray.forEach(([item, value]) => {
                detailHTML += `
                    <div class="rpd-subitem">
                        <span>${item}</span>
                        <strong>${formatCurrency(value)}</strong>
                    </div>
                `;
            });
        } else {
            detailHTML += `<h4>${code} - ${param.name}</h4>`;
            itemsArray.forEach(([item, value]) => {
                detailHTML += `
                    <div class="rpd-subitem">
                        <span>${item}</span>
                        <strong>${formatCurrency(value)}</strong>
                    </div>
                `;
            });
        }
        
        detailHTML += `</div>`;
    });
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h3>Detail RPD - ${rpd.month} ${rpd.year}</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            ${detailHTML}
            <div class="summary-box">
                <div class="summary-item">
                    <span>Total RPD:</span>
                    <strong>${formatCurrency(rpd.total)}</strong>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

function editRPD(rpd) {
    showRPDModal(rpd);
}

// ===== REALISASI MANAGEMENT =====
async function loadRealisasis(forceRefresh = false) {
    console.log('[REALISASI] Loading realisasis', { forceRefresh });
    
    // ✅ ALWAYS cek cache dulu
    const cachedData = getLocalCache('realisasis');
    if (cachedData && !forceRefresh) {
        console.log('[REALISASI] Using cached data - NO SERVER CALL');
        displayRealisasis(cachedData);
        
        // ✅ Update button state ONCE jika operator (menggunakan cached config)
        if (currentUser.role === 'Operator KUA') {
            updateRealisasiButtonState();
        }
        return;
    }
    
    // ✅ Only fetch dari server jika force refresh atau belum ada cache
    if (forceRefresh || !cachedData) {
        console.log('[REALISASI] Fetching from server...');
        // ❌ NO LOADING SPINNER
        
        try {
            const yearFilter = document.getElementById('realisasiYearFilter');
            const year = yearFilter ? yearFilter.value : new Date().getFullYear();
            
            // Get includeAutopay filter value
            const includeAutopayEl = document.getElementById('includeAutopayFilter');
            const includeAutopay = includeAutopayEl ? (includeAutopayEl.value === 'true') : false;

            let realisasis = await apiCall('getRealisasis', { 
                kua: currentUser.kua, 
                year: year,
                includeAutopay: includeAutopay
            });
            realisasis = sortByMonth(realisasis);
            
            // ✅ Update local cache
            updateLocalCache('realisasis', realisasis);
            displayRealisasis(realisasis);
            
            // ✅ Update button state AFTER displaying data
            if (currentUser.role === 'Operator KUA') {
                updateRealisasiButtonState();
            }
        } catch (error) {
            console.error('[REALISASI ERROR]', error);
        }
    }
}

async function updateRealisasiButtonState() {
    const btnCreateRealisasi = document.getElementById('btnCreateRealisasi');
    
    if (!btnCreateRealisasi) return;
    
    const status = await checkRealisasiStatus();
    
    if (status === 'closed') {
        btnCreateRealisasi.disabled = true;
        btnCreateRealisasi.style.opacity = '0.5';
        btnCreateRealisasi.style.cursor = 'not-allowed';
        btnCreateRealisasi.title = 'Pengisian Realisasi ditutup oleh Admin';
        
        console.log('[REALISASI] Button disabled - status closed');
    } else {
        btnCreateRealisasi.disabled = false;
        btnCreateRealisasi.style.opacity = '1';
        btnCreateRealisasi.style.cursor = 'pointer';
        btnCreateRealisasi.title = 'Tambah Realisasi';
        
        console.log('[REALISASI] Button enabled - status open');
    }
}

async function getAutopayTotal(tahun, bulan, kua) {
    try {
        const autopayData = await autopayApiCall('getAutopayRealisasi', { 
            tahun: parseInt(tahun), 
            bulan: parseInt(bulan) 
        });
        
        // Filter for specific KUA
        const kuaAutopay = autopayData.filter(r => r.kua === kua);
        
        // Sum all autopay nominals
        const total = kuaAutopay.reduce((sum, r) => sum + (parseInt(r.nominal) || 0), 0);
        
        console.log(`[AUTOPAY_TOTAL] ${kua} ${tahun}-${bulan}: ${total}`);
        return total;
    } catch (error) {
        console.error('[AUTOPAY_TOTAL] Error:', error);
        return 0;
    }
}

function displayRealisasis(realisasis) {
    const tbody = document.querySelector('#realisasiTable tbody');
    let totalNominal = 0;
    
    console.log('[DISPLAY_REALISASIS] Displaying', realisasis.length, 'records');
    
    const rows = realisasis.map((real, index) => {
        totalNominal += parseFloat(real.total || 0);
        
        let statusClass = 'warning';
        let statusText = 'Menunggu';
        
        if (real.status === 'Diterima') {
            statusClass = 'success';
            statusText = 'Diterima';
        } else if (real.status === 'Ditolak') {
            statusClass = 'danger';
            statusText = 'Ditolak';
        }
        
        const realEscaped = JSON.stringify(real).replace(/"/g, '&quot;');
        
        console.log('[DISPLAY_REALISASIS] Row', index + 1, ':', {
            month: real.month,
            year: real.year,
            total: real.total,
            status: real.status,
            files: real.files ? real.files.length : 0
        });
        
        return `
        <tr>
            <td>${index + 1}</td>
            <td>${real.month || '-'}</td>
            <td>${real.year || '-'}</td>
            <td>${formatCurrency(real.total || 0)}</td>
            <td><span class="badge badge-${statusClass}">${statusText}</span></td>
            <td>${real.createdAt ? formatDate(real.createdAt) : '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm" onclick='viewRealisasi(${realEscaped})'>Lihat</button>
                    ${real.status !== 'Diterima' && currentUser.role !== 'Admin' ? 
                        `<button class="btn btn-sm" onclick='editRealisasi(${realEscaped})'>Edit</button>` : ''}
                </div>
            </td>
        </tr>
        `;
    }).join('');
    
    const totalRow = `
        <tr style="background: #f8f9fa; font-weight: bold;">
            <td colspan="3" style="text-align: right;">TOTAL:</td>
            <td>${formatCurrency(totalNominal)}</td>
            <td colspan="3"></td>
        </tr>
    `;
    
    // Set innerHTML first
    tbody.innerHTML = rows + totalRow;
    
    // Add dual totals row for Operator (async)
    if (currentUser.role === 'Operator KUA' && realisasis.length > 0) {
        const totalRealisasi = realisasis.reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0);
        
        // Calculate autopay total for displayed realisasis
        Promise.all(
            realisasis.map(r => getAutopayTotal(r.year, r.month, r.kua))
        ).then(autopayTotals => {
            const totalAutopay = autopayTotals.reduce((sum, t) => sum + t, 0);
            const totalPencairan = totalRealisasi - totalAutopay;
            
            // Create totals row
            const totalsRow = document.createElement('tr');
            totalsRow.style.cssText = 'background: #f5f5f5; font-weight: bold; border-top: 2px solid #333;';
            
            // Label cell
            const labelCell = document.createElement('td');
            labelCell.colSpan = 3; // Columns: No, Bulan, Tahun
            labelCell.style.cssText = 'text-align: right; padding: 12px;';
            labelCell.innerHTML = `
                <div style="margin-bottom: 4px;">Total Realisasi:</div>
                ${totalAutopay > 0 ? `
                    <div style="color: #F57C00; font-size: 12px; margin-bottom: 4px;">Dibayar via Autopay:</div>
                    <div style="border-top: 1px solid #ccc; margin-top: 4px; padding-top: 4px;">Total Pencairan KUA:</div>
                ` : ''}
            `;
            
            // Amount cell
            const amountCell = document.createElement('td');
            amountCell.style.cssText = 'padding: 12px; text-align: right;';
            amountCell.innerHTML = `
                <div style="margin-bottom: 4px; color: #1976D2; font-size: 15px;">${formatCurrency(totalRealisasi)}</div>
                ${totalAutopay > 0 ? `
                    <div style="color: #F57C00; font-size: 12px; margin-bottom: 4px;">- ${formatCurrency(totalAutopay)}</div>
                    <div style="border-top: 1px solid #ccc; margin-top: 4px; padding-top: 4px; color: #2E7D32; font-size: 16px;">
                        ${formatCurrency(totalPencairan)}
                    </div>
                ` : ''}
            `;
            
            // Status cell (empty)
            const statusCell = document.createElement('td');
            statusCell.innerHTML = '';
            
            // Date cell (empty)
            const dateCell = document.createElement('td');
            dateCell.innerHTML = '';
            
            // Action cell (empty)
            const actionCell = document.createElement('td');
            actionCell.innerHTML = '';
            
            // Append cells
            totalsRow.appendChild(labelCell);
            totalsRow.appendChild(amountCell);
            totalsRow.appendChild(statusCell);
            totalsRow.appendChild(dateCell);
            totalsRow.appendChild(actionCell);
            
            // Append row to tbody
            tbody.appendChild(totalsRow);
        }).catch(error => {
            console.error('[TOTALS] Error calculating autopay totals:', error);
        });
    }
}

async function showRealisasiModal(realisasi = null) {
    console.log('[REALISASI MODAL] Opening modal, editing:', !!realisasi);
    console.log('[REALISASI MODAL] Realisasi data:', realisasi);
    
    // ✅ Reset modalHasChanges
    modalHasChanges = false;
    
    // Check status untuk new realisasi
    if (!realisasi && currentUser.role === 'Operator KUA') {
        const status = await checkRealisasiStatus();
        
        if (status === 'closed') {
            showNotification('Pengisian Realisasi saat ini ditutup oleh Admin', 'warning');
            return;
        }
    }
    
    // ✅ Load upload config
    await loadUploadConfig();
    
    // ✅ PERBAIKAN: Reset uploadedFiles (harus pakai 'let' di global, bukan 'const')
    uploadedFiles = [];
    
    // ✅ Reset global realisasiData for autopay
    window.realisasiData = {};
    console.log('[REALISASI MODAL] Reset realisasiData for autopay');
    
    // Get modal - FIXED: menggunakan let agar bisa di-reassign
    let modal = document.getElementById('realisasiModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'realisasiModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    // ✅ Get budget info - fetch dari server jika cache kosong atau 0
    let realisasiBudgetInfo = { budget: 0, totalRealisasi: 0, sisaBudget: 0 };
    
    try {
        const cachedBudgets = getLocalCache('budgets');
        const cachedRealisasis = getLocalCache('realisasis');
        
        if (cachedBudgets && cachedBudgets.length > 0) {
            const yearFilter = document.getElementById('realisasiYearFilter');
            const year = yearFilter ? yearFilter.value : new Date().getFullYear();
            
            const currentBudget = cachedBudgets.find(b => b.year == year);
            const budgetTotal = currentBudget ? currentBudget.budget : 0;
            
            // Hitung total realisasi dari cache
            const totalRealisasi = cachedRealisasis
                ? cachedRealisasis
                    .filter(r => r.status === 'Diterima' && r.id !== realisasi?.id)
                    .reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0)
                : 0;
            
            realisasiBudgetInfo = {
                budget: budgetTotal,
                totalRealisasi: totalRealisasi,
                sisaBudget: budgetTotal - totalRealisasi
            };
            
            console.log('[REALISASI MODAL] Budget info from cache:', realisasiBudgetInfo);
        }
        
        // ✅ PERBAIKAN: Jika cache kosong atau budget = 0, fetch dari server
        if (!cachedBudgets || cachedBudgets.length === 0 || realisasiBudgetInfo.budget === 0) {
            console.log('[REALISASI MODAL] Cache empty or budget = 0, fetching fresh data...');
            
            const freshBudgets = currentUser.role === 'Admin' 
                ? await apiCall('getBudgets', { year: new Date().getFullYear() })
                : await apiCall('getBudgets', { kua: currentUser.kua });
            
            if (freshBudgets && freshBudgets.length > 0) {
                // Update cache
                updateLocalCache('budgets', freshBudgets);
                
                const yearFilter = document.getElementById('realisasiYearFilter');
                const year = yearFilter ? yearFilter.value : new Date().getFullYear();
                
                const currentBudget = freshBudgets.find(b => b.year == year);
                const budgetTotal = currentBudget ? (parseFloat(currentBudget.budget) || parseFloat(currentBudget.total) || 0) : 0;
                
                // Fetch realisasis juga jika cache kosong
                let freshRealisasis = cachedRealisasis;
                if (!cachedRealisasis || cachedRealisasis.length === 0) {
                    freshRealisasis = currentUser.role === 'Admin'
                        ? await apiCall('getRealisasis', { year: new Date().getFullYear() })
                        : await apiCall('getRealisasis', { kua: currentUser.kua, year: new Date().getFullYear() });
                    
                    if (freshRealisasis) {
                        updateLocalCache('realisasis', freshRealisasis);
                    }
                }
                
                // Hitung total realisasi
                const totalRealisasi = freshRealisasis
                    ? freshRealisasis
                        .filter(r => r.status === 'Diterima' && r.id !== realisasi?.id)
                        .reduce((sum, r) => sum + (parseFloat(r.total) || 0), 0)
                    : 0;
                
                realisasiBudgetInfo = {
                    budget: budgetTotal,
                    totalRealisasi: totalRealisasi,
                    sisaBudget: budgetTotal - totalRealisasi
                };
                
                console.log('[REALISASI MODAL] Budget info from fresh fetch:', realisasiBudgetInfo);
            }
        }
    } catch (error) {
        console.error('[REALISASI MODAL ERROR]', error);
        showNotification('Gagal memuat data budget', 'error');
    }
    
    // ✅ Get available RPDs - fetch dari server jika cache kosong
    let availableRPDs = [];
    try {
        let cachedRPDs = getLocalCache('rpds');
        let cachedRealisasis = getLocalCache('realisasis');
        
        // ✅ PERBAIKAN: Jika cache RPD kosong, fetch dari server
        if (!cachedRPDs || cachedRPDs.length === 0) {
            console.log('[REALISASI MODAL] RPD cache empty, fetching fresh data...');
            
            const freshRPDs = currentUser.role === 'Admin'
                ? await apiCall('getRPDs', { year: new Date().getFullYear() })
                : await apiCall('getRPDs', { kua: currentUser.kua, year: new Date().getFullYear() });
            
            if (freshRPDs && freshRPDs.length > 0) {
                cachedRPDs = freshRPDs;
                updateLocalCache('rpds', sortByMonth(freshRPDs));
                console.log('[REALISASI MODAL] Fresh RPDs fetched:', freshRPDs.length);
            }
        }
        
        console.log('[REALISASI MODAL] Loading RPDs from cache/fresh');
        
        if (Array.isArray(cachedRPDs)) {
            // Filter RPDs yang valid
            let validRPDs = cachedRPDs.filter(rpd => rpd && rpd.month && rpd.year);
            
            // ✅ FILTER OUT bulan yang sudah ada realisasinya (untuk tambah baru)
            if (!realisasi && cachedRealisasis) {
                const yearFilter = document.getElementById('realisasiYearFilter');
                const year = yearFilter ? yearFilter.value : new Date().getFullYear();
                
                console.log('[REALISASI MODAL] Existing realisasis from cache:', cachedRealisasis.length);
                
                // Buat set dari bulan yang sudah ada realisasinya
                const usedMonths = new Set(
                    cachedRealisasis.map(r => `${r.month}-${r.year}`)
                );
                
                console.log('[REALISASI MODAL] Used months:', Array.from(usedMonths));
                
                // Filter out RPD yang bulannya sudah ada realisasi
                availableRPDs = validRPDs.filter(rpd => {
                    const monthKey = `${rpd.month}-${rpd.year}`;
                    const isAvailable = !usedMonths.has(monthKey);
                    
                    if (!isAvailable) {
                        console.log('[REALISASI MODAL] Filtering out month:', monthKey, '- already has realisasi');
                    }
                    
                    return isAvailable;
                });
                
                console.log('[REALISASI MODAL] Available RPDs after filtering:', availableRPDs.length);
            } else {
                // Untuk edit, pakai semua RPD
                availableRPDs = validRPDs;
            }
            
            console.log('[REALISASI MODAL] Found RPDs:', availableRPDs.length);
        } else {
            console.warn('[REALISASI MODAL] RPDs not in cache');
            availableRPDs = [];
        }
                    
        
    } catch (error) {
        console.error('[REALISASI MODAL ERROR]', error);
        showNotification('Gagal memuat data RPD: ' + error.message, 'warning');
    }
    
    if (!realisasi && availableRPDs.length === 0) {
        showNotification('Belum ada RPD yang dibuat untuk tahun ini. Silakan buat RPD terlebih dahulu.', 'warning');
        return;
    }
    
    // Build Modal HTML
    const currentYear = new Date().getFullYear();
    let monthOptions = '';
    
    if (realisasi) {
        // ✅ Untuk edit, cari RPD yang sesuai dengan bulan realisasi
        const matchingRPD = availableRPDs.find(rpd => 
            rpd.month === realisasi.month && rpd.year == realisasi.year
        );
        
        if (matchingRPD) {
            // Gunakan data dari RPD
            monthOptions = `<option value="${matchingRPD.id}" data-month="${matchingRPD.month}" data-year="${matchingRPD.year}" data-rpd-data='${JSON.stringify(matchingRPD.data)}' selected>${matchingRPD.month} ${matchingRPD.year}</option>`;
        } else {
            // Fallback: gunakan data dari realisasi itu sendiri
            monthOptions = `<option value="${realisasi.rpdId || ''}" data-month="${realisasi.month}" data-year="${realisasi.year}" data-rpd-data='${JSON.stringify(realisasi.data)}' selected>${realisasi.month} ${realisasi.year}</option>`;
        }
    } else {
        // Untuk tambah baru, tampilkan daftar RPD yang tersedia (yang belum ada realisasinya)
        if (availableRPDs.length > 0) {
            monthOptions = availableRPDs.map(rpd => 
                `<option value="${rpd.id}" data-month="${rpd.month}" data-year="${rpd.year}" data-rpd-data='${JSON.stringify(rpd.data)}'>${rpd.month} ${rpd.year}</option>`
            ).join('');
        } else {
            monthOptions = '<option value="">Tidak ada RPD tersedia</option>';
        }
    }
    
    // ✅ FIX #1: Build parameters HTML with auto-format-number class
    let parametersHTML = '';
    const realisasiData = realisasi ? realisasi.data : {};
    
    if (realisasi && realisasi.data) {
        Object.entries(APP_CONFIG.BOP.RPD_PARAMETERS).forEach(([code, param]) => {
            parametersHTML += `
                <div class="rpd-item">
                    <h4>${code} - ${param.name}</h4>
            `;
            
            param.items.forEach(item => {
                const inputId = `realisasi_${code}_${item.replace(/\s+/g, '_')}`;
                const value = realisasiData[code] && realisasiData[code][item] ? realisasiData[code][item] : 0;
                
                parametersHTML += `
                    <div class="rpd-subitem">
                        <label>${item}</label>
                        <input type="text" 
                            id="${inputId}"
                            class="realisasi-input auto-format-number"
                            data-code="${code}"
                            data-item="${item}"
                            value="${value}" 
                            placeholder="0">
                    </div>
                `;
            });
            
            parametersHTML += `</div>`;
        });
    }
    
    // ✅ Get existing files
    let existingFiles = [];
    
    if (realisasi && realisasi.files) {
        console.log('[REALISASI MODAL] Raw files data:', realisasi.files);
        console.log('[REALISASI MODAL] Files type:', typeof realisasi.files);
        
        if (Array.isArray(realisasi.files)) {
            existingFiles = realisasi.files;
        } else if (typeof realisasi.files === 'string') {
            try {
                existingFiles = JSON.parse(realisasi.files);
            } catch (e) {
                console.error('[REALISASI MODAL] Error parsing files:', e);
            }
        }
        
        // Filter valid files
        existingFiles = existingFiles.filter(f => f && f.fileName && f.fileUrl);
        
        console.log('[REALISASI MODAL] Final existingFiles:', existingFiles);
        console.log('[REALISASI MODAL] Existing files count:', existingFiles.length);
    }
    
    console.log('[REALISASI MODAL] Final existingFiles:', existingFiles);
    console.log('[REALISASI MODAL] Existing files count:', existingFiles.length);
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h3>${realisasi ? 'Edit' : 'Tambah'} Realisasi</h3>
                <button class="btn-close" onclick="closeRealisasiModal()">×</button>
            </div>
            
            <form id="realisasiForm">
                <div class="modal-body">
                    
                    <!-- Info Budget -->
                    <div class="info-box">
                        <div class="info-item">
                            <span>Anggaran:</span>
                            <strong id="budgetInfo">${formatCurrency(realisasiBudgetInfo.budget)}</strong>
                        </div>
                        <div class="info-item">
                            <span>Total Realisasi:</span>
                            <strong id="totalRealisasiInfo">${formatCurrency(realisasiBudgetInfo.totalRealisasi)}</strong>
                        </div>
                        <div class="info-item">
                            <span>Sisa Budget:</span>
                            <strong id="sisaBudgetInfo">${formatCurrency(realisasiBudgetInfo.sisaBudget)}</strong>
                        </div>
                    </div>
                    
                    <!-- Pilih RPD (WAJIB) -->
                    <div class="form-group">
                        <label>Pilih RPD <span class="required">*</span></label>
                        <select id="realisasiRPD" required onchange="loadRPDDataFromSelect()" ${realisasi ? 'disabled' : ''}>
                            <option value="">-- Pilih RPD Bulan --</option>
                            ${monthOptions}
                        </select>
                        ${realisasi ? '<input type="hidden" id="realisasiRPDValue" value="' + (realisasi.rpdId || '') + '">' : ''}
                        <small style="color: #666; display: block; margin-top: 5px;">
                            ${realisasi ? 'Bulan tidak dapat diubah saat edit realisasi' : 'Pilih RPD bulan untuk menampilkan form input realisasi'}
                        </small>
                    </div>
                    
                    <!-- Hidden fields for month/year (akan diisi otomatis dari RPD) -->
                    <input type="hidden" id="realisasiMonth" value="">
                    <input type="hidden" id="realisasiYear" value="">
                    
                    <!-- Realisasi Items (will be populated when RPD selected) -->
                    <div id="realisasiParameters"></div>
                    
                    <!-- Total -->
                    <div class="total-section">
                        <h4>Total Realisasi: <span id="realisasiTotalDisplay">Rp 0</span></h4>
                    </div>
                    
                    <!-- ✅ FILE UPLOAD SECTION -->
                    <div class="file-upload-section">
                        <h4 style="margin-bottom: 15px;">Lampiran Dokumen LPJ (Laporan Pertanggung Jawaban)</h4>
                        
                        <div class="upload-info" style="background: #f8f9fa; padding: 12px; border-radius: 4px; margin-bottom: 15px;">
                            <p style="margin: 0; font-size: 13px; color: #666;">
                                <i class="fas fa-info-circle"></i>
                                Maksimal <strong>${uploadConfig.maxFiles} file</strong>, 
                                ukuran per file maksimal <strong>${uploadConfig.maxFileSize} MB</strong>.
                                Format yang didukung: PDF, JPG, PNG, GIF.
                                <span id="fileCount" style="float: right; font-weight: bold;">0 / ${uploadConfig.maxFiles} file</span>
                            </p>
                        </div>
                        
                        <!-- Existing Files (for edit) -->
                        <div id="existingFilesContainer"></div>
                        
                        <!-- File Input -->
                        <div class="form-group">
                            <label>
                                <i class="fas fa-upload"></i> Upload File Baru
                            </label>
                            <input 
                                type="file" 
                                id="realisasiFileInput" 
                                accept=".pdf,.jpg,.jpeg,.png,.gif"
                                multiple
                                onchange="handleFileInputChange(event)"
                                style="display: block; width: 100%; padding: 10px; border: 2px dashed #ddd; border-radius: 4px; cursor: pointer;">
                            <small style="color: #999; display: block; margin-top: 5px;">
                                Klik atau drag & drop file untuk upload (bisa pilih multiple files)
                            </small>
                        </div>
                        
                        <!-- Uploaded Files Display -->
                        <div id="uploadedFilesContainer" style="margin-top: 15px;">
                            <p style="color: #999; font-size: 14px;">Belum ada file yang dipilih</p>
                        </div>
                    </div>
                    
                    <!-- Hidden input untuk existing files -->
                    <input type="hidden" id="existingFilesData" value='${JSON.stringify(existingFiles)}'>
                    
                </div>
                
                <div class="modal-footer">
                    <button type="button" class="btn" onclick="closeRealisasiModal()">Batal</button>
                    <button type="submit" class="btn btn-success">Simpan</button>
                </div>
            </form>
        </div>
    `;
    
    modal.classList.add('active');

    // ✅ FIX #1: Build existing files HTML dengan preview dan tombol hapus
    if (existingFiles.length > 0) {
        displayExistingFiles(existingFiles);
    }

    updateFileCount();

    // ✅ FIX #1: Setup auto-format untuk semua input
    setTimeout(() => {
        console.log('[REALISASI MODAL] ========== SETUP AUTO-FORMAT START ==========');
        setupAllAutoFormatInputs('.auto-format-number');
        
        const inputs = document.querySelectorAll('.realisasi-input');
        inputs.forEach(input => {
            input.addEventListener('input', calculateRealisasiTotal);
        });
        
        calculateRealisasiTotal();
    }, 150);

    
    // Event Handlers
    if (realisasi) {
        // Untuk edit: load RPD data langsung
        setTimeout(() => {
            loadRPDDataFromSelect();
            
            // Populate existing realisasi values
            if (realisasi.data) {
                Object.entries(realisasi.data).forEach(([code, items]) => {
                    Object.entries(items).forEach(([item, value]) => {
                        const inputId = `realisasi_${code}_${item.replace(/\s+/g, '_')}`;
                        const input = document.getElementById(inputId);
                        if (input) {
                            input.value = value;
                            // Trigger format
                            input.dispatchEvent(new Event('input'));
                        }
                    });
                });
            }
        }, 200);
    } else if (availableRPDs.length > 0) {
        // Untuk tambah baru: select RPD pertama otomatis
        setTimeout(() => {
            const selectRPD = document.getElementById('realisasiRPD');
            if (selectRPD && selectRPD.options.length > 1) {
                selectRPD.selectedIndex = 1; // Select first RPD
                loadRPDDataFromSelect();
            }
        }, 100);
    }
    
    // ✅ FIX #1: Updated form submit handler dengan existing files
    const form = document.getElementById('realisasiForm');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        console.log('[REALISASI FORM] Form submitted');
        
        const monthSelect = document.getElementById('realisasiMonth');
        const yearInput = document.getElementById('realisasiYear');
        
        const month = monthSelect.value;
        const year = parseInt(yearInput.value);
        
        console.log('[REALISASI FORM] Month:', month, 'Year:', year);
        
        if (!month || !year) {
            showNotification('Bulan dan Tahun harus diisi', 'error');
            return;
        }
        
        // Collect data
        const realisasiDataToSave = {};
        let total = 0;
        
        Object.entries(APP_CONFIG.BOP.RPD_PARAMETERS).forEach(([code, param]) => {
            realisasiDataToSave[code] = {};
            
            param.items.forEach(item => {
                const inputId = `realisasi_${code}_${item.replace(/\s+/g, '_')}`;
                const input = document.getElementById(inputId);
                
                if (input) {
                    const value = parseFormattedNumber(input.value);
                    realisasiDataToSave[code][item] = value;
                    total += value;
                }
            });
        });
        
        console.log('[REALISASI FORM] Data from inputs:', realisasiDataToSave);
        console.log('[REALISASI FORM] Total from inputs:', total);
        
        // ✅ Merge with global realisasiData (contains autopay values)
        if (window.realisasiData && Object.keys(window.realisasiData).length > 0) {
            console.log('[AUTOPAY_SUBMIT] Merging autopay data:', window.realisasiData);
            
            Object.keys(window.realisasiData).forEach(code => {
                if (!realisasiDataToSave[code]) {
                    realisasiDataToSave[code] = {};
                }
                
                Object.keys(window.realisasiData[code]).forEach(item => {
                    const autopayValue = parseFloat(window.realisasiData[code][item]) || 0;
                    
                    // Only add if not already in collected data (because input was blocked)
                    if (realisasiDataToSave[code][item] === undefined || realisasiDataToSave[code][item] === 0) {
                        console.log('[AUTOPAY_SUBMIT] Adding autopay value:', { code, item, value: autopayValue });
                        realisasiDataToSave[code][item] = autopayValue;
                        total += autopayValue;
                    }
                });
            });
        }
        
        console.log('[REALISASI FORM] Final data to save (with autopay):', { realisasiData: realisasiDataToSave, total });
        
        // ✅ VALIDASI WAJIB UPLOAD DOKUMEN LPJ
        // Check if there are any files (existing or new)
        let hasFiles = false;
        
        const existingFilesInput = document.getElementById('existingFilesData');
        if (existingFilesInput && existingFilesInput.value) {
            try {
                const existing = JSON.parse(existingFilesInput.value);
                if (Array.isArray(existing) && existing.length > 0) {
                    hasFiles = true;
                }
            } catch (e) {
                console.error('[REALISASI FORM] Error parsing existing files:', e);
            }
        }
        
        // Check new uploaded files
        if (uploadedFiles.length > 0) {
            hasFiles = true;
        }
        
        if (!hasFiles) {
            showNotification('Upload Dokumen LPJ wajib diisi. Silakan upload minimal 1 file.', 'error');
            return;
        }
        
        // ✅ FIX ISSUE #1: Handle files properly
        let allFiles = [];
        
        // 1. Get existing files
        if (existingFilesInput && existingFilesInput.value) {
            try {
                const existing = JSON.parse(existingFilesInput.value);
                if (Array.isArray(existing)) {
                    allFiles = [...existing];
                    console.log('[REALISASI FORM] Keeping existing files:', allFiles.length);
                }
            } catch (e) {
                console.error('[REALISASI FORM] Error parsing existing files:', e);
            }
        }
        
        // 2. Upload new files
        if (uploadedFiles.length > 0) {
            console.log('[REALISASI FORM] Uploading new files:', uploadedFiles.length);
            
            for (let i = 0; i < uploadedFiles.length; i++) {
                const file = uploadedFiles[i];
                console.log('[REALISASI FORM] Uploading file', (i + 1), ':', file.fileName);
                
                try {
                    const uploadResult = await apiCall('uploadFile', {
                        filename: file.fileName,
                        fileData: file.fileData,
                        mimeType: file.mimeType
                    });
                    
                    console.log('[REALISASI FORM] File uploaded:', uploadResult);
                    
                    // ✅ Build proper file object
                    const fileObj = {
                        fileId: uploadResult.id || uploadResult.fileId || '',
                        fileName: uploadResult.originalName || file.fileName,
                        uniqueName: uploadResult.name || file.fileName,
                        fileUrl: uploadResult.url || uploadResult.fileUrl || '',
                        mimeType: uploadResult.mimeType || file.mimeType,
                        size: uploadResult.fileSize || file.fileSize || 0,
                        uploadPath: uploadResult.uploadPath || ''
                    };
                    
                    console.log('[REALISASI FORM] File object:', fileObj);
                    
                    // Validate
                    if (fileObj.fileName && fileObj.fileUrl) {
                        allFiles.push(fileObj);
                        console.log('[REALISASI FORM] File added to array');
                    } else {
                        console.error('[REALISASI FORM] Invalid file object:', fileObj);
                    }
                    
                } catch (error) {
                    console.error('[REALISASI FORM] Upload error:', error);
                    showNotification('Gagal upload file: ' + file.fileName, 'error');
                    return;
                }
            }
        }
        
        console.log('[REALISASI FORM] Total files to submit:', allFiles.length);
        console.log('[REALISASI FORM] Files array:', allFiles);
        
        // ✅ CRITICAL: Validate all files have required fields
        const validFiles = allFiles.filter(f => {
            const isValid = f && f.fileName && f.fileUrl;
            if (!isValid) {
                console.error('[REALISASI FORM] Invalid file filtered out:', f);
            }
            return isValid;
        });
        
        if (validFiles.length !== allFiles.length) {
            console.warn('[REALISASI FORM] Some files were invalid and filtered out');
            console.warn('[REALISASI FORM] Valid files:', validFiles.length, '/ Total:', allFiles.length);
        }
        
        // Prepare submission data
        const submissionData = {
            id: realisasi ? realisasi.id : null,
            kua: currentUser.kua,
            month: month,
            year: year,
            data: realisasiDataToSave,  // ✅ Use merged data with autopay
            total: total,
            files: allFiles,  // ✅ Send all files
            userId: currentUser.id,
            username: currentUser.username
        };
        
        console.log('[REALISASI FORM] Submitting:', submissionData);
        console.log('[REALISASI FORM] Files count:', submissionData.files.length);
        
        try {
            await apiCall('saveRealisasi', submissionData);
            
            showNotification('Realisasi berhasil disimpan', 'success');
            
            // Reset
            uploadedFiles = [];
            
            // Close modal dengan benar
            closeRealisasiModal();
            
            // Reload data
            await loadRealisasis(true);
            await loadDashboardStats(true);
            
        } catch (error) {
            console.error('[REALISASI FORM ERROR]', error);
            showNotification('Gagal menyimpan: ' + error.message, 'error');
        }
    });
}

function removeExistingFile(index) {
    console.log('[REMOVE_FILE] Removing file at index:', index);
    
    const existingFilesInput = document.getElementById('existingFilesData');
    if (!existingFilesInput) {
        console.error('[REMOVE_FILE] existingFilesData input not found');
        return;
    }
    
    try {
        let files = JSON.parse(existingFilesInput.value);
        console.log('[REMOVE_FILE] Current files:', files);
        
        // Remove file at index
        const removedFile = files.splice(index, 1);
        console.log('[REMOVE_FILE] Removed file:', removedFile);
        
        // Update hidden input
        existingFilesInput.value = JSON.stringify(files);
        
        console.log('[REMOVE_FILE] Remaining files:', files);
        showNotification('File dihapus dari daftar upload', 'info');
        
        // Re-render existing files display
        displayExistingFiles(files);
        updateFileCount();
        
    } catch (e) {
        console.error('[REMOVE_FILE] Error:', e);
        showNotification('Gagal menghapus file', 'error');
    }
}

function previewFile(file) {
    console.log('[PREVIEW_FILE] Opening preview for:', file.fileName);
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.zIndex = '10001';
    
    let previewContent = '';
    
    if (file.mimeType === 'application/pdf') {
        // PDF Preview
        const pdfUrl = file.fileUrl || file.url;
        
        if (pdfUrl) {
            const embedUrl = pdfUrl.replace('/view', '/preview');
            previewContent = `
                <iframe 
                    src="${embedUrl}" 
                    style="width: 100%; height: 600px; border: none;"
                    frameborder="0">
                </iframe>
            `;
        } else {
            previewContent = '<p>URL file tidak tersedia</p>';
        }
        
    } else if (file.mimeType && file.mimeType.startsWith('image/')) {
        // Image Preview
        const imageUrl = file.fileUrl || file.url;
        
        if (imageUrl) {
            // Convert Google Drive URL to direct image URL
            let directUrl = imageUrl;
            
            if (imageUrl.includes('drive.google.com')) {
                const fileId = imageUrl.match(/[-\w]{25,}/)?.[0];
                if (fileId) {
                    directUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
                }
            }
            
            previewContent = `
                <img 
                    src="${directUrl}" 
                    style="max-width: 100%; max-height: 600px; object-fit: contain;"
                    alt="${file.fileName}">
            `;
        } else {
            previewContent = '<p>URL file tidak tersedia</p>';
        }
    } else {
        previewContent = '<p>Preview tidak tersedia untuk tipe file ini</p>';
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow: auto;">
            <div class="modal-header">
                <h3>${file.fileName}</h3>
                <button class="btn-close" onclick="this.closest('.modal').remove()">×</button>
            </div>
            <div class="modal-body" style="padding: 20px; text-align: center;">
                ${previewContent}
            </div>
            <div class="modal-footer">
                <a href="${file.fileUrl || file.url}" target="_blank" class="btn">
                    <i class="fas fa-external-link-alt"></i> Buka di Tab Baru
                </a>
                <button class="btn" onclick="this.closest('.modal').remove()">Tutup</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function loadRPDDataFromSelect() {
    console.log('[LOAD_RPD_DATA_FROM_SELECT] Loading RPD data from select');
    
    const selectRPD = document.getElementById('realisasiRPD');
    const selectedOption = selectRPD.options[selectRPD.selectedIndex];
    
    if (!selectedOption || !selectedOption.value) {
        console.warn('[LOAD_RPD_DATA_FROM_SELECT] No RPD selected');
        // Clear parameters
        const parametersDiv = document.getElementById('realisasiParameters');
        if (parametersDiv) {
            parametersDiv.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Pilih RPD untuk menampilkan form input</p>';
        }
        return;
    }
    
    // Set hidden month and year fields
    const month = selectedOption.dataset.month;
    const year = selectedOption.dataset.year;
    
    document.getElementById('realisasiMonth').value = month;
    document.getElementById('realisasiYear').value = year;
    
    console.log('[LOAD_RPD_DATA_FROM_SELECT] Month:', month, 'Year:', year);
    
    try {
        const rpdData = JSON.parse(selectedOption.dataset.rpdData);
        console.log('[LOAD_RPD_DATA_FROM_SELECT] RPD data loaded:', rpdData);
        
        // Build parameters HTML with RPD data
        let parametersHTML = '<h4 style="margin: 20px 0 15px 0; color: #333;">Input Realisasi per Akun</h4>';
        
        Object.entries(APP_CONFIG.BOP.RPD_PARAMETERS).forEach(([code, param]) => {
            parametersHTML += `
                <div class="rpd-item">
                    <h4>${code} - ${param.name}</h4>
            `;
            
            param.items.forEach(item => {
                const inputId = `realisasi_${code}_${item.replace(/\s+/g, '_')}`;
                const rpdValue = rpdData[code] && rpdData[code][item] ? rpdData[code][item] : 0;
                
                parametersHTML += `
                    <div class="rpd-subitem" style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; align-items: center;">
                        <label style="margin: 0;">${item}</label>
                        <div style="text-align: right; padding: 10px; background: #e9ecef; border-radius: 6px;">
                            <small style="display: block; color: #666; font-size: 11px;">Anggaran RPD</small>
                            <strong style="color: #333; font-size: 14px;">${formatCurrency(rpdValue)}</strong>
                        </div>
                        <input type="text" 
                               id="${inputId}"
                               class="realisasi-input auto-format-number"
                               data-code="${code}"
                               data-item="${item}"
                               data-rpd-value="${rpdValue}"
                               value="0" 
                               placeholder="Input Realisasi"
                               style="text-align: right;">
                    </div>
                `;
            });
            
            parametersHTML += `</div>`;
        });
        
        // Update the parameters section
        const parametersDiv = document.getElementById('realisasiParameters');
        if (parametersDiv) {
            parametersDiv.innerHTML = parametersHTML;
            
            // Setup auto-format dan autopay block
            setTimeout(async () => {
                console.log('[LOAD_RPD_DATA_FROM_SELECT] Setting up auto-format for new inputs');
                setupAllAutoFormatInputs('.auto-format-number');
                
                // Attach listeners to new inputs
                const inputs = document.querySelectorAll('.realisasi-input');
                inputs.forEach(input => {
                    input.addEventListener('input', calculateRealisasiTotal);
                });
                
                // ✅ AUTOPAY BLOCK for Operator KUA
                if (currentUser.role === 'Operator KUA') {
                    const tahun = parseInt(year);
                    const bulan = parseInt(month);
                    const kua = currentUser.kua;
                    
                    console.log('[AUTOPAY_BLOCK] ========== START AUTOPAY BLOCK ==========');
                    console.log('[AUTOPAY_BLOCK] User:', { kua, tahun, bulan, role: currentUser.role });
                    
                    // Check autopay for Listrik (522111) and Telepon (522112)
                    const autopayPOS = [
                        { kodePos: '522111', namaPos: 'Belanja Langganan Listrik' },
                        { kodePos: '522112', namaPos: 'Belanja Langganan Telepon / Internet' }
                    ];
                    
                    // Process autopay check sequentially for each POS
                    for (const pos of autopayPOS) {
                        try {
                            console.log('[AUTOPAY_BLOCK] Processing POS:', pos.kodePos);
                            
                            // Call both APIs in parallel
                            const [isEnabled, autopayDataList] = await Promise.all([
                                autopayApiCall('isAutopayEnabled', { kua: kua, kodePos: pos.kodePos }),
                                autopayApiCall('getAutopayRealisasi', { tahun: tahun, bulan: bulan })
                            ]);
                            
                            console.log('[AUTOPAY_BLOCK] POS', pos.kodePos, 'enabled:', isEnabled, 'type:', typeof isEnabled);
                            console.log('[AUTOPAY_BLOCK] Autopay data list:', autopayDataList);
                            
                            if (!isEnabled) {
                                console.log('[AUTOPAY_BLOCK] Autopay not enabled for', pos.kodePos);
                                continue;
                            }
                            
                            console.log('[AUTOPAY_BLOCK] ✅ Autopay ENABLED for', pos.kodePos);
                            
                            // Find autopay data for this KUA and POS
                            const autopayRecord = autopayDataList.find(r => {
                                const matchKua = String(r.kua).trim() === String(kua).trim();
                                const matchPos = String(r.kodePos).trim() === String(pos.kodePos).trim();
                                return matchKua && matchPos;
                            });
                            
                            console.log('[AUTOPAY_BLOCK] Autopay record found:', autopayRecord);
                            
                            // Find input field for this POS code
                            const inputField = document.querySelector(
                                `.realisasi-input[data-code="${pos.kodePos}"]`
                            );
                            
                            if (!inputField) {
                                console.warn('[AUTOPAY_BLOCK] ⚠️ No input field found for POS', pos.kodePos);
                                continue;
                            }
                            
                            console.log('[AUTOPAY_BLOCK] Found input field for POS', pos.kodePos);
                            
                            const item = inputField.dataset.item;
                            const container = inputField.parentElement;
                            
                            if (autopayRecord && autopayRecord.nominal > 0) {
                                // Replace input with readonly autopay display
                                console.log('[AUTOPAY_BLOCK] 🔒 BLOCKING input for', item, 'with nominal', autopayRecord.nominal);
                                
                                container.innerHTML = `
                                    <div style="padding: 10px; background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); 
                                                border-radius: 6px; border: 2px solid #4CAF50;">
                                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                            <span style="background: white; color: #4CAF50; padding: 4px 8px; 
                                                         border-radius: 4px; font-weight: bold; font-size: 12px;">
                                                🤖 DIBAYAR VIA SAKTI
                                            </span>
                                        </div>
                                        <div style="background: white; padding: 10px; border-radius: 4px; margin-bottom: 8px;">
                                            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                                <small style="color: #666;">Nominal:</small>
                                                <strong style="color: #2E7D32; font-size: 16px;">
                                                    ${formatCurrency(autopayRecord.nominal)}
                                                </strong>
                                            </div>
                                            ${autopayRecord.keterangan ? `
                                                <div style="border-top: 1px solid #e0e0e0; padding-top: 4px; margin-top: 4px;">
                                                    <small style="color: #666;">Keterangan:</small>
                                                    <div style="color: #333; font-size: 13px; margin-top: 2px;">
                                                        ${autopayRecord.keterangan}
                                                    </div>
                                                </div>
                                            ` : ''}
                                        </div>
                                        <div style="background: #FFF9C4; padding: 8px; border-radius: 4px; 
                                                   border-left: 3px solid #F57C00;">
                                            <small style="color: #E65100; font-size: 11px;">
                                                ⚠️ POS ini tidak dapat diinput manual karena pembayaran 
                                                dilakukan otomatis melalui sistem SAKTI (Autopay).
                                            </small>
                                        </div>
                                    </div>
                                `;
                                
                                // Store value in global realisasiData
                                if (!window.realisasiData[pos.kodePos]) {
                                    window.realisasiData[pos.kodePos] = {};
                                }
                                window.realisasiData[pos.kodePos][item] = autopayRecord.nominal;
                                
                                console.log('[AUTOPAY_BLOCK] ✅ Input blocked and value set:', window.realisasiData[pos.kodePos]);
                                
                            } else if (isEnabled && (!autopayRecord || autopayRecord.nominal === 0)) {
                                // Autopay enabled but no data yet - disable input
                                console.log('[AUTOPAY_BLOCK] ⚠️ Autopay enabled but no data - disabling input');
                                
                                inputField.disabled = true;
                                inputField.placeholder = 'Menunggu input Admin via SAKTI';
                                inputField.style.background = '#f5f5f5';
                                inputField.style.cursor = 'not-allowed';
                                
                                // Add info message after input
                                const infoDiv = document.createElement('div');
                                infoDiv.style.cssText = 'grid-column: 1 / -1; padding: 8px; background: #E3F2FD; border-radius: 4px; margin-top: 5px;';
                                infoDiv.innerHTML = `
                                    <small style="color: #1976D2; font-size: 11px;">
                                        ℹ️ POS ini menggunakan Autopay. Admin akan input nominal via SAKTI.
                                    </small>
                                `;
                                container.parentElement.appendChild(infoDiv);
                                
                                console.log('[AUTOPAY_BLOCK] ✅ Input disabled');
                            }
                            
                        } catch (error) {
                            console.error('[AUTOPAY_BLOCK] ❌ Error processing POS', pos.kodePos, ':', error);
                        }
                    }
                    
                    console.log('[AUTOPAY_BLOCK] ========== END AUTOPAY BLOCK ==========');
                }
                
                // Calculate total after autopay block
                calculateRealisasiTotal();
            }, 100);
        }
        
    } catch (error) {
        console.error('[LOAD_RPD_DATA_FROM_SELECT ERROR]', error);
        showNotification('Gagal memuat data RPD', 'error');
    }
}

function loadRPDDataForRealisasi() {
    console.log('[LOAD_RPD_DATA] Loading RPD data for selected month');
    
    const selectMonth = document.getElementById('realisasiMonth');
    const selectedOption = selectMonth.options[selectMonth.selectedIndex];
    
    if (!selectedOption || !selectedOption.dataset.rpdData) {
        console.warn('[LOAD_RPD_DATA] No RPD data in selected option');
        return;
    }
    
    try {
        const rpdData = JSON.parse(selectedOption.dataset.rpdData);
        console.log('[LOAD_RPD_DATA] RPD data loaded:', rpdData);
        
        // Build parameters HTML with RPD data
        let parametersHTML = '';
        
        Object.entries(APP_CONFIG.BOP.RPD_PARAMETERS).forEach(([code, param]) => {
            parametersHTML += `
                <div class="rpd-item">
                    <h4>${code} - ${param.name}</h4>
            `;
            
            param.items.forEach(item => {
                const inputId = `realisasi_${code}_${item.replace(/\s+/g, '_')}`;
                const rpdValue = rpdData[code] && rpdData[code][item] ? rpdData[code][item] : 0;
                
                parametersHTML += `
                    <div class="rpd-subitem" style="grid-template-columns: 2fr 1fr 1fr; gap: 10px;">
                        <label>${item}</label>
                        <div style="text-align: right; padding: 10px; background: #e9ecef; border-radius: 6px;">
                            <small style="display: block; color: #666; font-size: 11px;">RPD</small>
                            <strong style="color: #333;">${formatCurrency(rpdValue)}</strong>
                        </div>
                        <input type="text" 
                               id="${inputId}"
                               class="realisasi-input auto-format-number"
                               data-code="${code}"
                               data-item="${item}"
                               value="0" 
                               placeholder="Realisasi">
                    </div>
                `;
            });
            
            parametersHTML += `</div>`;
        });
        
        // Update the parameters section
        const parametersDiv = document.getElementById('realisasiParameters');
        if (parametersDiv) {
            parametersDiv.innerHTML = parametersHTML;
            
            // ✅ FIX #3: Setup auto-format untuk input baru
            setTimeout(() => {
                console.log('[LOAD_RPD_DATA] Setting up auto-format for new inputs');
                setupAllAutoFormatInputs('.auto-format-number');
                
                // Attach listeners to new inputs
                const inputs = document.querySelectorAll('.realisasi-input');
                inputs.forEach(input => {
                    input.addEventListener('input', calculateRealisasiTotal);
                });
                
                calculateRealisasiTotal();
            }, 100);
        }
        
    } catch (error) {
        console.error('[LOAD_RPD_DATA ERROR]', error);
        showNotification('Gagal memuat data RPD', 'error');
    }
}

async function submitRealisasi(e) {
  e.preventDefault();
  
  showLoading();
  
  try {
    // Collect realisasi data
    const realisasiData = {};
    let total = 0;
    
    Object.keys(APP_CONFIG.BOP.RPD_PARAMETERS).forEach(code => {
      realisasiData[code] = {};
      APP_CONFIG.BOP.RPD_PARAMETERS[code].items.forEach(item => {
        const inputId = `realisasi_${code}_${item.replace(/\s+/g, '_')}`;
        const value = parseFloat(document.getElementById(inputId)?.value) || 0;
        realisasiData[code][item] = value;
        total += value;
      });
    });
    
    // Handle file uploads
    const files = [];
    const fileInput = document.getElementById('realisasiFiles');
    
    if (fileInput.files.length > 0) {
      for (let i = 0; i < fileInput.files.length; i++) {
        const file = fileInput.files[i];
        
        // Convert to base64
        const reader = new FileReader();
        const fileData = await new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        
        // Upload to drive
        const uploadResult = await apiCall('uploadFile', {
          filename: file.name,
          fileData: fileData,
          mimeType: file.type
        });
        
        files.push(uploadResult);
      }
    }
    
    // Submit realisasi
    const submitData = {
      id: editingRealisasi?.id,
      kua: currentUser.kua,
      userId: currentUser.id,
      month: document.getElementById('realisasiMonth').value,
      year: document.getElementById('realisasiYear')?.value || new Date().getFullYear(),
      data: realisasiData,
      total: total,
      files: files
    };
    
    console.log('[REALISASI FORM] Submitting with', files.length, 'files');
    
    const result = await apiCall('saveRealisasi', submitData);
    
    hideLoading();
    showNotification(result.message || 'Realisasi berhasil disimpan', 'success');
    closeModal();
    loadRealisasis();
    
  } catch (error) {
    hideLoading();
    console.error('[REALISASI FORM ERROR]', error);
    showNotification(error.message || 'Gagal menyimpan realisasi', 'error');
  }
}

async function continueToRealisasiForm() {
    console.log('[REALISASI] Continuing to form');
    
    const select = document.getElementById('selectRPDMonth');
    if (!select || !select.value) {
        showNotification('Pilih bulan terlebih dahulu', 'warning');
        return;
    }
    
    const selectedOption = select.options[select.selectedIndex];
    const rpd = JSON.parse(selectedOption.dataset.rpd);
    
    console.log('[REALISASI] Selected RPD:', rpd);
    
    // Close current modal and show form
    await showRealisasiForm(rpd, null);
}

async function showRealisasiForm(rpd, realisasi = null) {
    console.log('[REALISASI FORM] Showing form for RPD:', rpd);
    console.log('[REALISASI FORM] Existing realisasi:', realisasi);
    
    // ✅ Reset realisasiData for autopay
    window.realisasiData = {};
    console.log('[REALISASI FORM] Reset realisasiData');
    
    // ✅ Populate realisasiData from existing realisasi for edit mode
    if (realisasi && realisasi.data) {
        console.log('[REALISASI FORM] Populating realisasiData from existing realisasi');
        window.realisasiData = JSON.parse(JSON.stringify(realisasi.data)); // Deep copy
        console.log('[REALISASI FORM] Populated realisasiData:', window.realisasiData);
    }
    
    // Get max file info from config
    let maxFileSize = '5';
    let maxFiles = '10';
    try {
        const config = await apiCall('getRPDConfig');
        maxFileSize = config.REALISASI_MAX_FILE_SIZE || '5';
        maxFiles = config.REALISASI_MAX_FILES || '10';
    } catch (error) {
        console.warn('[REALISASI] Failed to get config for file info');
    }
    
    // Create modal if doesn't exist
    let modal = document.getElementById('modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <h3>${realisasi ? 'Edit' : 'Buat'} Realisasi - ${rpd.month} ${rpd.year}</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            
            <form id="realisasiForm">
                <div class="summary-box" id="realisasiBudgetInfo"></div>
                <div id="realisasiParameters"></div>
                
                <div class="form-group">
                    <label>Upload Dokumen Pendukung (Opsional)</label>
                    <div class="file-upload" id="fileUploadArea">
                        <p>📎 Klik untuk upload file</p>
                        <small>Format: PDF, JPG, PNG | Maksimal ${maxFileSize}MB per file, maksimal ${maxFiles} file</small>
                    </div>
                    <input type="file" id="fileInput" multiple accept=".pdf,.jpg,.jpeg,.png" style="display: none;">
                    <div class="file-list" id="fileList"></div>
                </div>
                
                <div class="summary-box">
                    <div class="summary-item">
                        <span>Total Realisasi:</span>
                        <strong id="realisasiTotal">${formatCurrency(0)}</strong>
                    </div>
                </div>
                
                <button type="submit" class="btn">💾 Simpan Realisasi</button>
            </form>
        </div>
    `;
    
    modal.classList.add('active');
    
    // Reset uploaded files if new realisasi
    if (!realisasi) {
        uploadedFiles = [];
    }
    
    // Load form content
    await showRealisasiInputs(rpd, realisasi);
}

async function showRealisasiEditForm(rpd, realisasi) {
    console.log('[REALISASI EDIT] Loading edit form for:', realisasi.id);
    console.log('[REALISASI EDIT] Realisasi object:', realisasi);
    console.log('[REALISASI EDIT] Files in realisasi:', realisasi.files);
    
    // RESET uploadedFiles SEBELUM membuat modal
    uploadedFiles = [];
    
    // RESTORE files JIKA ada
    if (realisasi.files && Array.isArray(realisasi.files) && realisasi.files.length > 0) {
        console.log('[FILE] Restoring existing files:', realisasi.files.length);
        
        uploadedFiles = realisasi.files.map(file => {
            if (file && file.fileName && file.fileId) {
                return {
                    fileId: file.fileId,
                    fileName: file.fileName,
                    fileUrl: file.fileUrl,
                    mimeType: file.mimeType || 'application/octet-stream',
                    size: file.size || 0
                };
            }
            return null;
        }).filter(f => f !== null);
        
        console.log('[FILE] Files restored successfully:', uploadedFiles.length);
    }
    
    // Use the same form function
    await showRealisasiForm(rpd, realisasi);
}

async function showRealisasiInputs(rpd, realisasi = null) {
    console.log('[REALISASI] Showing inputs for RPD:', rpd);
    console.log('[REALISASI] Existing realisasi data:', realisasi);
    console.log('[FILE] Current uploadedFiles length:', uploadedFiles.length);
    
    // Get budget and realisasi info
    let realisasiBudgetInfo = { 
        budget: 0, 
        totalRealisasi: 0, 
        sisaBudget: 0 
    };
    
    try {
        const yearFilter = document.getElementById('realisasiYearFilter');
        const year = yearFilter ? yearFilter.value : new Date().getFullYear();
        
        const budgets = await apiCall('getBudgets', { 
            kua: currentUser.kua, 
            year: year 
        });
        
        if (budgets && budgets.length > 0) {
            const budget = budgets[0];
            
            // ✅ FIX: Normalisasi field yang tidak konsisten
            const budgetTotal = parseFloat(budget.total) || parseFloat(budget.budget) || 0;
            const totalRealisasi = parseFloat(budget.totalRealisasi) || parseFloat(budget.realisasi) || 0;
            
            realisasiBudgetInfo = {
                budget: budgetTotal,
                totalRealisasi: totalRealisasi,
                sisaBudget: budgetTotal - totalRealisasi
            };
            
            console.log('[REALISASI MODAL] Budget info:', realisasiBudgetInfo);
        }
    } catch (error) {
        console.error('[REALISASI ERROR] Failed to get budget:', error);
    }
    
    document.getElementById('realisasiBudgetInfo').innerHTML = `
        <div class="summary-item">
            <span>Budget Tahunan:</span>
            <strong>${formatCurrency(budgetInfo.budget)}</strong>
        </div>
        <div class="summary-item">
            <span>Nominal RPD ${rpd.month}:</span>
            <strong>${formatCurrency(rpd.total)}</strong>
        </div>
        <div class="summary-item">
            <span>Sisa Budget Tahunan:</span>
            <strong>${formatCurrency(budgetInfo.sisaBudget)}</strong>
        </div>
    `;
    
    const realisasiData = realisasi ? realisasi.data : {};
    let parametersHTML = '';
    
    Object.entries(rpd.data).forEach(([code, items]) => {
        const param = APP_CONFIG.BOP.RPD_PARAMETERS[code];
        parametersHTML += `<div class="rpd-item">
            <h4>${code} - ${param.name}</h4>`;
        
        Object.entries(items).forEach(([item, rpdValue]) => {
            // ✅ Get realisasi value from existing data or default to 0
            const realValue = (realisasi && realisasi.data && realisasi.data[code] && realisasi.data[code][item]) 
                ? realisasi.data[code][item] 
                : 0;
            
            // Check if this is an autopay pos (Listrik or Telepon)
            const isAutopayPos = (code === '522111' || code === '522112');
            let inputHTML = '';
            
            if (isAutopayPos && currentUser.role === 'Operator KUA') {
                // ✅ Show input with autopay placeholder - will be replaced by autopay block
                inputHTML = `
                    <input type="text" 
                        class="realisasi-input autopay-placeholder" 
                        data-code="${code}" 
                        data-item="${item}" 
                        value="${realValue > 0 ? formatNumber(realValue) : ''}" 
                        placeholder="⚡ Checking autopay..."
                        oninput="formatInputNumber(this)"
                        style="background: #fff3cd; border-color: #ffc107;">
                `;
            } else {
                // ✅ Normal input for non-autopay or Admin - use text input with formatting
                inputHTML = `
                    <input type="text" 
                        class="realisasi-input" 
                        data-code="${code}" 
                        data-item="${item}" 
                        value="${realValue > 0 ? formatNumber(realValue) : ''}" 
                        placeholder="0"
                        oninput="formatInputNumber(this)">
                `;
            }
            
            parametersHTML += `
                <div class="rpd-subitem" style="grid-template-columns: 2fr 1fr 1fr; gap: 10px;">
                    <label>${item}</label>
                    <div style="text-align: right; padding: 10px; background: #e9ecef; border-radius: 6px;">
                        <small style="display: block; color: #666; font-size: 11px;">RPD</small>
                        <strong style="color: #333;">${formatCurrency(rpdValue)}</strong>
                    </div>
                    ${inputHTML}
                </div>
            `;
        });
        
        parametersHTML += `</div>`;
    });
    
    document.getElementById('realisasiParameters').innerHTML = parametersHTML;
    
    // ✅ Autopay check for Operator KUA - FIXED with async/await
    if (currentUser.role === 'Operator KUA') {
        const tahun = parseInt(rpd.year);
        const bulan = parseInt(rpd.month);
        const kua = currentUser.kua;
        
        console.log('[AUTOPAY_BLOCK] ========== START AUTOPAY BLOCK ==========');
        console.log('[AUTOPAY_BLOCK] User:', { kua, tahun, bulan, role: currentUser.role });
        
        // Check autopay for Listrik (522111) and Telepon (522112)
        const autopayPOS = [
            { kodePos: '522111', namaPos: 'Belanja Langganan Listrik' },
            { kodePos: '522112', namaPos: 'Belanja Langganan Telepon / Internet' }
        ];
        
        // ✅ Process autopay check sequentially for each POS
        for (const pos of autopayPOS) {
            try {
                console.log('[AUTOPAY_BLOCK] Processing POS:', pos.kodePos);
                
                // ✅ Call both APIs in parallel
                const [isEnabled, autopayDataList] = await Promise.all([
                    autopayApiCall('isAutopayEnabled', { kua: kua, kodePos: pos.kodePos }),
                    autopayApiCall('getAutopayRealisasi', { tahun: tahun, bulan: bulan })
                ]);
                
                console.log('[AUTOPAY_BLOCK] POS', pos.kodePos, 'enabled:', isEnabled, 'type:', typeof isEnabled);
                console.log('[AUTOPAY_BLOCK] Autopay data list:', autopayDataList);
                
                if (!isEnabled) {
                    console.log('[AUTOPAY_BLOCK] Autopay not enabled for', pos.kodePos, '- allow normal input');
                    continue; // Skip to next POS
                }
                
                console.log('[AUTOPAY_BLOCK] ✅ Autopay ENABLED for', pos.kodePos);
                
                // Find autopay data for this KUA and POS
                const autopayRecord = autopayDataList.find(r => {
                    const matchKua = String(r.kua).trim() === String(kua).trim();
                    const matchPos = String(r.kodePos).trim() === String(pos.kodePos).trim();
                    console.log('[AUTOPAY_BLOCK] Comparing:', {
                        record: { kua: r.kua, kodePos: r.kodePos },
                        target: { kua, kodePos: pos.kodePos },
                        match: matchKua && matchPos
                    });
                    return matchKua && matchPos;
                });
                
                console.log('[AUTOPAY_BLOCK] Autopay record found:', autopayRecord);
                
                // ✅ Find all input fields for this POS code
                const inputs = document.querySelectorAll(
                    `.realisasi-input[data-code="${pos.kodePos}"]`
                );
                
                console.log('[AUTOPAY_BLOCK] Found', inputs.length, 'input fields for POS', pos.kodePos);
                
                if (inputs.length === 0) {
                    console.warn('[AUTOPAY_BLOCK] ⚠️ No input fields found for POS', pos.kodePos);
                    console.log('[AUTOPAY_BLOCK] Available inputs:', 
                        Array.from(document.querySelectorAll('.realisasi-input')).map(inp => ({
                            id: inp.id,
                            code: inp.dataset.code,
                            item: inp.dataset.item
                        }))
                    );
                }
                
                inputs.forEach(input => {
                    const item = input.dataset.item;
                    const container = input.parentElement;
                    
                    console.log('[AUTOPAY_BLOCK] Processing input:', { item, hasAutopayRecord: !!autopayRecord });
                    
                    if (autopayRecord && autopayRecord.nominal > 0) {
                        // ✅ Replace input with readonly autopay display
                        console.log('[AUTOPAY_BLOCK] 🔒 BLOCKING input for', item, 'with nominal', autopayRecord.nominal);
                        
                        container.innerHTML = `
                            <div style="padding: 10px; background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); 
                                        border-radius: 6px; border: 2px solid #4CAF50;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <span style="background: white; color: #4CAF50; padding: 4px 8px; 
                                                 border-radius: 4px; font-weight: bold; font-size: 12px;">
                                        🤖 DIBAYAR VIA SAKTI
                                    </span>
                                </div>
                                <div style="background: white; padding: 10px; border-radius: 4px; margin-bottom: 8px;">
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                                        <small style="color: #666;">Nominal:</small>
                                        <strong style="color: #2E7D32; font-size: 16px;">
                                            ${formatCurrency(autopayRecord.nominal)}
                                        </strong>
                                    </div>
                                    ${autopayRecord.keterangan ? `
                                        <div style="border-top: 1px solid #e0e0e0; padding-top: 4px; margin-top: 4px;">
                                            <small style="color: #666;">Keterangan:</small>
                                            <div style="color: #333; font-size: 13px; margin-top: 2px;">
                                                ${autopayRecord.keterangan}
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                                <div style="background: #FFF9C4; padding: 8px; border-radius: 4px; 
                                           border-left: 3px solid #F57C00;">
                                    <small style="color: #E65100; font-size: 11px;">
                                        ⚠️ POS ini tidak dapat diinput manual karena pembayaran 
                                        dilakukan otomatis melalui sistem SAKTI (Autopay).
                                    </small>
                                </div>
                            </div>
                        `;
                        
                        // ✅ Set value in realisasi data for auto-saving
                        if (!window.realisasiData[pos.kodePos]) {
                            window.realisasiData[pos.kodePos] = {};
                        }
                        window.realisasiData[pos.kodePos][item] = autopayRecord.nominal;
                        
                        console.log('[AUTOPAY_BLOCK] ✅ Input blocked and value set:', window.realisasiData[pos.kodePos]);
                        
                    } else if (isEnabled && (!autopayRecord || autopayRecord.nominal === 0)) {
                        // ✅ Autopay enabled but no data yet - show info and disable
                        console.log('[AUTOPAY_BLOCK] ⚠️ Autopay enabled but no data yet - disabling input');
                        
                        const infoDiv = document.createElement('div');
                        infoDiv.style.cssText = 'padding: 8px; background: #E3F2FD; border-radius: 4px; margin-top: 5px;';
                        infoDiv.innerHTML = `
                            <small style="color: #1976D2; font-size: 11px;">
                                ℹ️ POS ini menggunakan Autopay. Admin akan input nominal via SAKTI.
                            </small>
                        `;
                        container.appendChild(infoDiv);
                        
                        // ✅ Disable input
                        input.disabled = true;
                        input.placeholder = 'Menunggu input Admin via SAKTI';
                        input.style.background = '#f5f5f5';
                        input.style.cursor = 'not-allowed';
                        
                        console.log('[AUTOPAY_BLOCK] ✅ Input disabled, waiting for admin input');
                    }
                });
                
            } catch (error) {
                console.error('[AUTOPAY_BLOCK] ❌ Error processing POS', pos.kodePos, ':', error);
            }
        }
        
        console.log('[AUTOPAY_BLOCK] ========== END AUTOPAY BLOCK ==========');
        
        // ✅ Recalculate total after autopay block to include autopay amounts
        setTimeout(() => {
            calculateRealisasiTotal();
            console.log('[AUTOPAY_BLOCK] Total recalculated after autopay block');
        }, 100);
    }
    
    // Calculate total on input change
    const inputs = document.querySelectorAll('.realisasi-input');
    inputs.forEach(input => {
        input.addEventListener('input', calculateRealisasiTotal);
    });
    calculateRealisasiTotal();
    
    // Display existing files dengan preview
    console.log('[FILE] Displaying files, count:', uploadedFiles.length);
    displayUploadedFilesWithPreview();
    
    // Setup file input - PERBAIKAN DI SINI
    const fileUploadArea = document.getElementById('fileUploadArea');
    const fileInput = document.getElementById('fileInput');
    
    console.log('[FILE] File upload area found:', fileUploadArea !== null);
    console.log('[FILE] File input element found:', fileInput !== null);
    
    if (fileUploadArea && fileInput) {
        // Remove old event listeners by cloning
        const newFileUploadArea = fileUploadArea.cloneNode(true);
        const newFileInput = fileInput.cloneNode(true);
        
        fileUploadArea.parentNode.replaceChild(newFileUploadArea, fileUploadArea);
        fileInput.parentNode.replaceChild(newFileInput, fileInput);
        
        // Add click event to upload area
        newFileUploadArea.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('[FILE] Upload area clicked');
            newFileInput.click();
        });
        
        // Add change event to file input
        newFileInput.addEventListener('change', function(e) {
            console.log('[FILE] File input change event triggered');
            console.log('[FILE] Files selected:', e.target.files.length);
            handleFileUpload(e);
        });
        
        console.log('[FILE] Event listeners attached successfully');
    } else {
        console.error('[FILE ERROR] File upload elements not found!');
    }
    
    // Form submit handler
    const realisasiForm = document.getElementById('realisasiForm');
    console.log('[FORM] Form element found:', realisasiForm !== null);

    if (realisasiForm) {
        // Remove existing listener by cloning
        const newForm = realisasiForm.cloneNode(true);
        realisasiForm.parentNode.replaceChild(newForm, realisasiForm);
        
        // Re-attach all event listeners to inputs in new form
        const newInputs = newForm.querySelectorAll('.realisasi-input');
        newInputs.forEach(input => {
            input.addEventListener('input', function() {
                calculateRealisasiTotal();
                modalHasChanges = true; // ✅ Track changes
            });
        });
        
        // Re-attach file upload listeners
        const newFileUploadArea2 = newForm.querySelector('#fileUploadArea');
        const newFileInput2 = newForm.querySelector('#fileInput');
        
        if (newFileUploadArea2 && newFileInput2) {
            newFileUploadArea2.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('[FILE] Upload area clicked (form clone)');
                newFileInput2.click();
            });
            
            newFileInput2.addEventListener('change', function(e) {
                console.log('[FILE] File input change (form clone)');
                handleFileUpload(e);
            });
        }
        
        // Add submit handler
        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('[REALISASI] ========== FORM SUBMIT START ==========');
            console.log('[REALISASI] Submitting realisasi form');
            console.log('[FILE] Total files to submit:', uploadedFiles.length);
            
            const realisasiDataToSave = {};
            let total = 0;
            
            // ✅ STEP 1: Collect data from input fields (manual input)
            newForm.querySelectorAll('.realisasi-input').forEach(input => {
                const code = input.dataset.code;
                const item = input.dataset.item;
                const value = parseFormattedNumber(input.value); // Use parseFormattedNumber instead of parseFloat
                
                if (!realisasiDataToSave[code]) realisasiDataToSave[code] = {};
                realisasiDataToSave[code][item] = value;
                total += value;
            });
            
            console.log('[REALISASI] Data from inputs:', realisasiDataToSave);
            console.log('[REALISASI] Total from inputs:', total);
            
            // ✅ STEP 2: Add autopay data from global realisasiData variable
            // This includes values that were blocked/disabled by autopay
            if (realisasiData && Object.keys(realisasiData).length > 0) {
                console.log('[AUTOPAY_SUBMIT] Merging autopay data:', realisasiData);
                
                Object.keys(realisasiData).forEach(code => {
                    if (!realisasiDataToSave[code]) {
                        realisasiDataToSave[code] = {};
                    }
                    
                    Object.keys(realisasiData[code]).forEach(item => {
                        const autopayValue = parseFloat(realisasiData[code][item]) || 0;
                        
                        // Only add autopay value if it's not already in realisasiDataToSave
                        // (meaning the input was blocked and replaced with autopay display)
                        if (realisasiDataToSave[code][item] === undefined) {
                            console.log('[AUTOPAY_SUBMIT] Adding autopay value:', { code, item, value: autopayValue });
                            realisasiDataToSave[code][item] = autopayValue;
                            total += autopayValue;
                        }
                    });
                });
            }
            
            console.log('[REALISASI] Final data to save (with autopay):', realisasiDataToSave);
            console.log('[REALISASI] Final total (with autopay):', total);
            
            try {
                let newStatus = realisasi ? realisasi.status : 'Menunggu';
                if (realisasi && realisasi.status === 'Ditolak') {
                    newStatus = 'Menunggu';
                    console.log('[REALISASI] Status changed from Ditolak to Menunggu');
                }
                
                // Upload files to Google Drive first
                const uploadedFileIds = [];
                
                if (uploadedFiles.length > 0) {
                    console.log('[FILE] Uploading', uploadedFiles.length, 'files to Google Drive');
                    showLoading();
                    
                    for (let i = 0; i < uploadedFiles.length; i++) {
                        const file = uploadedFiles[i];
                        
                        // Skip files yang sudah ada fileId
                        if (file.fileId) {
                            console.log(`[FILE] File ${i + 1} already uploaded:`, file.fileName);
                            uploadedFileIds.push({
                                fileId: file.fileId,
                                fileName: file.fileName,
                                fileUrl: file.fileUrl,
                                mimeType: file.mimeType,
                                size: file.size
                            });
                            continue;
                        }
                        
                        // Upload file baru
                        console.log(`[FILE] Uploading file ${i + 1}/${uploadedFiles.length}:`, file.fileName);
                        
                        try {
                            const uploadResult = await apiCall('uploadFile', {
                                fileName: file.fileName,
                                fileData: file.fileData,
                                mimeType: file.mimeType,
                                kua: currentUser.kua,
                                month: rpd.month,
                                year: rpd.year
                            });
                            
                            console.log(`[FILE] Upload successful:`, uploadResult);
                            
                            uploadedFileIds.push({
                                fileId: uploadResult.fileId,
                                fileName: uploadResult.fileName,
                                fileUrl: uploadResult.fileUrl,
                                mimeType: file.mimeType,
                                size: file.size
                            });
                        } catch (uploadError) {
                            console.error(`[FILE] Upload failed for ${file.fileName}:`, uploadError);
                            hideLoading();
                            showNotification(`Gagal upload file ${file.fileName}: ${uploadError.message}`, 'error');
                            return;
                        }
                    }
                    
                    hideLoading();
                    console.log('[FILE] All files uploaded successfully:', uploadedFileIds.length);
                }
                
                console.log('[REALISASI] Preparing data to send...');
                
                const payload = {
                    id: realisasi ? realisasi.id : null,
                    kua: currentUser.kua,
                    userId: currentUser.id,
                    username: currentUser.username,
                    role: currentUser.role,
                    month: rpd.month,
                    year: rpd.year,
                    rpdId: rpd.id,
                    realisasiData: realisasiDataToSave,
                    total: total,
                    files: uploadedFileIds,
                    status: newStatus
                };
                
                await apiCall('saveRealisasi', payload);
                
                console.log('[REALISASI] Save successful');
                
                // ✅ STEP 1: Hapus cache yang terkait
                console.log('[SAVE_REALISASI] Invalidating related cache');
                clearLocalCache('realisasis');     // Hapus cache realisasi
                clearLocalCache('dashboardStats'); // Hapus cache dashboard
                
                // ✅ STEP 2: Tutup modal
                closeModal();
                
                // ✅ STEP 3: Reload dengan FORCE REFRESH
                console.log('[SAVE_REALISASI] Reloading fresh data');
                await loadRealisasis(true);        // Force refresh realisasi
                await loadDashboardStats(true);    // Force refresh dashboard
                
                // ✅ STEP 4: Notifikasi
                showNotification('Realisasi berhasil disimpan', 'success');
                
                // ✅ Close modal without confirmation
                modalHasChanges = false; // Reset changes flag
                closeRealisasiModal(true); // Skip confirmation karena sudah saved
                
                console.log('[REALISASI] ========== FORM SUBMIT END ==========');
                
            } catch (error) {
                console.error('[REALISASI ERROR] Save failed:', error);
                console.log('[REALISASI] ========== FORM SUBMIT END (ERROR) ==========');
                showNotification(error.message, 'error');
            }
        });
        
        console.log('[FORM] Submit listener attached');        
    } else {
        console.error('[FORM ERROR] Form element not found!');
    }
}

// Tambahkan fungsi baru ini setelah fungsi displayUploadedFiles
function displayUploadedFilesWithPreview() {
    console.log('[FILE] ========== DISPLAY FILES WITH PREVIEW START ==========');
    const fileList = document.getElementById('fileList');
    console.log('[FILE] File list element:', fileList);
    
    if (!fileList) {
        console.error('[FILE ERROR] File list element not found!');
        console.log('[FILE] ========== DISPLAY FILES END (ERROR) ==========');
        return;
    }
    
    console.log('[FILE] Current uploadedFiles array length:', uploadedFiles.length);
    console.log('[FILE] Files to display:', uploadedFiles);
    
    if (uploadedFiles.length === 0) {
        console.log('[FILE] No files to display');
        fileList.innerHTML = '<p style="color: #999; font-style: italic; padding: 10px;">Belum ada file yang diupload</p>';
    } else {
        const html = uploadedFiles.map((file, index) => {
            if (!file || !file.fileName) {
                console.warn(`[FILE] Invalid file at index ${index}`);
                return '';
            }
            
            console.log(`[FILE] Creating HTML for file ${index}:`, file.fileName);
            
            const isImage = file.mimeType && file.mimeType.startsWith('image/');
            const isPDF = file.mimeType === 'application/pdf';
            const hasFileId = !!file.fileId; // File sudah diupload ke Drive
            
            let previewHTML = '';
            
            if (hasFileId) {
                // File dari Drive - gunakan preview URL
                const previewUrl = getDrivePreviewUrl(file.fileUrl, file.mimeType);
                console.log(`[FILE] Preview URL for ${file.fileName}:`, previewUrl);
                
                if (isImage) {
                    previewHTML = `
                        <div style="width: 100%; text-align: center; margin-top: 10px;">
                            <img src="${previewUrl}" 
                                alt="${file.fileName}" 
                                style="max-width: 100%; max-height: 300px; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                                onclick="window.open('${file.fileUrl}', '_blank')"
                                onerror="this.onerror=null; this.src='https://drive.google.com/uc?export=view&id=${file.fileId || file.fileUrl.match(/[-\\w]{25,}/)?.[0]}'; if(this.complete && this.naturalHeight === 0) { this.style.display='none'; this.nextElementSibling.style.display='block'; }">
                            <div style="display: none; margin-top: 10px; padding: 10px; background: #e3f2fd; border-radius: 6px;">
                                <p style="color: #1976d2; margin: 0 0 10px 0; font-size: 12px;">🖼️ Preview tidak dapat dimuat</p>
                                <button type="button" class="btn btn-sm btn-info" onclick="window.open('${file.fileUrl}', '_blank')">Buka di Google Drive</button>
                            </div>
                        </div>
                    `;
                } else if (isPDF) {
                    previewHTML = `
                        <div style="width: 100%; margin-top: 10px;">
                            <iframe src="${previewUrl}" 
                                    style="width: 100%; height: 500px; border: 1px solid #ddd; border-radius: 8px;"
                                    onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            </iframe>
                            <div style="display: none; background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                                <p style="color: #666; margin: 0 0 10px 0;">📄 File PDF</p>
                                <button type="button" class="btn btn-sm" onclick="window.open('${file.fileUrl}', '_blank')">Buka PDF</button>
                            </div>
                        </div>
                    `;
                }
            } else {
                // File baru yang belum diupload - preview dari base64
                if (isImage && file.fileData) {
                    previewHTML = `
                        <div style="width: 100%; text-align: center; margin-top: 10px;">
                            <img src="data:${file.mimeType};base64,${file.fileData}" 
                                alt="${file.fileName}" 
                                style="max-width: 100%; max-height: 300px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                        </div>
                    `;
                } else if (isPDF) {
                    previewHTML = `
                        <p style="color: #666; font-style: italic; margin-top: 10px; font-size: 12px;">
                            📄 Preview PDF akan tersedia setelah disimpan
                        </p>
                    `;
                }
            }
            
            return `
                <div class="file-item" style="flex-direction: column; align-items: flex-start; padding: 15px; margin-bottom: 15px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                        <div>
                            <span style="font-weight: 500;">📎 ${file.fileName}</span>
                            <small style="display: block; color: #666; margin-top: 5px;">
                                ${((file.size || 0) / 1024).toFixed(2)} KB
                                ${hasFileId ? '<span style="color: #28a745; margin-left: 10px;">✓ Tersimpan</span>' : '<span style="color: #ffc107; margin-left: 10px;">⚠ Belum tersimpan</span>'}
                            </small>
                        </div>
                        <div style="display: flex; gap: 5px;">
                            ${hasFileId ? `
                                <button type="button" class="btn btn-sm btn-info" onclick="window.open('${file.fileUrl}', '_blank')">Buka</button>
                            ` : ''}
                            <button type="button" class="btn btn-danger btn-sm" onclick="removeFileConfirm(${index}, '${file.fileName.replace(/'/g, "\\'")}')">Hapus</button>
                        </div>
                    </div>
                    ${previewHTML}
                </div>
            `;
        }).filter(html => html !== '').join('');
        
        console.log('[FILE] Setting fileList innerHTML');
        fileList.innerHTML = html;
        console.log('[FILE] File list updated with', uploadedFiles.length, 'files');
    }
    
    console.log('[FILE] ========== DISPLAY FILES WITH PREVIEW END ==========');
}

function calculateRealisasiTotal() {
    let total = 0;
    
    console.log('[CALCULATE_REALISASI_TOTAL] Starting calculation...');
    
    const inputs = document.querySelectorAll('.realisasi-input');
    inputs.forEach((input, index) => {
        // ✅ Parse formatted value
        const value = parseFormattedNumber(input.value);
        total += value;
        
        console.log(`[CALCULATE_REALISASI_TOTAL] Input ${index + 1} (${input.id}): ${input.value} → ${value}`);
    });
    
    console.log('[CALCULATE_REALISASI_TOTAL] Total:', total);
    
    // ✅ FIX: Update correct element ID
    const totalElement = document.getElementById('realisasiTotalDisplay');
    if (totalElement) {
        totalElement.textContent = formatCurrency(total);
        console.log('[CALCULATE_REALISASI_TOTAL] Display updated:', formatCurrency(total));
    } else {
        console.warn('[CALCULATE_REALISASI_TOTAL] Element realisasiTotalDisplay not found!');
    }
}

async function handleFileUpload(e) {
    console.log('[FILE] ========== FILE UPLOAD START ==========');
    console.log('[FILE] Event type:', e.type);
    console.log('[FILE] Files selected:', e.target.files.length);
    console.log('[FILE] Current uploadedFiles length BEFORE processing:', uploadedFiles.length);
    
    const files = e.target.files;
    
    if (files.length === 0) {
        console.warn('[FILE] No files selected');
        console.log('[FILE] ========== FILE UPLOAD END (NO FILES) ==========');
        return;
    }
    
    // Get config for max file size
    let maxSize = 5 * 1024 * 1024; // Default 5MB
    let maxFiles = 10; // Default 10 files
    
    try {
        const config = await apiCall('getRPDConfig');
        if (config.REALISASI_MAX_FILE_SIZE) {
            maxSize = parseInt(config.REALISASI_MAX_FILE_SIZE) * 1024 * 1024;
        }
        if (config.REALISASI_MAX_FILES) {
            maxFiles = parseInt(config.REALISASI_MAX_FILES);
        }
    } catch (error) {
        console.warn('[FILE] Failed to get config, using default values');
    }
    
    // Check total files limit
    if (uploadedFiles.length + files.length > maxFiles) {
        showNotification(`Maksimal ${maxFiles} file yang dapat diupload`, 'warning');
        console.log('[FILE] ========== FILE UPLOAD END (TOO MANY FILES) ==========');
        return;
    }
    
    let processedCount = 0;
    
    // Process each file
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        console.log(`[FILE] Processing file ${i + 1}/${files.length}:`, file.name);
        console.log(`[FILE] File size: ${file.size} bytes (${(file.size / 1024).toFixed(2)} KB)`);
        console.log(`[FILE] File type: ${file.type}`);
        
        if (file.size > maxSize) {
            console.warn(`[FILE] File too large: ${file.name}`);
            showNotification(`File ${file.name} terlalu besar (maksimal ${maxSize / 1024 / 1024}MB)`, 'warning');
            continue;
        }
        
        try {
            const base64Data = await readFileAsBase64(file);
            console.log(`[FILE] Successfully read file: ${file.name}`);
            console.log(`[FILE] Base64 length: ${base64Data.length} characters`);
            
            const fileObject = {
                fileName: file.name,
                fileData: base64Data,
                mimeType: file.type,
                size: file.size
            };
            
            uploadedFiles.push(fileObject);
            processedCount++;
            
            console.log(`[FILE] File added to uploadedFiles array`);
            console.log(`[FILE] Current uploadedFiles length: ${uploadedFiles.length}`);
        } catch (error) {
            console.error(`[FILE ERROR] Error reading file ${file.name}:`, error);
            showNotification(`Gagal membaca file ${file.name}`, 'error');
        }
    }
    
    console.log('[FILE] Total files processed:', processedCount);
    console.log('[FILE] Total uploadedFiles now:', uploadedFiles.length);
    
    // Display files
    displayUploadedFilesWithPreview();
    
    if (processedCount > 0) {
        showNotification(`${processedCount} file berhasil ditambahkan`, 'success');
    }
    
    // Reset input
    e.target.value = '';
    console.log('[FILE] File input value reset');
    console.log('[FILE] ========== FILE UPLOAD END ==========');
}

function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(event) {
            const base64Data = event.target.result.split(',')[1];
            resolve(base64Data);
        };
        
        reader.onerror = function(error) {
            reject(error);
        };
        
        reader.readAsDataURL(file);
    });
}

function displayUploadedFiles() {
    console.log('[DISPLAY_FILES] Displaying uploaded files:', uploadedFiles.length);
    
    const container = document.getElementById('uploadedFilesContainer');
    
    if (!container) {
        console.error('[DISPLAY_FILES] Container not found');
        return;
    }
    
    if (uploadedFiles.length === 0) {
        container.innerHTML = '<p style="color: #999; font-size: 14px;">Belum ada file yang dipilih</p>';
        return;
    }
    
    let html = '<div class="uploaded-files-list">';
    
    uploadedFiles.forEach((file, index) => {
        html += `
            <div class="uploaded-file-item" data-temp-id="${file.tempId}">
                <div class="file-info">
                    <i class="fas fa-file${file.mimeType === 'application/pdf' ? '-pdf' : '-image'}"></i>
                    <div class="file-details">
                        <div class="file-name">${file.fileName}</div>
                        <div class="file-size">${formatFileSize(file.fileSize)}</div>
                    </div>
                </div>
                <button 
                    type="button" 
                    class="btn-remove-file" 
                    onclick="removeUploadedFile('${file.tempId}')"
                    title="Hapus file">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    });
    
    html += '</div>';
    
    container.innerHTML = html;
    
    // Update file count
    updateFileCount();
}

function removeUploadedFile(tempId) {
    console.log('[REMOVE_FILE] Removing file with tempId:', tempId);
    
    const index = uploadedFiles.findIndex(f => f.tempId === tempId);
    
    if (index !== -1) {
        const removed = uploadedFiles.splice(index, 1)[0];
        console.log('[REMOVE_FILE] File removed:', removed.fileName);
        
        displayUploadedFiles();
        
        showNotification(`File ${removed.fileName} dihapus`, 'success');
    }
}

function removeFileConfirm(index, fileName) {
    const file = uploadedFiles[index];
    
    let message = `Hapus file "${fileName}"?`;
    if (file && file.fileId) {
        message += '\n\nCatatan: File akan dihapus dari daftar (file di Google Drive tetap ada).';
    }
    
    if (confirm(message)) {
        removeFile(index);
    }
}

function removeFile(index) {
    console.log('[FILE] ========== REMOVE FILE START ==========');
    console.log('[FILE] Removing file at index:', index);
    console.log('[FILE] File to remove:', uploadedFiles[index]);
    console.log('[FILE] Current uploadedFiles length:', uploadedFiles.length);
    
    uploadedFiles.splice(index, 1);
    
    console.log('[FILE] File removed');
    console.log('[FILE] New uploadedFiles length:', uploadedFiles.length);
    console.log('[FILE] Remaining files:', uploadedFiles.map(f => f.fileName));
    
    displayUploadedFilesWithPreview();
    console.log('[FILE] ========== REMOVE FILE END ==========');
}

async function viewRealisasi(realisasi) {
    console.log('[VIEW_REALISASI] Opening detail view');
    console.log('[VIEW_REALISASI] Realisasi data:', realisasi);
    console.log('[VIEW_REALISASI] Files:', realisasi.files);
    
    let modal = document.getElementById('modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    // ✅ FIX BUG #3: Format detail dengan logic yang benar
    let detailHTML = '';
    
    // ✅ Get autopay info for autopay POS codes (async)
    const autopayPOSCodes = ['522111', '522112'];
    const autopayInfoMap = {};
    
    for (const code of autopayPOSCodes) {
        if (realisasi.data[code]) {
            const autopayInfo = await getAutopayInfo(
                realisasi.kua,
                parseInt(realisasi.year),
                parseInt(realisasi.month),
                code
            );
            autopayInfoMap[code] = autopayInfo;
        }
    }
    
    Object.entries(realisasi.data).forEach(([code, items]) => {
        const param = APP_CONFIG.BOP.RPD_PARAMETERS[code];
        
        // Konversi items ke array untuk pengecekan
        const itemsArray = Object.entries(items);
        const hasMultipleItems = itemsArray.length > 1;
        const onlyNominal = itemsArray.length === 1 && itemsArray[0][0] === 'Nominal';
        
        console.log(`[VIEW_REALISASI] ${code} - ${param.name}:`, {
            itemsCount: itemsArray.length,
            hasMultipleItems,
            onlyNominal,
            items: items
        });
        
        detailHTML += `<div class="rpd-item">`;
        
        if (onlyNominal) {
            // ✅ Jika hanya "Nominal", tampilkan value langsung di samping nama akun
            const nominalValue = items['Nominal'];
            detailHTML += `
                <div class="rpd-subitem">
                    <span style="font-weight: 600; color: #333;">${code} - ${param.name}</span>
                    <strong style="font-size: 16px; color: #667eea;">${formatCurrency(nominalValue)}</strong>
                </div>
            `;
            
            // ✅ Tampilkan autopay info jika POS ini adalah autopay
            if (autopayInfoMap[code]) {
                detailHTML += generateAutopayInfoHTML(autopayInfoMap[code], param.name);
            }
        } else if (hasMultipleItems) {
            // ✅ Jika ada breakdown (multiple items), jangan tampilkan total parent
            detailHTML += `<h4>${code} - ${param.name}</h4>`;
            
            itemsArray.forEach(([item, value]) => {
                detailHTML += `
                    <div class="rpd-subitem">
                        <span>${item}</span>
                        <strong>${formatCurrency(value)}</strong>
                    </div>
                `;
            });
            
            // ✅ Tampilkan autopay info jika POS ini adalah autopay
            if (autopayInfoMap[code]) {
                detailHTML += generateAutopayInfoHTML(autopayInfoMap[code], param.name);
            }
        } else {
            // ✅ Untuk kasus lainnya (seharusnya tidak ada)
            detailHTML += `<h4>${code} - ${param.name}</h4>`;
            itemsArray.forEach(([item, value]) => {
                detailHTML += `
                    <div class="rpd-subitem">
                        <span>${item}</span>
                        <strong>${formatCurrency(value)}</strong>
                    </div>
                `;
            });
            
            // ✅ Tampilkan autopay info jika POS ini adalah autopay
            if (autopayInfoMap[code]) {
                detailHTML += generateAutopayInfoHTML(autopayInfoMap[code], param.name);
            }
        }
        
        detailHTML += `</div>`;
    });
    
    let statusClass = 'warning';
    if (realisasi.status === 'Diterima') statusClass = 'success';
    else if (realisasi.status === 'Ditolak') statusClass = 'danger';
    
    // ✅ FIX BUG #2: Parse files dan buat preview seperti di Detail Verifikasi
    let files = [];
    if (realisasi.files) {
        console.log('[VIEW_REALISASI] Raw files:', realisasi.files);
        console.log('[VIEW_REALISASI] Files type:', typeof realisasi.files);
        
        if (typeof realisasi.files === 'string' && realisasi.files.trim() !== '') {
            try {
                files = JSON.parse(realisasi.files);
                console.log('[VIEW_REALISASI] Parsed files from string:', files);
            } catch (e) {
                console.error('[VIEW_REALISASI] Error parsing files:', e);
                files = [];
            }
        } else if (Array.isArray(realisasi.files)) {
            files = realisasi.files;
            console.log('[VIEW_REALISASI] Files already array');
        }
        
        if (!Array.isArray(files)) {
            console.warn('[VIEW_REALISASI] files is not array, resetting');
            files = [];
        }
        
        // Filter out invalid files
        files = files.filter(file => {
            const isValid = file && (file.fileName || file.uniqueName) && (file.fileUrl || file.fileId);
            if (!isValid) {
                console.warn('[VIEW_REALISASI] Invalid file filtered out:', file);
            }
            return isValid;
        });
        
        console.log('[VIEW_REALISASI] Valid files after filter:', files.length);
    }
    
    console.log('[VIEW_REALISASI] Files array length:', files.length);
    
    // ✅ FIX BUG #2: Build files HTML dengan style yang sama seperti Detail Verifikasi
    let filesHTML = '';
    if (Array.isArray(files) && files.length > 0) {
        console.log('[VIEW_REALISASI] Processing files for display:', files.length);
        
        filesHTML = `
            <div class="rpd-item">
                <h4>📎 Dokumen Pendukung (${files.length} file)</h4>
                ${files.map((file, index) => {
                    console.log(`[VIEW_REALISASI] File ${index + 1}:`, file);
                    
                    if (!file || !file.fileName) {
                        return `<div class="file-item">
                            <span>⚠️ File tidak valid</span>
                        </div>`;
                    }
                    
                    const isImage = file.mimeType && file.mimeType.startsWith('image/');
                    const isPDF = file.mimeType === 'application/pdf';
                    const previewUrl = getDrivePreviewUrl(file.fileUrl, file.mimeType);
                    const fileId = file.fileId || file.fileUrl.match(/[-\w]{25,}/)?.[0];
                    
                    console.log(`[VIEW_REALISASI] Preview URL for ${file.fileName}:`, previewUrl);
                    
                    return `
                        <div class="file-item" style="flex-direction: column; align-items: flex-start; padding: 15px; margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 10px;">
                                <span style="font-weight: 500;">📎 ${file.fileName}</span>
                                <span class="file-size">(${formatFileSize(file.size)})</span>
                                <div style="display: flex; gap: 5px;">
                                    <button type="button" class="btn btn-sm" onclick="window.open('${file.fileUrl}', '_blank')">Buka</button>
                                    <button type="button" class="btn btn-sm btn-info" onclick="downloadDriveFile('${file.fileUrl}', '${file.fileName}')">Download</button>
                                </div>
                            </div>
                            ${isImage ? `
                                <div style="width: 100%; text-align: center;">
                                    <img src="${previewUrl}" 
                                        alt="${file.fileName}" 
                                        style="max-width: 100%; max-height: 400px; border-radius: 8px; margin-top: 10px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"
                                        onclick="window.open('${file.fileUrl}', '_blank')"
                                        onerror="this.onerror=null; this.src='https://drive.google.com/uc?export=view&id=${fileId}'; if(this.complete && this.naturalHeight === 0) { this.style.display='none'; this.nextElementSibling.style.display='block'; }">
                                    <div style="display: none; margin-top: 10px; padding: 15px; background: #e3f2fd; border-radius: 8px; text-align: center;">
                                        <p style="color: #1976d2; margin: 0 0 10px 0;">🖼️ Gambar sedang dimuat atau tidak dapat ditampilkan</p>
                                        <button type="button" class="btn btn-sm btn-info" onclick="window.open('${file.fileUrl}', '_blank')">Buka di Google Drive</button>
                                    </div>
                                </div>
                            ` : isPDF ? `
                                <div style="width: 100%; margin-top: 10px;">
                                    <iframe src="${previewUrl}" 
                                            style="width: 100%; height: 500px; border: 1px solid #ddd; border-radius: 8px;"
                                            onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                    </iframe>
                                    <div style="display: none; background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                                        <p style="color: #666; margin: 0 0 10px 0;">📄 File PDF</p>
                                        <p style="color: #999; font-size: 12px; margin: 0 0 15px 0;">Jika preview tidak muncul, silakan buka di tab baru</p>
                                        <button type="button" class="btn btn-sm" onclick="window.open('${file.fileUrl}', '_blank')">Buka PDF di Tab Baru</button>
                                    </div>
                                </div>
                            ` : `
                                <p style="color: #666; font-style: italic; margin-top: 10px;">
                                    📄 Preview tidak tersedia untuk tipe file ini. 
                                    <button type="button" class="btn btn-sm" onclick="window.open('${file.fileUrl}', '_blank')">Buka file</button>
                                </p>
                            `}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } else {
        console.log('[VIEW_REALISASI] No files to display');
        filesHTML = `
            <div class="rpd-item">
                <h4>📎 Dokumen Pendukung</h4>
                <p style="color: #999; font-style: italic; padding: 15px; background: #f8f9fa; border-radius: 6px;">
                    Tidak ada dokumen pendukung
                </p>
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <h3>Detail Realisasi - ${realisasi.month || 'Unknown'} ${realisasi.year || ''}</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            
            <div class="summary-box">
                <div class="summary-item">
                    <span>Status:</span>
                    <span class="badge badge-${statusClass}">${realisasi.status || 'Menunggu'}</span>
                </div>
                ${realisasi.verifiedBy ? `
                <div class="summary-item">
                    <span>Diverifikasi Oleh:</span>
                    <span>${realisasi.verifiedBy}</span>
                </div>
                ` : ''}
                ${realisasi.verifiedAt ? `
                <div class="summary-item">
                    <span>Tanggal Verifikasi:</span>
                    <span>${formatDate(realisasi.verifiedAt)}</span>
                </div>
                ` : ''}
                ${realisasi.notes ? `
                <div class="summary-item" style="flex-direction: column; align-items: flex-start;">
                    <span style="margin-bottom: 5px;">Catatan:</span>
                    <span style="padding: 10px; background: #f8f9fa; border-radius: 6px; width: 100%;">${realisasi.notes}</span>
                </div>
                ` : ''}
            </div>
            
            ${detailHTML}
            ${filesHTML}
            
            <div class="summary-box">
                <div class="summary-item">
                    <span>Total Realisasi:</span>
                    <strong>${formatCurrency(realisasi.total)}</strong>
                </div>
            </div>
            
            <!-- Dual Totals Placeholder -->
            <div id="dualTotalsContainer"></div>
        </div>
    `;
    
    modal.classList.add('active');
    
    // Calculate and display dual totals (async)
    getAutopayTotal(realisasi.year, realisasi.month, realisasi.kua).then(autopayTotal => {
        const totalRealisasi = realisasi.total || 0;
        const totalPencairan = totalRealisasi - autopayTotal;
        
        const totalsHTML = `
            <div style="margin-top: 20px; padding: 15px; background: linear-gradient(to bottom, #f9f9f9, #ffffff); border-radius: 8px; border: 1px solid #e0e0e0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h4 style="margin: 0 0 15px 0; color: #333; font-size: 14px; border-bottom: 2px solid #1976D2; padding-bottom: 8px;">
                    <i class="fas fa-calculator"></i> Ringkasan Total
                </h4>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 10px; background: #E3F2FD; border-radius: 4px;">
                    <strong style="color: #1565C0;">Total Realisasi:</strong>
                    <strong style="color: #1976D2; font-size: 18px;">${formatCurrency(totalRealisasi)}</strong>
                </div>
                
                ${autopayTotal > 0 ? `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 10px; background: #FFF3E0; border-radius: 4px;">
                        <span style="color: #E65100;">
                            <i class="fas fa-robot"></i> Dibayar via Autopay:
                        </span>
                        <span style="color: #F57C00; font-size: 16px;">- ${formatCurrency(autopayTotal)}</span>
                    </div>
                    
                    <div style="height: 1px; background: linear-gradient(to right, transparent, #ccc, transparent); margin: 15px 0;"></div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #E8F5E9; border-radius: 4px; border: 2px solid #4CAF50;">
                        <strong style="color: #2E7D32; font-size: 16px;">
                            <i class="fas fa-money-bill-wave"></i> Total Pencairan KUA:
                        </strong>
                        <strong style="color: #2E7D32; font-size: 20px;">${formatCurrency(totalPencairan)}</strong>
                    </div>
                    
                    <div style="margin-top: 12px; padding: 10px; background: #FFFDE7; border-left: 4px solid #FBC02D; border-radius: 4px;">
                        <small style="color: #F57C00; font-size: 11px; display: block; line-height: 1.5;">
                            <i class="fas fa-info-circle"></i> 
                            <strong>Total Pencairan KUA</strong> adalah jumlah yang sebenarnya diterima oleh KUA setelah dikurangi pembayaran yang dilakukan melalui sistem SAKTI (Autopay).
                        </small>
                    </div>
                ` : `
                    <div style="margin-top: 10px; padding: 10px; background: #E8F5E9; border-left: 4px solid #4CAF50; border-radius: 4px;">
                        <small style="color: #2E7D32; font-size: 12px;">
                            <i class="fas fa-check-circle"></i> 
                            Tidak ada pembayaran autopay untuk periode ini. Total Pencairan sama dengan Total Realisasi.
                        </small>
                    </div>
                `}
            </div>
        `;
        
        // Insert into modal
        const container = document.getElementById('dualTotalsContainer');
        if (container) {
            container.innerHTML = totalsHTML;
        }
    }).catch(error => {
        console.error('[DETAIL_TOTALS] Error:', error);
    });
}

function editRealisasi(realisasi) {
    showRealisasiModal(realisasi);
}

// ===== VERIFIKASI MANAGEMENT (UPDATED WITH CACHE) =====
async function loadVerifikasi(forceRefresh = false) {
    console.log('[VERIFIKASI] Loading verifikasi', { forceRefresh });
    
    // ✅ ALWAYS cek cache dulu
    const cachedData = getLocalCache('verifikasi');
    if (cachedData && !forceRefresh) {
        console.log('[VERIFIKASI] Using cached data - NO SERVER CALL');
        displayVerifikasi(cachedData);
        return;
    }
    
    // ✅ Only fetch dari server jika force refresh atau belum ada cache
    if (forceRefresh || !cachedData) {
        console.log('[VERIFIKASI] Fetching from server...');
        // ❌ NO LOADING SPINNER
        
        try {
            const yearFilter = document.getElementById('verifikasiYearFilter');
            const year = yearFilter ? yearFilter.value : new Date().getFullYear();
            
            // Get all realisasis for the year
            let realisasis = await apiCall('getRealisasis', { year: year });
            
            // ✅ Update local cache
            updateLocalCache('verifikasi', realisasis);
            
            displayVerifikasi(realisasis);
            
        } catch (error) {
            console.error('[VERIFIKASI ERROR]', error);
        }
    }
}

// ✅ Fungsi baru untuk display verifikasi (separated from loading)
function displayVerifikasi(realisasis) {
    const tbody = document.querySelector('#verifikasiTable tbody');
    
    // ✅ FIX: READ FILTER VALUES
    const kuaFilter = document.getElementById('verifikasiKUAFilter');
    const statusFilter = document.getElementById('verifikasiStatusFilter');
    const yearFilter = document.getElementById('verifikasiYearFilter');
    
    const selectedKUA = kuaFilter ? kuaFilter.value : '';
    const selectedStatus = statusFilter ? statusFilter.value : '';
    const selectedYear = yearFilter ? yearFilter.value : new Date().getFullYear();
    
    console.log('[VERIFIKASI] Displaying data with filters:', {
        kua: selectedKUA,
        status: selectedStatus,
        year: selectedYear
    });
    
    // ✅ APPLY FILTERS
    let filteredData = realisasis.filter(real => {
        let passKUA = !selectedKUA || real.kua === selectedKUA;
        let passStatus = !selectedStatus || real.status === selectedStatus;
        let passYear = !selectedYear || real.year == selectedYear;
        
        return passKUA && passStatus && passYear;
    });
    
    console.log('[VERIFIKASI] Filtered from', realisasis.length, 'to', filteredData.length, 'records');
    
    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Tidak ada data realisasi yang perlu diverifikasi</td></tr>';
        console.log('[VERIFIKASI] No data to display');
        return;
    }
    
    let totalNominal = 0;
    
    const rows = filteredData.map((real, index) => {
        totalNominal += parseFloat(real.total || 0);
        
        let statusClass = 'warning';
        let statusText = 'Pending';
        
        if (real.status === 'Diterima') {
            statusClass = 'success';
            statusText = 'Diterima';
        } else if (real.status === 'Ditolak') {
            statusClass = 'danger';
            statusText = 'Ditolak';
        }
        
        const realEscaped = JSON.stringify(real).replace(/"/g, '&quot;');
        
        console.log('[VERIFIKASI] Row', index + 1, ':', {
            kua: real.kua,
            month: real.month,
            year: real.year,
            total: real.total,
            status: real.status,
            files: real.files ? real.files.length : 0
        });
        
        return `
        <tr>
            <td>${index + 1}</td>
            <td>${real.kua || '-'}</td>
            <td>${real.month || '-'}</td>
            <td>${real.year || '-'}</td>
            <td>${formatCurrency(real.total || 0)}</td>
            <td>${real.createdAt ? formatDate(real.createdAt) : '-'}</td>
            <td><span class="badge badge-${statusClass}">${statusText}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm" onclick='verifyRealisasi(${realEscaped})'>Verifikasi</button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
    
    const totalRow = `
        <tr style="background: #f8f9fa; font-weight: bold;">
            <td colspan="4" style="text-align: right;">TOTAL:</td>
            <td>${formatCurrency(totalNominal)}</td>
            <td colspan="3"></td>
        </tr>
    `;
    
    // Set innerHTML first
    tbody.innerHTML = rows + totalRow;
    console.log('[VERIFIKASI] Displayed', filteredData.length, 'records');
}

// ✅ Handler untuk filter changes (gunakan cache, hanya re-display)
function onVerifikasiFilterChange() {
    console.log('[VERIFIKASI] Filter changed');
    
    const cachedData = getCache('verifikasi');
    
    if (cachedData) {
        // Jika ada cache, update filters dan re-display
        const kuaFilter = document.getElementById('verifikasiKUAFilter');
        const statusFilter = document.getElementById('verifikasiStatusFilter');
        const yearFilter = document.getElementById('verifikasiYearFilter');
        
        const newFilters = {
            kua: kuaFilter ? kuaFilter.value : '',
            status: statusFilter ? statusFilter.value : '',
            year: yearFilter ? yearFilter.value : new Date().getFullYear()
        };
        
        // Jika year berubah, perlu reload dari server
        if (newFilters.year !== cachedData.filters.year) {
            console.log('[VERIFIKASI] Year changed, force refresh');
            loadVerifikasi(true);
        } else {
            // Jika hanya KUA atau Status yang berubah, cukup re-display
            console.log('[VERIFIKASI] Only filter changed, using cache');
            displayVerifikasi(cachedData.realisasis, newFilters);
            
            // Update cached filters
            cachedData.filters = newFilters;
        }
    } else {
        // Jika tidak ada cache, load dari server
        console.log('[VERIFIKASI] No cache, loading from server');
        loadVerifikasi(true);
    }
}

// ===== VERIFIKASI REALISASI (UPDATED) =====
function verifyRealisasi(realisasi) {
    console.log('[VERIFIKASI] Verifying realisasi:', realisasi);
    console.log('[VERIFIKASI] Files in realisasi:', realisasi.files);
    
    // ✅ Ambil data RPD dari local cache (tidak perlu API call lagi)
    let rpdData = null;
    let rpdTotal = 0;
    
    const cachedRPDs = getLocalCache('rpds');
    if (cachedRPDs && Array.isArray(cachedRPDs)) {
        console.log('[VERIFIKASI] Using cached RPDs:', cachedRPDs.length, 'records');
        
        // Cari RPD dengan KUA, bulan, dan tahun yang sama
        rpdData = cachedRPDs.find(rpd => 
            rpd.kua === realisasi.kua &&
            rpd.month === realisasi.month && 
            rpd.year == realisasi.year
        );
        
        if (rpdData) {
            rpdTotal = parseFloat(rpdData.total || 0);
            console.log('[VERIFIKASI] Found matching RPD from cache:', rpdData);
        } else {
            console.log('[VERIFIKASI] No matching RPD found in cache for', realisasi.kua, realisasi.month, realisasi.year);
        }
    } else {
        console.log('[VERIFIKASI] No cached RPDs available');
    }
    
    let modal = document.getElementById('modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    let detailHTML = '';
    Object.entries(realisasi.data).forEach(([code, items]) => {
        const param = APP_CONFIG.BOP.RPD_PARAMETERS[code];
        detailHTML += `<div class="rpd-item">
            <h4>${code} - ${param.name}</h4>`;
        
        Object.entries(items).forEach(([item, realisasiValue]) => {
            // ✅ Cari nilai RPD untuk item yang sama (dari cache)
            let rpdValue = 0;
            let rpdHTML = '';
            
            if (rpdData && rpdData.data && rpdData.data[code] && rpdData.data[code][item]) {
                rpdValue = parseFloat(rpdData.data[code][item]) || 0;
            }
            
            // Hitung selisih
            const diff = rpdValue - realisasiValue;
            const diffColor = diff >= 0 ? '#28a745' : '#dc3545';
            
            rpdHTML = `
                <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <small style="color: #666; font-size: 11px;">Realisasi:</small>
                        <strong style="color: #333;">${formatCurrency(realisasiValue)}</strong>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <small style="color: #666; font-size: 11px;">RPD:</small>
                        <strong style="color: #667eea;">${formatCurrency(rpdValue)}</strong>
                    </div>
                    ${diff !== 0 ? `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <small style="color: #666; font-size: 11px;">Selisih:</small>
                        <strong style="color: ${diffColor}; font-size: 13px;">${formatCurrency(diff)}</strong>
                    </div>
                    ` : ''}
                </div>
            `;
            
            detailHTML += `<div class="rpd-subitem" style="align-items: flex-start;">
                <span>${item}</span>
                ${rpdHTML}
            </div>`;
        });
        
        detailHTML += `</div>`;
    });
    
    // ✅ FIX: Parse files dengan benar
    let files = realisasi.files;
    
    // Jika files adalah string, parse dulu
    if (typeof files === 'string' && files.trim() !== '') {
        try {
            files = JSON.parse(files);
            console.log('[VERIFIKASI] Files parsed from string:', files);
        } catch (e) {
            console.error('[VERIFIKASI] Error parsing files:', e);
            files = [];
        }
    }
    
    // ✅ FIX: Build files HTML dengan validasi yang benar
    let filesHTML = '';
    
    if (Array.isArray(files) && files.length > 0) {
        console.log('[VERIFIKASI] Processing files for display:', files.length);
        
        filesHTML = `
            <div class="rpd-item">
                <h4>Dokumen Pendukung (${files.length} file)</h4>
                ${files.map((file, index) => {
                    console.log(`[VERIFIKASI] File ${index + 1}:`, file);
                    
                    if (!file || !file.fileName) {
                        return `<div class="file-item">
                            <span>⚠️ File tidak valid</span>
                        </div>`;
                    }
                    
                    const isImage = file.mimeType && file.mimeType.startsWith('image/');
                    const isPDF = file.mimeType === 'application/pdf';
                    const previewUrl = getDrivePreviewUrl(file.fileUrl, file.mimeType);
                    const fileId = file.fileId || file.fileUrl.match(/[-\w]{25,}/)?.[0];
                    
                    console.log(`[VERIFIKASI] Preview URL for ${file.fileName}:`, previewUrl);
                    
                    return `
                        <div class="file-item" style="flex-direction: column; align-items: flex-start; padding: 15px; margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 10px;">
                                <span style="font-weight: 500;">📎 ${file.fileName}</span>
                                <span class="file-size">(${formatFileSize(file.size)})</span>
                                <div style="display: flex; gap: 5px;">
                                    <button type="button" class="btn btn-sm" onclick="window.open('${file.fileUrl}', '_blank')">Buka</button>
                                    <button type="button" class="btn btn-sm btn-info" onclick="downloadDriveFile('${file.fileUrl}', '${file.fileName}')">Download</button>
                                </div>
                            </div>
                            ${isImage ? `
                                <div class="image-viewer-container" id="viewer-${index}">
                                    <div class="image-viewer-controls">
                                        <button type="button" class="viewer-btn" onclick="zoomIn('viewer-${index}')" title="Zoom In">
                                            <span style="font-size: 18px;">➕</span>
                                        </button>
                                        <button type="button" class="viewer-btn" onclick="zoomOut('viewer-${index}')" title="Zoom Out">
                                            <span style="font-size: 18px;">➖</span>
                                        </button>
                                        <button type="button" class="viewer-btn" onclick="rotateImage('viewer-${index}')" title="Rotate">
                                            <span style="font-size: 18px;">↻</span>
                                        </button>
                                        <button type="button" class="viewer-btn" onclick="resetImage('viewer-${index}')" title="Reset">
                                            <span style="font-size: 16px;">⟲</span>
                                        </button>
                                        <span class="zoom-level" id="zoom-level-${index}">100%</span>
                                    </div>
                                    <div class="image-viewer-wrapper" id="wrapper-${index}">
                                        <img src="${previewUrl}" 
                                            alt="${file.fileName}" 
                                            class="image-viewer-img"
                                            id="img-${index}"
                                            data-zoom="1"
                                            data-rotation="0"
                                            data-pan-x="0"
                                            data-pan-y="0"
                                            draggable="false"
                                            onerror="this.onerror=null; this.src='https://drive.google.com/uc?export=view&id=${fileId}'; if(this.complete && this.naturalHeight === 0) { this.closest('.image-viewer-container').style.display='none'; this.closest('.image-viewer-container').nextElementSibling.style.display='block'; }">
                                    </div>
                                    <div class="image-viewer-hint">
                                        💡 Gunakan scroll mouse untuk zoom, drag untuk panning
                                    </div>
                                </div>
                                <div style="display: none; margin-top: 10px; padding: 15px; background: #e3f2fd; border-radius: 8px; text-align: center;">
                                    <p style="color: #1976d2; margin: 0 0 10px 0;">🖼️ Gambar sedang dimuat atau tidak dapat ditampilkan</p>
                                    <button type="button" class="btn btn-sm btn-info" onclick="window.open('${file.fileUrl}', '_blank')">Buka di Google Drive</button>
                                </div>
                            ` : isPDF ? `
                                <div class="pdf-viewer-container" id="pdf-viewer-${index}">
                                    <div class="image-viewer-controls">
                                        <button type="button" class="viewer-btn" onclick="zoomInPDF('pdf-viewer-${index}')" title="Zoom In">
                                            <span style="font-size: 18px;">➕</span>
                                        </button>
                                        <button type="button" class="viewer-btn" onclick="zoomOutPDF('pdf-viewer-${index}')" title="Zoom Out">
                                            <span style="font-size: 18px;">➖</span>
                                        </button>
                                        <button type="button" class="viewer-btn" onclick="rotatePDF('pdf-viewer-${index}')" title="Rotate">
                                            <span style="font-size: 18px;">↻</span>
                                        </button>
                                        <button type="button" class="viewer-btn" onclick="resetPDF('pdf-viewer-${index}')" title="Reset">
                                            <span style="font-size: 16px;">⟲</span>
                                        </button>
                                        <span class="zoom-level" id="zoom-level-pdf-${index}">100%</span>
                                    </div>
                                    <div class="pdf-viewer-wrapper" id="pdf-wrapper-${index}">
                                        <div class="pdf-content" 
                                             id="pdf-content-${index}"
                                             data-zoom="1"
                                             data-rotation="0"
                                             data-pan-x="0"
                                             data-pan-y="0"
                                             style="transform-origin: center center; transition: transform 0.2s ease-out; cursor: grab;">
                                            <iframe src="${previewUrl}" 
                                                    id="pdf-iframe-${index}"
                                                    style="width: 100%; height: 600px; border: 1px solid #ddd; border-radius: 8px; pointer-events: auto;"
                                                    onerror="this.style.display='none'; this.closest('.pdf-viewer-container').nextElementSibling.style.display='block';">
                                            </iframe>
                                        </div>
                                    </div>
                                    <div class="image-viewer-hint">
                                        💡 Gunakan scroll mouse untuk zoom, drag untuk panning, klik tombol untuk rotate
                                    </div>
                                </div>
                                <div style="display: none; background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center;">
                                    <p style="color: #666; margin: 0 0 10px 0;">📄 File PDF</p>
                                    <p style="color: #999; font-size: 12px; margin: 0 0 15px 0;">Jika preview tidak muncul, silakan buka di tab baru</p>
                                    <button type="button" class="btn btn-sm" onclick="window.open('${file.fileUrl}', '_blank')">Buka PDF di Tab Baru</button>
                                </div>
                            ` : `
                                <p style="color: #666; font-style: italic; margin-top: 10px;">
                                    📄 Preview tidak tersedia untuk tipe file ini. 
                                    <button type="button" class="btn btn-sm" onclick="window.open('${file.fileUrl}', '_blank')">Buka file</button>
                                </p>
                            `}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } else {
        console.log('[VERIFIKASI] No files to display');
        filesHTML = `
            <div class="rpd-item">
                <h4>Dokumen Pendukung</h4>
                <p style="color: #999; font-style: italic; padding: 15px;">Tidak ada dokumen pendukung</p>
            </div>
        `;
    }
    
    modal.innerHTML = `
       <div class="modal-content" style="max-width: 1400px;">
            <div class="modal-header">
                <h3>Verifikasi Realisasi - ${realisasi.month || 'Unknown'} ${realisasi.year || ''}</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            
            <div class="summary-box">
                <div class="summary-item">
                    <span>Bulan:</span>
                    <strong>${realisasi.month} ${realisasi.year}</strong>
                </div>
                <div class="summary-item">
                    <span>KUA:</span>
                    <strong>${realisasi.kua}</strong>
                </div>
                <div class="summary-item">
                    <span>Status Saat Ini:</span>
                    <strong>${realisasi.status}</strong>
                </div>
            </div>
            
            <!-- Layout Side-by-Side: Pos/Nominal (kiri) dan Preview Dokumen (kanan) -->
            <div class="verify-grid">
                <div class="verify-left">
                    <h3 style="color: #667eea; margin-bottom: 15px; font-size: 18px;">📊 Data Pos & Nominal</h3>
                    ${detailHTML}
                    
                    <div class="summary-box" style="margin-top: 20px;">
                        <div class="summary-item">
                            <span>Total RPD:</span>
                            <strong>${rpdData ? formatCurrency(rpdTotal) : '<span style="color: #999;">Data RPD tidak tersedia</span>'}</strong>
                        </div>
                        <div class="summary-item">
                            <span>Total Realisasi:</span>
                            <strong>${formatCurrency(realisasi.total)}</strong>
                        </div>
                        ${rpdData ? `
                        <div class="summary-item" style="border-top: 2px solid #dee2e6; padding-top: 10px; margin-top: 10px;">
                            <span>Selisih (RPD - Realisasi):</span>
                            <strong style="color: ${rpdTotal >= realisasi.total ? '#28a745' : '#dc3545'}">
                                ${formatCurrency(rpdTotal - realisasi.total)}
                            </strong>
                        </div>
                        ` : ''}
                    </div>
                    
                    <!-- Dual Totals Placeholder -->
                    <div id="verifikasiDualTotalsContainer"></div>
                </div>
                
                <div class="verify-right">
                    <h3 style="color: #667eea; margin-bottom: 15px; font-size: 18px;">📁 Preview Dokumen</h3>
                    ${filesHTML}
                </div>
            </div>
            
            <form id="verifyForm" style="margin-top: 30px;">
                <div class="form-group">
                    <label>Status Verifikasi</label>
                    <select id="verifyStatus" required>
                        <option value="Menunggu" ${realisasi.status === 'Menunggu' ? 'selected' : ''}>Menunggu</option>
                        <option value="Diterima" ${realisasi.status === 'Diterima' ? 'selected' : ''}>Diterima</option>
                        <option value="Ditolak" ${realisasi.status === 'Ditolak' ? 'selected' : ''}>Ditolak</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Catatan</label>
                    <textarea id="verifyNotes" class="verify-notes" rows="4" placeholder="Tambahkan catatan jika diperlukan">${realisasi.notes || ''}</textarea>
                </div>
                <button type="submit" class="btn">💾 Simpan Verifikasi</button>
            </form>
        </div>
    `;
    
    modal.classList.add('active');
    
    // Initialize image and PDF viewers
    setTimeout(() => {
        initAllImageViewers();
        initAllPDFViewers();
    }, 100);
    
    // Calculate and display dual totals (async)
    getAutopayTotal(realisasi.year, realisasi.month, realisasi.kua).then(autopayTotal => {
        const totalRealisasi = realisasi.total || 0;
        const totalPencairan = totalRealisasi - autopayTotal;
        
        const totalsHTML = `
            <div style="margin-top: 20px; padding: 15px; background: linear-gradient(to bottom, #f9f9f9, #ffffff); border-radius: 8px; border: 1px solid #e0e0e0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <h4 style="margin: 0 0 15px 0; color: #333; font-size: 14px; border-bottom: 2px solid #1976D2; padding-bottom: 8px;">
                    <i class="fas fa-calculator"></i> Ringkasan Total Verifikasi
                </h4>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 10px; background: #E3F2FD; border-radius: 4px;">
                    <strong style="color: #1565C0;">Total Realisasi:</strong>
                    <strong style="color: #1976D2; font-size: 18px;">${formatCurrency(totalRealisasi)}</strong>
                </div>
                
                ${autopayTotal > 0 ? `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 10px; background: #FFF3E0; border-radius: 4px;">
                        <span style="color: #E65100;">
                            <i class="fas fa-robot"></i> Dibayar via Autopay:
                        </span>
                        <span style="color: #F57C00; font-size: 16px;">- ${formatCurrency(autopayTotal)}</span>
                    </div>
                    
                    <div style="height: 1px; background: linear-gradient(to right, transparent, #ccc, transparent); margin: 15px 0;"></div>
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #E8F5E9; border-radius: 4px; border: 2px solid #4CAF50;">
                        <strong style="color: #2E7D32; font-size: 16px;">
                            <i class="fas fa-money-bill-wave"></i> Total Pencairan KUA:
                        </strong>
                        <strong style="color: #2E7D32; font-size: 20px;">${formatCurrency(totalPencairan)}</strong>
                    </div>
                    
                    <div style="margin-top: 12px; padding: 10px; background: #FFFDE7; border-left: 4px solid #FBC02D; border-radius: 4px;">
                        <small style="color: #F57C00; font-size: 11px; display: block; line-height: 1.5;">
                            <i class="fas fa-info-circle"></i> 
                            <strong>Total Pencairan</strong> adalah jumlah yang sebenarnya dicairkan ke KUA setelah dikurangi pembayaran autopay yang dilakukan melalui SAKTI.
                        </small>
                    </div>
                ` : `
                    <div style="margin-top: 10px; padding: 10px; background: #E8F5E9; border-left: 4px solid #4CAF50; border-radius: 4px;">
                        <small style="color: #2E7D32; font-size: 12px;">
                            <i class="fas fa-check-circle"></i> 
                            Tidak ada pembayaran autopay untuk periode ini. Total Pencairan sama dengan Total Realisasi.
                        </small>
                    </div>
                `}
            </div>
        `;
        
        // Insert into modal
        const container = document.getElementById('verifikasiDualTotalsContainer');
        if (container) {
            container.innerHTML = totalsHTML;
        }
    }).catch(error => {
        console.error('[VERIFIKASI_MODAL_TOTALS] Error:', error);
    });
    
    document.getElementById('verifyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('[VERIFIKASI] Submitting verification');
        
        try {
            await apiCall('updateRealisasiStatus', {
                id: realisasi.id,
                status: document.getElementById('verifyStatus').value,
                notes: document.getElementById('verifyNotes').value,
                verifiedBy: currentUser.name,
                adminId: currentUser.id,
                adminUsername: currentUser.username
            });
            
            // Invalidate cache yang terkait
            clearLocalCache('verifikasi');
            clearLocalCache('realisasis');
            clearLocalCache('dashboardStats');
            
            closeModal();
            
            // Reload dengan force refresh
            await loadVerifikasi(true);
            await loadDashboardStats(true);
            
            showNotification('Status realisasi berhasil diperbarui', 'success');
            
        } catch (error) {
            console.error('[VERIFY_REALISASI ERROR]', error);
            showNotification(error.message, 'error');
        }
    });
}

// ===== EXPORT FUNCTIONS =====
async function exportData(type) {
    console.log(`[EXPORT] Exporting ${type} data`);
    
    let yearFilter, year, kua;
    
    switch(type) {
        case 'budget':
            yearFilter = document.getElementById('budgetYearFilter');
            year = yearFilter ? yearFilter.value : new Date().getFullYear();
            kua = currentUser.role === 'Admin' ? null : currentUser.kua;
            break;
        case 'rpd':
            yearFilter = document.getElementById('rpdYearFilter');
            year = yearFilter ? yearFilter.value : new Date().getFullYear();
            kua = currentUser.role === 'Admin' ? null : currentUser.kua;
            break;
        case 'realisasi':
            yearFilter = document.getElementById('realisasiYearFilter');
            year = yearFilter ? yearFilter.value : new Date().getFullYear();
            kua = currentUser.role === 'Admin' ? null : currentUser.kua;
            break;
    }
    
    try {
        const actionName = type === 'budget' ? 'exportBudget' : 
                        type === 'rpd' ? 'exportRPD' : 
                        'exportRealisasi';
        
        const result = await apiCall(actionName, {
            year: year,
            kua: kua
        });
        
        // Download langsung ke local
        const exportUrl = `https://docs.google.com/spreadsheets/d/${result.fileId}/export?format=xlsx`;
        await downloadFile(exportUrl, result.fileName + '.xlsx');
        
        showNotification(`Export ${type} berhasil! File sedang didownload`, 'success');
    } catch (error) {
        showNotification(`Gagal export ${type}: ${error.message}`, 'error');
    }
}

// ===== DOWNLOAD & EXPORT FUNCTIONS =====
// Download Realisasi Bulanan (untuk Operator)
async function downloadRealisasiBulanan(realisasi, format) {
    console.log(`[DOWNLOAD] Downloading realisasi ${realisasi.id} as ${format}`);
    
    try {
        const result = await apiCall('downloadRealisasiBulanan', {
            id: realisasi.id,
            format: format,
            userId: currentUser.id,
            username: currentUser.username
        });
        
        // Download file dari base64
        downloadBase64File(result.fileData, result.fileName, result.mimeType);
        showNotification(`${format.toUpperCase()} berhasil didownload`, 'success');
    } catch (error) {
        showNotification(`Gagal download: ${error.message}`, 'error');
    }
}

// Export Enhanced untuk Admin
async function exportDataEnhanced(type, format) {
    console.log(`[EXPORT] Exporting ${type} as ${format}`);
    
    let yearFilter, year, kuaFilter, kua;
    
    switch(type) {
        case 'budget':
            yearFilter = document.getElementById('budgetYearFilter');
            kuaFilter = document.getElementById('budgetKUAFilterExport');
            year = yearFilter ? yearFilter.value : new Date().getFullYear();
            kua = kuaFilter ? kuaFilter.value : null;
            break;
        case 'rpd':
            yearFilter = document.getElementById('rpdYearFilter');
            kuaFilter = document.getElementById('rpdKUAFilterExport');
            year = yearFilter ? yearFilter.value : new Date().getFullYear();
            kua = kuaFilter ? kuaFilter.value : null;
            break;
        case 'realisasi':
            yearFilter = document.getElementById('realisasiYearFilter');
            kuaFilter = document.getElementById('realisasiKUAFilterExport');
            year = yearFilter ? yearFilter.value : new Date().getFullYear();
            kua = kuaFilter ? kuaFilter.value : null;
            break;
    }
    
    try {
        const actionName = type === 'budget' ? 'exportBudgetEnhanced' : 
                        type === 'rpd' ? 'exportRPDEnhanced' : 
                        'exportRealisasiEnhanced';
        
        const result = await apiCall(actionName, {
            year: year,
            kua: kua,
            format: format
        });
        
        // Download file dari base64
        downloadBase64File(result.fileData, result.fileName, result.mimeType);
        showNotification(`Export ${type} berhasil!`, 'success');
    } catch (error) {
        showNotification(`Gagal export: ${error.message}`, 'error');
    }
}

// Helper function untuk download file dari base64
function downloadBase64File(base64Data, fileName, mimeType) {
    console.log(`[DOWNLOAD] Downloading ${fileName}`);
    
    try {
        // Decode base64 to binary
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        
        // Create blob
        const blob = new Blob([byteArray], { type: mimeType });
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log(`[DOWNLOAD] Success: ${fileName}`);
    } catch (error) {
        console.error('[DOWNLOAD ERROR]', error);
        showNotification('Gagal download file', 'error');
    }
}

// Show Export Modal (untuk Admin)
function showExportModal(type) {
    console.log(`[EXPORT MODAL] Type: ${type}`);
    
    let modal = document.getElementById('modal');

    
    if (!modal) {

    
        modal = document.createElement('div');

    
        modal.id = 'modal';

    
        modal.className = 'modal';

    
        document.body.appendChild(modal);

    
    }
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
        years.push(i);
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Export ${type.toUpperCase()}</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            
            <form id="exportForm">
                <div class="form-group">
                    <label>Tahun</label>
                    <select id="${type}YearFilterExport" required>
                        ${years.map(year => `
                            <option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>KUA (Opsional - Kosongkan untuk semua KUA)</label>
                    <select id="${type}KUAFilterExport">
                        <option value="">Semua KUA</option>
                        ${APP_CONFIG.KUA_LIST.map(kua => `
                            <option value="${kua}">${kua}</option>
                        `).join('')}
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Format</label>
                    <select id="exportFormat" required>
                        <option value="excel">Excel (.xlsx)</option>
                        <option value="pdf">PDF (.pdf)</option>
                    </select>
                </div>
                
                <button type="submit" class="btn">Download</button>
            </form>
        </div>
    `;
    
    modal.classList.add('active');
    
    document.getElementById('exportForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const format = document.getElementById('exportFormat').value;
        closeModal();
        await exportDataEnhanced(type, format);
    });
}

// ===== MODAL HELPERS =====

function sortByMonth(data) {
    return data.sort((a, b) => {
        const monthIndexA = APP_CONFIG.MONTHS.indexOf(a.month);
        const monthIndexB = APP_CONFIG.MONTHS.indexOf(b.month);
        return monthIndexA - monthIndexB;
    });
}

function getDrivePreviewUrl(fileUrl, mimeType) {
    console.log('[PREVIEW] Getting preview URL for:', fileUrl, mimeType);
    
    if (!fileUrl) {
        console.warn('[PREVIEW] No file URL provided');
        return '';
    }
    
    // Extract file ID from Google Drive URL
    let fileId = '';
    
    // Pattern 1: https://drive.google.com/file/d/FILE_ID/view
    const pattern1 = /\/file\/d\/([^/]+)/;
    const match1 = fileUrl.match(pattern1);
    
    if (match1) {
        fileId = match1[1];
    } else {
        // Pattern 2: https://drive.google.com/open?id=FILE_ID
        const pattern2 = /[?&]id=([^&]+)/;
        const match2 = fileUrl.match(pattern2);
        
        if (match2) {
            fileId = match2[1];
        } else {
            // Pattern 3: Already just the file ID
            if (fileUrl.length > 20 && !fileUrl.includes('/')) {
                fileId = fileUrl;
            }
        }
    }
    
    console.log('[PREVIEW] Extracted file ID:', fileId);
    
    if (!fileId) {
        console.warn('[PREVIEW] Could not extract file ID');
        return fileUrl;
    }
    
    // ✅ FIX: Untuk image, gunakan direct image URL (tidak perlu iframe)
    if (mimeType && mimeType.startsWith('image/')) {
        // Direct image URL yang tidak kena CSP
        const imageUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
        console.log('[PREVIEW] Image URL:', imageUrl);
        return imageUrl;
    }
    
    // ✅ FIX: Untuk PDF, gunakan embedded viewer (might have CSP issues)
    if (mimeType === 'application/pdf') {
        const pdfUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        console.log('[PREVIEW] PDF URL:', pdfUrl);
        return pdfUrl;
    }
    
    // Default: direct download link
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    console.log('[PREVIEW] Download URL:', downloadUrl);
    return downloadUrl;
}

function downloadDriveFile(url, filename) {
    // Extract file ID from URL
    const fileIdMatch = url.match(/[-\w]{25,}/);
    if (!fileIdMatch) {
        window.open(url, '_blank');
        return;
    }
    
    const fileId = fileIdMatch[0];
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.target = '_blank';
    link.click();
}

// ✅ FIX ISSUE #1 & #3: Custom confirmation modal
let modalHasChanges = false;

// ✅ Create custom confirmation dialog
function showConfirmDialog(message, onConfirm, onCancel) {
    // Remove existing confirm dialog if any
    const existingDialog = document.getElementById('customConfirmDialog');
    if (existingDialog) {
        existingDialog.remove();
    }
    
    // Create dialog
    const dialog = document.createElement('div');
    dialog.id = 'customConfirmDialog';
    dialog.className = 'custom-confirm-overlay';
    dialog.innerHTML = `
        <div class="custom-confirm-dialog">
            <div class="custom-confirm-icon">⚠️</div>
            <div class="custom-confirm-message">${message}</div>
            <div class="custom-confirm-buttons">
                <button class="custom-confirm-btn custom-confirm-cancel" id="confirmCancelBtn">Batal</button>
                <button class="custom-confirm-btn custom-confirm-yes" id="confirmYesBtn">Ya, Tutup</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Add event listeners
    document.getElementById('confirmYesBtn').addEventListener('click', function() {
        dialog.remove();
        if (onConfirm) onConfirm();
    });
    
    document.getElementById('confirmCancelBtn').addEventListener('click', function() {
        dialog.remove();
        if (onCancel) onCancel();
    });
    
    // Close on overlay click
    dialog.addEventListener('click', function(e) {
        if (e.target === dialog) {
            dialog.remove();
            if (onCancel) onCancel();
        }
    });
    
    // Focus on Yes button
    setTimeout(() => {
        document.getElementById('confirmYesBtn').focus();
    }, 100);
}

function closeModal(skipConfirmation = false) {
    const modal = document.getElementById('modal');
    if (!modal) return;
    
    // ✅ Check if modal has form
    const hasForm = modal.querySelector('form');
    
    // ✅ If has form and not skipping, ask for confirmation
    if (hasForm && !skipConfirmation && modalHasChanges) {
        showConfirmDialog(
            'Anda memiliki perubahan yang belum disimpan. Yakin ingin menutup?',
            function() {
                // User confirmed
                modal.classList.remove('active');
                modal.innerHTML = '';
                modalHasChanges = false;
                
                // ✅ Restart polling jika masih di halaman realisasi
                if (currentPage === 'realisasiPage') {
                    startRealisasiPolling();
                }
            },
            function() {
                // User cancelled - do nothing
            }
        );
        return;
    }
    
    // Close modal without confirmation
    modal.classList.remove('active');
    modal.innerHTML = '';
    modalHasChanges = false;
    
    // ✅ Restart polling jika masih di halaman realisasi
    if (currentPage === 'realisasiPage') {
        startRealisasiPolling();
    }
}

function closeRealisasiModal(skipConfirmation = false) {
    const modal = document.getElementById('realisasiModal');
    if (!modal) return;
    
    // ✅ Check if modal has form
    const hasForm = modal.querySelector('form');
    
    // ✅ If has form and not skipping, ask for confirmation
    if (hasForm && !skipConfirmation && modalHasChanges) {
        showConfirmDialog(
            'Anda memiliki perubahan yang belum disimpan. Yakin ingin menutup?',
            function() {
                // User confirmed
                modal.classList.remove('active');
                modal.remove();
                modalHasChanges = false;
                uploadedFiles = [];
                
                // Restart polling jika masih di halaman realisasi
                if (currentPage === 'realisasiPage') {
                    startRealisasiPolling();
                }
            },
            function() {
                // User cancelled - do nothing
            }
        );
        return;
    }
    
    // Close modal without confirmation
    modal.classList.remove('active');
    modal.remove();
    modalHasChanges = false;
    uploadedFiles = [];
    
    // Restart polling jika masih di halaman realisasi
    if (currentPage === 'realisasiPage') {
        startRealisasiPolling();
    }
}

// Click outside modal to close
window.addEventListener('load', function() {
    let modal = document.getElementById('modal');

    if (!modal) {

        modal = document.createElement('div');

        modal.id = 'modal';

        modal.className = 'modal';

        document.body.appendChild(modal);

    }
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }
});

// ===== INITIALIZATION =====
// window.addEventListener('DOMContentLoaded', function() {
//     console.log('[INIT] Application initializing...');
    
//     // Check if user is already logged in
//     const storedUser = sessionStorage.getItem('user');
//     if (storedUser) {
//         console.log('[INIT] Found stored user session');
//         currentUser = JSON.parse(storedUser);
//         showDashboard();
//     } else {
//         console.log('[INIT] No stored session, showing login page');
//     }
// });

// Prevent form submission on Enter key in number inputs
document.addEventListener('keypress', function(e) {
    if (e.target && e.target.type === 'number' && e.key === 'Enter') {
        e.preventDefault();
    }
});

console.log('[APP] Application loaded successfully');

function initializeReportsPage() {
    console.log('[REPORTS] Initializing reports page');
    
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
        years.push(i);
    }
    
    const yearOptions = years.map(year => 
        `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}</option>`
    ).join('');
    
    const kuaOptions = APP_CONFIG.KUA_LIST.map(kua => 
        `<option value="${kua}">${kua}</option>`
    ).join('');
    
    // Populate all year selects
    ['rpdYearOnly', 'rpdDetailYear', 'realisasiYearOnly', 'realisasiDetailYearOnly'].forEach(id => {
        const select = document.getElementById(id);
        if (select) select.innerHTML = yearOptions;
    });
    
    // Populate KUA selects
    ['rpdYearKUA', 'realisasiYearKUA'].forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.innerHTML = '<option value="">Semua KUA</option>' + kuaOptions;
        }
    });
    
    console.log('[REPORTS] Reports page initialized');
}

async function downloadRPDDetailYear(format) {
    console.log(`[REPORTS] Downloading RPD Detail Year as ${format}`);
    
    const year = document.getElementById('rpdDetailYear').value;
    
    if (!year) {
        showNotification('Pilih tahun terlebih dahulu', 'warning');
        return;
    }
    
    try {
        const result = await apiCall('exportRPDDetailYear', {
            year: year,
            format: format
        });
        
        downloadBase64File(result.fileData, result.fileName, result.mimeType);
        showNotification(`Laporan RPD Detail berhasil didownload`, 'success');
    } catch (error) {
        showNotification(`Gagal download: ${error.message}`, 'error');
    }
}

// Realisasi Per Bulan (menggabungkan All dan Selected)
async function downloadRealisasiPerMonth(format) {
    console.log(`[REPORTS] Downloading Realisasi Per Month as ${format}`);
    
    const kua = document.getElementById('realisasiMonthKUA').value;
    const year = document.getElementById('realisasiMonthYear').value;
    const month = document.getElementById('realisasiMonth').value;
    
    if (!year || !month) {
        showNotification('Pilih tahun dan bulan terlebih dahulu', 'warning');
        return;
    }
    
    try {
        let result;
        
        if (kua) {
            // KUA Tertentu
            result = await apiCall('exportRealisasiSelectedPerMonth', {
                kua: kua,
                year: year,
                month: month,
                format: format
            });
        } else {
            // Semua KUA
            result = await apiCall('exportRealisasiAllPerMonth', {
                year: year,
                month: month,
                format: format
            });
        }
        
        downloadBase64File(result.fileData, result.fileName, result.mimeType);
        showNotification(`Laporan Realisasi berhasil didownload`, 'success');
    } catch (error) {
        showNotification(`Gagal download: ${error.message}`, 'error');
    }
}

async function downloadRealisasiDetailMonth(format) {
    console.log(`[REPORTS] Downloading Realisasi Detail Month as ${format}`);
    
    const year = document.getElementById('realisasiDetailYear').value;
    const month = document.getElementById('realisasiDetailMonth').value;
    
    if (!year || !month) {
        showNotification('Pilih tahun dan bulan terlebih dahulu', 'warning');
        return;
    }
    
    try {
        const result = await apiCall('exportRealisasiAllDetailPerMonth', {
            year: year,
            month: month,
            format: format
        });
        
        downloadBase64File(result.fileData, result.fileName, result.mimeType);
        showNotification(`Laporan Realisasi Detail berhasil didownload`, 'success');
    } catch (error) {
        showNotification(`Gagal download: ${error.message}`, 'error');
    }
}

async function downloadRPDPerMonth(format) {
    console.log(`[REPORTS] Downloading RPD Per Month as ${format}`);
    
    const kua = document.getElementById('rpdMonthKUA').value;
    const year = document.getElementById('rpdMonthYear').value;
    const month = document.getElementById('rpdMonth').value;
    
    if (!year || !month) {
        showNotification('Pilih tahun dan bulan terlebih dahulu', 'warning');
        return;
    }
    
    try {
        let result;
        
        if (kua) {
            // KUA Tertentu
            result = await apiCall('exportRPDSelectedPerMonth', {
                kua: kua,
                year: year,
                month: month,
                format: format
            });
        } else {
            // Semua KUA
            result = await apiCall('exportRPDAllPerMonth', {
                year: year,
                month: month,
                format: format
            });
        }
        
        downloadBase64File(result.fileData, result.fileName, result.mimeType);
        showNotification(`Laporan RPD berhasil didownload`, 'success');
    } catch (error) {
        showNotification(`Gagal download: ${error.message}`, 'error');
    }
}

async function downloadRPDPerYear(format) {
    console.log(`[REPORTS] Downloading RPD Per Year as ${format}`);
    
    const kua = document.getElementById('rpdYearKUA').value;
    const year = document.getElementById('rpdYearOnly').value;
    
    if (!year) {
        showNotification('Pilih tahun terlebih dahulu', 'warning');
        return;
    }
    
    try {
        const result = await apiCall('exportRPDPerYear', {
            kua: kua || null,
            year: year,
            format: format
        });
        
        downloadBase64File(result.fileData, result.fileName, result.mimeType);
        showNotification(`Laporan RPD berhasil didownload`, 'success');
    } catch (error) {
        showNotification(`Gagal download: ${error.message}`, 'error');
    }
}

// Realisasi Per Year (NEW)
async function downloadRealisasiPerYear(format) {
    console.log(`[REPORTS] Downloading Realisasi Per Year as ${format}`);
    
    const kua = document.getElementById('realisasiYearKUA').value;
    const year = document.getElementById('realisasiYearOnly').value;
    
    if (!year) {
        showNotification('Pilih tahun terlebih dahulu', 'warning');
        return;
    }
    
    try {
        const result = await apiCall('exportRealisasiPerYear', {
            kua: kua || null,
            year: year,
            format: format
        });
        
        downloadBase64File(result.fileData, result.fileName, result.mimeType);
        showNotification(`Laporan Realisasi berhasil didownload`, 'success');
    } catch (error) {
        showNotification(`Gagal download: ${error.message}`, 'error');
    }
}

// Realisasi Detail Year (NEW)
async function downloadRealisasiDetailYear(format) {
    console.log(`[REPORTS] Downloading Realisasi Detail Year as ${format}`);
    
    const year = document.getElementById('realisasiDetailYearOnly').value;
    
    if (!year) {
        showNotification('Pilih tahun terlebih dahulu', 'warning');
        return;
    }
    
    try {
        const result = await apiCall('exportRealisasiDetailYear', {
            year: year,
            format: format
        });
        
        downloadBase64File(result.fileData, result.fileName, result.mimeType);
        showNotification(`Laporan Realisasi Detail berhasil didownload`, 'success');
    } catch (error) {
        showNotification(`Gagal download: ${error.message}`, 'error');
    }
}

// ===== AUTO-REFRESH FOR ADMIN VERIFIKASI =====
let verifikasiAutoRefresh = null;

function startVerifikasiAutoRefresh() {
    // Auto refresh setiap 2 menit untuk halaman verifikasi admin
    verifikasiAutoRefresh = setInterval(async () => {
        console.log('[AUTO-REFRESH] Refreshing verifikasi data...');
        
        // Cek apakah ada realisasi "Menunggu" yang baru
        const cachedData = getCache('verifikasi');
        
        if (cachedData) {
            // Get fresh data
            const yearFilter = document.getElementById('verifikasiYearFilter');
            const year = yearFilter ? yearFilter.value : new Date().getFullYear();
            
            try {
                const freshData = await apiCall('getRealisasis', { year: year });
                
                // Count pending verifications
                const oldPending = cachedData.realisasis.filter(r => r.status === 'Menunggu').length;
                const newPending = freshData.filter(r => r.status === 'Menunggu').length;
                
                // Jika ada yang baru, tampilkan notifikasi
                if (newPending > oldPending) {
                    const diff = newPending - oldPending;
                    showNotification(`Ada ${diff} realisasi baru yang menunggu verifikasi! 🔔`, 'info');
                }
                
                // Update cache
                setCache('verifikasi', {
                    realisasis: freshData,
                    filters: cachedData.filters
                });
                
                // Re-display dengan filter yang sama
                displayVerifikasi(freshData, cachedData.filters);
                
            } catch (error) {
                console.error('[AUTO-REFRESH ERROR]', error);
            }
        }
    }, 2 * 60 * 1000); // 2 menit
}

function stopVerifikasiAutoRefresh() {
    if (verifikasiAutoRefresh) {
        clearInterval(verifikasiAutoRefresh);
        verifikasiAutoRefresh = null;
    }
}
// ===== EXPORT FUNCTIONS =====

// 1. Download RPD per Tahun
async function downloadRPDPerYear(format) {
    const kua = document.getElementById('exportRPDPerYearKua').value;
    const year = document.getElementById('exportRPDPerYearYear').value;
    
    try {
        showLoading();
        const result = await apiCall('exportRPDPerYear', {
            kua: kua,
            year: parseInt(year),
            format: format
        });
        
        // Use downloadFile from config.js which handles base64
        window.window.downloadFile(result.fileData, result.fileName, result.mimeType);
        showNotification('File berhasil diunduh', 'success');
    } catch (error) {
        showNotification('Gagal mengunduh file: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 2. Download RPD Detail Year
async function downloadRPDDetailYear(format) {
    const year = document.getElementById('exportRPDDetailYear').value;
    
    try {
        showLoading();
        const result = await apiCall('exportRPDDetailYear', {
            year: parseInt(year),
            format: format
        });
        
        window.downloadFile(result.fileData, result.fileName, result.mimeType);
        showNotification('File berhasil diunduh', 'success');
    } catch (error) {
        showNotification('Gagal mengunduh file: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 3. Download Realisasi per Tahun
async function downloadRealisasiPerYear(format) {
    const kua = document.getElementById('exportRealisasiPerYearKua').value;
    const year = document.getElementById('exportRealisasiPerYearYear').value;
    
    try {
        showLoading();
        const result = await apiCall('exportRealisasiPerYear', {
            kua: kua,
            year: parseInt(year),
            format: format
        });
        
        window.downloadFile(result.fileData, result.fileName, result.mimeType);
        showNotification('File berhasil diunduh', 'success');
    } catch (error) {
        showNotification('Gagal mengunduh file: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// 4. Download Realisasi Detail Year
async function downloadRealisasiDetailYear(format) {
    const year = document.getElementById('exportRealisasiDetailYear').value;
    
    try {
        showLoading();
        const result = await apiCall('exportRealisasiDetailYear', {
            year: parseInt(year),
            format: format
        });
        
        window.downloadFile(result.fileData, result.fileName, result.mimeType);
        showNotification('File berhasil diunduh', 'success');
    } catch (error) {
        showNotification('Gagal mengunduh file: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function formatNumber(num) {
    if (!num && num !== 0) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatNumberInput(input) {
    // Get raw value (tanpa separator)
    let value = input.value.replace(/\./g, '');
    
    // Parse as number
    let numValue = parseInt(value) || 0;
    
    // Format dengan separator ribuan
    let formatted = numValue.toLocaleString('id-ID');
    
    // Set ke input
    input.value = formatted;
    
    // Store raw value di data attribute
    input.dataset.rawValue = numValue;
}

function getRawNumberValue(input) {
    if (input.dataset.rawValue) {
        return parseInt(input.dataset.rawValue) || 0;
    }
    return parseInt(input.value.replace(/\./g, '')) || 0;
}

function setupNumberInputFormatting() {
    // Setup untuk semua input type="number" yang ada class untuk formatting
    document.querySelectorAll('input[type="number"].format-currency').forEach(input => {
        // Format on blur (when user leaves input)
        input.addEventListener('blur', function() {
            formatNumberInput(this);
        });
        
        // Remove formatting on focus (agar mudah edit)
        input.addEventListener('focus', function() {
            let raw = this.dataset.rawValue || this.value.replace(/\./g, '');
            this.value = raw;
        });
        
        // Prevent non-numeric input
        input.addEventListener('keypress', function(e) {
            if (e.key && !/[0-9]/.test(e.key)) {
                e.preventDefault();
            }
        });
    });
}

function formatWithSeparator(value) {
    console.log('[FORMAT] Input value:', value);
    
    // Remove all non-numeric characters
    const cleaned = value.replace(/\D/g, '');
    console.log('[FORMAT] Cleaned value:', cleaned);
    
    if (!cleaned) {
        console.log('[FORMAT] Empty value, returning 0');
        return '0';
    }
    
    // Convert to number and format with thousand separator
    const number = parseInt(cleaned);
    const formatted = number.toLocaleString('id-ID');
    
    console.log('[FORMAT] Formatted value:', formatted);
    return formatted;
}

function parseFormattedNumber(formattedValue) {
    const cleaned = formattedValue.replace(/\D/g, '');
    const number = parseInt(cleaned) || 0;
    console.log('[PARSE] Input:', formattedValue, '→ Output:', number);
    return number;
}

function setupAutoFormatInput(input) {
    console.log('[SETUP_FORMAT] Setting up auto-format for input:', input.id);
    
    // Store original value
    let lastValue = input.value || '0';
    
    // Format on input (real-time)
    input.addEventListener('input', function(e) {
        console.log('[INPUT_EVENT] Input changed, raw value:', this.value);
        
        // Get cursor position before formatting
        const cursorPosition = this.selectionStart;
        const oldLength = this.value.length;
        
        // Format the value
        const formatted = formatWithSeparator(this.value);
        
        // Set formatted value
        this.value = formatted;
        
        // Calculate new cursor position
        const newLength = formatted.length;
        const lengthDiff = newLength - oldLength;
        let newCursorPosition = cursorPosition + lengthDiff;
        
        // Adjust cursor position if we added/removed separators
        if (lengthDiff > 0) {
            // Separator added, move cursor after separator
            newCursorPosition = cursorPosition + lengthDiff;
        }
        
        // Set cursor position
        this.setSelectionRange(newCursorPosition, newCursorPosition);
        
        console.log('[INPUT_EVENT] Formatted value:', formatted);
        console.log('[INPUT_EVENT] Cursor position:', cursorPosition, '→', newCursorPosition);
        
        lastValue = formatted;
    });
    
    // Prevent non-numeric input
    input.addEventListener('keypress', function(e) {
        const char = String.fromCharCode(e.which);
        if (!/[0-9]/.test(char)) {
            console.log('[KEYPRESS] Blocking non-numeric char:', char);
            e.preventDefault();
        }
    });
    
    // Format on blur (cleanup)
    input.addEventListener('blur', function() {
        console.log('[BLUR] Cleaning up value:', this.value);
        this.value = formatWithSeparator(this.value);
    });
    
    // Format initial value
    if (input.value) {
        input.value = formatWithSeparator(input.value);
        console.log('[SETUP_FORMAT] Initial value formatted:', input.value);
    }
}

function setupAllAutoFormatInputs(selector = '.auto-format-number') {
    console.log('[SETUP_ALL_FORMAT] Setting up auto-format for selector:', selector);
    
    const inputs = document.querySelectorAll(selector);
    console.log('[SETUP_ALL_FORMAT] Found', inputs.length, 'inputs');
    
    inputs.forEach((input, index) => {
        console.log('[SETUP_ALL_FORMAT] Processing input', index + 1, ':', input.id || input.name);
        setupAutoFormatInput(input);
    });
}

async function saveConfig() {
    console.log('[SAVE_CONFIG] Saving configuration...');
    
    try {
        const rpdStatusEl = document.getElementById('rpdStatus');
        const realisasiStatusEl = document.getElementById('realisasiStatus');
        const maxFileSizeEl = document.getElementById('realisasiMaxFileSize');
        const maxFilesEl = document.getElementById('realisasiMaxFiles');

        // Check dulu
        if (!rpdStatusEl || !realisasiStatusEl) {
            console.error('[SAVE_CONFIG] Elements not found!');
            showNotification('Form konfigurasi tidak ditemukan', 'error');
            return;
        }

        const configData = {
            RPD_STATUS: rpdStatusEl.value,
            REALISASI_STATUS: realisasiStatusEl.value,
            REALISASI_MAX_FILE_SIZE: parseInt(maxFileSizeEl.value) || 5,
            REALISASI_MAX_FILES: parseInt(maxFilesEl.value) || 10
        };

        console.log('[SAVE_CONFIG] Config data to save:', configData);

        // Call API to save
        await apiCall('updateRPDConfig', configData);

        // ✅ FIX: Set cache dengan data yang baru di-save
        // Ini memastikan saat user pindah halaman dan kembali, config masih tetap
        console.log('[SAVE_CONFIG] Setting cache with new config data');
        setCache('config', configData);

        console.log('[SAVE_CONFIG] Configuration saved successfully');
        showNotification('Konfigurasi berhasil disimpan', 'success');
        
    } catch (error) {
        console.error('[SAVE_CONFIG ERROR]', error);
        showNotification('Gagal menyimpan konfigurasi: ' + error.message, 'error');
    }
}

async function checkRealisasiStatus() {
    console.log('[CONFIG_CHECK] Checking realisasi status');
    
    // ✅ Try cache first
    const cachedConfig = getLocalCache('config');
    if (cachedConfig) {
        console.log('[CONFIG_CHECK] Using cached config');
        const status = cachedConfig.REALISASI_STATUS || 'open';
        console.log('[CONFIG_CHECK] Realisasi status:', status);
        return status;
    }
    
    // ✅ Fetch if no cache
    try {
        const configData = await apiCall('getRPDConfig');
        console.log('[CONFIG_CHECK] Config fetched from server:', configData);
        
        // Update cache
        updateLocalCache('config', configData);
        
        const status = configData.REALISASI_STATUS || 'open';
        console.log('[CONFIG_CHECK] Realisasi status:', status);
        
        return status;
    } catch (error) {
        console.error('[CONFIG_CHECK ERROR]', error);
        return 'open'; // Default to open on error
    }
}

async function loadUploadConfig() {
    console.log('[UPLOAD_CONFIG] Loading upload configuration');
    
    // ✅ Try cache first
    const cachedConfig = getLocalCache('config');
    if (cachedConfig) {
        console.log('[UPLOAD_CONFIG] Using cached config');
        uploadConfig.maxFiles = parseInt(cachedConfig.REALISASI_MAX_FILES) || 10;
        uploadConfig.maxFileSize = parseInt(cachedConfig.REALISASI_MAX_FILE_SIZE) || 10;
        console.log('[UPLOAD_CONFIG] Configuration loaded from cache:', uploadConfig);
        return uploadConfig;
    }
    
    // ✅ Fetch if no cache
    try {
        const configData = await apiCall('getRPDConfig');
        
        // Update cache
        updateLocalCache('config', configData);
        
        uploadConfig.maxFiles = parseInt(configData.REALISASI_MAX_FILES) || 10;
        uploadConfig.maxFileSize = parseInt(configData.REALISASI_MAX_FILE_SIZE) || 10;
        
        console.log('[UPLOAD_CONFIG] Configuration loaded from server:', uploadConfig);
        
        return uploadConfig;
    } catch (error) {
        console.error('[UPLOAD_CONFIG ERROR]', error);
        return uploadConfig;
    }
}

function validateFile(file) {
    console.log('[VALIDATE_FILE] Checking file:', file.name, formatFileSize(file.size));
    
    // Check file size
    const maxSizeBytes = uploadConfig.maxFileSize * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
        return {
            valid: false,
            error: `Ukuran file ${file.name} (${formatFileSize(file.size)}) melebihi batas maksimal ${uploadConfig.maxFileSize} MB`
        };
    }
    
    // Check file type (optional - allow PDF and images)
    const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif'
    ];
    
    if (!allowedTypes.includes(file.type)) {
        return {
            valid: false,
            error: `Tipe file ${file.name} tidak didukung. Hanya PDF dan gambar (JPG, PNG, GIF) yang diperbolehkan.`
        };
    }
    
    console.log('[VALIDATE_FILE] File valid:', file.name);
    
    return { valid: true };
}

async function handleFileInputChange(event) {
    console.log('[FILE_INPUT] File input changed');
    
    const files = Array.from(event.target.files);
    console.log('[FILE_INPUT] Selected files:', files.length);
    
    if (files.length === 0) {
        console.log('[FILE_INPUT] No files selected');
        return;
    }
    
    // Get existing files count
    const existingFilesInput = document.getElementById('existingFilesData');
    let existingCount = 0;
    
    if (existingFilesInput && existingFilesInput.value) {
        try {
            const existing = JSON.parse(existingFilesInput.value);
            existingCount = Array.isArray(existing) ? existing.length : 0;
        } catch (e) {
            console.log('[FILE_INPUT] No existing files');
        }
    }
    
    const totalCount = existingCount + uploadedFiles.length + files.length;
    
    // Check max files limit
    if (totalCount > uploadConfig.maxFiles) {
        showNotification(
            `Maksimal ${uploadConfig.maxFiles} file. Anda sudah memiliki ${existingCount + uploadedFiles.length} file.`,
            'error'
        );
        event.target.value = '';
        return;
    }
    
    // Process each file
    for (const file of files) {
        // Validate
        const validation = validateFile(file);
        
        if (!validation.valid) {
            showNotification(validation.error, 'error');
            continue;
        }
        
        // Convert to base64
        try {
            const base64 = await fileToBase64(file);
            
            const fileObj = {
                fileName: file.name,
                fileData: base64,
                mimeType: file.type,
                fileSize: file.size,
                tempId: Date.now() + Math.random()  // Temporary ID for UI
            };
            
            uploadedFiles.push(fileObj);
            
            console.log('[FILE_INPUT] File added:', file.name, formatFileSize(file.size));
            
        } catch (error) {
            console.error('[FILE_INPUT] Error reading file:', file.name, error);
            showNotification(`Gagal membaca file: ${file.name}`, 'error');
        }
    }
    
    // Clear input
    event.target.value = '';
    
    // Update UI
    displayUploadedFiles();
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = () => {
            // Remove data URL prefix
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        
        reader.onerror = () => {
            reject(new Error('Failed to read file'));
        };
        
        reader.readAsDataURL(file);
    });
}

function updateFileCount() {
    const countEl = document.getElementById('fileCount');
    
    if (countEl) {
        const existingFilesInput = document.getElementById('existingFilesData');
        let existingCount = 0;
        
        if (existingFilesInput && existingFilesInput.value) {
            try {
                const existing = JSON.parse(existingFilesInput.value);
                existingCount = Array.isArray(existing) ? existing.length : 0;
            } catch (e) {}
        }
        
        const totalCount = existingCount + uploadedFiles.length;
        
        countEl.textContent = `${totalCount} / ${uploadConfig.maxFiles} file`;
        countEl.style.color = totalCount >= uploadConfig.maxFiles ? '#dc3545' : '#666';
    }
}

function displayExistingFiles(existingFiles) {
    console.log('[DISPLAY_EXISTING] Displaying existing files:', existingFiles.length);
    
    const container = document.getElementById('existingFilesContainer');
    
    if (!container) {
        console.error('[DISPLAY_EXISTING] Container not found');
        return;
    }
    
    if (!existingFiles || existingFiles.length === 0) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="existing-files-section" style="margin-bottom: 15px;">';
    html += '<h4 style="margin-bottom: 10px; font-size: 14px; color: #666;">File Sudah Terupload:</h4>';
    html += '<div class="existing-files-list">';
    
    existingFiles.forEach((file, index) => {
        const fileIcon = file.mimeType === 'application/pdf' ? '📄' : '🖼️';
        
        html += `
            <div class="existing-file-item" id="existing-file-${index}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: #f0f8ff; border: 1px solid #d0e8ff; border-radius: 6px; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                    <span style="font-size: 24px;">${fileIcon}</span>
                    <div>
                        <div style="font-weight: 500; color: #333; font-size: 14px;">${file.fileName}</div>
                        <div style="font-size: 12px; color: #666;">${formatFileSize(file.size || 0)}</div>
                    </div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button 
                        type="button" 
                        onclick='previewFile(${JSON.stringify(file).replace(/'/g, "&#39;")})' 
                        title="Preview"
                        style="background: #667eea; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                        👁️ Preview
                    </button>
                    <button 
                        type="button" 
                        onclick="removeExistingFile(${index})" 
                        title="Hapus"
                        style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                        🗑️ Hapus
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div></div>';
    
    container.innerHTML = html;
}

function displayUploadedFiles() {
    console.log('[DISPLAY_UPLOADED] Displaying uploaded files:', uploadedFiles.length);
    
    const container = document.getElementById('uploadedFilesContainer');
    
    if (!container) {
        console.error('[DISPLAY_UPLOADED] Container not found');
        return;
    }
    
    if (uploadedFiles.length === 0) {
        container.innerHTML = '<p style="color: #999; font-size: 14px;">Belum ada file yang dipilih</p>';
        updateFileCount();
        return;
    }
    
    let html = '<div class="uploaded-files-section">';
    html += '<h4 style="margin-bottom: 10px; font-size: 14px; color: #666;">File Baru Dipilih:</h4>';
    html += '<div class="uploaded-files-list">';
    
    uploadedFiles.forEach((file, index) => {
        const fileIcon = file.mimeType === 'application/pdf' ? 'fa-file-pdf' : 'fa-file-image';
        
        html += `
            <div class="uploaded-file-item" id="uploaded-file-${index}" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: #f8f9fa; border-radius: 6px; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fas ${fileIcon}" style="font-size: 24px; color: #667eea;"></i>
                    <div>
                        <div style="font-weight: 500; color: #333;">${file.fileName}</div>
                        <div style="font-size: 12px; color: #666;">${formatFileSize(file.fileSize)}</div>
                    </div>
                </div>
                <button 
                    type="button" 
                    class="btn-delete-file" 
                    onclick="removeUploadedFile(${index})" 
                    title="Hapus"
                    style="background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-trash"></i> Hapus
                </button>
            </div>
        `;
    });
    
    html += '</div></div>';
    
    container.innerHTML = html;
    updateFileCount();
}

function removeUploadedFile(index) {
    console.log('[REMOVE_UPLOADED] Removing file at index:', index);
    
    if (index < 0 || index >= uploadedFiles.length) {
        console.error('[REMOVE_UPLOADED] Invalid index:', index);
        return;
    }
    
    const removedFile = uploadedFiles.splice(index, 1);
    console.log('[REMOVE_UPLOADED] Removed file:', removedFile[0].fileName);
    
    showNotification('File dihapus dari daftar', 'info');
    
    // Update UI
    displayUploadedFiles();
}

// ===== IMAGE VIEWER FUNCTIONS (ZOOM, ROTATE, PAN) =====

/**
 * Initialize image viewer with pan and zoom capabilities
 */
function initImageViewer(viewerId) {
    const wrapper = document.getElementById(`wrapper-${viewerId.replace('viewer-', '')}`);
    const img = document.getElementById(`img-${viewerId.replace('viewer-', '')}`);
    
    if (!wrapper || !img) return;
    
    let isPanning = false;
    let startX = 0, startY = 0;
    let currentX = 0, currentY = 0;
    
    // Mouse wheel zoom
    wrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        adjustZoom(viewerId, delta);
    }, { passive: false });
    
    // Touch/trackpad zoom (pinch gesture)
    let initialDistance = 0;
    wrapper.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            initialDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
        }
    });
    
    wrapper.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault();
            const touch1 = e.touches[0];
            const touch2 = e.touches[1];
            const currentDistance = Math.hypot(
                touch2.clientX - touch1.clientX,
                touch2.clientY - touch1.clientY
            );
            
            const delta = (currentDistance - initialDistance) * 0.01;
            adjustZoom(viewerId, delta);
            initialDistance = currentDistance;
        }
    }, { passive: false });
    
    // Pan with mouse
    img.addEventListener('mousedown', (e) => {
        isPanning = true;
        startX = e.clientX - currentX;
        startY = e.clientY - currentY;
        img.style.cursor = 'grabbing';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        
        currentX = e.clientX - startX;
        currentY = e.clientY - startY;
        
        img.setAttribute('data-pan-x', currentX);
        img.setAttribute('data-pan-y', currentY);
        updateImageTransform(viewerId);
    });
    
    document.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            img.style.cursor = 'grab';
        }
    });
    
    // Pan with touch
    let touchStartX = 0, touchStartY = 0;
    img.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX - currentX;
            touchStartY = e.touches[0].clientY - currentY;
        }
    });
    
    img.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            e.preventDefault();
            currentX = e.touches[0].clientX - touchStartX;
            currentY = e.touches[0].clientY - touchStartY;
            
            img.setAttribute('data-pan-x', currentX);
            img.setAttribute('data-pan-y', currentY);
            updateImageTransform(viewerId);
        }
    }, { passive: false });
    
    // Set initial cursor
    img.style.cursor = 'grab';
}

/**
 * Zoom in image
 */
function zoomIn(viewerId) {
    adjustZoom(viewerId, 0.25);
}

/**
 * Zoom out image
 */
function zoomOut(viewerId) {
    adjustZoom(viewerId, -0.25);
}

/**
 * Adjust zoom level
 */
function adjustZoom(viewerId, delta) {
    const img = document.getElementById(`img-${viewerId.replace('viewer-', '')}`);
    if (!img) return;
    
    let currentZoom = parseFloat(img.getAttribute('data-zoom')) || 1;
    currentZoom += delta;
    
    // Limit zoom range: 0.25x to 5x
    currentZoom = Math.max(0.25, Math.min(5, currentZoom));
    
    img.setAttribute('data-zoom', currentZoom);
    updateImageTransform(viewerId);
    updateZoomLevel(viewerId, currentZoom);
}

/**
 * Rotate image 90 degrees clockwise
 */
function rotateImage(viewerId) {
    const img = document.getElementById(`img-${viewerId.replace('viewer-', '')}`);
    if (!img) return;
    
    let currentRotation = parseFloat(img.getAttribute('data-rotation')) || 0;
    currentRotation += 90;
    if (currentRotation >= 360) currentRotation = 0;
    
    img.setAttribute('data-rotation', currentRotation);
    updateImageTransform(viewerId);
}

/**
 * Reset image to original state
 */
function resetImage(viewerId) {
    const img = document.getElementById(`img-${viewerId.replace('viewer-', '')}`);
    if (!img) return;
    
    img.setAttribute('data-zoom', '1');
    img.setAttribute('data-rotation', '0');
    img.setAttribute('data-pan-x', '0');
    img.setAttribute('data-pan-y', '0');
    
    updateImageTransform(viewerId);
    updateZoomLevel(viewerId, 1);
}

/**
 * Update image transform based on current zoom, rotation, and pan
 */
function updateImageTransform(viewerId) {
    const img = document.getElementById(`img-${viewerId.replace('viewer-', '')}`);
    if (!img) return;
    
    const zoom = parseFloat(img.getAttribute('data-zoom')) || 1;
    const rotation = parseFloat(img.getAttribute('data-rotation')) || 0;
    const panX = parseFloat(img.getAttribute('data-pan-x')) || 0;
    const panY = parseFloat(img.getAttribute('data-pan-y')) || 0;
    
    img.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`;
}

/**
 * Update zoom level display
 */
function updateZoomLevel(viewerId, zoom) {
    const zoomLabel = document.getElementById(`zoom-level-${viewerId.replace('viewer-', '')}`);
    if (zoomLabel) {
        zoomLabel.textContent = Math.round(zoom * 100) + '%';
    }
}

/**
 * Initialize all image viewers in modal
 */
function initAllImageViewers() {
    // Find all image viewer containers
    const viewers = document.querySelectorAll('.image-viewer-container');
    viewers.forEach((viewer) => {
        initImageViewer(viewer.id);
    });
}

// Auto-initialize viewers when modal is shown
// This is called after modal content is set
const originalShowModal = typeof showModal !== 'undefined' ? showModal : null;
if (originalShowModal) {
    window.showModal = function(...args) {
        originalShowModal.apply(this, args);
        setTimeout(initAllImageViewers, 100);
    };
}

// Expose to window
window.downloadRPDPerYear = downloadRPDPerYear;
window.downloadRPDDetailYear = downloadRPDDetailYear;
window.downloadRealisasiPerYear = downloadRealisasiPerYear;
window.downloadRealisasiDetailYear = downloadRealisasiDetailYear;
window.loadRPDDataFromSelect = loadRPDDataFromSelect;
window.closeRealisasiModal = closeRealisasiModal;
window.removeUploadedFile = removeUploadedFile;
window.removeExistingFile = removeExistingFile;
window.handleFileInputChange = handleFileInputChange;

// Image Viewer Functions
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.rotateImage = rotateImage;
window.resetImage = resetImage;
window.initImageViewer = initImageViewer;
window.initAllImageViewers = initAllImageViewers;

// ===== PDF VIEWER FUNCTIONS =====

/**
 * Zoom in PDF
 */
function zoomInPDF(viewerId) {
    adjustZoomPDF(viewerId, 0.25);
}

/**
 * Zoom out PDF
 */
function zoomOutPDF(viewerId) {
    adjustZoomPDF(viewerId, -0.25);
}

/**
 * Adjust PDF zoom level
 */
function adjustZoomPDF(viewerId, delta) {
    const pdfContent = document.getElementById(`${viewerId.replace('pdf-viewer-', 'pdf-content-').replace('view-pdf-viewer-', 'view-pdf-content-')}`);
    if (!pdfContent) return;
    
    let currentZoom = parseFloat(pdfContent.getAttribute('data-zoom')) || 1;
    currentZoom += delta;
    
    // Limit zoom range: 0.5x to 3x
    currentZoom = Math.max(0.5, Math.min(3, currentZoom));
    
    pdfContent.setAttribute('data-zoom', currentZoom);
    updatePDFTransform(viewerId);
    updateZoomLevelPDF(viewerId, currentZoom);
}

/**
 * Rotate PDF 90 degrees clockwise
 */
function rotatePDF(viewerId) {
    const pdfContent = document.getElementById(`${viewerId.replace('pdf-viewer-', 'pdf-content-').replace('view-pdf-viewer-', 'view-pdf-content-')}`);
    if (!pdfContent) return;
    
    let currentRotation = parseFloat(pdfContent.getAttribute('data-rotation')) || 0;
    currentRotation += 90;
    if (currentRotation >= 360) currentRotation = 0;
    
    pdfContent.setAttribute('data-rotation', currentRotation);
    updatePDFTransform(viewerId);
}

/**
 * Reset PDF to original state
 */
function resetPDF(viewerId) {
    const pdfContent = document.getElementById(`${viewerId.replace('pdf-viewer-', 'pdf-content-').replace('view-pdf-viewer-', 'view-pdf-content-')}`);
    if (!pdfContent) return;
    
    pdfContent.setAttribute('data-zoom', '1');
    pdfContent.setAttribute('data-rotation', '0');
    pdfContent.setAttribute('data-pan-x', '0');
    pdfContent.setAttribute('data-pan-y', '0');
    
    updatePDFTransform(viewerId);
    updateZoomLevelPDF(viewerId, 1);
}

/**
 * Update PDF transform based on current zoom, rotation, and pan
 */
function updatePDFTransform(viewerId) {
    const pdfContent = document.getElementById(`${viewerId.replace('pdf-viewer-', 'pdf-content-').replace('view-pdf-viewer-', 'view-pdf-content-')}`);
    if (!pdfContent) return;
    
    const zoom = parseFloat(pdfContent.getAttribute('data-zoom')) || 1;
    const rotation = parseFloat(pdfContent.getAttribute('data-rotation')) || 0;
    const panX = parseFloat(pdfContent.getAttribute('data-pan-x')) || 0;
    const panY = parseFloat(pdfContent.getAttribute('data-pan-y')) || 0;
    
    pdfContent.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`;
}

/**
 * Update zoom level display for PDF
 */
function updateZoomLevelPDF(viewerId, zoom) {
    const zoomLabel = document.getElementById(`zoom-level-${viewerId.replace('pdf-viewer-', 'pdf-').replace('view-pdf-viewer-', 'view-pdf-')}`);
    if (zoomLabel) {
        zoomLabel.textContent = Math.round(zoom * 100) + '%';
    }
}

/**
 * Initialize PDF viewer with pan and zoom support
 */
function initPDFViewer(viewerId) {
    const wrapper = document.getElementById(`${viewerId.replace('pdf-viewer-', 'pdf-wrapper-').replace('view-pdf-viewer-', 'view-pdf-wrapper-')}`);
    const pdfContent = document.getElementById(`${viewerId.replace('pdf-viewer-', 'pdf-content-').replace('view-pdf-viewer-', 'view-pdf-content-')}`);
    
    if (!wrapper || !pdfContent) return;
    
    let isPanning = false;
    let startX = 0, startY = 0;
    let currentX = 0, currentY = 0;
    
    // Mouse wheel zoom
    wrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        adjustZoomPDF(viewerId, delta);
    }, { passive: false });
    
    // Pan with mouse (on PDF content wrapper, not iframe)
    pdfContent.addEventListener('mousedown', (e) => {
        // Only allow panning if not clicking on iframe itself
        if (e.target === pdfContent) {
            isPanning = true;
            startX = e.clientX - currentX;
            startY = e.clientY - currentY;
            pdfContent.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isPanning) return;
        
        currentX = e.clientX - startX;
        currentY = e.clientY - startY;
        
        pdfContent.setAttribute('data-pan-x', currentX);
        pdfContent.setAttribute('data-pan-y', currentY);
        updatePDFTransform(viewerId);
    });
    
    document.addEventListener('mouseup', () => {
        if (isPanning) {
            isPanning = false;
            pdfContent.style.cursor = 'grab';
        }
    });
    
    // Pan with touch
    let touchStartX = 0, touchStartY = 0;
    pdfContent.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            touchStartX = e.touches[0].clientX - currentX;
            touchStartY = e.touches[0].clientY - currentY;
        }
    });
    
    pdfContent.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
            e.preventDefault();
            currentX = e.touches[0].clientX - touchStartX;
            currentY = e.touches[0].clientY - touchStartY;
            
            pdfContent.setAttribute('data-pan-x', currentX);
            pdfContent.setAttribute('data-pan-y', currentY);
            updatePDFTransform(viewerId);
        }
    }, { passive: false });
    
    // Set initial cursor
    pdfContent.style.cursor = 'grab';
}

/**
 * Initialize all PDF viewers in modal
 */
function initAllPDFViewers() {
    const viewers = document.querySelectorAll('.pdf-viewer-container');
    viewers.forEach((viewer) => {
        initPDFViewer(viewer.id);
    });
}

// PDF Viewer Functions
window.zoomInPDF = zoomInPDF;
window.zoomOutPDF = zoomOutPDF;
window.rotatePDF = rotatePDF;
window.resetPDF = resetPDF;
window.initPDFViewer = initPDFViewer;
window.initAllPDFViewers = initAllPDFViewers;
