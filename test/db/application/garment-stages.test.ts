import { asc, eq } from "drizzle-orm";
import { describe, expect } from "vitest";
import { garmentStage } from "#/db/schema";
import {
  createGarmentStage,
  deleteGarmentStage,
  reorderGarmentStages,
  seedDefaultGarmentStages,
  updateGarmentStage,
} from "#/server/application/garment-stages";
import { test } from "../../helpers/fixtures.ts";
import { seedGarmentStage, seedOrganization } from "../../helpers/seed.ts";

describe("createGarmentStage", () => {
  test("appends new stages at the end of the position order", async ({ db }) => {
    const org = await seedOrganization(db);

    const first = await db.transaction((tx) => createGarmentStage(tx, org.id, { name: "Corte" }));
    const second = await db.transaction((tx) =>
      createGarmentStage(tx, org.id, { name: "Costura" }),
    );

    expect(first.position).toBe(0);
    expect(second.position).toBe(1);
  });
});

describe("updateGarmentStage", () => {
  test("updates the stage's fields", async ({ db }) => {
    const org = await seedOrganization(db);
    const stage = await seedGarmentStage(db, org.id, { name: "Corte" });

    const updated = await db.transaction((tx) =>
      updateGarmentStage(tx, org.id, {
        id: stage.id,
        name: "Corte y confección",
        isFinalStage: true,
      }),
    );

    expect(updated.name).toBe("Corte y confección");
    expect(updated.isFinalStage).toBe(true);
  });

  test("rejects when the stage doesn't belong to the organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const stage = await seedGarmentStage(db, otherOrg.id);

    await expect(
      db.transaction((tx) => updateGarmentStage(tx, org.id, { id: stage.id, name: "x" })),
    ).rejects.toThrow(/Etapa no encontrada/);
  });
});

describe("deleteGarmentStage", () => {
  test("deletes the stage", async ({ db }) => {
    const org = await seedOrganization(db);
    const stage = await seedGarmentStage(db, org.id);

    await deleteGarmentStage(db, org.id, stage.id);

    const remaining = await db.select().from(garmentStage).where(eq(garmentStage.id, stage.id));
    expect(remaining).toHaveLength(0);
  });

  test("rejects when the stage doesn't belong to the organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const stage = await seedGarmentStage(db, otherOrg.id);

    await expect(deleteGarmentStage(db, org.id, stage.id)).rejects.toThrow(/Etapa no encontrada/);
  });
});

describe("reorderGarmentStages", () => {
  test("applies the given order as positions", async ({ db }) => {
    const org = await seedOrganization(db);
    const a = await seedGarmentStage(db, org.id, { name: "A", position: 0 });
    const b = await seedGarmentStage(db, org.id, { name: "B", position: 1 });

    await db.transaction((tx) => reorderGarmentStages(tx, org.id, [b.id, a.id]));

    const stages = await db
      .select()
      .from(garmentStage)
      .where(eq(garmentStage.organizationId, org.id))
      .orderBy(asc(garmentStage.position));

    expect(stages.map((s) => s.id)).toEqual([b.id, a.id]);
  });

  test("rejects when a stage id doesn't belong to the organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const a = await seedGarmentStage(db, org.id);
    const foreign = await seedGarmentStage(db, otherOrg.id);

    await expect(
      db.transaction((tx) => reorderGarmentStages(tx, org.id, [a.id, foreign.id])),
    ).rejects.toThrow(/no pertenece a esta organización/);
  });
});

describe("seedDefaultGarmentStages", () => {
  test("inserts the default stages when the organization has none", async ({ db }) => {
    const org = await seedOrganization(db);

    await db.transaction((tx) => seedDefaultGarmentStages(tx, org.id));

    const stages = await db
      .select()
      .from(garmentStage)
      .where(eq(garmentStage.organizationId, org.id));
    expect(stages.length).toBeGreaterThan(0);
    expect(stages.every((s) => s.isSystemDefault)).toBe(true);
  });

  test("is a no-op when the organization already has stages", async ({ db }) => {
    const org = await seedOrganization(db);
    await seedGarmentStage(db, org.id, { name: "Custom" });

    await db.transaction((tx) => seedDefaultGarmentStages(tx, org.id));

    const stages = await db
      .select()
      .from(garmentStage)
      .where(eq(garmentStage.organizationId, org.id));
    expect(stages).toHaveLength(1);
    expect(stages[0].name).toBe("Custom");
  });
});
