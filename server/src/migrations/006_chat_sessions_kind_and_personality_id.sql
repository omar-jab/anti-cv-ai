-- Estende le sessioni chat per supportare più "tipi" e associare una persona specifica

ALTER TABLE chat_sessions
ADD COLUMN kind TEXT NOT NULL DEFAULT 'personality_builder';

ALTER TABLE chat_sessions
ADD COLUMN personality_id TEXT REFERENCES user_personalities(id);

CREATE INDEX IF NOT EXISTS chat_sessions_user_kind_created_at_idx
ON chat_sessions (user_id, kind, created_at DESC);

CREATE INDEX IF NOT EXISTS chat_sessions_kind_created_at_idx
ON chat_sessions (kind, created_at DESC);
