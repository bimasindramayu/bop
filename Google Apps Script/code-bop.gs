// ===== GOOGLE APPS SCRIPT - BOP MODULE (COMPLETE FIXED VERSION) =====
// File: code-bop.gs
// Version: 4.0 - Complete with all fixes

// ============================================================
// COMPATIBILITY STUBS — definisikan semua alias di sini agar
// tidak ada ReferenceError apapun versi yang di-deploy user.
// ============================================================

// SS_ID → SPREADSHEET_ID alias
try {
  if (typeof SPREADSHEET_ID === 'undefined' && typeof SS_ID !== 'undefined') {
    var SPREADSHEET_ID = SS_ID;
  }
} catch(e) {}

// createSuccessResponse alias
function createSuccessResponse(data) {
  return { success: true, data: data };
}

// createErrorResponse alias (defined before errorResponse to avoid hoisting issues)
function createErrorResponse(message) {
  Logger.log('[COMPAT] createErrorResponse: ' + message);
  return { success: false, message: message };
}

// XLSX stub — menghasilkan TSV yang bisa dibuka di Excel
// (hanya aktif jika belum didefinisikan di file lain)
if (typeof XLSX === 'undefined') {
  var XLSX = {
    utils: {
      book_new: function() { return { _names: [], _sheets: {} }; },
      aoa_to_sheet: function(rows) { return { _rows: rows }; },
      book_append_sheet: function(wb, ws, name) {
        wb._names.push(name || 'Sheet1');
        wb._sheets[name || 'Sheet1'] = ws;
      },
      sheet_to_csv: function(ws) {
        return (ws._rows || []).map(function(r) {
          return r.map(function(c) { return (c == null) ? '' : String(c).replace(/\t/g,' '); }).join('\t');
        }).join('\n');
      }
    },
    write: function(wb, opts) {
      var n = wb._names[0] || 'Sheet1';
      var rows = (wb._sheets[n] || {})._rows || [];
      var tsv  = rows.map(function(r) {
        return r.map(function(c) { return (c == null) ? '' : String(c).replace(/\t/g,' '); }).join('\t');
      }).join('\n');
      return Utilities.newBlob(tsv, 'text/tab-separated-values').getBytes();
    }
  };
}

// ===== STATUS BACKWARD COMPATIBILITY =====
/**
 * Normalize status lama ke nilai baru.
 * Data lama: 'Pending', 'Menunggu', 'Menunggu Verifikasi', 'Diterima', 'Ditolak'
 * Data baru: 'Waiting', 'Approved', 'Rejected', 'Paid'
 */
function normalizeStatus(status) {
  var map = {
    'Pending':             'Waiting',
    'Menunggu':            'Waiting',
    'Menunggu Verifikasi': 'Waiting',
    'Waiting':             'Waiting',
    'Diterima':            'Approved',
    'Approved':            'Approved',
    'Ditolak':             'Rejected',
    'Rejected':            'Rejected',
    'Paid':                'Paid'
  };
  return map[status] || 'Waiting';
}

// ===== CONSTANTS =====
const DRIVE_FOLDER_ID = '11quguPvN4NvdhEZVhiE4gTCIFS9LWw_6';
const NAMA_KASI_BIMAS = 'H. ROSIDI, S.Ag., M.M';
const NIP_KASI_BIMAS = 'NIP: 19681230 199403 1 003';

const BOP_CONFIG = {
  RPD_PARAMETERS: {
    '521111': {
      name: 'Belanja Operasional Perkantoran',
      items: ['ATK Kantor', 'Jamuan Tamu', 'Pramubakti', 'Alat Rumah Tangga Kantor'],
      hasSubItems: true
    },
    '521211': {
      name: 'Belanja Bahan',
      items: ['Penggandaan / Penjilidan', 'Spanduk'],
      hasSubItems: true
    },
    '522111': {
      name: 'Belanja Langganan Listrik',
      items: ['Nominal'],
      hasSubItems: false
    },
    '522112': {
      name: 'Belanja Langganan Telepon / Internet',
      items: ['Nominal'],
      hasSubItems: false
    },
    '522113': {
      name: 'Belanja Langganan Air',
      items: ['Nominal'],
      hasSubItems: false
    },
    '523111': {
      name: 'Belanja Pemeliharaan Gedung dan Bangunan',
      items: ['Nominal'],
      hasSubItems: false
    },
    '523121': {
      name: 'Belanja Pemeliharaan Peralatan dan Mesin',
      items: ['Nominal'],
      hasSubItems: false
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

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const SHEETS = {
  BUDGET: 'Budget',
  RPD: 'RPD',
  REALISASI: 'Realisasi',
  CONFIG: 'Config',
  AUTO_PAYMENT_CONFIG: 'AutoPaymentConfig',
  AUTO_PAYMENT_NOMINAL: 'AutoPaymentNominal'
};

// ===== AUTO PAYMENT SHEET HELPER =====
function getOrCreateSheet(sheetName, headers) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      if (headers && headers.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
        Logger.log('[CREATE_SHEET] Created sheet: ' + sheetName);
      }
    }
    return sheet;
  } catch (error) {
    Logger.log('[CREATE_SHEET ERROR] ' + error.toString());
    throw error;
  }
}

// ===== HELPER FUNCTIONS =====
function getSheet(sheetName) {
  try {
    var ss;
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch(e) {
      // Fallback ke openById jika getActiveSpreadsheet gagal
      var ssId = (typeof SS_ID !== 'undefined') ? SS_ID : 
                 (typeof SPREADSHEET_ID !== 'undefined') ? SPREADSHEET_ID : null;
      if (!ssId) throw new Error('Spreadsheet ID tidak ditemukan');
      ss = SpreadsheetApp.openById(ssId);
    }
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log('[ERROR] Sheet not found: ' + sheetName);
      throw new Error('Sheet tidak ditemukan: ' + sheetName);
    }
    return sheet;
  } catch (error) {
    Logger.log('[ERROR] getSheet failed: ' + error.toString());
    throw error;
  }
}

function successResponse(data) {
  Logger.log('[SUCCESS_RESPONSE] Data type: ' + typeof data);
  return {
    success: true,
    data: data
  };
}

function errorResponse(message) {
  Logger.log('[ERROR_RESPONSE] ' + message);
  return {
    success: false,
    message: message
  };
}

function formatNumber(num) {
  if (num === 0 || num === '0') return '0';
  if (!num) return '';
  
  return Number(num).toLocaleString('id-ID');
}

function formatCurrency(num) {
  return 'Rp ' + formatNumber(num);
}

// ✅ NEW: Safe date formatting
function safeFormatDate(dateValue) {
  if (!dateValue) return '';
  try {
    const date = new Date(dateValue);
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return '';
    }
    return date.toISOString();
  } catch (error) {
    Logger.log('[SAFE_FORMAT_DATE] Error formatting date: ' + error.toString());
    return '';
  }
}

// ===== MAIN HANDLER =====
function handleBOPAction(action, data) {
  Logger.log('[BOP] Action: ' + action);
  Logger.log('[BOP] Data received: ' + JSON.stringify(data));
  
  try {
    let result;
    
    // ✅ Route ke enhanced functions untuk critical operations
    switch(action) {
      // Enhanced save operations dengan locking
      case 'saveRPD':
        result = saveRPDWithRetry(data);
        break;
        
      case 'saveRealisasi':
        result = saveRealisasiWithRetry(data);
        break;
        
      case 'verifyRealisasi':
        result = verifyRealisasiEnhanced(data);
        break;
      
      // Optimized batch operations
      case 'getRPDs':
        // Check if batch request
        if (data.kuas || data.years || data.months) {
          result = getRPDsBatch(data);
        } else {
          result = getRPDs(data);
        }
        break;
        
      case 'getDashboardStats':
        result = getDashboardStatsOptimized(data);
        break;
      
      // Keep existing operations untuk yang lain
      case 'getBudgets': 
        result = getBudgets(data);
        break;
      case 'saveBudget': 
        result = saveBudget(data);
        break;
      case 'deleteBudget': 
        result = deleteBudget(data);
        break;
      case 'deleteRPD': 
        result = deleteRPD(data);
        break;
      case 'getRealisasis': 
        result = getRealisasis(data);
        break;
      case 'deleteRealisasi': 
        result = deleteRealisasi(data);
        break;
      case 'updateRealisasiStatus':
        result = updateRealisasiStatus(data);
        break;
      case 'getRPDConfig': 
        result = getRPDConfig(data);
        break;
      case 'saveRPDConfig': 
        result = saveRPDConfig(data);
        break;
      case 'exportRPDPerYear': 
        result = exportRPDPerYear(data);
        break;
      case 'exportRPDDetailYear': 
        result = exportRPDDetailYear(data);
        break;
      case 'exportRealisasiPerYear': {
        // ===== INLINE — tidak memanggil fungsi eksternal yg bisa di-override =====
        Logger.log('[EXPORT_PER_YEAR] year=' + data.year + ' kua=' + (data.kua||'all') + ' format=' + data.format + ' mode=' + (data.apMode||'exclude'));
        try {
          var _bSheet    = getSheet(SHEETS.BUDGET);
          var _rSheet    = getSheet(SHEETS.REALISASI);
          var _bRows     = _bSheet.getDataRange().getValues();
          var _rRows     = _rSheet.getDataRange().getValues();
          var _apMode    = data.apMode || 'exclude';
          var _apLabel   = _apMode === 'include' ? 'INCLUDE AUTO PAYMENT' : 'EXCLUDE AUTO PAYMENT';
          var _apSlug    = _apMode === 'include' ? 'include_autopayment' : 'exclude_autopayment';
          var _apCfg     = {};
          var _apNom     = {};
          try {
            var _cs = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.AUTO_PAYMENT_CONFIG);
            if (_cs) { var _cr = _cs.getDataRange().getValues(); for (var _i=1;_i<_cr.length;_i++){var _ck=_cr[_i][0];if(_ck)_apCfg[_ck]={'522111':_cr[_i][1]===true||_cr[_i][1]==='TRUE','522112':_cr[_i][2]===true||_cr[_i][2]==='TRUE'};} }
            var _ns = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.AUTO_PAYMENT_NOMINAL);
            if (_ns) { var _nr = _ns.getDataRange().getValues(); for (var _j=1;_j<_nr.length;_j++){var _nk=_nr[_j][0],_nm=_nr[_j][1];if(_nk&&_nr[_j][2]==data.year){if(!_apNom[_nk])_apNom[_nk]={};_apNom[_nk][_nm]={'522111':parseFloat(_nr[_j][3])||0,'522112':parseFloat(_nr[_j][4])||0};}} }
          } catch(e) {}
          var _yb = [];
          for (var _bi=1;_bi<_bRows.length;_bi++) { if (_bRows[_bi][2]==data.year && (!data.kua||_bRows[_bi][1]===data.kua)) _yb.push({kua:_bRows[_bi][1],budget:parseFloat(_bRows[_bi][3])||0}); }
          var _res = _yb.map(function(_b) {
            var _row = {kua:_b.kua,budget:_b.budget,months:{}};
            MONTHS.forEach(function(_m){_row.months[_m]=0;});
            for (var _ri=1;_ri<_rRows.length;_ri++) {
              var _rk=_rRows[_ri][1],_rm=_rRows[_ri][2],_ry=_rRows[_ri][4],_rs=normalizeStatus(_rRows[_ri][8]);
              if (_rk!==_b.kua||_ry!=data.year||(_rs!=='Approved'&&_rs!=='Paid')) continue;
              var _kc=_apCfg[_rk]||null,_hAP=_kc&&(_kc['522111']||_kc['522112']);
              var _mt=0, _rd={};
              try{_rd=JSON.parse(_rRows[_ri][6]||'{}');}catch(e){}
              if (!_hAP||_apMode==='exclude') {
                if (!_hAP) { _mt=parseFloat(_rRows[_ri][5])||0; }
                else { Object.keys(_rd).forEach(function(_c){if(_kc[_c])return;Object.values(_rd[_c]).forEach(function(_v){_mt+=parseFloat(_v)||0;});}); }
              } else {
                var _nm2=(_apNom[_rk]&&_apNom[_rk][_rm])?_apNom[_rk][_rm]:{};
                Object.keys(_rd).forEach(function(_c){if(_kc[_c]){_mt+=parseFloat(_nm2[_c]||0);}else{Object.values(_rd[_c]).forEach(function(_v){_mt+=parseFloat(_v)||0;});}});
              }
              _row.months[_rm]+=_mt;
            }
            _row.totalRealisasi=Object.values(_row.months).reduce(function(s,v){return s+v;},0);
            _row.sisa=_b.budget-_row.totalRealisasi;
            return _row;
          });
          if (data.format==='pdf') {
            var _h='<html><head><style>body{font-family:Arial;font-size:10px;}table{width:100%;border-collapse:collapse;margin-top:20px;}th,td{border:1px solid #000;padding:5px;text-align:center;}th{background:#dc3545;color:white;}</style></head><body>';
            _h+='<h3 style="text-align:center">LAPORAN REALISASI '+_apLabel+' PER TAHUN '+data.year+'</h3>';
            if(data.kua)_h+='<p style="text-align:center">KUA: '+data.kua+'</p>';
            _h+='<table><tr><th>No</th><th>KUA</th><th>Budget</th>';
            MONTHS.forEach(function(_m){_h+='<th>'+_m+'</th>';});
            _h+='<th>Total Realisasi</th><th>Sisa</th></tr>';
            _res.forEach(function(_r,_ix){
              _h+='<tr><td>'+(_ix+1)+'</td><td>'+_r.kua+'</td><td>'+formatCurrency(_r.budget)+'</td>';
              MONTHS.forEach(function(_m){_h+='<td>'+formatCurrency(_r.months[_m])+'</td>';});
              _h+='<td>'+formatCurrency(_r.totalRealisasi)+'</td><td>'+formatCurrency(_r.sisa)+'</td></tr>';
            });
            _h+='</table></body></html>';
            var _pb=Utilities.newBlob(_h,'text/html');
            var _pd=_pb.getAs('application/pdf');
            result=successResponse({fileData:Utilities.base64Encode(_pd.getBytes()),fileName:'Laporan_Realisasi_'+_apSlug+'_'+data.year+(data.kua?'_'+data.kua:'')+'.pdf',mimeType:'application/pdf'});
          } else {
            var _t='LAPORAN REALISASI '+_apLabel+' PER TAHUN '+data.year+'\n';
            if(data.kua)_t+='KUA: '+data.kua+'\n';
            _t+='\nNo\tKUA\tBudget\t';
            MONTHS.forEach(function(_m){_t+=_m+'\t';});
            _t+='Total Realisasi\tSisa\n';
            _res.forEach(function(_r,_ix){
              _t+=(_ix+1)+'\t'+_r.kua+'\t'+_r.budget+'\t';
              MONTHS.forEach(function(_m){_t+=_r.months[_m]+'\t';});
              _t+=_r.totalRealisasi+'\t'+_r.sisa+'\n';
            });
            var _xb=Utilities.newBlob(_t,'text/tab-separated-values');
            result=successResponse({fileData:Utilities.base64Encode(_xb.getBytes()),fileName:'Laporan_Realisasi_'+_apSlug+'_'+data.year+(data.kua?'_'+data.kua:'')+'.xls',mimeType:'application/vnd.ms-excel'});
          }
        } catch(_err) { result=errorResponse('Export Realisasi Per Tahun gagal: '+_err.toString()); }
        break;
      }
      case 'exportRealisasiDetailYear': {
        // ===== INLINE — tidak memanggil fungsi eksternal yg bisa di-override =====
        Logger.log('[EXPORT_DETAIL_YEAR] year=' + data.year + ' format=' + data.format + ' mode=' + (data.apMode||'exclude'));
        try {
          var _drSheet  = getSheet(SHEETS.REALISASI);
          var _drRows   = _drSheet.getDataRange().getValues();
          var _dApMode  = data.apMode || 'exclude';
          var _dApLabel = _dApMode === 'include' ? 'INCLUDE AUTO PAYMENT' : 'EXCLUDE AUTO PAYMENT';
          var _dApSlug  = _dApMode === 'include' ? 'include_autopayment' : 'exclude_autopayment';
          var _dApCfg   = {};
          var _dApNom   = {};
          try {
            var _dcs=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.AUTO_PAYMENT_CONFIG);
            if(_dcs){var _dcr=_dcs.getDataRange().getValues();for(var _di=1;_di<_dcr.length;_di++){var _dck=_dcr[_di][0];if(_dck)_dApCfg[_dck]={'522111':_dcr[_di][1]===true||_dcr[_di][1]==='TRUE','522112':_dcr[_di][2]===true||_dcr[_di][2]==='TRUE'};}}
            var _dns=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.AUTO_PAYMENT_NOMINAL);
            if(_dns){var _dnr=_dns.getDataRange().getValues();for(var _dj=1;_dj<_dnr.length;_dj++){var _dnk=_dnr[_dj][0],_dnm=_dnr[_dj][1];if(_dnk&&_dnr[_dj][2]==data.year){if(!_dApNom[_dnk])_dApNom[_dnk]={};_dApNom[_dnk][_dnm]={'522111':parseFloat(_dnr[_dj][3])||0,'522112':parseFloat(_dnr[_dj][4])||0};}}}
          } catch(e) {}
          var _rByKUA={};
          var _kuaSet=new Set();
          for(var _dri=1;_dri<_drRows.length;_dri++){
            var _dry=_drRows[_dri][4],_drs=normalizeStatus(_drRows[_dri][8]);
            if(_dry!=data.year||(_drs!=='Approved'&&_drs!=='Paid'))continue;
            var _drk=_drRows[_dri][1],_drm=_drRows[_dri][2];
            _kuaSet.add(_drk);
            if(!_rByKUA[_drk])_rByKUA[_drk]={};
            var _drd={};try{_drd=JSON.parse(_drRows[_dri][6]||'{}');}catch(e){}
            var _dkc=_dApCfg[_drk]||null,_dhAP=_dkc&&(_dkc['522111']||_dkc['522112']);
            var _dnMon=(_dApNom[_drk]&&_dApNom[_drk][_drm])?_dApNom[_drk][_drm]:{};
            Object.keys(_drd).forEach(function(_dc){
              if(!_rByKUA[_drk][_dc])_rByKUA[_drk][_dc]={};
              var _isAP=_dhAP&&_dkc[_dc]===true;
              Object.keys(_drd[_dc]).forEach(function(_di2){
                if(!_rByKUA[_drk][_dc][_di2])_rByKUA[_drk][_dc][_di2]=0;
                var _dv=0;
                if(_isAP){if(_dApMode==='include')_dv=parseFloat(_dnMon[_dc]||0)/Math.max(1,Object.keys(_drd[_dc]).length);}
                else{_dv=parseFloat(_drd[_dc][_di2])||0;}
                _rByKUA[_drk][_dc][_di2]+=_dv;
              });
            });
          }
          var _sKUAs=Array.from(_kuaSet).sort();
          if(data.format==='pdf'){
            // PDF: multi-page, max 10 KUA per page
            var _MAX=10,_tP=Math.ceil(_sKUAs.length/_MAX)||1;
            var _ah='<html><head><style>body{font-family:Arial;font-size:8px;}table{width:100%;border-collapse:collapse;page-break-after:always;}th,td{border:1px solid #000;padding:3px;text-align:right;}th{background:#dc3545;color:white;text-align:center;}.nm{text-align:left;}</style></head><body>';
            for(var _p=0;_p<_tP;_p++){
              var _pKUAs=_sKUAs.slice(_p*_MAX,(_p+1)*_MAX);
              _ah+='<h4 style="text-align:center">LAPORAN REALISASI DETAIL '+_dApLabel+' - TAHUN '+data.year+' (Hal '+(_p+1)+'/'+_tP+')</h4>';
              _ah+='<table><tr><th>No</th><th>Kode</th><th class="nm">Uraian</th>';
              _pKUAs.forEach(function(_k){_ah+='<th>'+_k.replace('KUA ','')+'</th>';});
              _ah+='<th>JUMLAH</th></tr>';
              var _prn=0,_pgt={},_pgAll=0;
              _pKUAs.forEach(function(_k){_pgt[_k]=0;});
              Object.keys(BOP_CONFIG.RPD_PARAMETERS).forEach(function(_dc){
                var _dcf=BOP_CONFIG.RPD_PARAMETERS[_dc],_pct={},_pcAll=0;
                _pKUAs.forEach(function(_k){_pct[_k]=0;});
                _dcf.items.forEach(function(_di){_pKUAs.forEach(function(_k){var _v=(_rByKUA[_k]&&_rByKUA[_k][_dc]&&_rByKUA[_k][_dc][_di])?parseFloat(_rByKUA[_k][_dc][_di]):0;_pct[_k]+=_v;_pcAll+=_v;});});
                _prn++;
                _ah+='<tr><td>'+_prn+'</td><td>'+_dc+'</td><td class="nm"><strong>'+_dcf.name+'</strong></td>';
                _pKUAs.forEach(function(_k){if(_dcf.hasSubItems){_ah+='<td></td>';}else{_ah+='<td>'+formatCurrency(_pct[_k])+'</td>';_pgt[_k]+=_pct[_k];}});
                if(_dcf.hasSubItems){_ah+='<td></td></tr>';}else{_ah+='<td><strong>'+formatCurrency(_pcAll)+'</strong></td></tr>';_pgAll+=_pcAll;}
                if(_dcf.hasSubItems){_dcf.items.forEach(function(_di,_idx){var _pfx=String.fromCharCode(97+_idx),_iAll=0;_prn++;_ah+='<tr><td></td><td></td><td class="nm">&nbsp;&nbsp;'+_pfx+'. '+_di+'</td>';_pKUAs.forEach(function(_k){var _v=(_rByKUA[_k]&&_rByKUA[_k][_dc]&&_rByKUA[_k][_dc][_di])?parseFloat(_rByKUA[_k][_dc][_di]):0;_ah+='<td>'+formatCurrency(_v)+'</td>';_iAll+=_v;_pgt[_k]+=_v;_pgAll+=_v;});_ah+='<td>'+formatCurrency(_iAll)+'</td></tr>';});}
              });
              _ah+='<tr><td colspan="3"><strong>JUMLAH</strong></td>';
              _pKUAs.forEach(function(_k){_ah+='<td><strong>'+formatCurrency(_pgt[_k])+'</strong></td>';});
              _ah+='<td><strong>'+formatCurrency(_pgAll)+'</strong></td></tr></table>';
            }
            _ah+='</body></html>';
            var _dpb=Utilities.newBlob(_ah,'text/html'),_dpdf=_dpb.getAs('application/pdf');
            result=successResponse({fileData:Utilities.base64Encode(_dpdf.getBytes()),fileName:'Laporan_Realisasi_Detail_'+_dApSlug+'_'+data.year+'.pdf',mimeType:'application/pdf'});
          } else {
            // Excel TSV
            var _dt='LAPORAN REALISASI DETAIL '+_dApLabel+' - TAHUN '+data.year+'\nKementerian Agama Kabupaten Indramayu\n\n';
            _dt+='No\tKode\tUraian';
            _sKUAs.forEach(function(_k){_dt+='\t'+_k;});
            _dt+='\tJUMLAH\n';
            var _drn=0,_dgt={},_dgAll=0;
            _sKUAs.forEach(function(_k){_dgt[_k]=0;});
            Object.keys(BOP_CONFIG.RPD_PARAMETERS).forEach(function(_dc){
              var _dcf=BOP_CONFIG.RPD_PARAMETERS[_dc],_dct={},_dcAll=0;
              _sKUAs.forEach(function(_k){_dct[_k]=0;});
              _dcf.items.forEach(function(_di){_sKUAs.forEach(function(_k){var _v=(_rByKUA[_k]&&_rByKUA[_k][_dc]&&_rByKUA[_k][_dc][_di])?parseFloat(_rByKUA[_k][_dc][_di]):0;_dct[_k]+=_v;_dcAll+=_v;});});
              _drn++;
              _dt+=_drn+'\t'+_dc+'\t'+_dcf.name;
              _sKUAs.forEach(function(_k){if(_dcf.hasSubItems){_dt+='\t';}else{_dt+='\t'+_dct[_k];_dgt[_k]+=_dct[_k];}});
              if(_dcf.hasSubItems){_dt+='\t\n';}else{_dt+='\t'+_dcAll+'\n';_dgAll+=_dcAll;}
              if(_dcf.hasSubItems){_dcf.items.forEach(function(_di,_idx){var _pfx=String.fromCharCode(97+_idx),_iAll=0;_drn++;_dt+=_drn+'\t\t'+_pfx+'. '+_di;_sKUAs.forEach(function(_k){var _v=(_rByKUA[_k]&&_rByKUA[_k][_dc]&&_rByKUA[_k][_dc][_di])?parseFloat(_rByKUA[_k][_dc][_di]):0;_dt+='\t'+_v;_iAll+=_v;_dgt[_k]+=_v;_dgAll+=_v;});_dt+='\t'+_iAll+'\n';});}
            });
            _dt+='\t\tJUMLAH';
            _sKUAs.forEach(function(_k){_dt+='\t'+_dgt[_k];});
            _dt+='\t'+_dgAll+'\n';
            var _dxb=Utilities.newBlob(_dt,'text/tab-separated-values');
            result=successResponse({fileData:Utilities.base64Encode(_dxb.getBytes()),fileName:'Laporan_Realisasi_Detail_'+_dApSlug+'_'+data.year+'.xls',mimeType:'application/vnd.ms-excel'});
          }
        } catch(_err) { result=errorResponse('Export Realisasi Detail gagal: '+_err.toString()); }
        break;
      }
      case 'uploadFile':
        result = uploadFile(data);
        break;
      // ===== AUTO PAYMENT =====
      case 'getAutoPaymentConfig':
        result = getAutoPaymentConfig(data);
        break;
      case 'saveAutoPaymentConfig':
        result = saveAutoPaymentConfig(data);
        break;
      case 'getAutoPaymentNominal':
        result = getAutoPaymentNominal(data);
        break;
      case 'saveAutoPaymentNominal':
        result = saveAutoPaymentNominal(data);
        break;
      default:
        result = errorResponse('Unknown BOP action: ' + action);
    }
    
    Logger.log('[BOP] Result success: ' + result.success);
    return result;
    
  } catch (error) {
    Logger.log('[BOP ERROR] ' + error.toString());
    Logger.log('[BOP ERROR STACK] ' + error.stack);
    return errorResponse('BOP Error: ' + error.toString());
  }
}

// ===== BUDGET MANAGEMENT =====
function getBudgets(data) {
  Logger.log('[GET_BUDGETS] KUA: ' + data.kua + ', Year: ' + data.year);
  
  try {
    const sheet = getSheet(SHEETS.BUDGET);
    const rows = sheet.getDataRange().getValues();
    const budgets = [];
    
    Logger.log('[GET_BUDGETS] Total rows: ' + rows.length);
    
    for (let i = 1; i < rows.length; i++) {
      if ((!data.kua || rows[i][1] === data.kua) && 
          (!data.year || rows[i][2] == data.year)) {
        
        // ✅ Hitung totalRPD dan totalRealisasi dari sheet lain
        const kua = rows[i][1];
        const year = rows[i][2];
        
        const totalRPD = calculateTotalRPD(kua, year);
        const totalRealisasi = calculateTotalRealisasi(kua, year);
        const budgetTotal = parseFloat(rows[i][3]) || 0;
        
        budgets.push({
          id: rows[i][0],
          kua: kua,
          year: year,
          total: budgetTotal,          // ✅ Field utama
          budget: budgetTotal,         // ✅ Alias untuk backward compatibility
          pagu: totalRPD,              // ✅ Alias untuk totalRPD
          totalRPD: totalRPD,
          realisasi: totalRealisasi,   // ✅ Alias untuk totalRealisasi
          totalRealisasi: totalRealisasi,
          sisaBudget: budgetTotal - totalRealisasi,
          createdAt: safeFormatDate(rows[i][6]),
          updatedAt: safeFormatDate(rows[i][7])
        });
      }
    }
    
    Logger.log('[GET_BUDGETS] Found: ' + budgets.length + ' budgets');
    return successResponse(budgets);
  } catch (error) {
    Logger.log('[GET_BUDGETS ERROR] ' + error.toString());
    return errorResponse('Gagal memuat budget: ' + error.toString());
  }
}

function calculateTotalRealisasi(kua, year) {
  try {
    const sheet = getSheet(SHEETS.REALISASI);
    const rows = sheet.getDataRange().getValues();
    let total = 0;
    
    for (let i = 1; i < rows.length; i++) {
      // Hanya hitung realisasi yang sudah Approved
      if (rows[i][1] === kua && rows[i][4] == year && normalizeStatus(rows[i][8]) === 'Approved') {
        total += parseFloat(rows[i][5]) || 0;
      }
    }
    
    return total;
  } catch (error) {
    Logger.log('[CALCULATE_TOTAL_REALISASI ERROR] ' + error.toString());
    return 0;
  }
}

function calculateTotalRPD(kua, year) {
  try {
    const sheet = getSheet(SHEETS.RPD);
    const rows = sheet.getDataRange().getValues();
    let total = 0;
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === kua && rows[i][3] == year) {
        total += parseFloat(rows[i][4]) || 0;
      }
    }
    
    return total;
  } catch (error) {
    Logger.log('[CALCULATE_TOTAL_RPD ERROR] ' + error.toString());
    return 0;
  }
}

function saveBudget(data) {
  Logger.log('[SAVE_BUDGET] KUA: ' + data.kua + ', Year: ' + data.year + ', Total: ' + data.total);
  
  try {
    const sheet = getSheet(SHEETS.BUDGET);
    const rows = sheet.getDataRange().getValues();
    const now = new Date();
    
    if (data.id) {
      // Update existing
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          // ✅ Update kolom total (kolom 4, index 3)
          sheet.getRange(i + 1, 4).setValue(parseFloat(data.total) || 0);
          sheet.getRange(i + 1, 8).setValue(now);  // Updated at
          
          Logger.log('[SAVE_BUDGET] Updated budget ID: ' + data.id);
          return successResponse({ 
            message: 'Budget berhasil diupdate', 
            id: data.id 
          });
        }
      }
      Logger.log('[SAVE_BUDGET] Budget not found: ' + data.id);
      return errorResponse('Budget tidak ditemukan');
    } else {
      // Check duplicate
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1] === data.kua && rows[i][2] == data.year) {
          Logger.log('[SAVE_BUDGET] Duplicate found for: ' + data.kua + ' - ' + data.year);
          return errorResponse('Budget untuk KUA dan tahun ini sudah ada');
        }
      }
      
      // Create new
      const id = 'BUDGET-' + Utilities.getUuid();
      const newRow = [
        id,
        data.kua,
        data.year,
        parseFloat(data.total) || 0,  // ✅ Total budget
        0,  // Total RPD (akan dihitung otomatis)
        0,  // Total Realisasi (akan dihitung otomatis)
        now,  // Created at
        now   // Updated at
      ];
      
      sheet.appendRow(newRow);
      Logger.log('[SAVE_BUDGET] Created new budget: ' + id);
      
      return successResponse({ 
        message: 'Budget berhasil disimpan', 
        id: id 
      });
    }
  } catch (error) {
    Logger.log('[SAVE_BUDGET ERROR] ' + error.toString());
    return errorResponse('Gagal menyimpan budget: ' + error.toString());
  }
}

function deleteBudget(data) {
  Logger.log('[DELETE_BUDGET] ID: ' + data.id);
  
  try {
    const sheet = getSheet(SHEETS.BUDGET);
    const rows = sheet.getDataRange().getValues();
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        sheet.deleteRow(i + 1);
        Logger.log('[DELETE_BUDGET] Deleted budget ID: ' + data.id);
        return successResponse({ message: 'Budget berhasil dihapus' });
      }
    }
    
    Logger.log('[DELETE_BUDGET] Budget not found: ' + data.id);
    return errorResponse('Budget tidak ditemukan');
  } catch (error) {
    Logger.log('[DELETE_BUDGET ERROR] ' + error.toString());
    return errorResponse('Gagal menghapus budget: ' + error.toString());
  }
}

// ===== RPD MANAGEMENT =====
function getRPDs(data) {
  Logger.log('[GET_RPDS] KUA: ' + data.kua + ', Year: ' + data.year);
  
  try {
    const sheet = getSheet(SHEETS.RPD);
    const rows = sheet.getDataRange().getValues();
    const rpds = [];
    
    Logger.log('[GET_RPDS] Total rows: ' + rows.length);
    
    for (let i = 1; i < rows.length; i++) {
      if ((!data.kua || rows[i][1] === data.kua) && 
          (!data.year || rows[i][3] == data.year)) {
        
        // ✅ FIX: Parse data dengan error handling
        let rpdData = {};
        try {
          rpdData = JSON.parse(rows[i][5] || '{}');
        } catch (parseError) {
          Logger.log('[GET_RPDS] Failed to parse RPD data for row ' + (i+1) + ': ' + parseError.toString());
          rpdData = {};
        }
        
        rpds.push({
          id: rows[i][0],
          kua: rows[i][1],
          month: rows[i][2],
          year: rows[i][3],
          total: parseFloat(rows[i][4]) || 0,
          data: rpdData,  // ✅ Data sudah di-parse
          createdAt: safeFormatDate(rows[i][6]),
          updatedAt: safeFormatDate(rows[i][7]),
          userId: rows[i][8],
          username: rows[i][9]
        });
      }
    }
    
    Logger.log('[GET_RPDS] Found: ' + rpds.length + ' RPDs');
    return successResponse(rpds);
  } catch (error) {
    Logger.log('[GET_RPDS ERROR] ' + error.toString());
    return errorResponse('Gagal memuat RPD: ' + error.toString());
  }
}

function saveRPD(data) {
  Logger.log('[SAVE_RPD] KUA: ' + data.kua + ', Month: ' + data.month + ', Year: ' + data.year);
  Logger.log('[SAVE_RPD] Data received: ' + JSON.stringify(data.data));
  
  try {
    const sheet = getSheet(SHEETS.RPD);
    const rows = sheet.getDataRange().getValues();
    const now = new Date();
    
    // Check if RPD already exists (same KUA, month, year)
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === data.kua && 
          rows[i][2] === data.month && 
          rows[i][3] == data.year) {
        
        // ✅ FIX: Update dengan stringify data
        sheet.getRange(i + 1, 5).setValue(parseFloat(data.total) || 0);
        sheet.getRange(i + 1, 6).setValue(JSON.stringify(data.data));  // ✅ Stringify dengan benar
        sheet.getRange(i + 1, 8).setValue(now);
        sheet.getRange(i + 1, 9).setValue(data.userId);
        sheet.getRange(i + 1, 10).setValue(data.username);
        
        Logger.log('[SAVE_RPD] Updated RPD at row: ' + (i + 1));
        return successResponse({ 
          message: 'RPD berhasil diupdate',
          id: rows[i][0]
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
      JSON.stringify(data.data),  // ✅ Stringify dengan benar
      now,
      now,
      data.userId,
      data.username
    ];
    
    sheet.appendRow(newRow);
    Logger.log('[SAVE_RPD] Created new RPD with ID: ' + id);
    Logger.log('[SAVE_RPD] Data column value: ' + JSON.stringify(data.data));
    
    return successResponse({ 
      message: 'RPD berhasil disimpan',
      id: id
    });
    
  } catch (error) {
    Logger.log('[SAVE_RPD ERROR] ' + error.toString());
    Logger.log('[SAVE_RPD ERROR STACK] ' + error.stack);
    return errorResponse('Gagal menyimpan RPD: ' + error.toString());
  }
}

function deleteRPD(data) {
  Logger.log('[DELETE_RPD] ID: ' + data.id);
  
  try {
    const sheet = getSheet(SHEETS.RPD);
    const rows = sheet.getDataRange().getValues();
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        sheet.deleteRow(i + 1);
        Logger.log('[DELETE_RPD] Deleted RPD ID: ' + data.id);
        return successResponse({ message: 'RPD berhasil dihapus' });
      }
    }
    
    Logger.log('[DELETE_RPD] RPD not found: ' + data.id);
    return errorResponse('RPD tidak ditemukan');
  } catch (error) {
    Logger.log('[DELETE_RPD ERROR] ' + error.toString());
    return errorResponse('Gagal menghapus RPD: ' + error.toString());
  }
}

// ===== REALISASI MANAGEMENT =====
function getRealisasis(data) {
  Logger.log('[GET_REALISASIS] KUA: ' + data.kua + ', Year: ' + data.year);
  
  try {
    const sheet = getSheet(SHEETS.REALISASI);
    const rows = sheet.getDataRange().getValues();
    const realisasis = [];
    
    Logger.log('[GET_REALISASIS] Total rows: ' + rows.length);
    
    // ✅ CORRECT COLUMN READING:
    // A    B    C      D        E      F      G     H      I       J      K          L          M           N        O         P
    // ID | KUA | Bulan | RPD_ID | Tahun | Total | Data | Files | Status | Notes | CreatedAt | UpdatedAt | VerifiedAt | UserID | Username | VerifiedBy
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // Filter by KUA and Year
      if ((!data.kua || row[1] === data.kua) && 
          (!data.year || row[4] == data.year)) {
        
        // Parse Data (JSON)
        let parsedData = {};
        try {
          if (row[6] && typeof row[6] === 'string') {
            parsedData = JSON.parse(row[6]);
          }
        } catch (e) {
          Logger.log('[GET_REALISASIS] Error parsing data for row ' + i + ':', e);
        }
        
        // Parse Files (JSON)
        let parsedFiles = [];
        try {
          if (row[7] && typeof row[7] === 'string') {
            parsedFiles = JSON.parse(row[7]);
          }
        } catch (e) {
          Logger.log('[GET_REALISASIS] Error parsing files for row ' + i + ':', e);
        }
        
        realisasis.push({
          id: row[0],              // A: ID
          kua: row[1],             // B: KUA
          month: row[2],           // C: Bulan
          rpdId: row[3] || '',     // D: RPD ID ✅
          year: row[4],            // E: Tahun ✅
          total: parseFloat(row[5]) || 0,  // F: Total ✅
          data: parsedData,        // G: Data (parsed)
          files: parsedFiles,      // H: Files (parsed) ✅
          status: normalizeStatus(row[8] || 'Waiting'),  // I: Status
          notes: row[9] || '',     // J: Notes
          createdAt: safeFormatDate(row[10]),  // K: Created At
          updatedAt: safeFormatDate(row[11]),  // L: Updated At
          verifiedAt: safeFormatDate(row[12]), // M: Verified At
          userId: row[13] || '',   // N: User ID
          username: row[14] || '', // O: Username
          verifiedBy: row[15] || '' // P: Verified By
        });
      }
    }
    
    Logger.log('[GET_REALISASIS] Found: ' + realisasis.length + ' realisasis');
    return successResponse(realisasis);
    
  } catch (error) {
    Logger.log('[GET_REALISASIS ERROR] ' + error.toString());
    return errorResponse('Gagal memuat realisasi: ' + error.toString());
  }
}

function saveRealisasi(data) {
  Logger.log('[SAVE_REALISASI] ========== START ==========');
  Logger.log('[SAVE_REALISASI] Data received:', JSON.stringify(data));
  
  try {
    const realisasiSheet = getSheet(SHEETS.REALISASI);
    const rows = realisasiSheet.getDataRange().getValues();
    
    // ✅ Validate required fields
    if (!data.kua || !data.month || !data.year) {
      Logger.log('[SAVE_REALISASI ERROR] Missing required fields');
      return errorResponse('Data tidak lengkap: KUA, Bulan, dan Tahun harus diisi');
    }
    
    // ✅ Validate and prepare files
    let filesData = [];
    if (data.files) {
      if (Array.isArray(data.files)) {
        filesData = data.files;
      } else if (typeof data.files === 'string') {
        try {
          filesData = JSON.parse(data.files);
        } catch (e) {
          Logger.log('[SAVE_REALISASI] Error parsing files:', e);
          filesData = [];
        }
      }
      
      // Filter valid files only
      filesData = filesData.filter(function(file) {
        return file && file.fileName && file.fileUrl;
      });
      
      Logger.log('[SAVE_REALISASI] Valid files count:', filesData.length);
    }
    
    const now = new Date();
    const realisasiData = JSON.stringify(data.data || {});
    const filesJSON = JSON.stringify(filesData);
    
    Logger.log('[SAVE_REALISASI] Files JSON:', filesJSON);
    
    // ✅ Find existing row
    let rowIndex = -1;
    if (data.id) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.id) {
          rowIndex = i;
          Logger.log('[SAVE_REALISASI] Found existing row at:', rowIndex);
          break;
        }
      }
    }
    
    if (rowIndex === -1) {
      // ✅ CREATE NEW - CRITICAL: CORRECT COLUMN ORDER
      const newId = 'REA-' + Date.now();
      Logger.log('[SAVE_REALISASI] Creating new realisasi with ID:', newId);
      
      // ✅ CORRECT COLUMN MAPPING:
      // A    B         C       D       E       F         G     H       I        J       K           L           M           N         O          P
      // ID | KUA | Bulan | RPD_ID | Tahun | Total | Data | Files | Status | Notes | CreatedAt | UpdatedAt | VerifiedAt | UserID | Username | VerifiedBy
      
      realisasiSheet.appendRow([
        newId,                  // A: ID
        data.kua,               // B: KUA
        data.month,             // C: Bulan
        data.rpdId || '',       // D: RPD ID ✅ (NOT YEAR!)
        data.year,              // E: Tahun ✅ (NOT TOTAL!)
        data.total || 0,        // F: Total ✅
        realisasiData,          // G: Data (JSON)
        filesJSON,              // H: Files (JSON) ✅
        'Waiting',              // I: Status
        '',                     // J: Notes
        now.toISOString(),      // K: Created At
        now.toISOString(),      // L: Updated At
        '',                     // M: Verified At
        data.userId || '',      // N: User ID
        data.username || '',    // O: Username
        ''                      // P: Verified By
      ]);
      
      Logger.log('[SAVE_REALISASI] New realisasi created successfully');
      
    } else {
      // ✅ UPDATE EXISTING - CRITICAL: CORRECT COLUMN ORDER
      Logger.log('[SAVE_REALISASI] Updating existing realisasi at row:', rowIndex + 1);
      
      // Update columns (1-based index)
      realisasiSheet.getRange(rowIndex + 1, 3).setValue(data.month);      // C: Bulan
      realisasiSheet.getRange(rowIndex + 1, 4).setValue(data.rpdId || ''); // D: RPD ID
      realisasiSheet.getRange(rowIndex + 1, 5).setValue(data.year);       // E: Tahun
      realisasiSheet.getRange(rowIndex + 1, 6).setValue(data.total || 0); // F: Total
      realisasiSheet.getRange(rowIndex + 1, 7).setValue(realisasiData);   // G: Data
      realisasiSheet.getRange(rowIndex + 1, 8).setValue(filesJSON);       // H: Files
      realisasiSheet.getRange(rowIndex + 1, 12).setValue(now.toISOString()); // L: Updated At
      
      Logger.log('[SAVE_REALISASI] Realisasi updated successfully');
    }
    
    Logger.log('[SAVE_REALISASI] ========== SUCCESS ==========');
    return successResponse({ message: 'Realisasi berhasil disimpan' });
    
  } catch (error) {
    Logger.log('[SAVE_REALISASI ERROR]', error.toString());
    Logger.log('[SAVE_REALISASI ERROR STACK]', error.stack);
    return errorResponse('Gagal menyimpan realisasi: ' + error.toString());
  }
}

function updateRealisasiStatus(data) {
  Logger.log('[UPDATE_REALISASI_STATUS] ========== START ==========');
  Logger.log('[UPDATE_REALISASI_STATUS] ID: ' + data.id);
  Logger.log('[UPDATE_REALISASI_STATUS] Status: ' + data.status);
  Logger.log('[UPDATE_REALISASI_STATUS] Notes: ' + data.notes);
  Logger.log('[UPDATE_REALISASI_STATUS] Verified By: ' + data.verifiedBy);
  
  try {
    const sheet = getSheet(SHEETS.REALISASI);
    const rows = sheet.getDataRange().getValues();
    const now = new Date();
    
    Logger.log('[UPDATE_REALISASI_STATUS] Searching for ID: ' + data.id);
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        Logger.log('[UPDATE_REALISASI_STATUS] Found realisasi at row: ' + (i + 1));
        
        // Kolom sesuai struktur:
        // A=ID, B=KUA, C=Bulan, D=RPD_ID, E=Tahun, F=Total, G=Data, H=Files, 
        // I=Status, J=Notes, K=CreatedAt, L=UpdatedAt, M=VerifiedAt, N=UserID, O=Username, P=VerifiedBy
        
        sheet.getRange(i + 1, 9).setValue(data.status);           // I: Status
        sheet.getRange(i + 1, 10).setValue(data.notes || '');     // J: Notes
        sheet.getRange(i + 1, 13).setValue(now);                  // M: VerifiedAt
        sheet.getRange(i + 1, 16).setValue(data.verifiedBy || '');// P: VerifiedBy
        
        Logger.log('[UPDATE_REALISASI_STATUS] Status updated to: ' + data.status);
        
        // Update budget total realisasi jika diterima
        if (normalizeStatus(data.status) === 'Approved') {
          const kua = rows[i][1];   // B: KUA
          const year = rows[i][4];  // E: Tahun
          
          Logger.log('[UPDATE_REALISASI_STATUS] Updating budget for KUA: ' + kua + ', Year: ' + year);
          updateBudgetTotalRealisasi(kua, year);
        }
        
        Logger.log('[UPDATE_REALISASI_STATUS] ✅ SUCCESS');
        return successResponse({ message: 'Status realisasi berhasil diupdate' });
      }
    }
    
    Logger.log('[UPDATE_REALISASI_STATUS] ❌ Realisasi not found');
    return errorResponse('Realisasi tidak ditemukan');
    
  } catch (error) {
    Logger.log('[UPDATE_REALISASI_STATUS ERROR] ' + error.toString());
    Logger.log('[UPDATE_REALISASI_STATUS ERROR STACK] ' + error.stack);
    return errorResponse('Gagal update status: ' + error.toString());
  }
}

function deleteRealisasi(data) {
  Logger.log('[DELETE_REALISASI] ID: ' + data.id);
  
  try {
    const sheet = getSheet(SHEETS.REALISASI);
    const rows = sheet.getDataRange().getValues();
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        const kua = rows[i][1];
        const year = rows[i][4];
        const status = rows[i][8];
        
        sheet.deleteRow(i + 1);
        
        if (normalizeStatus(status) === 'Approved') {
          updateBudgetTotalRealisasi(kua, year);
        }
        
        Logger.log('[DELETE_REALISASI] Deleted realisasi ID: ' + data.id);
        return successResponse({ message: 'Realisasi berhasil dihapus' });
      }
    }
    
    Logger.log('[DELETE_REALISASI] Realisasi not found: ' + data.id);
    return errorResponse('Realisasi tidak ditemukan');
  } catch (error) {
    Logger.log('[DELETE_REALISASI ERROR] ' + error.toString());
    return errorResponse('Gagal menghapus realisasi: ' + error.toString());
  }
}

function verifyRealisasi(data) {
  Logger.log('[VERIFY_REALISASI] ID: ' + data.id + ', Status: ' + data.status);
  
  try {
    const sheet = getSheet(SHEETS.REALISASI);
    const rows = sheet.getDataRange().getValues();
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === data.id) {
        sheet.getRange(i + 1, 9).setValue(data.status);
        sheet.getRange(i + 1, 10).setValue(data.catatan || '');
        sheet.getRange(i + 1, 13).setValue(new Date());
        
        if (normalizeStatus(data.status) === 'Approved') {
          const kua = rows[i][1];
          const year = rows[i][4];
          updateBudgetTotalRealisasi(kua, year);
        }
        
        Logger.log('[VERIFY_REALISASI] Verified realisasi ID: ' + data.id);
        return successResponse({ message: 'Verifikasi berhasil' });
      }
    }
    
    Logger.log('[VERIFY_REALISASI] Realisasi not found: ' + data.id);
    return errorResponse('Realisasi tidak ditemukan');
  } catch (error) {
    Logger.log('[VERIFY_REALISASI ERROR] ' + error.toString());
    return errorResponse('Gagal verifikasi: ' + error.toString());
  }
}

function updateBudgetTotalRealisasi(kua, year) {
  try {
    const realisasiSheet = getSheet(SHEETS.REALISASI);
    const budgetSheet = getSheet(SHEETS.BUDGET);
    const realisasiRows = realisasiSheet.getDataRange().getValues();
    const budgetRows = budgetSheet.getDataRange().getValues();
    
    let total = 0;
    for (let i = 1; i < realisasiRows.length; i++) {
      if (realisasiRows[i][1] === kua && 
          realisasiRows[i][4] == year && 
          normalizeStatus(realisasiRows[i][8]) === 'Approved') {
        total += parseFloat(realisasiRows[i][7]) || 0;
      }
    }
    
    for (let i = 1; i < budgetRows.length; i++) {
      if (budgetRows[i][1] === kua && budgetRows[i][2] == year) {
        budgetSheet.getRange(i + 1, 6).setValue(total);
        Logger.log('[UPDATE_BUDGET_REALISASI] Updated budget for ' + kua + ' - ' + year + ': ' + total);
        break;
      }
    }
  } catch (error) {
    Logger.log('[UPDATE_BUDGET_REALISASI ERROR] ' + error.toString());
  }
}

// ===== DASHBOARD STATS =====
function getDashboardStats(data) {
  Logger.log('[GET_DASHBOARD_STATS] KUA: ' + data.kua + ', Year: ' + data.year + ', Role: ' + data.role);
  
  try {
    const year = data.year || new Date().getFullYear();
    
    if (data.role === 'Admin') {
      // ============================================================================
      // ADMIN - Statistik untuk semua KUA
      // ============================================================================
      Logger.log('[GET_DASHBOARD_STATS] Loading stats for Admin');
      
      const budgetSheet = getSheet(SHEETS.BUDGET);
      const rpdSheet = getSheet(SHEETS.RPD);
      const realisasiSheet = getSheet(SHEETS.REALISASI);
      
      const budgetRows = budgetSheet.getDataRange().getValues();
      const rpdRows = rpdSheet.getDataRange().getValues();
      const realisasiRows = realisasiSheet.getDataRange().getValues();
      
      let totalBudget = 0;
      let totalRPD = 0;
      let totalRealisasi = 0;
      let pendingCount = 0;
      
      // Hitung total budget untuk tahun ini
      Logger.log('[GET_DASHBOARD_STATS] Calculating total budget...');
      for (let i = 1; i < budgetRows.length; i++) {
        if (budgetRows[i][2] == year) {
          const budgetAmount = parseFloat(budgetRows[i][3]) || 0;
          totalBudget += budgetAmount;
          Logger.log('[GET_DASHBOARD_STATS] Budget ' + budgetRows[i][1] + ': ' + budgetAmount);
        }
      }
      
      // Hitung total RPD untuk tahun ini
      Logger.log('[GET_DASHBOARD_STATS] Calculating total RPD...');
      for (let i = 1; i < rpdRows.length; i++) {
        if (rpdRows[i][3] == year) {
          const rpdAmount = parseFloat(rpdRows[i][4]) || 0;
          totalRPD += rpdAmount;
        }
      }
      
      // Hitung total realisasi yang diterima dan count yang pending
      Logger.log('[GET_DASHBOARD_STATS] Calculating total realisasi and pending...');
      for (let i = 1; i < realisasiRows.length; i++) {
        if (realisasiRows[i][4] == year) {
          const status = realisasiRows[i][8];
          
          // Total realisasi yang sudah diterima
          if (normalizeStatus(status) === 'Approved') {
            const realisasiAmount = parseFloat(realisasiRows[i][5]) || 0;
            totalRealisasi += realisasiAmount;
          }
          
          // Count pending verifikasi
          if (normalizeStatus(status) === 'Waiting') {
            pendingCount++;
          }
        }
      }
      
      Logger.log('[GET_DASHBOARD_STATS] Admin Stats - Budget: ' + totalBudget + ', RPD: ' + totalRPD + ', Realisasi: ' + totalRealisasi + ', Pending: ' + pendingCount);
      
      return successResponse({
        budget: totalBudget,
        totalBudget: totalBudget,  // Alias
        totalRPD: totalRPD,
        pagu: totalRPD,  // Alias
        totalRealisasi: totalRealisasi,
        realisasi: totalRealisasi,  // Alias
        sisaBudget: totalBudget - totalRealisasi,
        pendingVerifikasi: pendingCount,
        menungguVerifikasi: pendingCount  // Alias
      });
      
    } else {
      // ============================================================================
      // OPERATOR - Statistik untuk KUA sendiri
      // ============================================================================
      Logger.log('[GET_DASHBOARD_STATS] Loading stats for Operator: ' + data.kua);
      
      const kua = data.kua;
      
      const budget = calculateTotalBudget(kua, year);
      const totalRPD = calculateTotalRPD(kua, year);
      const totalRealisasi = calculateTotalRealisasi(kua, year);
      
      Logger.log('[GET_DASHBOARD_STATS] Operator Stats - Budget: ' + budget + ', RPD: ' + totalRPD + ', Realisasi: ' + totalRealisasi);
      
      return successResponse({
        budget: budget,
        totalBudget: budget,  // Alias
        totalRPD: totalRPD,
        pagu: totalRPD,  // Alias
        totalRealisasi: totalRealisasi,
        realisasi: totalRealisasi,  // Alias
        sisaBudget: budget - totalRealisasi
      });
    }
  } catch (error) {
    Logger.log('[GET_DASHBOARD_STATS ERROR] ' + error.toString());
    return errorResponse('Gagal memuat statistik: ' + error.toString());
  }
}

function calculateTotalBudget(kua, year) {
  try {
    const sheet = getSheet(SHEETS.BUDGET);
    const rows = sheet.getDataRange().getValues();
    
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === kua && rows[i][2] == year) {
        const budgetAmount = parseFloat(rows[i][3]) || 0;
        Logger.log('[CALCULATE_TOTAL_BUDGET] ' + kua + ' - ' + year + ': ' + budgetAmount);
        return budgetAmount;
      }
    }
    
    Logger.log('[CALCULATE_TOTAL_BUDGET] No budget found for ' + kua + ' - ' + year);
    return 0;
  } catch (error) {
    Logger.log('[CALCULATE_TOTAL_BUDGET ERROR] ' + error.toString());
    return 0;
  }
}

// ===== CONFIG MANAGEMENT =====
function getRPDConfig(data) {
  Logger.log('[GET_RPD_CONFIG] Getting config from sheet');
  
  try {
    const configSheet = getSheet(SHEETS.CONFIG);
    const rows = configSheet.getDataRange().getValues();
    
    const config = {};
    
    // Parse config dari sheet (Skip header row)
    for (let i = 1; i < rows.length; i++) {
      const key = rows[i][0];
      const value = rows[i][1];
      
      if (key) {
        config[key] = value;
        Logger.log('[GET_RPD_CONFIG] ' + key + ' = ' + value);
      }
    }
    
    Logger.log('[GET_RPD_CONFIG] Config loaded:', JSON.stringify(config));
    return successResponse(config);
    
  } catch (error) {
    Logger.log('[GET_RPD_CONFIG ERROR] ' + error.toString());
    return errorResponse('Gagal memuat konfigurasi: ' + error.toString());
  }
}

function saveRPDConfig(data) {
  Logger.log('[SAVE_RPD_CONFIG] Updating config');
  Logger.log('[SAVE_RPD_CONFIG] Data:', JSON.stringify(data));
  
  try {
    const configSheet = getSheet(SHEETS.CONFIG);
    const rows = configSheet.getDataRange().getValues();
    
    // Update RPD_STATUS
    if (data.rpdStatus !== undefined) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === 'RPD_STATUS') {
          configSheet.getRange(i + 1, 2).setValue(data.rpdStatus);
          Logger.log('[SAVE_RPD_CONFIG] RPD_STATUS updated to: ' + data.rpdStatus);
          break;
        }
      }
    }
    
    // Update REALISASI_STATUS
    if (data.realisasiStatus !== undefined) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === 'REALISASI_STATUS') {
          configSheet.getRange(i + 1, 2).setValue(data.realisasiStatus);
          Logger.log('[SAVE_RPD_CONFIG] REALISASI_STATUS updated to: ' + data.realisasiStatus);
          break;
        }
      }
    }
    
    // Update REALISASI_MAX_FILE_SIZE
    if (data.realisasiMaxFileSize !== undefined) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === 'REALISASI_MAX_FILE_SIZE') {
          configSheet.getRange(i + 1, 2).setValue(parseInt(data.realisasiMaxFileSize));
          Logger.log('[SAVE_RPD_CONFIG] REALISASI_MAX_FILE_SIZE updated to: ' + data.realisasiMaxFileSize);
          break;
        }
      }
    }
    
    // Update REALISASI_MAX_FILES
    if (data.realisasiMaxFiles !== undefined) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === 'REALISASI_MAX_FILES') {
          configSheet.getRange(i + 1, 2).setValue(parseInt(data.realisasiMaxFiles));
          Logger.log('[SAVE_RPD_CONFIG] REALISASI_MAX_FILES updated to: ' + data.realisasiMaxFiles);
          break;
        }
      }
    }
    
    // Update LAST_UPDATED
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === 'LAST_UPDATED') {
        configSheet.getRange(i + 1, 2).setValue(new Date().toISOString());
        break;
      }
    }
    
    Logger.log('[SAVE_RPD_CONFIG] Config saved successfully');
    return successResponse({ message: 'Konfigurasi berhasil disimpan' });
    
  } catch (error) {
    Logger.log('[SAVE_RPD_CONFIG ERROR] ' + error.toString());
    return errorResponse('Gagal menyimpan konfigurasi: ' + error.toString());
  }
}

// ===== EXPORT FUNCTIONS =====

// 1. Export RPD per Year
function exportRPDPerYear(data) {
  Logger.log('[EXPORT_RPD_PER_YEAR] Format: ' + data.format + ', KUA: ' + data.kua + ', Year: ' + data.year);
  
  try {
    const budgetSheet = getSheet(SHEETS.BUDGET);
    const rpdSheet = getSheet(SHEETS.RPD);
    
    const budgets = budgetSheet.getDataRange().getValues();
    const rpds = rpdSheet.getDataRange().getValues();
    
    Logger.log('[EXPORT_RPD_PER_YEAR] Total budgets: ' + (budgets.length - 1));
    Logger.log('[EXPORT_RPD_PER_YEAR] Total RPDs: ' + (rpds.length - 1));
    
    const yearBudgets = [];
    for (let i = 1; i < budgets.length; i++) {
      if (budgets[i][2] == data.year) {
        if (!data.kua || budgets[i][1] === data.kua) {
          yearBudgets.push({
            kua: budgets[i][1],
            budget: parseFloat(budgets[i][3]) || 0
          });
        }
      }
    }
    
    Logger.log('[EXPORT_RPD_PER_YEAR] Year budgets found: ' + yearBudgets.length);
    
    const result = yearBudgets.map(b => {
      const row = {
        kua: b.kua,
        budget: b.budget,
        months: {}
      };
      
      MONTHS.forEach(month => {
        row.months[month] = 0;
      });
      
      // ✅ FIX: Kolom yang benar
      // RPD Sheet: A=ID, B=KUA, C=Bulan, D=Tahun, E=Total, F=Data
      for (let i = 1; i < rpds.length; i++) {
        if (rpds[i][1] === b.kua && rpds[i][3] == data.year) {  // B=KUA, D=Tahun
          const month = rpds[i][2];  // C: Bulan
          const total = parseFloat(rpds[i][4]) || 0;  // E: Total ✅
          
          Logger.log('[EXPORT_RPD_PER_YEAR] RPD found: ' + b.kua + ' - ' + month + ' = ' + total);
          
          row.months[month] = total;
        }
      }
      
      row.totalRPD = Object.values(row.months).reduce((sum, val) => sum + val, 0);
      row.sisa = b.budget - row.totalRPD;
      
      Logger.log('[EXPORT_RPD_PER_YEAR] Result for ' + b.kua + ': totalRPD=' + row.totalRPD + ', sisa=' + row.sisa);
      
      return row;
    });
    
    if (data.format === 'pdf') {
      return exportRPDPerYearPDF(result, data.year, data.kua);
    } else {
      return exportRPDPerYearExcel(result, data.year, data.kua);
    }
  } catch (error) {
    Logger.log('[EXPORT_RPD_PER_YEAR ERROR] ' + error.toString());
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRPDPerYearExcel(data, year, kua) {
  let tsv = `LAPORAN RPD PER TAHUN ${year}\n`;
  if (kua) tsv += `KUA: ${kua}\n`;
  tsv += `\nNo\tKUA\tBudget\t`;
  
  MONTHS.forEach(month => {
    tsv += `${month}\t`;
  });
  tsv += `Total RPD\tSisa\n`;
  
  data.forEach((row, index) => {
    tsv += `${index + 1}\t${row.kua}\t${row.budget}\t`;
    MONTHS.forEach(month => {
      tsv += `${row.months[month]}\t`;
    });
    tsv += `${row.totalRPD}\t${row.sisa}\n`;
  });
  
  const blob = Utilities.newBlob(tsv, 'text/tab-separated-values');
  const base64 = Utilities.base64Encode(blob.getBytes());
  
  Logger.log('[EXPORT_RPD_PER_YEAR_EXCEL] Export completed');
  return successResponse({
    fileData: base64,
    fileName: `Laporan_RPD_${year}${kua ? '_' + kua : ''}.xls`,
    mimeType: 'application/vnd.ms-excel'
  });
}

function exportRPDPerYearPDF(data, year, kua) {
  // ✅ FIX BUG #4: Perbaiki styling PDF untuk lebih nyaman dibaca
  let html = `<html><head><style>
    @page { 
      size: A4 landscape;     /* Landscape untuk tabel yang lebar */
      margin: 15mm 10mm;      /* Margin yang cukup */
    }
    body { 
      font-family: 'Arial', sans-serif; 
      font-size: 9pt;         /* ✅ Font lebih besar dari sebelumnya (8px) */
      margin: 0;
      padding: 0;
    }
    h3 { 
      text-align: center; 
      margin: 0 0 5px 0;
      font-size: 14pt;        /* ✅ Judul lebih besar */
      font-weight: bold;
    }
    p { 
      text-align: center; 
      margin: 0 0 15px 0;
      font-size: 11pt;        /* ✅ Sub-judul jelas */
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 10px;
      font-size: 8pt;         /* ✅ Tabel sedikit lebih kecil dari body */
    }
    th { 
      background-color: #4CAF50;
      color: white;
      font-weight: bold;
      padding: 6px 4px;       /* ✅ Padding yang cukup */
      border: 1px solid #333;
      text-align: center;
      font-size: 9pt;
    }
    td { 
      padding: 5px 4px;       /* ✅ Padding yang nyaman */
      border: 1px solid #666;
      text-align: right;      /* Angka rata kanan */
    }
    td:first-child,           /* No */
    td:nth-child(2) {         /* KUA */
      text-align: center;
    }
    .amount {
      text-align: right;
      font-family: 'Courier New', monospace; /* ✅ Font monospace untuk angka */
    }
  </style></head><body>
  <h3>LAPORAN RPD PER TAHUN ${year}</h3>`;
  
  if (kua) html += `<p>KUA: ${kua}</p>`;
  else html += `<p>Kementerian Agama Kabupaten Indramayu</p>`;
  
  html += `<table>
    <thead>
      <tr>
        <th style="width: 3%;">No</th>
        <th style="width: 15%;">KUA</th>
        <th style="width: 8%;">Budget</th>`;
  
  // Header bulan
  MONTHS.forEach(month => {
    html += `<th style="width: 5%;">${month.substring(0, 3)}</th>`; // ✅ Singkat agar muat
  });
  html += `<th style="width: 8%;">Total RPD</th>
           <th style="width: 8%;">Sisa</th>
      </tr>
    </thead>
    <tbody>`;
  
  // Data rows
  data.forEach((row, index) => {
    html += `<tr>
      <td style="text-align: center;">${index + 1}</td>
      <td style="text-align: left;">${row.kua}</td>
      <td class="amount">${formatCurrency(row.budget)}</td>`;
    
    MONTHS.forEach(month => {
      html += `<td class="amount">${formatCurrency(row.months[month])}</td>`;
    });
    
    html += `<td class="amount" style="font-weight: bold; background: #f0f0f0;">${formatCurrency(row.totalRPD)}</td>
             <td class="amount" style="font-weight: bold; background: #fff3cd;">${formatCurrency(row.sisa)}</td>
           </tr>`;
  });
  
  html += `</tbody></table></body></html>`;
  
  const blob = Utilities.newBlob(html, 'text/html');
  const pdfBlob = blob.getAs('application/pdf');
  const base64 = Utilities.base64Encode(pdfBlob.getBytes());
  
  Logger.log('[EXPORT_RPD_PER_YEAR_PDF] Export completed');
  return successResponse({
    fileData: base64,
    fileName: `Laporan_RPD_${year}${kua ? '_' + kua : ''}.pdf`,
    mimeType: 'application/pdf'
  });
}

// 2. Export RPD Detail Year - CORRECTED FORMAT
function exportRPDDetailYear(data) {
  Logger.log('[EXPORT_RPD_DETAIL_YEAR] Format: ' + data.format + ', Year: ' + data.year);
  
  try {
    const rpdSheet = getSheet(SHEETS.RPD);
    const rpds = rpdSheet.getDataRange().getValues();
    
    Logger.log('[EXPORT_RPD_DETAIL_YEAR] Total RPD rows: ' + (rpds.length - 1));
    
    const rpdByKUA = {};
    const kuaList = new Set();
    
    // ✅ FIX: Gunakan index yang benar untuk tahun
    // RPD Sheet: A=ID(0), B=KUA(1), C=Bulan(2), D=Tahun(3), E=Total(4), F=Data(5)
    for (let i = 1; i < rpds.length; i++) {
      const rowYear = rpds[i][3];  // ✅ FIXED: Index 3 untuk tahun (bukan 4)
      const kua = rpds[i][1];
      const rpdDataString = rpds[i][5];
      
      Logger.log('[EXPORT_RPD_DETAIL_YEAR] Row ' + i + ': KUA=' + kua + ', Year=' + rowYear + ', Filter=' + data.year);
      
      if (rowYear == data.year) {
        Logger.log('[EXPORT_RPD_DETAIL_YEAR] ✓ Year match! Adding KUA: ' + kua);
        kuaList.add(kua);
        
        if (!rpdByKUA[kua]) {
          rpdByKUA[kua] = {};
        }
        
        let rpdData = {};
        try {
          rpdData = JSON.parse(rpdDataString || '{}');
          Logger.log('[EXPORT_RPD_DETAIL_YEAR] Parsed data for ' + kua + ':', JSON.stringify(rpdData));
        } catch (parseError) {
          Logger.log('[EXPORT_RPD_DETAIL_YEAR] JSON parse error: ' + parseError.toString());
        }
        
        // Aggregate data per code and item
        Object.keys(rpdData).forEach(code => {
          if (!rpdByKUA[kua][code]) {
            rpdByKUA[kua][code] = {};
          }
          Object.keys(rpdData[code]).forEach(item => {
            if (!rpdByKUA[kua][code][item]) {
              rpdByKUA[kua][code][item] = 0;
            }
            rpdByKUA[kua][code][item] += parseFloat(rpdData[code][item]) || 0;
          });
        });
      }
    }
    
    const sortedKUAs = Array.from(kuaList).sort();
    
    Logger.log('[EXPORT_RPD_DETAIL_YEAR] Total KUAs found: ' + sortedKUAs.length);
    Logger.log('[EXPORT_RPD_DETAIL_YEAR] KUAs: ' + JSON.stringify(sortedKUAs));
    
    if (sortedKUAs.length === 0) {
      Logger.log('[EXPORT_RPD_DETAIL_YEAR] WARNING: No RPD data found for year ' + data.year);
      return errorResponse('Tidak ada data RPD untuk tahun ' + data.year);
    }
    
    if (data.format === 'pdf') {
      return exportRPDDetailYearPDF(rpdByKUA, sortedKUAs, data.year);
    } else {
      return exportRPDDetailYearExcel(rpdByKUA, sortedKUAs, data.year);
    }
  } catch (error) {
    Logger.log('[EXPORT_RPD_DETAIL_YEAR ERROR] ' + error.toString());
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRPDDetailYearExcel(rpdByKUA, kuaList, year) {
  Logger.log('[EXPORT_RPD_DETAIL_YEAR_EXCEL] Starting export for year: ' + year);
  Logger.log('[EXPORT_RPD_DETAIL_YEAR_EXCEL] KUA count: ' + kuaList.length);
  
  let tsv = `LAPORAN RPD DETAIL - TAHUN ${year}\n`;
  tsv += `Kementerian Agama Kabupaten Indramayu\n\n`;
  
  // ✅ FIX #4: Header dengan kolom KUA
  tsv += `No\tKode\tUraian Program/Kegiatan/Output/Komponen`;
  kuaList.forEach(kua => {
    tsv += `\t${kua}`;
  });
  tsv += `\tJUMLAH\n`;
  
  let rowNum = 0;
  let grandTotal = {};
  kuaList.forEach(kua => { grandTotal[kua] = 0; });
  let grandTotalAll = 0;
  
  // Header row
  rowNum++;
  tsv += `${rowNum}\t025.04.WA\tDukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Bimas Islam`;
  kuaList.forEach(() => tsv += `\t`);
  tsv += `\t\n`;
  
  // ✅ FIX #4: Iterasi setiap parameter dan tampilkan nilai per KUA
  Object.keys(BOP_CONFIG.RPD_PARAMETERS).forEach(code => {
    const config = BOP_CONFIG.RPD_PARAMETERS[code];
    
    // Calculate totals
    let codeTotal = {};
    kuaList.forEach(kua => { codeTotal[kua] = 0; });
    let codeTotalAll = 0;
    
    config.items.forEach(item => {
      kuaList.forEach(kua => {
        const value = (rpdByKUA[kua] && rpdByKUA[kua][code] && rpdByKUA[kua][code][item]) || 0;
        codeTotal[kua] += value;
        codeTotalAll += value;
      });
    });
    
    // Header row for parameter
    tsv += `\t${code}\t${config.name}`;
    kuaList.forEach(kua => {
      if (config.hasSubItems) {
        tsv += `\t`;  // Empty for codes with breakdown
      } else {
        tsv += `\t${codeTotal[kua]}`;  // Show total for codes without breakdown
      }
    });
    if (config.hasSubItems) {
      tsv += `\t\n`;
    } else {
      tsv += `\t${codeTotalAll}\n`;
      // Add to grand total for non-breakdown items
      kuaList.forEach(kua => {
        grandTotal[kua] += codeTotal[kua];
      });
    }
    grandTotalAll += codeTotalAll;
    
    // Sub-items
    if (config.hasSubItems) {
      config.items.forEach((item, idx) => {
        const prefix = String.fromCharCode(97 + idx);
        tsv += `\t\t  ${prefix}. ${item}`;
        
        let itemTotal = 0;
        kuaList.forEach(kua => {
          const value = (rpdByKUA[kua] && rpdByKUA[kua][code] && rpdByKUA[kua][code][item]) || 0;
          tsv += `\t${value}`;
          itemTotal += value;
          grandTotal[kua] += value;
        });
        tsv += `\t${itemTotal}\n`;
      });
    }
  });
  
  // Grand total row
  tsv += `JUMLAH\t\t`;
  kuaList.forEach(kua => {
    tsv += `\t${grandTotal[kua]}`;
  });
  tsv += `\t${grandTotalAll}\n`;
  
  const blob = Utilities.newBlob(tsv, 'text/tab-separated-values');
  const base64 = Utilities.base64Encode(blob.getBytes());
  
  Logger.log('[EXPORT_RPD_DETAIL_YEAR_EXCEL] Export completed');
  return successResponse({
    fileData: base64,
    fileName: `Laporan_RPD_Detail_${year}.xls`,
    mimeType: 'application/vnd.ms-excel'
  });
}

function exportRPDDetailYearPDF(rpdByKUA, kuaList, year) {
  Logger.log('[EXPORT_RPD_DETAIL_YEAR_PDF] Starting PDF export for year: ' + year);
  Logger.log('[EXPORT_RPD_DETAIL_YEAR_PDF] KUA count: ' + kuaList.length);
  
  // ✅ FIX ISSUE #5: Jika KUA terlalu banyak, split ke multiple pages
  const MAX_KUA_PER_PAGE = 10;  // Maksimal 10 KUA per halaman
  const totalPages = Math.ceil(kuaList.length / MAX_KUA_PER_PAGE);
  
  Logger.log('[EXPORT_RPD_DETAIL_YEAR_PDF] Will create ' + totalPages + ' page(s)');
  
  let allPagesHTML = '';
  
  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const startIdx = pageNum * MAX_KUA_PER_PAGE;
    const endIdx = Math.min(startIdx + MAX_KUA_PER_PAGE, kuaList.length);
    const pageKUAs = kuaList.slice(startIdx, endIdx);
    
    Logger.log('[EXPORT_RPD_DETAIL_YEAR_PDF] Page ' + (pageNum + 1) + ': KUAs ' + (startIdx + 1) + ' to ' + endIdx);
    
    // ✅ Generate HTML untuk satu halaman
    const pageHTML = generateRPDDetailPage(rpdByKUA, pageKUAs, year, pageNum + 1, totalPages);
    allPagesHTML += pageHTML;
    
    // ✅ Tambahkan page break kecuali halaman terakhir
    if (pageNum < totalPages - 1) {
      allPagesHTML += '<div style="page-break-after: always;"></div>';
    }
  }
  
  // ✅ Wrap semua pages dalam HTML complete
  const html = `<html><head><style>
    @page {
      size: A3 landscape;
      margin: 12mm 10mm;
    }
    body { 
      font-family: 'Arial', sans-serif; 
      font-size: 8pt;
      margin: 0;
      padding: 0;
    }
    h3 { 
      text-align: center; 
      margin: 5px 0 3px 0;
      font-size: 13pt;
      font-weight: bold;
    }
    h4 { 
      text-align: center; 
      margin: 0 0 8px 0;
      font-size: 10pt;
      font-weight: normal;
    }
    .page-info {
      text-align: center;
      font-size: 9pt;
      color: #666;
      margin-bottom: 8px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 8px;
      table-layout: fixed;
    }
    th, td { 
      border: 1px solid #333;
      padding: 4px 3px;
      text-align: center;
      word-wrap: break-word;
      overflow: hidden;
    }
    th { 
      background-color: #4CAF50;
      color: white; 
      font-weight: bold;
      font-size: 8pt;
      padding: 5px 3px;
    }
    td {
      font-size: 7pt;
    }
    .left { 
      text-align: left; 
      padding-left: 5px;
    }
    .code { 
      font-weight: bold; 
      font-size: 7pt;
    }
    .subitem { 
      padding-left: 15px; 
      text-align: left;
      font-size: 7pt;
    }
    .total { 
      background-color: #f0f0f0; 
      font-weight: bold; 
    }
    .amount {
      font-family: 'Courier New', monospace;
      text-align: right;
      padding-right: 5px;
    }
    .kua-col {
      font-size: 7pt;
    }
  </style></head><body>
    ${allPagesHTML}
  </body></html>`;
  
  const blob = Utilities.newBlob(html, 'text/html');
  const pdfBlob = blob.getAs('application/pdf');
  const base64 = Utilities.base64Encode(pdfBlob.getBytes());
  
  Logger.log('[EXPORT_RPD_DETAIL_YEAR_PDF] Export completed with ' + totalPages + ' page(s)');
  return successResponse({
    fileData: base64,
    fileName: `Laporan_RPD_Detail_${year}.pdf`,
    mimeType: 'application/pdf'
  });
}

function generateRPDDetailPage(rpdByKUA, kuaList, year, pageNum, totalPages) {
  let html = `
    <h3>LAPORAN RPD DETAIL - TAHUN ${year}</h3>
    <h4>Kementerian Agama Kabupaten Indramayu</h4>
    <div class="page-info">Halaman ${pageNum} dari ${totalPages}</div>
    <table>
      <thead>
        <tr>
          <th style="width: 3%;">No</th>
          <th style="width: 6%;">Kode</th>
          <th style="width: 20%;">Uraian Program/Kegiatan/Output/Komponen</th>`;
  
  // ✅ Kolom KUA dengan width dinamis
  const kuaColWidth = Math.floor(65 / kuaList.length);
  kuaList.forEach(kua => {
    const shortName = kua.replace('KUA ', '');
    html += `<th class="kua-col" style="width: ${kuaColWidth}%;">${shortName}</th>`;
  });
  
  html += `<th style="width: 6%;">JUMLAH</th>
        </tr>
      </thead>
      <tbody>`;
  
  let rowNum = 0;
  let grandTotal = {};
  kuaList.forEach(kua => { grandTotal[kua] = 0; });
  let grandTotalAll = 0;
  
  // Header row
  rowNum++;
  html += `<tr>
    <td>${rowNum}</td>
    <td class="code">025.04.WA</td>
    <td class="left">Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Bimas Islam</td>`;
  kuaList.forEach(() => html += `<td></td>`);
  html += `<td></td></tr>`;
  
  // Iterasi parameter
  Object.keys(BOP_CONFIG.RPD_PARAMETERS).forEach(code => {
    const config = BOP_CONFIG.RPD_PARAMETERS[code];
    
    let codeTotal = {};
    kuaList.forEach(kua => { codeTotal[kua] = 0; });
    let codeTotalAll = 0;
    
    // Calculate totals
    config.items.forEach(item => {
      kuaList.forEach(kua => {
        const value = (rpdByKUA[kua] && rpdByKUA[kua][code] && rpdByKUA[kua][code][item]) || 0;
        codeTotal[kua] += value;
        codeTotalAll += value;
      });
    });
    
    // Parent row
    html += `<tr>
      <td></td>
      <td class="code">${code}</td>
      <td class="left">${config.name}</td>`;
    
    kuaList.forEach(kua => {
      if (config.hasSubItems) {
        html += `<td></td>`;
      } else {
        html += `<td class="amount">${formatNumber(codeTotal[kua])}</td>`;
        grandTotal[kua] += codeTotal[kua];
      }
    });
    
    if (config.hasSubItems) {
      html += `<td></td></tr>`;
    } else {
      html += `<td class="amount total">${formatNumber(codeTotalAll)}</td></tr>`;
    }
    
    grandTotalAll += codeTotalAll;
    
    // Sub-items
    if (config.hasSubItems) {
      config.items.forEach((item, idx) => {
        const prefix = String.fromCharCode(97 + idx);
        
        html += `<tr>
          <td></td>
          <td></td>
          <td class="subitem">${prefix}. ${item}</td>`;
        
        let itemTotal = 0;
        kuaList.forEach(kua => {
          const value = (rpdByKUA[kua] && rpdByKUA[kua][code] && rpdByKUA[kua][code][item]) || 0;
          html += `<td class="amount">${formatNumber(value)}</td>`;
          itemTotal += value;
          grandTotal[kua] += value;
        });
        
        html += `<td class="amount">${formatNumber(itemTotal)}</td></tr>`;
      });
    }
  });
  
  // Grand total row
  html += `<tr class="total">
    <td colspan="3" style="text-align: center; font-weight: bold;">JUMLAH (Halaman ${pageNum})</td>`;
  kuaList.forEach(kua => {
    html += `<td class="amount">${formatNumber(grandTotal[kua])}</td>`;
  });
  html += `<td class="amount" style="font-size: 8pt;">${formatNumber(grandTotalAll)}</td>
  </tr>`;
  
  html += `</tbody></table>`;
  
  return html;
}

// 3. Export Realisasi per Year
function exportRealisasiPerYear(data) {
  Logger.log('[EXPORT_REALISASI_PER_YEAR] Format: ' + data.format + ', KUA: ' + data.kua + ', Year: ' + data.year + ', apMode: ' + (data.apMode || 'exclude'));
  
  try {
    const budgetSheet    = getSheet(SHEETS.BUDGET);
    const realisasiSheet = getSheet(SHEETS.REALISASI);
    
    const budgets    = budgetSheet.getDataRange().getValues();
    const realisasis = realisasiSheet.getDataRange().getValues();
    const apMode     = data.apMode || 'exclude'; // 'include' | 'exclude'
    
    // ---- Load AP Config & Nominal if mode != 'exclude' with no actives ----
    var apCfg = {};
    var apNom = {}; // { KUA: { month: { '522111': n, '522112': n } } }
    
    try {
      var cfgSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.AUTO_PAYMENT_CONFIG);
      if (cfgSheet) {
        var cfgRows = cfgSheet.getDataRange().getValues();
        for (var ci = 1; ci < cfgRows.length; ci++) {
          var ck = cfgRows[ci][0];
          if (!ck) continue;
          apCfg[ck] = {
            '522111': cfgRows[ci][1] === true || cfgRows[ci][1] === 'TRUE',
            '522112': cfgRows[ci][2] === true || cfgRows[ci][2] === 'TRUE'
          };
        }
      }
      var nomSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.AUTO_PAYMENT_NOMINAL);
      if (nomSheet) {
        var nomRows = nomSheet.getDataRange().getValues();
        for (var ni = 1; ni < nomRows.length; ni++) {
          var nk = nomRows[ni][0], nm = nomRows[ni][1], ny = nomRows[ni][2];
          if (!nk || ny != data.year) continue;
          if (!apNom[nk]) apNom[nk] = {};
          apNom[nk][nm] = {
            '522111': parseFloat(nomRows[ni][3]) || 0,
            '522112': parseFloat(nomRows[ni][4]) || 0
          };
        }
      }
    } catch (e) {
      Logger.log('[EXPORT AP LOAD ERROR] ' + e.toString());
    }
    
    Logger.log('[EXPORT_REALISASI_PER_YEAR] Total budgets: ' + (budgets.length - 1));
    Logger.log('[EXPORT_REALISASI_PER_YEAR] Total realisasis: ' + (realisasis.length - 1));
    
    const yearBudgets = [];
    for (let i = 1; i < budgets.length; i++) {
      if (budgets[i][2] == data.year) {
        if (!data.kua || budgets[i][1] === data.kua) {
          yearBudgets.push({
            kua: budgets[i][1],
            budget: parseFloat(budgets[i][3]) || 0
          });
        }
      }
    }
    
    const result = yearBudgets.map(b => {
      const row = { kua: b.kua, budget: b.budget, months: {} };
      MONTHS.forEach(month => { row.months[month] = 0; });
      
      // Realisasi Sheet: A=ID, B=KUA, C=Bulan, D=RPD_ID, E=Tahun, F=Total, G=Data, H=Files, I=Status
      for (let i = 1; i < realisasis.length; i++) {
        const kua    = realisasis[i][1];
        const month  = realisasis[i][2];
        const year   = realisasis[i][4];
        const status = realisasis[i][8];
        const kuaCfg = apCfg[kua] || null;
        const hasAP  = kuaCfg && (kuaCfg['522111'] || kuaCfg['522112']);
        
        if (kua !== b.kua || year != data.year) continue;
        if (normalizeStatus(status) !== 'Approved' && normalizeStatus(status) !== 'Paid') continue;
        
        var monthTotal = 0;
        
        if (!hasAP || apMode === 'exclude') {
          // No AP config OR exclude mode:
          // exclude → POS aktif = 0, non-aktif = manual
          // no AP   → all manual
          if (!hasAP) {
            monthTotal = parseFloat(realisasis[i][5]) || 0;
          } else {
            // exclude: parse per-POS dari G:Data
            var rawData = {};
            try { rawData = JSON.parse(realisasis[i][6] || '{}'); } catch(e) {}
            Object.keys(rawData).forEach(function(code) {
              if (kuaCfg[code]) return; // POS aktif → 0
              Object.values(rawData[code]).forEach(function(v) {
                monthTotal += parseFloat(v) || 0;
              });
            });
          }
        } else {
          // include mode: POS aktif = nominal admin, non-aktif = manual
          var rawData2 = {};
          try { rawData2 = JSON.parse(realisasis[i][6] || '{}'); } catch(e) {}
          var nomForMonth = (apNom[kua] && apNom[kua][month]) ? apNom[kua][month] : {};
          Object.keys(rawData2).forEach(function(code) {
            if (kuaCfg[code]) {
              monthTotal += parseFloat(nomForMonth[code] || 0);
            } else {
              Object.values(rawData2[code]).forEach(function(v) {
                monthTotal += parseFloat(v) || 0;
              });
            }
          });
        }
        
        row.months[month] += monthTotal;
      }
      
      row.totalRealisasi = Object.values(row.months).reduce((sum, val) => sum + val, 0);
      row.sisa = b.budget - row.totalRealisasi;
      Logger.log('[EXPORT_REALISASI_PER_YEAR] ' + b.kua + ': totalRealisasi=' + row.totalRealisasi + ' (mode=' + apMode + ')');
      return row;
    });
    
    if (data.format === 'pdf') {
      // ===== INLINE PDF =====
      var htmlPY = '<html><head><style>';
      htmlPY += 'body{font-family:Arial;font-size:10px;}';
      htmlPY += 'table{width:100%;border-collapse:collapse;margin-top:20px;}';
      htmlPY += 'th,td{border:1px solid #000;padding:5px;text-align:center;}';
      htmlPY += 'th{background:#dc3545;color:white;}';
      htmlPY += '</style></head><body>';
      htmlPY += '<h3 style="text-align:center">LAPORAN REALISASI PER TAHUN ' + data.year + '</h3>';
      if (data.kua) htmlPY += '<p style="text-align:center">KUA: ' + data.kua + '</p>';
      htmlPY += '<table><tr><th>No</th><th>KUA</th><th>Budget</th>';
      MONTHS.forEach(function(m) { htmlPY += '<th>' + m + '</th>'; });
      htmlPY += '<th>Total Realisasi</th><th>Sisa</th></tr>';
      result.forEach(function(row, idx) {
        htmlPY += '<tr><td>' + (idx+1) + '</td><td>' + row.kua + '</td><td>' + formatCurrency(row.budget) + '</td>';
        MONTHS.forEach(function(m) { htmlPY += '<td>' + formatCurrency(row.months[m]) + '</td>'; });
        htmlPY += '<td>' + formatCurrency(row.totalRealisasi) + '</td><td>' + formatCurrency(row.sisa) + '</td></tr>';
      });
      htmlPY += '</table></body></html>';
      var blobPY = Utilities.newBlob(htmlPY, 'text/html');
      var pdfPY = blobPY.getAs('application/pdf');
      var b64PY = Utilities.base64Encode(pdfPY.getBytes());
      return successResponse({ fileData: b64PY, fileName: 'Laporan_Realisasi_' + data.year + (data.kua ? '_' + data.kua : '') + '.pdf', mimeType: 'application/pdf' });
    } else {
      // ===== INLINE EXCEL (TSV) =====
      var tsvPY = 'LAPORAN REALISASI PER TAHUN ' + data.year + '\n';
      if (data.kua) tsvPY += 'KUA: ' + data.kua + '\n';
      tsvPY += '\nNo\tKUA\tBudget\t';
      MONTHS.forEach(function(m) { tsvPY += m + '\t'; });
      tsvPY += 'Total Realisasi\tSisa\n';
      result.forEach(function(row, idx) {
        tsvPY += (idx+1) + '\t' + row.kua + '\t' + row.budget + '\t';
        MONTHS.forEach(function(m) { tsvPY += row.months[m] + '\t'; });
        tsvPY += row.totalRealisasi + '\t' + row.sisa + '\n';
      });
      var blobXL = Utilities.newBlob(tsvPY, 'text/tab-separated-values');
      var b64XL  = Utilities.base64Encode(blobXL.getBytes());
      return successResponse({ fileData: b64XL, fileName: 'Laporan_Realisasi_' + data.year + (data.kua ? '_' + data.kua : '') + '.xls', mimeType: 'application/vnd.ms-excel' });
    }
  } catch (error) {
    Logger.log('[EXPORT_REALISASI_PER_YEAR ERROR] ' + error.toString());
    return errorResponse('Gagal export: ' + error.toString());
  }
}

function exportRealisasiPerYearExcel(data, year, kua) {
  let tsv = `LAPORAN REALISASI PER TAHUN ${year}\n`;
  if (kua) tsv += `KUA: ${kua}\n`;
  tsv += `\nNo\tKUA\tBudget\t`;
  
  MONTHS.forEach(month => {
    tsv += `${month}\t`;
  });
  tsv += `Total Realisasi\tSisa\n`;
  
  data.forEach((row, index) => {
    tsv += `${index + 1}\t${row.kua}\t${row.budget}\t`;
    MONTHS.forEach(month => {
      tsv += `${row.months[month]}\t`;
    });
    tsv += `${row.totalRealisasi}\t${row.sisa}\n`;
  });
  
  const blob = Utilities.newBlob(tsv, 'text/tab-separated-values');
  const base64 = Utilities.base64Encode(blob.getBytes());
  
  Logger.log('[EXPORT_REALISASI_PER_YEAR_EXCEL] Export completed');
  return successResponse({
    fileData: base64,
    fileName: `Laporan_Realisasi_${year}${kua ? '_' + kua : ''}.xls`,
    mimeType: 'application/vnd.ms-excel'
  });
}

function exportRealisasiPerYearPDF(data, year, kua) {
  let html = `<html><head><style>
    body { font-family: Arial; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #000; padding: 5px; text-align: center; }
    th { background: #dc3545; color: white; }
  </style></head><body>
  <h3 style="text-align:center">LAPORAN REALISASI PER TAHUN ${year}</h3>`;
  
  if (kua) html += `<p style="text-align:center">KUA: ${kua}</p>`;
  
  html += `<table><tr><th>No</th><th>KUA</th><th>Budget</th>`;
  
  MONTHS.forEach(month => {
    html += `<th>${month}</th>`;
  });
  html += `<th>Total Realisasi</th><th>Sisa</th></tr>`;
  
  data.forEach((row, index) => {
    html += `<tr><td>${index + 1}</td><td>${row.kua}</td><td>${formatCurrency(row.budget)}</td>`;
    MONTHS.forEach(month => {
      html += `<td>${formatCurrency(row.months[month])}</td>`;
    });
    html += `<td>${formatCurrency(row.totalRealisasi)}</td><td>${formatCurrency(row.sisa)}</td></tr>`;
  });
  
  html += `</table></body></html>`;
  
  const blob = Utilities.newBlob(html, 'text/html');
  const pdfBlob = blob.getAs('application/pdf');
  const base64 = Utilities.base64Encode(pdfBlob.getBytes());
  
  Logger.log('[EXPORT_REALISASI_PER_YEAR_PDF] Export completed');
  return successResponse({
    fileData: base64,
    fileName: `Laporan_Realisasi_${year}${kua ? '_' + kua : ''}.pdf`,
    mimeType: 'application/pdf'
  });
}

// 4. Export Realisasi Detail Year - CORRECTED FORMAT
function exportRealisasiDetailYear(data) {
  Logger.log('[EXPORT_REALISASI_DETAIL_YEAR] Format: ' + data.format + ', Year: ' + data.year + ', apMode: ' + (data.apMode || 'exclude'));
  
  try {
    const realisasiSheet = getSheet(SHEETS.REALISASI);
    const realisasis = realisasiSheet.getDataRange().getValues();
    const apMode = data.apMode || 'exclude';
    
    // Load AP Config & Nominal
    var apCfg = {};
    var apNom = {}; // { KUA: { month: { '522111': n, '522112': n } } }
    try {
      var cfgSheet2 = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.AUTO_PAYMENT_CONFIG);
      if (cfgSheet2) {
        var cfgRows2 = cfgSheet2.getDataRange().getValues();
        for (var ci2 = 1; ci2 < cfgRows2.length; ci2++) {
          var ck2 = cfgRows2[ci2][0];
          if (!ck2) continue;
          apCfg[ck2] = { '522111': cfgRows2[ci2][1] === true || cfgRows2[ci2][1] === 'TRUE', '522112': cfgRows2[ci2][2] === true || cfgRows2[ci2][2] === 'TRUE' };
        }
      }
      var nomSheet2 = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.AUTO_PAYMENT_NOMINAL);
      if (nomSheet2) {
        var nomRows2 = nomSheet2.getDataRange().getValues();
        for (var ni2 = 1; ni2 < nomRows2.length; ni2++) {
          var nk2 = nomRows2[ni2][0], nm2 = nomRows2[ni2][1], ny2 = nomRows2[ni2][2];
          if (!nk2 || ny2 != data.year) continue;
          if (!apNom[nk2]) apNom[nk2] = {};
          apNom[nk2][nm2] = { '522111': parseFloat(nomRows2[ni2][3]) || 0, '522112': parseFloat(nomRows2[ni2][4]) || 0 };
        }
      }
    } catch (apErr) {
      Logger.log('[EXPORT_DETAIL AP LOAD ERROR] ' + apErr.toString());
    }
    
    const realisasiByKUA = {};
    const kuaList = new Set();
    
    for (let i = 1; i < realisasis.length; i++) {
      const year   = realisasis[i][4];
      const status = realisasis[i][8];
      const norm   = normalizeStatus(status);
      
      // Hanya Approved & Paid
      if (year != data.year || (norm !== 'Approved' && norm !== 'Paid')) continue;
      
      const kua    = realisasis[i][1];
      const month  = realisasis[i][2];
      kuaList.add(kua);
      if (!realisasiByKUA[kua]) realisasiByKUA[kua] = {};
      
      var rawData3 = {};
      try { rawData3 = JSON.parse(realisasis[i][6] || '{}'); } catch (e) {}
      
      const kuaCfg3   = apCfg[kua] || null;
      const hasAP3    = kuaCfg3 && (kuaCfg3['522111'] || kuaCfg3['522112']);
      const nomMonth3 = (apNom[kua] && apNom[kua][month]) ? apNom[kua][month] : {};
      
      Object.keys(rawData3).forEach(function(code) {
        if (!realisasiByKUA[kua][code]) realisasiByKUA[kua][code] = {};
        var isAP = hasAP3 && kuaCfg3[code] === true;
        Object.keys(rawData3[code]).forEach(function(item) {
          if (!realisasiByKUA[kua][code][item]) realisasiByKUA[kua][code][item] = 0;
          var val = 0;
          if (isAP) {
            if (apMode === 'include') val = parseFloat(nomMonth3[code] || 0) / Math.max(1, Object.keys(rawData3[code]).length);
            // exclude → 0
          } else {
            val = parseFloat(rawData3[code][item]) || 0;
          }
          realisasiByKUA[kua][code][item] += val;
        });
      });
    }
    
    const sortedKUAs = Array.from(kuaList).sort();
    Logger.log('[EXPORT_REALISASI_DETAIL_YEAR] Total KUAs: ' + sortedKUAs.length);
    
    if (data.format === 'pdf') {
      // ===== INLINE PDF =====
      return _exportRealisasiDetailYearPDF_inline(realisasiByKUA, sortedKUAs, data.year);
    } else {
      // ===== INLINE EXCEL (TSV) =====
      return _exportRealisasiDetailYearExcel_inline(realisasiByKUA, sortedKUAs, data.year);
    }
  } catch (error) {
    Logger.log('[EXPORT_REALISASI_DETAIL_YEAR ERROR] ' + error.toString());
    return errorResponse('Gagal export: ' + error.toString());
  }
}

// ===== PRIVATE INLINE EXPORT HELPERS (unique names — tidak bisa di-override) =====
function _exportRealisasiDetailYearExcel_inline(realisasiByKUA, kuaList, year) {
  Logger.log('[EXPORT_DETAIL_EXCEL_INLINE] Starting for year: ' + year);
  var tsv = 'LAPORAN REALISASI DETAIL - TAHUN ' + year + '\n';
  tsv += 'Kementerian Agama Kabupaten Indramayu\n\n';
  tsv += 'No\tKode\tUraian';
  kuaList.forEach(function(kua) { tsv += '\t' + kua; });
  tsv += '\tJUMLAH\n';

  var rowNum = 0;
  var grandTotal = {};
  kuaList.forEach(function(kua) { grandTotal[kua] = 0; });
  var grandTotalAll = 0;

  Object.keys(BOP_CONFIG.RPD_PARAMETERS).forEach(function(code) {
    var cfg = BOP_CONFIG.RPD_PARAMETERS[code];
    var codeTotal = {};
    kuaList.forEach(function(kua) { codeTotal[kua] = 0; });
    var codeTotalAll = 0;

    cfg.items.forEach(function(item) {
      kuaList.forEach(function(kua) {
        var v = (realisasiByKUA[kua] && realisasiByKUA[kua][code] && realisasiByKUA[kua][code][item]) ? parseFloat(realisasiByKUA[kua][code][item]) : 0;
        codeTotal[kua] += v;
        codeTotalAll += v;
      });
    });

    rowNum++;
    tsv += rowNum + '\t' + code + '\t' + cfg.name;
    kuaList.forEach(function(kua) {
      if (cfg.hasSubItems) { tsv += '\t'; } else { tsv += '\t' + codeTotal[kua]; grandTotal[kua] += codeTotal[kua]; }
    });
    if (cfg.hasSubItems) { tsv += '\t\n'; } else { tsv += '\t' + codeTotalAll + '\n'; }
    grandTotalAll += cfg.hasSubItems ? 0 : codeTotalAll;

    if (cfg.hasSubItems) {
      cfg.items.forEach(function(item, idx) {
        var prefix = String.fromCharCode(97 + idx);
        rowNum++;
        tsv += rowNum + '\t\t' + prefix + '. ' + item;
        var itemTotal = 0;
        kuaList.forEach(function(kua) {
          var v = (realisasiByKUA[kua] && realisasiByKUA[kua][code] && realisasiByKUA[kua][code][item]) ? parseFloat(realisasiByKUA[kua][code][item]) : 0;
          tsv += '\t' + v;
          itemTotal += v;
          grandTotal[kua] += v;
          grandTotalAll += v;
        });
        tsv += '\t' + itemTotal + '\n';
      });
    }
  });

  tsv += '\t\tJUMLAH';
  kuaList.forEach(function(kua) { tsv += '\t' + grandTotal[kua]; });
  tsv += '\t' + grandTotalAll + '\n';

  var blob   = Utilities.newBlob(tsv, 'text/tab-separated-values');
  var base64 = Utilities.base64Encode(blob.getBytes());
  return successResponse({ fileData: base64, fileName: 'Laporan_Realisasi_Detail_' + year + '.xls', mimeType: 'application/vnd.ms-excel' });
}

function _exportRealisasiDetailYearPDF_inline(realisasiByKUA, kuaList, year) {
  Logger.log('[EXPORT_DETAIL_PDF_INLINE] Starting for year: ' + year + ', KUAs: ' + kuaList.length);
  var MAX_KUA = 10;
  var totalPages = Math.ceil(kuaList.length / MAX_KUA) || 1;
  var allHtml = '<html><head><style>';
  allHtml += 'body{font-family:Arial;font-size:8px;} table{width:100%;border-collapse:collapse;page-break-after:always;} ';
  allHtml += 'th,td{border:1px solid #000;padding:3px;text-align:right;} th{background:#dc3545;color:white;text-align:center;} .name{text-align:left;}';
  allHtml += '</style></head><body>';

  for (var p = 0; p < totalPages; p++) {
    var pageKUAs = kuaList.slice(p * MAX_KUA, (p + 1) * MAX_KUA);
    allHtml += '<h4 style="text-align:center">LAPORAN REALISASI DETAIL TAHUN ' + year + ' (Hal ' + (p+1) + '/' + totalPages + ')</h4>';
    allHtml += '<table><tr><th>No</th><th>Kode</th><th class="name">Uraian</th>';
    pageKUAs.forEach(function(kua) { allHtml += '<th>' + kua.replace('KUA ','') + '</th>'; });
    allHtml += '<th>JUMLAH</th></tr>';

    var rowNum = 0;
    var grandTotal = {};
    pageKUAs.forEach(function(kua) { grandTotal[kua] = 0; });
    var grandAll = 0;

    Object.keys(BOP_CONFIG.RPD_PARAMETERS).forEach(function(code) {
      var cfg = BOP_CONFIG.RPD_PARAMETERS[code];
      var codeTotal = {};
      pageKUAs.forEach(function(kua) { codeTotal[kua] = 0; });
      var codeAll = 0;

      cfg.items.forEach(function(item) {
        pageKUAs.forEach(function(kua) {
          var v = (realisasiByKUA[kua] && realisasiByKUA[kua][code] && realisasiByKUA[kua][code][item]) ? parseFloat(realisasiByKUA[kua][code][item]) : 0;
          codeTotal[kua] += v;
          codeAll += v;
        });
      });

      rowNum++;
      allHtml += '<tr><td>' + rowNum + '</td><td>' + code + '</td><td class="name"><strong>' + cfg.name + '</strong></td>';
      pageKUAs.forEach(function(kua) {
        if (cfg.hasSubItems) { allHtml += '<td></td>'; } else { allHtml += '<td>' + formatCurrency(codeTotal[kua]) + '</td>'; grandTotal[kua] += codeTotal[kua]; }
      });
      if (cfg.hasSubItems) { allHtml += '<td></td>'; } else { allHtml += '<td><strong>' + formatCurrency(codeAll) + '</strong></td>'; grandAll += codeAll; }
      allHtml += '</tr>';

      if (cfg.hasSubItems) {
        cfg.items.forEach(function(item, idx) {
          var prefix = String.fromCharCode(97 + idx);
          rowNum++;
          allHtml += '<tr><td></td><td></td><td class="name">&nbsp;&nbsp;' + prefix + '. ' + item + '</td>';
          var itemAll = 0;
          pageKUAs.forEach(function(kua) {
            var v = (realisasiByKUA[kua] && realisasiByKUA[kua][code] && realisasiByKUA[kua][code][item]) ? parseFloat(realisasiByKUA[kua][code][item]) : 0;
            allHtml += '<td>' + formatCurrency(v) + '</td>';
            itemAll += v;
            grandTotal[kua] += v;
            grandAll += v;
          });
          allHtml += '<td>' + formatCurrency(itemAll) + '</td></tr>';
        });
      }
    });

    allHtml += '<tr><td colspan="3"><strong>JUMLAH</strong></td>';
    pageKUAs.forEach(function(kua) { allHtml += '<td><strong>' + formatCurrency(grandTotal[kua]) + '</strong></td>'; });
    allHtml += '<td><strong>' + formatCurrency(grandAll) + '</strong></td></tr>';
    allHtml += '</table>';
  }
  allHtml += '</body></html>';

  var blob   = Utilities.newBlob(allHtml, 'text/html');
  var pdf    = blob.getAs('application/pdf');
  var base64 = Utilities.base64Encode(pdf.getBytes());
  return successResponse({ fileData: base64, fileName: 'Laporan_Realisasi_Detail_' + year + '.pdf', mimeType: 'application/pdf' });
}

function exportRealisasiDetailYearExcel(realisasiByKUA, kuaList, year) {
  Logger.log('[EXPORT_REALISASI_DETAIL_YEAR_EXCEL] Starting export');
  
  let tsv = `LAPORAN REALISASI DETAIL - TAHUN ${year}\n`;
  tsv += `Kementerian Agama Kabupaten Indramayu\n\n`;
  
  // Header
  tsv += `No\tKode\tUraian`;
  kuaList.forEach(kua => tsv += `\t${kua}`);
  tsv += `\tJUMLAH\n`;
  
  let rowNum = 0;
  let grandTotal = {};
  kuaList.forEach(kua => { grandTotal[kua] = 0; });
  let grandTotalAll = 0;
  
  // Header row
  rowNum++;
  tsv += `${rowNum}\t025.04.WA\tDukungan Manajemen...`;
  kuaList.forEach(() => tsv += `\t`);
  tsv += `\t\n`;
  
  Object.keys(BOP_CONFIG.RPD_PARAMETERS).forEach(code => {
    const config = BOP_CONFIG.RPD_PARAMETERS[code];
    
    let codeTotal = {};
    kuaList.forEach(kua => { codeTotal[kua] = 0; });
    let codeTotalAll = 0;
    
    config.items.forEach(item => {
      kuaList.forEach(kua => {
        const value = (realisasiByKUA[kua] && realisasiByKUA[kua][code] && realisasiByKUA[kua][code][item]) || 0;
        codeTotal[kua] += value;
        codeTotalAll += value;
      });
    });
    
    // Parent row
    rowNum++;
    tsv += `${rowNum}\t${code}\t${config.name}`;
    
    kuaList.forEach(kua => {
      if (config.hasSubItems) {
        tsv += `\t`;
      } else {
        // ✅ CRITICAL: GUNAKAN VALUE ASLI, JANGAN FORMAT!
        tsv += `\t${codeTotal[kua]}`;  // ✅ BUKAN formatNumber()!
        grandTotal[kua] += codeTotal[kua];
      }
    });
    
    if (config.hasSubItems) {
      tsv += `\t\n`;
    } else {
      tsv += `\t${codeTotalAll}\n`;  // ✅ VALUE ASLI
    }
    
    grandTotalAll += codeTotalAll;
    
    // Sub-items
    if (config.hasSubItems) {
      config.items.forEach((item, idx) => {
        const prefix = String.fromCharCode(97 + idx);
        
        rowNum++;
        tsv += `${rowNum}\t\t${prefix}. ${item}`;
        
        let itemTotal = 0;
        kuaList.forEach(kua => {
          const value = (realisasiByKUA[kua] && realisasiByKUA[kua][code] && realisasiByKUA[kua][code][item]) || 0;
          tsv += `\t${value}`;  // ✅ VALUE ASLI, TIDAK DIFORMAT
          itemTotal += value;
          grandTotal[kua] += value;
        });
        
        tsv += `\t${itemTotal}\n`;
      });
    }
  });
  
  // Grand total
  tsv += `\t\tJUMLAH`;
  kuaList.forEach(kua => {
    tsv += `\t${grandTotal[kua]}`;  // ✅ VALUE ASLI
  });
  tsv += `\t${grandTotalAll}\n`;
  
  const blob = Utilities.newBlob(tsv, 'text/tab-separated-values');
  const base64 = Utilities.base64Encode(blob.getBytes());
  
  return successResponse({
    fileData: base64,
    fileName: `Laporan_Realisasi_Detail_${year}.xls`,
    mimeType: 'application/vnd.ms-excel'
  });
}

function exportRealisasiDetailYearPDF(realisasiByKUA, kuaList, year) {
  Logger.log('[EXPORT_REALISASI_DETAIL_YEAR_PDF] Starting PDF export for year: ' + year);
  Logger.log('[EXPORT_REALISASI_DETAIL_YEAR_PDF] KUA count: ' + kuaList.length);
  
  // ✅ FIX ISSUE #5: Split ke multiple pages jika KUA terlalu banyak
  const MAX_KUA_PER_PAGE = 10;
  const totalPages = Math.ceil(kuaList.length / MAX_KUA_PER_PAGE);
  
  Logger.log('[EXPORT_REALISASI_DETAIL_YEAR_PDF] Will create ' + totalPages + ' page(s)');
  
  let allPagesHTML = '';
  
  for (let pageNum = 0; pageNum < totalPages; pageNum++) {
    const startIdx = pageNum * MAX_KUA_PER_PAGE;
    const endIdx = Math.min(startIdx + MAX_KUA_PER_PAGE, kuaList.length);
    const pageKUAs = kuaList.slice(startIdx, endIdx);
    
    const pageHTML = generateRealisasiDetailPage(realisasiByKUA, pageKUAs, year, pageNum + 1, totalPages);
    allPagesHTML += pageHTML;
    
    if (pageNum < totalPages - 1) {
      allPagesHTML += '<div style="page-break-after: always;"></div>';
    }
  }
  
  const html = `<html><head><style>
    @page {
      size: A3 landscape;
      margin: 12mm 10mm;
    }
    body { 
      font-family: 'Arial', sans-serif; 
      font-size: 8pt;
      margin: 0;
      padding: 0;
    }
    h3 { 
      text-align: center; 
      margin: 5px 0 3px 0;
      font-size: 13pt;
      font-weight: bold;
    }
    h4 { 
      text-align: center; 
      margin: 0 0 8px 0;
      font-size: 10pt;
      font-weight: normal;
    }
    .page-info {
      text-align: center;
      font-size: 9pt;
      color: #666;
      margin-bottom: 8px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      margin-top: 8px;
      table-layout: fixed;
    }
    th, td { 
      border: 1px solid #333;
      padding: 4px 3px;
      text-align: center;
      word-wrap: break-word;
      overflow: hidden;
    }
    th { 
      background-color: #dc3545;
      color: white; 
      font-weight: bold;
      font-size: 8pt;
      padding: 5px 3px;
    }
    td {
      font-size: 7pt;
    }
    .left { 
      text-align: left; 
      padding-left: 5px;
    }
    .code { 
      font-weight: bold; 
      font-size: 7pt;
    }
    .subitem { 
      padding-left: 15px; 
      text-align: left;
      font-size: 7pt;
    }
    .total { 
      background-color: #f0f0f0; 
      font-weight: bold; 
    }
    .amount {
      font-family: 'Courier New', monospace;
      text-align: right;
      padding-right: 5px;
    }
    .kua-col {
      font-size: 7pt;
    }
  </style></head><body>
    ${allPagesHTML}
  </body></html>`;
  
  const blob = Utilities.newBlob(html, 'text/html');
  const pdfBlob = blob.getAs('application/pdf');
  const base64 = Utilities.base64Encode(pdfBlob.getBytes());
  
  Logger.log('[EXPORT_REALISASI_DETAIL_YEAR_PDF] Export completed with ' + totalPages + ' page(s)');
  return successResponse({
    fileData: base64,
    fileName: `Laporan_Realisasi_Detail_${year}.pdf`,
    mimeType: 'application/pdf'
  });
}

function generateRealisasiDetailPage(realisasiByKUA, kuaList, year, pageNum, totalPages) {
  let html = `
    <h3>LAPORAN REALISASI DETAIL - TAHUN ${year}</h3>
    <h4>Kementerian Agama Kabupaten Indramayu</h4>
    <div class="page-info">Halaman ${pageNum} dari ${totalPages}</div>
    <table>
      <thead>
        <tr>
          <th style="width: 3%;">No</th>
          <th style="width: 6%;">Kode</th>
          <th style="width: 20%;">Uraian Program/Kegiatan/Output/Komponen</th>`;
  
  const kuaColWidth = Math.floor(65 / kuaList.length);
  kuaList.forEach(kua => {
    const shortName = kua.replace('KUA ', '');
    html += `<th class="kua-col" style="width: ${kuaColWidth}%;">${shortName}</th>`;
  });
  
  html += `<th style="width: 6%;">JUMLAH</th>
        </tr>
      </thead>
      <tbody>`;
  
  let rowNum = 0;
  let grandTotal = {};
  kuaList.forEach(kua => { grandTotal[kua] = 0; });
  let grandTotalAll = 0;
  
  rowNum++;
  html += `<tr>
    <td>${rowNum}</td>
    <td class="code">025.04.WA</td>
    <td class="left">Dukungan Manajemen dan Pelaksanaan Tugas Teknis Lainnya Bimas Islam</td>`;
  kuaList.forEach(() => html += `<td></td>`);
  html += `<td></td></tr>`;
  
  Object.keys(BOP_CONFIG.RPD_PARAMETERS).forEach(code => {
    const config = BOP_CONFIG.RPD_PARAMETERS[code];
    
    let codeTotal = {};
    kuaList.forEach(kua => { codeTotal[kua] = 0; });
    let codeTotalAll = 0;
    
    config.items.forEach(item => {
      kuaList.forEach(kua => {
        const value = (realisasiByKUA[kua] && realisasiByKUA[kua][code] && realisasiByKUA[kua][code][item]) || 0;
        codeTotal[kua] += value;
        codeTotalAll += value;
      });
    });
    
    html += `<tr>
      <td></td>
      <td class="code">${code}</td>
      <td class="left">${config.name}</td>`;
    
    kuaList.forEach(kua => {
      if (config.hasSubItems) {
        html += `<td></td>`;
      } else {
        html += `<td class="amount">${formatNumber(codeTotal[kua])}</td>`;
        grandTotal[kua] += codeTotal[kua];
      }
    });
    
    if (config.hasSubItems) {
      html += `<td></td></tr>`;
    } else {
      html += `<td class="amount total">${formatNumber(codeTotalAll)}</td></tr>`;
    }
    
    grandTotalAll += codeTotalAll;
    
    if (config.hasSubItems) {
      config.items.forEach((item, idx) => {
        const prefix = String.fromCharCode(97 + idx);
        
        html += `<tr>
          <td></td>
          <td></td>
          <td class="subitem">${prefix}. ${item}</td>`;
        
        let itemTotal = 0;
        kuaList.forEach(kua => {
          const value = (realisasiByKUA[kua] && realisasiByKUA[kua][code] && realisasiByKUA[kua][code][item]) || 0;
          html += `<td class="amount">${formatNumber(value)}</td>`;
          itemTotal += value;
          grandTotal[kua] += value;
        });
        
        html += `<td class="amount">${formatNumber(itemTotal)}</td></tr>`;
      });
    }
  });
  
  html += `<tr class="total">
    <td colspan="3" style="text-align: center; font-weight: bold;">JUMLAH (Halaman ${pageNum})</td>`;
  kuaList.forEach(kua => {
    html += `<td class="amount">${formatNumber(grandTotal[kua])}</td>`;
  });
  html += `<td class="amount" style="font-size: 8pt;">${formatNumber(grandTotalAll)}</td>
  </tr>`;
  
  html += `</tbody></table>`;
  
  return html;
}

function uploadFile(data) {
  Logger.log('[UPLOAD_FILE] ========== START ==========');
  Logger.log('[UPLOAD_FILE] Filename: ' + data.filename);
  Logger.log('[UPLOAD_FILE] MIME Type: ' + data.mimeType);
  
  try {
    // Decode base64
    const fileBlob = Utilities.newBlob(
      Utilities.base64Decode(data.fileData),
      data.mimeType,
      data.filename
    );
    
    Logger.log('[UPLOAD_FILE] File blob created, size: ' + fileBlob.getBytes().length);
    
    // Get root folder
    const rootFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    Logger.log('[UPLOAD_FILE] Root folder: ' + rootFolder.getName());
    
    // ✅ Create organized folder structure
    // Format: BOP_Uploads/YYYY/MM/
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    Logger.log('[UPLOAD_FILE] Creating folder structure: BOP_Uploads/' + year + '/' + month);
    
    // Get or create "BOP_Uploads" folder
    let uploadsFolder;
    const uploadsFolders = rootFolder.getFoldersByName('BOP_Uploads');
    if (uploadsFolders.hasNext()) {
      uploadsFolder = uploadsFolders.next();
      Logger.log('[UPLOAD_FILE] Found existing BOP_Uploads folder');
    } else {
      uploadsFolder = rootFolder.createFolder('BOP_Uploads');
      Logger.log('[UPLOAD_FILE] Created new BOP_Uploads folder');
    }
    
    // Get or create year folder
    let yearFolder;
    const yearFolders = uploadsFolder.getFoldersByName(year.toString());
    if (yearFolders.hasNext()) {
      yearFolder = yearFolders.next();
      Logger.log('[UPLOAD_FILE] Found existing year folder: ' + year);
    } else {
      yearFolder = uploadsFolder.createFolder(year.toString());
      Logger.log('[UPLOAD_FILE] Created new year folder: ' + year);
    }
    
    // Get or create month folder
    let monthFolder;
    const monthFolders = yearFolder.getFoldersByName(month);
    if (monthFolders.hasNext()) {
      monthFolder = monthFolders.next();
      Logger.log('[UPLOAD_FILE] Found existing month folder: ' + month);
    } else {
      monthFolder = yearFolder.createFolder(month);
      Logger.log('[UPLOAD_FILE] Created new month folder: ' + month);
    }
    
    // ✅ Generate unique filename
    // Format: timestamp_originalname
    const timestamp = Date.now();
    const extension = data.filename.includes('.') ? 
      data.filename.substring(data.filename.lastIndexOf('.')) : '';
    const basename = data.filename.includes('.') ?
      data.filename.substring(0, data.filename.lastIndexOf('.')) : data.filename;
    
    const uniqueFilename = timestamp + '_' + basename + extension;
    
    Logger.log('[UPLOAD_FILE] Unique filename: ' + uniqueFilename);
    Logger.log('[UPLOAD_FILE] Upload path: BOP_Uploads/' + year + '/' + month + '/' + uniqueFilename);
    
    // Create file in month folder
    const file = monthFolder.createFile(fileBlob);
    file.setName(uniqueFilename);
    file.setDescription('Uploaded: ' + now.toISOString() + '\nOriginal: ' + data.filename);
    
    // Set sharing to anyone with link can view
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    const fileId = file.getId();
    const fileUrl = file.getUrl();
    const fileSize = file.getSize();
    
    Logger.log('[UPLOAD_FILE] ✅ File uploaded successfully');
    Logger.log('[UPLOAD_FILE] File ID: ' + fileId);
    Logger.log('[UPLOAD_FILE] File URL: ' + fileUrl);
    Logger.log('[UPLOAD_FILE] File Size: ' + fileSize + ' bytes');
    
    return successResponse({
      id: fileId,
      name: uniqueFilename,           // ✅ Unique name
      originalName: data.filename,    // ✅ Original name
      url: fileUrl,
      mimeType: data.mimeType,
      size: fileSize,
      uploadPath: 'BOP_Uploads/' + year + '/' + month + '/' + uniqueFilename
    });
    
  } catch (error) {
    Logger.log('[UPLOAD_FILE ERROR] ' + error.toString());
    Logger.log('[UPLOAD_FILE ERROR STACK] ' + error.stack);
    return errorResponse('Gagal upload file: ' + error.toString());
  }
}

function updateRPDConfig(data) {
  Logger.log('[UPDATE_RPD_CONFIG] Updating configuration...');
  Logger.log('[UPDATE_RPD_CONFIG] Config data:', JSON.stringify(data));
  
  try {
    const configSheet = getSheet(SHEETS.CONFIG);
    const configs = configSheet.getDataRange().getValues();
    
    // Config sheet structure: A=Key, B=Value, C=Description
    const configKeys = {
      'RPD_STATUS': data.RPD_STATUS || 'Terbuka',
      'REALISASI_STATUS': data.REALISASI_STATUS || 'Terbuka',
      'REALISASI_MAX_FILE_SIZE': data.REALISASI_MAX_FILE_SIZE || 5,
      'REALISASI_MAX_FILES': data.REALISASI_MAX_FILES || 5
    };
    
    Logger.log('[UPDATE_RPD_CONFIG] Config keys to update:', JSON.stringify(configKeys));
    
    // Update atau insert config
    Object.keys(configKeys).forEach(key => {
      let found = false;
      
      // Cari config yang sudah ada
      for (let i = 1; i < configs.length; i++) {
        if (configs[i][0] === key) {
          // Update existing config
          configSheet.getRange(i + 1, 2).setValue(configKeys[key]);
          Logger.log('[UPDATE_RPD_CONFIG] Updated ' + key + ' = ' + configKeys[key]);
          found = true;
          break;
        }
      }
      
      // Jika tidak ada, tambah baru
      if (!found) {
        const newRow = configs.length + 1;
        configSheet.getRange(newRow, 1).setValue(key);
        configSheet.getRange(newRow, 2).setValue(configKeys[key]);
        configSheet.getRange(newRow, 3).setValue('Auto-created config');
        Logger.log('[UPDATE_RPD_CONFIG] Created new ' + key + ' = ' + configKeys[key]);
      }
    });
    
    Logger.log('[UPDATE_RPD_CONFIG] Configuration updated successfully');
    return successResponse({ message: 'Konfigurasi berhasil diperbarui' });
    
  } catch (error) {
    Logger.log('[UPDATE_RPD_CONFIG ERROR] ' + error.toString());
    return errorResponse('Gagal memperbarui konfigurasi: ' + error.toString());
  }
}
// ===================================================================
// ===== AUTO PAYMENT MODULE =========================================
// ===================================================================

// AutoPaymentConfig sheet: KUA | 522111 | 522112
// AutoPaymentNominal sheet: KUA | Bulan | Tahun | Nominal_522111 | Nominal_522112

var AP_CONFIG_HEADERS = ['KUA', '522111', '522112'];
var AP_NOMINAL_HEADERS = ['KUA', 'Bulan', 'Tahun', 'Nominal_522111', 'Nominal_522112'];
var AP_POS_CODES = ['522111', '522112'];

// ------------------------------------------------------------------
// GET CONFIG - returns { kua: { '522111': bool, '522112': bool } }
// ------------------------------------------------------------------
function getAutoPaymentConfig(data) {
  Logger.log('[GET_AP_CONFIG] Loading Auto Payment Config');
  try {
    const sheet = getOrCreateSheet(SHEETS.AUTO_PAYMENT_CONFIG, AP_CONFIG_HEADERS);
    const rows = sheet.getDataRange().getValues();
    const config = {};

    for (var i = 1; i < rows.length; i++) {
      var kua = rows[i][0];
      if (!kua) continue;
      config[kua] = {
        '522111': rows[i][1] === true || rows[i][1] === 'TRUE',
        '522112': rows[i][2] === true || rows[i][2] === 'TRUE'
      };
    }

    Logger.log('[GET_AP_CONFIG] Loaded ' + Object.keys(config).length + ' KUA configs');
    return successResponse(config);
  } catch (error) {
    Logger.log('[GET_AP_CONFIG ERROR] ' + error.toString());
    return errorResponse('Gagal memuat Auto Payment Config: ' + error.toString());
  }
}

// ------------------------------------------------------------------
// SAVE CONFIG - data.config = { kua: { '522111': bool, '522112': bool } }
// ------------------------------------------------------------------
function saveAutoPaymentConfig(data) {
  Logger.log('[SAVE_AP_CONFIG] Saving Auto Payment Config');
  try {
    const sheet = getOrCreateSheet(SHEETS.AUTO_PAYMENT_CONFIG, AP_CONFIG_HEADERS);
    const config = data.config || {};
    const kuas = Object.keys(config);

    // Clear existing data (keep header)
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, AP_CONFIG_HEADERS.length).clearContent();
    }

    // Write new config
    if (kuas.length > 0) {
      var newRows = kuas.map(function(kua) {
        return [
          kua,
          config[kua]['522111'] === true,
          config[kua]['522112'] === true
        ];
      });
      sheet.getRange(2, 1, newRows.length, AP_CONFIG_HEADERS.length).setValues(newRows);
    }

    Logger.log('[SAVE_AP_CONFIG] Saved ' + kuas.length + ' KUA configs');
    return successResponse({ message: 'Konfigurasi Auto Payment berhasil disimpan' });
  } catch (error) {
    Logger.log('[SAVE_AP_CONFIG ERROR] ' + error.toString());
    return errorResponse('Gagal menyimpan Auto Payment Config: ' + error.toString());
  }
}

// ------------------------------------------------------------------
// GET NOMINAL - data.month, data.year
// returns { kua: { '522111': nominal, '522112': nominal } }
// ------------------------------------------------------------------
function getAutoPaymentNominal(data) {
  Logger.log('[GET_AP_NOMINAL] Month: ' + data.month + ', Year: ' + data.year);
  try {
    const sheet = getOrCreateSheet(SHEETS.AUTO_PAYMENT_NOMINAL, AP_NOMINAL_HEADERS);
    const rows = sheet.getDataRange().getValues();
    const result = {};

    for (var i = 1; i < rows.length; i++) {
      var kua = rows[i][0];
      var month = rows[i][1];
      var year = rows[i][2];
      if (!kua) continue;

      if ((!data.month || month === data.month) && (!data.year || year == data.year)) {
        result[kua] = {
          '522111': parseFloat(rows[i][3]) || 0,
          '522112': parseFloat(rows[i][4]) || 0,
          month: month,
          year: year
        };
      }
    }

    Logger.log('[GET_AP_NOMINAL] Found ' + Object.keys(result).length + ' entries');
    return successResponse(result);
  } catch (error) {
    Logger.log('[GET_AP_NOMINAL ERROR] ' + error.toString());
    return errorResponse('Gagal memuat Auto Payment Nominal: ' + error.toString());
  }
}

// ------------------------------------------------------------------
// SAVE NOMINAL - data.month, data.year, data.nominals = { kua: { '522111': num, '522112': num } }
// ------------------------------------------------------------------
function saveAutoPaymentNominal(data) {
  Logger.log('[SAVE_AP_NOMINAL] Month: ' + data.month + ', Year: ' + data.year);
  try {
    const sheet = getOrCreateSheet(SHEETS.AUTO_PAYMENT_NOMINAL, AP_NOMINAL_HEADERS);
    const rows = sheet.getDataRange().getValues();
    const nominals = data.nominals || {};
    const kuas = Object.keys(nominals);

    // Update existing rows or collect what's missing
    var updatedKUAs = {};
    for (var i = 1; i < rows.length; i++) {
      var kua = rows[i][0];
      var month = rows[i][1];
      var year = rows[i][2];
      if (kua && month === data.month && year == data.year && nominals[kua] !== undefined) {
        sheet.getRange(i + 1, 4).setValue(parseFloat(nominals[kua]['522111']) || 0);
        sheet.getRange(i + 1, 5).setValue(parseFloat(nominals[kua]['522112']) || 0);
        updatedKUAs[kua] = true;
      }
    }

    // Append new rows for KUAs not yet in sheet
    var newRows = [];
    kuas.forEach(function(kua) {
      if (!updatedKUAs[kua]) {
        newRows.push([
          kua,
          data.month,
          parseInt(data.year),
          parseFloat(nominals[kua]['522111']) || 0,
          parseFloat(nominals[kua]['522112']) || 0
        ]);
      }
    });
    if (newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, AP_NOMINAL_HEADERS.length).setValues(newRows);
    }

    Logger.log('[SAVE_AP_NOMINAL] Saved nominals for ' + kuas.length + ' KUAs');
    return successResponse({ message: 'Nominal Auto Payment berhasil disimpan' });
  } catch (error) {
    Logger.log('[SAVE_AP_NOMINAL ERROR] ' + error.toString());
    return errorResponse('Gagal menyimpan Nominal Auto Payment: ' + error.toString());
  }
}

// ------------------------------------------------------------------
// CALCULATE INCLUDE/EXCLUDE (used by export functions)
// mode: 'include' | 'exclude'
// ------------------------------------------------------------------
function calculateAutoPaymentTotal(realisasis, apConfig, apNominalByKua, mode) {
  var total = 0;
  realisasis.forEach(function(real) {
    var kua = real.kua;
    var cfg = apConfig && apConfig[kua] ? apConfig[kua] : null;
    var nom = apNominalByKua && apNominalByKua[kua] ? apNominalByKua[kua] : {};

    if (!real.data) {
      total += parseFloat(real.total) || 0;
      return;
    }

    var realTotal = 0;
    Object.keys(real.data).forEach(function(code) {
      var isAutoPOS = cfg && cfg[code] === true;
      if (isAutoPOS) {
        if (mode === 'include') {
          realTotal += parseFloat(nom[code] || 0);
        }
        // exclude → add 0 for this POS
      } else {
        var items = real.data[code];
        Object.values(items).forEach(function(val) {
          realTotal += parseFloat(val || 0);
        });
      }
    });

    total += realTotal;
  });
  return total;
}