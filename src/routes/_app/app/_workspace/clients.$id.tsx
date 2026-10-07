import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeftIcon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
  RulerIcon,
  StickyNoteIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { useState } from "react";
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
import { Avatar, AvatarFallback } from "#/components/ui/avatar";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { toast } from "#/components/ui/toast.tsx";
import { getDartDepths, getPatternFraction, groupMeasurements } from "#/lib/measurement-derived";
import { clientByIdQueryOptions } from "#/lib/query-options";
import { deleteClient } from "#/server/functions/clients";

export const Route = createFileRoute("/_app/app/_workspace/clients/$id")({
  component: ClientDetailPage,
  loader: ({ context: { queryClient }, params: { id } }) =>
    void queryClient.prefetchQuery(clientByIdQueryOptions(id)),
  pendingComponent: () => (
    <div className="container-narrow flex flex-col gap-8">
      <div className="h-24 animate-pulse rounded-lg bg-muted" />
      <div className="h-40 animate-pulse rounded-lg bg-muted" />
    </div>
  ),
});

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1 ? [parts[0], parts.at(-1)] : [parts[0]];
  return initials.map((p) => p?.[0]?.toUpperCase()).join("");
}

function ClientDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteClient);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: client } = useSuspenseQuery(clientByIdQueryOptions(id));
  const dartDepths = getDartDepths(client?.measurements ?? []);
  const measurementSections = groupMeasurements(client?.measurements ?? []);

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.add({ type: "success", description: "Cliente eliminado" });
      navigate({ to: "/app/clients" });
    },
    onError: () => toast.add({ type: "error", description: "Error al eliminar el cliente" }),
  });

  if (!client) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Cliente no encontrado.</p>
        <Button
          variant="outline"
          className="mt-4"
          nativeButton={false}
          render={<Link to="/app/clients" />}
        >
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto flex flex-col gap-8 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={<Link to="/app/clients" />}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <Avatar size="lg">
            <AvatarFallback className="font-semibold text-base">
              {getInitials(client.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-heading text-2xl">{client.name}</h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Cliente desde{" "}
              <span suppressHydrationWarning>
                {new Intl.DateTimeFormat("es-VE", { dateStyle: "long" }).format(
                  new Date(client.createdAt),
                )}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button variant="outline" size="sm" onClick={() => setIsSheetOpen(true)}>
            <PencilIcon className="mr-1 size-3" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2Icon className="size-3" />
          </Button>
        </div>
      </div>

      {/* Contact info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserIcon className="size-4 text-muted-foreground" />
            Datos de contacto
          </CardTitle>
        </CardHeader>
        <CardContent>
          {client.phone || client.email ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {client.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <PhoneIcon className="size-4 text-muted-foreground" />
                  <span>{client.phone}</span>
                </div>
              )}
              {client.email && (
                <div className="flex items-center gap-2 text-sm">
                  <MailIcon className="size-4 text-muted-foreground" />
                  <span>{client.email}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Sin datos de contacto registrados.</p>
          )}
        </CardContent>
      </Card>

      {/* Measurements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <RulerIcon className="size-4 text-muted-foreground" />
              Medidas
            </span>
            {client.measurements.length > 0 && (
              <span className="font-normal text-muted-foreground text-xs tabular-nums">
                {client.measurements.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {client.measurements.length > 0 ? (
            <div className="flex flex-col gap-6">
              {measurementSections.map((section) => (
                <section key={section.title} className="flex flex-col gap-2.5">
                  <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3">
                    {section.items.map((m) => {
                      const fraction = getPatternFraction(m.name, m.value);
                      const dart = dartDepths.get(m.id);
                      return (
                        <div
                          key={m.id}
                          className="flex flex-col gap-1 rounded-lg border bg-muted/40 p-3 transition-colors hover:bg-muted/70"
                        >
                          <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            {m.name}
                          </p>
                          <p className="font-semibold text-lg tabular-nums leading-tight">
                            {m.value}
                            <span className="ml-1 font-normal text-muted-foreground text-xs">
                              cm
                            </span>
                          </p>
                          {(fraction || dart) && (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {fraction && (
                                <span className="rounded-full bg-background px-2 py-0.5 text-muted-foreground text-xs tabular-nums ring-1 ring-border">
                                  {fraction.label}: {fraction.text} cm
                                </span>
                              )}
                              {dart && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-muted-foreground text-xs tabular-nums ring-1 ring-border">
                                  <RulerIcon className="size-3" />
                                  Pinza: {dart} cm
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Aún no hay medidas registradas.</p>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <StickyNoteIcon className="size-4 text-muted-foreground" />
            Notas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {client.notes ? (
            <p className="whitespace-pre-wrap text-sm">{client.notes}</p>
          ) : (
            <p className="text-muted-foreground text-sm">Sin notas.</p>
          )}
        </CardContent>
      </Card>

      <ClientSheet open={isSheetOpen} onOpenChange={setIsSheetOpen} editingClient={client} />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
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
              onClick={() => deleteMutation.mutate({ data: { id } })}
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
