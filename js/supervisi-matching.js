// ===================================================================
// TAB REKAP PORFORASI — supervisi-matching.js
// VLOOKUP-style join: Stok Buku (kiri) ⟕ Data Nikah (kanan)
// Kunci join: No. Porforasi  (STOK_COL.NO_PERFORASI ↔ COL.NO_PERFORASI)
// ===================================================================
// Cara integrasi:
//   1. Tambahkan tab button + tab content di supervisi-dashboard.html
//   2. Tambahkan <script src="js/supervisi-matching.js"></script> SETELAH
//      supervisi-script.js.
//   Tidak perlu mengubah supervisi-script.js — file ini meng-override
//   fungsi yang diperlukan secara otomatis.
// ===================================================================

/* global COL, STOK_COL, DISPLAY_STOK_COLS, STOK_COL_NAMES,
          allData, stokData, allHeaders, stokHeaders,
          PAGE_SIZE, BULAN_ID,
          parseDate, formatDate, formatStokDate, getMonthNumber,
          buildPagination, buildEmptyState, buildTabLoadingState,
          buildStatusBadge, getStatusStyle, buildMonthOptions,
          toggleMonthDropdown, toggleAllMonths, updateMonthLabel,
          escHtml, fallbackOrClipboard, showNotification,
          updateBadge, XLSX */

// ── State ──────────────────────────────────────────────────────────
var matchingFilters = {};
var matchingSort    = { col: 'noPerforasi', dir: 'asc' };
var matchingPage    = 1;
var matchingDirty   = true;

// ═══════════════════════════════════════════════════════════════════
// 1. DATA JOIN (VLOOKUP)
// ═══════════════════════════════════════════════════════════════════

/** Normalisasi nomor perforasi untuk perbandingan (case-insensitive, no spaces). */
function normalizePerforasi(val) {
    return String(val || '').replace(/\s+/g, '').toLowerCase().trim();
}

/** Bangun lookup index: normalizedPerforasi → baris nikah pertama yang cocok.
 *  Support format ganda:
 *    "113696253"              → 1 nomor
 *    "113696253 | 113696254"  → 2 nomor, keduanya di-index ke baris yang sama
 */
function buildNikahPerforasiIndex() {
    var map = {};
    allData.forEach(function(row) {
        var raw = String(row[COL.NO_PERFORASI] || '');
        // Pisah berdasar "|" lalu index setiap nomor secara terpisah
        raw.split('|').forEach(function(part) {
            var key = normalizePerforasi(part);
            if (key && !map[key]) map[key] = row;   // ambil baris pertama jika duplikat
        });
    });
    return map;
}

/**
 * Bangun array merged rows: setiap baris stokData dipasangkan
 * dengan baris nikah yang cocok (atau null jika tidak ditemukan).
 * @returns {Array<{stok, nikah, matched}>}
 */
function buildMatchingRows() {
    if (stokData.length === 0) return [];
    var idx = buildNikahPerforasiIndex();
    return stokData.map(function(stokRow) {
        var key      = normalizePerforasi(stokRow[STOK_COL.NO_PERFORASI]);
        var nikahRow = key ? (idx[key] || null) : null;
        return { stok: stokRow, nikah: nikahRow, matched: !!nikahRow };
    });
}

// ═══════════════════════════════════════════════════════════════════
// 2. FILTER + SORT
// ═══════════════════════════════════════════════════════════════════

function getMatchingFilteredData() {
    var rows = buildMatchingRows();
    var f    = matchingFilters;

    // ── Match status ──
    if (f.matchStatus === 'matched')
        rows = rows.filter(function(r) { return  r.matched; });
    else if (f.matchStatus === 'unmatched')
        rows = rows.filter(function(r) { return !r.matched; });

    // ── KUA (dari Stok Buku) ──
    if (f.kuaStok && STOK_COL.KUA >= 0)
        rows = rows.filter(function(r) {
            return String(r.stok[STOK_COL.KUA] || '').trim() === f.kuaStok;
        });

    // ── No. Porforasi ──
    if (f.noPerforasi && STOK_COL.NO_PERFORASI >= 0)
        rows = rows.filter(function(r) {
            return String(r.stok[STOK_COL.NO_PERFORASI] || '')
                .toLowerCase().indexOf(f.noPerforasi.toLowerCase()) !== -1;
        });

    // ── Status buku (Stok) ──
    if (f.status && STOK_COL.STATUS >= 0)
        rows = rows.filter(function(r) {
            return String(r.stok[STOK_COL.STATUS] || '').toLowerCase().trim()
                === f.status.toLowerCase();
        });

    // ── Bulan Digunakan (Stok) ──
    if (f.bulanDigunakan && f.bulanDigunakan.length > 0 && STOK_COL.TGL_DIGUNAKAN >= 0)
        rows = rows.filter(function(r) {
            var d = parseDate(r.stok[STOK_COL.TGL_DIGUNAKAN]);
            return d && f.bulanDigunakan.indexOf(d.getMonth() + 1) !== -1;
        });

    // ── Bulan Akad (Nikah) ──
    if (f.bulanAkad && f.bulanAkad.length > 0)
        rows = rows.filter(function(r) {
            if (!r.nikah) return false;
            var d = parseDate(r.nikah[COL.TGL_AKAD]);
            return d && f.bulanAkad.indexOf(d.getMonth() + 1) !== -1;
        });

    // ── Nama Suami ──
    if (f.namaSuami)
        rows = rows.filter(function(r) {
            return r.nikah && String(r.nikah[COL.NAMA_SUAMI] || '')
                .toLowerCase().indexOf(f.namaSuami.toLowerCase()) !== -1;
        });

    // ── Nama Istri ──
    if (f.namaIstri)
        rows = rows.filter(function(r) {
            return r.nikah && String(r.nikah[COL.NAMA_ISTRI] || '')
                .toLowerCase().indexOf(f.namaIstri.toLowerCase()) !== -1;
        });

    // ── Tempat Nikah ──
    if (f.tempatNikah)
        rows = rows.filter(function(r) {
            return r.nikah && String(r.nikah[COL.TEMPAT_NIKAH] || '').trim() === f.tempatNikah;
        });

    // ── Sort ──
    var dir = matchingSort.dir === 'asc' ? 1 : -1;
    var col = matchingSort.col;

    rows.sort(function(a, b) {
        var va = '', vb = '';
        switch (col) {
            case 'noPerforasi':
                va = STOK_COL.NO_PERFORASI >= 0 ? String(a.stok[STOK_COL.NO_PERFORASI] || '') : '';
                vb = STOK_COL.NO_PERFORASI >= 0 ? String(b.stok[STOK_COL.NO_PERFORASI] || '') : '';
                break;
            case 'statusBuku':
                va = STOK_COL.STATUS >= 0 ? String(a.stok[STOK_COL.STATUS] || '') : '';
                vb = STOK_COL.STATUS >= 0 ? String(b.stok[STOK_COL.STATUS] || '') : '';
                break;
            case 'tglDigunakan':
                va = STOK_COL.TGL_DIGUNAKAN >= 0 ? String(a.stok[STOK_COL.TGL_DIGUNAKAN] || '') : '';
                vb = STOK_COL.TGL_DIGUNAKAN >= 0 ? String(b.stok[STOK_COL.TGL_DIGUNAKAN] || '') : '';
                break;
            case 'tglAkad':
                va = a.nikah ? String(a.nikah[COL.TGL_AKAD] || '') : '';
                vb = b.nikah ? String(b.nikah[COL.TGL_AKAD] || '') : '';
                break;
            case 'namaSuami':
                va = a.nikah ? String(a.nikah[COL.NAMA_SUAMI] || '') : '';
                vb = b.nikah ? String(b.nikah[COL.NAMA_SUAMI] || '') : '';
                break;
            case 'namaIstri':
                va = a.nikah ? String(a.nikah[COL.NAMA_ISTRI] || '') : '';
                vb = b.nikah ? String(b.nikah[COL.NAMA_ISTRI] || '') : '';
                break;
            case 'matchStatus':
                va = a.matched ? '1' : '0';
                vb = b.matched ? '1' : '0';
                break;
            default:
                return 0;
        }
        return va.localeCompare(vb, 'id') * dir;
    });

    return rows;
}

// ═══════════════════════════════════════════════════════════════════
// 3. FILTER UI
// ═══════════════════════════════════════════════════════════════════

function setupMatchingFilter() {
    var div = document.getElementById('filter-matching');
    if (!div) return;

    div.innerHTML =
        '<div class="filter-section" id="filterSection-matching">' +
        '<div class="filter-title"><span>🔎 Filter Rekap Porforasi</span>' +
        '<button class="btn btn-secondary btn-sm" onclick="toggleMatchingFilterSection()">Sembunyikan</button></div>' +
        '<div class="filter-grid" id="matchingFilterGrid">' +

        // Baris 1 ─ Status Matching & No. Porforasi
        '<div class="filter-group"><label>Status Matching</label>' +
        '<select id="f-matching-matchStatus">' +
        '<option value="">-- Semua --</option>' +
        '<option value="matched">✅ Ada di Data Nikah</option>' +
        '<option value="unmatched">❌ Belum Ada di Data Nikah</option>' +
        '</select></div>' +

        '<div class="filter-group"><label>No. Porforasi</label>' +
        '<input type="text" id="f-matching-noPerforasi" placeholder="Cari..."></div>' +

        // Baris 2 ─ KUA (Stok)
        '<div class="filter-group"><label>KUA (Stok Buku)</label>' +
        '<select id="f-matching-kuaStok"><option value="">-- Semua KUA --</option></select></div>' +

        // Baris 3 ─ Status Buku & Bulan Digunakan
        '<div class="filter-group"><label>Status Buku</label>' +
        '<select id="f-matching-status"><option value="">-- Semua Status --</option></select></div>' +

        '<div class="filter-group"><label>Bulan Digunakan (Stok)</label>' +
        '<div class="multiselect-wrapper">' +
        '<button type="button" class="multiselect-trigger" onclick="toggleMonthDropdown(\'mdig\')" id="monthTrigger-mdig">' +
        '<span id="monthLabel-mdig">-- Semua Bulan --</span><span class="arrow">▼</span></button>' +
        '<div class="multiselect-dropdown" id="monthDropdown-mdig">' +
        '<div class="multiselect-select-all" onclick="toggleAllMonths(\'mdig\')">' +
        '<input type="checkbox" id="monthAll-mdig" checked> Pilih Semua</div>' +
        '</div></div></div>' +

        // Baris 4 ─ Bulan Akad & Tempat Nikah
        '<div class="filter-group"><label>Bulan Akad (Nikah)</label>' +
        '<div class="multiselect-wrapper">' +
        '<button type="button" class="multiselect-trigger" onclick="toggleMonthDropdown(\'makad\')" id="monthTrigger-makad">' +
        '<span id="monthLabel-makad">-- Semua Bulan --</span><span class="arrow">▼</span></button>' +
        '<div class="multiselect-dropdown" id="monthDropdown-makad">' +
        '<div class="multiselect-select-all" onclick="toggleAllMonths(\'makad\')">' +
        '<input type="checkbox" id="monthAll-makad" checked> Pilih Semua</div>' +
        '</div></div></div>' +

        '<div class="filter-group"><label>Tempat Nikah</label>' +
        '<select id="f-matching-tempatNikah"><option value="">-- Semua Tempat --</option></select></div>' +

        // Baris 5 ─ Nama Suami & Istri
        '<div class="filter-group"><label>Nama Suami</label>' +
        '<input type="text" id="f-matching-namaSuami" placeholder="Cari..."></div>' +

        '<div class="filter-group"><label>Nama Istri</label>' +
        '<input type="text" id="f-matching-namaIstri" placeholder="Cari..."></div>' +

        '</div>' + // /matchingFilterGrid
        '<div class="filter-buttons">' +
        '<button class="btn btn-primary btn-sm" onclick="applyMatchingFilter()">✅ Terapkan</button>' +
        '<button class="btn btn-secondary btn-sm" onclick="resetMatchingFilter()">🔄 Reset</button>' +
        '</div></div>'; // /filter-section
}

function toggleMatchingFilterSection() {
    var grid = document.getElementById('matchingFilterGrid');
    var btns = document.querySelector('#filterSection-matching .filter-buttons');
    var btn  = document.querySelector('#filterSection-matching .filter-title button');
    if (!grid) return;
    var hidden = grid.style.display === 'none';
    grid.style.display  = hidden ? 'grid' : 'none';
    if (btns) btns.style.display = hidden ? 'flex' : 'none';
    if (btn)  btn.textContent    = hidden ? 'Sembunyikan' : 'Tampilkan';
}

function applyMatchingFilter() {
    var val = function(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; };
    var cbsDig  = Array.from(document.querySelectorAll('.month-cb-mdig'));
    var chkDig  = cbsDig.filter(function(c)  { return c.checked; });
    var cbsAkad = Array.from(document.querySelectorAll('.month-cb-makad'));
    var chkAkad = cbsAkad.filter(function(c) { return c.checked; });

    matchingFilters = {
        matchStatus:    val('f-matching-matchStatus'),
        kuaStok:        val('f-matching-kuaStok'),
        noPerforasi:    val('f-matching-noPerforasi'),
        status:         val('f-matching-status'),
        bulanDigunakan: cbsDig.length === 0 || chkDig.length === cbsDig.length
                        ? [] : chkDig.map(function(c) { return parseInt(c.value); }),
        bulanAkad:      cbsAkad.length === 0 || chkAkad.length === cbsAkad.length
                        ? [] : chkAkad.map(function(c) { return parseInt(c.value); }),
        namaSuami:      val('f-matching-namaSuami'),
        namaIstri:      val('f-matching-namaIstri'),
        tempatNikah:    val('f-matching-tempatNikah')
    };
    matchingPage = 1;
    renderMatchingTable();
}

function resetMatchingFilter() {
    matchingFilters = {};
    matchingSort    = { col: 'noPerforasi', dir: 'asc' };
    matchingPage    = 1;
    var sec = document.getElementById('filterSection-matching');
    if (sec) {
        sec.querySelectorAll('input[type="text"]').forEach(function(el) { el.value = ''; });
        sec.querySelectorAll('select').forEach(function(el) { el.selectedIndex = 0; });
    }
    document.querySelectorAll('.month-cb-mdig').forEach(function(c)  { c.checked = true; });
    document.querySelectorAll('.month-cb-makad').forEach(function(c) { c.checked = true; });
    updateMonthLabel('mdig');
    updateMonthLabel('makad');
    renderMatchingTable();
}

// ═══════════════════════════════════════════════════════════════════
// 4. BUILD DROPDOWN OPTIONS
// ═══════════════════════════════════════════════════════════════════

function buildMatchingFilterOptions() {
    // KUA Stok
    _buildSelectOptions('f-matching-kuaStok', '-- Semua KUA --', (function() {
        var m = {};
        if (STOK_COL.KUA >= 0)
            stokData.forEach(function(r) { var v = String(r[STOK_COL.KUA] || '').trim(); if (v) m[v] = true; });
        return Object.keys(m).sort();
    })());

    // Status buku
    var statusSel = document.getElementById('f-matching-status');
    if (statusSel && STOK_COL.STATUS >= 0) {
        var vals = {};
        stokData.forEach(function(r) { var v = String(r[STOK_COL.STATUS] || '').trim(); if (v) vals[v] = true; });
        statusSel.innerHTML = '<option value="">-- Semua Status --</option>';
        Object.keys(vals).sort().forEach(function(k) {
            var o = document.createElement('option');
            var s = getStatusStyle(k);
            o.value = k; o.textContent = k;
            o.style.background = s.bg; o.style.color = s.color;
            statusSel.appendChild(o);
        });
    }

    // Tempat Nikah
    _buildSelectOptions('f-matching-tempatNikah', '-- Semua Tempat --', (function() {
        var m = {};
        allData.forEach(function(r) { var v = String(r[COL.TEMPAT_NIKAH] || '').trim(); if (v) m[v] = true; });
        return Object.keys(m).sort();
    })());

    // Bulan multiselect — Digunakan (Stok)
    buildMonthOptions('mdig', stokData, function(row) {
        var d = parseDate(row[STOK_COL.TGL_DIGUNAKAN]);
        return d ? d.getMonth() + 1 : null;
    });

    // Bulan multiselect — Akad (Nikah)
    buildMonthOptions('makad', allData, function(row) {
        return getMonthNumber(row[COL.TGL_AKAD]);
    });
}

function _buildSelectOptions(id, placeholder, sortedKeys) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">' + placeholder + '</option>';
    sortedKeys.forEach(function(k) {
        var o = document.createElement('option');
        o.value = k; o.textContent = k; sel.appendChild(o);
    });
}

// ═══════════════════════════════════════════════════════════════════
// 5. SUMMARY BAR (ringkasan statistik)
// ═══════════════════════════════════════════════════════════════════

function buildMatchingSummaryBar(filteredRows, totalRows) {
    var total     = filteredRows.length;
    var matched   = filteredRows.filter(function(r) { return r.matched; }).length;
    var unmatched = total - matched;
    var pct       = total > 0 ? Math.round(matched / total * 100) : 0;
    var isFiltered = totalRows && totalRows.length !== total;

    var totalNum = isFiltered
        ? total.toLocaleString('id-ID') + '<small style="font-size:13px;color:#999;font-weight:500"> / ' + totalRows.length.toLocaleString('id-ID') + '</small>'
        : total.toLocaleString('id-ID');
    var totalLbl = isFiltered ? '🔎 Data Terfilter' : 'Total Porforasi';

    return '<div class="matching-summary-bar">' +
        '<div class="msb-item msb-total">' +
            '<div class="msb-num">' + totalNum + '</div>' +
            '<div class="msb-lbl">' + totalLbl + '</div>' +
        '</div>' +
        '<div class="msb-item msb-matched">' +
            '<div class="msb-num">' + matched.toLocaleString('id-ID') + '</div>' +
            '<div class="msb-lbl">✅ Ada di Data Nikah</div>' +
        '</div>' +
        '<div class="msb-item msb-unmatched">' +
            '<div class="msb-num">' + unmatched.toLocaleString('id-ID') + '</div>' +
            '<div class="msb-lbl">❌ Duplikat/Rusak/Belum Terpakai</div>' +
        '</div>' +
        '<div class="msb-item msb-pct">' +
            '<div class="msb-pct-track"><div class="msb-pct-fill" style="width:' + pct + '%"></div></div>' +
            '<div class="msb-lbl">' + pct + '% Terpakai</div>' +
        '</div>' +
    '</div>';
}

// ═══════════════════════════════════════════════════════════════════
// 6. SORT HELPERS
// ═══════════════════════════════════════════════════════════════════

function _sortClass(col) {
    if (matchingSort.col !== col) return '';
    return ' class="' + (matchingSort.dir === 'asc' ? 'sort-asc' : 'sort-desc') + '"';
}

function toggleMatchingSort(col) {
    matchingSort = (matchingSort.col === col)
        ? { col: col, dir: matchingSort.dir === 'asc' ? 'desc' : 'asc' }
        : { col: col, dir: 'asc' };
    matchingPage = 1;
    renderMatchingTable();
}

// ═══════════════════════════════════════════════════════════════════
// 7. RENDER TABLE
// ═══════════════════════════════════════════════════════════════════

function renderMatchingTable() {
    var container = document.getElementById('table-matching');
    if (!container) return;

    if (stokData.length === 0) {
        container.innerHTML = buildEmptyState(
            'Belum ada data dimuat',
            'Muat data terlebih dahulu dari tab Dashboard.'
        );
        updateBadge('matching', 0);
        return;
    }

    var allRows    = getMatchingFilteredData();
    var allBasRows = buildMatchingRows();          // untuk summary (total tanpa filter)
    var totalRows  = allRows.length;
    var totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
    matchingPage   = Math.max(1, Math.min(matchingPage, totalPages));

    updateBadge('matching', totalRows);

    var parts = [];

    // ── Summary bar — selalu reflect data terfilter ──
    parts.push(buildMatchingSummaryBar(allRows, allBasRows));

    if (totalRows === 0) {
        parts.push(buildEmptyState('Tidak ada data', 'Tidak ada data yang cocok dengan filter.'));
        container.innerHTML = parts.join('');
        return;
    }

    var start       = (matchingPage - 1) * PAGE_SIZE;
    var displayRows = allRows.slice(start, start + PAGE_SIZE);

    // ── Info bar ──
    parts.push('<div class="data-info-bar">');
    parts.push(
        '<div class="count-display">Menampilkan <span>' +
        totalRows.toLocaleString('id-ID') + '</span> data' +
        (totalRows !== allBasRows.length
            ? ' dari ' + allBasRows.length.toLocaleString('id-ID') + ' total'
            : '') +
        '</div>'
    );
    parts.push(
        '<div class="action-btns">' +
        '<button class="btn btn-warning btn-sm" onclick="copyMatchingTable()">📋 Salin</button>' +
        '<button class="btn btn-download btn-sm" onclick="downloadMatchingAsXlsx()">⬇ Download XLSX</button>' +
        '</div></div>'
    );

    // ── Pagination top ──
    parts.push(buildPagination('matching', matchingPage, totalPages, totalRows));

    // ── Table ──
    parts.push('<div class="table-container"><table><thead>');

    // ── Baris subheader ──
    var stokColSpan = 1; // No. Porforasi
    if (STOK_COL.NO_SERI >= 0)       stokColSpan++;
    if (STOK_COL.TAHUN_BUKU >= 0)    stokColSpan++;
    if (STOK_COL.KUA >= 0)           stokColSpan++;
    if (STOK_COL.STATUS >= 0)        stokColSpan++;
    if (STOK_COL.TGL_ALOKASI >= 0)   stokColSpan++;
    if (STOK_COL.TGL_DIGUNAKAN >= 0) stokColSpan++;
    if (STOK_COL.KETERANGAN >= 0)    stokColSpan++;

    var nikahColSpan = 8; // No.Pendaftaran, No.Akta, TglDaftar, TglAkad, Suami, Istri, Tempat, NTPN

    parts.push('<tr class="matching-group-header">');
    parts.push('<th colspan="2" class="mgh-status">Status & No. Porforasi</th>');
    parts.push('<th colspan="' + stokColSpan + '" class="mgh-stok">📚 Data Stok Buku</th>');
    parts.push('<th colspan="' + nikahColSpan + '" class="mgh-nikah">💍 Data Nikah (Join)</th>');
    parts.push('</tr>');

    // ── Header utama ──
    parts.push('<tr>');
    parts.push('<th class="col-no">#</th>');
    parts.push('<th' + _sortClass('matchStatus') + ' onclick="toggleMatchingSort(\'matchStatus\')" title="Urutkan">Status</th>');
    parts.push('<th' + _sortClass('noPerforasi')  + ' onclick="toggleMatchingSort(\'noPerforasi\')"  title="Urutkan">No. Porforasi</th>');

    // Kolom Stok
    if (STOK_COL.NO_SERI >= 0)
        parts.push('<th>No. Seri</th>');
    if (STOK_COL.TAHUN_BUKU >= 0)
        parts.push('<th>Tahun Buku</th>');
    if (STOK_COL.KUA >= 0)
        parts.push('<th>KUA (Stok)</th>');
    if (STOK_COL.STATUS >= 0)
        parts.push('<th' + _sortClass('statusBuku') + ' onclick="toggleMatchingSort(\'statusBuku\')" title="Urutkan">Status Buku</th>');
    if (STOK_COL.TGL_ALOKASI >= 0)
        parts.push('<th>Tgl. Alokasi</th>');
    if (STOK_COL.TGL_DIGUNAKAN >= 0)
        parts.push('<th' + _sortClass('tglDigunakan') + ' onclick="toggleMatchingSort(\'tglDigunakan\')" title="Urutkan">Tgl. Digunakan</th>');
    if (STOK_COL.KETERANGAN >= 0)
        parts.push('<th>Keterangan</th>');

    // Kolom Nikah (dengan divider visual pada kolom pertama)
    parts.push('<th class="matching-divider-col">No. Pendaftaran</th>');
    parts.push('<th>No. Akta Nikah</th>');
    parts.push('<th>Tgl. Daftar</th>');
    parts.push('<th' + _sortClass('tglAkad') + ' onclick="toggleMatchingSort(\'tglAkad\')" title="Urutkan">Tgl. Akad</th>');
    parts.push('<th' + _sortClass('namaSuami') + ' onclick="toggleMatchingSort(\'namaSuami\')" title="Urutkan">Nama Suami</th>');
    parts.push('<th' + _sortClass('namaIstri') + ' onclick="toggleMatchingSort(\'namaIstri\')" title="Urutkan">Nama Istri</th>');
    parts.push('<th>Tempat Nikah</th>');
    parts.push('<th>NTPN</th>');
    parts.push('</tr></thead><tbody>');

    // ── Rows ──
    var DASH = '<td class="cell-empty">—</td>';

    displayRows.forEach(function(row, idx) {
        var stok    = row.stok;
        var nikah   = row.nikah;
        var matched = row.matched;

        parts.push('<tr class="' + (matched ? 'row-matched' : 'row-unmatched') + '">');
        parts.push('<td class="col-no">' + (start + idx + 1) + '</td>');

        // Status badge
        var badge = matched
            ? '<span class="match-badge match-yes">✅ Ada</span>'
            : '<span class="match-badge match-no">❌ Tidak Ada</span>';
        parts.push('<td>' + badge + '</td>');

        // No. Porforasi
        var noPer = STOK_COL.NO_PERFORASI >= 0
            ? escHtml(String(stok[STOK_COL.NO_PERFORASI] || ''))
            : '';
        parts.push('<td class="cell-perforasi">' + noPer + '</td>');

        // Stok columns
        if (STOK_COL.NO_SERI >= 0)
            parts.push('<td>' + escHtml(String(stok[STOK_COL.NO_SERI] || '')) + '</td>');
        if (STOK_COL.TAHUN_BUKU >= 0)
            parts.push('<td>' + escHtml(String(stok[STOK_COL.TAHUN_BUKU] || '')) + '</td>');
        if (STOK_COL.KUA >= 0)
            parts.push('<td>' + escHtml(String(stok[STOK_COL.KUA] || '')) + '</td>');
        if (STOK_COL.STATUS >= 0)
            parts.push('<td>' + buildStatusBadge(stok[STOK_COL.STATUS]) + '</td>');
        if (STOK_COL.TGL_ALOKASI >= 0)
            parts.push('<td>' + formatStokDate(stok[STOK_COL.TGL_ALOKASI]) + '</td>');
        if (STOK_COL.TGL_DIGUNAKAN >= 0)
            parts.push('<td>' + formatStokDate(stok[STOK_COL.TGL_DIGUNAKAN]) + '</td>');
        if (STOK_COL.KETERANGAN >= 0)
            parts.push('<td>' + escHtml(String(stok[STOK_COL.KETERANGAN] || '')) + '</td>');

        // Nikah columns
        if (!matched) {
            // 8 empty cells (No.Pendaftaran, No.Akta, TglDaftar, TglAkad, Suami, Istri, Tempat, NTPN)
            for (var e = 0; e < 8; e++) parts.push(DASH);
        } else {
            parts.push('<td class="matching-divider-col">' + escHtml(String(nikah[COL.NO_PENDAFTARAN] || '')) + '</td>');
            parts.push('<td>' + escHtml(String(nikah[COL.NO_AKTA_NIKAH]  || '')) + '</td>');
            parts.push('<td>' + formatDate(nikah[COL.TGL_DAFTAR]) + '</td>');
            parts.push('<td>' + formatDate(nikah[COL.TGL_AKAD]) + '</td>');
            parts.push('<td>' + escHtml(String(nikah[COL.NAMA_SUAMI] || '')) + '</td>');
            parts.push('<td>' + escHtml(String(nikah[COL.NAMA_ISTRI] || '')) + '</td>');
            parts.push('<td>' + escHtml(String(nikah[COL.TEMPAT_NIKAH] || '')) + '</td>');
            parts.push('<td>' + escHtml(String(nikah[COL.NTPN] || '')) + '</td>');
        }

        parts.push('</tr>');
    });

    parts.push('</tbody></table></div>');
    parts.push(buildPagination('matching', matchingPage, totalPages, totalRows));

    container.innerHTML = parts.join('');
    matchingDirty = false;
}

// ═══════════════════════════════════════════════════════════════════
// 8. COPY & DOWNLOAD
// ═══════════════════════════════════════════════════════════════════

function _matchingRowToArray(r, idx) {
    var s = r.stok;
    var n = r.nikah;
    return [
        idx + 1,
        r.matched ? 'Ada' : 'Belum',
        STOK_COL.NO_PERFORASI  >= 0 ? (s[STOK_COL.NO_PERFORASI]  || '') : '',
        STOK_COL.NO_SERI       >= 0 ? (s[STOK_COL.NO_SERI]       || '') : '',
        STOK_COL.TAHUN_BUKU    >= 0 ? (s[STOK_COL.TAHUN_BUKU]    || '') : '',
        STOK_COL.KUA           >= 0 ? (s[STOK_COL.KUA]           || '') : '',
        STOK_COL.STATUS        >= 0 ? (s[STOK_COL.STATUS]        || '') : '',
        STOK_COL.TGL_ALOKASI   >= 0 ? formatStokDate(s[STOK_COL.TGL_ALOKASI])   : '',
        STOK_COL.TGL_DIGUNAKAN >= 0 ? formatStokDate(s[STOK_COL.TGL_DIGUNAKAN]) : '',
        STOK_COL.KETERANGAN    >= 0 ? (s[STOK_COL.KETERANGAN]    || '') : '',
        n ? (n[COL.NO_PENDAFTARAN] || '') : '',
        n ? (n[COL.NO_AKTA_NIKAH]  || '') : '',
        n ? formatDate(n[COL.TGL_DAFTAR]) : '',
        n ? formatDate(n[COL.TGL_AKAD])   : '',
        n ? (n[COL.NAMA_SUAMI]   || '') : '',
        n ? (n[COL.NAMA_ISTRI]   || '') : '',
        n ? (n[COL.TEMPAT_NIKAH] || '') : '',
        n ? (n[COL.NTPN]         || '') : ''
    ];
}

var _MATCHING_HEADERS = [
    '#', 'Status', 'No. Porforasi', 'No. Seri', 'Tahun Buku',
    'KUA (Stok)', 'Status Buku', 'Tgl. Alokasi', 'Tgl. Digunakan', 'Keterangan',
    'No. Pendaftaran', 'No. Akta Nikah', 'Tgl. Daftar',
    'Tgl. Akad', 'Nama Suami', 'Nama Istri', 'Tempat Nikah', 'NTPN'
];

function copyMatchingTable() {
    var rows  = getMatchingFilteredData();
    var lines = [_MATCHING_HEADERS.join('\t')];
    rows.forEach(function(r, idx) {
        lines.push(_matchingRowToArray(r, idx).join('\t'));
    });
    fallbackOrClipboard(lines.join('\n'), 'Tabel Rekap Porforasi berhasil disalin ke clipboard');
}

function downloadMatchingAsXlsx() {
    if (typeof XLSX === 'undefined') {
        showNotification('Library XLSX belum termuat', 'error');
        return;
    }
    var rows = getMatchingFilteredData();
    var data = [_MATCHING_HEADERS];
    rows.forEach(function(r, idx) { data.push(_matchingRowToArray(r, idx)); });

    var ws   = XLSX.utils.aoa_to_sheet(data);
    var wb   = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Porforasi');
    var date = new Date().toLocaleDateString('id-ID').replace(/\//g, '-');
    XLSX.writeFile(wb, 'Rekap_Porforasi_' + date + '.xlsx');
    showNotification(
        'File XLSX berhasil diunduh (' + rows.length.toLocaleString('id-ID') + ' baris)',
        'success'
    );
}

// ═══════════════════════════════════════════════════════════════════
// 9. FUNCTION HOOKS
// ═══════════════════════════════════════════════════════════════════

// ── Restore filter UI values dari matchingFilters ke form controls ──
function restoreMatchingFilterUI() {
    var f = matchingFilters;
    if (!f || Object.keys(f).length === 0) return;

    function setVal(id, val) {
        if (val === undefined || val === null || val === '') return;
        var el = document.getElementById(id);
        if (el) el.value = val;
    }
    function setInp(id, val) {
        if (!val) return;
        var el = document.getElementById(id);
        if (el) el.value = val;
    }

    setVal('f-matching-matchStatus', f.matchStatus);
    setVal('f-matching-kuaStok',     f.kuaStok);
    setInp('f-matching-noPerforasi', f.noPerforasi);
    setVal('f-matching-status',      f.status);
    setInp('f-matching-namaSuami',   f.namaSuami);
    setInp('f-matching-namaIstri',   f.namaIstri);
    setVal('f-matching-tempatNikah', f.tempatNikah);

    // Bulan Digunakan checkboxes
    if (f.bulanDigunakan && f.bulanDigunakan.length > 0) {
        document.querySelectorAll('.month-cb-mdig').forEach(function(cb) {
            cb.checked = f.bulanDigunakan.indexOf(parseInt(cb.value)) !== -1;
        });
        updateMonthLabel('mdig');
    }
    // Bulan Akad checkboxes
    if (f.bulanAkad && f.bulanAkad.length > 0) {
        document.querySelectorAll('.month-cb-makad').forEach(function(cb) {
            cb.checked = f.bulanAkad.indexOf(parseInt(cb.value)) !== -1;
        });
        updateMonthLabel('makad');
    }
}

// ── Hook switchTab: tambahkan penanganan tab-matching ──
(function() {
    var _orig = window.switchTab;
    window.switchTab = function(tabId) {
        _orig(tabId);
        if (tabId === 'tab-matching') {
            if (stokData.length > 0 || allData.length > 0) {
                buildMatchingFilterOptions();
                restoreMatchingFilterUI();
            }
            if (matchingDirty) {
                var div = document.getElementById('table-matching');
                if (div) div.innerHTML = buildTabLoadingState(
                    'Menyiapkan data Matching...',
                    'Memproses join Stok ↔ Nikah'
                );
                requestAnimationFrame(function() {
                    requestAnimationFrame(function() { renderMatchingTable(); });
                });
            }
        }
    };
})();

// ── Hook changePage (tambahkan 'matching') ──
(function() {
    var _orig = window.changePage;
    window.changePage = function(which, page) {
        if (which === 'matching') {
            matchingPage = page;
            renderMatchingTable();
            var tc = document.querySelector('#table-matching .table-container');
            if (tc) tc.scrollTop = 0;
        } else {
            _orig(which, page);
        }
    };
})();

// ── Hook clearData ──
(function() {
    var _orig = window.clearData;
    window.clearData = function() {
        _orig();
        // Reset matching state setelah clearData selesai
        matchingFilters = {};
        matchingSort    = { col: 'noPerforasi', dir: 'asc' };
        matchingPage    = 1;
        matchingDirty   = true;
        updateBadge('matching', 0);
        var div = document.getElementById('table-matching');
        if (div) div.innerHTML = buildEmptyState(
            'Belum ada data dimuat',
            'Muat data terlebih dahulu dari tab Dashboard.'
        );
    };
})();

// ── Hook buildStokKUAOptions (dipanggil setelah stok selesai dimuat) ──
(function() {
    var _orig = window.buildStokKUAOptions || function() {};
    window.buildStokKUAOptions = function() {
        _orig();
        matchingDirty = true;
        // Jika tab matching sedang aktif, langsung refresh
        var activeTabEl = document.querySelector('.tab-content.active');
        if (activeTabEl && activeTabEl.id === 'tab-matching') {
            buildMatchingFilterOptions();
            restoreMatchingFilterUI();
            renderMatchingTable();
        }
    };
})();

// ── Hook buildNikahKUAOptions (dipanggil setelah nikah selesai dimuat) ──
(function() {
    var _orig = window.buildNikahKUAOptions || function() {};
    window.buildNikahKUAOptions = function() {
        _orig();
        matchingDirty = true;
    };
})();

// ── switchStokView: kept as no-op for backward compatibility ──
function switchStokView(view) {
    console.log('[MATCHING] switchStokView(' + view + ') — deprecated, tab-matching is now a top-level tab');
}

// ═══════════════════════════════════════════════════════════════════
// 10. INIT
// ═══════════════════════════════════════════════════════════════════

function _initMatchingTab() {
    setupMatchingFilter();
    var div = document.getElementById('table-matching');
    if (div) div.innerHTML = buildEmptyState(
        'Belum ada data dimuat',
        'Muat data terlebih dahulu dari tab Dashboard.'
    );
    console.log('[MATCHING] ✓ Tab Rekap Porforasi siap');
}

// Jalankan setelah DOM siap (supervisi-script.js sudah register listener-nya juga)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _initMatchingTab);
} else {
    _initMatchingTab();
}

// ═══════════════════════════════════════════════════════════════════
// 11. EXPORTS
// ═══════════════════════════════════════════════════════════════════
window.setupMatchingFilter         = setupMatchingFilter;
window.toggleMatchingFilterSection = toggleMatchingFilterSection;
window.applyMatchingFilter         = applyMatchingFilter;
window.resetMatchingFilter         = resetMatchingFilter;
window.renderMatchingTable         = renderMatchingTable;
window.toggleMatchingSort          = toggleMatchingSort;
window.buildMatchingFilterOptions  = buildMatchingFilterOptions;
window.copyMatchingTable           = copyMatchingTable;
window.downloadMatchingAsXlsx      = downloadMatchingAsXlsx;
window.switchStokView              = switchStokView;

console.log('[MATCHING] ✓ supervisi-matching.js loaded');