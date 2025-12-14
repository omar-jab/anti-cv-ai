-- Memorie utente come lista di item (più facile da gestire e renderizzare)
CREATE TABLE IF NOT EXISTS user_memory_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  section TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS user_memory_items_user_section_title_uq
ON user_memory_items (user_id, section, title);

CREATE INDEX IF NOT EXISTS user_memory_items_user_updated_at_idx
ON user_memory_items (user_id, updated_at DESC);
