import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import * as z from "zod";
import { operation } from "#/db/schema";
import { authenticatedMiddleware } from "../auth/functions";

export const listOperations = createServerFn({ method: "GET" })
  .middleware([authenticatedMiddleware])
  .handler(async ({ context: { session, db } }) => {
    const activeOrganizationId = session.activeOrganizationId;
    if (!activeOrganizationId) {
      throw new Error(
        "No hay organización activa. Por favor, selecciona una organización para continuar.",
      );
    }
    return await db
      .select()
      .from(operation)
      .where(eq(operation.organizationId, activeOrganizationId))
      .orderBy(asc(operation.name));
  });

export const createOperation = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string(), defaultDurationMinutes: z.number().optional() }))
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context: { session, db } }) => {
    const activeOrganizationId = session.activeOrganizationId;
    if (!activeOrganizationId) {
      throw new Error(
        "No hay organización activa. Por favor, selecciona una organización para continuar.",
      );
    }
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
  .middleware([authenticatedMiddleware])
  .validator(
    z.object({
      id: z.string(),
      name: z.string(),
      defaultDurationMinutes: z.number().optional(),
    }),
  )
  .handler(async ({ data, context: { db } }) => {
    const { id, ...updateData } = data;
    const [updated] = await db
      .update(operation)
      .set(updateData)
      .where(eq(operation.id, id))
      .returning();

    return updated;
  });

export const deleteOperation = createServerFn({ method: "POST" })
  .middleware([authenticatedMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data: { id }, context: { db } }) => {
    await db.delete(operation).where(eq(operation.id, id));
    return { success: true };
  });
