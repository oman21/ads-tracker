# Roles & Mekanisme Iklan

Dokumen ini merangkum role utama pada platform Ads Tracker dan bagaimana mekanisme penayangan/pembayaran iklan dijalankan di atas stack AdonisJS + React yang ada di repo ini.

## 1. Definisi Role

| Role | Akses & Tanggung Jawab Utama | Data yang Dapat Dikelola |
| ---- | --------------------------- | ------------------------ |
| **Super Admin** | Mengatur seluruh konfigurasi sistem, membuat/mengunci akun, memantau kesehatan ad server & memastikan kepatuhan pembayaran. Dapat mengakses semua dashboard dan API internal termasuk audit log. | Semua entitas (user, campaign, creative, targeting preset, payout config, rate card). |
| **Publisher** | Partner pemilik situs/app yang memasang widget iklan. Mengelola profil situs, memilih kategori, mengambil snippet, melihat performa (impression, klik, revenue share). Tidak dapat memodifikasi campaign advertiser. | Situs & placement, kode widget, laporan klik/revenue, status payout. |
| **Client / Advertiser** | Pemasang iklan yang membuat campaign, mengatur targeting & budget, mengunggah creative, memantau konversi. Akses hanya ke data miliknya sendiri. | Campaign, ad set/creative, budget, deposit, pixel tracking. |

### Otorisasi Tingkat Tinggi
- Super Admin menggunakan portal internal (`/admin` atau CLI) untuk CRUD user dan mengatur konfigurasi global seperti `publisherRevenueShare`, kategori, limit penayangan, serta mem-bypass campaign saat troubleshooting.
- Publisher login ke dashboard mitra untuk mendapatkan JavaScript snippet (`/api/pixels/:slotKey/embed.js`), memilih kategori situs, serta membaca laporan klik & revenue yang dihasilkan dari Tracking Engine.
- Client/Advertiser memakai dashboard campaign (frontend React) yang memanggil endpoint `/api/ads/*` dan `/api/reports/*` untuk membuat iklan, menautkan pixel, serta memantau performa.

## 2. Struktur Sistem Inti

### 2.1 Advertiser Dashboard
- **Membuat campaign** lengkap dengan nama, durasi, dan alokasi budget harian.
- **Upload gambar + judul iklan** (creative) agar Ad Server punya materi siap tayang.
- **Slot key**: setiap ad wajib memilih/membuat `slotKey` sehingga beberapa advertiser dapat bersaing pada snippet yang sama tanpa mengganti kode di publisher.
- **Setting targeting**: geo hingga level **negara/provinsi/kota**, device class (desktop/mobile/OS), interest/kategori, serta list GAID/IDFA. Semua field mendukung multiple value sehingga campaign bisa mematok kombinasi (misal “Jawa Barat + Mobile + GAID tertentu”).
- **Set bid CPC** per campaign/ad set. Nilai ini ikut auction dan dibatasi budget harian.
- **Tracking conversion (slot)**: dashboard menghasilkan slot key, menyediakan script, dan menampilkan laporan konversi berdasarkan event yang diterima `/api/pixels/:slotKey/track`.

### 2.2 Publisher Dashboard
- **Mendapatkan kode widget** berupa JavaScript snippet siap tanam, lengkap dengan data attribute (slot key, partner id, container).
- **Menyalurkan konteks audiens** melalui atribut seperti `data-country`, `data-province`, `data-city`, `data-device-class`, `data-interests`, `data-device-type`, dan `data-device-id` agar Ad Server hanya mengirim iklan yang sesuai targeting advertiser.
- **Satu snippet bisa memuat beberapa advertiser**: publisher cukup memasang `<script data-partner=… data-slot=…>` (atau menggunakan slot key di path script). Semua campaign yang berbagi `slotKey` tersebut saling bidding berdasarkan CPC tertinggi dan aturan targeting tanpa membutuhkan reload snippet.
- **Memilih kategori website** agar Ad Server hanya mengembalikan iklan relevan dan Auction Engine bisa menghitung relevansi.
- **Laporan klik & revenue**: metrik impression, klik valid, CTR, serta estimasi komisi berdasarkan revenue share yang berlaku.

### 2.3 Ad Server
- **Menerima request** dari widget publisher. Request membawa `slotKey`, atribut perangkat, kategori, dan konteks pengguna.
- **Menjalankan auction** dengan memanggil Auction Engine menggunakan parameter request + state campaign aktif.
- **Mengembalikan list iklan pemenang** lengkap dengan metadata creative untuk dirender script frontend.
- **Mencatat impression & klik** secara sinkron/asinkron melalui Tracking Engine supaya laporan advertiser & publisher selaras.

### 2.4 Auction Engine
Memilih iklan terbaik dengan mempertimbangkan:
- **CPC bid** – nilai tertinggi menang jika syarat lainnya terpenuhi.
- **CTR historis / quality score** – untuk menjaga kualitas traffic, menambah bobot bagi creative dengan performa bagus.
- **Relevansi kategori** – mencocokkan kategori situs publisher dengan kategori campaign/ad set.
- **User targeting** – memverifikasi geo/device/interest sesuai rule campaign.
- **Budget tersisa** – hanya campaign dengan saldo mencukupi & belum melewati limit harian yang ikut lelang.

Hasil mesin lelang berupa daftar creative yang diberi skor dan diteruskan ke Ad Server untuk dirender sesuai ukuran slot.

### 2.5 Tracking Engine
- **Mencatat impression** setiap kali Ad Server mengirim creative dan widget menandai tayangan sukses.
- **Mencatat klik** ketika user berinteraksi dengan CTA. Event duplikat difilter memakai kombinasi slotKey + deviceId + timestamp.
- **Mendeteksi click fraud** (rate limiter, IP/device fingerprint anomaly, bot heuristics) sebelum biaya dikenakan.
- **Menghitung revenue sharing** automatis (misal 50–70% dari CPC) dan menyimpan saldo publisher untuk payout.
- **Dedup klik** memastikan satu klik hanya dikenakan biaya satu kali sebelum di-tag valid oleh anti-fraud logic.

## 3. Mekanisme Pembayaran

### Advertiser
- **Model billing CPC** — biaya muncul hanya setelah klik valid diverifikasi Tracking Engine.
- **Deposit saldo** via transfer/VA/e-wallet. Saldo tersimpan sebagai credit dan berkurang saat klik valid terjadi.
- **Budget harian** — campaign berhenti ikut lelang ketika cap harian tercapai meski saldo global masih ada.
- **Biaya dipotong setelah klik valid** untuk menghindari tagihan atas trafik fraud atau duplikat.

### Publisher
- **Komisi revenue share** per klik, default 50–70% dari CPC advertiser namun dapat dikonfigurasi per partner atau kategori.
- **Minimal payout** (contoh Rp500.000) sebelum request penarikan bisa diproses.
- **Metode pembayaran** fleksibel: transfer bank dan e-wallet. Status payout tercatat agar Super Admin dapat audit.

## 4. Alur Tingkat Tinggi
1. Advertiser membuat campaign + slot key melalui dashboard dan mengunggah creative.
2. Publisher menanamkan snippet slot pada situs dan memilih kategori yang tepat.
3. Saat ada pengunjung, widget memanggil Ad Server → Auction Engine memilih iklan → creative ditampilkan.
4. Tracking Engine mencatat impression/klik, menjalankan anti-fraud, dan memperbarui saldo advertiser & publisher.
5. Sistem billing memotong kredit advertiser, menghitung komisi publisher, dan menyiapkan payout ketika ambang terpenuhi.
6. Semua pihak memantau performa lewat dashboard masing-masing; Super Admin mengawasi KPI global dan melakukan intervensi jika terjadi anomali.
