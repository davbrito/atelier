import { eq } from "drizzle-orm";
import { describe, expect } from "vitest";
import { clientMeasurement } from "#/db/schema";
import { createClient, deleteClient, updateClient } from "#/server/application/clients";
import { test } from "../../helpers/fixtures.ts";
import { seedClient, seedOrganization } from "../../helpers/seed.ts";

describe("createClient", () => {
  test("creates the client with its measurements", async ({ db }) => {
    const org = await seedOrganization(db);

    const client = await db.transaction((tx) =>
      createClient(tx, org.id, {
        name: "Ana Pérez",
        measurements: [{ name: "Cintura", value: 70 }],
      }),
    );

    expect(client.name).toBe("Ana Pérez");
    const measurements = await db
      .select()
      .from(clientMeasurement)
      .where(eq(clientMeasurement.clientId, client.id));
    expect(measurements).toHaveLength(1);
    expect(measurements[0].name).toBe("Cintura");
  });
});

describe("updateClient", () => {
  test("replaces the client's measurements", async ({ db }) => {
    const org = await seedOrganization(db);
    const client = await db.transaction((tx) =>
      createClient(tx, org.id, {
        name: "Ana",
        measurements: [{ name: "Cintura", value: 70 }],
      }),
    );

    const updated = await db.transaction((tx) =>
      updateClient(tx, org.id, client.id, {
        name: "Ana Pérez",
        measurements: [{ name: "Cadera", value: 90 }],
      }),
    );

    expect(updated.name).toBe("Ana Pérez");
    const measurements = await db
      .select()
      .from(clientMeasurement)
      .where(eq(clientMeasurement.clientId, client.id));
    expect(measurements).toHaveLength(1);
    expect(measurements[0].name).toBe("Cadera");
  });

  test("rejects when the client doesn't belong to the organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const client = await seedClient(db, otherOrg.id);

    await expect(
      db.transaction((tx) => updateClient(tx, org.id, client.id, { name: "x", measurements: [] })),
    ).rejects.toThrow(/Cliente no encontrado/);
  });
});

describe("deleteClient", () => {
  test("rejects when the client doesn't belong to the organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const client = await seedClient(db, otherOrg.id);

    await expect(deleteClient(db, org.id, client.id)).rejects.toThrow(/Cliente no encontrado/);
  });
});
