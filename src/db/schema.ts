import { sql } from "drizzle-orm";
import { decimal, integer, snakeCase, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
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

export const quotation = snakeCase.table("quotations", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  slug: varchar({ length: 255 }).notNull().unique(),
  organizationId: text()
    .notNull()
    .references(() => organization.id, { onDelete: "cascade" }),
  budgetId: uuid().references(() => budget.id, { onDelete: "set null" }),
  clientTitle: varchar({ length: 255 }).notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const quotationMaterial = snakeCase.table("quotation_materials", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  quotationId: uuid()
    .notNull()
    .references(() => quotation.id, { onDelete: "cascade" }),
  materialId: uuid()
    .notNull()
    .references(() => material.id, { onDelete: "cascade" }),
  quantity: decimal({ precision: 12, scale: 4 }).notNull(),
  frozenPrice: decimal({ precision: 12, scale: 2 }).notNull(),
  frozenUnit: varchar({ length: 50 }).notNull(),
});

export const quotationOperation = snakeCase.table("quotation_operations", {
  id: uuid().primaryKey().default(sql`uuidv7()`),
  quotationId: uuid()
    .notNull()
    .references(() => quotation.id, { onDelete: "cascade" }),
  operationId: uuid()
    .notNull()
    .references(() => operation.id, { onDelete: "cascade" }),
  durationMinutes: integer().notNull(),
  frozenHourlyRate: decimal({ precision: 10, scale: 2 }).notNull(),
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
