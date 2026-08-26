import { test as baseTest, inject } from "vitest";
import type { Db } from "../../src/db/client";
import { createTestDb } from "./create-test-db.ts";
import { resetDb } from "./reset-db.ts";

interface DbFixtures {
  db: Db;
  /** Truncates all tables after each test — depend on `db` to opt in. */
  cleanDb: undefined;
}

/**
 * `test` extended with a `db` fixture: one connection per test file (via
 * `scope: "file"`, mirroring the old `beforeAll`), truncated after every
 * test that uses it (via the auto-used `cleanDb` fixture, mirroring the old
 * `afterEach`).
 */
export const test = baseTest.extend<DbFixtures>({
  db: [
    async (_ctx, use) => {
      const db = await createTestDb(inject("postgresConnectionString"));
      await use(db);
    },
    { scope: "file" },
  ],
  cleanDb: [
    async ({ db }, use) => {
      await use(undefined);
      await resetDb(db);
    },
    { auto: true },
  ],
});
