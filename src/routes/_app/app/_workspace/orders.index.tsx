import { createFileRoute, Link } from "@tanstack/react-router";
import { ListOrderedIcon, Loader2Icon, PlusIcon, SettingsIcon } from "lucide-react";
import { OrderKanbanBoard } from "#/components/order-kanban-board";
import { PageHeader } from "#/components/page-header";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { garmentStagesListQueryOptions, kanbanGarmentsListQueryOptions } from "#/lib/query-options";

export const Route = createFileRoute("/_app/app/_workspace/orders/")({
  component: OrdersPage,
  loader: ({ context: { queryClient } }) =>
    Promise.all([
      queryClient.prefetchQuery(garmentStagesListQueryOptions),
      queryClient.prefetchQuery(kanbanGarmentsListQueryOptions),
    ]),
  pendingComponent: () => (
    <div className="flex h-64 items-center justify-center">
      <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
    </div>
  ),
});

function OrdersPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader title="Pedidos" description="Seguimiento de pedidos y prendas del taller">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
              <SettingsIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem render={<Link to="/app/orders/stages" />}>
                <ListOrderedIcon className="size-3.5" />
                Gestionar etapas del Kanban
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button nativeButton={false} render={<Link to="/app/orders/new" />}>
            <PlusIcon className="size-4" />
            Nuevo pedido
          </Button>
        </div>
      </PageHeader>

      <Tabs defaultValue="kanban">
        <TabsList>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="table">Tabla</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban">
          <OrderKanbanBoard />
        </TabsContent>

        <TabsContent value="table">
          <div className="draft-element flex min-h-96 items-center justify-center rounded-lg p-8 text-muted-foreground text-sm">
            Tabla dinámica de pedidos (pendiente)
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
