import { afterEach, beforeAll, describe, expect, inject, it } from "vitest";
import type { Db } from "../../../src/db/client.ts";
import { generateSequentialCode } from "../../../src/server/application/codes.ts";
import { createTestDb } from "../../helpers/create-test-db.ts";
import { resetDb } from "../../helpers/reset-db.ts";
import { seedOrganization } from "../../helpers/seed.ts";

let db: Db;

beforeAll(async () => {
  db = await createTestDb(inject("postgresConnectionString"));
});

afterEach(async () => {
  await resetDb(db);
});

describe("generateSequentialCode", () => {
  it("increments sequentially for the same organization and prefix", async () => {
    const org = await seedOrganization(db);

    const first = await generateSequentialCode(db, org.id, "PED2026-05-");
    const second = await generateSequentialCode(db, org.id, "PED2026-05-");
    const third = await generateSequentialCode(db, org.id, "PED2026-05-");

    expect(first).toBe("PED2026-05-0001");
    expect(second).toBe("PED2026-05-0002");
    expect(third).toBe("PED2026-05-0003");
  });

  it("keeps independent counters per prefix", async () => {
    const org = await seedOrganization(db);

    const order = await generateSequentialCode(db, org.id, "PED2026-05-");
    const quotation = await generateSequentialCode(db, org.id, "COT2026-05-");

    expect(order).toBe("PED2026-05-0001");
    expect(quotation).toBe("COT2026-05-0001");
  });

  it("keeps independent counters per organization", async () => {
    const orgA = await seedOrganization(db);
    const orgB = await seedOrganization(db);

    const codeA1 = await generateSequentialCode(db, orgA.id, "PED2026-05-");
    const codeB1 = await generateSequentialCode(db, orgB.id, "PED2026-05-");
    const codeA2 = await generateSequentialCode(db, orgA.id, "PED2026-05-");

    expect(codeA1).toBe("PED2026-05-0001");
    expect(codeB1).toBe("PED2026-05-0001");
    expect(codeA2).toBe("PED2026-05-0002");
  });

  it("zero-pads according to padLength and overflows naturally past it", async () => {
    const org = await seedOrganization(db);

    for (let i = 0; i < 9; i++) {
      await generateSequentialCode(db, org.id, "PED-", 2);
    }
    const tenth = await generateSequentialCode(db, org.id, "PED-", 2);
    expect(tenth).toBe("PED-10");
  });
});
