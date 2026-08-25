import { afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import type { Db } from "#/db/client";
import { getDashboardCounts } from "#/server/application/dashboard";
import { createTestDb } from "../../helpers/create-test-db.ts";
import { resetDb } from "../../helpers/reset-db.ts";
import {
  seedBudget,
  seedClient,
  seedMaterial,
  seedOperation,
  seedOrganization,
} from "../../helpers/seed.ts";

let db: Db;

beforeAll(async () => {
  db = await createTestDb(inject("postgresConnectionString"));
});

afterEach(async () => {
  await resetDb(db);
});

describe("getDashboardCounts", () => {
  it("counts each entity type scoped to the organization", async () => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);

    await seedBudget(db, org.id);
    await seedBudget(db, org.id);
    await seedMaterial(db, org.id);
    await seedOperation(db, org.id);
    await seedClient(db, org.id);
    // Noise in another organization must not be counted.
    await seedBudget(db, otherOrg.id);

    const counts = await getDashboardCounts(db, org.id);

    expect(counts).toEqual({
      budgets: 2,
      materials: 1,
      operations: 1,
      quotations: 0,
      clients: 1,
    });
  });
});
