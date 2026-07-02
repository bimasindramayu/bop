// ===== GOOGLE APPS SCRIPT - BMN MODULE =====
// File: code-bmn.gs

const BMN_SHEETS = {
  BMN_DATA: 'BMN_Data'
};

const BMN_DRIVE_FOLDER = '1JE_7ka6SnEovH6uql3OP0W1BNOV9dIGj';

// ===== UTILITY =====
function generateID() {
  return 'BMN-' + Utilities.getUuid().replace(/-/g, '').substring(0, 16).toUpperCase();
}

// FIX #3: Cari atau buat subfolder berdasarkan nama
function getOrCreateSubfolder(parentFolder, name) {
  var folders = parentFolder.getFoldersByName(name);
  return folders.hasNext() ? folders.next() : parentFolder.createFolder(name);
}

// ===== MAIN ROUTER =====
function handleBMNAction(action, data) {
  Logger.log('[BMN] Action: ' + action);
  try {
    switch (action) {
      case 'getBMNStats':    return getBMNStats(data);
      case 'getBMNData':     return getBMNData(data);
      case 'saveBMN':        return saveBMN(data);
      case 'uploadBMNPhoto': return uploadBMNPhoto(data);
      case 'exportLaporanBMN': return exportLaporanBMN(data);
      case 'getBMNConfig':   return getBMNConfig();
      case 'getBMNSettings': return getBMNSettings();
      case 'saveBMNSetting': return saveBMNSetting(data);
      default:
        return errorResponse('BMN action not found: ' + action);
    }
  } catch (error) {
    Logger.log('[BMN ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

// ===== CONFIG — kembalikan DRIVE_API_KEY dari sheet Config =====
function getBMNConfig() {
  try {
    var ss     = SpreadsheetApp.openById(SS_ID);
    var sheet  = ss.getSheetByName('Config');
    if (!sheet) return successResponse({ driveApiKey: '' });

    var values = sheet.getDataRange().getValues();
    var cfg    = {};
    for (var i = 0; i < values.length; i++) {
      var key = String(values[i][0]).trim();
      var val = String(values[i][1]).trim();
      if (key === 'DRIVE_API_KEY') cfg.driveApiKey = val;
    }
    return successResponse(cfg);
  } catch (e) {
    Logger.log('[BMN_CONFIG ERROR] ' + e.toString());
    return successResponse({ driveApiKey: '' });
  }
}

// ===== SETTINGS — baca hak akses Operator KUA (single config) =====
function getBMNSettings() {
  try {
    var ss    = SpreadsheetApp.openById(SS_ID);
    var sheet = ss.getSheetByName('Config');
    if (!sheet) return successResponse({ allowDataEntry: true });

    var values  = sheet.getDataRange().getValues();
    var allowed = true; // default: izinkan
    for (var i = 0; i < values.length; i++) {
      var k = String(values[i][0]).trim();
      var v = String(values[i][1]).trim();
      if (k === 'BMN_ALLOW_DATA_ENTRY') {
        allowed = (v !== 'false' && v !== 'FALSE' && v !== '0');
        break;
      }
    }
    Logger.log('[BMN_SETTINGS] allowDataEntry=' + allowed);
    return successResponse({ allowDataEntry: allowed });
  } catch (e) {
    Logger.log('[BMN_SETTINGS ERROR] ' + e.toString());
    return successResponse({ allowDataEntry: true }); // fallback aman
  }
}

// Helper internal — dipakai oleh saveBMN & uploadBMNPhoto untuk guard BE
function isBMNDataEntryAllowed_() {
  try {
    var ss    = SpreadsheetApp.openById(SS_ID);
    var sheet = ss.getSheetByName('Config');
    if (!sheet) return true;
    var values = sheet.getDataRange().getValues();
    for (var i = 0; i < values.length; i++) {
      if (String(values[i][0]).trim() === 'BMN_ALLOW_DATA_ENTRY') {
        var v = String(values[i][1]).trim();
        return (v !== 'false' && v !== 'FALSE' && v !== '0');
      }
    }
    return true; // key belum ada → izinkan
  } catch (e) {
    return true; // error → fail-open (bisa diubah fail-close jika ingin lebih ketat)
  }
}

// Helper internal — cek apakah username adalah Admin berdasarkan sheet Users
function isAdminUser_(username) {
  if (!username) return false;
  try {
    var ss    = SpreadsheetApp.openById(SS_ID);
    var sheet = ss.getSheetByName('Users');
    if (!sheet) return false;
    var values = sheet.getDataRange().getValues();
    for (var i = 1; i < values.length; i++) {
      // kolom Users: [ID, Username, Password, Name, Role, KUA, Created, Updated]
      if (String(values[i][1]).trim() === username.trim()) {
        return String(values[i][4]).trim() === 'Admin';
      }
    }
    return false; // username tidak ditemukan
  } catch (e) {
    Logger.log('[IS_ADMIN_USER ERROR] ' + e.toString());
    return false; // error → fail-closed (ketat: tolak jika tidak bisa verifikasi)
  }
}

// ===== SETTINGS — simpan config allowDataEntry =====
function saveBMNSetting(data) {
  Logger.log('[SAVE_BMN_SETTING] key=' + data.key + ' value=' + data.value + ' by=' + (data.username || '?'));

  // ── Guard BE: verifikasi bahwa pemanggil adalah Admin (cek ke sheet Users) ──
  if (!isAdminUser_(data.username)) {
    Logger.log('[SAVE_BMN_SETTING BLOCKED] Bukan Admin: ' + (data.username || 'unknown'));
    return errorResponse('Akses ditolak. Hanya Admin yang dapat mengubah konfigurasi ini.');
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var ss    = SpreadsheetApp.openById(SS_ID);
    var sheet = ss.getSheetByName('Config');
    if (!sheet) {
      sheet = ss.insertSheet('Config');
      sheet.appendRow(['Key', 'Value', 'Keterangan', 'Updated By', 'Updated At']);
    }

    // Saat ini hanya mendukung satu key
    if (data.key !== 'allowDataEntry') {
      return errorResponse('Unknown setting key: ' + data.key);
    }
    var configKey = 'BMN_ALLOW_DATA_ENTRY';
    var newVal    = (data.value === true || data.value === 'true') ? 'true' : 'false';

    var values   = sheet.getDataRange().getValues();
    var rowIndex = -1;
    for (var i = 0; i < values.length; i++) {
      if (String(values[i][0]).trim() === configKey) { rowIndex = i + 1; break; }
    }

    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 2).setValue(newVal);
      sheet.getRange(rowIndex, 4).setValue(data.username || '');
      sheet.getRange(rowIndex, 5).setValue(new Date());
    } else {
      sheet.appendRow([configKey, newVal, 'Hak akses Input Data BMN bagi Operator KUA', data.username || '', new Date()]);
    }
    Logger.log('[SAVE_BMN_SETTING] ' + configKey + ' = ' + newVal + ' oleh ' + (data.username || '?'));
    return successResponse({ key: data.key, value: newVal });
  } catch (e) {
    Logger.log('[SAVE_BMN_SETTING ERROR] ' + e.toString());
    return errorResponse(e.toString());
  } finally {
    lock.releaseLock();
  }
}

// ===== STATS =====
function getBMNStats(data) {
  Logger.log('[GET_BMN_STATS] KUA: ' + (data.kua || 'ALL'));
  try {
    var sheet  = getSheet(BMN_SHEETS.BMN_DATA);
    var values = sheet.getDataRange().getValues();

    var totalBarang = 0, barangBaik = 0, barangRusakRingan = 0,
        barangRusakBerat = 0, barangDigunakan = 0, barangTidakDigunakan = 0;
    var byJenis = { 'Tanah':0,'Gedung/Bangunan':0,'Kendaraan':0,'Peralatan & Mesin':0,'Aset Lainnya':0 };

    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (data.kua && row[1] !== data.kua) continue;
      totalBarang++;
      if      (row[8] === 'Baik')         barangBaik++;
      else if (row[8] === 'Rusak Ringan') barangRusakRingan++;
      else if (row[8] === 'Rusak Berat')  barangRusakBerat++;
      if      (row[9] === 'Digunakan')       barangDigunakan++;
      else if (row[9] === 'Tidak Digunakan') barangTidakDigunakan++;
      if (byJenis.hasOwnProperty(row[4])) byJenis[row[4]]++;
    }
    return successResponse({
      totalBarang, barangBaik, barangRusakRingan,
      barangRusakBerat, barangDigunakan, barangTidakDigunakan, byJenis
    });
  } catch (e) { return errorResponse(e.toString()); }
}

// ===== DATA =====
function getBMNData(data) {
  Logger.log('[GET_BMN_DATA] KUA: ' + (data.kua || 'ALL'));
  try {
    var sheet  = getSheet(BMN_SHEETS.BMN_DATA);
    var values = sheet.getDataRange().getValues();
    var list   = [];
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      if (data.kua && row[1] !== data.kua) continue;
      list.push({
        id: row[0], kua: row[1], kodeBarang: row[2], namaBarang: row[3],
        jenis: row[4], tahunPerolehan: row[5], sumberPerolehan: row[6],
        nilaiPerolehan: row[7], kondisi: row[8], status: row[9],
        lokasiBarang: row[10], idBMN: row[11], keterangan: row[12],
        fotos: JSON.parse(row[13] || '[]'),
        createdAt: row[14], updatedAt: row[15]
      });
    }
    Logger.log('[GET_BMN_DATA] Found: ' + list.length);
    return successResponse(list);
  } catch (e) { return errorResponse(e.toString()); }
}

// ===== SAVE =====
function saveBMN(data) {
  Logger.log('[SAVE_BMN] ID: ' + (data.id || 'NEW') + ' KUA: ' + (data.kua || 'Admin'));

  // ── Guard BE: jika request dari Operator KUA (ada data.kua), cek config ──
  if (data.kua) {
    if (!isBMNDataEntryAllowed_()) {
      Logger.log('[SAVE_BMN BLOCKED] Input Data BMN sedang ditutup oleh Admin.');
      return errorResponse('Akses Input Data BMN sedang ditutup oleh Admin. Silakan hubungi Admin Kemenag.');
    }
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var sheet  = getSheet(BMN_SHEETS.BMN_DATA);
    var values = sheet.getDataRange().getValues();
    var rowIndex = -1;
    if (data.id) {
      for (var i = 1; i < values.length; i++) {
        if (values[i][0] === data.id) { rowIndex = i + 1; break; }
      }
    }
    var id = data.id || generateID();
    var bmnData = [
      id, data.kua||'', data.kodeBarang||'', data.namaBarang||'', data.jenis||'',
      data.tahunPerolehan||'', data.sumberPerolehan||'', data.nilaiPerolehan||'',
      data.kondisi||'', data.status||'', data.lokasiBarang||'',
      data.idBMN||'', data.keterangan||'',
      JSON.stringify(data.fotos || []),
      rowIndex > 0 ? values[rowIndex-1][14] : new Date(),
      new Date()
    ];
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, bmnData.length).setValues([bmnData]);
    } else {
      sheet.appendRow(bmnData);
    }
    return successResponse({ message: 'Data BMN berhasil disimpan', id: id });
  } catch (e) {
    Logger.log('[SAVE_BMN ERROR] ' + e.toString());
    return errorResponse(e.toString());
  } finally {
    lock.releaseLock();
  }
}

// ===== PHOTO UPLOAD — subfolder KUA / kode barang =====
function uploadBMNPhoto(data) {
  Logger.log('[UPLOAD_BMN_PHOTO] File: ' + data.fileName + ' KUA: ' + data.kua + ' Kode: ' + data.kodeBarang);

  // ── Guard BE: sama dengan saveBMN ──
  if (data.kua) {
    if (!isBMNDataEntryAllowed_()) {
      Logger.log('[UPLOAD_BMN_PHOTO BLOCKED] Input Data BMN sedang ditutup oleh Admin.');
      return errorResponse('Akses Input Data BMN sedang ditutup oleh Admin. Upload foto tidak diizinkan.');
    }
  }

  try {
    var rootFolder  = DriveApp.getFolderById(BMN_DRIVE_FOLDER);

    // FIX #3: Struktur folder → root / KUA / kode barang
    var kuaFolder   = getOrCreateSubfolder(rootFolder,  data.kua        || 'Unknown KUA');
    var kodeFolder  = getOrCreateSubfolder(kuaFolder,   data.kodeBarang || 'Unknown');

    var blob = Utilities.newBlob(
      Utilities.base64Decode(data.fileData),
      data.mimeType,
      data.fileName
    );
    var file = kodeFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    Logger.log('[UPLOAD_BMN_PHOTO] Saved to: ' + kuaFolder.getName() + '/' + kodeFolder.getName() + '/' + data.fileName);
    return successResponse({
      fileId:   file.getId(),
      fileUrl:  file.getUrl(),
      fileName: data.fileName
    });
  } catch (e) {
    Logger.log('[UPLOAD_BMN_PHOTO ERROR] ' + e.toString());
    return errorResponse(e.toString());
  }
}

// ===== EXPORT LAPORAN =====
function exportLaporanBMN(data) {
  Logger.log('[EXPORT_BMN] type=' + data.type + ' format=' + data.format);
  try {
    var rows  = [];
    var label = data.label || 'Data BMN';

    // ── TIPE 1: 'filtered' — filter param dikirim dari frontend, GAS query dari sheet ──
    // Ini adalah pendekatan yang BENAR dan AMAN.
    // Tidak ada array besar yang lewat HTTP, tidak ada risiko payload/Logger overflow.
    if (data.type === 'filtered') {
      var f      = data.filters || {};
      var sheet  = getSheet(BMN_SHEETS.BMN_DATA);
      var values = sheet.getDataRange().getValues();

      for (var i = 1; i < values.length; i++) {
        var row = values[i];
        if (!row[0]) continue;  // skip baris kosong
        var ok = true;

        // Filter KUA — wajib jika ada (termasuk user non-Admin yang kuanya diset di frontend)
        if (f.kua     && String(row[1]).trim() !== f.kua)     ok = false;
        // Filter Jenis
        if (f.jenis   && String(row[4]).trim() !== f.jenis)   ok = false;
        // Filter Kondisi
        if (f.kondisi && String(row[8]).trim() !== f.kondisi) ok = false;
        // Filter Status
        if (f.status  && String(row[9]).trim() !== f.status)  ok = false;
        // Free-text search (kode barang atau nama barang)
        if (f.search) {
          var srch  = f.search.toLowerCase();
          var kodeM = String(row[2]).toLowerCase().indexOf(srch) >= 0;
          var namaM = String(row[3]).toLowerCase().indexOf(srch) >= 0;
          if (!kodeM && !namaM) ok = false;
        }

        if (!ok) continue;
        rows.push({ kua:row[1], kodeBarang:row[2], namaBarang:row[3], jenis:row[4],
                    tahunPerolehan:row[5], kondisi:row[8], status:row[9], lokasiBarang:row[10] });
      }
      Logger.log('[EXPORT_BMN] filtered rows: ' + rows.length + ' from ' + (values.length - 1) + ' total');

    // ── TIPE 2: 'customData' — data array dikirim dari frontend (legacy / fallback) ──
    // Masih didukung untuk backward compat, TAPI dipastikan ada safeguard.
    } else if (data.type === 'customData') {
      if (!Array.isArray(data.customData) || data.customData.length === 0) {
        Logger.log('[EXPORT_BMN] WARNING: customData kosong atau bukan array — abort');
        return errorResponse('Tidak ada data untuk diexport. Gunakan type "filtered".');
      }
      rows = data.customData.map(function(item) {
        return { kua:         item.kua         || '',
                 kodeBarang:  item.kodeBarang  || '',
                 namaBarang:  item.namaBarang  || '',
                 jenis:       item.jenis        || '',
                 tahunPerolehan: item.tahunPerolehan || '',
                 kondisi:     item.kondisi      || '',
                 status:      item.status       || '',
                 lokasiBarang:item.lokasiBarang || '' };
      });
      Logger.log('[EXPORT_BMN] customData rows: ' + rows.length);

    // ── TIPE LAMA: perKUA / perJenis / rusak (dari fitur export sebelumnya) ──
    } else {
      var sheet2  = getSheet(BMN_SHEETS.BMN_DATA);
      var values2 = sheet2.getDataRange().getValues();
      for (var j = 1; j < values2.length; j++) {
        var row2 = values2[j]; var ok2 = true;
        if (data.type === 'perKUA'   && data.kua   && row2[1] !== data.kua)   ok2 = false;
        if (data.type === 'perJenis' && data.jenis  && row2[4] !== data.jenis) ok2 = false;
        if (data.type === 'rusak' && row2[8] !== 'Rusak Ringan' && row2[8] !== 'Rusak Berat') ok2 = false;
        if (!ok2) continue;
        rows.push({ kua:row2[1], kodeBarang:row2[2], namaBarang:row2[3], jenis:row2[4],
                    tahunPerolehan:row2[5], kondisi:row2[8], status:row2[9], lokasiBarang:row2[10] });
      }
      label = data.kuaLabel || (data.kua ? data.kua : 'Semua KUA');
      if (data.type === 'perJenis') label = data.jenis || 'Semua Jenis';
      if (data.type === 'rusak')    label = 'Barang Rusak';
    }

    return data.format === 'pdf' ? exportBMNPDF(rows, data, label) : exportBMNExcel(rows, data, label);
  } catch (e) {
    Logger.log('[EXPORT_BMN ERROR] ' + e.toString());
    return errorResponse(e.toString());
  }
}

function exportBMNExcel(data, params, label) {
  try {
    var title = 'LAPORAN BMN — ' + (label || params.type.toUpperCase());
    var allRows = [
      [title],
      ['Kementerian Agama Kabupaten Indramayu'], [],
      ['No','KUA','Kode Barang','Nama Barang','Jenis','Tahun','Kondisi','Status','Lokasi']
    ];
    data.forEach(function(item,i) {
      allRows.push([i+1,item.kua,item.kodeBarang,item.namaBarang,item.jenis,
                    item.tahunPerolehan,item.kondisi,item.status,item.lokasiBarang]);
    });
    var tsv = allRows.map(function(r) {
      return r.map(function(c) { return String(c).replace(/\t/g,' '); }).join('\t');
    }).join('\n');
    var safeName = (label || params.type).replace(/[^a-zA-Z0-9_]/g, '_');
    return successResponse({
      fileData: Utilities.base64Encode(Utilities.newBlob(tsv,'text/tab-separated-values').getBytes()),
      fileName: 'Laporan_BMN_' + safeName + '.xls',
      mimeType: 'application/vnd.ms-excel'
    });
  } catch (e) { return errorResponse(e.toString()); }
}

function exportBMNPDF(data, params, label) {
  try {
    var title = 'LAPORAN BMN — ' + (label || params.type.toUpperCase());
    var rows = data.map(function(item,i) {
      return '<tr><td>'+(i+1)+'</td><td>'+item.kua+'</td><td>'+item.kodeBarang+'</td>'+
             '<td>'+item.namaBarang+'</td><td>'+item.jenis+'</td>'+
             '<td>'+item.kondisi+'</td><td>'+item.status+'</td></tr>';
    }).join('');
    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'+
      '<style>body{font-family:Arial;padding:20px}h2,h3{text-align:center;margin:4px 0}'+
      'table{width:100%;border-collapse:collapse;font-size:10px;margin-top:16px}'+
      'th{background:#28a745;color:white;padding:7px;text-align:left}'+
      'td{padding:5px 7px;border:1px solid #ddd}'+
      'tr:nth-child(even) td{background:#f9f9f9}</style></head><body>'+
      '<h2>'+title+'</h2>'+
      '<h3>Kementerian Agama Kabupaten Indramayu</h3>'+
      '<table><thead><tr><th>No</th><th>KUA</th><th>Kode</th><th>Nama Barang</th>'+
      '<th>Jenis</th><th>Kondisi</th><th>Status</th></tr></thead><tbody>'+rows+'</tbody></table></body></html>';
    var pdfBlob = Utilities.newBlob(html, MimeType.HTML, 'tmp.html').getAs('application/pdf');
    var safeName = (label || params.type).replace(/[^a-zA-Z0-9_]/g, '_');
    pdfBlob.setName('Laporan_BMN_' + safeName + '.pdf');
    return successResponse({
      fileData: Utilities.base64Encode(pdfBlob.getBytes()),
      fileName: pdfBlob.getName(), mimeType: 'application/pdf'
    });
  } catch (e) { return errorResponse(e.toString()); }
}

// ===== INIT SHEET =====
function initializeBMNSheets() {
  var ss    = SpreadsheetApp.openById(SS_ID);
  var sheet = ss.getSheetByName(BMN_SHEETS.BMN_DATA);
  if (!sheet) {
    sheet = ss.insertSheet(BMN_SHEETS.BMN_DATA);
    sheet.appendRow([
      'ID','KUA','Kode Barang','Nama Barang','Jenis','Tahun Perolehan',
      'Sumber Perolehan','Nilai Perolehan','Kondisi','Status','Lokasi Barang',
      'ID BMN','Keterangan','Fotos (JSON)','Created At','Updated At'
    ]);
  }
  Logger.log('[BMN] Sheet initialized');
}