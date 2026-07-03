import { and, eq } from "drizzle-orm";
import type { Db } from "#/db/client";
import { budget, material, member } from "#/db/schema";

const entityTypesTableMap = {
  budgets: budget,
  materials: material,
};

export const uploadKeyPattern =
  /^uploads\/(materials|budgets)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.[a-z0-9]+$/;

/**
 * Returns true if `userId` is allowed to read the R2 object at `key`.
 *
 * - `uploads/avatars/*`  → any authenticated user
 * - `uploads/{materials|budgets}/{uuid}.{ext}` → members of the owning org only
 * - everything else → denied
 */
export async function canAccessImage(db: Db, userId: string, key: string): Promise<boolean> {
  if (key.startsWith("uploads/avatars/")) return true;

  const match = key.match(uploadKeyPattern);
  if (!match) return false;

  const table = entityTypesTableMap[match[1] as keyof typeof entityTypesTableMap];
  const entityId = match[2];

  const [entity] = await db
    .select({ organizationId: table.organizationId })
    .from(table)
    .where(eq(table.id, entityId));
  if (!entity) return false;

  const memberships = await db.$count(
    member,
    and(eq(member.userId, userId), eq(member.organizationId, entity.organizationId)),
  );
  return memberships > 0;
}
