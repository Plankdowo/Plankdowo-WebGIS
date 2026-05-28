/* ================================================================
   ADMINPAGE.JS — SIP Karangdowo Admin Panel
   Data Management: GIS Layers + Berita/Informasi
   Storage: localStorage (shared with main website via data-bridge.js)
   ================================================================ */

/* ===== STORAGE KEYS ===== */
const KEYS = {
    activeLayer:   'sip_gis_active_layer',
    layerHistory:  'sip_gis_layer_history',
    berita:        'sip_berita_list',
    activityLog:   'sip_activity_log',
    lastUpdate:    'sip_last_update',
};

/* ===== STATE ===== */
let pendingGeoJSON    = null;  // parsed GeoJSON waiting to be committed
let pendingFileName   = '';
let pendingFileSize   = 0;
let beritaPage        = 1;
const BERITA_PER_PAGE = 10;
let filteredBerita    = [];
let confirmCallback   = null;

/* ================================================================
   INITIALISATION
================================================================ */
document.addEventListener('DOMContentLoaded', () => {
    setCurrentDate();
    setupSidebarNav();
    setupUploadZone();
    refreshDashboard();
    renderLayerHistory();
    renderBeritaTable();
    updateBadges();
});

function setCurrentDate() {
    const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
    document.getElementById('current-date').textContent =
        new Date().toLocaleDateString('id-ID', opts);
}

/* ================================================================
   SIDEBAR NAVIGATION
================================================================ */
function setupSidebarNav() {
    document.querySelectorAll('.menu-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            switchTab(link.dataset.target);
        });
    });
}

function switchTab(tabId) {
    // Update menu links
    document.querySelectorAll('.menu-link').forEach(l => {
        l.classList.toggle('active', l.dataset.target === tabId);
    });
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.toggle('active', c.id === tabId);
    });
    // Update top-bar title
    const titles = {
        'dashboard':     'Dashboard',
        'upload-gis':    'Upload Layer GeoJSON',
        'layer-history': 'Riwayat Layer',
        'data-berita':   'Kelola Informasi & Berita',
    };
    document.getElementById('current-page-title').textContent = titles[tabId] || tabId;

    // Refresh relevant section
    if (tabId === 'dashboard')     refreshDashboard();
    if (tabId === 'layer-history') renderLayerHistory();
    if (tabId === 'data-berita')   renderBeritaTable();
}

function handleLogout() {
    if (confirm('Yakin ingin keluar dari panel admin?')) {
        window.location.href = 'login.html';
    }
}

/* ================================================================
   DASHBOARD
================================================================ */
function refreshDashboard() {
    const history  = getLayerHistory();
    const berita   = getBeritaList();
    const active   = getActiveLayer();

    // Stats
    document.getElementById('stat-total-layers').textContent = history.length;
    document.getElementById('stat-total-berita').textContent = berita.length;

    if (active) {
        document.getElementById('stat-total-features').textContent =
            (active.featureCount || 0).toLocaleString('id-ID');
    } else {
        document.getElementById('stat-total-features').textContent = '—';
    }

    const lastUpdate = localStorage.getItem(KEYS.lastUpdate);
    document.getElementById('stat-last-update').textContent = lastUpdate
        ? new Date(lastUpdate).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})
        : '—';

    renderActivityLog();
    renderActivLayerCard();
    updateBadges();
}

function renderActivLayerCard() {
    const active = getActiveLayer();
    const el = document.getElementById('active-layer-info');
    if (!active) {
        el.innerHTML = `<div style="text-align:center;padding:20px;color:var(--gray-400);">
            <i class="fa fa-map" style="font-size:24px;display:block;margin-bottom:8px;color:var(--gray-200)"></i>
            <span style="font-size:13px;">Belum ada layer aktif</span></div>`;
        return;
    }
    el.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;padding:12px;background:rgba(46,204,113,0.06);border:1px solid rgba(46,204,113,0.25);border-radius:var(--radius-sm);">
            <div style="width:36px;height:36px;background:rgba(46,204,113,0.12);border-radius:9px;display:flex;align-items:center;justify-content:center;color:var(--green-dark);font-size:16px;flex-shrink:0;"><i class="fa fa-check-circle"></i></div>
            <div style="flex:1;min-width:0;">
                <div style="font-family:var(--font-ui);font-size:13px;font-weight:700;color:var(--navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(active.name)}</div>
                <div style="font-size:11px;color:var(--gray-500);">${active.featureCount || 0} fitur · ${active.geomType || '—'} · ${formatDate(active.uploadedAt)}</div>
            </div>
            <span class="badge badge-active"><i class="fa fa-circle" style="font-size:7px;"></i> Aktif</span>
        </div>`;
}

function updateBadges() {
    const h = getLayerHistory();
    const b = getBeritaList();
    document.getElementById('badge-layers').textContent = h.length;
    document.getElementById('badge-berita').textContent = b.length;
}

/* ================================================================
   ACTIVITY LOG
================================================================ */
function logActivity(text, color = 'var(--blue)') {
    const log   = JSON.parse(localStorage.getItem(KEYS.activityLog) || '[]');
    const entry = { text, color, time: new Date().toISOString() };
    log.unshift(entry);
    if (log.length > 20) log.splice(20);
    localStorage.setItem(KEYS.activityLog, JSON.stringify(log));
    localStorage.setItem(KEYS.lastUpdate, new Date().toISOString());
    renderActivityLog();
}

function renderActivityLog() {
    const log = JSON.parse(localStorage.getItem(KEYS.activityLog) || '[]');
    const ul  = document.getElementById('activity-log');
    if (!log.length) {
        ul.innerHTML = `<li class="activity-item">
            <span class="activity-dot" style="background:var(--gray-300)"></span>
            <span class="activity-text" style="color:var(--gray-500)">Belum ada aktivitas tercatat.</span>
        </li>`;
        return;
    }
    ul.innerHTML = log.slice(0, 8).map(e => `
        <li class="activity-item">
            <span class="activity-dot" style="background:${e.color}"></span>
            <span class="activity-text">${escHtml(e.text)}</span>
            <span class="activity-time">${timeAgo(e.time)}</span>
        </li>`).join('');
}

/* ================================================================
   GIS UPLOAD ZONE
================================================================ */
function setupUploadZone() {
    const zone  = document.getElementById('upload-zone');
    const input = document.getElementById('geojson-file-input');

    // Click → input
    zone.addEventListener('click', e => {
        if (e.target === input) return;
        input.click();
    });

    // File input change
    input.addEventListener('change', e => {
        if (e.target.files.length) handleFileSelected(e.target.files[0]);
    });

    // Drag events
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const f = e.dataTransfer.files[0];
        if (f) handleFileSelected(f);
    });
}

function handleFileSelected(file) {
    // Validate extension
    if (!file.name.match(/\.(geojson|json)$/i)) {
        showToast('Format tidak didukung. Gunakan file .geojson atau .json', 'error');
        return;
    }
    // Validate size (50 MB)
    if (file.size > 50 * 1024 * 1024) {
        showToast('Ukuran file terlalu besar (maks 50 MB)', 'error');
        return;
    }

    pendingFileName = file.name;
    pendingFileSize = file.size;

    // Show progress
    showProgress(true);
    simulateProgress(() => {
        const reader = new FileReader();
        reader.onload = e => parseGeoJSON(e.target.result, file);
        reader.readAsText(file);
    });

    // Pre-fill layer name
    const nameEl = document.getElementById('layer-name-input');
    if (!nameEl.value) {
        nameEl.value = file.name.replace(/\.(geojson|json)$/i, '').replace(/[-_]/g, ' ');
    }
}

function simulateProgress(callback) {
    let pct = 0;
    const bar   = document.getElementById('progress-bar');
    const pctEl = document.getElementById('progress-pct');
    const txtEl = document.getElementById('progress-text');

    const steps = [
        { at: 30,  label: 'Membaca file...' },
        { at: 60,  label: 'Memvalidasi GeoJSON...' },
        { at: 85,  label: 'Menghitung atribut...' },
        { at: 100, label: 'Selesai!' },
    ];

    const interval = setInterval(() => {
        pct = Math.min(pct + Math.random() * 15 + 5, 95);
        bar.style.width = pct + '%';
        pctEl.textContent = Math.round(pct) + '%';
        const step = steps.find(s => pct >= s.at);
        if (step) txtEl.textContent = step.label;
    }, 150);

    setTimeout(() => {
        clearInterval(interval);
        bar.style.width = '100%';
        pctEl.textContent = '100%';
        txtEl.textContent = 'Selesai!';
        setTimeout(() => { callback(); showProgress(false); }, 400);
    }, 1800);
}

function showProgress(show) {
    document.getElementById('upload-progress').classList.toggle('show', show);
    document.getElementById('progress-bar').style.width = '0%';
    document.getElementById('progress-pct').textContent = '0%';
}

function parseGeoJSON(text, file) {
    try {
        const gj = JSON.parse(text);

        if (gj.type !== 'FeatureCollection' && gj.type !== 'Feature') {
            throw new Error('Bukan file GeoJSON yang valid (type harus FeatureCollection).');
        }

        const features = gj.type === 'FeatureCollection' ? (gj.features || []) : [gj];
        const geomTypes = [...new Set(features.map(f => f.geometry?.type || 'Unknown').filter(Boolean))];
        const allProps  = features.flatMap(f => Object.keys(f.properties || {}));
        const uniqueProps = [...new Set(allProps)];

        pendingGeoJSON = gj;

        // Populate preview
        document.getElementById('fp-filename').textContent    = file.name;
        document.getElementById('fp-filesize').textContent    = formatFileSize(file.size);
        document.getElementById('fp-features').textContent    = features.length.toLocaleString('id-ID');
        document.getElementById('fp-geomtype').textContent    = geomTypes.join(', ') || '—';
        document.getElementById('fp-attrs-count').textContent = uniqueProps.length;

        const tagsEl = document.getElementById('fp-attr-tags');
        tagsEl.innerHTML = uniqueProps.length
            ? uniqueProps.map(p => `<span class="attr-tag">${escHtml(p)}</span>`).join('')
            : '<span style="font-size:13px;color:var(--gray-400)">Tidak ada atribut</span>';

        document.getElementById('file-preview').classList.add('show');
        document.getElementById('layer-meta-form').style.display = 'block';

        showToast(`File valid! ${features.length} fitur ditemukan.`, 'success');

    } catch (err) {
        pendingGeoJSON = null;
        showToast('Gagal membaca GeoJSON: ' + err.message, 'error');
    }
}

function resetUpload() {
    pendingGeoJSON = null;
    document.getElementById('file-preview').classList.remove('show');
    document.getElementById('layer-meta-form').style.display = 'none';
    document.getElementById('geojson-file-input').value = '';
    document.getElementById('layer-name-input').value = '';
    document.getElementById('layer-version-input').value = '';
    document.getElementById('layer-notes-input').value = '';
}

function commitUpload() {
    if (!pendingGeoJSON) { showToast('Tidak ada file untuk disimpan.', 'error'); return; }

    const name    = document.getElementById('layer-name-input').value.trim() || pendingFileName;
    const version = document.getElementById('layer-version-input').value.trim();
    const notes   = document.getElementById('layer-notes-input').value.trim();

    const features  = pendingGeoJSON.type === 'FeatureCollection'
        ? (pendingGeoJSON.features || []) : [pendingGeoJSON];
    const geomTypes = [...new Set(features.map(f => f.geometry?.type || 'Unknown'))];

    const layerRecord = {
        id:           Date.now(),
        name,
        version,
        notes,
        fileName:     pendingFileName,
        fileSize:     pendingFileSize,
        featureCount: features.length,
        geomType:     geomTypes.join(', '),
        uploadedAt:   new Date().toISOString(),
        isActive:     true,
        data:         pendingGeoJSON,
    };

    // Mark old active as archived
    const history = getLayerHistory().map(l => ({ ...l, isActive: false }));
    history.unshift(layerRecord);
    // Keep max 10 versions in history
    if (history.length > 10) history.splice(10);

    localStorage.setItem(KEYS.layerHistory, JSON.stringify(history));
    localStorage.setItem(KEYS.activeLayer, JSON.stringify({
        id: layerRecord.id, name, version, featureCount: features.length,
        geomType: geomTypes.join(', '), uploadedAt: layerRecord.uploadedAt,
        data: pendingGeoJSON,
    }));

    logActivity(`Layer baru diupload: "${name}" (${features.length} fitur)`, 'var(--blue)');
    showToast(`Layer "${name}" berhasil diaktifkan!`, 'success');
    resetUpload();
    updateBadges();
    refreshDashboard();
}

/* ===== LAYER HISTORY RENDER ===== */
function renderLayerHistory() {
    const history = getLayerHistory();
    const tbody   = document.getElementById('layer-history-tbody');

    if (!history.length) {
        tbody.innerHTML = `<tr><td colspan="7" class="table-empty"><i class="fa fa-layer-group"></i>Belum ada layer yang diupload.</td></tr>`;
        return;
    }

    tbody.innerHTML = history.map(layer => `
        <tr>
            <td>${layer.isActive
                ? `<span class="badge badge-active"><i class="fa fa-circle" style="font-size:7px;"></i> Aktif</span>`
                : `<span class="badge badge-archived">Arsip</span>`}
            </td>
            <td>
                <div style="font-weight:600;color:var(--gray-900);">${escHtml(layer.name)}</div>
                ${layer.version ? `<div style="font-size:11px;color:var(--gray-500);">${escHtml(layer.version)}</div>` : ''}
                ${layer.notes ? `<div style="font-size:11px;color:var(--gray-500);font-style:italic;">${escHtml(layer.notes.substring(0,60))}${layer.notes.length>60?'...':''}</div>` : ''}
            </td>
            <td><strong>${(layer.featureCount || 0).toLocaleString('id-ID')}</strong></td>
            <td>${escHtml(layer.geomType || '—')}</td>
            <td>${formatFileSize(layer.fileSize || 0)}</td>
            <td style="font-size:12px;">${formatDateTime(layer.uploadedAt)}</td>
            <td>
                <div style="display:flex;gap:6px;">
                    <button class="btn-icon btn-icon-download" title="Unduh GeoJSON" onclick="downloadLayer(${layer.id})"><i class="fa fa-download"></i></button>
                    ${!layer.isActive ? `<button class="btn-icon btn-icon-restore" title="Aktifkan kembali" onclick="restoreLayer(${layer.id})"><i class="fa fa-rotate-left"></i></button>` : ''}
                    <button class="btn-icon btn-icon-delete" title="Hapus dari riwayat" onclick="deleteLayerFromHistory(${layer.id})"><i class="fa fa-trash"></i></button>
                </div>
            </td>
        </tr>`).join('');
}

function downloadLayer(id) {
    const layer = getLayerHistory().find(l => l.id === id);
    if (!layer || !layer.data) { showToast('Data tidak tersedia.', 'error'); return; }
    const blob = new Blob([JSON.stringify(layer.data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = layer.fileName || `layer-${id}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('File GeoJSON diunduh.', 'success');
}

function restoreLayer(id) {
    const history = getLayerHistory();
    const layer   = history.find(l => l.id === id);
    if (!layer) return;

    showConfirm(
        'Aktifkan Layer Ini?',
        `Layer "<strong>${escHtml(layer.name)}</strong>" akan menjadi layer aktif dan menggantikan layer yang sedang aktif saat ini.`,
        () => {
            const updated = history.map(l => ({ ...l, isActive: l.id === id }));
            localStorage.setItem(KEYS.layerHistory, JSON.stringify(updated));
            localStorage.setItem(KEYS.activeLayer, JSON.stringify({
                id: layer.id, name: layer.name, version: layer.version,
                featureCount: layer.featureCount, geomType: layer.geomType,
                uploadedAt: new Date().toISOString(), data: layer.data,
            }));
            logActivity(`Layer "${layer.name}" diaktifkan kembali.`, 'var(--green)');
            showToast(`Layer "${layer.name}" kini aktif!`, 'success');
            renderLayerHistory();
            refreshDashboard();
        }
    );
}

function deleteLayerFromHistory(id) {
    const layer = getLayerHistory().find(l => l.id === id);
    if (!layer) return;

    showConfirm(
        'Hapus dari Riwayat?',
        `Layer "<strong>${escHtml(layer.name)}</strong>" akan dihapus permanen dari riwayat. ${layer.isActive ? '<br><strong>Ini adalah layer aktif!</strong>' : ''}`,
        () => {
            let history = getLayerHistory().filter(l => l.id !== id);
            localStorage.setItem(KEYS.layerHistory, JSON.stringify(history));
            if (layer.isActive) {
                localStorage.removeItem(KEYS.activeLayer);
                logActivity(`Layer aktif "${layer.name}" dihapus.`, 'var(--red)');
            } else {
                logActivity(`Layer arsip "${layer.name}" dihapus dari riwayat.`, 'var(--orange)');
            }
            showToast('Layer dihapus dari riwayat.', 'info');
            renderLayerHistory();
            refreshDashboard();
            updateBadges();
        }
    );
}

function clearLayerHistory() {
    showConfirm(
        'Bersihkan Semua Riwayat Layer?',
        'Semua versi layer yang tersimpan (kecuali yang sedang aktif) akan dihapus permanen.',
        () => {
            const history = getLayerHistory().filter(l => l.isActive);
            localStorage.setItem(KEYS.layerHistory, JSON.stringify(history));
            logActivity('Riwayat layer dibersihkan.', 'var(--orange)');
            showToast('Riwayat layer telah dibersihkan.', 'info');
            renderLayerHistory();
            updateBadges();
        }
    );
}

/* ================================================================
   BERITA / INFORMASI CRUD
================================================================ */
function openBeritaModal(id = null) {
    // Reset form
    document.getElementById('berita-edit-id').value = '';
    document.getElementById('berita-kategori').value = '';
    document.getElementById('berita-tanggal').value = todayISO();
    document.getElementById('berita-judul').value = '';
    document.getElementById('berita-ringkasan').value = '';
    document.getElementById('berita-konten').value = '';
    document.getElementById('berita-gambar').value = '';
    document.getElementById('berita-penulis').value = '';
    document.getElementById('berita-img-preview').style.display = 'none';
    document.getElementById('img-placeholder').style.display = 'block';
    resetCharCounts();

    if (id !== null) {
        // Edit mode
        const item = getBeritaList().find(b => b.id === id);
        if (!item) return;
        document.getElementById('modal-berita-title').textContent = 'Edit Artikel';
        document.getElementById('btn-save-label').textContent = 'Simpan Perubahan';
        document.getElementById('berita-edit-id').value = id;
        document.getElementById('berita-kategori').value  = item.kategori || '';
        document.getElementById('berita-tanggal').value   = item.tanggal  || '';
        document.getElementById('berita-judul').value     = item.judul    || '';
        document.getElementById('berita-ringkasan').value = item.ringkasan || '';
        document.getElementById('berita-konten').value    = item.konten   || '';
        document.getElementById('berita-gambar').value    = item.gambar   || '';
        document.getElementById('berita-penulis').value   = item.penulis  || '';
        updateCharCount('berita-judul', 120, 'cc-judul');
        updateCharCount('berita-ringkasan', 200, 'cc-ringkasan');
        if (item.gambar) previewBeritaImage();
    } else {
        document.getElementById('modal-berita-title').textContent = 'Tambah Artikel Baru';
        document.getElementById('btn-save-label').textContent = 'Simpan Artikel';
    }

    document.getElementById('modal-berita').classList.add('show');
}

function closeBeritaModal() {
    document.getElementById('modal-berita').classList.remove('show');
}

function saveBerita() {
    const kategori  = document.getElementById('berita-kategori').value;
    const tanggal   = document.getElementById('berita-tanggal').value;
    const judul     = document.getElementById('berita-judul').value.trim();
    const ringkasan = document.getElementById('berita-ringkasan').value.trim();
    const konten    = document.getElementById('berita-konten').value.trim();
    const gambar    = document.getElementById('berita-gambar').value.trim();
    const penulis   = document.getElementById('berita-penulis').value.trim();
    const editId    = document.getElementById('berita-edit-id').value;

    // Validation
    const errors = [];
    if (!kategori)  errors.push('Kategori harus dipilih.');
    if (!tanggal)   errors.push('Tanggal tayang harus diisi.');
    if (!judul)     errors.push('Judul artikel tidak boleh kosong.');
    if (!ringkasan) errors.push('Ringkasan tidak boleh kosong.');
    if (errors.length) { showToast(errors[0], 'error'); return; }

    const list = getBeritaList();

    if (editId) {
        // Update existing
        const idx = list.findIndex(b => b.id == editId);
        if (idx !== -1) {
            list[idx] = { ...list[idx], kategori, tanggal, judul, ringkasan, konten, gambar, penulis, updatedAt: new Date().toISOString() };
            logActivity(`Artikel diperbarui: "${judul}"`, 'var(--gold)');
            showToast('Artikel berhasil diperbarui!', 'success');
        }
    } else {
        // Add new
        const newItem = {
            id: Date.now(),
            kategori, tanggal, judul, ringkasan, konten, gambar, penulis,
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        list.unshift(newItem);
        logActivity(`Artikel baru ditambahkan: "${judul}"`, 'var(--green)');
        showToast('Artikel berhasil disimpan!', 'success');
    }

    saveBeritaList(list);
    closeBeritaModal();
    renderBeritaTable();
    updateBadges();
    refreshDashboard();
}

function viewBerita(id) {
    const item = getBeritaList().find(b => b.id === id);
    if (!item) return;
    const body = document.getElementById('modal-view-berita-body');
    body.innerHTML = `
        ${item.gambar ? `<img src="${escHtml(item.gambar)}" style="width:100%;height:220px;object-fit:cover;border-radius:var(--radius-sm);margin-bottom:20px;" onerror="this.style.display='none'">` : ''}
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
            <span class="badge badge-${item.kategori?.toLowerCase()}">${escHtml(item.kategori)}</span>
            <span style="font-size:12px;color:var(--gray-500);"><i class="fa fa-calendar"></i> ${formatDate(item.tanggal)}</span>
            ${item.penulis ? `<span style="font-size:12px;color:var(--gray-500);"><i class="fa fa-user"></i> ${escHtml(item.penulis)}</span>` : ''}
        </div>
        <h2 style="font-family:var(--font-display);font-size:1.5rem;color:var(--navy);margin-bottom:12px;line-height:1.3;">${escHtml(item.judul)}</h2>
        <p style="color:var(--gray-500);font-size:13.5px;line-height:1.6;margin-bottom:16px;font-style:italic;border-left:3px solid var(--blue);padding-left:12px;">${escHtml(item.ringkasan)}</p>
        ${item.konten ? `<div style="font-size:14px;color:var(--gray-700);line-height:1.75;white-space:pre-wrap;">${escHtml(item.konten)}</div>` : '<p style="color:var(--gray-400);font-size:13px;">Konten lengkap belum tersedia.</p>'}
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--gray-100);display:flex;gap:10px;">
            <button class="btn btn-gold btn-sm" onclick="openBeritaModal(${item.id});closeModal('modal-view-berita')"><i class="fa fa-edit"></i> Edit Artikel</button>
        </div>`;
    document.getElementById('modal-view-berita').classList.add('show');
}

function deleteBerita(id) {
    const item = getBeritaList().find(b => b.id === id);
    if (!item) return;

    showConfirm(
        'Hapus Artikel?',
        `Artikel "<strong>${escHtml(item.judul)}</strong>" akan dihapus permanen dan tidak bisa dipulihkan.`,
        () => {
            const list = getBeritaList().filter(b => b.id !== id);
            saveBeritaList(list);
            logActivity(`Artikel dihapus: "${item.judul}"`, 'var(--red)');
            showToast('Artikel berhasil dihapus.', 'info');
            renderBeritaTable();
            updateBadges();
            refreshDashboard();
        }
    );
}

/* ===== BERITA TABLE RENDER ===== */
function renderBeritaTable() {
    const list    = getBeritaList();
    const search  = (document.getElementById('berita-search')?.value || '').toLowerCase();
    const katFilter = document.getElementById('berita-filter-kategori')?.value || '';
    const sort    = document.getElementById('berita-filter-sort')?.value || 'newest';

    filteredBerita = list
        .filter(b => {
            const matchSearch = !search || b.judul.toLowerCase().includes(search) || b.ringkasan?.toLowerCase().includes(search);
            const matchKat    = !katFilter || b.kategori === katFilter;
            return matchSearch && matchKat;
        })
        .sort((a, b) => {
            if (sort === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
            if (sort === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
            if (sort === 'az')     return a.judul.localeCompare(b.judul, 'id');
            return 0;
        });

    const total    = filteredBerita.length;
    const start    = (beritaPage - 1) * BERITA_PER_PAGE;
    const paginated = filteredBerita.slice(start, start + BERITA_PER_PAGE);
    const tbody    = document.getElementById('berita-tbody');

    if (!paginated.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="table-empty">
            <i class="fa fa-newspaper"></i>
            ${search || katFilter ? 'Tidak ada artikel yang cocok dengan filter.' : 'Belum ada artikel. Klik "Tambah Artikel" untuk memulai.'}
        </td></tr>`;
    } else {
        tbody.innerHTML = paginated.map(item => `
            <tr>
                <td><span class="badge badge-${(item.kategori||'').toLowerCase()}">${escHtml(item.kategori || '—')}</span></td>
                <td>
                    <div style="font-weight:600;color:var(--gray-900);line-height:1.3;">${escHtml(item.judul)}</div>
                    ${item.penulis ? `<div style="font-size:11px;color:var(--gray-500);margin-top:2px;"><i class="fa fa-user" style="font-size:9px;"></i> ${escHtml(item.penulis)}</div>` : ''}
                </td>
                <td style="font-size:12.5px;color:var(--gray-500);">${escHtml((item.ringkasan || '').substring(0, 70))}${(item.ringkasan||'').length > 70 ? '...' : ''}</td>
                <td style="font-size:12.5px;">${formatDate(item.tanggal)}</td>
                <td>
                    <div style="display:flex;gap:5px;">
                        <button class="btn-icon" style="background:rgba(23,101,196,0.08);color:var(--blue);width:30px;height:30px;border-radius:6px;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;" title="Lihat Detail" onclick="viewBerita(${item.id})"><i class="fa fa-eye" style="font-size:12px;"></i></button>
                        <button class="btn-icon btn-icon-edit" title="Edit Artikel" onclick="openBeritaModal(${item.id})"><i class="fa fa-edit"></i></button>
                        <button class="btn-icon btn-icon-delete" title="Hapus Artikel" onclick="deleteBerita(${item.id})"><i class="fa fa-trash"></i></button>
                    </div>
                </td>
            </tr>`).join('');
    }

    renderPagination(total);
}

function filterBerita() {
    beritaPage = 1;
    renderBeritaTable();
}

function renderPagination(total) {
    const pages = Math.ceil(total / BERITA_PER_PAGE);
    const el    = document.getElementById('berita-pagination');
    if (pages <= 1) { el.innerHTML = ''; return; }

    let html = `<span class="page-info">${(beritaPage-1)*BERITA_PER_PAGE+1}–${Math.min(beritaPage*BERITA_PER_PAGE,total)} dari ${total}</span>`;
    html += `<button class="page-btn" ${beritaPage===1?'disabled':''} onclick="changePage(${beritaPage-1})"><i class="fa fa-chevron-left" style="font-size:11px;"></i></button>`;
    for (let i = 1; i <= pages; i++) {
        if (pages <= 6 || Math.abs(i - beritaPage) <= 1 || i === 1 || i === pages) {
            html += `<button class="page-btn ${i===beritaPage?'active':''}" onclick="changePage(${i})">${i}</button>`;
        } else if (Math.abs(i - beritaPage) === 2) {
            html += `<span class="page-info">…</span>`;
        }
    }
    html += `<button class="page-btn" ${beritaPage===pages?'disabled':''} onclick="changePage(${beritaPage+1})"><i class="fa fa-chevron-right" style="font-size:11px;"></i></button>`;
    el.innerHTML = html;
}

function changePage(p) {
    beritaPage = p;
    renderBeritaTable();
}

function previewBeritaImage() {
    const url  = document.getElementById('berita-gambar').value.trim();
    const img  = document.getElementById('berita-img-preview');
    const ph   = document.getElementById('img-placeholder');
    if (url) {
        img.src = url;
        img.style.display = 'block';
        ph.style.display  = 'none';
        img.onerror = () => { img.style.display = 'none'; ph.style.display = 'block'; };
    } else {
        img.style.display = 'none';
        ph.style.display  = 'block';
    }
}

/* ================================================================
   EXPORT / IMPORT
================================================================ */
function exportAllData() {
    const payload = {
        exportedAt: new Date().toISOString(),
        activeLayer: getActiveLayer(),
        layerHistory: getLayerHistory().map(l => ({ ...l, data: undefined })), // exclude raw GeoJSON from backup
        berita: getBeritaList(),
        activityLog: JSON.parse(localStorage.getItem(KEYS.activityLog) || '[]'),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `sip-karangdowo-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logActivity('Backup data diekspor ke file JSON.', 'var(--purple)');
    showToast('Data berhasil diekspor!', 'success');
}

/* ================================================================
   CONFIRM DIALOG
================================================================ */
function showConfirm(title, message, onConfirm) {
    document.getElementById('confirm-title').textContent = title;
    document.getElementById('confirm-message').innerHTML = message;
    confirmCallback = onConfirm;
    document.getElementById('confirm-action-btn').onclick = () => {
        closeConfirmModal();
        if (typeof confirmCallback === 'function') confirmCallback();
    };
    document.getElementById('modal-confirm').classList.add('show');
}

function closeConfirmModal() {
    document.getElementById('modal-confirm').classList.remove('show');
    confirmCallback = null;
}

function closeModal(id) {
    document.getElementById(id).classList.remove('show');
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('show');
    });
});

/* ================================================================
   TOAST NOTIFICATIONS
================================================================ */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const icons = { success: 'fa-check', error: 'fa-times', info: 'fa-info', warning: 'fa-exclamation' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fa ${icons[type] || 'fa-info'}"></i></div>
        <span>${escHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('out');
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}

/* ================================================================
   UTILITY FUNCTIONS
================================================================ */
function getActiveLayer()  { try { return JSON.parse(localStorage.getItem(KEYS.activeLayer)); } catch { return null; } }
function getLayerHistory() { try { return JSON.parse(localStorage.getItem(KEYS.layerHistory)) || []; } catch { return []; } }
function getBeritaList()   { try { return JSON.parse(localStorage.getItem(KEYS.berita)) || []; } catch { return []; } }
function saveBeritaList(list) { localStorage.setItem(KEYS.berita, JSON.stringify(list)); }

function formatFileSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024)           return bytes + ' B';
    if (bytes < 1024 * 1024)    return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function formatDate(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
    } catch { return iso; }
}

function formatDateTime(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })
            + ' ' + d.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
    } catch { return iso; }
}

function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m    = Math.floor(diff / 60000);
    const h    = Math.floor(diff / 3600000);
    const d    = Math.floor(diff / 86400000);
    if (m < 1)   return 'Baru saja';
    if (m < 60)  return `${m} mnt lalu`;
    if (h < 24)  return `${h} jam lalu`;
    if (d < 7)   return `${d} hari lalu`;
    return formatDate(iso);
}

function todayISO() {
    return new Date().toISOString().split('T')[0];
}

function escHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function updateCharCount(inputId, max, countId) {
    const el  = document.getElementById(inputId);
    const cnt = document.getElementById(countId);
    if (!el || !cnt) return;
    const len = el.value.length;
    cnt.textContent = `${len}/${max}`;
    cnt.className   = 'char-count' + (len > max ? ' over' : len > max * 0.85 ? ' warn' : '');
}

function resetCharCounts() {
    ['cc-judul', 'cc-ringkasan'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.textContent = '0/' + (id === 'cc-judul' ? 120 : 200); el.className = 'char-count'; }
    });
}
