-- Tabella utenti sincronizzata con Clerk
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,           -- Clerk user ID
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  image_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Tabella memorie utente (una riga per utente)
CREATE TABLE IF NOT EXISTS user_memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  memory TEXT NOT NULL DEFAULT '',  -- Contenuto Markdown
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS user_memories_user_id_idx ON user_memories (user_id);

-- Collegamento sessioni chat a utenti
ALTER TABLE chat_sessions ADD COLUMN user_id TEXT REFERENCES users(id);
