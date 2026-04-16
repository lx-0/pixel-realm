import { readFileSync } from "fs";
import { join } from "path";
import { getPool } from "./client";

const MIGRATIONS = ["0001_initial.sql", "0002_quests.sql", "0003_trading.sql", "0004_skill_trees.sql", "0005_crafting.sql", "0006_achievements.sql", "0007_leaderboard.sql", "0008_factions.sql", "0009_housing.sql", "0010_auth_hardening.sql", "0011_database_resilience.sql", "0012_moderation.sql", "0013_social.sql", "0014_content_depth.sql", "0015_prestige.sql", "0016_raids.sql", "0017_seasonal_events.sql", "0018_analytics.sql", "0019_daily_rewards.sql", "0026_client_errors.sql", "0027_parcel_buildings.sql"];

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
