import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarIcon, Loader2Icon, MailIcon, PhoneIcon } from "lucide-react";
import { PageHeader } from "#/components/page-header";
import { Badge } from "#/components/ui/badge";
import { Card, CardContent } from "#/components/ui/card";
import { formatMoney, LOCALE } from "#/lib/format";
import { orderByCodeQueryOptions } from "#/lib/query-options";

export const Route = createFileRoute("/_app/app/_workspace/orders/$code")({
  component: OrderDetailPage,
  loader: ({ context: { queryClient }, params: { code } }) =>
    queryClient.prefetchQuery(orderByCodeQueryOptions(code)),
  pendingComponent: () => (
    <div className="flex h-64 items-center justify-center">
      <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
    </div>
  ),
});

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  ready: "Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_VARIANTS: Record<string, "outline" | "secondary" | "default" | "destructive"> = {
  pending: "outline",
  in_progress: "secondary",
  ready: "default",
  delivered: "default",
  cancelled: "destructive",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_VARIANTS: Record<string, "outline" | "secondary" | "default" | "destructive"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  urgent: "destructive",
};

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function OrderDetailPage() {
  const { code } = Route.useParams();
  const { data: order } = useSuspenseQuery(orderByCodeQueryOptions(code));

  const total = Number(order.totalAmount);
  const deposit = Number(order.depositAmount);
  const balance = total - deposit;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-6">
      <PageHeader
        back
        title={order.code}
        description={`Recibido el ${formatDate(order.receivedAt)}`}
      >
        <div className="flex items-center gap-2">
          <Badge variant={PRIORITY_VARIANTS[order.priority] ?? "outline"}>
            {PRIORITY_LABELS[order.priority] ?? order.priority}
          </Badge>
          <Badge variant={STATUS_VARIANTS[order.status] ?? "outline"}>
            {STATUS_LABELS[order.status] ?? order.status}
          </Badge>
        </div>
      </PageHeader>

      {/* Client + dates */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-xs">Cliente</p>
            <p className="font-medium text-sm">{order.clientName ?? "—"}</p>
            {order.clientPhone && (
              <p className="flex items-center gap-1 text-muted-foreground text-xs">
                <PhoneIcon className="size-3" />
                {order.clientPhone}
              </p>
            )}
            {order.clientEmail && (
              <p className="flex items-center gap-1 text-muted-foreground text-xs">
                <MailIcon className="size-3" />
                {order.clientEmail}
              </p>
            )}
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Fecha de entrega</p>
            <p className="flex items-center gap-1 font-medium text-sm">
              {order.dueDate ? (
                <>
                  <CalendarIcon className="size-3" />
                  {formatDate(order.dueDate)}
                </>
              ) : (
                "—"
              )}
            </p>
          </div>
          {order.quotationId && (
            <div>
              <p className="text-muted-foreground text-xs">Origen</p>
              <p className="font-medium text-sm">Desde cotización</p>
            </div>
          )}
          {order.notes && (
            <div className="col-span-2 sm:col-span-4">
              <p className="text-muted-foreground text-xs">Notas</p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Garments */}
      <div className="space-y-3">
        <span className="font-medium text-sm">Prendas</span>
        {order.garments.map((g) => (
          <Card key={g.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{g.name}</p>
                <p className="text-muted-foreground text-xs">
                  {g.quantity} × {formatMoney(Number(g.unitPrice))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {g.stageName && (
                  <Badge variant={g.isFinalStage ? "default" : "secondary"} className="gap-1.5">
                    {g.stageColor && (
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: g.stageColor }}
                      />
                    )}
                    {g.stageName}
                  </Badge>
                )}
                <span className="font-medium text-sm">
                  {formatMoney(g.quantity * Number(g.unitPrice))}
                </span>
              </div>
            </div>
            {g.fittingDate && (
              <p className="mt-2 flex items-center gap-1 text-muted-foreground text-xs">
                <CalendarIcon className="size-3" />
                Prueba: {formatDate(g.fittingDate)}
              </p>
            )}
            {g.notes && <p className="mt-2 text-muted-foreground text-xs">{g.notes}</p>}
          </Card>
        ))}
      </div>

      {/* Payment status */}
      <Card>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-muted-foreground text-xs">Total</p>
            <p className="font-semibold text-sm">{formatMoney(total)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Abono</p>
            <p className="font-semibold text-sm">{formatMoney(deposit)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Saldo</p>
            <p className="font-semibold text-sm">{formatMoney(balance)}</p>
          </div>
        </CardContent>
      </Card>

      <Link to="/app/orders" className="w-fit text-sm underline">
        Volver a pedidos
      </Link>
    </div>
  );
}
