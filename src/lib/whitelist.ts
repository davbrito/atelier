import { eq, exists, sql } from "drizzle-orm";
import type { Db } from "#/db/client";
import { whitelistEmail as whitelistEmailTable } from "#/db/schema";

// ── Env-var bootstrap ────────────────────────────────────
// The WHITELISTED_EMAILS env var is kept for bootstrapping:
// it lets the first admin sign in before any emails are in the DB.
// Once an admin is logged in, they can add emails via the admin UI.

const envWhitelistEmails = (process.env.WHITELISTED_EMAILS ?? "")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

/** True when the env-var whitelist allows this email. */
function isEnvWhitelistedEmail(email: string): boolean {
  return envWhitelistEmails.includes(email.toLowerCase());
}

/**
 * Checks whether an email is allowed to sign in.
 *
 * First checks the WHITELISTED_EMAILS env var (bootstrap).
 * Then queries the database.
 */
export async function isWhitelistedEmail(db: Db, email?: string): Promise<boolean> {
  if (typeof email !== "string") return false;
  const normalized = email.toLowerCase().trim();

  if (isEnvWhitelistedEmail(normalized)) return true;

  const result = await db.execute(
    sql`SELECT ${exists(
      db.select().from(whitelistEmailTable).where(eq(whitelistEmailTable.email, normalized)),
    )} as exists`,
  );

  return Boolean(result.rows[0]?.exists ?? false);
}
