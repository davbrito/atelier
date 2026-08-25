import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { roleMiddleware } from "#/lib/auth/functions";
import {
  addWhitelistedEmail as addWhitelistedEmailUseCase,
  listWhitelistedEmails as listWhitelistedEmailsUseCase,
  removeWhitelistedEmail as removeWhitelistedEmailUseCase,
} from "../application/whitelist";

// ── Queries ──────────────────────────────────────────────

export const listWhitelistedEmails = createServerFn({ method: "GET" })
  .middleware([roleMiddleware("admin")])
  .handler(async ({ context: { db } }) => listWhitelistedEmailsUseCase(db));

// ── Mutations ────────────────────────────────────────────

export const addWhitelistedEmail = createServerFn({ method: "POST" })
  .middleware([roleMiddleware("admin")])
  .validator(z.object({ email: z.email().toLowerCase().trim() }))
  .handler(async ({ data, context: { db, user } }) => {
    await addWhitelistedEmailUseCase(db, data.email, user.id);
    return { success: true };
  });

export const removeWhitelistedEmail = createServerFn({ method: "POST" })
  .middleware([roleMiddleware("admin")])
  .validator(z.object({ id: z.uuid() }))
  .handler(async ({ data, context: { db } }) => {
    await removeWhitelistedEmailUseCase(db, data.id);
    return { success: true };
  });
