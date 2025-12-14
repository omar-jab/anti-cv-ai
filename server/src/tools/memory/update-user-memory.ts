import { tool } from "ai";
import { z } from "zod";
import type { Database } from "bun:sqlite";

const MemoryOperationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("set"),
    section: z
      .string()
      .min(1)
      .describe("Nome della sezione (es: 'Interessi', 'Lavoro', 'Valori')"),
    title: z
      .string()
      .min(1)
      .describe("Titolo breve e descrittivo della memoria (es: 'Fotografia')"),
    content: z
      .string()
      .min(1)
      .describe("Testo della memoria in formato Markdown"),
  }),
  z.object({
    type: z.literal("remove"),
    section: z.string().min(1).describe("Nome della sezione"),
    title: z.string().min(1).describe("Titolo della memoria da rimuovere"),
  }),
]);

/**
 * Tool per inserire/modificare/rimuovere memorie dell'utente come lista di item
 */
export function createUpdateUserMemory(db: Database, userId: string) {
  return tool({
    description: `Gestisce le memorie dell'utente come lista di item (sezione + titolo + testo).

Operazioni disponibili:
- **set**: crea o aggiorna una memoria identificata da (section, title)
- **remove**: rimuove una memoria identificata da (section, title)

Sezioni comuni: Personalità, Interessi, Lavoro, Valori, Stile Comunicativo, Preferenze.`,
    inputSchema: z.object({
      operation: MemoryOperationSchema,
    }),
    execute: async ({ operation }) => {
      const now = Date.now();

      if (operation.type === "set") {
        const newId = crypto.randomUUID();
        db.query(
          `INSERT INTO user_memory_items (id, user_id, section, title, content, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id, section, title)
           DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`,
        ).run(
          newId,
          userId,
          operation.section,
          operation.title,
          operation.content,
          now,
          now,
        );

        const row = db
          .query(
            "SELECT id FROM user_memory_items WHERE user_id = ? AND section = ? AND title = ?",
          )
          .get(userId, operation.section, operation.title) as
          | { id: string }
          | undefined;

        return {
          success: true,
          operation: operation.type,
          id: row?.id ?? newId,
          section: operation.section,
          title: operation.title,
        };
      }

      const result = db
        .query(
          "DELETE FROM user_memory_items WHERE user_id = ? AND section = ? AND title = ?",
        )
        .run(userId, operation.section, operation.title);

      return {
        success: true,
        operation: operation.type,
        removed: result.changes > 0,
        section: operation.section,
        title: operation.title,
      };
    },
  });
}
