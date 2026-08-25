import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, ilike } from "drizzle-orm";
import * as z from "zod";
import { operation } from "#/db/schema";
import { organizationMiddleware } from "#/lib/auth/functions";
import { updateOperation as updateOperationUseCase } from "../application/operations";

export const listOperations = createServerFn({ method: "GET" })
  .validator(
    z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
      search: z.string().trim().optional(),
    }),
  )
  .middleware([organizationMiddleware])
  .handler(async ({ data: { page, pageSize, search }, context: { activeOrganizationId, db } }) => {
    const whereClause = and(
      eq(operation.organizationId, activeOrganizationId),
      search ? ilike(operation.name, `%${search}%`) : undefined,
    );

    const [items, total] = await Promise.all([
      db
        .select()
        .from(operation)
        .where(whereClause)
        .orderBy(asc(operation.name))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.$count(operation, whereClause),
    ]);

    return { items, total, page, pageSize };
  });

export const getOperationById = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data: { id }, context: { activeOrganizationId, db } }) => {
    const [found] = await db
      .select()
      .from(operation)
      .where(and(eq(operation.id, id), eq(operation.organizationId, activeOrganizationId)));

    if (!found) throw new Error("Operación no encontrada");

    return found;
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
  .handler(async ({ data, context: { activeOrganizationId, db } }) =>
    updateOperationUseCase(db, activeOrganizationId, data),
  );

export const deleteOperation = createServerFn({ method: "POST" })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data: { id }, context: { activeOrganizationId, db } }) => {
    await db
      .delete(operation)
      .where(and(eq(operation.id, id), eq(operation.organizationId, activeOrganizationId)));
    return { success: true };
  });
