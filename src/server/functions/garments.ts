import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import * as z from "zod";
import { client, garment, order } from "#/db/schema";
import { organizationMiddleware } from "#/lib/auth/functions";
import { moveGarmentStage as moveGarmentStageUseCase } from "../application/garments";

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
    await db.transaction((tx) => moveGarmentStageUseCase(tx, activeOrganizationId, data));
    return { success: true };
  });
