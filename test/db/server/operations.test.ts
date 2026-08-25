import { afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import type { Db } from "#/db/client";
import { updateOperation } from "#/server/application/operations";
import { createTestDb } from "../../helpers/create-test-db.ts";
import { resetDb } from "../../helpers/reset-db.ts";
import { seedOperation, seedOrganization } from "../../helpers/seed.ts";

let db: Db;

beforeAll(async () => {
  db = await createTestDb(inject("postgresConnectionString"));
});

afterEach(async () => {
  await resetDb(db);
});

describe("updateOperation", () => {
  it("updates the operation's fields", async () => {
    const org = await seedOrganization(db);
    const op = await seedOperation(db, org.id, { name: "Bordado" });

    const updated = await updateOperation(db, org.id, {
      id: op.id,
      name: "Bordado a mano",
      defaultDurationMinutes: 45,
    });

    expect(updated.name).toBe("Bordado a mano");
    expect(updated.defaultDurationMinutes).toBe(45);
  });

  it("rejects when the operation doesn't belong to the organization", async () => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const op = await seedOperation(db, otherOrg.id);

    await expect(updateOperation(db, org.id, { id: op.id, name: "x" })).rejects.toThrow(
      /Operación no encontrada/,
    );
  });
});
