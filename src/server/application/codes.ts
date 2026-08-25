import { sql } from "drizzle-orm";
import type { Db } from "#/db/client";
import { codeCounter } from "#/db/schema";

async function nextSequence(tx: Db, organizationId: string, prefix: string): Promise<number> {
  const [row] = await tx
    .insert(codeCounter)
    .values({ organizationId, prefix, lastValue: 1 })
    .onConflictDoUpdate({
      target: [codeCounter.organizationId, codeCounter.prefix],
      set: { lastValue: sql`${codeCounter.lastValue} + 1` },
    })
    .returning({ value: codeCounter.lastValue });

  return row.value;
}

/**
 * Generates a sequential code like `${prefix}0101` for the given organization,
 * atomically incrementing a shared counter keyed by (organizationId, prefix).
 * Callers own the prefix format (e.g. "PED2026-05-", "COT2026-05-"), so the
 * same counter mechanism works for any entity that needs correlativos.
 */
export async function generateSequentialCode(
  tx: Db,
  organizationId: string,
  prefix: string,
  padLength = 4,
): Promise<string> {
  const seq = await nextSequence(tx, organizationId, prefix);
  return `${prefix}${String(seq).padStart(padLength, "0")}`;
}
