// ===== GOOGLE APPS SCRIPT - BOP MODULE (COMPLETE FIXED VERSION) =====
// File: code-bop.gs
// Version: 4.0 - Complete with all fixes

// ===== STATUS BACKWARD COMPATIBILITY =====
/**
 * Normalize status lama ke nilai baru.
 * Data lama: 'Pending', 'Menunggu', 'Menunggu Verifikasi', 'Diterima', 'Ditolak'
 * Data baru: 'Waiting', 'Approved', 'Rejected', 'Paid'
 */
function normalizeStatus(status) {
  var map = {
    'Pending':             'Waiting',
    'Menunggu':            'Waiting',
    'Menunggu Verifikasi': 'Waiting',
    'Waiting':             'Waiting',
    'Diterima':            'Approved',
    'Approved':            'Approved',
    'Ditolak':             'Rejected',
    'Rejected':            'Rejected',
    'Paid':                'Paid'
  };
  return map[status] || 'Waiting';
}

// ===== CONSTANTS =====
const DRIVE_FOLDER_ID = '11quguPvN4NvdhEZVhiE4gTCIFS9LWw_6';
const NAMA_KASI_BIMAS = 'H. ROSIDI, S.Ag., M.M';
const NIP_KASI_BIMAS = 'NIP: 19681230 199403 1 003';

const BOP_CONFIG = {
  RPD_PARAMETERS: {
    '521111': {
      name: 'Belanja Operasional Perkantoran',
      items: ['ATK Kantor', 'Jamuan Tamu', 'Pramubakti', 'Alat Rumah Tangga Kantor'],
      hasSubItems: true
    },
    '521211': {
      name: 'Belanja Bahan',
      items: ['Penggandaan / Penjilidan', 'Spanduk'],
      hasSubItems: true
    },
    '522111': {
      name: 'Belanja Langganan Listrik',
      items: ['Nominal'],
      hasSubItems: false
    },
    '522112': {
      name: 'Belanja Langganan Telepon / Internet',
      items: ['Nominal'],
      hasSubItems: false
    },
    '522113': {
      name: 'Belanja Langganan Air',
      items: ['Nominal'],
      hasSubItems: false
    },
    '523111': {
      name: 'Belanja Pemeliharaan Gedung dan Bangunan',
      items: ['Nominal'],
      hasSubItems: false
    },
    '523121': {
      name: 'Belanja Pemeliharaan Peralatan dan Mesin',
      items: ['Nominal'],
      hasSubItems: false
    }
  }
};

const KUA_LIST = [
  'KUA Anjatan', 'KUA Arahan', 'KUA Balongan', 'KUA Bangodua', 'KUA Bongas',
  'KUA Cantigi', 'KUA Cikedung', 'KUA Gantar', 'KUA Gabuswetan', 'KUA Haurgeulis',
  'KUA Indramayu', 'KUA Jatibarang', 'KUA Juntinyuat', 'KUA Kandanghaur', 'KUA Karangampel',
  'KUA Kedokan Bunder', 'KUA Kertasemaya', 'KUA Krangkeng', 'KUA Lelea', 'KUA Lohbener',
  'KUA Losarang', 'KUA Pasekan', 'KUA Patrol', 'KUA Sindang', 'KUA Sliyeg',
  'KUA Sukagumiwang', 'KUA Sukra', 'KUA Terisi', 'KUA Tukdana', 'KUA Widasari'
];

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const SHEETS = {
  BUDGET: 'Budget',
  RPD: 'RPD',
  REALISASI: 'Realisasi',
  CONFIG: 'Config'
};

// ===== HELPER FUNCTIONS =====
function getSheet(sheetName) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      Logger.log('[ERROR] Sheet not found: ' + sheetName);
      throw new Error('Sheet tidak ditemukan: ' + sheetName);
    }
    return sheet;
  } catch (error) {
    Logger.log('[ERROR] getSheet failed: ' + error.toString());
    throw error;
  }
}

function successResponse(data) {
  Logger.log('[SUCCESS_RESPONSE] Data type: ' + typeof data);
  return {
    success: true,
    data: data
  };
}

function errorResponse(message) {
  Logger.log('[ERROR_RESPONSE] ' + message);
  return {
    success: false,
    message: message
  };
}

function formatNumber(num) {
  if (num === 0 || num === '0') return '0';
  if (!num) return '';
  
  return Number(num).toLocaleString('id-ID');
}

function formatCurrency(num) {
  return 'Rp ' + formatNumber(num);
}

// ✅ NEW: Safe date formatting
function safeFormatDate(dateValue) {
  if (!dateValue) return '';
  try {
    const date = new Date(dateValue);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString();
  } catch (error) {
    Logger.log('[SAFE_FORMAT_DATE] Error formatting date: ' + error.toString());
    return '';
  }
}

// ===== MAIN HANDLER =====
function handleBOPAction(action, data) {
  Logger.log('[BOP] Action: ' + action);
  Logger.log('[BOP] Data received: ' + JSON.stringify(data));
  
  try {
    let result;
    
    // ✅ Route ke enhanced functions untuk critical operations
    switch(action) {
      // Enhanced save operations dengan locking
      case 'saveRPD':
        result = saveRPDWithRetry(data);
        break;
        
      case 'saveRealisasi':
        result = saveRealisasiWithRetry(data);
        break;
        
      case 'verifyRealisasi':
        result = verifyRealisasiEnhanced(data);
        break;
      
      // Optimized batch operations
      case 'getRPDs':
        // Check if batch request
        if (data.kuas || data.years || data.months) {
          result = getRPDsBatch(data);
        } else {
          result = getRPDs(data);
        }
        break;
        
      case 'getDashboardStats':
        result = getDashboardStatsOptimized(data);
        break;
      
      // Keep existing operations untuk yang lain
      case 'getBudgets': 
        result = getBudgets(data);
        break;
      case 'saveBudget': 
        result = saveBudget(data);
        break;
      case 'deleteBudget': 
        result = deleteBudget(data);
        break;
      case 'deleteRPD': 
        result = deleteRPD(data);
        break;
      case 'getRealisasis': 
        result = getRealisasis(data);
        break;
      case 'deleteRealisasi': 
        result = deleteRealisasi(data);
        break;
      case 'updateRealisasiStatus':
        result = updateRealisasiStatus(data);
        break;
      case 'getRPDConfig': 
        result = getRPDConfig(data);
        break;
      case 'saveRPDConfig': 
        result = saveRPDConfig(data);
        break;
      case 'exportRPDPerYear': 
        result = exportRPDPerYear(data);
        break;
      case 'exportRPDDetailYear': 
        result = exportRPDDetailYear(data);
        break;
      case 'exportRealisasiPerYear': 
        result = exportRealisasiPerYear(data);
        break;
      case 'exportRealisasiDetailYear': 
        result = exportRealisasiDetailYear(data);
        break;
      case 'uploadFile':
        result = uploadFile(data);
        break;
      default:
        result = errorResponse('Unknown BOP action: ' + action);
    }
    
    Logger.log('[BOP] Result success: ' + result.success);
    return result;
    
  } catch (error) {
    Logger.log('[BOP ERROR] ' + error.toString());
    Logger.log('[BOP ERROR STACK] ' + error.stack);
    return errorResponse('BOP Error: ' + error.toString());
  }
}

// ===== BUDGET MANAGEMENT =====
function getBudgets(data) {
  Logger.log('[GET_BUDGETS] KUA: ' + data.kua + ', Year: ' + data.year);
  
  try {
    const sheet = getSheet(SHEETS.BUDGET);
    const rows = sheet.getDataRange().getValues();
    const budgets = [];
    
    Logger.log('[GET_BUDGETS] Total rows: ' + rows.length);
    
    for (let i = 1; i < rows.length; i++) {
      if ((!data.kua || rows[i][1] === data.kua) && 
          (!data.year || rows[i][2] == data.year)) {
        
        // ✅ Hitung totalRPD dan totalRealisasi dari sheet lain
        const kua = rows[i][1];
        const year = rows[i][2];
        
        const totalRPD = calculateTotalRPD(kua, year);
        const totalRealisasi = calculateTotalRealisasi(kua, year);
        const budgetTotal = parseFloat(rows[i][3]) || 0;
        
        budgets.push({
          id: rows[i][0],
          kua: kua,
          year: year,
          total: budgetTotal,          // ✅ Field utama
          budget: budgetTotal,         // ✅ Alias untuk backward compatibility
          pagu: totalRPD,              // ✅ Alias untuk totalRPD
          totalRPD: totalRPD,
          realisasi: totalRealisasi,   // ✅ Alias untuk totalRealisasi
          totalRealisasi: totalRealisasi,
          sisaBudget: budgetTotal - totalRealisasi,
          createdAt: safeFormatDate(rows[i][6]),
          updatedAt: safeFormatDate(rows[i][7])
        });
      }
    }
    
    Logger.log('[GET_BUDGETS] Found: ' + budgets.length + ' budgets');
    return successResponse(budgets);
  } catch (error) {
    Logger.log('[GET_BUDGETS ERROR] ' + error.toString());
    return errorResponse('Gagal memuat budget: ' + error.toString());
  }
}

function calculateTotalRealisasi(kua, year) {
  try {
    const sheet = getSheet(SHEETS.REALISASI);
    const rows = sheet.getDataRange().getValues();
    let total = 0;
    
    for (let i = 1; i < rows.length; i++) {
      // Hanya hitung realisasi yang sudah Approved
      if (rows[i][1] === kua && rows[i][4] == year && normalizeStatus(rows[i][8]) === 'Approved') {
        total += parseFloat(rows[i][5]) || 0;
      }
    }
    
    return total;
  } catch (error) {
    Logger.log('[CALCULATE_TOTAL_REALISASI ERROR] ' + error.toString());
    return 0;
  }
}

function calculateTotalRPD(kua, year) {
  try {
    const sheet = getSheet(SHEETS.RPD);
    const rows = sheet.getDataRange().getValues();
    let total = 0;
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === kua && rows[i][3] == year) {
        total += parseFloat(rows[i][4]) || 0;
      }
    }
    
    return total;
  } catch (error) {
    Logger.log('[CALCULATE_TOTAL_RPD ERROR] ' + error.toString());
    return 0;
  }
}

function saveBudget(data) {
  Logger.log('[SAVE_BUDGET] KUA: ' + data.kua + ', Year: ' + data.year + ', Total: ' + data.total);
  
  try {
    const sheet = getSheet(SHEETS.BUDGET);
    const rows = sheet.getDataRange().getValues();
    const now = new Date();
    
    if (data.id) {
      // Update existing
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          // ✅ Update kolom total (kolom 4, index 3)
          sheet.getRange(i + 1, 4).setValue(parseFloat(data.total) || 0);
          sheet.getRange(i + 1, 8).setValue(now);  // Updated at
          
          Logger.log('[SAVE_BUDGET] Updated budget ID: ' + data.id);
          return successResponse({ 
            message: 'Budget berhasil diupdate', 
            id: data.id 
          });
        }
      }
      Logger.log('[SAVE_BUDGET] Budget not found: ' + data.id);
      return errorResponse('Budget tidak ditemukan');
    } else {
      // Check duplicate
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1] === data.kua && rows[i][2] == data.year) {
          Logger.log('[SAVE_BUDGET] Duplicate found for: ' + data.kua + ' - ' + data.year);
          return errorResponse('Budget untuk KUA dan tahun ini sudah ada');
        }
      }
      
      // Create new
      const id = 'BUDGET-' + Utilities.getUuid();
      const newRow = [
        id,
        data.kua,
        data.year,
        parseFloat(data.total) || 0,  // ✅ Total budget
        0,  // Total RPD (akan dihitung otomatis)
        0,  // Total Realisasi (akan dihitung otomatis)
        now,  // Created at
        now   // Updated at
      ];
      
      sheet.appendRow(newRow);
      Logger.log('[SAVE_BUDGET] Created new budget: ' + id);
      
      return successResponse({ 
        message: 'Budget berhasil disimpan', 
        id: id 
      });
    }
  } catch (error) {
    Logger.log('[SAVE_BUDGET ERROR] ' + error.toString());
    return errorResponse('Gagal menyimpan budget: ' + error.toString());
  }
}

function deleteBudget(data) {
  Logger.log('[DELETE_BUDGET] ID: ' + data.id);
  
  try {
    const sheet = getSheet(SHEETS.BUDGET);
    const rows = sheet.getDataRange().getValues();
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        sheet.deleteRow(i + 1);
        Logger.log('[DELETE_BUDGET] Deleted budget ID: ' + data.id);
        return successResponse({ message: 'Budget berhasil dihapus' });
      }
    }
    
    Logger.log('[DELETE_BUDGET] Budget not found: ' + data.id);
    return errorResponse('Budget tidak ditemukan');
  } catch (error) {
    Logger.log('[DELETE_BUDGET ERROR] ' + error.toString());
    return errorResponse('Gagal menghapus budget: ' + error.toString());
  }
}

// ===== RPD MANAGEMENT =====
function getRPDs(data) {
  Logger.log('[GET_RPDS] KUA: ' + data.kua + ', Year: ' + data.year);
  
  try {
    const sheet = getSheet(SHEETS.RPD);
    const rows = sheet.getDataRange().getValues();
    const rpds = [];
    
    Logger.log('[GET_RPDS] Total rows: ' + rows.length);
    
    for (let i = 1; i < rows.length; i++) {
      if ((!data.kua || rows[i][1] === data.kua) && 
          (!data.year || rows[i][3] == data.year)) {
        
        // ✅ FIX: Parse data dengan error handling
        let rpdData = {};
        try {
          rpdData = JSON.parse(rows[i][5] || '{}');
        } catch (parseError) {
          Logger.log('[GET_RPDS] Failed to parse RPD data for row ' + (i+1) + ': ' + parseError.toString());
          rpdData = {};
        }
        
        rpds.push({
          id: rows[i][0],
          kua: rows[i][1],
          month: rows[i][2],
          year: rows[i][3],
          total: parseFloat(rows[i][4]) || 0,
          data: rpdData,  // ✅ Data sudah di-parse
          createdAt: safeFormatDate(rows[i][6]),
          updatedAt: safeFormatDate(rows[i][7]),
          userId: rows[i][8],
          username: rows[i][9]
        });
      }
    }
    
    Logger.log('[GET_RPDS] Found: ' + rpds.length + ' RPDs');
    return successResponse(rpds);
  } catch (error) {
    Logger.log('[GET_RPDS ERROR] ' + error.toString());
    return errorResponse('Gagal memuat RPD: ' + error.toString());
  }
}

function saveRPD(data) {
  Logger.log('[SAVE_RPD] KUA: ' + data.kua + ', Month: ' + data.month + ', Year: ' + data.year);
  Logger.log('[SAVE_RPD] Data received: ' + JSON.stringify(data.data));
  
  try {
    const sheet = getSheet(SHEETS.RPD);
    const rows = sheet.getDataRange().getValues();
    const now = new Date();
    
    // Check if RPD already exists (same KUA, month, year)
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === data.kua && 
          rows[i][2] === data.month && 
          rows[i][3] == data.year) {
        
        // ✅ FIX: Update dengan stringify data
        sheet.getRange(i + 1, 5).setValue(parseFloat(data.total) || 0);
        sheet.getRange(i + 1, 6).setValue(JSON.stringify(data.data));  // ✅ Stringify dengan benar
        sheet.getRange(i + 1, 8).setValue(now);
        sheet.getRange(i + 1, 9).setValue(data.userId);
        sheet.getRange(i + 1, 10).setValue(data.username);
        
        Logger.log('[SAVE_RPD] Updated RPD at row: ' + (i + 1));
        return successResponse({ 
          message: 'RPD berhasil diupdate',
          id: rows[i][0]
        });
      }
    }
    
    // Create new RPD
    const id = 'RPD-' + Utilities.getUuid();
    const newRow = [
      id,
      data.kua,
      data.month,
      data.year,
      parseFloat(data.total) || 0,
      JSON.stringify(data.data),  // ✅ Stringify dengan benar
      now,
      now,
      data.userId,
      data.username
    ];
    
    sheet.appendRow(newRow);
    Logger.log('[SAVE_RPD] Created new RPD with ID: ' + id);
    Logger.log('[SAVE_RPD] Data column value: ' + JSON.stringify(data.data));
    
    return successResponse({ 
      message: 'RPD berhasil disimpan',
      id: id
    });
    
  } catch (error) {
    Logger.log('[SAVE_RPD ERROR] ' + error.toString());
    Logger.log('[SAVE_RPD ERROR STACK] ' + error.stack);
    return errorResponse('Gagal menyimpan RPD: ' + error.toString());
  }
}

function deleteRPD(data) {
  Logger.log('[DELETE_RPD] ID: ' + data.id);
  
  try {
    const sheet = getSheet(SHEETS.RPD);
    const rows = sheet.getDataRange().getValues();
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        sheet.deleteRow(i + 1);
        Logger.log('[DELETE_RPD] Deleted RPD ID: ' + data.id);
        return successResponse({ message: 'RPD berhasil dihapus' });
      }
    }
    
    Logger.log('[DELETE_RPD] RPD not found: ' + data.id);
    return errorResponse('RPD tidak ditemukan');
  } catch (error) {
    Logger.log('[DELETE_RPD ERROR] ' + error.toString());
    return errorResponse('Gagal menghapus RPD: ' + error.toString());
  }
}

// ===== REALISASI MANAGEMENT =====
function getRealisasis(data) {
  Logger.log('[GET_REALISASIS] KUA: ' + data.kua + ', Year: ' + data.year);
  
  try {
    const sheet = getSheet(SHEETS.REALISASI);
    const rows = sheet.getDataRange().getValues();
    const realisasis = [];
    
    Logger.log('[GET_REALISASIS] Total rows: ' + rows.length);
    
    // ✅ CORRECT COLUMN READING:
    // A    B    C      D        E      F      G     H      I       J      K          L          M           N        O         P
    // ID | KUA | Bulan | RPD_ID | Tahun | Total | Data | Files | Status | Notes | CreatedAt | UpdatedAt | VerifiedAt | UserID | Username | VerifiedBy
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Filter by KUA and Year
      if ((!data.kua || row[1] === data.kua) && 
          (!data.year || row[4] == data.year)) {
        
        // Parse Data (JSON)
        let parsedData = {};
        try {
          if (row[6] && typeof row[6] === 'string') {
            parsedData = JSON.parse(row[6]);
          }
        } catch (e) {
          Logger.log('[GET_REALISASIS] Error parsing data for row ' + i + ':', e);
        }
        
        // Parse Files (JSON)
        let parsedFiles = [];
        try {
          if (row[7] && typeof row[7] === 'string') {
            parsedFiles = JSON.parse(row[7]);
          }
        } catch (e) {
          Logger.log('[GET_REALISASIS] Error parsing files for row ' + i + ':', e);
        }
        
        realisasis.push({
          id: row[0],              // A: ID
          kua: row[1],             // B: KUA
          month: row[2],           // C: Bulan
          rpdId: row[3] || '',     // D: RPD ID ✅
          year: row[4],            // E: Tahun ✅
          total: parseFloat(row[5]) || 0,  // F: Total ✅
          data: parsedData,        // G: Data (parsed)
          files: parsedFiles,      // H: Files (parsed) ✅
          status: normalizeStatus(row[8] || 'Waiting'),  // I: Status
          notes: row[9] || '',     // J: Notes
          createdAt: safeFormatDate(row[10]),  // K: Created At
          updatedAt: safeFormatDate(row[11]),  // L: Updated At
          verifiedAt: safeFormatDate(row[12]), // M: Verified At
          userId: row[13] || '',   // N: User ID
          username: row[14] || '', // O: Username
          verifiedBy: row[15] || '' // P: Verified By
        });
      }
    }
    
    Logger.log('[GET_REALISASIS] Found: ' + realisasis.length + ' realisasis');
    return successResponse(realisasis);
    
  } catch (error) {
    Logger.log('[GET_REALISASIS ERROR] ' + error.toString());
    return errorResponse('Gagal memuat realisasi: ' + error.toString());
  }
}

function saveRealisasi(data) {
  Logger.log('[SAVE_REALISASI] ========== START ==========');
  Logger.log('[SAVE_REALISASI] Data received:', JSON.stringify(data));
  
  try {
    const realisasiSheet = getSheet(SHEETS.REALISASI);
    const rows = realisasiSheet.getDataRange().getValues();
    
    // ✅ Validate required fields
    if (!data.kua || !data.month || !data.year) {
      Logger.log('[SAVE_REALISASI ERROR] Missing required fields');
      return errorResponse('Data tidak lengkap: KUA, Bulan, dan Tahun harus diisi');
    }
    
    // ✅ Validate and prepare files
    let filesData = [];
    if (data.files) {
      if (Array.isArray(data.files)) {
        filesData = data.files;
      } else if (typeof data.files === 'string') {
        try {
          filesData = JSON.parse(data.files);
        } catch (e) {
          Logger.log('[SAVE_REALISASI] Error parsing files:', e);
          filesData = [];
        }
      }
      
      // Filter valid files only
      filesData = filesData.filter(function(file) {
        return file && file.fileName && file.fileUrl;
      });
      
      Logger.log('[SAVE_REALISASI] Valid files count:', filesData.length);
    }
    
    const now = new Date();
    const realisasiData = JSON.stringify(data.data || {});
    const filesJSON = JSON.stringify(filesData);
    
    Logger.log('[SAVE_REALISASI] Files JSON:', filesJSON);
    
    // ✅ Find existing row
    let rowIndex = -1;
    if (data.id) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          rowIndex = i;
          Logger.log('[SAVE_REALISASI] Found existing row at:', rowIndex);
          break;
        }
      }
    }
    
    if (rowIndex === -1) {
      // ✅ CREATE NEW - CRITICAL: CORRECT COLUMN ORDER
      const newId = 'REA-' + Date.now();
      Logger.log('[SAVE_REALISASI] Creating new realisasi with ID:', newId);
      
      // ✅ CORRECT COLUMN MAPPING:
      // A    B         C       D       E       F         G     H       I        J       K           L           M           N         O          P
      // ID | KUA | Bulan | RPD_ID | Tahun | Total | Data | Files | Status | Notes | CreatedAt | UpdatedAt | VerifiedAt | UserID | Username | VerifiedBy
      
      realisasiSheet.appendRow([
        newId,                  // A: ID
        data.kua,               // B: KUA
        data.month,             // C: Bulan
        data.rpdId || '',       // D: RPD ID ✅ (NOT YEAR!)
        data.year,              // E: Tahun ✅ (NOT TOTAL!)
        data.total || 0,        // F: Total ✅
        realisasiData,          // G: Data (JSON)
        filesJSON,              // H: Files (JSON) ✅
        'Waiting',              // I: Status
        '',                     // J: Notes
        now.toISOString(),      // K: Created At
        now.toISOString(),      // L: Updated At
        '',                     // M: Verified At
        data.userId || '',      // N: User ID
        data.username || '',    // O: Username
        ''                      // P: Verified By
      ]);
      
      Logger.log('[SAVE_REALISASI] New realisasi created successfully');
      
    } else {
      // ✅ UPDATE EXISTING - CRITICAL: CORRECT COLUMN ORDER
      Logger.log('[SAVE_REALISASI] Updating existing realisasi at row:', rowIndex + 1);
      
      // Update columns (1-based index)
      realisasiSheet.getRange(rowIndex + 1, 3).setValue(data.month);      // C: Bulan
      realisasiSheet.getRange(rowIndex + 1, 4).setValue(data.rpdId || ''); // D: RPD ID
      realisasiSheet.getRange(rowIndex + 1, 5).setValue(data.year);       // E: Tahun
      realisasiSheet.getRange(rowIndex + 1, 6).setValue(data.total || 0); // F: Total
      realisasiSheet.getRange(rowIndex + 1, 7).setValue(realisasiData);   // G: Data
      realisasiSheet.getRange(rowIndex + 1, 8).setValue(filesJSON);       // H: Files
      realisasiSheet.getRange(rowIndex + 1, 12).setValue(now.toISOString()); // L: Updated At
      
      Logger.log('[SAVE_REALISASI] Realisasi updated successfully');
    }
    
    Logger.log('[SAVE_REALISASI] ========== SUCCESS ==========');
    return successResponse({ message: 'Realisasi berhasil disimpan' });
    
  } catch (error) {
    Logger.log('[SAVE_REALISASI ERROR]', error.toString());
    Logger.log('[SAVE_REALISASI ERROR STACK]', error.stack);
    return errorResponse('Gagal menyimpan realisasi: ' + error.toString());
  }
}

function updateRealisasiStatus(data) {
  Logger.log('[UPDATE_REALISASI_STATUS] ========== START ==========');
  Logger.log('[UPDATE_REALISASI_STATUS] ID: ' + data.id);
  Logger.log('[UPDATE_REALISASI_STATUS] Status: ' + data.status);
  Logger.log('[UPDATE_REALISASI_STATUS] Notes: ' + data.notes);
  Logger.log('[UPDATE_REALISASI_STATUS] Verified By: ' + data.verifiedBy);
  
  try {
    const sheet = getSheet(SHEETS.REALISASI);
    const rows = sheet.getDataRange().getValues();
    const now = new Date();
    
    Logger.log('[UPDATE_REALISASI_STATUS] Searching for ID: ' + data.id);
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        Logger.log('[UPDATE_REALISASI_STATUS] Found realisasi at row: ' + (i + 1));
        
        // Kolom sesuai struktur:
        // A=ID, B=KUA, C=Bulan, D=RPD_ID, E=Tahun, F=Total, G=Data, H=Files, 
        // I=Status, J=Notes, K=CreatedAt, L=UpdatedAt, M=VerifiedAt, N=UserID, O=Username, P=VerifiedBy
        
        sheet.getRange(i + 1, 9).setValue(data.status);           // I: Status
        sheet.getRange(i + 1, 10).setValue(data.notes || '');     // J: Notes
        sheet.getRange(i + 1, 13).setValue(now);                  // M: VerifiedAt
        sheet.getRange(i + 1, 16).setValue(data.verifiedBy || '');// P: VerifiedBy
        
        Logger.log('[UPDATE_REALISASI_STATUS] Status updated to: ' + data.status);
        
        // Update budget total realisasi jika diterima
        if (normalizeStatus(data.status) === 'Approved') {
          const kua = rows[i][1];   // B: KUA
          const year = rows[i][4];  // E: Tahun
          
          Logger.log('[UPDATE_REALISASI_STATUS] Updating budget for KUA: ' + kua + ', Year: ' + year);
          updateBudgetTotalRealisasi(kua, year);
        }
        
        Logger.log('[UPDATE_REALISASI_STATUS] ✅ SUCCESS');
        return successResponse({ message: 'Status realisasi berhasil diupdate' });
      }
    }
    
    Logger.log('[UPDATE_REALISASI_STATUS] ❌ Realisasi not found');
    return errorResponse('Realisasi tidak ditemukan');
    
  } catch (error) {
    Logger.log('[UPDATE_REALISASI_STATUS ERROR] ' + error.toString());
    Logger.log('[UPDATE_REALISASI_STATUS ERROR STACK] ' + error.stack);
    return errorResponse('Gagal update status: ' + error.toString());
  }
}

function deleteRealisasi(data) {
  Logger.log('[DELETE_REALISASI] ID: ' + data.id);
  
  try {
    const sheet = getSheet(SHEETS.REALISASI);
    const rows = sheet.getDataRange().getValues();
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        const kua = rows[i][1];
        const year = rows[i][4];
        const status = rows[i][8];
        
        sheet.deleteRow(i + 1);
        
        if (normalizeStatus(status) === 'Approved') {
          updateBudgetTotalRealisasi(kua, year);
        }
        
        Logger.log('[DELETE_REALISASI] Deleted realisasi ID: ' + data.id);
        return successResponse({ message: 'Realisasi berhasil dihapus' });
      }
    }
    
    Logger.log('[DELETE_REALISASI] Realisasi not found: ' + data.id);
    return errorResponse('Realisasi tidak ditemukan');
  } catch (error) {
    Logger.log('[DELETE_REALISASI ERROR] ' + error.toString());
    return errorResponse('Gagal menghapus realisasi: ' + error.toString());
  }
}

function verifyRealisasi(data) {
  Logger.log('[VERIFY_REALISASI] ID: ' + data.id + ', Status: ' + data.status);
  
  try {
    const sheet = getSheet(SHEETS.REALISASI);
    const rows = sheet.getDataRange().getValues();
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        sheet.getRange(i + 1, 9).setValue(data.status);
        sheet.getRange(i + 1, 10).setValue(data.catatan || '');
        sheet.getRange(i + 1, 13).setValue(new Date());
        
        if (normalizeStatus(data.status) === 'Approved') {
          const kua = rows[i][1];
          const year = rows[i][4];
          updateBudgetTotalRealisasi(kua, year);
        }
        
        Logger.log('[VERIFY_REALISASI] Verified realisasi ID: ' + data.id);
        return successResponse({ message: 'Verifikasi berhasil' });
      }
    }
    
    Logger.log('[VERIFY_REALISASI] Realisasi not found: ' + data.id);
    return errorResponse('Realisasi tidak ditemukan');
  } catch (error) {
    Logger.log('[VERIFY_REALISASI ERROR] ' + error.toString());
    return errorResponse('Gagal verifikasi: ' + error.toString());
  }
}

function updateBudgetTotalRealisasi(kua, year) {
  try {
    const realisasiSheet = getSheet(SHEETS.REALISASI);
    const budgetSheet = getSheet(SHEETS.BUDGET);
    const realisasiRows = realisasiSheet.getDataRange().getValues();
    const budgetRows = budgetSheet.getDataRange().getValues();
    
    let total = 0;
    for (let i = 1; i < realisasiRows.length; i++) {
      if (realisasiRows[i][1] === kua && 
          realisasiRows[i][4] == year && 
          normalizeStatus(realisasiRows[i][8]) === 'Approved') {
        total += parseFloat(realisasiRows[i][7]) || 0;
      }
    }
    
    for (let i = 1; i < budgetRows.length; i++) {
      if (budgetRows[i][1] === kua && budgetRows[i][2] == year) {
        budgetSheet.getRange(i + 1, 6).setValue(total);
        Logger.log('[UPDATE_BUDGET_REALISASI] Updated budget for ' + kua + ' - ' + year + ': ' + total);
        break;
      }
    }
  } catch (error) {
    Logger.log('[UPDATE_BUDGET_REALISASI ERROR] ' + error.toString());
  }
}

// ===== DASHBOARD STATS =====
function getDashboardStats(data) {
  Logger.log('[GET_DASHBOARD_STATS] KUA: ' + data.kua + ', Year: ' + data.year + ', Role: ' + data.role);
  
  try {
    const year = data.year || new Date().getFullYear();
    
    if (data.role === 'Admin') {
      // ============================================================================
      // ADMIN - Statistik untuk semua KUA
      // ============================================================================
      Logger.log('[GET_DASHBOARD_STATS] Loading stats for Admin');
      
      const budgetSheet = getSheet(SHEETS.BUDGET);
      const rpdSheet = getSheet(SHEETS.RPD);
      const realisasiSheet = getSheet(SHEETS.REALISASI);
      
      const budgetRows = budgetSheet.getDataRange().getValues();
      const rpdRows = rpdSheet.getDataRange().getValues();
      const realisasiRows = realisasiSheet.getDataRange().getValues();
      
      let totalBudget = 0;
      let totalRPD = 0;
      let totalRealisasi = 0;
      let pendingCount = 0;
      
      // Hitung total budget untuk tahun ini
      Logger.log('[GET_DASHBOARD_STATS] Calculating total budget...');
      for (let i = 1; i < budgetRows.length; i++) {
        if (budgetRows[i][2] == year) {
          const budgetAmount = parseFloat(budgetRows[i][3]) || 0;
          totalBudget += budgetAmount;
          Logger.log('[GET_DASHBOARD_STATS] Budget ' + budgetRows[i][1] + ': ' + budgetAmount);
        }
      }
      
      // Hitung total RPD untuk tahun ini
      Logger.log('[GET_DASHBOARD_STATS] Calculating total RPD...');
      for (let i = 1; i < rpdRows.length; i++) {
        if (rpdRows[i][3] == year) {
          const rpdAmount = parseFloat(rpdRows[i][4]) || 0;
          totalRPD += rpdAmount;
        }
      }
      
      // Hitung total realisasi yang diterima dan count yang pending
      Logger.log('[GET_DASHBOARD_STATS] Calculating total realisasi and pending...');
      for (let i = 1; i < realisasiRows.length; i++) {
        if (realisasiRows[i][4] == year) {
          const status = realisasiRows[i][8];
          
          // Total realisasi yang sudah diterima
          if (normalizeStatus(status) === 'Approved') {
            const realisasiAmount = parseFloat(realisasiRows[i][5]) || 0;
            totalRealisasi += realisasiAmount;
          }
          
          // Count pending verifikasi
          if (normalizeStatus(status) === 'Waiting') {
            pendingCount++;
          }
        }
      }
      
      Logger.log('[GET_DASHBOARD_STATS] Admin Stats - Budget: ' + totalBudget + ', RPD: ' + totalRPD + ', Realisasi: ' + totalRealisasi + ', Pending: ' + pendingCount);
      
      return successResponse({
        budget: totalBudget,
        totalBudget: totalBudget,  // Alias
        totalRPD: totalRPD,
        pagu: totalRPD,  // Alias
        totalRealisasi: totalRealisasi,
        realisasi: totalRealisasi,  // Alias
        sisaBudget: totalBudget - totalRealisasi,
        pendingVerifikasi: pendingCount,
        menungguVerifikasi: pendingCount  // Alias
      });
      
    } else {
      // ============================================================================
      // OPERATOR - Statistik untuk KUA sendiri
      // ============================================================================
      Logger.log('[GET_DASHBOARD_STATS] Loading stats for Operator: ' + data.kua);
      
      const kua = data.kua;
      
      const budget = calculateTotalBudget(kua, year);
      const totalRPD = calculateTotalRPD(kua, year);
      const totalRealisasi = calculateTotalRealisasi(kua, year);
      
      Logger.log('[GET_DASHBOARD_STATS] Operator Stats - Budget: ' + budget + ', RPD: ' + totalRPD + ', Realisasi: ' + totalRealisasi);
      
      return successResponse({
        budget: budget,
        totalBudget: budget,  // Alias
        totalRPD: totalRPD,
        pagu: totalRPD,  // Alias
        totalRealisasi: totalRealisasi,
        realisasi: totalRealisasi,  // Alias
        sisaBudget: budget - totalRealisasi
      });
    }
  } catch (error) {
    Logger.log('[GET_DASHBOARD_STATS ERROR] ' + error.toString());
    return errorResponse('Gagal memuat statistik: ' + error.toString());
  }
}

function calculateTotalBudget(kua, year) {
  try {
    const sheet = getSheet(SHEETS.BUDGET);
    const rows = sheet.getDataRange().getValues();
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === kua && rows[i][2] == year) {
        const budgetAmount = parseFloat(rows[i][3]) || 0;
        Logger.log('[CALCULATE_TOTAL_BUDGET] ' + kua + ' - ' + year + ': ' + budgetAmount);
        return budgetAmount;
      }
    }
    
    Logger.log('[CALCULATE_TOTAL_BUDGET] No budget found for ' + kua + ' - ' + year);
    return 0;
  } catch (error) {
    Logger.log('[CALCULATE_TOTAL_BUDGET ERROR] ' + error.toString());
    return 0;
  }
}

// ===== CONFIG MANAGEMENT =====
function getRPDConfig(data) {
  Logger.log('[GET_RPD_CONFIG] Getting config from sheet');
  
  try {
    const configSheet = getSheet(SHEETS.CONFIG);
    const rows = configSheet.getDataRange().getValues();
    
    const config = {};
    
    // Parse config dari sheet (Skip header row)
    for (let i = 1; i < rows.length; i++) {
      const key = rows[i][0];
      const value = rows[i][1];
      
      if (key) {
        config[key] = value;
        Logger.log('[GET_RPD_CONFIG] ' + key + ' = ' + value);
      }
    }
    
    Logger.log('[GET_RPD_CONFIG] Config loaded:', JSON.stringify(config));
    return successResponse(config);
    
  } catch (error) {
    Logger.log('[GET_RPD_CONFIG ERROR] ' + error.toString());
    return errorResponse('Gagal memuat konfigurasi: ' + error.toString());
  }
}

function saveRPDConfig(data) {
  Logger.log('[SAVE_RPD_CONFIG] Updating config');
  Logger.log('[SAVE_RPD_CONFIG] Data:', JSON.stringify(data));
  
  try {
    const configSheet = getSheet(SHEETS.CONFIG);
    const rows = configSheet.getDataRange().getValues();
    
    // Update RPD_STATUS
    if (data.rpdStatus !== undefined) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === 'RPD_STATUS') {
          configSheet.getRange(i + 1, 2).setValue(data.rpdStatus);
          Logger.log('[SAVE_RPD_CONFIG] RPD_STATUS updated to: ' + data.rpdStatus);
          break;
        }
      }
    }
    
    // Update REALISASI_STATUS
    if (data.realisasiStatus !== undefined) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === 'REALISASI_STATUS') {
          configSheet.getRange(i + 1, 2).setValue(data.realisasiStatus);
          Logger.log('[SAVE_RPD_CONFIG] REALISASI_STATUS updated to: ' + data.realisasiStatus);
          break;
        }
      }
    }
    
    // Update REALISASI_MAX_FILE_SIZE
    if (data.realisasiMaxFileSize !== undefined) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === 'REALISASI_MAX_FILE_SIZE') {
          configSheet.getRange(i + 1, 2).setValue(parseInt(data.realisasiMaxFileSize));
          Logger.log('[SAVE_RPD_CONFIG] REALISASI_MAX_FILE_SIZE updated to: ' + data.realisasiMaxFileSize);
          break;
        }
      }
    }
    
    // Update REALISASI_MAX_FILES
    if (data.realisasiMaxFiles !== undefined) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === 'REALISASI_MAX_FILES') {
          configSheet.getRange(i + 1, 2).setValue(parseInt(data.realisasiMaxFiles));
          Logger.log('[SAVE_RPD_CONFIG] REALISASI_MAX_FILES updated to: ' + data.realisasiMaxFiles);
          break;
        }
      }
    }
    
    // Update LAST_UPDATED
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === 'LAST_UPDATED') {
        configSheet.getRange(i + 1, 2).setValue(new Date().toISOString());
        break;
      }
    }
    
    Logger.log('[SAVE_RPD_CONFIG] Config saved successfully');
    return successResponse({ message: 'Konfigurasi berhasil disimpan' });
    
  } catch (error) {
    Logger.log('[SAVE_RPD_CONFIG ERROR] ' + error.toString());
    return errorResponse('Gagal menyimpan konfigurasi: ' + error.toString());
  }
}

// ===== EXPORT FUNCTIONS =====

// 1. Export RPD per Year
function exportRPDPerYear(data) {
  Logger.log('[EXPORT_RPD_PER_YEAR] Format: ' + data.format + ', KUA: ' + data.kua + ', Year: ' + data.year);
  
  try {
    const budgetSheet = getSheet(SHEETS.BUDGET);
    const rpdSheet = getSheet(SHEETS.RPD);
    
    const budgets = budgetSheet.getDataRange().getValues();
    const rpds = rpdSheet.getDataRange().getValues();
    
    Logger.log('[EXPORT_RPD_PER_YEAR] Total budgets: ' + (budgets.length - 1));
    Logger.log('[EXPORT_RPD_PER_YEAR] Total RPDs: ' + (rpds.length - 1));
    
    const yearBudgets = [];
    for (let i = 1; i < budgets.length; i++) {
      if (budgets[i][2] == data.year) {
        if (!data.kua || budgets[i][1] === data.kua) {
          yearBudgets.push({
            kua: budgets[i][1],
            budget: parseFloat(budgets[i][3]) || 0
          });
        }
      }
    }
    
    Logger.log('[EXPORT_RPD_PER_YEAR] Year budgets found: ' + yearBudgets.length);
    
    const result = yearBudgets.map(b => {
      const row = {
        kua: b.kua,
        budget: b.budget,
        months: {}
      };
      
      MONTHS.forEach(month => {
        row.months[month] = 0;
      });
      
      // ✅ FIX: Kolom yang benar
      // RPD Sheet: A=ID, B=KUA, C=Bulan, D=Tahun, E=Total, F=Data
      for (let i = 1; i < rpds.length; i++) {
        if (rpds[i][1] === b.kua && rpds[i][3] == data.year) {  // B=KUA, D=Tahun
          const month = rpds[i][2];  // C: Bulan
          const total = parseFloat(rpds[i][4]) || 0;  // E: Total ✅
          
          Logger.log('[EXPORT_RPD_PER_YEAR] RPD found: ' + b.kua + ' - ' + month + ' = ' + total);
          
          row.months[month] = total;
        }
      }
      
      row.totalRPD = Object.values(row.months).reduce((sum, val) => sum + val, 0);
      row.sisa = b.budget - row.totalRPD;
      
      Logger.log('[EXPORT_RPD_PER_YEAR] Result for ' + b.kua + ': totalRPD=' + row.totalRPD + ', sisa=' + row.sisa);
      
      return row;
    });
    
    if (data.format === 'pdf') {
      return exportRPDPerYearPDF(result, data.year, data.kua);
    } else {
      return exportRPDPerYearExcel(result, data.year, data.kua);
    }
  } catch (error) {
    Logger.log('[EXPORT_RPD_PER_YEAR ERROR] ' + error.toString());
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRPDPerYearExcel(data, year, kua) {
  let tsv = `LAPORAN RPD PER TAHUN ${year}\n`;
  if (kua) tsv += `KUA: ${kua}\n`;
  tsv += `\nNo\tKUA\tBudget\t`;
  
  MONTHS.forEach(month => {
    tsv += `${month}\t`;
  });
  tsv += `Total RPD\tSisa\n`;
  
  data.forEach((row, index) => {
    tsv += `${index + 1}\t${row.kua}\t${row.budget}\t`;
    MONTHS.forEach(month => {
      tsv += `${row.months[month]}\t`;
    });
    tsv += `${row.totalRPD}\t${row.sisa}\n`;
  });
  
  const blob = Utilities.newBlob(tsv, 'text/tab-separated-values');
  const base64 = Utilities.base64Encode(blob.getBytes());
  
  Logger.log('[EXPORT_RPD_PER_YEAR_EXCEL] Export completed');
  return successResponse({
    fileData: base64,
    fileName: `Laporan_RPD_${year}${kua ? '_' + kua : ''}.xls`,
    mimeType: 'application/vnd.ms-excel'
  });
}

function exportRPDPerYearPDF(data, year, kua) {
  // ✅ FIX BUG #4: Perbaiki styling PDF untuk lebih nyaman dibaca
  let html = `<html><head><style>
    @page { 
      size: A4 landscape;     /* Landscape untuk tabel yang lebar */
      margin: 15mm 10mm;      /* Margin yang cukup */
    }
    body { 
      font-family: 'Arial', sans-serif; 
      font-size: 9pt;         /* ✅ Font lebih besar dari sebelumnya (8px) */
      margin: 0;
      padding: 0;
    }
    h3 { 
      text-align: center; 
      margin: 0 0 5px 0;
      font-size: 14pt;        /* ✅ Judul lebih besar */
      font-weight: bold;
    }
    p { 
      text-align: center; 
      margin: 0 0 15px 0;
      font-size: 11pt;        /* ✅ Sub-judul jelas */
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 10px;
      font-size: 8pt;         /* ✅ Tabel sedikit lebih kecil dari body */
    }
    th { 
      background-color: #4CAF50;
      color: white;
      font-weight: bold;
      padding: 6px 4px;       /* ✅ Padding yang cukup */
      border: 1px solid #333;
      text-align: center;
      font-size: 9pt;
    }
    td { 
      padding: 5px 4px;       /* ✅ Padding yang nyaman */
      border: 1px solid #666;
      text-align: right;      /* Angka rata kanan */
    }
    td:first-child,           /* No */
    td:nth-child(2) {         /* KUA */
      text-align: center;
    }
    .amount {
      text-align: right;
      font-family: 'Courier New', monospace; /* ✅ Font monospace untuk angka */
    }
  </style></head><body>
  <h3>LAPORAN RPD PER TAHUN ${year}</h3>`;
  
  if (kua) html += `<p>KUA: ${kua}</p>`;
  else html += `<p>Kementerian Agama Kabupaten Indramayu</p>`;
  
  html += `<table>
    <thead>
      <tr>
        <th style="width: 3%;">No</th>
        <th style="width: 15%;">KUA</th>
        <th style="width: 8%;">Budget</th>`;
  
  // Header bulan
  MONTHS.forEach(month => {
    html += `<th style="width: 5%;">${month.substring(0, 3)}</th>`; // ✅ Singkat agar muat
  });
  html += `<th style="width: 8%;">Total RPD</th>
           <th style="width: 8%;">Sisa</th>
      </tr>
    </thead>
    <tbody>`;
  
  // Data rows
  data.forEach((row, index) => {
    html += `<tr>
      <td style="text-align: center;">${index + 1}</td>
      <td style="text-align: left;">${row.kua}</td>
      <td class="amount">${formatCurrency(row.budget)}</td>`;
    
    MONTHS.forEach(month => {
      html += `<td class="amount">${formatCurrency(row.months[month])}</td>`;
    });
    
    html += `<td class="amount" style="font-weight: bold; background: #f0f0f0;">${formatCurrency(row.totalRPD)}</td>
             <td class="amount" style="font-weight: bold; background: #fff3cd;">${formatCurrency(row.sisa)}</td>
           </tr>`;
  });
  
  html += `</tbody></table></body></html>`;
  
  const blob = Utilities.newBlob(html, 'text/html');
  const pdfBlob = blob.getAs('application/pdf');
  const base64 = Utilities.base64Encode(pdfBlob.getBytes());
  
  Logger.log('[EXPORT_RPD_PER_YEAR_PDF] Export completed');
  return successResponse({
    fileData: base64,
    fileName: `Laporan_RPD_${year}${kua ? '_' + kua : ''}.pdf`,
    mimeType: 'application/pdf'
  });
}

// 2. Export RPD Detail Year - CORRECTED FORMAT
function exportRPDDetailYear(data) {
  Logger.log('[EXPORT_RPD_DETAIL_YEAR] Format: ' + data.format + ', Year: ' + data.year);
  
  try {
    const rpdSheet = getSheet(SHEETS.RPD);
    const rpds = rpdSheet.getDataRange().getValues();
    
    Logger.log('[EXPORT_RPD_DETAIL_YEAR] Total RPD rows: ' + (rpds.length - 1));
    
    const rpdByKUA = {};
    const kuaList = new Set();
    
    // ✅ FIX: Gunakan index yang benar untuk tahun
    // RPD Sheet: A=ID(0), B=KUA(1), C=Bulan(2), D=Tahun(3), E=Total(4), F=Data(5)
    for (let i = 1; i < rpds.length; i++) {
      const rowYear = rpds[i][3];  // ✅ FIXED: Index 3 untuk tahun (bukan 4)
      const kua = rpds[i][1];
      const rpdDataString = rpds[i][5];
      
      Logger.log('[EXPORT_RPD_DETAIL_YEAR] Row ' + i + ': KUA=' + kua + ', Year=' + rowYear + ', Filter=' + data.year);
      
      if (rowYear == data.year) {
        Logger.log('[EXPORT_RPD_DETAIL_YEAR] ✓ Year match! Adding KUA: ' + kua);
        kuaList.add(kua);
        
        if (!rpdByKUA[kua]) {
          rpdByKUA[kua] = {};
        }
        
        let rpdData = {};
        try {
          rpdData = JSON.parse(rpdDataString || '{}');
          Logger.log('[EXPORT_RPD_DETAIL_YEAR] Parsed data for ' + kua + ':', JSON.stringify(rpdData));
        } catch (parseError) {
          Logger.log('[EXPORT_RPD_DETAIL_YEAR] JSON parse error: ' + parseError.toString());
        }
        
        // Aggregate data per code and item
        Object.keys(rpdData).forEach(code => {
          if (!rpdByKUA[kua][code]) {
            rpdByKUA[kua][code] = {};
          }
          Object.keys(rpdData[code]).forEach(item => {
            if (!rpdByKUA[kua][code][item]) {
              rpdByKUA[kua][code][item] = 0;
            }
            rpdByKUA[kua][code][item] += parseFloat(rpdData[code][item]) || 0;
          });
        });
      }
    }
    
    const sortedKUAs = Array.from(kuaList).sort();
    
    Logger.log('[EXPORT_RPD_DETAIL_YEAR] Total KUAs found: ' + sortedKUAs.length);
    Logger.log('[EXPORT_RPD_DETAIL_YEAR] KUAs: ' + JSON.stringify(sortedKUAs));
    
    if (sortedKUAs.length === 0) {
      Logger.log('[EXPORT_RPD_DETAIL_YEAR] WARNING: No RPD data found for year ' + data.year);
      return errorResponse('Tidak ada data RPD untuk tahun ' + data.year);
    }
    
    if (data.format === 'pdf') {
      return exportRPDDetailYearPDF(rpdByKUA, sortedKUAs, data.year);
    } else {
      return exportRPDDetailYearExcel(rpdByKUA, sortedKUAs, data.year);
    }
  } catch (error) {
    Logger.log('[EXPORT_RPD_DETAIL_YEAR ERROR] ' + error.toString());
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRPDDetailYearExcel(rpdByKUA, kuaList, year) {
  Logger.log('[EXPORT_RPD_DETAIL_YEAR_EXCEL] Starting export for year: ' + year);
  Logger.log('[EXPORT_RPD_DETAIL_YEAR_EXCEL] KUA count: ' + kuaList.length);
  
  let tsv = `LAPORAN RPD DETAIL - TAHUN ${year}\n`;
  tsv += `Kementerian Agama Kabupaten Indramayu\n\n`;
  
  // ✅ FIX #4: Header dengan kolom KUA
  tsv += `No\tKode\tUraian Program/Kegiatan/Output/Komponen`;
  kuaList.forEach(kua => {
    tsv += `\t${kua}`;
  });
  tsv += `\tJUMLAH\n`;
  
  let rowNum = 0;
  let grandTotal = {};
  kuaList.forEach(kua => { grandTotal[kua] = 0; });
  let grandTotalAll = 0;
  
  // Header row
  rowNum++;
  tsv += `${rowNum}\t025.04.WA\tDukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Bimas Islam`;
  kuaList.forEach(() => tsv += `\t`);
  tsv += `\t\n`;
  
  // ✅ FIX #4: Iterasi setiap parameter dan tampilkan nilai per KUA
  Object.keys(BOP_CONFIG.RPD_PARAMETERS).forEach(code => {
    const config = BOP_CONFIG.RPD_PARAMETERS[code];
    
    // Calculate totals
    let codeTotal = {};
    kuaList.forEach(kua => { codeTotal[kua] = 0; });
    let codeTotalAll = 0;
    
    config.items.forEach(item => {
      kuaList.forEach(kua => {
        const value = (rpdByKUA[kua] && rpdByKUA[kua][code] && rpdByKUA[kua][code][item]) || 0;
        codeTotal[kua] += value;
        codeTotalAll += value;
      });
    });
    
    // Header row for parameter
    tsv += `\t${code}\t${config.name}`;
    kuaList.forEach(kua => {
      if (config.hasSubItems) {
        tsv += `\t`;  // Empty for codes with breakdown
      } else {
        tsv += `\t${codeTotal[kua]}`;  // Show total for codes without breakdown
      }
    });
    if (config.hasSubItems) {
      tsv += `\t\n`;
    } else {
      tsv += `\t${codeTotalAll}\n`;
      // Add to grand total for non-breakdown items
      kuaList.forEach(kua => {
        grandTotal[kua] += codeTotal[kua];
      });
    }
    grandTotalAll += codeTotalAll;
    
    // Sub-items
    if (config.hasSubItems) {
      config.items.forEach((item, idx) => {
        const prefix = String.fromCharCode(97 + idx);
        tsv += `\t\t  ${prefix}. ${item}`;
        
        let itemTotal = 0;
        kuaList.forEach(kua => {
          const value = (rpdByKUA[kua] && rpdByKUA[kua][code] && rpdByKUA[kua][code][item]) || 0;
          tsv += `\t${value}`;
          itemTotal += value;
          grandTotal[kua] += value;
        });
        tsv += `\t${itemTotal}\n`;
      });
    }
  });
  
  // Grand total row
  tsv += `JUMLAH\t\t`;
  kuaList.forEach(kua => {
    tsv += `\t${grandTotal[kua]}`;
  });
  tsv += `\t${grandTotalAll}\n`;
  
  const blob = Utilities.newBlob(tsv, 'text/tab-separated-values');
  const base64 = Utilities.base64Encode(blob.getBytes());
  
  Logger.log('[EXPORT_RPD_DETAIL_YEAR_EXCEL] Export completed');
  return successResponse({
    fileData: base64,
    fileName: `Laporan_RPD_Detail_${year}.xls`,
    mimeType: 'application/vnd.ms-excel'
  });
}

function exportRPDDetailYearPDF(rpdByKUA, kuaList, year) {
  Logger.log('[EXPORT_RPD_DETAIL_YEAR_PDF] Starting PDF export for year: ' + year);
  Logger.log('[EXPORT_RPD_DETAIL_YEAR_PDF] KUA count: ' + kuaList.length);
  
  // ✅ FIX ISSUE #5: Jika KUA terlalu banyak, split ke multiple pages
  const MAX_KUA_PER_PAGE = 10;  // Maksimal 10 KUA per halaman
  const totalPages = Math.ceil(kuaList.length / MAX_KUA_PER_PAGE);
  
  Logger.log('[EXPORT_RPD_DETAIL_YEAR_PDF] Will create ' + totalPages + ' page(s)');
  
  let allPagesHTML = '';
  
  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const startIdx = pageNum * MAX_KUA_PER_PAGE;
    const endIdx = Math.min(startIdx + MAX_KUA_PER_PAGE, kuaList.length);
    const pageKUAs = kuaList.slice(startIdx, endIdx);
    
    Logger.log('[EXPORT_RPD_DETAIL_YEAR_PDF] Page ' + (pageNum + 1) + ': KUAs ' + (startIdx + 1) + ' to ' + endIdx);
    
    // ✅ Generate HTML untuk satu halaman
    const pageHTML = generateRPDDetailPage(rpdByKUA, pageKUAs, year, pageNum + 1, totalPages);
    allPagesHTML += pageHTML;
    
    // ✅ Tambahkan page break kecuali halaman terakhir
    if (pageNum < totalPages - 1) {
      allPagesHTML += '<div style="page-break-after: always;"></div>';
    }
  }
  
  // ✅ Wrap semua pages dalam HTML complete
  const html = `<html><head><style>
    @page {
      size: A3 landscape;
      margin: 12mm 10mm;
    }
    body { 
      font-family: 'Arial', sans-serif; 
      font-size: 8pt;
      margin: 0;
      padding: 0;
    }
    h3 { 
      text-align: center; 
      margin: 5px 0 3px 0;
      font-size: 13pt;
      font-weight: bold;
    }
    h4 { 
      text-align: center; 
      margin: 0 0 8px 0;
      font-size: 10pt;
      font-weight: normal;
    }
    .page-info {
      text-align: center;
      font-size: 9pt;
      color: #666;
      margin-bottom: 8px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 8px;
      table-layout: fixed;
    }
    th, td { 
      border: 1px solid #333;
      padding: 4px 3px;
      text-align: center;
      word-wrap: break-word;
      overflow: hidden;
    }
    th { 
      background-color: #4CAF50;
      color: white; 
      font-weight: bold;
      font-size: 8pt;
      padding: 5px 3px;
    }
    td {
      font-size: 7pt;
    }
    .left { 
      text-align: left; 
      padding-left: 5px;
    }
    .code { 
      font-weight: bold; 
      font-size: 7pt;
    }
    .subitem { 
      padding-left: 15px; 
      text-align: left;
      font-size: 7pt;
    }
    .total { 
      background-color: #f0f0f0; 
      font-weight: bold; 
    }
    .amount {
      font-family: 'Courier New', monospace;
      text-align: right;
      padding-right: 5px;
    }
    .kua-col {
      font-size: 7pt;
    }
  </style></head><body>
    ${allPagesHTML}
  </body></html>`;
  
  const blob = Utilities.newBlob(html, 'text/html');
  const pdfBlob = blob.getAs('application/pdf');
  const base64 = Utilities.base64Encode(pdfBlob.getBytes());
  
  Logger.log('[EXPORT_RPD_DETAIL_YEAR_PDF] Export completed with ' + totalPages + ' page(s)');
  return successResponse({
    fileData: base64,
    fileName: `Laporan_RPD_Detail_${year}.pdf`,
    mimeType: 'application/pdf'
  });
}

function generateRPDDetailPage(rpdByKUA, kuaList, year, pageNum, totalPages) {
  let html = `
    <h3>LAPORAN RPD DETAIL - TAHUN ${year}</h3>
    <h4>Kementerian Agama Kabupaten Indramayu</h4>
    <div class="page-info">Halaman ${pageNum} dari ${totalPages}</div>
    <table>
      <thead>
        <tr>
          <th style="width: 3%;">No</th>
          <th style="width: 6%;">Kode</th>
          <th style="width: 20%;">Uraian Program/Kegiatan/Output/Komponen</th>`;
  
  // ✅ Kolom KUA dengan width dinamis
  const kuaColWidth = Math.floor(65 / kuaList.length);
  kuaList.forEach(kua => {
    const shortName = kua.replace('KUA ', '');
    html += `<th class="kua-col" style="width: ${kuaColWidth}%;">${shortName}</th>`;
  });
  
  html += `<th style="width: 6%;">JUMLAH</th>
        </tr>
      </thead>
      <tbody>`;
  
  let rowNum = 0;
  let grandTotal = {};
  kuaList.forEach(kua => { grandTotal[kua] = 0; });
  let grandTotalAll = 0;
  
  // Header row
  rowNum++;
  html += `<tr>
    <td>${rowNum}</td>
    <td class="code">025.04.WA</td>
    <td class="left">Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Bimas Islam</td>`;
  kuaList.forEach(() => html += `<td></td>`);
  html += `<td></td></tr>`;
  
  // Iterasi parameter
  Object.keys(BOP_CONFIG.RPD_PARAMETERS).forEach(code => {
    const config = BOP_CONFIG.RPD_PARAMETERS[code];
    
    let codeTotal = {};
    kuaList.forEach(kua => { codeTotal[kua] = 0; });
    let codeTotalAll = 0;
    
    // Calculate totals
    config.items.forEach(item => {
      kuaList.forEach(kua => {
        const value = (rpdByKUA[kua] && rpdByKUA[kua][code] && rpdByKUA[kua][code][item]) || 0;
        codeTotal[kua] += value;
        codeTotalAll += value;
      });
    });
    
    // Parent row
    html += `<tr>
      <td></td>
      <td class="code">${code}</td>
      <td class="left">${config.name}</td>`;
    
    kuaList.forEach(kua => {
      if (config.hasSubItems) {
        html += `<td></td>`;
      } else {
        html += `<td class="amount">${formatNumber(codeTotal[kua])}</td>`;
        grandTotal[kua] += codeTotal[kua];
      }
    });
    
    if (config.hasSubItems) {
      html += `<td></td></tr>`;
    } else {
      html += `<td class="amount total">${formatNumber(codeTotalAll)}</td></tr>`;
    }
    
    grandTotalAll += codeTotalAll;
    
    // Sub-items
    if (config.hasSubItems) {
      config.items.forEach((item, idx) => {
        const prefix = String.fromCharCode(97 + idx);
        
        html += `<tr>
          <td></td>
          <td></td>
          <td class="subitem">${prefix}. ${item}</td>`;
        
        let itemTotal = 0;
        kuaList.forEach(kua => {
          const value = (rpdByKUA[kua] && rpdByKUA[kua][code] && rpdByKUA[kua][code][item]) || 0;
          html += `<td class="amount">${formatNumber(value)}</td>`;
          itemTotal += value;
          grandTotal[kua] += value;
        });
        
        html += `<td class="amount">${formatNumber(itemTotal)}</td></tr>`;
      });
    }
  });
  
  // Grand total row
  html += `<tr class="total">
    <td colspan="3" style="text-align: center; font-weight: bold;">JUMLAH (Halaman ${pageNum})</td>`;
  kuaList.forEach(kua => {
    html += `<td class="amount">${formatNumber(grandTotal[kua])}</td>`;
  });
  html += `<td class="amount" style="font-size: 8pt;">${formatNumber(grandTotalAll)}</td>
  </tr>`;
  
  html += `</tbody></table>`;
  
  return html;
}

// 3. Export Realisasi per Year
function exportRealisasiPerYear(data) {
  Logger.log('[EXPORT_REALISASI_PER_YEAR] Format: ' + data.format + ', KUA: ' + data.kua + ', Year: ' + data.year);
  
  try {
    const budgetSheet = getSheet(SHEETS.BUDGET);
    const realisasiSheet = getSheet(SHEETS.REALISASI);
    
    const budgets = budgetSheet.getDataRange().getValues();
    const realisasis = realisasiSheet.getDataRange().getValues();
    
    Logger.log('[EXPORT_REALISASI_PER_YEAR] Total budgets: ' + (budgets.length - 1));
    Logger.log('[EXPORT_REALISASI_PER_YEAR] Total realisasis: ' + (realisasis.length - 1));
    
    const yearBudgets = [];
    for (let i = 1; i < budgets.length; i++) {
      if (budgets[i][2] == data.year) {
        if (!data.kua || budgets[i][1] === data.kua) {
          yearBudgets.push({
            kua: budgets[i][1],
            budget: parseFloat(budgets[i][3]) || 0
          });
        }
      }
    }
    
    const result = yearBudgets.map(b => {
      const row = {
        kua: b.kua,
        budget: b.budget,
        months: {}
      };
      
      MONTHS.forEach(month => {
        row.months[month] = 0;
      });
      
      // ✅ FIX: Kolom yang benar dan filter status
      // Realisasi Sheet: A=ID, B=KUA, C=Bulan, D=RPD_ID, E=Tahun, F=Total, G=Data, H=Files, I=Status
      for (let i = 1; i < realisasis.length; i++) {
        const kua = realisasis[i][1];        // B: KUA
        const month = realisasis[i][2];      // C: Bulan
        const year = realisasis[i][4];       // E: Tahun
        const total = parseFloat(realisasis[i][5]) || 0;  // F: Total ✅
        const status = realisasis[i][8];     // I: Status
        
        // ✅ Hanya hitung realisasi yang sudah Diterima
        if (kua === b.kua && year == data.year && normalizeStatus(status) === 'Approved') {
          Logger.log('[EXPORT_REALISASI_PER_YEAR] Realisasi found: ' + kua + ' - ' + month + ' = ' + total);
          row.months[month] += total;
        }
      }
      
      row.totalRealisasi = Object.values(row.months).reduce((sum, val) => sum + val, 0);
      row.sisa = b.budget - row.totalRealisasi;
      
      Logger.log('[EXPORT_REALISASI_PER_YEAR] Result for ' + b.kua + ': totalRealisasi=' + row.totalRealisasi);
      
      return row;
    });
    
    if (data.format === 'pdf') {
      return exportRealisasiPerYearPDF(result, data.year, data.kua);
    } else {
      return exportRealisasiPerYearExcel(result, data.year, data.kua);
    }
  } catch (error) {
    Logger.log('[EXPORT_REALISASI_PER_YEAR ERROR] ' + error.toString());
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRealisasiPerYearExcel(data, year, kua) {
  let tsv = `LAPORAN REALISASI PER TAHUN ${year}\n`;
  if (kua) tsv += `KUA: ${kua}\n`;
  tsv += `\nNo\tKUA\tBudget\t`;
  
  MONTHS.forEach(month => {
    tsv += `${month}\t`;
  });
  tsv += `Total Realisasi\tSisa\n`;
  
  data.forEach((row, index) => {
    tsv += `${index + 1}\t${row.kua}\t${row.budget}\t`;
    MONTHS.forEach(month => {
      tsv += `${row.months[month]}\t`;
    });
    tsv += `${row.totalRealisasi}\t${row.sisa}\n`;
  });
  
  const blob = Utilities.newBlob(tsv, 'text/tab-separated-values');
  const base64 = Utilities.base64Encode(blob.getBytes());
  
  Logger.log('[EXPORT_REALISASI_PER_YEAR_EXCEL] Export completed');
  return successResponse({
    fileData: base64,
    fileName: `Laporan_Realisasi_${year}${kua ? '_' + kua : ''}.xls`,
    mimeType: 'application/vnd.ms-excel'
  });
}

function exportRealisasiPerYearPDF(data, year, kua) {
  let html = `<html><head><style>
    body { font-family: Arial; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #000; padding: 5px; text-align: center; }
    th { background: #dc3545; color: white; }
  </style></head><body>
  <h3 style="text-align:center">LAPORAN REALISASI PER TAHUN ${year}</h3>`;
  
  if (kua) html += `<p style="text-align:center">KUA: ${kua}</p>`;
  
  html += `<table><tr><th>No</th><th>KUA</th><th>Budget</th>`;
  
  MONTHS.forEach(month => {
    html += `<th>${month}</th>`;
  });
  html += `<th>Total Realisasi</th><th>Sisa</th></tr>`;
  
  data.forEach((row, index) => {
    html += `<tr><td>${index + 1}</td><td>${row.kua}</td><td>${formatCurrency(row.budget)}</td>`;
    MONTHS.forEach(month => {
      html += `<td>${formatCurrency(row.months[month])}</td>`;
    });
    html += `<td>${formatCurrency(row.totalRealisasi)}</td><td>${formatCurrency(row.sisa)}</td></tr>`;
  });
  
  html += `</table></body></html>`;
  
  const blob = Utilities.newBlob(html, 'text/html');
  const pdfBlob = blob.getAs('application/pdf');
  const base64 = Utilities.base64Encode(pdfBlob.getBytes());
  
  Logger.log('[EXPORT_REALISASI_PER_YEAR_PDF] Export completed');
  return successResponse({
    fileData: base64,
    fileName: `Laporan_Realisasi_${year}${kua ? '_' + kua : ''}.pdf`,
    mimeType: 'application/pdf'
  });
}

// 4. Export Realisasi Detail Year - CORRECTED FORMAT
function exportRealisasiDetailYear(data) {
  Logger.log('[EXPORT_REALISASI_DETAIL_YEAR] Format: ' + data.format + ', Year: ' + data.year);
  
  try {
    const realisasiSheet = getSheet(SHEETS.REALISASI);
    const realisasis = realisasiSheet.getDataRange().getValues();
    
    const realisasiByKUA = {};
    const kuaList = new Set();
    
    // ✅ Sama seperti RPD, kumpulkan data per KUA
    for (let i = 1; i < realisasis.length; i++) {
      const year = realisasis[i][4];       // E: Tahun
      const status = realisasis[i][8];     // I: Status
      
      // ✅ Hanya ambil yang sudah Diterima
      if (year == data.year && normalizeStatus(status) === 'Approved') {
        const kua = realisasis[i][1];      // B: KUA
        kuaList.add(kua);
        
        if (!realisasiByKUA[kua]) {
          realisasiByKUA[kua] = {};
        }
        
        let realisasiData = {};
        try {
          realisasiData = JSON.parse(realisasis[i][6] || '{}');  // G: Data ✅
        } catch (parseError) {
          Logger.log('[EXPORT_REALISASI_DETAIL_YEAR] JSON parse error: ' + parseError.toString());
        }
        
        // Akumulasi per kode dan item
        Object.keys(realisasiData).forEach(code => {
          if (!realisasiByKUA[kua][code]) {
            realisasiByKUA[kua][code] = {};
          }
          Object.keys(realisasiData[code]).forEach(item => {
            if (!realisasiByKUA[kua][code][item]) {
              realisasiByKUA[kua][code][item] = 0;
            }
            realisasiByKUA[kua][code][item] += parseFloat(realisasiData[code][item]) || 0;
          });
        });
      }
    }
    
    const sortedKUAs = Array.from(kuaList).sort();
    
    Logger.log('[EXPORT_REALISASI_DETAIL_YEAR] Total KUAs: ' + sortedKUAs.length);
    
    if (data.format === 'pdf') {
      return exportRealisasiDetailYearPDF(realisasiByKUA, sortedKUAs, data.year);
    } else {
      return exportRealisasiDetailYearExcel(realisasiByKUA, sortedKUAs, data.year);
    }
  } catch (error) {
    Logger.log('[EXPORT_REALISASI_DETAIL_YEAR ERROR] ' + error.toString());
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRealisasiDetailYearExcel(realisasiByKUA, kuaList, year) {
  Logger.log('[EXPORT_REALISASI_DETAIL_YEAR_EXCEL] Starting export');
  
  let tsv = `LAPORAN REALISASI DETAIL - TAHUN ${year}\n`;
  tsv += `Kementerian Agama Kabupaten Indramayu\n\n`;
  
  // Header
  tsv += `No\tKode\tUraian`;
  kuaList.forEach(kua => tsv += `\t${kua}`);
  tsv += `\tJUMLAH\n`;
  
  let rowNum = 0;
  let grandTotal = {};
  kuaList.forEach(kua => { grandTotal[kua] = 0; });
  let grandTotalAll = 0;
  
  // Header row
  rowNum++;
  tsv += `${rowNum}\t025.04.WA\tDukungan Manajemen...`;
  kuaList.forEach(() => tsv += `\t`);
  tsv += `\t\n`;
  
  Object.keys(BOP_CONFIG.RPD_PARAMETERS).forEach(code => {
    const config = BOP_CONFIG.RPD_PARAMETERS[code];
    
    let codeTotal = {};
    kuaList.forEach(kua => { codeTotal[kua] = 0; });
    let codeTotalAll = 0;
    
    config.items.forEach(item => {
      kuaList.forEach(kua => {
        const value = (realisasiByKUA[kua] && realisasiByKUA[kua][code] && realisasiByKUA[kua][code][item]) || 0;
        codeTotal[kua] += value;
        codeTotalAll += value;
      });
    });
    
    // Parent row
    rowNum++;
    tsv += `${rowNum}\t${code}\t${config.name}`;
    
    kuaList.forEach(kua => {
      if (config.hasSubItems) {
        tsv += `\t`;
      } else {
        // ✅ CRITICAL: GUNAKAN VALUE ASLI, JANGAN FORMAT!
        tsv += `\t${codeTotal[kua]}`;  // ✅ BUKAN formatNumber()!
        grandTotal[kua] += codeTotal[kua];
      }
    });
    
    if (config.hasSubItems) {
      tsv += `\t\n`;
    } else {
      tsv += `\t${codeTotalAll}\n`;  // ✅ VALUE ASLI
    }
    
    grandTotalAll += codeTotalAll;
    
    // Sub-items
    if (config.hasSubItems) {
      config.items.forEach((item, idx) => {
        const prefix = String.fromCharCode(97 + idx);
        
        rowNum++;
        tsv += `${rowNum}\t\t${prefix}. ${item}`;
        
        let itemTotal = 0;
        kuaList.forEach(kua => {
          const value = (realisasiByKUA[kua] && realisasiByKUA[kua][code] && realisasiByKUA[kua][code][item]) || 0;
          tsv += `\t${value}`;  // ✅ VALUE ASLI, TIDAK DIFORMAT
          itemTotal += value;
          grandTotal[kua] += value;
        });
        
        tsv += `\t${itemTotal}\n`;
      });
    }
  });
  
  // Grand total
  tsv += `\t\tJUMLAH`;
  kuaList.forEach(kua => {
    tsv += `\t${grandTotal[kua]}`;  // ✅ VALUE ASLI
  });
  tsv += `\t${grandTotalAll}\n`;
  
  const blob = Utilities.newBlob(tsv, 'text/tab-separated-values');
  const base64 = Utilities.base64Encode(blob.getBytes());
  
  return successResponse({
    fileData: base64,
    fileName: `Laporan_Realisasi_Detail_${year}.xls`,
    mimeType: 'application/vnd.ms-excel'
  });
}

function exportRealisasiDetailYearPDF(realisasiByKUA, kuaList, year) {
  Logger.log('[EXPORT_REALISASI_DETAIL_YEAR_PDF] Starting PDF export for year: ' + year);
  Logger.log('[EXPORT_REALISASI_DETAIL_YEAR_PDF] KUA count: ' + kuaList.length);
  
  // ✅ FIX ISSUE #5: Split ke multiple pages jika KUA terlalu banyak
  const MAX_KUA_PER_PAGE = 10;
  const totalPages = Math.ceil(kuaList.length / MAX_KUA_PER_PAGE);
  
  Logger.log('[EXPORT_REALISASI_DETAIL_YEAR_PDF] Will create ' + totalPages + ' page(s)');
  
  let allPagesHTML = '';
  
  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const startIdx = pageNum * MAX_KUA_PER_PAGE;
    const endIdx = Math.min(startIdx + MAX_KUA_PER_PAGE, kuaList.length);
    const pageKUAs = kuaList.slice(startIdx, endIdx);
    
    const pageHTML = generateRealisasiDetailPage(realisasiByKUA, pageKUAs, year, pageNum + 1, totalPages);
    allPagesHTML += pageHTML;
    
    if (pageNum < totalPages - 1) {
      allPagesHTML += '<div style="page-break-after: always;"></div>';
    }
  }
  
  const html = `<html><head><style>
    @page {
      size: A3 landscape;
      margin: 12mm 10mm;
    }
    body { 
      font-family: 'Arial', sans-serif; 
      font-size: 8pt;
      margin: 0;
      padding: 0;
    }
    h3 { 
      text-align: center; 
      margin: 5px 0 3px 0;
      font-size: 13pt;
      font-weight: bold;
    }
    h4 { 
      text-align: center; 
      margin: 0 0 8px 0;
      font-size: 10pt;
      font-weight: normal;
    }
    .page-info {
      text-align: center;
      font-size: 9pt;
      color: #666;
      margin-bottom: 8px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 8px;
      table-layout: fixed;
    }
    th, td { 
      border: 1px solid #333;
      padding: 4px 3px;
      text-align: center;
      word-wrap: break-word;
      overflow: hidden;
    }
    th { 
      background-color: #dc3545;
      color: white; 
      font-weight: bold;
      font-size: 8pt;
      padding: 5px 3px;
    }
    td {
      font-size: 7pt;
    }
    .left { 
      text-align: left; 
      padding-left: 5px;
    }
    .code { 
      font-weight: bold; 
      font-size: 7pt;
    }
    .subitem { 
      padding-left: 15px; 
      text-align: left;
      font-size: 7pt;
    }
    .total { 
      background-color: #f0f0f0; 
      font-weight: bold; 
    }
    .amount {
      font-family: 'Courier New', monospace;
      text-align: right;
      padding-right: 5px;
    }
    .kua-col {
      font-size: 7pt;
    }
  </style></head><body>
    ${allPagesHTML}
  </body></html>`;
  
  const blob = Utilities.newBlob(html, 'text/html');
  const pdfBlob = blob.getAs('application/pdf');
  const base64 = Utilities.base64Encode(pdfBlob.getBytes());
  
  Logger.log('[EXPORT_REALISASI_DETAIL_YEAR_PDF] Export completed with ' + totalPages + ' page(s)');
  return successResponse({
    fileData: base64,
    fileName: `Laporan_Realisasi_Detail_${year}.pdf`,
    mimeType: 'application/pdf'
  });
}

function generateRealisasiDetailPage(realisasiByKUA, kuaList, year, pageNum, totalPages) {
  let html = `
    <h3>LAPORAN REALISASI DETAIL - TAHUN ${year}</h3>
    <h4>Kementerian Agama Kabupaten Indramayu</h4>
    <div class="page-info">Halaman ${pageNum} dari ${totalPages}</div>
    <table>
      <thead>
        <tr>
          <th style="width: 3%;">No</th>
          <th style="width: 6%;">Kode</th>
          <th style="width: 20%;">Uraian Program/Kegiatan/Output/Komponen</th>`;
  
  const kuaColWidth = Math.floor(65 / kuaList.length);
  kuaList.forEach(kua => {
    const shortName = kua.replace('KUA ', '');
    html += `<th class="kua-col" style="width: ${kuaColWidth}%;">${shortName}</th>`;
  });
  
  html += `<th style="width: 6%;">JUMLAH</th>
        </tr>
      </thead>
      <tbody>`;
  
  let rowNum = 0;
  let grandTotal = {};
  kuaList.forEach(kua => { grandTotal[kua] = 0; });
  let grandTotalAll = 0;
  
  rowNum++;
  html += `<tr>
    <td>${rowNum}</td>
    <td class="code">025.04.WA</td>
    <td class="left">Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Bimas Islam</td>`;
  kuaList.forEach(() => html += `<td></td>`);
  html += `<td></td></tr>`;
  
  Object.keys(BOP_CONFIG.RPD_PARAMETERS).forEach(code => {
    const config = BOP_CONFIG.RPD_PARAMETERS[code];
    
    let codeTotal = {};
    kuaList.forEach(kua => { codeTotal[kua] = 0; });
    let codeTotalAll = 0;
    
    config.items.forEach(item => {
      kuaList.forEach(kua => {
        const value = (realisasiByKUA[kua] && realisasiByKUA[kua][code] && realisasiByKUA[kua][code][item]) || 0;
        codeTotal[kua] += value;
        codeTotalAll += value;
      });
    });
    
    html += `<tr>
      <td></td>
      <td class="code">${code}</td>
      <td class="left">${config.name}</td>`;
    
    kuaList.forEach(kua => {
      if (config.hasSubItems) {
        html += `<td></td>`;
      } else {
        html += `<td class="amount">${formatNumber(codeTotal[kua])}</td>`;
        grandTotal[kua] += codeTotal[kua];
      }
    });
    
    if (config.hasSubItems) {
      html += `<td></td></tr>`;
    } else {
      html += `<td class="amount total">${formatNumber(codeTotalAll)}</td></tr>`;
    }
    
    grandTotalAll += codeTotalAll;
    
    if (config.hasSubItems) {
      config.items.forEach((item, idx) => {
        const prefix = String.fromCharCode(97 + idx);
        
        html += `<tr>
          <td></td>
          <td></td>
          <td class="subitem">${prefix}. ${item}</td>`;
        
        let itemTotal = 0;
        kuaList.forEach(kua => {
          const value = (realisasiByKUA[kua] && realisasiByKUA[kua][code] && realisasiByKUA[kua][code][item]) || 0;
          html += `<td class="amount">${formatNumber(value)}</td>`;
          itemTotal += value;
          grandTotal[kua] += value;
        });
        
        html += `<td class="amount">${formatNumber(itemTotal)}</td></tr>`;
      });
    }
  });
  
  html += `<tr class="total">
    <td colspan="3" style="text-align: center; font-weight: bold;">JUMLAH (Halaman ${pageNum})</td>`;
  kuaList.forEach(kua => {
    html += `<td class="amount">${formatNumber(grandTotal[kua])}</td>`;
  });
  html += `<td class="amount" style="font-size: 8pt;">${formatNumber(grandTotalAll)}</td>
  </tr>`;
  
  html += `</tbody></table>`;
  
  return html;
}

function uploadFile(data) {
  Logger.log('[UPLOAD_FILE] ========== START ==========');
  Logger.log('[UPLOAD_FILE] Filename: ' + data.filename);
  Logger.log('[UPLOAD_FILE] MIME Type: ' + data.mimeType);
  
  try {
    // Decode base64
    const fileBlob = Utilities.newBlob(
      Utilities.base64Decode(data.fileData),
      data.mimeType,
      data.filename
    );
    
    Logger.log('[UPLOAD_FILE] File blob created, size: ' + fileBlob.getBytes().length);
    
    // Get root folder
    const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    Logger.log('[UPLOAD_FILE] Root folder: ' + rootFolder.getName());
    
    // ✅ Create organized folder structure
    // Format: BOP_Uploads/YYYY/MM/
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    Logger.log('[UPLOAD_FILE] Creating folder structure: BOP_Uploads/' + year + '/' + month);
    
    // Get or create "BOP_Uploads" folder
    let uploadsFolder;
    const uploadsFolders = rootFolder.getFoldersByName('BOP_Uploads');
    if (uploadsFolders.hasNext()) {
      uploadsFolder = uploadsFolders.next();
      Logger.log('[UPLOAD_FILE] Found existing BOP_Uploads folder');
    } else {
      uploadsFolder = rootFolder.createFolder('BOP_Uploads');
      Logger.log('[UPLOAD_FILE] Created new BOP_Uploads folder');
    }
    
    // Get or create year folder
    let yearFolder;
    const yearFolders = uploadsFolder.getFoldersByName(year.toString());
    if (yearFolders.hasNext()) {
      yearFolder = yearFolders.next();
      Logger.log('[UPLOAD_FILE] Found existing year folder: ' + year);
    } else {
      yearFolder = uploadsFolder.createFolder(year.toString());
      Logger.log('[UPLOAD_FILE] Created new year folder: ' + year);
    }
    
    // Get or create month folder
    let monthFolder;
    const monthFolders = yearFolder.getFoldersByName(month);
    if (monthFolders.hasNext()) {
      monthFolder = monthFolders.next();
      Logger.log('[UPLOAD_FILE] Found existing month folder: ' + month);
    } else {
      monthFolder = yearFolder.createFolder(month);
      Logger.log('[UPLOAD_FILE] Created new month folder: ' + month);
    }
    
    // ✅ Generate unique filename
    // Format: timestamp_originalname
    const timestamp = Date.now();
    const extension = data.filename.includes('.') ? 
      data.filename.substring(data.filename.lastIndexOf('.')) : '';
    const basename = data.filename.includes('.') ?
      data.filename.substring(0, data.filename.lastIndexOf('.')) : data.filename;
    
    const uniqueFilename = timestamp + '_' + basename + extension;
    
    Logger.log('[UPLOAD_FILE] Unique filename: ' + uniqueFilename);
    Logger.log('[UPLOAD_FILE] Upload path: BOP_Uploads/' + year + '/' + month + '/' + uniqueFilename);
    
    // Create file in month folder
    const file = monthFolder.createFile(fileBlob);
    file.setName(uniqueFilename);
    file.setDescription('Uploaded: ' + now.toISOString() + '\nOriginal: ' + data.filename);
    
    // Set sharing to anyone with link can view
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const fileId = file.getId();
    const fileUrl = file.getUrl();
    const fileSize = file.getSize();
    
    Logger.log('[UPLOAD_FILE] ✅ File uploaded successfully');
    Logger.log('[UPLOAD_FILE] File ID: ' + fileId);
    Logger.log('[UPLOAD_FILE] File URL: ' + fileUrl);
    Logger.log('[UPLOAD_FILE] File Size: ' + fileSize + ' bytes');
    
    return successResponse({
      id: fileId,
      name: uniqueFilename,           // ✅ Unique name
      originalName: data.filename,    // ✅ Original name
      url: fileUrl,
      mimeType: data.mimeType,
      size: fileSize,
      uploadPath: 'BOP_Uploads/' + year + '/' + month + '/' + uniqueFilename
    });
    
  } catch (error) {
    Logger.log('[UPLOAD_FILE ERROR] ' + error.toString());
    Logger.log('[UPLOAD_FILE ERROR STACK] ' + error.stack);
    return errorResponse('Gagal upload file: ' + error.toString());
  }
}

function updateRPDConfig(data) {
  Logger.log('[UPDATE_RPD_CONFIG] Updating configuration...');
  Logger.log('[UPDATE_RPD_CONFIG] Config data:', JSON.stringify(data));
  
  try {
    const configSheet = getSheet(SHEETS.CONFIG);
    const configs = configSheet.getDataRange().getValues();
    
    // Config sheet structure: A=Key, B=Value, C=Description
    const configKeys = {
      'RPD_STATUS': data.RPD_STATUS || 'Terbuka',
      'REALISASI_STATUS': data.REALISASI_STATUS || 'Terbuka',
      'REALISASI_MAX_FILE_SIZE': data.REALISASI_MAX_FILE_SIZE || 5,
      'REALISASI_MAX_FILES': data.REALISASI_MAX_FILES || 5
    };
    
    Logger.log('[UPDATE_RPD_CONFIG] Config keys to update:', JSON.stringify(configKeys));
    
    // Update atau insert config
    Object.keys(configKeys).forEach(key => {
      let found = false;
      
      // Cari config yang sudah ada
      for (let i = 1; i < configs.length; i++) {
        if (configs[i][0] === key) {
          // Update existing config
          configSheet.getRange(i + 1, 2).setValue(configKeys[key]);
          Logger.log('[UPDATE_RPD_CONFIG] Updated ' + key + ' = ' + configKeys[key]);
          found = true;
          break;
        }
      }
      
      // Jika tidak ada, tambah baru
      if (!found) {
        const newRow = configs.length + 1;
        configSheet.getRange(newRow, 1).setValue(key);
        configSheet.getRange(newRow, 2).setValue(configKeys[key]);
        configSheet.getRange(newRow, 3).setValue('Auto-created config');
        Logger.log('[UPDATE_RPD_CONFIG] Created new ' + key + ' = ' + configKeys[key]);
      }
    });
    
    Logger.log('[UPDATE_RPD_CONFIG] Configuration updated successfully');
    return successResponse({ message: 'Konfigurasi berhasil diperbarui' });
    
  } catch (error) {
    Logger.log('[UPDATE_RPD_CONFIG ERROR] ' + error.toString());
    return errorResponse('Gagal memperbarui konfigurasi: ' + error.toString());
  }
}