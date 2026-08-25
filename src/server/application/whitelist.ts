import { asc, eq } from "drizzle-orm";
import type { Db } from "#/db/client";
import * as schema from "#/db/schema";

export async function listWhitelistedEmails(db: Db) {
  return db
    .select({
      id: schema.whitelistEmail.id,
      email: schema.whitelistEmail.email,
      addedById: schema.whitelistEmail.addedById,
      createdAt: schema.whitelistEmail.createdAt,
    })
    .from(schema.whitelistEmail)
    .orderBy(asc(schema.whitelistEmail.email));
}

export async function addWhitelistedEmail(db: Db, email: string, addedById: string) {
  await db.insert(schema.whitelistEmail).values({ email, addedById });
}

export async function removeWhitelistedEmail(db: Db, id: string) {
  await db.delete(schema.whitelistEmail).where(eq(schema.whitelistEmail.id, id));
}
