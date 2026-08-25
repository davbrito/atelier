import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { organizationMiddleware } from "#/lib/auth/functions";
import { MAX_IMAGE_SIZE, storageMiddleware } from "#/lib/storage";
import {
  createBudget as createBudgetUseCase,
  deleteBudget as deleteBudgetUseCase,
  getBudgetById as getBudgetByIdUseCase,
  getBudgetBySlug as getBudgetBySlugUseCase,
  listBudgets as listBudgetsUseCase,
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
  .handler(async ({ data, context: { activeOrganizationId, db } }) =>
    listBudgetsUseCase(db, activeOrganizationId, data),
  );

export const getBudgetBySlug = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ slug: z.string() }))
  .handler(async ({ data, context: { activeOrganizationId, db } }) =>
    getBudgetBySlugUseCase(db, activeOrganizationId, data.slug),
  );

export const getBudgetById = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data, context: { activeOrganizationId, db } }) =>
    getBudgetByIdUseCase(db, activeOrganizationId, data.id),
  );

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
