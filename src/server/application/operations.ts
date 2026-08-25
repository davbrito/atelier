import { and, asc, eq, ilike } from "drizzle-orm";
import type { Db } from "#/db/client";
import { operation } from "#/db/schema";

export type ListOperationsInput = { page: number; pageSize: number; search?: string };

export async function listOperations(db: Db, organizationId: string, params: ListOperationsInput) {
  const whereClause = and(
    eq(operation.organizationId, organizationId),
    params.search ? ilike(operation.name, `%${params.search}%`) : undefined,
  );

  const [items, total] = await Promise.all([
    db
      .select()
      .from(operation)
      .where(whereClause)
      .orderBy(asc(operation.name))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.$count(operation, whereClause),
  ]);

  return { items, total, page: params.page, pageSize: params.pageSize };
}

export async function getOperationById(db: Db, organizationId: string, id: string) {
  const [found] = await db
    .select()
    .from(operation)
    .where(and(eq(operation.id, id), eq(operation.organizationId, organizationId)));

  if (!found) throw new Error("Operación no encontrada");

  return found;
}

export async function createOperation(
  db: Db,
  organizationId: string,
  data: { name: string; defaultDurationMinutes?: number },
) {
  const [newOperation] = await db
    .insert(operation)
    .values({
      organizationId,
      name: data.name,
      defaultDurationMinutes: data.defaultDurationMinutes ?? 60,
    })
    .returning();

  return newOperation;
}

export async function deleteOperation(db: Db, organizationId: string, id: string) {
  await db
    .delete(operation)
    .where(and(eq(operation.id, id), eq(operation.organizationId, organizationId)));
}

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
