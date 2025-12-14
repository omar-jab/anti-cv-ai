import type { Context } from "hono";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { sha256Hex } from "../lib/crypto";
import type { AppEnvWithAuth } from "../middleware/auth";

const CreateApiKeySchema = z.object({
  label: z.string().min(1).max(120).optional(),
});

/**
 * Crea una API key "opaca" per identificare l'utente senza esporre user_id.
 * Richiede autenticazione Clerk (Authorization: Bearer ...).
 *
 * Nota: la chiave in chiaro viene restituita SOLO una volta (alla creazione).
 */
export async function CreateUserApiKey(context: Context<AppEnvWithAuth>) {
  const userId = context.get("userId");
  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const body = await context.req.json().catch(() => null);
  const parsed = CreateApiKeySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return context.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      400,
    );
  }

  const keyId = crypto.randomUUID();
  const now = Date.now();

  // Key abbastanza lunga e non-indovinabile (non viene mai salvata in chiaro)
  const rawKey = `opk_${randomBytes(32).toString("hex")}`;
  const keyHash = sha256Hex(rawKey);

  const label = parsed.data.label?.trim();
  context
    .get("db")
    .query(
      `INSERT INTO user_api_keys (id, user_id, key_hash, label, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(keyId, userId, keyHash, label ?? null, now);

  return context.json(
    {
      keyId,
      apiKey: rawKey,
      label: label ?? null,
      createdAt: new Date(now).toISOString(),
    },
    201,
  );
}
