import { eq } from "drizzle-orm";
import { describe, expect } from "vitest";
import { clientMeasurement } from "#/db/schema";
import {
  createClient,
  deleteClient,
  setClientMeasurement,
  updateClient,
} from "#/server/application/clients";
import { it } from "#test/helpers/fixtures.ts";
import { seedClient, seedOrganization } from "#test/helpers/seed.ts";

describe("createClient", () => {
  it("creates the client with its measurements", async ({ db }) => {
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
  it("replaces the client's measurements", async ({ db }) => {
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

  it("rejects when the client doesn't belong to the organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const client = await seedClient(db, otherOrg.id);

    await expect(
      db.transaction((tx) => updateClient(tx, org.id, client.id, { name: "x", measurements: [] })),
    ).rejects.toThrow(/Cliente no encontrado/);
  });
});

describe("deleteClient", () => {
  it("rejects when the client doesn't belong to the organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const client = await seedClient(db, otherOrg.id);

    await expect(deleteClient(db, org.id, client.id)).rejects.toThrow(/Cliente no encontrado/);
  });
});

describe("setClientMeasurement", () => {
  const measurementsOf = (db: Parameters<typeof setClientMeasurement>[0], clientId: string) =>
    db.select().from(clientMeasurement).where(eq(clientMeasurement.clientId, clientId));

  it("creates, updates and deletes a single measurement", async ({ db }) => {
    const org = await seedOrganization(db);
    const client = await seedClient(db, org.id);

    const created = await setClientMeasurement(db, org.id, {
      clientId: client.id,
      name: "Contorno busto",
      value: 114,
    });
    expect(created?.value).toBe(114);

    const updated = await setClientMeasurement(db, org.id, {
      clientId: client.id,
      measurementId: created?.id,
      name: "Contorno busto",
      value: 116.5,
    });
    expect(updated?.id).toBe(created?.id);
    expect((await measurementsOf(db, client.id)).map((m) => m.value)).toEqual([116.5]);

    const deleted = await setClientMeasurement(db, org.id, {
      clientId: client.id,
      measurementId: created?.id,
      name: "Contorno busto",
      value: null,
    });
    expect(deleted).toBeNull();
    expect(await measurementsOf(db, client.id)).toHaveLength(0);
  });

  it("rejects measurements of a client from another organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const otherClient = await seedClient(db, otherOrg.id);
    const [foreign] = await db
      .insert(clientMeasurement)
      .values({ clientId: otherClient.id, name: "Cintura", value: 70 })
      .returning();

    await expect(
      setClientMeasurement(db, org.id, {
        clientId: otherClient.id,
        measurementId: foreign.id,
        name: "Cintura",
        value: 1,
      }),
    ).rejects.toThrow(/Cliente no encontrado/);

    const ownClient = await seedClient(db, org.id);
    await expect(
      setClientMeasurement(db, org.id, {
        clientId: ownClient.id,
        measurementId: foreign.id,
        name: "Cintura",
        value: 1,
      }),
    ).rejects.toThrow(/Medida no encontrada/);
    expect((await measurementsOf(db, otherClient.id))[0].value).toBe(70);
  });
});
