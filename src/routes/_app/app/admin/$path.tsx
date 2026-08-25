import { viewPaths } from "@better-auth-ui/core";
import { createFileRoute } from "@tanstack/react-router";
import { Admin } from "#/components/auth/admin/admin";

const validAdminPaths = Object.values(viewPaths.admin);

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
