import { afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import type { Db } from "#/db/client";
import {
  addWhitelistedEmail,
  listWhitelistedEmails,
  removeWhitelistedEmail,
} from "#/server/application/whitelist";
import { createTestDb } from "../../helpers/create-test-db.ts";
import { resetDb } from "../../helpers/reset-db.ts";
import { seedUser } from "../../helpers/seed.ts";

let db: Db;

beforeAll(async () => {
  db = await createTestDb(inject("postgresConnectionString"));
});

afterEach(async () => {
  await resetDb(db);
});

describe("whitelist", () => {
  it("adds and lists emails alphabetically", async () => {
    const admin = await seedUser(db);

    await addWhitelistedEmail(db, "zoe@example.com", admin.id);
    await addWhitelistedEmail(db, "ana@example.com", admin.id);

    const emails = await listWhitelistedEmails(db);
    expect(emails.map((e) => e.email)).toEqual(["ana@example.com", "zoe@example.com"]);
    expect(emails[0].addedById).toBe(admin.id);
  });

  it("removes an email", async () => {
    const admin = await seedUser(db);
    await addWhitelistedEmail(db, "ana@example.com", admin.id);
    const [entry] = await listWhitelistedEmails(db);

    await removeWhitelistedEmail(db, entry.id);

    expect(await listWhitelistedEmails(db)).toHaveLength(0);
  });
});
