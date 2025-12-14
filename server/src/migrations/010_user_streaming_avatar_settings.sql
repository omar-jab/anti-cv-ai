-- HeyGen Streaming (Interactive) Avatar selezionato per utente

CREATE TABLE IF NOT EXISTS user_streaming_avatar_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  heygen_avatar_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_streaming_avatar_settings_user_id_idx
ON user_streaming_avatar_settings (user_id);
