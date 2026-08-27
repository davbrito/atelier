import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "#/db/client";

// This suite runs under the "app" (Workers) project, so it can't use
// test/helpers/mock-db.ts — that pulls in drizzle-orm/node-postgres, which
// depends on the CommonJS `pg` package the Workers pool can't load (see
// test/README.md). A type-only stub is enough here: every case below only
// exercises paths that resolve before `isWhitelistedEmail` ever touches
// `db`, so if that ever stopped being true, calling into this stub would
// throw and fail the test loudly.
const db = {} as Db;

// `envWhitelistEmails` is computed once at module load from
// `process.env.WHITELISTED_EMAILS`, so each case needs a fresh module
// instance to pick up a different env value.
describe("isWhitelistedEmail env-var bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  // Combined into one case (rather than one `it` per assertion) because
  // each fresh env value needs `vi.resetModules()` + a re-import to pick it
  // up, and under the Workers pool that's genuinely expensive (~2s), not
  // just a Node module-cache bust — so this file keeps reimports to the
  // minimum distinct env values actually needed (two).
  it("matches env entries case-insensitively, trims whitespace, and never touches the db", async () => {
    vi.stubEnv("WHITELISTED_EMAILS", " Admin@Example.com , other@example.com");
    const { isWhitelistedEmail } = await import("#/lib/whitelist");

    // The db stub is `{}` — if any of these resolved by falling through to
    // the database lookup instead of short-circuiting on the env match,
    // calling into it would throw and fail this test.
    await expect(isWhitelistedEmail(db, "admin@example.com")).resolves.toBe(true);
    await expect(isWhitelistedEmail(db, "ADMIN@EXAMPLE.COM")).resolves.toBe(true);
    await expect(isWhitelistedEmail(db, "  admin@example.com  ")).resolves.toBe(true);
  });

  it("returns false for non-string input without touching the db", async () => {
    vi.stubEnv("WHITELISTED_EMAILS", "");
    const { isWhitelistedEmail } = await import("#/lib/whitelist");

    await expect(isWhitelistedEmail(db, undefined)).resolves.toBe(false);
  });
});
