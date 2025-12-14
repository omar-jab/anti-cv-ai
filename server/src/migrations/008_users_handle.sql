-- Aggiunge un "handle" pubblico (tipo @username) alla tabella users

ALTER TABLE users
ADD COLUMN handle TEXT;

-- Unicità case-insensitive (NOCASE), ma permette più NULL
CREATE UNIQUE INDEX IF NOT EXISTS users_handle_uq
ON users (handle COLLATE NOCASE);
