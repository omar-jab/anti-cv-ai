import type { Context } from "hono";
import { Buffer } from "node:buffer";
import { z } from "zod";
import type { AppEnvWithAuth } from "../middleware/auth";

type UserProfileRow = {
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  city: string | null;
  birth_date: string | null;
  image_url: string | null;
  updated_at: number | null;
  handle: string | null;
};

function toIso(value: number | null) {
  return typeof value === "number" && value > 0
    ? new Date(value).toISOString()
    : null;
}

function toApiProfile(row: UserProfileRow) {
  return {
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    city: row.city,
    birthDate: row.birth_date,
    imageUrl: row.image_url,
    updatedAt: toIso(row.updated_at),
    handle: row.handle,
  };
}

function getProfileRow(context: Context<AppEnvWithAuth>, userId: string) {
  const db = context.get("db");
  return db
    .query(
      `SELECT email, first_name, last_name, phone, city, birth_date, image_url, updated_at, handle
       FROM users
       WHERE id = ?
       LIMIT 1`,
    )
    .get(userId) as UserProfileRow | undefined;
}

const RequiredTrimmedString = z.string().trim().min(1);
const OptionalTrimmedString = (max: number) =>
  z.preprocess((value) => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }, z.string().max(max).optional());

const UpdateProfileSchema = z
  .object({
    firstName: RequiredTrimmedString.max(80),
    lastName: RequiredTrimmedString.max(80),
    email: RequiredTrimmedString.max(320).email(),
    phone: OptionalTrimmedString(50),
    city: OptionalTrimmedString(120),
    birthDate: z.preprocess(
      (value) => {
        if (typeof value !== "string") return undefined;
        const trimmed = value.trim();
        return trimmed ? trimmed : undefined;
      },
      z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    ),
  })
  .strict();

function normalizeImageDataUrl(file: File) {
  const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
  if (!allowedTypes.has(file.type)) {
    throw new Error("Unsupported image type");
  }

  const maxBytes = 5 * 1024 * 1024;
  if (!file.size) {
    throw new Error("Empty image");
  }
  if (file.size > maxBytes) {
    throw new Error("Image too large (max 5MB)");
  }

  return file.arrayBuffer().then((buffer) => {
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:${file.type};base64,${base64}`;
  });
}

/**
 * Profilo utente (dati generali) salvato nel DB.
 *
 * Richiede autenticazione Clerk.
 */
export async function GetUserProfile(context: Context<AppEnvWithAuth>) {
  const userId = context.get("userId");
  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const row = getProfileRow(context, userId);
  if (!row) {
    const now = Date.now();
    context
      .get("db")
      .query(
        `INSERT INTO users (id, created_at, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at`,
      )
      .run(userId, now, now);

    return context.json({
      profile: {
        firstName: null,
        lastName: null,
        email: null,
        phone: null,
        city: null,
        birthDate: null,
        imageUrl: null,
        updatedAt: toIso(now),
        handle: null,
      },
    });
  }

  return context.json({ profile: toApiProfile(row) });
}

export async function UpdateUserProfile(context: Context<AppEnvWithAuth>) {
  const userId = context.get("userId");
  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const formData = await context.req.formData().catch(() => null);
  if (!formData) {
    return context.json({ error: "Invalid form data" }, 400);
  }

  const body = {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    city: formData.get("city"),
    birthDate: formData.get("birthDate"),
  };

  const parsed = UpdateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return context.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      400,
    );
  }

  const imageValue = formData.get("image");
  const image = imageValue instanceof File ? imageValue : null;

  let imageUrl: string | null = null;
  if (image) {
    try {
      imageUrl = await normalizeImageDataUrl(image);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return context.json({ error: "Invalid image", details: message }, 400);
    }
  }

  const now = Date.now();
  const db = context.get("db");

  // Assicura esistenza record utente (senza sovrascrivere dati già presenti).
  db.query(
    "INSERT OR IGNORE INTO users (id, created_at, updated_at) VALUES (?, ?, ?)",
  ).run(userId, now, now);

  if (imageUrl) {
    db.query(
      `UPDATE users
       SET email = ?,
           first_name = ?,
           last_name = ?,
           phone = ?,
           city = ?,
           birth_date = ?,
           image_url = ?,
           updated_at = ?
       WHERE id = ?`,
    ).run(
      parsed.data.email,
      parsed.data.firstName,
      parsed.data.lastName,
      parsed.data.phone ?? null,
      parsed.data.city ?? null,
      parsed.data.birthDate ?? null,
      imageUrl,
      now,
      userId,
    );
  } else {
    db.query(
      `UPDATE users
       SET email = ?,
           first_name = ?,
           last_name = ?,
           phone = ?,
           city = ?,
           birth_date = ?,
           updated_at = ?
       WHERE id = ?`,
    ).run(
      parsed.data.email,
      parsed.data.firstName,
      parsed.data.lastName,
      parsed.data.phone ?? null,
      parsed.data.city ?? null,
      parsed.data.birthDate ?? null,
      now,
      userId,
    );
  }

  const next = getProfileRow(context, userId);
  if (!next) {
    return context.json({ error: "Profile not found" }, 404);
  }

  return context.json({ profile: toApiProfile(next) });
}
