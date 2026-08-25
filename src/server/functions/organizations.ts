import { createServerFn } from "@tanstack/react-start";
import { authenticatedMiddleware } from "#/lib/auth/functions";
import { getUserOrganizationCount as getUserOrganizationCountUseCase } from "../application/organizations";

export const getUserOrganizationCount = createServerFn({ method: "GET" })
  .middleware([authenticatedMiddleware])
  .handler(async ({ context: { user, db } }) => getUserOrganizationCountUseCase(db, user.id));
