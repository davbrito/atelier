import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ClipboardListIcon, PackageIcon, ScissorsIcon, ShirtIcon, UsersIcon } from "lucide-react";
import { dashboardCountsQueryOptions } from "#/lib/query-options.ts";
import { Card } from "../ui/card";
import { Skeleton } from "../ui/skeleton";

const CARDS = [
  {
    key: "budgets" as const,
    label: "Prendas",
    icon: ShirtIcon,
    to: "/app/garments",
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

export function SystemStats() {
  const { data } = useSuspenseQuery(dashboardCountsQueryOptions);
  return (
    <div className="flex flex-wrap gap-3 *:flex-1 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]">
      {CARDS.map(({ key, label, icon: Icon, to, color, bg }) => (
        <Link key={key} to={to}>
          <Card
            size="sm"
            className="flex-row items-center gap-2 rounded-xl px-2 py-1 transition-shadow hover:shadow-md"
          >
            <div className={`shrink-0 rounded-lg p-1.5 ${bg}`}>
              <Icon className={`size-4 ${color}`} />
            </div>
            <div>
              <div className="font-bold text-lg leading-none tracking-tight">{data[key]}</div>
              <p className="whitespace-nowrap text-muted-foreground text-xs leading-tight">
                {label}
              </p>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function SystemStatsLoader() {
  return (
    <div className="flex flex-wrap gap-3 *:flex-1 sm:grid sm:grid-cols-[repeat(auto-fit,minmax(8rem,1fr))]">
      {CARDS.map(({ key }) => (
        <Card key={key} size="sm" className="flex-row items-center gap-2 rounded-xl px-2 py-1">
          <Skeleton className="size-7 shrink-0 rounded-lg" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-4 w-6" />
            <Skeleton className="h-3 w-16" />
          </div>
        </Card>
      ))}
    </div>
  );
}
