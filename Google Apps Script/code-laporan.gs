/**
 * FILE: code-laporan-fix.gs
 * Update existing export functions untuk support includeAutopay parameter
 * 
 * INSTRUCTIONS:
 * 1. Buka Apps Script project
 * 2. Cari function exportRealisasiPerYear
 * 3. REPLACE seluruh function dengan code di bawah
 * 4. Cari function exportRealisasiDetailYear
 * 5. REPLACE seluruh function dengan code di bawah
 */

// ============================================
// REPLACE FUNCTION: exportRealisasiPerYear
// ============================================

function exportRealisasiPerYear(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const realisasiSheet = ss.getSheetByName('Realisasi');
    const rpdSheet = ss.getSheetByName('RPD');
    const autopayConfigSheet = ss.getSheetByName('Autopay_Config');
    const autopayRealisasiSheet = ss.getSheetByName('Autopay_Realisasi');
    
    if (!realisasiSheet) {
      return createErrorResponse('Sheet Realisasi tidak ditemukan');
    }
    
    const kua = params.kua || null;
    const year = params.year;
    const format = params.format || 'excel';
    const includeAutopay = params.includeAutopay !== false; // ✅ Default true untuk backward compatibility
    
    Logger.log('[EXPORT] exportRealisasiPerYear - Year: ' + year + ', KUA: ' + kua + ', Include Autopay: ' + includeAutopay);
    
    // Get autopay config map
    const autopayConfig = getAutopayConfigMap_(autopayConfigSheet);
    
    // Get autopay realisasi map
    const autopayRealisasi = getAutopayRealisasiMap_(autopayRealisasiSheet, year);
    
    // Get realisasi data
    const realisasiData = realisasiSheet.getDataRange().getValues();
    const headers = realisasiData[0];
    
    const kuaCol = headers.indexOf('KUA');
    const monthCol = headers.indexOf('Month');
    const yearCol = headers.indexOf('Year');
    const dataCol = headers.indexOf('Data');
    const statusCol = headers.indexOf('Status');
    
    // Build summary data
    const summary = {};
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    for (let i = 1; i < realisasiData.length; i++) {
      const row = realisasiData[i];
      
      if (row[yearCol] != year || row[statusCol] !== 'Diterima') {
        continue;
      }
      
      const rowKua = String(row[kuaCol]);
      if (kua && rowKua !== kua) {
        continue;
      }
      
      const month = parseInt(row[monthCol]);
      const dataStr = String(row[dataCol]);
      
      if (!summary[rowKua]) {
        summary[rowKua] = {
          kua: rowKua,
          months: Array(12).fill(0),
          autopayMonths: Array(12).fill(0),
          total: 0,
          totalAutopay: 0
        };
      }
      
      // Parse realisasi data
      let data = {};
      try {
        data = JSON.parse(dataStr);
      } catch (e) {
        continue;
      }
      
      let monthTotal = 0;
      
      // Calculate based on includeAutopay flag
      for (const kodePos in data) {
        const posData = data[kodePos];
        const isAutopayEnabled = autopayConfig[rowKua] && autopayConfig[rowKua][kodePos];
        
        let posTotal = 0;
        for (const item in posData) {
          posTotal += parseFloat(posData[item]) || 0;
        }
        
        if (includeAutopay) {
          // Include: hitung semua
          monthTotal += posTotal;
        } else {
          // Exclude: hanya hitung non-autopay
          if (!isAutopayEnabled) {
            monthTotal += posTotal;
          }
        }
      }
      
      summary[rowKua].months[month - 1] = monthTotal;
      summary[rowKua].total += monthTotal;
    }
    
    // ✅ Add autopay data if includeAutopay
    if (includeAutopay) {
      for (const rowKua in summary) {
        for (let month = 1; month <= 12; month++) {
          const key = rowKua + '_' + year + '_' + month;
          const autopayData = autopayRealisasi[key];
          
          if (autopayData) {
            let autopayTotal = 0;
            for (const kodePos in autopayData) {
              autopayTotal += parseFloat(autopayData[kodePos]) || 0;
            }
            
            summary[rowKua].autopayMonths[month - 1] = autopayTotal;
            summary[rowKua].months[month - 1] += autopayTotal;
            summary[rowKua].totalAutopay += autopayTotal;
            summary[rowKua].total += autopayTotal;
          }
        }
      }
    }
    
    // Generate Excel
    if (format === 'excel') {
      const excelData = [];
      
      // ✅ Header row with autopay columns
      const headerRow = ['KUA'].concat(months);
      headerRow.push('Total Manual');
      if (includeAutopay) {
        headerRow.push('Total Autopay');
        headerRow.push('Grand Total');
      }
      excelData.push(headerRow);
      
      // Data rows
      const sortedKuas = Object.keys(summary).sort();
      for (let i = 0; i < sortedKuas.length; i++) {
        const kuaData = summary[sortedKuas[i]];
        const row = [kuaData.kua];
        
        // Monthly data
        for (let m = 0; m < 12; m++) {
          row.push(kuaData.months[m]);
        }
        
        // Totals
        if (includeAutopay) {
          row.push(kuaData.total - kuaData.totalAutopay); // Total Manual
          row.push(kuaData.totalAutopay); // Total Autopay
          row.push(kuaData.total); // Grand Total
        } else {
          row.push(kuaData.total); // Total (manual only)
        }
        
        excelData.push(row);
      }
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, 'Realisasi');
      
      // Write to file
      const fileBlob = wb.toBlob();
      
      // ✅ Modify filename based on includeAutopay
      const autopayLabel = includeAutopay ? 'Include' : 'Exclude';
      const fileName = 'Realisasi_' + year + '_' + autopayLabel + '_Autopay_' + new Date().getTime() + '.xlsx';
      
      const base64 = Utilities.base64Encode(fileBlob.getBytes());
      
      return createSuccessResponse({
        fileData: base64,
        fileName: fileName,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    }
    
    // For other formats, return JSON
    return createSuccessResponse({
      data: summary,
      year: year,
      includeAutopay: includeAutopay
    });
    
  } catch (error) {
    Logger.log('[EXPORT ERROR] ' + error.toString());
    return createErrorResponse(error.toString());
  }
}


// ============================================
// REPLACE FUNCTION: exportRealisasiDetailYear
// ============================================

function exportRealisasiDetailYear(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const realisasiSheet = ss.getSheetByName('Realisasi');
    const autopayConfigSheet = ss.getSheetByName('Autopay_Config');
    const autopayRealisasiSheet = ss.getSheetByName('Autopay_Realisasi');
    
    if (!realisasiSheet) {
      return createErrorResponse('Sheet Realisasi tidak ditemukan');
    }
    
    const year = params.year;
    const format = params.format || 'excel';
    const includeAutopay = params.includeAutopay !== false; // ✅ Default true
    
    Logger.log('[EXPORT_DETAIL] Year: ' + year + ', Include Autopay: ' + includeAutopay);
    
    // Get autopay config map
    const autopayConfig = getAutopayConfigMap_(autopayConfigSheet);
    
    // Get autopay realisasi map
    const autopayRealisasi = getAutopayRealisasiMap_(autopayRealisasiSheet, year);
    
    // Get realisasi data
    const realisasiData = realisasiSheet.getDataRange().getValues();
    const headers = realisasiData[0];
    
    const kuaCol = headers.indexOf('KUA');
    const monthCol = headers.indexOf('Month');
    const yearCol = headers.indexOf('Year');
    const dataCol = headers.indexOf('Data');
    const statusCol = headers.indexOf('Status');
    
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    // Prepare detail data
    const detailData = [];
    
    for (let i = 1; i < realisasiData.length; i++) {
      const row = realisasiData[i];
      
      if (row[yearCol] != year || row[statusCol] !== 'Diterima') {
        continue;
      }
      
      const rowKua = String(row[kuaCol]);
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
        const isAutopayEnabled = autopayConfig[rowKua] && autopayConfig[rowKua][kodePos];
        
        for (const item in posData) {
          const nominal = parseFloat(posData[item]) || 0;
          
          if (nominal === 0) continue;
          
          // ✅ Filter based on includeAutopay
          let shouldInclude = true;
          if (!includeAutopay && isAutopayEnabled) {
            shouldInclude = false; // Exclude autopay POS
          }
          
          if (shouldInclude) {
            detailData.push([
              rowKua,
              months[month - 1],
              kodePos,
              item,
              nominal,
              'Manual',
              isAutopayEnabled ? 'Yes' : 'No'
            ]);
          }
        }
      }
      
      // ✅ Add autopay data if includeAutopay
      if (includeAutopay) {
        const key = rowKua + '_' + year + '_' + month;
        const autopayData = autopayRealisasi[key];
        
        if (autopayData) {
          for (const kodePos in autopayData) {
            const nominal = parseFloat(autopayData[kodePos]) || 0;
            
            if (nominal > 0) {
              detailData.push([
                rowKua,
                months[month - 1],
                kodePos,
                'Nominal',
                nominal,
                'Autopay',
                'Yes'
              ]);
            }
          }
        }
      }
    }
    
    // Generate Excel
    if (format === 'excel') {
      const excelData = [];
      
      // ✅ Header row
      const headerRow = ['KUA', 'Bulan', 'Kode POS', 'Item', 'Nominal'];
      if (includeAutopay) {
        headerRow.push('Source');
        headerRow.push('Is Autopay');
      }
      excelData.push(headerRow);
      
      // Add data rows
      for (let i = 0; i < detailData.length; i++) {
        const row = detailData[i];
        if (includeAutopay) {
          excelData.push(row); // All columns
        } else {
          excelData.push(row.slice(0, 5)); // Without Source and Is Autopay
        }
      }
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, 'Detail Realisasi');
      
      // Write to file
      const fileBlob = wb.toBlob();
      
      // ✅ Modify filename based on includeAutopay
      const autopayLabel = includeAutopay ? 'Include' : 'Exclude';
      const fileName = 'Realisasi_Detail_' + year + '_' + autopayLabel + '_Autopay_' + new Date().getTime() + '.xlsx';
      
      const base64 = Utilities.base64Encode(fileBlob.getBytes());
      
      return createSuccessResponse({
        fileData: base64,
        fileName: fileName,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
    }
    
    // For other formats, return JSON
    return createSuccessResponse({
      data: detailData,
      totalRecords: detailData.length,
      year: year,
      includeAutopay: includeAutopay
    });
    
  } catch (error) {
    Logger.log('[EXPORT_DETAIL ERROR] ' + error.toString());
    return createErrorResponse(error.toString());
  }
}


// ============================================
// HELPER FUNCTIONS (ADD IF NOT EXISTS)
// ============================================

/**
 * Get autopay config map
 */
function getAutopayConfigMap_(sheet) {
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
 * Get autopay realisasi map
 */
function getAutopayRealisasiMap_(sheet, year) {
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