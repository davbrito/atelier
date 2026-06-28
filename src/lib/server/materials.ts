import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import * as z from "zod";
import { transactionMiddleware } from "#/db/middleware";
import { material, materialPriceHistory } from "#/db/schema";
import { createEntityPresignedUrl, deleteObject } from "#/lib/storage";
import { authenticatedMiddleware } from "../auth/functions";

export const listMaterials = createServerFn({ method: "GET" })
  .middleware([authenticatedMiddleware])
  .handler(async ({ context: { session, db } }) => {
    const activeOrganizationId = session.activeOrganizationId;
    if (!activeOrganizationId) {
      throw new Error(
        "No hay organización activa. Por favor, selecciona una organización para continuar.",
      );
    }
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
  .middleware([authenticatedMiddleware])
  .handler(async ({ data, context: { session, db } }) => {
    const activeOrganizationId = session.activeOrganizationId;
    if (!activeOrganizationId) {
      throw new Error(
        "No hay organización activa. Por favor, selecciona una organización para continuar.",
      );
    }
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
  .middleware([authenticatedMiddleware, transactionMiddleware])
  .validator(
    z.object({
      id: z.string(),
      name: z.string(),
      unit: z.string(),
      currentPrice: z.string(),
      /** When true, deletes the current image from storage and sets image to null. */
      deleteImage: z.boolean().optional(),
      /** When provided, returns a presigned upload URL scoped to this material. */
      imageContentType: z.string().optional(),
    }),
  )
  .handler(async ({ data, context: { trx } }) => {
    const { id, imageContentType, deleteImage, ...updateData } = data;
    const prevPrice = updateData.currentPrice;

    // Check if price changed to record history
    const [existing] = await trx
      .select({ currentPrice: material.currentPrice, image: material.image })
      .from(material)
      .where(eq(material.id, id));

    // Delete image from storage when the user explicitly removes it
    if (deleteImage && existing?.image) {
      await deleteObject(existing.image);
    }

    const [updated] = await trx
      .update(material)
      .set({
        ...updateData,
        image: deleteImage ? null : undefined,
      })
      .where(eq(material.id, id))
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
  .middleware([authenticatedMiddleware])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data: { id }, context: { db } }) => {
    // Delete the image from storage before removing the record
    const [existing] = await db
      .select({ image: material.image })
      .from(material)
      .where(eq(material.id, id));
    if (existing?.image) {
      await deleteObject(existing.image);
    }

    await db.delete(material).where(eq(material.id, id));
    return { success: true };
  });
