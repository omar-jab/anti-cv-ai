import { tool } from "ai";
import { z } from "zod";
import type { Database } from "bun:sqlite";

/**
 * Tool per leggere le memorie salvate dell'utente
 */
export function createReadUserMemory(db: Database, userId: string) {
  return tool({
    description:
      "Legge tutte le memorie salvate per l'utente corrente. Ogni memoria è un item con sezione, titolo e contenuto.",
    inputSchema: z.object({
      section: z
        .string()
        .min(1)
        .optional()
        .describe("Filtra per sezione (es: 'Interessi', 'Valori')"),
    }),
    execute: async ({ section }) => {
      const rows = db
        .query(
          `SELECT id, section, title, content, created_at, updated_at
           FROM user_memory_items
           WHERE user_id = ? AND (? IS NULL OR section = ?)
           ORDER BY updated_at DESC, created_at DESC, id ASC`,
        )
        .all(userId, section ?? null, section ?? null) as Array<{
        id: string;
        section: string;
        title: string;
        content: string;
        created_at: number;
        updated_at: number;
      }>;

      const lastUpdatedMs = rows.reduce(
        (acc, r) => Math.max(acc, r.updated_at),
        0,
      );

      return {
        memories: rows.map((r) => ({
          id: r.id,
          section: r.section,
          title: r.title,
          content: r.content,
          createdAt: new Date(r.created_at).toISOString(),
          updatedAt: new Date(r.updated_at).toISOString(),
        })),
        count: rows.length,
        lastUpdated: lastUpdatedMs
          ? new Date(lastUpdatedMs).toISOString()
          : null,
      };
    },
  });
}
