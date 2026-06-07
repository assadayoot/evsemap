-- EV Station Map — Supabase schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)

-- ─────────────────────────────────────────
-- Tables
-- ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS operators (
  key       TEXT PRIMARY KEY,
  name      TEXT NOT NULL,
  logo_url  TEXT
);

CREATE TABLE IF NOT EXISTS stations (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  name_en     TEXT,
  address     TEXT,
  address_en  TEXT,
  town        TEXT,
  town_en     TEXT,
  province    TEXT,
  province_en TEXT,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  operator    TEXT,
  num_points  INTEGER DEFAULT 1,
  num_charger INTEGER,
  status      TEXT DEFAULT 'ว่าง',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connections (
  id             BIGSERIAL PRIMARY KEY,
  station_id     TEXT REFERENCES stations(id) ON DELETE CASCADE,
  connector_type TEXT NOT NULL,
  power_kw       NUMERIC,
  quantity       INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS view_logs (
  id               BIGSERIAL PRIMARY KEY,
  station_id       TEXT REFERENCES stations(id) ON DELETE SET NULL,
  session_id       TEXT,
  origin_ip        TEXT,
  origin_province  TEXT,
  viewed_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────

ALTER TABLE operators  ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_logs  ENABLE ROW LEVEL SECURITY;

-- Operators: public read only
CREATE POLICY "public read operators"
  ON operators FOR SELECT USING (true);

-- Stations & connections: public read only
CREATE POLICY "public read stations"
  ON stations FOR SELECT USING (true);

CREATE POLICY "public read connections"
  ON connections FOR SELECT USING (true);

-- view_logs: public insert + read (for analytics)
CREATE POLICY "public insert view_logs"
  ON view_logs FOR INSERT WITH CHECK (true);

CREATE POLICY "public read view_logs"
  ON view_logs FOR SELECT USING (true);

-- ─────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_stations_operator  ON stations (operator);
CREATE INDEX IF NOT EXISTS idx_stations_province  ON stations (province);
CREATE INDEX IF NOT EXISTS idx_connections_station ON connections (station_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_station   ON view_logs (station_id);
CREATE INDEX IF NOT EXISTS idx_view_logs_viewed_at ON view_logs (viewed_at DESC);
