import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRightIcon,
  CalculatorIcon,
  ClipboardListIcon,
  Loader2Icon,
  PackageIcon,
  PlusIcon,
  ScissorsIcon,
} from "lucide-react";
import { buttonVariants } from "#/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "#/components/ui/card";
import { dashboardStatsQueryOptions } from "#/lib/query-options";

export const Route = createFileRoute("/_app/app/_workspace/")({
  component: DashboardPage,
  loader: async ({ context: { queryClient } }) => {
    await queryClient.prefetchQuery(dashboardStatsQueryOptions);
  },
});

const statsCards = [
  {
    key: "budgets" as const,
    label: "Presupuestos",
    description: "Plantillas reusables",
    icon: CalculatorIcon,
    to: "/app/budgets",
    color: "text-chart-1",
    bg: "bg-chart-1/10",
  },
  {
    key: "materials" as const,
    label: "Materiales",
    description: "Catálogo de insumos",
    icon: PackageIcon,
    to: "/app/materials",
    color: "text-chart-2",
    bg: "bg-chart-2/10",
  },
  {
    key: "operations" as const,
    label: "Operaciones",
    description: "Mano de obra",
    icon: ScissorsIcon,
    to: "/app/operations",
    color: "text-chart-3",
    bg: "bg-chart-3/10",
  },
  {
    key: "quotations" as const,
    label: "Cotizaciones",
    description: "Presupuestos emitidos",
    icon: ClipboardListIcon,
    to: "/app/quotations",
    color: "text-chart-4",
    bg: "bg-chart-4/10",
  },
];

const quickActions = [
  { label: "Nuevo presupuesto", icon: PlusIcon, to: "/app/budgets" },
  { label: "Nuevo material", icon: PlusIcon, to: "/app/materials" },
  { label: "Nueva operación", icon: PlusIcon, to: "/app/operations" },
];

function DashboardPage() {
  const { data, isLoading } = useSuspenseQuery(dashboardStatsQueryOptions);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  const { counts, recentQuotations } = data;

  return (
    <div className="flex flex-col gap-8 p-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl">Panel</h1>
        <p className="mt-1 text-muted-foreground">
          Bienvenida al sistema de gestión de modistería y costura.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map(({ key, label, description, icon: Icon, to, color, bg }) => (
          <Link key={key} to={to} className="group">
            <Card className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-medium text-muted-foreground text-sm">{label}</CardTitle>
                <div className={`rounded-lg p-2 ${bg}`}>
                  <Icon className={`size-4 ${color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="font-bold text-3xl tracking-tight">{counts[key]}</div>
                <p className="mt-1 text-muted-foreground text-xs">{description}</p>
              </CardContent>
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
                    to="/app/quotations"
                    className="-mx-2 flex items-center justify-between rounded-md px-2 py-3 transition-colors first:pt-0 last:pb-0 hover:bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">{q.clientTitle}</p>
                      <p className="text-muted-foreground text-xs">
                        {new Date(q.createdAt).toLocaleDateString("es-VE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <ArrowRightIcon className="ml-2 size-4 shrink-0 text-muted-foreground/50" />
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
