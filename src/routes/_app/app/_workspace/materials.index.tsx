import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2Icon, PackageIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { materialsListQueryOptions } from "#/lib/query-options";
import { deleteMaterial, type listMaterials } from "#/lib/server/materials";
import { UNIT_OPTIONS } from "#/lib/units";

export const Route = createFileRoute("/_app/app/_workspace/materials/")({
  component: MaterialsPage,
  loader: ({ context: { queryClient } }) =>
    void queryClient.prefetchQuery(materialsListQueryOptions),
});

type Material = Awaited<ReturnType<typeof listMaterials>>[number];

function MaterialsPage() {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteMaterial);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: materials, isLoading } = useQuery(materialsListQueryOptions);

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["materials"] });
      toast.success("Material eliminado");
      setDeletingId(null);
    },
    onError: () => toast.error("Error al eliminar el material"),
  });

  function openCreate() {
    setEditingMaterial(null);
    setIsSheetOpen(true);
  }

  function handleEdit(material: Material) {
    setEditingMaterial(material);
    setIsSheetOpen(true);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Materiales</h1>
          <p className="mt-1 text-muted-foreground">Gestiona tu catálogo de insumos y precios.</p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon className="mr-2 size-4" />
          Agregar material
        </Button>
      </div>
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
        </div>
      ) : materials?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
          <PackageIcon className="mb-4 size-12 text-muted-foreground/20" />
          <h3 className="font-medium text-lg">No hay materiales</h3>
          <p className="max-w-xs text-muted-foreground">
            Comienza agregando los hilos, telas o accesorios que utilizas en tus prendas.
          </p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>
            Crear mi primer material
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {materials?.map((material) => {
            const unit =
              UNIT_OPTIONS.find((option) => option.value === material.unit)?.label || material.unit;
            return (
              <Card key={material.id} className="relative overflow-hidden pt-0">
                <div className="absolute inset-0 z-30 aspect-video bg-black/35" />
                {material.image ? (
                  <img
                    src={material.image}
                    alt={material.name}
                    className="relative z-20 aspect-video w-full object-cover brightness-60 grayscale-25 dark:brightness-40"
                  />
                ) : (
                  <div className="relative z-20 aspect-video w-full bg-gray-100" />
                )}
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="font-medium text-sm">{material.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(material)}>
                      <PencilIcon className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingId(material.id)}
                    >
                      <Trash2Icon className="size-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground uppercase tracking-wider">Precio</span>
                    <span className="font-bold">
                      ${material.currentPrice} / {unit}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs">
                    <span className="text-muted-foreground uppercase tracking-wider">Stock</span>
                    <span
                      className={
                        Number(material.currentStock) < 0
                          ? "font-bold text-destructive"
                          : "font-bold"
                      }
                    >
                      {Number(material.currentStock).toLocaleString("es-VE", {
                        maximumFractionDigits: 4,
                      })}{" "}
                      {unit}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      {/* Form Sheet */}
      <MaterialSheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          if (!open) setEditingMaterial(null);
          setIsSheetOpen(open);
        }}
        editingMaterial={editingMaterial}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
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
              onClick={() => deletingId && deleteMutation.mutate({ data: { id: deletingId } })}
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
