import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Providers } from "#/components/providers";

export const Route = createFileRoute("/_app")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <Providers>
      <Outlet />
    </Providers>
  );
}
