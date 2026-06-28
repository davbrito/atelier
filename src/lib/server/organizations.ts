import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { member } from "#/db/schema.ts";
import { authenticatedMiddleware } from "../auth/functions";

export const getUserOrganizationCount = createServerFn({ method: "GET" })
  .middleware([authenticatedMiddleware])
  .handler(
    async ({ context: { user, db } }) => await db.$count(member, eq(member.userId, user.id)),
  );
