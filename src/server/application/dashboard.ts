import { eq, sql } from "drizzle-orm";
import type { Db } from "#/db/client";
import * as schema from "#/db/schema";

export async function getDashboardCounts(db: Db, organizationId: string) {
  const result = await db.execute(sql`SELECT
    ${db.$count(schema.budget, eq(schema.budget.organizationId, organizationId))} AS budgets,
    ${db.$count(schema.material, eq(schema.material.organizationId, organizationId))} AS materials,
    ${db.$count(schema.operation, eq(schema.operation.organizationId, organizationId))} AS operations,
    ${db.$count(schema.quotation, eq(schema.quotation.organizationId, organizationId))} AS quotations,
    ${db.$count(schema.client, eq(schema.client.organizationId, organizationId))} AS clients
  `);

  const data = result.rows[0];

  return {
    budgets: Number(data.budgets),
    materials: Number(data.materials),
    operations: Number(data.operations),
    quotations: Number(data.quotations),
    clients: Number(data.clients),
  };
}
