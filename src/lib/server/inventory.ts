import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import * as z from "zod";
import type { Db } from "#/db/client";
import { transactionMiddleware } from "#/db/middleware";
import { material, materialInventoryMovement, user } from "#/db/schema";
import { organizationMiddleware } from "../auth/functions";
import { computeMovementDelta } from "./inventory-logic";

export { computeMovementDelta };

type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

export async function getCurrentStock(
  executor: Db | Transaction,
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

export const getMaterialInventory = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ materialId: z.uuid() }))
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    const [mat] = await db
      .select({ id: material.id })
      .from(material)
      .where(
        and(eq(material.id, data.materialId), eq(material.organizationId, activeOrganizationId)),
      );

    if (!mat) throw new Error("Material no encontrado");

    const currentStock = await getCurrentStock(db, data.materialId, activeOrganizationId);

    const movements = await db
      .select({
        id: materialInventoryMovement.id,
        type: materialInventoryMovement.type,
        delta: materialInventoryMovement.delta,
        note: materialInventoryMovement.note,
        createdAt: materialInventoryMovement.createdAt,
        createdByName: user.name,
      })
      .from(materialInventoryMovement)
      .leftJoin(user, eq(materialInventoryMovement.createdById, user.id))
      .where(
        and(
          eq(materialInventoryMovement.materialId, data.materialId),
          eq(materialInventoryMovement.organizationId, activeOrganizationId),
        ),
      )
      .orderBy(desc(materialInventoryMovement.createdAt))
      .limit(50);

    return { currentStock, movements };
  });

export const registerMovement = createServerFn({ method: "POST" })
  .middleware([organizationMiddleware, transactionMiddleware])
  .validator(
    z.object({
      materialId: z.uuid(),
      type: z.enum(["entry", "exit", "adjustment"]),
      quantity: z.coerce.number().nonnegative().finite(),
      note: z.string().optional(),
    }),
  )
  .handler(async ({ data, context: { activeOrganizationId, trx, user: currentUser } }) => {
    const [mat] = await trx
      .select({ id: material.id })
      .from(material)
      .where(
        and(eq(material.id, data.materialId), eq(material.organizationId, activeOrganizationId)),
      );

    if (!mat) throw new Error("Material no encontrado");

    // Serialize concurrent movement registrations for this material so the
    // stock read below (used by "adjustment") can't race with another
    // in-flight movement and silently corrupt the ledger.
    await trx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${data.materialId}, 0))`);

    const currentStock =
      data.type === "adjustment"
        ? await getCurrentStock(trx, data.materialId, activeOrganizationId)
        : "0";

    const delta = computeMovementDelta(data.type, data.quantity, Number(currentStock));

    const [movement] = await trx
      .insert(materialInventoryMovement)
      .values({
        materialId: data.materialId,
        organizationId: activeOrganizationId,
        type: data.type,
        delta,
        note: data.note ?? null,
        createdById: currentUser.id,
      })
      .returning();

    return movement;
  });
