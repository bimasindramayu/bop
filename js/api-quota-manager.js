// ===== API QUOTA MANAGER =====
// File: api-quota-manager.js
//
// Load this file AFTER config-enhanced.js so window.apiCall is already set.
// Add to bop-dashboard.html:
//   <script src="js/api-quota-manager.js"></script>
//
// Features:
//   • Intercepts saveRealisasi / verifyRealisasi / deleteRealisasi calls
//   • Shows a blocking English popup when the server reports quota exhausted
//   • Polls getApiQuota every 10 s while exhausted (no page refresh needed)
//   • Auto-dismisses popup and shows success notification when quota is refilled
//   • Enforces non-negative quota display at all times

(function (global) {
  'use strict';

  // ── CONSTANTS ──────────────────────────────────────────────────────
  var TRACKED_ACTIONS   = ['saveRealisasi', 'updateRealisasiStatus', 'verifyRealisasi', 'deleteRealisasi'];
  var QUOTA_MSG_MARKER  = 'API quota has been exhausted'; // must match server message
  var POLL_INTERVAL_MS  = 10000;   // 10 seconds
  var POPUP_ID          = 'apiQuotaExhaustedOverlay';

  // ── STATE ───────────────────────────────────────────────────────────
  var _exhausted   = false;
  var _pollTimer   = null;
  var _tickTimer   = null;   // 1-second display updater
  var _lastChecked = null;

  // ── POPUP ────────────────────────────────────────────────────────────
  var CSS = [
    '<style id="aqStyle">',
    '@keyframes aqFadeIn{from{opacity:0}to{opacity:1}}',
    '@keyframes aqSlideUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}',
    '@keyframes aqSpin{to{transform:rotate(360deg)}}',
    '@keyframes aqPulse{0%,100%{opacity:1}50%{opacity:.4}}',
    '#' + POPUP_ID + '{',
      'position:fixed;inset:0;background:rgba(0,0,0,.68);',
      'display:flex;align-items:center;justify-content:center;',
      'z-index:99999;animation:aqFadeIn .25s ease-out;',
    '}',
    '#' + POPUP_ID + ' .aq-card{',
      'background:#fff;border-radius:20px;padding:40px 36px 32px;',
      'max-width:440px;width:92%;text-align:center;',
      'box-shadow:0 28px 72px rgba(0,0,0,.32);',
      'animation:aqSlideUp .3s ease-out;',
    '}',
    '#' + POPUP_ID + ' .aq-icon{font-size:62px;margin-bottom:14px;line-height:1}',
    '#' + POPUP_ID + ' .aq-title{',
      'font-size:21px;font-weight:800;color:#dc3545;margin-bottom:10px;',
      'font-family:"Segoe UI",Tahoma,sans-serif',
    '}',
    '#' + POPUP_ID + ' .aq-msg{',
      'font-size:14px;color:#555;line-height:1.7;margin-bottom:22px;',
      'font-family:"Segoe UI",Tahoma,sans-serif',
    '}',
    '#' + POPUP_ID + ' .aq-badge{',
      'display:inline-block;background:#fff5f5;',
      'border:2px solid #f5c6cb;border-radius:12px;',
      'padding:12px 28px;margin-bottom:22px;',
      'font-size:28px;font-weight:800;color:#dc3545;',
      'letter-spacing:1px;',
    '}',
    '#' + POPUP_ID + ' .aq-badge small{',
      'display:block;font-size:11px;font-weight:600;',
      'color:#999;letter-spacing:.5px;margin-top:2px',
    '}',
    '#' + POPUP_ID + ' .aq-polling{',
      'display:flex;align-items:center;justify-content:center;',
      'gap:9px;font-size:13px;color:#777;margin-bottom:6px;',
    '}',
    '#' + POPUP_ID + ' .aq-spinner{',
      'width:16px;height:16px;flex-shrink:0;',
      'border:2.5px solid #e0e0e0;border-top-color:#667eea;',
      'border-radius:50%;animation:aqSpin .8s linear infinite',
    '}',
    '#' + POPUP_ID + ' .aq-dot{animation:aqPulse 1.4s ease-in-out infinite}',
    '#' + POPUP_ID + ' .aq-dot:nth-child(2){animation-delay:.2s}',
    '#' + POPUP_ID + ' .aq-dot:nth-child(3){animation-delay:.4s}',
    '#' + POPUP_ID + ' .aq-last{font-size:11.5px;color:#bbb;margin-top:4px}',
    '#' + POPUP_ID + ' .aq-hint{',
      'margin-top:18px;font-size:11.5px;color:#aaa;',
      'border-top:1px solid #f0f0f0;padding-top:14px;',
    '}',
    '</style>'
  ].join('');

  function createPopup() {
    if (document.getElementById(POPUP_ID)) return;

    var div = document.createElement('div');
    div.id  = POPUP_ID;
    div.innerHTML = CSS + [
      '<div class="aq-card">',
        '<div class="aq-icon">🚫</div>',
        '<div class="aq-title">Your current API request quota has been exhausted</div>',
        '<div class="aq-msg">',
          'Additional API credits are required to continue using this service.<br>',
          'Please contact the administrator to activate a new quota package<br>',
          'or upgrade the current API <strong>subscription</strong> plan.',
        '</div>',
        '<div class="aq-badge">',
          '<span id="aqQuotaNum">0</span>',
          '<small>REMAINING QUOTA</small>',
        '</div>',
        '<div class="aq-polling">',
          '<div class="aq-spinner"></div>',
          'Checking for quota updates',
          '<span class="aq-dot">.</span>',
          '<span class="aq-dot">.</span>',
          '<span class="aq-dot">.</span>',
        '</div>',
        '<div class="aq-last" id="aqLastCheck"></div>',
        '<div class="aq-hint">',
          'This dialog will close automatically once the quota is refilled.',
        '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(div);
    _updateLastChecked();
  }

  function destroyPopup() {
    var el = document.getElementById(POPUP_ID);
    if (!el) return;
    el.style.transition = 'opacity .22s ease-out';
    el.style.opacity    = '0';
    setTimeout(function () {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }, 240);
  }

  function _setQuotaDisplay(n) {
    var el = document.getElementById('aqQuotaNum');
    if (el) el.textContent = Math.max(0, n); // never show negative
  }

  function _updateLastChecked() {
    var el = document.getElementById('aqLastCheck');
    if (!el || !_lastChecked) return;
    var sec = Math.round((Date.now() - _lastChecked) / 1000);
    el.textContent = sec <= 1 ? 'Last checked: just now'
                               : 'Last checked: ' + sec + ' second' + (sec === 1 ? '' : 's') + ' ago';
  }

  // ── POLLING ──────────────────────────────────────────────────────────
  function startPolling() {
    if (_pollTimer) return;
    console.log('[QUOTA_MANAGER] Polling started (' + (POLL_INTERVAL_MS / 1000) + 's interval)');
    _doPoll(); // immediate first check
    _pollTimer = setInterval(_doPoll, POLL_INTERVAL_MS);
    // Tick every second to update "Last checked" counter
    _tickTimer = setInterval(_updateLastChecked, 1000);
  }

  function stopPolling() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
    if (_tickTimer) { clearInterval(_tickTimer); _tickTimer = null; }
    console.log('[QUOTA_MANAGER] Polling stopped');
  }

  async function _doPoll() {
    try {
      _lastChecked = Date.now();
      _updateLastChecked();

      // Direct fetch — bypass SmartCacheManager so we always get live data
      var response = await fetch(APP_CONFIG.SCRIPT_URL, {
        method: 'POST',
        body:   JSON.stringify({ action: 'getApiQuota' })
      });

      if (!response.ok) throw new Error('HTTP ' + response.status);

      var result = await response.json();
      var quota  = 0;

      if (result && result.success && result.data) {
        quota = typeof result.data.quota === 'number' ? result.data.quota : 0;
        quota = Math.max(0, quota); // never negative
      }

      console.log('[QUOTA_MANAGER] Poll result: quota=' + quota);
      _setQuotaDisplay(quota);

      if (quota > 0 && _exhausted) {
        // Quota has been refilled — resume
        _exhausted = false;
        stopPolling();
        destroyPopup();
        if (typeof showNotification === 'function') {
          showNotification(
            '✅ API quota refilled (' + quota + ' call' + (quota === 1 ? '' : 's') + ' remaining). You may proceed.',
            'success'
          );
        }
        console.log('[QUOTA_MANAGER] ✓ Quota restored — popup dismissed');
      }

    } catch (err) {
      console.warn('[QUOTA_MANAGER] Poll error:', err.message || err);
    }

    _updateLastChecked();
  }

  // ── QUOTA EXHAUSTED ENTRY POINT ───────────────────────────────────
  function _onQuotaExhausted() {
    if (_exhausted) return; // popup already showing
    _exhausted = true;
    console.log('[QUOTA_MANAGER] Quota exhausted — showing popup');
    createPopup();
    startPolling();
  }

  // ── INTERCEPT window.apiCall ──────────────────────────────────────
  // We wrap window.apiCall (already set by config-enhanced.js) so that
  // quota-exhausted responses are silently converted into popup triggers
  // instead of showing a red notification toast.
  function _installInterceptor() {
    var _original = window.apiCall;

    if (typeof _original !== 'function') {
      // config-enhanced.js not yet loaded — retry after a tick
      setTimeout(_installInterceptor, 50);
      return;
    }

    window.apiCall = async function (action, data) {
      try {
        var result = await _original.call(this, action, data);

        // Server attached remaining quota on success — keep UI in sync
        if (result && typeof result._remainingQuota === 'number') {
          var rq = Math.max(0, result._remainingQuota);
          if (rq === 0 && TRACKED_ACTIONS.indexOf(action) !== -1) {
            // Next call will fail — preemptively start polling (no popup yet)
            console.log('[QUOTA_MANAGER] ⚠ Quota just hit 0 after "' + action + '"');
          }
        }

        return result;

      } catch (err) {
        // Detect quota error by message text (matches QUOTA_MSG_MARKER)
        if (err && err.message && err.message.indexOf(QUOTA_MSG_MARKER) !== -1) {
          _onQuotaExhausted();
          // Throw a silent sentinel so callers know to abort without their own toast
          var silent    = new Error('__QUOTA_EXHAUSTED__');
          silent.silent = true;
          throw silent;
        }
        throw err;
      }
    };

    // Also intercept showNotification to suppress the quota error toast that
    // config-enhanced.js emits before re-throwing (it calls showNotification
    // in its catch block). Without this the red toast would flash for ~200ms.
    var _origNotify = window.showNotification;
    window.showNotification = function (message, type) {
      if (type === 'error' && message && message.indexOf(QUOTA_MSG_MARKER) !== -1) {
        _onQuotaExhausted();
        return; // suppress toast
      }
      if (typeof _origNotify === 'function') {
        _origNotify.call(this, message, type);
      }
    };

    console.log('[QUOTA_MANAGER] ✓ Interceptor installed on window.apiCall');
  }

  // ── INIT ─────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _installInterceptor);
  } else {
    _installInterceptor();
  }

  // ── PUBLIC API ────────────────────────────────────────────────────────
  global.ApiQuotaManager = {
    /** True while quota is 0 and the popup is visible */
    isExhausted: function () { return _exhausted; },
    /** Force an immediate quota poll (useful for testing) */
    checkNow:    _doPoll,
    /** Programmatically reset (e.g., after admin action in the same session) */
    reset:       function () {
      _exhausted = false;
      destroyPopup();
      stopPolling();
    }
  };

  console.log('[QUOTA_MANAGER] ✓ Loaded (tracking: ' + TRACKED_ACTIONS.join(', ') + ')');

}(window));