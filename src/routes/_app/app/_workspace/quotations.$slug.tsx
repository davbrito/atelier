import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ExternalLinkIcon } from "lucide-react";
import { PageHeader } from "#/components/page-header";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { quotationBySlugQueryOptions } from "#/lib/query-options";
import { unitSchema } from "#/lib/units";

const LOCALE = "es-VE";

export const Route = createFileRoute("/_app/app/_workspace/quotations/$slug")({
  loader: ({ context: { queryClient }, params: { slug } }) => {
    void queryClient.prefetchQuery(quotationBySlugQueryOptions(slug));
  },
  pendingComponent: () => (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-9 shrink-0 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-7 w-56 rounded" />
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
  ),
  component: QuotationDetailPage,
});

function QuotationDetailPage() {
  const { slug } = Route.useParams();
  const { data: quotation } = useSuspenseQuery(quotationBySlugQueryOptions(slug));

  if (!quotation) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Cotización no encontrada.</p>
        <Button
          variant="outline"
          className="mt-4"
          nativeButton={false}
          render={<Link to="/app/quotations" />}
        >
          Volver
        </Button>
      </div>
    );
  }

  const materialsTotal = quotation.materials.reduce((sum, m) => sum + Number(m.amount), 0);
  const operationsTotal = quotation.operations.reduce((sum, o) => sum + Number(o.amount), 0);
  const total = materialsTotal + operationsTotal;

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader
        title={quotation.clientTitle}
        description={`Cotización generada el ${new Date(quotation.createdAt).toLocaleDateString(
          LOCALE,
          {
            day: "numeric",
            month: "long",
            year: "numeric",
          },
        )}`}
        back
      />

      {quotation.budgetSlug && (
        <Link
          to="/app/budgets/$slug"
          params={{ slug: quotation.budgetSlug }}
          className="inline-flex w-fit items-center gap-1.5 rounded bg-muted/50 px-2 py-1 text-sm hover:bg-muted/70 hover:underline"
        >
          <ExternalLinkIcon className="size-3" />
          Presupuesto: {quotation.budgetName}
        </Link>
      )}
      <div className="mx-auto w-fit max-w-full space-y-8">
        {quotation.materials.length > 0 && (
          <div>
            <h3 className="mb-2 font-medium text-sm">Materiales</h3>
            <div className="space-y-2">
              {quotation.materials.map((m) => (
                <div key={m.id} className="flex justify-between rounded-lg border p-3 text-sm">
                  <div className="flex-1">
                    <span className="font-medium">{m.frozenName}</span>
                    <span className="mx-2 text-muted-foreground text-xs">
                      {formatUnit(m.quantity, m.frozenUnit)} &times; $
                      {Number(m.frozenPrice).toFixed(2)}
                    </span>
                  </div>
                  <span className="font-medium">
                    {Number(m.amount).toLocaleString(LOCALE, {
                      style: "currency",
                      currency: "USD",
                      currencyDisplay: "narrowSymbol",
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {quotation.operations.length > 0 && (
          <div>
            <h3 className="mb-2 font-medium text-sm">Mano de obra</h3>
            <div className="space-y-2">
              {quotation.operations.map((o) => {
                return (
                  <div key={o.id} className="flex justify-between rounded-lg border p-3 text-sm">
                    <div className="flex-1">
                      <span className="font-medium">{o.frozenName}</span>
                      <span className="mx-2 text-muted-foreground text-xs">
                        {o.durationMinutes} min &times; ${Number(o.frozenHourlyRate).toFixed(2)}/h
                      </span>
                    </div>
                    <span className="font-medium">
                      {Number(o.amount).toLocaleString(LOCALE, {
                        style: "currency",
                        currency: "USD",
                        currencyDisplay: "narrowSymbol",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="border-t pt-4">
          <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatUnit(value: string, unit: string) {
  const u = unitSchema.safeParse(unit).data;
  const numberValue = Number(value);

  if (!u) return numberValue.toLocaleString(LOCALE);

  switch (u) {
    case "roll":
      return `${numberValue.toLocaleString(LOCALE)} rollos`;
    case "unit":
      return `${numberValue.toLocaleString(LOCALE)} rollos`;
    default:
      return numberValue.toLocaleString(LOCALE, {
        style: "unit",
        unit: u === "m" ? "meter" : u === "cm" ? "centimeter" : "unit",
        unitDisplay: "long",
      });
  }
}
