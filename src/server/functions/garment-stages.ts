import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import * as z from "zod";
import { garmentStage } from "#/db/schema";
import { organizationMiddleware } from "#/lib/auth/functions";
import {
  createGarmentStage as createGarmentStageUseCase,
  deleteGarmentStage as deleteGarmentStageUseCase,
  reorderGarmentStages as reorderGarmentStagesUseCase,
  seedDefaultGarmentStages as seedDefaultGarmentStagesUseCase,
  updateGarmentStage as updateGarmentStageUseCase,
} from "../application/garment-stages";

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
  .handler(async ({ data, context: { activeOrganizationId, db } }) =>
    db.transaction((tx) => createGarmentStageUseCase(tx, activeOrganizationId, data)),
  );

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
  .handler(async ({ data, context: { activeOrganizationId, db } }) =>
    db.transaction((tx) => updateGarmentStageUseCase(tx, activeOrganizationId, data)),
  );

export const deleteGarmentStage = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid() }))
  .middleware([organizationMiddleware])
  .handler(async ({ data: { id }, context: { activeOrganizationId, db } }) => {
    await deleteGarmentStageUseCase(db, activeOrganizationId, id);
    return { success: true };
  });

export const reorderGarmentStages = createServerFn({ method: "POST" })
  .validator(z.object({ orderedIds: z.array(z.uuid()).min(1) }))
  .middleware([organizationMiddleware])
  .handler(async ({ data: { orderedIds }, context: { activeOrganizationId, db } }) => {
    await db.transaction((tx) => reorderGarmentStagesUseCase(tx, activeOrganizationId, orderedIds));
    return { success: true };
  });

export const seedDefaultGarmentStages = createServerFn({ method: "POST" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId, db } }) => {
    await db.transaction((tx) => seedDefaultGarmentStagesUseCase(tx, activeOrganizationId));
    return { success: true };
  });
