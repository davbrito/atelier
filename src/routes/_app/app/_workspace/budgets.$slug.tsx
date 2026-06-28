import { Field } from "@base-ui/react/field";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeftIcon, Loader2Icon, PencilIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BudgetEditSheet } from "#/components/budget-edit-sheet";
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "#/components/ui/card";
import * as StyledField from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { budgetBySlugQueryOptions } from "#/lib/query-options";
import { listMaterials } from "#/lib/server/materials";
import { listOperations } from "#/lib/server/operations";
import { createQuotation } from "#/lib/server/quotations";

export const Route = createFileRoute("/_app/app/_workspace/budgets/$slug")({
  component: QuotePage,
  loader: ({ context: { queryClient }, params: { slug } }) =>
    void queryClient.prefetchQuery(budgetBySlugQueryOptions(slug)),
});

function QuotePage() {
  const { slug } = Route.useParams();
  const queryClient = useQueryClient();
  const listMaterialsFn = useServerFn(listMaterials);
  const listOperationsFn = useServerFn(listOperations);
  const createQuotationFn = useServerFn(createQuotation);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [clientTitle, setClientTitle] = useState("");

  const { data: budget, isLoading } = useQuery(budgetBySlugQueryOptions(slug));

  const { data: catalogMaterials = [] } = useQuery({
    queryKey: ["materials"],
    queryFn: () => listMaterialsFn(),
    staleTime: 30_000,
  });

  const { data: catalogOperations = [] } = useQuery({
    queryKey: ["operations"],
    queryFn: () => listOperationsFn(),
    staleTime: 30_000,
  });

  const getOperationName = (id: string) =>
    catalogOperations.find((o: { id: string; name: string }) => o.id === id)?.name ?? id;

  const createMutation = useMutation({
    mutationFn: createQuotationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success("Cotización creada correctamente");
      setClientTitle("");
    },
    onError: () => toast.error("Error al crear la cotización"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientTitle.trim() || !budget?.id) return;
    createMutation.mutate({
      data: { budgetId: budget.id, clientTitle: clientTitle.trim() },
    });
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center p-6">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
      </div>
    );
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

  const materialCost = budget.materials.reduce((sum, m) => {
    const mat = catalogMaterials.find((cm) => cm.id === m.materialId);
    return sum + Number(mat?.currentPrice ?? 0) * Number(m.quantity);
  }, 0);

  const laborCost = budget.operations.reduce((sum, o) => {
    const hours = o.durationMinutes / 60;
    return sum + hours * Number(budget.hourlyRate);
  }, 0);

  const total = materialCost + laborCost;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            nativeButton={false}
            render={<Link to="/app/budgets" />}
          >
            <ArrowLeftIcon className="size-4" />
          </Button>
          <div>
            <h1 className="font-heading text-2xl">{budget.name}</h1>
            <p className="mt-1 text-muted-foreground">
              {budget.description ?? "Cotización desde presupuesto"}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditSheetOpen(true)}>
          <PencilIcon className="mr-1 size-3" />
          Editar
        </Button>
      </div>

      {/* Budget preview */}
      <div className="space-y-4">
        <h2 className="font-semibold text-lg">Resumen del presupuesto</h2>

        {/* Materials */}
        {budget.materials.length > 0 && (
          <div>
            <h3 className="mb-2 font-medium text-muted-foreground text-sm">Materiales</h3>
            <div className="space-y-2">
              {budget.materials.map((m) => {
                const mat = catalogMaterials.find((cm) => cm.id === m.materialId);
                const unit = mat?.unit ?? "";
                const price = Number(mat?.currentPrice ?? 0);
                const qty = Number(m.quantity);
                return (
                  <div
                    key={m.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <div className="flex-1">
                      <span className="font-medium">{mat?.name ?? "—"}</span>
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
                      <span className="font-medium">{getOperationName(o.operationId)}</span>
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
              <Field.Root name="clientTitle" render={<StyledField.Field />}>
                <Field.Label render={<StyledField.FieldLabel />}>Nombre del cliente</Field.Label>
                <Field.Control
                  value={clientTitle}
                  onChange={(e) => setClientTitle((e.target as HTMLInputElement).value)}
                  placeholder="Ej: María García"
                  required
                  render={<Input />}
                />
                <Field.Error render={<StyledField.FieldError />} />
              </Field.Root>
            </StyledField.FieldGroup>

            <div className="flex gap-3">
              <Button variant="outline" nativeButton={false} render={<Link to="/app/budgets" />}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || !clientTitle.trim()}>
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
