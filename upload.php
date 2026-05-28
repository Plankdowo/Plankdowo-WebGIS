<?php
// Pastikan folder tujuan ada
$target_dir = "data/";
if (!file_exists($target_dir)) {
    mkdir($target_dir, 0777, true);
}

// Nama file yang akan selalu digunakan (agar map.html tidak perlu ganti kodingan)
$target_file = $target_dir . "bidang.geojson"; 

$uploadOk = 1;
$fileType = strtolower(pathinfo($_FILES["layerFile"]["name"], PATHINFO_EXTENSION));

// Periksa apakah ada file yang diunggah
if(isset($_POST["submit"])) {
    
    // Validasi 1: Pastikan formatnya adalah geojson
    if($fileType != "geojson") {
        echo "<script>alert('Maaf, hanya file format .geojson yang diperbolehkan.'); window.location.href='admin.html';</script>";
        $uploadOk = 0;
    }
    
    // Jika lolos validasi, lakukan proses upload/penimpaan file
    if ($uploadOk == 1) {
        if (move_uploaded_file($_FILES["layerFile"]["tmp_name"], $target_file)) {
            echo "<script>alert('Berhasil! File GeoJSON telah diperbarui. Peta Karangdowo sudah terupdate.'); window.location.href='admin.html';</script>";
        } else {
            echo "<script>alert('Maaf, terjadi kesalahan saat mengunggah file.'); window.location.href='admin.html';</script>";
        }
    }
} else {
    // Jika diakses langsung tanpa lewat form
    header("Location: admin.html");
}
?>