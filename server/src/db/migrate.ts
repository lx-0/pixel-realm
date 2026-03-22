import { readFileSync } from "fs";
import { join } from "path";
import { getPool } from "./client";

const MIGRATIONS = ["0001_initial.sql", "0002_quests.sql", "0003_trading.sql", "0004_skill_trees.sql"];

/**
 * Applies pending SQL migrations in order.
 * Uses a _migrations table to track applied files — idempotent.
 */
export async function runMigrations(): Promise<void> {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  for (const file of MIGRATIONS) {
    const result = await pool.query("SELECT 1 FROM _migrations WHERE name = $1", [file]);
    if (result.rowCount && result.rowCount > 0) continue;

    const sql = readFileSync(join(__dirname, "migrations", file), "utf8");
    await pool.query(sql);
    await pool.query("INSERT INTO _migrations (name) VALUES ($1)", [file]);
    console.log(`[DB] Applied migration: ${file}`);
  }

  console.log("[DB] Migrations up to date.");
}
