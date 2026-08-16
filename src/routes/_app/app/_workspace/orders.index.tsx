import { createFileRoute, Link } from "@tanstack/react-router";
import { ListOrderedIcon, Loader2Icon, PlusIcon, SettingsIcon } from "lucide-react";
import { OrderKanbanBoard } from "#/components/order-kanban-board";
import { OrdersTable } from "#/components/orders-table";
import { PageHeader } from "#/components/page-header";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import {
  garmentStagesListQueryOptions,
  kanbanGarmentsListQueryOptions,
  ordersListQueryOptions,
} from "#/lib/query-options";

export const Route = createFileRoute("/_app/app/_workspace/orders/")({
  component: OrdersPage,
  loader: ({ context: { queryClient } }) => {
    queryClient.prefetchQuery(garmentStagesListQueryOptions);
    queryClient.prefetchQuery(kanbanGarmentsListQueryOptions);
    queryClient.prefetchQuery(ordersListQueryOptions({ page: 1, pageSize: 10, sortDir: "desc" }));
  },
  pendingComponent: () => (
    <div className="flex h-64 items-center justify-center">
      <Loader2Icon className="size-8 animate-spin text-muted-foreground/50" />
    </div>
  ),
});

function OrdersPage() {
  return (
    <>
      <div className="flex flex-col gap-6 p-6">
        <PageHeader title="Pedidos" description="Seguimiento de pedidos y prendas del taller">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
                <SettingsIcon className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-auto">
                <DropdownMenuGroup>
                  <DropdownMenuItem render={<Link to="/app/orders/stages" />}>
                    <ListOrderedIcon className="size-3.5" />
                    Gestionar etapas del Kanban
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button nativeButton={false} render={<Link to="/app/orders/new" />}>
              <PlusIcon className="size-4" />
              Nuevo pedido
            </Button>
          </div>
        </PageHeader>
      </div>
      <Tabs defaultValue="kanban" className="flex min-h-0 min-w-0 grow flex-col">
        <TabsList className="mx-6">
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
          <TabsTrigger value="table">Tabla</TabsTrigger>
        </TabsList>

        <TabsContent value="kanban" className="flex min-h-0 min-w-0 grow flex-col">
          <OrderKanbanBoard />
        </TabsContent>

        <TabsContent value="table" className="p-6">
          <OrdersTable />
        </TabsContent>
      </Tabs>
    </>
  );
}
