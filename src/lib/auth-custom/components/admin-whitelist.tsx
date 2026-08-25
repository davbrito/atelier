import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, MailIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
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
import { Item, ItemActions, ItemContent, ItemMedia, ItemTitle } from "#/components/ui/item";
import { toast } from "#/components/ui/toast.tsx";
import { queryKeys, whitelistEmailsQueryOptions } from "#/lib/query-options";
import { addWhitelistedEmail, removeWhitelistedEmail } from "#/server/functions/whitelist";

export function AdminWhitelist() {
  const queryClient = useQueryClient();

  const [formKey, setFormKey] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { data: entries, isLoading } = useQuery(whitelistEmailsQueryOptions);
  const entryToDelete = deletingId ? (entries?.find((e) => e.id === deletingId) ?? null) : null;

  const addMutation = useMutation({
    mutationFn: addWhitelistedEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.whitelistEmails });
      toast.add({
        type: "success",
        description: "Correo agregado a la lista de usuarios permitidos.",
      });
      setFormKey((k) => k + 1);
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Error al agregar el correo.";
      toast.add({ type: "error", description: message });
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeWhitelistedEmail,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.whitelistEmails });
      toast.add({
        type: "success",
        description: "Correo eliminado de la lista de usuarios permitidos.",
      });
      setDeletingId(null);
    },
    onError: () => toast.add({ type: "error", description: "Error al eliminar el correo." }),
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Usuarios Permitidos</h1>
          <p className="mt-1 text-muted-foreground">
            Solo los correos en esta lista pueden iniciar sesión en la aplicación.
          </p>
        </div>
      </div>

      {/* Add form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Agregar correo autorizado</CardTitle>
        </CardHeader>
        <CardContent>
          <Form
            key={formKey}
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const email = formData.get("email") as string;
              if (email) addMutation.mutate({ data: { email } });
            }}
            className="flex gap-3"
          >
            <Field.Root name="email" render={<StyledField.Field />}>
              <Field.Control
                name="email"
                type="email"
                placeholder="correo@ejemplo.com"
                required
                render={<Input />}
              />
            </Field.Root>
            <Button type="submit" disabled={addMutation.isPending}>
              {addMutation.isPending ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <PlusIcon className="mr-2 size-4" />
              )}
              Agregar
            </Button>
          </Form>
        </CardContent>
      </Card>

      {/* Email list */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
        </div>
      ) : entries?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
          <MailIcon className="mb-4 size-12 text-muted-foreground/20" />
          <h3 className="font-medium text-lg">No hay usuarios permitidos</h3>
          <p className="max-w-xs text-muted-foreground">
            Agrega correos electrónicos para permitir el acceso a la aplicación.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {entries?.map((entry) => (
            <Item key={entry.id} variant="outline" className="bg-card">
              <ItemMedia variant="icon">
                <MailIcon />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="font-heading text-sm">{entry.email}</ItemTitle>
              </ItemContent>
              <ItemActions>
                <Button variant="destructive" size="icon" onClick={() => setDeletingId(entry.id)}>
                  <Trash2Icon />
                </Button>
              </ItemActions>
            </Item>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar usuario permitido</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro? <span className="font-medium">{entryToDelete?.email}</span> ya no podrá
              iniciar sesión. Esta acción no elimina la cuenta del usuario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingId) removeMutation.mutate({ data: { id: deletingId } });
              }}
            >
              {removeMutation.isPending ? (
                <Loader2Icon className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2Icon className="mr-2 size-4" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
