import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { organizationMiddleware } from "#/lib/auth/functions";
import { cacheMeasurementNames } from "#/server/application/measurement-names";
import {
  createClient as createClientUseCase,
  deleteClient as deleteClientUseCase,
  getClientById as getClientByIdUseCase,
  listClients as listClientsUseCase,
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
  .handler(async ({ data, context: { activeOrganizationId, db } }) =>
    listClientsUseCase(db, activeOrganizationId, data),
  );

export const getClientById = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data, context: { activeOrganizationId, db } }) =>
    getClientByIdUseCase(db, activeOrganizationId, data.id),
  );

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
