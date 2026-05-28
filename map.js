/* ======================================================
   MAP.JS — Web GIS Pertanahan Karangdowo
   Map Page Scripts (qgis2web GeoJSON Fixed Edition)
   ====================================================== */

/* ===== INIT MAP ===== */
var map = L.map('map', { zoomControl: false }).fitBounds([
    [-7.721424424031263, 110.7223597939657],
    [-7.705673404661751, 110.75820307519317]
]);

L.control.zoom({ position: 'bottomright' }).addTo(map);

/* ===== BASEMAPS ===== */
var osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
}).addTo(map);

var satellite = L.tileLayer('https://mt1.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
    attribution: '© Google Maps',
    maxZoom: 20
});

var baseMaps = {
    "OpenStreetMap": osm,
    "Satelit (Google)": satellite
};

/* ===== HIGHLIGHT HELPER ===== */
var highlightLayer;
function highlightFeature(e) {
    highlightLayer = e.target;
    var geomType = e.target.feature.geometry.type;
    if (geomType === 'LineString' || geomType === 'MultiLineString') {
        highlightLayer.setStyle({ color: 'rgba(255, 0, 0, 1.00)' });
    } else {
        highlightLayer.setStyle({ fillColor: 'rgba(255, 0, 0, 1.00)', fillOpacity: 0.9 });
    }
    highlightLayer.openPopup();
}

/* ===== STYLE FUNCTIONS ===== */
var plColors = {
    'Bangunan Hunian':                'rgba(84,163,211,1.0)',
    'Bangunan Industri':              'rgba(212,34,221,1.0)',
    'Bangunan Pendidikan':            'rgba(212,184,25,1.0)',
    'Bangunan Perdagangan dan Jasa':  'rgba(233,133,207,1.0)',
    'Bangunan Peribadatan':           'rgba(189,107,236,1.0)',
    'Bangunan Perkantoran':           'rgba(95,35,223,1.0)',
    'Jalan':                          'rgba(219,0,0,1.0)',
    'Jalur Hijau':                    'rgba(110,225,233,1.0)',
    'Kebun Campuran':                 'rgba(224,128,98,1.0)',
    'Pekarangan':                     'rgba(212,240,72,1.0)',
    'Pemakaman':                      'rgba(96,204,109,1.0)',
    'Perkebunan':                     'rgba(77,220,139,1.0)',
    'Permukaan/Lapangan Diperkeras':  'rgba(41,231,184,1.0)',
    'Sawah':                          'rgba(171,204,23,1.0)',
    'Semak Belukar':                  'rgba(230,80,143,1.0)',
    'Sungai':                         'rgba(16,164,255,1.0)',
    'Tanah Terbuka':                  'rgba(67,110,204,1.0)',
    'Tegalan/Ladang':                 'rgba(225,78,93,1.0)'
};

function style_PL(feature) {
    return {
        opacity: 1,
        color: 'rgba(35,35,35,1.0)',
        weight: 1.0,
        fill: true,
        fillOpacity: 1,
        fillColor: plColors[String(feature.properties['JENIS'])] || 'rgba(233,184,123,1.0)',
        interactive: true
    };
}

var bidangColors = {
    'Hak Guna Bangunan': 'rgba(182,74,236,1.0)',
    'Hak Milik':         'rgba(29,207,148,1.0)',
    'Hak Pakai':         'rgba(218,164,56,1.0)',
    'Hak Wakaf':         'rgba(232,50,111,1.0)',
    'Kosong':            'rgba(111,144,212,1.0)'
};

function style_BIDANG(feature) {
    return {
        opacity: 1,
        color: 'rgba(35,35,35,1.0)',
        weight: 1.0,
        fill: true,
        fillOpacity: 0.7,
        fillColor: bidangColors[String(feature.properties['STATUS'])] || 'rgba(144,209,109,1.0)',
        interactive: true
    };
}

/* ===== POPUP BUILDERS ===== */
function pop_PL(feature, layer) {
    layer.on({
        mouseout: function(e) {
            if (wmsLayer && typeof wmsLayer.resetStyle === 'function') wmsLayer.resetStyle(e.target);
            layer.closePopup();
        },
        mouseover: highlightFeature
    });
    var p = feature.properties;
    var fields = [
        ['Tema',        p['TEMA']],
        ['Jenis',       p['JENIS']],
        ['Jenis Bang',  p['JENIS_BANG']],
        ['Toponim',     p['TOPONIM']],
        ['Luas (m²)',   p['LUAS']],
        ['Shape Area',  p['Shape_Area']]
    ];
    var rows = fields.filter(f => f[1] !== null && f[1] !== undefined)
        .map(f => `<tr><td>${f[0]}</td><td>${f[1]}</td></tr>`).join('');

    var content = `
        <div class="custom-popup-wrap">
            <div class="custom-popup-header">
                <i class="fa fa-map"></i>
                <div>
                    <strong>${p['JENIS'] || 'Penggunaan Lahan'}</strong>
                    <span>${p['TEMA'] || ''}</span>
                </div>
            </div>
            <div class="custom-popup-body">
                <table>${rows}</table>
            </div>
        </div>`;
    layer.bindPopup(content, { maxHeight: 400, maxWidth: 320 });
}

function pop_BIDANG(feature, layer) {
    layer.on({
        mouseout: function(e) {
            if (bidangTanahLayer && typeof bidangTanahLayer.resetStyle === 'function') bidangTanahLayer.resetStyle(e.target);
            layer.closePopup();
        },
        mouseover: highlightFeature
    });
    var p = feature.properties;
    var fields = [
        ['NOP',    p['D_NOP']],
        ['Status', p['STATUS']],
        ['Luas (m²)',   p['LUAS']],
        ['X',      p['X']],
        ['Y',      p['Y']]
    ];
    var rows = fields.filter(f => f[1] !== null && f[1] !== undefined)
        .map(f => `<tr><td>${f[0]}</td><td>${f[1]}</td></tr>`).join('');

    var statusColor = bidangColors[String(p['STATUS'])] || '#999';
    var content = `
        <div class="custom-popup-wrap">
            <div class="custom-popup-header">
                <i class="fa fa-vector-square"></i>
                <div>
                    <strong>${p['STATUS'] || 'Bidang Tanah'}</strong>
                    <span style="display:flex;align-items:center;gap:6px;">
                        <span style="width:10px;height:10px;background:${statusColor};border-radius:2px;display:inline-block;"></span>
                        NOP: ${p['D_NOP'] || '-'}
                    </span>
                </div>
            </div>
            <div class="custom-popup-body">
                <table>${rows}</table>
            </div>
        </div>`;
    layer.bindPopup(content, { maxHeight: 400, maxWidth: 320 });
}

/* ===== GEOJSON LAYERS ===== */
var wmsLayer = null;       
var bidangTanahLayer = null; 

function initGeoJSONLayers() {
    if (typeof json_PL_0 !== 'undefined') {
        map.createPane('pane_PL_0');
        map.getPane('pane_PL_0').style.zIndex = 400;
        wmsLayer = L.geoJson(json_PL_0, {
            interactive: true,
            pane: 'pane_PL_0',
            onEachFeature: pop_PL,
            style: style_PL
        }).addTo(map);
    }

    if (typeof json_BIDANG_TANAH_1 !== 'undefined') {
        map.createPane('pane_BIDANG_TANAH_1');
        map.getPane('pane_BIDANG_TANAH_1').style.zIndex = 401;
        bidangTanahLayer = L.geoJson(json_BIDANG_TANAH_1, {
            interactive: true,
            pane: 'pane_BIDANG_TANAH_1',
            onEachFeature: pop_BIDANG,
            style: style_BIDANG
        }).addTo(map);
    }
    updateLayerControl();
}

function updateLayerControl() {
    var overlayMaps = {};
    if (wmsLayer) overlayMaps['Penggunaan Lahan'] = wmsLayer;
    if (bidangTanahLayer) overlayMaps['Bidang Tanah'] = bidangTanahLayer;
    L.control.layers(baseMaps, overlayMaps, { position: 'topright' }).addTo(map);
}

if (typeof json_PL_0 !== 'undefined' || typeof json_BIDANG_TANAH_1 !== 'undefined') {
    initGeoJSONLayers();
} else {
    window.addEventListener('load', function() {
        initGeoJSONLayers();
        if (!wmsLayer && !bidangTanahLayer) {
            L.control.layers(baseMaps, {}, { position: 'topright' }).addTo(map);
        }
    });
}

/* ===== INLINE COLOR SWATCHES LEGEND ===== */
function buildInlineLegend() {
    var plDiv = document.getElementById('legendPL');
    if (plDiv) {
        var html = '<div class="legend-wms-title"><i class="fa fa-map" style="color:#2ecc71;"></i> Penggunaan Lahan</div>';
        Object.entries(plColors).forEach(function([label, color]) {
            html += `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;font-size:12px;color:rgba(255,255,255,0.7);">
                        <span style="width:14px;height:14px;background:${color};border-radius:3px;flex-shrink:0;border:1px solid rgba(255,255,255,0.15);"></span>
                        ${label}
                     </div>`;
        });
        plDiv.innerHTML = html;
    }

    var bidangDiv = document.getElementById('legendBidang');
    if (bidangDiv) {
        var html2 = '<div class="legend-wms-title"><i class="fa fa-vector-square" style="color:#e67e22;"></i> Status Hak Tanah</div>';
        Object.entries(bidangColors).forEach(function([label, color]) {
            html2 += `<div style="display:flex;align-items:center;gap:8px;margin:4px 0;font-size:12px;color:rgba(255,255,255,0.7);">
                         <span style="width:14px;height:14px;background:${color};border-radius:3px;flex-shrink:0;border:1px solid rgba(255,255,255,0.15);"></span>
                         ${label}
                      </div>`;
        });
        bidangDiv.innerHTML = html2;
    }
}

/* ===== EXTENDED DATA LOKASI (DESA & KANTOR) ===== */
var dataLokasi = [
    { nama: "Kantor Kecamatan Karangdowo", lat: -7.70819, lng: 110.73746, tipe: "Kecamatan", alamat: "Jl. Raya Karangdowo, Klaten" },
    { nama: "Kantor Desa Karangdowo",      lat: -7.71739, lng: 110.73571, tipe: "Desa",       alamat: "Desa Karangdowo, Karangdowo" },
];

var layerKantor = L.layerGroup();

function buildPopupHTML(k) {
    var mapsUrl = `https://www.google.com/maps/search/?api=1&query=${k.lat},${k.lng}`;
    return `
        <div class="custom-popup-wrap">
            <div class="custom-popup-header">
                <i class="fa fa-landmark"></i>
                <div>
                    <strong>${k.nama}</strong>
                    <span>${k.tipe}</span>
                </div>
            </div>
            <div class="custom-popup-body">
                <table>
                    <tr><td>Alamat</td><td>${k.alamat}</td></tr>
                    <tr><td>Latitude</td><td>${k.lat.toFixed(5)}</td></tr>
                    <tr><td>Longitude</td><td>${k.lng.toFixed(5)}</td></tr>
                </table>
            </div>
            <div class="custom-popup-footer">
                <a href="${mapsUrl}" target="_blank">
                    <i class="fa fa-map-marker-alt"></i> Buka di Google Maps
                </a>
            </div>
        </div>`;
}

function renderMarkers() {
    layerKantor.clearLayers();
    dataLokasi.forEach(function(k) {
        var color = k.tipe === 'Kecamatan' ? '#e74c3c' : (k.tipe === 'Desa' ? '#2ecc71' : '#1765c4');
        var iconHtml = `<div style="
            background: white;
            border: 2.5px solid ${color};
            border-radius: 50%;
            width: 32px; height: 32px;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 3px 10px rgba(0,0,0,0.25);
            font-size: 14px; color: ${color};
        "><i class="fa ${k.tipe.includes('Wilayah') ? 'fa-map-pin' : 'fa-landmark'}"></i></div>`;

        var marker = L.marker([k.lat, k.lng], {
            icon: L.divIcon({ html: iconHtml, className: 'custom-div-icon', iconSize: [32,32], iconAnchor: [16,16] })
        }).bindPopup(buildPopupHTML(k), { maxWidth: 320 });
        layerKantor.addLayer(marker);
    });
}

renderMarkers();
layerKantor.addTo(map);

/* ===== COORDINATE & ZOOM DISPLAY ===== */
map.on('mousemove', function(e) {
    document.getElementById('coordDisplay').textContent =
        'Lat: ' + e.latlng.lat.toFixed(5) + ', Lng: ' + e.latlng.lng.toFixed(5);
});
map.on('zoomend', function() {
    document.getElementById('zoomDisplay').textContent = 'Zoom: ' + map.getZoom();
});

/* ===== UI & SEARCH FUNCTIONS ===== */

function toggleSidebarRight() {
    var sidebar = document.getElementById('sidebarRight');
    var icon = document.getElementById('sidebarRightToggleIcon');
    
    sidebar.classList.toggle('collapsed');
    
    // Balikkan arah ikon chevron penunjuk arah
    icon.className = sidebar.classList.contains('collapsed')
        ? 'fa fa-chevron-left'
        : 'fa fa-chevron-right';
}

/* ===== FUNGSI PENCARIAN DATA BIDANG TANAH ===== */
function cariPencarianEnter(e) {
    if (e.key === 'Enter') filterPencarian();
}

function filterPencarian() {
    // Ambil nilai dari input box pencarian
    var input = document.getElementById('inputCari').value.toLowerCase().trim();
    if (!input) return;
    
    // Pastikan layer bidang tanah sudah dimuat di peta
    if (!bidangTanahLayer) {
        alert("Lapisan Bidang Tanah belum aktif. Pastikan layer sudah dinyalakan.");
        return;
    }

    var ditemukan = false;

    // Iterasi setiap polygon/titik pada layer bidang tanah
    bidangTanahLayer.eachLayer(function(layer) {
        // Jika sudah ditemukan 1 data yang cocok, lewati yang lain agar lebih ringan (opsional)
        if (ditemukan) return; 

        var p = layer.feature.properties;
        
        // Tarik data atribut D_NOP dan ALAMAT. 
        // Fallback "" (string kosong) diberikan agar script tidak error jika data atribut bernilai null.
        var nop = p['D_NOP'] ? String(p['D_NOP']).toLowerCase() : "";
        var alamat = p['ALAMAT'] ? String(p['ALAMAT']).toLowerCase() : "";

        // Cek kecocokan input dengan NOP atau Alamat
        if (nop.includes(input) || alamat.includes(input)) {
            
            // Terbang (Zoom) ke luasan polygon bidang tersebut
            if (layer.getBounds) {
                // maxZoom dibatasi agar peta tidak terlalu menukik dekat
                map.flyToBounds(layer.getBounds(), { maxZoom: 19, padding: [40, 40], duration: 1.2 });
            } else if (layer.getLatLng) { 
                // Fallback jika datanya berupa titik/Point
                map.flyTo(layer.getLatLng(), 19, { duration: 1.2 });
            }

            // Beri jeda waktu sampai animasi terbang selesai sebelum memunculkan popup
            setTimeout(function() {
                layer.openPopup();
                
                // Memicu fungsi highlight merah yang sudah Anda buat sebelumnya
                highlightFeature({ target: layer });
            }, 1300);

            ditemukan = true;
        }
    });

    if (!ditemukan) {
        alert("Bidang tanah dengan NOP atau Alamat tersebut tidak ditemukan. Silakan periksa kembali kata kunci.");
    }
}

function toggleLayer(type) {
    var checks = { kantor: 'checkKantor', wms: 'checkWMS', bidang: 'checkBidang' };
    var layers = { kantor: layerKantor, wms: wmsLayer, bidang: bidangTanahLayer };
    if (!checks[type] || !document.getElementById(checks[type])) return;
    var layer = layers[type];
    if (!layer) return;
    if (document.getElementById(checks[type]).checked) {
        map.addLayer(layer);
    } else {
        map.removeLayer(layer);
    }
}

function fokusKeKantor() {
    if (!map.hasLayer(layerKantor)) {
        map.addLayer(layerKantor);
        document.getElementById('checkKantor').checked = true;
    }
    // Filter only Kecamatan or Desa main offices for bounding box focus
    var officeMarkers = layerKantor.getLayers().filter((m, i) => dataLokasi[i].tipe !== "Wilayah Desa");
    if(officeMarkers.length > 0) {
        var group = new L.featureGroup(officeMarkers);
        map.flyToBounds(group.getBounds(), { padding: [80, 80], duration: 1.2 });
    }
}

function zoomKeKarangdowo() {
    map.flyToBounds([
        [-7.721424424031263, 110.7223597939657],
        [-7.705673404661751, 110.75820307519317]
    ], { padding: [40, 40], duration: 1.2 });
}

function toggleSidebar() {
    var sidebar = document.getElementById('mapSidebar');
    var icon = document.getElementById('sidebarToggleIcon');
    sidebar.classList.toggle('collapsed');
    icon.className = sidebar.classList.contains('collapsed')
        ? 'fa fa-chevron-right'
        : 'fa fa-chevron-left';
}

function resetLayer() {
    [layerKantor, wmsLayer, bidangTanahLayer].forEach(function(l) {
        if (l && map.hasLayer(l)) map.removeLayer(l);
    });
    ['checkKantor', 'checkWMS', 'checkBidang'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.checked = false;
    });
    document.getElementById('inputCari').value = '';
    map.closePopup();
}

function bukaDataBidang() {
    window.open("BIDANG.html", "_blank");
}

/* ===== TRANSPARENCY CONTROLLER ===== */
function ubahTransparansi(layerType, value) {
    var opacityVal = parseFloat(value) / 100;
    
    if (layerType === 'wms' && wmsLayer) {
        wmsLayer.setStyle({ 
            fillOpacity: opacityVal, 
            opacity: opacityVal 
        });
    } else if (layerType === 'bidang' && bidangTanahLayer) {
        bidangTanahLayer.setStyle({ 
            fillOpacity: opacityVal * 0.7, // Keep initial relative max opacity
            opacity: opacityVal 
        });
    }
}

/* ===== REAL-TIME CLOCK ===== */
function updateClock() {
    var now = new Date();
    var opts = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
    document.getElementById('clock').textContent = now.toLocaleDateString('id-ID', opts);
}
setInterval(updateClock, 1000);
updateClock();

/* ===== INIT COMPONENTS ON DOM LOAD ===== */
window.addEventListener('DOMContentLoaded', function() {
    buildInlineLegend();
});

/* ===== DEEP LINK ROUTING FROM URL PARAMETERS ===== */
document.addEventListener("DOMContentLoaded", function() {
    const urlParams = new URLSearchParams(window.location.search);
    const lat = urlParams.get('lat');
    const lng = urlParams.get('lng');
    const zoom = urlParams.get('zoom') || 16;

    if (lat && lng) {
        setTimeout(() => {
            map.flyTo([parseFloat(lat), parseFloat(lng)], parseInt(zoom), {
                animate: true,
                duration: 1.5
            });
            L.marker([parseFloat(lat), parseFloat(lng)]).addTo(map)
                .bindPopup("Lokasi Bidang Tanah Terpilih")
                .openPopup();
        }, 800);
    }
});

/* ======================================================
   UPGRADED UNDUH DATA FUNCTIONS (GEOJSON & CSV)
   ====================================================== */

/* 1. Fungsi Unduh GeoJSON (Mendukung unduh data mentah atau data ter-filter) */
function unduhDataGeoJSON(tipeLayer, pakeFilter = false) {
    var dataObj = null;
    var namaFile = "";

    if (tipeLayer === 'PL') {
        if (typeof json_PL_0 === 'undefined') {
            alert("Data spasial Penggunaan Lahan belum dimuat.");
            return;
        }
        // Penggunaan Lahan sejauh ini belum dibuatkan filter multi-kondisi, pakai data mentah
        dataObj = json_PL_0;
        namaFile = "penggunaan_lahan_karangdowo.geojson";
        
    } else if (tipeLayer === 'BIDANG') {
        if (typeof json_BIDANG_TANAH_1 === 'undefined' || !bidangTanahLayer) {
            alert("Data spasial Bidang Tanah belum tersedia.");
            return;
        }

        if (pakeFilter) {
            // Mengambil kondisi spasial bidang tanah terbaru langsung dari objek peta Leaflet
            dataObj = bidangTanahLayer.toGeoJSON();
            namaFile = "bidang_tanah_terfilter_karangdowo.geojson";
            
            if (!dataObj || dataObj.features.length === 0) {
                alert("Tidak ada data bidang tanah yang lolos filter saat ini untuk diunduh.");
                return;
            }
        } else {
            // Mengunduh seluruh master data tanpa memperdulikan filter visual
            dataObj = json_BIDANG_TANAH_1;
            namaFile = "seluruh_bidang_tanah_karangdowo.geojson";
        }
    }

    if (!dataObj) return;

    // Proses download menggunakan Blob objek blob teks bertipe json
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataObj));
    var downloadLink = document.createElement('a');
    downloadLink.setAttribute("href", dataStr);
    downloadLink.setAttribute("download", namaFile);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();
}

/* 2. Fungsi Unduh Atribut Saja Ke Format CSV (Bisa langsung dibuka di Microsoft Excel) */
function unduhDataCSV(tipeLayer) {
    var layerAktif = (tipeLayer === 'PL') ? wmsLayer : bidangTanahLayer;
    
    if (!layerAktif) {
        alert("Lapisan terkait tidak aktif atau tidak ditemukan di memori peta.");
        return;
    }

    var geojsonData = layerAktif.toGeoJSON();
    var features = geojsonData.features;

    if (features.length === 0) {
        alert("Tidak ada baris data atribut yang dapat diekspor.");
        return;
    }

    // Ekstrak Header Kolom dari Feature pertama
    var headers = Object.keys(features[0].properties);
    var csvRows = [];
    csvRows.push(headers.join(',')); // Baris pertama CSV

    // Loop untuk menyusun data baris per baris
    features.forEach(function(feature) {
        var values = headers.map(function(headerName) {
            var val = feature.properties[headerName];
            // Bersihkan string dari koma atau enter agar format tabel tidak rusak di Excel
            if (typeof val === 'string') {
                val = `"${val.replace(/"/g, '""')}"`; 
            } else if (val === null || val === undefined) {
                val = '';
            }
            return val;
        });
        csvRows.push(values.join(','));
    });

    var csvContent = csvRows.join('\n');
    var namaFileCSV = (tipeLayer === 'PL') ? "tabel_atribut_pl.csv" : "tabel_atribut_bidang_tanah.csv";

    // Trigger download blob CSV
    var blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement("a");
    if (navigator.msSaveBlob) { // Fallback IE 10+
        navigator.msSaveBlob(blob, namaFileCSV);
    } else {
        var url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", namaFileCSV);
        document.body.appendChild(link);
        link.click();
        document.body.remove();
    }
}

/* ======================================================
   FITUR INTERAKTIF: RE-FILTERING SPASIAL & ATRIBUT
   ====================================================== */

/* 1. Eksekusi Pencarian & Filter Lapisan Bidang Tanah */
function terapkanFilterBidang() {
    if (typeof json_BIDANG_TANAH_1 === 'undefined' || !bidangTanahLayer) return;

    // Ambil nilai dari element kontrol UI
    var kataKunciNOP = document.getElementById('filterCariNOP').value.toLowerCase().trim();
    var statusTerpilih = document.getElementById('filterStatusBidang').value;
    var minLuas = parseFloat(document.getElementById('filterLuasMinBidang').value) || 0;
    var maxLuas = parseFloat(document.getElementById('filterLuasMaxBidang').value) || Infinity;

    // Bersihkan data lama di peta
    map.removeLayer(bidangTanahLayer);

    // Bangun ulang layer berdasarkan kriteria filter
    bidangTanahLayer = L.geoJson(json_BIDANG_TANAH_1, {
        interactive: true,
        pane: 'pane_BIDANG_TANAH_1',
        onEachFeature: pop_BIDANG,
        style: style_BIDANG,
        filter: function(feature) {
            var p = feature.properties;
            
            // Kriteria 1: Cocok NOP (Partial text search)
            var matchNOP = !kataKunciNOP || (p['D_NOP'] && String(p['D_NOP']).toLowerCase().includes(kataKunciNOP));
            
            // Kriteria 2: Cocok Status Hak Tanah
            var matchStatus = (statusTerpilih === 'Semua' || String(p['STATUS']) === statusTerpilih);
            
            // Kriteria 3: Masuk ke dalam Rentang Luasan
            var luasVal = parseFloat(p['LUAS']) || 0;
            var matchLuas = (luasVal >= minLuas && luasVal <= maxLuas);

            return matchNOP && matchStatus && matchLuas;
        }
    }).addTo(map);

    // Pastikan checkbox UI layer tetap sinkron dan aktif
    var checkEl = document.getElementById('checkBidang');
    if (checkEl) checkEl.checked = true;
}

/* 2. Eksekusi Pencarian & Filter Lapisan Penggunaan Lahan (PL) */
function terapkanFilterPL() {
    if (typeof json_PL_0 === 'undefined' || !wmsLayer) return;

    // Ambil nilai dari element kontrol UI
    var kataKunciToponim = document.getElementById('filterCariToponim').value.toLowerCase().trim();
    var jenisTerpilih = document.getElementById('filterJenisPL').value;
    var minLuas = parseFloat(document.getElementById('filterLuasMinPL').value) || 0;
    var maxLuas = parseFloat(document.getElementById('filterLuasMaxPL').value) || Infinity;

    // Bersihkan data lama di peta
    map.removeLayer(wmsLayer);

    // Bangun ulang layer berdasarkan kriteria filter
    wmsLayer = L.geoJson(json_PL_0, {
        interactive: true,
        pane: 'pane_PL_0',
        onEachFeature: pop_PL,
        style: style_PL,
        filter: function(feature) {
            var p = feature.properties;

            // Kriteria 1: Cocok Toponim / Nama Objek
            var matchToponim = !kataKunciToponim || (p['TOPONIM'] && String(p['TOPONIM']).toLowerCase().includes(kataKunciToponim));
            
            // Kriteria 2: Cocok Jenis Penggunaan Lahan
            var matchJenis = (jenisTerpilih === 'Semua' || String(p['JENIS']) === jenisTerpilih);
            
            // Kriteria 3: Masuk ke dalam Rentang Luasan (Mendukung properti LUAS atau Shape_Area)
            var luasVal = parseFloat(p['LUAS']) || parseFloat(p['Shape_Area']) || 0;
            var matchLuas = (luasVal >= minLuas && luasVal <= maxLuas);

            return matchToponim && matchJenis && matchLuas;
        }
    }).addTo(map);

    // Pastikan checkbox UI layer tetap sinkron dan aktif
    var checkEl = document.getElementById('checkWMS');
    if (checkEl) checkEl.checked = true;
}

/* 3. Fungsi Reset/Kembalikan Filter Bidang Tanah */
function resetFilterBidang() {
    document.getElementById('filterCariNOP').value = '';
    document.getElementById('filterStatusBidang').value = 'Semua';
    document.getElementById('filterLuasMinBidang').value = '';
    document.getElementById('filterLuasMaxBidang').value = '';
    terapkanFilterBidang();
}

/* 4. Fungsi Reset/Kembalikan Filter Penggunaan Lahan */
function resetFilterPL() {
    document.getElementById('filterCariToponim').value = '';
    document.getElementById('filterJenisPL').value = 'Semua';
    document.getElementById('filterLuasMinPL').value = '';
    document.getElementById('filterLuasMaxPL').value = '';
    terapkanFilterPL();
}

