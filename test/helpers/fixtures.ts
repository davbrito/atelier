import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { test as baseTest, inject } from "vitest";
import { withDatabase } from "./connection-string.ts";
import { createTestDb } from "./create-test-db.ts";
import { TEMPLATE_DATABASE } from "./db-template.ts";
import { resetDb } from "./reset-db.ts";

async function withMaintenanceClient<T>(
  connectionString: string,
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  // CREATE/DROP DATABASE can't run against the database being created or
  // dropped, so this always connects to the "postgres" system database,
  // which every Postgres server has.
  const client = new Client({ connectionString: withDatabase(connectionString, "postgres") });
  await client.connect();
  // Same reasoning as createTestDb: fail fast on a lock wait instead of
  // hanging (CREATE/DROP DATABASE are catalog-level operations Postgres
  // serializes, so this is the operation most likely to ever contend).
  await client.query("set lock_timeout = '10s'");
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/**
 * Shared `test` extended with fixtures for test/db/application/**. Currently:
 * - `databaseUrl`: each test file clones its own uniquely-named database
 *   from the migrated template (see test/setup.ts and
 *   test/helpers/db-template.ts, `scope: "file"`, mirroring the old
 *   `beforeAll`) instead of every file sharing one database. This was meant
 *   to let files run in parallel, but CREATE/DROP DATABASE are catalog-level
 *   operations Postgres serializes — with ~15-20 files concurrently issuing
 *   them, CI hung, so vitest.config.ts's "db" project currently pins
 *   `fileParallelism: false`. The per-file isolation is still worth keeping
 *   even sequential (a clean database per file instead of one shared,
 *   truncated database). Dropped again once the file's tests finish.
 *   Request this directly (instead of `inject("postgresConnectionString")`)
 *   for any extra raw `pg.Client` connections a test needs (e.g. for
 *   concurrency tests) — they must point at the same cloned database as `db`.
 * - `db`: a Drizzle client connected to `databaseUrl`, closed before
 *   `databaseUrl`'s cleanup drops the database (fixture cleanup runs in
 *   reverse dependency order, so this happens automatically). Each test
 *   within a file shares that one connection, truncated after every test
 *   automatically (via the `auto: true` `cleanDb` fixture, mirroring the old
 *   `afterEach`).
 *
 * Add more fixtures here as they come up, via `.extend(...)`.
 */
const test = baseTest
  // biome-ignore lint/correctness/noEmptyPattern: vitest's fixture parser requires a literal destructuring pattern here, even an unused one
  .extend("databaseUrl", { scope: "file" }, async ({}, { onCleanup }) => {
    const connectionString = inject("postgresConnectionString");
    const database = `test_${randomUUID().replaceAll("-", "")}`;

    await withMaintenanceClient(connectionString, (client) =>
      client.query(`CREATE DATABASE "${database}" TEMPLATE "${TEMPLATE_DATABASE}"`),
    );
    onCleanup(async () => {
      await withMaintenanceClient(connectionString, (client) =>
        client.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`),
      );
    });

    return withDatabase(connectionString, database);
  })
  .extend("db", { scope: "file" }, async ({ databaseUrl }, { onCleanup }) => {
    const db = await createTestDb(databaseUrl);
    onCleanup(() => db.$client.end());
    return db;
  })
  .extend("cleanDb", { auto: true }, async ({ db }, { onCleanup }) => {
    onCleanup(() => resetDb(db));
  });

// Exported as `it` so files can just swap the import instead of renaming
// every `it(...)` call to `test(...)`.
export { test as it };
