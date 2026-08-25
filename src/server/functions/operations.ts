import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { organizationMiddleware } from "#/lib/auth/functions";
import {
  createOperation as createOperationUseCase,
  deleteOperation as deleteOperationUseCase,
  getOperationById as getOperationByIdUseCase,
  listOperations as listOperationsUseCase,
  updateOperation as updateOperationUseCase,
} from "../application/operations";

export const listOperations = createServerFn({ method: "GET" })
  .validator(
    z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
      search: z.string().trim().optional(),
    }),
  )
  .middleware([organizationMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db } }) =>
    listOperationsUseCase(db, activeOrganizationId, data),
  );

export const getOperationById = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data: { id }, context: { activeOrganizationId, db } }) =>
    getOperationByIdUseCase(db, activeOrganizationId, id),
  );

export const createOperation = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string(), defaultDurationMinutes: z.number().optional() }))
  .middleware([organizationMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db } }) =>
    createOperationUseCase(db, activeOrganizationId, data),
  );

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
    await deleteOperationUseCase(db, activeOrganizationId, id);
    return { success: true };
  });
