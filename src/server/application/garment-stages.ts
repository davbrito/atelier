import { and, asc, count, eq, inArray } from "drizzle-orm";
import type { Db } from "#/db/client";
import { garmentStage } from "#/db/schema";
import { DEFAULT_GARMENT_STAGES } from "#/lib/constants/garment-stages";

export async function listGarmentStages(db: Db, organizationId: string) {
  return db
    .select()
    .from(garmentStage)
    .where(eq(garmentStage.organizationId, organizationId))
    .orderBy(asc(garmentStage.position));
}

export type CreateGarmentStageInput = {
  name: string;
  color?: string;
  isFinalStage?: boolean;
};

export async function createGarmentStage(
  tx: Db,
  organizationId: string,
  data: CreateGarmentStageInput,
) {
  const [{ total }] = await tx
    .select({ total: count() })
    .from(garmentStage)
    .where(eq(garmentStage.organizationId, organizationId));

  const [newStage] = await tx
    .insert(garmentStage)
    .values({
      organizationId,
      name: data.name,
      color: data.color || null,
      isFinalStage: data.isFinalStage ?? false,
      position: total,
    })
    .returning();

  return newStage;
}

export type UpdateGarmentStageInput = {
  id: string;
  name: string;
  color?: string;
  isFinalStage?: boolean;
};

export async function updateGarmentStage(
  tx: Db,
  organizationId: string,
  data: UpdateGarmentStageInput,
) {
  const [existing] = await tx
    .select({ id: garmentStage.id })
    .from(garmentStage)
    .where(and(eq(garmentStage.id, data.id), eq(garmentStage.organizationId, organizationId)));

  if (!existing) throw new Error("Etapa no encontrada");

  const [updated] = await tx
    .update(garmentStage)
    .set({
      name: data.name,
      color: data.color || null,
      isFinalStage: data.isFinalStage ?? false,
    })
    .where(eq(garmentStage.id, data.id))
    .returning();

  return updated;
}

export async function deleteGarmentStage(db: Db, organizationId: string, id: string) {
  const [deleted] = await db
    .delete(garmentStage)
    .where(and(eq(garmentStage.id, id), eq(garmentStage.organizationId, organizationId)))
    .returning({ id: garmentStage.id });

  if (!deleted) throw new Error("Etapa no encontrada");
}

export async function reorderGarmentStages(tx: Db, organizationId: string, orderedIds: string[]) {
  const owned = await tx
    .select({ id: garmentStage.id })
    .from(garmentStage)
    .where(
      and(eq(garmentStage.organizationId, organizationId), inArray(garmentStage.id, orderedIds)),
    );

  if (owned.length !== orderedIds.length) {
    throw new Error("Alguna etapa no pertenece a esta organización");
  }

  await Promise.all(
    orderedIds.map((id, position) =>
      tx.update(garmentStage).set({ position }).where(eq(garmentStage.id, id)),
    ),
  );
}

/** No-op if the organization already has any stages — never overrides an existing setup. */
export async function seedDefaultGarmentStages(tx: Db, organizationId: string) {
  const [{ total }] = await tx
    .select({ total: count() })
    .from(garmentStage)
    .where(eq(garmentStage.organizationId, organizationId));

  if (total > 0) return;

  await tx.insert(garmentStage).values(
    DEFAULT_GARMENT_STAGES.map((stage, position) => ({
      organizationId,
      name: stage.name,
      color: stage.color,
      isFinalStage: stage.isFinalStage,
      isSystemDefault: true,
      position,
    })),
  );
}
