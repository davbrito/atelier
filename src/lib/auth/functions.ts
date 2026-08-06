import {
  ensureActiveOrganization as ensureActiveOrganizationClient,
  ensureListOrganizations as ensureListOrganizationsClient,
  ensureSession as ensureSessionClient,
} from "@better-auth-ui/react";
import {
  ensureActiveOrganization as ensureActiveOrganizationServer,
  ensureListOrganizations as ensureListOrganizationsServer,
  ensureSession as ensureSessionServer,
} from "@better-auth-ui/react/server";
import type { QueryClient } from "@tanstack/react-query";
import { createIsomorphicFn, createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getAuth } from "../context.server";
import { authClient } from "./client";

export const ensureSession = createIsomorphicFn()
  .server((queryClient: QueryClient) =>
    ensureSessionServer(queryClient, getAuth(), { headers: getRequestHeaders() }),
  )
  .client((queryClient: QueryClient) => ensureSessionClient(queryClient, authClient));

export const ensureActiveOrganization = createIsomorphicFn()
  .server((queryClient: QueryClient, userId: string) =>
    ensureActiveOrganizationServer(queryClient, getAuth(), userId, {
      headers: getRequestHeaders(),
    }),
  )
  .client((queryClient: QueryClient, userId: string) =>
    ensureActiveOrganizationClient(queryClient, authClient, userId),
  );

export const ensureOrganizationList = createIsomorphicFn()
  .server((queryClient: QueryClient, userId: string) =>
    ensureListOrganizationsServer(queryClient, getAuth(), userId, { headers: getRequestHeaders() }),
  )
  .client((queryClient: QueryClient, userId: string) =>
    ensureListOrganizationsClient(queryClient, authClient, userId),
  );

export const authenticatedMiddleware = createMiddleware().server(
  async ({ next, request, context: { auth, executionCtx } }) => {
    const session = await executionCtx.tracing.enterSpan("auth.getSession", async (span) => {
      const session = await auth.api.getSession({ headers: request.headers });

      if (session) {
        const sess = session.session;
        span.setAttribute("session.id", sess.id);
        span.setAttribute("session.user.id", sess.userId);
        span.setAttribute("session.organization.id", sess.activeOrganizationId ?? undefined);
      }

      return session;
    });
    if (!session) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }
    return next({ context: { ...session } });
  },
);

export const organizationMiddleware = createMiddleware()
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
  createMiddleware()
    .middleware([authenticatedMiddleware])
    .server(async ({ next, context: { user } }) => {
      if (user.role !== role) return Response.json({ message: "Forbidden" }, { status: 403 });
      return next();
    });
