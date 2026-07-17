import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, eq, ilike } from "drizzle-orm";
import * as z from "zod";
import * as schema from "#/db/schema";
import { organizationMiddleware } from "../auth/functions";
import { cacheMeasurementNames } from "./measurement-names";

// ── Types ────────────────────────────────────────────────

export const clientFormSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  notes: z.string().trim().optional(),
  measurements: z.array(
    z.object({
      name: z.string().trim().min(1),
      value: z.coerce.number(),
    }),
  ),
});

// ── Queries ──────────────────────────────────────────────

export const listClients = createServerFn({ method: "GET" })
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
      eq(schema.client.organizationId, activeOrganizationId),
      search ? ilike(schema.client.name, `%${search}%`) : undefined,
    );

    const [items, [{ total }]] = await Promise.all([
      db
        .select()
        .from(schema.client)
        .where(whereClause)
        .orderBy(asc(schema.client.name))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ total: count() }).from(schema.client).where(whereClause),
    ]);

    return { items, total, page, pageSize };
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
  .handler(async ({ data, context: { activeOrganizationId, db, env } }) => {
    const newClient = await db.transaction(async (tx) => {
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

    await cacheMeasurementNames(
      env.KV,
      activeOrganizationId,
      data.measurements.map((m) => m.name),
    );

    return newClient;
  });

export const updateClient = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid(), data: clientFormSchema }))
  .middleware([organizationMiddleware])
  .handler(async ({ data: { id, data }, context: { activeOrganizationId, db, env } }) => {
    const updated = await db.transaction(async (tx) => {
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

    await cacheMeasurementNames(
      env.KV,
      activeOrganizationId,
      data.measurements.map((m) => m.name),
    );

    return updated;
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
