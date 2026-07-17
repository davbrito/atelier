import { and, asc, eq, ilike, sql } from "drizzle-orm";
import type { Db } from "#/db/client";
import * as schema from "#/db/schema";

export interface QuotationFilters {
  search?: string;
  page?: number;
  pageSize?: number;
  organizationId: string;
}

export function quotationsQuery(db: Db, filters: QuotationFilters) {
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
      total: sql<string>`coalesce(${materialTotals.total}, 0) + coalesce(${operationTotals.total}, 0)`,
    })
    .from(schema.quotation)
    .leftJoin(schema.budget, eq(schema.quotation.budgetId, schema.budget.id))
    .leftJoin(materialTotals, eq(materialTotals.quotationId, schema.quotation.id))
    .leftJoin(operationTotals, eq(operationTotals.quotationId, schema.quotation.id))
    .where(quotationsWhereClause(filters))
    .orderBy(asc(schema.quotation.createdAt));

  if (filters.page || filters.pageSize) {
    const page = filters.page || 1;
    const pageSize = filters.pageSize || 20;
    query.limit(pageSize).offset((page - 1) * pageSize);
  }

  return query;
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
