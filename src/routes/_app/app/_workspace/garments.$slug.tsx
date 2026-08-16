import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeftIcon, Loader2Icon, PencilIcon, ShirtIcon } from "lucide-react";
import { useState } from "react";
import { BudgetEditSheet } from "#/components/budget-edit-sheet";
import { ClientCombobox } from "#/components/client-combobox";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import { Dialog, DialogContent } from "#/components/ui/dialog";
import * as StyledField from "#/components/ui/field";
import { Skeleton } from "#/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { toast } from "#/components/ui/toast.tsx";
import { formatMoney } from "#/lib/format";
import { budgetBySlugQueryOptions } from "#/lib/query-options";
import { createQuotation } from "#/lib/server/quotations";

export const Route = createFileRoute("/_app/app/_workspace/garments/$slug")({
  component: QuotePage,
  loader: ({ context: { queryClient }, params: { slug } }) =>
    void queryClient.prefetchQuery(budgetBySlugQueryOptions(slug)),
  pendingComponent: () => (
    <div className="container-narrow flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-9 shrink-0 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  ),
});

function QuotePage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const createQuotationFn = useServerFn(createQuotation);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [clientId, setClientId] = useState("");
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const { data: budget } = useSuspenseQuery(budgetBySlugQueryOptions(slug));

  const createMutation = useMutation({
    mutationFn: createQuotationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.add({ type: "success", description: "Cotización creada correctamente" });
      setClientId("");
    },
    onError: () => toast.add({ type: "error", description: "Error al crear la cotización" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !budget?.id) return;
    createMutation.mutate({
      data: { budgetIds: [budget.id], clientId },
    });
  }

  if (!budget) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Prenda no encontrada.</p>
        <Button
          variant="outline"
          className="mt-4"
          nativeButton={false}
          render={<Link to="/app/garments" />}
        >
          Volver
        </Button>
      </div>
    );
  }

  const materialCost = budget.materials.reduce((sum, m) => sum + Number(m.amount), 0);
  const laborCost = budget.operations.reduce((sum, o) => sum + Number(o.amount), 0);
  const total = materialCost + laborCost;

  return (
    <div className="container-narrow flex flex-col gap-6">
      {/* Banner */}
      <div className="relative overflow-hidden rounded-xl">
        {budget.image ? (
          <button
            type="button"
            onClick={() => setIsGalleryOpen(true)}
            className="block aspect-21/9 w-full cursor-zoom-in"
          >
            <img
              src={budget.image}
              alt={budget.name}
              className="size-full object-cover transition hover:brightness-90"
              style={{
                viewTransitionName: `budget-image-${budget.id}`,
                viewTransitionClass: "budget-image budget-image-banner",
              }}
            />
          </button>
        ) : (
          <div
            className="flex aspect-21/9 w-full items-center justify-center bg-linear-to-br from-muted to-muted/40"
            style={{
              viewTransitionName: `budget-image-${budget.id}`,
              viewTransitionClass: "budget-image budget-image-banner",
            }}
          >
            <ShirtIcon className="size-10 text-muted-foreground/30" />
          </div>
        )}
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-3 left-3 shadow"
          nativeButton={false}
          render={<Link to="/app/garments" viewTransition />}
        >
          <ArrowLeftIcon className="size-4" />
        </Button>
      </div>

      {budget.image && (
        <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
          <DialogContent className="max-w-3xl bg-transparent p-0 shadow-none ring-0">
            <img
              src={budget.image}
              alt={budget.name}
              className="max-h-[85vh] w-full rounded-xl object-contain"
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className="w-fit font-heading text-2xl"
            style={{
              viewTransitionName: `budget-title-${budget.id}`,
              viewTransitionClass: "budget-title",
            }}
          >
            {budget.name}
          </h1>
          {budget.description && <p className="mt-1 text-muted-foreground">{budget.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <ShirtIcon className="size-3" />
            Prenda
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setEditSheetOpen(true)}>
            <PencilIcon className="mr-1 size-3" />
            Editar
          </Button>
        </div>
      </div>

      {/* Materials */}
      {budget.materials.length > 0 && (
        <Card className="gap-0 p-0">
          <div className="border-b px-4 py-3">
            <h3 className="font-medium text-sm">Materiales</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead className="text-right">Precio unit.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budget.materials.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.quantity} {m.unit}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatMoney(Number(m.currentPrice))}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(Number(m.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">Subtotal materiales:&nbsp;</span>
            <span className="font-medium">{formatMoney(materialCost)}</span>
          </div>
        </Card>
      )}

      {/* Labor */}
      {budget.operations.length > 0 && (
        <Card className="gap-0 p-0">
          <div className="border-b px-4 py-3">
            <h3 className="font-medium text-sm">Mano de obra</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead className="text-right">Tarifa</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budget.operations.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell className="text-muted-foreground">{o.durationMinutes} min</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatMoney(Number(budget.hourlyRate))}/h
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(Number(o.amount))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex justify-end border-t px-4 py-3 text-sm">
            <span className="text-muted-foreground">Subtotal mano de obra:&nbsp;</span>
            <span className="font-medium">{formatMoney(laborCost)}</span>
          </div>
        </Card>
      )}

      {/* Total */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between">
          <div>
            <span className="font-semibold text-base">Total</span>
            <p className="text-muted-foreground text-xs">
              Tarifa horaria: {formatMoney(Number(budget.hourlyRate))}/h
            </p>
          </div>
          <span className="font-bold text-2xl tracking-tight">{formatMoney(total)}</span>
        </CardContent>
      </Card>

      {/* Client form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generar cotización</CardTitle>
          <CardDescription>
            Una cotización es un documento que se envía al cliente con los precios finales. A
            diferencia de la prenda (que es una estimación interna), la cotización representa un
            compromiso de precio por un tiempo limitado y puede usarse como base para un contrato de
            servicio.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <StyledField.FieldGroup>
              <StyledField.Field>
                <StyledField.FieldLabel>Cliente</StyledField.FieldLabel>
                <ClientCombobox value={clientId} onChange={setClientId} />
              </StyledField.Field>
            </StyledField.FieldGroup>

            <div className="flex gap-3">
              <Button variant="outline" nativeButton={false} render={<Link to="/app/garments" />}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !clientId}>
                {createMutation.isPending && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Generar cotización
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <BudgetEditSheet
        budgetId={budget?.id ?? null}
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
      />
    </div>
  );
}
