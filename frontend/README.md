# Aplikasi GEA untuk Expo Go

Proyek Expo SDK 57 dan TypeScript, mengikuti SDK Expo Go yang tersedia saat
setup. Folder ini terpisah dari backend Deno/Supabase. Tidak ada secret admin
dalam aplikasi.

## Membuka di HP

```powershell
cd frontend
npm ci
# .env sudah diisi untuk project GEA pada mesin ini.
# Untuk checkout baru: salin .env.example ke .env dan isi publishable key.
npm start
```

Pasang Expo Go di HP, sambungkan HP dan laptop ke Wi-Fi yang sama, lalu scan QR
dari terminal. Pada Android, scan melalui Expo Go. Pada iPhone, ikuti instruksi
Expo Go dan gunakan akun Expo yang sama dengan CLI jika diminta. QR server Expo
untuk membuka aplikasi berbeda dari QR museum yang dipindai di dalam aplikasi.
Pengujian kamera dan GPS dilakukan pada HP fisik.

Jika HP tidak dapat menjangkau koneksi LAN, gunakan tunnel ngrok yang sudah
menjadi dev dependency lokal proyek:

```powershell
npm run start:tunnel
```

Tunnel memerlukan internet di laptop dan HP; keduanya tidak harus berada pada
Wi-Fi yang sama. Scan QR baru dari terminal. Tidak perlu menambahkan kata
`ngrok` pada command atau menginstalnya secara global. Jika port 8081 masih
dipakai server lain, gunakan `npm run start:tunnel -- --port 8082`, atau
hentikan server lama melalui terminalnya sendiri. Tunnel mengubah jalur koneksi,
bukan versi SDK. Jika Expo Go menampilkan SDK mismatch, versi SDK perlu
disesuaikan berdasarkan pesan tersebut.

`npm run android` membuka emulator/perangkat Android yang sudah disiapkan.
`npm run ios` memerlukan simulator iOS di macOS; pengguna Windows tetap dapat
memakai iPhone dengan Expo Go. `npm run web` membuka versi browser untuk
memeriksa tampilan. Kamera/lokasi browser mengikuti izin browser dan persyaratan
secure context.

Pada mesin Windows ini, log ngrok menunjukkan
`x509: certificate signed by unknown authority`. Paket lokal dan executable
ngrok berfungsi, tetapi tunnel belum berhasil terhubung. Konfigurasi profil Expo
di `C:\Users\Tyara\.expo\ngrok.yml` menggunakan CA bawaan ngrok; validasi TLS
tetap aktif. Pengujian CA Windows juga belum dapat memverifikasi sertifikat yang
diterima. Periksa sertifikat/jalur jaringan sebelum menambahkan CA apa pun.
Salinan konfigurasi asal ada di `.expo/ngrok.original.yml`; file profil dan
backup dapat berisi kredensial ngrok sehingga tidak boleh dimasukkan Git.

## Perilaku yang tersedia

- Landing GEA dengan tombol pemeriksaan lokasi dan status koneksi layanan.
- Permintaan izin GPS foreground hanya setelah tombol ditekan.
- Akurasi GPS dikirim sebagai `accuracyMeters`, termasuk penanganan akurasi yang
  tidak tersedia.
- Keputusan akses ditentukan backend. Tidak ada mode yang otomatis meloloskan
  lokasi simulasi.
- QR pintu masuk diperiksa backend; aplikasi hanya memvalidasi format token saat
  scan.
- Setelah sesi berhasil dibuat, daftar POI published diambil dari backend.
- Identitas Auth anonim dipertahankan dengan AsyncStorage dan refresh mengikuti
  AppState.

Ini fondasi integrasi, bukan hi-fi final PD1/PD2. Detail Stories, pemutar audio,
pilgan, QR checkpoint koleksi, dan pemulihan sesi kunjungan setelah restart
masih perlu dilanjutkan. Sesi Auth dipertahankan, tetapi ID sesi kunjungan saat
ini hanya disimpan selama aplikasi hidup.

## Koneksi Supabase dan database

Environment aplikasi menggunakan `EXPO_PUBLIC_SUPABASE_URL` dan
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Keduanya bukan akses admin dan tidak
bisa menjalankan migrasi. `.env` tidak masuk Git. Setelah mengganti environment,
restart Metro dengan `npm start -- --clear`.

Database GEA, bucket media, dan fungsi backend sudah dideploy ke project cloud.
Anonymous Sign-Ins sudah aktif. Tombol "Cek layanan" sekarang dapat memeriksa
endpoint cloud. Konfigurasi batas museum dan konten POI belum diisi, sehingga
akses GPS belum diizinkan dan daftar published masih kosong. Panduan pengelolaan
migrasi serta Auth ada di `../backend/README.md`.

Jika fungsi backend belum dideploy, tombol "Cek layanan" menampilkan layanan
belum tersedia. Jika Anonymous Sign-Ins belum aktif, pembuatan identitas
pengunjung ditolak. Jika batas museum belum ditetapkan, pengecekan geofence
tidak mengizinkan masuk. Jika belum ada konten approved, daftar POI akan kosong.
Kondisi tersebut tidak digantikan data museum buatan.

## Pemeriksaan

```powershell
npm run typecheck
npm run doctor
npm run export:android
npm run export:web
```

Export membuktikan bundle dapat dibuat, bukan membuktikan GPS/kamera sudah diuji
di perangkat. Gunakan build Expo Go di HP untuk memeriksa izin ditolak, GPS
lemah, QR invalid, dan keberhasilan gating setelah backend cloud siap. Detail
error HTTP dicatat sebagai field terstruktur di log Metro; token Auth tidak
dicetak.

Audit dependency SDK 57 dan tooling tunnel masih melaporkan 15 temuan transitif
(3 high). Versi Zod yang dipakai kode aplikasi adalah 4.6.7; temuan Zod lama
berasal dari tooling Expo. Saran `npm audit fix
--force` memindahkan Expo ke SDK
58, sehingga tidak diterapkan pada target Expo Go SDK 57 ini.
