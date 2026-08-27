import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import type { TestProject } from "vitest/node";
import { TEMPLATE_DATABASE } from "./helpers/db-template.ts";

declare module "vitest" {
  interface ProvidedContext {
    postgresConnectionString: string;
  }
}

async function setupTestPostgres({ provide }: TestProject): Promise<AsyncDisposable> {
  const container = await new PostgreSqlContainer("postgres:18-alpine").start();
  const connectionString = container.getConnectionUri();

  const migrationClient = new Client({ connectionString });
  await migrationClient.connect();
  try {
    await migrate(drizzle({ client: migrationClient }), { migrationsFolder: "./drizzle" });
  } finally {
    await migrationClient.end();
  }

  // Snapshot the migrated database as a template (CREATE DATABASE ...
  // TEMPLATE ..., a fast file-level copy) so each test file can clone its
  // own database from it instead of every file sharing one — see
  // test/helpers/fixtures.ts. Requires no other connections to the source
  // database, which is why this runs after `migrationClient` disconnects.
  await container.snapshot(TEMPLATE_DATABASE);

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
