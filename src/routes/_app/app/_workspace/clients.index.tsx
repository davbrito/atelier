import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2Icon, MailIcon, PencilIcon, PhoneIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ClientSheet } from "#/components/client-sheet";
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
import { clientsListQueryOptions } from "#/lib/query-options";
import { deleteClient, getClientById, type listClients } from "#/lib/server/clients";

export const Route = createFileRoute("/_app/app/_workspace/clients/")({
  component: ClientsPage,
  loader: ({ context: { queryClient } }) => void queryClient.prefetchQuery(clientsListQueryOptions),
});

type Client = Awaited<ReturnType<typeof listClients>>[number];
type ClientWithMeasurements = Awaited<ReturnType<typeof getClientById>>;

function ClientsPage() {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteClient);
  const getByIdFn = useServerFn(getClientById);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientWithMeasurements | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: clients, isLoading } = useQuery(clientsListQueryOptions);

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente eliminado");
      setDeletingId(null);
    },
    onError: () => toast.error("Error al eliminar el cliente"),
  });

  const editMutation = useMutation({
    mutationFn: getByIdFn,
    onSuccess: (client) => {
      setEditingClient(client);
      setIsSheetOpen(true);
    },
    onError: () => toast.error("Error al cargar el cliente"),
  });

  function openCreate() {
    setEditingClient(null);
    setIsSheetOpen(true);
  }

  function handleEdit(client: Client) {
    editMutation.mutate({ data: { id: client.id } });
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Clientes</h1>
          <p className="mt-1 text-muted-foreground">Gestiona tus clientes, sus medidas y notas.</p>
        </div>
        <Button onClick={openCreate}>
          <UsersIcon className="mr-2 size-4" />
          Agregar cliente
        </Button>
      </div>
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
        </div>
      ) : clients?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
          <UsersIcon className="mb-4 size-12 text-muted-foreground/20" />
          <h3 className="font-medium text-lg">No hay clientes</h3>
          <p className="max-w-xs text-muted-foreground">
            Comienza registrando a tus clientes con sus datos de contacto y medidas.
          </p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>
            Crear mi primer cliente
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients?.map((client) => (
            <Card key={client.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-medium text-sm">{client.name}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(client)}
                    disabled={editMutation.isPending}
                  >
                    <PencilIcon className="size-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeletingId(client.id)}
                  >
                    <Trash2Icon className="size-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5 text-xs">
                {client.phone && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <PhoneIcon className="size-3" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MailIcon className="size-3" />
                    <span>{client.email}</span>
                  </div>
                )}
                {!client.phone && !client.email && (
                  <span className="text-muted-foreground">Sin datos de contacto</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {/* Form Sheet */}
      <ClientSheet
        open={isSheetOpen}
        onOpenChange={(open) => {
          if (!open) setEditingClient(null);
          setIsSheetOpen(open);
        }}
        editingClient={editingClient}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el cliente y sus
              medidas de la base de datos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" />}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deletingId && deleteMutation.mutate({ data: { id: deletingId } })}
              variant="destructive"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar cliente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
