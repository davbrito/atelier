import { describe, expect } from "vitest";
import { generateSequentialCode } from "#/server/application/codes.ts";
import { it } from "#test/helpers/fixtures.ts";
import { seedOrganization } from "#test/helpers/seed.ts";

describe("generateSequentialCode", () => {
  it("increments sequentially for the same organization and prefix", async ({ db }) => {
    const org = await seedOrganization(db);

    const first = await generateSequentialCode(db, org.id, "PED2026-05-");
    const second = await generateSequentialCode(db, org.id, "PED2026-05-");
    const third = await generateSequentialCode(db, org.id, "PED2026-05-");

    expect(first).toBe("PED2026-05-0001");
    expect(second).toBe("PED2026-05-0002");
    expect(third).toBe("PED2026-05-0003");
  });

  it("keeps independent counters per prefix", async ({ db }) => {
    const org = await seedOrganization(db);

    const order = await generateSequentialCode(db, org.id, "PED2026-05-");
    const quotation = await generateSequentialCode(db, org.id, "COT2026-05-");

    expect(order).toBe("PED2026-05-0001");
    expect(quotation).toBe("COT2026-05-0001");
  });

  it("keeps independent counters per organization", async ({ db }) => {
    const orgA = await seedOrganization(db);
    const orgB = await seedOrganization(db);

    const codeA1 = await generateSequentialCode(db, orgA.id, "PED2026-05-");
    const codeB1 = await generateSequentialCode(db, orgB.id, "PED2026-05-");
    const codeA2 = await generateSequentialCode(db, orgA.id, "PED2026-05-");

    expect(codeA1).toBe("PED2026-05-0001");
    expect(codeB1).toBe("PED2026-05-0001");
    expect(codeA2).toBe("PED2026-05-0002");
  });

  it("zero-pads according to padLength and overflows naturally past it", async ({ db }) => {
    const org = await seedOrganization(db);

    for (let i = 0; i < 9; i++) {
      await generateSequentialCode(db, org.id, "PED-", 2);
    }
    const tenth = await generateSequentialCode(db, org.id, "PED-", 2);
    expect(tenth).toBe("PED-10");
  });
});
