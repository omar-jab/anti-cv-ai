import type { Context } from "hono";
import type { AppEnvWithAuth } from "../middleware/auth";
import { HandleSchema } from "../lib/handle";

/**
 * Verifica se un handle (tipo @nome) esiste già.
 *
 * Public API: non richiede autenticazione.
 */
export async function CheckUserHandle(context: Context<AppEnvWithAuth>) {
  const raw = context.req.param("handle");
  if (!raw) {
    return context.json({ error: "Invalid handle" }, 400);
  }

  const parsed = HandleSchema.safeParse(raw);
  if (!parsed.success) {
    return context.json(
      { error: "Invalid handle", details: parsed.error.flatten() },
      400,
    );
  }

  const handle = parsed.data;
  const db = context.get("db");
  const row = db
    .query("SELECT 1 AS ok FROM users WHERE handle = ? COLLATE NOCASE LIMIT 1")
    .get(handle) as { ok: 1 } | undefined;

  const exists = Boolean(row);
  return context.json({
    handle,
    exists,
    available: !exists,
  });
}
