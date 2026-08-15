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
  // Totals are computed per quotation LINE (each line = one budget/garment
  // type), then rolled up to the quotation via the quotationLine → quotation
  // join, since a quotation can now have multiple lines.
  const materialTotals = db.$with("materialTotals").as(
    db
      .select({
        quotationId: schema.quotationLine.quotationId,
        total:
          sql<string>`sum(${schema.quotationMaterial.frozenPrice} * ${schema.quotationMaterial.quantity})`.as(
            "total",
          ),
      })
      .from(schema.quotationMaterial)
      .innerJoin(
        schema.quotationLine,
        eq(schema.quotationMaterial.quotationLineId, schema.quotationLine.id),
      )
      .groupBy(schema.quotationLine.quotationId),
  );

  const operationTotals = db.$with("operationTotals").as(
    db
      .select({
        quotationId: schema.quotationLine.quotationId,
        total:
          sql<string>`sum((${schema.quotationOperation.durationMinutes} / 60.0) * ${schema.quotationOperation.frozenHourlyRate})`.as(
            "total",
          ),
      })
      .from(schema.quotationOperation)
      .innerJoin(
        schema.quotationLine,
        eq(schema.quotationOperation.quotationLineId, schema.quotationLine.id),
      )
      .groupBy(schema.quotationLine.quotationId),
  );

  // One row per quotation with the budget names of all its lines, so the UI
  // can show e.g. "Vestido y 1 más" instead of a single flat budgetName.
  const lineSummaries = db.$with("lineSummaries").as(
    db
      .select({
        quotationId: schema.quotationLine.quotationId,
        budgetNames: sql<string[]>`array_agg(${schema.budget.name})`.as("budget_names"),
        lineCount: sql<number>`count(*)`.as("line_count"),
      })
      .from(schema.quotationLine)
      .leftJoin(schema.budget, eq(schema.quotationLine.budgetId, schema.budget.id))
      .groupBy(schema.quotationLine.quotationId),
  );

  const query = db
    .with(materialTotals, operationTotals, lineSummaries)
    .select({
      id: schema.quotation.id,
      slug: schema.quotation.slug,
      clientTitle: schema.quotation.clientTitle,
      createdAt: schema.quotation.createdAt,
      budgetNames: sql<string[]>`coalesce(${lineSummaries.budgetNames}, '{}')`,
      lineCount: sql<number>`coalesce(${lineSummaries.lineCount}, 0)`,
      materialTotal: sql<string>`coalesce(${materialTotals.total}, 0)`,
      operationTotal: sql<string>`coalesce(${operationTotals.total}, 0)`,
      total: sql<string>`coalesce(${materialTotals.total}, 0) + coalesce(${operationTotals.total}, 0)`,
    })
    .from(schema.quotation)
    .leftJoin(lineSummaries, eq(lineSummaries.quotationId, schema.quotation.id))
    .leftJoin(materialTotals, eq(materialTotals.quotationId, schema.quotation.id))
    .leftJoin(operationTotals, eq(operationTotals.quotationId, schema.quotation.id))
    .where(where);

  return query;
}
