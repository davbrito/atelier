import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { organizationMiddleware } from "../auth/functions";
import { getEnv } from "../context.server";

const MAX_CACHED_NAMES = 200;

function kvKey(organizationId: string) {
  return `measurement-names:${organizationId}`;
}

async function readNames(organizationId: string): Promise<string[]> {
  const raw = await getEnv().KV.get(kvKey(organizationId), "json");
  return Array.isArray(raw) ? (raw as string[]) : [];
}

export const listMeasurementNames = createServerFn({ method: "GET" })
  .middleware([organizationMiddleware])
  .handler(async ({ context: { activeOrganizationId } }) => {
    return readNames(activeOrganizationId);
  });

export const addMeasurementName = createServerFn({ method: "POST" })
  .validator(z.object({ name: z.string().trim().min(1) }))
  .middleware([organizationMiddleware])
  .handler(async ({ data: { name }, context: { activeOrganizationId } }) => {
    const names = await readNames(activeOrganizationId);

    const alreadyCached = names.some((n) => n.toLowerCase() === name.toLowerCase());
    if (!alreadyCached) {
      // Newest first, capped so the cache doesn't grow unbounded across a long-lived org.
      names.unshift(name);
      names.splice(MAX_CACHED_NAMES);
      await getEnv().KV.put(kvKey(activeOrganizationId), JSON.stringify(names));
    }

    return names;
  });
