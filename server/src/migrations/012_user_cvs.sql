-- CV generati per utente (associati alla versione di personalità)

CREATE TABLE IF NOT EXISTS user_cvs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  personality_id TEXT NOT NULL UNIQUE,
  cv_json TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (personality_id) REFERENCES user_personalities(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_cvs_user_id_idx ON user_cvs (user_id);
CREATE INDEX IF NOT EXISTS user_cvs_personality_id_idx ON user_cvs (personality_id);
