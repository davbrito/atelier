import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeftIcon,
  BoxesIcon,
  PackageIcon,
  PencilIcon,
  TagIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MaterialSheet } from "#/components/material-sheet";
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
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { Dialog, DialogContent } from "#/components/ui/dialog";
import { materialByIdQueryOptions } from "#/lib/query-options";
import { deleteMaterial } from "#/lib/server/materials";
import { UNIT_OPTIONS } from "#/lib/units";

export const Route = createFileRoute("/_app/app/_workspace/materials/$id")({
  component: MaterialDetailPage,
  loader: ({ context: { queryClient }, params: { id } }) =>
    void queryClient.prefetchQuery(materialByIdQueryOptions(id)),
});

function MaterialDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteMaterial);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const { data: material, isLoading } = useQuery(materialByIdQueryOptions(id));

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material eliminado");
      navigate({ to: "/app/materials" });
    },
    onError: () => toast.error("Error al eliminar el material"),
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="h-40 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  if (!material) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Material no encontrado.</p>
        <Button
          variant="outline"
          className="mt-4"
          nativeButton={false}
          render={<Link to="/app/materials" />}
        >
          Volver
        </Button>
      </div>
    );
  }

  const unit =
    UNIT_OPTIONS.find((option) => option.value === material.unit)?.label ?? material.unit;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-xl">
        {material.image ? (
          <button
            type="button"
            onClick={() => setIsGalleryOpen(true)}
            className="block aspect-[21/9] w-full cursor-zoom-in"
          >
            <img
              src={material.image}
              alt={material.name}
              className="size-full object-cover transition hover:brightness-90"
              style={{
                viewTransitionName: `material-image-${material.id}`,
                viewTransitionClass: "material-image material-image-banner",
              }}
            />
          </button>
        ) : (
          <div className="flex aspect-[21/9] w-full items-center justify-center bg-gradient-to-br from-muted to-muted/40">
            <PackageIcon className="size-10 text-muted-foreground/30" />
          </div>
        )}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-3 left-3 shadow"
          nativeButton={false}
          render={<Link to="/app/materials" viewTransition />}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="w-fit font-heading text-2xl"
            style={{
              viewTransitionName: `material-title-${material.id}`,
              viewTransitionClass: "material-title",
            }}
          >
            {material.name}
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Agregado el{" "}
            {new Intl.DateTimeFormat("es-VE", { dateStyle: "long" }).format(
              new Date(material.createdAt),
            )}
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setIsSheetOpen(true)}>
            <PencilIcon className="mr-1 size-3" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2Icon className="size-3" />
          </Button>
        </div>
      </div>

      {material.image && (
        <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
          <DialogContent className="max-w-3xl bg-transparent p-0 shadow-none ring-0">
            <img
              src={material.image}
              alt={material.name}
              className="max-h-[85vh] w-full rounded-xl object-contain"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TagIcon className="size-4 text-muted-foreground" />
            Detalles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Precio</span>
              <span className="font-semibold">
                ${material.currentPrice} / {unit}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Unidad</span>
              <span className="font-semibold">{unit}</span>
            </div>
            {material.color && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Color</span>
                <span className="flex items-center gap-2 font-semibold">
                  <span
                    className="size-3 rounded-full border"
                    style={{ backgroundColor: material.color }}
                  />
                  {material.colorName || material.color}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stock */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BoxesIcon className="size-4 text-muted-foreground" />
            Stock
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p
            className={
              Number(material.currentStock) < 0
                ? "font-bold text-3xl text-destructive tabular-nums"
                : "font-bold text-3xl tabular-nums"
            }
          >
            {Number(material.currentStock).toLocaleString("es-VE", { maximumFractionDigits: 4 })}
            <span className="ml-1.5 font-normal text-muted-foreground text-sm">{unit}</span>
          </p>
        </CardContent>
      </Card>

      <MaterialSheet open={isSheetOpen} onOpenChange={setIsSheetOpen} editingMaterial={material} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el material de la base
              de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" />}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate({ data: { id } })}
              variant="destructive"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar material"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
