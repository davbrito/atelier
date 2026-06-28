"use client";

import { useAuthPlugin } from "@better-auth-ui/react";
import { Send } from "lucide-react";

import { Button } from "#/components/ui/button.tsx";
import { organizationPlugin } from "#/lib/auth/organization-plugin.tsx";

export type OrganizationInvitationsEmptyProps = {
  onInvitePress: () => void;
};

/**
 * Empty state for `OrganizationInvitations`.
 */
export function OrganizationInvitationsEmpty({ onInvitePress }: OrganizationInvitationsEmptyProps) {
  const { localization: organizationLocalization } = useAuthPlugin(organizationPlugin);

  return (
    <div className="flex flex-col items-center gap-4 p-4 text-center">
      <Send className="size-6 text-muted-foreground" />

      <div className="flex flex-col gap-2">
        <p className="font-semibold text-foreground text-sm">
          {organizationLocalization.noInvitations}
        </p>

        <span className="text-muted-foreground text-sm">
          {organizationLocalization.organizationInvitationsEmptyDescription}
        </span>
      </div>

      <Button size="sm" onClick={onInvitePress}>
        {organizationLocalization.inviteMember}
      </Button>
    </div>
  );
}
