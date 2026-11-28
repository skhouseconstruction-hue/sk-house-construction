CREATE TABLE IF NOT EXISTS company_state (
  user_id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_company_state_updated_at
  ON company_state(updated_at);
