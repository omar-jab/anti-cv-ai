-- Documento "persona/personality" dell'utente (Markdown)
CREATE TABLE IF NOT EXISTS user_personalities (
  user_id TEXT PRIMARY KEY,
  content_md TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_personalities_updated_at_idx
ON user_personalities (updated_at DESC);

-- Job per aggiornare la personality in background
CREATE TABLE IF NOT EXISTS personality_update_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  started_at INTEGER,
  finished_at INTEGER,
  error TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS personality_update_jobs_user_created_at_idx
ON personality_update_jobs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS personality_update_jobs_status_updated_at_idx
ON personality_update_jobs (status, updated_at DESC);

-- Un solo job "attivo" per user (queued/running)
CREATE UNIQUE INDEX IF NOT EXISTS personality_update_jobs_user_active_uq
ON personality_update_jobs (user_id)
WHERE status IN ('queued', 'running');
