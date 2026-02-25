/* ═══════════════════════════════════════════════════════════════
   BIMAS ISLAM – FRONTEND LOGIC  (v2 – patched)
   File  : script.js
   Fixes : submit btn, logging, tahun limit, datetime-local
   ═══════════════════════════════════════════════════════════════ */

// ─── LOGGER UTIL ─────────────────────────────────────────────
const LOG = {
  info  : (...a) => console.log  ('%c[BIMAS]', 'color:#16a34a;font-weight:bold', ...a),
  warn  : (...a) => console.warn ('%c[BIMAS]', 'color:#f59e0b;font-weight:bold', ...a),
  error : (...a) => console.error('%c[BIMAS]', 'color:#ef4444;font-weight:bold', ...a),
  group : (n)    => console.group('%c[BIMAS] ' + n, 'color:#0369a1;font-weight:bold'),
  end   : ()     => console.groupEnd(),
};

// ┌─────────────────────────────────────────────────────────────┐
// │  ⚙️  KONFIGURASI – Ganti URL setelah deploy Apps Script    │
// └─────────────────────────────────────────────────────────────┘
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx95sP80j2lPbCNiDN3HtkX9WkLpYqzsI_tdN8JYHwcJTCsawouXnzyYqLfxMdrTHIvRA/exec';

// ── Konstanta validasi ────────────────────────────────────────
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf','image/jpeg','image/png'];
const ALLOWED_EXT   = ['pdf','jpg','jpeg','png'];
const MIN_YEAR      = 2000;
const MAX_YEAR      = 2099;

// ── State ─────────────────────────────────────────────────────
let validFiles = [];

// ═══════════════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  LOG.group('DOMContentLoaded – init');
  try { setCurrentYear();    LOG.info('✓ setCurrentYear'); }    catch(e){ LOG.error('✗ setCurrentYear', e); }
  try { initDatetimeField(); LOG.info('✓ initDatetimeField'); } catch(e){ LOG.error('✗ initDatetimeField', e); }
  try { initUploadArea();    LOG.info('✓ initUploadArea'); }    catch(e){ LOG.error('✗ initUploadArea', e); }
  try { initRupiahInput();   LOG.info('✓ initRupiahInput'); }   catch(e){ LOG.error('✗ initRupiahInput', e); }
  try { initSubmitButton();  LOG.info('✓ initSubmitButton'); }  catch(e){ LOG.error('✗ initSubmitButton', e); }

  const resetBtn = document.getElementById('btnReset');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => { LOG.info('Reset diklik'); resetAll(); });
    LOG.info('✓ btnReset listener');
  } else {
    LOG.error('✗ btnReset tidak ditemukan');
  }
  LOG.end();
});

// ═══════════════════════════════════════════════════════════════
// TAHUN BERJALAN
// ═══════════════════════════════════════════════════════════════
function setCurrentYear() {
  const y = new Date().getFullYear();
  const el = document.getElementById('currentYear');
  const fy = document.getElementById('footerYear');
  if (el) el.textContent = y;
  if (fy) fy.textContent = y;
  LOG.info('Tahun saat ini:', y);
}

// ═══════════════════════════════════════════════════════════════
// DATETIME-LOCAL – batasi tahun 4 digit (MIN_YEAR – MAX_YEAR)
// ═══════════════════════════════════════════════════════════════
function initDatetimeField() {
  const el = document.getElementById('tanggalKegiatan');
  if (!el) { LOG.warn('Field tanggalKegiatan tidak ditemukan'); return; }

  if (!el.getAttribute('min')) el.setAttribute('min', MIN_YEAR + '-01-01T00:00');
  if (!el.getAttribute('max')) el.setAttribute('max', MAX_YEAR + '-12-31T23:59');

  el.addEventListener('change', () => {
    LOG.info('tanggalKegiatan berubah:', el.value);
    validateTanggal(el);
  });
  el.addEventListener('blur', () => validateTanggal(el));

  LOG.info('datetime-local min:', el.min, '| max:', el.max);
}

function validateTanggal(el) {
  const errEl = document.getElementById('tanggalError') || el.nextElementSibling;
  if (!el.value) {
    setFieldError(el, errEl, 'Tanggal & jam wajib diisi.');
    return false;
  }
  const year = parseInt(el.value.split('-')[0], 10);
  LOG.info('Validasi tahun:', year);
  if (isNaN(year) || year < MIN_YEAR || year > MAX_YEAR) {
    setFieldError(el, errEl, 'Tahun harus antara ' + MIN_YEAR + '-' + MAX_YEAR + '.');
    return false;
  }
  clearFieldError(el, errEl);
  return true;
}

// ═══════════════════════════════════════════════════════════════
// UPLOAD AREA
// ═══════════════════════════════════════════════════════════════
function initUploadArea() {
  const area  = document.getElementById('uploadArea');
  const input = document.getElementById('dokumen');
  if (!area || !input) { LOG.error('uploadArea atau input#dokumen tidak ditemukan'); return; }

  area.addEventListener('dragover', (e) => { e.preventDefault(); area.classList.add('drag-over'); });
  area.addEventListener('dragleave', () => area.classList.remove('drag-over'));
  area.addEventListener('drop', (e) => {
    e.preventDefault();
    area.classList.remove('drag-over');
    LOG.info('drop – jumlah file:', e.dataTransfer.files.length);
    handleFiles(e.dataTransfer.files);
  });

  input.addEventListener('change', () => {
    LOG.info('file picker – jumlah file:', input.files.length);
    handleFiles(input.files);
    input.value = '';
  });
}

function handleFiles(files) {
  LOG.group('handleFiles – ' + files.length + ' file(s)');
  const list = document.getElementById('fileList');

  Array.from(files).forEach((file) => {
    const ext = file.name.split('.').pop().toLowerCase();
    let errMsg = '';
    LOG.info('→', file.name, '|', file.type, '|', formatBytes(file.size));

    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.includes(ext)) {
      errMsg = 'Tipe file tidak didukung (hanya PDF/JPG/PNG).';
      LOG.warn('Tipe ditolak:', file.type);
    } else if (file.size > MAX_FILE_SIZE) {
      errMsg = 'Ukuran melebihi 5 MB (' + formatBytes(file.size) + ').';
      LOG.warn('Ukuran melebihi batas');
    }

    const id = 'file-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    if (!errMsg) {
      validFiles.push({ id, file });
      LOG.info('File valid, id:', id, '| Total valid:', validFiles.length);
    }

    if (list) list.appendChild(buildFileItem(id, file, ext, errMsg));
  });

  const fileErr = document.getElementById('fileError');
  if (fileErr && validFiles.length > 0) fileErr.classList.remove('show');
  LOG.end();
}

function buildFileItem(id, file, ext, errMsg) {
  const li = document.createElement('li');
  li.className = 'file-item' + (errMsg ? ' error-file' : '');
  li.dataset.id = id;

  const iconClass = ext === 'pdf' ? 'pdf' : ['jpg','jpeg','png'].includes(ext) ? 'img' : 'other';
  const iconName  = ext === 'pdf' ? 'bi-file-earmark-pdf-fill'
                  : ['jpg','jpeg','png'].includes(ext) ? 'bi-file-earmark-image-fill'
                  : 'bi-file-earmark-fill';

  li.innerHTML =
    '<i class="bi ' + iconName + ' file-icon ' + iconClass + '"></i>' +
    '<div class="file-info">' +
      '<div class="file-name">' + escapeHtml(file.name) + '</div>' +
      (errMsg
        ? '<div class="file-error-msg"><i class="bi bi-exclamation-circle"></i> ' + errMsg + '</div>'
        : '<div class="file-size">' + formatBytes(file.size) + '</div>'
      ) +
    '</div>' +
    '<button type="button" class="file-remove" title="Hapus" onclick="removeFile(\'' + id + '\')">' +
      '<i class="bi bi-x-lg"></i>' +
    '</button>';
  return li;
}

function removeFile(id) {
  const before = validFiles.length;
  validFiles = validFiles.filter((f) => f.id !== id);
  LOG.info('removeFile:', id, '|', before, '->', validFiles.length);
  const item = document.querySelector('[data-id="' + id + '"]');
  if (item) {
    item.style.opacity = '0';
    item.style.transform = 'translateX(10px)';
    item.style.transition = 'all .2s ease';
    setTimeout(() => item.remove(), 200);
  }
}

// ═══════════════════════════════════════════════════════════════
// FORMAT RUPIAH
// ═══════════════════════════════════════════════════════════════
function initRupiahInput() {
  const input = document.getElementById('nominal');
  if (!input) { LOG.error('Input#nominal tidak ditemukan'); return; }
  input.addEventListener('input', (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    e.target.value = raw ? parseInt(raw, 10).toLocaleString('id-ID') : '';
    LOG.info('Nominal raw:', raw);
  });
}

function getNominalRaw() {
  const val = document.getElementById('nominal').value.replace(/\./g, '').trim();
  return val;
}

// ═══════════════════════════════════════════════════════════════
// VALIDASI FORM
// ═══════════════════════════════════════════════════════════════
function validateForm() {
  LOG.group('validateForm');
  let valid = true;

  const fields = [
    { id: 'namaKegiatan',    msg: 'Nama kegiatan wajib diisi.' },
    { id: 'lokasi',          msg: 'Lokasi wajib diisi.' },
    { id: 'penanggungjawab', msg: 'Penanggung jawab wajib diisi.' },
    { id: 'sumberDana',      msg: 'Sumber dana wajib dipilih.' },
    { id: 'keterangan',      msg: 'Keterangan wajib diisi.' },
  ];

  fields.forEach(function(f) {
    const el  = document.getElementById(f.id);
    const err = el ? el.nextElementSibling : null;
    if (!el) { LOG.error('Field tidak ditemukan:', f.id); valid = false; return; }
    if (!el.value.trim()) {
      setFieldError(el, err, f.msg);
      LOG.warn('Kosong:', f.id);
      valid = false;
    } else {
      clearFieldError(el, err);
      LOG.info('OK:', f.id);
    }
  });

  // Tanggal & Jam
  const tglEl = document.getElementById('tanggalKegiatan');
  if (!tglEl) {
    LOG.error('Field tanggalKegiatan tidak ditemukan');
    valid = false;
  } else if (!validateTanggal(tglEl)) {
    LOG.warn('Validasi tanggal GAGAL');
    valid = false;
  } else {
    LOG.info('Tanggal OK:', tglEl.value);
  }

  // Nominal
  const nomEl  = document.getElementById('nominal');
  const nomErr = nomEl ? nomEl.closest('.field-group').querySelector('.invalid-feedback') : null;
  const nomRaw = getNominalRaw();
  if (!nomRaw || isNaN(Number(nomRaw)) || Number(nomRaw) < 0) {
    setFieldError(nomEl, nomErr, 'Nominal anggaran wajib diisi (angka).');
    LOG.warn('Nominal tidak valid:', nomRaw);
    valid = false;
  } else {
    clearFieldError(nomEl, nomErr);
    LOG.info('Nominal OK:', nomRaw);
  }

  // File
  const fileErr = document.getElementById('fileError');
  if (validFiles.length === 0) {
    if (fileErr) { fileErr.textContent = 'Minimal satu dokumen wajib diunggah.'; fileErr.classList.add('show'); }
    LOG.warn('Tidak ada file valid');
    valid = false;
  } else {
    if (fileErr) fileErr.classList.remove('show');
    LOG.info('File valid:', validFiles.length);
  }

  LOG.info('Hasil validateForm():', valid);
  LOG.end();
  return valid;
}

// ═══════════════════════════════════════════════════════════════
// SUBMIT – direct click handler (lebih reliable dari form submit)
// ═══════════════════════════════════════════════════════════════
function initSubmitButton() {
  const btn = document.getElementById('btnSubmit');
  if (!btn) { LOG.error('btnSubmit tidak ditemukan!'); return; }

  btn.addEventListener('click', async function(e) {
    e.preventDefault();
    LOG.group('btnSubmit KLIK');

    if (!validateForm()) {
      LOG.warn('Validasi gagal, submit dibatalkan');
      LOG.end();
      return;
    }

    setLoadingState(true);

    try {
      // 1. Encode file ke base64
      LOG.info('Encoding', validFiles.length, 'file ke base64…');
      const filesData = await Promise.all(
        validFiles.map(async function(item) {
          LOG.info('  Encoding:', item.file.name);
          return {
            name  : item.file.name,
            type  : item.file.type,
            base64: await fileToBase64(item.file),
          };
        })
      );
      LOG.info('Semua file ter-encode');

      // 2. Bangun payload
      const rawDatetime = document.getElementById('tanggalKegiatan').value;
      const parts = rawDatetime.split('T');
      const payload = {
        namaKegiatan    : document.getElementById('namaKegiatan').value.trim(),
        tanggalKegiatan : parts[0] || '',
        jamKegiatan     : parts[1] || '00:00',
        tanggalJam      : rawDatetime,
        lokasi          : document.getElementById('lokasi').value.trim(),
        penanggungjawab : document.getElementById('penanggungjawab').value.trim(),
        sumberDana      : document.getElementById('sumberDana').value,
        nominal         : getNominalRaw(),
        keterangan      : document.getElementById('keterangan').value.trim(),
        files           : filesData,
      };

      LOG.info('Payload:', {
        namaKegiatan    : payload.namaKegiatan,
        tanggalJam      : payload.tanggalJam,
        lokasi          : payload.lokasi,
        penanggungjawab : payload.penanggungjawab,
        sumberDana      : payload.sumberDana,
        nominal         : payload.nominal,
        fileCount       : payload.files.length,
      });

      // 3. Cek URL masih placeholder
      if (APPS_SCRIPT_URL.indexOf('GANTI_DENGAN') !== -1) {
        LOG.warn('URL Apps Script masih placeholder!');
        showToast('error', 'URL Apps Script belum dikonfigurasi. Isi APPS_SCRIPT_URL di script.js.');
        return;
      }

      // 4. Fetch ke Apps Script
      // ================================================================
      // FIX CORS: Hapus header 'Content-Type: application/json'
      // Header tersebut memicu CORS preflight (OPTIONS) yang diblokir GAS.
      // Tanpa header → request jadi "simple request" → tidak ada preflight.
      // Apps Script tetap baca body via e.postData.contents seperti biasa.
      // ================================================================
      LOG.info('Mengirim POST ke Apps Script (no-preflight fix)...');

      var fetchRes;
      try {
        fetchRes = await fetch(APPS_SCRIPT_URL, {
          method  : 'POST',
          body    : JSON.stringify(payload),
          redirect: 'follow',
          // JANGAN tambahkan headers Content-Type: application/json di sini
        });
      } catch (networkErr) {
        LOG.error('Network error:', networkErr.message);
        throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      }

      LOG.info('Response HTTP status:', fetchRes.status, '| type:', fetchRes.type);

      // Jika response opaque (mode no-cors aktif), data tetap terkirim
      if (fetchRes.type === 'opaque') {
        LOG.warn('Response opaque - data terkirim tapi status tidak bisa dibaca');
        showToast('success', 'Data terkirim. Cek Spreadsheet untuk konfirmasi.');
        resetAll();
        return;
      }

      if (!fetchRes.ok) {
        LOG.error('HTTP error:', fetchRes.status, fetchRes.statusText);
        throw new Error('Server error: HTTP ' + fetchRes.status);
      }

      const text = await fetchRes.text();
      LOG.info('Response raw (150 char):', text.slice(0, 150));

      var data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        LOG.error('JSON parse gagal:', parseErr.message, '| raw:', text.slice(0, 300));
        throw new Error('Response server bukan JSON valid. Cek Execution Log di Apps Script Editor.');
      }

      LOG.info('Response JSON:', data);

      if (data.status === 'success') {
        LOG.info('Submit BERHASIL');
        showToast('success', data.message || 'Data kegiatan berhasil disimpan!');
        resetAll();
      } else {
        LOG.warn('Server mengembalikan error:', data.message);
        showToast('error', data.message || 'Gagal menyimpan data. Coba lagi.');
      }

    } catch (err) {
      LOG.error('Catch error:', err.name, '-', err.message);
      showToast('error', 'Gagal: ' + err.message);
    } finally {
      setLoadingState(false);
      LOG.end();
    }
  });

  LOG.info('Click handler terpasang pada btnSubmit');
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function fileToBase64(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function() {
      var b64 = reader.result.split(',')[1];
      LOG.info('  base64 OK:', file.name, b64.length + ' chars');
      resolve(b64);
    };
    reader.onerror = function(e) {
      LOG.error('FileReader error:', file.name, e);
      reject(new Error('Gagal membaca file: ' + file.name));
    };
    reader.readAsDataURL(file);
  });
}

function setLoadingState(loading) {
  var btn  = document.getElementById('btnSubmit');
  if (!btn) return;
  var text = btn.querySelector('.btn-submit-text');
  var spin = btn.querySelector('.btn-loading');
  btn.disabled = loading;
  if (text) text.classList.toggle('d-none', loading);
  if (spin) spin.classList.toggle('d-none', !loading);
  LOG.info('loadingState:', loading);
}

function setFieldError(el, errEl, msg) {
  if (el) el.classList.add('is-invalid');
  if (errEl) { errEl.textContent = msg; errEl.classList.add('show'); }
}

function clearFieldError(el, errEl) {
  if (el) el.classList.remove('is-invalid');
  if (errEl) errEl.classList.remove('show');
}

function formatBytes(bytes) {
  if (bytes < 1024)    return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(2) + ' MB';
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

function resetAll() {
  LOG.info('resetAll()');
  document.getElementById('kegiatanForm').reset();
  validFiles = [];
  var list = document.getElementById('fileList');
  if (list) list.innerHTML = '';
  document.querySelectorAll('.field-input').forEach(function(el) { el.classList.remove('is-invalid'); });
  document.querySelectorAll('.invalid-feedback').forEach(function(el) { el.classList.remove('show'); });
  window.scrollTo({ top: 0, behavior: 'smooth' });
  LOG.info('Form direset');
}

function showToast(type, message) {
  LOG.info('showToast(' + type + '):', message);
  var id    = type === 'success' ? 'toastSuccess' : 'toastError';
  var msgId = type === 'success' ? 'toastMsg'     : 'toastErrMsg';
  var toast = document.getElementById(id);
  var msgEl = document.getElementById(msgId);
  if (!toast) { LOG.error('Toast tidak ditemukan:', id); return; }
  if (msgEl) msgEl.textContent = message;
  toast.classList.add('show');
  var timer = setTimeout(function() { toast.classList.remove('show'); }, 6000);
  var closeBtn = toast.querySelector('.toast-close');
  if (closeBtn) {
    closeBtn.onclick = function() { clearTimeout(timer); toast.classList.remove('show'); };
  }
}