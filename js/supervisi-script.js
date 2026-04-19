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
    TGL_BAYAR:      -1,  // BA – Tanggal Bayar (dicari dinamis dari header)
    TEMPAT_NIKAH:   81   // CD – Tempat Nikah
};

// Urutan prioritas kolom untuk semua data-tab
// Kolom yg tidak ada di sini tetap tampil, diappend setelah prioritas
var PRIORITY_COLS = [
    4,   // KUA
    10,  // No Pendaftaran
    11,  // Tgl Daftar
    36,  // Tgl Akad
    13,  // Nama Suami
    17,  // WN Suami
    25,  // Nama Istri
    29,  // WN Istri
    51,  // NTPN
    -1,  // TGL_BAYAR – resolved saat buildTabColumns dipanggil
    81   // Tempat Nikah / Nikah di
];

// =====================================================================
// STOK GLOBAL STATE
// =====================================================================
var stokData        = [];
var stokHeaders     = [];
var stokFilters     = {};
var stokSort        = { col: 6, dir: 'asc' }; // default: No. Porforasi ASC
var stokVersion     = 0;
var stokRendered    = false;

// Kolom Sheet "Stok" (0-based): No|Provinsi|Kab|Kec|KUA|No.Seri|No.Porforasi|TahunBuku|TglAlokasi|TglDigunakan|Keterangan|Status
var STOK_COL = {
    NO:           0,
    PROVINSI:     1,
    KAB:          2,
    KEC:          3,
    KUA:          4,
    NO_SERI:      5,
    NO_PERFORASI: 6,
    TAHUN_BUKU:   7,
    TGL_ALOKASI:  8,
    TGL_DIGUNAKAN:9,
    KETERANGAN:   10,
    STATUS:       11
};

// Kolom yang ditampilkan di tabel Stok (skip No, Provinsi, Kab, Kec)
var DISPLAY_STOK_COLS = [
    STOK_COL.KUA, STOK_COL.NO_SERI, STOK_COL.NO_PERFORASI,
    STOK_COL.TAHUN_BUKU, STOK_COL.TGL_ALOKASI, STOK_COL.TGL_DIGUNAKAN,
    STOK_COL.KETERANGAN, STOK_COL.STATUS
];

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
var TAB_IDS = ['semua', 'kantor', 'wna', 'kurang12', 'ntpn'];

// Sentinel untuk kolom virtual "Selisih" di tab kurang12
var VIRTUAL_SELISIH = -99;

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

// ✅ FIX Selisih: timezone-safe, strip time component → hanya hitung hari kalender
// Contoh: 31/12/2025 → 01/01/2026 = 1 hari (bukan 0 akibat komponen waktu)
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
        return val.indexOf('KUA') !== -1 || val.indexOf('KANTOR') !== -1;
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
        var tglAkad   = parseDate(row[COL.TGL_AKAD]);
        var tglDaftar = parseDate(row[COL.TGL_DAFTAR]);
        var diff = daysBetweenDates(tglDaftar, tglAkad); // ✅ timezone-safe
        return diff !== null && diff < 12;
    });
}

function getAutoFilter(tabId) {
    var map = {
        semua:    null,
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
            // Exact match karena combobox
            if (String(row[COL.TEMPAT_NIKAH] || '').trim() !== filters.tempatNikah) return false;
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
// Urutan: PRIORITY_COLS (yang ada di data) lalu sisa kolom
// Tab kurang12: VIRTUAL_SELISIH disisipkan setelah KUA
// =====================================================================
function buildTabColumns(tabId) {
    if (allHeaders.length === 0) return { headers: [], indices: [] };

    // Resolve TGL_BAYAR dinamis dari nama header
    var tglBayarIdx = -1;
    for (var bi = 0; bi < allHeaders.length; bi++) {
        if (/bayar/i.test(allHeaders[bi])) { tglBayarIdx = bi; break; }
    }

    // Bangun daftar prioritas yang valid (ada di allHeaders)
    var priority = PRIORITY_COLS.map(function(c) {
        return c === -1 ? tglBayarIdx : c; // -1 = TGL_BAYAR placeholder
    }).filter(function(c) {
        return c >= 0 && c < allHeaders.length;
    });

    // Kolom sisa (tidak ada di priority)
    var prioritySet = {};
    priority.forEach(function(c) { prioritySet[c] = true; });
    var rest = [];
    for (var ri = 0; ri < allHeaders.length; ri++) {
        if (!prioritySet[ri]) rest.push(ri);
    }

    var ordered = priority.concat(rest);

    // Tab kurang12: sisipkan VIRTUAL_SELISIH antara TglDaftar (L) dan TglAkad (AK)
    if (tabId === 'kurang12') {
        var withSelisih = ordered.slice();
        var tglDaftarPos = withSelisih.indexOf(COL.TGL_DAFTAR);
        if (tglDaftarPos !== -1) {
            withSelisih.splice(tglDaftarPos + 1, 0, VIRTUAL_SELISIH);
        } else {
            var tglAkadPos = withSelisih.indexOf(COL.TGL_AKAD);
            if (tglAkadPos !== -1) {
                withSelisih.splice(tglAkadPos, 0, VIRTUAL_SELISIH);
            } else {
                withSelisih.unshift(VIRTUAL_SELISIH);
            }
        }
        return {
            headers: withSelisih.map(function(i) {
                return i === VIRTUAL_SELISIH ? 'Selisih (Hari)' : allHeaders[i];
            }),
            indices: withSelisih
        };
    }

    return {
        headers: ordered.map(function(i) { return allHeaders[i]; }),
        indices: ordered
    };
}

// Kolom yang diberi warna oranye per tab
function getHighlightCols(tabId) {
    if (tabId === 'kantor')   return [COL.TEMPAT_NIKAH];
    if (tabId === 'wna')      return [COL.WN_SUAMI, COL.WN_ISTRI];
    if (tabId === 'kurang12') return [COL.TGL_AKAD, COL.TGL_DAFTAR, VIRTUAL_SELISIH];
    if (tabId === 'ntpn')     return [COL.NTPN];
    return [];
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

    var sort         = sortState[tabId] || {};
    var displayRows  = rows.slice(0, RENDER_LIMIT);
    var hlSet        = getHighlightCols(tabId);

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
        var colI   = cols.indices[idx];
        var sortCls = '';
        if (sort.col === colI && colI !== VIRTUAL_SELISIH) {
            sortCls = sort.dir === 'asc' ? 'sort-asc' : 'sort-desc';
        }
        var hlCls = (hlSet.indexOf(colI) !== -1) ? ' col-orange-th' : '';
        // Virtual kolom tidak sortable
        var clickAttr = (colI === VIRTUAL_SELISIH)
            ? ''
            : 'onclick="toggleSort(\'' + tabId + '\',' + colI + ')" title="Klik untuk urutkan"';
        parts.push(
            '<th class="' + sortCls + hlCls + '" ' + clickAttr + '>' +
            escHtml(String(h)) + '</th>'
        );
    });
    parts.push('</tr></thead><tbody>');

    displayRows.forEach(function(row, idx) {
        parts.push('<tr><td class="col-no">' + (idx + 1) + '</td>');
        cols.indices.forEach(function(colI, ci) {
            var isOrange = hlSet.indexOf(colI) !== -1;
            var tdCls    = isOrange ? ' class="col-orange-td"' : '';

            if (colI === VIRTUAL_SELISIH) {
                // ✅ FIX: timezone-safe date-only difference
                var tglA  = parseDate(row[COL.TGL_AKAD]);
                var tglD  = parseDate(row[COL.TGL_DAFTAR]);
                var diff  = daysBetweenDates(tglD, tglA);
                var disp  = diff !== null ? diff + ' hari' : '-';
                parts.push('<td class="col-orange-td" title="' + disp + '">' + disp + '</td>');
                return;
            }

            var val     = row[colI] != null ? row[colI] : '';
            var display = (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val))
                ? formatDate(val)
                : escHtml(String(val));
            parts.push('<td' + tdCls + ' title="' + escHtml(String(val)) + '">' + display + '</td>');
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
    // Badge tab Semua Data = total
    updateBadge('semua', total);
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
            if (i === VIRTUAL_SELISIH) {
                var diff = daysBetween(parseDate(row[COL.TGL_DAFTAR]), parseDate(row[COL.TGL_AKAD]));
                return diff !== null ? diff : '';
            }
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
        noPerforasi:   val('f-' + tabId + '-noPerforasi'),
        noPendaftaran: val('f-' + tabId + '-noPendaftaran'),
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
// TEMPAT NIKAH DROPDOWN OPTIONS (Combobox)
// =====================================================================
function buildTempatNikahOptions(tabId) {
    var sel = document.getElementById('f-' + tabId + '-tempatNikah');
    if (!sel) return;
    var rows = allData.slice();
    var autoFn = getAutoFilter(tabId);
    if (autoFn) rows = autoFn(rows);
    var vals = {};
    rows.forEach(function(row) {
        var v = String(row[COL.TEMPAT_NIKAH] || '').trim();
        if (v) vals[v] = true;
    });
    var current = sel.value; // preserve current selection
    sel.innerHTML = '<option value="">-- Semua Tempat --</option>';
    Object.keys(vals).sort().forEach(function(k) {
        var opt = document.createElement('option');
        opt.value = k;
        opt.textContent = k;
        sel.appendChild(opt);
    });
    if (current) sel.value = current;
}

// =====================================================================
// STOK BUKU NIKAH — RENDER & FILTER
// =====================================================================

var STATUS_COLORS = {
    'tersedia': { bg: '#d4edda', color: '#155724', border: '#c3e6cb' },
    'terpakai': { bg: '#f8d7da', color: '#721c24', border: '#f5c6cb' },
    'rusak':    { bg: '#fff3cd', color: '#856404', border: '#ffeeba' },
    'hilang':   { bg: '#fde2e4', color: '#842029', border: '#f5c6cb' },
    'default':  { bg: '#e2e3e5', color: '#383d41', border: '#d6d8db' }
};
function getStatusStyle(val) {
    return STATUS_COLORS[String(val || '').toLowerCase().trim()] || STATUS_COLORS['default'];
}
function buildStatusBadge(val) {
    var s = getStatusStyle(val);
    return '<span class="status-badge" style="background:' + s.bg + ';color:' + s.color +
           ';border:1px solid ' + s.border + '">' + escHtml(String(val)) + '</span>';
}

function getStokFilteredData() {
    var rows = stokData.slice();
    var f    = stokFilters;
    if (f.kua)         rows = rows.filter(function(r) { return String(r[STOK_COL.KUA]||'').trim() === f.kua; });
    if (f.bulan && f.bulan.length > 0) rows = rows.filter(function(r) {
        var d = parseDate(r[STOK_COL.TGL_DIGUNAKAN]);
        return d && f.bulan.indexOf(d.getMonth()+1) !== -1;
    });
    if (f.noPerforasi) rows = rows.filter(function(r) {
        return String(r[STOK_COL.NO_PERFORASI]||'').toLowerCase().indexOf(f.noPerforasi.toLowerCase()) !== -1;
    });
    if (f.status)      rows = rows.filter(function(r) {
        return String(r[STOK_COL.STATUS]||'').toLowerCase().trim() === f.status.toLowerCase();
    });
    var s   = stokSort;
    var dir = s.dir === 'asc' ? 1 : -1;
    rows.sort(function(a, b) {
        var va = a[s.col] != null ? a[s.col] : '';
        var vb = b[s.col] != null ? b[s.col] : '';
        var na = parseFloat(va), nb = parseFloat(vb);
        if (!isNaN(na) && !isNaN(nb)) return (na - nb) * dir;
        return String(va).localeCompare(String(vb), 'id') * dir;
    });
    return rows;
}

function renderStokTable() {
    var container = document.getElementById('table-stok');
    if (!container) return;
    if (stokData.length === 0) {
        container.innerHTML = buildEmptyState('Belum ada data Stok', 'Muat data terlebih dahulu dari tab Dashboard Utama.');
        updateBadge('stok', 0);
        return;
    }
    var rows = getStokFilteredData();
    updateBadge('stok', rows.length);
    if (rows.length === 0) {
        container.innerHTML = buildEmptyState('Tidak ada data', 'Tidak ada data yang cocok dengan filter.');
        return;
    }
    var s        = stokSort;
    var display  = rows.slice(0, RENDER_LIMIT);
    var colNames = ['KUA','No. Seri','No. Porforasi','Tahun Buku','Tgl. Alokasi','Tgl. Digunakan','Keterangan','Status'];
    var parts    = [];
    parts.push('<div class="data-info-bar"><div class="count-display">Menampilkan <span>' +
        rows.length.toLocaleString('id-ID') + '</span> data' +
        (rows.length !== stokData.length ? ' dari ' + stokData.length.toLocaleString('id-ID') + ' total' : '') +
        '</div><button class="btn btn-warning btn-sm" onclick="copyStokTable()">📋 Salin Tabel</button></div>');
    parts.push('<div class="table-container"><table id="dataTable-stok"><thead><tr><th class="col-no">#</th>');
    DISPLAY_STOK_COLS.forEach(function(colI, idx) {
        var sc = (s.col === colI) ? (s.dir === 'asc' ? 'sort-asc' : 'sort-desc') : '';
        parts.push('<th class="' + sc + '" onclick="toggleStokSort(' + colI + ')" title="Klik untuk urutkan">' + escHtml(colNames[idx]) + '</th>');
    });
    parts.push('</tr></thead><tbody>');
    display.forEach(function(row, idx) {
        parts.push('<tr><td class="col-no">' + (idx + 1) + '</td>');
        DISPLAY_STOK_COLS.forEach(function(colI) {
            var val = row[colI] != null ? row[colI] : '';
            if (colI === STOK_COL.STATUS) {
                parts.push('<td>' + buildStatusBadge(val) + '</td>');
            } else {
                var disp = (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) ? formatDate(val) : escHtml(String(val));
                parts.push('<td title="' + escHtml(String(val)) + '">' + disp + '</td>');
            }
        });
        parts.push('</tr>');
    });
    if (rows.length > RENDER_LIMIT) {
        parts.push('<tr><td colspan="' + (DISPLAY_STOK_COLS.length + 1) +
            '" style="text-align:center;padding:16px;color:#667eea;font-weight:600;background:#f0f2ff;">' +
            '⚠️ Menampilkan ' + RENDER_LIMIT.toLocaleString() + ' dari ' + rows.length.toLocaleString() + ' data.</td></tr>');
    }
    parts.push('</tbody></table></div>');
    container.innerHTML = parts.join('');
    stokRendered = true;
}

function toggleStokSort(colI) {
    stokSort = (stokSort.col === colI)
        ? { col: colI, dir: stokSort.dir === 'asc' ? 'desc' : 'asc' }
        : { col: colI, dir: 'asc' };
    renderStokTable();
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
    renderStokTable();
}

function resetStokFilter() {
    stokFilters = {};
    stokSort    = { col: STOK_COL.NO_PERFORASI, dir: 'asc' };
    var sec = document.getElementById('filterSection-stok');
    if (sec) {
        sec.querySelectorAll('input[type="text"]').forEach(function(el) { el.value = ''; });
        sec.querySelectorAll('select').forEach(function(el) { el.selectedIndex = 0; });
    }
    document.querySelectorAll('.month-cb-stok').forEach(function(c) { c.checked = true; });
    updateMonthLabel('stok');
    renderStokTable();
}

function buildStokKUAOptions() {
    var sel = document.getElementById('f-stok-kua');
    if (!sel) return;
    var kuas = {};
    stokData.forEach(function(r) { var v = String(r[STOK_COL.KUA]||'').trim(); if (v) kuas[v] = true; });
    var cur = sel.value;
    sel.innerHTML = '<option value="">-- Semua KUA --</option>';
    Object.keys(kuas).sort().forEach(function(k) {
        var o = document.createElement('option'); o.value = k; o.textContent = k; sel.appendChild(o);
    });
    if (cur) sel.value = cur;
}

function buildStokStatusOptions() {
    var sel = document.getElementById('f-stok-status');
    if (!sel) return;
    var vals = {};
    stokData.forEach(function(r) { var v = String(r[STOK_COL.STATUS]||'').trim(); if (v) vals[v] = true; });
    var cur = sel.value;
    sel.innerHTML = '<option value="">-- Semua Status --</option>';
    Object.keys(vals).sort().forEach(function(k) {
        var o = document.createElement('option'); var s = getStatusStyle(k);
        o.value = k; o.textContent = k; o.style.background = s.bg; o.style.color = s.color;
        sel.appendChild(o);
    });
    if (cur) sel.value = cur;
}

function buildStokMonthOptions() {
    var dropdown = document.getElementById('monthDropdown-stok');
    if (!dropdown) return;
    dropdown.querySelectorAll('.month-item').forEach(function(e) { e.remove(); });
    var months = {};
    stokData.forEach(function(r) { var d = parseDate(r[STOK_COL.TGL_DIGUNAKAN]); if (d) months[d.getMonth()+1] = true; });
    Object.keys(months).map(Number).sort(function(a,b){return a-b;}).forEach(function(m) {
        var item = document.createElement('div'); item.className = 'multiselect-item month-item';
        item.innerHTML = '<input type="checkbox" class="month-cb-stok" value="' + m +
                         '" checked onchange="updateMonthLabel(\'stok\')"> ' + BULAN_ID[m];
        dropdown.appendChild(item);
    });
    updateMonthLabel('stok');
}

function setupStokFilter() {
    var div = document.getElementById('filter-stok');
    if (!div) return;
    div.innerHTML =
        '<div class="filter-section" id="filterSection-stok">' +
        '<div class="filter-title"><span>🔎 Filter Data</span>' +
        '<button class="btn btn-secondary btn-sm" onclick="toggleFilterSection(\'stok\')">Sembunyikan</button></div>' +
        '<div class="filter-grid">' +
        '<div class="filter-group"><label>KUA</label><select id="f-stok-kua"><option value="">-- Semua KUA --</option></select></div>' +
        '<div class="filter-group"><label>Bulan Digunakan</label><div class="multiselect-wrapper">' +
        '<button type="button" class="multiselect-trigger" onclick="toggleMonthDropdown(\'stok\')" id="monthTrigger-stok">' +
        '<span id="monthLabel-stok">-- Semua Bulan --</span><span class="arrow">▼</span></button>' +
        '<div class="multiselect-dropdown" id="monthDropdown-stok">' +
        '<div class="multiselect-select-all" onclick="toggleAllMonths(\'stok\')">' +
        '<input type="checkbox" id="monthAll-stok" checked> Pilih Semua</div></div></div></div>' +
        '<div class="filter-group"><label>No. Porforasi</label>' +
        '<input type="text" id="f-stok-noPerforasi" placeholder="Cari no porforasi..."></div>' +
        '<div class="filter-group"><label>Status</label>' +
        '<select id="f-stok-status"><option value="">-- Semua Status --</option></select></div>' +
        '</div><div class="filter-buttons">' +
        '<button class="btn btn-primary btn-sm" onclick="applyStokFilter()">✅ Terapkan Filter</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="resetStokFilter()">🔄 Reset Filter</button>' +
        '</div></div>';
}

function copyStokTable() {
    var rows     = getStokFilteredData();
    var colNames = ['KUA','No. Seri','No. Porforasi','Tahun Buku','Tgl. Alokasi','Tgl. Digunakan','Keterangan','Status'];
    var lines    = [['#'].concat(colNames).join('\t')];
    rows.forEach(function(row, idx) {
        lines.push([idx+1].concat(DISPLAY_STOK_COLS.map(function(c){ return row[c]!=null?row[c]:''; })).join('\t'));
    });
    var text = lines.join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function(){ showNotification('Tabel Stok berhasil disalin','success'); }).catch(function(){ fallbackCopy(text); });
    } else { fallbackCopy(text); }
}

// =====================================================================
// TAB SWITCHING — smooth defer
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

    var realTabId = tabId.replace('tab-', '');

    // Tab Stok ditangani terpisah
    if (realTabId === 'stok') {
        if (!stokRendered) {
            var tableDiv = document.getElementById('table-stok');
            if (tableDiv) tableDiv.innerHTML = '<div class="rendering-state">⏳ Mempersiapkan data...</div>';
            requestAnimationFrame(function() {
                requestAnimationFrame(function() { renderStokTable(); });
            });
        }
        return;
    }

    if (TAB_IDS.indexOf(realTabId) === -1) return;
    if (!isTabStale(realTabId)) return; // sudah fresh

    // Tampilkan placeholder agar browser bisa paint dulu sebelum render berat
    var tableDiv = document.getElementById('table-' + realTabId);
    if (tableDiv) {
        tableDiv.innerHTML = '<div class="rendering-state">⏳ Mempersiapkan data...</div>';
    }

    // Double-rAF: pastikan browser paint placeholder sebelum render tabel
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            refreshTabIfStale(realTabId);
        });
    });
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

        // Filter NTPN hanya tampil di tab ntpn
        var ntpnFilter = (tabId === 'ntpn')
            ? '<div class="filter-group"><label>NTPN (Kolom AZ)</label>' +
              '<input type="text" id="f-' + tabId + '-ntpn" placeholder="Cari NTPN..."></div>'
            : '';

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

            '<div class="filter-group"><label>No Perforasi (Kolom G)</label>' +
            '<input type="text" id="f-' + tabId + '-noPerforasi" placeholder="Cari no perforasi..."></div>' +

            '<div class="filter-group"><label>No Pendaftaran (Kolom K)</label>' +
            '<input type="text" id="f-' + tabId + '-noPendaftaran" placeholder="Cari no pendaftaran..."></div>' +

            '<div class="filter-group"><label>Nama Suami (Kolom N)</label>' +
            '<input type="text" id="f-' + tabId + '-namaSuami" placeholder="Cari nama suami..."></div>' +

            '<div class="filter-group"><label>Nama Istri (Kolom Z)</label>' +
            '<input type="text" id="f-' + tabId + '-namaIstri" placeholder="Cari nama istri..."></div>' +

            '<div class="filter-group"><label>Tempat Nikah (Kolom CD)</label>' +
            '<select id="f-' + tabId + '-tempatNikah"><option value="">-- Semua Tempat --</option></select></div>' +

            ntpnFilter +

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
            buildTempatNikahOptions(tabId);
        });

        // Invalidate semua tab, lalu render dengan defer agar tidak freeze
        invalidateAllTabs();

        // Render tab aktif langsung, sisanya di-defer
        var activeTabEl = document.querySelector('.tab-content.active');
        var activeId    = activeTabEl ? activeTabEl.id.replace('tab-', '') : '';
        if (TAB_IDS.indexOf(activeId) !== -1) {
            renderTable(activeId);
            markTabFresh(activeId);
        }
        // Render tab lain secara bertahap
        var remaining = TAB_IDS.filter(function(t) { return t !== activeId; });
        remaining.forEach(function(tabId, i) {
            setTimeout(function() {
                renderTable(tabId);
                markTabFresh(tabId);
            }, (i + 1) * 80);
        });

        updateDashboardStats();
        updateLoadedInfo();

        // ── Muat data Stok dari Sheet "Stok" di file yang sama ──────────
        loadStokData(fileId);

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
// LOAD DATA STOK (Sheet "Stok" dari file yang sama)
// =====================================================================
async function loadStokData(fileId) {
    try {
        stokData     = [];
        stokFilters  = {};
        stokSort     = { col: STOK_COL.NO_PERFORASI, dir: 'asc' };
        stokRendered = false;
        updateBadge('stok', 0);

        // Tampilkan loading di tabel stok
        var tableDiv = document.getElementById('table-stok');
        if (tableDiv) tableDiv.innerHTML = '<div class="rendering-state">⏳ Memuat data Stok...</div>';

        var result = await apiCall('getStokData', { fileId: fileId });

        var rows = [];
        if (result && result.type === 'base64') {
            if (typeof XLSX === 'undefined') throw new Error('SheetJS belum termuat.');
            var wb   = XLSX.read(result.content, { type: 'base64', cellDates: true });
            // Cari sheet bernama "Stok" (case-insensitive)
            var sheetName = wb.SheetNames.find(function(n) {
                return n.toLowerCase().trim() === 'stok';
            }) || wb.SheetNames[0];
            var ws  = wb.Sheets[sheetName];
            var raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            if (raw.length > 1) {
                rows = raw.slice(1)
                    .filter(function(r) { return r.some(function(c) { return c !== '' && c != null; }); })
                    .map(function(r) {
                        return r.map(function(c) {
                            return c instanceof Date ? formatISODate(c) : (c != null ? c : '');
                        });
                    });
            }
        } else if (result && result.rows) {
            rows = result.rows || [];
        }

        stokData = rows;

        // Rebuild filter options lalu render
        buildStokKUAOptions();
        buildStokStatusOptions();
        buildStokMonthOptions();

        // Render jika tab stok sedang aktif, kalau tidak lazy
        var activeTabEl = document.querySelector('.tab-content.active');
        var activeId    = activeTabEl ? activeTabEl.id : '';
        if (activeId === 'tab-stok') {
            renderStokTable();
        } else {
            stokRendered = false; // akan di-render saat user klik tab
            if (tableDiv) tableDiv.innerHTML = buildEmptyState(
                'Data Stok siap',
                'Klik tab ini untuk menampilkan ' + rows.length.toLocaleString('id-ID') + ' baris data stok.'
            );
        }

        updateBadge('stok', rows.length);
        console.log('[STOK] Loaded', rows.length, 'rows');

    } catch (err) {
        console.error('[STOK] Error:', err);
        var td = document.getElementById('table-stok');
        if (td) td.innerHTML = buildEmptyState('Gagal memuat data Stok', err.message || 'Periksa koneksi atau konfigurasi server.');
        showNotification('Gagal memuat data Stok: ' + (err.message || ''), 'warning');
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

    // Reset stok
    stokData     = [];
    stokFilters  = {};
    stokSort     = { col: STOK_COL.NO_PERFORASI, dir: 'asc' };
    stokRendered = false;

    invalidateAllTabs();

    // Reset stats
    ['total', 'kantor', 'wna', 'kurang12', 'ntpn'].forEach(function(k) {
        var el = document.getElementById('stat-' + k);
        if (el) el.textContent = '0';
    });
    TAB_IDS.forEach(function(tabId) {
        updateBadge(tabId, 0);
        var sel = document.getElementById('f-' + tabId + '-tempatNikah');
        if (sel) sel.innerHTML = '<option value="">-- Semua Tempat --</option>';
        var kuaSel = document.getElementById('f-' + tabId + '-kua');
        if (kuaSel) kuaSel.innerHTML = '<option value="">-- Semua KUA --</option>';
    });
    updateBadge('stok', 0);
    var stokSel = document.getElementById('f-stok-kua');
    if (stokSel) stokSel.innerHTML = '<option value="">-- Semua KUA --</option>';
    var stokStatus = document.getElementById('f-stok-status');
    if (stokStatus) stokStatus.innerHTML = '<option value="">-- Semua Status --</option>';

    // Tampilkan empty state di semua tab termasuk stok
    TAB_IDS.forEach(function(tabId) {
        var tableDiv = document.getElementById('table-' + tabId);
        if (tableDiv) tableDiv.innerHTML = buildEmptyState('Belum ada data dimuat', 'Muat data terlebih dahulu dari tab Dashboard Utama.');
    });
    var stokDiv = document.getElementById('table-stok');
    if (stokDiv) stokDiv.innerHTML = buildEmptyState('Belum ada data dimuat', 'Muat data terlebih dahulu dari tab Dashboard Utama.');

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
    setupStokFilter();

    // Load daftar file (pakai cache jika ada)
    refreshFileList(false);

    console.log('[SUPERVISI] Ready. dataVersion=' + dataVersion);
});

// =====================================================================
// GLOBAL EXPORTS
// =====================================================================
window.switchTab            = switchTab;
var _refreshFileList        = refreshFileList; // ✅ capture sebelum overwrite
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
// Stok exports
window.applyStokFilter      = applyStokFilter;
window.resetStokFilter      = resetStokFilter;
window.toggleStokSort       = toggleStokSort;
window.copyStokTable        = copyStokTable;