import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { describe, expect } from "vitest";
import { relations } from "#/db/relations";
import { createOrderPayment } from "#/server/application/order-payments";
import { it } from "../../helpers/fixtures.ts";
import { seedOrder, seedOrganization } from "../../helpers/seed.ts";

describe("createOrderPayment", () => {
  it("inserts a payment within the order's balance", async ({ db }) => {
    const org = await seedOrganization(db);
    const order = await seedOrder(db, org.id, { totalAmount: "100.00" });

    const payment = await db.transaction((tx) =>
      createOrderPayment(tx, org.id, {
        orderId: order.id,
        method: "efectivo",
        amount: "40.00",
      }),
    );

    expect(payment.amount).toBe("40.00");
    expect(payment.orderId).toBe(order.id);
  });

  it("rejects a payment that exceeds the remaining balance", async ({ db }) => {
    const org = await seedOrganization(db);
    const order = await seedOrder(db, org.id, { totalAmount: "100.00" });

    await db.transaction((tx) =>
      createOrderPayment(tx, org.id, { orderId: order.id, method: "efectivo", amount: "80.00" }),
    );

    await expect(
      db.transaction((tx) =>
        createOrderPayment(tx, org.id, { orderId: order.id, method: "efectivo", amount: "30.00" }),
      ),
    ).rejects.toThrow(/excede el saldo pendiente/);
  });

  it("rejects a payment for an order in a different organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const order = await seedOrder(db, org.id, { totalAmount: "100.00" });

    await expect(
      db.transaction((tx) =>
        createOrderPayment(tx, otherOrg.id, {
          orderId: order.id,
          method: "efectivo",
          amount: "10.00",
        }),
      ),
    ).rejects.toThrow(/Pedido no encontrado/);
  });

  it("serializes concurrent payments so they can't jointly overpay the order", async ({
    db,
    databaseUrl,
  }) => {
    const org = await seedOrganization(db);
    const order = await seedOrder(db, org.id, { totalAmount: "100.00" });

    // A single pg.Client can't run two transactions at once, so real
    // concurrency needs two independent connections to the same database.
    const connectionString = databaseUrl;
    const clientA = new Client({ connectionString });
    const clientB = new Client({ connectionString });
    await Promise.all([clientA.connect(), clientB.connect()]);
    const dbA = drizzle({ client: clientA, relations });
    const dbB = drizzle({ client: clientB, relations });

    try {
      // Two payments of 60 each would jointly overpay a 100 order; the row
      // lock in createOrderPayment must serialize these so only one succeeds.
      const results = await Promise.allSettled([
        dbA.transaction((tx) =>
          createOrderPayment(tx, org.id, {
            orderId: order.id,
            method: "efectivo",
            amount: "60.00",
          }),
        ),
        dbB.transaction((tx) =>
          createOrderPayment(tx, org.id, {
            orderId: order.id,
            method: "efectivo",
            amount: "60.00",
          }),
        ),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      if (rejected[0]?.status === "rejected") {
        expect(rejected[0].reason).toMatchObject({
          message: expect.stringMatching(/no se puede pagar de más/i),
        });
      }
    } finally {
      await Promise.all([clientA.end(), clientB.end()]);
    }
  });
});
