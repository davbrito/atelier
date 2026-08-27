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
 *
 * `lock_timeout` is set server-wide (see test/setup.ts's container command)
 * rather than per connection here.
 */
export async function createTestDb(connectionString: string) {
  const db = drizzle({ connection: connectionString, relations });
  await db.$client.connect();
  return db;
}
