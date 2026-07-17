import { queryOptions } from "@tanstack/react-query";
import { getBudgetById, getBudgetBySlug, listBudgets } from "./server/budgets";
import { getClientById, listClients } from "./server/clients";
import { getDashboardStats } from "./server/dashboard";
import { getMaterialInventory } from "./server/inventory";
import { getMaterialById, listMaterials } from "./server/materials";
import { getOperationById, listOperations } from "./server/operations";
import { getUserOrganizationCount } from "./server/organizations";
import { listQuotations } from "./server/quotations";
import { listWhitelistedEmails } from "./server/whitelist";

export const queryKeys = {
  budgets: ["budgets"],
  budget: (idOrSlug: string) => ["budget", idOrSlug],
  materials: ["materials"],
  materialsPage: (params: { page: number; pageSize: number }) => ["materials", params],
  material: (id: string) => ["material", id],
  materialInventory: (materialId: string) => ["materials", "inventory", materialId],
  operations: ["operations"],
  operationsPage: (params: { page: number; pageSize: number }) => ["operations", params],
  operation: (id: string) => ["operation", id],
  clients: ["clients"],
  clientsPage: (params: { page: number; pageSize: number }) => ["clients", params],
  client: (id: string) => ["client", id],
  quotations: ["quotations"],
  quotationsPage: (params: { page: number; pageSize: number }) => ["quotations", params],
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

export const materialsListQueryOptions = (params: { page: number; pageSize: number }) =>
  queryOptions({
    queryKey: queryKeys.materialsPage(params),
    queryFn: ({ signal }) => listMaterials({ data: params, signal }),
  });

export const materialByIdQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.material(id),
    queryFn: ({ signal }) => getMaterialById({ data: { id }, signal }),
  });

export const materialInventoryQueryOptions = (materialId: string) =>
  queryOptions({
    queryKey: queryKeys.materialInventory(materialId),
    queryFn: ({ signal }) => getMaterialInventory({ data: { materialId }, signal }),
  });

export const operationsListQueryOptions = (params: { page: number; pageSize: number }) =>
  queryOptions({
    queryKey: queryKeys.operationsPage(params),
    queryFn: ({ signal }) => listOperations({ data: params, signal }),
  });

export const operationByIdQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.operation(id),
    queryFn: ({ signal }) => getOperationById({ data: { id }, signal }),
  });

export const clientsListQueryOptions = (params: { page: number; pageSize: number }) =>
  queryOptions({
    queryKey: queryKeys.clientsPage(params),
    queryFn: ({ signal }) => listClients({ data: params, signal }),
  });

export const clientByIdQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.client(id),
    queryFn: ({ signal }) => getClientById({ data: { id }, signal }),
  });

export const quotationsListQueryOptions = (params: { page: number; pageSize: number }) =>
  queryOptions({
    queryKey: queryKeys.quotationsPage(params),
    queryFn: ({ signal }) => listQuotations({ data: params, signal }),
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
