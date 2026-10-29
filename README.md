# Aurora Quant — Terminal Risiko Kuantitatif

MVP dashboard risiko portofolio yang berjalan di browser menggunakan data sintetis. Proyek ini dibuat sebagai fondasi eksplorasi konsep *Enterprise Quantitative Risk & Execution Platform*, bukan sebagai terminal perdagangan atau sistem produksi.

> **Peringatan:** semua harga, posisi, grafik, Greeks, VaR, CVaR, dan keluaran model dalam aplikasi ini adalah contoh simulasi. Aplikasi tidak terhubung ke bursa, tidak membaca akun pengguna, tidak mengirim order, dan bukan nasihat investasi.

## Fitur MVP

- Ikhtisar portofolio contoh dengan nilai dan harga sintetis yang bergerak lokal.
- Grafik ekuitas dan tabel posisi demo untuk BTC, ETH, dan SOL.
- Simulasi Monte Carlo berbasis GBM sederhana dengan kejutan pasar bersama dan kejutan idiosinkratik.
- VaR dan CVaR pada tingkat kepercayaan 95% atau 99%, horizon 1, 5, atau 10 hari, serta 2.500, 10.000, atau 25.000 skenario.
- Histogram distribusi hasil, pratinjau wireframe volatilitas ilustratif, dan panel status modul.
- Kontrol eksekusi yang sengaja dinonaktifkan. Tidak ada koneksi exchange, API key, stream pasar, atau jalur pengiriman order.
- Tata letak responsif dan antarmuka dalam bahasa Indonesia.

## Menjalankan aplikasi

Persyaratan: Node.js 20+ dan npm.

```sh
npm install
npm run dev
```

Vite akan menampilkan alamat lokal di terminal (umumnya `http://localhost:5173`). Untuk membuat build produksi dan menjalankan tes:

```sh
npm test
npm run build
npm run preview
```

## Cara kerja simulasi

Data demo menggunakan tiga posisi contoh dan harga IDR yang dibuat di sisi browser. Harga hanya bergerak mengikuti fungsi deterministik untuk memberi kesan feed; angka itu bukan kutipan pasar. Mesin risiko mengambil return aset dengan drift dan volatilitas harian yang ditentukan di kode, menggabungkannya dengan faktor pasar bersama dan kejutan khusus aset, lalu mengurutkan hasil simulasi.

- **VaR**: kuantil kerugian pada tingkat kepercayaan terpilih untuk horizon simulasi.
- **CVaR / Expected Shortfall**: rata-rata kerugian pada bagian distribusi yang lebih buruk dari kuantil VaR.
- Seed awal membuat keluaran dapat direproduksi. Tombol “Jalankan simulasi” mengganti seed agar hasil berubah tetapi tetap deterministik untuk seed baru tersebut.

Ini adalah demonstrasi edukatif, bukan model risiko yang telah divalidasi. Asumsi distribusi normal, korelasi sederhana, dan input volatilitas tetap tidak menggambarkan perilaku pasar secara lengkap; model juga tidak memasukkan likuiditas, biaya, lonjakan volatilitas, atau risiko operasional.

## Struktur proyek

```text
src/
├── App.tsx                 # halaman, navigasi, dan state antarmuka
├── components/
│   ├── Charts.tsx          # grafik SVG sintetis
│   └── MetricCard.tsx      # kartu metrik yang dapat digunakan ulang
├── lib/risk.ts             # generator simulasi, VaR/CVaR, histogram
├── test/risk.test.ts       # tes mesin risiko
├── index.css               # tema dan tata letak responsif
└── main.tsx                # entry point React
```

## Batasan yang diketahui

MVP tidak mengimplementasikan ingesti pasar, WebSocket, Kafka/NATS, backend, database, gRPC, komputasi GPU, PDE Heston, optimasi convex, Risk Parity, Greeks hasil pricing opsi, atau algoritma Almgren–Chriss. Wireframe volatilitas dan angka Greeks hanyalah ilustrasi UI. Tidak ada order riil, paper trading yang terhubung ke broker, autentikasi, atau persistensi data.

## Pengembangan lanjutan

1. Pisahkan modul simulasi ke layanan backend dan tambahkan skema API yang terdokumentasi.
2. Tambahkan validasi statistik, uji benchmark, serta pengujian properti pada kalkulasi risiko.
3. Tambahkan impor data historis yang eksplisit dan dapat dilacak, tanpa mengaktifkan eksekusi order.
4. Jika ada integrasi bursa di masa depan, rancang sebagai modul terpisah dengan izin baca-saja secara default dan tinjauan keamanan sebelum perubahan.

## Lisensi

Dirilis di bawah lisensi MIT. Lihat [LICENSE](LICENSE).
