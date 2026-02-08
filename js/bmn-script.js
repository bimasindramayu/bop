// ===== BMN SCRIPT =====
// File: bmn-script.js
// Untuk: bmn-dashboard.html
// Config & utilities dari config.js

// ===== STATE MANAGEMENT =====
let currentUser = null;
let currentBMNData = [];
let allBMNData = [];
let uploadedPhotos = [];
let editingBMNId = null;
let bmnKondisiChart = null;

// Cache untuk BMN
const bmnCache = {
    stats: null,
    data: null,
    lastUpdate: null
};

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', function() {
    debugLog('BMN', 'Initializing BMN Dashboard');
    
    currentUser = SessionManager.getCurrentUser();
    
    if (!currentUser) {
        debugLog('BMN', 'No user session, redirecting to login');
        window.location.href = 'index.html';
        return;
    }
    
    initBMNDashboard();
});

function initBMNDashboard() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('[INIT] Initializing BMN Dashboard');
    console.log('[INIT] Current User:', currentUser);
    console.log('═══════════════════════════════════════════════════════');
    
    debugLog('INIT', 'Initializing BMN Dashboard');
    
    document.getElementById('userNameDisplay').textContent = currentUser.name;
    document.getElementById('userRoleDisplay').textContent = 
        currentUser.role + (currentUser.kua ? ' - ' + currentUser.kua : '');
    
    renderNavMenu();
    navigateTo('dashboardPage');
    loadBMNDashboardStats();
    
    // Force initial column setup
    setTimeout(() => {
        controlColumnVisibility();
    }, 100);
}

// Helper function to control column visibility
function controlColumnVisibility() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('[COLUMN CONTROL] Forcing column visibility update');
    console.log('[COLUMN CONTROL] Current Role:', currentUser.role);
    
    const isAdmin = currentUser.role === 'Admin';
    const isKUA = currentUser.role.includes('KUA'); // Support "KUA", "Operator KUA", etc.
    
    console.log('[COLUMN CONTROL] Role contains KUA:', isKUA);
    
    // Control foto column in header
    const thFotoElements = document.querySelectorAll('.th-foto');
    console.log('[COLUMN CONTROL] Found th-foto elements:', thFotoElements.length);
    
    const shouldHideFoto = isAdmin || isKUA;
    console.log('[COLUMN CONTROL] Should hide foto column:', shouldHideFoto);
    
    thFotoElements.forEach((el, idx) => {
        if (shouldHideFoto) {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.classList.add('hidden-column');
        } else {
            el.style.display = 'table-cell';
            el.style.visibility = 'visible';
            el.classList.remove('hidden-column');
        }
        console.log(`[COLUMN CONTROL] Element ${idx} updated:`, {
            display: el.style.display,
            visibility: el.style.visibility,
            hasHiddenClass: el.classList.contains('hidden-column')
        });
    });
    
    // Control KUA column
    const thKuaElements = document.querySelectorAll('.th-kua');
    thKuaElements.forEach((el, idx) => {
        el.style.display = isAdmin ? 'table-cell' : 'none';
        console.log(`[COLUMN CONTROL] KUA column ${idx}: display = ${el.style.display}`);
    });
    
    console.log('[COLUMN CONTROL] Column visibility control completed');
    console.log('═══════════════════════════════════════════════════════');
}

function renderNavMenu() {
    const navMenu = document.getElementById('navMenu');
    const isAdmin = currentUser.role === 'Admin';
    
    const menuItems = [
        { id: 'dashboardPage', label: '📊 Dashboard', show: true },
        { id: 'dataBMNPage', label: '📋 Data BMN', show: true },
        { id: 'laporanBMNPage', label: '📑 Laporan', show: true },
        { id: 'riwayatPage', label: '🕒 Riwayat', show: true },
        { id: 'masterDataPage', label: '⚙️ Master Data', show: isAdmin }
    ];
    
    navMenu.innerHTML = `
        <ul>
            ${menuItems.filter(item => item.show).map(item => `
                <li>
                    <button onclick="navigateTo('${item.id}')">${item.label}</button>
                </li>
            `).join('')}
        </ul>
    `;
}

function navigateTo(pageId) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('[NAVIGATION] START - Navigating to:', pageId);
    console.log('[NAVIGATION] Current User:', currentUser);
    console.log('[NAVIGATION] Role:', currentUser.role);
    console.log('═══════════════════════════════════════════════════════');
    
    debugLog('NAVIGATION', `Navigating to: ${pageId}`);
    
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-menu button').forEach(btn => btn.classList.remove('active'));
    
    const targetPage = document.getElementById(pageId);
    const targetBtn = document.querySelector(`button[onclick="navigateTo('${pageId}')"]`);
    
    if (targetPage) targetPage.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
    
    // Use the helper function for column visibility
    controlColumnVisibility();
    
    const filterKUA = document.getElementById('filterKUA');
    const riwayatKUA = document.getElementById('riwayatKUA');
    
    const isAdmin = currentUser.role === 'Admin';
    
    if (filterKUA) filterKUA.style.display = isAdmin ? 'inline-block' : 'none';
    if (riwayatKUA) riwayatKUA.style.display = isAdmin ? 'inline-block' : 'none';
    
    const btnTambahBMN = document.getElementById('btnTambahBMN');
    if (btnTambahBMN) {
        btnTambahBMN.style.display = isAdmin ? 'none' : 'inline-block';
    }
    
    console.log('[NAVIGATION] END - Page controls updated');
    console.log('═══════════════════════════════════════════════════════');
    
    if (pageId === 'dashboardPage') {
        loadBMNDashboardStats();
    } else if (pageId === 'dataBMNPage') {
        loadBMNData();
    } else if (pageId === 'laporanBMNPage') {
        loadLaporanOptions();
    } else if (pageId === 'riwayatPage') {
        loadRiwayat();
    } else if (pageId === 'masterDataPage' && isAdmin) {
        loadMasterData();
    }
}

async function loadBMNDashboardStats() {
    debugLog('DASHBOARD', 'Loading dashboard stats');
    
    try {
        const filters = {
            role: currentUser.role,
            kua: currentUser.role === 'Admin' ? '' : currentUser.kua
        };
        
        const stats = await apiCall('getBMNStats', filters);
        debugLog('DASHBOARD', 'Stats loaded from API', stats);
        
        displayDashboardStats(stats);
    } catch (error) {
        debugLog('DASHBOARD ERROR', error.message, error);
        console.error('[BMN ERROR]', error);
        showNotification('Gagal memuat statistik', 'error');
    }
}

function displayDashboardStats(stats) {
    debugLog('DASHBOARD', 'Displaying stats', stats);
    
    const safeStats = {
        totalBMN: stats.totalBMN || 0,
        kondisiBaik: stats.kondisiBaik || 0,
        rusakRingan: stats.rusakRingan || 0,
        rusakBerat: stats.rusakBerat || 0,
        menungguVerifikasi: stats.menungguVerifikasi || 0
    };
    
    debugLog('DASHBOARD', 'Safe stats with defaults', safeStats);
    
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = `
        <div class="stat-card">
            <h3>Total BMN</h3>
            <div class="value">${safeStats.totalBMN}</div>
        </div>
        <div class="stat-card success">
            <h3>Kondisi Baik</h3>
            <div class="value">${safeStats.kondisiBaik}</div>
        </div>
        <div class="stat-card warning">
            <h3>Rusak Ringan</h3>
            <div class="value">${safeStats.rusakRingan}</div>
        </div>
        <div class="stat-card danger">
            <h3>Rusak Berat</h3>
            <div class="value">${safeStats.rusakBerat}</div>
        </div>
    `;
    
    renderKondisiChart(safeStats);
}

function renderKondisiChart(stats) {
    debugLog('CHART', 'Rendering kondisi chart', stats);
    
    const canvas = document.getElementById('kondisiChart');
    if (!canvas) {
        debugLog('CHART ERROR', 'Canvas element not found');
        console.error('[CHART ERROR] Canvas element #kondisiChart not found');
        return;
    }
    
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        debugLog('CHART ERROR', 'Chart.js library not loaded');
        console.error('[CHART ERROR] Chart.js library is not loaded. Please check CDN link.');
        
        // Show error message on canvas
        const ctx = canvas.getContext('2d');
        ctx.font = '14px Arial';
        ctx.fillStyle = '#dc3545';
        ctx.textAlign = 'center';
        ctx.fillText('Chart.js library tidak ditemukan', canvas.width / 2, canvas.height / 2);
        ctx.fillText('Periksa koneksi internet dan CDN link', canvas.width / 2, canvas.height / 2 + 20);
        return;
    }
    
    debugLog('CHART', 'Chart.js loaded successfully, version:', Chart.version);
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (window.bmnKondisiChart) {
        debugLog('CHART', 'Destroying existing chart');
        window.bmnKondisiChart.destroy();
    }
    
    const totalData = (stats.kondisiBaik || 0) + (stats.rusakRingan || 0) + (stats.rusakBerat || 0);
    
    if (totalData === 0) {
        debugLog('CHART', 'No data to display, showing empty state message');
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (canvas.width < 200) {
            canvas.width = 400;
            canvas.height = 300;
        }
        
        ctx.font = '16px Arial';
        ctx.fillStyle = '#999';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Belum ada data kondisi BMN', canvas.width / 2, canvas.height / 2 - 20);
        
        ctx.font = '13px Arial';
        ctx.fillStyle = '#bbb';
        ctx.fillText('Silakan tambahkan data BMN dengan kondisi yang valid:', canvas.width / 2, canvas.height / 2 + 5);
        
        ctx.font = '12px Arial';
        ctx.fillStyle = '#ccc';
        ctx.fillText('"Baik", "Rusak Ringan", atau "Rusak Berat"', canvas.width / 2, canvas.height / 2 + 25);
        
        return;
    }
    
    const chartData = {
        labels: ['Baik', 'Rusak Ringan', 'Rusak Berat'],
        datasets: [{
            data: [
                stats.kondisiBaik || 0,
                stats.rusakRingan || 0,
                stats.rusakBerat || 0
            ],
            backgroundColor: [
                '#28a745',  // Green for Baik
                '#ffc107',  // Yellow for Rusak Ringan
                '#dc3545'   // Red for Rusak Berat
            ],
            borderWidth: 2,
            borderColor: '#fff'
        }]
    };
    
    debugLog('CHART', 'Chart data prepared', chartData);
    
    try {
        window.bmnKondisiChart = new Chart(ctx, {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
        debugLog('CHART', 'Chart rendered successfully');
    } catch (error) {
        debugLog('CHART ERROR', 'Failed to create chart', error);
        console.error('[CHART ERROR]', error);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (canvas.width < 200) {
            canvas.width = 400;
            canvas.height = 300;
        }
        
        ctx.font = '14px Arial';
        ctx.fillStyle = '#dc3545';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Gagal membuat grafik', canvas.width / 2, canvas.height / 2 - 10);
        
        ctx.font = '12px Arial';
        ctx.fillStyle = '#999';
        ctx.fillText(error.message, canvas.width / 2, canvas.height / 2 + 10);
    }
}

// PERBAIKAN #1: Load data sekali, filter menggunakan cache
async function loadBMNData(forceReload = false) {
    debugLog('DATA', 'Loading BMN data');
    
    try {
        // Only fetch from server on initial load or force reload
        if (!allBMNData.length || forceReload) {
            const filters = {
                kua: currentUser.role === 'Admin' ? '' : currentUser.kua,
                jenis: '',
                kondisi: '',
                status: ''
            };

            const data = await apiCall('getBMNData', filters);
            debugLog('DATA', `Loaded ${data.length} BMN records (${data.length})`, data);
            
            allBMNData = data;
            currentBMNData = data;
            updateCache(CACHE_CONFIG.KEYS.DATA, data);
        } else {
            debugLog('DATA', 'Using cached data');
        }
        
        // Apply client-side filters
        applyFilters();
        
    } catch (error) {
        debugLog('DATA ERROR', error.message, error);
        console.error('[BMN ERROR]', error);
        showNotification('Gagal memuat data BMN', 'error');
    }
}

// PERBAIKAN #2: Filter kondisi & status bekerja dengan baik
function applyFilters() {
    const filterJenis = document.getElementById('filterJenis')?.value || '';
    const filterKondisi = document.getElementById('filterKondisi')?.value || '';
    const filterStatus = document.getElementById('filterStatus')?.value || '';
    const searchTerm = document.getElementById('searchBMN')?.value.toLowerCase() || '';
    
    debugLog('FILTER', 'Applying filters', { filterJenis, filterKondisi, filterStatus, searchTerm });
    
    let filteredData = [...allBMNData];
    
    // Filter by jenis
    if (filterJenis) {
        filteredData = filteredData.filter(bmn => bmn.jenis === filterJenis);
    }
    
    // Filter by kondisi
    if (filterKondisi) {
        filteredData = filteredData.filter(bmn => bmn.kondisi === filterKondisi);
    }
    
    // Filter by status
    if (filterStatus) {
        filteredData = filteredData.filter(bmn => bmn.status === filterStatus);
    }
    
    // Filter by search term
    if (searchTerm) {
        filteredData = filteredData.filter(bmn => 
            bmn.kodeBarang.toLowerCase().includes(searchTerm) ||
            bmn.namaBarang.toLowerCase().includes(searchTerm)
        );
    }
    
    currentBMNData = filteredData;
    displayBMNData(filteredData);
}

function displayBMNData(data) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('[DISPLAY BMN] START - Displaying data');
    console.log('[DISPLAY BMN] Total records:', data.length);
    console.log('[DISPLAY BMN] Current User Role:', currentUser.role);
    console.log('═══════════════════════════════════════════════════════');
    
    debugLog('DATA', `Displaying ${data.length} BMN records`);
    
    const tbody = document.querySelector('#bmnTable tbody');
    
    // Check role conditions - FLEXIBLE KUA CHECK
    const isAdmin = currentUser.role === 'Admin';
    const isKUA = currentUser.role.includes('KUA'); // Support "KUA", "Operator KUA", etc.
    const shouldShowFotoColumn = !isAdmin && !isKUA;
    const shouldShowEditInTable = !isAdmin && !isKUA;
    
    console.log('[DISPLAY BMN] Role Checks:', {
        isAdmin,
        isKUA,
        roleString: currentUser.role,
        shouldShowFotoColumn,
        shouldShowEditInTable
    });
    
    tbody.innerHTML = data.map((bmn, index) => {
        let kondisiClass = 'success';
        if (bmn.kondisi === 'Rusak Ringan') kondisiClass = 'warning';
        if (bmn.kondisi === 'Rusak Berat') kondisiClass = 'danger';
        
        const hasFoto = bmn.fotos && Array.isArray(bmn.fotos) && bmn.fotos.length > 0;
        
        debugLog('DATA', `BMN #${index + 1}: ${bmn.kodeBarang}`, {
            hasFoto,
            fotoCount: hasFoto ? bmn.fotos.length : 0,
            fotos: bmn.fotos
        });
        
        // Log for first row to debug
        if (index === 0) {
            console.log('[DISPLAY BMN] First row rendering:', {
                kodeBarang: bmn.kodeBarang,
                willShowKUAColumn: isAdmin,
                willShowFotoColumn: shouldShowFotoColumn,
                willShowEditButton: shouldShowEditInTable
            });
        }
        
        return `
        <tr>
            <td>${index + 1}</td>
            ${isAdmin ? `<td>${bmn.kua}</td>` : ''}
            <td>${bmn.kodeBarang}</td>
            <td>${bmn.namaBarang}</td>
            <td>${bmn.jenis}</td>
            <td>${bmn.tahunPerolehan}</td>
            <td><span class="badge badge-${kondisiClass}">${bmn.kondisi}</span></td>
            <td><span class="badge badge-info">${bmn.status}</span></td>
            ${shouldShowFotoColumn ? `
            <td>
                ${hasFoto ? 
                    `<button class="btn btn-sm btn-info" onclick='viewBMNPhotos(${JSON.stringify(bmn).replace(/'/g, "&apos;")})'>
                        📷 ${bmn.fotos.length} Foto
                    </button>` 
                    : '<span style="color: #999;">-</span>'}
            </td>
            ` : ''}
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm" onclick='viewBMN(${JSON.stringify(bmn).replace(/'/g, "&apos;")})'>👁️ Detail</button>
                    ${shouldShowEditInTable ? 
                        `<button class="btn btn-sm btn-info" onclick='editBMN(${JSON.stringify(bmn).replace(/'/g, "&apos;")})'>✏️ Edit</button>` 
                        : ''}
                </div>
            </td>
        </tr>
        `;
    }).join('');
    
    console.log('[DISPLAY BMN] Table rows rendered:', data.length);
    console.log('[DISPLAY BMN] END');
    console.log('═══════════════════════════════════════════════════════');
}

function searchBMN() {
    applyFilters();
}

function generateKodeBarang(kua, jenis) {
    const kuaCode = APP_CONFIG.BMN.KUA_CODES[kua] || '00';
    
    const jenisCode = {
        'Tanah': '01',
        'Gedung/Bangunan': '02',
        'Kendaraan': '03',
        'Peralatan & Mesin': '04',
        'Aset Lainnya': '05'
    }[jenis] || '00';
    
    let maxNum = 0;
    const prefix = `${kuaCode}-${jenisCode}-`;
    
    currentBMNData.forEach(bmn => {
        if (bmn.kodeBarang.startsWith(prefix)) {
            const num = parseInt(bmn.kodeBarang.split('-')[2]);
            if (num > maxNum) maxNum = num;
        }
    });
    
    const nextNum = String(maxNum + 1).padStart(4, '0');
    const generatedCode = `${prefix}${nextNum}`;
    
    debugLog('KODE', `Generated kode barang: ${generatedCode}`, {
        kua, jenis, kuaCode, jenisCode, maxNum, nextNum
    });
    
    return generatedCode;
}

function showBMNModal(bmn = null) {
    const modal = document.getElementById('modal');
    const isEdit = bmn !== null;
    
    uploadedPhotos = isEdit && bmn.fotos ? [...bmn.fotos] : [];
    
    debugLog('MODAL', isEdit ? 'Edit mode' : 'Add mode', {
        isEdit,
        bmn,
        uploadedPhotos
    });
    
    const kodeBarang = isEdit ? bmn.kodeBarang : '';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h3>${isEdit ? 'Edit' : 'Tambah'} BMN</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            
            <form id="bmnForm">
                <input type="hidden" id="bmnId" value="${isEdit ? bmn.id : ''}">
                
                <div class="form-group">
                    <label>Kode Barang</label>
                    <input type="text" id="kodeBarang" value="${kodeBarang}" readonly 
                        style="background: #f8f9fa; cursor: not-allowed;">
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="form-group">
                        <label>Jenis BMN *</label>
                        <select id="jenisBMN" required onchange="updateKodeBarang()" ${isEdit ? 'disabled' : ''}>
                            <option value="">Pilih Jenis</option>
                            ${APP_CONFIG.BMN.JENIS_BMN.map(jenis => `
                                <option value="${jenis}" ${isEdit && bmn.jenis === jenis ? 'selected' : ''}>
                                    ${jenis}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Nama Barang *</label>
                        <input type="text" id="namaBarang" required 
                            value="${isEdit ? bmn.namaBarang : ''}">
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="form-group">
                        <label>Tahun Perolehan *</label>
                        <input type="number" id="tahunPerolehan" required min="1900" max="2100"
                            value="${isEdit ? bmn.tahunPerolehan : new Date().getFullYear()}">
                    </div>
                    
                    <div class="form-group">
                        <label>Sumber Perolehan</label>
                        <select id="sumberPerolehan">
                            <option value="">Pilih Sumber</option>
                            ${APP_CONFIG.BMN.SUMBER_PEROLEHAN.map(sumber => `
                                <option value="${sumber}" ${isEdit && bmn.sumberPerolehan === sumber ? 'selected' : ''}>
                                    ${sumber}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="form-group">
                        <label>Kondisi *</label>
                        <select id="kondisi" required>
                            <option value="">Pilih Kondisi</option>
                            ${APP_CONFIG.BMN.KONDISI_BMN.map(kondisi => `
                                <option value="${kondisi}" ${isEdit && bmn.kondisi === kondisi ? 'selected' : ''}>
                                    ${kondisi}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Status Penggunaan *</label>
                        <select id="statusPenggunaan" required>
                            <option value="">Pilih Status</option>
                            ${APP_CONFIG.BMN.STATUS_BMN.map(status => `
                                <option value="${status}" ${isEdit && bmn.status === status ? 'selected' : ''}>
                                    ${status}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Lokasi Barang *</label>
                    <input type="text" id="lokasiBarang" required placeholder="Contoh: Ruang Kepala KUA"
                        value="${isEdit ? bmn.lokasiBarang : ''}">
                </div>
                
                <div class="form-group">
                    <label>ID BMN (Nomor Registrasi)</label>
                    <input type="text" id="idBMN" placeholder="Contoh: 12345678"
                        value="${isEdit ? (bmn.idBMN || '') : ''}">
                </div>
                
                <div class="form-group">
                    <label>Keterangan</label>
                    <textarea id="keterangan" rows="3" placeholder="Keterangan tambahan...">${isEdit ? (bmn.keterangan || '') : ''}</textarea>
                </div>
                
                <div class="form-group">
                    <label>Foto BMN (Maks ${APP_CONFIG.BMN.MAX_PHOTOS} foto, ${APP_CONFIG.BMN.MAX_PHOTO_SIZE / 1024 / 1024}MB/foto)</label>
                    <div class="camera-upload">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('photoInput').click()">
                            📷 Pilih Foto
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="openCamera()">
                            📸 Ambil Foto
                        </button>
                    </div>
                    <input type="file" id="photoInput" accept="image/*" multiple style="display: none;" onchange="handlePhotoUpload(event)">
                    <input type="file" id="cameraInput" accept="image/*" capture="camera" style="display: none;" onchange="handlePhotoUpload(event)">
                    <div id="photoGallery" class="bmn-photo-gallery" style="margin-top: 15px;"></div>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    <button type="button" class="btn btn-secondary" onclick="_cancelBMNEdit()">Batal</button>
                    <button type="submit" class="btn btn-success" style="flex: 1;">💾 Simpan</button>
                </div>
            </form>
        </div>
    `;
    
    modal.classList.add('active');
    
    if (!isEdit) {
        updateKodeBarang();
    }
    
    displayPhotoGallery();
    
    document.getElementById('bmnForm').onsubmit = async (e) => {
        e.preventDefault();
        await saveBMN(bmn);
    };
}

function updateKodeBarang() {
    const jenis = document.getElementById('jenisBMN').value;
    if (jenis) {
        const kode = generateKodeBarang(currentUser.kua, jenis);
        document.getElementById('kodeBarang').value = kode;
    }
}

function openCamera() {
    document.getElementById('cameraInput').click();
}

async function handlePhotoUpload(event) {
    const files = event.target.files;
    
    if (!files || files.length === 0) return;
    
    if (uploadedPhotos.length + files.length > APP_CONFIG.BMN.MAX_PHOTOS) {
        showNotification(`Maksimal ${APP_CONFIG.BMN.MAX_PHOTOS} foto`, 'warning');
        return;
    }
    
    for (let file of files) {
        if (file.size > APP_CONFIG.BMN.MAX_PHOTO_SIZE) {
            showNotification(`Ukuran ${file.name} terlalu besar (maks ${APP_CONFIG.BMN.MAX_PHOTO_SIZE / 1024 / 1024}MB)`, 'warning');
            continue;
        }
        
        try {
            showLoading();
            const base64 = await fileToBase64(file);
            
            const photoData = {
                fileName: file.name,
                fileData: base64,
                fileSize: file.size,
                mimeType: file.type,
                kua: currentUser.kua,
                kodeBarang: document.getElementById('kodeBarang').value
            };
            
            const result = await apiCall('uploadBMNPhoto', photoData);
            
            uploadedPhotos.push({
                fileId: result.fileId,
                fileUrl: result.fileUrl,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type
            });
            
            hideLoading();
            displayPhotoGallery();
        } catch (error) {
            hideLoading();
            console.error('[PHOTO ERROR]', error);
            showNotification(`Gagal upload ${file.name}`, 'error');
        }
    }
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function displayPhotoGallery() {
    const gallery = document.getElementById('photoGallery');
    
    if (!uploadedPhotos || uploadedPhotos.length === 0) {
        gallery.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">Belum ada foto</p>';
        return;
    }
    
    gallery.innerHTML = uploadedPhotos.map((foto, index) => {
        const previewUrl = getPhotoPreviewUrl(foto);
        
        return `
        <div class="photo-item">
            <img src="${previewUrl}" alt="${foto.fileName}">
            <button type="button" class="remove-photo" onclick="removePhoto(${index})">×</button>
        </div>
        `;
    }).join('');
}

function getPhotoPreviewUrl(foto) {
    if (!foto || !foto.fileId) {
        console.warn('[PHOTO URL] Missing fileId:', foto);
        return '';
    }
    
    const strategies = [
        `https://drive.google.com/thumbnail?id=${foto.fileId}&sz=w400`,
        `https://drive.google.com/uc?export=view&id=${foto.fileId}`,
        foto.fileUrl
    ];
    
    const selectedUrl = strategies[0];
    
    debugLog('PHOTO URL', 'Generated preview URL', {
        fileId: foto.fileId,
        fileName: foto.fileName,
        selectedUrl,
        allStrategies: strategies
    });
    
    return selectedUrl;
}

function removePhoto(index) {
    if (confirm('Hapus foto ini?')) {
        debugLog('PHOTO', `Removing photo #${index}`);
        uploadedPhotos.splice(index, 1);
        displayPhotoGallery();
    }
}

async function saveBMN(existingBMN) {
    const formData = {
        id: document.getElementById('bmnId').value || null,
        kua: currentUser.kua,
        kodeBarang: document.getElementById('kodeBarang').value,
        namaBarang: document.getElementById('namaBarang').value,
        jenis: document.getElementById('jenisBMN').value,
        tahunPerolehan: document.getElementById('tahunPerolehan').value,
        sumberPerolehan: document.getElementById('sumberPerolehan').value,
        kondisi: document.getElementById('kondisi').value,
        status: document.getElementById('statusPenggunaan').value,
        lokasiBarang: document.getElementById('lokasiBarang').value,
        idBMN: document.getElementById('idBMN').value,
        keterangan: document.getElementById('keterangan').value,
        fotos: uploadedPhotos,
        statusVerifikasi: 'Diverifikasi',
        username: currentUser.username
    };
    
    debugLog('SAVE', 'Saving BMN', formData);
    
    try {
        showLoading();
        const result = await apiCall('saveBMN', formData);
        hideLoading();
        
        debugLog('SAVE', 'BMN saved successfully', result);
        showNotification('Data BMN berhasil disimpan', 'success');
        closeModal();
        
        clearCache();
        allBMNData = []; // Clear to force reload
        loadBMNData(true);
        loadBMNDashboardStats();
    } catch (error) {
        debugLog('SAVE ERROR', error.message, error);
        hideLoading();
        showNotification(error.message, 'error');
    }
}

// PERBAIKAN #3: Detail BMN dengan tampilan yang lebih baik dan informatif
// PERBAIKAN #5: Untuk role KUA, button Edit ada di dalam modal Detail
function viewBMN(bmn) {
    console.log('═══════════════════════════════════════════════════════');
    console.log('[VIEW BMN] Opening detail modal');
    console.log('[VIEW BMN] Current User Role:', currentUser.role);
    console.log('[VIEW BMN] BMN Data:', bmn);
    
    debugLog('VIEW', 'Viewing BMN detail', bmn);
    
    const modal = document.getElementById('modal');
    const isKUA = currentUser.role.includes('KUA'); // Support "KUA", "Operator KUA", etc.
    
    console.log('[VIEW BMN] Is KUA Role (contains KUA):', isKUA);
    console.log('[VIEW BMN] Will show Edit button in modal:', isKUA);
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 1000px;">
            <div class="modal-header">
                <h3>Detail Barang Milik Negara</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            
            <!-- Header Card -->
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 25px; border-radius: 12px; color: white; margin-bottom: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h2 style="margin: 0 0 10px 0; font-size: 24px;">${bmn.namaBarang}</h2>
                        <div style="font-size: 18px; opacity: 0.9;">Kode: <strong>${bmn.kodeBarang}</strong></div>
                    </div>
                    <div style="text-align: right;">
                        <div style="background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; font-size: 14px; margin-bottom: 8px;">
                            ${bmn.jenis}
                        </div>
                        ${isKUA ? `
                        <button class="btn btn-sm btn-info" onclick='_editBMNFromDetail(${JSON.stringify(bmn).replace(/'/g, "&apos;")})' 
                            style="margin-top: 8px;">
                            ✏️ Edit Data
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
            
            <!-- Info Grid -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 25px;">
                <!-- Informasi Umum -->
                <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; border-left: 4px solid #667eea;">
                    <h4 style="margin: 0 0 15px 0; color: #667eea; font-size: 16px;">📋 Informasi Umum</h4>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 3px;">Tahun Perolehan</div>
                            <div style="font-size: 15px; font-weight: 600; color: #333;">${bmn.tahunPerolehan}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 3px;">Sumber Perolehan</div>
                            <div style="font-size: 15px; font-weight: 600; color: #333;">${bmn.sumberPerolehan || '-'}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Status & Kondisi -->
                <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; border-left: 4px solid #28a745;">
                    <h4 style="margin: 0 0 15px 0; color: #28a745; font-size: 16px;">🔧 Status & Kondisi</h4>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 3px;">Kondisi Barang</div>
                            <div>
                                <span style="display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 600; 
                                    background: ${bmn.kondisi === 'Baik' ? '#d4edda' : bmn.kondisi === 'Rusak Ringan' ? '#fff3cd' : '#f8d7da'};
                                    color: ${bmn.kondisi === 'Baik' ? '#155724' : bmn.kondisi === 'Rusak Ringan' ? '#856404' : '#721c24'};">
                                    ${bmn.kondisi}
                                </span>
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 3px;">Status Penggunaan</div>
                            <div>
                                <span style="display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 600; background: #d1ecf1; color: #0c5460;">
                                    ${bmn.status}
                                </span>
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 3px;">Lokasi</div>
                            <div style="font-size: 15px; font-weight: 600; color: #333;">📍 ${bmn.lokasiBarang}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Identifikasi -->
                <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; border-left: 4px solid #ffc107;">
                    <h4 style="margin: 0 0 15px 0; color: #ffc107; font-size: 16px;">🏷️ Identifikasi</h4>
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 3px;">ID BMN / Nomor Registrasi</div>
                            <div style="font-size: 15px; font-weight: 600; color: #333;">${bmn.idBMN || 'Belum ada'}</div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 3px;">KUA</div>
                            <div style="font-size: 15px; font-weight: 600; color: #333;">${bmn.kua || currentUser.kua}</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Keterangan -->
            ${bmn.keterangan ? `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
                <h4 style="margin: 0 0 12px 0; color: #333; font-size: 16px;">📝 Keterangan</h4>
                <p style="margin: 0; color: #555; line-height: 1.6;">${bmn.keterangan}</p>
            </div>
            ` : ''}
            
            <!-- Foto BMN -->
            ${bmn.fotos && bmn.fotos.length > 0 ? `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 12px;">
                <h4 style="margin: 0 0 15px 0; color: #333; font-size: 16px;">📷 Dokumentasi Foto (${bmn.fotos.length} foto)</h4>
                <div id="detailPhotoGallery" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
                    ${bmn.fotos.map((foto, idx) => {
                        const previewUrl = getPhotoPreviewUrl(foto);
                        debugLog('DETAIL VIEW', `Photo #${idx + 1}`, { foto, previewUrl });
                        
                        return `
                        <div style="position: relative; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); background: white;">
                            <img src="${previewUrl}" 
                                 alt="${foto.fileName}"
                                 onclick="viewImageLightbox('${previewUrl}')"
                                 onerror="handleDetailImageError(this, ${idx}, '${foto.fileId}', '${foto.fileUrl}')"
                                 onload="console.log('[IMAGE LOADED] Photo ${idx + 1}')"
                                 style="cursor: pointer; width: 100%; height: 200px; object-fit: cover;">
                            <div style="padding: 8px; font-size: 11px; color: #666; background: white;">
                                ${foto.fileName}
                            </div>
                        </div>
                    `;
                    }).join('')}
                </div>
            </div>
            ` : `
            <div style="background: #f8f9fa; padding: 40px; border-radius: 12px; text-align: center;">
                <div style="font-size: 48px; margin-bottom: 10px; opacity: 0.3;">📷</div>
                <p style="color: #999; margin: 0;">Belum ada dokumentasi foto</p>
            </div>
            `}
            
            <div style="margin-top: 20px; text-align: right;">
                <button class="btn btn-secondary" onclick="closeModal()">Tutup</button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
    
    console.log('[VIEW BMN] Modal rendered and displayed');
    console.log('[VIEW BMN] Edit button included in modal:', isKUA);
    console.log('═══════════════════════════════════════════════════════');
}

// Edit dari tombol tabel langsung (bukan dari modal Detail)
function editBMN(bmn) {
    _editSourceBMN = null;
    closeModal();
    setTimeout(() => showBMNModal(bmn), 300);
}

// Edit dari tombol di DALAM modal Detail
function _editBMNFromDetail(bmn) {
    _editSourceBMN = bmn; // simpan → supaya Batal tahu harus kembali ke Detail
    closeModal();
    setTimeout(() => showBMNModal(bmn), 300);
}

// Tombol Batal di form edit/tambah
function _cancelBMNEdit() {
    if (_editSourceBMN) {
        const bmn = _editSourceBMN;
        _editSourceBMN = null;
        closeModal();
        setTimeout(() => viewBMN(bmn), 300); // kembali ke Detail
    } else {
        closeModal(); // tutup modal sepenuhnya
    }
}

function viewBMNPhotos(bmn) {
    debugLog('PHOTOS', 'Viewing BMN photos', bmn);
    
    const modal = document.getElementById('modal');
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <h3>Foto BMN - ${bmn.kodeBarang}</h3>
                <button class="close-btn" onclick="closeModal()">&times;</button>
            </div>
            
            <h4>${bmn.namaBarang}</h4>
            <p style="color: #666; margin-bottom: 20px;">${bmn.fotos.length} foto tersedia</p>
            
            <div class="bmn-photo-gallery">
                ${bmn.fotos.map((foto, idx) => {
                    const previewUrl = getPhotoPreviewUrl(foto);
                    
                    return `
                    <div class="photo-item">
                        <img src="${previewUrl}" 
                             alt="${foto.fileName}"
                             onclick="viewImageLightbox('${previewUrl}')"
                             onerror="handleImageError(this, ${idx}, '${foto.fileId}', '${foto.fileUrl}')"
                             style="cursor: pointer;">
                    </div>
                    `;
                }).join('')}
            </div>
            
            <div style="margin-top: 20px; text-align: right;">
                <button class="btn btn-secondary" onclick="closeModal()">Tutup</button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

function handleImageError(img, index, fileId, fileUrl) {
    debugLog('IMAGE ERROR', `Failed to load photo #${index + 1}`, { fileId, fileUrl });
    
    const strategies = [
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
        `https://drive.google.com/uc?export=view&id=${fileId}`,
        fileUrl
    ];
    
    const currentSrc = img.src;
    const currentIndex = strategies.indexOf(currentSrc);
    
    if (currentIndex < strategies.length - 1) {
        const nextUrl = strategies[currentIndex + 1];
        debugLog('IMAGE RETRY', `Trying strategy ${currentIndex + 2}`, nextUrl);
        img.src = nextUrl;
    } else {
        debugLog('IMAGE ERROR', 'All strategies failed', { fileId, currentSrc });
        img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="150" height="150"%3E%3Crect width="150" height="150" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-family="Arial" font-size="14"%3EGagal memuat%3C/text%3E%3C/svg%3E';
    }
}

function handleDetailImageError(img, index, fileId, fileUrl) {
    handleImageError(img, index, fileId, fileUrl);
}

function viewImageLightbox(imageUrl) {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox active';
    lightbox.innerHTML = `
        <span class="lightbox-close" onclick="this.parentElement.remove()">&times;</span>
        <img src="${imageUrl}" alt="Preview">
    `;
    lightbox.onclick = (e) => {
        if (e.target === lightbox) lightbox.remove();
    };
    document.body.appendChild(lightbox);
}

async function loadLaporanOptions() {
    const laporanKUA = document.getElementById('laporanKUA');
    const isAdmin = currentUser.role === 'Admin';
    const isKUA = currentUser.role.includes('KUA');

    if (isAdmin) {
        const kuaList = Object.keys(APP_CONFIG.BMN.KUA_CODES).sort();
        laporanKUA.innerHTML = '<option value="">Pilih KUA</option>' +
            kuaList.map(kua => `<option value="${kua}">${kua}</option>`).join('');
        laporanKUA.disabled = false;
    } else if (isKUA) {
        // Isi dropdown dengan KUA milik user saja, lalu disabled
        laporanKUA.innerHTML = `<option value="${currentUser.kua}">${currentUser.kua}</option>`;
        laporanKUA.value = currentUser.kua;
        laporanKUA.disabled = true;
        laporanKUA.style.background = '#f0f0f0';
        laporanKUA.style.cursor = 'not-allowed';
    }

    // Sembunyikan card laporan lain untuk Operator KUA (hanya "Laporan Per KUA" yang tetap)
    const cards = document.querySelectorAll('#laporanBMNPage > div > .summary-box');
    cards.forEach((card, idx) => {
        card.style.display = (isKUA && idx > 0) ? 'none' : '';
    });
}

// Helper: download file dari base64 yang dikembalikan backend
function _downloadBase64File(result) {
    const bytes = Uint8Array.from(atob(result.fileData), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: result.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function downloadLaporanKUA(format) {
    const kua = document.getElementById('laporanKUA').value;
    if (!kua) {
        showNotification('Pilih KUA terlebih dahulu', 'warning');
        return;
    }
    
    try {
        showLoading();
        const result = await apiCall('exportLaporanBMN', {
            type: 'perKUA',
            kua: kua,
            format: format
        });
        hideLoading();
        _downloadBase64File(result);
        showNotification('Laporan berhasil diunduh', 'success');
    } catch (error) {
        hideLoading();
        showNotification(error.message, 'error');
    }
}

async function downloadLaporanJenis(format) {
    const jenis = document.getElementById('laporanJenis').value;
    if (!jenis) {
        showNotification('Pilih jenis terlebih dahulu', 'warning');
        return;
    }
    
    try {
        showLoading();
        const result = await apiCall('exportLaporanBMN', {
            type: 'perJenis',
            jenis: jenis,
            format: format
        });
        hideLoading();
        _downloadBase64File(result);
        showNotification('Laporan berhasil diunduh', 'success');
    } catch (error) {
        hideLoading();
        showNotification(error.message, 'error');
    }
}

async function downloadLaporanKondisi(format) {
    const kondisi = document.getElementById('laporanKondisi').value;
    if (!kondisi) {
        showNotification('Pilih kondisi terlebih dahulu', 'warning');
        return;
    }
    
    try {
        showLoading();
        const result = await apiCall('exportLaporanBMN', {
            type: 'perKondisi',
            kondisi: kondisi,
            format: format
        });
        hideLoading();
        _downloadBase64File(result);
        showNotification('Laporan berhasil diunduh', 'success');
    } catch (error) {
        hideLoading();
        showNotification(error.message, 'error');
    }
}

async function downloadRekapRusak(format) {
    try {
        showLoading();
        const result = await apiCall('exportLaporanBMN', {
            type: 'rusak',
            format: format
        });
        hideLoading();
        _downloadBase64File(result);
        showNotification('Laporan berhasil diunduh', 'success');
    } catch (error) {
        hideLoading();
        showNotification(error.message, 'error');
    }
}

async function loadRiwayat() {
    try {
        const filters = {
            kua: currentUser.role === 'Admin' ? document.getElementById('riwayatKUA')?.value : currentUser.kua
        };
        
        const data = await apiCall('getBMNRiwayat', filters);
        displayRiwayat(data);
    } catch (error) {
        console.error('[RIWAYAT ERROR]', error);
        showNotification('Gagal memuat riwayat', 'error');
    }
}

function displayRiwayat(data) {
    const tbody = document.querySelector('#riwayatTable tbody');
    
    tbody.innerHTML = data.map((item, index) => {
        // API mengembalikan field "timestamp" (bukan "tanggal").
        // Google Sheets serialise Date ke epoch (number) saat dikirim lewat JSON.
        let tanggalStr = '-';
        const raw = item.timestamp || item.tanggal;
        if (raw) {
            const d = new Date(Number(raw) || raw);
            tanggalStr = isNaN(d.getTime()) ? String(raw) : d.toLocaleString('id-ID');
        }

        return `
        <tr>
            <td>${index + 1}</td>
            ${currentUser.role === 'Admin' ? `<td>${item.kua}</td>` : ''}
            <td>${item.kodeBarang}</td>
            <td>${item.namaBarang}</td>
            <td>${item.perubahan}</td>
            <td>${item.operator}</td>
            <td>${tanggalStr}</td>
        </tr>
        `;
    }).join('');
}

function searchRiwayat() {
    const searchTerm = document.getElementById('searchRiwayat').value.toLowerCase();
    const filteredData = bmnCache.riwayat.filter(item => 
        item.kodeBarang.toLowerCase().includes(searchTerm) ||
        item.namaBarang.toLowerCase().includes(searchTerm)
    );
    displayRiwayat(filteredData);
}

function loadMasterData() {
    const kuaList = Object.keys(APP_CONFIG.BMN.KUA_CODES).sort();
    const kuaListEl = document.getElementById('kuaList');
    
    kuaListEl.innerHTML = kuaList.map((kua, index) => `
        <div style="padding: 10px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #667eea;">
            <strong>${index + 1}. ${kua}</strong>
            <div style="font-size: 12px; color: #666;">Kode: ${APP_CONFIG.BMN.KUA_CODES[kua]}</div>
        </div>
    `).join('');
}

function saveMasterConfig() {
    showNotification('Konfigurasi disimpan', 'success');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

function formatCurrency(value) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(value);
}