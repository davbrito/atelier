import { createFileRoute, Link } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";
import { PageHeader } from "#/components/page-header";
import { Button } from "#/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";

export const Route = createFileRoute("/_app/app/_workspace/orders/")({
  component: OrdersPage,
});

function OrdersPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Pedidos" description="Seguimiento de pedidos y prendas del taller">
        <Button className="draft-element" disabled>
          <PlusIcon className="size-4" />
          Nuevo pedido
        </Button>
      </PageHeader>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="table">Tabla</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <div className="draft-element flex min-h-96 items-center justify-center rounded-lg p-8 text-muted-foreground text-sm">
            Tablero Kanban de pedidos (pendiente)
          </div>
        </TabsContent>

        <TabsContent value="table">
          <div className="draft-element flex min-h-96 items-center justify-center rounded-lg p-8 text-muted-foreground text-sm">
            Tabla dinámica de pedidos (pendiente)
          </div>
        </TabsContent>
      </Tabs>

      <Link to="/app/orders/stages" className="draft-element w-fit rounded-md px-3 py-1.5 text-sm">
        Gestionar etapas del Kanban
      </Link>
    </div>
  );
}
