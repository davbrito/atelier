import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { getBudgetById, getBudgetBySlug, listBudgets } from "#/server/functions/budgets";
import { getClientById, listClients } from "#/server/functions/clients";
import { getDashboardCounts, getRecentQuotations } from "#/server/functions/dashboard";
import { listGarmentStages } from "#/server/functions/garment-stages";
import { listKanbanGarments } from "#/server/functions/garments";
import { getMaterialInventory } from "#/server/functions/inventory";
import { getMaterialById, listMaterials } from "#/server/functions/materials";
import { getOperationById, listOperations } from "#/server/functions/operations";
import {
  getOrder,
  type ListOrderOptions,
  listKanbanOrders,
  listOrders,
} from "#/server/functions/orders";
import { getUserOrganizationCount } from "#/server/functions/organizations";
import { getQuotation, getQuotationBySlug, listQuotations } from "#/server/functions/quotations";
import { listWhitelistedEmails } from "#/server/functions/whitelist";

export const queryKeys = {
  budgets: ["budgets"],
  budgetsPage: (params: { page: number; pageSize: number; search?: string }) => ["budgets", params],
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
  quotation: (slug: string) => ["quotation", slug],
  garmentStages: ["garment-stages"],
  kanbanGarments: ["kanban-garments"],
  kanbanOrders: ["kanban-orders"],
  ordersPage: (params: Record<string, unknown>) => ["orders", params],
  order: (code: string) => ["order", code],
  recentQuotations: ["recent-quotations"],
  dashboardCounts: ["dashboard-counts"],
  userOrganizationCount: ["userOrganizationCount"],
  whitelistEmails: ["whitelist-emails"],
};

export const budgetsListQueryOptions = (params: {
  page: number;
  pageSize: number;
  search?: string;
}) =>
  queryOptions({
    queryKey: queryKeys.budgetsPage(params),
    queryFn: ({ signal }) => listBudgets({ data: params, signal }),
  });

export const budgetsInfiniteListQueryOptions = (params: { pageSize: number; search?: string }) =>
  infiniteQueryOptions({
    queryKey: ["budgets", "infinite", params],
    queryFn: ({ pageParam, signal }) =>
      listBudgets({
        data: { page: pageParam, pageSize: params.pageSize, search: params.search },
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.page * lastPage.pageSize < lastPage.total ? lastPage.page + 1 : undefined,
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

export const quotationBySlugQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: queryKeys.quotation(slug),
    queryFn: ({ signal }) => getQuotationBySlug({ data: { slug }, signal }),
  });

export const quotationByIdQueryOptions = (id: string) =>
  queryOptions({
    queryKey: queryKeys.quotation(id),
    queryFn: ({ signal }) => getQuotation({ data: { id }, signal }),
  });

export const orderByCodeQueryOptions = (code: string) =>
  queryOptions({
    queryKey: queryKeys.order(code),
    queryFn: ({ signal }) => getOrder({ data: { code }, signal }),
  });

export const garmentStagesListQueryOptions = queryOptions({
  queryKey: queryKeys.garmentStages,
  queryFn: ({ signal }) => listGarmentStages({ signal }),
});

export const kanbanGarmentsListQueryOptions = queryOptions({
  queryKey: queryKeys.kanbanGarments,
  queryFn: ({ signal }) => listKanbanGarments({ signal }),
});

export const kanbanOrdersListQueryOptions = queryOptions({
  queryKey: queryKeys.kanbanOrders,
  queryFn: ({ signal }) => listKanbanOrders({ signal }),
});

export const ordersListQueryOptions = (params: ListOrderOptions) =>
  queryOptions({
    queryKey: queryKeys.ordersPage(params),
    queryFn: ({ signal }) => listOrders({ data: params, signal }),
  });

export const recentQuotationsQueryOptions = queryOptions({
  queryKey: queryKeys.recentQuotations,
  queryFn: ({ signal }) => getRecentQuotations({ signal }),
});

export const dashboardCountsQueryOptions = queryOptions({
  queryKey: queryKeys.dashboardCounts,
  queryFn: ({ signal }) => getDashboardCounts({ signal }),
});

export const userOrganizationCountQueryOptions = queryOptions({
  queryKey: queryKeys.userOrganizationCount,
  queryFn: ({ signal }) => getUserOrganizationCount({ signal }),
});

export const whitelistEmailsQueryOptions = queryOptions({
  queryKey: queryKeys.whitelistEmails,
  queryFn: ({ signal }) => listWhitelistedEmails({ signal }),
});
