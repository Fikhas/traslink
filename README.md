# Traslink

Platform tracking angkutan umum berbasis Next.js, PostgreSQL, MapLibre, dan ShadCN. Aplikasi mencakup pengalaman penumpang, panel supir, dashboard admin, editor trayek, data armada/GPS, serta API ingest posisi kendaraan.

## Fitur produksi

- Autentikasi sesi server-side dengan cookie `httpOnly`, kata sandi bcrypt, masa berlaku sesi, dan peran `ADMIN`, `DRIVER`, `PASSENGER`.
- PostgreSQL + Drizzle ORM untuk pengguna, sesi, trayek, halte, armada, perangkat GPS, riwayat posisi, dan permintaan jemput.
- Peta MapLibre/WebGL dengan style tiles yang dapat diganti lewat environment variable.
- Validasi geospasial permintaan jemput. Server menolak titik yang lebih dari 150 meter dari jalur trayek.
- API CRUD admin untuk trayek, rute, kendaraan, dan GPS.
- API GPS untuk menerima posisi perangkat; kirim `x-gps-api-key` pada setiap request.
- Dashboard supir yang memperbarui daftar jemput berkala dan dapat menerima permintaan.
- Docker image Next.js standalone yang dapat dijalankan di VPS.

## Menjalankan secara lokal

Persyaratan: Node.js 22+, npm, PostgreSQL 15+.

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Buka `http://localhost:3000`. Akun awal dari seed memakai kata sandi `Traslink123!`:

- `admin@traslink.id`
- `supir@traslink.id`
- `penumpang@traslink.id`

Ganti seluruh kata sandi demo sebelum produksi.

## Environment variables

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | URL koneksi PostgreSQL. Untuk Vercel gunakan URL pooled dari Neon, Supabase, atau Vercel Postgres. |
| `NEXT_PUBLIC_MAP_STYLE_URL` | URL style MapLibre. Default contoh menggunakan OpenFreeMap. Untuk SLA produksi gunakan penyedia tiles sendiri/berbayar. |
| `NEXT_PUBLIC_APP_URL` | Origin publik aplikasi, misalnya `https://traslink.id`. |
| `GPS_INGEST_API_KEY` | Rahasia panjang dan acak untuk endpoint telemetri GPS. |

## Deploy ke Vercel

1. Push repository ke GitHub/GitLab/Bitbucket lalu impor project di Vercel.
2. Buat PostgreSQL terkelola (Neon/Supabase/Vercel Postgres) dan isi seluruh environment variables di Vercel.
3. Dari komputer lokal dengan `DATABASE_URL` produksi, jalankan `npm run db:migrate` lalu `npm run db:seed` satu kali.
4. Deploy. Vercel mengenali proyek sebagai Next.js melalui `vercel.json`.
5. Uji `/api/health`, login tiap peran, dan ubah kata sandi akun awal.

## Deploy ke VPS dengan Docker

1. Instal Docker Engine dan Docker Compose, arahkan DNS domain ke VPS, lalu clone repository.
2. Buat `.env` di server:

```env
POSTGRES_PASSWORD=kata-sandi-database-yang-kuat
NEXT_PUBLIC_APP_URL=https://traslink.id
NEXT_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty
GPS_INGEST_API_KEY=kunci-acak-minimal-32-karakter
```

3. Jalankan database, migrasi, seed, dan aplikasi:

```bash
docker compose up -d postgres
docker compose --profile tools run --rm migrate npm run db:migrate
docker compose --profile tools run --rm migrate npm run db:seed
docker compose up -d --build app
```

4. Pasang Nginx/Caddy sebagai reverse proxy HTTPS ke `127.0.0.1:3000`. Jangan membuka PostgreSQL ke internet.

## Mengirim posisi GPS

```bash
curl -X POST https://traslink.id/api/gps/positions \
  -H 'content-type: application/json' \
  -H 'x-gps-api-key: RAHASIA_ANDA' \
  -d '{"deviceCode":"GPS-TL-001","latitude":-6.9128,"longitude":107.6317,"heading":245,"speedKph":22}'
```

Untuk beban tinggi, letakkan antrean pesan (MQTT/Kafka/Redis Streams) di depan API ingest dan simpan posisi historis dengan kebijakan retensi. Endpoint saat ini cocok untuk peluncuran awal dan armada skala kecil-menengah.

## Perintah penting

```bash
npm run db:generate  # membuat migrasi setelah schema berubah
npm run db:migrate   # menjalankan migrasi
npm run db:seed      # data dan akun awal
npm run build        # build produksi
npm start            # server produksi non-Docker
```
