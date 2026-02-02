// ===== GOOGLE APPS SCRIPT BACKEND =====
// File: Code.gs

// KONFIGURASI SPREADSHEET
const SS_ID = '1yz9IeOW9WSDRM9JHwBHYtwi5xmA9hIxJVFPX9G10pNw';
const DRIVE_FOLDER_ID = '11quguPvN4NvdhEZVhiE4gTCIFS9LWw_6';
const NAMA_KASI_BIMAS = 'H. ROSIDI, S.Ag., M.M';
const NIP_KASI_BIMAS = 'NIP: 19681230 199403 1 003';

// TAMBAHKAN INI - CONFIG RPD PARAMETERS
const CONFIG = {
  RPD_PARAMETERS: {
    '521111': {
      name: 'Belanja Operasional Perkantoran',
      items: ['ATK Kantor', 'Jamuan Tamu', 'Pramubakti', 'Alat Rumah Tangga Kantor']
    },
    '521211': {
      name: 'Belanja Bahan',
      items: ['Penggandaan / Penjilidan', 'Spanduk']
    },
    '522111': {
      name: 'Belanja Langganan Listrik',
      items: ['Nominal']
    },
    '522112': {
      name: 'Belanja Langganan Telepon / Internet',
      items: ['Nominal']
    },
    '522113': {
      name: 'Belanja Langganan Air',
      items: ['Nominal']
    },
    '523111': {
      name: 'Belanja Pemeliharaan Gedung dan Bangunan',
      items: ['Nominal']
    },
    '523121': {
      name: 'Belanja Pemeliharaan Peralatan dan Mesin',
      items: ['Nominal']
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

// Sheet Names
const SHEETS = {
  USERS: 'Users',
  BUDGET: 'Budget',
  RPD: 'RPD',
  REALISASI: 'Realisasi',
  LOGS: 'Logs',
  CONFIG: 'Config'
};

const BMN_SHEETS = {
  BMN_DATA: 'BMN_Data',
  BMN_RIWAYAT: 'BMN_Riwayat',
  BMN_CONFIG: 'BMN_Config'
};

const BMN_DRIVE_FOLDER = '1JE_7ka6SnEovH6uql3OP0W1BNOV9dIGj'; // Ganti dengan folder ID


// ===== MAIN HANDLER =====
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    Logger.log(`[${new Date().toISOString()}] Action: ${action}`);
    Logger.log(`Data: ${JSON.stringify(data)}`);
    
    // Route ke fungsi yang sesuai
    switch(action) {
      case 'login':
        return handleLogin(data);
      case 'changePassword':
        return changePassword(data);
      case 'getBudgets':
        return getBudgets(data);
      case 'saveBudget':
        return saveBudget(data);
      case 'getUsers':
        return getUsers(data);
      case 'saveUser':
        return saveUser(data);
      case 'deleteUser':
        return deleteUser(data);
      case 'getRPDConfig':
        return getRPDConfig(data);
      case 'saveRPDConfig':
        return saveRPDConfig(data);
      case 'getRPDs':
        return getRPDs(data);
      case 'saveRPD':
        return saveRPD(data);
      case 'deleteRPD':
        return deleteRPD(data);
      case 'getRealisasis':
        return getRealisasis(data);
      case 'saveRealisasi':
        return saveRealisasi(data);
      case 'updateRealisasiStatus':
        return updateRealisasiStatus(data);
      case 'uploadFile':
        return uploadFile(data);
      case 'getDashboardStats':
        return getDashboardStats(data);
      case 'exportBudget':
        return exportBudget(data);
      case 'exportRPD':
        return exportRPD(data);
      case 'exportRealisasi':
        return exportRealisasi(data);
      case 'downloadRealisasiBulanan':
        return downloadRealisasiBulanan(data);
      case 'exportBudgetEnhanced':
        return exportBudgetEnhanced(data);
      case 'exportRPDEnhanced':
        return exportRPDEnhanced(data);
      case 'exportRealisasiEnhanced':
        return exportRealisasiEnhanced(data);
      case 'exportRPDAllPerMonth':
        return exportRPDAllPerMonth(data);
      case 'exportRPDSelectedPerMonth':
        return exportRPDSelectedPerMonth(data);
      case 'exportRPDAllDetailYear':
        return exportRPDAllDetailYear(data);
      case 'exportRealisasiAllPerMonth':
        return exportRealisasiAllPerMonth(data);
      case 'exportRealisasiSelectedPerMonth':
        return exportRealisasiSelectedPerMonth(data);
      case 'exportRealisasiAllDetailPerMonth':
        return exportRealisasiAllDetailPerMonth(data);
      case 'exportRPDPerYear':
        return exportRPDPerYear(data);
      case 'exportRPDDetailAllYear':
        return exportRPDDetailAllYear(data);
      case 'exportRealisasiPerYear':
        return exportRealisasiPerYear(data);
      case 'exportRealisasiDetailAllYear':
        return exportRealisasiDetailAllYear(data);
      //BMN
      case 'getBMNStats':
        return getBMNStats(data);
      case 'getBMNData':
        return getBMNData(data);
      case 'saveBMN':
        return saveBMN(data);
      case 'uploadBMNPhoto':
        return uploadBMNPhoto(data);
      case 'getBMNVerifikasi':
        return getBMNVerifikasi(data);
      case 'updateBMNVerifikasi':
        return updateBMNVerifikasi(data);
      case 'getBMNRiwayat':
        return getBMNRiwayat(data);
      case 'exportLaporanBMN':
        return exportLaporanBMN(data);
      default:
        Logger.log(`[ERROR] Unknown action: ${action}`);
        return errorResponse('Action tidak dikenal');
    }
  } catch (error) {
    Logger.log(`[ERROR] ${error.toString()}`);
    Logger.log(`Stack: ${error.stack}`);
    return errorResponse(error.toString());
  }
}

// ===== RESPONSE HELPERS =====
function successResponse(data) {
  Logger.log(`[SUCCESS] Response: ${JSON.stringify(data)}`);
  return ContentService.createTextOutput(
    JSON.stringify({ success: true, data: data })
  ).setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(message) {
  Logger.log(`[ERROR RESPONSE] ${message}`);
  return ContentService.createTextOutput(
    JSON.stringify({ success: false, message: message })
  ).setMimeType(ContentService.MimeType.JSON);
}

// ===== DATABASE HELPERS =====
function getSheet(sheetName) {
  const ss = SpreadsheetApp.openById(SS_ID);
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    Logger.log(`[INFO] Creating new sheet: ${sheetName}`);
    sheet = ss.insertSheet(sheetName);
    initializeSheet(sheet, sheetName);
  }
  
  return sheet;
}

function initializeSheet(sheet, sheetName) {
  let headers = [];
  
  switch(sheetName) {
    case SHEETS.USERS:
      headers = ['ID', 'Username', 'Password', 'Name', 'Role', 'KUA', 'Status', 'CreatedAt'];
      break;
    case SHEETS.BUDGET:
      headers = ['ID', 'KUA', 'Year', 'Budget', 'TotalRPD', 'TotalRealisasi', 'UpdatedAt'];
      break;
    case SHEETS.RPD:
      headers = ['ID', 'KUA', 'UserID', 'Month', 'Year', 'Data', 'Total', 'CreatedAt', 'UpdatedAt'];
      break;
    case SHEETS.REALISASI:
      headers = ['ID', 'KUA', 'UserID', 'Month', 'Year', 'RPDID', 'Data', 'Total', 'Status', 'Files', 'CreatedAt', 'UpdatedAt', 'VerifiedBy', 'VerifiedAt', 'Notes'];
      break;
    case SHEETS.LOGS:
      headers = ['Timestamp', 'UserID', 'Username', 'Role', 'Action', 'Details'];
      break;
    case SHEETS.CONFIG:
      headers = ['Key', 'Value', 'UpdatedAt'];
      sheet.appendRow(headers);
      sheet.appendRow(['RPD_STATUS', 'open', new Date()]);
      sheet.appendRow(['REALISASI_STATUS', 'open', new Date()]);
      sheet.appendRow(['REALISASI_MAX_FILE_SIZE', '5', new Date()]);
      sheet.appendRow(['REALISASI_MAX_FILES', '10', new Date()]);
      return;
  }
  
  if (headers.length > 0) {
    sheet.appendRow(headers);
  }
  
  Logger.log(`[INFO] Sheet initialized: ${sheetName}`);
}

function generateID() {
  return Utilities.getUuid();
}

// ===== LOGGING =====
function logAction(userID, username, role, action, details) {
  try {
    const sheet = getSheet(SHEETS.LOGS);
    sheet.appendRow([
      new Date(),
      userID,
      username,
      role,
      action,
      JSON.stringify(details)
    ]);
    Logger.log(`[LOG] ${username} (${role}): ${action}`);
  } catch (error) {
    Logger.log(`[ERROR] Logging error: ${error}`);
  }
}

// ===== AUTHENTICATION =====
function handleLogin(data) {
  Logger.log(`[LOGIN] Attempting login for: ${data.username}`);
  const sheet = getSheet(SHEETS.USERS);
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row[1] === data.username && row[2] === data.password && row[6] === 'Active') {
      const user = {
        id: row[0],
        username: row[1],
        name: row[3],
        role: row[4],
        kua: row[5]
      };
      
      logAction(user.id, user.username, user.role, 'LOGIN', { timestamp: new Date() });
      Logger.log(`[LOGIN] Success: ${user.username}`);
      return successResponse(user);
    }
  }
  
  Logger.log(`[LOGIN] Failed for: ${data.username}`);
  return errorResponse('Username atau password salah');
}

function changePassword(data) {
  Logger.log(`[CHANGE_PASSWORD] ========== START ==========`);
  Logger.log(`[CHANGE_PASSWORD] User: ${data.userId}`);
  Logger.log(`[CHANGE_PASSWORD] Username: ${data.username}`);
  Logger.log(`[CHANGE_PASSWORD] Old Password: ${data.oldPassword}`);
  Logger.log(`[CHANGE_PASSWORD] New Password: ${data.newPassword}`);
  
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  
  try {
    const sheet = getSheet(SHEETS.USERS);
    const values = sheet.getDataRange().getValues();
    
    Logger.log(`[CHANGE_PASSWORD] Total users in sheet: ${values.length - 1}`);
    
    // Find user and verify old password
    for (let i = 1; i < values.length; i++) {
      Logger.log(`[CHANGE_PASSWORD] Checking row ${i}: ID=${values[i][0]}, Username=${values[i][1]}, CurrentPassword=${values[i][2]}`);
      
      if (values[i][0] === data.userId) {
        Logger.log(`[CHANGE_PASSWORD] User found at row ${i + 1}`);
        Logger.log(`[CHANGE_PASSWORD] Current password in sheet: ${values[i][2]}`);
        Logger.log(`[CHANGE_PASSWORD] Old password from request: ${data.oldPassword}`);
        
        if (values[i][2] === data.oldPassword) {
          Logger.log(`[CHANGE_PASSWORD] Old password matches, updating to: ${data.newPassword}`);
          
          // Update password (column 3 is password, index starts from 1)
          sheet.getRange(i + 1, 3).setValue(data.newPassword);
          
          // Verify the update
          const newValue = sheet.getRange(i + 1, 3).getValue();
          Logger.log(`[CHANGE_PASSWORD] Password updated. Verification - New value in sheet: ${newValue}`);
          
          logAction(data.userId, data.username, data.role, 'CHANGE_PASSWORD', { timestamp: new Date() });
          Logger.log(`[CHANGE_PASSWORD] Success: ${data.username}`);
          Logger.log(`[CHANGE_PASSWORD] ========== END SUCCESS ==========`);
          
          return successResponse({ message: 'Password berhasil diubah' });
        } else {
          Logger.log(`[CHANGE_PASSWORD] Password mismatch!`);
          Logger.log(`[CHANGE_PASSWORD] ========== END FAIL ==========`);
          return errorResponse('Password lama tidak sesuai');
        }
      }
    }
    
    Logger.log(`[CHANGE_PASSWORD] User not found!`);
    Logger.log(`[CHANGE_PASSWORD] ========== END FAIL ==========`);
    return errorResponse('User tidak ditemukan');
  } catch (error) {
    Logger.log(`[CHANGE_PASSWORD ERROR] ${error.toString()}`);
    Logger.log(`[CHANGE_PASSWORD ERROR] Stack: ${error.stack}`);
    Logger.log(`[CHANGE_PASSWORD] ========== END ERROR ==========`);
    return errorResponse('Gagal mengubah password: ' + error.toString());
  } finally {
    lock.releaseLock();
  }
}

// ===== BUDGET MANAGEMENT =====
function getBudgets(data) {
  Logger.log(`[GET_BUDGETS] Year: ${data.year}`);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  
  try {
    const sheet = getSheet(SHEETS.BUDGET);
    const values = sheet.getDataRange().getValues();
    const year = data.year || new Date().getFullYear();
    
    const budgets = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[2] == year) {
        budgets.push({
          id: row[0],
          kua: row[1],
          year: row[2],
          budget: row[3],
          totalRPD: row[4] || 0,
          totalRealisasi: row[5] || 0,
          sisaBudget: row[3] - (row[5] || 0),
          updatedAt: row[6]
        });
      }
    }
    
    Logger.log(`[GET_BUDGETS] Found: ${budgets.length} budgets`);
    return successResponse(budgets);
  } finally {
    lock.releaseLock();
  }
}

function saveBudget(data) {
  Logger.log(`[SAVE_BUDGET] KUA: ${data.kua}, Year: ${data.year}, Budget: ${data.budget}`);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  
  try {
    const sheet = getSheet(SHEETS.BUDGET);
    const values = sheet.getDataRange().getValues();
    const year = data.year || new Date().getFullYear();
    
    let rowIndex = -1;
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === data.kua && values[i][2] == year) {
        rowIndex = i + 1;
        break;
      }
    }
    
    const budgetData = [
      data.id || generateID(),
      data.kua,
      year,
      parseFloat(data.budget),
      0,
      0,
      new Date()
    ];
    
    if (rowIndex > 0) {
      // Preserve existing totals
      budgetData[4] = values[rowIndex - 1][4] || 0;
      budgetData[5] = values[rowIndex - 1][5] || 0;
      sheet.getRange(rowIndex, 1, 1, budgetData.length).setValues([budgetData]);
      Logger.log(`[SAVE_BUDGET] Updated existing budget`);
    } else {
      sheet.appendRow(budgetData);
      Logger.log(`[SAVE_BUDGET] Created new budget`);
    }
    
    logAction(data.userId, data.username, 'Admin', 'SAVE_BUDGET', { kua: data.kua, year: year, budget: data.budget });
    return successResponse({ message: 'Budget berhasil disimpan' });
  } finally {
    lock.releaseLock();
  }
}

// ===== USER MANAGEMENT =====
function getUsers(data) {
  Logger.log(`[GET_USERS]`);
  const sheet = getSheet(SHEETS.USERS);
  const values = sheet.getDataRange().getValues();
  
  const users = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    users.push({
      id: row[0],
      username: row[1],
      name: row[3],
      role: row[4],
      kua: row[5],
      status: row[6],
      createdAt: row[7]
    });
  }
  
  Logger.log(`[GET_USERS] Found: ${users.length} users`);
  return successResponse(users);
}

function saveUser(data) {
  Logger.log(`[SAVE_USER] Username: ${data.username}`);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  
  try {
    const sheet = getSheet(SHEETS.USERS);
    const values = sheet.getDataRange().getValues();
    
    // Check duplicate username
    for (let i = 1; i < values.length; i++) {
      if (values[i][1] === data.username && values[i][0] !== data.id) {
        Logger.log(`[SAVE_USER] Failed: Username already exists`);
        return errorResponse('Username sudah digunakan');
      }
    }
    
    let rowIndex = -1;
    if (data.id) {
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] === data.id) {
          rowIndex = i + 1;
          break;
        }
      }
    }
    
    const userData = [
      data.id || generateID(),
      data.username,
      data.password,// || 'password123',
      data.name,
      data.role,
      data.kua || '',
      data.status || 'Active',
      data.id ? values[rowIndex - 1][7] : new Date()
    ];
    
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, userData.length).setValues([userData]);
      Logger.log(`[SAVE_USER] Updated existing user`);
    } else {
      sheet.appendRow(userData);
      Logger.log(`[SAVE_USER] Created new user`);
    }
    
    logAction(data.adminId, data.adminUsername, 'Admin', 'SAVE_USER', { username: data.username });
    return successResponse({ message: 'Pengguna berhasil disimpan' });
  } finally {
    lock.releaseLock();
  }
}

function deleteUser(data) {
  Logger.log(`[DELETE_USER] ID: ${data.id}`);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  
  try {
    const sheet = getSheet(SHEETS.USERS);
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.id) {
        sheet.getRange(i + 1, 7).setValue('Inactive');
        logAction(data.adminId, data.adminUsername, 'Admin', 'DELETE_USER', { userId: data.id });
        Logger.log(`[DELETE_USER] Success`);
        return successResponse({ message: 'Pengguna berhasil dinonaktifkan' });
      }
    }
    
    Logger.log(`[DELETE_USER] Failed: User not found`);
    return errorResponse('Pengguna tidak ditemukan');
  } finally {
    lock.releaseLock();
  }
}

// ===== RPD CONFIG =====
function getRPDConfig(data) {
  Logger.log(`[GET_RPD_CONFIG]`);
  const sheet = getSheet(SHEETS.CONFIG);
  const values = sheet.getDataRange().getValues();
  
  const config = {};
  for (let i = 1; i < values.length; i++) {
    config[values[i][0]] = values[i][1];
  }
  
  Logger.log(`[GET_RPD_CONFIG] Config: ${JSON.stringify(config)}`);
  return successResponse(config);
}

function saveRPDConfig(data) {
  Logger.log(`[SAVE_RPD_CONFIG] RPD Status: ${data.rpdStatus}, Realisasi Status: ${data.realisasiStatus}`);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  
  try {
    const sheet = getSheet(SHEETS.CONFIG);
    const values = sheet.getDataRange().getValues();
    
    const updates = {
      'RPD_STATUS': data.rpdStatus,
      'REALISASI_STATUS': data.realisasiStatus,
      'REALISASI_MAX_FILE_SIZE': data.realisasiMaxFileSize,
      'REALISASI_MAX_FILES': data.realisasiMaxFiles
    };
    
    for (const [key, value] of Object.entries(updates)) {
      let found = false;
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] === key) {
          sheet.getRange(i + 1, 2, 1, 2).setValues([[value, new Date()]]);
          found = true;
          break;
        }
      }
      if (!found) {
        sheet.appendRow([key, value, new Date()]);
      }
    }
    
    logAction(data.userId, data.username, 'Admin', 'UPDATE_CONFIG', updates);
    Logger.log(`[SAVE_RPD_CONFIG] Success`);
    return successResponse({ message: 'Konfigurasi berhasil disimpan' });
  } finally {
    lock.releaseLock();
  }
}






// ===== HELPER FUNCTIONS =====
function updateBudgetTotalRPD(kua, year) {
  Logger.log(`[UPDATE_BUDGET_TOTAL_RPD] KUA: ${kua}, Year: ${year}`);
  const rpdSheet = getSheet(SHEETS.RPD);
  const rpdValues = rpdSheet.getDataRange().getValues();
  
  let total = 0;
  for (let i = 1; i < rpdValues.length; i++) {
    if (rpdValues[i][1] === kua && rpdValues[i][4] == year) {
      total += parseFloat(rpdValues[i][6] || 0);
    }
  }
  
  const budgetSheet = getSheet(SHEETS.BUDGET);
  const budgetValues = budgetSheet.getDataRange().getValues();
  
  for (let i = 1; i < budgetValues.length; i++) {
    if (budgetValues[i][1] === kua && budgetValues[i][2] == year) {
      budgetSheet.getRange(i + 1, 5).setValue(total);
      Logger.log(`[UPDATE_BUDGET_TOTAL_RPD] Updated to: ${total}`);
      break;
    }
  }
}

function updateBudgetTotalRealisasi(kua, year) {
  Logger.log(`[UPDATE_BUDGET_TOTAL_REALISASI] KUA: ${kua}, Year: ${year}`);
  const realisasiSheet = getSheet(SHEETS.REALISASI);
  const realisasiValues = realisasiSheet.getDataRange().getValues();
  
  let total = 0;
  for (let i = 1; i < realisasiValues.length; i++) {
    if (realisasiValues[i][1] === kua && realisasiValues[i][4] == year && realisasiValues[i][8] === 'Diterima') {
      total += parseFloat(realisasiValues[i][7] || 0);
    }
  }
  
  const budgetSheet = getSheet(SHEETS.BUDGET);
  const budgetValues = budgetSheet.getDataRange().getValues();
  
  for (let i = 1; i < budgetValues.length; i++) {
    if (budgetValues[i][1] === kua && budgetValues[i][2] == year) {
      budgetSheet.getRange(i + 1, 6).setValue(total);
      Logger.log(`[UPDATE_BUDGET_TOTAL_REALISASI] Updated to: ${total}`);
      break;
    }
  }
}

function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) {
    return '0';
  }
  return new Intl.NumberFormat('id-ID').format(parseFloat(num));
}



function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder(folderName);
  }
}







// ===== DOWNLOAD REALISASI BULANAN (PDF & EXCEL) =====
// ===== LOAD SHEETJS LIBRARY FROM CDN =====
function loadSheetJS() {
  Logger.log('[SHEETJS] Loading library from CDN');
  try {
    const url = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
    const response = UrlFetchApp.fetch(url);
    const code = response.getContentText();
    
    // Evaluate the code to make XLSX available
    eval(code);
    
    Logger.log('[SHEETJS] Library loaded successfully');
    return true;
  } catch (error) {
    Logger.log('[SHEETJS ERROR] Failed to load: ' + error.toString());
    return false;
  }
}

































function exportRealisasiExcelNew(realisasi, rpd, userData) {
  Logger.log(`[EXPORT_REALISASI_EXCEL] ========== START (NEW METHOD) ==========`);
  Logger.log(`[EXPORT_REALISASI_EXCEL] Creating Excel for ${realisasi.kua} - ${realisasi.month} ${realisasi.year}`);
  
  try {
    // Siapkan data dalam format array
    Logger.log(`[EXPORT_REALISASI_EXCEL] Preparing data arrays`);
    
    const rows = [];
    
    // Header
    rows.push(['LAPORAN REALISASI BOP KUA']);
    rows.push(['Kementerian Agama Kabupaten Indramayu']);
    rows.push(['']);
    
    // Info
    rows.push(['KUA', realisasi.kua]);
    rows.push(['Bulan', `${realisasi.month} ${realisasi.year}`]);
    rows.push(['Status', realisasi.status]);
    rows.push(['Total Realisasi', realisasi.total]);
    rows.push(['']);
    
    // Detail header
    rows.push(['Kode', 'Nama Parameter', 'Item', 'RPD', 'Realisasi', 'Selisih']);
    
    // Detail data
    Logger.log(`[EXPORT_REALISASI_EXCEL] Processing realisasi data`);
    let hasData = false;
    let rowCount = 0;
    
    if (realisasi.data && typeof realisasi.data === 'object' && Object.keys(realisasi.data).length > 0) {
      Logger.log(`[EXPORT_REALISASI_EXCEL] Found ${Object.keys(realisasi.data).length} codes`);
      
      Object.entries(realisasi.data).forEach(([code, items]) => {
        if (items && typeof items === 'object' && Object.keys(items).length > 0) {
          Object.entries(items).forEach(([item, realValue]) => {
            const rpdValue = rpd && rpd.data && rpd.data[code] && rpd.data[code][item] ? parseFloat(rpd.data[code][item]) : 0;
            const realVal = parseFloat(realValue) || 0;
            const selisih = realVal - rpdValue;
            
            rows.push([code, '', item, rpdValue, realVal, selisih]);
            rowCount++;
            hasData = true;
          });
        }
      });
      
      Logger.log(`[EXPORT_REALISASI_EXCEL] Added ${rowCount} data rows`);
    }
    
    if (!hasData) {
      Logger.log(`[EXPORT_REALISASI_EXCEL] No data, adding placeholder`);
      rows.push(['', '', 'Tidak ada data realisasi', 0, 0, 0]);
    }
    
    rows.push(['']);
    
    // Files section
    if (realisasi.files && Array.isArray(realisasi.files) && realisasi.files.length > 0) {
      Logger.log(`[EXPORT_REALISASI_EXCEL] Adding ${realisasi.files.length} files`);
      rows.push(['DOKUMEN PENDUKUNG']);
      rows.push(['No', 'Nama File', 'URL']);
      
      realisasi.files.forEach((file, index) => {
        if (file && file.fileName) {
          rows.push([index + 1, file.fileName || '', file.fileUrl || '']);
        }
      });
    }
    
    rows.push(['']);
    
    // Verification
    if (realisasi.verifiedBy) {
      Logger.log(`[EXPORT_REALISASI_EXCEL] Adding verification info`);
      rows.push(['Diverifikasi Oleh', realisasi.verifiedBy]);
      if (realisasi.verifiedAt) {
        rows.push(['Tanggal Verifikasi', new Date(realisasi.verifiedAt).toLocaleDateString('id-ID')]);
      }
    }
    if (realisasi.notes) {
      rows.push(['Catatan', realisasi.notes]);
    }
    
    Logger.log(`[EXPORT_REALISASI_EXCEL] Total rows prepared: ${rows.length}`);
    
    // Buat CSV terlebih dahulu (lebih simple dan compatible)
    Logger.log(`[EXPORT_REALISASI_EXCEL] Creating CSV content`);
    const csvContent = rows.map(row => {
      return row.map(cell => {
        // Escape cells yang mengandung comma atau quotes
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return '"' + cellStr.replace(/"/g, '""') + '"';
        }
        return cellStr;
      }).join(',');
    }).join('\n');
    
    Logger.log(`[EXPORT_REALISASI_EXCEL] CSV content length: ${csvContent.length} characters`);
    
    // Convert ke blob
    Logger.log(`[EXPORT_REALISASI_EXCEL] Creating blob`);
    const blob = Utilities.newBlob(csvContent, 'text/csv', `Realisasi ${realisasi.kua} - ${realisasi.month} ${realisasi.year}.csv`);
    
    // Encode to base64
    Logger.log(`[EXPORT_REALISASI_EXCEL] Encoding to base64`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    Logger.log(`[EXPORT_REALISASI_EXCEL] Base64 length: ${base64.length} characters`);
    
    Logger.log(`[EXPORT_REALISASI_EXCEL] ========== SUCCESS ==========`);
    return successResponse({
      fileData: base64,
      fileName: `Realisasi ${realisasi.kua} - ${realisasi.month} ${realisasi.year}.csv`,
      mimeType: 'text/csv'
    });
    
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_EXCEL ERROR] ========== ERROR ==========`);
    Logger.log(`[EXPORT_REALISASI_EXCEL ERROR] Message: ${error.toString()}`);
    Logger.log(`[EXPORT_REALISASI_EXCEL ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal export realisasi: ' + error.toString());
  }
}

function exportRealisasiExcel(realisasi, rpd, userData) {
  Logger.log(`[EXPORT_REALISASI_EXCEL] ========== START ==========`);
  Logger.log(`[EXPORT_REALISASI_EXCEL] Creating Excel file for ${realisasi.kua} - ${realisasi.month} ${realisasi.year}`);
  
  try {
    // Create spreadsheet
    Logger.log(`[EXPORT_REALISASI_EXCEL] Creating new spreadsheet`);
    const ss = SpreadsheetApp.create(`Realisasi ${realisasi.kua} - ${realisasi.month} ${realisasi.year}`);
    const sheet = ss.getActiveSheet();
    sheet.setName('Realisasi');
    Logger.log(`[EXPORT_REALISASI_EXCEL] Spreadsheet created with ID: ${ss.getId()}`);
    
    // Header
    Logger.log(`[EXPORT_REALISASI_EXCEL] Adding headers`);
    sheet.appendRow(['LAPORAN REALISASI BOP KUA']);
    sheet.appendRow(['Kementerian Agama Kabupaten Indramayu']);
    sheet.appendRow(['']); // Baris kosong
    
    // Info
    Logger.log(`[EXPORT_REALISASI_EXCEL] Adding info section`);
    sheet.appendRow(['KUA', realisasi.kua]);
    sheet.appendRow(['Bulan', `${realisasi.month} ${realisasi.year}`]);
    sheet.appendRow(['Status', realisasi.status]);
    sheet.appendRow(['Total Realisasi', realisasi.total]);
    sheet.appendRow(['']); // Baris kosong
    
    // Detail header
    Logger.log(`[EXPORT_REALISASI_EXCEL] Adding detail headers`);
    sheet.appendRow(['Kode', 'Nama Parameter', 'Item', 'RPD', 'Realisasi', 'Selisih']);
    
    let currentRow = sheet.getLastRow();
    const headerRange = sheet.getRange(currentRow, 1, 1, 6);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#667eea');
    headerRange.setFontColor('#ffffff');
    
    // Detail data
    Logger.log(`[EXPORT_REALISASI_EXCEL] Processing realisasi data`);
    let hasData = false;
    let rowCount = 0;
    
    if (realisasi.data && typeof realisasi.data === 'object' && Object.keys(realisasi.data).length > 0) {
      Logger.log(`[EXPORT_REALISASI_EXCEL] Found ${Object.keys(realisasi.data).length} codes in realisasi data`);
      
      Object.entries(realisasi.data).forEach(([code, items]) => {
        Logger.log(`[EXPORT_REALISASI_EXCEL] Processing code: ${code}`);
        
        if (items && typeof items === 'object' && Object.keys(items).length > 0) {
          Logger.log(`[EXPORT_REALISASI_EXCEL] Code ${code} has ${Object.keys(items).length} items`);
          
          Object.entries(items).forEach(([item, realValue]) => {
            const rpdValue = rpd && rpd.data && rpd.data[code] && rpd.data[code][item] ? parseFloat(rpd.data[code][item]) : 0;
            const realVal = parseFloat(realValue) || 0;
            const selisih = realVal - rpdValue;
            
            const rowData = [
              code || '',
              '', 
              item || '',
              rpdValue,
              realVal,
              selisih
            ];
            
            sheet.appendRow(rowData);
            rowCount++;
            hasData = true;
          });
        }
      });
      
      Logger.log(`[EXPORT_REALISASI_EXCEL] Added ${rowCount} data rows`);
    }
    
    if (!hasData) {
      Logger.log(`[EXPORT_REALISASI_EXCEL] No data found, adding placeholder row`);
      sheet.appendRow(['', '', 'Tidak ada data realisasi', 0, 0, 0]);
    }
    
    sheet.appendRow(['']); // Baris kosong
    
    // Files section
    if (realisasi.files && Array.isArray(realisasi.files) && realisasi.files.length > 0) {
      Logger.log(`[EXPORT_REALISASI_EXCEL] Adding ${realisasi.files.length} files info`);
      sheet.appendRow(['DOKUMEN PENDUKUNG']);
      sheet.appendRow(['No', 'Nama File', 'URL']);
      
      currentRow = sheet.getLastRow();
      const filesHeaderRange = sheet.getRange(currentRow, 1, 1, 3);
      filesHeaderRange.setFontWeight('bold');
      filesHeaderRange.setBackground('#667eea');
      filesHeaderRange.setFontColor('#ffffff');
      
      realisasi.files.forEach((file, index) => {
        if (file && file.fileName) {
          sheet.appendRow([
            index + 1,
            file.fileName || '',
            file.fileUrl || ''
          ]);
        }
      });
    }
    
    // Verification info
    sheet.appendRow(['']); // Baris kosong
    if (realisasi.verifiedBy) {
      Logger.log(`[EXPORT_REALISASI_EXCEL] Adding verification info`);
      sheet.appendRow(['Diverifikasi Oleh', realisasi.verifiedBy]);
      if (realisasi.verifiedAt) {
        sheet.appendRow(['Tanggal Verifikasi', new Date(realisasi.verifiedAt).toLocaleDateString('id-ID')]);
      }
    }
    if (realisasi.notes) {
      sheet.appendRow(['Catatan', realisasi.notes]);
    }
    
    // Formatting
    Logger.log(`[EXPORT_REALISASI_EXCEL] Applying formatting`);
    sheet.getRange('A1:F1').merge().setHorizontalAlignment('center').setFontSize(14).setFontWeight('bold');
    sheet.getRange('A2:F2').merge().setHorizontalAlignment('center');
    sheet.setFrozenRows(10);
    sheet.autoResizeColumns(1, 6);
    
    // PERBAIKAN: Gunakan DriveApp untuk export, bukan UrlFetchApp
    Logger.log(`[EXPORT_REALISASI_EXCEL] Flushing spreadsheet changes`);
    SpreadsheetApp.flush();
    
    Logger.log(`[EXPORT_REALISASI_EXCEL] Getting spreadsheet as Excel blob`);
    const fileId = ss.getId();
    const file = DriveApp.getFileById(fileId);
    
    // Gunakan getAs untuk convert ke Excel
    Logger.log(`[EXPORT_REALISASI_EXCEL] Converting to Excel format`);
    const blob = file.getAs('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    blob.setName(`Realisasi ${realisasi.kua} - ${realisasi.month} ${realisasi.year}.xlsx`);
    
    Logger.log(`[EXPORT_REALISASI_EXCEL] Encoding to base64`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    Logger.log(`[EXPORT_REALISASI_EXCEL] Base64 length: ${base64.length} characters`);
    
    // Hapus file temporary
    Logger.log(`[EXPORT_REALISASI_EXCEL] Deleting temporary spreadsheet`);
    DriveApp.getFileById(fileId).setTrashed(true);
    
    Logger.log(`[EXPORT_REALISASI_EXCEL] ========== SUCCESS ==========`);
    return successResponse({
      fileData: base64,
      fileName: blob.getName(),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_EXCEL ERROR] ========== ERROR ==========`);
    Logger.log(`[EXPORT_REALISASI_EXCEL ERROR] Message: ${error.toString()}`);
    Logger.log(`[EXPORT_REALISASI_EXCEL ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal export realisasi: ' + error.toString());
  }
}







function exportBudgetExcelNew(budgets, year, kua) {
  Logger.log(`[EXPORT_BUDGET_EXCEL] ========== START (NEW METHOD) ==========`);
  Logger.log(`[EXPORT_BUDGET_EXCEL] Year: ${year}, KUA: ${kua || 'ALL'}`);
  Logger.log(`[EXPORT_BUDGET_EXCEL] Total budgets: ${budgets.length}`);
  
  try {
    const rows = [];
    
    // Headers
    rows.push(['No', 'KUA', 'Tahun', 'Budget', 'Total RPD', 'Total Realisasi', 'Sisa Budget', 'Terakhir Update']);
    
    // Data
    Logger.log(`[EXPORT_BUDGET_EXCEL] Adding ${budgets.length} data rows`);
    budgets.forEach((budget, index) => {
      rows.push([
        index + 1,
        budget.kua || '',
        budget.year || '',
        parseFloat(budget.budget) || 0,
        parseFloat(budget.totalRPD) || 0,
        parseFloat(budget.totalRealisasi) || 0,
        parseFloat(budget.sisaBudget) || 0,
        budget.updatedAt ? new Date(budget.updatedAt).toLocaleDateString('id-ID') : ''
      ]);
      
      if ((index + 1) % 10 === 0) {
        Logger.log(`[EXPORT_BUDGET_EXCEL] Progress: ${index + 1}/${budgets.length} rows`);
      }
    });
    
    Logger.log(`[EXPORT_BUDGET_EXCEL] Creating CSV content`);
    const csvContent = rows.map(row => {
      return row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return '"' + cellStr.replace(/"/g, '""') + '"';
        }
        return cellStr;
      }).join(',');
    }).join('\n');
    
    Logger.log(`[EXPORT_BUDGET_EXCEL] CSV length: ${csvContent.length} characters`);
    
    const blob = Utilities.newBlob(csvContent, 'text/csv', `Budget ${year}${kua ? ' - ' + kua : ''}.csv`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    
    Logger.log(`[EXPORT_BUDGET_EXCEL] Base64 length: ${base64.length} characters`);
    Logger.log(`[EXPORT_BUDGET_EXCEL] ========== SUCCESS ==========`);
    
    return successResponse({
      fileData: base64,
      fileName: `Budget ${year}${kua ? ' - ' + kua : ''}.csv`,
      mimeType: 'text/csv'
    });
    
  } catch (error) {
    Logger.log(`[EXPORT_BUDGET_EXCEL ERROR] ========== ERROR ==========`);
    Logger.log(`[EXPORT_BUDGET_EXCEL ERROR] Message: ${error.toString()}`);
    Logger.log(`[EXPORT_BUDGET_EXCEL ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal export budget: ' + error.toString());
  }
}

function exportBudgetExcel(budgets, year, kua) {
  Logger.log(`[EXPORT_BUDGET_EXCEL] ========== START ==========`);
  Logger.log(`[EXPORT_BUDGET_EXCEL] Year: ${year}, KUA: ${kua || 'ALL'}`);
  Logger.log(`[EXPORT_BUDGET_EXCEL] Total budgets to export: ${budgets.length}`);
  
  try {
    Logger.log(`[EXPORT_BUDGET_EXCEL] Creating new spreadsheet`);
    const ss = SpreadsheetApp.create(`Export Budget ${year}${kua ? ' - ' + kua : ''}`);
    const exportSheet = ss.getActiveSheet();
    exportSheet.setName('Budget');
    Logger.log(`[EXPORT_BUDGET_EXCEL] Spreadsheet created with ID: ${ss.getId()}`);
    
    Logger.log(`[EXPORT_BUDGET_EXCEL] Adding headers`);
    exportSheet.appendRow(['No', 'KUA', 'Tahun', 'Budget', 'Total RPD', 'Total Realisasi', 'Sisa Budget', 'Terakhir Update']);
    
    Logger.log(`[EXPORT_BUDGET_EXCEL] Adding ${budgets.length} data rows`);
    let rowNum = 1;
    budgets.forEach((budget, index) => {
      exportSheet.appendRow([
        rowNum++,
        budget.kua || '',
        budget.year || '',
        parseFloat(budget.budget) || 0,
        parseFloat(budget.totalRPD) || 0,
        parseFloat(budget.totalRealisasi) || 0,
        parseFloat(budget.sisaBudget) || 0,
        budget.updatedAt ? new Date(budget.updatedAt) : ''
      ]);
      
      if ((index + 1) % 10 === 0) {
        Logger.log(`[EXPORT_BUDGET_EXCEL] Progress: ${index + 1}/${budgets.length} rows added`);
      }
    });
    
    Logger.log(`[EXPORT_BUDGET_EXCEL] Applying formatting`);
    exportSheet.getRange('A1:H1').setFontWeight('bold').setBackground('#667eea').setFontColor('#ffffff');
    exportSheet.setFrozenRows(1);
    exportSheet.autoResizeColumns(1, 8);
    
    Logger.log(`[EXPORT_BUDGET_EXCEL] Flushing spreadsheet changes`);
    SpreadsheetApp.flush();
    
    Logger.log(`[EXPORT_BUDGET_EXCEL] Getting spreadsheet as Excel blob`);
    const fileId = ss.getId();
    const file = DriveApp.getFileById(fileId);
    const blob = file.getAs('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    blob.setName(`Budget ${year}${kua ? ' - ' + kua : ''}.xlsx`);
    
    Logger.log(`[EXPORT_BUDGET_EXCEL] Encoding to base64`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    Logger.log(`[EXPORT_BUDGET_EXCEL] Base64 length: ${base64.length} characters`);
    
    Logger.log(`[EXPORT_BUDGET_EXCEL] Deleting temporary spreadsheet`);
    DriveApp.getFileById(fileId).setTrashed(true);
    
    Logger.log(`[EXPORT_BUDGET_EXCEL] ========== SUCCESS ==========`);
    return successResponse({
      fileData: base64,
      fileName: blob.getName(),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
  } catch (error) {
    Logger.log(`[EXPORT_BUDGET_EXCEL ERROR] ========== ERROR ==========`);
    Logger.log(`[EXPORT_BUDGET_EXCEL ERROR] Message: ${error.toString()}`);
    Logger.log(`[EXPORT_BUDGET_EXCEL ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal export budget: ' + error.toString());
  }
}



function exportRPDEnhanced(data) {
  Logger.log(`[EXPORT_RPD_ENHANCED] ========== START ==========`);
  Logger.log(`[EXPORT_RPD_ENHANCED] Format: ${data.format}, Year: ${data.year}, KUA: ${data.kua || 'ALL'}`);
  
  try {
    const sheet = getSheet(SHEETS.RPD);
    const values = sheet.getDataRange().getValues();
    const year = data.year || new Date().getFullYear();
    
    Logger.log(`[EXPORT_RPD_ENHANCED] Filtering RPDs`);
    
    let rpds = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[4] == year && (!data.kua || row[1] === data.kua)) {
        rpds.push({
          kua: row[1],
          month: row[3],
          year: row[4],
          total: row[6],
          createdAt: row[7],
          updatedAt: row[8]
        });
      }
    }
    
    Logger.log(`[EXPORT_RPD_ENHANCED] Found ${rpds.length} RPDs`);
    
    if (data.format === 'pdf') {
      return exportRPDPDF(rpds, year, data.kua);
    } else {
      return exportRPDToExcel(rpds, year, data.kua);
    }
  } catch (error) {
    Logger.log(`[EXPORT_RPD_ENHANCED ERROR] ========== ERROR ==========`);
    Logger.log(`[EXPORT_RPD_ENHANCED ERROR] Message: ${error.toString()}`);
    Logger.log(`[EXPORT_RPD_ENHANCED ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal export RPD: ' + error.toString());
  }
}



function exportRPDExcelNew(rpds, year, kua) {
  Logger.log(`[EXPORT_RPD_EXCEL] ========== START (NEW METHOD) ==========`);
  Logger.log(`[EXPORT_RPD_EXCEL] Year: ${year}, KUA: ${kua || 'ALL'}`);
  Logger.log(`[EXPORT_RPD_EXCEL] Total RPDs: ${rpds.length}`);
  
  try {
    const rows = [];
    
    // Headers
    rows.push(['No', 'KUA', 'Bulan', 'Tahun', 'Total', 'Tanggal Dibuat', 'Terakhir Update']);
    
    // Data
    Logger.log(`[EXPORT_RPD_EXCEL] Adding ${rpds.length} data rows`);
    rpds.forEach((rpd, index) => {
      rows.push([
        index + 1,
        rpd.kua || '',
        rpd.month || '',
        rpd.year || '',
        parseFloat(rpd.total) || 0,
        rpd.createdAt ? new Date(rpd.createdAt).toLocaleDateString('id-ID') : '',
        rpd.updatedAt ? new Date(rpd.updatedAt).toLocaleDateString('id-ID') : ''
      ]);
      
      if ((index + 1) % 10 === 0) {
        Logger.log(`[EXPORT_RPD_EXCEL] Progress: ${index + 1}/${rpds.length} rows`);
      }
    });
    
    Logger.log(`[EXPORT_RPD_EXCEL] Creating CSV content`);
    const csvContent = rows.map(row => {
      return row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return '"' + cellStr.replace(/"/g, '""') + '"';
        }
        return cellStr;
      }).join(',');
    }).join('\n');
    
    Logger.log(`[EXPORT_RPD_EXCEL] CSV length: ${csvContent.length} characters`);
    
    const blob = Utilities.newBlob(csvContent, 'text/csv', `RPD ${year}${kua ? ' - ' + kua : ''}.csv`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    
    Logger.log(`[EXPORT_RPD_EXCEL] Base64 length: ${base64.length} characters`);
    Logger.log(`[EXPORT_RPD_EXCEL] ========== SUCCESS ==========`);
    
    return successResponse({
      fileData: base64,
      fileName: `RPD ${year}${kua ? ' - ' + kua : ''}.csv`,
      mimeType: 'text/csv'
    });
    
  } catch (error) {
    Logger.log(`[EXPORT_RPD_EXCEL ERROR] ========== ERROR ==========`);
    Logger.log(`[EXPORT_RPD_EXCEL ERROR] Message: ${error.toString()}`);
    Logger.log(`[EXPORT_RPD_EXCEL ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal export RPD: ' + error.toString());
  }
}

function exportRPDExcel(rpds, year, kua) {
  Logger.log(`[EXPORT_RPD_EXCEL] ========== START ==========`);
  Logger.log(`[EXPORT_RPD_EXCEL] Year: ${year}, KUA: ${kua || 'ALL'}`);
  Logger.log(`[EXPORT_RPD_EXCEL] Total RPDs to export: ${rpds.length}`);
  
  try {
    Logger.log(`[EXPORT_RPD_EXCEL] Creating new spreadsheet`);
    const ss = SpreadsheetApp.create(`Export RPD ${year}${kua ? ' - ' + kua : ''}`);
    const exportSheet = ss.getActiveSheet();
    exportSheet.setName('RPD');
    Logger.log(`[EXPORT_RPD_EXCEL] Spreadsheet created with ID: ${ss.getId()}`);
    
    Logger.log(`[EXPORT_RPD_EXCEL] Adding headers`);
    exportSheet.appendRow(['No', 'KUA', 'Bulan', 'Tahun', 'Total', 'Tanggal Dibuat', 'Terakhir Update']);
    
    Logger.log(`[EXPORT_RPD_EXCEL] Adding ${rpds.length} data rows`);
    let rowNum = 1;
    rpds.forEach((rpd, index) => {
      exportSheet.appendRow([
        rowNum++,
        rpd.kua || '',
        rpd.month || '',
        rpd.year || '',
        parseFloat(rpd.total) || 0,
        rpd.createdAt ? new Date(rpd.createdAt) : '',
        rpd.updatedAt ? new Date(rpd.updatedAt) : ''
      ]);
      
      if ((index + 1) % 10 === 0) {
        Logger.log(`[EXPORT_RPD_EXCEL] Progress: ${index + 1}/${rpds.length} rows added`);
      }
    });
    
    Logger.log(`[EXPORT_RPD_EXCEL] Applying formatting`);
    exportSheet.getRange('A1:G1').setFontWeight('bold').setBackground('#667eea').setFontColor('#ffffff');
    exportSheet.setFrozenRows(1);
    exportSheet.autoResizeColumns(1, 7);
    
    Logger.log(`[EXPORT_RPD_EXCEL] Flushing spreadsheet changes`);
    SpreadsheetApp.flush();
    
    Logger.log(`[EXPORT_RPD_EXCEL] Getting spreadsheet as Excel blob`);
    const fileId = ss.getId();
    const file = DriveApp.getFileById(fileId);
    const blob = file.getAs('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    blob.setName(`RPD ${year}${kua ? ' - ' + kua : ''}.xlsx`);
    
    Logger.log(`[EXPORT_RPD_EXCEL] Encoding to base64`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    Logger.log(`[EXPORT_RPD_EXCEL] Base64 length: ${base64.length} characters`);
    
    Logger.log(`[EXPORT_RPD_EXCEL] Deleting temporary spreadsheet`);
    DriveApp.getFileById(fileId).setTrashed(true);
    
    Logger.log(`[EXPORT_RPD_EXCEL] ========== SUCCESS ==========`);
    return successResponse({
      fileData: base64,
      fileName: blob.getName(),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
  } catch (error) {
    Logger.log(`[EXPORT_RPD_EXCEL ERROR] ========== ERROR ==========`);
    Logger.log(`[EXPORT_RPD_EXCEL ERROR] Message: ${error.toString()}`);
    Logger.log(`[EXPORT_RPD_EXCEL ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal export RPD: ' + error.toString());
  }
}







function exportRealisasiAllExcelNew(realisasis, year, kua) {
  Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] ========== START (NEW METHOD) ==========`);
  Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Year: ${year}, KUA: ${kua || 'ALL'}`);
  Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Total realisasis: ${realisasis.length}`);
  
  try {
    const rows = [];
    
    // Headers
    rows.push(['No', 'KUA', 'Bulan', 'Tahun', 'Total', 'Status', 'Tanggal Dibuat', 'Diverifikasi Oleh', 'Tanggal Verifikasi', 'Catatan']);
    
    // Data
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Adding ${realisasis.length} data rows`);
    realisasis.forEach((real, index) => {
      rows.push([
        index + 1,
        real.kua || '',
        real.month || '',
        real.year || '',
        parseFloat(real.total) || 0,
        real.status || '',
        real.createdAt ? new Date(real.createdAt).toLocaleDateString('id-ID') : '',
        real.verifiedBy || '-',
        real.verifiedAt !== '-' ? (real.verifiedAt ? new Date(real.verifiedAt).toLocaleDateString('id-ID') : '') : '-',
        real.notes || '-'
      ]);
      
      if ((index + 1) % 10 === 0) {
        Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Progress: ${index + 1}/${realisasis.length} rows`);
      }
    });
    
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Creating CSV content`);
    const csvContent = rows.map(row => {
      return row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return '"' + cellStr.replace(/"/g, '""') + '"';
        }
        return cellStr;
      }).join(',');
    }).join('\n');
    
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] CSV length: ${csvContent.length} characters`);
    
    const blob = Utilities.newBlob(csvContent, 'text/csv', `Realisasi ${year}${kua ? ' - ' + kua : ''}.csv`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Base64 length: ${base64.length} characters`);
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] ========== SUCCESS ==========`);
    
    return successResponse({
      fileData: base64,
      fileName: `Realisasi ${year}${kua ? ' - ' + kua : ''}.csv`,
      mimeType: 'text/csv'
    });
    
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL ERROR] ========== ERROR ==========`);
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL ERROR] Message: ${error.toString()}`);
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal export realisasi: ' + error.toString());
  }
}

function exportRealisasiAllExcel(realisasis, year, kua) {
  Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] ========== START ==========`);
  Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Year: ${year}, KUA: ${kua || 'ALL'}`);
  Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Total realisasis to export: ${realisasis.length}`);
  
  try {
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Creating new spreadsheet`);
    const ss = SpreadsheetApp.create(`Export Realisasi ${year}${kua ? ' - ' + kua : ''}`);
    const exportSheet = ss.getActiveSheet();
    exportSheet.setName('Realisasi');
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Spreadsheet created with ID: ${ss.getId()}`);
    
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Adding headers`);
    exportSheet.appendRow(['No', 'KUA', 'Bulan', 'Tahun', 'Total', 'Status', 'Tanggal Dibuat', 'Diverifikasi Oleh', 'Tanggal Verifikasi', 'Catatan']);
    
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Adding ${realisasis.length} data rows`);
    let rowNum = 1;
    realisasis.forEach((real, index) => {
      exportSheet.appendRow([
        rowNum++,
        real.kua || '',
        real.month || '',
        real.year || '',
        parseFloat(real.total) || 0,
        real.status || '',
        real.createdAt ? new Date(real.createdAt) : '',
        real.verifiedBy || '-',
        real.verifiedAt !== '-' ? (real.verifiedAt ? new Date(real.verifiedAt) : '') : '-',
        real.notes || '-'
      ]);
      
      if ((index + 1) % 10 === 0) {
        Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Progress: ${index + 1}/${realisasis.length} rows added`);
      }
    });
    
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Applying formatting`);
    exportSheet.getRange('A1:J1').setFontWeight('bold').setBackground('#667eea').setFontColor('#ffffff');
    exportSheet.setFrozenRows(1);
    exportSheet.autoResizeColumns(1, 10);
    
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Flushing spreadsheet changes`);
    SpreadsheetApp.flush();
    
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Getting spreadsheet as Excel blob`);
    const fileId = ss.getId();
    const file = DriveApp.getFileById(fileId);
    const blob = file.getAs('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    blob.setName(`Realisasi ${year}${kua ? ' - ' + kua : ''}.xlsx`);
    
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Encoding to base64`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Base64 length: ${base64.length} characters`);
    
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Deleting temporary spreadsheet`);
    DriveApp.getFileById(fileId).setTrashed(true);
    
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] ========== SUCCESS ==========`);
    return successResponse({
      fileData: base64,
      fileName: blob.getName(),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL ERROR] ========== ERROR ==========`);
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL ERROR] Message: ${error.toString()}`);
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal export realisasi: ' + error.toString());
  }
}









function exportRPDDetailAllYearExcel(kuaData, kuaBudgets, year) {
  Logger.log(`[EXPORT_RPD_DETAIL_ALL_EXCEL] Creating Excel`);
  
  try {
    const rows = [];
    const kuaList = KUA_LIST.slice().sort();
    
    // Title
    rows.push([`LAPORAN RPD DETAIL SEMUA KUA - TAHUN ${year}`]);
    rows.push(['Kementerian Agama Kabupaten Indramayu']);
    rows.push([]);
    
    // Headers
    const headers = ['No', 'Kode', 'Uraian Program/Kegiatan/Output/Komponen'];
    kuaList.forEach(kua => headers.push(kua));
    headers.push('Total RPD');
    rows.push(headers);
    
    // Budget row
    const budgetRow = ['', '', 'Budget Alokasi Tahunan'];
    let totalBudget = 0;
    kuaList.forEach(kua => {
      budgetRow.push(kuaBudgets[kua] || 0);
      totalBudget += kuaBudgets[kua] || 0;
    });
    budgetRow.push(totalBudget);
    rows.push(budgetRow);
    
    // Detail rows
    let rowNum = 1;
    const kuaTotals = {};
    kuaList.forEach(kua => kuaTotals[kua] = 0);
    let grandTotal = 0;
    
    Object.entries(CONFIG.RPD_PARAMETERS).forEach(([code, param]) => {
      // Main category
      rows.push([rowNum++, code, param.name, ...Array(kuaList.length + 1).fill('')]);
      
      // Items
      param.items.forEach(item => {
        const row = ['', '', `  ${item}`];
        let itemTotal = 0;
        
        kuaList.forEach(kua => {
          const value = kuaData[kua][code][item] || 0;
          row.push(value);
          itemTotal += value;
          kuaTotals[kua] += value;
        });
        
        row.push(itemTotal);
        grandTotal += itemTotal;
        rows.push(row);
      });
    });
    
    // Jumlah row
    const jumlahRow = ['', '', 'Jumlah'];
    kuaList.forEach(kua => jumlahRow.push(kuaTotals[kua]));
    jumlahRow.push(grandTotal);
    rows.push(jumlahRow);
    
    // Sisa Anggaran row
    const sisaRow = ['', '', 'Sisa Anggaran'];
    let totalSisa = 0;
    kuaList.forEach(kua => {
      const sisa = (kuaBudgets[kua] || 0) - (kuaTotals[kua] || 0);
      sisaRow.push(sisa);
      totalSisa += sisa;
    });
    sisaRow.push(totalSisa);
    rows.push(sisaRow);
    
    const tsvContent = rows.map(row => row.map(cell => String(cell).replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t')).join('\n');
    const blob = Utilities.newBlob(tsvContent, 'text/tab-separated-values', `RPD Detail Semua KUA - ${year}.xls`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    
    Logger.log(`[EXPORT_RPD_DETAIL_ALL_EXCEL] Success`);
    
    return successResponse({
      fileData: base64,
      fileName: `RPD Detail Semua KUA - ${year}.xls`,
      mimeType: 'application/vnd.ms-excel'
    });
  } catch (error) {
    Logger.log(`[EXPORT_RPD_DETAIL_ALL_EXCEL ERROR] ${error.toString()}`);
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRPDDetailAllYearPDF(kuaData, kuaBudgets, year) {
  Logger.log(`[EXPORT_RPD_DETAIL_ALL_PDF] Creating PDF`);
  
  try {
    const kuaList = KUA_LIST.slice().sort();
    
    // Build table headers
    let headerCells = '<th>No</th><th>Kode</th><th>Uraian</th>';
    kuaList.forEach(kua => {
      headerCells += `<th style="font-size: 7px;">${kua}</th>`;
    });
    headerCells += '<th>Total</th>';
    
    // Budget row
    let budgetRow = '<tr style="background: #e3f2fd; font-weight: bold;"><td colspan="3">Budget Alokasi Tahunan</td>';
    let totalBudget = 0;
    kuaList.forEach(kua => {
      budgetRow += `<td style="text-align: right;">${formatNumber(kuaBudgets[kua] || 0)}</td>`;
      totalBudget += kuaBudgets[kua] || 0;
    });
    budgetRow += `<td style="text-align: right;">${formatNumber(totalBudget)}</td></tr>`;
    
    // Detail rows
    let detailRows = '';
    let rowNum = 1;
    const kuaTotals = {};
    kuaList.forEach(kua => kuaTotals[kua] = 0);
    let grandTotal = 0;
    
    Object.entries(CONFIG.RPD_PARAMETERS).forEach(([code, param]) => {
      detailRows += `<tr><td>${rowNum++}</td><td>${code}</td><td style="font-weight: bold;">${param.name}</td>${'<td></td>'.repeat(kuaList.length + 1)}</tr>`;
      
      param.items.forEach(item => {
        let itemRow = `<tr><td></td><td></td><td style="padding-left: 15px;">${item}</td>`;
        let itemTotal = 0;
        
        kuaList.forEach(kua => {
          const value = kuaData[kua][code][item] || 0;
          itemRow += `<td style="text-align: right;">${formatNumber(value)}</td>`;
          itemTotal += value;
          kuaTotals[kua] += value;
        });
        
        itemRow += `<td style="text-align: right;">${formatNumber(itemTotal)}</td></tr>`;
        grandTotal += itemTotal;
        detailRows += itemRow;
      });
    });
    
    // Jumlah row
    let jumlahRow = '<tr style="background: #fff3cd; font-weight: bold;"><td colspan="3">Jumlah</td>';
    kuaList.forEach(kua => {
      jumlahRow += `<td style="text-align: right;">${formatNumber(kuaTotals[kua])}</td>`;
    });
    jumlahRow += `<td style="text-align: right;">${formatNumber(grandTotal)}</td></tr>`;
    
    // Sisa row
    let sisaRow = '<tr style="background: #f8d7da; font-weight: bold;"><td colspan="3">Sisa Anggaran</td>';
    let totalSisa = 0;
    kuaList.forEach(kua => {
      const sisa = (kuaBudgets[kua] || 0) - (kuaTotals[kua] || 0);
      sisaRow += `<td style="text-align: right;">${formatNumber(sisa)}</td>`;
      totalSisa += sisa;
    });
    sisaRow += `<td style="text-align: right;">${formatNumber(totalSisa)}</td></tr>`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          body { font-family: Arial, sans-serif; font-size: 7px; }
          .header { text-align: center; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 4px; border: 1px solid #ddd; }
          th { background: #667eea; color: white; font-size: 7px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2 style="margin: 5px 0;">LAPORAN RPD DETAIL SEMUA KUA</h2>
          <h3 style="margin: 5px 0;">Kementerian Agama Kabupaten Indramayu - Tahun ${year}</h3>
        </div>
        
        <table>
          <thead><tr>${headerCells}</tr></thead>
          <tbody>
            ${budgetRow}
            ${detailRows}
            ${jumlahRow}
            ${sisaRow}
          </tbody>
        </table>
        
        <div style="margin-top: 20px; text-align: right;">
          <p>Indramayu, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p style="margin-top: 40px;"><strong>( ${NAMA_KASI_BIMAS} )</strong></p>
          <p>${NIP_KASI_BIMAS}</p>
        </div>
      </body>
      </html>
    `;
    
    const blob = Utilities.newBlob(htmlContent, MimeType.HTML, 'temp.html');
    const pdfBlob = blob.getAs('application/pdf');
    pdfBlob.setName(`RPD Detail Semua KUA - ${year}.pdf`);
    
    const base64 = Utilities.base64Encode(pdfBlob.getBytes());
    
    Logger.log(`[EXPORT_RPD_DETAIL_ALL_PDF] Success`);
    
    return successResponse({
      fileData: base64,
      fileName: pdfBlob.getName(),
      mimeType: 'application/pdf'
    });
  } catch (error) {
    Logger.log(`[EXPORT_RPD_DETAIL_ALL_PDF ERROR] ${error.toString()}`);
    return errorResponse('Gagal export PDF: ' + error.toString());
  }
}









// ===== BMN STATS =====
function getBMNStats(data) {
  Logger.log('[BMN_STATS] Getting stats');
  
  try {
    const sheet = getSheet(BMN_SHEETS.BMN_DATA);
    const values = sheet.getDataRange().getValues();
    
    let stats = {
      totalBMN: 0,
      kondisiBaik: 0,
      rusakRingan: 0,
      rusakBerat: 0,
      menungguVerifikasi: 0
    };
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      
      // Filter by KUA if operator
      if (data.role === 'Operator KUA' && row[1] !== data.kua) continue;
      
      stats.totalBMN++;
      
      // Count by kondisi (column 7)
      if (row[8] === 'Baik') stats.kondisiBaik++;
      if (row[8] === 'Rusak Ringan') stats.rusakRingan++;
      if (row[8] === 'Rusak Berat') stats.rusakBerat++;
      
      // Count menunggu verifikasi (column 14)
      if (row[14] === 'Menunggu') stats.menungguVerifikasi++;
    }
    
    Logger.log('[BMN_STATS] Success');
    return successResponse(stats);
  } catch (error) {
    Logger.log('[BMN_STATS ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

// ===== GET BMN DATA =====
function getBMNData(data) {
  Logger.log('[BMN_DATA] Getting BMN data');
  
  try {
    const sheet = getSheet(BMN_SHEETS.BMN_DATA);
    const values = sheet.getDataRange().getValues();
    
    const bmnList = [];
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      
      // Filter by KUA
      if (data.kua && row[1] !== data.kua) continue;
      
      // Filter by jenis
      if (data.jenis && row[4] !== data.jenis) continue;
      
      // Filter by kondisi
      if (data.kondisi && row[8] !== data.kondisi) continue;
      
      // Filter by status
      if (data.status && row[9] !== data.status) continue;
      
      bmnList.push({
        id: row[0],
        kua: row[1],
        kodeBarang: row[2],
        namaBarang: row[3],
        jenis: row[4],
        tahunPerolehan: row[5],
        sumberPerolehan: row[6],
        kondisi: row[8],
        status: row[9],
        lokasiBarang: row[10],
        idBMN: row[11],
        keterangan: row[12],
        fotos: JSON.parse(row[13] || '[]'),
        statusVerifikasi: row[14],
        catatanVerifikasi: row[15],
        createdAt: row[16],
        updatedAt: row[17]
      });
    }
    
    Logger.log('[BMN_DATA] Found: ' + bmnList.length);
    return successResponse(bmnList);
  } catch (error) {
    Logger.log('[BMN_DATA ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

// ===== SAVE BMN =====
function saveBMN(data) {
  Logger.log('[SAVE_BMN] Saving BMN: ' + data.kodeBarang);
  
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  
  try {
    const sheet = getSheet(BMN_SHEETS.BMN_DATA);
    const values = sheet.getDataRange().getValues();
    
    let rowIndex = -1;
    
    // Check if updating existing
    if (data.id) {
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] === data.id) {
          rowIndex = i + 1;
          break;
        }
      }
    }
    
    // Check duplicate kode barang
    for (let i = 1; i < values.length; i++) {
      if (values[i][2] === data.kodeBarang && values[i][0] !== data.id) {
        return errorResponse('Kode barang sudah digunakan');
      }
    }
    
    const bmnData = [
      data.id || generateID(),
      data.kua,
      data.kodeBarang,
      data.namaBarang,
      data.jenis,
      data.tahunPerolehan,
      data.sumberPerolehan || '',
      '',
      data.kondisi,
      data.status,
      data.lokasiBarang,
      data.idBMN || '',
      data.keterangan || '',
      JSON.stringify(data.fotos || []),
      data.statusVerifikasi || 'Menunggu',
      data.catatanVerifikasi || '',
      data.id ? values[rowIndex - 1][16] : new Date(),
      new Date()
    ];
    
    if (rowIndex > 0) {
      // Update existing
      sheet.getRange(rowIndex, 1, 1, bmnData.length).setValues([bmnData]);
      
      // Log riwayat
      logBMNRiwayat(data.kua, data.kodeBarang, data.namaBarang, 'UPDATE', data.username);
      
      Logger.log('[SAVE_BMN] Updated');
    } else {
      // Insert new
      sheet.appendRow(bmnData);
      
      // Log riwayat
      logBMNRiwayat(data.kua, data.kodeBarang, data.namaBarang, 'CREATE', data.username);
      
      Logger.log('[SAVE_BMN] Created');
    }
    
    return successResponse({ message: 'Data BMN berhasil disimpan', id: bmnData[0] });
  } catch (error) {
    Logger.log('[SAVE_BMN ERROR] ' + error.toString());
    return errorResponse(error.toString());
  } finally {
    lock.releaseLock();
  }
}

// ===== UPLOAD BMN PHOTO =====
function uploadBMNPhoto(data) {
  Logger.log('[UPLOAD_PHOTO] File: ' + data.fileName);
  
  try {
    const folder = DriveApp.getFolderById(BMN_DRIVE_FOLDER);
    
    // Create KUA folder
    let kuaFolder = getOrCreateFolder(folder, data.kua);
    
    // Create kodeBarang folder
    let bmnFolder = getOrCreateFolder(kuaFolder, data.kodeBarang);
    
    // Decode and create file
    const blob = Utilities.newBlob(
      Utilities.base64Decode(data.fileData),
      data.mimeType,
      data.fileName
    );
    
    const file = bmnFolder.createFile(blob);
    
    Logger.log('[UPLOAD_PHOTO] Success: ' + file.getId());
    return successResponse({
      fileId: file.getId(),
      fileName: file.getName(),
      fileUrl: file.getUrl(),
      mimeType: data.mimeType
    });
  } catch (error) {
    Logger.log('[UPLOAD_PHOTO ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

// ===== BMN VERIFIKASI =====
function getBMNVerifikasi(data) {
  Logger.log('[BMN_VERIFIKASI] Getting data');
  
  try {
    const sheet = getSheet(BMN_SHEETS.BMN_DATA);
    const values = sheet.getDataRange().getValues();
    
    const verifikasiList = [];
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      
      // Filter by KUA
      if (data.kua && row[1] !== data.kua) continue;
      
      // Filter by status verifikasi
      if (data.statusVerifikasi && row[14] !== data.statusVerifikasi) continue;
      
      verifikasiList.push({
        id: row[0],
        kua: row[1],
        kodeBarang: row[2],
        namaBarang: row[3],
        jenis: row[4],
        kondisi: row[8],
        statusVerifikasi: row[14],
        catatanVerifikasi: row[15],
        createdAt: row[16],
        fotos: JSON.parse(row[13] || '[]')
      });
    }
    
    Logger.log('[BMN_VERIFIKASI] Found: ' + verifikasiList.length);
    return successResponse(verifikasiList);
  } catch (error) {
    Logger.log('[BMN_VERIFIKASI ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

function updateBMNVerifikasi(data) {
  Logger.log('[UPDATE_VERIFIKASI] ID: ' + data.id);
  
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  
  try {
    const sheet = getSheet(BMN_SHEETS.BMN_DATA);
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.id) {
        // Update status verifikasi (column 15) and catatan (column 16)
        sheet.getRange(i + 1, 15).setValue(data.statusVerifikasi);
        sheet.getRange(i + 1, 16).setValue(data.catatanVerifikasi || '');
        sheet.getRange(i + 1, 18).setValue(new Date());
        
        // Log riwayat
        logBMNRiwayat(
          values[i][1], // kua
          values[i][2], // kode barang
          values[i][3], // nama barang
          'VERIFIKASI_' + data.statusVerifikasi,
          data.username
        );
        
        Logger.log('[UPDATE_VERIFIKASI] Success');
        return successResponse({ message: 'Verifikasi berhasil disimpan' });
      }
    }
    
    return errorResponse('Data tidak ditemukan');
  } catch (error) {
    Logger.log('[UPDATE_VERIFIKASI ERROR] ' + error.toString());
    return errorResponse(error.toString());
  } finally {
    lock.releaseLock();
  }
}

// ===== BMN RIWAYAT =====
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
        perubahan: row[4],  // PERBAIKAN: menggunakan 'perubahan' bukan 'action'
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
          th { background: #667eea; color: white; padding: 8px; }
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

// Initialize BMN Sheets if not exist
function initializeBMNSheets() {
  const ss = SpreadsheetApp.openById(SS_ID);
  
  // BMN Data Sheet
  let bmnSheet = ss.getSheetByName(BMN_SHEETS.BMN_DATA);
  if (!bmnSheet) {
    bmnSheet = ss.insertSheet(BMN_SHEETS.BMN_DATA);
    bmnSheet.appendRow([
      'ID', 'KUA', 'Kode Barang', 'Nama Barang', 'Jenis', 'Tahun Perolehan',
      'Sumber Perolehan', 'Nilai Perolehan', 'Kondisi', 'Status', 'Lokasi Barang',
      'ID BMN', 'Keterangan', 'Fotos (JSON)', 'Status Verifikasi', 'Catatan Verifikasi',
      'Created At', 'Updated At'
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