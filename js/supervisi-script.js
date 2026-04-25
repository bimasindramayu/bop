// ===== SUPERVISI DASHBOARD SCRIPT =====
// File: supervisi-script.js – OPTIMIZED v2
// Perubahan:
//   • Tab Nikah tunggal (combobox view: semua/kantor/wna/kurang10/ntpn)
//   • Pagination ringan: 100 baris per halaman → aman di HP low-end
//   • Download XLSX (Data Nikah & Stok)
//   • Tidak render ulang kecuali diperlukan

// =====================================================================
// COLUMN INDEX MAP (0-based)
// A=0, B=1 … E=4 … G=6 … K=10 … L=11 … N=13 … R=17 …
// Z=25 … AD=29 … AK=36 … AZ=51 … CD=81
// =====================================================================
var COL = {
    KUA:                   4,
    NO_PERFORASI:          6,
    NO_PENDAFTARAN:        10,
    NO_AKTA_NIKAH:         8,
    TGL_DAFTAR:            11,
    NAMA_SUAMI:            13,
    UMUR_SUAMI:            16,   // Kolom Q
    WN_SUAMI:              17,
    NAMA_ISTRI:            25,
    UMUR_ISTRI:            28,   // Kolom AC
    WN_ISTRI:              29,
    TGL_AKAD:              36,   // Kolom AK
    STATUS_ISTRI:          33,   // Kolom AH — "Cerai Hidup" / "Cerai Mati" / dll
    TGL_PENGADILAN_ISTRI:  45,   // Kolom AT — Pencatatan Tanggal Pengadilan Istri
    NTPN:                  51,
    TGL_BAYAR:             -1,   // resolved dinamis dari nama header
    TEMPAT_NIKAH:          81
};

var PRIORITY_COLS = [
    4,   // KUA
    6,  // No Perforasi
    10,  // No Pendaftaran
    8,  //No Akta Nikah
    11,  // Tgl Daftar
    36,  // Tgl Akad
    13,  // Nama Suami
    16,  // Umur Suami
    17,  // WN Suami
    25,  // Nama Istri
    28,  // Umur Istri
    29,  // WN Istri
    51,  // NTPN
    -1,  // TGL_BAYAR (placeholder, resolved saat build)
    81   // Tempat Nikah
];

// Virtual column sentinel (kolom "Selisih Hari" di view kurang10)
var VIRTUAL_SELISIH    = -99;
// Virtual columns untuk view ceraihidup / ceraimati
var VIRTUAL_BATAS_IDDAH = -98;  // Tanggal minimum akad setelah iddah (calculated)
var VIRTUAL_SISA_IDDAH  = -97;  // Selisih hari: TGL_AKAD – batas (negatif = melanggar)

// =====================================================================
// STOK COLUMN MAP — dynamic (resolved from actual header row)
// =====================================================================
// Semua nilai diinisialisasi -1 (belum diketahui).
// resolveStokCols(headers) dipanggil setelah header dibaca dari sheet,
// sehingga urutan kolom di spreadsheet tidak berpengaruh.
var STOK_COL = {
    NO: -1, PROVINSI: -1, KAB: -1, KEC: -1, KUA: -1,
    NO_SERI: -1, NO_PERFORASI: -1, TAHUN_BUKU: -1,
    TGL_ALOKASI: -1, TGL_DIGUNAKAN: -1, KETERANGAN: -1, STATUS: -1
};

// DISPLAY_STOK_COLS & STOK_COL_NAMES diisi ulang oleh resolveStokCols.
var DISPLAY_STOK_COLS = [];
var STOK_COL_NAMES    = [];

// Alias map: field key → array of lowercase header strings yang dikenali.
// Tambahkan alias baru di sini jika nama kolom di spreadsheet berubah.
var STOK_HEADER_ALIASES = {
    NO:           ['no', 'no.', 'nomor'],
    NO_SERI:      ['no. seri', 'no seri', 'nomor seri', 'seri'],
    NO_PERFORASI: ['no. porforasi', 'no. perforasi', 'no porforasi', 'no perforasi',
                   'nomor perforasi', 'nomor porforasi'],
    TAHUN_BUKU:   ['tahun buku', 'tahun'],
    TGL_ALOKASI:  ['tgl. alokasi', 'tgl alokasi', 'tanggal alokasi'],
    TGL_DIGUNAKAN:['tgl. digunakan', 'tgl digunakan', 'tanggal digunakan'],
    PROVINSI:     ['provinsi'],
    KAB:          ['kabupaten/kota', 'kabupaten', 'kota', 'kab/kota', 'kab. / kota'],
    KEC:          ['kecamatan', 'kec'],
    KUA:          ['kua'],
    KETERANGAN:   ['keterangan', 'ket'],
    STATUS:       ['status']
};

/**
 * Resolusi dinamis kolom Stok dari baris header aktual.
 * Dipanggil sekali setelah sheet Stok dimuat.
 * Setelah ini, STOK_COL, DISPLAY_STOK_COLS, dan STOK_COL_NAMES
 * mencerminkan urutan kolom yang sesungguhnya di spreadsheet.
 *
 * @param {string[]} headers  — array nama kolom dari baris pertama sheet Stok
 */
function resolveStokCols(headers) {
    // Reset semua ke -1
    Object.keys(STOK_COL).forEach(function(k) { STOK_COL[k] = -1; });

    // Bangun lookup: header (lowercase+trim) → index kolom
    var lookup = {};
    headers.forEach(function(h, i) { lookup[String(h).toLowerCase().trim()] = i; });

    // Petakan setiap field ke kolom pertama yang cocok
    Object.keys(STOK_HEADER_ALIASES).forEach(function(field) {
        var aliases = STOK_HEADER_ALIASES[field];
        for (var a = 0; a < aliases.length; a++) {
            if (lookup[aliases[a]] !== undefined) {
                STOK_COL[field] = lookup[aliases[a]];
                break;
            }
        }
    });

    // Rebuild DISPLAY_STOK_COLS: semua kolom kecuali kolom NO,
    // diurutkan sesuai posisi aktual di spreadsheet (ascending index).
    var noIdx = STOK_COL.NO >= 0 ? STOK_COL.NO : 0;
    DISPLAY_STOK_COLS = [];
    STOK_COL_NAMES    = [];
    headers.forEach(function(h, i) {
        if (i === noIdx) return;   // skip kolom "No" (row-number, tidak perlu ditampilkan)
        DISPLAY_STOK_COLS.push(i);
        STOK_COL_NAMES.push(String(h));
    });

    console.log('[STOK] resolveStokCols →', JSON.stringify(STOK_COL));
}

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
var stokSort        = { col: -1, dir: 'asc' };   // col resolved after headers load
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
    semua:      'Semua data tanpa filter otomatis',
    kantor:     'Filter: Tempat Nikah mengandung "KUA" atau "KANTOR"',
    wna:        'Filter: Warganegara Suami atau Istri = WNA',
    kurang10:   'Filter: Selisih Akad – Daftar < 10 hari',
    ntpn:       'Kolom NTPN ditampilkan di posisi depan',
    ceraihidup: 'Filter: Status Istri = Cerai Hidup | Masa iddah 3 bulan 10 hari dari Tgl Pengadilan. Baris merah = melanggar masa iddah.',
    ceraimati:  'Filter: Status Istri = Cerai Mati | Masa iddah 4 bulan 10 hari dari Tgl Pengadilan. Baris merah = melanggar masa iddah.'
};
var VIEW_LABELS = {
    semua:      'Semua Data',
    kantor:     'Nikah Kantor KUA',
    wna:        'Nikah WNA',
    kurang10:   'Kurang 10 Hari',
    ntpn:       'NTPN',
    ceraihidup: 'Cerai Hidup (Iddah 3 Bln 10 Hr)',
    ceraimati:  'Cerai Mati (Iddah 4 Bln 10 Hr)'
};

// =====================================================================
// DATE UTILITIES
// =====================================================================
function parseDate(val) {
    if (!val) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    var s = String(val).trim();
    if (!s) return null;
    // ⚠️ ROOT FIX: Tangani ISO datetime "YYYY-MM-DDTHH:mm:ss…" sebelum ISO date.
    // String seperti "2025-12-31T17:00:00.000Z" (SheetJS UTC-serialized Date untuk
    // 1 Jan 2026 00:00 WIB) harus di-parse sebagai Date object, lalu gunakan
    // komponen LOCAL — bukan ekstrak "2025-12-31" dari regex (= salah 1 hari).
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
        var dt = new Date(s);
        return isNaN(dt.getTime()) ? null : dt;
        // Caller (formatStokDate/formatDate) menggunakan getDate/getMonth/getFullYear
        // (LOCAL) sehingga hasilnya sudah benar.
    }

    // Parse ISO date-only strings (YYYY-MM-DD) as LOCAL time to prevent
    // timezone offset from shifting the displayed date by 1 day.
    // new Date("2026-04-01") is parsed as UTC midnight, which in UTC+7
    // can render as March 31 — so we construct it explicitly as local.
    var isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        var d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
        return isNaN(d.getTime()) ? null : d;
    }

    // DD/MM/YYYY atau DD-MM-YYYY (format lokal Indonesia)
    // Harus ditangani eksplisit: new Date("01/12/2026") dibaca JS
    // sebagai bulan 1 (MM/DD/YYYY), bukan bulan 12.
    var dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (dmyMatch) {
        var d = new Date(parseInt(dmyMatch[3]), parseInt(dmyMatch[2]) - 1, parseInt(dmyMatch[1]));
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

// Tanggal Stok: normalisasi ke ISO dulu, baru format sebagai DD/MM/YYYY.
// Dengan memanggil normalizeDateToISO() di sini, fungsi ini menangani
// SEMUA format input (ISO, DD/MM/YYYY, DD-Mon-YY, tahun 2 digit, dsb.)
// tanpa harus bergantung pada normalizeStokDates() sudah dijalankan.
function formatStokDate(val) {
    if (val === null || val === undefined || val === '') return '';
    // ✅ FIX: Normalisasi ke ISO terlebih dahulu (string-only, tanpa risiko timezone shift)
    var iso = normalizeDateToISO(String(val));
    // Parse ISO ke Date object (LOCAL time — tidak ada UTC shift)
    var d = parseDate(iso);
    if (!d) return escHtml(String(val));
    return String(d.getDate()).padStart(2,'0') + '/' +
           String(d.getMonth() + 1).padStart(2,'0') + '/' +
           d.getFullYear();
}

function getMonthNumber(val) {
    var d = parseDate(val);
    return d ? d.getMonth() + 1 : null;
}

function formatISODate(d) {
    if (!(d instanceof Date) || isNaN(d.getTime())) return String(d);
    // ✅ ROOT FIX: SheetJS dengan cellDates:true membuat Date object dalam
    // LOCAL time (bukan UTC). Menggunakan getUTC* di zona UTC+7 menyebabkan
    // tanggal mundur 7 jam → hari sebelumnya.
    //
    // Contoh: 1 Jan 2026 00:00 WIB (UTC+7) = 31 Des 2025 17:00 UTC.
    // getUTCDate() = 31 → "2025-12-31" (SALAH).
    // getDate()    =  1 → "2026-01-01" (BENAR).
    //
    // Solusi: gunakan method LOCAL (getFullYear/getMonth/getDate).
    return d.getFullYear() + '-' +
           String(d.getMonth() + 1).padStart(2, '0') + '-' +
           String(d.getDate()).padStart(2, '0');
}

// =====================================================================
// DATE NORMALIZATION
// =====================================================================
// =====================================================================
// ✅ FIX: Konversi tanggal ke ISO (YYYY-MM-DD) secara murni string —
// tanpa objek Date sehingga tidak ada risiko timezone shift.
//
// Mendukung semua format yang muncul di spreadsheet:
//   1. YYYY-MM-DD        → sudah ISO, dikembalikan apa adanya
//   2. DD-Mon-YY/YYYY    → misal "13-Jan-26", "7-May-2025"
//   3. DD/MM/YYYY        → Indonesia  → "13/01/2026"
//   4. MM/DD/YYYY        → US format  → "01/13/2026"
//   5. DD-MM-YYYY        → dengan tanda hubung → "13-01-2026"
//
// Disambiguasi format 3 vs 4:
//   • Jika angka pertama > 12  → pasti DD/MM (hari tidak bisa > 12 jika bulan)
//   • Jika angka kedua  > 12  → pasti MM/DD (bulan tidak bisa > 12)
//   • Jika keduanya ≤ 12 → asumsikan DD/MM (konvensi Indonesia)
// =====================================================================
var _DATE_MON_MAP = {
    jan:1, feb:2, mar:3, apr:4, may:5, mei:5, jun:6,
    jul:7, aug:8, agu:8, sep:9, oct:10, okt:10, nov:11, dec:12, des:12
};

function normalizeDateToISO(val) {
    var s = String(val || '').trim();
    if (!s) return s;

    // 1a. Pure ISO date string "YYYY-MM-DD" — return as-is (no time component)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // 1b. ISO datetime string "YYYY-MM-DDTHH:mm:ss…" (e.g. from SheetJS .toISOString())
    // ⚠️ ROOT FIX: SheetJS dengan cellDates:true membuat Date LOCAL midnight.
    // Dalam UTC+7: new Date(2026,0,1) → toISOString() = "2025-12-31T17:00:00.000Z"
    // Mengambil substring(0,10) saja → "2025-12-31" = SALAH 1 hari.
    // Solusi: parse string sebagai Date lalu ambil komponen LOCAL (bukan UTC).
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
        var dt = new Date(s);
        if (!isNaN(dt.getTime())) {
            return dt.getFullYear() + '-' +
                   String(dt.getMonth() + 1).padStart(2, '0') + '-' +
                   String(dt.getDate()).padStart(2, '0');
        }
        // fallback: ambil bagian date saja (kurang akurat, tapi lebih baik dari error)
        return s.substring(0, 10);
    }

    // 2. DD-Mon-YY atau DD-Mon-YYYY  →  "13-Jan-26", "7-May-2025"
    var m0 = s.match(/^(\d{1,2})[-\/\s]([A-Za-z]{3,})[-\/\s](\d{2,4})$/);
    if (m0) {
        var d0  = parseInt(m0[1], 10);
        var mon = _DATE_MON_MAP[m0[2].toLowerCase().substring(0, 3)];
        var yr  = parseInt(m0[3], 10);
        if (yr < 100) yr += 2000;
        if (mon && d0) {
            return yr + '-' + String(mon).padStart(2, '0') + '-' + String(d0).padStart(2, '0');
        }
    }

    // 3 & 4 & 5. Dua angka dipisah / atau -  (bisa DD/MM, MM/DD, atau DD-MM) — tahun 4 digit
    var m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (m) {
        var first  = parseInt(m[1], 10);
        var second = parseInt(m[2], 10);
        var year   = m[3];
        var day, month;
        if (first > 12) {
            // angka pertama pasti hari (DD/MM/YYYY)
            day = first;  month = second;
        } else if (second > 12) {
            // angka kedua pasti hari (MM/DD/YYYY — format US)
            day = second; month = first;
        } else {
            // keduanya ≤ 12 → ambiguos, asumsikan DD/MM (Indonesia)
            day = first;  month = second;
        }
        return year + '-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    }

    // 6. DD/MM/YY atau DD-MM-YY — tahun 2 digit (misal "01-01-26", "01/01/26")
    var m2 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/);
    if (m2) {
        var f2   = parseInt(m2[1], 10);
        var s2   = parseInt(m2[2], 10);
        var yr2  = parseInt(m2[3], 10) + 2000;
        var day2, mon2;
        if (f2 > 12) { day2 = f2;  mon2 = s2; }
        else if (s2 > 12) { day2 = s2; mon2 = f2; }
        else { day2 = f2; mon2 = s2; }    // asumsikan DD/MM (Indonesia)
        return yr2 + '-' + String(mon2).padStart(2, '0') + '-' + String(day2).padStart(2, '0');
    }

    return s;
}

// Normalisasi kolom tanggal di seluruh baris stokData.
// Dipanggil sekali setelah data dimuat, sebelum render/filter.
function normalizeStokDates(rows) {
    var dateCols = [STOK_COL.TGL_ALOKASI, STOK_COL.TGL_DIGUNAKAN].filter(function(c) { return c >= 0; });
    return rows.map(function(row) {
        dateCols.forEach(function(col) {
            if (row[col] != null && row[col] !== '') {
                row[col] = normalizeDateToISO(String(row[col]));
            }
        });
        return row;
    });
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

function filterKurang10(rows) {
    return rows.filter(function(row) {
        var a = parseDate(row[COL.TGL_AKAD]);
        var d = parseDate(row[COL.TGL_DAFTAR]);
        var diff = daysBetweenDates(d, a);
        return diff !== null && diff < 10;
    });
}

function filterBawah19(rows) {
    return rows.filter(function(row) {
        var umurS = parseFloat(row[COL.UMUR_SUAMI]);
        var umurI = parseFloat(row[COL.UMUR_ISTRI]);
        return (!isNaN(umurS) && umurS < 19) || (!isNaN(umurI) && umurI < 19);
    });
}

function filterCeraiHidup(rows) {
    return rows.filter(function(row) {
        return String(row[COL.STATUS_ISTRI] || '').trim().toUpperCase() === 'CERAI HIDUP';
    });
}

function filterCeraiMati(rows) {
    return rows.filter(function(row) {
        return String(row[COL.STATUS_ISTRI] || '').trim().toUpperCase() === 'CERAI MATI';
    });
}

// =====================================================================
// MASA IDDAH HELPER
// =====================================================================
/**
 * Hitung tanggal batas minimum akad setelah masa iddah.
 * Cerai Hidup : 3 bulan + 10 hari dari tglPengadilan
 * Cerai Mati  : 4 bulan + 10 hari dari tglPengadilan
 * Return: Date object, atau null jika tglPengadilan tidak valid.
 */
function hitungBatasIddah(tglPengadilan, isCeraiMati) {
    var d = (tglPengadilan instanceof Date) ? tglPengadilan : parseDate(tglPengadilan);
    if (!d) return null;
    var bulan = isCeraiMati ? 4 : 3;
    // Tambah bulan dulu (perhatikan pelimpahan ke bulan berikutnya otomatis oleh Date)
    var hasil = new Date(d.getFullYear(), d.getMonth() + bulan, d.getDate());
    // Tambah 10 hari
    hasil.setDate(hasil.getDate() + 10);
    return hasil;
}

/**
 * Cek apakah akad melanggar masa iddah.
 * Return true jika TGL_AKAD < batas iddah (terlalu cepat).
 */
function isIddahViolation(row, isCeraiMati) {
    var tgP = parseDate(row[COL.TGL_PENGADILAN_ISTRI]);
    var tgA = parseDate(row[COL.TGL_AKAD]);
    if (!tgP || !tgA) return false;
    var batas = hitungBatasIddah(tgP, isCeraiMati);
    // Bandingkan hanya tanggal (hilangkan komponen waktu)
    var akadMs  = Date.UTC(tgA.getFullYear(),   tgA.getMonth(),   tgA.getDate());
    var batasMs = Date.UTC(batas.getFullYear(),  batas.getMonth(), batas.getDate());
    return akadMs < batasMs;
}

function getAutoFilter(view) {
    if (view === 'kantor')     return filterKantorKUA;
    if (view === 'wna')        return filterWNA;
    if (view === 'kurang10')   return filterKurang10;
    if (view === 'bawah19')    return filterBawah19;
    if (view === 'ceraihidup') return filterCeraiHidup;
    if (view === 'ceraimati')  return filterCeraiMati;
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
    if (f.kua && STOK_COL.KUA >= 0)
        rows = rows.filter(function(r) { return String(r[STOK_COL.KUA]||'').trim() === f.kua; });
    if (f.bulan && f.bulan.length > 0 && STOK_COL.TGL_DIGUNAKAN >= 0)
        rows = rows.filter(function(r) {
            var d = parseDate(r[STOK_COL.TGL_DIGUNAKAN]);
            if (!d) return false;
            return f.bulan.indexOf(d.getMonth() + 1) !== -1;
        });
    if (f.noPerforasi && STOK_COL.NO_PERFORASI >= 0)
        rows = rows.filter(function(r) {
            return String(r[STOK_COL.NO_PERFORASI]||'').toLowerCase().indexOf(f.noPerforasi.toLowerCase()) !== -1;
        });
    if (f.status && STOK_COL.STATUS >= 0)
        rows = rows.filter(function(r) {
            return String(r[STOK_COL.STATUS]||'').toLowerCase().trim() === f.status.toLowerCase();
        });
    var s   = stokSort;
    var dir = s.dir === 'asc' ? 1 : -1;
    // Jika sort col belum diketahui (-1) atau di luar batas, skip sort
    if (s.col < 0) return rows;
    var isDateSortCol = (s.col === STOK_COL.TGL_ALOKASI || s.col === STOK_COL.TGL_DIGUNAKAN);
    rows.sort(function(a, b) {
        var va = a[s.col] != null ? String(a[s.col]) : '';
        var vb = b[s.col] != null ? String(b[s.col]) : '';
        if (isDateSortCol) {
            if (va < vb) return -1 * dir;
            if (va > vb) return  1 * dir;
            return 0;
        }
        var na = parseFloat(va), nb = parseFloat(vb);
        if (!isNaN(na) && !isNaN(nb)) return (na - nb) * dir;
        return va.localeCompare(vb, 'id') * dir;
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

    // kurang10 view: insert virtual Selisih column after TGL_DAFTAR
    if (activeNikahView === 'kurang10') {
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

    // ceraihidup / ceraimati view: custom priority dengan kolom iddah di depan
    if (activeNikahView === 'ceraihidup' || activeNikahView === 'ceraimati') {
        var iddahFront = [
            COL.KUA,
            COL.NO_PERFORASI,
            COL.NO_PENDAFTARAN,
            COL.NAMA_SUAMI,
            COL.NAMA_ISTRI,
            COL.NO_AKTA_NIKAH,
            COL.STATUS_ISTRI,           // AH — Status Istri
            COL.TGL_PENGADILAN_ISTRI,   // AT — Tgl Pengadilan
            VIRTUAL_BATAS_IDDAH,        // virtual: batas minimum akad
            COL.TGL_AKAD,               // AK — Tgl Akad
            VIRTUAL_SISA_IDDAH          // virtual: selisih hari (+ aman / − melanggar)
        ];
        // Saring kolom nyata yang ada di data
        var iddahFrontFiltered = iddahFront.filter(function(c) {
            return c < 0 || (c >= 0 && c < allHeaders.length);
        });
        var iddahSet2 = {};
        iddahFrontFiltered.forEach(function(c) { if (c >= 0) iddahSet2[c] = true; });
        // Kolom sisa (semua yang tidak ada di iddahFront)
        var restIddah = [];
        for (var ri3 = 0; ri3 < allHeaders.length; ri3++) {
            if (!iddahSet2[ri3]) restIddah.push(ri3);
        }
        var iddahOrdered = iddahFrontFiltered.concat(restIddah);
        return {
            headers: iddahOrdered.map(function(i) {
                if (i === VIRTUAL_BATAS_IDDAH) return 'Batas Akad (Iddah)';
                if (i === VIRTUAL_SISA_IDDAH)  return 'Selisih Iddah';
                return allHeaders[i] || '';
            }),
            indices: iddahOrdered
        };
    }

    return {
        headers: ordered.map(function(i) { return allHeaders[i]; }),
        indices: ordered
    };
}

function getHighlightCols() {
    if (activeNikahView === 'kantor')     return [COL.TEMPAT_NIKAH];
    if (activeNikahView === 'wna')        return [COL.WN_SUAMI, COL.WN_ISTRI];
    if (activeNikahView === 'kurang10')   return [COL.TGL_AKAD, COL.TGL_DAFTAR, VIRTUAL_SELISIH];
    if (activeNikahView === 'ntpn')       return [COL.NTPN];
    if (activeNikahView === 'bawah19')    return [COL.UMUR_SUAMI, COL.UMUR_ISTRI];
    if (activeNikahView === 'ceraihidup' || activeNikahView === 'ceraimati')
        return [COL.STATUS_ISTRI, COL.TGL_PENGADILAN_ISTRI, VIRTUAL_BATAS_IDDAH, COL.TGL_AKAD, VIRTUAL_SISA_IDDAH];
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
        var isVirtual = (colI === VIRTUAL_SELISIH || colI === VIRTUAL_BATAS_IDDAH || colI === VIRTUAL_SISA_IDDAH);
        var sc     = (sort.col === colI && !isVirtual)
                     ? (sort.dir === 'asc' ? 'sort-asc' : 'sort-desc') : '';
        var hlCls  = (hlSet.indexOf(colI) !== -1) ? ' col-orange-th' : '';
        var click  = isVirtual
                     ? ''
                     : 'onclick="toggleNikahSort(' + colI + ')" title="Klik untuk urutkan"';
        parts.push('<th class="' + sc + hlCls + '" ' + click + '>' + escHtml(String(h)) + '</th>');
    });
    parts.push('</tr></thead><tbody>');

    // Pre-compute iddah mode once per render
    var isIddahView = (activeNikahView === 'ceraihidup' || activeNikahView === 'ceraimati');
    var isCeraiMati = (activeNikahView === 'ceraimati');

    displayRows.forEach(function(row, idx) {
        // ── Row-level iddah violation coloring ──
        var rowAttr = '';
        if (isIddahView && isIddahViolation(row, isCeraiMati)) {
            rowAttr = ' class="row-iddah-violation"';
        }
        parts.push('<tr' + rowAttr + '><td class="col-no">' + (start + idx + 1) + '</td>');

        cols.indices.forEach(function(colI) {
            var isOrange = hlSet.indexOf(colI) !== -1;

            // View bawah19: warnai oranye hanya jika nilai < 19
            if (isOrange && activeNikahView === 'bawah19') {
                var umurVal = parseFloat(row[colI]);
                isOrange = !isNaN(umurVal) && umurVal < 19;
            }

            var tdCls = isOrange ? ' class="col-orange-td"' : '';

            // ── Virtual: Selisih Hari (view kurang10) ──
            if (colI === VIRTUAL_SELISIH) {
                var tA = parseDate(row[COL.TGL_AKAD]);
                var tD = parseDate(row[COL.TGL_DAFTAR]);
                var diff = daysBetweenDates(tD, tA);
                var disp = diff !== null ? diff + ' hari' : '-';
                parts.push('<td class="col-orange-td">' + disp + '</td>');
                return;
            }

            // ── Virtual: Batas Akad (iddah) ──
            if (colI === VIRTUAL_BATAS_IDDAH) {
                var tgP = parseDate(row[COL.TGL_PENGADILAN_ISTRI]);
                var bts = tgP ? hitungBatasIddah(tgP, isCeraiMati) : null;
                var dispB = bts ? formatDate(bts) : '-';
                parts.push('<td class="col-orange-td">' + dispB + '</td>');
                return;
            }

            // ── Virtual: Selisih Iddah ──
            if (colI === VIRTUAL_SISA_IDDAH) {
                var tgP2 = parseDate(row[COL.TGL_PENGADILAN_ISTRI]);
                var tgA2 = parseDate(row[COL.TGL_AKAD]);
                if (tgP2 && tgA2) {
                    var bts2    = hitungBatasIddah(tgP2, isCeraiMati);
                    var selisih = daysBetweenDates(bts2, tgA2);  // + aman, − melanggar
                    var selLabel = (selisih >= 0 ? '+' : '') + selisih + ' hari';
                    var selStyle = selisih < 0
                        ? ' style="color:#c0392b;font-weight:700;"'
                        : ' style="color:#1e8449;font-weight:700;"';
                    parts.push('<td class="col-orange-td"' + selStyle + '>' + selLabel + '</td>');
                } else {
                    parts.push('<td class="col-orange-td">-</td>');
                }
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
    // Status umum
    'tersedia':        { bg: '#cce5ff', color: '#004085', border: '#b8daff' },  // biru – tersedia
    'terpakai':        { bg: '#d4edda', color: '#155724', border: '#c3e6cb' },  // hijau – terpakai
    'rusak':           { bg: '#fff3cd', color: '#856404', border: '#ffeeba' },  // kuning – rusak
    'hilang':          { bg: '#fde2e4', color: '#842029', border: '#f5c6cb' },  // merah – hilang
    // ✅ Status buku nikah (nama persis dari spreadsheet, di-lowercase saat lookup)
    'belum digunakan': { bg: '#cce5ff', color: '#004085', border: '#b8daff' },  // biru muda – belum dipakai
    'sudah digunakan': { bg: '#d4edda', color: '#155724', border: '#c3e6cb' },  // hijau – sudah dipakai
    // Fallback
    'default':         { bg: '#e2e3e5', color: '#383d41', border: '#d6d8db' }
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
            } else if (colI === STOK_COL.TGL_ALOKASI || colI === STOK_COL.TGL_DIGUNAKAN) {
                // ✅ FIX: Selalu gunakan formatStokDate (sudah handle semua format input
                // termasuk ISO, DD/MM/YYYY, DD-Mon-YY, tahun 2 digit, dsb.)
                // Tidak perlu cek ISO dulu — normalizeDateToISO dipanggil di dalam.
                parts.push('<td title="' + escHtml(String(val)) + '">' + formatStokDate(val) + '</td>');
            } else {
                var disp = (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val))
                    ? formatDate(val)
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
    // Gunakan kolom NO_PERFORASI yang sudah di-resolve; fallback ke kolom pertama yang tersedia
    var defaultSortCol = STOK_COL.NO_PERFORASI >= 0
        ? STOK_COL.NO_PERFORASI
        : (DISPLAY_STOK_COLS.length > 0 ? DISPLAY_STOK_COLS[0] : 0);
    stokSort    = { col: defaultSortCol, dir: 'asc' };
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
        return d ? d.getMonth() + 1 : null;
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
    var isIddahV  = (activeNikahView === 'ceraihidup' || activeNikahView === 'ceraimati');
    var isCeraiM  = (activeNikahView === 'ceraimati');
    var lines = [['#'].concat(cols.headers).join('\t')];
    rows.forEach(function(row, idx) {
        var line = [idx + 1];
        cols.indices.forEach(function(colI) {
            if (colI === VIRTUAL_SELISIH) {
                var diff = daysBetweenDates(parseDate(row[COL.TGL_DAFTAR]), parseDate(row[COL.TGL_AKAD]));
                line.push(diff !== null ? diff : '');
            } else if (colI === VIRTUAL_BATAS_IDDAH) {
                var tgP = parseDate(row[COL.TGL_PENGADILAN_ISTRI]);
                var bts = tgP ? hitungBatasIddah(tgP, isCeraiM) : null;
                line.push(bts ? formatDate(bts) : '');
            } else if (colI === VIRTUAL_SISA_IDDAH) {
                var tgP2 = parseDate(row[COL.TGL_PENGADILAN_ISTRI]);
                var tgA2 = parseDate(row[COL.TGL_AKAD]);
                if (tgP2 && tgA2) {
                    var bts2 = hitungBatasIddah(tgP2, isCeraiM);
                    line.push(daysBetweenDates(bts2, tgA2));
                } else {
                    line.push('');
                }
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
    var rows      = getNikahData();
    var cols      = buildNikahColumns();
    var label     = VIEW_LABELS[activeNikahView] || 'Nikah';
    var isCeraiM  = (activeNikahView === 'ceraimati');
    var header    = ['#'].concat(cols.headers);
    var data      = [header];

    rows.forEach(function(row, idx) {
        var line = [idx + 1];
        cols.indices.forEach(function(colI) {
            if (colI === VIRTUAL_SELISIH) {
                var diff = daysBetweenDates(parseDate(row[COL.TGL_DAFTAR]), parseDate(row[COL.TGL_AKAD]));
                line.push(diff !== null ? diff : '');
            } else if (colI === VIRTUAL_BATAS_IDDAH) {
                var tgP = parseDate(row[COL.TGL_PENGADILAN_ISTRI]);
                var bts = tgP ? hitungBatasIddah(tgP, isCeraiM) : null;
                line.push(bts ? formatDate(bts) : '');
            } else if (colI === VIRTUAL_SISA_IDDAH) {
                var tgP2 = parseDate(row[COL.TGL_PENGADILAN_ISTRI]);
                var tgA2 = parseDate(row[COL.TGL_AKAD]);
                if (tgP2 && tgA2) {
                    var bts2 = hitungBatasIddah(tgP2, isCeraiM);
                    line.push(daysBetweenDates(bts2, tgA2));
                } else {
                    line.push('');
                }
            } else {
                var val = row[colI] != null ? row[colI] : '';
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
    var total      = allData.length;
    var kantor     = filterKantorKUA(allData).length;
    var wna        = filterWNA(allData).length;
    var kurang10   = filterKurang10(allData).length;
    var ntpn       = allData.filter(function(r) { return String(r[COL.NTPN]||'').trim() !== ''; }).length;
    var bawah19    = filterBawah19(allData).length;

    var ceraiHidupAll     = filterCeraiHidup(allData);
    var ceraiMatiAll      = filterCeraiMati(allData);
    var ceraiHidupLanggar = ceraiHidupAll.filter(function(r) { return isIddahViolation(r, false); }).length;
    var ceraiMatiLanggar  = ceraiMatiAll.filter(function(r)  { return isIddahViolation(r, true);  }).length;

    function setEl(id, val) { var el = document.getElementById(id); if (el) el.textContent = val.toLocaleString('id-ID'); }
    function setLanggar(id, val) {
        var el = document.getElementById(id);
        if (el) el.textContent = val.toLocaleString('id-ID') + ' langgar';
        if (el) el.style.display = val > 0 ? '' : 'none';
    }
    setEl('stat-total',            total);
    setEl('stat-kantor',           kantor);
    setEl('stat-wna',              wna);
    setEl('stat-kurang10',         kurang10);
    setEl('stat-ntpn',             ntpn);
    setEl('stat-bawah19',          bawah19);
    setEl('stat-ceraihidup',       ceraiHidupAll.length);
    setLanggar('stat-ceraihidup-langgar', ceraiHidupLanggar);
    setEl('stat-ceraimati',        ceraiMatiAll.length);
    setLanggar('stat-ceraimati-langgar',  ceraiMatiLanggar);
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
            // ✅ FIX: cellDates:true agar sel tanggal dikembalikan sebagai Date object
            // (bukan ISO string via .toISOString() yang bisa menyebabkan UTC-shift H-1).
            var raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', cellDates: true });
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
        stokSort    = { col: -1, dir: 'asc' };
        stokPage    = 1;
        stokDirty   = true;
        updateBadge('stok', 0);

        var stokDiv = document.getElementById('table-stok');
        if (stokDiv) stokDiv.innerHTML = buildTabLoadingState('Memuat data Stok...', 'Mengambil sheet Stok dari Google Drive');

        var result = await apiCall('getStokData', { fileId: fileId });
        var rows    = [];
        var headers = [];

        if (result && result.type === 'base64') {
            if (typeof XLSX === 'undefined') throw new Error('SheetJS belum termuat.');
            var wb = XLSX.read(result.content, { type: 'base64', cellDates: true });
            var sheetName = wb.SheetNames.find(function(n) { return n.toLowerCase().trim() === 'stok'; }) || wb.SheetNames[0];
            var ws  = wb.Sheets[sheetName];
            var raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', cellDates: true });
            if (raw.length > 0) {
                // ✅ Ambil baris header dari raw[0]
                headers = raw[0].map(function(h) { return h != null ? String(h) : ''; });
            }
            if (raw.length > 1) {
                rows = raw.slice(1)
                    .filter(function(r) { return r.some(function(c) { return c !== '' && c != null; }); })
                    .map(function(r) {
                        return r.map(function(c) { return c instanceof Date ? formatISODate(c) : (c != null ? c : ''); });
                    });
            }
        } else if (result && result.rows) {
            rows    = result.rows    || [];
            headers = result.headers || [];
        }

        // ✅ Resolusi kolom berdasarkan header aktual (tidak bergantung pada urutan)
        stokHeaders = headers;
        resolveStokCols(stokHeaders);

        // Default sort: No. Perforasi jika ada, jika tidak pakai kolom pertama non-NO
        stokSort.col = STOK_COL.NO_PERFORASI >= 0
            ? STOK_COL.NO_PERFORASI
            : (DISPLAY_STOK_COLS.length > 0 ? DISPLAY_STOK_COLS[0] : 0);

        stokData = normalizeStokDates(rows);
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
    stokHeaders = [];
    stokFilters = {};
    stokSort    = { col: -1, dir: 'asc' };
    stokPage    = 1;
    stokDirty   = true;

    ['total','kantor','wna','kurang10','ntpn'].forEach(function(k) {
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