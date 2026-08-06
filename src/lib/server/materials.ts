import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, eq, getColumns, ilike, sql } from "drizzle-orm";
import * as z from "zod";
import { material, materialInventoryMovement, materialPriceHistory } from "#/db/schema";
import { organizationMiddleware } from "../auth/functions";
import { MAX_IMAGE_SIZE, storageMiddleware } from "../storage";
import { storageUrl } from "../utils";

export const listMaterials = createServerFn({ method: "GET" })
  .validator(
    z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
      search: z.string().trim().optional(),
    }),
  )
  .middleware([organizationMiddleware])
  .handler(async ({ data: { page, pageSize, search }, context: { activeOrganizationId, db } }) => {
    console.log("listing materials");
    const stockSq = db
      .select({
        materialId: materialInventoryMovement.materialId,
        stock: sql<string>`COALESCE(SUM(${materialInventoryMovement.delta}), '0')`.as("stock"),
      })
      .from(materialInventoryMovement)
      .where(eq(materialInventoryMovement.organizationId, activeOrganizationId))
      .groupBy(materialInventoryMovement.materialId)
      .as("stock_sq");

    const whereClause = and(
      eq(material.organizationId, activeOrganizationId),
      search ? ilike(material.name, `%${search}%`) : undefined,
    );

    const [items, [{ total }]] = await Promise.all([
      db
        .select({
          ...getColumns(material),
          currentStock: sql<string>`COALESCE(${stockSq.stock}, '0')`,
        })
        .from(material)
        .leftJoin(stockSq, eq(material.id, stockSq.materialId))
        .where(whereClause)
        .orderBy(asc(material.name))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      db.select({ total: count() }).from(material).where(whereClause),
    ]);

    return {
      items: items.map((item) => ({ ...item, image: item.image && storageUrl(item.image) })),
      total,
      page,
      pageSize,
    };
  });

export const getMaterialById = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data: { id }, context: { activeOrganizationId, db } }) => {
    const stockSq = db
      .select({
        materialId: materialInventoryMovement.materialId,
        stock: sql<string>`COALESCE(SUM(${materialInventoryMovement.delta}), '0')`.as("stock"),
      })
      .from(materialInventoryMovement)
      .where(eq(materialInventoryMovement.organizationId, activeOrganizationId))
      .groupBy(materialInventoryMovement.materialId)
      .as("stock_sq");

    const [found] = await db
      .select({
        ...getColumns(material),
        currentStock: sql<string>`COALESCE(${stockSq.stock}, '0')`,
      })
      .from(material)
      .leftJoin(stockSq, eq(material.id, stockSq.materialId))
      .where(and(eq(material.id, id), eq(material.organizationId, activeOrganizationId)));

    if (!found) throw new Error("Material no encontrado");

    return { ...found, image: found.image && storageUrl(found.image) };
  });

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
    const newMaterial = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(material)
        .values({
          organizationId: activeOrganizationId,
          name: data.name,
          unit: data.unit,
          currentPrice: data.currentPrice,
          color: data.color || null,
          colorName: data.colorName || null,
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
      const { id, imageContentType, imageSize, deleteImage, ...updateData } = data;

      const { updated, existingImage } = await db.transaction(async (tx) => {
        const [existing] = await tx
          .select({ currentPrice: material.currentPrice, image: material.image })
          .from(material)
          .where(and(eq(material.id, id), eq(material.organizationId, activeOrganizationId)));

        if (!existing) throw new Error("Material no encontrado");

        const [updated] = await tx
          .update(material)
          .set({
            ...updateData,
            color: updateData.color || null,
            colorName: updateData.colorName || null,
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
          await tx.insert(materialPriceHistory).values({
            materialId: id,
            price: updateData.currentPrice,
          });
        }

        return { updated, existingImage: existing.image };
      });

      // Delete image from storage after successful DB update. Best-effort:
      // a stale or corrupt previous object must not surface as an update failure.
      if (deleteImage && existingImage) {
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
    const [deleted] = await db
      .delete(material)
      .where(and(eq(material.id, id), eq(material.organizationId, activeOrganizationId)))
      .returning({ image: material.image });

    if (!deleted) throw new Error("Material no encontrado");

    if (deleted.image) {
      await removeItemSafe(deleted.image);
    }

    return { success: true };
  });
