/**
 * FILE: code-laporan.gs
 * Backend functions untuk export laporan dengan opsi Include/Exclude Autopay
 * Tambahkan ke Apps Script project
 */

/**
 * Export Realisasi per Tahun dengan opsi autopay
 * Dipanggil dari frontend dengan: apiCall('exportRealisasiPerYear', { year, includeAutopay })
 */
function exportRealisasiPerYear(params) {
  try {
    const year = params.year;
    const includeAutopay = params.includeAutopay !== false; // Default true
    
    Logger.log('[EXPORT] Realisasi per year: ' + year + ', includeAutopay: ' + includeAutopay);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const realisasiSheet = ss.getSheetByName('Realisasi');
    const autopayRealisasiSheet = ss.getSheetByName('Autopay_Realisasi');
    const autopayConfigSheet = ss.getSheetByName('Autopay_Config');
    
    if (!realisasiSheet) {
      return createErrorResponse('Sheet Realisasi tidak ditemukan');
    }
    
    // Get all realisasi data untuk tahun ini
    const realisasiData = realisasiSheet.getDataRange().getValues();
    const headers = realisasiData[0];
    
    // Find column indexes
    const yearCol = headers.indexOf('Year');
    const kuaCol = headers.indexOf('KUA');
    const monthCol = headers.indexOf('Month');
    const dataCol = headers.indexOf('Data');
    const statusCol = headers.indexOf('Status');
    
    // Get autopay config
    const autopayConfig = getAutopayConfigMap(autopayConfigSheet);
    
    // Get autopay realisasi data
    const autopayRealisasiData = getAutopayRealisasiMap(autopayRealisasiSheet, year);
    
    // Process data per KUA per month
    const result = {};
    
    for (let i = 1; i < realisasiData.length; i++) {
      const row = realisasiData[i];
      
      // Filter by year and status
      if (row[yearCol] != year || row[statusCol] !== 'Diterima') {
        continue;
      }
      
      const kua = String(row[kuaCol]);
      const month = parseInt(row[monthCol]);
      const dataStr = String(row[dataCol]);
      
      if (!result[kua]) {
        result[kua] = {
          kua: kua,
          months: {},
          total: 0,
          totalAutopay: 0
        };
      }
      
      if (!result[kua].months[month]) {
        result[kua].months[month] = {
          manual: 0,
          autopay: 0,
          total: 0
        };
      }
      
      // Parse realisasi data
      let data = {};
      try {
        data = JSON.parse(dataStr);
      } catch (e) {
        Logger.log('[EXPORT] Error parsing data for ' + kua + ' month ' + month);
        continue;
      }
      
      // Calculate totals based on includeAutopay option
      for (const kodePos in data) {
        const posData = data[kodePos];
        const isAutopayEnabled = autopayConfig[kua] && autopayConfig[kua][kodePos];
        
        let posTotal = 0;
        for (const item in posData) {
          posTotal += parseFloat(posData[item]) || 0;
        }
        
        if (includeAutopay) {
          // Include Autopay: semua data dari Realisasi dihitung
          result[kua].months[month].manual += posTotal;
          result[kua].months[month].total += posTotal;
        } else {
          // Exclude Autopay: hanya POS non-autopay yang dihitung
          if (!isAutopayEnabled) {
            result[kua].months[month].manual += posTotal;
            result[kua].months[month].total += posTotal;
          }
        }
      }
      
      // Add autopay data if includeAutopay
      if (includeAutopay) {
        const autopayKey = kua + '_' + year + '_' + month;
        const autopayData = autopayRealisasiData[autopayKey];
        
        if (autopayData) {
          for (const kodePos in autopayData) {
            const autopayNominal = parseFloat(autopayData[kodePos]) || 0;
            result[kua].months[month].autopay += autopayNominal;
            result[kua].months[month].total += autopayNominal;
          }
        }
      }
      
      // Update KUA total
      result[kua].total = 0;
      result[kua].totalAutopay = 0;
      for (const m in result[kua].months) {
        result[kua].total += result[kua].months[m].manual;
        result[kua].totalAutopay += result[kua].months[m].autopay;
      }
    }
    
    return createSuccessResponse({
      year: year,
      includeAutopay: includeAutopay,
      data: result,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    Logger.log('[EXPORT ERROR] ' + error.toString());
    return createErrorResponse(error.toString());
  }
}

/**
 * Export Realisasi Detail Semua KUA dengan opsi autopay
 */
function exportRealisasiDetailPerYear(params) {
  try {
    const year = params.year;
    const includeAutopay = params.includeAutopay !== false; // Default true
    
    Logger.log('[EXPORT_DETAIL] Year: ' + year + ', includeAutopay: ' + includeAutopay);
    
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const realisasiSheet = ss.getSheetByName('Realisasi');
    const autopayRealisasiSheet = ss.getSheetByName('Autopay_Realisasi');
    const autopayConfigSheet = ss.getSheetByName('Autopay_Config');
    
    // Get autopay config
    const autopayConfig = getAutopayConfigMap(autopayConfigSheet);
    
    // Get autopay realisasi data
    const autopayRealisasiData = getAutopayRealisasiMap(autopayRealisasiSheet, year);
    
    // Get all realisasi data
    const realisasiData = realisasiSheet.getDataRange().getValues();
    const headers = realisasiData[0];
    
    const yearCol = headers.indexOf('Year');
    const kuaCol = headers.indexOf('KUA');
    const monthCol = headers.indexOf('Month');
    const dataCol = headers.indexOf('Data');
    const statusCol = headers.indexOf('Status');
    
    // Prepare detailed data
    const detailData = [];
    
    for (let i = 1; i < realisasiData.length; i++) {
      const row = realisasiData[i];
      
      if (row[yearCol] != year || row[statusCol] !== 'Diterima') {
        continue;
      }
      
      const kua = String(row[kuaCol]);
      const month = parseInt(row[monthCol]);
      const dataStr = String(row[dataCol]);
      
      let data = {};
      try {
        data = JSON.parse(dataStr);
      } catch (e) {
        continue;
      }
      
      // Process each POS
      for (const kodePos in data) {
        const posData = data[kodePos];
        const isAutopayEnabled = autopayConfig[kua] && autopayConfig[kua][kodePos];
        
        for (const item in posData) {
          const nominal = parseFloat(posData[item]) || 0;
          
          // Apply filter based on includeAutopay
          let shouldInclude = true;
          if (!includeAutopay && isAutopayEnabled) {
            shouldInclude = false; // Exclude autopay POS
          }
          
          if (shouldInclude && nominal > 0) {
            detailData.push({
              kua: kua,
              month: month,
              kodePos: kodePos,
              item: item,
              nominal: nominal,
              source: 'Manual',
              isAutopay: isAutopayEnabled
            });
          }
        }
      }
      
      // Add autopay data if includeAutopay
      if (includeAutopay) {
        const autopayKey = kua + '_' + year + '_' + month;
        const autopayData = autopayRealisasiData[autopayKey];
        
        if (autopayData) {
          for (const kodePos in autopayData) {
            const nominal = parseFloat(autopayData[kodePos]) || 0;
            
            if (nominal > 0) {
              detailData.push({
                kua: kua,
                month: month,
                kodePos: kodePos,
                item: 'Nominal',
                nominal: nominal,
                source: 'Autopay',
                isAutopay: true
              });
            }
          }
        }
      }
    }
    
    return createSuccessResponse({
      year: year,
      includeAutopay: includeAutopay,
      data: detailData,
      totalRecords: detailData.length,
      generatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    Logger.log('[EXPORT_DETAIL ERROR] ' + error.toString());
    return createErrorResponse(error.toString());
  }
}

/**
 * Helper: Get autopay config map
 * Returns: { "KUA Name": { "522111": true, "522112": false }, ... }
 */
function getAutopayConfigMap(sheet) {
  const map = {};
  
  if (!sheet) return map;
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const kuaCol = headers.indexOf('KUA');
  const listrikCol = headers.indexOf('Listrik');
  const teleponCol = headers.indexOf('Telepon');
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const kua = String(row[kuaCol]);
    
    if (!kua) continue;
    
    map[kua] = {
      '522111': row[listrikCol] === true || row[listrikCol] === 'TRUE',
      '522112': row[teleponCol] === true || row[teleponCol] === 'TRUE'
    };
  }
  
  return map;
}

/**
 * Helper: Get autopay realisasi map
 * Returns: { "KUA_YEAR_MONTH": { "522111": 500000, "522112": 300000 }, ... }
 */
function getAutopayRealisasiMap(sheet, year) {
  const map = {};
  
  if (!sheet) return map;
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  const kuaCol = headers.indexOf('KUA');
  const yearCol = headers.indexOf('Tahun');
  const monthCol = headers.indexOf('Bulan');
  const kodePosCol = headers.indexOf('Kode_POS');
  const nominalCol = headers.indexOf('Nominal');
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    if (row[yearCol] != year) continue;
    
    const kua = String(row[kuaCol]);
    const month = parseInt(row[monthCol]);
    const kodePos = String(row[kodePosCol]);
    const nominal = parseFloat(row[nominalCol]) || 0;
    
    const key = kua + '_' + year + '_' + month;
    
    if (!map[key]) {
      map[key] = {};
    }
    
    map[key][kodePos] = nominal;
  }
  
  return map;
}