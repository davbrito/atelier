import { describe, expect } from "vitest";
import { getDashboardCounts } from "#/server/application/dashboard";
import { test } from "../../helpers/db-fixture.ts";
import {
  seedBudget,
  seedClient,
  seedMaterial,
  seedOperation,
  seedOrganization,
} from "../../helpers/seed.ts";

describe("getDashboardCounts", () => {
  test("counts each entity type scoped to the organization", async ({ db }) => {
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
