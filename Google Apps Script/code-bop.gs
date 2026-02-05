// ===== GOOGLE APPS SCRIPT - BOP MODULE (COMPLETE FIXED VERSION) =====
// File: code-bop.gs
// Version: 4.0 - Complete with all fixes

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
  return new Intl.NumberFormat('id-ID').format(num);
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
    
    switch(action) {
      case 'getBudgets': 
        result = getBudgets(data);
        break;
      case 'saveBudget': 
        result = saveBudget(data);
        break;
      case 'deleteBudget': 
        result = deleteBudget(data);
        break;
      case 'getRPDs': 
        result = getRPDs(data);
        break;
      case 'saveRPD': 
        result = saveRPD(data);
        break;
      case 'deleteRPD': 
        result = deleteRPD(data);
        break;
      case 'getRealisasis': 
        result = getRealisasis(data);
        break;
      case 'saveRealisasi': 
        result = saveRealisasi(data);
        break;
      case 'deleteRealisasi': 
        result = deleteRealisasi(data);
        break;
      case 'verifyRealisasi': 
        result = verifyRealisasi(data);
        break;
      case 'getRPDConfig': 
        result = getRPDConfig(data);
        break;
      case 'saveRPDConfig': 
        result = saveRPDConfig(data);
        break;
      case 'getDashboardStats': 
        result = getDashboardStats(data);
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
        budgets.push({
          id: rows[i][0],
          kua: rows[i][1],
          year: rows[i][2],
          total: parseFloat(rows[i][3]) || 0,
          pagu: parseFloat(rows[i][4]) || 0,
          realisasi: parseFloat(rows[i][5]) || 0,
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
          sheet.getRange(i + 1, 4).setValue(parseFloat(data.total) || 0);
          sheet.getRange(i + 1, 5).setValue(parseFloat(data.pagu) || 0);
          sheet.getRange(i + 1, 8).setValue(now);
          Logger.log('[SAVE_BUDGET] Updated budget ID: ' + data.id);
          return successResponse({ message: 'Budget berhasil diupdate', id: data.id });
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
      const id = 'BDG-' + Date.now();
      sheet.appendRow([
        id,
        data.kua,
        parseInt(data.year),
        parseFloat(data.total) || 0,
        parseFloat(data.pagu) || 0,
        0, // realisasi
        now,
        now
      ]);
      
      Logger.log('[SAVE_BUDGET] Created new budget ID: ' + id);
      return successResponse({ message: 'Budget berhasil dibuat', id: id });
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
          (!data.year || rows[i][4] == data.year)) {
        
        let parsedData = {};
        try {
          parsedData = JSON.parse(rows[i][5] || '{}');
        } catch (parseError) {
          Logger.log('[GET_RPDS] JSON parse error for row ' + i + ': ' + parseError.toString());
        }
        
        rpds.push({
          id: rows[i][0],
          kua: rows[i][1],
          userId: rows[i][2],
          month: rows[i][3],
          year: rows[i][4],
          data: parsedData,
          total: parseFloat(rows[i][6]) || 0,
          createdAt: safeFormatDate(rows[i][7]),
          updatedAt: safeFormatDate(rows[i][8])
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
  Logger.log('[SAVE_RPD] Data received: ' + JSON.stringify(data).substring(0, 300));
  
  try {
    const sheet = getSheet(SHEETS.RPD);
    const rows = sheet.getDataRange().getValues();
    const now = new Date();
    
    if (data.id) {
      // Update existing
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          sheet.getRange(i + 1, 6).setValue(JSON.stringify(data.data));
          sheet.getRange(i + 1, 7).setValue(parseFloat(data.total) || 0);
          sheet.getRange(i + 1, 9).setValue(now);
          Logger.log('[SAVE_RPD] Updated RPD ID: ' + data.id);
          return successResponse({ message: 'RPD berhasil diupdate', id: data.id });
        }
      }
      Logger.log('[SAVE_RPD] RPD not found: ' + data.id);
      return errorResponse('RPD tidak ditemukan');
    } else {
      // Check duplicate
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1] === data.kua && 
            rows[i][3] === data.month && 
            rows[i][4] == data.year) {
          Logger.log('[SAVE_RPD] Duplicate found');
          return errorResponse('RPD untuk KUA, bulan dan tahun ini sudah ada');
        }
      }
      
      // Create new
      const id = 'RPD-' + Date.now();
      sheet.appendRow([
        id,
        data.kua,
        data.userId,
        data.month,
        parseInt(data.year),
        JSON.stringify(data.data),
        parseFloat(data.total) || 0,
        now,
        now
      ]);
      
      Logger.log('[SAVE_RPD] Created new RPD ID: ' + id);
      return successResponse({ message: 'RPD berhasil dibuat', id: id });
    }
  } catch (error) {
    Logger.log('[SAVE_RPD ERROR] ' + error.toString());
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
    
    for (let i = 1; i < rows.length; i++) {
      if ((!data.kua || rows[i][1] === data.kua) && 
          (!data.year || rows[i][4] == data.year)) {
        
        let parsedData = {};
        let parsedFiles = [];
        
        try {
          parsedData = JSON.parse(rows[i][6] || '{}');
        } catch (parseError) {
          Logger.log('[GET_REALISASIS] JSON parse error for data at row ' + i + ': ' + parseError.toString());
        }
        
        try {
          parsedFiles = JSON.parse(rows[i][10] || '[]');
        } catch (parseError) {
          Logger.log('[GET_REALISASIS] JSON parse error for files at row ' + i + ': ' + parseError.toString());
        }
        
        realisasis.push({
          id: rows[i][0],
          kua: rows[i][1],
          userId: rows[i][2],
          month: rows[i][3],
          year: rows[i][4],
          rpdId: rows[i][5],
          data: parsedData,
          total: parseFloat(rows[i][7]) || 0,
          status: rows[i][8] || 'Pending',
          catatan: rows[i][9] || '',
          files: parsedFiles,
          createdAt: safeFormatDate(rows[i][11]),
          updatedAt: safeFormatDate(rows[i][12])
        });
      }
    }
    
    Logger.log('[GET_REALISASIS] Found: ' + realisasis.length + ' realisasis');
    return successResponse(realisasis);
    
  } catch (error) {
    Logger.log('[GET_REALISASIS ERROR] ' + error.toString());
    Logger.log('[GET_REALISASIS ERROR STACK] ' + error.stack);
    return errorResponse('Gagal memuat realisasi: ' + error.toString());
  }
}

function saveRealisasi(data) {
  Logger.log('[SAVE_REALISASI] Files: ' + (data.files ? data.files.length : 0));
  
  try {
    const sheet = getSheet(SHEETS.REALISASI);
    const rows = sheet.getDataRange().getValues();
    const now = new Date();
    
    if (data.id) {
      // Update existing
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          sheet.getRange(i + 1, 7).setValue(JSON.stringify(data.data));
          sheet.getRange(i + 1, 8).setValue(parseFloat(data.total) || 0);
          sheet.getRange(i + 1, 11).setValue(JSON.stringify(data.files || []));
          sheet.getRange(i + 1, 13).setValue(now);
          Logger.log('[SAVE_REALISASI] Updated realisasi ID: ' + data.id);
          return successResponse({ message: 'Realisasi berhasil diupdate', id: data.id });
        }
      }
      Logger.log('[SAVE_REALISASI] Realisasi not found: ' + data.id);
      return errorResponse('Realisasi tidak ditemukan');
    } else {
      // Check duplicate
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1] === data.kua && 
            rows[i][3] === data.month && 
            rows[i][4] == data.year) {
          Logger.log('[SAVE_REALISASI] Duplicate found');
          return errorResponse('Realisasi untuk KUA, bulan dan tahun ini sudah ada');
        }
      }
      
      // Create new
      const id = 'REA-' + Date.now();
      sheet.appendRow([
        id,
        data.kua,
        data.userId,
        data.month,
        parseInt(data.year),
        data.rpdId || '',
        JSON.stringify(data.data),
        parseFloat(data.total) || 0,
        'Pending',
        '',
        JSON.stringify(data.files || []),
        now,
        now
      ]);
      
      Logger.log('[SAVE_REALISASI] Created new realisasi ID: ' + id);
      return successResponse({ message: 'Realisasi berhasil dibuat', id: id });
    }
  } catch (error) {
    Logger.log('[SAVE_REALISASI ERROR] ' + error.toString());
    return errorResponse('Gagal menyimpan realisasi: ' + error.toString());
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
        
        if (status === 'Diterima') {
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
        
        if (data.status === 'Diterima') {
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
          realisasiRows[i][8] === 'Diterima') {
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
  Logger.log('[GET_DASHBOARD_STATS] Role: ' + data.role + ', Year: ' + data.year);
  
  try {
    const budgetSheet = getSheet(SHEETS.BUDGET);
    const rpdSheet = getSheet(SHEETS.RPD);
    const realisasiSheet = getSheet(SHEETS.REALISASI);
    
    const budgets = budgetSheet.getDataRange().getValues();
    const rpds = rpdSheet.getDataRange().getValues();
    const realisasis = realisasiSheet.getDataRange().getValues();
    
    let stats = {
      totalBudget: 0,
      totalRPD: 0,
      totalRealisasi: 0,
      pendingVerifikasi: 0
    };
    
    for (let i = 1; i < budgets.length; i++) {
      if (budgets[i][2] == data.year) {
        if (data.role === 'Admin' || budgets[i][1] === data.kua) {
          stats.totalBudget += parseFloat(budgets[i][3]) || 0;
        }
      }
    }
    
    for (let i = 1; i < rpds.length; i++) {
      if (rpds[i][4] == data.year) {
        if (data.role === 'Admin' || rpds[i][1] === data.kua) {
          stats.totalRPD += parseFloat(rpds[i][6]) || 0;
        }
      }
    }
    
    for (let i = 1; i < realisasis.length; i++) {
      if (realisasis[i][4] == data.year) {
        if (data.role === 'Admin' || realisasis[i][1] === data.kua) {
          if (realisasis[i][8] === 'Diterima') {
            stats.totalRealisasi += parseFloat(realisasis[i][7]) || 0;
          }
          if (realisasis[i][8] === 'Pending') {
            stats.pendingVerifikasi++;
          }
        }
      }
    }
    
    Logger.log('[GET_DASHBOARD_STATS] Stats: ' + JSON.stringify(stats));
    return successResponse(stats);
  } catch (error) {
    Logger.log('[GET_DASHBOARD_STATS ERROR] ' + error.toString());
    return errorResponse('Gagal memuat statistik: ' + error.toString());
  }
}

// ===== CONFIG MANAGEMENT =====
function getRPDConfig(data) {
  Logger.log('[GET_RPD_CONFIG]');
  return successResponse(BOP_CONFIG.RPD_PARAMETERS);
}

function saveRPDConfig(data) {
  Logger.log('[SAVE_RPD_CONFIG] Config update not implemented');
  return errorResponse('Konfigurasi RPD tidak dapat diubah');
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
    
    const yearBudgets = [];
    for (let i = 1; i < budgets.length; i++) {
      if (budgets[i][2] == data.year) {
        if (!data.kua || budgets[i][1] === data.kua) {
          yearBudgets.push({
            kua: budgets[i][1],
            budget: budgets[i][3] || 0
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
      
      for (let i = 1; i < rpds.length; i++) {
        if (rpds[i][1] === b.kua && rpds[i][4] == data.year) {
          row.months[rpds[i][3]] = parseFloat(rpds[i][6]) || 0;
        }
      }
      
      row.totalRPD = Object.values(row.months).reduce((sum, val) => sum + val, 0);
      row.sisa = b.budget - row.totalRPD;
      
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
  let html = `<html><head><style>
    body { font-family: Arial; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #000; padding: 5px; text-align: center; }
    th { background: #28a745; color: white; }
  </style></head><body>
  <h3 style="text-align:center">LAPORAN RPD PER TAHUN ${year}</h3>`;
  
  if (kua) html += `<p style="text-align:center">KUA: ${kua}</p>`;
  
  html += `<table><tr><th>No</th><th>KUA</th><th>Budget</th>`;
  
  MONTHS.forEach(month => {
    html += `<th>${month}</th>`;
  });
  html += `<th>Total RPD</th><th>Sisa</th></tr>`;
  
  data.forEach((row, index) => {
    html += `<tr><td>${index + 1}</td><td>${row.kua}</td><td>${formatCurrency(row.budget)}</td>`;
    MONTHS.forEach(month => {
      html += `<td>${formatCurrency(row.months[month])}</td>`;
    });
    html += `<td>${formatCurrency(row.totalRPD)}</td><td>${formatCurrency(row.sisa)}</td></tr>`;
  });
  
  html += `</table></body></html>`;
  
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
    
    const rpdByKUA = {};
    const kuaList = new Set();
    
    for (let i = 1; i < rpds.length; i++) {
      if (rpds[i][4] == data.year) {
        const kua = rpds[i][1];
        kuaList.add(kua);
        
        if (!rpdByKUA[kua]) {
          rpdByKUA[kua] = {};
        }
        
        let rpdData = {};
        try {
          rpdData = JSON.parse(rpds[i][5] || '{}');
        } catch (parseError) {
          Logger.log('[EXPORT_RPD_DETAIL_YEAR] JSON parse error: ' + parseError.toString());
        }
        
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
  let tsv = `LAPORAN RPD DETAIL - TAHUN ${year}\n`;
  tsv += `Kementerian Agama Kabupaten Indramayu\n\n`;
  
  tsv += `No\tKode\tUraian Program/Kegiatan/Output/Komponen`;
  kuaList.forEach(kua => {
    tsv += `\t${kua}`;
  });
  tsv += `\tJUMLAH\n`;
  
  let rowNum = 0;
  let grandTotal = {};
  kuaList.forEach(kua => { grandTotal[kua] = 0; });
  let grandTotalAll = 0;
  
  rowNum++;
  tsv += `${rowNum}\t025.04.WA\tDukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Bimas Islam`;
  kuaList.forEach(() => tsv += `\t`);
  tsv += `\t\n`;
  
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
    
    // ✅ FIX: Show empty if hasSubItems, show total if not
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
    }
    grandTotalAll += codeTotalAll;
    
    // ✅ FIX: Only show sub-items if hasSubItems is true
    if (config.hasSubItems) {
      config.items.forEach((item, idx) => {
        const prefix = String.fromCharCode(97 + idx);
        tsv += `\t\t  ${prefix}. ${item}`;
        
        let itemTotal = 0;
        kuaList.forEach(kua => {
          const value = (rpdByKUA[kua] && rpdByKUA[kua][code] && rpdByKUA[kua][code][item]) || 0;
          tsv += `\t${value}`;
          itemTotal += value;
          grandTotal[kua] += value;  // Add to grand total here
        });
        tsv += `\t${itemTotal}\n`;
      });
    } else {
      // No sub-items, but still add to grand total
      kuaList.forEach(kua => {
        grandTotal[kua] += codeTotal[kua];
      });
    }
  });
  
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
  let html = `<html><head><style>
    body { font-family: Arial; font-size: 9px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #000; padding: 4px; text-align: center; }
    th { background: #28a745; color: white; font-weight: bold; }
    .left { text-align: left; }
    .code { font-weight: bold; }
    .subitem { padding-left: 20px; text-align: left; }
    .total { background: #f0f0f0; font-weight: bold; }
    h3 { text-align: center; margin-bottom: 5px; }
    h4 { text-align: center; margin-top: 0; margin-bottom: 20px; }
  </style></head><body>
  <h3>LAPORAN RPD DETAIL - TAHUN ${year}</h3>
  <h4>Kementerian Agama Kabupaten Indramayu</h4>
  <table>
    <tr>
      <th width="3%">No</th>
      <th width="8%">Kode</th>
      <th width="25%">Uraian Program/Kegiatan/Output/Komponen</th>`;
  
  kuaList.forEach(kua => {
    html += `<th>${kua.replace('KUA ', '')}</th>`;
  });
  html += `<th>JUMLAH</th></tr>`;
  
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
        const value = (rpdByKUA[kua] && rpdByKUA[kua][code] && rpdByKUA[kua][code][item]) || 0;
        codeTotal[kua] += value;
        codeTotalAll += value;
      });
    });
    
    html += `<tr>
      <td></td>
      <td class="code">${code}</td>
      <td class="left">${config.name}</td>`;
    
    kuaList.forEach(kua => {
      html += `<td>${formatNumber(codeTotal[kua])}</td>`;
      grandTotal[kua] += codeTotal[kua];
    });
    html += `<td class="total">${formatNumber(codeTotalAll)}</td></tr>`;
    grandTotalAll += codeTotalAll;
    
    config.items.forEach((item, idx) => {
      const prefix = String.fromCharCode(97 + idx);
      html += `<tr>
        <td></td>
        <td></td>
        <td class="subitem">${prefix}. ${item}</td>`;
      
      let itemTotal = 0;
      kuaList.forEach(kua => {
        const value = (rpdByKUA[kua] && rpdByKUA[kua][code] && rpdByKUA[kua][code][item]) || 0;
        html += `<td>${formatNumber(value)}</td>`;
        itemTotal += value;
      });
      html += `<td>${formatNumber(itemTotal)}</td></tr>`;
    });
  });
  
  html += `<tr class="total">
    <td colspan="3">JUMLAH</td>`;
  kuaList.forEach(kua => {
    html += `<td>${formatNumber(grandTotal[kua])}</td>`;
  });
  html += `<td>${formatNumber(grandTotalAll)}</td></tr>`;
  
  html += `</table></body></html>`;
  
  const blob = Utilities.newBlob(html, 'text/html');
  const pdfBlob = blob.getAs('application/pdf');
  const base64 = Utilities.base64Encode(pdfBlob.getBytes());
  
  Logger.log('[EXPORT_RPD_DETAIL_YEAR_PDF] Export completed');
  return successResponse({
    fileData: base64,
    fileName: `Laporan_RPD_Detail_${year}.pdf`,
    mimeType: 'application/pdf'
  });
}

// 3. Export Realisasi per Year
function exportRealisasiPerYear(data) {
  Logger.log('[EXPORT_REALISASI_PER_YEAR] Format: ' + data.format);
  
  try {
    const budgetSheet = getSheet(SHEETS.BUDGET);
    const realisasiSheet = getSheet(SHEETS.REALISASI);
    
    const budgets = budgetSheet.getDataRange().getValues();
    const realisasis = realisasiSheet.getDataRange().getValues();
    
    const yearBudgets = [];
    for (let i = 1; i < budgets.length; i++) {
      if (budgets[i][2] == data.year) {
        if (!data.kua || budgets[i][1] === data.kua) {
          yearBudgets.push({
            kua: budgets[i][1],
            budget: budgets[i][3] || 0
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
      
      for (let i = 1; i < realisasis.length; i++) {
        if (realisasis[i][1] === b.kua && 
            realisasis[i][4] == data.year && 
            realisasis[i][8] === 'Diterima') {
          row.months[realisasis[i][3]] += parseFloat(realisasis[i][7]) || 0;
        }
      }
      
      row.totalRealisasi = Object.values(row.months).reduce((sum, val) => sum + val, 0);
      row.sisa = b.budget - row.totalRealisasi;
      
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
    
    for (let i = 1; i < realisasis.length; i++) {
      if (realisasis[i][4] == data.year && realisasis[i][8] === 'Diterima') {
        const kua = realisasis[i][1];
        kuaList.add(kua);
        
        if (!realisasiByKUA[kua]) {
          realisasiByKUA[kua] = {};
        }
        
        let realisasiData = {};
        try {
          realisasiData = JSON.parse(realisasis[i][6] || '{}');
        } catch (parseError) {
          Logger.log('[EXPORT_REALISASI_DETAIL_YEAR] JSON parse error: ' + parseError.toString());
        }
        
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
  let tsv = `LAPORAN REALISASI DETAIL - TAHUN ${year}\n`;
  tsv += `Kementerian Agama Kabupaten Indramayu\n\n`;
  
  tsv += `No\tKode\tUraian Program/Kegiatan/Output/Komponen`;
  kuaList.forEach(kua => {
    tsv += `\t${kua}`;
  });
  tsv += `\tJUMLAH\n`;
  
  let rowNum = 0;
  let grandTotal = {};
  kuaList.forEach(kua => { grandTotal[kua] = 0; });
  let grandTotalAll = 0;
  
  rowNum++;
  tsv += `${rowNum}\t025.04.WA\tDukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Bimas Islam`;
  kuaList.forEach(() => tsv += `\t`);
  tsv += `\t\n`;
  
  Object.keys(BOP_CONFIG.RPD_PARAMETERS).forEach(code => {
    const config = BOP_CONFIG.RPD_PARAMETERS[code];
    
    tsv += `\t${code}\t${config.name}`;
    
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
    
    kuaList.forEach(kua => {
      tsv += `\t${codeTotal[kua]}`;
      grandTotal[kua] += codeTotal[kua];
    });
    tsv += `\t${codeTotalAll}\n`;
    grandTotalAll += codeTotalAll;
    
    config.items.forEach((item, idx) => {
      const prefix = String.fromCharCode(97 + idx);
      tsv += `\t\t  ${prefix}. ${item}`;
      
      let itemTotal = 0;
      kuaList.forEach(kua => {
        const value = (realisasiByKUA[kua] && realisasiByKUA[kua][code] && realisasiByKUA[kua][code][item]) || 0;
        tsv += `\t${value}`;
        itemTotal += value;
      });
      tsv += `\t${itemTotal}\n`;
    });
  });
  
  tsv += `JUMLAH\t\t`;
  kuaList.forEach(kua => {
    tsv += `\t${grandTotal[kua]}`;
  });
  tsv += `\t${grandTotalAll}\n`;
  
  const blob = Utilities.newBlob(tsv, 'text/tab-separated-values');
  const base64 = Utilities.base64Encode(blob.getBytes());
  
  Logger.log('[EXPORT_REALISASI_DETAIL_YEAR_EXCEL] Export completed');
  return successResponse({
    fileData: base64,
    fileName: `Laporan_Realisasi_Detail_${year}.xls`,
    mimeType: 'application/vnd.ms-excel'
  });
}

function exportRealisasiDetailYearPDF(realisasiByKUA, kuaList, year) {
  let html = `<html><head><style>
    body { font-family: Arial; font-size: 9px; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #000; padding: 4px; text-align: center; }
    th { background: #dc3545; color: white; font-weight: bold; }
    .left { text-align: left; }
    .code { font-weight: bold; }
    .subitem { padding-left: 20px; text-align: left; }
    .total { background: #f0f0f0; font-weight: bold; }
    h3 { text-align: center; margin-bottom: 5px; }
    h4 { text-align: center; margin-top: 0; margin-bottom: 20px; }
  </style></head><body>
  <h3>LAPORAN REALISASI DETAIL - TAHUN ${year}</h3>
  <h4>Kementerian Agama Kabupaten Indramayu</h4>
  <table>
    <tr>
      <th width="3%">No</th>
      <th width="8%">Kode</th>
      <th width="25%">Uraian Program/Kegiatan/Output/Komponen</th>`;
  
  kuaList.forEach(kua => {
    html += `<th>${kua.replace('KUA ', '')}</th>`;
  });
  html += `<th>JUMLAH</th></tr>`;
  
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
      html += `<td>${formatNumber(codeTotal[kua])}</td>`;
      grandTotal[kua] += codeTotal[kua];
    });
    html += `<td class="total">${formatNumber(codeTotalAll)}</td></tr>`;
    grandTotalAll += codeTotalAll;
    
    config.items.forEach((item, idx) => {
      const prefix = String.fromCharCode(97 + idx);
      html += `<tr>
        <td></td>
        <td></td>
        <td class="subitem">${prefix}. ${item}</td>`;
      
      let itemTotal = 0;
      kuaList.forEach(kua => {
        const value = (realisasiByKUA[kua] && realisasiByKUA[kua][code] && realisasiByKUA[kua][code][item]) || 0;
        html += `<td>${formatNumber(value)}</td>`;
        itemTotal += value;
      });
      html += `<td>${formatNumber(itemTotal)}</td></tr>`;
    });
  });
  
  html += `<tr class="total">
    <td colspan="3">JUMLAH</td>`;
  kuaList.forEach(kua => {
    html += `<td>${formatNumber(grandTotal[kua])}</td>`;
  });
  html += `<td>${formatNumber(grandTotalAll)}</td></tr>`;
  
  html += `</table></body></html>`;
  
  const blob = Utilities.newBlob(html, 'text/html');
  const pdfBlob = blob.getAs('application/pdf');
  const base64 = Utilities.base64Encode(pdfBlob.getBytes());
  
  Logger.log('[EXPORT_REALISASI_DETAIL_YEAR_PDF] Export completed');
  return successResponse({
    fileData: base64,
    fileName: `Laporan_Realisasi_Detail_${year}.pdf`,
    mimeType: 'application/pdf'
  });
}

function uploadFile(data) {
  Logger.log('[UPLOAD_FILE] Filename: ' + data.filename);
  
  try {
    if (!data.fileData || !data.filename) {
      return errorResponse('File data atau filename tidak ada');
    }
    
    const blob = Utilities.newBlob(
      Utilities.base64Decode(data.fileData),
      data.mimeType || 'application/octet-stream',
      data.filename
    );
    
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const file = folder.createFile(blob);
    
    const fileInfo = {
      id: file.getId(),
      name: file.getName(),
      url: file.getUrl(),
      size: file.getSize(),
      mimeType: file.getMimeType()
    };
    
    Logger.log('[UPLOAD_FILE] Success: ' + file.getId());
    return successResponse(fileInfo);
    
  } catch (error) {
    Logger.log('[UPLOAD_FILE ERROR] ' + error.toString());
    return errorResponse('Gagal upload file: ' + error.toString());
  }
}