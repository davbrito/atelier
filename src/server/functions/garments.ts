import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { organizationMiddleware } from "#/lib/auth/functions";
import {
  listKanbanGarments as listKanbanGarmentsUseCase,
  moveGarmentStage as moveGarmentStageUseCase,
} from "../application/garments";

// ── Queries ──────────────────────────────────────────────

export const listKanbanGarments = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId, db } }) => {
    const items = await listKanbanGarmentsUseCase(db, activeOrganizationId);
    return { items };
  });

// ── Mutations ────────────────────────────────────────────

export const moveGarmentStage = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.uuid(), stageId: z.uuid().nullable() }))
  .middleware([organizationMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    await db.transaction((tx) => moveGarmentStageUseCase(tx, activeOrganizationId, data));
    return { success: true };
  });
