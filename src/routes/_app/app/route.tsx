import { useAuth, useAuthenticate } from "@better-auth-ui/react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppSidebar } from "#/components/app-sidebar";
import { UserButton } from "#/components/auth/user/user-button";
import { Button } from "#/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "#/components/ui/sidebar";
import { ensureSession } from "#/lib/auth/functions";

export const Route = createFileRoute("/_app/app")({
  beforeLoad: async ({ context: { queryClient }, location }) => {
    const session = await ensureSession(queryClient);

    if (!session) {
      throw redirect({
        to: "/auth/$path",
        params: { path: "sign-in" },
        search: { redirectTo: location.href },
      });
    }

    return { session };
  },
  component: App,
});

function App() {
  const { authClient } = useAuth();
  useAuthenticate(authClient);

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-w-0 items-center justify-between border-border border-b px-3 py-1.5">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <Button id="install-app" type="button" hidden>
              Instalar app
            </Button>
            <UserButton size="icon" />
          </div>
        </header>
        <Outlet />
      </main>
    </SidebarProvider>
  );
}
