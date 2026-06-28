import {
  type OrganizationAuthClient,
  useAuth,
  useAuthPlugin,
  useCreateOrganization,
} from "@better-auth-ui/react";
import { Briefcase } from "lucide-react";
import { type SyntheticEvent, useEffect, useState } from "react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "#/components/ui/alert-dialog.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Field, FieldError } from "#/components/ui/field.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Label } from "#/components/ui/label.tsx";
import { Spinner } from "#/components/ui/spinner.tsx";
import { organizationPlugin } from "#/lib/auth/organization-plugin.tsx";
import { SlugField, sanitizeSlug } from "./slug-field";

/** Props for the `CreateOrganizationDialog` component. */
export type CreateOrganizationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName?: string;
};

export function CreateOrganizationDialog({
  open,
  onOpenChange,
  defaultName,
}: CreateOrganizationDialogProps) {
  const { authClient, localization } = useAuth();
  const { localization: organizationLocalization } = useAuthPlugin(organizationPlugin);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [nameError, setNameError] = useState<string>();

  const { mutate: createOrganization, isPending: isCreating } = useCreateOrganization(
    authClient as OrganizationAuthClient,
    {
      onSuccess: () => onOpenChange(false),
    },
  );

  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    createOrganization({ name, slug });
  };

  useEffect(() => {
    if (!open) {
      setSlug("");
      setName("");
      setSlugEdited(false);
      setNameError(undefined);
    } else if (defaultName) {
      setName(defaultName);
    }
  }, [open, defaultName]);

  useEffect(() => {
    if (slugEdited) return;
    setSlug(sanitizeSlug(name));
  }, [name, slugEdited]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <AlertDialogHeader>
            <AlertDialogMedia>
              <Briefcase />
            </AlertDialogMedia>

            <AlertDialogTitle>{organizationLocalization.createOrganization}</AlertDialogTitle>

            <AlertDialogDescription>
              {organizationLocalization.organizationsDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="flex flex-col gap-4">
            <Field data-invalid={!!nameError}>
              <Label htmlFor="create-organization-name">{organizationLocalization.name}</Label>

              <Input
                id="create-organization-name"
                name="name"
                autoFocus
                required
                placeholder={organizationLocalization.namePlaceholder}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(undefined);
                }}
                onInvalid={(e) => {
                  e.preventDefault();
                  setNameError(localization.auth.fieldRequired);
                }}
                aria-invalid={!!nameError}
                disabled={isCreating}
              />

              <FieldError>{nameError}</FieldError>
            </Field>

            <SlugField
              id="create-organization-slug"
              value={slug}
              onChange={(value) => {
                setSlug(value);
                setSlugEdited(true);
              }}
              disabled={isCreating}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreating}>
              {localization.settings.cancel}
            </AlertDialogCancel>

            <Button type="submit" disabled={isCreating}>
              {isCreating && <Spinner />}

              {organizationLocalization.createOrganization}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
