import { and, eq, sql } from "drizzle-orm";
import type { Db } from "#/db/client";
import { materialInventoryMovement } from "#/db/schema";

export async function getCurrentStock(
  executor: Db,
  materialId: string,
  organizationId: string,
): Promise<string> {
  const [{ currentStock }] = await executor
    .select({
      currentStock: sql<string>`COALESCE(SUM(${materialInventoryMovement.delta}), '0')`,
    })
    .from(materialInventoryMovement)
    .where(
      and(
        eq(materialInventoryMovement.materialId, materialId),
        eq(materialInventoryMovement.organizationId, organizationId),
      ),
    );

  return currentStock;
}
