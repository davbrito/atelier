import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { GarmentStageSheet } from "#/components/garment-stage-sheet";
import { PageHeader } from "#/components/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card } from "#/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { garmentStagesListQueryOptions, queryKeys } from "#/lib/query-options";
import {
  deleteGarmentStage,
  type listGarmentStages,
  reorderGarmentStages,
  seedDefaultGarmentStages,
} from "#/lib/server/garment-stages";

export const Route = createFileRoute("/_app/app/_workspace/orders/stages")({
  component: OrderStagesPage,
  loader: ({ context: { queryClient } }) =>
    void queryClient.prefetchQuery(garmentStagesListQueryOptions),
  pendingComponent: () => (
    <div className="flex h-64 items-center justify-center">
      <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
    </div>
  ),
});

type GarmentStage = Awaited<ReturnType<typeof listGarmentStages>>["items"][number];

function OrderStagesPage() {
  const queryClient = useQueryClient();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<GarmentStage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data } = useSuspenseQuery(garmentStagesListQueryOptions);
  const stages = data.items;

  const seedFn = useServerFn(seedDefaultGarmentStages);
  const reorderFn = useServerFn(reorderGarmentStages);

  const seedMutation = useMutation({
    mutationFn: seedFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.garmentStages });
      toast.success("Etapas por defecto creadas");
    },
    onError: () => toast.error("Error al crear las etapas por defecto"),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.garmentStages });
    },
    onError: () => toast.error("Error al reordenar las etapas"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGarmentStage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.garmentStages });
      toast.success("Etapa eliminada");
      setDeletingId(null);
    },
    onError: () => toast.error("Error al eliminar la etapa"),
  });

  function openCreate() {
    setEditingStage(null);
    setIsSheetOpen(true);
  }

  function handleEdit(stage: GarmentStage) {
    setEditingStage(stage);
    setIsSheetOpen(true);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;

    const orderedIds = stages.map((s) => s.id);
    [orderedIds[index], orderedIds[target]] = [orderedIds[target], orderedIds[index]];
    reorderMutation.mutate({ data: { orderedIds } });
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        back
        title="Etapas del Kanban"
        description="Configura las columnas del tablero de pedidos"
      >
        {stages.length > 0 && (
          <Button onClick={openCreate}>
            <PlusIcon className="size-4" />
            Nueva etapa
          </Button>
        )}
      </PageHeader>

      {stages.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SparklesIcon />
            </EmptyMedia>
            <EmptyTitle>Aún no tienes etapas configuradas</EmptyTitle>
            <EmptyDescription>
              Puedes empezar con las etapas recomendadas para talleres de confección, o crear las
              tuyas desde cero.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => seedMutation.mutate({})} disabled={seedMutation.isPending}>
                {seedMutation.isPending && <Loader2Icon className="size-4 animate-spin" />}
                Crear etapas por defecto
              </Button>
              <Button variant="outline" onClick={openCreate}>
                Crear etapa personalizada
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      ) : (
        <Card className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20"></TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map((stage, index) => (
                <TableRow key={stage.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === 0 || reorderMutation.isPending}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUpIcon className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={index === stages.length - 1 || reorderMutation.isPending}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDownIcon className="size-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 shrink-0 rounded-full border"
                        style={{ backgroundColor: stage.color ?? undefined }}
                      />
                      {stage.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {stage.isFinalStage && <Badge variant="secondary">Final</Badge>}
                      {stage.isSystemDefault && <Badge variant="outline">Por defecto</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(stage)}>
                        <PencilIcon className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeletingId(stage.id)}
                      >
                        <Trash2Icon className="size-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <GarmentStageSheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          if (!open) setEditingStage(null);
          setIsSheetOpen(open);
        }}
        editingStage={editingStage}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Las prendas que estén en esta etapa quedarán sin
              etapa asignada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" />}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deletingId && deleteMutation.mutate({ data: { id: deletingId } })}
              variant="destructive"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar etapa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
