import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/app/admin")({
  beforeLoad: async ({ context: { session } }) => {
    if (session.user.role !== "admin") {
      throw redirect({ to: "/app" });
    }
  },
});
