import { createServerFn } from "@tanstack/react-start";
import { asc, eq } from "drizzle-orm";
import * as z from "zod";
import * as schema from "#/db/schema";
import { roleMiddleware } from "../auth/functions";

// ── Queries ──────────────────────────────────────────────

export const listWhitelistedEmails = createServerFn({ method: "GET" })
  .middleware([roleMiddleware("admin")])
  .handler(async ({ context: { db } }) => {
    return await db
      .select({
        id: schema.whitelistEmail.id,
        email: schema.whitelistEmail.email,
        addedById: schema.whitelistEmail.addedById,
        createdAt: schema.whitelistEmail.createdAt,
      })
      .from(schema.whitelistEmail)
      .orderBy(asc(schema.whitelistEmail.email));
  });

// ── Mutations ────────────────────────────────────────────

export const addWhitelistedEmail = createServerFn({ method: "POST" })
  .middleware([roleMiddleware("admin")])
  .validator(z.object({ email: z.email().toLowerCase().trim() }))
  .handler(async ({ data, context: { db, user } }) => {
    await db.insert(schema.whitelistEmail).values({ email: data.email, addedById: user.id });
    return { success: true };
  });

export const removeWhitelistedEmail = createServerFn({ method: "POST" })
  .middleware([roleMiddleware("admin")])
  .validator(z.object({ id: z.string() }))
  .handler(async ({ data, context: { db } }) => {
    await db.delete(schema.whitelistEmail).where(eq(schema.whitelistEmail.id, data.id));
    return { success: true };
  });
