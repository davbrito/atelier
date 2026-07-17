import { and, desc, eq, ilike, type SQL, sql } from "drizzle-orm";
import type { Db } from "#/db/client";
import * as schema from "#/db/schema";

export interface QuotationFilters {
  search?: string;
  page?: number;
  pageSize?: number;
  organizationId: string;
}

export function quotationsQuery(db: Db, filters: QuotationFilters) {
  const query = quotationsQueryBase(db, quotationsWhereClause(filters)).orderBy(
    desc(schema.quotation.createdAt),
  );

  if (filters.page || filters.pageSize) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    query.limit(pageSize).offset((page - 1) * pageSize);
  }

  return query;
}

export interface QuotationBySlugParams {
  slug: string;
  organizationId: string;
}

export function quotationBySlugQuery(db: Db, params: QuotationBySlugParams) {
  return quotationsQueryBase(
    db,
    and(
      eq(schema.quotation.slug, params.slug),
      eq(schema.quotation.organizationId, params.organizationId),
    ),
  ).limit(1);
}

export function quotationsCountQuery(db: Db, filters: QuotationFilters) {
  return db.$count(schema.quotation, quotationsWhereClause(filters));
}

function quotationsWhereClause(filters: QuotationFilters) {
  return and(
    eq(schema.quotation.organizationId, filters.organizationId),
    filters.search ? ilike(schema.quotation.clientTitle, `%${filters.search}%`) : undefined,
  );
}

function quotationsQueryBase(db: Db, where: SQL | undefined) {
  const materialTotals = db.$with("materialTotals").as(
    db
      .select({
        quotationId: schema.quotationMaterial.quotationId,
        total:
          sql<string>`sum(${schema.quotationMaterial.frozenPrice} * ${schema.quotationMaterial.quantity})`.as(
            "total",
          ),
      })
      .from(schema.quotationMaterial)
      .groupBy(schema.quotationMaterial.quotationId),
  );

  const operationTotals = db.$with("operationTotals").as(
    db
      .select({
        quotationId: schema.quotationOperation.quotationId,
        total:
          sql<string>`sum((${schema.quotationOperation.durationMinutes} / 60.0) * ${schema.quotationOperation.frozenHourlyRate})`.as(
            "total",
          ),
      })
      .from(schema.quotationOperation)
      .groupBy(schema.quotationOperation.quotationId),
  );

  const query = db
    .with(materialTotals, operationTotals)
    .select({
      id: schema.quotation.id,
      slug: schema.quotation.slug,
      clientTitle: schema.quotation.clientTitle,
      createdAt: schema.quotation.createdAt,
      budgetName: schema.budget.name,
      budgetSlug: schema.budget.slug,
      materialTotal: sql<string>`coalesce(${materialTotals.total}, 0)`,
      operationTotal: sql<string>`coalesce(${operationTotals.total}, 0)`,
      total: sql<string>`coalesce(${materialTotals.total}, 0) + coalesce(${operationTotals.total}, 0)`,
    })
    .from(schema.quotation)
    .leftJoin(schema.budget, eq(schema.quotation.budgetId, schema.budget.id))
    .leftJoin(materialTotals, eq(materialTotals.quotationId, schema.quotation.id))
    .leftJoin(operationTotals, eq(operationTotals.quotationId, schema.quotation.id))
    .where(where);

  return query;
}
