// ===== GOOGLE APPS SCRIPT - NIKAH MODULE =====
// File: code-nikah.gs
// Deskripsi: Handler untuk data pernikahan KUA

// ===== NIKAH ACTIONS HANDLER =====
function handleNikahAction(action, data) {
  Logger.log(`[NIKAH] Action: ${action}`);
  
  try {
    switch(action) {
      case 'getNikahStats':
        return getNikahStats(data);
      case 'getNikahData':
        return getNikahData(data);
      case 'saveNikahData':
        return saveNikahData(data);
      case 'getNikahMonthStatus':
        return getNikahMonthStatus(data);
      case 'toggleNikahMonthStatus':
        return toggleNikahMonthStatus(data);
      case 'getKUAInfo':
        return getKUAInfo(data);
      case 'updateKUAInfo':
        return updateKUAInfo(data);
      case 'getAllKUAInfo':
        return getAllKUAInfo(data);
      case 'exportNikahExcel':
        return exportNikahExcel(data);
      case 'cleanupExportFile':
        return cleanupExportFile(data);
      case 'exportNikahPDF':
        return exportNikahPDF(data);
      default:
        return errorResponse('Action tidak dikenal: ' + action);
    }
  } catch (error) {
    Logger.log(`[NIKAH ERROR] ${error.toString()}`);
    return errorResponse(error.toString());
  }
}

// ===== GET STATS =====
function getNikahStats(data) {
  Logger.log('[NIKAH STATS] Getting statistics');
  
  try {
    const sheet = getSheet('Nikah_Data');
    const values = sheet.getDataRange().getValues();
    const year = data.year || new Date().getFullYear();
    const filterMonth = data.month ? parseInt(data.month) : null; // null = semua bulan
    
    const stats = {
      totalKantor: 0,
      totalLuarKantor: 0,
      totalItsbat: 0,
      totalCampuran: {
        lakiLaki: 0,
        wanita: 0
      },
      totalRujuk: 0,
      totalItsbatNikah: 0,
      byKUA: {},
      byMonth: {}
    };
    
    // Initialize months
    for (let m = 1; m <= 12; m++) {
      stats.byMonth[m] = {
        kantor: 0,
        luarKantor: 0,
        itsbat: 0
      };
    }
    
    // Process data
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowYear = row[3]; // Year column
      const month = row[2]; // Month column
      const kua = row[1]; // KUA column
      
      if (rowYear != year) continue;
      if (filterMonth !== null && month != filterMonth) continue; // filter bulan
      
      // Parse data JSON
      const nikahData = typeof row[4] === 'string' ? JSON.parse(row[4]) : row[4];
      
      stats.totalKantor += nikahData.kantor || 0;
      stats.totalLuarKantor += nikahData.luarKantor || 0;
      stats.totalItsbat += nikahData.itsbat || 0;
      stats.totalCampuran.lakiLaki += nikahData.campuranLaki || 0;
      stats.totalCampuran.wanita += nikahData.campuranWanita || 0;
      stats.totalRujuk += nikahData.rujuk || 0;
      stats.totalItsbatNikah += nikahData.itsbatNikah || 0;
      
      // By month
      if (stats.byMonth[month]) {
        stats.byMonth[month].kantor += nikahData.kantor || 0;
        stats.byMonth[month].luarKantor += nikahData.luarKantor || 0;
        stats.byMonth[month].itsbat += nikahData.itsbat || 0;
      }
      
      // By KUA — aggregasi semua field
      if (!stats.byKUA[kua]) {
        stats.byKUA[kua] = getEmptyNikahData();
      }
      for (let key in nikahData) {
        stats.byKUA[kua][key] = (stats.byKUA[kua][key] || 0) + (nikahData[key] || 0);
      }
    }
    
    stats.totalPeristiwa = stats.totalKantor + stats.totalLuarKantor + stats.totalItsbat;
    
    Logger.log('[NIKAH STATS] Success');
    return successResponse(stats);
  } catch (error) {
    Logger.log('[NIKAH STATS ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

// ===== GET NIKAH DATA =====
function getNikahData(data) {
  Logger.log('[GET NIKAH DATA] KUA: ' + data.kua + ', Month: ' + data.month + ', Year: ' + data.year);
  
  try {
    const sheet = getSheet('Nikah_Data');
    const values = sheet.getDataRange().getValues();
    
    // Find existing data
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[1] === data.kua && row[2] == data.month && row[3] == data.year) {
        const nikahData = typeof row[4] === 'string' ? JSON.parse(row[4]) : row[4];
        
        return successResponse({
          id: row[0],
          kua: row[1],
          month: row[2],
          year: row[3],
          data: nikahData,
          updatedAt: row[5],
          updatedBy: row[6]
        });
      }
    }
    
    // Return empty data if not found
    return successResponse({
      id: null,
      kua: data.kua,
      month: data.month,
      year: data.year,
      data: getEmptyNikahData(),
      updatedAt: null,
      updatedBy: null
    });
  } catch (error) {
    Logger.log('[GET NIKAH DATA ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

// ===== SAVE NIKAH DATA =====
function saveNikahData(data) {
  Logger.log('[SAVE NIKAH DATA] KUA: ' + data.kua + ', Month: ' + data.month + ', Year: ' + data.year);
  
  try {
    const sheet = getSheet('Nikah_Data');
    const values = sheet.getDataRange().getValues();
    
    // Check if month is locked
    const status = getMonthStatus(data.year, data.month);
    if (status === 'locked' && data.userRole !== 'Admin') {
      return errorResponse('Bulan ini sudah dikunci. Hubungi Admin untuk membuka.');
    }
    
    const nikahDataJson = JSON.stringify(data.nikahData);
    const timestamp = new Date();
    
    // Find and update existing data
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[1] === data.kua && row[2] == data.month && row[3] == data.year) {
        sheet.getRange(i + 1, 5, 1, 3).setValues([[
          nikahDataJson,
          timestamp,
          data.userId
        ]]);
        
        logAction(data.userId, data.username, data.userRole, 'UPDATE_NIKAH_DATA', {
          kua: data.kua,
          month: data.month,
          year: data.year
        });
        
        Logger.log('[SAVE NIKAH DATA] Updated');
        return successResponse({ message: 'Data berhasil disimpan' });
      }
    }
    
    // Create new record
    const newRow = [
      generateID(),
      data.kua,
      data.month,
      data.year,
      nikahDataJson,
      timestamp,
      data.userId
    ];
    sheet.appendRow(newRow);
    
    logAction(data.userId, data.username, data.userRole, 'CREATE_NIKAH_DATA', {
      kua: data.kua,
      month: data.month,
      year: data.year
    });
    
    Logger.log('[SAVE NIKAH DATA] Created');
    return successResponse({ message: 'Data berhasil disimpan' });
  } catch (error) {
    Logger.log('[SAVE NIKAH DATA ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

// ===== MONTH STATUS MANAGEMENT =====
function getNikahMonthStatus(data) {
  Logger.log('[GET MONTH STATUS] Year: ' + data.year);
  
  try {
    const sheet = getSheet('Nikah_MonthStatus');
    const values = sheet.getDataRange().getValues();
    const year = data.year || new Date().getFullYear();
    
    const statuses = {};
    
    // Find year row
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[0] == year) {
        for (let m = 1; m <= 12; m++) {
          statuses[m] = row[m] || 'open';
        }
        return successResponse(statuses);
      }
    }
    
    // Default all months to open
    for (let m = 1; m <= 12; m++) {
      statuses[m] = 'open';
    }
    
    return successResponse(statuses);
  } catch (error) {
    Logger.log('[GET MONTH STATUS ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

function toggleNikahMonthStatus(data) {
  Logger.log('[TOGGLE MONTH STATUS] Year: ' + data.year + ', Month: ' + data.month);
  
  try {
    if (data.userRole !== 'Admin') {
      return errorResponse('Hanya Admin yang dapat mengubah status bulan');
    }
    
    const sheet = getSheet('Nikah_MonthStatus');
    const values = sheet.getDataRange().getValues();
    const year = data.year;
    const month = data.month;
    
    // Find year row
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[0] == year) {
        const currentStatus = row[month] || 'open';
        const newStatus = currentStatus === 'open' ? 'locked' : 'open';
        
        sheet.getRange(i + 1, month + 1).setValue(newStatus);
        
        logAction(data.userId, data.username, data.userRole, 'TOGGLE_MONTH_STATUS', {
          year: year,
          month: month,
          status: newStatus
        });
        
        Logger.log('[TOGGLE MONTH STATUS] Success: ' + newStatus);
        return successResponse({ status: newStatus });
      }
    }
    
    // Create new year row
    const newRow = [year];
    for (let m = 1; m <= 12; m++) {
      newRow.push(m === month ? 'locked' : 'open');
    }
    sheet.appendRow(newRow);
    
    logAction(data.userId, data.username, data.userRole, 'TOGGLE_MONTH_STATUS', {
      year: year,
      month: month,
      status: 'locked'
    });
    
    return successResponse({ status: 'locked' });
  } catch (error) {
    Logger.log('[TOGGLE MONTH STATUS ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

// ===== HELPER: GET MONTH STATUS =====
function getMonthStatus(year, month) {
  try {
    const sheet = getSheet('Nikah_MonthStatus');
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[0] == year) {
        return row[month] || 'open';
      }
    }
    
    return 'open';
  } catch (error) {
    return 'open';
  }
}

// ===== KUA INFO MANAGEMENT =====
function getKUAInfo(data) {
  Logger.log('[GET KUA INFO] KUA: ' + data.kua);
  
  try {
    const sheet = getSheet('Nikah_KUAInfo');
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[0] === data.kua) {
        return successResponse({
          kua: row[0],
          kepalaKUA: row[1],
          nip: row[2],
          updatedAt: row[3]
        });
      }
    }
    
    // Return empty if not found
    return successResponse({
      kua: data.kua,
      kepalaKUA: '',
      nip: '',
      updatedAt: null
    });
  } catch (error) {
    Logger.log('[GET KUA INFO ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

function updateKUAInfo(data) {
  Logger.log('[UPDATE KUA INFO] KUA: ' + data.kua);
  
  try {
    if (data.userRole !== 'Admin') {
      return errorResponse('Hanya Admin yang dapat mengubah info KUA');
    }
    
    const sheet = getSheet('Nikah_KUAInfo');
    const values = sheet.getDataRange().getValues();
    const timestamp = new Date();
    
    // Find and update existing
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[0] === data.kua) {
        sheet.getRange(i + 1, 2, 1, 3).setValues([[
          data.kepalaKUA,
          data.nip,
          timestamp
        ]]);
        
        logAction(data.userId, data.username, data.userRole, 'UPDATE_KUA_INFO', {
          kua: data.kua
        });
        
        Logger.log('[UPDATE KUA INFO] Updated');
        return successResponse({ message: 'Info KUA berhasil diupdate' });
      }
    }
    
    // Create new
    sheet.appendRow([
      data.kua,
      data.kepalaKUA,
      data.nip,
      timestamp
    ]);
    
    logAction(data.userId, data.username, data.userRole, 'UPDATE_KUA_INFO', {
      kua: data.kua
    });
    
    Logger.log('[UPDATE KUA INFO] Created');
    return successResponse({ message: 'Info KUA berhasil disimpan' });
  } catch (error) {
    Logger.log('[UPDATE KUA INFO ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

function getAllKUAInfo(data) {
  Logger.log('[GET ALL KUA INFO]');
  
  try {
    const sheet = getSheet('Nikah_KUAInfo');
    const values = sheet.getDataRange().getValues();
    const kuaInfoList = [];
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      kuaInfoList.push({
        kua: row[0],
        kepalaKUA: row[1],
        nip: row[2],
        updatedAt: row[3]
      });
    }
    
    Logger.log('[GET ALL KUA INFO] Found: ' + kuaInfoList.length);
    return successResponse(kuaInfoList);
  } catch (error) {
    Logger.log('[GET ALL KUA INFO ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

// ===== HELPER: EMPTY DATA STRUCTURE =====
function getEmptyNikahData() {
  return {
    kantor: 0,
    luarKantor: 0,
    itsbat: 0,
    campuranLaki: 0,
    campuranWanita: 0,
    rujuk: 0,
    itsbatNikah: 0,
    usiaPengantinLakiU19: 0,
    usiaPengantinLaki1921: 0,
    usiaPengantinLaki21Plus: 0,
    usiaPengantinWanitaU19: 0,
    usiaPengantinWanita1921: 0,
    usiaPengantinWanita21Plus: 0,
    pendidikanLakiSD: 0,
    pendidikanLakiSLTP: 0,
    pendidikanLakiSLTA: 0,
    pendidikanLakiD1D2: 0,
    pendidikanLakiD3: 0,
    pendidikanLakiS1: 0,
    pendidikanLakiS2: 0,
    pendidikanLakiS3: 0,
    pendidikanWanitaSD: 0,
    pendidikanWanitaSLTP: 0,
    pendidikanWanitaSLTA: 0,
    pendidikanWanitaD1D2: 0,
    pendidikanWanitaD3: 0,
    pendidikanWanitaS1: 0,
    pendidikanWanitaS2: 0,
    pendidikanWanitaS3: 0
  };
}

// ===== EXPORT EXCEL =====
function exportNikahExcel(data) {
  Logger.log('[EXPORT NIKAH EXCEL] Type: ' + data.exportType + ', Year: ' + data.year);
  
  try {
    const ss = SpreadsheetApp.create('Export Nikah ' + new Date().getTime());
    const sheet = ss.getActiveSheet();
    
    if (data.exportType === 'monthly') {
      return exportNikahMonthly(sheet, data);
    } else if (data.exportType === 'yearly') {
      return exportNikahYearly(sheet, data);
    }
    
    return errorResponse('Tipe export tidak valid');
  } catch (error) {
    Logger.log('[EXPORT NIKAH EXCEL ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

function exportNikahMonthly(sheet, data) {
  const dataSheet = getSheet('Nikah_Data');
  const kuaInfoSheet = getSheet('Nikah_KUAInfo');
  
  // Get KUA info
  const kuaInfoValues = kuaInfoSheet.getDataRange().getValues();
  const kuaInfoMap = {};
  for (let i = 1; i < kuaInfoValues.length; i++) {
    kuaInfoMap[kuaInfoValues[i][0]] = {
      kepalaKUA: kuaInfoValues[i][1],
      nip: kuaInfoValues[i][2]
    };
  }
  
  // Build headers
  const monthName = getMonthName(data.month);
  sheet.appendRow(['DAFTAR PERISTIWA NIKAH ' + data.year]);
  sheet.appendRow(['BULAN : ' + monthName]);
  sheet.appendRow(['']);  // spacer row
  
  const headers = [
    'NO', 'Nama KUA', 'KEPALA KUA',
    'KANTOR', 'LUAR KANTOR', 'ITSBAT',
    'LAKI-LAKI', 'WANITA',
    'JUMLAH RUJUK', 'JUMLAH ITSBAT',
    '<19', '19-21', '21+', '<19', '19-21', '21+',
    'SD', 'SLTP', 'SLTA', 'D1-D2', 'D3', 'S1', 'S2', 'S3',
    'SD', 'SLTP', 'SLTA', 'D1-D2', 'D3', 'S1', 'S2', 'S3'
  ];
  sheet.appendRow(headers);
  
  // Get data
  const values = dataSheet.getDataRange().getValues();
  const KUA_LIST = getKUAList();
  
  let no = 1;
  const totals = getEmptyNikahData();
  
  for (let kua of KUA_LIST) {
    const kuaInfo = kuaInfoMap[kua] || { kepalaKUA: '', nip: '' };
    let nikahData = null;
    
    // Find data for this KUA
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[1] === kua && row[2] == data.month && row[3] == data.year) {
        nikahData = typeof row[4] === 'string' ? JSON.parse(row[4]) : row[4];
        break;
      }
    }
    
    if (!nikahData) {
      nikahData = getEmptyNikahData();
    }
    
    // Add to totals
    for (let key in nikahData) {
      totals[key] = (totals[key] || 0) + (nikahData[key] || 0);
    }
    
    const rowData = [
      no++,
      kua,
      kuaInfo.kepalaKUA,
      nikahData.kantor || 0,
      nikahData.luarKantor || 0,
      nikahData.itsbat || 0,
      nikahData.campuranLaki || 0,
      nikahData.campuranWanita || 0,
      nikahData.rujuk || 0,
      nikahData.itsbatNikah || 0,
      nikahData.usiaPengantinLakiU19 || 0,
      nikahData.usiaPengantinLaki1921 || 0,
      nikahData.usiaPengantinLaki21Plus || 0,
      nikahData.usiaPengantinWanitaU19 || 0,
      nikahData.usiaPengantinWanita1921 || 0,
      nikahData.usiaPengantinWanita21Plus || 0,
      nikahData.pendidikanLakiSD || 0,
      nikahData.pendidikanLakiSLTP || 0,
      nikahData.pendidikanLakiSLTA || 0,
      nikahData.pendidikanLakiD1D2 || 0,
      nikahData.pendidikanLakiD3 || 0,
      nikahData.pendidikanLakiS1 || 0,
      nikahData.pendidikanLakiS2 || 0,
      nikahData.pendidikanLakiS3 || 0,
      nikahData.pendidikanWanitaSD || 0,
      nikahData.pendidikanWanitaSLTP || 0,
      nikahData.pendidikanWanitaSLTA || 0,
      nikahData.pendidikanWanitaD1D2 || 0,
      nikahData.pendidikanWanitaD3 || 0,
      nikahData.pendidikanWanitaS1 || 0,
      nikahData.pendidikanWanitaS2 || 0,
      nikahData.pendidikanWanitaS3 || 0
    ];
    
    sheet.appendRow(rowData);
  }
  
  // Add totals row
  const totalsRow = [
    '',
    'TOTAL',
    '',
    totals.kantor || 0,
    totals.luarKantor || 0,
    totals.itsbat || 0,
    totals.campuranLaki || 0,
    totals.campuranWanita || 0,
    totals.rujuk || 0,
    totals.itsbatNikah || 0,
    totals.usiaPengantinLakiU19 || 0,
    totals.usiaPengantinLaki1921 || 0,
    totals.usiaPengantinLaki21Plus || 0,
    totals.usiaPengantinWanitaU19 || 0,
    totals.usiaPengantinWanita1921 || 0,
    totals.usiaPengantinWanita21Plus || 0,
    totals.pendidikanLakiSD || 0,
    totals.pendidikanLakiSLTP || 0,
    totals.pendidikanLakiSLTA || 0,
    totals.pendidikanLakiD1D2 || 0,
    totals.pendidikanLakiD3 || 0,
    totals.pendidikanLakiS1 || 0,
    totals.pendidikanLakiS2 || 0,
    totals.pendidikanLakiS3 || 0,
    totals.pendidikanWanitaSD || 0,
    totals.pendidikanWanitaSLTP || 0,
    totals.pendidikanWanitaSLTA || 0,
    totals.pendidikanWanitaD1D2 || 0,
    totals.pendidikanWanitaD3 || 0,
    totals.pendidikanWanitaS1 || 0,
    totals.pendidikanWanitaS2 || 0,
    totals.pendidikanWanitaS3 || 0
  ];
  sheet.appendRow(totalsRow);
  
  // Flush tulis, return URL export langsung
  SpreadsheetApp.flush();
  const ss = sheet.getParent();
  const fileId = ss.getId();

  // Publish spreadsheet agar export URL bisa diakses tanpa login
  ss.setPublishedState(true);

  const exportUrl = 'https://docs.google.com/spreadsheets/d/' + fileId + '/export?format=xlsx';
  
  return successResponse({
    downloadUrl: exportUrl,
    fileName: 'Nikah_' + monthName + '_' + data.year + '.xlsx',
    fileId: fileId
  });
}

function exportNikahYearly(sheet, data) {
  const dataSheet = getSheet('Nikah_Data');
  const kuaInfoSheet = getSheet('Nikah_KUAInfo');
  
  // Get KUA info
  const kuaInfoValues = kuaInfoSheet.getDataRange().getValues();
  const kuaInfoMap = {};
  for (let i = 1; i < kuaInfoValues.length; i++) {
    kuaInfoMap[kuaInfoValues[i][0]] = {
      kepalaKUA: kuaInfoValues[i][1],
      nip: kuaInfoValues[i][2]
    };
  }
  
  // Build headers
  sheet.appendRow(['DAFTAR PERISTIWA NIKAH TAHUN ' + data.year]);
  sheet.appendRow(['']);  // spacer row
  
  const headers = [
    'NO', 'Nama KUA', 'KEPALA KUA',
    'KANTOR', 'LUAR KANTOR', 'ITSBAT',
    'LAKI-LAKI', 'WANITA',
    'JUMLAH RUJUK', 'JUMLAH ITSBAT',
    '<19', '19-21', '21+', '<19', '19-21', '21+',
    'SD', 'SLTP', 'SLTA', 'D1-D2', 'D3', 'S1', 'S2', 'S3',
    'SD', 'SLTP', 'SLTA', 'D1-D2', 'D3', 'S1', 'S2', 'S3'
  ];
  sheet.appendRow(headers);
  
  // Get data
  const values = dataSheet.getDataRange().getValues();
  const KUA_LIST = getKUAList();
  
  let no = 1;
  const yearTotals = getEmptyNikahData();
  
  for (let kua of KUA_LIST) {
    const kuaInfo = kuaInfoMap[kua] || { kepalaKUA: '', nip: '' };
    const kuaYearData = getEmptyNikahData();
    
    // Aggregate all months for this KUA
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[1] === kua && row[3] == data.year) {
        const monthData = typeof row[4] === 'string' ? JSON.parse(row[4]) : row[4];
        
        for (let key in monthData) {
          kuaYearData[key] = (kuaYearData[key] || 0) + (monthData[key] || 0);
        }
      }
    }
    
    // Add to year totals
    for (let key in kuaYearData) {
      yearTotals[key] = (yearTotals[key] || 0) + (kuaYearData[key] || 0);
    }
    
    const rowData = [
      no++,
      kua,
      kuaInfo.kepalaKUA,
      kuaYearData.kantor || 0,
      kuaYearData.luarKantor || 0,
      kuaYearData.itsbat || 0,
      kuaYearData.campuranLaki || 0,
      kuaYearData.campuranWanita || 0,
      kuaYearData.rujuk || 0,
      kuaYearData.itsbatNikah || 0,
      kuaYearData.usiaPengantinLakiU19 || 0,
      kuaYearData.usiaPengantinLaki1921 || 0,
      kuaYearData.usiaPengantinLaki21Plus || 0,
      kuaYearData.usiaPengantinWanitaU19 || 0,
      kuaYearData.usiaPengantinWanita1921 || 0,
      kuaYearData.usiaPengantinWanita21Plus || 0,
      kuaYearData.pendidikanLakiSD || 0,
      kuaYearData.pendidikanLakiSLTP || 0,
      kuaYearData.pendidikanLakiSLTA || 0,
      kuaYearData.pendidikanLakiD1D2 || 0,
      kuaYearData.pendidikanLakiD3 || 0,
      kuaYearData.pendidikanLakiS1 || 0,
      kuaYearData.pendidikanLakiS2 || 0,
      kuaYearData.pendidikanLakiS3 || 0,
      kuaYearData.pendidikanWanitaSD || 0,
      kuaYearData.pendidikanWanitaSLTP || 0,
      kuaYearData.pendidikanWanitaSLTA || 0,
      kuaYearData.pendidikanWanitaD1D2 || 0,
      kuaYearData.pendidikanWanitaD3 || 0,
      kuaYearData.pendidikanWanitaS1 || 0,
      kuaYearData.pendidikanWanitaS2 || 0,
      kuaYearData.pendidikanWanitaS3 || 0
    ];
    
    sheet.appendRow(rowData);
  }
  
  // Add totals row
  const totalsRow = [
    '',
    'TOTAL',
    '',
    yearTotals.kantor || 0,
    yearTotals.luarKantor || 0,
    yearTotals.itsbat || 0,
    yearTotals.campuranLaki || 0,
    yearTotals.campuranWanita || 0,
    yearTotals.rujuk || 0,
    yearTotals.itsbatNikah || 0,
    yearTotals.usiaPengantinLakiU19 || 0,
    yearTotals.usiaPengantinLaki1921 || 0,
    yearTotals.usiaPengantinLaki21Plus || 0,
    yearTotals.usiaPengantinWanitaU19 || 0,
    yearTotals.usiaPengantinWanita1921 || 0,
    yearTotals.usiaPengantinWanita21Plus || 0,
    yearTotals.pendidikanLakiSD || 0,
    yearTotals.pendidikanLakiSLTP || 0,
    yearTotals.pendidikanLakiSLTA || 0,
    yearTotals.pendidikanLakiD1D2 || 0,
    yearTotals.pendidikanLakiD3 || 0,
    yearTotals.pendidikanLakiS1 || 0,
    yearTotals.pendidikanLakiS2 || 0,
    yearTotals.pendidikanLakiS3 || 0,
    yearTotals.pendidikanWanitaSD || 0,
    yearTotals.pendidikanWanitaSLTP || 0,
    yearTotals.pendidikanWanitaSLTA || 0,
    yearTotals.pendidikanWanitaD1D2 || 0,
    yearTotals.pendidikanWanitaD3 || 0,
    yearTotals.pendidikanWanitaS1 || 0,
    yearTotals.pendidikanWanitaS2 || 0,
    yearTotals.pendidikanWanitaS3 || 0
  ];
  sheet.appendRow(totalsRow);
  
  // Flush tulis, return URL export langsung
  SpreadsheetApp.flush();
  const ss = sheet.getParent();
  const fileId = ss.getId();

  // Publish spreadsheet agar export URL bisa diakses tanpa login
  ss.setPublishedState(true);

  const exportUrl = 'https://docs.google.com/spreadsheets/d/' + fileId + '/export?format=xlsx';
  
  return successResponse({
    downloadUrl: exportUrl,
    fileName: 'Nikah_Tahunan_' + data.year + '.xlsx',
    fileId: fileId
  });
}

// ===== CLEANUP EXPORT FILE =====
function cleanupExportFile(data) {
  try {
    if (data.fileId) {
      SpreadsheetApp.openById(data.fileId).getRootFolder(); // just verify accessible
      // Hapus via SpreadsheetApp — tidak butuh DriveApp scope
      var files = DriveApp ? DriveApp.getFileById(data.fileId).trash() : null;
      // Fallback: kalau DriveApp tidak tersedia, biarkan file tetap ada (harmless)
    }
    return successResponse({ cleaned: true });
  } catch (e) {
    Logger.log('[CLEANUP] ' + e.toString());
    // Cleanup gagal tidak critical — file temp tetap di Drive, bisa dihapus manual
    return successResponse({ cleaned: false });
  }
}

// ===== HELPER FUNCTIONS =====
function getMonthName(month) {
  const months = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
  ];
  return months[month - 1] || '';
}

function getKUAList() {
  return [
    'KUA Anjatan', 'KUA Arahan', 'KUA Balongan', 'KUA Bangodua', 'KUA Bongas',
    'KUA Cantigi', 'KUA Cikedung', 'KUA Gantar', 'KUA Gabuswetan', 'KUA Haurgeulis',
    'KUA Indramayu', 'KUA Jatibarang', 'KUA Juntinyuat', 'KUA Kandanghaur', 'KUA Karangampel',
    'KUA Kedokan Bunder', 'KUA Kertasemaya', 'KUA Krangkeng', 'KUA Lelea', 'KUA Lohbener',
    'KUA Losarang', 'KUA Pasekan', 'KUA Patrol', 'KUA Sindang', 'KUA Sliyeg',
    'KUA Sukagumiwang', 'KUA Sukra', 'KUA Terisi', 'KUA Tukdana', 'KUA Widasari'
  ];
}

function extractFileId(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}