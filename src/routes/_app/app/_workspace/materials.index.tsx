import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2Icon, PackageIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import * as z from "zod";
import { MaterialSheet } from "#/components/material-sheet";
import { PageHeader } from "#/components/page-header";
import { Pagination } from "#/components/pagination";
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
  context: ({ deps: { page } }) => {
    return {
      listOptions: materialsListQueryOptions({ page, pageSize: PAGE_SIZE }),
    };
  },
  loader: ({ context: { queryClient, listOptions } }) =>
    void queryClient.prefetchQuery(listOptions),
  pendingComponent: () => (
    <div className="flex h-64 items-center justify-center">
      <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
    </div>
  ),
});

type Material = Awaited<ReturnType<typeof listMaterials>>["items"][number];

function MaterialsPage() {
  const { listOptions } = Route.useRouteContext();
  const { page } = Route.useSearch();
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data } = useSuspenseQuery(listOptions);
  const materials = data.items;
  const total = data.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const deleteMutation = useMutation({
    mutationFn: deleteMaterial,
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
      <PageHeader title="Materiales" description="Gestiona tu catálogo de insumos y precios.">
        <Button onClick={openCreate}>
          <PlusIcon className="mr-2 size-4" />
          Agregar material
        </Button>
      </PageHeader>
      {materials.length === 0 ? (
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
          <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
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
