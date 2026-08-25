import { viewPaths } from "@better-auth-ui/core";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Admin } from "#/components/auth/admin/admin";
import { whitelistPlugin } from "#/lib/auth-custom/plugins/whitelist-plugin";

const validAdminPaths = [
  ...Object.values(viewPaths.admin),
  ...(whitelistPlugin().adminTabs?.map((tab) => tab.path) ?? []),
];

export const Route = createFileRoute("/_app/app/admin/$path")({
  params: {
    parse: ({ path }) => {
      if (!validAdminPaths.includes(path)) return false;
      return { path };
    },
  },
  beforeLoad: async ({ context: { session } }) => {
    if (session.user.role !== "admin") {
      throw redirect({ to: "/app" });
    }
  },
  component: AdminPage,
});

function AdminPage() {
  const { path } = Route.useParams();

  return (
    <div className="flex flex-col gap-6 p-6">
      <Admin path={path} />
    </div>
  );
}
