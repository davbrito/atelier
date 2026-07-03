import slugify from "@sindresorhus/slugify";
import { createServerFn } from "@tanstack/react-start";
import { generateRandomString } from "better-auth/crypto";
import { and, asc, eq } from "drizzle-orm";
import * as z from "zod";
import * as schema from "#/db/schema";
import { organizationMiddleware } from "../auth/functions";
import { storageMiddleware } from "../storage";

// ── Types ────────────────────────────────────────────────

export const budgetFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  hourlyRate: z.string(),
  /** When true, deletes the current image from storage and sets image to null. */
  deleteImage: z.boolean().optional(),
  /** When provided, a presigned upload URL scoped to this entity is returned. */
  imageContentType: z.string().optional(),
  materials: z.array(
    z.object({
      materialId: z.string(),
      quantity: z.string(),
    }),
  ),
  operations: z.array(
    z.object({
      operationId: z.string(),
      durationMinutes: z.number().min(1),
    }),
  ),
});

// ── Queries ──────────────────────────────────────────────

export const listBudgets = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId, db } }) => {
    return await db
      .select()
      .from(schema.budget)
      .where(eq(schema.budget.organizationId, activeOrganizationId))
      .orderBy(asc(schema.budget.name));
  });

export const getBudgetBySlug = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    const [budget] = await db
      .select()
      .from(schema.budget)
      .where(
        and(
          eq(schema.budget.slug, data.slug),
          eq(schema.budget.organizationId, activeOrganizationId),
        ),
      );

    if (!budget) throw new Error("Presupuesto no encontrado");

    const mats = await db
      .select()
      .from(schema.budgetMaterial)
      .where(eq(schema.budgetMaterial.budgetId, budget.id));

    const ops = await db
      .select()
      .from(schema.budgetOperation)
      .where(eq(schema.budgetOperation.budgetId, budget.id));

    return { ...budget, materials: mats, operations: ops };
  });

export const getBudgetById = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    const [budget] = await db
      .select()
      .from(schema.budget)
      .where(
        and(eq(schema.budget.id, data.id), eq(schema.budget.organizationId, activeOrganizationId)),
      );

    if (!budget) throw new Error("Presupuesto no encontrado");

    const mats = await db
      .select()
      .from(schema.budgetMaterial)
      .where(eq(schema.budgetMaterial.budgetId, data.id));

    const ops = await db
      .select()
      .from(schema.budgetOperation)
      .where(eq(schema.budgetOperation.budgetId, data.id));

    return { ...budget, materials: mats, operations: ops };
  });

// ── Mutations ────────────────────────────────────────────

export const createBudget = createServerFn({ method: "POST" })
  .validator(budgetFormSchema)
  .middleware([organizationMiddleware, storageMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db, createEntityPresignedUrl } }) => {
    const newBudget = await db.transaction(async (tx) => {
      const nameSlug = slugify(data.name);
      let slug = nameSlug;
      while (
        await tx.$count(
          tx.select().from(schema.budget).where(eq(schema.budget.slug, slug)).limit(1),
        )
      ) {
        slug = `${nameSlug}_${generateRandomString(4)}`;
      }

      const [budget] = await tx
        .insert(schema.budget)
        .values({
          organizationId: activeOrganizationId,
          slug,
          name: data.name,
          description: data.description ?? null,
          hourlyRate: data.hourlyRate,
        })
        .returning();

      if (data.materials.length > 0) {
        await tx.insert(schema.budgetMaterial).values(
          data.materials.map((m) => ({
            budgetId: budget.id,
            materialId: m.materialId,
            quantity: m.quantity,
          })),
        );
      }

      if (data.operations.length > 0) {
        await tx.insert(schema.budgetOperation).values(
          data.operations.map((o) => ({
            budgetId: budget.id,
            operationId: o.operationId,
            durationMinutes: o.durationMinutes,
          })),
        );
      }

      return budget;
    });

    // Generate presigned URL after commit so the entity ID is final
    if (data.imageContentType) {
      const presigned = await createEntityPresignedUrl(
        "budgets",
        newBudget.id,
        data.imageContentType,
      );
      if ("code" in presigned) {
        throw new Error(presigned.message);
      }

      return { ...newBudget, presignedImageUrl: presigned.uploadUrl, imageKey: presigned.key };
    }

    return newBudget;
  });

export const updateBudget = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid(), data: budgetFormSchema }))
  .middleware([organizationMiddleware, storageMiddleware])
  .handler(
    async ({
      data: { id, data },
      context: { activeOrganizationId, db, storage, createEntityPresignedUrl },
    }) => {
      const [existing] = await db
        .select({ image: schema.budget.image, slug: schema.budget.slug })
        .from(schema.budget)
        .where(
          and(eq(schema.budget.id, id), eq(schema.budget.organizationId, activeOrganizationId)),
        );

      if (!existing) {
        throw new Error("Presupuesto no encontrado");
      }

      const updated = await db.transaction(async (tx) => {
        // Regenerate the slug from the (possibly new) name, dedup against
        // other budgets — the current one is allowed to keep its own slug.
        // Without this, renaming to a name that collides with another budget
        // would break with a UNIQUE constraint violation.
        const nameSlug = slugify(data.name);
        let slug = nameSlug;
        while (
          slug !== existing.slug &&
          (await tx.$count(
            tx.select().from(schema.budget).where(eq(schema.budget.slug, slug)).limit(1),
          ))
        ) {
          slug = `${nameSlug}_${generateRandomString(4)}`;
        }

        await tx
          .update(schema.budget)
          .set({
            slug,
            name: data.name,
            description: data.description ?? null,
            hourlyRate: data.hourlyRate,
            image: data.deleteImage ? null : existing.image,
          })
          .where(
            and(eq(schema.budget.id, id), eq(schema.budget.organizationId, activeOrganizationId)),
          );

        // Replace materials
        await tx.delete(schema.budgetMaterial).where(eq(schema.budgetMaterial.budgetId, id));
        if (data.materials.length > 0) {
          await tx.insert(schema.budgetMaterial).values(
            data.materials.map((m) => ({
              budgetId: id,
              materialId: m.materialId,
              quantity: m.quantity,
            })),
          );
        }

        // Replace operations
        await tx.delete(schema.budgetOperation).where(eq(schema.budgetOperation.budgetId, id));
        if (data.operations.length > 0) {
          await tx.insert(schema.budgetOperation).values(
            data.operations.map((o) => ({
              budgetId: id,
              operationId: o.operationId,
              durationMinutes: o.durationMinutes,
            })),
          );
        }

        const [row] = await tx.select().from(schema.budget).where(eq(schema.budget.id, id));
        return row;
      });

      // Delete old image from storage after successful DB update
      if (existing?.image && (data.deleteImage || data.imageContentType)) {
        await storage.removeItem(existing.image);
      }

      if (data.imageContentType) {
        const presigned = await createEntityPresignedUrl("budgets", id, data.imageContentType);
        if ("code" in presigned) {
          throw new Error(presigned.message);
        }

        return { ...updated, presignedImageUrl: presigned.uploadUrl, imageKey: presigned.key };
      }

      return updated;
    },
  );

export const deleteBudget = createServerFn({ method: "POST" })
  .middleware([organizationMiddleware, storageMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data: { id }, context: { activeOrganizationId, db, storage } }) => {
    // Delete the image from storage before removing the record
    const [existing] = await db
      .select({ image: schema.budget.image })
      .from(schema.budget)
      .where(and(eq(schema.budget.id, id), eq(schema.budget.organizationId, activeOrganizationId)));

    if (!existing) throw new Error("Presupuesto no encontrado");

    if (existing.image) {
      await storage.removeItem(existing.image);
    }

    await db
      .delete(schema.budget)
      .where(and(eq(schema.budget.id, id), eq(schema.budget.organizationId, activeOrganizationId)));
    return { success: true };
  });
