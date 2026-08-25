import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import * as z from "zod";
import * as schema from "#/db/schema";
import { organizationMiddleware } from "#/lib/auth/functions";
import {
  quotationBySlugQuery,
  quotationsCountQuery,
  quotationsQuery,
} from "#/lib/services/quotations";
import {
  createQuotation as createQuotationUseCase,
  loadQuotationLines,
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
  .handler(async ({ data: { page, pageSize }, context: { activeOrganizationId, db } }) => {
    const [items, total] = await Promise.all([
      quotationsQuery(db, {
        page,
        pageSize,
        organizationId: activeOrganizationId,
      }),
      quotationsCountQuery(db, {
        page,
        pageSize,
        organizationId: activeOrganizationId,
      }),
    ]);

    return { items, total, page, pageSize };
  });

export const getQuotation = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    const [quotation] = await db
      .select()
      .from(schema.quotation)
      .where(
        and(
          eq(schema.quotation.id, data.id),
          eq(schema.quotation.organizationId, activeOrganizationId),
        ),
      );

    if (!quotation) throw new Error("Cotización no encontrada");

    const lines = await loadQuotationLines(db, quotation.id);

    return { ...quotation, lines };
  });

export const getQuotationBySlug = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    const [quotation] = await quotationBySlugQuery(db, {
      slug: data.slug,
      organizationId: activeOrganizationId,
    });

    if (!quotation) throw new Error("Cotización no encontrada");

    const [lines, [relatedOrder]] = await Promise.all([
      loadQuotationLines(db, quotation.id),
      db
        .select({ code: schema.order.code, status: schema.order.status })
        .from(schema.order)
        .where(eq(schema.order.quotationId, quotation.id)),
    ]);

    return { ...quotation, lines, relatedOrder: relatedOrder ?? null };
  });

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
    await db
      .delete(schema.quotation)
      .where(
        and(eq(schema.quotation.id, id), eq(schema.quotation.organizationId, activeOrganizationId)),
      );
    return { success: true };
  });
