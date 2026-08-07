import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  CalculatorIcon,
  ClipboardListIcon,
  PackageIcon,
  PlusIcon,
  ScissorsIcon,
  UsersIcon,
} from "lucide-react";
import { PageHeader } from "#/components/page-header";
import { buttonVariants } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { dashboardStatsQueryOptions } from "#/lib/query-options";

export const Route = createFileRoute("/_app/app/_workspace/")({
  component: DashboardPage,
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(dashboardStatsQueryOptions);
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

const statsCards = [
  {
    key: "budgets" as const,
    label: "Presupuestos",
    icon: CalculatorIcon,
    to: "/app/budgets",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  {
    key: "clients" as const,
    label: "Clientes",
    icon: UsersIcon,
    to: "/app/clients",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  {
    key: "materials" as const,
    label: "Materiales",
    icon: PackageIcon,
    to: "/app/materials",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  {
    key: "operations" as const,
    label: "Operaciones",
    icon: ScissorsIcon,
    to: "/app/operations",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
  {
    key: "quotations" as const,
    label: "Cotizaciones",
    icon: ClipboardListIcon,
    to: "/app/quotations",
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
];

const quickActions = [
  { label: "Nuevo presupuesto", icon: PlusIcon, to: "/app/budgets" },
  { label: "Nuevo material", icon: PlusIcon, to: "/app/materials" },
  { label: "Nueva operación", icon: PlusIcon, to: "/app/operations" },
];

function DashboardPage() {
  const { data } = useSuspenseQuery(dashboardStatsQueryOptions);
  const { counts, recentQuotations } = data;

  return (
    <div className="flex flex-col gap-8 p-6">
      <PageHeader
        title="Panel"
        description="Bienvenida al sistema de gestión de modistería y costura."
      />

      {/* Stats */}
      <div className="flex flex-wrap gap-3 *:flex-1 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]">
        {statsCards.map(({ key, label, icon: Icon, to, color, bg }) => (
          <Link key={key} to={to}>
            <Card
              size="sm"
              className="flex-row items-center gap-2 rounded-xl px-2 py-1 transition-shadow hover:shadow-md"
            >
              <div className={`shrink-0 rounded-lg p-1.5 ${bg}`}>
                <Icon className={`size-4 ${color}`} />
              </div>
              <div>
                <div className="font-bold text-lg leading-none tracking-tight">{counts[key]}</div>
                <p className="whitespace-nowrap text-muted-foreground text-xs leading-tight">
                  {label}
                </p>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions + Recent Quotations */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Acciones rápidas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {quickActions.map(({ label, icon: Icon, to }) => (
              <Link
                key={to}
                to={to}
                className={buttonVariants({ variant: "outline", className: "justify-start" })}
              >
                <Icon className="mr-2 size-4" />
                {label}
              </Link>
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
            {recentQuotations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClipboardListIcon className="mb-3 size-8 text-muted-foreground/25" />
                <p className="text-muted-foreground text-sm">No hay cotizaciones aún.</p>
                <p className="mt-1 text-muted-foreground/70 text-xs">
                  Crea una cotización desde un presupuesto.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentQuotations.map((q) => (
                  <Link
                    key={q.id}
                    to="/app/quotations/$slug"
                    params={{ slug: q.slug }}
                    className="-mx-2 flex items-center justify-between rounded-md px-2 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">{q.clientTitle}</p>
                      <p className="truncate text-muted-foreground text-xs">
                        {q.budgetName ?? "Sin presupuesto"} ·{" "}
                        {new Date(q.createdAt).toLocaleDateString("es-VE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="ml-2 flex shrink-0 items-center gap-2">
                      <span className="font-medium text-sm" suppressHydrationWarning>
                        {Number(q.total).toLocaleString("es-VE", {
                          style: "currency",
                          currency: "USD",
                          currencyDisplay: "narrowSymbol",
                        })}
                      </span>
                      <ArrowRightIcon className="size-4 text-muted-foreground/50" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
