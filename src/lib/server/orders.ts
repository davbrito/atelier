import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import * as z from "zod";
import { budget, garment, order } from "#/db/schema";
import { organizationMiddleware } from "../auth/functions";
import { generateSequentialCode } from "./codes";

const createOrderGarmentSchema = z.object({
  budgetId: z.uuid(),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.string().default("0.00"),
  stageId: z.uuid().optional(),
  fittingDate: z.iso.datetime().optional().or(z.literal("")),
  notes: z.string().trim().optional(),
});

export const createOrderSchema = z.object({
  clientId: z.uuid(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.iso.datetime().optional().or(z.literal("")),
  notes: z.string().trim().optional(),
  garments: z.array(createOrderGarmentSchema).min(1),
});

export const createOrder = createServerFn({ method: "POST" })
  .validator(createOrderSchema)
  .middleware([organizationMiddleware])
  .handler(async ({ data, context: { activeOrganizationId: organizationId, db } }) => {
    return await db.transaction(async (tx) => {
      const client = await tx.query.client.findFirst({
        where: { id: data.clientId, organizationId },
      });

      if (!client) throw new Error("Cliente no encontrado");

      const now = new Date();
      const prefix = `PED${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;
      const code = await generateSequentialCode(tx, organizationId, prefix);

      const totalAmount = data.garments
        .reduce((sum, g) => sum + g.quantity * Number(g.unitPrice), 0)
        .toFixed(2);

      const budgets = await tx
        .select()
        .from(budget)
        .where(eq(budget.organizationId, organizationId));
      const budgetMap = new Map(budgets.map((b) => [b.id, b]));

      const [newOrder] = await tx
        .insert(order)
        .values({
          organizationId,
          clientId: data.clientId,
          code,
          priority: data.priority,
          totalAmount,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          notes: data.notes || null,
        })
        .returning();

      await tx.insert(garment).values(
        data.garments.map((g) => {
          const selectedBudget = budgetMap.get(g.budgetId);
          if (!selectedBudget) throw new Error("Presupuesto no encontrado");

          return {
            orderId: newOrder.id,
            name: selectedBudget.name,
            budgetId: g.budgetId,
            quantity: g.quantity,
            unitPrice: g.unitPrice,
            stageId: g.stageId || null,
            fittingDate: g.fittingDate ? new Date(g.fittingDate) : null,
            notes: g.notes || null,
          };
        }),
      );

      return newOrder;
    });
  });
