// ===== GOOGLE APPS SCRIPT - BOP MODULE ENHANCED =====
// File: code-bop-enhanced.gs
// Version: 5.0 - Multi-user optimized with Lock Service
// Features: Lock Service, Optimistic Locking, Batch Operations, Retry Mechanism

// ===== LOCK SERVICE IMPLEMENTATION =====

/**
 * Acquire lock dengan retry mechanism
 * @param {string} lockKey - Unique key untuk lock
 * @param {number} maxWaitSeconds - Maximum waktu tunggu (default: 30s)
 * @return {GoogleAppsScript.Lock.Lock|null} - Lock object atau null
 */
 
function acquireLock(lockKey, maxWaitSeconds) {
  maxWaitSeconds = maxWaitSeconds || 30;
  
  try {
    const lock = LockService.getDocumentLock();
    const acquired = lock.tryLock(maxWaitSeconds * 1000);
    
    if (acquired) {
      Logger.log('[LOCK] ✓ Acquired lock for: ' + lockKey);
      return lock;
    } else {
      Logger.log('[LOCK] ✗ Failed to acquire lock for: ' + lockKey);
      return null;
    }
  } catch (error) {
    Logger.log('[LOCK ERROR] ' + error.toString());
    return null;
  }
}

/**
 * Release lock
 */
function releaseLock(lock) {
  if (lock) {
    try {
      lock.releaseLock();
      Logger.log('[LOCK] Released lock');
    } catch (error) {
      Logger.log('[LOCK RELEASE ERROR] ' + error.toString());
    }
  }
}

/**
 * Execute function dengan lock protection
 */
function executeWithLock(lockKey, fn, maxWaitSeconds) {
  const lock = acquireLock(lockKey, maxWaitSeconds);
  
  if (!lock) {
    return errorResponse('Sistem sedang sibuk, silakan coba lagi dalam beberapa saat');
  }
  
  try {
    const result = fn();
    return result;
  } catch (error) {
    Logger.log('[EXECUTE_WITH_LOCK ERROR] ' + error.toString());
    return errorResponse('Terjadi kesalahan: ' + error.toString());
  } finally {
    releaseLock(lock);
  }
}

// ===== OPTIMISTIC LOCKING =====

/**
 * Validate concurrent update menggunakan timestamps
 */
function validateOptimisticLock(data, existingUpdatedAt) {
  if (!data.lastUpdatedAt) {
    return true; // First time update, no conflict
  }
  
  const clientTimestamp = new Date(data.lastUpdatedAt).getTime();
  const dbTimestamp = new Date(existingUpdatedAt).getTime();
  
  if (clientTimestamp < dbTimestamp) {
    Logger.log('[OPTIMISTIC_LOCK] ⚠️ Conflict detected! Client: ' + clientTimestamp + ', DB: ' + dbTimestamp);
    return false;
  }
  
  return true;
}

// ===== ENHANCED SAVE OPERATIONS =====

/**
 * Save RPD dengan lock protection dan optimistic locking
 * ✅ Prevents race conditions
 * ✅ Validates concurrent updates
 * ✅ Returns updated timestamp
 */
function saveRPDEnhanced(data) {
  Logger.log('[SAVE_RPD_ENHANCED] KUA: ' + data.kua + ', Month: ' + data.month + ', Year: ' + data.year);
  
  const lockKey = 'RPD_' + data.kua + '_' + data.month + '_' + data.year;
  
  return executeWithLock(lockKey, function() {
    try {
      const sheet = getSheet(SHEETS.RPD);
      const rows = sheet.getDataRange().getValues();
      const now = new Date();
      
      // Check if RPD exists
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1] === data.kua && 
            rows[i][2] === data.month && 
            rows[i][3] == data.year) {
          
          // ✅ Optimistic lock validation
          if (!validateOptimisticLock(data, rows[i][7])) {
            return errorResponse('Data sudah diubah oleh user lain. Silakan refresh dan coba lagi.');
          }
          
          // Update existing RPD
          sheet.getRange(i + 1, 5).setValue(parseFloat(data.total) || 0);
          sheet.getRange(i + 1, 6).setValue(JSON.stringify(data.data));
          sheet.getRange(i + 1, 8).setValue(now);
          sheet.getRange(i + 1, 9).setValue(data.userId);
          sheet.getRange(i + 1, 10).setValue(data.username);
          
          Logger.log('[SAVE_RPD_ENHANCED] ✓ Updated RPD at row: ' + (i + 1));
          
          return successResponse({ 
            message: 'RPD berhasil diupdate',
            id: rows[i][0],
            updatedAt: now.toISOString()
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
        JSON.stringify(data.data),
        now,
        now,
        data.userId,
        data.username
      ];
      
      sheet.appendRow(newRow);
      Logger.log('[SAVE_RPD_ENHANCED] ✓ Created new RPD: ' + id);
      
      return successResponse({ 
        message: 'RPD berhasil disimpan',
        id: id,
        updatedAt: now.toISOString()
      });
      
    } catch (error) {
      Logger.log('[SAVE_RPD_ENHANCED ERROR] ' + error.toString());
      return errorResponse('Gagal menyimpan RPD: ' + error.toString());
    }
  }, 30);
}

/**
 * Save Realisasi dengan lock protection dan validation
 * ✅ Prevents duplicate realisasi for same month
 * ✅ Validates status before update
 * ✅ Optimistic locking for concurrent updates
 */
function saveRealisasiEnhanced(data) {
  Logger.log('[SAVE_REALISASI_ENHANCED] KUA: ' + data.kua + ', Month: ' + data.month + ', Year: ' + data.year);
  
  const lockKey = 'REALISASI_' + data.kua + '_' + data.month + '_' + data.year;
  
  return executeWithLock(lockKey, function() {
    try {
      const sheet = getSheet(SHEETS.REALISASI);
      const rows = sheet.getDataRange().getValues();
      const now = new Date();
      
      if (data.id) {
        // Update existing realisasi
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][0] === data.id) {
            
            // ✅ Optimistic lock validation
            if (!validateOptimisticLock(data, rows[i][12])) {
              return errorResponse('Data sudah diubah oleh user lain. Silakan refresh dan coba lagi.');
            }
            
            // ✅ Validate status - only editable if Pending or Ditolak
            const currentStatus = rows[i][8];
            if (currentStatus === 'Diterima') {
              return errorResponse('Realisasi yang sudah diterima tidak dapat diubah');
            }
            
            // Update realisasi
            sheet.getRange(i + 1, 7).setValue(JSON.stringify(data.data));
            sheet.getRange(i + 1, 8).setValue(parseFloat(data.total) || 0);
            sheet.getRange(i + 1, 9).setValue('Pending'); // Reset to Pending
            sheet.getRange(i + 1, 11).setValue(JSON.stringify(data.files || []));
            sheet.getRange(i + 1, 13).setValue(now);
            
            Logger.log('[SAVE_REALISASI_ENHANCED] ✓ Updated realisasi: ' + data.id);
            
            return successResponse({ 
              message: 'Realisasi berhasil diupdate',
              id: data.id,
              updatedAt: now.toISOString()
            });
          }
        }
        
        return errorResponse('Realisasi tidak ditemukan');
        
      } else {
        // Create new realisasi
        
        // ✅ Validate: Check for duplicates
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][1] === data.kua && 
              rows[i][3] === data.month && 
              rows[i][4] == data.year) {
            return errorResponse('Realisasi untuk bulan ini sudah ada. Silakan edit yang sudah ada.');
          }
        }
        
        const id = 'REALISASI-' + Utilities.getUuid();
        const newRow = [
          id,
          data.kua,
          data.userId,
          data.month,
          data.year,
          data.rpdId || '',
          JSON.stringify(data.data),
          parseFloat(data.total) || 0,
          'Pending',
          '',
          JSON.stringify(data.files || []),
          now,
          now
        ];
        
        sheet.appendRow(newRow);
        Logger.log('[SAVE_REALISASI_ENHANCED] ✓ Created new realisasi: ' + id);
        
        return successResponse({ 
          message: 'Realisasi berhasil disimpan',
          id: id,
          updatedAt: now.toISOString()
        });
      }
      
    } catch (error) {
      Logger.log('[SAVE_REALISASI_ENHANCED ERROR] ' + error.toString());
      return errorResponse('Gagal menyimpan realisasi: ' + error.toString());
    }
  }, 30);
}

/**
 * Verify Realisasi dengan lock protection
 * ✅ Prevents double verification
 * ✅ Validates current status
 */
function verifyRealisasiEnhanced(data) {
  Logger.log('[VERIFY_REALISASI_ENHANCED] ID: ' + data.id + ', Status: ' + data.status);
  
  const lockKey = 'VERIFY_REALISASI_' + data.id;
  
  return executeWithLock(lockKey, function() {
    try {
      const sheet = getSheet(SHEETS.REALISASI);
      const rows = sheet.getDataRange().getValues();
      const now = new Date();
      
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          
          // ✅ Validate current status
          const currentStatus = rows[i][8];
          if (currentStatus !== 'Pending') {
            return errorResponse('Realisasi ini sudah diverifikasi sebelumnya dengan status: ' + currentStatus);
          }
          
          // Update status and notes
          sheet.getRange(i + 1, 9).setValue(data.status);
          sheet.getRange(i + 1, 10).setValue(data.catatan || '');
          sheet.getRange(i + 1, 13).setValue(now);
          
          Logger.log('[VERIFY_REALISASI_ENHANCED] ✓ Verified: ' + data.id + ' -> ' + data.status);
          
          return successResponse({ 
            message: 'Realisasi berhasil diverifikasi',
            id: data.id
          });
        }
      }
      
      return errorResponse('Realisasi tidak ditemukan');
      
    } catch (error) {
      Logger.log('[VERIFY_REALISASI_ENHANCED ERROR] ' + error.toString());
      return errorResponse('Gagal verifikasi realisasi: ' + error.toString());
    }
  }, 30);
}

// ===== BATCH OPERATIONS =====

/**
 * Get multiple RPDs dengan efficient filtering
 * ✅ Single query for multiple filters
 * ✅ Reduced read operations
 */
function getRPDsBatch(filters) {
  Logger.log('[GET_RPDS_BATCH] Filters: ' + JSON.stringify(filters));
  
  try {
    const sheet = getSheet(SHEETS.RPD);
    const rows = sheet.getDataRange().getValues();
    const rpds = [];
    
    // Pre-process filters
    const kuaList = filters.kuas || [];
    const yearList = filters.years || [];
    const monthList = filters.months || [];
    
    const filterByKUA = kuaList.length > 0;
    const filterByYear = yearList.length > 0;
    const filterByMonth = monthList.length > 0;
    
    // ✅ Single loop with smart filtering
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip if filters don't match
      if (filterByKUA && !kuaList.includes(row[1])) continue;
      if (filterByYear && !yearList.includes(row[3])) continue;
      if (filterByMonth && !monthList.includes(row[2])) continue;
      
      // Parse data
      let rpdData = {};
      try {
        rpdData = JSON.parse(row[5] || '{}');
      } catch (e) {
        Logger.log('[GET_RPDS_BATCH] Parse error at row ' + (i+1));
      }
      
      rpds.push({
        id: row[0],
        kua: row[1],
        month: row[2],
        year: row[3],
        total: parseFloat(row[4]) || 0,
        data: rpdData,
        createdAt: safeFormatDate(row[6]),
        updatedAt: safeFormatDate(row[7]),
        userId: row[8],
        username: row[9]
      });
    }
    
    Logger.log('[GET_RPDS_BATCH] ✓ Found: ' + rpds.length + ' RPDs');
    return successResponse(rpds);
    
  } catch (error) {
    Logger.log('[GET_RPDS_BATCH ERROR] ' + error.toString());
    return errorResponse('Gagal memuat RPD: ' + error.toString());
  }
}

/**
 * Get dashboard stats dengan optimized single-pass calculation
 * ✅ Reads each sheet only once
 * ✅ Calculates all stats in single loop
 */
function getDashboardStatsOptimized(data) {
  Logger.log('[GET_DASHBOARD_STATS_OPT] KUA: ' + data.kua + ', Year: ' + data.year);
  
  try {
    const year = data.year || new Date().getFullYear();
    const kua = data.kua;
    
    // ✅ Get all sheets data once
    const budgetSheet = getSheet(SHEETS.BUDGET);
    const rpdSheet = getSheet(SHEETS.RPD);
    const realisasiSheet = getSheet(SHEETS.REALISASI);
    
    const budgetRows = budgetSheet.getDataRange().getValues();
    const rpdRows = rpdSheet.getDataRange().getValues();
    const realisasiRows = realisasiSheet.getDataRange().getValues();
    
    // Initialize stats
    let stats = {
      totalBudget: 0,
      totalRPD: 0,
      totalRealisasi: 0,
      sisaBudget: 0,
      realisasiPending: 0,
      realisasiDiterima: 0,
      realisasiDitolak: 0
    };
    
    // ✅ Calculate budget (single loop)
    for (let i = 1; i < budgetRows.length; i++) {
      if ((!kua || budgetRows[i][1] === kua) && budgetRows[i][2] == year) {
        stats.totalBudget += parseFloat(budgetRows[i][3]) || 0;
      }
    }
    
    // ✅ Calculate RPD (single loop)
    for (let i = 1; i < rpdRows.length; i++) {
      if ((!kua || rpdRows[i][1] === kua) && rpdRows[i][3] == year) {
        stats.totalRPD += parseFloat(rpdRows[i][4]) || 0;
      }
    }
    
    // ✅ Calculate realisasi (single loop)
    for (let i = 1; i < realisasiRows.length; i++) {
      if ((!kua || realisasiRows[i][1] === kua) && realisasiRows[i][4] == year) {
        const total = parseFloat(realisasiRows[i][7]) || 0;
        const status = realisasiRows[i][8];
        
        if (status === 'Diterima') {
          stats.totalRealisasi += total;
          stats.realisasiDiterima++;
        } else if (status === 'Pending') {
          stats.realisasiPending++;
        } else if (status === 'Ditolak') {
          stats.realisasiDitolak++;
        }
      }
    }
    
    stats.sisaBudget = stats.totalBudget - stats.totalRealisasi;
    
    Logger.log('[GET_DASHBOARD_STATS_OPT] ✓ Stats calculated');
    return successResponse(stats);
    
  } catch (error) {
    Logger.log('[GET_DASHBOARD_STATS_OPT ERROR] ' + error.toString());
    return errorResponse('Gagal memuat stats: ' + error.toString());
  }
}

// ===== RETRY MECHANISM =====

/**
 * Execute function dengan automatic retry on failure
 * ✅ Exponential backoff
 * ✅ Configurable retry attempts
 */
function executeWithRetry(fn, maxRetries, delayMs) {
  maxRetries = maxRetries || 3;
  delayMs = delayMs || 1000;
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      Logger.log('[RETRY] Attempt ' + attempt + ' of ' + maxRetries);
      return fn();
    } catch (error) {
      lastError = error;
      Logger.log('[RETRY] Attempt ' + attempt + ' failed: ' + error.toString());
      
      if (attempt < maxRetries) {
        Utilities.sleep(delayMs);
        delayMs *= 2; // Exponential backoff
      }
    }
  }
  
  Logger.log('[RETRY] ✗ All attempts failed');
  return errorResponse('Operasi gagal setelah ' + maxRetries + ' percobaan: ' + lastError.toString());
}

/**
 * Save RPD dengan retry mechanism
 */
function saveRPDWithRetry(data) {
  return executeWithRetry(function() {
    return saveRPDEnhanced(data);
  }, 3, 1000);
}

/**
 * Save Realisasi dengan retry mechanism
 */
function saveRealisasiWithRetry(data) {
  return executeWithRetry(function() {
    return saveRealisasiEnhanced(data);
  }, 3, 1000);
}

// ===== PERFORMANCE MONITORING =====

const PerformanceMonitor = {
  
  /**
   * Log operation dengan timing information
   */
  logOperation(operation, kua, startTime, success) {
    try {
      const endTime = new Date().getTime();
      const duration = endTime - startTime;
      
      const sheet = getSheet('Performance_Log');
      
      // Initialize sheet if needed
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Timestamp', 'Operation', 'KUA', 'Duration (ms)', 'Success']);
        sheet.setFrozenRows(1);
      }
      
      sheet.appendRow([
        new Date(),
        operation,
        kua || 'N/A',
        duration,
        success ? 'YES' : 'NO'
      ]);
      
      Logger.log('[PERF] ' + operation + ' completed in ' + duration + 'ms');
      
      // Alert if slow (> 5 seconds)
      if (duration > 5000) {
        Logger.log('[PERF WARNING] ⚠️ Slow operation: ' + operation + ' (' + duration + 'ms)');
      }
      
    } catch (error) {
      Logger.log('[PERF_LOG ERROR] ' + error.toString());
    }
  },
  
  /**
   * Log concurrent access attempt
   */
  logConcurrentAccess(operation, kua, lockAcquired) {
    try {
      const sheet = getSheet('Concurrent_Access_Log');
      
      // Initialize sheet if needed
      if (sheet.getLastRow() === 0) {
        sheet.appendRow(['Timestamp', 'Operation', 'KUA', 'Lock Acquired']);
        sheet.setFrozenRows(1);
      }
      
      sheet.appendRow([
        new Date(),
        operation,
        kua || 'N/A',
        lockAcquired ? 'YES' : 'NO'
      ]);
      
      if (!lockAcquired) {
        Logger.log('[CONCURRENT] ⚠️ Lock contention: ' + operation + ' for ' + kua);
      }
      
    } catch (error) {
      Logger.log('[CONCURRENT_LOG ERROR] ' + error.toString());
    }
  }
};

// ===== WRAPPER FUNCTIONS WITH MONITORING =====

function saveRPDEnhancedWithMonitoring(data) {
  const startTime = new Date().getTime();
  const lockKey = 'RPD_' + data.kua + '_' + data.month + '_' + data.year;
  
  const lock = acquireLock(lockKey, 30);
  PerformanceMonitor.logConcurrentAccess('saveRPD', data.kua, lock !== null);
  
  if (!lock) {
    PerformanceMonitor.logOperation('saveRPD', data.kua, startTime, false);
    return errorResponse('Sistem sedang sibuk, silakan coba lagi');
  }
  
  try {
    const result = saveRPDEnhanced(data);
    PerformanceMonitor.logOperation('saveRPD', data.kua, startTime, result.success);
    return result;
  } finally {
    releaseLock(lock);
  }
}

function saveRealisasiEnhancedWithMonitoring(data) {
  const startTime = new Date().getTime();
  const lockKey = 'REALISASI_' + data.kua + '_' + data.month + '_' + data.year;
  
  const lock = acquireLock(lockKey, 30);
  PerformanceMonitor.logConcurrentAccess('saveRealisasi', data.kua, lock !== null);
  
  if (!lock) {
    PerformanceMonitor.logOperation('saveRealisasi', data.kua, startTime, false);
    return errorResponse('Sistem sedang sibuk, silakan coba lagi');
  }
  
  try {
    const result = saveRealisasiEnhanced(data);
    PerformanceMonitor.logOperation('saveRealisasi', data.kua, startTime, result.success);
    return result;
  } finally {
    releaseLock(lock);
  }
}

// ===== EXPORT ENHANCED FUNCTIONS =====
// These will be called from handleBOPActionEnhanced in code-main.gs