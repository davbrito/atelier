import { describe, expect, it } from "vitest";
import { UNIT_OPTIONS, unitSchema } from "#/lib/units";

describe("unitSchema", () => {
  it("accepts every UNIT_OPTIONS value", () => {
    for (const { value } of UNIT_OPTIONS) {
      expect(unitSchema.parse(value)).toBe(value);
    }
  });

  it("rejects values outside UNIT_OPTIONS", () => {
    expect(() => unitSchema.parse("kg")).toThrow();
    expect(() => unitSchema.parse("")).toThrow();
  });
});
