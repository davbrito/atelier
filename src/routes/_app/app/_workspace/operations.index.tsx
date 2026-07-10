import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  ScissorsIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import * as z from "zod";
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
import * as StyledField from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "#/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { operationsListQueryOptions } from "#/lib/query-options";
import {
  createOperation,
  deleteOperation,
  type listOperations,
  updateOperation,
} from "#/lib/server/operations";

const PAGE_SIZE = 20;

const operationsSearchSchema = z.object({
  page: z.number().int().min(1).default(1).catch(1),
});

export const Route = createFileRoute("/_app/app/_workspace/operations/")({
  component: OperationsPage,
  validateSearch: operationsSearchSchema,
  loaderDeps: ({ search: { page } }) => ({ page }),
  loader: ({ context: { queryClient }, deps: { page } }) =>
    void queryClient.prefetchQuery(operationsListQueryOptions(page, PAGE_SIZE)),
});

type Operation = Awaited<ReturnType<typeof listOperations>>["items"][number];

function OperationsPage() {
  const { page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const createFn = useServerFn(createOperation);
  const updateFn = useServerFn(updateOperation);
  const deleteFn = useServerFn(deleteOperation);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const { data, isLoading } = useQuery(operationsListQueryOptions(page, PAGE_SIZE));
  const operations = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      toast.success("Operación creada correctamente");
      setIsSheetOpen(false);
    },
    onError: () => toast.error("Error al crear la operación"),
  });

  const updateMutation = useMutation({
    mutationFn: updateFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      toast.success("Operación actualizada");
      setIsSheetOpen(false);
      setEditingOperation(null);
    },
    onError: () => toast.error("Error al actualizar la operación"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      toast.success("Operación eliminada");
      setDeletingId(null);
    },
    onError: () => toast.error("Error al eliminar la operación"),
  });

  function openCreate() {
    setEditingOperation(null);
    setFormKey((k) => k + 1);
    setIsSheetOpen(true);
  }

  function handleEdit(operation: Operation) {
    setEditingOperation(operation);
    setFormKey((k) => k + 1);
    setIsSheetOpen(true);
  }

  function goToPage(nextPage: number) {
    navigate({ search: { page: nextPage } });
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Operaciones</h1>
          <p className="mt-1 text-muted-foreground">Catálogo de operaciones de mano de obra.</p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon className="mr-2 size-4" />
          Agregar operación
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
        </div>
      ) : operations.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
          <ScissorsIcon className="mb-4 size-12 text-muted-foreground/20" />
          <h3 className="font-medium text-lg">No hay operaciones</h3>
          <p className="max-w-xs text-muted-foreground">
            Define las tareas de mano de obra como corte, costura o patronaje.
          </p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>
            Crear mi primera operación
          </Button>
        </Card>
      ) : (
        <>
          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Duración por defecto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {operations.map((operation) => (
                  <TableRow key={operation.id}>
                    <TableCell className="font-medium">{operation.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {operation.defaultDurationMinutes} min
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(operation)}>
                          <PencilIcon className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingId(operation.id)}
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
      <Sheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          setIsSheetOpen(open);
          if (!open) setEditingOperation(null);
        }}
      >
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{editingOperation ? "Editar operación" : "Nueva operación"}</SheetTitle>
            <SheetDescription>Ingresa el nombre de la operación de mano de obra.</SheetDescription>
          </SheetHeader>

          <Form
            key={formKey}
            onFormSubmit={(values: { name: string }) => {
              // defaultDurationMinutes is read from Field.Control but not typed in onFormSubmit yet
              const formEl = document.querySelector("form") as HTMLFormElement;
              const durationInput = formEl?.querySelector(
                "[name='defaultDurationMinutes']",
              ) as HTMLInputElement;
              const defaultDurationMinutes = Number(durationInput?.value) || 60;

              if (editingOperation) {
                updateMutation.mutate({
                  data: { id: editingOperation.id, name: values.name, defaultDurationMinutes },
                });
              } else {
                createMutation.mutate({ data: { name: values.name, defaultDurationMinutes } });
              }
            }}
            className="flex flex-1 flex-col gap-6 p-6"
          >
            <Field.Root name="name" render={<StyledField.Field />}>
              <Field.Label render={<StyledField.FieldLabel />}>Nombre</Field.Label>
              <Field.Control
                defaultValue={editingOperation?.name ?? ""}
                placeholder="Ej: Corte de tela"
                required
                render={<Input />}
              />
            </Field.Root>

            <Field.Root name="defaultDurationMinutes" render={<StyledField.Field />}>
              <Field.Label render={<StyledField.FieldLabel />}>
                Duración por defecto (min)
              </Field.Label>
              <Field.Control
                defaultValue={String(editingOperation?.defaultDurationMinutes ?? 60)}
                type="number"
                render={<Input />}
              />
            </Field.Root>

            <SheetFooter className="mt-auto">
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                )}
                {editingOperation ? "Guardar cambios" : "Crear operación"}
              </Button>
              <SheetClose render={<Button variant="outline" type="button" />}>Cancelar</SheetClose>
            </SheetFooter>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la operación de la base
              de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogAction
            onClick={() => deletingId && deleteMutation.mutate({ data: { id: deletingId } })}
            render={<Button variant="destructive" disabled={deleteMutation.isPending} />}
          >
            {deleteMutation.isPending ? "Eliminando..." : "Eliminar operación"}
          </AlertDialogAction>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" />}>Cancelar</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
