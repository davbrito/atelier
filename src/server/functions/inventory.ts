import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { organizationMiddleware } from "#/lib/auth/functions";
import {
  getMaterialInventory as getMaterialInventoryUseCase,
  registerMovement as registerMovementUseCase,
} from "../application/inventory";

const decimalString = z
  .string()
  .regex(/^\d*\.?\d{1,8}$/, "Cantidad inválida")
  .refine((v) => {
    const [, decimals = ""] = v.split(".");
    return decimals.length <= 4;
  }, "Cantidad inválida");

export const getMaterialInventory = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ materialId: z.uuid() }))
  .handler(async ({ data, context: { activeOrganizationId, db } }) =>
    getMaterialInventoryUseCase(db, activeOrganizationId, data.materialId),
  );

export const registerMovement = createServerFn({ method: "POST" })
  .middleware([organizationMiddleware])
  .validator(
    z.object({
      materialId: z.uuid(),
      type: z.enum(["entry", "exit", "adjustment"]),
      quantity: decimalString,
      note: z.string().optional(),
    }),
  )
  .handler(async ({ data, context: { activeOrganizationId, db, user: currentUser } }) =>
    db.transaction((trx) =>
      registerMovementUseCase(trx, activeOrganizationId, currentUser.id, data),
    ),
  );
