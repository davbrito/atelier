import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  ClipboardListIcon,
  ExternalLinkIcon,
  Loader2Icon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import * as z from "zod";
import { PageHeader } from "#/components/page-header";
import { Pagination } from "#/components/pagination";
import { QuotationCreateSheet } from "#/components/quotation-create-sheet";
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
import { Card } from "#/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "#/components/ui/sheet";
import { Skeleton } from "#/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { useIsMobile } from "#/hooks/use-mobile";
import { quotationsListQueryOptions } from "#/lib/query-options";
import { deleteQuotation, getQuotation } from "#/lib/server/quotations";
import { cn } from "#/lib/utils";

const PAGE_SIZE = 20;

const quotationsSearchSchema = z.object({
  page: z.number().int().min(1).default(1).catch(1),
});

export const Route = createFileRoute("/_app/app/_workspace/quotations/")({
  component: QuotationsPage,
  validateSearch: quotationsSearchSchema,
  loaderDeps: ({ search: { page } }) => ({ page }),
  loader: ({ context: { queryClient }, deps: { page } }) =>
    void queryClient.prefetchQuery(quotationsListQueryOptions({ page, pageSize: PAGE_SIZE })),
});

function QuotationsPage() {
  const { page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteQuotation);
  const getFn = useServerFn(getQuotation);
  const isMobile = useIsMobile();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<Awaited<ReturnType<typeof getQuotation>> | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery(quotationsListQueryOptions({ page, pageSize: PAGE_SIZE }));
  const quotations = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
    setDetailData(null);
    setIsDetailOpen(true);
    const detail = await getFn({ data: { id } });
    setDetailData(detail);
  }

  function goToPage(nextPage: number) {
    navigate({ search: { page: nextPage } });
  }

  return (
    <div className="flex min-w-0 flex-col gap-6 overflow-auto p-6">
      <PageHeader title="Cotizaciones" description="Cotizaciones enviadas a clientes.">
        <Button onClick={() => setIsCreateOpen(true)}>
          <PlusIcon className="mr-2 size-4" />
          Nueva cotización
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
        </div>
      ) : quotations.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
          <ClipboardListIcon className="mb-4 size-12 text-muted-foreground/20" />
          <h3 className="font-medium text-lg">No hay cotizaciones</h3>
          <p className="max-w-xs text-muted-foreground">
            Genera cotizaciones a partir de tus presupuestos para enviar a tus clientes.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
            Generar mi primera cotización
          </Button>
        </Card>
      ) : (
        <>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Presupuesto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotations.map((q) => (
                  <TableRow key={q.id} className="cursor-pointer" onClick={() => viewDetails(q.id)}>
                    <TableCell className="font-medium">{q.clientTitle}</TableCell>
                    <TableCell>
                      {q.budgetSlug ? (
                        <Link
                          to="/app/budgets/$slug"
                          params={{ slug: q.budgetSlug }}
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 rounded bg-muted/50 px-1 text-xs hover:bg-muted/70 hover:underline"
                        >
                          <ExternalLinkIcon className="size-3" />
                          {q.budgetName}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground" suppressHydrationWarning>
                      {new Date(q.createdAt).toLocaleDateString("es-VE", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right font-medium" suppressHydrationWarning>
                      $
                      {Number(q.total).toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
        </>
      )}

      <QuotationCreateSheet open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {/* Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={cn("w-full sm:max-w-lg", isMobile && "max-h-[85dvh]")}
        >
          <SheetHeader>
            {detailData ? (
              <>
                <SheetTitle>{detailData.clientTitle}</SheetTitle>
                <SheetDescription>
                  Cotización generada el{" "}
                  {new Date(detailData.createdAt).toLocaleDateString("es-VE", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </SheetDescription>
              </>
            ) : (
              <>
                <SheetTitle className="sr-only">Cargando cotización</SheetTitle>
                <SheetDescription className="sr-only">Cargando cotización</SheetDescription>
                <Skeleton className="h-4 w-48" />
              </>
            )}
          </SheetHeader>

          {!detailData ? (
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
              <div>
                <Skeleton className="mb-2 h-4 w-24" />
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
              <div>
                <Skeleton className="mb-2 h-4 w-24" />
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
              {detailData?.materials.length ? (
                <div>
                  <h3 className="mb-2 font-medium text-sm">Materiales</h3>
                  <div className="space-y-2">
                    {detailData.materials.map((m) => (
                      <div
                        key={m.id}
                        className="flex justify-between rounded-lg border p-3 text-sm"
                      >
                        <div className="flex-1">
                          <span className="font-medium">{m.frozenName}</span>
                          <span className="ml-2 text-muted-foreground text-xs">
                            {m.quantity} {m.frozenUnit} × ${Number(m.frozenPrice).toFixed(2)}
                          </span>
                        </div>
                        <span className="font-medium">
                          ${(Number(m.frozenPrice) * Number(m.quantity)).toFixed(2)}
                        </span>
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
                          <div className="flex-1">
                            <span className="font-medium">{o.frozenName}</span>
                            <span className="ml-2 text-muted-foreground text-xs">
                              {o.durationMinutes} min × ${Number(o.frozenHourlyRate).toFixed(2)}/h
                            </span>
                          </div>
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
          )}
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
