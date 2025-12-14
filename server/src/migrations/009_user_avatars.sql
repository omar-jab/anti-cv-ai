-- HeyGen Photo Avatar per utente

CREATE TABLE IF NOT EXISTS user_avatars (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  heygen_group_id TEXT NOT NULL,
  heygen_avatar_id TEXT NOT NULL,
  heygen_asset_id TEXT,
  heygen_image_key TEXT,
  name TEXT,
  status TEXT,
  training_status TEXT,
  training_error TEXT,
  image_url TEXT,
  motion_preview_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_avatars_user_id_idx ON user_avatars (user_id);
