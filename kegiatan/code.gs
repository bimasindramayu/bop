// ════════════════════════════════════════════════════════════════
//  BIMAS ISLAM – BACKEND (Google Apps Script)
//  File: Code.gs
//  Fungsi: Terima POST, simpan ke Spreadsheet, upload ke Drive
// ════════════════════════════════════════════════════════════════

// ┌─────────────────────────────────────────────────────────────┐
// │  ⚙️  KONFIGURASI – Isi sesuai resource Anda                │
// └─────────────────────────────────────────────────────────────┘
const CONFIG = {
  // ID Spreadsheet (ambil dari URL: .../spreadsheets/d/SPREADSHEET_ID/...)
  SPREADSHEET_ID: '14kxu0WaKKS0XfeEwgTjbGxvlRADIlQufd0RA11mV7nk',

  // ID Folder Root di Google Drive (folder "DATA BIMAS ISLAM")
  ROOT_FOLDER_ID: '1-PVXJkjkBFh-abceOAwsFFzYe22HH09p',

  // Nama sheet tab di Spreadsheet
  SHEET_NAME: 'Data Kegiatan',
};

// ════════════════════════════════════════════════════════════════
// ENTRY POINT – Menerima POST Request dari Frontend
// ════════════════════════════════════════════════════════════════
function doPost(e) {
  // Header CORS – izinkan semua origin (atau batasi sesuai domain Anda)
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    // Parse JSON body
    const body = JSON.parse(e.postData.contents);

    // ── Validasi field wajib ──
    const required = ['namaKegiatan', 'tanggalKegiatan', 'lokasi',
                      'penanggungjawab', 'sumberDana', 'nominal', 'keterangan'];
    for (const field of required) {
      if (!body[field] || body[field].toString().trim() === '') {
        return buildResponse({ status: 'error', message: `Field '${field}' wajib diisi.` }, headers);
      }
    }

    // ── Proses upload file ke Drive ──
    const folderLink = processFiles(body);

    // ── Simpan data ke Spreadsheet ──
    saveToSheet(body, folderLink);

    return buildResponse({
      status:  'success',
      message: 'Data berhasil disimpan ke Spreadsheet dan Drive.',
      folder:  folderLink,
    }, headers);

  } catch (err) {
    Logger.log('ERROR doPost: ' + err.message);
    return buildResponse({
      status:  'error',
      message: 'Terjadi kesalahan server: ' + err.message,
    }, headers);
  }
}

// Handle preflight OPTIONS (CORS)
function doOptions(e) {
  return buildResponse({}, {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
}

// ════════════════════════════════════════════════════════════════
// DRIVE – Buat struktur folder & upload file
// ════════════════════════════════════════════════════════════════
/**
 * Buat folder: Root → Tahun → "DD-MM-YYYY - Nama Kegiatan"
 * Upload semua file ke folder kegiatan.
 * Return: URL folder kegiatan
 */
function processFiles(body) {
  const rootFolder = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);

  // Ambil tahun dari tanggal kegiatan
  const tgl   = new Date(body.tanggalKegiatan);
  const tahun = tgl.getFullYear().toString();

  // Format nama folder kegiatan: "12-03-2025 - Manasik Haji"
  const dd    = String(tgl.getDate()).padStart(2, '0');
  const mm    = String(tgl.getMonth() + 1).padStart(2, '0');
  const yyyy  = tgl.getFullYear();
  const folderName = `${dd}-${mm}-${yyyy} - ${body.namaKegiatan.trim()}`;

  // Cek / buat folder Tahun
  const yearFolder = getOrCreateFolder(rootFolder, tahun);

  // Cek / buat folder Kegiatan
  const kegiatanFolder = getOrCreateFolder(yearFolder, folderName);

  // Upload setiap file
  if (body.files && body.files.length > 0) {
    body.files.forEach((fileData) => {
      try {
        const decoded = Utilities.base64Decode(fileData.base64);
        const blob    = Utilities.newBlob(decoded, fileData.type, fileData.name);
        kegiatanFolder.createFile(blob);
        Logger.log('File uploaded: ' + fileData.name);
      } catch (err) {
        Logger.log('Upload error: ' + fileData.name + ' – ' + err.message);
      }
    });
  }

  // Return URL folder yang bisa dibagikan
  kegiatanFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return kegiatanFolder.getUrl();
}

/**
 * Cari subfolder di dalam parent, buat jika belum ada.
 */
function getOrCreateFolder(parentFolder, folderName) {
  const iter = parentFolder.getFoldersByName(folderName);
  if (iter.hasNext()) {
    return iter.next();
  }
  return parentFolder.createFolder(folderName);
}

// ════════════════════════════════════════════════════════════════
// SPREADSHEET – Tambah baris baru
// ════════════════════════════════════════════════════════════════
/**
 * Simpan data ke Sheet.
 * Kolom: Timestamp | Nama Kegiatan | Tanggal | Lokasi |
 *        Penanggung Jawab | Sumber Dana | Nominal | Keterangan | Link Folder
 */
function saveToSheet(body, folderLink) {
  const ss    = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  let   sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  // Buat sheet baru jika belum ada
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    // Tambah header
    const headers = [
      'Timestamp', 'Nama Kegiatan', 'Tanggal Kegiatan', 'Jam Kegiatan', 'Lokasi',
      'Penanggung Jawab', 'Sumber Dana', 'Nominal (Rp)', 'Keterangan', 'Link Folder Drive'
    ];
    sheet.getRange(1, 1, 1, headers.length)
         .setValues([headers])
         .setFontWeight('bold')
         .setBackground('#166534')
         .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }

  // Format tanggal untuk ditampilkan
  const tgl = new Date(body.tanggalKegiatan);
  const tanggalDisplay = Utilities.formatDate(tgl, Session.getScriptTimeZone(), 'dd/MM/yyyy');

  // Append baris baru
  sheet.appendRow([
    new Date(),                       // Timestamp (otomatis)
    body.namaKegiatan.trim(),
    tanggalDisplay,
    body.jamKegiatan || '00:00',      // Jam kegiatan
    body.lokasi.trim(),
    body.penanggungjawab.trim(),
    body.sumberDana,
    parseInt(body.nominal, 10) || 0,  // Nominal sebagai angka
    body.keterangan.trim(),
    folderLink,                       // Link Google Drive
  ]);

  // Auto-resize kolom supaya rapi
  sheet.autoResizeColumns(1, 10);
}

// ════════════════════════════════════════════════════════════════
// HELPER – Buat ContentService response JSON
// ════════════════════════════════════════════════════════════════
function buildResponse(payload, headers) {
  const output = ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ════════════════════════════════════════════════════════════════
// TEST FUNCTION – Jalankan di Apps Script Editor untuk uji coba
// ════════════════════════════════════════════════════════════════
function testScript() {
  // Simulasi data POST
  const mockData = {
    postData: {
      contents: JSON.stringify({
        namaKegiatan:    'Manasik Haji Percobaan',
        tanggalKegiatan: '2025-03-12',
        lokasi:          'Aula Kemenag',
        penanggungjawab: 'Budi Santoso',
        sumberDana:      'DIPA',
        nominal:         '5000000',
        keterangan:      'Ini adalah data uji coba.',
        files:           [], // Kosong untuk test
      }),
    },
  };

  const result = doPost(mockData);
  Logger.log(result.getContent());
}