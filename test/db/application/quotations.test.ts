import { eq } from "drizzle-orm";
import { describe, expect } from "vitest";
import {
  budgetMaterial,
  budgetOperation,
  material,
  quotationMaterial,
  quotationOperation,
} from "#/db/schema";
import { createQuotation, loadQuotationLines } from "#/server/application/quotations";
import { test } from "../../helpers/db-fixture.ts";
import {
  seedBudget,
  seedClient,
  seedMaterial,
  seedOperation,
  seedOrganization,
} from "../../helpers/seed.ts";

describe("createQuotation", () => {
  test("creates a line per budget and freezes the client name and material price", async ({
    db,
  }) => {
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

  test("keeps frozen prices unchanged if the budget's material price changes afterward", async ({
    db,
  }) => {
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

  test("rejects when a budget references a material outside the organization's catalog", async ({
    db,
  }) => {
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

  test("rejects when the budget doesn't belong to the organization", async ({ db }) => {
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

  test("freezes operations with their current name and the budget's hourly rate", async ({
    db,
  }) => {
    const org = await seedOrganization(db);
    const client = await seedClient(db, org.id);
    const budget = await seedBudget(db, org.id, { hourlyRate: "25.00" });
    const op = await seedOperation(db, org.id, { name: "Bordado" });
    await db
      .insert(budgetOperation)
      .values({ budgetId: budget.id, operationId: op.id, durationMinutes: 90 });

    await db.transaction((tx) =>
      createQuotation(tx, org.id, { clientId: client.id, budgetIds: [budget.id] }),
    );

    const [frozen] = await db.select().from(quotationOperation);
    expect(frozen.frozenName).toBe("Bordado");
    expect(frozen.frozenHourlyRate).toBe("25.00");
    expect(frozen.durationMinutes).toBe(90);
  });

  test("rejects when a budget references an operation outside the organization's catalog", async ({
    db,
  }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const client = await seedClient(db, org.id);
    const budget = await seedBudget(db, org.id);
    const otherOrgOp = await seedOperation(db, otherOrg.id);
    await db
      .insert(budgetOperation)
      .values({ budgetId: budget.id, operationId: otherOrgOp.id, durationMinutes: 30 });

    await expect(
      db.transaction((tx) =>
        createQuotation(tx, org.id, { clientId: client.id, budgetIds: [budget.id] }),
      ),
    ).rejects.toThrow(/operación que ya no existe/);
  });
});

describe("loadQuotationLines", () => {
  test("returns each line with its budget info, frozen materials, and frozen operations", async ({
    db,
  }) => {
    const org = await seedOrganization(db);
    const client = await seedClient(db, org.id);
    const budget = await seedBudget(db, org.id, { name: "Traje", hourlyRate: "10.00" });
    const mat = await seedMaterial(db, org.id, { currentPrice: "5.00" });
    const op = await seedOperation(db, org.id);
    await db
      .insert(budgetMaterial)
      .values({ budgetId: budget.id, materialId: mat.id, quantity: "3" });
    await db
      .insert(budgetOperation)
      .values({ budgetId: budget.id, operationId: op.id, durationMinutes: 120 });

    const quotation = await db.transaction((tx) =>
      createQuotation(tx, org.id, { clientId: client.id, budgetIds: [budget.id] }),
    );

    const lines = await loadQuotationLines(db, quotation.id);

    expect(lines).toHaveLength(1);
    expect(lines[0].budgetName).toBe("Traje");
    expect(lines[0].materials).toHaveLength(1);
    expect(Number(lines[0].materials[0].amount)).toBe(15);
    expect(lines[0].operations).toHaveLength(1);
    expect(Number(lines[0].operations[0].amount)).toBe(20);
  });

  test("returns an empty array for a quotation with no lines", async ({ db }) => {
    expect(await loadQuotationLines(db, "00000000-0000-0000-0000-000000000000")).toEqual([]);
  });
});
