import { createServerFn } from "@tanstack/react-start";
import { and, asc, count, desc, eq, ilike, or, type SQL, sql } from "drizzle-orm";
import * as z from "zod";
import { client, order, orderPayment } from "#/db/schema";
import { organizationMiddleware } from "#/lib/auth/functions";
import { storageUrl } from "#/lib/utils";
import { createOrder as createOrderUseCase, getOrderPaidAmount } from "../application/orders";

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
    const order = await db.query.order.findFirst({
      where: { code: data.code, organizationId },
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
          columns: {
            id: true,
            name: true,
            phone: true,
            email: true,
          },
        },
        quotation: {
          columns: {
            id: true,
            slug: true,
          },
        },
        garments: {
          with: { stage: { columns: { name: true, color: true, isFinalStage: true } } },
        },
        payments: {
          orderBy: { paidAt: "desc" },
        },
      },
    });

    const orderRow = order && {
      id: order.id,
      code: order.code,
      status: order.status,
      priority: order.priority,
      totalAmount: order.totalAmount,
      receivedAt: order.receivedAt,
      dueDate: order.dueDate,
      notes: order.notes,
      clientId: order.clientId,
      clientName: order.client?.name,
      clientPhone: order.client?.phone,
      clientEmail: order.client?.email,
      quotationId: order.quotationId,
      quotationSlug: order.quotation?.slug,
    };

    if (!orderRow) throw new Error("Pedido no encontrado");

    const garments = order.garments.map((garment) => ({
      id: garment.id,
      name: garment.name,
      quantity: garment.quantity,
      unitPrice: garment.unitPrice,
      fittingDate: garment.fittingDate,
      notes: garment.notes,
      stageId: garment.stageId,
      stageName: garment.stage.name,
      stageColor: garment.stage.color,
      isFinalStage: garment.stage.isFinalStage,
    }));

    const payments = order.payments.map((p) => ({ ...p, image: p.image && storageUrl(p.image) }));
    const depositAmount = await getOrderPaidAmount(db, order.id);

    return { ...orderRow, garments, payments, depositAmount };
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
    return await db.transaction((tx) => createOrderUseCase(tx, organizationId, data));
  });

export const updateOrderPriority = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.uuid(),
      priority: z.enum(["low", "medium", "high", "urgent"]),
    }),
  )
  .middleware([organizationMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    const [updated] = await db
      .update(order)
      .set({ priority: data.priority })
      .where(and(eq(order.id, data.id), eq(order.organizationId, activeOrganizationId)))
      .returning({ id: order.id });

    if (!updated) throw new Error("Pedido no encontrado");

    return { success: true };
  });

// ── Order status Kanban (pedidos, no prendas) ─────────────

export const listKanbanOrders = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId, db } }) => {
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
      .where(eq(order.organizationId, activeOrganizationId));

    return { items };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.uuid(),
      status: z.enum(["pending", "in_progress", "ready", "delivered", "cancelled"]),
    }),
  )
  .middleware([organizationMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db } }) => {
    const [updated] = await db
      .update(order)
      .set({ status: data.status })
      .where(and(eq(order.id, data.id), eq(order.organizationId, activeOrganizationId)))
      .returning({ id: order.id });

    if (!updated) throw new Error("Pedido no encontrado");

    return { success: true };
  });
