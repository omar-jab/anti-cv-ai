-- Rende user_personalities una tabella versionata (N righe per user) e salva anche JSON di analisi

ALTER TABLE user_personalities RENAME TO user_personalities__old;

CREATE TABLE user_personalities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  content_md TEXT NOT NULL,
  analysis_json TEXT NOT NULL DEFAULT '{}',
  version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX user_personalities_user_version_uq
ON user_personalities (user_id, version);

CREATE INDEX user_personalities_user_created_at_idx
ON user_personalities (user_id, created_at DESC);

-- Migrazione dati: una sola riga per user nel vecchio schema
INSERT INTO user_personalities (id, user_id, content_md, analysis_json, version, created_at, updated_at)
SELECT user_id, user_id, content_md, '{}', version, created_at, updated_at
FROM user_personalities__old;

DROP TABLE user_personalities__old;
