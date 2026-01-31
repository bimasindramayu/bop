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

// ===== RPD MANAGEMENT =====
function getRPDs(data) {
  Logger.log(`[GET_RPDS] KUA: ${data.kua}, Year: ${data.year}`);
  const sheet = getSheet(SHEETS.RPD);
  const values = sheet.getDataRange().getValues();
  const year = data.year || new Date().getFullYear();
  
  const rpds = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if ((data.kua && row[1] === data.kua) || !data.kua) {
      if (row[4] == year) {
        rpds.push({
          id: row[0],
          kua: row[1],
          userId: row[2],
          month: row[3],
          year: row[4],
          data: JSON.parse(row[5] || '{}'),
          total: row[6],
          createdAt: row[7],
          updatedAt: row[8]
        });
      }
    }
  }
  
  Logger.log(`[GET_RPDS] Found: ${rpds.length} RPDs`);
  return successResponse(rpds);
}

function saveRPD(data) {
  Logger.log(`[SAVE_RPD] KUA: ${data.kua}, Month: ${data.month}, Year: ${data.year}, ID: ${data.id || 'NEW'}`);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  
  try {
    // Priority 1: Check if RPD config allows input
    const configSheet = getSheet(SHEETS.CONFIG);
    const configValues = configSheet.getDataRange().getValues();
    let rpdStatus = 'open';
    for (let i = 1; i < configValues.length; i++) {
      if (configValues[i][0] === 'RPD_STATUS') {
        rpdStatus = configValues[i][1];
        break;
      }
    }
    
    if (rpdStatus === 'closed' && data.role !== 'Admin') {
      Logger.log(`[SAVE_RPD] Failed: RPD is closed by config`);
      return errorResponse('Pengisian RPD sedang ditutup oleh admin');
    }
    
    const sheet = getSheet(SHEETS.RPD);
    const values = sheet.getDataRange().getValues();
    
    // Get current date info
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth(); // 0-11
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                       'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const rpdMonthIndex = monthNames.indexOf(data.month);
    const rpdYear = parseInt(data.year);
    
    // Check for duplicate (different ID, same KUA-Month-Year)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[1] === data.kua && row[3] === data.month && row[4] == data.year && row[0] !== data.id) {
        Logger.log(`[SAVE_RPD] Failed: Duplicate RPD found`);
        return errorResponse('RPD untuk bulan ini sudah ada');
      }
    }
    
    // VALIDASI KHUSUS UNTUK OPERATOR
    if (data.role === 'Operator KUA') {
      // Jika EDIT (ada ID) - tidak boleh edit bulan ini dan bulan sebelumnya
      if (data.id) {
        if (rpdYear < currentYear || (rpdYear === currentYear && rpdMonthIndex <= currentMonth)) {
          Logger.log(`[SAVE_RPD] Failed: Cannot edit current/past month RPD`);
          return errorResponse('RPD untuk bulan ini dan bulan sebelumnya tidak dapat diubah');
        }
      } 
      // Jika CREATE (tidak ada ID) - boleh create untuk bulan ini dan bulan depan
      else {
        if (rpdYear < currentYear || (rpdYear === currentYear && rpdMonthIndex < currentMonth)) {
          Logger.log(`[SAVE_RPD] Failed: Cannot create past month RPD`);
          return errorResponse('RPD hanya dapat dibuat untuk bulan ini atau bulan yang akan datang');
        }
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
    
    const rpdData = [
      data.id || generateID(),
      data.kua,
      data.userId,
      data.month,
      data.year || new Date().getFullYear(),
      JSON.stringify(data.rpdData),
      parseFloat(data.total),
      data.id && rowIndex > 0 ? values[rowIndex - 1][7] : new Date(),
      new Date()
    ];
    
    if (rowIndex > 0) {
      sheet.getRange(rowIndex, 1, 1, rpdData.length).setValues([rpdData]);
      Logger.log(`[SAVE_RPD] Updated existing RPD`);
    } else {
      sheet.appendRow(rpdData);
      Logger.log(`[SAVE_RPD] Created new RPD`);
    }
    
    // Update budget total RPD
    updateBudgetTotalRPD(data.kua, data.year || new Date().getFullYear());
    
    logAction(data.userId, data.username, data.role, 'SAVE_RPD', { month: data.month, total: data.total });
    return successResponse({ message: 'RPD berhasil disimpan', id: rpdData[0] });
  } finally {
    lock.releaseLock();
  }
}

function deleteRPD(data) {
  Logger.log(`[DELETE_RPD] ID: ${data.id}`);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  
  try {
    const sheet = getSheet(SHEETS.RPD);
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.id) {
        sheet.deleteRow(i + 1);
        updateBudgetTotalRPD(values[i][1], values[i][4]);
        logAction(data.userId, data.username, data.role, 'DELETE_RPD', { id: data.id });
        Logger.log(`[DELETE_RPD] Success`);
        return successResponse({ message: 'RPD berhasil dihapus' });
      }
    }
    
    Logger.log(`[DELETE_RPD] Failed: RPD not found`);
    return errorResponse('RPD tidak ditemukan');
  } finally {
    lock.releaseLock();
  }
}

// ===== REALISASI MANAGEMENT =====
function getRealisasis(data) {
  Logger.log(`[GET_REALISASIS] KUA: ${data.kua}, Year: ${data.year}`);
  const sheet = getSheet(SHEETS.REALISASI);
  const values = sheet.getDataRange().getValues();
  const year = data.year || new Date().getFullYear();
  
  const realisasis = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if ((data.kua && row[1] === data.kua) || !data.kua) {
      if (row[4] == year) {
        realisasis.push({
          id: row[0],
          kua: row[1],
          userId: row[2],
          month: row[3],
          year: row[4],
          rpdId: row[5],
          data: JSON.parse(row[6] || '{}'),
          total: row[7],
          status: row[8],
          files: JSON.parse(row[9] || '[]'),
          createdAt: row[10],
          updatedAt: row[11],
          verifiedBy: row[12],
          verifiedAt: row[13],
          notes: row[14]
        });
      }
    }
  }
  
  Logger.log(`[GET_REALISASIS] Found: ${realisasis.length} realisasis`);
  return successResponse(realisasis);
}

function saveRealisasi(data) {
  Logger.log(`[SAVE_REALISASI] ========== START ==========`);
  Logger.log(`[SAVE_REALISASI] KUA: ${data.kua}, Month: ${data.month}, Year: ${data.year}`);
  Logger.log(`[SAVE_REALISASI] ID: ${data.id || 'NEW'}`);
  Logger.log(`[SAVE_REALISASI] Files received: ${data.files ? data.files.length : 0}`);
  
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  
  try {
    const sheet = getSheet(SHEETS.REALISASI);
    const values = sheet.getDataRange().getValues();
    
    // Check if RPD exists
    if (!data.rpdId) {
      Logger.log(`[SAVE_REALISASI] Failed: No RPD found`);
      return errorResponse('RPD untuk bulan ini belum ada');
    }
    
    // Check duplicate
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[1] === data.kua && row[3] === data.month && row[4] == data.year && row[0] !== data.id) {
        Logger.log(`[SAVE_REALISASI] Failed: Duplicate realisasi`);
        return errorResponse('Realisasi untuk bulan ini sudah ada');
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
    
    Logger.log(`[SAVE_REALISASI] Row index: ${rowIndex}`);
    
    // Handle files - simpan metadata saja (fileId, fileName, fileUrl)
    let filesToSave = [];
    
    if (data.files && Array.isArray(data.files) && data.files.length > 0) {
      Logger.log(`[SAVE_REALISASI] Processing files metadata: ${data.files.length}`);
      
      filesToSave = data.files.filter(file => {
        return file && file.fileId && file.fileName;
      }).map(file => ({
        fileId: file.fileId,
        fileName: file.fileName,
        fileUrl: file.fileUrl,
        mimeType: file.mimeType || 'application/octet-stream',
        size: file.size || 0
      }));
      
      Logger.log(`[SAVE_REALISASI] Valid files metadata: ${filesToSave.length}`);
    } else if (rowIndex > 0 && values[rowIndex - 1][9]) {
      // Keep existing files
      Logger.log(`[SAVE_REALISASI] Keeping existing files`);
      try {
        const existingFiles = JSON.parse(values[rowIndex - 1][9]);
        if (Array.isArray(existingFiles)) {
          filesToSave = existingFiles;
          Logger.log(`[SAVE_REALISASI] Kept ${filesToSave.length} existing files`);
        }
      } catch (e) {
        Logger.log(`[SAVE_REALISASI] Error parsing existing files: ${e}`);
      }
    }
    
    Logger.log(`[SAVE_REALISASI] FINAL files count: ${filesToSave.length}`);
    
    const filesJSON = JSON.stringify(filesToSave);
    
    const realisasiData = [
      data.id || generateID(),
      data.kua,
      data.userId,
      data.month,
      data.year || new Date().getFullYear(),
      data.rpdId,
      JSON.stringify(data.realisasiData),
      parseFloat(data.total),
      data.status || 'Menunggu',
      filesJSON,
      data.id && rowIndex > 0 ? values[rowIndex - 1][10] : new Date(),
      new Date(),
      '',
      '',
      ''
    ];
    
    if (rowIndex > 0) {
      if (data.status === 'Menunggu' && values[rowIndex - 1][8] === 'Ditolak') {
        Logger.log(`[SAVE_REALISASI] Resetting verification data`);
        realisasiData[12] = '';
        realisasiData[13] = '';
        realisasiData[14] = '';
      } else {
        realisasiData[12] = values[rowIndex - 1][12] || '';
        realisasiData[13] = values[rowIndex - 1][13] || '';
        realisasiData[14] = values[rowIndex - 1][14] || '';
      }
      
      sheet.getRange(rowIndex, 1, 1, realisasiData.length).setValues([realisasiData]);
      Logger.log(`[SAVE_REALISASI] Updated with ${filesToSave.length} files`);
    } else {
      sheet.appendRow(realisasiData);
      Logger.log(`[SAVE_REALISASI] Created with ${filesToSave.length} files`);
    }
    
    // Update budget total realisasi if status is Diterima
    if (data.status === 'Diterima' || (rowIndex > 0 && values[rowIndex - 1][8] === 'Diterima')) {
      updateBudgetTotalRealisasi(data.kua, data.year || new Date().getFullYear());
    }
    
    logAction(data.userId, data.username, data.role, 'SAVE_REALISASI', { 
      month: data.month, 
      total: data.total, 
      filesCount: filesToSave.length 
    });
    
    Logger.log(`[SAVE_REALISASI] ========== END SUCCESS ==========`);
    
    return successResponse({ 
      message: 'Realisasi berhasil disimpan', 
      id: realisasiData[0],
      filesCount: filesToSave.length
    });
  } catch (error) {
    Logger.log(`[SAVE_REALISASI ERROR] ${error.toString()}`);
    Logger.log(`[SAVE_REALISASI] ========== END ERROR ==========`);
    throw error;
  } finally {
    lock.releaseLock();
  }
}

function updateRealisasiStatus(data) {
  Logger.log(`[UPDATE_REALISASI_STATUS] ID: ${data.id}, Status: ${data.status}`);
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  
  try {
    const sheet = getSheet(SHEETS.REALISASI);
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.id) {
        // Update only status, verified by, verified at, and notes columns (columns 9, 13, 14, 15)
        sheet.getRange(i + 1, 9).setValue(data.status);
        sheet.getRange(i + 1, 12).setValue(new Date());
        sheet.getRange(i + 1, 13).setValue(data.verifiedBy);
        sheet.getRange(i + 1, 14).setValue(new Date());
        sheet.getRange(i + 1, 15).setValue(data.notes || '');
        
        // Update budget total realisasi
        updateBudgetTotalRealisasi(values[i][1], values[i][4]);
        
        logAction(data.adminId, data.adminUsername, 'Admin', 'VERIFY_REALISASI', { 
          id: data.id, 
          status: data.status 
        });
        
        Logger.log(`[UPDATE_REALISASI_STATUS] Success`);
        return successResponse({ message: 'Status realisasi berhasil diperbarui' });
      }
    }
    
    Logger.log(`[UPDATE_REALISASI_STATUS] Failed: Realisasi not found`);
    return errorResponse('Realisasi tidak ditemukan');
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

// ===== FILE UPLOAD =====
function uploadFile(data) {
  Logger.log(`[UPLOAD_FILE] File: ${data.fileName}, KUA: ${data.kua}, Month: ${data.month}`);
  try {
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const year = data.year || new Date().getFullYear();
    const kua = data.kua;
    const month = data.month;
    
    // Create folder structure: Year/KUA/Month
    let yearFolder = getOrCreateFolder(folder, year.toString());
    let kuaFolder = getOrCreateFolder(yearFolder, kua);
    let monthFolder = getOrCreateFolder(kuaFolder, month);
    
    // Decode base64 and create file
    const blob = Utilities.newBlob(
      Utilities.base64Decode(data.fileData),
      data.mimeType,
      data.fileName
    );
    
    const file = monthFolder.createFile(blob);
    
    Logger.log(`[UPLOAD_FILE] Success: ${file.getId()}`);
    return successResponse({
      fileId: file.getId(),
      fileName: file.getName(),
      fileUrl: file.getUrl()
    });
  } catch (error) {
    Logger.log(`[UPLOAD_FILE ERROR] ${error.toString()}`);
    return errorResponse('Gagal mengupload file: ' + error.toString());
  }
}

function getOrCreateFolder(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder(folderName);
  }
}

// ===== DASHBOARD STATS =====
function getDashboardStats(data) {
  Logger.log(`[GET_DASHBOARD_STATS] Role: ${data.role}, KUA: ${data.kua}`);
  const year = new Date().getFullYear();
  
  if (data.role === 'Admin') {
    const budgetSheet = getSheet(SHEETS.BUDGET);
    const budgetValues = budgetSheet.getDataRange().getValues();
    
    let totalBudget = 0;
    let totalRPD = 0;
    let totalRealisasi = 0;
    
    for (let i = 1; i < budgetValues.length; i++) {
      if (budgetValues[i][2] == year) {
        totalBudget += parseFloat(budgetValues[i][3] || 0);
        totalRPD += parseFloat(budgetValues[i][4] || 0);
        totalRealisasi += parseFloat(budgetValues[i][5] || 0);
      }
    }
    
    const realisasiSheet = getSheet(SHEETS.REALISASI);
    const realisasiValues = realisasiSheet.getDataRange().getValues();
    
    let pending = 0;
    for (let i = 1; i < realisasiValues.length; i++) {
      if (realisasiValues[i][8] === 'Menunggu' && realisasiValues[i][4] == year) {
        pending++;
      }
    }
    
    return successResponse({
      totalBudget,
      totalRPD,
      totalRealisasi,
      sisaBudget: totalBudget - totalRealisasi,
      pendingVerifikasi: pending
    });
  } else {
    // Operator stats
    const budgetSheet = getSheet(SHEETS.BUDGET);
    const budgetValues = budgetSheet.getDataRange().getValues();
    
    let budget = 0;
    for (let i = 1; i < budgetValues.length; i++) {
      if (budgetValues[i][1] === data.kua && budgetValues[i][2] == year) {
        budget = parseFloat(budgetValues[i][3] || 0);
        break;
      }
    }
    
    const rpdSheet = getSheet(SHEETS.RPD);
    const rpdValues = rpdSheet.getDataRange().getValues();
    
    let totalRPD = 0;
    let rpdCount = 0;
    for (let i = 1; i < rpdValues.length; i++) {
      if (rpdValues[i][1] === data.kua && rpdValues[i][4] == year) {
        totalRPD += parseFloat(rpdValues[i][6] || 0);
        rpdCount++;
      }
    }
    
    const realisasiSheet = getSheet(SHEETS.REALISASI);
    const realisasiValues = realisasiSheet.getDataRange().getValues();
    
    let totalRealisasi = 0;
    let realisasiCount = 0;
    for (let i = 1; i < realisasiValues.length; i++) {
      if (realisasiValues[i][1] === data.kua && realisasiValues[i][4] == year && realisasiValues[i][8] === 'Diterima') {
        totalRealisasi += parseFloat(realisasiValues[i][7] || 0);
        realisasiCount++;
      }
    }
    
    return successResponse({
      budget,
      totalRPD,
      totalRealisasi,
      sisaBudget: budget - totalRealisasi,
      rpdCount,
      realisasiCount
    });
  }
}

// ===== EXPORT FUNCTIONS =====
function exportBudget(data) {
  Logger.log(`[EXPORT_BUDGET] Year: ${data.year}, KUA: ${data.kua}`);
  try {
    const sheet = getSheet(SHEETS.BUDGET);
    const values = sheet.getDataRange().getValues();
    const year = data.year || new Date().getFullYear();
    
    // Create new spreadsheet
    const ss = SpreadsheetApp.create(`Export Budget ${year} - ${new Date().toLocaleDateString('id-ID')}`);
    const exportSheet = ss.getActiveSheet();
    exportSheet.setName('Budget');
    
    // Add headers
    exportSheet.appendRow(['No', 'KUA', 'Tahun', 'Budget', 'Total RPD', 'Total Realisasi', 'Sisa Budget', 'Terakhir Update']);
    
    // Add data
    let rowNum = 1;
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[2] == year && (!data.kua || row[1] === data.kua)) {
        exportSheet.appendRow([
          rowNum++,
          row[1],
          row[2],
          row[3],
          row[4] || 0,
          row[5] || 0,
          row[3] - (row[5] || 0),
          row[6]
        ]);
      }
    }
    
    // Format
    exportSheet.getRange('A1:H1').setFontWeight('bold').setBackground('#667eea').setFontColor('#ffffff');
    exportSheet.setFrozenRows(1);
    exportSheet.autoResizeColumns(1, 8);
    
    Logger.log(`[EXPORT_BUDGET] Success: ${ss.getId()}`);
    return successResponse({
      fileId: ss.getId(),
      fileUrl: ss.getUrl(),
      fileName: ss.getName()
    });
  } catch (error) {
    Logger.log(`[EXPORT_BUDGET ERROR] ${error.toString()}`);
    return errorResponse('Gagal export budget: ' + error.toString());
  }
}

function exportRPD(data) {
  Logger.log(`[EXPORT_RPD] Year: ${data.year}, KUA: ${data.kua}`);
  try {
    const sheet = getSheet(SHEETS.RPD);
    const values = sheet.getDataRange().getValues();
    const year = data.year || new Date().getFullYear();
    
    // Create new spreadsheet
    const ss = SpreadsheetApp.create(`Export RPD ${year} - ${new Date().toLocaleDateString('id-ID')}`);
    const exportSheet = ss.getActiveSheet();
    exportSheet.setName('RPD');
    
    // Add headers
    exportSheet.appendRow(['No', 'KUA', 'Bulan', 'Tahun', 'Total', 'Tanggal Dibuat', 'Terakhir Update']);
    
    // Add data
    let rowNum = 1;
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[4] == year && (!data.kua || row[1] === data.kua)) {
        exportSheet.appendRow([
          rowNum++,
          row[1],
          row[3],
          row[4],
          row[6],
          row[7],
          row[8]
        ]);
      }
    }
    
    // Format
    exportSheet.getRange('A1:G1').setFontWeight('bold').setBackground('#667eea').setFontColor('#ffffff');
    exportSheet.setFrozenRows(1);
    exportSheet.autoResizeColumns(1, 7);
    
    Logger.log(`[EXPORT_RPD] Success: ${ss.getId()}`);
    return successResponse({
      fileId: ss.getId(),
      fileUrl: ss.getUrl(),
      fileName: ss.getName()
    });
  } catch (error) {
    Logger.log(`[EXPORT_RPD ERROR] ${error.toString()}`);
    return errorResponse('Gagal export RPD: ' + error.toString());
  }
}

function exportRealisasi(data) {
  Logger.log(`[EXPORT_REALISASI] Year: ${data.year}, KUA: ${data.kua}`);
  try {
    const sheet = getSheet(SHEETS.REALISASI);
    const values = sheet.getDataRange().getValues();
    const year = data.year || new Date().getFullYear();
    
    // Create new spreadsheet
    const ss = SpreadsheetApp.create(`Export Realisasi ${year} - ${new Date().toLocaleDateString('id-ID')}`);
    const exportSheet = ss.getActiveSheet();
    exportSheet.setName('Realisasi');
    
    // Add headers
    exportSheet.appendRow(['No', 'KUA', 'Bulan', 'Tahun', 'Total', 'Status', 'Tanggal Dibuat', 'Diverifikasi Oleh', 'Tanggal Verifikasi', 'Catatan']);
    
    // Add data
    let rowNum = 1;
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[4] == year && (!data.kua || row[1] === data.kua)) {
        exportSheet.appendRow([
          rowNum++,
          row[1],
          row[3],
          row[4],
          row[7],
          row[8],
          row[10],
          row[12] || '-',
          row[13] || '-',
          row[14] || '-'
        ]);
      }
    }
    
    // Format
    exportSheet.getRange('A1:J1').setFontWeight('bold').setBackground('#667eea').setFontColor('#ffffff');
    exportSheet.setFrozenRows(1);
    exportSheet.autoResizeColumns(1, 10);
    
    Logger.log(`[EXPORT_REALISASI] Success: ${ss.getId()}`);
    return successResponse({
      fileId: ss.getId(),
      fileUrl: ss.getUrl(),
      fileName: ss.getName()
    });
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI ERROR] ${error.toString()}`);
    return errorResponse('Gagal export realisasi: ' + error.toString());
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

// ===== DOWNLOAD REALISASI BULANAN (PDF & EXCEL) =====
function downloadRealisasiBulanan(data) {
  Logger.log(`[DOWNLOAD_REALISASI] ========== START ==========`);
  Logger.log(`[DOWNLOAD_REALISASI] ID: ${data.id}`);
  Logger.log(`[DOWNLOAD_REALISASI] Format: ${data.format}`);
  Logger.log(`[DOWNLOAD_REALISASI] User: ${data.username}`);
  
  try {
    const realisasiSheet = getSheet(SHEETS.REALISASI);
    const realisasiValues = realisasiSheet.getDataRange().getValues();
    
    Logger.log(`[DOWNLOAD_REALISASI] Searching for realisasi with ID: ${data.id}`);
    
    let realisasi = null;
    for (let i = 1; i < realisasiValues.length; i++) {
      if (realisasiValues[i][0] === data.id) {
        Logger.log(`[DOWNLOAD_REALISASI] Found realisasi at row ${i + 1}`);
        realisasi = {
          id: realisasiValues[i][0],
          kua: realisasiValues[i][1],
          userId: realisasiValues[i][2],
          month: realisasiValues[i][3],
          year: realisasiValues[i][4],
          rpdId: realisasiValues[i][5],
          data: JSON.parse(realisasiValues[i][6] || '{}'),
          total: realisasiValues[i][7],
          status: realisasiValues[i][8],
          files: JSON.parse(realisasiValues[i][9] || '[]'),
          createdAt: realisasiValues[i][10],
          updatedAt: realisasiValues[i][11],
          verifiedBy: realisasiValues[i][12],
          verifiedAt: realisasiValues[i][13],
          notes: realisasiValues[i][14]
        };
        break;
      }
    }
    
    if (!realisasi) {
      Logger.log(`[DOWNLOAD_REALISASI ERROR] Realisasi not found`);
      return errorResponse('Realisasi tidak ditemukan');
    }
    
    Logger.log(`[DOWNLOAD_REALISASI] Realisasi found: ${realisasi.kua} - ${realisasi.month} ${realisasi.year}`);
    
    // Get RPD data
    Logger.log(`[DOWNLOAD_REALISASI] Loading RPD data with ID: ${realisasi.rpdId}`);
    const rpdSheet = getSheet(SHEETS.RPD);
    const rpdValues = rpdSheet.getDataRange().getValues();
    let rpd = null;
    for (let i = 1; i < rpdValues.length; i++) {
      if (rpdValues[i][0] === realisasi.rpdId) {
        Logger.log(`[DOWNLOAD_REALISASI] Found RPD at row ${i + 1}`);
        rpd = {
          data: JSON.parse(rpdValues[i][5] || '{}')
        };
        break;
      }
    }
    
    if (!rpd) {
      Logger.log(`[DOWNLOAD_REALISASI WARNING] RPD not found, using empty data`);
      rpd = { data: {} };
    }
    
    Logger.log(`[DOWNLOAD_REALISASI] Starting export with format: ${data.format}`);
    
    if (data.format === 'excel') {
      return exportRealisasiToExcel(realisasi, rpd);
    } else if (data.format === 'pdf') {
      return exportRealisasiPDF(realisasi, rpd, data);
    }
    
    Logger.log(`[DOWNLOAD_REALISASI ERROR] Invalid format: ${data.format}`);
    return errorResponse('Format tidak valid');
    
  } catch (error) {
    Logger.log(`[DOWNLOAD_REALISASI ERROR] ========== ERROR ==========`);
    Logger.log(`[DOWNLOAD_REALISASI ERROR] Message: ${error.toString()}`);
    Logger.log(`[DOWNLOAD_REALISASI ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal download realisasi: ' + error.toString());
  } finally {
    Logger.log(`[DOWNLOAD_REALISASI] ========== END ==========`);
  }
}

function exportRealisasiToExcel(realisasi, rpd) {
  Logger.log(`[EXPORT_REALISASI_EXCEL] ========== START (TSV METHOD) ==========`);
  Logger.log(`[EXPORT_REALISASI_EXCEL] Creating Excel-compatible file for ${realisasi.kua} - ${realisasi.month} ${realisasi.year}`);
  
  try {
    // Prepare data as array
    Logger.log(`[EXPORT_REALISASI_EXCEL] Preparing data arrays`);
    const rows = [];
    
    // Header rows
    rows.push(['LAPORAN REALISASI BOP KUA']);
    rows.push(['Kementerian Agama Kabupaten Indramayu']);
    rows.push([]);
    
    // Info section
    rows.push(['KUA', realisasi.kua]);
    rows.push(['Bulan', `${realisasi.month} ${realisasi.year}`]);
    rows.push(['Status', realisasi.status]);
    rows.push(['Total Realisasi', realisasi.total]);
    rows.push([]);
    
    // Detail header
    rows.push(['Kode', 'Nama Parameter', 'Item', 'RPD', 'Realisasi', 'Selisih']);
    
    // Detail data
    Logger.log(`[EXPORT_REALISASI_EXCEL] Processing realisasi data`);
    let hasData = false;
    let rowCount = 0;
    
    if (realisasi.data && typeof realisasi.data === 'object' && Object.keys(realisasi.data).length > 0) {
      Logger.log(`[EXPORT_REALISASI_EXCEL] Found ${Object.keys(realisasi.data).length} parameter codes`);
      
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
      Logger.log(`[EXPORT_REALISASI_EXCEL] No data found, adding placeholder`);
      rows.push(['', '', 'Tidak ada data realisasi', 0, 0, 0]);
    }
    
    rows.push([]);
    
    // Files section
    if (realisasi.files && Array.isArray(realisasi.files) && realisasi.files.length > 0) {
      Logger.log(`[EXPORT_REALISASI_EXCEL] Adding ${realisasi.files.length} files info`);
      rows.push(['DOKUMEN PENDUKUNG']);
      rows.push(['No', 'Nama File', 'URL']);
      
      realisasi.files.forEach((file, index) => {
        if (file && file.fileName) {
          rows.push([index + 1, file.fileName || '', file.fileUrl || '']);
        }
      });
    }
    
    rows.push([]);
    
    // Verification info
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
    
    Logger.log(`[EXPORT_REALISASI_EXCEL] Total rows: ${rows.length}`);
    
    // Create TSV content (Tab Separated Values)
    // TSV is more reliable than CSV for Excel import
    Logger.log(`[EXPORT_REALISASI_EXCEL] Creating TSV content`);
    const tsvContent = rows.map(row => {
      return row.map(cell => {
        // Clean cell content
        const cellStr = String(cell).replace(/\t/g, ' ').replace(/\n/g, ' ');
        return cellStr;
      }).join('\t'); // Use TAB as separator
    }).join('\n');
    
    Logger.log(`[EXPORT_REALISASI_EXCEL] TSV content length: ${tsvContent.length} characters`);
    
    // Create blob with TSV
    const blob = Utilities.newBlob(tsvContent, 'text/tab-separated-values', `Realisasi ${realisasi.kua} - ${realisasi.month} ${realisasi.year}.xls`);
    
    // Encode to base64
    Logger.log(`[EXPORT_REALISASI_EXCEL] Encoding to base64`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    Logger.log(`[EXPORT_REALISASI_EXCEL] Base64 length: ${base64.length} characters`);
    
    Logger.log(`[EXPORT_REALISASI_EXCEL] ========== SUCCESS ==========`);
    
    return successResponse({
      fileData: base64,
      fileName: `Realisasi ${realisasi.kua} - ${realisasi.month} ${realisasi.year}.xls`,
      mimeType: 'application/vnd.ms-excel'
    });
    
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_EXCEL ERROR] ========== ERROR ==========`);
    Logger.log(`[EXPORT_REALISASI_EXCEL ERROR] Message: ${error.toString()}`);
    Logger.log(`[EXPORT_REALISASI_EXCEL ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal export realisasi: ' + error.toString());
  }
}

function exportRPDAllPerMonth(data) {
  Logger.log(`[EXPORT_RPD_ALL_MONTH] ========== START ==========`);
  Logger.log(`[EXPORT_RPD_ALL_MONTH] Format: ${data.format}, Year: ${data.year}, Month: ${data.month}`);
  
  try {
    const sheet = getSheet(SHEETS.RPD);
    const values = sheet.getDataRange().getValues();
    const year = data.year || new Date().getFullYear();
    const month = data.month;
    
    Logger.log(`[EXPORT_RPD_ALL_MONTH] Filtering RPDs for month: ${month} ${year}`);
    
    let rpds = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[4] == year && row[3] === month) {
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
    
    Logger.log(`[EXPORT_RPD_ALL_MONTH] Found ${rpds.length} RPDs`);
    
    if (data.format === 'pdf') {
      return exportRPDAllMonthPDF(rpds, year, month);
    } else {
      return exportRPDAllMonthExcel(rpds, year, month);
    }
  } catch (error) {
    Logger.log(`[EXPORT_RPD_ALL_MONTH ERROR] ${error.toString()}`);
    return errorResponse('Gagal export RPD: ' + error.toString());
  }
}

function exportRPDAllMonthPDF(rpds, year, month) {
  Logger.log(`[EXPORT_RPD_ALL_MONTH_PDF] Creating PDF`);
  
  try {
    let tableRows = '';
    let totalAll = 0;
    
    rpds.forEach((rpd, index) => {
      totalAll += parseFloat(rpd.total);
      tableRows += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${rpd.kua}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(rpd.total)}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${rpd.updatedAt ? new Date(rpd.updatedAt).toLocaleDateString('id-ID') : '-'}</td>
        </tr>
      `;
    });
    
    tableRows += `
      <tr style="background: #f0f0f0; font-weight: bold;">
        <td colspan="2" style="padding: 8px; border: 1px solid #ddd; text-align: center;">TOTAL</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(totalAll)}</td>
        <td style="padding: 8px; border: 1px solid #ddd;"></td>
      </tr>
    `;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #667eea; color: white; padding: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>LAPORAN RPD SEMUA KUA</h2>
          <h3>Kementerian Agama Kabupaten Indramayu</h3>
          <p>${month} ${year}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>KUA</th>
              <th>Total RPD</th>
              <th>Terakhir Update</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div style="margin-top: 50px; text-align: right;">
          <p>Indramayu, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p style="margin-top: 80px;"><strong>( ${NAMA_KASI_BIMAS} )</strong></p>
          <p>${NIP_KASI_BIMAS}</p>
        </div>
      </body>
      </html>
    `;
    
    const blob = Utilities.newBlob(htmlContent, MimeType.HTML, 'temp.html');
    const pdfBlob = blob.getAs('application/pdf');
    pdfBlob.setName(`RPD All KUA - ${month} ${year}.pdf`);
    
    const base64 = Utilities.base64Encode(pdfBlob.getBytes());
    
    return successResponse({
      fileData: base64,
      fileName: pdfBlob.getName(),
      mimeType: 'application/pdf'
    });
  } catch (error) {
    Logger.log(`[EXPORT_RPD_ALL_MONTH_PDF ERROR] ${error.toString()}`);
    return errorResponse('Gagal export PDF: ' + error.toString());
  }
}

function exportRPDAllMonthExcel(rpds, year, month) {
  Logger.log(`[EXPORT_RPD_ALL_MONTH_EXCEL] Creating Excel for all KUA - ${month} ${year}`);
  
  try {
    const rows = [];
    
    // Title
    rows.push([`LAPORAN RPD SEMUA KUA - ${month.toUpperCase()} ${year}`]);
    rows.push(['Kementerian Agama Kabupaten Indramayu']);
    rows.push([]);
    
    // Headers
    rows.push(['No', 'KUA', 'Total RPD', 'Tanggal Dibuat', 'Terakhir Update']);
    
    // Data
    let totalAll = 0;
    rpds.forEach((rpd, index) => {
      totalAll += parseFloat(rpd.total) || 0;
      rows.push([
        index + 1,
        rpd.kua || '',
        parseFloat(rpd.total) || 0,
        rpd.createdAt ? new Date(rpd.createdAt).toLocaleDateString('id-ID') : '',
        rpd.updatedAt ? new Date(rpd.updatedAt).toLocaleDateString('id-ID') : ''
      ]);
    });
    
    // Total row
    rows.push([]);
    rows.push(['', 'TOTAL', totalAll, '', '']);
    
    const tsvContent = rows.map(row => row.map(cell => String(cell).replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t')).join('\n');
    const blob = Utilities.newBlob(tsvContent, 'text/tab-separated-values', `RPD All KUA - ${month} ${year}.xls`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    
    Logger.log(`[EXPORT_RPD_ALL_MONTH_EXCEL] Success`);
    
    return successResponse({
      fileData: base64,
      fileName: `RPD All KUA - ${month} ${year}.xls`,
      mimeType: 'application/vnd.ms-excel'
    });
  } catch (error) {
    Logger.log(`[EXPORT_RPD_ALL_MONTH_EXCEL ERROR] ${error.toString()}`);
    return errorResponse('Gagal export: ' + error.toString());
  }
}

// ===== EXPORT RPD SELECTED KUA PER BULAN =====
function exportRPDSelectedPerMonth(data) {
  Logger.log(`[EXPORT_RPD_SELECTED_MONTH] ========== START ==========`);
  Logger.log(`[EXPORT_RPD_SELECTED_MONTH] KUA: ${data.kua}, Month: ${data.month}, Year: ${data.year}`);
  
  try {
    const sheet = getSheet(SHEETS.RPD);
    const values = sheet.getDataRange().getValues();
    
    let rpd = null;
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[1] === data.kua && row[3] === data.month && row[4] == data.year) {
        rpd = {
          id: row[0],
          kua: row[1],
          month: row[3],
          year: row[4],
          data: JSON.parse(row[5] || '{}'),
          total: row[6]
        };
        break;
      }
    }
    
    if (!rpd) {
      return errorResponse('RPD tidak ditemukan');
    }
    
    if (data.format === 'pdf') {
      return exportRPDSelectedMonthPDF(rpd);
    } else {
      return exportRPDSelectedMonthExcel(rpd);
    }
  } catch (error) {
    Logger.log(`[EXPORT_RPD_SELECTED_MONTH ERROR] ${error.toString()}`);
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRPDSelectedMonthPDF(rpd) {
  Logger.log(`[EXPORT_RPD_SELECTED_MONTH_PDF] Creating PDF`);
  
  try {
    let detailHTML = '';
    
    if (rpd.data && typeof rpd.data === 'object') {
      Object.entries(rpd.data).forEach(([code, items]) => {
        const param = CONFIG.RPD_PARAMETERS[code];
        if (!param) return;
        
        detailHTML += `<tr><td colspan="2" style="background: #f0f0f0; font-weight: bold; padding: 8px;">${code} - ${param.name}</td></tr>`;
        
        if (items && typeof items === 'object') {
          Object.entries(items).forEach(([item, value]) => {
            detailHTML += `
              <tr>
                <td style="padding: 6px; border: 1px solid #ddd;">${item}</td>
                <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(value)}</td>
              </tr>
            `;
          });
        }
      });
    }
    
    if (!detailHTML) {
      detailHTML = '<tr><td colspan="2" style="padding: 10px; text-align: center; color: #999;">Tidak ada data</td></tr>';
    }
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #667eea; color: white; padding: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>LAPORAN RPD</h2>
          <h3>${rpd.kua}</h3>
          <p>${rpd.month} ${rpd.year}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Nominal</th>
            </tr>
          </thead>
          <tbody>
            ${detailHTML}
          </tbody>
        </table>
        
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
          <p style="margin: 0; font-size: 18px;"><strong>Total RPD: Rp ${formatNumber(rpd.total)}</strong></p>
        </div>
        
        <div style="margin-top: 50px; text-align: right;">
          <p>Indramayu, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p style="margin-top: 80px;"><strong>( ${NAMA_KASI_BIMAS} )</strong></p>
          <p>${NIP_KASI_BIMAS}</p>
        </div>
      </body>
      </html>
    `;
    
    const blob = Utilities.newBlob(htmlContent, MimeType.HTML, 'temp.html');
    const pdfBlob = blob.getAs('application/pdf');
    pdfBlob.setName(`RPD ${rpd.kua} - ${rpd.month} ${rpd.year}.pdf`);
    
    const base64 = Utilities.base64Encode(pdfBlob.getBytes());
    
    return successResponse({
      fileData: base64,
      fileName: pdfBlob.getName(),
      mimeType: 'application/pdf'
    });
  } catch (error) {
    Logger.log(`[EXPORT_RPD_SELECTED_MONTH_PDF ERROR] ${error.toString()}`);
    return errorResponse('Gagal export PDF: ' + error.toString());
  }
}

function exportRPDSelectedMonthExcel(rpd) {
  Logger.log(`[EXPORT_RPD_SELECTED_MONTH_EXCEL] Creating Excel for ${rpd.kua} - ${rpd.month} ${rpd.year}`);
  
  try {
    const rows = [];
    
    // Title
    rows.push([`LAPORAN RPD - ${rpd.kua.toUpperCase()}`]);
    rows.push([`${rpd.month} ${rpd.year}`]);
    rows.push([]);
    
    // Headers
    rows.push(['Kode', 'Nama Parameter', 'Item', 'Nominal']);
    
    // Data
    let hasData = false;
    if (rpd.data && typeof rpd.data === 'object') {
      Object.entries(rpd.data).forEach(([code, items]) => {
        const paramName = CONFIG.RPD_PARAMETERS[code] ? CONFIG.RPD_PARAMETERS[code].name : '';
        if (items && typeof items === 'object') {
          Object.entries(items).forEach(([item, value]) => {
            rows.push([code, paramName, item, parseFloat(value) || 0]);
            hasData = true;
          });
        }
      });
    }
    
    if (!hasData) {
      rows.push(['', '', 'Tidak ada data', 0]);
    }
    
    rows.push([]);
    rows.push(['', '', 'TOTAL', rpd.total]);
    
    const tsvContent = rows.map(row => row.map(cell => String(cell).replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t')).join('\n');
    const blob = Utilities.newBlob(tsvContent, 'text/tab-separated-values', `RPD ${rpd.kua} - ${rpd.month} ${rpd.year}.xls`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    
    return successResponse({
      fileData: base64,
      fileName: `RPD ${rpd.kua} - ${rpd.month} ${rpd.year}.xls`,
      mimeType: 'application/vnd.ms-excel'
    });
  } catch (error) {
    Logger.log(`[EXPORT_RPD_SELECTED_MONTH_EXCEL ERROR] ${error.toString()}`);
    return errorResponse('Gagal export: ' + error.toString());
  }
}

// ===== EXPORT RPD ALL DETAIL (31 KUA KUMULATIF 1 TAHUN) =====
function exportRPDAllDetailYear(data) {
  Logger.log(`[EXPORT_RPD_ALL_DETAIL_YEAR] ========== START ==========`);
  Logger.log(`[EXPORT_RPD_ALL_DETAIL_YEAR] Year: ${data.year}`);
  
  try {
    const sheet = getSheet(SHEETS.RPD);
    const values = sheet.getDataRange().getValues();
    const year = data.year || new Date().getFullYear();
    
    let rpds = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[4] == year) {
        rpds.push({
          kua: row[1],
          month: row[3],
          year: row[4],
          data: JSON.parse(row[5] || '{}'),
          total: row[6]
        });
      }
    }
    
    Logger.log(`[EXPORT_RPD_ALL_DETAIL_YEAR] Found ${rpds.length} RPDs`);
    
    if (data.format === 'pdf') {
      return exportRPDAllDetailYearPDF(rpds, year);
    } else {
      return exportRPDAllDetailYearExcel(rpds, year);
    }
  } catch (error) {
    Logger.log(`[EXPORT_RPD_ALL_DETAIL_YEAR ERROR] ${error.toString()}`);
    return errorResponse('Gagal export: ' + error.toString());
  }
}

// ===== EXPORT REALISASI ALL KUA PER BULAN =====
function exportRealisasiAllPerMonth(data) {
  Logger.log(`[EXPORT_REALISASI_ALL_MONTH] ========== START ==========`);
  Logger.log(`[EXPORT_REALISASI_ALL_MONTH] Month: ${data.month}, Year: ${data.year}`);
  
  try {
    const sheet = getSheet(SHEETS.REALISASI);
    const values = sheet.getDataRange().getValues();
    
    let realisasis = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[3] === data.month && row[4] == data.year) {
        realisasis.push({
          kua: row[1],
          month: row[3],
          year: row[4],
          total: row[7],
          status: row[8],
          verifiedBy: row[12],
          verifiedAt: row[13]
        });
      }
    }
    
    Logger.log(`[EXPORT_REALISASI_ALL_MONTH] Found ${realisasis.length} realisasis`);
    
    if (data.format === 'pdf') {
      return exportRealisasiAllMonthPDF(realisasis, data.year, data.month);
    } else {
      return exportRealisasiAllMonthExcel(realisasis, data.year, data.month);
    }
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_ALL_MONTH ERROR] ${error.toString()}`);
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRealisasiAllMonthPDF(realisasis, year, month) {
  Logger.log(`[EXPORT_REALISASI_ALL_MONTH_PDF] Creating PDF`);
  
  try {
    let tableRows = '';
    let totalAll = 0;
    
    realisasis.forEach((real, index) => {
      totalAll += parseFloat(real.total);
      tableRows += `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${real.kua}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(real.total)}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${real.status}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${real.verifiedBy || '-'}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${real.verifiedAt ? new Date(real.verifiedAt).toLocaleDateString('id-ID') : '-'}</td>
        </tr>
      `;
    });
    
    if (!tableRows) {
      tableRows = '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #999;">Tidak ada data</td></tr>';
    }
    
    tableRows += `
      <tr style="background: #f0f0f0; font-weight: bold;">
        <td colspan="2" style="padding: 8px; border: 1px solid #ddd; text-align: center;">TOTAL</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(totalAll)}</td>
        <td colspan="3" style="padding: 8px; border: 1px solid #ddd;"></td>
      </tr>
    `;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #667eea; color: white; padding: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>LAPORAN REALISASI SEMUA KUA</h2>
          <h3>Kementerian Agama Kabupaten Indramayu</h3>
          <p>${month} ${year}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>KUA</th>
              <th>Total Realisasi</th>
              <th>Status</th>
              <th>Diverifikasi Oleh</th>
              <th>Tanggal Verifikasi</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div style="margin-top: 50px; text-align: right;">
          <p>Indramayu, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p style="margin-top: 80px;"><strong>( ${NAMA_KASI_BIMAS} )</strong></p>
          <p>${NIP_KASI_BIMAS}</p>
        </div>
      </body>
      </html>
    `;
    
    const blob = Utilities.newBlob(htmlContent, MimeType.HTML, 'temp.html');
    const pdfBlob = blob.getAs('application/pdf');
    pdfBlob.setName(`Realisasi All KUA - ${month} ${year}.pdf`);
    
    const base64 = Utilities.base64Encode(pdfBlob.getBytes());
    
    return successResponse({
      fileData: base64,
      fileName: pdfBlob.getName(),
      mimeType: 'application/pdf'
    });
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_ALL_MONTH_PDF ERROR] ${error.toString()}`);
    return errorResponse('Gagal export PDF: ' + error.toString());
  }
}

function exportRPDAllDetailYearPDF(rpds, year) {
  Logger.log(`[EXPORT_RPD_ALL_DETAIL_YEAR_PDF] Creating PDF`);
  
  try {
    let tableRows = '';
    let grandTotal = 0;
    
    rpds.forEach(rpd => {
      if (rpd.data && typeof rpd.data === 'object') {
        Object.entries(rpd.data).forEach(([code, items]) => {
          const paramName = CONFIG.RPD_PARAMETERS[code] ? CONFIG.RPD_PARAMETERS[code].name : '';
          if (items && typeof items === 'object') {
            Object.entries(items).forEach(([item, value]) => {
              const val = parseFloat(value) || 0;
              grandTotal += val;
              tableRows += `
                <tr>
                  <td style="padding: 6px; border: 1px solid #ddd;">${rpd.kua}</td>
                  <td style="padding: 6px; border: 1px solid #ddd;">${rpd.month}</td>
                  <td style="padding: 6px; border: 1px solid #ddd;">${code}</td>
                  <td style="padding: 6px; border: 1px solid #ddd;">${paramName}</td>
                  <td style="padding: 6px; border: 1px solid #ddd;">${item}</td>
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(val)}</td>
                </tr>
              `;
            });
          }
        });
      }
    });
    
    if (!tableRows) {
      tableRows = '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #999;">Tidak ada data</td></tr>';
    }
    
    tableRows += `
      <tr style="background: #f0f0f0; font-weight: bold;">
        <td colspan="5" style="padding: 8px; border: 1px solid #ddd; text-align: right;">GRAND TOTAL</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(grandTotal)}</td>
      </tr>
    `;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
          th { background: #667eea; color: white; padding: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>LAPORAN DETAIL RPD SEMUA KUA</h2>
          <h3>Kementerian Agama Kabupaten Indramayu</h3>
          <p>Tahun ${year} (Kumulatif)</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>KUA</th>
              <th>Bulan</th>
              <th>Kode</th>
              <th>Nama Parameter</th>
              <th>Item</th>
              <th>Nominal</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div style="margin-top: 50px; text-align: right;">
          <p>Indramayu, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p style="margin-top: 80px;"><strong>( ${NAMA_KASI_BIMAS} )</strong></p>
          <p>${NIP_KASI_BIMAS}</p>
        </div>
      </body>
      </html>
    `;
    
    const blob = Utilities.newBlob(htmlContent, MimeType.HTML, 'temp.html');
    const pdfBlob = blob.getAs('application/pdf');
    pdfBlob.setName(`RPD All Detail - ${year}.pdf`);
    
    const base64 = Utilities.base64Encode(pdfBlob.getBytes());
    
    return successResponse({
      fileData: base64,
      fileName: pdfBlob.getName(),
      mimeType: 'application/pdf'
    });
  } catch (error) {
    Logger.log(`[EXPORT_RPD_ALL_DETAIL_YEAR_PDF ERROR] ${error.toString()}`);
    return errorResponse('Gagal export PDF: ' + error.toString());
  }
}

function exportRealisasiAllMonthExcel(realisasis, year, month) {
  Logger.log(`[EXPORT_REALISASI_ALL_MONTH_EXCEL] Creating Excel for all KUA - ${month} ${year}`);
  
  try {
    const rows = [];
    
    rows.push([`LAPORAN REALISASI SEMUA KUA - ${month.toUpperCase()} ${year}`]);
    rows.push(['Kementerian Agama Kabupaten Indramayu']);
    rows.push([]);
    
    rows.push(['No', 'KUA', 'Total Realisasi', 'Status', 'Diverifikasi Oleh', 'Tanggal Verifikasi']);
    
    let totalAll = 0;
    realisasis.forEach((real, index) => {
      totalAll += parseFloat(real.total) || 0;
      rows.push([
        index + 1,
        real.kua,
        parseFloat(real.total) || 0,
        real.status,
        real.verifiedBy || '-',
        real.verifiedAt ? new Date(real.verifiedAt).toLocaleDateString('id-ID') : '-'
      ]);
    });
    
    rows.push([]);
    rows.push(['', 'TOTAL', totalAll, '', '', '']);
    
    const tsvContent = rows.map(row => row.map(cell => String(cell).replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t')).join('\n');
    const blob = Utilities.newBlob(tsvContent, 'text/tab-separated-values', `Realisasi All KUA - ${month} ${year}.xls`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    
    return successResponse({
      fileData: base64,
      fileName: `Realisasi All KUA - ${month} ${year}.xls`,
      mimeType: 'application/vnd.ms-excel'
    });
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_ALL_MONTH_EXCEL ERROR] ${error.toString()}`);
    return errorResponse('Gagal export: ' + error.toString());
  }
}

// ===== EXPORT REALISASI SELECTED KUA PER BULAN =====
function exportRealisasiSelectedPerMonth(data) {
  Logger.log(`[EXPORT_REALISASI_SELECTED_MONTH] ========== START ==========`);
  
  try {
    const sheet = getSheet(SHEETS.REALISASI);
    const values = sheet.getDataRange().getValues();
    
    let realisasi = null;
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[1] === data.kua && row[3] === data.month && row[4] == data.year) {
        realisasi = {
          kua: row[1],
          month: row[3],
          year: row[4],
          data: JSON.parse(row[6] || '{}'),
          total: row[7],
          status: row[8]
        };
        break;
      }
    }
    
    if (!realisasi) {
      return errorResponse('Realisasi tidak ditemukan');
    }
    
    // Get RPD data for comparison
    const rpdSheet = getSheet(SHEETS.RPD);
    const rpdValues = rpdSheet.getDataRange().getValues();
    let rpd = { data: {} };
    
    for (let i = 1; i < rpdValues.length; i++) {
      const row = rpdValues[i];
      if (row[1] === data.kua && row[3] === data.month && row[4] == data.year) {
        rpd.data = JSON.parse(row[5] || '{}');
        break;
      }
    }
    
    if (data.format === 'pdf') {
      return exportRealisasiSelectedMonthPDF(realisasi, rpd);
    } else {
      return exportRealisasiSelectedMonthExcel(realisasi, rpd);
    }
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_SELECTED_MONTH ERROR] ${error.toString()}`);
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRealisasiSelectedMonthPDF(realisasi, rpd) {
  Logger.log(`[EXPORT_REALISASI_SELECTED_MONTH_PDF] Creating PDF`);
  
  try {
    let detailHTML = '';
    
    if (realisasi.data && typeof realisasi.data === 'object') {
      Object.entries(realisasi.data).forEach(([code, items]) => {
        const param = CONFIG.RPD_PARAMETERS[code];
        if (!param) return;
        
        detailHTML += `<tr><td colspan="4" style="background: #f0f0f0; font-weight: bold; padding: 8px;">${code} - ${param.name}</td></tr>`;
        
        if (items && typeof items === 'object') {
          Object.entries(items).forEach(([item, realValue]) => {
            const rpdValue = rpd.data && rpd.data[code] && rpd.data[code][item] ? parseFloat(rpd.data[code][item]) : 0;
            const realVal = parseFloat(realValue) || 0;
            const selisih = realVal - rpdValue;
            
            detailHTML += `
              <tr>
                <td style="padding: 6px; border: 1px solid #ddd;">${item}</td>
                <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(rpdValue)}</td>
                <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(realVal)}</td>
                <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(selisih)}</td>
              </tr>
            `;
          });
        }
      });
    }
    
    if (!detailHTML) {
      detailHTML = '<tr><td colspan="4" style="padding: 10px; text-align: center; color: #999;">Tidak ada data</td></tr>';
    }
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .info { margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #667eea; color: white; padding: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>LAPORAN REALISASI BOP KUA</h2>
          <h3>Kementerian Agama Kabupaten Indramayu</h3>
        </div>
        
        <div class="info">
          <table style="border: none;">
            <tr><td width="150"><strong>KUA</strong></td><td>: ${realisasi.kua}</td></tr>
            <tr><td><strong>Bulan</strong></td><td>: ${realisasi.month} ${realisasi.year}</td></tr>
            <tr><td><strong>Status</strong></td><td>: ${realisasi.status}</td></tr>
            <tr><td><strong>Total Realisasi</strong></td><td>: Rp ${formatNumber(realisasi.total)}</td></tr>
          </table>
        </div>
        
        <h3>Detail Realisasi</h3>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>RPD</th>
              <th>Realisasi</th>
              <th>Selisih</th>
            </tr>
          </thead>
          <tbody>
            ${detailHTML}
          </tbody>
        </table>
        
        <div style="margin-top: 50px; text-align: right;">
          <p>Indramayu, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p><strong>Kepala Seksi Bimas Islam</strong></p>
          <p style="margin-top: 80px;"><strong>( ${NAMA_KASI_BIMAS} )</strong></p>
          <p>${NIP_KASI_BIMAS}</p>
        </div>
      </body>
      </html>
    `;
    
    const blob = Utilities.newBlob(htmlContent, MimeType.HTML, 'temp.html');
    const pdfBlob = blob.getAs('application/pdf');
    pdfBlob.setName(`Realisasi ${realisasi.kua} - ${realisasi.month} ${realisasi.year}.pdf`);
    
    const base64 = Utilities.base64Encode(pdfBlob.getBytes());
    
    return successResponse({
      fileData: base64,
      fileName: pdfBlob.getName(),
      mimeType: 'application/pdf'
    });
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_SELECTED_MONTH_PDF ERROR] ${error.toString()}`);
    return errorResponse('Gagal export PDF: ' + error.toString());
  }
}

function exportRealisasiSelectedMonthExcel(realisasi, rpd) {
  Logger.log(`[EXPORT_REALISASI_SELECTED_MONTH_EXCEL] Creating Excel`);
  
  try {
    const rows = [];
    
    rows.push([`LAPORAN REALISASI - ${realisasi.kua.toUpperCase()}`]);
    rows.push([`${realisasi.month} ${realisasi.year}`]);
    rows.push([]);
    
    rows.push(['Kode', 'Nama Parameter', 'Item', 'RPD', 'Realisasi', 'Selisih']);
    
    if (realisasi.data && typeof realisasi.data === 'object') {
      Object.entries(realisasi.data).forEach(([code, items]) => {
        const paramName = CONFIG.RPD_PARAMETERS[code] ? CONFIG.RPD_PARAMETERS[code].name : '';
        if (items && typeof items === 'object') {
          Object.entries(items).forEach(([item, realValue]) => {
            const rpdValue = rpd.data && rpd.data[code] && rpd.data[code][item] ? parseFloat(rpd.data[code][item]) : 0;
            const realVal = parseFloat(realValue) || 0;
            const selisih = realVal - rpdValue;
            
            rows.push([code, paramName, item, rpdValue, realVal, selisih]);
          });
        }
      });
    }
    
    rows.push([]);
    rows.push(['', '', '', '', 'TOTAL', realisasi.total]);
    
    const tsvContent = rows.map(row => row.map(cell => String(cell).replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t')).join('\n');
    const blob = Utilities.newBlob(tsvContent, 'text/tab-separated-values', `Realisasi ${realisasi.kua} - ${realisasi.month} ${realisasi.year}.xls`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    
    return successResponse({
      fileData: base64,
      fileName: `Realisasi ${realisasi.kua} - ${realisasi.month} ${realisasi.year}.xls`,
      mimeType: 'application/vnd.ms-excel'
    });
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_SELECTED_MONTH_EXCEL ERROR] ${error.toString()}`);
    return errorResponse('Gagal export: ' + error.toString());
  }
}

// ===== EXPORT REALISASI ALL DETAIL (31 KUA PER BULAN) =====
function exportRealisasiAllDetailPerMonth(data) {
  Logger.log(`[EXPORT_REALISASI_ALL_DETAIL_MONTH] ========== START ==========`);
  
  try {
    const sheet = getSheet(SHEETS.REALISASI);
    const values = sheet.getDataRange().getValues();
    
    let realisasis = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[3] === data.month && row[4] == data.year) {
        realisasis.push({
          kua: row[1],
          month: row[3],
          year: row[4],
          data: JSON.parse(row[6] || '{}'),
          total: row[7],
          status: row[8]
        });
      }
    }
    
    if (data.format === 'pdf') {
      return exportRealisasiAllDetailMonthPDF(realisasis, data.year, data.month);
    } else {
      return exportRealisasiAllDetailMonthExcel(realisasis, data.year, data.month);
    }
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_ALL_DETAIL_MONTH ERROR] ${error.toString()}`);
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRealisasiAllDetailMonthPDF(realisasis, year, month) {
  Logger.log(`[EXPORT_REALISASI_ALL_DETAIL_MONTH_PDF] Creating PDF`);
  
  try {
    let tableRows = '';
    let grandTotal = 0;
    
    realisasis.forEach(realisasi => {
      if (realisasi.data && typeof realisasi.data === 'object') {
        Object.entries(realisasi.data).forEach(([code, items]) => {
          const paramName = CONFIG.RPD_PARAMETERS[code] ? CONFIG.RPD_PARAMETERS[code].name : '';
          if (items && typeof items === 'object') {
            Object.entries(items).forEach(([item, value]) => {
              const val = parseFloat(value) || 0;
              grandTotal += val;
              tableRows += `
                <tr>
                  <td style="padding: 6px; border: 1px solid #ddd;">${realisasi.kua}</td>
                  <td style="padding: 6px; border: 1px solid #ddd;">${code}</td>
                  <td style="padding: 6px; border: 1px solid #ddd;">${paramName}</td>
                  <td style="padding: 6px; border: 1px solid #ddd;">${item}</td>
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(val)}</td>
                  <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${realisasi.status}</td>
                </tr>
              `;
            });
          }
        });
      }
    });
    
    if (!tableRows) {
      tableRows = '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #999;">Tidak ada data</td></tr>';
    }
    
    tableRows += `
      <tr style="background: #f0f0f0; font-weight: bold;">
        <td colspan="4" style="padding: 8px; border: 1px solid #ddd; text-align: right;">GRAND TOTAL</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(grandTotal)}</td>
        <td style="padding: 8px; border: 1px solid #ddd;"></td>
      </tr>
    `;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
          th { background: #667eea; color: white; padding: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>LAPORAN DETAIL REALISASI SEMUA KUA</h2>
          <h3>Kementerian Agama Kabupaten Indramayu</h3>
          <p>${month} ${year}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>KUA</th>
              <th>Kode</th>
              <th>Nama Parameter</th>
              <th>Item</th>
              <th>Nominal</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div style="margin-top: 50px; text-align: right;">
          <p>Indramayu, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p style="margin-top: 80px;"><strong>( ${NAMA_KASI_BIMAS} )</strong></p>
          <p>${NIP_KASI_BIMAS}</p>
        </div>
      </body>
      </html>
    `;
    
    const blob = Utilities.newBlob(htmlContent, MimeType.HTML, 'temp.html');
    const pdfBlob = blob.getAs('application/pdf');
    pdfBlob.setName(`Realisasi All Detail - ${month} ${year}.pdf`);
    
    const base64 = Utilities.base64Encode(pdfBlob.getBytes());
    
    return successResponse({
      fileData: base64,
      fileName: pdfBlob.getName(),
      mimeType: 'application/pdf'
    });
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_ALL_DETAIL_MONTH_PDF ERROR] ${error.toString()}`);
    return errorResponse('Gagal export PDF: ' + error.toString());
  }
}

function exportRealisasiAllDetailMonthExcel(realisasis, year, month) {
  Logger.log(`[EXPORT_REALISASI_ALL_DETAIL_MONTH_EXCEL] Creating detailed Excel`);
  
  try {
    const rows = [];
    
    rows.push([`LAPORAN DETAIL REALISASI SEMUA KUA - ${month.toUpperCase()} ${year}`]);
    rows.push(['Kementerian Agama Kabupaten Indramayu']);
    rows.push([]);
    
    rows.push(['KUA', 'Kode', 'Nama Parameter', 'Item', 'Nominal', 'Status']);
    
    let grandTotal = 0;
    realisasis.forEach(realisasi => {
      if (realisasi.data && typeof realisasi.data === 'object') {
        Object.entries(realisasi.data).forEach(([code, items]) => {
          const paramName = CONFIG.RPD_PARAMETERS[code] ? CONFIG.RPD_PARAMETERS[code].name : '';
          if (items && typeof items === 'object') {
            Object.entries(items).forEach(([item, value]) => {
              const val = parseFloat(value) || 0;
              grandTotal += val;
              rows.push([realisasi.kua, code, paramName, item, val, realisasi.status]);
            });
          }
        });
      }
    });
    
    rows.push([]);
    rows.push(['', '', '', 'GRAND TOTAL', grandTotal, '']);
    
    const tsvContent = rows.map(row => row.map(cell => String(cell).replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t')).join('\n');
    const blob = Utilities.newBlob(tsvContent, 'text/tab-separated-values', `Realisasi All Detail - ${month} ${year}.xls`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    
    return successResponse({
      fileData: base64,
      fileName: `Realisasi All Detail - ${month} ${year}.xls`,
      mimeType: 'application/vnd.ms-excel'
    });
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_ALL_DETAIL_MONTH_EXCEL ERROR] ${error.toString()}`);
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRPDAllDetailYearExcel(rpds, year) {
  Logger.log(`[EXPORT_RPD_ALL_DETAIL_YEAR_EXCEL] Creating detailed Excel for all KUA - ${year}`);
  
  try {
    const rows = [];
    
    // Title
    rows.push([`LAPORAN DETAIL RPD SEMUA KUA - TAHUN ${year}`]);
    rows.push(['Kementerian Agama Kabupaten Indramayu']);
    rows.push([]);
    
    // Headers
    rows.push(['KUA', 'Bulan', 'Kode', 'Nama Parameter', 'Item', 'Nominal']);
    
    // Data
    let grandTotal = 0;
    rpds.forEach(rpd => {
      if (rpd.data && typeof rpd.data === 'object') {
        Object.entries(rpd.data).forEach(([code, items]) => {
          const paramName = CONFIG.RPD_PARAMETERS[code] ? CONFIG.RPD_PARAMETERS[code].name : '';
          if (items && typeof items === 'object') {
            Object.entries(items).forEach(([item, value]) => {
              const val = parseFloat(value) || 0;
              grandTotal += val;
              rows.push([rpd.kua, rpd.month, code, paramName, item, val]);
            });
          }
        });
      }
    });
    
    rows.push([]);
    rows.push(['', '', '', '', 'GRAND TOTAL', grandTotal]);
    
    const tsvContent = rows.map(row => row.map(cell => String(cell).replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t')).join('\n');
    const blob = Utilities.newBlob(tsvContent, 'text/tab-separated-values', `RPD All Detail - ${year}.xls`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    
    return successResponse({
      fileData: base64,
      fileName: `RPD All Detail - ${year}.xls`,
      mimeType: 'application/vnd.ms-excel'
    });
  } catch (error) {
    Logger.log(`[EXPORT_RPD_ALL_DETAIL_YEAR_EXCEL ERROR] ${error.toString()}`);
    return errorResponse('Gagal export: ' + error.toString());
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

function exportRealisasiPDF(realisasi, rpd, userData) {
  Logger.log(`[EXPORT_REALISASI_PDF] Creating PDF file`);
  
  let detailHTML = '';
  if (realisasi.data && typeof realisasi.data === 'object') {
    Object.entries(realisasi.data).forEach(([code, items]) => {
      if (items && typeof items === 'object') {
        detailHTML += `<tr><td colspan="4" style="background: #f0f0f0; font-weight: bold; padding: 8px;">${code}</td></tr>`;
        Object.entries(items).forEach(([item, realValue]) => {
          const rpdValue = rpd && rpd.data && rpd.data[code] && rpd.data[code][item] ? parseFloat(rpd.data[code][item]) : 0;
          const realVal = parseFloat(realValue) || 0;
          detailHTML += `
            <tr>
              <td style="padding: 6px; border: 1px solid #ddd;">${item}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(rpdValue)}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(realVal)}</td>
              <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(realVal - rpdValue)}</td>
            </tr>
          `;
        });
      }
    });
  }
  
  if (!detailHTML) {
    detailHTML = '<tr><td colspan="4" style="padding: 10px; text-align: center; color: #999;">Tidak ada data realisasi</td></tr>';
  }
  
  let filesHTML = '';
  if (realisasi.files && Array.isArray(realisasi.files) && realisasi.files.length > 0) {
    filesHTML = '<h3 style="margin-top: 30px; page-break-before: always;">Dokumen Pendukung</h3><div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-top: 15px;">';
    realisasi.files.forEach(file => {
      if (!file || !file.fileName) return;
      
      const isImage = file.mimeType && file.mimeType.startsWith('image/');
      if (isImage) {
        let fileId = file.fileId;
        if (!fileId && file.fileUrl) {
          const match = file.fileUrl.match(/[-\w]{25,}/);
          if (match) fileId = match[0];
        }
        
        if (fileId) {
          try {
            const driveFile = DriveApp.getFileById(fileId);
            const imageBlob = driveFile.getBlob();
            const base64Image = Utilities.base64Encode(imageBlob.getBytes());
            const mimeType = imageBlob.getContentType();
            
            filesHTML += `
              <div style="border: 1px solid #ddd; padding: 10px; border-radius: 8px; page-break-inside: avoid;">
                <img src="data:${mimeType};base64,${base64Image}" 
                     style="width: 100%; max-height: 300px; object-fit: contain; border-radius: 4px;">
                <p style="margin: 10px 0 0 0; font-size: 12px; text-align: center; color: #666;">${file.fileName}</p>
              </div>
            `;
          } catch (e) {
            Logger.log(`[EXPORT_REALISASI_PDF] Error loading image: ${e}`);
            filesHTML += `
              <div style="border: 1px solid #ddd; padding: 10px; border-radius: 8px;">
                <div style="width: 100%; height: 200px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; border-radius: 4px;">
                  <p style="color: #999;">Preview tidak tersedia</p>
                </div>
                <p style="margin: 10px 0 0 0; font-size: 12px; text-align: center; color: #666;">${file.fileName}</p>
              </div>
            `;
          }
        }
      }
    });
    filesHTML += '</div>';
  }
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        .info { margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #667eea; color: white; padding: 10px; text-align: left; }
        .signature { margin-top: 60px; text-align: right; page-break-inside: avoid; }
        .signature-box { display: inline-block; text-align: center; margin-top: 20px; }
        .signature-line { border-top: 1px solid #000; width: 200px; margin-top: 80px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>LAPORAN REALISASI BOP KUA</h2>
        <h3>Kementerian Agama Kabupaten Indramayu</h3>
      </div>
      
      <div class="info">
        <table style="border: none;">
          <tr><td width="150"><strong>KUA</strong></td><td>: ${realisasi.kua}</td></tr>
          <tr><td><strong>Bulan</strong></td><td>: ${realisasi.month} ${realisasi.year}</td></tr>
          <tr><td><strong>Status</strong></td><td>: ${realisasi.status}</td></tr>
          <tr><td><strong>Total Realisasi</strong></td><td>: Rp ${formatNumber(realisasi.total)}</td></tr>
        </table>
      </div>
      
      <h3>Detail Realisasi</h3>
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>RPD</th>
            <th>Realisasi</th>
            <th>Selisih</th>
          </tr>
        </thead>
        <tbody>
          ${detailHTML}
        </tbody>
      </table>
      
      ${filesHTML}
      
      <div class="signature">
        <div class="signature-box">
          <p>Indramayu, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p><strong>Kepala Seksi Bimas Islam</strong></p>
          <div class="signature-line"></div>
          <p style="margin-top: 10px;"><strong>${NAMA_KASI_BIMAS}</strong></p>
          <p style="margin-top: 5px;"><strong>${NIP_KASI_BIMAS}</strong></p>
        </div>
      </div>
      
      ${realisasi.verifiedBy ? `
      <div style="margin-top: 40px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
        <p><strong>Diverifikasi oleh:</strong> ${realisasi.verifiedBy}</p>
        <p><strong>Tanggal:</strong> ${realisasi.verifiedAt ? new Date(realisasi.verifiedAt).toLocaleDateString('id-ID') : '-'}</p>
        ${realisasi.notes ? `<p><strong>Catatan:</strong> ${realisasi.notes}</p>` : ''}
      </div>
      ` : ''}
    </body>
    </html>
  `;
  
  const blob = Utilities.newBlob(htmlContent, MimeType.HTML, 'temp.html');
  const pdfBlob = blob.getAs('application/pdf');
  pdfBlob.setName(`Realisasi ${realisasi.kua} - ${realisasi.month} ${realisasi.year}.pdf`);
  
  const base64 = Utilities.base64Encode(pdfBlob.getBytes());
  
  Logger.log(`[EXPORT_REALISASI_PDF] Success`);
  return successResponse({
    fileData: base64,
    fileName: pdfBlob.getName(),
    mimeType: 'application/pdf'
  });
}

// ===== ENHANCED EXPORT FUNCTIONS =====
function exportBudgetEnhanced(data) {
  Logger.log(`[EXPORT_BUDGET_ENHANCED] ========== START ==========`);
  Logger.log(`[EXPORT_BUDGET_ENHANCED] Format: ${data.format}, Year: ${data.year}, KUA: ${data.kua || 'ALL'}`);
  
  try {
    const sheet = getSheet(SHEETS.BUDGET);
    const values = sheet.getDataRange().getValues();
    const year = data.year || new Date().getFullYear();
    
    Logger.log(`[EXPORT_BUDGET_ENHANCED] Filtering budgets`);
    
    let budgets = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[2] == year && (!data.kua || row[1] === data.kua)) {
        budgets.push({
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
    
    Logger.log(`[EXPORT_BUDGET_ENHANCED] Found ${budgets.length} budgets`);
    
    if (data.format === 'pdf') {
      return exportBudgetPDF(budgets, year, data.kua);
    } else {
      return exportBudgetToExcel(budgets, year, data.kua);
    }
  } catch (error) {
    Logger.log(`[EXPORT_BUDGET_ENHANCED ERROR] ========== ERROR ==========`);
    Logger.log(`[EXPORT_BUDGET_ENHANCED ERROR] Message: ${error.toString()}`);
    Logger.log(`[EXPORT_BUDGET_ENHANCED ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal export budget: ' + error.toString());
  }
}

function exportBudgetToExcel(budgets, year, kua) {
  Logger.log(`[EXPORT_BUDGET_EXCEL] ========== START (SHEETJS METHOD) ==========`);
  Logger.log(`[EXPORT_BUDGET_EXCEL] Year: ${year}, KUA: ${kua || 'ALL'}, Total: ${budgets.length}`);
  
  try {
    const data = [];
    
    // Headers
    data.push(['No', 'KUA', 'Tahun', 'Budget', 'Total RPD', 'Total Realisasi', 'Sisa Budget', 'Terakhir Update']);
    
    // Data rows
    Logger.log(`[EXPORT_BUDGET_EXCEL] Adding ${budgets.length} data rows`);
    budgets.forEach((budget, index) => {
      data.push([
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
        Logger.log(`[EXPORT_BUDGET_EXCEL] Progress: ${index + 1}/${budgets.length}`);
      }
    });
    
    Logger.log(`[EXPORT_BUDGET_EXCEL] Creating workbook with SheetJS`);
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Budget');
    
    Logger.log(`[EXPORT_BUDGET_EXCEL] Writing to binary`);
    const excelBuffer = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    
    Logger.log(`[EXPORT_BUDGET_EXCEL] Buffer length: ${excelBuffer.length}`);
    Logger.log(`[EXPORT_BUDGET_EXCEL] ========== SUCCESS ==========`);
    
    return successResponse({
      fileData: excelBuffer,
      fileName: `Budget ${year}${kua ? ' - ' + kua : ''}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
  } catch (error) {
    Logger.log(`[EXPORT_BUDGET_EXCEL ERROR] ========== ERROR ==========`);
    Logger.log(`[EXPORT_BUDGET_EXCEL ERROR] Message: ${error.toString()}`);
    Logger.log(`[EXPORT_BUDGET_EXCEL ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal export budget: ' + error.toString());
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

function exportBudgetPDF(budgets, year, kua) {
  let tableRows = '';
  let totalBudget = 0, totalRPD = 0, totalRealisasi = 0, totalSisa = 0;
  
  budgets.forEach((budget, index) => {
    totalBudget += parseFloat(budget.budget);
    totalRPD += parseFloat(budget.totalRPD);
    totalRealisasi += parseFloat(budget.totalRealisasi);
    totalSisa += parseFloat(budget.sisaBudget);
    
    tableRows += `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${budget.kua}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(budget.budget)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(budget.totalRPD)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(budget.totalRealisasi)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(budget.sisaBudget)}</td>
      </tr>
    `;
  });
  
  tableRows += `
    <tr style="background: #f0f0f0; font-weight: bold;">
      <td colspan="2" style="padding: 8px; border: 1px solid #ddd; text-align: center;">TOTAL</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(totalBudget)}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(totalRPD)}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(totalRealisasi)}</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(totalSisa)}</td>
    </tr>
  `;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #667eea; color: white; padding: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>LAPORAN BUDGET BOP KUA</h2>
        <h3>Kementerian Agama Kabupaten Indramayu</h3>
        <p>Tahun ${year}${kua ? ` - ${kua}` : ''}</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>KUA</th>
            <th>Budget</th>
            <th>Total RPD</th>
            <th>Total Realisasi</th>
            <th>Sisa Budget</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <div style="margin-top: 50px; text-align: right;">
        <p>Indramayu, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p style="margin-top: 80px;"><strong>( ___________________ )</strong></p>
      </div>
    </body>
    </html>
  `;
  
  const blob = Utilities.newBlob(htmlContent, MimeType.HTML, 'temp.html');
  const pdfBlob = blob.getAs('application/pdf');
  pdfBlob.setName(`Budget ${year}${kua ? ' - ' + kua : ''}.pdf`);
  
  const base64 = Utilities.base64Encode(pdfBlob.getBytes());
  
  return successResponse({
    fileData: base64,
    fileName: pdfBlob.getName(),
    mimeType: 'application/pdf'
  });
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

function exportRPDToExcel(rpds, year, kua) {
  Logger.log(`[EXPORT_RPD_EXCEL] ========== START (SHEETJS METHOD) ==========`);
  Logger.log(`[EXPORT_RPD_EXCEL] Year: ${year}, KUA: ${kua || 'ALL'}, Total: ${rpds.length}`);
  
  try {
    const data = [];
    
    // Headers
    data.push(['No', 'KUA', 'Bulan', 'Tahun', 'Total', 'Tanggal Dibuat', 'Terakhir Update']);
    
    // Data rows
    Logger.log(`[EXPORT_RPD_EXCEL] Adding ${rpds.length} data rows`);
    rpds.forEach((rpd, index) => {
      data.push([
        index + 1,
        rpd.kua || '',
        rpd.month || '',
        rpd.year || '',
        parseFloat(rpd.total) || 0,
        rpd.createdAt ? new Date(rpd.createdAt).toLocaleDateString('id-ID') : '',
        rpd.updatedAt ? new Date(rpd.updatedAt).toLocaleDateString('id-ID') : ''
      ]);
      
      if ((index + 1) % 10 === 0) {
        Logger.log(`[EXPORT_RPD_EXCEL] Progress: ${index + 1}/${rpds.length}`);
      }
    });
    
    Logger.log(`[EXPORT_RPD_EXCEL] Creating workbook with SheetJS`);
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'RPD');
    
    Logger.log(`[EXPORT_RPD_EXCEL] Writing to binary`);
    const excelBuffer = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    
    Logger.log(`[EXPORT_RPD_EXCEL] Buffer length: ${excelBuffer.length}`);
    Logger.log(`[EXPORT_RPD_EXCEL] ========== SUCCESS ==========`);
    
    return successResponse({
      fileData: excelBuffer,
      fileName: `RPD ${year}${kua ? ' - ' + kua : ''}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
  } catch (error) {
    Logger.log(`[EXPORT_RPD_EXCEL ERROR] ========== ERROR ==========`);
    Logger.log(`[EXPORT_RPD_EXCEL ERROR] Message: ${error.toString()}`);
    Logger.log(`[EXPORT_RPD_EXCEL ERROR] Stack: ${error.stack}`);
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

function exportRPDPDF(rpds, year, kua) {
  let tableRows = '';
  let total = 0;
  
  rpds.forEach((rpd, index) => {
    total += parseFloat(rpd.total);
    tableRows += `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${rpd.kua}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${rpd.month}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(rpd.total)}</td>
      </tr>
    `;
  });
  
  tableRows += `
    <tr style="background: #f0f0f0; font-weight: bold;">
      <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: center;">TOTAL</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(total)}</td>
    </tr>
  `;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #667eea; color: white; padding: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>LAPORAN RPD BOP KUA</h2>
        <h3>Kementerian Agama Kabupaten Indramayu</h3>
        <p>Tahun ${year}${kua ? ` - ${kua}` : ''}</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>KUA</th>
            <th>Bulan</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <div style="margin-top: 50px; text-align: right;">
        <p>Indramayu, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p style="margin-top: 80px;"><strong>( ___________________ )</strong></p>
      </div>
    </body>
    </html>
  `;
  
  const blob = Utilities.newBlob(htmlContent, MimeType.HTML, 'temp.html');
  const pdfBlob = blob.getAs('application/pdf');
  pdfBlob.setName(`RPD ${year}${kua ? ' - ' + kua : ''}.pdf`);
  
  const base64 = Utilities.base64Encode(pdfBlob.getBytes());
  
  return successResponse({
    fileData: base64,
    fileName: pdfBlob.getName(),
    mimeType: 'application/pdf'
  });
}

function exportRealisasiEnhanced(data) {
  Logger.log(`[EXPORT_REALISASI_ENHANCED] ========== START ==========`);
  Logger.log(`[EXPORT_REALISASI_ENHANCED] Format: ${data.format}, Year: ${data.year}, KUA: ${data.kua || 'ALL'}`);
  
  try {
    const sheet = getSheet(SHEETS.REALISASI);
    const values = sheet.getDataRange().getValues();
    const year = data.year || new Date().getFullYear();
    
    Logger.log(`[EXPORT_REALISASI_ENHANCED] Filtering realisasis`);
    
    let realisasis = [];
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[4] == year && (!data.kua || row[1] === data.kua)) {
        realisasis.push({
          kua: row[1],
          month: row[3],
          year: row[4],
          total: row[7],
          status: row[8],
          createdAt: row[10],
          verifiedBy: row[12] || '-',
          verifiedAt: row[13] || '-',
          notes: row[14] || '-'
        });
      }
    }
    
    Logger.log(`[EXPORT_REALISASI_ENHANCED] Found ${realisasis.length} realisasis`);
    
    if (data.format === 'pdf') {
      return exportRealisasiAllPDF(realisasis, year, data.kua);
    } else {
      return exportRealisasiAllToExcel(realisasis, year, data.kua);
    }
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_ENHANCED ERROR] ========== ERROR ==========`);
    Logger.log(`[EXPORT_REALISASI_ENHANCED ERROR] Message: ${error.toString()}`);
    Logger.log(`[EXPORT_REALISASI_ENHANCED ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal export realisasi: ' + error.toString());
  }
}

function exportRealisasiAllToExcel(realisasis, year, kua) {
  Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] ========== START (SHEETJS METHOD) ==========`);
  Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Year: ${year}, KUA: ${kua || 'ALL'}, Total: ${realisasis.length}`);
  
  try {
    const data = [];
    
    // Headers
    data.push(['No', 'KUA', 'Bulan', 'Tahun', 'Total', 'Status', 'Tanggal Dibuat', 'Diverifikasi Oleh', 'Tanggal Verifikasi', 'Catatan']);
    
    // Data rows
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Adding ${realisasis.length} data rows`);
    realisasis.forEach((real, index) => {
      data.push([
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
        Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Progress: ${index + 1}/${realisasis.length}`);
      }
    });
    
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Creating workbook with SheetJS`);
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Realisasi');
    
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Writing to binary`);
    const excelBuffer = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
    
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] Buffer length: ${excelBuffer.length}`);
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL] ========== SUCCESS ==========`);
    
    return successResponse({
      fileData: excelBuffer,
      fileName: `Realisasi ${year}${kua ? ' - ' + kua : ''}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL ERROR] ========== ERROR ==========`);
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL ERROR] Message: ${error.toString()}`);
    Logger.log(`[EXPORT_REALISASI_ALL_EXCEL ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal export realisasi: ' + error.toString());
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

function exportRealisasiAllPDF(realisasis, year, kua) {
  let tableRows = '';
  let total = 0;
  
  realisasis.forEach((real, index) => {
    total += real.total;
    tableRows += `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${real.kua}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${real.month}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(real.total)}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${real.status}</td>
      </tr>
    `;
  });
  
  tableRows += `
    <tr style="background: #f0f0f0; font-weight: bold;">
      <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: center;">TOTAL</td>
      <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">Rp ${formatNumber(total)}</td>
      <td style="padding: 8px; border: 1px solid #ddd;"></td>
    </tr>
  `;
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        .header { text-align: center; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #667eea; color: white; padding: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>LAPORAN REALISASI BOP KUA</h2>
        <h3>Kementerian Agama Kabupaten Indramayu</h3>
        <p>Tahun ${year}${kua ? ` - ${kua}` : ''}</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>KUA</th>
            <th>Bulan</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <div style="margin-top: 50px; text-align: right;">
        <p>Indramayu, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p style="margin-top: 80px;"><strong>( ___________________ )</strong></p>
      </div>
    </body>
    </html>
  `;
  
  const blob = Utilities.newBlob(htmlContent, MimeType.HTML, 'temp.html');
  const pdfBlob = blob.getAs('application/pdf');
  pdfBlob.setName(`Realisasi ${year}${kua ? ' - ' + kua : ''}.pdf`);
  
  const base64 = Utilities.base64Encode(pdfBlob.getBytes());
  
  return successResponse({
    fileData: base64,
    fileName: pdfBlob.getName(),
    mimeType: 'application/pdf'
  });
}

// ===== EXPORT RPD PER YEAR (NEW FORMAT) =====
function exportRPDPerYear(data) {
  Logger.log(`[EXPORT_RPD_YEAR] ========== START ==========`);
  Logger.log(`[EXPORT_RPD_YEAR] Year: ${data.year}, KUA: ${data.kua || 'ALL'}`);
  
  try {
    const year = data.year || new Date().getFullYear();
    const selectedKUA = data.kua;
    
    // Get all budgets for the year
    const budgetSheet = getSheet(SHEETS.BUDGET);
    const budgetValues = budgetSheet.getDataRange().getValues();
    
    // Get all RPDs for the year
    const rpdSheet = getSheet(SHEETS.RPD);
    const rpdValues = rpdSheet.getDataRange().getValues();
    
    // Prepare data structure
    const kuaData = {};
    
    // Filter KUA list
    let kuaList = selectedKUA ? [selectedKUA] : KUA_LIST;
    
    Logger.log(`[EXPORT_RPD_YEAR] Processing ${kuaList.length} KUAs`);
    
    // Initialize data for each KUA
    kuaList.forEach(kua => {
      kuaData[kua] = {
        budget: 0,
        months: {}
      };
      
      // Initialize all months to 0
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      months.forEach(month => {
        kuaData[kua].months[month] = 0;
      });
    });
    
    // Fill budget data
    for (let i = 1; i < budgetValues.length; i++) {
      const row = budgetValues[i];
      if (row[2] == year) {
        const kua = row[1];
        if (kuaData[kua]) {
          kuaData[kua].budget = parseFloat(row[3]) || 0;
        }
      }
    }
    
    // Fill RPD data
    for (let i = 1; i < rpdValues.length; i++) {
      const row = rpdValues[i];
      if (row[4] == year) {
        const kua = row[1];
        const month = row[3];
        if (kuaData[kua]) {
          kuaData[kua].months[month] = parseFloat(row[6]) || 0;
        }
      }
    }
    
    Logger.log(`[EXPORT_RPD_YEAR] Data prepared, generating ${data.format}`);
    
    if (data.format === 'pdf') {
      return exportRPDPerYearPDF(kuaData, year, selectedKUA);
    } else {
      return exportRPDPerYearExcel(kuaData, year, selectedKUA);
    }
  } catch (error) {
    Logger.log(`[EXPORT_RPD_YEAR ERROR] ${error.toString()}`);
    Logger.log(`[EXPORT_RPD_YEAR ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRPDPerYearExcel(kuaData, year, selectedKUA) {
  Logger.log(`[EXPORT_RPD_YEAR_EXCEL] Creating Excel`);
  
  try {
    const rows = [];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    // Title
    rows.push([selectedKUA ? `LAPORAN RPD ${selectedKUA} - TAHUN ${year}` : `LAPORAN RPD SEMUA KUA - TAHUN ${year}`]);
    rows.push(['Kementerian Agama Kabupaten Indramayu']);
    rows.push([]);
    
    // Headers
    const headers = ['No', 'Nama', 'ALOKASI BOP'];
    months.forEach(month => headers.push(month));
    headers.push('Total', 'Sisa Anggaran');
    rows.push(headers);
    
    // Data
    let totalBudget = 0;
    const totalMonths = {};
    months.forEach(month => totalMonths[month] = 0);
    let grandTotal = 0;
    let totalSisa = 0;
    
    const kuaList = Object.keys(kuaData).sort();
    
    kuaList.forEach((kua, index) => {
      const data = kuaData[kua];
      const row = [index + 1, kua, data.budget];
      
      let kuaTotal = 0;
      months.forEach(month => {
        const value = data.months[month] || 0;
        row.push(value);
        kuaTotal += value;
        totalMonths[month] += value;
      });
      
      const sisaAnggaran = data.budget - kuaTotal;
      row.push(kuaTotal, sisaAnggaran);
      
      totalBudget += data.budget;
      grandTotal += kuaTotal;
      totalSisa += sisaAnggaran;
      
      rows.push(row);
    });
    
    // Total row
    const totalRow = ['', 'TOTAL', totalBudget];
    months.forEach(month => totalRow.push(totalMonths[month]));
    totalRow.push(grandTotal, totalSisa);
    rows.push(totalRow);
    
    const tsvContent = rows.map(row => row.map(cell => String(cell).replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t')).join('\n');
    const blob = Utilities.newBlob(tsvContent, 'text/tab-separated-values', `RPD ${selectedKUA || 'Semua KUA'} - ${year}.xls`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    
    Logger.log(`[EXPORT_RPD_YEAR_EXCEL] Success`);
    
    return successResponse({
      fileData: base64,
      fileName: `RPD ${selectedKUA || 'Semua KUA'} - ${year}.xls`,
      mimeType: 'application/vnd.ms-excel'
    });
  } catch (error) {
    Logger.log(`[EXPORT_RPD_YEAR_EXCEL ERROR] ${error.toString()}`);
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRPDPerYearPDF(kuaData, year, selectedKUA) {
  Logger.log(`[EXPORT_RPD_YEAR_PDF] Creating PDF`);
  
  try {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    let tableRows = '';
    let totalBudget = 0;
    const totalMonths = {};
    months.forEach(month => totalMonths[month] = 0);
    let grandTotal = 0;
    let totalSisa = 0;
    
    const kuaList = Object.keys(kuaData).sort();
    
    kuaList.forEach((kua, index) => {
      const data = kuaData[kua];
      let kuaTotal = 0;
      
      let monthCells = '';
      months.forEach(month => {
        const value = data.months[month] || 0;
        monthCells += `<td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatNumber(value)}</td>`;
        kuaTotal += value;
        totalMonths[month] += value;
      });
      
      const sisaAnggaran = data.budget - kuaTotal;
      totalBudget += data.budget;
      grandTotal += kuaTotal;
      totalSisa += sisaAnggaran;
      
      tableRows += `
        <tr>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${kua}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatNumber(data.budget)}</td>
          ${monthCells}
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatNumber(kuaTotal)}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatNumber(sisaAnggaran)}</td>
        </tr>
      `;
    });
    
    // Total row
    let totalMonthCells = '';
    months.forEach(month => {
      totalMonthCells += `<td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatNumber(totalMonths[month])}</td>`;
    });
    
    tableRows += `
      <tr style="background: #f0f0f0; font-weight: bold;">
        <td colspan="2" style="padding: 6px; border: 1px solid #ddd; text-align: center;">TOTAL</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatNumber(totalBudget)}</td>
        ${totalMonthCells}
        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatNumber(grandTotal)}</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatNumber(totalSisa)}</td>
      </tr>
    `;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: Arial, sans-serif; font-size: 9px; }
          .header { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #667eea; color: white; padding: 8px; font-size: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>LAPORAN RPD ${selectedKUA || 'SEMUA KUA'}</h2>
          <h3>Kementerian Agama Kabupaten Indramayu</h3>
          <p>Tahun ${year}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama</th>
              <th>ALOKASI BOP</th>
              ${months.map(m => `<th>${m}</th>`).join('')}
              <th>Total</th>
              <th>Sisa</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; text-align: right;">
          <p>Indramayu, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p style="margin-top: 60px;"><strong>( ${NAMA_KASI_BIMAS} )</strong></p>
          <p>${NIP_KASI_BIMAS}</p>
        </div>
      </body>
      </html>
    `;
    
    const blob = Utilities.newBlob(htmlContent, MimeType.HTML, 'temp.html');
    const pdfBlob = blob.getAs('application/pdf');
    pdfBlob.setName(`RPD ${selectedKUA || 'Semua KUA'} - ${year}.pdf`);
    
    const base64 = Utilities.base64Encode(pdfBlob.getBytes());
    
    Logger.log(`[EXPORT_RPD_YEAR_PDF] Success`);
    
    return successResponse({
      fileData: base64,
      fileName: pdfBlob.getName(),
      mimeType: 'application/pdf'
    });
  } catch (error) {
    Logger.log(`[EXPORT_RPD_YEAR_PDF ERROR] ${error.toString()}`);
    return errorResponse('Gagal export PDF: ' + error.toString());
  }
}

// ===== EXPORT RPD DETAIL ALL YEAR (NEW FORMAT) =====
function exportRPDDetailAllYear(data) {
  Logger.log(`[EXPORT_RPD_DETAIL_ALL] ========== START ==========`);
  
  try {
    const year = data.year || new Date().getFullYear();
    
    // Get budget and RPD data
    const budgetSheet = getSheet(SHEETS.BUDGET);
    const budgetValues = budgetSheet.getDataRange().getValues();
    
    const rpdSheet = getSheet(SHEETS.RPD);
    const rpdValues = rpdSheet.getDataRange().getValues();
    
    // Structure: kuaData[kua][code][item] = total
    const kuaData = {};
    const kuaBudgets = {};
    
    Logger.log(`[EXPORT_RPD_DETAIL_ALL] Initializing data for ${KUA_LIST.length} KUAs`);
    
    // Initialize
    KUA_LIST.forEach(kua => {
      kuaData[kua] = {};
      kuaBudgets[kua] = 0;
      
      Object.keys(CONFIG.RPD_PARAMETERS).forEach(code => {
        kuaData[kua][code] = {};
        CONFIG.RPD_PARAMETERS[code].items.forEach(item => {
          kuaData[kua][code][item] = 0;
        });
      });
    });
    
    // Get budgets
    for (let i = 1; i < budgetValues.length; i++) {
      const row = budgetValues[i];
      if (row[2] == year && kuaBudgets[row[1]] !== undefined) {
        kuaBudgets[row[1]] = parseFloat(row[3]) || 0;
      }
    }
    
    // Aggregate RPD data
    for (let i = 1; i < rpdValues.length; i++) {
      const row = rpdValues[i];
      if (row[4] == year) {
        const kua = row[1];
        if (kuaData[kua]) {
          const rpdData = JSON.parse(row[5] || '{}');
          
          Object.entries(rpdData).forEach(([code, items]) => {
            if (kuaData[kua][code]) {
              Object.entries(items).forEach(([item, value]) => {
                if (kuaData[kua][code][item] !== undefined) {
                  kuaData[kua][code][item] += parseFloat(value) || 0;
                }
              });
            }
          });
        }
      }
    }
    
    Logger.log(`[EXPORT_RPD_DETAIL_ALL] Data prepared, generating ${data.format}`);
    
    if (data.format === 'pdf') {
      return exportRPDDetailAllYearPDF(kuaData, kuaBudgets, year);
    } else {
      return exportRPDDetailAllYearExcel(kuaData, kuaBudgets, year);
    }
  } catch (error) {
    Logger.log(`[EXPORT_RPD_DETAIL_ALL ERROR] ${error.toString()}`);
    Logger.log(`[EXPORT_RPD_DETAIL_ALL ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal export: ' + error.toString());
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

// ===== EXPORT REALISASI PER YEAR (NEW FORMAT) =====
function exportRealisasiPerYear(data) {
  Logger.log(`[EXPORT_REALISASI_YEAR] ========== START ==========`);
  Logger.log(`[EXPORT_REALISASI_YEAR] Year: ${data.year}, KUA: ${data.kua || 'ALL'}`);
  
  try {
    const year = data.year || new Date().getFullYear();
    const selectedKUA = data.kua;
    
    // Get all budgets for the year
    const budgetSheet = getSheet(SHEETS.BUDGET);
    const budgetValues = budgetSheet.getDataRange().getValues();
    
    // Get all Realisasi for the year (only Diterima)
    const realisasiSheet = getSheet(SHEETS.REALISASI);
    const realisasiValues = realisasiSheet.getDataRange().getValues();
    
    // Prepare data structure
    const kuaData = {};
    
    // Filter KUA list
    let kuaList = selectedKUA ? [selectedKUA] : KUA_LIST;
    
    Logger.log(`[EXPORT_REALISASI_YEAR] Processing ${kuaList.length} KUAs`);
    
    // Initialize data for each KUA
    kuaList.forEach(kua => {
      kuaData[kua] = {
        budget: 0,
        months: {}
      };
      
      // Initialize all months to 0
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      months.forEach(month => {
        kuaData[kua].months[month] = 0;
      });
    });
    
    // Fill budget data
    for (let i = 1; i < budgetValues.length; i++) {
      const row = budgetValues[i];
      if (row[2] == year) {
        const kua = row[1];
        if (kuaData[kua]) {
          kuaData[kua].budget = parseFloat(row[3]) || 0;
        }
      }
    }
    
    // Fill Realisasi data (only Diterima)
    for (let i = 1; i < realisasiValues.length; i++) {
      const row = realisasiValues[i];
      if (row[4] == year && row[8] === 'Diterima') {
        const kua = row[1];
        const month = row[3];
        if (kuaData[kua]) {
          kuaData[kua].months[month] = parseFloat(row[7]) || 0;
        }
      }
    }
    
    Logger.log(`[EXPORT_REALISASI_YEAR] Data prepared, generating ${data.format}`);
    
    if (data.format === 'pdf') {
      return exportRealisasiPerYearPDF(kuaData, year, selectedKUA);
    } else {
      return exportRealisasiPerYearExcel(kuaData, year, selectedKUA);
    }
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_YEAR ERROR] ${error.toString()}`);
    Logger.log(`[EXPORT_REALISASI_YEAR ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRealisasiPerYearExcel(kuaData, year, selectedKUA) {
  Logger.log(`[EXPORT_REALISASI_YEAR_EXCEL] Creating Excel`);
  
  try {
    const rows = [];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    // Title
    rows.push([selectedKUA ? `LAPORAN REALISASI ${selectedKUA} - TAHUN ${year}` : `LAPORAN REALISASI SEMUA KUA - TAHUN ${year}`]);
    rows.push(['Kementerian Agama Kabupaten Indramayu']);
    rows.push([]);
    
    // Headers
    const headers = ['No', 'Nama', 'ALOKASI BOP'];
    months.forEach(month => headers.push(month));
    headers.push('Total', 'Sisa Anggaran');
    rows.push(headers);
    
    // Data
    let totalBudget = 0;
    const totalMonths = {};
    months.forEach(month => totalMonths[month] = 0);
    let grandTotal = 0;
    let totalSisa = 0;
    
    const kuaList = Object.keys(kuaData).sort();
    
    kuaList.forEach((kua, index) => {
      const data = kuaData[kua];
      const row = [index + 1, kua, data.budget];
      
      let kuaTotal = 0;
      months.forEach(month => {
        const value = data.months[month] || 0;
        row.push(value);
        kuaTotal += value;
        totalMonths[month] += value;
      });
      
      const sisaAnggaran = data.budget - kuaTotal;
      row.push(kuaTotal, sisaAnggaran);
      
      totalBudget += data.budget;
      grandTotal += kuaTotal;
      totalSisa += sisaAnggaran;
      
      rows.push(row);
    });
    
    // Total row
    const totalRow = ['', 'TOTAL', totalBudget];
    months.forEach(month => totalRow.push(totalMonths[month]));
    totalRow.push(grandTotal, totalSisa);
    rows.push(totalRow);
    
    const tsvContent = rows.map(row => row.map(cell => String(cell).replace(/\t/g, ' ').replace(/\n/g, ' ')).join('\t')).join('\n');
    const blob = Utilities.newBlob(tsvContent, 'text/tab-separated-values', `Realisasi ${selectedKUA || 'Semua KUA'} - ${year}.xls`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    
    Logger.log(`[EXPORT_REALISASI_YEAR_EXCEL] Success`);
    
    return successResponse({
      fileData: base64,
      fileName: `Realisasi ${selectedKUA || 'Semua KUA'} - ${year}.xls`,
      mimeType: 'application/vnd.ms-excel'
    });
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_YEAR_EXCEL ERROR] ${error.toString()}`);
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRealisasiPerYearPDF(kuaData, year, selectedKUA) {
  Logger.log(`[EXPORT_REALISASI_YEAR_PDF] Creating PDF`);
  
  try {
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    let tableRows = '';
    let totalBudget = 0;
    const totalMonths = {};
    months.forEach(month => totalMonths[month] = 0);
    let grandTotal = 0;
    let totalSisa = 0;
    
    const kuaList = Object.keys(kuaData).sort();
    
    kuaList.forEach((kua, index) => {
      const data = kuaData[kua];
      let kuaTotal = 0;
      
      let monthCells = '';
      months.forEach(month => {
        const value = data.months[month] || 0;
        monthCells += `<td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatNumber(value)}</td>`;
        kuaTotal += value;
        totalMonths[month] += value;
      });
      
      const sisaAnggaran = data.budget - kuaTotal;
      totalBudget += data.budget;
      grandTotal += kuaTotal;
      totalSisa += sisaAnggaran;
      
      tableRows += `
        <tr>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
          <td style="padding: 6px; border: 1px solid #ddd;">${kua}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatNumber(data.budget)}</td>
          ${monthCells}
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatNumber(kuaTotal)}</td>
          <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatNumber(sisaAnggaran)}</td>
        </tr>
      `;
    });
    
    // Total row
    let totalMonthCells = '';
    months.forEach(month => {
      totalMonthCells += `<td style="padding: 6px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${formatNumber(totalMonths[month])}</td>`;
    });
    
    tableRows += `
      <tr style="background: #f0f0f0; font-weight: bold;">
        <td colspan="2" style="padding: 6px; border: 1px solid #ddd; text-align: center;">TOTAL</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatNumber(totalBudget)}</td>
        ${totalMonthCells}
        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatNumber(grandTotal)}</td>
        <td style="padding: 6px; border: 1px solid #ddd; text-align: right;">${formatNumber(totalSisa)}</td>
      </tr>
    `;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body { font-family: Arial, sans-serif; font-size: 9px; }
          .header { text-align: center; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #667eea; color: white; padding: 8px; font-size: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>LAPORAN REALISASI ${selectedKUA || 'SEMUA KUA'}</h2>
          <h3>Kementerian Agama Kabupaten Indramayu</h3>
          <p>Tahun ${year}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Nama</th>
              <th>ALOKASI BOP</th>
              ${months.map(m => `<th>${m}</th>`).join('')}
              <th>Total</th>
              <th>Sisa</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div style="margin-top: 30px; text-align: right;">
          <p>Indramayu, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p style="margin-top: 60px;"><strong>( ${NAMA_KASI_BIMAS} )</strong></p>
          <p>${NIP_KASI_BIMAS}</p>
        </div>
      </body>
      </html>
    `;
    
    const blob = Utilities.newBlob(htmlContent, MimeType.HTML, 'temp.html');
    const pdfBlob = blob.getAs('application/pdf');
    pdfBlob.setName(`Realisasi ${selectedKUA || 'Semua KUA'} - ${year}.pdf`);
    
    const base64 = Utilities.base64Encode(pdfBlob.getBytes());
    
    Logger.log(`[EXPORT_REALISASI_YEAR_PDF] Success`);
    
    return successResponse({
      fileData: base64,
      fileName: pdfBlob.getName(),
      mimeType: 'application/pdf'
    });
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_YEAR_PDF ERROR] ${error.toString()}`);
    return errorResponse('Gagal export PDF: ' + error.toString());
  }
}

// ===== EXPORT REALISASI DETAIL ALL YEAR (NEW FORMAT) =====
function exportRealisasiDetailAllYear(data) {
  Logger.log(`[EXPORT_REALISASI_DETAIL_ALL] ========== START ==========`);
  
  try {
    const year = data.year || new Date().getFullYear();
    
    // Get budget and Realisasi data
    const budgetSheet = getSheet(SHEETS.BUDGET);
    const budgetValues = budgetSheet.getDataRange().getValues();
    
    const realisasiSheet = getSheet(SHEETS.REALISASI);
    const realisasiValues = realisasiSheet.getDataRange().getValues();
    
    // Structure: kuaData[kua][code][item] = total
    const kuaData = {};
    const kuaBudgets = {};
    
    Logger.log(`[EXPORT_REALISASI_DETAIL_ALL] Initializing data for ${KUA_LIST.length} KUAs`);
    
    // Initialize
    KUA_LIST.forEach(kua => {
      kuaData[kua] = {};
      kuaBudgets[kua] = 0;
      
      Object.keys(CONFIG.RPD_PARAMETERS).forEach(code => {
        kuaData[kua][code] = {};
        CONFIG.RPD_PARAMETERS[code].items.forEach(item => {
          kuaData[kua][code][item] = 0;
        });
      });
    });
    
    // Get budgets
    for (let i = 1; i < budgetValues.length; i++) {
      const row = budgetValues[i];
      if (row[2] == year && kuaBudgets[row[1]] !== undefined) {
        kuaBudgets[row[1]] = parseFloat(row[3]) || 0;
      }
    }
    
    // Aggregate Realisasi data (only Diterima)
    for (let i = 1; i < realisasiValues.length; i++) {
      const row = realisasiValues[i];
      if (row[4] == year && row[8] === 'Diterima') {
        const kua = row[1];
        if (kuaData[kua]) {
          const realisasiData = JSON.parse(row[6] || '{}');
          
          Object.entries(realisasiData).forEach(([code, items]) => {
            if (kuaData[kua][code]) {
              Object.entries(items).forEach(([item, value]) => {
                if (kuaData[kua][code][item] !== undefined) {
                  kuaData[kua][code][item] += parseFloat(value) || 0;
                }
              });
            }
          });
        }
      }
    }
    
    Logger.log(`[EXPORT_REALISASI_DETAIL_ALL] Data prepared, generating ${data.format}`);
    
    if (data.format === 'pdf') {
      return exportRealisasiDetailAllYearPDF(kuaData, kuaBudgets, year);
    } else {
      return exportRealisasiDetailAllYearExcel(kuaData, kuaBudgets, year);
    }
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_DETAIL_ALL ERROR] ${error.toString()}`);
    Logger.log(`[EXPORT_REALISASI_DETAIL_ALL ERROR] Stack: ${error.stack}`);
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRealisasiDetailAllYearExcel(kuaData, kuaBudgets, year) {
  Logger.log(`[EXPORT_REALISASI_DETAIL_ALL_EXCEL] Creating Excel`);
  
  try {
    const rows = [];
    const kuaList = KUA_LIST.slice().sort();
    
    // Title
    rows.push([`LAPORAN REALISASI DETAIL SEMUA KUA - TAHUN ${year}`]);
    rows.push(['Kementerian Agama Kabupaten Indramayu']);
    rows.push([]);
    
    // Headers
    const headers = ['No', 'Kode', 'Uraian Program/Kegiatan/Output/Komponen'];
    kuaList.forEach(kua => headers.push(kua));
    headers.push('Total Realisasi');
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
    const blob = Utilities.newBlob(tsvContent, 'text/tab-separated-values', `Realisasi Detail Semua KUA - ${year}.xls`);
    const base64 = Utilities.base64Encode(blob.getBytes());
    
    Logger.log(`[EXPORT_REALISASI_DETAIL_ALL_EXCEL] Success`);
    
    return successResponse({
      fileData: base64,
      fileName: `Realisasi Detail Semua KUA - ${year}.xls`,
      mimeType: 'application/vnd.ms-excel'
    });
  } catch (error) {
    Logger.log(`[EXPORT_REALISASI_DETAIL_ALL_EXCEL ERROR] ${error.toString()}`);
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRealisasiDetailAllYearPDF(kuaData, kuaBudgets, year) {
  Logger.log(`[EXPORT_REALISASI_DETAIL_ALL_PDF] Creating PDF`);
  
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
    sisaRow += `<td style="text-align: right;">${formatNumber(totalSisa)}</td></tr>`;const htmlContent = `
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
      <h2 style="margin: 5px 0;">LAPORAN REALISASI DETAIL SEMUA KUA</h2>
      <h3 style="margin: 5px 0;">Kementerian Agama Kabupaten Indramayu - Tahun ${year}</h3>
    </div>    <table>
      <thead><tr>${headerCells}</tr></thead>
      <tbody>
        ${budgetRow}
        ${detailRows}
        ${jumlahRow}
        ${sisaRow}
      </tbody>
    </table>    <div style="margin-top: 20px; text-align: right;">
      <p>Indramayu, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <p style="margin-top: 40px;"><strong>( ${NAMA_KASI_BIMAS} )</strong></p>
      <p>${NIP_KASI_BIMAS}</p>
    </div>
  </body>
  </html>
`;const blob = Utilities.newBlob(htmlContent, MimeType.HTML, 'temp.html');
const pdfBlob = blob.getAs('application/pdf');
pdfBlob.setName(`Realisasi Detail Semua KUA - ${year}.pdf`);const base64 = Utilities.base64Encode(pdfBlob.getBytes());Logger.log(`[EXPORT_REALISASI_DETAIL_ALL_PDF] Success`);return successResponse({
  fileData: base64,
  fileName: pdfBlob.getName(),
  mimeType: 'application/pdf'
});
} catch (error) {
Logger.log(`[EXPORT_REALISASI_DETAIL_ALL_PDF ERROR] ${error.toString()}`);
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