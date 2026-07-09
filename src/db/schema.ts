import { sql } from "drizzle-orm";
import {
  decimal,
  index,
  integer,
  pgEnum,
  pgPolicy,
  snakeCase,
  text,
  timestamp,
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
    budgetId: uuid().references(() => budget.id, { onDelete: "set null" }),
    clientTitle: varchar({ length: 255 }).notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  () => [
    pgPolicy("quotations_select", { for: "select", using: sql`true` }),
    pgPolicy("quotations_insert", { for: "insert", withCheck: sql`true` }),
    pgPolicy("quotations_delete", { for: "delete", using: sql`true` }),
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
    quotationId: uuid()
      .notNull()
      .references(() => quotation.id, { onDelete: "cascade" }),
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
    quotationId: uuid()
      .notNull()
      .references(() => quotation.id, { onDelete: "cascade" }),
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
  value: varchar({ length: 100 }).notNull(),
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
