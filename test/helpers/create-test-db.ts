import { drizzle } from "drizzle-orm/node-postgres";
import { relations } from "../../src/db/relations";

/**
 * `createDb()` in src/db/client.ts wraps an unconnected pg.Client — fine in
 * production where Hyperdrive's proxy handles the connection lifecycle, but
 * a plain node `pg.Client` needs an explicit `.connect()` before any query
 * will resolve. This connects first so tests don't hang.
 *
 * No explicit return type annotation: callers need `$client` to close the
 * connection before dropping its database (see test/helpers/fixtures.ts),
 * which the narrower `Db` type from src/db/client.ts doesn't expose.
 */
export async function createTestDb(connectionString: string) {
  const db = drizzle({ connection: connectionString, relations });
  await db.$client.connect();
  // Fail fast instead of hanging if a query (e.g. resetDb's TRUNCATE) ever
  // has to wait on a lock — a leaked/orphaned transaction should surface as
  // a clear Postgres error, not a stuck CI job.
  await db.$client.query("set lock_timeout = '10s'");
  return db;
}
