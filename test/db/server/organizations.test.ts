import { afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import type { Db } from "#/db/client";
import { getUserOrganizationCount } from "#/server/application/organizations";
import { createTestDb } from "../../helpers/create-test-db.ts";
import { resetDb } from "../../helpers/reset-db.ts";
import { seedMember, seedOrganization, seedUser } from "../../helpers/seed.ts";

let db: Db;

beforeAll(async () => {
  db = await createTestDb(inject("postgresConnectionString"));
});

afterEach(async () => {
  await resetDb(db);
});

describe("getUserOrganizationCount", () => {
  it("returns 0 for a user with no memberships", async () => {
    const user = await seedUser(db);
    expect(await getUserOrganizationCount(db, user.id)).toBe(0);
  });

  it("counts memberships across organizations", async () => {
    const user = await seedUser(db);
    const orgA = await seedOrganization(db);
    const orgB = await seedOrganization(db);
    await seedMember(db, orgA.id, user.id);
    await seedMember(db, orgB.id, user.id);

    expect(await getUserOrganizationCount(db, user.id)).toBe(2);
  });

  it("doesn't count another user's memberships", async () => {
    const user = await seedUser(db);
    const otherUser = await seedUser(db);
    const org = await seedOrganization(db);
    await seedMember(db, org.id, otherUser.id);

    expect(await getUserOrganizationCount(db, user.id)).toBe(0);
  });
});
