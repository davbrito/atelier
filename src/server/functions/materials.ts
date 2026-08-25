import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { organizationMiddleware } from "#/lib/auth/functions";
import { MAX_IMAGE_SIZE, storageMiddleware } from "#/lib/storage";
import {
  createMaterial as createMaterialUseCase,
  deleteMaterial as deleteMaterialUseCase,
  getMaterialById as getMaterialByIdUseCase,
  listMaterials as listMaterialsUseCase,
  updateMaterial as updateMaterialUseCase,
} from "../application/materials";

export const listMaterials = createServerFn({ method: "GET" })
  .validator(
    z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
      search: z.string().trim().optional(),
    }),
  )
  .middleware([organizationMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db } }) =>
    listMaterialsUseCase(db, activeOrganizationId, data),
  );

export const getMaterialById = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data: { id }, context: { activeOrganizationId, db } }) =>
    getMaterialByIdUseCase(db, activeOrganizationId, id),
  );

export const createMaterial = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().trim().min(1),
      unit: z.string().trim().min(1),
      currentPrice: z.string(),
      color: z.string().trim().optional(),
      colorName: z.string().trim().optional(),
      /** When provided (with imageSize), returns a presigned upload URL scoped to the new material. */
      imageContentType: z.string().optional(),
      imageSize: z.number().int().positive().max(MAX_IMAGE_SIZE).optional(),
    }),
  )
  .middleware([organizationMiddleware, storageMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db, createEntityPresignedUrl } }) => {
    const newMaterial = await db.transaction((tx) =>
      createMaterialUseCase(tx, activeOrganizationId, data),
    );

    if (data.imageContentType && data.imageSize) {
      const presigned = await createEntityPresignedUrl(
        "materials",
        newMaterial.id,
        data.imageContentType,
        data.imageSize,
      );
      if ("code" in presigned) {
        throw new Error(presigned.message);
      }

      return {
        ...newMaterial,
        presignedImageUrl: presigned.uploadUrl,
        imageKey: presigned.key,
      };
    }

    return newMaterial;
  });

export const updateMaterial = createServerFn({ method: "POST" })
  .middleware([organizationMiddleware, storageMiddleware])
  .validator(
    z.object({
      id: z.uuid(),
      name: z.string().trim().min(1),
      unit: z.string().trim().min(1),
      currentPrice: z.string(),
      color: z.string().trim().optional(),
      colorName: z.string().trim().optional(),
      /** When true, deletes the current image from storage and sets image to null. */
      deleteImage: z.boolean().optional(),
      /** When provided (with imageSize), returns a presigned upload URL scoped to this material. */
      imageContentType: z.string().optional(),
      imageSize: z.number().int().positive().max(MAX_IMAGE_SIZE).optional(),
    }),
  )
  .handler(
    async ({
      data,
      context: { activeOrganizationId, db, createEntityPresignedUrl, removeItemSafe },
    }) => {
      const { id, imageContentType, imageSize, ...updateData } = data;

      const { updated, existingImage } = await db.transaction((tx) =>
        updateMaterialUseCase(tx, activeOrganizationId, id, updateData),
      );

      // Delete image from storage after successful DB update. Best-effort:
      // a stale or corrupt previous object must not surface as an update failure.
      if (updateData.deleteImage && existingImage) {
        await removeItemSafe(existingImage);
      }

      if (imageContentType && imageSize) {
        const presigned = await createEntityPresignedUrl(
          "materials",
          id,
          imageContentType,
          imageSize,
        );
        if ("code" in presigned) {
          throw new Error(presigned.message);
        }

        return { ...updated, presignedImageUrl: presigned.uploadUrl, imageKey: presigned.key };
      }

      return updated;
    },
  );

export const deleteMaterial = createServerFn({ method: "POST" })
  .middleware([organizationMiddleware, storageMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data: { id }, context: { activeOrganizationId, db, removeItemSafe } }) => {
    // Delete the DB row first and only then the storage object, best-effort:
    // if the DB delete fails, no reference is left dangling; if the storage
    // delete fails, it's just an unreferenced (harmless) orphan object.
    const deleted = await deleteMaterialUseCase(db, activeOrganizationId, id);

    if (deleted.image) {
      await removeItemSafe(deleted.image);
    }

    return { success: true };
  });
