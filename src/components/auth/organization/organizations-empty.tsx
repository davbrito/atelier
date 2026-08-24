import { useAuthPlugin } from "@better-auth-ui/react";
import { Briefcase } from "lucide-react";

import { Button } from "#/components/ui/button.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "#/components/ui/empty.tsx";
import { organizationPlugin } from "#/lib/auth/organization-plugin.tsx";

export type OrganizationsEmptyProps = {
  onCreatePress: () => void;
  canCreate?: boolean;
};

export function OrganizationsEmpty({ onCreatePress, canCreate = true }: OrganizationsEmptyProps) {
  const { localization: organizationLocalization } = useAuthPlugin(organizationPlugin);

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Briefcase />
        </EmptyMedia>
        <EmptyTitle>{organizationLocalization.noOrganizations}</EmptyTitle>
        <EmptyDescription>{organizationLocalization.organizationsDescription}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm" disabled={!canCreate} onClick={onCreatePress}>
          {organizationLocalization.createOrganization}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
