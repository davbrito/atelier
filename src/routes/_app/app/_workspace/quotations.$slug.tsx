import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardListIcon, ExternalLinkIcon, PlusIcon } from "lucide-react";
import { PageHeader } from "#/components/page-header";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import { Skeleton } from "#/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table";
import { formatMoney, formatUnit, LOCALE } from "#/lib/format";
import { quotationBySlugQueryOptions } from "#/lib/query-options";

export const Route = createFileRoute("/_app/app/_workspace/quotations/$slug")({
  loader: ({ context: { queryClient }, params: { slug } }) => {
    void queryClient.prefetchQuery(quotationBySlugQueryOptions(slug));
  },
  pendingComponent: () => (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="size-9 shrink-0 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-lg" />
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
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

  const total = +quotation.total;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
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
      >
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <ClipboardListIcon className="size-3" />
            Cotización
          </Badge>
          <Button
            size="sm"
            nativeButton={false}
            render={<Link to="/app/orders/new" search={{ quotationId: quotation.id }} />}
          >
            <PlusIcon className="size-4" />
            Crear pedido
          </Button>
        </div>
      </PageHeader>

      {/* Document summary */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-xs">Cliente</p>
            <p className="font-medium text-sm">{quotation.clientTitle}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Fecha</p>
            <p className="font-medium text-sm" suppressHydrationWarning>
              {new Date(quotation.createdAt).toLocaleDateString(LOCALE, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Prendas</p>
            <p className="font-medium text-sm">{quotation.lines.length}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Total</p>
            <p className="font-semibold text-sm" suppressHydrationWarning>
              {formatMoney(total)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* One section per quotation line (budget/garment type) */}
      {quotation.lines.map((line) => {
        const lineMaterialsTotal = line.materials.reduce((sum, m) => sum + Number(m.amount), 0);
        const lineOperationsTotal = line.operations.reduce((sum, o) => sum + Number(o.amount), 0);
        const lineTotal = lineMaterialsTotal + lineOperationsTotal;

        return (
          <Card key={line.id} className="gap-0 p-0">
            <div className="flex items-center justify-between border-b px-4 py-3">
              {line.budgetSlug ? (
                <Link
                  to="/app/budgets/$slug"
                  params={{ slug: line.budgetSlug }}
                  className="inline-flex items-center gap-1 font-medium text-primary text-sm hover:underline"
                >
                  {line.budgetName}
                  <ExternalLinkIcon className="size-3" />
                </Link>
              ) : (
                <span className="font-medium text-sm">Prenda sin presupuesto</span>
              )}
              <span className="font-medium text-sm" suppressHydrationWarning>
                {formatMoney(lineTotal)}
              </span>
            </div>

            {line.materials.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead className="text-right">Precio unit.</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {line.materials.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.frozenName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatUnit(m.quantity, m.frozenUnit)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatMoney(Number(m.frozenPrice))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(Number(m.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {line.operations.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Concepto</TableHead>
                    <TableHead>Duración</TableHead>
                    <TableHead className="text-right">Tarifa</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {line.operations.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.frozenName}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {o.durationMinutes} min
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatMoney(Number(o.frozenHourlyRate))}/h
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(Number(o.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        );
      })}

      {/* Total */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-between">
          <span className="font-semibold text-base">Total</span>
          <span className="font-bold text-2xl tracking-tight" suppressHydrationWarning>
            {formatMoney(total)}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
