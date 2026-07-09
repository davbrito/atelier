import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq } from "drizzle-orm";
import * as z from "zod";
import * as schema from "#/db/schema";
import { organizationMiddleware } from "../auth/functions";

// ── Types ────────────────────────────────────────────────

export const clientFormSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.email().optional().or(z.literal("")),
  notes: z.string().optional(),
  measurements: z.array(
    z.object({
      name: z.string().min(1),
      value: z.string().min(1),
    }),
  ),
});

// ── Queries ──────────────────────────────────────────────

export const listClients = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId, db } }) => {
    return await db
      .select()
      .from(schema.client)
      .where(eq(schema.client.organizationId, activeOrganizationId))
      .orderBy(asc(schema.client.name));
  });

export const getClientById = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    const [client] = await db
      .select()
      .from(schema.client)
      .where(
        and(eq(schema.client.id, data.id), eq(schema.client.organizationId, activeOrganizationId)),
      );

    if (!client) throw new Error("Cliente no encontrado");

    const measurements = await db
      .select()
      .from(schema.clientMeasurement)
      .where(eq(schema.clientMeasurement.clientId, client.id));

    return { ...client, measurements };
  });

// ── Mutations ────────────────────────────────────────────

export const createClient = createServerFn({ method: "POST" })
  .validator(clientFormSchema)
  .middleware([organizationMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    return await db.transaction(async (tx) => {
      const [newClient] = await tx
        .insert(schema.client)
        .values({
          organizationId: activeOrganizationId,
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          notes: data.notes || null,
        })
        .returning();

      if (data.measurements.length > 0) {
        await tx.insert(schema.clientMeasurement).values(
          data.measurements.map((m) => ({
            clientId: newClient.id,
            name: m.name,
            value: m.value,
          })),
        );
      }

      return newClient;
    });
  });

export const updateClient = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid(), data: clientFormSchema }))
  .middleware([organizationMiddleware])
  .handler(async ({ data: { id, data }, context: { activeOrganizationId, db } }) => {
    return await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: schema.client.id })
        .from(schema.client)
        .where(
          and(eq(schema.client.id, id), eq(schema.client.organizationId, activeOrganizationId)),
        );

      if (!existing) throw new Error("Cliente no encontrado");

      await tx
        .update(schema.client)
        .set({
          name: data.name,
          phone: data.phone || null,
          email: data.email || null,
          notes: data.notes || null,
        })
        .where(eq(schema.client.id, id));

      await tx.delete(schema.clientMeasurement).where(eq(schema.clientMeasurement.clientId, id));
      if (data.measurements.length > 0) {
        await tx.insert(schema.clientMeasurement).values(
          data.measurements.map((m) => ({
            clientId: id,
            name: m.name,
            value: m.value,
          })),
        );
      }

      const [updated] = await tx.select().from(schema.client).where(eq(schema.client.id, id));
      return updated;
    });
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data: { id }, context: { activeOrganizationId, db } }) => {
    const [existing] = await db
      .select({ id: schema.client.id })
      .from(schema.client)
      .where(and(eq(schema.client.id, id), eq(schema.client.organizationId, activeOrganizationId)));

    if (!existing) throw new Error("Cliente no encontrado");

    await db
      .delete(schema.client)
      .where(and(eq(schema.client.id, id), eq(schema.client.organizationId, activeOrganizationId)));
    return { success: true };
  });
