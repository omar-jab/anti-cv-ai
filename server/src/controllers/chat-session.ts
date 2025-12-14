import type { Context } from "hono";
import { v4 as uuidv4 } from "uuid";
import type { AppEnvWithAuth } from "../middleware/auth";

export async function ChatSession(context: Context<AppEnvWithAuth>) {
  const userId = context.get("userId");
  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const session_id = uuidv4();
  context
    .get("db")
    .query(
      "INSERT INTO chat_sessions (id, user_id, kind, created_at) VALUES (?, ?, 'personality_builder', ?)",
    )
    .run(session_id, userId, Date.now());

  return context.json({
    session_id,
  });
}
