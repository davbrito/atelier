import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { cacheMeasurementNames } from "../../../src/lib/server/measurement-names-cache.ts";

const orgId = "org-measurement-names-test";

function kvKey(organizationId: string) {
  return `measurement-names:${organizationId}`;
}

async function readCached(organizationId: string): Promise<string[]> {
  const raw = await env.KV.get(kvKey(organizationId), "json");
  return Array.isArray(raw) ? (raw as string[]) : [];
}

describe("cacheMeasurementNames", () => {
  beforeEach(async () => {
    await env.KV.delete(kvKey(orgId));
  });

  it("does nothing when given no names", async () => {
    await cacheMeasurementNames(env.KV, orgId, []);
    expect(await readCached(orgId)).toEqual([]);
  });

  it("caches new names, newest first", async () => {
    await cacheMeasurementNames(env.KV, orgId, ["Cintura", "Busto"]);
    expect(await readCached(orgId)).toEqual(["Busto", "Cintura"]);
  });

  it("dedupes case-insensitively against already-cached names", async () => {
    await cacheMeasurementNames(env.KV, orgId, ["Cintura"]);
    await cacheMeasurementNames(env.KV, orgId, ["cintura", "Cadera"]);
    expect(await readCached(orgId)).toEqual(["Cadera", "Cintura"]);
  });

  it("dedupes exact duplicates within the same call", async () => {
    await cacheMeasurementNames(env.KV, orgId, ["Cintura", "cintura", "Cintura"]);
    expect(await readCached(orgId)).toEqual(["cintura", "Cintura"]);
  });

  it("caps the cached list at 200 names", async () => {
    const initial = Array.from({ length: 200 }, (_, i) => `name-${i}`);
    await cacheMeasurementNames(env.KV, orgId, initial);
    expect(await readCached(orgId)).toHaveLength(200);

    await cacheMeasurementNames(env.KV, orgId, ["extra-name"]);
    const cached = await readCached(orgId);
    expect(cached).toHaveLength(200);
    expect(cached[0]).toBe("extra-name");
  });
});
