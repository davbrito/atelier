import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, getColumns, ilike, sql } from "drizzle-orm";
import * as z from "zod";
import * as schema from "#/db/schema";
import { organizationMiddleware } from "#/lib/auth/functions";
import { MAX_IMAGE_SIZE, storageMiddleware } from "#/lib/storage";
import { storageUrl } from "#/lib/utils";
import {
  createBudget as createBudgetUseCase,
  deleteBudget as deleteBudgetUseCase,
  updateBudget as updateBudgetUseCase,
} from "../application/budgets";

// ── Types ────────────────────────────────────────────────

export const budgetFormSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  hourlyRate: z.string(),
  /** When true, deletes the current image from storage and sets image to null. */
  deleteImage: z.boolean().optional(),
  /** When provided (with imageSize), a presigned upload URL scoped to this entity is returned. */
  imageContentType: z.string().optional(),
  imageSize: z.number().int().positive().max(MAX_IMAGE_SIZE).optional(),
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
      eq(schema.budget.organizationId, activeOrganizationId),
      search ? ilike(schema.budget.name, `%${search}%`) : undefined,
    );

    const [rows, total] = await Promise.all([
      db
        .select()
        .from(schema.budget)
        .where(whereClause)
        .orderBy(asc(schema.budget.name))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.$count(schema.budget, whereClause),
    ]);

    const items = rows.map((b) => ({ ...b, image: b.image && storageUrl(b.image) }));

    return { items, total, page, pageSize };
  });

export const getBudgetBySlug = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    const budget = await db.query.budget.findFirst({
      where: {
        slug: data.slug,
        organizationId: activeOrganizationId,
      },
    });

    if (!budget) throw new Error("Presupuesto no encontrado");

    const mats = await db
      .select({
        ...getColumns(schema.budgetMaterial),
        name: schema.material.name,
        unit: schema.material.unit,
        currentPrice: schema.material.currentPrice,
        amount: sql<string>`${schema.budgetMaterial.quantity} * ${schema.material.currentPrice}`.as(
          "amount",
        ),
      })
      .from(schema.budgetMaterial)
      .innerJoin(schema.material, eq(schema.material.id, schema.budgetMaterial.materialId))
      .where(eq(schema.budgetMaterial.budgetId, budget.id));

    const ops = await db
      .select({
        ...getColumns(schema.budgetOperation),
        name: schema.operation.name,
        amount:
          sql<string>`(${schema.budgetOperation.durationMinutes} / 60.0) * ${schema.budget.hourlyRate}`.as(
            "amount",
          ),
      })
      .from(schema.budgetOperation)
      .innerJoin(schema.operation, eq(schema.operation.id, schema.budgetOperation.operationId))
      .innerJoin(schema.budget, eq(schema.budget.id, schema.budgetOperation.budgetId))
      .where(eq(schema.budgetOperation.budgetId, budget.id));

    return {
      ...budget,
      image: budget.image && storageUrl(budget.image),
      materials: mats,
      operations: ops,
    };
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
      .select({
        ...getColumns(schema.budgetMaterial),
        name: schema.material.name,
        unit: schema.material.unit,
        currentPrice: schema.material.currentPrice,
      })
      .from(schema.budgetMaterial)
      .innerJoin(schema.material, eq(schema.material.id, schema.budgetMaterial.materialId))
      .where(eq(schema.budgetMaterial.budgetId, data.id));

    const ops = await db
      .select({
        ...getColumns(schema.budgetOperation),
        name: schema.operation.name,
      })
      .from(schema.budgetOperation)
      .innerJoin(schema.operation, eq(schema.operation.id, schema.budgetOperation.operationId))
      .where(eq(schema.budgetOperation.budgetId, data.id));

    return {
      ...budget,
      image: budget.image && storageUrl(budget.image),
      materials: mats,
      operations: ops,
    };
  });

// ── Mutations ────────────────────────────────────────────

export const createBudget = createServerFn({ method: "POST" })
  .validator(budgetFormSchema)
  .middleware([organizationMiddleware, storageMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db, createEntityPresignedUrl } }) => {
    const newBudget = await db.transaction((tx) =>
      createBudgetUseCase(tx, activeOrganizationId, data),
    );

    // Generate presigned URL after commit so the entity ID is final
    if (data.imageContentType && data.imageSize) {
      const presigned = await createEntityPresignedUrl(
        "budgets",
        newBudget.id,
        data.imageContentType,
        data.imageSize,
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
      context: { activeOrganizationId, db, removeItemSafe, createEntityPresignedUrl },
    }) => {
      const { updated, existingImage } = await db.transaction((tx) =>
        updateBudgetUseCase(tx, activeOrganizationId, id, data),
      );

      // Delete old image from storage after successful DB update. Best-effort:
      // a stale or corrupt previous object must not surface as an update failure.
      // On replace (imageContentType set), the old object is instead cleaned
      // up by setEntityImage once the new upload is actually committed —
      // deleting it here would leave a broken reference if the client's
      // upload PUT never lands.
      if (existingImage && data.deleteImage) {
        await removeItemSafe(existingImage);
      }

      if (data.imageContentType && data.imageSize) {
        const presigned = await createEntityPresignedUrl(
          "budgets",
          id,
          data.imageContentType,
          data.imageSize,
        );
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
  .handler(async ({ data: { id }, context: { activeOrganizationId, db, removeItemSafe } }) => {
    // Delete the DB row first and only then the storage object, best-effort:
    // if the DB delete fails, no reference is left dangling; if the storage
    // delete fails, it's just an unreferenced (harmless) orphan object.
    const deleted = await deleteBudgetUseCase(db, activeOrganizationId, id);

    if (deleted.image) {
      await removeItemSafe(deleted.image);
    }

    return { success: true };
  });
