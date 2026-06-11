# El Partners — Website & Admin Dashboard

Website legal & corporate service dengan dashboard admin untuk mengelola konten secara dinamis.

## Fitur

- **Website Publik** — Landing page modern untuk jasa legalitas usaha (PT, NIB, Merek, dll)
- **Admin Dashboard** — Login, kelola konten website, lihat pesan masuk
- **Auth JWT** — Login aman dengan token
- **Form Visual** — Update konten tanpa perlu ngerti HTML/JSON
- **Upload Logo** — Upload logo klien langsung dari dashboard
- **API** — REST API untuk semua operasi CRUD

## Tech Stack

| Komponen | Teknologi |
|----------|-----------|
| Backend | Node.js + Express 4 |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Storage | JSON file (data/content.json) |
| Upload | Multer (file gambar) |
| Frontend | HTML + CSS + JS murni (tanpa bundler) |

## Lisensi

Project ini dilisensikan di bawah **GNU General Public License v3.0** — lihat file [LICENSE](LICENSE) untuk detail.

## Cara Install & Jalankan

### 1. Prasyarat
- [Node.js](https://nodejs.org) versi 18+ sudah terinstall

### 2. Install dependencies
```bash
cd elpartners
npm install
```

### 3. Jalankan server
```bash
npm start
```
Atau:
```bash
node server.js
```

Server berjalan di **http://localhost:3000**

## Login Admin

Buka **http://localhost:3000/admin/login**

| Username | Password |
|----------|----------|
| admin | admin123 |

> **Ganti password** setelah login pertama di tab Profil.

## Struktur Folder

```
elpartners/
├── server.js              # Entry point Express API
├── package.json
├── data/
│   ├── content.json       # Semua konten website
│   ├── users.json         # Akun admin (bcrypt hash)
│   └── messages.json      # Pesan dari form kontak
└── public/
    ├── index.html         # Halaman utama website
    ├── css/admin.css      # Styling admin dashboard
    ├── uploads/           # Folder upload logo klien
    └── admin/
        ├── login.html     # Halaman login admin
        ├── dashboard.html # Dashboard admin
        └── app.js         # Logic dashboard
```

## API Endpoints

### Publik (tanpa token)
| Method | Endpoint | Fungsi |
|--------|----------|--------|
| GET | `/api/content` | Ambil semua konten |
| GET | `/api/content/:section` | Ambil 1 section (hero, layanan, dll) |
| POST | `/api/messages` | Kirim pesan dari form kontak |

### Protected (butuh JWT)
| Method | Endpoint | Fungsi |
|--------|----------|--------|
| POST | `/api/auth/login` | Login → dapat token |
| GET | `/api/auth/me` | Cek user saat ini |
| PUT | `/api/content/:section` | Update 1 section |
| PUT | `/api/content` | Batch update |
| GET | `/api/messages` | Lihat pesan masuk |
| PUT | `/api/auth/password` | Ganti password |
| POST | `/api/upload` | Upload logo klien |
| DELETE | `/api/upload/:filename` | Hapus file upload |

## Cara Pakai Dashboard

1. Login ke **/admin/login** dengan `admin / admin123`
2. Klik tab **Konten Website**
3. Pilih section yang mau diedit (Hero, Layanan, Portfolio, dll)
4. Isi form yang tersedia
5. Klik **Simpan Perubahan** — data langsung tersimpan
6. Refresh website publik untuk melihat perubahan

### Upload Logo Klien
1. Di dashboard, buka **Konten Website → Portfolio**
2. Cari daftar **Logo Klien — Ticker**
3. Klik **Upload** untuk setiap client
4. Pilih file gambar (max 2MB, format: JPG/PNG/GIF/WebP/SVG)
5. Logo otomatis tersimpan dan tampil di website

## Konfigurasi

### Port
Default port 3000. Ubah dengan environment variable:
```bash
PORT=3001 node server.js
```

### Secret Key
Default secret untuk JWT. Ubah di production:
```bash
JWT_SECRET=rahasia-kunci-kamu node server.js
```

## Development

Tidak perlu build step — cukup edit file dan refresh browser.

```bash
node server.js
```

File yang sering diubah:
- `data/content.json` — Data konten (langsung terbaca server)
- `public/index.html` — Tampilan website
- `public/admin/app.js` — Logic dashboard admin
