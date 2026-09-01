import { globSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// @ts-expect-error -- no type declarations for this internal entry point
import { applyTransform } from "jscodeshift/dist/testUtils.js";
import { describe, expect, it } from "vitest";
import transformer from "./remove-use-client.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "__fixtures__/remove-use-client");

function runTransform(source: string): string {
  // applyTransform trims the output; restore the trailing newline so fixture
  // files can be compared byte-for-byte without trimming either side.
  return applyTransform(transformer, {}, { source, path: "fixture.tsx" }, { parser: "tsx" });
}

function runTestTransform(name: string): void {
  const input = readFileSync(join(fixturesDir, `${name}.input.tsx`), "utf8");
  const expected = readFileSync(join(fixturesDir, `${name}.output.tsx`), "utf8").trim();

  expect(runTransform(input)).toBe(expected);
}

const cases = globSync("*.input.tsx", { cwd: fixturesDir }).map((name) =>
  name.replace(/\.input\.tsx$/, ""),
);

describe("remove-use-client codemod", () => {
  it.each(cases)("transforms %s as expected", (name) => {
    runTestTransform(name);
  });

  it("is idempotent: re-running on already-migrated output is a no-op", () => {
    for (const name of cases) {
      const expected = readFileSync(join(fixturesDir, `${name}.output.tsx`), "utf8").trim();
      expect(runTransform(expected)).toBe(expected);
    }
  });
});
