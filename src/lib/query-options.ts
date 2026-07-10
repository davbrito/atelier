import { queryOptions } from "@tanstack/react-query";
import { getBudgetById, getBudgetBySlug, listBudgets } from "./server/budgets";
import { getClientById, listClients } from "./server/clients";
import { getDashboardStats } from "./server/dashboard";
import { getMaterialInventory } from "./server/inventory";
import { getMaterialById, listMaterials } from "./server/materials";
import { listOperations } from "./server/operations";
import { getUserOrganizationCount } from "./server/organizations";
import { listWhitelistedEmails } from "./server/whitelist";

export const queryKeys = {
  budgets: ["budgets"],
  budget: (idOrSlug: string) => ["budget", idOrSlug],
  materials: ["materials"],
  materialsPage: (page: number, pageSize: number) => ["materials", page, pageSize],
  material: (id: string) => ["material", id],
  materialInventory: (materialId: string) => ["materials", "inventory", materialId],
  operations: ["operations"],
  operationsPage: (page: number, pageSize: number) => ["operations", page, pageSize],
  clients: ["clients"],
  clientsPage: (page: number, pageSize: number) => ["clients", page, pageSize],
  client: (id: string) => ["client", id],
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

export const materialsListQueryOptions = (page: number, pageSize: number) =>
  queryOptions({
    queryKey: queryKeys.materialsPage(page, pageSize),
    queryFn: ({ signal }) => listMaterials({ data: { page, pageSize }, signal }),
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

export const operationsListQueryOptions = (page: number, pageSize: number) =>
  queryOptions({
    queryKey: queryKeys.operationsPage(page, pageSize),
    queryFn: ({ signal }) => listOperations({ data: { page, pageSize }, signal }),
  });

export const clientsListQueryOptions = (page: number, pageSize: number) =>
  queryOptions({
    queryKey: queryKeys.clientsPage(page, pageSize),
    queryFn: ({ signal }) => listClients({ data: { page, pageSize }, signal }),
  });

export const clientByIdQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.client(id),
    queryFn: ({ signal }) => getClientById({ data: { id }, signal }),
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
