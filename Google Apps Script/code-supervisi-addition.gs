// ===================================================================
// SUPERVISI DASHBOARD – Google Apps Script Backend Additions
// File: tambahkan ke code-main.gs (dalam fungsi doPost switch/case)
// ===================================================================
//
// LANGKAH INTEGRASI:
// 1. Buka file code-main.gs di Apps Script Editor
// 2. Tambahkan kode di bawah ke dalam switch(action) di fungsi doPost()
// 3. Tambahkan fungsi-fungsi helper di bawah class/section yang ada
// 4. Set SUPERVISI_FOLDER_ID di Script Properties (lihat instruksi di bawah)
//
// CARA SET FOLDER ID:
//   - Buka Apps Script Editor → Project Settings → Script Properties
//   - Tambahkan key: SUPERVISI_FOLDER_ID
//   - Value: ID folder Google Drive yang berisi file laporan
//   - Contoh ID: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms
//
// ===================================================================


// =====================================================================
// FUNGSI: LIST FILE DARI GOOGLE DRIVE FOLDER
// =====================================================================
function handleGetSupervisiFiles(payload) {
  try {
    // Ambil Folder ID dari Script Properties
    var props    = PropertiesService.getScriptProperties();
    var folderId = props.getProperty('SUPERVISI_FOLDER_ID');

    if (!folderId) {
      return {
        success: false,
        message: 'SUPERVISI_FOLDER_ID belum diset di Script Properties. ' +
                 'Buka Project Settings → Script Properties dan tambahkan key SUPERVISI_FOLDER_ID.'
      };
    }

    var folder = DriveApp.getFolderById(folderId);
    var files   = [];

    // Cari file Excel (.xlsx) dan Google Sheets
    var mimeTypes = [
      MimeType.MICROSOFT_EXCEL,                         // .xlsx
      MimeType.GOOGLE_SHEETS,                           // Google Sheets native
      'application/vnd.ms-excel'                        // .xls (legacy)
    ];

    mimeTypes.forEach(function(mime) {
      var iterator = folder.getFilesByType(mime);
      while (iterator.hasNext()) {
        var file = iterator.next();
        files.push({
          id:           file.getId(),
          name:         file.getName(),
          mimeType:     file.getMimeType(),
          size:         file.getSize(),
          modifiedDate: file.getLastUpdated().toISOString(),
          isGoogleSheet: file.getMimeType() === MimeType.GOOGLE_SHEETS
        });
      }
    });

    // Urutkan berdasarkan nama
    files.sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });

    return { success: true, data: files };

  } catch (e) {
    Logger.log('[SUPERVISI] getSupervisiFiles error: ' + e.toString());
    return { success: false, message: 'Error: ' + e.toString() };
  }
}


// =====================================================================
// FUNGSI: BACA DATA SPREADSHEET
// =====================================================================
function handleGetSupervisiData(payload) {
  try {
    var fileId = payload.fileId;
    if (!fileId) {
      return { success: false, message: 'fileId tidak diberikan' };
    }

    var file     = DriveApp.getFileById(fileId);
    var mimeType = file.getMimeType();

    Logger.log('[SUPERVISI] Loading file: ' + file.getName() + ' (' + mimeType + ')');

    // ── CABANG 1: Google Sheets (native) ────────────────────────────
    if (mimeType === MimeType.GOOGLE_SHEETS) {
      return readGoogleSheet(fileId, file.getName());
    }

    // ── CABANG 2: xlsx / xls – kembalikan sebagai base64 ───────────
    // Frontend akan parse menggunakan SheetJS
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


// =====================================================================
// HELPER: Baca Google Sheets dan kembalikan sebagai JSON
// =====================================================================
function readGoogleSheet(fileId, fileName) {
  try {
    var ss    = SpreadsheetApp.openById(fileId);
    var sheet = ss.getSheets()[0]; // Sheet pertama
    var range = sheet.getDataRange();
    var data  = range.getValues();

    if (data.length === 0) {
      return { success: true, data: { headers: [], rows: [], fileName: fileName } };
    }

    // Row pertama = header
    var headers = data[0].map(function(h) { return String(h || ''); });

    // Row berikutnya = data, filter baris kosong
    var rows = data.slice(1)
      .filter(function(row) {
        return row.some(function(cell) {
          return cell !== null && cell !== undefined && cell !== '';
        });
      })
      .map(function(row) {
        return row.map(function(cell) {
          if (cell instanceof Date) {
            // Format: YYYY-MM-DD
            return Utilities.formatDate(
              cell,
              Session.getScriptTimeZone(),
              'yyyy-MM-dd'
            );
          }
          return cell === null || cell === undefined ? '' : String(cell);
        });
      });

    Logger.log('[SUPERVISI] Loaded ' + rows.length + ' rows from Google Sheets: ' + fileName);

    return {
      success: true,
      data: {
        type:     'json',
        headers:  headers,
        rows:     rows,
        fileName: fileName,
        total:    rows.length
      }
    };

  } catch (e) {
    return { success: false, message: 'Gagal membaca Google Sheets: ' + e.toString() };
  }
}


// =====================================================================
// HELPER: Kembalikan file xlsx sebagai base64 (untuk SheetJS di frontend)
// =====================================================================
function readXlsxAsBase64(file) {
  try {
    var blob    = file.getBlob();
    var bytes   = blob.getBytes();
    var base64  = Utilities.base64Encode(bytes);

    // Cek ukuran – GAS response limit ~50MB
    var sizeMB = bytes.length / 1024 / 1024;
    Logger.log('[SUPERVISI] File size: ' + sizeMB.toFixed(2) + ' MB');

    if (sizeMB > 40) {
      return {
        success: false,
        message: 'File terlalu besar (' + sizeMB.toFixed(1) + ' MB). ' +
                 'Harap konversi ke Google Sheets terlebih dahulu atau kurangi ukuran file.'
      };
    }

    return {
      success: true,
      data: {
        type:     'base64',
        content:  base64,
        fileName: file.getName()
      }
    };

  } catch (e) {
    return { success: false, message: 'Gagal membaca file xlsx: ' + e.toString() };
  }
}


// =====================================================================
// ALTERNATIF: Konversi xlsx ke Google Sheets sementara, baca, lalu hapus
// Gunakan ini jika file xlsx dan file besar (butuh Drive Advanced Service)
// =====================================================================
//
// AKTIFKAN DRIVE ADVANCED SERVICE dulu:
//   Apps Script Editor → Services → Drive API → Enable
//
// function handleGetSupervisiDataWithConvert(payload) {
//   try {
//     var fileId  = payload.fileId;
//     var file    = DriveApp.getFileById(fileId);
//     var blob    = file.getBlob().setContentType(MimeType.GOOGLE_SHEETS);
//
//     // Buat file Google Sheets sementara dari xlsx
//     var tempFile = Drive.Files.insert(
//       { title: '_temp_' + fileId, mimeType: MimeType.GOOGLE_SHEETS },
//       blob,
//       { convert: true }
//     );
//
//     try {
//       var result = readGoogleSheet(tempFile.id, file.getName());
//       return result;
//     } finally {
//       // Hapus file sementara
//       DriveApp.getFileById(tempFile.id).setTrashed(true);
//     }
//   } catch(e) {
//     return { success: false, message: e.toString() };
//   }
// }


// =====================================================================
// CARA CEK AKSES USER DI doPost (tambahkan di awal switch)
// =====================================================================
//
// Jika sistem Anda memiliki pengecekan role di server side, tambahkan:
//
// case 'getSupervisiFiles':
// case 'getSupervisiData': {
//   // Cek role user (sesuaikan dengan sistem auth Anda)
//   var user = getUserFromSession(payload.sessionToken); // sesuaikan
//   if (!user || user.role !== 'Admin') {
//     return ContentService
//       .createTextOutput(JSON.stringify({ success: false, message: 'Akses ditolak' }))
//       .setMimeType(ContentService.MimeType.JSON);
//   }
//   // lanjutkan...
// }