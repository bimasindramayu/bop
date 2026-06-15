// ===== BMN SCRIPT =====
// File: bmn-script.js

// ===== STATE =====
let currentUser       = null;
let currentBMNData    = [];
let allBMNData        = [];
let uploadedPhotos    = [];    // sudah di-upload ke Drive
let pendingPhotoFiles = [];    // dipilih user, belum diupload
let _editSourceBMN    = null;
let _kuaSummaryActive = false; // true = tampilkan summary KUA, false = tampilkan tabel detail

const bmnCache  = {
    statsLoaded:   false,   // Dashboard stats
    dataLoaded:    false,   // Data BMN table
    configLoaded:  false    // Konfigurasi / bmnConfig
};
let _lastStats = null; // cache stats object untuk re-render instan
// Konfigurasi akses Operator KUA — satu toggle untuk Tambah & Edit
let bmnConfig = { allowDataEntry: true };

// ===== INIT =====
window.addEventListener('DOMContentLoaded', function () {
    currentUser = SessionManager.getCurrentUser();
    if (!currentUser) { window.location.href = 'index.html'; return; }
    initBMNDashboard();
});

async function initBMNDashboard() {
    document.getElementById('userNameDisplay').textContent = currentUser.name;
    document.getElementById('userRoleDisplay').textContent =
        currentUser.role + (currentUser.kua ? ' - ' + currentUser.kua : '');

    const filterKUAEl = document.getElementById('filterKUA');
    if (filterKUAEl) {
        APP_CONFIG.KUA_LIST.slice().sort().forEach(kua => {
            const opt = document.createElement('option');
            opt.value = kua; opt.textContent = kua;
            filterKUAEl.appendChild(opt);
        });
    }

    renderNavMenu();
    navigateTo('dashboardPage');

    const isAdmin = currentUser.role === 'Admin';

    // Semua data di-fetch paralel saat pertama kali masuk — tab switching jadi instan
    const initTasks = [
        initDocumentPreviewer(),   // mount previewer + ambil Drive API key
        _preloadStats(),           // Dashboard stats (semua role)
        preloadBMNData(),          // Tabel Data BMN (semua role)
        loadBMNSettings()          // Konfigurasi allowDataEntry (semua role)
    ];

    await Promise.all(initTasks);
}

// ===== DOCUMENT PREVIEWER =====
async function initDocumentPreviewer() {
    try {
        const cfg    = await apiCall('getBMNConfig', {});
        const apiKey = cfg.driveApiKey || '';
        window.docPreviewer = new DocumentPreviewer({
            ...MY_DP_CONFIG, googleDriveApiKey: apiKey, debug: false
        });
        window.docPreviewer.mount('body');
    } catch (e) {
        window.docPreviewer = new DocumentPreviewer({ ...MY_DP_CONFIG, debug: false });
        window.docPreviewer.mount('body');
    }
}

function openFilePreview(fileUrl, fileName) {
    if (!fileUrl) return;
    if (window.docPreviewer) {
        window.docPreviewer.open(fileUrl, fileName || 'Dokumen BMN');
    } else {
        window.open(fileUrl, '_blank');
    }
}

// ===== PRELOAD DATA =====
async function preloadBMNData() {
    if (allBMNData.length) return;
    try {
        const data = await apiCall('getBMNData', {
            kua: currentUser.role === 'Admin' ? '' : currentUser.kua
        });
        allBMNData = data; currentBMNData = data;
        bmnCache.dataLoaded = true;
    } catch (e) { /* silent — retry on tab switch */ }
}

// Preload stats (Dashboard) diam-diam saat init
async function _preloadStats() {
    if (bmnCache.statsLoaded) return;
    try {
        const stats = await apiCall('getBMNStats', {
            role: currentUser.role,
            kua:  currentUser.role === 'Admin' ? '' : currentUser.kua
        });
        bmnCache.statsLoaded = true;
        displayDashboardStats(stats);
    } catch (e) { /* silent — akan dicoba lagi saat klik tab Dashboard */ }
}

// ===== NAV MENU =====
function renderNavMenu() {
    const navMenu = document.getElementById('navMenu');
    const isAdmin = currentUser.role === 'Admin';
    const items = [
        { id: 'dashboardPage',    label: '📊 Dashboard',    show: true    },
        { id: 'dataBMNPage',      label: '📋 Data BMN',      show: true    },
        { id: 'konfigurasiPage',  label: '⚙️ Konfigurasi',   show: isAdmin }
    ];
    navMenu.innerHTML = `<ul>${
        items.filter(m => m.show).map(m =>
            `<li><button onclick="navigateTo('${m.id}')">${m.label}</button></li>`
        ).join('')
    }</ul>`;
}

function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-menu button').forEach(b => b.classList.remove('active'));

    const page = document.getElementById(pageId);
    const btn  = document.querySelector(`button[onclick="navigateTo('${pageId}')"]`);
    if (page) page.classList.add('active');
    if (btn)  btn.classList.add('active');

    // Saat meninggalkan dataBMNPage, restore toolbar & tabel (jaga konsistensi)
    if (pageId !== 'dataBMNPage') {
        const toolbar = document.querySelector('#dataBMNPage .toolbar');
        const table   = document.querySelector('#dataBMNPage .table-container');
        if (toolbar) toolbar.style.display = '';
        if (table)   table.style.display   = '';
    }

    controlColumnVisibility();

    const isKUA     = currentUser.role.includes('KUA');
    const filterKUA = document.getElementById('filterKUA');
    const isAdmin = currentUser.role === 'Admin';
    if (filterKUA) filterKUA.style.display = isAdmin ? 'inline-block' : 'none';

    const btnTambah = document.getElementById('btnTambahBMN');
    if (btnTambah) {
        // Admin tidak punya tombol Tambah; KUA hanya muncul jika config allow
        if (isAdmin) {
            btnTambah.style.display = 'none';
        } else if (isKUA) {
            btnTambah.style.display = bmnConfig.allowDataEntry ? 'inline-block' : 'none';
        }
    }

    // Tombol "Summary KUA" hanya untuk Admin — inject satu kali ke toolbar
    if (isAdmin) {
        const toolbar = document.querySelector('#dataBMNPage .toolbar');
        if (toolbar && !document.getElementById('btnSummaryKUA')) {
            const btn = document.createElement('button');
            btn.id        = 'btnSummaryKUA';
            btn.className = 'btn btn-sm';
            btn.style.cssText = 'background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;';
            btn.innerHTML = '📊 Summary KUA';
            btn.onclick   = () => _showKUASummary();
            toolbar.insertBefore(btn, toolbar.firstChild);
        }
    }

    if      (pageId === 'dashboardPage')   { if (!bmnCache.statsLoaded)  loadBMNDashboardStats(); else displayDashboardStats(_lastStats); }
    else if (pageId === 'dataBMNPage')     {
        const isAdmin = currentUser.role === 'Admin';
        if (!bmnCache.dataLoaded) {
            loadBMNData().then(() => {
                if (isAdmin && _kuaSummaryActive) renderKUASummary();
            });
        } else {
            if (isAdmin && _kuaSummaryActive) renderKUASummary();
            else applyFilters();
        }
    }
    else if (pageId === 'konfigurasiPage') { _renderKonfigurasiPage(); }
}

function controlColumnVisibility() {
    const isAdmin = currentUser.role === 'Admin';
    document.querySelectorAll('.th-kua').forEach(el => {
        el.style.display = isAdmin ? 'table-cell' : 'none';
    });
}

// ===== DASHBOARD STATS =====
async function loadBMNDashboardStats() {
    try {
        const stats = await apiCall('getBMNStats', {
            role: currentUser.role,
            kua:  currentUser.role === 'Admin' ? '' : currentUser.kua
        });
        bmnCache.statsLoaded = true;
        displayDashboardStats(stats);
    } catch (e) {
        showNotification('Gagal memuat statistik', 'error');
    }
}

function displayDashboardStats(stats) {
    if (!stats) return;
    _lastStats = stats; // simpan untuk re-render instan saat balik ke tab Dashboard
    const s = {
        total:     stats.totalBMN    || stats.totalBarang       || 0,
        baik:      stats.kondisiBaik || stats.barangBaik        || 0,
        ringan:    stats.rusakRingan || stats.barangRusakRingan || 0,
        berat:     stats.rusakBerat  || stats.barangRusakBerat  || 0,
        digunakan: stats.barangDigunakan || 0
    };

    const isAdmin = currentUser.role === 'Admin';

    // Hitung KUA yang sudah mengisi dari allBMNData (jika sudah di-load)
    let kuaCardHTML = '';
    if (isAdmin) {
        const kuaSudahIsi = _getKUASudahIsi();
        const totalKUA    = APP_CONFIG.KUA_LIST.length;
        const pct         = totalKUA ? Math.round((kuaSudahIsi / totalKUA) * 100) : 0;
        kuaCardHTML = `
        <div class="stat-card kua-filled" onclick="navigateTo('dataBMNPage');_showKUASummary();"
             style="cursor:pointer;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;
                    border:none;transition:transform .15s,box-shadow .15s;"
             onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(102,126,234,.4)'"
             onmouseout="this.style.transform='';this.style.boxShadow=''">
            <h3 style="color:#ffffffcc;">KUA Sudah Mengisi</h3>
            <div class="value" style="color:#fff;">${kuaSudahIsi} <span style="font-size:16px;font-weight:400;opacity:.8;">/ ${totalKUA}</span></div>
            <div style="margin-top:8px;">
                <div style="background:rgba(255,255,255,.25);border-radius:99px;height:6px;overflow:hidden;">
                    <div style="background:#fff;width:${pct}%;height:100%;border-radius:99px;transition:width .4s;"></div>
                </div>
                <div style="font-size:11px;margin-top:4px;opacity:.85;">${pct}% sudah mengisi &bull; Klik untuk lihat detail</div>
            </div>
        </div>`;
    }

    document.getElementById('statsGrid').innerHTML = `
        <div class="stat-card">
            <h3>Total BMN</h3><div class="value">${s.total}</div>
        </div>
        <div class="stat-card success">
            <h3>Kondisi Baik</h3><div class="value">${s.baik}</div>
        </div>
        <div class="stat-card warning">
            <h3>Rusak Ringan</h3><div class="value">${s.ringan}</div>
        </div>
        <div class="stat-card danger">
            <h3>Rusak Berat</h3><div class="value">${s.berat}</div>
        </div>
        <div class="stat-card info">
            <h3>Sedang Digunakan</h3><div class="value">${s.digunakan}</div>
        </div>
        ${kuaCardHTML}`;
    renderKondisiChart(s);
}

// Helper: jumlah KUA yang sudah punya minimal 1 data
function _getKUASudahIsi() {
    if (!allBMNData.length) return 0;
    return new Set(allBMNData.map(b => b.kua)).size;
}

function renderKondisiChart(s) {
    const canvas = document.getElementById('kondisiChart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (window.bmnKondisiChart) window.bmnKondisiChart.destroy();
    const total = s.baik + s.ringan + s.berat;
    if (!total) {
        const ctx = canvas.getContext('2d');
        canvas.width = Math.max(canvas.width, 400); canvas.height = 300;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '15px sans-serif'; ctx.fillStyle = '#bbb';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Belum ada data kondisi BMN', canvas.width / 2, canvas.height / 2);
        return;
    }
    window.bmnKondisiChart = new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Baik', 'Rusak Ringan', 'Rusak Berat'],
            datasets: [{
                data: [s.baik, s.ringan, s.berat],
                backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
                borderWidth: 2, borderColor: '#fff'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom', labels: { padding: 15, font: { size: 12 } } },
                tooltip: {
                    callbacks: {
                        label: c => {
                            const v = c.parsed, t = c.dataset.data.reduce((a,b) => a+b, 0);
                            return `${c.label}: ${v} (${t ? ((v/t)*100).toFixed(1) : 0}%)`;
                        }
                    }
                }
            }
        }
    });
}

// ===== DATA BMN =====
async function loadBMNData(forceReload = false) {
    try {
        if (!allBMNData.length || forceReload) {
            const data = await apiCall('getBMNData', {
                kua: currentUser.role === 'Admin' ? '' : currentUser.kua
            });
            allBMNData = data; currentBMNData = data;
            bmnCache.dataLoaded = true;
        }
        // Refresh KUA card di dashboard jika sudah ter-load
        if (currentUser.role === 'Admin' && _lastStats) displayDashboardStats(_lastStats);
        applyFilters();
    } catch (e) {
        showNotification('Gagal memuat data BMN', 'error');
    }
}

function applyFilters() {
    const fKUA     = document.getElementById('filterKUA')?.value     || '';
    const fJenis   = document.getElementById('filterJenis')?.value   || '';
    const fKondisi = document.getElementById('filterKondisi')?.value || '';
    const fStatus  = document.getElementById('filterStatus')?.value  || '';
    const q        = document.getElementById('searchBMN')?.value.toLowerCase() || '';

    let d = [...allBMNData];
    if (fKUA)     d = d.filter(b => b.kua     === fKUA);
    if (fJenis)   d = d.filter(b => b.jenis   === fJenis);
    if (fKondisi) d = d.filter(b => b.kondisi === fKondisi);
    if (fStatus)  d = d.filter(b => b.status  === fStatus);
    if (q)        d = d.filter(b =>
        b.kodeBarang.toLowerCase().includes(q) || b.namaBarang.toLowerCase().includes(q));

    currentBMNData = d;
    displayBMNData(d);
    _updateExportButtons(d.length);
}

function searchBMN() { applyFilters(); }

function displayBMNData(data) {
    const isAdmin = currentUser.role === 'Admin';
    const tbody   = document.querySelector('#bmnTable tbody');
    const cols    = isAdmin ? 9 : 8;

    if (!data.length) {
        tbody.innerHTML = `<tr><td colspan="${cols}" style="text-align:center;color:#999;padding:40px;">Tidak ada data BMN</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map((bmn, i) => {
        const kClass = bmn.kondisi === 'Baik' ? 'success' : bmn.kondisi === 'Rusak Ringan' ? 'warning' : 'danger';
        const sClass = bmn.status  === 'Digunakan' ? 'success' : bmn.status === 'Tidak Digunakan' ? 'warning' : 'danger';
        return `
        <tr>
            <td>${i + 1}</td>
            ${isAdmin ? `<td>${bmn.kua}</td>` : ''}
            <td><code style="font-size:12px;">${bmn.kodeBarang}</code></td>
            <td>${bmn.namaBarang}</td>
            <td>${bmn.jenis}</td>
            <td>${bmn.tahunPerolehan}</td>
            <td><span class="badge badge-${kClass}">${bmn.kondisi}</span></td>
            <td><span class="badge badge-${sClass}" style="font-size:11px;">${bmn.status}</span></td>
            <td>
                <button class="btn btn-sm" onclick='viewBMN(${JSON.stringify(bmn).replace(/'/g, "&apos;")})'>
                    👁️ Detail
                </button>
            </td>
        </tr>`;
    }).join('');
}

// ===== KUA SUMMARY (Admin only) =====

// Dipanggil dari card dashboard — aktifkan summary mode lalu navigasi
function _showKUASummary() {
    _kuaSummaryActive = true;
    renderKUASummary();
}

function renderKUASummary() {
    const isAdmin = currentUser.role === 'Admin';
    if (!isAdmin) return;

    // Sembunyikan toolbar tabel & tabel itu sendiri
    const toolbar = document.querySelector('#dataBMNPage .toolbar');
    const table   = document.querySelector('#dataBMNPage .table-container');
    if (toolbar) toolbar.style.display = 'none';
    if (table)   table.style.display   = 'none';

    // Buat / tampilkan container summary
    let summaryEl = document.getElementById('kuaSummaryContainer');
    if (!summaryEl) {
        summaryEl = document.createElement('div');
        summaryEl.id = 'kuaSummaryContainer';
        document.getElementById('dataBMNPage').appendChild(summaryEl);
    }
    summaryEl.style.display = 'block';

    // Bangun data per KUA dari allBMNData
    const kuaMap = {};
    APP_CONFIG.KUA_LIST.forEach(k => {
        kuaMap[k] = { jumlah: 0, lastUpdate: null, kondisi: { Baik: 0, 'Rusak Ringan': 0, 'Rusak Berat': 0 } };
    });
    allBMNData.forEach(b => {
        if (!kuaMap[b.kua]) return;
        kuaMap[b.kua].jumlah++;
        if (b.kondisi && kuaMap[b.kua].kondisi[b.kondisi] !== undefined) kuaMap[b.kua].kondisi[b.kondisi]++;
        const ts = b.updatedAt || b.createdAt || b.tanggalUpdate || b.tanggalInput || null;
        if (ts) {
            const d = new Date(ts);
            if (!kuaMap[b.kua].lastUpdate || d > new Date(kuaMap[b.kua].lastUpdate)) {
                kuaMap[b.kua].lastUpdate = ts;
            }
        }
    });

    const totalKUA     = APP_CONFIG.KUA_LIST.length;
    const kuaSudahIsi  = APP_CONFIG.KUA_LIST.filter(k => kuaMap[k].jumlah > 0).length;
    const kuaBelumIsi  = totalKUA - kuaSudahIsi;

    summaryEl.innerHTML = `
    <!-- Header summary -->
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;">
        <div>
            <h3 style="margin:0;font-size:18px;color:#333;">📋 Ringkasan Data BMN per KUA</h3>
            <p style="margin:4px 0 0;color:#777;font-size:13px;">Klik <strong>Detail</strong> untuk melihat seluruh data barang dari KUA tersebut</p>
        </div>
        <button class="btn btn-sm btn-secondary" onclick="backToDataBMNTable()"
            style="display:flex;align-items:center;gap:6px;">
            ← Semua Data
        </button>
    </div>

    <!-- Mini stats -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:22px;">
        <div style="background:#f0fff4;border:1px solid #b2dfdb;border-radius:10px;padding:14px 16px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#28a745;">${kuaSudahIsi}</div>
            <div style="font-size:12px;color:#555;margin-top:2px;">KUA Sudah Mengisi</div>
        </div>
        <div style="background:#fff8f0;border:1px solid #ffccbc;border-radius:10px;padding:14px 16px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#e65100;">${kuaBelumIsi}</div>
            <div style="font-size:12px;color:#555;margin-top:2px;">KUA Belum Mengisi</div>
        </div>
        <div style="background:#f0f4ff;border:1px solid #c5cae9;border-radius:10px;padding:14px 16px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#3949ab;">${totalKUA}</div>
            <div style="font-size:12px;color:#555;margin-top:2px;">Total KUA</div>
        </div>
        <div style="background:#fafafa;border:1px solid #e0e0e0;border-radius:10px;padding:14px 16px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:#333;">${allBMNData.length}</div>
            <div style="font-size:12px;color:#555;margin-top:2px;">Total Item BMN</div>
        </div>
    </div>

    <!-- Filter bar -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:16px;">
        <input type="text" id="searchKUASummary" placeholder="🔍 Cari nama KUA..."
            oninput="_filterKUASummaryRows()"
            style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:13px;min-width:200px;">
        <select id="filterKUAStatus" onchange="_filterKUASummaryRows()"
            style="padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:13px;">
            <option value="">Semua Status</option>
            <option value="isi">Sudah Mengisi</option>
            <option value="kosong">Belum Mengisi</option>
        </select>
    </div>

    <!-- Tabel summary -->
    <div class="table-container" style="display:block;">
        <table id="kuaSummaryTable" style="width:100%;border-collapse:collapse;">
            <thead>
                <tr>
                    <th style="width:36px;">No</th>
                    <th>Nama KUA</th>
                    <th style="text-align:center;width:100px;">Jumlah Data</th>
                    <th style="text-align:center;width:80px;">Baik</th>
                    <th style="text-align:center;width:100px;">Rusak Ringan</th>
                    <th style="text-align:center;width:90px;">Rusak Berat</th>
                    <th style="text-align:center;width:160px;">Last Update</th>
                    <th style="text-align:center;width:90px;">Status</th>
                    <th style="text-align:center;width:90px;">Aksi</th>
                </tr>
            </thead>
            <tbody id="kuaSummaryTbody">
                ${APP_CONFIG.KUA_LIST.slice().sort().map((kua, i) => {
                    const d         = kuaMap[kua];
                    const sudahIsi  = d.jumlah > 0;
                    const luDate    = d.lastUpdate ? formatDate(d.lastUpdate) : '—';
                    return `
                    <tr class="kua-summary-row" data-kua="${kua.toLowerCase()}" data-status="${sudahIsi ? 'isi' : 'kosong'}"
                        style="${!sudahIsi ? 'background:#fffbf5;' : ''}">
                        <td style="text-align:center;color:#999;font-size:13px;">${i + 1}</td>
                        <td>
                            <div style="font-weight:600;color:#333;">${kua}</div>
                            ${sudahIsi ? '' : '<div style="font-size:11px;color:#e65100;margin-top:2px;">Belum ada data</div>'}
                        </td>
                        <td style="text-align:center;">
                            <span style="font-size:18px;font-weight:700;color:${sudahIsi ? '#3949ab' : '#ccc'};">${d.jumlah}</span>
                        </td>
                        <td style="text-align:center;">
                            ${d.kondisi.Baik ? `<span class="badge badge-success">${d.kondisi.Baik}</span>` : '<span style="color:#ccc;">—</span>'}
                        </td>
                        <td style="text-align:center;">
                            ${d.kondisi['Rusak Ringan'] ? `<span class="badge badge-warning">${d.kondisi['Rusak Ringan']}</span>` : '<span style="color:#ccc;">—</span>'}
                        </td>
                        <td style="text-align:center;">
                            ${d.kondisi['Rusak Berat'] ? `<span class="badge badge-danger">${d.kondisi['Rusak Berat']}</span>` : '<span style="color:#ccc;">—</span>'}
                        </td>
                        <td style="text-align:center;font-size:12px;color:#666;">${luDate}</td>
                        <td style="text-align:center;">
                            <span class="badge ${sudahIsi ? 'badge-success' : ''}"
                                style="${!sudahIsi ? 'background:#fff3cd;color:#856404;border:1px solid #ffc107;' : ''}">
                                ${sudahIsi ? '✅ Mengisi' : '⏳ Menunggu'}
                            </span>
                        </td>
                        <td style="text-align:center;">
                            ${sudahIsi
                                ? `<button class="btn btn-sm btn-info"
                                        onclick="viewDetailKUA('${kua.replace(/'/g,"\\'")}')">
                                        Detail →
                                   </button>`
                                : `<button class="btn btn-sm" disabled
                                        style="opacity:.4;cursor:not-allowed;">
                                        Detail
                                   </button>`}
                        </td>
                    </tr>`;
                }).join('')}
            </tbody>
        </table>
    </div>`;
}

function _filterKUASummaryRows() {
    const q      = (document.getElementById('searchKUASummary')?.value || '').toLowerCase();
    const status = document.getElementById('filterKUAStatus')?.value || '';
    document.querySelectorAll('#kuaSummaryTbody .kua-summary-row').forEach(row => {
        const matchQ = !q      || row.dataset.kua.includes(q);
        const matchS = !status || row.dataset.status === status;
        row.style.display = (matchQ && matchS) ? '' : 'none';
    });
}

// Tampilkan detail barang untuk 1 KUA tertentu
function viewDetailKUA(kua) {
    _kuaSummaryActive = false;

    // Sembunyikan summary, tampilkan toolbar + tabel
    const summaryEl = document.getElementById('kuaSummaryContainer');
    const toolbar   = document.querySelector('#dataBMNPage .toolbar');
    const table     = document.querySelector('#dataBMNPage .table-container');
    if (summaryEl) summaryEl.style.display = 'none';
    if (toolbar)   toolbar.style.display   = '';
    if (table)     table.style.display     = '';

    // Set filter KUA lalu apply
    const filterKUAEl = document.getElementById('filterKUA');
    if (filterKUAEl) {
        filterKUAEl.value = kua;
        filterKUAEl.style.display = 'inline-block';
    }
    applyFilters();

    // Tambah tombol "← Kembali ke Summary" di bawah heading
    let backBtn = document.getElementById('btnBackToSummary');
    if (!backBtn) {
        backBtn = document.createElement('button');
        backBtn.id        = 'btnBackToSummary';
        backBtn.className = 'btn btn-sm btn-secondary';
        backBtn.style.cssText = 'margin-bottom:12px;';
        backBtn.textContent   = '← Kembali ke Summary KUA';
        backBtn.onclick       = backToKUASummary;
        const heading = document.querySelector('#dataBMNPage h2');
        if (heading) heading.after(backBtn);
    }
    backBtn.style.display = 'inline-block';
}

function backToKUASummary() {
    _kuaSummaryActive = true;

    const backBtn = document.getElementById('btnBackToSummary');
    if (backBtn) backBtn.style.display = 'none';

    // Reset filter KUA
    const filterKUAEl = document.getElementById('filterKUA');
    if (filterKUAEl) filterKUAEl.value = '';

    renderKUASummary();
}

// Tombol "← Semua Data" di summary: kembali ke tabel normal
function backToDataBMNTable() {
    _kuaSummaryActive = false;

    const summaryEl = document.getElementById('kuaSummaryContainer');
    const toolbar   = document.querySelector('#dataBMNPage .toolbar');
    const table     = document.querySelector('#dataBMNPage .table-container');
    if (summaryEl) summaryEl.style.display = 'none';
    if (toolbar)   toolbar.style.display   = '';
    if (table)     table.style.display     = '';

    const backBtn = document.getElementById('btnBackToSummary');
    if (backBtn) backBtn.style.display = 'none';

    // Reset filter KUA
    const filterKUAEl = document.getElementById('filterKUA');
    if (filterKUAEl) filterKUAEl.value = '';

    applyFilters();
}

// ===== KODE BARANG =====
function generateKodeBarang(kua, jenis) {
    const kuaCode   = APP_CONFIG.BMN.KUA_CODES[kua] || '00';
    const codeMap   = { 'Tanah':'01','Gedung/Bangunan':'02','Kendaraan':'03','Peralatan & Mesin':'04','Aset Lainnya':'05' };
    const jenisCode = APP_CONFIG.BMN.JENIS_BMN_CODES?.[jenis] || codeMap[jenis] || '00';
    const prefix    = `${kuaCode}-${jenisCode}-`;
    let   max       = 0;
    allBMNData.forEach(b => {
        if (b.kodeBarang.startsWith(prefix)) {
            const n = parseInt(b.kodeBarang.split('-')[2]); if (n > max) max = n;
        }
    });
    return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

function updateKodeBarang() {
    const jenis = document.getElementById('jenisBMN')?.value;
    if (jenis && currentUser.kua)
        document.getElementById('kodeBarang').value = generateKodeBarang(currentUser.kua, jenis);
}

// ===== HELPERS =====
function _opt(arr, sel, prefix = '— Pilih —') {
    return `<option value="">${prefix}</option>` +
        arr.map(v => `<option value="${v}" ${sel === v ? 'selected' : ''}>${v}</option>`).join('');
}

// ===== MODAL TAMBAH / EDIT BMN (CSS-class driven, fully responsive) =====
function showBMNModal(bmn = null) {
    const isKUA  = currentUser.role.includes('KUA');
    // Guard FE: tolak jika config tertutup untuk KUA
    if (isKUA && !bmnConfig.allowDataEntry) {
        showNotification('Input Data BMN sedang ditutup oleh Admin', 'warning');
        return;
    }

    const modal  = document.getElementById('modal');
    const isEdit = bmn !== null;

    uploadedPhotos    = isEdit && bmn.fotos ? [...bmn.fotos] : [];
    pendingPhotoFiles = [];

    const maxMB = APP_CONFIG.BMN.MAX_PHOTO_SIZE / 1024 / 1024;

    modal.innerHTML = `
    <div class="modal-content" style="max-width:820px;">

        <!-- ── Header ── -->
        <div class="bm-hdr bm-hdr-green">
            <div class="bm-hdr-left">
                <h3>${isEdit ? '✏️ Edit Data BMN' : '➕ Tambah BMN Baru'}</h3>
                <p>${isEdit ? bmn.kodeBarang + ' &mdash; ' + bmn.kua : currentUser.kua}</p>
            </div>
            <button class="bm-hdr-close" onclick="closeModal()" aria-label="Tutup">&times;</button>
        </div>

        <form id="bmnForm" autocomplete="off">
            <input type="hidden" id="bmnId" value="${isEdit ? bmn.id : ''}">

            <!-- ── Seksi 1: Identifikasi ── -->
            <div class="bm-sec bm-sec-green">
                <div class="bm-sec-title" style="color:#28a745;">📦 Identifikasi Barang</div>

                <div class="bm-grid-2">
                    <div>
                        <label class="bm-label">Jenis BMN <span class="bm-req">*</span></label>
                        <select id="jenisBMN" class="bm-select ${isEdit ? 'bm-input-disabled' : ''}"
                            required onchange="updateKodeBarang()" ${isEdit ? 'disabled' : ''}>
                            ${_opt(APP_CONFIG.BMN.JENIS_BMN, isEdit ? bmn.jenis : '', '— Pilih Jenis —')}
                        </select>
                    </div>
                    <div>
                        <label class="bm-label">Kode Barang <small style="font-weight:400;color:#888;">(otomatis)</small></label>
                        <input id="kodeBarang" class="bm-input bm-input-readonly"
                            value="${isEdit ? bmn.kodeBarang : ''}" readonly>
                    </div>
                </div>

                <div style="margin-top:12px;">
                    <label class="bm-label">Nama Barang <span class="bm-req">*</span></label>
                    <input id="namaBarang" class="bm-input" required
                        placeholder="Masukkan nama barang..."
                        value="${isEdit ? bmn.namaBarang : ''}">
                </div>

                <div class="bm-grid-2 bm-grid-2-mt">
                    <div>
                        <label class="bm-label">ID BMN / No. Registrasi</label>
                        <input id="idBMN" class="bm-input" placeholder="Opsional"
                            value="${isEdit ? (bmn.idBMN || '') : ''}">
                    </div>
                    <div>
                        <label class="bm-label">Lokasi Barang <span class="bm-req">*</span></label>
                        <input id="lokasiBarang" class="bm-input" required
                            placeholder="Contoh: Ruang Kepala KUA"
                            value="${isEdit ? bmn.lokasiBarang : ''}">
                    </div>
                </div>
            </div>

            <!-- ── Seksi 2: Kondisi & Status ── -->
            <div class="bm-sec bm-sec-blue">
                <div class="bm-sec-title" style="color:#667eea;">🔧 Perolehan, Kondisi &amp; Status</div>

                <div class="bm-grid-2">
                    <div>
                        <label class="bm-label">Tahun Perolehan <span class="bm-req">*</span></label>
                        <input type="number" id="tahunPerolehan" class="bm-input"
                            required min="1900" max="2100"
                            value="${isEdit ? bmn.tahunPerolehan : new Date().getFullYear()}">
                    </div>
                    <div>
                        <label class="bm-label">Sumber Perolehan</label>
                        <select id="sumberPerolehan" class="bm-select">
                            ${_opt(APP_CONFIG.BMN.SUMBER_PEROLEHAN, isEdit ? bmn.sumberPerolehan : '', '— Pilih Sumber —')}
                        </select>
                    </div>
                    <div>
                        <label class="bm-label">Kondisi Barang <span class="bm-req">*</span></label>
                        <select id="kondisi" class="bm-select" required>
                            ${_opt(APP_CONFIG.BMN.KONDISI_BMN, isEdit ? bmn.kondisi : '', '— Pilih Kondisi —')}
                        </select>
                    </div>
                    <div>
                        <label class="bm-label">Status Penggunaan <span class="bm-req">*</span></label>
                        <select id="statusPenggunaan" class="bm-select" required>
                            ${_opt(APP_CONFIG.BMN.STATUS_BMN, isEdit ? bmn.status : '', '— Pilih Status —')}
                        </select>
                    </div>
                </div>

                <div style="margin-top:12px;">
                    <label class="bm-label">Keterangan</label>
                    <textarea id="keterangan" class="bm-textarea" rows="3"
                        placeholder="Keterangan tambahan (opsional)...">${isEdit ? (bmn.keterangan || '') : ''}</textarea>
                </div>
            </div>

            <!-- ── Seksi 3: Foto / Dokumen ── -->
            <div class="bm-sec bm-sec-orange">
                <div class="bm-sec-title" style="color:#fd7e14;">
                    📷 Dokumentasi Foto
                    <span style="font-size:11px;font-weight:400;color:#888;">— diupload saat klik Simpan</span>
                </div>

                <div class="bm-upload-row">
                    <button type="button" class="bm-upload-btn"
                        onclick="document.getElementById('photoInput').click()">
                        📂 Pilih File
                    </button>
                    <button type="button" class="bm-upload-btn"
                        onclick="document.getElementById('cameraInput').click()">
                        📸 Kamera
                    </button>
                    <span class="bm-upload-hint">Maks ${APP_CONFIG.BMN.MAX_PHOTOS} file &middot; ${maxMB}MB/file</span>
                </div>

                <input type="file" id="photoInput"  accept="image/*,application/pdf"
                    multiple style="display:none;" onchange="handlePhotoSelect(event)">
                <input type="file" id="cameraInput" accept="image/*"
                    capture="camera" style="display:none;" onchange="handlePhotoSelect(event)">

                ${uploadedPhotos.length > 0 ? `
                    <p class="bm-existing-label">File tersimpan (${uploadedPhotos.length}):</p>
                    <div id="existingPhotoGallery" class="bmn-photo-gallery" style="margin-bottom:12px;"></div>
                ` : ''}

                <div id="photoGallery" class="bmn-photo-gallery"></div>
                <p id="photoStatusMsg" class="bm-status-msg"></p>
            </div>

            <!-- ── Action Buttons ── -->
            <div class="bm-actions">
                <button type="button" class="bm-btn-cancel" onclick="_cancelBMNEdit()">
                    ✕ Batal
                </button>
                <button type="submit" id="btnSimpanBMN" class="bm-btn-save">
                    💾 Simpan
                </button>
            </div>
        </form>
    </div>`;

    modal.classList.add('active');
    if (!isEdit) updateKodeBarang();
    if (uploadedPhotos.length) renderExistingPhotos();

    document.getElementById('bmnForm').onsubmit = async (e) => {
        e.preventDefault();
        await saveBMN(bmn);
    };
}

// ===== FOTO HANDLING =====
function handlePhotoSelect(event) {
    const files  = Array.from(event.target.files || []);
    if (!files.length) return;
    const maxP   = APP_CONFIG.BMN.MAX_PHOTOS;
    const already = uploadedPhotos.length + pendingPhotoFiles.length;

    if (already + files.length > maxP) {
        showNotification(`Maksimal ${maxP} file`, 'warning'); return;
    }
    files.forEach(file => {
        if (file.size > APP_CONFIG.BMN.MAX_PHOTO_SIZE) {
            showNotification(`${file.name} terlalu besar (maks ${APP_CONFIG.BMN.MAX_PHOTO_SIZE/1024/1024}MB)`, 'warning');
            return;
        }
        const isImage    = file.type.startsWith('image/');
        const previewUrl = isImage ? URL.createObjectURL(file) : null;
        pendingPhotoFiles.push({ file, previewUrl, fileName: file.name, fileSize: file.size, mimeType: file.type, isImage });
    });
    renderPendingPhotos();
    event.target.value = '';
}

function renderExistingPhotos() {
    const el = document.getElementById('existingPhotoGallery');
    if (!el) return;
    el.innerHTML = uploadedPhotos.map((f, i) => {
        const thumbUrl = f.fileId ? `https://drive.google.com/thumbnail?id=${f.fileId}&sz=w200` : null;
        const isImg    = f.mimeType && f.mimeType.startsWith('image/');
        const isPdf    = f.mimeType && f.mimeType.includes('pdf');
        return `
        <div class="photo-item" style="cursor:pointer;"
             onclick="openFilePreview('${f.fileUrl || ''}','${f.fileName}')">
            ${thumbUrl && isImg
                ? `<img src="${thumbUrl}" alt="${f.fileName}">`
                : `<div style="height:110px;background:#e9ecef;display:flex;flex-direction:column;
                              align-items:center;justify-content:center;gap:4px;border-radius:6px;">
                       <span style="font-size:28px;">${isPdf ? '📄' : '📎'}</span>
                       <span style="font-size:10px;color:#666;padding:0 4px;overflow:hidden;
                                    text-overflow:ellipsis;white-space:nowrap;max-width:100%;">${f.fileName}</span>
                   </div>`}
            <div class="bm-foto-preview-badge">🔍</div>
            <button type="button" class="remove-photo"
                onclick="event.stopPropagation();removeExistingPhoto(${i})"
                title="Hapus file">×</button>
            <div style="padding:3px 6px;font-size:10px;color:#666;
                        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${f.fileName}</div>
        </div>`;
    }).join('');
}

function renderPendingPhotos() {
    const el  = document.getElementById('photoGallery');
    const msg = document.getElementById('photoStatusMsg');
    if (!el) return;
    if (!pendingPhotoFiles.length) { el.innerHTML = ''; if (msg) msg.textContent = ''; return; }

    el.innerHTML = pendingPhotoFiles.map((p, i) => `
        <div class="photo-item" style="position:relative;">
            ${p.isImage && p.previewUrl
                ? `<img src="${p.previewUrl}" alt="${p.fileName}">`
                : `<div style="height:110px;background:#e9ecef;display:flex;flex-direction:column;
                              align-items:center;justify-content:center;gap:4px;border-radius:6px;">
                       <span style="font-size:28px;">${p.mimeType.includes('pdf') ? '📄' : '📎'}</span>
                       <span style="font-size:10px;color:#555;padding:0 4px;overflow:hidden;
                                    text-overflow:ellipsis;white-space:nowrap;max-width:100%;">${p.fileName}</span>
                   </div>`}
            <div class="bm-foto-new-badge">BARU</div>
            <button type="button" class="remove-photo"
                onclick="removePendingPhoto(${i})" title="Hapus">×</button>
            <div style="padding:3px 6px;font-size:10px;color:#666;
                        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.fileName}</div>
        </div>`
    ).join('');

    if (msg) msg.textContent = `${pendingPhotoFiles.length} file baru akan diupload saat klik Simpan.`;
}

function removeExistingPhoto(i) {
    if (confirm('Hapus file ini?')) { uploadedPhotos.splice(i, 1); renderExistingPhotos(); }
}
function removePendingPhoto(i) {
    if (pendingPhotoFiles[i]?.previewUrl) URL.revokeObjectURL(pendingPhotoFiles[i].previewUrl);
    pendingPhotoFiles.splice(i, 1); renderPendingPhotos();
}

function fileToBase64(file) {
    return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload  = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
    });
}

// ===== SAVE BMN =====
async function saveBMN(existingBMN) {
    const btn = document.getElementById('btnSimpanBMN');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Menyimpan...'; }

    const kodeBarang = document.getElementById('kodeBarang').value;

    try {
        if (pendingPhotoFiles.length) {
            showLoading();
            for (const p of pendingPhotoFiles) {
                try {
                    const base64 = await fileToBase64(p.file);
                    const res    = await apiCall('uploadBMNPhoto', {
                        fileName: p.fileName, fileData: base64,
                        fileSize: p.fileSize, mimeType: p.mimeType,
                        kua: currentUser.kua, kodeBarang
                    });
                    uploadedPhotos.push({
                        fileId:   res.fileId   || res.id  || '',
                        fileUrl:  res.fileUrl  || res.url || '',
                        fileName: p.fileName,
                        fileSize: p.fileSize,
                        mimeType: p.mimeType
                    });
                    if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
                } catch (ue) {
                    showNotification(`Gagal upload ${p.fileName}`, 'warning');
                }
            }
            pendingPhotoFiles = [];
            hideLoading();
        }

        showLoading();
        await apiCall('saveBMN', {
            id:              document.getElementById('bmnId').value || null,
            kua:             currentUser.kua,
            kodeBarang,
            namaBarang:      document.getElementById('namaBarang').value,
            jenis:           document.getElementById('jenisBMN').value,
            tahunPerolehan:  document.getElementById('tahunPerolehan').value,
            sumberPerolehan: document.getElementById('sumberPerolehan').value,
            kondisi:         document.getElementById('kondisi').value,
            status:          document.getElementById('statusPenggunaan').value,
            lokasiBarang:    document.getElementById('lokasiBarang').value,
            idBMN:           document.getElementById('idBMN').value,
            keterangan:      document.getElementById('keterangan').value,
            fotos:           uploadedPhotos,
            username:        currentUser.username
        });
        hideLoading();

        showNotification('Data BMN berhasil disimpan', 'success');
        closeModal();
        allBMNData = []; bmnCache.statsLoaded = false;
        loadBMNData(true); loadBMNDashboardStats();

    } catch (err) {
        hideLoading();
        if (btn) { btn.disabled = false; btn.textContent = '💾 Simpan'; }
        showNotification(err.message, 'error');
    }
}

// ===== EDIT / CANCEL =====
function editBMN(bmn) { _editSourceBMN = null; closeModal(); setTimeout(() => showBMNModal(bmn), 250); }
function _editBMNFromDetail(bmn) {
    if (!bmnConfig.allowDataEntry && currentUser.role.includes('KUA')) {
        showNotification('Input Data BMN sedang ditutup oleh Admin', 'warning');
        return;
    }
    _editSourceBMN = bmn; closeModal(); setTimeout(() => showBMNModal(bmn), 250);
}
function _cancelBMNEdit() {
    pendingPhotoFiles.forEach(p => { if (p.previewUrl) URL.revokeObjectURL(p.previewUrl); });
    pendingPhotoFiles = [];
    if (_editSourceBMN) {
        const b = _editSourceBMN; _editSourceBMN = null;
        closeModal(); setTimeout(() => viewBMN(b), 250);
    } else {
        closeModal();
    }
}

// ===== DETAIL VIEW (CSS-class driven, fully responsive) =====
function viewBMN(bmn) {
    const modal   = document.getElementById('modal');
    const isKUA   = currentUser.role.includes('KUA');
    const isAdmin = currentUser.role === 'Admin';

    // Kondisi colors
    const [kBg, kBd, kTxt] = bmn.kondisi === 'Baik'
        ? ['#d4edda','#28a74533','#155724']
        : bmn.kondisi === 'Rusak Ringan'
            ? ['#fff3cd','#ffc10733','#856404']
            : ['#f8d7da','#dc354533','#721c24'];

    // Status colors
    const [sBg, sBd, sTxt] = bmn.status === 'Digunakan'
        ? ['#d4edda','#28a74533','#155724']
        : bmn.status === 'Tidak Digunakan'
            ? ['#fff3cd','#ffc10733','#856404']
            : ['#f8d7da','#dc354533','#721c24'];

    const fotos = bmn.fotos || [];

    // Foto grid HTML
    const fotoHTML = fotos.length
        ? `<div class="bm-foto-grid">
            ${fotos.map(f => {
                const thumb = f.fileId ? `https://drive.google.com/thumbnail?id=${f.fileId}&sz=w300` : '';
                const isImg = f.mimeType && f.mimeType.startsWith('image/');
                const isPdf = f.mimeType && f.mimeType.includes('pdf');
                const url   = f.fileUrl || (f.fileId ? `https://drive.google.com/file/d/${f.fileId}/view` : '');
                return `
                <div class="bm-foto-card" onclick="openFilePreview('${url}','${f.fileName}')">
                    ${isImg && thumb
                        ? `<img src="${thumb}" alt="${f.fileName}"
                             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                           <div class="bm-foto-placeholder" style="display:none;"><span>🖼️</span></div>`
                        : `<div class="bm-foto-placeholder"><span>${isPdf ? '📄' : '📎'}</span>
                               <span>${isPdf ? 'PDF' : 'FILE'}</span></div>`}
                    <div class="bm-foto-card-body">
                        <div class="bm-foto-name">${f.fileName}</div>
                        <div class="bm-foto-sub">🔍 Klik untuk preview</div>
                    </div>
                </div>`;
            }).join('')}
           </div>`
        : `<div class="bm-foto-empty">
               <div class="bm-foto-empty-icon">📷</div>
               <p>Belum ada dokumentasi foto/dokumen</p>
           </div>`;

    modal.innerHTML = `
    <div class="modal-content" style="max-width:900px;">

        <!-- ── Header ── -->
        <div class="bm-hdr bm-hdr-purple">
            <div class="bm-hdr-left" style="min-width:0;flex:1;">
                <div class="bm-detail-label">Detail Barang Milik Negara</div>
                <h2 class="bm-detail-name">${bmn.namaBarang}</h2>
                <div class="bm-detail-tags">
                    <code class="bm-detail-code">${bmn.kodeBarang}</code>
                    <span class="bm-detail-jenis">${bmn.jenis}</span>
                </div>
            </div>
            <div class="bm-hdr-actions">
                ${isKUA && bmnConfig.allowDataEntry ? `
                <button class="bm-hdr-edit-btn"
                    onclick='_editBMNFromDetail(${JSON.stringify(bmn).replace(/'/g,"&apos;")})'>
                    ✏️ Edit Data
                </button>` : ''}
                <button class="bm-hdr-close-alt" onclick="closeModal()">✕ Tutup</button>
            </div>
        </div>

        <!-- ── Status Badges ── -->
        <div class="bm-badge-row">
            <div class="bm-badge-card"
                 style="background:${kBg};border-color:${kBd};">
                <div class="bm-badge-label" style="color:${kTxt};">Kondisi</div>
                <div class="bm-badge-value" style="color:${kTxt};">${bmn.kondisi}</div>
            </div>
            <div class="bm-badge-card"
                 style="background:${sBg};border-color:${sBd};">
                <div class="bm-badge-label" style="color:${sTxt};">Status Penggunaan</div>
                <div class="bm-badge-value" style="color:${sTxt};">${bmn.status}</div>
            </div>
            <div class="bm-badge-card"
                 style="background:#f0f4ff;border-color:#667eea33;">
                <div class="bm-badge-label" style="color:#667eea;">KUA</div>
                <div class="bm-badge-value" style="color:#3b4a8d;font-size:13px;">${bmn.kua || currentUser.kua}</div>
            </div>
        </div>

        <!-- ── 2-col Info Grid ── -->
        <div class="bm-info-grid">
            <div class="bm-info-card bm-info-card-blue">
                <div class="bm-info-card-title" style="color:#667eea;">📋 Detail Barang</div>
                ${_infoRow('Nama Barang', bmn.namaBarang)}
                ${_infoRow('Jenis', bmn.jenis)}
                ${_infoRow('ID BMN / No. Reg', bmn.idBMN || '—')}
                ${_infoRow('Lokasi', bmn.lokasiBarang)}
            </div>
            <div class="bm-info-card bm-info-card-green">
                <div class="bm-info-card-title" style="color:#28a745;">📦 Perolehan</div>
                ${_infoRow('Tahun', bmn.tahunPerolehan)}
                ${_infoRow('Sumber', bmn.sumberPerolehan || '—')}
                ${isAdmin ? _infoRow('Kode', `<code style="font-family:monospace;font-size:12px;">${bmn.kodeBarang}</code>`) : ''}
            </div>
        </div>

        <!-- ── Keterangan ── -->
        ${bmn.keterangan ? `
        <div class="bm-keterangan">
            <h4>📝 Keterangan</h4>
            <p>${bmn.keterangan}</p>
        </div>` : ''}

        <!-- ── Dokumentasi Foto ── -->
        <div class="bm-foto-sec">
            <div class="bm-foto-sec-title">
                📷 Dokumentasi
                <span style="font-size:13px;font-weight:600;">(${fotos.length} file)</span>
                ${fotos.length ? '<span class="bm-foto-hint">— klik thumbnail untuk preview</span>' : ''}
            </div>
            ${fotoHTML}
        </div>

    </div>`;

    modal.classList.add('active');
}

// ── Helper info row
function _infoRow(label, val) {
    return `<div class="bm-info-row">
        <span class="bm-info-lbl">${label}</span>
        <span class="bm-info-val">${val}</span>
    </div>`;
}

// ===== BMN SETTINGS / KONFIGURASI =====

async function loadBMNSettings() {
    if (bmnCache.configLoaded) return;
    try {
        const cfg = await apiCall('getBMNSettings', {});
        bmnConfig.allowDataEntry = cfg.allowDataEntry !== false; // default true
        bmnCache.configLoaded    = true;
    } catch (e) {
        bmnConfig = { allowDataEntry: true }; // fallback aman
    }
}

// Fetch config lalu render — dipakai hanya jika config belum ter-cache
async function loadKonfigurasiPage() {
    const el = document.getElementById('konfigurasiContent');
    if (!el) return;
    if (!bmnCache.configLoaded) {
        el.innerHTML = `<div style="text-align:center;padding:30px;color:#999;">⏳ Memuat konfigurasi...</div>`;
        await loadBMNSettings(); // fetch + set bmnCache.configLoaded = true
    }
    _renderKonfigurasiPage();
}

// Pure render dari state bmnConfig — tanpa API call sama sekali
function _renderKonfigurasiPage() {
    const el = document.getElementById('konfigurasiContent');
    if (!el) return;

    const on = bmnConfig.allowDataEntry;
    el.innerHTML = `
    <!-- Banner -->
    <div style="background:linear-gradient(135deg,#667eea,#764ba2);border-radius:12px;
                padding:20px 24px;margin-bottom:22px;color:#fff;">
        <h3 style="margin:0 0 6px;color:#fff;font-size:17px;">⚙️ Hak Akses Operator KUA</h3>
        <p style="margin:0;opacity:.85;font-size:13px;line-height:1.6;">
            Kontrol apakah <strong>Operator KUA</strong> boleh menambah atau mengedit Data BMN.
            Perubahan langsung berlaku &amp; dijaga di sisi server — Operator KUA perlu
            me-refresh halaman untuk melihat efeknya.
        </p>
    </div>

    <!-- Single toggle card -->
    <div style="background:#fff;border:1px solid #e9ecef;border-radius:14px;
                padding:24px 26px;display:flex;align-items:center;
                justify-content:space-between;gap:20px;flex-wrap:wrap;
                box-shadow:0 2px 12px rgba(0,0,0,.07);">
        <div style="min-width:0;flex:1;">
            <div style="font-size:16px;font-weight:700;color:#333;margin-bottom:6px;">
                ✏️ Input Data BMN (Tambah &amp; Edit)
            </div>
            <div style="font-size:13px;color:#777;line-height:1.65;">
                Satu toggle ini mengontrol <strong>sekaligus</strong>: tombol
                <em>+ Tambah BMN</em> dan tombol <em>✏️ Edit Data</em> di modal Detail.<br>
                Ketika <strong>Ditutup</strong>, permintaan dari Operator KUA juga akan
                ditolak di sisi server meski melewati halaman ini.
            </div>
        </div>
        <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:10px;">
            <button id="toggle_allowDataEntry" onclick="toggleBMNSetting('allowDataEntry')"
                style="min-width:120px;padding:12px 24px;border:none;border-radius:10px;
                       font-size:15px;font-weight:700;cursor:pointer;letter-spacing:.3px;
                       transition:all .2s;
                       ${on
                           ? 'background:#d4edda;color:#155724;box-shadow:0 0 0 2px #28a74555;'
                           : 'background:#f8d7da;color:#721c24;box-shadow:0 0 0 2px #dc354555;'}">
                ${on ? '✅ Dibuka' : '🔒 Ditutup'}
            </button>
            <div style="font-size:11px;color:#aaa;text-align:center;">
                Klik untuk ${on ? 'menutup' : 'membuka'}
            </div>
        </div>
    </div>

    <!-- Status info box -->
    <div style="margin-top:16px;background:${on ? '#f0fff4' : '#fff8f0'};
                border-radius:10px;padding:14px 18px;
                border-left:4px solid ${on ? '#28a745' : '#fd7e14'};
                font-size:13px;color:#555;line-height:1.6;">
        ${on
            ? '✅ <strong>Saat ini DIBUKA</strong> — Operator KUA dapat menambah dan mengedit data BMN.'
            : '🔒 <strong>Saat ini DITUTUP</strong> — Operator KUA tidak dapat menambah atau mengedit data BMN. Permintaan akan ditolak oleh server.'}
    </div>

    <!-- Info note -->
    <div style="margin-top:12px;background:#f8f9fa;border-radius:10px;padding:13px 16px;
                border-left:4px solid #667eea;font-size:12px;color:#666;line-height:1.7;">
        💡 <strong>Catatan teknis:</strong> Penjagaan berlapis — Frontend menyembunyikan tombol,
        Backend menolak request. Sehingga aksi tidak bisa dilakukan walaupun seseorang
        mencoba langsung via API.
    </div>`;
}

async function toggleBMNSetting(key) {
    const btn    = document.getElementById(`toggle_${key}`);
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Menyimpan...'; }

    const newVal = !bmnConfig[key];
    try {
        // Sertakan username agar backend dapat memverifikasi bahwa pemohon benar-benar Admin
        await apiCall('saveBMNSetting', { key, value: newVal, username: currentUser.username });
        bmnConfig[key] = newVal;
        showNotification(
            `Input Data BMN berhasil ${newVal ? 'dibuka ✅' : 'ditutup 🔒'}`,
            newVal ? 'success' : 'warning'
        );
        _renderKonfigurasiPage(); // re-render dari state — tanpa fetch ulang
    } catch (e) {
        showNotification(e.message || 'Gagal menyimpan konfigurasi', 'error');
        if (btn) {
            btn.disabled = false;
            btn.textContent = bmnConfig[key] ? '✅ Dibuka' : '🔒 Ditutup';
        }
    }
}

// ===== EXPORT DATA TABEL (sesuai hasil filter/search yang sedang tampil) =====

// Tampilkan / sembunyikan tombol export sesuai jumlah baris di tabel
function _updateExportButtons(count) {
    const show = count > 0;
    const elXls = document.getElementById('btnExportExcel');
    const elPdf = document.getElementById('btnExportPDF');
    if (elXls) elXls.style.display = show ? 'inline-flex' : 'none';
    if (elPdf) elPdf.style.display = show ? 'inline-flex' : 'none';
}

// Kirim data tabel saat ini (currentBMNData) ke backend lalu trigger download
async function exportCurrentData(format) {
    if (!currentBMNData || !currentBMNData.length) {
        showNotification('Tidak ada data untuk didownload', 'warning');
        return;
    }

    // Bangun label deskriptif untuk nama file
    const fKUA     = document.getElementById('filterKUA')?.value     || '';
    const fJenis   = document.getElementById('filterJenis')?.value   || '';
    const fKondisi = document.getElementById('filterKondisi')?.value || '';
    const fStatus  = document.getElementById('filterStatus')?.value  || '';
    const q        = document.getElementById('searchBMN')?.value     || '';

    const parts = [];
    if (fKUA)     parts.push(fKUA);
    else if (currentUser.role !== 'Admin') parts.push(currentUser.kua || '');
    if (fJenis)   parts.push(fJenis);
    if (fKondisi) parts.push(fKondisi);
    if (fStatus)  parts.push(fStatus);
    if (q)        parts.push(`"${q}"`);
    const label = parts.length ? parts.join(' · ') : 'Semua Data';

    try {
        showLoading();
        const result = await apiCall('exportLaporanBMN', {
            type:       'customData',
            format,
            customData: currentBMNData,
            label,
            exportedBy: currentUser.name || currentUser.username
        });
        hideLoading();
        _downloadBase64File(result);
        showNotification(`Berhasil mengunduh ${currentBMNData.length} data BMN`, 'success');
    } catch (err) {
        hideLoading();
        showNotification(err.message || 'Gagal mengunduh data', 'error');
    }
}

function _downloadBase64File(r) {
    const bytes = Uint8Array.from(atob(r.fileData), c => c.charCodeAt(0));
    const blob  = new Blob([bytes], { type: r.mimeType });
    const url   = URL.createObjectURL(blob);
    const a     = Object.assign(document.createElement('a'), { href: url, download: r.fileName });
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ===== MODAL UTIL =====
function closeModal() {
    const m = document.getElementById('modal');
    if (m) m.classList.remove('active');
}