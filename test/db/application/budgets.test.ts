import { eq } from "drizzle-orm";
import { describe, expect } from "vitest";
import { budgetMaterial } from "#/db/schema";
import { createBudget, deleteBudget, updateBudget } from "#/server/application/budgets";
import { it } from "../../helpers/fixtures.ts";
import { seedBudget, seedMaterial, seedOrganization } from "../../helpers/seed.ts";

describe("createBudget", () => {
  it("slugifies the name and inserts materials/operations", async ({ db }) => {
    const org = await seedOrganization(db);
    const mat = await seedMaterial(db, org.id);

    const budget = await db.transaction((tx) =>
      createBudget(tx, org.id, {
        name: "Vestido de Gala",
        hourlyRate: "20.00",
        materials: [{ materialId: mat.id, quantity: "2" }],
        operations: [],
      }),
    );

    expect(budget.slug).toBe("vestido-de-gala");
    const mats = await db
      .select()
      .from(budgetMaterial)
      .where(eq(budgetMaterial.budgetId, budget.id));
    expect(mats).toHaveLength(1);
  });

  it("dedupes the slug when another budget already has it", async ({ db }) => {
    const org = await seedOrganization(db);
    await seedBudget(db, org.id, { slug: "vestido" });

    const budget = await db.transaction((tx) =>
      createBudget(tx, org.id, {
        name: "Vestido",
        hourlyRate: "20.00",
        materials: [],
        operations: [],
      }),
    );

    expect(budget.slug).not.toBe("vestido");
    expect(budget.slug.startsWith("vestido_")).toBe(true);
  });
});

describe("updateBudget", () => {
  it("replaces materials on update", async ({ db }) => {
    const org = await seedOrganization(db);
    const matA = await seedMaterial(db, org.id);
    const matB = await seedMaterial(db, org.id);
    const budget = await db.transaction((tx) =>
      createBudget(tx, org.id, {
        name: "Vestido",
        hourlyRate: "20.00",
        materials: [{ materialId: matA.id, quantity: "1" }],
        operations: [],
      }),
    );

    await db.transaction((tx) =>
      updateBudget(tx, org.id, budget.id, {
        name: "Vestido",
        hourlyRate: "20.00",
        materials: [{ materialId: matB.id, quantity: "3" }],
        operations: [],
      }),
    );

    const mats = await db
      .select()
      .from(budgetMaterial)
      .where(eq(budgetMaterial.budgetId, budget.id));
    expect(mats).toHaveLength(1);
    expect(mats[0].materialId).toBe(matB.id);
  });

  it("keeps its own slug when the name doesn't change", async ({ db }) => {
    const org = await seedOrganization(db);
    const budget = await db.transaction((tx) =>
      createBudget(tx, org.id, {
        name: "Vestido",
        hourlyRate: "20.00",
        materials: [],
        operations: [],
      }),
    );

    const { updated } = await db.transaction((tx) =>
      updateBudget(tx, org.id, budget.id, {
        name: "Vestido",
        hourlyRate: "25.00",
        materials: [],
        operations: [],
      }),
    );

    expect(updated.slug).toBe(budget.slug);
    expect(updated.hourlyRate).toBe("25.00");
  });

  it("rejects when the budget doesn't belong to the organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const budget = await seedBudget(db, otherOrg.id);

    await expect(
      db.transaction((tx) =>
        updateBudget(tx, org.id, budget.id, {
          name: "x",
          hourlyRate: "1.00",
          materials: [],
          operations: [],
        }),
      ),
    ).rejects.toThrow(/Presupuesto no encontrado/);
  });
});

describe("deleteBudget", () => {
  it("rejects when the budget doesn't belong to the organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const budget = await seedBudget(db, otherOrg.id);

    await expect(deleteBudget(db, org.id, budget.id)).rejects.toThrow(/Presupuesto no encontrado/);
  });
});
