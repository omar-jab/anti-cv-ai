import type { Context } from "hono";
import type { AppEnvWithAuth } from "../middleware/auth";
import { HandleSchema } from "../lib/handle";

type PublicUserDataRow = {
    user_id: string;
    handle: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
    city: string | null;
    image_url: string | null;
    cv_json: string | null;
    avatar_url: string | null;
};

function safeJsonParse<T>(input: string | null): T | null {
    if (!input) return null;
    try {
        return JSON.parse(input) as T;
    } catch {
        return null;
    }
}

/**
 * API pubblica per ottenere i dati di un utente tramite handle.
 * Restituisce profilo, CV e avatar.
 */
export async function GetPublicUserData(context: Context<AppEnvWithAuth>) {
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

    // Recupera dati utente con CV e avatar
    const row = db
        .query(
            `SELECT 
        u.id AS user_id,
        u.handle,
        u.first_name,
        u.last_name,
        u.email,
        u.phone,
        u.city,
        u.image_url,
        cv.cv_json,
        av.image_url AS avatar_url
       FROM users u
       LEFT JOIN user_cvs cv ON cv.user_id = u.id
         AND cv.personality_id = (
           SELECT id FROM user_personalities
           WHERE user_id = u.id
           ORDER BY created_at DESC
           LIMIT 1
         )
       LEFT JOIN user_avatars av ON av.user_id = u.id
         AND av.image_url IS NOT NULL
       WHERE u.handle = ? COLLATE NOCASE
       LIMIT 1`,
        )
        .get(handle) as PublicUserDataRow | undefined;

    if (!row) {
        return context.json({ error: "User not found" }, 404);
    }

    const cv = safeJsonParse<unknown>(row.cv_json);

    return context.json({
        user: {
            id: row.user_id,
            handle: row.handle,
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email,
            phone: row.phone,
            city: row.city,
            imageUrl: row.image_url || row.avatar_url,
        },
        cv: cv,
    });
}
