import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, eq } from "drizzle-orm";
import * as z from "zod";
import { operation } from "#/db/schema";
import { organizationMiddleware } from "../auth/functions";

export const listOperations = createServerFn({ method: "GET" })
  .validator(
    z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }),
  )
  .middleware([organizationMiddleware])
  .handler(async ({ data: { page, pageSize }, context: { activeOrganizationId, db } }) => {
    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(operation)
        .where(eq(operation.organizationId, activeOrganizationId))
        .orderBy(asc(operation.name))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db
        .select({ total: count() })
        .from(operation)
        .where(eq(operation.organizationId, activeOrganizationId)),
    ]);

    return { items, total, page, pageSize };
  });

export const createOperation = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string(), defaultDurationMinutes: z.number().optional() }))
  .middleware([organizationMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    const [newOperation] = await db
      .insert(operation)
      .values({
        organizationId: activeOrganizationId,
        name: data.name,
        defaultDurationMinutes: data.defaultDurationMinutes ?? 60,
      })
      .returning();

    return newOperation;
  });

export const updateOperation = createServerFn({ method: "POST" })
  .middleware([organizationMiddleware])
  .validator(
    z.object({
      id: z.uuid(),
      name: z.string(),
      defaultDurationMinutes: z.number().optional(),
    }),
  )
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    const { id, ...updateData } = data;
    const [updated] = await db
      .update(operation)
      .set(updateData)
      .where(and(eq(operation.id, id), eq(operation.organizationId, activeOrganizationId)))
      .returning();

    if (!updated) throw new Error("Operación no encontrada");

    return updated;
  });

export const deleteOperation = createServerFn({ method: "POST" })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data: { id }, context: { activeOrganizationId, db } }) => {
    await db
      .delete(operation)
      .where(and(eq(operation.id, id), eq(operation.organizationId, activeOrganizationId)));
    return { success: true };
  });
