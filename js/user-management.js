// ===== USER MANAGEMENT SCRIPT =====
// File: user-management.js
// Untuk: user-management.html

let currentUser = null;
let allUsers = [];
let currentEditUser = null;

// ===== INITIALIZE PAGE =====
window.addEventListener('DOMContentLoaded', function() {
    debugLog('USER_MGMT', 'Initializing user management page');
    
    currentUser = SessionManager.getCurrentUser();
    
    if (!currentUser) {
        debugLog('USER_MGMT', 'No user session, redirecting to login');
        window.location.href = 'index.html';
        return;
    }
    
    // Only Admin can access
    if (currentUser.role !== 'Admin') {
        showNotification('Akses ditolak. Hanya Admin yang dapat mengakses halaman ini.', 'error');
        setTimeout(() => {
            window.location.href = 'main-menu.html';
        }, 2000);
        return;
    }
    
    // Display user info
    document.getElementById('userNameDisplay').textContent = currentUser.name;
    document.getElementById('userRoleDisplay').textContent = currentUser.role;
    
    // Create modal
    createUserModal();
    
    // Load users
    loadUsers();
});

// ===== LOAD USERS =====
async function loadUsers() {
    debugLog('USER_MGMT', 'Loading users');
    
    try {
        allUsers = await apiCall('getUsers', {});
        displayUsers();
    } catch (error) {
        debugLog('USER_MGMT', 'Error loading users', error);
        showNotification('Gagal memuat data pengguna', 'error');
    }
}

// ===== DISPLAY USERS =====
function displayUsers() {
    const tbody = document.querySelector('#userTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (allUsers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #999;">
                    Tidak ada data pengguna
                </td>
            </tr>
        `;
        return;
    }
    
    allUsers.forEach((user, index) => {
        const tr = document.createElement('tr');
        
        // Format created date
        let createdDate = '-';
        if (user.created && user.created !== '') {
            try {
                const date = new Date(user.created);
                if (!isNaN(date.getTime())) {
                    createdDate = date.toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                }
            } catch (e) {
                createdDate = '-';
            }
        }
        
        // Status badge
        const statusBadge = user.role === 'Admin' 
            ? '<span class="badge badge-danger">Admin</span>' 
            : '<span class="badge badge-success">Aktif</span>';
        
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(user.username)}</strong></td>
            <td>${escapeHtml(user.name)}</td>
            <td>${escapeHtml(user.role)}</td>
            <td>${user.kua ? escapeHtml(user.kua) : '-'}</td>
            <td>${statusBadge}</td>
            <td>${createdDate}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="editUser('${user.id}')">
                    ✏️ Edit
                </button>
                ${user.role !== 'Admin' ? `
                    <button class="btn btn-sm btn-danger" onclick="confirmDeleteUser('${user.id}', '${escapeHtml(user.name)}')">
                        🗑️ Hapus
                    </button>
                ` : ''}
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    debugLog('USER_MGMT', `Displayed ${allUsers.length} users`);
}

// ===== SHOW USER MODAL =====
function showUserModal() {
    currentEditUser = null;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('userModal');
    if (existingModal) existingModal.remove();
    
    const modal = createModernModal({
        id: 'userModal',
        title: 'Tambah Pengguna',
        subtitle: 'Masukkan data pengguna baru',
        size: 'md',
        body: `
            <form id="userForm" onsubmit="handleSaveUser(event)">
                ${createFormGroup({
                    label: 'Username',
                    name: 'userUsername',
                    type: 'text',
                    required: true,
                    placeholder: 'Masukkan username',
                    hint: 'Username harus unik dan tidak boleh sama'
                })}
                
                ${createFormGroup({
                    label: 'Password',
                    name: 'userPassword',
                    type: 'password',
                    required: true,
                    placeholder: 'Minimal 6 karakter',
                    hint: 'Password minimal 6 karakter'
                })}
                
                ${createFormGroup({
                    label: 'Nama Lengkap',
                    name: 'userName',
                    type: 'text',
                    required: true,
                    placeholder: 'Masukkan nama lengkap'
                })}
                
                ${createFormGroup({
                    label: 'Role',
                    name: 'userRole',
                    type: 'select',
                    required: true,
                    options: [
                        { value: '', label: 'Pilih Role' },
                        { value: 'Admin', label: 'Admin' },
                        { value: 'Operator', label: 'Operator' }
                    ]
                })}
                
                <div id="kuaGroup" style="display: none;">
                    ${createFormGroup({
                        label: 'KUA',
                        name: 'userKUA',
                        type: 'select',
                        options: [
                            { value: '', label: 'Pilih KUA' },
                            ...APP_CONFIG.KUA_LIST.map(kua => ({
                                value: kua,
                                label: kua
                            }))
                        ]
                    })}
                </div>
            </form>
        `,
        footer: `
            <button type="button" class="btn btn-secondary" onclick="closeModernModal('userModal')">
                Batal
            </button>
            <button type="submit" form="userForm" class="btn btn-primary">
                💾 Simpan
            </button>
        `
    });
    
    document.body.appendChild(modal);
    
    // Add event listener for role change
    document.getElementById('userRole').addEventListener('change', handleRoleChange);
    document.getElementById('userPassword').required = true;
}

// ===== EDIT USER =====
function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;
    
    currentEditUser = user;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('userModal');
    if (existingModal) existingModal.remove();
    
    const modal = createModernModal({
        id: 'userModal',
        title: 'Edit Pengguna',
        subtitle: `Mengubah data pengguna: ${user.name}`,
        size: 'md',
        body: `
            <form id="userForm" onsubmit="handleSaveUser(event)">
                ${createFormGroup({
                    label: 'Username',
                    name: 'userUsername',
                    type: 'text',
                    value: user.username,
                    required: true,
                    placeholder: 'Masukkan username',
                    hint: 'Username harus unik dan tidak boleh sama'
                })}
                
                ${createFormGroup({
                    label: 'Password',
                    name: 'userPassword',
                    type: 'password',
                    placeholder: 'Kosongkan jika tidak ingin mengubah',
                    hint: 'Password minimal 6 karakter. Kosongkan jika tidak ingin mengubah.'
                })}
                
                ${createFormGroup({
                    label: 'Nama Lengkap',
                    name: 'userName',
                    type: 'text',
                    value: user.name,
                    required: true,
                    placeholder: 'Masukkan nama lengkap'
                })}
                
                ${createFormGroup({
                    label: 'Role',
                    name: 'userRole',
                    type: 'select',
                    value: user.role,
                    required: true,
                    options: [
                        { value: '', label: 'Pilih Role' },
                        { value: 'Admin', label: 'Admin' },
                        { value: 'Operator', label: 'Operator' }
                    ]
                })}
                
                <div id="kuaGroup" style="${user.role === 'Operator' ? 'display: block;' : 'display: none;'}">
                    ${createFormGroup({
                        label: 'KUA',
                        name: 'userKUA',
                        type: 'select',
                        value: user.kua || '',
                        options: [
                            { value: '', label: 'Pilih KUA' },
                            ...APP_CONFIG.KUA_LIST.map(kua => ({
                                value: kua,
                                label: kua
                            }))
                        ]
                    })}
                </div>
            </form>
        `,
        footer: `
            <button type="button" class="btn btn-secondary" onclick="closeModernModal('userModal')">
                Batal
            </button>
            <button type="submit" form="userForm" class="btn btn-primary">
                💾 Update
            </button>
        `
    });
    
    document.body.appendChild(modal);
    
    // Add event listener for role change
    document.getElementById('userRole').addEventListener('change', handleRoleChange);
    
    // Set KUA field required if Operator
    if (user.role === 'Operator') {
        document.getElementById('userKUA').required = true;
    }
    
    // Password is optional for edit
    document.getElementById('userPassword').required = false;
}

// ===== HANDLE ROLE CHANGE =====
function handleRoleChange() {
    const role = document.getElementById('userRole').value;
    const kuaGroup = document.getElementById('kuaGroup');
    const kuaSelect = document.getElementById('userKUA');
    
    if (role === 'Operator') {
        kuaGroup.style.display = 'block';
        kuaSelect.required = true;
    } else {
        kuaGroup.style.display = 'none';
        kuaSelect.required = false;
        kuaSelect.value = '';
    }
}

// ===== SAVE USER =====
async function handleSaveUser(event) {
    event.preventDefault();
    
    const username = document.getElementById('userUsername').value.trim();
    const password = document.getElementById('userPassword').value;
    const name = document.getElementById('userName').value.trim();
    const role = document.getElementById('userRole').value;
    const kua = document.getElementById('userKUA').value;
    
    // Validation
    if (!username || !name || !role) {
        showNotification('Semua field wajib harus diisi', 'error');
        return;
    }
    
    if (role === 'Operator' && !kua) {
        showNotification('KUA harus dipilih untuk role Operator', 'error');
        return;
    }
    
    // ✅ PERBAIKAN: Check duplicate username
    if (!currentEditUser) {
        // Saat tambah baru, cek username tidak boleh sama
        const existingUser = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (existingUser) {
            showNotification(`Username "${username}" sudah digunakan. Gunakan username lain.`, 'error');
            document.getElementById('userUsername').focus();
            return;
        }
        
        // Password wajib saat tambah baru
        if (!password) {
            showNotification('Password harus diisi untuk pengguna baru', 'error');
            return;
        }
        
        if (password.length < 6) {
            showNotification('Password minimal 6 karakter', 'error');
            return;
        }
    } else {
        // Saat edit, cek username tidak boleh sama dengan user lain
        const existingUser = allUsers.find(u => 
            u.username.toLowerCase() === username.toLowerCase() && 
            u.id !== currentEditUser.id
        );
        if (existingUser) {
            showNotification(`Username "${username}" sudah digunakan oleh pengguna lain.`, 'error');
            document.getElementById('userUsername').focus();
            return;
        }
        
        // Password optional saat edit
        if (password && password.length < 6) {
            showNotification('Password minimal 6 karakter', 'error');
            return;
        }
    }
    
    try {
        const userData = {
            id: currentEditUser ? currentEditUser.id : null,
            username: username,
            name: name,
            role: role,
            kua: role === 'Operator' ? kua : ''
        };
        
        // Only include password if provided
        if (password) {
            userData.password = password;
        }
        
        const result = await apiCall('saveUser', userData);
        
        showNotification(result.message || 'Pengguna berhasil disimpan', 'success');
        closeUserModal();
        
        // Reload users
        await loadUsers();
    } catch (error) {
        debugLog('USER_MGMT', 'Error saving user', error);
        showNotification(error.message || 'Gagal menyimpan pengguna', 'error');
    }
}

// ===== CONFIRM DELETE USER =====
function confirmDeleteUser(userId, userName) {
    showCustomConfirm(
        `Apakah Anda yakin ingin menghapus pengguna "${userName}"?`,
        async function() {
            // User confirmed
            await deleteUser(userId);
        },
        function() {
            // User cancelled - do nothing
        }
    );
}

// ===== DELETE USER =====
async function deleteUser(userId) {
    try {
        const result = await apiCall('deleteUser', { id: userId });
        
        showNotification(result.message || 'Pengguna berhasil dihapus', 'success');
        
        // Reload users
        await loadUsers();
    } catch (error) {
        debugLog('USER_MGMT', 'Error deleting user', error);
        showNotification(error.message || 'Gagal menghapus pengguna', 'error');
    }
}

// ===== CLOSE MODAL =====
function closeUserModal() {
    closeModernModal('userModal');
    currentEditUser = null;
}

// ===== UTILITY =====
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function backToMenu() {
    window.location.href = 'main-menu.html';
}

function logout() {
    showLogoutConfirmDialog(
        function() {
            SessionManager.clearUser();
            window.location.href = 'index.html';
        },
        function() {
            // Cancelled
        }
    );
}

// ===== EXPOSE TO GLOBAL =====
window.showUserModal = showUserModal;
window.editUser = editUser;
window.confirmDeleteUser = confirmDeleteUser;
window.backToMenu = backToMenu;
window.logout = logout;