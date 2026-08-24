const MAX_CACHED_NAMES = 200;

function kvKey(organizationId: string) {
  return `measurement-names:${organizationId}`;
}

export async function readNames(
  kv: Cloudflare.Env["KV"],
  organizationId: string,
): Promise<string[]> {
  const raw = await kv.get(kvKey(organizationId), "json");
  return Array.isArray(raw) ? (raw as string[]) : [];
}

/**
 * Merges the given names into the organization's cached measurement-name
 * list (case-insensitive dedupe, newest first, capped). Meant to be called
 * from within the client create/update mutations, not as its own endpoint.
 */
export async function cacheMeasurementNames(
  kv: Cloudflare.Env["KV"],
  organizationId: string,
  names: string[],
) {
  if (names.length === 0) return;

  const cached = await readNames(kv, organizationId);
  const cachedLower = new Set(cached.map((n) => n.toLowerCase()));

  const newNames = [...new Set(names)].filter((n) => !cachedLower.has(n.toLowerCase()));
  if (newNames.length === 0) return;

  const merged = [...newNames.reverse(), ...cached].slice(0, MAX_CACHED_NAMES);
  await kv.put(kvKey(organizationId), JSON.stringify(merged));
}
