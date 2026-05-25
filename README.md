# ⚖️ Timbangan Digital AI

Sistem timbangan digital berbasis AI (YOLO) dengan deteksi buah otomatis, integrasi ESP32, dan cetak label thermal via RawBT Android.

**PT Interskala Mandiri Indonesia**

---

## 🗂 Struktur Proyek

```
timbangan-digital-ai/
├── backend/            Flask API + YOLO + PostgreSQL
├── frontend/           React + TypeScript + Tailwind CSS
└── esp32/
    ├── esp32_scale/    ESP32 + HX711 → kirim berat via REST
    └── esp32s3_cam/    ESP32-S3 Cam → kirim frame → YOLO
```

---

## 🖥 Kebutuhan Sistem

| Komponen | Versi |
|---|---|
| Python | ≥ 3.10 |
| Node.js | ≥ 18 |
| PostgreSQL | ≥ 14 |
| Arduino IDE | ≥ 2.0 |
| RawBT (Android) | Latest |

---

## 🚀 Setup Backend

### 1. Buat database PostgreSQL

```sql
CREATE DATABASE timbangandigitalai;
```

### 2. Buat tabel + seed data

```bash
cd backend
psql -U postgres -d timbangandigitalai -f schema.sql
```

### 3. Konfigurasi environment

```bash
cp .env.example .env
# Edit .env sesuai konfigurasi Anda
```

### 4. Install dependencies

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Linux/Mac
# venv\Scripts\activate       # Windows

pip install -r requirements.txt
```

### 5. Letakkan model YOLO

```
backend/models/best.pt   ← salin model Anda ke sini
```

### 6. Jalankan server

```bash
python app.py
# Server berjalan di http://0.0.0.0:4000
```

**Mode simulasi timbangan** (tanpa ESP32 fisik):
```bash
SIMULATE_SCALE=1 python app.py
```

---

## 🌐 Setup Frontend

```bash
cd frontend
npm install
```

Edit `src/utils/api.ts`:
```typescript
export const API_URL = 'http://IP_SERVER_FLASK:4000'
```

Atau buat file `.env.local`:
```
VITE_API_URL=http://192.168.10.214:4000
```

Jalankan:
```bash
npm run dev      # development (http://localhost:5173)
npm run build    # production build
```

---

## 📟 Setup ESP32 Scale (HX711)

### Wiring
```
HX711 DOUT  →  GPIO 4
HX711 SCK   →  GPIO 5
HX711 VCC   →  3.3V
HX711 GND   →  GND
```

### Kalibrasi
1. Buka `esp32_scale.ino` di Arduino IDE
2. Set `CALIBRATION_FACTOR = 1`
3. Upload, buka Serial Monitor (115200 baud)
4. Catat nilai raw saat timbangan **kosong** → isi `TARE_OFFSET`
5. Taruh beban diketahui (misal 1 kg), catat nilai → `CALIBRATION_FACTOR = raw / 1.0`
6. Ubah `WIFI_SSID` dan `WIFI_PASSWORD`
7. Upload ulang

### Library yang diperlukan (Arduino Library Manager)
- `HX711` by bogde
- `ArduinoJson` by Benoit Blanchon

---

## 📸 Setup ESP32-S3 CAM

### Board Setting Arduino IDE
- Board: **ESP32S3 Dev Module**
- PSRAM: **OPI PSRAM**
- Flash Size: **4MB**

### Konfigurasi
Edit `esp32s3_cam.ino`:
```cpp
const char* WIFI_SSID    = "NAMA_WIFI";
const char* WIFI_PASSWORD = "PASSWORD";
const char* SERVER_URL   = "http://192.168.10.214:4000/api/detect_frame";
const char* BEARER_TOKEN = "TOKEN_JWT_DARI_LOGIN";  // login dulu, ambil token
const char* CLIENT_ID    = "esp32s3-cam-01";
```

### Cara ambil JWT Token
1. Login di web → buka DevTools → Application → localStorage → copy nilai `token`
2. Paste ke `BEARER_TOKEN` di kode ESP32-S3

### Library (Arduino Library Manager)
- ESP32 Camera (bawaan ESP32 Arduino core)
- `ArduinoJson`

---

## 🖨️ Cetak Label via RawBT (Android)

### Cara kerja
1. User menekan **SIMPAN & CETAK** di halaman Timbangan
2. Backend menghasilkan ESC/POS receipt → dikembalikan sebagai `rawbt://base64/...`
3. Browser Android membuka URI tersebut → RawBT app aktif → kirim ke printer Bluetooth T3

### Syarat
- Browser harus dibuka di **perangkat Android** yang memiliki **RawBT** terinstall
- Printer T3 sudah **di-pair** dengan Android via Bluetooth
- Di RawBT: pilih printer Bluetooth T3 sebagai printer default

### Jika buka dari PC (bukan Android)
Struk tetap **tersimpan di database**, hanya notifikasi print tidak akan muncul.
Anda bisa cetak manual dari RiwayatPenimbangan.

---

## 🔌 API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/auth/signup` | Daftar akun |
| POST | `/auth/login` | Login → JWT |
| GET  | `/auth/me` | Info user |
| GET  | `/api/produk` | List produk |
| POST | `/api/produk` | Tambah produk 🔒 |
| PUT  | `/api/produk/:id` | Edit produk 🔒 |
| DELETE | `/api/produk/:id` | Hapus produk 🔒 |
| POST | `/api/weight` | **ESP32** push berat |
| GET  | `/api/weight` | Baca berat terkini |
| POST | `/api/detect_frame` | Kirim frame → YOLO 🔒 |
| POST | `/api/status` | Status (berat + deteksi) per client |
| POST | `/cetak` | Simpan transaksi 🔒 |
| POST | `/api/print_rawbt` | Generate ESC/POS untuk RawBT 🔒 |
| GET  | `/api/riwayat` | Riwayat transaksi 🔒 |
| GET  | `/api/laporan/export/excel` | Export Excel 🔒 |
| GET  | `/api/laporan/export/pdf` | Export PDF 🔒 |

🔒 = Memerlukan header `Authorization: Bearer <token>`

---

## 🗺 Alur Sistem

```
ESP32 (HX711)
    │  POST /api/weight (berat)
    ▼
Flask Backend ◄── ESP32-S3 CAM POST /api/detect_frame (frame JPEG)
    │                   │
    │  YOLO inference   │
    │  simpan per client│
    ▼
React Frontend (polling /api/status setiap 1 detik)
    │
    │  User klik SIMPAN & CETAK
    ▼
POST /cetak (simpan DB) → POST /api/print_rawbt → rawbt://base64/...
    │
    ▼
RawBT Android → Printer Thermal T3 (Bluetooth)
```

---

## 🎨 Akun Default

| Email | Password | Role |
|-------|----------|------|
| admin@timbangan.id | admin123 | admin |

⚠️ **Ganti password admin segera setelah deploy!**

---

## 📄 Lisensi

Proyek ini dikembangkan untuk keperluan skripsi / penelitian.
Hak cipta © 2026 — PT Interskala Mandiri Indonesia
