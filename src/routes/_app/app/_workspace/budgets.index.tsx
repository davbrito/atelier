import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalculatorIcon, EyeIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import * as z from "zod";
import { BudgetCreateSheet } from "#/components/budget-create-sheet";
import { PageHeader } from "#/components/page-header";
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
import { Button } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { budgetsListQueryOptions } from "#/lib/query-options";
import { deleteBudget } from "#/lib/server/budgets";

const PAGE_SIZE = 20;

const budgetsSearchSchema = z.object({
  page: z.number().int().min(1).default(1).catch(1),
});

export const Route = createFileRoute("/_app/app/_workspace/budgets/")({
  component: BudgetsPage,
  validateSearch: budgetsSearchSchema,
  loaderDeps: ({ search: { page } }) => ({ page }),
  loader: ({ context: { queryClient }, deps: { page } }) =>
    void queryClient.prefetchQuery(budgetsListQueryOptions({ page, pageSize: PAGE_SIZE })),
});

function BudgetsPage() {
  const { page } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteBudget);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery(budgetsListQueryOptions({ page, pageSize: PAGE_SIZE }));
  const budgets = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function goToPage(nextPage: number) {
    navigate({ search: { page: nextPage } });
  }

  const deleteMutation = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Presupuesto eliminado");
      setDeletingId(null);
    },
    onError: () => toast.error("Error al eliminar el presupuesto"),
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Presupuestos" description="Plantillas reusables de presupuestos.">
        <Button onClick={() => setIsCreateOpen(true)}>
          <PlusIcon className="mr-2 size-4" />
          Nuevo presupuesto
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
        </div>
      ) : budgets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
          <CalculatorIcon className="mb-4 size-12 text-muted-foreground/20" />
          <h3 className="font-medium text-lg">No hay presupuestos</h3>
          <p className="max-w-xs text-muted-foreground">
            Crea plantillas reusables para tus prendas con materiales y mano de obra.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
            Crear mi primer presupuesto
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {budgets.map((budget) => (
              <Card key={budget.id} className="relative overflow-hidden pt-0">
                <div className="absolute inset-0 z-30 aspect-video bg-black/35" />
                {budget.image ? (
                  <img
                    src={budget.image}
                    alt={budget.name}
                    className="relative z-20 aspect-video w-full object-cover brightness-60 dark:brightness-40"
                  />
                ) : (
                  <div className="relative z-20 flex aspect-video w-full items-center justify-center bg-gradient-to-br from-muted to-muted/40">
                    <CalculatorIcon className="size-10 text-muted-foreground/30" />
                  </div>
                )}
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="font-medium text-sm">{budget.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        navigate({
                          to: "/app/budgets/$slug",
                          params: { slug: budget.slug },
                        })
                      }
                    >
                      <EyeIcon className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeletingId(budget.id)}
                    >
                      <Trash2Icon className="size-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-muted-foreground text-xs">
                    Mano de obra: ${budget.hourlyRate}/hora
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
        </>
      )}

      <BudgetCreateSheet open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás completamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el presupuesto y todos
              sus materiales y operaciones asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              <Button variant="outline">Cancelar</Button>
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingId && deleteMutation.mutate({ data: { id: deletingId } })}
            >
              <Button variant="destructive" disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar presupuesto"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
