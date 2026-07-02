import slugify from "@sindresorhus/slugify";
import { createServerFn } from "@tanstack/react-start";
import { generateRandomString } from "better-auth/crypto";
import { and, asc, eq } from "drizzle-orm";
import * as z from "zod";
import * as schema from "#/db/schema";
import { organizationMiddleware } from "../auth/functions";

// ── Queries ──────────────────────────────────────────────

export const listQuotations = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId, db } }) => {
    return await db
      .select()
      .from(schema.quotation)
      .where(eq(schema.quotation.organizationId, activeOrganizationId))
      .orderBy(asc(schema.quotation.createdAt));
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

    const mats = await db
      .select()
      .from(schema.quotationMaterial)
      .where(eq(schema.quotationMaterial.quotationId, data.id));

    const ops = await db
      .select()
      .from(schema.quotationOperation)
      .where(eq(schema.quotationOperation.quotationId, data.id));

    return { ...quotation, materials: mats, operations: ops };
  });

// ── Mutations ────────────────────────────────────────────

export const createQuotation = createServerFn({ method: "POST" })
  .validator(
    z.object({
      budgetId: z.uuid(),
      clientTitle: z.string().min(1),
    }),
  )
  .middleware([organizationMiddleware])
  .handler(async ({ data, context: { activeOrganizationId: organizationId, db } }) => {
    return await db.transaction(async (tx) => {
      // Load budget with its materials and operations
      const budget = await tx.query.budget.findFirst({
        where: { id: data.budgetId, organizationId },
      });

      if (!budget) throw new Error("Presupuesto no encontrado");

      const budgetMats = await tx
        .select()
        .from(schema.budgetMaterial)
        .where(eq(schema.budgetMaterial.budgetId, data.budgetId));

      const budgetOps = await tx
        .select()
        .from(schema.budgetOperation)
        .where(eq(schema.budgetOperation.budgetId, data.budgetId));

      const titleSlug = slugify(data.clientTitle);
      let slug = titleSlug;
      while (
        await tx.$count(
          tx.select().from(schema.quotation).where(eq(schema.quotation.slug, slug)).limit(1),
        )
      ) {
        slug = `${titleSlug}_${generateRandomString(4)}`;
      }

      // Create the quotation
      const [quotation] = await tx
        .insert(schema.quotation)
        .values({
          organizationId,
          slug,
          budgetId: data.budgetId,
          clientTitle: data.clientTitle,
        })
        .returning();

      // Freeze materials with current prices
      if (budgetMats.length > 0) {
        const catalogMats = await tx
          .select()
          .from(schema.material)
          .where(eq(schema.material.organizationId, organizationId));

        const materialMap = new Map(
          catalogMats.map((m) => [m.id, { price: m.currentPrice, unit: m.unit }]),
        );

        await tx.insert(schema.quotationMaterial).values(
          budgetMats.map((bm) => {
            const catalog = materialMap.get(bm.materialId);
            return {
              quotationId: quotation.id,
              materialId: bm.materialId,
              quantity: bm.quantity,
              frozenPrice: catalog?.price ?? "0",
              frozenUnit: catalog?.unit ?? "unit",
            };
          }),
        );
      }

      // Freeze operations with current hourly rate
      if (budgetOps.length > 0) {
        await tx.insert(schema.quotationOperation).values(
          budgetOps.map((bo) => ({
            quotationId: quotation.id,
            operationId: bo.operationId,
            durationMinutes: bo.durationMinutes,
            frozenHourlyRate: budget.hourlyRate,
          })),
        );
      }

      return quotation;
    });
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
