import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { config } from "../config";

const DATABASE_URL = config.databaseUrl;

let _pool: Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/** Returns the singleton pg Pool. */
export function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: DATABASE_URL,
      max: 25,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });

    _pool.on("error", (err: Error) => {
      console.warn("[DB] pool error:", err.message);
    });
  }
  return _pool;
}

/** Returns the singleton Drizzle ORM instance. */
export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (!_db) {
    _db = drizzle(getPool(), { schema });
  }
  return _db;
}

/** Close the pool (used in graceful shutdown). */
export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end().catch(() => {});
    _pool = null;
    _db = null;
  }
}
