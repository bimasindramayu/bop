// ===== NIKAH SCRIPT =====
// File: nikah-script.js

// ===== STATE =====
let currentUser = null;
let currentYear = new Date().getFullYear();
let monthStatuses = {};            // status bulan untuk tahun yang sedang ditampilkan di tabel
let modalMonthStatuses = {};       // status untuk tahun yang dipilih di monthStatusModal (Admin)
let modalStatusYear = currentYear;
let allKUAInfo = {};

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', function() {
    debugLog('NIKAH', 'DOM Content Loaded');

    currentUser = SessionManager.getCurrentUser();
    if (!currentUser) {
        window.location.href = 'index.html';
        return;
    }

    displayUserInfo();

    // Initialize filters
    initializeYearFilter();
    initializeExportYear();
    initializeTableYearFilter();
    initializeMonthStatusYearFilter();

    // Load shared data
    loadAllKUAInfo();

    if (currentUser.role === 'Admin') {
        showAdminView();
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('action') === 'kuainfo') {
            setTimeout(() => { showKUAInfoModal(); }, 800);
        }
    } else {
        showOperatorView();
    }
});

// ===== USER INFO =====
function displayUserInfo() {
    const el = document.getElementById('userName');
    if (el) el.textContent = currentUser.name;
    const roleEl = document.getElementById('userRole');
    if (roleEl) roleEl.textContent = currentUser.role + (currentUser.kua ? ' - ' + currentUser.kua : '');
}

// ===== INITIALIZE FILTERS =====
function initializeYearFilter() {
    const sel = document.getElementById('filterYear');
    if (!sel) return;
    const cy = new Date().getFullYear();
    for (let y = cy - 5; y <= cy + 5; y++) {
        const o = document.createElement('option');
        o.value = y; o.textContent = y;
        if (y === cy) o.selected = true;
        sel.appendChild(o);
    }
}

function initializeExportYear() {
    const sel = document.getElementById('exportYear');
    if (!sel) return;
    const cy = new Date().getFullYear();
    for (let y = cy - 5; y <= cy + 5; y++) {
        const o = document.createElement('option');
        o.value = y; o.textContent = y;
        if (y === cy) o.selected = true;
        sel.appendChild(o);
    }
}

function initializeTableYearFilter() {
    const sel = document.getElementById('tableFilterYear');
    if (!sel) return;
    const cy = new Date().getFullYear();
    for (let y = cy - 5; y <= cy + 5; y++) {
        const o = document.createElement('option');
        o.value = y; o.textContent = y;
        if (y === cy) o.selected = true;
        sel.appendChild(o);
    }
}

function initializeMonthStatusYearFilter() {
    const sel = document.getElementById('monthStatusYear');
    if (!sel) return;
    const cy = new Date().getFullYear();
    for (let y = cy - 5; y <= cy + 5; y++) {
        const o = document.createElement('option');
        o.value = y; o.textContent = y;
        if (y === cy) o.selected = true;
        sel.appendChild(o);
    }
}

// ===== VIEW MODES =====
function showAdminView() {
    debugLog('NIKAH', 'Showing admin view');
    document.getElementById('adminActions').style.display = 'block';
    loadStats();
    loadTableData();   // load tabel + status bulan sekaligus
}

function showOperatorView() {
    debugLog('NIKAH', 'Showing operator view');
    document.getElementById('adminActions').style.display = 'none';
    // Set tableFilterMonth ke bulan sekarang secara default
    const tfm = document.getElementById('tableFilterMonth');
    if (tfm) tfm.value = String(new Date().getMonth() + 1);
    loadTableData();
}

// ===== YEAR CHANGE (filter utama atas) =====
function handleYearChange() {
    currentYear = parseInt(document.getElementById('filterYear').value);
    // Sync tableFilterYear ikut
    const tfy = document.getElementById('tableFilterYear');
    if (tfy) tfy.value = String(currentYear);
    if (currentUser.role === 'Admin') {
        loadStats();
    }
    loadTableData();
}

// ===== TABLE FILTER CHANGE =====
// Dipanggil dari onchange dropdown Tahun / Bulan di viewDataCard
function handleTableFilterChange() {
    loadTableData();
}

// ===== LOAD STATS (Admin) =====
async function loadStats() {
    debugLog('NIKAH', 'Loading stats');
    try {
        const stats = await apiCall('getNikahStats', { year: currentYear });
        displayStats(stats);
    } catch (e) {
        debugLog('NIKAH', 'Error loading stats', e);
    }
}

function displayStats(stats) {
    const el = document.getElementById('statsGrid');
    if (!el) return;
    el.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Total Peristiwa</div>
            <div class="stat-value">${stats.totalPeristiwa || 0}</div>
        </div>
        <div class="stat-card success">
            <div class="stat-label">Di Kantor</div>
            <div class="stat-value">${stats.totalKantor || 0}</div>
        </div>
        <div class="stat-card info">
            <div class="stat-label">Luar Kantor</div>
            <div class="stat-value">${stats.totalLuarKantor || 0}</div>
        </div>
        <div class="stat-card warning">
            <div class="stat-label">Itsbat</div>
            <div class="stat-value">${stats.totalItsbat || 0}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Rujuk</div>
            <div class="stat-value">${stats.totalRujuk || 0}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Itsbat Nikah</div>
            <div class="stat-value">${stats.totalItsbatNikah || 0}</div>
        </div>
    `;
}

// ===== LOAD TABLE + STATUS BULAN (satu fungsi, satu kali fetch status) =====
// Kolom: No | KUA | Jumlah | 29 field = 32 kolom total
const TABLE_COLS = 32;

const FIELD_KEYS = [
    'kantor','luarKantor','itsbat',
    'campuranLaki','campuranWanita',
    'rujuk','itsbatNikah',
    'usiaPengantinLakiU19','usiaPengantinLaki1921','usiaPengantinLaki21Plus',
    'usiaPengantinWanitaU19','usiaPengantinWanita1921','usiaPengantinWanita21Plus',
    'pendidikanLakiSD','pendidikanLakiSLTP','pendidikanLakiSLTA',
    'pendidikanLakiD1D2','pendidikanLakiD3','pendidikanLakiS1','pendidikanLakiS2','pendidikanLakiS3',
    'pendidikanWanitaSD','pendidikanWanitaSLTP','pendidikanWanitaSLTA',
    'pendidikanWanitaD1D2','pendidikanWanitaD3','pendidikanWanitaS1','pendidikanWanitaS2','pendidikanWanitaS3'
];

async function loadTableData() {
    debugLog('NIKAH', 'Loading table data');
    const tbody = document.getElementById('dataTableBody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="${TABLE_COLS}" class="text-center">Memuat data...</td></tr>`;

    // Baca filter
    const tableYear  = parseInt(document.getElementById('tableFilterYear').value);
    const tableMonth = parseInt(document.getElementById('tableFilterMonth').value); // 0 = semua

    // --- Fetch month statuses untuk tahun ini (parallel dengan stats) ---
    let curMonthStatuses = {};
    try {
        curMonthStatuses = await apiCall('getNikahMonthStatus', { year: tableYear });
        monthStatuses = curMonthStatuses;  // simpan di state untuk dipakai save
    } catch (e) {
        debugLog('NIKAH', 'Error loading month statuses', e);
    }

    // --- Tentukan canEdit & update UI status + save bar ---
    const isOperator   = currentUser.role !== 'Admin';
    const bulanSpesifik = tableMonth > 0;
    const statusBulan  = bulanSpesifik ? (curMonthStatuses[tableMonth] || 'open') : null;
    const canEdit      = isOperator && bulanSpesifik && statusBulan === 'open';

    // Update alert status bulan (khusus Operator + bulan spesifik)
    updateMonthStatusInfo(isOperator, bulanSpesifik, statusBulan);

    // Update save bar visibility
    document.getElementById('operatorSaveBar').style.display = canEdit ? 'block' : 'none';

    // --- Fetch data tabel ---
    try {
        const apiPayload = { year: tableYear };
        if (bulanSpesifik) apiPayload.month = tableMonth;

        const stats = await apiCall('getNikahStats', apiPayload);

        // Akumulasi totals
        const totals = {};
        FIELD_KEYS.forEach(k => totals[k] = 0);
        let totalJumlah = 0;

        let html = '';
        let no   = 1;

        for (const kua of APP_CONFIG.KUA_LIST) {
            const d = stats.byKUA ? (stats.byKUA[kua] || {}) : {};
            FIELD_KEYS.forEach(k => { totals[k] += (d[k] || 0); });

            // Jumlah = kantor + luarKantor + itsbat
            const jumlah = (d.kantor || 0) + (d.luarKantor || 0) + (d.itsbat || 0);
            totalJumlah += jumlah;

            // Hanya row KUA milik operator sendiri yang editable
            const isOwnKUA    = isOperator && currentUser.kua === kua;
            const rowEditable = canEdit && isOwnKUA;

            // Render 29 data cells
            let rowCells = '';
            FIELD_KEYS.forEach(k => {
                if (rowEditable) {
                    rowCells += `<td class="edit-cell"><input type="number" min="0" class="inline-input" data-kua="${kua}" data-field="${k}" value="${d[k] || 0}"></td>`;
                } else {
                    rowCells += `<td class="text-right">${d[k] || 0}</td>`;
                }
            });

            html += `<tr${rowEditable ? ' class="editable-row"' : ''}>
                <td class="text-center">${no++}</td>
                <td>${kua}</td>
                <td class="text-right">${jumlah}</td>
                ${rowCells}
            </tr>`;
        }

        // Total row
        let totalCells = '';
        FIELD_KEYS.forEach(k => { totalCells += `<td class="text-right">${totals[k]}</td>`; });
        html += `<tr class="total-row">
            <td colspan="2" class="text-center font-weight-bold">TOTAL</td>
            <td class="text-right">${totalJumlah}</td>
            ${totalCells}
        </tr>`;

        tbody.innerHTML = html;
    } catch (e) {
        debugLog('NIKAH', 'Error loading data table', e);
        tbody.innerHTML = `<tr><td colspan="${TABLE_COLS}" class="text-center text-danger">Gagal memuat data</td></tr>`;
    }
}

// ===== UPDATE ALERT STATUS BULAN =====
function updateMonthStatusInfo(isOperator, bulanSpesifik, statusBulan) {
    const el = document.getElementById('monthStatusInfo');
    if (!el) return;

    // Hanya tampil kalau Operator dan bulan spesifik dipilih
    if (!isOperator || !bulanSpesifik) {
        el.style.display = 'none';
        return;
    }

    if (statusBulan === 'locked') {
        el.className = 'alert danger';
        el.innerHTML = '🔒 Bulan ini sudah <strong>dikunci</strong>. Hubungi Admin untuk membuka.';
    } else {
        el.className = 'alert success';
        el.innerHTML = '✅ Bulan ini <strong>terbuka</strong> untuk input data.';
    }
    el.style.display = 'block';
}

// ===== SAVE OPERATOR DATA =====
// Diklik dari tombol "💾 Simpan Data" di bawah tabel
async function saveOperatorData() {
    const tableMonth = parseInt(document.getElementById('tableFilterMonth').value);
    const tableYear  = parseInt(document.getElementById('tableFilterYear').value);
    const kua        = currentUser.kua;

    // Kumpulkan semua input dari row milik operator
    const inputs = document.querySelectorAll(`.inline-input[data-kua="${kua}"]`);
    if (inputs.length === 0) {
        showNotification('Tidak ada data untuk disimpan', 'error');
        return;
    }

    const nikahData = {};
    inputs.forEach(inp => {
        nikahData[inp.dataset.field] = parseInt(inp.value) || 0;
    });
    // Isi field yang mungkin missing
    FIELD_KEYS.forEach(k => { if (!(k in nikahData)) nikahData[k] = 0; });

    try {
        await apiCall('saveNikahData', {
            kua: kua,
            month: tableMonth,
            year: tableYear,
            nikahData: nikahData,
            userId: currentUser.id,
            username: currentUser.username,
            userRole: currentUser.role
        });
        showNotification('Data berhasil disimpan ✅', 'success');
        // Refresh tabel
        loadTableData();
    } catch (e) {
        debugLog('NIKAH', 'Error saving data', e);
        showNotification(e.message || 'Gagal menyimpan data', 'error');
    }
}

// ===== KUA INFO MANAGEMENT =====
async function loadAllKUAInfo() {
    try {
        const data = await apiCall('getAllKUAInfo', {});
        allKUAInfo = {};
        data.forEach(info => { allKUAInfo[info.kua] = info; });
    } catch (e) {
        debugLog('NIKAH', 'Error loading KUA info', e);
    }
}

function showKUAInfoModal() {
    ModalManager.show('kuaInfoModal');
    displayKUAInfoTable();
}

function closeKUAInfoModal() {
    ModalManager.hide('kuaInfoModal');
}

function displayKUAInfoTable() {
    const tbody = document.getElementById('kuaInfoTableBody');
    if (!tbody) return;
    let html = '';
    APP_CONFIG.KUA_LIST.forEach(kua => {
        const info = allKUAInfo[kua] || { kepalaKUA: '-', nip: '-' };
        html += `<tr>
            <td>${kua}</td>
            <td>${info.kepalaKUA || '-'}</td>
            <td>${info.nip || '-'}</td>
            <td><button class="btn btn-sm" onclick="editKUAInfo('${kua}')">Edit</button></td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

function editKUAInfo(kua) {
    const info = allKUAInfo[kua] || { kepalaKUA: '', nip: '' };
    document.getElementById('editKUAName').value = kua;
    document.getElementById('editKepalaKUA').value = info.kepalaKUA || '';
    document.getElementById('editNIP').value = info.nip || '';
    ModalManager.show('editKUAInfoModal');
}

function closeEditKUAInfoModal() {
    ModalManager.hide('editKUAInfoModal');
}

async function handleSaveKUAInfo(event) {
    event.preventDefault();
    const kua       = document.getElementById('editKUAName').value;
    const kepalaKUA = document.getElementById('editKepalaKUA').value;
    const nip       = document.getElementById('editNIP').value;
    try {
        await apiCall('updateKUAInfo', {
            kua, kepalaKUA, nip,
            userId: currentUser.id,
            username: currentUser.username,
            userRole: currentUser.role
        });
        showNotification('Info KUA berhasil diupdate', 'success');
        closeEditKUAInfoModal();
        await loadAllKUAInfo();
        displayKUAInfoTable();
    } catch (e) {
        debugLog('NIKAH', 'Error saving KUA info', e);
        showNotification(e.message || 'Gagal menyimpan info KUA', 'error');
    }
}

// ===== MONTH STATUS MANAGEMENT (Modal Admin) =====
function showMonthStatusModal() {
    ModalManager.show('monthStatusModal');
    const sel = document.getElementById('monthStatusYear');
    if (sel) sel.value = currentYear;
    modalStatusYear = currentYear;
    loadAndDisplayModalStatuses(modalStatusYear);
}

function closeMonthStatusModal() {
    ModalManager.hide('monthStatusModal');
}

async function loadAndDisplayModalStatuses(year) {
    try {
        modalMonthStatuses = await apiCall('getNikahMonthStatus', { year: year });
        displayMonthStatusGrid();
    } catch (e) {
        debugLog('NIKAH', 'Error loading modal month statuses', e);
    }
}

function handleMonthStatusYearChange() {
    modalStatusYear = parseInt(document.getElementById('monthStatusYear').value);
    loadAndDisplayModalStatuses(modalStatusYear);
}

function displayMonthStatusGrid() {
    const grid = document.getElementById('monthStatusGrid');
    if (!grid) return;
    const months = ['Januari','Februari','Maret','April','Mei','Juni',
                    'Juli','Agustus','September','Oktober','November','Desember'];
    let html = '';
    months.forEach((name, idx) => {
        const m      = idx + 1;
        const status = modalMonthStatuses[m] || 'open';
        const statusText = status === 'open' ? '🔓 Terbuka' : '🔒 Terkunci';
        html += `<div class="month-card ${status}" onclick="toggleMonthStatus(${m})">
            <div class="month-name">${name}</div>
            <div class="month-status">${statusText}</div>
        </div>`;
    });
    grid.innerHTML = html;
}

async function toggleMonthStatus(month) {
    if (currentUser.role !== 'Admin') {
        showNotification('Hanya Admin yang dapat mengubah status bulan', 'error');
        return;
    }
    try {
        const result = await apiCall('toggleNikahMonthStatus', {
            year: modalStatusYear,
            month: month,
            userId: currentUser.id,
            username: currentUser.username,
            userRole: currentUser.role
        });
        modalMonthStatuses[month] = result.status;
        displayMonthStatusGrid();
        showNotification(`Bulan berhasil ${result.status === 'open' ? 'dibuka' : 'dikunci'}`, 'success');

        // Kalau tabel sedang menampilkan tahun yang sama, refresh tabel
        const tableYear = parseInt(document.getElementById('tableFilterYear').value);
        if (modalStatusYear === tableYear) {
            loadTableData();
        }
    } catch (e) {
        debugLog('NIKAH', 'Error toggling month status', e);
        showNotification(e.message || 'Gagal mengubah status bulan', 'error');
    }
}

// ===== EXPORT =====
function showExportModal() {
    ModalManager.show('exportModal');
}

function closeExportModal() {
    ModalManager.hide('exportModal');
}

function handleExportTypeChange() {
    const type = document.getElementById('exportType').value;
    document.getElementById('exportMonthGroup').style.display = (type === 'monthly') ? 'block' : 'none';
}

async function handleExport(event) {
    event.preventDefault();
    const exportType  = document.getElementById('exportType').value;
    const exportYear  = parseInt(document.getElementById('exportYear').value);
    const exportMonth = parseInt(document.getElementById('exportMonth').value);

    try {
        showNotification('Membuat file export...', 'info');

        const result = await apiCall('exportNikahExcel', {
            exportType, year: exportYear, month: exportMonth
        });

        // Buka downloadUrl di tab baru — browser langsung download xlsx
        const link = document.createElement('a');
        link.href   = result.downloadUrl;
        link.download = result.fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showNotification('Download dimulai...', 'success');
        closeExportModal();

        // Cleanup file temp di Drive setelah 5 detik (best-effort)
        setTimeout(async () => {
            try { await apiCall('cleanupExportFile', { fileId: result.fileId }); }
            catch (e) { /* silent */ }
        }, 5000);

    } catch (e) {
        debugLog('NIKAH', 'Error exporting', e);
        showNotification(e.message || 'Gagal export data', 'error');
    }
}

// ===== EXPOSE TO WINDOW =====
window.handleYearChange            = handleYearChange;
window.handleTableFilterChange     = handleTableFilterChange;
window.saveOperatorData            = saveOperatorData;
window.showKUAInfoModal            = showKUAInfoModal;
window.closeKUAInfoModal           = closeKUAInfoModal;
window.editKUAInfo                 = editKUAInfo;
window.closeEditKUAInfoModal       = closeEditKUAInfoModal;
window.handleSaveKUAInfo           = handleSaveKUAInfo;
window.showMonthStatusModal        = showMonthStatusModal;
window.closeMonthStatusModal       = closeMonthStatusModal;
window.handleMonthStatusYearChange = handleMonthStatusYearChange;
window.toggleMonthStatus           = toggleMonthStatus;
window.showExportModal             = showExportModal;
window.closeExportModal            = closeExportModal;
window.handleExportTypeChange      = handleExportTypeChange;
window.handleExport                = handleExport;