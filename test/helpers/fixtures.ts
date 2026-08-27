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
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/**
 * Shared `test` extended with fixtures for test/db/application/**. Currently
 * just `db`: each test file clones its own uniquely-named database from the
 * migrated template (see test/setup.ts and test/helpers/db-template.ts,
 * `scope: "file"`, mirroring the old `beforeAll`) instead of every file
 * sharing one database — that's what lets these files run in parallel. Each
 * test within a file still shares that one cloned database, truncated after
 * every test automatically (via the `auto: true` `cleanDb` fixture,
 * mirroring the old `afterEach`). Add more fixtures here as they come up,
 * via `.extend(...)`.
 */
const test = baseTest
  // biome-ignore lint/correctness/noEmptyPattern: vitest's fixture parser requires a literal destructuring pattern here, even an unused one
  .extend("db", { scope: "file" }, async ({}, { onCleanup }) => {
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

    return createTestDb(withDatabase(connectionString, database));
  })
  .extend("cleanDb", { auto: true }, async ({ db }, { onCleanup }) => {
    onCleanup(() => resetDb(db));
  });

// Exported as `it` so files can just swap the import instead of renaming
// every `it(...)` call to `test(...)`.
export { test as it };
