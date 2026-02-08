// ===== USER MANAGEMENT SCRIPT =====
// File: user-management-script.js
// Untuk: user-management.html

// ===== GLOBAL STATE =====
let currentUser = null;
let allUsers = [];

// ===== LOAD USERS =====
async function loadUsers() {
    try {
        console.log('[USER] Loading users');
        const users = await apiCall('getUsers');
        allUsers = users || [];
        
        console.log('[USER] Users loaded:', allUsers.length);
        displayUsers();
    } catch (error) {
        console.error('[USER ERROR]', error);
        showNotification(error.message || 'Gagal memuat users', 'error');
    }
}

// ===== DISPLAY USERS =====
function displayUsers() {
    const tbody = document.querySelector('#userTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (allUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Tidak ada data pengguna</td></tr>';
        return;
    }
    
    allUsers.forEach((user, index) => {
        const tr = document.createElement('tr');
        
        // Status badge - FIXED
        const statusBadge = user.status === 'active' || !user.status 
            ? '<span class="badge badge-success">Aktif</span>' 
            : '<span class="badge badge-danger">Nonaktif</span>';
        
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${user.username || '-'}</td>
            <td>${user.name || '-'}</td>
            <td>${user.role || '-'}</td>
            <td>${user.kua || '-'}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="editUser('${user.id}')">Edit</button>
                ${user.username !== 'admin' ? 
                    `<button class="btn btn-sm btn-danger" onclick="confirmDeleteUser('${user.id}', '${user.username}')">Hapus</button>` 
                    : ''}
            </td>
        `;
        
        tbody.appendChild(tr);
    });
}

// ===== MODAL FUNCTIONS =====
function showUserModal(userId = null) {
    const modal = document.getElementById('userModal');
    if (!modal) {
        createUserModal();
    }
    
    const form = document.getElementById('userForm');
    const modalTitle = document.getElementById('modalTitle');
    
    if (userId) {
        const user = allUsers.find(u => u.id === userId);
        if (!user) return;
        
        modalTitle.textContent = 'Edit Pengguna';
        document.getElementById('userId').value = user.id;
        document.getElementById('formUsername').value = user.username;
        document.getElementById('formName').value = user.name;
        document.getElementById('formRole').value = user.role;
        document.getElementById('formKUA').value = user.kua || '';
        
        // Password optional for edit
        const passwordGroup = document.getElementById('passwordGroup');
        if (passwordGroup) {
            passwordGroup.querySelector('label').textContent = 'Password (kosongkan jika tidak diubah)';
            document.getElementById('formPassword').required = false;
        }
    } else {
        modalTitle.textContent = 'Tambah Pengguna';
        form.reset();
        document.getElementById('userId').value = '';
        
        const passwordGroup = document.getElementById('passwordGroup');
        if (passwordGroup) {
            passwordGroup.querySelector('label').textContent = 'Password';
            document.getElementById('formPassword').required = true;
        }
    }
    
    document.getElementById('userModal').classList.add('active');
}

function closeUserModal() {
    document.getElementById('userModal').classList.remove('active');
    document.getElementById('userForm').reset();
}

function createUserModal() {
    const modalHTML = `
        <div class="modal" id="userModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="modalTitle">Tambah Pengguna</h3>
                    <button class="close-btn" onclick="closeUserModal()">&times;</button>
                </div>
                <form id="userForm" onsubmit="handleUserSubmit(event)">
                    <input type="hidden" id="userId">
                    
                    <div class="form-group">
                        <label>Username *</label>
                        <input type="text" id="formUsername" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Nama Lengkap *</label>
                        <input type="text" id="formName" required>
                    </div>
                    
                    <div class="form-group" id="passwordGroup">
                        <label>Password *</label>
                        <div class="password-input-group">
                            <input type="password" id="formPassword" required minlength="6">
                            <button type="button" class="password-toggle" onclick="togglePassword('formPassword')">👁️</button>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Role *</label>
                        <select id="formRole" required onchange="toggleKUAField()">
                            <option value="">Pilih Role</option>
                            <option value="Admin">Admin</option>
                            <option value="Operator KUA">Operator KUA</option>
                        </select>
                    </div>
                    
                    <div class="form-group" id="kuaGroup" style="display: none;">
                        <label>KUA *</label>
                        <select id="formKUA">
                            <option value="">Pilih KUA</option>
                            <option value="Anjatan">Anjatan</option>
                            <option value="Arahan">Arahan</option>
                            <option value="Balongan">Balongan</option>
                            <option value="Bantarujeg">Bantarujeg</option>
                            <option value="Bongas">Bongas</option>
                            <option value="Cantigi">Cantigi</option>
                            <option value="Cikedung">Cikedung</option>
                            <option value="Gabuswetan">Gabuswetan</option>
                            <option value="Gantar">Gantar</option>
                            <option value="Haurgeulis">Haurgeulis</option>
                            <option value="Indramayu">Indramayu</option>
                            <option value="Jatibarang">Jatibarang</option>
                            <option value="Juntinyuat">Juntinyuat</option>
                            <option value="Kandanghaur">Kandanghaur</option>
                            <option value="Karangampel">Karangampel</option>
                            <option value="Kertasemaya">Kertasemaya</option>
                            <option value="Krangkeng">Krangkeng</option>
                            <option value="Lelea">Lelea</option>
                            <option value="Lohbener">Lohbener</option>
                            <option value="Losarang">Losarang</option>
                            <option value="Patrol">Patrol</option>
                            <option value="Sliyeg">Sliyeg</option>
                            <option value="Sukagumiwang">Sukagumiwang</option>
                            <option value="Sukra">Sukra</option>
                            <option value="Sindang">Sindang</option>
                            <option value="Terisi">Terisi</option>
                            <option value="Tukdana">Tukdana</option>
                            <option value="Widasari">Widasari</option>
                        </select>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button type="submit" class="btn" style="flex: 1;">Simpan</button>
                        <button type="button" class="btn btn-secondary" onclick="closeUserModal()" style="flex: 1;">Batal</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function toggleKUAField() {
    const role = document.getElementById('formRole').value;
    const kuaGroup = document.getElementById('kuaGroup');
    const kuaSelect = document.getElementById('formKUA');
    
    if (role === 'Operator KUA') {
        kuaGroup.style.display = 'block';
        kuaSelect.required = true;
    } else {
        kuaGroup.style.display = 'none';
        kuaSelect.required = false;
        kuaSelect.value = '';
    }
}

// ===== SUBMIT HANDLER =====
async function handleUserSubmit(event) {
    event.preventDefault();
    
    const userId = document.getElementById('userId').value;
    const username = document.getElementById('formUsername').value;
    const name = document.getElementById('formName').value;
    const password = document.getElementById('formPassword').value;
    const role = document.getElementById('formRole').value;
    const kua = document.getElementById('formKUA').value;
    
    // Validation
    if (role === 'Operator KUA' && !kua) {
        showNotification('KUA harus dipilih untuk Operator KUA', 'error');
        return;
    }
    
    try {
        const userData = {
            id: userId || null,
            username,
            name,
            role,
            kua: role === 'Operator KUA' ? kua : ''
        };
        
        // Only send password if it's filled
        if (password) {
            userData.password = password;
        }
        
        await apiCall('saveUser', userData);
        
        showNotification(userId ? 'User berhasil diupdate' : 'User berhasil ditambahkan', 'success');
        closeUserModal();
        loadUsers();
    } catch (error) {
        showNotification(error.message || 'Gagal menyimpan user', 'error');
    }
}

// ===== DELETE USER =====
function confirmDeleteUser(userId, username) {
    if (confirm(`Apakah Anda yakin ingin menghapus user "${username}"?`)) {
        deleteUser(userId);
    }
}

async function deleteUser(userId) {
    try {
        await apiCall('deleteUser', { id: userId });
        showNotification('User berhasil dihapus', 'success');
        loadUsers();
    } catch (error) {
        showNotification(error.message || 'Gagal menghapus user', 'error');
    }
}

// ===== EDIT USER =====
function editUser(userId) {
    showUserModal(userId);
}

// ===== NAVIGATION =====
function backToMenu() {
    window.location.href = 'main-menu.html';
}

// ✅ FIXED: Use simple confirm() instead of custom dialog
function logout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        SessionManager.clearUser();
        AppCache.clear(); // Clear cache on logout
        window.location.href = 'index.html';
    }
}

// ===== INITIALIZATION =====
window.addEventListener('DOMContentLoaded', function() {
    console.log('[USER-MGMT] DOM Content Loaded');
    
    // ✅ CRITICAL FIX: Use SessionManager from config.js (window scope)
    currentUser = SessionManager.getCurrentUser();
    
    console.log('[USER-MGMT] Current user:', currentUser);
    
    if (!currentUser) {
        console.log('[USER-MGMT] No user session, redirecting to login');
        showNotification('Sesi Anda telah berakhir. Silakan login kembali.', 'warning');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        return;
    }
    
    // Only Admin can access
    if (currentUser.role !== 'Admin') {
        console.log('[USER-MGMT] Access denied for role:', currentUser.role);
        showNotification('Akses ditolak. Hanya Admin yang dapat mengakses halaman ini.', 'error');
        setTimeout(() => {
            window.location.href = 'main-menu.html';
        }, 2000);
        return;
    }
    
    console.log('[USER-MGMT] Admin access granted');
    
    // Display user info
    const userNameEl = document.getElementById('userNameDisplay');
    const userRoleEl = document.getElementById('userRoleDisplay');
    
    if (userNameEl) userNameEl.textContent = currentUser.name;
    if (userRoleEl) userRoleEl.textContent = currentUser.role;
    
    // Load users
    loadUsers();
});

// Expose functions to global scope
window.showUserModal = showUserModal;
window.closeUserModal = closeUserModal;
window.toggleKUAField = toggleKUAField;
window.handleUserSubmit = handleUserSubmit;
window.editUser = editUser;
window.confirmDeleteUser = confirmDeleteUser;
window.backToMenu = backToMenu;
window.logout = logout;