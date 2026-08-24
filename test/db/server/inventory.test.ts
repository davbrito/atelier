import { afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import type { Db } from "#/db/client";
import { materialInventoryMovement } from "#/db/schema";
import { getCurrentStock } from "#/lib/server/inventory-stock";
import { createTestDb } from "../../helpers/create-test-db.ts";
import { resetDb } from "../../helpers/reset-db.ts";
import { seedMaterial, seedOrganization } from "../../helpers/seed.ts";

let db: Db;

beforeAll(async () => {
  db = await createTestDb(inject("postgresConnectionString"));
});

afterEach(async () => {
  await resetDb(db);
});

describe("getCurrentStock", () => {
  it("returns 0 when there are no movements", async () => {
    const org = await seedOrganization(db);
    const mat = await seedMaterial(db, org.id);

    expect(await getCurrentStock(db, mat.id, org.id)).toBe("0");
  });

  it("sums entries and subtracts exits", async () => {
    const org = await seedOrganization(db);
    const mat = await seedMaterial(db, org.id);

    await db.insert(materialInventoryMovement).values([
      { materialId: mat.id, organizationId: org.id, type: "entry", delta: "10.0000" },
      { materialId: mat.id, organizationId: org.id, type: "exit", delta: "-3.5000" },
      { materialId: mat.id, organizationId: org.id, type: "entry", delta: "2.0000" },
    ]);

    expect(await getCurrentStock(db, mat.id, org.id)).toBe("8.5000");
  });

  it("only counts movements for the given material and organization", async () => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const mat = await seedMaterial(db, org.id);
    const otherMat = await seedMaterial(db, org.id);
    const otherOrgMat = await seedMaterial(db, otherOrg.id);

    await db.insert(materialInventoryMovement).values([
      { materialId: mat.id, organizationId: org.id, type: "entry", delta: "5.0000" },
      { materialId: otherMat.id, organizationId: org.id, type: "entry", delta: "99.0000" },
      { materialId: otherOrgMat.id, organizationId: otherOrg.id, type: "entry", delta: "99.0000" },
    ]);

    expect(await getCurrentStock(db, mat.id, org.id)).toBe("5.0000");
  });
});
