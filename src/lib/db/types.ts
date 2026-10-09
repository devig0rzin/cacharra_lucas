/**
 * Interface mínima de banco usada pelos módulos.
 * Implementada por Postgres de verdade (Supabase) e por PGlite (dev/testes),
 * para que o mesmo SQL rode nos dois lugares.
 */
export interface Db {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
  transaction<R>(fn: (tx: Db) => Promise<R>): Promise<R>;
}

/** Código do Postgres para violação de exclusion constraint. */
export const PG_EXCLUSION_VIOLATION = "23P01";

export function pgErrorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}
