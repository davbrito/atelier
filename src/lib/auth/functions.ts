import { tracing } from "cloudflare:workers";
import { ensureSession as ensureSessionClient } from "@better-auth-ui/core";
import {
  ensureActiveOrganization as ensureActiveOrganizationClient,
  ensureListOrganizations as ensureListOrganizationsClient,
  type OrganizationAuthClient,
} from "@better-auth-ui/core/plugins/organization";
import {
  ensureActiveOrganization as ensureActiveOrganizationServer,
  ensureListOrganizations as ensureListOrganizationsServer,
} from "@better-auth-ui/core/plugins/organization/server";
import { ensureSessionServer } from "@better-auth-ui/core/server";
import type { QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn, createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getAuth } from "../context.server";
import { authClient } from "./client";
import type { AppAuth } from "./server";

export const ensureSession = createIsomorphicFn()
  .server((queryClient: QueryClient) => {
    return ensureSessionServer(queryClient, getAuth(), { headers: getRequestHeaders() });
  })
  .client((queryClient: QueryClient) => ensureSessionClient(queryClient, authClient));

export const ensureActiveOrganization = createIsomorphicFn()
  .server((queryClient: QueryClient, userId: string) =>
    ensureActiveOrganizationServer(queryClient, getAuth(), userId, {
      headers: getRequestHeaders(),
    }),
  )
  .client((queryClient: QueryClient, userId: string) =>
    // @better-auth-ui/core's OrganizationAuthClient type hardcodes teams/dynamicAccessControl
    // as enabled, which we don't use — see https://github.com/better-auth-ui/better-auth-ui/issues/534
    ensureActiveOrganizationClient(
      queryClient,
      authClient as unknown as OrganizationAuthClient,
      userId,
    ),
  );

export const ensureOrganizationList = createIsomorphicFn()
  .server((queryClient: QueryClient, userId: string) => {
    const headers = getRequestHeaders();
    return tracing.enterSpan("ensureOrganizationList", () =>
      ensureListOrganizationsServer(queryClient, getAuth(), userId, {
        headers,
      }),
    );
  })
  .client((queryClient: QueryClient, userId: string) =>
    ensureListOrganizationsClient(
      queryClient,
      authClient as unknown as OrganizationAuthClient,
      userId,
    ),
  );

export const authMiddleware = createMiddleware().server(
  async ({ next, context: { getSession, executionCtx } }) => {
    const session = await executionCtx.tracing.enterSpan("auth.getSession", async (span) => {
      const session = await getSession();

      if (session) {
        const sess = session.session;
        span.setAttribute("session.id", sess.id);
        span.setAttribute("session.user.id", sess.userId);
        span.setAttribute("session.organization.id", sess.activeOrganizationId ?? undefined);
      }

      return session;
    });

    return next({ context: { ...session } });
  },
);

export function validateSession(
  session: Partial<AppAuth["$Infer"]["Session"]> | null,
): session is AppAuth["$Infer"]["Session"] {
  return session !== null && session.session != null && session.user != null;
}

export function assertSession(
  session: Partial<AppAuth["$Infer"]["Session"]> | null,
): asserts session is AppAuth["$Infer"]["Session"] {
  if (!validateSession(session)) {
    throw new Error("Unauthorized");
  }
}

export const authenticatedMiddleware = createMiddleware({ type: "function" })
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    assertSession(context);

    return next({ context: { user: context.user, session: context.session } });
  });

export const organizationMiddleware = createMiddleware({ type: "function" })
  .middleware([authenticatedMiddleware])
  .server(async ({ next, context: { session } }) => {
    const activeOrganizationId = session.activeOrganizationId;
    if (!activeOrganizationId) {
      throw new Error(
        "No hay organización activa. Por favor, selecciona una organización para continuar.",
      );
    }
    return next({ context: { activeOrganizationId } });
  });

export const roleMiddleware = (role: "admin" | "user") =>
  createMiddleware({ type: "function" })
    .middleware([authenticatedMiddleware])
    .server(async ({ next, context: { user } }) => {
      if (user.role !== role) throw new Error("Unauthorized");
      return next();
    });
