import { tool } from "ai";
import type { Database } from "bun:sqlite";
import { z } from "zod";

/* =========================
   Tool
========================= */

export function createUpdateUserPersonality(db: Database, userId: string) {
  return tool({
    name: "edit-user-personality",
    description:
      "Aggiorna il documento (Markdown) che descrive la personalità online dell'utente.",
    inputSchema: z.object({
      content: z.string().min(1).describe("Documento Markdown completo"),
    }),
    execute: async ({ content }) => {
      const now = Date.now();
      const next = content.trim();

      const versionRow = db
        .query(
          `SELECT COALESCE(MAX(version), 0) AS max_version
           FROM user_personalities
           WHERE user_id = ?`,
        )
        .get(userId) as { max_version: number } | undefined;

      const nextVersion = (versionRow?.max_version ?? 0) + 1;
      const id = crypto.randomUUID();

      db.query(
        `INSERT INTO user_personalities (id, user_id, content_md, analysis_json, version, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        id,
        userId,
        next,
        JSON.stringify({
          source: "tool",
          createdAt: new Date(now).toISOString(),
        }),
        nextVersion,
        now,
        now,
      );

      const row = db
        .query(
          "SELECT version, updated_at FROM user_personalities WHERE id = ? AND user_id = ?",
        )
        .get(id, userId) as { version: number; updated_at: number } | undefined;

      return {
        updated: true,
        id,
        version: row?.version ?? nextVersion,
        updatedAt: row ? new Date(row.updated_at).toISOString() : null,
      };
    },
  });
}
