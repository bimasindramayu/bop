// ===== SUPERVISI DASHBOARD SCRIPT =====
// File: supervisi-script.js – OPTIMIZED v2
// Perubahan:
//   • Tab Nikah tunggal (combobox view: semua/kantor/wna/kurang12/ntpn)
//   • Pagination ringan: 100 baris per halaman → aman di HP low-end
//   • Download XLSX (Data Nikah & Stok)
//   • Tidak render ulang kecuali diperlukan

// =====================================================================
// COLUMN INDEX MAP (0-based)
// A=0, B=1 … E=4 … G=6 … K=10 … L=11 … N=13 … R=17 …
// Z=25 … AD=29 … AK=36 … AZ=51 … CD=81
// =====================================================================
var COL = {
    KUA:            4,
    NO_PERFORASI:   6,
    NO_PENDAFTARAN: 10,
    NO_AKTA_NIKAH:  8,
    TGL_DAFTAR:     11,
    NAMA_SUAMI:     13,
    WN_SUAMI:       17,
    NAMA_ISTRI:     25,
    WN_ISTRI:       29,
    TGL_AKAD:       36,
    NTPN:           51,
    TGL_BAYAR:      -1,   // resolved dinamis dari nama header
    TEMPAT_NIKAH:   81
};

var PRIORITY_COLS = [
    4,   // KUA
    6,  // No Perforasi
    10,  // No Pendaftaran
    8,  //No Akta Nikah
    11,  // Tgl Daftar
    36,  // Tgl Akad
    13,  // Nama Suami
    17,  // WN Suami
    25,  // Nama Istri
    29,  // WN Istri
    51,  // NTPN
    -1,  // TGL_BAYAR (placeholder, resolved saat build)
    81   // Tempat Nikah
];

// Virtual column sentinel (kolom "Selisih Hari" di view kurang12)
var VIRTUAL_SELISIH = -99;

// =====================================================================
// STOK COLUMN MAP
// =====================================================================
var STOK_COL = {
    NO: 0, PROVINSI: 1, KAB: 2, KEC: 3, KUA: 4,
    NO_SERI: 5, NO_PERFORASI: 6, TAHUN_BUKU: 7,
    TGL_ALOKASI: 8, TGL_DIGUNAKAN: 9, KETERANGAN: 10, STATUS: 11
};
var DISPLAY_STOK_COLS = [
    STOK_COL.KUA, STOK_COL.NO_SERI, STOK_COL.NO_PERFORASI,
    STOK_COL.TAHUN_BUKU, STOK_COL.TGL_ALOKASI, STOK_COL.TGL_DIGUNAKAN,
    STOK_COL.KETERANGAN, STOK_COL.STATUS
];
var STOK_COL_NAMES = ['KUA','No. Seri','No. Porforasi','Tahun Buku','Tgl. Alokasi','Tgl. Digunakan','Keterangan','Status'];

// =====================================================================
// PAGINATION CONFIG
// =====================================================================
var PAGE_SIZE = (typeof window !== 'undefined' && window.innerWidth < 600) ? 50 : 100;

// =====================================================================
// GLOBAL STATE
// =====================================================================
var currentUser     = null;
var allData         = [];
var allHeaders      = [];
var loadedFileName  = '';
var loadedFileId    = '';

// Nikah tab state
var activeNikahView = 'semua';
var nikahFilters    = {};
var nikahSort       = null;  // { col, dir }
var nikahPage       = 1;
var nikahDirty      = true;  // needs re-render

// Stok state
var stokData        = [];
var stokHeaders     = [];
var stokFilters     = {};
var stokSort        = { col: STOK_COL.NO_PERFORASI, dir: 'asc' };
var stokPage        = 1;
var stokDirty       = true;

// =====================================================================
// BULAN INDONESIA
// =====================================================================
var BULAN_ID = ['','Januari','Februari','Maret','April','Mei','Juni',
                'Juli','Agustus','September','Oktober','November','Desember'];

// =====================================================================
// VIEW DESCRIPTIONS
// =====================================================================
var VIEW_DESC = {
    semua:    'Semua data tanpa filter otomatis',
    kantor:   'Filter: Tempat Nikah mengandung "KUA" atau "KANTOR"',
    wna:      'Filter: Warganegara Suami atau Istri = WNA',
    kurang12: 'Filter: Selisih Akad – Daftar < 12 hari',
    ntpn:     'Kolom NTPN ditampilkan di posisi depan'
};
var VIEW_LABELS = {
    semua:    'Semua Data',
    kantor:   'Nikah Kantor KUA',
    wna:      'Nikah WNA',
    kurang12: 'Kurang 12 Hari',
    ntpn:     'NTPN'
};

// =====================================================================
// DATE UTILITIES
// =====================================================================
function parseDate(val) {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    var s = String(val).trim();
    if (!s) return null;
    // Parse ISO date-only strings (YYYY-MM-DD) as LOCAL time to prevent
    // timezone offset from shifting the displayed date by 1 day.
    // new Date("2026-04-01") is parsed as UTC midnight, which in UTC+7
    // can render as March 31 — so we construct it explicitly as local.
    var isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        var d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
        return isNaN(d.getTime()) ? null : d;
    }
    var d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

function daysBetweenDates(d1, d2) {
    if (!d1 || !d2) return null;
    var t1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    var t2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return Math.round((t2 - t1) / 86400000);
}

function formatDate(val) {
    var d = parseDate(val);
    if (!d) return val || '';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Khusus kolom tanggal tab Stok:
// GAS mengirim tanggal 1 hari mundur akibat UTC midnight shift.
// Tambah +1 hari sebelum ditampilkan.
function formatStokDate(val) {
    var d = parseDate(val);
    if (!d) return val || '';
    d.setDate(d.getDate() + 1);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getMonthNumber(val) {
    var d = parseDate(val);
    return d ? d.getMonth() + 1 : null;
}

function formatISODate(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return String(d);
    // Use UTC methods: SheetJS creates dates as UTC midnight, so getUTC* always
    // returns the intended calendar date regardless of the browser's local timezone.
    return d.getUTCFullYear() + '-' +
           String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
           String(d.getUTCDate()).padStart(2, '0');
}

function escHtml(s) {
    return String(s)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// =====================================================================
// AUTO-FILTER FUNCTIONS
// =====================================================================
function filterKantorKUA(rows) {
    // Match exact value "KUA / KANTOR" in column CD (Nikah Di),
    // normalising whitespace around the slash so minor spacing variants are handled.
    return rows.filter(function(row) {
        var v = String(row[COL.TEMPAT_NIKAH] || '').trim().toUpperCase().replace(/\s*\/\s*/g, ' / ');
        return v === 'KUA / KANTOR';
    });
}

function filterWNA(rows) {
    return rows.filter(function(row) {
        return String(row[COL.WN_SUAMI] || '').toUpperCase() === 'WNA' ||
               String(row[COL.WN_ISTRI]  || '').toUpperCase() === 'WNA';
    });
}

function filterKurang12(rows) {
    return rows.filter(function(row) {
        var a = parseDate(row[COL.TGL_AKAD]);
        var d = parseDate(row[COL.TGL_DAFTAR]);
        var diff = daysBetweenDates(d, a);
        return diff !== null && diff < 12;
    });
}

function getAutoFilter(view) {
    if (view === 'kantor')   return filterKantorKUA;
    if (view === 'wna')      return filterWNA;
    if (view === 'kurang12') return filterKurang12;
    return null;
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
        if (filters.noPerforasi) {
            if (String(row[COL.NO_PERFORASI] || '').toLowerCase().indexOf(filters.noPerforasi.toLowerCase()) === -1) return false;
        }
        if (filters.noPendaftaran) {
            if (String(row[COL.NO_PENDAFTARAN] || '').toLowerCase().indexOf(filters.noPendaftaran.toLowerCase()) === -1) return false;
        }
        if (filters.namaSuami) {
            if (String(row[COL.NAMA_SUAMI] || '').toLowerCase().indexOf(filters.namaSuami.toLowerCase()) === -1) return false;
        }
        if (filters.namaIstri) {
            if (String(row[COL.NAMA_ISTRI] || '').toLowerCase().indexOf(filters.namaIstri.toLowerCase()) === -1) return false;
        }
        if (filters.tempatNikah) {
            if (String(row[COL.TEMPAT_NIKAH] || '').trim() !== filters.tempatNikah) return false;
        }
        if (filters.ntpn) {
            if (String(row[COL.NTPN] || '').toLowerCase().indexOf(filters.ntpn.toLowerCase()) === -1) return false;
        }
        return true;
    });
}

// =====================================================================
// GET DATA (with auto-filter + user filters + sort)
// =====================================================================
function getNikahData() {
    if (allData.length === 0) return [];
    var rows = allData.slice();
    var fn = getAutoFilter(activeNikahView);
    if (fn) rows = fn(rows);
    rows = applyUserFilters(rows, nikahFilters);
    if (nikahSort) {
        var dir = nikahSort.dir === 'asc' ? 1 : -1;
        var col = nikahSort.col;
        rows.sort(function(a, b) {
            var va = a[col] != null ? a[col] : '';
            var vb = b[col] != null ? b[col] : '';
            var na = parseFloat(va), nb = parseFloat(vb);
            if (!isNaN(na) && !isNaN(nb)) return (na - nb) * dir;
            return String(va).localeCompare(String(vb), 'id') * dir;
        });
    }
    return rows;
}

function getStokFilteredData() {
    var rows = stokData.slice();
    var f = stokFilters;
    if (f.kua)   rows = rows.filter(function(r) { return String(r[STOK_COL.KUA]||'').trim() === f.kua; });
    if (f.bulan && f.bulan.length > 0) rows = rows.filter(function(r) {
        var d = parseDate(r[STOK_COL.TGL_DIGUNAKAN]);
        if (!d) return false;
        // +1 hari: koreksi UTC shift, sama seperti formatStokDate
        var corrected = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
        return f.bulan.indexOf(corrected.getMonth() + 1) !== -1;
    });
    if (f.noPerforasi) rows = rows.filter(function(r) {
        return String(r[STOK_COL.NO_PERFORASI]||'').toLowerCase().indexOf(f.noPerforasi.toLowerCase()) !== -1;
    });
    if (f.status) rows = rows.filter(function(r) {
        return String(r[STOK_COL.STATUS]||'').toLowerCase().trim() === f.status.toLowerCase();
    });
    var s = stokSort, dir = s.dir === 'asc' ? 1 : -1;
    rows.sort(function(a, b) {
        var va = a[s.col] != null ? a[s.col] : '', vb = b[s.col] != null ? b[s.col] : '';
        var na = parseFloat(va), nb = parseFloat(vb);
        if (!isNaN(na) && !isNaN(nb)) return (na - nb) * dir;
        return String(va).localeCompare(String(vb), 'id') * dir;
    });
    return rows;
}

// =====================================================================
// BUILD COLUMN LAYOUT
// =====================================================================
function buildNikahColumns() {
    if (allHeaders.length === 0) return { headers: [], indices: [] };

    var tglBayarIdx = -1;
    for (var bi = 0; bi < allHeaders.length; bi++) {
        if (/bayar/i.test(allHeaders[bi])) { tglBayarIdx = bi; break; }
    }

    var priority = PRIORITY_COLS.map(function(c) {
        return c === -1 ? tglBayarIdx : c;
    }).filter(function(c) {
        return c >= 0 && c < allHeaders.length;
    });

    var pSet = {};
    priority.forEach(function(c) { pSet[c] = true; });
    var rest = [];
    for (var ri = 0; ri < allHeaders.length; ri++) {
        if (!pSet[ri]) rest.push(ri);
    }

    var ordered = priority.concat(rest);

    // kurang12 view: insert virtual Selisih column after TGL_DAFTAR
    if (activeNikahView === 'kurang12') {
        var ws = ordered.slice();
        var pos = ws.indexOf(COL.TGL_DAFTAR);
        if (pos !== -1) {
            ws.splice(pos + 1, 0, VIRTUAL_SELISIH);
        } else {
            ws.unshift(VIRTUAL_SELISIH);
        }
        return {
            headers: ws.map(function(i) { return i === VIRTUAL_SELISIH ? 'Selisih (Hari)' : allHeaders[i]; }),
            indices: ws
        };
    }

    return {
        headers: ordered.map(function(i) { return allHeaders[i]; }),
        indices: ordered
    };
}

function getHighlightCols() {
    if (activeNikahView === 'kantor')   return [COL.TEMPAT_NIKAH];
    if (activeNikahView === 'wna')      return [COL.WN_SUAMI, COL.WN_ISTRI];
    if (activeNikahView === 'kurang12') return [COL.TGL_AKAD, COL.TGL_DAFTAR, VIRTUAL_SELISIH];
    if (activeNikahView === 'ntpn')     return [COL.NTPN];
    return [];
}

// =====================================================================
// EMPTY / BUILDING STATE
// =====================================================================
function buildEmptyState(title, msg) {
    var icon = title.indexOf('Belum') !== -1 ? '📋' : '🔍';
    return '<div class="empty-state">' +
           '<div class="empty-icon">' + icon + '</div>' +
           '<h3>' + escHtml(title) + '</h3>' +
           '<p>' + escHtml(msg) + '</p>' +
           '</div>';
}

/**
 * Animated loading card shown inside a tab while data is still being
 * fetched from the server (async loadStokData, deferred renderNikahTable, etc.)
 */
function buildTabLoadingState(message, subMessage) {
    var msg = message    || 'Memuat data...';
    var sub = subMessage || 'Mohon tunggu sebentar';
    return '<div class="tab-loading-state">' +
           '<div class="tab-spinner-wrap">' +
           '<div class="tab-spinner-outer"></div>' +
           '<div class="tab-spinner-inner"></div>' +
           '</div>' +
           '<p class="tab-loading-msg">' + escHtml(msg) + '</p>' +
           '<p class="tab-loading-sub">' + escHtml(sub) + '</p>' +
           '</div>';
}

// =====================================================================
// PAGINATION
// =====================================================================
function buildPagination(which, page, totalPages, totalRows) {
    if (totalPages <= 1) return '';
    var start = (page - 1) * PAGE_SIZE + 1;
    var end   = Math.min(page * PAGE_SIZE, totalRows);

    var parts = ['<div class="pagination-bar">'];
    parts.push('<button onclick="changePage(\'' + which + '\',1)" ' + (page === 1 ? 'disabled' : '') + '>«</button>');
    parts.push('<button onclick="changePage(\'' + which + '\',' + (page-1) + ')" ' + (page === 1 ? 'disabled' : '') + '>‹</button>');

    // Show up to 5 page buttons
    var btnStart = Math.max(1, page - 2);
    var btnEnd   = Math.min(totalPages, page + 2);
    if (page <= 3) btnEnd = Math.min(5, totalPages);
    if (page >= totalPages - 2) btnStart = Math.max(1, totalPages - 4);

    for (var p = btnStart; p <= btnEnd; p++) {
        var cls = p === page ? ' class="current"' : '';
        parts.push('<button' + cls + ' onclick="changePage(\'' + which + '\',' + p + ')">' + p + '</button>');
    }

    parts.push('<button onclick="changePage(\'' + which + '\',' + (page+1) + ')" ' + (page === totalPages ? 'disabled' : '') + '>›</button>');
    parts.push('<button onclick="changePage(\'' + which + '\',' + totalPages + ')" ' + (page === totalPages ? 'disabled' : '') + '>»</button>');
    parts.push('<span class="page-info">' + start.toLocaleString('id-ID') + '–' + end.toLocaleString('id-ID') + ' / ' + totalRows.toLocaleString('id-ID') + '</span>');
    parts.push('</div>');
    return parts.join('');
}

function changePage(which, page) {
    if (which === 'nikah') {
        nikahPage = page;
        renderNikahTable();
        // Scroll table to top
        var tc = document.querySelector('#table-nikah .table-container');
        if (tc) tc.scrollTop = 0;
    } else if (which === 'stok') {
        stokPage = page;
        renderStokTable();
        var ts = document.querySelector('#table-stok .table-container');
        if (ts) ts.scrollTop = 0;
    }
}

// =====================================================================
// RENDER NIKAH TABLE
// =====================================================================
function renderNikahTable() {
    var container = document.getElementById('table-nikah');
    if (!container) return;

    if (allData.length === 0) {
        container.innerHTML = buildEmptyState('Belum ada data dimuat', 'Muat data terlebih dahulu dari tab Dashboard.');
        return;
    }

    var allRows = getNikahData();
    var totalRows  = allRows.length;
    var totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));

    // Clamp page
    nikahPage = Math.max(1, Math.min(nikahPage, totalPages));

    updateBadge('nikah', totalRows);

    if (totalRows === 0) {
        container.innerHTML = buildEmptyState('Tidak ada data', 'Tidak ada data yang cocok dengan filter.');
        return;
    }

    var start       = (nikahPage - 1) * PAGE_SIZE;
    var displayRows = allRows.slice(start, start + PAGE_SIZE);
    var cols        = buildNikahColumns();
    var hlSet       = getHighlightCols();
    var sort        = nikahSort || {};
    var parts       = [];

    // Info bar
    parts.push('<div class="data-info-bar">');
    parts.push('<div class="count-display">Menampilkan <span>' + totalRows.toLocaleString('id-ID') + '</span> data' +
               (totalRows !== allData.length ? ' dari ' + allData.length.toLocaleString('id-ID') + ' total' : '') + '</div>');
    parts.push('<div class="action-btns">');
    parts.push('<button class="btn btn-warning btn-sm" onclick="copyNikahTable()">📋 Salin</button>');
    parts.push('<button class="btn btn-download btn-sm" onclick="downloadNikahAsXlsx()">⬇ Download XLSX</button>');
    parts.push('</div></div>');

    // Pagination top
    parts.push(buildPagination('nikah', nikahPage, totalPages, totalRows));

    // Table
    parts.push('<div class="table-container"><table><thead><tr>');
    parts.push('<th class="col-no">#</th>');

    cols.headers.forEach(function(h, idx) {
        var colI   = cols.indices[idx];
        var sc     = (sort.col === colI && colI !== VIRTUAL_SELISIH)
                     ? (sort.dir === 'asc' ? 'sort-asc' : 'sort-desc') : '';
        var hlCls  = (hlSet.indexOf(colI) !== -1) ? ' col-orange-th' : '';
        var click  = (colI === VIRTUAL_SELISIH)
                     ? ''
                     : 'onclick="toggleNikahSort(' + colI + ')" title="Klik untuk urutkan"';
        parts.push('<th class="' + sc + hlCls + '" ' + click + '>' + escHtml(String(h)) + '</th>');
    });
    parts.push('</tr></thead><tbody>');

    displayRows.forEach(function(row, idx) {
        parts.push('<tr><td class="col-no">' + (start + idx + 1) + '</td>');
        cols.indices.forEach(function(colI) {
            var isOrange = hlSet.indexOf(colI) !== -1;
            var tdCls = isOrange ? ' class="col-orange-td"' : '';

            if (colI === VIRTUAL_SELISIH) {
                var tA = parseDate(row[COL.TGL_AKAD]);
                var tD = parseDate(row[COL.TGL_DAFTAR]);
                var diff = daysBetweenDates(tD, tA);
                var disp = diff !== null ? diff + ' hari' : '-';
                parts.push('<td class="col-orange-td">' + disp + '</td>');
                return;
            }

            var val = row[colI] != null ? row[colI] : '';
            var display = (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val))
                ? formatDate(val)
                : escHtml(String(val));
            parts.push('<td' + tdCls + ' title="' + escHtml(String(val)) + '">' + display + '</td>');
        });
        parts.push('</tr>');
    });

    parts.push('</tbody></table></div>');

    // Pagination bottom
    parts.push(buildPagination('nikah', nikahPage, totalPages, totalRows));

    container.innerHTML = parts.join('');
    nikahDirty = false;
}

// =====================================================================
// RENDER STOK TABLE
// =====================================================================
var STATUS_COLORS = {
    'tersedia': { bg: '#d4edda', color: '#155724', border: '#c3e6cb' },
    'terpakai': { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' },
    'rusak':    { bg: '#fff3cd', color: '#856404', border: '#ffeeba' },
    'hilang':   { bg: '#fde2e4', color: '#842029', border: '#f5c6cb' },
    'default':  { bg: '#e2e3e5', color: '#383d41', border: '#d6d8db' }
};
function getStatusStyle(val) {
    return STATUS_COLORS[String(val||'').toLowerCase().trim()] || STATUS_COLORS['default'];
}
function buildStatusBadge(val) {
    var s = getStatusStyle(val);
    return '<span class="status-badge" style="background:' + s.bg + ';color:' + s.color +
           ';border:1px solid ' + s.border + '">' + escHtml(String(val)) + '</span>';
}

function renderStokTable() {
    var container = document.getElementById('table-stok');
    if (!container) return;

    if (stokData.length === 0) {
        container.innerHTML = buildEmptyState('Belum ada data Stok', 'Muat data terlebih dahulu dari tab Dashboard.');
        updateBadge('stok', 0);
        return;
    }

    var allRows   = getStokFilteredData();
    var totalRows = allRows.length;
    var totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
    stokPage = Math.max(1, Math.min(stokPage, totalPages));

    updateBadge('stok', totalRows);

    if (totalRows === 0) {
        container.innerHTML = buildEmptyState('Tidak ada data', 'Tidak ada data yang cocok dengan filter.');
        return;
    }

    var start       = (stokPage - 1) * PAGE_SIZE;
    var displayRows = allRows.slice(start, start + PAGE_SIZE);
    var s           = stokSort;
    var parts       = [];

    parts.push('<div class="data-info-bar">');
    parts.push('<div class="count-display">Menampilkan <span>' + totalRows.toLocaleString('id-ID') + '</span> data' +
               (totalRows !== stokData.length ? ' dari ' + stokData.length.toLocaleString('id-ID') + ' total' : '') + '</div>');
    parts.push('<div class="action-btns">');
    parts.push('<button class="btn btn-warning btn-sm" onclick="copyStokTable()">📋 Salin</button>');
    parts.push('<button class="btn btn-download btn-sm" onclick="downloadStokAsXlsx()">⬇ Download XLSX</button>');
    parts.push('</div></div>');

    parts.push(buildPagination('stok', stokPage, totalPages, totalRows));

    parts.push('<div class="table-container"><table><thead><tr><th class="col-no">#</th>');
    DISPLAY_STOK_COLS.forEach(function(colI, idx) {
        var sc = (s.col === colI) ? (s.dir === 'asc' ? 'sort-asc' : 'sort-desc') : '';
        parts.push('<th class="' + sc + '" onclick="toggleStokSort(' + colI + ')" title="Klik untuk urutkan">' +
                   escHtml(STOK_COL_NAMES[idx]) + '</th>');
    });
    parts.push('</tr></thead><tbody>');

    displayRows.forEach(function(row, idx) {
        parts.push('<tr><td class="col-no">' + (start + idx + 1) + '</td>');
        DISPLAY_STOK_COLS.forEach(function(colI) {
            var val = row[colI] != null ? row[colI] : '';
            if (colI === STOK_COL.STATUS) {
                parts.push('<td>' + buildStatusBadge(val) + '</td>');
            } else {
                var isDateCol = (colI === STOK_COL.TGL_ALOKASI || colI === STOK_COL.TGL_DIGUNAKAN);
                var disp = (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val))
                    ? (isDateCol ? formatStokDate(val) : formatDate(val))
                    : escHtml(String(val));
                parts.push('<td title="' + escHtml(String(val)) + '">' + disp + '</td>');
            }
        });
        parts.push('</tr>');
    });

    parts.push('</tbody></table></div>');
    parts.push(buildPagination('stok', stokPage, totalPages, totalRows));

    container.innerHTML = parts.join('');
    stokDirty = false;
}

// =====================================================================
// SORT
// =====================================================================
function toggleNikahSort(colIndex) {
    if (nikahSort && nikahSort.col === colIndex) {
        nikahSort = { col: colIndex, dir: nikahSort.dir === 'asc' ? 'desc' : 'asc' };
    } else {
        nikahSort = { col: colIndex, dir: 'asc' };
    }
    nikahPage = 1;
    renderNikahTable();
}

function toggleStokSort(colI) {
    stokSort = (stokSort.col === colI)
        ? { col: colI, dir: stokSort.dir === 'asc' ? 'desc' : 'asc' }
        : { col: colI, dir: 'asc' };
    stokPage = 1;
    renderStokTable();
}

// =====================================================================
// VIEW SWITCHING (Nikah tab combobox)
// =====================================================================
function switchNikahView(view) {
    activeNikahView = view;
    nikahFilters    = {};
    nikahSort       = null;
    nikahPage       = 1;

    // Update desc
    var descEl = document.getElementById('nikahViewDesc');
    if (descEl) descEl.textContent = VIEW_DESC[view] || '';

    // Rebuild filter options for new view
    buildNikahKUAOptions();
    buildNikahMonthOptions();
    buildNikahTempatOptions();

    // Reset filter UI
    resetNikahFilterUI();

    // Show NTPN filter only for ntpn view
    var ntpnGroup = document.getElementById('nikah-ntpn-group');
    if (ntpnGroup) ntpnGroup.style.display = (view === 'ntpn') ? '' : 'none';

    renderNikahTable();
}

function jumpToView(view) {
    // Called from dashboard stat cards — navigate to nikah tab with the view set
    var sel = document.getElementById('nikahViewSelect');
    if (sel) sel.value = view;
    switchNikahView(view);
    switchTab('tab-nikah');
}

// =====================================================================
// FILTER – NIKAH
// =====================================================================
function setupNikahFilter() {
    var div = document.getElementById('filter-nikah');
    if (!div) return;

    div.innerHTML =
        '<div class="filter-section" id="filterSection-nikah">' +
        '<div class="filter-title">' +
        '<span>🔎 Filter Data</span>' +
        '<button class="btn btn-secondary btn-sm" onclick="toggleNikahFilterSection()">Sembunyikan</button>' +
        '</div>' +
        '<div class="filter-grid" id="nikahFilterGrid">' +

        '<div class="filter-group"><label>KUA</label>' +
        '<select id="f-nikah-kua"><option value="">-- Semua KUA --</option></select></div>' +

        '<div class="filter-group"><label>Bulan Akad</label>' +
        '<div class="multiselect-wrapper">' +
        '<button type="button" class="multiselect-trigger" onclick="toggleMonthDropdown(\'nikah\')" id="monthTrigger-nikah">' +
        '<span id="monthLabel-nikah">-- Semua Bulan --</span><span class="arrow">▼</span>' +
        '</button>' +
        '<div class="multiselect-dropdown" id="monthDropdown-nikah">' +
        '<div class="multiselect-select-all" onclick="toggleAllMonths(\'nikah\')">' +
        '<input type="checkbox" id="monthAll-nikah" checked> Pilih Semua</div>' +
        '</div></div></div>' +

        '<div class="filter-group"><label>No Perforasi</label>' +
        '<input type="text" id="f-nikah-noPerforasi" placeholder="Cari..."></div>' +

        '<div class="filter-group"><label>No Pendaftaran</label>' +
        '<input type="text" id="f-nikah-noPendaftaran" placeholder="Cari..."></div>' +

        '<div class="filter-group"><label>Nama Suami</label>' +
        '<input type="text" id="f-nikah-namaSuami" placeholder="Cari..."></div>' +

        '<div class="filter-group"><label>Nama Istri</label>' +
        '<input type="text" id="f-nikah-namaIstri" placeholder="Cari..."></div>' +

        '<div class="filter-group"><label>Tempat Nikah</label>' +
        '<select id="f-nikah-tempatNikah"><option value="">-- Semua Tempat --</option></select></div>' +

        '<div class="filter-group" id="nikah-ntpn-group" style="display:none;"><label>NTPN</label>' +
        '<input type="text" id="f-nikah-ntpn" placeholder="Cari NTPN..."></div>' +

        '</div>' +
        '<div class="filter-buttons">' +
        '<button class="btn btn-primary btn-sm" onclick="applyNikahFilter()">✅ Terapkan</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="resetNikahFilter()">🔄 Reset</button>' +
        '</div>' +
        '</div>';
}

function toggleNikahFilterSection() {
    var grid = document.getElementById('nikahFilterGrid');
    var btns = document.querySelector('#filterSection-nikah .filter-buttons');
    var btn  = document.querySelector('#filterSection-nikah .filter-title button');
    if (!grid) return;
    var hidden = grid.style.display === 'none';
    grid.style.display = hidden ? 'grid' : 'none';
    if (btns) btns.style.display = hidden ? 'flex' : 'none';
    if (btn) btn.textContent = hidden ? 'Sembunyikan' : 'Tampilkan';
}

function applyNikahFilter() {
    var val = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var cbs = Array.from(document.querySelectorAll('.month-cb-nikah'));
    var chk = cbs.filter(function(c) { return c.checked; });
    nikahFilters = {
        kua:           val('f-nikah-kua'),
        bulan:         (cbs.length === 0 || chk.length === cbs.length) ? [] : chk.map(function(c){ return parseInt(c.value); }),
        noPerforasi:   val('f-nikah-noPerforasi'),
        noPendaftaran: val('f-nikah-noPendaftaran'),
        namaSuami:     val('f-nikah-namaSuami'),
        namaIstri:     val('f-nikah-namaIstri'),
        tempatNikah:   val('f-nikah-tempatNikah'),
        ntpn:          val('f-nikah-ntpn')
    };
    nikahPage = 1;
    renderNikahTable();
}

function resetNikahFilter() {
    nikahFilters = {};
    nikahSort    = null;
    nikahPage    = 1;
    resetNikahFilterUI();
    renderNikahTable();
}

function resetNikahFilterUI() {
    var sec = document.getElementById('filterSection-nikah');
    if (!sec) return;
    sec.querySelectorAll('input[type="text"]').forEach(function(el) { el.value = ''; });
    sec.querySelectorAll('select').forEach(function(el) { el.selectedIndex = 0; });
    document.querySelectorAll('.month-cb-nikah').forEach(function(cb) { cb.checked = true; });
    updateMonthLabel('nikah');
}

// =====================================================================
// FILTER – STOK
// =====================================================================
function setupStokFilter() {
    var div = document.getElementById('filter-stok');
    if (!div) return;
    div.innerHTML =
        '<div class="filter-section" id="filterSection-stok">' +
        '<div class="filter-title"><span>🔎 Filter Stok</span>' +
        '<button class="btn btn-secondary btn-sm" onclick="toggleStokFilterSection()">Sembunyikan</button></div>' +
        '<div class="filter-grid" id="stokFilterGrid">' +
        '<div class="filter-group"><label>KUA</label><select id="f-stok-kua"><option value="">-- Semua KUA --</option></select></div>' +
        '<div class="filter-group"><label>Bulan Digunakan</label><div class="multiselect-wrapper">' +
        '<button type="button" class="multiselect-trigger" onclick="toggleMonthDropdown(\'stok\')" id="monthTrigger-stok">' +
        '<span id="monthLabel-stok">-- Semua Bulan --</span><span class="arrow">▼</span></button>' +
        '<div class="multiselect-dropdown" id="monthDropdown-stok">' +
        '<div class="multiselect-select-all" onclick="toggleAllMonths(\'stok\')">' +
        '<input type="checkbox" id="monthAll-stok" checked> Pilih Semua</div></div></div></div>' +
        '<div class="filter-group"><label>No. Porforasi</label><input type="text" id="f-stok-noPerforasi" placeholder="Cari..."></div>' +
        '<div class="filter-group"><label>Status</label><select id="f-stok-status"><option value="">-- Semua Status --</option></select></div>' +
        '</div><div class="filter-buttons">' +
        '<button class="btn btn-primary btn-sm" onclick="applyStokFilter()">✅ Terapkan</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="resetStokFilter()">🔄 Reset</button>' +
        '</div></div>';
}

function toggleStokFilterSection() {
    var grid = document.getElementById('stokFilterGrid');
    var btns = document.querySelector('#filterSection-stok .filter-buttons');
    var btn  = document.querySelector('#filterSection-stok .filter-title button');
    if (!grid) return;
    var hidden = grid.style.display === 'none';
    grid.style.display = hidden ? 'grid' : 'none';
    if (btns) btns.style.display = hidden ? 'flex' : 'none';
    if (btn) btn.textContent = hidden ? 'Sembunyikan' : 'Tampilkan';
}

function applyStokFilter() {
    var val = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var cbs = Array.from(document.querySelectorAll('.month-cb-stok'));
    var chk = cbs.filter(function(c) { return c.checked; });
    stokFilters = {
        kua:         val('f-stok-kua'),
        bulan:       (cbs.length === 0 || chk.length === cbs.length) ? [] : chk.map(function(c){ return parseInt(c.value); }),
        noPerforasi: val('f-stok-noPerforasi'),
        status:      val('f-stok-status')
    };
    stokPage = 1;
    renderStokTable();
}

function resetStokFilter() {
    stokFilters = {};
    stokSort    = { col: STOK_COL.NO_PERFORASI, dir: 'asc' };
    stokPage    = 1;
    var sec = document.getElementById('filterSection-stok');
    if (sec) {
        sec.querySelectorAll('input[type="text"]').forEach(function(el) { el.value = ''; });
        sec.querySelectorAll('select').forEach(function(el) { el.selectedIndex = 0; });
    }
    document.querySelectorAll('.month-cb-stok').forEach(function(c) { c.checked = true; });
    updateMonthLabel('stok');
    renderStokTable();
}

// =====================================================================
// MONTH MULTISELECT (generic, works for 'nikah' and 'stok')
// =====================================================================
function buildMonthOptions(tabId, rows, dateColFn) {
    var dropdown = document.getElementById('monthDropdown-' + tabId);
    if (!dropdown) return;
    dropdown.querySelectorAll('.month-item').forEach(function(e) { e.remove(); });
    var months = {};
    rows.forEach(function(row) { var m = dateColFn(row); if (m) months[m] = true; });
    Object.keys(months).map(Number).sort(function(a,b){return a-b;}).forEach(function(m) {
        var item = document.createElement('div');
        item.className = 'multiselect-item month-item';
        item.innerHTML = '<input type="checkbox" class="month-cb-' + tabId + '" value="' + m +
                         '" checked onchange="updateMonthLabel(\'' + tabId + '\')"> ' + BULAN_ID[m];
        dropdown.appendChild(item);
    });
    updateMonthLabel(tabId);
}

function buildNikahMonthOptions() {
    var rows = allData.slice();
    var fn = getAutoFilter(activeNikahView);
    if (fn) rows = fn(rows);
    buildMonthOptions('nikah', rows, function(row) { return getMonthNumber(row[COL.TGL_AKAD]); });
}

function buildStokMonthOptions() {
    buildMonthOptions('stok', stokData, function(row) {
        var d = parseDate(row[STOK_COL.TGL_DIGUNAKAN]);
        if (!d) return null;
        // +1 hari: koreksi UTC shift, agar label bulan di dropdown sesuai tampilan
        var corrected = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
        return corrected.getMonth() + 1;
    });
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
    document.querySelectorAll('.month-cb-' + tabId).forEach(function(cb) { cb.checked = allCb.checked; });
    updateMonthLabel(tabId);
}

function updateMonthLabel(tabId) {
    var cbs   = Array.from(document.querySelectorAll('.month-cb-' + tabId));
    var allCb = document.getElementById('monthAll-' + tabId);
    var chk   = cbs.filter(function(cb) { return cb.checked; });
    var label = document.getElementById('monthLabel-' + tabId);
    if (!label) return;
    if (allCb) allCb.checked = (chk.length === cbs.length);
    if (cbs.length === 0 || chk.length === cbs.length) {
        label.textContent = '-- Semua Bulan --';
    } else if (chk.length === 0) {
        label.textContent = 'Tidak ada bulan dipilih';
    } else {
        label.textContent = chk.map(function(cb) { return BULAN_ID[parseInt(cb.value)]; }).join(', ');
    }
}

// =====================================================================
// KUA & TEMPAT OPTIONS
// =====================================================================
function buildNikahKUAOptions() {
    var sel = document.getElementById('f-nikah-kua');
    if (!sel) return;
    var rows = allData.slice();
    var fn = getAutoFilter(activeNikahView);
    if (fn) rows = fn(rows);
    var kuas = {};
    rows.forEach(function(r) { var v = String(r[COL.KUA]||'').trim(); if (v) kuas[v] = true; });
    var cur = sel.value;
    sel.innerHTML = '<option value="">-- Semua KUA --</option>';
    Object.keys(kuas).sort().forEach(function(k) {
        var o = document.createElement('option'); o.value = k; o.textContent = k; sel.appendChild(o);
    });
    if (cur) sel.value = cur;
}

function buildNikahTempatOptions() {
    var sel = document.getElementById('f-nikah-tempatNikah');
    if (!sel) return;
    var rows = allData.slice();
    var fn = getAutoFilter(activeNikahView);
    if (fn) rows = fn(rows);
    var vals = {};
    rows.forEach(function(r) { var v = String(r[COL.TEMPAT_NIKAH]||'').trim(); if (v) vals[v] = true; });
    var cur = sel.value;
    sel.innerHTML = '<option value="">-- Semua Tempat --</option>';
    Object.keys(vals).sort().forEach(function(k) {
        var o = document.createElement('option'); o.value = k; o.textContent = k; sel.appendChild(o);
    });
    if (cur) sel.value = cur;
}

function buildStokKUAOptions() {
    var sel = document.getElementById('f-stok-kua');
    if (!sel) return;
    var kuas = {};
    stokData.forEach(function(r) { var v = String(r[STOK_COL.KUA]||'').trim(); if (v) kuas[v] = true; });
    sel.innerHTML = '<option value="">-- Semua KUA --</option>';
    Object.keys(kuas).sort().forEach(function(k) {
        var o = document.createElement('option'); o.value = k; o.textContent = k; sel.appendChild(o);
    });
}

function buildStokStatusOptions() {
    var sel = document.getElementById('f-stok-status');
    if (!sel) return;
    var vals = {};
    stokData.forEach(function(r) { var v = String(r[STOK_COL.STATUS]||'').trim(); if (v) vals[v] = true; });
    sel.innerHTML = '<option value="">-- Semua Status --</option>';
    Object.keys(vals).sort().forEach(function(k) {
        var o = document.createElement('option');
        var s = getStatusStyle(k);
        o.value = k; o.textContent = k; o.style.background = s.bg; o.style.color = s.color;
        sel.appendChild(o);
    });
}

// =====================================================================
// BADGE
// =====================================================================
function updateBadge(tabId, count) {
    var badge = document.getElementById('badge-' + tabId);
    if (badge) badge.textContent = count.toLocaleString('id-ID');
}

// =====================================================================
// COPY TO CLIPBOARD
// =====================================================================
function copyNikahTable() {
    var rows = getNikahData();
    var cols = buildNikahColumns();
    var lines = [['#'].concat(cols.headers).join('\t')];
    rows.forEach(function(row, idx) {
        var line = [idx + 1];
        cols.indices.forEach(function(colI) {
            if (colI === VIRTUAL_SELISIH) {
                var diff = daysBetweenDates(parseDate(row[COL.TGL_DAFTAR]), parseDate(row[COL.TGL_AKAD]));
                line.push(diff !== null ? diff : '');
            } else {
                line.push(row[colI] != null ? row[colI] : '');
            }
        });
        lines.push(line.join('\t'));
    });
    fallbackOrClipboard(lines.join('\n'), 'Tabel berhasil disalin ke clipboard');
}

function copyStokTable() {
    var rows  = getStokFilteredData();
    var lines = [['#'].concat(STOK_COL_NAMES).join('\t')];
    rows.forEach(function(row, idx) {
        lines.push([idx+1].concat(DISPLAY_STOK_COLS.map(function(c){ return row[c]!=null?row[c]:''; })).join('\t'));
    });
    fallbackOrClipboard(lines.join('\n'), 'Tabel Stok berhasil disalin');
}

function fallbackOrClipboard(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text)
            .then(function() { showNotification(msg, 'success'); })
            .catch(function() { fallbackCopy(text, msg); });
    } else {
        fallbackCopy(text, msg);
    }
}

function fallbackCopy(text, msg) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); showNotification(msg || 'Tersalin', 'success'); }
    catch(e) { showNotification('Gagal menyalin', 'error'); }
    document.body.removeChild(ta);
}

// =====================================================================
// DOWNLOAD XLSX
// =====================================================================
function downloadNikahAsXlsx() {
    if (typeof XLSX === 'undefined') {
        showNotification('Library XLSX belum termuat', 'error');
        return;
    }
    var rows   = getNikahData();
    var cols   = buildNikahColumns();
    var label  = VIEW_LABELS[activeNikahView] || 'Nikah';
    var header = ['#'].concat(cols.headers);
    var data   = [header];

    rows.forEach(function(row, idx) {
        var line = [idx + 1];
        cols.indices.forEach(function(colI) {
            if (colI === VIRTUAL_SELISIH) {
                var diff = daysBetweenDates(parseDate(row[COL.TGL_DAFTAR]), parseDate(row[COL.TGL_AKAD]));
                line.push(diff !== null ? diff : '');
            } else {
                var val = row[colI] != null ? row[colI] : '';
                // Convert ISO date string to proper date string for Excel
                if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
                    val = formatDate(val);
                }
                line.push(val);
            }
        });
        data.push(line);
    });

    var ws = XLSX.utils.aoa_to_sheet(data);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, label.substring(0, 31));
    var date = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
    XLSX.writeFile(wb, 'Nikah_' + label.replace(/\s+/g, '_') + '_' + date + '.xlsx');
    showNotification('File XLSX berhasil diunduh (' + rows.length.toLocaleString('id-ID') + ' baris)', 'success');
}

function downloadStokAsXlsx() {
    if (typeof XLSX === 'undefined') {
        showNotification('Library XLSX belum termuat', 'error');
        return;
    }
    var rows = getStokFilteredData();
    var data = [['#'].concat(STOK_COL_NAMES)];
    rows.forEach(function(row, idx) {
        var line = [idx + 1];
        DISPLAY_STOK_COLS.forEach(function(colI) {
            var val = row[colI] != null ? row[colI] : '';
            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) val = formatDate(val);
            line.push(val);
        });
        data.push(line);
    });

    var ws = XLSX.utils.aoa_to_sheet(data);
    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stok Buku Nikah');
    var date = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
    XLSX.writeFile(wb, 'Stok_Buku_Nikah_' + date + '.xlsx');
    showNotification('File XLSX Stok berhasil diunduh (' + rows.length.toLocaleString('id-ID') + ' baris)', 'success');
}

// =====================================================================
// TAB SWITCHING
// =====================================================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(function(el) { el.classList.remove('active'); });
    document.querySelectorAll('.tab-btn').forEach(function(el) { el.classList.remove('active'); });

    var content = document.getElementById(tabId);
    var btn     = document.getElementById('btn-' + tabId);
    if (content) content.classList.add('active');
    if (btn) btn.classList.add('active');

    // Close open month dropdowns
    document.querySelectorAll('.multiselect-dropdown.open').forEach(function(d) { d.classList.remove('open'); });
    document.querySelectorAll('.multiselect-trigger.open').forEach(function(t) { t.classList.remove('open'); });

    if (tabId === 'tab-nikah' && nikahDirty) {
        var tableDiv = document.getElementById('table-nikah');
        if (tableDiv) tableDiv.innerHTML = buildTabLoadingState('Menyiapkan data Nikah...', 'Merender tabel, harap tunggu');
        requestAnimationFrame(function() {
            requestAnimationFrame(function() { renderNikahTable(); });
        });
    }

    if (tabId === 'tab-stok' && stokDirty) {
        var stokDiv = document.getElementById('table-stok');
        if (stokDiv) stokDiv.innerHTML = buildTabLoadingState('Menyiapkan data Stok...', 'Merender tabel, harap tunggu');
        requestAnimationFrame(function() {
            requestAnimationFrame(function() { renderStokTable(); });
        });
    }
}

// =====================================================================
// DASHBOARD STATS
// =====================================================================
function updateDashboardStats() {
    var total    = allData.length;
    var kantor   = filterKantorKUA(allData).length;
    var wna      = filterWNA(allData).length;
    var kurang12 = filterKurang12(allData).length;
    var ntpn     = allData.filter(function(r) { return String(r[COL.NTPN]||'').trim() !== ''; }).length;

    function setEl(id, val) { var el = document.getElementById(id); if (el) el.textContent = val.toLocaleString('id-ID'); }
    setEl('stat-total',    total);
    setEl('stat-kantor',   kantor);
    setEl('stat-wna',      wna);
    setEl('stat-kurang12', kurang12);
    setEl('stat-ntpn',     ntpn);
    updateBadge('nikah', total);
}

// =====================================================================
// FILE LIST
// =====================================================================
async function refreshFileList(forceRefresh) {
    if (forceRefresh && typeof invalidateSupervisiFilesCache === 'function') {
        invalidateSupervisiFilesCache();
    }
    setLoadingText('Memuat daftar file...');
    showLoading();
    try {
        var files = await apiCall('getSupervisiFiles', {});
        populateFileSelect(files || []);
        if (files && files.length > 0) {
            showNotification(files.length + ' file ditemukan', 'success');
        } else {
            showNotification('Tidak ada file ditemukan', 'warning');
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
        opt.textContent = f.name + (f.modifiedDate ? ' (' + new Date(f.modifiedDate).toLocaleDateString('id-ID') + ')' : '');
        sel.appendChild(opt);
    });
    if (loadedFileId) sel.value = loadedFileId;
    document.getElementById('btnLoadData').disabled = !sel.value;
}

// =====================================================================
// LOAD DATA (Main Nikah sheet)
// =====================================================================
async function loadData() {
    var sel    = document.getElementById('fileSelect');
    var fileId = sel ? sel.value : '';
    var fname  = sel && sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].text : '';
    fname = fname.replace(/\s*\(\d{1,2}\/\d{1,2}\/\d{4}\)\s*$/, '').trim();

    if (!fileId) { showNotification('Pilih file terlebih dahulu', 'warning'); return; }

    if (fileId === loadedFileId && allData.length > 0) {
        if (!confirm('File ini sudah dimuat (' + allData.length.toLocaleString('id-ID') + ' baris). Muat ulang?')) return;
        if (typeof invalidateSupervisiDataCache === 'function') invalidateSupervisiDataCache(fileId);
    }

    setLoadingText('Mengambil data dari Google Drive...');
    showProgress(10);
    showLoading();

    // Immediately mark inactive tabs with an animated loading state so the
    // user sees a spinner (not stale/empty content) if they navigate there
    // while data is being fetched.
    (function markTabsLoading() {
        var activeTabEl = document.querySelector('.tab-content.active');
        var activeId    = activeTabEl ? activeTabEl.id : '';
        if (activeId !== 'tab-nikah') {
            var nd = document.getElementById('table-nikah');
            if (nd) nd.innerHTML = buildTabLoadingState('Memuat data Nikah...', 'Mengambil data dari Google Drive');
        }
        if (activeId !== 'tab-stok') {
            var sd = document.getElementById('table-stok');
            if (sd) sd.innerHTML = buildTabLoadingState('Memuat data Stok...', 'Menunggu selesai dimuat');
        }
    }());

    try {
        var result = await apiCall('getSupervisiData', { fileId: fileId });

        showProgress(55);
        setLoadingText('Memproses data...');

        var headers = [], rows = [];

        if (result && result.type === 'base64') {
            setLoadingText('Membaca file Excel...');
            if (typeof XLSX === 'undefined') throw new Error('Library SheetJS belum termuat.');
            var wb = XLSX.read(result.content, { type: 'base64', cellDates: true });
            var ws = wb.Sheets[wb.SheetNames[0]];
            var raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (raw.length > 0) {
                headers = raw[0].map(function(h) { return String(h != null ? h : ''); });
                rows = raw.slice(1)
                    .filter(function(r) { return r.some(function(c) { return c !== '' && c !== null && c !== undefined; }); })
                    .map(function(r) {
                        return r.map(function(c) {
                            return c instanceof Date ? formatISODate(c) : (c != null ? c : '');
                        });
                    });
            }
        } else if (result && result.headers) {
            headers = result.headers;
            rows    = result.rows || [];
        } else {
            throw new Error('Format data tidak dikenali dari server');
        }

        showProgress(80);
        setLoadingText('Menyiapkan tampilan...');

        // Save global state
        allHeaders     = headers;
        allData        = rows;
        loadedFileName = fname;
        loadedFileId   = fileId;

        // Reset nikah tab state
        activeNikahView = 'semua';
        nikahFilters    = {};
        nikahSort       = null;
        nikahPage       = 1;
        nikahDirty      = true;

        // Update view selector to 'semua'
        var viewSel = document.getElementById('nikahViewSelect');
        if (viewSel) viewSel.value = 'semua';
        var descEl = document.getElementById('nikahViewDesc');
        if (descEl) descEl.textContent = VIEW_DESC['semua'];

        // Rebuild filter options
        buildNikahKUAOptions();
        buildNikahMonthOptions();
        buildNikahTempatOptions();
        resetNikahFilterUI();

        // Show NTPN group state
        var ntpnGroup = document.getElementById('nikah-ntpn-group');
        if (ntpnGroup) ntpnGroup.style.display = 'none';

        updateDashboardStats();
        updateLoadedInfo();

        // If nikah tab is active, render immediately; else defer
        var activeTabEl = document.querySelector('.tab-content.active');
        var activeId    = activeTabEl ? activeTabEl.id : '';
        if (activeId === 'tab-nikah') {
            renderNikahTable();
        } else {
            nikahDirty = true;
        }

        // Load stok data
        loadStokData(fileId);

        showProgress(100);
        hideLoading();
        hideProgress();

        showNotification('Data berhasil dimuat: ' + rows.length.toLocaleString('id-ID') + ' baris', 'success');

        var btnClear  = document.getElementById('btnClearData');
        var dashEmpty = document.getElementById('dashboardEmpty');
        if (btnClear)  btnClear.style.display  = '';
        if (dashEmpty) dashEmpty.style.display  = 'none';

    } catch (err) {
        hideLoading();
        hideProgress();
        showNotification(err.message || 'Gagal memuat data', 'error');
    }
}

// =====================================================================
// LOAD STOK DATA
// =====================================================================
async function loadStokData(fileId) {
    try {
        stokData    = [];
        stokFilters = {};
        stokSort    = { col: STOK_COL.NO_PERFORASI, dir: 'asc' };
        stokPage    = 1;
        stokDirty   = true;
        updateBadge('stok', 0);

        var stokDiv = document.getElementById('table-stok');
        if (stokDiv) stokDiv.innerHTML = buildTabLoadingState('Memuat data Stok...', 'Mengambil sheet Stok dari Google Drive');

        var result = await apiCall('getStokData', { fileId: fileId });
        var rows = [];

        if (result && result.type === 'base64') {
            if (typeof XLSX === 'undefined') throw new Error('SheetJS belum termuat.');
            var wb = XLSX.read(result.content, { type: 'base64', cellDates: true });
            var sheetName = wb.SheetNames.find(function(n) { return n.toLowerCase().trim() === 'stok'; }) || wb.SheetNames[0];
            var ws  = wb.Sheets[sheetName];
            var raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (raw.length > 1) {
                rows = raw.slice(1)
                    .filter(function(r) { return r.some(function(c) { return c !== '' && c != null; }); })
                    .map(function(r) {
                        return r.map(function(c) { return c instanceof Date ? formatISODate(c) : (c != null ? c : ''); });
                    });
            }
        } else if (result && result.rows) {
            rows = result.rows || [];
        }

        stokData = rows;
        buildStokKUAOptions();
        buildStokStatusOptions();
        buildStokMonthOptions();

        var activeTabEl = document.querySelector('.tab-content.active');
        var activeId    = activeTabEl ? activeTabEl.id : '';
        if (activeId === 'tab-stok') {
            renderStokTable();
        } else {
            stokDirty = true;
            if (stokDiv) stokDiv.innerHTML = buildEmptyState('Data Stok siap', rows.length.toLocaleString('id-ID') + ' baris siap ditampilkan.');
        }

        updateBadge('stok', rows.length);
    } catch (err) {
        var td = document.getElementById('table-stok');
        if (td) td.innerHTML = buildEmptyState('Gagal memuat data Stok', err.message || 'Periksa koneksi atau konfigurasi server.');
        showNotification('Gagal memuat Stok: ' + (err.message || ''), 'warning');
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

    nikahFilters = {};
    nikahSort    = null;
    nikahPage    = 1;
    nikahDirty   = true;

    stokData    = [];
    stokFilters = {};
    stokSort    = { col: STOK_COL.NO_PERFORASI, dir: 'asc' };
    stokPage    = 1;
    stokDirty   = true;

    ['total','kantor','wna','kurang12','ntpn'].forEach(function(k) {
        var el = document.getElementById('stat-' + k);
        if (el) el.textContent = '0';
    });
    updateBadge('nikah', 0);
    updateBadge('stok', 0);

    var nikahDiv = document.getElementById('table-nikah');
    if (nikahDiv) nikahDiv.innerHTML = buildEmptyState('Belum ada data dimuat', 'Muat data terlebih dahulu dari tab Dashboard.');
    var stokDiv  = document.getElementById('table-stok');
    if (stokDiv)  stokDiv.innerHTML  = buildEmptyState('Belum ada data dimuat', 'Muat data terlebih dahulu dari tab Dashboard.');

    var infoEl    = document.getElementById('loadedInfo');
    var btnClear  = document.getElementById('btnClearData');
    var dashEmpty = document.getElementById('dashboardEmpty');
    if (infoEl)    infoEl.classList.add('hidden');
    if (btnClear)  btnClear.style.display  = 'none';
    if (dashEmpty) dashEmpty.style.display = '';

    showNotification('Data telah dihapus dari memori', 'info');
}

// =====================================================================
// PROGRESS / LOADING
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
function updateLoadedInfo() {
    var info = document.getElementById('loadedInfo');
    var text = document.getElementById('loadedInfoText');
    if (info && text) {
        text.textContent = loadedFileName + ' – ' + allData.length.toLocaleString('id-ID') + ' baris data dimuat';
        info.classList.remove('hidden');
    }
}

// =====================================================================
// NAVIGATION & AUTH
// =====================================================================
function backToMenu() { window.location.href = 'main-menu.html'; }

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
        document.querySelectorAll('.multiselect-dropdown.open').forEach(function(d) { d.classList.remove('open'); });
        document.querySelectorAll('.multiselect-trigger.open').forEach(function(t) { t.classList.remove('open'); });
    }
});

// =====================================================================
// INITIALIZATION
// =====================================================================
window.addEventListener('DOMContentLoaded', function() {
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

    // Setup filter sections
    setupNikahFilter();
    setupStokFilter();

    // Init empty states
    var nikahDiv = document.getElementById('table-nikah');
    if (nikahDiv) nikahDiv.innerHTML = buildEmptyState('Belum ada data dimuat', 'Muat data terlebih dahulu dari tab Dashboard.');
    var stokDiv = document.getElementById('table-stok');
    if (stokDiv)  stokDiv.innerHTML  = buildEmptyState('Belum ada data dimuat', 'Muat data terlebih dahulu dari tab Dashboard.');

    // File select listener
    var fileSelect = document.getElementById('fileSelect');
    if (fileSelect) {
        fileSelect.addEventListener('change', function() {
            document.getElementById('btnLoadData').disabled = !this.value;
        });
    }

    // Load file list
    refreshFileList(false);
});

// =====================================================================
// GLOBAL EXPORTS
// =====================================================================
window.switchTab             = switchTab;
window.switchNikahView       = switchNikahView;
window.jumpToView            = jumpToView;
window.loadData              = loadData;
window.clearData             = clearData;
window.backToMenu            = backToMenu;
window.logout                = logout;
window.applyNikahFilter      = applyNikahFilter;
window.resetNikahFilter      = resetNikahFilter;
window.toggleNikahSort       = toggleNikahSort;
window.toggleNikahFilterSection = toggleNikahFilterSection;
window.copyNikahTable        = copyNikahTable;
window.downloadNikahAsXlsx   = downloadNikahAsXlsx;
window.applyStokFilter       = applyStokFilter;
window.resetStokFilter       = resetStokFilter;
window.toggleStokSort        = toggleStokSort;
window.toggleStokFilterSection = toggleStokFilterSection;
window.copyStokTable         = copyStokTable;
window.downloadStokAsXlsx    = downloadStokAsXlsx;
window.changePage            = changePage;
window.toggleMonthDropdown   = toggleMonthDropdown;
window.toggleAllMonths       = toggleAllMonths;
window.updateMonthLabel      = updateMonthLabel;
var _refreshFileList = refreshFileList;
window.refreshFileList = function() { return _refreshFileList(true); };