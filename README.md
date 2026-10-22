# Kamus Kutai — prototipe multi-halaman

## Struktur proyek

```text
kamus-kutai-project/
├── index.html             # Beranda
├── kamus.html             # Daftar kosakata dan pencarian
├── detail.html            # Detail satu lema (?kata=etam)
├── kategori.html          # Kategori kata
├── favorit.html           # Kosakata favorit
├── tentang.html           # Informasi proyek dan formulir usulan
├── profil.html            # Profil dan preferensi lokal
├── riwayat.html           # Riwayat kata yang pernah dibuka
├── assets/
│   ├── app.css            # Semua gaya / UI
│   └── app.js             # Logika bersama dan interaksi halaman
└── data/
    ├── kosakata.json      # Database kata, makna, contoh dan dialek
    └── kategori.json      # Database kategori
```

## Menjalankan

Karena halaman membaca file JSON menggunakan `fetch()`, jalankan melalui server lokal; jangan membuka `index.html` langsung dengan protokol `file://`.

**VS Code:** buka folder `kamus-kutai-project`, pasang/aktifkan ekstensi Live Server bila belum ada, klik kanan `index.html`, lalu pilih **Open with Live Server**.

## Mengelola data kata

Edit `data/kosakata.json` untuk menambah/mengubah lema. Isi utama: `id`, `kata`, `pelafalan`, `kelasKata`, `kategori`, `dialek`, `arti`, `contoh`, dan `terjemahan`. Nilai `kategori` harus cocok dengan salah satu `id` di `data/kategori.json`.

Untuk membuat entri baru, duplikasi satu objek JSON dan pastikan tanda koma serta tanda kutip valid. Tampilan, pencarian, detail, favorit, dan kategori mengambil data dari file ini sehingga kata dan arti tidak perlu ditanamkan ke HTML.

## Catatan database

Ini menggunakan file JSON sebagai **database lokal statis**, bukan server database seperti MySQL atau Firebase. Favorit, tema, riwayat, nama profil, dan usulan tersimpan di `localStorage` pada browser/perangkat yang sedang digunakan. Data tidak otomatis disinkronkan ke perangkat lain atau dikirim ke server.

Kosakata, definisi, dan contoh yang tersedia merupakan data awal dari prototipe yang diberikan. Sebagian mungkin bersifat ilustratif; verifikasi ejaan, makna, dan contoh bersama penutur bahasa Kutai sebelum dipublikasikan sebagai sumber rujukan.
