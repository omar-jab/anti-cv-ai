import type { Database } from "bun:sqlite";
import type { Context } from "hono";
import type { AppEnvWithAuth } from "../../middleware/auth";
import { sha256Hex } from "../crypto";

export type ResolvedUser = { userId: string; auth: "clerk" | "api_key" };

function extractUserApiKey(context: Context<AppEnvWithAuth>) {
  const candidates = [
    "x-user-api-key",
    "x-user-api",
    "x-user-key",
    "x-api-key",
  ] as const;

  for (const name of candidates) {
    const value = context.req.header(name);
    if (value && value.trim()) return value.trim();
  }

  return null;
}

function resolveUserIdFromApiKey(db: Database, rawKey: string) {
  const keyHash = sha256Hex(rawKey);
  const row = db
    .query(
      `SELECT user_id
       FROM user_api_keys
       WHERE key_hash = ? AND revoked_at IS NULL
       LIMIT 1`,
    )
    .get(keyHash) as { user_id: string } | undefined;

  if (!row?.user_id) return null;

  db.query("UPDATE user_api_keys SET last_used_at = ? WHERE key_hash = ?").run(
    Date.now(),
    keyHash,
  );

  return row.user_id;
}

export function resolveUserFromRequest(
  context: Context<AppEnvWithAuth>,
): ResolvedUser | null {
  const clerkUserId = context.get("userId");
  if (clerkUserId) return { userId: clerkUserId, auth: "clerk" };

  const apiKey = extractUserApiKey(context);
  if (!apiKey) return null;

  const userId = resolveUserIdFromApiKey(context.get("db"), apiKey);
  if (!userId) return null;

  return { userId, auth: "api_key" };
}
