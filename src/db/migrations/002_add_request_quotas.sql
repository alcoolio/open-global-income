-- Migration 002: Add request quota tracking for tiered rate limiting

BEGIN;

CREATE TABLE IF NOT EXISTS request_quotas (
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (api_key_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_request_quotas_window
  ON request_quotas (api_key_id, window_start DESC);

-- Add quota columns to api_keys for custom overrides
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS custom_rate_limit INTEGER,
  ADD COLUMN IF NOT EXISTS monthly_quota INTEGER;

INSERT INTO schema_migrations (version, name) VALUES (2, '002_add_request_quotas')
ON CONFLICT (version) DO NOTHING;

COMMIT;
