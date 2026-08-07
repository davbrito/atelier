import { authQueryKeys } from "@better-auth-ui/core";
import { useAuth, useAuthenticate } from "@better-auth-ui/react";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useLayoutEffect } from "react";
import { AppSidebar } from "#/components/app-sidebar";
import { UserButton } from "#/components/auth/user/user-button";
import { Button } from "#/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "#/components/ui/sidebar";
import { ensureSession } from "#/lib/auth/functions";
import { setupAppInstall, useAppInstallPrompt } from "#/lib/install";

export const Route = createFileRoute("/_app/app")({
  beforeLoad: async ({ context: { queryClient }, location, serverContext }) => {
    if (serverContext) {
      const session = await serverContext.getSession();
      queryClient.setQueryData(authQueryKeys.session, session);
    }
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
            <InstallButton />
            <UserButton size="icon" />
          </div>
        </header>
        <Outlet />
      </main>
    </SidebarProvider>
  );
}

function InstallButton() {
  const { installPrompt, clearInstallPrompt } = useAppInstallPrompt();
  useLayoutEffect(() => setupAppInstall(), []);

  const handleInstallClick = async () => {
    if (installPrompt) {
      await installPrompt.prompt();
      const choiceResult = await installPrompt.userChoice;
      console.log("User choice:", choiceResult.outcome);
      clearInstallPrompt();
    }
  };

  return (
    <Button id="install-app" type="button" hidden={!installPrompt} onClick={handleInstallClick}>
      Instalar app
    </Button>
  );
}
