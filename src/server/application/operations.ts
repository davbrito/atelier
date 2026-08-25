import { and, eq } from "drizzle-orm";
import type { Db } from "#/db/client";
import { operation } from "#/db/schema";

export async function updateOperation(
  db: Db,
  organizationId: string,
  data: { id: string; name: string; defaultDurationMinutes?: number },
) {
  const { id, ...updateData } = data;
  const [updated] = await db
    .update(operation)
    .set(updateData)
    .where(and(eq(operation.id, id), eq(operation.organizationId, organizationId)))
    .returning();

  if (!updated) throw new Error("Operación no encontrada");

  return updated;
}
