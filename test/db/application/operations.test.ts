import { describe, expect } from "vitest";
import { updateOperation } from "#/server/application/operations";
import { it } from "../../helpers/fixtures.ts";
import { seedOperation, seedOrganization } from "../../helpers/seed.ts";

describe("updateOperation", () => {
  it("updates the operation's fields", async ({ db }) => {
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

  it("rejects when the operation doesn't belong to the organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const op = await seedOperation(db, otherOrg.id);

    await expect(updateOperation(db, org.id, { id: op.id, name: "x" })).rejects.toThrow(
      /Operación no encontrada/,
    );
  });
});
