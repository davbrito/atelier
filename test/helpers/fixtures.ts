import { test as baseTest, inject } from "vitest";
import { createTestDb } from "./create-test-db.ts";
import { resetDb } from "./reset-db.ts";

/**
 * Shared `test` extended with fixtures for test/db/application/**. Currently
 * just `db`: one connection per test file (`dbConnection`, `scope: "file"`,
 * mirroring the old `beforeAll`), truncated before each test uses it
 * (mirroring the old `afterEach` — done *before* rather than after so a
 * single `db` fixture can depend on the file-scoped connection instead of
 * needing a second `auto: true` fixture just for cleanup timing). Add more
 * fixtures here as they come up, via `.extend(...)`.
 */
export const test = baseTest
  .extend("dbConnection", { scope: "file" }, async () =>
    createTestDb(inject("postgresConnectionString")),
  )
  .extend("db", async ({ dbConnection }) => {
    await resetDb(dbConnection);
    return dbConnection;
  });
