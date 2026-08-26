import { drizzle } from "drizzle-orm/node-postgres";
import type { Db } from "../../src/db/client";
import { relations } from "../../src/db/relations";

/**
 * A typed `Db` that isn't connected to anything — for unit tests that need
 * a `Db`-shaped value to satisfy a function signature but never actually
 * expect a query to run against it (e.g. a code path that should
 * short-circuit before touching the database).
 */
export function mockDb(): Db {
  return drizzle.mock({ relations });
}
