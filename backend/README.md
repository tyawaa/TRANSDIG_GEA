# Backend GEA

Backend sprint Stories menggunakan Supabase PostgreSQL, Edge Functions TypeScript/Deno, Supabase
Auth anonim, dan Supabase Storage. Aplikasi yang direncanakan adalah Expo/React Native. Tidak perlu
Express atau server hosting tambahan. Project tujuan: `rjlihrvudakfhehbkncw`
(`https://rjlihrvudakfhehbkncw.supabase.co`).

Database cloud sudah memiliki tiga migrasi GEA (16 tabel public/private), bucket `gea-media`, Auth
anonim aktif, dan fungsi `gea-api` terdeploy. Endpoint health:
`https://rjlihrvudakfhehbkncw.supabase.co/functions/v1/gea-api/health`. Pengujian cloud
memverifikasi Auth/API/geofence dan penolakan akses langsung ke kunci. Dataset published masih
kosong dan konfigurasi area museum belum diisi; ini bukan data demo.

Backend ini menyediakan skema ERD, API Stories, sesi, QR, jawaban, progres, dan evaluasi geofence.
Frontend awal Expo tersedia di `../frontend` untuk landing, GPS, QR pintu masuk, dan daftar POI.
Konten museum yang disetujui, file media, koordinat museum, dan uji lapangan belum tersedia.
Keputusan penggunaan Supabase sudah disetujui dalam pengerjaan ini; handoff teknologi aplikasi tetap
perlu dicocokkan dengan C3.

## Menjalankan dan memeriksa

Node.js >=22 dan npm diperlukan untuk memasang alat proyek; Deno dan Supabase CLI terpasang sebagai
dev dependency, bukan global.

```powershell
cd backend
npm ci
npm run check
npm run lint
npm test
npm run demo:geofence
```

Tes tidak memerlukan museum, Docker, akun cloud, ataupun data produksi. PGlite menjalankan migrasi
dan operasi SQL pada PostgreSQL WASM sementara; fixture enam POI hanya ada di
`tests/fixtures/stories.sql`. Ini bukan pengganti uji runtime Auth/Storage/Edge Supabase.

Untuk stack Supabase lokal, nyalakan Docker Desktop, lalu:

```powershell
npm run start
Copy-Item .env.example .env
npm run serve
```

`supabase start` menerapkan migrasi ke database lokal baru. `npm run db:reset` hanya untuk database
lokal yang datanya memang boleh dihapus. Jangan gunakan reset pada project cloud. Seed otomatis
sengaja dimatikan agar konten simulasi tidak masuk deployment.

## Deploy ke project tim

Login dilakukan pengguna di terminal agar access token tidak dikirim melalui chat.

```powershell
npx supabase login
npx supabase link --project-ref rjlihrvudakfhehbkncw
npm run db:push
npm run deploy:function
```

Pada Windows dengan CA jaringan yang sudah tepercaya di certificate store sistem, jalankan
`$env:NODE_USE_SYSTEM_CA = '1'` sebelum perintah CLI bila muncul `Transport error`. Ini memakai CA
sistem untuk koneksi CLI, tanpa mematikan validasi TLS. Login tersimpan lokal; access token tidak
perlu ditaruh dalam source code atau dikirim melalui chat.

CLI dapat meminta password database saat link/push; masukkan hanya ke prompt lokal. Sebelum migrasi,
periksa schema project tujuan: migrasi ini membuat tabel GEA baru dan tidak menghapus tabel lain.
Bila tabel bernama sama sudah ada, rekonsiliasi skema dahulu; jangan hapus data tim.

CLI dipin ke versi 3: `db:push` memakai `--remote` secara eksplisit. Deployment fungsi memakai
`--use-api`, sehingga tidak membutuhkan Docker. Docker hanya diperlukan stack lokal.

Di Dashboard > Authentication > Sign In / Providers, aktifkan Anonymous Sign-Ins. Akun anonim
dipakai hanya sebagai identitas teknis pemilik sesi, tanpa form akun/password. Simpan dan pulihkan
sesi Auth pada aplikasi. Jika token anonim hilang, progres tidak otomatis bisa dipindahkan ke
identitas baru.

Runtime Supabase menyediakan `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY`.
Service-role key hanya dibaca di Edge Function. Jangan memakai prefix `NEXT_PUBLIC_` atau
`EXPO_PUBLIC_` untuk secret admin. Publishable key yang diberikan tim dipakai hanya untuk koneksi
aplikasi/Auth.

Salin `.env.example` ke `.env`, isi konfigurasi museum setelah verifikasi PM, lalu:

```powershell
npx supabase secrets set --env-file .env
```

Fungsi masih dapat melayani QR tanpa konfigurasi GPS museum. Parameter museum yang kosong tidak
pernah otomatis mengizinkan akses GPS. Parameter yang lengkap tetapi salah membuat startup gagal
dengan pesan konfigurasi yang jelas.

`verify_jwt=false` pada config **bukan** API tanpa autentikasi: setiap endpoint data memvalidasi
bearer token lewat Auth `/user`, agar mendukung signing keys Supabase. Hanya `/health` dan preflight
CORS yang tidak membutuhkan token. Semua tabel dan RPC GEA ditolak untuk role
`anon`/`authenticated`; Edge memakai service role dan mengambil user ID dari Auth, bukan body.

## Kontrak API

Base URL cloud: `https://rjlihrvudakfhehbkncw.supabase.co/functions/v1/gea-api`. Sukses:
`{ "data": ... }`. Gagal: `{ "error": { "code": "...", "message": "..." }, "requestId": "..." }`.
Kirim `Authorization: Bearer <access_token>` dan `Content-Type: application/json` untuk POST.
Publishable key bukan pengganti access token pengunjung.

| Method | Path                                      | Input penting                                                                     |
| ------ | ----------------------------------------- | --------------------------------------------------------------------------------- |
| GET    | `/health`                                 | Tidak membutuhkan token; pemeriksaan proses, bukan seluruh layanan                |
| POST   | `/geofence/evaluate`                      | `location` berupa koordinat+akurasi, atau `null`                                  |
| GET    | `/pois`                                   | Daftar POI published, urut prioritas                                              |
| GET    | `/pois/{id}?language=id&profile=umum`     | Varian wajib eksplisit; tidak ada fallback terjemahan                             |
| POST   | `/sessions`                               | `idSesi`, `language`, `profile`, `location`; GPS wajib inside                     |
| POST   | `/sessions/qr`                            | `idSesi`, `language`, `profile`, `token` QR pintu masuk                           |
| POST   | `/sessions/{id}/verify-qr`                | `token` QR koleksi, `language`, `profile`; mengembalikan POI dan bukti verifikasi |
| POST   | `/sessions/{id}/quests/{questId}/answers` | `requestId` UUID dan `labelOpsi` A-D                                              |
| POST   | `/sessions/{id}/pois/{poiId}/close`       | Menyimpan kartu ditutup pada sesi ini                                             |
| GET    | `/sessions/{id}/progress`                 | Sesi, kartu, dan hasil quest milik pengunjung                                     |

Bahasa: `id`/`en`. Profil: `umum`/`pelajar`. Detail POI mengembalikan `cards` dengan jenis
`description` dan `audio`, ditambah satu `quest` dengan empat opsi. Kunci jawaban dan hint tidak
dikirim di detail; hint hanya dikirim setelah jawaban salah. Field domain mengikuti nama ERD
(`id_poi`, `id_zona`, dsb); objek request dan keputusan menggunakan camelCase seperti tabel di atas.

Contoh lokasi adalah **SIMULASI**, bukan koordinat museum:

```json
{ "location": { "latitude": 0, "longitude": 0, "accuracyMeters": 20 } }
```

Contoh keputusan tanpa konfigurasi museum:

```json
{
  "data": {
    "status": "not_configured",
    "accessAllowed": false,
    "distanceMeters": null,
    "accuracyMeters": 20,
    "fallback": "entrance_qr",
    "reasonCode": "MUSEUM_AREA_NOT_CONFIGURED"
  }
}
```

Contoh jawaban:

```json
{ "requestId": "60000000-0000-4000-8000-000000000001", "labelOpsi": "B" }
```

```json
{
  "data": {
    "idQuest": "40000000-0000-4000-8000-000000000001",
    "idPoi": "30000000-0000-4000-8000-000000000001",
    "answerCorrect": false,
    "attemptCount": 1,
    "completed": false,
    "hint": "Petunjuk sesuai konten museum."
  }
}
```

Gunakan UUID `idSesi` yang sama untuk mengulang pembuatan sesi. Setiap **percobaan baru** memakai
`requestId` baru; retry transport memakai request ID yang sama. Pemakaian ulang ID dengan payload
berbeda menghasilkan 409, sehingga retry tidak menggandakan jumlah percobaan. Jawaban benar
menyelesaikan quest; pengiriman baru setelah selesai menghasilkan 409. Penilaian dan pencatatan
percobaan berlangsung atomik dalam transaksi SQL yang mengunci sesi.

Contoh PowerShell/curl (gunakan `curl.exe`, bukan alias Invoke-WebRequest):

```powershell
$base = 'https://rjlihrvudakfhehbkncw.supabase.co/functions/v1/gea-api'
curl.exe "$base/health"
# $token adalah access token pengunjung, hasil signInAnonymously(), bukan publishable key.
curl.exe "$base/pois" -H "Authorization: Bearer $token"
curl.exe "$base/geofence/evaluate" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' --data-raw '{"location":null}'
```

Dalam aplikasi, buat/pulihkan identitas lewat `supabase.auth.signInAnonymously()` sebelum API.
Gunakan sesi Auth yang sama untuk melanjutkan sesi kunjungan. Jangan mengirim user ID, boolean
`isCorrect`, atau boolean `qrVerified` dari aplikasi sebagai bukti yang dipercaya server.

Setelah deploy dan mengaktifkan Auth anonim, jalankan pengujian cloud sungguhan:

```powershell
$env:GEA_PROJECT_URL = 'https://rjlihrvudakfhehbkncw.supabase.co'
$env:GEA_PUBLISHABLE_KEY = '<publishable key project>'
$env:DENO_TLS_CA_STORE = 'system'
npm run smoke
```

Smoke membuat satu identitas anonim pengujian, memeriksa health/API/geofence/validasi, dan
memastikan Data API menolak akses kunci. Tidak mengunggah POI, media, atau lokasi simulasi.

## A3: geofence dan gating landing

Representasi museum adalah lingkaran pusat+radius dalam meter, usulan teknis sesuai Haversine. PM
masih perlu mengesahkan batasnya berdasarkan survei/peta gedung. Konfigurasi melalui secret
`GEA_MUSEUM_LATITUDE`, `GEA_MUSEUM_LONGITUDE`, `GEA_MUSEUM_RADIUS_METERS`, dan `GEA_MUSEUM_ZONE_ID`
yang merujuk zona dalam DB. Koordinat memakai derajat geografis WGS84. Zona/checkpoint pada ERD
berbeda dari batas seluruh museum. Radius checkpoint 10 m dan ambang akurasi GPS 20 m tidak boleh
dijadikan radius museum secara otomatis.

| Kondisi                             | Status backend         | Perilaku aplikasi                                                 |
| ----------------------------------- | ---------------------- | ----------------------------------------------------------------- |
| Akurasi 0..20 m, jarak <= radius    | `inside`               | Boleh membuat sesi GPS dan melewati landing                       |
| Akurasi 0..20 m, jarak > radius     | `outside`              | Tampilkan belum berada di museum                                  |
| Akurasi >20 m                       | `low_accuracy`         | Jangan simpulkan outside; tawarkan QR pintu masuk                 |
| GPS tidak tersedia, `location:null` | `location_unavailable` | Tawarkan QR pintu masuk                                           |
| Konfigurasi belum lengkap           | `not_configured`       | Tolak akses GPS; QR yang benar-benar valid tetap jalur independen |
| Koordinat/akurasi tidak valid       | HTTP 400               | Perbaiki payload; jangan ubah menjadi lokasi unavailable          |

Izin lokasi dan pembacaan GPS tetap dikerjakan Expo Location. Jika izin ditolak, aplikasi
menjelaskan alasannya, mengirim `location:null`, dan menawarkan QR jika kamera tersedia. Pemilihan
ruang manual dari brief belum dipakai sebagai bukti lokasi. PM perlu memutuskan jalur izin
lokasi+kamera ditolak; backend tidak menerbitkan akses terverifikasi berdasarkan pilihan manual
saja.

Endpoint evaluasi tidak menerbitkan izin sesi. Endpoint pembuatan sesi mengevaluasi ulang input,
sehingga boolean izin dari client tidak dipercaya. Koordinat client tetap dapat dipalsukan; ini
validasi geofence untuk prototipe, bukan sistem anti-spoofing GPS.

## QR dan data enam POI

QR berisi token acak 32 byte dalam bentuk 64 karakter hex. Database hanya menyimpan hash SHA-256,
target entrance/POI, masa berlaku, dan pencabutan. Token tidak tersedia dari API daftar/detail. QR
koleksi menerbitkan verifikasi server untuk sesi+POI selama paling lama 15 menit (usulan untuk
dikonfirmasi PM), dibatasi juga expiry QR. QR statis masih dapat disalin; token ini bukan bukti
anti-replay kehadiran fisik.

```powershell
npm run qr:create -- entrance ZONA_UUID 2026-12-01T00:00:00Z .local/entrance
npm run qr:create -- poi POI_UUID 2026-12-01T00:00:00Z .local/poi-1
```

Buat folder `.local` terlebih dahulu. Jalankan SQL yang dihasilkan sebagai admin melalui migrasi/SQL
Editor, lalu ubah isi `.token.txt` menjadi QR fisik melalui alat tim. Token tidak dicetak ke log dan
file token diabaikan Git. UUID/expiry contoh wajib diganti. Untuk mencabut, isi `revoked_at` pada
baris token. Tidak ada QR mock di jalur produksi.

Isi `data/poi-template.json` bersama PM/PD2. Nilai `null` sengaja menandai konten belum ada.
Template memuat enam ID POI dan quest yang stabil, bukan enam koleksi museum yang telah disetujui.
Generator menghasilkan seed awal satu varian bahasa/profil, bukan pengubah data yang sudah ada.
Varian tambahan ditambahkan lewat migrasi data sesuai PK komposit ERD.

```powershell
npm run seed:prepare -- data/poi-approved.json supabase/migrations/20261103000400_approved_pois.sql
```

Generator menolak `approved:false`, kolom kosong, deskripsi >100 kata, audio di luar 30-90 detik,
atau opsi yang bukan empat label A-D dengan tepat satu kunci. Media harus diunggah ke bucket
`gea-media` dengan object path `images/...` dan `audio/...`. Bucket ini **publik** hanya untuk
foto/narasi museum yang disetujui, maksimal 10 MiB per file; bukan untuk foto pengunjung. Admin
mengunggah media; client tidak memiliki izin upload. Sebelum menyebut B3 selesai, periksa seluruh
URL media dan cocokkan durasi file sebenarnya, bukan hanya metadata JSON.


## Handoff dan batas selesai

- C2: review skema, SQL/RLS, akses project, dan deployment; cocokkan nama/tipe ERD final.
- C3: lanjutkan frontend awal dengan dua kartu, audio player, jawaban pilgan, dan pemulihan sesi
  kunjungan.
- PD1: landing inside/outside/GPS lemah/izin ditolak/belum dikonfigurasi.
- PM: koordinat/radius museum, aturan manual, expiry QR, batas percobaan, varian konten wajib.
- PM/PD2: enam koleksi disetujui, foto, teks, audio, soal dan kunci; belum tersedia di repo.

Percobaan salah saat ini boleh diulang tanpa batas; poin, lencana, quest foto, pergantian preferensi
sesi, dan GPS spesifik koleksi belum termasuk API sprint ini. Geofence museum bukan bukti
checkpoint. QR koleksi adalah jalur verifikasi quest yang tersedia; GPS koleksi memerlukan koordinat
koleksi yang diverifikasi, sedangkan ERD saat ini hanya punya posisi denah.

Pembacaan GPS dan gating landing awal tersedia di aplikasi Expo. E3 masih memerlukan uji mock
location/perangkat dan integrasi cloud yang berhasil. E7/E8 memerlukan frontend Stories lengkap. B3
belum selesai sebelum konten asli dan media terunggah serta URL diperiksa.
