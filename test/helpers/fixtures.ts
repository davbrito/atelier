import { test as baseTest, inject } from "vitest";
import { createTestDb } from "./create-test-db.ts";
import { resetDb } from "./reset-db.ts";

/**
 * Shared `test` extended with fixtures for test/db/application/**. Currently
 * just `db`: one connection per test file (via `scope: "file"`, mirroring
 * the old `beforeAll`), truncated after every test automatically (via the
 * `auto: true` `cleanDb` fixture, mirroring the old `afterEach`). Add more
 * fixtures here as they come up, via `.extend(...)`.
 */
const test = baseTest
  .extend("db", { scope: "file" }, async () => createTestDb(inject("postgresConnectionString")))
  .extend("cleanDb", { auto: true }, async ({ db }, { onCleanup }) => {
    onCleanup(() => resetDb(db));
  });

// Exported as `it` so files can just swap the import instead of renaming
// every `it(...)` call to `test(...)`.
export { test as it };
