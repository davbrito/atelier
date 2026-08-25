import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/app/admin/")({
  beforeLoad: () => {
    throw redirect({
      to: "/app/admin/$path",
      params: { path: "whitelist" },
      replace: true,
    });
  },
  component: () => null,
});
