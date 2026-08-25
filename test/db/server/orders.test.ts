import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import type { Db } from "#/db/client";
import { codeCounter, garment, order } from "#/db/schema";
import { createOrder } from "#/server/application/orders";
import { createTestDb } from "../../helpers/create-test-db.ts";
import { resetDb } from "../../helpers/reset-db.ts";
import { seedBudget, seedClient, seedOrganization } from "../../helpers/seed.ts";

let db: Db;

beforeAll(async () => {
  db = await createTestDb(inject("postgresConnectionString"));
});

afterEach(async () => {
  await resetDb(db);
});

describe("createOrder", () => {
  it("creates the order and one garment per requested item, with a generated code", async () => {
    const org = await seedOrganization(db);
    const client = await seedClient(db, org.id);
    const budget = await seedBudget(db, org.id, { name: "Vestido de gala" });

    const newOrder = await db.transaction((tx) =>
      createOrder(tx, org.id, {
        clientId: client.id,
        priority: "medium",
        garments: [{ budgetId: budget.id, quantity: 2, unitPrice: "50.00" }],
      }),
    );

    expect(newOrder.code).toMatch(/^PED\d{4}-\d{2}-\d{4}$/);
    expect(newOrder.totalAmount).toBe("100.00");

    const garments = await db.select().from(garment).where(eq(garment.orderId, newOrder.id));
    expect(garments).toHaveLength(1);
    expect(garments[0].name).toBe("Vestido de gala");
    expect(garments[0].quantity).toBe(2);
  });

  it("rejects when the client doesn't belong to the organization", async () => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const client = await seedClient(db, otherOrg.id);
    const budget = await seedBudget(db, org.id);

    await expect(
      db.transaction((tx) =>
        createOrder(tx, org.id, {
          clientId: client.id,
          priority: "medium",
          garments: [{ budgetId: budget.id, quantity: 1, unitPrice: "10.00" }],
        }),
      ),
    ).rejects.toThrow(/Cliente no encontrado/);
  });

  it("rolls back the whole transaction — including the code counter bump — when a garment references an unknown budget", async () => {
    const org = await seedOrganization(db);
    const client = await seedClient(db, org.id);

    await expect(
      db.transaction((tx) =>
        createOrder(tx, org.id, {
          clientId: client.id,
          priority: "medium",
          garments: [
            { budgetId: "00000000-0000-0000-0000-000000000000", quantity: 1, unitPrice: "10.00" },
          ],
        }),
      ),
    ).rejects.toThrow(/Presupuesto no encontrado/);

    const orders = await db.select().from(order).where(eq(order.organizationId, org.id));
    expect(orders).toHaveLength(0);

    const counters = await db
      .select()
      .from(codeCounter)
      .where(eq(codeCounter.organizationId, org.id));
    expect(counters).toHaveLength(0);
  });
});
