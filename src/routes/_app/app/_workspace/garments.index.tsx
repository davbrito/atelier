import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { EyeIcon, Loader2Icon, PlusIcon, ShirtIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
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
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { toast } from "#/components/ui/toast.tsx";
import { budgetsListQueryOptions } from "#/lib/query-options";
import { deleteBudget } from "#/lib/server/budgets";

const PAGE_SIZE = 20;

const budgetsSearchSchema = z.object({
  page: z.number().int().min(1).default(1).catch(1),
});

export const Route = createFileRoute("/_app/app/_workspace/garments/")({
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
      toast.add({ type: "success", description: "Prenda eliminada" });
      setDeletingId(null);
    },
    onError: () => toast.add({ type: "error", description: "Error al eliminar la prenda" }),
  });

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Prendas" description="Plantillas reusables de prendas.">
        <Button onClick={() => setIsCreateOpen(true)}>
          <PlusIcon className="mr-2 size-4" />
          Nueva prenda
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
        </div>
      ) : budgets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
          <ShirtIcon className="mb-4 size-12 text-muted-foreground/20" />
          <h3 className="font-medium text-lg">No hay prendas</h3>
          <p className="max-w-xs text-muted-foreground">
            Crea plantillas reusables para tus prendas con materiales y mano de obra.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
            Crear mi primera prenda
          </Button>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]">
            {budgets.map((budget) => (
              <Card key={budget.id} className="group relative overflow-hidden pt-0">
                <Link
                  to="/app/garments/$slug"
                  params={{ slug: budget.slug }}
                  viewTransition
                  aria-label={budget.name}
                  className="block aspect-video h-min w-full bg-black/35 transition-colors duration-200 group-hover:bg-black/0"
                >
                  {budget.image ? (
                    <img
                      src={budget.image}
                      alt={budget.name}
                      className="size-full object-cover brightness-60 transition-all duration-200 group-hover:brightness-100 dark:brightness-70 dark:group-hover:brightness-90"
                      style={{
                        viewTransitionName: `budget-image-${budget.id}`,
                        viewTransitionClass: "budget-image budget-image-thumb",
                      }}
                    />
                  ) : (
                    <div
                      className="flex size-full items-center justify-center bg-linear-to-br from-muted to-muted/40"
                      style={{
                        viewTransitionName: `budget-image-${budget.id}`,
                        viewTransitionClass: "budget-image budget-image-thumb",
                      }}
                    >
                      <ShirtIcon className="size-10 text-muted-foreground/30" />
                    </div>
                  )}
                </Link>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle
                    className="w-fit truncate font-medium text-sm"
                    style={{
                      viewTransitionName: `budget-title-${budget.id}`,
                      viewTransitionClass: "budget-title",
                    }}
                  >
                    {budget.name}
                  </CardTitle>
                  <CardAction>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        navigate({
                          to: "/app/garments/$slug",
                          params: { slug: budget.slug },
                          viewTransition: true,
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
                  </CardAction>
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
              Esta acción no se puede deshacer. Se eliminará permanentemente la prenda y todos sus
              materiales y operaciones asociados.
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
                {deleteMutation.isPending ? "Eliminando..." : "Eliminar prenda"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
