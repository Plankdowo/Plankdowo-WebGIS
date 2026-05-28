# Panduan Integrasi Peran (Role) — SIP Karangdowo

## Ringkasan Sistem Peran

| Peran | Cara Masuk | Hak Akses |
|-------|-----------|-----------|
| **Administrator** | Username/password hardcoded | Lihat + Edit layer + Tambah/hapus fitur + Kelola data |
| **Pengguna (User)** | Daftar sendiri via form | Lihat peta & data saja |
| **Tamu (Guest)** | Tombol "Masuk sebagai Tamu" | Akses terbatas, tanpa akun |

---

## Akun Administrator (Hardcoded)

Diatur langsung di dalam `login.js`, array `ADMIN_ACCOUNTS`:

```js
{ username: 'admin',    password: 'Admin@2025',    name: 'Administrator Utama' }
{ username: 'kasi',     password: 'Kasi@2025',     name: 'Kepala Seksi Pertanahan' }
{ username: 'operator', password: 'Operator@2025', name: 'Operator GIS' }
```

Untuk menambah/mengubah akun admin, edit array tersebut secara langsung.

---

## Cara Menggunakan di Halaman Lain (index.html, dll.)

### 1. Tambahkan script login.js di atas tag `</body>`

```html
<script src="login.js"></script>
```

### 2. Guard halaman (redirect ke login jika belum masuk)

```js
// Izinkan semua peran yang sudah login
const user = SIP.requireAuth();

// Atau khusus admin saja
const user = SIP.requireAuth(['admin']);

// Admin dan user terdaftar (bukan tamu)
const user = SIP.requireAuth(['admin', 'user']);
```

### 3. Tampilkan/sembunyikan elemen berdasarkan peran

Tambahkan atribut `data-role` atau `data-hide-role` pada elemen HTML:

```html
<!-- Hanya admin yang melihat tombol edit -->
<button data-role="admin" onclick="editLayer()">
  <i class="fa fa-edit"></i> Edit Layer
</button>

<!-- Hanya admin yang melihat panel manajemen -->
<div data-role="admin" class="admin-panel">
  <button>Tambah Layer</button>
  <button>Hapus Fitur</button>
  <button>Kelola Data</button>
</div>

<!-- Semua pengguna terdaftar (bukan tamu) melihat ini -->
<div data-role="admin,user">
  Selamat datang, pengguna terdaftar.
</div>

<!-- Sembunyikan tombol login dari yang sudah masuk -->
<a href="login.html" data-hide-role="admin,user,guest">Masuk</a>
```

Lalu panggil di JavaScript setelah halaman dimuat:

```js
document.addEventListener('DOMContentLoaded', () => {
  const user = SIP.requireAuth();
  SIP.applyRoleVisibility(user);

  // Tampilkan nama dan badge peran pengguna
  document.getElementById('username-display').textContent = user.name;
  SIP.renderRoleBadge(document.getElementById('role-badge'), user);
});
```

### 4. Cek peran secara manual di JavaScript

```js
const user = SIP.getSession();

if (SIP.isAdmin()) {
  // Aktifkan kontrol edit layer
  enableLayerEditing();
}

if (SIP.isUser()) {
  // Mode lihat saja
  disableEditing();
}

if (SIP.isGuest()) {
  // Tampilkan banner "Daftar untuk akses penuh"
  showRegisterBanner();
}
```

### 5. Tombol Logout

```html
<button onclick="SIP.logout()">
  <i class="fa fa-sign-out-alt"></i> Keluar
</button>
```

---

## Contoh Lengkap: Toolbar Peta dengan Kontrol Berbasis Peran

```html
<div class="map-toolbar">
  <!-- Semua peran bisa melihat ini -->
  <button onclick="zoomIn()"><i class="fa fa-plus"></i></button>
  <button onclick="zoomOut()"><i class="fa fa-minus"></i></button>

  <!-- Hanya admin -->
  <button data-role="admin" onclick="addLayer()">
    <i class="fa fa-layer-group"></i> Tambah Layer
  </button>
  <button data-role="admin" onclick="editFeature()">
    <i class="fa fa-edit"></i> Edit Fitur
  </button>
  <button data-role="admin" onclick="deleteFeature()">
    <i class="fa fa-trash"></i> Hapus Fitur
  </button>

  <!-- Admin dan user terdaftar -->
  <button data-role="admin,user" onclick="downloadData()">
    <i class="fa fa-download"></i> Unduh Data
  </button>
</div>

<script>
document.addEventListener('DOMContentLoaded', () => {
  const user = SIP.requireAuth(); // redirect ke login jika belum masuk
  SIP.applyRoleVisibility(user);  // terapkan visibilitas elemen
});
</script>
```

---

## Catatan Keamanan

- **Jangan gunakan ini di produksi** tanpa autentikasi server-side. Password yang disimpan di JavaScript dapat dibaca siapa saja.
- Untuk produksi: gunakan backend API (Node.js, Laravel, dll.) dengan JWT atau session cookie, dan hash password menggunakan bcrypt.
- Validasi peran di server, bukan hanya di frontend, karena kontrol frontend bisa dilewati dari browser console.
