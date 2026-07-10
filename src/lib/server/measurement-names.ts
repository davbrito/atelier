import { createServerFn } from "@tanstack/react-start";
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

/**
 * Merges the given names into the organization's cached measurement-name
 * list (case-insensitive dedupe, newest first, capped). Meant to be called
 * from within the client create/update mutations, not as its own endpoint.
 */
export async function cacheMeasurementNames(organizationId: string, names: string[]) {
  if (names.length === 0) return;

  const cached = await readNames(organizationId);
  const cachedLower = new Set(cached.map((n) => n.toLowerCase()));

  const newNames = [...new Set(names)].filter((n) => !cachedLower.has(n.toLowerCase()));
  if (newNames.length === 0) return;

  const merged = [...newNames.reverse(), ...cached].slice(0, MAX_CACHED_NAMES);
  await getEnv().KV.put(kvKey(organizationId), JSON.stringify(merged));
}
