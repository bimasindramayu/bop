// ===== GOOGLE APPS SCRIPT - BMN MODULE =====
// File: code-bmn.gs
// Deskripsi: Menangani semua operasi BMN (Barang Milik Negara)
// UPDATED: Removed all verification features

// ===== CONSTANTS =====
const BMN_SHEETS = {
  BMN_DATA: 'BMN_Data',
  BMN_RIWAYAT: 'BMN_Riwayat'
};

const BMN_DRIVE_FOLDER = '1JE_7ka6SnEovH6uql3OP0W1BNOV9dIGj';

// ===== MAIN ROUTER =====
function handleBMNAction(action, data) {
  Logger.log(`[BMN] Handling action: ${action}`);
  
  try {
    switch(action) {
      // BMN Stats & Data
      case 'getBMNStats': return getBMNStats(data);
      case 'getBMNData': return getBMNData(data);
      case 'saveBMN': return saveBMN(data);
      
      // Photo Management
      case 'uploadBMNPhoto': return uploadBMNPhoto(data);
      
      // History
      case 'getBMNRiwayat': return getBMNRiwayat(data);
      
      // Export
      case 'exportLaporanBMN': return exportLaporanBMN(data);
      
      default:
        Logger.log(`[BMN ERROR] Unknown action: ${action}`);
        return errorResponse('BMN action not found: ' + action);
    }
  } catch (error) {
    Logger.log(`[BMN ERROR] ${error.toString()}`);
    return errorResponse(error.toString());
  }
}

// ===== BMN STATS =====
function getBMNStats(data) {
  Logger.log('[GET_BMN_STATS] Getting stats for KUA: ' + (data.kua || 'ALL'));
  
  try {
    const sheet = getSheet(BMN_SHEETS.BMN_DATA);
    const values = sheet.getDataRange().getValues();
    
    let totalBarang = 0;
    let barangBaik = 0;
    let barangRusakRingan = 0;
    let barangRusakBerat = 0;
    let barangDigunakan = 0;
    let barangTidakDigunakan = 0;
    
    // Count by jenis
    const byJenis = {
      'Tanah': 0,
      'Gedung/Bangunan': 0,
      'Kendaraan': 0,
      'Peralatan & Mesin': 0,
      'Aset Lainnya': 0
    };
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      
      // Filter by KUA if specified
      if (data.kua && row[1] !== data.kua) continue;
      
      totalBarang++;
      
      // Kondisi
      if (row[8] === 'Baik') barangBaik++;
      else if (row[8] === 'Rusak Ringan') barangRusakRingan++;
      else if (row[8] === 'Rusak Berat') barangRusakBerat++;
      
      // Status penggunaan
      if (row[9] === 'Digunakan') barangDigunakan++;
      else if (row[9] === 'Tidak Digunakan') barangTidakDigunakan++;
      
      // By Jenis
      const jenis = row[4];
      if (byJenis.hasOwnProperty(jenis)) {
        byJenis[jenis]++;
      }
    }
    
    const stats = {
      totalBarang,
      barangBaik,
      barangRusakRingan,
      barangRusakBerat,
      barangDigunakan,
      barangTidakDigunakan,
      byJenis
    };
    
    Logger.log('[GET_BMN_STATS] Stats: ' + JSON.stringify(stats));
    return successResponse(stats);
  } catch (error) {
    Logger.log('[GET_BMN_STATS ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

// ===== BMN DATA MANAGEMENT =====
function getBMNData(data) {
  Logger.log('[GET_BMN_DATA] Getting data for KUA: ' + (data.kua || 'ALL'));
  
  try {
    const sheet = getSheet(BMN_SHEETS.BMN_DATA);
    const values = sheet.getDataRange().getValues();
    
    const bmnList = [];
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      
      // Filter by KUA if specified
      if (data.kua && row[1] !== data.kua) continue;
      
      bmnList.push({
        id: row[0],
        kua: row[1],
        kodeBarang: row[2],
        namaBarang: row[3],
        jenis: row[4],
        tahunPerolehan: row[5],
        sumberPerolehan: row[6],
        nilaiPerolehan: row[7],
        kondisi: row[8],
        status: row[9],
        lokasiBarang: row[10],
        idBMN: row[11],
        keterangan: row[12],
        fotos: JSON.parse(row[13] || '[]'),
        createdAt: row[14],
        updatedAt: row[15]
      });
    }
    
    Logger.log('[GET_BMN_DATA] Found: ' + bmnList.length);
    return successResponse(bmnList);
  } catch (error) {
    Logger.log('[GET_BMN_DATA ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

function saveBMN(data) {
  Logger.log('[SAVE_BMN] Saving BMN: ' + (data.id || 'NEW'));
  
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  
  try {
    const sheet = getSheet(BMN_SHEETS.BMN_DATA);
    const values = sheet.getDataRange().getValues();
    
    let rowIndex = -1;
    if (data.id) {
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] === data.id) {
          rowIndex = i + 1;
          break;
        }
      }
    }
    
    const bmnData = [
      data.id || generateID(),
      data.kua,
      data.kodeBarang,
      data.namaBarang,
      data.jenis,
      data.tahunPerolehan,
      data.sumberPerolehan,
      data.nilaiPerolehan,
      data.kondisi,
      data.status,
      data.lokasiBarang,
      data.idBMN || '',
      data.keterangan || '',
      JSON.stringify(data.fotos || []),
      data.id && rowIndex > 0 ? values[rowIndex - 1][14] : new Date(),
      new Date()
    ];
    
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, bmnData.length).setValues([bmnData]);
      Logger.log('[SAVE_BMN] Updated');
      
      logBMNRiwayat(
        data.kua,
        data.kodeBarang,
        data.namaBarang,
        'UPDATE_BMN',
        data.username
      );
    } else {
      sheet.appendRow(bmnData);
      Logger.log('[SAVE_BMN] Created');
      
      logBMNRiwayat(
        data.kua,
        data.kodeBarang,
        data.namaBarang,
        'CREATE_BMN',
        data.username
      );
    }
    
    return successResponse({ message: 'Data BMN berhasil disimpan', id: bmnData[0] });
  } catch (error) {
    Logger.log('[SAVE_BMN ERROR] ' + error.toString());
    return errorResponse(error.toString());
  } finally {
    lock.releaseLock();
  }
}

// ===== PHOTO UPLOAD =====
function uploadBMNPhoto(data) {
  Logger.log('[UPLOAD_BMN_PHOTO] Uploading photo');
  
  try {
    const folder = DriveApp.getFolderById(BMN_DRIVE_FOLDER);
    const blob = Utilities.newBlob(
      Utilities.base64Decode(data.fileData),
      data.mimeType,
      data.fileName
    );
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const photoUrl = file.getUrl();
    const photoId = file.getId();
    
    Logger.log('[UPLOAD_BMN_PHOTO] Success: ' + photoId);
    return successResponse({
      url: photoUrl,
      id: photoId,
      name: data.fileName
    });
  } catch (error) {
    Logger.log('[UPLOAD_BMN_PHOTO ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

// ===== RIWAYAT =====
function logBMNRiwayat(kua, kodeBarang, namaBarang, action, operator) {
  try {
    const sheet = getSheet(BMN_SHEETS.BMN_RIWAYAT);
    sheet.appendRow([
      generateID(),
      kua,
      kodeBarang,
      namaBarang,
      action,
      operator,
      new Date()
    ]);
    Logger.log('[BMN_RIWAYAT] Logged: ' + action);
  } catch (error) {
    Logger.log('[BMN_RIWAYAT ERROR] ' + error.toString());
  }
}

function getBMNRiwayat(data) {
  Logger.log('[GET_RIWAYAT] Getting riwayat');
  
  try {
    const sheet = getSheet(BMN_SHEETS.BMN_RIWAYAT);
    const values = sheet.getDataRange().getValues();
    
    const riwayatList = [];
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      
      // Filter by KUA
      if (data.kua && row[1] !== data.kua) continue;
      
      riwayatList.push({
        id: row[0],
        kua: row[1],
        kodeBarang: row[2],
        namaBarang: row[3],
        perubahan: row[4],
        operator: row[5],
        timestamp: row[6]
      });
    }
    
    // Sort by timestamp desc
    riwayatList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    Logger.log('[GET_RIWAYAT] Found: ' + riwayatList.length);
    return successResponse(riwayatList);
  } catch (error) {
    Logger.log('[GET_RIWAYAT ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

// ===== EXPORT LAPORAN BMN =====
function exportLaporanBMN(data) {
  Logger.log('[EXPORT_BMN] Type: ' + data.type + ', Format: ' + data.format);
  
  try {
    const sheet = getSheet(BMN_SHEETS.BMN_DATA);
    const values = sheet.getDataRange().getValues();
    
    // Filter data based on type
    let filteredData = [];
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      let include = true;
      
      if (data.type === 'perKUA' && data.kua && row[1] !== data.kua) include = false;
      if (data.type === 'perJenis' && data.jenis && row[4] !== data.jenis) include = false;
      if (data.type === 'perKondisi' && data.kondisi && row[8] !== data.kondisi) include = false;
      if (data.type === 'rusak' && row[8] !== 'Rusak Ringan' && row[8] !== 'Rusak Berat') include = false;
      
      if (include) {
        filteredData.push({
          kua: row[1],
          kodeBarang: row[2],
          namaBarang: row[3],
          jenis: row[4],
          tahunPerolehan: row[5],
          kondisi: row[8],
          status: row[9],
          lokasiBarang: row[10]
        });
      }
    }
    
    if (data.format === 'pdf') {
      return exportBMNPDF(filteredData, data);
    } else {
      return exportBMNExcel(filteredData, data);
    }
  } catch (error) {
    Logger.log('[EXPORT_BMN ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

function exportBMNExcel(data, params) {
  Logger.log('[EXPORT_BMN_EXCEL] Creating Excel');
  
  try {
    const rows = [];
    
    // Title
    rows.push([`LAPORAN BMN - ${params.type.toUpperCase()}`]);
    rows.push(['Kementerian Agama Kabupaten Indramayu']);
    rows.push([]);
    
    // Headers
    rows.push(['No', 'KUA', 'Kode', 'Nama Barang', 'Jenis', 'Tahun', 'Kondisi', 'Status', 'Lokasi']);
    
    // Data
    data.forEach((item, index) => {
      rows.push([
        index + 1,
        item.kua,
        item.kodeBarang,
        item.namaBarang,
        item.jenis,
        item.tahunPerolehan,
        item.kondisi,
        item.status,
        item.lokasiBarang
      ]);
    });
    
    const tsvContent = rows.map(row => row.map(cell => String(cell).replace(/\t/g, ' ')).join('\t')).join('\n');
    const blob = Utilities.newBlob(tsvContent, 'text/tab-separated-values', `Laporan_BMN_${params.type}.xls`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    
    return successResponse({
      fileData: base64,
      fileName: `Laporan_BMN_${params.type}.xls`,
      mimeType: 'application/vnd.ms-excel'
    });
  } catch (error) {
    Logger.log('[EXPORT_BMN_EXCEL ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

function exportBMNPDF(data, params) {
  Logger.log('[EXPORT_BMN_PDF] Creating PDF');
  
  try {
    let tableRows = '';
    
    data.forEach((item, index) => {
      tableRows += `
        <tr>
          <td style="padding: 6px; border: 1px solid #ddd;">${index + 1}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${item.kua}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${item.kodeBarang}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${item.namaBarang}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${item.jenis}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${item.kondisi}</td>
        </tr>
      `;
    });
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial; padding: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th { background: #28a745; color: white; padding: 8px; }
          td { padding: 6px; border: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>LAPORAN BMN - ${params.type.toUpperCase()}</h2>
          <h3>Kementerian Agama Kabupaten Indramayu</h3>
        </div>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>KUA</th>
              <th>Kode</th>
              <th>Nama Barang</th>
              <th>Jenis</th>
              <th>Kondisi</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
      </html>
    `;
    
    const blob = Utilities.newBlob(htmlContent, MimeType.HTML, 'temp.html');
    const pdfBlob = blob.getAs('application/pdf');
    pdfBlob.setName(`Laporan_BMN_${params.type}.pdf`);
    
    const base64 = Utilities.base64Encode(pdfBlob.getBytes());
    
    return successResponse({
      fileData: base64,
      fileName: pdfBlob.getName(),
      mimeType: 'application/pdf'
    });
  } catch (error) {
    Logger.log('[EXPORT_BMN_PDF ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

// ===== INITIALIZATION =====
function initializeBMNSheets() {
  const ss = SpreadsheetApp.openById(SS_ID);
  
  // BMN Data Sheet (16 columns - removed verification columns)
  let bmnSheet = ss.getSheetByName(BMN_SHEETS.BMN_DATA);
  if (!bmnSheet) {
    bmnSheet = ss.insertSheet(BMN_SHEETS.BMN_DATA);
    bmnSheet.appendRow([
      'ID', 'KUA', 'Kode Barang', 'Nama Barang', 'Jenis', 'Tahun Perolehan',
      'Sumber Perolehan', 'Nilai Perolehan', 'Kondisi', 'Status', 'Lokasi Barang',
      'ID BMN', 'Keterangan', 'Fotos (JSON)', 'Created At', 'Updated At'
    ]);
  }
  
  // Riwayat Sheet
  let riwayatSheet = ss.getSheetByName(BMN_SHEETS.BMN_RIWAYAT);
  if (!riwayatSheet) {
    riwayatSheet = ss.insertSheet(BMN_SHEETS.BMN_RIWAYAT);
    riwayatSheet.appendRow(['ID', 'KUA', 'Kode Barang', 'Nama Barang', 'Action', 'Operator', 'Timestamp']);
  }
  
  Logger.log('[BMN] Sheets initialized');
}

/*
 * =====================================================================
 * CATATAN UPDATE:
 * =====================================================================
 * 
 * 1. REMOVED ALL VERIFICATION FEATURES:
 *    - Removed getBMNVerifikasi()
 *    - Removed updateBMNVerifikasi()
 *    - Removed statusVerifikasi and catatanVerifikasi columns
 *    - BMN_Data now has 16 columns (was 18)
 * 
 * 2. SPREADSHEET STRUCTURE:
 *    BMN_Data: 16 columns (no verification)
 *    BMN_Riwayat: 7 columns
 * 
 * 3. ALL DATA IS CONSIDERED VALID:
 *    - No verification needed
 *    - Direct save to database
 *    - Simpler workflow
 * 
 * =====================================================================
 */