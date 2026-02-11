// ===== AUTOPAY MANAGEMENT =====
// File: code-autopay.gs
// Purpose: Manage autopay settings and data for electricity and internet payments

/**
 * Get autopay configuration for all KUAs
 * Returns list of KUAs with their autopay status and settings
 */
function getAutopayConfig() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let autopaySheet = ss.getSheetByName('Autopay_Config');
    
    // Create sheet if not exists (backward compatibility)
    if (!autopaySheet) {
      autopaySheet = ss.insertSheet('Autopay_Config');
      autopaySheet.appendRow([
        'KUA',
        'Listrik_Enabled',
        'Telepon_Enabled',
        'Updated_By',
        'Updated_At'
      ]);
    }
    
    const data = autopaySheet.getDataRange().getValues();
    const headers = data[0];
    const configs = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0]) { // If KUA name exists
        configs.push({
          kua: row[0],
          listrikEnabled: row[1] === true || row[1] === 'TRUE',
          teleponEnabled: row[2] === true || row[2] === 'TRUE',
          updatedBy: row[3] || '',
          updatedAt: row[4] || ''
        });
      }
    }
    
    return configs;
  } catch (error) {
    throw new Error('Error getting autopay config: ' + error.message);
  }
}

/**
 * Save autopay configuration for a KUA
 * @param {string} kua - KUA name
 * @param {boolean} listrikEnabled - Enable autopay for electricity
 * @param {boolean} teleponEnabled - Enable autopay for internet/phone
 * @param {string} updatedBy - Username who updated
 */
function saveAutopayConfig(kua, listrikEnabled, teleponEnabled, updatedBy) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let autopaySheet = ss.getSheetByName('Autopay_Config');
    
    // Create sheet if not exists
    if (!autopaySheet) {
      autopaySheet = ss.insertSheet('Autopay_Config');
      autopaySheet.appendRow([
        'KUA',
        'Listrik_Enabled',
        'Telepon_Enabled',
        'Updated_By',
        'Updated_At'
      ]);
    }
    
    const data = autopaySheet.getDataRange().getValues();
    let rowIndex = -1;
    
    // Find existing row
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === kua) {
        rowIndex = i;
        break;
      }
    }
    
    const updatedAt = new Date().toISOString();
    const rowData = [kua, listrikEnabled, teleponEnabled, updatedBy, updatedAt];
    
    if (rowIndex > -1) {
      // Update existing row
      autopaySheet.getRange(rowIndex + 1, 1, 1, 5).setValues([rowData]);
    } else {
      // Add new row
      autopaySheet.appendRow(rowData);
    }
    
    return {
      success: true,
      message: 'Autopay config saved successfully',
      data: {
        kua: kua,
        listrikEnabled: listrikEnabled,
        teleponEnabled: teleponEnabled,
        updatedBy: updatedBy,
        updatedAt: updatedAt
      }
    };
  } catch (error) {
    throw new Error('Error saving autopay config: ' + error.message);
  }
}

/**
 * Check if a specific pos is autopay-enabled for a KUA
 * @param {string} kua - KUA name
 * @param {string} kodePos - Pos code (522111 or 522112)
 * @return {boolean} - True if autopay is enabled
 */
function isAutopayEnabled(kua, kodePos) {
  try {
    const configs = getAutopayConfig();
    const config = configs.find(c => c.kua === kua);
    
    if (!config) return false;
    
    if (kodePos === '522111') {
      return config.listrikEnabled;
    } else if (kodePos === '522112') {
      return config.teleponEnabled;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking autopay status:', error);
    return false;
  }
}

/**
 * Get autopay realisasi data for a specific year and month
 * @param {number} tahun - Year
 * @param {number} bulan - Month (1-12)
 * @return {Array} - Array of autopay realisasi data
 */
function getAutopayRealisasi(tahun, bulan) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let autopaySheet = ss.getSheetByName('Autopay_Realisasi');
    
    // Create sheet if not exists (backward compatibility)
    if (!autopaySheet) {
      autopaySheet = ss.insertSheet('Autopay_Realisasi');
      autopaySheet.appendRow([
        'ID',
        'Tahun',
        'Bulan',
        'KUA',
        'Kode_Pos',
        'Nama_Pos',
        'Nominal',
        'Keterangan',
        'Updated_By',
        'Updated_At'
      ]);
    }
    
    const data = autopaySheet.getDataRange().getValues();
    const realisasis = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[1] == tahun && row[2] == bulan && row[3]) {
        realisasis.push({
          id: row[0],
          tahun: row[1],
          bulan: row[2],
          kua: row[3],
          kodePos: row[4],
          namaPos: row[5],
          nominal: row[6],
          keterangan: row[7] || '',
          updatedBy: row[8] || '',
          updatedAt: row[9] || ''
        });
      }
    }
    
    return realisasis;
  } catch (error) {
    throw new Error('Error getting autopay realisasi: ' + error.message);
  }
}

/**
 * Save autopay realisasi data
 * @param {number} tahun - Year
 * @param {number} bulan - Month
 * @param {string} kua - KUA name
 * @param {string} kodePos - Pos code
 * @param {string} namaPos - Pos name
 * @param {number} nominal - Amount
 * @param {string} keterangan - Notes
 * @param {string} updatedBy - Username
 */
function saveAutopayRealisasi(tahun, bulan, kua, kodePos, namaPos, nominal, keterangan, updatedBy) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let autopaySheet = ss.getSheetByName('Autopay_Realisasi');
    
    // Create sheet if not exists
    if (!autopaySheet) {
      autopaySheet = ss.insertSheet('Autopay_Realisasi');
      autopaySheet.appendRow([
        'ID',
        'Tahun',
        'Bulan',
        'KUA',
        'Kode_Pos',
        'Nama_Pos',
        'Nominal',
        'Keterangan',
        'Updated_By',
        'Updated_At'
      ]);
    }
    
    const data = autopaySheet.getDataRange().getValues();
    let rowIndex = -1;
    
    // Find existing row
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] == tahun && 
          data[i][2] == bulan && 
          data[i][3] === kua && 
          data[i][4] === kodePos) {
        rowIndex = i;
        break;
      }
    }
    
    const updatedAt = new Date().toISOString();
    const id = rowIndex > -1 ? data[rowIndex][0] : generateId();
    
    const rowData = [
      id,
      tahun,
      bulan,
      kua,
      kodePos,
      namaPos,
      nominal,
      keterangan,
      updatedBy,
      updatedAt
    ];
    
    if (rowIndex > -1) {
      // Update existing row
      autopaySheet.getRange(rowIndex + 1, 1, 1, 10).setValues([rowData]);
    } else {
      // Add new row
      autopaySheet.appendRow(rowData);
    }
    
    return {
      success: true,
      message: 'Autopay realisasi saved successfully',
      data: {
        id: id,
        tahun: tahun,
        bulan: bulan,
        kua: kua,
        kodePos: kodePos,
        namaPos: namaPos,
        nominal: nominal,
        keterangan: keterangan,
        updatedBy: updatedBy,
        updatedAt: updatedAt
      }
    };
  } catch (error) {
    throw new Error('Error saving autopay realisasi: ' + error.message);
  }
}

/**
 * Delete autopay realisasi data
 * @param {number} tahun - Year
 * @param {number} bulan - Month
 * @param {string} kua - KUA name
 * @param {string} kodePos - Pos code
 */
function deleteAutopayRealisasi(tahun, bulan, kua, kodePos) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const autopaySheet = ss.getSheetByName('Autopay_Realisasi');
    
    if (!autopaySheet) {
      return { success: true, message: 'No autopay data to delete' };
    }
    
    const data = autopaySheet.getDataRange().getValues();
    
    // Find and delete row
    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][1] == tahun && 
          data[i][2] == bulan && 
          data[i][3] === kua && 
          data[i][4] === kodePos) {
        autopaySheet.deleteRow(i + 1);
        break;
      }
    }
    
    return {
      success: true,
      message: 'Autopay realisasi deleted successfully'
    };
  } catch (error) {
    throw new Error('Error deleting autopay realisasi: ' + error.message);
  }
}

/**
 * Get autopay summary for a specific month
 * Shows total autopay amount per KUA
 */
function getAutopaySummary(tahun, bulan) {
  try {
    const realisasis = getAutopayRealisasi(tahun, bulan);
    const summary = {};
    
    realisasis.forEach(r => {
      if (!summary[r.kua]) {
        summary[r.kua] = {
          kua: r.kua,
          listrik: 0,
          telepon: 0,
          total: 0
        };
      }
      
      if (r.kodePos === '522111') {
        summary[r.kua].listrik = r.nominal;
      } else if (r.kodePos === '522112') {
        summary[r.kua].telepon = r.nominal;
      }
      
      summary[r.kua].total += r.nominal;
    });
    
    return Object.values(summary);
  } catch (error) {
    throw new Error('Error getting autopay summary: ' + error.message);
  }
}

/**
 * Get all KUAs from budget data (for dropdown)
 * First tries Budgets sheet, then falls back to Autopay_Config
 * Auto-creates Autopay_Config with default Indramayu KUAs if needed
 */
function getKUAList() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Try Budgets sheet first
    let budgetSheet = ss.getSheetByName('Budgets');
    
    if (budgetSheet) {
      const data = budgetSheet.getDataRange().getValues();
      const kuaSet = new Set();
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][1]) { // KUA column (column B, index 1)
          kuaSet.add(data[i][1]);
        }
      }
      
      if (kuaSet.size > 0) {
        return Array.from(kuaSet).sort();
      }
    }
    
    // Fallback: Get from Autopay_Config or create it
    let autopaySheet = ss.getSheetByName('Autopay_Config');
    
    if (!autopaySheet) {
      Logger.log('[AUTOPAY] Creating Autopay_Config sheet with default KUAs');
      
      autopaySheet = ss.insertSheet('Autopay_Config');
      autopaySheet.appendRow([
        'KUA',
        'Listrik_Enabled',
        'Telepon_Enabled',
        'Updated_By',
        'Updated_At'
      ]);
      
      // Default KUA list for Kabupaten Indramayu (31 KUAs)
      const defaultKUAs = [
        'KUA Anjatan', 'KUA Arahan', 'KUA Balongan', 'KUA Bangodua', 'KUA Bongas',
        'KUA Cantigi', 'KUA Cikedung', 'KUA Gantar', 'KUA Gabuswetan', 'KUA Haurgeulis',
        'KUA Indramayu', 'KUA Jatibarang', 'KUA Juntinyuat', 'KUA Karangampel', 'KUA Kedokanbunder',
        'KUA Kertasemaya', 'KUA Kandanghaur', 'KUA Kroya', 'KUA Krangkeng', 'KUA Lelea',
        'KUA Lohbener', 'KUA Losarang', 'KUA Pasekan', 'KUA Patrol', 'KUA Sindang',
        'KUA Sliyeg', 'KUA Sukagumiwang', 'KUA Sukra', 'KUA Terisi', 'KUA Tukdana',
        'KUA Widasari'
      ];
      
      defaultKUAs.forEach(kua => {
        autopaySheet.appendRow([kua, false, false, '', '']);
      });
      
      Logger.log('[AUTOPAY] Created Autopay_Config with ' + defaultKUAs.length + ' KUAs');
    }
    
    const data = autopaySheet.getDataRange().getValues();
    const kuaList = [];
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) {
        kuaList.push(data[i][0]);
      }
    }
    
    return kuaList.sort();
  } catch (error) {
    Logger.log('[AUTOPAY] Error getting KUA list: ' + error.message);
    throw new Error('Error getting KUA list: ' + error.message);
  }
}