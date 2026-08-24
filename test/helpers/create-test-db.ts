import { drizzle } from "drizzle-orm/node-postgres";
import type { Db } from "../../src/db/client";
import { relations } from "../../src/db/relations";

/**
 * `createDb()` in src/db/client.ts wraps an unconnected pg.Client — fine in
 * production where Hyperdrive's proxy handles the connection lifecycle, but
 * a plain node `pg.Client` needs an explicit `.connect()` before any query
 * will resolve. This connects first so tests don't hang.
 */
export async function createTestDb(connectionString: string): Promise<Db> {
  const db = drizzle({ connection: connectionString, relations });
  await db.$client.connect();
  return db;
}
