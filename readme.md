# RESTRUCTURING PROJECT - SISTEM KEMENAG INDRAMAYU

## 📋 OVERVIEW
Project ini telah direstrukturisasi untuk memudahkan maintenance dengan memisahkan kode berdasarkan modul (Main, BOP, BMN).

## 🗂️ STRUKTUR FILE BARU

### 1. GOOGLE APPS SCRIPT (Backend)

#### A. code-main.gs
**Fungsi:** Handler utama, authentication, dan user management
**Berisi:**
- `doPost()` - Main router untuk semua request
- `handleLogin()` - Proses login
- `changePassword()` - Ubah password user
- `getUsers()`, `saveUser()`, `deleteUser()` - User management
- Helper functions (successResponse, errorResponse, getSheet, dll)

**Action yang ditangani:**
- login
- changePassword
- getUsers
- saveUser
- deleteUser

#### B. code-bop.gs (BELUM DIBUAT - AKAN MENYUSUL)
**Fungsi:** Menangani semua operasi BOP
**Berisi:**
- Budget management functions
- RPD functions
- Realisasi functions
- Export functions untuk BOP
- `handleBOPAction()` - Router untuk BOP

**Action yang ditangani:**
- getBudgets, saveBudget
- getRPDConfig, saveRPDConfig
- getRPDs, saveRPD, deleteRPD
- getRealisasis, saveRealisasi, updateRealisasiStatus
- uploadFile, getDashboardStats
- Semua export functions (exportBudget, exportRPD, dll)

#### C. code-bmn.gs (BELUM DIBUAT - AKAN MENYUSUL)
**Fungsi:** Menangani semua operasi BMN
**Berisi:**
- BMN data management functions
- BMN photo upload functions
- BMN verification functions
- BMN riwayat functions
- Export functions untuk BMN
- `handleBMNAction()` - Router untuk BMN

**Action yang ditangani:**
- getBMNStats, getBMNData
- saveBMN, uploadBMNPhoto
- getBMNVerifikasi, updateBMNVerifikasi
- getBMNRiwayat
- exportLaporanBMN

### 2. JAVASCRIPT (Frontend)

#### A. config.js (TERPUSAT)
**Fungsi:** Konfigurasi dan utility functions untuk semua modul
**Berisi:**
```javascript
APP_CONFIG = {
    SCRIPT_URL,      // URL Apps Script
    KUA_LIST,        // Daftar 30 KUA
    MONTHS,          // Nama bulan
    BOP: {...},      // Config khusus BOP
    BMN: {...},      // Config khusus BMN
    CACHE: {...}     // Cache config
}

// Utility Functions:
- showLoading(), hideLoading()
- showNotification()
- formatCurrency(), formatDate()
- togglePassword()
- apiCall() - Universal API caller
- debugLog()
- AppCache - Cache management object
- SessionManager - Session management object
- ModalManager - Modal management object
- commonLogout(), backToMenu()
```

**Keuntungan:**
✅ Satu tempat untuk semua konfigurasi
✅ Mudah update URL atau setting
✅ Reusable utility functions
✅ Konsisten di semua modul

#### B. bop-script.js (AKAN DIUPDATE)
**Fungsi:** Logic khusus BOP dashboard
**Menggunakan:** config.js untuk API calls dan utilities

#### C. bmn-script.js (AKAN DIUPDATE)
**Fungsi:** Logic khusus BMN dashboard  
**Menggunakan:** config.js untuk API calls dan utilities

### 3. CSS (Stylesheet)

#### A. main-styles.css
**Untuk:** index.html, main-menu.html
**Berisi:**
- Login page styles
- Main menu styles
- Common components (buttons, forms, notifications, modal)
- Loading spinner
- Responsive design

#### B. bop-styles.css
**Untuk:** bop-dashboard.html
**Berisi:**
```css
@import url('main-styles.css');  // Import elemen dasar

// Kemudian tambahkan:
- Dashboard layout
- Navigation menu
- Stats cards
- Tables
- RPD forms
- Summary boxes
- File upload components
```

#### C. bmn-styles.css
**Untuk:** bmn-dashboard.html
**Berisi:**
```css
@import url('main-styles.css');  // Import elemen dasar
@import url('bop-styles.css');   // Import dashboard components

// Kemudian tambahkan spesifik BMN:
- Photo gallery
- Chart containers
- Status badges
- Riwayat timeline
- Image lightbox
```

**Keuntungan Cascade Import:**
```
bmn-styles.css
    ↓ imports
bop-styles.css
    ↓ imports
main-styles.css (base)
```
- Menghindari duplikasi code
- Hierarki yang jelas
- Mudah maintain

### 4. HTML FILES

#### A. index.html
**Updates:**
```html
<link rel="stylesheet" href="style/main-styles.css">
<script src="js/config.js"></script>
```

#### B. main-menu.html (UPDATED)
**Perubahan:**
1. ✅ Ditambahkan modal ubah password
2. ✅ Ditambahkan tombol "Ubah Password"
3. ✅ Menggunakan config.js dan utilities
4. ✅ Password modal dengan validasi

**Updates:**
```html
<link rel="stylesheet" href="style/main-styles.css">
<script src="js/config.js"></script>
```

#### C. bop-dashboard.html (PERLU UPDATE)
**Yang dihapus:**
- ❌ Menu ubah password (pindah ke main-menu)

**Updates yang diperlukan:**
```html
<link rel="stylesheet" href="style/bop-styles.css">
<script src="js/config.js"></script>
<script src="js/bop-script.js"></script>
```

#### D. bmn-dashboard.html (PERLU UPDATE)
**Updates yang diperlukan:**
```html
<link rel="stylesheet" href="style/bmn-styles.css">
<script src="js/config.js"></script>
<script src="js/bmn-script.js"></script>
```

## 📂 STRUKTUR FOLDER PROJECT

```
project/
│
├── index.html                      # Login page
├── main-menu.html                  # Main menu (updated dengan password)
├── bop-dashboard.html              # BOP dashboard
├── bmn-dashboard.html              # BMN dashboard
│
├── js/
│   ├── config.js                   # ✨ TERPUSAT - Config & utilities
│   ├── bop-script.js               # BOP specific logic
│   └── bmn-script.js               # BMN specific logic
│
├── style/
│   ├── main-styles.css             # ✨ Base styles
│   ├── bop-styles.css              # ✨ BOP styles (imports main)
│   └── bmn-styles.css              # ✨ BMN styles (imports bop & main)
│
├── assets/
│   └── kemenag.png                    # Logo
│
└── Google Apps Script/
    ├── code-main.gs                # ✨ Main handler & auth
    ├── code-bop.gs                 # ✨ BOP operations (to be created)
    └── code-bmn.gs                 # ✨ BMN operations (to be created)
```

## 🔄 ALUR KERJA REQUEST

### 1. Login Flow
```
index.html 
    → config.js (apiCall)
    → code-main.gs (doPost → handleLogin)
    → return user data
    → SessionManager.setCurrentUser()
    → redirect to main-menu.html
```

### 2. Change Password Flow (BARU!)
```
main-menu.html (click Ubah Password)
    → show modal
    → submit form
    → config.js (apiCall 'changePassword')
    → code-main.gs (doPost → changePassword)
    → update password in sheet
    → logout & redirect to login
```

### 3. BOP Operations Flow
```
bop-dashboard.html
    → bop-script.js
    → config.js (apiCall 'getBudgets')
    → code-main.gs (doPost → handleBOPAction)
    → code-bop.gs (getBudgets)
    → return data
```

### 4. BMN Operations Flow
```
bmn-dashboard.html
    → bmn-script.js
    → config.js (apiCall 'getBMNData')
    → code-main.gs (doPost → handleBMNAction)
    → code-bmn.gs (getBMNData)
    → return data
```

## ✅ KEUNTUNGAN RESTRUCTURING

### 1. Maintenance
- ✅ Kode terorganisir per modul
- ✅ Mudah menemukan fungsi specific
- ✅ Isolasi bug per modul

### 2. Collaboration
- ✅ Developer bisa kerja parallel
- ✅ Conflict minimal (file terpisah)
- ✅ Clear responsibility

### 3. Scalability
- ✅ Mudah tambah modul baru
- ✅ Config terpusat
- ✅ Reusable components

### 4. Performance
- ✅ Cache management built-in
- ✅ Lazy loading possible
- ✅ Optimized CSS cascade

## 🚀 LANGKAH DEPLOYMENT

### 1. Google Apps Script
```
1. Buka Apps Script project
2. Hapus code.gs lama
3. Create 3 files baru:
   - code-main.gs (copy dari file yang dibuat)
   - code-bop.gs (extract dari code.gs lama)
   - code-bmn.gs (extract dari code.gs lama)
4. Deploy as Web App
5. Copy URL baru ke config.js
```

### 2. Frontend Files
```
1. Update structure folder:
   project/
   ├── js/
   │   └── config.js (BARU)
   └── style/
       ├── main-styles.css (BARU)
       ├── bop-styles.css (BARU)
       └── bmn-styles.css (BARU)

2. Update semua HTML files:
   - Link ke CSS yang benar
   - Load config.js terlebih dahulu
   - Update script references

3. Test flow:
   - Login
   - Main menu
   - Ubah password
   - BOP dashboard
   - BMN dashboard
```

## 📝 TODO LIST

### High Priority
- [ ] Buat code-bop.gs (extract dari code.gs lama)
- [ ] Buat code-bmn.gs (extract dari code.gs lama)
- [ ] Update bop-dashboard.html (hapus password menu, update links)
- [ ] Update bmn-dashboard.html (update links)
- [ ] Update bop-script.js (gunakan config.js)
- [ ] Update bmn-script.js (gunakan config.js)

### Medium Priority
- [ ] Test semua flows
- [ ] Validasi semua form
- [ ] Error handling improvements
- [ ] Add loading states

### Low Priority
- [ ] Add more utility functions
- [ ] Improve caching strategy
- [ ] Add analytics
- [ ] Performance optimization

## 🐛 DEBUGGING

### Common Issues

1. **Script URL tidak bekerja**
   ```javascript
   // Check di config.js
   SCRIPT_URL: 'https://script.google.com/...'
   ```

2. **CSS tidak load**
   ```html
   <!-- Pastikan path benar -->
   <link rel="stylesheet" href="style/main-styles.css">
   ```

3. **Function tidak ditemukan**
   ```html
   <!-- Pastikan config.js di-load pertama -->
   <script src="js/config.js"></script>
   <script src="js/bop-script.js"></script>
   ```

## 📞 SUPPORT

Jika ada pertanyaan atau issues:
1. Check console browser (F12)
2. Check Apps Script logs
3. Verify file paths
4. Check config.js loaded correctly

---
**Version:** 2.0
**Last Updated:** 2025
**Maintainer:** Development Team