import type { Context } from "hono";
import { z } from "zod";
import type { AppEnvWithAuth } from "../middleware/auth";

type MemoryRow = {
  id: string;
  section: string;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
};

function toApiMemory(row: MemoryRow) {
  return {
    id: row.id,
    section: row.section,
    title: row.title,
    content: row.content,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

const CreateMemorySchema = z.object({
  section: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
});

const UpdateMemorySchema = z
  .object({
    section: z.string().min(1).optional(),
    title: z.string().min(1).optional(),
    content: z.string().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.section && !value.title && !value.content) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field is required",
      });
    }
  });

export async function ListUserMemories(context: Context<AppEnvWithAuth>) {
  const userId = context.get("userId");
  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const db = context.get("db");
  const rows = db
    .query(
      `SELECT id, section, title, content, created_at, updated_at
       FROM user_memory_items
       WHERE user_id = ?
       ORDER BY updated_at DESC, created_at DESC, id ASC`,
    )
    .all(userId) as MemoryRow[];

  return context.json({
    memories: rows.map(toApiMemory),
  });
}

export async function CreateUserMemory(context: Context<AppEnvWithAuth>) {
  const userId = context.get("userId");
  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const body = await context.req.json().catch(() => null);
  const parsed = CreateMemorySchema.safeParse(body);
  if (!parsed.success) {
    return context.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      400,
    );
  }

  const db = context.get("db");
  const now = Date.now();
  const section = parsed.data.section.trim();
  const title = parsed.data.title.trim();
  const content = parsed.data.content.trim();

  const existing = db
    .query(
      "SELECT id FROM user_memory_items WHERE user_id = ? AND section = ? AND title = ?",
    )
    .get(userId, section, title) as { id: string } | undefined;

  if (existing) {
    return context.json({ error: "Memory already exists" }, 409);
  }

  const id = crypto.randomUUID();
  db.query(
    "INSERT INTO user_memory_items (id, user_id, section, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(id, userId, section, title, content, now, now);

  return context.json(
    {
      memory: toApiMemory({
        id,
        section,
        title,
        content,
        created_at: now,
        updated_at: now,
      }),
    },
    201,
  );
}

export async function UpdateUserMemory(context: Context<AppEnvWithAuth>) {
  const userId = context.get("userId");
  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const id = context.req.param("id");
  if (!id) {
    return context.json({ error: "Invalid id" }, 400);
  }

  const body = await context.req.json().catch(() => null);
  const parsed = UpdateMemorySchema.safeParse(body);
  if (!parsed.success) {
    return context.json(
      { error: "Invalid payload", details: parsed.error.flatten() },
      400,
    );
  }

  const db = context.get("db");
  const existing = db
    .query(
      `SELECT id, section, title, content, created_at, updated_at
       FROM user_memory_items
       WHERE id = ? AND user_id = ?`,
    )
    .get(id, userId) as MemoryRow | undefined;

  if (!existing) {
    return context.json({ error: "Not found" }, 404);
  }

  const nextSection = (parsed.data.section ?? existing.section).trim();
  const nextTitle = (parsed.data.title ?? existing.title).trim();
  const nextContent = (parsed.data.content ?? existing.content).trim();

  const conflict = db
    .query(
      `SELECT id
       FROM user_memory_items
       WHERE user_id = ? AND section = ? AND title = ? AND id <> ?`,
    )
    .get(userId, nextSection, nextTitle, id) as { id: string } | undefined;

  if (conflict) {
    return context.json({ error: "Memory already exists" }, 409);
  }

  const now = Date.now();
  db.query(
    "UPDATE user_memory_items SET section = ?, title = ?, content = ?, updated_at = ? WHERE id = ? AND user_id = ?",
  ).run(nextSection, nextTitle, nextContent, now, id, userId);

  return context.json({
    memory: toApiMemory({
      ...existing,
      section: nextSection,
      title: nextTitle,
      content: nextContent,
      updated_at: now,
    }),
  });
}

export async function DeleteUserMemory(context: Context<AppEnvWithAuth>) {
  const userId = context.get("userId");
  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const id = context.req.param("id");
  if (!id) {
    return context.json({ error: "Invalid id" }, 400);
  }

  const db = context.get("db");
  const result = db
    .query("DELETE FROM user_memory_items WHERE id = ? AND user_id = ?")
    .run(id, userId);

  if (result.changes === 0) {
    return context.json({ error: "Not found" }, 404);
  }

  return context.json({ deleted: true });
}
