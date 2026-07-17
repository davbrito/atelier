import { createServerFn } from "@tanstack/react-start";
import { eq, sql } from "drizzle-orm";
import * as schema from "#/db/schema";
import { organizationMiddleware } from "../auth/functions";
import { quotationsQuery } from "../services/quotations";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId: orgId, db } }) => {
    const {
      rows: [data],
    } = await db.execute(sql`SELECT
      ${db.$count(schema.budget, eq(schema.budget.organizationId, orgId))} AS budgets,
      ${db.$count(schema.material, eq(schema.material.organizationId, orgId))} AS materials,
      ${db.$count(schema.operation, eq(schema.operation.organizationId, orgId))} AS operations,
      ${db.$count(schema.quotation, eq(schema.quotation.organizationId, orgId))} AS quotations,
      ${db.$count(schema.client, eq(schema.client.organizationId, orgId))} AS clients
    `);

    const budgets = Number(data.budgets);
    const materials = Number(data.materials);
    const operations = Number(data.operations);
    const quotations = Number(data.quotations);
    const clients = Number(data.clients);

    const recentQuotations = await quotationsQuery(db, {
      page: 1,
      pageSize: 5,
      organizationId: orgId,
    });

    return {
      counts: { budgets, materials, operations, quotations, clients },
      recentQuotations,
    };
  });
