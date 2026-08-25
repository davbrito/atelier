import { and, desc, eq, sql } from "drizzle-orm";
import type { Db } from "#/db/client";
import { material, materialInventoryMovement, user } from "#/db/schema";

/**
 * Namespace seed for material-inventory advisory locks (pg_advisory_xact_lock
 * takes a (classid, objid) pair). Keeps this lock space from colliding with
 * advisory locks taken elsewhere in the codebase for unrelated entities.
 */
const INVENTORY_LOCK_NAMESPACE = 314159265;

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

export async function getMaterialInventory(db: Db, organizationId: string, materialId: string) {
  const [mat] = await db
    .select({ id: material.id })
    .from(material)
    .where(and(eq(material.id, materialId), eq(material.organizationId, organizationId)));

  if (!mat) throw new Error("Material no encontrado");

  const currentStock = await getCurrentStock(db, materialId, organizationId);

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
        eq(materialInventoryMovement.materialId, materialId),
        eq(materialInventoryMovement.organizationId, organizationId),
      ),
    )
    .orderBy(desc(materialInventoryMovement.createdAt))
    .limit(50);

  return { currentStock, movements };
}

export type RegisterMovementInput = {
  materialId: string;
  type: "entry" | "exit" | "adjustment";
  /** Decimal string matching the `delta`/quantity column precision (12,4). */
  quantity: string;
  note?: string;
};

/**
 * Records an inventory movement, computing the ledger delta entirely in
 * Postgres numeric arithmetic (never routed through a JS `Number`) so
 * precision can't be lost to floating-point rounding as quantities scale.
 * Must run inside a transaction: takes an advisory lock on the material
 * before reading/writing so concurrent movements for the same material are
 * serialized (important for "adjustment", which reads the running total).
 */
export async function registerMovement(
  trx: Db,
  organizationId: string,
  createdById: string,
  data: RegisterMovementInput,
) {
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
    .where(and(eq(material.id, data.materialId), eq(material.organizationId, organizationId)));

  if (!mat) throw new Error("Material no encontrado");

  const deltaExpr =
    data.type === "adjustment"
      ? sql`(${data.quantity}::numeric - COALESCE((SELECT SUM(${materialInventoryMovement.delta}) FROM ${materialInventoryMovement} WHERE ${materialInventoryMovement.materialId} = ${data.materialId} AND ${materialInventoryMovement.organizationId} = ${organizationId}), 0))`
      : data.type === "entry"
        ? sql`${data.quantity}::numeric`
        : sql`(-1 * ${data.quantity}::numeric)`;

  const [movement] = await trx
    .insert(materialInventoryMovement)
    .values({
      materialId: data.materialId,
      organizationId,
      type: data.type,
      delta: deltaExpr,
      note: data.note ?? null,
      createdById,
    })
    .returning();

  return movement;
}
