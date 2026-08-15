import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import * as z from "zod";
import { budget, client, garment, garmentStage, order, quotationLine } from "#/db/schema";
import { organizationMiddleware } from "../auth/functions";
import { generateSequentialCode } from "./codes";

const ORDER_SORT_COLUMNS = {
  code: order.code,
  clientName: client.name,
  priority: order.priority,
  status: order.status,
  dueDate: order.dueDate,
  totalAmount: order.totalAmount,
} as const;

export const listOrdersSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.enum(["pending", "in_progress", "ready", "delivered", "cancelled"]).optional(),
  sortBy: z.enum(Object.keys(ORDER_SORT_COLUMNS) as [keyof typeof ORDER_SORT_COLUMNS]).optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type ListOrderOptions = z.infer<typeof listOrdersSchema>;

export const listOrders = createServerFn({ method: "GET" })
  .validator(listOrdersSchema)
  .middleware([organizationMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    const { page, pageSize, search, priority, status, sortBy, sortDir } = data;

    const whereClause = and(
      eq(order.organizationId, activeOrganizationId),
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
  });

export const getOrder = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ code: z.string() }))
  .handler(async ({ data, context: { activeOrganizationId: organizationId, db } }) => {
    const [orderRow] = await db
      .select({
        id: order.id,
        code: order.code,
        status: order.status,
        priority: order.priority,
        totalAmount: order.totalAmount,
        depositAmount: order.depositAmount,
        receivedAt: order.receivedAt,
        dueDate: order.dueDate,
        notes: order.notes,
        clientId: order.clientId,
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email,
        quotationId: order.quotationId,
      })
      .from(order)
      .leftJoin(client, eq(order.clientId, client.id))
      .where(and(eq(order.code, data.code), eq(order.organizationId, organizationId)));

    if (!orderRow) throw new Error("Pedido no encontrado");

    const garments = await db
      .select({
        id: garment.id,
        name: garment.name,
        quantity: garment.quantity,
        unitPrice: garment.unitPrice,
        fittingDate: garment.fittingDate,
        notes: garment.notes,
        stageId: garment.stageId,
        stageName: garmentStage.name,
        stageColor: garmentStage.color,
        isFinalStage: garmentStage.isFinalStage,
      })
      .from(garment)
      .leftJoin(garmentStage, eq(garment.stageId, garmentStage.id))
      .where(eq(garment.orderId, orderRow.id));

    return { ...orderRow, garments };
  });

const createOrderGarmentSchema = z.object({
  budgetId: z.uuid(),
  quotationLineId: z.uuid().optional(),
  quantity: z.number().int().min(1).default(1),
  unitPrice: z.string().default("0.00"),
  stageId: z.uuid().optional(),
  fittingDate: z.iso.datetime().optional().or(z.literal("")),
  notes: z.string().trim().optional(),
});

export const createOrderSchema = z.object({
  clientId: z.uuid(),
  quotationId: z.uuid().optional(),
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
    });
  });
