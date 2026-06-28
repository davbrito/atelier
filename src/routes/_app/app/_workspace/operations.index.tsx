import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2Icon, PencilIcon, PlusIcon, ScissorsIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
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
import { operationsListQueryOptions } from "#/lib/query-options";
import {
  createOperation,
  deleteOperation,
  type listOperations,
  updateOperation,
} from "#/lib/server/operations";

export const Route = createFileRoute("/_app/app/_workspace/operations/")({
  component: OperationsPage,
  loader: ({ context: { queryClient } }) =>
    void queryClient.prefetchQuery(operationsListQueryOptions),
});

type Operation = Awaited<ReturnType<typeof listOperations>>[number];

function OperationsPage() {
  const queryClient = useQueryClient();
  const createFn = useServerFn(createOperation);
  const updateFn = useServerFn(updateOperation);
  const deleteFn = useServerFn(deleteOperation);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  const { data: operations, isLoading } = useQuery(operationsListQueryOptions);

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
      ) : operations?.length === 0 ? (
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {operations?.map((operation) => (
            <Card key={operation.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-medium text-sm">{operation.name}</CardTitle>
                <div className="flex gap-1">
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
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground text-xs">
                  Duración por defecto: {operation.defaultDurationMinutes} min
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
