import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "#/components/page-header";

export const Route = createFileRoute("/_app/app/_workspace/orders/$id")({
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { id } = Route.useParams();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader back title={`Pedido #${id}`} description="Detalle del pedido" />

      <div className="draft-element flex min-h-40 items-center justify-center rounded-lg p-8 text-muted-foreground text-sm">
        Datos del pedido (cliente, fechas, notas) — pendiente
      </div>

      <div className="draft-element flex min-h-40 items-center justify-center rounded-lg p-8 text-muted-foreground text-sm">
        Prendas del pedido — pendiente
      </div>

      <div className="draft-element flex min-h-40 items-center justify-center rounded-lg p-8 text-muted-foreground text-sm">
        Estado de pago — pendiente
      </div>
    </div>
  );
}
