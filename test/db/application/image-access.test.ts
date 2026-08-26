import { describe, expect } from "vitest";
import { canAccessImage } from "#/server/application/image-access";
import { test } from "../../helpers/fixtures.ts";
import { seedMaterial, seedMember, seedOrganization, seedUser } from "../../helpers/seed.ts";

describe("canAccessImage", () => {
  test("always allows avatar keys, regardless of the user", async ({ db }) => {
    const allowed = await canAccessImage(db, "any-user-id", "uploads/avatars/whatever.png");
    expect(allowed).toBe(true);
  });

  test("denies keys that don't match the upload pattern", async ({ db }) => {
    const org = await seedOrganization(db);
    const user = await seedUser(db);
    await seedMember(db, org.id, user.id);

    expect(await canAccessImage(db, user.id, "not-a-real-key")).toBe(false);
    expect(await canAccessImage(db, user.id, "uploads/unknown-entity/foo.png")).toBe(false);
  });

  test("allows a member of the owning organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const user = await seedUser(db);
    await seedMember(db, org.id, user.id);
    const mat = await seedMaterial(db, org.id);

    const allowed = await canAccessImage(db, user.id, `uploads/materials/${mat.id}.jpg`);
    expect(allowed).toBe(true);
  });

  test("denies a user who isn't a member of the owning organization", async ({ db }) => {
    const org = await seedOrganization(db);
    const mat = await seedMaterial(db, org.id);
    const outsider = await seedUser(db);

    const allowed = await canAccessImage(db, outsider.id, `uploads/materials/${mat.id}.jpg`);
    expect(allowed).toBe(false);
  });

  test("denies a member of a different organization than the one owning the entity", async ({
    db,
  }) => {
    const org = await seedOrganization(db);
    const otherOrg = await seedOrganization(db);
    const mat = await seedMaterial(db, org.id);
    const user = await seedUser(db);
    await seedMember(db, otherOrg.id, user.id);

    const allowed = await canAccessImage(db, user.id, `uploads/materials/${mat.id}.jpg`);
    expect(allowed).toBe(false);
  });
});
