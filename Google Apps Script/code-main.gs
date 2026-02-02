// ===== GOOGLE APPS SCRIPT - MAIN =====
// File: code-main.gs
// Deskripsi: Handler utama dan fungsi-fungsi umum untuk login, user management

// ===== KONFIGURASI SPREADSHEET =====
const SS_ID = '1yz9IeOW9WSDRM9JHwBHYtwi5xmA9hIxJVFPX9G10pNw';

// ===== MAIN HANDLER =====
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    Logger.log(`[${new Date().toISOString()}] Action: ${action}`);
    Logger.log(`Data: ${JSON.stringify(data)}`);
    
    // Route ke fungsi yang sesuai
    switch(action) {
      // Authentication & User Management
      case 'login':
        return handleLogin(data);
      case 'changePassword':
        return changePassword(data);
      case 'getUsers':
        return getUsers(data);
      case 'saveUser':
        return saveUser(data);
      case 'deleteUser':
        return deleteUser(data);
      
      // BOP Actions
      case 'getBudgets':
      case 'saveBudget':
      case 'getRPDConfig':
      case 'saveRPDConfig':
      case 'getRPDs':
      case 'saveRPD':
      case 'deleteRPD':
      case 'getRealisasis':
      case 'saveRealisasi':
      case 'updateRealisasiStatus':
      case 'uploadFile':
      case 'getDashboardStats':
      case 'exportBudget':
      case 'exportRPD':
      case 'exportRealisasi':
      case 'downloadRealisasiBulanan':
      case 'exportBudgetEnhanced':
      case 'exportRPDEnhanced':
      case 'exportRealisasiEnhanced':
      case 'exportRPDAllPerMonth':
      case 'exportRPDSelectedPerMonth':
      case 'exportRPDAllDetailYear':
      case 'exportRealisasiAllPerMonth':
      case 'exportRealisasiSelectedPerMonth':
      case 'exportRealisasiAllDetailPerMonth':
      case 'exportRPDPerYear':
      case 'exportRPDDetailAllYear':
      case 'exportRealisasiPerYear':
      case 'exportRealisasiDetailAllYear':
        // Delegate ke BOP module
        return handleBOPAction(action, data);
      
      // BMN Actions
      case 'getBMNStats':
      case 'getBMNData':
      case 'saveBMN':
      case 'uploadBMNPhoto':
      case 'getBMNVerifikasi':
      case 'updateBMNVerifikasi':
      case 'getBMNRiwayat':
      case 'exportLaporanBMN':
        // Delegate ke BMN module
        return handleBMNAction(action, data);
      
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
    case BMN_SHEETS.BMN_DATA:
      headers = [
        'ID', 'KUA', 'Kode Barang', 'Nama Barang', 'Jenis', 'Tahun Perolehan',
        'Sumber Perolehan', 'Nilai Perolehan', 'Kondisi', 'Status', 'Lokasi Barang',
        'ID BMN', 'Keterangan', 'Fotos (JSON)', 'Status Verifikasi', 'Catatan Verifikasi',
        'Created At', 'Updated At'
      ];
      break;
    case BMN_SHEETS.BMN_RIWAYAT:
      headers = ['ID', 'KUA', 'Kode Barang', 'Nama Barang', 'Action', 'Operator', 'Timestamp'];
      break;
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
    const sheet = getSheet('Logs');
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
  Logger.log('[LOGIN] Attempting login for: ' + data.username);
  
  try {
    const sheet = getSheet('Users');
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const status = String(row[6]).toLowerCase();
      if (row[1] === data.username && row[2] === data.password) {
        if (status !== 'active') {
          Logger.log('[LOGIN] User inactive');
          return errorResponse('Akun tidak aktif');
        }
        
        const user = {
          id: row[0],
          username: row[1],
          name: row[3],
          role: row[4],
          kua: row[5]
        };
        
        logAction(user.id, user.username, user.role, 'LOGIN', { ip: 'web' });
        Logger.log('[LOGIN] Success: ' + user.username);
        return successResponse(user);
      }
    }
    
    Logger.log('[LOGIN] Failed: Invalid credentials');
    return errorResponse('Username atau password salah');
  } catch (error) {
    Logger.log('[LOGIN ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

// ===== CHANGE PASSWORD =====
function changePassword(data) {
  Logger.log('[CHANGE_PASSWORD] User: ' + data.username);
  
  try {
    const sheet = getSheet('Users');
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      if (row[1] === data.username && row[2] === data.oldPassword) {
        sheet.getRange(i + 1, 3).setValue(data.newPassword);
        
        logAction(row[0], data.username, row[4], 'CHANGE_PASSWORD', {});
        Logger.log('[CHANGE_PASSWORD] Success');
        return successResponse({ message: 'Password berhasil diubah' });
      }
    }
    
    Logger.log('[CHANGE_PASSWORD] Failed: Invalid old password');
    return errorResponse('Password lama salah');
  } catch (error) {
    Logger.log('[CHANGE_PASSWORD ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

// ===== USER MANAGEMENT =====
function getUsers(data) {
  Logger.log('[GET_USERS] Getting all users');
  
  try {
    const sheet = getSheet('Users');
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
    
    Logger.log('[GET_USERS] Found: ' + users.length);
    return successResponse(users);
  } catch (error) {
    Logger.log('[GET_USERS ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

function saveUser(data) {
  Logger.log('[SAVE_USER] Saving user: ' + data.username);
  
  try {
    const sheet = getSheet('Users');
    const values = sheet.getDataRange().getValues();
    
    // Check if username exists (for new user)
    if (!data.id) {
      for (let i = 1; i < values.length; i++) {
        if (values[i][1] === data.username) {
          return errorResponse('Username sudah digunakan');
        }
      }
    }
    
    if (data.id) {
      // Update existing user
      for (let i = 1; i < values.length; i++) {
        if (values[i][0] === data.id) {
          sheet.getRange(i + 1, 2, 1, 6).setValues([[
            data.username,
            data.password || values[i][2],
            data.name,
            data.role,
            data.kua,
            data.status
          ]]);
          
          logAction(data.currentUserId, data.currentUsername, data.currentUserRole, 'UPDATE_USER', { userId: data.id });
          Logger.log('[SAVE_USER] Updated');
          return successResponse({ message: 'User berhasil diupdate' });
        }
      }
    } else {
      // Create new user
      const newUser = [
        generateID(),
        data.username,
        data.password,
        data.name,
        data.role,
        data.kua,
        'active',
        new Date()
      ];
      sheet.appendRow(newUser);
      
      logAction(data.currentUserId, data.currentUsername, data.currentUserRole, 'CREATE_USER', { username: data.username });
      Logger.log('[SAVE_USER] Created');
      return successResponse({ message: 'User berhasil ditambahkan' });
    }
    
    return errorResponse('User tidak ditemukan');
  } catch (error) {
    Logger.log('[SAVE_USER ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}

function deleteUser(data) {
  Logger.log('[DELETE_USER] Deleting user: ' + data.id);
  
  try {
    const sheet = getSheet('Users');
    const values = sheet.getDataRange().getValues();
    
    for (let i = 1; i < values.length; i++) {
      if (values[i][0] === data.id) {
        sheet.deleteRow(i + 1);
        
        logAction(data.currentUserId, data.currentUsername, data.currentUserRole, 'DELETE_USER', { userId: data.id });
        Logger.log('[DELETE_USER] Success');
        return successResponse({ message: 'User berhasil dihapus' });
      }
    }
    
    return errorResponse('User tidak ditemukan');
  } catch (error) {
    Logger.log('[DELETE_USER ERROR] ' + error.toString());
    return errorResponse(error.toString());
  }
}