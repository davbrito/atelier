import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import * as z from "zod";
import { transactionMiddleware } from "#/db/middleware";
import { material, materialInventoryMovement, user } from "#/db/schema";
import { organizationMiddleware } from "../auth/functions";

export const getMaterialInventory = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ materialId: z.uuid() }))
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    const [mat] = await db
      .select({ id: material.id })
      .from(material)
      .where(and(eq(material.id, data.materialId), eq(material.organizationId, activeOrganizationId)));

    if (!mat) throw new Error("Material no encontrado");

    const [{ currentStock }] = await db
      .select({
        currentStock: sql<string>`COALESCE(SUM(${materialInventoryMovement.delta}), '0')`,
      })
      .from(materialInventoryMovement)
      .where(
        and(
          eq(materialInventoryMovement.materialId, data.materialId),
          eq(materialInventoryMovement.organizationId, activeOrganizationId),
        ),
      );

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
      quantity: z.string(),
      note: z.string().optional(),
    }),
  )
  .handler(async ({ data, context: { activeOrganizationId, trx, user: currentUser } }) => {
    const [mat] = await trx
      .select({ id: material.id })
      .from(material)
      .where(and(eq(material.id, data.materialId), eq(material.organizationId, activeOrganizationId)));

    if (!mat) throw new Error("Material no encontrado");

    let delta: string;

    if (data.type === "adjustment") {
      const [{ currentStock }] = await trx
        .select({
          currentStock: sql<string>`COALESCE(SUM(${materialInventoryMovement.delta}), '0')`,
        })
        .from(materialInventoryMovement)
        .where(
          and(
            eq(materialInventoryMovement.materialId, data.materialId),
            eq(materialInventoryMovement.organizationId, activeOrganizationId),
          ),
        );

      const target = Number(data.quantity);
      const current = Number(currentStock);
      delta = (target - current).toFixed(4);
    } else {
      const qty = Number(data.quantity);
      delta = data.type === "entry" ? qty.toFixed(4) : (-qty).toFixed(4);
    }

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
