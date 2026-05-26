// ===== ENHANCED CACHE CONFIGURATION =====
// File: config-enhanced.js

const CACHE_CONFIG_ENHANCED = {
  ENABLED: true,

  DURATION: {
    DASHBOARD_STATS: 2 * 60 * 1000,
    BUDGETS:         5 * 60 * 1000,
    RPDS:            3 * 60 * 1000,
    REALISASIS:      2 * 60 * 1000,
    VERIFIKASI:      1 * 60 * 1000,
    CONFIG:          10 * 60 * 1000,
    SUPERVISI_FILES: 5 * 60 * 1000    // ✅ cache daftar file Drive (5 menit)
  },

  AUTO_REFRESH: {
    ENABLED:  false,
    INTERVAL: 30 * 1000
  },

  INVALIDATE_ON_WRITE: true,
  DEBUG: true
};

// =====================================================================
// SMART CACHE MANAGER
// =====================================================================
const SmartCacheManager = {
  cache:      {},
  timestamps: {},

  getCacheKey(type, params) {
    const paramsStr = params ? JSON.stringify(params) : '';
    return `${type}_${paramsStr}`;
  },

  isValid(cacheKey, type) {
    if (!CACHE_CONFIG_ENHANCED.ENABLED)   return false;
    if (!this.cache[cacheKey])            return false;
    if (!this.timestamps[cacheKey])       return false;
    const duration = CACHE_CONFIG_ENHANCED.DURATION[type] || 5 * 60 * 1000;
    return (Date.now() - this.timestamps[cacheKey]) < duration;
  },

  get(type, params) {
    const cacheKey = this.getCacheKey(type, params);
    if (this.isValid(cacheKey, type)) {
      if (CACHE_CONFIG_ENHANCED.DEBUG) console.log(`[SMART_CACHE] ✓ HIT for ${type}`);
      return this.cache[cacheKey];
    }
    if (CACHE_CONFIG_ENHANCED.DEBUG) console.log(`[SMART_CACHE] ✗ MISS for ${type}`);
    return null;
  },

  set(type, params, data) {
    if (!CACHE_CONFIG_ENHANCED.ENABLED) return;
    const cacheKey = this.getCacheKey(type, params);
    this.cache[cacheKey]      = data;
    this.timestamps[cacheKey] = Date.now();
    if (CACHE_CONFIG_ENHANCED.DEBUG) {
      console.log(`[SMART_CACHE] ✓ SET for ${type}`, { key: cacheKey, size: JSON.stringify(data).length + ' bytes' });
    }
  },

  invalidate(type, params) {
    const cacheKey = this.getCacheKey(type, params);
    delete this.cache[cacheKey];
    delete this.timestamps[cacheKey];
    if (CACHE_CONFIG_ENHANCED.DEBUG) console.log(`[SMART_CACHE] ✓ INVALIDATED ${cacheKey}`);
  },

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
    if (CACHE_CONFIG_ENHANCED.DEBUG) console.log(`[SMART_CACHE] ✓ INVALIDATED ${count} entries for type: ${type}`);
  },

  clearAll() {
    const count = Object.keys(this.cache).length;
    this.cache      = {};
    this.timestamps = {};
    if (CACHE_CONFIG_ENHANCED.DEBUG) console.log(`[SMART_CACHE] ✓ CLEARED ALL (${count} entries)`);
  },

  invalidateOnWrite(operation) {
    if (!CACHE_CONFIG_ENHANCED.INVALIDATE_ON_WRITE) return;
    if (CACHE_CONFIG_ENHANCED.DEBUG) console.log(`[SMART_CACHE] Invalidating caches for operation: ${operation}`);
    switch (operation) {
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

  getStats() {
    const stats = { totalEntries: Object.keys(this.cache).length, byType: {}, totalSize: 0 };
    Object.keys(this.cache).forEach(key => {
      const type = key.split('_')[0];
      if (!stats.byType[type]) stats.byType[type] = { count: 0, size: 0 };
      const size = JSON.stringify(this.cache[key]).length;
      stats.byType[type].count++;
      stats.byType[type].size += size;
      stats.totalSize          += size;
    });
    return stats;
  },

  logStats() {
    const stats = this.getStats();
    console.log('[SMART_CACHE] Cache Statistics:', {
      totalEntries: stats.totalEntries,
      totalSize:    (stats.totalSize / 1024).toFixed(2) + ' KB',
      byType:       stats.byType
    });
  }
};

// =====================================================================
// ACTION MAPS
// =====================================================================

/**
 * Read-only actions yang hasilnya di-cache oleh SmartCacheManager.
 * getSupervisiData sengaja TIDAK di sini karena binary/besar —
 * di-handle oleh DataCache di supervisi-script.js.
 */
const CACHEABLE_ACTIONS = {
  getBudgets:        'BUDGETS',
  getRPDs:           'RPDS',
  getRealisasis:     'REALISASIS',
  getDashboardStats: 'DASHBOARD_STATS',
  getRPDConfig:      'CONFIG',
  getSupervisiFiles: 'SUPERVISI_FILES'
};

/**
 * Actions yang di-bypass sepenuhnya dari SmartCacheManager
 * (caching-nya dikelola sendiri oleh caller).
 */
const PASSTHROUGH_ACTIONS = new Set([
  'getSupervisiData'
]);

// =====================================================================
// ENHANCED API CALL
// =====================================================================
async function apiCallWithCache(action, data) {

  // Normalkan data agar selalu object (bukan undefined)
  // ✅ FIX: 'data' default ditetapkan di sini, bukan di parameter,
  //    untuk menghindari edge case saat caller tidak pass arg ke-2.
  var safeData = (data !== null && typeof data === 'object') ? data : {};

  // ── 1. Cache hit check ──────────────────────────────────────────
  var cacheType = CACHEABLE_ACTIONS[action] || null;

  if (cacheType) {
    var cached = SmartCacheManager.get(cacheType, safeData);
    if (cached !== null) {
      if (CACHE_CONFIG_ENHANCED.DEBUG) console.log('[API] Using cached data for ' + action);
      return cached;
    }
  }

  // ── 2. Bangun payload DI LUAR try ───────────────────────────────
  //    ✅ ROOT FIX: payload dulu dideklarasikan di dalam try-block
  //    sehingga jika showLoading() atau logic sebelum try gagal,
  //    `payload` tidak terdefinisi dan melempar ReferenceError.
  var payload = { action: action };
  // Spread manual agar kompatibel dengan semua environment
  Object.keys(safeData).forEach(function(k) { payload[k] = safeData[k]; });

  if (CACHE_CONFIG_ENHANCED.DEBUG) console.log('[API] Calling ' + action, safeData);

  showLoading();

  // ── 3. Fetch ────────────────────────────────────────────────────
  try {
    var response = await fetch(APP_CONFIG.SCRIPT_URL, {
      method: 'POST',
      body:   JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ': ' + response.statusText);
    }

    var result = await response.json();
    hideLoading();

    if (result.success) {
      // Cache hasil read operations
      if (cacheType) {
        SmartCacheManager.set(cacheType, safeData, result.data);
      }
      // Invalidate caches terkait pada write operations
      if (!cacheType && !PASSTHROUGH_ACTIONS.has(action)) {
        SmartCacheManager.invalidateOnWrite(action);
      }
      return result.data;

    } else {
      throw new Error(result.message || 'Terjadi kesalahan pada server');
    }

  } catch (error) {
    hideLoading();
    console.error('[API ERROR]', error);
    showNotification(error.message || 'Terjadi kesalahan jaringan', 'error');
    throw error;
  }
}

// =====================================================================
// AUTO-REFRESH
// =====================================================================
var autoRefreshInterval = null;

function startAutoRefresh(refreshCallback) {
  if (!CACHE_CONFIG_ENHANCED.AUTO_REFRESH.ENABLED) {
    console.log('[AUTO_REFRESH] Disabled in config');
    return;
  }
  if (autoRefreshInterval) clearInterval(autoRefreshInterval);
  autoRefreshInterval = setInterval(function() {
    console.log('[AUTO_REFRESH] Refreshing...');
    SmartCacheManager.clearAll();
    if (refreshCallback) refreshCallback();
  }, CACHE_CONFIG_ENHANCED.AUTO_REFRESH.INTERVAL);
  console.log('[AUTO_REFRESH] Started');
}

function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
    console.log('[AUTO_REFRESH] Stopped');
  }
}

function setupSmartCache(options) {
  options = options || {};
  if (options.enabled     !== undefined) CACHE_CONFIG_ENHANCED.ENABLED              = options.enabled;
  if (options.autoRefresh !== undefined) CACHE_CONFIG_ENHANCED.AUTO_REFRESH.ENABLED = options.autoRefresh;
  if (options.debug       !== undefined) CACHE_CONFIG_ENHANCED.DEBUG                = options.debug;
  console.log('[SMART_CACHE] Setup complete', CACHE_CONFIG_ENHANCED);
  if (CACHE_CONFIG_ENHANCED.DEBUG) SmartCacheManager.logStats();
}

// =====================================================================
// EXPORT
// =====================================================================
window.SmartCacheManager     = SmartCacheManager;
window.CACHE_CONFIG_ENHANCED = CACHE_CONFIG_ENHANCED;
window.CACHEABLE_ACTIONS     = CACHEABLE_ACTIONS;
window.apiCallWithCache      = apiCallWithCache;
window.startAutoRefresh      = startAutoRefresh;
window.stopAutoRefresh       = stopAutoRefresh;
window.setupSmartCache       = setupSmartCache;

// Override global apiCall
window.apiCall = apiCallWithCache;

console.log('[CONFIG_ENHANCED] ✓ Smart Cache Manager loaded');