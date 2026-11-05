# Perubahan C1: Geofence Gedung Museum Geologi

Tanggal penyusunan: 5 November 2026.

## Tujuan dan status

Backend sebelumnya memeriksa apakah pengunjung berada dalam lingkaran pusat + radius. Perubahan
ini menambahkan poligon 8 titik agar area valid mengikuti bagian gedung yang ditandai pengguna,
termasuk dua belokan di sisi atas. GPS dengan akurasi maksimal 20 meter dapat memberikan akses
jika titik berada di dalam atau tepat pada batas poligon.

Kode dan tes lokal sudah disiapkan. Belum dipush, digabungkan, atau dideploy oleh penyusun paket.
Status aktual GitHub/deploy harus diperbarui oleh tim setelah masing-masing langkah dilakukan.
Batas masih berasal dari pemetaan manual, belum hasil verifikasi lapangan. A3 memiliki draft batas;
E3 belum selesai sebelum uji perangkat dan cloud berhasil.

## File perubahan

| File relatif terhadap folder backend | Perubahan |
| --- | --- |
| `supabase/functions/gea-api/polygon.ts` | Baru: validasi bentuk poligon dan pemeriksaan posisi, termasuk belokan dan batas inklusif. |
| `supabase/functions/gea-api/geofence.ts` | Mendukung poligon; mempertahankan lingkaran lama serta aturan akurasi dan QR. |
| `supabase/functions/gea-api/config.ts` | Membaca konfigurasi JSON poligon dari environment. |
| `data/museum-polygon.json` | Delapan koordinat batas yang disepakati dalam percakapan. |
| `tests/polygon.test.ts` | Tes geometri, konfigurasi, akurasi, dan kompatibilitas lingkaran. |
| `tests/polygon-api.test.ts` | Tes handler API dengan Auth/RPC simulasi, termasuk penolakan sesi di luar area. |
| `docs/README_Geofence_Poligon.md` | Dokumentasi perubahan ini. |

`index.ts`, API Stories, tabel database, dan frontend tidak perlu diubah untuk dukungan poligon ini.
Paket tidak mengimplementasikan pemicu masuk zona, notifikasi, atau kartu pengantar otomatis.
Tidak ada migrasi skema database.

## Koordinat

Titik referensi: latitude `-6.900660443043143`, longitude `107.62147535330041`.
Titik ini bukan simpul poligon atau pusat geometris yang dihitung; dipakai sebagai acuan jarak.

| Urutan | Posisi | Latitude | Longitude |
| --- | --- | --- | --- |
| 1 | Kiri bawah | -6.900783657530911 | 107.62110833169152 |
| 2 | Kiri atas | -6.900614677657939 | 107.62111187779405 |
| 3 | Belokan atas kiri | -6.90059003475174 | 107.62139024684019 |
| 4 | Puncak kiri | -6.900531947903464 | 107.62139911209647 |
| 5 | Puncak kanan | -6.9005301876958285 | 107.62155159450435 |
| 6 | Belokan atas kanan | -6.900581233714586 | 107.62155691365813 |
| 7 | Kanan atas | -6.900588274544322 | 107.62183882880763 |
| 8 | Kanan bawah | -6.900744932978993 | 107.62184060185888 |

Hubungkan 1 sampai 8, lalu kembali ke 1. Titik tengah bawah lama dihapus. Titik pintu zona tidak
ikut membentuk batas gedung. File JSON memakai objek `{latitude, longitude}`, bukan format GeoJSON.

## Data zona pameran yang dikonfirmasi pengguna

| Zona | UUID | Latitude | Longitude | Radius |
| --- | --- | --- | --- | --- |
| Sejarah Kehidupan | `0d333de7-9478-41a1-aca0-eb92ad69f99d` | -6.90065942546628 | 107.62155549885372 | 10 m |
| Geologi Indonesia | `a3bb823a-24b6-4940-8130-a950de1254c0` | -6.900663419634679 | 107.62139322521762 | 10 m |

Pengguna telah memasukkan dua baris ini ke `public.zona`, berdasarkan screenshot yang diberikan.
Keduanya merupakan zona pameran, bukan otomatis referensi sesi masuk museum. Perubahan data melalui
Table Editor tidak membuat commit GitHub. Bila data perlu direproduksi di lingkungan lain,
koordinasikan seed/migrasi data terpisah dengan C2; jangan menjalankan ulang insert tanpa cek UUID.

## Konfigurasi Supabase

Setelah kode baru terdeploy, atur Edge Functions Secrets:

| Nama | Nilai |
| --- | --- |
| `GEA_MUSEUM_LATITUDE` | `-6.900660443043143` |
| `GEA_MUSEUM_LONGITUDE` | `107.62147535330041` |
| `GEA_MUSEUM_POLYGON_JSON` | Seluruh array dari `backend/data/museum-polygon.json`. |
| `GEA_MUSEUM_ZONE_ID` | UUID zona untuk referensi sesi masuk yang dikonfirmasi bersama C2. Belum ditentukan dalam perubahan ini. |

`GEA_MUSEUM_ZONE_ID` masih diperlukan oleh RPC `buat_sesi_gps` sebagai referensi data sesi. Jangan
memilih salah satu zona pameran secara acak. Ketiadaan keputusan ini masih menghalangi aktivasi
konfigurasi poligon. Kode dapat dipasang dahulu dengan konfigurasi lama.

Jika JSON poligon terisi, radius lama tidak dipakai untuk keputusan akses. JSON/config poligon
invalid membuat startup gagal, bukan kembali ke lingkaran. Jika JSON tidak diisi, mode lingkaran
lama tetap tersedia. Field respons `distanceMeters` tetap jarak ke titik referensi, bukan ke tepi.
Jangan unggah `.env` berisi kredensial atau service-role/access token ke GitHub.

## Alur kerja tim

1. GitHub menjadi sumber kode utama. Buat branch `c1-geofence-polygon` dari branch utama terbaru.
2. Terapkan tujuh file dalam paket ini pada lokasi yang sama; periksa diff sebelum commit.
   Jangan menyalin seluruh `gea-api.zip` hasil download dashboard ke repo: `app.ts` di dashboard
   masih berbentuk satu file, sedangkan repo telah memisahkan routing ke beberapa file.
3. Commit dengan pesan `feat(geofence): support museum polygon boundary`.
4. Buat pull request untuk review bersama C2/C3, jalankan tes, lalu gabungkan sesuai alur tim.
5. Deploy kode dari commit yang telah disepakati ke fungsi `gea-api` pada project tim.
6. Aktifkan Secrets setelah referensi zona sesi masuk disepakati, lalu uji cloud/perangkat.
7. Catat commit, tanggal deploy, dan hasil uji. Bila sudah terlanjur edit dashboard, sinkronkan
   perubahan yang sama ke GitHub; jangan membiarkan kode dashboard dan repo berbeda.

Commit lewat situs GitHub dapat dilakukan tanpa instalasi Git/Node.js. Upload folder `backend`
dari paket ke root repo agar struktur folder terjaga, gunakan branch baru dan pull request.
Jangan mengunggah ZIP sebagai pengganti file sumber. GitHub tidak otomatis men-deploy ke Supabase
kecuali integrasi/CI untuk deployment tersebut memang sudah dikonfigurasi.

Deployment CLI oleh pengembang yang memiliki akses, dari folder backend pada checkout yang benar:

```sh
npm run deploy:function
```

Perintah tersebut memerlukan project Supabase tim sudah terhubung sesuai README backend.
Jika menggunakan editor dashboard, tempel versi final `polygon.ts`, `geofence.ts`, dan `config.ts`
yang sama dengan commit GitHub, kemudian deploy bersama. Jangan menimpa perubahan fungsi lain.

## Pengujian dan keterbatasan

Tes terarah dari folder backend, setelah Deno/dependency proyek tersedia:

```sh
deno test tests/polygon.test.ts tests/polygon-api.test.ts
deno check --config deno.json supabase/functions/gea-api/index.ts tests/polygon.test.ts tests/polygon-api.test.ts
deno lint
```

Validasi lokal: empat tes terarah lulus, pemeriksaan tipe dan lint lulus. Skenario mencakup ruang
utama, tonjolan atas, cekungan di luar, semua simpul/sisi, arah ring terbalik, geometri rusak,
konfigurasi rusak, akurasi 20 dan >20 meter, Auth wajib, dan sesi di luar area yang ditolak meskipun
client mengirim `accessAllowed: true`. Auth dan RPC pada tes API memakai mock, bukan cloud.

Suite SQL lengkap belum terverifikasi pada pengerjaan ini karena pengunduhan dependensi PGlite
tertahan. Belum ada bukti deploy/tes Supabase langsung atau uji lokasi dengan HP. Akurasi GPS
maksimal 20 meter tetap dapat bergeser melewati dinding; poligon bukan jaminan kehadiran indoor
atau perlindungan dari pemalsuan GPS. QR pintu masuk tetap memerlukan token yang valid di backend.

## Catatan rilis yang perlu diisi tim

- Commit/PR: belum diisi.
- Tanggal deploy dan pelaksana: belum dikonfirmasi.
- UUID referensi sesi masuk: belum ditentukan.
- Hasil uji cloud dan perangkat: belum tersedia.

Referensi: [Supabase Dashboard Functions](https://supabase.com/docs/guides/functions/quickstart-dashboard)
dan [unggah file melalui GitHub](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository).
