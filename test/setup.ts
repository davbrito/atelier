import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import type { TestProject } from "vitest/node";
import { TEMPLATE_DATABASE } from "#test/helpers/db-template.ts";

declare module "vitest" {
  interface ProvidedContext {
    postgresConnectionString: string;
  }
}

/** Logs `label` with a timestamp before/after running `fn`, to debug where time goes in CI. */
async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  console.log(`[setup] ${label}: start`);
  try {
    const result = await fn();
    console.log(`[setup] ${label}: done (${Date.now() - start}ms)`);
    return result;
  } catch (error) {
    console.log(`[setup] ${label}: failed (${Date.now() - start}ms)`);
    throw error;
  }
}

async function setupTestPostgres({ provide }: TestProject): Promise<AsyncDisposable> {
  // lock_timeout as a server-wide default (rather than `SET` per connection)
  // covers every connection uniformly, including ones this file doesn't
  // control directly (e.g. the testcontainers library's own internal psql
  // calls for snapshot()) — fail fast on any lock wait instead of hanging.
  const container = await timed("start container", () =>
    new PostgreSqlContainer("postgres:18-alpine")
      .withCommand(["postgres", "-c", "lock_timeout=10000"])
      .start(),
  );
  const connectionString = container.getConnectionUri();

  await timed("migrate", async () => {
    const migrationClient = new Client({ connectionString });
    await migrationClient.connect();
    try {
      await migrate(drizzle({ client: migrationClient }), { migrationsFolder: "./drizzle" });
    } finally {
      await migrationClient.end();
    }
  });

  // Snapshot the migrated database as a template (CREATE DATABASE ...
  // TEMPLATE ..., a fast file-level copy) so each test file can clone its
  // own database from it instead of every file sharing one — see
  // test/helpers/fixtures.ts. Requires no other connections to the source
  // database, which is why this runs after `migrationClient` disconnects.
  await timed("snapshot template", () => container.snapshot(TEMPLATE_DATABASE));

  provide("postgresConnectionString", connectionString);
  console.log(`Started Postgres testcontainer at ${connectionString}`);

  return {
    async [Symbol.asyncDispose]() {
      await container.stop();
      console.log("Stopped Postgres testcontainer");
    },
  };
}

// Global setup runs inside Node.js, not `workerd`
export default async function (project: TestProject) {
  const stack = new AsyncDisposableStack();
  stack.use(await setupTestPostgres(project));

  return async () => {
    await stack.disposeAsync();
  };
}
