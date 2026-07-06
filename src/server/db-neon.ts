import { Pool, QueryResult } from "pg";

let pool: Pool | null = null;

export function initDB(): void {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    pool = new Pool({
      connectionString: url,
      max: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
}

function adaptSql(sql: string): string {
  let i = 0;
  return sql
    .replace(/\?/g, () => `$${++i}`)
    .replace(/datetime\(('now')\)/gi, "NOW()")
    .replace(/date\(('now')\)/gi, "CURRENT_DATE");
}

export async function query<T>(queryStr: string, params?: unknown[]): Promise<T[]> {
  if (!pool) throw new Error("Database not initialized. Call initDB() first.");
  const adapted = adaptSql(queryStr);
  const result: QueryResult = await pool.query(adapted, params);
  return result.rows as unknown as T[];
}

export async function get<T>(queryStr: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(queryStr, params);
  return rows[0] || null;
}

export async function run(
  queryStr: string,
  params?: unknown[],
): Promise<{ lastInsertRowid: number; changes: number }> {
  if (!pool) throw new Error("Database not initialized. Call initDB() first.");
  const adapted = adaptSql(queryStr);
  const result: QueryResult = await pool.query(adapted, params);
  return {
    lastInsertRowid: result.rows?.length > 0 ? (result.rows[0] as Record<string, unknown>)?.id as number ?? 0 : 0,
    changes: result.rowCount ?? 0,
  };
}
