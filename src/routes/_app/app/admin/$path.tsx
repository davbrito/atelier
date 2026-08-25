import { viewPaths } from "@better-auth-ui/core";
import { createFileRoute } from "@tanstack/react-router";
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
