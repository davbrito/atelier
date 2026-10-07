import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeftIcon,
  ImageDownIcon,
  MailIcon,
  PencilIcon,
  PencilRulerIcon,
  PhoneIcon,
  PrinterIcon,
  RulerIcon,
  Share2Icon,
  StickyNoteIcon,
  Trash2Icon,
  UserIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useIsHydrated } from "#/components/auth/use-is-hydrated";
import { BodyBlueprint } from "#/components/body-blueprint";
import { ClientPrintSheet } from "#/components/client-print-sheet";
import { ClientSheet } from "#/components/client-sheet";
import { MeasurementCard } from "#/components/measurement-card";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "#/components/ui/dialog";
import { Spinner } from "#/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { toast } from "#/components/ui/toast.tsx";
import { useMediaQuery } from "#/hooks/use-media-query";
import { type BlueprintView, findBlueprintAnnotation } from "#/lib/constants/blueprint";
import { normalizeMeasurementName } from "#/lib/constants/measurements";
import {
  getDartDepths,
  getDartDifference,
  groupMeasurements,
  withStandardSlots,
} from "#/lib/measurement-derived";
import { clientByIdQueryOptions } from "#/lib/query-options";
import { canShareImages, shareOrDownloadPrintSheet } from "#/lib/sheet-image";
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

/** "María Guerra" → "maria-guerra" */
function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

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
  const [isBlueprintDialogOpen, setIsBlueprintDialogOpen] = useState(false);
  const [blueprintView, setBlueprintView] = useState<BlueprintView>("front");
  const [activeName, setActiveName] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const { data: client } = useSuspenseQuery(clientByIdQueryOptions(id));
  const dartDepths = getDartDepths(client?.measurements ?? []);
  const dartText = getDartDifference(client?.measurements ?? [])?.text ?? null;
  const measurementSections = groupMeasurements(withStandardSlots(client?.measurements ?? []));
  const activeKey = activeName ? normalizeMeasurementName(activeName) : null;

  const flashTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(flashTimeout.current), []);

  /** Resalta una medida en el croquis y cambia a la vista (frente/espalda) donde está su cota. */
  const highlightMeasurement = (name: string | null) => {
    setActiveName(name);
    const view = name ? findBlueprintAnnotation(name)?.view : undefined;
    if (view) setBlueprintView(view);
  };

  /** Clic en una cota: lleva a la tarjeta de la medida, la destaca y deja su valor listo para editar. */
  const focusMeasurementCard = (measurementId: string) => {
    const reveal = () => {
      const card = document.getElementById(`measurement-${measurementId}`);
      card?.scrollIntoView({ behavior: "smooth", block: "center" });
      card?.querySelector("input")?.focus({ preventScroll: true });
      setFlashId(measurementId);
      clearTimeout(flashTimeout.current);
      flashTimeout.current = setTimeout(() => setFlashId(null), 1500);
    };
    if (isDesktop) {
      reveal();
    } else {
      // En móvil el croquis está en un diálogo: se cierra y se espera a que devuelva el foco.
      setIsBlueprintDialogOpen(false);
      setTimeout(reveal, 250);
    }
  };

  const isHydrated = useIsHydrated();
  const canShare = isHydrated && canShareImages();
  const imageMutation = useMutation({
    mutationFn: (name: string) =>
      shareOrDownloadPrintSheet({
        fileName: `ficha-${slugify(name)}.png`,
        title: `Ficha de taller · ${name}`,
      }),
    onError: () => toast.add({ type: "error", description: "No se pudo generar la imagen" }),
  });

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
        <div className="flex flex-wrap gap-1">
          {client.measurements.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              title="Imprimir o guardar como PDF"
              onClick={() => window.print()}
            >
              <PrinterIcon className="mr-1 size-3" />
              Imprimir ficha
            </Button>
          )}
          {client.measurements.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={imageMutation.isPending}
              title={canShare ? "Compartir la ficha como imagen" : "Descargar la ficha como imagen"}
              onClick={() => imageMutation.mutate(client.name)}
            >
              {imageMutation.isPending ? (
                <Spinner className="mr-1 size-3" />
              ) : canShare ? (
                <Share2Icon className="mr-1 size-3" />
              ) : (
                <ImageDownIcon className="mr-1 size-3" />
              )}
              {canShare ? "Compartir imagen" : "Guardar imagen"}
            </Button>
          )}
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
              {client.measurements.length > 0 && (
                <span className="font-normal text-muted-foreground text-xs tabular-nums">
                  {client.measurements.length}
                </span>
              )}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsBlueprintDialogOpen(true)}
            >
              <PencilRulerIcon className="mr-1 size-3" />
              Ver croquis
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
          <div className="flex flex-col gap-6">
            {measurementSections.map((section) => (
              <section key={section.title} className="flex flex-col gap-2.5">
                <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  {section.title}
                </h3>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(10.5rem,1fr))] gap-3">
                  {section.items.map((m) => (
                    <MeasurementCard
                      key={m.id ?? m.name}
                      clientId={client.id}
                      measurement={m}
                      dart={m.id ? dartDepths.get(m.id) : undefined}
                      isActive={normalizeMeasurementName(m.name) === activeKey}
                      isFlashing={m.id !== null && flashId === m.id}
                      onHighlight={highlightMeasurement}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
          <aside className="sticky top-6 hidden flex-col gap-3 rounded-lg border p-3 lg:flex">
            <BlueprintPanel
              measurements={client.measurements}
              view={blueprintView}
              onViewChange={setBlueprintView}
              activeName={activeName}
              onHover={setActiveName}
              onSelect={focusMeasurementCard}
              dartText={dartText}
            />
          </aside>
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

      <Dialog open={isBlueprintDialogOpen && !isDesktop} onOpenChange={setIsBlueprintDialogOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Croquis de medidas</DialogTitle>
          </DialogHeader>
          <BlueprintPanel
            measurements={client.measurements}
            view={blueprintView}
            onViewChange={setBlueprintView}
            activeName={activeName}
            onHover={setActiveName}
            onSelect={focusMeasurementCard}
            dartText={dartText}
          />
        </DialogContent>
      </Dialog>

      <ClientPrintSheet client={client} />

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

function BlueprintPanel({
  view,
  onViewChange,
  ...props
}: Omit<React.ComponentProps<typeof BodyBlueprint>, "variant" | "className"> & {
  onViewChange: (view: BlueprintView) => void;
}) {
  return (
    <>
      <Tabs value={view} onValueChange={(value) => onViewChange(value as BlueprintView)}>
        <TabsList className="w-full">
          <TabsTrigger value="front">Frente</TabsTrigger>
          <TabsTrigger value="back">Espalda</TabsTrigger>
        </TabsList>
      </Tabs>
      <BodyBlueprint view={view} {...props} className="mx-auto max-h-[70vh]" />
    </>
  );
}
