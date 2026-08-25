import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, eq, ilike } from "drizzle-orm";
import * as z from "zod";
import * as schema from "#/db/schema";
import { organizationMiddleware } from "#/lib/auth/functions";
import { cacheMeasurementNames } from "#/server/application/measurement-names";
import {
  createClient as createClientUseCase,
  deleteClient as deleteClientUseCase,
  updateClient as updateClientUseCase,
} from "../application/clients";

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
    const newClient = await db.transaction((tx) =>
      createClientUseCase(tx, activeOrganizationId, data),
    );

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
    const updated = await db.transaction((tx) =>
      updateClientUseCase(tx, activeOrganizationId, id, data),
    );

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
    await deleteClientUseCase(db, activeOrganizationId, id);
    return { success: true };
  });
