import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockDb } from "../helpers/mock-db";

// `envWhitelistEmails` is computed once at module load from
// `process.env.WHITELISTED_EMAILS`, so each case needs a fresh module
// instance to pick up a different env value.
describe("isWhitelistedEmail env-var bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("matches env entries case-insensitively and trims whitespace", async () => {
    vi.stubEnv("WHITELISTED_EMAILS", " Admin@Example.com , other@example.com");
    const { isWhitelistedEmail } = await import("#/lib/whitelist");
    const db = mockDb();

    await expect(isWhitelistedEmail(db, "admin@example.com")).resolves.toBe(true);
    await expect(isWhitelistedEmail(db, "ADMIN@EXAMPLE.COM")).resolves.toBe(true);
    await expect(isWhitelistedEmail(db, "  admin@example.com  ")).resolves.toBe(true);
  });

  it("takes precedence over the database lookup", async () => {
    vi.stubEnv("WHITELISTED_EMAILS", "admin@example.com");
    const { isWhitelistedEmail } = await import("#/lib/whitelist");
    // A mock db throws if a query is actually executed against it, so this
    // only passes if the env-var match short-circuits before any DB call.
    const db = mockDb();

    await expect(isWhitelistedEmail(db, "admin@example.com")).resolves.toBe(true);
  });

  it("returns false for non-string input without touching the db", async () => {
    vi.stubEnv("WHITELISTED_EMAILS", "");
    const { isWhitelistedEmail } = await import("#/lib/whitelist");
    const db = mockDb();

    await expect(isWhitelistedEmail(db, undefined)).resolves.toBe(false);
  });
});
