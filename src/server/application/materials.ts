import { and, eq } from "drizzle-orm";
import type { Db } from "#/db/client";
import { material, materialPriceHistory } from "#/db/schema";

export type CreateMaterialInput = {
  name: string;
  unit: string;
  currentPrice: string;
  color?: string;
  colorName?: string;
};

export async function createMaterial(tx: Db, organizationId: string, data: CreateMaterialInput) {
  const [created] = await tx
    .insert(material)
    .values({
      organizationId,
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
}

export type UpdateMaterialInput = {
  name: string;
  unit: string;
  currentPrice: string;
  color?: string;
  colorName?: string;
  deleteImage?: boolean;
};

export async function updateMaterial(
  tx: Db,
  organizationId: string,
  id: string,
  data: UpdateMaterialInput,
) {
  const [existing] = await tx
    .select({ currentPrice: material.currentPrice, image: material.image })
    .from(material)
    .where(and(eq(material.id, id), eq(material.organizationId, organizationId)));

  if (!existing) throw new Error("Material no encontrado");

  const [updated] = await tx
    .update(material)
    .set({
      name: data.name,
      unit: data.unit,
      currentPrice: data.currentPrice,
      color: data.color || null,
      colorName: data.colorName || null,
      image: data.deleteImage ? null : undefined,
    })
    .where(and(eq(material.id, id), eq(material.organizationId, organizationId)))
    .returning();

  // Record the new price when it actually changed. Compare numerically so
  // "10.00" and "10" aren't considered different, and skip inputs that
  // couldn't be parsed as a price.
  const prevPriceNum = Number(existing.currentPrice);
  const newPriceNum = Number(data.currentPrice);
  if (Number.isFinite(newPriceNum) && newPriceNum !== prevPriceNum) {
    await tx.insert(materialPriceHistory).values({
      materialId: id,
      price: data.currentPrice,
    });
  }

  return { updated, existingImage: existing.image };
}

export async function deleteMaterial(db: Db, organizationId: string, id: string) {
  const [deleted] = await db
    .delete(material)
    .where(and(eq(material.id, id), eq(material.organizationId, organizationId)))
    .returning({ image: material.image });

  if (!deleted) throw new Error("Material no encontrado");

  return deleted;
}
