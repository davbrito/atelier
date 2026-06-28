import { createServerFn } from "@tanstack/react-start";
import { desc, eq, sql } from "drizzle-orm";
import * as schema from "#/db/schema";
import { authenticatedMiddleware } from "../auth/functions";

export const getDashboardStats = createServerFn({ method: "GET" })
  .middleware([authenticatedMiddleware])
  .handler(async ({ context: { session, db } }) => {
    const orgId = session.activeOrganizationId;
    if (!orgId) {
      throw new Error(
        "No hay organización activa. Por favor, selecciona una organización para continuar. {DashboardStats}",
      );
    }

    const {
      rows: [data],
    } = await db.execute(sql`SELECT
      ${db.$count(schema.budget, eq(schema.budget.organizationId, orgId))} AS budgets,
      ${db.$count(schema.material, eq(schema.material.organizationId, orgId))} AS materials,
      ${db.$count(schema.operation, eq(schema.operation.organizationId, orgId))} AS operations,
      ${db.$count(schema.quotation, eq(schema.quotation.organizationId, orgId))} AS quotations
    `);

    const budgets = Number(data.budgets);
    const materials = Number(data.materials);
    const operations = Number(data.operations);
    const quotations = Number(data.quotations);

    const recentQuotations = await db
      .select()
      .from(schema.quotation)
      .where(eq(schema.quotation.organizationId, orgId))
      .orderBy(desc(schema.quotation.createdAt))
      .limit(5);

    return {
      counts: { budgets, materials, operations, quotations },
      recentQuotations,
    };
  });
