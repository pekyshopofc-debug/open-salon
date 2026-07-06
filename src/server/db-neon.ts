import { neon } from "@neondatabase/serverless";

let sqlFn: ReturnType<typeof neon> | null = null;

export function initDB(): void {
  if (!sqlFn) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    sqlFn = neon(url);
  }
}

/**
 * Convert SQLite-style `?` placeholders to Postgres `$1, $2, ...`
 * and adapt SQLite-specific function calls.
 */
function adaptSql(sql: string): string {
  let i = 0;
  return sql
    .replace(/\?/g, () => `$${++i}`)
    .replace(/datetime\(('now')\)/gi, "NOW()")
    .replace(/date\(('now')\)/gi, "CURRENT_DATE");
}

export async function query<T>(queryStr: string, params?: unknown[]): Promise<T[]> {
  if (!sqlFn) throw new Error("Database not initialized. Call initDB() first.");
  const adapted = adaptSql(queryStr);
  const result = await sqlFn.query(adapted, params as (string | number | boolean | null)[]);
  return result as unknown as T[];
}

export async function get<T>(queryStr: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(queryStr, params);
  return rows[0] || null;
}

export async function run(
  queryStr: string,
  params?: unknown[],
): Promise<{ lastInsertRowid: number; changes: number }> {
  if (!sqlFn) throw new Error("Database not initialized. Call initDB() first.");
  const adapted = adaptSql(queryStr);
  const result = await sqlFn.query(adapted, params as (string | number | boolean | null)[]);
  return {
    lastInsertRowid: result && result.length > 0 ? ((result[0] as Record<string, unknown>)?.id as number) ?? 0 : 0,
    changes: result?.length ?? 0,
  };
}


