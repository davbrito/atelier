import { viewPaths } from "@better-auth-ui/core";
import { createFileRoute } from "@tanstack/react-router";
import { Auth } from "#/components/auth/auth";

const validAuthPathSegments = new Set([...Object.values(viewPaths.auth)]);

export const Route = createFileRoute("/_app/auth/$path")({
  params: {
    parse: ({ path }) => {
      if (!validAuthPathSegments.has(path)) {
        return false;
      }

      return { path };
    },
  },
  component: AuthPage,
});

function AuthPage() {
  const { path } = Route.useParams();

  return (
    <div className="my-auto flex h-full items-center justify-center p-4 md:p-6">
      <Auth path={path} />
    </div>
  );
}
