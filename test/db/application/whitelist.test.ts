import { describe, expect } from "vitest";
import {
  addWhitelistedEmail,
  listWhitelistedEmails,
  removeWhitelistedEmail,
} from "#/server/application/whitelist";
import { it } from "#test/helpers/fixtures.ts";
import { seedUser } from "#test/helpers/seed.ts";

describe("whitelist", () => {
  it("adds and lists emails alphabetically", async ({ db }) => {
    const admin = await seedUser(db);

    await addWhitelistedEmail(db, "zoe@example.com", admin.id);
    await addWhitelistedEmail(db, "ana@example.com", admin.id);

    const emails = await listWhitelistedEmails(db);
    expect(emails.map((e) => e.email)).toEqual(["ana@example.com", "zoe@example.com"]);
    expect(emails[0].addedById).toBe(admin.id);
  });

  it("removes an email", async ({ db }) => {
    const admin = await seedUser(db);
    await addWhitelistedEmail(db, "ana@example.com", admin.id);
    const [entry] = await listWhitelistedEmails(db);

    await removeWhitelistedEmail(db, entry.id);

    expect(await listWhitelistedEmails(db)).toHaveLength(0);
  });
});
