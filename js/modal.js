// ===== MODAL HELPER FUNCTIONS =====
// Add this to your JavaScript files (bop-script.js, bmn-script.js, nikah-script.js)

/**
 * Create a modern modal structure
 * @param {Object} options - Modal configuration
 * @returns {HTMLElement} - Modal element
 */
function createModernModal(options) {
    const {
        id = 'modernModal',
        title = 'Modal Title',
        subtitle = '',
        size = 'md', // sm, md, lg, xl
        body = '',
        footer = '',
        onClose = null
    } = options;
    
    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal-overlay';
    
    const sizeClass = size !== 'md' ? `modal-${size}` : '';
    
    modal.innerHTML = `
        <div class="modal-dialog ${sizeClass}">
            <div class="modal-header-modern">
                <h3>${title}</h3>
                ${subtitle ? `<p class="modal-subtitle">${subtitle}</p>` : ''}
                <button type="button" class="modal-close" onclick="closeModal('${id}')">&times;</button>
            </div>
            <div class="modal-body-modern">
                ${body}
            </div>
            ${footer ? `<div class="modal-footer-modern">${footer}</div>` : ''}
        </div>
    `;
    
    // Close on overlay click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal(id);
            if (onClose) onClose();
        }
    });
    
    // Close on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && document.getElementById(id)) {
            closeModal(id);
            if (onClose) onClose();
        }
    });
    
    return modal;
}

/**
 * Close and remove modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
    }
}

/**
 * Create form group for modal
 */
function createFormGroup(options) {
    const {
        label = '',
        name = '',
        type = 'text',
        value = '',
        required = false,
        disabled = false,
        placeholder = '',
        hint = '',
        options: selectOptions = []
    } = options;
    
    const requiredClass = required ? 'required' : '';
    
    let inputHtml = '';
    
    if (type === 'select') {
        inputHtml = `
            <select name="${name}" id="${name}" ${required ? 'required' : ''} ${disabled ? 'disabled' : ''}>
                ${selectOptions.map(opt => `
                    <option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>
                        ${opt.label}
                    </option>
                `).join('')}
            </select>
        `;
    } else if (type === 'textarea') {
        inputHtml = `
            <textarea 
                name="${name}" 
                id="${name}" 
                ${required ? 'required' : ''} 
                ${disabled ? 'disabled' : ''}
                placeholder="${placeholder}"
            >${value}</textarea>
        `;
    } else {
        inputHtml = `
            <input 
                type="${type}" 
                name="${name}" 
                id="${name}" 
                value="${value}"
                ${required ? 'required' : ''} 
                ${disabled ? 'disabled' : ''}
                placeholder="${placeholder}"
            />
        `;
    }
    
    return `
        <div class="modal-form-group">
            <label for="${name}" class="${requiredClass}">${label}</label>
            ${inputHtml}
            ${hint ? `<span class="form-hint">${hint}</span>` : ''}
        </div>
    `;
}

/**
 * Create modal section with title
 */
function createModalSection(icon, title, content) {
    return `
        <div class="modal-section">
            <div class="modal-section-title">
                ${icon ? `<span class="section-icon">${icon}</span>` : ''}
                <span>${title}</span>
            </div>
            ${content}
        </div>
    `;
}

/**
 * Create info box in modal
 */
function createInfoBox(type, title, message) {
    return `
        <div class="modal-info-box ${type}">
            ${title ? `<h4>${title}</h4>` : ''}
            <p>${message}</p>
        </div>
    `;
}

/**
 * Create budget detail item
 */
function createBudgetDetail(label, value) {
    return `
        <div class="budget-detail-item">
            <div class="budget-detail-label">${label}</div>
            <div class="budget-detail-value">${value}</div>
        </div>
    `;
}

// ===== EXAMPLE USAGE =====

/* 
// Example 1: Simple Form Modal
const modal = createModernModal({
    id: 'budgetModal',
    title: 'Tambah Budget',
    subtitle: 'Masukkan data budget KUA',
    size: 'md',
    body: `
        <form id="budgetForm">
            ${createFormGroup({
                label: 'KUA',
                name: 'kua',
                type: 'select',
                required: true,
                options: APP_CONFIG.KUA_LIST.map(kua => ({
                    value: kua,
                    label: kua
                }))
            })}
            ${createFormGroup({
                label: 'Tahun',
                name: 'year',
                type: 'number',
                value: '2026',
                required: true
            })}
            ${createFormGroup({
                label: 'Total Budget',
                name: 'budget',
                type: 'number',
                required: true,
                placeholder: 'Masukkan total budget'
            })}
        </form>
    `,
    footer: `
        <button type="button" class="btn btn-secondary" onclick="closeModal('budgetModal')">
            Batal
        </button>
        <button type="submit" form="budgetForm" class="btn btn-primary">
            💾 Simpan Budget
        </button>
    `
});

document.body.appendChild(modal);

// Example 2: View/Detail Modal
const detailModal = createModernModal({
    id: 'detailModal',
    title: 'Detail Realisasi',
    subtitle: 'KUA Indramayu - Januari 2026',
    size: 'lg',
    body: `
        ${createInfoBox('info', 'Status', 'Menunggu verifikasi dari Admin')}
        
        ${createModalSection('💰', 'Informasi Budget', `
            <div class="budget-details-grid">
                ${createBudgetDetail('Total Budget', 'Rp 50.000.000')}
                ${createBudgetDetail('Total RPD', 'Rp 45.000.000')}
                ${createBudgetDetail('Total Realisasi', 'Rp 40.000.000')}
                ${createBudgetDetail('Sisa Budget', 'Rp 10.000.000')}
            </div>
        `)}
        
        ${createModalSection('📋', 'Detail Item', `
            <table class="modal-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Jumlah</th>
                        <th>Harga</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>ATK Kantor</td>
                        <td>1</td>
                        <td>Rp 5.000.000</td>
                        <td>Rp 5.000.000</td>
                    </tr>
                </tbody>
            </table>
        `)}
    `,
    footer: `
        <button type="button" class="btn btn-secondary" onclick="closeModal('detailModal')">
            Tutup
        </button>
    `
});

document.body.appendChild(detailModal);

// Example 3: Export Modal
const exportModal = createModernModal({
    id: 'exportModal',
    title: 'Export Data',
    subtitle: 'Pilih jenis dan periode export',
    size: 'sm',
    body: `
        <form id="exportForm">
            ${createFormGroup({
                label: 'Jenis Export',
                name: 'exportType',
                type: 'select',
                required: true,
                options: [
                    { value: 'monthly', label: 'Bulanan' },
                    { value: 'yearly', label: 'Tahunan' }
                ]
            })}
            ${createFormGroup({
                label: 'Bulan',
                name: 'month',
                type: 'select',
                required: true,
                options: APP_CONFIG.MONTHS.map((month, idx) => ({
                    value: idx + 1,
                    label: month
                }))
            })}
            ${createFormGroup({
                label: 'Tahun',
                name: 'year',
                type: 'select',
                required: true,
                options: [2024, 2025, 2026, 2027].map(year => ({
                    value: year,
                    label: year
                }))
            })}
        </form>
    `,
    footer: `
        <button type="button" class="btn btn-secondary" onclick="closeModal('exportModal')">
            Batal
        </button>
        <button type="submit" form="exportForm" class="btn btn-success">
            📥 Download Excel
        </button>
    `
});

document.body.appendChild(exportModal);
*/

// Expose functions globally
window.createModernModal = createModernModal;
window.closeModal = closeModal;
window.createFormGroup = createFormGroup;
window.createModalSection = createModalSection;
window.createInfoBox = createInfoBox;
window.createBudgetDetail = createBudgetDetail;