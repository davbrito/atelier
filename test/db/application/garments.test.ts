import { eq } from "drizzle-orm";
import { describe, expect } from "vitest";
import { garment as garmentTable, order } from "#/db/schema";
import { moveGarmentStage } from "#/server/application/garments";
import { test } from "../../helpers/db-fixture.ts";
import { seedGarment, seedGarmentStage, seedOrder, seedOrganization } from "../../helpers/seed.ts";

describe("moveGarmentStage", () => {
  test("moves the garment to the given stage", async ({ db }) => {
    const org = await seedOrganization(db);
    const stage = await seedGarmentStage(db, org.id);
    const newOrder = await seedOrder(db, org.id, { status: "pending" });
    const garment = await seedGarment(db, newOrder.id);

    await db.transaction((tx) =>
      moveGarmentStage(tx, org.id, { id: garment.id, stageId: stage.id }),
    );

    const [updatedGarment] = await db
      .select()
      .from(garmentTable)
      .where(eq(garmentTable.id, garment.id));
    expect(updatedGarment.stageId).toBe(stage.id);
  });

  test("moves a pending order to in_progress on its first garment move", async ({ db }) => {
    const org = await seedOrganization(db);
    const stage = await seedGarmentStage(db, org.id, { isFinalStage: false });
    const newOrder = await seedOrder(db, org.id, { status: "pending" });
    const garment = await seedGarment(db, newOrder.id);

    await db.transaction((tx) =>
      moveGarmentStage(tx, org.id, { id: garment.id, stageId: stage.id }),
    );

    const [updatedOrder] = await db.select().from(order).where(eq(order.id, newOrder.id));
    expect(updatedOrder.status).toBe("in_progress");
  });

  test("moves an in_progress order to ready once every garment reaches a final stage", async ({
    db,
  }) => {
    const org = await seedOrganization(db);
    const finalStage = await seedGarmentStage(db, org.id, { isFinalStage: true });
    const newOrder = await seedOrder(db, org.id, { status: "in_progress" });
    const garmentA = await seedGarment(db, newOrder.id);
    await seedGarment(db, newOrder.id, { stageId: finalStage.id });

    await db.transaction((tx) =>
      moveGarmentStage(tx, org.id, { id: garmentA.id, stageId: finalStage.id }),
    );

    const [updatedOrder] = await db.select().from(order).where(eq(order.id, newOrder.id));
    expect(updatedOrder.status).toBe("ready");
  });

  test("keeps an in_progress order in_progress while some garment isn't in a final stage", async ({
    db,
  }) => {
    const org = await seedOrganization(db);
    const finalStage = await seedGarmentStage(db, org.id, { isFinalStage: true });
    const nonFinalStage = await seedGarmentStage(db, org.id, { isFinalStage: false });
    const newOrder = await seedOrder(db, org.id, { status: "in_progress" });
    const garmentA = await seedGarment(db, newOrder.id);
    await seedGarment(db, newOrder.id, { stageId: nonFinalStage.id });

    await db.transaction((tx) =>
      moveGarmentStage(tx, org.id, { id: garmentA.id, stageId: finalStage.id }),
    );

    const [updatedOrder] = await db.select().from(order).where(eq(order.id, newOrder.id));
    expect(updatedOrder.status).toBe("in_progress");
  });

  test("rejects when the garment doesn't belong to the organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const newOrder = await seedOrder(db, otherOrg.id);
    const garment = await seedGarment(db, newOrder.id);

    await expect(
      db.transaction((tx) => moveGarmentStage(tx, org.id, { id: garment.id, stageId: null })),
    ).rejects.toThrow(/Prenda no encontrada/);
  });

  test("rejects when the target stage doesn't belong to the organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const foreignStage = await seedGarmentStage(db, otherOrg.id);
    const newOrder = await seedOrder(db, org.id);
    const garment = await seedGarment(db, newOrder.id);

    await expect(
      db.transaction((tx) =>
        moveGarmentStage(tx, org.id, { id: garment.id, stageId: foreignStage.id }),
      ),
    ).rejects.toThrow(/Etapa no encontrada/);
  });
});
