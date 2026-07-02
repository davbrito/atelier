import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq } from "drizzle-orm";
import * as z from "zod";
import { operation } from "#/db/schema";
import { organizationMiddleware } from "../auth/functions";

export const listOperations = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId, db } }) => {
    return await db
      .select()
      .from(operation)
      .where(eq(operation.organizationId, activeOrganizationId))
      .orderBy(asc(operation.name));
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
