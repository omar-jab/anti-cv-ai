import type { Database } from "bun:sqlite";
import type { Context } from "hono";
import {
  generatePersonalityMarkdown,
  type UserMemoryItem,
} from "../agents/personality-deep-agent";
import { generateCV } from "../agents/cv-generator";
import type { AppEnvWithAuth } from "../middleware/auth";

type JobStatus = "queued" | "running" | "succeeded" | "failed";

type PersonalityJobRow = {
  id: string;
  user_id: string;
  status: JobStatus;
  created_at: number;
  updated_at: number;
  started_at: number | null;
  finished_at: number | null;
  error: string | null;
};

type PersonalityRow = {
  id: string;
  user_id: string;
  content_md: string;
  analysis_json: string;
  version: number;
  created_at: number;
  updated_at: number;
};

function toIso(value: number | null) {
  return typeof value === "number" && value > 0
    ? new Date(value).toISOString()
    : null;
}

function toApiJob(row: PersonalityJobRow) {
  return {
    id: row.id,
    status: row.status,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    startedAt: toIso(row.started_at),
    finishedAt: toIso(row.finished_at),
    error: row.error,
  };
}

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return null;
  }
}

async function runPersonalityUpdateJob(db: Database, jobId: string) {
  const startedAt = Date.now();
  const lock = db
    .query(
      `UPDATE personality_update_jobs
       SET status = 'running', started_at = ?, updated_at = ?
       WHERE id = ? AND status = 'queued'`,
    )
    .run(startedAt, startedAt, jobId);

  if (lock.changes === 0) return;

  const job = db
    .query("SELECT user_id FROM personality_update_jobs WHERE id = ?")
    .get(jobId) as { user_id: string | null } | undefined;

  const userId = job?.user_id ?? null;
  if (!userId) {
    const finishedAt = Date.now();
    db.query(
      `UPDATE personality_update_jobs
       SET status = 'failed', finished_at = ?, updated_at = ?, error = ?
       WHERE id = ?`,
    ).run(finishedAt, finishedAt, "Missing user_id for job", jobId);
    return;
  }

  try {
    const memories = db
      .query(
        `SELECT section, title, content
         FROM user_memory_items
         WHERE user_id = ?
         ORDER BY section ASC, title ASC, updated_at DESC`,
      )
      .all(userId) as UserMemoryItem[];

    const previousRow = db
      .query(
        `SELECT content_md
         FROM user_personalities
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT 1`,
      )
      .get(userId) as { content_md: string } | undefined;

    const analysis = await generatePersonalityMarkdown({
      memories,
      previousPersonality: previousRow?.content_md ?? null,
    });
    const now = Date.now();
    const personality = analysis.personality.trim();
    if (!personality) {
      throw new Error("Empty personality output");
    }

    const versionRow = db
      .query(
        `SELECT COALESCE(MAX(version), 0) AS max_version
         FROM user_personalities
         WHERE user_id = ?`,
      )
      .get(userId) as { max_version: number } | undefined;

    const nextVersion = (versionRow?.max_version ?? 0) + 1;
    const personalityId = crypto.randomUUID();

    db.query(
      `INSERT INTO user_personalities (id, user_id, content_md, analysis_json, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      personalityId,
      userId,
      personality,
      JSON.stringify(analysis),
      nextVersion,
      now,
      now,
    );

    // Genera e salva il CV dopo la personalità
    try {
      const profileRow = db
        .query(
          `SELECT first_name, last_name, email, phone, city, image_url
           FROM users
           WHERE id = ?`,
        )
        .get(userId) as
        | {
            first_name: string | null;
            last_name: string | null;
            email: string | null;
            phone: string | null;
            city: string | null;
            image_url: string | null;
          }
        | undefined;

      const cv = await generateCV({
        memories,
        personality,
        profile: profileRow
          ? {
              firstName: profileRow.first_name,
              lastName: profileRow.last_name,
              email: profileRow.email,
              phone: profileRow.phone,
              city: profileRow.city,
              imageUrl: profileRow.image_url,
            }
          : null,
      });

      const cvId = crypto.randomUUID();
      const cvNow = Date.now();

      // Inserisci o aggiorna il CV per questa personalità
      db.query(
        `INSERT INTO user_cvs (id, user_id, personality_id, cv_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(personality_id) DO UPDATE SET
           cv_json = excluded.cv_json,
           updated_at = excluded.updated_at`,
      ).run(
        cvId,
        userId,
        personalityId,
        JSON.stringify(cv),
        cvNow,
        cvNow,
      );
    } catch (cvError) {
      // Log l'errore ma non bloccare il job se la generazione del CV fallisce
      console.error("CV generation failed:", cvError);
      // Il job della personalità è comunque completato con successo
    }

    const finishedAt = Date.now();
    db.query(
      `UPDATE personality_update_jobs
       SET status = 'succeeded', finished_at = ?, updated_at = ?, error = NULL
       WHERE id = ?`,
    ).run(finishedAt, finishedAt, jobId);
  } catch (error) {
    const finishedAt = Date.now();
    const message = error instanceof Error ? error.message : String(error);
    db.query(
      `UPDATE personality_update_jobs
       SET status = 'failed', finished_at = ?, updated_at = ?, error = ?
       WHERE id = ?`,
    ).run(finishedAt, finishedAt, message, jobId);
  }
}

export async function StartPersonalityUpdateJob(
  context: Context<AppEnvWithAuth>,
) {
  const userId = context.get("userId");
  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const db = context.get("db");

  const activeJob = db
    .query(
      `SELECT id, user_id, status, created_at, updated_at, started_at, finished_at, error
       FROM personality_update_jobs
       WHERE user_id = ? AND status IN ('queued', 'running')
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .get(userId) as PersonalityJobRow | undefined;

  if (activeJob) {
    return context.json({ job: toApiJob(activeJob) });
  }

  const id = crypto.randomUUID();
  const now = Date.now();

  try {
    db.query(
      `INSERT INTO personality_update_jobs (id, user_id, status, created_at, updated_at)
       VALUES (?, ?, 'queued', ?, ?)`,
    ).run(id, userId, now, now);
  } catch (error) {
    const existingJob = db
      .query(
        `SELECT id, user_id, status, created_at, updated_at, started_at, finished_at, error
         FROM personality_update_jobs
         WHERE user_id = ? AND status IN ('queued', 'running')
         ORDER BY created_at DESC
         LIMIT 1`,
      )
      .get(userId) as PersonalityJobRow | undefined;

    if (existingJob) {
      return context.json({ job: toApiJob(existingJob) });
    }

    const message = error instanceof Error ? error.message : String(error);
    return context.json(
      { error: "Failed to create job", details: message },
      500,
    );
  }

  setTimeout(() => {
    void runPersonalityUpdateJob(db, id);
  }, 0);

  const jobRow = db
    .query(
      `SELECT id, user_id, status, created_at, updated_at, started_at, finished_at, error
       FROM personality_update_jobs
       WHERE id = ?`,
    )
    .get(id) as PersonalityJobRow | undefined;

  return context.json(
    {
      job: jobRow
        ? toApiJob(jobRow)
        : {
            id,
            status: "queued" as const,
            createdAt: new Date(now).toISOString(),
            updatedAt: new Date(now).toISOString(),
            startedAt: null,
            finishedAt: null,
            error: null,
          },
    },
    201,
  );
}

export async function GetPersonalityUpdateJob(
  context: Context<AppEnvWithAuth>,
) {
  const userId = context.get("userId");
  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const id = context.req.param("id");
  if (!id) {
    return context.json({ error: "Invalid id" }, 400);
  }

  const db = context.get("db");
  const job = db
    .query(
      `SELECT id, user_id, status, created_at, updated_at, started_at, finished_at, error
       FROM personality_update_jobs
       WHERE id = ?`,
    )
    .get(id) as PersonalityJobRow | undefined;

  if (!job) {
    return context.json({ error: "Not found" }, 404);
  }

  if (job.user_id !== userId) {
    return context.json({ error: "Forbidden" }, 403);
  }

  return context.json({ job: toApiJob(job) });
}

export async function GetUserPersonality(context: Context<AppEnvWithAuth>) {
  const userId = context.get("userId");
  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const db = context.get("db");
  const row = db
    .query(
      `SELECT id, user_id, content_md, analysis_json, version, created_at, updated_at
       FROM user_personalities
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
    )
    .get(userId) as PersonalityRow | undefined;

  if (!row) {
    return context.json({ personality: null });
  }

  return context.json({
    personality: {
      id: row.id,
      content: row.content_md,
      version: row.version,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    },
  });
}

export async function ListUserPersonalities(context: Context<AppEnvWithAuth>) {
  const userId = context.get("userId");
  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const limitParam = context.req.query("limit");
  const limitRaw = limitParam ? Number(limitParam) : 20;
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? Math.min(Math.floor(limitRaw), 100)
      : 20;

  const db = context.get("db");
  const rows = db
    .query(
      `SELECT id, version, created_at, updated_at
       FROM user_personalities
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(userId, limit) as Array<{
    id: string;
    version: number;
    created_at: number;
    updated_at: number;
  }>;

  return context.json({
    personalities: rows.map((r) => ({
      id: r.id,
      version: r.version,
      createdAt: toIso(r.created_at),
      updatedAt: toIso(r.updated_at),
    })),
  });
}

export async function GetUserPersonalityById(context: Context<AppEnvWithAuth>) {
  const userId = context.get("userId");
  if (!userId) {
    return context.json({ error: "Unauthorized" }, 401);
  }

  const id = context.req.param("id");
  if (!id) {
    return context.json({ error: "Invalid id" }, 400);
  }

  const db = context.get("db");
  const row = db
    .query(
      `SELECT id, user_id, content_md, analysis_json, version, created_at, updated_at
       FROM user_personalities
       WHERE id = ?`,
    )
    .get(id) as PersonalityRow | undefined;

  if (!row) {
    return context.json({ error: "Not found" }, 404);
  }

  if (row.user_id !== userId) {
    return context.json({ error: "Forbidden" }, 403);
  }

  return context.json({
    personality: {
      id: row.id,
      content: row.content_md,
      analysis: safeJsonParse(row.analysis_json),
      version: row.version,
      createdAt: toIso(row.created_at),
      updatedAt: toIso(row.updated_at),
    },
  });
}
