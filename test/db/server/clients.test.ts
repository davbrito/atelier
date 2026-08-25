import { eq } from "drizzle-orm";
import { afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import type { Db } from "#/db/client";
import { clientMeasurement } from "#/db/schema";
import { createClient, deleteClient, updateClient } from "#/server/application/clients";
import { createTestDb } from "../../helpers/create-test-db.ts";
import { resetDb } from "../../helpers/reset-db.ts";
import { seedClient, seedOrganization } from "../../helpers/seed.ts";

let db: Db;

beforeAll(async () => {
  db = await createTestDb(inject("postgresConnectionString"));
});

afterEach(async () => {
  await resetDb(db);
});

describe("createClient", () => {
  it("creates the client with its measurements", async () => {
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
  it("replaces the client's measurements", async () => {
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

  it("rejects when the client doesn't belong to the organization", async () => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const client = await seedClient(db, otherOrg.id);

    await expect(
      db.transaction((tx) => updateClient(tx, org.id, client.id, { name: "x", measurements: [] })),
    ).rejects.toThrow(/Cliente no encontrado/);
  });
});

describe("deleteClient", () => {
  it("rejects when the client doesn't belong to the organization", async () => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const client = await seedClient(db, otherOrg.id);

    await expect(deleteClient(db, org.id, client.id)).rejects.toThrow(/Cliente no encontrado/);
  });
});
