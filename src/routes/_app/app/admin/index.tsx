import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/app/admin/")({
  beforeLoad: () => {
    throw redirect({ to: "/app/admin/whitelist", replace: true });
  },
  component: () => null,
});
