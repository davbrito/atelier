import {
  type OrganizationAuthClient,
  useActiveOrganization,
  useAuth,
  useAuthPlugin,
  useUpdateOrganization,
} from "@better-auth-ui/react";
import { type SyntheticEvent, useEffect, useState } from "react";
import { toast } from "#/components/ui/toast.tsx";

import { Button } from "#/components/ui/button.tsx";
import { Card, CardContent } from "#/components/ui/card.tsx";
import { Field, FieldError, FieldLabel } from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import { organizationPlugin } from "#/lib/auth/organization-plugin.tsx";
import { cn } from "#/lib/utils.ts";
import { ChangeOrganizationLogo } from "./change-organization-logo";
import { SlugField } from "./slug-field";

export type OrganizationProfileProps = {
  className?: string;
};

/**
 * Profile card for the active organization: logo (when enabled), display name, and slug.
 */
export function OrganizationProfile({ className }: OrganizationProfileProps) {
  const { authClient, localization } = useAuth();
  const { localization: organizationLocalization } = useAuthPlugin(organizationPlugin);

  const { data: activeOrganization } = useActiveOrganization(authClient as OrganizationAuthClient);

  const [slug, setSlug] = useState(activeOrganization?.slug ?? "");

  useEffect(() => {
    setSlug(activeOrganization?.slug ?? "");
  }, [activeOrganization?.slug]);

  const { mutate: commitOrganizationUpdate, isPending } = useUpdateOrganization(
    authClient as OrganizationAuthClient,
    {
      onSuccess: () =>
        toast.add({
          type: "success",
          description: organizationLocalization.organizationUpdatedSuccess,
        }),
    },
  );

  function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeOrganization) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;

    commitOrganizationUpdate({
      data: { name, slug },
    });
  }

  const nameInputId = `${activeOrganization?.id ?? "org"}-name`;
  const slugInputId = `${activeOrganization?.id ?? "org"}-slug`;

  return (
    <div>
      <h2 className={cn("mb-3 text-sm font-semibold")}>
        {organizationLocalization.organizationProfile}
      </h2>

      <Card className={className}>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <ChangeOrganizationLogo />

            <Field>
              <FieldLabel htmlFor={nameInputId}>{organizationLocalization.name}</FieldLabel>

              {activeOrganization ? (
                <Input
                  key={activeOrganization.id}
                  id={nameInputId}
                  name="name"
                  defaultValue={activeOrganization.name}
                  autoComplete="organization"
                  placeholder={organizationLocalization.namePlaceholder}
                  disabled={isPending}
                />
              ) : (
                <Skeleton className="h-8 w-full rounded-md" />
              )}

              <FieldError />
            </Field>

            {activeOrganization ? (
              <SlugField
                id={slugInputId}
                value={slug}
                onChange={setSlug}
                currentSlug={activeOrganization.slug}
                disabled={isPending}
              />
            ) : (
              <Field>
                <FieldLabel>{organizationLocalization.slug}</FieldLabel>
                <Skeleton className="h-8 w-full rounded-md" />
              </Field>
            )}

            <Button
              type="submit"
              disabled={isPending || !activeOrganization}
              size="sm"
              className="mt-1 w-fit"
            >
              {isPending && <Spinner />}

              {localization.settings.saveChanges}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
