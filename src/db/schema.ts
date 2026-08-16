import { sql } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
  pgEnum,
  pgPolicy,
  primaryKey,
  real,
  snakeCase,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { organization, user } from "./auth.gen";

export {
  account,
  invitation,
  member,
  organization,
  passkey,
  session,
  user,
  verification,
} from "./auth.gen";

export const material = snakeCase.table("materials", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  organizationId: text()
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: varchar({ length: 255 }).notNull(),
  unit: varchar({ length: 50 }).notNull(),
  currentPrice: decimal({ precision: 12, scale: 2 }).notNull(),
  color: varchar({ length: 50 }),
  colorName: varchar({ length: 100 }),
  image: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => sql`now()`),
});

export const inventoryMovementType = pgEnum("inventory_movement_type", [
  "entry",
  "exit",
  "adjustment",
]);

export const materialInventoryMovement = snakeCase.table(
  "material_inventory_movements",
  {
    id: uuid().primaryKey().default(sql`uuidv7()`),
    materialId: uuid()
      .notNull()
      .references(() => material.id, { onDelete: "cascade" }),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    type: inventoryMovementType().notNull(),
    delta: decimal({ precision: 12, scale: 4 }).notNull(),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdById: text().references(() => user.id, { onDelete: "set null" }),
  },
  (table) => [
    index("material_inventory_movements_material_id_created_at_idx").on(
      table.materialId,
      table.createdAt.desc(),
    ),
  ],
);

export const materialPriceHistory = snakeCase.table("material_price_history", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  materialId: uuid()
    .notNull()
    .references(() => material.id, { onDelete: "cascade" }),
  price: decimal({ precision: 12, scale: 2 }).notNull(),
  recordedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const operation = snakeCase.table("operations", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  organizationId: text()
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: varchar({ length: 255 }).notNull(),
  defaultDurationMinutes: integer().notNull().default(60),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// ── Budgets (templates) ──────────────────────────────────

export const budget = snakeCase.table("budgets", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  slug: varchar({ length: 255 }).notNull().unique(),
  organizationId: text()
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: varchar({ length: 255 }).notNull(),
  description: text(),
  hourlyRate: decimal({ precision: 10, scale: 2 }).notNull(),
  image: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => sql`now()`),
});

export const budgetMaterial = snakeCase.table("budget_materials", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  budgetId: uuid()
    .notNull()
    .references(() => budget.id, { onDelete: "cascade" }),
  materialId: uuid()
    .notNull()
    .references(() => material.id, { onDelete: "cascade" }),
  quantity: decimal({ precision: 12, scale: 4 }).notNull(),
});

export const budgetOperation = snakeCase.table("budget_operations", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  budgetId: uuid()
    .notNull()
    .references(() => budget.id, { onDelete: "cascade" }),
  operationId: uuid()
    .notNull()
    .references(() => operation.id, { onDelete: "cascade" }),
  durationMinutes: integer().notNull(),
});

// ── Quotations (frozen instances) ────────────────────────

// Quotations are immutable once emitted (see CONTEXT.md). RLS enforces this
// at the database level: only the operations the app legitimately performs
// have a policy, so no UPDATE can ever mutate a quotation. Adding a policy
// auto-enables RLS; the migration additionally sets FORCE ROW LEVEL SECURITY
// because the app connects as the table owner, which otherwise bypasses RLS.
export const quotation = snakeCase.table(
  "quotations",
  {
    id: uuid().primaryKey().default(sql`uuidv7()`),
    slug: varchar({ length: 255 }).notNull().unique(),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    clientId: uuid().references(() => client.id, { onDelete: "set null" }),
    clientTitle: varchar({ length: 255 }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy("quotations_select", { for: "select", using: sql`true` }),
    pgPolicy("quotations_insert", { for: "insert", withCheck: sql`true` }),
    pgPolicy("quotations_delete", { for: "delete", using: sql`true` }),
  ],
);

// A quotation line prices one budget/garment type within a quotation. A
// quotation can have multiple lines (e.g. dress + jacket) — mirrors how an
// order can have multiple garments.
export const quotationLine = snakeCase.table(
  "quotation_lines",
  {
    id: uuid().primaryKey().default(sql`uuidv7()`),
    quotationId: uuid()
      .notNull()
      .references(() => quotation.id, { onDelete: "cascade" }),
    budgetId: uuid().references(() => budget.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy("quotation_lines_select", { for: "select", using: sql`true` }),
    pgPolicy("quotation_lines_insert", { for: "insert", withCheck: sql`true` }),
  ],
);

// Quotation lines are frozen: they must survive catalog changes, so the
// catalog references are informational only (set null on delete) and the
// name/price/unit are copied at creation time. No UPDATE or DELETE policy,
// so lines can never be mutated or removed except by cascade from the parent.
export const quotationMaterial = snakeCase.table(
  "quotation_materials",
  {
    id: uuid().primaryKey().default(sql`uuidv7()`),
    quotationLineId: uuid()
      .notNull()
      .references(() => quotationLine.id, { onDelete: "cascade" }),
    materialId: uuid().references(() => material.id, { onDelete: "set null" }),
    quantity: decimal({ precision: 12, scale: 4 }).notNull(),
    frozenName: varchar({ length: 255 }).notNull(),
    frozenPrice: decimal({ precision: 12, scale: 2 }).notNull(),
    frozenUnit: varchar({ length: 50 }).notNull(),
  },
  () => [
    pgPolicy("quotation_materials_select", { for: "select", using: sql`true` }),
    pgPolicy("quotation_materials_insert", { for: "insert", withCheck: sql`true` }),
  ],
);

export const quotationOperation = snakeCase.table(
  "quotation_operations",
  {
    id: uuid().primaryKey().default(sql`uuidv7()`),
    quotationLineId: uuid()
      .notNull()
      .references(() => quotationLine.id, { onDelete: "cascade" }),
    operationId: uuid().references(() => operation.id, { onDelete: "set null" }),
    durationMinutes: integer().notNull(),
    frozenName: varchar({ length: 255 }).notNull(),
    frozenHourlyRate: decimal({ precision: 10, scale: 2 }).notNull(),
  },
  () => [
    pgPolicy("quotation_operations_select", { for: "select", using: sql`true` }),
    pgPolicy("quotation_operations_insert", { for: "insert", withCheck: sql`true` }),
  ],
);

// ── Clients ──────────────────────────────────────────────

export const client = snakeCase.table("clients", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  organizationId: text()
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  name: varchar({ length: 255 }).notNull(),
  phone: varchar({ length: 50 }),
  email: varchar({ length: 255 }),
  notes: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdateFn(() => sql`now()`),
});

export const clientMeasurement = snakeCase.table("client_measurements", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  clientId: uuid()
    .notNull()
    .references(() => client.id, { onDelete: "cascade" }),
  name: varchar({ length: 255 }).notNull(),
  value: real().notNull(),
});

// ── Whitelist ────────────────────────────────────────────

export const whitelistEmail = snakeCase.table("whitelist_emails", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  email: varchar({ length: 255 }).notNull().unique(),
  addedById: text()
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

// ── Orders & Garments Enums ──────────────────────────────

export const orderPriority = pgEnum("order_priority", ["low", "medium", "high", "urgent"]);

export const orderStatus = pgEnum("order_status", [
  "pending",
  "in_progress",
  "ready",
  "delivered",
  "cancelled",
]);

// ── Orders (Pedidos) ─────────────────────────────────────

export const order = snakeCase.table(
  "orders",
  {
    id: uuid().primaryKey().default(sql`uuidv7()`),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    clientId: uuid().references(() => client.id, { onDelete: "set null" }),
    quotationId: uuid().references(() => quotation.id, { onDelete: "set null" }),
    code: varchar({ length: 50 }).notNull(), // Ej. #PED2026-05-0101
    status: orderStatus().notNull().default("pending"),
    priority: orderPriority().notNull().default("medium"),
    totalAmount: decimal({ precision: 12, scale: 2 }).notNull().default("0.00"),
    receivedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    dueDate: timestamp({ withTimezone: true }),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => sql`now()`),
  },
  (table) => [
    index("orders_organization_id_idx").on(table.organizationId),
    index("orders_client_id_idx").on(table.clientId),
    index("orders_due_date_idx").on(table.dueDate),
    index("orders_received_at_idx").on(table.receivedAt.desc()),
    unique("orders_organization_id_code_unique").on(table.organizationId, table.code),
  ],
);

// ── Correlativos (contador genérico de códigos secuenciales) ──

export const codeCounter = snakeCase.table(
  "code_counters",
  {
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    prefix: varchar({ length: 40 }).notNull(), // Ej. "PED2026-05-", "COT2026-05-"
    lastValue: integer().notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.prefix] })],
);

// ── Garment Stages (Etapas dinámicas del Kanban) ─────────

export const garmentStage = snakeCase.table(
  "order_garment_stages",
  {
    id: uuid().primaryKey().default(sql`uuidv7()`),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    name: varchar({ length: 100 }).notNull(), // Ej. "Patronaje", "Bordado"
    color: varchar({ length: 20 }), // Opcional: código de color hexadecimal para la UI (#FF5733)
    position: integer().notNull().default(0), // Para ordenar las columnas del Kanban (0, 1, 2, 3...)
    isSystemDefault: boolean().notNull().default(false), // Identifica las creadas por defecto
    isFinalStage: boolean().notNull().default(false), // True si indica que la prenda está terminada
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("order_garment_stages_org_position_idx").on(table.organizationId, table.position),
  ],
);

// ── Garments / Order Items (Prendas del Pedido) ──────────

export const garment = snakeCase.table(
  "order_garments",
  {
    id: uuid().primaryKey().default(sql`uuidv7()`),
    orderId: uuid()
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    name: varchar({ length: 255 }).notNull(), // Ej. "Vestido de 15 años", "Traje de baño"
    stageId: uuid().references(() => garmentStage.id, { onDelete: "set null" }),
    // The budget this garment is built from — the source of its product
    // name/recipe. Independent of quotationLineId: an order can reference a
    // budget directly without ever going through a formal quotation.
    budgetId: uuid().references(() => budget.id, { onDelete: "set null" }),
    // Set only when this garment originated from a quotation line.
    quotationLineId: uuid().references(() => quotationLine.id, { onDelete: "set null" }),
    quantity: integer().notNull().default(1),
    unitPrice: decimal({ precision: 12, scale: 2 }).notNull().default("0.00"),
    fittingDate: timestamp({ withTimezone: true }), // Fecha agendada de prueba
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdateFn(() => sql`now()`),
  },
  (table) => [
    index("order_garments_order_id_idx").on(table.orderId),
    index("order_garments_stage_id_idx").on(table.stageId),
  ],
);

// ── Order Payments (Pagos del pedido) ────────────────────
//
// An order can be paid in multiple installments, each of a different
// method (efectivo, pago móvil, binance, etc). `method` is a free-text
// column validated in the application layer against `PAYMENT_TYPES`
// (src/lib/constants/payment-types.ts) rather than a DB enum, so adding a
// new payment method never requires a migration.

export const orderPayment = snakeCase.table(
  "order_payments",
  {
    id: uuid().primaryKey().default(sql`uuidv7()`),
    organizationId: text()
      .notNull()
      .references(() => organization.id, { onDelete: "cascade" }),
    orderId: uuid()
      .notNull()
      .references(() => order.id, { onDelete: "cascade" }),
    method: varchar({ length: 50 }).notNull(),
    amount: decimal({ precision: 12, scale: 2 }).notNull(),
    reference: varchar({ length: 100 }), // Código o número de referencia de la transacción
    image: text(), // Clave R2 del soporte/comprobante de pago
    notes: text(),
    paidAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("order_payments_order_id_idx").on(table.orderId),
    index("order_payments_organization_id_idx").on(table.organizationId),
  ],
);
