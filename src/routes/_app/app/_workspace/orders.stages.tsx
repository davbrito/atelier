import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "#/components/page-header";

export const Route = createFileRoute("/_app/app/_workspace/orders/stages")({
  component: OrderStagesPage,
});

function OrderStagesPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back
        title="Etapas del Kanban"
        description="Configura las columnas del tablero de pedidos"
      />

      <div className="draft-element flex min-h-64 items-center justify-center rounded-lg p-8 text-muted-foreground text-sm">
        Gestión de etapas (crear, reordenar, colores) — pendiente
      </div>
    </div>
  );
}
