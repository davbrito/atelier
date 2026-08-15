import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import * as z from "zod";
import { garmentStage } from "#/db/schema";
import { DEFAULT_GARMENT_STAGES } from "#/lib/constants/garment-stages";
import { organizationMiddleware } from "../auth/functions";

// ── Queries ──────────────────────────────────────────────

export const listGarmentStages = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId, db } }) => {
    const items = await db
      .select()
      .from(garmentStage)
      .where(eq(garmentStage.organizationId, activeOrganizationId))
      .orderBy(asc(garmentStage.position));

    return { items };
  });

// ── Mutations ────────────────────────────────────────────

export const createGarmentStage = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().trim().min(1),
      color: z.string().trim().optional(),
      isFinalStage: z.boolean().optional(),
    }),
  )
  .middleware([organizationMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    const created = await db.transaction(async (tx) => {
      const [{ total }] = await tx
        .select({ total: count() })
        .from(garmentStage)
        .where(eq(garmentStage.organizationId, activeOrganizationId));

      const [newStage] = await tx
        .insert(garmentStage)
        .values({
          organizationId: activeOrganizationId,
          name: data.name,
          color: data.color || null,
          isFinalStage: data.isFinalStage ?? false,
          position: total,
        })
        .returning();

      return newStage;
    });

    return created;
  });

export const updateGarmentStage = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.uuid(),
      name: z.string().trim().min(1),
      color: z.string().trim().optional(),
      isFinalStage: z.boolean().optional(),
    }),
  )
  .middleware([organizationMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    const updated = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: garmentStage.id })
        .from(garmentStage)
        .where(
          and(eq(garmentStage.id, data.id), eq(garmentStage.organizationId, activeOrganizationId)),
        );

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
    });

    return updated;
  });

export const deleteGarmentStage = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid() }))
  .middleware([organizationMiddleware])
  .handler(async ({ data: { id }, context: { activeOrganizationId, db } }) => {
    const [deleted] = await db
      .delete(garmentStage)
      .where(and(eq(garmentStage.id, id), eq(garmentStage.organizationId, activeOrganizationId)))
      .returning({ id: garmentStage.id });

    if (!deleted) throw new Error("Etapa no encontrada");

    return { success: true };
  });

export const reorderGarmentStages = createServerFn({ method: "POST" })
  .validator(z.object({ orderedIds: z.array(z.uuid()).min(1) }))
  .middleware([organizationMiddleware])
  .handler(async ({ data: { orderedIds }, context: { activeOrganizationId, db } }) => {
    await db.transaction(async (tx) => {
      const owned = await tx
        .select({ id: garmentStage.id })
        .from(garmentStage)
        .where(
          and(
            eq(garmentStage.organizationId, activeOrganizationId),
            inArray(garmentStage.id, orderedIds),
          ),
        );

      if (owned.length !== orderedIds.length) {
        throw new Error("Alguna etapa no pertenece a esta organización");
      }

      await Promise.all(
        orderedIds.map((id, position) =>
          tx.update(garmentStage).set({ position }).where(eq(garmentStage.id, id)),
        ),
      );
    });

    return { success: true };
  });

export const seedDefaultGarmentStages = createServerFn({ method: "POST" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId, db } }) => {
    await db.transaction(async (tx) => {
      const [{ total }] = await tx
        .select({ total: count() })
        .from(garmentStage)
        .where(eq(garmentStage.organizationId, activeOrganizationId));

      if (total > 0) return;

      await tx.insert(garmentStage).values(
        DEFAULT_GARMENT_STAGES.map((stage, position) => ({
          organizationId: activeOrganizationId,
          name: stage.name,
          color: stage.color,
          isFinalStage: stage.isFinalStage,
          isSystemDefault: true,
          position,
        })),
      );
    });

    return { success: true };
  });
