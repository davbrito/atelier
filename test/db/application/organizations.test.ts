import { describe, expect } from "vitest";
import { getUserOrganizationCount } from "#/server/application/organizations";
import { test } from "../../helpers/db-fixture.ts";
import { seedMember, seedOrganization, seedUser } from "../../helpers/seed.ts";

describe("getUserOrganizationCount", () => {
  test("returns 0 for a user with no memberships", async ({ db }) => {
    const user = await seedUser(db);
    expect(await getUserOrganizationCount(db, user.id)).toBe(0);
  });

  test("counts memberships across organizations", async ({ db }) => {
    const user = await seedUser(db);
    const orgA = await seedOrganization(db);
    const orgB = await seedOrganization(db);
    await seedMember(db, orgA.id, user.id);
    await seedMember(db, orgB.id, user.id);

    expect(await getUserOrganizationCount(db, user.id)).toBe(2);
  });

  test("doesn't count another user's memberships", async ({ db }) => {
    const user = await seedUser(db);
    const otherUser = await seedUser(db);
    const org = await seedOrganization(db);
    await seedMember(db, org.id, otherUser.id);

    expect(await getUserOrganizationCount(db, user.id)).toBe(0);
  });
});
