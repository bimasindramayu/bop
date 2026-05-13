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
          DUPLIKAT_COL,
          allData, stokData, duplikatData, allHeaders, stokHeaders,
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
 * Bangun lookup index dari sheet "Duplikat".
 * Kunci match: No Porforasi Lama, No Porforasi Duplikat Suami, No Porforasi Duplikat Istri
 * Semua tiga kolom di-index ke baris Duplikat yang sama.
 */
function buildDuplikatPerforasiIndex() {
    var map = {};
    var dc  = typeof DUPLIKAT_COL !== 'undefined' ? DUPLIKAT_COL : (window.DUPLIKAT_COL || {});
    var src = typeof duplikatData !== 'undefined' ? duplikatData : (window.duplikatData || []);
    src.forEach(function(row) {
        var cols = [dc.NO_PERFORASI_LAMA, dc.NO_PERFORASI_SUAMI, dc.NO_PERFORASI_ISTRI];
        cols.forEach(function(c) {
            if (c < 0) return;
            var raw = String(row[c] || '');
            raw.split('|').forEach(function(part) {
                var key = normalizePerforasi(part);
                if (key && !map[key]) map[key] = row;
            });
        });
    });
    return map;
}

/**
 * Bangun array merged rows: setiap baris stokData dipasangkan
 * dengan baris duplikat dan/atau nikah yang cocok.
 *
 * matchSource:
 *   'duplikat' — ditemukan di Duplikat (prioritas utama, meski juga ada di Nikah)
 *   'nikah'    — hanya ditemukan di Data Nikah
 *   null       — tidak ditemukan di keduanya
 * alsoInNikah:
 *   true       — ditemukan di KEDUA sheet (Duplikat DAN Nikah); untuk statistik
 *
 * @returns {Array<{stok, nikah, duplikat, matched, matchSource, alsoInNikah}>}
 */
function buildMatchingRows() {
    if (stokData.length === 0) return [];
    var nikahIdx    = buildNikahPerforasiIndex();
    var duplikatIdx = buildDuplikatPerforasiIndex();
    return stokData.map(function(stokRow) {
        var key         = normalizePerforasi(stokRow[STOK_COL.NO_PERFORASI]);
        var nikahRow    = key ? (nikahIdx[key]    || null) : null;
        var duplikatRow = key ? (duplikatIdx[key] || null) : null;

        // ── Duplikat always takes priority ──────────────────────────────
        // Jika nomor porforasi ada di sheet Duplikat, statusnya adalah
        // 'duplikat' — tidak bisa masuk status matching Data Nikah,
        // meskipun nomornya juga ditemukan di Data Nikah.
        // Data nikah tetap disimpan (nikahRow) untuk ditampilkan di kolom,
        // tapi matchSource tetap 'duplikat'.
        var matchSource = null;
        if (duplikatRow)  matchSource = 'duplikat';
        else if (nikahRow) matchSource = 'nikah';

        return {
            stok:        stokRow,
            nikah:       nikahRow,       // disimpan untuk tampilan kolom Nikah
            duplikat:    duplikatRow,
            matched:     !!(nikahRow || duplikatRow),
            matchSource: matchSource,
            alsoInNikah: !!(nikahRow && duplikatRow)  // ada di kedua sheet (statistik)
        };
    });
}

// ═══════════════════════════════════════════════════════════════════
// 1b. ROW CACHE
//     buildMatchingRows() adalah O(n) yang membangun index dan iterasi
//     seluruh stokData. Cache hasilnya agar tidak rebuild tiap render/filter.
//     Di-invalidate saat matchingDirty=true (di renderMatchingTable & hooks).
// ═══════════════════════════════════════════════════════════════════
var _cachedAllRows = null;

function _getAllMatchingRows() {
    if (!_cachedAllRows) {
        _cachedAllRows = buildMatchingRows();
    }
    return _cachedAllRows;
}

// ═══════════════════════════════════════════════════════════════════
// 2. FILTER + SORT
// ═══════════════════════════════════════════════════════════════════

function getMatchingFilteredData() {
    var rows = _getAllMatchingRows();
    var f    = matchingFilters;

    // ── Match status — hanya Ada Data atau Tidak Ada Data ──
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

    // ── Status buku (Stok) — multiselect; "Duplikat" adalah opsi virtual ──
    if (f.status && Array.isArray(f.status) && f.status.length > 0) {
        var hasDupVirtual = f.status.some(function(s) { return s.toLowerCase() === 'duplikat'; });
        var realStatuses  = f.status.filter(function(s) { return s.toLowerCase() !== 'duplikat'; });
        rows = rows.filter(function(r) {
            // Baris cocok jika ada di sheet Duplikat (virtual filter aktif)
            if (hasDupVirtual && r.duplikat) return true;
            // Atau jika status buku sesuai salah satu status nyata yang dipilih
            if (realStatuses.length > 0 && STOK_COL.STATUS >= 0) {
                var v = String(r.stok[STOK_COL.STATUS] || '').trim();
                return realStatuses.some(function(s) { return s.toLowerCase() === v.toLowerCase(); });
            }
            return false;
        });
    }

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
        // '<div class="filter-group"><label>Bulan Akad (Nikah)</label>' +
        // '<div class="multiselect-wrapper">' +
        // '<button type="button" class="multiselect-trigger" onclick="toggleMonthDropdown(\'makad\')" id="monthTrigger-makad">' +
        // '<span id="monthLabel-makad">-- Semua Bulan --</span><span class="arrow">▼</span></button>' +
        // '<div class="multiselect-dropdown" id="monthDropdown-makad">' +
        // '<div class="multiselect-select-all" onclick="toggleAllMonths(\'makad\')">' +
        // '<input type="checkbox" id="monthAll-makad" checked> Pilih Semua</div>' +
        // '</div></div></div>' +

        // '<div class="filter-group"><label>Tempat Nikah</label>' +
        // '<select id="f-matching-tempatNikah"><option value="">-- Semua Tempat --</option></select></div>' +

        // 6 ─ Nama Suami & Istri
        '<div class="filter-group"><label>Nama Suami</label>' +
        '<input type="text" id="f-matching-namaSuami" placeholder="Cari..."></div>' +

        '<div class="filter-group"><label>Nama Istri</label>' +
        '<input type="text" id="f-matching-namaIstri" placeholder="Cari..."></div>' +

        // 7 ─ Status Matching — paling terakhir
        '<div class="filter-group"><label>Status Matching</label>' +
        '<select id="f-matching-matchStatus">' +
        '<option value="">-- Semua --</option>' +
        '<option value="matched">✅ Ada Data</option>' +
        '<option value="unmatched">❌ Tidak Ada Data</option>' +
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

    // ── Opsi virtual "Duplikat" ──────────────────────────────────────
    // Bukan status nyata di Stok Buku, melainkan filter berdasarkan
    // keberadaan No. Porforasi di sheet Duplikat.
    var sepDiv = document.createElement('div');
    sepDiv.style.cssText = 'border-top:1px solid #e5e7eb;margin:4px 0;';
    dropdown.appendChild(sepDiv);

    var dupDiv = document.createElement('div');
    dupDiv.className = 'multiselect-item';
    var dupCb  = document.createElement('input');
    dupCb.type = 'checkbox'; dupCb.value = 'Duplikat'; dupCb.checked = true;
    dupCb.className = 'status-buku-cb';
    dupCb.id  = 'sbcb-Duplikat';
    dupCb.addEventListener('change', _updateStatusBukuLabel);
    var dupLbl = document.createElement('label');
    dupLbl.htmlFor = dupCb.id;
    dupLbl.style.cssText = 'display:inline-block;padding:1px 6px;border-radius:4px;' +
        'background:#fef3c7;color:#92400e;cursor:pointer;font-style:italic;';
    dupLbl.innerHTML = '📋 Duplikat <small style="font-size:10px;opacity:.75;">(virtual)</small>';
    dupDiv.appendChild(dupCb); dupDiv.appendChild(dupLbl);
    dropdown.appendChild(dupDiv);

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
    var total      = filteredRows.length;
    var cDup       = filteredRows.filter(function(r) { return r.matchSource === 'duplikat'; }).length;
    var cNikah     = filteredRows.filter(function(r) { return r.matchSource === 'nikah'; }).length;
    var cTidakAda  = filteredRows.filter(function(r) { return !r.matchSource; }).length;
    var pctTerdata = total > 0 ? Math.round((total - cTidakAda) / total * 100) : 0;
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
        '<div class="msb-item msb-dup">' +
            '<div class="msb-num">' + cDup.toLocaleString('id-ID') + '</div>' +
            '<div class="msb-lbl">📋 Duplikat</div>' +
        '</div>' +
        '<div class="msb-item msb-matched">' +
            '<div class="msb-num">' + cNikah.toLocaleString('id-ID') + '</div>' +
            '<div class="msb-lbl">💍 Ada di Data Nikah</div>' +
        '</div>' +
        '<div class="msb-item msb-unmatched">' +
            '<div class="msb-num">' + cTidakAda.toLocaleString('id-ID') + '</div>' +
            '<div class="msb-lbl">❌ Tidak Ada Data</div>' +
        '</div>' +
        '<div class="msb-item msb-pct">' +
            '<div class="msb-pct-track"><div class="msb-pct-fill" style="width:' + pctTerdata + '%"></div></div>' +
            '<div class="msb-lbl">' + pctTerdata + '% Terdata</div>' +
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

    // ── Fix 1: Invalidate cache hanya saat data benar-benar berubah ──
    if (matchingDirty) {
        _cachedAllRows = null;
    }

    var allRows    = getMatchingFilteredData();
    var allBasRows = _getAllMatchingRows();   // untuk summary (total tanpa filter)
    var totalRows  = allRows.length;

    updateBadge('matching', totalRows);

    var parts = [];
    parts.push(buildMatchingSummaryBar(allRows, allBasRows));

    if (totalRows === 0) {
        parts.push(buildEmptyState('Tidak ada data', 'Tidak ada data yang cocok dengan filter.'));
        container.innerHTML = parts.join('');
        matchingDirty = false;
        return;
    }

    var showAll    = (matchingPageSize === 0);
    var pageSize   = showAll ? totalRows : matchingPageSize;
    var totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
    matchingPage   = Math.max(1, Math.min(matchingPage, totalPages));

    var start       = (matchingPage - 1) * pageSize;
    var displayRows = showAll ? allRows : allRows.slice(start, start + pageSize);

    // ── Info bar ──
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

    parts.push(
        '<div id="matchingSelBar" style="display:none; align-items:center; gap:10px; padding:7px 12px; ' +
        'background:#e8f0fe; border:1px solid #c5cdf5; border-radius:8px; margin-bottom:8px; font-size:13px;">' +
        '<span class="msel-info" style="flex:1; color:#3949ab;"></span>' +
        '<button class="btn btn-secondary btn-sm" onclick="clearMatchingSelection()">✕ Batalkan Pilihan</button>' +
        '</div>'
    );

    if (!showAll) parts.push(buildPagination('matching', matchingPage, totalPages, totalRows));

    // ═══════════════════════════════════════════════════════════════
    // Fix #5: Pre-scan allRows untuk menentukan kolom mana yang punya data
    // Scan dilakukan sekali dalam satu pass O(n) agar efisien
    // ═══════════════════════════════════════════════════════════════
    var dc = typeof DUPLIKAT_COL !== 'undefined' ? DUPLIKAT_COL : (window.DUPLIKAT_COL || {});
    var vis = {
        // Stok
        NO_SERI:       false, TAHUN_BUKU:    false, KUA:           false,
        STATUS:        false, TGL_ALOKASI:   false, TGL_DIGUNAKAN: false, KETERANGAN: false,
        // Duplikat (Fix #4: urutan Duplikat dulu baru Nikah)
        D_TGL:         false, D_NO_DAFTAR:   false, D_AKTA_LAMA:   false,
        D_SUAMI:       false, D_ISTRI:       false, D_TGL_AKAD:    false, D_SUMBER: false,
        // Nikah
        N_NO_DAFTAR:   false, N_AKTA:        false, N_TGL_DAFTAR:  false,
        N_TGL_AKAD:    false, N_SUAMI:       false, N_ISTRI:       false,
        N_TEMPAT:      false, N_NTPN:        false
    };
    for (var si = 0; si < allRows.length; si++) {
        var sr = allRows[si];
        var ss = sr.stok;
        var sn = sr.nikah;
        var sd = sr.duplikat;
        if (!vis.NO_SERI       && STOK_COL.NO_SERI >= 0       && ss[STOK_COL.NO_SERI])       vis.NO_SERI = true;
        if (!vis.TAHUN_BUKU    && STOK_COL.TAHUN_BUKU >= 0    && ss[STOK_COL.TAHUN_BUKU])    vis.TAHUN_BUKU = true;
        if (!vis.KUA           && STOK_COL.KUA >= 0           && ss[STOK_COL.KUA])           vis.KUA = true;
        if (!vis.STATUS        && STOK_COL.STATUS >= 0        && ss[STOK_COL.STATUS])        vis.STATUS = true;
        if (!vis.TGL_ALOKASI   && STOK_COL.TGL_ALOKASI >= 0   && ss[STOK_COL.TGL_ALOKASI])   vis.TGL_ALOKASI = true;
        if (!vis.TGL_DIGUNAKAN && STOK_COL.TGL_DIGUNAKAN >= 0 && ss[STOK_COL.TGL_DIGUNAKAN]) vis.TGL_DIGUNAKAN = true;
        if (!vis.KETERANGAN    && STOK_COL.KETERANGAN >= 0    && ss[STOK_COL.KETERANGAN])    vis.KETERANGAN = true;
        if (sd) {
            if (!vis.D_TGL      && dc.TGL_DUPLIKAT >= 0     && sd[dc.TGL_DUPLIKAT])     vis.D_TGL = true;
            if (!vis.D_NO_DAFTAR && dc.NO_PENDAFTARAN >= 0  && sd[dc.NO_PENDAFTARAN])   vis.D_NO_DAFTAR = true;
            if (!vis.D_AKTA_LAMA && dc.NO_AKTA_LAMA >= 0   && sd[dc.NO_AKTA_LAMA])    vis.D_AKTA_LAMA = true;
            if (!vis.D_SUAMI     && dc.NAMA_SUAMI >= 0      && sd[dc.NAMA_SUAMI])      vis.D_SUAMI = true;
            if (!vis.D_ISTRI     && dc.NAMA_ISTRI >= 0      && sd[dc.NAMA_ISTRI])      vis.D_ISTRI = true;
            if (!vis.D_TGL_AKAD  && dc.TGL_AKAD >= 0        && sd[dc.TGL_AKAD])        vis.D_TGL_AKAD = true;
            if (!vis.D_SUMBER    && dc.SUMBER >= 0           && sd[dc.SUMBER])          vis.D_SUMBER = true;
        }
        if (sn) {
            if (!vis.N_NO_DAFTAR && sn[COL.NO_PENDAFTARAN]) vis.N_NO_DAFTAR = true;
            if (!vis.N_AKTA      && sn[COL.NO_AKTA_NIKAH])  vis.N_AKTA      = true;
            if (!vis.N_TGL_DAFTAR && sn[COL.TGL_DAFTAR])   vis.N_TGL_DAFTAR = true;
            if (!vis.N_TGL_AKAD  && sn[COL.TGL_AKAD])      vis.N_TGL_AKAD  = true;
            if (!vis.N_SUAMI     && sn[COL.NAMA_SUAMI])     vis.N_SUAMI     = true;
            if (!vis.N_ISTRI     && sn[COL.NAMA_ISTRI])     vis.N_ISTRI     = true;
            if (!vis.N_TEMPAT    && sn[COL.TEMPAT_NIKAH])   vis.N_TEMPAT    = true;
            if (!vis.N_NTPN      && sn[COL.NTPN])           vis.N_NTPN      = true;
        }
    }

    // Hitung colspan dinamis berdasarkan kolom yang visible
    var stokSpan = 1; // No. Porforasi selalu ada
    if (vis.NO_SERI)       stokSpan++;
    if (vis.TAHUN_BUKU)    stokSpan++;
    if (vis.KUA)           stokSpan++;
    if (vis.STATUS)        stokSpan++;
    if (vis.TGL_ALOKASI)   stokSpan++;
    if (vis.TGL_DIGUNAKAN) stokSpan++;
    if (vis.KETERANGAN)    stokSpan++;

    var dupSpan  = 0;
    if (vis.D_TGL)      dupSpan++;
    if (vis.D_NO_DAFTAR) dupSpan++;
    if (vis.D_AKTA_LAMA) dupSpan++;
    if (vis.D_SUAMI)     dupSpan++;
    if (vis.D_ISTRI)     dupSpan++;
    if (vis.D_TGL_AKAD)  dupSpan++;
    if (vis.D_SUMBER)    dupSpan++;

    var nikSpan  = 0;
    if (vis.N_NO_DAFTAR)  nikSpan++;
    if (vis.N_AKTA)       nikSpan++;
    if (vis.N_TGL_DAFTAR) nikSpan++;
    if (vis.N_TGL_AKAD)   nikSpan++;
    if (vis.N_SUAMI)      nikSpan++;
    if (vis.N_ISTRI)      nikSpan++;
    if (vis.N_TEMPAT)     nikSpan++;
    if (vis.N_NTPN)       nikSpan++;

    // ── Build Table ──
    parts.push('<div class="table-container"><table id="matchingTable"><thead>');

    // ── Subheader row (group labels) ──
    parts.push('<tr class="matching-group-header">');
    parts.push('<th colspan="2" class="mgh-status">Status & No. Porforasi</th>');
    parts.push('<th colspan="' + stokSpan + '" class="mgh-stok">📚 Data Stok Buku</th>');
    // Fix #4: Duplikat group dulu, baru Nikah
    if (dupSpan > 0)
        parts.push('<th colspan="' + dupSpan + '" class="mgh-dup">📋 Data Duplikat</th>');
    if (nikSpan > 0)
        parts.push('<th colspan="' + nikSpan + '" class="mgh-nikah">💍 Data Nikah (NB)</th>');
    parts.push('</tr>');

    // ── Header utama ──
    var _cidx = 0;
    function _th(label, sortKey, extra) {
        var cls     = sortKey ? _sortClass(sortKey) : '';
        var onclick = sortKey
            ? 'toggleMatchingSort(\'' + sortKey + '\')'
            : 'toggleMatchingColSelect(' + _cidx + ')';
        var str = '<th data-cidx="' + _cidx + '"' + cls +
            ' onclick="' + onclick + '" title="Urutkan / Klik untuk seleksi kolom"' +
            (extra || '') + '>' + label + '</th>';
        _cidx++;
        return str;
    }

    parts.push('<tr>');
    parts.push(_th('#', null, ' class="col-no"'));
    parts.push(_th('Status', 'matchStatus'));
    parts.push(_th('No. Porforasi', 'noPerforasi'));

    if (vis.NO_SERI)       parts.push(_th('No. Seri', null));
    if (vis.TAHUN_BUKU)    parts.push(_th('Tahun Buku', null));
    if (vis.KUA)           parts.push(_th('KUA (Stok)', null));
    if (vis.STATUS)        parts.push(_th('Status Buku', 'statusBuku'));
    if (vis.TGL_ALOKASI)   parts.push(_th('Tgl. Alokasi', null));
    if (vis.TGL_DIGUNAKAN) parts.push(_th('Tgl. Digunakan', 'tglDigunakan'));
    if (vis.KETERANGAN)    parts.push(_th('Keterangan', null));

    // Fix #4: Duplikat columns first
    if (vis.D_TGL)       parts.push(_th('Tgl. Duplikat',          null, ' class="matching-divider-col-dup"'));
    if (vis.D_NO_DAFTAR) parts.push(_th('No. Pendaftaran (Dup)',  null));
    if (vis.D_AKTA_LAMA) parts.push(_th('No. Akta Lama',         null));
    if (vis.D_SUAMI)     parts.push(_th('Nama Suami (Dup)',       null));
    if (vis.D_ISTRI)     parts.push(_th('Nama Istri (Dup)',       null));
    if (vis.D_TGL_AKAD)  parts.push(_th('Tgl. Akad (Dup)',       null));
    if (vis.D_SUMBER)    parts.push(_th('Sumber',                 null));

    // Then Nikah columns
    var nikFirstCls = dupSpan > 0 ? ' class="matching-divider-col"' : ' class="matching-divider-col"';
    if (vis.N_NO_DAFTAR)  parts.push(_th('No. Pendaftaran',  null, nikFirstCls));
    if (vis.N_AKTA)       parts.push(_th('No. Akta Nikah',   null));
    if (vis.N_TGL_DAFTAR) parts.push(_th('Tgl. Daftar',      null));
    if (vis.N_TGL_AKAD)   parts.push(_th('Tgl. Akad',        'tglAkad'));
    if (vis.N_SUAMI)      parts.push(_th('Nama Suami',        'namaSuami'));
    if (vis.N_ISTRI)      parts.push(_th('Nama Istri',        'namaIstri'));
    if (vis.N_TEMPAT)     parts.push(_th('Tempat Nikah',      null));
    if (vis.N_NTPN)       parts.push(_th('NTPN',              null));

    parts.push('</tr></thead><tbody>');

    // ── Rows ──
    var totalCols = _cidx;

    displayRows.forEach(function(row, idx) {
        var stok    = row.stok;
        var nikah   = row.nikah;
        var dup     = row.duplikat;
        var src     = row.matchSource;
        var gidx    = start + idx;

        var rowCls;
        switch (src) {
            case 'duplikat':
                rowCls = row.alsoInNikah ? 'row-matched row-both' : 'row-matched row-dup-only';
                break;
            case 'nikah':  rowCls = 'row-matched';    break;
            default:       rowCls = 'row-unmatched';
        }
        if (matchingSelectedRows.has(gidx)) rowCls += ' row-msel';

        parts.push('<tr class="' + rowCls + '" data-gidx="' + gidx + '"' +
            ' onclick="handleMatchingRowClick(event,' + gidx + ')">');
        var ci = 0;

        // Col #
        var cNo = matchingSelectedCols.has(ci) ? ' col-msel' : '';
        parts.push('<td class="col-no' + cNo + '" data-cidx="' + ci + '">' + (gidx + 1) + '</td>'); ci++;

        // Status badge
        var cSt = matchingSelectedCols.has(ci) ? ' col-msel' : '';
        var badge;
        switch (src) {
            case 'duplikat':
                badge = row.alsoInNikah
                    ? '<span class="match-badge match-dup">📋 Duplikat <small style="font-size:10px;opacity:.8;">+NB</small></span>'
                    : '<span class="match-badge match-dup">📋 Duplikat</span>';
                break;
            case 'nikah':
                badge = '<span class="match-badge match-yes">💍 Data Nikah</span>'; break;
            default:
                badge = '<span class="match-badge match-no">❌ Tidak Ada</span>';
        }
        parts.push('<td data-cidx="' + ci + '" class="' + cSt.trim() + '">' + badge + '</td>'); ci++;

        // No. Porforasi
        var cPer = matchingSelectedCols.has(ci) ? ' col-msel' : '';
        var noPer = STOK_COL.NO_PERFORASI >= 0 ? escHtml(String(stok[STOK_COL.NO_PERFORASI] || '')) : '';
        parts.push('<td class="cell-perforasi' + cPer + '" data-cidx="' + ci + '">' + noPer + '</td>'); ci++;

        function _td(val, extraCls) {
            var cSel = matchingSelectedCols.has(ci) ? ' col-msel' : '';
            var str  = '<td data-cidx="' + ci + '" class="' + ((extraCls || '') + cSel).trim() + '">' + val + '</td>';
            ci++;
            return str;
        }
        function _tdEmpty(extraCls) {
            var cSel = matchingSelectedCols.has(ci) ? ' col-msel' : '';
            var str = '<td data-cidx="' + ci + '" class="cell-empty ' + ((extraCls || '') + cSel).trim() + '">—</td>';
            ci++;
            return str;
        }

        // Stok columns
        if (vis.NO_SERI)       parts.push(_td(escHtml(String(stok[STOK_COL.NO_SERI]    || ''))));
        if (vis.TAHUN_BUKU)    parts.push(_td(escHtml(String(stok[STOK_COL.TAHUN_BUKU] || ''))));
        if (vis.KUA)           parts.push(_td(escHtml(String(stok[STOK_COL.KUA]        || ''))));
        if (vis.STATUS)        parts.push(_td(buildStatusBadge(stok[STOK_COL.STATUS])));
        if (vis.TGL_ALOKASI)   parts.push(_td(formatStokDate(stok[STOK_COL.TGL_ALOKASI])));
        if (vis.TGL_DIGUNAKAN) parts.push(_td(formatStokDate(stok[STOK_COL.TGL_DIGUNAKAN])));
        if (vis.KETERANGAN)    parts.push(_td(escHtml(String(stok[STOK_COL.KETERANGAN] || ''))));

        // Fix #4: Duplikat columns first
        var firstDupRendered = false;
        function _dupCls() {
            if (!firstDupRendered) { firstDupRendered = true; return 'matching-divider-col-dup'; }
            return '';
        }
        if (vis.D_TGL)       parts.push(dup && dc.TGL_DUPLIKAT >= 0   ? _td(formatDate(dup[dc.TGL_DUPLIKAT]),              _dupCls()) : _tdEmpty(_dupCls()));
        if (vis.D_NO_DAFTAR) parts.push(dup && dc.NO_PENDAFTARAN >= 0  ? _td(escHtml(String(dup[dc.NO_PENDAFTARAN]  || '')), _dupCls()) : _tdEmpty(_dupCls()));
        if (vis.D_AKTA_LAMA) parts.push(dup && dc.NO_AKTA_LAMA >= 0   ? _td(escHtml(String(dup[dc.NO_AKTA_LAMA]   || '')), _dupCls()) : _tdEmpty(_dupCls()));
        if (vis.D_SUAMI)     parts.push(dup && dc.NAMA_SUAMI >= 0      ? _td(escHtml(String(dup[dc.NAMA_SUAMI]     || '')), _dupCls()) : _tdEmpty(_dupCls()));
        if (vis.D_ISTRI)     parts.push(dup && dc.NAMA_ISTRI >= 0      ? _td(escHtml(String(dup[dc.NAMA_ISTRI]     || '')), _dupCls()) : _tdEmpty(_dupCls()));
        if (vis.D_TGL_AKAD)  parts.push(dup && dc.TGL_AKAD >= 0        ? _td(formatDate(dup[dc.TGL_AKAD]),                 _dupCls()) : _tdEmpty(_dupCls()));
        if (vis.D_SUMBER)    parts.push(dup && dc.SUMBER >= 0           ? _td(escHtml(String(dup[dc.SUMBER]         || '')), _dupCls()) : _tdEmpty(_dupCls()));

        // Then Nikah columns
        var firstNikRendered = false;
        function _nikCls() {
            if (!firstNikRendered) { firstNikRendered = true; return 'matching-divider-col'; }
            return '';
        }
        if (vis.N_NO_DAFTAR)  parts.push(nikah ? _td(escHtml(String(nikah[COL.NO_PENDAFTARAN] || '')), _nikCls()) : _tdEmpty(_nikCls()));
        if (vis.N_AKTA)       parts.push(nikah ? _td(escHtml(String(nikah[COL.NO_AKTA_NIKAH]  || '')), _nikCls()) : _tdEmpty(_nikCls()));
        if (vis.N_TGL_DAFTAR) parts.push(nikah ? _td(formatDate(nikah[COL.TGL_DAFTAR]),               _nikCls()) : _tdEmpty(_nikCls()));
        if (vis.N_TGL_AKAD)   parts.push(nikah ? _td(formatDate(nikah[COL.TGL_AKAD]),                 _nikCls()) : _tdEmpty(_nikCls()));
        if (vis.N_SUAMI)      parts.push(nikah ? _td(escHtml(String(nikah[COL.NAMA_SUAMI] || '')),    _nikCls()) : _tdEmpty(_nikCls()));
        if (vis.N_ISTRI)      parts.push(nikah ? _td(escHtml(String(nikah[COL.NAMA_ISTRI] || '')),    _nikCls()) : _tdEmpty(_nikCls()));
        if (vis.N_TEMPAT)     parts.push(nikah ? _td(escHtml(String(nikah[COL.TEMPAT_NIKAH] || '')),  _nikCls()) : _tdEmpty(_nikCls()));
        if (vis.N_NTPN)       parts.push(nikah ? _td(escHtml(String(nikah[COL.NTPN] || '')),          _nikCls()) : _tdEmpty(_nikCls()));

        parts.push('</tr>');
    });

    parts.push('</tbody></table></div>');
    if (!showAll) parts.push(buildPagination('matching', matchingPage, totalPages, totalRows));

    container.innerHTML = parts.join('');
    matchingDirty = false;

    _applyMatchingSelectionUI();
}

// ═══════════════════════════════════════════════════════════════════
// 8. COPY & DOWNLOAD
// ═══════════════════════════════════════════════════════════════════

function _matchingRowToArray(r, idx) {
    var s  = r.stok;
    var n  = r.nikah;
    var d  = r.duplikat;
    var dc = typeof DUPLIKAT_COL !== 'undefined' ? DUPLIKAT_COL : (window.DUPLIKAT_COL || {});
    var srcLabel;
    if (r.alsoInNikah)          srcLabel = 'Duplikat + Data Nikah';
    else if (r.matchSource === 'duplikat') srcLabel = 'Duplikat';
    else if (r.matchSource === 'nikah')    srcLabel = 'Data Nikah';
    else                                   srcLabel = 'Tidak Ada';
    return [
        idx + 1,
        srcLabel,
        STOK_COL.NO_PERFORASI  >= 0 ? (s[STOK_COL.NO_PERFORASI]  || '') : '',
        STOK_COL.NO_SERI       >= 0 ? (s[STOK_COL.NO_SERI]       || '') : '',
        STOK_COL.TAHUN_BUKU    >= 0 ? (s[STOK_COL.TAHUN_BUKU]    || '') : '',
        STOK_COL.KUA           >= 0 ? (s[STOK_COL.KUA]           || '') : '',
        STOK_COL.STATUS        >= 0 ? (s[STOK_COL.STATUS]        || '') : '',
        STOK_COL.TGL_ALOKASI   >= 0 ? formatStokDate(s[STOK_COL.TGL_ALOKASI])   : '',
        STOK_COL.TGL_DIGUNAKAN >= 0 ? formatStokDate(s[STOK_COL.TGL_DIGUNAKAN]) : '',
        STOK_COL.KETERANGAN    >= 0 ? (s[STOK_COL.KETERANGAN]    || '') : '',
        // Nikah
        n ? (n[COL.NO_PENDAFTARAN] || '') : '',
        n ? (n[COL.NO_AKTA_NIKAH]  || '') : '',
        n ? formatDate(n[COL.TGL_DAFTAR]) : '',
        n ? formatDate(n[COL.TGL_AKAD])   : '',
        n ? (n[COL.NAMA_SUAMI]   || '') : '',
        n ? (n[COL.NAMA_ISTRI]   || '') : '',
        n ? (n[COL.TEMPAT_NIKAH] || '') : '',
        n ? (n[COL.NTPN]         || '') : '',
        // Duplikat
        d && dc.TGL_DUPLIKAT >= 0    ? formatDate(d[dc.TGL_DUPLIKAT])         : '',
        d && dc.NO_PENDAFTARAN >= 0   ? (d[dc.NO_PENDAFTARAN]   || '')         : '',
        d && dc.NO_AKTA_LAMA >= 0     ? (d[dc.NO_AKTA_LAMA]     || '')         : '',
        d && dc.NAMA_SUAMI >= 0       ? (d[dc.NAMA_SUAMI]       || '')         : '',
        d && dc.NAMA_ISTRI >= 0       ? (d[dc.NAMA_ISTRI]       || '')         : '',
        d && dc.TGL_AKAD >= 0         ? formatDate(d[dc.TGL_AKAD])             : '',
        d && dc.SUMBER >= 0           ? (d[dc.SUMBER]           || '')         : ''
    ];
}

var _MATCHING_HEADERS = [
    '#', 'Status Matching', 'No. Porforasi', 'No. Seri', 'Tahun Buku',
    'KUA (Stok)', 'Status Buku', 'Tgl. Alokasi', 'Tgl. Digunakan', 'Keterangan',
    // Nikah
    'No. Pendaftaran (NB)', 'No. Akta Nikah', 'Tgl. Daftar',
    'Tgl. Akad (NB)', 'Nama Suami (NB)', 'Nama Istri (NB)', 'Tempat Nikah', 'NTPN',
    // Duplikat
    'Tgl. Duplikat', 'No. Pendaftaran (Dup)', 'No. Akta Lama',
    'Nama Suami (Dup)', 'Nama Istri (Dup)', 'Tgl. Akad (Dup)', 'Sumber'
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
        // Reset duplikat reference
        if (typeof window.duplikatData !== 'undefined') window.duplikatData = [];
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

// ── Hook buildDuplikatIndex (dipanggil setelah duplikat selesai dimuat) ──
(function() {
    var _orig = window.buildDuplikatIndex || function() {};
    window.buildDuplikatIndex = function() {
        _orig();
        matchingDirty = true;
        updateMatchingBadgeOnly();
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
            /* Duplikat-only row tint */
            '#matchingTable tbody tr.row-dup-only td { background: #fef9ec; }',
            '#matchingTable tbody tr.row-dup-only:hover td { background: #fef3c7; }',
            /* Both row tint */
            '#matchingTable tbody tr.row-both td { background: #f0fdf4; }',
            '#matchingTable tbody tr.row-both:hover td { background: #dcfce7; }',
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
            /* Match badges */
            '.match-badge { display:inline-block; padding:2px 8px; border-radius:12px; font-size:12px; font-weight:600; white-space:nowrap; }',
            '.match-yes  { background:#d1fae5; color:#065f46; }',
            '.match-no   { background:#fee2e2; color:#991b1b; }',
            '.match-dup  { background:#fef3c7; color:#92400e; }',
            '.match-both { background:#dbeafe; color:#1e40af; }',
            /* Group header colours */
            '#matchingTable thead tr.matching-group-header th.mgh-dup { background:#fffbeb; color:#92400e; border-bottom:2px solid #fcd34d; }',
            /* Duplikat column divider */
            '#matchingTable thead th.matching-divider-col-dup { border-left: 3px solid #fcd34d !important; }',
            '#matchingTable tbody td.matching-divider-col-dup { border-left: 3px solid #fcd34d !important; }',
            /* Summary bar extra items */
            '.msb-dup  { border-top: 4px solid #f59e0b; }',
            '.msb-both { border-top: 4px solid #3b82f6; }',
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
// Duplikat index hook (diisi oleh supervisi-script.js)
window.buildDuplikatIndex          = window.buildDuplikatIndex || function() {};

console.log('[MATCHING] ✓ supervisi-matching.js loaded');