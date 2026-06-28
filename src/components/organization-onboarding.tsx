import { useAuth, useSession } from "@better-auth-ui/react";
import { useState } from "react";
import { CreateOrganizationDialog } from "#/components/auth/organization/create-organization-dialog";
import { OrganizationSwitcher } from "#/components/auth/organization/organization-switcher";
import { Button } from "#/components/ui/button";

interface OrganizationOnboardingProps {
  count: number;
}

export function OrganizationOnboarding({ count }: OrganizationOnboardingProps) {
  const [createOpen, setCreateOpen] = useState(false);

  const { authClient } = useAuth();
  const { data: session } = useSession(authClient);

  const userName = session?.user?.name;
  const defaultOrgName = userName ? `Proyectos de ${userName}` : undefined;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <OrganizationSwitcher />
        {count === 0 ? (
          <>
            <p className="max-w-xs text-muted-foreground text-sm">
              Crea tu primera área de trabajo para empezar a gestionar presupuestos y cotizaciones.
            </p>
            <Button onClick={() => setCreateOpen(true)}>Crear área de trabajo</Button>
          </>
        ) : (
          <p className="text-muted-foreground text-sm">
            Selecciona un área de trabajo para continuar.
          </p>
        )}
      </div>
      <CreateOrganizationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultName={defaultOrgName}
      />
    </div>
  );
}
