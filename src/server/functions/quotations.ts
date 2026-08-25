import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { organizationMiddleware } from "#/lib/auth/functions";
import {
  createQuotation as createQuotationUseCase,
  deleteQuotation as deleteQuotationUseCase,
  getQuotationBySlug as getQuotationBySlugUseCase,
  getQuotation as getQuotationUseCase,
  listQuotations as listQuotationsUseCase,
} from "../application/quotations";

// ── Queries ──────────────────────────────────────────────

export const listQuotations = createServerFn({ method: "GET" })
  .validator(
    z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
    }),
  )
  .middleware([organizationMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db } }) =>
    listQuotationsUseCase(db, activeOrganizationId, data),
  );

export const getQuotation = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data, context: { activeOrganizationId, db } }) =>
    getQuotationUseCase(db, activeOrganizationId, data.id),
  );

export const getQuotationBySlug = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data, context: { activeOrganizationId, db } }) =>
    getQuotationBySlugUseCase(db, activeOrganizationId, data.slug),
  );

// ── Mutations ────────────────────────────────────────────

export const createQuotationSchema = z.object({
  budgetIds: z.array(z.uuid()).min(1),
  clientId: z.uuid(),
});

export const createQuotation = createServerFn({ method: "POST" })
  .validator(createQuotationSchema)
  .middleware([organizationMiddleware])
  .handler(async ({ data, context: { activeOrganizationId: organizationId, db } }) => {
    return await db.transaction((tx) => createQuotationUseCase(tx, organizationId, data));
  });

export const deleteQuotation = createServerFn({ method: "POST" })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data: { id }, context: { activeOrganizationId, db } }) => {
    await deleteQuotationUseCase(db, activeOrganizationId, id);
    return { success: true };
  });
