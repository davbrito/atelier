import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "#/db/client";
import { client, garment, garmentStage, order } from "#/db/schema";

export async function listKanbanGarments(db: Db, organizationId: string) {
  return db
    .select({
      id: garment.id,
      name: garment.name,
      stageId: garment.stageId,
      orderId: order.id,
      orderCode: order.code,
      priority: order.priority,
      dueDate: order.dueDate,
      clientName: client.name,
    })
    .from(garment)
    .innerJoin(order, eq(garment.orderId, order.id))
    .leftJoin(client, eq(order.clientId, client.id))
    .where(eq(order.organizationId, organizationId));
}

/**
 * Moves a garment to a stage and, if that changes the order's overall
 * production state, transitions the order's status automatically:
 * - pending -> in_progress on the order's first garment move
 * - in_progress -> ready once every garment on the order has reached a
 *   final stage
 * Must run inside a transaction.
 */
export async function moveGarmentStage(
  tx: Db,
  organizationId: string,
  data: { id: string; stageId: string | null },
) {
  const [owned] = await tx
    .select({ id: garment.id, orderId: garment.orderId, orderStatus: order.status })
    .from(garment)
    .innerJoin(order, eq(garment.orderId, order.id))
    .where(and(eq(garment.id, data.id), eq(order.organizationId, organizationId)));

  if (!owned) throw new Error("Prenda no encontrada");

  if (data.stageId) {
    const [stage] = await tx
      .select({ id: garmentStage.id })
      .from(garmentStage)
      .where(
        and(eq(garmentStage.id, data.stageId), eq(garmentStage.organizationId, organizationId)),
      );

    if (!stage) throw new Error("Etapa no encontrada");
  }

  await tx.update(garment).set({ stageId: data.stageId }).where(eq(garment.id, data.id));

  if (owned.orderStatus === "pending") {
    await tx.update(order).set({ status: "in_progress" }).where(eq(order.id, owned.orderId));
  } else if (owned.orderStatus === "in_progress") {
    await tx
      .update(order)
      .set({ status: "ready" })
      .where(
        and(
          eq(order.id, owned.orderId),
          inArray(
            order.id,
            tx
              .select({ orderId: garment.orderId })
              .from(garment)
              .leftJoin(garmentStage, eq(garment.stageId, garmentStage.id))
              .where(eq(garment.orderId, owned.orderId))
              .groupBy(garment.orderId)
              .having(
                sql`COUNT(*) > 0 AND COUNT(*) FILTER (WHERE ${garmentStage.isFinalStage} IS NOT TRUE) = 0`,
              ),
          ),
        ),
      );
  }
}
