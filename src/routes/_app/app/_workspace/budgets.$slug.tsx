import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2Icon, PencilIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BudgetEditSheet } from "#/components/budget-edit-sheet";
import { ClientCombobox } from "#/components/client-combobox";
import { PageHeader } from "#/components/page-header";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import * as StyledField from "#/components/ui/field";
import { budgetBySlugQueryOptions } from "#/lib/query-options";
import { createQuotation } from "#/lib/server/quotations";

export const Route = createFileRoute("/_app/app/_workspace/budgets/$slug")({
  component: QuotePage,
  loader: ({ context: { queryClient }, params: { slug } }) =>
    void queryClient.prefetchQuery(budgetBySlugQueryOptions(slug)),
  pendingComponent: () => (
    <div className="flex h-64 items-center justify-center p-6">
      <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
    </div>
  ),
});

function QuotePage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const createQuotationFn = useServerFn(createQuotation);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [clientId, setClientId] = useState("");

  const { data: budget } = useSuspenseQuery(budgetBySlugQueryOptions(slug));

  const createMutation = useMutation({
    mutationFn: createQuotationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success("Cotización creada correctamente");
      setClientId("");
    },
    onError: () => toast.error("Error al crear la cotización"),
  });

  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    if (!clientId || !budget?.id) return;
    createMutation.mutate({
      data: { budgetId: budget.id, clientId },
    });
  }

  if (!budget) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Presupuesto no encontrado.</p>
        <Button
          variant="outline"
          className="mt-4"
          nativeButton={false}
          render={<Link to="/app/budgets" />}
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
    <div className="container mx-auto flex flex-col gap-8 p-6">
      {/* Header */}
      <PageHeader title={budget.name} description="Resumen del presupuesto" back>
        <Button variant="outline" size="sm" onClick={() => setEditSheetOpen(true)}>
          <PencilIcon className="mr-1 size-3" />
          Editar
        </Button>
      </PageHeader>

      {/* Budget preview */}
      <div className="space-y-4">
        {budget.description && <p className="text-muted-foreground">{budget.description}</p>}

        {/* Materials */}
        {budget.materials.length > 0 && (
          <div>
            <h3 className="mb-2 font-medium text-muted-foreground text-sm">Materiales</h3>
            <div className="space-y-2">
              {budget.materials.map((m) => {
                const unit = m.unit;
                const price = Number(m.currentPrice);
                const qty = Number(m.quantity);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <div className="flex-1">
                      <span className="font-medium">{m.name}</span>
                      <span className="ml-2 text-muted-foreground text-xs">
                        {m.quantity} {unit} × ${price.toFixed(2)}
                      </span>
                    </div>
                    <span className="font-semibold">${(price * qty).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            {/* Materials subtotal */}
            <div className="flex items-center justify-between rounded-lg border border-earth/10 bg-earth/3 p-3 font-semibold text-sm">
              <span>Total materiales</span>
              <span>${materialCost.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Labor */}
        {budget.operations.length > 0 && (
          <div>
            <h3 className="mb-2 font-medium text-muted-foreground text-sm">Mano de obra</h3>
            <div className="space-y-2">
              {budget.operations.map((o) => {
                const hours = o.durationMinutes / 60;
                const rate = Number(budget.hourlyRate);
                return (
                  <div
                    key={o.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <div className="flex-1">
                      <span className="font-medium">{o.name}</span>
                      <span className="ml-2 text-muted-foreground text-xs">
                        {o.durationMinutes} min × ${rate.toFixed(2)}/h
                      </span>
                    </div>
                    <span className="font-semibold">${(hours * rate).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            {/* Labor subtotal */}
            <div className="flex items-center justify-between rounded-lg border border-earth/10 bg-earth/3 p-3 font-semibold text-sm">
              <span>Total mano de obra</span>
              <span>${laborCost.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="rounded-lg border-2 border-earth/20 bg-earth/5 p-4">
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
          <div className="mt-1 flex justify-between text-muted-foreground text-xs">
            <span>Tarifa horaria: ${budget.hourlyRate}/h</span>
          </div>
        </div>
      </div>

      {/* Client form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generar cotización</CardTitle>
          <CardDescription>
            Una cotización es un documento que se envía al cliente con los precios finales. A
            diferencia del presupuesto (que es una estimación interna), la cotización representa un
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
              <Button variant="outline" nativeButton={false} render={<Link to="/app/budgets" />}>
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
