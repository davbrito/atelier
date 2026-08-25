import { and, asc, count, desc, eq, ilike, or, type SQL, sql, sum } from "drizzle-orm";
import type { Db } from "#/db/client";
import { budget, client, garment, order, orderPayment, quotationLine } from "#/db/schema";
import { storageUrl } from "#/lib/utils";
import { generateSequentialCode } from "#/server/application/codes";

const ORDER_SORT_COLUMNS = {
  code: order.code,
  clientName: client.name,
  priority: order.priority,
  status: order.status,
  dueDate: order.dueDate,
  totalAmount: order.totalAmount,
} as const;

export type ListOrdersInput = {
  page: number;
  pageSize: number;
  search?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  status?: "pending" | "in_progress" | "ready" | "delivered" | "cancelled";
  sortBy?: keyof typeof ORDER_SORT_COLUMNS;
  sortDir: "asc" | "desc";
};

export async function listOrders(db: Db, organizationId: string, params: ListOrdersInput) {
  const { page, pageSize, search, priority, status, sortBy, sortDir } = params;

  const whereClause = and(
    eq(order.organizationId, organizationId),
    priority ? eq(order.priority, priority) : undefined,
    status ? eq(order.status, status) : undefined,
    search ? or(ilike(order.code, `%${search}%`), ilike(client.name, `%${search}%`)) : undefined,
  );

  const sortColumn = sortBy ? ORDER_SORT_COLUMNS[sortBy] : order.receivedAt;
  const orderByClause: SQL = sortDir === "asc" ? asc(sortColumn) : desc(sortColumn);

  const [items, [{ total }]] = await Promise.all([
    db
      .select({
        id: order.id,
        code: order.code,
        status: order.status,
        priority: order.priority,
        totalAmount: order.totalAmount,
        receivedAt: order.receivedAt,
        dueDate: order.dueDate,
        clientName: client.name,
      })
      .from(order)
      .leftJoin(client, eq(order.clientId, client.id))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ total: count() })
      .from(order)
      .leftJoin(client, eq(order.clientId, client.id))
      .where(whereClause),
  ]);

  return { items, total, page, pageSize };
}

export async function getOrder(db: Db, organizationId: string, code: string) {
  const found = await db.query.order.findFirst({
    where: { code, organizationId },
    columns: {
      id: true,
      code: true,
      status: true,
      priority: true,
      totalAmount: true,
      receivedAt: true,
      dueDate: true,
      notes: true,
      clientId: true,
      quotationId: true,
    },
    with: {
      client: {
        columns: { id: true, name: true, phone: true, email: true },
      },
      quotation: {
        columns: { id: true, slug: true },
      },
      garments: {
        with: { stage: { columns: { name: true, color: true, isFinalStage: true } } },
      },
      payments: {
        orderBy: { paidAt: "desc" },
      },
    },
  });

  if (!found) throw new Error("Pedido no encontrado");

  const garments = found.garments.map((g) => ({
    id: g.id,
    name: g.name,
    quantity: g.quantity,
    unitPrice: g.unitPrice,
    fittingDate: g.fittingDate,
    notes: g.notes,
    stageId: g.stageId,
    stageName: g.stage.name,
    stageColor: g.stage.color,
    isFinalStage: g.stage.isFinalStage,
  }));

  const payments = found.payments.map((p) => ({ ...p, image: p.image && storageUrl(p.image) }));
  const depositAmount = await getOrderPaidAmount(db, found.id);

  return {
    id: found.id,
    code: found.code,
    status: found.status,
    priority: found.priority,
    totalAmount: found.totalAmount,
    receivedAt: found.receivedAt,
    dueDate: found.dueDate,
    notes: found.notes,
    clientId: found.clientId,
    clientName: found.client?.name,
    clientPhone: found.client?.phone,
    clientEmail: found.client?.email,
    quotationId: found.quotationId,
    quotationSlug: found.quotation?.slug,
    garments,
    payments,
    depositAmount,
  };
}

export async function listKanbanOrders(db: Db, organizationId: string) {
  const items = await db
    .select({
      id: order.id,
      code: order.code,
      status: order.status,
      priority: order.priority,
      totalAmount: order.totalAmount,
      dueDate: order.dueDate,
      clientName: client.name,
      // Scalar subquery instead of a join+group-by: keeps this a flat,
      // one-row-per-order select without touching the rest of the query.
      paidAmount: sql<string>`coalesce((
        select sum(${orderPayment.amount}) from ${orderPayment}
        where ${orderPayment.orderId} = ${order.id}
      ), 0)`,
    })
    .from(order)
    .leftJoin(client, eq(order.clientId, client.id))
    .where(eq(order.organizationId, organizationId));

  return items;
}

export async function updateOrderPriority(
  db: Db,
  organizationId: string,
  id: string,
  priority: "low" | "medium" | "high" | "urgent",
) {
  const [updated] = await db
    .update(order)
    .set({ priority })
    .where(and(eq(order.id, id), eq(order.organizationId, organizationId)))
    .returning({ id: order.id });

  if (!updated) throw new Error("Pedido no encontrado");
}

export async function updateOrderStatus(
  db: Db,
  organizationId: string,
  id: string,
  status: "pending" | "in_progress" | "ready" | "delivered" | "cancelled",
) {
  const [updated] = await db
    .update(order)
    .set({ status })
    .where(and(eq(order.id, id), eq(order.organizationId, organizationId)))
    .returning({ id: order.id });

  if (!updated) throw new Error("Pedido no encontrado");
}

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
