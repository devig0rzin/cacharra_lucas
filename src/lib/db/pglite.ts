import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import type { Db } from "./types";

type Queryable = Pick<PGlite, "query"> | Transaction;

function wrap(conn: Queryable, root: PGlite): Db {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const res = await conn.query<T>(text, params);
      return res.rows;
    },
    async transaction<R>(fn: (tx: Db) => Promise<R>): Promise<R> {
      // PGlite não aninha transações; dentro de uma, apenas reutilizamos a conexão.
      if (conn !== root) return fn(wrap(conn, root));
      return root.transaction((tx) => fn(wrap(tx, root)));
    },
  };
}

/** Aplica os arquivos de supabase/migrations em ordem, uma única vez cada. */
export async function runMigrations(pg: PGlite, migrationsDir: string): Promise<void> {
  await pg.exec(`create table if not exists _migrations (name text primary key, applied_at timestamptz default now())`);
  const applied = new Set((await pg.query<{ name: string }>(`select name from _migrations`)).rows.map((r) => r.name));
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await pg.transaction(async (tx) => {
      await tx.exec(sql);
      await tx.query(`insert into _migrations (name) values ($1)`, [file]);
    });
  }
}

export const MIGRATIONS_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "supabase", "migrations");

/**
 * Banco Postgres embutido (WASM). Usado no desenvolvimento local quando não há
 * DATABASE_URL, e nos testes. `dataDir` undefined = só em memória.
 */
export async function createPgliteDb(dataDir?: string, migrationsDir = MIGRATIONS_DIR): Promise<Db> {
  if (dataDir) await mkdir(dataDir, { recursive: true });
  const pg = dataDir ? new PGlite(dataDir) : new PGlite();
  await runMigrations(pg, migrationsDir);
  return wrap(pg, pg);
}
