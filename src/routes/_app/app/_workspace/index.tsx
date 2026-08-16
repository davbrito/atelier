import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightIcon, ClipboardListIcon, PlusIcon } from "lucide-react";
import { Suspense } from "react";
import { SystemStats, SystemStatsLoader } from "#/components/dasboard/system-counts.tsx";
import { PageHeader } from "#/components/page-header";
import { Button, buttonVariants } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "#/components/ui/item.tsx";
import { dashboardCountsQueryOptions, recentQuotationsQueryOptions } from "#/lib/query-options";
import { formatBudgetNames } from "#/lib/utils";

export const Route = createFileRoute("/_app/app/_workspace/")({
  component: DashboardPage,
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(recentQuotationsQueryOptions);
    queryClient.prefetchQuery(dashboardCountsQueryOptions);
  },
  pendingComponent: () => (
    <div className="flex flex-col gap-8 p-6">
      <div className="space-y-2">
        <div className="h-7 w-32 animate-pulse rounded bg-muted" />
        <div className="h-4 w-72 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-16 animate-pulse rounded-lg bg-muted" />
    </div>
  ),
});

const quickActions = [
  { label: "Nuevo presupuesto", icon: PlusIcon, to: "/app/budgets" },
  { label: "Nuevo material", icon: PlusIcon, to: "/app/materials" },
  { label: "Nueva operación", icon: PlusIcon, to: "/app/operations" },
];

function DashboardPage() {
  const { data } = useSuspenseQuery(recentQuotationsQueryOptions);

  return (
    <div className="flex flex-col gap-8 p-6">
      <PageHeader
        title="Panel"
        description="Bienvenida al sistema de gestión de modistería y costura."
      />

      {/* Stats */}
      <Suspense fallback={<SystemStatsLoader />}>
        <SystemStats />
      </Suspense>

      {/* Quick Actions + Recent Quotations */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Acciones rápidas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {quickActions.map(({ label, icon: Icon, to }) => (
              <Button
                key={to}
                variant="outline"
                className="justify-start"
                render={<Link to={to} />}
                nativeButton={false}
              >
                <Icon className="mr-2 size-4" />
                {label}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Recent Quotations */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Cotizaciones recientes</CardTitle>
            <Link to="/app/quotations" className={buttonVariants({ variant: "ghost", size: "sm" })}>
              Ver todas
              <ArrowRightIcon className="ml-1 size-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClipboardListIcon className="mb-3 size-8 text-muted-foreground/25" />
                <p className="text-muted-foreground text-sm">No hay cotizaciones aún.</p>
                <p className="mt-1 text-muted-foreground/70 text-xs">
                  Crea una cotización desde un presupuesto.
                </p>
              </div>
            ) : (
              <ItemGroup>
                {data.map((q) => (
                  <Item
                    key={q.id}
                    render={<Link to="/app/quotations/$slug" params={{ slug: q.slug }} />}
                    size="xs"
                  >
                    <ItemContent className="gap-0">
                      <ItemTitle className="truncate text-sm">{q.clientTitle}</ItemTitle>
                      <ItemDescription className="truncate" suppressHydrationWarning>
                        {formatBudgetNames(q.budgetNames)}
                        {" · "}
                        {new Date(q.createdAt).toLocaleDateString("es-VE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <span className="font-medium text-sm" suppressHydrationWarning>
                        {Number(q.total).toLocaleString("es-VE", {
                          style: "currency",
                          currency: "USD",
                          currencyDisplay: "narrowSymbol",
                        })}
                      </span>
                      <ArrowRightIcon className="size-4 text-muted-foreground/50" />
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
