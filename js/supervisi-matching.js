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
var matchingFilters   = {};
var matchingSort      = { col: 'noPerforasi', dir: 'asc' };
var matchingPage      = 1;
var matchingDirty     = true;
var matchingPageSize  = 100;   // 0 = tampilkan semua (tanpa paginasi)

// ── Selection State ─────────────────────────────────────────────────
var matchingSelectedRows  = new Set();  // Set<number> — global row index di allRows
var matchingSelectedCols  = new Set();  // Set<number> — column index (0-based di table)
var matchingLastClickedRow = -1;        // untuk Shift+click range

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

    // ── Tahun Buku (kolom D) ──
    if (f.tahunBuku && STOK_COL.TAHUN_BUKU >= 0)
        rows = rows.filter(function(r) {
            return String(r.stok[STOK_COL.TAHUN_BUKU] || '').trim() === f.tahunBuku;
        });

    // ── No. Porforasi ──
    if (f.noPerforasi && STOK_COL.NO_PERFORASI >= 0)
        rows = rows.filter(function(r) {
            return String(r.stok[STOK_COL.NO_PERFORASI] || '')
                .toLowerCase().indexOf(f.noPerforasi.toLowerCase()) !== -1;
        });

    // ── Status buku (Stok) — multiselect ──
    if (f.status && Array.isArray(f.status) && f.status.length > 0 && STOK_COL.STATUS >= 0)
        rows = rows.filter(function(r) {
            var v = String(r.stok[STOK_COL.STATUS] || '').trim();
            return f.status.some(function(s) { return s.toLowerCase() === v.toLowerCase(); });
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

        // 1 ─ KUA (Stok Buku) — paling pertama
        '<div class="filter-group"><label>KUA (Stok Buku)</label>' +
        '<select id="f-matching-kuaStok"><option value="">-- Semua KUA --</option></select></div>' +

        // 2 ─ Tahun Buku
        '<div class="filter-group"><label>Tahun Buku</label>' +
        '<select id="f-matching-tahunBuku"><option value="">-- Semua Tahun --</option></select></div>' +

        // 3 ─ No. Porforasi
        '<div class="filter-group"><label>No. Porforasi</label>' +
        '<input type="text" id="f-matching-noPerforasi" placeholder="Cari..."></div>' +

        // 4 ─ Status Buku (multiselect) & Bulan Digunakan
        '<div class="filter-group"><label>Status Buku</label>' +
        '<div class="multiselect-wrapper">' +
        '<button type="button" class="multiselect-trigger" onclick="toggleStatusBukuDropdown()" id="statusBukuTrigger">' +
        '<span id="statusBukuLabel">-- Semua Status --</span><span class="arrow">▼</span></button>' +
        '<div class="multiselect-dropdown" id="statusBukuDropdown">' +
        '<div class="multiselect-select-all" onclick="toggleAllStatusBuku()">' +
        '<input type="checkbox" id="statusBukuAll" checked> Pilih Semua</div>' +
        '</div></div></div>' +

        '<div class="filter-group"><label>Bulan Digunakan (Stok)</label>' +
        '<div class="multiselect-wrapper">' +
        '<button type="button" class="multiselect-trigger" onclick="toggleMonthDropdown(\'mdig\')" id="monthTrigger-mdig">' +
        '<span id="monthLabel-mdig">-- Semua Bulan --</span><span class="arrow">▼</span></button>' +
        '<div class="multiselect-dropdown" id="monthDropdown-mdig">' +
        '<div class="multiselect-select-all" onclick="toggleAllMonths(\'mdig\')">' +
        '<input type="checkbox" id="monthAll-mdig" checked> Pilih Semua</div>' +
        '</div></div></div>' +

        // 5 ─ Bulan Akad & Tempat Nikah
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

        // 6 ─ Nama Suami & Istri
        '<div class="filter-group"><label>Nama Suami</label>' +
        '<input type="text" id="f-matching-namaSuami" placeholder="Cari..."></div>' +

        '<div class="filter-group"><label>Nama Istri</label>' +
        '<input type="text" id="f-matching-namaIstri" placeholder="Cari..."></div>' +

        // 7 ─ Status Matching — paling terakhir
        '<div class="filter-group"><label>Status Matching</label>' +
        '<select id="f-matching-matchStatus">' +
        '<option value="">-- Semua --</option>' +
        '<option value="matched">✅ Ada di Data Nikah</option>' +
        '<option value="unmatched">❌ Belum Ada di Data Nikah</option>' +
        '</select></div>' +

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

    var cbsSt   = Array.from(document.querySelectorAll('.status-buku-cb'));
    var chkSt   = cbsSt.filter(function(c) { return c.checked; });

    matchingFilters = {
        matchStatus:    val('f-matching-matchStatus'),
        kuaStok:        val('f-matching-kuaStok'),
        tahunBuku:      val('f-matching-tahunBuku'),
        noPerforasi:    val('f-matching-noPerforasi'),
        status:         cbsSt.length === 0 || chkSt.length === cbsSt.length
                        ? [] : chkSt.map(function(c) { return c.value; }),
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
    document.querySelectorAll('.status-buku-cb').forEach(function(c) { c.checked = true; });
    _updateStatusBukuLabel();
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

    // Tahun Buku (kolom D)
    _buildSelectOptions('f-matching-tahunBuku', '-- Semua Tahun --', (function() {
        var m = {};
        if (STOK_COL.TAHUN_BUKU >= 0)
            stokData.forEach(function(r) { var v = String(r[STOK_COL.TAHUN_BUKU] || '').trim(); if (v) m[v] = true; });
        return Object.keys(m).sort();
    })());

    // Status buku — multiselect checkbox dropdown
    buildStatusBukuOptions();

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

// ── Status Buku multiselect (checkbox dropdown) ───────────────────
function buildStatusBukuOptions() {
    var dropdown = document.getElementById('statusBukuDropdown');
    if (!dropdown || STOK_COL.STATUS < 0) return;
    var vals = {};
    stokData.forEach(function(r) { var v = String(r[STOK_COL.STATUS] || '').trim(); if (v) vals[v] = true; });
    var sorted = Object.keys(vals).sort();
    // Clear existing items (keep "Pilih Semua" first child)
    while (dropdown.children.length > 1) dropdown.removeChild(dropdown.lastChild);
    sorted.forEach(function(k) {
        var s   = getStatusStyle(k);
        var div = document.createElement('div');
        div.className = 'multiselect-item';
        var cb  = document.createElement('input');
        cb.type = 'checkbox'; cb.value = k; cb.checked = true;
        cb.className = 'status-buku-cb';
        cb.id  = 'sbcb-' + k.replace(/\s+/g, '_');
        cb.addEventListener('change', _updateStatusBukuLabel);
        var lbl = document.createElement('label');
        lbl.htmlFor = cb.id;
        lbl.style.cssText = 'display:inline-block;padding:1px 6px;border-radius:4px;background:' +
            s.bg + ';color:' + s.color + ';cursor:pointer;';
        lbl.textContent = k;
        div.appendChild(cb); div.appendChild(lbl);
        dropdown.appendChild(div);
    });
    _updateStatusBukuLabel();
}

function _updateStatusBukuLabel() {
    var all  = Array.from(document.querySelectorAll('.status-buku-cb'));
    var chk  = all.filter(function(c) { return c.checked; });
    var lbl  = document.getElementById('statusBukuLabel');
    var allCb = document.getElementById('statusBukuAll');
    if (!lbl) return;
    if (all.length === 0 || chk.length === all.length) {
        lbl.textContent = '-- Semua Status --';
        if (allCb) allCb.checked = true;
    } else if (chk.length === 0) {
        lbl.textContent = '(tidak ada)';
        if (allCb) allCb.checked = false;
    } else {
        lbl.textContent = chk.length + ' status dipilih';
        if (allCb) allCb.indeterminate = true;
    }
}

function toggleStatusBukuDropdown() {
    var dd = document.getElementById('statusBukuDropdown');
    if (!dd) return;
    var isOpen = dd.classList.contains('open');
    // Tutup semua dropdown multiselect lain
    document.querySelectorAll('.multiselect-dropdown.open').forEach(function(d) {
        d.classList.remove('open');
    });
    if (!isOpen) dd.classList.add('open');
}

function toggleAllStatusBuku() {
    var allCb  = document.getElementById('statusBukuAll');
    var should = allCb ? allCb.checked : true;
    document.querySelectorAll('.status-buku-cb').forEach(function(cb) { cb.checked = should; });
    _updateStatusBukuLabel();
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

// ── Helper: hitung count & update badge TANPA render tabel ────────
function updateMatchingBadgeOnly() {
    if (stokData.length === 0) { updateBadge('matching', 0); return; }
    var count = getMatchingFilteredData().length;
    updateBadge('matching', count);
}

// ── Selection helpers (Excel-style) ─────────────────────────────────

/**
 * handleMatchingRowClick — dipanggil dari onclick setiap <tr>.
 * Behavior persis seperti Excel:
 *   Ctrl/Cmd + klik → toggle baris itu saja (tambah/hapus dari seleksi)
 *   Shift + klik    → pilih range dari baris terakhir diklik s.d. baris ini
 *   Klik biasa      → clear semua, pilih hanya baris ini
 */
function handleMatchingRowClick(evt, gidx) {
    // Jika ini adalah akhir dari drag (mouse bergerak antar baris), abaikan —
    // seleksi sudah diurus oleh _onMatchingMousemove.
    if (_drag.moved) { _drag.moved = false; return; }

    // Abaikan klik pada elemen interaktif di dalam baris
    var tag = evt.target.tagName;
    if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SELECT') return;

    var ctrl  = evt.ctrlKey || evt.metaKey;
    var shift = evt.shiftKey;

    if (shift && matchingLastClickedRow >= 0) {
        // ── Shift+click: range select ──
        var from = Math.min(matchingLastClickedRow, gidx);
        var to   = Math.max(matchingLastClickedRow, gidx);
        // Tentukan apakah akan select atau deselect berdasarkan status baris yang diklik
        var willSelect = !matchingSelectedRows.has(gidx);
        for (var i = from; i <= to; i++) {
            if (willSelect) matchingSelectedRows.add(i);
            else            matchingSelectedRows.delete(i);
        }
        // jangan update matchingLastClickedRow agar Shift+click berikutnya tetap dari anchor yang sama

    } else if (ctrl) {
        // ── Ctrl/Cmd+click: toggle satu baris ──
        if (matchingSelectedRows.has(gidx)) {
            matchingSelectedRows.delete(gidx);
        } else {
            matchingSelectedRows.add(gidx);
        }
        matchingLastClickedRow = gidx;

    } else {
        // ── Klik biasa: clear semua, pilih hanya baris ini ──
        matchingSelectedRows.clear();
        matchingSelectedRows.add(gidx);
        matchingLastClickedRow = gidx;
    }

    _applyMatchingSelectionUI();
}

function toggleMatchingColSelect(cidx) {
    if (matchingSelectedCols.has(cidx)) {
        matchingSelectedCols.delete(cidx);
    } else {
        matchingSelectedCols.add(cidx);
    }
    _applyMatchingSelectionUI();
}

function clearMatchingSelection() {
    matchingSelectedRows.clear();
    matchingSelectedCols.clear();
    matchingLastClickedRow = -1;
    _applyMatchingSelectionUI();
}

// ── Drag-to-select (mouse/trackpad click & drag) ─────────────────────
var _drag = {
    active:    false,   // drag sedang berlangsung
    moved:     false,   // sudah pindah dari baris awal → bukan klik murni
    anchorIdx: -1,      // gidx baris awal (mousedown)
    ctrl:      false,   // Ctrl/Cmd ditekan saat mousedown
    snapshot:  null     // snapshot Set sebelum drag untuk Ctrl+drag additive
};

/** Cari ancestor <tr data-gidx> dari elemen target */
function _gidxFromEl(el) {
    while (el && el.tagName !== 'TABLE') {
        if (el.tagName === 'TR' && el.hasAttribute('data-gidx'))
            return parseInt(el.getAttribute('data-gidx'), 10);
        el = el.parentElement;
    }
    return -1;
}

/** Apakah target ada di dalam tbody #table-matching? */
function _inMatchingTbody(el) {
    var container = document.getElementById('table-matching');
    if (!container || !container.contains(el)) return false;
    // pastikan dalam tbody (bukan thead)
    var cur = el;
    while (cur && cur !== container) {
        if (cur.tagName === 'TBODY') return true;
        if (cur.tagName === 'THEAD') return false;
        cur = cur.parentElement;
    }
    return false;
}

function _onMatchingMousedown(evt) {
    if (!_inMatchingTbody(evt.target)) return;
    var tag = evt.target.tagName;
    if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT' || tag === 'SELECT') return;

    var gidx = _gidxFromEl(evt.target);
    if (gidx < 0) return;

    // Simpan state drag — tapi JANGAN preventDefault di sini agar
    // klik biasa masih bisa memblok teks untuk di-copy.
    // preventDefault hanya dipanggil saat drag benar-benar melewati baris lain.
    _drag.active    = true;
    _drag.moved     = false;
    _drag.anchorIdx = gidx;
    _drag.ctrl      = evt.ctrlKey || evt.metaKey;
    _drag.snapshot  = new Set(matchingSelectedRows);
}

/**
 * Gunakan mouseover (bukan mousemove) agar kita hanya bereaksi saat
 * pointer masuk ke ROW berbeda — jauh lebih efisien dan tidak
 * mengganggu scroll atau teks-copy di dalam satu baris.
 */
function _onMatchingMouseover(evt) {
    if (!_drag.active) return;
    // Cek tombol mouse masih ditekan (button bitmask bit-0)
    if ((evt.buttons & 1) === 0) { _drag.active = false; return; }

    var gidx = _gidxFromEl(evt.target);
    if (gidx < 0 || gidx === _drag.anchorIdx && !_drag.moved) return;

    if (!_drag.moved) {
        // Pertama kali drag melewati baris lain → baru block text-selection
        _drag.moved = true;
        document.body.classList.add('matching-dragging');
    }

    var from = Math.min(_drag.anchorIdx, gidx);
    var to   = Math.max(_drag.anchorIdx, gidx);

    if (_drag.ctrl) {
        matchingSelectedRows = new Set(_drag.snapshot);
        for (var i = from; i <= to; i++) matchingSelectedRows.add(i);
    } else {
        matchingSelectedRows.clear();
        for (var i = from; i <= to; i++) matchingSelectedRows.add(i);
    }

    _applyMatchingSelectionUI();
}

function _onMatchingMouseup(evt) {
    if (!_drag.active) return;
    if (_drag.moved) {
        var gidx = _gidxFromEl(evt.target);
        if (gidx >= 0) matchingLastClickedRow = gidx;
    }
    _drag.active = false;
    document.body.classList.remove('matching-dragging');
    // _drag.moved TIDAK direset — handleMatchingRowClick akan memeriksanya.
}

/** Terapkan kelas CSS selection ke DOM setelah render */
function _applyMatchingSelectionUI() {
    var container = document.getElementById('table-matching');
    if (!container) return;
    var table = container.querySelector('table');
    if (!table) return;

    // Row selection — tbody rows
    table.querySelectorAll('tbody tr[data-gidx]').forEach(function(tr) {
        var idx = parseInt(tr.getAttribute('data-gidx'), 10);
        if (matchingSelectedRows.has(idx)) {
            tr.classList.add('row-msel');
        } else {
            tr.classList.remove('row-msel');
        }
    });

    // Column selection — add/remove class to all cells in selected columns
    table.querySelectorAll('thead th[data-cidx]').forEach(function(th) {
        var cidx = parseInt(th.getAttribute('data-cidx'), 10);
        if (matchingSelectedCols.has(cidx)) {
            th.classList.add('col-msel-header');
        } else {
            th.classList.remove('col-msel-header');
        }
    });
    table.querySelectorAll('tbody td[data-cidx]').forEach(function(td) {
        var cidx = parseInt(td.getAttribute('data-cidx'), 10);
        if (matchingSelectedCols.has(cidx)) {
            td.classList.add('col-msel');
        } else {
            td.classList.remove('col-msel');
        }
    });

    // Update selection counter bar
    var bar = document.getElementById('matchingSelBar');
    if (!bar) return;
    var rowCount = matchingSelectedRows.size;
    var colCount = matchingSelectedCols.size;
    if (rowCount === 0 && colCount === 0) {
        bar.style.display = 'none';
    } else {
        bar.style.display = 'flex';
        var msg = [];
        if (rowCount > 0) msg.push('<strong>' + rowCount.toLocaleString('id-ID') + '</strong> baris dipilih');
        if (colCount > 0) msg.push('<strong>' + colCount.toLocaleString('id-ID') + '</strong> kolom dipilih');
        bar.querySelector('.msel-info').innerHTML = '☑ ' + msg.join(', ');
    }
}

function changeMatchingPageSize(val) {
    matchingPageSize = parseInt(val, 10);
    matchingPage = 1;
    matchingSelectedRows.clear();
    matchingSelectedCols.clear();
    matchingLastClickedRow = -1;
    renderMatchingTable();
}

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

    // ── Fix 1: badge selalu update saat render ──
    updateBadge('matching', totalRows);

    var parts = [];

    // ── Summary bar — selalu reflect data terfilter ──
    parts.push(buildMatchingSummaryBar(allRows, allBasRows));

    if (totalRows === 0) {
        parts.push(buildEmptyState('Tidak ada data', 'Tidak ada data yang cocok dengan filter.'));
        container.innerHTML = parts.join('');
        return;
    }

    // ── Fix 3: gunakan matchingPageSize, 0 = Semua ──
    var showAll    = (matchingPageSize === 0);
    var pageSize   = showAll ? totalRows : matchingPageSize;
    var totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    matchingPage   = Math.max(1, Math.min(matchingPage, totalPages));

    var start       = (matchingPage - 1) * pageSize;
    var displayRows = showAll ? allRows : allRows.slice(start, start + pageSize);

    // ── Info bar (dengan per-page selector) ──
    parts.push('<div class="data-info-bar">');
    parts.push(
        '<div class="count-display">Menampilkan <span>' +
        (showAll
            ? totalRows.toLocaleString('id-ID')
            : (start + 1).toLocaleString('id-ID') + '–' + Math.min(start + pageSize, totalRows).toLocaleString('id-ID')
        ) + '</span>' +
        (totalRows !== allBasRows.length
            ? ' dari <span>' + totalRows.toLocaleString('id-ID') + '</span> terfilter (' + allBasRows.length.toLocaleString('id-ID') + ' total)'
            : ' dari <span>' + totalRows.toLocaleString('id-ID') + '</span> data') +
        '</div>'
    );
    // Per-page selector + actions
    parts.push(
        '<div class="action-btns" style="align-items:center; gap:10px;">' +
        '<label style="font-size:12px;color:#555;white-space:nowrap;">Tampilkan:</label>' +
        '<select id="matchingPageSizeSelect" onchange="changeMatchingPageSize(this.value)" style="padding:5px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px;">' +
        [25,50,100,200,500].map(function(n) {
            return '<option value="' + n + '"' + (matchingPageSize === n && !showAll ? ' selected' : '') + '>' + n + ' baris</option>';
        }).join('') +
        '<option value="0"' + (showAll ? ' selected' : '') + '>Semua</option>' +
        '</select>' +
        '<button class="btn btn-warning btn-sm" onclick="copyMatchingTable()">📋 Salin</button>' +
        '<button class="btn btn-download btn-sm" onclick="downloadMatchingAsXlsx()">⬇ XLSX</button>' +
        '</div>'
    );
    parts.push('</div>');

    // ── Fix 2: Selection counter bar (awalnya tersembunyi) ──
    parts.push(
        '<div id="matchingSelBar" style="display:none; align-items:center; gap:10px; padding:7px 12px; ' +
        'background:#e8f0fe; border:1px solid #c5cdf5; border-radius:8px; margin-bottom:8px; font-size:13px;">' +
        '<span class="msel-info" style="flex:1; color:#3949ab;"></span>' +
        '<button class="btn btn-secondary btn-sm" onclick="clearMatchingSelection()">✕ Batalkan Pilihan</button>' +
        '</div>'
    );

    // ── Pagination top (sembunyikan jika showAll) ──
    if (!showAll) parts.push(buildPagination('matching', matchingPage, totalPages, totalRows));

    // ── Table ──
    parts.push('<div class="table-container"><table id="matchingTable"><thead>');

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

    // ── Header utama (dengan data-cidx untuk column select) ──
    // cidx: 0=#, 1=Status, 2=No.Porforasi, 3..=Stok, kemudian Nikah
    var _cidx = 0;
    function _th(label, sortKey, extra) {
        var cls = sortKey ? _sortClass(sortKey) : '';
        var onclick = sortKey
            ? 'toggleMatchingSort(\'' + sortKey + '\')'
            : 'toggleMatchingColSelect(' + _cidx + ')';
        var title = sortKey ? 'Urutkan / Klik untuk seleksi kolom' : 'Klik untuk seleksi kolom';
        var str = '<th data-cidx="' + _cidx + '"' + cls +
            ' onclick="' + onclick + '" title="' + title + '"' +
            (extra || '') + '>' + label + '</th>';
        _cidx++;
        return str;
    }

    parts.push('<tr>');
    parts.push(_th('#', null, ' class="col-no"'));
    parts.push(_th('Status', 'matchStatus'));
    parts.push(_th('No. Porforasi', 'noPerforasi'));

    if (STOK_COL.NO_SERI >= 0)       parts.push(_th('No. Seri', null));
    if (STOK_COL.TAHUN_BUKU >= 0)    parts.push(_th('Tahun Buku', null));
    if (STOK_COL.KUA >= 0)           parts.push(_th('KUA (Stok)', null));
    if (STOK_COL.STATUS >= 0)        parts.push(_th('Status Buku', 'statusBuku'));
    if (STOK_COL.TGL_ALOKASI >= 0)   parts.push(_th('Tgl. Alokasi', null));
    if (STOK_COL.TGL_DIGUNAKAN >= 0) parts.push(_th('Tgl. Digunakan', 'tglDigunakan'));
    if (STOK_COL.KETERANGAN >= 0)    parts.push(_th('Keterangan', null));

    parts.push(_th('No. Pendaftaran', null, ' class="matching-divider-col"'));
    parts.push(_th('No. Akta Nikah', null));
    parts.push(_th('Tgl. Daftar', null));
    parts.push(_th('Tgl. Akad', 'tglAkad'));
    parts.push(_th('Nama Suami', 'namaSuami'));
    parts.push(_th('Nama Istri', 'namaIstri'));
    parts.push(_th('Tempat Nikah', null));
    parts.push(_th('NTPN', null));
    parts.push('</tr></thead><tbody>');

    // ── Rows (dengan data-gidx & data-cidx untuk selection) ──
    var DASH = '<td class="cell-empty">—</td>';
    var totalCols = _cidx; // total kolom

    displayRows.forEach(function(row, idx) {
        var stok    = row.stok;
        var nikah   = row.nikah;
        var matched = row.matched;
        var gidx    = start + idx;   // global index di allRows

        var rowCls = (matched ? 'row-matched' : 'row-unmatched');
        if (matchingSelectedRows.has(gidx)) rowCls += ' row-msel';

        parts.push('<tr class="' + rowCls + '" data-gidx="' + gidx + '"' +
            ' onclick="handleMatchingRowClick(event,' + gidx + ')">');
        var ci = 0; // column index counter untuk td

        // Col #
        var cSelNo = matchingSelectedCols.has(ci) ? ' col-msel' : '';
        parts.push('<td class="col-no' + cSelNo + '" data-cidx="' + ci + '">' + (gidx + 1) + '</td>'); ci++;

        // Status badge
        var cSelSt = matchingSelectedCols.has(ci) ? ' col-msel' : '';
        var badge = matched
            ? '<span class="match-badge match-yes">✅ Ada</span>'
            : '<span class="match-badge match-no">❌ Tidak Ada Data</span>';
        parts.push('<td data-cidx="' + ci + '" class="' + cSelSt.trim() + '">' + badge + '</td>'); ci++;

        // No. Porforasi
        var cSelPer = matchingSelectedCols.has(ci) ? ' col-msel' : '';
        var noPer = STOK_COL.NO_PERFORASI >= 0
            ? escHtml(String(stok[STOK_COL.NO_PERFORASI] || ''))
            : '';
        parts.push('<td class="cell-perforasi' + cSelPer + '" data-cidx="' + ci + '">' + noPer + '</td>'); ci++;

        function _td(val, extraCls) {
            var cSel = matchingSelectedCols.has(ci) ? ' col-msel' : '';
            var str  = '<td data-cidx="' + ci + '" class="' + ((extraCls || '') + cSel).trim() + '">' + val + '</td>';
            ci++;
            return str;
        }

        if (STOK_COL.NO_SERI >= 0)       parts.push(_td(escHtml(String(stok[STOK_COL.NO_SERI]    || ''))));
        if (STOK_COL.TAHUN_BUKU >= 0)    parts.push(_td(escHtml(String(stok[STOK_COL.TAHUN_BUKU] || ''))));
        if (STOK_COL.KUA >= 0)           parts.push(_td(escHtml(String(stok[STOK_COL.KUA]        || ''))));
        if (STOK_COL.STATUS >= 0)        parts.push(_td(buildStatusBadge(stok[STOK_COL.STATUS])));
        if (STOK_COL.TGL_ALOKASI >= 0)   parts.push(_td(formatStokDate(stok[STOK_COL.TGL_ALOKASI])));
        if (STOK_COL.TGL_DIGUNAKAN >= 0) parts.push(_td(formatStokDate(stok[STOK_COL.TGL_DIGUNAKAN])));
        if (STOK_COL.KETERANGAN >= 0)    parts.push(_td(escHtml(String(stok[STOK_COL.KETERANGAN] || ''))));

        // Nikah columns
        if (!matched) {
            for (var e = 0; e < 8; e++) {
                var cSel2 = matchingSelectedCols.has(ci) ? ' col-msel' : '';
                parts.push('<td class="cell-empty' + cSel2 + '" data-cidx="' + ci + '">—</td>');
                ci++;
            }
        } else {
            parts.push(_td(escHtml(String(nikah[COL.NO_PENDAFTARAN] || '')), 'matching-divider-col'));
            parts.push(_td(escHtml(String(nikah[COL.NO_AKTA_NIKAH]  || ''))));
            parts.push(_td(formatDate(nikah[COL.TGL_DAFTAR])));
            parts.push(_td(formatDate(nikah[COL.TGL_AKAD])));
            parts.push(_td(escHtml(String(nikah[COL.NAMA_SUAMI] || ''))));
            parts.push(_td(escHtml(String(nikah[COL.NAMA_ISTRI] || ''))));
            parts.push(_td(escHtml(String(nikah[COL.TEMPAT_NIKAH] || ''))));
            parts.push(_td(escHtml(String(nikah[COL.NTPN]       || ''))));
        }

        parts.push('</tr>');
    });

    parts.push('</tbody></table></div>');
    if (!showAll) parts.push(buildPagination('matching', matchingPage, totalPages, totalRows));

    container.innerHTML = parts.join('');
    matchingDirty = false;

    // Terapkan selection bar state setelah render
    _applyMatchingSelectionUI();
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
    setVal('f-matching-tahunBuku',   f.tahunBuku);
    setInp('f-matching-noPerforasi', f.noPerforasi);
    // Status buku — multiselect
    if (f.status && Array.isArray(f.status) && f.status.length > 0) {
        document.querySelectorAll('.status-buku-cb').forEach(function(cb) {
            cb.checked = f.status.some(function(s) { return s.toLowerCase() === cb.value.toLowerCase(); });
        });
        _updateStatusBukuLabel();
    }
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
            // Bersihkan row selection saat ganti halaman (indeks berubah)
            matchingSelectedRows.clear();
            matchingLastClickedRow = -1;
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
        matchingFilters      = {};
        matchingSort         = { col: 'noPerforasi', dir: 'asc' };
        matchingPage         = 1;
        matchingDirty        = true;
        matchingSelectedRows.clear();
        matchingSelectedCols.clear();
        matchingLastClickedRow = -1;
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
        // ✅ Fix 1: Update badge segera setelah data stok dimuat (tanpa tunggu tab aktif)
        updateMatchingBadgeOnly();
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
        // ✅ Fix 1: Update badge segera setelah data nikah dimuat
        updateMatchingBadgeOnly();
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
    // ── Inject CSS untuk selection & per-page UI ──
    if (!document.getElementById('matching-extra-styles')) {
        var style = document.createElement('style');
        style.id = 'matching-extra-styles';
        style.textContent = [
            /* Row selection */
            '#matchingTable tbody tr[data-gidx] { cursor: pointer; }',
            '#matchingTable tbody tr.row-msel td { background: #dbeafe !important; border-bottom-color: #93c5fd; }',
            '#matchingTable tbody tr.row-msel:hover td { background: #bfdbfe !important; }',
            /* Column selection */
            '#matchingTable thead th.col-msel-header { background: #dbeafe !important; color: #1e40af !important; border-bottom-color: #3b82f6 !important; }',
            '#matchingTable tbody td.col-msel { background: #eff6ff !important; color: #1e3a8a; }',
            '#matchingTable tbody tr:hover td.col-msel { background: #dbeafe !important; }',
            /* Row+Col intersection */
            '#matchingTable tbody tr.row-msel td.col-msel { background: #bfdbfe !important; }',
            /* Prevent text-selection cursor while dragging */
            'body.matching-dragging { user-select: none !important; cursor: row-resize !important; }',
            'body.matching-dragging #matchingTable tbody tr[data-gidx] { cursor: row-resize !important; }',
            /* Selection bar */
            '#matchingSelBar { animation: selBarIn 0.2s ease-out; }',
            '@keyframes selBarIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }',
        ].join('\n');
        document.head.appendChild(style);
    }

    // ── Delegated drag-to-select listeners (didaftarkan sekali) ──
    if (!document._matchingDragBound) {
        document._matchingDragBound = true;

        document.addEventListener('mousedown', function(e) {
            _onMatchingMousedown(e);
        });

        // mouseover: baru bereaksi saat masuk ROW berbeda → tidak ganggu teks-copy
        document.addEventListener('mouseover', function(e) {
            _onMatchingMouseover(e);
        });

        document.addEventListener('mouseup', function(e) {
            _onMatchingMouseup(e);
        });
    }

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
// Selection & UI helpers
window.updateMatchingBadgeOnly     = updateMatchingBadgeOnly;
window.handleMatchingRowClick      = handleMatchingRowClick;
window.toggleMatchingColSelect     = toggleMatchingColSelect;
window.clearMatchingSelection      = clearMatchingSelection;
window.changeMatchingPageSize      = changeMatchingPageSize;
// Status Buku multiselect
window.buildStatusBukuOptions      = buildStatusBukuOptions;
window.toggleStatusBukuDropdown    = toggleStatusBukuDropdown;
window.toggleAllStatusBuku         = toggleAllStatusBuku;

console.log('[MATCHING] ✓ supervisi-matching.js loaded');