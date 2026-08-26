import { eq } from "drizzle-orm";
import { describe, expect } from "vitest";
import { materialPriceHistory } from "#/db/schema";
import { createMaterial, deleteMaterial, updateMaterial } from "#/server/application/materials";
import { it } from "../../helpers/fixtures.ts";
import { seedMaterial, seedOrganization } from "../../helpers/seed.ts";

describe("createMaterial", () => {
  it("seeds the price history with the initial price", async ({ db }) => {
    const org = await seedOrganization(db);

    const created = await db.transaction((tx) =>
      createMaterial(tx, org.id, { name: "Algodón", unit: "m", currentPrice: "12.50" }),
    );

    const history = await db
      .select()
      .from(materialPriceHistory)
      .where(eq(materialPriceHistory.materialId, created.id));
    expect(history).toHaveLength(1);
    expect(history[0].price).toBe("12.50");
  });
});

describe("updateMaterial", () => {
  it("records a new price-history row only when the price actually changes", async ({ db }) => {
    const org = await seedOrganization(db);
    const mat = await seedMaterial(db, org.id, { currentPrice: "10.00" });

    await db.transaction((tx) =>
      updateMaterial(tx, org.id, mat.id, { name: mat.name, unit: mat.unit, currentPrice: "10.00" }),
    );
    await db.transaction((tx) =>
      updateMaterial(tx, org.id, mat.id, { name: mat.name, unit: mat.unit, currentPrice: "15.00" }),
    );

    const history = await db
      .select()
      .from(materialPriceHistory)
      .where(eq(materialPriceHistory.materialId, mat.id));
    expect(history).toHaveLength(1);
    expect(history[0].price).toBe("15.00");
  });

  it("rejects when the material doesn't belong to the organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const mat = await seedMaterial(db, otherOrg.id);

    await expect(
      db.transaction((tx) =>
        updateMaterial(tx, org.id, mat.id, { name: "x", unit: "m", currentPrice: "1.00" }),
      ),
    ).rejects.toThrow(/Material no encontrado/);
  });
});

describe("deleteMaterial", () => {
  it("rejects when the material doesn't belong to the organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const mat = await seedMaterial(db, otherOrg.id);

    await expect(deleteMaterial(db, org.id, mat.id)).rejects.toThrow(/Material no encontrado/);
  });
});
