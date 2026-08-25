import { eq, sum } from "drizzle-orm";
import type { Db } from "#/db/client";
import { budget, garment, order, orderPayment, quotationLine } from "#/db/schema";
import { generateSequentialCode } from "#/server/application/codes";

/** Total amount paid so far for an order, across all its payments. */
export async function getOrderPaidAmount(db: Db, orderId: string): Promise<number> {
  const [row] = await db
    .select({ paid: sum(orderPayment.amount) })
    .from(orderPayment)
    .where(eq(orderPayment.orderId, orderId));

  return Number(row?.paid ?? 0);
}

export type CreateOrderGarmentInput = {
  budgetId: string;
  quotationLineId?: string;
  quantity: number;
  unitPrice: string;
  stageId?: string;
  fittingDate?: string;
  notes?: string;
};

export type CreateOrderInput = {
  clientId: string;
  quotationId?: string;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
  notes?: string;
  garments: CreateOrderGarmentInput[];
};

/**
 * Creates an order with its garments in a single transaction: validates the
 * client (and, if given, the quotation and its lines), generates a
 * sequential order code, and inserts the order plus one garment row per
 * requested item.
 */
export async function createOrder(tx: Db, organizationId: string, data: CreateOrderInput) {
  const client = await tx.query.client.findFirst({
    where: { id: data.clientId, organizationId },
  });

  if (!client) throw new Error("Cliente no encontrado");

  let validQuotationLineIds: Set<string> | null = null;
  if (data.quotationId) {
    const quotation = await tx.query.quotation.findFirst({
      where: { id: data.quotationId, organizationId },
    });
    if (!quotation) throw new Error("Cotización no encontrada");

    const lines = await tx
      .select({ id: quotationLine.id })
      .from(quotationLine)
      .where(eq(quotationLine.quotationId, data.quotationId));
    validQuotationLineIds = new Set(lines.map((l) => l.id));
  }

  const now = new Date();
  const prefix = `PED${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-`;
  const code = await generateSequentialCode(tx, organizationId, prefix);

  const totalAmount = data.garments
    .reduce((sum, g) => sum + g.quantity * Number(g.unitPrice), 0)
    .toFixed(2);

  const budgets = await tx.select().from(budget).where(eq(budget.organizationId, organizationId));
  const budgetMap = new Map(budgets.map((b) => [b.id, b]));

  const [newOrder] = await tx
    .insert(order)
    .values({
      organizationId,
      clientId: data.clientId,
      quotationId: data.quotationId || null,
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

      const quotationLineId =
        g.quotationLineId && validQuotationLineIds?.has(g.quotationLineId)
          ? g.quotationLineId
          : null;

      return {
        orderId: newOrder.id,
        name: selectedBudget.name,
        budgetId: g.budgetId,
        quotationLineId,
        quantity: g.quantity,
        unitPrice: g.unitPrice,
        stageId: g.stageId || null,
        fittingDate: g.fittingDate ? new Date(g.fittingDate) : null,
        notes: g.notes || null,
      };
    }),
  );

  return newOrder;
}
