import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { test as baseTest, inject } from "vitest";
import { withDatabase } from "./connection-string.ts";
import { createTestDb } from "./create-test-db.ts";
import { TEMPLATE_DATABASE } from "./db-template.ts";
import { resetDb } from "./reset-db.ts";

/**
 * Logs `label` with a timestamp before/after running `fn`, to debug where
 * time goes in CI, and enforces a hard timeout — vitest's own
 * hookTimeout/teardownTimeout don't seem to cover fixture `onCleanup`
 * callbacks (a hang there ran well past teardownTimeout with no error),
 * so this throws on its own instead of relying on that.
 */
async function timed<T>(label: string, fn: () => Promise<T>, timeoutMs = 10_000): Promise<T> {
  const start = Date.now();
  console.log(`[fixtures] ${label}: start`);
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`[fixtures] ${label}: timed out after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
    console.log(`[fixtures] ${label}: done (${Date.now() - start}ms)`);
    return result;
  } catch (error) {
    console.log(`[fixtures] ${label}: failed (${Date.now() - start}ms)`);
    throw error;
  }
}

async function withMaintenanceClient<T>(
  connectionString: string,
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  // CREATE/DROP DATABASE can't run against the database being created or
  // dropped, so this always connects to the "postgres" system database,
  // which every Postgres server has.
  const client = new Client({ connectionString: withDatabase(connectionString, "postgres") });
  await timed("maintenance client connect", () => client.connect());
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
  // `task` (which carries the file name) isn't available to `scope: "file"`
  // fixtures — only to test-scoped ones like `cleanDb` below — so these two
  // are labeled by the generated database name instead.
  // biome-ignore lint/correctness/noEmptyPattern: vitest's fixture parser requires a literal destructuring pattern here, even an unused one
  .extend("databaseUrl", { scope: "file" }, async ({}, { onCleanup }) => {
    const connectionString = inject("postgresConnectionString");
    const database = `test_${randomUUID().replaceAll("-", "")}`;

    await timed(`CREATE DATABASE ${database}`, () =>
      withMaintenanceClient(connectionString, (client) =>
        client.query(`CREATE DATABASE "${database}" TEMPLATE "${TEMPLATE_DATABASE}"`),
      ),
    );
    onCleanup(async () => {
      await timed(`DROP DATABASE ${database}`, () =>
        withMaintenanceClient(connectionString, (client) =>
          client.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`),
        ),
      );
    });

    return withDatabase(connectionString, database);
  })
  .extend("db", { scope: "file" }, async ({ databaseUrl }, { onCleanup }) => {
    const database = new URL(databaseUrl).pathname.slice(1);
    const db = await timed(`connect db client (${database})`, () => createTestDb(databaseUrl));
    onCleanup(() => timed(`end db client (${database})`, () => db.$client.end()));
    return db;
  })
  .extend("cleanDb", { auto: true }, async ({ db, task }, { onCleanup }) => {
    onCleanup(() => timed(`${task.file.name}: resetDb after "${task.name}"`, () => resetDb(db)));
  });

// Exported as `it` so files can just swap the import instead of renaming
// every `it(...)` call to `test(...)`.
export { test as it };
