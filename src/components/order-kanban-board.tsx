import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "#/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import {
  garmentStagesListQueryOptions,
  kanbanGarmentsListQueryOptions,
  queryKeys,
} from "#/lib/query-options";
import { optimisticUpdate } from "#/lib/query-utils";
import { type listKanbanGarments, moveGarmentStage } from "#/lib/server/garments";

type KanbanGarmentsData = Awaited<ReturnType<typeof listKanbanGarments>>;

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

export function OrderKanbanBoard() {
  const queryClient = useQueryClient();
  const { data: stagesData } = useSuspenseQuery(garmentStagesListQueryOptions);
  const { data: garmentsData } = useSuspenseQuery(kanbanGarmentsListQueryOptions);

  const stages = stagesData.items;
  const garments = garmentsData.items;

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

  const unassigned = garments.filter((g) => !g.stageId);

  const columns = [
    ...(unassigned.length > 0
      ? [{ id: UNASSIGNED_COLUMN_ID, name: "Sin etapa", color: null as string | null }]
      : []),
    ...stages.map((s) => ({ id: s.id, name: s.name, color: s.color })),
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {columns.map((column) => {
        const columnGarments =
          column.id === UNASSIGNED_COLUMN_ID
            ? unassigned
            : garments.filter((g) => g.stageId === column.id);

        return (
          <div key={column.id} className="flex w-72 shrink-0 flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              {column.color && (
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: column.color }}
                />
              )}
              <h3 className="font-medium text-sm">{column.name}</h3>
              <span className="text-muted-foreground text-xs">{columnGarments.length}</span>
            </div>

            <div className="flex flex-col gap-2">
              {columnGarments.map((garment) => (
                <Card key={garment.id} className="gap-2 p-3">
                  <CardHeader className="p-0">
                    <CardTitle className="text-sm">{garment.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2 p-0 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <Link
                        to="/app/orders/$code"
                        params={{ code: garment.orderCode }}
                        className="hover:underline"
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
                    <Select
                      items={stages.map((stage) => ({ label: stage.name, value: stage.id }))}
                      value={garment.stageId ?? ""}
                      onValueChange={(value: string | null) =>
                        moveMutation.mutate({ data: { id: garment.id, stageId: value || null } })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Sin etapa" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            {stage.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
