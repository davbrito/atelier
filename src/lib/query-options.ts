import { queryOptions } from "@tanstack/react-query";
import { getBudgetById, getBudgetBySlug, listBudgets } from "./server/budgets";
import { getDashboardStats } from "./server/dashboard";
import { listMaterials } from "./server/materials";
import { listOperations } from "./server/operations";
import { getUserOrganizationCount } from "./server/organizations";

export const queryKeys = {
  budgets: ["budgets"],
  budget: (idOrSlug: string) => ["budget", idOrSlug],
  materials: ["materials"],
  operations: ["operations"],
  dashboard: ["dashboard"],
  userOrganizationCount: ["userOrganizationCount"],
};

export const budgetsListQueryOptions = queryOptions({
  queryKey: queryKeys.budgets,
  queryFn: () => listBudgets(),
});

export const budgetBySlugQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: queryKeys.budget(slug),
    queryFn: () => getBudgetBySlug({ data: { slug } }),
  });

export const budgetByIdQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.budget(id),
    queryFn: () => getBudgetById({ data: { id } }),
  });

export const materialsListQueryOptions = queryOptions({
  queryKey: queryKeys.materials,
  queryFn: () => listMaterials(),
});

export const operationsListQueryOptions = queryOptions({
  queryKey: queryKeys.operations,
  queryFn: () => listOperations(),
});

export const dashboardStatsQueryOptions = queryOptions({
  queryKey: queryKeys.dashboard,
  queryFn: () => getDashboardStats(),
});

export const userOrganizationCountQueryOptions = queryOptions({
  queryKey: queryKeys.userOrganizationCount,
  queryFn: () => getUserOrganizationCount(),
});
