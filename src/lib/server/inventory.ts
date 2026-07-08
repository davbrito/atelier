import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq, sql } from "drizzle-orm";
import * as z from "zod";
import type { Db } from "#/db/client";
import { transactionMiddleware } from "#/db/middleware";
import { material, materialInventoryMovement, user } from "#/db/schema";
import { organizationMiddleware } from "../auth/functions";

type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Namespace seed for material-inventory advisory locks (pg_advisory_xact_lock
 * takes a (classid, objid) pair). Keeps this lock space from colliding with
 * advisory locks taken elsewhere in the codebase for unrelated entities.
 */
const INVENTORY_LOCK_NAMESPACE = 314159265;

/** Decimal string matching the `delta`/quantity column precision (12,4). */
const decimalString = z
  .string()
  .regex(/^\d*\.?\d{1,8}$/, "Cantidad inválida")
  .refine((v) => {
    const [, decimals = ""] = v.split(".");
    return decimals.length <= 4;
  }, "Cantidad inválida");

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
      quantity: decimalString,
      note: z.string().optional(),
    }),
  )
  .handler(async ({ data, context: { activeOrganizationId, trx, user: currentUser } }) => {
    // Bound how long we're willing to wait for the lock below so a stuck
    // connection can't pile up requests and exhaust the connection pool.
    await trx.execute(sql`SET LOCAL lock_timeout = '5s'`);

    // Lock first, before any reads: serializes concurrent movements for this
    // material and avoids taking a table read lock ahead of the advisory
    // lock, which could otherwise invert lock acquisition order between
    // concurrent transactions and deadlock.
    await trx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${data.materialId}, ${INVENTORY_LOCK_NAMESPACE}))`,
    );

    const [mat] = await trx
      .select({ id: material.id })
      .from(material)
      .where(
        and(eq(material.id, data.materialId), eq(material.organizationId, activeOrganizationId)),
      );

    if (!mat) throw new Error("Material no encontrado");

    // The delta is computed entirely in Postgres numeric arithmetic (never
    // routed through a JS `Number`) so ledger precision can't be lost to
    // floating-point rounding as quantities scale.
    const deltaExpr =
      data.type === "adjustment"
        ? sql`(${data.quantity}::numeric - COALESCE((SELECT SUM(${materialInventoryMovement.delta}) FROM ${materialInventoryMovement} WHERE ${materialInventoryMovement.materialId} = ${data.materialId} AND ${materialInventoryMovement.organizationId} = ${activeOrganizationId}), 0))`
        : data.type === "entry"
          ? sql`${data.quantity}::numeric`
          : sql`(-1 * ${data.quantity}::numeric)`;

    const [movement] = await trx
      .insert(materialInventoryMovement)
      .values({
        materialId: data.materialId,
        organizationId: activeOrganizationId,
        type: data.type,
        delta: deltaExpr,
        note: data.note ?? null,
        createdById: currentUser.id,
      })
      .returning();

    return movement;
  });
