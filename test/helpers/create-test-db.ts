import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { relations } from "../../src/db/relations";

/**
 * Deliberately builds an explicit `pg.Client` and passes it via `client:`
 * (matching `createDb()` in src/db/client.ts) instead of `drizzle({
 * connection: connectionString })` — that overload hands the string to
 * `new pg.Pool(...)` under the hood, not a `Client`. `$client.connect()`
 * on a Pool checks out and leaks one connection (never released back to
 * the pool), which then makes `$client.end()` hang forever waiting for
 * that outstanding checkout — this was a real, 100%-reproducible CI hang
 * (every test/db/application file timed out identically on `.end()`)
 * before this fix.
 *
 * No explicit return type annotation: callers need `$client` to close the
 * connection before dropping its database (see test/helpers/fixtures.ts),
 * which the narrower `Db` type from src/db/client.ts doesn't expose.
 *
 * `lock_timeout` is set server-wide (see test/setup.ts's container command)
 * rather than per connection here.
 */
export async function createTestDb(connectionString: string) {
  const client = new Client({ connectionString });
  await client.connect();
  return drizzle({ client, relations });
}
