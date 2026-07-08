import { createServerFn } from "@tanstack/react-start";
import { and, asc, eq, getTableColumns, sql } from "drizzle-orm";
import * as z from "zod";
import { transactionMiddleware } from "#/db/middleware";
import { material, materialInventoryMovement, materialPriceHistory } from "#/db/schema";
import { organizationMiddleware } from "../auth/functions";
import { storageMiddleware } from "../storage";

export const listMaterials = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId, db } }) => {
    const stockSq = db
      .select({
        materialId: materialInventoryMovement.materialId,
        stock: sql<string>`COALESCE(SUM(${materialInventoryMovement.delta}), '0')`.as("stock"),
      })
      .from(materialInventoryMovement)
      .where(eq(materialInventoryMovement.organizationId, activeOrganizationId))
      .groupBy(materialInventoryMovement.materialId)
      .as("stock_sq");

    return await db
      .select({
        ...getTableColumns(material),
        currentStock: sql<string>`COALESCE(${stockSq.stock}, '0')`,
      })
      .from(material)
      .leftJoin(stockSq, eq(material.id, stockSq.materialId))
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
  .middleware([organizationMiddleware, storageMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db, createEntityPresignedUrl } }) => {
    const newMaterial = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(material)
        .values({
          organizationId: activeOrganizationId,
          name: data.name,
          unit: data.unit,
          currentPrice: data.currentPrice,
        })
        .returning();

      // Seed the history with the initial price so the timeline is complete
      // from creation (each row = the price value from that moment on).
      await tx.insert(materialPriceHistory).values({
        materialId: created.id,
        price: data.currentPrice,
      });

      return created;
    });

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
  .middleware([storageMiddleware])
  .handler(
    async ({ data, context: { activeOrganizationId, trx, createEntityPresignedUrl, storage } }) => {
      const { id, imageContentType, deleteImage, ...updateData } = data;

      const [existing] = await trx
        .select({ currentPrice: material.currentPrice, image: material.image })
        .from(material)
        .where(and(eq(material.id, id), eq(material.organizationId, activeOrganizationId)));

      if (!existing) throw new Error("Material no encontrado");

      // Delete image from storage when the user explicitly removes it
      if (deleteImage && existing.image) {
        await storage.removeItem(existing.image);
      }

      const [updated] = await trx
        .update(material)
        .set({
          ...updateData,
          image: deleteImage ? null : undefined,
        })
        .where(and(eq(material.id, id), eq(material.organizationId, activeOrganizationId)))
        .returning();

      // Record the new price when it actually changed. Compare numerically so
      // "10.00" and "10" aren't considered different, and skip inputs that
      // couldn't be parsed as a price.
      const prevPriceNum = Number(existing.currentPrice);
      const newPriceNum = Number(updateData.currentPrice);
      if (Number.isFinite(newPriceNum) && newPriceNum !== prevPriceNum) {
        await trx.insert(materialPriceHistory).values({
          materialId: id,
          price: updateData.currentPrice,
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
    },
  );

export const deleteMaterial = createServerFn({ method: "POST" })
  .middleware([organizationMiddleware, storageMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data: { id }, context: { activeOrganizationId, db, storage } }) => {
    // Delete the image from storage before removing the record
    const [existing] = await db
      .select({ image: material.image })
      .from(material)
      .where(and(eq(material.id, id), eq(material.organizationId, activeOrganizationId)));

    if (!existing) throw new Error("Material no encontrado");

    if (existing.image) {
      await storage.removeItem(existing.image);
    }

    await db
      .delete(material)
      .where(and(eq(material.id, id), eq(material.organizationId, activeOrganizationId)));
    return { success: true };
  });
