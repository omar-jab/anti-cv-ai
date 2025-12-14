import { Database } from "bun:sqlite";
import type { MiddlewareHandler } from "hono";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type DbVariables = {
  db: Database;
};

export type AppEnv = {
  Variables: DbVariables;
};

let dbInstance: Database | null = null;

function getDbPath() {
  const fromEnv = Bun.env.SQLITE_DB_PATH?.trim();
  if (fromEnv) return fromEnv;

  return join(import.meta.dir, "..", "data", "app.sqlite");
}

function openDb(dbPath: string) {
  if (dbPath !== ":memory:") {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const db = new Database(dbPath, { create: true });
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");
  return db;
}

export function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = openDb(getDbPath());
  migrateDb(dbInstance);
  return dbInstance;
}

export const dbMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("db", getDb());
  await next();
};

function ensureMigrationsTable(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS __migrations (
      name TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);
}

export function migrateDb(db: Database) {
  ensureMigrationsTable(db);

  const migrationsDir = join(import.meta.dir, "migrations");
  if (!existsSync(migrationsDir)) return;

  const appliedRows = db.query("SELECT name FROM __migrations").all() as Array<{
    name: string;
  }>;
  const applied = new Set(appliedRows.map((r) => r.name));

  const migrationFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  const insertMigration = db.query(
    "INSERT INTO __migrations (name, applied_at) VALUES (?, ?)"
  );

  for (const file of migrationFiles) {
    if (applied.has(file)) continue;

    const sql = readFileSync(join(migrationsDir, file), "utf8");
    db.exec("BEGIN");
    try {
      db.exec(sql);
      insertMigration.run(file, Date.now());
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}
