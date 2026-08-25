import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import type { Db } from "#/db/client";
import { relations } from "#/db/relations";
import { materialInventoryMovement } from "#/db/schema";
import {
  getCurrentStock,
  getMaterialInventory,
  registerMovement,
} from "#/server/application/inventory";
import { createTestDb } from "../../helpers/create-test-db.ts";
import { resetDb } from "../../helpers/reset-db.ts";
import { seedMaterial, seedOrganization, seedUser } from "../../helpers/seed.ts";

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

describe("getMaterialInventory", () => {
  it("returns current stock and recent movements for the material", async () => {
    const org = await seedOrganization(db);
    const mat = await seedMaterial(db, org.id);
    const user = await seedUser(db);
    await db.insert(materialInventoryMovement).values({
      materialId: mat.id,
      organizationId: org.id,
      type: "entry",
      delta: "4.0000",
      createdById: user.id,
    });

    const result = await getMaterialInventory(db, org.id, mat.id);

    expect(result.currentStock).toBe("4.0000");
    expect(result.movements).toHaveLength(1);
    expect(result.movements[0].createdByName).toBe(user.name);
  });

  it("rejects when the material doesn't belong to the organization", async () => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const mat = await seedMaterial(db, otherOrg.id);

    await expect(getMaterialInventory(db, org.id, mat.id)).rejects.toThrow(
      /Material no encontrado/,
    );
  });
});

describe("registerMovement", () => {
  it("records an entry as a positive delta", async () => {
    const org = await seedOrganization(db);
    const mat = await seedMaterial(db, org.id);
    const user = await seedUser(db);

    const movement = await db.transaction((tx) =>
      registerMovement(tx, org.id, user.id, {
        materialId: mat.id,
        type: "entry",
        quantity: "5.0000",
      }),
    );

    expect(movement.delta).toBe("5.0000");
    expect(await getCurrentStock(db, mat.id, org.id)).toBe("5.0000");
  });

  it("records an exit as a negative delta", async () => {
    const org = await seedOrganization(db);
    const mat = await seedMaterial(db, org.id);
    const user = await seedUser(db);
    await db.transaction((tx) =>
      registerMovement(tx, org.id, user.id, {
        materialId: mat.id,
        type: "entry",
        quantity: "10.0000",
      }),
    );

    await db.transaction((tx) =>
      registerMovement(tx, org.id, user.id, {
        materialId: mat.id,
        type: "exit",
        quantity: "3.0000",
      }),
    );

    expect(await getCurrentStock(db, mat.id, org.id)).toBe("7.0000");
  });

  it("computes an adjustment as the delta needed to reach the target quantity", async () => {
    const org = await seedOrganization(db);
    const mat = await seedMaterial(db, org.id);
    const user = await seedUser(db);
    await db.transaction((tx) =>
      registerMovement(tx, org.id, user.id, {
        materialId: mat.id,
        type: "entry",
        quantity: "10.0000",
      }),
    );

    await db.transaction((tx) =>
      registerMovement(tx, org.id, user.id, {
        materialId: mat.id,
        type: "adjustment",
        quantity: "6.0000",
      }),
    );

    expect(await getCurrentStock(db, mat.id, org.id)).toBe("6.0000");
  });

  it("rejects when the material doesn't belong to the organization", async () => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const mat = await seedMaterial(db, otherOrg.id);
    const user = await seedUser(db);

    await expect(
      db.transaction((tx) =>
        registerMovement(tx, org.id, user.id, {
          materialId: mat.id,
          type: "entry",
          quantity: "1.0000",
        }),
      ),
    ).rejects.toThrow(/Material no encontrado/);
  });

  it("serializes concurrent adjustments via the advisory lock", async () => {
    const org = await seedOrganization(db);
    const mat = await seedMaterial(db, org.id);
    const user = await seedUser(db);
    await db.transaction((tx) =>
      registerMovement(tx, org.id, user.id, {
        materialId: mat.id,
        type: "entry",
        quantity: "10.0000",
      }),
    );

    const connectionString = inject("postgresConnectionString");
    const clientA = new Client({ connectionString });
    const clientB = new Client({ connectionString });
    await Promise.all([clientA.connect(), clientB.connect()]);
    const dbA = drizzle({ client: clientA, relations });
    const dbB = drizzle({ client: clientB, relations });

    try {
      // Two concurrent "set to 20" adjustments starting from the same base
      // (10) would race without the advisory lock: both could read 10 before
      // either writes, producing deltas that sum to more than the intended
      // single adjustment to 20.
      await Promise.all([
        dbA.transaction((tx) =>
          registerMovement(tx, org.id, user.id, {
            materialId: mat.id,
            type: "adjustment",
            quantity: "20.0000",
          }),
        ),
        dbB.transaction((tx) =>
          registerMovement(tx, org.id, user.id, {
            materialId: mat.id,
            type: "adjustment",
            quantity: "20.0000",
          }),
        ),
      ]);

      expect(await getCurrentStock(db, mat.id, org.id)).toBe("20.0000");
    } finally {
      await Promise.all([clientA.end(), clientB.end()]);
    }
  });
});
