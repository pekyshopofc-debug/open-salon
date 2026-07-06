import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = join(__dirname, "..", "src", "server", "schema.pg.sql");
const sql = readFileSync(schemaPath, "utf-8");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const client = neon(databaseUrl);

const statements = sql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"));

console.log(`Running ${statements.length} SQL statements...`);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  // Skip pure comments
  if (stmt.startsWith("--")) continue;
  try {
    // Neon v1 requires tagged template or .query() for DDL
    await client.query(stmt);
    console.log(`  [${i + 1}/${statements.length}] OK`);
  } catch (err) {
    console.error(`  [${i + 1}/${statements.length}] ERROR:`, err instanceof Error ? err.message : String(err));
  }
}

console.log("Schema initialization complete!");
