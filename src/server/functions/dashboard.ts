import { createServerFn } from "@tanstack/react-start";
import { organizationMiddleware } from "#/lib/auth/functions";
import { quotationsQuery } from "#/lib/services/quotations";
import { getDashboardCounts as getDashboardCountsUseCase } from "../application/dashboard";

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
  .handler(async ({ context: { activeOrganizationId: orgId, db } }) =>
    getDashboardCountsUseCase(db, orgId),
  );
