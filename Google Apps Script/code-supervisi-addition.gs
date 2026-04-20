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

      var range = stokSheet.getDataRange();

      // ============================================================
      // ROOT FIX: getValues() mengembalikan Date sebagai UTC midnight.
      // "1-Apr-26" di spreadsheet (WIB/UTC+7) tersimpan sebagai
      // 2026-04-01T00:00:00+07:00 = 2026-03-31T17:00:00Z
      // → Utilities.formatDate menghasilkan "2026-03-31" → SALAH 1 hari.
      //
      // Solusi: pakai getDisplayValues() → ambil string persis tampilan
      // spreadsheet ("1-Apr-26") → parse manual ke ISO yyyy-MM-dd.
      // Ini 100% akurat karena membaca langsung dari tampilan user.
      // ============================================================
      var rawValues  = range.getValues();       // untuk deteksi tipe cell (Date vs string)
      var rawDisplay = range.getDisplayValues(); // string persis seperti di spreadsheet

      if (rawValues.length === 0) return { success: true, data: { headers: [], rows: [], total: 0 } };

      var headers = rawDisplay[0].map(function(h) { return String(h || ''); });

      var MON = {
        jan:1, feb:2, mar:3, apr:4, may:5, mei:5, jun:6,
        jul:7, aug:8, agu:8, sep:9, oct:10, okt:10, nov:11, dec:12, des:12
      };

      function parseDisplayDate(s) {
        if (!s) return '';
        s = String(s).trim();
        if (!s) return '';

        // "1-Apr-26" atau "7-May-2025"
        var m1 = s.match(/^(\d{1,2})[-\/\s]([A-Za-z]{3,})[-\/\s](\d{2,4})$/);
        if (m1) {
          var d   = parseInt(m1[1]);
          var mon = MON[m1[2].toLowerCase().substring(0, 3)];
          var yr  = parseInt(m1[3]);
          if (yr < 100) yr += 2000;
          if (mon && d) return yr + '-' + String(mon).padStart(2,'0') + '-' + String(d).padStart(2,'0');
        }

        // "31/03/2026"
        var m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m2) return m2[3] + '-' + m2[2].padStart(2,'0') + '-' + m2[1].padStart(2,'0');

        // "2026-03-31" (sudah ISO)
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

        return s;
      }

      var rows = rawValues.slice(1)
        .map(function(row, rowIdx) {
          var dispRow = rawDisplay[rowIdx + 1] || [];
          return row.map(function(cell, colIdx) {
            if (cell instanceof Date) {
              // Gunakan display string, bukan Date object — hindari UTC shift
              return parseDisplayDate(dispRow[colIdx]);
            }
            var v = dispRow[colIdx];
            return (v !== null && v !== undefined) ? String(v) : '';
          });
        })
        .filter(function(row) { return row.some(function(c) { return c !== ''; }); });

      Logger.log('[STOK] Loaded ' + rows.length + ' rows. col8=' +
        (rows[0] ? rows[0][8] : 'n/a') + ' col9=' + (rows[0] ? rows[0][9] : 'n/a'));

      return { success: true, data: { type: 'json', headers: headers, rows: rows, total: rows.length } };
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