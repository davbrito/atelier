import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardListIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { Input } from "#/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "#/components/ui/sheet";
import { listBudgets } from "#/lib/server/budgets";
import {
  createQuotation,
  deleteQuotation,
  getQuotation,
  listQuotations,
} from "#/lib/server/quotations";

export const Route = createFileRoute("/_app/app/_workspace/quotations/")({
  component: QuotationsPage,
});

function QuotationsPage() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(listQuotations);
  const createFn = useServerFn(createQuotation);
  const deleteFn = useServerFn(deleteQuotation);
  const getFn = useServerFn(getQuotation);
  const listBudgetsFn = useServerFn(listBudgets);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<Awaited<ReturnType<typeof getQuotation>> | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [selectedBudgetId, setSelectedBudgetId] = useState("");

  const { data: quotations, isLoading } = useQuery({
    queryKey: ["quotations"],
    queryFn: () => listFn(),
  });

  const { data: budgets } = useQuery({
    queryKey: ["budgets"],
    queryFn: () => listBudgetsFn(),
  });

  const createMutation = useMutation({
    mutationFn: createFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success("Cotización creada correctamente");
      setIsSheetOpen(false);
    },
    onError: () => toast.error("Error al crear la cotización"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast.success("Cotización eliminada");
      setDeletingId(null);
    },
    onError: () => toast.error("Error al eliminar la cotización"),
  });

  async function viewDetails(id: string) {
    setIsDetailOpen(true);
    const detail = await getFn({ data: { id } });
    setDetailData(detail);
  }

  function openCreate() {
    setSelectedBudgetId("");
    setFormKey((k) => k + 1);
    setIsSheetOpen(true);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl">Cotizaciones</h1>
          <p className="mt-1 text-muted-foreground">Cotizaciones enviadas a clientes.</p>
        </div>
        <Button onClick={openCreate}>
          <PlusIcon className="mr-2 size-4" />
          Nueva cotización
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
        </div>
      ) : quotations?.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
          <ClipboardListIcon className="mb-4 size-12 text-muted-foreground/20" />
          <h3 className="font-medium text-lg">No hay cotizaciones</h3>
          <p className="max-w-xs text-muted-foreground">
            Genera cotizaciones a partir de tus presupuestos para enviar a tus clientes.
          </p>
          <Button variant="outline" className="mt-4" onClick={openCreate}>
            Generar mi primera cotización
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quotations?.map((q) => (
            <Card key={q.id} className="cursor-pointer" onClick={() => viewDetails(q.id)}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-medium text-sm">{q.clientTitle}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeletingId(q.id);
                  }}
                >
                  <Trash2Icon className="size-3" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground text-xs">
                  {new Date(q.createdAt).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Nueva cotización</SheetTitle>
            <SheetDescription>
              Genera una cotización congelada a partir de un presupuesto.
            </SheetDescription>
          </SheetHeader>
          <Form
            key={formKey}
            onFormSubmit={(values: { clientTitle: string }) => {
              if (!selectedBudgetId) {
                toast.error("Selecciona un presupuesto");
                return;
              }
              createMutation.mutate({
                data: {
                  budgetId: selectedBudgetId,
                  clientTitle: values.clientTitle,
                },
              });
            }}
            className="flex flex-1 flex-col gap-6 p-6"
          >
            <Field.Root name="clientTitle">
              <Field.Label className="font-medium text-sm">Cliente</Field.Label>
              <Field.Control placeholder="Ej: María García" required render={<Input />} />
            </Field.Root>

            <div className="grid gap-2">
              <span className="font-medium text-sm">Presupuesto base</span>
              <Select
                items={budgets?.map((b) => ({ value: b.id, label: b.name })) ?? []}
                value={selectedBudgetId}
                onValueChange={(val) => val && setSelectedBudgetId(val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar presupuesto" />
                </SelectTrigger>
                <SelectContent>
                  {budgets?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <SheetFooter className="mt-auto">
              <SheetClose>
                <Button variant="outline" type="button">
                  Cancelar
                </Button>
              </SheetClose>
              <Button type="submit" disabled={createMutation.isPending || !selectedBudgetId}>
                {createMutation.isPending && <Loader2Icon className="mr-2 size-4 animate-spin" />}
                Generar cotización
              </Button>
            </SheetFooter>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{detailData?.clientTitle}</SheetTitle>
            <SheetDescription>
              Cotización generada el{" "}
              {detailData &&
                new Date(detailData.createdAt).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
            {detailData?.materials.length ? (
              <div>
                <h3 className="mb-2 font-medium text-sm">Materiales</h3>
                <div className="space-y-2">
                  {detailData.materials.map((m) => (
                    <div key={m.id} className="flex justify-between rounded-lg border p-3 text-sm">
                      <span className="text-muted-foreground">
                        {m.quantity} {m.frozenUnit}
                      </span>
                      <span className="font-medium">${m.frozenPrice}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {detailData?.operations.length ? (
              <div>
                <h3 className="mb-2 font-medium text-sm">Mano de obra</h3>
                <div className="space-y-2">
                  {detailData.operations.map((o) => {
                    const hours = o.durationMinutes / 60;
                    const cost = hours * Number(o.frozenHourlyRate);
                    return (
                      <div
                        key={o.id}
                        className="flex justify-between rounded-lg border p-3 text-sm"
                      >
                        <span className="text-muted-foreground">{o.durationMinutes} min</span>
                        <span className="font-medium">${cost.toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>
                  $
                  {detailData
                    ? (
                        detailData.materials.reduce(
                          (sum, m) => sum + Number(m.frozenPrice) * Number(m.quantity),
                          0,
                        ) +
                        detailData.operations.reduce((sum, o) => {
                          const hours = o.durationMinutes / 60;
                          return sum + hours * Number(o.frozenHourlyRate);
                        }, 0)
                      ).toFixed(2)
                    : "0.00"}
                </span>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente la cotización.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() => deletingId && deleteMutation.mutate({ data: { id: deletingId } })}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar cotización"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
