import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import type { Db } from "#/db/client";
import { budgetMaterial, material, quotationMaterial } from "#/db/schema";
import { createQuotation } from "#/server/application/quotations";
import { createTestDb } from "../../helpers/create-test-db.ts";
import { resetDb } from "../../helpers/reset-db.ts";
import { seedBudget, seedClient, seedMaterial, seedOrganization } from "../../helpers/seed.ts";

let db: Db;

beforeAll(async () => {
  db = await createTestDb(inject("postgresConnectionString"));
});

afterEach(async () => {
  await resetDb(db);
});

describe("createQuotation", () => {
  it("creates a line per budget and freezes the client name and material price", async () => {
    const org = await seedOrganization(db);
    const client = await seedClient(db, org.id, { name: "Ana Pérez" });
    const budget = await seedBudget(db, org.id);
    const mat = await seedMaterial(db, org.id, { currentPrice: "15.00" });
    await db
      .insert(budgetMaterial)
      .values({ budgetId: budget.id, materialId: mat.id, quantity: "2" });

    const quotation = await db.transaction((tx) =>
      createQuotation(tx, org.id, { clientId: client.id, budgetIds: [budget.id] }),
    );

    expect(quotation.clientTitle).toBe("Ana Pérez");
    expect(quotation.slug).toMatch(/^COT\d{4}-\d{2}-\d{4}$/);

    const frozenMaterials = await db.select().from(quotationMaterial);
    expect(frozenMaterials).toHaveLength(1);
    expect(frozenMaterials[0].frozenPrice).toBe("15.00");
    expect(frozenMaterials[0].frozenName).toBe(mat.name);
  });

  it("keeps frozen prices unchanged if the budget's material price changes afterward", async () => {
    const org = await seedOrganization(db);
    const client = await seedClient(db, org.id);
    const budget = await seedBudget(db, org.id);
    const mat = await seedMaterial(db, org.id, { currentPrice: "15.00" });
    await db
      .insert(budgetMaterial)
      .values({ budgetId: budget.id, materialId: mat.id, quantity: "1" });

    await db.transaction((tx) =>
      createQuotation(tx, org.id, { clientId: client.id, budgetIds: [budget.id] }),
    );

    await db.update(material).set({ currentPrice: "999.00" }).where(eq(material.id, mat.id));

    const [frozen] = await db.select().from(quotationMaterial);
    expect(frozen.frozenPrice).toBe("15.00");
  });

  it("rejects when a budget references a material outside the organization's catalog", async () => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const client = await seedClient(db, org.id);
    const budget = await seedBudget(db, org.id);
    // The material catalog lookup in createQuotation is scoped to the
    // quotation's organization, so a material belonging to another org is
    // treated the same as one that's gone from the catalog.
    const otherOrgMat = await seedMaterial(db, otherOrg.id);
    await db
      .insert(budgetMaterial)
      .values({ budgetId: budget.id, materialId: otherOrgMat.id, quantity: "1" });

    await expect(
      db.transaction((tx) =>
        createQuotation(tx, org.id, { clientId: client.id, budgetIds: [budget.id] }),
      ),
    ).rejects.toThrow(/material que ya no existe/);
  });

  it("rejects when the budget doesn't belong to the organization", async () => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const client = await seedClient(db, org.id);
    const budget = await seedBudget(db, otherOrg.id);

    await expect(
      db.transaction((tx) =>
        createQuotation(tx, org.id, { clientId: client.id, budgetIds: [budget.id] }),
      ),
    ).rejects.toThrow(/Presupuesto no encontrado/);
  });
});
