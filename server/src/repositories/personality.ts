import type { Database } from "bun:sqlite";

export type PersonalityRow = {
  id: string;
  version: number;
  content_md: string;
  created_at: number;
  updated_at: number;
};

export function getLatestUserPersonality(db: Database, userId: string) {
  return db
    .query(
      `SELECT id, version, content_md, created_at, updated_at
       FROM user_personalities
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .get(userId) as PersonalityRow | undefined;
}

export function getUserPersonalityById(
  db: Database,
  params: { userId: string; personalityId: string },
) {
  return db
    .query(
      `SELECT id, version, content_md, created_at, updated_at
       FROM user_personalities
       WHERE id = ? AND user_id = ?
       LIMIT 1`,
    )
    .get(params.personalityId, params.userId) as PersonalityRow | undefined;
}
