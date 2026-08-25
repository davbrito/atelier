import { useDebouncedValue } from "@tanstack/react-pacer";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EyeIcon, Loader2Icon, PlusIcon, SearchIcon, ShirtIcon, Trash2Icon } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useOnInView } from "react-intersection-observer";
import { BudgetCreateSheet } from "#/components/budget-create-sheet";
import { PageHeader } from "#/components/page-header";
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
import { Input } from "#/components/ui/input";
import { toast } from "#/components/ui/toast.tsx";
import { budgetsInfiniteListQueryOptions } from "#/lib/query-options";
import { deleteBudget } from "#/server/functions/budgets";

const MotionCardTitle = motion.create(CardTitle);

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_app/app/_workspace/garments/")({
  component: BudgetsPage,
  loader: ({ context: { queryClient } }) =>
    void queryClient.prefetchInfiniteQuery(
      budgetsInfiniteListQueryOptions({ pageSize: PAGE_SIZE }),
    ),
});

function BudgetsPage() {
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebouncedValue(search, { wait: 300 });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery(
    budgetsInfiniteListQueryOptions({
      pageSize: PAGE_SIZE,
      search: debouncedSearch.trim() || undefined,
    }),
  );
  const budgets = data?.pages.flatMap((p) => p.items) ?? [];

  const loadMoreRef = useOnInView(
    (inView) => {
      if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
    },
    { skip: !hasNextPage },
  );

  const deleteMutation = useMutation({
    mutationFn: deleteBudget,
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

      <div className="relative max-w-sm">
        <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar prendas..."
          className="pl-8"
        />
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
        </div>
      ) : budgets.length === 0 ? (
        <Card className="flex flex-col items-center justify-center border-dashed p-12 text-center">
          <ShirtIcon className="mb-4 size-12 text-muted-foreground/20" />
          {debouncedSearch.trim() ? (
            <>
              <h3 className="font-medium text-lg">Sin resultados</h3>
              <p className="max-w-xs text-muted-foreground">
                No se encontraron prendas para "{debouncedSearch.trim()}".
              </p>
            </>
          ) : (
            <>
              <h3 className="font-medium text-lg">No hay prendas</h3>
              <p className="max-w-xs text-muted-foreground">
                Crea plantillas reusables para tus prendas con materiales y mano de obra.
              </p>
              <Button variant="outline" className="mt-4" onClick={() => setIsCreateOpen(true)}>
                Crear mi primera prenda
              </Button>
            </>
          )}
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]">
            {budgets.map((budget) => (
              <Card key={budget.id} className="group overflow-visible pt-0">
                <Link
                  to="/app/garments/$slug"
                  params={{ slug: budget.slug }}
                  aria-label={budget.name}
                  className="block aspect-video h-min w-full bg-linear-to-br from-muted to-muted/40 transition-colors duration-200"
                >
                  {budget.image ? (
                    <motion.img
                      layoutId={`budget-image-${budget.id}`}
                      transition={{ ease: "easeInOut", duration: 0.2 }}
                      src={budget.image}
                      alt={budget.name}
                      className="size-full object-cover brightness-60 transition-all duration-200 group-hover:brightness-100 dark:brightness-70 dark:group-hover:brightness-90"
                    />
                  ) : (
                    <motion.div
                      className="flex size-full items-center justify-center"
                      layoutId={`budget-image-${budget.id}`}
                      transition={{ ease: "easeInOut", duration: 0.2 }}
                    >
                      <ShirtIcon className="size-10 text-muted-foreground/30" />
                    </motion.div>
                  )}
                </Link>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <MotionCardTitle
                    layoutId={`budget-title-${budget.id}`}
                    className="w-fit truncate font-medium text-sm"
                  >
                    {budget.name}
                  </MotionCardTitle>
                  <CardAction>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        navigate({
                          to: "/app/garments/$slug",
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
          {hasNextPage && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              <Loader2Icon className="size-5 animate-spin text-muted-foreground/50" />
            </div>
          )}
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
