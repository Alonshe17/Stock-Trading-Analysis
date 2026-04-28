-- ============================================================
-- Run this once in your Supabase project → SQL Editor → Run
-- ============================================================

-- Watchlist: one row per (device, symbol)
CREATE TABLE IF NOT EXISTS public.watchlist (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id  TEXT        NOT NULL,
  symbol     TEXT        NOT NULL,
  name       TEXT        NOT NULL DEFAULT '',
  type       TEXT        NOT NULL DEFAULT 'stock',
  warning    TEXT,
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (device_id, symbol)
);

-- Price alerts: one row per (device, symbol)
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id      TEXT        NOT NULL,
  symbol         TEXT        NOT NULL,
  name           TEXT        NOT NULL DEFAULT '',
  high_target    NUMERIC,
  low_target     NUMERIC,
  triggered_high BOOLEAN     DEFAULT FALSE,
  triggered_low  BOOLEAN     DEFAULT FALSE,
  active         BOOLEAN     DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (device_id, symbol)
);

-- Enable Row Level Security
ALTER TABLE public.watchlist    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- Allow full access via the anon key
-- (device_id is a random UUID that acts as the anonymous user secret)
CREATE POLICY "anon_all_watchlist"
  ON public.watchlist FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "anon_all_alerts"
  ON public.price_alerts FOR ALL USING (true) WITH CHECK (true);
