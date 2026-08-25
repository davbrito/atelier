import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  createColumnHelper,
  type PaginationState,
  rowPaginationFeature,
  rowSortingFeature,
  type SortingState,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { Pagination } from "#/components/pagination";
import { Badge } from "#/components/ui/badge";
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { formatMoney, LOCALE } from "#/lib/format";
import { ordersListQueryOptions } from "#/lib/query-options";
import type { listOrders } from "#/server/functions/orders";

type OrderRow = Awaited<ReturnType<typeof listOrders>>["items"][number];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  ready: "Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_VARIANTS: Record<string, "outline" | "secondary" | "default" | "destructive"> = {
  pending: "outline",
  in_progress: "secondary",
  ready: "default",
  delivered: "default",
  cancelled: "destructive",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_VARIANTS: Record<string, "outline" | "secondary" | "default" | "destructive"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

// Defined statically outside the component, as recommended by the TanStack
// Table docs — the features/columns shape is fixed and reused every render.
// No sortedRowModel/paginatedRowModel: sorting and pagination are manual
// (server-side), so the table must not re-derive them from `data`, which is
// already just the current page of already-sorted/filtered rows.
const features = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
});

const columnHelper = createColumnHelper<typeof features, OrderRow>();

const columns = columnHelper.columns([
  columnHelper.accessor("code", {
    header: "Código",
  }),
  columnHelper.accessor("clientName", {
    header: "Cliente",
    cell: (info) => info.getValue() ?? "—",
  }),
  columnHelper.accessor("priority", {
    header: "Prioridad",
    cell: (info) => {
      const priority = info.getValue();
      return (
        <Badge variant={PRIORITY_VARIANTS[priority] ?? "outline"}>
          {PRIORITY_LABELS[priority] ?? priority}
        </Badge>
      );
    },
  }),
  columnHelper.accessor("status", {
    header: "Estado",
    cell: (info) => {
      const status = info.getValue();
      return (
        <Badge variant={STATUS_VARIANTS[status] ?? "outline"}>
          {STATUS_LABELS[status] ?? status}
        </Badge>
      );
    },
  }),
  columnHelper.accessor("dueDate", {
    header: "Fecha de entrega",
    cell: (info) => {
      const value = info.getValue();
      return value
        ? new Date(value).toLocaleDateString(LOCALE, { day: "numeric", month: "short" })
        : "—";
    },
  }),
  columnHelper.accessor("totalAmount", {
    header: "Total",
    cell: (info) => formatMoney(Number(info.getValue())),
  }),
]);

const PAGE_SIZE = 10;

export function OrdersTable() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: PAGE_SIZE,
  });

  const sort = sorting[0];
  const { data, isPlaceholderData } = useQuery({
    ...ordersListQueryOptions({
      page: pagination.pageIndex + 1,
      pageSize: pagination.pageSize,
      search: search || undefined,
      priority: priorityFilter === "all" ? undefined : (priorityFilter as OrderRow["priority"]),
      status: statusFilter === "all" ? undefined : (statusFilter as OrderRow["status"]),
      sortBy: sort?.id as
        | "code"
        | "clientName"
        | "priority"
        | "status"
        | "dueDate"
        | "totalAmount"
        | undefined,
      sortDir: sort ? (sort.desc ? "desc" : "asc") : "desc",
    }),
    placeholderData: keepPreviousData,
  });

  const table = useTable({
    features,
    columns,
    data: data?.items ?? [],
    getRowId: (row) => row.id,
    manualSorting: true,
    manualPagination: true,
    rowCount: data?.total ?? 0,
    state: { sorting, pagination },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    },
    onPaginationChange: setPagination,
  });

  function resetToFirstPage() {
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pagination.pageSize));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            resetToFirstPage();
          }}
          placeholder="Buscar por código o cliente..."
          className="max-w-xs"
        />
        <Select
          items={[
            { label: "Todas las prioridades", value: "all" },
            { label: "Baja", value: "low" },
            { label: "Media", value: "medium" },
            { label: "Alta", value: "high" },
            { label: "Urgente", value: "urgent" },
          ]}
          value={priorityFilter}
          onValueChange={(value) => {
            setPriorityFilter(value ?? "all");
            resetToFirstPage();
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las prioridades</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
          </SelectContent>
        </Select>
        <Select
          items={[
            { label: "Todos los estados", value: "all" },
            { label: "Pendiente", value: "pending" },
            { label: "En progreso", value: "in_progress" },
            { label: "Listo", value: "ready" },
            { label: "Entregado", value: "delivered" },
            { label: "Cancelado", value: "cancelled" },
          ]}
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value ?? "all");
            resetToFirstPage();
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="in_progress">En progreso</SelectItem>
            <SelectItem value="ready">Listo</SelectItem>
            <SelectItem value="delivered">Entregado</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        {isPlaceholderData && <Loader2Icon className="size-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        className="flex items-center gap-1 disabled:cursor-default"
                        onClick={header.column.getToggleSortingHandler()}
                        disabled={!header.column.getCanSort()}
                      >
                        <table.FlexRender header={header} />
                        {header.column.getCanSort() &&
                          (header.column.getIsSorted() === "asc" ? (
                            <ArrowUpIcon className="size-3" />
                          ) : header.column.getIsSorted() === "desc" ? (
                            <ArrowDownIcon className="size-3" />
                          ) : (
                            <ArrowUpDownIcon className="size-3 text-muted-foreground/50" />
                          ))}
                      </button>
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-muted-foreground">
                  No se encontraron pedidos.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() =>
                    navigate({ to: "/app/orders/$code", params: { code: row.original.code } })
                  }
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination
        page={pagination.pageIndex + 1}
        totalPages={totalPages}
        onPageChange={(page) => setPagination((p) => ({ ...p, pageIndex: page - 1 }))}
      />
    </div>
  );
}
