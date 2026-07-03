import { queryOptions } from "@tanstack/react-query";
import { getBudgetById, getBudgetBySlug, listBudgets } from "./server/budgets";
import { getDashboardStats } from "./server/dashboard";
import { getMaterialInventory } from "./server/inventory";
import { listMaterials } from "./server/materials";
import { listOperations } from "./server/operations";
import { getUserOrganizationCount } from "./server/organizations";
import { listWhitelistedEmails } from "./server/whitelist";

export const queryKeys = {
  budgets: ["budgets"],
  budget: (idOrSlug: string) => ["budget", idOrSlug],
  materials: ["materials"],
  materialInventory: (materialId: string) => ["materials", "inventory", materialId],
  operations: ["operations"],
  dashboard: ["dashboard"],
  userOrganizationCount: ["userOrganizationCount"],
  whitelistEmails: ["whitelist-emails"],
};

export const budgetsListQueryOptions = queryOptions({
  queryKey: queryKeys.budgets,
  queryFn: ({ signal }) => listBudgets({ signal }),
});

export const budgetBySlugQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: queryKeys.budget(slug),
    queryFn: ({ signal }) => getBudgetBySlug({ data: { slug }, signal }),
  });

export const budgetByIdQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.budget(id),
    queryFn: ({ signal }) => getBudgetById({ data: { id }, signal }),
  });

export const materialsListQueryOptions = queryOptions({
  queryKey: queryKeys.materials,
  queryFn: ({ signal }) => listMaterials({ signal }),
});

export const materialInventoryQueryOptions = (materialId: string) =>
  queryOptions({
    queryKey: queryKeys.materialInventory(materialId),
    queryFn: ({ signal }) => getMaterialInventory({ data: { materialId }, signal }),
  });

export const operationsListQueryOptions = queryOptions({
  queryKey: queryKeys.operations,
  queryFn: ({ signal }) => listOperations({ signal }),
});

export const dashboardStatsQueryOptions = queryOptions({
  queryKey: queryKeys.dashboard,
  queryFn: ({ signal }) => getDashboardStats({ signal }),
});

export const userOrganizationCountQueryOptions = queryOptions({
  queryKey: queryKeys.userOrganizationCount,
  queryFn: ({ signal }) => getUserOrganizationCount({ signal }),
});

export const whitelistEmailsQueryOptions = queryOptions({
  queryKey: queryKeys.whitelistEmails,
  queryFn: ({ signal }) => listWhitelistedEmails({ signal }),
});
