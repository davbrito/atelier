import { DragDropProvider, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "#/components/ui/empty";
import { Input } from "#/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#/components/ui/select";
import {
  garmentStagesListQueryOptions,
  kanbanGarmentsListQueryOptions,
  queryKeys,
} from "#/lib/query-options";
import { optimisticUpdate } from "#/lib/query-utils";
import { type listKanbanGarments, moveGarmentStage } from "#/lib/server/garments";

type KanbanGarmentsData = Awaited<ReturnType<typeof listKanbanGarments>>;
type KanbanGarment = KanbanGarmentsData["items"][number];

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

const UNASSIGNED_COLUMN_ID = "__unassigned__";

function GarmentCard({ garment }: { garment: KanbanGarment }) {
  return (
    <Card className="gap-2 p-3">
      <CardHeader className="p-0">
        <CardTitle className="text-sm">{garment.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 p-0 text-xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <Link
            to="/app/orders/$code"
            params={{ code: garment.orderCode }}
            className="hover:underline"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {garment.orderCode}
          </Link>
          {garment.clientName && <span>{garment.clientName}</span>}
        </div>
        <div className="flex items-center justify-between">
          <Badge variant={PRIORITY_VARIANTS[garment.priority] ?? "outline"}>
            {PRIORITY_LABELS[garment.priority] ?? garment.priority}
          </Badge>
          {garment.dueDate && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <CalendarIcon className="size-3" />
              {new Date(garment.dueDate).toLocaleDateString("es-VE", {
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

function DraggableGarmentCard({ garment }: { garment: KanbanGarment }) {
  const { ref, isDragging } = useDraggable({ id: garment.id });

  return (
    <div ref={ref} className={isDragging ? "cursor-grabbing opacity-40" : "cursor-grab"}>
      <GarmentCard garment={garment} />
    </div>
  );
}

function KanbanColumn({
  column,
  garments,
}: {
  column: { id: string; name: string; color: string | null };
  garments: KanbanGarment[];
}) {
  const { ref, isDropTarget } = useDroppable({ id: column.id });

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        {column.color && (
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: column.color }}
          />
        )}
        <h3 className="font-medium text-sm">{column.name}</h3>
        <span className="text-muted-foreground text-xs">{garments.length}</span>
      </div>

      <div
        ref={ref}
        className={`flex min-h-16 flex-col gap-2 rounded-md p-1 transition-colors ${
          isDropTarget ? "bg-muted" : ""
        }`}
      >
        {garments.map((garment) => (
          <DraggableGarmentCard key={garment.id} garment={garment} />
        ))}
      </div>
    </div>
  );
}

export function OrderKanbanBoard() {
  const queryClient = useQueryClient();
  const { data: stagesData } = useSuspenseQuery(garmentStagesListQueryOptions);
  const { data: garmentsData } = useSuspenseQuery(kanbanGarmentsListQueryOptions);

  const stages = stagesData.items;
  const garments = garmentsData.items;

  const [priorityFilter, setPriorityFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [dueBefore, setDueBefore] = useState("");

  const clientOptions = useMemo(() => {
    const names = new Set(
      garments.map((g) => g.clientName).filter((name): name is string => !!name),
    );
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [garments]);

  const filteredGarments = useMemo(() => {
    return garments
      .filter((g) => priorityFilter === "all" || g.priority === priorityFilter)
      .filter((g) => clientFilter === "all" || g.clientName === clientFilter)
      .filter((g) => !dueBefore || (g.dueDate && new Date(g.dueDate) <= new Date(dueBefore)))
      .sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
  }, [garments, priorityFilter, clientFilter, dueBefore]);

  const moveMutation = useMutation({
    mutationFn: moveGarmentStage,
    onMutate: async ({ data: { id, stageId } }) => {
      const { previous } = await optimisticUpdate<KanbanGarmentsData>(
        queryClient,
        kanbanGarmentsListQueryOptions.queryKey,
        (old) =>
          old
            ? { ...old, items: old.items.map((g) => (g.id === id ? { ...g, stageId } : g)) }
            : old,
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(kanbanGarmentsListQueryOptions.queryKey, context.previous);
      }
      toast.error("Error al mover la prenda");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.kanbanGarments });
    },
  });

  if (stages.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyTitle>Primero configura las etapas del Kanban</EmptyTitle>
          <EmptyDescription>
            Necesitas al menos una etapa para poder organizar las prendas.{" "}
            <Link to="/app/orders/stages">Ir a configurar etapas</Link>
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const unassigned = filteredGarments.filter((g) => !g.stageId);

  const columns = [
    ...(unassigned.length > 0
      ? [{ id: UNASSIGNED_COLUMN_ID, name: "Sin etapa", color: null as string | null }]
      : []),
    ...stages.map((s) => ({ id: s.id, name: s.name, color: s.color })),
  ];

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
        <Input
          type="date"
          value={dueBefore}
          onChange={(e) => setDueBefore(e.target.value)}
          className="w-auto"
          aria-label="Entrega hasta"
        />
        {(priorityFilter !== "all" || clientFilter !== "all" || dueBefore) && (
          <button
            type="button"
            className="text-muted-foreground text-xs underline"
            onClick={() => {
              setPriorityFilter("all");
              setClientFilter("all");
              setDueBefore("");
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

          const garment = filteredGarments.find((g) => g.id === source.id);
          if (!garment) return;

          const stageId = target.id === UNASSIGNED_COLUMN_ID ? null : (target.id as string);
          if (garment.stageId === stageId) return;

          moveMutation.mutate({ data: { id: garment.id, stageId } });
        }}
      >
        <div className="flex grow gap-4 overflow-x-auto px-6 pb-6">
          {columns.map((column) => {
            const columnGarments =
              column.id === UNASSIGNED_COLUMN_ID
                ? unassigned
                : filteredGarments.filter((g) => g.stageId === column.id);

            return <KanbanColumn key={column.id} column={column} garments={columnGarments} />;
          })}
        </div>
        <DragOverlay>
          {(source) => {
            const garment = filteredGarments.find((g) => g.id === source.id);
            return garment ? <GarmentCard garment={garment} /> : null;
          }}
        </DragOverlay>
      </DragDropProvider>
    </div>
  );
}
