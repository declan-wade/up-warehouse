import { DuckDBInstance, type DuckDBConnection } from "@duckdb/node-api";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Single shared DuckDB connection for the whole process. DuckDB permits only one
 * read-write process on the database file, so every read and write in the app funnels
 * through this connection. The promise is cached on `globalThis` so Next.js dev hot
 * reloads reuse the same instance instead of re-opening (and locking) the file.
 */

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "up.duckdb");
const SCHEMA_PATH = path.join(process.cwd(), "lib", "db", "schema.sql");

type DbHandle = { instance: DuckDBInstance; connection: DuckDBConnection };

const globalForDb = globalThis as unknown as { __upDb?: Promise<DbHandle> };

async function open(): Promise<DbHandle> {
  mkdirSync(DB_DIR, { recursive: true });
  const instance = await DuckDBInstance.create(DB_PATH);
  const connection = await instance.connect();
  await migrate(connection);
  return { instance, connection };
}

async function migrate(connection: DuckDBConnection): Promise<void> {
  const raw = readFileSync(SCHEMA_PATH, "utf8");
  // Strip `--` line comments first (they may contain semicolons), then split:
  // DuckDB prepares one statement at a time, so run each separately.
  const sql = raw
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const statement of statements) {
    await connection.run(statement);
  }
}

export async function getDb(): Promise<DuckDBConnection> {
  if (!globalForDb.__upDb) {
    globalForDb.__upDb = open();
  }
  return (await globalForDb.__upDb).connection;
}

type Param = string | number | bigint | boolean | null;

function normalize(params: Param[]): Param[] {
  return params.map((p) => (p === undefined ? null : p));
}

/** Run a query and return rows as plain JS objects. */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params: Param[] = [],
): Promise<T[]> {
  const db = await getDb();
  const reader = await db.runAndReadAll(sql, normalize(params));
  return reader.getRowObjectsJS() as T[];
}

/** Run a query expected to return a single row (or null). */
export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: Param[] = [],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

/** Execute a statement without reading results. */
export async function exec(sql: string, params: Param[] = []): Promise<void> {
  const db = await getDb();
  await db.run(sql, normalize(params));
}
