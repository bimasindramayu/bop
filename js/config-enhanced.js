// ===== ENHANCED CACHE CONFIGURATION =====
// File: config-enhanced.js
// Deskripsi: Smart caching dengan auto-invalidation untuk performa optimal

const CACHE_CONFIG_ENHANCED = {
  // Enable/disable cache globally
  ENABLED: true,
  
  // Cache duration per key type (in milliseconds)
  DURATION: {
    DASHBOARD_STATS: 2 * 60 * 1000,    // 2 minutes - frequently updated
    BUDGETS: 5 * 60 * 1000,             // 5 minutes - moderately stable
    RPDS: 3 * 60 * 1000,                // 3 minutes - moderately updated
    REALISASIS: 2 * 60 * 1000,          // 2 minutes - frequently updated
    VERIFIKASI: 1 * 60 * 1000,          // 1 minute - very dynamic
    CONFIG: 10 * 60 * 1000              // 10 minutes - rarely changes
  },
  
  // Auto-refresh settings (untuk real-time updates)
  AUTO_REFRESH: {
    ENABLED: false,  // Set true untuk enable auto-refresh
    INTERVAL: 30 * 1000  // 30 seconds
  },
  
  // Auto-invalidate cache saat write operations
  INVALIDATE_ON_WRITE: true,
  
  // Debug logging
  DEBUG: true
};

// ===== SMART CACHE MANAGER =====

const SmartCacheManager = {
  cache: {},
  timestamps: {},
  
  /**
   * Generate cache key dengan proper namespacing
   * @param {string} type - Cache type (BUDGETS, RPDS, dll)
   * @param {Object} params - Query parameters
   * @return {string} - Unique cache key
   */
  getCacheKey(type, params) {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${type}_${paramsStr}`;
  },
  
  /**
   * Check jika cache masih valid
   * @param {string} cacheKey - Cache key to check
   * @param {string} type - Cache type untuk get duration
   * @return {boolean} - true jika valid
   */
  isValid(cacheKey, type) {
    if (!CACHE_CONFIG_ENHANCED.ENABLED) return false;
    if (!this.cache[cacheKey]) return false;
    if (!this.timestamps[cacheKey]) return false;
    
    const duration = CACHE_CONFIG_ENHANCED.DURATION[type] || 5 * 60 * 1000;
    const age = Date.now() - this.timestamps[cacheKey];
    
    return age < duration;
  },
  
  /**
   * Get data dari cache
   * @param {string} type - Cache type
   * @param {Object} params - Query parameters
   * @return {*} - Cached data atau null
   */
  get(type, params) {
    const cacheKey = this.getCacheKey(type, params);
    
    if (this.isValid(cacheKey, type)) {
      if (CACHE_CONFIG_ENHANCED.DEBUG) {
        console.log(`[SMART_CACHE] ✓ HIT for ${type}`);
      }
      return this.cache[cacheKey];
    }
    
    if (CACHE_CONFIG_ENHANCED.DEBUG) {
      console.log(`[SMART_CACHE] ✗ MISS for ${type}`);
    }
    return null;
  },
  
  /**
   * Set data ke cache
   * @param {string} type - Cache type
   * @param {Object} params - Query parameters
   * @param {*} data - Data to cache
   */
  set(type, params, data) {
    if (!CACHE_CONFIG_ENHANCED.ENABLED) return;
    
    const cacheKey = this.getCacheKey(type, params);
    this.cache[cacheKey] = data;
    this.timestamps[cacheKey] = Date.now();
    
    if (CACHE_CONFIG_ENHANCED.DEBUG) {
      console.log(`[SMART_CACHE] ✓ SET for ${type}`, {
        key: cacheKey,
        size: JSON.stringify(data).length + ' bytes'
      });
    }
  },
  
  /**
   * Invalidate cache untuk specific key
   * @param {string} type - Cache type
   * @param {Object} params - Query parameters
   */
  invalidate(type, params) {
    const cacheKey = this.getCacheKey(type, params);
    
    delete this.cache[cacheKey];
    delete this.timestamps[cacheKey];
    
    if (CACHE_CONFIG_ENHANCED.DEBUG) {
      console.log(`[SMART_CACHE] ✓ INVALIDATED ${cacheKey}`);
    }
  },
  
  /**
   * Invalidate all cache dari specific type
   * @param {string} type - Cache type to invalidate
   */
  invalidateType(type) {
    const prefix = type + '_';
    let count = 0;
    
    Object.keys(this.cache).forEach(key => {
      if (key.startsWith(prefix)) {
        delete this.cache[key];
        delete this.timestamps[key];
        count++;
      }
    });
    
    if (CACHE_CONFIG_ENHANCED.DEBUG) {
      console.log(`[SMART_CACHE] ✓ INVALIDATED ${count} entries for type: ${type}`);
    }
  },
  
  /**
   * Clear all cache
   */
  clearAll() {
    const count = Object.keys(this.cache).length;
    this.cache = {};
    this.timestamps = {};
    
    if (CACHE_CONFIG_ENHANCED.DEBUG) {
      console.log(`[SMART_CACHE] ✓ CLEARED ALL (${count} entries)`);
    }
  },
  
  /**
   * Auto-invalidate related caches pada write operations
   * Dipanggil setelah save/delete operations
   * @param {string} operation - Operation name (saveBudget, saveRPD, dll)
   * @param {Object} data - Operation data
   */
  invalidateOnWrite(operation, data) {
    if (!CACHE_CONFIG_ENHANCED.INVALIDATE_ON_WRITE) return;
    
    if (CACHE_CONFIG_ENHANCED.DEBUG) {
      console.log(`[SMART_CACHE] Invalidating caches for operation: ${operation}`);
    }
    
    switch(operation) {
      case 'saveBudget':
      case 'deleteBudget':
        this.invalidateType('BUDGETS');
        this.invalidateType('DASHBOARD_STATS');
        break;
        
      case 'saveRPD':
      case 'deleteRPD':
        this.invalidateType('RPDS');
        this.invalidateType('DASHBOARD_STATS');
        break;
        
      case 'saveRealisasi':
      case 'deleteRealisasi':
      case 'verifyRealisasi':
      case 'updateRealisasiStatus':
        this.invalidateType('REALISASIS');
        this.invalidateType('VERIFIKASI');
        this.invalidateType('DASHBOARD_STATS');
        break;
        
      case 'saveRPDConfig':
        this.invalidateType('CONFIG');
        break;
    }
  },
  
  /**
   * Get cache statistics untuk monitoring
   * @return {Object} - Cache statistics
   */
  getStats() {
    const stats = {
      totalEntries: Object.keys(this.cache).length,
      byType: {},
      totalSize: 0
    };
    
    Object.keys(this.cache).forEach(key => {
      const type = key.split('_')[0];
      if (!stats.byType[type]) {
        stats.byType[type] = { count: 0, size: 0 };
      }
      
      const size = JSON.stringify(this.cache[key]).length;
      stats.byType[type].count++;
      stats.byType[type].size += size;
      stats.totalSize += size;
    });
    
    return stats;
  },
  
  /**
   * Log cache statistics (untuk debugging)
   */
  logStats() {
    const stats = this.getStats();
    console.log('[SMART_CACHE] Cache Statistics:', {
      totalEntries: stats.totalEntries,
      totalSize: (stats.totalSize / 1024).toFixed(2) + ' KB',
      byType: stats.byType
    });
  }
};

// ===== ENHANCED API CALL WITH SMART CACHING =====

/**
 * API call dengan smart caching
 * Otomatis cache untuk read operations
 * Otomatis invalidate cache untuk write operations
 */
async function apiCallWithCache(action, data = {}) {
  // Define cacheable actions dan type-nya
  const cacheableActions = {
    'getBudgets': 'BUDGETS',
    'getRPDs': 'RPDS',
    'getRealisasis': 'REALISASIS',
    'getDashboardStats': 'DASHBOARD_STATS',
    'getRPDConfig': 'CONFIG'
  };
  
  const cacheType = cacheableActions[action];
  
  // ✅ Try to get from cache first (untuk read operations)
  if (cacheType) {
    const cached = SmartCacheManager.get(cacheType, data);
    if (cached) {
      if (CACHE_CONFIG_ENHANCED.DEBUG) {
        console.log(`[API] Using cached data for ${action}`);
      }
      return cached;
    }
  }
  
  // ✅ If not in cache or write operation, call API
  showLoading();
  
  try {
    const payload = { 
      action: action,
      ...data
    };
    
    if (CACHE_CONFIG_ENHANCED.DEBUG) {
      console.log(`[API] Calling ${action}`, data);
    }
    
    const response = await fetch(APP_CONFIG.SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    hideLoading();
    
    if (result.success) {
      // ✅ Cache the result if applicable
      if (cacheType) {
        SmartCacheManager.set(cacheType, data, result.data);
      }
      
      // ✅ Invalidate related caches on write operations
      if (!cacheType) {
        SmartCacheManager.invalidateOnWrite(action, data);
      }
      
      // ✅ Update local lastUpdatedAt untuk optimistic locking
      if (result.data && result.data.updatedAt) {
        if (CACHE_CONFIG_ENHANCED.DEBUG) {
          console.log(`[API] Updated timestamp: ${result.data.updatedAt}`);
        }
      }
      
      return result.data;
    } else {
      throw new Error(result.message || 'Terjadi kesalahan');
    }
  } catch (error) {
    hideLoading();
    console.error('[API ERROR]', error);
    showNotification(error.message, 'error');
    throw error;
  }
}

// ===== AUTO-REFRESH MECHANISM (OPTIONAL) =====

let autoRefreshInterval = null;

/**
 * Start auto-refresh untuk page tertentu
 * @param {Function} refreshCallback - Function to call on refresh
 */
function startAutoRefresh(refreshCallback) {
  if (!CACHE_CONFIG_ENHANCED.AUTO_REFRESH.ENABLED) {
    console.log('[AUTO_REFRESH] Disabled in config');
    return;
  }
  
  // Stop existing interval
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
  
  autoRefreshInterval = setInterval(() => {
    console.log('[AUTO_REFRESH] Refreshing data...');
    
    // Invalidate cache dan refresh
    SmartCacheManager.clearAll();
    
    if (refreshCallback) {
      refreshCallback();
    }
  }, CACHE_CONFIG_ENHANCED.AUTO_REFRESH.INTERVAL);
  
  console.log('[AUTO_REFRESH] Started with interval:', CACHE_CONFIG_ENHANCED.AUTO_REFRESH.INTERVAL);
}

/**
 * Stop auto-refresh
 */
function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
    console.log('[AUTO_REFRESH] Stopped');
  }
}

// ===== INTEGRATION HELPER =====

/**
 * Setup cache untuk page tertentu
 * Dipanggil saat page load
 */
function setupSmartCache(options) {
  options = options || {};
  
  // Override config jika provided
  if (options.enabled !== undefined) {
    CACHE_CONFIG_ENHANCED.ENABLED = options.enabled;
  }
  
  if (options.autoRefresh !== undefined) {
    CACHE_CONFIG_ENHANCED.AUTO_REFRESH.ENABLED = options.autoRefresh;
  }
  
  if (options.debug !== undefined) {
    CACHE_CONFIG_ENHANCED.DEBUG = options.debug;
  }
  
  console.log('[SMART_CACHE] Setup complete', {
    enabled: CACHE_CONFIG_ENHANCED.ENABLED,
    autoRefresh: CACHE_CONFIG_ENHANCED.AUTO_REFRESH.ENABLED,
    debug: CACHE_CONFIG_ENHANCED.DEBUG
  });
  
  // Log initial stats
  if (CACHE_CONFIG_ENHANCED.DEBUG) {
    SmartCacheManager.logStats();
  }
}

// ===== EXPORT TO WINDOW =====

window.SmartCacheManager = SmartCacheManager;
window.CACHE_CONFIG_ENHANCED = CACHE_CONFIG_ENHANCED;
window.apiCallWithCache = apiCallWithCache;
window.startAutoRefresh = startAutoRefresh;
window.stopAutoRefresh = stopAutoRefresh;
window.setupSmartCache = setupSmartCache;

// ✅ Replace default apiCall dengan enhanced version
window.apiCall = apiCallWithCache;

console.log('[CONFIG_ENHANCED] ✓ Smart Cache Manager loaded');