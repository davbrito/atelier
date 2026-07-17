import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { EyeIcon, Loader2Icon, MailIcon, PhoneIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import * as z from "zod";
import { ClientSheet } from "#/components/client-sheet";
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
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
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
import { clientsListQueryOptions } from "#/lib/query-options";
import { deleteClient } from "#/lib/server/clients";

const PAGE_SIZE = 20;

const clientsSearchSchema = z.object({
  page: z.number().int().min(1).default(1).catch(1),
});

export const Route = createFileRoute("/_app/app/_workspace/clients/")({
  component: ClientsPage,
  validateSearch: clientsSearchSchema,
  loaderDeps: ({ search: { page } }) => ({ page }),
  loader: ({ context: { queryClient }, deps: { page } }) =>
    void queryClient.prefetchQuery(clientsListQueryOptions({ page, pageSize: PAGE_SIZE })),
});

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? [parts[0], parts.at(-1)] : [parts[0]];
  return initials.map((p) => p?.[0]?.toUpperCase()).join("");
}

function ClientsPage() {
  const { page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteClient);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery(clientsListQueryOptions({ page, pageSize: PAGE_SIZE }));
  const clients = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Cliente eliminado");
      setDeletingId(null);
    },
    onError: () => toast.error("Error al eliminar el cliente"),
  });

  function openCreate() {
    setIsSheetOpen(true);
  }

  function viewClient(id: string) {
    navigate({ to: "/app/clients/$id", params: { id } });
  }

  function goToPage(nextPage: number) {
    navigate({ search: { page: nextPage } });
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
      ) : clients.length === 0 ? (
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
        <>
          <Card className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer"
                    onClick={() => viewClient(client.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Avatar size="sm">
                          <AvatarFallback className="font-medium text-xs">
                            {getInitials(client.name)}
                          </AvatarFallback>
                        </Avatar>
                        <Link
                          to="/app/clients/$id"
                          params={{ id: client.id }}
                          className="hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {client.name}
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell>
                      {client.phone ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <PhoneIcon className="size-3" />
                          {client.phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.email ? (
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <MailIcon className="size-3" />
                          {client.email}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            viewClient(client.id);
                          }}
                        >
                          <EyeIcon className="size-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(client.id);
                          }}
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
          <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
        </>
      )}
      {/* Form Sheet */}
      <ClientSheet open={isSheetOpen} onOpenChange={setIsSheetOpen} editingClient={null} />

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
