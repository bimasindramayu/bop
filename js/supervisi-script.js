// ===== SUPERVISI DASHBOARD SCRIPT =====
// File: supervisi-script.js
// Untuk: supervisi-dashboard.html

// =====================================================================
// COLUMN INDEX MAP (0-based dari spreadsheet)
// A=0, B=1 ... E=4 ... G=6 ... K=10 ... L=11 ... N=13 ... R=17 ...
// Z=25 ... AD=29 ... AK=36 ... AZ=51 ... CD=81
// =====================================================================
var COL = {
    KUA:            4,   // E  – KUA
    NO_PERFORASI:   6,   // G  – No Perforasi
    NO_PENDAFTARAN: 10,  // K  – No Pendaftaran
    TGL_DAFTAR:     11,  // L  – Tanggal Daftar
    NAMA_SUAMI:     13,  // N  – Nama Suami
    WN_SUAMI:       17,  // R  – Warganegara Suami
    NAMA_ISTRI:     25,  // Z  – Nama Istri
    WN_ISTRI:       29,  // AD – Warganegara Istri
    TGL_AKAD:       36,  // AK – Tanggal Akad
    NTPN:           51,  // AZ – NTPN
    TEMPAT_NIKAH:   81   // CD – Tempat Nikah
};

// =====================================================================
// GLOBAL STATE
// =====================================================================
var currentUser     = null;
var allData         = [];    // Raw rows (array of arrays), sumber kebenaran tunggal
var allHeaders      = [];    // Header row
var loadedFileName  = '';
var loadedFileId    = '';
var sortState       = {};    // { tabId: { col: N, dir: 'asc'|'desc' } }
var activeFilters   = {};    // { tabId: filterObject }

// ── Persistensi Tab ───────────────────────────────────────────────────
// Setiap tab punya versi render-nya sendiri.
// Ketika allData berubah → dataVersion naik → semua tab perlu re-render.
// Ketika filter/sort tab berubah → tabVersion[tabId] naik → hanya tab itu re-render.
// switchTab() hanya re-render jika versi tidak cocok.
var dataVersion     = 0;                    // naik setiap kali allData berubah
var tabDataVersion  = {};                   // { tabId: versi saat tab di-render }
var tabFilterVersion = {};                  // { tabId: versi filter+sort tab }

// =====================================================================
// TAB DEFINITIONS
// (fungsi auto-filter dideklarasikan setelah const ini, tapi hoist aman)
// =====================================================================
var TAB_IDS = ['kantor', 'wna', 'kurang12', 'ntpn'];

// =====================================================================
// BULAN INDONESIA
// =====================================================================
var BULAN_ID = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// =====================================================================
// DATE UTILITIES
// =====================================================================
function parseDate(val) {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    var s = String(val).trim();
    if (!s) return null;
    var d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

function daysBetween(d1, d2) {
    if (!d1 || !d2) return null;
    return Math.floor((d2 - d1) / 86400000);
}

function formatDate(val) {
    var d = parseDate(val);
    if (!d) return val || '';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getMonthNumber(val) {
    var d = parseDate(val);
    return d ? d.getMonth() + 1 : null;
}

function formatISODate(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return String(d);
    var y   = d.getFullYear();
    var m   = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

// =====================================================================
// AUTO-FILTER FUNCTIONS
// =====================================================================
function filterKantorKUA(rows) {
    return rows.filter(function(row) {
        var val = String(row[COL.TEMPAT_NIKAH] || '').toUpperCase();
        return val.indexOf('KUA / KANTOR') !== -1;
    });
}

function filterWNA(rows) {
    return rows.filter(function(row) {
        var suami = String(row[COL.WN_SUAMI] || '').toUpperCase();
        var istri  = String(row[COL.WN_ISTRI]  || '').toUpperCase();
        return suami === 'WNA' || istri === 'WNA';
    });
}

function filterKurang12(rows) {
    return rows.filter(function(row) {
        var tglAkad  = parseDate(row[COL.TGL_AKAD]);
        var tglDaftar = parseDate(row[COL.TGL_DAFTAR]);
        var diff = daysBetween(tglDaftar, tglAkad);
        return diff !== null && diff < 12;
    });
}

function getAutoFilter(tabId) {
    var map = {
        kantor:   filterKantorKUA,
        wna:      filterWNA,
        kurang12: filterKurang12,
        ntpn:     null
    };
    return map[tabId] || null;
}

// =====================================================================
// USER FILTER LOGIC
// =====================================================================
function applyUserFilters(rows, filters) {
    if (!filters) return rows;
    return rows.filter(function(row) {
        if (filters.kua && filters.kua !== '') {
            if (String(row[COL.KUA] || '').toLowerCase().indexOf(filters.kua.toLowerCase()) === -1) return false;
        }
        if (filters.bulan && filters.bulan.length > 0) {
            var m = getMonthNumber(row[COL.TGL_AKAD]);
            if (filters.bulan.indexOf(m) === -1) return false;
        }
        if (filters.tglAkadFrom) {
            var d = parseDate(row[COL.TGL_AKAD]);
            if (!d || d < new Date(filters.tglAkadFrom)) return false;
        }
        if (filters.tglAkadTo) {
            var d2 = parseDate(row[COL.TGL_AKAD]);
            if (!d2 || d2 > new Date(filters.tglAkadTo + 'T23:59:59')) return false;
        }
        if (filters.noPerforasi) {
            if (String(row[COL.NO_PERFORASI] || '').toLowerCase().indexOf(filters.noPerforasi.toLowerCase()) === -1) return false;
        }
        if (filters.noPendaftaran) {
            if (String(row[COL.NO_PENDAFTARAN] || '').toLowerCase().indexOf(filters.noPendaftaran.toLowerCase()) === -1) return false;
        }
        if (filters.tglDaftar) {
            var rowDate = String(row[COL.TGL_DAFTAR] || '').substring(0, 10);
            if (rowDate !== filters.tglDaftar) return false;
        }
        if (filters.namaSuami) {
            if (String(row[COL.NAMA_SUAMI] || '').toLowerCase().indexOf(filters.namaSuami.toLowerCase()) === -1) return false;
        }
        if (filters.namaIstri) {
            if (String(row[COL.NAMA_ISTRI] || '').toLowerCase().indexOf(filters.namaIstri.toLowerCase()) === -1) return false;
        }
        if (filters.tempatNikah) {
            if (String(row[COL.TEMPAT_NIKAH] || '').toLowerCase().indexOf(filters.tempatNikah.toLowerCase()) === -1) return false;
        }
        if (filters.ntpn) {
            if (String(row[COL.NTPN] || '').toLowerCase().indexOf(filters.ntpn.toLowerCase()) === -1) return false;
        }
        return true;
    });
}

// =====================================================================
// GET FILTERED DATA FOR A TAB (pure function, no DOM side-effects)
// =====================================================================
function getTabData(tabId) {
    if (allData.length === 0) return [];
    var rows = allData.slice(); // shallow copy
    var autoFn = getAutoFilter(tabId);
    if (autoFn) rows = autoFn(rows);
    rows = applyUserFilters(rows, activeFilters[tabId] || {});
    var sort = sortState[tabId];
    if (sort) {
        var dir = sort.dir === 'asc' ? 1 : -1;
        rows.sort(function(a, b) {
            var va = a[sort.col] != null ? a[sort.col] : '';
            var vb = b[sort.col] != null ? b[sort.col] : '';
            var na = parseFloat(va), nb = parseFloat(vb);
            if (!isNaN(na) && !isNaN(nb)) return (na - nb) * dir;
            return String(va).localeCompare(String(vb), 'id') * dir;
        });
    }
    return rows;
}

// =====================================================================
// BUILD COLUMN LAYOUT FOR A TAB
// NTPN tab: pindah kolom AZ ke posisi setelah G (NO_PERFORASI)
// =====================================================================
function buildTabColumns(tabId) {
    if (allHeaders.length === 0) return { headers: [], indices: [] };
    if (tabId !== 'ntpn') {
        return {
            headers: allHeaders.slice(),
            indices: allHeaders.map(function(_, i) { return i; })
        };
    }
    // NTPN: reorder
    var indices = [];
    for (var i = 0; i < allHeaders.length; i++) {
        if (i === COL.NO_PERFORASI) {
            indices.push(i);
            if (COL.NTPN < allHeaders.length) indices.push(COL.NTPN);
        } else if (i !== COL.NTPN) {
            indices.push(i);
        }
    }
    return {
        headers: indices.map(function(i) { return allHeaders[i]; }),
        indices: indices
    };
}

// =====================================================================
// RENDER TABLE (hanya tulis ke DOM, tidak ada fetch)
// =====================================================================
var RENDER_LIMIT = 2000;

function renderTable(tabId) {
    var container = document.getElementById('table-' + tabId);
    if (!container) return;

    if (allData.length === 0) {
        container.innerHTML = buildEmptyState(
            'Belum ada data dimuat',
            'Muat data terlebih dahulu dari tab Dashboard Utama.'
        );
        return;
    }

    var rows = getTabData(tabId);
    var cols = buildTabColumns(tabId);

    if (rows.length === 0) {
        container.innerHTML = buildEmptyState(
            'Tidak ada data',
            'Tidak ada data yang cocok dengan filter yang diterapkan.'
        );
        updateBadge(tabId, 0);
        return;
    }

    updateBadge(tabId, rows.length);

    var sort = sortState[tabId] || {};
    var displayRows = rows.slice(0, RENDER_LIMIT);

    // Build HTML as string array (lebih cepat dari string concat)
    var parts = [];

    // Info bar
    parts.push(
        '<div class="data-info-bar">' +
        '<div class="count-display">Menampilkan <span>' +
        rows.length.toLocaleString('id-ID') + '</span> data' +
        (rows.length !== allData.length
            ? ' dari ' + allData.length.toLocaleString('id-ID') + ' total'
            : '') +
        '</div>' +
        '<button class="btn btn-warning btn-sm" onclick="copyTable(\'' + tabId + '\')">📋 Salin Tabel</button>' +
        '</div>'
    );

    // Table
    parts.push('<div class="table-container"><table id="dataTable-' + tabId + '"><thead><tr>');
    parts.push('<th class="col-no">#</th>');

    cols.headers.forEach(function(h, idx) {
        var colI = cols.indices[idx];
        var sortCls = '';
        if (sort.col === colI) sortCls = sort.dir === 'asc' ? 'sort-asc' : 'sort-desc';
        var hlCls = (tabId === 'ntpn' && colI === COL.NTPN) ? ' highlight' : '';
        parts.push(
            '<th class="' + sortCls + hlCls + '" ' +
            'onclick="toggleSort(\'' + tabId + '\',' + colI + ')" ' +
            'title="Klik untuk urutkan">' +
            escHtml(String(h)) + '</th>'
        );
    });
    parts.push('</tr></thead><tbody>');

    displayRows.forEach(function(row, idx) {
        parts.push('<tr><td class="col-no">' + (idx + 1) + '</td>');
        cols.indices.forEach(function(colI) {
            var val = row[colI] != null ? row[colI] : '';
            var display = (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val))
                ? formatDate(val)
                : escHtml(String(val));
            parts.push('<td title="' + escHtml(String(val)) + '">' + display + '</td>');
        });
        parts.push('</tr>');
    });

    if (rows.length > RENDER_LIMIT) {
        parts.push(
            '<tr><td colspan="' + (cols.headers.length + 1) + '" ' +
            'style="text-align:center;padding:16px;color:#667eea;font-weight:600;background:#f0f2ff;">' +
            '⚠️ Menampilkan ' + RENDER_LIMIT.toLocaleString() + ' dari ' +
            rows.length.toLocaleString() + ' data. Gunakan filter untuk mempersempit hasil.' +
            '</td></tr>'
        );
    }

    parts.push('</tbody></table></div>');
    container.innerHTML = parts.join('');
}

function escHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buildEmptyState(title, msg) {
    var icon = title.indexOf('Belum') !== -1 ? '📋' : '🔍';
    return (
        '<div class="empty-state">' +
        '<div class="empty-icon">' + icon + '</div>' +
        '<h3>' + escHtml(title) + '</h3>' +
        '<p>' + escHtml(msg) + '</p>' +
        '</div>'
    );
}

// =====================================================================
// VERSION-AWARE TAB REFRESH
// Tab hanya di-render ulang jika versi data atau filter/sort berubah.
// Ini yang mencegah data hilang saat pindah tab.
// =====================================================================
function getTabStateKey(tabId) {
    // Buat string yang merepresentasikan state tab saat ini
    return JSON.stringify({
        dv:  dataVersion,
        f:   activeFilters[tabId] || {},
        s:   sortState[tabId] || null
    });
}

function isTabStale(tabId) {
    var currentKey = getTabStateKey(tabId);
    return tabFilterVersion[tabId] !== currentKey;
}

function markTabFresh(tabId) {
    tabFilterVersion[tabId] = getTabStateKey(tabId);
}

/**
 * Re-render satu tab HANYA jika stale.
 * Dipanggil oleh switchTab() dan setelah filter/sort berubah.
 */
function refreshTabIfStale(tabId) {
    if (isTabStale(tabId)) {
        renderTable(tabId);
        markTabFresh(tabId);
    }
}

/**
 * Paksa semua tab untuk di-render (dipanggil setelah loadData).
 */
function invalidateAllTabs() {
    dataVersion++;
    TAB_IDS.forEach(function(tabId) {
        tabFilterVersion[tabId] = null; // akan stale
    });
}

/**
 * Re-render semua tab (paksa, setelah data baru dimuat).
 */
function renderAllTabs() {
    TAB_IDS.forEach(function(tabId) {
        renderTable(tabId);
        markTabFresh(tabId);
    });
}

// =====================================================================
// BADGE & STATS
// =====================================================================
function updateBadge(tabId, count) {
    var badge = document.getElementById('badge-' + tabId);
    if (badge) badge.textContent = count.toLocaleString('id-ID');
}

function updateDashboardStats() {
    var total    = allData.length;
    var kantor   = filterKantorKUA(allData).length;
    var wna      = filterWNA(allData).length;
    var kurang12 = filterKurang12(allData).length;
    var ntpn     = allData.filter(function(r) {
        return String(r[COL.NTPN] || '').trim() !== '';
    }).length;

    function setEl(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val.toLocaleString('id-ID');
    }
    setEl('stat-total',    total);
    setEl('stat-kantor',   kantor);
    setEl('stat-wna',      wna);
    setEl('stat-kurang12', kurang12);
    setEl('stat-ntpn',     ntpn);
}

// =====================================================================
// SORT
// =====================================================================
function toggleSort(tabId, colIndex) {
    var current = sortState[tabId];
    if (current && current.col === colIndex) {
        sortState[tabId] = { col: colIndex, dir: current.dir === 'asc' ? 'desc' : 'asc' };
    } else {
        sortState[tabId] = { col: colIndex, dir: 'asc' };
    }
    // Render langsung (user sudah di tab ini) + mark fresh
    renderTable(tabId);
    markTabFresh(tabId);
    updateBadge(tabId, getTabData(tabId).length);
}

// =====================================================================
// COPY TABLE
// =====================================================================
function copyTable(tabId) {
    var rows = getTabData(tabId);
    var cols = buildTabColumns(tabId);
    var lines = [];
    lines.push(['#'].concat(cols.headers).join('\t'));
    rows.forEach(function(row, idx) {
        lines.push([idx + 1].concat(cols.indices.map(function(i) {
            return row[i] != null ? row[i] : '';
        })).join('\t'));
    });
    var text = lines.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(function() { showNotification('Tabel berhasil disalin ke clipboard', 'success'); })
            .catch(function() { fallbackCopy(text); });
    } else {
        fallbackCopy(text);
    }
}

function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
        document.execCommand('copy');
        showNotification('Tabel berhasil disalin', 'success');
    } catch (e) {
        showNotification('Gagal menyalin tabel', 'error');
    }
    document.body.removeChild(ta);
}

// =====================================================================
// FILTER – APPLY & RESET
// =====================================================================
function getFilterValues(tabId) {
    function val(id) {
        var el = document.getElementById(id);
        return el ? el.value.trim() : '';
    }
    return {
        kua:           val('f-' + tabId + '-kua'),
        bulan:         getSelectedMonths(tabId),
        tglAkadFrom:   val('f-' + tabId + '-tglAkadFrom'),
        tglAkadTo:     val('f-' + tabId + '-tglAkadTo'),
        noPerforasi:   val('f-' + tabId + '-noPerforasi'),
        noPendaftaran: val('f-' + tabId + '-noPendaftaran'),
        tglDaftar:     val('f-' + tabId + '-tglDaftar'),
        namaSuami:     val('f-' + tabId + '-namaSuami'),
        namaIstri:     val('f-' + tabId + '-namaIstri'),
        tempatNikah:   val('f-' + tabId + '-tempatNikah'),
        ntpn:          val('f-' + tabId + '-ntpn')
    };
}

function applyFilter(tabId) {
    activeFilters[tabId] = getFilterValues(tabId);
    // Render langsung (user sudah ada di tab ini)
    renderTable(tabId);
    markTabFresh(tabId);
}

function resetFilter(tabId) {
    activeFilters[tabId] = {};
    sortState[tabId] = null;
    var section = document.getElementById('filterSection-' + tabId);
    if (section) {
        section.querySelectorAll('input[type="text"], input[type="date"]')
            .forEach(function(el) { el.value = ''; });
        section.querySelectorAll('select')
            .forEach(function(el) { el.selectedIndex = 0; });
    }
    var cbs = document.querySelectorAll('.month-cb-' + tabId);
    cbs.forEach(function(cb) { cb.checked = true; });
    updateMonthLabel(tabId);
    renderTable(tabId);
    markTabFresh(tabId);
}

// =====================================================================
// MONTH MULTI-SELECT
// =====================================================================
function buildMonthOptions(tabId) {
    var dropdown = document.getElementById('monthDropdown-' + tabId);
    if (!dropdown) return;
    var existing = dropdown.querySelectorAll('.month-item');
    existing.forEach(function(e) { e.remove(); });

    var rows = allData.slice();
    var autoFn = getAutoFilter(tabId);
    if (autoFn) rows = autoFn(rows);

    var presentMonths = {};
    rows.forEach(function(row) {
        var m = getMonthNumber(row[COL.TGL_AKAD]);
        if (m) presentMonths[m] = true;
    });
    var months = Object.keys(presentMonths).map(Number).sort(function(a, b) { return a - b; });

    months.forEach(function(m) {
        var item = document.createElement('div');
        item.className = 'multiselect-item month-item';
        item.innerHTML =
            '<input type="checkbox" class="month-cb-' + tabId + '" ' +
            'value="' + m + '" checked ' +
            'onchange="updateMonthLabel(\'' + tabId + '\')"> ' + BULAN_ID[m];
        dropdown.appendChild(item);
    });
    updateMonthLabel(tabId);
}

function toggleMonthDropdown(tabId) {
    var trigger  = document.getElementById('monthTrigger-' + tabId);
    var dropdown = document.getElementById('monthDropdown-' + tabId);
    if (!trigger || !dropdown) return;
    trigger.classList.toggle('open');
    dropdown.classList.toggle('open');
}

function toggleAllMonths(tabId) {
    var allCb = document.getElementById('monthAll-' + tabId);
    var cbs   = document.querySelectorAll('.month-cb-' + tabId);
    cbs.forEach(function(cb) { cb.checked = allCb.checked; });
    updateMonthLabel(tabId);
}

function updateMonthLabel(tabId) {
    var cbs     = Array.from(document.querySelectorAll('.month-cb-' + tabId));
    var allCb   = document.getElementById('monthAll-' + tabId);
    var checked = cbs.filter(function(cb) { return cb.checked; });
    var label   = document.getElementById('monthLabel-' + tabId);
    if (!label) return;
    if (allCb) allCb.checked = (checked.length === cbs.length);
    if (cbs.length === 0 || checked.length === cbs.length) {
        label.textContent = '-- Semua Bulan --';
    } else if (checked.length === 0) {
        label.textContent = 'Tidak ada bulan dipilih';
    } else {
        label.textContent = checked.map(function(cb) {
            return BULAN_ID[parseInt(cb.value)];
        }).join(', ');
    }
}

function getSelectedMonths(tabId) {
    var cbs     = Array.from(document.querySelectorAll('.month-cb-' + tabId));
    var checked = cbs.filter(function(cb) { return cb.checked; });
    if (cbs.length === 0 || checked.length === cbs.length) return []; // kosong = tanpa filter
    return checked.map(function(cb) { return parseInt(cb.value); });
}

// =====================================================================
// KUA DROPDOWN OPTIONS
// =====================================================================
function buildKUAOptions(tabId) {
    var sel = document.getElementById('f-' + tabId + '-kua');
    if (!sel) return;
    var rows = allData.slice();
    var autoFn = getAutoFilter(tabId);
    if (autoFn) rows = autoFn(rows);
    var kuas = {};
    rows.forEach(function(row) {
        var v = String(row[COL.KUA] || '').trim();
        if (v) kuas[v] = true;
    });
    sel.innerHTML = '<option value="">-- Semua KUA --</option>';
    Object.keys(kuas).sort().forEach(function(k) {
        var opt = document.createElement('option');
        opt.value = k;
        opt.textContent = k;
        sel.appendChild(opt);
    });
}

// =====================================================================
// TAB SWITCHING — hanya re-render jika state stale
// =====================================================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(function(el) {
        el.classList.remove('active');
    });
    document.querySelectorAll('.tab-btn').forEach(function(el) {
        el.classList.remove('active');
    });
    var content = document.getElementById(tabId);
    var btn     = document.getElementById('btn-' + tabId);
    if (content) content.classList.add('active');
    if (btn) btn.classList.add('active');

    // Tutup dropdown bulan yang terbuka
    document.querySelectorAll('.multiselect-dropdown.open').forEach(function(d) {
        d.classList.remove('open');
    });
    document.querySelectorAll('.multiselect-trigger.open').forEach(function(t) {
        t.classList.remove('open');
    });

    // Re-render tab tujuan HANYA jika state berubah sejak terakhir render
    var realTabId = tabId.replace('tab-', ''); // 'tab-kantor' → 'kantor'
    if (TAB_IDS.indexOf(realTabId) !== -1) {
        refreshTabIfStale(realTabId);
    }
}

// =====================================================================
// FILTER SECTION – TOGGLE VISIBILITY
// =====================================================================
function toggleFilterSection(tabId) {
    var grid = document.querySelector('#filterSection-' + tabId + ' .filter-grid');
    var btns = document.querySelector('#filterSection-' + tabId + ' .filter-buttons');
    var btn  = document.querySelector('#filterSection-' + tabId + ' .filter-title button');
    if (!grid) return;
    var isHidden = grid.style.display === 'none';
    grid.style.display = isHidden ? 'grid' : 'none';
    if (btns) btns.style.display = isHidden ? 'flex' : 'none';
    if (btn) btn.textContent = isHidden ? 'Sembunyikan' : 'Tampilkan';
}

// =====================================================================
// INJECT FILTER SECTIONS INTO DATA TABS
// =====================================================================
function setupTabFilters() {
    TAB_IDS.forEach(function(tabId) {
        var filterDiv = document.getElementById('filter-' + tabId);
        if (!filterDiv) return;

        filterDiv.innerHTML =
            '<div class="filter-section" id="filterSection-' + tabId + '">' +
            '<div class="filter-title">' +
            '<span>🔎 Filter Data</span>' +
            '<button class="btn btn-secondary btn-sm" onclick="toggleFilterSection(\'' + tabId + '\')">Sembunyikan</button>' +
            '</div>' +
            '<div class="filter-grid">' +

            '<div class="filter-group"><label>KUA (Kolom E)</label>' +
            '<select id="f-' + tabId + '-kua"><option value="">-- Semua KUA --</option></select></div>' +

            '<div class="filter-group"><label>Bulan Akad (Kolom AK)</label>' +
            '<div class="multiselect-wrapper">' +
            '<button type="button" class="multiselect-trigger" onclick="toggleMonthDropdown(\'' + tabId + '\')" id="monthTrigger-' + tabId + '">' +
            '<span id="monthLabel-' + tabId + '">-- Semua Bulan --</span><span class="arrow">▼</span>' +
            '</button>' +
            '<div class="multiselect-dropdown" id="monthDropdown-' + tabId + '">' +
            '<div class="multiselect-select-all" onclick="toggleAllMonths(\'' + tabId + '\')">' +
            '<input type="checkbox" id="monthAll-' + tabId + '" checked> Pilih Semua</div>' +
            '</div></div></div>' +

            '<div class="filter-group"><label>Tanggal Akad Dari</label>' +
            '<input type="date" id="f-' + tabId + '-tglAkadFrom"></div>' +

            '<div class="filter-group"><label>Tanggal Akad Sampai</label>' +
            '<input type="date" id="f-' + tabId + '-tglAkadTo"></div>' +

            '<div class="filter-group"><label>No Perforasi (Kolom G)</label>' +
            '<input type="text" id="f-' + tabId + '-noPerforasi" placeholder="Cari no perforasi..."></div>' +

            '<div class="filter-group"><label>No Pendaftaran (Kolom K)</label>' +
            '<input type="text" id="f-' + tabId + '-noPendaftaran" placeholder="Cari no pendaftaran..."></div>' +

            '<div class="filter-group"><label>Tanggal Daftar (Kolom L)</label>' +
            '<input type="date" id="f-' + tabId + '-tglDaftar"></div>' +

            '<div class="filter-group"><label>Nama Suami (Kolom N)</label>' +
            '<input type="text" id="f-' + tabId + '-namaSuami" placeholder="Cari nama suami..."></div>' +

            '<div class="filter-group"><label>Nama Istri (Kolom Z)</label>' +
            '<input type="text" id="f-' + tabId + '-namaIstri" placeholder="Cari nama istri..."></div>' +

            '<div class="filter-group"><label>Tempat Nikah (Kolom CD)</label>' +
            '<input type="text" id="f-' + tabId + '-tempatNikah" placeholder="Cari tempat nikah..."></div>' +

            '<div class="filter-group"><label>NTPN (Kolom AZ)</label>' +
            '<input type="text" id="f-' + tabId + '-ntpn" placeholder="Cari NTPN..."></div>' +

            '</div>' + // .filter-grid
            '<div class="filter-buttons">' +
            '<button class="btn btn-primary btn-sm" onclick="applyFilter(\'' + tabId + '\')">✅ Terapkan Filter</button>' +
            '<button class="btn btn-secondary btn-sm" onclick="resetFilter(\'' + tabId + '\')">🔄 Reset Filter</button>' +
            '</div>' +
            '</div>'; // .filter-section

        // Show empty state in table div
        var tableDiv = document.getElementById('table-' + tabId);
        if (tableDiv) {
            tableDiv.innerHTML = buildEmptyState(
                'Belum ada data dimuat',
                'Muat data terlebih dahulu dari tab Dashboard Utama.'
            );
        }
    });
}

// =====================================================================
// FILE LIST
// =====================================================================
async function refreshFileList(forceRefresh) {
    if (forceRefresh) {
        // Invalidate cache agar ambil ulang dari server
        if (typeof invalidateSupervisiFilesCache === 'function') {
            invalidateSupervisiFilesCache();
        }
    }

    setLoadingText('Memuat daftar file...');
    showLoading();

    try {
        var files = await apiCall('getSupervisiFiles', {});
        populateFileSelect(files || []);
        if (files && files.length > 0) {
            showNotification(files.length + ' file ditemukan', 'success');
        } else {
            showNotification('Tidak ada file ditemukan di folder Drive', 'warning');
        }
    } catch (err) {
        showNotification(err.message || 'Gagal memuat daftar file', 'error');
    } finally {
        hideLoading();
    }
}

function populateFileSelect(files) {
    var sel = document.getElementById('fileSelect');
    if (!sel) return;
    sel.innerHTML = '<option value="">-- Pilih File --</option>';
    files.forEach(function(f) {
        var opt = document.createElement('option');
        opt.value = f.id;
        opt.textContent = f.name + (f.modifiedDate
            ? ' (' + new Date(f.modifiedDate).toLocaleDateString('id-ID') + ')'
            : '');
        sel.appendChild(opt);
    });
    // Re-select file yang sudah dipilih sebelumnya jika ada
    if (loadedFileId) {
        sel.value = loadedFileId;
    }
    document.getElementById('btnLoadData').disabled = !sel.value;
}

// =====================================================================
// LOAD DATA
// =====================================================================
async function loadData() {
    var sel    = document.getElementById('fileSelect');
    var fileId = sel ? sel.value : '';
    var fname  = sel ? (sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : '') : '';

    // Ambil nama bersih (hapus tanggal di akhir)
    fname = fname.replace(/\s*\(\d{1,2}\/\d{1,2}\/\d{4}\)\s*$/, '').trim();

    if (!fileId) {
        showNotification('Pilih file terlebih dahulu', 'warning');
        return;
    }

    // Jika file yang sama sudah dimuat, tanya user
    if (fileId === loadedFileId && allData.length > 0) {
        if (!confirm('File ini sudah dimuat (' + allData.length.toLocaleString('id-ID') + ' baris). Muat ulang dari server?')) {
            return;
        }
        // Invalidate cache data untuk file ini
        if (typeof invalidateSupervisiDataCache === 'function') {
            invalidateSupervisiDataCache(fileId);
        }
    }

    setLoadingText('Mengambil data dari Google Drive...');
    showProgress(10);
    showLoading();

    try {
        var result = await apiCall('getSupervisiData', { fileId: fileId });

        showProgress(60);
        setLoadingText('Memproses data...');

        var headers = [];
        var rows    = [];

        if (result && result.type === 'base64') {
            // Parse xlsx client-side pakai SheetJS
            setLoadingText('Membaca file Excel...');
            if (typeof XLSX === 'undefined') {
                throw new Error('Library SheetJS belum termuat. Pastikan tag <script> SheetJS ada di HTML.');
            }
            var workbook = XLSX.read(result.content, { type: 'base64', cellDates: true });
            var sheet    = workbook.Sheets[workbook.SheetNames[0]];
            var raw      = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

            if (raw.length > 0) {
                headers = raw[0].map(function(h) { return String(h != null ? h : ''); });
                rows = raw.slice(1)
                    .filter(function(r) {
                        return r.some(function(c) { return c !== '' && c !== null && c !== undefined; });
                    })
                    .map(function(r) {
                        return r.map(function(c) {
                            return c instanceof Date ? formatISODate(c) : (c != null ? c : '');
                        });
                    });
            }
        } else if (result && result.headers) {
            headers = result.headers;
            rows    = result.rows || [];
        } else if (result) {
            throw new Error('Format data tidak dikenali dari server');
        } else {
            throw new Error('Server tidak mengembalikan data');
        }

        showProgress(85);
        setLoadingText('Menyiapkan tampilan...');

        // ✅ Simpan ke global state
        allHeaders     = headers;
        allData        = rows;
        loadedFileName = fname;
        loadedFileId   = fileId;

        // Reset filters & sort semua tab
        activeFilters = {};
        sortState     = {};

        // Populasi filter options
        TAB_IDS.forEach(function(tabId) {
            buildKUAOptions(tabId);
            buildMonthOptions(tabId);
        });

        // Invalidate semua tab, lalu render semua
        invalidateAllTabs();
        renderAllTabs();
        updateDashboardStats();
        updateLoadedInfo();

        showProgress(100);
        hideLoading();
        hideProgress();

        showNotification(
            'Data berhasil dimuat: ' + rows.length.toLocaleString('id-ID') + ' baris',
            'success'
        );

        var btnClear = document.getElementById('btnClearData');
        var dashEmpty = document.getElementById('dashboardEmpty');
        if (btnClear) btnClear.style.display = '';
        if (dashEmpty) dashEmpty.style.display = 'none';

    } catch (err) {
        hideLoading();
        hideProgress();
        console.error('[SUPERVISI] Load error:', err);
        showNotification(err.message || 'Gagal memuat data', 'error');
    }
}

// =====================================================================
// CLEAR DATA
// =====================================================================
function clearData() {
    if (allData.length > 0 && !confirm('Hapus data yang sudah dimuat dari memori?')) return;

    allData        = [];
    allHeaders     = [];
    loadedFileName = '';
    loadedFileId   = '';
    activeFilters  = {};
    sortState      = {};

    invalidateAllTabs();

    // Reset stats
    ['total', 'kantor', 'wna', 'kurang12', 'ntpn'].forEach(function(k) {
        var el = document.getElementById('stat-' + k);
        if (el) el.textContent = '0';
    });
    TAB_IDS.forEach(function(tabId) { updateBadge(tabId, 0); });

    // Tampilkan empty state di semua tab
    TAB_IDS.forEach(function(tabId) {
        var tableDiv = document.getElementById('table-' + tabId);
        if (tableDiv) {
            tableDiv.innerHTML = buildEmptyState(
                'Belum ada data dimuat',
                'Muat data terlebih dahulu dari tab Dashboard Utama.'
            );
        }
    });

    var infoEl   = document.getElementById('loadedInfo');
    var btnClear = document.getElementById('btnClearData');
    var dashEmpty = document.getElementById('dashboardEmpty');
    if (infoEl)   infoEl.classList.add('hidden');
    if (btnClear) btnClear.style.display = 'none';
    if (dashEmpty) dashEmpty.style.display = '';

    showNotification('Data telah dihapus dari memori', 'info');
}

// =====================================================================
// LOADED INFO BAR
// =====================================================================
function updateLoadedInfo() {
    var info = document.getElementById('loadedInfo');
    var text = document.getElementById('loadedInfoText');
    if (info && text) {
        text.textContent =
            loadedFileName + ' – ' +
            allData.length.toLocaleString('id-ID') + ' baris data dimuat';
        info.classList.remove('hidden');
    }
}

// =====================================================================
// PROGRESS BAR
// =====================================================================
function showProgress(pct) {
    var bar  = document.getElementById('loadProgressBar');
    var fill = document.getElementById('loadProgressFill');
    if (bar)  bar.classList.add('active');
    if (fill) fill.style.width = pct + '%';
}

function hideProgress() {
    var bar  = document.getElementById('loadProgressBar');
    var fill = document.getElementById('loadProgressFill');
    if (bar)  bar.classList.remove('active');
    if (fill) fill.style.width = '0%';
}

function setLoadingText(text) {
    var el = document.getElementById('loadingText');
    if (el) el.textContent = text;
}

// =====================================================================
// NAVIGATION & AUTH
// =====================================================================
function backToMenu() {
    window.location.href = 'main-menu.html';
}

function logout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        SessionManager.clearUser();
        if (typeof AppCache !== 'undefined') AppCache.clear();
        window.location.href = 'index.html';
    }
}

// =====================================================================
// CLOSE MONTH DROPDOWN ON OUTSIDE CLICK
// =====================================================================
document.addEventListener('click', function(e) {
    if (!e.target.closest('.multiselect-wrapper')) {
        document.querySelectorAll('.multiselect-dropdown.open').forEach(function(d) {
            d.classList.remove('open');
        });
        document.querySelectorAll('.multiselect-trigger.open').forEach(function(t) {
            t.classList.remove('open');
        });
    }
});

// =====================================================================
// FILE SELECT CHANGE
// =====================================================================
document.addEventListener('DOMContentLoaded', function() {
    var fileSelect = document.getElementById('fileSelect');
    if (fileSelect) {
        fileSelect.addEventListener('change', function() {
            document.getElementById('btnLoadData').disabled = !this.value;
        });
    }
});

// =====================================================================
// INITIALIZATION
// =====================================================================
window.addEventListener('DOMContentLoaded', function() {
    console.log('[SUPERVISI] Initializing...');

    currentUser = SessionManager.getCurrentUser();

    if (!currentUser) {
        showNotification('Sesi berakhir. Silakan login kembali.', 'warning');
        setTimeout(function() { window.location.href = 'index.html'; }, 1500);
        return;
    }

    if (currentUser.role !== 'Admin') {
        showNotification('Akses ditolak. Hanya Admin yang dapat mengakses Supervisi Dashboard.', 'error');
        setTimeout(function() { window.location.href = 'main-menu.html'; }, 2000);
        return;
    }

    var nameEl = document.getElementById('userNameDisplay');
    var roleEl = document.getElementById('userRoleDisplay');
    if (nameEl) nameEl.textContent = currentUser.name;
    if (roleEl) roleEl.textContent = currentUser.role;

    // Inject filter sections
    setupTabFilters();

    // Load daftar file (pakai cache jika ada)
    refreshFileList(false);

    console.log('[SUPERVISI] Ready. dataVersion=' + dataVersion);
});

// =====================================================================
// GLOBAL EXPORTS
// =====================================================================
window.switchTab            = switchTab;
var _refreshFileList        = refreshFileList; // ✅ FIX: capture original before overwriting window.refreshFileList
window.refreshFileList      = function() { return _refreshFileList(true); }; // tombol refresh = force
window.loadData             = loadData;
window.clearData            = clearData;
window.applyFilter          = applyFilter;
window.resetFilter          = resetFilter;
window.toggleSort           = toggleSort;
window.copyTable            = copyTable;
window.backToMenu           = backToMenu;
window.logout               = logout;
window.toggleMonthDropdown  = toggleMonthDropdown;
window.toggleAllMonths      = toggleAllMonths;
window.toggleFilterSection  = toggleFilterSection;