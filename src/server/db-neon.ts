import { neon } from "@neondatabase/serverless";

type NeonSql = ReturnType<typeof neon>;
let sqlFn: NeonSql | null = null;

export function initDB(): void {
  if (!sqlFn) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    sqlFn = neon(url);
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
  if (!sqlFn) throw new Error("Database not initialized. Call initDB() first.");
  const adapted = adaptSql(queryStr);
  // .query() uses HTTP mode — fastest for cold starts on Vercel
  const result = await sqlFn.query(adapted, params ?? []);
  return (Array.isArray(result) ? result : []) as unknown as T[];
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
  const result = await sqlFn.query(adapted, params ?? []);
  const rows = Array.isArray(result) ? result : [];
  return {
    lastInsertRowid: rows.length > 0 ? (rows[0] as Record<string, unknown>)?.id as number ?? 0 : 0,
    changes: rows.length,
  };
}
