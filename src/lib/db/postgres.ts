import postgres from "postgres";
import type { Db } from "./types";

type Sql = postgres.Sql | postgres.TransactionSql;

function wrap(sql: Sql, inTransaction: boolean): Db {
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const rows = await sql.unsafe(text, params as postgres.ParameterOrJSON<never>[]);
      return rows as unknown as T[];
    },
    async transaction<R>(fn: (tx: Db) => Promise<R>): Promise<R> {
      if (inTransaction) return fn(wrap(sql, true));
      return (sql as postgres.Sql).begin((tx) => fn(wrap(tx, true))) as Promise<R>;
    },
  };
}

/**
 * Conexão com o Postgres do Supabase.
 * Em ambiente serverless use a URL do "transaction pooler" (porta 6543);
 * por isso `prepare: false`.
 */
export function createPostgresDb(url: string): Db {
  const sql = postgres(url, { prepare: false, max: 5, idle_timeout: 20 });
  return wrap(sql, false);
}
