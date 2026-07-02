import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq } from "drizzle-orm";
import * as z from "zod";
import { transactionMiddleware } from "#/db/middleware";
import { material, materialPriceHistory } from "#/db/schema";
import { createEntityPresignedUrl, deleteObject } from "#/lib/storage";
import { organizationMiddleware } from "../auth/functions";

export const listMaterials = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId, db } }) => {
    return await db
      .select()
      .from(material)
      .where(eq(material.organizationId, activeOrganizationId))
      .orderBy(asc(material.name));
  });

export const createMaterial = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string(),
      unit: z.string(),
      currentPrice: z.string(),
      /** When provided, returns a presigned upload URL scoped to the new material. */
      imageContentType: z.string().optional(),
    }),
  )
  .middleware([organizationMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    const [newMaterial] = await db
      .insert(material)
      .values({
        organizationId: activeOrganizationId,
        name: data.name,
        unit: data.unit,
        currentPrice: data.currentPrice,
      })
      .returning();

    if (data.imageContentType) {
      const presigned = await createEntityPresignedUrl(
        "materials",
        newMaterial.id,
        data.imageContentType,
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
  .middleware([organizationMiddleware, transactionMiddleware])
  .validator(
    z.object({
      id: z.uuid(),
      name: z.string(),
      unit: z.string(),
      currentPrice: z.string(),
      /** When true, deletes the current image from storage and sets image to null. */
      deleteImage: z.boolean().optional(),
      /** When provided, returns a presigned upload URL scoped to this material. */
      imageContentType: z.string().optional(),
    }),
  )
  .handler(async ({ data, context: { activeOrganizationId, trx } }) => {
    const { id, imageContentType, deleteImage, ...updateData } = data;
    const prevPrice = updateData.currentPrice;

    // Check if price changed to record history
    const [existing] = await trx
      .select({ currentPrice: material.currentPrice, image: material.image })
      .from(material)
      .where(and(eq(material.id, id), eq(material.organizationId, activeOrganizationId)));

    if (!existing) throw new Error("Material no encontrado");

    // Delete image from storage when the user explicitly removes it
    if (deleteImage && existing.image) {
      await deleteObject(existing.image);
    }

    const [updated] = await trx
      .update(material)
      .set({
        ...updateData,
        image: deleteImage ? null : undefined,
      })
      .where(and(eq(material.id, id), eq(material.organizationId, activeOrganizationId)))
      .returning();

    if (existing && existing.currentPrice !== prevPrice) {
      await trx.insert(materialPriceHistory).values({
        materialId: id,
        price: prevPrice,
      });
    }

    if (imageContentType) {
      const presigned = await createEntityPresignedUrl("materials", id, imageContentType);
      if ("code" in presigned) {
        throw new Error(presigned.message);
      }

      return { ...updated, presignedImageUrl: presigned.uploadUrl, imageKey: presigned.key };
    }

    return updated;
  });

export const deleteMaterial = createServerFn({ method: "POST" })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data: { id }, context: { activeOrganizationId, db } }) => {
    // Delete the image from storage before removing the record
    const [existing] = await db
      .select({ image: material.image })
      .from(material)
      .where(and(eq(material.id, id), eq(material.organizationId, activeOrganizationId)));

    if (!existing) throw new Error("Material no encontrado");

    if (existing.image) {
      await deleteObject(existing.image);
    }

    await db
      .delete(material)
      .where(and(eq(material.id, id), eq(material.organizationId, activeOrganizationId)));
    return { success: true };
  });
