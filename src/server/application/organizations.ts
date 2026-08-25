import { eq } from "drizzle-orm";
import type { Db } from "#/db/client";
import { member } from "#/db/schema";

export async function getUserOrganizationCount(db: Db, userId: string) {
  return db.$count(member, eq(member.userId, userId));
}
