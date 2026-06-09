-- ============================================================
-- Timbangan Digital AI — PostgreSQL Schema
-- Run: psql -U postgres -d timbangandigitalai -f schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── USERS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    first_name    VARCHAR(100) DEFAULT '',
    last_name     VARCHAR(100) DEFAULT '',
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT        NOT NULL,
    role          VARCHAR(50)  DEFAULT 'user',
    created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Default admin (password: admin123)
INSERT INTO users (first_name, last_name, email, password_hash, role)
VALUES (
    'Admin', 'System',
    'admin@timbangan.id',
    'pbkdf2:sha256:600000$x9Km2fJqLp3Rw8Zy$8a4b2c6d1e5f9a3b7c2e4d6f8a1b3c5e7d9f2a4b6c8e0d2f4a6b8c0e2d4f6a8',
    'admin'
)
ON CONFLICT (email) DO NOTHING;

-- ── PRODUK ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS produk (
    kode_produk  SERIAL PRIMARY KEY,
    nama_produk  VARCHAR(200) NOT NULL,
    harga_per_kg NUMERIC(12,2) NOT NULL DEFAULT 0,
    path_gambar  TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── TRANSAKSI ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transaksi (
    id           SERIAL PRIMARY KEY,
    nama_produk  VARCHAR(200) NOT NULL,
    berat_kg     NUMERIC(10,3) NOT NULL,
    harga_per_kg NUMERIC(12,2) NOT NULL,
    total_harga  NUMERIC(14,2) NOT NULL,
    timestamp    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transaksi_timestamp ON transaksi(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transaksi_produk    ON transaksi(nama_produk);

-- ── SEED DATA (optional sample products) ──────────────────
INSERT INTO produk (nama_produk, harga_per_kg) VALUES
    ('jeruk',            15000),
    ('apel merah',       25000),
    ('mangga harum manis',20000),
    ('sirsak',           15000),
    ('mangga indramayu', 20000)
ON CONFLICT DO NOTHING;
