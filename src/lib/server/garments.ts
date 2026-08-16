import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray, sql } from "drizzle-orm";
import * as z from "zod";
import { client, garment, garmentStage, order } from "#/db/schema";
import { organizationMiddleware } from "../auth/functions";

// ── Queries ──────────────────────────────────────────────

export const listKanbanGarments = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId, db } }) => {
    const items = await db
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
      .where(eq(order.organizationId, activeOrganizationId));

    return { items };
  });

// ── Mutations ────────────────────────────────────────────

export const moveGarmentStage = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid(), stageId: z.uuid().nullable() }))
  .middleware([organizationMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    await db.transaction(async (tx) => {
      const [owned] = await tx
        .select({ id: garment.id, orderId: garment.orderId, orderStatus: order.status })
        .from(garment)
        .innerJoin(order, eq(garment.orderId, order.id))
        .where(and(eq(garment.id, data.id), eq(order.organizationId, activeOrganizationId)));

      if (!owned) throw new Error("Prenda no encontrada");

      if (data.stageId) {
        const [stage] = await tx
          .select({ id: garmentStage.id })
          .from(garmentStage)
          .where(
            and(
              eq(garmentStage.id, data.stageId),
              eq(garmentStage.organizationId, activeOrganizationId),
            ),
          );

        if (!stage) throw new Error("Etapa no encontrada");
      }

      await tx.update(garment).set({ stageId: data.stageId }).where(eq(garment.id, data.id));

      // A pending order that gets its first garment moved starts production.
      // An in-progress order whose garments have all reached a final stage
      // is ready — both transitions happen automatically, without the user
      // touching the order's own status.
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
    });

    return { success: true };
  });
