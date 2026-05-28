/* ======================================================
   LOGIN.JS — Web GIS Pertanahan Karangdowo
   Role-based Access: Administrator & User
   ====================================================== */

/* ===== HARDCODED ADMIN ACCOUNTS =====
   Only these accounts have administrator privileges.
   Admins can: add/edit/delete layers, manage map data,
               access admin panel, manage user info.
   In production: move credentials to server-side auth.
   ======================================= */
const ADMIN_ACCOUNTS = [
    {
        id: 'admin-001',
        name: 'Administrator Utama',
        username: 'admin',
        email: 'admin@karangdowo.go.id',
        password: 'Admin@2025',
        role: 'admin',
        avatar: 'AU'
    },
    {
        id: 'admin-002',
        name: 'Kepala Seksi Pertanahan',
        username: 'kasi',
        email: 'kasi@karangdowo.go.id',
        password: 'Kasi@2025',
        role: 'admin',
        avatar: 'KP'
    },
    {
        id: 'admin-003',
        name: 'Operator GIS',
        username: 'operator',
        email: 'operator@karangdowo.go.id',
        password: 'Operator@2025',
        role: 'admin',
        avatar: 'OG'
    }
];

/* ===== ROLE CAPABILITIES =====
   admin : view + edit layers + add/delete features + manage data
   user  : view only — no editing, no layer management
   guest : view only — limited data access, no account features
   ======================================= */

/* ===== USER STORE (localStorage) ===== */
const USERS_KEY   = 'sip_karangdowo_users';
const SESSION_KEY = 'sip_karangdowo_session';

function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
    catch { return []; }
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getActiveSession() {
    try {
        const local   = JSON.parse(localStorage.getItem(SESSION_KEY));
        const session = JSON.parse(sessionStorage.getItem(SESSION_KEY));
        return local || session || null;
    } catch { return null; }
}

function saveSession(user, remember = false) {
    // Strip password before saving to storage
    const session = {
        id:           user.id,
        name:         user.name,
        username:     user.username || null,
        email:        user.email || null,
        role:         user.role,
        avatar:       user.avatar || '?',
        sessionStart: Date.now()
    };
    if (remember) {
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } else {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
}

/* ===== REDIRECT BY ROLE ===== */
function getRedirectByRole(user) {
    // All roles go to the main map page; role-based
    // UI elements are toggled there via SIP.applyRoleVisibility()
    return 'index.html';
}

/* ===== REDIRECT BY ROLE ===== */
function getRedirectByRole(user) {
    // Jika peran adalah admin, arahkan ke halaman khusus admin
    if (user && user.role === 'admin') {
        // Silakan ubah 'admin.html' dengan nama file/URL halaman admin yang nantinya Anda buat
        return 'adminpage.html'; 
    }
    
    // Untuk role 'user' (pengguna terdaftar) dan 'guest' (tamu), arahkan ke halaman utama
    return 'index.html';
}

/* ===== TAB SWITCHING ===== */
function switchTab(tab) {
    ['login', 'register', 'forgot'].forEach(s => {
        const el = document.getElementById('section-' + s);
        if (el) el.style.display = 'none';
    });
    const target = document.getElementById('section-' + tab);
    if (target) {
        target.style.display = 'block';
        target.style.animation = 'panelFadeIn 0.35s ease both';
    }
    document.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
    const activeTab = document.getElementById('tab-' + tab);
    if (activeTab) activeTab.classList.add('active');
    clearAlerts();
}

function showForgot(e) {
    e.preventDefault();
    switchTab('forgot');
}

/* ===== ALERT HELPERS ===== */
function showAlert(id, message, type = 'error') {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = 'form-alert ' + type;
    const icon = type === 'error'   ? 'fa-exclamation-circle'
               : type === 'success' ? 'fa-check-circle'
               :                      'fa-info-circle';
    el.innerHTML = `<i class="fa ${icon}"></i> ${message}`;
    el.style.display = 'flex';
}

function clearAlerts() {
    document.querySelectorAll('.form-alert').forEach(el => {
        el.style.display = 'none';
        el.className = 'form-alert';
    });
    document.querySelectorAll('.form-input').forEach(el => el.classList.remove('input-error'));
}

/* ===== BUTTON LOADING STATE ===== */
function setButtonLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    const textEl = btn.querySelector('.btn-login-text');
    const loadEl = btn.querySelector('.btn-login-loading');
    if (textEl) textEl.style.display = loading ? 'none' : 'flex';
    if (loadEl) loadEl.style.display = loading ? 'flex' : 'none';
}

/* ===== PASSWORD TOGGLE ===== */
function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon  = btn.querySelector('i');
    if (!input || !icon) return;
    if (input.type === 'password') {
        input.type     = 'text';
        icon.className = 'fa fa-eye-slash';
    } else {
        input.type     = 'password';
        icon.className = 'fa fa-eye';
    }
}

/* ===== PASSWORD STRENGTH ===== */
const regPasswordInput = document.getElementById('reg-password');
if (regPasswordInput) {
    regPasswordInput.addEventListener('input', () => {
        const val   = regPasswordInput.value;
        const fill  = document.getElementById('pw-strength-fill');
        const label = document.getElementById('pw-strength-label');
        if (!fill || !label) return;

        let score = 0;
        if (val.length >= 8)          score++;
        if (/[A-Z]/.test(val))        score++;
        if (/[0-9]/.test(val))        score++;
        if (/[^A-Za-z0-9]/.test(val)) score++;

        const levels = [
            { pct: '0%',   color: 'transparent', text: '',       textColor: 'transparent' },
            { pct: '25%',  color: '#e74c3c',      text: 'Lemah',  textColor: '#e74c3c' },
            { pct: '55%',  color: '#e67e22',      text: 'Cukup',  textColor: '#e67e22' },
            { pct: '80%',  color: '#ffc107',      text: 'Sedang', textColor: '#ffc107' },
            { pct: '100%', color: '#2ecc71',      text: 'Kuat',   textColor: '#2ecc71' },
        ];
        const lvl = levels[score] || levels[0];
        fill.style.width      = val.length === 0 ? '0%' : lvl.pct;
        fill.style.background = lvl.color;
        label.textContent     = val.length === 0 ? '' : lvl.text;
        label.style.color     = lvl.textColor;
    });
}

/* ===== INPUT ERROR CLEAR ===== */
document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('input', () => input.classList.remove('input-error'));
});

/* ===== VALIDATION ===== */
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function markError(inputId) {
    const el = document.getElementById(inputId);
    if (el) el.classList.add('input-error');
}

/* ===== ROLE BADGE (inline HTML snippet) ===== */
function roleBadge(role) {
    const cfg = {
        admin: { label: 'ADMINISTRATOR', color: '#ffc107', bg: 'rgba(255,193,7,0.2)', border: 'rgba(255,193,7,0.4)' },
        user:  { label: 'USER',          color: '#5aa6ff', bg: 'rgba(23,101,196,0.2)', border: 'rgba(23,101,196,0.4)' },
        guest: { label: 'TAMU',          color: '#aaa',    bg: 'rgba(255,255,255,0.08)', border: 'rgba(255,255,255,0.2)' },
    };
    const c = cfg[role] || cfg.guest;
    return ` <span style="background:${c.bg};color:${c.color};border:1px solid ${c.border};border-radius:4px;padding:1px 8px;font-size:11px;font-weight:700;letter-spacing:0.5px;">${c.label}</span>`;
}

/* ===== HANDLE LOGIN ===== */
function handleLogin() {
    clearAlerts();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const remember = document.getElementById('remember-me').checked;

    if (!username) {
        markError('login-username');
        showAlert('login-alert', 'Mohon isi username atau email.', 'error');
        return;
    }
    if (!password) {
        markError('login-password');
        showAlert('login-alert', 'Mohon isi password.', 'error');
        return;
    }

    setButtonLoading('btn-login', true);

    setTimeout(() => {
        // 1. Check hardcoded admin accounts
        const admin = ADMIN_ACCOUNTS.find(a =>
            (a.username === username || a.email === username) && a.password === password
        );
        if (admin) {
            saveSession(admin, remember);
            showAlert('login-alert',
                `Selamat datang, ${admin.name}!${roleBadge('admin')} Mengalihkan...`,
                'success'
            );
            setTimeout(() => window.location.href = getRedirectByRole(admin), 1400);
            return;
        }

        // 2. Check registered user accounts
        const users = getUsers();
        const user  = users.find(u =>
            (u.email === username || u.username === username) && u.password === password
        );
        if (!user) {
            setButtonLoading('btn-login', false);
            markError('login-username');
            markError('login-password');
            showAlert('login-alert', 'Username/email atau password salah.', 'error');
            return;
        }

        saveSession(user, remember);
        showAlert('login-alert',
            `Selamat datang, ${user.name}!${roleBadge('user')} Mengalihkan...`,
            'success'
        );
        setTimeout(() => window.location.href = getRedirectByRole(user), 1400);

    }, 900);
}

/* ===== HANDLE REGISTER =====
   Registration always creates 'user' role.
   Admin accounts are pre-defined only.
   ======================================= */
function handleRegister() {
    clearAlerts();
    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-confirm').value;
    const agreed   = document.getElementById('agree-terms').checked;

    if (!name) {
        markError('reg-name');
        showAlert('register-alert', 'Mohon isi nama lengkap.', 'error');
        return;
    }
    if (!isValidEmail(email)) {
        markError('reg-email');
        showAlert('register-alert', 'Format email tidak valid.', 'error');
        return;
    }
    if (password.length < 8) {
        markError('reg-password');
        showAlert('register-alert', 'Password minimal 8 karakter.', 'error');
        return;
    }
    if (password !== confirm) {
        markError('reg-confirm');
        showAlert('register-alert', 'Konfirmasi password tidak cocok.', 'error');
        return;
    }
    if (!agreed) {
        showAlert('register-alert', 'Anda harus menyetujui syarat & ketentuan.', 'error');
        return;
    }

    // Block admin email domain from public registration
    if (email.toLowerCase().endsWith('@karangdowo.go.id')) {
        markError('reg-email');
        showAlert('register-alert', 'Domain email ini tidak diizinkan untuk pendaftaran umum.', 'error');
        return;
    }

    setButtonLoading('btn-register', true);

    setTimeout(() => {
        const users = getUsers();
        if (users.find(u => u.email === email)) {
            setButtonLoading('btn-register', false);
            markError('reg-email');
            showAlert('register-alert', 'Email sudah terdaftar. Silakan masuk.', 'error');
            return;
        }

        const newUser = {
            id:        Date.now(),
            name,
            email,
            username:  email.split('@')[0],
            password,  // NOTE: always hash passwords in production!
            role:      'user',  // ← public registration always yields 'user'
            avatar:    name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase(),
            createdAt: new Date().toISOString()
        };
        users.push(newUser);
        saveUsers(users);
        saveSession(newUser, false);

        showAlert('register-alert',
            `Akun berhasil dibuat!${roleBadge('user')} Mengalihkan...`,
            'success'
        );
        setTimeout(() => window.location.href = getRedirectByRole(newUser), 1400);

    }, 900);
}

/* ===== HANDLE FORGOT PASSWORD ===== */
function handleForgot() {
    clearAlerts();
    const email = document.getElementById('forgot-email').value.trim();

    if (!isValidEmail(email)) {
        markError('forgot-email');
        showAlert('forgot-alert', 'Masukkan email yang valid.', 'error');
        return;
    }

    // Admin accounts cannot self-reset via this form
    if (ADMIN_ACCOUNTS.find(a => a.email.toLowerCase() === email.toLowerCase())) {
        showAlert('forgot-alert',
            'Akun administrator dikelola secara terpisah. Hubungi sistem administrator.',
            'info'
        );
        return;
    }

    const btn = document.querySelector('#section-forgot .btn-login');
    if (btn) {
        btn.disabled = true;
        const textEl = btn.querySelector('.btn-login-text');
        const loadEl = btn.querySelector('.btn-login-loading');
        if (textEl) textEl.style.display = 'none';
        if (loadEl) loadEl.style.display = 'flex';
    }

    setTimeout(() => {
        if (btn) {
            btn.disabled = false;
            const textEl = btn.querySelector('.btn-login-text');
            const loadEl = btn.querySelector('.btn-login-loading');
            if (textEl) textEl.style.display = 'flex';
            if (loadEl) loadEl.style.display = 'none';
        }
        showAlert('forgot-alert',
            'Jika email terdaftar, link reset password telah dikirimkan ke email Anda.',
            'success'
        );
    }, 1200);
}

/* ===== HANDLE GUEST LOGIN ===== */
function handleGuestLogin() {
    const guest = {
        id:      'guest-' + Date.now(),
        name:    'Tamu',
        role:    'guest',
        avatar:  'T',
        email:   null,
        username: null
    };
    saveSession(guest, false);
    window.location.href = getRedirectByRole(guest);
}

/* ===== ENTER KEY SUPPORT ===== */
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const loginEl    = document.getElementById('section-login');
    const registerEl = document.getElementById('section-register');
    const forgotEl   = document.getElementById('section-forgot');
    if      (loginEl    && loginEl.style.display    !== 'none') handleLogin();
    else if (registerEl && registerEl.style.display !== 'none') handleRegister();
    else if (forgotEl   && forgotEl.style.display   !== 'none') handleForgot();
});

/* ===== AUTO-REDIRECT IF ALREADY LOGGED IN ===== */
(function checkSession() {
    const session = getActiveSession();
    if (session) {
        // Uncomment to auto-redirect logged-in users back to the app:
        // window.location.href = getRedirectByRole(session);
    }
})();

/* ======================================================
   GLOBAL ROLE UTILITIES — window.SIP
   Use these on all other pages (index.html, map, etc.)

   QUICK START on any page:
   ─────────────────────────
   const user = SIP.requireAuth();          // redirects to login if not logged in
   SIP.applyRoleVisibility(user);           // shows/hides [data-role] elements

   HTML attribute conventions:
     data-role="admin"           → only admins see this element
     data-role="user"            → only regular users see it
     data-role="admin,user"      → logged-in users (not guests)
     data-hide-role="guest"      → everyone except guests

   EXAMPLE — edit button visible only to admins:
     <button data-role="admin" onclick="editLayer()">Edit Layer</button>

   EXAMPLE — info panel for all logged-in:
     <div data-role="admin,user">Selamat datang, pengguna terdaftar.</div>
   ====================================================== */
window.SIP = {

    getSession: getActiveSession,
    clearSession,

    isAdmin(u) { const s = u || getActiveSession(); return s && s.role === 'admin'; },
    isUser(u)  { const s = u || getActiveSession(); return s && s.role === 'user';  },
    isGuest(u) { const s = u || getActiveSession(); return s && s.role === 'guest'; },

    /**
     * Page guard — call at the top of every protected page.
     * @param {string[]} allowedRoles  e.g. ['admin', 'user']
     * @returns {object|null} session object, or null (and redirects)
     *
     * Example:
     *   const user = SIP.requireAuth(['admin']); // admin-only page
     *   const user = SIP.requireAuth();          // any logged-in role
     */
    requireAuth(allowedRoles = ['admin', 'user', 'guest']) {
        const session = getActiveSession();
        if (!session) {
            window.location.href = 'login.html';
            return null;
        }
        if (!allowedRoles.includes(session.role)) {
            alert('Akses ditolak. Anda tidak memiliki izin untuk halaman ini.');
            window.location.href = 'index.html';
            return null;
        }
        return session;
    },

    /**
     * Show/hide DOM elements based on current user's role.
     * Call once after page load with the session object.
     * Uses [data-role] and [data-hide-role] attributes.
     */
    applyRoleVisibility(user) {
        const role = (user || getActiveSession() || {}).role || 'guest';

        document.querySelectorAll('[data-role]').forEach(el => {
            const allowed = el.dataset.role.split(',').map(r => r.trim());
            el.style.display = allowed.includes(role) ? '' : 'none';
        });

        document.querySelectorAll('[data-hide-role]').forEach(el => {
            const hidden = el.dataset.hideRole.split(',').map(r => r.trim());
            if (hidden.includes(role)) el.style.display = 'none';
        });
    },

    /**
     * Render a styled role badge into a container element.
     */
    renderRoleBadge(el, user) {
        if (!el) return;
        const u = user || getActiveSession();
        if (!u) return;
        const cfg = {
            admin: { label: 'Administrator', color: '#ffc107', bg: 'rgba(255,193,7,0.15)',   border: 'rgba(255,193,7,0.35)',    icon: 'fa-user-shield' },
            user:  { label: 'Pengguna',      color: '#5aa6ff', bg: 'rgba(23,101,196,0.15)',  border: 'rgba(23,101,196,0.35)',   icon: 'fa-user' },
            guest: { label: 'Tamu',          color: '#aaaaaa', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.15)',  icon: 'fa-user-circle' },
        };
        const c = cfg[u.role] || cfg.guest;
        el.innerHTML = `<span style="background:${c.bg};color:${c.color};border:1px solid ${c.border};border-radius:6px;padding:3px 10px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:6px;"><i class="fa ${c.icon}"></i>${c.label}</span>`;
    },

    logout() {
        clearSession();
        window.location.href = 'login.html';
    }
};

// Backwards-compatible alias
window.sipLogout = () => window.SIP.logout();
