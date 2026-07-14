import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import * as z from "zod";
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
import { Card } from "#/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { materialsListQueryOptions } from "#/lib/query-options";
import { deleteMaterial, type listMaterials } from "#/lib/server/materials";
import { UNIT_OPTIONS } from "#/lib/units";

const PAGE_SIZE = 20;

const materialsSearchSchema = z.object({
  page: z.number().int().min(1).default(1).catch(1),
});

export const Route = createFileRoute("/_app/app/_workspace/materials/")({
  component: MaterialsPage,
  validateSearch: materialsSearchSchema,
  loaderDeps: ({ search: { page } }) => ({ page }),
  loader: ({ context: { queryClient }, deps: { page } }) =>
    void queryClient.prefetchQuery(materialsListQueryOptions({ page, pageSize: PAGE_SIZE })),
});

type Material = Awaited<ReturnType<typeof listMaterials>>["items"][number];

function MaterialsPage() {
  const { page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteMaterial);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery(materialsListQueryOptions({ page, pageSize: PAGE_SIZE }));
  const materials = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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

  function goToPage(nextPage: number) {
    navigate({ search: { page: nextPage } });
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
      ) : materials.length === 0 ? (
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
        <>
          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead></TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {materials.map((material) => {
                  const unit =
                    UNIT_OPTIONS.find((option) => option.value === material.unit)?.label ||
                    material.unit;
                  return (
                    <TableRow key={material.id}>
                      <TableCell>
                        <Link
                          to="/app/materials/$id"
                          params={{ id: material.id }}
                          viewTransition
                          className="block"
                        >
                          {material.image ? (
                            <img
                              src={material.image}
                              alt={material.name}
                              className="size-8 rounded object-cover"
                              style={{
                                viewTransitionName: `material-image-${material.id}`,
                                viewTransitionClass: "material-image material-image-thumb",
                              }}
                            />
                          ) : (
                            <div className="flex size-8 items-center justify-center rounded bg-muted">
                              <PackageIcon className="size-4 text-muted-foreground/40" />
                            </div>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          to="/app/materials/$id"
                          params={{ id: material.id }}
                          viewTransition
                          className="hover:underline"
                        >
                          <span
                            style={{
                              viewTransitionName: `material-title-${material.id}`,
                              viewTransitionClass: "material-title",
                            }}
                          >
                            {material.name}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        {material.color ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="size-3 shrink-0 rounded-full border"
                              style={{ backgroundColor: material.color }}
                            />
                            <span className="text-muted-foreground">
                              {material.colorName || material.color}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        ${material.currentPrice} / {unit}
                      </TableCell>
                      <TableCell
                        className={Number(material.currentStock) < 0 ? "text-destructive" : ""}
                      >
                        {Number(material.currentStock).toLocaleString("es-VE", {
                          maximumFractionDigits: 4,
                        })}{" "}
                        {unit}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                <ChevronLeftIcon className="mr-1 size-4" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => goToPage(page + 1)}
              >
                Siguiente
                <ChevronRightIcon className="ml-1 size-4" />
              </Button>
            </div>
          </div>
        </>
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
