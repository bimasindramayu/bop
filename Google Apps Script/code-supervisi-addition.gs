// ===================================================================
// SUPERVISI DASHBOARD – Google Apps Script Backend Additions
// ===================================================================

function handleGetSupervisiFiles(payload) {
  try {
    var props    = PropertiesService.getScriptProperties();
    var folderId = props.getProperty('SUPERVISI_FOLDER_ID');
    if (!folderId) {
      return { success: false, message: 'SUPERVISI_FOLDER_ID belum diset di Script Properties.' };
    }
    var folder = DriveApp.getFolderById(folderId);
    var files   = [];
    var mimeTypes = [MimeType.MICROSOFT_EXCEL, MimeType.GOOGLE_SHEETS, 'application/vnd.ms-excel'];
    mimeTypes.forEach(function(mime) {
      var iterator = folder.getFilesByType(mime);
      while (iterator.hasNext()) {
        var file = iterator.next();
        files.push({
          id: file.getId(), name: file.getName(), mimeType: file.getMimeType(),
          size: file.getSize(), modifiedDate: file.getLastUpdated().toISOString(),
          isGoogleSheet: file.getMimeType() === MimeType.GOOGLE_SHEETS
        });
      }
    });
    files.sort(function(a, b) { return a.name.localeCompare(b.name); });
    return { success: true, data: files };
  } catch (e) {
    Logger.log('[SUPERVISI] getSupervisiFiles error: ' + e.toString());
    return { success: false, message: 'Error: ' + e.toString() };
  }
}

function handleGetSupervisiData(payload) {
  try {
    var fileId = payload.fileId;
    if (!fileId) return { success: false, message: 'fileId tidak diberikan' };
    var file     = DriveApp.getFileById(fileId);
    var mimeType = file.getMimeType();
    Logger.log('[SUPERVISI] Loading file: ' + file.getName() + ' (' + mimeType + ')');
    if (mimeType === MimeType.GOOGLE_SHEETS) return readGoogleSheet(fileId, file.getName());
    if (mimeType === MimeType.MICROSOFT_EXCEL ||
        mimeType === 'application/vnd.ms-excel' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return readXlsxAsBase64(file);
    }
    return { success: false, message: 'Format file tidak didukung: ' + mimeType };
  } catch (e) {
    Logger.log('[SUPERVISI] getSupervisiData error: ' + e.toString());
    return { success: false, message: 'Error membaca file: ' + e.toString() };
  }
}

function readGoogleSheet(fileId, fileName) {
  try {
    var ss    = SpreadsheetApp.openById(fileId);
    var sheet = ss.getSheets()[0];
    var range = sheet.getDataRange();
    var data  = range.getValues();
    if (data.length === 0) return { success: true, data: { headers: [], rows: [], fileName: fileName } };
    var tz = ss.getSpreadsheetTimeZone();
    var headers = data[0].map(function(h) { return String(h || ''); });
    var rows = data.slice(1)
      .filter(function(row) { return row.some(function(cell) { return cell !== null && cell !== undefined && cell !== ''; }); })
      .map(function(row) {
        return row.map(function(cell) {
          if (cell instanceof Date) return Utilities.formatDate(cell, tz, 'yyyy-MM-dd');
          return cell === null || cell === undefined ? '' : String(cell);
        });
      });
    Logger.log('[SUPERVISI] Loaded ' + rows.length + ' rows from Google Sheets: ' + fileName);
    return { success: true, data: { type: 'json', headers: headers, rows: rows, fileName: fileName, total: rows.length } };
  } catch (e) {
    return { success: false, message: 'Gagal membaca Google Sheets: ' + e.toString() };
  }
}

function readXlsxAsBase64(file) {
  try {
    var blob   = file.getBlob();
    var bytes  = blob.getBytes();
    var base64 = Utilities.base64Encode(bytes);
    var sizeMB = bytes.length / 1024 / 1024;
    Logger.log('[SUPERVISI] File size: ' + sizeMB.toFixed(2) + ' MB');
    if (sizeMB > 40) {
      return { success: false, message: 'File terlalu besar (' + sizeMB.toFixed(1) + ' MB). Harap konversi ke Google Sheets.' };
    }
    return { success: true, data: { type: 'base64', content: base64, fileName: file.getName() } };
  } catch (e) {
    return { success: false, message: 'Gagal membaca file xlsx: ' + e.toString() };
  }
}

// =====================================================================
// FUNGSI: BACA SHEET "Stok"
// =====================================================================
function handleGetStokData(data) {
  try {
    var fileId = data.fileId;
    if (!fileId) return { success: false, message: 'fileId tidak diberikan' };

    var file     = DriveApp.getFileById(fileId);
    var mimeType = file.getMimeType();
    Logger.log('[STOK] Loading sheet Stok from file: ' + file.getName());

    if (mimeType === MimeType.GOOGLE_SHEETS) {
      var ss = SpreadsheetApp.openById(fileId);
      var stokSheet = null;
      ss.getSheets().forEach(function(sh) {
        if (sh.getName().toLowerCase().trim() === 'stok') stokSheet = sh;
      });
      if (!stokSheet) return { success: false, message: 'Sheet "Stok" tidak ditemukan.' };

      var range      = stokSheet.getDataRange();
      var rawDisplay = range.getDisplayValues(); // PERSIS apa yang user lihat di Sheets

      if (rawDisplay.length === 0) return { success: true, data: { headers: [], rows: [], total: 0 } };

      var tz = ss.getSpreadsheetTimeZone();
      Logger.log('[STOK] timezone: ' + tz + ' | rows: ' + (rawDisplay.length - 1));

      var headers = rawDisplay[0].map(function(h) { return String(h || ''); });

      // ── Identifikasi kolom tanggal dari nama header ──
      var dateColIdx = {};
      headers.forEach(function(h, i) {
        var lower = (h || '').toLowerCase();
        if (lower.indexOf('tgl') !== -1 || lower.indexOf('tanggal') !== -1 ||
            lower.indexOf('alokasi') !== -1 || lower.indexOf('digunakan') !== -1 ||
            lower.indexOf('date') !== -1) {
          dateColIdx[i] = h;
        }
      });
      Logger.log('[STOK] Date columns: ' + JSON.stringify(dateColIdx));

      // ── Bulan (Indonesia + Inggris) ──
      var MON = {
        jan:1, january:1, januari:1,
        feb:2, february:2, februari:2,
        mar:3, march:3, maret:3,
        apr:4, april:4,
        may:5, mei:5,
        jun:6, june:6, juni:6,
        jul:7, july:7, juli:7,
        aug:8, august:8, agu:8, agustus:8,
        sep:9, september:9,
        oct:10, october:10, okt:10, oktober:10,
        nov:11, november:11,
        dec:12, december:12, des:12, desember:12
      };

      // ─────────────────────────────────────────────────────────────
      // parseDisplayDate — konversi string tampilan cell ke ISO YYYY-MM-DD
      //
      // PRINSIP: tidak ada Utilities.formatDate, tidak ada Date object.
      // Input = apa yang user lihat di layar → output = ISO string.
      //
      // Urutan pengecekan:
      //   0. Sudah ISO "YYYY-MM-DD"                     → return as-is
      //   1. "DD-MM-YYYY" / "DD/MM/YYYY" (4-digit year) → dengan logika DD/MM vs MM/DD
      //   2. "DD-MM-YY"   / "DD/MM/YY"  (2-digit year)
      //   3. "DD-Mon-YY"  / "DD-Mon-YYYY" (abbr. month)
      //   4. "Month DD, YYYY" / "DD Month YYYY" (long month)
      //   5. Angka murni (serial date)  → hitung manual (tanpa Date object)
      //
      // Disambiguasi DD/MM vs MM/DD (format (1) & (2)):
      //   • first  > 12 → pasti DD/MM (hari tidak bisa > 12 sebagai bulan)
      //   • second > 12 → pasti MM/DD (bulan tidak bisa > 12)
      //   • keduanya ≤ 12 → DEFAULT DD/MM (konvensi Indonesia)
      // ─────────────────────────────────────────────────────────────
      function parseDisplayDate(raw) {
        if (!raw) return '';
        var s = String(raw).trim();
        if (!s) return '';

        // 0. ISO YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

        // 1. DD-MM-YYYY / DD/MM/YYYY / DD.MM.YYYY (tahun 4 digit)
        var m1 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
        if (m1) {
          var f1 = +m1[1], s1 = +m1[2], y1 = m1[3], d1, mo1;
          if (f1 > 12)       { d1 = f1; mo1 = s1; }
          else if (s1 > 12)  { d1 = s1; mo1 = f1; }
          else               { d1 = f1; mo1 = s1; }   // default DD/MM
          if (mo1 >= 1 && mo1 <= 12 && d1 >= 1 && d1 <= 31)
            return y1 + '-' + String(mo1).padStart(2,'0') + '-' + String(d1).padStart(2,'0');
        }

        // 2. DD-MM-YY / DD/MM/YY (tahun 2 digit)
        var m2 = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
        if (m2) {
          var f2 = +m2[1], s2 = +m2[2], y2 = +m2[3] + 2000, d2, mo2;
          if (f2 > 12)      { d2 = f2; mo2 = s2; }
          else if (s2 > 12) { d2 = s2; mo2 = f2; }
          else              { d2 = f2; mo2 = s2; }
          if (mo2 >= 1 && mo2 <= 12 && d2 >= 1 && d2 <= 31)
            return y2 + '-' + String(mo2).padStart(2,'0') + '-' + String(d2).padStart(2,'0');
        }

        // 3. "5-Jan-26" / "31-Mar-2026" / "5 Jan 2026" / "31/Mar/2026"
        var m3 = s.match(/^(\d{1,2})[\s\-\/]([A-Za-z]{3,})[\s\-\/](\d{2,4})$/);
        if (m3) {
          var d3 = +m3[1], y3 = +m3[3];
          if (y3 < 100) y3 += 2000;
          var k3 = m3[2].toLowerCase(), mo3 = MON[k3] || MON[k3.substring(0,3)];
          if (mo3 && d3 >= 1 && d3 <= 31)
            return y3 + '-' + String(mo3).padStart(2,'0') + '-' + String(d3).padStart(2,'0');
        }

        // 4a. "January 5, 2026" / "April 30, 2026"
        var m4a = s.match(/^([A-Za-z]{3,})\s+(\d{1,2}),?\s+(\d{4})$/);
        if (m4a) {
          var k4 = m4a[1].toLowerCase(), mo4 = MON[k4] || MON[k4.substring(0,3)];
          var d4 = +m4a[2], y4 = +m4a[3];
          if (mo4 && d4 >= 1 && d4 <= 31)
            return y4 + '-' + String(mo4).padStart(2,'0') + '-' + String(d4).padStart(2,'0');
        }

        // 4b. "5 January 2026" / "30 April 2026"
        var m4b = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
        if (m4b) {
          var d4b = +m4b[1], k4b = m4b[2].toLowerCase();
          var mo4b = MON[k4b] || MON[k4b.substring(0,3)], y4b = +m4b[3];
          if (mo4b && d4b >= 1 && d4b <= 31)
            return y4b + '-' + String(mo4b).padStart(2,'0') + '-' + String(d4b).padStart(2,'0');
        }

        // 5. Angka murni (serial date) — hitung manual tanpa Date object untuk hindari timezone
        //    Excel/Sheets serial: 1 Jan 1900 = 1, 1 Jan 1970 = 25569
        //    Koreksi bug Excel (serial 60 = Feb 29 1900 yang tidak ada)
        if (/^\d+$/.test(s)) {
          var serial = parseInt(s, 10);
          if (serial > 1 && serial < 100000) {
            var corrected = serial >= 60 ? serial - 1 : serial;
            // Mulai dari 1 Mar 1900 (awal referensi tanpa bug),
            // konversi ke Gregorian menggunakan algoritma zeller/tombstone
            // Cara sederhana: hitung dari epoch 1970-01-01 = serial 25569 (setelah koreksi 25568)
            var daysFromEpoch = corrected - 25568;
            // Hitung tanggal dari epoch menggunakan aritmetika murni
            // Base: 1 Jan 1970 (hari ke-0)
            var z = daysFromEpoch + 719468;          // shift ke era
            var era = Math.floor((z >= 0 ? z : z - 146096) / 146097);
            var doe = z - era * 146097;              // day of era [0, 146096]
            var yoe = Math.floor((doe - Math.floor(doe/1460) + Math.floor(doe/36524) - Math.floor(doe/146096)) / 365);
            var yE  = yoe + era * 400;
            var doy = doe - (365 * yoe + Math.floor(yoe/4) - Math.floor(yoe/100));
            var mp  = Math.floor((5 * doy + 2) / 153);
            var day5 = doy - Math.floor((153 * mp + 2) / 5) + 1;
            var mon5 = mp < 10 ? mp + 3 : mp - 9;
            var yr5  = yE + (mon5 <= 2 ? 1 : 0);
            if (yr5 >= 1900 && yr5 <= 2200)
              return yr5 + '-' + String(mon5).padStart(2,'0') + '-' + String(day5).padStart(2,'0');
          }
        }

        return s; // kembalikan apa adanya jika tidak dikenali
      }

      // ── Log SEMUA nilai kolom tanggal ke Apps Script Logger ──
      var debugDateLog = {};
      rawDisplay.slice(1).forEach(function(row, ri) {
        Object.keys(dateColIdx).forEach(function(ci) {
          var v   = row[parseInt(ci)];
          var iso = parseDisplayDate(String(v || '').trim());
          if (!debugDateLog[ci]) debugDateLog[ci] = [];
          if (ri < 10) { // log max 10 baris per kolom
            debugDateLog[ci].push({ row: ri+1, disp: v, iso: iso });
          }
        });
      });
      Logger.log('[STOK DATE DEBUG] ' + JSON.stringify(debugDateLog));

      // ── Buat rows: hanya date columns yang di-parse, sisanya as-is ──
      var rows = rawDisplay.slice(1)
        .map(function(row) {
          return row.map(function(cell, colIdx) {
            var v = (cell !== null && cell !== undefined) ? String(cell) : '';
            if (v && dateColIdx[colIdx]) {
              return parseDisplayDate(v);  // konversi ke ISO untuk date columns
            }
            return v;
          });
        })
        .filter(function(row) { return row.some(function(c) { return c !== ''; }); });

      // ── Debug payload: kirim sample date values ke frontend ──
      var debugSamples = [];
      Object.keys(dateColIdx).forEach(function(ci) {
        var colName = dateColIdx[ci];
        rawDisplay.slice(1, 6).forEach(function(row, ri) {
          var v = String(row[parseInt(ci)] || '').trim();
          if (v) debugSamples.push({
            col: colName, row: ri+1,
            display: v,
            iso: parseDisplayDate(v)
          });
        });
      });

      Logger.log('[STOK] Loaded ' + rows.length + ' rows, tz=' + tz);

      return { success: true, data: { type: 'json', headers: headers, rows: rows, total: rows.length, _debugDateSamples: debugSamples } };
    }

    if (mimeType === MimeType.MICROSOFT_EXCEL ||
        mimeType === 'application/vnd.ms-excel' ||
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      return readXlsxAsBase64(file);
    }

    return { success: false, message: 'Format file tidak didukung: ' + mimeType };

  } catch (e) {
    Logger.log('[STOK] getStokData error: ' + e.toString());
    return { success: false, message: 'Error membaca sheet Stok: ' + e.toString() };
  }
}