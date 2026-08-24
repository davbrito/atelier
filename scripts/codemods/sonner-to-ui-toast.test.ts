import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import jscodeshift from "jscodeshift";
import { describe, expect, it } from "vitest";
import transformer from "./sonner-to-ui-toast.cjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, "__fixtures__/sonner-to-ui-toast");

const j = jscodeshift.withParser("tsx");

function runTransform(source: string) {
  const result = transformer(
    { source, path: "fixture.tsx" },
    { j, jscodeshift: j, stats: () => {}, report: () => {} },
    {},
  );
  return typeof result === "string" ? result : source;
}

const cases = readdirSync(fixturesDir)
  .filter((name) => name.endsWith(".input.tsx"))
  .map((name) => name.replace(/\.input\.tsx$/, ""));

describe("sonner-to-ui-toast codemod", () => {
  it.each(cases)("transforms %s as expected", (name) => {
    const input = readFileSync(join(fixturesDir, `${name}.input.tsx`), "utf8");
    const expected = readFileSync(join(fixturesDir, `${name}.output.tsx`), "utf8");

    expect(runTransform(input).trim()).toBe(expected.trim());
  });

  it("is idempotent: re-running on already-migrated output is a no-op", () => {
    for (const name of cases) {
      const expected = readFileSync(join(fixturesDir, `${name}.output.tsx`), "utf8");
      expect(runTransform(expected).trim()).toBe(expected.trim());
    }
  });
});
