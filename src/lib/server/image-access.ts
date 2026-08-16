import { and, eq } from "drizzle-orm";
import type { Db } from "#/db/client";
import { budget, material, member, orderPayment } from "#/db/schema";

const entityTypesTableMap = {
  budgets: budget,
  materials: material,
  orderPayments: orderPayment,
};

export const uploadKeyPattern =
  /^uploads\/(materials|budgets|orderPayments)\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.[a-z0-9]+$/;

/**
 * Returns true if `userId` is allowed to read the R2 object at `key`.
 *
 * - `uploads/avatars/*`  → any authenticated user
 * - `uploads/{materials|budgets|orderPayments}/{uuid}.{ext}` → members of the owning org only
 * - everything else → denied
 */
export async function canAccessImage(db: Db, userId: string, key: string): Promise<boolean> {
  if (key.startsWith("uploads/avatars/")) return true;

  const match = key.match(uploadKeyPattern);
  if (!match) return false;

  const table = entityTypesTableMap[match[1] as keyof typeof entityTypesTableMap];
  const entityId = match[2];

  // Single join instead of two round trips: the entity's organization and
  // the caller's membership in it are checked in one query.
  const [row] = await db
    .select({ organizationId: member.organizationId })
    .from(table)
    .innerJoin(
      member,
      and(eq(member.organizationId, table.organizationId), eq(member.userId, userId)),
    )
    .where(eq(table.id, entityId));

  return row !== undefined;
}
