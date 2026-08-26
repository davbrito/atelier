import { eq } from "drizzle-orm";
import { describe, expect } from "vitest";
import { codeCounter, garment, order, orderPayment, quotationLine } from "#/db/schema";
import { createOrder, getOrderPaidAmount } from "#/server/application/orders";
import { test } from "../../helpers/fixtures.ts";
import {
  seedBudget,
  seedClient,
  seedOrder,
  seedOrganization,
  seedQuotation,
} from "../../helpers/seed.ts";

describe("createOrder", () => {
  test("creates the order and one garment per requested item, with a generated code", async ({
    db,
  }) => {
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

  test("rejects when the client doesn't belong to the organization", async ({ db }) => {
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

  test("rolls back the whole transaction — including the code counter bump — when a garment references an unknown budget", async ({
    db,
  }) => {
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

  test("links the garment to a valid quotation line and ignores one from another quotation", async ({
    db,
  }) => {
    const org = await seedOrganization(db);
    const client = await seedClient(db, org.id);
    const budget = await seedBudget(db, org.id);
    const quotation = await seedQuotation(db, org.id, client.id);
    const otherQuotation = await seedQuotation(db, org.id, client.id);

    const [line] = await db
      .insert(quotationLine)
      .values({ quotationId: quotation.id, budgetId: budget.id })
      .returning();
    const [otherLine] = await db
      .insert(quotationLine)
      .values({ quotationId: otherQuotation.id, budgetId: budget.id })
      .returning();

    const newOrder = await db.transaction((tx) =>
      createOrder(tx, org.id, {
        clientId: client.id,
        quotationId: quotation.id,
        priority: "medium",
        garments: [
          { budgetId: budget.id, quotationLineId: line.id, quantity: 1, unitPrice: "10.00" },
          { budgetId: budget.id, quotationLineId: otherLine.id, quantity: 1, unitPrice: "10.00" },
        ],
      }),
    );

    const garments = await db
      .select()
      .from(garment)
      .where(eq(garment.orderId, newOrder.id))
      .orderBy(garment.quotationLineId);

    expect(garments.find((g) => g.quotationLineId === line.id)).toBeDefined();
    expect(garments.some((g) => g.quotationLineId === otherLine.id)).toBe(false);
    expect(garments.some((g) => g.quotationLineId === null)).toBe(true);
  });

  test("rejects when the given quotation doesn't belong to the organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const client = await seedClient(db, org.id);
    const budget = await seedBudget(db, org.id);
    const otherOrgClient = await seedClient(db, otherOrg.id);
    const quotation = await seedQuotation(db, otherOrg.id, otherOrgClient.id);

    await expect(
      db.transaction((tx) =>
        createOrder(tx, org.id, {
          clientId: client.id,
          quotationId: quotation.id,
          priority: "medium",
          garments: [{ budgetId: budget.id, quantity: 1, unitPrice: "10.00" }],
        }),
      ),
    ).rejects.toThrow(/Cotización no encontrada/);
  });
});

describe("getOrderPaidAmount", () => {
  test("returns 0 when the order has no payments", async ({ db }) => {
    const org = await seedOrganization(db);
    const newOrder = await seedOrder(db, org.id, { totalAmount: "100.00" });

    expect(await getOrderPaidAmount(db, newOrder.id)).toBe(0);
  });

  test("sums all payments for the order", async ({ db }) => {
    const org = await seedOrganization(db);
    const newOrder = await seedOrder(db, org.id, { totalAmount: "100.00" });

    await db.insert(orderPayment).values([
      { organizationId: org.id, orderId: newOrder.id, method: "efectivo", amount: "30.00" },
      { organizationId: org.id, orderId: newOrder.id, method: "zelle", amount: "20.50" },
    ]);

    expect(await getOrderPaidAmount(db, newOrder.id)).toBe(50.5);
  });
});
