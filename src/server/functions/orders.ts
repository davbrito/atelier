import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { organizationMiddleware } from "#/lib/auth/functions";
import {
  createOrder as createOrderUseCase,
  getOrder as getOrderUseCase,
  listKanbanOrders as listKanbanOrdersUseCase,
  listOrders as listOrdersUseCase,
  updateOrderPriority as updateOrderPriorityUseCase,
  updateOrderStatus as updateOrderStatusUseCase,
} from "../application/orders";

const ORDER_SORT_KEYS = [
  "code",
  "clientName",
  "priority",
  "status",
  "dueDate",
  "totalAmount",
] as const;

export const listOrdersSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.enum(["pending", "in_progress", "ready", "delivered", "cancelled"]).optional(),
  sortBy: z.enum(ORDER_SORT_KEYS).optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type ListOrderOptions = z.infer<typeof listOrdersSchema>;

export const listOrders = createServerFn({ method: "GET" })
  .validator(listOrdersSchema)
  .middleware([organizationMiddleware])
  .handler(async ({ data, context: { activeOrganizationId, db } }) =>
    listOrdersUseCase(db, activeOrganizationId, data),
  );

export const getOrder = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .validator(z.object({ code: z.string() }))
  .handler(async ({ data, context: { activeOrganizationId, db } }) =>
    getOrderUseCase(db, activeOrganizationId, data.code),
  );

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
    await updateOrderPriorityUseCase(db, activeOrganizationId, data.id, data.priority);
    return { success: true };
  });

// ── Order status Kanban (pedidos, no prendas) ─────────────

export const listKanbanOrders = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId, db } }) => {
    const items = await listKanbanOrdersUseCase(db, activeOrganizationId);
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
    await updateOrderStatusUseCase(db, activeOrganizationId, data.id, data.status);
    return { success: true };
  });
