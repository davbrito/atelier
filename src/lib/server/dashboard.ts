import { createServerFn } from "@tanstack/react-start";
import { eq, sql } from "drizzle-orm";
import * as schema from "#/db/schema";
import { organizationMiddleware } from "../auth/functions";
import { quotationsQuery } from "../services/quotations";

export const getRecentQuotations = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId: orgId, db } }) => {
    const recentQuotations = await quotationsQuery(db, {
      page: 1,
      pageSize: 5,
      organizationId: orgId,
    });

    return recentQuotations;
  });

export const getDashboardCounts = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId: orgId, db } }) => {
    const result = await db.execute(sql`SELECT
      ${db.$count(schema.budget, eq(schema.budget.organizationId, orgId))} AS budgets,
      ${db.$count(schema.material, eq(schema.material.organizationId, orgId))} AS materials,
      ${db.$count(schema.operation, eq(schema.operation.organizationId, orgId))} AS operations,
      ${db.$count(schema.quotation, eq(schema.quotation.organizationId, orgId))} AS quotations,
      ${db.$count(schema.client, eq(schema.client.organizationId, orgId))} AS clients
    `);

    const data = result.rows[0];

    return {
      budgets: Number(data.budgets),
      materials: Number(data.materials),
      operations: Number(data.operations),
      quotations: Number(data.quotations),
      clients: Number(data.clients),
    };
  });
