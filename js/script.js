// ===== KONFIGURASI =====
const CONFIG = {
    SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxkODOYjlkk7mKSTU1d1uMynPog6TE6NHmZbF6m0jVV4RVXyC98ehHT4d8ndhbJhTLC/exec',
    KUA_LIST: [
        'KUA Anjatan', 'KUA Arahan', 'KUA Balongan', 'KUA Bangodua', 'KUA Bongas',
        'KUA Cantigi', 'KUA Cikedung', 'KUA Gantar', 'KUA Gabuswetan', 'KUA Haurgeulis',
        'KUA Indramayu', 'KUA Jatibarang', 'KUA Juntinyuat', 'KUA Kandanghaur', 'KUA Karangampel',
        'KUA Kedokan Bunder', 'KUA Kertasemaya', 'KUA Krangkeng', 'KUA Lelea', 'KUA Lohbener',
        'KUA Losarang', 'KUA Pasekan', 'KUA Patrol', 'KUA Sindang', 'KUA Sliyeg',
        'KUA Sukagumiwang', 'KUA Sukra', 'KUA Terisi', 'KUA Tukdana', 'KUA Widasari'
    ],
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
    },
    MONTHS: [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ]
};

// ===== STATE MANAGEMENT =====
let currentUser = null;
let currentPage = 'dashboardPage';
let uploadedFiles = [];

// ===== UTILITY FUNCTIONS =====
function showLoading() {
    console.log('[UI] Showing loading spinner');
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('active');
}

function hideLoading() {
    console.log('[UI] Hiding loading spinner');
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('active');
}   

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

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(date) {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    const button = input.nextElementSibling;
    if (input.type === 'password') {
        input.type = 'text';
        button.textContent = '🙈';
    } else {
        input.type = 'password';
        button.textContent = '👁️';
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
            CONFIG.KUA_LIST.map(kua => `<option value="${kua}">${kua}</option>`).join('');
    }
}

function getMonthIndex(monthName) {
    return CONFIG.MONTHS.indexOf(monthName);
}

// function canEditRPD(monthName, year) {
//     const currentDate = new Date();
//     const currentYear = currentDate.getFullYear();
//     const currentMonth = currentDate.getMonth();
    
//     const rpdMonthIndex = getMonthIndex(monthName);
//     const rpdYear = parseInt(year);

//     console.log(`[CHECK] Can edit RPD: ${monthName} ${year}? Current: ${CONFIG.MONTHS[currentMonth]} ${currentYear}`);

//     // Can only edit future months
//     if (rpdYear > currentYear) {
//         console.log('[CHECK] Future year - can edit');
//         return true;
//     }
//     if (rpdYear === currentYear && rpdMonthIndex > currentMonth) {
//         console.log('[CHECK] Future month - can edit');
//         return true;
//     }

//     console.log('[CHECK] Past or current month - cannot edit');
//     return false;
// }

// ===== API CALLS =====
async function apiCall(action, data = {}) {
    console.log(`[API] Calling: ${action}`, data);
    showLoading();
    try {
        const response = await fetch(CONFIG.SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ action, ...data })
        });
        const result = await response.json();
        hideLoading();
        
        console.log(`[API] Response from ${action}:`, result);
        
        if (result.success) {
            return result.data;
        } else {
            throw new Error(result.message || 'Terjadi kesalahan');
        }
    } catch (error) {
        hideLoading();
        console.error(`[API ERROR] ${action}:`, error);
        showNotification(error.message, 'error');
        throw error;
    }
}

// ===== LOGIN =====
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('[LOGIN] Attempting login...');
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const user = await apiCall('login', { username, password });
            currentUser = user;
            sessionStorage.setItem('user', JSON.stringify(user));
            showDashboard();
            showNotification('Login berhasil', 'success');
        } catch (error) {
            showNotification('Username atau password salah', 'error');
        }
    });
}

function logout() {
    console.log('[LOGOUT] Default logout function');
    sessionStorage.removeItem('user');
    window.location.href = 'index.html';
}

// ===== DASHBOARD =====
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
    
    // Reset ke dashboard page
    currentPage = 'dashboardPage';
    showPage('dashboardPage');
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
            { id: 'reportsPage', label: 'Laporan' },
            { id: 'userManagementPage', label: 'Pengguna' },
            { id: 'rpdConfigPage', label: 'Konfigurasi RPD' }
        ];
    } else {
        menuItems = [
            { id: 'dashboardPage', label: 'Dashboard' },
            { id: 'rpdPage', label: 'RPD' },
            { id: 'realisasiPage', label: 'Realisasi' },
            { id: 'changePasswordPage', label: 'Ubah Password' }
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

function setCache(cacheKey, data) {
    dataCache[cacheKey] = {
        ...dataCache[cacheKey],
        data: data,
        timestamp: Date.now()
    };
    console.log(`[CACHE] Set cache for ${cacheKey}`);
}

function getCache(cacheKey) {
    if (isCacheValid(cacheKey)) {
        console.log(`[CACHE] Using cached data for ${cacheKey}`);
        return dataCache[cacheKey].data;
    }
    return null;
}

function invalidateCache(cacheKey) {
    if (cacheKey) {
        dataCache[cacheKey].data = null;
        dataCache[cacheKey].timestamp = null;
        console.log(`[CACHE] Invalidated cache for ${cacheKey}`);
    } else {
        // Invalidate all cache
        Object.keys(dataCache).forEach(key => {
            dataCache[key].data = null;
            dataCache[key].timestamp = null;
        });
        console.log(`[CACHE] Invalidated all cache`);
    }
}

// Auto-refresh status realisasi setiap 30 detik jika ada yang pending
let realisasiStatusPoller = null;

function startRealisasiPolling() {
    if (currentPage === 'realisasiPage') {
        realisasiStatusPoller = setInterval(async () => {
            console.log('[POLL] Checking realisasi status...');
            await loadRealisasis(true); // Force refresh
        }, 30000); // 30 detik
    }
}

function stopRealisasiPolling() {
    if (realisasiStatusPoller) {
        clearInterval(realisasiStatusPoller);
        realisasiStatusPoller = null;
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
    
    // ✅ Show/Hide elements based on role when entering RPD page
    if (pageId === 'rpdPage') {
        const kuaFilter = document.getElementById('rpdKUAFilter');
        const btnCreateRPD = document.getElementById('btnCreateRPD');
        const thKUA = document.querySelectorAll('.th-kua');
        
        if (currentUser.role === 'Admin') {
            // Admin: Show KUA filter, hide create button, show KUA column
            if (kuaFilter) {
                kuaFilter.style.display = 'block';
                // Populate KUA options
                kuaFilter.innerHTML = '<option value="">Semua KUA</option>' + 
                    CONFIG.KUA_LIST.map(kua => `<option value="${kua}">${kua}</option>`).join('');
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
    
    // Load data for specific pages
    switch(pageId) {
        case 'dashboardPage':
            loadDashboardStats();
            break;
        case 'budgetingPage':
            loadBudgets();
            break;
        case 'userManagementPage':
            loadUsers();
            break;
        case 'rpdConfigPage':
            loadRPDConfig();
            break;
        case 'rpdPage':
            loadRPDs(); // ✅ Works for both Admin and Operator
            break;
        case 'realisasiPage':
            loadRealisasis();
            if (currentUser.role === 'Operator KUA') {
                startRealisasiPolling();
            }
            break;
        case 'verifikasiPage':
            loadVerifikasi();
            if (currentUser.role === 'Admin') {
                startVerifikasiAutoRefresh();
            }
            break;
        case 'reportsPage':
            initializeReportsPage();
            break;
    }
}

async function loadDashboardStats(forceRefresh = false) {
    console.log('[DASHBOARD] Loading stats');
    
    if (!forceRefresh) {
        const cachedData = getCache('dashboardStats');
        if (cachedData) {
            displayDashboardStats(cachedData);
            return;
        }
    }
    
    try {
        const stats = await apiCall('getDashboardStats', {
            role: currentUser.role,
            kua: currentUser.kua
        });
        setCache('dashboardStats', stats);
        displayDashboardStats(stats);
    } catch (error) {
        console.error('[DASHBOARD ERROR]', error);
    }
}

function displayDashboardStats(stats) {
    const statsGrid = document.getElementById('statsGrid');
    if (!statsGrid) return;
    
    if (currentUser.role === 'Admin') {
        statsGrid.innerHTML = `
            <div class="stat-card">
                <h3>Total Budget</h3>
                <div class="value">${formatCurrency(stats.totalBudget)}</div>
            </div>
            <div class="stat-card success">
                <h3>Total RPD</h3>
                <div class="value">${formatCurrency(stats.totalRPD)}</div>
            </div>
            <div class="stat-card warning">
                <h3>Total Realisasi</h3>
                <div class="value">${formatCurrency(stats.totalRealisasi)}</div>
            </div>
            <div class="stat-card danger">
                <h3>Sisa Budget</h3>
                <div class="value">${formatCurrency(stats.sisaBudget)}</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);">
                <h3>Menunggu Verifikasi</h3>
                <div class="value">${stats.pendingVerifikasi}</div>
            </div>
        `;
    } else {
        statsGrid.innerHTML = `
            <div class="stat-card">
                <h3>Budget ${currentUser.kua}</h3>
                <div class="value">${formatCurrency(stats.budget)}</div>
            </div>
            <div class="stat-card success">
                <h3>Total RPD</h3>
                <div class="value">${formatCurrency(stats.totalRPD)}</div>
            </div>
            <div class="stat-card warning">
                <h3>Total Realisasi</h3>
                <div class="value">${formatCurrency(stats.totalRealisasi)}</div>
            </div>
            <div class="stat-card danger">
                <h3>Sisa Budget</h3>
                <div class="value">${formatCurrency(stats.sisaBudget)}</div>
            </div>
        `;
    }
}

// ===== BUDGET MANAGEMENT =====
async function loadBudgets(forceRefresh = false) {
    console.log('[BUDGET] Loading budgets');
    
    if (!forceRefresh) {
        const cachedData = getCache('budgets');
        if (cachedData) {
            displayBudgets(cachedData);
            return;
        }
    }
    
    try {
        const yearFilter = document.getElementById('budgetYearFilter');
        const year = yearFilter ? yearFilter.value : new Date().getFullYear();
        
        const budgets = await apiCall('getBudgets', { year: year });
        setCache('budgets', budgets);
        displayBudgets(budgets);
    } catch (error) {
        console.error('[BUDGET ERROR]', error);
    }
}

function displayBudgets(budgets) {
    const tbody = document.querySelector('#budgetTable tbody');
    tbody.innerHTML = budgets.map((budget, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${budget.kua}</td>
            <td>${budget.year}</td>
            <td>${formatCurrency(budget.budget)}</td>
            <td>${formatCurrency(budget.totalRPD)}</td>
            <td>${formatCurrency(budget.totalRealisasi)}</td>
            <td>${formatCurrency(budget.sisaBudget)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm" onclick='editBudget(${JSON.stringify(budget)})'>Edit</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function showBudgetModal(budget = null) {
    console.log('[BUDGET MODAL]', budget);
    const modal = document.getElementById('modal');
    const currentYear = new Date().getFullYear();
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${budget ? 'Edit Budget' : 'Tambah Budget'}</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            <form id="budgetForm">
                <div class="form-group">
                    <label>Pilih KUA</label>
                    <select id="budgetKUA" required>
                        <option value="">-- Pilih KUA --</option>
                        ${CONFIG.KUA_LIST.map(kua => `
                            <option value="${kua}" ${budget && budget.kua === kua ? 'selected' : ''}>${kua}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Tahun Anggaran</label>
                    <select id="budgetYear" required>
                        ${[currentYear - 1, currentYear, currentYear + 1].map(year => `
                            <option value="${year}" ${budget && budget.year == year ? 'selected' : year === currentYear ? 'selected' : ''}>${year}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Budget Tahunan (Rp)</label>
                    <input type="number" id="budgetAmount" required value="${budget ? budget.budget : ''}" min="0" step="1000" placeholder="Contoh: 100000000">
                </div>
                <button type="submit" class="btn">Simpan</button>
            </form>
        </div>
    `;
    
    modal.classList.add('active');
    
    document.getElementById('budgetForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('[BUDGET] Saving budget');
        
        try {
            await apiCall('saveBudget', {
                id: budget ? budget.id : null,
                kua: document.getElementById('budgetKUA').value,
                year: document.getElementById('budgetYear').value,
                budget: document.getElementById('budgetAmount').value,
                userId: currentUser.id,
                username: currentUser.username
            });
            
            showNotification('Budget berhasil disimpan', 'success');
            closeModal();
            loadBudgets();
            loadDashboardStats();
        } catch (error) {
            showNotification(error.message, 'error');
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
    const modal = document.getElementById('modal');
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
                        ${CONFIG.KUA_LIST.map(kua => `
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
        invalidateCache('budgets');        // Hapus cache budgets
        invalidateCache('dashboardStats'); // Hapus cache dashboard stats
        
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
        invalidateCache('users');
        
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
            invalidateCache('users');
            await loadUsers(true);
            
            showNotification('Pengguna berhasil dinonaktifkan', 'success');
        } catch (error) {
            console.error('[DELETE_USER ERROR]', error);
            showNotification(error.message, 'error');
        }
    }
}

// ===== RPD CONFIG =====
async function loadRPDConfig(forceRefresh = false) {
    console.log('[CONFIG] Loading RPD & Realisasi config');
    
    if (!forceRefresh) {
        const cachedData = getCache('config');
        if (cachedData) {
            displayRPDConfig(cachedData);
            return;
        }
    }
    
    try {
        const config = await apiCall('getRPDConfig');
        setCache('config', config);
        displayRPDConfig(config);
    } catch (error) {
        console.error('[CONFIG ERROR]', error);
    }
}

function displayRPDConfig(config) {
    document.getElementById('rpdStatus').value = config.RPD_STATUS || 'open';
    document.getElementById('realisasiStatus').value = config.REALISASI_STATUS || 'open';
    document.getElementById('realisasiMaxFileSize').value = config.REALISASI_MAX_FILE_SIZE || '5';
    document.getElementById('realisasiMaxFiles').value = config.REALISASI_MAX_FILES || '10';
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
        invalidateCache('config');
        
        showNotification('Konfigurasi berhasil disimpan', 'success');
        
    } catch (error) {
        console.error('[SAVE_CONFIG ERROR]', error);
        showNotification(error.message, 'error');
    }
}

// ===== RPD MANAGEMENT =====
async function loadRPDs(forceRefresh = false) {
    console.log('[RPD] Loading RPDs');
    
    if (!forceRefresh) {
        const cachedData = getCache('rpds');
        if (cachedData) {
            displayRPDs(cachedData);
            return;
        }
    }
    
    try {
        const yearFilter = document.getElementById('rpdYearFilter');
        const year = yearFilter ? yearFilter.value : new Date().getFullYear();
        
        let rpds;
        
        if (currentUser.role === 'Admin') {
            // Admin - Get all KUA RPDs
            const kuaFilter = document.getElementById('rpdKUAFilter');
            const selectedKUA = kuaFilter ? kuaFilter.value : '';
            
            if (selectedKUA) {
                rpds = await apiCall('getRPDs', { kua: selectedKUA, year: year });
            } else {
                rpds = await apiCall('getRPDs', { year: year }); // All KUAs
            }
        } else {
            // Operator - Only their KUA
            rpds = await apiCall('getRPDs', { kua: currentUser.kua, year: year });
        }
        
        rpds = sortByMonth(rpds);
        setCache('rpds', rpds);
        displayRPDs(rpds);
    } catch (error) {
        console.error('[RPD ERROR]', error);
    }
}

function displayRPDs(rpds) {
    const tbody = document.querySelector('#rpdTable tbody');
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const monthNames = CONFIG.MONTHS;
    
    let totalNominal = 0;
    
    const rows = rpds.map((rpd, index) => {
        totalNominal += parseFloat(rpd.total || 0);
        
        const rpdMonthIndex = monthNames.indexOf(rpd.month);
        const rpdYear = parseInt(rpd.year);
        
        // Admin can always view, Operator can edit future months only
        const canEdit = currentUser.role === 'Admin' || 
                       (rpdYear > currentYear || (rpdYear === currentYear && rpdMonthIndex > currentMonth));
        
        const rpdEscaped = JSON.stringify(rpd).replace(/"/g, '&quot;');
        
        return `
        <tr>
            <td>${index + 1}</td>
            ${currentUser.role === 'Admin' ? `<td>${rpd.kua}</td>` : ''}
            <td>${rpd.month}</td>
            <td>${rpd.year}</td>
            <td>${formatCurrency(rpd.total)}</td>
            <td>${formatDate(rpd.createdAt)}</td>
            <td>${formatDate(rpd.updatedAt)}</td>
            <td><span class="badge badge-info">Tersimpan</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm" onclick='viewRPD(${rpdEscaped})'>Lihat</button>
                    ${canEdit && currentUser.role !== 'Admin' ? `<button class="btn btn-sm" onclick='editRPD(${rpdEscaped})'>Edit</button>` : ''}
                </div>
            </td>
        </tr>
        `;
    }).join('');
    
    const totalRow = `
        <tr style="background: #f8f9fa; font-weight: bold;">
            <td colspan="${currentUser.role === 'Admin' ? '4' : '3'}" style="text-align: right;">TOTAL:</td>
            <td>${formatCurrency(totalNominal)}</td>
            <td colspan="${currentUser.role === 'Admin' ? '3' : '3'}"></td>
        </tr>
    `;
    
    tbody.innerHTML = rows + totalRow;
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
    
    // Check if config allows RPD input
    try {
        const config = await apiCall('getRPDConfig');
        if (config.RPD_STATUS === 'closed' && currentUser.role !== 'Admin') {
            showNotification('Pengisian RPD sedang ditutup', 'warning');
            return;
        }
    } catch (error) {
        console.error('[RPD ERROR] Failed to check config', error);
    }

    // Get budget info
    let budgetInfo = { budget: 0, totalRPD: 0, sisaRPD: 0 };
    try {
        const yearFilter = document.getElementById('rpdYearFilter');
        const year = yearFilter ? yearFilter.value : new Date().getFullYear();
        
        const budgets = await apiCall('getBudgets', { year: year });
        const budget = budgets.find(b => b.kua === currentUser.kua);
        if (budget) {
            budgetInfo = {
                budget: budget.budget,
                totalRPD: budget.totalRPD,
                sisaRPD: budget.budget - budget.totalRPD
            };
        }
    } catch (error) {
        console.error('[RPD ERROR] Failed to get budget:', error);
    }

    const modal = document.getElementById('modal');
    const rpdData = rpd ? rpd.data : {};
    const currentYear = new Date().getFullYear();
    
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
                    <strong>${formatCurrency(budgetInfo.sisaRPD)}</strong>
                </div>
            </div>
            
            <form id="rpdForm">
                <div class="form-group">
                    <label>Bulan</label>
                    <select id="rpdMonth" required ${rpd ? 'disabled' : ''}>
                        <option value="">-- Pilih Bulan --</option>
                        ${CONFIG.MONTHS.map((month, index) => `
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
                    ${Object.entries(CONFIG.RPD_PARAMETERS).map(([code, param]) => `
                        <div class="rpd-item">
                            <h4>${code} - ${param.name}</h4>
                            ${param.items.map(item => `
                                <div class="rpd-subitem">
                                    <label>${item}</label>
                                    <input type="number" 
                                            class="rpd-input" 
                                            data-code="${code}" 
                                            data-item="${item}" 
                                            value="${rpdData[code] && rpdData[code][item] ? rpdData[code][item] : 0}" 
                                            min="0"
                                            step="1000"
                                            placeholder="0">
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
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
    
    // Calculate total on input change
    const inputs = document.querySelectorAll('.rpd-input');
    inputs.forEach(input => {
        input.addEventListener('input', calculateRPDTotal);
    });
    
    calculateRPDTotal();
    
    document.getElementById('rpdForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('[RPD] Submitting RPD form');
        
        const month = document.getElementById('rpdMonth').value;
        const year = document.getElementById('rpdYear').value;
        
        // Validasi untuk Operator
        if (currentUser.role === 'Operator KUA') {
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth();
            const monthNames = CONFIG.MONTHS;
            const rpdMonthIndex = monthNames.indexOf(month);
            const rpdYear = parseInt(year);
            
            if (rpd && rpd.id) {
                if (rpdYear < currentYear || (rpdYear === currentYear && rpdMonthIndex <= currentMonth)) {
                    showNotification('RPD untuk bulan ini dan bulan sebelumnya tidak dapat diubah', 'warning');
                    return;
                }
            } else {
                if (rpdYear < currentYear || (rpdYear === currentYear && rpdMonthIndex < currentMonth)) {
                    showNotification('RPD hanya dapat dibuat untuk bulan ini atau bulan yang akan datang', 'warning');
                    return;
                }
            }
        }
        
        // Kumpulkan data RPD
        const rpdData = {};
        let total = 0;
        
        Object.keys(CONFIG.RPD_PARAMETERS).forEach(code => {
            rpdData[code] = {};
            const items = document.querySelectorAll(`.rpd-input[data-code="${code}"]`);
            items.forEach(input => {
                const item = input.dataset.item;
                const value = parseFloat(input.value) || 0;
                rpdData[code][item] = value;
                total += value;
            });
        });
        
        try {
            // Panggil API save
            await apiCall('saveRPD', {
                id: rpd ? rpd.id : null,
                kua: currentUser.kua,
                userId: currentUser.id,
                username: currentUser.username,
                role: currentUser.role,
                month: month,
                year: year,
                rpdData: rpdData,
                total: total
            });
            
            // ✅ STEP 1: Hapus cache yang terkait
            console.log('[SAVE_RPD] Invalidating related cache');
            invalidateCache('rpds');           // Hapus cache RPD
            invalidateCache('dashboardStats'); // Hapus cache dashboard
            
            // ✅ STEP 2: Tutup modal
            closeModal();
            
            // ✅ STEP 3: Reload dengan FORCE REFRESH
            console.log('[SAVE_RPD] Reloading fresh data');
            await loadRPDs(true);              // Force refresh RPD
            await loadDashboardStats(true);    // Force refresh dashboard
            
            // ✅ STEP 4: Notifikasi
            showNotification('RPD berhasil disimpan', 'success');
            
        } catch (error) {
            console.error('[SAVE_RPD ERROR]', error);
            showNotification(error.message, 'error');
        }
    });
}

function calculateRPDTotal() {
    let total = 0;
    document.querySelectorAll('.rpd-input').forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    document.getElementById('rpdTotal').textContent = formatCurrency(total);
}

function viewRPD(rpd) {
    console.log('[RPD] Viewing RPD:', rpd);
    const modal = document.getElementById('modal');
    
    let detailHTML = '';
    Object.entries(rpd.data).forEach(([code, items]) => {
        const param = CONFIG.RPD_PARAMETERS[code];
        detailHTML += `<div class="rpd-item">
            <h4>${code} - ${param.name}</h4>`;
        Object.entries(items).forEach(([item, value]) => {
            detailHTML += `<div class="rpd-subitem">
                <span>${item}</span>
                <strong>${formatCurrency(value)}</strong>
            </div>`;
        });
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
    console.log('[REALISASI] Loading realisasis');
    
    if (!forceRefresh) {
        const cachedData = getCache('realisasis');
        if (cachedData) {
            displayRealisasis(cachedData);
            return;
        }
    }
    
    try {
        const yearFilter = document.getElementById('realisasiYearFilter');
        const year = yearFilter ? yearFilter.value : new Date().getFullYear();
        
        let realisasis = await apiCall('getRealisasis', { kua: currentUser.kua, year: year });
        realisasis = sortByMonth(realisasis);
        setCache('realisasis', realisasis);
        displayRealisasis(realisasis);
    } catch (error) {
        console.error('[REALISASI ERROR]', error);
    }
}

function displayRealisasis(realisasis) {
    const tbody = document.querySelector('#realisasiTable tbody');
    let totalNominal = 0;
    
    const rows = realisasis.map((real, index) => {
        totalNominal += parseFloat(real.total || 0);
        let statusClass = 'warning';
        if (real.status === 'Diterima') statusClass = 'success';
        if (real.status === 'Ditolak') statusClass = 'danger';
        
        const realEscaped = JSON.stringify(real).replace(/"/g, '&quot;');
        
        return `
        <tr>
            <td>${index + 1}</td>
            <td>${real.month}</td>
            <td>${real.year}</td>
            <td>${formatCurrency(real.total)}</td>
            <td>${formatDate(real.createdAt)}</td>
            <td>${formatDate(real.updatedAt)}</td>
            <td><span class="badge badge-${statusClass}">${real.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm" onclick='viewRealisasi(${realEscaped})'>Lihat</button>
                    ${real.status !== 'Diterima' ? `<button class="btn btn-sm" onclick='editRealisasi(${realEscaped})'>Edit</button>` : ''}
                </div>
            </td>
        </tr>
        `;
    }).join('');
    
    const totalRow = `
        <tr style="background: #f8f9fa; font-weight: bold;">
            <td colspan="3" style="text-align: right;">TOTAL:</td>
            <td>${formatCurrency(totalNominal)}</td>
            <td colspan="4"></td>
        </tr>
    `;
    
    tbody.innerHTML = rows + totalRow;
}

async function showRealisasiModal(realisasi = null) {
    console.log('[REALISASI MODAL]', realisasi);
    
    // Jika mode edit
    if (realisasi) {
        // Check if already approved
        if (realisasi.status === 'Diterima') {
            showNotification('Realisasi yang sudah disetujui tidak dapat diubah', 'warning');
            return;
        }
        
        try {
            const config = await apiCall('getRPDConfig');
            if (config.REALISASI_STATUS === 'closed' && currentUser.role !== 'Admin') {
                showNotification('Pengisian Realisasi sedang ditutup', 'warning');
                return;
            }
        } catch (error) {
            console.error('[REALISASI ERROR] Failed to check config', error);
        }

        try {
            const rpds = await apiCall('getRPDs', { kua: currentUser.kua, year: realisasi.year });
            const rpd = rpds.find(r => r.id === realisasi.rpdId);
            
            if (rpd) {
                await showRealisasiEditForm(rpd, realisasi);
            } else {
                showNotification('Data RPD tidak ditemukan', 'error');
            }
        } catch (error) {
            showNotification('Gagal memuat data RPD', 'error');
        }
        return;
    }
    
    // Mode buat baru - langsung tampilkan pilihan bulan
    try {
        const config = await apiCall('getRPDConfig');
        if (config.REALISASI_STATUS === 'closed' && currentUser.role !== 'Admin') {
            showNotification('Pengisian Realisasi sedang ditutup', 'warning');
            return;
        }
    } catch (error) {
        console.error('[REALISASI ERROR] Failed to check config', error);
    }

    const modal = document.getElementById('modal');
    const currentYear = new Date().getFullYear();
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3>Pilih Bulan untuk Realisasi</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            
            <div class="form-group">
                <label>Pilih Bulan RPD</label>
                <select id="selectRPDMonth" required style="padding: 12px; font-size: 16px;">
                    <option value="">-- Pilih Bulan --</option>
                </select>
            </div>
            
            <button class="btn" onclick="continueToRealisasiForm()" id="btnContinue" disabled>Lanjutkan</button>
        </div>
    `;
    
    modal.classList.add('active');
    
    try {
        const yearFilter = document.getElementById('realisasiYearFilter');
        const year = yearFilter ? yearFilter.value : currentYear;
        
        const rpds = await apiCall('getRPDs', { kua: currentUser.kua, year: year });
        const select = document.getElementById('selectRPDMonth');
        
        if (!select) {
            console.error('[REALISASI ERROR] Select element not found');
            return;
        }
        
        const realisasis = await apiCall('getRealisasis', { kua: currentUser.kua, year: year });
        const realisasiMonths = realisasis.map(r => `${r.month}-${r.year}`);
        
        let hasOptions = false;
        rpds.forEach(rpd => {
            const monthYear = `${rpd.month}-${rpd.year}`;
            if (!realisasiMonths.includes(monthYear)) {
                const option = document.createElement('option');
                option.value = rpd.id;
                option.textContent = `${rpd.month} ${rpd.year}`;
                option.dataset.rpd = JSON.stringify(rpd);
                select.appendChild(option);
                hasOptions = true;
            }
        });
        
        if (!hasOptions) {
            select.innerHTML = '<option value="">Tidak ada RPD yang tersedia untuk direalisasi</option>';
            document.getElementById('btnContinue').style.display = 'none';
        }
        
        // Enable button when month selected
        select.addEventListener('change', function() {
            const btn = document.getElementById('btnContinue');
            if (this.value) {
                btn.disabled = false;
            } else {
                btn.disabled = true;
            }
        });
        
    } catch (error) {
        console.error('[REALISASI ERROR] Failed to load RPDs:', error);
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
    
    const modal = document.getElementById('modal');
    
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
    
    // Get budget info
    let budgetInfo = { budget: 0, totalRealisasi: 0, sisaBudget: 0 };
    try {
        const budgets = await apiCall('getBudgets', { year: rpd.year });
        const budget = budgets.find(b => b.kua === currentUser.kua);
        if (budget) {
            budgetInfo = {
                budget: budget.budget,
                totalRealisasi: budget.totalRealisasi,
                sisaBudget: budget.budget - budget.totalRealisasi
            };
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
        const param = CONFIG.RPD_PARAMETERS[code];
        parametersHTML += `<div class="rpd-item">
            <h4>${code} - ${param.name}</h4>`;
        
        Object.entries(items).forEach(([item, rpdValue]) => {
            const realValue = realisasiData[code] && realisasiData[code][item] ? realisasiData[code][item] : 0;
            parametersHTML += `
                <div class="rpd-subitem" style="grid-template-columns: 2fr 1fr 1fr; gap: 10px;">
                    <label>${item}</label>
                    <div style="text-align: right; padding: 10px; background: #e9ecef; border-radius: 6px;">
                        <small style="display: block; color: #666; font-size: 11px;">RPD</small>
                        <strong style="color: #333;">${formatCurrency(rpdValue)}</strong>
                    </div>
                    <input type="number" 
                        class="realisasi-input" 
                        data-code="${code}" 
                        data-item="${item}" 
                        value="${realValue}" 
                        min="0"
                        step="1000"
                        placeholder="Realisasi">
                </div>
            `;
        });
        
        parametersHTML += `</div>`;
    });
    
    document.getElementById('realisasiParameters').innerHTML = parametersHTML;
    
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
            input.addEventListener('input', calculateRealisasiTotal);
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
            
            newForm.querySelectorAll('.realisasi-input').forEach(input => {
                const code = input.dataset.code;
                const item = input.dataset.item;
                const value = parseFloat(input.value) || 0;
                
                if (!realisasiDataToSave[code]) realisasiDataToSave[code] = {};
                realisasiDataToSave[code][item] = value;
                total += value;
            });
            
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
                invalidateCache('realisasis');     // Hapus cache realisasi
                invalidateCache('dashboardStats'); // Hapus cache dashboard
                
                // ✅ STEP 2: Tutup modal
                closeModal();
                
                // ✅ STEP 3: Reload dengan FORCE REFRESH
                console.log('[SAVE_REALISASI] Reloading fresh data');
                await loadRealisasis(true);        // Force refresh realisasi
                await loadDashboardStats(true);    // Force refresh dashboard
                
                // ✅ STEP 4: Notifikasi
                showNotification('Realisasi berhasil disimpan', 'success');
                
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
    document.querySelectorAll('.realisasi-input').forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    document.getElementById('realisasiTotal').textContent = formatCurrency(total);
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
    console.log('[FILE] ========== DISPLAY FILES START ==========');
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
        fileList.innerHTML = '';
    } else {
        const html = uploadedFiles.map((file, index) => {
            if (!file || !file.fileName) {
                console.warn(`[FILE] Invalid file at index ${index}`);
                return '';
            }
            
            console.log(`[FILE] Creating HTML for file ${index}:`, file.fileName);
            return `
                <div class="file-item">
                    <span>📎 ${file.fileName} (${(file.size / 1024).toFixed(2)} KB)</span>
                    <button type="button" class="btn btn-danger btn-sm" onclick="removeFile(${index})">Hapus</button>
                </div>
            `;
        }).filter(html => html !== '').join('');
        
        console.log('[FILE] Setting fileList innerHTML');
        fileList.innerHTML = html;
        console.log('[FILE] File list updated with', uploadedFiles.length, 'files');
    }
    
    console.log('[FILE] ========== DISPLAY FILES END ==========');
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

function viewRealisasi(realisasi) {
    console.log('[REALISASI] Viewing realisasi:', realisasi);
    console.log('[REALISASI] Files count:', realisasi.files ? realisasi.files.length : 0);
    
    const modal = document.getElementById('modal');
    
    let detailHTML = '';
    Object.entries(realisasi.data).forEach(([code, items]) => {
        const param = CONFIG.RPD_PARAMETERS[code];
        detailHTML += `<div class="rpd-item">
            <h4>${code} - ${param.name}</h4>`;
        Object.entries(items).forEach(([item, value]) => {
            detailHTML += `<div class="rpd-subitem">
                <span>${item}</span>
                <strong>${formatCurrency(value)}</strong>
            </div>`;
        });
        detailHTML += `</div>`;
    });
    
    let statusClass = 'warning';
    if (realisasi.status === 'Diterima') statusClass = 'success';
    if (realisasi.status === 'Ditolak') statusClass = 'danger';
    
    let filesHTML = '';
    if (realisasi.files && Array.isArray(realisasi.files) && realisasi.files.length > 0) {
        console.log('[REALISASI] Processing files for display:', realisasi.files.length);
        
        filesHTML = `
            <div class="rpd-item">
                <h4>Dokumen Pendukung (${realisasi.files.length} file)</h4>
                ${realisasi.files.map((file, index) => {
                    console.log(`[REALISASI] File ${index + 1}:`, file);
                    
                    if (!file || !file.fileName) {
                        return `<div class="file-item">
                            <span>⚠️ File tidak valid</span>
                        </div>`;
                    }
                    
                    const isImage = file.mimeType && file.mimeType.startsWith('image/');
                    const isPDF = file.mimeType === 'application/pdf';
                    const previewUrl = getDrivePreviewUrl(file.fileUrl, file.mimeType);
                    const fileId = file.fileId || file.fileUrl.match(/[-\w]{25,}/)?.[0];
                    
                    console.log(`[REALISASI] Preview URL for ${file.fileName}:`, previewUrl);
                    
                    return `
                        <div class="file-item" style="flex-direction: column; align-items: flex-start; padding: 15px; margin-bottom: 10px;">
                            <div style="display: flex; justify-content: space-between; width: 100%; margin-bottom: 10px;">
                                <span style="font-weight: 500;">📎 ${file.fileName} (${((file.size || 0) / 1024).toFixed(2)} KB)</span>
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
        console.log('[REALISASI] No files to display');
        filesHTML = `
            <div class="rpd-item">
                <h4>Dokumen Pendukung</h4>
                <p style="color: #666; font-style: italic; padding: 15px;">Tidak ada dokumen pendukung</p>
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <h3>Detail Realisasi - ${realisasi.month} ${realisasi.year}</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            
            <div class="summary-box">
                <div class="summary-item">
                    <span>Status:</span>
                    <span class="badge badge-${statusClass}">${realisasi.status}</span>
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
        </div>
    `;
    
    modal.classList.add('active');
}

function editRealisasi(realisasi) {
    showRealisasiModal(realisasi);
}

// ===== VERIFIKASI MANAGEMENT (UPDATED WITH CACHE) =====
async function loadVerifikasi(forceRefresh = false) {
    console.log('[VERIFIKASI] Loading verifikasi');
    
    // ✅ Check cache first (kecuali force refresh)
    if (!forceRefresh) {
        const cachedData = getCache('verifikasi');
        if (cachedData) {
            console.log('[VERIFIKASI] Using cached data');
            displayVerifikasi(cachedData.realisasis, cachedData.filters);
            return;
        }
    }
    
    try {
        const kuaFilter = document.getElementById('verifikasiKUAFilter');
        const statusFilter = document.getElementById('verifikasiStatusFilter');
        const yearFilter = document.getElementById('verifikasiYearFilter');
        
        const year = yearFilter ? yearFilter.value : new Date().getFullYear();
        
        // Get all realisasis for the year
        let realisasis = await apiCall('getRealisasis', { year: year });
        
        // Store filters yang sedang aktif
        const currentFilters = {
            kua: kuaFilter ? kuaFilter.value : '',
            status: statusFilter ? statusFilter.value : '',
            year: year
        };
        
        // ✅ Cache the data along with current filters
        setCache('verifikasi', {
            realisasis: realisasis,
            filters: currentFilters
        });
        
        displayVerifikasi(realisasis, currentFilters);
        
    } catch (error) {
        console.error('[VERIFIKASI ERROR]', error);
    }
}

// ✅ Fungsi baru untuk display verifikasi (separated from loading)
function displayVerifikasi(realisasis, filters) {
    console.log('[VERIFIKASI] Displaying data with filters:', filters);
    
    let filteredData = [...realisasis]; // Clone array
    
    // Apply KUA filter
    if (filters.kua) {
        filteredData = filteredData.filter(r => r.kua === filters.kua);
    }
    
    // Apply status filter
    if (filters.status) {
        filteredData = filteredData.filter(r => r.status === filters.status);
    }
    
    // Sort by month
    filteredData = sortByMonth(filteredData);
    
    const tbody = document.querySelector('#verifikasiTable tbody');
    
    if (!tbody) {
        console.error('[VERIFIKASI] Table body not found');
        return;
    }
    
    tbody.innerHTML = filteredData.map((real, index) => {
        let statusClass = 'warning';
        if (real.status === 'Diterima') statusClass = 'success';
        if (real.status === 'Ditolak') statusClass = 'danger';
        
        return `
        <tr>
            <td>${index + 1}</td>
            <td>${real.kua}</td>
            <td>${real.month}</td>
            <td>${real.year}</td>
            <td>${formatCurrency(real.total)}</td>
            <td>${formatDate(real.createdAt)}</td>
            <td><span class="badge badge-${statusClass}">${real.status}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm" onclick='verifyRealisasi(${JSON.stringify(real)})'>Verifikasi</button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
    
    console.log(`[VERIFIKASI] Displayed ${filteredData.length} records`);
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
    console.log('[VERIFIKASI] Files count:', realisasi.files ? realisasi.files.length : 0);
    
    const modal = document.getElementById('modal');
    
    let detailHTML = '';
    Object.entries(realisasi.data).forEach(([code, items]) => {
        const param = CONFIG.RPD_PARAMETERS[code];
        detailHTML += `<div class="rpd-item">
            <h4>${code} - ${param.name}</h4>`;
        Object.entries(items).forEach(([item, value]) => {
            detailHTML += `<div class="rpd-subitem">
                <span>${item}</span>
                <strong>${formatCurrency(value)}</strong>
            </div>`;
        });
        detailHTML += `</div>`;
    });
    
    let filesHTML = '';
    if (realisasi.files && Array.isArray(realisasi.files) && realisasi.files.length > 0) {
        console.log('[VERIFIKASI] Processing files for display:', realisasi.files.length);
        
        filesHTML = `
            <div class="rpd-item">
                <h4>Dokumen Pendukung (${realisasi.files.length} file)</h4>
                ${realisasi.files.map((file, index) => {
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
                                <span style="font-weight: 500;">📎 ${file.fileName} (${((file.size || 0) / 1024).toFixed(2)} KB)</span>
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
        console.log('[VERIFIKASI] No files to display');
        filesHTML = `
            <div class="rpd-item">
                <h4>Dokumen Pendukung</h4>
                <p style="color: #666; font-style: italic; padding: 15px;">Tidak ada dokumen pendukung</p>
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <h3>Verifikasi Realisasi - ${realisasi.kua}</h3>
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
            
            ${detailHTML}
            ${filesHTML}
            
            <div class="summary-box">
                <div class="summary-item">
                    <span>Total Realisasi:</span>
                    <strong>${formatCurrency(realisasi.total)}</strong>
                </div>
            </div>
            
            <form id="verifyForm">
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
                    <textarea id="verifyNotes" rows="4" placeholder="Tambahkan catatan jika diperlukan">${realisasi.notes || ''}</textarea>
                </div>
                <button type="submit" class="btn">💾 Simpan Verifikasi</button>
            </form>
        </div>
    `;
    
    modal.classList.add('active');
    
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
            
            // ✅ STEP 1: Invalidate cache yang terkait
            console.log('[VERIFY_REALISASI] Invalidating related cache');
            invalidateCache('verifikasi');     // Hapus cache verifikasi
            invalidateCache('realisasis');     // Hapus cache realisasi (untuk operator)
            invalidateCache('dashboardStats'); // Hapus cache dashboard
            
            // ✅ STEP 2: Tutup modal
            closeModal();
            
            // ✅ STEP 3: Reload dengan FORCE REFRESH
            console.log('[VERIFY_REALISASI] Reloading fresh data');
            await loadVerifikasi(true);        // Force refresh verifikasi page
            await loadDashboardStats(true);    // Force refresh dashboard
            
            // ✅ STEP 4: Notifikasi
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
    
    const modal = document.getElementById('modal');
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
                        ${CONFIG.KUA_LIST.map(kua => `
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
        const monthIndexA = CONFIG.MONTHS.indexOf(a.month);
        const monthIndexB = CONFIG.MONTHS.indexOf(b.month);
        return monthIndexA - monthIndexB;
    });
}

function getDrivePreviewUrl(fileUrl, mimeType) {
    console.log('[PREVIEW] Getting preview URL for:', fileUrl, mimeType);
    
    // Extract file ID from Google Drive URL
    let fileId = null;
    
    // Try different URL patterns
    const patterns = [
        /\/d\/([a-zA-Z0-9_-]+)/,  // /d/FILE_ID
        /id=([a-zA-Z0-9_-]+)/,     // id=FILE_ID
        /\/file\/d\/([a-zA-Z0-9_-]+)/, // /file/d/FILE_ID
        /open\?id=([a-zA-Z0-9_-]+)/, // open?id=FILE_ID
    ];
    
    for (const pattern of patterns) {
        const match = fileUrl.match(pattern);
        if (match) {
            fileId = match[1];
            break;
        }
    }
    
    if (!fileId) {
        console.warn('[PREVIEW] Could not extract file ID from URL');
        return fileUrl;
    }
    
    console.log('[PREVIEW] Extracted file ID:', fileId);
    
    // Return appropriate URL based on file type
    if (mimeType && mimeType.startsWith('image/')) {
        // For images, use direct Google Drive thumbnail/view
        // Using thumbnailLink would be better but we use uc?export=view as fallback
        return `https://lh3.googleusercontent.com/d/${fileId}`;
    } else if (mimeType === 'application/pdf') {
        // For PDFs, use embedded viewer
        return `https://drive.google.com/file/d/${fileId}/preview`;
    } else {
        // For other files
        return `https://drive.google.com/file/d/${fileId}/view`;
    }
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

async function downloadFile(url, filename) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(link.href);
    } catch (error) {
        console.error('[DOWNLOAD ERROR]', error);
        // Fallback to opening in new tab
        window.open(url, '_blank');
    }
}

function closeModal() {
    console.log('[MODAL] Closing modal');
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.remove('active');
        modal.innerHTML = '';
    }
}

// Click outside modal to close
window.addEventListener('load', function() {
    const modal = document.getElementById('modal');
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
    
    const kuaOptions = CONFIG.KUA_LIST.map(kua => 
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
        const result = await apiCall('exportRPDDetailAllYear', {
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
        const result = await apiCall('exportRealisasiDetailAllYear', {
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