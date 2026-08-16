import { DragDropProvider, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { toast } from "#/components/ui/toast.tsx";
import { ORDER_STATUSES } from "#/lib/constants/order-status";
import { formatMoney } from "#/lib/format";
import { kanbanOrdersListQueryOptions, queryKeys } from "#/lib/query-options";
import { optimisticUpdate } from "#/lib/query-utils";
import { type listKanbanOrders, updateOrderStatus } from "#/lib/server/orders";

type KanbanOrdersData = Awaited<ReturnType<typeof listKanbanOrders>>;
type KanbanOrder = KanbanOrdersData["items"][number];

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

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function OrderStatusBadge({ priority }: { priority: string }) {
  const variant = PRIORITY_VARIANTS[priority] ?? "outline";
  const classes: Record<string, string> = {
    outline: "bg-muted text-muted-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    default: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs ${classes[variant]}`}>
      {PRIORITY_LABELS[priority] ?? priority}
    </span>
  );
}

function OrderCard({ order }: { order: KanbanOrder }) {
  return (
    <Card className="gap-2 p-3">
      <CardHeader className="p-0">
        <CardTitle className="text-sm">
          <Link
            to="/app/orders/$code"
            params={{ code: order.code }}
            className="hover:underline"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {order.code}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-0 text-xs">
        <div className="flex items-center justify-between text-muted-foreground">
          {order.clientName && <span>{order.clientName}</span>}
          <span className="font-medium text-foreground">
            {formatMoney(Number(order.totalAmount))}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <OrderStatusBadge priority={order.priority} />
          {order.dueDate && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <CalendarIcon className="size-3" />
              {new Date(order.dueDate).toLocaleDateString("es-VE", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DraggableOrderCard({ order }: { order: KanbanOrder }) {
  const { ref, isDragging } = useDraggable({ id: order.id });

  return (
    <div ref={ref} className={isDragging ? "cursor-grabbing opacity-40" : "cursor-grab"}>
      <OrderCard order={order} />
    </div>
  );
}

function KanbanColumn({
  column,
  orders,
}: {
  column: { id: string; name: string };
  orders: KanbanOrder[];
}) {
  const { ref, isDropTarget } = useDroppable({ id: column.id });

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <h3 className="font-medium text-sm">{column.name}</h3>
        <span className="text-muted-foreground text-xs">{orders.length}</span>
      </div>

      <div
        ref={ref}
        className={`flex min-h-16 flex-col gap-2 rounded-md p-1 transition-colors ${
          isDropTarget ? "bg-muted" : ""
        }`}
      >
        {orders.map((order) => (
          <DraggableOrderCard key={order.id} order={order} />
        ))}
      </div>
    </div>
  );
}

export function OrderStatusKanbanBoard() {
  const queryClient = useQueryClient();
  const { data: ordersData } = useSuspenseQuery(kanbanOrdersListQueryOptions);
  const orders = ordersData.items;

  const [priorityFilter, setPriorityFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  const clientOptions = useMemo(() => {
    const names = new Set(orders.map((o) => o.clientName).filter((name): name is string => !!name));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => priorityFilter === "all" || o.priority === priorityFilter)
      .filter((o) => clientFilter === "all" || o.clientName === clientFilter)
      .sort((a, b) => {
        const priorityDiff =
          (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99);
        if (priorityDiff !== 0) return priorityDiff;

        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [orders, priorityFilter, clientFilter]);

  const statusMutation = useMutation({
    mutationFn: updateOrderStatus,
    onMutate: async ({ data: { id, status } }) => {
      const { previous } = await optimisticUpdate<KanbanOrdersData>(
        queryClient,
        kanbanOrdersListQueryOptions.queryKey,
        (old) =>
          old ? { ...old, items: old.items.map((o) => (o.id === id ? { ...o, status } : o)) } : old,
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(kanbanOrdersListQueryOptions.queryKey, context.previous);
      }
      toast.error("Error al mover el pedido");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanbanOrders });
    },
  });

  const columns = ORDER_STATUSES.map((s) => ({ id: s.code, name: s.label }));

  return (
    <div className="flex min-h-0 grow flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 px-6">
        <Select
          items={[
            { label: "Todas las prioridades", value: "all" },
            { label: "Baja", value: "low" },
            { label: "Media", value: "medium" },
            { label: "Alta", value: "high" },
            { label: "Urgente", value: "urgent" },
          ]}
          value={priorityFilter}
          onValueChange={(value) => setPriorityFilter(value ?? "all")}
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
            { label: "Todos los clientes", value: "all" },
            ...clientOptions.map((name) => ({ label: name, value: name })),
          ]}
          value={clientFilter}
          onValueChange={(value) => setClientFilter(value ?? "all")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los clientes</SelectItem>
            {clientOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(priorityFilter !== "all" || clientFilter !== "all") && (
          <button
            type="button"
            className="text-muted-foreground text-xs underline"
            onClick={() => {
              setPriorityFilter("all");
              setClientFilter("all");
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <DragDropProvider
        onDragEnd={(event) => {
          const { source, target } = event.operation;
          if (!source || !target) return;

          const order = filteredOrders.find((o) => o.id === source.id);
          if (!order) return;

          const status = target.id as KanbanOrder["status"];
          if (order.status === status) return;

          statusMutation.mutate({ data: { id: order.id, status } });
        }}
      >
        <div className="flex grow gap-4 overflow-x-auto px-6 pb-6">
          {columns.map((column) => {
            const columnOrders = filteredOrders.filter((o) => o.status === column.id);
            return <KanbanColumn key={column.id} column={column} orders={columnOrders} />;
          })}
        </div>
        <DragOverlay>
          {(source) => {
            const order = filteredOrders.find((o) => o.id === source.id);
            return order ? <OrderCard order={order} /> : null;
          }}
        </DragOverlay>
      </DragDropProvider>
    </div>
  );
}
