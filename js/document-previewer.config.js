/**
 * ================================================================
 *  document-previewer.config.js
 *  Konfigurasi DocumentPreviewer untuk BOP Dashboard
 *
 *  ⚠️  ISI API KEY DI SINI — jangan hardcode di file lain
 * ================================================================
 */

const MY_DP_CONFIG = {

    /* ── WAJIB — Google Drive API Key ───────────────────────────
       Cara dapat: console.cloud.google.com
         → Buat project → Enable "Google Drive API"
         → Credentials → Create Credentials → API Key
       Pastikan file Drive di-share "Anyone with the link can view"
    ────────────────────────────────────────────────────────── */
    googleDriveApiKey : 'AIzaSyD2eR04ppTnLInBPfVi7kwh3akCKz9F8DQ',


    /* ── MODAL ID ────────────────────────────────────────────────
       Jangan diubah — BOP memakai 'dp-modal-vfy' untuk verifikasi
    ────────────────────────────────────────────────────────── */
    modalId           : 'dp-modal',


    /* ── ZOOM ────────────────────────────────────────────────────*/
    zoomStep          : 0.25,
    zoomMin           : 0.25,
    zoomMax           : 5.0,
    wheelZoomStep     : 0.1,


    /* ── PDF ─────────────────────────────────────────────────────*/
    pdfScale          : 1.5,
    pdfWorkerUrl      : 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    pdfCmapUrl        : 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',


    /* ── DEBUG ───────────────────────────────────────────────────
       Ubah ke true untuk lihat log detail di Console (F12)
    ────────────────────────────────────────────────────────── */
    debug             : false,


    /* ── CALLBACKS ───────────────────────────────────────────────*/
    onOpen  : null,
    onClose : null,
    onError : null
};