import type { Database } from "bun:sqlite";

export type ChatSessionRow = {
  user_id: string | null;
  kind: string | null;
  personality_id: string | null;
};

export type ChatMessageRow = {
  role: string;
  content: string;
};

export function getChatSession(db: Database, sessionId: string) {
  return db
    .query(
      "SELECT user_id, kind, personality_id FROM chat_sessions WHERE id = ?",
    )
    .get(sessionId) as ChatSessionRow | undefined;
}

export function listChatMessages(db: Database, sessionId: string) {
  return db
    .query(
      "SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC, id ASC",
    )
    .all(sessionId) as ChatMessageRow[];
}

export function insertChatSession(
  db: Database,
  params: {
    id: string;
    userId: string;
    kind: string;
    personalityId: string | null;
    createdAt: number;
  },
) {
  db.query(
    `INSERT INTO chat_sessions (id, user_id, kind, personality_id, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(params.id, params.userId, params.kind, params.personalityId, params.createdAt);
}

export function insertChatMessage(
  db: Database,
  params: {
    id: string;
    sessionId: string;
    role: "user" | "assistant";
    content: unknown;
    createdAt: number;
  },
) {
  db.query(
    "INSERT INTO chat_messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(
    params.id,
    params.sessionId,
    params.role,
    JSON.stringify(params.content),
    params.createdAt,
  );
}
