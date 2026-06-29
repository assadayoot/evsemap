-- Server-side rate limiting for the find-route action.
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor).
--
-- The verify-recaptcha Edge Function calls check_and_record_route() with the
-- caller's IP. Storage + counting live in the database (service_role only), so
-- a bot cannot bypass it the way it can bypass the localStorage limit on the
-- client. RLS is on with NO public policies → anon/authenticated can't touch
-- the table; only the SECURITY DEFINER function (run by the Edge Function via
-- service_role) reads/writes it.

-- ─────────────────────────────────────────
-- Table
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS route_requests (
  id         BIGSERIAL PRIMARY KEY,
  ip         TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_route_requests_ip_time
  ON route_requests (ip, created_at DESC);

ALTER TABLE route_requests ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: clients (anon/authenticated) get zero access.
-- service_role bypasses RLS, so the Edge Function can still use it.

-- ─────────────────────────────────────────
-- Atomic check-and-record
-- ─────────────────────────────────────────
-- Returns { allowed, count, retry_after_secs }.
--   p_ip          : caller IP
--   p_limit       : max requests allowed within the window
--   p_window_secs : sliding window length, in seconds
CREATE OR REPLACE FUNCTION check_and_record_route(
  p_ip          TEXT,
  p_limit       INT,
  p_window_secs INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff  TIMESTAMPTZ := NOW() - make_interval(secs => p_window_secs);
  v_count   INT;
  v_oldest  TIMESTAMPTZ;
BEGIN
  -- Keep this IP's rows bounded: drop anything older than the window.
  DELETE FROM route_requests WHERE ip = p_ip AND created_at <= v_cutoff;

  SELECT COUNT(*), MIN(created_at) INTO v_count, v_oldest
  FROM route_requests
  WHERE ip = p_ip AND created_at > v_cutoff;

  IF v_count >= p_limit THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'count', v_count,
      'retry_after_secs',
        GREATEST(0, p_window_secs - EXTRACT(EPOCH FROM (NOW() - v_oldest))::INT)
    );
  END IF;

  INSERT INTO route_requests (ip) VALUES (p_ip);
  RETURN jsonb_build_object('allowed', true, 'count', v_count + 1, 'retry_after_secs', 0);
END;
$$;

-- Lock the function down: only service_role (the Edge Function) may call it.
REVOKE ALL ON FUNCTION check_and_record_route(TEXT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION check_and_record_route(TEXT, INT, INT) FROM anon, authenticated;
GRANT  EXECUTE ON FUNCTION check_and_record_route(TEXT, INT, INT) TO service_role;
